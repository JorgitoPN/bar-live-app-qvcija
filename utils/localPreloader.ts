
/**
 * Local Preloader Utility v4.0 - COMPLETE GUEST MODE ARCHITECTURE
 * ✅ ANDROID CRITICAL PERFORMANCE FIX - FINAL VERSION
 * 
 * v4.0 CHANGES (FINAL GUEST MODE REPLICATION):
 * - COMPLETELY DISABLED on Android (100% guest mode architecture)
 * - Guest mode = no preloading = instant UI = smooth navigation
 * - Authenticated users now get IDENTICAL experience to guests
 * - Data loads ONLY on-demand when user navigates to specific screens
 * - Zero eager loading, zero background prefetching on Android
 * - Result: Perfect performance parity between guest and authenticated modes
 * 
 * v3.0 CHANGES (GUEST MODE REPLICATION):
 * - DISABLED on Android to replicate guest mode instant experience
 * - Guest mode = no preloading = instant UI = smooth navigation
 * - Authenticated users now get same instant experience as guests
 * - Data loads on-demand when user navigates to specific screens
 * - No eager loading, no background prefetching on Android
 * 
 * WHY THIS WORKS:
 * - Guest mode is fast because it doesn't preload anything
 * - We replicate this by disabling all preloading for authenticated users
 * - Result: Identical performance between guest and authenticated modes
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
  private readonly ENABLED = Platform.OS !== 'android'; // ✅ v3.0: DISABLED on Android (guest mode architecture)

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
