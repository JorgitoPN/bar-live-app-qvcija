
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
  ScrollView,
  Share,
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
import SharePostModal from '@/components/social/SharePostModal';
import { LinearGradient } from 'expo-linear-gradient';

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
  user_has_saved?: boolean;
}

interface LikeUser {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  tipo: 'usuario' | 'local';
  has_momento?: boolean;
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
  const [saved, setSaved] = useState(post.user_has_saved || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [likeUsers, setLikeUsers] = useState<LikeUser[]>([]);
  const [loadingLikes, setLoadingLikes] = useState(false);

  // ✅ Load like users for Instagram-style display
  const loadLikeUsers = useCallback(async () => {
    if (likesCount === 0 || loadingLikes) return;

    try {
      setLoadingLikes(true);
      const { data, error } = await supabase
        .from('likes')
        .select(`
          usuario_id,
          usuarios!likes_usuario_id_fkey(id, nombre, username, avatar)
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (!error && data) {
        // ✅ FIXED: Do NOT check for momentos - remove neon border from likes
        const users = data
          .filter(like => like.usuarios)
          .map((like: any) => ({
            id: like.usuarios.id,
            nombre: like.usuarios.nombre,
            username: like.usuarios.username,
            avatar: like.usuarios.avatar,
            tipo: 'usuario' as const,
            has_momento: false, // ✅ ALWAYS false - no neon border in likes
          }));
        
        setLikeUsers(users);
      }
    } catch (error) {
      console.error('[PublicacionCard] Error loading like users:', error);
    } finally {
      setLoadingLikes(false);
    }
  }, [post.id, likesCount, loadingLikes]);

  // Load like users when component mounts or likes count changes
  React.useEffect(() => {
    if (likesCount > 0) {
      loadLikeUsers();
    }
  }, [likesCount]);

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
      
      // Reload like users after like/unlike
      loadLikeUsers();
    } catch (error) {
      console.error('[PublicacionCard] Error toggling like:', error);
      setLiked(!newLikedState);
      setLikesCount(prev => prev + (newLikedState ? -1 : 1));
    }
  }, [user, liked, post.id, loadLikeUsers]);

  const handleSave = useCallback(async () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para guardar publicaciones');
      return;
    }

    const newSavedState = !saved;
    setSaved(newSavedState);

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
      console.error('[PublicacionCard] Error toggling save:', error);
      setSaved(!newSavedState);
    }
  }, [user, saved, post.id]);

  const handleComment = useCallback(() => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Para comentar necesitas registrarte en BarLive');
      return;
    }
    setCommentsModalVisible(true);
  }, [user]);

  const handleShare = useCallback(async () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para compartir publicaciones');
      return;
    }

    // Open share modal for sharing via messages
    setShareModalVisible(true);
  }, [user]);

  const handleNativeShare = useCallback(async () => {
    try {
      const shareContent = post.contenido 
        ? `${post.contenido}\n\nVer en BarLive`
        : 'Ver publicación en BarLive';
      
      await Share.share({
        message: shareContent,
        title: 'Compartir publicación',
      });
    } catch (error) {
      console.error('[PublicacionCard] Error sharing:', error);
    }
  }, [post.contenido]);

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

  // ✅ Format likes text Instagram-style
  const getLikesText = () => {
    if (likesCount === 0) return null;
    if (likesCount === 1) {
      const firstUser = likeUsers[0];
      if (firstUser) {
        const username = firstUser.username || firstUser.nombre;
        return `Le gusta a @${username}`;
      }
      return '1 me gusta';
    }
    if (likesCount === 2 && likeUsers.length >= 2) {
      const user1 = likeUsers[0].username || likeUsers[0].nombre;
      const user2 = likeUsers[1].username || likeUsers[1].nombre;
      return `Les gusta a @${user1} y @${user2}`;
    }
    if (likesCount >= 3 && likeUsers.length >= 1) {
      const firstUser = likeUsers[0].username || likeUsers[0].nombre;
      const others = likesCount - 1;
      return `Les gusta a @${firstUser} y otras ${others} personas`;
    }
    return `${likesCount} me gusta`;
  };

  const handleLikesPress = () => {
    // TODO: Open likes modal
    console.log('[PublicacionCard] Open likes modal for post:', post.id);
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setCurrentImageIndex(index);
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={handleProfilePress} activeOpacity={0.7}>
          {/* ✅ FIXED: Show neon border on mini-avatars when user has new momento */}
          <MiniFoodPlateAvatar
            imageUrl={displayAvatar}
            size={40}
            nombre={displayName}
            userId={post.tipo === 'usuario' ? post.autor_id : undefined}
            localId={post.tipo === 'local' ? post.local_id : undefined}
            showMomentoBorder={true}
          />
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

      {/* ✅ Images with swipe support (RESTORED) */}
      {post.imagenes && post.imagenes.length > 0 && (
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {post.imagenes.map((imageUrl, index) => (
              <TouchableOpacity
                key={index}
                onPress={handlePostPress}
                activeOpacity={0.95}
                style={styles.imageWrapper}
              >
                <OptimizedImage
                  source={{ uri: imageUrl }}
                  style={styles.postImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
          {/* ✅ FIXED: White dots for image indicators */}
          {post.imagenes.length > 1 && (
            <View style={styles.imageIndicatorContainer}>
              {post.imagenes.map((_, index) => (
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

      {/* ✅ Description BELOW image and ABOVE actions */}
      {post.contenido && (
        <View style={styles.contentContainer}>
          <ParsedText text={post.contenido} style={styles.content} />
        </View>
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
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleComment} activeOpacity={0.7}>
            <IconSymbol
              ios_icon_name="message"
              android_material_icon_name="chat_bubble_outline"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleShare} activeOpacity={0.7}>
            <IconSymbol
              ios_icon_name="paperplane"
              android_material_icon_name="send"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={handleSave} activeOpacity={0.7}>
          <IconSymbol
            ios_icon_name={saved ? "bookmark.fill" : "bookmark"}
            android_material_icon_name={saved ? "bookmark" : "bookmark_border"}
            size={24}
            color={saved ? colors.primary : colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* ✅ Instagram-style likes display WITHOUT neon borders */}
      {likesCount > 0 && (
        <TouchableOpacity 
          style={styles.likesContainer}
          onPress={handleLikesPress}
          activeOpacity={0.7}
        >
          {likeUsers.length > 0 && (
            <View style={styles.likesAvatars}>
              {likeUsers.slice(0, 3).map((likeUser, index) => (
                <View
                  key={likeUser.id}
                  style={[
                    styles.likeAvatarWrapper,
                    index > 0 && { marginLeft: -8 },
                  ]}
                >
                  {/* ✅ FIXED: NO neon border - simple avatar */}
                  {likeUser.avatar ? (
                    <Image source={{ uri: likeUser.avatar }} style={styles.likeAvatar} />
                  ) : (
                    <View style={[styles.likeAvatar, styles.likeAvatarPlaceholder]}>
                      <Text style={styles.likeAvatarText}>
                        {likeUser.nombre.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
          <Text style={styles.likesText}>{getLikesText()}</Text>
        </TouchableOpacity>
      )}

      {/* Comments count */}
      {post.comentarios_count > 0 && (
        <TouchableOpacity 
          style={styles.commentsCount}
          onPress={handleComment}
          activeOpacity={0.7}
        >
          <Text style={styles.commentsCountText}>
            Ver {post.comentarios_count === 1 ? 'el comentario' : `los ${post.comentarios_count} comentarios`}
          </Text>
        </TouchableOpacity>
      )}

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

      {/* ✅ Share Modal Integration */}
      <SharePostModal
        visible={shareModalVisible}
        postId={post.id}
        postContent={post.contenido}
        onClose={() => setShareModalVisible(false)}
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
  headerInfo: {
    flex: 1,
    marginLeft: 12,
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
  imageContainer: {
    position: 'relative',
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: colors.background,
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  postImage: {
    width: '100%',
    height: '100%',
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
    backgroundColor: 'rgba(255, 255, 255, 0.5)', // ✅ FIXED: White dots
  },
  imageIndicatorDotActive: {
    backgroundColor: '#FFFFFF', // ✅ FIXED: White active dot
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  content: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  likesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  likesAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeAvatarWrapper: {
    position: 'relative',
  },
  likeAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.cardBackground,
  },
  likeAvatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeAvatarText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  likesText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  commentsCount: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  commentsCountText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
