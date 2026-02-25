
/**
 * MMKV Storage Adapter for Supabase with Web Fallback
 * 
 * This file provides a high-performance storage adapter for Supabase authentication
 * using react-native-mmkv on native platforms (iOS/Android) and AsyncStorage on Web.
 * 
 * WHY MMKV IS BETTER THAN ASYNCSTORAGE (on native):
 * 
 * 1. **SYNCHRONOUS ACCESS**: MMKV provides synchronous read/write operations,
 *    eliminating the need for async/await and Promise handling. This means:
 *    - Instant session hydration on app startup (no loading delay)
 *    - No race conditions during rapid auth state changes
 *    - Simpler code without async complexity
 * 
 * 2. **PERFORMANCE**: MMKV is 10-30x faster than AsyncStorage:
 *    - AsyncStorage: ~50-100ms for session read
 *    - MMKV: ~1-3ms for session read
 *    - This translates to instant app startup like Instagram/WhatsApp
 * 
 * 3. **MEMORY MAPPED**: MMKV uses memory-mapped files (mmap), which means:
 *    - Data is loaded directly into memory without serialization overhead
 *    - OS handles caching automatically
 *    - Near-instant access after first read
 * 
 * 4. **ENCRYPTION**: Built-in AES encryption support for sensitive data
 *    - Session tokens are encrypted at rest
 *    - No additional encryption layer needed
 * 
 * 5. **RELIABILITY**: Based on WeChat's MMKV (used by billions of users)
 *    - Battle-tested in production
 *    - Handles crashes gracefully
 *    - Atomic writes prevent data corruption
 * 
 * PLATFORM COMPATIBILITY:
 * 
 * - iOS/Android: Uses MMKV (synchronous, high-performance)
 * - Web: Falls back to AsyncStorage (asynchronous, but compatible)
 * - Development Builds without native modules: Falls back to AsyncStorage
 * 
 * This ensures the app never crashes due to missing native modules.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define storage interface for type safety
interface StorageAdapter {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

// In-memory fallback storage for extreme edge cases
const inMemoryStorage: Map<string, string> = new Map();

const inMemoryAdapter: StorageAdapter = {
  getItem: (key: string): string | null => {
    const value = inMemoryStorage.get(key) || null;
    console.log('[InMemory] getItem:', key, value ? '✓ found' : '✗ not found');
    return value;
  },
  setItem: (key: string, value: string): void => {
    console.log('[InMemory] setItem:', key, `(${value.length} chars)`);
    inMemoryStorage.set(key, value);
  },
  removeItem: (key: string): void => {
    console.log('[InMemory] removeItem:', key);
    inMemoryStorage.delete(key);
  },
};

// AsyncStorage adapter (for Web and fallback)
const asyncStorageAdapter: StorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const value = await AsyncStorage.getItem(key);
      console.log('[AsyncStorage] getItem:', key, value ? '✓ found' : '✗ not found');
      return value;
    } catch (error) {
      console.error('[AsyncStorage] getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      console.log('[AsyncStorage] setItem:', key, `(${value.length} chars)`);
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('[AsyncStorage] setItem error:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      console.log('[AsyncStorage] removeItem:', key);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('[AsyncStorage] removeItem error:', error);
    }
  },
};

// MMKV adapter (for native platforms)
let mmkvAdapter: StorageAdapter | null = null;

// Try to initialize MMKV on native platforms
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    // Dynamic import to avoid errors on Web
    const { MMKV } = require('react-native-mmkv');
    
    // Check if MMKV is a valid constructor
    if (typeof MMKV === 'function') {
      const mmkvStorage = new MMKV({
        id: 'supabase-storage',
        encryptionKey: 'barlive-secure-key-2025',
      });

      mmkvAdapter = {
        getItem: (key: string): string | null => {
          const value = mmkvStorage.getString(key);
          console.log('[MMKV] getItem:', key, value ? '✓ found' : '✗ not found');
          return value ?? null;
        },
        setItem: (key: string, value: string): void => {
          console.log('[MMKV] setItem:', key, `(${value.length} chars)`);
          mmkvStorage.set(key, value);
        },
        removeItem: (key: string): void => {
          console.log('[MMKV] removeItem:', key);
          mmkvStorage.delete(key);
        },
      };

      console.log('[Storage] ✅ Using MMKV (high-performance native storage)');
    } else {
      console.warn('[Storage] ⚠️ MMKV is not a valid constructor, falling back to AsyncStorage');
    }
  } catch (error) {
    console.warn('[Storage] ⚠️ MMKV initialization failed, falling back to AsyncStorage:', error);
  }
}

// Select the appropriate storage adapter
let selectedAdapter: StorageAdapter;

if (mmkvAdapter) {
  // Native platforms with MMKV available
  selectedAdapter = mmkvAdapter;
} else if (Platform.OS === 'web') {
  // Web platform
  console.log('[Storage] ✅ Using AsyncStorage (Web platform)');
  selectedAdapter = asyncStorageAdapter;
} else {
  // Native platforms without MMKV (development builds, etc.)
  console.log('[Storage] ✅ Using AsyncStorage (native fallback)');
  selectedAdapter = asyncStorageAdapter;
}

/**
 * Supabase Storage Adapter
 * 
 * Implements the storage interface required by Supabase Auth.
 * Automatically selects the best storage solution for the current platform.
 * 
 * - iOS/Android with MMKV: Synchronous, high-performance
 * - Web or fallback: Asynchronous AsyncStorage
 */
export const supabaseStorage: StorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const result = selectedAdapter.getItem(key);
      // Handle both sync and async results
      return result instanceof Promise ? await result : result;
    } catch (error) {
      console.error('[Storage] getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      const result = selectedAdapter.setItem(key, value);
      // Handle both sync and async results
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      console.error('[Storage] setItem error:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      const result = selectedAdapter.removeItem(key);
      // Handle both sync and async results
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      console.error('[Storage] removeItem error:', error);
    }
  },
};

/**
 * Utility function to clear all Supabase session data
 * Useful for debugging or implementing "Sign out from all devices"
 */
export const clearSupabaseStorage = async (): Promise<void> => {
  console.log('[Storage] Clearing all Supabase storage...');
  
  try {
    if (mmkvAdapter) {
      // MMKV has getAllKeys method
      const { MMKV } = require('react-native-mmkv');
      const mmkvStorage = new MMKV({ id: 'supabase-storage' });
      const keys = mmkvStorage.getAllKeys();
      keys.forEach((key) => {
        if (key.startsWith('supabase.auth.')) {
          mmkvStorage.delete(key);
        }
      });
      console.log('[Storage] Cleared', keys.length, 'keys');
    } else {
      // AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const supabaseKeys = keys.filter((key) => key.startsWith('supabase.auth.'));
      await AsyncStorage.multiRemove(supabaseKeys);
      console.log('[Storage] Cleared', supabaseKeys.length, 'keys');
    }
  } catch (error) {
    console.error('[Storage] clearSupabaseStorage error:', error);
  }
};

/**
 * Utility function to inspect current session data
 * Useful for debugging authentication issues
 */
export const inspectSupabaseStorage = async (): Promise<Record<string, string>> => {
  const data: Record<string, string> = {};
  
  try {
    if (mmkvAdapter) {
      // MMKV
      const { MMKV } = require('react-native-mmkv');
      const mmkvStorage = new MMKV({ id: 'supabase-storage' });
      const keys = mmkvStorage.getAllKeys();
      
      keys.forEach((key) => {
        if (key.startsWith('supabase.auth.')) {
          const value = mmkvStorage.getString(key);
          if (value) {
            data[key] = value;
          }
        }
      });
    } else {
      // AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const supabaseKeys = keys.filter((key) => key.startsWith('supabase.auth.'));
      
      for (const key of supabaseKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          data[key] = value;
        }
      }
    }
    
    console.log('[Storage] Current Supabase storage:', Object.keys(data));
  } catch (error) {
    console.error('[Storage] inspectSupabaseStorage error:', error);
  }
  
  return data;
};

// Export for backward compatibility
export const MMKVStorageAdapter = supabaseStorage;
