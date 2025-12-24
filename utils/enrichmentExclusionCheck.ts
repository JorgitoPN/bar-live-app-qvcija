
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
  amenity_type?: string; // Tipo de amenity de OSM (bar, restaurant, cafe, pub, nightclub)
}

export interface ExclusionCheckResult {
  excluido: boolean;
  motivo?: string;
  fecha_exclusion?: string;
}

/**
 * ✅ TIPOS DE AMENITY VÁLIDOS DE OSM
 * Estos son los tipos que queremos importar desde OpenStreetMap
 */
const AMENITY_TYPES_VALIDOS = [
  'bar',
  'pub',
  'restaurant',
  'cafe',
  'nightclub',
  'biergarten',
  'fast_food',
];

/**
 * Verifica si el tipo de amenity es válido
 */
export function esAmenityValido(amenityType?: string): { valido: boolean; razon?: string } {
  if (!amenityType || amenityType.trim() === '') {
    return { valido: false, razon: 'Tipo de amenity vacío' };
  }

  const amenityNormalizado = amenityType.toLowerCase().trim();

  if (!AMENITY_TYPES_VALIDOS.includes(amenityNormalizado)) {
    console.log(`[AmenityValidation] ❌ Amenity inválido: "${amenityType}" - No es un tipo válido`);
    return {
      valido: false,
      razon: `El tipo de amenity "${amenityType}" no es válido. Tipos válidos: ${AMENITY_TYPES_VALIDOS.join(', ')}`,
    };
  }

  console.log(`[AmenityValidation] ✅ Amenity válido: "${amenityType}"`);
  return { valido: true };
}

/**
 * Verifica si el nombre de un local es válido (no vacío, no genérico)
 */
export function esNombreLocalValido(nombre: string): { valido: boolean; razon?: string } {
  if (!nombre || nombre.trim() === '') {
    return { valido: false, razon: 'Nombre vacío' };
  }

  // Normalizar el nombre para la comparación
  const nombreNormalizado = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  // Rechazar nombres genéricos o muy cortos
  if (nombreNormalizado.length < 3) {
    return { valido: false, razon: 'Nombre demasiado corto' };
  }

  // Lista de nombres genéricos a rechazar
  const nombresGenericos = [
    'sin nombre',
    'unnamed',
    'bar',
    'restaurante',
    'cafe',
    'pub',
    'discoteca',
    'local',
    'establecimiento',
  ];

  if (nombresGenericos.includes(nombreNormalizado)) {
    return { valido: false, razon: 'Nombre demasiado genérico' };
  }

  console.log(`[NameValidation] ✅ Nombre válido: "${nombre}"`);
  return { valido: true };
}

/**
 * Verifica si un local está excluido
 */
export async function verificarLocalExcluido(
  params: ExclusionCheckParams
): Promise<ExclusionCheckResult> {
  try {
    console.log('[ExclusionCheck] Verificando exclusión:', params);

    // 🔍 VALIDACIÓN DE AMENITY TYPE PRIMERO (si está disponible)
    if (params.amenity_type) {
      const validacionAmenity = esAmenityValido(params.amenity_type);
      if (!validacionAmenity.valido) {
        console.log('[ExclusionCheck] ❌ Local excluido por amenity type inválido');
        return {
          excluido: true,
          motivo: validacionAmenity.razon,
        };
      }
    }

    // 🔍 VALIDACIÓN DE NOMBRE
    if (params.nombre) {
      const validacionNombre = esNombreLocalValido(params.nombre);
      if (!validacionNombre.valido) {
        console.log('[ExclusionCheck] ❌ Local excluido por nombre inválido');
        return {
          excluido: true,
          motivo: validacionNombre.razon,
        };
      }
    }

    // 🔍 VERIFICAR EN BASE DE DATOS
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
      console.log('[ExclusionCheck] ❌ Local excluido en base de datos, no se enriquecerá');
      
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

/**
 * Filtra una lista de locales por nombre válido (sin consultar base de datos)
 */
export function filtrarLocalesPorNombreValido<T extends { nombre: string }>(
  locales: T[]
): { validos: T[]; invalidos: T[] } {
  const validos: T[] = [];
  const invalidos: T[] = [];

  for (const local of locales) {
    const validacion = esNombreLocalValido(local.nombre);
    if (validacion.valido) {
      validos.push(local);
    } else {
      invalidos.push(local);
      console.log(`[NameValidation] Filtrado local con nombre inválido: ${local.nombre}`);
    }
  }

  console.log(`[NameValidation] Válidos: ${validos.length}, Inválidos: ${invalidos.length} de ${locales.length} totales`);
  return { validos, invalidos };
}
