
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions, Modal, Pressable } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Post } from '@/types';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
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

export default function PublicacionCard({ post, onLike, onComment, onShare }: PublicacionCardProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.liked || false);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [mentionedUsers, setMentionedUsers] = useState<MentionedUser[]>([]);
  const [taggedUsers, setTaggedUsers] = useState<TaggedUser[]>([]);
  const [showTagsOverlay, setShowTagsOverlay] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

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
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
    if (onLike) onLike();
  };

  const formatearFecha = (fecha: string) => {
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

  // ✅ Get display username - prioritize username, fallback to nombre for locals
  const getDisplayUsername = (item: { username?: string; nombre: string; tipo?: 'usuario' | 'local' }) => {
    if (item.tipo === 'local') {
      return item.nombre; // Locals use their name as username
    }
    return item.username || item.nombre; // Users should always have username
  };

  // ✅ Get post author username - FIXED to show username instead of full name
  const postAuthorUsername = post.tipo === 'local' 
    ? post.autorNombre // Locals use their name
    : post.autorUsername || post.autorNombre; // Users should have username

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => {
          if (post.tipo === 'local' && post.localId) {
            router.push(`/perfil/local?localId=${post.localId}`);
          } else {
            router.push(`/perfil/usuario?userId=${post.autorId}`);
          }
        }}
      >
        {post.autorAvatar ? (
          <Image source={{ uri: post.autorAvatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <IconSymbol name="person.fill" size={20} color={colors.textSecondary} />
          </View>
        )}
        <View style={styles.headerContent}>
          <Text style={styles.autorNombre}>@{postAuthorUsername}</Text>
          <Text style={styles.fecha}>{formatearFecha(post.fecha)}</Text>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <IconSymbol name="ellipsis" size={20} color={colors.text} />
        </TouchableOpacity>
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
                  @{getDisplayUsername(user)}
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
          <IconSymbol name="person.crop.circle.badge.checkmark" size={16} color={colors.primary} />
          <Text style={styles.taggedText}>
            Foto etiquetada de{' '}
            {taggedUsers.slice(0, 2).map((user, index) => (
              <React.Fragment key={user.id}>
                {index > 0 && ' y '}
                <Text
                  style={styles.taggedUsername}
                  onPress={() => navigateToProfile(user, 'usuario')}
                >
                  @{user.username || user.nombre}
                </Text>
              </React.Fragment>
            ))}
            {taggedUsers.length > 2 && (
              <Text style={styles.taggedText}> y {taggedUsers.length - 2} más</Text>
            )}
          </Text>
        </View>
      )}

      {post.contenido && (
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
          >
            {images.map((imageUrl, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.95}
                onPress={handleImagePress}
                style={styles.imageContainer}
              >
                <Image 
                  source={{ uri: imageUrl }} 
                  style={styles.imagen} 
                  resizeMode="cover" 
                />
                {taggedUsers.length > 0 && (
                  <View style={styles.tagIconBadge}>
                    <IconSymbol name="person.crop.circle" size={20} color={colors.headerText} />
                  </View>
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
          <IconSymbol name="mappin.circle.fill" size={16} color={colors.primary} />
          <Text style={styles.locationText}>{post.ubicacion}</Text>
        </View>
      )}

      <View style={styles.acciones}>
        <TouchableOpacity style={styles.accionButton} onPress={handleLike}>
          <IconSymbol
            name={liked ? 'heart.fill' : 'heart'}
            size={24}
            color={liked ? '#EF4444' : colors.text}
          />
          <Text style={[styles.accionText, liked && styles.accionTextLiked]}>
            {likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.accionButton} onPress={onComment}>
          <IconSymbol name="bubble.left" size={24} color={colors.text} />
          <Text style={styles.accionText}>{post.comentarios}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.accionButton} onPress={onShare}>
          <IconSymbol name="paperplane" size={24} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.accionButton}>
          <IconSymbol name="bookmark" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

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
                        @{user.username || user.nombre}
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
            <IconSymbol name="xmark.circle.fill" size={32} color={colors.headerText} />
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardBorder,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  autorNombre: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  fecha: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  moreButton: {
    padding: 4,
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
  taggedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  taggedText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  taggedUsername: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  contenidoContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  contenido: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
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
  acciones: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 16,
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
