
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Alert,
  ActionSheetIOS,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import MiniAvatarWithMomento from '@/components/momento/MiniAvatarWithMomento';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PostViewerModal from './PostViewerModal';
import CommentsModal from './CommentsModal';
import SharePostModal from './SharePostModal';
import PostLikesAvatars from './PostLikesAvatars';
import ReportModal from './ReportModal';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Post {
  id: string;
  autor_id: string;
  tipo: 'usuario' | 'local';
  local_id?: string;
  contenido?: string;
  imagenes: string[];
  video_url?: string;
  ubicacion?: string;
  likes_count: number;
  comentarios_count: number;
  guardados_count: number;
  user_has_liked: boolean;
  user_has_saved: boolean;
  created_at: string;
  autor: {
    id: string;
    nombre: string;
    username: string;
    avatar?: string;
  };
  local?: {
    id: string;
    nombre: string;
    imagen_url?: string;
  };
}

interface InstagramPostCardProps {
  post: Post;
  onUpdate?: () => void;
  hideTagIcon?: boolean;
}

/**
 * ✅ INSTAGRAM POST CARD v13.0 - FIXED INVERTED OPTIMISTIC UI LOGIC
 * 
 * CRITICAL FIX:
 * - ✅ FIXED: Corrected optimistic UI logic for like/unlike
 * - ✅ When isLiked is FALSE (user is liking): ADD avatar to array
 * - ✅ When isLiked is TRUE (user is unliking): REMOVE avatar from array
 * - ✅ Added detailed logging to track state changes
 * 
 * FIXES APPLIED:
 * - ✅ Simplified key generation for PostLikesAvatars
 * - ✅ Direct localLikes array passing for instant updates
 * - ✅ Report functionality for all posts
 * - ✅ Comment count display with proper text
 * - ✅ Instant optimistic UI updates (< 100ms)
 * - ✅ Proper real-time synchronization with other users
 */

export default function InstagramPostCard({
  post,
  onUpdate,
  hideTagIcon = false,
}: InstagramPostCardProps) {
  const { user, ensureValidSession } = useAuth();
  const channelRef = useRef<any>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // ✅ Local state for instant reactivity
  const [isLiked, setIsLiked] = useState(post.user_has_liked);
  const [isSaved, setIsSaved] = useState(post.user_has_saved);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [commentsCount, setCommentsCount] = useState(post.comentarios_count);
  
  // ✅ CRITICAL: Local likes array for instant updates
  const [localLikes, setLocalLikes] = useState<{ id: string; usuario_id: string }[]>([]);
  
  const [showPostViewer, setShowPostViewer] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  
  // ✅ NEW: Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  
  const [authorAvatar, setAuthorAvatar] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string>('Usuario');
  const [loadingAuthor, setLoadingAuthor] = useState(true);

  const likeIconScale = useRef(new Animated.Value(1)).current;
  const doubleTapHeartScale = useRef(new Animated.Value(0)).current;
  const doubleTapHeartOpacity = useRef(new Animated.Value(0)).current;
  const lastTap = useRef<number | null>(null);
  const likeDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  const isOwner = post.tipo === 'usuario' 
    ? post.autor_id === user?.id
    : false;

  // ✅ Load initial likes array - CRITICAL FIX: Load immediately on mount
  useEffect(() => {
    const loadInitialLikes = async () => {
      try {
        console.log('[InstagramPostCard] 🔄 Loading initial likes for post:', post.id);
        
        const { data, error } = await supabase
          .from('likes')
          .select('id, usuario_id')
          .eq('post_id', post.id);

        if (!error && data) {
          setLocalLikes(data);
          console.log('[InstagramPostCard] ✅ Loaded initial likes:', data.length, 'users:', data.map(l => l.usuario_id));
        } else if (error) {
          console.error('[InstagramPostCard] ❌ Error loading initial likes:', error);
        } else {
          console.log('[InstagramPostCard] ℹ️ No likes found for post:', post.id);
          setLocalLikes([]);
        }
      } catch (error) {
        console.error('[InstagramPostCard] ❌ Exception loading initial likes:', error);
        setLocalLikes([]);
      }
    };

    // ✅ CRITICAL: Load immediately, don't wait
    loadInitialLikes();
  }, [post.id]);

  // ✅ Real-time subscription for OTHER users' changes
  useEffect(() => {
    if (!user) return;

    console.log('[InstagramPostCard] 🔄 Setting up real-time subscription for post:', post.id);

    if (channelRef.current?.state === 'subscribed') {
      console.log('[InstagramPostCard] ⚠️ Already subscribed, skipping');
      return;
    }

    const channel = supabase.channel(`post-likes:${post.id}:${user.id}`);

    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: `post_id=eq.${post.id}`,
        },
        async (payload) => {
          console.log('[InstagramPostCard] 🔄 Real-time like change detected:', payload.eventType, 'by user:', payload.new?.usuario_id || payload.old?.usuario_id);
          
          const changedByUserId = payload.new?.usuario_id || payload.old?.usuario_id;
          
          if (changedByUserId === user.id) {
            console.log('[InstagramPostCard] ⏭️ Change made by current user, skipping (already handled optimistically)');
            return;
          }
          
          console.log('[InstagramPostCard] 🔄 Change made by another user, updating local state...');
          
          // ✅ Update local likes array
          if (payload.eventType === 'INSERT' && payload.new) {
            setLocalLikes(prev => {
              if (prev.some(like => like.id === payload.new.id)) {
                return prev;
              }
              const newArray = [...prev, { id: payload.new.id, usuario_id: payload.new.usuario_id }];
              console.log('[InstagramPostCard] ➕ Added like to local array, new count:', newArray.length);
              return newArray;
            });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setLocalLikes(prev => {
              const newArray = prev.filter(like => like.id !== payload.old.id);
              console.log('[InstagramPostCard] ➖ Removed like from local array, new count:', newArray.length);
              return newArray;
            });
          }
          
          // ✅ Fetch updated count from database
          const { count, error: countError } = await supabase
            .from('likes')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', post.id);
          
          if (!countError && count !== null) {
            console.log('[InstagramPostCard] ✅ Updated likes count from database:', count);
            setLikesCount(count);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comentarios',
          filter: `post_id=eq.${post.id}`,
        },
        async (payload) => {
          console.log('[InstagramPostCard] 🔄 Real-time comment change detected:', payload.eventType);
          
          // ✅ Reload comment count
          const { count, error: countError } = await supabase
            .from('comentarios')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', post.id);
          
          if (!countError && count !== null) {
            console.log('[InstagramPostCard] ✅ Updated comments count from database:', count);
            setCommentsCount(count);
          }
        }
      )
      .subscribe((status) => {
        console.log('[InstagramPostCard] 📡 Subscription status:', status);
      });

    return () => {
      console.log('[InstagramPostCard] 🔄 Cleaning up real-time subscription for post:', post.id);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [post.id, user]);

  useEffect(() => {
    const loadAuthorData = async () => {
      try {
        if (post.tipo === 'local' && post.local_id) {
          const { data: localData, error } = await supabase
            .from('locales')
            .select('nombre, imagen_url')
            .eq('id', post.local_id)
            .single();

          if (!error && localData) {
            setAuthorName(localData.nombre);
            setAuthorAvatar(localData.imagen_url || null);
          }
        } else if (post.autor_id) {
          const { data: userData, error } = await supabase
            .from('usuarios')
            .select('nombre, avatar, username')
            .eq('id', post.autor_id)
            .single();

          if (!error && userData) {
            setAuthorName(userData.username || userData.nombre);
            setAuthorAvatar(userData.avatar || null);
          }
        }
      } catch (error) {
        console.error('[InstagramPostCard] Error loading author data:', error);
      } finally {
        setLoadingAuthor(false);
      }
    };

    loadAuthorData();
  }, [post.tipo, post.local_id, post.autor_id]);

  const handleProfilePress = () => {
    if (post.tipo === 'local' && post.local_id) {
      router.push(`/perfil/local?localId=${post.local_id}`);
    } else {
      router.push(`/perfil/usuario?userId=${post.autor_id}`);
    }
  };

  const animateLikeIcon = useCallback(() => {
    Animated.sequence([
      Animated.timing(likeIconScale, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(likeIconScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [likeIconScale]);

  const animateDoubleTapHeart = useCallback(() => {
    doubleTapHeartScale.setValue(0);
    doubleTapHeartOpacity.setValue(1);

    Animated.parallel([
      Animated.spring(doubleTapHeartScale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(doubleTapHeartOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [doubleTapHeartScale, doubleTapHeartOpacity]);

  const handleImageDoubleTap = useCallback(async () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (lastTap.current && now - lastTap.current < DOUBLE_TAP_DELAY) {
      lastTap.current = null;

      if (!isLiked) {
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        animateDoubleTapHeart();
        await handleLike();
      }
    } else {
      lastTap.current = now;
    }
  }, [isLiked, animateDoubleTapHeart]);

  const handleImagePress = () => {
    setShowPostViewer(true);
  };

  // ✅ CRITICAL FIX: Corrected optimistic UI logic
  const handleLike = useCallback(async () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para dar me gusta');
      return;
    }

    const validSession = await ensureValidSession();
    
    if (!validSession) {
      Alert.alert(
        'Sesión Expirada',
        'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
        [{ text: 'OK', onPress: () => router.push('/auth/login') }]
      );
      return;
    }

    // ✅ CRITICAL: Determine new state BEFORE any updates
    const newLikedState = !isLiked;
    const previousLiked = isLiked;
    const previousCount = likesCount;
    const previousLocalLikes = [...localLikes];
    
    console.log('[InstagramPostCard] 🎯 handleLike START:', {
      postId: post.id,
      currentIsLiked: isLiked,
      newLikedState,
      currentLocalLikesCount: localLikes.length,
      userId: user.id,
      action: newLikedState ? 'LIKING' : 'UNLIKING',
    });
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.selectionAsync();
    }

    if (newLikedState) {
      animateLikeIcon();
    }

    // ✅ STEP 1: Update isLiked state
    setIsLiked(newLikedState);
    console.log('[InstagramPostCard] ✅ Step 1: Updated isLiked to:', newLikedState);
    
    // ✅ STEP 2: Update count
    const newCount = newLikedState ? likesCount + 1 : Math.max(0, likesCount - 1);
    setLikesCount(newCount);
    console.log('[InstagramPostCard] ✅ Step 2: Updated count from', likesCount, 'to', newCount);
    
    // ✅ STEP 3: Update local likes array based on action
    let newLocalLikes: { id: string; usuario_id: string }[];
    
    if (newLikedState) {
      // ✅ User is LIKING → ADD avatar
      const tempId = `temp-${Date.now()}`;
      newLocalLikes = [...localLikes, { id: tempId, usuario_id: user.id }];
      console.log('[InstagramPostCard] ➕ Step 3: LIKING - Adding avatar. Before:', localLikes.length, 'After:', newLocalLikes.length);
      console.log('[InstagramPostCard] ➕ Added user:', user.id, 'with temp ID:', tempId);
    } else {
      // ✅ User is UNLIKING → REMOVE avatar
      newLocalLikes = localLikes.filter(like => like.usuario_id !== user.id);
      console.log('[InstagramPostCard] ➖ Step 3: UNLIKING - Removing avatar. Before:', localLikes.length, 'After:', newLocalLikes.length);
      console.log('[InstagramPostCard] ➖ Removed user:', user.id);
    }
    
    setLocalLikes(newLocalLikes);
    console.log('[InstagramPostCard] ✅ Step 4: Local likes array updated. New array:', newLocalLikes.map(l => ({ id: l.id, userId: l.usuario_id })));

    if (likeDebounceTimer.current) {
      clearTimeout(likeDebounceTimer.current);
    }

    likeDebounceTimer.current = setTimeout(async () => {
      try {
        if (newLikedState) {
          console.log('[InstagramPostCard] 💾 Database: Adding like to database for post:', post.id);
          
          const { data, error } = await supabase.from('likes').insert({
            post_id: post.id,
            usuario_id: user.id,
          }).select().single();
          
          if (error) {
            console.error('[InstagramPostCard] ❌ Database error adding like:', error);
            throw error;
          }
          
          // ✅ Replace temp ID with real ID from database
          setLocalLikes(prev => prev.map(like => 
            like.usuario_id === user.id && like.id.startsWith('temp-')
              ? { id: data.id, usuario_id: user.id }
              : like
          ));
          
          console.log('[InstagramPostCard] ✅ Database: Like added successfully, real ID:', data.id);
        } else {
          console.log('[InstagramPostCard] 💾 Database: Removing like from database for post:', post.id);
          
          const { error } = await supabase
            .from('likes')
            .delete()
            .eq('post_id', post.id)
            .eq('usuario_id', user.id);
          
          if (error) {
            console.error('[InstagramPostCard] ❌ Database error removing like:', error);
            throw error;
          }
          
          console.log('[InstagramPostCard] ✅ Database: Like removed successfully');
        }

        // ✅ Verify final count from database
        const { count, error: countError } = await supabase
          .from('likes')
          .select('id', { count: 'exact', head: true })
          .eq('post_id', post.id);
        
        if (!countError && count !== null) {
          console.log('[InstagramPostCard] ✅ Database: Verified final count:', count);
          setLikesCount(count);
        }
      } catch (error) {
        console.error('[InstagramPostCard] ❌ Error toggling like:', error);
        // ✅ Rollback on error
        console.log('[InstagramPostCard] 🔄 Rolling back to previous state');
        setIsLiked(previousLiked);
        setLikesCount(previousCount);
        setLocalLikes(previousLocalLikes);
        Alert.alert('Error', 'No se pudo actualizar el me gusta. Intenta de nuevo.');
      }
    }, 300);
  }, [user, ensureValidSession, isLiked, likesCount, localLikes, post.id, animateLikeIcon]);

  const handleComment = useCallback(() => {
    setShowComments(true);
  }, []);

  const handleShare = useCallback(() => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para compartir publicaciones');
      return;
    }
    setShowShareModal(true);
  }, [user]);

  const handleSave = useCallback(async () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para guardar publicaciones');
      return;
    }

    const newSavedState = !isSaved;
    setIsSaved(newSavedState);

    try {
      if (newSavedState) {
        await supabase.from('posts_guardados').insert({
          post_id: post.id,
          usuario_id: user.id,
        });
      } else {
        await supabase
          .from('posts_guardados')
          .delete()
          .eq('post_id', post.id)
          .eq('usuario_id', user.id);
      }
    } catch (error) {
      console.error('[InstagramPostCard] Error toggling save:', error);
      setIsSaved(!newSavedState);
    }
  }, [user, isSaved, post.id]);

  // ✅ NEW: Report post functionality
  const handleReport = useCallback(() => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para reportar contenido');
      return;
    }

    setShowReportModal(true);
  }, [user]);

  const handleDelete = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para eliminar publicaciones');
      return;
    }

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
              console.log('[InstagramPostCard] 🗑️ Attempting to delete post:', {
                postId: post.id,
                userId: user.id,
                autorId: post.autor_id,
                isOwner,
              });
              
              if (post.autor_id !== user.id) {
                console.error('[InstagramPostCard] ❌ User is not the owner of this post');
                Alert.alert('Error', 'No tienes permiso para eliminar esta publicación');
                return;
              }

              const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', post.id)
                .eq('autor_id', user.id);

              if (error) {
                console.error('[InstagramPostCard] ❌ Delete error:', error);
                throw error;
              }

              console.log('[InstagramPostCard] ✅ Post deleted successfully');
              Alert.alert('Éxito', 'Publicación eliminada correctamente');

              if (onUpdate) {
                onUpdate();
              }
            } catch (error: any) {
              console.error('[InstagramPostCard] ❌ Error deleting post:', error);
              Alert.alert(
                'Error', 
                error.message || 'No se pudo eliminar la publicación. Por favor, intenta de nuevo.'
              );
            }
          },
        },
      ]
    );
  };

  const handleMoreOptions = useCallback(() => {
    const options: string[] = [];
    const actions: (() => void)[] = [];

    if (isOwner) {
      options.push('Eliminar');
      actions.push(handleDelete);
    } else {
      options.push('Reportar');
      actions.push(handleReport);
    }

    options.push('Cancelar');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: isOwner ? 0 : undefined,
        },
        (buttonIndex) => {
          if (buttonIndex < actions.length) {
            actions[buttonIndex]();
          }
        }
      );
    } else {
      Alert.alert(
        'Opciones',
        '',
        options.map((option, index) => ({
          text: option,
          style: option === 'Eliminar' ? 'destructive' : option === 'Cancelar' ? 'cancel' : 'default',
          onPress: index < actions.length ? actions[index] : undefined,
        }))
      );
    }
  }, [isOwner, handleDelete, handleReport]);

  const handleCommentsUpdate = useCallback(() => {
    setCommentsCount(prev => prev + 1);
    if (onUpdate) {
      onUpdate();
    }
  }, [onUpdate]);

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

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const displayUsername = post.tipo === 'local'
    ? post.local?.nombre
    : (post.autor.username || post.autor.nombre);

  const captionText = post.contenido || '';
  const shouldTruncate = captionText.length > 100;
  const displayCaption = shouldTruncate && !showFullCaption 
    ? captionText.substring(0, 100) + '...' 
    : captionText;

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.authorInfo} onPress={handleProfilePress}>
            <MiniAvatarWithMomento
              userId={post.tipo === 'usuario' ? post.autor_id : undefined}
              localId={post.tipo === 'local' ? post.local_id : undefined}
              imageUrl={authorAvatar || undefined}
              size={40}
              showMomentoBorder={true}
            />
            <View style={styles.authorText}>
              <Text style={styles.authorName}>{displayUsername}</Text>
              {post.ubicacion && (
                <Text style={styles.locationText}>{post.ubicacion}</Text>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moreButton} onPress={handleMoreOptions}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {post.imagenes.length > 0 && (
          <TouchableOpacity 
            style={styles.imagesContainer}
            onPress={handleImageDoubleTap}
            onLongPress={handleImagePress}
            activeOpacity={0.95}
          >
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(event) => {
                const index = Math.round(
                  event.nativeEvent.contentOffset.x / SCREEN_WIDTH
                );
                setCurrentImageIndex(index);
              }}
              scrollEventThrottle={16}
            >
              {post.imagenes.map((imagen, index) => (
                <Image
                  key={`image-${post.id}-${index}`}
                  source={{ uri: imagen }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>

            <Animated.View
              style={[
                styles.doubleTapHeart,
                {
                  opacity: doubleTapHeartOpacity,
                  transform: [{ scale: doubleTapHeartScale }],
                },
              ]}
              pointerEvents="none"
            >
              <Ionicons name="heart" size={120} color="#fff" />
            </Animated.View>

            {post.imagenes.length > 1 && (
              <View style={styles.imageIndicator}>
                {post.imagenes.map((_, index) => (
                  <View
                    key={`indicator-${post.id}-${index}`}
                    style={[
                      styles.indicatorDot,
                      index === currentImageIndex && styles.indicatorDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.actions}>
          <View style={styles.leftActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleLike}
            >
              <Animated.View style={{ transform: [{ scale: likeIconScale }] }}>
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={28}
                  color={isLiked ? '#ff3b30' : colors.text}
                />
              </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleComment}
            >
              <IconSymbol ios_icon_name="bubble.right" android_material_icon_name="chat_bubble_outline" size={26} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShare}
            >
              <Ionicons name="paper-plane-outline" size={26} color={colors.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSave}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={26}
              color={isSaved ? colors.primary : colors.text}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.stats}>
          {/* ✅ CRITICAL FIX: Pass localLikes array directly - component will handle reactivity */}
          {likesCount > 0 && (
            <PostLikesAvatars 
              postId={post.id} 
              totalLikes={likesCount}
              localLikes={localLikes}
            />
          )}
          
          {captionText && (
            <View style={styles.captionContainer}>
              <Text style={styles.caption}>
                <Text style={styles.captionUsername}>{displayUsername}</Text>{' '}
                {displayCaption}
              </Text>
              {shouldTruncate && (
                <TouchableOpacity onPress={() => setShowFullCaption(!showFullCaption)}>
                  <Text style={styles.moreText}>
                    {showFullCaption ? 'menos' : 'más'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ✅ FIXED: Comment count display with proper text */}
          <TouchableOpacity onPress={handleComment}>
            {commentsCount > 0 ? (
              <Text style={styles.commentsText}>
                Ver {commentsCount === 1 ? 'el comentario' : `los ${commentsCount} comentarios`}
              </Text>
            ) : (
              <Text style={styles.commentsTextEmpty}>
                Sé el primero en comentar
              </Text>
            )}
          </TouchableOpacity>
          
          <Text style={styles.timeAgo}>{formatTimeAgo(post.created_at)}</Text>
        </View>
      </View>

      <PostViewerModal
        visible={showPostViewer}
        post={post}
        onClose={() => setShowPostViewer(false)}
        onUpdate={onUpdate}
        hideTagIcon={hideTagIcon}
      />

      <CommentsModal
        visible={showComments}
        postId={post.id}
        postAuthorId={post.autor_id}
        onClose={() => setShowComments(false)}
        onCommentAdded={handleCommentsUpdate}
      />

      <SharePostModal
        visible={showShareModal}
        postId={post.id}
        postContent={post.contenido}
        postImage={post.imagenes && post.imagenes.length > 0 ? post.imagenes[0] : undefined}
        postAuthorName={displayUsername}
        postAuthorAvatar={authorAvatar || undefined}
        onClose={() => setShowShareModal(false)}
      />

      {/* ✅ NEW: Report modal */}
      <ReportModal
        visible={showReportModal}
        contentType="post"
        contentId={post.id}
        onClose={() => setShowReportModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorText: {
    marginLeft: 10,
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  locationText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  moreButton: {
    padding: 8,
  },
  imagesContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    position: 'relative',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  doubleTapHeart: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -60,
    marginLeft: -60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
  },
  stats: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
  },
  captionContainer: {
    marginBottom: 4,
  },
  caption: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 18,
  },
  captionUsername: {
    fontWeight: '600',
    color: colors.text,
  },
  moreText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  commentsText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '600',
  },
  commentsTextEmpty: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  timeAgo: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
  },
});
