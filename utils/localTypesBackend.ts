
/**
 * 🎯 SISTEMA DE DISCRIMINACIÓN PARA IMPORTAR LOCALES
 * Solo importar y enriquecer locales de ocio nocturno y restauración en España
 */

// ✅ TIPOS VÁLIDOS DE GOOGLE PLACES
export const TIPOS_VALIDOS = [
  // ✅ BARES Y COPAS
  'bar',
  'cocktail_bar',
  'wine_bar',
  'sports_bar',
  'pub',
  
  // ✅ RESTAURACIÓN
  'restaurant',
  'cafe',
  'coffee_shop',
  'bakery',
  'meal_takeaway',
  'meal_delivery',
  'fast_food_restaurant',
  'food',
  
  // ✅ OCIO NOCTURNO
  'night_club',
];

// ❌ TIPOS PROHIBIDOS
export const TIPOS_PROHIBIDOS = [
  // ❌ BELLEZA Y SALUD
  'beauty_salon', 'hair_care', 'spa', 'gym', 
  'nail_salon', 'massage', 'tattoo_shop', 'barber_shop',
  'physiotherapist',
  
  // ❌ TIENDAS
  'store', 'clothing_store', 'shoe_store', 
  'hardware_store', 'furniture_store', 'electronics_store',
  'home_goods_store', 'shopping_mall', 'supermarket',
  'grocery_store', 'convenience_store', 'pet_store', 
  'florist',
  
  // ❌ SERVICIOS FINANCIEROS
  'bank', 'atm', 'insurance_agency', 'accounting',
  'real_estate_agency',
  
  // ❌ SALUD
  'pharmacy', 'hospital', 'doctor', 'dentist', 
  'veterinary_care',
  
  // ❌ AUTOMOCIÓN
  'car_repair', 'gas_station', 'car_wash', 'car_dealer',
  
  // ❌ ALOJAMIENTO
  'lodging', 'hotel',
  
  // ❌ EDUCACIÓN Y CULTURA
  'school', 'university', 'library',
  
  // ❌ RELIGIÓN
  'church', 'mosque', 'synagogue',
  
  // ❌ ADMINISTRACIÓN
  'police', 'fire_station', 'city_hall', 'courthouse',
  'embassy',
  
  // ❌ OTROS
  'parking', 'laundry', 'travel_agency', 'lawyer',
];

/**
 * Verificar si un local tiene tipos válidos
 */
export function tieneAlgunTipoValido(types: string[]): boolean {
  if (!types || types.length === 0) {
    return false;
  }
  
  return types.some(type => TIPOS_VALIDOS.includes(type));
}

/**
 * Verificar si un local tiene tipos prohibidos
 */
export function tieneAlgunTipoProhibido(types: string[]): boolean {
  if (!types || types.length === 0) {
    return false;
  }
  
  return types.some(type => TIPOS_PROHIBIDOS.includes(type));
}

/**
 * Validar si un local es válido para BarLive
 */
export function esLocalValidoParaBarlive(types: string[]): {
  valido: boolean;
  razon?: string;
} {
  console.log('[Type Validation] Checking types:', types);
  
  // Verificar si tiene tipos prohibidos
  if (tieneAlgunTipoProhibido(types)) {
    const tiposProhibidosEncontrados = types.filter(t => TIPOS_PROHIBIDOS.includes(t));
    console.log('[Type Validation] ❌ Has prohibited types:', tiposProhibidosEncontrados);
    return {
      valido: false,
      razon: `Tipo prohibido: ${tiposProhibidosEncontrados.join(', ')}`,
    };
  }
  
  // Verificar si tiene al menos un tipo válido
  if (!tieneAlgunTipoValido(types)) {
    console.log('[Type Validation] ❌ No valid types found');
    return {
      valido: false,
      razon: 'No tiene tipos válidos para BarLive',
    };
  }
  
  console.log('[Type Validation] ✅ Valid for BarLive');
  return {
    valido: true,
  };
}

/**
 * Validar si un local está en España
 */
export function estaEnEspana(direccion: string, plusCode?: string): boolean {
  if (!direccion) {
    return false;
  }
  
  const direccionLower = direccion.toLowerCase();
  
  // Verificar si contiene "españa" o "spain"
  if (direccionLower.includes('españa') || direccionLower.includes('spain')) {
    return true;
  }
  
  // Verificar Plus Code (España tiene códigos que empiezan con 8C)
  if (plusCode && plusCode.startsWith('8C')) {
    return true;
  }
  
  // Lista de provincias españolas
  const provinciasEspanolas = [
    'madrid', 'barcelona', 'valencia', 'sevilla', 'zaragoza',
    'málaga', 'murcia', 'palma', 'las palmas', 'bilbao',
    'alicante', 'córdoba', 'valladolid', 'vigo', 'gijón',
    'granada', 'oviedo', 'santander', 'pamplona', 'almería',
    'toledo', 'burgos', 'salamanca', 'león', 'cádiz',
    'huelva', 'jaén', 'guadalajara', 'cuenca', 'albacete',
    'ciudad real', 'badajoz', 'cáceres', 'lugo', 'ourense',
    'pontevedra', 'a coruña', 'la coruña', 'huesca', 'teruel',
    'lleida', 'girona', 'tarragona', 'castellón', 'ávila',
    'segovia', 'soria', 'palencia', 'zamora', 'álava',
    'guipúzcoa', 'vizcaya', 'la rioja', 'navarra', 'ceuta', 'melilla',
  ];
  
  return provinciasEspanolas.some(provincia => direccionLower.includes(provincia));
}

/**
 * Validar estado del negocio
 */
export function esEstadoNegocioValido(businessStatus?: string): {
  valido: boolean;
  razon?: string;
} {
  if (!businessStatus) {
    return { valido: true };
  }
  
  // Rechazar locales cerrados permanentemente
  if (businessStatus === 'CLOSED_PERMANENTLY') {
    return {
      valido: false,
      razon: 'Local cerrado permanentemente',
    };
  }
  
  // Aceptar locales operativos y cerrados temporalmente
  return { valido: true };
}

/**
 * Validación completa de un local
 */
export function validarLocalCompleto(placeDetails: {
  types?: string[];
  formatted_address?: string;
  plus_code?: { global_code?: string };
  business_status?: string;
  name?: string;
}): {
  valido: boolean;
  razon?: string;
} {
  console.log('[Complete Validation] ========================================');
  console.log('[Complete Validation] Validating:', placeDetails.name);
  
  // 1. Validar tipos
  const validacionTipos = esLocalValidoParaBarlive(placeDetails.types || []);
  if (!validacionTipos.valido) {
    console.log('[Complete Validation] ❌ Failed type validation');
    return validacionTipos;
  }
  
  // 2. Validar ubicación (España)
  const enEspana = estaEnEspana(
    placeDetails.formatted_address || '',
    placeDetails.plus_code?.global_code
  );
  if (!enEspana) {
    console.log('[Complete Validation] ❌ Not in Spain');
    return {
      valido: false,
      razon: 'Local fuera de España',
    };
  }
  
  // 3. Validar estado del negocio
  const validacionEstado = esEstadoNegocioValido(placeDetails.business_status);
  if (!validacionEstado.valido) {
    console.log('[Complete Validation] ❌ Failed business status validation');
    return validacionEstado;
  }
  
  console.log('[Complete Validation] ✅ All validations passed');
  console.log('[Complete Validation] ========================================');
  
  return { valido: true };
}
