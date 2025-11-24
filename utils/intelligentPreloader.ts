
/**
 * Intelligent Preloader
 * Predictive content loading for Instagram-like performance
 */

import { Image } from 'react-native';
import { supabase } from './supabase';
import { advancedCache } from './advancedCache';

interface PreloadConfig {
  stories: boolean;
  posts: boolean;
  images: boolean;
  users: boolean;
  messages: boolean;
}

class IntelligentPreloader {
  private preloadQueue: Set<string> = new Set();
  private isPreloading: boolean = false;
  private userBehavior: Map<string, number> = new Map();

  /**
   * Track user interaction for predictive preloading
   */
  trackInteraction(type: 'story' | 'post' | 'profile' | 'message', id: string): void {
    const key = `${type}:${id}`;
    this.userBehavior.set(key, (this.userBehavior.get(key) || 0) + 1);
  }

  /**
   * Get predicted next interactions
   */
  private getPredictedInteractions(): string[] {
    return Array.from(this.userBehavior.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key]) => key);
  }

  /**
   * Preload story images
   */
  async preloadStoryImages(stories: any[], startIndex: number = 0, count: number = 5): Promise<void> {
    const imagesToPreload: string[] = [];
    
    for (let i = startIndex; i < Math.min(startIndex + count, stories.length); i++) {
      if (stories[i]?.imagen) {
        imagesToPreload.push(stories[i].imagen);
      }
      if (stories[i]?.autor?.avatar) {
        imagesToPreload.push(stories[i].autor.avatar);
      }
    }
    
    if (imagesToPreload.length === 0) return;
    
    console.log('[IntelligentPreloader] 🚀 Preloading', imagesToPreload.length, 'story images...');
    
    try {
      await Promise.all(imagesToPreload.map(uri => Image.prefetch(uri)));
      console.log('[IntelligentPreloader] ✅ Story images preloaded');
    } catch (error) {
      console.log('[IntelligentPreloader] ⚠️ Some images failed to preload');
    }
  }

  /**
   * Preload post images
   */
  async preloadPostImages(posts: any[], startIndex: number = 0, count: number = 5): Promise<void> {
    const imagesToPreload: string[] = [];
    
    for (let i = startIndex; i < Math.min(startIndex + count, posts.length); i++) {
      const post = posts[i];
      if (!post) continue;

      // Preload post images
      if (post.imagenes && post.imagenes.length > 0) {
        imagesToPreload.push(...post.imagenes.slice(0, 2)); // First 2 images
      } else if (post.imagen) {
        imagesToPreload.push(post.imagen);
      }

      // Preload author avatar
      if (post.autor?.avatar) {
        imagesToPreload.push(post.autor.avatar);
      }
    }
    
    if (imagesToPreload.length === 0) return;
    
    console.log('[IntelligentPreloader] 🚀 Preloading', imagesToPreload.length, 'post images...');
    
    try {
      await Promise.all(imagesToPreload.map(uri => Image.prefetch(uri)));
      console.log('[IntelligentPreloader] ✅ Post images preloaded');
    } catch (error) {
      console.log('[IntelligentPreloader] ⚠️ Some images failed to preload');
    }
  }

  /**
   * Preload user profiles
   */
  async preloadUserProfiles(userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;

    console.log('[IntelligentPreloader] 🚀 Preloading', userIds.length, 'user profiles...');

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, username, avatar, bio')
        .in('id', userIds);

      if (!error && data) {
        // Cache user profiles
        await Promise.all(
          data.map(user =>
            advancedCache.set(`user:${user.id}`, user, 'high')
          )
        );

        // Preload avatars
        const avatars = data.map(u => u.avatar).filter(Boolean);
        await Promise.all(avatars.map(uri => Image.prefetch(uri)));

        console.log('[IntelligentPreloader] ✅ User profiles preloaded');
      }
    } catch (error) {
      console.error('[IntelligentPreloader] Error preloading user profiles:', error);
    }
  }

  /**
   * Preload recent messages
   */
  async preloadRecentMessages(userId: string): Promise<void> {
    console.log('[IntelligentPreloader] 🚀 Preloading recent messages...');

    try {
      // Get recent chats
      const { data: chats, error: chatsError } = await supabase
        .from('chats')
        .select('id')
        .or(`usuario1_id.eq.${userId},usuario2_id.eq.${userId}`)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (chatsError || !chats) return;

      // Preload messages for each chat
      await Promise.all(
        chats.map(async (chat) => {
          const { data: messages } = await supabase
            .from('mensajes')
            .select('*')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(20);

          if (messages) {
            await advancedCache.set(`messages:${chat.id}`, messages, 'high');
          }
        })
      );

      console.log('[IntelligentPreloader] ✅ Recent messages preloaded');
    } catch (error) {
      console.error('[IntelligentPreloader] Error preloading messages:', error);
    }
  }

  /**
   * Preload feed data
   */
  async preloadFeed(userId: string): Promise<void> {
    console.log('[IntelligentPreloader] 🚀 Preloading feed data...');

    try {
      // Preload posts
      const { data: posts } = await supabase
        .from('posts')
        .select(`
          *,
          autor:usuarios!posts_autor_id_fkey(nombre, avatar, username)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (posts) {
        await advancedCache.set('feed:posts', posts, 'high');
        await this.preloadPostImages(posts, 0, 5);
      }

      // Preload stories
      const { data: stories } = await supabase
        .from('historias')
        .select(`
          *,
          autor:usuarios!historias_autor_id_fkey(nombre, avatar, username)
        `)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true })
        .limit(50);

      if (stories) {
        await advancedCache.set('feed:stories', stories, 'high');
        await this.preloadStoryImages(stories, 0, 10);
      }

      console.log('[IntelligentPreloader] ✅ Feed data preloaded');
    } catch (error) {
      console.error('[IntelligentPreloader] Error preloading feed:', error);
    }
  }

  /**
   * Smart preload based on user behavior
   */
  async smartPreload(userId: string, config: Partial<PreloadConfig> = {}): Promise<void> {
    const defaultConfig: PreloadConfig = {
      stories: true,
      posts: true,
      images: true,
      users: true,
      messages: true,
      ...config,
    };

    console.log('[IntelligentPreloader] 🧠 Starting smart preload...');

    const tasks: Promise<void>[] = [];

    if (defaultConfig.stories || defaultConfig.posts) {
      tasks.push(this.preloadFeed(userId));
    }

    if (defaultConfig.messages) {
      tasks.push(this.preloadRecentMessages(userId));
    }

    await Promise.all(tasks);

    console.log('[IntelligentPreloader] ✅ Smart preload complete');
  }

  /**
   * Preload on app start
   */
  async preloadOnStart(userId: string): Promise<void> {
    console.log('[IntelligentPreloader] 🚀 Preloading on app start...');

    // Preload critical data immediately
    await this.preloadFeed(userId);

    // Preload less critical data in background
    setTimeout(() => {
      this.preloadRecentMessages(userId);
    }, 1000);

    console.log('[IntelligentPreloader] ✅ App start preload complete');
  }

  /**
   * Preload next content based on scroll position
   */
  async preloadOnScroll(
    type: 'posts' | 'stories',
    currentIndex: number,
    items: any[]
  ): Promise<void> {
    const preloadCount = 3;
    const startIndex = currentIndex + 1;

    if (type === 'posts') {
      await this.preloadPostImages(items, startIndex, preloadCount);
    } else if (type === 'stories') {
      await this.preloadStoryImages(items, startIndex, preloadCount);
    }
  }

  /**
   * Clear preload queue
   */
  clearQueue(): void {
    this.preloadQueue.clear();
    console.log('[IntelligentPreloader] 🗑️ Preload queue cleared');
  }
}

// Export singleton instance
export const intelligentPreloader = new IntelligentPreloader();
