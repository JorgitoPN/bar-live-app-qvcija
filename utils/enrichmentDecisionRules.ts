
/**
 * 🧠 REGLAS DE DECISIÓN AUTOMATIZADA PARA ENRIQUECIMIENTO
 * 
 * Este módulo implementa las reglas de decisión para fusionar datos de OSM y Google Places
 * siguiendo la estrategia definida en el documento de enriquecimiento.
 * 
 * REGLAS PRINCIPALES:
 * 1. Si Google Places coincide exactamente en coordenadas con OSM → usar todos los datos de Google Places
 * 2. Si Google Places coincide parcialmente (coordenadas cercanas + nombre similar) → fusionar datos
 * 3. Si Google Places no encontrado → conservar datos OSM
 * 4. Filtrar cualquier local que no cumpla:
 *    - Tipo válido (restaurant, bar, cafe, pub, nightclub, lounge)
 *    - Horario mínimo según tipo
 *    - Estado activo (abierto o reseñas recientes)
 */

import { GooglePlaceDetails } from '@/types';
import { validarLocalCompleto, estaEnEspana, nombreIndicaOcioNocturno } from './localTypesBackend';
import { mapGoogleTypesToBarlive, categorizarPorHorarios } from './enrichmentMapping';

/**
 * Calcular distancia entre dos coordenadas (en metros)
 * Usa la fórmula de Haversine
 */
function calcularDistancia(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distancia en metros
}

/**
 * Calcular similitud entre dos strings (0-1)
 * Usa el algoritmo de Levenshtein normalizado
 */
function calcularSimilitudNombre(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  const len1 = s1.length;
  const len2 = s2.length;

  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;

  const matrix: number[][] = [];

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      const cost = s1[j - 1] === s2[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}

/**
 * Determinar tipo de coincidencia entre OSM y Google Places
 */
export function determinarTipoCoincidencia(
  osmData: {
    nombre: string;
    latitud: number;
    longitud: number;
  },
  googleData: GooglePlaceDetails
): 'exacta' | 'parcial' | 'ninguna' {
  console.log('[Decision Rules] ========================================');
  console.log('[Decision Rules] Determining match type...');
  console.log('[Decision Rules] OSM:', osmData.nombre);
  console.log('[Decision Rules] Google:', googleData.name);

  // Calcular distancia entre coordenadas
  const distancia = calcularDistancia(
    osmData.latitud,
    osmData.longitud,
    googleData.geometry?.location?.lat || 0,
    googleData.geometry?.location?.lng || 0
  );

  console.log(`[Decision Rules] Distance: ${distancia.toFixed(2)}m`);

  // Calcular similitud de nombre
  const similitudNombre = calcularSimilitudNombre(
    osmData.nombre,
    googleData.name || ''
  );

  console.log(`[Decision Rules] Name similarity: ${(similitudNombre * 100).toFixed(1)}%`);

  // COINCIDENCIA EXACTA: Distancia ≤ 20m
  if (distancia <= 20) {
    console.log('[Decision Rules] ✅ EXACT MATCH (distance ≤ 20m)');
    console.log('[Decision Rules] ========================================');
    return 'exacta';
  }

  // COINCIDENCIA PARCIAL: Distancia ≤ 100m Y similitud de nombre ≥ 80%
  if (distancia <= 100 && similitudNombre >= 0.8) {
    console.log('[Decision Rules] ⚠️ PARTIAL MATCH (distance ≤ 100m + name similarity ≥ 80%)');
    console.log('[Decision Rules] ========================================');
    return 'parcial';
  }

  // SIN COINCIDENCIA
  console.log('[Decision Rules] ❌ NO MATCH');
  console.log('[Decision Rules] ========================================');
  return 'ninguna';
}

/**
 * Fusionar datos de OSM y Google Places según el tipo de coincidencia
 */
export function fusionarDatos(
  osmData: any,
  googleData: GooglePlaceDetails | null,
  tipoCoincidencia: 'exacta' | 'parcial' | 'ninguna'
): any {
  console.log('[Data Merge] ========================================');
  console.log('[Data Merge] Merging data...');
  console.log('[Data Merge] Match type:', tipoCoincidencia);

  // Si no hay datos de Google, conservar OSM
  if (!googleData) {
    console.log('[Data Merge] No Google data, keeping OSM data');
    console.log('[Data Merge] ========================================');
    return {
      ...osmData,
      enriquecido: false,
      notas_rechazo: 'No encontrado en Google Places',
    };
  }

  // COINCIDENCIA EXACTA: Priorizar TODOS los datos de Google Places
  if (tipoCoincidencia === 'exacta') {
    console.log('[Data Merge] ✅ EXACT MATCH → Using ALL Google Places data');
    console.log('[Data Merge] ========================================');

    // Mapear tipos de Google a BarLive
    const barliveTypes = mapGoogleTypesToBarlive(
      googleData.types || [],
      googleData.name || osmData.nombre
    );

    // Categorizar por horarios si están disponibles
    const tiposFinales = googleData.opening_hours
      ? categorizarPorHorarios(googleData.opening_hours, barliveTypes)
      : barliveTypes;

    return {
      // Datos básicos de Google Places
      nombre: googleData.name || osmData.nombre,
      direccion: googleData.formatted_address || osmData.direccion,
      latitud: googleData.geometry?.location?.lat || osmData.latitud,
      longitud: googleData.geometry?.location?.lng || osmData.longitud,
      telefono: googleData.formatted_phone_number,
      website: googleData.website,

      // Tipos y categorización
      tipo: tiposFinales[0] || osmData.tipo,
      barlive_types: tiposFinales,
      tipos_google: googleData.types || [],

      // Valoraciones
      google_rating: googleData.rating,
      google_user_ratings_total: googleData.user_ratings_total,

      // Estado
      google_business_status: googleData.business_status,
      activo: googleData.business_status === 'OPERATIONAL' || !googleData.business_status,

      // Horarios
      horarios_texto: googleData.opening_hours?.weekday_text || [],

      // Precio
      nivel_precio_google: googleData.price_level,

      // Enlaces
      google_maps_url: googleData.url,
      google_place_id: googleData.place_id,
      plus_code: googleData.plus_code?.global_code,

      // Descripción
      descripcion_google: googleData.editorial_summary?.overview,

      // Mantener datos OSM originales como referencia
      osm_id: osmData.osm_id,
      osm_type: osmData.osm_type,
      source_type: 'google_enriched',

      // Marcar como enriquecido
      enriquecido: true,
      fecha_actualizacion: new Date().toISOString(),
    };
  }

  // COINCIDENCIA PARCIAL: Fusionar datos, respetando horarios y tipo si es compatible
  if (tipoCoincidencia === 'parcial') {
    console.log('[Data Merge] ⚠️ PARTIAL MATCH → Merging compatible data');
    console.log('[Data Merge] ========================================');

    // Mapear tipos de Google a BarLive
    const barliveTypes = mapGoogleTypesToBarlive(
      googleData.types || [],
      googleData.name || osmData.nombre
    );

    // Categorizar por horarios si están disponibles
    const tiposFinales = googleData.opening_hours
      ? categorizarPorHorarios(googleData.opening_hours, barliveTypes)
      : barliveTypes;

    // Verificar si el tipo de Google es compatible con el tipo OSM
    const tipoCompatible = tiposFinales.includes(osmData.tipo) || tiposFinales.length === 0;

    return {
      // Mantener nombre OSM si la similitud no es perfecta
      nombre: osmData.nombre,

      // Usar dirección de Google si está disponible
      direccion: googleData.formatted_address || osmData.direccion,

      // Usar coordenadas de Google (más precisas)
      latitud: googleData.geometry?.location?.lat || osmData.latitud,
      longitud: googleData.geometry?.location?.lng || osmData.longitud,

      // Enriquecer con datos de Google
      telefono: googleData.formatted_phone_number || osmData.telefono,
      website: googleData.website || osmData.website,

      // Tipo: usar Google si es compatible, sino mantener OSM
      tipo: tipoCompatible ? tiposFinales[0] : osmData.tipo,
      barlive_types: tipoCompatible ? tiposFinales : [osmData.tipo],
      tipos_google: googleData.types || [],

      // Valoraciones
      google_rating: googleData.rating,
      google_user_ratings_total: googleData.user_ratings_total,

      // Estado
      google_business_status: googleData.business_status,
      activo: googleData.business_status === 'OPERATIONAL' || !googleData.business_status,

      // Horarios
      horarios_texto: googleData.opening_hours?.weekday_text || osmData.horarios_texto || [],

      // Precio
      nivel_precio_google: googleData.price_level,

      // Enlaces
      google_maps_url: googleData.url,
      google_place_id: googleData.place_id,
      plus_code: googleData.plus_code?.global_code,

      // Descripción
      descripcion_google: googleData.editorial_summary?.overview,
      descripcion: googleData.editorial_summary?.overview || osmData.descripcion,

      // Mantener datos OSM originales como referencia
      osm_id: osmData.osm_id,
      osm_type: osmData.osm_type,
      source_type: 'google_enriched',

      // Marcar como enriquecido
      enriquecido: true,
      fecha_actualizacion: new Date().toISOString(),
    };
  }

  // SIN COINCIDENCIA: Conservar datos OSM
  console.log('[Data Merge] ❌ NO MATCH → Keeping OSM data');
  console.log('[Data Merge] ========================================');
  return {
    ...osmData,
    enriquecido: false,
    notas_rechazo: 'No se encontró coincidencia en Google Places',
  };
}

/**
 * Aplicar filtros de validación completos
 */
export function aplicarFiltrosValidacion(
  datosLocal: any,
  categoriaOSM?: string
): {
  valido: boolean;
  razon?: string;
  datosActualizados: any;
} {
  console.log('[Validation Filters] ========================================');
  console.log('[Validation Filters] Applying validation filters...');
  console.log('[Validation Filters] Local:', datosLocal.nombre);

  // 1️⃣ VALIDAR TIPOS (con análisis de nombre)
  const validacionTipos = validarLocalCompleto(
    {
      types: datosLocal.tipos_google || [],
      formatted_address: datosLocal.direccion,
      plus_code: datosLocal.plus_code ? { global_code: datosLocal.plus_code } : undefined,
      business_status: datosLocal.google_business_status,
      name: datosLocal.nombre,
      opening_hours: datosLocal.opening_hours,
    },
    categoriaOSM
  );

  if (!validacionTipos.valido) {
    console.log('[Validation Filters] ❌ Failed validation:', validacionTipos.razon);
    console.log('[Validation Filters] ========================================');
    return {
      valido: false,
      razon: validacionTipos.razon,
      datosActualizados: {
        ...datosLocal,
        activo: false,
        enriquecido: false,
        notas_rechazo: validacionTipos.razon,
      },
    };
  }

  // 2️⃣ VALIDAR UBICACIÓN (España)
  const enEspana = estaEnEspana(datosLocal.direccion, datosLocal.plus_code);

  if (!enEspana) {
    console.log('[Validation Filters] ❌ Not in Spain');
    console.log('[Validation Filters] ========================================');
    return {
      valido: false,
      razon: 'Local fuera de España',
      datosActualizados: {
        ...datosLocal,
        activo: false,
        enriquecido: false,
        notas_rechazo: 'Local fuera de España',
      },
    };
  }

  // 3️⃣ VALIDAR ESTADO DEL NEGOCIO
  if (
    datosLocal.google_business_status &&
    datosLocal.google_business_status !== 'OPERATIONAL' &&
    datosLocal.google_business_status !== 'OPEN'
  ) {
    console.log('[Validation Filters] ❌ Business not operational');
    console.log('[Validation Filters] ========================================');
    return {
      valido: false,
      razon: `Estado de negocio: ${datosLocal.google_business_status}`,
      datosActualizados: {
        ...datosLocal,
        activo: false,
        enriquecido: false,
        notas_rechazo: `Estado de negocio: ${datosLocal.google_business_status}`,
      },
    };
  }

  console.log('[Validation Filters] ✅ All validations passed');
  console.log('[Validation Filters] ========================================');

  return {
    valido: true,
    datosActualizados: {
      ...datosLocal,
      activo: true,
      enriquecido: true,
      notas_rechazo: null,
    },
  };
}

/**
 * Proceso completo de decisión automatizada
 */
export function procesarDecisionAutomatizada(
  osmData: any,
  googleData: GooglePlaceDetails | null,
  categoriaOSM?: string
): {
  valido: boolean;
  razon?: string;
  datosFinales: any;
} {
  console.log('[Automated Decision] ========================================');
  console.log('[Automated Decision] Processing automated decision...');
  console.log('[Automated Decision] OSM Local:', osmData.nombre);

  // Si no hay datos de Google, conservar OSM sin enriquecer
  if (!googleData) {
    console.log('[Automated Decision] No Google data available');
    console.log('[Automated Decision] ========================================');
    return {
      valido: false,
      razon: 'No encontrado en Google Places',
      datosFinales: {
        ...osmData,
        enriquecido: false,
        notas_rechazo: 'No encontrado en Google Places',
      },
    };
  }

  // 1️⃣ DETERMINAR TIPO DE COINCIDENCIA
  const tipoCoincidencia = determinarTipoCoincidencia(
    {
      nombre: osmData.nombre,
      latitud: osmData.latitud,
      longitud: osmData.longitud,
    },
    googleData
  );

  // 2️⃣ FUSIONAR DATOS SEGÚN TIPO DE COINCIDENCIA
  const datosFusionados = fusionarDatos(osmData, googleData, tipoCoincidencia);

  // 3️⃣ APLICAR FILTROS DE VALIDACIÓN
  const resultadoValidacion = aplicarFiltrosValidacion(datosFusionados, categoriaOSM);

  console.log('[Automated Decision] Final decision:', resultadoValidacion.valido ? 'ACCEPT' : 'REJECT');
  if (!resultadoValidacion.valido) {
    console.log('[Automated Decision] Rejection reason:', resultadoValidacion.razon);
  }
  console.log('[Automated Decision] ========================================');

  return {
    valido: resultadoValidacion.valido,
    razon: resultadoValidacion.razon,
    datosFinales: resultadoValidacion.datosActualizados,
  };
}
