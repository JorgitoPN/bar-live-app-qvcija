
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { useMode } from '@/contexts/ModeContext';
import { colors } from '@/styles/commonStyles';
import HeaderSocial from '@/components/layout/HeaderSocial';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import NewPostCard from '@/components/social/NewPostCard';
import type { Publicacion, Historia } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SocialScreenV3() {
  const router = useRouter();
  const { user } = useAuth();
  const { 
    posts: globalPosts, 
    stories: globalStories,
  } = useGlobalData();
  const { 
    activeProfileType,
    activeProfileId,
    activeLocalData: modeLocalData,
  } = useMode();

  const [posts, setPosts] = useState<Publicacion[]>([]);
  const [historias, setHistorias] = useState<Historia[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [feedFilter, setFeedFilter] = useState<'all' | 'following'>('all');
  
  const isLoadingRef = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // ✅ Determine if user is interacting as a local
  const isInteractingAsLocal = activeProfileType === 'local';
  const interactionLocalId = isInteractingAsLocal ? activeProfileId : null;
  
  // ✅ Get avatar and name for stories bar based on active profile
  const displayAvatar = isInteractingAsLocal 
    ? (modeLocalData?.imagen_url || null)
    : (user?.avatar || null);
  
  const displayName = isInteractingAsLocal
    ? (modeLocalData?.nombre || 'Local')
    : (user?.nombre || 'Usuario');

  console.log('[SocialV3] 🎭 Active Profile:', {
    activeProfileType,
    activeProfileId,
    isInteractingAsLocal,
    interactionLocalId,
    displayName,
    hasAvatar: !!displayAvatar,
  });

  // ✅ ENTRANCE ANIMATION - Fixed: Added fadeAnim and slideAnim to dependencies
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

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
      console.error('[SocialV3] Error loading unread counts:', error);
    }
  }, [user]);

  const loadData = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('[SocialV3] ⚡ Already loading, skipping...');
      return;
    }

    isLoadingRef.current = true;

    try {
      console.log('[SocialV3] ⚡ Loading data...');
      console.log('[SocialV3] 📍 Global posts available:', globalPosts.length);
      console.log('[SocialV3] 📍 Global stories available:', globalStories.length);

      // Load unread counts
      await loadUnreadCounts();

      if (globalPosts.length > 0) {
        console.log('[SocialV3] ⚡⚡⚡ INSTANT posts from global data:', globalPosts.length);
        
        let validPosts = globalPosts.filter(p => p && p.id);
        let filteredPosts = validPosts;
        
        // ✅ Filter based on feed filter
        if (feedFilter === 'following' && user) {
          const { data: followedLocals } = await supabase
            .from('locales_favoritos')
            .select('local_id')
            .eq('usuario_id', user.id);

          const followedLocalIds = new Set(followedLocals?.map(f => f.local_id) || []);
          
          filteredPosts = validPosts.filter(p => 
            p.tipo === 'usuario' || 
            (p.tipo === 'local' && p.local_id && followedLocalIds.has(p.local_id))
          );
          console.log('[SocialV3] 👥 Following filter - Count:', filteredPosts.length);
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
          
          const finalValidPosts = postsWithStatus.filter(p => p && p.id);
          setPosts(finalValidPosts);
          console.log('[SocialV3] ✅ Set', finalValidPosts.length, 'valid posts with user status');
        } else {
          const finalValidPosts = filteredPosts.filter(p => p && p.id);
          setPosts(finalValidPosts);
          console.log('[SocialV3] ✅ Set', finalValidPosts.length, 'valid posts');
        }
      } else {
        setPosts([]);
      }

      if (globalStories.length > 0) {
        console.log('[SocialV3] ⚡⚡⚡ INSTANT stories from global data:', globalStories.length);
        
        let validStories = globalStories.filter(s => s && s.id);
        let filteredStories = validStories;
        
        // ✅ Filter based on feed filter
        if (feedFilter === 'following' && user) {
          const { data: followedLocals } = await supabase
            .from('locales_favoritos')
            .select('local_id')
            .eq('usuario_id', user.id);

          const followedLocalIds = new Set(followedLocals?.map(f => f.local_id) || []);
          
          filteredStories = validStories.filter(s => 
            s.tipo === 'usuario' || 
            (s.tipo === 'local' && s.local_id && followedLocalIds.has(s.local_id))
          );
          console.log('[SocialV3] 👥 Following filter - Stories count:', filteredStories.length);
        }
        
        setHistorias(filteredStories);
      } else {
        setHistorias([]);
      }

      console.log('[SocialV3] ⚡ Data loaded');
    } catch (error) {
      console.error('[SocialV3] Error loading data:', error);
      setPosts([]);
      setHistorias([]);
    } finally {
      isLoadingRef.current = false;
      setIsInitialLoad(false);
    }
  }, [user, globalPosts, globalStories, feedFilter, loadUnreadCounts]);

  // ✅ AUTO-UPDATE: Reload data every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('[SocialV3] 🔄 Screen focused - auto-updating data');
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    console.log('[SocialV3] 🔄 Manual refresh triggered');
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreatePost = () => {
    console.log('[SocialV3] ➕ Create post button pressed');
    router.push('/crear/publicacion');
  };

  const handleCreateStory = () => {
    console.log('[SocialV3] ➕ Create story button pressed');
    router.push('/crear/historia');
  };

  const handleHistoriaPress = (historia: Historia) => {
    console.log('[SocialV3] 📖 Story pressed:', historia.id);
    router.push({
      pathname: '/detalle/historia',
      params: { id: historia.id },
    });
  };

  const handleStoriesUpdate = useCallback((updatedStories: Historia[]) => {
    console.log('[SocialV3] ⚡ Stories updated in real-time:', updatedStories.length);
    setHistorias(updatedStories);
  }, []);

  const handleFilterChange = (filter: 'all' | 'following') => {
    setFeedFilter(filter);
    loadData();
  };

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
          <Text style={styles.loadingText}>Cargando feed social v3.0...</Text>
        </View>
      </View>
    );
  }

  const renderHeader = () => (
    <Animated.View 
      style={[
        styles.headerContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Stories section removed */}

      {/* ✅ NEW: Feed Filter Tabs */}
      <View style={styles.filterTabsContainer}>
        <TouchableOpacity
          style={[styles.filterTab, feedFilter === 'all' && styles.filterTabActive]}
          onPress={() => handleFilterChange('all')}
          activeOpacity={0.7}
        >
          {feedFilter === 'all' ? (
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.filterTabGradient}
            >
              <IconSymbol
                ios_icon_name="globe"
                android_material_icon_name="public"
                size={20}
                color="#fff"
              />
              <Text style={styles.filterTabTextActive}>Explorar</Text>
            </LinearGradient>
          ) : (
            <View style={styles.filterTabContent}>
              <IconSymbol
                ios_icon_name="globe"
                android_material_icon_name="public"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={styles.filterTabText}>Explorar</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, feedFilter === 'following' && styles.filterTabActive]}
          onPress={() => handleFilterChange('following')}
          activeOpacity={0.7}
        >
          {feedFilter === 'following' ? (
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.filterTabGradient}
            >
              <IconSymbol
                ios_icon_name="person.2.fill"
                android_material_icon_name="people"
                size={20}
                color="#fff"
              />
              <Text style={styles.filterTabTextActive}>Siguiendo</Text>
            </LinearGradient>
          ) : (
            <View style={styles.filterTabContent}>
              <IconSymbol
                ios_icon_name="person.2.fill"
                android_material_icon_name="people"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={styles.filterTabText}>Siguiendo</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderPost = ({ item, index }: { item: Publicacion; index: number }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [
          {
            translateY: slideAnim.interpolate({
              inputRange: [0, 50],
              outputRange: [0, 50 + index * 10],
            }),
          },
        ],
      }}
    >
      <NewPostCard post={item} />
    </Animated.View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={[`${colors.primary}20`, `${colors.secondary}20`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.emptyIconCircle}
      >
        <IconSymbol
          ios_icon_name="photo.stack"
          android_material_icon_name="collections"
          size={64}
          color={colors.primary}
        />
      </LinearGradient>
      <Text style={styles.emptyStateTitle}>No hay publicaciones</Text>
      <Text style={styles.emptyStateText}>
        {feedFilter === 'following'
          ? 'Sigue a usuarios o locales para ver sus publicaciones'
          : isInteractingAsLocal 
            ? 'Crea la primera publicación de tu local'
            : 'Sé el primero en publicar'}
      </Text>
      <TouchableOpacity 
        style={styles.createButton}
        onPress={handleCreatePost}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.createButtonGradient}
        >
          <IconSymbol
            ios_icon_name="plus.circle.fill"
            android_material_icon_name="add_circle"
            size={24}
            color="#fff"
          />
          <Text style={styles.createButtonText}>Crear publicación</Text>
        </LinearGradient>
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
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary, colors.secondary]}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        initialNumToRender={5}
        windowSize={10}
      />
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
  listContent: {
    flexGrow: 1,
  },
  headerContainer: {
    backgroundColor: colors.background,
  },
  storiesSection: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTab: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  filterTabActive: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  filterTabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  filterTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
  },
  filterTabText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    fontFamily: 'System',
  },
  emptyStateText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    fontFamily: 'System',
  },
  createButton: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  createButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'System',
  },
});
