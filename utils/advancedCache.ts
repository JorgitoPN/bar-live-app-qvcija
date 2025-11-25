
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  priority: 'high' | 'medium' | 'low';
  expiresAt: number;
}

class AdvancedCache {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly MAX_MEMORY_ITEMS = 100;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly HIGH_PRIORITY_TTL = 15 * 60 * 1000; // 15 minutes
  private readonly LOW_PRIORITY_TTL = 2 * 60 * 1000; // 2 minutes

  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && Date.now() < memoryEntry.expiresAt) {
      console.log('[AdvancedCache] ⚡ Memory cache hit:', key);
      return memoryEntry.data as T;
    }

    // Check AsyncStorage
    try {
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        if (Date.now() < entry.expiresAt) {
          console.log('[AdvancedCache] 💾 Storage cache hit:', key);
          // Restore to memory cache
          this.memoryCache.set(key, entry);
          return entry.data;
        } else {
          // Expired, remove it
          await AsyncStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('[AdvancedCache] Error reading from storage:', error);
    }

    return null;
  }

  async set<T>(
    key: string,
    data: T,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> {
    const ttl = this.getTTL(priority);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      priority,
      expiresAt: Date.now() + ttl,
    };

    // Store in memory cache
    this.memoryCache.set(key, entry);
    this.enforceMemoryLimit();

    // Store in AsyncStorage
    try {
      await AsyncStorage.setItem(key, JSON.stringify(entry));
      console.log('[AdvancedCache] ✅ Cached:', key, 'Priority:', priority);
    } catch (error) {
      console.error('[AdvancedCache] Error writing to storage:', error);
    }
  }

  // ✅ FIXED: Changed Array<T> to T[]
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

  // ✅ FIXED: Changed Array<T> to T[]
  async batchSet<T>(
    entries: { key: string; data: T; priority?: 'high' | 'medium' | 'low' }[]
  ): Promise<void> {
    await Promise.all(
      entries.map(({ key, data, priority = 'medium' }) =>
        this.set(key, data, priority)
      )
    );
  }

  async invalidate(keyPattern: string): Promise<void> {
    console.log('[AdvancedCache] 🗑️ Invalidating pattern:', keyPattern);

    // Clear from memory cache
    const keysToDelete: string[] = [];
    this.memoryCache.forEach((_, key) => {
      if (key.startsWith(keyPattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.memoryCache.delete(key));

    // Clear from AsyncStorage
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const matchingKeys = allKeys.filter(key => key.startsWith(keyPattern));
      if (matchingKeys.length > 0) {
        await AsyncStorage.multiRemove(matchingKeys);
      }
    } catch (error) {
      console.error('[AdvancedCache] Error invalidating storage:', error);
    }
  }

  async clear(): Promise<void> {
    console.log('[AdvancedCache] 🗑️ Clearing all cache');
    this.memoryCache.clear();
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('[AdvancedCache] Error clearing storage:', error);
    }
  }

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

  private enforceMemoryLimit(): void {
    if (this.memoryCache.size <= this.MAX_MEMORY_ITEMS) {
      return;
    }

    // Remove oldest low-priority items first
    const entries = Array.from(this.memoryCache.entries());
    entries.sort((a, b) => {
      if (a[1].priority !== b[1].priority) {
        const priorityOrder = { low: 0, medium: 1, high: 2 };
        return priorityOrder[a[1].priority] - priorityOrder[b[1].priority];
      }
      return a[1].timestamp - b[1].timestamp;
    });

    const toRemove = entries.slice(0, this.memoryCache.size - this.MAX_MEMORY_ITEMS);
    toRemove.forEach(([key]) => this.memoryCache.delete(key));
  }

  getStats(): {
    memorySize: number;
    maxMemorySize: number;
  } {
    return {
      memorySize: this.memoryCache.size,
      maxMemorySize: this.MAX_MEMORY_ITEMS,
    };
  }
}

export const advancedCache = new AdvancedCache();
