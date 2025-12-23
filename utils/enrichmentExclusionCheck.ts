
import { supabase } from './supabase';

/**
 * ✅ VERIFICACIÓN DE EXCLUSIÓN DE LOCALES
 * 
 * Verifica si un local está excluido del sistema de enriquecimiento
 * para prevenir costes innecesarios de API de Google Places
 */

export interface ExclusionCheckParams {
  nombre?: string;
  latitud?: number;
  longitud?: number;
  google_place_id?: string;
  osm_id?: string;
}

export interface ExclusionCheckResult {
  excluido: boolean;
  motivo?: string;
  fecha_exclusion?: string;
}

/**
 * Verifica si un local está excluido
 */
export async function verificarLocalExcluido(
  params: ExclusionCheckParams
): Promise<ExclusionCheckResult> {
  try {
    console.log('[ExclusionCheck] Verificando exclusión:', params);

    const { data, error } = await supabase.rpc('esta_local_excluido', {
      p_nombre: params.nombre || null,
      p_latitud: params.latitud || null,
      p_longitud: params.longitud || null,
      p_google_place_id: params.google_place_id || null,
      p_osm_id: params.osm_id || null,
    });

    if (error) {
      console.error('[ExclusionCheck] Error verificando exclusión:', error);
      // En caso de error, permitir el enriquecimiento (fail-safe)
      return { excluido: false };
    }

    const excluido = data as boolean;

    if (excluido) {
      console.log('[ExclusionCheck] ❌ Local excluido, no se enriquecerá');
      
      // Obtener detalles de la exclusión
      const { data: detalles } = await supabase
        .from('locales_excluidos')
        .select('motivo_exclusion, descripcion_exclusion, fecha_exclusion')
        .or(
          params.google_place_id ? `google_place_id.eq.${params.google_place_id}` : 
          params.osm_id ? `osm_id.eq.${params.osm_id}` :
          `nombre.eq.${params.nombre},latitud.eq.${params.latitud},longitud.eq.${params.longitud}`
        )
        .single();

      return {
        excluido: true,
        motivo: detalles?.descripcion_exclusion || detalles?.motivo_exclusion || 'Local excluido del sistema',
        fecha_exclusion: detalles?.fecha_exclusion,
      };
    }

    console.log('[ExclusionCheck] ✅ Local no excluido, puede enriquecerse');
    return { excluido: false };
  } catch (error) {
    console.error('[ExclusionCheck] Error inesperado:', error);
    // En caso de error, permitir el enriquecimiento (fail-safe)
    return { excluido: false };
  }
}

/**
 * Verifica múltiples locales de una vez
 */
export async function verificarLocalesExcluidos(
  locales: ExclusionCheckParams[]
): Promise<Map<string, ExclusionCheckResult>> {
  const resultados = new Map<string, ExclusionCheckResult>();

  for (const local of locales) {
    const key = local.google_place_id || local.osm_id || `${local.nombre}-${local.latitud}-${local.longitud}`;
    const resultado = await verificarLocalExcluido(local);
    resultados.set(key, resultado);
  }

  return resultados;
}

/**
 * Filtra una lista de locales eliminando los excluidos
 */
export async function filtrarLocalesExcluidos<T extends ExclusionCheckParams>(
  locales: T[]
): Promise<T[]> {
  const localesValidos: T[] = [];

  for (const local of locales) {
    const resultado = await verificarLocalExcluido(local);
    if (!resultado.excluido) {
      localesValidos.push(local);
    } else {
      console.log(`[ExclusionCheck] Filtrado local excluido: ${local.nombre} - ${resultado.motivo}`);
    }
  }

  console.log(`[ExclusionCheck] Filtrados ${locales.length - localesValidos.length} locales excluidos de ${locales.length} totales`);
  return localesValidos;
}
