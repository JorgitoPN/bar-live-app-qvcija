
import { InteractionManager } from 'react-native';

// ✅ FIXED: Changed Array<T> to T[]
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
   * Clear memory cache
   */
  clearCache(): void {
    this.memoryCache.clear();
    console.log('[PerformanceOptimizer] Cache cleared');
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.memoryCache.size;
  }
}

export const performanceOptimizer = new PerformanceOptimizer();
