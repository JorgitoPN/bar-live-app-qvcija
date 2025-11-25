
import { InteractionManager } from 'react-native';

interface Task {
  id: string;
  execute: () => Promise<void>;
  priority: 'high' | 'medium' | 'low';
}

class PerformanceOptimizer {
  // ✅ FIXED: Changed Array<T> to T[]
  private taskQueue: (() => Promise<void>)[] = [];
  private isProcessing = false;

  runAfterInteractions(callback: () => void): void {
    InteractionManager.runAfterInteractions(() => {
      callback();
    });
  }

  scheduleTask(task: Task): void {
    console.log('[PerformanceOptimizer] 📋 Scheduling task:', task.id);
    
    this.taskQueue.push(task.execute);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.taskQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;

    const task = this.taskQueue.shift();
    if (task) {
      try {
        await task();
      } catch (error) {
        console.error('[PerformanceOptimizer] Task error:', error);
      }
    }

    // Process next task after a small delay
    setTimeout(() => {
      this.processQueue();
    }, 50);
  }

  // ✅ FIXED: Changed Array<T> to T[]
  async batchTasks<T>(tasks: (() => Promise<T>)[]): Promise<T[]> {
    console.log('[PerformanceOptimizer] 🚀 Batching', tasks.length, 'tasks...');
    
    const results = await Promise.all(tasks.map(task => task()));
    
    console.log('[PerformanceOptimizer] ✅ Batch complete');
    return results;
  }

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

  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false;

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

  measurePerformance(label: string, fn: () => void): void {
    const start = Date.now();
    fn();
    const end = Date.now();
    console.log(`[Performance] ${label}: ${end - start}ms`);
  }

  async measureAsync(label: string, fn: () => Promise<void>): Promise<void> {
    const start = Date.now();
    await fn();
    const end = Date.now();
    console.log(`[Performance] ${label}: ${end - start}ms`);
  }
}

export const performanceOptimizer = new PerformanceOptimizer();
