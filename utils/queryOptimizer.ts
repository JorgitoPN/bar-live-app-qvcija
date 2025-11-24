
/**
 * Query Optimizer
 * Optimized database queries for instant loading
 * NO LAG - INSTANT RESPONSE
 */

import { supabase } from './supabase';

class QueryOptimizer {
  /**
   * Get posts with optimized query (INSTANT)
   */
  async getPostsOptimized(userId?: string, limit: number = 20): Promise<any[]> {
    console.log('[QueryOptimizer] ⚡ Loading posts (optimized)...');

    try {
      // ✅ CRITICAL: Single optimized query with minimal data
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          autor_id,
          contenido,
          imagen,
          imagenes,
          likes,
          created_at,
          tipo,
          local_id,
          ubicacion,
          autor:usuarios!posts_autor_id_fkey(nombre, avatar, username),
          local:locales!posts_local_id_fkey(nombre, imagen_url)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Map local info to autor field for local posts
      const mappedPosts = (data || []).map(post => ({
        ...post,
        autor: post.tipo === 'local' && post.local 
          ? {
              nombre: post.local.nombre,
              avatar: post.local.imagen_url,
              username: post.local.nombre,
            }
          : post.autor,
      }));

      console.log('[QueryOptimizer] ✅ Posts loaded:', mappedPosts.length);
      return mappedPosts;
    } catch (error) {
      console.error('[QueryOptimizer] Error loading posts:', error);
      return [];
    }
  }

  /**
   * Get stories with optimized query (INSTANT)
   */
  async getStoriesOptimized(userId?: string): Promise<any[]> {
    console.log('[QueryOptimizer] ⚡ Loading stories (optimized)...');

    try {
      // ✅ CRITICAL: Single optimized query
      const { data, error } = await supabase
        .from('historias')
        .select(`
          id,
          autor_id,
          tipo,
          imagen,
          created_at,
          expires_at,
          visto,
          local_id,
          autor:usuarios!historias_autor_id_fkey(nombre, avatar, username),
          local:locales!historias_local_id_fkey(nombre, imagen_url)
        `)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Map local info to autor field for local stories
      const mappedStories = (data || []).map(story => ({
        ...story,
        autor: story.tipo === 'local' && story.local 
          ? {
              nombre: story.local.nombre,
              avatar: story.local.imagen_url,
              username: story.local.nombre,
            }
          : story.autor,
      }));

      console.log('[QueryOptimizer] ✅ Stories loaded:', mappedStories.length);
      return mappedStories;
    } catch (error) {
      console.error('[QueryOptimizer] Error loading stories:', error);
      return [];
    }
  }

  /**
   * Get user interactions in single query (INSTANT)
   */
  async getUserInteractions(userId: string, postIds: string[]): Promise<{
    likes: Set<string>;
    saves: Set<string>;
    comments: Record<string, number>;
  }> {
    if (!userId || postIds.length === 0) {
      return { likes: new Set(), saves: new Set(), comments: {} };
    }

    console.log('[QueryOptimizer] ⚡ Loading user interactions...');

    try {
      // ✅ CRITICAL: Parallel queries for maximum speed
      const [likesResult, savesResult, commentsResult] = await Promise.all([
        supabase
          .from('likes')
          .select('post_id')
          .eq('usuario_id', userId)
          .in('post_id', postIds),
        supabase
          .from('posts_guardados')
          .select('post_id')
          .eq('usuario_id', userId)
          .in('post_id', postIds),
        supabase
          .from('comentarios')
          .select('post_id')
          .in('post_id', postIds),
      ]);

      const likes = new Set(likesResult.data?.map(l => l.post_id) || []);
      const saves = new Set(savesResult.data?.map(s => s.post_id) || []);
      
      const comments = commentsResult.data?.reduce((acc, c) => {
        acc[c.post_id] = (acc[c.post_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      console.log('[QueryOptimizer] ✅ Interactions loaded');
      return { likes, saves, comments };
    } catch (error) {
      console.error('[QueryOptimizer] Error loading interactions:', error);
      return { likes: new Set(), saves: new Set(), comments: {} };
    }
  }

  /**
   * Get story interactions in single query (INSTANT)
   */
  async getStoryInteractions(userId: string, storyIds: string[]): Promise<{
    viewed: Set<string>;
    liked: Set<string>;
    viewCounts: Record<string, number>;
    commentCounts: Record<string, number>;
  }> {
    if (!userId || storyIds.length === 0) {
      return { viewed: new Set(), liked: new Set(), viewCounts: {}, commentCounts: {} };
    }

    console.log('[QueryOptimizer] ⚡ Loading story interactions...');

    try {
      // ✅ CRITICAL: Parallel queries for maximum speed
      const [viewedData, likesData, viewsCountData, commentsCountData] = await Promise.all([
        supabase
          .from('historia_views')
          .select('historia_id')
          .eq('usuario_id', userId)
          .in('historia_id', storyIds),
        supabase
          .from('historia_likes')
          .select('historia_id')
          .eq('usuario_id', userId)
          .in('historia_id', storyIds),
        supabase
          .from('historia_views')
          .select('historia_id')
          .in('historia_id', storyIds),
        supabase
          .from('historia_comentarios')
          .select('historia_id')
          .in('historia_id', storyIds),
      ]);

      const viewed = new Set(viewedData.data?.map(v => v.historia_id) || []);
      const liked = new Set(likesData.data?.map(l => l.historia_id) || []);
      
      const viewCounts = viewsCountData.data?.reduce((acc, v) => {
        acc[v.historia_id] = (acc[v.historia_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};
      
      const commentCounts = commentsCountData.data?.reduce((acc, c) => {
        acc[c.historia_id] = (acc[c.historia_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      console.log('[QueryOptimizer] ✅ Story interactions loaded');
      return { viewed, liked, viewCounts, commentCounts };
    } catch (error) {
      console.error('[QueryOptimizer] Error loading story interactions:', error);
      return { viewed: new Set(), liked: new Set(), viewCounts: {}, commentCounts: {} };
    }
  }

  /**
   * Get chats with optimized query (INSTANT)
   */
  async getChatsOptimized(userId: string): Promise<any[]> {
    console.log('[QueryOptimizer] ⚡ Loading chats (optimized)...');

    try {
      // ✅ CRITICAL: Single optimized query
      const { data, error } = await supabase
        .from('chats')
        .select(`
          id,
          usuario1_id,
          usuario2_id,
          local_id,
          ultimo_mensaje,
          ultimo_mensaje_fecha,
          updated_at
        `)
        .or(`usuario1_id.eq.${userId},usuario2_id.eq.${userId}`)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      console.log('[QueryOptimizer] ✅ Chats loaded:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('[QueryOptimizer] Error loading chats:', error);
      return [];
    }
  }
}

// Export singleton instance
export const queryOptimizer = new QueryOptimizer();
