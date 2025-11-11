
import { GooglePlaceDetails } from '@/types';
import { verificarDisponibilidadAPI, incrementarContadorAPI } from './apiCostControl';

// Configuración de la API de Google Places
const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';

// URLs de la API
const TEXT_SEARCH_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const NEARBY_SEARCH_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
const DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';
const STREET_VIEW_URL = 'https://maps.googleapis.com/maps/api/streetview';

/**
 * Búsqueda de texto en Google Places
 */
export async function googlePlacesTextSearch(query: string): Promise<any | null> {
  try {
    // 🔒 VERIFICAR DISPONIBILIDAD API
    const disponibilidad = await verificarDisponibilidadAPI();
    if (!disponibilidad.disponible) {
      console.error(`[Google Places] API not available: ${disponibilidad.razon}`);
      throw new Error(disponibilidad.razon);
    }
    
    console.log(`[Google Places] Text search: ${query}`);
    
    const url = `${TEXT_SEARCH_URL}?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}&language=es`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    // ✅ INCREMENTAR CONTADOR
    await incrementarContadorAPI(1);
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      console.log(`[Google Places] Found ${data.results.length} results`);
      return data.results[0]; // Retorna el primer resultado
    }
    
    console.log(`[Google Places] No results found. Status: ${data.status}`);
    return null;
  } catch (error) {
    console.error('[Google Places] Text search error:', error);
    throw error;
  }
}

/**
 * Búsqueda por proximidad en Google Places
 */
export async function googlePlacesNearby(params: {
  location: string;
  radius: number;
  keyword: string;
  type?: string;
}): Promise<any | null> {
  try {
    // 🔒 VERIFICAR DISPONIBILIDAD API
    const disponibilidad = await verificarDisponibilidadAPI();
    if (!disponibilidad.disponible) {
      console.error(`[Google Places] API not available: ${disponibilidad.razon}`);
      throw new Error(disponibilidad.razon);
    }
    
    console.log(`[Google Places] Nearby search: ${params.keyword} at ${params.location}`);
    
    let url = `${NEARBY_SEARCH_URL}?location=${params.location}&radius=${params.radius}&keyword=${encodeURIComponent(params.keyword)}&key=${GOOGLE_PLACES_API_KEY}&language=es`;
    
    // Añadir tipo si se especifica
    if (params.type) {
      url += `&type=${params.type}`;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    // ✅ INCREMENTAR CONTADOR
    await incrementarContadorAPI(1);
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      console.log(`[Google Places] Found ${data.results.length} nearby results`);
      return data.results[0];
    }
    
    console.log(`[Google Places] No nearby results found. Status: ${data.status}`);
    return null;
  } catch (error) {
    console.error('[Google Places] Nearby search error:', error);
    throw error;
  }
}

/**
 * 🔍 BÚSQUEDA MEJORADA CON MÚLTIPLES ESTRATEGIAS
 * Implementa 5 estrategias de búsqueda para maximizar la tasa de éxito
 */
export async function buscarLocalConEstrategias(params: {
  nombre: string;
  direccion: string;
  provincia: string;
  tipo: string;
  latitud?: number;
  longitud?: number;
}): Promise<any | null> {
  console.log('[Multi-Strategy Search] ========================================');
  console.log('[Multi-Strategy Search] Searching for:', params.nombre);
  
  // ESTRATEGIA 1: Búsqueda por texto con nombre + ciudad + provincia
  const ciudad = params.direccion.split(',')[0].trim();
  const query1 = `${params.nombre} ${ciudad} ${params.provincia}`;
  console.log('[Multi-Strategy Search] Strategy 1: Text search with full address');
  console.log(`[Multi-Strategy Search] Query: "${query1}"`);
  
  let result = await googlePlacesTextSearch(query1);
  if (result && result.place_id) {
    console.log('[Multi-Strategy Search] ✅ Found with Strategy 1');
    console.log('[Multi-Strategy Search] ========================================');
    return result;
  }
  
  // ESTRATEGIA 2: Búsqueda por proximidad (nearby search) con tipo específico
  if (params.latitud && params.longitud) {
    console.log('[Multi-Strategy Search] Strategy 2: Nearby search with type');
    
    // Mapear tipo OSM a tipo Google
    const tipoGoogle = mapearTipoOSMaGoogle(params.tipo);
    console.log(`[Multi-Strategy Search] Type: ${tipoGoogle}`);
    
    result = await googlePlacesNearby({
      location: `${params.latitud},${params.longitud}`,
      radius: 100, // 100 metros
      keyword: params.nombre,
      type: tipoGoogle,
    });
    
    if (result && result.place_id) {
      console.log('[Multi-Strategy Search] ✅ Found with Strategy 2');
      console.log('[Multi-Strategy Search] ========================================');
      return result;
    }
  }
  
  // ESTRATEGIA 3: Búsqueda solo con nombre + provincia
  const query3 = `${params.nombre} ${params.provincia}`;
  console.log('[Multi-Strategy Search] Strategy 3: Text search with name + province');
  console.log(`[Multi-Strategy Search] Query: "${query3}"`);
  
  result = await googlePlacesTextSearch(query3);
  if (result && result.place_id) {
    console.log('[Multi-Strategy Search] ✅ Found with Strategy 3');
    console.log('[Multi-Strategy Search] ========================================');
    return result;
  }
  
  // ESTRATEGIA 4: Búsqueda con tipo de local + nombre + provincia
  const tipoLocal = params.tipo === 'discoteca' ? 'nightclub' : params.tipo;
  const query4 = `${tipoLocal} ${params.nombre} ${params.provincia}`;
  console.log('[Multi-Strategy Search] Strategy 4: Text search with type + name');
  console.log(`[Multi-Strategy Search] Query: "${query4}"`);
  
  result = await googlePlacesTextSearch(query4);
  if (result && result.place_id) {
    console.log('[Multi-Strategy Search] ✅ Found with Strategy 4');
    console.log('[Multi-Strategy Search] ========================================');
    return result;
  }
  
  // ESTRATEGIA 5: Búsqueda por proximidad sin tipo específico (más amplia)
  if (params.latitud && params.longitud) {
    console.log('[Multi-Strategy Search] Strategy 5: Nearby search without type');
    
    result = await googlePlacesNearby({
      location: `${params.latitud},${params.longitud}`,
      radius: 150, // Radio más amplio: 150 metros
      keyword: params.nombre,
    });
    
    if (result && result.place_id) {
      console.log('[Multi-Strategy Search] ✅ Found with Strategy 5');
      console.log('[Multi-Strategy Search] ========================================');
      return result;
    }
  }
  
  console.log('[Multi-Strategy Search] ❌ Not found with any strategy');
  console.log('[Multi-Strategy Search] ========================================');
  return null;
}

/**
 * Mapear tipo OSM a tipo Google Places
 */
function mapearTipoOSMaGoogle(tipoOSM: string): string {
  const mapping: Record<string, string> = {
    'bar': 'bar',
    'pub': 'bar',
    'discoteca': 'night_club',
    'cafe': 'cafe',
    'restaurante': 'restaurant',
    'cocteleria': 'bar',
    'terraza': 'bar',
    'lounge': 'bar',
    'rooftop': 'bar',
  };
  
  return mapping[tipoOSM] || 'bar';
}

/**
 * Obtener detalles completos de un lugar
 */
export async function googlePlacesDetails(
  placeId: string,
  fields?: string[]
): Promise<GooglePlaceDetails | null> {
  try {
    // 🔒 VERIFICAR DISPONIBILIDAD API
    const disponibilidad = await verificarDisponibilidadAPI();
    if (!disponibilidad.disponible) {
      console.error(`[Google Places] API not available: ${disponibilidad.razon}`);
      throw new Error(disponibilidad.razon);
    }
    
    console.log(`[Google Places] Getting details for place_id: ${placeId}`);
    
    const defaultFields = [
      'name',
      'formatted_address',
      'geometry',
      'rating',
      'user_ratings_total',
      'website',
      'formatted_phone_number',
      'international_phone_number',
      'opening_hours',
      'photos',
      'types',
      'price_level',
      'url',
      'reviews',
      'editorial_summary',
      'business_status',
      'plus_code',
    ];
    
    const fieldsToUse = fields || defaultFields;
    const fieldsParam = fieldsToUse.join(',');
    
    const url = `${DETAILS_URL}?place_id=${placeId}&fields=${fieldsParam}&key=${GOOGLE_PLACES_API_KEY}&language=es`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    // ✅ INCREMENTAR CONTADOR
    await incrementarContadorAPI(1);
    
    if (data.status === 'OK' && data.result) {
      console.log(`[Google Places] Details retrieved successfully`);
      return data.result as GooglePlaceDetails;
    }
    
    console.log(`[Google Places] Failed to get details. Status: ${data.status}`);
    return null;
  } catch (error) {
    console.error('[Google Places] Details error:', error);
    throw error;
  }
}

/**
 * Obtener URL de una foto de Google Places
 */
export function getGooglePlacePhotoUrl(
  photoReference: string,
  maxWidth: number = 800
): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
}

/**
 * Obtener URL de Google Street View para una ubicación
 * @param lat Latitud
 * @param lng Longitud
 * @param width Ancho de la imagen (default: 800)
 * @param height Alto de la imagen (default: 600)
 * @param heading Dirección de la cámara en grados (0-360, opcional)
 * @param pitch Ángulo de inclinación de la cámara (-90 a 90, opcional)
 * @param fov Campo de visión (10-120, default: 90)
 */
export function getGoogleStreetViewUrl(
  lat: number,
  lng: number,
  width: number = 800,
  height: number = 600,
  heading?: number,
  pitch?: number,
  fov: number = 90
): string {
  let url = `${STREET_VIEW_URL}?size=${width}x${height}&location=${lat},${lng}&fov=${fov}&key=${GOOGLE_PLACES_API_KEY}`;
  
  if (heading !== undefined) {
    url += `&heading=${heading}`;
  }
  
  if (pitch !== undefined) {
    url += `&pitch=${pitch}`;
  }
  
  return url;
}

/**
 * Verificar si existe Street View para una ubicación
 * @param lat Latitud
 * @param lng Longitud
 * @returns Promise<boolean> true si existe Street View
 */
export async function checkStreetViewAvailability(
  lat: number,
  lng: number
): Promise<boolean> {
  try {
    const metadataUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${GOOGLE_PLACES_API_KEY}`;
    
    const response = await fetch(metadataUrl);
    const data = await response.json();
    
    return data.status === 'OK';
  } catch (error) {
    console.error('[Google Street View] Error checking availability:', error);
    return false;
  }
}
