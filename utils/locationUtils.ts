
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 LOCATION UTILS v444.0 - SIMPLIFIED & STABLE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ✅ CRITICAL FIX v444.0:
 * - REMOVED background tracking (was causing iOS crashes in Expo Go)
 * - REMOVED complex subscription system (was interfering with normal flow)
 * - REMOVED aggressive preloading (was competing with normal data loading)
 * - SIMPLIFIED to basic location caching only
 * - RESULT: Stable, fast, no crashes
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import * as Location from 'expo-location';
import { Platform } from 'react-native';

// ✅ SIMPLE LOCATION CACHE
interface LocationCache {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number | null;
}

let locationCache: LocationCache | null = null;
const CACHE_DURATION = 60000; // 60 seconds
const LOCATION_TIMEOUT = 5000; // 5 seconds

/**
 * ✅ v444.0: Get user location with simple caching
 * 
 * SIMPLIFIED STRATEGY:
 * 1. Check cache first (instant if < 60s old)
 * 2. Try last known location (fast, no GPS wait)
 * 3. Get current position with timeout
 * 4. Use Low accuracy on Android for speed
 * 
 * @returns Promise<Location.LocationObject | null>
 */
export async function getOptimizedUserLocation(): Promise<Location.LocationObject | null> {
  try {
    console.log('[LocationUtils v444.0] 🎯 Fetching location');
    
    // ✅ STEP 1: Check cache (instant response)
    if (locationCache && Date.now() - locationCache.timestamp < CACHE_DURATION) {
      const age = Math.round((Date.now() - locationCache.timestamp) / 1000);
      console.log('[LocationUtils v444.0] ⚡ Using cached location (age:', age, 's)');
      return {
        coords: {
          latitude: locationCache.latitude,
          longitude: locationCache.longitude,
          altitude: null,
          accuracy: locationCache.accuracy,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: locationCache.timestamp,
      } as Location.LocationObject;
    }
    
    // ✅ STEP 2: Check permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('[LocationUtils v444.0] ⚠️ Location permission denied');
      return null;
    }
    
    // ✅ STEP 3: Try last known location first (FAST)
    try {
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 300000, // Accept up to 5 minutes old
        requiredAccuracy: 2000, // Accept up to 2km accuracy
      });
      
      if (lastKnown) {
        console.log('[LocationUtils v444.0] ⚡ Using last known location');
        
        // Cache it
        locationCache = {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
          timestamp: Date.now(),
          accuracy: lastKnown.coords.accuracy,
        };
        
        return lastKnown;
      }
    } catch (error) {
      console.log('[LocationUtils v444.0] ⚠️ Last known location not available');
    }
    
    // ✅ STEP 4: Get current position with timeout
    console.log('[LocationUtils v444.0] 📍 Fetching current location');
    
    const locationPromise = Location.getCurrentPositionAsync({
      accuracy: Platform.OS === 'android' 
        ? Location.Accuracy.Low // Android: Low for speed
        : Location.Accuracy.Balanced, // iOS: Balanced
      maximumAge: 30000, // Accept cached up to 30s
      timeout: LOCATION_TIMEOUT,
    });
    
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.log('[LocationUtils v444.0] ⏱️ Location timeout (5s)');
        resolve(null);
      }, LOCATION_TIMEOUT);
    });
    
    const location = await Promise.race([locationPromise, timeoutPromise]);
    
    if (location) {
      console.log('[LocationUtils v444.0] ✅ Location obtained');
      
      // Cache it
      locationCache = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: Date.now(),
        accuracy: location.coords.accuracy,
      };
      
      return location;
    }
    
    console.log('[LocationUtils v444.0] ❌ Failed to get location');
    return null;
    
  } catch (error: any) {
    console.error('[LocationUtils v444.0] ❌ Error:', error?.message);
    return null;
  }
}

/**
 * ✅ v444.0: Clear location cache
 */
export function clearLocationCache(): void {
  console.log('[LocationUtils v444.0] 🧹 Clearing cache');
  locationCache = null;
}

/**
 * ✅ v444.0: Get cached location
 */
export function getCachedLocation(): LocationCache | null {
  if (locationCache && Date.now() - locationCache.timestamp < CACHE_DURATION) {
    return locationCache;
  }
  return null;
}

// ✅ v444.0: REMOVED - No longer needed
export function subscribeToLocationUpdates() {
  return () => {};
}

export async function startBackgroundLocationTracking() {
  return false;
}

export function isBackgroundTrackingEnabled() {
  return false;
}

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
