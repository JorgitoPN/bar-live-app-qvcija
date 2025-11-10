
/**
 * Local Preloader Utility
 * Preloads local details data for instant navigation
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
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 50;

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

    console.log(`[LocalPreloader] Cache hit for local: ${localId}`);
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
   * Preload multiple locals
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
   * Process preload queue
   */
  private async processQueue(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.size === 0) {
      return;
    }

    this.isPreloading = true;

    // Process up to 3 locals at a time
    const batch = Array.from(this.preloadQueue).slice(0, 3);
    
    for (const localId of batch) {
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

          console.log(`[LocalPreloader] Preloaded local: ${localId}`);
        }
      } catch (error) {
        console.error(`[LocalPreloader] Error preloading local ${localId}:`, error);
      }
    }

    this.isPreloading = false;

    // Continue processing if there are more items in queue
    if (this.preloadQueue.size > 0) {
      setTimeout(() => this.processQueue(), 100);
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
}

// Export singleton instance
export const localPreloader = new LocalPreloader();
