
/**
 * Local Preloader Utility
 * Preloads local details data for instant navigation
 * OPTIMIZED FOR MAXIMUM SPEED
 */

import { supabase } from './supabase';

interface LocalData {
  id: string;
  data: any;
  timestamp: number;
}

class LocalPreloader {
  private cache: Map<string, LocalData> = new Map();
  private preloadQueue: Set<string> = new Set();
  private isPreloading: boolean = false;
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes - longer cache
  private readonly MAX_CACHE_SIZE = 100; // More cache

  /**
   * Get cached local data
   */
  getCached(localId: string): any | null {
    const cached = this.cache.get(localId);
    
    if (!cached) {
      return null;
    }

    // Check if cache is still valid
    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(localId);
      return null;
    }

    console.log(`[LocalPreloader] ⚡ INSTANT CACHE HIT for local: ${localId}`);
    return cached.data;
  }

  /**
   * Preload local data
   */
  async preload(localId: string): Promise<void> {
    // Skip if already cached or in queue
    if (this.cache.has(localId) || this.preloadQueue.has(localId)) {
      return;
    }

    this.preloadQueue.add(localId);
    
    // Start preloading if not already running
    if (!this.isPreloading) {
      this.processQueue();
    }
  }

  /**
   * Preload multiple locals - AGGRESSIVE BATCHING
   */
  async preloadMultiple(localIds: string[]): Promise<void> {
    for (const localId of localIds) {
      if (!this.cache.has(localId) && !this.preloadQueue.has(localId)) {
        this.preloadQueue.add(localId);
      }
    }

    if (!this.isPreloading) {
      this.processQueue();
    }
  }

  /**
   * Process preload queue - OPTIMIZED FOR SPEED
   */
  private async processQueue(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.size === 0) {
      return;
    }

    this.isPreloading = true;

    // Process up to 5 locals at a time - MORE AGGRESSIVE
    const batch = Array.from(this.preloadQueue).slice(0, 5);
    
    // Parallel loading for maximum speed
    const promises = batch.map(async (localId) => {
      this.preloadQueue.delete(localId);
      
      try {
        const { data, error } = await supabase
          .from('locales')
          .select('*')
          .eq('id', localId)
          .single();

        if (!error && data) {
          // Manage cache size
          if (this.cache.size >= this.MAX_CACHE_SIZE) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
          }

          this.cache.set(localId, {
            id: localId,
            data: data,
            timestamp: Date.now(),
          });

          console.log(`[LocalPreloader] ⚡ Preloaded local: ${localId}`);
        }
      } catch (error) {
        console.error(`[LocalPreloader] Error preloading local ${localId}:`, error);
      }
    });

    // Wait for all parallel loads
    await Promise.all(promises);

    this.isPreloading = false;

    // Continue processing if there are more items in queue - NO DELAY
    if (this.preloadQueue.size > 0) {
      this.processQueue();
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.preloadQueue.clear();
    console.log('[LocalPreloader] Cache cleared');
  }

  /**
   * Get cache stats
   */
  getStats(): { cacheSize: number; queueSize: number } {
    return {
      cacheSize: this.cache.size,
      queueSize: this.preloadQueue.size,
    };
  }

  /**
   * Warm up cache with all visible locals
   */
  async warmUpCache(localIds: string[]): Promise<void> {
    console.log(`[LocalPreloader] 🔥 Warming up cache with ${localIds.length} locals`);
    await this.preloadMultiple(localIds);
  }
}

// Export singleton instance
export const localPreloader = new LocalPreloader();
