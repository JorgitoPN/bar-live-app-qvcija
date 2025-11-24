
import { useRouter, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useMode } from '@/contexts/ModeContext';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';
import { socialCache } from '@/utils/socialCache';
import InitialLoadingScreen from '@/components/common/InitialLoadingScreen';
import { LinearGradient } from 'expo-linear-gradient';
import StoryViewer from '@/components/social/StoryViewer';
import BarraHistorias from '@/components/social/BarraHistorias';
import FeedSocial from '@/components/social/FeedSocial';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  Modal,
  Platform,
  Alert,
  Pressable,
  ScrollView,
  FlatList,
} from 'react-native';
import { supabase } from '@/utils/supabase';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';

interface SearchResult {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  tipo: 'usuario' | 'local' | 'hashtag';
  bio?: string;
  seguidores?: number;
  uso_count?: number;
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
    fontSize: 28,
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
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.headerGradientStart,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  localSelectorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.cardBorder,
  },
  localSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  localSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  localSelectorImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  localSelectorImagePlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localSelectorText: {
    flex: 1,
  },
  localSelectorLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  localSelectorName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
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
    height: 40,
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
  searchResultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  searchResultBadgeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  localSelectorModal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  localSelectorModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  localSelectorModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  localSelectorModalContent: {
    padding: 16,
  },
  localSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  localSelectorItemActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  localSelectorItemImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 16,
  },
  localSelectorItemInfo: {
    flex: 1,
  },
  localSelectorItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  localSelectorItemNameActive: {
    color: colors.primary,
  },
  localSelectorItemType: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  switchToClientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.secondary + '20',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.secondary,
    gap: 8,
  },
  switchToClientButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.secondary,
  },
});

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
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [historias, setHistorias] = useState<any[]>([]);
  const [userStories, setUserStories] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  const [showLocalSelector, setShowLocalSelector] = useState(false);
  
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [viewingOwnStories, setViewingOwnStories] = useState(false);

  const isLoadingRef = React.useRef(false);

  const userRole = user?.rol_app || 'cliente';
  const isPropietario = userRole === 'propietario' || (userRole === 'admin' && currentMode === 'propietario');
  const isOwnerMode = currentMode === 'propietario' && isPropietario;

  const isInteractingAsLocal = activeProfileType === 'local';
  const activeLocalProfileId = activeProfileType === 'local' ? activeProfileId : null;

  const loadData = useCallback(async () => {
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;

    try {
      if (globalPosts.length > 0) {
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
        } else {
          setPosts(filteredPosts);
        }
      }

      if (globalStories.length > 0) {
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
        } else {
          setHistorias(otherStories);
        }
      }
    } catch (error) {
      console.error('[Social] Error loading data:', error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [user, globalPosts, globalStories, isOwnerMode, activeLocalProfileId, isInteractingAsLocal, activeProfileType, currentMode, activeProfileId, activeLocalData]);

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

  useFocusEffect(
    useCallback(() => {
      refreshData(false).then(() => {
        loadData();
      });
      
      loadUnreadCounts();
    }, [loadData, loadUnreadCounts, refreshData])
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
      const searchTerm = query.trim();
      const results: SearchResult[] = [];
      
      if (searchTerm.startsWith('#')) {
        const hashtagTerm = searchTerm.substring(1).toLowerCase();
        
        const { data: hashtagsData, error: hashtagsError } = await supabase
          .from('hashtags')
          .select(`
            id, 
            tag,
            post_hashtags!inner(post_id)
          `)
          .ilike('tag', `%${hashtagTerm}%`)
          .limit(50);

        if (!hashtagsError && hashtagsData) {
          const hashtagsWithCounts = hashtagsData.map((h: any) => {
            const postCount = h.post_hashtags?.length || 0;
            return {
              id: h.id,
              tag: h.tag,
              uso_count: postCount,
            };
          }).filter((h: any) => h.uso_count > 0);

          hashtagsWithCounts.sort((a: any, b: any) => b.uso_count - a.uso_count);

          const topHashtags = hashtagsWithCounts.slice(0, 10);

          results.push(...topHashtags.map((h: any) => ({
            id: h.id,
            nombre: `#${h.tag}`,
            tipo: 'hashtag' as const,
            uso_count: h.uso_count,
          })));
        }
      } else {
        const { data: usersData, error: usersError } = await supabase
          .from('usuarios')
          .select('id, nombre, username, avatar')
          .or(`nombre.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
          .eq('activo', true)
          .limit(10);

        if (!usersError && usersData) {
          results.push(...usersData.map(u => ({
            id: u.id,
            nombre: u.nombre,
            username: u.username,
            avatar: u.avatar,
            tipo: 'usuario' as const,
          })));
        }

        const { data: localsWithSubs, error: localsError } = await supabase
          .from('locales')
          .select(`
            id,
            nombre,
            imagen_url,
            tipo,
            provincia,
            suscripciones_locales!suscripciones_locales_local_id_fkey(
              estado,
              plan_id,
              planes_suscripcion!suscripciones_locales_plan_id_fkey(
                nombre
              )
            )
          `)
          .ilike('nombre', `%${searchTerm}%`)
          .eq('activo', true)
          .limit(20);

        if (!localsError && localsWithSubs) {
          const localsData = localsWithSubs.filter((local: any) => {
            const subscription = local.suscripciones_locales;
            if (!subscription || subscription.estado !== 'activa') {
              return false;
            }
            const planName = subscription.planes_suscripcion?.nombre;
            return planName === 'estandar' || planName === 'premium';
          });

          results.push(...localsData.map((l: any) => ({
            id: l.id,
            nombre: l.nombre,
            avatar: l.imagen_url,
            tipo: 'local' as const,
            bio: `${l.tipo} • ${l.provincia}`,
          })));
        }
      }

      setSearchResults(results);
    } catch (error) {
      console.error('[Social] Error searching:', error);
      setSearchResults([]);
    }
  }, []);

  const handleCreatePress = useCallback(() => {
    if (!user) {
      setLoginMessage('Para crear contenido necesitas registrarte en BarLive');
      setShowLoginModal(true);
    } else {
      setShowCreateOptions(true);
    }
  }, [user]);

  const handleSwitchToClientMode = useCallback(async () => {
    try {
      await switchToClientProfile();
      await setCurrentMode('cliente');
      await loadData();
      Alert.alert('Modo Cliente', 'Has cambiado al modo cliente');
    } catch (error) {
      console.error('[Social] Error switching to client mode:', error);
      Alert.alert('Error', 'No se pudo cambiar al modo cliente');
    }
  }, [switchToClientProfile, setCurrentMode, loadData]);

  const handleStoryPress = useCallback((historia: any) => {
    const storyIndex = historias.findIndex(h => h.id === historia.id);
    setCurrentStoryIndex(storyIndex);
    setViewingOwnStories(false);
    setShowStoryViewer(true);
  }, [historias]);

  const handleCreateStory = useCallback(() => {
    if (!user) {
      setLoginMessage('Para crear historias necesitas registrarte en BarLive');
      setShowLoginModal(true);
      return;
    }

    if (isOwnerMode && activeLocalProfileId) {
      router.push(`/crear/historia?localId=${activeLocalProfileId}`);
    } else {
      router.push('/crear/historia');
    }
  }, [user, isOwnerMode, activeLocalProfileId, router]);

  if (isInitialLoading) {
    return <InitialLoadingScreen />;
  }

  return (
    <View style={styles.container}>
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
            <IconSymbol ios_icon_name="message.fill" android_material_icon_name="chat" size={24} color={colors.headerText} />
            {unreadMessages > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/(tabs)/perfil/notificaciones')}
            activeOpacity={0.7}
          >
            <IconSymbol ios_icon_name="bell.fill" android_material_icon_name="notifications" size={24} color={colors.headerText} />
            {unreadNotifications > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowSearchModal(true)}
            activeOpacity={0.7}
          >
            <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleCreatePress}
            activeOpacity={0.7}
          >
            <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={24} color={colors.headerText} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {isOwnerMode && ownedLocals.length > 0 && (
        <View style={styles.localSelectorContainer}>
          <TouchableOpacity
            style={styles.localSelectorButton}
            onPress={() => ownedLocals.length > 1 && setShowLocalSelector(true)}
            activeOpacity={ownedLocals.length > 1 ? 0.7 : 1}
          >
            <View style={styles.localSelectorContent}>
              {activeLocalData?.imagen_url ? (
                <Image source={{ uri: activeLocalData.imagen_url }} style={styles.localSelectorImage} />
              ) : (
                <View style={[styles.localSelectorImage, styles.localSelectorImagePlaceholder]}>
                  <IconSymbol ios_icon_name="building.2" android_material_icon_name="business" size={20} color={colors.headerText} />
                </View>
              )}
              <View style={styles.localSelectorText}>
                <Text style={styles.localSelectorLabel}>Interactuando como:</Text>
                <Text style={styles.localSelectorName} numberOfLines={1}>
                  {activeLocalData?.nombre || 'Seleccionar local'}
                </Text>
              </View>
            </View>
            {ownedLocals.length > 1 && (
              <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="expand_more" size={20} color={colors.text} />
            )}
          </TouchableOpacity>
        </View>
      )}

      <FeedSocial
        posts={posts}
        onRefresh={onRefresh}
        refreshing={refreshing}
        ListHeaderComponent={
          <BarraHistorias
            historias={historias}
            onHistoriaPress={handleStoryPress}
            onCrearHistoria={handleCreateStory}
            userAvatar={user?.avatar}
            userName={user?.nombre}
          />
        }
      />

      <StoryViewer
        visible={showStoryViewer}
        stories={viewingOwnStories ? userStories : historias}
        initialIndex={currentStoryIndex}
        onClose={() => setShowStoryViewer(false)}
        onStoryChange={(index) => setCurrentStoryIndex(index)}
        activeLocalProfileId={activeLocalProfileId}
      />

      <Modal
        visible={showLocalSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocalSelector(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowLocalSelector(false)}
        >
          <Pressable style={styles.localSelectorModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.localSelectorModalHeader}>
              <Text style={styles.localSelectorModalTitle}>Seleccionar Local</Text>
              <TouchableOpacity onPress={() => setShowLocalSelector(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.localSelectorModalContent}>
              <TouchableOpacity
                style={styles.switchToClientButton}
                onPress={() => {
                  setShowLocalSelector(false);
                  handleSwitchToClientMode();
                }}
              >
                <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={20} color={colors.secondary} />
                <Text style={styles.switchToClientButtonText}>
                  Volver a modo cliente
                </Text>
              </TouchableOpacity>

              {ownedLocals.map((local) => (
                <TouchableOpacity
                  key={local.id}
                  style={[styles.localSelectorItem, activeLocalProfileId === local.id && styles.localSelectorItemActive]}
                  onPress={async () => {
                    await switchToLocalProfile(local.id);
                    await loadData();
                    setShowLocalSelector(false);
                  }}
                >
                  {local.imagen_url ? (
                    <Image source={{ uri: local.imagen_url }} style={styles.localSelectorItemImage} />
                  ) : (
                    <View style={[styles.localSelectorItemImage, styles.localSelectorImagePlaceholder]}>
                      <IconSymbol ios_icon_name="building.2" android_material_icon_name="business" size={24} color={colors.headerText} />
                    </View>
                  )}
                  <View style={styles.localSelectorItemInfo}>
                    <Text style={[styles.localSelectorItemName, activeLocalProfileId === local.id && styles.localSelectorItemNameActive]}>
                      {local.nombre}
                    </Text>
                    <Text style={styles.localSelectorItemType}>{local.tipo}</Text>
                  </View>
                  {activeLocalProfileId === local.id && (
                    <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

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
              <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <View style={styles.searchInputContainer}>
              <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar usuarios, locales o #hashtags..."
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
                key={`${result.tipo}-${result.id}`}
                style={styles.searchResultItem}
                onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSearchModal(false);
                  if (result.tipo === 'hashtag') {
                    router.push(`/social/hashtag?tag=${encodeURIComponent(result.nombre.substring(1))}`);
                  } else if (result.tipo === 'local') {
                    router.push(`/perfil/local?localId=${result.id}`);
                  } else if (user && result.id === user.id) {
                    router.push('/(tabs)/perfil');
                  } else {
                    router.push(`/perfil/usuario?userId=${result.id}`);
                  }
                }}
                activeOpacity={0.7}
              >
                {result.tipo === 'hashtag' ? (
                  <View style={[styles.searchResultAvatar, { backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' }]}>
                    <IconSymbol ios_icon_name="number" android_material_icon_name="tag" size={24} color={colors.primary} />
                  </View>
                ) : result.avatar ? (
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
                  {result.tipo === 'hashtag' && result.uso_count !== undefined && (
                    <Text style={styles.searchResultUsername}>
                      {result.uso_count} {result.uso_count === 1 ? 'publicación' : 'publicaciones'}
                    </Text>
                  )}
                  {result.username && result.tipo !== 'hashtag' && (
                    <Text style={styles.searchResultUsername}>@{result.username}</Text>
                  )}
                  {result.bio && (
                    <Text style={styles.searchResultUsername}>{result.bio}</Text>
                  )}
                  {result.tipo === 'local' && (
                    <View style={styles.searchResultBadge}>
                      <IconSymbol ios_icon_name="building.2" android_material_icon_name="business" size={14} color={colors.primary} />
                      <Text style={styles.searchResultBadgeText}>Local con plan activo</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

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
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.createOptionsButtons}>
              <TouchableOpacity
                style={styles.createOptionButton}
                onPress={() => {
                  setShowCreateOptions(false);
                  if (isOwnerMode && activeLocalProfileId) {
                    router.push(`/crear/historia?localId=${activeLocalProfileId}`);
                  } else {
                    router.push('/crear/historia');
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.createOptionIcon}>
                  <IconSymbol ios_icon_name="camera.fill" android_material_icon_name="camera_alt" size={24} color={colors.headerText} />
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
                  if (isOwnerMode && activeLocalProfileId) {
                    router.push(`/crear/publicacion?localId=${activeLocalProfileId}`);
                  } else {
                    router.push('/crear/publicacion');
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.createOptionIcon}>
                  <IconSymbol ios_icon_name="photo.fill" android_material_icon_name="photo" size={24} color={colors.headerText} />
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

      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message={loginMessage}
      />
    </View>
  );
}
