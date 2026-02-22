
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 LOCATION UTILS v3.0 - BACKGROUND TRACKING & INTELLIGENT PRELOADING
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ✅ BACKGROUND LOCATION STRATEGY:
 * 1. **Continuous Background Tracking**: Updates location every 2 minutes
 * 2. **Smart Movement Detection**: Only triggers data reload on significant movement (>500m)
 * 3. **Aggressive Caching**: 60-second cache for instant responses
 * 4. **Battery Optimization**: Balanced accuracy + smart intervals
 * 5. **Automatic Data Preloading**: Preloads locales when location changes
 * 
 * ✅ PERFORMANCE IMPROVEMENTS:
 * - Location always ready (background updates)
 * - Data preloaded before user navigates to screens
 * - Zero loading time on Explorar/Mapa screens
 * - Intelligent cache invalidation on movement
 * - Battery-efficient with smart intervals
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import * as Location from 'expo-location';
import { Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ LOCATION CACHE - Extended for background tracking
interface LocationCache {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number | null;
}

interface LocationSubscriber {
  id: string;
  callback: (location: LocationCache) => void;
}

let locationCache: LocationCache | null = null;
let lastSignificantLocation: LocationCache | null = null;
const CACHE_DURATION = 60000; // 60 seconds cache (extended for background)
const LOCATION_TIMEOUT = 10000; // 10 second timeout
const SIGNIFICANT_DISTANCE = 500; // 500 meters = significant movement
const BACKGROUND_UPDATE_INTERVAL = 120000; // 2 minutes
const STORAGE_KEY = 'last_known_location_v3';

// ✅ BACKGROUND TRACKING STATE
let backgroundTaskId: Location.LocationSubscription | null = null;
let isBackgroundTrackingActive = false;
let locationSubscribers: LocationSubscriber[] = [];
let appState: AppStateStatus = AppState.currentState;

/**
 * ✅ v3.0: Load last known location from storage (instant on app start)
 */
async function loadLocationFromStorage(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const age = Date.now() - parsed.timestamp;
      
      // Accept stored location up to 10 minutes old
      if (age < 600000) {
        locationCache = parsed;
        lastSignificantLocation = parsed;
        console.log('[LocationUtils v3.0] ⚡ Loaded location from storage (age:', Math.round(age / 1000), 's)');
      }
    }
  } catch (error) {
    console.log('[LocationUtils v3.0] ⚠️ Failed to load location from storage');
  }
}

/**
 * ✅ v3.0: Save location to storage for persistence
 */
async function saveLocationToStorage(location: LocationCache): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch (error) {
    console.log('[LocationUtils v3.0] ⚠️ Failed to save location to storage');
  }
}

/**
 * ✅ v3.0: Calculate distance between two locations (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

/**
 * ✅ v3.0: Check if movement is significant enough to trigger data reload
 */
function isSignificantMovement(newLocation: LocationCache): boolean {
  if (!lastSignificantLocation) {
    return true;
  }
  
  const distance = calculateDistance(
    lastSignificantLocation.latitude,
    lastSignificantLocation.longitude,
    newLocation.latitude,
    newLocation.longitude
  );
  
  return distance >= SIGNIFICANT_DISTANCE;
}

/**
 * ✅ v3.0: Notify all subscribers of location change
 */
function notifySubscribers(location: LocationCache): void {
  locationSubscribers.forEach(subscriber => {
    try {
      subscriber.callback(location);
    } catch (error) {
      console.error('[LocationUtils v3.0] ❌ Subscriber callback error:', error);
    }
  });
}

/**
 * ✅ v3.0: Subscribe to location updates
 */
export function subscribeToLocationUpdates(
  id: string,
  callback: (location: LocationCache) => void
): () => void {
  console.log('[LocationUtils v3.0] 📡 New subscriber:', id);
  
  locationSubscribers.push({ id, callback });
  
  // Immediately call with current location if available
  if (locationCache) {
    callback(locationCache);
  }
  
  // Return unsubscribe function
  return () => {
    locationSubscribers = locationSubscribers.filter(sub => sub.id !== id);
    console.log('[LocationUtils v3.0] 📴 Unsubscribed:', id);
  };
}

/**
 * ✅ v3.0: Start background location tracking
 */
export async function startBackgroundLocationTracking(): Promise<boolean> {
  if (isBackgroundTrackingActive) {
    console.log('[LocationUtils v3.0] ⚠️ Background tracking already active');
    return true;
  }
  
  try {
    console.log('[LocationUtils v3.0] 🚀 Starting background location tracking');
    
    // Load last known location from storage first
    await loadLocationFromStorage();
    
    // Request permissions
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.log('[LocationUtils v3.0] ⚠️ Foreground permission denied');
      return false;
    }
    
    // ✅ CRITICAL FIX: Don't request background permissions on Android
    // Background location requires special manifest permissions and user approval
    // We'll use foreground-only tracking which is sufficient
    if (Platform.OS === 'ios') {
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.log('[LocationUtils v3.0] ⚠️ iOS background permission denied - using foreground only');
      }
    } else {
      console.log('[LocationUtils v3.0] ℹ️ Android: Using foreground-only tracking (no background permission needed)');
    }
    
    // Start watching location
    backgroundTaskId = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: BACKGROUND_UPDATE_INTERVAL, // Update every 2 minutes
        distanceInterval: SIGNIFICANT_DISTANCE, // Or when moved 500m
      },
      (location) => {
        const newLocation: LocationCache = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: Date.now(),
          accuracy: location.coords.accuracy,
        };
        
        console.log('[LocationUtils v3.0] 📍 Location update:', {
          lat: newLocation.latitude.toFixed(4),
          lng: newLocation.longitude.toFixed(4),
          accuracy: newLocation.accuracy?.toFixed(0) + 'm',
        });
        
        // Update cache
        locationCache = newLocation;
        
        // Save to storage
        saveLocationToStorage(newLocation);
        
        // Check if movement is significant
        if (isSignificantMovement(newLocation)) {
          console.log('[LocationUtils v3.0] 🚶 Significant movement detected - notifying subscribers');
          lastSignificantLocation = newLocation;
          notifySubscribers(newLocation);
        }
      }
    );
    
    isBackgroundTrackingActive = true;
    console.log('[LocationUtils v3.0] ✅ Location tracking started successfully');
    
    // Listen to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return true;
  } catch (error: any) {
    console.error('[LocationUtils v3.0] ❌ Failed to start location tracking:', error?.message);
    console.log('[LocationUtils v3.0] ℹ️ App will continue with manual location updates');
    // ✅ GRACEFUL DEGRADATION: Return true to allow app to continue
    // Location will be fetched on-demand instead of background updates
    return false;
  }
}

/**
 * ✅ v3.0: Stop background location tracking
 */
export async function stopBackgroundLocationTracking(): Promise<void> {
  if (!isBackgroundTrackingActive) {
    return;
  }
  
  try {
    console.log('[LocationUtils v3.0] 🛑 Stopping background location tracking');
    
    if (backgroundTaskId) {
      backgroundTaskId.remove();
      backgroundTaskId = null;
    }
    
    isBackgroundTrackingActive = false;
    console.log('[LocationUtils v3.0] ✅ Background tracking stopped');
  } catch (error) {
    console.error('[LocationUtils v3.0] ❌ Error stopping background tracking:', error);
  }
}

/**
 * ✅ v3.0: Handle app state changes
 */
function handleAppStateChange(nextAppState: AppStateStatus): void {
  if (appState.match(/inactive|background/) && nextAppState === 'active') {
    console.log('[LocationUtils v3.0] 📱 App came to foreground - refreshing location');
    
    // Refresh location when app comes to foreground
    getOptimizedUserLocation().then(location => {
      if (location) {
        const newLocation: LocationCache = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: Date.now(),
          accuracy: location.coords.accuracy,
        };
        
        locationCache = newLocation;
        saveLocationToStorage(newLocation);
        
        if (isSignificantMovement(newLocation)) {
          lastSignificantLocation = newLocation;
          notifySubscribers(newLocation);
        }
      }
    });
  }
  
  appState = nextAppState;
}

/**
 * ✅ v3.0: Get user location with background tracking support
 * 
 * STRATEGY:
 * 1. Check cache first (instant response if < 60s old)
 * 2. Try last known location (fast, no GPS wait)
 * 3. Get current position with timeout protection
 * 4. Use Balanced accuracy for speed (not High accuracy)
 * 5. Start background tracking if not already active
 * 
 * @returns Promise<Location.LocationObject | null>
 */
export async function getOptimizedUserLocation(): Promise<Location.LocationObject | null> {
  try {
    console.log('[LocationUtils v3.0] 🎯 Starting optimized location fetch');
    
    // ✅ STEP 1: Check cache (instant response)
    if (locationCache && Date.now() - locationCache.timestamp < CACHE_DURATION) {
      console.log('[LocationUtils v3.0] ⚡ Using cached location (age:', Math.round((Date.now() - locationCache.timestamp) / 1000), 's)');
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
      console.log('[LocationUtils v3.0] ⚠️ Location permission denied');
      return null;
    }
    
    // ✅ STEP 3: Try last known location first (FAST - no GPS wait)
    try {
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 120000, // Accept location up to 2 minutes old
        requiredAccuracy: 1000, // Accept accuracy up to 1km
      });
      
      if (lastKnown) {
        console.log('[LocationUtils v3.0] ⚡ Using last known location (fast fallback)');
        
        // Cache it
        locationCache = {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
          timestamp: Date.now(),
          accuracy: lastKnown.coords.accuracy,
        };
        
        saveLocationToStorage(locationCache);
        
        // Start background tracking if not active
        if (!isBackgroundTrackingActive) {
          startBackgroundLocationTracking();
        }
        
        return lastKnown;
      }
    } catch (error) {
      console.log('[LocationUtils v3.0] ⚠️ Last known location not available');
    }
    
    // ✅ STEP 4: Get current position with timeout and optimized accuracy
    console.log('[LocationUtils v3.0] 📍 Fetching current location with timeout protection');
    
    const locationPromise = Location.getCurrentPositionAsync({
      accuracy: Platform.OS === 'android' 
        ? Location.Accuracy.Balanced // ✅ ANDROID: Balanced for speed (100m accuracy, 1-3s response)
        : Location.Accuracy.Balanced, // iOS: Balanced is also good
      maximumAge: 10000, // Accept cached location up to 10s old
      timeout: LOCATION_TIMEOUT, // 10 second timeout
    });
    
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.log('[LocationUtils v3.0] ⏱️ Location fetch timeout (10s)');
        resolve(null);
      }, LOCATION_TIMEOUT);
    });
    
    const location = await Promise.race([locationPromise, timeoutPromise]);
    
    if (location) {
      console.log('[LocationUtils v3.0] ✅ Current location obtained');
      
      // Cache it
      locationCache = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: Date.now(),
        accuracy: location.coords.accuracy,
      };
      
      saveLocationToStorage(locationCache);
      
      // Start background tracking if not active
      if (!isBackgroundTrackingActive) {
        startBackgroundLocationTracking();
      }
      
      return location;
    }
    
    console.log('[LocationUtils v3.0] ❌ Failed to get location');
    return null;
    
  } catch (error: any) {
    console.error('[LocationUtils v3.0] ❌ Error getting location:', error?.message);
    return null;
  }
}

/**
 * ✅ v3.0: Clear location cache (call when user manually refreshes)
 */
export function clearLocationCache(): void {
  console.log('[LocationUtils v3.0] 🧹 Clearing location cache');
  locationCache = null;
  lastSignificantLocation = null;
}

/**
 * ✅ v3.0: Get cached location without fetching (instant)
 */
export function getCachedLocation(): LocationCache | null {
  if (locationCache && Date.now() - locationCache.timestamp < CACHE_DURATION) {
    return locationCache;
  }
  return null;
}

/**
 * ✅ v3.0: Check if background tracking is active
 */
export function isBackgroundTrackingEnabled(): boolean {
  return isBackgroundTrackingActive;
}

/**
 * ✅ v3.0: Get last significant location (for data preloading)
 */
export function getLastSignificantLocation(): LocationCache | null {
  return lastSignificantLocation;
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
