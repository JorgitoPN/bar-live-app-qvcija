
/**
 * ✅ SUPABASE STORAGE ADAPTER v8.0 - EXPO GO COMPATIBLE
 * 
 * v8.0 CHANGES:
 * - 🚀 EXPO GO COMPATIBLE: Uses AsyncStorage by default (no native modules required)
 * - 🔄 MODULAR DESIGN: Easy to switch to MMKV for development builds
 * - 🧹 GRACEFUL FALLBACK: Automatically falls back to AsyncStorage if MMKV fails
 * 
 * This adapter provides a unified interface for both MMKV (native) and AsyncStorage.
 * 
 * CURRENT MODE: AsyncStorage (Expo Go compatible)
 * - Works in Expo Go without custom native modules
 * - Asynchronous API (Promise-based)
 * - Reliable cross-platform storage
 * 
 * FUTURE MODE: MMKV (Development Build)
 * - Synchronous API (instant reads/writes)
 * - 10-30x faster than AsyncStorage
 * - To enable: Simply build a development build (not Expo Go)
 * 
 * This adapter wraps both to provide a consistent async interface.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ v8.0: Cache keys for profile caching
const PROFILE_T0_KEY = 'user_profile_t0_v8.0';
const PROFILE_T1_KEY = 'user_profile_t1_v8.0';
const SESSION_KEY = 'user_session_v8.0';

// ✅ v8.0: Conditional MMKV initialization (graceful fallback to AsyncStorage)
let mmkv: any = null;
let useMMKV = false;

// Only attempt to load MMKV if NOT in Expo Go
// Expo Go doesn't support custom native modules like MMKV
if (Platform.OS !== 'web') {
  try {
    // This will throw in Expo Go, which is expected
    const { MMKV } = require('react-native-mmkv');
    mmkv = new MMKV({ id: 'supabase-auth-storage' });
    useMMKV = true;
    console.log('[SupabaseStorage v8.0] ✅ MMKV initialized successfully (Development Build detected)');
  } catch (error: any) {
    // Expected in Expo Go - this is not an error
    if (error.message?.includes('NitroModules')) {
      console.log('[SupabaseStorage v8.0] ℹ️ Running in Expo Go - using AsyncStorage (MMKV not available)');
    } else {
      console.warn('[SupabaseStorage v8.0] ⚠️ MMKV initialization failed, falling back to AsyncStorage:', error.message);
    }
    useMMKV = false;
  }
}

/**
 * ✅ v8.0: ASYNC Profile T0 operations (works with both MMKV and AsyncStorage)
 * These are used for profile hydration on app start
 * Note: In Expo Go, these use AsyncStorage. In Development Builds, they use MMKV if available.
 */
export async function getProfileT0(): Promise<string | undefined> {
  try {
    if (useMMKV && mmkv) {
      return mmkv.getString(PROFILE_T0_KEY);
    }
    const value = await AsyncStorage.getItem(PROFILE_T0_KEY);
    return value ?? undefined;
  } catch (error) {
    console.error('[SupabaseStorage v8.0] ❌ getProfileT0 error:', error);
    return undefined;
  }
}

export async function saveProfileT0(data: string): Promise<void> {
  try {
    if (useMMKV && mmkv) {
      mmkv.set(PROFILE_T0_KEY, data);
    } else {
      await AsyncStorage.setItem(PROFILE_T0_KEY, data);
    }
  } catch (error) {
    console.error('[SupabaseStorage v8.0] ❌ saveProfileT0 error:', error);
  }
}

export async function getProfileT1(): Promise<string | undefined> {
  try {
    if (useMMKV && mmkv) {
      return mmkv.getString(PROFILE_T1_KEY);
    }
    const value = await AsyncStorage.getItem(PROFILE_T1_KEY);
    return value ?? undefined;
  } catch (error) {
    console.error('[SupabaseStorage v8.0] ❌ getProfileT1 error:', error);
    return undefined;
  }
}

export async function saveProfileT1(data: string): Promise<void> {
  try {
    if (useMMKV && mmkv) {
      mmkv.set(PROFILE_T1_KEY, data);
    } else {
      await AsyncStorage.setItem(PROFILE_T1_KEY, data);
    }
  } catch (error) {
    console.error('[SupabaseStorage v8.0] ❌ saveProfileT1 error:', error);
  }
}

/**
 * ✅ v8.0: ASYNC Session operations (works with both MMKV and AsyncStorage)
 * Used for session restoration on app start
 */
export async function getSession(): Promise<string | undefined> {
  try {
    if (useMMKV && mmkv) {
      return mmkv.getString(SESSION_KEY);
    }
    const value = await AsyncStorage.getItem(SESSION_KEY);
    return value ?? undefined;
  } catch (error) {
    console.error('[SupabaseStorage v8.0] ❌ getSession error:', error);
    return undefined;
  }
}

export async function saveSession(data: string): Promise<void> {
  try {
    if (useMMKV && mmkv) {
      mmkv.set(SESSION_KEY, data);
    } else {
      await AsyncStorage.setItem(SESSION_KEY, data);
    }
  } catch (error) {
    console.error('[SupabaseStorage v8.0] ❌ saveSession error:', error);
  }
}

/**
 * ✅ v8.0: Clear profile cache (used on logout)
 * Works with both MMKV and AsyncStorage
 */
export async function clearProfileCache(): Promise<void> {
  try {
    if (useMMKV && mmkv) {
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
 * ✅ v8.0: Unified storage adapter for Supabase Auth
 * 
 * This adapter automatically uses:
 * - MMKV (if available in Development Build) - 10-30x faster
 * - AsyncStorage (fallback for Expo Go and Web) - reliable and compatible
 * 
 * The interface is the same regardless of which storage is used,
 * making it easy to switch between Expo Go and Development Builds.
 */
export const supabaseStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (useMMKV && mmkv) {
        // MMKV (Development Build) - synchronous but wrapped in Promise for consistency
        const value = mmkv.getString(key);
        return value ?? null;
      } else {
        // AsyncStorage (Expo Go / Web) - already async
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      console.error('[SupabaseStorage v8.0] ❌ getItem error:', error);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (useMMKV && mmkv) {
        // MMKV (Development Build) - synchronous but wrapped in Promise for consistency
        mmkv.set(key, value);
      } else {
        // AsyncStorage (Expo Go / Web) - already async
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('[SupabaseStorage v8.0] ❌ setItem error:', error);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      if (useMMKV && mmkv) {
        // MMKV (Development Build) - synchronous but wrapped in Promise for consistency
        mmkv.delete(key);
      } else {
        // AsyncStorage (Expo Go / Web) - already async
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('[SupabaseStorage v8.0] ❌ removeItem error:', error);
    }
  },
};

/**
 * ✅ v8.0: Storage info for debugging
 * Logs which storage mechanism is currently being used
 */
export function getStorageInfo(): { type: 'MMKV' | 'AsyncStorage'; platform: string } {
  return {
    type: useMMKV ? 'MMKV' : 'AsyncStorage',
    platform: Platform.OS,
  };
}

// Log storage info on initialization
console.log('[SupabaseStorage v8.0] 📦 Storage initialized:', getStorageInfo());
