
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  StatusBar,
  Platform,
  Alert,
  Share as RNShare,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import MiniFoodPlateAvatarV11 from '@/components/common/MiniFoodPlateAvatarV11';
import CommentsModal from './CommentsModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  };
}

interface PostViewerModalProps {
  visible: boolean;
  post: Post | null;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function PostViewerModal({
  visible,
  post,
  onClose,
  onUpdate,
}: PostViewerModalProps) {
  const { user } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [authorStories, setAuthorStories] = useState<any[]>([]);

  useEffect(() => {
    if (post) {
      setIsLiked(post.user_has_liked);
      setIsSaved(post.user_has_saved);
      setLikesCount(post.likes_count);
      setCommentsCount(post.comentarios_count);
      setCurrentImageIndex(0);
      setLoading(true);

      // ✅ V11.0: Load author stories
      const loadAuthorStories = async () => {
        try {
          if (post.tipo === 'local' && post.local_id) {
            const { data: storiesData } = await supabase
              .from('historias')
              .select('id, autor_id, tipo, imagen, imagen_url, created_at, expires_at')
              .eq('tipo', 'local')
              .eq('local_id', post.local_id)
              .gt('expires_at', new Date().toISOString())
              .order('created_at', { ascending: true });

            if (storiesData) {
              setAuthorStories(storiesData);
            }
          } else if (post.autor_id) {
            const { data: storiesData } = await supabase
              .from('historias')
              .select('id, autor_id, tipo, imagen, imagen_url, created_at, expires_at')
              .eq('tipo', 'usuario')
              .eq('autor_id', post.autor_id)
              .gt('expires_at', new Date().toISOString())
              .order('created_at', { ascending: true });

            if (storiesData) {
              setAuthorStories(storiesData);
            }
          }
        } catch (error) {
          console.error('[PostViewerModal] Error loading author stories:', error);
        }
      };

      loadAuthorStories();
    }
  }, [post]);

  const handleLike = async () => {
    if (!user || !post) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para dar me gusta');
      return;
    }

    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikesCount(prev => newLikedState ? prev + 1 : prev - 1);

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
      console.error('[PostViewerModal] Error toggling like:', error);
      setIsLiked(!newLikedState);
      setLikesCount(prev => newLikedState ? prev - 1 : prev + 1);
    }
  };

  const handleSave = async () => {
    if (!user || !post) {
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
      console.error('[PostViewerModal] Error toggling save:', error);
      setIsSaved(!newSavedState);
    }
  };

  const handleShare = async () => {
    if (!post) return;

    try {
      const result = await RNShare.share({
        message: `Mira esta publicación en Barlive: ${post.contenido || 'Nueva publicación'}`,
        title: 'Compartir publicación',
      });

      if (result.action === RNShare.sharedAction) {
        console.log('[PostViewerModal] Post shared successfully');
      }
    } catch (error) {
      console.error('[PostViewerModal] Error sharing:', error);
      Alert.alert('Error', 'No se pudo compartir la publicación');
    }
  };

  const handleCommentsUpdate = useCallback(() => {
    if (post) {
      setCommentsCount(prev => prev + 1);
      if (onUpdate) {
        onUpdate();
      }
    }
  }, [post, onUpdate]);

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

  if (!visible || !post) {
    return null;
  }

  const displayUsername = post.tipo === 'local'
    ? post.local?.nombre
    : (post.autor.username || post.autor.nombre);

  return (
    <>
      <Modal
        visible={visible && !showComments}
        transparent={false}
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent
        hardwareAccelerated
      >
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.container}>
          {/* Header */}
          <BlurView intensity={30} tint="dark" style={styles.header}>
            <View style={styles.authorInfo}>
              <MiniFoodPlateAvatarV11
                imageUrl={post.autor.avatar}
                size={36}
                nombre={post.autor.nombre}
                userId={post.tipo === 'local' ? post.local_id : post.autor_id}
                userStories={authorStories}
                hasStory={authorStories.length > 0}
              />
              <View style={styles.authorText}>
                <Text style={styles.authorName}>{displayUsername}</Text>
                {post.ubicacion && (
                  <Text style={styles.locationText}>{post.ubicacion}</Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <IconSymbol
                ios_icon_name="xmark"
                android_material_icon_name="close"
                size={24}
                color="#fff"
              />
            </TouchableOpacity>
          </BlurView>

          {/* Images */}
          <View style={styles.contentContainer}>
            {post.imagenes.length > 0 && (
              <ScrollView
                ref={scrollViewRef}
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
                style={styles.imagesScroll}
              >
                {post.imagenes.map((imagen, index) => (
                  <Image
                    key={index}
                    source={{ uri: imagen }}
                    style={styles.image}
                    resizeMode="contain"
                    onLoadStart={() => setLoading(true)}
                    onLoadEnd={() => setLoading(false)}
                  />
                ))}
              </ScrollView>
            )}

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}

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
          </View>

          {/* Actions and Info */}
          <BlurView intensity={30} tint="dark" style={styles.footer}>
            <View style={styles.actions}>
              <View style={styles.leftActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleLike}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    ios_icon_name={isLiked ? 'heart.fill' : 'heart'}
                    android_material_icon_name={isLiked ? 'favorite' : 'favorite_border'}
                    size={28}
                    color={isLiked ? '#ff3b30' : '#fff'}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setShowComments(true)}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    ios_icon_name="bubble.left"
                    android_material_icon_name="chat_bubble_outline"
                    size={26}
                    color="#fff"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleShare}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    ios_icon_name="paperplane"
                    android_material_icon_name="send"
                    size={26}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleSave}
                activeOpacity={0.7}
              >
                <IconSymbol
                  ios_icon_name={isSaved ? 'bookmark.fill' : 'bookmark'}
                  android_material_icon_name={isSaved ? 'bookmark' : 'bookmark_border'}
                  size={26}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.stats}>
              {likesCount > 0 && (
                <Text style={styles.statsText}>
                  <Text style={styles.statsBold}>{formatNumber(likesCount)}</Text> me gusta
                </Text>
              )}
              
              {post.contenido && (
                <View style={styles.contentTextContainer}>
                  <Text style={styles.contentText}>
                    <Text style={styles.contentUsername}>{displayUsername}</Text>{' '}
                    {post.contenido}
                  </Text>
                </View>
              )}

              {commentsCount > 0 && (
                <TouchableOpacity onPress={() => setShowComments(true)}>
                  <Text style={styles.commentsText}>
                    Ver los {commentsCount} comentarios
                  </Text>
                </TouchableOpacity>
              )}
              
              <Text style={styles.timeAgo}>{formatTimeAgo(post.created_at)}</Text>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* Comments Modal */}
      <CommentsModal
        visible={showComments}
        postId={post.id}
        onClose={() => setShowComments(false)}
        onCommentAdded={handleCommentsUpdate}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 12,
    zIndex: 10,
    overflow: 'hidden',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorText: {
    marginLeft: 12,
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  locationText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagesScroll: {
    flex: 1,
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
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
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  stats: {
    gap: 8,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statsBold: {
    fontWeight: '700',
  },
  contentTextContainer: {
    marginTop: 4,
  },
  contentText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 18,
  },
  contentUsername: {
    fontWeight: '600',
    color: '#fff',
  },
  commentsText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  timeAgo: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
