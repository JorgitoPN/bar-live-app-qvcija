
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import MiniAvatarWithMomento from '@/components/momento/MiniAvatarWithMomento';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PostViewerModal from './PostViewerModal';
import CommentsModal from './CommentsModal';
import SharePostModal from './SharePostModal';
import PostLikesAvatars from './PostLikesAvatars';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

interface InstagramPostCardProps {
  post: Post;
  onUpdate?: () => void;
  hideTagIcon?: boolean;
}

export default function InstagramPostCard({
  post,
  onUpdate,
  hideTagIcon = false,
}: InstagramPostCardProps) {
  const { user } = useAuth();
  const channelRef = useRef<any>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(post.user_has_liked);
  const [isSaved, setIsSaved] = useState(post.user_has_saved);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [commentsCount, setCommentsCount] = useState(post.comentarios_count);
  const [showPostViewer, setShowPostViewer] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  
  const [authorAvatar, setAuthorAvatar] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string>('Usuario');
  const [loadingAuthor, setLoadingAuthor] = useState(true);

  const isOwner = post.tipo === 'usuario' 
    ? post.autor_id === user?.id
    : false;

  // ✅ FIXED: Real-time subscription only updates count from database (no disappearing likes)
  useEffect(() => {
    if (!post.id || !user) return;

    console.log('[InstagramPostCard] 🔄 Setting up real-time subscription for post:', post.id);

    if (channelRef.current?.state === 'subscribed') {
      console.log('[InstagramPostCard] ⚠️ Already subscribed, skipping');
      return;
    }

    const channel = supabase.channel(`post-likes:${post.id}:${user.id}`);

    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: `post_id=eq.${post.id}`,
        },
        async (payload) => {
          console.log('[InstagramPostCard] 🔄 Real-time like change detected:', payload.eventType, 'by user:', payload.new?.usuario_id || payload.old?.usuario_id);
          
          // ✅ FIXED: Only update if the change was made by ANOTHER user (not current user)
          const changedByUserId = payload.new?.usuario_id || payload.old?.usuario_id;
          
          if (changedByUserId === user.id) {
            console.log('[InstagramPostCard] ⏭️ Change made by current user, skipping real-time update (already handled optimistically)');
            return;
          }
          
          console.log('[InstagramPostCard] 🔄 Change made by another user, fetching updated count from database...');
          
          // ✅ Fetch total count from database (source of truth)
          const { count, error: countError } = await supabase
            .from('likes')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', post.id);
          
          if (!countError && count !== null) {
            console.log('[InstagramPostCard] ✅ Updated likes count from database:', count);
            setLikesCount(count);
          }
          
          // ✅ Check if current user still has liked (in case of conflicts)
          const { data: userLike, error: likeError } = await supabase
            .from('likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('usuario_id', user.id)
            .maybeSingle();
          
          if (!likeError) {
            setIsLiked(!!userLike);
            console.log('[InstagramPostCard] ✅ User like status verified:', !!userLike);
          }
        }
      )
      .subscribe((status) => {
        console.log('[InstagramPostCard] 📡 Subscription status:', status);
      });

    return () => {
      console.log('[InstagramPostCard] 🔄 Cleaning up real-time subscription for post:', post.id);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [post.id, user]);

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
        console.error('[InstagramPostCard] Error loading author data:', error);
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
    const previousLiked = isLiked;
    const previousCount = likesCount;
    
    // ✅ FIXED: Optimistic update - only affects current user's UI
    setIsLiked(newLikedState);
    setLikesCount(newLikedState ? likesCount + 1 : Math.max(0, likesCount - 1));

    try {
      if (newLikedState) {
        console.log('[InstagramPostCard] ➕ Adding like to post:', post.id);
        
        const { error } = await supabase.from('likes').insert({
          post_id: post.id,
          usuario_id: user.id,
        });
        
        if (error) {
          console.error('[InstagramPostCard] ❌ Error adding like:', error);
          throw error;
        }
        
        console.log('[InstagramPostCard] ✅ Like added successfully');
      } else {
        console.log('[InstagramPostCard] ➖ Removing like from post:', post.id);
        
        // ✅ FIXED: Delete only current user's like (not all likes)
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('usuario_id', user.id);
        
        if (error) {
          console.error('[InstagramPostCard] ❌ Error removing like:', error);
          throw error;
        }
        
        console.log('[InstagramPostCard] ✅ Like removed successfully (only for current user)');
      }

      // ✅ FIXED: Verify final count from database after operation
      const { count, error: countError } = await supabase
        .from('likes')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', post.id);
      
      if (!countError && count !== null) {
        console.log('[InstagramPostCard] ✅ Verified final count from database:', count);
        setLikesCount(count);
      }
    } catch (error) {
      console.error('[InstagramPostCard] ❌ Error toggling like:', error);
      // ✅ FIXED: Revert to previous state on error (no disappearing likes)
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      Alert.alert('Error', 'No se pudo actualizar el me gusta');
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
      console.error('[InstagramPostCard] Error toggling save:', error);
      setIsSaved(!newSavedState);
    }
  };

  const handleReport = () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para reportar contenido');
      return;
    }

    const reportOptions = [
      { text: 'Spam', value: 'spam' },
      { text: 'Acoso', value: 'harassment' },
      { text: 'Contenido inapropiado', value: 'inappropriate' },
      { text: 'Violencia', value: 'violence' },
      { text: 'Discurso de odio', value: 'hate_speech' },
      { text: 'Información falsa', value: 'false_information' },
      { text: 'Otro', value: 'other' },
      { text: 'Cancelar', value: 'cancel' },
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: reportOptions.map(o => o.text),
          cancelButtonIndex: reportOptions.length - 1,
          title: '¿Por qué reportas esta publicación?',
        },
        async (buttonIndex) => {
          if (buttonIndex < reportOptions.length - 1) {
            await submitReport(reportOptions[buttonIndex].value);
          }
        }
      );
    } else {
      Alert.alert(
        'Reportar publicación',
        '¿Por qué reportas esta publicación?',
        reportOptions.map(option => ({
          text: option.text,
          style: option.value === 'cancel' ? 'cancel' : 'default',
          onPress: option.value !== 'cancel' ? () => submitReport(option.value) : undefined,
        }))
      );
    }
  };

  const submitReport = async (reason: string) => {
    try {
      const { error } = await supabase.from('content_reports').insert({
        reporter_id: user!.id,
        content_type: 'post',
        content_id: post.id,
        post_id: post.id,
        reason,
      });

      if (error) throw error;

      Alert.alert('✅ Reporte enviado', 'Gracias por ayudarnos a mantener la comunidad segura');
    } catch (error) {
      console.error('[InstagramPostCard] Error reporting post:', error);
      Alert.alert('Error', 'No se pudo enviar el reporte');
    }
  };

  const handleDelete = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para eliminar publicaciones');
      return;
    }

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
              console.log('[InstagramPostCard] 🗑️ Attempting to delete post:', {
                postId: post.id,
                userId: user.id,
                autorId: post.autor_id,
                isOwner,
              });
              
              if (post.autor_id !== user.id) {
                console.error('[InstagramPostCard] ❌ User is not the owner of this post');
                Alert.alert('Error', 'No tienes permiso para eliminar esta publicación');
                return;
              }

              const { error, data } = await supabase
                .from('posts')
                .delete()
                .eq('id', post.id)
                .eq('autor_id', user.id);

              if (error) {
                console.error('[InstagramPostCard] ❌ Delete error:', error);
                throw error;
              }

              console.log('[InstagramPostCard] ✅ Post deleted successfully');
              Alert.alert('Éxito', 'Publicación eliminada correctamente');

              if (onUpdate) {
                onUpdate();
              }
            } catch (error: any) {
              console.error('[InstagramPostCard] ❌ Error deleting post:', error);
              Alert.alert(
                'Error', 
                error.message || 'No se pudo eliminar la publicación. Por favor, intenta de nuevo.'
              );
            }
          },
        },
      ]
    );
  };

  const handleMoreOptions = () => {
    const options: string[] = [];
    const actions: (() => void)[] = [];

    if (isOwner) {
      options.push('Eliminar');
      actions.push(handleDelete);
    } else {
      options.push('Reportar');
      actions.push(handleReport);
    }

    options.push('Cancelar');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: isOwner ? 0 : undefined,
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
          style: option === 'Eliminar' ? 'destructive' : option === 'Cancelar' ? 'cancel' : 'default',
          onPress: index < actions.length ? actions[index] : undefined,
        }))
      );
    }
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

  const captionText = post.contenido || '';
  const shouldTruncate = captionText.length > 100;
  const displayCaption = shouldTruncate && !showFullCaption 
    ? captionText.substring(0, 100) + '...' 
    : captionText;

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.authorInfo} onPress={handleProfilePress}>
            <MiniAvatarWithMomento
              userId={post.tipo === 'usuario' ? post.autor_id : undefined}
              localId={post.tipo === 'local' ? post.local_id : undefined}
              imageUrl={authorAvatar || undefined}
              size={40}
              showMomentoBorder={true}
            />
            <View style={styles.authorText}>
              <Text style={styles.authorName}>{displayUsername}</Text>
              {post.ubicacion && (
                <Text style={styles.locationText}>{post.ubicacion}</Text>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moreButton} onPress={handleMoreOptions}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
          </TouchableOpacity>
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
              <IconSymbol ios_icon_name="bubble.right" android_material_icon_name="chat_bubble_outline" size={26} color={colors.text} />
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
              color={isSaved ? colors.primary : colors.text}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.stats}>
          {/* ✅ FIXED: Real-time updating likes avatars with proper count */}
          {likesCount > 0 && (
            <PostLikesAvatars postId={post.id} totalLikes={likesCount} />
          )}
          
          {captionText && (
            <View style={styles.captionContainer}>
              <Text style={styles.caption}>
                <Text style={styles.captionUsername}>{displayUsername}</Text>{' '}
                {displayCaption}
              </Text>
              {shouldTruncate && (
                <TouchableOpacity onPress={() => setShowFullCaption(!showFullCaption)}>
                  <Text style={styles.moreText}>
                    {showFullCaption ? 'menos' : 'más'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {commentsCount > 0 && (
            <TouchableOpacity onPress={handleComment}>
              <Text style={styles.commentsText}>
                Ver {commentsCount === 1 ? 'el comentario' : `los ${commentsCount} comentarios`}
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
        hideTagIcon={hideTagIcon}
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
    backgroundColor: colors.background,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorText: {
    marginLeft: 10,
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  locationText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  moreButton: {
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
  captionContainer: {
    marginBottom: 4,
  },
  caption: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 18,
  },
  captionUsername: {
    fontWeight: '600',
    color: colors.text,
  },
  moreText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
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
    textTransform: 'uppercase',
  },
});
