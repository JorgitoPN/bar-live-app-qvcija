
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  Keyboard,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useInteractionContext } from '@/hooks/useInteractionContext';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';
import ParsedText from '@/components/social/ParsedText';
import MentionAutocomplete, { MentionSuggestion } from '@/components/social/MentionAutocomplete';
import { processCommentHashtags, processCommentMentions } from '@/utils/postHelpers';
import { BlurView } from 'expo-blur';
import MiniFoodPlateAvatar from '@/components/common/MiniFoodPlateAvatar';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Comentario {
  id: string;
  autor_id: string;
  texto: string;
  created_at: string;
  likes: number;
  parent_comment_id?: string;
  tipo?: string;
  local_id?: string;
  autor?: {
    nombre: string;
    avatar?: string;
    username?: string;
  };
  liked?: boolean;
  replies?: Comentario[];
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
    fontSize: 18,
    fontWeight: '700',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  postCard: {
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
  postAutorBold: {
    fontWeight: '600',
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
  postImagen: {
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
  comentariosSection: {
    paddingTop: 8,
    paddingBottom: 100,
    backgroundColor: '#fff',
  },
  comentariosSectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  comentariosSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  comentarioItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  comentarioAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  comentarioContent: {
    flex: 1,
  },
  comentarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  comentarioAutor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  comentarioFecha: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.5)',
  },
  comentarioTexto: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
    marginBottom: 6,
  },
  comentarioActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  comentarioActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  comentarioActionText: {
    fontSize: 13,
    color: 'rgba(0, 0, 0, 0.5)',
    fontWeight: '600',
  },
  comentarioOptionsButton: {
    padding: 4,
    marginLeft: 'auto',
  },
  replyContainer: {
    marginLeft: 44,
    borderLeftWidth: 2,
    borderLeftColor: '#e0e0e0',
    paddingLeft: 12,
    backgroundColor: '#fff',
  },
  inputContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  autocompleteWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  replyingToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  replyingToText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(0, 0, 0, 0.6)',
  },
  cancelReplyButton: {
    padding: 4,
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
  textInput: {
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

function formatearFecha(fecha: string): string {
  const ahora = new Date();
  const fechaPost = new Date(fecha);
  const diffMs = ahora.getTime() - fechaPost.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMs / 3600000);
  const diffDias = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHoras < 24) return `${diffHoras}h`;
  if (diffDias < 7) return `${diffDias}d`;
  return fechaPost.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function PostDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { interactionUserId, interactionLocalId, isInteractingAsLocal } = useInteractionContext();
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<any>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [comentarioTexto, setComentarioTexto] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [replyingTo, setReplyingTo] = useState<Comentario | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        console.log('[PostDetail] ⌨️ Keyboard shown, height:', e.endCoordinates.height);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        console.log('[PostDetail] ⌨️ Keyboard hidden');
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const loadPost = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          autor:usuarios!posts_autor_id_fkey(nombre, avatar, username, perfil_privado),
          local:locales(nombre, imagen_url)
        `)
        .eq('id', params.id)
        .single();

      if (error) {
        console.error('[PostDetail] Error loading post:', error);
        Alert.alert('Error', 'No se pudo cargar la publicación');
        return;
      }

      let liked = false;
      if (interactionUserId) {
        let likeQuery = supabase
          .from('likes')
          .select('id')
          .eq('post_id', params.id)
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
          .eq('post_id', params.id)
          .eq('usuario_id', user.id)
          .single();
        
        saved = !!saveData;
      }

      const displayName = data.tipo === 'local' && data.local 
        ? data.local.nombre 
        : data.autor?.username 
          ? data.autor.username.replace(/^@/, '')
          : data.autor?.nombre || 'Usuario';

      const displayAvatar = data.tipo === 'local' && data.local 
        ? data.local.imagen_url 
        : data.autor?.avatar || '';

      const images = data.imagenes && data.imagenes.length > 0 
        ? data.imagenes 
        : data.imagen 
          ? [data.imagen] 
          : [];

      setPost({
        ...data,
        autorNombre: displayName,
        autorAvatar: displayAvatar,
        liked,
        saved,
        images,
      });
    } catch (error) {
      console.error('[PostDetail] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar la publicación');
    } finally {
      setLoading(false);
    }
  }, [params.id, user, interactionUserId, interactionLocalId, isInteractingAsLocal]);

  useEffect(() => {
    if (!params.id) return;

    const likesChannel = supabase
      .channel(`post-likes-${params.id}`)
      .on(
        'broadcast',
        { event: 'like_update' },
        (payload) => {
          console.log('[PostDetail] 🔄 Real-time like update received:', payload);
          if (payload.payload.postId === params.id && post) {
            setPost({
              ...post,
              likes: payload.payload.likesCount,
              liked: payload.payload.userId === interactionUserId ? payload.payload.liked : post.liked,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(likesChannel);
    };
  }, [params.id, post, interactionUserId]);

  const loadComentarios = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('comentarios')
        .select(`
          *,
          autor:usuarios!comentarios_autor_id_fkey(nombre, avatar, username),
          local:locales(nombre, imagen_url)
        `)
        .eq('post_id', params.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[PostDetail] Error loading comments:', error);
        return;
      }

      console.log('[PostDetail] Loaded comments for post:', params.id, 'Count:', data?.length || 0);

      const mappedComments = (data || []).map(comment => ({
        ...comment,
        autor: comment.tipo === 'local' && comment.local 
          ? {
              nombre: comment.local.nombre,
              avatar: comment.local.imagen_url,
              username: comment.local.nombre,
            }
          : comment.autor 
            ? {
                nombre: comment.autor.username 
                  ? comment.autor.username.replace(/^@/, '')
                  : comment.autor.nombre,
                avatar: comment.autor.avatar,
                username: comment.autor.username,
              }
            : {
                nombre: 'Usuario',
                avatar: undefined,
                username: undefined,
              },
      }));

      if (user && mappedComments.length > 0) {
        const commentsWithLikes = await Promise.all(
          mappedComments.map(async (comment) => {
            const { data: likeData } = await supabase
              .from('comment_likes')
              .select('id')
              .eq('comentario_id', comment.id)
              .eq('usuario_id', user.id)
              .single();
            
            return {
              ...comment,
              liked: !!likeData,
            };
          })
        );

        const parentComments = commentsWithLikes.filter(c => !c.parent_comment_id);
        const childComments = commentsWithLikes.filter(c => c.parent_comment_id);

        const organizedComments = parentComments.map(parent => ({
          ...parent,
          replies: childComments.filter(child => child.parent_comment_id === parent.id),
        }));

        setComentarios(organizedComments);
      } else {
        const parentComments = mappedComments.filter(c => !c.parent_comment_id);
        const childComments = mappedComments.filter(c => c.parent_comment_id);

        const organizedComments = parentComments.map(parent => ({
          ...parent,
          replies: childComments.filter(child => child.parent_comment_id === parent.id),
        }));

        setComentarios(organizedComments);
      }
    } catch (error) {
      console.error('[PostDetail] Error:', error);
    }
  }, [params.id, user]);

  useEffect(() => {
    if (params.id) {
      loadPost();
      loadComentarios();
    }
  }, [params.id, loadPost, loadComentarios]);

  const isLikingRef = useRef(false);

  const toggleLike = async () => {
    console.log('[PostDetail] toggleLike called');
    
    if (!interactionUserId) {
      console.log('[PostDetail] User not logged in, showing login modal');
      setLoginMessage('Para dar me gusta necesitas registrarte en BarLive');
      setShowLoginModal(true);
      return;
    }

    if (!post) {
      console.log('[PostDetail] No post data available');
      return;
    }

    if (isLikingRef.current) {
      console.log('[PostDetail] Like operation already in progress');
      return;
    }

    const isLiked = post.liked;
    const currentLikes = post.likes || 0;

    console.log('[PostDetail] Current like status:', isLiked, 'Likes:', currentLikes);

    isLikingRef.current = true;

    setPost({
      ...post,
      liked: !isLiked,
      likes: isLiked ? currentLikes - 1 : currentLikes + 1,
    });

    try {
      if (isLiked) {
        console.log('[PostDetail] Removing like');
        
        let deleteQuery = supabase
          .from('likes')
          .delete()
          .eq('post_id', params.id)
          .eq('usuario_id', interactionUserId);

        if (isInteractingAsLocal && interactionLocalId) {
          deleteQuery = deleteQuery.eq('local_id', interactionLocalId);
        } else {
          deleteQuery = deleteQuery.is('local_id', null);
        }

        const { error: deleteError } = await deleteQuery;
        
        if (deleteError) {
          console.error('[PostDetail] Error deleting like:', deleteError);
          throw deleteError;
        }
        
        const newLikesCount = Math.max(0, currentLikes - 1);
        
        const { error: updateError } = await supabase
          .from('posts')
          .update({ likes: newLikesCount })
          .eq('id', params.id);
        
        if (updateError) {
          console.error('[PostDetail] Error updating post likes:', updateError);
        }

        await supabase.channel(`post-likes-${params.id}`).send({
          type: 'broadcast',
          event: 'like_update',
          payload: {
            postId: params.id,
            likesCount: newLikesCount,
            liked: false,
            userId: interactionUserId,
          },
        });
      } else {
        console.log('[PostDetail] Adding like');
        
        const likeData: any = {
          post_id: params.id,
          usuario_id: interactionUserId,
        };

        if (isInteractingAsLocal && interactionLocalId) {
          likeData.local_id = interactionLocalId;
          likeData.tipo = 'local';
          console.log('[PostDetail] 🏢 Adding like as local:', interactionLocalId);
        } else {
          likeData.tipo = 'usuario';
          console.log('[PostDetail] 👤 Adding like as user');
        }
        
        const { error: insertError } = await supabase.from('likes').insert(likeData);
        
        if (insertError) {
          console.error('[PostDetail] Error inserting like:', insertError);
          throw insertError;
        }
        
        const newLikesCount = currentLikes + 1;
        
        const { error: updateError } = await supabase
          .from('posts')
          .update({ likes: newLikesCount })
          .eq('id', params.id);
        
        if (updateError) {
          console.error('[PostDetail] Error updating post likes:', updateError);
        }

        await supabase.channel(`post-likes-${params.id}`).send({
          type: 'broadcast',
          event: 'like_update',
          payload: {
            postId: params.id,
            likesCount: newLikesCount,
            liked: true,
            userId: interactionUserId,
          },
        });
      }
      
      console.log('[PostDetail] Like toggled successfully and broadcasted');
    } catch (error) {
      console.error('[PostDetail] Error toggling like:', error);
      setPost({
        ...post,
        liked: isLiked,
        likes: currentLikes,
      });
      Alert.alert('Error', 'No se pudo actualizar el me gusta');
    } finally {
      isLikingRef.current = false;
    }
  };

  const toggleSave = async () => {
    console.log('[PostDetail] toggleSave called');
    
    if (!user) {
      console.log('[PostDetail] User not logged in, showing login modal');
      setLoginMessage('Para guardar publicaciones necesitas registrarte en BarLive');
      setShowLoginModal(true);
      return;
    }

    if (!post) {
      console.log('[PostDetail] No post data available');
      return;
    }

    const isSaved = post.saved;
    console.log('[PostDetail] Current save status:', isSaved);

    setPost({
      ...post,
      saved: !isSaved,
    });

    try {
      if (isSaved) {
        console.log('[PostDetail] Removing save');
        const { error } = await supabase
          .from('posts_guardados')
          .delete()
          .eq('post_id', params.id)
          .eq('usuario_id', user.id);
        
        if (error) {
          console.error('[PostDetail] Error removing save:', error);
          throw error;
        }
      } else {
        console.log('[PostDetail] Adding save');
        const { error } = await supabase.from('posts_guardados').insert({
          post_id: params.id,
          usuario_id: user.id,
        });
        
        if (error) {
          console.error('[PostDetail] Error adding save:', error);
          throw error;
        }
      }
      
      console.log('[PostDetail] Save toggled successfully');
    } catch (error) {
      console.error('[PostDetail] Error toggling save:', error);
      setPost({
        ...post,
        saved: isSaved,
      });
      Alert.alert('Error', 'No se pudo guardar la publicación');
    }
  };

  const toggleCommentLike = async (comentarioId: string) => {
    if (!user) {
      setLoginMessage('Para dar me gusta necesitas registrarte en BarLive');
      setShowLoginModal(true);
      return;
    }

    let comment: Comentario | undefined;
    let isReply = false;
    let parentId: string | undefined;

    for (const c of comentarios) {
      if (c.id === comentarioId) {
        comment = c;
        break;
      }
      if (c.replies) {
        const reply = c.replies.find(r => r.id === comentarioId);
        if (reply) {
          comment = reply;
          isReply = true;
          parentId = c.id;
          break;
        }
      }
    }

    if (!comment) return;

    const isLiked = comment.liked;
    const currentLikes = comment.likes || 0;

    if (isReply && parentId) {
      setComentarios(comentarios.map(c => 
        c.id === parentId 
          ? {
              ...c,
              replies: c.replies?.map(r =>
                r.id === comentarioId
                  ? { ...r, liked: !isLiked, likes: isLiked ? currentLikes - 1 : currentLikes + 1 }
                  : r
              ),
            }
          : c
      ));
    } else {
      setComentarios(comentarios.map(c => 
        c.id === comentarioId 
          ? { ...c, liked: !isLiked, likes: isLiked ? currentLikes - 1 : currentLikes + 1 }
          : c
      ));
    }

    try {
      if (isLiked) {
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comentario_id', comentarioId)
          .eq('usuario_id', user.id);
        
        await supabase
          .from('comentarios')
          .update({ likes: Math.max(0, currentLikes - 1) })
          .eq('id', comentarioId);
      } else {
        await supabase.from('comment_likes').insert({
          comentario_id: comentarioId,
          usuario_id: user.id,
        });
        
        await supabase
          .from('comentarios')
          .update({ likes: currentLikes + 1 })
          .eq('id', comentarioId);
      }
    } catch (error) {
      console.error('[PostDetail] Error toggling comment like:', error);
      if (isReply && parentId) {
        setComentarios(comentarios.map(c => 
          c.id === parentId 
            ? {
                ...c,
                replies: c.replies?.map(r =>
                  r.id === comentarioId
                    ? { ...r, liked: isLiked, likes: currentLikes }
                    : r
                ),
              }
            : c
        ));
      } else {
        setComentarios(comentarios.map(c => 
          c.id === comentarioId 
            ? { ...c, liked: isLiked, likes: currentLikes }
            : c
        ));
      }
      Alert.alert('Error', 'No se pudo actualizar el me gusta');
    }
  };

  const handleCommentPress = () => {
    console.log('[PostDetail] Comment button pressed, focusing input');
    textInputRef.current?.focus();
  };

  const handleSelectMention = (mention: MentionSuggestion, mentionText: string) => {
    console.log('[PostDetail] ✅ Selected mention:', mention);
    
    const textBeforeCursor = comentarioTexto.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) return;

    const mentionUsername = mention.tipo === 'local' ? mention.nombre : mention.username;
    const newText = 
      comentarioTexto.substring(0, lastAtIndex) + 
      `@${mentionUsername} ` + 
      comentarioTexto.substring(cursorPosition);
    
    setComentarioTexto(newText);
    
    const newCursorPosition = lastAtIndex + mentionUsername.length + 2;
    setCursorPosition(newCursorPosition);
    
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 100);
  };

  const handleDeletePost = async () => {
    console.log('[PostDetail] Delete post');
    
    if (!user || !post) {
      console.log('[PostDetail] No user or post data');
      return;
    }

    const isOwner = post.tipo === 'usuario' 
      ? post.autor_id === user.id
      : post.tipo === 'local' && interactionLocalId === post.local_id;

    if (!isOwner) {
      Alert.alert('Error', 'Solo puedes eliminar tus propias publicaciones');
      return;
    }

    try {
      console.log('[PostDetail] Deleting post:', post.id);
      
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);

      if (error) {
        console.error('[PostDetail] Error deleting post:', error);
        throw error;
      }

      Alert.alert('Éxito', 'Publicación eliminada correctamente', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('[PostDetail] Error deleting post:', error);
      Alert.alert('Error', 'No se pudo eliminar la publicación');
    }
  };

  const enviarComentario = async () => {
    console.log('[PostDetail] enviarComentario called');
    
    if (!user) {
      console.log('[PostDetail] User not logged in');
      setLoginMessage('Para comentar necesitas registrarte en BarLive');
      setShowLoginModal(true);
      return;
    }

    if (!comentarioTexto.trim()) {
      console.log('[PostDetail] Empty comment text');
      return;
    }

    if (isSubmitting) {
      console.log('[PostDetail] Already submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('[PostDetail] Inserting comment:', comentarioTexto);
      console.log('[PostDetail] Active local profile:', interactionLocalId);
      console.log('[PostDetail] Is interacting as local:', isInteractingAsLocal);
      console.log('[PostDetail] User:', user?.id, user?.nombre);
      
      const commentData: any = {
        post_id: params.id,
        autor_id: user.id,
        texto: comentarioTexto,
        parent_comment_id: replyingTo?.id || null,
      };
      
      if (interactionLocalId) {
        commentData.tipo = 'local';
        commentData.local_id = interactionLocalId;
        console.log('[PostDetail] 🏢 Creating comment as local:', interactionLocalId);
      } else {
        commentData.tipo = 'usuario';
        console.log('[PostDetail] 👤 Creating comment as user');
      }
      
      const { data, error } = await supabase
        .from('comentarios')
        .insert(commentData)
        .select(`
          *,
          autor:usuarios!comentarios_autor_id_fkey(nombre, avatar, username),
          local:locales(nombre, imagen_url)
        `)
        .single();

      if (error) {
        console.error('[PostDetail] Error enviando comentario:', error);
        Alert.alert('Error', 'No se pudo enviar el comentario');
        return;
      }

      console.log('[PostDetail] Comment inserted successfully');
      
      if (data && comentarioTexto) {
        console.log('[PostDetail] 🏷️ Processing hashtags and mentions in comment...');
        await Promise.all([
          processCommentHashtags(data.id, comentarioTexto),
          processCommentMentions(data.id, comentarioTexto, params.id as string),
        ]);
        console.log('[PostDetail] ✅ Comment hashtags and mentions processed');
      }
      
      const mappedComment = {
        ...data,
        autor: data.tipo === 'local' && data.local 
          ? {
              nombre: data.local.nombre,
              avatar: data.local.imagen_url,
              username: data.local.nombre,
            }
          : data.autor 
            ? {
                nombre: data.autor.username 
                  ? data.autor.username.replace(/^@/, '')
                  : data.autor.nombre,
                avatar: data.autor.avatar,
                username: data.autor.username,
              }
            : {
                nombre: 'Usuario',
                avatar: undefined,
                username: undefined,
              },
        liked: false,
      };
      
      if (replyingTo) {
        setComentarios(comentarios.map(c =>
          c.id === replyingTo.id
            ? { ...c, replies: [...(c.replies || []), mappedComment] }
            : c
        ));
      } else {
        setComentarios([...comentarios, { ...mappedComment, replies: [] }]);
      }

      setComentarioTexto('');
      setReplyingTo(null);

      if (post) {
        setPost({
          ...post,
          comentarios: (post.comentarios || 0) + 1,
        });
      }

      const { error: updateError } = await supabase
        .from('posts')
        .update({ comentarios: (post?.comentarios || 0) + 1 })
        .eq('id', params.id);
      
      if (updateError) {
        console.error('[PostDetail] Error updating post comments count:', updateError);
      }
    } catch (error) {
      console.error('[PostDetail] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al enviar el comentario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    setCurrentImageIndex(index);
  };

  const renderComentario = (comentario: Comentario, isReply: boolean = false) => {
    const canDelete = user && (
      (comentario.tipo === 'usuario' && comentario.autor_id === user.id) ||
      (comentario.tipo === 'local' && interactionLocalId === comentario.local_id)
    );

    return (
      <View key={comentario.id}>
        <View style={styles.comentarioItem}>
          <TouchableOpacity
            onPress={() => {
              if (comentario.tipo === 'local' && comentario.local_id) {
                router.push(`/perfil/local?localId=${comentario.local_id}`);
              } else if (user && comentario.autor_id === user.id) {
                router.push('/(tabs)/perfil');
              } else {
                router.push(`/perfil/usuario?userId=${comentario.autor_id}`);
              }
            }}
            activeOpacity={0.7}
          >
            {comentario.autor?.avatar ? (
              <Image
                source={{ uri: comentario.autor.avatar }}
                style={styles.comentarioAvatar}
              />
            ) : (
              <View style={[styles.comentarioAvatar, styles.avatarPlaceholder]}>
                <Text style={[styles.avatarText, { fontSize: 14 }]}>
                  {comentario.autor?.nombre?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.comentarioContent}>
            <View style={styles.comentarioHeader}>
              <TouchableOpacity
                onPress={() => {
                  if (comentario.tipo === 'local' && comentario.local_id) {
                    router.push(`/perfil/local?localId=${comentario.local_id}`);
                  } else if (user && comentario.autor_id === user.id) {
                    router.push('/(tabs)/perfil');
                  } else {
                    router.push(`/perfil/usuario?userId=${comentario.autor_id}`);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.comentarioAutor}>
                  {comentario.autor?.nombre || 'Usuario'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.comentarioFecha}>
                {formatearFecha(comentario.created_at)}
              </Text>
              {canDelete && (
                <TouchableOpacity 
                  style={styles.comentarioOptionsButton}
                  onPress={() => {
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
                                .eq('id', comentario.id);

                              if (error) throw error;

                              if (isReply) {
                                setComentarios(comentarios.map(c => ({
                                  ...c,
                                  replies: c.replies?.filter(r => r.id !== comentario.id),
                                })));
                              } else {
                                setComentarios(comentarios.filter(c => c.id !== comentario.id));
                              }
                              
                              if (post) {
                                setPost({
                                  ...post,
                                  comentarios: (post.comentarios || 0) - 1,
                                });
                              }
                            } catch (error) {
                              console.error('[PostDetail] Error deleting comment:', error);
                              Alert.alert('Error', 'No se pudo eliminar el comentario');
                            }
                          },
                        },
                      ]
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <IconSymbol name="trash" size={16} color="rgba(0, 0, 0, 0.5)" />
                </TouchableOpacity>
              )}
            </View>
            <ParsedText text={comentario.texto} style={styles.comentarioTexto} />
            <View style={styles.comentarioActions}>
              <TouchableOpacity 
                style={styles.comentarioActionButton}
                onPress={() => toggleCommentLike(comentario.id)}
                activeOpacity={0.7}
              >
                {comentario.likes > 0 && (
                  <Text style={[styles.comentarioActionText, comentario.liked && { color: '#EF4444' }]}>
                    {comentario.likes} me gusta
                  </Text>
                )}
                {comentario.likes === 0 && (
                  <Text style={styles.comentarioActionText}>Me gusta</Text>
                )}
              </TouchableOpacity>
              {!isReply && (
                <TouchableOpacity 
                  style={styles.comentarioActionButton}
                  onPress={() => {
                    if (!user) {
                      setLoginMessage('Para responder necesitas registrarte en BarLive');
                      setShowLoginModal(true);
                      return;
                    }
                    setReplyingTo(comentario);
                    textInputRef.current?.focus();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.comentarioActionText}>Responder</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {!isReply && comentario.replies && comentario.replies.length > 0 && (
          <View style={styles.replyContainer}>
            {comentario.replies.map(reply => renderComentario(reply, true))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Publicación</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Publicación</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Text style={{ color: '#000' }}>Publicación no encontrada</Text>
        </View>
      </View>
    );
  }

  const totalCommentCount = comentarios.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={28} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Publicación</Text>
          {user && (
            (post.tipo === 'usuario' && post.autor_id === user.id) ||
            (post.tipo === 'local' && interactionLocalId === post.local_id)
          ) && (
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={() => {
                Alert.alert(
                  'Eliminar publicación',
                  '¿Estás seguro de que quieres eliminar esta publicación?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Eliminar',
                      style: 'destructive',
                      onPress: handleDeletePost,
                    },
                  ]
                );
              }}
              activeOpacity={0.7}
            >
              <IconSymbol name="trash" size={22} color={colors.headerText} />
            </TouchableOpacity>
          )}
          {!user || (
            (post.tipo !== 'usuario' || post.autor_id !== user.id) &&
            (post.tipo !== 'local' || interactionLocalId !== post.local_id)
          ) && <View style={{ width: 40 }} />}
        </View>
      </LinearGradient>

      <ScrollView 
        ref={scrollViewRef} 
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <TouchableOpacity
              style={styles.authorInfoRow}
              onPress={() => {
                if (post.tipo === 'local' && post.local_id) {
                  router.push(`/perfil/local?localId=${post.local_id}`);
                } else if (user && post.autor_id === user.id) {
                  router.push('/(tabs)/perfil');
                } else {
                  router.push(`/perfil/usuario?userId=${post.autor_id}`);
                }
              }}
              activeOpacity={0.7}
            >
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
            </TouchableOpacity>
          </View>

          {post.images && post.images.length > 0 && (
            <View style={styles.imageCarouselContainer}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={styles.imageCarousel}
              >
                {post.images.map((imageUrl: string, index: number) => (
                  <Image 
                    key={index} 
                    source={{ uri: imageUrl }} 
                    style={styles.postImagen} 
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

          <View style={styles.postActions}>
            <View style={styles.leftActions}>
              <TouchableOpacity 
                style={styles.postActionButton} 
                onPress={toggleLike}
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
                onPress={handleCommentPress}
                activeOpacity={0.7}
              >
                <IconSymbol 
                  ios_icon_name="message" 
                  android_material_icon_name="chat_bubble_outline" 
                  size={26} 
                  color="#000" 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.postActionButton} 
                onPress={() => {
                  if (!user) {
                    setLoginMessage('Para compartir necesitas registrarte en BarLive');
                    setShowLoginModal(true);
                    return;
                  }
                }}
                activeOpacity={0.7}
              >
                <IconSymbol name="paperplane" size={28} color="#000" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={styles.postActionButton} 
              onPress={toggleSave}
              activeOpacity={0.7}
            >
              <IconSymbol
                name={post.saved ? 'bookmark.fill' : 'bookmark'}
                size={28}
                color={post.saved ? colors.primary : '#000'}
              />
            </TouchableOpacity>
          </View>

          {post.likes > 0 && (
            <View style={styles.postLikes}>
              <Text style={styles.postLikesText}>
                <Text style={styles.postLikesBold}>{post.likes}</Text> Me gusta
              </Text>
            </View>
          )}

          {post.contenido && (
            <View style={styles.postDescripcion}>
              <Text style={styles.postDescripcionText}>
                <Text style={styles.postAutorBold}>{post.autorNombre}</Text>{' '}
                <ParsedText text={post.contenido} style={styles.postDescripcionText} />
              </Text>
            </View>
          )}

          {totalCommentCount > 0 && (
            <TouchableOpacity 
              style={styles.viewCommentsButton}
              onPress={handleCommentPress}
              activeOpacity={0.7}
            >
              <Text style={styles.viewCommentsText}>
                Ver {totalCommentCount === 1 ? 'el comentario' : `los ${totalCommentCount} comentarios`}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.postTimeContainer}>
            <Text style={styles.postTimeText}>{formatearFecha(post.created_at)}</Text>
          </View>
        </View>

        <View style={styles.comentariosSection}>
          {totalCommentCount > 0 && (
            <View style={styles.comentariosSectionHeader}>
              <Text style={styles.comentariosSectionTitle}>
                Comentarios
              </Text>
            </View>
          )}
          {comentarios.map((comentario) => renderComentario(comentario))}
        </View>
      </ScrollView>

      <BlurView 
        intensity={80} 
        tint="light" 
        style={[styles.inputContainer, { bottom: keyboardHeight > 0 ? keyboardHeight : 0 }]}
      >
        <View 
          style={[
            styles.autocompleteWrapper,
            { 
              bottom: 60,
            }
          ]}
          pointerEvents="box-none"
        >
          <MentionAutocomplete
            text={comentarioTexto}
            cursorPosition={cursorPosition}
            onSelectMention={handleSelectMention}
          />
        </View>
        
        {replyingTo && (
          <View style={styles.replyingToContainer}>
            <Text style={styles.replyingToText}>
              Respondiendo a {replyingTo.autor?.nombre || 'Usuario'}
            </Text>
            <TouchableOpacity
              style={styles.cancelReplyButton}
              onPress={() => setReplyingTo(null)}
            >
              <IconSymbol name="xmark.circle.fill" size={20} color="rgba(0, 0, 0, 0.5)" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputRow}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.inputAvatar} />
          ) : (
            <View style={[styles.inputAvatar, styles.avatarPlaceholder]}>
              <Text style={[styles.avatarText, { fontSize: 14 }]}>
                {user?.nombre?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <TextInput
            ref={textInputRef}
            style={styles.textInput}
            placeholder={replyingTo ? `Responder a ${replyingTo.autor?.nombre}...` : 'Añade un comentario...'}
            placeholderTextColor="rgba(0, 0, 0, 0.4)"
            value={comentarioTexto}
            onChangeText={(text) => {
              console.log('[PostDetail] 📝 Text changed:', text);
              setComentarioTexto(text);
            }}
            onSelectionChange={(event) => {
              const newPosition = event.nativeEvent.selection.start;
              console.log('[PostDetail] 📍 Cursor position changed to:', newPosition);
              setCursorPosition(newPosition);
            }}
            multiline
            editable={!isSubmitting}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={enviarComentario}
            disabled={!comentarioTexto.trim() || isSubmitting}
            activeOpacity={0.7}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.sendButtonText, (!comentarioTexto.trim() || isSubmitting) && styles.sendButtonDisabled]}>
                Publicar
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </BlurView>

      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message={loginMessage}
      />
    </View>
  );
}
