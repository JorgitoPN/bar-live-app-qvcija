
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  Modal,
  Linking,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useMode } from '@/contexts/ModeContext';
import { supabase } from '@/utils/supabase';
import ProfileSwitcher from '@/components/perfil/ProfileSwitcher';
import MomentoUpload from '@/components/momento/MomentoUpload';
import MomentoViewer from '@/components/momento/MomentoViewer';
import PostViewerModal from '@/components/social/PostViewerModal';
import ShoppingCart from '@/components/payment/ShoppingCart';
import { profileCache } from '@/utils/profileCache';
import UnifiedMomentoAvatar from '@/components/common/UnifiedMomentoAvatar';
import { scaleFontSize } from '@/utils/androidScaling';
import SolicitudPropiedadStatus from '@/components/perfil/SolicitudPropiedadStatus';
import { formatFollowersCount } from '@/utils/formatters';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 4) / 3;

interface Post {
  id: string;
  autor_id: string;
  contenido: string;
  imagen?: string;
  imagenes?: string[];
  likes: number;
  created_at: string;
  tipo: string;
  local_id?: string;
  autor?: {
    nombre: string;
    avatar?: string;
    username?: string;
  };
  liked?: boolean;
  saved?: boolean;
  comentarios?: number;
}

interface PerfilProfesional {
  id: string;
  nombre_completo: string;
  puesto_deseado: string;
  experiencia: string;
  habilidades?: string;
  disponibilidad?: string;
  provincia?: string;
  activo: boolean;
}

interface CheckInInfo {
  visibility: string;
  specific_user_ids?: string[];
}

/**
 * ✅ PROFILE SCREEN v339.0 - TABS ALIGNMENT FIX (FINAL)
 * 
 * CAMBIOS v339.0:
 * - ✅ FIXED: profileHeaderGradient paddingBottom = 0 (elimina espacio entre header y tabs)
 * - ✅ FIXED: tabsContainer marginTop = 0 (tabs pegadas al header)
 * - ✅ FIXED: Removed extra View wrapper that was creating white space
 * - ✅ RESULTADO: Tabs alineadas directamente con el header azul sin espacio intermedio
 * - ✅ RESULTADO: Sección azulada de Barlive reemplaza el espacio blanco
 * 
 * Previous changes v338.0:
 * - ✅ FIXED: Android buttons "Editar perfil" y "+ Crear" height reduced by 50%
 * - ✅ FIXED: paddingVertical changed from 12 to 6 on Android only
 * - ✅ iOS: Buttons remain unchanged (paddingVertical: 12)
 * - ✅ RESULTADO: Botones más compactos en Android, sin cambios en iOS
 */

export default function PerfilScreen() {
  const router = useRouter();
  const { user, userId, isImpersonating } = useEffectiveUser();
  const { 
    currentMode, 
    ownedLocals,
    activeProfileType,
    activeProfileId,
  } = useMode();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);
  const [showMomentoUpload, setShowMomentoUpload] = useState(false);
  const [showMomentoViewer, setShowMomentoViewer] = useState(false);
  
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  
  const [seguidores, setSeguidores] = useState(0);
  const [seguidos, setSeguidos] = useState(0);
  const [publicaciones, setPublicaciones] = useState(0);
  
  const [activeTab, setActiveTab] = useState<'posts' | 'favoritos' | 'etiquetados' | 'empleo'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [taggedPosts, setTaggedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  
  const [perfilProfesional, setPerfilProfesional] = useState<PerfilProfesional | null>(null);
  const [loadingEmpleo, setLoadingEmpleo] = useState(false);

  const [showPostViewer, setShowPostViewer] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [allPostIds, setAllPostIds] = useState<string[]>([]);

  const [currentLocal, setCurrentLocal] = useState<any>(null);
  const [checkInInfo, setCheckInInfo] = useState<CheckInInfo | null>(null);

  const userRole = user?.rol_app || 'cliente';
  const isPropietario = userRole === 'propietario' || (userRole === 'admin' && currentMode === 'propietario');

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
      }
    } catch (error) {
      console.error('[Perfil v339.0] Error loading unread counts:', error);
    }
  }, [userId]);

  const loadCartItemsCount = useCallback(async () => {
    if (!userId || !isPropietario) return;

    try {
      const { count, error } = await supabase
        .from('shopping_cart')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        console.error('[Perfil v339.0] ❌ Error loading cart count:', error);
        return;
      }

      console.log('[Perfil v339.0] 🛒 Cart items count:', count);
      setCartItemsCount(count || 0);
    } catch (error) {
      console.error('[Perfil v339.0] ❌ Error loading cart count:', error);
    }
  }, [userId, isPropietario]);

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
        console.error('[Perfil v339.0] Error loading current local:', error);
        return;
      }

      if (checkIn && checkIn.locales) {
        setCurrentLocal(checkIn.locales);
        setCheckInInfo({
          visibility: checkIn.visibility,
          specific_user_ids: checkIn.specific_user_ids,
        });
      } else {
        setCurrentLocal(null);
        setCheckInInfo(null);
      }
    } catch (error) {
      console.error('[Perfil v339.0] Error loading current local:', error);
    }
  }, [userId]);

  const cargarPosts = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          autor:usuarios!posts_autor_id_fkey (
            id,
            nombre,
            avatar,
            username
          )
        `)
        .eq('autor_id', userId)
        .eq('tipo', 'usuario')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const postIds = data?.map(p => p.id) || [];
      if (postIds.length > 0) {
        const [likesResult, commentsResult] = await Promise.all([
          supabase
            .from('likes')
            .select('post_id')
            .eq('usuario_id', userId)
            .in('post_id', postIds),
          supabase
            .from('comentarios')
            .select('post_id')
            .in('post_id', postIds),
        ]);

        const likedPostIds = new Set(likesResult.data?.map(l => l.post_id) || []);
        const commentCounts = commentsResult.data?.reduce((acc, c) => {
          acc[c.post_id] = (acc[c.post_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const postsWithStatus = (data || []).map(post => ({
          ...post,
          liked: likedPostIds.has(post.id),
          comentarios: commentCounts[post.id] || 0,
        }));

        setPosts(postsWithStatus);
        return postsWithStatus;
      } else {
        setPosts([]);
        return [];
      }
    } catch (error) {
      console.error('[Perfil v339.0] Error cargando posts:', error);
      return [];
    }
  }, [userId]);

  const cargarFavoritos = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('posts_guardados')
        .select(`
          post_id,
          posts (
            *,
            autor:usuarios!posts_autor_id_fkey (
              id,
              nombre,
              avatar,
              username
            )
          )
        `)
        .eq('usuario_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const savedPostsData = data?.map(item => item.posts).filter(Boolean) || [];
      
      const postIds = savedPostsData.map(p => p.id);
      if (postIds.length > 0) {
        const [likesResult, commentsResult] = await Promise.all([
          supabase
            .from('likes')
            .select('post_id')
            .eq('usuario_id', userId)
            .in('post_id', postIds),
          supabase
            .from('comentarios')
            .select('post_id')
            .in('post_id', postIds),
        ]);

        const likedPostIds = new Set(likesResult.data?.map(l => l.post_id) || []);
        const commentCounts = commentsResult.data?.reduce((acc, c) => {
          acc[c.post_id] = (acc[c.post_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const postsWithStatus = savedPostsData.map(post => ({
          ...post,
          liked: likedPostIds.has(post.id),
          saved: true,
          comentarios: commentCounts[post.id] || 0,
        }));

        setSavedPosts(postsWithStatus);
      } else {
        setSavedPosts([]);
      }
    } catch (error) {
      console.error('[Perfil v339.0] Error cargando favoritos:', error);
    }
  }, [userId]);

  const cargarEtiquetados = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: tagsData, error: tagsError } = await supabase
        .from('post_tags')
        .select('post_id')
        .eq('usuario_id', userId)
        .eq('tipo', 'usuario')
        .eq('estado', 'aceptado')
        .order('created_at', { ascending: false });

      if (tagsError) throw tagsError;

      if (!tagsData || tagsData.length === 0) {
        setTaggedPosts([]);
        return;
      }

      const postIds = tagsData.map(tag => tag.post_id);

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          autor:usuarios!posts_autor_id_fkey (
            id,
            nombre,
            avatar,
            username
          )
        `)
        .in('id', postIds)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        setTaggedPosts([]);
        return;
      }

      const [likesResult, savesResult, commentsResult] = await Promise.all([
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

      const postsWithStatus = postsData.map(post => ({
        ...post,
        liked: likedPostIds.has(post.id),
        saved: savedPostIds.has(post.id),
        comentarios: commentCounts[post.id] || 0,
      }));

      setTaggedPosts(postsWithStatus);
    } catch (error) {
      console.error('[Perfil v339.0] Error cargando etiquetados:', error);
      setTaggedPosts([]);
    }
  }, [userId]);

  const cargarPerfilProfesional = useCallback(async () => {
    if (!userId) return;

    setLoadingEmpleo(true);
    try {
      const { data, error } = await supabase
        .from('perfiles_profesionales')
        .select('*')
        .eq('usuario_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[Perfil v339.0] Error loading professional profile:', error);
      }

      if (data) {
        setPerfilProfesional(data);
      } else {
        setPerfilProfesional(null);
      }
    } catch (error) {
      console.error('[Perfil v339.0] Error loading professional profile:', error);
    } finally {
      setLoadingEmpleo(false);
    }
  }, [userId]);

  const cargarDatosPerfil = useCallback(async (isBackgroundRefresh: boolean = false) => {
    if (!userId) return;

    try {
      if (!isBackgroundRefresh) {
        console.log('[Perfil v339.0] 🔄 Loading profile data...');
      }

      await loadUnreadCounts();
      await loadCartItemsCount();
      await loadCurrentLocal();

      const { data: seguidoresData, error: seguidoresError } = await supabase
        .rpc('get_total_seguidores_count', { p_usuario_id: userId });

      const { count: userFollowsCount } = await supabase
        .from('seguidores')
        .select('*', { count: 'exact', head: true })
        .eq('seguidor_id', userId);

      const seguidosCount = userFollowsCount || 0;

      if (seguidoresError) {
        console.error('[Perfil v339.0] Error loading seguidores count:', seguidoresError);
      }

      const seguidoresCount = seguidoresData || 0;

      const { count: publicacionesCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('autor_id', userId)
        .eq('tipo', 'usuario');

      setSeguidores(seguidoresCount || 0);
      setSeguidos(seguidosCount || 0);
      setPublicaciones(publicacionesCount || 0);

      const loadedPosts = await cargarPosts();

      if (user) {
        await profileCache.set(userId, 'user', {
          profile: user,
          posts: loadedPosts || [],
          stats: {
            posts: publicacionesCount || 0,
            seguidores: seguidoresCount || 0,
            seguidos: seguidosCount || 0,
          },
        });
      }

      if (!isBackgroundRefresh) {
        console.log('[Perfil v339.0] ✅ Profile data loaded and cached');
      }
    } catch (error) {
      console.error('[Perfil v339.0] Error cargando datos:', error);
    } finally {
      setRefreshing(false);
    }
  }, [userId, user, loadUnreadCounts, loadCartItemsCount, loadCurrentLocal, cargarPosts]);

  useEffect(() => {
    if (!userId) return;

    const loadCachedData = async () => {
      console.log('[Perfil v339.0] ⚡ Loading from cache...');
      const cached = await profileCache.get(userId, 'user');
      
      if (cached) {
        console.log('[Perfil v339.0] ⚡⚡⚡ INSTANT LOAD from cache');
        setSeguidores(cached.stats.seguidores);
        setSeguidos(cached.stats.seguidos);
        setPublicaciones(cached.stats.posts);
        setPosts(cached.posts);
        
        setTimeout(() => {
          console.log('[Perfil v339.0] 🔄 Background refresh...');
          cargarDatosPerfil(true);
        }, 100);
      } else {
        console.log('[Perfil v339.0] 📡 No cache, loading from database...');
        cargarDatosPerfil(false);
      }
    };

    loadCachedData();
  }, [userId, cargarDatosPerfil]);

  useEffect(() => {
    if (userId) {
      setLoadingPosts(true);
      if (activeTab === 'posts') {
        cargarPosts().finally(() => setLoadingPosts(false));
      } else if (activeTab === 'favoritos') {
        cargarFavoritos().finally(() => setLoadingPosts(false));
      } else if (activeTab === 'etiquetados') {
        cargarEtiquetados().finally(() => setLoadingPosts(false));
      } else if (activeTab === 'empleo') {
        cargarPerfilProfesional().finally(() => setLoadingPosts(false));
      }
    }
  }, [activeTab, userId, cargarPosts, cargarFavoritos, cargarEtiquetados, cargarPerfilProfesional]);

  useEffect(() => {
    if (!userId) return;

    const subscription = supabase
      .channel('profile-updates-v339')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins',
          filter: `usuario_id=eq.${userId}`,
        },
        () => {
          loadCurrentLocal();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${userId}`,
        },
        () => {
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
          loadUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId, loadCurrentLocal, loadUnreadCounts]);

  useEffect(() => {
    if (!userId || !isPropietario) return;

    const subscription = supabase
      .channel('cart-updates-v339')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_cart',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.log('[Perfil v339.0] 🛒 Cart updated, reloading count...');
          loadCartItemsCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId, isPropietario, loadCartItemsCount]);

  const displayName = user?.nombre || 'Usuario';
  const displayAvatar = user?.avatar;

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatosPerfil(false);
  };

  const handleEditProfile = () => {
    router.push('/editar/perfil');
  };

  const handleSettings = () => {
    router.push('/(tabs)/perfil/configuracion');
  };

  const handleNotifications = () => {
    router.push('/(tabs)/perfil/notificaciones');
  };

  const handleChats = () => {
    router.push('/(tabs)/perfil/chats');
  };

  const handleSeguidores = () => {
    router.push(`/perfil/seguidores?userId=${userId}`);
  };

  const handleSeguidos = () => {
    router.push(`/perfil/seguidos?userId=${userId}`);
  };

  const handleWebsite = () => {
    if (user?.sitio_web) {
      Linking.openURL(user.sitio_web);
    }
  };

  const handleCrearPerfilProfesional = () => {
    router.push('/crear/perfil-profesional');
  };

  const handleVerPerfilProfesional = () => {
    if (!userId || !perfilProfesional) return;
    router.push(`/empleo/perfil-detalle?id=${perfilProfesional.id}`);
  };

  const handleMomentoUploadSuccess = () => {
    cargarDatosPerfil(false);
  };

  const handleOpenMomentoViewer = () => {
    if (!userId) return;
    setShowMomentoViewer(true);
  };

  const handleCrearPublicacion = () => {
    router.push('/crear/publicacion');
  };

  const handlePostClick = (postId: string) => {
    const currentPosts = activeTab === 'posts' ? posts : activeTab === 'favoritos' ? savedPosts : taggedPosts;
    const postIds = currentPosts.map(p => p.id);
    
    setSelectedPostId(postId);
    setAllPostIds(postIds);
    setShowPostViewer(true);
  };

  const handleCartCheckout = async (items: any[], total: number) => {
    console.log('[Perfil v339.0] 💳 Checkout requested:', { items: items.length, total });
    Alert.alert(
      'Pago en Desarrollo',
      `Total a pagar: €${total.toFixed(2)}\n\nLa integración con Stripe está en desarrollo.`,
      [
        { text: 'OK' }
      ]
    );
  };

  const handleExitLocal = async () => {
    if (!userId || !currentLocal) return;

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
                .eq('usuario_id', userId);

              if (error) throw error;

              setCurrentLocal(null);
              setCheckInInfo(null);
              Alert.alert('✅ Check-out realizado', 'Ya no estás en este local');
            } catch (error) {
              console.error('[Perfil v339.0] Error exiting local:', error);
              Alert.alert('Error', 'No se pudo realizar el check-out');
            }
          },
        },
      ]
    );
  };

  const getVisibilityText = () => {
    if (!checkInInfo) return '';
    
    switch (checkInInfo.visibility) {
      case 'all_users':
        return 'Compartido con todos los usuarios';
      case 'followers':
        return 'Compartido con mis seguidores';
      case 'specific_users':
        const count = checkInInfo.specific_user_ids?.length || 0;
        return `Compartido con ${count} ${count === 1 ? 'persona' : 'personas'}`;
      case 'only_me':
        return 'Solo visible para mí';
      default:
        return 'Compartido';
    }
  };

  const renderGridPost = (post: Post) => {
    const firstImage = post.imagenes && post.imagenes.length > 0 
      ? post.imagenes[0] 
      : post.imagen;

    return (
      <View key={post.id} style={styles.gridItemWrapper}>
        <TouchableOpacity
          style={styles.gridItem}
          onPress={() => handlePostClick(post.id)}
          activeOpacity={0.8}
        >
          {firstImage ? (
            <Image source={{ uri: firstImage }} style={styles.gridImage} />
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
      </View>
    );
  };

  const seguidoresFormatted = formatFollowersCount(seguidores);
  const seguidosFormatted = formatFollowersCount(seguidos);
  const publicacionesFormatted = formatFollowersCount(publicaciones);

  const renderProfileHeader = () => {
    return (
      <View style={styles.profileSection}>
        {isImpersonating && (
          <View style={styles.impersonationBanner}>
            <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={16} color="#fff" />
            <Text style={[styles.impersonationBannerText, { fontSize: scaleFontSize(14) }]}>
              Viendo perfil como: {displayName}
            </Text>
          </View>
        )}
        
        <View style={styles.profileHeader}>
          <UnifiedMomentoAvatar
            userId={userId}
            imageUrl={displayAvatar}
            size={96}
            showAddButton={true}
            isOwner={true}
            onPress={handleOpenMomentoViewer}
            onAddPress={() => setShowMomentoUpload(true)}
          />
          
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { fontSize: scaleFontSize(22) }]}>{displayName}</Text>
            {user?.username && (
              <Text style={[styles.profileUsername, { fontSize: scaleFontSize(15) }]}>@{user.username}</Text>
            )}
            
            <View style={styles.statsContainerCompact}>
              <View style={styles.statItemCompact}>
                <Text style={[styles.statNumberCompact, { fontSize: scaleFontSize(18) }]}>{publicacionesFormatted}</Text>
                <Text style={[styles.statLabelCompact, { fontSize: scaleFontSize(13) }]}>publicaciones</Text>
              </View>
              <TouchableOpacity style={styles.statItemCompact} onPress={handleSeguidores}>
                <Text style={[styles.statNumberCompact, { fontSize: scaleFontSize(18) }]}>{seguidoresFormatted}</Text>
                <Text style={[styles.statLabelCompact, { fontSize: scaleFontSize(13) }]}>seguidores</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statItemCompact} onPress={handleSeguidos}>
                <Text style={[styles.statNumberCompact, { fontSize: scaleFontSize(18) }]}>{seguidosFormatted}</Text>
                <Text style={[styles.statLabelCompact, { fontSize: scaleFontSize(13) }]}>siguiendo</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {(isPropietario || ownedLocals.length > 0) && (
            <TouchableOpacity 
              style={styles.switchProfileButton}
              onPress={() => setShowProfileSwitcher(true)}
              activeOpacity={0.8}
            >
              <IconSymbol ios_icon_name="arrow.triangle.2.circlepath" android_material_icon_name="swap_horiz" size={24} color={colors.headerText} />
            </TouchableOpacity>
          )}
        </View>

        {user?.bio && (
          <Text style={[styles.profileBio, { fontSize: scaleFontSize(15) }]}>{user.bio}</Text>
        )}

        {user?.sitio_web && (
          <TouchableOpacity style={styles.websiteContainer} onPress={handleWebsite} activeOpacity={0.8}>
            <IconSymbol ios_icon_name="link" android_material_icon_name="link" size={16} color={colors.headerText} />
            <Text style={[styles.websiteText, { fontSize: scaleFontSize(15) }]}>{user.sitio_web}</Text>
          </TouchableOpacity>
        )}

        {currentLocal && (
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
                onPress={() => router.push(`/detalle/local?id=${currentLocal.id}`)}
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
            </LinearGradient>
          </View>
        )}

        {/* ✅ FIX v338.0: Android button height reduced by 50% */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[
              styles.actionButton,
              Platform.OS === 'android' && styles.actionButtonAndroid
            ]} 
            onPress={handleEditProfile}
          >
            <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={18} color={colors.headerText} />
            <Text style={[styles.actionButtonText, { fontSize: scaleFontSize(15) }]}>Editar Perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.createButton,
              Platform.OS === 'android' && styles.actionButtonAndroid
            ]} 
            onPress={handleCrearPublicacion}
          >
            <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={18} color={colors.white} />
            <Text style={[styles.actionButtonText, { color: colors.white, fontSize: scaleFontSize(15) }]}>Crear</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!user) {
    return (
      <View style={commonStyles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerWithoutTitle}
        />

        <View style={styles.loginRequiredContainer}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.loginRequiredIconContainer}
          >
            <IconSymbol ios_icon_name="lock.fill" android_material_icon_name="lock" size={64} color={colors.white} />
          </LinearGradient>
          
          <Text style={[styles.loginRequiredTitle, { fontSize: scaleFontSize(24) }]}>Inicia sesión para ver tu perfil</Text>
          <Text style={[styles.loginRequiredMessage, { fontSize: scaleFontSize(16) }]}>
            Para acceder a tu perfil y ver todas tus publicaciones, necesitas iniciar sesión en BarLive.
          </Text>
          
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/auth/login-v6')}
          >
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              style={styles.loginButtonGradient}
            >
              <Text style={[styles.loginButtonText, { fontSize: scaleFontSize(16) }]}>Iniciar Sesión</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push('/auth/registro-v6')}
          >
            <Text style={[styles.registerButtonText, { fontSize: scaleFontSize(14) }]}>
              ¿No tienes cuenta? <Text style={styles.registerButtonTextBold}>Regístrate</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentPosts = activeTab === 'posts' ? posts : activeTab === 'favoritos' ? savedPosts : taggedPosts;

  const iconSize = Platform.OS === 'android' ? 20 : 24;

  return (
    <View style={commonStyles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.scrollableHeader}
        >
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={handleChats}>
              <View style={styles.iconContainer}>
                <IconSymbol 
                  ios_icon_name="message.fill" 
                  android_material_icon_name="message" 
                  size={iconSize} 
                  color={colors.headerText} 
                />
                {unreadMessages > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadMessages > 99 ? '99+' : unreadMessages}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleNotifications}>
              <View style={styles.iconContainer}>
                <IconSymbol 
                  ios_icon_name="bell.fill" 
                  android_material_icon_name="notifications" 
                  size={iconSize} 
                  color={colors.headerText} 
                />
                {unreadNotifications > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            
            {isPropietario && (
              <ShoppingCart onCheckout={handleCartCheckout} />
            )}
            
            <TouchableOpacity style={styles.headerButton} onPress={handleSettings}>
              <IconSymbol 
                ios_icon_name="gearshape.fill" 
                android_material_icon_name="settings" 
                size={iconSize} 
                color={colors.headerText} 
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ✅ FIX v339.0: paddingBottom = 0 para eliminar espacio entre header y tabs */}
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.profileHeaderGradient}
        >
          {renderProfileHeader()}
        </LinearGradient>

        {userId && (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <SolicitudPropiedadStatus userId={userId} />
          </View>
        )}

        {/* ✅ FIX v339.0: marginTop = 0 para eliminar el espacio blanco */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
            onPress={() => setActiveTab('posts')}
          >
            <IconSymbol 
              ios_icon_name="square.grid.3x3" 
              android_material_icon_name="grid_on"
              size={24} 
              color={activeTab === 'posts' ? colors.primary : colors.textSecondary} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'favoritos' && styles.tabActive]}
            onPress={() => setActiveTab('favoritos')}
          >
            <IconSymbol 
              ios_icon_name="bookmark" 
              android_material_icon_name="bookmark_border"
              size={24} 
              color={activeTab === 'favoritos' ? colors.primary : colors.textSecondary} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'etiquetados' && styles.tabActive]}
            onPress={() => setActiveTab('etiquetados')}
          >
            <IconSymbol 
              ios_icon_name="person.crop.square" 
              android_material_icon_name="person_outline"
              size={24} 
              color={activeTab === 'etiquetados' ? colors.primary : colors.textSecondary} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'empleo' && styles.tabActive]}
            onPress={() => setActiveTab('empleo')}
          >
            <IconSymbol 
              ios_icon_name="briefcase.fill" 
              android_material_icon_name="work"
              size={24} 
              color={activeTab === 'empleo' ? colors.primary : colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {activeTab === 'empleo' ? (
            <View style={styles.empleoContainer}>
              {loadingEmpleo ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : perfilProfesional ? (
                <View style={styles.perfilProfesionalCard}>
                  <View style={styles.perfilProfesionalHeader}>
                    <View style={styles.perfilProfesionalInfo}>
                      <Text style={[styles.perfilProfesionalNombre, { fontSize: scaleFontSize(20) }]}>
                        {perfilProfesional.nombre_completo}
                      </Text>
                      <Text style={[styles.perfilProfesionalPuesto, { fontSize: scaleFontSize(16) }]}>
                        {perfilProfesional.puesto_deseado}
                      </Text>
                      {perfilProfesional.provincia && (
                        <View style={styles.perfilProfesionalLocation}>
                          <IconSymbol ios_icon_name="mappin" android_material_icon_name="location_on" size={14} color={colors.textSecondary} />
                          <Text style={[styles.perfilProfesionalLocationText, { fontSize: scaleFontSize(14) }]}>
                            {perfilProfesional.provincia}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={[
                      styles.perfilProfesionalStatus,
                      perfilProfesional.activo ? styles.perfilProfesionalStatusActive : styles.perfilProfesionalStatusInactive
                    ]}>
                      <Text style={[
                        styles.perfilProfesionalStatusText,
                        { fontSize: scaleFontSize(13) },
                        perfilProfesional.activo ? styles.perfilProfesionalStatusTextActive : styles.perfilProfesionalStatusTextInactive
                      ]}>
                        {perfilProfesional.activo ? 'Activo' : 'Inactivo'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.perfilProfesionalDetails}>
                    <View style={styles.perfilProfesionalDetailItem}>
                      <Text style={[styles.perfilProfesionalDetailLabel, { fontSize: scaleFontSize(14) }]}>Experiencia:</Text>
                      <Text style={[styles.perfilProfesionalDetailValue, { fontSize: scaleFontSize(15) }]}>
                        {perfilProfesional.experiencia}
                      </Text>
                    </View>
                    {perfilProfesional.disponibilidad && (
                      <View style={styles.perfilProfesionalDetailItem}>
                        <Text style={[styles.perfilProfesionalDetailLabel, { fontSize: scaleFontSize(14) }]}>Disponibilidad:</Text>
                        <Text style={[styles.perfilProfesionalDetailValue, { fontSize: scaleFontSize(15) }]}>
                          {perfilProfesional.disponibilidad}
                        </Text>
                      </View>
                    )}
                    {perfilProfesional.habilidades && (
                      <View style={styles.perfilProfesionalDetailItem}>
                        <Text style={[styles.perfilProfesionalDetailLabel, { fontSize: scaleFontSize(14) }]}>Habilidades:</Text>
                        <Text style={[styles.perfilProfesionalDetailValue, { fontSize: scaleFontSize(15) }]}>
                          {perfilProfesional.habilidades}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.perfilProfesionalActions}>
                    <TouchableOpacity
                      style={styles.perfilProfesionalButton}
                      onPress={handleCrearPerfilProfesional}
                      activeOpacity={0.7}
                    >
                      <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={18} color={colors.white} />
                      <Text style={[styles.perfilProfesionalButtonText, { fontSize: scaleFontSize(15) }]}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.perfilProfesionalButton, styles.perfilProfesionalButtonSecondary]}
                      onPress={handleVerPerfilProfesional}
                      activeOpacity={0.7}
                    >
                      <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={18} color={colors.primary} />
                      <Text style={[styles.perfilProfesionalButtonText, styles.perfilProfesionalButtonTextSecondary, { fontSize: scaleFontSize(15) }]}>
                        Ver Perfil
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <IconSymbol ios_icon_name="briefcase" android_material_icon_name="work_outline" size={64} color={colors.textSecondary} />
                  <Text style={[styles.emptyStateTitle, { fontSize: scaleFontSize(20) }]}>Crea tu perfil profesional</Text>
                  <Text style={[styles.emptyStateText, { fontSize: scaleFontSize(15) }]}>
                    Crea tu demanda de empleo para que los propietarios de locales puedan encontrarte
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyStateButton}
                    onPress={handleCrearPerfilProfesional}
                    activeOpacity={0.7}
                  >
                    <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={20} color={colors.white} />
                    <Text style={[styles.emptyStateButtonText, { fontSize: scaleFontSize(15) }]}>Crear Perfil Profesional</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : loadingPosts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.postsGrid}>
              {currentPosts.length > 0 ? (
                currentPosts.map(renderGridPost)
              ) : (
                <View style={styles.emptyState}>
                  <IconSymbol 
                    ios_icon_name={
                      activeTab === 'posts' ? 'photo.on.rectangle' : 
                      activeTab === 'favoritos' ? 'bookmark' : 
                      'person.crop.square'
                    }
                    android_material_icon_name={
                      activeTab === 'posts' ? 'photo_library' : 
                      activeTab === 'favoritos' ? 'bookmark_border' : 
                      'person_outline'
                    }
                    size={48} 
                    color={colors.textSecondary} 
                  />
                  <Text style={[styles.emptyStateText, { fontSize: scaleFontSize(15) }]}>
                    {activeTab === 'posts' ? 'No hay publicaciones aún' :
                     activeTab === 'favoritos' ? 'No hay publicaciones guardadas' :
                     'No hay publicaciones etiquetadas'}
                  </Text>
                  {activeTab === 'posts' && (
                    <TouchableOpacity 
                      style={styles.emptyStateButton} 
                      onPress={handleCrearPublicacion}
                    >
                      <Text style={[styles.emptyStateButtonText, { fontSize: scaleFontSize(15) }]}>Crear Publicación</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <MomentoUpload
        visible={showMomentoUpload}
        onClose={() => setShowMomentoUpload(false)}
        onSuccess={handleMomentoUploadSuccess}
      />

      <MomentoViewer
        visible={showMomentoViewer}
        authorId={userId || ''}
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
            if (activeTab === 'posts') {
              cargarPosts();
            } else if (activeTab === 'favoritos') {
              cargarFavoritos();
            } else if (activeTab === 'etiquetados') {
              cargarEtiquetados();
            }
          }}
        />
      )}

      <ProfileSwitcher
        visible={showProfileSwitcher}
        onClose={() => setShowProfileSwitcher(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  scrollableHeader: {
    paddingTop: Platform.OS === 'android' ? 36 : 50,
    paddingBottom: Platform.OS === 'android' ? 6 : 8,
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  headerWithoutTitle: {
    paddingTop: Platform.OS === 'android' ? 36 : 50,
    paddingBottom: Platform.OS === 'android' ? 6 : 8,
    paddingHorizontal: 20,
  },
  // ✅ FIX v339.0: paddingBottom = 0 para eliminar espacio entre header y tabs
  // ✅ FIX v339.0: Sección azulada de Barlive reemplaza el espacio blanco
  profileHeaderGradient: {
    paddingTop: 8,
    paddingBottom: 0,
    paddingHorizontal: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    paddingTop: 4,
    paddingRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.headerGradientStart,
  },
  badgeText: {
    fontWeight: '700',
    color: colors.white,
    fontSize: scaleFontSize(9),
    textAlign: 'center',
    lineHeight: Platform.OS === 'android' ? scaleFontSize(9) + 4 : scaleFontSize(9) + 5,
  },
  content: {
    flex: 1,
  },
  loginRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loginRequiredIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loginRequiredTitle: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  loginRequiredMessage: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  loginButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  loginButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loginButtonText: {
    fontWeight: 'bold',
    color: colors.white,
  },
  registerButton: {
    paddingVertical: 12,
  },
  registerButtonText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  registerButtonTextBold: {
    fontWeight: '600',
    color: colors.primary,
  },
  profileSection: {
    paddingTop: 0,
  },
  impersonationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  impersonationBannerText: {
    fontWeight: '700',
    color: '#fff',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    position: 'relative',
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
  switchProfileButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
  },
  profileBio: {
    color: colors.headerText,
    lineHeight: 20,
    marginBottom: 12,
  },
  websiteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  websiteText: {
    color: colors.headerText,
    fontWeight: '500',
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
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 2,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
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
  // ✅ FIX v338.0: Android button height reduced by 50%
  actionButtonAndroid: {
    paddingVertical: 6,
  },
  createButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  actionButtonText: {
    fontWeight: '600',
    color: colors.headerText,
  },
  // ✅ FIX v339.0: marginTop = 0 para eliminar el espacio blanco
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
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    backgroundColor: colors.cardBorder,
  },
  gridItemWrapper: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
  },
  gridItem: {
    width: '100%',
    height: '100%',
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
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },
  emptyStateButtonText: {
    fontWeight: '600',
    color: colors.white,
  },
  empleoContainer: {
    padding: 20,
  },
  perfilProfesionalCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  perfilProfesionalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  perfilProfesionalInfo: {
    flex: 1,
  },
  perfilProfesionalNombre: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  perfilProfesionalPuesto: {
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  perfilProfesionalLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  perfilProfesionalLocationText: {
    color: colors.textSecondary,
  },
  perfilProfesionalStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  perfilProfesionalStatusActive: {
    backgroundColor: '#22C55E15',
  },
  perfilProfesionalStatusInactive: {
    backgroundColor: '#EF444415',
  },
  perfilProfesionalStatusText: {
    fontWeight: '600',
  },
  perfilProfesionalStatusTextActive: {
    color: '#22C55E',
  },
  perfilProfesionalStatusTextInactive: {
    color: '#EF4444',
  },
  perfilProfesionalDetails: {
    gap: 16,
    marginBottom: 20,
  },
  perfilProfesionalDetailItem: {
    gap: 4,
  },
  perfilProfesionalDetailLabel: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  perfilProfesionalDetailValue: {
    color: colors.text,
    lineHeight: 22,
  },
  perfilProfesionalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  perfilProfesionalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  perfilProfesionalButtonSecondary: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  perfilProfesionalButtonText: {
    fontWeight: '600',
    color: colors.white,
  },
  perfilProfesionalButtonTextSecondary: {
    color: colors.primary,
  },
});
