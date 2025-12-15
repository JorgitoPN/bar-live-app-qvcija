
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
 * ✅ POST VIEWER MODAL v1.1 - INSTAGRAM-LIKE EXPERIENCE WITH FIX
 * 
 * Key features:
 * - ✅ Full-screen modal for viewing posts
 * - ✅ Swipe up/down to navigate between posts
 * - ✅ Comments modal opens without leaving post view
 * - ✅ Like, comment, share, save actions
 * - ✅ Smooth animations and transitions
 * - ✅ Optimized performance with FlatList
 * - ✅ FIXED: Proper null/undefined checks for posts array
 */

export default function PostViewerModal({
  visible,
  initialPostId,
  allPostIds,
  onClose,
  onPostChange,
}: PostViewerModalProps) {
  const { user } = useAuth();
  const { interactionUserId, interactionLocalId, isInteractingAsLocal } = useInteractionContext();
  const flatListRef = useRef<FlatList>(null);
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [currentPostId, setCurrentPostId] = useState(initialPostId);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      
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
        console.error('[PostViewerModal] Error loading posts:', error);
        Alert.alert('Error', 'No se pudieron cargar las publicaciones');
        return;
      }

      // ✅ CRITICAL FIX: Ensure data is an array before processing
      if (!data || !Array.isArray(data)) {
        console.error('[PostViewerModal] Invalid data received:', data);
        setPosts([]);
        return;
      }

      // Load likes and saves for each post
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

      // Sort posts to match allPostIds order
      const sortedPosts = allPostIds
        .map(id => enrichedPosts.find(p => p.id === id))
        .filter(Boolean) as Post[];

      setPosts(sortedPosts);
      
      // Find initial index
      const initialIdx = sortedPosts.findIndex(p => p.id === initialPostId);
      if (initialIdx !== -1) {
        setCurrentIndex(initialIdx);
        setCurrentPostId(initialPostId);
      }
    } catch (error) {
      console.error('[PostViewerModal] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar las publicaciones');
    } finally {
      setLoading(false);
    }
  }, [allPostIds, initialPostId, user, interactionUserId, interactionLocalId, isInteractingAsLocal]);

  useEffect(() => {
    if (visible) {
      loadPosts();
    }
  }, [visible, loadPosts]);

  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
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

    // Optimistic update
    setPosts(prev => prev.map(p => 
      p.id === post.id 
        ? { ...p, liked: !isLiked, likes: isLiked ? currentLikes - 1 : currentLikes + 1 }
        : p
    ));

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
        
        await supabase
          .from('posts')
          .update({ likes: newLikesCount })
          .eq('id', post.id);
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
        
        await supabase
          .from('posts')
          .update({ likes: newLikesCount })
          .eq('id', post.id);
      }
    } catch (error) {
      console.error('[PostViewerModal] Error toggling like:', error);
      // Revert optimistic update
      setPosts(prev => prev.map(p => 
        p.id === post.id 
          ? { ...p, liked: isLiked, likes: currentLikes }
          : p
      ));
      Alert.alert('Error', 'No se pudo actualizar el me gusta');
    }
  };

  const toggleSave = async (post: Post) => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Para guardar publicaciones necesitas registrarte en BarLive');
      return;
    }

    const isSaved = post.saved;

    // Optimistic update
    setPosts(prev => prev.map(p => 
      p.id === post.id 
        ? { ...p, saved: !isSaved }
        : p
    ));

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
      // Revert optimistic update
      setPosts(prev => prev.map(p => 
        p.id === post.id 
          ? { ...p, saved: isSaved }
          : p
      ));
      Alert.alert('Error', 'No se pudo guardar la publicación');
    }
  };

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

  const renderPost = ({ item: post }: { item: Post }) => {
    return (
      <View style={styles.postContainer}>
        {/* Header */}
        <View style={styles.postHeader}>
          <View style={styles.authorInfoRow}>
            {post.autorAvatar ? (
              <Image source={{ uri: post.autorAvatar }} style={styles.postAvatar} />
            ) : (
              <View style={[styles.postAvatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {post.autorNombre?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <Text style={styles.postAutorNombre}>{post.autorNombre}</Text>
          </View>
        </View>

        {/* Image */}
        {post.images && post.images.length > 0 && (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: post.images[0] }} 
              style={styles.postImage} 
              resizeMode="cover" 
            />
          </View>
        )}

        {/* Actions */}
        <View style={styles.postActions}>
          <View style={styles.leftActions}>
            <TouchableOpacity 
              style={styles.postActionButton} 
              onPress={() => toggleLike(post)}
              activeOpacity={0.7}
            >
              <IconSymbol
                name={post.liked ? 'heart.fill' : 'heart'}
                size={28}
                color={post.liked ? '#EF4444' : '#fff'}
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.postActionButton}
              onPress={() => setCommentsModalVisible(true)}
              activeOpacity={0.7}
            >
              <IconSymbol 
                ios_icon_name={SOCIAL_ICONS.COMMENT.ios}
                android_material_icon_name={SOCIAL_ICONS.COMMENT.android}
                size={26} 
                color="#fff" 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.postActionButton} 
              activeOpacity={0.7}
            >
              <IconSymbol name="paperplane" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.postActionButton} 
            onPress={() => toggleSave(post)}
            activeOpacity={0.7}
          >
            <IconSymbol
              name={post.saved ? 'bookmark.fill' : 'bookmark'}
              size={28}
              color={post.saved ? colors.primary : '#fff'}
            />
          </TouchableOpacity>
        </View>

        {/* Likes */}
        {post.likes > 0 && (
          <View style={styles.postLikes}>
            <Text style={styles.postLikesText}>
              <Text style={styles.postLikesBold}>{post.likes}</Text> Me gusta
            </Text>
          </View>
        )}

        {/* Caption */}
        {post.contenido && (
          <View style={styles.postDescripcion}>
            <Text style={styles.postDescripcionText}>
              <Text style={styles.postAutorBold}>{post.autorNombre}</Text>{' '}
              <ParsedText text={post.contenido} style={styles.postDescripcionText} />
            </Text>
          </View>
        )}

        {/* Comments count */}
        {post.comentarios > 0 && (
          <TouchableOpacity 
            style={styles.viewCommentsButton}
            onPress={() => setCommentsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.viewCommentsText}>
              Ver {post.comentarios === 1 ? 'el comentario' : `los ${post.comentarios} comentarios`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Time */}
        <View style={styles.postTimeContainer}>
          <Text style={styles.postTimeText}>{formatTimeAgo(post.created_at)}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <Modal
        visible={visible}
        transparent={false}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Modal>
    );
  }

  // ✅ CRITICAL FIX: Check if posts array is valid before rendering
  if (!posts || posts.length === 0) {
    return (
      <Modal
        visible={visible}
        transparent={false}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.text, marginTop: 16 }}>No hay publicaciones disponibles</Text>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 20 }}>
            <Text style={{ color: colors.primary }}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'transparent']}
          style={styles.header}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol 
              ios_icon_name="xmark" 
              android_material_icon_name="close" 
              size={28} 
              color="#fff" 
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Publicaciones</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        {/* Posts */}
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

        {/* Comments Modal */}
        <CommentsModal
          visible={commentsModalVisible}
          postId={currentPostId}
          postAuthorId={posts[currentIndex]?.autor_id}
          onClose={() => setCommentsModalVisible(false)}
          onCommentAdded={() => {
            // Reload current post to update comment count
            loadPosts();
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
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
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  postContainer: {
    width: width,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  postHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 98,
    left: 0,
    right: 0,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  authorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#fff',
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
  postAutorNombre: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  imageContainer: {
    width: width,
    height: width,
    alignSelf: 'center',
  },
  postImage: {
    width: '100%',
    height: '100%',
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
  postActionButton: {
    padding: 8,
  },
  postLikes: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  postLikesText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#fff',
  },
  postLikesBold: {
    fontWeight: '600',
  },
  postDescripcion: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  postDescripcionText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 18,
  },
  postAutorBold: {
    fontWeight: '600',
    color: '#fff',
  },
  viewCommentsButton: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  viewCommentsText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '400',
  },
  postTimeContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  postTimeText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
  },
});
