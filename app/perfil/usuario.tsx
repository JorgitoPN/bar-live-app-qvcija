
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
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

const { width, height } = Dimensions.get('window');

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
  visto_por_usuario?: boolean;
}

export default function UsuarioPerfilScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user: currentUser } = useAuth();
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

  // FIXED: Story viewer states
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [userStories, setUserStories] = useState<HistoriaConAutor[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [currentStoryProgress, setCurrentStoryProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const storyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const storyProgressRef = useRef<NodeJS.Timeout | null>(null);

  const isTogglingFollow = useRef(false);

  const userId = params.userId as string;

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

      // FIXED: Only load user posts (tipo='usuario'), not local posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('autor_id', userId)
        .eq('tipo', 'usuario')
        .order('created_at', { ascending: false });

      if (!postsError) {
        setPosts(postsData || []);
      }

      const followerCounts = await loadFollowerCounts(userId);

      const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('autor_id', userId);

      setStats({
        posts: postsCount || 0,
        seguidores: followerCounts.seguidores,
        seguidos: followerCounts.seguidos,
      });

      console.log('[UsuarioPerfil] ✅ User stats loaded - Posts:', postsCount, 'Seguidores:', followerCounts.seguidores, 'Seguidos:', followerCounts.seguidos);

      // FIXED: Load user's stories for viewer - only user stories (tipo='usuario')
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

  // FIXED: Story viewer functions
  const stopStoryTimer = useCallback(() => {
    if (storyTimerRef.current) {
      clearTimeout(storyTimerRef.current);
      storyTimerRef.current = null;
    }
    if (storyProgressRef.current) {
      clearInterval(storyProgressRef.current);
      storyProgressRef.current = null;
    }
  }, []);

  const handleNextStory = useCallback(async () => {
    const currentStory = userStories[currentStoryIndex];
    
    if (currentStory && currentUser) {
      try {
        const { data: existingView } = await supabase
          .from('historia_views')
          .select('id')
          .eq('historia_id', currentStory.id)
          .eq('usuario_id', currentUser.id)
          .single();

        if (!existingView) {
          await supabase.from('historia_views').insert({
            historia_id: currentStory.id,
            usuario_id: currentUser.id,
          });
        }
      } catch (error) {
        console.error('[UsuarioPerfil] Error marking story as viewed:', error);
      }
    }
    
    if (currentStoryIndex < userStories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      setCurrentStoryProgress(0);
    } else {
      await loadUserData();
      setShowStoryViewer(false);
      stopStoryTimer();
    }
  }, [currentStoryIndex, userStories, stopStoryTimer, currentUser, loadUserData]);

  const startStoryTimer = useCallback(() => {
    if (storyTimerRef.current) {
      clearTimeout(storyTimerRef.current);
    }
    if (storyProgressRef.current) {
      clearInterval(storyProgressRef.current);
    }

    setCurrentStoryProgress(0);

    storyProgressRef.current = setInterval(() => {
      setCurrentStoryProgress(prev => {
        if (prev >= 100) {
          return 100;
        }
        return prev + 1;
      });
    }, 50);

    storyTimerRef.current = setTimeout(() => {
      handleNextStory();
    }, 5000);
  }, [handleNextStory]);

  const handlePreviousStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      setCurrentStoryProgress(0);
      startStoryTimer();
    } else {
      setShowStoryViewer(false);
      stopStoryTimer();
    }
  }, [currentStoryIndex, startStoryTimer, stopStoryTimer]);

  const handleAvatarPress = useCallback(() => {
    if (!currentUser) {
      Alert.alert('Error', 'Debes iniciar sesión para ver historias');
      return;
    }

    if (userStories.length > 0) {
      setCurrentStoryIndex(0);
      setShowStoryViewer(true);
      setIsPaused(false);
      startStoryTimer();
    }
  }, [currentUser, userStories, startStoryTimer]);

  useEffect(() => {
    if (showStoryViewer && !isPaused) {
      startStoryTimer();
    }
    return () => {
      stopStoryTimer();
    };
  }, [showStoryViewer, currentStoryIndex, isPaused, startStoryTimer, stopStoryTimer]);

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

  const currentStory = userStories[currentStoryIndex];
  const hasActiveStory = userStories.length > 0;
  const hasUnviewedStories = userStories.some(s => !s.visto_por_usuario);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{usuario.username || usuario.nombre}</Text>
          <TouchableOpacity onPress={handleBlock} style={styles.headerButton}>
            <IconSymbol
              name={isBlocked ? 'person.fill.checkmark' : 'person.fill.xmark'}
              size={24}
              color={colors.headerText}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          {/* FIXED: Avatar with story ring - clickable to open story viewer */}
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={handleAvatarPress}
            activeOpacity={0.7}
            disabled={!hasActiveStory}
          >
            {hasActiveStory && hasUnviewedStories && (
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.storyRing}
              />
            )}
            {usuario.avatar ? (
              <Image source={{ uri: usuario.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{usuario.nombre.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.posts}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push(`/perfil/seguidores?userId=${userId}`)}
            >
              <Text style={styles.statNumber}>{stats.seguidores}</Text>
              <Text style={styles.statLabel}>Seguidores</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push(`/perfil/seguidos?userId=${userId}`)}
            >
              <Text style={styles.statNumber}>{stats.seguidos}</Text>
              <Text style={styles.statLabel}>Seguidos</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{usuario.nombre}</Text>
          {usuario.username && (
            <Text style={styles.userUsername}>@{usuario.username}</Text>
          )}
        </View>

        {usuario.bio && (
          <View style={styles.bioSection}>
            <Text style={styles.bioText}>{usuario.bio}</Text>
          </View>
        )}

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
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {posts.length > 0 ? (
          <View style={styles.postsGrid}>
            {posts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.postItem}
                onPress={() => handleVerPost(post.id)}
              >
                {post.imagen && (
                  <Image source={{ uri: post.imagen }} style={styles.postImage} resizeMode="cover" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <IconSymbol name="photo.on.rectangle" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No hay publicaciones</Text>
          </View>
        )}
      </ScrollView>

      {/* FIXED: Story Viewer Modal */}
      <Modal
        visible={showStoryViewer}
        animationType="fade"
        onRequestClose={async () => {
          const currentStory = userStories[currentStoryIndex];
          
          if (currentStory && currentUser) {
            try {
              const { data: existingView } = await supabase
                .from('historia_views')
                .select('id')
                .eq('historia_id', currentStory.id)
                .eq('usuario_id', currentUser.id)
                .single();

              if (!existingView) {
                await supabase.from('historia_views').insert({
                  historia_id: currentStory.id,
                  usuario_id: currentUser.id,
                });
              }
            } catch (error) {
              console.error('[UsuarioPerfil] Error marking story as viewed on modal close:', error);
            }
          }
          
          await loadUserData();
          setShowStoryViewer(false);
          stopStoryTimer();
        }}
      >
        <View style={styles.storyViewerModal}>
          {currentStory && (
            <>
              <View style={styles.storyViewerHeader}>
                <View style={styles.storyProgressContainer}>
                  {userStories.map((_, index) => (
                    <View key={index} style={styles.storyProgressBar}>
                      {index < currentStoryIndex && (
                        <View style={[styles.storyProgressFill, { width: '100%' }]} />
                      )}
                      {index === currentStoryIndex && (
                        <View
                          style={[styles.storyProgressFill, { width: `${currentStoryProgress}%` }]}
                        />
                      )}
                    </View>
                  ))}
                </View>

                <View style={styles.storyAutorInfo}>
                  {usuario.avatar ? (
                    <Image source={{ uri: usuario.avatar }} style={styles.storyAutorAvatar} />
                  ) : (
                    <View style={[styles.storyAutorAvatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>
                        {usuario.nombre?.charAt(0).toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.storyAutorNombre}>{usuario.nombre}</Text>
                  <TouchableOpacity
                    style={styles.storyCloseButton}
                    onPress={async () => {
                      const currentStory = userStories[currentStoryIndex];
                      
                      if (currentStory && currentUser) {
                        try {
                          const { data: existingView } = await supabase
                            .from('historia_views')
                            .select('id')
                            .eq('historia_id', currentStory.id)
                            .eq('usuario_id', currentUser.id)
                            .single();

                          if (!existingView) {
                            await supabase.from('historia_views').insert({
                              historia_id: currentStory.id,
                              usuario_id: currentUser.id,
                            });
                          }
                        } catch (error) {
                          console.error('[UsuarioPerfil] Error marking story as viewed on close:', error);
                        }
                      }
                      
                      await loadUserData();
                      setShowStoryViewer(false);
                      stopStoryTimer();
                    }}
                    activeOpacity={0.7}
                  >
                    <IconSymbol name="xmark" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.storyContent}>
                <Image
                  source={{ uri: currentStory.imagen }}
                  style={styles.storyImage}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.storyTouchZones}>
                <Pressable
                  style={styles.storyTouchZone}
                  onPress={handlePreviousStory}
                />
                <Pressable
                  style={styles.storyTouchZone}
                  onPressIn={() => {
                    setIsPaused(true);
                    stopStoryTimer();
                  }}
                  onPressOut={() => {
                    setIsPaused(false);
                    startStoryTimer();
                  }}
                />
                <Pressable
                  style={styles.storyTouchZone}
                  onPress={handleNextStory}
                />
              </View>
            </>
          )}
        </View>
      </Modal>
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
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: colors.headerText,
    zIndex: 1,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  userInfo: {
    paddingHorizontal: 0,
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 4,
  },
  userUsername: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  bioSection: {
    paddingHorizontal: 0,
    marginBottom: 16,
  },
  bioText: {
    fontSize: 14,
    color: colors.headerText,
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonFollowing: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
  },
  actionButtonTextFollowing: {
    color: colors.primary,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  postItem: {
    width: (width - 3) / 3,
    height: (width - 3) / 3,
    padding: 0.5,
  },
  postImage: {
    width: '100%',
    height: '100%',
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
  storyViewerModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  storyViewerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  storyProgressContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  storyProgressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  storyProgressFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  storyAutorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyAutorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  storyAutorNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  storyCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyImage: {
    width: width,
    height: height,
  },
  storyTouchZones: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  storyTouchZone: {
    flex: 1,
  },
});
