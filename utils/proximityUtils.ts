
/**
 * Utility functions for proximity detection in Virtual Room
 */

import { calcularDistancia } from './locationUtils';

export interface UserLocation {
  userId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface ProximityResult {
  userId: string;
  distance: number;
  isNearby: boolean;
}

const PROXIMITY_THRESHOLD_METERS = 5;

/**
 * Calculate proximity between current user and other users
 */
export function calculateProximity(
  currentLocation: { latitude: number; longitude: number },
  userLocations: UserLocation[]
): ProximityResult[] {
  return userLocations.map(userLoc => {
    const distance = calcularDistancia(
      currentLocation.latitude,
      currentLocation.longitude,
      userLoc.latitude,
      userLoc.longitude
    );

    return {
      userId: userLoc.userId,
      distance,
      isNearby: distance <= PROXIMITY_THRESHOLD_METERS,
    };
  });
}

/**
 * Filter users within proximity threshold
 */
export function getNearbyUsers(
  currentLocation: { latitude: number; longitude: number },
  userLocations: UserLocation[]
): string[] {
  const proximityResults = calculateProximity(currentLocation, userLocations);
  return proximityResults
    .filter(result => result.isNearby)
    .map(result => result.userId);
}

/**
 * Get distance to specific user
 */
export function getDistanceToUser(
  currentLocation: { latitude: number; longitude: number },
  userLocation: { latitude: number; longitude: number }
): number {
  return calcularDistancia(
    currentLocation.latitude,
    currentLocation.longitude,
    userLocation.latitude,
    userLocation.longitude
  );
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1) {
    return '<1m';
  } else if (meters < 1000) {
    return `${Math.round(meters)}m`;
  } else {
    return `${(meters / 1000).toFixed(1)}km`;
  }
}

/**
 * Check if location is stale (older than 5 minutes)
 */
export function isLocationStale(timestamp: string): boolean {
  const locationTime = new Date(timestamp).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  return (now - locationTime) > fiveMinutes;
}
