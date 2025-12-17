
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
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useInteractionContext } from '@/hooks/useInteractionContext';
import { LinearGradient } from 'expo-linear-gradient';
import ParsedText from '@/components/social/ParsedText';
import CommentsModal from '@/components/social/CommentsModal';
import { SOCIAL_ICONS } from '@/constants/SocialIcons';
import { useRouter } from 'expo-router';
import TaggingModalV5, { TaggableUser } from './TaggingModalV5';
import ImageTaggingOverlay from './ImageTaggingOverlay';
import TagDisplay from './TagDisplay';

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
  initialPostId: string;
  allPostIds: string[];
  onClose: () => void;
  onPostChange?: (postId: string) => void;
}

/**
 * ✅ POST VIEWER MODAL v4.0 - WITH 3-DOT MENU & SEE MORE
 * 
 * Key changes:
 * - ✅ Added 3-dot menu for edit/delete/tag options
 * - ✅ Only shows menu if user owns the post
 * - ✅ Tagging mode for adding tags to images
 * - ✅ Delete post functionality
 * - ✅ "See more" for long descriptions (>150 chars)
 * - ✅ Tag display on images
 */

export default function PostViewerModal({
  visible,
  initialPostId,
  allPostIds,
  onClose,
  onPostChange,
}: PostViewerModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { interactionUserId, interactionLocalId, isInteractingAsLocal } = useInteractionContext();
  const flatListRef = useRef<FlatList>(null);
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [currentPostId, setCurrentPostId] = useState(initialPostId);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // ✅ NEW: Expanded descriptions tracking
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  
  // ✅ NEW: Tagging mode state
  const [taggingMode, setTaggingMode] = useState(false);
  const [taggingPostId, setTaggingPostId] = useState<string | null>(null);
  const [showTagsOnImage, setShowTagsOnImage] = useState(true);

  useEffect(() => {
    if (visible) {
      console.log('[PostViewerModal v4.0] Props received:', { 
        visible, 
        initialPostId, 
        allPostIds: allPostIds ? `array(${allPostIds.length})` : allPostIds,
        allPostIdsType: typeof allPostIds,
        allPostIdsIsArray: Array.isArray(allPostIds)
      });
      
      if (!allPostIds || !Array.isArray(allPostIds) || allPostIds.length === 0) {
        console.error('[PostViewerModal v4.0] ❌ Invalid allPostIds - cannot load posts');
        console.error('[PostViewerModal v4.0] allPostIds value:', allPostIds);
        setLoading(false);
        setPosts([]);
        return;
      }
    }
  }, [visible, allPostIds, initialPostId]);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!allPostIds || !Array.isArray(allPostIds) || allPostIds.length === 0) {
        console.error('[PostViewerModal v4.0] Invalid allPostIds in loadPosts:', allPostIds);
        setPosts([]);
        setLoading(false);
        return;
      }
      
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
        console.error('[PostViewerModal v4.0] Error loading posts:', error);
        Alert.alert('Error', 'No se pudieron cargar las publicaciones');
        setPosts([]);
        setLoading(false);
        return;
      }

      if (!data || !Array.isArray(data)) {
        console.error('[PostViewerModal v4.0] Invalid data received:', data);
        setPosts([]);
        setLoading(false);
        return;
      }

      if (data.length === 0) {
        console.warn('[PostViewerModal v4.0] No posts found for IDs:', allPostIds);
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
          };
        })
      );

      const sortedPosts = allPostIds
        .map(id => enrichedPosts.find(p => p.id === id))
        .filter(Boolean) as Post[];

      if (!sortedPosts || sortedPosts.length === 0) {
        console.warn('[PostViewerModal v4.0] No valid posts after sorting');
        setPosts([]);
        setLoading(false);
        return;
      }

      setPosts(sortedPosts);
      
      const initialIdx = sortedPosts.findIndex(p => p.id === initialPostId);
      if (initialIdx !== -1) {
        setCurrentIndex(initialIdx);
        setCurrentPostId(initialPostId);
      }
    } catch (error) {
      console.error('[PostViewerModal v4.0] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar las publicaciones');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [allPostIds, initialPostId, user, interactionUserId, interactionLocalId, isInteractingAsLocal]);

  useEffect(() => {
    if (visible && allPostIds && Array.isArray(allPostIds) && allPostIds.length > 0) {
      loadPosts();
    }
  }, [visible, loadPosts, allPostIds]);

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

  const toggleLike = async (post: Post) => {
    if (!interactionUserId) {
      Alert.alert('Inicia sesión', 'Para dar me gusta necesitas registrarte en BarLive');
      return;
    }

    const isLiked = post.liked;
    const currentLikes = post.likes || 0;

    setPosts(prevPosts =>
      prevPosts.map(p =>
        p.id === post.id
          ? { ...p, liked: !isLiked, likes: isLiked ? currentLikes - 1 : currentLikes + 1 }
          : p
      )
    );

    try {
      if (isLiked) {
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
        if (deleteError) throw deleteError;

        const newLikesCount = Math.max(0, currentLikes - 1);
        await supabase.from('posts').update({ likes: newLikesCount }).eq('id', post.id);
      } else {
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

        const { error: insertError } = await supabase.from('likes').insert(likeData);
        if (insertError) throw insertError;

        const newLikesCount = currentLikes + 1;
        await supabase.from('posts').update({ likes: newLikesCount }).eq('id', post.id);
      }
    } catch (error) {
      console.error('[PostViewerModal] Error toggling like:', error);
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p.id === post.id
            ? { ...p, liked: isLiked, likes: currentLikes }
            : p
        )
      );
      Alert.alert('Error', 'No se pudo actualizar el me gusta');
    }
  };

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
    } catch (error) {
      console.error('[PostViewerModal] Error toggling save:', error);
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p.id === post.id ? { ...p, saved: isSaved } : p
        )
      );
      Alert.alert('Error', 'No se pudo guardar la publicación');
    }
  };

  // ✅ NEW: Handle 3-dot menu
  const handlePostOptions = (post: Post) => {
    const isOwner = user && (
      (post.tipo === 'usuario' && post.autor_id === user.id) ||
      (post.tipo === 'local' && interactionLocalId === post.local_id)
    );

    if (!isOwner) return;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancelar', 'Editar', 'Eliminar', 'Añadir etiquetas'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            Alert.alert('Próximamente', 'La edición de publicaciones estará disponible pronto');
          } else if (buttonIndex === 2) {
            handleDeletePost(post);
          } else if (buttonIndex === 3) {
            handleAddTags(post);
          }
        }
      );
    } else {
      Alert.alert(
        'Opciones de publicación',
        '',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Editar', onPress: () => Alert.alert('Próximamente', 'La edición de publicaciones estará disponible pronto') },
          { 
            text: 'Eliminar', 
            style: 'destructive',
            onPress: () => handleDeletePost(post),
          },
          { text: 'Añadir etiquetas', onPress: () => handleAddTags(post) },
        ]
      );
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
                { text: 'OK', onPress: () => onClose() },
              ]);
            } catch (error) {
              console.error('[PostViewerModal] Error deleting post:', error);
              Alert.alert('Error', 'No se pudo eliminar la publicación');
            }
          },
        },
      ]
    );
  };

  const handleAddTags = (post: Post) => {
    setTaggingPostId(post.id);
    setTaggingMode(true);
    setShowTagsOnImage(false);
  };

  const handleTagAdded = () => {
    setTaggingMode(false);
    setTaggingPostId(null);
    setShowTagsOnImage(true);
    loadPosts();
  };

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

    // ✅ NEW: Check if description needs "see more"
    const description = post.contenido || '';
    const isExpanded = expandedPosts.has(post.id);
    const needsExpansion = description.length > 150;
    const displayDescription = needsExpansion && !isExpanded 
      ? description.substring(0, 150) + '...' 
      : description;

    return (
      <View style={styles.postContainer}>
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
            {post.autorAvatar ? (
              <Image source={{ uri: post.autorAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {post.autorNombre?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <Text style={styles.authorName}>{post.autorNombre}</Text>
          </TouchableOpacity>
          {/* ✅ NEW: 3-dot menu for owner */}
          {isOwner && (
            <TouchableOpacity 
              style={styles.optionsButton}
              onPress={() => handlePostOptions(post)}
            >
              <IconSymbol ios_icon_name="ellipsis" android_material_icon_name="more_vert" size={24} color={colors.headerText} />
            </TouchableOpacity>
          )}
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
                <View key={index} style={styles.imageWrapper}>
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                  {/* ✅ NEW: Show tags on image if not in tagging mode */}
                  {showTagsOnImage && !taggingMode && (
                    <TagDisplay
                      postId={post.id}
                      imageIndex={index}
                      imageWidth={width}
                      imageHeight={width}
                      visible={true}
                    />
                  )}
                  {/* ✅ NEW: Tagging overlay if in tagging mode */}
                  {taggingMode && taggingPostId === post.id && (
                    <ImageTaggingOverlay
                      postId={post.id}
                      imageIndex={index}
                      imageWidth={width}
                      imageHeight={width}
                      onTagAdded={handleTagAdded}
                    />
                  )}
                </View>
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
              <IconSymbol
                ios_icon_name={post.liked ? 'heart.fill' : 'heart'}
                android_material_icon_name={post.liked ? 'favorite' : 'favorite_border'}
                size={28}
                color={post.liked ? '#EF4444' : colors.headerText}
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                setCurrentPostId(post.id);
                setCommentsModalVisible(true);
              }}
            >
              <IconSymbol
                ios_icon_name={SOCIAL_ICONS.COMMENT.ios}
                android_material_icon_name={SOCIAL_ICONS.COMMENT.android}
                size={26}
                color={colors.headerText}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <IconSymbol ios_icon_name="paperplane" android_material_icon_name="send" size={28} color={colors.headerText} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.actionButton} onPress={() => toggleSave(post)}>
            <IconSymbol
              ios_icon_name={post.saved ? 'bookmark.fill' : 'bookmark'}
              android_material_icon_name={post.saved ? 'bookmark' : 'bookmark_border'}
              size={28}
              color={post.saved ? colors.primary : colors.headerText}
            />
          </TouchableOpacity>
        </View>

        {/* ✅ NEW: Likes count */}
        {post.likes > 0 && (
          <View style={styles.likesContainer}>
            <Text style={styles.likesText}>
              <Text style={styles.likesBold}>{post.likes}</Text> Me gusta
            </Text>
          </View>
        )}

        {/* ✅ UPDATED: Content with "see more" functionality */}
        {description && (
          <View style={styles.postContent}>
            <Text style={styles.postText}>
              <Text style={styles.authorBold}>{post.autorNombre}</Text>{' '}
              <ParsedText text={displayDescription} style={styles.postText} />
            </Text>
            {needsExpansion && (
              <TouchableOpacity onPress={() => toggleExpanded(post.id)}>
                <Text style={styles.seeMoreText}>
                  {isExpanded ? 'Ver menos' : 'Ver más'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ✅ NEW: Comments count */}
        {post.comentarios > 0 && (
          <TouchableOpacity 
            style={styles.commentsContainer}
            onPress={() => {
              setCurrentPostId(post.id);
              setCommentsModalVisible(true);
            }}
          >
            <Text style={styles.commentsText}>
              Ver {post.comentarios === 1 ? 'el comentario' : `los ${post.comentarios} comentarios`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Time ago */}
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>
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

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={28} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Publicaciones</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay publicaciones</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={handleViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            initialScrollIndex={currentIndex}
            getItemLayout={(data, index) => ({
              length: SCREEN_HEIGHT,
              offset: SCREEN_HEIGHT * index,
              index,
            })}
          />
        )}

        {/* ✅ NEW: Comments Modal */}
        {currentPostId && (
          <CommentsModal
            visible={commentsModalVisible}
            postId={currentPostId}
            postAuthorId={posts.find(p => p.id === currentPostId)?.autor_id || ''}
            onClose={() => setCommentsModalVisible(false)}
            onCommentAdded={() => {
              loadPosts();
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
    backgroundColor: '#000',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
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
    fontSize: 18,
    fontWeight: '700',
    color: colors.headerText,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.headerText,
  },
  postContainer: {
    height: SCREEN_HEIGHT - 100,
    backgroundColor: '#000',
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
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.headerText,
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
    backgroundColor: '#1a1a1a',
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
  likesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  likesText: {
    fontSize: 14,
    color: colors.headerText,
  },
  likesBold: {
    fontWeight: '700',
  },
  postContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  postText: {
    fontSize: 14,
    color: colors.headerText,
    lineHeight: 18,
  },
  authorBold: {
    fontWeight: '600',
    color: colors.headerText,
  },
  seeMoreText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
    fontWeight: '600',
  },
  commentsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  commentsText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  timeContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  timeText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
  },
});
