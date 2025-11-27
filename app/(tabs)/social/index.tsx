
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
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
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadPosts = useCallback(async (pageNum: number = 0, refresh: boolean = false) => {
    if (!user) return;

    try {
      if (refresh) {
        setRefreshing(true);
      } else if (pageNum === 0) {
        setLoading(true);
      }

      const { data, error } = await supabase.rpc('get_user_feed', {
        p_usuario_id: user.id,
        p_limit: 20,
        p_offset: pageNum * 20,
      });

      if (error) throw error;

      if (data) {
        const formattedPosts: Post[] = data.map((item: any) => ({
          id: item.post_id,
          autor_id: item.autor_id,
          tipo: item.tipo,
          local_id: item.local_id,
          contenido: item.contenido,
          imagenes: item.imagenes || [],
          video_url: item.video_url,
          ubicacion: item.ubicacion,
          likes_count: item.likes_count,
          comentarios_count: item.comentarios_count,
          guardados_count: item.guardados_count,
          user_has_liked: item.user_has_liked,
          user_has_saved: item.user_has_saved,
          created_at: item.created_at,
          autor: {
            id: item.autor_id,
            nombre: item.autor_nombre,
            username: item.autor_username,
            avatar: item.autor_avatar,
          },
          local: item.local_id ? {
            id: item.local_id,
            nombre: item.local_nombre,
          } : undefined,
        }));

        if (refresh || pageNum === 0) {
          setPosts(formattedPosts);
        } else {
          setPosts(prev => [...prev, ...formattedPosts]);
        }

        setHasMore(formattedPosts.length === 20);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      Alert.alert('Error', 'No se pudieron cargar las publicaciones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadPosts(0);
  }, [loadPosts]);

  const handleRefresh = () => {
    setPage(0);
    loadPosts(0, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadPosts(nextPage);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;

    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      if (post.user_has_liked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('usuario_id', user.id)
          .eq('tipo', 'usuario');

        if (error) throw error;

        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { ...p, user_has_liked: false, likes_count: p.likes_count - 1 }
            : p
        ));
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({
            post_id: postId,
            usuario_id: user.id,
            tipo: 'usuario',
          });

        if (error) throw error;

        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { ...p, user_has_liked: true, likes_count: p.likes_count + 1 }
            : p
        ));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'No se pudo dar like');
    }
  };

  const handleSave = async (postId: string) => {
    if (!user) return;

    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      if (post.user_has_saved) {
        // Unsave
        const { error } = await supabase
          .from('posts_guardados')
          .delete()
          .eq('post_id', postId)
          .eq('usuario_id', user.id);

        if (error) throw error;

        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { ...p, user_has_saved: false, guardados_count: p.guardados_count - 1 }
            : p
        ));
      } else {
        // Save
        const { error } = await supabase
          .from('posts_guardados')
          .insert({
            post_id: postId,
            usuario_id: user.id,
          });

        if (error) throw error;

        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { ...p, user_has_saved: true, guardados_count: p.guardados_count + 1 }
            : p
        ));
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      Alert.alert('Error', 'No se pudo guardar');
    }
  };

  const handleComment = (postId: string) => {
    router.push(`/social/post?id=${postId}`);
  };

  const handleShare = (postId: string) => {
    // TODO: Implement share functionality
    Alert.alert('Compartir', 'Funcionalidad de compartir próximamente');
  };

  if (loading && posts.length === 0) {
    return (
      <View style={styles.container}>
        <HeaderSocial />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
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
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
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

        {loading && posts.length > 0 && (
          <View style={styles.loadingMore}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        {!hasMore && posts.length > 0 && (
          <View style={styles.endContainer}>
            <Text style={styles.endText}>Has visto todas las publicaciones</Text>
          </View>
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
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  endContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  endText: {
    fontSize: 14,
    color: colors.textSecondary,
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
