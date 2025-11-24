
/**
 * Performance Manager
 * Central hub for all performance optimizations
 * Instagram-like instant response and speed
 */

import { advancedCache } from './advancedCache';
import { intelligentPreloader } from './intelligentPreloader';
import { realtimeMessaging } from './realtimeMessaging';
import { socialCache } from './socialCache';
import { optimisticUI } from './optimisticUI';
import { backgroundSync } from './backgroundSync';
import { requestDeduplicator } from './requestDeduplicator';

interface PerformanceConfig {
  enableAdvancedCache: boolean;
  enableIntelligentPreload: boolean;
  enableRealtimeMessaging: boolean;
  enableImageOptimization: boolean;
  enableOptimisticUI: boolean;
  enableBackgroundSync: boolean;
  enableRequestDedup: boolean;
  cacheStrategy: 'aggressive' | 'balanced' | 'conservative';
}

class PerformanceManager {
  private config: PerformanceConfig = {
    enableAdvancedCache: true,
    enableIntelligentPreload: true,
    enableRealtimeMessaging: true,
    enableImageOptimization: true,
    enableOptimisticUI: true,
    enableBackgroundSync: true,
    enableRequestDedup: true,
    cacheStrategy: 'aggressive',
  };

  private initialized: boolean = false;

  /**
   * Initialize performance optimizations
   */
  async initialize(userId?: string, config?: Partial<PerformanceConfig>): Promise<void> {
    if (this.initialized) {
      console.log('[PerformanceManager] Already initialized');
      return;
    }

    console.log('[PerformanceManager] 🚀 Initializing Instagram-like performance optimizations...');

    // Merge config
    this.config = { ...this.config, ...config };

    // Initialize based on config
    if (this.config.enableAdvancedCache) {
      console.log('[PerformanceManager] ✅ Advanced cache enabled');
    }

    if (this.config.enableIntelligentPreload && userId) {
      console.log('[PerformanceManager] ✅ Intelligent preload enabled');
      // Preload critical data in background (non-blocking)
      setTimeout(() => {
        intelligentPreloader.preloadOnStart(userId);
      }, 100);
    }

    if (this.config.enableRealtimeMessaging) {
      console.log('[PerformanceManager] ✅ Real-time messaging enabled');
    }

    if (this.config.enableOptimisticUI) {
      console.log('[PerformanceManager] ✅ Optimistic UI enabled');
    }

    if (this.config.enableBackgroundSync) {
      console.log('[PerformanceManager] ✅ Background sync enabled');
      backgroundSync.initialize();
    }

    if (this.config.enableRequestDedup) {
      console.log('[PerformanceManager] ✅ Request deduplication enabled');
    }

    this.initialized = true;
    console.log('[PerformanceManager] ✅ All performance optimizations initialized');
  }

  /**
   * Get data with caching and request deduplication
   */
  async getData<T>(
    key: string,
    fetchFn: () => Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'medium',
    options: {
      forceRefresh?: boolean;
      ttl?: number;
    } = {}
  ): Promise<T> {
    const { forceRefresh = false, ttl = 0 } = options;

    // Try cache first (unless force refresh)
    if (!forceRefresh && this.config.enableAdvancedCache) {
      const cached = await advancedCache.get<T>(key);
      if (cached) {
        console.log(`[PerformanceManager] ⚡ INSTANT from cache: ${key}`);
        return cached;
      }
    }

    // Use request deduplication to prevent duplicate calls
    if (this.config.enableRequestDedup) {
      return requestDeduplicator.execute(
        key,
        async () => {
          console.log(`[PerformanceManager] 📡 Fetching: ${key}`);
          const data = await fetchFn();
          
          // Cache the result
          if (this.config.enableAdvancedCache) {
            await advancedCache.set(key, data, priority);
          }
          
          return data;
        },
        { ttl, forceRefresh }
      );
    }

    // Fallback: direct fetch
    const data = await fetchFn();
    if (this.config.enableAdvancedCache) {
      await advancedCache.set(key, data, priority);
    }
    return data;
  }

  /**
   * Preload content
   */
  async preloadContent(
    type: 'stories' | 'posts' | 'messages' | 'all',
    userId: string
  ): Promise<void> {
    if (!this.config.enableIntelligentPreload) {
      return;
    }

    console.log(`[PerformanceManager] 🚀 Preloading ${type}...`);

    switch (type) {
      case 'stories':
        // Preload will be done by intelligentPreloader
        break;
      case 'posts':
        // Preload will be done by intelligentPreloader
        break;
      case 'messages':
        await intelligentPreloader.preloadRecentMessages(userId);
        break;
      case 'all':
        await intelligentPreloader.smartPreload(userId);
        break;
    }
  }

  /**
   * Subscribe to real-time updates
   */
  subscribeToChat(
    chatId: string,
    userId: string,
    onMessage: (message: any) => void
  ): () => void {
    if (!this.config.enableRealtimeMessaging) {
      return () => {};
    }

    return realtimeMessaging.subscribeToChat(chatId, userId, onMessage);
  }

  /**
   * Send message with real-time delivery
   */
  async sendMessage(
    chatId: string,
    userId: string,
    content: string
  ): Promise<any> {
    if (!this.config.enableRealtimeMessaging) {
      // Fallback to regular message sending
      return null;
    }

    return realtimeMessaging.sendMessage(chatId, userId, content);
  }

  /**
   * Invalidate cache
   */
  async invalidateCache(pattern?: string): Promise<void> {
    if (!this.config.enableAdvancedCache) {
      return;
    }

    if (pattern) {
      await advancedCache.invalidate(pattern);
      socialCache.clearFeed();
    } else {
      await advancedCache.clearAll();
      socialCache.clearAll();
    }

    console.log('[PerformanceManager] 🗑️ Cache invalidated');
  }

  /**
   * Optimistic UI operations
   */
  async toggleLike(
    postId: string,
    userId: string,
    currentLiked: boolean,
    currentLikes: number,
    updateUI: (liked: boolean, likes: number) => void
  ): Promise<boolean> {
    if (!this.config.enableOptimisticUI) {
      // Fallback to non-optimistic
      return !currentLiked;
    }

    return optimisticUI.togglePostLike(
      postId,
      userId,
      currentLiked,
      currentLikes,
      updateUI
    );
  }

  async toggleSave(
    postId: string,
    userId: string,
    currentSaved: boolean,
    updateUI: (saved: boolean) => void
  ): Promise<boolean> {
    if (!this.config.enableOptimisticUI) {
      // Fallback to non-optimistic
      return !currentSaved;
    }

    return optimisticUI.togglePostSave(
      postId,
      userId,
      currentSaved,
      updateUI
    );
  }

  async toggleFollow(
    targetUserId: string,
    currentUserId: string,
    currentFollowing: boolean,
    updateUI: (following: boolean, followerCount: number) => void,
    currentFollowerCount: number
  ): Promise<boolean> {
    if (!this.config.enableOptimisticUI) {
      // Fallback to non-optimistic
      return !currentFollowing;
    }

    return optimisticUI.toggleFollow(
      targetUserId,
      currentUserId,
      currentFollowing,
      updateUI,
      currentFollowerCount
    );
  }

  /**
   * Background sync operations
   */
  preloadInBackground(
    type: 'stories' | 'posts' | 'images',
    data: any[],
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): void {
    if (!this.config.enableBackgroundSync) {
      return;
    }

    backgroundSync.preloadContent(type, data, priority);
  }

  syncInBackground(
    dataType: string,
    syncFn: () => Promise<void>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): void {
    if (!this.config.enableBackgroundSync) {
      return;
    }

    backgroundSync.syncData(dataType, syncFn, priority);
  }

  /**
   * Get comprehensive performance statistics
   */
  async getStats(): Promise<{
    cache: any;
    preloader: any;
    messaging: any;
    optimisticUI: any;
    backgroundSync: any;
    requestDedup: any;
  }> {
    const cacheStats = await advancedCache.getStats();
    const socialCacheStats = socialCache.getStats();
    const optimisticUIStats = optimisticUI.getStats();
    const backgroundSyncStats = backgroundSync.getStats();
    const requestDedupStats = requestDeduplicator.getStats();

    return {
      cache: {
        advanced: cacheStats,
        social: socialCacheStats,
      },
      preloader: {
        enabled: this.config.enableIntelligentPreload,
      },
      messaging: {
        enabled: this.config.enableRealtimeMessaging,
      },
      optimisticUI: {
        enabled: this.config.enableOptimisticUI,
        ...optimisticUIStats,
      },
      backgroundSync: {
        enabled: this.config.enableBackgroundSync,
        ...backgroundSyncStats,
      },
      requestDedup: {
        enabled: this.config.enableRequestDedup,
        ...requestDedupStats,
      },
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log('[PerformanceManager] 🧹 Cleaning up...');

    // Unsubscribe from all real-time channels
    if (this.config.enableRealtimeMessaging) {
      realtimeMessaging.unsubscribeAll();
    }

    // Clear preload queue
    if (this.config.enableIntelligentPreload) {
      intelligentPreloader.clearQueue();
    }

    // Wait for pending optimistic updates
    if (this.config.enableOptimisticUI) {
      await optimisticUI.waitForPending(3000);
    }

    // Cleanup background sync
    if (this.config.enableBackgroundSync) {
      backgroundSync.cleanup();
    }

    // Clear request deduplicator
    if (this.config.enableRequestDedup) {
      requestDeduplicator.clearAll();
    }

    this.initialized = false;
    console.log('[PerformanceManager] ✅ Cleanup complete');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[PerformanceManager] ⚙️ Configuration updated:', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const performanceManager = new PerformanceManager();
