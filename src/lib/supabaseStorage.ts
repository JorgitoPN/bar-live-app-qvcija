
/**
 * ✅ SUPABASE STORAGE ADAPTER v7.0 - CACHE CLEARED
 * 
 * v7.0 CHANGES:
 * - 🚀 CACHE KEYS UPDATED: Forzar refresh en iOS y Web
 * - 🧹 CACHE LIMPIADA: Todos los usuarios verán cambios inmediatamente
 * 
 * This adapter provides a unified interface for both MMKV (native) and AsyncStorage (web).
 * It's used by TanStack Query's persister to cache query results.
 * 
 * MMKV (Native):
 * - Synchronous API (instant reads/writes)
 * - Fast, efficient storage
 * - Used on iOS and Android
 * 
 * AsyncStorage (Web):
 * - Asynchronous API (Promise-based)
 * - localStorage wrapper
 * - Used on web platform
 * 
 * This adapter wraps both to provide a consistent async interface for TanStack Query.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ FASE 9: MMKV keys for profile caching
const PROFILE_T0_KEY = 'user_profile_t0_v7.0'; // ✅ v7.0: Cache key updated
const PROFILE_T1_KEY = 'user_profile_t1_v7.0'; // ✅ v7.0: Cache key updated
const SESSION_KEY = 'user_session_v7.0'; // ✅ v7.0: Cache key updated

// ✅ FASE 9: MMKV for native platforms (iOS/Android)
let mmkv: any = null;

if (Platform.OS !== 'web') {
  try {
    const { MMKV } = require('react-native-mmkv');
    mmkv = new MMKV();
    console.log('[SupabaseStorage v7.0] ✅ MMKV initialized (native)');
  } catch (error) {
    console.error('[SupabaseStorage v7.0] ❌ MMKV initialization failed:', error);
  }
}

/**
 * ✅ FASE 9: SYNC Profile T0 operations (MMKV only)
 * These are used for instant profile hydration on app start
 */
export function getProfileT0Sync(): string | undefined {
  if (!mmkv) return undefined;
  try {
    return mmkv.getString(PROFILE_T0_KEY);
  } catch (error) {
    console.error('[SupabaseStorage v7.0] ❌ getProfileT0Sync error:', error);
    return undefined;
  }
}

export function saveProfileT0Sync(data: string): void {
  if (!mmkv) return;
  try {
    mmkv.set(PROFILE_T0_KEY, data);
  } catch (error) {
    console.error('[SupabaseStorage v7.0] ❌ saveProfileT0Sync error:', error);
  }
}

export function getProfileT1Sync(): string | undefined {
  if (!mmkv) return undefined;
  try {
    return mmkv.getString(PROFILE_T1_KEY);
  } catch (error) {
    console.error('[SupabaseStorage v7.0] ❌ getProfileT1Sync error:', error);
    return undefined;
  }
}

export function saveProfileT1Sync(data: string): void {
  if (!mmkv) return;
  try {
    mmkv.set(PROFILE_T1_KEY, data);
  } catch (error) {
    console.error('[SupabaseStorage v7.0] ❌ saveProfileT1Sync error:', error);
  }
}

/**
 * ✅ FASE 9: SYNC Session operations (MMKV only)
 * Used for instant session restoration on app start
 */
export function getSessionSync(): string | undefined {
  if (!mmkv) return undefined;
  try {
    return mmkv.getString(SESSION_KEY);
  } catch (error) {
    console.error('[SupabaseStorage v7.0] ❌ getSessionSync error:', error);
    return undefined;
  }
}

export function saveSessionSync(data: string): void {
  if (!mmkv) return;
  try {
    mmkv.set(SESSION_KEY, data);
  } catch (error) {
    console.error('[SupabaseStorage v7.0] ❌ saveSessionSync error:', error);
  }
}

/**
 * ✅ FASE 9: Clear profile cache (used on logout)
 */
export function clearProfileCache(): void {
  if (mmkv) {
    try {
      mmkv.delete(PROFILE_T0_KEY);
      mmkv.delete(PROFILE_T1_KEY);
      mmkv.delete(SESSION_KEY);
      console.log('[SupabaseStorage v7.0] ✅ Profile cache cleared (MMKV)');
    } catch (error) {
      console.error('[SupabaseStorage v7.0] ❌ clearProfileCache error:', error);
    }
  }
  
  // Also clear AsyncStorage for web
  if (Platform.OS === 'web') {
    AsyncStorage.multiRemove([PROFILE_T0_KEY, PROFILE_T1_KEY, SESSION_KEY]).catch(() => {});
  }
}

/**
 * Unified storage adapter for TanStack Query
 * Works with both MMKV (native) and AsyncStorage (web)
 */
export const supabaseStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (mmkv) {
        // MMKV (native) - synchronous but wrapped in Promise for consistency
        const value = mmkv.getString(key);
        return value ?? null;
      } else {
        // AsyncStorage (web) - already async
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      console.error('[SupabaseStorage v7.0] ❌ getItem error:', error);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (mmkv) {
        // MMKV (native) - synchronous but wrapped in Promise for consistency
        mmkv.set(key, value);
      } else {
        // AsyncStorage (web) - already async
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('[SupabaseStorage v7.0] ❌ setItem error:', error);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      if (mmkv) {
        // MMKV (native) - synchronous but wrapped in Promise for consistency
        mmkv.delete(key);
      } else {
        // AsyncStorage (web) - already async
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('[SupabaseStorage v7.0] ❌ removeItem error:', error);
    }
  },
};
