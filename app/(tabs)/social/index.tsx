
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Animated,
  Alert,
  ActivityIndicator,
  Pressable,
  FlatList,
} from 'react-native';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';
import { supabase } from '@/utils/supabase';
import { socialCache } from '@/utils/socialCache';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import InitialLoadingScreen from '@/components/common/InitialLoadingScreen';

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = 120;

interface Comentario {
  id: string;
  autor_id: string;
  texto: string;
  created_at: string;
  likes: number;
  parent_comment_id?: string;
  autor?: {
    nombre: string;
    avatar?: string;
    username?: string;
  };
  liked?: boolean;
  replies?: Comentario[];
}

interface HistoriaConAutor {
  id: string;
  autor_id: string;
  tipo: string;
  imagen: string;
  created_at: string;
  expires_at: string;
  visto: boolean;
  autor?: {
    nombre: string;
    avatar?: string;
    username?: string;
  };
  visto_por_usuario?: boolean;
  views_count?: number;
  likes_count?: number;
  liked_by_user?: boolean;
  comments_count?: number;
}

interface SearchResult {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  tipo: 'usuario' | 'local';
  bio?: string;
  seguidores?: number;
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
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.headerText,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 4,
  },
  searchModal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchModalHeader: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.cardBorder,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 8,
  },
  searchResults: {
    flex: 1,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.cardBorder,
  },
  searchResultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  searchResultUsername: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  historiasContainer: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.cardBorder,
    minHeight: 130,
    backgroundColor: colors.background,
  },
  historiasScrollContent: {
    alignItems: 'center',
  },
  historiaItem: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  historiaAvatarContainer: {
    position: 'relative',
  },
  historiaGradientBorder: {
    padding: 3,
    borderRadius: 48,
    width: 96,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historiaAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: colors.background,
  },
  historiaAvatarVisto: {
    borderColor: colors.cardBorder,
  },
  historiaAddButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    position: 'relative',
  },
  historiaUserAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  historiaAddIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  historiaNombre: {
    fontSize: 12,
    color: colors.text,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 90,
  },
  feedContainer: {
    flex: 1,
  },
  postCard: {
    backgroundColor: colors.cardBackground,
    marginBottom: 8,
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
  postImagen: {
    width: width,
    height: width,
    backgroundColor: colors.cardBorder,
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
  postComentarios: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  postComentariosText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  storyViewerModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  storyViewerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  storyProgressContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  storyProgressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  storyProgressFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  storyAutorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyAutorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  storyAutorNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  storyCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyDeleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  storyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyImage: {
    width: width,
    height: height,
  },
  storyTouchZones: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  storyTouchZone: {
    flex: 1,
  },
  storyInteractionBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    zIndex: 10,
  },
  storyInteractionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  storyInteractionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  storyMessageInput: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  storySendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarInStory: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  createOptionsModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  createOptionsContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  createOptionsHeader: {
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  createOptionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  createOptionsButtons: {
    padding: 16,
    gap: 12,
  },
  createOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  createOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  createOptionInfo: {
    flex: 1,
  },
  createOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  createOptionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
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

export default function SocialScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const { posts: globalPosts, stories: globalStories, isInitialLoading, refreshData } = useGlobalData();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [historias, setHistorias] = useState<HistoriaConAutor[]>([]);
  const [userStories, setUserStories] = useState<HistoriaConAutor[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  
  // Story viewer states
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [viewingOwnStories, setViewingOwnStories] = useState(false);
  const [storyMessage, setStoryMessage] = useState('');
  const storyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Scroll animation states
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('down');
  const headerTranslateY = useRef(new Animated.Value(0)).current;

  const isLoadingRef = useRef(false);
  const likingPostsRef = useRef<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('[Social] ⚡ Already loading, skipping...');
      return;
    }

    isLoadingRef.current = true;

    try {
      console.log('[Social] ⚡ Loading user-specific data...');

      if (globalPosts.length > 0) {
        console.log('[Social] ⚡ INSTANT posts from global data:', globalPosts.length);
        
        if (user) {
          const postIds = globalPosts.map(p => p.id);
          
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

          const postsWithStatus = globalPosts.map(post => ({
            ...post,
            liked: likedPostIds.has(post.id),
            saved: savedPostIds.has(post.id),
            comentarios: commentCounts[post.id] || 0,
          }));
          
          setPosts(postsWithStatus);
        } else {
          setPosts(globalPosts);
        }
      }

      if (globalStories.length > 0) {
        console.log('[Social] ⚡ INSTANT stories from global data:', globalStories.length);
        
        const userOwnStories = user ? globalStories.filter(s => s.autor_id === user.id) : [];
        const otherStories = user ? globalStories.filter(s => s.autor_id !== user.id) : globalStories;
        
        if (user) {
          const allStoryIds = globalStories.map(s => s.id);
          
          // Load views, likes, comments for stories
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
          
          const userStoriesWithStatus = userOwnStories.map(story => ({
            ...story,
            visto_por_usuario: viewedStoryIds.has(story.id),
            liked_by_user: likedStoryIds.has(story.id),
            views_count: viewsCounts[story.id] || 0,
            comments_count: commentsCounts[story.id] || 0,
          }));
          
          const otherStoriesWithStatus = otherStories.map(story => ({
            ...story,
            visto_por_usuario: viewedStoryIds.has(story.id),
            liked_by_user: likedStoryIds.has(story.id),
            views_count: viewsCounts[story.id] || 0,
            comments_count: commentsCounts[story.id] || 0,
          }));
          
          setUserStories(userStoriesWithStatus);
          setHistorias(otherStoriesWithStatus);
        } else {
          setHistorias(otherStories);
        }
      }

      console.log('[Social] ⚡ User-specific data loaded');
    } catch (error) {
      console.error('[Social] Error loading data:', error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [user, globalPosts, globalStories]);

  useFocusEffect(
    useCallback(() => {
      console.log('[Social] ⚡ Screen focused');
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData(false);
    await loadData();
    setRefreshing(false);
  }, [loadData, refreshData]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, username, avatar')
        .or(`nombre.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(10);

      if (!error && data) {
        setSearchResults(data.map(u => ({ ...u, tipo: 'usuario' as const })));
      }
    } catch (error) {
      console.error('[Social] Error searching:', error);
    }
  }, []);

  const handleScroll = useCallback((event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const delta = currentScrollY - lastScrollY.current;

    if (delta > 0 && currentScrollY > 50) {
      if (scrollDirection.current !== 'down') {
        scrollDirection.current = 'down';
        Animated.timing(headerTranslateY, {
          toValue: -HEADER_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    } else if (delta < -5) {
      if (scrollDirection.current !== 'up') {
        scrollDirection.current = 'up';
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }

    lastScrollY.current = currentScrollY;
  }, [headerTranslateY]);

  const stopStoryTimer = useCallback(() => {
    if (storyTimerRef.current) {
      clearTimeout(storyTimerRef.current);
      storyTimerRef.current = null;
    }
    progressAnim.stopAnimation();
  }, [progressAnim]);

  const handleNextStory = useCallback(async () => {
    const currentStories = viewingOwnStories ? userStories : historias;
    const currentStory = currentStories[currentStoryIndex];
    
    if (currentStory && user && !viewingOwnStories) {
      try {
        const { data: existingView } = await supabase
          .from('historia_views')
          .select('id')
          .eq('historia_id', currentStory.id)
          .eq('usuario_id', user.id)
          .single();

        if (!existingView) {
          await supabase.from('historia_views').insert({
            historia_id: currentStory.id,
            usuario_id: user.id,
          });
        }
      } catch (error) {
        console.error('[Social] Error marking story as viewed:', error);
      }
    }
    
    if (currentStory && user && viewingOwnStories) {
      try {
        const { data: existingView } = await supabase
          .from('historia_views')
          .select('id')
          .eq('historia_id', currentStory.id)
          .eq('usuario_id', user.id)
          .single();

        if (!existingView) {
          await supabase.from('historia_views').insert({
            historia_id: currentStory.id,
            usuario_id: user.id,
          });
        }
      } catch (error) {
        console.error('[Social] Error marking own story as viewed:', error);
      }
    }
    
    if (currentStoryIndex < currentStories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      progressAnim.setValue(0);
    } else {
      socialCache.clearStories();
      socialCache.clearStories(user?.id);
      await loadData();
      setShowStoryViewer(false);
      stopStoryTimer();
    }
  }, [currentStoryIndex, historias, userStories, viewingOwnStories, stopStoryTimer, user, loadData, progressAnim]);

  const startStoryTimer = useCallback(() => {
    if (storyTimerRef.current) {
      clearTimeout(storyTimerRef.current);
    }

    progressAnim.setValue(0);

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false,
    }).start();

    storyTimerRef.current = setTimeout(() => {
      handleNextStory();
    }, 5000);
  }, [handleNextStory, progressAnim]);

  const findFirstUnviewedStoryIndex = useCallback((stories: HistoriaConAutor[]): number => {
    const firstUnviewedIndex = stories.findIndex(story => !story.visto_por_usuario);
    return firstUnviewedIndex === -1 ? 0 : firstUnviewedIndex;
  }, []);

  const handleStoryPress = useCallback((index: number, isOwnStory: boolean = false) => {
    const stories = isOwnStory ? userStories : historias;
    const firstUnviewedIndex = findFirstUnviewedStoryIndex(stories);
    
    setCurrentStoryIndex(firstUnviewedIndex);
    setViewingOwnStories(isOwnStory);
    setShowStoryViewer(true);
    setIsPaused(false);
    startStoryTimer();
  }, [startStoryTimer, userStories, historias, findFirstUnviewedStoryIndex]);

  const handlePreviousStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      progressAnim.setValue(0);
      startStoryTimer();
    } else {
      setShowStoryViewer(false);
      stopStoryTimer();
    }
  }, [currentStoryIndex, startStoryTimer, stopStoryTimer, progressAnim]);

  const handleDeleteStory = useCallback(async () => {
    const currentStories = viewingOwnStories ? userStories : historias;
    const currentStory = currentStories[currentStoryIndex];
    
    if (!currentStory || !user || currentStory.autor_id !== user.id) {
      return;
    }

    Alert.alert(
      'Eliminar historia',
      '¿Estás seguro de que quieres eliminar esta historia?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('historias')
                .delete()
                .eq('id', currentStory.id);

              if (error) throw error;

              if (viewingOwnStories) {
                const newStories = userStories.filter((_, i) => i !== currentStoryIndex);
                setUserStories(newStories);
                socialCache.setStories(newStories, user.id);
              } else {
                const newHistorias = historias.filter((_, i) => i !== currentStoryIndex);
                setHistorias(newHistorias);
                socialCache.setStories(newHistorias);
              }

              setShowStoryViewer(false);
              stopStoryTimer();
              setCurrentStoryIndex(0);

              Alert.alert('Éxito', 'Historia eliminada correctamente');
            } catch (error) {
              console.error('[Social] Error deleting story:', error);
              Alert.alert('Error', 'No se pudo eliminar la historia');
            }
          },
        },
      ]
    );
  }, [historias, userStories, currentStoryIndex, user, viewingOwnStories, stopStoryTimer]);

  const handleStoryLike = useCallback(async () => {
    const currentStories = viewingOwnStories ? userStories : historias;
    const currentStory = currentStories[currentStoryIndex];
    
    if (!currentStory || !user) {
      setLoginMessage('Para dar me gusta necesitas registrarte en BarLive');
      setShowLoginModal(true);
      return;
    }

    const isLiked = currentStory.liked_by_user;

    try {
      if (isLiked) {
        await supabase
          .from('historia_likes')
          .delete()
          .eq('historia_id', currentStory.id)
          .eq('usuario_id', user.id);
      } else {
        await supabase.from('historia_likes').insert({
          historia_id: currentStory.id,
          usuario_id: user.id,
        });
      }

      if (viewingOwnStories) {
        setUserStories(prev => prev.map((s, i) => 
          i === currentStoryIndex 
            ? { ...s, liked_by_user: !isLiked }
            : s
        ));
      } else {
        setHistorias(prev => prev.map((s, i) => 
          i === currentStoryIndex 
            ? { ...s, liked_by_user: !isLiked }
            : s
        ));
      }
    } catch (error) {
      console.error('[Social] Error toggling story like:', error);
    }
  }, [user, currentStoryIndex, viewingOwnStories, userStories, historias]);

  // FIXED: Send message with story - removed expires_at field, added historia_id and historia_imagen
  const handleSendStoryMessage = useCallback(async () => {
    const currentStories = viewingOwnStories ? userStories : historias;
    const currentStory = currentStories[currentStoryIndex];
    
    if (!currentStory || !user || !storyMessage.trim()) {
      return;
    }

    try {
      console.log('[Social] Sending story message...');
      
      // Find or create chat
      const { data: chatExistente, error: chatError } = await supabase
        .from('chats')
        .select('id')
        .or(`and(usuario1_id.eq.${user.id},usuario2_id.eq.${currentStory.autor_id}),and(usuario1_id.eq.${currentStory.autor_id},usuario2_id.eq.${user.id})`)
        .single();

      let chatId = chatExistente?.id;

      if (!chatId) {
        console.log('[Social] Creating new chat...');
        const { data: nuevoChat, error: nuevoChatError } = await supabase
          .from('chats')
          .insert({
            usuario1_id: user.id,
            usuario2_id: currentStory.autor_id,
          })
          .select()
          .single();

        if (nuevoChatError) throw nuevoChatError;
        chatId = nuevoChat.id;
        console.log('[Social] Chat created:', chatId);
      }

      // FIXED: Send message with historia_id and historia_imagen instead of expires_at
      const { error: mensajeError } = await supabase
        .from('mensajes')
        .insert({
          chat_id: chatId,
          remitente_id: user.id,
          contenido: storyMessage,
          historia_id: currentStory.id,
          historia_imagen: currentStory.imagen,
          tipo_mensaje: 'texto',
        });

      if (mensajeError) throw mensajeError;

      console.log('[Social] Message sent successfully');

      // Create notification
      await supabase.from('notificaciones').insert({
        usuario_id: currentStory.autor_id,
        tipo: 'mensaje_privado',
        titulo: 'Mensaje sobre tu historia',
        mensaje: `${user.nombre} te envió un mensaje sobre tu historia`,
        usuario_origen_id: user.id,
      });

      setStoryMessage('');
      Alert.alert('Éxito', 'Mensaje enviado correctamente');
    } catch (error) {
      console.error('[Social] Error sending story message:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
    }
  }, [user, currentStoryIndex, viewingOwnStories, userStories, historias, storyMessage]);

  const toggleLike = useCallback(async (postId: string) => {
    if (!user) {
      setLoginMessage('Para dar me gusta necesitas registrarte en BarLive');
      setShowLoginModal(true);
      return;
    }

    if (likingPostsRef.current.has(postId)) {
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isLiked = post.liked;
    const currentLikes = post.likes || 0;

    likingPostsRef.current.add(postId);

    const updatedPost = {
      ...post,
      liked: !isLiked,
      likes: isLiked ? currentLikes - 1 : currentLikes + 1,
    };
    
    setPosts(prevPosts => prevPosts.map(p => 
      p.id === postId ? updatedPost : p
    ));
    
    socialCache.updatePost(postId, {
      liked: !isLiked,
      likes: isLiked ? currentLikes - 1 : currentLikes + 1,
    });

    try {
      if (isLiked) {
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('usuario_id', user.id);
        
        if (deleteError) throw deleteError;
        
        await supabase
          .from('posts')
          .update({ likes: Math.max(0, currentLikes - 1) })
          .eq('id', postId);
      } else {
        const { data: existingLike } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', postId)
          .eq('usuario_id', user.id)
          .single();
        
        if (existingLike) {
          setPosts(prevPosts => prevPosts.map(p => 
            p.id === postId 
              ? { ...p, liked: true, likes: currentLikes }
              : p
          ));
          socialCache.updatePost(postId, { liked: true, likes: currentLikes });
          likingPostsRef.current.delete(postId);
          return;
        }
        
        const { error: insertError } = await supabase.from('likes').insert({
          post_id: postId,
          usuario_id: user.id,
        });
        
        if (insertError) throw insertError;
        
        await supabase
          .from('posts')
          .update({ likes: currentLikes + 1 })
          .eq('id', postId);
      }
    } catch (error) {
      console.error('[Social] Error toggling like:', error);
      setPosts(prevPosts => prevPosts.map(p => 
        p.id === postId 
          ? { ...p, liked: isLiked, likes: currentLikes }
          : p
      ));
      socialCache.updatePost(postId, { liked: isLiked, likes: currentLikes });
    } finally {
      likingPostsRef.current.delete(postId);
    }
  }, [user, posts]);

  const toggleSave = useCallback(async (postId: string) => {
    if (!user) {
      setLoginMessage('Para guardar publicaciones necesitas registrarte en BarLive');
      setShowLoginModal(true);
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isSaved = post.saved;

    setPosts(prevPosts => prevPosts.map(p => 
      p.id === postId 
        ? { ...p, saved: !isSaved }
        : p
    ));
    
    socialCache.updatePost(postId, { saved: !isSaved });

    try {
      if (isSaved) {
        await supabase
          .from('posts_guardados')
          .delete()
          .eq('post_id', postId)
          .eq('usuario_id', user.id);
      } else {
        await supabase.from('posts_guardados').insert({
          post_id: postId,
          usuario_id: user.id,
        });
      }
    } catch (error) {
      console.error('[Social] Error toggling save:', error);
      setPosts(prevPosts => prevPosts.map(p => 
        p.id === postId 
          ? { ...p, saved: isSaved }
          : p
      ));
      socialCache.updatePost(postId, { saved: isSaved });
    }
  }, [user, posts]);

  const handleDeletePost = useCallback(async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post || !user || post.autor_id !== user.id) {
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
              const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId);

              if (error) throw error;

              setPosts(posts.filter(p => p.id !== postId));
              socialCache.clearPost(postId);
              socialCache.clearFeed();
              Alert.alert('Éxito', 'Publicación eliminada correctamente');
            } catch (error) {
              console.error('[Social] Error deleting post:', error);
              Alert.alert('Error', 'No se pudo eliminar la publicación');
            }
          },
        },
      ]
    );
  }, [posts, user]);

  const handleCreatePress = useCallback(() => {
    if (!user) {
      setLoginMessage('Para crear contenido necesitas registrarte en BarLive');
      setShowLoginModal(true);
    } else {
      setShowCreateOptions(true);
    }
  }, [user]);

  useEffect(() => {
    if (showStoryViewer && !isPaused) {
      startStoryTimer();
    }
    return () => {
      stopStoryTimer();
    };
  }, [showStoryViewer, currentStoryIndex, isPaused, startStoryTimer, stopStoryTimer]);

  const groupedStories = useMemo(() => {
    const storyGroups = historias.reduce((acc, historia) => {
      const authorId = historia.autor_id;
      if (!acc[authorId]) {
        acc[authorId] = [];
      }
      acc[authorId].push(historia);
      return acc;
    }, {} as Record<string, typeof historias>);

    return Object.values(storyGroups).map((authorStories) => {
      const firstStory = authorStories[0];
      const allViewed = authorStories.every(s => s.visto_por_usuario);
      const firstStoryIndex = historias.findIndex(h => h.id === firstStory.id);

      return {
        firstStory,
        allViewed,
        firstStoryIndex,
      };
    });
  }, [historias]);

  const currentStories = viewingOwnStories ? userStories : historias;
  const currentStory = currentStories[currentStoryIndex];
  const hasUserStories = userStories.length > 0;
  const hasUnviewedUserStories = userStories.some(s => !s.visto_por_usuario);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (isInitialLoading) {
    return <InitialLoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          transform: [{ translateY: headerTranslateY }],
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        }}
      >
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Social</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/(tabs)/perfil/chats')}
              activeOpacity={0.7}
            >
              <IconSymbol name="message.fill" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/(tabs)/perfil/notificaciones')}
              activeOpacity={0.7}
            >
              <IconSymbol name="bell.fill" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowSearchModal(true)}
              activeOpacity={0.7}
            >
              <IconSymbol name="magnifyingglass" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleCreatePress}
              activeOpacity={0.7}
            >
              <IconSymbol name="plus" size={24} color={colors.headerText} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: HEADER_HEIGHT }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Stories */}
        <View style={styles.historiasContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.historiasScrollContent}
          >
            {user && (
              <TouchableOpacity
                style={styles.historiaItem}
                onPress={() => {
                  if (hasUserStories) {
                    handleStoryPress(0, true);
                  } else {
                    router.push('/crear/historia');
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.historiaAddButton}>
                  {hasUserStories ? (
                    hasUnviewedUserStories ? (
                      <LinearGradient
                        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.historiaGradientBorder}
                      >
                        {user.avatar ? (
                          <Image source={{ uri: user.avatar }} style={styles.historiaAvatar} />
                        ) : (
                          <View style={[styles.historiaAvatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarText}>
                              {user.nombre?.charAt(0).toUpperCase() || 'U'}
                            </Text>
                          </View>
                        )}
                      </LinearGradient>
                    ) : (
                      <>
                        {user.avatar ? (
                          <Image source={{ uri: user.avatar }} style={[styles.historiaAvatar, { borderWidth: 2, borderColor: colors.cardBorder }]} />
                        ) : (
                          <View style={[styles.historiaAvatar, styles.avatarPlaceholder, { borderWidth: 2, borderColor: colors.cardBorder }]}>
                            <Text style={styles.avatarText}>
                              {user.nombre?.charAt(0).toUpperCase() || 'U'}
                            </Text>
                          </View>
                        )}
                      </>
                    )
                  ) : (
                    <>
                      {user.avatar ? (
                        <Image source={{ uri: user.avatar }} style={styles.historiaUserAvatar} />
                      ) : (
                        <View style={[styles.historiaUserAvatar, styles.avatarPlaceholder]}>
                          <Text style={styles.avatarText}>
                            {user.nombre?.charAt(0).toUpperCase() || 'U'}
                          </Text>
                        </View>
                      )}
                      <View style={styles.historiaAddIcon}>
                        <IconSymbol name="plus" size={18} color={colors.headerText} />
                      </View>
                    </>
                  )}
                </View>
                <Text style={styles.historiaNombre}>Tu historia</Text>
              </TouchableOpacity>
            )}

            {groupedStories.map(({ firstStory, allViewed, firstStoryIndex }, groupIndex) => (
              <TouchableOpacity
                key={firstStory.id}
                style={styles.historiaItem}
                onPress={() => handleStoryPress(firstStoryIndex, false)}
                activeOpacity={0.7}
              >
                <View style={styles.historiaAvatarContainer}>
                  {!allViewed ? (
                    <LinearGradient
                      colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.historiaGradientBorder}
                    >
                      {firstStory.autor?.avatar ? (
                        <Image
                          source={{ uri: firstStory.autor.avatar }}
                          style={styles.historiaAvatar}
                        />
                      ) : (
                        <View style={[styles.historiaAvatar, styles.avatarPlaceholder]}>
                          <Text style={styles.avatarText}>
                            {firstStory.autor?.nombre?.charAt(0).toUpperCase() || 'U'}
                          </Text>
                        </View>
                      )}
                    </LinearGradient>
                  ) : (
                    <>
                      {firstStory.autor?.avatar ? (
                        <Image
                          source={{ uri: firstStory.autor.avatar }}
                          style={[styles.historiaAvatar, { borderWidth: 2, borderColor: colors.cardBorder }]}
                        />
                      ) : (
                        <View style={[styles.historiaAvatar, styles.avatarPlaceholder, { borderWidth: 2, borderColor: colors.cardBorder }]}>
                          <Text style={styles.avatarText}>
                            {firstStory.autor?.nombre?.charAt(0).toUpperCase() || 'U'}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
                <Text style={styles.historiaNombre} numberOfLines={1}>
                  {firstStory.autor?.nombre || 'Usuario'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Posts Feed */}
        <View style={styles.feedContainer}>
          {posts.length > 0 ? (
            posts.map((post) => (
              <View key={post.id} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                    onPress={() => {
                      if (user && post.autor_id === user.id) {
                        router.push('/(tabs)/perfil');
                      } else {
                        router.push(`/perfil/usuario?userId=${post.autor_id}`);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    {post.autor?.avatar ? (
                      <Image source={{ uri: post.autor.avatar }} style={styles.postAvatar} />
                    ) : (
                      <View style={[styles.postAvatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarText}>
                          {post.autor?.nombre?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.postAutorInfo}>
                      <Text style={styles.postAutorNombre}>{post.autor?.nombre || 'Usuario'}</Text>
                      <Text style={styles.postFecha}>{formatearFecha(post.created_at)}</Text>
                    </View>
                  </TouchableOpacity>
                  {user && post.autor_id === user.id && (
                    <TouchableOpacity 
                      style={styles.postOptionsButton}
                      onPress={() => handleDeletePost(post.id)}
                      activeOpacity={0.7}
                    >
                      <IconSymbol name="trash" size={22} color="#000000" />
                    </TouchableOpacity>
                  )}
                </View>

                {post.imagen && (
                  <TouchableOpacity 
                    onPress={() => router.push(`/social/post?id=${post.id}`)}
                    activeOpacity={0.9}
                  >
                    <Image source={{ uri: post.imagen }} style={styles.postImagen} />
                  </TouchableOpacity>
                )}

                <View style={styles.postActions}>
                  <TouchableOpacity 
                    style={styles.postActionButton}
                    onPress={() => toggleLike(post.id)}
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
                    onPress={() => router.push(`/social/post?id=${post.id}`)}
                    activeOpacity={0.7}
                  >
                    <IconSymbol name="message" size={26} color={colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.postActionButton}
                    onPress={() => router.push(`/social/post?id=${post.id}&share=true`)}
                    activeOpacity={0.7}
                  >
                    <IconSymbol name="paperplane" size={26} color={colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.postActionButtonRight}
                    onPress={() => toggleSave(post.id)}
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
                      <Text style={{ fontWeight: '600' }}>{post.autor?.nombre || 'Usuario'}</Text>{' '}
                      {post.contenido}
                    </Text>
                  </View>
                )}

                {post.comentarios > 0 && (
                  <TouchableOpacity
                    style={styles.postComentarios}
                    onPress={() => router.push(`/social/post?id=${post.id}`)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.postComentariosText}>
                      Ver {post.comentarios === 1 ? 'el comentario' : `los ${post.comentarios} comentarios`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <IconSymbol name="photo.on.rectangle" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No hay publicaciones aún</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={styles.searchModal}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.searchModalHeader}
          >
            <TouchableOpacity onPress={() => setShowSearchModal(false)} activeOpacity={0.7}>
              <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <View style={styles.searchInputContainer}>
              <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar usuarios..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
              />
            </View>
          </LinearGradient>

          <ScrollView style={styles.searchResults}>
            {searchResults.map((result) => (
              <TouchableOpacity
                key={result.id}
                style={styles.searchResultItem}
                onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSearchModal(false);
                  if (user && result.id === user.id) {
                    router.push('/(tabs)/perfil');
                  } else {
                    router.push(`/perfil/usuario?userId=${result.id}`);
                  }
                }}
                activeOpacity={0.7}
              >
                {result.avatar ? (
                  <Image source={{ uri: result.avatar }} style={styles.searchResultAvatar} />
                ) : (
                  <View style={[styles.searchResultAvatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>
                      {result.nombre.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.searchResultInfo}>
                  <Text style={styles.searchResultName}>{result.nombre}</Text>
                  {result.username && (
                    <Text style={styles.searchResultUsername}>@{result.username}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Create Options Modal */}
      <Modal
        visible={showCreateOptions}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateOptions(false)}
      >
        <Pressable 
          style={styles.createOptionsModal}
          onPress={() => setShowCreateOptions(false)}
        >
          <Pressable style={styles.createOptionsContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.createOptionsHeader}>
              <Text style={styles.createOptionsTitle}>Crear</Text>
              <TouchableOpacity onPress={() => setShowCreateOptions(false)} activeOpacity={0.7}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.createOptionsButtons}>
              <TouchableOpacity
                style={styles.createOptionButton}
                onPress={() => {
                  setShowCreateOptions(false);
                  router.push('/crear/historia');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.createOptionIcon}>
                  <IconSymbol name="camera.fill" size={24} color={colors.headerText} />
                </View>
                <View style={styles.createOptionInfo}>
                  <Text style={styles.createOptionTitle}>Historia</Text>
                  <Text style={styles.createOptionDescription}>
                    Comparte un momento que desaparece en 24 horas
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createOptionButton}
                onPress={() => {
                  setShowCreateOptions(false);
                  router.push('/crear/publicacion');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.createOptionIcon}>
                  <IconSymbol name="photo.fill" size={24} color={colors.headerText} />
                </View>
                <View style={styles.createOptionInfo}>
                  <Text style={styles.createOptionTitle}>Publicación</Text>
                  <Text style={styles.createOptionDescription}>
                    Comparte una foto o video en tu perfil
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Story Viewer Modal */}
      <Modal
        visible={showStoryViewer}
        animationType="fade"
        onRequestClose={async () => {
          const currentStories = viewingOwnStories ? userStories : historias;
          const currentStory = currentStories[currentStoryIndex];
          
          if (currentStory && user) {
            try {
              const { data: existingView } = await supabase
                .from('historia_views')
                .select('id')
                .eq('historia_id', currentStory.id)
                .eq('usuario_id', user.id)
                .single();

              if (!existingView) {
                await supabase.from('historia_views').insert({
                  historia_id: currentStory.id,
                  usuario_id: user.id,
                });
              }
            } catch (error) {
              console.error('[Social] Error marking story as viewed on modal close:', error);
            }
          }
          
          socialCache.clearStories();
          socialCache.clearStories(user?.id);
          await loadData();
          setShowStoryViewer(false);
          stopStoryTimer();
        }}
      >
        <View style={styles.storyViewerModal}>
          {currentStory && (
            <>
              <View style={styles.storyViewerHeader}>
                <View style={styles.storyProgressContainer}>
                  {currentStories.map((_, index) => (
                    <View key={index} style={styles.storyProgressBar}>
                      {index < currentStoryIndex && (
                        <View style={[styles.storyProgressFill, { width: '100%' }]} />
                      )}
                      {index === currentStoryIndex && (
                        <Animated.View
                          style={[styles.storyProgressFill, { width: progressWidth }]}
                        />
                      )}
                    </View>
                  ))}
                </View>

                <View style={styles.storyAutorInfo}>
                  {viewingOwnStories && user ? (
                    <>
                      {user.avatar ? (
                        <Image source={{ uri: user.avatar }} style={styles.storyAutorAvatar} />
                      ) : (
                        <View style={[styles.storyAutorAvatar, styles.avatarPlaceholder]}>
                          <Text style={styles.avatarText}>
                            {user.nombre?.charAt(0).toUpperCase() || 'U'}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.storyAutorNombre}>{user.nombre}</Text>
                    </>
                  ) : (
                    <>
                      {currentStory.autor?.avatar ? (
                        <Image
                          source={{ uri: currentStory.autor.avatar }}
                          style={styles.storyAutorAvatar}
                        />
                      ) : (
                        <View style={[styles.storyAutorAvatar, styles.avatarPlaceholder]}>
                          <Text style={styles.avatarText}>
                            {currentStory.autor?.nombre?.charAt(0).toUpperCase() || 'U'}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.storyAutorNombre}>
                        {currentStory.autor?.nombre || 'Usuario'}
                      </Text>
                    </>
                  )}
                  {user && currentStory.autor_id === user.id && (
                    <TouchableOpacity
                      style={styles.storyDeleteButton}
                      onPress={handleDeleteStory}
                      activeOpacity={0.7}
                    >
                      <IconSymbol name="trash" size={20} color="#fff" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.storyCloseButton}
                    onPress={async () => {
                      const currentStories = viewingOwnStories ? userStories : historias;
                      const currentStory = currentStories[currentStoryIndex];
                      
                      if (currentStory && user) {
                        try {
                          const { data: existingView } = await supabase
                            .from('historia_views')
                            .select('id')
                            .eq('historia_id', currentStory.id)
                            .eq('usuario_id', user.id)
                            .single();

                          if (!existingView) {
                            await supabase.from('historia_views').insert({
                              historia_id: currentStory.id,
                              usuario_id: user.id,
                            });
                          }
                        } catch (error) {
                          console.error('[Social] Error marking story as viewed on close:', error);
                        }
                      }
                      
                      socialCache.clearStories();
                      socialCache.clearStories(user?.id);
                      await loadData();
                      setShowStoryViewer(false);
                      stopStoryTimer();
                    }}
                    activeOpacity={0.7}
                  >
                    <IconSymbol name="xmark" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.storyContent}>
                <Image
                  source={{ uri: currentStory.imagen }}
                  style={styles.storyImage}
                  resizeMode="contain"
                />
              </View>

              {!viewingOwnStories && (
                <View style={styles.storyInteractionBar}>
                  <TouchableOpacity
                    style={styles.storyInteractionButton}
                    onPress={handleStoryLike}
                    activeOpacity={0.7}
                  >
                    <IconSymbol 
                      name={currentStory.liked_by_user ? 'heart.fill' : 'heart'} 
                      size={20} 
                      color={currentStory.liked_by_user ? '#EF4444' : '#fff'} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.storyInteractionButton}
                    activeOpacity={0.7}
                  >
                    <IconSymbol name="eye" size={20} color="#fff" />
                    <Text style={styles.storyInteractionText}>{currentStory.views_count || 0}</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.storyMessageInput}
                    placeholder="Enviar mensaje..."
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    value={storyMessage}
                    onChangeText={setStoryMessage}
                    onFocus={() => {
                      setIsPaused(true);
                      stopStoryTimer();
                    }}
                    onBlur={() => {
                      setIsPaused(false);
                      startStoryTimer();
                    }}
                  />
                  {storyMessage.trim() && (
                    <TouchableOpacity
                      style={styles.storySendButton}
                      onPress={handleSendStoryMessage}
                      activeOpacity={0.7}
                    >
                      <IconSymbol name="paperplane.fill" size={20} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={styles.storyTouchZones}>
                <Pressable
                  style={styles.storyTouchZone}
                  onPress={handlePreviousStory}
                />
                <Pressable
                  style={styles.storyTouchZone}
                  onPressIn={() => {
                    setIsPaused(true);
                    stopStoryTimer();
                  }}
                  onPressOut={() => {
                    setIsPaused(false);
                    startStoryTimer();
                  }}
                />
                <Pressable
                  style={styles.storyTouchZone}
                  onPress={handleNextStory}
                />
              </View>
            </>
          )}
        </View>
      </Modal>

      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message={loginMessage}
      />
    </View>
  );
}
