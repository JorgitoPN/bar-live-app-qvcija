
import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions, Modal, Pressable, Alert } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Post } from '@/types';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import ParsedText from './ParsedText';

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
      source={{ uri }} 
      style={styles.imagen} 
      resizeMode="cover"
      fadeDuration={0}
      progressiveRenderingEnabled={true}
      cache="force-cache"
    />
  </TouchableOpacity>
));

PostImage.displayName = 'PostImage';

const PublicacionCard = memo(function PublicacionCard({ post, onLike, onComment, onShare }: PublicacionCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  
  const [liked, setLiked] = useState(post?.liked || false);
  const [saved, setSaved] = useState(post?.saved || false);
  const [likesCount, setLikesCount] = useState(post?.likes || 0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [mentionedUsers, setMentionedUsers] = useState<MentionedUser[]>([]);
  const [taggedUsers, setTaggedUsers] = useState<TaggedUser[]>([]);
  const [showTagsOverlay, setShowTagsOverlay] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleLike = useCallback(async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para dar me gusta');
      return;
    }

    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount(newLiked ? likesCount + 1 : likesCount - 1);

    try {
      if (newLiked) {
        await supabase.from('likes').insert({
          post_id: post.id,
          usuario_id: user.id,
        });
      } else {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('usuario_id', user.id);
      }
    } catch (error) {
      console.error('[PublicacionCard] Error toggling like:', error);
      setLiked(!newLiked);
      setLikesCount(newLiked ? likesCount : likesCount + 1);
    }

    if (onLike) onLike();
  }, [liked, likesCount, onLike, user, post.id]);

  const handleSave = useCallback(async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para guardar publicaciones');
      return;
    }

    const newSaved = !saved;
    setSaved(newSaved);

    try {
      if (newSaved) {
        await supabase.from('posts_guardados').insert({
          post_id: post.id,
          usuario_id: user.id,
        });
        Alert.alert('Guardado', 'Publicación guardada en favoritos');
      } else {
        await supabase
          .from('posts_guardados')
          .delete()
          .eq('post_id', post.id)
          .eq('usuario_id', user.id);
        Alert.alert('Eliminado', 'Publicación eliminada de favoritos');
      }
    } catch (error) {
      console.error('[PublicacionCard] Error toggling save:', error);
      setSaved(!newSaved);
      Alert.alert('Error', 'No se pudo guardar la publicación');
    }
  }, [saved, user, post.id]);

  const handleComment = useCallback(() => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para comentar');
      return;
    }
    router.push(`/social/comentar?postId=${post.id}`);
    if (onComment) onComment();
  }, [user, router, post.id, onComment]);

  const handleShare = useCallback(async () => {
    if (!user) {
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
        sharePostAuthor: post.autorNombre || 'Usuario',
      }
    });
    
    if (onShare) onShare();
  }, [user, router, post, onShare]);

  const handleDelete = useCallback(async () => {
    if (!user) return;

    const isAuthor = post.tipo === 'usuario' 
      ? post.autorId === user.id 
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

  if (!post) {
    console.error('[PublicacionCard] Post is undefined, skipping render');
    return null;
  }

  const images = post.imagenes && post.imagenes.length > 0 
    ? post.imagenes 
    : post.imagen 
      ? [post.imagen] 
      : [];

  const displayName = post?.autorNombre || 'Usuario';
  const avatarUrl = post?.autorAvatar || null;
  const displayDate = post?.fecha ? formatearFecha(post.fecha) : post?.created_at ? formatearFecha(post.created_at) : 'Fecha desconocida';
  const isAuthor = user && post.tipo === 'usuario' && post.autorId === user.id;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => {
          if (post?.tipo === 'local' && post?.localId) {
            router.push(`/perfil/local?localId=${post.localId}`);
          } else if (post?.autorId) {
            router.push(`/perfil/usuario?userId=${post.autorId}`);
          }
        }}
        activeOpacity={0.7}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={24} color={colors.textSecondary} />
          </View>
        )}
        <View style={styles.headerContent}>
          <Text style={styles.autorNombre}>{displayName}</Text>
          <Text style={styles.fecha}>{displayDate}</Text>
        </View>
        {isAuthor ? (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.7}>
            <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={22} color={colors.error} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

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
                  <Image source={{ uri: taggedUser.avatar }} style={styles.taggedAvatarImage} />
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
            <View style={styles.imageIndicatorContainer}>
              {images.map((_, index) => (
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

      {post?.ubicacion && (
        <View style={styles.locationContainer}>
          <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={16} color={colors.primary} />
          <Text style={styles.locationText}>{post.ubicacion}</Text>
        </View>
      )}

      <View style={styles.acciones}>
        <TouchableOpacity style={styles.accionButton} onPress={handleLike} activeOpacity={0.7}>
          <IconSymbol
            ios_icon_name={liked ? 'heart.fill' : 'heart'}
            android_material_icon_name={liked ? 'favorite' : 'favorite_border'}
            size={26}
            color={liked ? '#EF4444' : colors.text}
          />
          <Text style={[styles.accionText, liked && styles.accionTextLiked]}>
            {likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.accionButton} onPress={handleComment} activeOpacity={0.7}>
          <IconSymbol ios_icon_name="bubble.left" android_material_icon_name="chat_bubble_outline" size={26} color={colors.text} />
          <Text style={styles.accionText}>{post?.comentarios || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.accionButton} onPress={handleShare} activeOpacity={0.7}>
          <IconSymbol ios_icon_name="paperplane" android_material_icon_name="send" size={26} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.accionButton} onPress={handleSave} activeOpacity={0.7}>
          <IconSymbol 
            ios_icon_name={saved ? 'bookmark.fill' : 'bookmark'} 
            android_material_icon_name={saved ? 'bookmark' : 'bookmark_border'} 
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
              source={{ uri: images[currentImageIndex] }} 
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
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.cardBorder,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
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
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  accionTextLiked: {
    color: '#EF4444',
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
