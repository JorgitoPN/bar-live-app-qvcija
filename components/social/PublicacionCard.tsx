
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
  TextInput,
  Modal,
  KeyboardAvoidingView,
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
import CommentsModal from '@/components/social/CommentsModal';
import SharePostModal from '@/components/social/SharePostModal';
import PostLikesAvatars from '@/components/social/PostLikesAvatars';
import TagDisplay from '@/components/social/TagDisplay';
import TaggingModalV5, { TaggableUser } from '@/components/social/TaggingModalV5';
import { LinearGradient } from 'expo-linear-gradient';
import { TapGestureHandler, State } from 'react-native-gesture-handler';

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

/**
 * ✅ PUBLICACION CARD v7.0 - COMMENT COUNT TEXT DISPLAY
 * 
 * Changes:
 * - ✅ ADDED: Comment count display with proper text ("Ver comentario" / "Ver comentarios")
 * - ✅ ADDED: "Sé el primero en comentar" when no comments
 * - ✅ UNIFIED: Same comment display as InstagramPostCard and PostViewerModal
 * - ✅ Maintains all existing functionality
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
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  
  const [showTags, setShowTags] = useState(false);
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editedDescription, setEditedDescription] = useState(post.contenido || '');
  const [savingEdit, setSavingEdit] = useState(false);

  const [showTagManagementModal, setShowTagManagementModal] = useState(false);
  const [existingTags, setExistingTags] = useState<TaggableUser[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  const [showTagModal, setShowTagModal] = useState(false);

  const [taggedUsers, setTaggedUsers] = useState<TaggableUser[]>([]);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // ✅ CRITICAL: Local likes array for instant updates
  const [localLikes, setLocalLikes] = useState<Array<{ id: string; usuario_id: string }>>([]);
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
      console.error('[PublicacionCard] Error loading tagged users:', error);
    }
  }, [post.id]);

  useEffect(() => {
    loadTaggedUsers();
  }, [loadTaggedUsers]);

  // ✅ Load initial likes array
  useEffect(() => {
    const loadInitialLikes = async () => {
      try {
        console.log('[PublicacionCard] 🔄 Loading initial likes for post:', post.id);
        
        const { data, error } = await supabase
          .from('likes')
          .select('id, usuario_id')
          .eq('post_id', post.id);

        if (!error && data) {
          setLocalLikes(data);
          console.log('[PublicacionCard] ✅ Loaded initial likes:', data.length);
        }
      } catch (error) {
        console.error('[PublicacionCard] ❌ Error loading initial likes:', error);
      }
    };

    loadInitialLikes();
  }, [post.id]);

  // ✅ Real-time subscription for OTHER users' changes
  useEffect(() => {
    if (!user) return;

    console.log('[PublicacionCard] 🔄 Setting up real-time subscription for post:', post.id);

    if (channelRef.current?.state === 'subscribed') {
      console.log('[PublicacionCard] ⚠️ Already subscribed, skipping');
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
          console.log('[PublicacionCard] 🔄 Real-time like change detected:', payload.eventType);
          
          const changedByUserId = payload.new?.usuario_id || payload.old?.usuario_id;
          
          if (changedByUserId === user.id) {
            console.log('[PublicacionCard] ⏭️ Change made by current user, skipping');
            return;
          }
          
          console.log('[PublicacionCard] 🔄 Change made by another user, updating...');
          
          // ✅ Update local likes array
          if (payload.eventType === 'INSERT' && payload.new) {
            setLocalLikes(prev => {
              if (prev.some(like => like.id === payload.new.id)) {
                return prev;
              }
              const newArray = [...prev, { id: payload.new.id, usuario_id: payload.new.usuario_id }];
              console.log('[PublicacionCard] ➕ Added like, new count:', newArray.length);
              return newArray;
            });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setLocalLikes(prev => {
              const newArray = prev.filter(like => like.id !== payload.old.id);
              console.log('[PublicacionCard] ➖ Removed like, new count:', newArray.length);
              return newArray;
            });
          }
          
          // ✅ Fetch updated count
          const { count, error: countError } = await supabase
            .from('likes')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', post.id);
          
          if (!countError && count !== null) {
            console.log('[PublicacionCard] ✅ Updated likes count:', count);
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
          console.log('[PublicacionCard] 🔄 Real-time comment change detected:', payload.eventType);
          
          // ✅ Reload comment count
          const { count, error: countError } = await supabase
            .from('comentarios')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', post.id);
          
          if (!countError && count !== null) {
            console.log('[PublicacionCard] ✅ Updated comments count:', count);
            setCommentsCount(count);
          }
        }
      )
      .subscribe((status) => {
        console.log('[PublicacionCard] 📡 Subscription status:', status);
      });

    return () => {
      console.log('[PublicacionCard] 🔄 Cleaning up subscription');
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
    
    // ✅ INSTANT UPDATE: Modify local state immediately
    setLiked(newLikedState);
    setLikesCount(newLikedState ? likesCount + 1 : Math.max(0, likesCount - 1));
    
    // ✅ CRITICAL: Modify local likes array INSTANTLY
    if (newLikedState) {
      const tempId = `temp-${Date.now()}`;
      const newArray = [...localLikes, { id: tempId, usuario_id: user.id }];
      setLocalLikes(newArray);
      console.log('[PublicacionCard] ✅ Optimistic ADD: Local likes array updated, count:', newArray.length);
    } else {
      const newArray = localLikes.filter(like => like.usuario_id !== user.id);
      setLocalLikes(newArray);
      console.log('[PublicacionCard] ✅ Optimistic REMOVE: Local likes array updated, count:', newArray.length);
    }

    if (likeDebounceTimer.current) {
      clearTimeout(likeDebounceTimer.current);
    }

    likeDebounceTimer.current = setTimeout(async () => {
      try {
        if (newLikedState) {
          console.log('[PublicacionCard] ➕ Adding like to database');
          
          const { data, error } = await supabase.from('likes').insert({
            post_id: post.id,
            usuario_id: user.id,
          }).select().single();
          
          if (error) throw error;
          
          // ✅ Replace temp ID with real ID
          setLocalLikes(prev => prev.map(like => 
            like.usuario_id === user.id && like.id.startsWith('temp-')
              ? { id: data.id, usuario_id: user.id }
              : like
          ));
          
          console.log('[PublicacionCard] ✅ Like added, real ID:', data.id);
        } else {
          console.log('[PublicacionCard] ➖ Removing like from database');
          
          const { error } = await supabase
            .from('likes')
            .delete()
            .eq('post_id', post.id)
            .eq('usuario_id', user.id);
          
          if (error) throw error;
          
          console.log('[PublicacionCard] ✅ Like removed');
        }

        // ✅ Verify final count
        const { count, error: countError } = await supabase
          .from('likes')
          .select('id', { count: 'exact', head: true })
          .eq('post_id', post.id);
        
        if (!countError && count !== null) {
          console.log('[PublicacionCard] ✅ Verified count:', count);
          setLikesCount(count);
        }
      } catch (error) {
        console.error('[PublicacionCard] ❌ Error toggling like:', error);
        // ✅ Rollback on error
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
      console.error('[PublicacionCard] Error toggling save:', error);
      setSaved(!newSavedState);
    }
  }, [user, saved, post.id]);

  const handleComment = useCallback(() => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Para comentar necesitas registrarte en BarLive');
      return;
    }
    setCommentsModalVisible(true);
  }, [user]);

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
      console.error('[PublicacionCard] Error sharing:', error);
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
              console.error('[PublicacionCard] Error deleting post:', error);
              Alert.alert('Error', 'No se pudo eliminar la publicación');
            }
          },
        },
      ]
    );
  }, [post.id, onUpdate]);

  const handleEditDescription = useCallback(() => {
    setEditedDescription(post.contenido || '');
    setEditModalVisible(true);
  }, [post.contenido]);

  const handleSaveEdit = useCallback(async () => {
    if (!editedDescription.trim()) {
      Alert.alert('Error', 'La descripción no puede estar vacía');
      return;
    }

    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({ 
          contenido: editedDescription.trim(),
          editado_at: new Date().toISOString(),
        })
        .eq('id', post.id);

      if (error) throw error;

      setEditModalVisible(false);
      if (onUpdate) {
        onUpdate();
      }
      Alert.alert('Éxito', 'Descripción actualizada correctamente');
    } catch (error) {
      console.error('[PublicacionCard] Error updating description:', error);
      Alert.alert('Error', 'No se pudo actualizar la descripción');
    } finally {
      setSavingEdit(false);
    }
  }, [editedDescription, post.id, onUpdate]);

  const loadExistingTags = useCallback(async () => {
    setLoadingTags(true);
    try {
      console.log('[PublicacionCard] 🔄 Loading ACCEPTED tags from database for post:', post.id);

      const { data, error } = await supabase
        .from('post_tags')
        .select(`
          *,
          usuario:usuarios!post_tags_usuario_id_fkey(id, nombre, username, avatar),
          local:locales(id, nombre, imagen_url)
        `)
        .eq('post_id', post.id)
        .eq('estado', 'aceptado');

      if (error) {
        console.error('[PublicacionCard] ❌ Error loading tags:', error);
        throw error;
      }

      console.log('[PublicacionCard] 📊 Raw ACCEPTED tags data from database:', data);

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

      console.log('[PublicacionCard] ✅ Processed ACCEPTED tags:', tags.length);
      setExistingTags(tags);
    } catch (error) {
      console.error('[PublicacionCard] Error loading tags:', error);
      setExistingTags([]);
    } finally {
      setLoadingTags(false);
    }
  }, [post.id]);

  const handleManageTags = useCallback(() => {
    loadExistingTags();
    setShowTagManagementModal(true);
  }, [loadExistingTags]);

  const handleRemoveTag = useCallback(async (taggedUser: TaggableUser) => {
    try {
      console.log('[PublicacionCard] 🗑️ Removing tag permanently:', {
        postId: post.id,
        userId: taggedUser.id,
        tipo: taggedUser.tipo,
      });

      const deleteData: any = {
        post_id: post.id,
        tipo: taggedUser.tipo,
        estado: 'aceptado',
      };

      if (taggedUser.tipo === 'usuario') {
        deleteData.usuario_id = taggedUser.id;
      } else {
        deleteData.local_id = taggedUser.id;
      }

      console.log('[PublicacionCard] 🔍 Delete query data:', deleteData);

      const { error } = await supabase
        .from('post_tags')
        .delete()
        .match(deleteData);

      if (error) {
        console.error('[PublicacionCard] ❌ Error deleting tag:', error);
        throw error;
      }

      console.log('[PublicacionCard] ✅ Tag deleted successfully from database');

      await loadExistingTags();
      await loadTaggedUsers();
      
      if (onUpdate) {
        onUpdate();
      }

      Alert.alert('Éxito', 'Etiqueta eliminada correctamente');
    } catch (error) {
      console.error('[PublicacionCard] ❌ Error removing tag:', error);
      Alert.alert('Error', 'No se pudo eliminar la etiqueta. Por favor, intenta de nuevo.');
    }
  }, [post.id, loadExistingTags, loadTaggedUsers, onUpdate]);

  const handleAddNewTag = useCallback(async (selectedUser: TaggableUser) => {
    if (!user) return;

    try {
      console.log('[PublicacionCard] ➕ Adding new tag:', {
        postId: post.id,
        userId: selectedUser.id,
        tipo: selectedUser.tipo,
      });

      const tagData: any = {
        post_id: post.id,
        tipo: selectedUser.tipo,
        estado: 'pendiente',
        tagged_by_user_id: user.id,
        imagen_index: 0,
        position_x: 0.5,
        position_y: 0.5,
      };

      if (selectedUser.tipo === 'usuario') {
        tagData.usuario_id = selectedUser.id;
      } else {
        tagData.local_id = selectedUser.id;
      }

      const { error: tagError } = await supabase
        .from('post_tags')
        .insert(tagData);

      if (tagError) throw tagError;

      console.log('[PublicacionCard] ✅ Tag request created');
      
      // ✅ FIXED: Send notification to tagged user
      if (selectedUser.tipo === 'usuario') {
        await supabase.from('notificaciones').insert({
          usuario_id: selectedUser.id,
          tipo: 'tag_request',
          titulo: 'Solicitud de etiqueta',
          mensaje: `${user.nombre} quiere etiquetarte en una publicación`,
          usuario_origen_id: user.id,
          post_id: post.id,
        });
        console.log('[PublicacionCard] ✅ Tag notification sent to user:', selectedUser.nombre);
      }

      await loadExistingTags();
      await loadTaggedUsers();
      
      if (onUpdate) {
        onUpdate();
      }

      Alert.alert('Éxito', 'Solicitud de etiqueta enviada. El usuario debe aprobarla.');
    } catch (error) {
      console.error('[PublicacionCard] Error adding tag:', error);
      Alert.alert('Error', 'No se pudo añadir la etiqueta');
    }
  }, [user, post.id, loadExistingTags, loadTaggedUsers, onUpdate]);

  const showOptions = useCallback(() => {
    const canEdit = user && (
      (post.tipo === 'usuario' && post.autor_id === user.id) ||
      (post.tipo === 'local' && interactionLocalId === post.local_id)
    );

    if (!canEdit) return;

    const options = ['Editar descripción', 'Gestionar etiquetas', 'Eliminar publicación', 'Cancelar'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 3,
          destructiveButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            handleEditDescription();
          } else if (buttonIndex === 1) {
            handleManageTags();
          } else if (buttonIndex === 2) {
            handleDeletePost();
          }
        }
      );
    } else {
      Alert.alert(
        'Opciones',
        '',
        [
          {
            text: 'Editar descripción',
            onPress: handleEditDescription,
          },
          {
            text: 'Gestionar etiquetas',
            onPress: handleManageTags,
          },
          {
            text: 'Eliminar publicación',
            style: 'destructive',
            onPress: handleDeletePost,
          },
          {
            text: 'Cancelar',
            style: 'cancel',
          },
        ]
      );
    }
  }, [user, post, interactionLocalId, handleDeletePost, handleEditDescription, handleManageTags]);

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

  const handleCommentsUpdate = () => {
    setCommentsCount(prev => prev + 1);
    if (onUpdate) {
      onUpdate();
    }
  };

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
                      size={12}
                      color={colors.textSecondary}
                    />
                  </View>
                )}
                <Text style={styles.taggedUserName} numberOfLines={1}>
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
            size={40}
            nombre={displayName}
            userId={post.tipo === 'usuario' ? post.autor_id : undefined}
            localId={post.tipo === 'local' ? post.local_id : undefined}
            showMomentoBorder={true}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.username}>{displayName}</Text>
            <Text style={styles.timestamp}>{formatTimeAgo(post.created_at)}</Text>
          </View>
        </TouchableOpacity>
        {canEdit && (
          <TouchableOpacity style={styles.optionsButton} onPress={showOptions} activeOpacity={0.7}>
            <IconSymbol ios_icon_name="ellipsis" android_material_icon_name="more_vert" size={24} color={colors.text} />
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
                      size={100}
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
              size={26}
              color={liked ? "#EF4444" : colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleComment} activeOpacity={0.7}>
            <IconSymbol
              ios_icon_name="message"
              android_material_icon_name="chat_bubble_outline"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleShare} activeOpacity={0.7}>
            <IconSymbol
              ios_icon_name="paperplane"
              android_material_icon_name="send"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={handleSave} activeOpacity={0.7}>
          <IconSymbol
            ios_icon_name={saved ? "bookmark.fill" : "bookmark"}
            android_material_icon_name={saved ? "bookmark" : "bookmark_border"}
            size={24}
            color={saved ? colors.primary : colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* ✅ UNIFIED: Pass localLikes array for instant reactivity */}
      {likesCount > 0 && (
        <PostLikesAvatars 
          postId={post.id} 
          totalLikes={likesCount}
          localLikes={localLikes}
        />
      )}

      {post.contenido && (
        <View style={styles.contentContainer}>
          <ParsedText text={post.contenido} style={styles.content} />
        </View>
      )}

      {/* ✅ ADDED: Comment count display with proper text */}
      <TouchableOpacity 
        style={styles.commentsContainer}
        onPress={handleComment}
        activeOpacity={0.7}
      >
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

      <CommentsModal
        visible={commentsModalVisible}
        postId={post.id}
        postAuthorId={post.autor_id}
        onClose={() => setCommentsModalVisible(false)}
        onCommentAdded={handleCommentsUpdate}
      />

      <SharePostModal
        visible={shareModalVisible}
        postId={post.id}
        postContent={post.contenido}
        postImage={post.imagenes && post.imagenes.length > 0 ? post.imagenes[0] : undefined}
        postAuthorName={displayName}
        postAuthorAvatar={displayAvatar}
        onClose={() => setShareModalVisible(false)}
      />

      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editModalOverlay}
        >
          <TouchableOpacity 
            style={styles.editModalBackdrop}
            activeOpacity={1}
            onPress={() => setEditModalVisible(false)}
          />
          <View style={styles.editModalContent}>
            <View style={styles.editModalHeader}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.editModalCancel}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.editModalTitle}>Editar descripción</Text>
              <TouchableOpacity onPress={handleSaveEdit} disabled={savingEdit}>
                <Text style={[styles.editModalSave, savingEdit && styles.editModalSaveDisabled]}>
                  {savingEdit ? 'Guardando...' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.editModalInput}
              value={editedDescription}
              onChangeText={setEditedDescription}
              placeholder="Escribe una descripción..."
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={2200}
              autoFocus
              editable={!savingEdit}
            />
            <Text style={styles.editModalCounter}>
              {editedDescription.length}/2200
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showTagManagementModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTagManagementModal(false)}
      >
        <View style={styles.tagManagementOverlay}>
          <TouchableOpacity 
            style={styles.tagManagementBackdrop}
            activeOpacity={1}
            onPress={() => setShowTagManagementModal(false)}
          />
          <View style={styles.tagManagementContent}>
            <View style={styles.tagManagementHeader}>
              <Text style={styles.tagManagementTitle}>Gestionar etiquetas</Text>
              <TouchableOpacity onPress={() => setShowTagManagementModal(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {loadingTags ? (
              <View style={styles.tagManagementLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Cargando etiquetas...</Text>
              </View>
            ) : (
              <ScrollView style={styles.tagManagementScroll}>
                {existingTags.length > 0 ? (
                  <View style={styles.tagManagementList}>
                    <Text style={styles.tagManagementSectionTitle}>Etiquetados ({existingTags.length})</Text>
                    {existingTags.map((tag) => (
                      <View key={`${tag.id}-${tag.tipo}`} style={styles.tagManagementItem}>
                        {tag.avatar ? (
                          <Image source={{ uri: tag.avatar }} style={styles.tagManagementAvatar} />
                        ) : (
                          <View style={[styles.tagManagementAvatar, styles.tagManagementAvatarPlaceholder]}>
                            <IconSymbol 
                              ios_icon_name={tag.tipo === 'local' ? 'building.2.fill' : 'person.fill'}
                              android_material_icon_name={tag.tipo === 'local' ? 'business' : 'person'}
                              size={20} 
                              color={colors.textSecondary} 
                            />
                          </View>
                        )}
                        <View style={styles.tagManagementInfo}>
                          <Text style={styles.tagManagementName}>{tag.nombre}</Text>
                          <Text style={styles.tagManagementType}>
                            {tag.tipo === 'local' ? 'Local' : `@${tag.username}`}
                          </Text>
                        </View>
                        <TouchableOpacity 
                          onPress={() => handleRemoveTag(tag)}
                          style={styles.tagManagementRemoveButton}
                        >
                          <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.tagManagementEmpty}>
                    <IconSymbol ios_icon_name="person.crop.circle.badge.plus" android_material_icon_name="person_add" size={48} color={colors.textSecondary} />
                    <Text style={styles.tagManagementEmptyText}>No hay etiquetas</Text>
                  </View>
                )}
              </ScrollView>
            )}

            <TouchableOpacity 
              style={styles.tagManagementAddButton}
              onPress={() => {
                setShowTagManagementModal(false);
                setTimeout(() => {
                  setShowTagModal(true);
                }, 300);
              }}
            >
              <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={20} color={colors.white} />
              <Text style={styles.tagManagementAddButtonText}>Añadir etiqueta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TaggingModalV5
        visible={showTagModal}
        onClose={() => setShowTagModal(false)}
        onSelectUser={handleAddNewTag}
        alreadyTagged={existingTags}
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
    fontSize: 13,
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
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 13,
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
    fontSize: 15,
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
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  commentsTextEmpty: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  editModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  editModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  editModalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '80%',
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  editModalCancel: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  editModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  editModalSave: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  editModalSaveDisabled: {
    opacity: 0.5,
  },
  editModalInput: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
    minHeight: 150,
    maxHeight: 400,
    textAlignVertical: 'top',
  },
  editModalCounter: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  tagManagementOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  tagManagementBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  tagManagementContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '80%',
  },
  tagManagementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tagManagementTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  tagManagementLoading: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  tagManagementScroll: {
    maxHeight: 400,
  },
  tagManagementList: {
    padding: 16,
  },
  tagManagementSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  tagManagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    marginBottom: 8,
  },
  tagManagementAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  tagManagementAvatarPlaceholder: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagManagementInfo: {
    flex: 1,
  },
  tagManagementName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  tagManagementType: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  tagManagementRemoveButton: {
    padding: 8,
  },
  tagManagementEmpty: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  tagManagementEmptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 12,
  },
  tagManagementAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  tagManagementAddButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
});
