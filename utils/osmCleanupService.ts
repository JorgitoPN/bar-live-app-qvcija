
import { supabase } from './supabase';

/**
 * 🗑️ SERVICIO DE LIMPIEZA DE LOCALES OSM ENRIQUECIDOS
 * 
 * Este módulo proporciona funciones para limpiar locales OSM que ya han sido
 * enriquecidos con Google Places y están activos en la aplicación.
 * 
 * OBJETIVO: Liberar espacio y mejorar rendimiento eliminando datos redundantes.
 * 
 * LÓGICA:
 * - Los locales OSM solo son útiles DURANTE el proceso de enriquecimiento
 * - Una vez enriquecidos con Google Places y activados, ya no se necesitan
 * - Los locales enriquecidos están publicados en "Explorar" y "Mapa"
 * - Eliminar OSM enriquecidos NO afecta la visibilidad en la app
 */

export interface OSMCleanupResult {
  success: boolean;
  localesEliminados: number;
  espacioLiberadoMB: number;
  detalles: Array<{
    id: string;
    nombre: string;
    provincia: string;
  }>;
  error?: string;
}

/**
 * Limpia locales OSM que han sido enriquecidos y están activos
 */
export async function limpiarOSMEnriquecidos(dryRun: boolean = false): Promise<OSMCleanupResult> {
  console.log('[OSM Cleanup Service] 🗑️ Starting cleanup...');
  console.log('[OSM Cleanup Service] Dry run:', dryRun);
  
  try {
    // Find OSM locales that are enriched and active
    const { data: localesAEliminar, error: fetchError } = await supabase
      .from('locales')
      .select('id, nombre, provincia')
      .eq('source_type', 'osm')
      .eq('enriquecido', true)
      .eq('activo', true);

    if (fetchError) {
      console.error('[OSM Cleanup Service] ❌ Error fetching locales:', fetchError);
      throw fetchError;
    }

    console.log('[OSM Cleanup Service] Found locales to delete:', localesAEliminar?.length || 0);

    if (!localesAEliminar || localesAEliminar.length === 0) {
      console.log('[OSM Cleanup Service] ✅ No locales to delete');
      return {
        success: true,
        localesEliminados: 0,
        espacioLiberadoMB: 0,
        detalles: [],
      };
    }

    if (dryRun) {
      // Simulation: Just return what would be deleted
      console.log('[OSM Cleanup Service] 📊 Simulation mode - no changes made');
      return {
        success: true,
        localesEliminados: localesAEliminar.length,
        espacioLiberadoMB: Math.round((localesAEliminar.length * 5) / 1024),
        detalles: localesAEliminar.slice(0, 10).map(l => ({
          id: l.id,
          nombre: l.nombre,
          provincia: l.provincia,
        })),
      };
    }

    // Real cleanup: Delete in batches
    const batchSize = 100;
    let totalDeleted = 0;
    const detalles: Array<{ id: string; nombre: string; provincia: string }> = [];
    
    for (let i = 0; i < localesAEliminar.length; i += batchSize) {
      const batch = localesAEliminar.slice(i, i + batchSize);
      const ids = batch.map(l => l.id);
      
      console.log(`[OSM Cleanup Service] Deleting batch ${i / batchSize + 1}:`, ids.length, 'locales');
      
      const { error: deleteError } = await supabase
        .from('locales')
        .delete()
        .in('id', ids);

      if (deleteError) {
        console.error('[OSM Cleanup Service] ❌ Error deleting batch:', deleteError);
        throw deleteError;
      }

      totalDeleted += ids.length;
      
      // Store first 10 for details
      if (detalles.length < 10) {
        detalles.push(...batch.slice(0, 10 - detalles.length).map(l => ({
          id: l.id,
          nombre: l.nombre,
          provincia: l.provincia,
        })));
      }
      
      console.log(`[OSM Cleanup Service] ✅ Deleted ${totalDeleted}/${localesAEliminar.length} locales`);
    }

    // Calculate space freed (rough estimate: 5KB per local)
    const espacioLiberadoMB = Math.round((totalDeleted * 5) / 1024);

    console.log('[OSM Cleanup Service] ✅ Cleanup completed');
    console.log('[OSM Cleanup Service] Total deleted:', totalDeleted);
    console.log('[OSM Cleanup Service] Space freed:', espacioLiberadoMB, 'MB');

    return {
      success: true,
      localesEliminados: totalDeleted,
      espacioLiberadoMB,
      detalles,
    };
  } catch (error) {
    console.error('[OSM Cleanup Service] ❌ Error:', error);
    return {
      success: false,
      localesEliminados: 0,
      espacioLiberadoMB: 0,
      detalles: [],
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Limpia un local OSM específico si está enriquecido y activo
 */
export async function limpiarLocalOSMSiEnriquecido(localId: string): Promise<boolean> {
  try {
    console.log(`[OSM Cleanup Service] Checking local ${localId}...`);
    
    // Check if local is OSM, enriched, and active
    const { data: local, error: fetchError } = await supabase
      .from('locales')
      .select('id, nombre, source_type, enriquecido, activo')
      .eq('id', localId)
      .single();

    if (fetchError || !local) {
      console.error('[OSM Cleanup Service] Local not found:', fetchError);
      return false;
    }

    // Only delete if it's OSM, enriched, and active
    if (local.source_type !== 'osm' || !local.enriquecido || !local.activo) {
      console.log('[OSM Cleanup Service] Local does not meet cleanup criteria:', {
        source_type: local.source_type,
        enriquecido: local.enriquecido,
        activo: local.activo,
      });
      return false;
    }

    console.log(`[OSM Cleanup Service] Deleting enriched OSM local: ${local.nombre}`);

    // Delete the local
    const { error: deleteError } = await supabase
      .from('locales')
      .delete()
      .eq('id', localId);

    if (deleteError) {
      console.error('[OSM Cleanup Service] ❌ Error deleting local:', deleteError);
      return false;
    }

    console.log('[OSM Cleanup Service] ✅ Local deleted successfully');
    return true;
  } catch (error) {
    console.error('[OSM Cleanup Service] ❌ Error:', error);
    return false;
  }
}

/**
 * Obtiene estadísticas de locales OSM enriquecidos
 */
export async function obtenerEstadisticasOSMEnriquecidos(): Promise<{
  totalOSM: number;
  osmEnriquecidos: number;
  osmActivos: number;
  osmPendientes: number;
  espacioEstimadoMB: number;
}> {
  try {
    const { data: osmLocales, error } = await supabase
      .from('locales')
      .select('id, enriquecido, activo')
      .eq('source_type', 'osm');

    if (error) throw error;

    const totalOSM = osmLocales?.length || 0;
    const osmEnriquecidos = osmLocales?.filter(l => l.enriquecido && l.activo).length || 0;
    const osmActivos = osmLocales?.filter(l => l.activo).length || 0;
    const osmPendientes = osmLocales?.filter(l => !l.activo && !l.enriquecido).length || 0;
    const espacioEstimadoMB = Math.round((osmEnriquecidos * 5) / 1024);

    return {
      totalOSM,
      osmEnriquecidos,
      osmActivos,
      osmPendientes,
      espacioEstimadoMB,
    };
  } catch (error) {
    console.error('[OSM Cleanup Service] Error getting statistics:', error);
    return {
      totalOSM: 0,
      osmEnriquecidos: 0,
      osmActivos: 0,
      osmPendientes: 0,
      espacioEstimadoMB: 0,
    };
  }
}

/**
 * Verifica si la limpieza automática está habilitada
 */
export async function estaLimpiezaAutomaticaHabilitada(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'auto_cleanup_osm_enriched')
      .single();

    if (error || !data) {
      return false;
    }

    return data.value?.enabled === true;
  } catch (error) {
    console.error('[OSM Cleanup Service] Error checking auto-cleanup status:', error);
    return false;
  }
}

/**
 * Activa o desactiva la limpieza automática
 */
export async function configurarLimpiezaAutomatica(enabled: boolean): Promise<boolean> {
  try {
    console.log('[OSM Cleanup Service] Setting auto-cleanup:', enabled);

    const { error } = await supabase
      .from('app_config')
      .upsert({
        key: 'auto_cleanup_osm_enriched',
        value: { enabled },
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[OSM Cleanup Service] Error setting auto-cleanup:', error);
      return false;
    }

    console.log('[OSM Cleanup Service] ✅ Auto-cleanup configured successfully');
    return true;
  } catch (error) {
    console.error('[OSM Cleanup Service] Error:', error);
    return false;
  }
}
