
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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';

const { width } = Dimensions.get('window');

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

interface ChatUser {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  postCard: {
    backgroundColor: colors.cardBackground,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  postAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  postAutorInfo: {
    flex: 1,
  },
  postAutorNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  postFecha: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  postOptionsButton: {
    padding: 8,
  },
  imageCarouselContainer: {
    position: 'relative',
  },
  imageCarousel: {
    width: width,
  },
  postImagen: {
    width: width,
    height: width,
    backgroundColor: colors.cardBorder,
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
    backgroundColor: 'rgba(255, 255, 255, 1)',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  imageCountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.headerText,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  postActionButton: {
    marginRight: 18,
    padding: 4,
  },
  postActionButtonRight: {
    marginLeft: 'auto',
    padding: 4,
  },
  postLikes: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  postLikesText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  postDescripcion: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  postDescripcionText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  comentariosSection: {
    padding: 16,
  },
  comentariosSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  comentarioItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  comentarioAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginRight: 8,
  },
  comentarioFecha: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  comentarioTexto: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  comentarioActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  comentarioActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  comentarioActionText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  comentarioOptionsButton: {
    padding: 4,
    marginLeft: 'auto',
  },
  replyContainer: {
    marginLeft: 48,
    marginTop: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: colors.cardBorder,
  },
  comentarioInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
  },
  comentarioInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
  },
  comentarioSendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comentarioSendButtonDisabled: {
    opacity: 0.5,
  },
  replyingToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  replyingToText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  cancelReplyButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  postOptionsModal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '80%',
  },
  postOptionsHeader: {
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  postOptionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  postOptionsContent: {
    padding: 16,
  },
  postOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.cardBackground,
  },
  postOptionText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 16,
  },
  postOptionDanger: {
    color: '#EF4444',
  },
  userListContainer: {
    maxHeight: 400,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.cardBackground,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  userUsername: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  searchInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchResults: {
    maxHeight: 300,
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
  const { activeLocalProfileId, isInteractingAsLocal } = useMode();
  const scrollViewRef = useRef<ScrollView>(null);
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<any>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [comentarioTexto, setComentarioTexto] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comentario | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);

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
      if (user) {
        const { data: likeData } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', params.id)
          .eq('usuario_id', user.id)
          .single();
        
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
        : data.autor?.nombre || 'Usuario';
      const displayAvatar = data.tipo === 'local' && data.local 
        ? data.local.imagen_url 
        : data.autor?.avatar || '';

      // Get images array - prioritize imagenes array, fallback to imagen field
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
  }, [params.id, user]);

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
          : comment.autor,
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

  const handleShare = useCallback(() => {
    console.log('[PostDetail] Share button pressed - opening user search directly');
    
    if (!user) {
      setLoginMessage('Para compartir por mensaje necesitas registrarte en BarLive');
      setShowLoginModal(true);
      return;
    }

    setShowUserList(true);
  }, [user]);

  useEffect(() => {
    if (params.id) {
      loadPost();
      loadComentarios();
    }

    if (params.share === 'true') {
      setTimeout(() => {
        handleShare();
      }, 500);
    }
  }, [params.id, loadPost, loadComentarios, params.share, handleShare]);

  const isLikingRef = useRef(false);

  const toggleLike = async () => {
    console.log('[PostDetail] toggleLike called');
    
    if (!user) {
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
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', params.id)
          .eq('usuario_id', user.id);
        
        if (deleteError) {
          console.error('[PostDetail] Error deleting like:', deleteError);
          throw deleteError;
        }
        
        const { error: updateError } = await supabase
          .from('posts')
          .update({ likes: Math.max(0, currentLikes - 1) })
          .eq('id', params.id);
        
        if (updateError) {
          console.error('[PostDetail] Error updating post likes:', updateError);
        }
      } else {
        console.log('[PostDetail] Adding like');
        
        const { data: existingLike } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', params.id)
          .eq('usuario_id', user.id)
          .single();
        
        if (existingLike) {
          console.log('[PostDetail] Like already exists, skipping insert');
          setPost({
            ...post,
            liked: true,
            likes: currentLikes,
          });
          isLikingRef.current = false;
          return;
        }
        
        const { error: insertError } = await supabase.from('likes').insert({
          post_id: params.id,
          usuario_id: user.id,
        });
        
        if (insertError) {
          console.error('[PostDetail] Error inserting like:', insertError);
          throw insertError;
        }
        
        const { error: updateError } = await supabase
          .from('posts')
          .update({ likes: currentLikes + 1 })
          .eq('id', params.id);
        
        if (updateError) {
          console.error('[PostDetail] Error updating post likes:', updateError);
        }
      }
      
      console.log('[PostDetail] Like toggled successfully');
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
    console.log('[PostDetail] Comment button pressed, scrolling to bottom');
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const searchUsers = async (query: string) => {
    if (!user || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, username, avatar')
        .or(`nombre.ilike.%${query}%,username.ilike.%${query}%`)
        .neq('id', user.id)
        .eq('activo', true)
        .limit(20);

      if (error) throw error;

      setSearchResults(data || []);
    } catch (error) {
      console.error('[PostDetail] Error searching users:', error);
    }
  };

  const handleSendToUser = async (recipientId: string) => {
    if (!user || !post) return;

    try {
      if (post.autor?.perfil_privado) {
        const { data: followData } = await supabase
          .from('seguidores')
          .select('id')
          .eq('seguidor_id', recipientId)
          .eq('seguido_id', post.autor_id)
          .single();

        if (!followData) {
          Alert.alert(
            'Perfil Privado',
            'Esta publicación pertenece a un perfil privado. Solo los seguidores pueden verla.'
          );
          return;
        }
      }

      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .or(`and(usuario1_id.eq.${user.id},usuario2_id.eq.${recipientId}),and(usuario1_id.eq.${recipientId},usuario2_id.eq.${user.id})`)
        .single();

      let chatId = existingChat?.id;

      if (!chatId) {
        const { data: newChat, error: chatError } = await supabase
          .from('chats')
          .insert({
            usuario1_id: user.id,
            usuario2_id: recipientId,
          })
          .select('id')
          .single();

        if (chatError) throw chatError;
        chatId = newChat.id;
      }

      // Use first image for preview
      const previewImage = post.images && post.images.length > 0 ? post.images[0] : null;

      const { error: messageError } = await supabase
        .from('mensajes')
        .insert({
          chat_id: chatId,
          remitente_id: user.id,
          contenido: `Compartió una publicación de ${post.autorNombre}`,
          tipo_mensaje: 'post_compartido',
          post_compartido_id: post.id,
          post_imagen: previewImage,
        });

      if (messageError) throw messageError;

      await supabase
        .from('chats')
        .update({
          ultimo_mensaje: 'Publicación compartida',
          ultimo_mensaje_fecha: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', chatId);

      await supabase.from('notificaciones').insert({
        usuario_id: recipientId,
        tipo: 'mensaje_privado',
        titulo: 'Nuevo mensaje',
        mensaje: `${user.nombre} te compartió una publicación`,
        usuario_origen_id: user.id,
        post_id: post.id,
      });

      setShowUserList(false);
      setSearchQuery('');
      setSearchResults([]);
      Alert.alert('Éxito', 'Publicación compartida correctamente');
    } catch (error) {
      console.error('[PostDetail] Error sending message:', error);
      Alert.alert('Error', 'No se pudo compartir la publicación');
    }
  };

  const handleDeletePost = async () => {
    console.log('[PostDetail] Delete post');
    
    if (!user || !post) {
      console.log('[PostDetail] No user or post data');
      return;
    }

    const isOwner = post.tipo === 'usuario' 
      ? post.autor_id === user.id
      : post.tipo === 'local' && activeLocalProfileId === post.local_id;

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
      console.log('[PostDetail] Active local profile:', activeLocalProfileId);
      console.log('[PostDetail] Is interacting as local:', isInteractingAsLocal);
      console.log('[PostDetail] User:', user?.id, user?.nombre);
      
      const commentData: any = {
        post_id: params.id,
        autor_id: user.id,
        texto: comentarioTexto,
        parent_comment_id: replyingTo?.id || null,
      };
      
      if (activeLocalProfileId) {
        commentData.tipo = 'local';
        commentData.local_id = activeLocalProfileId;
        console.log('[PostDetail] 🏢 Creating comment as local:', activeLocalProfileId);
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
      
      const mappedComment = {
        ...data,
        autor: data.tipo === 'local' && data.local 
          ? {
              nombre: data.local.nombre,
              avatar: data.local.imagen_url,
              username: data.local.nombre,
            }
          : data.autor,
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
      (comentario.tipo === 'local' && activeLocalProfileId === comentario.local_id)
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
                  <IconSymbol name="trash" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.comentarioTexto}>{comentario.texto}</Text>
            <View style={styles.comentarioActions}>
              <TouchableOpacity 
                style={styles.comentarioActionButton}
                onPress={() => toggleCommentLike(comentario.id)}
                activeOpacity={0.7}
              >
                <IconSymbol 
                  name={comentario.liked ? 'heart.fill' : 'heart'} 
                  size={24} 
                  color={comentario.liked ? '#EF4444' : colors.textSecondary} 
                />
                <Text style={styles.comentarioActionText}>{comentario.likes || 0}</Text>
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
                    scrollViewRef.current?.scrollToEnd({ animated: true });
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
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Publicación</Text>
          <View style={{ width: 24 }} />
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
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Publicación</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.text }}>Publicación no encontrada</Text>
        </View>
      </View>
    );
  }

  const totalCommentCount = comentarios.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Publicación</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView ref={scrollViewRef} keyboardShouldPersistTaps="handled">
          <View style={styles.postCard}>
            <View style={styles.postHeader}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
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
                <View style={styles.postAutorInfo}>
                  <Text style={styles.postAutorNombre}>{post.autorNombre}</Text>
                  <Text style={styles.postFecha}>{formatearFecha(post.created_at)}</Text>
                </View>
              </TouchableOpacity>
              {user && (
                (post.tipo === 'usuario' && post.autor_id === user.id) ||
                (post.tipo === 'local' && activeLocalProfileId === post.local_id)
              ) && (
                <TouchableOpacity 
                  style={styles.postOptionsButton} 
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
                  <IconSymbol name="trash" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
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

                {post.images.length > 1 && (
                  <View style={styles.imageCountBadge}>
                    <Text style={styles.imageCountText}>
                      {currentImageIndex + 1}/{post.images.length}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.postActions}>
              <TouchableOpacity 
                style={styles.postActionButton} 
                onPress={toggleLike}
                activeOpacity={0.7}
              >
                <IconSymbol
                  name={post.liked ? 'heart.fill' : 'heart'}
                  size={26}
                  color={post.liked ? '#EF4444' : colors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.postActionButton}
                onPress={handleCommentPress}
                activeOpacity={0.7}
              >
                <IconSymbol name="message" size={26} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.postActionButton} 
                onPress={handleShare}
                activeOpacity={0.7}
              >
                <IconSymbol name="paperplane" size={26} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.postActionButtonRight} 
                onPress={toggleSave}
                activeOpacity={0.7}
              >
                <IconSymbol
                  name={post.saved ? 'bookmark.fill' : 'bookmark'}
                  size={26}
                  color={post.saved ? colors.primary : colors.text}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.postLikes}>
              <Text style={styles.postLikesText}>{post.likes || 0} me gusta</Text>
            </View>

            {post.contenido && (
              <View style={styles.postDescripcion}>
                <Text style={styles.postDescripcionText}>
                  <Text style={{ fontWeight: '600' }}>{post.autorNombre}</Text> {post.contenido}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.comentariosSection}>
            <Text style={styles.comentariosSectionTitle}>
              Comentarios ({totalCommentCount})
            </Text>
            {comentarios.map((comentario) => renderComentario(comentario))}
          </View>
        </ScrollView>

        {replyingTo && (
          <View style={styles.replyingToContainer}>
            <Text style={styles.replyingToText}>
              Respondiendo a {replyingTo.autor?.nombre || 'Usuario'}
            </Text>
            <TouchableOpacity
              style={styles.cancelReplyButton}
              onPress={() => setReplyingTo(null)}
            >
              <IconSymbol name="xmark.circle.fill" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.comentarioInputContainer}>
          <TextInput
            style={styles.comentarioInput}
            placeholder={replyingTo ? `Responder a ${replyingTo.autor?.nombre}...` : 'Añade un comentario...'}
            placeholderTextColor={colors.textSecondary}
            value={comentarioTexto}
            onChangeText={setComentarioTexto}
            multiline
            editable={!isSubmitting}
          />
          <TouchableOpacity
            style={[
              styles.comentarioSendButton,
              (!comentarioTexto.trim() || isSubmitting) && styles.comentarioSendButtonDisabled
            ]}
            onPress={enviarComentario}
            disabled={!comentarioTexto.trim() || isSubmitting}
            activeOpacity={0.7}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.headerText} />
            ) : (
              <IconSymbol name="paperplane.fill" size={18} color={colors.headerText} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showUserList}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowUserList(false);
          setSearchQuery('');
          setSearchResults([]);
        }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: colors.background }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.header}
          >
            <TouchableOpacity onPress={() => {
              setShowUserList(false);
              setSearchQuery('');
              setSearchResults([]);
            }} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Enviar a...</Text>
            <View style={{ width: 24 }} />
          </LinearGradient>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar usuario..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                searchUsers(text);
              }}
              autoFocus
            />
          </View>

          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.userItem}
                onPress={() => handleSendToUser(item.id)}
                activeOpacity={0.7}
              >
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.userAvatar} />
                ) : (
                  <View style={[styles.userAvatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>
                      {item.nombre.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.nombre}</Text>
                  {item.username && (
                    <Text style={styles.userUsername}>@{item.username}</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              searchQuery.trim().length >= 2 ? (
                <Text style={styles.emptyText}>
                  No se encontraron usuarios
                </Text>
              ) : (
                <Text style={styles.emptyText}>
                  Escribe el nombre de un usuario para buscar
                </Text>
              )
            }
          />
        </KeyboardAvoidingView>
      </Modal>

      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message={loginMessage}
      />
    </View>
  );
}
