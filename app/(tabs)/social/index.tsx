
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
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import PublicacionCard from '@/components/social/PublicacionCard';
import NewPostCard from '@/components/social/NewPostCard';
import MomentoCarousel from '@/components/momento/MomentoCarousel';
import HeaderSocial from '@/components/layout/HeaderSocial';
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
  user_has_saved?: boolean;
}

const POSTS_PER_PAGE = 10;

/**
 * ✅ SOCIAL FEED v2.0 - SYNCHRONIZED BADGES
 * 
 * Changes:
 * - ✅ Uses HeaderSocial component with synchronized notification/message badges
 * - ✅ Real-time updates for badge counts
 */

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

  // ✅ Badge counts state
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // ✅ Load unread counts
  const loadUnreadCounts = useCallback(async () => {
    if (!userId) return;

    try {
      const { count: notifCount } = await supabase
        .from('notificaciones')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', userId)
        .eq('leida', false);

      setUnreadNotifications(notifCount || 0);

      const { data: chatsData } = await supabase
        .from('chats')
        .select('id')
        .or(`usuario1_id.eq.${userId},usuario2_id.eq.${userId}`);

      if (chatsData) {
        let totalUnread = 0;
        for (const chat of chatsData) {
          const { count } = await supabase
            .from('mensajes')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .eq('leido', false)
            .neq('remitente_id', userId);
          
          totalUnread += count || 0;
        }
        setUnreadMessages(totalUnread);
        
        console.log('[Social] ✅ Loaded unread counts:', {
          notifications: notifCount || 0,
          messages: totalUnread,
        });
      } else {
        console.log('[Social] ✅ Loaded unread counts:', {
          notifications: notifCount || 0,
          messages: 0,
        });
      }
    } catch (error) {
      console.error('[Social] Error loading unread counts:', error);
    }
  }, [userId]);

  // ✅ Subscribe to real-time updates
  useEffect(() => {
    if (!userId) return;

    loadUnreadCounts();

    const subscription = supabase
      .channel('social-feed-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${userId}`,
        },
        () => {
          console.log('[Social] 🔔 Notification update detected');
          loadUnreadCounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mensajes',
        },
        () => {
          console.log('[Social] 💬 Message update detected');
          loadUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId, loadUnreadCounts]);

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

      if (postsData && postsData.length > 0) {
        const postIds = postsData.map(p => p.id);
        
        const [likesResult, savedResult] = await Promise.all([
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
        ]);

        const likedPostIds = new Set(likesResult.data?.map(l => l.post_id) || []);
        const savedPostIds = new Set(savedResult.data?.map(s => s.post_id) || []);

        const postsWithStatus = postsData.map(post => ({
          ...post,
          user_has_liked: likedPostIds.has(post.id),
          user_has_saved: savedPostIds.has(post.id),
        }));

        if (isRefresh || pageNum === 1) {
          setPosts(postsWithStatus);
          setPage(2);
        } else {
          setPosts(prev => [...prev, ...postsWithStatus]);
          setPage(pageNum + 1);
        }

        setHasMore(postsWithStatus.length === POSTS_PER_PAGE);
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
  }, [userId, cargarPosts]);

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

  const handleCreatePost = () => {
    router.push('/crear/publicacion');
  };

  const [friendsLocations, setFriendsLocations] = useState<any[]>([]);
  const [loadingFriendsLocations, setLoadingFriendsLocations] = useState(false);

  // Load friends' locations
  const loadFriendsLocations = useCallback(async () => {
    if (!userId) return;

    try {
      setLoadingFriendsLocations(true);

      // Get all users that current user follows
      const { data: following, error: followingError } = await supabase
        .from('seguidores')
        .select('seguido_id')
        .eq('seguidor_id', userId);

      if (followingError) throw followingError;

      const followedUserIds = following?.map(f => f.seguido_id) || [];

      if (followedUserIds.length === 0) {
        setFriendsLocations([]);
        setLoadingFriendsLocations(false);
        return;
      }

      // Get check-ins from followed users
      const { data: checkIns, error: checkInsError } = await supabase
        .from('check_ins')
        .select(`
          usuario_id,
          local_id,
          visibility,
          specific_user_ids,
          usuarios!check_ins_usuario_id_fkey(id, nombre, username, avatar),
          locales!check_ins_local_id_fkey(id, nombre, imagen_url, tipo, direccion, latitud, longitud)
        `)
        .in('usuario_id', followedUserIds);

      if (checkInsError) throw checkInsError;

      // Filter by visibility
      const visibleCheckIns = (checkIns || []).filter(checkIn => {
        if (checkIn.visibility === 'all_users') return true;
        if (checkIn.visibility === 'followers') return true;
        if (checkIn.visibility === 'specific_users') {
          return checkIn.specific_user_ids?.includes(userId);
        }
        return false;
      });

      // Group by local
      const locationsByLocal = new Map<string, any>();
      visibleCheckIns.forEach(checkIn => {
        if (!checkIn.locales) return;

        const localId = checkIn.locales.id;
        if (!locationsByLocal.has(localId)) {
          locationsByLocal.set(localId, {
            local: checkIn.locales,
            users: [],
          });
        }
        locationsByLocal.get(localId).users.push(checkIn.usuarios);
      });

      const locations = Array.from(locationsByLocal.values());
      setFriendsLocations(locations);
      console.log('[Social] ✅ Loaded friends locations:', locations.length);
    } catch (error) {
      console.error('[Social] Error loading friends locations:', error);
    } finally {
      setLoadingFriendsLocations(false);
    }
  }, [userId]);

  useEffect(() => {
    loadFriendsLocations();

    // Subscribe to check-in changes
    if (userId) {
      const checkInsChannel = supabase
        .channel('social-check-ins-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'check_ins',
          },
          () => {
            console.log('[Social] 🔔 Check-ins updated');
            loadFriendsLocations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(checkInsChannel);
      };
    }
  }, [userId, loadFriendsLocations]);

  const renderHeader = useCallback(() => (
    <React.Fragment>
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

      {/* Friends Locations Section */}
      {friendsLocations.length > 0 && (
        <View style={styles.friendsLocationsSection}>
          <LinearGradient
            colors={['#14B8A6', '#0D9488']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.friendsLocationsSectionGradient}
          >
            <View style={styles.friendsLocationsSectionHeader}>
              <View style={styles.friendsLocationsSectionTitleContainer}>
                <IconSymbol ios_icon_name="mappin.and.ellipse" android_material_icon_name="location_on" size={28} color={colors.white} />
                <View>
                  <Text style={styles.friendsLocationsSectionTitle}>
                    ¿Quieres saber dónde están tus amigos?
                  </Text>
                  <Text style={styles.friendsLocationsSectionSubtitle}>
                    {friendsLocations.length} {friendsLocations.length === 1 ? 'local con amigos' : 'locales con amigos'}
                  </Text>
                </View>
              </View>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.friendsLocationsScroll}
            >
              {friendsLocations.map((location, index) => (
                <TouchableOpacity
                  key={location.local.id}
                  style={styles.friendLocationCard}
                  onPress={() => router.push(`/detalle/local?id=${location.local.id}`)}
                  activeOpacity={0.9}
                >
                  <View style={styles.friendLocationImageContainer}>
                    {location.local.imagen_url ? (
                      <Image 
                        source={{ uri: location.local.imagen_url }} 
                        style={styles.friendLocationImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.friendLocationImage, styles.friendLocationImagePlaceholder]}>
                        <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={32} color={colors.white} />
                      </View>
                    )}
                    <View style={styles.friendLocationOverlay} />
                    
                    {/* User avatars */}
                    <View style={styles.friendLocationAvatars}>
                      {location.users.slice(0, 3).map((user: any, userIndex: number) => (
                        <View 
                          key={user.id} 
                          style={[
                            styles.friendLocationAvatar,
                            { marginLeft: userIndex > 0 ? -12 : 0 }
                          ]}
                        >
                          {user.avatar ? (
                            <Image 
                              source={{ uri: user.avatar }} 
                              style={styles.friendLocationAvatarImage}
                            />
                          ) : (
                            <View style={styles.friendLocationAvatarPlaceholder}>
                              <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={14} color={colors.white} />
                            </View>
                          )}
                        </View>
                      ))}
                      {location.users.length > 3 && (
                        <View style={[styles.friendLocationAvatar, styles.friendLocationAvatarMore, { marginLeft: -12 }]}>
                          <Text style={styles.friendLocationAvatarMoreText}>+{location.users.length - 3}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.friendLocationInfo}>
                    <Text style={styles.friendLocationName} numberOfLines={1}>
                      {location.local.nombre}
                    </Text>
                    <View style={styles.friendLocationMeta}>
                      <IconSymbol ios_icon_name="mappin" android_material_icon_name="location_on" size={12} color={colors.white} />
                      <Text style={styles.friendLocationAddress} numberOfLines={1}>
                        {location.local.direccion}
                      </Text>
                    </View>
                    <View style={styles.friendLocationUsers}>
                      <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={14} color={colors.white} />
                      <Text style={styles.friendLocationUsersText}>
                        {location.users.length} {location.users.length === 1 ? 'amigo' : 'amigos'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.friendLocationArrow}>
                    <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.white} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </LinearGradient>
        </View>
      )}
    </React.Fragment>
  ), [isImpersonating, impersonationSession, friendsLocations, router]);

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
      {/* ✅ Header with synchronized badges */}
      <HeaderSocial
        unreadNotifications={unreadNotifications}
        unreadMessages={unreadMessages}
        onCreatePost={handleCreatePost}
      />

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
  friendsLocationsSection: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  friendsLocationsSectionGradient: {
    padding: 16,
  },
  friendsLocationsSectionHeader: {
    marginBottom: 16,
  },
  friendsLocationsSectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  friendsLocationsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  friendsLocationsSectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  friendsLocationsScroll: {
    gap: 12,
    paddingRight: 16,
  },
  friendLocationCard: {
    width: 280,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  friendLocationImageContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  friendLocationImage: {
    width: '100%',
    height: '100%',
  },
  friendLocationImagePlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendLocationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  friendLocationAvatars: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendLocationAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.white,
    overflow: 'hidden',
  },
  friendLocationAvatarImage: {
    width: '100%',
    height: '100%',
  },
  friendLocationAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendLocationAvatarMore: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendLocationAvatarMoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  friendLocationInfo: {
    padding: 12,
  },
  friendLocationName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 6,
  },
  friendLocationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  friendLocationAddress: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  friendLocationUsers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  friendLocationUsersText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  friendLocationArrow: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -10,
  },
});
