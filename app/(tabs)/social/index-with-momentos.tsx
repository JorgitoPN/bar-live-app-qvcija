
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { useMode } from '@/contexts/ModeContext';
import { colors } from '@/styles/commonStyles';
import HeaderSocial from '@/components/layout/HeaderSocial';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import NewPostCard from '@/components/social/NewPostCard';
import MomentoCarousel from '@/components/momento/MomentoCarousel';
import MomentoViewer from '@/components/momento/MomentoViewer';
import MomentoUpload from '@/components/momento/MomentoUpload';
import type { Publicacion } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type UserRole = 'admin' | 'propietario' | 'cliente';
type SubscriptionPlan = 'free' | 'basic' | 'premium' | 'enterprise';

interface LocalSubscriptionInfo {
  plan: SubscriptionPlan;
  isActive: boolean;
  expiresAt?: string;
}

export default function SocialScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { 
    posts: globalPosts,
  } = useGlobalData();
  const { 
    activeProfileType,
    activeProfileId,
    activeLocalData: modeLocalData,
  } = useMode();

  const [posts, setPosts] = useState<Publicacion[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [userRole, setUserRole] = useState<UserRole>('cliente');
  const [localSubscription, setLocalSubscription] = useState<LocalSubscriptionInfo | null>(null);
  
  // Momento states
  const [showMomentoViewer, setShowMomentoViewer] = useState(false);
  const [showMomentoUpload, setShowMomentoUpload] = useState(false);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>('');
  const [selectedAuthorType, setSelectedAuthorType] = useState<'usuario' | 'local'>('usuario');
  
  const isLoadingRef = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const isInteractingAsLocal = activeProfileType === 'local';
  const interactionLocalId = isInteractingAsLocal ? activeProfileId : null;
  
  const displayAvatar = isInteractingAsLocal 
    ? (modeLocalData?.imagen_url || null)
    : (user?.avatar || null);
  
  const displayName = isInteractingAsLocal
    ? (modeLocalData?.nombre || 'Local')
    : (user?.nombre || 'Usuario');

  console.log('[Social] 🎭 Active Profile:', {
    activeProfileType,
    activeProfileId,
    isInteractingAsLocal,
    interactionLocalId,
    displayName,
    hasAvatar: !!displayAvatar,
    userRole,
    localSubscription,
  });

  useEffect(() => {
    const loadUserRoleAndSubscription = async () => {
      if (!user) return;

      try {
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('rol_app')
          .eq('id', user.id)
          .single();

        if (userData && !userError) {
          setUserRole(userData.rol_app as UserRole);
          console.log('[Social] 👤 User role loaded:', userData.rol_app);
        }

        if (isInteractingAsLocal && interactionLocalId) {
          const { data: subData, error: subError } = await supabase
            .from('suscripciones_locales')
            .select(`
              estado,
              plan_id,
              planes_suscripcion (
                nombre,
                activo
              )
            `)
            .eq('local_id', interactionLocalId)
            .eq('usuario_id', user.id)
            .single();

          if (subData && !subError && subData.planes_suscripcion) {
            const planName = (subData.planes_suscripcion as any).nombre as SubscriptionPlan;
            const isActive = subData.estado === 'activa' && (subData.planes_suscripcion as any).activo;
            
            setLocalSubscription({
              plan: planName,
              isActive,
            });
            
            console.log('[Social] 💳 Local subscription loaded:', {
              plan: planName,
              isActive,
            });
          } else {
            setLocalSubscription({
              plan: 'free',
              isActive: false,
            });
          }
        }
      } catch (error) {
        console.error('[Social] Error loading role/subscription:', error);
      }
    };

    loadUserRoleAndSubscription();
  }, [user, isInteractingAsLocal, interactionLocalId]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const loadUnreadCounts = useCallback(async () => {
    if (!user) return;

    try {
      const { count: notifCount } = await supabase
        .from('notificaciones')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', user.id)
        .eq('leida', false);

      setUnreadNotifications(notifCount || 0);

      const { data: chatsData } = await supabase
        .from('chats')
        .select('id')
        .or(`usuario1_id.eq.${user.id},usuario2_id.eq.${user.id}`);

      if (chatsData) {
        let totalUnread = 0;
        for (const chat of chatsData) {
          const { count } = await supabase
            .from('mensajes')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .eq('leido', false)
            .neq('remitente_id', user.id);
          
          totalUnread += count || 0;
        }
        setUnreadMessages(totalUnread);
      }
    } catch (error) {
      console.error('[Social] Error loading unread counts:', error);
    }
  }, [user]);

  const canPerformAction = useCallback((action: 'create_post' | 'view_analytics' | 'create_event') => {
    if (userRole === 'admin') {
      return { allowed: true, reason: '' };
    }

    if (userRole === 'cliente') {
      if (action === 'create_post') {
        return { allowed: true, reason: '' };
      }
      return { 
        allowed: false, 
        reason: 'Esta función está disponible solo para propietarios de locales' 
      };
    }

    if (userRole === 'propietario') {
      if (!isInteractingAsLocal) {
        if (action === 'create_post') {
          return { allowed: true, reason: '' };
        }
        return { 
          allowed: false, 
          reason: 'Cambia al perfil de tu local para acceder a esta función' 
        };
      }

      if (!localSubscription || !localSubscription.isActive) {
        return {
          allowed: false,
          reason: 'Necesitas una suscripción activa para usar esta función'
        };
      }

      const plan = localSubscription.plan;

      if (plan === 'free') {
        if (action === 'create_post') {
          return { 
            allowed: false, 
            reason: 'Actualiza a un plan de pago para publicar contenido' 
          };
        }
        return { 
          allowed: false, 
          reason: 'Esta función requiere un plan de pago' 
        };
      }

      if (plan === 'basic') {
        if (action === 'create_post') {
          return { allowed: true, reason: '' };
        }
        if (action === 'view_analytics') {
          return { allowed: true, reason: '' };
        }
        if (action === 'create_event') {
          return { 
            allowed: false, 
            reason: 'Actualiza a Premium para crear eventos destacados' 
          };
        }
      }

      if (plan === 'premium' || plan === 'enterprise') {
        return { allowed: true, reason: '' };
      }
    }

    return { allowed: false, reason: 'Acción no permitida' };
  }, [userRole, isInteractingAsLocal, localSubscription]);

  const loadData = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('[Social] ⚡ Already loading, skipping...');
      return;
    }

    isLoadingRef.current = true;

    try {
      console.log('[Social] ⚡ Loading data...');
      console.log('[Social] 📍 Global posts available:', globalPosts.length);

      await loadUnreadCounts();

      let filteredPosts = globalPosts;

      if (userRole !== 'admin') {
        filteredPosts = await Promise.all(
          globalPosts.map(async (post) => {
            if (post.tipo === 'local' && post.local_id) {
              const { data: subData } = await supabase
                .from('suscripciones_locales')
                .select(`
                  estado,
                  planes_suscripcion (
                    nombre,
                    activo
                  )
                `)
                .eq('local_id', post.local_id)
                .eq('estado', 'activa')
                .single();

              if (subData && subData.planes_suscripcion) {
                const planName = (subData.planes_suscripcion as any).nombre;
                if (planName === 'basic' || planName === 'premium' || planName === 'enterprise') {
                  return post;
                }
              }
              return null;
            }
            return post;
          })
        ).then(posts => posts.filter(p => p !== null) as Publicacion[]);
      }

      if (filteredPosts.length > 0) {
        console.log('[Social] ⚡⚡⚡ INSTANT posts from global data:', filteredPosts.length);
        
        let validPosts = filteredPosts.filter(p => p && p.id);
        
        if (user && validPosts.length > 0) {
          const postIds = validPosts.map(p => p.id);
          
          const [likesResult, savesResult, commentsResult] = await Promise.all([
            supabase
              .from('likes')
              .select('post_id')
              .eq('usuario_id', user.id)
              .in('post_id', postIds),
            supabase
              .from('posts_guardados')
              .select('post_id')
              .eq('usuario_id', user.id)
              .in('post_id', postIds),
            supabase
              .from('comentarios')
              .select('post_id')
              .in('post_id', postIds),
          ]);

          const likedPostIds = new Set(likesResult.data?.map(l => l.post_id) || []);
          const savedPostIds = new Set(savesResult.data?.map(s => s.post_id) || []);
          
          const commentCounts = commentsResult.data?.reduce((acc, c) => {
            acc[c.post_id] = (acc[c.post_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {};

          const postsWithStatus = validPosts.map(post => ({
            ...post,
            user_has_liked: likedPostIds.has(post.id),
            user_has_saved: savedPostIds.has(post.id),
            comentarios_count: commentCounts[post.id] || 0,
          }));
          
          const finalValidPosts = postsWithStatus.filter(p => p && p.id);
          setPosts(finalValidPosts);
          console.log('[Social] ✅ Set', finalValidPosts.length, 'valid posts with user status');
        } else {
          const finalValidPosts = validPosts.filter(p => p && p.id);
          setPosts(finalValidPosts);
          console.log('[Social] ✅ Set', finalValidPosts.length, 'valid posts');
        }
      } else {
        setPosts([]);
      }

      console.log('[Social] ⚡ Data loaded successfully');
    } catch (error) {
      console.error('[Social] Error loading data:', error);
      setPosts([]);
    } finally {
      isLoadingRef.current = false;
      setIsInitialLoad(false);
    }
  }, [user, globalPosts, loadUnreadCounts, userRole]);

  useFocusEffect(
    useCallback(() => {
      console.log('[Social] 🔄 Screen focused - auto-updating data');
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    console.log('[Social] 🔄 Manual refresh triggered');
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreatePost = () => {
    console.log('[Social] ➕ Create post button pressed');
    
    const permission = canPerformAction('create_post');
    if (!permission.allowed) {
      Alert.alert(
        'Acción no permitida',
        permission.reason,
        [
          { text: 'Entendido', style: 'cancel' },
          ...(localSubscription && !localSubscription.isActive ? [{
            text: 'Ver planes',
            onPress: () => router.push('/gestion/planes-suscripcion'),
          }] : []),
        ]
      );
      return;
    }

    router.push('/crear/publicacion');
  };

  const handleOpenMomentoViewer = (authorId: string, tipo: 'usuario' | 'local') => {
    setSelectedAuthorId(authorId);
    setSelectedAuthorType(tipo);
    setShowMomentoViewer(true);
  };

  const handleCloseMomentoViewer = () => {
    setShowMomentoViewer(false);
    setSelectedAuthorId('');
  };

  const handleOpenMomentoUpload = () => {
    setShowMomentoUpload(true);
  };

  const handleCloseMomentoUpload = () => {
    setShowMomentoUpload(false);
  };

  const handleMomentoUploadSuccess = () => {
    // Refresh momentos carousel
    loadData();
  };

  if (isInitialLoad && posts.length === 0) {
    return (
      <View style={styles.container}>
        <HeaderSocial 
          onCreatePost={handleCreatePost}
          unreadNotifications={unreadNotifications}
          unreadMessages={unreadMessages}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando feed social...</Text>
        </View>
      </View>
    );
  }

  const renderHeader = () => (
    <Animated.View 
      style={[
        styles.headerContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Momento Carousel */}
      <MomentoCarousel
        onOpenViewer={handleOpenMomentoViewer}
        onUploadMomento={handleOpenMomentoUpload}
      />

      {isInteractingAsLocal && localSubscription && (
        <View style={styles.subscriptionBanner}>
          <LinearGradient
            colors={
              localSubscription.plan === 'premium' 
                ? ['#FFD700', '#FFA500']
                : localSubscription.plan === 'basic'
                ? ['#4A90E2', '#357ABD']
                : ['#95a5a6', '#7f8c8d']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.subscriptionGradient}
          >
            <IconSymbol
              ios_icon_name={
                localSubscription.plan === 'premium' 
                  ? 'crown.fill'
                  : localSubscription.plan === 'basic'
                  ? 'star.fill'
                  : 'circle.fill'
              }
              android_material_icon_name={
                localSubscription.plan === 'premium'
                  ? 'workspace_premium'
                  : localSubscription.plan === 'basic'
                  ? 'star'
                  : 'circle'
              }
              size={20}
              color="#fff"
            />
            <Text style={styles.subscriptionText}>
              Plan {localSubscription.plan.toUpperCase()}
              {!localSubscription.isActive && ' (Inactivo)'}
            </Text>
            {!localSubscription.isActive && (
              <TouchableOpacity
                onPress={() => router.push('/gestion/planes-suscripcion')}
                style={styles.upgradeButton}
              >
                <Text style={styles.upgradeButtonText}>Activar</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>
      )}

      {userRole === 'admin' && (
        <View style={styles.adminBanner}>
          <LinearGradient
            colors={['#e74c3c', '#c0392b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.adminGradient}
          >
            <IconSymbol
              ios_icon_name="shield.fill"
              android_material_icon_name="shield"
              size={20}
              color="#fff"
            />
            <Text style={styles.adminText}>Modo Administrador</Text>
          </LinearGradient>
        </View>
      )}
    </Animated.View>
  );

  const renderPost = ({ item, index }: { item: Publicacion; index: number }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [
          {
            translateY: slideAnim.interpolate({
              inputRange: [0, 50],
              outputRange: [0, 50 + index * 10],
            }),
          },
        ],
      }}
    >
      <NewPostCard post={item} onUpdate={loadData} />
    </Animated.View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={[`${colors.primary}20`, `${colors.secondary}20`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.emptyIconCircle}
      >
        <IconSymbol
          ios_icon_name="photo.stack"
          android_material_icon_name="collections"
          size={64}
          color={colors.primary}
        />
      </LinearGradient>
      <Text style={styles.emptyStateTitle}>No hay publicaciones</Text>
      <Text style={styles.emptyStateText}>
        {isInteractingAsLocal 
          ? localSubscription && !localSubscription.isActive
            ? 'Activa tu suscripción para comenzar a publicar'
            : 'Crea la primera publicación de tu local'
          : 'Sé el primero en publicar'}
      </Text>
      {canPerformAction('create_post').allowed && (
        <TouchableOpacity 
          style={styles.createButton}
          onPress={handleCreatePost}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createButtonGradient}
          >
            <IconSymbol
              ios_icon_name="plus.circle.fill"
              android_material_icon_name="add_circle"
              size={24}
              color="#fff"
            />
            <Text style={styles.createButtonText}>Crear publicación</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <HeaderSocial 
        onCreatePost={handleCreatePost}
        unreadNotifications={unreadNotifications}
        unreadMessages={unreadMessages}
      />
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary, colors.secondary]}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        initialNumToRender={5}
        windowSize={10}
      />

      {/* Momento Viewer Modal */}
      <MomentoViewer
        visible={showMomentoViewer}
        authorId={selectedAuthorId}
        authorType={selectedAuthorType}
        onClose={handleCloseMomentoViewer}
      />

      {/* Momento Upload Modal */}
      <MomentoUpload
        visible={showMomentoUpload}
        onClose={handleCloseMomentoUpload}
        onSuccess={handleMomentoUploadSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: 'System',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  headerContainer: {
    backgroundColor: colors.background,
  },
  subscriptionBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subscriptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  subscriptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'System',
  },
  upgradeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  upgradeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'System',
  },
  adminBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  adminGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  adminText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'System',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    fontFamily: 'System',
  },
  emptyStateText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    fontFamily: 'System',
  },
  createButton: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  createButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'System',
  },
});
