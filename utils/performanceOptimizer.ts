
import AsyncStorage from '@react-native-async-storage/async-storage';

// Performance optimization utility for BarLive
// Implements aggressive caching, preloading, and optimization strategies

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

interface CacheConfig {
  maxSize: number; // Maximum number of entries
  defaultTTL: number; // Default time to live in milliseconds
}

class PerformanceOptimizer {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig = {
    maxSize: 500,
    defaultTTL: 5 * 60 * 1000, // 5 minutes
  };

  // Memory cache operations (instant access)
  setMemoryCache<T>(key: string, data: T, ttl?: number): void {
    const expiresIn = ttl || this.config.defaultTTL;
    
    // Implement LRU eviction if cache is full
    if (this.memoryCache.size >= this.config.maxSize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn,
    });
  }

  getMemoryCache<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.expiresIn) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clearMemoryCache(pattern?: string): void {
    if (!pattern) {
      this.memoryCache.clear();
      return;
    }

    // Clear entries matching pattern
    const keysToDelete: string[] = [];
    this.memoryCache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.memoryCache.delete(key));
  }

  // Persistent cache operations (AsyncStorage)
  async setPersistentCache<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const expiresIn = ttl || this.config.defaultTTL;
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresIn,
      };

      await AsyncStorage.setItem(`cache:${key}`, JSON.stringify(entry));
    } catch (error) {
      console.error('[PerformanceOptimizer] Error setting persistent cache:', error);
    }
  }

  async getPersistentCache<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(`cache:${key}`);
      
      if (!value) return null;

      const entry: CacheEntry<T> = JSON.parse(value);

      // Check if expired
      if (Date.now() - entry.timestamp > entry.expiresIn) {
        await AsyncStorage.removeItem(`cache:${key}`);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('[PerformanceOptimizer] Error getting persistent cache:', error);
      return null;
    }
  }

  async clearPersistentCache(pattern?: string): Promise<void> {
    try {
      if (!pattern) {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key => key.startsWith('cache:'));
        await AsyncStorage.multiRemove(cacheKeys);
        return;
      }

      const keys = await AsyncStorage.getAllKeys();
      const keysToDelete = keys.filter(key => 
        key.startsWith('cache:') && key.includes(pattern)
      );
      await AsyncStorage.multiRemove(keysToDelete);
    } catch (error) {
      console.error('[PerformanceOptimizer] Error clearing persistent cache:', error);
    }
  }

  // Hybrid cache (memory first, then persistent)
  async getCache<T>(key: string): Promise<T | null> {
    // Try memory cache first (instant)
    const memoryData = this.getMemoryCache<T>(key);
    if (memoryData) {
      console.log(`[PerformanceOptimizer] Cache HIT (memory): ${key}`);
      return memoryData;
    }

    // Try persistent cache
    const persistentData = await this.getPersistentCache<T>(key);
    if (persistentData) {
      console.log(`[PerformanceOptimizer] Cache HIT (persistent): ${key}`);
      // Promote to memory cache
      this.setMemoryCache(key, persistentData);
      return persistentData;
    }

    console.log(`[PerformanceOptimizer] Cache MISS: ${key}`);
    return null;
  }

  async setCache<T>(key: string, data: T, ttl?: number): Promise<void> {
    // Set both memory and persistent cache
    this.setMemoryCache(key, data, ttl);
    await this.setPersistentCache(key, data, ttl);
  }

  // Batch operations for better performance
  async batchGetCache<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();

    await Promise.all(
      keys.map(async (key) => {
        const data = await this.getCache<T>(key);
        if (data) {
          results.set(key, data);
        }
      })
    );

    return results;
  }

  async batchSetCache<T>(entries: { key: string; data: T; ttl?: number }[]): Promise<void> {
    await Promise.all(
      entries.map(({ key, data, ttl }) => this.setCache(key, data, ttl))
    );
  }

  // Preloading utilities
  async preloadData<T>(
    keys: string[],
    fetchFn: (key: string) => Promise<T>,
    ttl?: number
  ): Promise<void> {
    console.log(`[PerformanceOptimizer] Preloading ${keys.length} items...`);

    await Promise.all(
      keys.map(async (key) => {
        try {
          // Check if already cached
          const cached = await this.getCache<T>(key);
          if (cached) return;

          // Fetch and cache
          const data = await fetchFn(key);
          await this.setCache(key, data, ttl);
        } catch (error) {
          console.error(`[PerformanceOptimizer] Error preloading ${key}:`, error);
        }
      })
    );

    console.log(`[PerformanceOptimizer] Preloading complete`);
  }

  // Cache statistics
  getCacheStats(): {
    memorySize: number;
    memoryKeys: string[];
  } {
    return {
      memorySize: this.memoryCache.size,
      memoryKeys: Array.from(this.memoryCache.keys()),
    };
  }

  async getPersistentCacheStats(): Promise<{
    totalSize: number;
    keys: string[];
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache:'));
      
      return {
        totalSize: cacheKeys.length,
        keys: cacheKeys,
      };
    } catch (error) {
      console.error('[PerformanceOptimizer] Error getting cache stats:', error);
      return { totalSize: 0, keys: [] };
    }
  }

  // Debounce utility for search and input
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  // Throttle utility for scroll and frequent events
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  // Image optimization
  getOptimizedImageUrl(url: string, width?: number, quality?: number): string {
    if (!url) return url;

    // For Unsplash images
    if (url.includes('unsplash.com')) {
      const params = new URLSearchParams();
      if (width) params.append('w', width.toString());
      if (quality) params.append('q', quality.toString());
      params.append('auto', 'format');
      params.append('fit', 'crop');
      
      return `${url}?${params.toString()}`;
    }

    // For other images, return as is
    return url;
  }

  // Clear all caches
  async clearAllCaches(): Promise<void> {
    this.clearMemoryCache();
    await this.clearPersistentCache();
    console.log('[PerformanceOptimizer] All caches cleared');
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();
