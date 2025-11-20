
import { supabase } from './supabase';

/**
 * Activate highlighting for a local (24-hour duration)
 * @param localId - The ID of the local to highlight
 * @returns Success status and message
 */
export async function activateLocalHighlight(localId: string): Promise<{
  success: boolean;
  message: string;
  creditsRemaining?: number;
}> {
  try {
    console.log('[HighlightManager] 🌟 Activating highlight for local:', localId);

    // Call the database function to activate highlighting
    const { data, error } = await supabase.rpc('activar_destacado_local', {
      p_local_id: localId,
    });

    if (error) {
      console.error('[HighlightManager] ❌ Error activating highlight:', error);
      
      // Check for specific error messages
      if (error.message.includes('No se encontró una suscripción activa')) {
        return {
          success: false,
          message: 'No tienes una suscripción activa. Necesitas un plan Estándar o Premium para destacar tu local.',
        };
      }
      
      if (error.message.includes('No tienes créditos disponibles')) {
        return {
          success: false,
          message: 'No tienes créditos disponibles para destacar el local. Los créditos se renuevan mensualmente.',
        };
      }

      return {
        success: false,
        message: 'No se pudo activar el destacado. Por favor, inténtalo de nuevo.',
      };
    }

    // Get updated subscription info
    const { data: subscriptionData, error: subError } = await supabase
      .from('suscripciones_locales')
      .select('creditos_destacados_restantes, destacado_fecha_fin')
      .eq('local_id', localId)
      .eq('estado', 'activa')
      .single();

    if (subError) {
      console.error('[HighlightManager] ⚠️ Error fetching subscription data:', subError);
    }

    const creditsRemaining = subscriptionData?.creditos_destacados_restantes || 0;
    const endDate = subscriptionData?.destacado_fecha_fin;

    console.log('[HighlightManager] ✅ Highlight activated successfully');
    console.log('[HighlightManager] 📊 Credits remaining:', creditsRemaining);
    console.log('[HighlightManager] ⏰ Expires at:', endDate);

    return {
      success: true,
      message: '¡Local destacado activado por 24 horas! Tu local aparecerá en la parte superior de los resultados.',
      creditsRemaining,
    };
  } catch (error) {
    console.error('[HighlightManager] ❌ Unexpected error:', error);
    return {
      success: false,
      message: 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.',
    };
  }
}

/**
 * Check if a local is currently highlighted
 * @param localId - The ID of the local to check
 * @returns Highlight status and expiration date
 */
export async function checkLocalHighlightStatus(localId: string): Promise<{
  isHighlighted: boolean;
  expiresAt?: string;
  creditsRemaining?: number;
}> {
  try {
    const { data, error } = await supabase
      .from('suscripciones_locales')
      .select('destacado_activo, destacado_fecha_fin, creditos_destacados_restantes')
      .eq('local_id', localId)
      .eq('estado', 'activa')
      .single();

    if (error || !data) {
      console.error('[HighlightManager] Error checking highlight status:', error);
      return { isHighlighted: false };
    }

    // Check if highlight is active and not expired
    const isActive = data.destacado_activo && 
                     data.destacado_fecha_fin && 
                     new Date(data.destacado_fecha_fin) > new Date();

    return {
      isHighlighted: isActive,
      expiresAt: data.destacado_fecha_fin,
      creditsRemaining: data.creditos_destacados_restantes,
    };
  } catch (error) {
    console.error('[HighlightManager] Unexpected error checking status:', error);
    return { isHighlighted: false };
  }
}

/**
 * Deactivate highlighting for a local (manual deactivation)
 * @param localId - The ID of the local to deactivate
 * @returns Success status
 */
export async function deactivateLocalHighlight(localId: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log('[HighlightManager] 🔴 Deactivating highlight for local:', localId);

    // Update subscription
    const { error: subError } = await supabase
      .from('suscripciones_locales')
      .update({
        destacado_activo: false,
        updated_at: new Date().toISOString(),
      })
      .eq('local_id', localId)
      .eq('estado', 'activa');

    if (subError) {
      console.error('[HighlightManager] ❌ Error updating subscription:', subError);
      return {
        success: false,
        message: 'No se pudo desactivar el destacado.',
      };
    }

    // Update local
    const { error: localError } = await supabase
      .from('locales')
      .update({
        destacado: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', localId);

    if (localError) {
      console.error('[HighlightManager] ❌ Error updating local:', localError);
    }

    console.log('[HighlightManager] ✅ Highlight deactivated successfully');

    return {
      success: true,
      message: 'Destacado desactivado correctamente.',
    };
  } catch (error) {
    console.error('[HighlightManager] ❌ Unexpected error:', error);
    return {
      success: false,
      message: 'Ocurrió un error inesperado.',
    };
  }
}

/**
 * Get time remaining for current highlight
 * @param expiresAt - ISO date string of expiration
 * @returns Formatted time remaining string
 */
export function getTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Expirado';
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m restantes`;
  } else {
    return `${minutes}m restantes`;
  }
}

/**
 * Run the expiration function to expire all highlights that have passed their end date
 * This should be called periodically (e.g., on app startup or via a scheduled job)
 * @returns Number of highlights expired
 */
export async function expireOldHighlights(): Promise<number> {
  try {
    console.log('[HighlightManager] 🔄 Running highlight expiration check...');

    const { data, error } = await supabase.rpc('expirar_destacados_vencidos');

    if (error) {
      console.error('[HighlightManager] ❌ Error expiring highlights:', error);
      return 0;
    }

    const count = data || 0;
    console.log('[HighlightManager] ✅ Expired', count, 'highlights');

    return count;
  } catch (error) {
    console.error('[HighlightManager] ❌ Unexpected error:', error);
    return 0;
  }
}
