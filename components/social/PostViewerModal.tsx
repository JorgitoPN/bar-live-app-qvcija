
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚨 POST VIEWER MODAL v338.0 - COMPLETE NAVIGATION & SCROLL FIX
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * NEW CHANGES v338.0:
 * - ✅ FIXED PROBLEM 1: Comments open immediately without closing modal
 * - ✅ FIXED PROBLEM 2: State preserved when returning from comments (scroll + post)
 * - ✅ FIXED PROBLEM 3: Correct initial scroll position from profile grid (ENHANCED)
 * - ✅ IMPROVED: More robust scroll mechanism with multiple retry strategies
 * - ✅ IMPROVED: Better getItemLayout for accurate positioning
 * - ✅ RESULT: Seamless navigation matching Social section behavior
 * 
 * ARCHITECTURE:
 * - Modal stays mounted when navigating to comments (preserves ALL state)
 * - Comments page opens as overlay on top (Stack navigation)
 * - router.back() from comments reveals modal instantly with exact scroll position
 * - No AsyncStorage needed - natural state preservation through mounting
 * - Enhanced initial scroll with multiple retry strategies and better timing
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  FlatList,
  ScrollView,
  ActionSheetIOS,
  Animated,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useInteractionContext } from '@/hooks/useInteractionContext';
import { LinearGradient } from 'expo-linear-gradient';
import ParsedText from '@/components/social/ParsedText';

import { SOCIAL_ICONS } from '@/constants/SocialIcons';
import { useRouter, useFocusEffect } from 'expo-router';
import TaggableUser from './TaggingModalV5';
import TagDisplay from './TagDisplay';
import MiniAvatarWithMomento from '@/components/momento/MiniAvatarWithMomento';
import { TapGestureHandler, State } from 'react-native-gesture-handler';
import PostLikesAvatars from './PostLikesAvatars';
import SharePostModal from './SharePostModal';
import ReportModal from './ReportModal';
import * as Haptics from 'expo-haptics';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Post {
  id: string;
  autor_id: string;
  contenido?: string;
  imagen?: string;
  imagenes?: string[];
  likes: number;
  comentarios: number;
  created_at: string;
  tipo?: string;
  local_id?: string;
  autor?: {
    nombre: string;
    avatar?: string;
    username?: string;
  };
  local?: {
    nombre: string;
    imagen_url?: string;
  };
  liked?: boolean;
  saved?: boolean;
  autorNombre?: string;
  autorAvatar?: string;
  images?: string[];
}

interface PostViewerModalProps {
  visible: boolean;
  initialPostId?: string;
  post?: Post;
  allPostIds?: string[];
  onClose: () => void;
  onPostChange?: (postId: string) => void;
  onUpdate?: () => void;
  hideTagIcon?: boolean;
}

export default function PostViewerModal({
  visible,
  initialPostId,
  post: singlePost,
  allPostIds,
  onClose,
  onPostChange,
  onUpdate,
  hideTagIcon = false,
}: PostViewerModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { interactionUserId, interactionLocalId, isInteractingAsLocal } = useInteractionContext();
  const flatListRef = useRef<FlatList>(null);
  const channelRef = useRef<any>(null);
  const hasScrolledToInitial = useRef(false);
  const scrollRetryCount = useRef(0);
  const scrollRetryTimer = useRef<NodeJS.Timeout | null>(null);
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPostId, setCurrentPostId] = useState(initialPostId || singlePost?.id || '');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  
  const [taggingMode, setTaggingMode] = useState(false);
  const [taggingPostId, setTaggingPostId] = useState<string | null>(null);
  const [showTagsOnImage, setShowTagsOnImage] = useState(true);

  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingPost, setSharingPost] = useState<Post | null>(null);

  const [authorsWithMomentos, setAuthorsWithMomentos] = useState<Set<string>>(new Set());
  
  type LikeArray = { id: string; usuario_id: string }[];

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);

  const [isLiked, setIsLiked] = useState<Map<string, boolean>>(new Map());
  const [likesCount, setLikesCount] = useState<Map<string, number>>(new Map());
  const [commentsCount, setCommentsCount] = useState<Map<string, number>>(new Map());
  const [localLikes, setLocalLikes] = useState<Map<string, { id: string; usuario_id: string }[]>>(new Map());
  const likeDebounceTimer = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const doubleTapAnimations = useRef<Map<string, { scale: Animated.Value; opacity: Animated.Value }>>(new Map());
  const likeIconScales = useRef<Map<string, Animated.Value>>(new Map());

  const getDoubleTapAnimation = (postId: string) => {
    if (!doubleTapAnimations.current.has(postId)) {
      doubleTapAnimations.current.set(postId, {
        scale: new Animated.Value(0),
        opacity: new Animated.Value(0),
      });
    }
    return doubleTapAnimations.current.get(postId)!;
  };

  const getLikeIconScale = (postId: string) => {
    if (!likeIconScales.current.has(postId)) {
      likeIconScales.current.set(postId, new Animated.Value(1));
    }
    return likeIconScales.current.get(postId)!;
  };

  useEffect(() => {
    if (visible) {
      console.log('[PostViewerModal v338.0] Props received:', { 
        visible, 
        initialPostId, 
        singlePost: !!singlePost,
        allPostIds: allPostIds ? `array(${allPostIds.length})` : allPostIds,
        hideTagIcon,
      });
      // Reset scroll flag when modal becomes visible
      hasScrolledToInitial.current = false;
      scrollRetryCount.current = 0;
      if (scrollRetryTimer.current) {
        clearTimeout(scrollRetryTimer.current);
        scrollRetryTimer.current = null;
      }
    }
  }, [visible, allPostIds, initialPostId, singlePost, hideTagIcon]);

  const loadInitialLikes = useCallback(async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('id, usuario_id')
        .eq('post_id', postId);

      if (!error && data) {
        setLocalLikes(prev => new Map(prev).set(postId, data));
        console.log('[PostViewerModal v338.0] ✅ Loaded initial likes for post:', postId, 'count:', data.length);
      }
    } catch (error) {
      console.error('[PostViewerModal v338.0] Error loading initial likes:', error);
    }
  }, []);

  const loadCommentCount = async (postId: string) => {
    try {
      const { count, error } = await supabase
        .from('comentarios')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId);

      if (!error && count !== null) {
        setCommentsCount(prev => new Map(prev).set(postId, count));
        console.log('[PostViewerModal v338.0] ✅ Loaded comment count for post:', postId, 'count:', count);
      }
    } catch (error) {
      console.error('[PostViewerModal v338.0] Error loading comment count:', error);
    }
  };

  const refreshCurrentPost = useCallback(async () => {
    if (!currentPostId) return;

    try {
      console.log('[PostViewerModal v338.0] 🔄 Refreshing post data after edit:', currentPostId);

      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select(`
          *,
          autor:usuarios!posts_autor_id_fkey(nombre, avatar, username),
          local:locales(nombre, imagen_url)
        `)
        .eq('id', currentPostId)
        .single();

      if (postError || !postData) {
        console.error('[PostViewerModal v338.0] Error refreshing post:', postError);
        return;
      }

      setPosts(prevPosts => prevPosts.map(p => {
        if (p.id === currentPostId) {
          const displayName = postData.tipo === 'local' && postData.local 
            ? postData.local.nombre 
            : postData.autor?.username 
              ? postData.autor.username.replace(/^@/, '')
              : postData.autor?.nombre || 'Usuario';

          const displayAvatar = postData.tipo === 'local' && postData.local 
            ? postData.local.imagen_url 
            : postData.autor?.avatar || '';

          const images = postData.imagenes && postData.imagenes.length > 0 
            ? postData.imagenes 
            : postData.imagen 
              ? [postData.imagen] 
              : [];

          return {
            ...p,
            ...postData,
            autorNombre: displayName,
            autorAvatar: displayAvatar,
            images,
          };
        }
        return p;
      }));

      await loadTaggedUsers(currentPostId);

      console.log('[PostViewerModal v338.0] ✅ Post refreshed successfully');
    } catch (error) {
      console.error('[PostViewerModal v338.0] Error refreshing post:', error);
    }
  }, [currentPostId]);

  useFocusEffect(
    useCallback(() => {
      if (visible && currentPostId) {
        console.log('[PostViewerModal v338.0] 🔄 Screen focused - refreshing post data');
        refreshCurrentPost();
      }
    }, [visible, currentPostId, refreshCurrentPost])
  );

  useEffect(() => {
    if (!user || posts.length === 0) return;

    console.log('[PostViewerModal v338.0] 🔄 Setting up real-time likes subscription for', posts.length, 'posts');

    const postIds = posts.map(p => p.id);
    
    if (channelRef.current?.state === 'subscribed') {
      console.log('[PostViewerModal v338.0] ⚠️ Already subscribed, skipping');
      return;
    }

    const channel = supabase.channel(`post-viewer-likes:${user.id}`);
    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
        },
        async (payload) => {
          const postId = payload.new?.post_id || payload.old?.post_id;
          
          if (!postIds.includes(postId)) {
            return;
          }

          console.log('[PostViewerModal v338.0] 🔄 Real-time like change detected:', payload.eventType, 'for post:', postId);
          
          const changedByUserId = payload.new?.usuario_id || payload.old?.usuario_id;
          
          if (changedByUserId === user.id) {
            console.log('[PostViewerModal v338.0] ⏭️ Change made by current user, skipping (already handled optimistically)');
            return;
          }
          
          console.log('[PostViewerModal v338.0] 🔄 Change made by another user, updating local state...');
          
          if (payload.eventType === 'INSERT' && payload.new) {
            setLocalLikes(prev => {
              const current = prev.get(postId) || [];
              if (current.some(like => like.id === payload.new.id)) {
                return prev;
              }
              const newArray = [...current, { id: payload.new.id, usuario_id: payload.new.usuario_id }];
              const newMap = new Map(prev);
              newMap.set(postId, newArray);
              console.log('[PostViewerModal v338.0] ➕ Added like to local array, new count:', newArray.length);
              return newMap;
            });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setLocalLikes(prev => {
              const current = prev.get(postId) || [];
              const newArray = current.filter(like => like.id !== payload.old.id);
              const newMap = new Map(prev);
              newMap.set(postId, newArray);
              console.log('[PostViewerModal v338.0] ➖ Removed like from local array, new count:', newArray.length);
              return newMap;
            });
          }
          
          const { count, error: countError } = await supabase
            .from('likes')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', postId);
          
          if (!countError && count !== null) {
            console.log('[PostViewerModal v338.0] ✅ Updated likes count from database:', count);
            setLikesCount(prev => new Map(prev).set(postId, count));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comentarios',
        },
        async (payload) => {
          const postId = payload.new?.post_id || payload.old?.post_id;
          
          if (!postIds.includes(postId)) {
            return;
          }

          console.log('[PostViewerModal v338.0] 🔄 Real-time comment change detected:', payload.eventType, 'for post:', postId);
          
          const { count, error: countError } = await supabase
            .from('comentarios')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', postId);
          
          if (!countError && count !== null) {
            setCommentsCount(prev => new Map(prev).set(postId, count));
          }
        }
      )
      .subscribe((status) => {
        console.log('[PostViewerModal v338.0] 📡 Subscription status:', status);
      });

    return () => {
      console.log('[PostViewerModal v338.0] 🔄 Cleaning up real-time subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, posts]);

  const checkAuthorsMomentos = useCallback(async () => {
    if (!user || posts.length === 0) return;

    try {
      const authorIds = posts.map(p => p.autor_id).filter(Boolean);
      if (authorIds.length === 0) return;

      console.log('[PostViewerModal v338.0] 🔍 Checking momentos for', authorIds.length, 'authors');

      const { data: momentosData, error: momentosError } = await supabase
        .from('momentos')
        .select('id, autor_id')
        .in('autor_id', authorIds)
        .eq('tipo', 'usuario')
        .gt('expires_at', new Date().toISOString());

      if (momentosError || !momentosData) {
        console.error('[PostViewerModal v338.0] Error fetching author momentos:', momentosError);
        return;
      }

      if (momentosData.length === 0) {
        setAuthorsWithMomentos(new Set());
        return;
      }

      const momentoIds = momentosData.map(m => m.id);
      const { data: viewsData } = await supabase
        .from('momento_views')
        .select('momento_id')
        .eq('usuario_id', user.id)
        .in('momento_id', momentoIds);

      const viewedIds = new Set(viewsData?.map(v => v.momento_id) || []);
      
      const authorsWithUnviewed = new Set<string>();
      momentosData.forEach(momento => {
        if (!viewedIds.has(momento.id)) {
          authorsWithUnviewed.add(momento.autor_id);
        }
      });

      console.log('[PostViewerModal v338.0] ✅ Authors with unviewed momentos:', authorsWithUnviewed.size);
      setAuthorsWithMomentos(authorsWithUnviewed);
    } catch (error) {
      console.error('[PostViewerModal v338.0] Error checking authors momentos:', error);
    }
  }, [user, posts]);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      
      if (singlePost) {
        console.log('[PostViewerModal v338.0] Using single post mode');
        
        let liked = false;
        if (interactionUserId) {
          let likeQuery = supabase
            .from('likes')
            .select('id')
            .eq('post_id', singlePost.id)
            .eq('usuario_id', interactionUserId);

          if (isInteractingAsLocal && interactionLocalId) {
            likeQuery = likeQuery.eq('local_id', interactionLocalId);
          } else {
            likeQuery = likeQuery.is('local_id', null);
          }

          const { data: likeData } = await likeQuery.maybeSingle();
          liked = !!likeData;
        }

        let saved = false;
        if (user) {
          const { data: saveData } = await supabase
            .from('posts_guardados')
            .select('id')
            .eq('post_id', singlePost.id)
            .eq('usuario_id', user.id)
            .single();
          
          saved = !!saveData;
        }

        const { count: commentCount } = await supabase
          .from('comentarios')
          .select('id', { count: 'exact', head: true })
          .eq('post_id', singlePost.id);

        const displayName = singlePost.tipo === 'local' && singlePost.local 
          ? singlePost.local.nombre 
          : singlePost.autor?.username 
            ? singlePost.autor.username.replace(/^@/, '')
            : singlePost.autor?.nombre || 'Usuario';

        const displayAvatar = singlePost.tipo === 'local' && singlePost.local 
          ? singlePost.local.imagen_url 
          : singlePost.autor?.avatar || '';

        const images = singlePost.imagenes && singlePost.imagenes.length > 0 
          ? singlePost.imagenes 
          : singlePost.imagen 
            ? [singlePost.imagen] 
            : [];

        const enrichedPost = {
          ...singlePost,
          autorNombre: displayName,
          autorAvatar: displayAvatar,
          liked,
          saved,
          images,
          comentarios: commentCount || 0,
        };

        setPosts([enrichedPost]);
        setCurrentIndex(0);
        setCurrentPostId(singlePost.id);
        
        setIsLiked(new Map([[singlePost.id, liked]]));
        setLikesCount(new Map([[singlePost.id, singlePost.likes]]));
        setCommentsCount(new Map([[singlePost.id, commentCount || 0]]));
        await loadInitialLikes(singlePost.id);
        
        setLoading(false);
        return;
      }
      
      if (!allPostIds || !Array.isArray(allPostIds) || allPostIds.length === 0) {
        console.error('[PostViewerModal v338.0] Invalid allPostIds in loadPosts:', allPostIds);
        setPosts([]);
        setLoading(false);
        return;
      }
      
      console.log('[PostViewerModal v338.0] 🔄 Loading posts for IDs:', allPostIds);
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          autor:usuarios!posts_autor_id_fkey(nombre, avatar, username, perfil_privado),
          local:locales(nombre, imagen_url)
        `)
        .in('id', allPostIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[PostViewerModal v338.0] Error loading posts:', error);
        Alert.alert('Error', 'No se pudieron cargar las publicaciones');
        setPosts([]);
        setLoading(false);
        return;
      }

      if (!data || !Array.isArray(data)) {
        console.error('[PostViewerModal v338.0] Invalid data received:', data);
        setPosts([]);
        setLoading(false);
        return;
      }

      if (data.length === 0) {
        console.warn('[PostViewerModal v338.0] No posts found for IDs:', allPostIds);
        setPosts([]);
        setLoading(false);
        return;
      }

      const enrichedPosts = await Promise.all(
        data.map(async (post) => {
          let liked = false;
          if (interactionUserId) {
            let likeQuery = supabase
              .from('likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('usuario_id', interactionUserId);

            if (isInteractingAsLocal && interactionLocalId) {
              likeQuery = likeQuery.eq('local_id', interactionLocalId);
            } else {
              likeQuery = likeQuery.is('local_id', null);
            }

            const { data: likeData } = await likeQuery.maybeSingle();
            liked = !!likeData;
          }

          let saved = false;
          if (user) {
            const { data: saveData } = await supabase
              .from('posts_guardados')
              .select('id')
              .eq('post_id', post.id)
              .eq('usuario_id', user.id)
              .single();
            
            saved = !!saveData;
          }

          const { count: commentCount } = await supabase
            .from('comentarios')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', post.id);

          const displayName = post.tipo === 'local' && post.local 
            ? post.local.nombre 
            : post.autor?.username 
              ? post.autor.username.replace(/^@/, '')
              : post.autor?.nombre || 'Usuario';

          const displayAvatar = post.tipo === 'local' && post.local 
            ? post.local.imagen_url 
            : post.autor?.avatar || '';

          const images = post.imagenes && post.imagenes.length > 0 
            ? post.imagenes 
            : post.imagen 
              ? [post.imagen] 
              : [];

          return {
            ...post,
            autorNombre: displayName,
            autorAvatar: displayAvatar,
            liked,
            saved,
            images,
            comentarios: commentCount || 0,
          };
        })
      );

      // ✅ v338.0 FIX PROBLEM 3: Maintain the order from allPostIds (user's selection order from grid)
      const sortedPosts = allPostIds
        .map(id => enrichedPosts.find(p => p.id === id))
        .filter(Boolean) as Post[];

      if (!sortedPosts || sortedPosts.length === 0) {
        console.warn('[PostViewerModal v338.0] No valid posts after sorting');
        setPosts([]);
        setLoading(false);
        return;
      }

      console.log('[PostViewerModal v338.0] ✅ Posts loaded and sorted:', sortedPosts.length);
      setPosts(sortedPosts);
      
      const likedMap = new Map<string, boolean>();
      const countMap = new Map<string, number>();
      const commentsMap = new Map<string, number>();
      
      sortedPosts.forEach(post => {
        likedMap.set(post.id, post.liked || false);
        countMap.set(post.id, post.likes || 0);
        commentsMap.set(post.id, post.comentarios || 0);
        loadInitialLikes(post.id);
      });
      
      setIsLiked(likedMap);
      setLikesCount(countMap);
      setCommentsCount(commentsMap);
      
      // ✅ v338.0 FIX PROBLEM 3: Calculate initial index
      const initialIdx = sortedPosts.findIndex(p => p.id === initialPostId);
      console.log('[PostViewerModal v338.0] 📍 PROBLEM 3: Initial post ID:', initialPostId, 'found at index:', initialIdx);
      
      if (initialIdx !== -1) {
        setCurrentIndex(initialIdx);
        setCurrentPostId(initialPostId || '');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('[PostViewerModal v338.0] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar las publicaciones');
      setPosts([]);
      setLoading(false);
    }
  }, [allPostIds, initialPostId, singlePost, user, interactionUserId, interactionLocalId, isInteractingAsLocal, loadInitialLikes]);

  // ✅ v338.0 FIX PROBLEM 3: Enhanced scroll mechanism with multiple retry strategies
  const attemptScrollToInitial = useCallback(() => {
    if (!flatListRef.current || !initialPostId || hasScrolledToInitial.current || posts.length === 0) {
      return;
    }

    const initialIdx = posts.findIndex(p => p.id === initialPostId);
    
    if (initialIdx === -1) {
      console.warn('[PostViewerModal v338.0] ⚠️ PROBLEM 3: Initial post not found in posts array');
      return;
    }

    console.log('[PostViewerModal v338.0] 📜 PROBLEM 3 FIX: Attempting scroll to index:', initialIdx, 'retry:', scrollRetryCount.current);
    
    try {
      flatListRef.current.scrollToIndex({
        index: initialIdx,
        animated: false,
        viewPosition: 0,
      });
      hasScrolledToInitial.current = true;
      scrollRetryCount.current = 0;
      console.log('[PostViewerModal v338.0] ✅ PROBLEM 3 SOLVED: Scroll completed successfully to post:', initialPostId);
    } catch (error) {
      console.error('[PostViewerModal v338.0] ❌ PROBLEM 3: ScrollToIndex error:', error);
      
      // Retry up to 5 times with increasing delays
      if (scrollRetryCount.current < 5) {
        scrollRetryCount.current++;
        const delay = scrollRetryCount.current * 200; // 200ms, 400ms, 600ms, 800ms, 1000ms
        console.log('[PostViewerModal v338.0] 🔄 PROBLEM 3: Scheduling retry', scrollRetryCount.current, 'in', delay, 'ms');
        
        scrollRetryTimer.current = setTimeout(() => {
          attemptScrollToInitial();
        }, delay);
      } else {
        console.error('[PostViewerModal v338.0] ❌ PROBLEM 3: Max retries reached, scroll failed');
      }
    }
  }, [posts, initialPostId]);

  // ✅ v338.0 FIX PROBLEM 3: Trigger scroll after posts are loaded and rendered
  useEffect(() => {
    if (!loading && posts.length > 0 && initialPostId && !hasScrolledToInitial.current) {
      console.log('[PostViewerModal v338.0] 📜 PROBLEM 3: Posts loaded, preparing to scroll...');
      
      // Give FlatList time to render items before scrolling
      const timer = setTimeout(() => {
        attemptScrollToInitial();
      }, 100);

      return () => {
        clearTimeout(timer);
        if (scrollRetryTimer.current) {
          clearTimeout(scrollRetryTimer.current);
        }
      };
    }
  }, [loading, posts, initialPostId, attemptScrollToInitial]);

  useEffect(() => {
    if (visible) {
      loadPosts();
    } else {
      // Reset scroll flag when modal closes
      hasScrolledToInitial.current = false;
      scrollRetryCount.current = 0;
      if (scrollRetryTimer.current) {
        clearTimeout(scrollRetryTimer.current);
        scrollRetryTimer.current = null;
      }
    }
  }, [visible, loadPosts]);

  useEffect(() => {
    checkAuthorsMomentos();
  }, [posts, checkAuthorsMomentos]);

  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (!viewableItems || viewableItems.length === 0 || !posts || posts.length === 0) {
      return;
    }
    
    const index = viewableItems[0].index;
    if (index >= 0 && index < posts.length) {
      setCurrentIndex(index);
      const post = posts[index];
      if (post) {
        setCurrentPostId(post.id);
        if (onPostChange) {
          onPostChange(post.id);
        }
      }
    }
  }, [posts, onPostChange]);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  const animateLikeIcon = useCallback((postId: string) => {
    const scale = getLikeIconScale(postId);
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggleLike = useCallback(async (post: Post) => {
    if (!interactionUserId) {
      Alert.alert('Inicia sesión', 'Para dar me gusta necesitas registrarte en BarLive');
      return;
    }

    const newLikedState = !isLiked.get(post.id);
    const previousLiked = isLiked.get(post.id) || false;
    const previousCount = likesCount.get(post.id) || 0;
    const previousLocalLikes = localLikes.get(post.id) || [];
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.selectionAsync();
    }

    if (newLikedState) {
      animateLikeIcon(post.id);
    }

    setIsLiked(prev => new Map(prev).set(post.id, newLikedState));
    setLikesCount(prev => new Map(prev).set(post.id, newLikedState ? previousCount + 1 : Math.max(0, previousCount - 1)));
    
    if (newLikedState) {
      const tempId = `temp-${Date.now()}`;
      const newArray = [...previousLocalLikes, { id: tempId, usuario_id: interactionUserId }];
      setLocalLikes(prev => new Map(prev).set(post.id, newArray));
      console.log('[PostViewerModal v338.0] ✅ Optimistic ADD: Local likes array updated instantly, new count:', newArray.length);
    } else {
      const newArray = previousLocalLikes.filter(like => like.usuario_id !== interactionUserId);
      setLocalLikes(prev => new Map(prev).set(post.id, newArray));
      console.log('[PostViewerModal v338.0] ✅ Optimistic REMOVE: Local likes array updated instantly, new count:', newArray.length);
    }

    const existingTimer = likeDebounceTimer.current.get(post.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      try {
        if (newLikedState) {
          console.log('[PostViewerModal v338.0] ➕ Adding like to database for post:', post.id);
          
          const likeData: any = {
            post_id: post.id,
            usuario_id: interactionUserId,
          };

          if (isInteractingAsLocal && interactionLocalId) {
            likeData.local_id = interactionLocalId;
            likeData.tipo = 'local';
          } else {
            likeData.tipo = 'usuario';
          }

          const { data, error } = await supabase.from('likes').insert(likeData).select().single();
          
          if (error) {
            console.error('[PostViewerModal v338.0] ❌ Error adding like:', error);
            throw error;
          }
          
          setLocalLikes(prev => {
            const current = prev.get(post.id) || [];
            const updated = current.map(like => 
              like.usuario_id === interactionUserId && like.id.startsWith('temp-')
                ? { id: data.id, usuario_id: interactionUserId }
                : like
            );
            return new Map(prev).set(post.id, updated);
          });
          
          console.log('[PostViewerModal v338.0] ✅ Like added successfully, real ID:', data.id);
        } else {
          console.log('[PostViewerModal v338.0] ➖ Removing like from database for post:', post.id);
          
          let deleteQuery = supabase
            .from('likes')
            .delete()
            .eq('post_id', post.id)
            .eq('usuario_id', interactionUserId);

          if (isInteractingAsLocal && interactionLocalId) {
            deleteQuery = deleteQuery.eq('local_id', interactionLocalId);
          } else {
            deleteQuery = deleteQuery.is('local_id', null);
          }

          const { error } = await deleteQuery;
          
          if (error) {
            console.error('[PostViewerModal v338.0] ❌ Error removing like:', error);
            throw error;
          }
          
          console.log('[PostViewerModal v338.0] ✅ Like removed successfully from database');
        }

        const { count, error: countError } = await supabase
          .from('likes')
          .select('id', { count: 'exact', head: true })
          .eq('post_id', post.id);
        
        if (!countError && count !== null) {
          console.log('[PostViewerModal v338.0] ✅ Verified final count from database:', count);
          setLikesCount(prev => new Map(prev).set(post.id, count));
        }
        
        if (onUpdate) {
          onUpdate();
        }
      } catch (error) {
        console.error('[PostViewerModal v338.0] ❌ Error toggling like:', error);
        setIsLiked(prev => new Map(prev).set(post.id, previousLiked));
        setLikesCount(prev => new Map(prev).set(post.id, previousCount));
        setLocalLikes(prev => new Map(prev).set(post.id, previousLocalLikes));
        Alert.alert('Error', 'No se pudo actualizar el me gusta. Intenta de nuevo.');
      }
    }, 300);

    likeDebounceTimer.current.set(post.id, timer);
  }, [interactionUserId, interactionLocalId, isInteractingAsLocal, isLiked, likesCount, localLikes, animateLikeIcon, onUpdate]);

  const handleDoubleTap = useCallback(async (post: Post, event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      if (!interactionUserId) {
        Alert.alert('Inicia sesión', 'Para dar me gusta necesitas registrarte en BarLive');
        return;
      }

      const currentLiked = isLiked.get(post.id) || false;

      if (!currentLiked) {
        const anim = getDoubleTapAnimation(post.id);
        anim.scale.setValue(0);
        anim.opacity.setValue(1);
        
        Animated.parallel([
          Animated.spring(anim.scale, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: 800,
            delay: 200,
            useNativeDriver: true,
          }),
        ]).start();

        await toggleLike(post);
      }
    }
  }, [interactionUserId, isLiked, toggleLike]);

  const toggleSave = async (post: Post) => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Para guardar publicaciones necesitas registrarte en BarLive');
      return;
    }

    const isSaved = post.saved;

    setPosts(prevPosts =>
      prevPosts.map(p =>
        p.id === post.id ? { ...p, saved: !isSaved } : p
      )
    );

    try {
      if (isSaved) {
        const { error } = await supabase
          .from('posts_guardados')
          .delete()
          .eq('post_id', post.id)
          .eq('usuario_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('posts_guardados').insert({
          post_id: post.id,
          usuario_id: user.id,
        });
        if (error) throw error;
      }
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('[PostViewerModal v338.0] Error toggling save:', error);
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p.id === post.id ? { ...p, saved: isSaved } : p
        )
      );
      Alert.alert('Error', 'No se pudo guardar la publicación');
    }
  };

  const handleReportPost = useCallback((post: Post) => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para reportar contenido');
      return;
    }

    setReportingPostId(post.id);
    setShowReportModal(true);
  }, [user]);

  const handlePostOptions = (post: Post) => {
    const isOwner = user && (
      (post.tipo === 'usuario' && post.autor_id === user.id) ||
      (post.tipo === 'local' && interactionLocalId === post.local_id)
    );

    if (isOwner) {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Cancelar', 'Editar descripción', 'Gestionar etiquetas', 'Eliminar'],
            destructiveButtonIndex: 3,
            cancelButtonIndex: 0,
          },
          (buttonIndex) => {
            if (buttonIndex === 1) {
              console.log('[PostViewerModal v338.0] 📝 Opening edit description - POST STAYS OPEN');
              router.push({
                pathname: '/social/editar-descripcion',
                params: { postId: post.id },
              });
            } else if (buttonIndex === 2) {
              console.log('[PostViewerModal v338.0] 🏷️ Opening manage tags - POST STAYS OPEN');
              router.push({
                pathname: '/social/gestionar-etiquetas',
                params: { postId: post.id },
              });
            } else if (buttonIndex === 3) {
              handleDeletePost(post);
            }
          }
        );
      } else {
        Alert.alert(
          'Opciones de publicación',
          '',
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Editar descripción', 
              onPress: () => {
                console.log('[PostViewerModal v338.0] 📝 Opening edit description - POST STAYS OPEN');
                router.push({
                  pathname: '/social/editar-descripcion',
                  params: { postId: post.id },
                });
              }
            },
            { 
              text: 'Gestionar etiquetas', 
              onPress: () => {
                console.log('[PostViewerModal v338.0] 🏷️ Opening manage tags - POST STAYS OPEN');
                router.push({
                  pathname: '/social/gestionar-etiquetas',
                  params: { postId: post.id },
                });
              }
            },
            { 
              text: 'Eliminar', 
              style: 'destructive',
              onPress: () => handleDeletePost(post),
            },
          ]
        );
      }
    } else {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Cancelar', 'Reportar'],
            cancelButtonIndex: 0,
          },
          (buttonIndex) => {
            if (buttonIndex === 1) {
              handleReportPost(post);
            }
          }
        );
      } else {
        Alert.alert(
          'Opciones',
          '',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Reportar', onPress: () => handleReportPost(post) },
          ]
        );
      }
    }
  };

  const handleDeletePost = async (post: Post) => {
    if (!user) return;

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
                .eq('id', post.id)
                .eq('autor_id', user.id);

              if (error) throw error;

              Alert.alert('Éxito', 'Publicación eliminada correctamente', [
                { text: 'OK', onPress: () => {
                  if (onUpdate) {
                    onUpdate();
                  }
                  onClose();
                }},
              ]);
            } catch (error) {
              console.error('[PostViewerModal v338.0] Error deleting post:', error);
              Alert.alert('Error', 'No se pudo eliminar la publicación');
            }
          },
        },
      ]
    );
  };

  const [taggedUsers, setTaggedUsers] = useState<Map<string, TaggableUser[]>>(new Map());

  // ✅ LINT FIX: Wrap loadTaggedUsers in useCallback (already wrapped, adding comment)
  const loadTaggedUsers = useCallback(async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('post_tags')
        .select(`
          *,
          usuario:usuarios!post_tags_usuario_id_fkey(id, nombre, username, avatar),
          local:locales(id, nombre, imagen_url)
        `)
        .eq('post_id', postId)
        .eq('estado', 'aceptado');

      if (error) throw error;

      const tags: TaggableUser[] = [];
      
      if (data) {
        data.forEach(tag => {
          if (tag.tipo === 'usuario' && tag.usuario) {
            tags.push({
              id: tag.usuario.id,
              nombre: tag.usuario.nombre,
              username: tag.usuario.username || tag.usuario.nombre,
              avatar: tag.usuario.avatar,
              tipo: 'usuario',
            });
          } else if (tag.tipo === 'local' && tag.local) {
            tags.push({
              id: tag.local.id,
              nombre: tag.local.nombre,
              username: tag.local.nombre,
              avatar: tag.local.imagen_url,
              tipo: 'local',
            });
          }
        });
      }

      setTaggedUsers(prev => new Map(prev).set(postId, tags));
    } catch (error) {
      console.error('[PostViewerModal v338.0] Error loading tagged users:', error);
    }
  }, []);

  // ✅ LINT FIX: Added loadTaggedUsers to dependencies
  useEffect(() => {
    posts.forEach(post => {
      loadTaggedUsers(post.id);
    });
  }, [posts, loadTaggedUsers]);

  const toggleExpanded = (postId: string) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const renderPost = ({ item: post }: { item: Post }) => {
    const isOwner = user && (
      (post.tipo === 'usuario' && post.autor_id === user.id) ||
      (post.tipo === 'local' && interactionLocalId === post.local_id)
    );

    const description = post.contenido || '';
    const isExpanded = expandedPosts.has(post.id);
    const needsExpansion = description.length > 150;
    const displayDescription = needsExpansion && !isExpanded 
      ? description.substring(0, 150) + '...' 
      : description;

    const anim = getDoubleTapAnimation(post.id);
    const likeScale = getLikeIconScale(post.id);

    const postTaggedUsers = taggedUsers.get(post.id) || [];
    const postIsLiked = isLiked.get(post.id) || false;
    const postLikesCount = likesCount.get(post.id) || 0;
    const postLocalLikes = localLikes.get(post.id) || [];
    const postCommentsCount = commentsCount.get(post.id) || 0;

    const avatarSize = Platform.OS === 'android' ? scaleIconSize(40) : 40;
    const actionIconSize = Platform.OS === 'android' ? scaleIconSize(28) : 28;
    const commentIconSize = Platform.OS === 'android' ? scaleIconSize(26) : 26;
    const moreVertIconSize = Platform.OS === 'android' ? scaleIconSize(24) : 24;
    const tagIconSize = Platform.OS === 'android' ? scaleIconSize(12) : 12;
    const doubleTapHeartSize = Platform.OS === 'android' ? scaleIconSize(100) : 100;

    return (
      <View style={styles.postContainer}>
        {postTaggedUsers.length > 0 && (
          <View style={styles.taggedUsersHeader}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.taggedUsersScroll}
            >
              {postTaggedUsers.map((taggedUser) => (
                <TouchableOpacity
                  key={`${taggedUser.id}-${taggedUser.tipo}`}
                  style={styles.taggedUserChip}
                  onPress={() => {
                    if (taggedUser.tipo === 'usuario') {
                      router.push({ pathname: '/perfil/usuario', params: { userId: taggedUser.id } });
                    } else {
                      router.push({ pathname: '/perfil/local', params: { localId: taggedUser.id } });
                    }
                  }}
                  activeOpacity={0.7}
                >
                  {taggedUser.avatar ? (
                    <Image source={{ uri: taggedUser.avatar }} style={styles.taggedUserAvatar} />
                  ) : (
                    <View style={[styles.taggedUserAvatar, styles.taggedUserAvatarPlaceholder]}>
                      <IconSymbol
                        ios_icon_name={taggedUser.tipo === 'local' ? 'building.2.fill' : 'person.fill'}
                        android_material_icon_name={taggedUser.tipo === 'local' ? 'business' : 'person'}
                        size={tagIconSize}
                        color={colors.textSecondary}
                      />
                    </View>
                  )}
                  <Text style={[styles.taggedUserName, { fontSize: scaleFontSize(13) }]} numberOfLines={1}>
                    {taggedUser.username}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.postHeader}>
          <TouchableOpacity 
            style={styles.authorInfo}
            onPress={() => {
              if (post.tipo === 'local' && post.local_id) {
                router.push({ pathname: '/perfil/local', params: { localId: post.local_id } });
              } else {
                router.push({ pathname: '/perfil/usuario', params: { userId: post.autor_id } });
              }
            }}
          >
            <MiniAvatarWithMomento
              userId={post.autor_id}
              imageUrl={post.autorAvatar}
              size={avatarSize}
              showMomentoBorder={true}
            />
            <Text style={[styles.authorName, { fontSize: scaleFontSize(15) }]}>{post.autorNombre}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.optionsButton}
            onPress={() => handlePostOptions(post)}
          >
            <IconSymbol 
              ios_icon_name="ellipsis" 
              android_material_icon_name="more_vert" 
              size={moreVertIconSize} 
              color={colors.text} 
            />
          </TouchableOpacity>
        </View>

        {post.images && post.images.length > 0 && (
          <View style={styles.imageContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.imageCarousel}
              onScroll={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / width);
                setCurrentImageIndex(index);
              }}
              scrollEventThrottle={16}
            >
              {post.images.map((imageUrl: string, index: number) => (
                <TapGestureHandler
                  key={index}
                  onHandlerStateChange={(event) => handleDoubleTap(post, event)}
                  numberOfTaps={2}
                >
                  <View style={styles.imageWrapper}>
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.postImage}
                      resizeMode="cover"
                    />
                    
                    <Animated.View
                      style={[
                        styles.doubleTapHeart,
                        {
                          opacity: anim.opacity,
                          transform: [
                            {
                              scale: anim.scale.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 1],
                              }),
                            },
                          ],
                        },
                      ]}
                      pointerEvents="none"
                    >
                      <IconSymbol
                        ios_icon_name="heart.fill"
                        android_material_icon_name="favorite"
                        size={doubleTapHeartSize}
                        color="#FFFFFF"
                      />
                    </Animated.View>

                    {showTagsOnImage && !taggingMode && !hideTagIcon && (
                      <TagDisplay
                        postId={post.id}
                        imageIndex={index}
                        imageWidth={width}
                        imageHeight={width}
                        visible={true}
                      />
                    )}
                  </View>
                </TapGestureHandler>
              ))}
            </ScrollView>
            {post.images.length > 1 && (
              <View style={styles.imageIndicator}>
                {post.images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicatorDot,
                      index === currentImageIndex && styles.indicatorDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.postActions}>
          <View style={styles.leftActions}>
            <TouchableOpacity style={styles.actionButton} onPress={() => toggleLike(post)}>
              <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                <IconSymbol
                  ios_icon_name={postIsLiked ? 'heart.fill' : 'heart'}
                  android_material_icon_name={postIsLiked ? 'favorite' : 'favorite_border'}
                  size={actionIconSize}
                  color={postIsLiked ? '#EF4444' : colors.text}
                />
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                console.log('[PostViewerModal v338.0] 💬 PROBLEM 1 FIX: Opening comments page for post:', post.id);
                console.log('[PostViewerModal v338.0] ✅ Modal stays mounted - navigating directly to comments');
                
                // ✅ v338.0 FIX PROBLEM 1 & 2: DO NOT close modal - keep it mounted in background
                // This preserves ALL state including scroll position
                // Comments page opens on top, router.back() reveals modal instantly
                router.push({
                  pathname: '/social/comentarios',
                  params: { 
                    postId: post.id,
                    postAuthorId: post.autor_id,
                  },
                });
              }}
            >
              <IconSymbol
                ios_icon_name={SOCIAL_ICONS.COMMENT.ios}
                android_material_icon_name={SOCIAL_ICONS.COMMENT.android}
                size={commentIconSize}
                color={colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                if (!user) {
                  Alert.alert('Inicia sesión', 'Debes iniciar sesión para compartir publicaciones');
                  return;
                }
                setSharingPost(post);
                setShowShareModal(true);
              }}
            >
              <IconSymbol 
                ios_icon_name="paperplane" 
                android_material_icon_name="send" 
                size={actionIconSize} 
                color={colors.text} 
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.actionButton} onPress={() => toggleSave(post)}>
            <IconSymbol
              ios_icon_name={post.saved ? 'bookmark.fill' : 'bookmark'}
              android_material_icon_name={post.saved ? 'bookmark' : 'bookmark_border'}
              size={actionIconSize}
              color={post.saved ? colors.primary : colors.text}
            />
          </TouchableOpacity>
        </View>

        {postLikesCount > 0 && (
          <PostLikesAvatars 
            postId={post.id} 
            totalLikes={postLikesCount}
            localLikes={postLocalLikes}
          />
        )}

        {description && (
          <View style={styles.postContent}>
            <Text style={[styles.postText, { fontSize: scaleFontSize(14) }]}>
              <Text style={styles.authorBold}>{post.autorNombre}</Text>{' '}
              <ParsedText text={displayDescription} style={[styles.postText, { fontSize: scaleFontSize(14) }]} />
            </Text>
            {needsExpansion && (
              <TouchableOpacity onPress={() => toggleExpanded(post.id)}>
                <Text style={[styles.seeMoreText, { fontSize: scaleFontSize(14) }]}>
                  {isExpanded ? 'Ver menos' : 'Ver más'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity 
          style={styles.commentsContainer}
          onPress={() => {
            console.log('[PostViewerModal v338.0] 💬 PROBLEM 1 FIX: Opening comments page for post:', post.id);
            console.log('[PostViewerModal v338.0] ✅ Modal stays mounted - navigating directly to comments');
            
            // ✅ v338.0 FIX PROBLEM 1 & 2: DO NOT close modal - keep it mounted in background
            // This preserves ALL state including scroll position
            // Comments page opens on top, router.back() reveals modal instantly
            router.push({
              pathname: '/social/comentarios',
              params: { 
                postId: post.id,
                postAuthorId: post.autor_id,
              },
            });
          }}
        >
          {postCommentsCount > 0 ? (
            <Text style={[styles.commentsText, { fontSize: scaleFontSize(14) }]}>
              Ver {postCommentsCount === 1 ? 'el comentario' : `los ${postCommentsCount} comentarios`}
            </Text>
          ) : (
            <Text style={[styles.commentsTextEmpty, { fontSize: scaleFontSize(14) }]}>
              Sé el primero en comentar
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.timeContainer}>
          <Text style={[styles.timeText, { fontSize: scaleFontSize(11) }]}>
            {formatTimeAgo(post.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Ahora';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)}d`;
    return `Hace ${Math.floor(seconds / 604800)}sem`;
  };

  // ✅ v338.0 FIX PROBLEM 3: Enhanced getItemLayout for accurate positioning
  const getItemLayout = useCallback((data: any, index: number) => {
    // Calculate approximate height for each post
    // This helps FlatList position items correctly before they render
    const baseHeight = SCREEN_HEIGHT * 0.9; // Approximate post height
    return {
      length: baseHeight,
      offset: baseHeight * index,
      index,
    };
  }, []);

  // ✅ v338.0 FIX PROBLEM 3: Handle scroll errors gracefully with enhanced retry mechanism
  const handleScrollToIndexFailed = useCallback((info: any) => {
    console.warn('[PostViewerModal v338.0] ⚠️ PROBLEM 3: ScrollToIndex failed, info:', info);
    
    // Immediate fallback: scroll to offset
    if (flatListRef.current && !hasScrolledToInitial.current) {
      const offset = info.averageItemLength * info.index;
      console.log('[PostViewerModal v338.0] 🔄 PROBLEM 3: Attempting fallback scrollToOffset:', offset);
      
      try {
        flatListRef.current.scrollToOffset({
          offset,
          animated: false,
        });
        hasScrolledToInitial.current = true;
        console.log('[PostViewerModal v338.0] ✅ PROBLEM 3: Fallback scroll successful');
      } catch (error) {
        console.error('[PostViewerModal v338.0] ❌ PROBLEM 3: Fallback scroll failed:', error);
      }
    }
  }, []);

  if (!visible) return null;

  const headerIconSize = Platform.OS === 'android' ? scaleIconSize(28) : 28;
  const headerTitleSize = Platform.OS === 'android' ? scaleFontSize(18) : 18;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <StatusBar 
          barStyle="light-content" 
          backgroundColor={colors.headerGradientStart}
          hidden={Platform.OS === 'android'}
        />
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol 
              ios_icon_name="xmark" 
              android_material_icon_name="close" 
              size={headerIconSize} 
              color={colors.headerText} 
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: headerTitleSize }]}>Publicación</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { fontSize: scaleFontSize(16) }]}>Cargando publicación...</Text>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol 
              ios_icon_name="photo.stack" 
              android_material_icon_name="collections" 
              size={Platform.OS === 'android' ? scaleIconSize(64) : 64} 
              color={colors.textSecondary} 
            />
            <Text style={[styles.emptyText, { fontSize: scaleFontSize(18) }]}>No hay publicaciones</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={handleViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            initialScrollIndex={currentIndex}
            getItemLayout={getItemLayout}
            onScrollToIndexFailed={handleScrollToIndexFailed}
            ItemSeparatorComponent={() => <View style={styles.postSeparator} />}
            removeClippedSubviews={false}
            maxToRenderPerBatch={3}
            windowSize={5}
          />
        )}

        {sharingPost && (
          <SharePostModal
            visible={showShareModal}
            postId={sharingPost.id}
            postContent={sharingPost.contenido}
            postImage={sharingPost.images && sharingPost.images.length > 0 ? sharingPost.images[0] : undefined}
            postAuthorName={sharingPost.autorNombre}
            postAuthorAvatar={sharingPost.autorAvatar}
            onClose={() => {
              setShowShareModal(false);
              setSharingPost(null);
            }}
          />
        )}

        {reportingPostId && (
          <ReportModal
            visible={showReportModal}
            contentType="post"
            contentId={reportingPostId}
            onClose={() => {
              setShowReportModal(false);
              setReportingPostId(null);
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontWeight: '700',
    color: colors.headerText,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontWeight: '600',
    color: colors.text,
  },
  postContainer: {
    backgroundColor: colors.cardBackground,
    paddingBottom: 0,
  },
  postSeparator: {
    height: 16,
    backgroundColor: colors.background,
  },
  taggedUsersHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  taggedUsersScroll: {
    gap: 8,
  },
  taggedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  taggedUserAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  taggedUserAvatarPlaceholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taggedUserName: {
    fontWeight: '600',
    color: colors.text,
    maxWidth: 100,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  authorName: {
    fontWeight: '700',
    color: colors.text,
  },
  optionsButton: {
    padding: 8,
  },
  imageContainer: {
    width: width,
    height: width,
    position: 'relative',
  },
  imageCarousel: {
    width: width,
    height: width,
  },
  imageWrapper: {
    width: width,
    height: width,
    position: 'relative',
  },
  postImage: {
    width: width,
    height: width,
    backgroundColor: colors.cardBorder,
  },
  doubleTapHeart: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -50,
    marginLeft: -50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  imageIndicator: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 3,
  },
  indicatorDotActive: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
  },
  postContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  postText: {
    color: colors.text,
    lineHeight: 18,
  },
  authorBold: {
    fontWeight: '600',
    color: colors.text,
  },
  seeMoreText: {
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '600',
  },
  commentsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  commentsText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  commentsTextEmpty: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  timeContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 0,
  },
  timeText: {
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
});
