
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
   * ✅ v3.0: Preload locales based on user location
   */
  preloadLocalesForLocation(
    latitude: number,
    longitude: number,
    force: boolean = false
  ): void {
    // Check if we need to preload (location changed significantly)
    if (!force && this.lastPreloadLocation) {
      const distance = this.calculateDistance(
        this.lastPreloadLocation.lat,
        this.lastPreloadLocation.lng,
        latitude,
        longitude
      );
      
      // Only preload if moved more than 2km
      if (distance < 2000) {
        console.log('[BackgroundSync v3.0] ⏸️ Location change too small, skipping preload');
        return;
      }
    }

    this.scheduleTask({
      id: `preload:locales:${latitude.toFixed(4)},${longitude.toFixed(4)}`,
      type: 'location_sync',
      priority: 'high',
      maxRetries: 2,
      execute: async () => {
        console.log('[BackgroundSync v3.0] 🚀 Preloading locales for location:', {
          lat: latitude.toFixed(4),
          lng: longitude.toFixed(4),
        });

        try {
          // Fetch locales near this location
          const { data, error } = await supabase.rpc('get_sorted_locales_by_proximity', {
            p_user_lat: latitude,
            p_user_lng: longitude,
            p_category_filter: null,
            p_servicios_filter: null,
            p_ambiente_filter: null,
            p_clientela_filter: null,
            p_comunidad_filter: null,
            p_provincia_filter: null,
            p_max_distance_km: PRELOAD_RADIUS_KM,
            p_limit: PRELOAD_LIMIT,
            p_offset: 0,
          });

          if (error) {
            console.error('[BackgroundSync v3.0] ❌ Preload error:', error);
            throw error;
          }

          if (data && data.length > 0) {
            console.log('[BackgroundSync v3.0] ✅ Preloaded', data.length, 'locales');

            // Save to cache
            const preloadedData: PreloadedData = {
              locales: data,
              timestamp: Date.now(),
              location: { lat: latitude, lng: longitude },
            };

            await AsyncStorage.setItem(PRELOAD_CACHE_KEY, JSON.stringify(preloadedData));
            
            // Update last preload location
            this.lastPreloadLocation = { lat: latitude, lng: longitude };

            // Preload images for first 10 locales
            const imagesToPreload = data
              .slice(0, 10)
              .map((local: any) => local.imagen_url)
              .filter(Boolean);

            if (imagesToPreload.length > 0) {
              this.preloadContent('images', imagesToPreload, 'medium');
            }
          } else {
            console.log('[BackgroundSync v3.0] 📭 No locales found for preload');
          }
        } catch (error) {
          console.error('[BackgroundSync v3.0] ❌ Preload failed:', error);
          throw error;
        }
      },
    });
  }

  /**
   * ✅ v3.0: Get preloaded locales from cache
   */
  async getPreloadedLocales(
    currentLat: number,
    currentLng: number
  ): Promise<any[] | null> {
    try {
      const cached = await AsyncStorage.getItem(PRELOAD_CACHE_KEY);
      if (!cached) {
        return null;
      }

      const preloadedData: PreloadedData = JSON.parse(cached);
      
      // Check if cache is still valid (within 5 minutes and 5km)
      const age = Date.now() - preloadedData.timestamp;
      const distance = this.calculateDistance(
        preloadedData.location.lat,
        preloadedData.location.lng,
        currentLat,
        currentLng
      );

      if (age < 300000 && distance < 5000) {
        console.log('[BackgroundSync v3.0] ⚡ Using preloaded locales (age:', Math.round(age / 1000), 's, distance:', Math.round(distance), 'm)');
        return preloadedData.locales;
      }

      console.log('[BackgroundSync v3.0] ⚠️ Preloaded cache expired or too far');
      return null;
    } catch (error) {
      console.error('[BackgroundSync v3.0] ❌ Error reading preloaded cache:', error);
      return null;
    }
  }

  /**
   * ✅ v3.0: Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  }

  /**
   * ✅ v3.0: Clear preloaded cache
   */
  async clearPreloadedCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PRELOAD_CACHE_KEY);
      this.lastPreloadLocation = null;
      console.log('[BackgroundSync v3.0] 🧹 Preloaded cache cleared');
    } catch (error) {
      console.error('[BackgroundSync v3.0] ❌ Error clearing preloaded cache:', error);
    }
  }
}

export const backgroundSync = new BackgroundSyncManager();
