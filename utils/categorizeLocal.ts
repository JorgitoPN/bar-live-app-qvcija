
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
    // Determine specific nightlife category based on closing time
    if (latestClose >= 1620 || latestClose <= 360) { // After 3 AM or before 6 AM
      // Very late closing → Discoteca, Pub, or Coctelería
      categories.push('pub', 'cocteleria', 'discoteca');
    } else if (latestClose > 1560 || latestClose <= 120) { // After 2 AM (02:00) or before 2 AM next day
      // Closes after 2:00 AM → Always add Pub category
      // This allows venues to be both Bar and Pub, or Discoteca and Pub
      categories.push('pub', 'bar', 'lounge');
    } else {
      // Moderate late closing (midnight to 2 AM) → Bar, Lounge
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
 * Check if a venue should have the PUB category based on closing time
 * Returns true if the venue closes after 2:00 AM (02:00)
 */
export function shouldHavePubCategory(horarios_completos: Record<string, string[]> | null): boolean {
  if (!horarios_completos || Object.keys(horarios_completos).length === 0) {
    return false;
  }

  const { latestClose } = analyzeSchedule(horarios_completos);
  
  if (latestClose === null) {
    return false;
  }

  // Check if closes after 2:00 AM (120 minutes = 02:00)
  // latestClose > 1560 means after 2:00 AM same day (26:00 = 1560 minutes)
  // latestClose <= 120 means before 2:00 AM next day (00:00 - 02:00)
  return latestClose > 1560 || latestClose <= 120;
}

/**
 * Add PUB category to existing categories if venue closes after 2:00 AM
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
