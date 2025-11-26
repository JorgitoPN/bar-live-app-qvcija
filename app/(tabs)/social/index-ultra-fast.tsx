
import { useRouter, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useMode } from '@/contexts/ModeContext';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';
import { socialCache } from '@/utils/socialCache';
import { performanceOptimizer } from '@/utils/performanceOptimizer';
import InitialLoadingScreen from '@/components/common/InitialLoadingScreen';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { supabase } from '@/utils/supabase';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Post {
  id: string;
  contenido: string;
  imagen_url?: string;
  tipo: 'usuario' | 'local';
  autor_id?: string;
  local_id?: string;
  created_at: string;
  likes: number;
  comentarios: number;
  liked?: boolean;
  saved?: boolean;
  autor?: {
    id: string;
    nombre: string;
    username?: string;
    avatar?: string;
  };
  local?: {
    id: string;
    nombre: string;
    logo?: string;
  };
}

interface Historia {
  id: string;
  imagen_url: string;
  tipo: 'usuario' | 'local';
  autor_id?: string;
  local_id?: string;
  created_at: string;
  visto_por_usuario?: boolean;
  autor?: {
    id: string;
    nombre: string;
    username?: string;
    avatar?: string;
  };
  local?: {
    id: string;
    nombre: string;
    logo?: string;
  };
}

export default function SocialScreenUltraFast() {
  const router = useRouter();
  const { user } = useAuth();
  
  const { 
    currentMode,
    activeProfileId,
  } = useMode();
  
  const { posts: globalPosts, stories: globalStories, isInitialLoading, refreshData } = useGlobalData();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [historias, setHistorias] = useState<Historia[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const isLoadingRef = useRef(false);
  const isOwnerMode = currentMode === 'owner';
  const activeLocalProfileId = isOwnerMode ? activeProfileId : null;

  const loadFreshData = useCallback(async () => {
    try {
      console.log('[Social] 🔄 Loading fresh data...');
      
      let filteredPosts = globalPosts;
      
      if (isOwnerMode && activeLocalProfileId) {
        filteredPosts = globalPosts.filter(p => p.tipo === 'local' && p.local_id === activeLocalProfileId);
      } else {
        if (user) {
          const { data: followedLocals } = await supabase
            .from('locales_favoritos')
            .select('local_id')
            .eq('usuario_id', user.id);

          const followedLocalIds = new Set(followedLocals?.map(f => f.local_id) || []);
          
          filteredPosts = globalPosts.filter(p => 
            p.tipo === 'usuario' || 
            (p.tipo === 'local' && p.local_id && followedLocalIds.has(p.local_id))
          );
        } else {
          filteredPosts = globalPosts.filter(p => p.tipo === 'usuario');
        }
      }
      
      if (user && filteredPosts.length > 0) {
        const postIds = filteredPosts.map(p => p.id);
        
        const [likesResult, savesResult, commentsResult] = await Promise.all([
          supabase
            .from('likes')
            .select('post_id')
            .eq('usuario_id', user.id)
            .in('post_id', postIds),
          supabase
            .from('posts_guardados')
            .select('post_id')
            .eq('usuario_id', user.id)
            .in('post_id', postIds),
          supabase
            .from('comentarios')
            .select('post_id')
            .in('post_id', postIds),
        ]);

        const likedPostIds = new Set(likesResult.data?.map(l => l.post_id) || []);
        const savedPostIds = new Set(savesResult.data?.map(s => s.post_id) || []);
        
        const commentCounts = commentsResult.data?.reduce((acc, c) => {
          acc[c.post_id] = (acc[c.post_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const postsWithStatus = filteredPosts.map(post => ({
          ...post,
          liked: likedPostIds.has(post.id),
          saved: savedPostIds.has(post.id),
          comentarios: commentCounts[post.id] || 0,
        }));
        
        setPosts(postsWithStatus);
        socialCache.setFeed(postsWithStatus);
      } else {
        setPosts(filteredPosts);
        socialCache.setFeed(filteredPosts);
      }

      // Load stories
      let otherStories: typeof globalStories = [];

      if (isOwnerMode && activeLocalProfileId) {
        otherStories = globalStories.filter(s => s.tipo === 'usuario');
      } else if (user) {
        const { data: followedLocals } = await supabase
          .from('locales_favoritos')
          .select('local_id')
          .eq('usuario_id', user.id);

        const followedLocalIds = new Set(followedLocals?.map(f => f.local_id) || []);
        
        otherStories = globalStories.filter(s => 
          (s.tipo === 'usuario' && s.autor_id !== user.id) ||
          (s.tipo === 'local' && s.local_id && followedLocalIds.has(s.local_id))
        );
      } else {
        otherStories = globalStories.filter(s => s.tipo === 'usuario');
      }
      
      if (user) {
        const allStoryIds = otherStories.map(s => s.id);
        
        const viewedData = await supabase
          .from('historia_views')
          .select('historia_id')
          .eq('usuario_id', user.id)
          .in('historia_id', allStoryIds);
        
        const viewedStoryIds = new Set(viewedData.data?.map(v => v.historia_id) || []);
        
        const otherStoriesWithStatus = otherStories.map(story => ({
          ...story,
          visto_por_usuario: viewedStoryIds.has(story.id),
        }));
        
        setHistorias(otherStoriesWithStatus);
        socialCache.setStories(otherStoriesWithStatus);
      } else {
        setHistorias(otherStories);
        socialCache.setStories(otherStories);
      }

      console.log('[Social] ✅ Fresh data loaded');
    } catch (error) {
      console.error('[Social] Error loading fresh data:', error);
    }
  }, [user, globalPosts, globalStories, isOwnerMode, activeLocalProfileId]);

  // ✅ FIXED: Added loadFreshData to dependency array
  const loadData = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('[Social] ⚡ Already loading, skipping...');
      return;
    }

    isLoadingRef.current = true;

    try {
      console.log('[Social] ⚡ ULTRA-FAST loading...');

      // ✅ INSTANT: Try cache first
      const cachedPosts = socialCache.getFeed();
      const cachedStories = socialCache.getStories();

      if (cachedPosts && cachedStories) {
        console.log('[Social] ⚡⚡⚡ INSTANT from cache!');
        setPosts(cachedPosts);
        setHistorias(cachedStories);
        setLoading(false);
        
        // Load fresh data in background
        performanceOptimizer.runAfterInteractions(async () => {
          await loadFreshData();
        });
        
        isLoadingRef.current = false;
        return;
      }

      // Load fresh data
      await loadFreshData();
    } catch (error) {
      console.error('[Social] Error loading data:', error);
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [loadFreshData]);

  useEffect(() => {
    if (!isInitialLoading) {
      loadData();
    }
  }, [isInitialLoading, loadData]);

  useFocusEffect(
    useCallback(() => {
      if (!isInitialLoading) {
        loadData();
      }
    }, [isInitialLoading, loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    socialCache.clearAll();
    await refreshData(false);
    await loadData();
    setRefreshing(false);
  }, [loadData, refreshData]);

  const handleLike = useCallback(async (postId: string) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const wasLiked = post.liked;
    const newLikeCount = wasLiked ? post.likes - 1 : post.likes + 1;

    setPosts(prevPosts =>
      prevPosts.map(p =>
        p.id === postId
          ? { ...p, liked: !wasLiked, likes: newLikeCount }
          : p
      )
    );

    try {
      if (wasLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('usuario_id', user.id);
      } else {
        await supabase
          .from('likes')
          .insert({
            post_id: postId,
            usuario_id: user.id,
          });
      }
    } catch (error) {
      console.error('[Social] Error toggling like:', error);
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p.id === postId
            ? { ...p, liked: wasLiked, likes: post.likes }
            : p
        )
      );
    }
  }, [user, posts]);

  const handleCrearPublicacion = useCallback(() => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push('/crear/publicacion');
  }, [user, router]);

  if (isInitialLoading) {
    return <InitialLoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Social</Text>
        <TouchableOpacity
          onPress={handleCrearPublicacion}
          style={styles.createButton}
        >
          <IconSymbol
            ios_icon_name="plus.circle.fill"
            android_material_icon_name="add_circle"
            size={28}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stories Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.storiesContainer}
          contentContainerStyle={styles.storiesContent}
        >
          {historias.map((historia) => (
            <TouchableOpacity
              key={historia.id}
              style={styles.storyItem}
            >
              <View
                style={[
                  styles.storyCircle,
                  historia.visto_por_usuario && styles.storyCircleViewed,
                ]}
              >
                <Image
                  source={{ uri: historia.imagen_url }}
                  style={styles.storyImage}
                />
              </View>
              <Text style={styles.storyUsername}>
                {historia.tipo === 'usuario'
                  ? historia.autor?.nombre || 'Usuario'
                  : historia.local?.nombre || 'Local'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Posts Feed */}
        {posts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <Image
                source={{
                  uri:
                    post.tipo === 'usuario'
                      ? post.autor?.avatar || 'https://via.placeholder.com/40'
                      : post.local?.logo || 'https://via.placeholder.com/40',
                }}
                style={styles.postAvatar}
              />
              <View style={styles.postHeaderText}>
                <Text style={styles.postUsername}>
                  {post.tipo === 'usuario'
                    ? post.autor?.nombre || 'Usuario'
                    : post.local?.nombre || 'Local'}
                </Text>
                <Text style={styles.postTime}>
                  {new Date(post.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {post.contenido && (
              <Text style={styles.postContent}>{post.contenido}</Text>
            )}

            {post.imagen_url && (
              <Image
                source={{ uri: post.imagen_url }}
                style={styles.postImage}
                resizeMode="cover"
              />
            )}

            <View style={styles.postActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleLike(post.id)}
              >
                <IconSymbol
                  ios_icon_name={post.liked ? 'heart.fill' : 'heart'}
                  android_material_icon_name={post.liked ? 'favorite' : 'favorite_border'}
                  size={24}
                  color={post.liked ? '#FF3B30' : colors.text}
                />
                <Text style={styles.actionText}>{post.likes}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <IconSymbol
                  ios_icon_name="bubble.left"
                  android_material_icon_name="chat_bubble_outline"
                  size={24}
                  color={colors.text}
                />
                <Text style={styles.actionText}>{post.comentarios}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  createButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  storiesContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  storiesContent: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 12,
  },
  storyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: colors.primary,
    padding: 2,
  },
  storyCircleViewed: {
    borderColor: colors.border,
  },
  storyImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  storyUsername: {
    marginTop: 4,
    fontSize: 12,
    color: colors.text,
    maxWidth: 64,
    textAlign: 'center',
  },
  postCard: {
    backgroundColor: colors.card,
    marginBottom: 8,
    paddingVertical: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  postHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  postUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  postTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  postContent: {
    fontSize: 14,
    color: colors.text,
    paddingHorizontal: 16,
    marginBottom: 12,
    lineHeight: 20,
  },
  postImage: {
    width: '100%',
    height: SCREEN_WIDTH,
    backgroundColor: colors.border,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 4,
  },
});
