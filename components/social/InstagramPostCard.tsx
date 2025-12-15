
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import MiniAvatarWithMomento from '@/components/momento/MiniAvatarWithMomento';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PostViewerModal from './PostViewerModal';
import CommentsModal from './CommentsModal';
import SharePostModal from './SharePostModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Post {
  id: string;
  autor_id: string;
  tipo: 'usuario' | 'local';
  local_id?: string;
  contenido?: string;
  imagenes: string[];
  video_url?: string;
  ubicacion?: string;
  likes_count: number;
  comentarios_count: number;
  guardados_count: number;
  user_has_liked: boolean;
  user_has_saved: boolean;
  created_at: string;
  autor: {
    id: string;
    nombre: string;
    username: string;
    avatar?: string;
  };
  local?: {
    id: string;
    nombre: string;
    imagen_url?: string;
  };
}

interface InstagramPostCardProps {
  post: Post;
  onUpdate?: () => void;
}

export default function InstagramPostCard({
  post,
  onUpdate,
}: InstagramPostCardProps) {
  const { user } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(post.user_has_liked);
  const [isSaved, setIsSaved] = useState(post.user_has_saved);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [commentsCount, setCommentsCount] = useState(post.comentarios_count);
  const [showPostViewer, setShowPostViewer] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  
  // Fetch author data dynamically
  const [authorAvatar, setAuthorAvatar] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string>('Usuario');
  const [loadingAuthor, setLoadingAuthor] = useState(true);

  const isOwner = post.tipo === 'usuario' 
    ? post.autor_id === user?.id
    : false;

  // ✅ NEW: Subscribe to real-time like updates
  useEffect(() => {
    if (!post.id) return;

    console.log('[InstagramPostCard] 🔄 Setting up real-time like subscription for post:', post.id);

    const likesChannel = supabase
      .channel(`post-likes-${post.id}`)
      .on(
        'broadcast',
        { event: 'like_update' },
        (payload) => {
          console.log('[InstagramPostCard] 🔄 Real-time like update received:', payload);
          if (payload.payload.postId === post.id) {
            setLikesCount(payload.payload.likesCount);
            // Only update liked state if it's for the current user
            if (user && payload.payload.userId === user.id) {
              setIsLiked(payload.payload.liked);
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[InstagramPostCard] 🔄 Cleaning up real-time like subscription for post:', post.id);
      supabase.removeChannel(likesChannel);
    };
  }, [post.id, user]);

  // Load author data on mount
  useEffect(() => {
    const loadAuthorData = async () => {
      try {
        if (post.tipo === 'local' && post.local_id) {
          // Fetch local data
          const { data: localData, error } = await supabase
            .from('locales')
            .select('nombre, imagen_url')
            .eq('id', post.local_id)
            .single();

          if (!error && localData) {
            setAuthorName(localData.nombre);
            setAuthorAvatar(localData.imagen_url || null);
          }
        } else if (post.autor_id) {
          // Fetch user data
          const { data: userData, error } = await supabase
            .from('usuarios')
            .select('nombre, avatar, username')
            .eq('id', post.autor_id)
            .single();

          if (!error && userData) {
            setAuthorName(userData.username || userData.nombre);
            setAuthorAvatar(userData.avatar || null);
          }
        }
      } catch (error) {
        console.error('[InstagramPostCard] Error loading author data:', error);
      } finally {
        setLoadingAuthor(false);
      }
    };

    loadAuthorData();
  }, [post.tipo, post.local_id, post.autor_id]);

  const handleProfilePress = () => {
    if (post.tipo === 'local' && post.local_id) {
      router.push(`/perfil/local?localId=${post.local_id}`);
    } else {
      router.push(`/perfil/usuario?userId=${post.autor_id}`);
    }
  };

  const handleImagePress = () => {
    setShowPostViewer(true);
  };

  const handleLike = async () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para dar me gusta');
      return;
    }

    const newLikedState = !isLiked;
    const newLikesCount = newLikedState ? likesCount + 1 : likesCount - 1;
    
    // Optimistic update
    setIsLiked(newLikedState);
    setLikesCount(newLikesCount);

    try {
      if (newLikedState) {
        await supabase.from('likes').insert({
          post_id: post.id,
          usuario_id: user.id,
        });
        
        // Update post likes count
        await supabase
          .from('posts')
          .update({ likes: newLikesCount })
          .eq('id', post.id);
      } else {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('usuario_id', user.id);
        
        // Update post likes count
        await supabase
          .from('posts')
          .update({ likes: newLikesCount })
          .eq('id', post.id);
      }

      // ✅ NEW: Broadcast like update to all subscribers
      await supabase.channel(`post-likes-${post.id}`).send({
        type: 'broadcast',
        event: 'like_update',
        payload: {
          postId: post.id,
          likesCount: newLikesCount,
          liked: newLikedState,
          userId: user.id,
        },
      });

      console.log('[InstagramPostCard] ✅ Like broadcasted successfully');
    } catch (error) {
      console.error('[InstagramPostCard] Error toggling like:', error);
      // Revert optimistic update
      setIsLiked(!newLikedState);
      setLikesCount(newLikedState ? newLikesCount - 1 : newLikesCount + 1);
    }
  };

  const handleComment = () => {
    setShowComments(true);
  };

  const handleShare = () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para compartir publicaciones');
      return;
    }
    setShowShareModal(true);
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para guardar publicaciones');
      return;
    }

    const newSavedState = !isSaved;
    setIsSaved(newSavedState);

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
      console.error('[InstagramPostCard] Error toggling save:', error);
      setIsSaved(!newSavedState);
    }
  };

  const handleDelete = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para eliminar publicaciones');
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
              console.log('[InstagramPostCard] 🗑️ Attempting to delete post:', {
                postId: post.id,
                userId: user.id,
                autorId: post.autor_id,
                isOwner,
              });
              
              // Verify ownership before deletion
              if (post.autor_id !== user.id) {
                console.error('[InstagramPostCard] ❌ User is not the owner of this post');
                Alert.alert('Error', 'No tienes permiso para eliminar esta publicación');
                return;
              }

              // Delete from the posts table
              const { error, data } = await supabase
                .from('posts')
                .delete()
                .eq('id', post.id)
                .eq('autor_id', user.id); // Double-check ownership in query

              if (error) {
                console.error('[InstagramPostCard] ❌ Delete error:', error);
                throw error;
              }

              console.log('[InstagramPostCard] ✅ Post deleted successfully');
              Alert.alert('Éxito', 'Publicación eliminada correctamente');

              // Trigger update callback
              if (onUpdate) {
                onUpdate();
              }
            } catch (error: any) {
              console.error('[InstagramPostCard] ❌ Error deleting post:', error);
              Alert.alert(
                'Error', 
                error.message || 'No se pudo eliminar la publicación. Por favor, intenta de nuevo.'
              );
            }
          },
        },
      ]
    );
  };

  const handleCommentsUpdate = () => {
    setCommentsCount(prev => prev + 1);
    if (onUpdate) {
      onUpdate();
    }
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

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const displayUsername = post.tipo === 'local'
    ? post.local?.nombre
    : (post.autor.username || post.autor.nombre);

  const captionText = post.contenido || '';
  const shouldTruncate = captionText.length > 100;
  const displayCaption = shouldTruncate && !showFullCaption 
    ? captionText.substring(0, 100) + '...' 
    : captionText;

  return (
    <>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.authorInfo} onPress={handleProfilePress}>
            {/* Show avatar with momento border if user has unviewed momentos */}
            <MiniAvatarWithMomento
              userId={post.tipo === 'usuario' ? post.autor_id : undefined}
              localId={post.tipo === 'local' ? post.local_id : undefined}
              imageUrl={authorAvatar || undefined}
              size={40}
              showMomentoBorder={true}
            />
            <View style={styles.authorText}>
              <Text style={styles.authorName}>{displayUsername}</Text>
              {post.ubicacion && (
                <Text style={styles.locationText}>{post.ubicacion}</Text>
              )}
            </View>
          </TouchableOpacity>

          {isOwner && (
            <TouchableOpacity style={styles.moreButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>

        {/* Images */}
        {post.imagenes.length > 0 && (
          <TouchableOpacity 
            style={styles.imagesContainer}
            onPress={handleImagePress}
            activeOpacity={0.95}
          >
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(event) => {
                const index = Math.round(
                  event.nativeEvent.contentOffset.x / SCREEN_WIDTH
                );
                setCurrentImageIndex(index);
              }}
              scrollEventThrottle={16}
            >
              {post.imagenes.map((imagen, index) => (
                <Image
                  key={index}
                  source={{ uri: imagen }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>

            {post.imagenes.length > 1 && (
              <View style={styles.imageIndicator}>
                {post.imagenes.map((_, index) => (
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
          </TouchableOpacity>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <View style={styles.leftActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleLike}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={28}
                color={isLiked ? '#ff3b30' : colors.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleComment}
            >
              <IconSymbol name="bubble.right" size={26} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShare}
            >
              <Ionicons name="paper-plane-outline" size={26} color={colors.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSave}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={26}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Stats & Content */}
        <View style={styles.stats}>
          {likesCount > 0 && (
            <Text style={styles.likesText}>
              <Text style={styles.likesBold}>{formatNumber(likesCount)}</Text> Me gusta
            </Text>
          )}
          
          {/* Caption */}
          {captionText && (
            <View style={styles.captionContainer}>
              <Text style={styles.caption}>
                <Text style={styles.captionUsername}>{displayUsername}</Text>{' '}
                {displayCaption}
              </Text>
              {shouldTruncate && (
                <TouchableOpacity onPress={() => setShowFullCaption(!showFullCaption)}>
                  <Text style={styles.moreText}>
                    {showFullCaption ? 'menos' : 'más'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {commentsCount > 0 && (
            <TouchableOpacity onPress={handleComment}>
              <Text style={styles.commentsText}>
                Ver {commentsCount === 1 ? 'el comentario' : `los ${commentsCount} comentarios`}
              </Text>
            </TouchableOpacity>
          )}
          
          <Text style={styles.timeAgo}>{formatTimeAgo(post.created_at)}</Text>
        </View>
      </View>

      {/* Post Viewer Modal */}
      <PostViewerModal
        visible={showPostViewer}
        post={post}
        onClose={() => setShowPostViewer(false)}
        onUpdate={onUpdate}
      />

      {/* Comments Modal */}
      <CommentsModal
        visible={showComments}
        postId={post.id}
        postAuthorId={post.autor_id}
        onClose={() => setShowComments(false)}
        onCommentAdded={handleCommentsUpdate}
      />

      {/* Share Modal */}
      <SharePostModal
        visible={showShareModal}
        postId={post.id}
        postContent={post.contenido}
        onClose={() => setShowShareModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorText: {
    marginLeft: 10,
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  locationText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  moreButton: {
    padding: 8,
  },
  imagesContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    position: 'relative',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
  },
  stats: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
  },
  likesText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.text,
    marginBottom: 8,
  },
  likesBold: {
    fontWeight: '600',
  },
  captionContainer: {
    marginBottom: 4,
  },
  caption: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 18,
  },
  captionUsername: {
    fontWeight: '600',
    color: colors.text,
  },
  moreText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  commentsText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  timeAgo: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
  },
});
