
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Post {
  id: string;
  contenido: string;
  imagenes: string[];
  imagen?: string;
  likes: number;
  comentarios: number;
  created_at: string;
  autor: {
    nombre: string;
    avatar?: string;
  };
}

export default function HashtagScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const hashtag = params.tag as string;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hashtagInfo, setHashtagInfo] = useState<{
    uso_count: number;
  } | null>(null);

  const loadHashtagPosts = useCallback(async () => {
    if (!hashtag) return;

    try {
      console.log('[Hashtag] Loading posts for hashtag:', hashtag);

      // Get hashtag info
      const { data: hashtagData } = await supabase
        .from('hashtags')
        .select('id, uso_count')
        .eq('tag', hashtag.toLowerCase())
        .single();

      if (hashtagData) {
        setHashtagInfo(hashtagData);
      }

      if (!hashtagData) {
        console.log('[Hashtag] Hashtag not found');
        setPosts([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // ENHANCED: Get posts with this hashtag - ONLY from post_hashtags (not comment_hashtags)
      // Also filter by privacy: only public profiles or followed users
      let query = supabase
        .from('post_hashtags')
        .select(`
          post_id,
          posts!inner(
            id,
            contenido,
            imagen,
            imagenes,
            likes,
            comentarios,
            created_at,
            tipo,
            autor_id,
            local_id,
            autor:usuarios!posts_autor_id_fkey(
              nombre, 
              avatar, 
              perfil_privado
            ),
            local:locales(nombre, imagen_url)
          )
        `)
        .eq('hashtag_id', hashtagData.id);

      const { data: postHashtags, error } = await query;

      if (error) {
        console.error('[Hashtag] Error loading posts:', error);
        return;
      }

      // Extract posts from the junction table
      let postsData = postHashtags?.map((ph: any) => ph.posts).filter(Boolean) || [];
      
      console.log('[Hashtag] Loaded posts before privacy filter:', postsData.length);

      // ENHANCED: Privacy filtering - only show posts from public profiles or followed users
      if (user) {
        // Get list of users the current user follows
        const { data: followedUsers } = await supabase
          .from('seguidores')
          .select('seguido_id')
          .eq('seguidor_id', user.id);

        const followedUserIds = new Set(followedUsers?.map(f => f.seguido_id) || []);

        // Filter posts based on privacy
        postsData = postsData.filter((post: any) => {
          // If it's a local post, always show it (locals don't have privacy settings)
          if (post.tipo === 'local') {
            return true;
          }

          // If it's a user post
          if (post.tipo === 'usuario') {
            // Show if profile is public
            if (!post.autor?.perfil_privado) {
              return true;
            }

            // Show if it's the current user's own post
            if (post.autor_id === user.id) {
              return true;
            }

            // Show if the current user follows this user
            if (followedUserIds.has(post.autor_id)) {
              return true;
            }

            // Otherwise, hide private profile posts
            return false;
          }

          return true;
        });

        console.log('[Hashtag] Posts after privacy filter:', postsData.length);
      } else {
        // Not logged in - only show public user posts and all local posts
        postsData = postsData.filter((post: any) => {
          if (post.tipo === 'local') {
            return true;
          }
          return !post.autor?.perfil_privado;
        });

        console.log('[Hashtag] Posts after public-only filter:', postsData.length);
      }
      
      setPosts(postsData);
    } catch (error) {
      console.error('[Hashtag] Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hashtag, user]);

  useEffect(() => {
    loadHashtagPosts();
  }, [loadHashtagPosts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadHashtagPosts();
  }, [loadHashtagPosts]);

  const renderPost = ({ item }: { item: Post }) => {
    // Get images array - prioritize imagenes array, fallback to imagen field
    const images = item.imagenes && item.imagenes.length > 0 
      ? item.imagenes 
      : item.imagen 
        ? [item.imagen] 
        : [];

    // ENHANCED: Get display name and avatar based on post type
    const displayName = item.tipo === 'local' && item.local 
      ? item.local.nombre 
      : item.autor?.nombre || 'Usuario';
    const displayAvatar = item.tipo === 'local' && item.local 
      ? item.local.imagen_url 
      : item.autor?.avatar;

    return (
      <TouchableOpacity
        style={styles.postCard}
        onPress={() => router.push(`/social/post?id=${item.id}`)}
        activeOpacity={0.7}
      >
        {images.length > 0 && (
          <View style={styles.postImageContainer}>
            <Image 
              source={{ uri: images[0] }} 
              style={styles.postImage}
              resizeMode="cover"
            />
            {images.length > 1 && (
              <View style={styles.multipleImagesBadge}>
                <IconSymbol name="square.on.square" size={16} color={colors.headerText} />
              </View>
            )}
          </View>
        )}
        <View style={styles.postInfo}>
          <View style={styles.postAuthorInfo}>
            {displayAvatar ? (
              <Image 
                source={{ uri: displayAvatar }} 
                style={styles.postAuthorAvatar}
              />
            ) : (
              <View style={[styles.postAuthorAvatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.postAuthorName} numberOfLines={1}>
              {displayName}
            </Text>
          </View>
          <Text style={styles.postContent} numberOfLines={2}>
            {item.contenido}
          </Text>
          <View style={styles.postStats}>
            <View style={styles.postStat}>
              <IconSymbol name="heart.fill" size={14} color={colors.textSecondary} />
              <Text style={styles.postStatText}>{item.likes}</Text>
            </View>
            <View style={styles.postStat}>
              <IconSymbol name="message.fill" size={14} color={colors.textSecondary} />
              <Text style={styles.postStatText}>{item.comentarios}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>#{hashtag}</Text>
          {hashtagInfo && (
            <Text style={styles.headerSubtitle}>
              {hashtagInfo.uso_count} {hashtagInfo.uso_count === 1 ? 'publicación' : 'publicaciones'}
            </Text>
          )}
        </View>
        <View style={{ width: 24 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <IconSymbol name="number" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>
                No hay publicaciones con #{hashtag}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.headerText,
    opacity: 0.8,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  postCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  postImageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  multipleImagesBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 6,
    borderRadius: 8,
  },
  postInfo: {
    padding: 12,
  },
  postAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  postAuthorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  postAuthorName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  postContent: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 8,
  },
  postStats: {
    flexDirection: 'row',
    gap: 16,
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postStatText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
});
