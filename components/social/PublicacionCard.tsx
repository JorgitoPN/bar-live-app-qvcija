
import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions, Modal, Pressable, Alert } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Post } from '@/types';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useInteractionContext } from '@/hooks/useInteractionContext';
import ParsedText from './ParsedText';
import { SOCIAL_ICONS } from '@/constants/SocialIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PublicacionCardProps {
  post: Post;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
}

interface MentionedUser {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  tipo: 'usuario' | 'local';
}

interface TaggedUser {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  position_x?: number;
  position_y?: number;
}

// Memoized image component to prevent unnecessary re-renders
const PostImage = memo(({ uri, onPress }: { uri: string; onPress: () => void }) => (
  <TouchableOpacity
    activeOpacity={0.95}
    onPress={onPress}
    style={styles.imageContainer}
  >
    <Image 
      source={{ uri: `${uri}?v=${Date.now()}` }} 
      style={styles.imagen} 
      resizeMode="cover"
      fadeDuration={0}
      progressiveRenderingEnabled={true}
      cache="reload"
    />
  </TouchableOpacity>
));

PostImage.displayName = 'PostImage';

const PublicacionCard = memo(function PublicacionCard({ post, onLike, onComment, onShare }: PublicacionCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { interactionUserId, interactionType, interactionLocalId, isInteractingAsLocal } = useInteractionContext();
  
  const [liked, setLiked] = useState(post?.liked || false);
  const [saved, setSaved] = useState(post?.saved || false);
  const [likesCount, setLikesCount] = useState(post?.likes || 0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [mentionedUsers, setMentionedUsers] = useState<MentionedUser[]>([]);
  const [taggedUsers, setTaggedUsers] = useState<TaggedUser[]>([]);
  const [showTagsOverlay, setShowTagsOverlay] = useState(false);
  const [authorData, setAuthorData] = useState<{ nombre: string; avatar: string | null; username?: string } | null>(null);
  const [loadingAuthor, setLoadingAuthor] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  console.log('[PublicacionCard] 🎭 Interaction context:', {
    interactionUserId,
    interactionType,
    interactionLocalId,
    isInteractingAsLocal,
  });

  // Fetch author data
  // ✅ Fixed: Added post to dependencies
  useEffect(() => {
    const fetchAuthorData = async () => {
      if (!post) {
        console.log('[PublicacionCard] No post data, skipping author fetch');
        setLoadingAuthor(false);
        return;
      }

      try {
        console.log('[PublicacionCard] Fetching author data for post:', {
          postId: post.id,
          tipo: post.tipo,
          autorId: post.autorId,
          autor_id: post.autor_id,
          localId: post.localId,
          local_id: post.local_id
        });
        
        // Use correct field names from database
        const actualAutorId = post.autor_id || post.autorId;
        const actualLocalId = post.local_id || post.localId;
        
        if (post.tipo === 'local' && actualLocalId) {
          // Fetch local data
          const { data, error } = await supabase
            .from('locales')
            .select('nombre, imagen_url, logo')
            .eq('id', actualLocalId)
            .single();

          if (error) {
            console.error('[PublicacionCard] Error fetching local:', error);
            setAuthorData({ nombre: 'Local', avatar: null });
          } else if (data) {
            console.log('[PublicacionCard] Local data fetched:', data);
            setAuthorData({ 
              nombre: data.nombre, 
              avatar: data.logo || data.imagen_url 
            });
          }
        } else if (actualAutorId) {
          // Fetch user data
          const { data, error } = await supabase
            .from('usuarios')
            .select('nombre, avatar, username')
            .eq('id', actualAutorId)
            .single();

          if (error) {
            console.error('[PublicacionCard] Error fetching user:', error);
            setAuthorData({ nombre: 'Usuario', avatar: null });
          } else if (data) {
            console.log('[PublicacionCard] User data fetched:', {
              nombre: data.nombre,
              username: data.username,
              hasAvatar: !!data.avatar
            });
            setAuthorData({ 
              nombre: data.nombre || 'Usuario', 
              avatar: data.avatar,
              username: data.username 
            });
          }
        } else {
          console.log('[PublicacionCard] No valid author ID found');
          setAuthorData({ nombre: 'Usuario', avatar: null });
        }
      } catch (error) {
        console.error('[PublicacionCard] Error fetching author:', error);
        setAuthorData({ nombre: 'Usuario', avatar: null });
      } finally {
        setLoadingAuthor(false);
      }
    };

    fetchAuthorData();
  }, [post]);

  // ✅ FIXED: Check if post is liked on mount and when interaction context changes
  useEffect(() => {
    const checkIfLiked = async () => {
      if (!interactionUserId || !post?.id) return;

      try {
        console.log('[PublicacionCard] 🔍 Checking like status:', {
          postId: post.id,
          interactionUserId,
          interactionLocalId,
          isInteractingAsLocal
        });

        // Build query based on interaction context
        let query = supabase
          .from('likes')
          .select('id')
          .eq('post_id', post.id)
          .eq('usuario_id', interactionUserId);

        // If interacting as local, filter by local_id
        if (isInteractingAsLocal && interactionLocalId) {
          query = query.eq('local_id', interactionLocalId);
        } else {
          // If interacting as user, ensure local_id is null
          query = query.is('local_id', null);
        }

        const { data, error } = await query.maybeSingle();

        if (!error && data) {
          console.log('[PublicacionCard] ✅ Post is liked');
          setLiked(true);
        } else {
          console.log('[PublicacionCard] ❌ Post is not liked');
          setLiked(false);
        }
      } catch (error) {
        console.error('[PublicacionCard] Error checking like status:', error);
      }
    };

    checkIfLiked();
  }, [interactionUserId, interactionLocalId, isInteractingAsLocal, post?.id]);

  useEffect(() => {
    if (!post?.id) {
      console.error('[PublicacionCard] Post ID is undefined, skipping mentions load');
      return;
    }

    const loadMentions = async () => {
      try {
        const { data, error } = await supabase
          .from('post_mentions')
          .select(`
            usuario_id,
            local_id,
            username,
            usuarios:usuario_id(nombre, username, avatar),
            locales:local_id(nombre, imagen_url)
          `)
          .eq('post_id', post.id);

        if (error) {
          console.error('[PublicacionCard] Error loading mentions:', error);
          return;
        }

        const mentions: MentionedUser[] = (data || []).map((m: any) => {
          if (m.usuario_id && m.usuarios) {
            return {
              id: m.usuario_id,
              nombre: m.usuarios.nombre,
              username: m.usuarios.username,
              avatar: m.usuarios.avatar,
              tipo: 'usuario' as const,
            };
          } else if (m.local_id && m.locales) {
            return {
              id: m.local_id,
              nombre: m.locales.nombre,
              username: m.locales.nombre,
              avatar: m.locales.imagen_url,
              tipo: 'local' as const,
            };
          }
          return null;
        }).filter(Boolean);

        setMentionedUsers(mentions);
      } catch (error) {
        console.error('[PublicacionCard] Error loading mentions:', error);
      }
    };

    loadMentions();
  }, [post?.id]);

  useEffect(() => {
    if (!post?.id) {
      console.error('[PublicacionCard] Post ID is undefined, skipping tags load');
      return;
    }

    const loadTags = async () => {
      try {
        const { data, error } = await supabase
          .from('post_tags')
          .select(`
            usuario_id,
            position_x,
            position_y,
            usuarios:usuario_id(nombre, username, avatar)
          `)
          .eq('post_id', post.id)
          .in('estado', ['aceptado', 'pendiente']);

        if (error) {
          console.error('[PublicacionCard] Error loading tags:', error);
          return;
        }

        const tags: TaggedUser[] = (data || []).map((t: any) => ({
          id: t.usuario_id,
          nombre: t.usuarios?.nombre || 'Usuario',
          username: t.usuarios?.username,
          avatar: t.usuarios?.avatar,
          position_x: t.position_x,
          position_y: t.position_y,
        }));

        setTaggedUsers(tags);
      } catch (error) {
        console.error('[PublicacionCard] Error loading tags:', error);
      }
    };

    loadTags();
  }, [post?.id]);

  // ✅ Fixed: Added interactionLocalId and interactionType to dependencies
  const handleLike = useCallback(async () => {
    console.log('[PublicacionCard] handleLike - Interaction context:', {
      interactionUserId,
      interactionType,
      interactionLocalId,
      isInteractingAsLocal,
    });
    
    if (!interactionUserId) {
      Alert.alert('Error', 'Debes iniciar sesión para dar me gusta');
      return;
    }

    const newLiked = !liked;
    const previousLikesCount = likesCount;
    
    // Optimistic update
    setLiked(newLiked);
    setLikesCount(newLiked ? likesCount + 1 : Math.max(0, likesCount - 1));

    try {
      if (newLiked) {
        // ✅ FIXED: Insert like with local_id if interacting as local
        const likeData: any = {
          post_id: post.id,
          usuario_id: interactionUserId,
        };

        if (isInteractingAsLocal && interactionLocalId) {
          likeData.local_id = interactionLocalId;
          likeData.tipo = 'local';
          console.log('[PublicacionCard] 🏢 Adding like as local:', interactionLocalId);
        } else {
          likeData.tipo = 'usuario';
          console.log('[PublicacionCard] 👤 Adding like as user');
        }

        const { error: insertError } = await supabase
          .from('likes')
          .insert(likeData);
        
        if (insertError) {
          console.error('[PublicacionCard] Error inserting like:', insertError);
          throw insertError;
        }
        
        console.log('[PublicacionCard] ✅ Like added successfully');
      } else {
        // ✅ FIXED: Delete like with correct filters
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

        const { error: deleteError } = await deleteQuery;
        
        if (deleteError) {
          console.error('[PublicacionCard] Error deleting like:', deleteError);
          throw deleteError;
        }
        
        console.log('[PublicacionCard] ✅ Like removed successfully');
      }

      // ✅ FIXED: Update post likes count in database
      const { error: updateError } = await supabase
        .from('posts')
        .update({ likes: newLiked ? previousLikesCount + 1 : Math.max(0, previousLikesCount - 1) })
        .eq('id', post.id);

      if (updateError) {
        console.error('[PublicacionCard] Error updating post likes count:', updateError);
      }
    } catch (error) {
      console.error('[PublicacionCard] Error toggling like:', error);
      // Revert optimistic update
      setLiked(!newLiked);
      setLikesCount(previousLikesCount);
      Alert.alert('Error', 'No se pudo actualizar el me gusta');
    }

    if (onLike) onLike();
  }, [liked, likesCount, onLike, interactionUserId, interactionType, interactionLocalId, isInteractingAsLocal, post.id]);

  // ✅ Fixed: Added interactionLocalId and interactionType to dependencies
  const handleSave = useCallback(async () => {
    console.log('[PublicacionCard] handleSave - Interaction context:', {
      interactionUserId,
      interactionType,
      interactionLocalId,
    });
    
    if (!interactionUserId) {
      Alert.alert('Error', 'Debes iniciar sesión para guardar publicaciones');
      return;
    }

    const newSaved = !saved;
    setSaved(newSaved);

    try {
      if (newSaved) {
        await supabase.from('posts_guardados').insert({
          post_id: post.id,
          usuario_id: interactionUserId,
        });
        Alert.alert('Guardado', 'Publicación guardada en favoritos');
      } else {
        await supabase
          .from('posts_guardados')
          .delete()
          .eq('post_id', post.id)
          .eq('usuario_id', interactionUserId);
        Alert.alert('Eliminado', 'Publicación eliminada de favoritos');
      }
    } catch (error) {
      console.error('[PublicacionCard] Error toggling save:', error);
      setSaved(!newSaved);
      Alert.alert('Error', 'No se pudo guardar la publicación');
    }
  }, [saved, interactionUserId, interactionLocalId, interactionType, post.id]);

  // ✅ Fixed: Added interactionLocalId and interactionType to dependencies
  const handleComment = useCallback(() => {
    console.log('[PublicacionCard] handleComment - Interaction context:', {
      interactionUserId,
      interactionType,
      interactionLocalId,
    });
    
    if (!interactionUserId) {
      Alert.alert('Error', 'Debes iniciar sesión para comentar');
      return;
    }
    router.push(`/social/comentar?postId=${post.id}`);
    if (onComment) onComment();
  }, [interactionUserId, interactionLocalId, interactionType, router, post.id, onComment]);

  const handleShare = useCallback(async () => {
    console.log('[PublicacionCard] handleShare - Interaction context:', {
      interactionUserId,
      interactionType,
      interactionLocalId,
    });
    
    if (!interactionUserId) {
      Alert.alert('Error', 'Debes iniciar sesión para compartir');
      return;
    }
    
    // Get the first image from the post
    const postImage = post.imagenes && post.imagenes.length > 0 
      ? post.imagenes[0] 
      : post.imagen || null;
    
    // Navigate to new chat with post data
    router.push({
      pathname: '/chat/nuevo-chat',
      params: { 
        sharePostId: post.id,
        sharePostImage: postImage || '',
        sharePostAuthor: authorData?.nombre || 'Usuario',
      }
    });
    
    if (onShare) onShare();
  }, [interactionUserId, router, post, onShare, authorData]);

  const handleDelete = useCallback(async () => {
    console.log('[PublicacionCard] handleDelete - User:', user?.id, 'Post autor:', post.autor_id || post.autorId);
    
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para eliminar publicaciones');
      return;
    }

    const actualAutorId = post.autor_id || post.autorId;
    const isAuthor = post.tipo === 'usuario' 
      ? actualAutorId === user.id 
      : false;

    if (!isAuthor) {
      Alert.alert('Error', 'No tienes permisos para eliminar esta publicación');
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
              const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', post.id);

              if (error) throw error;

              Alert.alert('Éxito', 'Publicación eliminada');
              if (onLike) onLike();
            } catch (error) {
              console.error('[PublicacionCard] Error deleting post:', error);
              Alert.alert('Error', 'No se pudo eliminar la publicación');
            }
          },
        },
      ]
    );
  }, [user, post, onLike]);

  const formatearFecha = useCallback((fecha: string) => {
    try {
      const date = new Date(fecha);
      const ahora = new Date();
      const diff = ahora.getTime() - date.getTime();
      const minutos = Math.floor(diff / 60000);
      const horas = Math.floor(diff / 3600000);
      const dias = Math.floor(diff / 86400000);

      if (minutos < 1) return 'Ahora';
      if (minutos < 60) return `Hace ${minutos}m`;
      if (horas < 24) return `Hace ${horas}h`;
      if (dias < 7) return `Hace ${dias}d`;
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch (error) {
      console.error('[PublicacionCard] Error formatting date:', error);
      return 'Fecha desconocida';
    }
  }, []);

  const handleScroll = useCallback((event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setCurrentImageIndex(index);
  }, []);

  const handleImagePress = useCallback(() => {
    if (taggedUsers.length > 0) {
      setShowTagsOverlay(true);
    } else {
      router.push(`/social/post?id=${post?.id || ''}`);
    }
  }, [taggedUsers.length, router, post?.id]);

  const navigateToProfile = useCallback((user: MentionedUser | TaggedUser, tipo?: 'usuario' | 'local') => {
    const userType = tipo || (user as MentionedUser).tipo || 'usuario';
    if (userType === 'local') {
      router.push(`/perfil/local?localId=${user.id}`);
    } else {
      router.push(`/perfil/usuario?userId=${user.id}`);
    }
  }, [router]);

  if (!post) {
    console.error('[PublicacionCard] Post is undefined, skipping render');
    return null;
  }

  const images = post.imagenes && post.imagenes.length > 0 
    ? post.imagenes 
    : post.imagen 
      ? [post.imagen] 
      : [];

  // Use fetched author data with username fallback
  const displayName = loadingAuthor 
    ? 'Cargando...' 
    : authorData?.username 
      ? `@${authorData.username}` 
      : authorData?.nombre || 'Usuario';
  
  const avatarUrl = authorData?.avatar || null;
  const displayDate = post?.fecha ? formatearFecha(post.fecha) : post?.created_at ? formatearFecha(post.created_at) : 'Fecha desconocida';
  const actualAutorId = post.autor_id || post.autorId;
  const isAuthor = user && post.tipo === 'usuario' && actualAutorId === user.id;
  const actualLocalId = post.local_id || post.localId;

  console.log('[PublicacionCard] Rendering with:', {
    displayName,
    hasAvatar: !!avatarUrl,
    isAuthor,
    loadingAuthor,
    userId: user?.id,
    postAutorId: actualAutorId,
    liked,
    likesCount
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerTouchable}
          onPress={() => {
            if (post?.tipo === 'local' && actualLocalId) {
              router.push(`/perfil/local?localId=${actualLocalId}`);
            } else if (actualAutorId) {
              router.push(`/perfil/usuario?userId=${actualAutorId}`);
            }
          }}
          activeOpacity={0.7}
        >
          {avatarUrl ? (
            <Image source={{ uri: `${avatarUrl}?v=${Date.now()}` }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={28} color="#FF6B6B" />
            </View>
          )}
          <View style={styles.headerContent}>
            <Text style={styles.autorNombre}>{displayName}</Text>
            <Text style={styles.fecha}>{displayDate}</Text>
          </View>
        </TouchableOpacity>
        {isAuthor && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.7}>
            <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={20} color="#000" />
          </TouchableOpacity>
        )}
      </View>

      {mentionedUsers.length > 0 && (
        <View style={styles.mentionsContainer}>
          <Text style={styles.mentionsText}>
            Con{' '}
            {mentionedUsers.slice(0, 3).map((user, index) => (
              <React.Fragment key={user.id}>
                {index > 0 && ', '}
                <Text
                  style={styles.mentionedUsername}
                  onPress={() => navigateToProfile(user)}
                >
                  {user.tipo === 'local' 
                    ? user.nombre 
                    : user.username 
                      ? user.username.replace(/^@/, '')
                      : user.nombre}
                </Text>
              </React.Fragment>
            ))}
            {mentionedUsers.length > 3 && (
              <Text style={styles.mentionsText}> y {mentionedUsers.length - 3} más</Text>
            )}
          </Text>
        </View>
      )}

      {taggedUsers.length > 0 && (
        <View style={styles.taggedContainer}>
          <View style={styles.taggedAvatarsRow}>
            {taggedUsers.slice(0, 2).map((taggedUser, index) => (
              <TouchableOpacity
                key={taggedUser.id}
                style={[styles.taggedMiniAvatar, index > 0 && styles.taggedMiniAvatarOverlap]}
                onPress={() => navigateToProfile(taggedUser, 'usuario')}
                activeOpacity={0.7}
              >
                {taggedUser.avatar ? (
                  <Image source={{ uri: `${taggedUser.avatar}?v=${Date.now()}` }} style={styles.taggedAvatarImage} />
                ) : (
                  <View style={styles.taggedAvatarPlaceholder}>
                    <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={14} color={colors.textSecondary} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.taggedText}>
            Etiquetado{' '}
            {taggedUsers.slice(0, 2).map((taggedUser, index) => (
              <React.Fragment key={taggedUser.id}>
                {index > 0 && ' y '}
                <Text
                  style={styles.taggedUsername}
                  onPress={() => navigateToProfile(taggedUser, 'usuario')}
                >
                  {taggedUser.username ? taggedUser.username.replace(/^@/, '') : taggedUser.nombre}
                </Text>
              </React.Fragment>
            ))}
            {taggedUsers.length > 2 && (
              <Text style={styles.taggedText}> y {taggedUsers.length - 2} más</Text>
            )}
          </Text>
        </View>
      )}

      {post?.contenido && (
        <View style={styles.contenidoContainer}>
          <ParsedText text={post.contenido} style={styles.contenido} />
        </View>
      )}

      {images.length > 0 && (
        <View style={styles.imageCarouselContainer}>
          <ScrollView
            ref={scrollViewRef}
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
            removeClippedSubviews={true}
          >
            {images.map((imageUrl, index) => (
              <PostImage
                key={index}
                uri={imageUrl}
                onPress={handleImagePress}
              />
            ))}
          </ScrollView>

          {images.length > 1 && (
            <View style={styles.imageCountBadge}>
              <Text style={styles.imageCountText}>
                {currentImageIndex + 1}/{images.length}
              </Text>
            </View>
          )}
        </View>
      )}

      {post?.ubicacion && (
        <View style={styles.locationContainer}>
          <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={16} color={colors.primary} />
          <Text style={styles.locationText}>{post.ubicacion}</Text>
        </View>
      )}

      <View style={styles.acciones}>
        <TouchableOpacity style={styles.accionButton} onPress={handleLike} activeOpacity={0.7}>
          <IconSymbol
            ios_icon_name={liked ? SOCIAL_ICONS.LIKE.iosFilled : SOCIAL_ICONS.LIKE.ios}
            android_material_icon_name={liked ? SOCIAL_ICONS.LIKE.androidFilled : SOCIAL_ICONS.LIKE.android}
            size={26}
            color={liked ? '#EF4444' : colors.text}
          />
          <Text style={[styles.accionText, liked && styles.accionTextLiked]}>
            {likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.accionButton} onPress={handleComment} activeOpacity={0.7}>
          <IconSymbol 
            ios_icon_name={SOCIAL_ICONS.COMMENT.ios} 
            android_material_icon_name={SOCIAL_ICONS.COMMENT.android} 
            size={26} 
            color={colors.text} 
          />
          <Text style={styles.accionText}>{post?.comentarios || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.accionButton} onPress={handleShare} activeOpacity={0.7}>
          <IconSymbol 
            ios_icon_name={SOCIAL_ICONS.SHARE.ios} 
            android_material_icon_name={SOCIAL_ICONS.SHARE.android} 
            size={26} 
            color={colors.text} 
          />
        </TouchableOpacity>

        <View style={styles.spacer} />

        <TouchableOpacity style={styles.accionButton} onPress={handleSave} activeOpacity={0.7}>
          <IconSymbol 
            ios_icon_name={saved ? SOCIAL_ICONS.SAVE.iosFilled : SOCIAL_ICONS.SAVE.ios} 
            android_material_icon_name={saved ? SOCIAL_ICONS.SAVE.androidFilled : SOCIAL_ICONS.SAVE.android} 
            size={26} 
            color={saved ? colors.primary : colors.text} 
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showTagsOverlay}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTagsOverlay(false)}
        hardwareAccelerated={true}
      >
        <Pressable 
          style={styles.tagsOverlay}
          onPress={() => setShowTagsOverlay(false)}
        >
          <View style={styles.tagsImageContainer}>
            <Image 
              source={{ uri: `${images[currentImageIndex]}?v=${Date.now()}` }} 
              style={styles.tagsImage} 
              resizeMode="contain" 
            />
            {taggedUsers.map((taggedUser) => {
              if (taggedUser.position_x !== undefined && taggedUser.position_y !== undefined) {
                return (
                  <TouchableOpacity
                    key={taggedUser.id}
                    style={[
                      styles.tagMarker,
                      {
                        left: `${taggedUser.position_x * 100}%`,
                        top: `${taggedUser.position_y * 100}%`,
                      },
                    ]}
                    onPress={(e) => {
                      e.stopPropagation();
                      setShowTagsOverlay(false);
                      navigateToProfile(taggedUser, 'usuario');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.tagMarkerDot} />
                    <View style={styles.tagMarkerLabel}>
                      <Text style={styles.tagMarkerText}>
                        {taggedUser.username ? taggedUser.username.replace(/^@/, '') : taggedUser.nombre}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }
              return null;
            })}
          </View>
          <TouchableOpacity 
            style={styles.closeTagsButton}
            onPress={() => setShowTagsOverlay(false)}
            activeOpacity={0.7}
          >
            <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={32} color={colors.headerText} />
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    marginBottom: 0,
    paddingBottom: 16,
    borderRadius: 0,
    marginHorizontal: 0,
    marginTop: 0,
    borderBottomWidth: 8,
    borderBottomColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    backgroundColor: colors.cardBackground,
  },
  headerTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.cardBorder,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  autorNombre: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  fecha: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 3,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 20,
  },
  mentionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  mentionsText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  mentionedUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  taggedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  taggedAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taggedMiniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.cardBackground,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  taggedMiniAvatarOverlap: {
    marginLeft: -10,
  },
  taggedAvatarImage: {
    width: '100%',
    height: '100%',
  },
  taggedAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taggedText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  taggedUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  contenidoContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  contenido: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  imageCarouselContainer: {
    position: 'relative',
    borderRadius: 0,
    overflow: 'hidden',
    marginHorizontal: 0,
    marginBottom: 12,
  },
  imageCarousel: {
    width: SCREEN_WIDTH,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    position: 'relative',
  },
  imagen: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBorder,
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  acciones: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 20,
  },
  accionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accionText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  accionTextLiked: {
    color: '#EF4444',
  },
  spacer: {
    flex: 1,
  },
  tagsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    position: 'relative',
  },
  tagsImage: {
    width: '100%',
    height: '100%',
  },
  tagMarker: {
    position: 'absolute',
    alignItems: 'center',
  },
  tagMarkerDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.headerText,
  },
  tagMarkerLabel: {
    marginTop: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagMarkerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.headerText,
  },
  closeTagsButton: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
});

export default PublicacionCard;
