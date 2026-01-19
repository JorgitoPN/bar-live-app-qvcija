
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAP_CACHE_KEY = '@map_markers_cache';
const MAP_CACHE_TIMESTAMP_KEY = '@map_markers_cache_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface CachedMapData {
  markers: any[];
  timestamp: number;
}

export const mapCache = {
  async get(): Promise<CachedMapData | null> {
    try {
      const [cachedData, cachedTimestamp] = await Promise.all([
        AsyncStorage.getItem(MAP_CACHE_KEY),
        AsyncStorage.getItem(MAP_CACHE_TIMESTAMP_KEY),
      ]);

      if (!cachedData || !cachedTimestamp) {
        console.log('[MapCache] ❌ No cached data found');
        return null;
      }

      const timestamp = parseInt(cachedTimestamp, 10);
      const now = Date.now();
      const age = now - timestamp;

      if (age > CACHE_DURATION) {
        console.log(`[MapCache] ⏰ Cache expired (age: ${Math.round(age / 1000)}s)`);
        return null;
      }

      const markers = JSON.parse(cachedData);
      console.log(`[MapCache] ✅ Cache hit! ${markers.length} markers (age: ${Math.round(age / 1000)}s)`);
      
      return {
        markers,
        timestamp,
      };
    } catch (error) {
      console.error('[MapCache] ❌ Error reading cache:', error);
      return null;
    }
  },

  async set(markers: any[]): Promise<void> {
    try {
      const timestamp = Date.now();
      await Promise.all([
        AsyncStorage.setItem(MAP_CACHE_KEY, JSON.stringify(markers)),
        AsyncStorage.setItem(MAP_CACHE_TIMESTAMP_KEY, timestamp.toString()),
      ]);
      console.log(`[MapCache] 💾 Cached ${markers.length} markers`);
    } catch (error) {
      console.error('[MapCache] ❌ Error writing cache:', error);
    }
  },

  async clear(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(MAP_CACHE_KEY),
        AsyncStorage.removeItem(MAP_CACHE_TIMESTAMP_KEY),
      ]);
      console.log('[MapCache] 🧹 Cache cleared');
    } catch (error) {
      console.error('[MapCache] ❌ Error clearing cache:', error);
    }
  },

  async getAge(): Promise<number | null> {
    try {
      const cachedTimestamp = await AsyncStorage.getItem(MAP_CACHE_TIMESTAMP_KEY);
      if (!cachedTimestamp) return null;
      
      const timestamp = parseInt(cachedTimestamp, 10);
      return Date.now() - timestamp;
    } catch (error) {
      console.error('[MapCache] ❌ Error getting cache age:', error);
      return null;
    }
  },
};
