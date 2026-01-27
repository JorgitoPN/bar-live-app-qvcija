
// Category icon mapping for local badges
export const getCategoryIcon = (category: string): string => {
  const iconMap: Record<string, string> = {
    'cafe': '☕',
    'cafés': '☕',
    'restaurante': '🍽️',
    'restaurantes': '🍽️',
    'bar': '🍷',
    'bares': '🍷',
    'pub': '🍺',
    'pubs': '🍺',
    'cocteleria': '🍹',  // ✅ CHANGED: Tropical drink icon (more distinct from wine glass)
    'coctelería': '🍹',  // ✅ CHANGED: Tropical drink icon (more distinct from wine glass)
    'cocktail': '🍹',    // ✅ CHANGED: Tropical drink icon (more distinct from wine glass)
    'discoteca': '🎵',
    'discotecas': '🎵',
    'club': '🎉',
    'lounge': '🛋️',
    'terraza': '☀️',
    'rooftop': '🏢',
  };
  
  const normalizedCategory = category.toLowerCase().trim();
  return iconMap[normalizedCategory] || '📍';
};
