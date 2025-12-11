
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
import MiniAvatarWithMomento from '@/components/momento/MiniAvatarWithMomento';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PostViewerModal from './PostViewerModal';
import CommentsModal from './CommentsModal';
import SharePostModal from './SharePostModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DEFAULT_AVATAR_URL = 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop';

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

interface NewPostCardProps {
  post: Post;
  onUpdate?: () => void;
}

export default function NewPostCard({
  post,
  onUpdate,
}: NewPostCardProps) {
  const { user } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(post.user_has_liked);
  const [isSaved, setIsSaved] = useState(post.user_has_saved);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [commentsCount, setCommentsCount] = useState(post.comentarios_count);
  const [showPostViewer, setShowPostViewer] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const [authorAvatar, setAuthorAvatar] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string>('Usuario');
  const [loadingAuthor, setLoadingAuthor] = useState(true);

  const isOwner = post.tipo === 'usuario' 
    ? post.autor_id === user?.id
    : false;

  useEffect(() => {
    const loadAuthorData = async () => {
      try {
        if (post.tipo === 'local' && post.local_id) {
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
        console.error('[NewPostCard] Error loading author data:', error);
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
    setIsLiked(newLikedState);
    setLikesCount(prev => newLikedState ? prev + 1 : prev - 1);

    try {
      if (newLikedState) {
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
      console.error('[NewPostCard] Error toggling like:', error);
      setIsLiked(!newLikedState);
      setLikesCount(prev => newLikedState ? prev - 1 : prev + 1);
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
      console.error('[NewPostCard] Error toggling save:', error);
      setIsSaved(!newSavedState);
    }
  };

  const handleDelete = async () => {
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
              console.log('[NewPostCard] Deleting post:', post.id);
              
              // Delete from the correct table: 'posts' not 'publicaciones'
              const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', post.id);

              if (error) {
                console.error('[NewPostCard] Delete error:', error);
                throw error;
              }

              console.log('[NewPostCard] ✅ Post deleted successfully');

              if (onUpdate) {
                onUpdate();
              }
            } catch (error) {
              console.error('[NewPostCard] Error deleting post:', error);
              Alert.alert('Error', 'No se pudo eliminar la publicación');
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

  const displayAvatar = authorAvatar || DEFAULT_AVATAR_URL;

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.authorInfo} onPress={handleProfilePress}>
            <MiniAvatarWithMomento
              imageUrl={displayAvatar}
              size={42}
              userId={post.tipo === 'usuario' ? post.autor_id : undefined}
              localId={post.tipo === 'local' ? post.local_id : undefined}
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
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={22} color="#000" />
            </TouchableOpacity>
          )}
        </View>

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
              <Ionicons name="chatbubble-outline" size={26} color={colors.text} />
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

        <View style={styles.stats}>
          {likesCount > 0 && (
            <Text style={styles.statsText}>
              <Text style={styles.statsBold}>{formatNumber(likesCount)}</Text> me gusta
            </Text>
          )}
          
          {post.contenido && (
            <View style={styles.contentContainer}>
              <Text style={styles.content}>
                <Text style={styles.contentUsername}>{displayUsername}</Text>{' '}
                {post.contenido}
              </Text>
            </View>
          )}

          {commentsCount > 0 && (
            <TouchableOpacity onPress={handleComment}>
              <Text style={styles.commentsText}>
                Ver los {commentsCount} comentarios
              </Text>
            </TouchableOpacity>
          )}
          
          <Text style={styles.timeAgo}>{formatTimeAgo(post.created_at)}</Text>
        </View>
      </View>

      <PostViewerModal
        visible={showPostViewer}
        post={post}
        onClose={() => setShowPostViewer(false)}
        onUpdate={onUpdate}
      />

      <CommentsModal
        visible={showComments}
        postId={post.id}
        postAuthorId={post.autor_id}
        onClose={() => setShowComments(false)}
        onCommentAdded={handleCommentsUpdate}
      />

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
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorText: {
    marginLeft: 12,
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  locationText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deleteButton: {
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
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  statsBold: {
    fontWeight: '700',
  },
  contentContainer: {
    marginBottom: 4,
  },
  content: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 18,
  },
  contentUsername: {
    fontWeight: '600',
    color: colors.text,
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
  },
});
