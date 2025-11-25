
/**
 * Memory Manager
 * Aggressive memory management for optimal performance
 */

import { Image } from 'react-native';

class MemoryManager {
  private imageCache: Set<string> = new Set();
  private maxCacheSize: number = 100;
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize memory manager
   */
  initialize(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    console.log('[MemoryManager] ✅ Initialized');
  }

  /**
   * Track image in cache
   */
  trackImage(uri: string): void {
    if (this.imageCache.size >= this.maxCacheSize) {
      // Remove oldest entries
      const toRemove = Array.from(this.imageCache).slice(0, 20);
      toRemove.forEach(img => this.imageCache.delete(img));
    }

    this.imageCache.add(uri);
  }

  /**
   * Clear image from cache
   */
  clearImage(uri: string): void {
    this.imageCache.delete(uri);
  }

  /**
   * Cleanup unused resources
   */
  cleanup(): void {
    console.log('[MemoryManager] 🧹 Running cleanup...');
    
    // Clear old image cache entries
    if (this.imageCache.size > this.maxCacheSize) {
      const toRemove = Array.from(this.imageCache).slice(0, this.imageCache.size - this.maxCacheSize);
      toRemove.forEach(img => this.imageCache.delete(img));
    }

    // Force garbage collection hint (if available)
    if (global.gc) {
      global.gc();
    }

    console.log('[MemoryManager] ✅ Cleanup complete. Cache size:', this.imageCache.size);
  }

  /**
   * Get memory stats
   */
  getStats(): { cacheSize: number; maxSize: number } {
    return {
      cacheSize: this.imageCache.size,
      maxSize: this.maxCacheSize,
    };
  }

  /**
   * Shutdown memory manager
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.imageCache.clear();
    console.log('[MemoryManager] 🛑 Shutdown complete');
  }
}

export const memoryManager = new MemoryManager();
