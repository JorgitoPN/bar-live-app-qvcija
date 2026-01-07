
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';
import { supabase } from '@/utils/supabase';
import ParsedText from '@/components/social/ParsedText';
import PostLikesAvatars from './PostLikesAvatars';
import { useRouter } from 'expo-router';
import MiniAvatarWithMomento from '@/components/momento/MiniAvatarWithMomento';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import TaggingModalV5, { TaggableUser } from './TaggingModalV5';
import ReportModal from './ReportModal';
import { SOCIAL_ICONS } from '@/constants/SocialIcons';
import CommentsModal from '@/components/social/CommentsModal';
import { TapGestureHandler, State } from 'react-native-gesture-handler';
import { useInteractionContext } from '@/hooks/useInteractionContext';
import { useAuth } from '@/contexts/AuthContext';
import SharePostModal from './SharePostModal';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  FlatList,
  ScrollView,
  ActionSheetIOS,
  Animated,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import TagDisplay from './TagDisplay';
import ImageTaggingOverlay from './ImageTaggingOverlay';
import { IconSymbol } from '@/components/IconSymbol';

interface Post {
  id: string;
  autor_id: string;
  contenido?: string;
  imagen?: string;
  imagenes?: string[];
  likes: number;
  comentarios: number;
  created_at: string;
  tipo?: string;
  local_id?: string;
  autor?: {
    nombre: string;
    avatar?: string;
    username?: string;
  };
  local?: {
    nombre: string;
    imagen_url?: string;
  };
  liked?: boolean;
  saved?: boolean;
  autorNombre?: string;
  autorAvatar?: string;
  images?: string[];
}

interface PostViewerModalProps {
  visible: boolean;
  initialPostId?: string;
  post?: Post;
  allPostIds?: string[];
  onClose: () => void;
  onPostChange?: (postId: string) => void;
  onUpdate?: () => void;
  hideTagIcon?: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PostViewerModal({
  visible,
  initialPostId,
  post: singlePost,
  allPostIds,
  onClose,
  onPostChange,
  onUpdate,
  hideTagIcon,
}: PostViewerModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [showComments, setShowComments] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showTaggingModal, setShowTaggingModal] = useState(false);
  const [taggedUsers, setTaggedUsers] = useState<Record<string, TaggableUser[]>>({});
  const [authorHasMomento, setAuthorHasMomento] = useState<Record<string, boolean>>({});
  
  const flatListRef = useRef<FlatList>(null);
  const doubleTapAnimations = useRef<Record<string, Animated.Value>>({});
  const likeIconScales = useRef<Record<string, Animated.Value>>({});

  const { handleLike, handleSave, handleComment } = useInteractionContext();

  // Load posts
  useEffect(() => {
    if (!visible) return;

    const loadPosts = async () => {
      try {
        setLoading(true);

        if (singlePost) {
          setPosts([singlePost]);
          setCurrentIndex(0);
        } else if (allPostIds && allPostIds.length > 0) {
          const { data, error } = await supabase
            .from('publicaciones')
            .select(`
              *,
              autor:usuarios!publicaciones_autor_id_fkey(nombre, avatar, username),
              local:locales(nombre, imagen_url)
            `)
            .in('id', allPostIds)
            .order('created_at', { ascending: false });

          if (error) throw error;

          const formattedPosts = (data || []).map((post: any) => ({
            ...post,
            imagenes: post.imagenes || (post.imagen ? [post.imagen] : []),
            autorNombre: post.autor?.nombre,
            autorAvatar: post.autor?.avatar,
          }));

          setPosts(formattedPosts);

          if (initialPostId) {
            const index = formattedPosts.findIndex((p: Post) => p.id === initialPostId);
            if (index !== -1) {
              setCurrentIndex(index);
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index, animated: false });
              }, 100);
            }
          }
        }
      } catch (error) {
        console.error('Error loading posts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [visible, singlePost, allPostIds, initialPostId]);

  // Load tagged users
  useEffect(() => {
    const loadTaggedUsers = async () => {
      if (posts.length === 0) return;

      const newTaggedUsers: Record<string, TaggableUser[]> = {};

      for (const post of posts) {
        try {
          const { data, error } = await supabase
            .from('post_tags')
            .select(`
              id,
              x_position,
              y_position,
              usuarios:tagged_user_id(id, nombre, username, avatar)
            `)
            .eq('post_id', post.id);

          if (!error && data) {
            newTaggedUsers[post.id] = data.map((tag: any) => ({
              id: tag.usuarios.id,
              nombre: tag.usuarios.nombre,
              username: tag.usuarios.username,
              avatar: tag.usuarios.avatar,
              x: tag.x_position,
              y: tag.y_position,
            }));
          }
        } catch (error) {
          console.error('Error loading tagged users:', error);
        }
      }

      setTaggedUsers(newTaggedUsers);
    };

    loadTaggedUsers();
  }, [posts]);

  // Check authors' momentos
  useEffect(() => {
    const checkAuthorsMomentos = async () => {
      if (!user || posts.length === 0) return;

      const newAuthorHasMomento: Record<string, boolean> = {};

      for (const post of posts) {
        if (!post.autor_id) continue;

        try {
          const { data, error } = await supabase
            .from('momentos')
            .select('id')
            .eq('usuario_id', post.autor_id)
            .gt('expires_at', new Date().toISOString())
            .limit(1);

          if (!error) {
            newAuthorHasMomento[post.autor_id] = (data?.length || 0) > 0;
          }
        } catch (error) {
          console.error('Error checking momento:', error);
        }
      }

      setAuthorHasMomento(newAuthorHasMomento);
    };

    checkAuthorsMomentos();
  }, [posts, user]);

  const currentPost = posts[currentIndex];

  const toggleExpanded = (postId: string) => {
    setExpandedPosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const getDoubleTapAnimation = (postId: string) => {
    if (!doubleTapAnimations.current[postId]) {
      doubleTapAnimations.current[postId] = new Animated.Value(0);
    }
    return doubleTapAnimations.current[postId];
  };

  const getLikeIconScale = (postId: string) => {
    if (!likeIconScales.current[postId]) {
      likeIconScales.current[postId] = new Animated.Value(0);
    }
    return likeIconScales.current[postId];
  };

  const handleDoubleTap = async (post: Post) => {
    if (!user) return;

    if (!post.liked) {
      await handleLike(post.id, post.liked || false);
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const scale = getLikeIconScale(post.id);
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 3,
        }),
        Animated.delay(800),
        Animated.timing(scale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      setPosts((prevPosts) =>
        prevPosts.map((p) =>
          p.id === post.id
            ? { ...p, liked: true, likes: (p.likes || 0) + 1 }
            : p
        )
      );

      if (onUpdate) onUpdate();
    }
  };

  const toggleSave = async (post: Post) => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para guardar publicaciones');
      return;
    }

    await handleSave(post.id, post.saved || false);

    setPosts((prevPosts) =>
      prevPosts.map((p) =>
        p.id === post.id ? { ...p, saved: !p.saved } : p
      )
    );

    if (onUpdate) onUpdate();
  };

  const loadCommentCount = async (postId: string) => {
    try {
      const { count, error } = await supabase
        .from('comentarios')
        .select('*', { count: 'exact', head: true })
        .eq('publicacion_id', postId);

      if (!error && count !== null) {
        setPosts((prevPosts) =>
          prevPosts.map((p) =>
            p.id === postId ? { ...p, comentarios: count } : p
          )
        );
      }
    } catch (error) {
      console.error('Error loading comment count:', error);
    }
  };

  // ✅ CRITICAL FIX: Menú de tres puntos SIEMPRE visible
  const handlePostOptions = (post: Post) => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para acceder a las opciones');
      return;
    }

    const isOwnPost = post.autor_id === user.id;

    if (Platform.OS === 'ios') {
      const options = isOwnPost
        ? ['Cancelar', 'Eliminar publicación', 'Compartir']
        : ['Cancelar', 'Reportar', 'Compartir'];

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: isOwnPost ? 1 : undefined,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            if (isOwnPost) {
              handleDeletePost(post);
            } else {
              setSelectedPost(post);
              setShowReportModal(true);
            }
          } else if (buttonIndex === 2) {
            setSelectedPost(post);
            setShowShareModal(true);
          }
        }
      );
    } else {
      Alert.alert(
        'Opciones',
        '',
        [
          ...(isOwnPost
            ? [
                {
                  text: 'Eliminar publicación',
                  style: 'destructive' as const,
                  onPress: () => handleDeletePost(post),
                },
              ]
            : [
                {
                  text: 'Reportar',
                  onPress: () => {
                    setSelectedPost(post);
                    setShowReportModal(true);
                  },
                },
              ]),
          {
            text: 'Compartir',
            onPress: () => {
              setSelectedPost(post);
              setShowShareModal(true);
            },
          },
          {
            text: 'Cancelar',
            style: 'cancel' as const,
          },
        ]
      );
    }
  };

  const handleDeletePost = async (post: Post) => {
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
                .from('publicaciones')
                .delete()
                .eq('id', post.id);

              if (error) throw error;

              Alert.alert('Éxito', 'Publicación eliminada');
              onClose();
              if (onUpdate) onUpdate();
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'No se pudo eliminar la publicación');
            }
          },
        },
      ]
    );
  };

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffMs = now.getTime() - postDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return postDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const renderPost = ({ item: post }: { item: Post }) => {
    const isExpanded = expandedPosts.has(post.id);
    const shouldTruncate = (post.contenido?.length || 0) > 150;
    const displayContent = isExpanded || !shouldTruncate
      ? post.contenido
      : `${post.contenido?.substring(0, 150)}...`;

    const images = post.imagenes || (post.imagen ? [post.imagen] : []);
    const hasMomento = authorHasMomento[post.autor_id || ''] || false;

    return (
      <View style={styles.postContainer}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerLeft}
            onPress={() => {
              if (post.tipo === 'local' && post.local_id) {
                router.push(`/perfil/local?localId=${post.local_id}` as any);
              } else {
                router.push(`/perfil/usuario?userId=${post.autor_id}` as any);
              }
            }}
          >
            <MiniAvatarWithMomento
              avatarUrl={post.autorAvatar || post.autor?.avatar}
              hasMomento={hasMomento}
              size={40}
              onPress={() => {
                if (post.tipo === 'local' && post.local_id) {
                  router.push(`/perfil/local?localId=${post.local_id}` as any);
                } else {
                  router.push(`/perfil/usuario?userId=${post.autor_id}` as any);
                }
              }}
            />
            <View style={styles.headerInfo}>
              <Text style={[styles.authorName, { fontSize: scaleFontSize(15) }]}>
                {post.autorNombre || post.autor?.nombre || 'Usuario'}
              </Text>
              {post.autor?.username && (
                <Text style={[styles.username, { fontSize: scaleFontSize(13) }]}>
                  @{post.autor.username}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {/* ✅ CRITICAL FIX: Menú de tres puntos SIEMPRE visible */}
          <TouchableOpacity
            style={styles.optionsButton}
            onPress={() => handlePostOptions(post)}
          >
            <IconSymbol
              ios_icon_name="ellipsis"
              android_material_icon_name="more_vert"
              size={scaleIconSize(24)}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {/* Image */}
        {images.length > 0 && (
          <TapGestureHandler
            onHandlerStateChange={({ nativeEvent }) => {
              if (nativeEvent.state === State.ACTIVE) {
                handleDoubleTap(post);
              }
            }}
            numberOfTaps={2}
          >
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: images[0] }}
                style={styles.postImage}
                resizeMode="cover"
              />
              
              {/* Like animation */}
              <Animated.View
                style={[
                  styles.likeAnimation,
                  {
                    opacity: getLikeIconScale(post.id),
                    transform: [{ scale: getLikeIconScale(post.id) }],
                  },
                ]}
                pointerEvents="none"
              >
                <IconSymbol
                  ios_icon_name="heart.fill"
                  android_material_icon_name="favorite"
                  size={scaleIconSize(100)}
                  color="#FFFFFF"
                />
              </Animated.View>

              {/* Tagged users overlay */}
              {taggedUsers[post.id] && taggedUsers[post.id].length > 0 && (
                <ImageTaggingOverlay
                  taggedUsers={taggedUsers[post.id]}
                  imageWidth={SCREEN_WIDTH}
                  imageHeight={SCREEN_WIDTH}
                  onUserPress={(userId) => {
                    router.push(`/perfil/usuario?userId=${userId}` as any);
                  }}
                />
              )}
            </View>
          </TapGestureHandler>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <View style={styles.leftActions}>
            <TouchableOpacity
              onPress={async () => {
                if (!user) {
                  Alert.alert('Inicia sesión', 'Debes iniciar sesión para dar like');
                  return;
                }
                await handleLike(post.id, post.liked || false);
                setPosts((prevPosts) =>
                  prevPosts.map((p) =>
                    p.id === post.id
                      ? {
                          ...p,
                          liked: !p.liked,
                          likes: p.liked ? (p.likes || 0) - 1 : (p.likes || 0) + 1,
                        }
                      : p
                  )
                );
                if (onUpdate) onUpdate();
              }}
            >
              <IconSymbol
                ios_icon_name={post.liked ? 'heart.fill' : 'heart'}
                android_material_icon_name={post.liked ? 'favorite' : 'favorite-border'}
                size={scaleIconSize(28)}
                color={post.liked ? '#FF3B30' : '#FFFFFF'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setSelectedPost(post);
                setShowComments(true);
              }}
            >
              <IconSymbol
                ios_icon_name="bubble.right"
                android_material_icon_name="chat-bubble-outline"
                size={scaleIconSize(26)}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setSelectedPost(post);
                setShowShareModal(true);
              }}
            >
              <IconSymbol
                ios_icon_name="paperplane"
                android_material_icon_name="send"
                size={scaleIconSize(26)}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => toggleSave(post)}>
            <IconSymbol
              ios_icon_name={post.saved ? 'bookmark.fill' : 'bookmark'}
              android_material_icon_name={post.saved ? 'bookmark' : 'bookmark-border'}
              size={scaleIconSize(26)}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {/* Likes */}
        {(post.likes || 0) > 0 && (
          <View style={styles.likesContainer}>
            <PostLikesAvatars postId={post.id} maxAvatars={3} />
            <Text style={[styles.likesText, { fontSize: scaleFontSize(14) }]}>
              {post.likes} {post.likes === 1 ? 'me gusta' : 'me gusta'}
            </Text>
          </View>
        )}

        {/* Content */}
        {post.contenido && (
          <View style={styles.contentContainer}>
            <ParsedText
              text={displayContent || ''}
              style={[styles.content, { fontSize: scaleFontSize(14) }]}
              onUserPress={(username) => {
                router.push(`/perfil/usuario?username=${username}` as any);
              }}
              onHashtagPress={(hashtag) => {
                router.push(`/social/hashtag?tag=${hashtag}` as any);
              }}
            />
            {shouldTruncate && (
              <TouchableOpacity onPress={() => toggleExpanded(post.id)}>
                <Text style={[styles.seeMore, { fontSize: scaleFontSize(13) }]}>
                  {isExpanded ? 'Ver menos' : 'Ver más'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Tagged users */}
        {taggedUsers[post.id] && taggedUsers[post.id].length > 0 && (
          <TagDisplay
            taggedUsers={taggedUsers[post.id]}
            onUserPress={(userId) => {
              router.push(`/perfil/usuario?userId=${userId}` as any);
            }}
          />
        )}

        {/* Comments preview */}
        {(post.comentarios || 0) > 0 && (
          <TouchableOpacity
            style={styles.commentsPreview}
            onPress={() => {
              setSelectedPost(post);
              setShowComments(true);
            }}
          >
            <Text style={[styles.commentsText, { fontSize: scaleFontSize(13) }]}>
              Ver los {post.comentarios} comentarios
            </Text>
          </TouchableOpacity>
        )}

        {/* Time */}
        <Text style={[styles.timeText, { fontSize: scaleFontSize(12) }]}>
          {formatTimeAgo(post.created_at)}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#000000', '#1a1a1a']}
          style={StyleSheet.absoluteFill}
        />

        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <IconSymbol
            ios_icon_name="xmark"
            android_material_icon_name="close"
            size={scaleIconSize(28)}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        {/* Posts */}
        <FlatList
          ref={flatListRef}
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          pagingEnabled
          horizontal={false}
          showsVerticalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(
              event.nativeEvent.contentOffset.y / SCREEN_HEIGHT
            );
            setCurrentIndex(index);
            if (onPostChange && posts[index]) {
              onPostChange(posts[index].id);
            }
          }}
          getItemLayout={(data, index) => ({
            length: SCREEN_HEIGHT,
            offset: SCREEN_HEIGHT * index,
            index,
          })}
        />

        {/* Comments Modal */}
        {selectedPost && (
          <CommentsModal
            visible={showComments}
            postId={selectedPost.id}
            onClose={() => {
              setShowComments(false);
              loadCommentCount(selectedPost.id);
            }}
          />
        )}

        {/* Share Modal */}
        {selectedPost && (
          <SharePostModal
            visible={showShareModal}
            post={selectedPost}
            onClose={() => setShowShareModal(false)}
          />
        )}

        {/* Report Modal */}
        {selectedPost && (
          <ReportModal
            visible={showReportModal}
            contentType="post"
            contentId={selectedPost.id}
            onClose={() => setShowReportModal(false)}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    paddingTop: Platform.OS === 'ios' ? 100 : 70,
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
    marginLeft: 12,
    flex: 1,
  },
  authorName: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  username: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  optionsButton: {
    padding: 8,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: '#000000',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  likeAnimation: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -50,
    marginLeft: -50,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftActions: {
    flexDirection: 'row',
    gap: 16,
  },
  likesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  likesText: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  content: {
    color: '#FFFFFF',
    lineHeight: 20,
  },
  seeMore: {
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  commentsPreview: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commentsText: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  timeText: {
    paddingHorizontal: 16,
    paddingTop: 4,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});
