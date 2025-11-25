
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Pressable,
  FlatList,
  Keyboard,
  Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/IconSymbol';
import { useMode } from '@/contexts/ModeContext';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';
import { socialCache } from '@/utils/socialCache';
import { advancedCache } from '@/utils/advancedCache';
import { intelligentPreloader } from '@/utils/intelligentPreloader';
import InitialLoadingScreen from '@/components/common/InitialLoadingScreen';
import { LinearGradient } from 'expo-linear-gradient';
import ParsedText from '@/components/social/ParsedText';
import StoryViewer from '@/components/social/StoryViewer';
import { preloadStoryImages } from '@/utils/storyPreloader';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  liked_by_user?: boolean;
  views_count?: number;
  comments_count?: number;
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
    activeLocalData,
    ownedLocals,
    switchToClientProfile,
    switchToLocalProfile,
    setCurrentMode,
  } = useMode();
  
  const { posts: globalPosts, stories: globalStories, isInitialLoading, refreshData } = useGlobalData();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [historias, setHistorias] = useState<Historia[]>([]);
  const [userStories, setUserStories] = useState<Historia[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Historia | null>(null);
  const [storyViewerVisible, setStoryViewerVisible] = useState(false);
  
  const isLoadingRef = useRef(false);

  // ✅ FIXED: Moved useCallback inside component
  const loadData = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('[Social] ⚡ Already loading, skipping...');
      return;
    }

    isLoadingRef.current = true;

    try {
      console.log('[Social] ⚡ Loading user-specific data...');
      console.log('[Social] 📍 Global posts available:', globalPosts.length);
      console.log('[Social] 📍 Global stories available:', globalStories.length);

      if (globalPosts.length > 0) {
        console.log('[Social] ⚡⚡⚡ INSTANT posts from global data:', globalPosts.length);
        
        let filteredPosts = globalPosts;
        
        if (currentMode === 'propietario' && activeProfileType === 'local' && activeProfileId) {
          filteredPosts = globalPosts.filter(p => p.tipo === 'local' && p.local_id === activeProfileId);
          console.log('[Social] 🏢 Owner mode - Filtered posts for local:', activeProfileId, 'Count:', filteredPosts.length);
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
            console.log('[Social] 👤 User mode - Filtered user posts + followed locals, Count:', filteredPosts.length);
          } else {
            filteredPosts = globalPosts.filter(p => p.tipo === 'usuario');
            console.log('[Social] 👤 User mode - Filtered user posts only (not logged in), Count:', filteredPosts.length);
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
        } else {
          setPosts(filteredPosts);
        }
      }

      if (globalStories.length > 0) {
        console.log('[Social] ⚡⚡⚡ INSTANT stories from global data:', globalStories.length);
        
        let filteredStories: typeof globalStories = [];

        if (currentMode === 'propietario' && activeProfileType === 'local' && activeProfileId) {
          filteredStories = globalStories.filter(s => 
            s.tipo === 'usuario' || 
            (s.tipo === 'local' && s.local_id === activeProfileId)
          );
          console.log('[Social] 🏢 Owner mode - Filtered stories (users + own local):', filteredStories.length);
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
          console.log('[Social] 👤 User mode - Filtered stories (users + followed locals):', filteredStories.length);
        } else {
          filteredStories = globalStories.filter(s => s.tipo === 'usuario');
          console.log('[Social] 🔓 Not logged in - Showing all user stories:', filteredStories.length);
        }
        
        if (user) {
          const allStoryIds = filteredStories.map(s => s.id);
          
          const [viewedData, likesData, viewsCountData, commentsCountData] = await Promise.all([
            supabase
              .from('historia_views')
              .select('historia_id')
              .eq('usuario_id', user.id)
              .in('historia_id', allStoryIds),
            supabase
              .from('historia_likes')
              .select('historia_id')
              .eq('usuario_id', user.id)
              .in('historia_id', allStoryIds),
            supabase
              .from('historia_views')
              .select('historia_id')
              .in('historia_id', allStoryIds),
            supabase
              .from('historia_comentarios')
              .select('historia_id')
              .in('historia_id', allStoryIds),
          ]);
          
          const viewedStoryIds = new Set(viewedData.data?.map(v => v.historia_id) || []);
          const likedStoryIds = new Set(likesData.data?.map(l => l.historia_id) || []);
          
          const viewsCounts = viewsCountData.data?.reduce((acc, v) => {
            acc[v.historia_id] = (acc[v.historia_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {};
          
          const commentsCounts = commentsCountData.data?.reduce((acc, c) => {
            acc[c.historia_id] = (acc[c.historia_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {};
          
          const storiesWithStatus = filteredStories.map(story => ({
            ...story,
            visto_por_usuario: viewedStoryIds.has(story.id),
            liked_by_user: likedStoryIds.has(story.id),
            views_count: viewsCounts[story.id] || 0,
            comments_count: commentsCounts[story.id] || 0,
          }));
          
          setHistorias(storiesWithStatus);
        } else {
          setHistorias(filteredStories);
        }
      }

      console.log('[Social] ⚡ User-specific data loaded');
    } catch (error) {
      console.error('[Social] Error loading data:', error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [user, globalPosts, globalStories, currentMode, activeProfileType, activeProfileId]);

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

  const handleCrearHistoria = useCallback(() => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push('/crear/historia');
  }, [user, router]);

  const handleHistoriaPress = useCallback((historia: Historia) => {
    setSelectedStory(historia);
    setStoryViewerVisible(true);
  }, []);

  const handleCloseStoryViewer = useCallback(() => {
    setStoryViewerVisible(false);
    setSelectedStory(null);
  }, []);

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
        {(historias.length > 0 || userStories.length > 0) && (
          <View style={styles.storiesSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storiesScroll}>
              {user && (
                <TouchableOpacity onPress={handleCrearHistoria} style={styles.createStoryButton}>
                  <View style={styles.createStoryCircle}>
                    <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={24} color={colors.background} />
                  </View>
                  <Text style={styles.storyUsername}>Tu historia</Text>
                </TouchableOpacity>
              )}
              
              {userStories.map((historia) => (
                <TouchableOpacity key={historia.id} onPress={() => handleHistoriaPress(historia)} style={styles.storyItem}>
                  <LinearGradient
                    colors={historia.visto_por_usuario ? [colors.border, colors.border] : [colors.primary, colors.secondary]}
                    style={styles.storyGradient}
                  >
                    <Image source={{ uri: historia.imagen }} style={styles.storyImage} />
                  </LinearGradient>
                  <Text style={styles.storyUsername} numberOfLines={1}>Tú</Text>
                </TouchableOpacity>
              ))}

              {historias.map((historia) => (
                <TouchableOpacity key={historia.id} onPress={() => handleHistoriaPress(historia)} style={styles.storyItem}>
                  <LinearGradient
                    colors={historia.visto_por_usuario ? [colors.border, colors.border] : [colors.primary, colors.secondary]}
                    style={styles.storyGradient}
                  >
                    <Image source={{ uri: historia.imagen }} style={styles.storyImage} />
                  </LinearGradient>
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
              <Text style={styles.emptyStateSubtext}>Sé el primero en publicar algo</Text>
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
                  <ParsedText text={post.contenido} style={styles.postContent} />
                )}

                {post.imagen && (
                  <Image source={{ uri: post.imagen }} style={styles.postImage} />
                )}

                {post.imagenes && post.imagenes.length > 0 && (
                  <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                    {post.imagenes.map((img, idx) => (
                      <Image key={idx} source={{ uri: img }} style={styles.postImage} />
                    ))}
                  </ScrollView>
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

                  <TouchableOpacity style={styles.actionButton}>
                    <IconSymbol
                      ios_icon_name={post.saved ? "bookmark.fill" : "bookmark"}
                      android_material_icon_name={post.saved ? "bookmark" : "bookmark_border"}
                      size={24}
                      color={post.saved ? colors.primary : colors.text}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {selectedStory && (
        <StoryViewer
          visible={storyViewerVisible}
          stories={historias}
          initialIndex={historias.findIndex(s => s.id === selectedStory.id)}
          onClose={handleCloseStoryViewer}
        />
      )}

      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="Inicia sesión para crear publicaciones e historias"
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
  createStoryButton: {
    alignItems: 'center',
    marginRight: 12,
    width: 70,
  },
  createStoryCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 12,
    width: 70,
  },
  storyGradient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 2,
    marginBottom: 4,
  },
  storyImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.background,
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
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
});
