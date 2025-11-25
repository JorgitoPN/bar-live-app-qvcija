
import { InteractionManager } from 'react-native';

class RenderOptimizer {
  // ✅ FIXED: Changed Array<T> to T[]
  private renderQueue: (() => void)[] = [];
  private isProcessing = false;

  scheduleRender(callback: () => void, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    if (priority === 'high') {
      this.renderQueue.unshift(callback);
    } else {
      this.renderQueue.push(callback);
    }

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.renderQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;

    InteractionManager.runAfterInteractions(() => {
      const callback = this.renderQueue.shift();
      if (callback) {
        callback();
      }

      // Process next item
      requestAnimationFrame(() => {
        this.processQueue();
      });
    });
  }

  // ✅ FIXED: Changed Array<T> to T[]
  batchRender(callbacks: (() => void)[]): void {
    requestAnimationFrame(() => {
      callbacks.forEach(cb => cb());
    });
  }

  deferRender(callback: () => void, delay: number = 0): void {
    setTimeout(() => {
      InteractionManager.runAfterInteractions(() => {
        callback();
      });
    }, delay);
  }

  priorityRender(callback: () => void): void {
    requestAnimationFrame(() => {
      callback();
    });
  }

  clearQueue(): void {
    this.renderQueue = [];
    this.isProcessing = false;
  }

  getQueueSize(): number {
    return this.renderQueue.length;
  }
}

export const renderOptimizer = new RenderOptimizer();
