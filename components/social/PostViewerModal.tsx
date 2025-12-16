
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
 * ✅ POST VIEWER MODAL v2.0 - UNIFIED WHITE BACKGROUND DESIGN
 * 
 * Key changes:
 * - ✅ WHITE background (#fff) to match post detail page
 * - ✅ BarLive blue gradient header
 * - ✅ Same design as profile grid post detail
 * - ✅ Consistent styling across all post detail pages
 * - ✅ Proper validation and error handling
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

  useEffect(() => {
    if (visible) {
      console.log('[PostViewerModal v2.0] Props received:', { 
        visible, 
        initialPostId, 
        allPostIds: allPostIds ? `array(${allPostIds.length})` : allPostIds,
        allPostIdsType: typeof allPostIds,
        allPostIdsIsArray: Array.isArray(allPostIds)
      });
      
      if (!allPostIds || !Array.isArray(allPostIds) || allPostIds.length === 0) {
        console.error('[PostViewerModal v2.0] ❌ Invalid allPostIds - cannot load posts');
        console.error('[PostViewerModal v2.0] allPostIds value:', allPostIds);
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
        console.error('[PostViewerModal v2.0] Invalid allPostIds in loadPosts:', allPostIds);
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
        console.error('[PostViewerModal v2.0] Error loading posts:', error);
        Alert.alert('Error', 'No se pudieron cargar las publicaciones');
        setPosts([]);
        setLoading(false);
        return;
      }

      if (!data || !Array.isArray(data)) {
        console.error('[PostViewerModal v2.0] Invalid data received:', data);
        setPosts([]);
        setLoading(false);
        return;
      }

      if (data.length === 0) {
        console.warn('[PostViewerModal v2.0] No posts found for IDs:', allPostIds);
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
        console.warn('[PostViewerModal v2.0] No valid posts after sorting');
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
      console.error('[PostViewerModal v2.0] Error:', error);
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

    setPosts(prev => {
      if (!prev || !Array.isArray(prev)) return [];
      return prev.map(p => 
        p.id === post.id 
          ? { ...p, liked: !isLiked, likes: isLiked ? currentLikes - 1 : currentLikes + 1 }
          : p
      );
    });

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
      console.error('[PostViewerModal v2.0] Error toggling like:', error);
      setPosts(prev => {
        if (!prev || !Array.isArray(prev)) return [];
        return prev.map(p => 
          p.id === post.id 
            ? { ...p, liked: isLiked, likes: currentLikes }
            : p
        );
      });
      Alert.alert('Error', 'No se pudo actualizar el me gusta');
    }
  };

  const toggleSave = async (post: Post) => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Para guardar publicaciones necesitas registrarte en BarLive');
      return;
    }

    const isSaved = post.saved;

    setPosts(prev => {
      if (!prev || !Array.isArray(prev)) return [];
      return prev.map(p => 
        p.id === post.id 
          ? { ...p, saved: !isSaved }
          : p
      );
    });

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
      console.error('[PostViewerModal v2.0] Error toggling save:', error);
      setPosts(prev => {
        if (!prev || !Array.isArray(prev)) return [];
        return prev.map(p => 
          p.id === post.id 
            ? { ...p, saved: isSaved }
            : p
        );
      });
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
      <ScrollView 
        style={styles.postScrollView}
        contentContainerStyle={styles.postScrollContent}
        showsVerticalScrollIndicator={false}
      >
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

          {/* Image Carousel */}
          {post.images && post.images.length > 0 && (
            <View style={styles.imageCarouselContainer}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={(event) => {
                  const index = Math.round(
                    event.nativeEvent.contentOffset.x / width
                  );
                  setCurrentImageIndex(index);
                }}
                scrollEventThrottle={16}
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
              
              {post.images.length > 1 && (
                <View style={styles.imageIndicatorContainer}>
                  {post.images.map((_: string, index: number) => (
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
                  color={post.liked ? '#EF4444' : '#000'}
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
                  color="#000" 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.postActionButton} 
                activeOpacity={0.7}
              >
                <IconSymbol name="paperplane" size={28} color="#000" />
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
                color={post.saved ? colors.primary : '#000'}
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
      </ScrollView>
    );
  };

  if (!visible) return null;

  if (!allPostIds || !Array.isArray(allPostIds) || allPostIds.length === 0) {
    return (
      <Modal
        visible={visible}
        transparent={false}
        animationType="fade"
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
              <IconSymbol name="chevron.left" size={28} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Publicación</Text>
            <View style={{ width: 40 }} />
          </LinearGradient>
          <View style={styles.loadingContainer}>
            <Text style={{ color: colors.text, marginTop: 16, textAlign: 'center', paddingHorizontal: 20 }}>
              Error: No se proporcionaron publicaciones válidas
            </Text>
            <TouchableOpacity onPress={onClose} style={{ marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}>
              <Text style={{ color: colors.headerText, fontWeight: '600' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (loading) {
    return (
      <Modal
        visible={visible}
        transparent={false}
        animationType="fade"
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
              <IconSymbol name="chevron.left" size={28} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Publicación</Text>
            <View style={{ width: 40 }} />
          </LinearGradient>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </Modal>
    );
  }

  if (!posts || !Array.isArray(posts) || posts.length === 0) {
    return (
      <Modal
        visible={visible}
        transparent={false}
        animationType="fade"
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
              <IconSymbol name="chevron.left" size={28} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Publicación</Text>
            <View style={{ width: 40 }} />
          </LinearGradient>
          <View style={styles.loadingContainer}>
            <Text style={{ color: colors.text, marginTop: 16 }}>No hay publicaciones disponibles</Text>
            <TouchableOpacity onPress={onClose} style={{ marginTop: 20 }}>
              <Text style={{ color: colors.primary }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  const currentPost = posts[currentIndex];
  if (!currentPost) {
    console.error('[PostViewerModal v2.0] Current post not found at index:', currentIndex);
    return (
      <Modal
        visible={visible}
        transparent={false}
        animationType="fade"
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
              <IconSymbol name="chevron.left" size={28} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Publicación</Text>
            <View style={{ width: 40 }} />
          </LinearGradient>
          <View style={styles.loadingContainer}>
            <Text style={{ color: colors.text, marginTop: 16 }}>Error al cargar la publicación</Text>
            <TouchableOpacity onPress={onClose} style={{ marginTop: 20 }}>
              <Text style={{ color: colors.primary }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
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
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
      <View style={styles.container}>
        {/* ✅ BarLive Blue Gradient Header */}
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="chevron.left" size={28} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Publicación</Text>
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
          postAuthorId={currentPost.autor_id}
          onClose={() => setCommentsModalVisible(false)}
          onCommentAdded={() => {
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
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    flex: 1,
    textAlign: 'center',
  },
  postScrollView: {
    flex: 1,
  },
  postScrollContent: {
    paddingBottom: 100,
  },
  postContainer: {
    width: width,
    minHeight: SCREEN_HEIGHT - 100,
    backgroundColor: '#fff',
  },
  postHeader: {
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
    color: '#000',
  },
  imageCarouselContainer: {
    position: 'relative',
    width: width,
    height: width,
  },
  imageCarousel: {
    width: width,
    height: width,
  },
  postImage: {
    width: width,
    height: width,
    backgroundColor: '#f0f0f0',
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  imageIndicatorDotActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 4,
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
    color: '#000',
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
    color: '#000',
    lineHeight: 18,
  },
  postAutorBold: {
    fontWeight: '600',
    color: '#000',
  },
  viewCommentsButton: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  viewCommentsText: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.5)',
    fontWeight: '400',
  },
  postTimeContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  postTimeText: {
    fontSize: 11,
    color: 'rgba(0, 0, 0, 0.4)',
    textTransform: 'uppercase',
  },
});
