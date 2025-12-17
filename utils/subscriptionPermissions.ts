
/**
 * ✅ SUBSCRIPTION PERMISSIONS UTILITY
 * 
 * Checks if a local has permission to perform certain actions based on their subscription plan
 */

import { supabase } from './supabase';

export interface SubscriptionPermissions {
  canCreateEvents: boolean;
  canHighlightLocal: boolean;
  canPublishPosts: boolean;
  hasActiveProfile: boolean;
  planName: string;
  creditsRemaining: {
    eventos: number;
    destacados: number;
  };
}

/**
 * Get subscription permissions for a local
 */
export async function getLocalSubscriptionPermissions(localId: string): Promise<SubscriptionPermissions> {
  try {
    console.log('[subscriptionPermissions] Checking permissions for local:', localId);

    // Get local data
    const { data: localData, error: localError } = await supabase
      .from('locales')
      .select('perfil_visible')
      .eq('id', localId)
      .single();

    if (localError || !localData) {
      console.error('[subscriptionPermissions] Error fetching local:', localError);
      return {
        canCreateEvents: false,
        canHighlightLocal: false,
        canPublishPosts: false,
        hasActiveProfile: false,
        planName: 'none',
        creditsRemaining: { eventos: 0, destacados: 0 },
      };
    }

    // Get active subscription
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('suscripciones_locales')
      .select(`
        *,
        planes_suscripcion (
          nombre,
          eventos_mes,
          promos_destacadas,
          perfil_social
        )
      `)
      .eq('local_id', localId)
      .eq('estado', 'activa')
      .maybeSingle();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      console.error('[subscriptionPermissions] Error fetching subscription:', subscriptionError);
    }

    if (!subscriptionData || !subscriptionData.planes_suscripcion) {
      console.log('[subscriptionPermissions] No active subscription found');
      return {
        canCreateEvents: false,
        canHighlightLocal: false,
        canPublishPosts: false,
        hasActiveProfile: localData.perfil_visible || false,
        planName: 'basico',
        creditsRemaining: { eventos: 0, destacados: 0 },
      };
    }

    const plan = subscriptionData.planes_suscripcion;
    const planName = plan.nombre.toLowerCase();

    // Check permissions based on plan
    const hasActiveProfile = localData.perfil_visible && (planName === 'estandar' || planName === 'premium');
    const canCreateEvents = subscriptionData.creditos_eventos_restantes > 0;
    const canHighlightLocal = subscriptionData.creditos_destacados_restantes > 0;
    const canPublishPosts = hasActiveProfile;

    console.log('[subscriptionPermissions] ✅ Permissions:', {
      planName,
      hasActiveProfile,
      canCreateEvents,
      canHighlightLocal,
      canPublishPosts,
      eventCredits: subscriptionData.creditos_eventos_restantes,
      highlightCredits: subscriptionData.creditos_destacados_restantes,
    });

    return {
      canCreateEvents,
      canHighlightLocal,
      canPublishPosts,
      hasActiveProfile,
      planName,
      creditsRemaining: {
        eventos: subscriptionData.creditos_eventos_restantes || 0,
        destacados: subscriptionData.creditos_destacados_restantes || 0,
      },
    };
  } catch (error) {
    console.error('[subscriptionPermissions] Error:', error);
    return {
      canCreateEvents: false,
      canHighlightLocal: false,
      canPublishPosts: false,
      hasActiveProfile: false,
      planName: 'none',
      creditsRemaining: { eventos: 0, destacados: 0 },
    };
  }
}

/**
 * Check if a local can perform a specific action
 */
export async function canLocalPerformAction(
  localId: string,
  action: 'create_event' | 'highlight_local' | 'publish_post'
): Promise<{ allowed: boolean; reason?: string }> {
  const permissions = await getLocalSubscriptionPermissions(localId);

  switch (action) {
    case 'create_event':
      if (!permissions.hasActiveProfile) {
        return {
          allowed: false,
          reason: 'Necesitas un plan activo (Estándar o Premium) para crear eventos',
        };
      }
      if (!permissions.canCreateEvents) {
        return {
          allowed: false,
          reason: `No tienes créditos de eventos disponibles. Créditos restantes: ${permissions.creditsRemaining.eventos}`,
        };
      }
      return { allowed: true };

    case 'highlight_local':
      if (!permissions.hasActiveProfile) {
        return {
          allowed: false,
          reason: 'Necesitas un plan activo (Estándar o Premium) para destacar tu local',
        };
      }
      if (!permissions.canHighlightLocal) {
        return {
          allowed: false,
          reason: `No tienes créditos de destacados disponibles. Créditos restantes: ${permissions.creditsRemaining.destacados}`,
        };
      }
      return { allowed: true };

    case 'publish_post':
      if (!permissions.hasActiveProfile) {
        return {
          allowed: false,
          reason: 'Necesitas un plan activo (Estándar o Premium) para publicar en la red social',
        };
      }
      if (!permissions.canPublishPosts) {
        return {
          allowed: false,
          reason: 'Tu perfil no está visible. Activa un plan de suscripción.',
        };
      }
      return { allowed: true };

    default:
      return { allowed: false, reason: 'Acción no reconocida' };
  }
}
