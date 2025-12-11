
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
  Linking,
  Alert,
  Platform,
  Animated,
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
import UnifiedStoryViewerV11 from '@/components/social/UnifiedStoryViewerV11';
import StoryAvatarV11 from '@/components/common/StoryAvatarV11';
import { useStoryState } from '@/contexts/StoryStateContextV11';

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

export default function PerfilScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { 
    currentMode, 
    ownedLocals,
  } = useMode();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);
  
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  
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

  // ✅ V11.0: User stories state
  const [userStories, setUserStories] = useState<any[]>([]);
  const [loadingStories, setLoadingStories] = useState(false);
  
  // ✅ V11.0: Story viewer state - USING V11 NOW
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  const userRole = user?.rol_app || 'cliente';
  const isPropietario = userRole === 'propietario' || (userRole === 'admin' && currentMode === 'propietario');

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
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('[Perfil] Error cargando posts:', error);
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
      const { data, error } = await supabase
        .from('post_tags')
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
        .eq('estado', 'aceptado')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const taggedPostsData = data?.map(item => item.posts).filter(Boolean) || [];
      
      const postIds = taggedPostsData.map(p => p.id);
      if (postIds.length > 0) {
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

        const postsWithStatus = taggedPostsData.map(post => ({
          ...post,
          liked: likedPostIds.has(post.id),
          saved: savedPostIds.has(post.id),
          comentarios: commentCounts[post.id] || 0,
        }));

        setTaggedPosts(postsWithStatus);
      } else {
        setTaggedPosts([]);
      }
    } catch (error) {
      console.error('[Perfil] Error cargando etiquetados:', error);
    }
  }, [user]);

  const cargarPerfilProfesional = useCallback(async () => {
    if (!user) return;

    setLoadingEmpleo(true);
    try {
      console.log('[Perfil] Loading professional profile for user:', user.id);

      const { data, error } = await supabase
        .from('perfiles_profesionales')
        .select('*')
        .eq('usuario_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[Perfil] Error loading professional profile:', error);
      }

      if (data) {
        console.log('[Perfil] ✅ Professional profile loaded');
        setPerfilProfesional(data);
      } else {
        console.log('[Perfil] No professional profile found');
        setPerfilProfesional(null);
      }
    } catch (error) {
      console.error('[Perfil] Error loading professional profile:', error);
    } finally {
      setLoadingEmpleo(false);
    }
  }, [user]);

  // ✅ V11.0: FIXED - Load user stories with correct column name (imagen, not imagen_url)
  const cargarHistorias = useCallback(async () => {
    if (!user) {
      console.log('[Perfil] No user, skipping stories load');
      return;
    }

    setLoadingStories(true);
    try {
      console.log('[Perfil] 📖 V11.0 - Loading stories for user:', user.id);
      
      // ✅ CRITICAL FIX: Use 'imagen' column, not 'imagen_url'
      const { data: userStoriesData, error } = await supabase
        .from('historias')
        .select('id, autor_id, tipo, imagen, created_at, expires_at')
        .eq('autor_id', user.id)
        .eq('tipo', 'usuario')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[Perfil] ❌ Error loading stories:', error);
        setUserStories([]);
        setLoadingStories(false);
        return;
      }

      if (userStoriesData && userStoriesData.length > 0) {
        console.log('[Perfil] ✅ V11.0 - Loaded', userStoriesData.length, 'user stories');
        
        const storiesWithAuthor = userStoriesData.map(story => ({
          ...story,
          autorNombre: user.nombre,
          autorAvatar: user.avatar,
          autor: {
            id: user.id,
            nombre: user.nombre,
            avatar: user.avatar,
            username: user.username,
          },
        }));
        
        setUserStories(storiesWithAuthor);
      } else {
        console.log('[Perfil] No active stories found');
        setUserStories([]);
      }
    } catch (error) {
      console.error('[Perfil] ❌ Error loading stories:', error);
      setUserStories([]);
    } finally {
      setLoadingStories(false);
    }
  }, [user]);

  const cargarDatosPerfil = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      await loadUnreadCounts();

      console.log('[Perfil] ✅ V11.0 - Loading user profile with updated functions');
      
      // ✅ FIXED: Use updated database functions that include local follows
      const { data: seguidoresData, error: seguidoresError } = await supabase
        .rpc('get_total_seguidores_count', { p_usuario_id: user.id });

      const { data: seguidosData, error: seguidosError } = await supabase
        .rpc('get_total_siguiendo_count', { p_usuario_id: user.id });

      if (seguidoresError) {
        console.error('[Perfil] Error loading seguidores count:', seguidoresError);
      }
      if (seguidosError) {
        console.error('[Perfil] Error loading seguidos count:', seguidosError);
      }

      const seguidoresCount = seguidoresData || 0;
      const seguidosCount = seguidosData || 0;

      console.log('[Perfil] ✅ V11.0 - Follower counts (including locals):', {
        seguidores: seguidoresCount,
        siguiendo: seguidosCount,
      });

      const { count: publicacionesCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('autor_id', user.id)
        .eq('tipo', 'usuario');

      setSeguidores(seguidoresCount || 0);
      setSeguidos(seguidosCount || 0);
      setPublicaciones(publicacionesCount || 0);

      await Promise.all([
        cargarPosts(),
        cargarHistorias(),
      ]);
    } catch (error) {
      console.error('[Perfil] Error cargando datos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, loadUnreadCounts, cargarPosts, cargarHistorias]);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        console.log('[Perfil] ✅ V11.0 - Loading user profile');
        cargarDatosPerfil();
      } else {
        setLoading(false);
      }
    }
  }, [user, authLoading, cargarDatosPerfil]);

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

  const displayName = user?.nombre || 'Usuario';
  const displayAvatar = user?.avatar;

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatosPerfil();
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

  // ✅ V11.0: Handle avatar press to view stories or create new one
  const handleAvatarPress = useCallback(() => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    console.log('[Perfil] V11.0 - Avatar pressed. Stories count:', userStories.length);
    
    if (userStories.length > 0) {
      // View existing stories
      console.log('[Perfil] ✅ V11.0 - Opening story viewer with', userStories.length, 'stories');
      setCurrentStoryIndex(0);
      setShowStoryViewer(true);
    } else {
      // Create new story
      console.log('[Perfil] No stories found, redirecting to create story');
      router.push('/crear/historia');
    }
  }, [user, userStories, router]);

  const handleAddStory = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push('/crear/historia');
  };

  const renderGridPost = (post: Post) => {
    const firstImage = post.imagenes && post.imagenes.length > 0 
      ? post.imagenes[0] 
      : post.imagen;

    return (
      <TouchableOpacity
        key={post.id}
        style={styles.gridItem}
        onPress={() => router.push(`/social/post?id=${post.id}`)}
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
    );
  };

  const renderProfileHeader = () => {
    return (
      <View style={styles.profileSection}>
        <View style={styles.profileHeader}>
          {/* ✅ V11.0: Use StoryAvatarV11 component with proper story data */}
          {loadingStories ? (
            <View style={styles.avatarLoadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <StoryAvatarV11
              userId={user?.id || ''}
              userStories={userStories}
              avatarUrl={displayAvatar}
              userName={displayName}
              size={88}
              onPress={handleAvatarPress}
              showLabel={false}
            />
          )}
          
          {/* ✅ FIXED: '+' button with WHITE border */}
          <TouchableOpacity 
            style={styles.addStoryButton}
            onPress={handleAddStory}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addStoryGradient}
            >
              <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={14} color={colors.white} />
            </LinearGradient>
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
            onPress={() => setShowCreateOptions(true)}
          >
            <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={18} color={colors.white} />
            <Text style={[styles.actionButtonText, { color: colors.white }]}>Crear</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (authLoading || loading) {
    return (
      <View style={[commonStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Cargando perfil...</Text>
      </View>
    );
  }

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
                      onPress={() => router.push('/crear/publicacion')}
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

      <Modal
        visible={showCreateOptions}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateOptions(false)}
      >
        <Pressable 
          style={styles.createOptionsModal}
          onPress={() => setShowCreateOptions(false)}
        >
          <Pressable style={styles.createOptionsContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.createOptionsHeader}>
              <Text style={styles.createOptionsTitle}>Crear</Text>
              <TouchableOpacity onPress={() => setShowCreateOptions(false)} activeOpacity={0.8}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.createOptionsButtons}>
              <TouchableOpacity
                style={styles.createOptionButton}
                onPress={() => {
                  setShowCreateOptions(false);
                  router.push('/crear/historia');
                }}
                activeOpacity={0.8}
              >
                <View style={styles.createOptionIcon}>
                  <IconSymbol ios_icon_name="camera.fill" android_material_icon_name="camera_alt" size={24} color={colors.headerText} />
                </View>
                <View style={styles.createOptionInfo}>
                  <Text style={styles.createOptionTitle}>Historia</Text>
                  <Text style={styles.createOptionDescription}>
                    Comparte un momento que desaparece en 24 horas
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createOptionButton}
                onPress={() => {
                  setShowCreateOptions(false);
                  router.push('/crear/publicacion');
                }}
                activeOpacity={0.8}
              >
                <View style={styles.createOptionIcon}>
                  <IconSymbol ios_icon_name="photo.fill" android_material_icon_name="photo" size={24} color={colors.headerText} />
                </View>
                <View style={styles.createOptionInfo}>
                  <Text style={styles.createOptionTitle}>Publicación</Text>
                  <Text style={styles.createOptionDescription}>
                    Comparte una foto o video en tu perfil
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      <ProfileSwitcher
        visible={showProfileSwitcher}
        onClose={() => setShowProfileSwitcher(false)}
      />

      {/* ✅ V11.0: UNIFIED STORY VIEWER - INSTAGRAM-STYLE WITH AUTO-CLOSE */}
      <UnifiedStoryViewerV11
        visible={showStoryViewer}
        stories={userStories}
        initialIndex={currentStoryIndex}
        onClose={() => {
          console.log('[Perfil] V11.0 - Closing story viewer');
          setShowStoryViewer(false);
        }}
        onStoryChange={(index) => {
          console.log('[Perfil] V11.0 - Story changed to index:', index);
          setCurrentStoryIndex(index);
        }}
        onStoryDelete={async (storyId) => {
          console.log('[Perfil] V11.0 - Story deleted:', storyId);
          await cargarHistorias();
        }}
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
  avatarLoadingContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addStoryButton: {
    position: 'absolute',
    bottom: 0,
    left: 68,
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.white,
    zIndex: 2,
  },
  addStoryGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 20,
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
  createOptionsModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  createOptionsContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 34,
  },
  createOptionsHeader: {
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  createOptionsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  createOptionsButtons: {
    padding: 20,
    gap: 16,
  },
  createOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  createOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  createOptionInfo: {
    flex: 1,
  },
  createOptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  createOptionDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
