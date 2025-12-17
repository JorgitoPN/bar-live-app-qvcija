
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useInteractionContext } from '@/hooks/useInteractionContext';
import CommentsModal from '@/components/social/CommentsModal';
import SharePostModal from '@/components/social/SharePostModal';
import TagDisplay from '@/components/social/TagDisplay';
import ImageTaggingOverlay from '@/components/social/ImageTaggingOverlay';
import ParsedText from '@/components/social/ParsedText';
import PostLikesAvatars from '@/components/social/PostLikesAvatars';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Post {
  id: string;
  contenido: string;
  imagenes: string[];
  tipo: 'usuario' | 'local';
  autor_id?: string;
  local_id?: string;
  created_at: string;
  likes_count: number;
  comentarios_count: number;
  compartidos_count: number;
  usuario?: {
    id: string;
    nombre: string;
    username?: string;
    avatar?: string;
  };
  local?: {
    id: string;
    nombre: string;
    username?: string;
    imagen_url?: string;
  };
}

export default function PostDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { interactionLocalId } = useInteractionContext();
  const postId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<Post | null>(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTagging, setShowTagging] = useState(false);
  const [showTags, setShowTags] = useState(true);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadPost();
    checkLikedStatus();
    checkSavedStatus();
  }, [postId]);

  const loadPost = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          usuario:usuarios!posts_autor_id_fkey(id, nombre, username, avatar),
          local:locales(id, nombre, username, imagen_url)
        `)
        .eq('id', postId)
        .single();

      if (error) throw error;
      setPost(data);
    } catch (error) {
      console.error('[PostDetail] Error loading post:', error);
      Alert.alert('Error', 'No se pudo cargar la publicación');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const checkLikedStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('usuario_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setLiked(!!data);
    } catch (error) {
      console.error('[PostDetail] Error checking liked status:', error);
    }
  };

  const checkSavedStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('guardados')
        .select('id')
        .eq('post_id', postId)
        .eq('usuario_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setSaved(!!data);
    } catch (error) {
      console.error('[PostDetail] Error checking saved status:', error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para dar like');
      return;
    }

    try {
      if (liked) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('usuario_id', user.id);

        setLiked(false);
        if (post) {
          setPost({ ...post, likes_count: post.likes_count - 1 });
        }
      } else {
        await supabase
          .from('likes')
          .insert({
            post_id: postId,
            usuario_id: user.id,
          });

        setLiked(true);
        if (post) {
          setPost({ ...post, likes_count: post.likes_count + 1 });
        }
      }
    } catch (error) {
      console.error('[PostDetail] Error toggling like:', error);
      Alert.alert('Error', 'No se pudo dar like');
    }
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para guardar');
      return;
    }

    try {
      if (saved) {
        await supabase
          .from('guardados')
          .delete()
          .eq('post_id', postId)
          .eq('usuario_id', user.id);

        setSaved(false);
      } else {
        await supabase
          .from('guardados')
          .insert({
            post_id: postId,
            usuario_id: user.id,
          });

        setSaved(true);
      }
    } catch (error) {
      console.error('[PostDetail] Error toggling save:', error);
      Alert.alert('Error', 'No se pudo guardar');
    }
  };

  const handleDeletePost = useCallback(async () => {
    console.log('[PostDetail] Delete post');
    
    if (!user || !post) {
      console.log('[PostDetail] No user or post data');
      return;
    }

    const isOwner = post.tipo === 'usuario' 
      ? post.autor_id === user.id
      : post.tipo === 'local' && interactionLocalId === post.local_id;

    if (!isOwner) {
      Alert.alert('Error', 'Solo puedes eliminar tus propias publicaciones');
      return;
    }

    try {
      console.log('[PostDetail] Deleting post:', post.id);
      
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);

      if (error) {
        console.error('[PostDetail] Error deleting post:', error);
        throw error;
      }

      Alert.alert('Éxito', 'Publicación eliminada correctamente', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('[PostDetail] Error deleting post:', error);
      Alert.alert('Error', 'No se pudo eliminar la publicación');
    }
  }, [user, post, interactionLocalId, router]);

  const handleImageScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setCurrentImageIndex(index);
  };

  const handleAddTags = () => {
    if (!user || !post) return;

    const isOwner = post.tipo === 'usuario' 
      ? post.autor_id === user.id
      : post.tipo === 'local' && interactionLocalId === post.local_id;

    if (!isOwner) {
      Alert.alert('Error', 'Solo el autor puede añadir etiquetas');
      return;
    }

    setShowTagging(true);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Cargando publicación...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>Publicación no encontrada</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const authorName = post.tipo === 'local' && post.local
    ? post.local.nombre
    : post.usuario?.nombre || 'Usuario';

  const authorAvatar = post.tipo === 'local' && post.local
    ? post.local.imagen_url
    : post.usuario?.avatar;

  const isOwner = post.tipo === 'usuario' 
    ? post.autor_id === user?.id
    : post.tipo === 'local' && interactionLocalId === post.local_id;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color={colors.headerText}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Publicación</Text>
        {isOwner && (
          <TouchableOpacity style={styles.headerMenuButton} onPress={handleDeletePost}>
            <IconSymbol
              ios_icon_name="trash"
              android_material_icon_name="delete"
              size={24}
              color={colors.headerText}
            />
          </TouchableOpacity>
        )}
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Author Info */}
        <View style={styles.authorSection}>
          {authorAvatar ? (
            <Image source={{ uri: authorAvatar }} style={styles.authorAvatar} />
          ) : (
            <View style={[styles.authorAvatar, styles.avatarPlaceholder]}>
              <IconSymbol
                ios_icon_name={post.tipo === 'local' ? 'building.2.fill' : 'person.fill'}
                android_material_icon_name={post.tipo === 'local' ? 'business' : 'person'}
                size={24}
                color={colors.textSecondary}
              />
            </View>
          )}
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{authorName}</Text>
            <Text style={styles.postDate}>
              {new Date(post.created_at).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Images */}
        {post.imagenes && post.imagenes.length > 0 && (
          <View style={styles.imagesContainer}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleImageScroll}
              scrollEventThrottle={16}
            >
              {post.imagenes.map((imagen, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: imagen }} style={styles.postImage} />
                  <TagDisplay
                    postId={post.id}
                    imageIndex={index}
                    imageWidth={SCREEN_WIDTH}
                    imageHeight={SCREEN_WIDTH}
                    visible={showTags && currentImageIndex === index}
                  />
                </View>
              ))}
            </ScrollView>

            {post.imagenes.length > 1 && (
              <View style={styles.imageIndicators}>
                {post.imagenes.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicator,
                      currentImageIndex === index && styles.indicatorActive,
                    ]}
                  />
                ))}
              </View>
            )}

            {/* Tag Toggle Button */}
            <TouchableOpacity
              style={styles.tagToggleButton}
              onPress={() => setShowTags(!showTags)}
            >
              <IconSymbol
                ios_icon_name={showTags ? 'person.2.fill' : 'person.2'}
                android_material_icon_name={showTags ? 'people' : 'people_outline'}
                size={20}
                color={colors.headerText}
              />
            </TouchableOpacity>

            {/* Add Tags Button (only for owner) */}
            {isOwner && (
              <TouchableOpacity
                style={styles.addTagButton}
                onPress={handleAddTags}
              >
                <IconSymbol
                  ios_icon_name="plus.circle.fill"
                  android_material_icon_name="add_circle"
                  size={20}
                  color={colors.headerText}
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <View style={styles.actionsLeft}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <IconSymbol
                ios_icon_name={liked ? 'heart.fill' : 'heart'}
                android_material_icon_name={liked ? 'favorite' : 'favorite_border'}
                size={28}
                color={liked ? '#EF4444' : colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowComments(true)}
            >
              <IconSymbol
                ios_icon_name="bubble.right"
                android_material_icon_name="chat_bubble_outline"
                size={28}
                color={colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowShareModal(true)}
            >
              <IconSymbol
                ios_icon_name="paperplane"
                android_material_icon_name="send"
                size={28}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
            <IconSymbol
              ios_icon_name={saved ? 'bookmark.fill' : 'bookmark'}
              android_material_icon_name={saved ? 'bookmark' : 'bookmark_border'}
              size={28}
              color={saved ? colors.primary : colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Likes */}
        {post.likes_count > 0 && (
          <View style={styles.likesContainer}>
            <PostLikesAvatars postId={post.id} likesCount={post.likes_count} />
          </View>
        )}

        {/* Content */}
        {post.contenido && (
          <View style={styles.contentContainer}>
            <ParsedText text={post.contenido} />
          </View>
        )}

        {/* Comments Count */}
        {post.comentarios_count > 0 && (
          <TouchableOpacity
            style={styles.commentsCount}
            onPress={() => setShowComments(true)}
          >
            <Text style={styles.commentsCountText}>
              Ver los {post.comentarios_count} comentarios
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Comments Modal */}
      {showComments && (
        <CommentsModal
          postId={post.id}
          onClose={() => setShowComments(false)}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <SharePostModal
          postId={post.id}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Tagging Overlay */}
      {showTagging && (
        <ImageTaggingOverlay
          postId={post.id}
          images={post.imagenes}
          onClose={() => setShowTagging(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBackButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerMenuButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  postDate: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  imagesContainer: {
    position: 'relative',
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    position: 'relative',
  },
  postImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorActive: {
    backgroundColor: colors.headerText,
  },
  tagToggleButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTagButton: {
    position: 'absolute',
    top: 16,
    right: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionsLeft: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  likesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  commentsCount: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  commentsCountText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.headerText,
  },
});
