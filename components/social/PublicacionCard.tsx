
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
  TextInput,
  Modal,
  KeyboardAvoidingView,
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
import PostLikesAvatars from '@/components/social/PostLikesAvatars';
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
  
  // ✅ NEW: Edit description modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editedDescription, setEditedDescription] = useState(post.contenido || '');
  const [savingEdit, setSavingEdit] = useState(false);

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
    // ✅ FIXED: Check if it's the current user's profile
    if (post.tipo === 'local' && post.local_id) {
      router.push({
        pathname: '/perfil/local',
        params: { localId: post.local_id },
      });
    } else if (post.tipo === 'usuario' && post.autor_id) {
      if (user && post.autor_id === user.id) {
        // Navigate to own profile
        router.push('/(tabs)/perfil');
      } else {
        // Navigate to other user's profile
        router.push({
          pathname: '/perfil/usuario',
          params: { userId: post.autor_id },
        });
      }
    }
  }, [router, post, user]);

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

  // ✅ NEW: Handle edit description
  const handleEditDescription = useCallback(() => {
    setEditedDescription(post.contenido || '');
    setEditModalVisible(true);
  }, [post.contenido]);

  const handleSaveEdit = useCallback(async () => {
    if (!editedDescription.trim()) {
      Alert.alert('Error', 'La descripción no puede estar vacía');
      return;
    }

    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({ 
          contenido: editedDescription.trim(),
          editado_at: new Date().toISOString(),
        })
        .eq('id', post.id);

      if (error) throw error;

      setEditModalVisible(false);
      if (onUpdate) {
        onUpdate();
      }
      Alert.alert('Éxito', 'Descripción actualizada correctamente');
    } catch (error) {
      console.error('[PublicacionCard] Error updating description:', error);
      Alert.alert('Error', 'No se pudo actualizar la descripción');
    } finally {
      setSavingEdit(false);
    }
  }, [editedDescription, post.id, onUpdate]);

  const showOptions = useCallback(() => {
    const canEdit = user && (
      (post.tipo === 'usuario' && post.autor_id === user.id) ||
      (post.tipo === 'local' && interactionLocalId === post.local_id)
    );

    if (!canEdit) return;

    const options = ['Editar descripción', 'Eliminar publicación', 'Cancelar'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 2,
          destructiveButtonIndex: 1,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            handleEditDescription();
          } else if (buttonIndex === 1) {
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
            text: 'Editar descripción',
            onPress: handleEditDescription,
          },
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
  }, [user, post, interactionLocalId, handleDeletePost, handleEditDescription]);

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

  const canEdit = user && (
    (post.tipo === 'usuario' && post.autor_id === user.id) ||
    (post.tipo === 'local' && interactionLocalId === post.local_id)
  );

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
          {/* ✅ FIXED: Show neon border on mini-avatars when user has UNVIEWED momento */}
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
        {canEdit && (
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

      {/* ✅ Instagram-style likes display with modal */}
      <PostLikesAvatars postId={post.id} totalLikes={likesCount} />

      {/* ✅ Description BELOW likes and ABOVE comments count */}
      {post.contenido && (
        <View style={styles.contentContainer}>
          <ParsedText text={post.contenido} style={styles.content} />
        </View>
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

      {/* ✅ NEW: Edit Description Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editModalOverlay}
        >
          <TouchableOpacity 
            style={styles.editModalBackdrop}
            activeOpacity={1}
            onPress={() => setEditModalVisible(false)}
          />
          <View style={styles.editModalContent}>
            <View style={styles.editModalHeader}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.editModalCancel}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.editModalTitle}>Editar descripción</Text>
              <TouchableOpacity onPress={handleSaveEdit} disabled={savingEdit}>
                <Text style={[styles.editModalSave, savingEdit && styles.editModalSaveDisabled]}>
                  {savingEdit ? 'Guardando...' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.editModalInput}
              value={editedDescription}
              onChangeText={setEditedDescription}
              placeholder="Escribe una descripción..."
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={2200}
              autoFocus
              editable={!savingEdit}
            />
            <Text style={styles.editModalCounter}>
              {editedDescription.length}/2200
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  imageIndicatorDotActive: {
    backgroundColor: '#FFFFFF',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
  commentsCount: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  commentsCountText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  // ✅ NEW: Edit modal styles
  editModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  editModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  editModalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '80%',
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  editModalCancel: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  editModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  editModalSave: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  editModalSaveDisabled: {
    opacity: 0.5,
  },
  editModalInput: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
    minHeight: 150,
    maxHeight: 400,
    textAlignVertical: 'top',
  },
  editModalCounter: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
  },
});
