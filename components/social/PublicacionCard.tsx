
import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useInteractionContext } from '@/hooks/useInteractionContext';
import OptimizedImage from '@/components/common/OptimizedImage';
import ParsedText from '@/components/social/ParsedText';
import MiniFoodPlateAvatar from '@/components/common/MiniFoodPlateAvatar';
import CommentsModal from '@/components/social/CommentsModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Post {
  id: string;
  autor_id: string;
  tipo: 'usuario' | 'local';
  local_id?: string;
  contenido: string;
  imagenes: string[];
  video_url?: string;
  ubicacion?: string;
  likes_count: number;
  comentarios_count: number;
  compartidos_count: number;
  created_at: string;
  autor?: {
    id: string;
    nombre: string;
    username?: string;
    avatar?: string;
  };
  local?: {
    id: string;
    nombre: string;
    imagen_url?: string;
  };
  user_has_liked?: boolean;
}

interface PublicacionCardProps {
  post: Post;
  onUpdate?: () => void;
}

const PublicacionCard = memo(({ post, onUpdate }: PublicacionCardProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const { interactionUserId, interactionLocalId, isInteractingAsLocal } = useInteractionContext();
  
  const [liked, setLiked] = useState(post.user_has_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);

  const handleLike = useCallback(async () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para dar me gusta');
      return;
    }

    const newLikedState = !liked;
    setLiked(newLikedState);
    setLikesCount(prev => prev + (newLikedState ? 1 : -1));

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
      console.error('[PublicacionCard] Error toggling like:', error);
      setLiked(!newLikedState);
      setLikesCount(prev => prev + (newLikedState ? -1 : 1));
    }
  }, [user, liked, post.id]);

  const handleComment = useCallback(() => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Para comentar necesitas registrarte en BarLive');
      return;
    }
    setCommentsModalVisible(true);
  }, [user]);

  const handleShare = useCallback(() => {
    router.push({
      pathname: '/social/post',
      params: { id: post.id },
    });
  }, [router, post.id]);

  const handlePostPress = useCallback(() => {
    router.push({
      pathname: '/social/post',
      params: { id: post.id },
    });
  }, [router, post.id]);

  const handleProfilePress = useCallback(() => {
    if (post.tipo === 'local' && post.local_id) {
      router.push({
        pathname: '/perfil/local',
        params: { localId: post.local_id },
      });
    } else if (post.tipo === 'usuario' && post.autor_id) {
      router.push({
        pathname: '/perfil/usuario',
        params: { userId: post.autor_id },
      });
    }
  }, [router, post]);

  const handleDeletePost = useCallback(async () => {
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

              if (onUpdate) {
                onUpdate();
              }
            } catch (error) {
              console.error('[PublicacionCard] Error deleting post:', error);
              Alert.alert('Error', 'No se pudo eliminar la publicación');
            }
          },
        },
      ]
    );
  }, [post.id, onUpdate]);

  const showOptions = useCallback(() => {
    const canDelete = user && (
      (post.tipo === 'usuario' && post.autor_id === user.id) ||
      (post.tipo === 'local' && interactionLocalId === post.local_id)
    );

    if (!canDelete) return;

    const options = ['Eliminar publicación', 'Cancelar'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 1,
          destructiveButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            handleDeletePost();
          }
        }
      );
    } else {
      Alert.alert(
        'Opciones',
        '',
        [
          {
            text: 'Eliminar publicación',
            style: 'destructive',
            onPress: handleDeletePost,
          },
          {
            text: 'Cancelar',
            style: 'cancel',
          },
        ]
      );
    }
  }, [user, post, interactionLocalId, handleDeletePost]);

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

  const displayName = post.tipo === 'local' && post.local 
    ? post.local.nombre 
    : post.autor?.username 
      ? post.autor.username.replace(/^@/, '')
      : post.autor?.nombre || 'Usuario';

  const displayAvatar = post.tipo === 'local' && post.local 
    ? post.local.imagen_url 
    : post.autor?.avatar || '';

  const canDelete = user && (
    (post.tipo === 'usuario' && post.autor_id === user.id) ||
    (post.tipo === 'local' && interactionLocalId === post.local_id)
  );

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={handleProfilePress} activeOpacity={0.7}>
          {displayAvatar ? (
            <Image source={{ uri: displayAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {displayName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.username}>{displayName}</Text>
            <Text style={styles.timestamp}>{formatTimeAgo(post.created_at)}</Text>
          </View>
        </TouchableOpacity>
        {canDelete && (
          <TouchableOpacity style={styles.optionsButton} onPress={showOptions} activeOpacity={0.7}>
            <IconSymbol ios_icon_name="ellipsis" android_material_icon_name="more_vert" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {post.contenido && (
        <TouchableOpacity onPress={handlePostPress} activeOpacity={1}>
          <ParsedText text={post.contenido} style={styles.content} />
        </TouchableOpacity>
      )}

      {/* Images */}
      {post.imagenes && post.imagenes.length > 0 && (
        <TouchableOpacity onPress={handlePostPress} activeOpacity={0.95}>
          <View style={styles.imageContainer}>
            <OptimizedImage
              source={{ uri: post.imagenes[currentImageIndex] }}
              style={styles.postImage}
              resizeMode="cover"
            />
            {post.imagenes.length > 1 && (
              <View style={styles.imageIndicator}>
                <Text style={styles.imageIndicatorText}>
                  {currentImageIndex + 1}/{post.imagenes.length}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <View style={styles.actionsLeft}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike} activeOpacity={0.7}>
            <IconSymbol
              ios_icon_name={liked ? "heart.fill" : "heart"}
              android_material_icon_name={liked ? "favorite" : "favorite_border"}
              size={26}
              color={liked ? "#EF4444" : colors.text}
            />
            {likesCount > 0 && (
              <Text style={[styles.actionText, liked && { color: '#EF4444' }]}>
                {likesCount}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleComment} activeOpacity={0.7}>
            <IconSymbol
              ios_icon_name="bubble.left"
              android_material_icon_name="chat_bubble_outline"
              size={24}
              color={colors.text}
            />
            {post.comentarios_count > 0 && (
              <Text style={styles.actionText}>{post.comentarios_count}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleShare} activeOpacity={0.7}>
            <IconSymbol
              ios_icon_name="paperplane"
              android_material_icon_name="send"
              size={24}
              color={colors.text}
            />
            {post.compartidos_count > 0 && (
              <Text style={styles.actionText}>{post.compartidos_count}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ✅ Comments Modal Integration */}
      <CommentsModal
        visible={commentsModalVisible}
        postId={post.id}
        postAuthorId={post.autor_id}
        onClose={() => setCommentsModalVisible(false)}
        onCommentAdded={() => {
          if (onUpdate) {
            onUpdate();
          }
        }}
      />
    </View>
  );
});

PublicacionCard.displayName = 'PublicacionCard';

export default PublicacionCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    marginBottom: 12,
    borderRadius: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
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
  headerInfo: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  optionsButton: {
    padding: 8,
  },
  content: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  imageContainer: {
    position: 'relative',
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: colors.background,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  imageIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  imageIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
