
import { GooglePlaceDetails } from '@/types';

/**
 * Resultado de validación de un local
 */
export interface ValidacionResult {
  valido: boolean;
  razon?: string;
}

/**
 * ✅ TIPOS PROHIBIDOS (120+ tipos)
 * Estos tipos de establecimientos NO son válidos para BarLive
 * NOTA: NO incluir 'establishment' ni 'point_of_interest' ya que son tipos genéricos
 */
const TIPOS_PROHIBIDOS = [
  // Salud y medicina
  'photographer', 'beauty_salon', 'hospital', 'dentist', 'doctor',
  'pharmacy', 'physiotherapist', 'veterinary_care', 'health',
  'medical_lab', 'dental_clinic', 'hair_care', 'spa',
  
  // Servicios financieros
  'bank', 'atm', 'accounting', 'insurance_agency', 'finance',
  'real_estate_agency', 'lawyer', 'notary',
  
  // Educación
  'school', 'university', 'library', 'primary_school',
  'secondary_school', 'preschool', 'driving_school',
  
  // Religión
  'church', 'mosque', 'synagogue', 'hindu_temple',
  'place_of_worship', 'cemetery', 'funeral_home',
  
  // Alojamiento
  'hotel', 'lodging', 'campground', 'rv_park', 'motel',
  
  // Comercio general
  'supermarket', 'grocery_or_supermarket', 'convenience_store',
  'department_store', 'shopping_mall', 'clothing_store',
  'shoe_store', 'jewelry_store', 'electronics_store',
  'furniture_store', 'home_goods_store', 'hardware_store',
  'book_store', 'pet_store', 'florist', 'bicycle_store',
  
  // Servicios automotrices
  'gas_station', 'car_repair', 'car_dealer', 'car_rental',
  'car_wash', 'parking', 'taxi_stand',
  
  // Servicios públicos
  'post_office', 'police', 'fire_station', 'local_government_office',
  'courthouse', 'embassy', 'city_hall',
  
  // Gimnasios y deportes
  'gym', 'stadium', 'bowling_alley', 'sports_club',
  
  // Otros servicios
  'laundry', 'locksmith', 'moving_company', 'painter',
  'plumber', 'roofing_contractor', 'storage', 'travel_agency',
  'electrician', 'general_contractor',
  
  // Transporte
  'airport', 'bus_station', 'train_station', 'subway_station',
  'transit_station', 'light_rail_station',
  
  // Entretenimiento no compatible
  'movie_theater', 'amusement_park', 'aquarium', 'art_gallery',
  'museum', 'zoo',
  
  // Tiendas especializadas
  'liquor_store', 'store',
];

/**
 * ✅ PALABRAS PROHIBIDAS EN NOMBRES
 * Si el nombre contiene estas palabras, el local NO es válido
 */
const PALABRAS_PROHIBIDAS = [
  // Fotografía
  'fotograf', 'photo', 'studio',
  
  // Belleza y estética
  'peluquer', 'salon', 'barberia', 'barber', 'estetica',
  'belleza', 'beauty', 'nails', 'uñas',
  
  // Salud
  'gimnasio', 'gym', 'fitness', 'hospital', 'clinica',
  'clinic', 'farmacia', 'pharmacy', 'dentist', 'medic',
  
  // Alojamiento
  'hotel', 'hostal', 'pension', 'apartamento', 'apartment',
  
  // Comercio
  'supermercado', 'supermarket', 'tienda', 'shop', 'store',
  'mercado', 'market',
  
  // Servicios automotrices
  'taller', 'garage', 'mecanico', 'mechanic', 'gasolinera',
  'gas station', 'parking',
  
  // Otros servicios
  'lavanderia', 'laundry', 'cerrajeria', 'locksmith',
  'fontaneria', 'plumber', 'electricista', 'electrician',
  
  // Educación
  'escuela', 'school', 'colegio', 'universidad', 'university',
  'academia', 'academy',
  
  // Religión
  'iglesia', 'church', 'mezquita', 'mosque', 'templo', 'temple',
  
  // Transporte
  'aeropuerto', 'airport', 'estacion', 'station',
];

/**
 * ✅ TIPOS VÁLIDOS DE HOSTELERÍA
 * El local DEBE tener al menos uno de estos tipos
 */
const TIPOS_VALIDOS_HOSTELERIA = [
  'bar', 'restaurant', 'cafe', 'night_club', 'pub',
  'food', 'meal_takeaway', 'meal_delivery',
  'bakery', 'cocktail_bar', 'wine_bar', 'beer_garden',
  'lounge', 'rooftop_bar', 'tapas_bar', 'tapas_restaurant',
  'brewery', 'winery', 'tavern', 'dance_club',
];

/**
 * ✅ VALIDACIÓN COMPLETA
 * Valida que un local de Google Places sea válido para BarLive
 */
export function esLocalValido(placeDetails: GooglePlaceDetails): ValidacionResult {
  console.log('[Validation] ========================================');
  console.log('[Validation] Validating place:', placeDetails.name);
  
  const types = placeDetails.types || [];
  const nombre = placeDetails.name.toLowerCase();
  const direccion = placeDetails.formatted_address.toLowerCase();
  
  // 1️⃣ Verificar que esté en España
  if (!direccion.includes('españa') && !direccion.includes('spain')) {
    console.log('[Validation] ❌ Fuera de España');
    return { valido: false, razon: 'Fuera de España' };
  }
  
  // 2️⃣ Verificar que tenga tipos válidos de hostelería PRIMERO
  // Esto es importante porque muchos locales tienen tipos genéricos + tipos específicos
  const tieneTipoValido = types.some(t => TIPOS_VALIDOS_HOSTELERIA.includes(t));
  if (!tieneTipoValido) {
    console.log('[Validation] ❌ Sin tipos válidos de hostelería');
    console.log('[Validation] Types found:', types);
    return { valido: false, razon: 'Sin tipos válidos de hostelería' };
  }
  
  // 3️⃣ Verificar tipos prohibidos (solo si NO tiene tipos válidos)
  // Filtramos los tipos genéricos que no son relevantes
  const tiposRelevantes = types.filter(t => 
    t !== 'establishment' && 
    t !== 'point_of_interest' &&
    t !== 'premise'
  );
  
  const tipoProhibidoEncontrado = tiposRelevantes.find(t => TIPOS_PROHIBIDOS.includes(t));
  if (tipoProhibidoEncontrado) {
    console.log(`[Validation] ❌ Tipo prohibido: ${tipoProhibidoEncontrado}`);
    return { valido: false, razon: `Tipo prohibido: ${tipoProhibidoEncontrado}` };
  }
  
  // 4️⃣ Verificar palabras prohibidas en nombre
  const palabraProhibidaEncontrada = PALABRAS_PROHIBIDAS.find(p => nombre.includes(p));
  if (palabraProhibidaEncontrada) {
    console.log(`[Validation] ❌ Palabra prohibida en nombre: ${palabraProhibidaEncontrada}`);
    return { valido: false, razon: `Nombre indica negocio no válido: ${palabraProhibidaEncontrada}` };
  }
  
  // 5️⃣ Verificar estado del negocio
  if (placeDetails.business_status === 'CLOSED_PERMANENTLY') {
    console.log('[Validation] ❌ Cerrado permanentemente');
    return { valido: false, razon: 'Cerrado permanentemente' };
  }
  
  if (placeDetails.business_status === 'CLOSED_TEMPORARILY') {
    console.log('[Validation] ⚠️ Cerrado temporalmente (permitido)');
    // Permitir temporalmente cerrados, pero marcar
  }
  
  // 6️⃣ Verificar que tenga nombre
  if (!placeDetails.name || placeDetails.name.trim() === '') {
    console.log('[Validation] ❌ Sin nombre');
    return { valido: false, razon: 'Sin nombre' };
  }
  
  // 7️⃣ Verificar que tenga ubicación
  if (!placeDetails.geometry || !placeDetails.geometry.location) {
    console.log('[Validation] ❌ Sin ubicación geográfica');
    return { valido: false, razon: 'Sin ubicación geográfica' };
  }
  
  console.log('[Validation] ✅ Place is valid');
  console.log('[Validation] Valid types:', types.filter(t => TIPOS_VALIDOS_HOSTELERIA.includes(t)));
  console.log('[Validation] All types:', types);
  console.log('[Validation] ========================================');
  
  return { valido: true };
}

/**
 * Validar distancia entre dos puntos (para verificar que el resultado de Google coincide con OSM)
 */
export function validarDistancia(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  maxDistanciaMetros: number = 100
): boolean {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distancia = R * c; // Distancia en metros
  
  console.log(`[Validation] Distance: ${distancia.toFixed(2)}m (max: ${maxDistanciaMetros}m)`);
  
  return distancia <= maxDistanciaMetros;
}
