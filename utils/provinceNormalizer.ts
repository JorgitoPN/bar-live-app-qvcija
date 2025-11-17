
/**
 * Province name normalizer for handling different language variations
 * Supports Spanish, Galician, Catalan, Basque, and other regional languages
 */

// Map of province variations - each array contains all known variations of a province name
export const PROVINCE_VARIATIONS: Record<string, string[]> = {
  // Galician provinces
  'A Coruña': ['A Coruña', 'La Coruña', 'Coruña', 'A Coruna', 'La Coruna', 'Coruna'],
  'Pontevedra': ['Pontevedra'],
  'Lugo': ['Lugo'],
  'Orense': ['Orense', 'Ourense'],
  
  // Catalan provinces
  'Barcelona': ['Barcelona'],
  'Gerona': ['Gerona', 'Girona'],
  'Lérida': ['Lérida', 'Lleida', 'Lerida'],
  'Tarragona': ['Tarragona'],
  
  // Basque provinces
  'Álava': ['Álava', 'Araba', 'Alava'],
  'Guipúzcoa': ['Guipúzcoa', 'Gipuzkoa', 'Guipuzcoa'],
  'Vizcaya': ['Vizcaya', 'Bizkaia'],
  
  // Valencian Community
  'Alicante': ['Alicante', 'Alacant'],
  'Castellón': ['Castellón', 'Castelló', 'Castellon'],
  'Valencia': ['Valencia', 'València'],
  
  // Balearic Islands
  'Islas Baleares': ['Islas Baleares', 'Illes Balears', 'Baleares', 'Balears'],
  
  // Rest of Spain (standard names)
  'Albacete': ['Albacete'],
  'Almería': ['Almería', 'Almeria'],
  'Asturias': ['Asturias'],
  'Ávila': ['Ávila', 'Avila'],
  'Badajoz': ['Badajoz'],
  'Burgos': ['Burgos'],
  'Cáceres': ['Cáceres', 'Caceres'],
  'Cádiz': ['Cádiz', 'Cadiz'],
  'Cantabria': ['Cantabria'],
  'Ceuta': ['Ceuta'],
  'Ciudad Real': ['Ciudad Real'],
  'Córdoba': ['Córdoba', 'Cordoba'],
  'Cuenca': ['Cuenca'],
  'Granada': ['Granada'],
  'Guadalajara': ['Guadalajara'],
  'Huelva': ['Huelva'],
  'Huesca': ['Huesca'],
  'Jaén': ['Jaén', 'Jaen'],
  'La Rioja': ['La Rioja', 'Rioja'],
  'Las Palmas': ['Las Palmas', 'Las Palmas de Gran Canaria'],
  'León': ['León', 'Leon'],
  'Madrid': ['Madrid'],
  'Málaga': ['Málaga', 'Malaga'],
  'Melilla': ['Melilla'],
  'Murcia': ['Murcia'],
  'Navarra': ['Navarra', 'Nafarroa'],
  'Palencia': ['Palencia'],
  'Salamanca': ['Salamanca'],
  'Santa Cruz de Tenerife': ['Santa Cruz de Tenerife', 'Santa Cruz', 'Tenerife'],
  'Segovia': ['Segovia'],
  'Sevilla': ['Sevilla'],
  'Soria': ['Soria'],
  'Teruel': ['Teruel'],
  'Toledo': ['Toledo'],
  'Valladolid': ['Valladolid'],
  'Zamora': ['Zamora'],
  'Zaragoza': ['Zaragoza'],
};

// Reverse map for quick lookup: variation -> canonical name
const VARIATION_TO_CANONICAL: Record<string, string> = {};
Object.entries(PROVINCE_VARIATIONS).forEach(([canonical, variations]) => {
  variations.forEach(variation => {
    VARIATION_TO_CANONICAL[normalizeString(variation)] = canonical;
  });
});

/**
 * Normalize a string by removing accents and converting to lowercase
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
}

/**
 * Get the canonical province name from any variation
 * @param provinceName - Any variation of a province name
 * @returns The canonical province name, or the original if not found
 */
export function getCanonicalProvinceName(provinceName: string): string {
  const normalized = normalizeString(provinceName);
  return VARIATION_TO_CANONICAL[normalized] || provinceName;
}

/**
 * Check if two province names match (considering all variations)
 * @param province1 - First province name
 * @param province2 - Second province name
 * @returns true if they represent the same province
 */
export function provincesMatch(province1: string, province2: string): boolean {
  const canonical1 = getCanonicalProvinceName(province1);
  const canonical2 = getCanonicalProvinceName(province2);
  return canonical1 === canonical2;
}

/**
 * Get all variations of a province name
 * @param provinceName - Any variation of a province name
 * @returns Array of all known variations
 */
export function getProvinceVariations(provinceName: string): string[] {
  const canonical = getCanonicalProvinceName(provinceName);
  return PROVINCE_VARIATIONS[canonical] || [provinceName];
}

/**
 * Build a SQL filter condition for province matching that handles all variations
 * @param columnName - The SQL column name to filter
 * @param provinceName - The province name to match
 * @returns SQL condition string for use in Supabase queries
 */
export function buildProvinceSQLFilter(columnName: string, provinceName: string): string {
  const variations = getProvinceVariations(provinceName);
  
  // Build an OR condition for all variations (case-insensitive)
  const conditions = variations.map(variation => 
    `LOWER(${columnName}) = LOWER('${variation.replace(/'/g, "''")}')`
  );
  
  return `(${conditions.join(' OR ')})`;
}

/**
 * Filter an array of items by province, handling all variations
 * @param items - Array of items with a provincia property
 * @param selectedProvincia - The selected province name
 * @returns Filtered array
 */
export function filterByProvincia<T extends { provincia?: string | null }>(
  items: T[],
  selectedProvincia: string | null
): T[] {
  if (!selectedProvincia) {
    return items;
  }

  const canonical = getCanonicalProvinceName(selectedProvincia);
  
  return items.filter(item => {
    if (!item.provincia) return false;
    const itemCanonical = getCanonicalProvinceName(item.provincia);
    return itemCanonical === canonical;
  });
}

/**
 * Complete list of all Spanish provinces (canonical names)
 */
export const PROVINCIAS = Object.keys(PROVINCE_VARIATIONS).sort();
