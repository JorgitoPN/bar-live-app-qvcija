
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { useMode } from '@/contexts/ModeContext';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import InstagramPostCard from '@/components/social/InstagramPostCard';
import InstagramStoriesBar from '@/components/social/InstagramStoriesBar';
import InstagramHeader from '@/components/social/InstagramHeader';
import type { Publicacion, Historia } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ✅ VERSION 9.0 - Instagram-style social network
const VERSION = '9.0.0';

export default function SocialScreenV9() {
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
  
  const isLoadingRef = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isInteractingAsLocal = activeProfileType === 'local';
  const interactionLocalId = isInteractingAsLocal ? activeProfileId : null;
  
  const displayAvatar = isInteractingAsLocal 
    ? (modeLocalData?.imagen_url || null)
    : (user?.avatar || null);
  
  const displayName = isInteractingAsLocal
    ? (modeLocalData?.nombre || 'Local')
    : (user?.nombre || 'Usuario');

  console.log(`[Social V${VERSION}] 🎭 Active Profile:`, {
    activeProfileType,
    activeProfileId,
    isInteractingAsLocal,
    interactionLocalId,
    displayName,
    hasAvatar: !!displayAvatar,
  });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

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
      console.error(`[Social V${VERSION}] Error loading unread counts:`, error);
    }
  }, [user]);

  const loadData = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log(`[Social V${VERSION}] ⚡ Already loading, skipping...`);
      return;
    }

    isLoadingRef.current = true;

    try {
      console.log(`[Social V${VERSION}] ⚡ Loading data...`);
      console.log(`[Social V${VERSION}] 📍 Global posts available:`, globalPosts.length);
      console.log(`[Social V${VERSION}] 📍 Global stories available:`, globalStories.length);

      await loadUnreadCounts();

      if (globalPosts.length > 0) {
        console.log(`[Social V${VERSION}] ⚡⚡⚡ INSTANT posts from global data:`, globalPosts.length);
        
        let validPosts = globalPosts.filter(p => p && p.id);
        
        if (user && validPosts.length > 0) {
          const postIds = validPosts.map(p => p.id);
          
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

          const postsWithStatus = validPosts.map(post => ({
            ...post,
            user_has_liked: likedPostIds.has(post.id),
            user_has_saved: savedPostIds.has(post.id),
            comentarios_count: commentCounts[post.id] || 0,
          }));
          
          const finalValidPosts = postsWithStatus.filter(p => p && p.id);
          setPosts(finalValidPosts);
          console.log(`[Social V${VERSION}] ✅ Set`, finalValidPosts.length, 'valid posts with user status');
        } else {
          const finalValidPosts = validPosts.filter(p => p && p.id);
          setPosts(finalValidPosts);
          console.log(`[Social V${VERSION}] ✅ Set`, finalValidPosts.length, 'valid posts');
        }
      } else {
        setPosts([]);
      }

      if (globalStories.length > 0) {
        console.log(`[Social V${VERSION}] ⚡⚡⚡ INSTANT stories from global data:`, globalStories.length);
        
        let validStories = globalStories.filter(s => s && s.id);
        setHistorias(validStories);
      } else {
        setHistorias([]);
      }

      console.log(`[Social V${VERSION}] ⚡ Data loaded`);
    } catch (error) {
      console.error(`[Social V${VERSION}] Error loading data:`, error);
      setPosts([]);
      setHistorias([]);
    } finally {
      isLoadingRef.current = false;
      setIsInitialLoad(false);
    }
  }, [user, globalPosts, globalStories, loadUnreadCounts]);

  useFocusEffect(
    useCallback(() => {
      console.log(`[Social V${VERSION}] 🔄 Screen focused - auto-updating data`);
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    console.log(`[Social V${VERSION}] 🔄 Manual refresh triggered`);
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreatePost = () => {
    console.log(`[Social V${VERSION}] ➕ Create post button pressed`);
    router.push('/crear/publicacion');
  };

  const handleCreateStory = () => {
    console.log(`[Social V${VERSION}] ➕ Create story button pressed`);
    router.push('/crear/historia');
  };

  const handleHistoriaPress = (historia: Historia) => {
    console.log(`[Social V${VERSION}] 📖 Story pressed:`, historia.id);
    router.push({
      pathname: '/detalle/historia',
      params: { id: historia.id },
    });
  };

  const handleStoriesUpdate = useCallback((updatedStories: Historia[]) => {
    console.log(`[Social V${VERSION}] ⚡ Stories updated in real-time:`, updatedStories.length);
    setHistorias(updatedStories);
  }, []);

  if (isInitialLoad && posts.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <InstagramHeader 
          onCreatePost={handleCreatePost}
          onCreateStory={handleCreateStory}
          unreadNotifications={unreadNotifications}
          unreadMessages={unreadMessages}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando feed...</Text>
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
        },
      ]}
    >
      <View style={styles.storiesSection}>
        <InstagramStoriesBar
          historias={historias}
          onHistoriaPress={handleHistoriaPress}
          onCrearHistoria={handleCreateStory}
          userAvatar={displayAvatar || undefined}
          userName={displayName}
          onStoriesUpdate={handleStoriesUpdate}
        />
      </View>
    </Animated.View>
  );

  const renderPost = ({ item, index }: { item: Publicacion; index: number }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
      }}
    >
      <InstagramPostCard post={item} onUpdate={loadData} />
    </Animated.View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={[`${colors.primary}15`, `${colors.secondary}15`]}
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
        {isInteractingAsLocal 
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
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <InstagramHeader 
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
    paddingBottom: 120,
  },
  headerContainer: {
    backgroundColor: colors.background,
  },
  storiesSection: {
    backgroundColor: colors.background,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.cardBorder,
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
