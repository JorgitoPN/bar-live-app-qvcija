
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  Keyboard,
  StatusBar,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useInteractionContext } from '@/hooks/useInteractionContext';
import ParsedText from '@/components/social/ParsedText';
import MentionAutocomplete, { MentionSuggestion } from '@/components/social/MentionAutocomplete';
import { processCommentHashtags, processCommentMentions } from '@/utils/postHelpers';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

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

interface PostViewerModalProps {
  visible: boolean;
  post: any;
  onClose: () => void;
  onUpdate?: () => void;
}

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

export default function PostViewerModal({
  visible,
  post: initialPost,
  onClose,
  onUpdate,
}: PostViewerModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { interactionUserId, interactionLocalId, isInteractingAsLocal } = useInteractionContext();
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  
  const [post, setPost] = useState<any>(initialPost);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [comentarioTexto, setComentarioTexto] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [replyingTo, setReplyingTo] = useState<Comentario | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        console.log('[PostViewerModal] ⌨️ Keyboard shown, height:', e.endCoordinates.height);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        console.log('[PostViewerModal] ⌨️ Keyboard hidden');
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const loadComentarios = useCallback(async () => {
    if (!post?.id) return;

    try {
      const { data, error } = await supabase
        .from('comentarios')
        .select(`
          *,
          autor:usuarios!comentarios_autor_id_fkey(nombre, avatar, username),
          local:locales(nombre, imagen_url)
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[PostViewerModal] Error loading comments:', error);
        return;
      }

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
      console.error('[PostViewerModal] Error:', error);
    }
  }, [post?.id, user]);

  useEffect(() => {
    if (visible && post?.id) {
      loadComentarios();
    }
  }, [visible, post?.id, loadComentarios]);

  const isLikingRef = useRef(false);

  const toggleLike = async () => {
    if (!interactionUserId) {
      Alert.alert('Inicia sesión', 'Para dar me gusta necesitas registrarte en BarLive');
      return;
    }

    if (!post) return;

    if (isLikingRef.current) return;

    const isLiked = post.user_has_liked;
    const currentLikes = post.likes_count || 0;

    isLikingRef.current = true;

    setPost({
      ...post,
      user_has_liked: !isLiked,
      likes_count: isLiked ? currentLikes - 1 : currentLikes + 1,
    });

    try {
      if (isLiked) {
        let deleteQuery = supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('usuario_id', interactionUserId);

        if (isInteractingAsLocal && interactionLocalId) {
          deleteQuery = deleteQuery.eq('local_id', interactionLocalId);
        } else {
          deleteQuery = deleteQuery.is('local_id', null);
        }

        const { error: deleteError } = await deleteQuery;
        
        if (deleteError) throw deleteError;
        
        const newLikesCount = Math.max(0, currentLikes - 1);
        
        await supabase
          .from('posts')
          .update({ likes: newLikesCount })
          .eq('id', post.id);

        await supabase.channel(`post-likes-${post.id}`).send({
          type: 'broadcast',
          event: 'like_update',
          payload: {
            postId: post.id,
            likesCount: newLikesCount,
            liked: false,
            userId: interactionUserId,
          },
        });
      } else {
        const likeData: any = {
          post_id: post.id,
          usuario_id: interactionUserId,
        };

        if (isInteractingAsLocal && interactionLocalId) {
          likeData.local_id = interactionLocalId;
          likeData.tipo = 'local';
        } else {
          likeData.tipo = 'usuario';
        }
        
        const { error: insertError } = await supabase.from('likes').insert(likeData);
        
        if (insertError) throw insertError;
        
        const newLikesCount = currentLikes + 1;
        
        await supabase
          .from('posts')
          .update({ likes: newLikesCount })
          .eq('id', post.id);

        await supabase.channel(`post-likes-${post.id}`).send({
          type: 'broadcast',
          event: 'like_update',
          payload: {
            postId: post.id,
            likesCount: newLikesCount,
            liked: true,
            userId: interactionUserId,
          },
        });
      }
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('[PostViewerModal] Error toggling like:', error);
      setPost({
        ...post,
        user_has_liked: isLiked,
        likes_count: currentLikes,
      });
      Alert.alert('Error', 'No se pudo actualizar el me gusta');
    } finally {
      isLikingRef.current = false;
    }
  };

  const toggleSave = async () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Para guardar publicaciones necesitas registrarte en BarLive');
      return;
    }

    if (!post) return;

    const isSaved = post.user_has_saved;

    setPost({
      ...post,
      user_has_saved: !isSaved,
    });

    try {
      if (isSaved) {
        await supabase
          .from('posts_guardados')
          .delete()
          .eq('post_id', post.id)
          .eq('usuario_id', user.id);
      } else {
        await supabase.from('posts_guardados').insert({
          post_id: post.id,
          usuario_id: user.id,
        });
      }
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('[PostViewerModal] Error toggling save:', error);
      setPost({
        ...post,
        user_has_saved: isSaved,
      });
      Alert.alert('Error', 'No se pudo guardar la publicación');
    }
  };

  const toggleCommentLike = async (comentarioId: string) => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Para dar me gusta necesitas registrarte en BarLive');
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
      console.error('[PostViewerModal] Error toggling comment like:', error);
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
    textInputRef.current?.focus();
  };

  const handleSelectMention = (mention: MentionSuggestion, mentionText: string) => {
    console.log('[PostViewerModal] ✅ Selected mention:', mention);
    
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

  const enviarComentario = async () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Para comentar necesitas registrarte en BarLive');
      return;
    }

    if (!comentarioTexto.trim()) return;

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const commentData: any = {
        post_id: post.id,
        autor_id: user.id,
        texto: comentarioTexto,
        parent_comment_id: replyingTo?.id || null,
      };
      
      if (interactionLocalId) {
        commentData.tipo = 'local';
        commentData.local_id = interactionLocalId;
      } else {
        commentData.tipo = 'usuario';
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
        console.error('[PostViewerModal] Error enviando comentario:', error);
        Alert.alert('Error', 'No se pudo enviar el comentario');
        return;
      }
      
      if (data && comentarioTexto) {
        await Promise.all([
          processCommentHashtags(data.id, comentarioTexto),
          processCommentMentions(data.id, comentarioTexto, post.id),
        ]);
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

      setPost({
        ...post,
        comentarios_count: (post.comentarios_count || 0) + 1,
      });

      await supabase
        .from('posts')
        .update({ comentarios: (post.comentarios_count || 0) + 1 })
        .eq('id', post.id);
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('[PostViewerModal] Error:', error);
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
                onClose();
                router.push(`/perfil/local?localId=${comentario.local_id}`);
              } else if (user && comentario.autor_id === user.id) {
                onClose();
                router.push('/(tabs)/perfil');
              } else {
                onClose();
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
                    onClose();
                    router.push(`/perfil/local?localId=${comentario.local_id}`);
                  } else if (user && comentario.autor_id === user.id) {
                    onClose();
                    router.push('/(tabs)/perfil');
                  } else {
                    onClose();
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
                              await supabase
                                .from('comentarios')
                                .delete()
                                .eq('id', comentario.id);

                              if (isReply) {
                                setComentarios(comentarios.map(c => ({
                                  ...c,
                                  replies: c.replies?.filter(r => r.id !== comentario.id),
                                })));
                              } else {
                                setComentarios(comentarios.filter(c => c.id !== comentario.id));
                              }
                              
                              setPost({
                                ...post,
                                comentarios_count: (post.comentarios_count || 0) - 1,
                              });
                              
                              if (onUpdate) onUpdate();
                            } catch (error) {
                              console.error('[PostViewerModal] Error deleting comment:', error);
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
                      Alert.alert('Inicia sesión', 'Para responder necesitas registrarte en BarLive');
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

  if (!post) return null;

  const totalCommentCount = comentarios.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);

  const displayName = post.tipo === 'local' && post.local 
    ? post.local.nombre 
    : post.autor?.username 
      ? post.autor.username.replace(/^@/, '')
      : post.autor?.nombre || 'Usuario';

  const displayAvatar = post.tipo === 'local' && post.local 
    ? post.local.imagen_url 
    : post.autor?.avatar || '';

  const images = post.imagenes && post.imagenes.length > 0 
    ? post.imagenes 
    : post.imagen 
      ? [post.imagen] 
      : [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={28} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Publicación</Text>
            <View style={{ width: 40 }} />
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
                    onClose();
                    router.push(`/perfil/local?localId=${post.local_id}`);
                  } else if (user && post.autor_id === user.id) {
                    onClose();
                    router.push('/(tabs)/perfil');
                  } else {
                    onClose();
                    router.push(`/perfil/usuario?userId=${post.autor_id}`);
                  }
                }}
                activeOpacity={0.7}
              >
                {displayAvatar ? (
                  <Image source={{ uri: displayAvatar }} style={styles.postAvatar} />
                ) : (
                  <View style={[styles.postAvatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>
                      {displayName?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
                <Text style={styles.postAutorNombre}>{displayName}</Text>
              </TouchableOpacity>
            </View>

            {images && images.length > 0 && (
              <View style={styles.imageCarouselContainer}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                  style={styles.imageCarousel}
                >
                  {images.map((imageUrl: string, index: number) => (
                    <Image 
                      key={index} 
                      source={{ uri: imageUrl }} 
                      style={styles.postImagen} 
                      resizeMode="cover" 
                    />
                  ))}
                </ScrollView>
                
                {images.length > 1 && (
                  <View style={styles.imageIndicatorContainer}>
                    {images.map((_: string, index: number) => (
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
                    name={post.user_has_liked ? 'heart.fill' : 'heart'}
                    size={28}
                    color={post.user_has_liked ? '#EF4444' : '#000'}
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
                      Alert.alert('Inicia sesión', 'Para compartir necesitas registrarte en BarLive');
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
                  name={post.user_has_saved ? 'bookmark.fill' : 'bookmark'}
                  size={28}
                  color={post.user_has_saved ? colors.primary : '#000'}
                />
              </TouchableOpacity>
            </View>

            {post.likes_count > 0 && (
              <View style={styles.postLikes}>
                <Text style={styles.postLikesText}>
                  <Text style={styles.postLikesBold}>{post.likes_count}</Text> Me gusta
                </Text>
              </View>
            )}

            {post.contenido && (
              <View style={styles.postDescripcion}>
                <Text style={styles.postDescripcionText}>
                  <Text style={styles.postAutorBold}>{displayName}</Text>{' '}
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
                console.log('[PostViewerModal] 📝 Text changed:', text);
                setComentarioTexto(text);
              }}
              onSelectionChange={(event) => {
                const newPosition = event.nativeEvent.selection.start;
                console.log('[PostViewerModal] 📍 Cursor position changed to:', newPosition);
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
