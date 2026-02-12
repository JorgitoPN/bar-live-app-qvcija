
/**
 * Local Preloader Utility v2.0
 * ✅ ANDROID CRITICAL PERFORMANCE FIX
 * - DISABLED on Android to prevent UI thread blocking
 * - Preloading causes ANR (Application Not Responding) on Android
 * - Data loads on-demand instead of aggressive preloading
 */

import { supabase } from './supabase';
import { Platform } from 'react-native';

interface LocalData {
  id: string;
  data: any;
  timestamp: number;
}

// ✅ CRITICAL: Disable console logs on Android
const log = Platform.OS === 'android' ? () => {} : console.log;

class LocalPreloader {
  private cache: Map<string, LocalData> = new Map();
  private preloadQueue: Set<string> = new Set();
  private isPreloading: boolean = false;
  private readonly CACHE_DURATION = 10 * 60 * 1000;
  private readonly MAX_CACHE_SIZE = 50; // ✅ Reduced from 100
  private readonly ENABLED = Platform.OS !== 'android'; // ✅ DISABLED on Android

  /**
   * Get cached local data
   */
  getCached(localId: string): any | null {
    if (!this.ENABLED) {
      return null;
    }

    const cached = this.cache.get(localId);
    
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(localId);
      return null;
    }

    return cached.data;
  }

  /**
   * Preload local data - DISABLED on Android
   */
  async preload(localId: string): Promise<void> {
    if (!this.ENABLED) {
      return; // ✅ CRITICAL: No preloading on Android
    }

    if (this.cache.has(localId) || this.preloadQueue.has(localId)) {
      return;
    }

    this.preloadQueue.add(localId);
    
    if (!this.isPreloading) {
      this.processQueue();
    }
  }

  /**
   * Preload multiple locals - DISABLED on Android
   */
  async preloadMultiple(localIds: string[]): Promise<void> {
    if (!this.ENABLED) {
      return; // ✅ CRITICAL: No preloading on Android
    }

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
   * Process preload queue - iOS only
   */
  private async processQueue(): Promise<void> {
    if (!this.ENABLED || this.isPreloading || this.preloadQueue.size === 0) {
      return;
    }

    this.isPreloading = true;

    // ✅ Process only 2 at a time (was 5) to reduce load
    const batch = Array.from(this.preloadQueue).slice(0, 2);
    
    const promises = batch.map(async (localId) => {
      this.preloadQueue.delete(localId);
      
      try {
        const { data, error } = await supabase
          .from('locales')
          .select('*')
          .eq('id', localId)
          .single();

        if (!error && data) {
          if (this.cache.size >= this.MAX_CACHE_SIZE) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
          }

          this.cache.set(localId, {
            id: localId,
            data: data,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        // Silent error
      }
    });

    await Promise.all(promises);

    this.isPreloading = false;

    // ✅ Add delay before processing next batch (was immediate)
    if (this.preloadQueue.size > 0) {
      setTimeout(() => this.processQueue(), 500);
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.preloadQueue.clear();
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
   * Warm up cache - DISABLED on Android
   */
  async warmUpCache(localIds: string[]): Promise<void> {
    if (!this.ENABLED) {
      return; // ✅ CRITICAL: No cache warming on Android
    }

    await this.preloadMultiple(localIds);
  }
}

export const localPreloader = new LocalPreloader();
