
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import PublicacionCard from '@/components/social/PublicacionCard';
import NewPostCard from '@/components/social/NewPostCard';
import MomentoCarousel from '@/components/momento/MomentoCarousel';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';

interface Post {
  id: string;
  autor_id: string;
  tipo: 'usuario' | 'local';
  local_id?: string;
  contenido: string;
  imagenes: string[];
  video_url?: string;
  ubicacion?: string;
  likes_count: number;
  comentarios_count: number;
  compartidos_count: number;
  created_at: string;
  autor?: {
    id: string;
    nombre: string;
    username?: string;
    avatar?: string;
  };
  local?: {
    id: string;
    nombre: string;
    imagen_url?: string;
  };
  user_has_liked?: boolean;
}

const POSTS_PER_PAGE = 10;

export default function SocialIndexScreen() {
  const router = useRouter();
  const { userId, user, isImpersonating, adminUser } = useEffectiveUser();
  const { impersonationSession } = useImpersonation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const flatListRef = useRef<FlatList>(null);

  const cargarPosts = useCallback(async (pageNum: number = 1, isRefresh: boolean = false) => {
    if (!userId) {
      console.log('[Social] No user ID, skipping load');
      setLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const from = (pageNum - 1) * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

      console.log(`[Social] Loading posts for user ${userId} (${isImpersonating ? 'IMPERSONATING' : 'NORMAL'}), page ${pageNum}`);

      // Get posts from users and locals that the effective user follows
      const { data: followingData, error: followingError } = await supabase
        .from('seguidores')
        .select('seguido_id, local_id')
        .eq('seguidor_id', userId);

      if (followingError) throw followingError;

      const followedUserIds = followingData
        ?.filter(f => f.seguido_id)
        .map(f => f.seguido_id) || [];
      
      const followedLocalIds = followingData
        ?.filter(f => f.local_id)
        .map(f => f.local_id) || [];

      // Include the effective user's own posts
      const authorIds = [...followedUserIds, userId];

      let query = supabase
        .from('posts')
        .select(`
          *,
          autor:usuarios!posts_autor_id_fkey(id, nombre, username, avatar),
          local:locales!posts_local_id_fkey(id, nombre, imagen_url)
        `)
        .order('created_at', { ascending: false })
        .range(from, to);

      // Filter by followed users and locals
      if (authorIds.length > 0 || followedLocalIds.length > 0) {
        const conditions = [];
        if (authorIds.length > 0) {
          conditions.push(`autor_id.in.(${authorIds.join(',')})`);
        }
        if (followedLocalIds.length > 0) {
          conditions.push(`local_id.in.(${followedLocalIds.join(',')})`);
        }
        query = query.or(conditions.join(','));
      }

      const { data: postsData, error: postsError } = await query;

      if (postsError) throw postsError;

      // Check which posts the user has liked
      if (postsData && postsData.length > 0) {
        const postIds = postsData.map(p => p.id);
        const { data: likesData } = await supabase
          .from('likes')
          .select('post_id')
          .eq('usuario_id', userId)
          .in('post_id', postIds);

        const likedPostIds = new Set(likesData?.map(l => l.post_id) || []);

        const postsWithLikes = postsData.map(post => ({
          ...post,
          user_has_liked: likedPostIds.has(post.id),
        }));

        if (isRefresh || pageNum === 1) {
          setPosts(postsWithLikes);
          setPage(2);
        } else {
          setPosts(prev => [...prev, ...postsWithLikes]);
          setPage(pageNum + 1);
        }

        setHasMore(postsWithLikes.length === POSTS_PER_PAGE);
      } else {
        if (isRefresh || pageNum === 1) {
          setPosts([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error('[Social] Error cargando posts:', error);
      Alert.alert('Error', 'No se pudieron cargar las publicaciones');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [userId, isImpersonating]);

  useEffect(() => {
    if (userId) {
      cargarPosts(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleRefresh = useCallback(() => {
    cargarPosts(1, true);
  }, [cargarPosts]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading) {
      cargarPosts(page, false);
    }
  }, [hasMore, loadingMore, loading, page, cargarPosts]);

  const handlePostCreated = useCallback(() => {
    cargarPosts(1, true);
  }, [cargarPosts]);

  const handleNotifications = () => {
    router.push('/perfil/notificaciones');
  };

  const handleSearch = () => {
    // TODO: Implement search functionality
    Alert.alert('Búsqueda', 'Función de búsqueda próximamente');
  };

  const renderHeader = useCallback(() => (
    <React.Fragment>
      {/* Impersonation Banner */}
      {isImpersonating && impersonationSession && (
        <View style={styles.impersonationBanner}>
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            style={styles.impersonationBannerGradient}
          >
            <IconSymbol ios_icon_name="person.crop.circle.badge.checkmark" android_material_icon_name="supervised_user_circle" size={24} color={colors.white} />
            <View style={styles.impersonationBannerText}>
              <Text style={styles.impersonationBannerTitle}>
                Viendo como {impersonationSession.impersonated_user_name}
              </Text>
              <Text style={styles.impersonationBannerSubtitle}>
                Red social del usuario impersonado
              </Text>
            </View>
          </LinearGradient>
        </View>
      )}

      <MomentoCarousel />
      <NewPostCard onPostCreated={handlePostCreated} />
    </React.Fragment>
  ), [isImpersonating, impersonationSession, handlePostCreated]);

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PublicacionCard post={item} onUpdate={handleRefresh} />
  ), [handleRefresh]);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.footerLoaderText}>Cargando más publicaciones...</Text>
      </View>
    );
  }, [loadingMore]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <IconSymbol ios_icon_name="photo.stack" android_material_icon_name="collections" size={64} color={colors.textSecondary} />
        <Text style={styles.emptyText}>No hay publicaciones</Text>
        <Text style={styles.emptySubtext}>
          {isImpersonating 
            ? 'Este usuario no sigue a nadie o no hay publicaciones disponibles'
            : 'Sigue a usuarios y locales para ver sus publicaciones aquí'}
        </Text>
      </View>
    );
  }, [loading, isImpersonating]);

  if (!userId) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <IconSymbol ios_icon_name="person.crop.circle.badge.xmark" android_material_icon_name="person_off" size={64} color={colors.textSecondary} />
        <Text style={styles.emptyText}>No hay usuario activo</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Icons */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Red Social</Text>
          <View style={styles.headerIcons}>
            {isImpersonating && impersonationSession && (
              <View style={styles.impersonationIndicator}>
                <IconSymbol ios_icon_name="person.crop.circle.badge.checkmark" android_material_icon_name="supervised_user_circle" size={20} color={colors.headerText} />
              </View>
            )}
            <TouchableOpacity style={styles.headerIconButton} onPress={handleSearch}>
              <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconButton} onPress={handleNotifications}>
              <IconSymbol ios_icon_name="bell.fill" android_material_icon_name="notifications" size={24} color={colors.headerText} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        ref={flatListRef}
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        windowSize={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  impersonationIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 100,
  },
  impersonationBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  impersonationBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  impersonationBannerText: {
    flex: 1,
  },
  impersonationBannerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 2,
  },
  impersonationBannerSubtitle: {
    fontSize: 13,
    color: colors.white,
    opacity: 0.9,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
});
