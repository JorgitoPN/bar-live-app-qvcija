
import { InteractionManager, Image } from 'react-native';
import { supabase } from './supabase';
import { advancedCache } from './advancedCache';

interface SyncTask {
  id: string;
  type: 'preload' | 'sync' | 'cleanup';
  priority: 'high' | 'medium' | 'low';
  execute: () => Promise<void>;
  retries: number;
  maxRetries: number;
}

class BackgroundSync {
  private taskQueue: SyncTask[] = [];
  private isProcessing = false;
  private readonly MAX_CONCURRENT_TASKS = 3;

  scheduleTask(task: Omit<SyncTask, 'retries'>): void {
    const fullTask: SyncTask = {
      ...task,
      retries: 0,
    };

    // Insert based on priority
    const insertIndex = this.taskQueue.findIndex(
      t => this.getPriorityValue(t.priority) < this.getPriorityValue(fullTask.priority)
    );

    if (insertIndex === -1) {
      this.taskQueue.push(fullTask);
    } else {
      this.taskQueue.splice(insertIndex, 0, fullTask);
    }

    console.log('[BackgroundSync] 📋 Task scheduled:', task.id, 'Priority:', task.priority);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.taskQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      if (!task) break;

      try {
        console.log('[BackgroundSync] ⚙️ Executing task:', task.id);
        
        // Wait for interactions to complete
        await new Promise(resolve => {
          InteractionManager.runAfterInteractions(() => {
            resolve(undefined);
          });
        });

        await task.execute();
        console.log('[BackgroundSync] ✅ Task completed:', task.id);
      } catch (error) {
        console.error('[BackgroundSync] ❌ Task failed:', task.id, error);
        
        if (task.retries < task.maxRetries) {
          task.retries++;
          console.log('[BackgroundSync] 🔄 Retrying task:', task.id, 'Attempt:', task.retries);
          this.taskQueue.push(task);
        }
      }

      // Small delay between tasks
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessing = false;
  }

  // ✅ FIXED: Changed require() to import (Image is already imported at the top)
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
        
        if (type === 'images') {
          await Promise.all(
            data.slice(0, 10).map(uri => Image.prefetch(uri).catch(() => {
              console.log('[BackgroundSync] Failed to preload image:', uri);
            }))
          );
        }
      },
    });
  }

  syncData(
    key: string,
    fetchFn: () => Promise<any>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): void {
    this.scheduleTask({
      id: `sync:${key}:${Date.now()}`,
      type: 'sync',
      priority,
      maxRetries: 3,
      execute: async () => {
        console.log('[BackgroundSync] 🔄 Syncing data:', key);
        const data = await fetchFn();
        await advancedCache.set(key, data, priority);
      },
    });
  }

  cleanup(
    key: string,
    cleanupFn: () => Promise<void>,
    priority: 'high' | 'medium' | 'low' = 'low'
  ): void {
    this.scheduleTask({
      id: `cleanup:${key}:${Date.now()}`,
      type: 'cleanup',
      priority,
      maxRetries: 1,
      execute: async () => {
        console.log('[BackgroundSync] 🧹 Cleaning up:', key);
        await cleanupFn();
      },
    });
  }

  private getPriorityValue(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
      default:
        return 0;
    }
  }

  getQueueSize(): number {
    return this.taskQueue.length;
  }

  clearQueue(): void {
    console.log('[BackgroundSync] 🗑️ Clearing task queue');
    this.taskQueue = [];
  }
}

export const backgroundSync = new BackgroundSync();
