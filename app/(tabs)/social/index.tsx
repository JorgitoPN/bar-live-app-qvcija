
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
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useMode } from '@/contexts/ModeContext';
import PublicacionCard from '@/components/social/PublicacionCard';
import NewPostCard from '@/components/social/NewPostCard';
import HeaderSocial from '@/components/layout/HeaderSocial';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import PostViewerModal from '@/components/social/PostViewerModal';
import LoginPrompt from '@/components/common/LoginPrompt';
import MomentoCarousel from '@/components/momento/MomentoCarousel';
import PermissionGuard from '@/components/social/PermissionGuard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

interface FriendLocation {
  local: {
    id: string;
    nombre: string;
    imagen_url?: string;
    tipo: string;
    direccion: string;
  };
  users: {
    id: string;
    nombre: string;
    username?: string;
    avatar?: string;
  }[];
}

const POSTS_PER_PAGE = 10;

/**
 * ✅ SOCIAL INDEX SCREEN v48.0 - ACCESS CONTROL FOR FREE PLAN LOCALS
 * 
 * Changes:
 * - ✅ Momentos section always visible (restored)
 * - ✅ Avatar upload functionality restored
 * - ✅ Cleaner social feed with momentos at top
 * - ✅ Access control for free plan locals
 */

export default function SocialIndexScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userId, user, isImpersonating, adminUser } = useEffectiveUser();
  const { impersonationSession } = useImpersonation();
  const { currentMode, activeProfileType } = useMode();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const flatListRef = useRef<FlatList>(null);

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const [friendsLocations, setFriendsLocations] = useState<FriendLocation[]>([]);
  const [loadingFriendsLocations, setLoadingFriendsLocations] = useState(false);
  const [myCheckIn, setMyCheckIn] = useState<any>(null);

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
            .is('leido_at', null)
            .neq('remitente_id', userId);
          
          totalUnread += count || 0;
        }
        setUnreadMessages(totalUnread);
        
        console.log('[Social v48.0] ✅ Loaded unread counts:', {
          notifications: notifCount || 0,
          messages: totalUnread,
        });
      } else {
        console.log('[Social v48.0] ✅ Loaded unread counts:', {
          notifications: notifCount || 0,
          messages: 0,
        });
      }
    } catch (error) {
      console.error('[Social v48.0] Error loading unread counts:', error);
    }
  }, [userId]);

  const loadFriendsLocations = useCallback(async () => {
    if (!userId) return;

    try {
      setLoadingFriendsLocations(true);

      const { data: myCheckInData, error: myCheckInError } = await supabase
        .from('check_ins')
        .select(`
          local_id,
          visibility,
          locales!check_ins_local_id_fkey(id, nombre, imagen_url, tipo, direccion)
        `)
        .eq('usuario_id', userId)
        .single();

      if (myCheckInError && myCheckInError.code !== 'PGRST116') {
        console.error('[Social v48.0] Error loading my check-in:', myCheckInError);
      }

      if (myCheckInData && myCheckInData.locales) {
        setMyCheckIn(myCheckInData);
        console.log('[Social v48.0] ✅ I am checked in to:', myCheckInData.locales.nombre);
      } else {
        setMyCheckIn(null);
      }

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

      const visibleCheckIns = (checkIns || []).filter(checkIn => {
        if (checkIn.visibility === 'all_users') return true;
        if (checkIn.visibility === 'followers') return true;
        if (checkIn.visibility === 'specific_users') {
          return checkIn.specific_user_ids?.includes(userId);
        }
        return false;
      });

      const locationsByLocal = new Map<string, FriendLocation>();
      visibleCheckIns.forEach(checkIn => {
        if (!checkIn.locales) return;

        const localId = checkIn.locales.id;
        if (!locationsByLocal.has(localId)) {
          locationsByLocal.set(localId, {
            local: checkIn.locales,
            users: [],
          });
        }
        locationsByLocal.get(localId)!.users.push(checkIn.usuarios);
      });

      const locations = Array.from(locationsByLocal.values());
      setFriendsLocations(locations);
      console.log('[Social v48.0] ✅ Loaded friends locations:', locations.length);
    } catch (error) {
      console.error('[Social v48.0] Error loading friends locations:', error);
    } finally {
      setLoadingFriendsLocations(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    loadUnreadCounts();

    const subscription = supabase
      .channel('social-feed-updates-v48')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${userId}`,
        },
        () => {
          console.log('[Social v48.0] 🔔 Notification update detected');
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
          console.log('[Social v48.0] 💬 Message update detected');
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
      console.log('[Social v48.0] No user ID, skipping load');
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

      console.log(`[Social v48.0] Loading posts for user ${userId} (${isImpersonating ? 'IMPERSONATING' : 'NORMAL'}), page ${pageNum}`);

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
      console.error('[Social v48.0] Error cargando posts:', error);
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
      loadFriendsLocations();
    }
  }, [userId, cargarPosts, loadFriendsLocations]);

  const handleRefresh = useCallback(() => {
    cargarPosts(1, true);
    loadFriendsLocations();
  }, [cargarPosts, loadFriendsLocations]);

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

  useEffect(() => {
    loadFriendsLocations();

    if (userId) {
      const checkInsChannel = supabase
        .channel('social-check-ins-updates-v48')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'check_ins',
          },
          () => {
            console.log('[Social v48.0] 🔔 Check-ins updated');
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

      {/* ✅ CRITICAL FIX: Momentos section always visible */}
      <MomentoCarousel />

      {(myCheckIn || friendsLocations.length > 0) && (
        <View style={styles.friendsLocationsSection}>
          <View style={styles.friendsLocationsSectionHeader}>
            <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={20} color={colors.primary} />
            <Text style={styles.friendsLocationsSectionTitle}>
              ¿Quieres saber dónde están tus amigos?
            </Text>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.friendsLocationsScroll}
            style={styles.friendsLocationsScrollView}
          >
            {myCheckIn && myCheckIn.locales && (
              <TouchableOpacity
                style={styles.friendLocationCard}
                onPress={() => router.push(`/detalle/local?id=${myCheckIn.locales.id}`)}
                activeOpacity={0.9}
              >
                <View style={styles.friendLocationImageContainer}>
                  {myCheckIn.locales.imagen_url ? (
                    <Image 
                      source={{ uri: myCheckIn.locales.imagen_url }} 
                      style={styles.friendLocationImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.friendLocationImage, styles.friendLocationImagePlaceholder]}>
                      <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={24} color="rgba(255, 255, 255, 0.6)" />
                    </View>
                  )}
                  <LinearGradient
                    colors={['transparent', 'rgba(0, 0, 0, 0.75)']}
                    style={styles.friendLocationGradient}
                  />
                  
                  <View style={[styles.friendLocationBadge, { backgroundColor: '#10B981' }]}>
                    <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={11} color={colors.white} />
                    <Text style={styles.friendLocationBadgeText}>Tú estás aquí</Text>
                  </View>
                </View>

                <View style={styles.friendLocationInfo}>
                  <Text style={styles.friendLocationName} numberOfLines={1}>
                    {myCheckIn.locales.nombre}
                  </Text>
                  <View style={styles.friendLocationMeta}>
                    <IconSymbol ios_icon_name="mappin" android_material_icon_name="location_on" size={9} color={colors.textSecondary} />
                    <Text style={styles.friendLocationAddress} numberOfLines={1}>
                      {myCheckIn.locales.direccion}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {friendsLocations.map((location) => (
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
                      <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={24} color="rgba(255, 255, 255, 0.6)" />
                    </View>
                  )}
                  <LinearGradient
                    colors={['transparent', 'rgba(0, 0, 0, 0.75)']}
                    style={styles.friendLocationGradient}
                  />
                  
                  <View style={styles.friendLocationAvatars}>
                    {location.users.slice(0, 3).map((user, userIndex) => (
                      <View 
                        key={user.id} 
                        style={[
                          styles.friendLocationAvatar,
                          { marginLeft: userIndex > 0 ? -8 : 0 }
                        ]}
                      >
                        {user.avatar ? (
                          <Image 
                            source={{ uri: user.avatar }} 
                            style={styles.friendLocationAvatarImage}
                          />
                        ) : (
                          <View style={styles.friendLocationAvatarPlaceholder}>
                            <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={10} color={colors.white} />
                          </View>
                        )}
                      </View>
                    ))}
                    {location.users.length > 3 && (
                      <View style={[styles.friendLocationAvatar, styles.friendLocationAvatarMore, { marginLeft: -8 }]}>
                        <Text style={styles.friendLocationAvatarMoreText}>+{location.users.length - 3}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.friendLocationBadge}>
                    <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={11} color={colors.white} />
                    <Text style={styles.friendLocationBadgeText}>
                      {location.users.length} {location.users.length === 1 ? 'amigo' : 'amigos'}
                    </Text>
                  </View>
                </View>

                <View style={styles.friendLocationInfo}>
                  <Text style={styles.friendLocationName} numberOfLines={1}>
                    {location.local.nombre}
                  </Text>
                  <View style={styles.friendLocationMeta}>
                    <IconSymbol ios_icon_name="mappin" android_material_icon_name="location_on" size={9} color={colors.textSecondary} />
                    <Text style={styles.friendLocationAddress} numberOfLines={1}>
                      {location.local.direccion}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </React.Fragment>
  ), [isImpersonating, impersonationSession, friendsLocations, myCheckIn, router]);

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

  if (!user && !isImpersonating) {
    return (
      <View style={styles.container}>
        <HeaderSocial
          unreadNotifications={0}
          unreadMessages={0}
          onCreatePost={handleCreatePost}
        />
        
        <LoginPrompt
          title="Inicia sesión para ver el contenido"
          message="Para acceder a la página social y ver las publicaciones de tus amigos, necesitas iniciar sesión en BarLive."
          icon="person.2.fill"
          androidIcon="people"
        />
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <IconSymbol ios_icon_name="person.crop.circle.badge.xmark" android_material_icon_name="person_off" size={64} color={colors.textSecondary} />
        <Text style={styles.emptyText}>No hay usuario activo</Text>
      </View>
    );
  }

  // ✅ CRITICAL FIX v48.0: Wrap content in PermissionGuard for local profiles
  const content = (
    <View style={styles.container}>
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

  // ✅ CRITICAL FIX v48.0: Only apply permission guard if in local profile mode
  if (currentMode === 'propietario' && activeProfileType === 'local') {
    return (
      <PermissionGuard requireSocialProfile={true}>
        {content}
      </PermissionGuard>
    );
  }

  return content;
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
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 10,
  },
  friendsLocationsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  friendsLocationsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  friendsLocationsScrollView: {
    flexGrow: 0,
  },
  friendsLocationsScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  friendLocationCard: {
    width: 120,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  friendLocationImageContainer: {
    width: '100%',
    height: 80,
    position: 'relative',
  },
  friendLocationImage: {
    width: '100%',
    height: '100%',
  },
  friendLocationImagePlaceholder: {
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendLocationGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  friendLocationAvatars: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendLocationAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.white,
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendLocationAvatarMoreText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.white,
  },
  friendLocationBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  friendLocationBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.white,
  },
  friendLocationInfo: {
    padding: 8,
  },
  friendLocationName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  friendLocationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  friendLocationAddress: {
    fontSize: 10,
    color: colors.textSecondary,
    flex: 1,
  },
});
