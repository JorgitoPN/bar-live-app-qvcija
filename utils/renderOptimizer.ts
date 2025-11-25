
/**
 * Render Optimizer
 * Advanced rendering optimizations for 60fps performance
 */

import { InteractionManager } from 'react-native';

class RenderOptimizer {
  private renderQueue: Array<() => void> = [];
  private isProcessing: boolean = false;
  private frameCallbacks: Map<string, number> = new Map();

  /**
   * Schedule render after interactions complete
   */
  scheduleRender(callback: () => void): void {
    this.renderQueue.push(callback);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process render queue
   */
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
      requestAnimationFrame(() => this.processQueue());
    });
  }

  /**
   * Throttle render updates to 60fps
   */
  throttleRender(key: string, callback: () => void, fps: number = 60): void {
    const frameTime = 1000 / fps;
    const lastFrame = this.frameCallbacks.get(key) || 0;
    const now = Date.now();

    if (now - lastFrame >= frameTime) {
      this.frameCallbacks.set(key, now);
      callback();
    }
  }

  /**
   * Batch multiple renders into single frame
   */
  batchRender(callbacks: Array<() => void>): void {
    requestAnimationFrame(() => {
      callbacks.forEach(cb => cb());
    });
  }

  /**
   * Clear all pending renders
   */
  clear(): void {
    this.renderQueue = [];
    this.frameCallbacks.clear();
    this.isProcessing = false;
  }
}

export const renderOptimizer = new RenderOptimizer();
