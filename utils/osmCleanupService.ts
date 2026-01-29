
import { supabase } from './supabase';

export interface OSMCleanupResult {
  success: boolean;
  localesMovidos: number;
  espacioLiberadoMB: number;
  detalles: {
    id: string;
    nombre: string;
    provincia: string;
  }[];
  error?: string;
}

export async function limpiarOSMEnriquecidos(dryRun: boolean = false): Promise<OSMCleanupResult> {
  console.log('[OSM Cleanup Service v2.0] Starting catalog migration...');
  console.log('[OSM Cleanup Service v2.0] Dry run:', dryRun);
  
  try {
    const { data: localesAMover, error: fetchError } = await supabase
      .from('locales')
      .select('id, nombre, provincia')
      .eq('source_type', 'osm')
      .eq('enriquecido', true)
      .eq('activo', true);

    if (fetchError) {
      console.error('[OSM Cleanup Service v2.0] Error fetching locales:', fetchError);
      throw fetchError;
    }

    console.log('[OSM Cleanup Service v2.0] Found locales to migrate:', localesAMover?.length || 0);

    if (!localesAMover || localesAMover.length === 0) {
      console.log('[OSM Cleanup Service v2.0] No locales to migrate');
      return {
        success: true,
        localesMovidos: 0,
        espacioLiberadoMB: 0,
        detalles: [],
      };
    }

    if (dryRun) {
      console.log('[OSM Cleanup Service v2.0] Simulation mode - no changes made');
      return {
        success: true,
        localesMovidos: localesAMover.length,
        espacioLiberadoMB: Math.round((localesAMover.length * 5) / 1024),
        detalles: localesAMover.slice(0, 10).map(l => ({
          id: l.id,
          nombre: l.nombre,
          provincia: l.provincia,
        })),
      };
    }

    const batchSize = 100;
    let totalMigrated = 0;
    const detalles: { id: string; nombre: string; provincia: string }[] = [];
    
    for (let i = 0; i < localesAMover.length; i += batchSize) {
      const batch = localesAMover.slice(i, i + batchSize);
      const ids = batch.map(l => l.id);
      
      console.log(`[OSM Cleanup Service v2.0] Migrating batch ${i / batchSize + 1}:`, ids.length, 'locales');
      
      const { error: updateError } = await supabase
        .from('locales')
        .update({ 
          source_type: 'google',
          fecha_actualizacion: new Date().toISOString(),
        })
        .in('id', ids);

      if (updateError) {
        console.error('[OSM Cleanup Service v2.0] Error migrating batch:', updateError);
        throw updateError;
      }

      totalMigrated += ids.length;
      
      if (detalles.length < 10) {
        detalles.push(...batch.slice(0, 10 - detalles.length).map(l => ({
          id: l.id,
          nombre: l.nombre,
          provincia: l.provincia,
        })));
      }
      
      console.log(`[OSM Cleanup Service v2.0] Migrated ${totalMigrated}/${localesAMover.length} locales`);
    }

    const espacioLiberadoMB = Math.round((totalMigrated * 5) / 1024);

    console.log('[OSM Cleanup Service v2.0] Migration completed');
    console.log('[OSM Cleanup Service v2.0] Total migrated:', totalMigrated);

    return {
      success: true,
      localesMovidos: totalMigrated,
      espacioLiberadoMB,
      detalles,
    };
  } catch (error) {
    console.error('[OSM Cleanup Service v2.0] Error:', error);
    return {
      success: false,
      localesMovidos: 0,
      espacioLiberadoMB: 0,
      detalles: [],
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

export async function limpiarLocalOSMSiEnriquecido(localId: string): Promise<boolean> {
  try {
    console.log(`[OSM Cleanup Service v2.0] Checking local ${localId}...`);
    
    const { data: local, error: fetchError } = await supabase
      .from('locales')
      .select('id, nombre, source_type, enriquecido, activo')
      .eq('id', localId)
      .single();

    if (fetchError || !local) {
      console.error('[OSM Cleanup Service v2.0] Local not found:', fetchError);
      return false;
    }

    if (local.source_type !== 'osm' || !local.enriquecido || !local.activo) {
      console.log('[OSM Cleanup Service v2.0] Local does not meet migration criteria:', {
        source_type: local.source_type,
        enriquecido: local.enriquecido,
        activo: local.activo,
      });
      return false;
    }

    console.log(`[OSM Cleanup Service v2.0] Migrating enriched OSM local to Google catalog: ${local.nombre}`);

    const { error: updateError } = await supabase
      .from('locales')
      .update({ 
        source_type: 'google',
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq('id', localId);

    if (updateError) {
      console.error('[OSM Cleanup Service v2.0] Error migrating local:', updateError);
      return false;
    }

    console.log('[OSM Cleanup Service v2.0] Local migrated to Google catalog successfully');
    return true;
  } catch (error) {
    console.error('[OSM Cleanup Service v2.0] Error:', error);
    return false;
  }
}

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
    console.error('[OSM Cleanup Service v2.0] Error getting statistics:', error);
    return {
      totalOSM: 0,
      osmEnriquecidos: 0,
      osmActivos: 0,
      osmPendientes: 0,
      espacioEstimadoMB: 0,
    };
  }
}

export async function estaLimpiezaAutomaticaHabilitada(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'auto_cleanup_osm_enriched')
      .single();

    if (error || !data) {
      return true;
    }

    return data.value?.enabled !== false;
  } catch (error) {
    console.error('[OSM Cleanup Service v2.0] Error checking auto-cleanup status:', error);
    return true;
  }
}

export async function configurarLimpiezaAutomatica(enabled: boolean): Promise<boolean> {
  try {
    console.log('[OSM Cleanup Service v2.0] Setting auto-migration:', enabled);

    const { error } = await supabase
      .from('app_config')
      .upsert({
        key: 'auto_cleanup_osm_enriched',
        value: { enabled },
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[OSM Cleanup Service v2.0] Error setting auto-migration:', error);
      return false;
    }

    console.log('[OSM Cleanup Service v2.0] Auto-migration configured successfully');
    return true;
  } catch (error) {
    console.error('[OSM Cleanup Service v2.0] Error:', error);
    return false;
  }
}
