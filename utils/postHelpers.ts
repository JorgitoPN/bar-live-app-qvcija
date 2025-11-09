
import { supabase } from './supabase';
import { trackActivity } from './activityTracker';

/**
 * Load posts from Supabase with all related data
 */
export async function loadPosts(userId?: string, limit: number = 20) {
  try {
    let query = supabase
      .from('posts')
      .select(`
        *,
        autor:usuarios!posts_autor_id_fkey(
          id,
          nombre,
          username,
          avatar
        ),
        local:locales(
          id,
          nombre,
          imagen_url
        ),
        tags:post_tags(
          usuario:usuarios(
            id,
            nombre,
            username,
            avatar
          )
        ),
        user_liked:likes!inner(usuario_id)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // If userId provided, only get posts from that user
    if (userId) {
      query = query.eq('autor_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform data to match expected format
    return (data || []).map((post: any) => ({
      id: post.id,
      autorId: post.autor_id,
      autorNombre: post.autor?.nombre || 'Usuario',
      autorAvatar: post.autor?.avatar,
      tipo: post.tipo,
      contenido: post.contenido || '',
      imagen: post.imagen,
      ubicacion: post.ubicacion,
      ubicacion_lat: post.ubicacion_lat,
      ubicacion_lng: post.ubicacion_lng,
      likes: post.likes || 0,
      comentarios: post.comentarios || 0,
      fecha: post.created_at,
      localId: post.local_id,
      localNombre: post.local?.nombre,
      liked: post.user_liked?.length > 0,
      saved: false, // TODO: Check if user saved this post
      usuariosEtiquetados: post.tags?.map((tag: any) => tag.usuario) || [],
    }));
  } catch (error) {
    console.error('Error loading posts:', error);
    return [];
  }
}

/**
 * Load stories from Supabase
 */
export async function loadStories(limit: number = 50) {
  try {
    const { data, error } = await supabase
      .from('historias')
      .select(`
        *,
        autor:usuarios!historias_autor_id_fkey(
          id,
          nombre,
          username,
          avatar
        ),
        tags:historia_tags(
          usuario:usuarios(
            id,
            nombre,
            username,
            avatar
          )
        )
      `)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((historia: any) => ({
      id: historia.id,
      autorId: historia.autor_id,
      autorNombre: historia.autor?.nombre || 'Usuario',
      autorAvatar: historia.autor?.avatar,
      tipo: historia.tipo,
      imagen: historia.imagen,
      ubicacion: historia.ubicacion,
      fecha: historia.created_at,
      visto: historia.visto || false,
      usuariosEtiquetados: historia.tags?.map((tag: any) => tag.usuario) || [],
    }));
  } catch (error) {
    console.error('Error loading stories:', error);
    return [];
  }
}

/**
 * Toggle like on a post
 */
export async function togglePostLike(postId: string, userId: string, currentlyLiked: boolean) {
  try {
    if (currentlyLiked) {
      // Unlike
      await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('usuario_id', userId);

      await supabase.rpc('increment_column', {
        p_table_name: 'posts',
        p_row_id: postId,
        p_column_name: 'likes',
        p_amount: -1,
      });
    } else {
      // Like
      await supabase
        .from('likes')
        .insert({
          post_id: postId,
          usuario_id: userId,
        });

      await supabase.rpc('increment_column', {
        p_table_name: 'posts',
        p_row_id: postId,
        p_column_name: 'likes',
        p_amount: 1,
      });

      // Track activity
      await trackActivity({
        usuarioId: userId,
        tipoActividad: 'like_post',
        entidadId: postId,
        entidadTipo: 'post',
      });
    }

    return !currentlyLiked;
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
}

/**
 * Add comment to a post
 */
export async function addComment(postId: string, userId: string, texto: string) {
  try {
    const { data, error } = await supabase
      .from('comentarios')
      .insert({
        post_id: postId,
        autor_id: userId,
        texto: texto,
      })
      .select(`
        *,
        autor:usuarios!comentarios_autor_id_fkey(
          id,
          nombre,
          username,
          avatar
        )
      `)
      .single();

    if (error) throw error;

    // Increment comment count
    await supabase.rpc('increment_column', {
      p_table_name: 'posts',
      p_row_id: postId,
      p_column_name: 'comentarios',
      p_amount: 1,
    });

    // Track activity
    await trackActivity({
      usuarioId: userId,
      tipoActividad: 'comment_post',
      entidadId: postId,
      entidadTipo: 'post',
    });

    return {
      id: data.id,
      autorId: data.autor_id,
      autorNombre: data.autor?.nombre || 'Usuario',
      autorAvatar: data.autor?.avatar,
      texto: data.texto,
      fecha: data.created_at,
      likes: data.likes || 0,
      liked: false,
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}

/**
 * Load comments for a post
 */
export async function loadComments(postId: string) {
  try {
    const { data, error } = await supabase
      .from('comentarios')
      .select(`
        *,
        autor:usuarios!comentarios_autor_id_fkey(
          id,
          nombre,
          username,
          avatar
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((comentario: any) => ({
      id: comentario.id,
      autorId: comentario.autor_id,
      autorNombre: comentario.autor?.nombre || 'Usuario',
      autorAvatar: comentario.autor?.avatar,
      texto: comentario.texto,
      fecha: comentario.created_at,
      likes: comentario.likes || 0,
      liked: false, // TODO: Check if user liked this comment
    }));
  } catch (error) {
    console.error('Error loading comments:', error);
    return [];
  }
}

/**
 * Delete a post
 */
export async function deletePost(postId: string, userId: string) {
  try {
    // Verify ownership
    const { data: post } = await supabase
      .from('posts')
      .select('autor_id')
      .eq('id', postId)
      .single();

    if (post?.autor_id !== userId) {
      throw new Error('No tienes permiso para eliminar este post');
    }

    // Delete post (cascades to likes, comments, tags)
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;

    // Decrement user posts count
    await supabase.rpc('decrement_user_posts', {
      user_id: userId,
    });

    return true;
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
}

/**
 * Get suggested users for a user
 */
export async function getSuggestedUsers(userId: string, limit: number = 10) {
  try {
    const { data, error } = await supabase.rpc('get_suggested_users', {
      p_usuario_id: userId,
      p_limit: limit,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting suggested users:', error);
    return [];
  }
}

/**
 * Get nearby local posts
 */
export async function getNearbyLocalPosts(
  lat: number,
  lng: number,
  radiusKm: number = 50,
  limit: number = 20
) {
  try {
    const { data, error } = await supabase.rpc('get_nearby_local_posts', {
      p_lat: lat,
      p_lng: lng,
      p_radio_km: radiusKm,
      p_limit: limit,
    });

    if (error) throw error;

    return (data || []).map((post: any) => ({
      ...post,
      autorNombre: 'Local',
      tipo: 'local',
      liked: false,
      saved: false,
    }));
  } catch (error) {
    console.error('Error getting nearby local posts:', error);
    return [];
  }
}

/**
 * Check if user is following anyone
 */
export async function isFollowingAnyone(userId: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('seguidores')
      .select('*', { count: 'exact', head: true })
      .eq('seguidor_id', userId);

    if (error) throw error;
    return (count || 0) > 0;
  } catch (error) {
    console.error('Error checking following:', error);
    return false;
  }
}

/**
 * Subscribe to new posts in real-time
 */
export function subscribeToNewPosts(callback: (post: any) => void) {
  const subscription = supabase
    .channel('posts')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
      },
      async (payload) => {
        // Load full post data with relations
        const { data } = await supabase
          .from('posts')
          .select(`
            *,
            autor:usuarios!posts_autor_id_fkey(
              id,
              nombre,
              username,
              avatar
            )
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          callback({
            id: data.id,
            autorId: data.autor_id,
            autorNombre: data.autor?.nombre || 'Usuario',
            autorAvatar: data.autor?.avatar,
            tipo: data.tipo,
            contenido: data.contenido || '',
            imagen: data.imagen,
            ubicacion: data.ubicacion,
            likes: data.likes || 0,
            comentarios: data.comentarios || 0,
            fecha: data.created_at,
            liked: false,
            saved: false,
          });
        }
      }
    )
    .subscribe();

  return subscription;
}
