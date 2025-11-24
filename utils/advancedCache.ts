
/**
 * Advanced Multi-Layer Caching System
 * Instagram-like performance with aggressive caching strategies
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  priority: 'high' | 'medium' | 'low';
}

interface CacheConfig {
  maxMemorySize: number;
  maxDiskSize: number;
  defaultTTL: number;
  highPriorityTTL: number;
  mediumPriorityTTL: number;
  lowPriorityTTL: number;
}

class AdvancedCache {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private accessCount: Map<string, number> = new Map();
  private lastAccess: Map<string, number> = new Map();
  
  private config: CacheConfig = {
    maxMemorySize: 1000,
    maxDiskSize: 5000,
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    highPriorityTTL: 30 * 60 * 1000, // 30 minutes
    mediumPriorityTTL: 15 * 60 * 1000, // 15 minutes
    lowPriorityTTL: 5 * 60 * 1000, // 5 minutes
  };

  /**
   * Get TTL based on priority
   */
  private getTTL(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high':
        return this.config.highPriorityTTL;
      case 'medium':
        return this.config.mediumPriorityTTL;
      case 'low':
        return this.config.lowPriorityTTL;
      default:
        return this.config.defaultTTL;
    }
  }

  /**
   * LRU eviction - Remove least recently used items
   */
  private evictLRU(): void {
    if (this.memoryCache.size < this.config.maxMemorySize) return;

    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    this.lastAccess.forEach((time, key) => {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      this.accessCount.delete(oldestKey);
      this.lastAccess.delete(oldestKey);
      console.log('[AdvancedCache] 🗑️ Evicted LRU item:', oldestKey);
    }
  }

  /**
   * Set item in memory cache with priority
   */
  setMemory<T>(
    key: string,
    data: T,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): void {
    this.evictLRU();

    const ttl = this.getTTL(priority);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      priority,
    };

    this.memoryCache.set(key, entry);
    this.lastAccess.set(key, Date.now());
    this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
  }

  /**
   * Get item from memory cache
   */
  getMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    
    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      this.accessCount.delete(key);
      this.lastAccess.delete(key);
      return null;
    }

    // Update access tracking
    this.lastAccess.set(key, Date.now());
    this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);

    return entry.data as T;
  }

  /**
   * Set item in persistent storage
   */
  async setDisk<T>(
    key: string,
    data: T,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> {
    try {
      const ttl = this.getTTL(priority);
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
        priority,
      };

      await AsyncStorage.setItem(`adv_cache:${key}`, JSON.stringify(entry));
    } catch (error) {
      console.error('[AdvancedCache] Error setting disk cache:', error);
    }
  }

  /**
   * Get item from persistent storage
   */
  async getDisk<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(`adv_cache:${key}`);
      
      if (!value) return null;

      const entry: CacheEntry<T> = JSON.parse(value);

      // Check expiration
      if (Date.now() > entry.expiresAt) {
        await AsyncStorage.removeItem(`adv_cache:${key}`);
        return null;
      }

      // Promote to memory cache
      this.setMemory(key, entry.data, entry.priority);

      return entry.data;
    } catch (error) {
      console.error('[AdvancedCache] Error getting disk cache:', error);
      return null;
    }
  }

  /**
   * Hybrid get - Memory first, then disk
   */
  async get<T>(key: string): Promise<T | null> {
    // Try memory first (instant)
    const memoryData = this.getMemory<T>(key);
    if (memoryData) {
      console.log(`[AdvancedCache] ⚡ INSTANT from memory: ${key}`);
      return memoryData;
    }

    // Try disk
    const diskData = await this.getDisk<T>(key);
    if (diskData) {
      console.log(`[AdvancedCache] 💾 From disk: ${key}`);
      return diskData;
    }

    console.log(`[AdvancedCache] ❌ MISS: ${key}`);
    return null;
  }

  /**
   * Hybrid set - Both memory and disk
   */
  async set<T>(
    key: string,
    data: T,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> {
    this.setMemory(key, data, priority);
    await this.setDisk(key, data, priority);
  }

  /**
   * Batch get - Parallel retrieval
   */
  async batchGet<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();

    await Promise.all(
      keys.map(async (key) => {
        const data = await this.get<T>(key);
        if (data) {
          results.set(key, data);
        }
      })
    );

    return results;
  }

  /**
   * Batch set - Parallel storage
   */
  async batchSet<T>(
    entries: Array<{ key: string; data: T; priority?: 'high' | 'medium' | 'low' }>
  ): Promise<void> {
    await Promise.all(
      entries.map(({ key, data, priority = 'medium' }) =>
        this.set(key, data, priority)
      )
    );
  }

  /**
   * Preload data with priority
   */
  async preload<T>(
    keys: string[],
    fetchFn: (key: string) => Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> {
    console.log(`[AdvancedCache] 🚀 Preloading ${keys.length} items with priority: ${priority}`);

    await Promise.all(
      keys.map(async (key) => {
        try {
          // Check if already cached
          const cached = await this.get<T>(key);
          if (cached) return;

          // Fetch and cache
          const data = await fetchFn(key);
          await this.set(key, data, priority);
        } catch (error) {
          console.error(`[AdvancedCache] Error preloading ${key}:`, error);
        }
      })
    );

    console.log(`[AdvancedCache] ✅ Preloading complete`);
  }

  /**
   * Invalidate cache entries matching pattern
   */
  async invalidate(pattern: string): Promise<void> {
    // Clear from memory
    const keysToDelete: string[] = [];
    this.memoryCache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.memoryCache.delete(key);
      this.accessCount.delete(key);
      this.lastAccess.delete(key);
    });

    // Clear from disk
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(
        key => key.startsWith('adv_cache:') && key.includes(pattern)
      );
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('[AdvancedCache] Error invalidating disk cache:', error);
    }

    console.log(`[AdvancedCache] 🗑️ Invalidated pattern: ${pattern}`);
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    this.memoryCache.clear();
    this.accessCount.clear();
    this.lastAccess.clear();

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith('adv_cache:'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('[AdvancedCache] Error clearing disk cache:', error);
    }

    console.log('[AdvancedCache] 🗑️ All caches cleared');
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memorySize: number;
    memoryKeys: string[];
    diskSize: number;
    hotKeys: Array<{ key: string; accessCount: number }>;
  }> {
    const diskKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = diskKeys.filter(key => key.startsWith('adv_cache:'));

    // Get hot keys (most accessed)
    const hotKeys = Array.from(this.accessCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, accessCount]) => ({ key, accessCount }));

    return {
      memorySize: this.memoryCache.size,
      memoryKeys: Array.from(this.memoryCache.keys()),
      diskSize: cacheKeys.length,
      hotKeys,
    };
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(keys: string[], fetchFn: (key: string) => Promise<any>): Promise<void> {
    console.log(`[AdvancedCache] 🔥 Warming up cache with ${keys.length} items...`);
    await this.preload(keys, fetchFn, 'high');
  }
}

// Export singleton instance
export const advancedCache = new AdvancedCache();
