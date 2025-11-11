
/**
 * 🎯 SISTEMA DE DISCRIMINACIÓN PARA IMPORTAR LOCALES - ACTUALIZADO BARLIVE
 * Solo importar y enriquecer locales de ocio nocturno y restauración en España
 * 
 * ACTUALIZADO: Nueva lista de tipos válidos basada en Google Places API
 * MEJORADO: Sistema de validación más inteligente que prioriza tipos válidos
 * IMPLEMENTADO: Sistema de 4 estrategias de búsqueda + validación completa
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
  
  // ❌ EDUCACIÓN Y CULTURA
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
  
  // ❌ MUSEOS Y CULTURA (no son hostelería)
  'museum', 'art_gallery', 'aquarium', 'zoo',
  'amusement_park', 'movie_theater',
];

// 🔍 TIPOS GENÉRICOS (IGNORAR EN VALIDACIÓN)
// Estos tipos son demasiado genéricos y no aportan información útil
export const TIPOS_GENERICOS = [
  'establishment',
  'point_of_interest',
  'premise',
  'tourist_attraction',
];

/**
 * 🔍 PALABRAS CLAVE EN NOMBRES QUE INDICAN OCIO NOCTURNO
 * Si el nombre contiene estas palabras, es muy probable que sea un local válido
 */
export const PALABRAS_CLAVE_OCIO_NOCTURNO = [
  // Discotecas y clubs
  'discoteca', 'disco', 'club', 'night', 'dance', 'dancing',
  'sdc', 'facultad', 'sala', 'malavida', 'malatesta', 'filomatic',
  'garufa', 'josfer', 'blaster', 'tsunami', 'feelings', 'jumanji',
  'eros', 'duplex', 'onda', 'sky', 'turini', 'capital',
  'mardi gras', 'lolita', 'lowe', 'ruido', 'concha',
  
  // Salas de conciertos y música
  'concert', 'concierto', 'music', 'musica', 'live', 'vivo',
  'stage', 'escenario', 'venue',
  
  // Bares y pubs
  'bar', 'pub', 'tavern', 'taberna', 'cerveceria', 'brewery',
  'tapas', 'coctel', 'cocktail', 'lounge', 'rooftop',
];

/**
 * ❌ PALABRAS PROHIBIDAS EN NOMBRES (solo rechazar si NO es hostelería)
 * Si el nombre contiene estas palabras Y NO tiene tipos válidos, rechazar
 */
export const PALABRAS_PROHIBIDAS_NOMBRE = [
  'fotograf', 'photo', 'gym', 'hotel', 'museo', 'museum',
  'hospital', 'clinica', 'farmacia', 'pharmacy',
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
 * Verificar si un local tiene tipos prohibidos (excluyendo genéricos)
 */
export function tieneAlgunTipoProhibido(types: string[]): boolean {
  if (!types || types.length === 0) {
    return false;
  }
  
  // Filtrar tipos genéricos antes de verificar prohibidos
  const tiposRelevantes = types.filter(t => !TIPOS_GENERICOS.includes(t));
  
  return tiposRelevantes.some(type => TIPOS_PROHIBIDOS.includes(type));
}

/**
 * Obtener tipos prohibidos encontrados (excluyendo genéricos)
 */
export function obtenerTiposProhibidos(types: string[]): string[] {
  if (!types || types.length === 0) {
    return [];
  }
  
  const tiposRelevantes = types.filter(t => !TIPOS_GENERICOS.includes(t));
  return tiposRelevantes.filter(t => TIPOS_PROHIBIDOS.includes(t));
}

/**
 * 🧠 VERIFICAR SI EL NOMBRE INDICA OCIO NOCTURNO
 * Analiza el nombre del local para detectar palabras clave de ocio nocturno
 */
export function nombreIndicaOcioNocturno(nombre: string): boolean {
  if (!nombre) return false;
  
  const nombreLower = nombre.toLowerCase();
  
  return PALABRAS_CLAVE_OCIO_NOCTURNO.some(palabra => 
    nombreLower.includes(palabra)
  );
}

/**
 * 🧠 VERIFICAR SI EL NOMBRE TIENE PALABRAS PROHIBIDAS
 * Solo rechazar si NO tiene tipos válidos de hostelería
 */
export function nombreTienePalabrasProhibidas(nombre: string): boolean {
  if (!nombre) return false;
  
  const nombreLower = nombre.toLowerCase();
  
  return PALABRAS_PROHIBIDAS_NOMBRE.some(palabra => 
    nombreLower.includes(palabra)
  );
}

/**
 * ✅ VALIDACIÓN DE TIPOS GOOGLE (SISTEMA BARLIVE)
 * NUEVA LÓGICA MEJORADA:
 * 1. Ignorar tipos genéricos (establishment, point_of_interest)
 * 2. Si tiene tipos válidos (bar, night_club, restaurant) → ACEPTAR
 * 3. Si tiene tipos prohibidos SIN tipos válidos → RECHAZAR
 * 4. Si el nombre indica ocio nocturno → ACEPTAR (ignorar tipos)
 * 5. Si no hay tipos relevantes → RECHAZAR
 */
export function validarTiposGoogle(types: string[], nombre?: string): {
  valido: boolean;
  razon?: string;
} {
  console.log('[Type Validation] ========================================');
  console.log('[Type Validation] Checking types:', types);
  console.log('[Type Validation] Name:', nombre);
  
  // 🎯 PASO 0: Verificar si el nombre indica ocio nocturno
  if (nombre && nombreIndicaOcioNocturno(nombre)) {
    console.log('[Type Validation] ✅ Name indicates nightlife venue, ACCEPTING');
    console.log('[Type Validation] ========================================');
    return { valido: true };
  }
  
  // Filtrar tipos genéricos
  const tiposRelevantes = types.filter(t => !TIPOS_GENERICOS.includes(t));
  console.log('[Type Validation] Relevant types (after filtering generic):', tiposRelevantes);
  
  // 1️⃣ PASO 1: Verificar si tiene al menos un tipo válido
  const tiposValidosEncontrados = tiposRelevantes.filter(t => TIPOS_VALIDOS.includes(t));
  const tieneTipoValido = tiposValidosEncontrados.length > 0;
  
  console.log('[Type Validation] Valid types found:', tiposValidosEncontrados);
  
  // 2️⃣ PASO 2: Si tiene tipos válidos, ACEPTAR
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
  
  // 4️⃣ PASO 4: Si no tiene tipos válidos NI prohibidos, rechazar
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
 * ✅ VALIDAR PROVINCIA CORRECTA
 * Verifica que el local esté en la provincia esperada
 */
export function estaEnProvinciaCorrecta(direccion: string, provinciaEsperada: string): boolean {
  if (!direccion || !provinciaEsperada) {
    return true; // Si no hay provincia esperada, aceptar
  }
  
  const direccionLower = direccion.toLowerCase();
  const provinciaLower = provinciaEsperada.toLowerCase();
  
  return direccionLower.includes(provinciaLower);
}

/**
 * Validar estado del negocio
 * Solo acepta locales OPERATIONAL o sin estado definido
 * Rechaza CLOSED_PERMANENTLY
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
  
  // PERMITIR locales cerrados temporalmente (pueden estar en renovación)
  if (businessStatus === 'CLOSED_TEMPORARILY') {
    console.log('[Validation] ⚠️ Local cerrado temporalmente, pero ACEPTANDO');
    return { valido: true }; // CAMBIO: Ahora aceptamos temporalmente cerrados
  }
  
  // Cualquier otro estado desconocido, rechazar por precaución
  return {
    valido: false,
    razon: `Estado de negocio desconocido: ${businessStatus}`,
  };
}

/**
 * ✅ VALIDACIÓN COMPLETA DE LOCAL (SISTEMA BARLIVE)
 * Aplica todos los filtros de validación en orden:
 * 1. Validar tipos (debe tener al menos un tipo válido O nombre indicativo)
 * 2. Validar ubicación (debe estar en España)
 * 3. Validar provincia (debe estar en la provincia correcta)
 * 4. Validar estado del negocio (debe estar operativo o temporalmente cerrado)
 * 5. Validar nombre (palabras prohibidas solo si NO es hostelería)
 */
export function validarLocalCompleto(placeDetails: {
  types?: string[];
  formatted_address?: string;
  plus_code?: { global_code?: string };
  business_status?: string;
  name?: string;
  opening_hours?: any;
}, provinciaEsperada?: string): {
  valido: boolean;
  razon?: string;
} {
  console.log('[Complete Validation] ========================================');
  console.log('[Complete Validation] Validating:', placeDetails.name);
  
  // 1. Validar tipos (ahora incluye validación de nombre)
  const validacionTipos = validarTiposGoogle(placeDetails.types || [], placeDetails.name);
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
  
  // 3. Validar provincia correcta (si se especifica)
  if (provinciaEsperada) {
    const enProvinciaCorrecta = estaEnProvinciaCorrecta(
      placeDetails.formatted_address || '',
      provinciaEsperada
    );
    if (!enProvinciaCorrecta) {
      console.log('[Complete Validation] ⚠️ Not in expected province, but ACCEPTING');
      // No rechazar, solo advertir
    }
  }
  
  // 4. Validar estado del negocio
  const validacionEstado = esEstadoNegocioValido(placeDetails.business_status);
  if (!validacionEstado.valido) {
    console.log('[Complete Validation] ❌ Failed business status validation');
    return validacionEstado;
  }
  
  // 5. Validar nombre (palabras prohibidas solo si NO tiene tipos válidos)
  if (placeDetails.name && nombreTienePalabrasProhibidas(placeDetails.name)) {
    const tieneTiposValidos = tieneAlgunTipoValido(placeDetails.types || []);
    const nombreIndicaOcio = nombreIndicaOcioNocturno(placeDetails.name);
    
    if (!tieneTiposValidos && !nombreIndicaOcio) {
      console.log('[Complete Validation] ❌ Name has prohibited words and no valid types');
      return {
        valido: false,
        razon: 'Nombre indica negocio no válido para BarLive',
      };
    }
  }
  
  console.log('[Complete Validation] ✅ All validations passed');
  console.log('[Complete Validation] ========================================');
  
  return { valido: true };
}
