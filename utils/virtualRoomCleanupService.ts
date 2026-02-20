
import { supabase } from './supabase';

/**
 * 🧹 SERVICIO DE LIMPIEZA DE SALAS VIRTUALES
 * 
 * Gestiona la limpieza automática de contenido temporal en salas virtuales
 * según los requisitos:
 * 
 * 1. Apertura del local = Sala limpia (sin contenido residual)
 * 2. Mensajes públicos = Solo visibles durante la sesión activa
 * 3. Mensajes privados = Eliminados cuando el local cierra
 * 4. Locales 24/7 = Reset cada 24 horas
 */

export interface CleanupStats {
  success: boolean;
  timestamp: string;
  stats: {
    localesCerrados: number;
    locales24h: number;
    mensajesEliminados: number;
    checkoutsRealizados: number;
    salasLimpiadas: string[];
  };
  error?: string;
}

export interface VirtualRoomStats {
  total_locales: number;
  locales_con_usuarios: number;
  total_mensajes: number;
  total_usuarios_activos: number;
  locales_24h_activos: number;
  timestamp: string;
}

/**
 * Limpia la sala virtual de un local específico
 * Elimina todos los mensajes y hace checkout de usuarios
 */
export async function limpiarSalaVirtual(localId: string): Promise<{
  success: boolean;
  mensajes_eliminados: number;
  checkouts_realizados: number;
  error?: string;
}> {
  try {
    console.log('[VirtualRoomCleanup] 🧹 Cleaning room for local:', localId);
    
    const { data, error } = await supabase.rpc('limpiar_sala_virtual', {
      p_local_id: localId,
    });

    if (error) {
      console.error('[VirtualRoomCleanup] ❌ Error cleaning room:', error);
      throw error;
    }

    console.log('[VirtualRoomCleanup] ✅ Room cleaned successfully');
    console.log('[VirtualRoomCleanup] 📊 Messages deleted:', data.mensajes_eliminados);
    console.log('[VirtualRoomCleanup] 📊 Checkouts:', data.checkouts_realizados);

    return {
      success: true,
      mensajes_eliminados: data.mensajes_eliminados,
      checkouts_realizados: data.checkouts_realizados,
    };
  } catch (error) {
    console.error('[VirtualRoomCleanup] ❌ Error:', error);
    return {
      success: false,
      mensajes_eliminados: 0,
      checkouts_realizados: 0,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Resetea una sala 24/7 (limpia y actualiza timestamp)
 */
export async function resetearSala24h(localId: string): Promise<{
  success: boolean;
  mensajes_eliminados: number;
  checkouts_realizados: number;
  error?: string;
}> {
  try {
    console.log('[VirtualRoomCleanup] 🔄 Resetting 24/7 room for local:', localId);
    
    const { data, error } = await supabase.rpc('resetear_sala_24h', {
      p_local_id: localId,
    });

    if (error) {
      console.error('[VirtualRoomCleanup] ❌ Error resetting room:', error);
      throw error;
    }

    console.log('[VirtualRoomCleanup] ✅ 24/7 room reset successfully');
    console.log('[VirtualRoomCleanup] 📊 Messages deleted:', data.mensajes_eliminados);
    console.log('[VirtualRoomCleanup] 📊 Checkouts:', data.checkouts_realizados);

    return {
      success: true,
      mensajes_eliminados: data.mensajes_eliminados,
      checkouts_realizados: data.checkouts_realizados,
    };
  } catch (error) {
    console.error('[VirtualRoomCleanup] ❌ Error:', error);
    return {
      success: false,
      mensajes_eliminados: 0,
      checkouts_realizados: 0,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene estadísticas globales de las salas virtuales
 */
export async function obtenerEstadisticasSalasVirtuales(): Promise<VirtualRoomStats | null> {
  try {
    const { data, error } = await supabase.rpc('obtener_estadisticas_salas_virtuales');

    if (error) {
      console.error('[VirtualRoomCleanup] ❌ Error getting stats:', error);
      throw error;
    }

    return data as VirtualRoomStats;
  } catch (error) {
    console.error('[VirtualRoomCleanup] ❌ Error:', error);
    return null;
  }
}

/**
 * Ejecuta limpieza manual desde el panel de admin
 */
export async function ejecutarLimpiezaManual(): Promise<CleanupStats> {
  try {
    console.log('[VirtualRoomCleanup] 🚀 Triggering manual cleanup...');
    
    // Llamar al Edge Function
    const { data, error } = await supabase.functions.invoke('cleanup-virtual-rooms', {
      body: {
        dryRun: false,
      },
    });

    if (error) {
      console.error('[VirtualRoomCleanup] ❌ Error invoking cleanup function:', error);
      throw error;
    }

    console.log('[VirtualRoomCleanup] ✅ Manual cleanup completed');
    return data as CleanupStats;
  } catch (error) {
    console.error('[VirtualRoomCleanup] ❌ Error:', error);
    return {
      success: false,
      timestamp: new Date().toISOString(),
      stats: {
        localesCerrados: 0,
        locales24h: 0,
        mensajesEliminados: 0,
        checkoutsRealizados: 0,
        salasLimpiadas: [],
      },
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Verifica si un local necesita limpieza
 */
export async function necesitaLimpieza(localId: string): Promise<boolean> {
  try {
    // Verificar si hay mensajes en la sala
    const { count, error } = await supabase
      .from('sala_virtual_interacciones')
      .select('*', { count: 'exact', head: true })
      .eq('local_id', localId);

    if (error) {
      console.error('[VirtualRoomCleanup] ❌ Error checking messages:', error);
      return false;
    }

    return (count || 0) > 0;
  } catch (error) {
    console.error('[VirtualRoomCleanup] ❌ Error:', error);
    return false;
  }
}
