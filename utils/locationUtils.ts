
/**
 * Utility functions for location and distance calculations
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calcularDistancia(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatearDistancia(distanciaKm: number): string {
  if (distanciaKm < 1) {
    return `${Math.round(distanciaKm * 1000)} m`;
  }
  return `${distanciaKm.toFixed(1)} km`;
}

/**
 * Calculate distance from user location to a local
 */
export function calcularDistanciaDesdeUsuario(
  userLat: number | null,
  userLon: number | null,
  localLat: number,
  localLon: number
): number | null {
  if (!userLat || !userLon) {
    return null;
  }
  
  return calcularDistancia(userLat, userLon, localLat, localLon);
}
