
import { GooglePlaceDetails } from '@/types';

/**
 * 🎭 AMBIENTE COMPLETO
 * Detectado por reseñas y etiquetas de Google
 */
export interface AmbienteCompleto {
  acogedor: boolean;
  romantico: boolean;
  elegante: boolean;
  moderno: boolean;
  de_moda: boolean;
  animado: boolean;
  juvenil: boolean;
  tranquilo: boolean;
  familiar: boolean;
  tematico: boolean;
}

/**
 * 👥 CLIENTELA TÍPICA
 * Google "Crowd attributes" y análisis de reseñas
 */
export interface ClientelaCompleta {
  grupos: boolean;
  turistas: boolean;
  familias: boolean;
  ninos_bienvenidos: boolean;
  estudiantes: boolean;
  lgtbi_friendly: boolean;
  parejas: boolean;
  locales: boolean;
}

/**
 * 💳 MÉTODOS DE PAGO
 * Fuente: ficha Google y análisis de reseñas
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
  vales_restaurante: boolean;
  factura_disponible: boolean;
}

/**
 * 🧠 ANÁLISIS DE REVIEWS
 * Google Reviews NLP
 */
export interface AnalisisReviews {
  palabras_clave_detectadas: string[];
  sentimiento_general: 'muy positivo' | 'positivo' | 'neutral' | 'negativo' | 'muy negativo';
  puntuacion_media_reviews: number;
  volumen_reviews: number;
  idioma_predominante: string;
  fuente: string[];
  palabras_destacadas_google: string[];
  resumen_automatico: string;
}

/**
 * Extraer servicios completos del local
 */
export function extraerServiciosCompletos(
  placeDetails: GooglePlaceDetails,
  barliveTypes: string[]
): Record<string, boolean> {
  console.log('[Extraction] Extracting services...');
  
  const servicios: Record<string, boolean> = {
    // Bebidas
    cerveza: false,
    vino: false,
    cocteles: false,
    cafe: false,
    
    // Comida
    comida: false,
    tapas: false,
    desayuno: false,
    almuerzo: false,
    cena: false,
    
    // Espacios
    terraza: false,
    interior: true, // Por defecto
    rooftop: false,
    jardin: false,
    
    // Servicios
    wifi_gratis: false,
    reservas: false,
    delivery: false,
    takeaway: false,
    parking: false,
    accesible: false,
    
    // Entretenimiento
    musica_en_vivo: false,
    dj: false,
    karaoke: false,
    deportes_tv: false,
    juegos: false,
  };
  
  // Inferir servicios por tipos
  if (barliveTypes.includes('bar') || barliveTypes.includes('pub')) {
    servicios.cerveza = true;
    servicios.cocteles = true;
  }
  
  if (barliveTypes.includes('vinoteca')) {
    servicios.vino = true;
  }
  
  if (barliveTypes.includes('cafe') || barliveTypes.includes('cafeteria')) {
    servicios.cafe = true;
    servicios.desayuno = true;
  }
  
  if (barliveTypes.includes('restaurante')) {
    servicios.comida = true;
    servicios.almuerzo = true;
    servicios.cena = true;
    servicios.reservas = true;
  }
  
  if (barliveTypes.includes('terraza')) {
    servicios.terraza = true;
  }
  
  if (barliveTypes.includes('discoteca')) {
    servicios.dj = true;
    servicios.cocteles = true;
  }
  
  // Inferir de tipos de Google
  if (placeDetails.types) {
    if (placeDetails.types.includes('meal_delivery')) {
      servicios.delivery = true;
    }
    if (placeDetails.types.includes('meal_takeaway')) {
      servicios.takeaway = true;
    }
    if (placeDetails.types.includes('parking')) {
      servicios.parking = true;
    }
  }
  
  // Inferir de reviews (análisis básico de texto)
  if (placeDetails.reviews) {
    const reviewsText = placeDetails.reviews
      .map(r => r.text.toLowerCase())
      .join(' ');
    
    if (reviewsText.includes('terraza') || reviewsText.includes('exterior')) {
      servicios.terraza = true;
    }
    if (reviewsText.includes('wifi') || reviewsText.includes('wi-fi')) {
      servicios.wifi_gratis = true;
    }
    if (reviewsText.includes('música en vivo') || reviewsText.includes('concierto')) {
      servicios.musica_en_vivo = true;
    }
    if (reviewsText.includes('deportes') || reviewsText.includes('fútbol')) {
      servicios.deportes_tv = true;
    }
  }
  
  console.log('[Extraction] Services extracted:', Object.keys(servicios).filter(k => servicios[k]));
  return servicios;
}

/**
 * 🎭 Extraer ambiente completo del local
 */
export function extraerAmbienteCompleto(
  placeDetails: GooglePlaceDetails,
  barliveTypes: string[]
): AmbienteCompleto {
  console.log('[Extraction] Extracting complete ambiance...');
  
  const reviews = placeDetails.reviews || [];
  const reviewsText = reviews.map(r => r.text?.toLowerCase() || '').join(' ');
  const editorialText = placeDetails.editorial_summary?.overview?.toLowerCase() || '';
  const allText = reviewsText + ' ' + editorialText;
  
  const ambiente: AmbienteCompleto = {
    acogedor: false,
    romantico: false,
    elegante: false,
    moderno: false,
    de_moda: false,
    animado: false,
    juvenil: false,
    tranquilo: false,
    familiar: false,
    tematico: false,
  };
  
  // Detectar desde reviews y descripción
  if (allText.includes('acogedor') || allText.includes('cozy') || allText.includes('warm') || allText.includes('welcoming')) {
    ambiente.acogedor = true;
  }
  
  if (allText.includes('romántico') || allText.includes('romantic') || allText.includes('intimate') || allText.includes('pareja')) {
    ambiente.romantico = true;
  }
  
  if (allText.includes('elegante') || allText.includes('elegant') || allText.includes('sophisticated') || allText.includes('chic')) {
    ambiente.elegante = true;
  }
  
  if (allText.includes('moderno') || allText.includes('modern') || allText.includes('contemporary') || allText.includes('trendy')) {
    ambiente.moderno = true;
  }
  
  if (allText.includes('de moda') || allText.includes('trendy') || allText.includes('hip') || allText.includes('popular')) {
    ambiente.de_moda = true;
  }
  
  if (allText.includes('animado') || allText.includes('lively') || allText.includes('vibrant') || allText.includes('energetic')) {
    ambiente.animado = true;
  }
  
  if (allText.includes('juvenil') || allText.includes('young') || allText.includes('estudiante') || allText.includes('joven')) {
    ambiente.juvenil = true;
  }
  
  if (allText.includes('tranquilo') || allText.includes('quiet') || allText.includes('peaceful') || allText.includes('relaxed')) {
    ambiente.tranquilo = true;
  }
  
  if (allText.includes('familiar') || allText.includes('family') || allText.includes('niños') || allText.includes('kids')) {
    ambiente.familiar = true;
  }
  
  if (allText.includes('temático') || allText.includes('themed') || allText.includes('decoración especial')) {
    ambiente.tematico = true;
  }
  
  // Inferir por tipo de local
  if (barliveTypes.includes('discoteca')) {
    ambiente.animado = true;
    ambiente.juvenil = true;
  }
  
  if (barliveTypes.includes('cafe')) {
    ambiente.tranquilo = true;
    ambiente.acogedor = true;
  }
  
  if (barliveTypes.includes('restaurante')) {
    ambiente.familiar = true;
  }
  
  if (barliveTypes.includes('cocteleria') || barliveTypes.includes('lounge')) {
    ambiente.elegante = true;
    ambiente.romantico = true;
  }
  
  // Inferir por precio
  if (placeDetails.price_level && placeDetails.price_level >= 3) {
    ambiente.elegante = true;
  }
  
  console.log('[Extraction] Ambiance extracted:', Object.keys(ambiente).filter(k => ambiente[k]));
  return ambiente;
}

/**
 * 👥 Extraer clientela completa del local
 */
export function extraerClientelaCompleta(
  placeDetails: GooglePlaceDetails
): ClientelaCompleta {
  console.log('[Extraction] Extracting complete clientele...');
  
  const reviews = placeDetails.reviews || [];
  const reviewsText = reviews.map(r => r.text?.toLowerCase() || '').join(' ');
  const editorialText = placeDetails.editorial_summary?.overview?.toLowerCase() || '';
  const allText = reviewsText + ' ' + editorialText;
  
  const clientela: ClientelaCompleta = {
    grupos: false,
    turistas: false,
    familias: false,
    ninos_bienvenidos: false,
    estudiantes: false,
    lgtbi_friendly: false,
    parejas: false,
    locales: false,
  };
  
  // Detectar desde reviews
  if (allText.includes('grupo') || allText.includes('groups') || allText.includes('amigos') || allText.includes('friends')) {
    clientela.grupos = true;
  }
  
  if (allText.includes('turista') || allText.includes('tourist') || allText.includes('visitante') || allText.includes('visitor')) {
    clientela.turistas = true;
  }
  
  if (allText.includes('familia') || allText.includes('family') || allText.includes('niños') || allText.includes('kids') || allText.includes('children')) {
    clientela.familias = true;
    clientela.ninos_bienvenidos = true;
  }
  
  if (allText.includes('estudiante') || allText.includes('student') || allText.includes('universidad') || allText.includes('university')) {
    clientela.estudiantes = true;
  }
  
  if (allText.includes('lgbtq') || allText.includes('lgbt') || allText.includes('gay friendly') || allText.includes('inclusive')) {
    clientela.lgtbi_friendly = true;
  }
  
  if (allText.includes('pareja') || allText.includes('couple') || allText.includes('romántico') || allText.includes('romantic')) {
    clientela.parejas = true;
  }
  
  if (allText.includes('local') || allText.includes('vecino') || allText.includes('neighborhood') || allText.includes('resident')) {
    clientela.locales = true;
  }
  
  // Si tiene muchas reviews, probablemente sea popular entre turistas
  if (placeDetails.user_ratings_total && placeDetails.user_ratings_total > 500) {
    clientela.turistas = true;
  }
  
  // Si tiene pocas reviews pero buena valoración, probablemente sea popular entre locales
  if (placeDetails.user_ratings_total && placeDetails.user_ratings_total < 100 && placeDetails.rating && placeDetails.rating >= 4.5) {
    clientela.locales = true;
  }
  
  console.log('[Extraction] Clientele extracted:', Object.keys(clientela).filter(k => clientela[k]));
  return clientela;
}

/**
 * 💳 Extraer métodos de pago completos
 */
export function extraerMetodosPagoCompletos(
  placeDetails: GooglePlaceDetails
): MetodosPagoCompletos {
  console.log('[Extraction] Extracting complete payment methods...');
  
  const reviews = placeDetails.reviews || [];
  const reviewsText = reviews.map(r => r.text?.toLowerCase() || '').join(' ');
  const editorialText = placeDetails.editorial_summary?.overview?.toLowerCase() || '';
  const allText = reviewsText + ' ' + editorialText;
  
  const metodosPago: MetodosPagoCompletos = {
    efectivo: true, // Por defecto en España
    tarjetas_credito: true, // Por defecto en España
    tarjetas_debito: true, // Por defecto en España
    pago_movil: false,
    american_express: false,
    mastercard: true, // Por defecto
    visa: true, // Por defecto
    bizum: false,
    vales_restaurante: false,
    factura_disponible: true, // Por defecto para negocios
  };
  
  // Detectar desde reviews
  if (allText.includes('apple pay') || allText.includes('google pay') || allText.includes('contactless') || allText.includes('nfc')) {
    metodosPago.pago_movil = true;
  }
  
  if (allText.includes('american express') || allText.includes('amex')) {
    metodosPago.american_express = true;
  }
  
  if (allText.includes('bizum')) {
    metodosPago.bizum = true;
  }
  
  if (allText.includes('vale') || allText.includes('ticket restaurant') || allText.includes('sodexo')) {
    metodosPago.vales_restaurante = true;
  }
  
  // Si menciona "solo efectivo", desactivar tarjetas
  if (allText.includes('solo efectivo') || allText.includes('cash only') || allText.includes('no cards')) {
    metodosPago.tarjetas_credito = false;
    metodosPago.tarjetas_debito = false;
    metodosPago.pago_movil = false;
    metodosPago.american_express = false;
    metodosPago.mastercard = false;
    metodosPago.visa = false;
    metodosPago.bizum = false;
  }
  
  console.log('[Extraction] Payment methods extracted:', Object.keys(metodosPago).filter(k => metodosPago[k]));
  return metodosPago;
}

/**
 * 🧠 Analizar reviews y extraer insights
 */
export function analizarReviews(
  placeDetails: GooglePlaceDetails
): AnalisisReviews {
  console.log('[Extraction] Analyzing reviews...');
  
  const reviews = placeDetails.reviews || [];
  const reviewsText = reviews.map(r => r.text?.toLowerCase() || '').join(' ');
  
  // Palabras clave comunes en español
  const palabrasClave: string[] = [];
  const keywords = [
    'acogedor', 'buen servicio', 'terraza', 'vino', 'comida', 'paella', 'tapas',
    'ambiente', 'romántico', 'precio', 'calidad', 'atención', 'personal', 'amable',
    'delicioso', 'excelente', 'recomendable', 'ubicación', 'limpio', 'rápido'
  ];
  
  keywords.forEach(keyword => {
    if (reviewsText.includes(keyword)) {
      palabrasClave.push(keyword);
    }
  });
  
  // Determinar sentimiento general basado en rating
  let sentimiento: 'muy positivo' | 'positivo' | 'neutral' | 'negativo' | 'muy negativo' = 'neutral';
  if (placeDetails.rating) {
    if (placeDetails.rating >= 4.5) {
      sentimiento = 'muy positivo';
    } else if (placeDetails.rating >= 4.0) {
      sentimiento = 'positivo';
    } else if (placeDetails.rating >= 3.0) {
      sentimiento = 'neutral';
    } else if (placeDetails.rating >= 2.0) {
      sentimiento = 'negativo';
    } else {
      sentimiento = 'muy negativo';
    }
  }
  
  // Detectar idioma predominante
  let idiomaPredominante = 'es';
  if (reviews.length > 0) {
    const idiomasDetectados: Record<string, number> = {};
    reviews.forEach(review => {
      const text = review.text.toLowerCase();
      if (text.match(/[áéíóúñ]/)) {
        idiomasDetectados['es'] = (idiomasDetectados['es'] || 0) + 1;
      } else if (text.match(/the|and|is|are/)) {
        idiomasDetectados['en'] = (idiomasDetectados['en'] || 0) + 1;
      }
    });
    
    const maxIdioma = Object.entries(idiomasDetectados).sort((a, b) => b[1] - a[1])[0];
    if (maxIdioma) {
      idiomaPredominante = maxIdioma[0];
    }
  }
  
  // Palabras destacadas de Google (las más frecuentes)
  const palabrasDestacadas: string[] = [];
  const frecuencias: Record<string, number> = {};
  const palabrasComunes = ['ambiente', 'comida', 'personal', 'precio', 'ubicación', 'servicio', 'calidad'];
  
  palabrasComunes.forEach(palabra => {
    const regex = new RegExp(palabra, 'gi');
    const matches = reviewsText.match(regex);
    if (matches && matches.length > 2) {
      palabrasDestacadas.push(palabra);
    }
  });
  
  // Generar resumen automático
  let resumen = '';
  if (placeDetails.rating && placeDetails.rating >= 4.0) {
    resumen = 'Los usuarios destacan ';
    if (palabrasClave.length > 0) {
      resumen += palabrasClave.slice(0, 3).join(', ');
    } else {
      resumen += 'la buena experiencia general';
    }
    resumen += '.';
  } else if (placeDetails.rating && placeDetails.rating >= 3.0) {
    resumen = 'Los usuarios tienen opiniones mixtas sobre este local.';
  } else {
    resumen = 'Los usuarios reportan algunas áreas de mejora.';
  }
  
  const analisis: AnalisisReviews = {
    palabras_clave_detectadas: palabrasClave.slice(0, 10),
    sentimiento_general: sentimiento,
    puntuacion_media_reviews: placeDetails.rating || 0,
    volumen_reviews: placeDetails.user_ratings_total || 0,
    idioma_predominante: idiomaPredominante,
    fuente: ['Google Maps'],
    palabras_destacadas_google: palabrasDestacadas,
    resumen_automatico: resumen,
  };
  
  console.log('[Extraction] Reviews analyzed:', analisis);
  return analisis;
}
