
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
  Platform,
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
import { LinearGradient } from 'expo-linear-gradient';
import { SOCIAL_ICONS } from '@/constants/SocialIcons';
import CommentsModal from '@/components/social/CommentsModal';

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

/**
 * ✅ POST DETAIL PAGE v2.0 - UNIFIED STYLING
 * 
 * Changes:
 * - ✅ White background (#fff) for consistency
 * - ✅ BarLive blue gradient header
 * - ✅ Same design as profile grid post detail
 * - ✅ Consistent styling across all post detail pages
 */

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
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<any>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);

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

  useEffect(() => {
    if (params.id) {
      loadPost();
    }
  }, [params.id, loadPost]);

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

  const handleCommentPress = () => {
    console.log('[PostDetail] Comment button pressed, opening modal');
    setCommentsModalVisible(true);
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

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    setCurrentImageIndex(index);
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
                  ios_icon_name={SOCIAL_ICONS.COMMENT.ios}
                  android_material_icon_name={SOCIAL_ICONS.COMMENT.android}
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

          {post.comentarios > 0 && (
            <TouchableOpacity 
              style={styles.viewCommentsButton}
              onPress={handleCommentPress}
              activeOpacity={0.7}
            >
              <Text style={styles.viewCommentsText}>
                Ver {post.comentarios === 1 ? 'el comentario' : `los ${post.comentarios} comentarios`}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.postTimeContainer}>
            <Text style={styles.postTimeText}>{formatearFecha(post.created_at)}</Text>
          </View>
        </View>
      </ScrollView>

      <CommentsModal
        visible={commentsModalVisible}
        postId={params.id as string}
        postAuthorId={post.autor_id}
        onClose={() => setCommentsModalVisible(false)}
        onCommentAdded={() => {
          loadPost();
        }}
      />

      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message={loginMessage}
      />
    </View>
  );
}
