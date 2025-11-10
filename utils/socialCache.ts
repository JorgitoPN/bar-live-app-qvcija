
/**
 * Social Cache Utility
 * Ultra-fast caching for social network data
 * OPTIMIZED FOR INSTANT LOADING
 */

import { supabase } from './supabase';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class SocialCache {
  private postsCache: Map<string, CacheEntry<any>> = new Map();
  private storiesCache: Map<string, CacheEntry<any>> = new Map();
  private userCache: Map<string, CacheEntry<any>> = new Map();
  private feedCache: CacheEntry<any[]> | null = null;
  
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 200;

  /**
   * Get cached feed
   */
  getFeed(): any[] | null {
    if (!this.feedCache) return null;
    
    const now = Date.now();
    if (now - this.feedCache.timestamp > this.CACHE_DURATION) {
      this.feedCache = null;
      return null;
    }

    console.log('[SocialCache] ⚡ INSTANT FEED from cache');
    return this.feedCache.data;
  }

  /**
   * Set feed cache
   */
  setFeed(posts: any[]): void {
    this.feedCache = {
      data: posts,
      timestamp: Date.now(),
    };
    console.log('[SocialCache] Feed cached:', posts.length, 'posts');
  }

  /**
   * Get cached post
   */
  getPost(postId: string): any | null {
    const cached = this.postsCache.get(postId);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_DURATION) {
      this.postsCache.delete(postId);
      return null;
    }

    console.log('[SocialCache] ⚡ INSTANT POST from cache:', postId);
    return cached.data;
  }

  /**
   * Set post cache
   */
  setPost(postId: string, post: any): void {
    if (this.postsCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.postsCache.keys().next().value;
      this.postsCache.delete(firstKey);
    }

    this.postsCache.set(postId, {
      data: post,
      timestamp: Date.now(),
    });
  }

  /**
   * Update post in cache (for likes, saves, etc.)
   */
  updatePost(postId: string, updates: Partial<any>): void {
    const cached = this.postsCache.get(postId);
    if (cached) {
      cached.data = { ...cached.data, ...updates };
      cached.timestamp = Date.now();
    }

    // Also update in feed cache
    if (this.feedCache) {
      this.feedCache.data = this.feedCache.data.map(post =>
        post.id === postId ? { ...post, ...updates } : post
      );
    }
  }

  /**
   * Get cached stories
   */
  getStories(userId?: string): any[] | null {
    const key = userId || 'all';
    const cached = this.storiesCache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_DURATION) {
      this.storiesCache.delete(key);
      return null;
    }

    console.log('[SocialCache] ⚡ INSTANT STORIES from cache');
    return cached.data;
  }

  /**
   * Set stories cache
   */
  setStories(stories: any[], userId?: string): void {
    const key = userId || 'all';
    this.storiesCache.set(key, {
      data: stories,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cached user
   */
  getUser(userId: string): any | null {
    const cached = this.userCache.get(userId);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_DURATION) {
      this.userCache.delete(userId);
      return null;
    }

    return cached.data;
  }

  /**
   * Set user cache
   */
  setUser(userId: string, user: any): void {
    if (this.userCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.userCache.keys().next().value;
      this.userCache.delete(firstKey);
    }

    this.userCache.set(userId, {
      data: user,
      timestamp: Date.now(),
    });
  }

  /**
   * Preload posts in background
   */
  async preloadPosts(postIds: string[]): Promise<void> {
    const uncachedIds = postIds.filter(id => !this.postsCache.has(id));
    
    if (uncachedIds.length === 0) return;

    console.log('[SocialCache] Preloading', uncachedIds.length, 'posts');

    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          autor:usuarios!posts_autor_id_fkey(nombre, avatar, username)
        `)
        .in('id', uncachedIds);

      if (!error && data) {
        data.forEach(post => {
          this.setPost(post.id, post);
        });
      }
    } catch (error) {
      console.error('[SocialCache] Error preloading posts:', error);
    }
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.postsCache.clear();
    this.storiesCache.clear();
    this.userCache.clear();
    this.feedCache = null;
    console.log('[SocialCache] All caches cleared');
  }

  /**
   * Clear specific cache
   */
  clearFeed(): void {
    this.feedCache = null;
  }

  clearPost(postId: string): void {
    this.postsCache.delete(postId);
  }

  clearStories(userId?: string): void {
    const key = userId || 'all';
    this.storiesCache.delete(key);
  }

  /**
   * Get cache stats
   */
  getStats(): { posts: number; stories: number; users: number; hasFeed: boolean } {
    return {
      posts: this.postsCache.size,
      stories: this.storiesCache.size,
      users: this.userCache.size,
      hasFeed: this.feedCache !== null,
    };
  }
}

// Export singleton instance
export const socialCache = new SocialCache();
