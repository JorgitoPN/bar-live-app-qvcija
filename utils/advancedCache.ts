
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ FIXED: Changed Array<T> to T[]
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  priority: 'high' | 'medium' | 'low';
}

class AdvancedCache {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly HIGH_PRIORITY_TTL = 15 * 60 * 1000; // 15 minutes
  private readonly LOW_PRIORITY_TTL = 2 * 60 * 1000; // 2 minutes

  /**
   * Get data from cache (memory first, then AsyncStorage)
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Check memory cache first (INSTANT)
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && Date.now() < memoryEntry.expiresAt) {
        console.log('[AdvancedCache] ⚡ Memory hit:', key);
        return memoryEntry.data as T;
      }

      // Check AsyncStorage
      const stored = await AsyncStorage.getItem(`cache:${key}`);
      if (!stored) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(stored);
      
      // Check if expired
      if (Date.now() >= entry.expiresAt) {
        console.log('[AdvancedCache] ⏰ Expired:', key);
        await this.remove(key);
        return null;
      }

      // Store in memory for next time
      this.memoryCache.set(key, entry);
      
      console.log('[AdvancedCache] 💾 Storage hit:', key);
      return entry.data;
    } catch (error) {
      console.error('[AdvancedCache] Error getting:', key, error);
      return null;
    }
  }

  /**
   * Set data in cache (both memory and AsyncStorage)
   */
  async set<T>(
    key: string,
    data: T,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> {
    try {
      const ttl = this.getTTL(priority);
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
        priority,
      };

      // Store in memory (INSTANT access)
      this.memoryCache.set(key, entry);

      // Store in AsyncStorage (persistent)
      await AsyncStorage.setItem(`cache:${key}`, JSON.stringify(entry));
      
      console.log('[AdvancedCache] ✅ Cached:', key, 'Priority:', priority);
    } catch (error) {
      console.error('[AdvancedCache] Error setting:', key, error);
    }
  }

  /**
   * Remove from cache
   */
  async remove(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
      await AsyncStorage.removeItem(`cache:${key}`);
      console.log('[AdvancedCache] 🗑️ Removed:', key);
    } catch (error) {
      console.error('[AdvancedCache] Error removing:', key, error);
    }
  }

  /**
   * Clear all cache with prefix
   */
  async invalidate(prefix: string): Promise<void> {
    try {
      console.log('[AdvancedCache] 🧹 Invalidating prefix:', prefix);
      
      // Clear memory cache
      const keysToDelete: string[] = [];
      this.memoryCache.forEach((_, key) => {
        if (key.startsWith(prefix)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.memoryCache.delete(key));

      // Clear AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(k => k.startsWith(`cache:${prefix}`));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
      
      console.log('[AdvancedCache] ✅ Invalidated:', cacheKeys.length, 'keys');
    } catch (error) {
      console.error('[AdvancedCache] Error invalidating:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    try {
      console.log('[AdvancedCache] 🧹 Clearing all cache...');
      this.memoryCache.clear();
      
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(k => k.startsWith('cache:'));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
      
      console.log('[AdvancedCache] ✅ Cleared:', cacheKeys.length, 'keys');
    } catch (error) {
      console.error('[AdvancedCache] Error clearing:', error);
    }
  }

  /**
   * Batch get - Parallel retrieval
   */
  async batchGet<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();

    await Promise.all(
      keys.map(async (key) => {
        const data = await this.get<T>(key);
        if (data) {
          results.set(key, data);
        }
      })
    );

    return results;
  }

  /**
   * Batch set - Parallel storage
   */
  async batchSet<T>(
    entries: { key: string; data: T; priority?: 'high' | 'medium' | 'low' }[]
  ): Promise<void> {
    await Promise.all(
      entries.map(({ key, data, priority = 'medium' }) =>
        this.set(key, data, priority)
      )
    );
  }

  /**
   * Get TTL based on priority
   */
  private getTTL(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high':
        return this.HIGH_PRIORITY_TTL;
      case 'low':
        return this.LOW_PRIORITY_TTL;
      default:
        return this.DEFAULT_TTL;
    }
  }

  /**
   * Clean expired entries
   */
  async cleanExpired(): Promise<void> {
    try {
      console.log('[AdvancedCache] 🧹 Cleaning expired entries...');
      
      // Clean memory cache
      const now = Date.now();
      const expiredKeys: string[] = [];
      this.memoryCache.forEach((entry, key) => {
        if (now >= entry.expiresAt) {
          expiredKeys.push(key);
        }
      });
      expiredKeys.forEach(key => this.memoryCache.delete(key));

      // Clean AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(k => k.startsWith('cache:'));
      
      const expiredStorageKeys: string[] = [];
      await Promise.all(
        cacheKeys.map(async (key) => {
          const stored = await AsyncStorage.getItem(key);
          if (stored) {
            const entry: CacheEntry<any> = JSON.parse(stored);
            if (now >= entry.expiresAt) {
              expiredStorageKeys.push(key);
            }
          }
        })
      );
      
      if (expiredStorageKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredStorageKeys);
      }
      
      console.log('[AdvancedCache] ✅ Cleaned:', expiredKeys.length + expiredStorageKeys.length, 'expired entries');
    } catch (error) {
      console.error('[AdvancedCache] Error cleaning expired:', error);
    }
  }
}

export const advancedCache = new AdvancedCache();
