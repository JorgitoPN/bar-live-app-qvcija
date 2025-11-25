
/**
 * Background Sync Manager
 * Handles non-blocking background operations
 * Keeps UI responsive while syncing data
 */

import { InteractionManager } from 'react-native';
import { supabase } from './supabase';
import { advancedCache } from './advancedCache';

interface SyncTask {
  id: string;
  type: 'cleanup' | 'preload' | 'sync' | 'analytics';
  priority: 'high' | 'medium' | 'low';
  execute: () => Promise<void>;
  retries: number;
  maxRetries: number;
}

class BackgroundSyncManager {
  private taskQueue: SyncTask[] = [];
  private isProcessing: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize background sync
   */
  initialize(): void {
    console.log('[BackgroundSync] 🚀 Initializing...');

    // Start periodic sync every 5 minutes
    this.syncInterval = setInterval(() => {
      this.schedulePeriodicSync();
    }, 5 * 60 * 1000);

    // Initial sync after 10 seconds
    setTimeout(() => {
      this.schedulePeriodicSync();
    }, 10000);
  }

  /**
   * Schedule a background task
   */
  scheduleTask(task: Omit<SyncTask, 'retries'>): void {
    const fullTask: SyncTask = {
      ...task,
      retries: 0,
    };

    // Insert task based on priority
    const insertIndex = this.taskQueue.findIndex(
      t => this.getPriorityValue(t.priority) < this.getPriorityValue(fullTask.priority)
    );

    if (insertIndex === -1) {
      this.taskQueue.push(fullTask);
    } else {
      this.taskQueue.splice(insertIndex, 0, fullTask);
    }

    console.log('[BackgroundSync] 📋 Task scheduled:', task.type, 'Priority:', task.priority);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Get numeric priority value
   */
  private getPriorityValue(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  /**
   * Process task queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.taskQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      if (!task) break;

      try {
        // Wait for interactions to complete (non-blocking)
        await new Promise<void>(resolve => {
          InteractionManager.runAfterInteractions(() => {
            resolve();
          });
        });

        console.log('[BackgroundSync] ⚙️ Executing task:', task.type);
        await task.execute();
        console.log('[BackgroundSync] ✅ Task completed:', task.type);
      } catch (error) {
        console.error('[BackgroundSync] ❌ Task failed:', task.type, error);

        // Retry if not exceeded max retries
        if (task.retries < task.maxRetries) {
          task.retries++;
          this.taskQueue.push(task);
          console.log('[BackgroundSync] 🔄 Retrying task:', task.type, 'Attempt:', task.retries);
        }
      }

      // Small delay between tasks to keep UI responsive
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessing = false;
  }

  /**
   * Schedule periodic sync tasks
   */
  private schedulePeriodicSync(): void {
    console.log('[BackgroundSync] 🔄 Scheduling periodic sync...');

    // Cleanup expired cache
    this.scheduleTask({
      id: `cleanup:${Date.now()}`,
      type: 'cleanup',
      priority: 'low',
      maxRetries: 1,
      execute: async () => {
        // Clean up old cache entries
        const stats = await advancedCache.getStats();
        console.log('[BackgroundSync] 🧹 Cache stats:', stats);
      },
    });

    // Sync analytics
    this.scheduleTask({
      id: `analytics:${Date.now()}`,
      type: 'analytics',
      priority: 'low',
      maxRetries: 2,
      execute: async () => {
        // Track app usage analytics
        console.log('[BackgroundSync] 📊 Syncing analytics...');
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
          const { Image } = require('react-native');
          await Promise.all(
            data.slice(0, 10).map(uri => Image.prefetch(uri).catch(() => {}))
          );
        }
      },
    });
  }

  /**
   * Sync data in background
   */
  syncData(
    dataType: string,
    syncFn: () => Promise<void>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): void {
    this.scheduleTask({
      id: `sync:${dataType}:${Date.now()}`,
      type: 'sync',
      priority,
      maxRetries: 3,
      execute: syncFn,
    });
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    queueLength: number;
    isProcessing: boolean;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  } {
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    this.taskQueue.forEach(task => {
      byType[task.type] = (byType[task.type] || 0) + 1;
      byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
    });

    return {
      queueLength: this.taskQueue.length,
      isProcessing: this.isProcessing,
      byType,
      byPriority,
    };
  }

  /**
   * Clear all tasks
   */
  clearAll(): void {
    this.taskQueue = [];
    console.log('[BackgroundSync] 🗑️ All tasks cleared');
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.clearAll();
    console.log('[BackgroundSync] 🧹 Cleanup complete');
  }
}

// Export singleton instance
export const backgroundSync = new BackgroundSyncManager();
