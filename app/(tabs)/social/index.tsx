
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { useMode } from '@/contexts/ModeContext';
import { colors } from '@/styles/commonStyles';
import FeedSocial from '@/components/social/FeedSocial';
import NewBarraHistorias from '@/components/social/NewBarraHistorias';
import HeaderSocial from '@/components/layout/HeaderSocial';
import type { Publicacion, Historia } from '@/types';

export default function SocialScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { 
    posts: globalPosts, 
    stories: globalStories,
    activeLocalData,
    activeLocalProfileId,
  } = useGlobalData();
  const { 
    currentMode, 
    isOwnerMode, 
    activeProfileId, 
    activeProfileType,
    isInteractingAsLocal,
  } = useMode();

  const [posts, setPosts] = useState<Publicacion[]>([]);
  const [historias, setHistorias] = useState<Historia[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const isLoadingRef = useRef(false);

  // ✅ Load unread counts
  const loadUnreadCounts = useCallback(async () => {
    if (!user) return;

    try {
      const { count: notifCount } = await supabase
        .from('notificaciones')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', user.id)
        .eq('leida', false);

      setUnreadNotifications(notifCount || 0);

      const { data: chatsData } = await supabase
        .from('chats')
        .select('id')
        .or(`usuario1_id.eq.${user.id},usuario2_id.eq.${user.id}`);

      if (chatsData) {
        let totalUnread = 0;
        for (const chat of chatsData) {
          const { count } = await supabase
            .from('mensajes')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .eq('leido', false)
            .neq('remitente_id', user.id);
          
          totalUnread += count || 0;
        }
        setUnreadMessages(totalUnread);
      }
    } catch (error) {
      console.error('[Social] Error loading unread counts:', error);
    }
  }, [user]);

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

      // Load unread counts
      await loadUnreadCounts();

      if (globalPosts.length > 0) {
        console.log('[Social] ⚡⚡⚡ INSTANT posts from global data:', globalPosts.length);
        
        // ✅ CRITICAL FIX: Filter out invalid posts first
        let validPosts = globalPosts.filter(p => p && p.id);
        if (validPosts.length !== globalPosts.length) {
          console.warn('[Social] Filtered out', globalPosts.length - validPosts.length, 'invalid posts from global data');
        }
        
        let filteredPosts = validPosts;
        
        if (isOwnerMode && activeLocalProfileId) {
          filteredPosts = validPosts.filter(p => p.tipo === 'local' && p.local_id === activeLocalProfileId);
          console.log('[Social] 🏢 Owner mode - Filtered posts for local:', activeLocalProfileId, 'Count:', filteredPosts.length);
        } else {
          if (user) {
            const { data: followedLocals } = await supabase
              .from('locales_favoritos')
              .select('local_id')
              .eq('usuario_id', user.id);

            const followedLocalIds = new Set(followedLocals?.map(f => f.local_id) || []);
            
            filteredPosts = validPosts.filter(p => 
              p.tipo === 'usuario' || 
              (p.tipo === 'local' && p.local_id && followedLocalIds.has(p.local_id))
            );
            console.log('[Social] 👤 User mode - Filtered user posts + followed locals, Count:', filteredPosts.length);
          } else {
            filteredPosts = validPosts.filter(p => p.tipo === 'usuario');
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
          
          // ✅ CRITICAL FIX: Final validation before setting state
          const finalValidPosts = postsWithStatus.filter(p => p && p.id);
          setPosts(finalValidPosts);
          console.log('[Social] ✅ Set', finalValidPosts.length, 'valid posts with user status');
        } else {
          // ✅ CRITICAL FIX: Final validation before setting state
          const finalValidPosts = filteredPosts.filter(p => p && p.id);
          setPosts(finalValidPosts);
          console.log('[Social] ✅ Set', finalValidPosts.length, 'valid posts');
        }
      } else {
        setPosts([]);
      }

      if (globalStories.length > 0) {
        console.log('[Social] ⚡⚡⚡ INSTANT stories from global data:', globalStories.length);
        
        // ✅ CRITICAL FIX: Filter out invalid stories first
        let validStories = globalStories.filter(s => s && s.id);
        if (validStories.length !== globalStories.length) {
          console.warn('[Social] Filtered out', globalStories.length - validStories.length, 'invalid stories from global data');
        }
        
        let filteredStories = validStories;
        
        if (isOwnerMode && activeLocalProfileId) {
          filteredStories = validStories.filter(s => s.tipo === 'local' && s.local_id === activeLocalProfileId);
          console.log('[Social] 🏢 Owner mode - Filtered stories for local:', activeLocalProfileId, 'Count:', filteredStories.length);
        } else {
          if (user) {
            const { data: followedLocals } = await supabase
              .from('locales_favoritos')
              .select('local_id')
              .eq('usuario_id', user.id);

            const followedLocalIds = new Set(followedLocals?.map(f => f.local_id) || []);
            
            filteredStories = validStories.filter(s => 
              s.tipo === 'usuario' || 
              (s.tipo === 'local' && s.local_id && followedLocalIds.has(s.local_id))
            );
            console.log('[Social] 👤 User mode - Filtered user stories + followed locals, Count:', filteredStories.length);
          } else {
            filteredStories = validStories.filter(s => s.tipo === 'usuario');
            console.log('[Social] 👤 User mode - Filtered user stories only (not logged in), Count:', filteredStories.length);
          }
        }
        
        setHistorias(filteredStories);
      } else {
        setHistorias([]);
      }

      console.log('[Social] ⚡ User-specific data loaded');
    } catch (error) {
      console.error('[Social] Error loading data:', error);
      // ✅ CRITICAL FIX: Set empty arrays on error to prevent undefined state
      setPosts([]);
      setHistorias([]);
    } finally {
      isLoadingRef.current = false;
      setIsInitialLoad(false);
    }
  }, [user, globalPosts, globalStories, isOwnerMode, activeLocalProfileId, loadUnreadCounts]);

  useEffect(() => {
    console.log('[Social] 🔄 Effect triggered - loading data');
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    console.log('[Social] 🔄 Manual refresh triggered');
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreatePost = () => {
    console.log('[Social] ➕ Create post button pressed');
    router.push('/crear/publicacion');
  };

  const handleCreateStory = () => {
    console.log('[Social] ➕ Create story button pressed');
    router.push('/crear/historia');
  };

  const handleHistoriaPress = (historia: Historia) => {
    console.log('[Social] 📖 Story pressed:', historia.id);
    router.push({
      pathname: '/detalle/historia',
      params: { id: historia.id },
    });
  };

  // ✅ NEW: Handle real-time story updates
  const handleStoriesUpdate = useCallback((updatedStories: Historia[]) => {
    console.log('[Social] ⚡ Stories updated in real-time:', updatedStories.length);
    setHistorias(updatedStories);
  }, []);

  if (isInitialLoad && posts.length === 0) {
    return (
      <View style={styles.container}>
        <HeaderSocial 
          onCreatePost={handleCreatePost}
          onCreateStory={handleCreateStory}
          unreadNotifications={unreadNotifications}
          unreadMessages={unreadMessages}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando feed social...</Text>
        </View>
      </View>
    );
  }

  // ✅ FIXED: Removed ScrollView wrapper to avoid VirtualizedLists warning
  // FeedSocial uses FlatList internally which handles scrolling
  const ListHeaderComponent = () => (
    <>
      {/* ✅ FIXED: Always show story bar with larger avatars and real-time updates */}
      <View style={styles.storiesSection}>
        <NewBarraHistorias 
          historias={historias}
          onHistoriaPress={handleHistoriaPress}
          onCrearHistoria={handleCreateStory}
          userAvatar={user?.avatar}
          userName={user?.nombre}
          onStoriesUpdate={handleStoriesUpdate}
        />
      </View>
    </>
  );

  const ListEmptyComponent = () => (
    <View style={styles.emptyState}>
      <Ionicons name="images-outline" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyStateTitle}>No hay publicaciones</Text>
      <Text style={styles.emptyStateText}>
        {isOwnerMode 
          ? 'Crea la primera publicación de tu local'
          : 'Sigue a usuarios o locales para ver sus publicaciones'}
      </Text>
      <TouchableOpacity 
        style={styles.createButton}
        onPress={handleCreatePost}
      >
        <Ionicons name="add-circle" size={24} color={colors.background} />
        <Text style={styles.createButtonText}>Crear publicación</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <HeaderSocial 
        onCreatePost={handleCreatePost}
        onCreateStory={handleCreateStory}
        unreadNotifications={unreadNotifications}
        unreadMessages={unreadMessages}
      />
      {posts.length > 0 ? (
        <FeedSocial 
          posts={posts} 
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListHeaderComponent={ListHeaderComponent}
        />
      ) : (
        <>
          <ListHeaderComponent />
          <ListEmptyComponent />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: 'System',
  },
  storiesSection: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'System',
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'System',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
    marginLeft: 8,
    fontFamily: 'System',
  },
});
