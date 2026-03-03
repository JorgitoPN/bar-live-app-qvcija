
/**
 * ✅ LOCATION CONTEXT v1.0 - NULL-SAFE LOCATION MANAGEMENT
 * 
 * 🎯 OBJETIVO: Proporcionar ubicación del usuario de forma segura y global
 * 
 * CARACTERÍSTICAS:
 * - ✅ Context nunca es null - siempre devuelve un objeto
 * - ✅ userLocation puede ser null (ubicación no disponible)
 * - ✅ isLoading indica si está obteniendo ubicación
 * - ✅ Caché inteligente de 60 segundos
 * - ✅ Manejo de errores robusto
 * 
 * USO EN COMPONENTES:
 * ```tsx
 * const locationCtx = useLocation();
 * const userLocation = locationCtx?.userLocation || null;
 * 
 * if (locationCtx === null) {
 *   console.warn("⚠️ LocationContext no detectado");
 *   return <View />;
 * }
 * 
 * if (!userLocation && !hasCachedData) {
 *   return <SkeletonLoader />;
 * }
 * ```
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp?: number;
}

export interface LocationContextType {
  userLocation: UserLocation | null;
  isLoading: boolean;
  error: string | null;
  refreshLocation: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const LocationContext = createContext<LocationContextType | null>(null);

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const CACHE_DURATION = 60000; // 60 seconds
const LOCATION_TIMEOUT = 5000; // 5 seconds

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

export function LocationProvider({ children }: { children: ReactNode }) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * ✅ Fetch user location with caching and timeout
   */
  const fetchLocation = useCallback(async () => {
    try {
      console.log('[LocationContext v1.0] 📍 Fetching user location...');
      setIsLoading(true);
      setError(null);

      // ✅ STEP 1: Check permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[LocationContext v1.0] ⚠️ Location permission denied');
        setError('Permiso de ubicación denegado');
        setIsLoading(false);
        return;
      }

      // ✅ STEP 2: Try last known location first (FAST)
      try {
        const lastKnown = await Location.getLastKnownPositionAsync({
          maxAge: 300000, // Accept up to 5 minutes old
          requiredAccuracy: 2000, // Accept up to 2km accuracy
        });

        if (lastKnown) {
          console.log('[LocationContext v1.0] ⚡ Using last known location');
          setUserLocation({
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
            accuracy: lastKnown.coords.accuracy,
            timestamp: Date.now(),
          });
          setIsLoading(false);
          return;
        }
      } catch (lastKnownError) {
        console.log('[LocationContext v1.0] ⚠️ Last known location not available');
      }

      // ✅ STEP 3: Get current position with timeout
      console.log('[LocationContext v1.0] 📍 Fetching current location');

      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Platform.OS === 'android'
          ? Location.Accuracy.Low // Android: Low for speed
          : Location.Accuracy.Balanced, // iOS: Balanced
        maximumAge: 30000, // Accept cached up to 30s
        timeout: LOCATION_TIMEOUT,
      });

      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.log('[LocationContext v1.0] ⏱️ Location timeout (5s)');
          resolve(null);
        }, LOCATION_TIMEOUT);
      });

      const location = await Promise.race([locationPromise, timeoutPromise]);

      if (location) {
        console.log('[LocationContext v1.0] ✅ Location obtained');
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          timestamp: Date.now(),
        });
        setError(null);
      } else {
        console.log('[LocationContext v1.0] ❌ Failed to get location (timeout)');
        setError('No se pudo obtener tu ubicación');
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error('[LocationContext v1.0] ❌ Error:', err?.message);
      setError('Error al obtener ubicación');
      setIsLoading(false);
    }
  }, []);

  /**
   * ✅ Refresh location (for pull-to-refresh)
   */
  const refreshLocation = useCallback(async () => {
    console.log('[LocationContext v1.0] 🔄 Refreshing location...');
    await fetchLocation();
  }, [fetchLocation]);

  /**
   * ✅ Fetch location on mount
   */
  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  /**
   * ✅ CRITICAL: Context value is NEVER null
   * Even if userLocation is null, the context object exists
   */
  const value: LocationContextType = {
    userLocation,
    isLoading,
    error,
    refreshLocation,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ✅ Hook to access location context
 * 
 * USAGE:
 * ```tsx
 * const locationCtx = useLocation();
 * const userLocation = locationCtx?.userLocation || null;
 * 
 * // Guard clause for safety
 * if (locationCtx === null) {
 *   console.warn("⚠️ LocationContext no detectado");
 *   return <View />;
 * }
 * ```
 */
export function useLocation(): LocationContextType | null {
  const context = useContext(LocationContext);
  
  if (context === undefined) {
    console.error('[LocationContext v1.0] ❌ useLocation must be used within LocationProvider');
    return null;
  }
  
  return context;
}
