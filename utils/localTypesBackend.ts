
/**
 * 🎯 SISTEMA DE DISCRIMINACIÓN PARA IMPORTAR LOCALES
 * Solo importar y enriquecer locales de ocio nocturno y restauración en España
 * 
 * ACTUALIZADO: Nueva lista de tipos válidos basada en Google Places API
 */

// ✅ TIPOS VÁLIDOS DE GOOGLE PLACES (ACTUALIZADO 2024)
// Basado en la lista oficial de tipos de Google Places
export const TIPOS_VALIDOS = [
  // ✅ RESTAURACIÓN Y COMIDA
  'restaurant',           // Restaurante general
  'cafe',                // Cafetería
  'coffee_shop',         // Tienda de café
  'bakery',              // Panadería
  'meal_takeaway',       // Comida para llevar
  'meal_delivery',       // Entrega de comida
  'food',                // Comida general
  'fast_food',           // Comida rápida
  'pizza_restaurant',    // Pizzería
  'hamburger_restaurant', // Hamburguesería
  'tapas_restaurant',    // Restaurante de tapas
  
  // ✅ BARES Y COPAS
  'bar',                 // Bar general
  'pub',                 // Pub/Taberna
  'cocktail_bar',        // Bar de cócteles
  'wine_bar',            // Bar de vinos
  'sports_bar',          // Bar deportivo
  'tapas_bar',           // Bar de tapas
  'beer_garden',         // Cervecería al aire libre
  'brewery',             // Cervecería
  'winery',              // Bodega
  'tavern',              // Taberna
  
  // ✅ OCIO NOCTURNO Y ENTRETENIMIENTO
  'night_club',          // Discoteca/Club nocturno
  'dance_club',          // Club de baile
  'disco',               // Discoteca
  'nightclub',           // Club nocturno
  'concert_hall',        // Sala de conciertos
  'music_venue',         // Lugar de música
  'amphitheatre',        // Anfiteatro
  'dance_hall',          // Sala de baile
  
  // ✅ LOUNGES Y COCTELERÍAS
  'lounge',              // Lounge
  'cocktail_lounge',     // Lounge de cócteles
  'rooftop_bar',         // Bar en azotea
];

// ❌ TIPOS PROHIBIDOS (ALTA PRIORIDAD - RECHAZAR SIEMPRE)
export const TIPOS_PROHIBIDOS = [
  // ❌ BELLEZA Y SALUD
  'beauty_salon', 'hair_care', 'spa', 'gym', 
  'nail_salon', 'massage', 'tattoo_shop', 'barber_shop',
  'physiotherapist', 'health',
  
  // ❌ TIENDAS Y COMERCIOS
  'store',               // Tienda general
  'shop',                // Tienda
  'clothing_store', 'shoe_store', 
  'hardware_store', 'furniture_store', 'electronics_store',
  'home_goods_store', 'shopping_mall', 'supermarket',
  'grocery_store', 'convenience_store', 'pet_store', 
  'florist', 'book_store', 'jewelry_store',
  
  // ❌ SERVICIOS FINANCIEROS
  'bank', 'atm', 'insurance_agency', 'accounting',
  'real_estate_agency',
  
  // ❌ SALUD
  'pharmacy', 'hospital', 'doctor', 'dentist', 
  'veterinary_care', 'medical_lab', 'dental_clinic',
  'clinic',
  
  // ❌ AUTOMOCIÓN
  'car_repair', 'gas_station', 'car_wash', 'car_dealer',
  'car_rental', 'fuel',
  
  // ❌ ALOJAMIENTO
  'lodging', 'hotel', 'motel', 'campground',
  
  // ❌ EDUCACIÓN Y CULTURA (REMOVIDO 'university' y 'school' para permitir discotecas con esos nombres)
  'library', 'primary_school', 'secondary_school',
  
  // ❌ RELIGIÓN
  'church', 'mosque', 'synagogue', 'place_of_worship',
  
  // ❌ ADMINISTRACIÓN
  'police', 'fire_station', 'city_hall', 'courthouse',
  'embassy', 'local_government_office', 'post_office',
  
  // ❌ OTROS SERVICIOS
  'parking', 'laundry', 'travel_agency', 'lawyer',
  'locksmith', 'plumber', 'electrician', 'painter',
  'roofing_contractor', 'moving_company',
];

// 🔍 TIPOS GENÉRICOS (IGNORAR EN VALIDACIÓN)
// Estos tipos son demasiado genéricos y no aportan información útil
export const TIPOS_GENERICOS = [
  'establishment',
  'point_of_interest',
  'premise',
  'tourist_attraction',
];

// 🎓 TIPOS AMBIGUOS (Pueden ser discotecas con nombres engañosos)
// Estos tipos NO deben rechazar automáticamente si hay tipos válidos presentes
export const TIPOS_AMBIGUOS = [
  'university',  // "Facultad Sdc" es una discoteca
  'school',      // Algunas discotecas tienen nombres educativos
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
 * Verificar si un local tiene tipos prohibidos (excluyendo ambiguos)
 */
export function tieneAlgunTipoProhibido(types: string[]): boolean {
  if (!types || types.length === 0) {
    return false;
  }
  
  // Filtrar tipos genéricos y ambiguos antes de verificar prohibidos
  const tiposRelevantes = types.filter(t => 
    !TIPOS_GENERICOS.includes(t) && !TIPOS_AMBIGUOS.includes(t)
  );
  
  return tiposRelevantes.some(type => TIPOS_PROHIBIDOS.includes(type));
}

/**
 * Obtener tipos prohibidos encontrados (excluyendo ambiguos)
 */
export function obtenerTiposProhibidos(types: string[]): string[] {
  if (!types || types.length === 0) {
    return [];
  }
  
  const tiposRelevantes = types.filter(t => 
    !TIPOS_GENERICOS.includes(t) && !TIPOS_AMBIGUOS.includes(t)
  );
  return tiposRelevantes.filter(t => TIPOS_PROHIBIDOS.includes(t));
}

/**
 * Validar si un local es válido para BarLive
 * NUEVA LÓGICA MEJORADA:
 * 1. Si tiene tipos válidos (bar, night_club, restaurant, etc.) → ACEPTAR
 * 2. Si tiene tipos prohibidos SIN tipos válidos → RECHAZAR
 * 3. Si tiene tipos ambiguos (university, store) pero también tipos válidos → ACEPTAR
 * 4. Verificar business_status (solo OPERATIONAL o sin estado)
 */
export function esLocalValidoParaBarlive(types: string[]): {
  valido: boolean;
  razon?: string;
} {
  console.log('[Type Validation] ========================================');
  console.log('[Type Validation] Checking types:', types);
  
  // Filtrar tipos genéricos
  const tiposRelevantes = types.filter(t => !TIPOS_GENERICOS.includes(t));
  console.log('[Type Validation] Relevant types (after filtering generic):', tiposRelevantes);
  
  // 1️⃣ PASO 1: Verificar si tiene al menos un tipo válido
  const tiposValidosEncontrados = tiposRelevantes.filter(t => TIPOS_VALIDOS.includes(t));
  const tieneTipoValido = tiposValidosEncontrados.length > 0;
  
  console.log('[Type Validation] Valid types found:', tiposValidosEncontrados);
  
  // 2️⃣ PASO 2: Si tiene tipos válidos, ACEPTAR (ignorar tipos ambiguos)
  if (tieneTipoValido) {
    console.log('[Type Validation] ✅ Has valid types, ACCEPTING');
    console.log('[Type Validation] ========================================');
    return { valido: true };
  }
  
  // 3️⃣ PASO 3: Si NO tiene tipos válidos, verificar si tiene tipos prohibidos
  const tiposProhibidosEncontrados = obtenerTiposProhibidos(types);
  
  if (tiposProhibidosEncontrados.length > 0) {
    console.log('[Type Validation] ❌ No valid types and has prohibited types:', tiposProhibidosEncontrados);
    console.log('[Type Validation] ========================================');
    return {
      valido: false,
      razon: `Tipo prohibido: ${tiposProhibidosEncontrados.join(', ')}`,
    };
  }
  
  // 4️⃣ PASO 4: Si NO tiene tipos válidos NI prohibidos, verificar tipos ambiguos
  const tiposAmbiguosEncontrados = tiposRelevantes.filter(t => TIPOS_AMBIGUOS.includes(t));
  
  if (tiposAmbiguosEncontrados.length > 0) {
    console.log('[Type Validation] ⚠️ Only ambiguous types found:', tiposAmbiguosEncontrados);
    console.log('[Type Validation] ❌ Rejecting because no valid types present');
    console.log('[Type Validation] ========================================');
    return {
      valido: false,
      razon: 'No tiene tipos válidos para BarLive',
    };
  }
  
  // 5️⃣ PASO 5: Si no tiene ningún tipo relevante, rechazar
  console.log('[Type Validation] ❌ No valid types found');
  console.log('[Type Validation] ========================================');
  return {
    valido: false,
    razon: 'No tiene tipos válidos para BarLive',
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
    'santiago de compostela', 'santiago', 'compostela',
  ];
  
  return provinciasEspanolas.some(provincia => direccionLower.includes(provincia));
}

/**
 * Validar estado del negocio
 * Solo acepta locales OPERATIONAL o sin estado definido
 * Rechaza CLOSED_PERMANENTLY y CLOSED_TEMPORARILY
 */
export function esEstadoNegocioValido(businessStatus?: string): {
  valido: boolean;
  razon?: string;
} {
  if (!businessStatus) {
    // Si no hay estado, asumimos que está operativo
    return { valido: true };
  }
  
  // Solo aceptar locales operativos o abiertos
  if (businessStatus === 'OPERATIONAL' || businessStatus === 'OPEN') {
    return { valido: true };
  }
  
  // Rechazar locales cerrados permanentemente
  if (businessStatus === 'CLOSED_PERMANENTLY') {
    return {
      valido: false,
      razon: 'Local cerrado permanentemente',
    };
  }
  
  // Rechazar locales cerrados temporalmente (pueden estar en renovación, etc.)
  if (businessStatus === 'CLOSED_TEMPORARILY') {
    return {
      valido: false,
      razon: 'Local cerrado temporalmente',
    };
  }
  
  // Cualquier otro estado desconocido, rechazar por precaución
  return {
    valido: false,
    razon: `Estado de negocio desconocido: ${businessStatus}`,
  };
}

/**
 * Validación completa de un local
 * Aplica todos los filtros de validación en orden:
 * 1. Validar tipos (debe tener al menos un tipo válido)
 * 2. Validar ubicación (debe estar en España)
 * 3. Validar estado del negocio (debe estar operativo)
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
