
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
  KeyboardAvoidingView,
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
import ReportModal from '@/components/social/ReportModal';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

/**
 * ✅ COMMENTS FULL SCREEN PAGE v327.0 - INCREASED KEYBOARD ELEVATION
 * 
 * NEW CHANGES v327.0:
 * - ✅ CRITICAL FIX: Increased keyboard elevation by adding 50px extra lift
 *   - Keyboard OPEN: bottom = keyboardHeight + 50 (input rises ABOVE keyboard with clearance)
 *   - Keyboard CLOSED: bottom = 0 (input sits at screen bottom)
 * - ✅ Ensures text field is FULLY VISIBLE and not partially covered by keyboard
 * - ✅ Provides comfortable typing space above keyboard
 * 
 * Previous changes v326.0:
 * - Manual elevation using bottom = keyboardHeight (input was at keyboard edge)
 * - Input could be partially obscured on some devices
 */

export default function ComentariosScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const postId = params.postId as string;
  const postAuthorId = params.postAuthorId as string;
  const insets = useSafeAreaInsets();

  const { user, ensureValidSession } = useAuth();
  const { interactionUserId, interactionLocalId, isInteractingAsLocal } = useInteractionContext();
  const textInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);

  useEffect(() => {
    console.log('[ComentariosScreen v327.0] 🎯 Comments page mounted as overlay');
    console.log('[ComentariosScreen v327.0] 📱 Bottom inset (system buttons):', insets.bottom);
    console.log('[ComentariosScreen v327.0] 🔧 Using MANUAL ELEVATION with +50px extra lift');
    
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const height = e.endCoordinates.height;
        console.log('[ComentariosScreen v327.0] ⌨️ Keyboard shown, height:', height);
        console.log('[ComentariosScreen v327.0] ✅ Elevating input by', height + 50, 'pixels (keyboard + 50px clearance)');
        setKeyboardHeight(height);
        setIsKeyboardVisible(true);
        
        // ✅ Scroll to bottom when keyboard opens so user can see input
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        console.log('[ComentariosScreen v327.0] ⌨️ Keyboard hidden');
        console.log('[ComentariosScreen v327.0] ✅ Resetting input to bottom: 0, paddingBottom:', insets.bottom);
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      console.log('[ComentariosScreen v327.0] 🔄 Comments page unmounting');
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [insets.bottom]);

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
      console.error('[ComentariosScreen v327.0] Error loading comments:', error);
      Alert.alert('Error', 'No se pudieron cargar los comentarios');
    } finally {
      setLoading(false);
    }
  }, [postId, user]);

  useEffect(() => {
    if (postId) {
      loadComments();
    }
  }, [postId, loadComments]);

  useEffect(() => {
    if (!postId) return;
    
    const subscription = supabase
      .channel(`post-deletion-${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'posts',
          filter: `id=eq.${postId}`,
        },
        () => {
          console.log('[ComentariosScreen v327.0] ⚠️ Post was deleted');
          Alert.alert(
            'Contenido Eliminado',
            'Esta publicación ha sido eliminada por su autor',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [postId, router]);

  const handleSelectMention = (mention: MentionSuggestion, mentionText: string) => {
    console.log('[ComentariosScreen v327.0] ✅ Selected mention:', mention);
    
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

    // ✅ CRITICAL FIX: Ensure we're working with a plain string, not an array
    // Convert to string first, then trim to remove whitespace
    let text = commentText;
    
    // If somehow commentText is an array, join it into a string
    if (Array.isArray(text)) {
      console.warn('[ComentariosScreen v327.0] ⚠️ commentText is an array, converting to string');
      text = text.join(' ');
    }
    
    // Ensure it's a string and trim it
    text = String(text).trim();
    
    if (!text) {
      console.warn('[ComentariosScreen v327.0] ⚠️ Comment text is empty after trimming');
      return;
    }
    
    setCommentText('');
    setSending(true);

    try {
      console.log('[ComentariosScreen v327.0] 🔄 Ensuring valid session before sending comment...');
      const validSession = await ensureValidSession();
      
      if (!validSession || !validSession.user) {
        console.error('[ComentariosScreen v327.0] ❌ No valid session available');
        Alert.alert(
          'Error de autenticación',
          'Tu sesión ha expirado o no tienes permisos. Por favor inicia sesión de nuevo.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Iniciar sesión', onPress: () => {
              router.push('/auth/login-v6');
            }}
          ]
        );
        setCommentText(text);
        setSending(false);
        return;
      }

      console.log('[ComentariosScreen v327.0] ✅ Valid session confirmed, user ID:', validSession.user.id);

      if (editingComment) {
        // ✅ Ensure texto is a string, not an array
        const { error } = await supabase
          .from('comentarios')
          .update({ texto: text })
          .eq('id', editingComment.id);

        if (error) throw error;

        setEditingComment(null);
        await loadComments();
      } else {
        // ✅ CRITICAL FIX: Build comment data with guaranteed string type for texto
        // This prevents PostgreSQL error 42883: function pg_catalog.substring(text[], integer) does not exist
        const commentData: any = {
          post_id: postId,
          autor_id: validSession.user.id,
          texto: text, // Already ensured to be a trimmed string above
          parent_comment_id: replyingTo?.id || null,
        };
        
        if (interactionLocalId) {
          commentData.tipo = 'local';
          commentData.local_id = interactionLocalId;
        } else {
          commentData.tipo = 'usuario';
        }

        console.log('[ComentariosScreen v327.0] 📝 Inserting comment with data:', commentData);
        console.log('[ComentariosScreen v327.0] 🔍 texto type:', typeof commentData.texto, 'value:', commentData.texto);
        console.log('[ComentariosScreen v327.0] 🔍 texto is array?', Array.isArray(commentData.texto));

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
          console.error('[ComentariosScreen v327.0] ❌ Error inserting comment:', error);
          throw error;
        }

        console.log('[ComentariosScreen v327.0] ✅ Comment inserted successfully:', newComment.id);

        if (newComment && text) {
          console.log('[ComentariosScreen v327.0] 🏷️ Processing hashtags and mentions in comment...');
          await Promise.all([
            processCommentHashtags(newComment.id, text),
            processCommentMentions(newComment.id, text, postId),
          ]);
          console.log('[ComentariosScreen v327.0] ✅ Comment hashtags and mentions processed');
        }

        if (replyingTo) {
          await loadComments();
          setReplyingTo(null);
        } else {
          setComments(prev => [{ ...newComment, likes_count: 0, user_has_liked: false, replies: [] }, ...prev]);
        }
      }
    } catch (error: any) {
      console.error('[ComentariosScreen v327.0] ❌ Error sending comment:', error);
      
      let errorMessage = 'No se pudo enviar el comentario';
      
      if (error?.code === '42501') {
        errorMessage = 'Error de autenticación. Tu sesión ha expirado o no tienes permisos. Por favor inicia sesión de nuevo.';
      } else if (error?.code === '42883') {
        errorMessage = 'Error de formato de datos. Por favor intenta de nuevo.';
        console.error('[ComentariosScreen v327.0] ❌ PostgreSQL substring error - data type mismatch');
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
      console.error('[ComentariosScreen v327.0] Error toggling like:', error);
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

    const isOwnComment = comment.autor_id === user.id;
    const deleteMessage = isOwnComment 
      ? '¿Estás seguro de que quieres eliminar tu comentario?'
      : '¿Estás seguro de que quieres eliminar este comentario de tu publicación?';

    Alert.alert(
      'Eliminar comentario',
      deleteMessage,
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
              
              if (!isOwnComment) {
                Alert.alert('Éxito', 'Comentario eliminado correctamente');
              }
            } catch (error) {
              console.error('[ComentariosScreen v327.0] Error deleting comment:', error);
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
      console.error('[ComentariosScreen v327.0] Error pinning comment:', error);
      Alert.alert('Error', 'No se pudo fijar el comentario');
    }
  };

  const handleReportComment = useCallback((comment: Comment) => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para reportar contenido');
      return;
    }

    setReportingCommentId(comment.id);
    setShowReportModal(true);
  }, [user]);

  const showCommentOptions = (comment: Comment) => {
    const isOwner = comment.autor_id === user?.id;
    const isPostOwner = postAuthorId === user?.id;

    const options: string[] = [];
    const actions: (() => void)[] = [];

    if (!isOwner) {
      options.push('Reportar');
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

  const closeIconSize = Platform.OS === 'android' ? scaleIconSize(24) : 24;
  const emptyIconSize = Platform.OS === 'android' ? scaleIconSize(64) : 64;
  const pinIconSize = Platform.OS === 'android' ? scaleIconSize(12) : 12;
  const moreIconSize = Platform.OS === 'android' ? scaleIconSize(16) : 16;
  const moreIconSizeReply = Platform.OS === 'android' ? scaleIconSize(14) : 14;
  const cancelIconSize = Platform.OS === 'android' ? scaleIconSize(20) : 20;
  const avatarSize = Platform.OS === 'android' ? scaleIconSize(36) : 36;
  const avatarRadius = avatarSize / 2;
  const replyAvatarSize = Platform.OS === 'android' ? scaleIconSize(28) : 28;
  const replyAvatarRadius = replyAvatarSize / 2;
  const avatarTextSize = Platform.OS === 'android' ? scaleFontSize(14) : 14;
  const replyAvatarTextSize = Platform.OS === 'android' ? scaleFontSize(12) : 12;
  const inputAvatarSize = Platform.OS === 'android' ? scaleIconSize(32) : 32;
  const inputAvatarRadius = inputAvatarSize / 2;
  const inputAvatarTextSize = Platform.OS === 'android' ? scaleFontSize(14) : 14;

  // ✅ v327.0: INCREASED KEYBOARD ELEVATION
  // Added 50px extra lift to ensure input is FULLY VISIBLE above keyboard
  // Keyboard OPEN: bottom = keyboardHeight + 50 (input rises well above keyboard)
  // Keyboard CLOSED: bottom = 0 (input sits at screen bottom)
  const inputContainerBottom = useMemo(() => {
    const bottomValue = isKeyboardVisible ? keyboardHeight + 50 : 0;
    console.log('[ComentariosScreen v327.0] 📐 Input container bottom:', bottomValue, 
      '(keyboard:', isKeyboardVisible ? 'OPEN' : 'CLOSED', ')');
    return bottomValue;
  }, [isKeyboardVisible, keyboardHeight]);

  // ✅ v327.0: DYNAMIC PADDING FOR CONTENT INSIDE INPUT CONTAINER
  // Keyboard OPEN: paddingBottom = 8 (minimal, input is already elevated)
  // Keyboard CLOSED: paddingBottom = insets.bottom (aligns with system buttons)
  const inputContainerPaddingBottom = useMemo(() => {
    const paddingValue = isKeyboardVisible ? 8 : insets.bottom;
    console.log('[ComentariosScreen v327.0] 📐 Input container paddingBottom:', paddingValue, 
      '(keyboard:', isKeyboardVisible ? 'OPEN' : 'CLOSED', ')');
    return paddingValue;
  }, [isKeyboardVisible, insets.bottom]);

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
              size={pinIconSize}
              color={colors.primary}
            />
            <Text style={[styles.pinnedText, { fontSize: scaleFontSize(12) }]}>Fijado</Text>
          </View>
        )}
        <View style={styles.commentItem}>
          {displayAvatar ? (
            <Image source={{ uri: displayAvatar }} style={[styles.commentAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarRadius }]} />
          ) : (
            <View style={[styles.commentAvatar, styles.avatarPlaceholder, { width: avatarSize, height: avatarSize, borderRadius: avatarRadius }]}>
              <Text style={[styles.avatarText, { fontSize: avatarTextSize }]}>
                {displayName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View style={styles.commentContent}>
            <View style={styles.commentHeader}>
              <Text style={[styles.commentUsername, { fontSize: scaleFontSize(13) }]}>{displayName}</Text>
              <Text style={[styles.commentTime, { fontSize: scaleFontSize(11) }]}>{formatTimeAgo(item.created_at)}</Text>
              <TouchableOpacity 
                style={styles.commentOptionsButton}
                onPress={() => showCommentOptions(item)}
                activeOpacity={0.7}
              >
                <IconSymbol ios_icon_name="ellipsis" android_material_icon_name="more_horiz" size={moreIconSize} color="rgba(0, 0, 0, 0.5)" />
              </TouchableOpacity>
            </View>
            <ParsedText text={item.texto} style={[styles.commentText, { fontSize: scaleFontSize(14) }]} />
            <View style={styles.commentActions}>
              <TouchableOpacity 
                style={styles.commentActionButton}
                onPress={() => handleLikeComment(item)}
                activeOpacity={0.7}
              >
                {item.likes_count && item.likes_count > 0 ? (
                  <Text style={[styles.commentActionText, { fontSize: scaleFontSize(13) }, item.user_has_liked && { color: '#EF4444' }]}>
                    {item.likes_count} me gusta
                  </Text>
                ) : (
                  <Text style={[styles.commentActionText, { fontSize: scaleFontSize(13) }]}>Me gusta</Text>
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
                <Text style={[styles.commentActionText, { fontSize: scaleFontSize(13) }]}>Responder</Text>
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
                    <Image source={{ uri: replyDisplayAvatar }} style={[styles.replyAvatar, { width: replyAvatarSize, height: replyAvatarSize, borderRadius: replyAvatarRadius }]} />
                  ) : (
                    <View style={[styles.replyAvatar, styles.avatarPlaceholder, { width: replyAvatarSize, height: replyAvatarSize, borderRadius: replyAvatarRadius }]}>
                      <Text style={[styles.avatarText, { fontSize: replyAvatarTextSize }]}>
                        {replyDisplayName?.charAt(0).toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={[styles.commentUsername, { fontSize: scaleFontSize(13) }]}>{replyDisplayName}</Text>
                      <Text style={[styles.commentTime, { fontSize: scaleFontSize(11) }]}>{formatTimeAgo(reply.created_at)}</Text>
                      <TouchableOpacity 
                        style={styles.commentOptionsButton}
                        onPress={() => showCommentOptions(reply)}
                        activeOpacity={0.7}
                      >
                        <IconSymbol ios_icon_name="ellipsis" android_material_icon_name="more_horiz" size={moreIconSizeReply} color="rgba(0, 0, 0, 0.5)" />
                      </TouchableOpacity>
                    </View>
                    <ParsedText text={reply.texto} style={[styles.commentText, { fontSize: scaleFontSize(14) }]} />
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
        size={emptyIconSize}
        color={colors.textSecondary}
      />
      <Text style={[styles.emptyText, { fontSize: scaleFontSize(18) }]}>No hay comentarios aún</Text>
      <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14) }]}>Sé el primero en comentar</Text>
    </View>
  );

  // ✅ Calculate proper padding for list to account for input container
  // Ensure last comment is not hidden by input box when keyboard is closed
  const listPaddingBottom = useMemo(() => {
    if (Platform.OS === 'android') {
      // Add enough padding so last comment is visible above input container
      return isKeyboardVisible ? 100 : Math.max(insets.bottom, 0) + 140;
    }
    return isKeyboardVisible ? 80 : 120;
  }, [isKeyboardVisible, insets.bottom]);

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
        }} 
      />
      
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
        
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity 
              onPress={() => {
                console.log('[ComentariosScreen v327.0] ⬅️ Back button pressed');
                console.log('[ComentariosScreen v327.0] ✅ Popping comments page - PostViewerModal will be revealed with preserved state');
                router.back();
              }} 
              style={styles.backButton}
            >
              <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={closeIconSize} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { fontSize: scaleFontSize(18) }]}>Comentarios</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: listPaddingBottom }
            ]}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {user && (
          <>
            <MentionAutocomplete
              text={commentText}
              cursorPosition={cursorPosition}
              onSelectMention={handleSelectMention}
              keyboardHeight={keyboardHeight}
            />

            <BlurView 
              intensity={80} 
              tint="light" 
              style={[
                styles.inputContainer, 
                { 
                  bottom: inputContainerBottom,
                  paddingBottom: inputContainerPaddingBottom 
                }
              ]}
            >
              {(replyingTo || editingComment) && (
                <View style={styles.replyingBanner}>
                  <Text style={[styles.replyingText, { fontSize: scaleFontSize(13) }]}>
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
                      size={cancelIconSize}
                      color="rgba(0, 0, 0, 0.5)"
                    />
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.inputRow}>
                {user.avatar ? (
                  <Image source={{ uri: user.avatar }} style={[styles.inputAvatar, { width: inputAvatarSize, height: inputAvatarSize, borderRadius: inputAvatarRadius }]} />
                ) : (
                  <View style={[styles.inputAvatar, styles.avatarPlaceholder, { width: inputAvatarSize, height: inputAvatarSize, borderRadius: inputAvatarRadius }]}>
                    <Text style={[styles.avatarText, { fontSize: inputAvatarTextSize }]}>
                      {user.nombre?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
                <TextInput
                  ref={textInputRef}
                  style={[styles.input, { fontSize: scaleFontSize(14) }]}
                  placeholder={replyingTo ? 'Añade una respuesta...' : 'Añade un comentario...'}
                  placeholderTextColor="rgba(0, 0, 0, 0.4)"
                  value={commentText}
                  onChangeText={(text) => {
                    console.log('[ComentariosScreen v327.0] 📝 Text changed:', text);
                    setCommentText(text);
                  }}
                  onSelectionChange={(event) => {
                    const newPosition = event.nativeEvent.selection.start;
                    console.log('[ComentariosScreen v327.0] 📍 Cursor position changed to:', newPosition);
                    setCursorPosition(newPosition);
                  }}
                  onFocus={() => {
                    console.log('[ComentariosScreen v327.0] 🎯 Input focused - scrolling to show input field');
                    setTimeout(() => {
                      flatListRef.current?.scrollToEnd({ animated: true });
                    }, 300);
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
                    <Text style={[styles.sendButtonText, { fontSize: scaleFontSize(15) }, (!commentText.trim() || sending) && styles.sendButtonDisabled]}>
                      Publicar
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </BlurView>
          </>
        )}

        {reportingCommentId && (
          <ReportModal
            visible={showReportModal}
            contentType="comment"
            contentId={reportingCommentId}
            onClose={() => {
              setShowReportModal(false);
              setReportingCommentId(null);
            }}
          />
        )}
      </KeyboardAvoidingView>
    </>
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
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
    fontWeight: '600',
    color: colors.primary,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  commentAvatar: {
    marginRight: 10,
  },
  replyAvatar: {
    marginRight: 10,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
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
    fontWeight: '600',
    color: '#000',
    marginRight: 6,
  },
  commentTime: {
    color: 'rgba(0, 0, 0, 0.5)',
  },
  commentOptionsButton: {
    padding: 4,
    marginLeft: 'auto',
  },
  commentText: {
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
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptySubtext: {
    color: 'rgba(0, 0, 0, 0.5)',
    marginTop: 8,
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    marginBottom: 0,
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
    color: 'rgba(0, 0, 0, 0.6)',
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#fff',
  },
  inputAvatar: {
    marginBottom: 4,
  },
  input: {
    flex: 1,
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
    fontWeight: '700',
    color: colors.primary,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
