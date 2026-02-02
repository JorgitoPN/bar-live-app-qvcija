
import React, { useState, useCallback, memo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Platform,
  ActionSheetIOS,
  ScrollView,
  Share,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useInteractionContext } from '@/hooks/useInteractionContext';
import OptimizedImage from '@/components/common/OptimizedImage';
import ParsedText from '@/components/social/ParsedText';
import MiniFoodPlateAvatar from '@/components/common/MiniFoodPlateAvatar';

import SharePostModal from '@/components/social/SharePostModal';
import PostLikesAvatars from '@/components/social/PostLikesAvatars';
import TagDisplay from '@/components/social/TagDisplay';
import ReportModal from '@/components/social/ReportModal';
import { LinearGradient } from 'expo-linear-gradient';
import { TapGestureHandler, State } from 'react-native-gesture-handler';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Post {
  id: string;
  autor_id: string;
  tipo: 'usuario' | 'local';
  local_id?: string;
  contenido: string;
  imagenes: string[];
  video_url?: string;
  ubicacion?: string;
  likes_count: number;
  comentarios_count: number;
  compartidos_count: number;
  created_at: string;
  autor?: {
    id: string;
    nombre: string;
    username?: string;
    avatar?: string;
  };
  local?: {
    id: string;
    nombre: string;
    imagen_url?: string;
  };
  user_has_liked?: boolean;
  user_has_saved?: boolean;
}

interface PublicacionCardProps {
  post: Post;
  onUpdate?: () => void;
}

export interface TaggableUser {
  id: string;
  nombre: string;
  username: string;
  avatar?: string;
  tipo: 'usuario' | 'local';
}

/**
 * ✅ PUBLICACION CARD v328.0 - MODAL STACK GROUP INTEGRATION
 * 
 * NEW CHANGES v328.0:
 * - ✅ UPDATED: Edit pages now part of Stack.Group for proper modal stacking
 * - ✅ IMPROVED: Consistent navigation with PostViewerModal architecture
 * - ✅ IMPROVED: Edit pages open as fullScreenModal on top of post viewer
 * 
 * Previous changes v322.0:
 * - ✅ FIXED: "Editar descripción" now navigates to full-screen page (not modal)
 * - ✅ FIXED: "Gestionar etiquetas" now navigates to full-screen page (not modal)
 * - ✅ FIXED: Removed inline modals for editing and tag management
 * - ✅ IMPROVED: Consistent navigation pattern with PostViewerModal
 * - ✅ IMPROVED: Better UX with dedicated full-screen pages
 */

const PublicacionCard = memo(({ post, onUpdate }: PublicacionCardProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const { interactionUserId, interactionLocalId, isInteractingAsLocal } = useInteractionContext();
  
  const [liked, setLiked] = useState(post.user_has_liked || false);
  const [saved, setSaved] = useState(post.user_has_saved || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(post.comentarios_count || 0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  
  const [showTags, setShowTags] = useState(false);

  const [taggedUsers, setTaggedUsers] = useState<TaggableUser[]>([]);

  const [showReportModal, setShowReportModal] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const [localLikes, setLocalLikes] = useState<{ id: string; usuario_id: string }[]>([]);
  const likeDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  const MAX_IMAGES = 10;

  const loadTaggedUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('post_tags')
        .select(`
          *,
          usuario:usuarios!post_tags_usuario_id_fkey(id, nombre, username, avatar),
          local:locales(id, nombre, imagen_url)
        `)
        .eq('post_id', post.id)
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

      setTaggedUsers(tags);
    } catch (error) {
      console.error('[PublicacionCard v328.0] Error loading tagged users:', error);
    }
  }, [post.id]);

  useEffect(() => {
    loadTaggedUsers();
  }, [loadTaggedUsers]);

  useEffect(() => {
    const loadInitialLikes = async () => {
      try {
        console.log('[PublicacionCard v328.0] 🔄 Loading initial likes for post:', post.id);
        
        const { data, error } = await supabase
          .from('likes')
          .select('id, usuario_id')
          .eq('post_id', post.id);

        if (!error && data) {
          setLocalLikes(data);
          console.log('[PublicacionCard v328.0] ✅ Loaded initial likes:', data.length);
        }
      } catch (error) {
        console.error('[PublicacionCard v328.0] ❌ Error loading initial likes:', error);
      }
    };

    loadInitialLikes();
  }, [post.id]);

  useEffect(() => {
    if (!user) return;

    console.log('[PublicacionCard v328.0] 🔄 Setting up real-time subscription for post:', post.id);

    if (channelRef.current?.state === 'subscribed') {
      console.log('[PublicacionCard v328.0] ⚠️ Already subscribed, skipping');
      return;
    }

    const channel = supabase.channel(`post-likes-card:${post.id}:${user.id}`);
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
          console.log('[PublicacionCard v328.0] 🔄 Real-time like change detected:', payload.eventType);
          
          const changedByUserId = payload.new?.usuario_id || payload.old?.usuario_id;
          
          if (changedByUserId === user.id) {
            console.log('[PublicacionCard v328.0] ⏭️ Change made by current user, skipping');
            return;
          }
          
          console.log('[PublicacionCard v328.0] 🔄 Change made by another user, updating...');
          
          if (payload.eventType === 'INSERT' && payload.new) {
            setLocalLikes(prev => {
              if (prev.some(like => like.id === payload.new.id)) {
                return prev;
              }
              const newArray = [...prev, { id: payload.new.id, usuario_id: payload.new.usuario_id }];
              console.log('[PublicacionCard v328.0] ➕ Added like, new count:', newArray.length);
              return newArray;
            });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setLocalLikes(prev => {
              const newArray = prev.filter(like => like.id !== payload.old.id);
              console.log('[PublicacionCard v328.0] ➖ Removed like, new count:', newArray.length);
              return newArray;
            });
          }
          
          const { count, error: countError } = await supabase
            .from('likes')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', post.id);
          
          if (!countError && count !== null) {
            console.log('[PublicacionCard v328.0] ✅ Updated likes count:', count);
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
          console.log('[PublicacionCard v328.0] 🔄 Real-time comment change detected:', payload.eventType);
          
          const { count, error: countError } = await supabase
            .from('comentarios')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', post.id);
          
          if (!countError && count !== null) {
            console.log('[PublicacionCard v328.0] ✅ Updated comments count:', count);
            setCommentsCount(count);
          }
        }
      )
      .subscribe((status) => {
        console.log('[PublicacionCard v328.0] 📡 Subscription status:', status);
      });

    return () => {
      console.log('[PublicacionCard v328.0] 🔄 Cleaning up subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [post.id, user]);

  const handleLike = useCallback(async () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para dar me gusta');
      return;
    }

    const newLikedState = !liked;
    const previousLiked = liked;
    const previousCount = likesCount;
    const previousLocalLikes = [...localLikes];
    
    console.log('[PublicacionCard v322.0] 🎯 handleLike START:', {
      postId: post.id,
      currentLiked: liked,
      newLikedState,
      currentLocalLikesCount: localLikes.length,
      userId: user.id,
      action: newLikedState ? 'LIKING' : 'UNLIKING',
    });
    
    setLiked(newLikedState);
    console.log('[PublicacionCard v322.0] ✅ Step 1: Updated liked to:', newLikedState);
    
    const newCount = newLikedState ? likesCount + 1 : Math.max(0, likesCount - 1);
    setLikesCount(newCount);
    console.log('[PublicacionCard v322.0] ✅ Step 2: Updated count from', likesCount, 'to', newCount);
    
    let newLocalLikes: { id: string; usuario_id: string }[];
    
    if (newLikedState) {
      const tempId = `temp-${Date.now()}`;
      newLocalLikes = [...localLikes, { id: tempId, usuario_id: user.id }];
      console.log('[PublicacionCard v322.0] ➕ Step 3: LIKING - Adding avatar. Before:', localLikes.length, 'After:', newLocalLikes.length);
      console.log('[PublicacionCard v322.0] ➕ Added user:', user.id, 'with temp ID:', tempId);
    } else {
      newLocalLikes = localLikes.filter(like => like.usuario_id !== user.id);
      console.log('[PublicacionCard v322.0] ➖ Step 3: UNLIKING - Removing avatar. Before:', localLikes.length, 'After:', newLocalLikes.length);
      console.log('[PublicacionCard v322.0] ➖ Removed user:', user.id);
    }
    
    setLocalLikes(newLocalLikes);
    console.log('[PublicacionCard v322.0] ✅ Step 4: Local likes array updated. New array:', newLocalLikes.map(l => ({ id: l.id, userId: l.usuario_id })));

    if (likeDebounceTimer.current) {
      clearTimeout(likeDebounceTimer.current);
    }

    likeDebounceTimer.current = setTimeout(async () => {
      try {
        if (newLikedState) {
          console.log('[PublicacionCard v322.0] 💾 Database: Adding like to database');
          
          const { data, error } = await supabase.from('likes').insert({
            post_id: post.id,
            usuario_id: user.id,
          }).select().single();
          
          if (error) throw error;
          
          setLocalLikes(prev => prev.map(like => 
            like.usuario_id === user.id && like.id.startsWith('temp-')
              ? { id: data.id, usuario_id: user.id }
              : like
          ));
          
          console.log('[PublicacionCard v322.0] ✅ Database: Like added, real ID:', data.id);
        } else {
          console.log('[PublicacionCard v322.0] 💾 Database: Removing like from database');
          
          const { error } = await supabase
            .from('likes')
            .delete()
            .eq('post_id', post.id)
            .eq('usuario_id', user.id);
          
          if (error) throw error;
          
          console.log('[PublicacionCard v322.0] ✅ Database: Like removed');
        }

        const { count, error: countError } = await supabase
          .from('likes')
          .select('id', { count: 'exact', head: true })
          .eq('post_id', post.id);
        
        if (!countError && count !== null) {
          console.log('[PublicacionCard v322.0] ✅ Database: Verified count:', count);
          setLikesCount(count);
        }
      } catch (error) {
        console.error('[PublicacionCard v322.0] ❌ Error toggling like:', error);
        console.log('[PublicacionCard v322.0] 🔄 Rolling back to previous state');
        setLiked(previousLiked);
        setLikesCount(previousCount);
        setLocalLikes(previousLocalLikes);
        Alert.alert('Error', 'No se pudo actualizar el me gusta');
      }
    }, 300);
  }, [user, liked, likesCount, localLikes, post.id]);

  const handleDoubleTap = useCallback(async (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      if (!user) {
        Alert.alert('Inicia sesión', 'Debes iniciar sesión para dar me gusta');
        return;
      }

      if (!liked) {
        scaleAnim.setValue(0);
        opacityAnim.setValue(1);
        
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 800,
            delay: 200,
            useNativeDriver: true,
          }),
        ]).start();

        await handleLike();
      }
    }
  }, [user, liked, handleLike, scaleAnim, opacityAnim]);

  const handleSave = useCallback(async () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para guardar publicaciones');
      return;
    }

    const newSavedState = !saved;
    setSaved(newSavedState);

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
      console.error('[PublicacionCard v328.0] Error toggling save:', error);
      setSaved(!newSavedState);
    }
  }, [user, saved, post.id]);

  const handleComment = useCallback(() => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Para comentar necesitas registrarte en BarLive');
      return;
    }
    console.log('[PublicacionCard v328.0] 💬 Opening comments full-screen page for post:', post.id);
    router.push({
      pathname: '/social/comentarios',
      params: { 
        postId: post.id,
        postAuthorId: post.autor_id,
      },
    });
  }, [user, post.id, post.autor_id, router]);

  const handleShare = useCallback(async () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para compartir publicaciones');
      return;
    }

    setShareModalVisible(true);
  }, [user]);

  const handleNativeShare = useCallback(async () => {
    try {
      const shareContent = post.contenido 
        ? `${post.contenido}\n\nVer en BarLive`
        : 'Ver publicación en BarLive';
      
      await Share.share({
        message: shareContent,
        title: 'Compartir publicación',
      });
    } catch (error) {
      console.error('[PublicacionCard v328.0] Error sharing:', error);
    }
  }, [post.contenido]);

  const handlePostPress = useCallback(() => {
    router.push({
      pathname: '/social/post',
      params: { id: post.id },
    });
  }, [router, post.id]);

  const handleImageTap = useCallback(() => {
    setShowTags(!showTags);
  }, [showTags]);

  const handleProfilePress = useCallback(() => {
    if (post.tipo === 'local' && post.local_id) {
      router.push({
        pathname: '/perfil/local',
        params: { localId: post.local_id },
      });
    } else if (post.tipo === 'usuario' && post.autor_id) {
      if (user && post.autor_id === user.id) {
        router.push('/(tabs)/perfil');
      } else {
        router.push({
          pathname: '/perfil/usuario',
          params: { userId: post.autor_id },
        });
      }
    }
  }, [router, post, user]);

  const handleDeletePost = useCallback(async () => {
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
                .eq('id', post.id);

              if (error) throw error;

              if (onUpdate) {
                onUpdate();
              }
            } catch (error) {
              console.error('[PublicacionCard v328.0] Error deleting post:', error);
              Alert.alert('Error', 'No se pudo eliminar la publicación');
            }
          },
        },
      ]
    );
  }, [post.id, onUpdate]);

  const handleReportPost = useCallback(() => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para reportar contenido');
      return;
    }

    setShowReportModal(true);
  }, [user]);

  const showOptions = useCallback(() => {
    const canEdit = user && (
      (post.tipo === 'usuario' && post.autor_id === user.id) ||
      (post.tipo === 'local' && interactionLocalId === post.local_id)
    );

    const isOwner = user && (
      (post.tipo === 'usuario' && post.autor_id === user.id) ||
      (post.tipo === 'local' && interactionLocalId === post.local_id)
    );

    const options: string[] = [];
    const actions: (() => void)[] = [];

    if (user && !isOwner) {
      options.push('Reportar');
      actions.push(handleReportPost);
    }

    if (canEdit) {
      // ✅ v328.0: Navigate to full-screen pages (part of Stack.Group)
      options.push('Editar descripción');
      actions.push(() => {
        console.log('[PublicacionCard v328.0] 📝 Opening edit description full-screen page');
        router.push({
          pathname: '/social/editar-descripcion',
          params: { postId: post.id },
        });
      });

      options.push('Gestionar etiquetas');
      actions.push(() => {
        console.log('[PublicacionCard v328.0] 🏷️ Opening manage tags full-screen page');
        router.push({
          pathname: '/social/gestionar-etiquetas',
          params: { postId: post.id },
        });
      });

      options.push('Eliminar publicación');
      actions.push(handleDeletePost);
    }

    options.push('Cancelar');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: options.findIndex(o => o.includes('Eliminar')),
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
          style: option.includes('Eliminar') ? 'destructive' : option === 'Cancelar' ? 'cancel' : 'default',
          onPress: index < actions.length ? actions[index] : undefined,
        }))
      );
    }
  }, [user, post, interactionLocalId, handleDeletePost, handleReportPost, router]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Ahora';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return `${Math.floor(seconds / 604800)}sem`;
  };

  const displayName = post.tipo === 'local' && post.local 
    ? post.local.nombre 
    : post.autor?.username 
      ? post.autor.username.replace(/^@/, '')
      : post.autor?.nombre || 'Usuario';

  const displayAvatar = post.tipo === 'local' && post.local 
    ? post.local.imagen_url 
    : post.autor?.avatar || '';

  const canEdit = user && (
    (post.tipo === 'usuario' && post.autor_id === user.id) ||
    (post.tipo === 'local' && interactionLocalId === post.local_id)
  );

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setCurrentImageIndex(index);
  };

  // ✅ CRITICAL FIX v322.0: Calculate scaled sizes for Android
  const avatarSize = Platform.OS === 'android' ? scaleIconSize(40) : 40;
  const actionIconSize = Platform.OS === 'android' ? scaleIconSize(26) : 26;
  const optionsIconSize = Platform.OS === 'android' ? scaleIconSize(24) : 24;
  const tagIconSize = Platform.OS === 'android' ? scaleIconSize(12) : 12;
  const doubleTapHeartSize = Platform.OS === 'android' ? scaleIconSize(100) : 100;

  return (
    <View style={styles.card}>
      {taggedUsers.length > 0 && (
        <View style={styles.taggedUsersHeader}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.taggedUsersScroll}
          >
            {taggedUsers.map((taggedUser) => (
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

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={handleProfilePress} activeOpacity={0.7}>
          <MiniFoodPlateAvatar
            imageUrl={displayAvatar}
            size={avatarSize}
            nombre={displayName}
            userId={post.tipo === 'usuario' ? post.autor_id : undefined}
            localId={post.tipo === 'local' ? post.local_id : undefined}
            showMomentoBorder={true}
          />
          <View style={styles.headerInfo}>
            <Text style={[styles.username, { fontSize: scaleFontSize(15) }]}>{displayName}</Text>
            <Text style={[styles.timestamp, { fontSize: scaleFontSize(13) }]}>{formatTimeAgo(post.created_at)}</Text>
          </View>
        </TouchableOpacity>
        {(canEdit || user) && (
          <TouchableOpacity style={styles.optionsButton} onPress={showOptions} activeOpacity={0.7}>
            <IconSymbol 
              ios_icon_name="ellipsis" 
              android_material_icon_name="more_vert" 
              size={optionsIconSize} 
              color={colors.text} 
            />
          </TouchableOpacity>
        )}
      </View>

      {post.imagenes && post.imagenes.length > 0 && (
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {post.imagenes.map((imageUrl, index) => (
              <TapGestureHandler
                key={index}
                onHandlerStateChange={handleDoubleTap}
                numberOfTaps={2}
              >
                <View style={styles.imageWrapper}>
                  <OptimizedImage
                    source={{ uri: imageUrl }}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                  
                  <Animated.View
                    style={[
                      styles.doubleTapHeart,
                      {
                        opacity: opacityAnim,
                        transform: [
                          {
                            scale: scaleAnim.interpolate({
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

                  <TagDisplay
                    postId={post.id}
                    imageIndex={index}
                    imageWidth={SCREEN_WIDTH}
                    imageHeight={SCREEN_WIDTH}
                    visible={showTags && index === currentImageIndex}
                  />
                </View>
              </TapGestureHandler>
            ))}
          </ScrollView>
          {post.imagenes.length > 1 && (
            <View style={styles.imageIndicatorContainer}>
              {post.imagenes.map((_, index) => (
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
        </View>
      )}

      <View style={styles.actions}>
        <View style={styles.actionsLeft}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike} activeOpacity={0.7}>
            <IconSymbol
              ios_icon_name={liked ? "heart.fill" : "heart"}
              android_material_icon_name={liked ? "favorite" : "favorite_border"}
              size={actionIconSize}
              color={liked ? "#EF4444" : colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleComment} activeOpacity={0.7}>
            <IconSymbol
              ios_icon_name="message"
              android_material_icon_name="chat_bubble_outline"
              size={actionIconSize}
              color={colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleShare} activeOpacity={0.7}>
            <IconSymbol
              ios_icon_name="paperplane"
              android_material_icon_name="send"
              size={actionIconSize}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={handleSave} activeOpacity={0.7}>
          <IconSymbol
            ios_icon_name={saved ? "bookmark.fill" : "bookmark"}
            android_material_icon_name={saved ? "bookmark" : "bookmark_border"}
            size={actionIconSize}
            color={saved ? colors.primary : colors.text}
          />
        </TouchableOpacity>
      </View>

      {likesCount > 0 && (
        <PostLikesAvatars 
          postId={post.id} 
          totalLikes={likesCount}
          localLikes={localLikes}
        />
      )}

      {post.contenido && (
        <View style={styles.contentContainer}>
          <ParsedText text={post.contenido} style={[styles.content, { fontSize: scaleFontSize(15) }]} />
        </View>
      )}

      <TouchableOpacity 
        style={styles.commentsContainer}
        onPress={handleComment}
        activeOpacity={0.7}
      >
        {commentsCount > 0 ? (
          <Text style={[styles.commentsText, { fontSize: scaleFontSize(14) }]}>
            Ver {commentsCount === 1 ? 'el comentario' : `los ${commentsCount} comentarios`}
          </Text>
        ) : (
          <Text style={[styles.commentsTextEmpty, { fontSize: scaleFontSize(14) }]}>
            Sé el primero en comentar
          </Text>
        )}
      </TouchableOpacity>

      <SharePostModal
        visible={shareModalVisible}
        postId={post.id}
        postContent={post.contenido}
        postImage={post.imagenes && post.imagenes.length > 0 ? post.imagenes[0] : undefined}
        postAuthorName={displayName}
        postAuthorAvatar={displayAvatar}
        onClose={() => setShareModalVisible(false)}
      />

      <ReportModal
        visible={showReportModal}
        contentType="post"
        contentId={post.id}
        onClose={() => setShowReportModal(false)}
      />
    </View>
  );
});

PublicacionCard.displayName = 'PublicacionCard';

export default PublicacionCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    marginBottom: 12,
    borderRadius: 0,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  timestamp: {
    color: colors.textSecondary,
  },
  optionsButton: {
    padding: 8,
  },
  imageContainer: {
    position: 'relative',
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: colors.background,
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
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
    backgroundColor: '#FFFFFF',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  content: {
    color: colors.text,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    padding: 4,
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
});
