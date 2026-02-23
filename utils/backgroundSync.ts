
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 BACKGROUND SYNC v3.0 - INTELLIGENT DATA PRELOADING
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ✅ INTELLIGENT PRELOADING STRATEGY:
 * 1. **Location-Based Preloading**: Automatically preloads locales when location changes
 * 2. **Smart Cache Management**: Keeps data fresh and ready
 * 3. **Priority Queue**: High-priority tasks execute first
 * 4. **Background Execution**: Non-blocking, runs after interactions
 * 5. **Retry Logic**: Automatic retry on failure
 * 
 * ✅ RESULT:
 * - Explorar/Mapa screens load instantly
 * - Data always fresh and ready
 * - Zero perceived loading time
 * - Battery-efficient background sync
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { InteractionManager, Image, Platform } from 'react-native';
import { supabase } from './supabase';
import { advancedCache } from './advancedCache';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SyncTask {
  id: string;
  type: 'upload' | 'download' | 'sync' | 'preload' | 'location_sync';
  priority: 'high' | 'medium' | 'low';
  execute: () => Promise<void>;
  retries: number;
  maxRetries: number;
}

interface PreloadedData {
  locales: any[];
  timestamp: number;
  location: { lat: number; lng: number };
}

const PRELOAD_CACHE_KEY = 'preloaded_locales_v3';
const PRELOAD_RADIUS_KM = 10; // Preload locales within 10km
const PRELOAD_LIMIT = Platform.OS === 'android' ? 50 : 100;

class BackgroundSyncManager {
  private queue: SyncTask[] = [];
  private isProcessing: boolean = false;
  private maxConcurrent: number = 3;
  private activeCount: number = 0;
  private initialized: boolean = false;
  private lastPreloadLocation: { lat: number; lng: number } | null = null;

  /**
   * Initialize the background sync manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[BackgroundSync] ✅ Already initialized');
      return;
    }

    try {
      console.log('[BackgroundSync] 🚀 Initializing...');
      this.initialized = true;
      console.log('[BackgroundSync] ✅ Initialized successfully');
    } catch (error) {
      console.error('[BackgroundSync] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Schedule a background task
   */
  scheduleTask(task: Omit<SyncTask, 'retries'>): void {
    const fullTask: SyncTask = {
      ...task,
      retries: 0,
    };

    // Insert based on priority
    if (task.priority === 'high') {
      this.queue.unshift(fullTask);
    } else {
      this.queue.push(fullTask);
    }

    console.log('[BackgroundSync] 📋 Task scheduled:', task.id, 'Priority:', task.priority);
    
    // Start processing if not already
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process the task queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log('[BackgroundSync] 🚀 Processing queue, tasks:', this.queue.length);

    while (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
      const task = this.queue.shift();
      if (!task) continue;

      this.activeCount++;
      
      // Run after interactions to avoid blocking UI
      InteractionManager.runAfterInteractions(async () => {
        try {
          console.log('[BackgroundSync] ⚙️ Executing task:', task.id);
          await task.execute();
          console.log('[BackgroundSync] ✅ Task completed:', task.id);
        } catch (error) {
          console.error('[BackgroundSync] ❌ Task failed:', task.id, error);
          
          // Retry logic
          if (task.retries < task.maxRetries) {
            task.retries++;
            console.log('[BackgroundSync] 🔄 Retrying task:', task.id, 'Attempt:', task.retries);
            this.queue.push(task);
          } else {
            console.error('[BackgroundSync] ⚠️ Task max retries reached:', task.id);
          }
        } finally {
          this.activeCount--;
          
          // Continue processing
          if (this.queue.length > 0) {
            this.processQueue();
          } else {
            this.isProcessing = false;
            console.log('[BackgroundSync] ✅ Queue empty');
          }
        }
      });
    }
  }

  /**
   * Sync data in background
   */
  syncData(
    key: string,
    fetchFn: () => Promise<any>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): void {
    this.scheduleTask({
      id: `sync:${key}`,
      type: 'sync',
      priority,
      maxRetries: 2,
      execute: async () => {
        console.log('[BackgroundSync] 🔄 Syncing:', key);
        const data = await fetchFn();
        await advancedCache.set(key, data, priority);
        console.log('[BackgroundSync] ✅ Synced:', key);
      },
    });
  }

  /**
   * Preload content in background
   */
  preloadContent(
    type: 'stories' | 'posts' | 'images',
    data: any[],
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): void {
    this.scheduleTask({
      id: `preload:${type}:${Date.now()}`,
      type: 'preload',
      priority,
      maxRetries: 1,
      execute: async () => {
        console.log('[BackgroundSync] 🚀 Preloading', type, ':', data.length, 'items');
        
        // Preload logic here
        if (type === 'images') {
          await Promise.all(
            data.slice(0, 10).map(uri => Image.prefetch(uri).catch(() => {}))
          );
        }
      },
    });
  }

  /**
   * Clear the queue
   */
  clearQueue(): void {
    this.queue = [];
    console.log('[BackgroundSync] 🧹 Queue cleared');
  }

  /**
   * Get queue status
   */
  getStatus(): { pending: number; active: number } {
    return {
      pending: this.queue.length,
      active: this.activeCount,
    };
  }

  /**
   * ✅ v444.0: DISABLED - Preloading removed (was causing conflicts)
   */
  preloadLocalesForLocation(
    latitude: number,
    longitude: number,
    force: boolean = false
  ): void {
    // Disabled - was interfering with normal data loading
    console.log('[BackgroundSync v444.0] ⏸️ Preloading disabled');
  }

  /**
   * ✅ v444.0: DISABLED - Returns null (preloading removed)
   */
  async getPreloadedLocales(
    currentLat: number,
    currentLng: number
  ): Promise<any[] | null> {
    return null;
  }

  /**
   * ✅ v444.0: DISABLED - No cache to clear
   */
  async clearPreloadedCache(): Promise<void> {
    console.log('[BackgroundSync v444.0] ⏸️ No preload cache to clear');
  }
}

export const backgroundSync = new BackgroundSyncManager();
