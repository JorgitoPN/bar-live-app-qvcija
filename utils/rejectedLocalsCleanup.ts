
import { supabase } from './supabase';

/**
 * 🗑️ SISTEMA DE LIMPIEZA DE LOCALES RECHAZADOS
 * 
 * Este módulo proporciona funciones para limpiar locales rechazados
 * durante el proceso de enriquecimiento con Google Places.
 */

export interface CleanupResult {
  localesEliminados: number;
  detalles: Array<{
    id: string;
    nombre: string;
    motivo: string;
  }>;
}

/**
 * Limpia todos los locales rechazados de la tabla locales
 * Los locales ya están en locales_excluidos gracias al trigger automático
 */
export async function limpiarLocalesRechazados(): Promise<CleanupResult> {
  console.log('[RejectedCleanup] 🗑️ Iniciando limpieza de locales rechazados...');
  
  try {
    // Llamar a la función de base de datos
    const { data, error } = await supabase.rpc('limpiar_locales_rechazados');

    if (error) {
      console.error('[RejectedCleanup] Error:', error);
      throw error;
    }

    const result = data?.[0] || { locales_eliminados: 0, detalles: [] };
    
    console.log('[RejectedCleanup] ✅ Limpieza completada');
    console.log('[RejectedCleanup] Locales eliminados:', result.locales_eliminados);
    
    return {
      localesEliminados: result.locales_eliminados,
      detalles: result.detalles || [],
    };
  } catch (error) {
    console.error('[RejectedCleanup] Error en limpieza:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de locales rechazados
 */
export async function obtenerEstadisticasRechazados(): Promise<{
  totalRechazados: number;
  porMotivo: Record<string, number>;
  porProvincia: Record<string, number>;
}> {
  try {
    // Contar locales rechazados en la tabla locales
    const { data: rechazados, error } = await supabase
      .from('locales')
      .select('notas_rechazo, provincia')
      .eq('activo', false)
      .not('notas_rechazo', 'is', null);

    if (error) {
      console.error('[RejectedCleanup] Error obteniendo estadísticas:', error);
      throw error;
    }

    const totalRechazados = rechazados?.length || 0;
    
    // Agrupar por motivo
    const porMotivo: Record<string, number> = {};
    const porProvincia: Record<string, number> = {};
    
    rechazados?.forEach(local => {
      const motivo = local.notas_rechazo || 'Desconocido';
      porMotivo[motivo] = (porMotivo[motivo] || 0) + 1;
      
      const provincia = local.provincia || 'Desconocida';
      porProvincia[provincia] = (porProvincia[provincia] || 0) + 1;
    });

    return {
      totalRechazados,
      porMotivo,
      porProvincia,
    };
  } catch (error) {
    console.error('[RejectedCleanup] Error:', error);
    throw error;
  }
}

/**
 * Verifica si hay locales rechazados pendientes de limpiar
 */
export async function hayLocalesRechazadosPendientes(): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('locales')
      .select('*', { count: 'exact', head: true })
      .eq('activo', false)
      .not('notas_rechazo', 'is', null);

    if (error) {
      console.error('[RejectedCleanup] Error verificando pendientes:', error);
      return false;
    }

    return (count || 0) > 0;
  } catch (error) {
    console.error('[RejectedCleanup] Error:', error);
    return false;
  }
}

/**
 * Elimina un local rechazado específico
 */
export async function eliminarLocalRechazado(localId: string): Promise<boolean> {
  try {
    console.log(`[RejectedCleanup] Eliminando local rechazado: ${localId}`);
    
    // Verificar que el local esté rechazado
    const { data: local, error: fetchError } = await supabase
      .from('locales')
      .select('id, nombre, activo, notas_rechazo')
      .eq('id', localId)
      .single();

    if (fetchError || !local) {
      console.error('[RejectedCleanup] Local no encontrado:', fetchError);
      return false;
    }

    if (local.activo || !local.notas_rechazo) {
      console.error('[RejectedCleanup] El local no está rechazado');
      return false;
    }

    // Eliminar el local
    const { error: deleteError } = await supabase
      .from('locales')
      .delete()
      .eq('id', localId);

    if (deleteError) {
      console.error('[RejectedCleanup] Error eliminando local:', deleteError);
      return false;
    }

    console.log('[RejectedCleanup] ✅ Local eliminado correctamente');
    return true;
  } catch (error) {
    console.error('[RejectedCleanup] Error:', error);
    return false;
  }
}
