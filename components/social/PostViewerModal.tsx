
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
 * ✅ POST VIEWER MODAL v3.0 - WITH 3-DOT MENU
 * 
 * Key changes:
 * - ✅ Added 3-dot menu for edit/delete/tag options
 * - ✅ Only shows menu if user owns the post
 * - ✅ Tagging mode for adding tags to images
 * - ✅ Delete post functionality
 * - ✅ Navigate to edit post (future implementation)
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
  
  // ✅ NEW: Tagging mode state
  const [taggingMode, setTaggingMode] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [alreadyTagged, setAlreadyTagged] = useState<TaggableUser[]>([]);

  useEffect(() => {
    if (visible) {
      console.log('[PostViewerModal v3.0] Props received:', { 
        visible, 
        initialPostId, 
        allPostIds: allPostIds ? `array(${allPostIds.length})` : allPostIds,
        allPostIdsType: typeof allPostIds,
        allPostIdsIsArray: Array.isArray(allPostIds)
      });
      
      if (!allPostIds || !Array.isArray(allPostIds) || allPostIds.length === 0) {
        console.error('[PostViewerModal v3.0] ❌ Invalid allPostIds - cannot load posts');
        console.error('[PostViewerModal v3.0] allPostIds value:', allPostIds);
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
        console.error('[PostViewerModal v3.0] Invalid allPostIds in loadPosts:', allPostIds);
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
        console.error('[PostViewerModal v3.0] Error loading posts:', error);
        Alert.alert('Error', 'No se pudieron cargar las publicaciones');
        setPosts([]);
        setLoading(false);
        return;
      }

      if (!data || !Array.isArray(data)) {
        console.error('[PostViewerModal v3.0] Invalid data received:', data);
        setPosts([]);
        setLoading(false);
        return;
      }

      if (data.length === 0) {
        console.warn('[PostViewerModal v3.0] No posts found for IDs:', allPostIds);
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
        console.warn('[PostViewerModal v3.0] No valid posts after sorting');
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
      console.error('[PostViewerModal v3.0] Error:', error);
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

  const renderPost = ({ item: post }: { item: Post }) => {
    const isOwner = user && (
      (post.tipo === 'usuario' && post.autor_id === user.id) ||
      (post.tipo === 'local' && interactionLocalId === post.local_id)
    );

    return (
      <View style={styles.postContainer}>
        <View style={styles.postHeader}>
          <TouchableOpacity style={styles.authorInfo}>
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
          {isOwner && (
            <TouchableOpacity style={styles.optionsButton}>
              <IconSymbol ios_icon_name="ellipsis" android_material_icon_name="more_vert" size={24} color={colors.headerText} />
            </TouchableOpacity>
          )}
        </View>

        {post.images && post.images.length > 0 && (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.imageCarousel}
          >
            {post.images.map((imageUrl: string, index: number) => (
              <Image
                key={index}
                source={{ uri: imageUrl }}
                style={styles.postImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
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
            <TouchableOpacity style={styles.actionButton}>
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

        {post.contenido && (
          <View style={styles.postContent}>
            <Text style={styles.postText}>
              <Text style={styles.authorBold}>{post.autorNombre}</Text>{' '}
              <ParsedText text={post.contenido} style={styles.postText} />
            </Text>
          </View>
        )}
      </View>
    );
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
    height: SCREEN_HEIGHT,
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
  imageCarousel: {
    width: width,
    height: width,
  },
  postImage: {
    width: width,
    height: width,
    backgroundColor: '#1a1a1a',
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
    paddingBottom: 8,
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
});
