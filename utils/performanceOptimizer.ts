
/**
 * Performance Optimizer
 * Ultra-fast optimizations for social network
 * INSTANT RESPONSE - NO LAG
 */

import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class PerformanceOptimizer {
  private pendingTasks: Map<string, any> = new Map();
  private taskQueue: Array<() => Promise<void>> = [];
  private isProcessing: boolean = false;
  private memoryCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  /**
   * Get data from cache
   */
  async getCache<T>(key: string): Promise<T | null> {
    try {
      // Check memory cache first
      const memoryCached = this.memoryCache.get(key);
      if (memoryCached) {
        const now = Date.now();
        if (now - memoryCached.timestamp < memoryCached.ttl) {
          console.log(`[PerformanceOptimizer] ⚡ Memory cache HIT for key: ${key}`);
          return memoryCached.data as T;
        } else {
          // Expired, remove from memory cache
          this.memoryCache.delete(key);
        }
      }

      // Check AsyncStorage cache
      const cached = await AsyncStorage.getItem(`cache_${key}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        const now = Date.now();
        if (now - parsed.timestamp < parsed.ttl) {
          console.log(`[PerformanceOptimizer] 💾 Disk cache HIT for key: ${key}`);
          // Store in memory cache for faster access next time
          this.memoryCache.set(key, {
            data: parsed.data,
            timestamp: parsed.timestamp,
            ttl: parsed.ttl,
          });
          return parsed.data as T;
        } else {
          // Expired, remove from storage
          await AsyncStorage.removeItem(`cache_${key}`);
        }
      }

      console.log(`[PerformanceOptimizer] ❌ Cache MISS for key: ${key}`);
      return null;
    } catch (error) {
      console.error(`[PerformanceOptimizer] Error getting cache for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set data in cache with TTL (time to live in milliseconds)
   */
  async setCache<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): Promise<void> {
    try {
      const timestamp = Date.now();
      const cacheData = { data, timestamp, ttl };

      // Store in memory cache
      this.memoryCache.set(key, cacheData);

      // Store in AsyncStorage
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));

      console.log(`[PerformanceOptimizer] ✅ Cached data for key: ${key} (TTL: ${ttl}ms)`);

      // Clean up old memory cache entries (keep last 50)
      if (this.memoryCache.size > 50) {
        const firstKey = this.memoryCache.keys().next().value;
        this.memoryCache.delete(firstKey);
      }
    } catch (error) {
      console.error(`[PerformanceOptimizer] Error setting cache for key ${key}:`, error);
    }
  }

  /**
   * Clear cache for a specific key
   */
  async clearCache(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
      await AsyncStorage.removeItem(`cache_${key}`);
      console.log(`[PerformanceOptimizer] 🗑️ Cleared cache for key: ${key}`);
    } catch (error) {
      console.error(`[PerformanceOptimizer] Error clearing cache for key ${key}:`, error);
    }
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    try {
      this.memoryCache.clear();
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
      console.log(`[PerformanceOptimizer] 🗑️ Cleared all caches (${cacheKeys.length} items)`);
    } catch (error) {
      console.error('[PerformanceOptimizer] Error clearing all caches:', error);
    }
  }

  /**
   * Run task after interactions complete (non-blocking)
   */
  async runAfterInteractions<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      InteractionManager.runAfterInteractions(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Debounce function calls
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout);
      
      timeout = setTimeout(() => {
        func(...args);
      }, wait);
    };
  }

  /**
   * Throttle function calls
   */
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

  /**
   * Batch multiple tasks together
   */
  async batchTasks<T>(tasks: Array<() => Promise<T>>): Promise<T[]> {
    console.log('[PerformanceOptimizer] 🚀 Batching', tasks.length, 'tasks...');
    
    const results = await Promise.all(tasks.map(task => task()));
    
    console.log('[PerformanceOptimizer] ✅ Batch complete');
    return results;
  }

  /**
   * Queue task for background processing
   */
  queueTask(id: string, task: () => Promise<void>): void {
    this.pendingTasks.set(id, task);
    this.taskQueue.push(task);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process task queue in background
   */
  private async processQueue(): Promise<void> {
    if (this.taskQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;

    const task = this.taskQueue.shift();
    if (task) {
      try {
        await this.runAfterInteractions(task);
      } catch (error) {
        console.error('[PerformanceOptimizer] Task error:', error);
      }
    }

    // Process next task
    setTimeout(() => this.processQueue(), 0);
  }

  /**
   * Memoize function results
   */
  memoize<T extends (...args: any[]) => any>(
    func: T,
    keyGenerator?: (...args: Parameters<T>) => string
  ): T {
    const cache = new Map<string, ReturnType<T>>();

    return ((...args: Parameters<T>) => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      
      if (cache.has(key)) {
        return cache.get(key)!;
      }

      const result = func(...args);
      cache.set(key, result);
      
      // Clear old cache entries (keep last 100)
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }

      return result;
    }) as T;
  }

  /**
   * Optimize array operations
   */
  optimizeArray<T>(array: T[], operation: (item: T) => any): any[] {
    // Use native array methods for better performance
    return array.map(operation);
  }

  /**
   * Chunk large arrays for processing
   */
  chunkArray<T>(array: T[], chunkSize: number = 10): T[][] {
    const chunks: T[][] = [];
    
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    
    return chunks;
  }

  /**
   * Process large array in chunks (non-blocking)
   */
  async processArrayInChunks<T, R>(
    array: T[],
    processor: (item: T) => R,
    chunkSize: number = 10
  ): Promise<R[]> {
    const chunks = this.chunkArray(array, chunkSize);
    const results: R[] = [];

    for (const chunk of chunks) {
      await this.runAfterInteractions(async () => {
        const chunkResults = chunk.map(processor);
        results.push(...chunkResults);
      });
    }

    return results;
  }

  /**
   * Clear all pending tasks
   */
  clearTasks(): void {
    this.pendingTasks.clear();
    this.taskQueue = [];
    this.isProcessing = false;
    console.log('[PerformanceOptimizer] 🗑️ All tasks cleared');
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();
