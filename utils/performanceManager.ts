
/**
 * Performance Manager
 * Central hub for all performance optimizations
 */

import { advancedCache } from './advancedCache';
import { intelligentPreloader } from './intelligentPreloader';
import { realtimeMessaging } from './realtimeMessaging';
import { socialCache } from './socialCache';

interface PerformanceConfig {
  enableAdvancedCache: boolean;
  enableIntelligentPreload: boolean;
  enableRealtimeMessaging: boolean;
  enableImageOptimization: boolean;
  cacheStrategy: 'aggressive' | 'balanced' | 'conservative';
}

class PerformanceManager {
  private config: PerformanceConfig = {
    enableAdvancedCache: true,
    enableIntelligentPreload: true,
    enableRealtimeMessaging: true,
    enableImageOptimization: true,
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

    console.log('[PerformanceManager] 🚀 Initializing performance optimizations...');

    // Merge config
    this.config = { ...this.config, ...config };

    // Initialize based on config
    if (this.config.enableAdvancedCache) {
      console.log('[PerformanceManager] ✅ Advanced cache enabled');
    }

    if (this.config.enableIntelligentPreload && userId) {
      console.log('[PerformanceManager] ✅ Intelligent preload enabled');
      // Preload critical data
      await intelligentPreloader.preloadOnStart(userId);
    }

    if (this.config.enableRealtimeMessaging) {
      console.log('[PerformanceManager] ✅ Real-time messaging enabled');
    }

    this.initialized = true;
    console.log('[PerformanceManager] ✅ Performance optimizations initialized');
  }

  /**
   * Get data with caching
   */
  async getData<T>(
    key: string,
    fetchFn: () => Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> {
    if (!this.config.enableAdvancedCache) {
      return fetchFn();
    }

    // Try cache first
    const cached = await advancedCache.get<T>(key);
    if (cached) {
      console.log(`[PerformanceManager] ⚡ Cache HIT: ${key}`);
      return cached;
    }

    // Fetch and cache
    console.log(`[PerformanceManager] 📡 Cache MISS: ${key}, fetching...`);
    const data = await fetchFn();
    await advancedCache.set(key, data, priority);
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
   * Get performance statistics
   */
  async getStats(): Promise<{
    cache: any;
    preloader: any;
    messaging: any;
  }> {
    const cacheStats = await advancedCache.getStats();
    const socialCacheStats = socialCache.getStats();

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
