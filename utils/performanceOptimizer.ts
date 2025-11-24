
/**
 * Performance Optimizer
 * Ultra-fast optimizations for social network
 * INSTANT RESPONSE - NO LAG
 */

import { InteractionManager } from 'react-native';

class PerformanceOptimizer {
  private pendingTasks: Map<string, any> = new Map();
  private taskQueue: Array<() => Promise<void>> = [];
  private isProcessing: boolean = false;

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
