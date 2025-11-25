
import { useRouter, useFocusEffect } from 'expo-router';
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
  Alert,
  ActivityIndicator,
  Pressable,
  FlatList,
  Keyboard,
  Animated,
} from 'react-native';
import { supabase } from '@/utils/supabase';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';

// ... (keep all interfaces and styles from original file)

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
  
  // ... (keep all state declarations from original file)

  // ✅ ULTRA-OPTIMIZED: Load data with advanced caching
  const loadData = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('[Social] ⚡ Already loading, skipping...');
      return;
    }

    isLoadingRef.current = true;

    try {
      console.log('[Social] ⚡ Loading with ADVANCED CACHE...');
      
      // ✅ Try advanced cache first (INSTANT)
      const cachedPosts = await advancedCache.get<any[]>('social:posts');
      const cachedStories = await advancedCache.get<any[]>('social:stories');
      
      if (cachedPosts && cachedPosts.length > 0) {
        console.log('[Social] ⚡⚡⚡ INSTANT posts from advanced cache:', cachedPosts.length);
        setPosts(cachedPosts);
      } else if (globalPosts.length > 0) {
        console.log('[Social] ⚡ INSTANT posts from global data:', globalPosts.length);
        
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
          
          // ✅ Cache for next time
          await advancedCache.set('social:posts', postsWithStatus, 'high');
        } else {
          setPosts(filteredPosts);
          await advancedCache.set('social:posts', filteredPosts, 'high');
        }
      }

      if (cachedStories && cachedStories.length > 0) {
        console.log('[Social] ⚡⚡⚡ INSTANT stories from advanced cache:', cachedStories.length);
        setHistorias(cachedStories);
      } else if (globalStories.length > 0) {
        console.log('[Social] ⚡ INSTANT stories from global data:', globalStories.length);
        
        let userOwnStories: typeof globalStories = [];
        let otherStories: typeof globalStories = [];

        if (isOwnerMode && activeLocalProfileId) {
          userOwnStories = globalStories.filter(s => s.tipo === 'local' && s.local_id === activeLocalProfileId);
          otherStories = globalStories.filter(s => s.tipo === 'usuario');
        } else if (user) {
          const { data: followedLocals } = await supabase
            .from('locales_favoritos')
            .select('local_id')
            .eq('usuario_id', user.id);

          const followedLocalIds = new Set(followedLocals?.map(f => f.local_id) || []);
          
          userOwnStories = globalStories.filter(s => s.tipo === 'usuario' && s.autor_id === user.id);
          otherStories = globalStories.filter(s => 
            (s.tipo === 'usuario' && s.autor_id !== user.id) ||
            (s.tipo === 'local' && s.local_id && followedLocalIds.has(s.local_id))
          );
        } else {
          otherStories = globalStories.filter(s => s.tipo === 'usuario');
        }
        
        if (user) {
          const allStoryIds = globalStories.map(s => s.id);
          
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
          
          // ✅ Cache for next time
          await advancedCache.set('social:stories', otherStoriesWithStatus, 'high');
          
          // ✅ CRITICAL: Intelligent preloading in background
          if (otherStoriesWithStatus.length > 0) {
            console.log('[Social] 🚀 Starting intelligent preload...');
            setTimeout(() => {
              intelligentPreloader.preloadStoryImages(otherStoriesWithStatus, 0, 10);
              intelligentPreloader.preloadPostImages(posts, 0, 5);
            }, 500);
          }
        } else {
          setHistorias(otherStories);
          await advancedCache.set('social:stories', otherStories, 'high');
        }
      }

      console.log('[Social] ⚡ User-specific data loaded');
    } catch (error) {
      console.error('[Social] Error loading data:', error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [user, globalPosts, globalStories, isOwnerMode, activeLocalProfileId, isInteractingAsLocal, activeProfileType, currentMode, activeProfileId, activeLocalData, posts]);

  // ✅ Preload on app start
  useEffect(() => {
    if (user) {
      intelligentPreloader.preloadOnStart(user.id);
    }
  }, [user]);

  // ... (keep all other functions from original file)

  // ✅ OPTIMIZED: Invalidate cache on refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // Invalidate caches
    await advancedCache.invalidate('social:');
    socialCache.clearAll();
    
    await refreshData(false);
    await loadData();
    setRefreshing(false);
  }, [loadData, refreshData]);

  // ... (keep rest of the component from original file)
}
