
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import NewBarraHistorias from '@/components/social/NewBarraHistorias';
import NewPostCard from '@/components/social/NewPostCard';
import HeaderSocial from '@/components/layout/HeaderSocial';

interface Post {
  id: string;
  autor_id: string;
  tipo: 'usuario' | 'local';
  local_id?: string;
  contenido?: string;
  imagenes: string[];
  video_url?: string;
  ubicacion?: string;
  likes_count: number;
  comentarios_count: number;
  guardados_count: number;
  user_has_liked: boolean;
  user_has_saved: boolean;
  created_at: string;
  autor: {
    id: string;
    nombre: string;
    username: string;
    avatar?: string;
  };
  local?: {
    id: string;
    nombre: string;
  };
}

export default function SocialScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async (refresh: boolean = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      if (refresh) {
        setRefreshing(true);
      }
      
      setError(null);

      const { data, error: fetchError } = await supabase.rpc('get_user_feed', {
        p_usuario_id: user.id,
        p_limit: 20,
        p_offset: 0,
      });

      if (fetchError) {
        console.error('Error loading posts:', fetchError);
        setError('No se pudieron cargar las publicaciones');
        return;
      }

      if (data && Array.isArray(data)) {
        const formattedPosts: Post[] = data
          .filter((item: any) => item && item.post_id)
          .map((item: any) => ({
            id: item.post_id,
            autor_id: item.autor_id,
            tipo: item.tipo || 'usuario',
            local_id: item.local_id,
            contenido: item.contenido,
            imagenes: Array.isArray(item.imagenes) ? item.imagenes : [],
            video_url: item.video_url,
            ubicacion: item.ubicacion,
            likes_count: item.likes_count || 0,
            comentarios_count: item.comentarios_count || 0,
            guardados_count: item.guardados_count || 0,
            user_has_liked: item.user_has_liked || false,
            user_has_saved: item.user_has_saved || false,
            created_at: item.created_at,
            autor: {
              id: item.autor_id,
              nombre: item.autor_nombre || 'Usuario',
              username: item.autor_username || 'usuario',
              avatar: item.autor_avatar,
            },
            local: item.local_id ? {
              id: item.local_id,
              nombre: item.local_nombre || 'Local',
            } : undefined,
          }));

        setPosts(formattedPosts);
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.error('Error in loadPosts:', err);
      setError('Error al cargar las publicaciones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleRefresh = () => {
    loadPosts(true);
  };

  const handleLike = async (postId: string) => {
    if (!user) return;

    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      // Optimistic update
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { 
              ...p, 
              user_has_liked: !p.user_has_liked, 
              likes_count: p.user_has_liked ? p.likes_count - 1 : p.likes_count + 1 
            }
          : p
      ));

      if (post.user_has_liked) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('usuario_id', user.id)
          .eq('tipo', 'usuario');
      } else {
        await supabase
          .from('likes')
          .insert({
            post_id: postId,
            usuario_id: user.id,
            tipo: 'usuario',
          });
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      // Revert optimistic update on error
      loadPosts();
    }
  };

  const handleSave = async (postId: string) => {
    if (!user) return;

    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      // Optimistic update
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { 
              ...p, 
              user_has_saved: !p.user_has_saved, 
              guardados_count: p.user_has_saved ? p.guardados_count - 1 : p.guardados_count + 1 
            }
          : p
      ));

      if (post.user_has_saved) {
        await supabase
          .from('posts_guardados')
          .delete()
          .eq('post_id', postId)
          .eq('usuario_id', user.id);
      } else {
        await supabase
          .from('posts_guardados')
          .insert({
            post_id: postId,
            usuario_id: user.id,
          });
      }
    } catch (err) {
      console.error('Error toggling save:', err);
      // Revert optimistic update on error
      loadPosts();
    }
  };

  const handleComment = (postId: string) => {
    router.push(`/social/post?id=${postId}`);
  };

  const handleShare = (postId: string) => {
    console.log('Share post:', postId);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <HeaderSocial />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando feed...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <HeaderSocial />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadPosts()}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HeaderSocial />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Stories Bar */}
        <NewBarraHistorias />

        {/* Posts Feed */}
        {posts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No hay publicaciones</Text>
            <Text style={styles.emptySubtext}>
              Sigue a otros usuarios para ver sus publicaciones
            </Text>
          </View>
        ) : (
          posts.map((post) => (
            <NewPostCard
              key={post.id}
              post={post}
              onLike={handleLike}
              onComment={handleComment}
              onShare={handleShare}
              onSave={handleSave}
            />
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Create Post Button */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => router.push('/crear/publicacion')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  createButton: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
