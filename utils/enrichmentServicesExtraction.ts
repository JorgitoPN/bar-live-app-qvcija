
import { GooglePlaceDetails } from '@/types';

/**
 * 🍽️ SERVICIOS DISPONIBLES COMPLETOS
 * Extrae todos los servicios disponibles desde Google Places
 */
export interface ServiciosDisponibles {
  // 🍺 BEBIDAS
  cerveza: boolean;
  vino: boolean;
  licores_fuertes: boolean;
  bebidas_alcoholicas: boolean;
  bar_completo: boolean;
  cocteles: boolean;
  cafe: boolean;
  te: boolean;
  bebidas_sin_alcohol: boolean;

  // 🍽️ COMIDAS
  desayuno: boolean;
  brunch: boolean;
  almuerzo: boolean;
  merienda: boolean;
  cena: boolean;
  postres: boolean;
  menu_infantil: boolean;
  menu_dia: boolean;
  comida_tradicional: boolean;
  comida_internacional: boolean;
  para_llevar: boolean;
  entrega_domicilio: boolean;
  catering: boolean;
  comer_alli: boolean;
  servicio_mesa: boolean;
  reservas: boolean;
  reserva_online: boolean;
  terraza_exterior: boolean;
  asientos_exterior: boolean;

  // 🌐 FACILIDADES
  wifi_gratis: boolean;
  aparcamiento: boolean;
  accesible_silla_ruedas: boolean;
  entrada_accesible: boolean;
  aseo_accesible: boolean;
  aseos: boolean;
  aire_acondicionado: boolean;
  calefaccion: boolean;
  pet_friendly: boolean;
  cambiador_bebes: boolean;
  zona_infantil: boolean;
  enchufes_disponibles: boolean;

  // 💳 PAGOS
  pago_tarjetas: boolean;
  pago_efectivo: boolean;
  pago_movil_nfc: boolean;
  vales_restaurante: boolean;
  factura_disponible: boolean;

  // 🥗 OPCIONES DIETÉTICAS
  comida_vegetariana: boolean;
  opciones_veganas: boolean;
  sin_gluten: boolean;
  opciones_saludables: boolean;
  comida_halal: boolean;
  comida_kosher: boolean;
  sin_lactosa: boolean;

  // 🪑 AMBIENTE Y CONFORT
  ambiente_acogedor: boolean;
  ambiente_familiar: boolean;
  ambiente_romantico: boolean;
  ambiente_elegante: boolean;
  ambiente_moderno: boolean;
  ambiente_animado: boolean;
  ruido_moderado: boolean;
  dress_code_informal: boolean;

  // 🎵 ENTRETENIMIENTO
  musica_vivo: boolean;
  deportes_tv: boolean;
  karaoke: boolean;
  dj: boolean;
  eventos_en_vivo: boolean;
}

/**
 * Extraer servicios disponibles completos desde Google Places
 */
export function extraerServiciosDisponiblesCompletos(
  placeDetails: GooglePlaceDetails,
  barliveTypes: string[]
): ServiciosDisponibles {
  console.log('[Services] Extracting complete services...');
  
  const types = placeDetails.types || [];
  const reviews = placeDetails.reviews || [];
  const reviewsText = reviews.map(r => r.text?.toLowerCase() || '').join(' ');
  const editorialText = placeDetails.editorial_summary?.overview?.toLowerCase() || '';
  const allText = reviewsText + ' ' + editorialText;

  // Inicializar todos los servicios en false
  const servicios: ServiciosDisponibles = {
    // 🍺 BEBIDAS
    cerveza: false,
    vino: false,
    licores_fuertes: false,
    bebidas_alcoholicas: false,
    bar_completo: false,
    cocteles: false,
    cafe: false,
    te: false,
    bebidas_sin_alcohol: false,

    // 🍽️ COMIDAS
    desayuno: false,
    brunch: false,
    almuerzo: false,
    merienda: false,
    cena: false,
    postres: false,
    menu_infantil: false,
    menu_dia: false,
    comida_tradicional: false,
    comida_internacional: false,
    para_llevar: false,
    entrega_domicilio: false,
    catering: false,
    comer_alli: false,
    servicio_mesa: false,
    reservas: false,
    reserva_online: false,
    terraza_exterior: false,
    asientos_exterior: false,

    // 🌐 FACILIDADES
    wifi_gratis: false,
    aparcamiento: false,
    accesible_silla_ruedas: false,
    entrada_accesible: false,
    aseo_accesible: false,
    aseos: false,
    aire_acondicionado: false,
    calefaccion: false,
    pet_friendly: false,
    cambiador_bebes: false,
    zona_infantil: false,
    enchufes_disponibles: false,

    // 💳 PAGOS
    pago_tarjetas: false,
    pago_efectivo: false,
    pago_movil_nfc: false,
    vales_restaurante: false,
    factura_disponible: false,

    // 🥗 OPCIONES DIETÉTICAS
    comida_vegetariana: false,
    opciones_veganas: false,
    sin_gluten: false,
    opciones_saludables: false,
    comida_halal: false,
    comida_kosher: false,
    sin_lactosa: false,

    // 🪑 AMBIENTE Y CONFORT
    ambiente_acogedor: false,
    ambiente_familiar: false,
    ambiente_romantico: false,
    ambiente_elegante: false,
    ambiente_moderno: false,
    ambiente_animado: false,
    ruido_moderado: false,
    dress_code_informal: false,

    // 🎵 ENTRETENIMIENTO
    musica_vivo: false,
    deportes_tv: false,
    karaoke: false,
    dj: false,
    eventos_en_vivo: false,
  };

  // 🍺 BEBIDAS - Detectar desde tipos y reviews
  if (types.includes('bar') || types.includes('pub') || types.includes('night_club') || 
      barliveTypes.includes('bar') || barliveTypes.includes('pub') || barliveTypes.includes('discoteca')) {
    servicios.cerveza = true;
    servicios.bebidas_alcoholicas = true;
    servicios.bar_completo = true;
  }

  if (types.includes('cocktail_bar') || types.includes('wine_bar') || barliveTypes.includes('cocteleria')) {
    servicios.cocteles = true;
    servicios.vino = true;
    servicios.licores_fuertes = true;
    servicios.bebidas_alcoholicas = true;
    servicios.bar_completo = true;
  }

  if (types.includes('cafe') || types.includes('coffee_shop') || barliveTypes.includes('cafe')) {
    servicios.cafe = true;
    servicios.te = true;
    servicios.bebidas_sin_alcohol = true;
  }

  // 🍽️ COMIDAS - Detectar desde tipos
  if (types.includes('restaurant') || types.includes('meal_takeaway') || types.includes('meal_delivery') ||
      barliveTypes.includes('restaurante')) {
    servicios.almuerzo = true;
    servicios.cena = true;
    servicios.postres = true;
    servicios.comer_alli = true;
    servicios.servicio_mesa = true;
    servicios.comida_tradicional = true;
  }

  if (types.includes('cafe') || barliveTypes.includes('cafe')) {
    servicios.desayuno = true;
    servicios.brunch = true;
  }

  if (types.includes('meal_takeaway')) {
    servicios.para_llevar = true;
  }

  if (types.includes('meal_delivery')) {
    servicios.entrega_domicilio = true;
  }

  // Detectar terraza desde reviews
  if (allText.includes('terraza') || allText.includes('terrace') || allText.includes('outdoor')) {
    servicios.terraza_exterior = true;
    servicios.asientos_exterior = true;
  }

  // Detectar reservas desde reviews
  if (allText.includes('reserva') || allText.includes('reservation') || allText.includes('booking')) {
    servicios.reservas = true;
  }

  // 🌐 FACILIDADES - Detectar desde reviews
  if (allText.includes('wifi') || allText.includes('wi-fi')) {
    servicios.wifi_gratis = true;
  }

  if (allText.includes('parking') || allText.includes('aparcamiento') || allText.includes('estacionamiento')) {
    servicios.aparcamiento = true;
  }

  if (allText.includes('accesible') || allText.includes('accessible') || allText.includes('wheelchair')) {
    servicios.accesible_silla_ruedas = true;
    servicios.entrada_accesible = true;
    servicios.aseo_accesible = true;
  }

  // Aseos - asumir true para restaurantes y bares
  if (types.includes('restaurant') || types.includes('bar') || types.includes('cafe')) {
    servicios.aseos = true;
  }

  // Detectar mascotas
  if (allText.includes('pet friendly') || allText.includes('dog friendly') || allText.includes('mascotas')) {
    servicios.pet_friendly = true;
  }

  // 💳 PAGOS - Asumir tarjetas para la mayoría de locales
  servicios.pago_tarjetas = true;
  servicios.pago_efectivo = true;

  if (allText.includes('apple pay') || allText.includes('google pay') || allText.includes('contactless')) {
    servicios.pago_movil_nfc = true;
  }

  // 🥗 OPCIONES DIETÉTICAS - Detectar desde reviews
  if (allText.includes('vegetarian') || allText.includes('vegetariano')) {
    servicios.comida_vegetariana = true;
  }

  if (allText.includes('vegan') || allText.includes('vegano')) {
    servicios.opciones_veganas = true;
  }

  if (allText.includes('gluten free') || allText.includes('sin gluten') || allText.includes('celiac')) {
    servicios.sin_gluten = true;
  }

  if (allText.includes('healthy') || allText.includes('saludable') || allText.includes('light')) {
    servicios.opciones_saludables = true;
  }

  if (allText.includes('halal')) {
    servicios.comida_halal = true;
  }

  if (allText.includes('kosher')) {
    servicios.comida_kosher = true;
  }

  if (allText.includes('lactose free') || allText.includes('sin lactosa')) {
    servicios.sin_lactosa = true;
  }

  // 🪑 AMBIENTE Y CONFORT - Detectar desde reviews
  if (allText.includes('acogedor') || allText.includes('cozy') || allText.includes('warm')) {
    servicios.ambiente_acogedor = true;
  }

  if (allText.includes('familiar') || allText.includes('family') || allText.includes('niños') || allText.includes('kids')) {
    servicios.ambiente_familiar = true;
    servicios.menu_infantil = true;
  }

  if (allText.includes('romántico') || allText.includes('romantic') || allText.includes('intimate')) {
    servicios.ambiente_romantico = true;
  }

  if (allText.includes('elegante') || allText.includes('elegant') || allText.includes('sophisticated')) {
    servicios.ambiente_elegante = true;
  }

  if (allText.includes('moderno') || allText.includes('modern') || allText.includes('contemporary')) {
    servicios.ambiente_moderno = true;
  }

  if (allText.includes('animado') || allText.includes('lively') || allText.includes('vibrant')) {
    servicios.ambiente_animado = true;
  }

  // Dress code - asumir informal por defecto
  servicios.dress_code_informal = true;

  // 🎵 ENTRETENIMIENTO - Detectar desde reviews y tipos
  if (allText.includes('live music') || allText.includes('música en vivo') || allText.includes('concierto')) {
    servicios.musica_vivo = true;
    servicios.eventos_en_vivo = true;
  }

  if (allText.includes('tv') || allText.includes('deportes') || allText.includes('sports') || allText.includes('fútbol')) {
    servicios.deportes_tv = true;
  }

  if (allText.includes('karaoke')) {
    servicios.karaoke = true;
  }

  if (allText.includes('dj') || types.includes('night_club') || barliveTypes.includes('discoteca')) {
    servicios.dj = true;
  }

  console.log('[Services] Complete services extracted');
  return servicios;
}

/**
 * 🍴 TIPOS DE COCINA
 * Extraer tipos de cocina desde Google Places
 */
export function extraerTiposCocina(
  placeDetails: GooglePlaceDetails
): string[] {
  console.log('[Cuisine] Extracting cuisine types...');
  
  const types = placeDetails.types || [];
  const reviews = placeDetails.reviews || [];
  const reviewsText = reviews.map(r => r.text?.toLowerCase() || '').join(' ');
  const editorialText = placeDetails.editorial_summary?.overview?.toLowerCase() || '';
  const allText = reviewsText + ' ' + editorialText;

  const tiposCocina: Set<string> = new Set();

  // Mapeo de palabras clave a tipos de cocina
  const cocinaKeywords: Record<string, string[]> = {
    'Mediterránea': ['mediterranean', 'mediterránea', 'mediterráneo'],
    'Española': ['spanish', 'española', 'español', 'spain'],
    'Tapas': ['tapas', 'tapa'],
    'Italiana': ['italian', 'italiana', 'italiano', 'pizza', 'pasta'],
    'Japonesa': ['japanese', 'japonesa', 'sushi', 'ramen'],
    'China': ['chinese', 'china', 'chino'],
    'Mexicana': ['mexican', 'mexicana', 'tacos', 'burritos'],
    'India': ['indian', 'india', 'curry'],
    'Francesa': ['french', 'francesa', 'francés'],
    'Americana': ['american', 'americana', 'burger', 'hamburguesa'],
    'Asiática': ['asian', 'asiática', 'asiático'],
    'Vegetariana': ['vegetarian', 'vegetariana', 'veggie'],
    'Vegana': ['vegan', 'vegana'],
    'Fusión': ['fusion', 'fusión'],
    'Tradicional': ['traditional', 'tradicional'],
    'Contemporánea': ['contemporary', 'contemporánea', 'modern'],
    'Casera': ['homemade', 'casera', 'home cooking'],
    'Mariscos': ['seafood', 'mariscos', 'pescado', 'fish'],
    'Carnes': ['meat', 'carnes', 'steak', 'asador', 'grill'],
    'Internacional': ['international', 'internacional']
  };

  // Buscar palabras clave en el texto
  for (const [cocina, keywords] of Object.entries(cocinaKeywords)) {
    for (const keyword of keywords) {
      if (allText.includes(keyword)) {
        tiposCocina.add(cocina);
        break;
      }
    }
  }

  // Si es restaurante y no se detectó ninguna cocina, añadir "Tradicional"
  if (tiposCocina.size === 0 && types.includes('restaurant')) {
    tiposCocina.add('Tradicional');
  }

  const result = Array.from(tiposCocina);
  console.log('[Cuisine] Cuisine types extracted:', result);
  return result;
}

/**
 * 🎭 AMBIENTE COMPLETO
 * Extraer ambiente detectado desde Google Places
 */
export interface AmbienteCompleto {
  acogedor: boolean;
  animado: boolean;
  informal: boolean;
  elegante: boolean;
  romantico: boolean;
  moderno: boolean;
  tranquilo: boolean;
  familiar: boolean;
  juvenil: boolean;
  de_moda: boolean;
  tematico: boolean;
  ruidoso: boolean;
}

export function extraerAmbienteCompleto(
  placeDetails: GooglePlaceDetails,
  barliveTypes: string[]
): AmbienteCompleto {
  console.log('[Ambiente] Extracting complete ambiente...');
  
  const reviews = placeDetails.reviews || [];
  const reviewsText = reviews.map(r => r.text?.toLowerCase() || '').join(' ');
  const editorialText = placeDetails.editorial_summary?.overview?.toLowerCase() || '';
  const allText = reviewsText + ' ' + editorialText;

  const ambiente: AmbienteCompleto = {
    acogedor: false,
    animado: false,
    informal: false,
    elegante: false,
    romantico: false,
    moderno: false,
    tranquilo: false,
    familiar: false,
    juvenil: false,
    de_moda: false,
    tematico: false,
    ruidoso: false,
  };

  // Detectar ambiente desde reviews
  if (allText.includes('acogedor') || allText.includes('cozy') || allText.includes('warm') || allText.includes('welcoming')) {
    ambiente.acogedor = true;
  }

  if (allText.includes('animado') || allText.includes('lively') || allText.includes('vibrant') || allText.includes('energetic')) {
    ambiente.animado = true;
  }

  if (allText.includes('informal') || allText.includes('casual') || allText.includes('relaxed')) {
    ambiente.informal = true;
  }

  if (allText.includes('elegante') || allText.includes('elegant') || allText.includes('sophisticated') || allText.includes('upscale')) {
    ambiente.elegante = true;
  }

  if (allText.includes('romántico') || allText.includes('romantic') || allText.includes('intimate')) {
    ambiente.romantico = true;
  }

  if (allText.includes('moderno') || allText.includes('modern') || allText.includes('contemporary') || allText.includes('trendy')) {
    ambiente.moderno = true;
  }

  if (allText.includes('tranquilo') || allText.includes('quiet') || allText.includes('peaceful') || allText.includes('calm')) {
    ambiente.tranquilo = true;
  }

  if (allText.includes('familiar') || allText.includes('family') || allText.includes('niños') || allText.includes('kids')) {
    ambiente.familiar = true;
  }

  if (allText.includes('juvenil') || allText.includes('young') || allText.includes('youthful')) {
    ambiente.juvenil = true;
  }

  if (allText.includes('de moda') || allText.includes('trendy') || allText.includes('hip') || allText.includes('fashionable')) {
    ambiente.de_moda = true;
  }

  if (allText.includes('temático') || allText.includes('themed') || allText.includes('theme')) {
    ambiente.tematico = true;
  }

  if (allText.includes('ruidoso') || allText.includes('noisy') || allText.includes('loud')) {
    ambiente.ruidoso = true;
  }

  console.log('[Ambiente] Complete ambiente extracted');
  return ambiente;
}

/**
 * 👥 CLIENTELA TÍPICA
 * Detectar clientela típica del local
 */
export interface Clientela {
  grupos: boolean;
  turistas: boolean;
  familias: boolean;
  ninos_bienvenidos: boolean;
  parejas: boolean;
  locales: boolean;
  estudiantes: boolean;
  lgtbi_friendly: boolean;
}

export function extraerClientela(
  placeDetails: GooglePlaceDetails,
  barliveTypes: string[]
): Clientela {
  console.log('[Clientela] Extracting clientela...');
  
  const reviews = placeDetails.reviews || [];
  const reviewsText = reviews.map(r => r.text?.toLowerCase() || '').join(' ');
  const editorialText = placeDetails.editorial_summary?.overview?.toLowerCase() || '';
  const allText = reviewsText + ' ' + editorialText;

  const clientela: Clientela = {
    grupos: false,
    turistas: false,
    familias: false,
    ninos_bienvenidos: false,
    parejas: false,
    locales: false,
    estudiantes: false,
    lgtbi_friendly: false,
  };

  // Detectar clientela desde reviews
  if (allText.includes('grupos') || allText.includes('group') || allText.includes('friends')) {
    clientela.grupos = true;
  }

  if (allText.includes('turistas') || allText.includes('tourist') || allText.includes('travelers')) {
    clientela.turistas = true;
  }

  if (allText.includes('familias') || allText.includes('family') || allText.includes('niños') || allText.includes('kids') || allText.includes('children')) {
    clientela.familias = true;
    clientela.ninos_bienvenidos = true;
  }

  if (allText.includes('parejas') || allText.includes('couples') || allText.includes('romantic')) {
    clientela.parejas = true;
  }

  if (allText.includes('locales') || allText.includes('locals') || allText.includes('residents')) {
    clientela.locales = true;
  }

  if (allText.includes('estudiantes') || allText.includes('students') || allText.includes('university')) {
    clientela.estudiantes = true;
  }

  if (allText.includes('lgtbi') || allText.includes('lgbtq') || allText.includes('gay friendly') || allText.includes('inclusive')) {
    clientela.lgtbi_friendly = true;
  }

  console.log('[Clientela] Clientela extracted');
  return clientela;
}

/**
 * 💳 MÉTODOS DE PAGO COMPLETOS
 * Extraer métodos de pago desde Google Places
 */
export interface MetodosPagoCompletos {
  efectivo: boolean;
  tarjetas_credito: boolean;
  tarjetas_debito: boolean;
  pago_movil: boolean;
  american_express: boolean;
  mastercard: boolean;
  visa: boolean;
  bizum: boolean;
}

export function extraerMetodosPagoCompletos(
  placeDetails: GooglePlaceDetails
): MetodosPagoCompletos {
  console.log('[Payment] Extracting payment methods...');
  
  const reviews = placeDetails.reviews || [];
  const reviewsText = reviews.map(r => r.text?.toLowerCase() || '').join(' ');
  const allText = reviewsText;

  const metodosPago: MetodosPagoCompletos = {
    efectivo: true, // Asumir efectivo por defecto
    tarjetas_credito: true, // Asumir tarjetas por defecto
    tarjetas_debito: true,
    pago_movil: false,
    american_express: false,
    mastercard: false,
    visa: false,
    bizum: false,
  };

  // Detectar métodos de pago desde reviews
  if (allText.includes('apple pay') || allText.includes('google pay') || allText.includes('contactless') || allText.includes('nfc')) {
    metodosPago.pago_movil = true;
  }

  if (allText.includes('american express') || allText.includes('amex')) {
    metodosPago.american_express = true;
  }

  if (allText.includes('mastercard')) {
    metodosPago.mastercard = true;
  }

  if (allText.includes('visa')) {
    metodosPago.visa = true;
  }

  if (allText.includes('bizum')) {
    metodosPago.bizum = true;
  }

  console.log('[Payment] Payment methods extracted');
  return metodosPago;
}

/**
 * 🧠 ANÁLISIS DE REVIEWS
 * Analizar reviews de Google Places
 */
export interface AnalisisReviews {
  palabras_clave_detectadas: string[];
  sentimiento_general: string;
  puntuacion_media_reviews: number;
  volumen_reviews: number;
  idioma_predominante: string;
  resumen_automatico: string;
}

export function extraerAnalisisReviews(
  placeDetails: GooglePlaceDetails
): AnalisisReviews {
  console.log('[Reviews] Analyzing reviews...');
  
  const reviews = placeDetails.reviews || [];
  const rating = placeDetails.rating || 0;
  const totalReviews = placeDetails.user_ratings_total || 0;

  // Extraer palabras clave más comunes
  const palabrasClave: string[] = [];
  const reviewsText = reviews.map(r => r.text?.toLowerCase() || '').join(' ');
  
  // Palabras clave comunes a buscar
  const keywords = [
    'acogedor', 'auténtico', 'buena atención', 'excelente', 'delicioso',
    'ambiente', 'servicio', 'comida', 'precio', 'ubicación', 'terraza',
    'recomendable', 'calidad', 'limpio', 'rápido', 'amable'
  ];

  for (const keyword of keywords) {
    if (reviewsText.includes(keyword)) {
      palabrasClave.push(keyword);
    }
  }

  // Determinar sentimiento general
  let sentimiento = 'neutral';
  if (rating >= 4.5) {
    sentimiento = 'muy positivo';
  } else if (rating >= 4.0) {
    sentimiento = 'positivo';
  } else if (rating >= 3.0) {
    sentimiento = 'neutral';
  } else if (rating >= 2.0) {
    sentimiento = 'negativo';
  } else {
    sentimiento = 'muy negativo';
  }

  // Generar resumen automático
  let resumen = 'Local sin reseñas suficientes.';
  if (totalReviews > 0) {
    if (rating >= 4.5) {
      resumen = 'Los clientes destacan la excelente calidad del servicio y la experiencia general.';
    } else if (rating >= 4.0) {
      resumen = 'Los usuarios valoran positivamente este local, destacando su buena relación calidad-precio.';
    } else if (rating >= 3.0) {
      resumen = 'Las opiniones son variadas, con aspectos positivos y áreas de mejora.';
    } else {
      resumen = 'Las reseñas indican que hay aspectos importantes que necesitan mejorar.';
    }
  }

  const analisis: AnalisisReviews = {
    palabras_clave_detectadas: palabrasClave.slice(0, 10),
    sentimiento_general: sentimiento,
    puntuacion_media_reviews: rating,
    volumen_reviews: totalReviews,
    idioma_predominante: 'es',
    resumen_automatico: resumen,
  };

  console.log('[Reviews] Reviews analyzed');
  return analisis;
}

/**
 * 🎵 MÚSICA PRINCIPAL
 * Detectar el tipo de música principal del local
 */
export function extraerMusicaPrincipal(
  placeDetails: GooglePlaceDetails,
  barliveTypes: string[]
): string {
  console.log('[Music] Extracting main music type...');
  
  const reviews = placeDetails.reviews || [];
  const reviewsText = reviews.map(r => r.text?.toLowerCase() || '').join(' ');
  const editorialText = placeDetails.editorial_summary?.overview?.toLowerCase() || '';
  const allText = reviewsText + ' ' + editorialText;

  // Detectar música en vivo
  if (allText.includes('live music') || allText.includes('música en vivo') || allText.includes('concierto')) {
    console.log('[Music] Main music: en_vivo');
    return 'en_vivo';
  }

  // Detectar DJ
  if (allText.includes('dj') || barliveTypes.includes('discoteca')) {
    console.log('[Music] Main music: dj');
    return 'dj';
  }

  // Detectar música electrónica
  if (allText.includes('electronic') || allText.includes('electrónica') || allText.includes('techno') || allText.includes('house')) {
    console.log('[Music] Main music: electronica');
    return 'electronica';
  }

  // Detectar rock
  if (allText.includes('rock')) {
    console.log('[Music] Main music: rock');
    return 'rock';
  }

  // Detectar jazz
  if (allText.includes('jazz')) {
    console.log('[Music] Main music: jazz');
    return 'jazz';
  }

  // Detectar latina
  if (allText.includes('latina') || allText.includes('reggaeton') || allText.includes('salsa')) {
    console.log('[Music] Main music: latina');
    return 'latina';
  }

  // Por defecto: ambiental
  console.log('[Music] Main music: ambiental (default)');
  return 'ambiental';
}
