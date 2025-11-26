
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { useStoryState } from '@/contexts/StoryStateContext';
import { supabase } from '@/utils/supabase';
import StoryViewer from '@/components/social/StoryViewer';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 4) / 3;

interface HistoriaConAutor {
  id: string;
  autor_id: string;
  tipo: string;
  imagen: string;
  created_at: string;
  expires_at: string;
  visto: boolean;
  autor?: {
    nombre: string;
    avatar?: string;
    username?: string;
  };
  autorNombre?: string;
  autorAvatar?: string;
  visto_por_usuario?: boolean;
  views_count?: number;
  likes_count?: number;
  liked_by_user?: boolean;
  comments_count?: number;
}

export default function UsuarioPerfilScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user: currentUser } = useAuth();
  const { hasUnviewedStories } = useStoryState();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usuario, setUsuario] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [stats, setStats] = useState({
    posts: 0,
    seguidores: 0,
    seguidos: 0,
  });

  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [userStories, setUserStories] = useState<HistoriaConAutor[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const isTogglingFollow = useRef(false);

  const userId = params.userId as string;
  const isOwnProfile = currentUser && currentUser.id === userId;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const loadFollowerCounts = useCallback(async (targetUserId: string) => {
    try {
      console.log('[UsuarioPerfil] 🔄 Loading follower counts from seguidores table...');

      const { count: seguidoresCount, error: seguidoresError } = await supabase
        .from('seguidores')
        .select('*', { count: 'exact', head: true })
        .eq('seguido_id', targetUserId);

      if (seguidoresError) {
        console.error('[UsuarioPerfil] Error counting followers:', seguidoresError);
      }

      const { count: seguidosCount, error: seguidosError } = await supabase
        .from('seguidores')
        .select('*', { count: 'exact', head: true })
        .eq('seguidor_id', targetUserId);

      if (seguidosError) {
        console.error('[UsuarioPerfil] Error counting following:', seguidosError);
      }

      const actualSeguidores = seguidoresCount || 0;
      const actualSeguidos = seguidosCount || 0;

      console.log('[UsuarioPerfil] ✅ Actual counts - Seguidores:', actualSeguidores, 'Seguidos:', actualSeguidos);

      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          seguidores: actualSeguidores,
          seguidos: actualSeguidos,
        })
        .eq('id', targetUserId);

      if (updateError) {
        console.error('[UsuarioPerfil] Error updating user counters:', updateError);
      } else {
        console.log('[UsuarioPerfil] ✅ User counters synchronized in database');
      }

      return { seguidores: actualSeguidores, seguidos: actualSeguidos };
    } catch (error) {
      console.error('[UsuarioPerfil] Error loading follower counts:', error);
      return { seguidores: 0, seguidos: 0 };
    }
  }, []);

  const loadUserData = useCallback(async () => {
    if (!userId) {
      router.back();
      return;
    }

    try {
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        console.error('[UsuarioPerfil] Error loading user:', userError);
        Alert.alert('Error', 'No se pudo cargar el perfil del usuario');
        router.back();
        return;
      }

      setUsuario(userData);

      // ✅ FIXED: Load posts and count them properly
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('autor_id', userId)
        .eq('tipo', 'usuario')
        .order('created_at', { ascending: false });

      if (!postsError && postsData) {
        setPosts(postsData);
        console.log('[UsuarioPerfil] ✅ Loaded posts:', postsData.length);
      }

      const followerCounts = await loadFollowerCounts(userId);

      // ✅ FIXED: Use actual post count from loaded posts
      const actualPostCount = postsData?.length || 0;

      setStats({
        posts: actualPostCount,
        seguidores: followerCounts.seguidores,
        seguidos: followerCounts.seguidos,
      });

      console.log('[UsuarioPerfil] ✅ User stats loaded - Posts:', actualPostCount, 'Seguidores:', followerCounts.seguidores, 'Seguidos:', followerCounts.seguidos);

      const { data: userStoriesData } = await supabase
        .from('historias')
        .select(`
          id,
          autor_id,
          tipo,
          imagen,
          created_at,
          expires_at,
          visto
        `)
        .eq('autor_id', userId)
        .eq('tipo', 'usuario')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (userStoriesData && currentUser) {
        const storyIds = userStoriesData.map(s => s.id);
        const { data: viewedData } = await supabase
          .from('historia_views')
          .select('historia_id')
          .eq('usuario_id', currentUser.id)
          .in('historia_id', storyIds);

        const viewedStoryIds = new Set(viewedData?.map(v => v.historia_id) || []);

        const storiesWithStatus = userStoriesData.map(story => ({
          ...story,
          visto_por_usuario: viewedStoryIds.has(story.id),
          autorNombre: userData.nombre,
          autorAvatar: userData.avatar,
          autor: {
            nombre: userData.nombre,
            avatar: userData.avatar,
            username: userData.username,
          },
        }));

        setUserStories(storiesWithStatus);
      }

      if (currentUser) {
        const { data: followData } = await supabase
          .from('seguidores')
          .select('id')
          .eq('seguidor_id', currentUser.id)
          .eq('seguido_id', userId)
          .single();

        setIsFollowing(!!followData);

        const { data: blockData } = await supabase
          .from('usuarios_bloqueados')
          .select('id')
          .eq('usuario_id', currentUser.id)
          .eq('bloqueado_id', userId)
          .single();

        setIsBlocked(!!blockData);
      }
    } catch (error) {
      console.error('[UsuarioPerfil] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, currentUser, router, loadFollowerCounts]);

  useEffect(() => {
    loadUserData();

    if (userId) {
      const seguidoresChannel = supabase
        .channel(`user-seguidores-changes-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'seguidores',
            filter: `seguido_id=eq.${userId}`,
          },
          async () => {
            console.log('[UsuarioPerfil] ⚡ INSTANT update - Followers changed');
            const followerCounts = await loadFollowerCounts(userId);
            setStats(prev => ({
              ...prev,
              seguidores: followerCounts.seguidores,
            }));
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'seguidores',
            filter: `seguidor_id=eq.${userId}`,
          },
          async () => {
            console.log('[UsuarioPerfil] ⚡ INSTANT update - Following changed');
            const followerCounts = await loadFollowerCounts(userId);
            setStats(prev => ({
              ...prev,
              seguidos: followerCounts.seguidos,
            }));
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'posts',
            filter: `autor_id=eq.${userId}`,
          },
          async () => {
            console.log('[UsuarioPerfil] ⚡ INSTANT update - Posts changed');
            await loadUserData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(seguidoresChannel);
      };
    }
  }, [loadUserData, userId, loadFollowerCounts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  const handleFollow = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Debes iniciar sesión para seguir usuarios');
      return;
    }

    if (isTogglingFollow.current) {
      console.log('[UsuarioPerfil] Already toggling follow, skipping...');
      return;
    }

    isTogglingFollow.current = true;

    const wasFollowing = isFollowing;
    const previousSeguidores = stats.seguidores;

    try {
      setIsFollowing(!wasFollowing);
      setStats(prev => ({
        ...prev,
        seguidores: wasFollowing ? Math.max(0, prev.seguidores - 1) : prev.seguidores + 1,
      }));

      if (wasFollowing) {
        console.log('[UsuarioPerfil] Unfollowing user...');
        
        const { error: deleteError } = await supabase
          .from('seguidores')
          .delete()
          .eq('seguidor_id', currentUser.id)
          .eq('seguido_id', userId);

        if (deleteError) throw deleteError;

        await loadFollowerCounts(userId);
        if (currentUser) {
          await loadFollowerCounts(currentUser.id);
        }

        console.log('[UsuarioPerfil] ✅ Unfollow successful');
      } else {
        console.log('[UsuarioPerfil] Following user...');

        const { data: existingFollow } = await supabase
          .from('seguidores')
          .select('id')
          .eq('seguidor_id', currentUser.id)
          .eq('seguido_id', userId)
          .single();

        if (existingFollow) {
          console.log('[UsuarioPerfil] Already following, skipping insert');
          isTogglingFollow.current = false;
          return;
        }

        const { error: insertError } = await supabase
          .from('seguidores')
          .insert({
            seguidor_id: currentUser.id,
            seguido_id: userId,
          });

        if (insertError) throw insertError;

        await loadFollowerCounts(userId);
        if (currentUser) {
          await loadFollowerCounts(currentUser.id);
        }

        await supabase
          .from('notificaciones')
          .insert({
            usuario_id: userId,
            tipo: 'seguidor',
            titulo: 'Nuevo seguidor',
            mensaje: `${currentUser.nombre} ha comenzado a seguirte`,
            usuario_origen_id: currentUser.id,
          });

        console.log('[UsuarioPerfil] ✅ Follow successful');
      }

      const updatedCounts = await loadFollowerCounts(userId);
      setStats(prev => ({
        ...prev,
        seguidores: updatedCounts.seguidores,
      }));
    } catch (error) {
      console.error('[UsuarioPerfil] Error toggling follow:', error);
      
      setIsFollowing(wasFollowing);
      setStats(prev => ({
        ...prev,
        seguidores: previousSeguidores,
      }));
      
      Alert.alert('Error', 'No se pudo completar la acción. Por favor, intenta de nuevo.');
    } finally {
      isTogglingFollow.current = false;
    }
  };

  const handleMessage = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Debes iniciar sesión para enviar mensajes');
      return;
    }

    router.push(`/chat/conversacion?userId=${userId}`);
  };

  const handleBlock = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Debes iniciar sesión para bloquear usuarios');
      return;
    }

    Alert.alert(
      isBlocked ? 'Desbloquear usuario' : 'Bloquear usuario',
      isBlocked
        ? `¿Deseas desbloquear a ${usuario?.nombre}?`
        : `¿Estás seguro de que quieres bloquear a ${usuario?.nombre}? No podrás ver su contenido ni interactuar con él.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: isBlocked ? 'Desbloquear' : 'Bloquear',
          style: isBlocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              if (isBlocked) {
                await supabase
                  .from('usuarios_bloqueados')
                  .delete()
                  .eq('usuario_id', currentUser.id)
                  .eq('bloqueado_id', userId);

                setIsBlocked(false);
                Alert.alert('Éxito', 'Usuario desbloqueado');
              } else {
                await supabase
                  .from('usuarios_bloqueados')
                  .insert({
                    usuario_id: currentUser.id,
                    bloqueado_id: userId,
                  });

                if (isFollowing) {
                  await supabase
                    .from('seguidores')
                    .delete()
                    .eq('seguidor_id', currentUser.id)
                    .eq('seguido_id', userId);

                  setIsFollowing(false);
                  
                  await loadFollowerCounts(userId);
                }

                setIsBlocked(true);
                Alert.alert('Éxito', 'Usuario bloqueado');
              }
            } catch (error) {
              console.error('[UsuarioPerfil] Error toggling block:', error);
              Alert.alert('Error', 'No se pudo completar la acción');
            }
          },
        },
      ]
    );
  };

  const handleVerPost = (postId: string) => {
    router.push(`/social/post?id=${postId}`);
  };

  const handleSeguidores = () => {
    router.push(`/perfil/seguidores?userId=${userId}`);
  };

  const handleSeguidos = () => {
    router.push(`/perfil/seguidos?userId=${userId}`);
  };

  const handleAvatarPress = useCallback(() => {
    if (!currentUser) {
      Alert.alert('Error', 'Debes iniciar sesión para ver historias');
      return;
    }

    if (userStories.length > 0) {
      console.log('[UsuarioPerfil] Opening story viewer with', userStories.length, 'stories');
      setCurrentStoryIndex(0);
      setShowStoryViewer(true);
    }
  }, [currentUser, userStories]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Cargando perfil...</Text>
      </View>
    );
  }

  if (!usuario) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>Usuario no encontrado</Text>
      </View>
    );
  }

  const hasActiveStory = userStories.length > 0;
  const showStoryOutline = hasActiveStory && hasUnviewedStories(userId, userStories);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{usuario.username || usuario.nombre}</Text>
          {!isOwnProfile && (
            <TouchableOpacity onPress={handleBlock} style={styles.headerButton}>
              <IconSymbol
                ios_icon_name={isBlocked ? 'person.fill.checkmark' : 'person.fill.xmark'}
                android_material_icon_name={isBlocked ? 'person_add_disabled' : 'person_off'}
                size={24}
                color={colors.headerText}
              />
            </TouchableOpacity>
          )}
          {isOwnProfile && <View style={{ width: 40 }} />}
        </View>

        <Animated.View 
          style={[
            styles.profileSection,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          <View style={styles.profileHeader}>
            <TouchableOpacity 
              style={styles.avatarContainer}
              onPress={handleAvatarPress}
              activeOpacity={0.8}
              disabled={!hasActiveStory}
            >
              {hasActiveStory && showStoryOutline && (
                <LinearGradient
                  colors={['#10B981', '#3B82F6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.storyRing}
                />
              )}
              {usuario.avatar ? (
                <Image source={{ uri: usuario.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={40} color={colors.headerText} />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{usuario.nombre}</Text>
              {usuario.username && (
                <Text style={styles.profileUsername}>@{usuario.username}</Text>
              )}
            </View>
          </View>

          {usuario.bio && (
            <Text style={styles.profileBio}>{usuario.bio}</Text>
          )}

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.posts}</Text>
              <Text style={styles.statLabel}>Publicaciones</Text>
            </View>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={handleSeguidores}>
              <Text style={styles.statNumber}>{stats.seguidores}</Text>
              <Text style={styles.statLabel}>Seguidores</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={handleSeguidos}>
              <Text style={styles.statNumber}>{stats.seguidos}</Text>
              <Text style={styles.statLabel}>Seguidos</Text>
            </TouchableOpacity>
          </View>

          {!isOwnProfile && (
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, isFollowing && styles.actionButtonFollowing]}
                onPress={handleFollow}
                disabled={isTogglingFollow.current}
              >
                <Text style={[styles.actionButtonText, isFollowing && styles.actionButtonTextFollowing]}>
                  {isFollowing ? 'Siguiendo' : 'Seguir'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
                <Text style={styles.actionButtonText}>Mensaje</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {posts.length > 0 ? (
          <View style={styles.postsGrid}>
            {posts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.gridItem}
                onPress={() => handleVerPost(post.id)}
                activeOpacity={0.8}
              >
                {post.imagen || (post.imagenes && post.imagenes.length > 0) ? (
                  <Image 
                    source={{ uri: post.imagenes && post.imagenes.length > 0 ? post.imagenes[0] : post.imagen }} 
                    style={styles.gridImage} 
                    resizeMode="cover" 
                  />
                ) : (
                  <View style={[styles.gridImage, styles.gridImagePlaceholder]}>
                    <IconSymbol ios_icon_name="photo" android_material_icon_name="photo" size={32} color={colors.textSecondary} />
                  </View>
                )}
                {post.imagenes && post.imagenes.length > 1 && (
                  <View style={styles.multipleImagesIndicator}>
                    <IconSymbol ios_icon_name="square.stack.fill" android_material_icon_name="collections" size={16} color={colors.headerText} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <IconSymbol ios_icon_name="photo.on.rectangle" android_material_icon_name="photo_library" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No hay publicaciones</Text>
          </View>
        )}
      </ScrollView>

      <StoryViewer
        visible={showStoryViewer}
        stories={userStories}
        initialIndex={currentStoryIndex}
        onClose={() => {
          console.log('[UsuarioPerfil] Closing story viewer');
          setShowStoryViewer(false);
        }}
        onStoryChange={(index) => {
          console.log('[UsuarioPerfil] Story changed to index:', index);
          setCurrentStoryIndex(index);
        }}
        onStoryDelete={async (storyId) => {
          console.log('[UsuarioPerfil] Story deleted:', storyId);
          await loadUserData();
        }}
        activeLocalProfileId={null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  headerButton: {
    padding: 8,
  },
  profileSection: {
    paddingTop: 0,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 20,
  },
  storyRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 48,
    zIndex: 0,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: colors.headerText,
    zIndex: 1,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  profileBio: {
    fontSize: 15,
    color: colors.headerText,
    lineHeight: 22,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingVertical: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statDivider: {
    width: 1,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
  },
  actionButtonFollowing: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.headerText,
  },
  actionButtonTextFollowing: {
    color: colors.headerText,
  },
  content: {
    flex: 1,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    backgroundColor: colors.cardBorder,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
    borderRadius: 4,
  },
  gridImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  multipleImagesIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    padding: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
});
