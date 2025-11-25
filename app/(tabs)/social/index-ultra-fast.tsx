
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
} from 'react-native';
import { supabase } from '@/utils/supabase';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Post {
  id: string;
  contenido: string;
  imagen?: string;
  imagenes?: string[];
  autor_id?: string;
  local_id?: string;
  tipo: 'usuario' | 'local';
  created_at: string;
  likes: number;
  comentarios: number;
  liked?: boolean;
  saved?: boolean;
  autor?: {
    id: string;
    nombre: string;
    username: string;
    avatar_url?: string;
  };
  local?: {
    id: string;
    nombre: string;
    avatar_url?: string;
  };
}

interface Historia {
  id: string;
  imagen: string;
  autor_id?: string;
  local_id?: string;
  tipo: 'usuario' | 'local';
  created_at: string;
  visto_por_usuario?: boolean;
  autor?: {
    id: string;
    nombre: string;
    username: string;
    avatar_url?: string;
  };
  local?: {
    id: string;
    nombre: string;
    avatar_url?: string;
  };
}

export default function SocialScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const { 
    currentMode,
    activeProfileId,
    activeProfileType,
  } = useMode();
  
  const { posts: globalPosts, stories: globalStories, isInitialLoading, refreshData } = useGlobalData();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [historias, setHistorias] = useState<Historia[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const isLoadingRef = useRef(false);

  // ✅ FIXED: Extracted loadFreshData function
  const loadFreshData = useCallback(async () => {
    console.log('[Social] 🔄 Loading fresh data from Supabase...');
    
    let filteredPosts = globalPosts;
    
    if (currentMode === 'propietario' && activeProfileType === 'local' && activeProfileId) {
      filteredPosts = globalPosts.filter(p => p.tipo === 'local' && p.local_id === activeProfileId);
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

    let filteredStories = globalStories;
    
    if (currentMode === 'propietario' && activeProfileType === 'local' && activeProfileId) {
      filteredStories = globalStories.filter(s => 
        s.tipo === 'usuario' || 
        (s.tipo === 'local' && s.local_id === activeProfileId)
      );
    } else if (user) {
      const { data: followedLocals } = await supabase
        .from('locales_favoritos')
        .select('local_id')
        .eq('usuario_id', user.id);

      const followedLocalIds = new Set(followedLocals?.map(f => f.local_id) || []);
      
      filteredStories = globalStories.filter(s => 
        s.tipo === 'usuario' ||
        (s.tipo === 'local' && s.local_id && followedLocalIds.has(s.local_id))
      );
    } else {
      filteredStories = globalStories.filter(s => s.tipo === 'usuario');
    }
    
    if (user) {
      const allStoryIds = filteredStories.map(s => s.id);
      
      const viewedData = await supabase
        .from('historia_views')
        .select('historia_id')
        .eq('usuario_id', user.id)
        .in('historia_id', allStoryIds);
      
      const viewedStoryIds = new Set(viewedData.data?.map(v => v.historia_id) || []);
      
      const storiesWithStatus = filteredStories.map(story => ({
        ...story,
        visto_por_usuario: viewedStoryIds.has(story.id),
      }));
      
      setHistorias(storiesWithStatus);
      socialCache.setStories(storiesWithStatus);
    } else {
      setHistorias(filteredStories);
      socialCache.setStories(filteredStories);
    }
  }, [user, globalPosts, globalStories, currentMode, activeProfileType, activeProfileId]);

  // ✅ FIXED: Added missing dependency 'loadFreshData' to useCallback
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

  useFocusEffect(
    useCallback(() => {
      console.log('[Social] 🔄 Screen focused - loading data...');
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (!isInitialLoading && globalPosts.length > 0) {
      console.log('[Social] 🔄 Global data updated - reloading...');
      loadData();
    }
  }, [isInitialLoading, globalPosts.length, globalStories.length, loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    socialCache.clearAll();
    await refreshData(false);
    await loadData();
    setRefreshing(false);
  }, [loadData, refreshData]);

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
        <TouchableOpacity onPress={handleCrearPublicacion} style={styles.createButton}>
          <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {historias.length > 0 && (
          <View style={styles.storiesSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storiesScroll}>
              {historias.map((historia) => (
                <TouchableOpacity key={historia.id} style={styles.storyItem}>
                  <Image source={{ uri: historia.imagen }} style={styles.storyImage} />
                  <Text style={styles.storyUsername} numberOfLines={1}>
                    {historia.tipo === 'usuario' ? historia.autor?.username : historia.local?.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.postsSection}>
          {posts.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol ios_icon_name="photo.on.rectangle" android_material_icon_name="photo_library" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>No hay publicaciones</Text>
            </View>
          ) : (
            posts.map((post) => (
              <View key={post.id} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <Image
                    source={{ uri: post.tipo === 'usuario' ? post.autor?.avatar_url : post.local?.avatar_url }}
                    style={styles.postAvatar}
                  />
                  <View style={styles.postHeaderText}>
                    <Text style={styles.postUsername}>
                      {post.tipo === 'usuario' ? post.autor?.username : post.local?.nombre}
                    </Text>
                    <Text style={styles.postTime}>
                      {new Date(post.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {post.contenido && (
                  <Text style={styles.postContent}>{post.contenido}</Text>
                )}

                {post.imagen && (
                  <Image source={{ uri: post.imagen }} style={styles.postImage} />
                )}

                <View style={styles.postActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <IconSymbol
                      ios_icon_name={post.liked ? "heart.fill" : "heart"}
                      android_material_icon_name={post.liked ? "favorite" : "favorite_border"}
                      size={24}
                      color={post.liked ? colors.error : colors.text}
                    />
                    <Text style={styles.actionText}>{post.likes}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionButton}>
                    <IconSymbol ios_icon_name="bubble.left" android_material_icon_name="chat_bubble_outline" size={24} color={colors.text} />
                    <Text style={styles.actionText}>{post.comentarios}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="Inicia sesión para crear publicaciones"
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
  storiesSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  storiesScroll: {
    paddingHorizontal: 12,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 12,
    width: 70,
  },
  storyImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 4,
  },
  storyUsername: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
  },
  postsSection: {
    paddingVertical: 8,
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
    marginRight: 12,
  },
  postHeaderText: {
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
  },
  postContent: {
    fontSize: 14,
    color: colors.text,
    paddingHorizontal: 16,
    marginBottom: 12,
    lineHeight: 20,
  },
  postImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    resizeMode: 'cover',
  },
  postActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    color: colors.text,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
});
