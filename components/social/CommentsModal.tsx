
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Keyboard,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { useInteractionContext } from '@/hooks/useInteractionContext';
import { supabase } from '@/utils/supabase';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import MiniFoodPlateAvatar from '@/components/common/MiniFoodPlateAvatar';
import MentionAutocomplete, { MentionSuggestion } from '@/components/social/MentionAutocomplete';
import { processCommentHashtags, processCommentMentions } from '@/utils/postHelpers';
import ParsedText from '@/components/social/ParsedText';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  tipo?: string;
  local_id?: string;
  usuario?: {
    id: string;
    nombre: string;
    username?: string;
    avatar?: string;
  };
  local?: {
    nombre: string;
    imagen_url?: string;
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

/**
 * ✅ COMMENTS MODAL v5.0 - KEYBOARD AVOIDANCE FIXED
 * 
 * Changes:
 * - ✅ CRITICAL FIX: Mention autocomplete now appears ABOVE keyboard
 * - ✅ Keyboard height tracked and passed to MentionAutocomplete
 * - ✅ Input container moves with keyboard
 * - ✅ Autocomplete attached to keyboard (no gap)
 * - ✅ Maintains Instagram-style design with light theme
 */

export default function CommentsModal({
  visible,
  postId,
  postAuthorId,
  onClose,
  onCommentAdded,
}: CommentsModalProps) {
  const { user, ensureValidSession } = useAuth();
  const { interactionUserId, interactionLocalId, isInteractingAsLocal } = useInteractionContext();
  const textInputRef = useRef<TextInput>(null);
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        console.log('[CommentsModal v5.0] ⌨️ Keyboard shown, height:', e.endCoordinates.height);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        console.log('[CommentsModal v5.0] ⌨️ Keyboard hidden');
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: commentsData, error } = await supabase
        .from('comentarios')
        .select(`
          *,
          usuario:usuarios!comentarios_autor_id_fkey(
            id,
            nombre,
            username,
            avatar
          ),
          local:locales(nombre, imagen_url)
        `)
        .eq('post_id', postId)
        .is('parent_comment_id', null)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

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
              ),
              local:locales(nombre, imagen_url)
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
  }, [postId, user]);

  useEffect(() => {
    if (visible) {
      loadComments();
    }
  }, [visible, postId, loadComments]);

  const handleSelectMention = (mention: MentionSuggestion, mentionText: string) => {
    console.log('[CommentsModal v5.0] ✅ Selected mention:', mention);
    
    const textBeforeCursor = commentText.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) return;

    const mentionUsername = mention.tipo === 'local' ? mention.nombre : mention.username;
    const newText = 
      commentText.substring(0, lastAtIndex) + 
      `@${mentionUsername} ` + 
      commentText.substring(cursorPosition);
    
    setCommentText(newText);
    
    const newCursorPosition = lastAtIndex + mentionUsername.length + 2;
    setCursorPosition(newCursorPosition);
    
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  };

  const handleSendComment = async () => {
    if (!user || !commentText.trim() || sending) {
      return;
    }

    const text = commentText.trim();
    setCommentText('');
    setSending(true);

    try {
      console.log('[CommentsModal v5.0] 🔄 Ensuring valid session before sending comment...');
      const validSession = await ensureValidSession();
      
      if (!validSession || !validSession.user) {
        console.error('[CommentsModal v5.0] ❌ No valid session available');
        Alert.alert(
          'Error de autenticación',
          'Tu sesión ha expirado o no tienes permisos. Por favor inicia sesión de nuevo.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Iniciar sesión', onPress: () => {
              onClose();
            }}
          ]
        );
        setCommentText(text);
        setSending(false);
        return;
      }

      console.log('[CommentsModal v5.0] ✅ Valid session confirmed, user ID:', validSession.user.id);

      if (editingComment) {
        const { error } = await supabase
          .from('comentarios')
          .update({ texto: text })
          .eq('id', editingComment.id);

        if (error) throw error;

        setEditingComment(null);
        await loadComments();
      } else {
        const commentData: any = {
          post_id: postId,
          autor_id: validSession.user.id,
          texto: text,
          parent_comment_id: replyingTo?.id || null,
        };
        
        if (interactionLocalId) {
          commentData.tipo = 'local';
          commentData.local_id = interactionLocalId;
        } else {
          commentData.tipo = 'usuario';
        }

        console.log('[CommentsModal v5.0] 📝 Inserting comment with data:', commentData);

        const { data: newComment, error } = await supabase
          .from('comentarios')
          .insert(commentData)
          .select(`
            *,
            usuario:usuarios!comentarios_autor_id_fkey(
              id,
              nombre,
              username,
              avatar
            ),
            local:locales(nombre, imagen_url)
          `)
          .single();

        if (error) {
          console.error('[CommentsModal v5.0] ❌ Error inserting comment:', error);
          throw error;
        }

        console.log('[CommentsModal v5.0] ✅ Comment inserted successfully:', newComment.id);

        if (newComment && text) {
          console.log('[CommentsModal v5.0] 🏷️ Processing hashtags and mentions in comment...');
          await Promise.all([
            processCommentHashtags(newComment.id, text),
            processCommentMentions(newComment.id, text, postId),
          ]);
          console.log('[CommentsModal v5.0] ✅ Comment hashtags and mentions processed');
        }

        if (replyingTo) {
          await loadComments();
          setReplyingTo(null);
        } else {
          setComments(prev => [{ ...newComment, likes_count: 0, user_has_liked: false, replies: [] }, ...prev]);
        }
        
        if (onCommentAdded) {
          onCommentAdded();
        }
      }
    } catch (error: any) {
      console.error('[CommentsModal v5.0] ❌ Error sending comment:', error);
      
      let errorMessage = 'No se pudo enviar el comentario';
      
      if (error?.code === '42501') {
        errorMessage = 'Error de autenticación. Tu sesión ha expirado o no tienes permisos. Por favor inicia sesión de nuevo.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
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
    const canDelete = user && (
      comment.autor_id === user.id || 
      postAuthorId === user.id
    );

    if (!canDelete) {
      Alert.alert('Error', 'No tienes permiso para eliminar este comentario');
      return;
    }

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

    if (!isOwner) {
      options.push('Denunciar');
      actions.push(() => handleReportComment(comment));
    }

    if (isOwner) {
      options.push('Editar');
      actions.push(() => {
        setEditingComment(comment);
        setCommentText(comment.texto);
      });

      options.push('Eliminar');
      actions.push(() => handleDeleteComment(comment));
    }

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

  const renderComment = ({ item }: { item: Comment }) => {
    const displayName = item.tipo === 'local' && item.local 
      ? item.local.nombre 
      : item.usuario?.username 
        ? item.usuario.username.replace(/^@/, '')
        : item.usuario?.nombre || 'Usuario';

    const displayAvatar = item.tipo === 'local' && item.local 
      ? item.local.imagen_url 
      : item.usuario?.avatar || '';

    const canDelete = user && (
      (item.tipo === 'usuario' && item.autor_id === user.id) ||
      (item.tipo === 'local' && interactionLocalId === item.local_id) ||
      postAuthorId === user.id
    );

    return (
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
          {displayAvatar ? (
            <Image source={{ uri: displayAvatar }} style={styles.commentAvatar} />
          ) : (
            <View style={[styles.commentAvatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {displayName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View style={styles.commentContent}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentUsername}>{displayName}</Text>
              <Text style={styles.commentTime}>{formatTimeAgo(item.created_at)}</Text>
              {canDelete && (
                <TouchableOpacity 
                  style={styles.commentOptionsButton}
                  onPress={() => handleDeleteComment(item)}
                  activeOpacity={0.7}
                >
                  <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={16} color="rgba(0, 0, 0, 0.5)" />
                </TouchableOpacity>
              )}
            </View>
            <ParsedText text={item.texto} style={styles.commentText} />
            <View style={styles.commentActions}>
              <TouchableOpacity 
                style={styles.commentActionButton}
                onPress={() => handleLikeComment(item)}
                activeOpacity={0.7}
              >
                {item.likes_count && item.likes_count > 0 ? (
                  <Text style={[styles.commentActionText, item.user_has_liked && { color: '#EF4444' }]}>
                    {item.likes_count} me gusta
                  </Text>
                ) : (
                  <Text style={styles.commentActionText}>Me gusta</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.commentActionButton}
                onPress={() => {
                  if (!user) {
                    Alert.alert('Inicia sesión', 'Para responder necesitas registrarte en BarLive');
                    return;
                  }
                  setReplyingTo(item);
                  textInputRef.current?.focus();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.commentActionText}>Responder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {item.replies && item.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {item.replies.map((reply) => {
              const replyDisplayName = reply.tipo === 'local' && reply.local 
                ? reply.local.nombre 
                : reply.usuario?.username 
                  ? reply.usuario.username.replace(/^@/, '')
                  : reply.usuario?.nombre || 'Usuario';

              const replyDisplayAvatar = reply.tipo === 'local' && reply.local 
                ? reply.local.imagen_url 
                : reply.usuario?.avatar || '';

              const canDeleteReply = user && (
                (reply.tipo === 'usuario' && reply.autor_id === user.id) ||
                (reply.tipo === 'local' && interactionLocalId === reply.local_id) ||
                postAuthorId === user.id
              );

              return (
                <View key={reply.id} style={styles.replyItem}>
                  {replyDisplayAvatar ? (
                    <Image source={{ uri: replyDisplayAvatar }} style={styles.replyAvatar} />
                  ) : (
                    <View style={[styles.replyAvatar, styles.avatarPlaceholder]}>
                      <Text style={[styles.avatarText, { fontSize: 12 }]}>
                        {replyDisplayName?.charAt(0).toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentUsername}>{replyDisplayName}</Text>
                      <Text style={styles.commentTime}>{formatTimeAgo(reply.created_at)}</Text>
                      {canDeleteReply && (
                        <TouchableOpacity 
                          style={styles.commentOptionsButton}
                          onPress={() => handleDeleteComment(reply)}
                          activeOpacity={0.7}
                        >
                          <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={14} color="rgba(0, 0, 0, 0.5)" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <ParsedText text={reply.texto} style={styles.commentText} />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

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
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View style={{ width: 40 }} />
            <Text style={styles.headerTitle}>Comentarios</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.headerText} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

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
            keyboardShouldPersistTaps="handled"
          />
        )}

        {user && (
          <BlurView 
            intensity={80} 
            tint="light" 
            style={[styles.inputContainer, { bottom: keyboardHeight > 0 ? keyboardHeight : 0 }]}
          >
            {/* ✅ FIXED: Autocomplete positioned ABOVE keyboard, attached to it */}
            <MentionAutocomplete
              text={commentText}
              cursorPosition={cursorPosition}
              onSelectMention={handleSelectMention}
              keyboardHeight={keyboardHeight}
            />

            {(replyingTo || editingComment) && (
              <View style={styles.replyingBanner}>
                <Text style={styles.replyingText}>
                  {editingComment 
                    ? 'Editando comentario' 
                    : `Respondiendo a ${replyingTo?.usuario?.username || replyingTo?.usuario?.nombre}`}
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
                    color="rgba(0, 0, 0, 0.5)"
                  />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputRow}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.inputAvatar} />
              ) : (
                <View style={[styles.inputAvatar, styles.avatarPlaceholder]}>
                  <Text style={[styles.avatarText, { fontSize: 14 }]}>
                    {user.nombre?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <TextInput
                ref={textInputRef}
                style={styles.input}
                placeholder={replyingTo ? 'Añade una respuesta...' : 'Añade un comentario...'}
                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                value={commentText}
                onChangeText={(text) => {
                  console.log('[CommentsModal v5.0] 📝 Text changed:', text);
                  setCommentText(text);
                }}
                onSelectionChange={(event) => {
                  const newPosition = event.nativeEvent.selection.start;
                  console.log('[CommentsModal v5.0] 📍 Cursor position changed to:', newPosition);
                  setCursorPosition(newPosition);
                }}
                multiline
                maxLength={500}
                editable={!sending}
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendComment}
                disabled={!commentText.trim() || sending}
                activeOpacity={0.7}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.sendButtonText, (!commentText.trim() || sending) && styles.sendButtonDisabled]}>
                    Publicar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </BlurView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTop: {
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingVertical: 16,
    paddingBottom: 120,
  },
  commentWrapper: {
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 4,
    marginBottom: 4,
  },
  pinnedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginRight: 6,
  },
  commentTime: {
    fontSize: 11,
    color: 'rgba(0, 0, 0, 0.5)',
  },
  commentOptionsButton: {
    padding: 4,
    marginLeft: 'auto',
  },
  commentText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 18,
    marginBottom: 4,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  commentActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    fontSize: 13,
    color: 'rgba(0, 0, 0, 0.5)',
    fontWeight: '600',
  },
  repliesContainer: {
    marginLeft: 46,
    marginTop: 4,
    paddingLeft: 0,
  },
  replyItem: {
    flexDirection: 'row',
    paddingVertical: 4,
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
    color: '#000',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.5)',
    marginTop: 8,
  },
  inputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  replyingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  replyingText: {
    fontSize: 13,
    color: 'rgba(0, 0, 0, 0.6)',
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
    backgroundColor: '#fff',
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 4,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    maxHeight: 80,
    paddingVertical: 8,
  },
  sendButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
