
// ✅ FIXED: Changed Array<T> to T[]
class RenderOptimizer {
  private renderQueue: (() => void)[] = [];
  private isProcessing: boolean = false;
  private frameCallbacks: Map<string, number> = new Map();

  /**
   * Schedule a render for the next frame
   */
  scheduleRender(callback: () => void, id?: string): void {
    if (id) {
      // Cancel previous render with same ID
      const existingFrame = this.frameCallbacks.get(id);
      if (existingFrame) {
        cancelAnimationFrame(existingFrame);
      }
    }

    const frameId = requestAnimationFrame(() => {
      callback();
      if (id) {
        this.frameCallbacks.delete(id);
      }
    });

    if (id) {
      this.frameCallbacks.set(id, frameId);
    }
  }

  /**
   * Batch multiple renders into single frame
   */
  batchRender(callbacks: (() => void)[]): void {
    requestAnimationFrame(() => {
      callbacks.forEach(cb => cb());
    });
  }

  /**
   * Queue a render for later
   */
  queueRender(callback: () => void): void {
    this.renderQueue.push(callback);
    
    if (!this.isProcessing) {
      this.processRenderQueue();
    }
  }

  /**
   * Process the render queue
   */
  private processRenderQueue(): void {
    if (this.isProcessing || this.renderQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    requestAnimationFrame(() => {
      while (this.renderQueue.length > 0) {
        const callback = this.renderQueue.shift();
        if (callback) {
          callback();
        }
      }
      
      this.isProcessing = false;
    });
  }

  /**
   * Cancel a scheduled render
   */
  cancelRender(id: string): void {
    const frameId = this.frameCallbacks.get(id);
    if (frameId) {
      cancelAnimationFrame(frameId);
      this.frameCallbacks.delete(id);
    }
  }

  /**
   * Clear all scheduled renders
   */
  clearAll(): void {
    this.frameCallbacks.forEach(frameId => {
      cancelAnimationFrame(frameId);
    });
    this.frameCallbacks.clear();
    this.renderQueue = [];
    console.log('[RenderOptimizer] All renders cleared');
  }

  /**
   * Get queue status
   */
  getStatus(): { queued: number; scheduled: number } {
    return {
      queued: this.renderQueue.length,
      scheduled: this.frameCallbacks.size,
    };
  }
}

export const renderOptimizer = new RenderOptimizer();
