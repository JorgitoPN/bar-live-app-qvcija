
import { LocalCategory } from '@/types';

/**
 * Automatically categorize a venue based on its opening hours
 * Returns up to 3 categories
 */
export function autoCategorizeLocal(
  horarios_completos: Record<string, string[]> | null,
  tipos_google?: string[]
): LocalCategory[] {
  // If no schedule data, use Google types
  if (!horarios_completos || Object.keys(horarios_completos).length === 0) {
    return mapGoogleTypesToCategories(tipos_google || []);
  }

  // Analyze opening hours to determine categories
  const categories: LocalCategory[] = [];
  
  // Get typical opening and closing times
  const { earliestOpen, latestClose } = analyzeSchedule(horarios_completos);
  
  if (earliestOpen === null || latestClose === null) {
    // No valid schedule, fallback to Google types
    return mapGoogleTypesToCategories(tipos_google || []);
  }

  // CASE 1: Opens early (before 9:00) → Likely a café
  if (earliestOpen < 540) { // 9:00 AM = 540 minutes
    categories.push('cafe');
  }

  // CASE 2: Opens around lunch time (11:00-14:00) → Likely a restaurant
  if (earliestOpen >= 660 && earliestOpen <= 840) { // 11:00-14:00
    categories.push('restaurante');
  }

  // CASE 3: Closes after midnight → Nightlife venue
  if (latestClose > 1440 || latestClose < 360) { // After midnight or before 6 AM
    // ✅ UPDATED: Spanish regulations for pub categorization
    // Pubs: Close between 3:00 AM and 5:00 AM (180-300 minutes or 1620-1740 minutes)
    // Discotecas: Close between 5:00 AM and 6:00 AM (300-360 minutes or 1740-1800 minutes)
    
    if (latestClose >= 1740 || latestClose <= 360) { // After 5:00 AM (29:00) or before 6:00 AM
      // Very late closing (5:00-6:00 AM) → Discoteca
      categories.push('discoteca', 'pub', 'cocteleria');
    } else if (latestClose >= 1620 || latestClose <= 300) { // After 3:00 AM (27:00) or before 5:00 AM
      // Late closing (3:00-5:00 AM) → Pub, Coctelería
      categories.push('pub', 'cocteleria', 'bar');
    } else if (latestClose > 1560 || latestClose <= 150) { // After 2:30 AM (26:00) or before 2:30 AM
      // Moderate late closing (2:30-3:00 AM) → Pub, Bar
      categories.push('pub', 'bar', 'lounge');
    } else {
      // Closes between midnight and 2:30 AM → Bar, Lounge
      categories.push('bar', 'lounge');
    }
  }

  // CASE 4: Normal hours (closes before midnight) → Bar or Restaurant
  if (latestClose <= 1440 && latestClose >= 1320) { // 10 PM to midnight
    if (!categories.includes('restaurante')) {
      categories.push('bar');
    }
  }

  // Check for outdoor seating indicators in Google types
  if (tipos_google) {
    const hasOutdoor = tipos_google.some(type => 
      type.includes('terrace') || 
      type.includes('outdoor') ||
      type.includes('rooftop')
    );
    
    if (hasOutdoor) {
      if (tipos_google.some(t => t.includes('rooftop'))) {
        categories.push('rooftop');
      } else {
        categories.push('terraza');
      }
    }
  }

  // Remove duplicates and limit to 3
  const uniqueCategories = Array.from(new Set(categories));
  
  // If we have categories, return up to 3
  if (uniqueCategories.length > 0) {
    return uniqueCategories.slice(0, 3) as LocalCategory[];
  }

  // Fallback: Use Google types
  return mapGoogleTypesToCategories(tipos_google || []);
}

/**
 * Analyze schedule to find earliest opening and latest closing times
 */
function analyzeSchedule(horarios_completos: Record<string, string[]>): {
  earliestOpen: number | null;
  latestClose: number | null;
} {
  let earliestOpen: number | null = null;
  let latestClose: number | null = null;

  for (const dia in horarios_completos) {
    const rangos = horarios_completos[dia];
    
    if (!rangos || rangos.length === 0 || rangos[0] === 'Cerrado') {
      continue;
    }

    for (const rango of rangos) {
      if (rango === '24 horas') {
        return { earliestOpen: 0, latestClose: 1440 };
      }

      const parsed = parseTimeRange(rango);
      if (!parsed) continue;

      const { apertura, cierre } = parsed;

      // Track earliest opening
      if (earliestOpen === null || apertura < earliestOpen) {
        earliestOpen = apertura;
      }

      // Track latest closing
      // Handle overnight closing (e.g., 02:00 = 120 minutes)
      let cierreAdjusted = cierre;
      if (cierre < apertura) {
        // Overnight closing, add 24 hours
        cierreAdjusted = cierre + 1440;
      }

      if (latestClose === null || cierreAdjusted > latestClose) {
        latestClose = cierreAdjusted;
      }
    }
  }

  return { earliestOpen, latestClose };
}

/**
 * Parse a time range string (e.g., "09:00–23:00")
 */
function parseTimeRange(rango: string): { apertura: number; cierre: number } | null {
  try {
    const [inicio, fin] = rango.split('–');
    if (!inicio || !fin) return null;

    const [horaInicio, minInicio] = inicio.split(':').map(Number);
    const [horaFin, minFin] = fin.split(':').map(Number);

    // Validate
    if (
      isNaN(horaInicio) || isNaN(minInicio) ||
      isNaN(horaFin) || isNaN(minFin) ||
      horaInicio < 0 || horaInicio > 23 ||
      minInicio < 0 || minInicio > 59 ||
      horaFin < 0 || horaFin > 24 ||
      minFin < 0 || minFin > 59
    ) {
      return null;
    }

    const apertura = horaInicio * 60 + minInicio;
    const cierre = horaFin * 60 + minFin;

    return { apertura, cierre };
  } catch (error) {
    console.error('Error parsing time range:', rango, error);
    return null;
  }
}

/**
 * Map Google Place types to BarLive categories
 */
function mapGoogleTypesToCategories(tipos_google: string[]): LocalCategory[] {
  const categories: LocalCategory[] = [];

  const typeMap: Record<string, LocalCategory> = {
    cafe: 'cafe',
    coffee_shop: 'cafe',
    restaurant: 'restaurante',
    bar: 'bar',
    night_club: 'discoteca',
    pub: 'pub',
    cocktail_bar: 'cocteleria',
    lounge: 'lounge',
  };

  for (const type of tipos_google) {
    const category = typeMap[type];
    if (category && !categories.includes(category)) {
      categories.push(category);
    }
  }

  // Check for outdoor/rooftop indicators
  const hasRooftop = tipos_google.some(t => t.toLowerCase().includes('rooftop'));
  const hasTerrace = tipos_google.some(t => 
    t.toLowerCase().includes('terrace') || 
    t.toLowerCase().includes('outdoor')
  );

  if (hasRooftop && !categories.includes('rooftop')) {
    categories.push('rooftop');
  } else if (hasTerrace && !categories.includes('terraza')) {
    categories.push('terraza');
  }

  // Default fallback
  if (categories.length === 0) {
    categories.push('bar');
  }

  return categories.slice(0, 3);
}

/**
 * Get category icon name for display
 */
export function getCategoryIcon(category: LocalCategory): string {
  const iconMap: Record<LocalCategory, string> = {
    cafe: 'cup.and.saucer.fill',
    restaurante: 'fork.knife',
    bar: 'wineglass.fill',
    pub: 'mug.fill',
    cocteleria: 'wineglass',
    discoteca: 'music.note',
    terraza: 'sun.max.fill',
    rooftop: 'building.2.fill',
    lounge: 'sofa.fill',
  };
  return iconMap[category] || 'mappin.circle.fill';
}

/**
 * Get category label in Spanish
 */
export function getCategoryLabel(category: LocalCategory): string {
  const labelMap: Record<LocalCategory, string> = {
    cafe: 'Cafetería',
    restaurante: 'Restaurante',
    bar: 'Bar',
    pub: 'Pub',
    cocteleria: 'Coctelería',
    discoteca: 'Discoteca',
    terraza: 'Terraza',
    rooftop: 'Rooftop',
    lounge: 'Lounge',
  };
  return labelMap[category] || category;
}

/**
 * ✅ UPDATED: Check if a venue should have the PUB category based on Spanish regulations
 * 
 * Spanish Hospitality Closing Time Regulations:
 * - Bares y cafeterías: Close between 1:30 AM and 2:30 AM
 * - Pubs (Bares Especiales): Close between 3:00 AM and 5:00 AM (can extend to 5:00 AM on weekends)
 * - Discotecas: Close between 5:00 AM and 6:00 AM
 * 
 * Returns true if the venue closes after 2:30 AM, which qualifies it as a "Pub"
 */
export function shouldHavePubCategory(horarios_completos: Record<string, string[]> | null): boolean {
  if (!horarios_completos || Object.keys(horarios_completos).length === 0) {
    return false;
  }

  const { latestClose } = analyzeSchedule(horarios_completos);
  
  if (latestClose === null) {
    return false;
  }

  // ✅ UPDATED: Check if closes after 2:30 AM (150 minutes = 02:30)
  // This aligns with Spanish regulations where pubs close later than bars/cafeterías
  // latestClose > 1590 means after 2:30 AM same day (26:30 = 1590 minutes)
  // latestClose <= 150 means before 2:30 AM next day (00:00 - 02:30)
  return latestClose > 1590 || latestClose <= 150;
}

/**
 * Add PUB category to existing categories if venue closes after 2:30 AM
 * This ensures venues can have multiple categories like "Bar y Pub" or "Discoteca y Pub"
 */
export function addPubCategoryIfNeeded(
  currentCategories: LocalCategory[],
  horarios_completos: Record<string, string[]> | null
): LocalCategory[] {
  // If already has pub category, return as is
  if (currentCategories.includes('pub')) {
    return currentCategories;
  }

  // Check if should have pub category based on closing time
  if (shouldHavePubCategory(horarios_completos)) {
    // Add pub to the beginning of the array (higher priority)
    return ['pub', ...currentCategories].slice(0, 3) as LocalCategory[];
  }

  return currentCategories;
}
