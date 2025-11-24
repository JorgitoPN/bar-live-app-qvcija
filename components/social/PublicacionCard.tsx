
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions, Modal, Pressable, Animated, Alert, ActionSheetIOS, Platform } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Post } from '@/types';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import ParsedText from './ParsedText';
import PostLikesAvatars from './PostLikesAvatars';

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

export default function PublicacionCard({ post, onLike, onComment, onShare }: PublicacionCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.liked || false);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [mentionedUsers, setMentionedUsers] = useState<MentionedUser[]>([]);
  const [taggedUsers, setTaggedUsers] = useState<TaggedUser[]>([]);
  const [showTagsOverlay, setShowTagsOverlay] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const likeAnimation = useRef(new Animated.Value(1)).current;
  const doubleTapRef = useRef<NodeJS.Timeout | null>(null);

  const images = post.imagenes && post.imagenes.length > 0 
    ? post.imagenes 
    : post.imagen 
      ? [post.imagen] 
      : [];

  useEffect(() => {
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
  }, [post.id]);

  useEffect(() => {
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
  }, [post.id]);

  const handleLike = () => {
    Animated.sequence([
      Animated.timing(likeAnimation, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(likeAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
    if (onLike) onLike();
  };

  const handleDoubleTap = () => {
    if (doubleTapRef.current) {
      clearTimeout(doubleTapRef.current);
      doubleTapRef.current = null;
      
      if (!liked) {
        handleLike();
      }
    } else {
      doubleTapRef.current = setTimeout(() => {
        doubleTapRef.current = null;
      }, 300);
    }
  };

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha);
    const ahora = new Date();
    const diff = ahora.getTime() - date.getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 1) return 'Ahora';
    if (minutos < 60) return `${minutos}m`;
    if (horas < 24) return `${horas}h`;
    if (dias < 7) return `${dias}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setCurrentImageIndex(index);
  };

  const handleImagePress = () => {
    if (taggedUsers.length > 0) {
      setShowTagsOverlay(true);
    } else {
      router.push(`/social/post?id=${post.id}`);
    }
  };

  const navigateToProfile = (user: MentionedUser | TaggedUser, tipo?: 'usuario' | 'local') => {
    const userType = tipo || (user as MentionedUser).tipo || 'usuario';
    if (userType === 'local') {
      router.push(`/perfil/local?localId=${user.id}`);
    } else {
      router.push(`/perfil/usuario?userId=${user.id}`);
    }
  };

  const handleMorePress = () => {
    const isOwner = user && post.autorId === user.id;
    
    if (Platform.OS === 'ios') {
      const options = isOwner 
        ? ['Eliminar', 'Editar', 'Compartir', 'Cancelar']
        : ['Reportar', 'No me interesa', 'Compartir', 'Cancelar'];
      
      const destructiveButtonIndex = 0;
      const cancelButtonIndex = options.length - 1;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex,
          cancelButtonIndex,
        },
        (buttonIndex) => {
          if (isOwner) {
            if (buttonIndex === 0) handleDeletePost();
            else if (buttonIndex === 1) handleEditPost();
            else if (buttonIndex === 2) handleSharePost();
          } else {
            if (buttonIndex === 0) handleReportPost();
            else if (buttonIndex === 1) handleNotInterested();
            else if (buttonIndex === 2) handleSharePost();
          }
        }
      );
    } else {
      setShowOptionsModal(true);
    }
  };

  const handleDeletePost = async () => {
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
              Alert.alert('Éxito', 'Publicación eliminada correctamente');
            } catch (error) {
              console.error('[PublicacionCard] Error deleting post:', error);
              Alert.alert('Error', 'No se pudo eliminar la publicación');
            }
          },
        },
      ]
    );
  };

  const handleEditPost = () => {
    router.push(`/crear/publicacion?editId=${post.id}`);
  };

  const handleSharePost = () => {
    router.push(`/social/post?id=${post.id}&share=true`);
  };

  const handleReportPost = () => {
    Alert.alert(
      'Reportar publicación',
      '¿Por qué quieres reportar esta publicación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Spam', onPress: () => submitReport('spam') },
        { text: 'Contenido inapropiado', onPress: () => submitReport('inappropriate') },
        { text: 'Acoso', onPress: () => submitReport('harassment') },
      ]
    );
  };

  const submitReport = async (reason: string) => {
    try {
      const { error } = await supabase
        .from('reportes')
        .insert({
          tipo: 'post',
          contenido_id: post.id,
          usuario_id: user?.id,
          razon: reason,
        });

      if (error) throw error;
      Alert.alert('Gracias', 'Tu reporte ha sido enviado');
    } catch (error) {
      console.error('[PublicacionCard] Error reporting post:', error);
      Alert.alert('Error', 'No se pudo enviar el reporte');
    }
  };

  const handleNotInterested = async () => {
    try {
      const { error } = await supabase
        .from('contenido_oculto')
        .insert({
          usuario_id: user?.id,
          tipo: 'post',
          contenido_id: post.id,
        });

      if (error) throw error;
      Alert.alert('Listo', 'No verás más publicaciones como esta');
    } catch (error) {
      console.error('[PublicacionCard] Error hiding post:', error);
      Alert.alert('Error', 'No se pudo ocultar la publicación');
    }
  };

  const displayUsername = post.tipo === 'local' 
    ? post.autorNombre
    : post.autor?.username || post.autorNombre;

  const isOwner = user && post.autorId === user.id;

  return (
    <View style={styles.card}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => {
          if (post.tipo === 'local' && post.localId) {
            router.push(`/perfil/local?localId=${post.localId}`);
          } else if (user && post.autorId === user.id) {
            router.push('/(tabs)/perfil');
          } else {
            router.push(`/perfil/usuario?userId=${post.autorId}`);
          }
        }}
        activeOpacity={0.7}
      >
        {post.autorAvatar ? (
          <Image source={{ uri: post.autorAvatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>
              {post.autorNombre?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        <View style={styles.headerContent}>
          <Text style={styles.autorNombre}>{displayUsername}</Text>
          {post.ubicacion && (
            <Text style={styles.ubicacion} numberOfLines={1}>{post.ubicacion}</Text>
          )}
        </View>
        <TouchableOpacity 
          style={styles.moreButton} 
          onPress={handleMorePress}
          activeOpacity={0.7}
        >
          <IconSymbol ios_icon_name="ellipsis" android_material_icon_name="more_vert" size={20} color={colors.text} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Images */}
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
          >
            {images.map((imageUrl, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={1}
                onPress={handleDoubleTap}
                style={styles.imageContainer}
              >
                <Image 
                  source={{ uri: imageUrl }} 
                  style={styles.imagen} 
                  resizeMode="cover" 
                />
                {taggedUsers.length > 0 && index === 0 && (
                  <TouchableOpacity 
                    style={styles.tagIconBadge}
                    onPress={(e) => {
                      e.stopPropagation();
                      setShowTagsOverlay(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <IconSymbol ios_icon_name="person.crop.circle" android_material_icon_name="person" size={14} color={colors.headerText} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
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
        </View>
      )}

      {/* Actions */}
      <View style={styles.acciones}>
        <View style={styles.accionesLeft}>
          <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
            <TouchableOpacity style={styles.accionButton} onPress={handleLike} activeOpacity={0.7}>
              <IconSymbol
                ios_icon_name={liked ? 'heart.fill' : 'heart'}
                android_material_icon_name={liked ? 'favorite' : 'favorite_border'}
                size={27}
                color={liked ? '#EF4444' : colors.text}
              />
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={styles.accionButton} onPress={() => router.push(`/social/post?id=${post.id}`)} activeOpacity={0.7}>
            <IconSymbol ios_icon_name="bubble.left" android_material_icon_name="chat_bubble_outline" size={26} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.accionButton} onPress={() => router.push(`/social/post?id=${post.id}&share=true`)} activeOpacity={0.7}>
            <IconSymbol ios_icon_name="paperplane" android_material_icon_name="send" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.accionButton} activeOpacity={0.7}>
          <IconSymbol ios_icon_name="bookmark" android_material_icon_name="bookmark_border" size={26} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Likes */}
      {likesCount > 0 && (
        <View style={styles.likesContainer}>
          <PostLikesAvatars postId={post.id} likesCount={likesCount} />
        </View>
      )}

      {/* Content */}
      {post.contenido && (
        <View style={styles.contenidoContainer}>
          <Text style={styles.contenido}>
            <Text style={styles.autorNombreBold}>{displayUsername}</Text>{' '}
            <ParsedText text={post.contenido} style={styles.contenidoText} />
          </Text>
        </View>
      )}

      {/* Comments preview */}
      {post.comentarios > 0 && (
        <TouchableOpacity
          style={styles.comentariosPreview}
          onPress={() => router.push(`/social/post?id=${post.id}`)}
          activeOpacity={0.7}
        >
          <Text style={styles.comentariosText}>
            Ver {post.comentarios === 1 ? 'el comentario' : `los ${post.comentarios} comentarios`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Timestamp */}
      <View style={styles.timestampContainer}>
        <Text style={styles.timestamp}>{formatearFecha(post.fecha)}</Text>
      </View>

      {/* Mentions */}
      {mentionedUsers.length > 0 && (
        <View style={styles.mentionsContainer}>
          <Text style={styles.mentionsText}>
            Con{' '}
            {mentionedUsers.slice(0, 2).map((user, index) => (
              <React.Fragment key={user.id}>
                {index > 0 && ', '}
                <Text
                  style={styles.mentionedUsername}
                  onPress={() => navigateToProfile(user)}
                >
                  {user.username || user.nombre}
                </Text>
              </React.Fragment>
            ))}
            {mentionedUsers.length > 2 && (
              <Text style={styles.mentionsText}> y {mentionedUsers.length - 2} más</Text>
            )}
          </Text>
        </View>
      )}

      {/* Tags Modal */}
      <Modal
        visible={showTagsOverlay}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTagsOverlay(false)}
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
            {taggedUsers.map((user) => {
              if (user.position_x !== undefined && user.position_y !== undefined) {
                return (
                  <TouchableOpacity
                    key={user.id}
                    style={[
                      styles.tagMarker,
                      {
                        left: `${user.position_x * 100}%`,
                        top: `${user.position_y * 100}%`,
                      },
                    ]}
                    onPress={(e) => {
                      e.stopPropagation();
                      setShowTagsOverlay(false);
                      navigateToProfile(user, 'usuario');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.tagMarkerDot} />
                    <View style={styles.tagMarkerLabel}>
                      <Text style={styles.tagMarkerText}>
                        {user.username || user.nombre}
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

      {/* Options Modal (Android) */}
      {Platform.OS === 'android' && (
        <Modal
          visible={showOptionsModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowOptionsModal(false)}
        >
          <Pressable 
            style={styles.optionsModalOverlay}
            onPress={() => setShowOptionsModal(false)}
          >
            <Pressable style={styles.optionsModalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.optionsModalHeader}>
                <Text style={styles.optionsModalTitle}>Opciones</Text>
                <TouchableOpacity onPress={() => setShowOptionsModal(false)}>
                  <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              
              {isOwner ? (
                <React.Fragment>
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={() => {
                      setShowOptionsModal(false);
                      handleDeletePost();
                    }}
                  >
                    <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={24} color="#EF4444" />
                    <Text style={[styles.optionButtonText, { color: '#EF4444' }]}>Eliminar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={() => {
                      setShowOptionsModal(false);
                      handleEditPost();
                    }}
                  >
                    <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={24} color={colors.text} />
                    <Text style={styles.optionButtonText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={() => {
                      setShowOptionsModal(false);
                      handleSharePost();
                    }}
                  >
                    <IconSymbol ios_icon_name="square.and.arrow.up" android_material_icon_name="share" size={24} color={colors.text} />
                    <Text style={styles.optionButtonText}>Compartir</Text>
                  </TouchableOpacity>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={() => {
                      setShowOptionsModal(false);
                      handleReportPost();
                    }}
                  >
                    <IconSymbol ios_icon_name="exclamationmark.triangle" android_material_icon_name="report" size={24} color="#EF4444" />
                    <Text style={[styles.optionButtonText, { color: '#EF4444' }]}>Reportar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={() => {
                      setShowOptionsModal(false);
                      handleNotInterested();
                    }}
                  >
                    <IconSymbol ios_icon_name="eye.slash" android_material_icon_name="visibility_off" size={24} color={colors.text} />
                    <Text style={styles.optionButtonText}>No me interesa</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={() => {
                      setShowOptionsModal(false);
                      handleSharePost();
                    }}
                  >
                    <IconSymbol ios_icon_name="square.and.arrow.up" android_material_icon_name="share" size={24} color={colors.text} />
                    <Text style={styles.optionButtonText}>Compartir</Text>
                  </TouchableOpacity>
                </React.Fragment>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    marginBottom: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardBorder,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerContent: {
    flex: 1,
  },
  autorNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  ubicacion: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  moreButton: {
    padding: 4,
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
    position: 'relative',
  },
  imagen: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBorder,
  },
  tagIconBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  imageIndicatorContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  imageIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  imageIndicatorDotActive: {
    backgroundColor: colors.primary,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  acciones: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  accionesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accionButton: {
    padding: 4,
  },
  likesContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  contenidoContainer: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  contenido: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 18,
  },
  autorNombreBold: {
    fontWeight: '600',
    color: colors.text,
  },
  contenidoText: {
    fontSize: 14,
    color: colors.text,
  },
  comentariosPreview: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  comentariosText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  timestampContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  timestamp: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  mentionsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  mentionsText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  mentionedUsername: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
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
  optionsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  optionsModalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },
  optionsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  optionsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  optionButtonText: {
    fontSize: 16,
    color: colors.text,
  },
});
