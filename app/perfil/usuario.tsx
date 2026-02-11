
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
  Platform,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import MomentoViewer from '@/components/momento/MomentoViewer';
import PostViewerModal from '@/components/social/PostViewerModal';
import { profileCache } from '@/utils/profileCache';
import { scaleFontSize } from '@/utils/androidScaling';
import UnifiedMomentoAvatar from '@/components/common/UnifiedMomentoAvatar';
import { formatFollowersCount } from '@/utils/formatters';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 4) / 3;

/**
 * ✅ USER PROFILE v123.0 - ELIMINACIÓN TOTAL DEL MARGEN BLANCO
 * 
 * CAMBIOS v123.0:
 * - ✅ ELIMINADO: TODO el margen blanco entre el header azul y las pestañas
 * - ✅ CORREGIDO: profileHeaderGradient tiene paddingBottom: 0 (sin espacio extra)
 * - ✅ CORREGIDO: tabsContainer tiene marginTop: 0 (sin espacio blanco)
 * - ✅ CORREGIDO: profileSection tiene paddingBottom: 16 (espacio interno del contenido)
 * - ✅ RESULTADO: La sección azul del header termina EXACTAMENTE donde empiezan las pestañas
 * - ✅ RESULTADO: NO HAY ESPACIO GRISÁCEO/BLANCO entre el header y las pestañas
 */

export default function UsuarioPerfilScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user: currentUser } = useAuth();
  
  const [loading, setLoading] = useState(false);
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
  const hasLoadedOnce = useRef(false);

  const userId = params.userId as string;
  const isOwnProfile = currentUser && currentUser.id === userId;
  const isAdminView = params.adminView === 'true' && currentUser?.rol_app === 'admin';

  const from = params.from as string | undefined;
  const returnTab = params.returnTab as string | undefined;
  const returnLocalId = params.localId as string | undefined;

  console.log('[UsuarioPerfil v123.0] 🎯 NAVEGACIÓN CONTEXTUAL: Navigation params received:');
  console.log('[UsuarioPerfil v123.0] 🎯 NAVEGACIÓN CONTEXTUAL:   - from:', from || 'NOT SET');
  console.log('[UsuarioPerfil v123.0] 🎯 NAVEGACIÓN CONTEXTUAL:   - returnTab:', returnTab || 'NOT SET');
  console.log('[UsuarioPerfil v123.0] 🎯 NAVEGACIÓN CONTEXTUAL:   - localId:', returnLocalId || 'NOT SET');

  const handleGoBack = useCallback(() => {
    console.log('[UsuarioPerfil v123.0] 🔙 NAVEGACIÓN CON router.setParams() + router.back(): Back button pressed');
    console.log('[UsuarioPerfil v123.0] 🔙 NAVEGACIÓN CON router.setParams() + router.back(): Evaluating navigation context...');
    
    if (from === 'sala-virtual' && returnTab) {
      console.log('[UsuarioPerfil v123.0] ✅ NAVEGACIÓN CON router.setParams() + router.back(): Context detected - returning to virtual room');
      console.log('[UsuarioPerfil v123.0] 🎯 NAVEGACIÓN CON router.setParams() + router.back(): Target tab:', returnTab);
      console.log('[UsuarioPerfil v123.0] 🏠 NAVEGACIÓN CON router.setParams() + router.back(): Target local:', returnLocalId || 'NOT SET');
      
      console.log('[UsuarioPerfil v123.0] 🔥 NAVEGACIÓN CON router.setParams() + router.back(): Step 1 - Updating previous screen params with router.setParams()');
      router.setParams({ returnTab: returnTab });
      console.log('[UsuarioPerfil v123.0] ✅ NAVEGACIÓN CON router.setParams() + router.back(): router.setParams() executed');
      
      console.log('[UsuarioPerfil v123.0] 🔥 NAVEGACIÓN CON router.setParams() + router.back(): Step 2 - Executing router.back()');
      router.back();
      console.log('[UsuarioPerfil v123.0] ✅ NAVEGACIÓN CON router.setParams() + router.back(): router.back() executed');
      console.log('[UsuarioPerfil v123.0] 🎯 NAVEGACIÓN CON router.setParams() + router.back(): The virtual room will detect params.returnTab and restore the tab');
    } else {
      console.log('[UsuarioPerfil v123.0] ℹ️ NAVEGACIÓN CON router.setParams() + router.back(): No context - using standard back navigation');
      
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    }
  }, [from, returnTab, returnLocalId, router]);

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
        console.error('[UsuarioPerfil v123.0] Error loading current local:', error);
        return;
      }

      if (checkIn && checkIn.locales) {
        const safeImageUrl = checkIn.locales.imagen_url && !checkIn.locales.imagen_url.startsWith('file://') 
          ? checkIn.locales.imagen_url 
          : null;
        
        setCurrentLocal({
          ...checkIn.locales,
          imagen_url: safeImageUrl,
        });
        
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
      console.error('[UsuarioPerfil v123.0] Error loading current local:', error);
    }
  }, [userId, isOwnProfile, currentUser, isAdminView]);

  const loadFollowerCounts = useCallback(async (targetUserId: string) => {
    try {
      const { data: seguidoresData, error: seguidoresError } = await supabase
        .rpc('get_total_seguidores_count', { p_usuario_id: targetUserId });

      if (seguidoresError) {
        console.error('[UsuarioPerfil v123.0] Error counting followers:', seguidoresError);
      }

      const { data: seguidosData, error: seguidosError } = await supabase
        .rpc('get_total_siguiendo_count', { p_usuario_id: targetUserId });

      if (seguidosError) {
        console.error('[UsuarioPerfil v123.0] Error counting following:', seguidosError);
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
        console.error('[UsuarioPerfil v123.0] Error updating user counters:', updateError);
      }

      return { seguidores: actualSeguidores, seguidos: actualSeguidos };
    } catch (error) {
      console.error('[UsuarioPerfil v123.0] Error loading follower counts:', error);
      return { seguidores: 0, seguidos: 0 };
    }
  }, []);

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
        console.error('[UsuarioPerfil v123.0] Error loading user:', userError);
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
            const safeUserData = {
              ...userData,
              avatar: userData.avatar && !userData.avatar.startsWith('file://') ? userData.avatar : null,
            };
            setUsuario(safeUserData);
            if (!silent) setLoading(false);
            return;
          }
        } else {
          const safeUserData = {
            ...userData,
            avatar: userData.avatar && !userData.avatar.startsWith('file://') ? userData.avatar : null,
          };
          setUsuario(safeUserData);
          if (!silent) setLoading(false);
          return;
        }
      }

      const safeUserData = {
        ...userData,
        avatar: userData.avatar && !userData.avatar.startsWith('file://') ? userData.avatar : null,
      };
      setUsuario(safeUserData);

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

      await profileCache.set(userId, 'user', {
        profile: safeUserData,
        posts: postsData || [],
        stats: newStats,
      });

      console.log('[UsuarioPerfil v123.0] ✅ Data loaded and cached');

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
      console.error('[UsuarioPerfil v123.0] Error loading data:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [userId, currentUser, router, loadFollowerCounts, loadCurrentLocal, isOwnProfile, isAdminView]);

  const loadUserDataWithCache = useCallback(async () => {
    if (!userId) {
      router.back();
      return;
    }

    try {
      console.log('[UsuarioPerfil v123.0] ⚡⚡⚡ INSTANT LOAD - Checking cache...');
      
      const cachedData = await profileCache.get(userId, 'user');
      
      if (cachedData) {
        console.log('[UsuarioPerfil v123.0] ⚡ INSTANT display with cached data');
        
        const safeProfile = {
          ...cachedData.profile,
          avatar: cachedData.profile.avatar && !cachedData.profile.avatar.startsWith('file://') 
            ? cachedData.profile.avatar 
            : null,
        };
        
        setUsuario(safeProfile);
        setPosts(cachedData.posts);
        setStats(cachedData.stats);
        hasLoadedOnce.current = true;
        
        setTimeout(() => {
          console.log('[UsuarioPerfil v123.0] 🔄 Background refresh...');
          loadUserData(true);
        }, 100);
      } else {
        console.log('[UsuarioPerfil v123.0] 📡 No cache, loading from database...');
        await loadUserData(false);
      }
    } catch (error) {
      console.error('[UsuarioPerfil v123.0] Error in loadUserDataWithCache:', error);
      await loadUserData(false);
    }
  }, [userId, router, loadUserData]);

  useFocusEffect(
    useCallback(() => {
      console.log('[UsuarioPerfil v123.0] ⚡ Screen focused - keeping state alive');
      
      if (!hasLoadedOnce.current) {
        loadUserDataWithCache();
      } else {
        console.log('[UsuarioPerfil v123.0] 🔄 Background refresh...');
        loadUserData(true);
      }
      
      return () => {
        console.log('[UsuarioPerfil v123.0] Screen unfocused - state persisted');
      };
    }, [loadUserDataWithCache, loadUserData])
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
            console.log('[UsuarioPerfil v123.0] ⚡ INSTANT update - Followers changed');
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
            console.log('[UsuarioPerfil v123.0] ⚡ INSTANT update - Following changed');
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
            console.log('[UsuarioPerfil v123.0] ⚡ INSTANT update - Posts changed');
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
            console.log('[UsuarioPerfil v123.0] ⚡ INSTANT update - Check-in changed');
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
      console.log('[UsuarioPerfil v123.0] 🎬 Auto-opening momento viewer from message');
      setShowMomentoViewer(true);
    }
  }, [params.openMomento, loading, usuario]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData(false);
    setRefreshing(false);
  };

  const handleFollow = useCallback(async () => {
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
      console.error('[UsuarioPerfil v123.0] Error toggling follow:', error);
      
      setIsFollowing(wasFollowing);
      setStats(prev => ({
        ...prev,
        seguidores: previousSeguidores,
      }));
      
      Alert.alert('Error', 'No se pudo completar la acción. Por favor, intenta de nuevo.');
    } finally {
      isTogglingFollow.current = false;
    }
  }, [currentUser, isFollowing, stats.seguidores, userId, loadFollowerCounts]);

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
              console.error('[UsuarioPerfil v123.0] Error toggling block:', error);
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
              console.error('[UsuarioPerfil v123.0] Error exiting local:', error);
              Alert.alert('Error', 'No se pudo realizar el check-out');
            }
          },
        },
      ]
    );
  };

  const getVisibilityText = () => {
    if (!currentLocal) return '';
    return 'Ahora en este local';
  };

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

  const seguidoresFormatted = formatFollowersCount(stats.seguidores);
  const seguidosFormatted = formatFollowersCount(stats.seguidos);
  const publicacionesFormatted = formatFollowersCount(stats.posts);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.scrollableHeader}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
              <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
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
          </View>

          {isAdminView && (
            <View style={styles.adminBadge}>
              <IconSymbol ios_icon_name="shield.fill" android_material_icon_name="admin_panel_settings" size={14} color={colors.white} />
              <Text style={[styles.adminBadgeText, { fontSize: scaleFontSize(12) }]}>Modo Administrador</Text>
            </View>
          )}
        </LinearGradient>

        {/* ✅ FIX v123.0: paddingBottom = 0 para eliminar TODO el espacio entre header y pestañas */}
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.profileHeaderGradient}
        >
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
              <UnifiedMomentoAvatar
                userId={userId}
                imageUrl={usuario.avatar}
                size={96}
                showAddButton={false}
                isOwner={false}
                onPress={handleOpenMomentoViewer}
              />
              
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { fontSize: scaleFontSize(22) }]}>{usuario.nombre}</Text>
                {usuario.username && (
                  <Text style={[styles.profileUsername, { fontSize: scaleFontSize(15) }]}>@{usuario.username}</Text>
                )}
                {usuario.perfil_privado && (
                  <View style={styles.privateProfileBadge}>
                    <IconSymbol ios_icon_name="lock.fill" android_material_icon_name="lock" size={12} color={colors.headerText} />
                    <Text style={[styles.privateProfileText, { fontSize: scaleFontSize(11) }]}>Perfil Privado</Text>
                  </View>
                )}
                
                <View style={styles.statsContainerCompact}>
                  <View style={styles.statItemCompact}>
                    <Text style={[styles.statNumberCompact, { fontSize: scaleFontSize(18) }]}>
                      {isPrivateAndNoAccess ? '-' : publicacionesFormatted}
                    </Text>
                    <Text style={[styles.statLabelCompact, { fontSize: scaleFontSize(13) }]}>publicaciones</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.statItemCompact} 
                    onPress={isPrivateAndNoAccess ? undefined : handleSeguidores}
                    disabled={isPrivateAndNoAccess}
                  >
                    <Text style={[styles.statNumberCompact, { fontSize: scaleFontSize(18) }]}>
                      {isPrivateAndNoAccess ? '-' : seguidoresFormatted}
                    </Text>
                    <Text style={[styles.statLabelCompact, { fontSize: scaleFontSize(13) }]}>seguidores</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.statItemCompact} 
                    onPress={isPrivateAndNoAccess ? undefined : handleSeguidos}
                    disabled={isPrivateAndNoAccess}
                  >
                    <Text style={[styles.statNumberCompact, { fontSize: scaleFontSize(18) }]}>
                      {isPrivateAndNoAccess ? '-' : seguidosFormatted}
                    </Text>
                    <Text style={[styles.statLabelCompact, { fontSize: scaleFontSize(13) }]}>siguiendo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {usuario.bio && !isPrivateAndNoAccess && (
              <Text style={[styles.profileBio, { fontSize: scaleFontSize(15) }]}>{usuario.bio}</Text>
            )}

            {currentLocal && canViewLocation && !isPrivateAndNoAccess && (
              <View style={styles.currentLocalCompact}>
                <LinearGradient
                  colors={['rgba(45, 212, 191, 0.25)', 'rgba(6, 182, 212, 0.25)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.currentLocalCompactGradient}
                >
                  <View style={styles.currentLocalCompactHeader}>
                    <View style={styles.currentLocalCompactHeaderLeft}>
                      <View style={styles.pulseContainer}>
                        <View style={styles.pulseOuter} />
                        <View style={styles.pulseInner} />
                        <IconSymbol 
                          ios_icon_name="mappin.circle.fill" 
                          android_material_icon_name="location_on" 
                          size={14} 
                          color="#FFFFFF" 
                        />
                      </View>
                      <Text style={[styles.currentLocalCompactTitle, { fontSize: scaleFontSize(13) }]}>Estado actual</Text>
                    </View>
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={[styles.liveBadgeText, { fontSize: scaleFontSize(9) }]}>EN VIVO</Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.currentLocalCompactContent}
                    onPress={handleViewLocal}
                    activeOpacity={0.9}
                  >
                    <View style={styles.currentLocalCompactImageWrapper}>
                      {currentLocal.imagen_url ? (
                        <Image 
                          source={{ uri: currentLocal.imagen_url }} 
                          style={styles.currentLocalCompactImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.currentLocalCompactImage, styles.currentLocalCompactImagePlaceholder]}>
                          <IconSymbol 
                            ios_icon_name="building.2.fill" 
                            android_material_icon_name="store" 
                            size={20} 
                            color="#FFFFFF" 
                          />
                        </View>
                      )}
                    </View>

                    <View style={styles.currentLocalCompactInfo}>
                      <Text style={[styles.currentLocalCompactName, { fontSize: scaleFontSize(14) }]} numberOfLines={1}>
                        {currentLocal.nombre}
                      </Text>
                      <View style={styles.currentLocalCompactMeta}>
                        <IconSymbol 
                          ios_icon_name="mappin" 
                          android_material_icon_name="location_on" 
                          size={10} 
                          color="rgba(255, 255, 255, 0.8)" 
                        />
                        <Text style={[styles.currentLocalCompactAddress, { fontSize: scaleFontSize(11) }]} numberOfLines={1}>
                          {currentLocal.direccion}
                        </Text>
                      </View>
                      <Text style={[styles.currentLocalCompactVisibility, { fontSize: scaleFontSize(10) }]} numberOfLines={1}>
                        {getVisibilityText()}
                      </Text>
                    </View>

                    <View style={styles.currentLocalCompactArrow}>
                      <IconSymbol 
                        ios_icon_name="chevron.right" 
                        android_material_icon_name="chevron_right" 
                        size={16} 
                        color="rgba(255, 255, 255, 0.8)" 
                      />
                    </View>
                  </TouchableOpacity>
                  
                  {isOwnProfile && (
                    <TouchableOpacity 
                      style={styles.exitLocalButtonCompact} 
                      onPress={handleExitLocal}
                      activeOpacity={0.8}
                    >
                      <IconSymbol 
                        ios_icon_name="mappin.slash.circle.fill" 
                        android_material_icon_name="location_off" 
                        size={12} 
                        color="#6B7280" 
                      />
                      <Text style={[styles.exitLocalButtonCompactText, { fontSize: scaleFontSize(11) }]}>Salir del local</Text>
                    </TouchableOpacity>
                  )}
                </LinearGradient>
              </View>
            )}

            {!isOwnProfile && !isAdminView && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, isFollowing && styles.actionButtonFollowing]}
                  onPress={handleFollow}
                  disabled={isTogglingFollow.current}
                >
                  <IconSymbol 
                    ios_icon_name={isFollowing ? 'person.fill.checkmark' : 'person.badge.plus'} 
                    android_material_icon_name={isFollowing ? 'person_add_disabled' : 'person_add'}
                    size={18} 
                    color={isFollowing ? colors.headerText : colors.headerText} 
                  />
                  <Text style={[styles.actionButtonText, { fontSize: scaleFontSize(15) }]}>
                    {isFollowing ? 'Siguiendo' : 'Seguir'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
                  <IconSymbol ios_icon_name="message.fill" android_material_icon_name="message" size={18} color={colors.headerText} />
                  <Text style={[styles.actionButtonText, { fontSize: scaleFontSize(15) }]}>Mensaje</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </LinearGradient>

        {/* ✅ FIX v123.0: marginTop = 0 para eliminar el espacio blanco */}
        <View style={styles.tabsContainer}>
          <View style={styles.tab}>
            <IconSymbol 
              ios_icon_name="square.grid.3x3" 
              android_material_icon_name="grid_on"
              size={24} 
              color={colors.primary} 
            />
          </View>
        </View>

        <View style={styles.content}>
          {isPrivateAndNoAccess ? (
            <View style={styles.privateProfileMessage}>
              <IconSymbol ios_icon_name="lock.fill" android_material_icon_name="lock" size={64} color={colors.textSecondary} />
              <Text style={[styles.privateProfileTitle, { fontSize: scaleFontSize(20) }]}>Este perfil es privado</Text>
              <Text style={[styles.privateProfileSubtext, { fontSize: scaleFontSize(15) }]}>
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
                      {...(Platform.OS === 'android' && { cache: 'force-cache' as any })}
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
              <Text style={[styles.emptyText, { fontSize: scaleFontSize(16) }]}>No hay publicaciones</Text>
            </View>
          )}
        </View>
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
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  scrollableHeader: {
    paddingTop: Platform.OS === 'android' ? 36 : 50,
    paddingBottom: Platform.OS === 'android' ? 8 : 12,
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
    fontWeight: '700',
    color: colors.white,
  },
  // ✅ FIX v123.0: paddingBottom = 0 para eliminar TODO el espacio entre header y pestañas
  profileHeaderGradient: {
    paddingTop: 12,
    paddingBottom: 0,
    paddingHorizontal: 20,
  },
  // ✅ FIX v123.0: paddingBottom = 16 para mantener el espacio interno del contenido
  profileSection: {
    paddingTop: 0,
    paddingBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 2,
  },
  profileUsername: {
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
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
    marginBottom: 8,
  },
  privateProfileText: {
    fontWeight: '700',
    color: colors.headerText,
  },
  statsContainerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statItemCompact: {
    alignItems: 'center',
    gap: 2,
  },
  statNumberCompact: {
    fontWeight: '700',
    color: colors.headerText,
  },
  statLabelCompact: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  profileBio: {
    color: colors.headerText,
    lineHeight: 20,
    marginBottom: 12,
  },
  currentLocalCompact: {
    marginBottom: 14,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  currentLocalCompactGradient: {
    padding: 12,
  },
  currentLocalCompactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  currentLocalCompactHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseOuter: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  pulseInner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  currentLocalCompactTitle: {
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
  },
  liveBadgeText: {
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  currentLocalCompactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    gap: 8,
  },
  currentLocalCompactImageWrapper: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
  },
  currentLocalCompactImage: {
    width: '100%',
    height: '100%',
  },
  currentLocalCompactImagePlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocalCompactInfo: {
    flex: 1,
  },
  currentLocalCompactName: {
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  currentLocalCompactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 2,
  },
  currentLocalCompactAddress: {
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  currentLocalCompactVisibility: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  currentLocalCompactArrow: {
    justifyContent: 'center',
  },
  exitLocalButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.3)',
  },
  exitLocalButtonCompactText: {
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.3,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  actionButtonFollowing: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  actionButtonText: {
    fontWeight: '600',
    color: colors.headerText,
  },
  // ✅ FIX v123.0: marginTop = 0 para eliminar el espacio blanco
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    marginTop: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
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
    fontWeight: '700',
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  privateProfileSubtext: {
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
    color: colors.textSecondary,
    marginTop: 16,
  },
});
