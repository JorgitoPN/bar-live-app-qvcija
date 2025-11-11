
import { GooglePlaceDetails } from '@/types';

/**
 * 🧠 MAPEO INTELIGENTE DE TIPOS (SISTEMA BARLIVE)
 * Google Types → BarLive Types
 * ACTUALIZADO: Incluye nuevos tipos de Google Places API
 * MEJORADO: Análisis de nombre para detectar discotecas y salas
 */
const GOOGLE_TO_BARLIVE_TYPES: Record<string, string[]> = {
  // Bares
  'bar': ['bar'],
  'pub': ['pub', 'bar'],
  'tavern': ['bar'],
  'tapas_bar': ['bar', 'tapas'],
  'sports_bar': ['bar'],
  
  // Discotecas y clubs nocturnos
  'night_club': ['discoteca'],
  'dance_club': ['discoteca'],
  'disco': ['discoteca'],
  'nightclub': ['discoteca'],
  'dance_hall': ['discoteca'],
  
  // Cafeterías
  'cafe': ['cafe'],
  'coffee_shop': ['cafe'],
  'bakery': ['cafe'],
  
  // Restaurantes
  'restaurant': ['restaurante'],
  'tapas_restaurant': ['restaurante', 'tapas'],
  'meal_takeaway': ['restaurante'],
  'meal_delivery': ['restaurante'],
  'fast_food': ['restaurante'],
  'food': ['restaurante'],
  'pizza_restaurant': ['restaurante'],
  'hamburger_restaurant': ['restaurante'],
  
  // Coctelerías
  'cocktail_bar': ['cocteleria', 'bar'],
  'wine_bar': ['cocteleria', 'bar'],
  'lounge': ['lounge'],
  'cocktail_lounge': ['lounge', 'cocteleria'],
  
  // Cervecerías
  'brewery': ['pub', 'cerveceria'],
  'beer_garden': ['terraza', 'pub'],
  
  // Bodegas y vinotecas
  'winery': ['vinoteca'],
  
  // Terrazas y rooftops
  'rooftop_bar': ['rooftop', 'bar'],
  
  // Entretenimiento
  'concert_hall': ['discoteca', 'sala_conciertos'],
  'music_venue': ['discoteca', 'sala_conciertos'],
  'amphitheatre': ['sala_conciertos'],
};

/**
 * 🎯 PALABRAS CLAVE EN NOMBRES QUE INDICAN TIPO DE LOCAL
 * MEJORADO: Lista ampliada con nombres reales de discotecas gallegas
 */
const NOMBRE_KEYWORDS: Record<string, string[]> = {
  'discoteca': [
    // Palabras genéricas
    'disco', 'discoteca', 'club', 'night', 'dance', 'dancing',
    // Nombres específicos de discotecas gallegas y españolas
    'sdc', 'facultad', 'sala', 'malavida', 'malatesta', 'filomatic',
    'garufa', 'josfer', 'blaster', 'tsunami', 'feelings', 'jumanji',
    'eros', 'duplex', 'onda', 'sky', 'turini', 'capital', 'mardi gras',
    'lolita', 'lowe', 'ruido', 'concha', 'khatarsis', 'tonos',
    // Palabras relacionadas
    'nightclub', 'nightlife', 'nocturno', 'nocturna',
  ],
  'bar': ['bar', 'pub', 'tavern', 'cerveceria', 'brewery', 'taberna'],
  'cocteleria': ['cocktail', 'coctel', 'lounge', 'mixology', 'cocteles'],
  'cafe': ['cafe', 'coffee', 'cafeteria', 'cafetería'],
  'restaurante': ['restaurant', 'restaurante', 'bistro', 'grill', 'gastro'],
  'sala_conciertos': ['sala', 'concert', 'concierto', 'music', 'musica', 'live', 'vivo'],
};

/**
 * Mapear tipos de Google Places a tipos de BarLive
 * MEJORADO: Analiza también el nombre del local para detectar discotecas y salas
 */
export function mapGoogleTypesToBarlive(googleTypes: string[], nombreLocal?: string): string[] {
  console.log('[Mapping] ========================================');
  console.log('[Mapping] Google types:', googleTypes);
  console.log('[Mapping] Local name:', nombreLocal);
  
  const barliveTypes = new Set<string>();
  
  // 1️⃣ PASO 1: Analizar el nombre del local para detectar palabras clave
  if (nombreLocal) {
    const nombreLower = nombreLocal.toLowerCase();
    
    for (const [tipo, keywords] of Object.entries(NOMBRE_KEYWORDS)) {
      for (const keyword of keywords) {
        if (nombreLower.includes(keyword)) {
          barliveTypes.add(tipo);
          console.log(`[Mapping] Name keyword detected: "${keyword}" → ${tipo}`);
          break;
        }
      }
    }
  }
  
  // 2️⃣ PASO 2: Mapear cada tipo de Google
  for (const googleType of googleTypes) {
    const mapped = GOOGLE_TO_BARLIVE_TYPES[googleType];
    if (mapped) {
      mapped.forEach(tipo => barliveTypes.add(tipo));
      console.log(`[Mapping] ${googleType} → ${mapped.join(', ')}`);
    }
  }
  
  // 3️⃣ PASO 3: Si no se mapeó nada, usar tipo genérico basado en los tipos de Google
  if (barliveTypes.size === 0) {
    console.log('[Mapping] No direct mapping found, using fallback...');
    
    // Buscar palabras clave en los tipos
    const tiposStr = googleTypes.join(' ').toLowerCase();
    
    if (tiposStr.includes('night') || tiposStr.includes('club') || tiposStr.includes('disco')) {
      barliveTypes.add('discoteca');
      console.log('[Mapping] Fallback: detected nightclub/disco');
    } else if (tiposStr.includes('restaurant') || tiposStr.includes('food')) {
      barliveTypes.add('restaurante');
      console.log('[Mapping] Fallback: detected restaurant');
    } else if (tiposStr.includes('cafe') || tiposStr.includes('coffee')) {
      barliveTypes.add('cafe');
      console.log('[Mapping] Fallback: detected cafe');
    } else if (tiposStr.includes('bar') || tiposStr.includes('pub')) {
      barliveTypes.add('bar');
      console.log('[Mapping] Fallback: detected bar');
    } else {
      // Tipo por defecto si no se puede determinar
      barliveTypes.add('bar');
      console.log('[Mapping] Fallback: using default type "bar"');
    }
  }
  
  const result = Array.from(barliveTypes);
  console.log('[Mapping] BarLive types:', result);
  console.log('[Mapping] ========================================');
  
  return result;
}

/**
 * 🧠 CATEGORIZACIÓN POR HORARIOS (SISTEMA BARLIVE)
 * Analiza los horarios de apertura y cierre para categorizar el local
 * 
 * REGLAS:
 * - Apertura 22:00+ y cierre 04:00–07:00 → ['discoteca','lounge']
 * - Apertura 08:00–14:00 y cierre ≤03:00 → ['restaurante','bar']
 * - Apertura 05:00–10:00 y cierre ≤02:00 → ['cafe','bar']
 * - Si no hay horarios, conservar tipos base de Google
 */
export function categorizarPorHorarios(
  openingHours: GooglePlaceDetails['opening_hours'],
  tiposBase: string[]
): string[] {
  if (!openingHours || !openingHours.weekday_text) {
    return tiposBase;
  }
  
  console.log('[Categorization] ========================================');
  console.log('[Categorization] Analyzing schedules for intelligent categorization...');
  console.log('[Categorization] Base types:', tiposBase);
  
  // Calcular promedios de apertura y cierre
  const { aperturaMedia, cierreMedia } = calcularPromediosHorarios(openingHours.weekday_text);
  
  console.log(`[Categorization] Average opening: ${formatHora(aperturaMedia)}`);
  console.log(`[Categorization] Average closing: ${formatHora(cierreMedia)}`);
  
  const tiposFinales = [...tiposBase];
  
  // 1️⃣ DISCOTECAS: Apertura 22:00+ y cierre 04:00–07:00
  if ((aperturaMedia >= 22 || aperturaMedia === 0) && cierreMedia >= 4 && cierreMedia <= 7) {
    console.log('[Categorization] 📋 Pattern detected: DISCOTECA');
    console.log('[Categorization] → Opens late night (≥22h or midnight), closes dawn (4-7h)');
    
    if (!tiposFinales.includes('discoteca')) {
      tiposFinales.push('discoteca');
    }
    if (!tiposFinales.includes('lounge')) {
      tiposFinales.push('lounge');
    }
  }
  
  // 2️⃣ RESTAURANTES: Apertura 08:00–14:00 y cierre ≤03:00
  else if (aperturaMedia >= 8 && aperturaMedia <= 14 && cierreMedia <= 3) {
    console.log('[Categorization] 📋 Pattern detected: RESTAURANTE');
    console.log('[Categorization] → Opens mid-morning (8-14h), closes early night (≤3h)');
    
    if (!tiposFinales.includes('restaurante')) {
      tiposFinales.push('restaurante');
    }
    // Mantener 'bar' si ya lo tiene
    if (!tiposFinales.includes('bar') && tiposFinales.length === 1) {
      tiposFinales.push('bar');
    }
  }
  
  // 3️⃣ CAFÉS: Apertura 05:00–10:00 y cierre ≤02:00
  else if (aperturaMedia >= 5 && aperturaMedia <= 10 && cierreMedia <= 2) {
    console.log('[Categorization] 📋 Pattern detected: CAFÉ');
    console.log('[Categorization] → Opens early (5-10h), closes early (≤2h)');
    
    if (!tiposFinales.includes('cafe')) {
      tiposFinales.push('cafe');
    }
    // Si solo tiene 'bar', reemplazar por 'cafe'
    if (tiposFinales.length === 1 && tiposFinales[0] === 'bar') {
      tiposFinales[0] = 'cafe';
    }
  }
  
  console.log('[Categorization] Final types:', tiposFinales);
  console.log('[Categorization] ========================================');
  
  return tiposFinales;
}

/**
 * 💰 MAPEAR NIVEL DE PRECIO
 * Convierte el nivel de precio de Google (1-4) a formato BarLive (€, €€, €€€, €€€€)
 */
export function mapearNivelPrecio(priceLevel?: number): string {
  if (!priceLevel) return '';
  
  const mapping: Record<number, string> = {
    1: '€',
    2: '€€',
    3: '€€€',
    4: '€€€€',
  };
  
  return mapping[priceLevel] || '';
}

/**
 * Calcular promedios de horarios de apertura y cierre
 */
function calcularPromediosHorarios(weekdayText: string[]): {
  aperturaMedia: number;
  cierreMedia: number;
} {
  const horarios: { apertura: number; cierre: number }[] = [];
  
  for (const dayText of weekdayText) {
    const parsed = parseHorarioDia(dayText);
    if (parsed) {
      horarios.push(parsed);
    }
  }
  
  if (horarios.length === 0) {
    return { aperturaMedia: 12, cierreMedia: 23 }; // Valores por defecto
  }
  
  const sumaApertura = horarios.reduce((sum, h) => sum + h.apertura, 0);
  const sumaCierre = horarios.reduce((sum, h) => sum + h.cierre, 0);
  
  return {
    aperturaMedia: sumaApertura / horarios.length,
    cierreMedia: sumaCierre / horarios.length,
  };
}

/**
 * Parsear horario de un día para extraer hora de apertura y cierre
 * Ejemplos:
 * - "lunes: 09:00–23:00" → { apertura: 9, cierre: 23 }
 * - "viernes: 18:00–03:00" → { apertura: 18, cierre: 3 }
 * - "Monday: 9:00 AM – 11:00 PM" → { apertura: 9, cierre: 23 }
 */
function parseHorarioDia(dayText: string): { apertura: number; cierre: number } | null {
  // Verificar si está cerrado
  if (dayText.toLowerCase().includes('cerrado') || dayText.toLowerCase().includes('closed')) {
    return null;
  }
  
  // Formato 24h: 09:00–23:00
  const pattern24h = /(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/;
  const match24h = dayText.match(pattern24h);
  
  if (match24h) {
    const apertura = parseInt(match24h[1]);
    let cierre = parseInt(match24h[3]);
    
    // Si cierra después de medianoche (ej: 02:00), mantener el valor bajo
    // para indicar madrugada
    if (cierre < apertura && cierre < 12) {
      // Es madrugada del día siguiente
    }
    
    return { apertura, cierre };
  }
  
  // Formato 12h: 9:00 AM – 11:00 PM
  const pattern12h = /(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i;
  const match12h = dayText.match(pattern12h);
  
  if (match12h) {
    let apertura = parseInt(match12h[1]);
    const aperturaPeriod = match12h[3].toUpperCase();
    let cierre = parseInt(match12h[4]);
    const cierrePeriod = match12h[6].toUpperCase();
    
    // Convertir a formato 24h
    if (aperturaPeriod === 'PM' && apertura !== 12) apertura += 12;
    if (aperturaPeriod === 'AM' && apertura === 12) apertura = 0;
    
    if (cierrePeriod === 'PM' && cierre !== 12) cierre += 12;
    if (cierrePeriod === 'AM' && cierre === 12) cierre = 0;
    
    return { apertura, cierre };
  }
  
  return null;
}

/**
 * Formatear hora para logging
 */
function formatHora(hora: number): string {
  const h = Math.floor(hora);
  const m = Math.round((hora - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
