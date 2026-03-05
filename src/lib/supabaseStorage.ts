
/**
 * ✅ SUPABASE STORAGE ADAPTER v8.0 - EXPO GO COMPATIBLE
 * 
 * v8.0 CHANGES:
 * - 🚀 EXPO GO SUPPORT: Uses AsyncStorage for Expo Go compatibility
 * - 🔧 MODULAR DESIGN: Easy switch to MMKV for production builds
 * - 🧹 CONDITIONAL IMPORTS: MMKV only loaded when USE_MMKV flag is true
 * 
 * This adapter provides a unified interface for both MMKV (native) and AsyncStorage.
 * It's used by Supabase auth and TanStack Query's persister to cache data.
 * 
 * CURRENT MODE: AsyncStorage (Expo Go compatible)
 * - Works in Expo Go without native modules
 * - Asynchronous API (Promise-based)
 * - Cross-platform (iOS, Android, Web)
 * 
 * FUTURE MODE: MMKV (Production builds)
 * - Set USE_MMKV = true to enable
 * - Requires Development Build (not Expo Go)
 * - Synchronous API (instant reads/writes)
 * - Better performance for native apps
 * 
 * TO SWITCH TO MMKV:
 * 1. Change USE_MMKV to true below
 * 2. Build a Development Build (npx expo prebuild)
 * 3. MMKV will be used automatically on native platforms
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔧 CONFIGURATION: Set to true to use MMKV (requires Development Build)
// Set to false to use AsyncStorage (works in Expo Go)
const USE_MMKV = false;

// ✅ Storage keys for profile caching
const PROFILE_T0_KEY = 'user_profile_t0_v8.0'; // ✅ v8.0: Cache key updated
const PROFILE_T1_KEY = 'user_profile_t1_v8.0'; // ✅ v8.0: Cache key updated
const SESSION_KEY = 'user_session_v8.0'; // ✅ v8.0: Cache key updated

// ✅ Conditional MMKV initialization (only if USE_MMKV is true and not on web)
let mmkv: any = null;

if (USE_MMKV && Platform.OS !== 'web') {
  try {
    const { MMKV } = require('react-native-mmkv');
    mmkv = new MMKV();
    console.log('[SupabaseStorage v8.0] ✅ MMKV initialized (native)');
  } catch (error) {
    console.error('[SupabaseStorage v8.0] ❌ MMKV initialization failed, falling back to AsyncStorage:', error);
    // Fallback to AsyncStorage if MMKV fails
    mmkv = null;
  }
} else {
  console.log('[SupabaseStorage v8.0] ✅ Using AsyncStorage (Expo Go compatible mode)');
}

/**
 * ✅ SYNC Profile T0 operations
 * When MMKV is enabled: Synchronous, instant reads/writes
 * When AsyncStorage: Returns undefined (use async methods instead)
 */
export function getProfileT0Sync(): string | undefined {
  if (!mmkv) return undefined;
  try {
    return mmkv.getString(PROFILE_T0_KEY);
  } catch (error) {
    console.error('[SupabaseStorage v8.0] ❌ getProfileT0Sync error:', error);
    return undefined;
  }
}

export function saveProfileT0Sync(data: string): void {
  if (!mmkv) return;
  try {
    mmkv.set(PROFILE_T0_KEY, data);
  } catch (error) {
    console.error('[SupabaseStorage v8.0] ❌ saveProfileT0Sync error:', error);
  }
}

export function getProfileT1Sync(): string | undefined {
  if (!mmkv) return undefined;
  try {
    return mmkv.getString(PROFILE_T1_KEY);
  } catch (error) {
    console.error('[SupabaseStorage v8.0] ❌ getProfileT1Sync error:', error);
    return undefined;
  }
}

export function saveProfileT1Sync(data: string): void {
  if (!mmkv) return;
  try {
    mmkv.set(PROFILE_T1_KEY, data);
  } catch (error) {
    console.error('[SupabaseStorage v8.0] ❌ saveProfileT1Sync error:', error);
  }
}

/**
 * ✅ SYNC Session operations
 * When MMKV is enabled: Synchronous, instant reads/writes
 * When AsyncStorage: Returns undefined (use async methods instead)
 */
export function getSessionSync(): string | undefined {
  if (!mmkv) return undefined;
  try {
    return mmkv.getString(SESSION_KEY);
  } catch (error) {
    console.error('[SupabaseStorage v8.0] ❌ getSessionSync error:', error);
    return undefined;
  }
}

export function saveSessionSync(data: string): void {
  if (!mmkv) return;
  try {
    mmkv.set(SESSION_KEY, data);
  } catch (error) {
    console.error('[SupabaseStorage v8.0] ❌ saveSessionSync error:', error);
  }
}

/**
 * ✅ ASYNC Profile operations (works with both MMKV and AsyncStorage)
 * Use these when MMKV is disabled (Expo Go mode)
 */
export async function getProfileT0Async(): Promise<string | null> {
  try {
    if (mmkv) {
      return mmkv.getString(PROFILE_T0_KEY) ?? null;
    } else {
      return await AsyncStorage.getItem(PROFILE_T0_KEY);
    }
  } catch (error) {
    console.error('[SupabaseStorage v8.0] ❌ getProfileT0Async error:', error);
    return null;
  }
}

export async function saveProfileT0Async(data: string): Promise<void> {
  try {
    if (mmkv) {
      mmkv.set(PROFILE_T0_KEY, data);
    } else {
      await AsyncStorage.setItem(PROFILE_T0_KEY, data);
    }
  } catch (error) {
    console.error('[SupabaseStorage v8.0] ❌ saveProfileT0Async error:', error);
  }
}

export async function getProfileT1Async(): Promise<string | null> {
  try {
    if (mmkv) {
      return mmkv.getString(PROFILE_T1_KEY) ?? null;
    } else {
      return await AsyncStorage.getItem(PROFILE_T1_KEY);
    }
  } catch (error) {
    console.error('[SupabaseStorage v8.0] ❌ getProfileT1Async error:', error);
    return null;
  }
}

export async function saveProfileT1Async(data: string): Promise<void> {
  try {
    if (mmkv) {
      mmkv.set(PROFILE_T1_KEY, data);
    } else {
      await AsyncStorage.setItem(PROFILE_T1_KEY, data);
    }
  } catch (error) {
    console.error('[SupabaseStorage v8.0] ❌ saveProfileT1Async error:', error);
  }
}

export async function getSessionAsync(): Promise<string | null> {
  try {
    if (mmkv) {
      return mmkv.getString(SESSION_KEY) ?? null;
    } else {
      return await AsyncStorage.getItem(SESSION_KEY);
    }
  } catch (error) {
    console.error('[SupabaseStorage v8.0] ❌ getSessionAsync error:', error);
    return null;
  }
}

export async function saveSessionAsync(data: string): Promise<void> {
  try {
    if (mmkv) {
      mmkv.set(SESSION_KEY, data);
    } else {
      await AsyncStorage.setItem(SESSION_KEY, data);
    }
  } catch (error) {
    console.error('[SupabaseStorage v8.0] ❌ saveSessionAsync error:', error);
  }
}

/**
 * ✅ Clear profile cache (used on logout)
 * Works with both MMKV and AsyncStorage
 */
export async function clearProfileCache(): Promise<void> {
  try {
    if (mmkv) {
      mmkv.delete(PROFILE_T0_KEY);
      mmkv.delete(PROFILE_T1_KEY);
      mmkv.delete(SESSION_KEY);
      console.log('[SupabaseStorage v8.0] ✅ Profile cache cleared (MMKV)');
    } else {
      await AsyncStorage.multiRemove([PROFILE_T0_KEY, PROFILE_T1_KEY, SESSION_KEY]);
      console.log('[SupabaseStorage v8.0] ✅ Profile cache cleared (AsyncStorage)');
    }
  } catch (error) {
    console.error('[SupabaseStorage v8.0] ❌ clearProfileCache error:', error);
  }
}

/**
 * ✅ Unified storage adapter for Supabase Auth and TanStack Query
 * Works with both MMKV (when enabled) and AsyncStorage (Expo Go compatible)
 * 
 * This is the main storage interface used by:
 * - Supabase auth.storage (session persistence)
 * - TanStack Query persister (query cache)
 */
export const supabaseStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (mmkv) {
        // MMKV - synchronous but wrapped in Promise for consistency
        const value = mmkv.getString(key);
        return value ?? null;
      } else {
        // AsyncStorage - already async
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      console.error('[SupabaseStorage v8.0] ❌ getItem error:', error);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (mmkv) {
        // MMKV - synchronous but wrapped in Promise for consistency
        mmkv.set(key, value);
      } else {
        // AsyncStorage - already async
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('[SupabaseStorage v8.0] ❌ setItem error:', error);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      if (mmkv) {
        // MMKV - synchronous but wrapped in Promise for consistency
        mmkv.delete(key);
      } else {
        // AsyncStorage - already async
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('[SupabaseStorage v8.0] ❌ removeItem error:', error);
    }
  },
};

/**
 * ✅ Storage mode information
 * Use this to check which storage backend is currently active
 */
export const storageInfo = {
  isMMKVEnabled: USE_MMKV && mmkv !== null,
  isAsyncStorageMode: !mmkv,
  backend: mmkv ? 'MMKV' : 'AsyncStorage',
};
