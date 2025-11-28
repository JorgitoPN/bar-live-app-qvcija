
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import FoodPlateAvatar from '@/components/common/FoodPlateAvatar';

interface Comment {
  id: string;
  post_id: string;
  autor_id: string;
  texto: string;
  created_at: string;
  likes_count?: number;
  user_has_liked?: boolean;
  is_pinned?: boolean;
  parent_comment_id?: string;
  usuario: {
    id: string;
    nombre: string;
    username?: string;
    avatar?: string;
  };
  replies?: Comment[];
}

interface CommentsModalProps {
  visible: boolean;
  postId: string;
  postAuthorId?: string;
  onClose: () => void;
  onCommentAdded?: () => void;
}

export default function CommentsModal({
  visible,
  postId,
  postAuthorId,
  onClose,
  onCommentAdded,
}: CommentsModalProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);

  useEffect(() => {
    if (visible) {
      loadComments();
    }
  }, [visible, postId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      
      // Load comments with likes info
      const { data: commentsData, error } = await supabase
        .from('comentarios')
        .select(`
          *,
          usuario:usuarios!comentarios_autor_id_fkey(
            id,
            nombre,
            username,
            avatar
          )
        `)
        .eq('post_id', postId)
        .is('parent_comment_id', null)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load likes count and user's like status for each comment
      if (user && commentsData) {
        const commentIds = commentsData.map(c => c.id);
        
        const [likesResult, userLikesResult, repliesResult] = await Promise.all([
          supabase
            .from('comment_likes')
            .select('comentario_id')
            .in('comentario_id', commentIds),
          supabase
            .from('comment_likes')
            .select('comentario_id')
            .eq('usuario_id', user.id)
            .in('comentario_id', commentIds),
          supabase
            .from('comentarios')
            .select(`
              *,
              usuario:usuarios!comentarios_autor_id_fkey(
                id,
                nombre,
                username,
                avatar
              )
            `)
            .in('parent_comment_id', commentIds)
            .order('created_at', { ascending: true }),
        ]);

        const likesCounts = likesResult.data?.reduce((acc, like) => {
          acc[like.comentario_id] = (acc[like.comentario_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const userLikedIds = new Set(userLikesResult.data?.map(l => l.comentario_id) || []);

        const repliesByParent = repliesResult.data?.reduce((acc, reply) => {
          if (!acc[reply.parent_comment_id!]) {
            acc[reply.parent_comment_id!] = [];
          }
          acc[reply.parent_comment_id!].push(reply);
          return acc;
        }, {} as Record<string, any[]>) || {};

        const enrichedComments = commentsData.map(comment => ({
          ...comment,
          likes_count: likesCounts[comment.id] || 0,
          user_has_liked: userLikedIds.has(comment.id),
          replies: repliesByParent[comment.id] || [],
        }));

        setComments(enrichedComments);
      } else {
        setComments(commentsData || []);
      }
    } catch (error) {
      console.error('[CommentsModal] Error loading comments:', error);
      Alert.alert('Error', 'No se pudieron cargar los comentarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSendComment = async () => {
    if (!user || !commentText.trim() || sending) {
      return;
    }

    const text = commentText.trim();
    setCommentText('');
    setSending(true);

    try {
      if (editingComment) {
        // Edit existing comment
        const { error } = await supabase
          .from('comentarios')
          .update({ texto: text })
          .eq('id', editingComment.id);

        if (error) throw error;

        setEditingComment(null);
        await loadComments();
      } else {
        // Create new comment or reply
        const { data: newComment, error } = await supabase
          .from('comentarios')
          .insert({
            post_id: postId,
            autor_id: user.id,
            tipo: 'usuario',
            texto: text,
            parent_comment_id: replyingTo?.id || null,
          })
          .select(`
            *,
            usuario:usuarios!comentarios_autor_id_fkey(
              id,
              nombre,
              username,
              avatar
            )
          `)
          .single();

        if (error) throw error;

        if (replyingTo) {
          // Reload to show new reply
          await loadComments();
          setReplyingTo(null);
        } else {
          setComments(prev => [{ ...newComment, likes_count: 0, user_has_liked: false, replies: [] }, ...prev]);
        }
        
        if (onCommentAdded) {
          onCommentAdded();
        }
      }
    } catch (error) {
      console.error('[CommentsModal] Error sending comment:', error);
      Alert.alert('Error', 'No se pudo enviar el comentario');
      setCommentText(text);
    } finally {
      setSending(false);
    }
  };

  const handleLikeComment = async (comment: Comment) => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para dar me gusta');
      return;
    }

    const newLikedState = !comment.user_has_liked;
    
    // Optimistic update
    setComments(prev => prev.map(c => 
      c.id === comment.id 
        ? { 
            ...c, 
            user_has_liked: newLikedState,
            likes_count: (c.likes_count || 0) + (newLikedState ? 1 : -1)
          }
        : c
    ));

    try {
      if (newLikedState) {
        await supabase.from('comment_likes').insert({
          comentario_id: comment.id,
          usuario_id: user.id,
        });
      } else {
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comentario_id', comment.id)
          .eq('usuario_id', user.id);
      }
    } catch (error) {
      console.error('[CommentsModal] Error toggling like:', error);
      // Revert on error
      setComments(prev => prev.map(c => 
        c.id === comment.id 
          ? { 
              ...c, 
              user_has_liked: !newLikedState,
              likes_count: (c.likes_count || 0) + (newLikedState ? -1 : 1)
            }
          : c
      ));
    }
  };

  const handleDeleteComment = async (comment: Comment) => {
    Alert.alert(
      'Eliminar comentario',
      '¿Estás seguro de que quieres eliminar este comentario?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('comentarios')
                .delete()
                .eq('id', comment.id);

              if (error) throw error;

              await loadComments();
            } catch (error) {
              console.error('[CommentsModal] Error deleting comment:', error);
              Alert.alert('Error', 'No se pudo eliminar el comentario');
            }
          },
        },
      ]
    );
  };

  const handlePinComment = async (comment: Comment) => {
    try {
      const { error } = await supabase
        .from('comentarios')
        .update({ is_pinned: !comment.is_pinned })
        .eq('id', comment.id);

      if (error) throw error;

      await loadComments();
    } catch (error) {
      console.error('[CommentsModal] Error pinning comment:', error);
      Alert.alert('Error', 'No se pudo fijar el comentario');
    }
  };

  const handleReportComment = (comment: Comment) => {
    Alert.alert(
      'Denunciar comentario',
      '¿Por qué quieres denunciar este comentario?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Spam', onPress: () => submitReport(comment.id, 'spam') },
        { text: 'Acoso', onPress: () => submitReport(comment.id, 'harassment') },
        { text: 'Contenido inapropiado', onPress: () => submitReport(comment.id, 'inappropriate') },
      ]
    );
  };

  const submitReport = async (commentId: string, reason: string) => {
    try {
      await supabase.from('comment_reports').insert({
        comentario_id: commentId,
        usuario_id: user?.id,
        reason,
      });

      Alert.alert('Gracias', 'Tu denuncia ha sido enviada');
    } catch (error) {
      console.error('[CommentsModal] Error reporting comment:', error);
      Alert.alert('Error', 'No se pudo enviar la denuncia');
    }
  };

  const showCommentOptions = (comment: Comment) => {
    const isOwner = comment.autor_id === user?.id;
    const isPostOwner = postAuthorId === user?.id;

    const options: string[] = [];
    const actions: (() => void)[] = [];

    // Options for everyone
    if (!isOwner) {
      options.push('Denunciar');
      actions.push(() => handleReportComment(comment));
    }

    // Options for comment author
    if (isOwner) {
      options.push('Editar');
      actions.push(() => {
        setEditingComment(comment);
        setCommentText(comment.texto);
      });

      options.push('Eliminar');
      actions.push(() => handleDeleteComment(comment));
    }

    // Options for post owner
    if (isPostOwner && !isOwner) {
      options.push('Eliminar comentario');
      actions.push(() => handleDeleteComment(comment));

      options.push(comment.is_pinned ? 'Desfijar' : 'Fijar');
      actions.push(() => handlePinComment(comment));
    }

    options.push('Cancelar');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: options.findIndex(o => o.includes('Eliminar')),
        },
        (buttonIndex) => {
          if (buttonIndex < actions.length) {
            actions[buttonIndex]();
          }
        }
      );
    } else {
      Alert.alert(
        'Opciones',
        '',
        options.map((option, index) => ({
          text: option,
          style: option.includes('Eliminar') ? 'destructive' : option === 'Cancelar' ? 'cancel' : 'default',
          onPress: index < actions.length ? actions[index] : undefined,
        }))
      );
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

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentWrapper}>
      {item.is_pinned && (
        <View style={styles.pinnedBadge}>
          <IconSymbol
            ios_icon_name="pin.fill"
            android_material_icon_name="push_pin"
            size={12}
            color={colors.primary}
          />
          <Text style={styles.pinnedText}>Fijado</Text>
        </View>
      )}
      <View style={styles.commentItem}>
        <FoodPlateAvatar
          imageUrl={item.usuario.avatar}
          size={36}
          nombre={item.usuario.nombre}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentBubble}>
            <Text style={styles.commentUsername}>
              {item.usuario.username || item.usuario.nombre}
            </Text>
            <Text style={styles.commentText}>{item.texto}</Text>
          </View>
          <View style={styles.commentActions}>
            <Text style={styles.commentTime}>{formatTimeAgo(item.created_at)}</Text>
            {(item.likes_count || 0) > 0 && (
              <Text style={styles.commentLikes}>
                {item.likes_count} {item.likes_count === 1 ? 'me gusta' : 'me gusta'}
              </Text>
            )}
            <TouchableOpacity onPress={() => setReplyingTo(item)}>
              <Text style={styles.commentAction}>Responder</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => showCommentOptions(item)}>
              <Text style={styles.commentAction}>Más</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.commentRightActions}>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={() => handleLikeComment(item)}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name={item.user_has_liked ? 'heart.fill' : 'heart'}
              android_material_icon_name={item.user_has_liked ? 'favorite' : 'favorite_border'}
              size={16}
              color={item.user_has_liked ? '#ff3b30' : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Render replies */}
      {item.replies && item.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {item.replies.map((reply) => (
            <View key={reply.id} style={styles.replyItem}>
              <FoodPlateAvatar
                imageUrl={reply.usuario.avatar}
                size={28}
                nombre={reply.usuario.nombre}
              />
              <View style={styles.commentContent}>
                <View style={styles.commentBubble}>
                  <Text style={styles.commentUsername}>
                    {reply.usuario.username || reply.usuario.nombre}
                  </Text>
                  <Text style={styles.commentText}>{reply.texto}</Text>
                </View>
                <View style={styles.commentActions}>
                  <Text style={styles.commentTime}>{formatTimeAgo(reply.created_at)}</Text>
                  <TouchableOpacity onPress={() => showCommentOptions(reply)}>
                    <Text style={styles.commentAction}>Más</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <IconSymbol
        ios_icon_name="bubble.left"
        android_material_icon_name="chat_bubble_outline"
        size={64}
        color={colors.textSecondary}
      />
      <Text style={styles.emptyText}>No hay comentarios aún</Text>
      <Text style={styles.emptySubtext}>Sé el primero en comentar</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <BlurView intensity={80} tint="light" style={styles.header}>
          <Text style={styles.headerTitle}>Comentarios</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="xmark"
              android_material_icon_name="close"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
        </BlurView>

        {/* Comments List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input */}
        {user && (
          <BlurView intensity={80} tint="light" style={styles.inputContainer}>
            {(replyingTo || editingComment) && (
              <View style={styles.replyingBanner}>
                <Text style={styles.replyingText}>
                  {editingComment 
                    ? 'Editando comentario' 
                    : `Respondiendo a ${replyingTo?.usuario.username || replyingTo?.usuario.nombre}`}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setReplyingTo(null);
                    setEditingComment(null);
                    setCommentText('');
                  }}
                >
                  <IconSymbol
                    ios_icon_name="xmark.circle.fill"
                    android_material_icon_name="cancel"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputRow}>
              <FoodPlateAvatar
                imageUrl={user.avatar}
                size={36}
                nombre={user.nombre}
              />
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder={replyingTo ? 'Añade una respuesta...' : 'Añade un comentario...'}
                  placeholderTextColor={colors.textSecondary}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                  editable={!sending}
                />
                {commentText.trim().length > 0 && (
                  <TouchableOpacity
                    style={styles.sendButton}
                    onPress={handleSendComment}
                    activeOpacity={0.7}
                    disabled={sending}
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.secondary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.sendButtonGradient}
                    >
                      {sending ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <IconSymbol
                          ios_icon_name="paperplane.fill"
                          android_material_icon_name="send"
                          size={18}
                          color="#fff"
                        />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </BlurView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  commentWrapper: {
    marginBottom: 16,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 8,
  },
  pinnedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  commentItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 12,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 18,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginLeft: 12,
  },
  commentTime: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  commentLikes: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  commentAction: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  commentRightActions: {
    justifyContent: 'flex-start',
    paddingTop: 12,
  },
  likeButton: {
    padding: 4,
  },
  repliesContainer: {
    marginLeft: 48,
    marginTop: 12,
    gap: 12,
  },
  replyItem: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    overflow: 'hidden',
  },
  replyingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyingText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
