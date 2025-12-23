
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
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { supabase } from '@/utils/supabase';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';
import ProfileSwitcher from '@/components/perfil/ProfileSwitcher';
import MomentoUpload from '@/components/momento/MomentoUpload';
import MomentoViewer from '@/components/momento/MomentoViewer';
import PostViewerModal from '@/components/social/PostViewerModal';
import ShoppingCart from '@/components/payment/ShoppingCart';
import { profileCache } from '@/utils/profileCache';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 4) / 3;
const AVATAR_SIZE = 88;
const BORDER_WIDTH = 4;

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
 * ✅ PROFILE SCREEN v2.0 - INSTANT LOADING WITH PERSISTENCE
 * 
 * Features:
 * - ✅ NO loading screens - instant display with cached data
 * - ✅ Background refresh for fresh data without blocking UI
 * - ✅ Persistent state - doesn't remount on navigation
 * - ✅ Same performance as Lista de Locales and Feed Social
 */

export default function PerfilScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { 
    currentMode, 
    ownedLocals,
    activeProfileType,
    activeProfileId,
  } = useMode();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);
  const [showMomentoUpload, setShowMomentoUpload] = useState(false);
  const [showMomentoViewer, setShowMomentoViewer] = useState(false);
  const [hasUnviewedMomentos, setHasUnviewedMomentos] = useState(false);
  const [showCart, setShowCart] = useState(false);
  
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

  // ✅ INSTANT LOAD: Load from cache first
  useEffect(() => {
    if (!user) return;

    const loadCachedData = async () => {
      console.log('[Perfil] ⚡ Loading from cache...');
      const cached = await profileCache.get(user.id, 'user');
      
      if (cached) {
        console.log('[Perfil] ⚡⚡⚡ INSTANT LOAD from cache');
        setSeguidores(cached.stats.seguidores);
        setSeguidos(cached.stats.seguidos);
        setPublicaciones(cached.stats.posts);
        setPosts(cached.posts);
        
        // Background refresh
        setTimeout(() => {
          console.log('[Perfil] 🔄 Background refresh...');
          cargarDatosPerfil(true);
        }, 100);
      } else {
        console.log('[Perfil] 📡 No cache, loading from database...');
        cargarDatosPerfil(false);
      }
    };

    loadCachedData();
  }, [user?.id, cargarDatosPerfil]);

  const loadCartItemsCount = useCallback(async () => {
    if (!user || !isPropietario) return;

    try {
      const { count, error } = await supabase
        .from('shopping_cart')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) {
        console.error('[Perfil] ❌ Error loading cart count:', error);
        return;
      }

      setCartItemsCount(count || 0);
    } catch (error) {
      console.error('[Perfil] ❌ Error loading cart count:', error);
    }
  }, [user, isPropietario]);

  const loadCurrentLocal = useCallback(async () => {
    if (!user) return;

    try {
      const { data: checkIn, error } = await supabase
        .from('check_ins')
        .select(`
          local_id,
          visibility,
          specific_user_ids,
          locales!check_ins_local_id_fkey(id, nombre, imagen_url, tipo, direccion)
        `)
        .eq('usuario_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[Perfil] Error loading current local:', error);
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
      console.error('[Perfil] Error loading current local:', error);
    }
  }, [user]);

  const checkUnviewedMomentos = useCallback(async () => {
    if (!user) return;

    try {
      const checkId = activeProfileType === 'local' ? activeProfileId : user.id;
      const checkType = activeProfileType === 'local' ? 'local' : 'usuario';

      if (!checkId) return;

      const query = supabase
        .from('momentos')
        .select('id')
        .eq('tipo', checkType)
        .gt('expires_at', new Date().toISOString());

      if (checkType === 'usuario') {
        query.eq('autor_id', checkId);
      } else {
        query.eq('local_id', checkId);
      }

      const { data: momentosData, error: momentosError } = await query;

      if (momentosError) {
        console.error('[Perfil] ❌ Error fetching momentos:', momentosError);
        setHasUnviewedMomentos(false);
        return;
      }

      if (!momentosData || momentosData.length === 0) {
        setHasUnviewedMomentos(false);
        return;
      }

      const momentoIds = momentosData.map(m => m.id);
      const { data: viewsData, error: viewsError } = await supabase
        .from('momento_views')
        .select('momento_id')
        .eq('usuario_id', user.id)
        .in('momento_id', momentoIds);

      if (viewsError) {
        console.error('[Perfil] ❌ Error fetching views:', viewsError);
      }

      const viewedIds = new Set(viewsData?.map(v => v.momento_id) || []);
      const hasUnviewed = momentosData.some(m => !viewedIds.has(m.id));

      setHasUnviewedMomentos(hasUnviewed);
    } catch (error) {
      console.error('[Perfil] ❌ Error checking unviewed momentos:', error);
      setHasUnviewedMomentos(false);
    }
  }, [user, activeProfileType, activeProfileId]);

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
            .is('leido_at', null)
            .neq('remitente_id', user.id);
          
          totalUnread += count || 0;
        }
        setUnreadMessages(totalUnread);
      }
    } catch (error) {
      console.error('[Perfil] Error loading unread counts:', error);
    }
  }, [user]);

  const cargarPosts = useCallback(async () => {
    if (!user) return;

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
        .eq('autor_id', user.id)
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
            .eq('usuario_id', user.id)
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
      console.error('[Perfil] Error cargando posts:', error);
      return [];
    }
  }, [user]);

  const cargarFavoritos = useCallback(async () => {
    if (!user) return;

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
        .eq('usuario_id', user.id)
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
            .eq('usuario_id', user.id)
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
      console.error('[Perfil] Error cargando favoritos:', error);
    }
  }, [user]);

  const cargarEtiquetados = useCallback(async () => {
    if (!user) return;

    try {
      const { data: tagsData, error: tagsError } = await supabase
        .from('post_tags')
        .select('post_id')
        .eq('usuario_id', user.id)
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

      const postsWithStatus = postsData.map(post => ({
        ...post,
        liked: likedPostIds.has(post.id),
        saved: savedPostIds.has(post.id),
        comentarios: commentCounts[post.id] || 0,
      }));

      setTaggedPosts(postsWithStatus);
    } catch (error) {
      console.error('[Perfil] Error cargando etiquetados:', error);
      setTaggedPosts([]);
    }
  }, [user]);

  const cargarPerfilProfesional = useCallback(async () => {
    if (!user) return;

    setLoadingEmpleo(true);
    try {
      const { data, error } = await supabase
        .from('perfiles_profesionales')
        .select('*')
        .eq('usuario_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[Perfil] Error loading professional profile:', error);
      }

      if (data) {
        setPerfilProfesional(data);
      } else {
        setPerfilProfesional(null);
      }
    } catch (error) {
      console.error('[Perfil] Error loading professional profile:', error);
    } finally {
      setLoadingEmpleo(false);
    }
  }, [user]);

  const cargarDatosPerfil = useCallback(async (isBackgroundRefresh: boolean = false) => {
    if (!user) return;

    try {
      if (!isBackgroundRefresh) {
        console.log('[Perfil] 🔄 Loading profile data...');
      }

      await loadUnreadCounts();
      await checkUnviewedMomentos();
      await loadCartItemsCount();
      await loadCurrentLocal();

      const { data: seguidoresData, error: seguidoresError } = await supabase
        .rpc('get_total_seguidores_count', { p_usuario_id: user.id });

      const { count: userFollowsCount } = await supabase
        .from('seguidores')
        .select('*', { count: 'exact', head: true })
        .eq('seguidor_id', user.id);

      const seguidosCount = userFollowsCount || 0;

      if (seguidoresError) {
        console.error('[Perfil] Error loading seguidores count:', seguidoresError);
      }

      const seguidoresCount = seguidoresData || 0;

      const { count: publicacionesCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('autor_id', user.id)
        .eq('tipo', 'usuario');

      setSeguidores(seguidoresCount || 0);
      setSeguidos(seguidosCount || 0);
      setPublicaciones(publicacionesCount || 0);

      const loadedPosts = await cargarPosts();

      // ✅ CACHE UPDATE: Save to cache for instant future loads
      await profileCache.set(user.id, 'user', {
        profile: user,
        posts: loadedPosts || [],
        stats: {
          posts: publicacionesCount || 0,
          seguidores: seguidoresCount || 0,
          seguidos: seguidosCount || 0,
        },
      });

      if (!isBackgroundRefresh) {
        console.log('[Perfil] ✅ Profile data loaded and cached');
      }
    } catch (error) {
      console.error('[Perfil] Error cargando datos:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user, loadUnreadCounts, checkUnviewedMomentos, loadCartItemsCount, loadCurrentLocal, cargarPosts]);

  useEffect(() => {
    if (user) {
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
  }, [activeTab, user, cargarPosts, cargarFavoritos, cargarEtiquetados, cargarPerfilProfesional]);

  // ✅ Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('profile-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'momentos',
        },
        () => {
          checkUnviewedMomentos();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'momento_views',
        },
        () => {
          checkUnviewedMomentos();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins',
          filter: `usuario_id=eq.${user.id}`,
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
          filter: `usuario_id=eq.${user.id}`,
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
  }, [user, checkUnviewedMomentos, loadCurrentLocal, loadUnreadCounts]);

  useEffect(() => {
    if (!user || !isPropietario) return;

    const subscription = supabase
      .channel('cart-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_cart',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadCartItemsCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user, isPropietario, loadCartItemsCount]);

  const displayName = user?.nombre || 'Usuario';
  const displayAvatar = user?.avatar;

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatosPerfil(false);
  };

  const handleEditProfile = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    router.push('/editar/perfil');
  };

  const handleSettings = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push('/(tabs)/perfil/configuracion');
  };

  const handleNotifications = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push('/(tabs)/perfil/notificaciones');
  };

  const handleChats = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push('/(tabs)/perfil/chats');
  };

  const handleSeguidores = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    router.push(`/perfil/seguidores?userId=${user.id}`);
  };

  const handleSeguidos = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push(`/perfil/seguidos?userId=${user.id}`);
  };

  const handleWebsite = () => {
    if (user?.sitio_web) {
      Linking.openURL(user.sitio_web);
    }
  };

  const handleCrearPerfilProfesional = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push('/crear/perfil-profesional');
  };

  const handleVerPerfilProfesional = () => {
    if (!user || !perfilProfesional) return;
    router.push(`/empleo/perfil-detalle?id=${perfilProfesional.id}`);
  };

  const handleMomentoUploadSuccess = () => {
    cargarDatosPerfil(false);
  };

  const handleOpenMomentoViewer = () => {
    if (!user) return;
    
    const viewerId = activeProfileType === 'local' ? activeProfileId : user.id;
    const viewerType = activeProfileType === 'local' ? 'local' : 'usuario';
    
    setShowMomentoViewer(true);
  };

  const handleCrearPublicacion = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
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
    Alert.alert(
      'Pago en Desarrollo',
      `Total a pagar: €${total.toFixed(2)}\n\nLa integración con Stripe está en desarrollo.`,
      [
        { text: 'OK', onPress: () => setShowCart(false) }
      ]
    );
  };

  const handleExitLocal = async () => {
    if (!user || !currentLocal) return;

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
                .eq('usuario_id', user.id);

              if (error) throw error;

              setCurrentLocal(null);
              setCheckInInfo(null);
              Alert.alert('✅ Check-out realizado', 'Ya no estás en este local');
            } catch (error) {
              console.error('[Perfil] Error exiting local:', error);
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

  const renderProfileHeader = () => {
    return (
      <View style={styles.profileSection}>
        <View style={styles.profileHeader}>
          <TouchableOpacity 
            style={styles.avatarWrapper}
            onPress={handleOpenMomentoViewer}
            activeOpacity={0.8}
          >
            {hasUnviewedMomentos ? (
              <LinearGradient
                colors={['#00FF88', '#00FF88', '#00FF88']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.avatarBorder,
                  {
                    width: AVATAR_SIZE + BORDER_WIDTH * 2,
                    height: AVATAR_SIZE + BORDER_WIDTH * 2,
                    borderRadius: (AVATAR_SIZE + BORDER_WIDTH * 2) / 2,
                  },
                ]}
              >
                <View style={styles.avatarInner}>
                  {displayAvatar ? (
                    <Image
                      source={{ uri: displayAvatar }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <IconSymbol
                        ios_icon_name={activeProfileType === 'local' ? 'building.2.fill' : 'person.fill'}
                        android_material_icon_name={activeProfileType === 'local' ? 'store' : 'person'}
                        size={AVATAR_SIZE * 0.5}
                        color={colors.primary}
                      />
                    </View>
                  )}
                </View>
              </LinearGradient>
            ) : (
              <View
                style={[
                  styles.avatarBorder,
                  styles.avatarBorderViewed,
                  {
                    width: AVATAR_SIZE + BORDER_WIDTH * 2,
                    height: AVATAR_SIZE + BORDER_WIDTH * 2,
                    borderRadius: (AVATAR_SIZE + BORDER_WIDTH * 2) / 2,
                  },
                ]}
              >
                <View style={styles.avatarInner}>
                  {displayAvatar ? (
                    <Image
                      source={{ uri: displayAvatar }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <IconSymbol
                        ios_icon_name={activeProfileType === 'local' ? 'building.2.fill' : 'person.fill'}
                        android_material_icon_name={activeProfileType === 'local' ? 'store' : 'person'}
                        size={AVATAR_SIZE * 0.5}
                        color={colors.primary}
                      />
                    </View>
                  )}
                </View>
              </View>
            )}
            <TouchableOpacity 
              style={styles.addMomentoButton}
              onPress={() => setShowMomentoUpload(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addMomentoGradient}
              >
                <IconSymbol
                  ios_icon_name="plus"
                  android_material_icon_name="add"
                  size={18}
                  color="#fff"
                />
              </LinearGradient>
            </TouchableOpacity>
          </TouchableOpacity>
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            {user?.username && (
              <Text style={styles.profileUsername}>@{user.username}</Text>
            )}
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
          <Text style={styles.profileBio}>{user.bio}</Text>
        )}

        {user?.sitio_web && (
          <TouchableOpacity style={styles.websiteContainer} onPress={handleWebsite} activeOpacity={0.8}>
            <IconSymbol ios_icon_name="link" android_material_icon_name="link" size={16} color={colors.headerText} />
            <Text style={styles.websiteText}>{user.sitio_web}</Text>
          </TouchableOpacity>
        )}

        {currentLocal && (
          <View style={styles.currentLocalCompact}>
            <LinearGradient
              colors={['#10B981', '#059669']}
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
                      size={16} 
                      color="#FFFFFF" 
                    />
                  </View>
                  <Text style={styles.currentLocalCompactTitle}>Estado actual</Text>
                </View>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>EN VIVO</Text>
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
                  <Text style={styles.currentLocalCompactName} numberOfLines={1}>
                    {currentLocal.nombre}
                  </Text>
                  <View style={styles.currentLocalCompactMeta}>
                    <IconSymbol 
                      ios_icon_name="mappin" 
                      android_material_icon_name="location_on" 
                      size={10} 
                      color="rgba(255, 255, 255, 0.8)" 
                    />
                    <Text style={styles.currentLocalCompactAddress} numberOfLines={1}>
                      {currentLocal.direccion}
                    </Text>
                  </View>
                  <Text style={styles.currentLocalCompactVisibility} numberOfLines={1}>
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
                  size={14} 
                  color="#FFFFFF" 
                />
                <Text style={styles.exitLocalButtonCompactText}>Salir del local</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{publicaciones}</Text>
            <Text style={styles.statLabel}>Publicaciones</Text>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statItem} onPress={handleSeguidores}>
            <Text style={styles.statNumber}>{seguidores}</Text>
            <Text style={styles.statLabel}>Seguidores</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statItem} onPress={handleSeguidos}>
            <Text style={styles.statNumber}>{seguidos}</Text>
            <Text style={styles.statLabel}>Siguiendo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleEditProfile}>
            <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={18} color={colors.headerText} />
            <Text style={styles.actionButtonText}>Editar Perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.createButton]} 
            onPress={handleCrearPublicacion}
          >
            <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={18} color={colors.white} />
            <Text style={[styles.actionButtonText, { color: colors.white }]}>Crear</Text>
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
          style={commonStyles.headerGradient}
        >
          <Text style={[commonStyles.headerTitle, { color: colors.white }]}>Mi Perfil</Text>
        </LinearGradient>

        <View style={styles.notLoggedInContainer}>
          <IconSymbol ios_icon_name="person.circle" android_material_icon_name="account_circle" size={80} color={colors.textSecondary} />
          <Text style={styles.notLoggedInTitle}>Inicia sesión</Text>
          <Text style={styles.notLoggedInText}>
            Inicia sesión para ver tu perfil y acceder a todas las funciones
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => setShowLoginModal(true)}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={styles.loginButtonGradient}
            >
              <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <LoginRequiredModal
          visible={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      </View>
    );
  }

  const currentPosts = activeTab === 'posts' ? posts : activeTab === 'favoritos' ? savedPosts : taggedPosts;

  return (
    <View style={commonStyles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.fixedHeader}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={handleChats}>
              <IconSymbol ios_icon_name="message.fill" android_material_icon_name="message" size={24} color={colors.headerText} />
              {unreadMessages > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleNotifications}>
              <IconSymbol ios_icon_name="bell.fill" android_material_icon_name="notifications" size={24} color={colors.headerText} />
              {unreadNotifications > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            
            {isPropietario && (
              <TouchableOpacity 
                style={styles.headerButton} 
                onPress={() => setShowCart(true)}
                activeOpacity={0.7}
              >
                <IconSymbol ios_icon_name="cart.fill" android_material_icon_name="shopping_cart" size={24} color={colors.headerText} />
                {cartItemsCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {cartItemsCount > 99 ? '99+' : cartItemsCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.headerButton} onPress={handleSettings}>
              <IconSymbol ios_icon_name="gearshape.fill" android_material_icon_name="settings" size={24} color={colors.headerText} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.profileHeaderGradient}
        >
          {renderProfileHeader()}
        </LinearGradient>

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
                      <Text style={styles.perfilProfesionalNombre}>
                        {perfilProfesional.nombre_completo}
                      </Text>
                      <Text style={styles.perfilProfesionalPuesto}>
                        {perfilProfesional.puesto_deseado}
                      </Text>
                      {perfilProfesional.provincia && (
                        <View style={styles.perfilProfesionalLocation}>
                          <IconSymbol ios_icon_name="mappin" android_material_icon_name="location_on" size={14} color={colors.textSecondary} />
                          <Text style={styles.perfilProfesionalLocationText}>
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
                        perfilProfesional.activo ? styles.perfilProfesionalStatusTextActive : styles.perfilProfesionalStatusTextInactive
                      ]}>
                        {perfilProfesional.activo ? 'Activo' : 'Inactivo'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.perfilProfesionalDetails}>
                    <View style={styles.perfilProfesionalDetailItem}>
                      <Text style={styles.perfilProfesionalDetailLabel}>Experiencia:</Text>
                      <Text style={styles.perfilProfesionalDetailValue}>
                        {perfilProfesional.experiencia}
                      </Text>
                    </View>
                    {perfilProfesional.disponibilidad && (
                      <View style={styles.perfilProfesionalDetailItem}>
                        <Text style={styles.perfilProfesionalDetailLabel}>Disponibilidad:</Text>
                        <Text style={styles.perfilProfesionalDetailValue}>
                          {perfilProfesional.disponibilidad}
                        </Text>
                      </View>
                    )}
                    {perfilProfesional.habilidades && (
                      <View style={styles.perfilProfesionalDetailItem}>
                        <Text style={styles.perfilProfesionalDetailLabel}>Habilidades:</Text>
                        <Text style={styles.perfilProfesionalDetailValue}>
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
                      <Text style={styles.perfilProfesionalButtonText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.perfilProfesionalButton, styles.perfilProfesionalButtonSecondary]}
                      onPress={handleVerPerfilProfesional}
                      activeOpacity={0.7}
                    >
                      <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={18} color={colors.primary} />
                      <Text style={[styles.perfilProfesionalButtonText, styles.perfilProfesionalButtonTextSecondary]}>
                        Ver Perfil
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <IconSymbol ios_icon_name="briefcase" android_material_icon_name="work_outline" size={64} color={colors.textSecondary} />
                  <Text style={styles.emptyStateTitle}>Crea tu perfil profesional</Text>
                  <Text style={styles.emptyStateText}>
                    Crea tu demanda de empleo para que los propietarios de locales puedan encontrarte
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyStateButton}
                    onPress={handleCrearPerfilProfesional}
                    activeOpacity={0.7}
                  >
                    <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={20} color={colors.white} />
                    <Text style={styles.emptyStateButtonText}>Crear Perfil Profesional</Text>
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
                  <Text style={styles.emptyStateText}>
                    {activeTab === 'posts' ? 'No hay publicaciones aún' :
                     activeTab === 'favoritos' ? 'No hay publicaciones guardadas' :
                     'No hay publicaciones etiquetadas'}
                  </Text>
                  {activeTab === 'posts' && (
                    <TouchableOpacity 
                      style={styles.emptyStateButton} 
                      onPress={handleCrearPublicacion}
                    >
                      <Text style={styles.emptyStateButtonText}>Crear Publicación</Text>
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
        authorId={activeProfileType === 'local' ? activeProfileId || '' : user?.id || ''}
        authorType={activeProfileType === 'local' ? 'local' : 'usuario'}
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

      <Modal
        visible={showCart}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowCart(false)}
      >
        <ShoppingCart
          onCheckout={handleCartCheckout}
          onClose={() => setShowCart(false)}
        />
      </Modal>

      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

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
  fixedHeader: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  profileHeaderGradient: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: colors.headerGradientStart,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  notLoggedInTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  notLoggedInText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  loginButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  profileSection: {
    paddingTop: 0,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 20,
  },
  avatarBorder: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: BORDER_WIDTH,
  },
  avatarBorderViewed: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarInner: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: AVATAR_SIZE / 2,
  },
  addMomentoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  addMomentoGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 0,
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
  switchProfileButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 24,
  },
  profileBio: {
    fontSize: 15,
    color: colors.headerText,
    lineHeight: 22,
    marginBottom: 16,
  },
  websiteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  websiteText: {
    fontSize: 15,
    color: colors.headerText,
    fontWeight: '500',
  },
  currentLocalCompact: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  currentLocalCompactGradient: {
    padding: 14,
  },
  currentLocalCompactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  currentLocalCompactHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseContainer: {
    position: 'relative',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseOuter: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  pulseInner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  currentLocalCompactTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  currentLocalCompactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    gap: 10,
  },
  currentLocalCompactImageWrapper: {
    width: 50,
    height: 50,
    borderRadius: 10,
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
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  currentLocalCompactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 3,
  },
  currentLocalCompactAddress: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  currentLocalCompactVisibility: {
    fontSize: 10,
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
    gap: 6,
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  exitLocalButtonCompactText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
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
  createButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.headerText,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 15,
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
    fontSize: 15,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  perfilProfesionalPuesto: {
    fontSize: 16,
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
    fontSize: 14,
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
    fontSize: 13,
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  perfilProfesionalDetailValue: {
    fontSize: 15,
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
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  perfilProfesionalButtonTextSecondary: {
    color: colors.primary,
  },
});
