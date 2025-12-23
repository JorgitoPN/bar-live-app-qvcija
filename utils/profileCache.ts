
/**
 * Profile Cache Utility
 * Ultra-fast caching for user and local profile data
 * OPTIMIZED FOR INSTANT LOADING - NO LOADING SCREENS
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_CACHE_KEY_PREFIX = '@profile_cache_';
const PROFILE_CACHE_TIMESTAMP_KEY_PREFIX = '@profile_cache_timestamp_';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface CachedProfileData {
  profile: any;
  posts: any[];
  stats: {
    posts: number;
    seguidores: number;
    seguidos: number;
  };
  timestamp: number;
}

export const profileCache = {
  async get(profileId: string, profileType: 'user' | 'local'): Promise<CachedProfileData | null> {
    try {
      const cacheKey = `${PROFILE_CACHE_KEY_PREFIX}${profileType}_${profileId}`;
      const timestampKey = `${PROFILE_CACHE_TIMESTAMP_KEY_PREFIX}${profileType}_${profileId}`;
      
      const [cachedData, cachedTimestamp] = await Promise.all([
        AsyncStorage.getItem(cacheKey),
        AsyncStorage.getItem(timestampKey),
      ]);

      if (!cachedData || !cachedTimestamp) {
        console.log(`[ProfileCache] ❌ No cached data found for ${profileType}:${profileId}`);
        return null;
      }

      const timestamp = parseInt(cachedTimestamp, 10);
      const now = Date.now();
      const age = now - timestamp;

      if (age > CACHE_DURATION) {
        console.log(`[ProfileCache] ⏰ Cache expired for ${profileType}:${profileId} (age: ${Math.round(age / 1000)}s)`);
        return null;
      }

      const data = JSON.parse(cachedData);
      console.log(`[ProfileCache] ✅ Cache hit for ${profileType}:${profileId}! (age: ${Math.round(age / 1000)}s)`);
      
      return {
        ...data,
        timestamp,
      };
    } catch (error) {
      console.error(`[ProfileCache] ❌ Error reading cache for ${profileType}:${profileId}:`, error);
      return null;
    }
  },

  async set(profileId: string, profileType: 'user' | 'local', data: Omit<CachedProfileData, 'timestamp'>): Promise<void> {
    try {
      const cacheKey = `${PROFILE_CACHE_KEY_PREFIX}${profileType}_${profileId}`;
      const timestampKey = `${PROFILE_CACHE_TIMESTAMP_KEY_PREFIX}${profileType}_${profileId}`;
      const timestamp = Date.now();
      
      await Promise.all([
        AsyncStorage.setItem(cacheKey, JSON.stringify(data)),
        AsyncStorage.setItem(timestampKey, timestamp.toString()),
      ]);
      
      console.log(`[ProfileCache] 💾 Cached ${profileType}:${profileId} (${data.posts.length} posts)`);
    } catch (error) {
      console.error(`[ProfileCache] ❌ Error writing cache for ${profileType}:${profileId}:`, error);
    }
  },

  async clear(profileId: string, profileType: 'user' | 'local'): Promise<void> {
    try {
      const cacheKey = `${PROFILE_CACHE_KEY_PREFIX}${profileType}_${profileId}`;
      const timestampKey = `${PROFILE_CACHE_TIMESTAMP_KEY_PREFIX}${profileType}_${profileId}`;
      
      await Promise.all([
        AsyncStorage.removeItem(cacheKey),
        AsyncStorage.removeItem(timestampKey),
      ]);
      
      console.log(`[ProfileCache] 🧹 Cache cleared for ${profileType}:${profileId}`);
    } catch (error) {
      console.error(`[ProfileCache] ❌ Error clearing cache for ${profileType}:${profileId}:`, error);
    }
  },

  async clearAll(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const profileKeys = allKeys.filter(key => 
        key.startsWith(PROFILE_CACHE_KEY_PREFIX) || 
        key.startsWith(PROFILE_CACHE_TIMESTAMP_KEY_PREFIX)
      );
      
      await AsyncStorage.multiRemove(profileKeys);
      console.log(`[ProfileCache] 🧹 All profile caches cleared (${profileKeys.length} keys)`);
    } catch (error) {
      console.error('[ProfileCache] ❌ Error clearing all caches:', error);
    }
  },

  async getAge(profileId: string, profileType: 'user' | 'local'): Promise<number | null> {
    try {
      const timestampKey = `${PROFILE_CACHE_TIMESTAMP_KEY_PREFIX}${profileType}_${profileId}`;
      const cachedTimestamp = await AsyncStorage.getItem(timestampKey);
      
      if (!cachedTimestamp) return null;
      
      const timestamp = parseInt(cachedTimestamp, 10);
      return Date.now() - timestamp;
    } catch (error) {
      console.error(`[ProfileCache] ❌ Error getting cache age for ${profileType}:${profileId}:`, error);
      return null;
    }
  },
};
