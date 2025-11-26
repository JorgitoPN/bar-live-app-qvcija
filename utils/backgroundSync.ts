
import { InteractionManager, Image } from 'react-native';
import { supabase } from './supabase';
import { advancedCache } from './advancedCache';

interface SyncTask {
  id: string;
  type: 'upload' | 'download' | 'sync' | 'preload';
  priority: 'high' | 'medium' | 'low';
  execute: () => Promise<void>;
  retries: number;
  maxRetries: number;
}

class BackgroundSyncManager {
  private queue: SyncTask[] = [];
  private isProcessing: boolean = false;
  private maxConcurrent: number = 3;
  private activeCount: number = 0;
  private initialized: boolean = false;

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
}

export const backgroundSync = new BackgroundSyncManager();
