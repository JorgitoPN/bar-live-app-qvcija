
import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class PerformanceOptimizer {
  private pendingTasks: Map<string, any> = new Map();
  private taskQueue: (() => Promise<void>)[] = [];
  private isProcessing: boolean = false;
  private memoryCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  /**
   * Run task after interactions complete
   */
  runAfterInteractions(task: () => void | Promise<void>): void {
    InteractionManager.runAfterInteractions(async () => {
      try {
        await task();
      } catch (error) {
        console.error('[PerformanceOptimizer] Task error:', error);
      }
    });
  }

  /**
   * Debounce a function
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => {
        func(...args);
      }, wait);
    };
  }

  /**
   * Throttle a function
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
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }

  /**
   * Memoize expensive computations
   */
  memoize<T extends (...args: any[]) => any>(
    func: T,
    ttl: number = 5 * 60 * 1000 // 5 minutes default
  ): T {
    return ((...args: Parameters<T>) => {
      const key = JSON.stringify(args);
      const cached = this.memoryCache.get(key);

      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        console.log('[PerformanceOptimizer] Cache hit:', key);
        return cached.data;
      }

      const result = func(...args);
      this.memoryCache.set(key, {
        data: result,
        timestamp: Date.now(),
        ttl,
      });

      return result;
    }) as T;
  }

  /**
   * Queue a task for background processing
   */
  queueTask(task: () => Promise<void>): void {
    this.taskQueue.push(task);
    
    if (!this.isProcessing) {
      this.processTaskQueue();
    }
  }

  /**
   * Process the task queue
   */
  private async processTaskQueue(): Promise<void> {
    if (this.isProcessing || this.taskQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error('[PerformanceOptimizer] Task queue error:', error);
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Batch multiple tasks together
   */
  async batchTasks<T>(tasks: (() => Promise<T>)[]): Promise<T[]> {
    console.log('[PerformanceOptimizer] 🚀 Batching', tasks.length, 'tasks...');
    
    const results = await Promise.all(tasks.map(task => task()));
    
    console.log('[PerformanceOptimizer] ✅ Batch complete');
    return results;
  }

  /**
   * Get data from cache
   */
  async getCache<T>(key: string): Promise<T | null> {
    try {
      // Check memory cache first
      const memCached = this.memoryCache.get(key);
      if (memCached && Date.now() - memCached.timestamp < memCached.ttl) {
        console.log('[PerformanceOptimizer] Memory cache hit:', key);
        return memCached.data as T;
      }

      // Check AsyncStorage
      const cached = await AsyncStorage.getItem(`cache_${key}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < parsed.ttl) {
          console.log('[PerformanceOptimizer] AsyncStorage cache hit:', key);
          // Update memory cache
          this.memoryCache.set(key, parsed);
          return parsed.data as T;
        }
      }

      return null;
    } catch (error) {
      console.error('[PerformanceOptimizer] Error getting cache:', error);
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async setCache<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): Promise<void> {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl,
      };

      // Set in memory cache
      this.memoryCache.set(key, cacheData);

      // Set in AsyncStorage
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
      
      console.log('[PerformanceOptimizer] Cache set:', key);
    } catch (error) {
      console.error('[PerformanceOptimizer] Error setting cache:', error);
    }
  }

  /**
   * Clear memory cache
   */
  clearCache(): void {
    this.memoryCache.clear();
    console.log('[PerformanceOptimizer] Cache cleared');
  }

  /**
   * Clear all caches including AsyncStorage
   */
  async clearAllCaches(): Promise<void> {
    try {
      this.memoryCache.clear();
      
      // Get all keys from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      // Remove all cache keys
      await AsyncStorage.multiRemove(cacheKeys);
      
      console.log('[PerformanceOptimizer] All caches cleared');
    } catch (error) {
      console.error('[PerformanceOptimizer] Error clearing all caches:', error);
    }
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.memoryCache.size;
  }
}

export const performanceOptimizer = new PerformanceOptimizer();
