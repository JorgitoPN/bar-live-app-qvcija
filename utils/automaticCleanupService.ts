
import { supabase } from './supabase';

/**
 * ✅ SERVICIO DE LIMPIEZA AUTOMÁTICA
 * 
 * Ejecuta limpieza automática de duplicados e inválidos
 * Puede ser llamado desde:
 * - Edge Function con cron job
 * - Manualmente desde el panel de admin
 * - Después de importaciones masivas
 */

export interface CleanupOptions {
  dryRun?: boolean;
  incluirDuplicados?: boolean;
  incluirInvalidos?: boolean;
  adminId?: string;
}

export interface CleanupSummary {
  success: boolean;
  timestamp: string;
  dryRun: boolean;
  totalEliminados: number;
  totalExcluidos: number;
  resultados: Array<{
    tipo: string;
    gruposProcesados: number;
    localesEliminados: number;
    localesExcluidos: number;
  }>;
  error?: string;
}

/**
 * Ejecuta limpieza automática completa
 */
export async function ejecutarLimpiezaAutomatica(
  options: CleanupOptions = {}
): Promise<CleanupSummary> {
  const {
    dryRun = true,
    incluirDuplicados = true,
    incluirInvalidos = true,
    adminId = null,
  } = options;

  console.log('[AutoCleanup] ========================================');
  console.log('[AutoCleanup] Starting automatic cleanup');
  console.log('[AutoCleanup] Dry run:', dryRun);
  console.log('[AutoCleanup] Include duplicates:', incluirDuplicados);
  console.log('[AutoCleanup] Include invalids:', incluirInvalidos);
  console.log('[AutoCleanup] Admin ID:', adminId);

  try {
    const { data, error } = await supabase.rpc('ejecutar_limpieza_completa', {
      p_admin_id: adminId,
      p_dry_run: dryRun,
      p_incluir_duplicados: incluirDuplicados,
      p_incluir_invalidos: incluirInvalidos,
    });

    if (error) throw error;

    const resultados = (data || []).map((r: any) => ({
      tipo: r.tipo_limpieza,
      gruposProcesados: r.grupos_procesados,
      localesEliminados: r.locales_eliminados,
      localesExcluidos: r.locales_excluidos,
    }));

    const totalEliminados = resultados.reduce((sum, r) => sum + r.localesEliminados, 0);
    const totalExcluidos = resultados.reduce((sum, r) => sum + r.localesExcluidos, 0);

    console.log('[AutoCleanup] ✅ Cleanup completed');
    console.log('[AutoCleanup] Total eliminated:', totalEliminados);
    console.log('[AutoCleanup] Total excluded:', totalExcluidos);
    console.log('[AutoCleanup] ========================================');

    return {
      success: true,
      timestamp: new Date().toISOString(),
      dryRun,
      totalEliminados,
      totalExcluidos,
      resultados,
    };
  } catch (error) {
    console.error('[AutoCleanup] ❌ Error executing cleanup:', error);
    
    return {
      success: false,
      timestamp: new Date().toISOString(),
      dryRun,
      totalEliminados: 0,
      totalExcluidos: 0,
      resultados: [],
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene estadísticas de limpieza
 */
export async function obtenerEstadisticasLimpieza() {
  try {
    const { data, error } = await supabase.rpc('obtener_estadisticas_limpieza');

    if (error) throw error;

    return data[0];
  } catch (error) {
    console.error('[AutoCleanup] Error getting statistics:', error);
    return null;
  }
}

/**
 * Verifica si un local debe ser excluido antes de enriquecerlo
 */
export async function debeExcluirLocal(params: {
  nombre?: string;
  latitud?: number;
  longitud?: number;
  google_place_id?: string;
  osm_id?: string;
}): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('esta_local_excluido', {
      p_nombre: params.nombre || null,
      p_latitud: params.latitud || null,
      p_longitud: params.longitud || null,
      p_google_place_id: params.google_place_id || null,
      p_osm_id: params.osm_id || null,
    });

    if (error) {
      console.error('[AutoCleanup] Error checking exclusion:', error);
      return false; // Fail-safe: allow enrichment if check fails
    }

    return data as boolean;
  } catch (error) {
    console.error('[AutoCleanup] Error in debeExcluirLocal:', error);
    return false; // Fail-safe
  }
}

/**
 * Programa limpieza automática (para usar con cron job)
 */
export async function programarLimpiezaAutomatica() {
  console.log('[AutoCleanup] 📅 Scheduling automatic cleanup...');
  
  // Esta función debería ser llamada desde un Edge Function con cron job
  // Por ejemplo: cada día a las 3:00 AM
  
  const summary = await ejecutarLimpiezaAutomatica({
    dryRun: false, // Ejecutar limpieza real
    incluirDuplicados: true,
    incluirInvalidos: true,
  });

  console.log('[AutoCleanup] Scheduled cleanup completed:', summary);
  
  return summary;
}
