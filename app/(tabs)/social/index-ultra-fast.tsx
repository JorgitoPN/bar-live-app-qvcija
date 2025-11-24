
import { useRouter, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useMode } from '@/contexts/ModeContext';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';
import { socialCache } from '@/utils/socialCache';
import { LinearGradient } from 'expo-linear-gradient';
import ParsedText from '@/components/social/ParsedText';
import StoryViewer from '@/components/social/StoryViewer';
import { preloadStoryImages } from '@/utils/storyPreloader';
import { queryOptimizer } from '@/utils/queryOptimizer';
import { performanceOptimizer } from '@/utils/performanceOptimizer';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  Dimensions,
  Modal,
  Platform,
  Alert,
  ActivityIndicator,
  Pressable,
  Animated,
} from 'react-native';
import { supabase } from '@/utils/supabase';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');
const SCREEN_WIDTH = width;
const HEADER_HEIGHT = 120;

// ✅ ULTRA-OPTIMIZED: Memoized Post Card Component
const PostCard = React.memo(({ 
  post, 
  user, 
  activeLocalProfileId, 
  router, 
  onLike, 
  onSave, 
  onDelete 
}: any) => {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

  const canDelete = user && (
    (post.tipo === 'usuario' && post.autor_id === user.id) ||
    (post.tipo === 'local' && activeLocalProfileId === post.local_id)
  );

  const images = post.imagenes && post.imagenes.length > 0 
    ? post.imagenes 
    : post.imagen 
      ? [post.imagen] 
      : [];

  const handleScroll = useCallback((event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setCurrentImageIndex(index);
  }, []);

  const handleNavigateToProfile = useCallback(() => {
    if (post.tipo === 'local' && post.local_id) {
      router.push(`/perfil/local?localId=${post.local_id}`);
    } else if (user && post.autor_id === user.id) {
      router.push('/(tabs)/perfil');
    } else {
      router.push(`/perfil/usuario?userId=${post.autor_id}`);
    }
  }, [post, user, router]);

  const displayName = post.tipo === 'local'
    ? (post.autor?.nombre || 'Local')
    : (post.autor?.username || post.autor?.nombre || 'Usuario').replace(/^@/, '');

  const formatearFecha = useCallback((fecha: string): string => {
    const ahora = new Date();
    const fechaPost = new Date(fecha);
    const diffMs = ahora.getTime() - fechaPost.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHoras < 24) return `${diffHoras}h`;
    if (diffDias < 7) return `${diffDias}d`;
    return fechaPost.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }, []);

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          onPress={handleNavigateToProfile}
          activeOpacity={0.7}
        >
          {post.autor?.avatar ? (
            <Image source={{ uri: post.autor.avatar }} style={styles.postAvatar} />
          ) : (
            <View style={[styles.postAvatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.postAutorInfo}>
            <Text style={styles.postAutorNombre}>{displayName}</Text>
            <Text style={styles.postFecha}>{formatearFecha(post.created_at)}</Text>
          </View>
        </TouchableOpacity>
        {canDelete && (
          <TouchableOpacity 
            style={styles.postOptionsButton}
            onPress={() => onDelete(post.id)}
            activeOpacity={0.7}
          >
            <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {images.length > 0 && (
        <View style={styles.imageCarouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={styles.imageCarousel}
            scrollEnabled={true}
            bounces={false}
            decelerationRate="fast"
            snapToInterval={SCREEN_WIDTH}
            snapToAlignment="center"
          >
            {images.map((imageUrl: string, index: number) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.95}
                onPress={() => router.push(`/social/post?id=${post.id}`)}
                style={styles.imageContainer}
              >
                <Image 
                  source={{ uri: imageUrl }} 
                  style={styles.postImagen} 
                  resizeMode="cover" 
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {images.length > 1 && (
            <View style={styles.imageIndicatorContainer}>
              {images.map((_: any, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.imageIndicatorDot,
                    currentImageIndex === index && styles.imageIndicatorDotActive,
                  ]}
                />
              ))}
            </View>
          )}

          {images.length > 1 && (
            <View style={styles.imageCountBadge}>
              <Text style={styles.imageCountText}>
                {currentImageIndex + 1}/{images.length}
              </Text>
            </View>
          )}
        </View>
      )}

      {post.ubicacion && (
        <View style={styles.locationContainer}>
          <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={16} color={colors.primary} />
          <Text style={styles.locationText}>{post.ubicacion}</Text>
        </View>
      )}

      <View style={styles.postActions}>
        <TouchableOpacity 
          style={styles.postActionButton}
          onPress={() => onLike(post.id)}
          activeOpacity={0.7}
        >
          <IconSymbol 
            ios_icon_name={post.liked ? 'heart.fill' : 'heart'}
            android_material_icon_name={post.liked ? 'favorite' : 'favorite_border'}
            size={26} 
            color={post.liked ? '#EF4444' : colors.text} 
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.postActionButton}
          onPress={() => router.push(`/social/post?id=${post.id}`)}
          activeOpacity={0.7}
        >
          <IconSymbol ios_icon_name="message" android_material_icon_name="chat_bubble_outline" size={26} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.postActionButton}
          onPress={() => router.push(`/social/post?id=${post.id}&share=true`)}
          activeOpacity={0.7}
        >
          <IconSymbol ios_icon_name="paperplane" android_material_icon_name="send" size={26} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.postActionButtonRight}
          onPress={() => onSave(post.id)}
          activeOpacity={0.7}
        >
          <IconSymbol 
            ios_icon_name={post.saved ? 'bookmark.fill' : 'bookmark'}
            android_material_icon_name={post.saved ? 'bookmark' : 'bookmark_border'}
            size={26} 
            color={post.saved ? colors.primary : colors.text} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.postLikes}>
        <Text style={styles.postLikesText}>{post.likes || 0} me gusta</Text>
      </View>

      {post.contenido && (
        <View style={styles.postDescripcion}>
          <Text style={styles.postDescripcionText}>
            <Text style={{ fontWeight: '600' }}>{displayName}</Text>{' '}
            <ParsedText text={post.contenido} style={styles.postDescripcionText} />
          </Text>
        </View>
      )}

      {post.comentarios > 0 && (
        <TouchableOpacity
          style={styles.postComentarios}
          onPress={() => router.push(`/social/post?id=${post.id}`)}
          activeOpacity={0.7}
        >
          <Text style={styles.postComentariosText}>
            Ver {post.comentarios === 1 ? 'el comentario' : `los ${post.comentarios} comentarios`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // ✅ Custom comparison for better memoization
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.liked === nextProps.post.liked &&
    prevProps.post.saved === nextProps.post.saved &&
    prevProps.post.likes === nextProps.post.likes &&
    prevProps.post.comentarios === nextProps.post.comentarios
  );
});

PostCard.displayName = 'PostCard';

export default function SocialScreenUltraFast() {
  const router = useRouter();
  const { user } = useAuth();
  
  const { 
    currentMode,
    activeProfileId,
    activeProfileType,
    activeLocalData,
    ownedLocals,
    switchToClientProfile,
    switchToLocalProfile,
    setCurrentMode,
  } = useMode();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [historias, setHistorias] = useState<any[]>([]);
  const [userStories, setUserStories] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  const [showLocalSelector, setShowLocalSelector] = useState(false);
  
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [viewingOwnStories, setViewingOwnStories] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('down');
  const headerTranslateY = useRef(new Animated.Value(0)).current;

  const isLoadingRef = useRef(false);
  const likingPostsRef = useRef<Set<string>>(new Set());

  const userRole = user?.rol_app || 'cliente';
  const isPropietario = userRole === 'propietario' || (userRole === 'admin' && currentMode === 'propietario');
  const isOwnerMode = currentMode === 'propietario' && isPropietario;

  const isInteractingAsLocal = activeProfileType === 'local';
  const activeLocalProfileId = activeProfileType === 'local' ? activeProfileId : null;

  // ✅ ULTRA-OPTIMIZED: Load data with query optimizer
  const loadData = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('[Social] ⚡ Already loading, skipping...');
      return;
    }

    isLoadingRef.current = true;

    try {
      console.log('[Social] ⚡ ULTRA-FAST loading...');

      // ✅ INSTANT: Try cache first
      const cachedPosts = socialCache.getFeed();
      const cachedStories = socialCache.getStories();

      if (cachedPosts && cachedStories) {
        console.log('[Social] ⚡⚡⚡ INSTANT from cache!');
        setPosts(cachedPosts);
        setHistorias(cachedStories);
        setLoading(false);
        
        // Load fresh data in background
        performanceOptimizer.runAfterInteractions(async () => {
          await loadFreshData();
        });
        
        isLoadingRef.current = false;
        return;
      }

      // Load fresh data
      await loadFreshData();
    } catch (error) {
      console.error('[Social] Error loading data:', error);
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [user, isOwnerMode, activeLocalProfileId]);

  // ✅ Load fresh data with optimized queries
  const loadFreshData = useCallback(async () => {
    try {
      // ✅ PARALLEL LOADING for maximum speed
      const [postsData, storiesData] = await Promise.all([
        queryOptimizer.getPostsOptimized(user?.id, 50),
        queryOptimizer.getStoriesOptimized(user?.id),
      ]);

      // Filter posts based on mode
      let filteredPosts = postsData;
      
      if (isOwnerMode && activeLocalProfileId) {
        filteredPosts = postsData.filter(p => p.tipo === 'local' && p.local_id === activeLocalProfileId);
      } else if (user) {
        const { data: followedLocals } = await supabase
          .from('locales_favoritos')
          .select('local_id')
          .eq('usuario_id', user.id);

        const followedLocalIds = new Set(followedLocals?.map(f => f.local_id) || []);
        
        filteredPosts = postsData.filter(p => 
          p.tipo === 'usuario' || 
          (p.tipo === 'local' && p.local_id && followedLocalIds.has(p.local_id))
        );
      } else {
        filteredPosts = postsData.filter(p => p.tipo === 'usuario');
      }

      // ✅ Get user interactions in SINGLE optimized query
      if (user && filteredPosts.length > 0) {
        const postIds = filteredPosts.map(p => p.id);
        const interactions = await queryOptimizer.getUserInteractions(user.id, postIds);

        const postsWithStatus = filteredPosts.map(post => ({
          ...post,
          liked: interactions.likes.has(post.id),
          saved: interactions.saves.has(post.id),
          comentarios: interactions.comments[post.id] || 0,
        }));
        
        setPosts(postsWithStatus);
        socialCache.setFeed(postsWithStatus);
      } else {
        setPosts(filteredPosts);
        socialCache.setFeed(filteredPosts);
      }

      // Filter stories based on mode
      let userOwnStories: typeof storiesData = [];
      let otherStories: typeof storiesData = [];

      if (isOwnerMode && activeLocalProfileId) {
        userOwnStories = storiesData.filter(s => s.tipo === 'local' && s.local_id === activeLocalProfileId);
        otherStories = storiesData.filter(s => s.tipo === 'usuario');
      } else if (user) {
        const { data: followedLocals } = await supabase
          .from('locales_favoritos')
          .select('local_id')
          .eq('usuario_id', user.id);

        const followedLocalIds = new Set(followedLocals?.map(f => f.local_id) || []);
        
        userOwnStories = storiesData.filter(s => s.tipo === 'usuario' && s.autor_id === user.id);
        otherStories = storiesData.filter(s => 
          (s.tipo === 'usuario' && s.autor_id !== user.id) ||
          (s.tipo === 'local' && s.local_id && followedLocalIds.has(s.local_id))
        );
      } else {
        otherStories = storiesData.filter(s => s.tipo === 'usuario');
      }

      // ✅ Get story interactions in SINGLE optimized query
      if (user) {
        const allStoryIds = storiesData.map(s => s.id);
        const storyInteractions = await queryOptimizer.getStoryInteractions(user.id, allStoryIds);

        const userStoriesWithStatus = userOwnStories.map(story => ({
          ...story,
          visto_por_usuario: storyInteractions.viewed.has(story.id),
          liked_by_user: storyInteractions.liked.has(story.id),
          views_count: storyInteractions.viewCounts[story.id] || 0,
          comments_count: storyInteractions.commentCounts[story.id] || 0,
        }));
        
        const otherStoriesWithStatus = otherStories.map(story => ({
          ...story,
          visto_por_usuario: storyInteractions.viewed.has(story.id),
          liked_by_user: storyInteractions.liked.has(story.id),
          views_count: storyInteractions.viewCounts[story.id] || 0,
          comments_count: storyInteractions.commentCounts[story.id] || 0,
        }));
        
        setUserStories(userStoriesWithStatus);
        setHistorias(otherStoriesWithStatus);
        socialCache.setStories(otherStoriesWithStatus);
        
        // ✅ Preload story images in background
        if (otherStoriesWithStatus.length > 0) {
          performanceOptimizer.runAfterInteractions(async () => {
            await preloadStoryImages(otherStoriesWithStatus, 0, 5);
          });
        }
      } else {
        setHistorias(otherStories);
        socialCache.setStories(otherStories);
      }

      console.log('[Social] ✅ Fresh data loaded');
    } catch (error) {
      console.error('[Social] Error loading fresh data:', error);
    }
  }, [user, isOwnerMode, activeLocalProfileId]);

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

  useFocusEffect(
    useCallback(() => {
      console.log('[Social] ⚡ Screen focused');
      loadData();
      loadUnreadCounts();
    }, [loadData, loadUnreadCounts])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    socialCache.clearAll();
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // ✅ OPTIMIZED: Debounced search
  const handleSearch = useMemo(
    () => performanceOptimizer.debounce(async (query: string) => {
      setSearchQuery(query);
      
      if (query.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        let searchTerm = query.trim();
        if (searchTerm.startsWith('@')) {
          searchTerm = searchTerm.substring(1);
        }
        
        const results: any[] = [];
        
        if (query.trim().startsWith('#')) {
          const hashtagTerm = searchTerm.toLowerCase();
          
          const { data: hashtagsData } = await supabase
            .from('hashtags')
            .select(`id, tag, post_hashtags!inner(post_id)`)
            .ilike('tag', `%${hashtagTerm}%`)
            .limit(10);

          if (hashtagsData) {
            results.push(...hashtagsData.map((h: any) => ({
              id: h.id,
              nombre: `#${h.tag}`,
              tipo: 'hashtag' as const,
              uso_count: h.post_hashtags?.length || 0,
            })));
          }
        } else {
          const [usersData, localsData] = await Promise.all([
            supabase
              .from('usuarios')
              .select('id, nombre, username, avatar')
              .or(`nombre.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
              .eq('activo', true)
              .limit(10),
            supabase
              .from('locales')
              .select('id, nombre, imagen_url, tipo, provincia')
              .ilike('nombre', `%${searchTerm}%`)
              .eq('activo', true)
              .limit(10),
          ]);

          if (usersData.data) {
            results.push(...usersData.data.map(u => ({
              id: u.id,
              nombre: u.nombre,
              username: u.username,
              avatar: u.avatar,
              tipo: 'usuario' as const,
            })));
          }

          if (localsData.data) {
            results.push(...localsData.data.map((l: any) => ({
              id: l.id,
              nombre: l.nombre,
              avatar: l.imagen_url,
              tipo: 'local' as const,
              bio: `${l.tipo} • ${l.provincia}`,
            })));
          }
        }

        setSearchResults(results);
      } catch (error) {
        console.error('[Social] Error searching:', error);
        setSearchResults([]);
      }
    }, 300),
    []
  );

  const handleScroll = useCallback((event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const delta = currentScrollY - lastScrollY.current;

    if (delta > 0 && currentScrollY > 50) {
      if (scrollDirection.current !== 'down') {
        scrollDirection.current = 'down';
        Animated.timing(headerTranslateY, {
          toValue: -HEADER_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    } else if (delta < -5) {
      if (scrollDirection.current !== 'up') {
        scrollDirection.current = 'up';
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }

    lastScrollY.current = currentScrollY;
  }, [headerTranslateY]);

  const handleStoryPress = useCallback(async (index: number, isOwnStory: boolean = false) => {
    const stories = isOwnStory ? userStories : historias;
    
    // ✅ Preload images BEFORE opening viewer
    await preloadStoryImages(stories, index, 4);
    
    setCurrentStoryIndex(index);
    setViewingOwnStories(isOwnStory);
    setShowStoryViewer(true);
  }, [userStories, historias]);

  // ✅ OPTIMIZED: Toggle like with optimistic update
  const toggleLike = useCallback(async (postId: string) => {
    if (!user) {
      setLoginMessage('Para dar me gusta necesitas registrarte en BarLive');
      setShowLoginModal(true);
      return;
    }

    if (likingPostsRef.current.has(postId)) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isLiked = post.liked;
    const currentLikes = post.likes || 0;

    likingPostsRef.current.add(postId);

    // ✅ INSTANT UI UPDATE
    const updatedPost = {
      ...post,
      liked: !isLiked,
      likes: isLiked ? currentLikes - 1 : currentLikes + 1,
    };
    
    setPosts(prevPosts => prevPosts.map(p => 
      p.id === postId ? updatedPost : p
    ));
    
    socialCache.updatePost(postId, {
      liked: !isLiked,
      likes: isLiked ? currentLikes - 1 : currentLikes + 1,
    });

    try {
      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('usuario_id', user.id);
        
        await supabase
          .from('posts')
          .update({ likes: Math.max(0, currentLikes - 1) })
          .eq('id', postId);
      } else {
        await supabase.from('likes').insert({
          post_id: postId,
          usuario_id: user.id,
        });
        
        await supabase
          .from('posts')
          .update({ likes: currentLikes + 1 })
          .eq('id', postId);
      }
    } catch (error) {
      console.error('[Social] Error toggling like:', error);
      // Rollback on error
      setPosts(prevPosts => prevPosts.map(p => 
        p.id === postId 
          ? { ...p, liked: isLiked, likes: currentLikes }
          : p
      ));
      socialCache.updatePost(postId, { liked: isLiked, likes: currentLikes });
    } finally {
      likingPostsRef.current.delete(postId);
    }
  }, [user, posts]);

  const toggleSave = useCallback(async (postId: string) => {
    if (!user) {
      setLoginMessage('Para guardar publicaciones necesitas registrarte en BarLive');
      setShowLoginModal(true);
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isSaved = post.saved;

    // ✅ INSTANT UI UPDATE
    setPosts(prevPosts => prevPosts.map(p => 
      p.id === postId 
        ? { ...p, saved: !isSaved }
        : p
    ));
    
    socialCache.updatePost(postId, { saved: !isSaved });

    try {
      if (isSaved) {
        await supabase
          .from('posts_guardados')
          .delete()
          .eq('post_id', postId)
          .eq('usuario_id', user.id);
      } else {
        await supabase.from('posts_guardados').insert({
          post_id: postId,
          usuario_id: user.id,
        });
      }
    } catch (error) {
      console.error('[Social] Error toggling save:', error);
      // Rollback on error
      setPosts(prevPosts => prevPosts.map(p => 
        p.id === postId 
          ? { ...p, saved: isSaved }
          : p
      ));
      socialCache.updatePost(postId, { saved: isSaved });
    }
  }, [user, posts]);

  const handleDeletePost = useCallback(async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post || !user) return;

    const isOwner = post.tipo === 'usuario' 
      ? post.autor_id === user.id
      : post.tipo === 'local' && activeLocalProfileId === post.local_id;

    if (!isOwner) return;

    Alert.alert(
      'Eliminar publicación',
      '¿Estás seguro de que quieres eliminar esta publicación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId);

              if (error) throw error;

              setPosts(posts.filter(p => p.id !== postId));
              socialCache.clearPost(postId);
              socialCache.clearFeed();
              Alert.alert('Éxito', 'Publicación eliminada correctamente');
            } catch (error) {
              console.error('[Social] Error deleting post:', error);
              Alert.alert('Error', 'No se pudo eliminar la publicación');
            }
          },
        },
      ]
    );
  }, [posts, user, activeLocalProfileId]);

  const handleCreatePress = useCallback(() => {
    if (!user) {
      setLoginMessage('Para crear contenido necesitas registrarte en BarLive');
      setShowLoginModal(true);
    } else {
      setShowCreateOptions(true);
    }
  }, [user]);

  const handleSwitchToClientMode = useCallback(async () => {
    try {
      await switchToClientProfile();
      await setCurrentMode('cliente');
      await loadData();
      Alert.alert('Modo Cliente', 'Has cambiado al modo cliente');
    } catch (error) {
      console.error('[Social] Error switching to client mode:', error);
      Alert.alert('Error', 'No se pudo cambiar al modo cliente');
    }
  }, [switchToClientProfile, setCurrentMode, loadData]);

  const groupedStories = useMemo(() => {
    const storyGroups = historias.reduce((acc, historia) => {
      const authorId = historia.autor_id;
      if (!acc[authorId]) {
        acc[authorId] = [];
      }
      acc[authorId].push(historia);
      return acc;
    }, {} as Record<string, typeof historias>);

    return Object.values(storyGroups).map((authorStories) => {
      const firstStory = authorStories[0];
      const allViewed = authorStories.every(s => s.visto_por_usuario);
      const firstStoryIndex = historias.findIndex(h => h.id === firstStory.id);

      return {
        firstStory,
        allViewed,
        firstStoryIndex,
      };
    });
  }, [historias]);

  const hasUserStories = userStories.length > 0;
  const hasUnviewedUserStories = userStories.some(s => !s.visto_por_usuario);

  const displayAvatar = user?.avatar;
  const displayName = user?.nombre || 'Usuario';
  const displayInitial = displayName.charAt(0).toUpperCase();

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          transform: [{ translateY: headerTranslateY }],
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        }}
      >
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Social</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/(tabs)/perfil/chats')}
              activeOpacity={0.7}
            >
              <IconSymbol ios_icon_name="message.fill" android_material_icon_name="message" size={24} color={colors.headerText} />
              {unreadMessages > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/(tabs)/perfil/notificaciones')}
              activeOpacity={0.7}
            >
              <IconSymbol ios_icon_name="bell.fill" android_material_icon_name="notifications" size={24} color={colors.headerText} />
              {unreadNotifications > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowSearchModal(true)}
              activeOpacity={0.7}
            >
              <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleCreatePress}
              activeOpacity={0.7}
            >
              <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={24} color={colors.headerText} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {isOwnerMode && ownedLocals.length > 0 && (
          <View style={styles.localSelectorContainer}>
            <TouchableOpacity
              style={styles.localSelectorButton}
              onPress={() => ownedLocals.length > 1 && setShowLocalSelector(true)}
              activeOpacity={ownedLocals.length > 1 ? 0.7 : 1}
            >
              <View style={styles.localSelectorContent}>
                {activeLocalData?.imagen_url ? (
                  <Image source={{ uri: activeLocalData.imagen_url }} style={styles.localSelectorImage} />
                ) : (
                  <View style={[styles.localSelectorImage, styles.localSelectorImagePlaceholder]}>
                    <IconSymbol ios_icon_name="building.2" android_material_icon_name="business" size={20} color={colors.headerText} />
                  </View>
                )}
                <View style={styles.localSelectorText}>
                  <Text style={styles.localSelectorLabel}>Interactuando como:</Text>
                  <Text style={styles.localSelectorName} numberOfLines={1}>
                    {activeLocalData?.nombre || 'Seleccionar local'}
                  </Text>
                </View>
              </View>
              {ownedLocals.length > 1 && (
                <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="expand_more" size={20} color={colors.text} />
              )}
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: isOwnerMode && ownedLocals.length > 0 ? HEADER_HEIGHT + 70 : HEADER_HEIGHT }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.historiasContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.historiasScrollContent}
          >
            {user && (
              <TouchableOpacity
                style={styles.historiaItem}
                onPress={() => {
                  if (hasUserStories) {
                    handleStoryPress(0, true);
                  } else {
                    if (isOwnerMode && activeLocalProfileId) {
                      router.push(`/crear/historia?localId=${activeLocalProfileId}`);
                    } else {
                      router.push('/crear/historia');
                    }
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.historiaAddButton}>
                  {hasUserStories ? (
                    hasUnviewedUserStories ? (
                      <LinearGradient
                        colors={['#FFD700', '#00FF00']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.historiaGradientBorder}
                      >
                        {(isOwnerMode && activeLocalData?.imagen_url) ? (
                          <Image source={{ uri: activeLocalData.imagen_url }} style={styles.historiaAvatar} />
                        ) : displayAvatar ? (
                          <Image source={{ uri: displayAvatar }} style={styles.historiaAvatar} />
                        ) : (
                          <View style={[styles.historiaAvatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarText}>{isOwnerMode && activeLocalData ? activeLocalData.nombre.charAt(0).toUpperCase() : displayInitial}</Text>
                          </View>
                        )}
                      </LinearGradient>
                    ) : (
                      <>
                        {(isOwnerMode && activeLocalData?.imagen_url) ? (
                          <Image source={{ uri: activeLocalData.imagen_url }} style={[styles.historiaAvatar, { borderWidth: 2, borderColor: colors.cardBorder }]} />
                        ) : displayAvatar ? (
                          <Image source={{ uri: displayAvatar }} style={[styles.historiaAvatar, { borderWidth: 2, borderColor: colors.cardBorder }]} />
                        ) : (
                          <View style={[styles.historiaAvatar, styles.avatarPlaceholder, { borderWidth: 2, borderColor: colors.cardBorder }]}>
                            <Text style={styles.avatarText}>{isOwnerMode && activeLocalData ? activeLocalData.nombre.charAt(0).toUpperCase() : displayInitial}</Text>
                          </View>
                        )}
                      </>
                    )
                  ) : (
                    <>
                      {(isOwnerMode && activeLocalData?.imagen_url) ? (
                        <Image source={{ uri: activeLocalData.imagen_url }} style={styles.historiaUserAvatar} />
                      ) : displayAvatar ? (
                        <Image source={{ uri: displayAvatar }} style={styles.historiaUserAvatar} />
                      ) : (
                        <View style={[styles.historiaUserAvatar, styles.avatarPlaceholder]}>
                          <Text style={styles.avatarText}>{isOwnerMode && activeLocalData ? activeLocalData.nombre.charAt(0).toUpperCase() : displayInitial}</Text>
                        </View>
                      )}
                      <View style={styles.historiaAddIcon}>
                        <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={18} color={colors.headerText} />
                      </View>
                    </>
                  )}
                </View>
                <Text style={styles.historiaNombre}>
                  {isOwnerMode && activeLocalData ? activeLocalData.nombre : 'Tu historia'}
                </Text>
              </TouchableOpacity>
            )}

            {groupedStories.map(({ firstStory, allViewed, firstStoryIndex }, groupIndex) => {
              const storyDisplayName = firstStory.tipo === 'local'
                ? (firstStory.autor?.nombre || 'Local')
                : (firstStory.autor?.username || firstStory.autor?.nombre || 'Usuario').replace(/^@/, '');

              return (
                <TouchableOpacity
                  key={firstStory.id}
                  style={styles.historiaItem}
                  onPress={() => handleStoryPress(firstStoryIndex, false)}
                  activeOpacity={0.7}
                >
                  <View style={styles.historiaAvatarContainer}>
                    {!allViewed ? (
                      <LinearGradient
                        colors={['#FFD700', '#00FF00']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.historiaGradientBorder}
                      >
                        {firstStory.autor?.avatar ? (
                          <Image
                            source={{ uri: firstStory.autor.avatar }}
                            style={styles.historiaAvatar}
                          />
                        ) : (
                          <View style={[styles.historiaAvatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarText}>
                              {storyDisplayName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </LinearGradient>
                    ) : (
                      <>
                        {firstStory.autor?.avatar ? (
                          <Image
                            source={{ uri: firstStory.autor.avatar }}
                            style={[styles.historiaAvatar, { borderWidth: 2, borderColor: colors.cardBorder }]}
                          />
                        ) : (
                          <View style={[styles.historiaAvatar, styles.avatarPlaceholder, { borderWidth: 2, borderColor: colors.cardBorder }]}>
                            <Text style={styles.avatarText}>
                              {storyDisplayName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                  <Text style={styles.historiaNombre} numberOfLines={1}>
                    {storyDisplayName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.feedContainer}>
          {posts.length > 0 ? (
            posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                user={user}
                activeLocalProfileId={activeLocalProfileId}
                router={router}
                onLike={toggleLike}
                onSave={toggleSave}
                onDelete={handleDeletePost}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <IconSymbol ios_icon_name="photo.on.rectangle" android_material_icon_name="photo_library" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>
                {activeProfileType === 'local' && activeLocalProfileId 
                  ? 'Este local no tiene publicaciones aún'
                  : 'No hay publicaciones aún'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <StoryViewer
        visible={showStoryViewer}
        stories={viewingOwnStories ? userStories : historias}
        initialIndex={currentStoryIndex}
        onClose={() => setShowStoryViewer(false)}
        onStoryChange={(index) => setCurrentStoryIndex(index)}
        onStoryDelete={async (storyId) => {
          await loadData();
        }}
        activeLocalProfileId={activeLocalProfileId}
      />

      {/* Modals remain the same... */}
      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message={loginMessage}
      />
    </View>
  );
}

// Styles remain the same as original...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.headerText,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 4,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: colors.headerGradientStart,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  localSelectorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  localSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  localSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  localSelectorImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  localSelectorImagePlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localSelectorText: {
    flex: 1,
  },
  localSelectorLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  localSelectorName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  historiasContainer: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.cardBorder,
    minHeight: 130,
    backgroundColor: colors.background,
  },
  historiasScrollContent: {
    alignItems: 'center',
  },
  historiaItem: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  historiaAvatarContainer: {
    position: 'relative',
  },
  historiaGradientBorder: {
    padding: 3,
    borderRadius: 48,
    width: 96,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historiaAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: colors.background,
  },
  historiaAvatarVisto: {
    borderColor: colors.cardBorder,
  },
  historiaAddButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    position: 'relative',
  },
  historiaUserAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  historiaAddIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  historiaNombre: {
    fontSize: 12,
    color: colors.text,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 90,
  },
  feedContainer: {
    flex: 1,
  },
  postCard: {
    backgroundColor: colors.cardBackground,
    marginBottom: 8,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  postAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  postAutorInfo: {
    flex: 1,
  },
  postAutorNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  postFecha: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  postOptionsButton: {
    padding: 8,
  },
  imageCarouselContainer: {
    position: 'relative',
  },
  imageCarousel: {
    width: SCREEN_WIDTH,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  postImagen: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBorder,
  },
  imageIndicatorContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  imageIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  imageIndicatorDotActive: {
    backgroundColor: 'rgba(255, 255, 255, 1)',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  imageCountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.headerText,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  postActionButton: {
    marginRight: 18,
    padding: 4,
  },
  postActionButtonRight: {
    marginLeft: 'auto',
    padding: 4,
  },
  postLikes: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  postLikesText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  postDescripcion: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  postDescripcionText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  postComentarios: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  postComentariosText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
});
