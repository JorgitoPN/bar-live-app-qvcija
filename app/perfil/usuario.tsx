
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import MiniAvatarWithMomento from '@/components/momento/MiniAvatarWithMomento';
import MomentoViewer from '@/components/momento/MomentoViewer';
import PostViewerModal from '@/components/social/PostViewerModal';
import { profileCache } from '@/utils/profileCache';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 4) / 3;

/**
 * ✅ USER PROFILE v2.0 - INSTANT LOADING WITH PERSISTENCE
 * 
 * Features:
 * - ✅ NO loading screens - instant display with cached data
 * - ✅ Background sync for fresh data without blocking UI
 * - ✅ Persistent state - doesn't unmount when navigating away
 * - ✅ Same system as Lista de Locales and Feed Social
 */

export default function UsuarioPerfilScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user: currentUser } = useAuth();
  
  const [loading, setLoading] = useState(false); // ✅ Changed: No initial loading
  const [refreshing, setRefreshing] = useState(false);
  const [usuario, setUsuario] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showMomentoViewer, setShowMomentoViewer] = useState(false);
  const [currentLocal, setCurrentLocal] = useState<any>(null);
  const [canViewLocation, setCanViewLocation] = useState(false);
  const [stats, setStats] = useState({
    posts: 0,
    seguidores: 0,
    seguidos: 0,
  });

  const [showPostViewer, setShowPostViewer] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [allPostIds, setAllPostIds] = useState<string[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const isTogglingFollow = useRef(false);
  const hasLoadedOnce = useRef(false); // ✅ NEW: Track if we've loaded data

  const userId = params.userId as string;
  const isOwnProfile = currentUser && currentUser.id === userId;
  const isAdminView = params.adminView === 'true' && currentUser?.rol_app === 'admin';

  // ✅ NEW: Keep-Alive - Don't reset state when screen loses focus
  useFocusEffect(
    useCallback(() => {
      console.log('[UsuarioPerfil] ⚡ Screen focused - keeping state alive');
      
      // Only load if we haven't loaded yet
      if (!hasLoadedOnce.current) {
        loadUserDataWithCache();
      } else {
        // Silent background refresh
        console.log('[UsuarioPerfil] 🔄 Background refresh...');
        loadUserData(true);
      }
      
      return () => {
        console.log('[UsuarioPerfil] Screen unfocused - state persisted');
      };
    }, [userId])
  );

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

  const loadCurrentLocal = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: checkIn, error } = await supabase
        .from('check_ins')
        .select(`
          local_id,
          visibility,
          specific_user_ids,
          locales!check_ins_local_id_fkey(id, nombre, imagen_url, tipo, direccion)
        `)
        .eq('usuario_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[UsuarioPerfil] Error loading current local:', error);
        return;
      }

      if (checkIn && checkIn.locales) {
        setCurrentLocal(checkIn.locales);
        
        if (isAdminView) {
          setCanViewLocation(true);
        } else if (isOwnProfile) {
          setCanViewLocation(true);
        } else if (currentUser) {
          if (checkIn.visibility === 'all_users') {
            setCanViewLocation(true);
          } else if (checkIn.visibility === 'followers') {
            const { data: followData } = await supabase
              .from('seguidores')
              .select('id')
              .eq('seguidor_id', currentUser.id)
              .eq('seguido_id', userId)
              .single();
            
            setCanViewLocation(!!followData);
          } else if (checkIn.visibility === 'specific_users') {
            const canView = checkIn.specific_user_ids?.includes(currentUser.id) || false;
            setCanViewLocation(canView);
          } else {
            setCanViewLocation(false);
          }
        } else {
          setCanViewLocation(false);
        }
      } else {
        setCurrentLocal(null);
        setCanViewLocation(false);
      }
    } catch (error) {
      console.error('[UsuarioPerfil] Error loading current local:', error);
    }
  }, [userId, isOwnProfile, currentUser, isAdminView]);

  const loadFollowerCounts = useCallback(async (targetUserId: string) => {
    try {
      const { data: seguidoresData, error: seguidoresError } = await supabase
        .rpc('get_total_seguidores_count', { p_usuario_id: targetUserId });

      if (seguidoresError) {
        console.error('[UsuarioPerfil] Error counting followers:', seguidoresError);
      }

      const { data: seguidosData, error: seguidosError } = await supabase
        .rpc('get_total_siguiendo_count', { p_usuario_id: targetUserId });

      if (seguidosError) {
        console.error('[UsuarioPerfil] Error counting following:', seguidosError);
      }

      const actualSeguidores = seguidoresData || 0;
      const actualSeguidos = seguidosData || 0;

      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          seguidores: actualSeguidores,
          seguidos: actualSeguidos,
        })
        .eq('id', targetUserId);

      if (updateError) {
        console.error('[UsuarioPerfil] Error updating user counters:', updateError);
      }

      return { seguidores: actualSeguidores, seguidos: actualSeguidos };
    } catch (error) {
      console.error('[UsuarioPerfil] Error loading follower counts:', error);
      return { seguidores: 0, seguidos: 0 };
    }
  }, []);

  // ✅ NEW: Load with cache first (instant), then refresh in background
  const loadUserDataWithCache = useCallback(async () => {
    if (!userId) {
      router.back();
      return;
    }

    try {
      console.log('[UsuarioPerfil] ⚡⚡⚡ INSTANT LOAD - Checking cache...');
      
      // Try to load from cache first
      const cachedData = await profileCache.get(userId, 'user');
      
      if (cachedData) {
        console.log('[UsuarioPerfil] ⚡ INSTANT display with cached data');
        setUsuario(cachedData.profile);
        setPosts(cachedData.posts);
        setStats(cachedData.stats);
        hasLoadedOnce.current = true;
        
        // Background refresh
        setTimeout(() => {
          console.log('[UsuarioPerfil] 🔄 Background refresh...');
          loadUserData(true);
        }, 100);
      } else {
        console.log('[UsuarioPerfil] 📡 No cache, loading from database...');
        await loadUserData(false);
      }
    } catch (error) {
      console.error('[UsuarioPerfil] Error in loadUserDataWithCache:', error);
      await loadUserData(false);
    }
  }, [userId, router]);

  const loadUserData = useCallback(async (silent: boolean = false) => {
    if (!userId) {
      router.back();
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        console.error('[UsuarioPerfil] Error loading user:', userError);
        if (!silent) {
          Alert.alert('Error', 'No se pudo cargar el perfil del usuario');
          router.back();
        }
        return;
      }

      if (userData.perfil_privado && !isOwnProfile && !isAdminView) {
        if (currentUser) {
          const { data: followData } = await supabase
            .from('seguidores')
            .select('id')
            .eq('seguidor_id', currentUser.id)
            .eq('seguido_id', userId)
            .single();

          if (!followData) {
            setUsuario(userData);
            if (!silent) setLoading(false);
            return;
          }
        } else {
          setUsuario(userData);
          if (!silent) setLoading(false);
          return;
        }
      }

      setUsuario(userData);

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('autor_id', userId)
        .eq('tipo', 'usuario')
        .order('created_at', { ascending: false });

      if (!postsError && postsData) {
        setPosts(postsData);
      }

      const followerCounts = await loadFollowerCounts(userId);
      const actualPostCount = postsData?.length || 0;

      const newStats = {
        posts: actualPostCount,
        seguidores: followerCounts.seguidores,
        seguidos: followerCounts.seguidos,
      };

      setStats(newStats);

      // ✅ Save to cache for instant loading next time
      await profileCache.set(userId, 'user', {
        profile: userData,
        posts: postsData || [],
        stats: newStats,
      });

      console.log('[UsuarioPerfil] ✅ Data loaded and cached');

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

      await loadCurrentLocal();
      hasLoadedOnce.current = true;
    } catch (error) {
      console.error('[UsuarioPerfil] Error loading data:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [userId, currentUser, router, loadFollowerCounts, loadCurrentLocal, isOwnProfile, isAdminView]);

  useEffect(() => {
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
            await loadUserData(true);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'check_ins',
            filter: `usuario_id=eq.${userId}`,
          },
          async () => {
            console.log('[UsuarioPerfil] ⚡ INSTANT update - Check-in changed');
            await loadCurrentLocal();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(seguidoresChannel);
      };
    }
  }, [userId, loadFollowerCounts, loadCurrentLocal, loadUserData]);

  useEffect(() => {
    if (params.openMomento === 'true' && !loading && usuario) {
      console.log('[UsuarioPerfil] 🎬 Auto-opening momento viewer from message');
      setShowMomentoViewer(true);
    }
  }, [params.openMomento, loading, usuario]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData(false);
    setRefreshing(false);
  };

  const handleFollow = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Debes iniciar sesión para seguir usuarios');
      return;
    }

    if (isTogglingFollow.current) {
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
      } else {
        const { data: existingFollow } = await supabase
          .from('seguidores')
          .select('id')
          .eq('seguidor_id', currentUser.id)
          .eq('seguido_id', userId)
          .single();

        if (existingFollow) {
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
    const postIds = posts.map(p => p.id);
    
    setSelectedPostId(postId);
    setAllPostIds(postIds);
    setShowPostViewer(true);
  };

  const handleSeguidores = () => {
    router.push(`/perfil/seguidores?userId=${userId}`);
  };

  const handleSeguidos = () => {
    router.push(`/perfil/seguidos?userId=${userId}`);
  };

  const handleOpenMomentoViewer = () => {
    if (!userId) return;
    setShowMomentoViewer(true);
  };

  const handleViewLocal = () => {
    if (currentLocal) {
      router.push(`/detalle/local?id=${currentLocal.id}`);
    }
  };

  const handleExitLocal = async () => {
    if (!currentUser || !currentLocal) return;

    Alert.alert(
      'Salir del local',
      `¿Quieres indicar que ya no estás en ${currentLocal.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('check_ins')
                .delete()
                .eq('usuario_id', currentUser.id);

              if (error) throw error;

              setCurrentLocal(null);
              setCanViewLocation(false);
              Alert.alert('✅ Check-out realizado', 'Ya no estás en este local');
            } catch (error) {
              console.error('[UsuarioPerfil] Error exiting local:', error);
              Alert.alert('Error', 'No se pudo realizar el check-out');
            }
          },
        },
      ]
    );
  };

  // ✅ Show content immediately if we have cached data
  if (loading && !usuario) {
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

  const isPrivateAndNoAccess = usuario.perfil_privado && !isOwnProfile && !isAdminView && !isFollowing;

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
          {!isOwnProfile && !isAdminView && (
            <TouchableOpacity onPress={handleBlock} style={styles.headerButton}>
              <IconSymbol
                ios_icon_name={isBlocked ? 'person.fill.checkmark' : 'person.fill.xmark'}
                android_material_icon_name={isBlocked ? 'person_add_disabled' : 'person_off'}
                size={24}
                color={colors.headerText}
              />
            </TouchableOpacity>
          )}
          {(isOwnProfile || isAdminView) && <View style={{ width: 40 }} />}
        </View>

        {isAdminView && (
          <View style={styles.adminBadge}>
            <IconSymbol ios_icon_name="shield.fill" android_material_icon_name="admin_panel_settings" size={14} color={colors.white} />
            <Text style={styles.adminBadgeText}>Modo Administrador</Text>
          </View>
        )}

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
            <View style={styles.avatarContainer}>
              <MiniAvatarWithMomento
                userId={userId}
                imageUrl={usuario.avatar || undefined}
                size={88}
                onPress={handleOpenMomentoViewer}
                showMomentoBorder={true}
              />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{usuario.nombre}</Text>
              {usuario.username && (
                <Text style={styles.profileUsername}>@{usuario.username}</Text>
              )}
              {usuario.perfil_privado && (
                <View style={styles.privateProfileBadge}>
                  <IconSymbol ios_icon_name="lock.fill" android_material_icon_name="lock" size={12} color={colors.headerText} />
                  <Text style={styles.privateProfileText}>Perfil Privado</Text>
                </View>
              )}
            </View>
          </View>

          {usuario.bio && !isPrivateAndNoAccess && (
            <Text style={styles.profileBio}>{usuario.bio}</Text>
          )}

          {currentLocal && canViewLocation && !isPrivateAndNoAccess && (
            <View style={styles.statusCard}>
              <View style={styles.statusCardHeader}>
                <View style={styles.statusIconContainer}>
                  <IconSymbol 
                    ios_icon_name="mappin.circle.fill" 
                    android_material_icon_name="location_on" 
                    size={16} 
                    color="#10B981" 
                  />
                </View>
                <Text style={styles.statusCardTitle}>Estado actual</Text>
              </View>

              <TouchableOpacity 
                style={styles.statusCardContent} 
                onPress={handleViewLocal}
                activeOpacity={0.9}
              >
                <View style={styles.statusLocalInfo}>
                  {currentLocal.imagen_url ? (
                    <Image 
                      source={{ uri: currentLocal.imagen_url }} 
                      style={styles.statusLocalImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.statusLocalImage, styles.statusLocalImagePlaceholder]}>
                      <IconSymbol 
                        ios_icon_name="building.2.fill" 
                        android_material_icon_name="store" 
                        size={20} 
                        color="#FFFFFF" 
                      />
                    </View>
                  )}
                  
                  <View style={styles.statusLocalDetails}>
                    <Text style={styles.statusLocalLabel}>Ahora en</Text>
                    <Text style={styles.statusLocalName} numberOfLines={1}>
                      {currentLocal.nombre}
                    </Text>
                    {currentLocal.direccion && (
                      <View style={styles.statusLocalAddress}>
                        <IconSymbol 
                          ios_icon_name="mappin" 
                          android_material_icon_name="location_on" 
                          size={10} 
                          color="#6B7280" 
                        />
                        <Text style={styles.statusLocalAddressText} numberOfLines={1}>
                          {currentLocal.direccion}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.statusLocalArrow}>
                    <IconSymbol 
                      ios_icon_name="chevron.right" 
                      android_material_icon_name="chevron_right" 
                      size={16} 
                      color="#9CA3AF" 
                    />
                  </View>
                </View>
              </TouchableOpacity>
              
              {isOwnProfile && (
                <TouchableOpacity 
                  style={styles.statusExitButton} 
                  onPress={handleExitLocal}
                  activeOpacity={0.8}
                >
                  <IconSymbol 
                    ios_icon_name="mappin.slash.circle.fill" 
                    android_material_icon_name="location_off" 
                    size={14} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.statusExitButtonText}>Salir del local</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{isPrivateAndNoAccess ? '-' : stats.posts}</Text>
              <Text style={styles.statLabel}>Publicaciones</Text>
            </View>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={isPrivateAndNoAccess ? undefined : handleSeguidores} disabled={isPrivateAndNoAccess}>
              <Text style={styles.statNumber}>{isPrivateAndNoAccess ? '-' : stats.seguidores}</Text>
              <Text style={styles.statLabel}>Seguidores</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={isPrivateAndNoAccess ? undefined : handleSeguidos} disabled={isPrivateAndNoAccess}>
              <Text style={styles.statNumber}>{isPrivateAndNoAccess ? '-' : stats.seguidos}</Text>
              <Text style={styles.statLabel}>Seguidos</Text>
            </TouchableOpacity>
          </View>

          {!isOwnProfile && !isAdminView && (
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
        {isPrivateAndNoAccess ? (
          <View style={styles.privateProfileMessage}>
            <IconSymbol ios_icon_name="lock.fill" android_material_icon_name="lock" size={64} color={colors.textSecondary} />
            <Text style={styles.privateProfileTitle}>Este perfil es privado</Text>
            <Text style={styles.privateProfileSubtext}>
              Sigue a {usuario.nombre} para ver sus publicaciones
            </Text>
          </View>
        ) : posts.length > 0 ? (
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

      <MomentoViewer
        visible={showMomentoViewer}
        authorId={userId}
        authorType="usuario"
        onClose={() => setShowMomentoViewer(false)}
      />

      {selectedPostId && allPostIds.length > 0 && (
        <PostViewerModal
          visible={showPostViewer}
          initialPostId={selectedPostId}
          allPostIds={allPostIds}
          hideTagIcon={true}
          onClose={() => {
            setShowPostViewer(false);
            setSelectedPostId(null);
            setAllPostIds([]);
          }}
          onUpdate={() => {
            loadUserData(true);
          }}
        />
      )}
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
    marginBottom: 12,
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
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
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
    marginBottom: 4,
  },
  privateProfileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  privateProfileText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.headerText,
  },
  profileBio: {
    fontSize: 15,
    color: colors.headerText,
    lineHeight: 22,
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statusIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.headerText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusCardContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  statusLocalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  statusLocalImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  statusLocalImagePlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLocalDetails: {
    flex: 1,
    marginLeft: 12,
  },
  statusLocalLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
    fontWeight: '500',
  },
  statusLocalName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statusLocalAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statusLocalAddressText: {
    fontSize: 11,
    color: '#6B7280',
    flex: 1,
  },
  statusLocalArrow: {
    marginLeft: 8,
  },
  statusExitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  statusExitButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
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
  privateProfileMessage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  privateProfileTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  privateProfileSubtext: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
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
    width: '100%',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
});
