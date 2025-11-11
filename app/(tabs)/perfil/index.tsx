
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Alert,
  Linking,
  Pressable,
} from 'react-native';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import TarjetaLocal from '@/components/home/TarjetaLocal';
import { supabase } from '@/utils/supabase';

const { width, height } = Dimensions.get('window');

type UserMode = 'cliente' | 'propietario' | 'admin';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 20,
  },
  avatarGradientBorder: {
    padding: 3,
    borderRadius: 48,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: colors.headerText,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  addStoryButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.headerText,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  userInfo: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 4,
  },
  userUsername: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 4,
  },
  bioSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  bioText: {
    fontSize: 14,
    color: colors.headerText,
    lineHeight: 20,
    marginBottom: 8,
  },
  websiteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  websiteText: {
    fontSize: 14,
    color: colors.headerText,
    textDecorationLine: 'underline',
    fontWeight: '600',
    marginLeft: 6,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.cardBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  postItem: {
    width: (width - 3) / 3,
    height: (width - 3) / 3,
    padding: 0.5,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  localesContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loginRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loginRequiredIcon: {
    marginBottom: 24,
  },
  loginRequiredTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  loginRequiredText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  storyViewerOverlay: {
    flex: 1,
    backgroundColor: '#000',
  },
  storyViewerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  storyProgressContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 16,
  },
  storyProgressBar: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  storyProgressFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  storyUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storyUserLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  storyUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  storyTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  storyHeaderButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  storyCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  storyNavigation: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  storyNavLeft: {
    width: width * 0.33,
  },
  storyNavCenter: {
    flex: 1,
  },
  storyNavRight: {
    width: width * 0.33,
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '80%',
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.cardBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  bottomSheetHeader: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.cardBorder,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  bottomSheetContent: {
    padding: 16,
  },
  bottomSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.cardBackground,
  },
  bottomSheetOptionText: {
    fontSize: 15,
    color: colors.text,
    marginLeft: 16,
  },
  bottomSheetOptionDanger: {
    color: '#EF4444',
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

export default function PerfilScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { currentMode } = useMode();
  const [tabActiva, setTabActiva] = useState<'posts' | 'guardados' | 'locales' | 'etiquetados'>('posts');
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [savedLocales, setSavedLocales] = useState<any[]>([]);
  const [taggedPosts, setTaggedPosts] = useState<any[]>([]);
  const [userStories, setUserStories] = useState<any[]>([]);
  const [userStats, setUserStats] = useState({
    posts: 0,
    seguidores: 0,
    seguidos: 0,
  });
  const [isPaused, setIsPaused] = useState(false);
  const [userBio, setUserBio] = useState<string | null>(null);
  const [userWebsite, setUserWebsite] = useState<string | null>(null);
  const storyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef(new Animated.Value(0)).current;

  const userRole = user?.rol_app || 'cliente';

  console.log('[Perfil] User role:', userRole, 'Current mode:', currentMode);

  // FIXED: Function to count followers and following from seguidores table
  const loadFollowerCounts = useCallback(async (userId: string) => {
    try {
      console.log('[Perfil] 🔄 Loading follower counts from seguidores table...');

      // Count followers (people following this user)
      const { count: seguidoresCount, error: seguidoresError } = await supabase
        .from('seguidores')
        .select('*', { count: 'exact', head: true })
        .eq('seguido_id', userId);

      if (seguidoresError) {
        console.error('[Perfil] Error counting followers:', seguidoresError);
      }

      // Count following (people this user follows)
      const { count: seguidosCount, error: seguidosError } = await supabase
        .from('seguidores')
        .select('*', { count: 'exact', head: true })
        .eq('seguidor_id', userId);

      if (seguidosError) {
        console.error('[Perfil] Error counting following:', seguidosError);
      }

      const actualSeguidores = seguidoresCount || 0;
      const actualSeguidos = seguidosCount || 0;

      console.log('[Perfil] ✅ Actual counts - Seguidores:', actualSeguidores, 'Seguidos:', actualSeguidos);

      // FIXED: Update usuarios table with actual counts to keep them in sync
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          seguidores: actualSeguidores,
          seguidos: actualSeguidos,
        })
        .eq('id', userId);

      if (updateError) {
        console.error('[Perfil] Error updating user counters:', updateError);
      } else {
        console.log('[Perfil] ✅ User counters synchronized in database');
      }

      return { seguidores: actualSeguidores, seguidos: actualSeguidos };
    } catch (error) {
      console.error('[Perfil] Error loading follower counts:', error);
      return { seguidores: 0, seguidos: 0 };
    }
  }, []);

  const loadUserData = useCallback(async () => {
    if (!user) return;

    try {
      console.log('[Perfil] Loading user data...');
      
      // FIXED: Count posts directly from posts table for accurate count
      const { count: postsCount, error: postsCountError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('autor_id', user.id);

      if (postsCountError) {
        console.error('[Perfil] Error counting posts:', postsCountError);
      }

      console.log('[Perfil] Posts count from database:', postsCount);

      // FIXED: Load actual follower/following counts from seguidores table
      const followerCounts = await loadFollowerCounts(user.id);

      // Load user bio and website
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('bio, sitio_web')
        .eq('id', user.id)
        .single();

      if (!userError && userData) {
        setUserBio(userData.bio || null);
        setUserWebsite(userData.sitio_web || null);
        console.log('[Perfil] Bio:', userData.bio, 'Website:', userData.sitio_web);
      }

      // FIXED: Set stats with actual counts from seguidores table
      setUserStats({
        posts: postsCount || 0,
        seguidores: followerCounts.seguidores,
        seguidos: followerCounts.seguidos,
      });

      console.log('[Perfil] ✅ User stats loaded - Posts:', postsCount, 'Seguidores:', followerCounts.seguidores, 'Seguidos:', followerCounts.seguidos);

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('autor_id', user.id)
        .order('created_at', { ascending: false });

      if (!postsError) {
        setUserPosts(postsData || []);
        console.log('[Perfil] User posts loaded:', postsData?.length || 0);
      }

      const { data: savedPostsData, error: savedError } = await supabase
        .from('posts_guardados')
        .select(`
          post_id,
          posts (
            *,
            autor:usuarios!posts_autor_id_fkey(nombre, avatar, username)
          )
        `)
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false });

      if (!savedError && savedPostsData) {
        const formattedSavedPosts = savedPostsData
          .filter(sp => sp.posts)
          .map((sp: any) => ({
            ...sp.posts,
            autorNombre: sp.posts.autor?.nombre || 'Usuario',
            autorAvatar: sp.posts.autor?.avatar || '',
          }));
        setSavedPosts(formattedSavedPosts);
      }

      const { data: savedLocalesData, error: localesError } = await supabase
        .from('locales_guardados')
        .select(`
          local_id,
          locales (
            id,
            nombre,
            direccion,
            provincia,
            latitud,
            longitud,
            imagen_url,
            galeria_urls,
            rating,
            tipo,
            barlive_type,
            barlive_types,
            horarios_completos,
            estado_actual,
            destacado,
            nuevo
          )
        `)
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false });

      if (!localesError && savedLocalesData) {
        const formattedLocales = savedLocalesData
          .filter(sl => sl.locales)
          .map((sl: any) => {
            const local = sl.locales;
            return {
              ...local,
              coordenadas: {
                lat: parseFloat(local.latitud),
                lng: parseFloat(local.longitud),
              },
              imagenes: local.galeria_urls || (local.imagen_url ? [local.imagen_url] : []),
            };
          });
        setSavedLocales(formattedLocales);
      }

      const { data: taggedPostsData, error: taggedError } = await supabase
        .from('post_tags')
        .select(`
          post_id,
          posts (
            *,
            autor:usuarios!posts_autor_id_fkey(nombre, avatar, username)
          )
        `)
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false });

      if (!taggedError && taggedPostsData) {
        const formattedTaggedPosts = taggedPostsData
          .filter(tp => tp.posts)
          .map((tp: any) => ({
            ...tp.posts,
            autorNombre: tp.posts.autor?.nombre || 'Usuario',
            autorAvatar: tp.posts.autor?.avatar || '',
          }));
        setTaggedPosts(formattedTaggedPosts);
      }

      // Load user's own stories to show on avatar with viewed status
      const { data: storiesData, error: storiesError } = await supabase
        .from('historias')
        .select('*')
        .eq('autor_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (!storiesError && storiesData) {
        const { data: viewedData } = await supabase
          .from('historia_views')
          .select('historia_id')
          .eq('usuario_id', user.id)
          .in('historia_id', storiesData.map(s => s.id));
        
        const viewedStoryIds = new Set(viewedData?.map(v => v.historia_id) || []);
        
        const storiesWithViewStatus = storiesData.map(story => ({
          ...story,
          visto_por_usuario: viewedStoryIds.has(story.id),
        }));
        
        const hasUnviewedStories = storiesWithViewStatus.some(s => !s.visto_por_usuario);
        setUserStories(storiesWithViewStatus);
        console.log('[Perfil] User stories loaded:', storiesWithViewStatus.length, 'Viewed:', viewedStoryIds.size, 'Unviewed:', hasUnviewedStories);
      }
    } catch (error) {
      console.error('[Perfil] Error loading user data:', error);
    }
  }, [user, loadFollowerCounts]);

  useEffect(() => {
    if (user) {
      loadUserData();

      const postsChannel = supabase
        .channel('user-posts-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'posts',
            filter: `autor_id=eq.${user.id}`,
          },
          () => {
            console.log('[Perfil] User posts changed, reloading...');
            loadUserData();
          }
        )
        .subscribe();

      const historiasChannel = supabase
        .channel('user-historias-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'historias',
            filter: `autor_id=eq.${user.id}`,
          },
          () => {
            console.log('[Perfil] User stories changed, reloading...');
            loadUserData();
          }
        )
        .subscribe();

      const savedPostsChannel = supabase
        .channel('user-saved-posts-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'posts_guardados',
            filter: `usuario_id=eq.${user.id}`,
          },
          () => {
            console.log('[Perfil] Saved posts changed, reloading...');
            loadUserData();
          }
        )
        .subscribe();

      const savedLocalesChannel = supabase
        .channel('user-saved-locales-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'locales_guardados',
            filter: `usuario_id=eq.${user.id}`,
          },
          () => {
            console.log('[Perfil] Saved locales changed, reloading...');
            loadUserData();
          }
        )
        .subscribe();

      // FIXED: Subscribe to seguidores table changes for INSTANT follower/following count updates
      const seguidoresChannel = supabase
        .channel('user-seguidores-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'seguidores',
            filter: `seguido_id=eq.${user.id}`,
          },
          async () => {
            console.log('[Perfil] ⚡ INSTANT update - Followers changed');
            const followerCounts = await loadFollowerCounts(user.id);
            setUserStats(prev => ({
              ...prev,
              seguidores: followerCounts.seguidores,
            }));
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'seguidores',
            filter: `seguidor_id=eq.${user.id}`,
          },
          async () => {
            console.log('[Perfil] ⚡ INSTANT update - Following changed');
            const followerCounts = await loadFollowerCounts(user.id);
            setUserStats(prev => ({
              ...prev,
              seguidos: followerCounts.seguidos,
            }));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(postsChannel);
        supabase.removeChannel(historiasChannel);
        supabase.removeChannel(savedPostsChannel);
        supabase.removeChannel(savedLocalesChannel);
        supabase.removeChannel(seguidoresChannel);
      };
    }
  }, [user, loadUserData, loadFollowerCounts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  const startStoryTimer = useCallback(() => {
    if (isPaused) return;

    Animated.timing(progressRef, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !isPaused) {
        if (currentStoryIndex < userStories.length - 1) {
          setCurrentStoryIndex(currentStoryIndex + 1);
          progressRef.setValue(0);
        } else {
          setShowStoryViewer(false);
          setCurrentStoryIndex(0);
          progressRef.setValue(0);
        }
      }
    });
  }, [currentStoryIndex, userStories.length, isPaused, progressRef]);

  const stopStoryTimer = useCallback(() => {
    progressRef.stopAnimation();
  }, [progressRef]);

  useEffect(() => {
    if (showStoryViewer && !isPaused) {
      startStoryTimer();
    } else {
      stopStoryTimer();
    }

    return () => stopStoryTimer();
  }, [showStoryViewer, currentStoryIndex, isPaused, startStoryTimer, stopStoryTimer]);

  const handlePreviousStory = () => {
    if (currentStoryIndex > 0) {
      progressRef.setValue(0);
      setCurrentStoryIndex(currentStoryIndex - 1);
    }
  };

  const handleNextStory = async () => {
    const currentStory = userStories[currentStoryIndex];
    
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
          console.log('[Perfil] Story marked as viewed:', currentStory.id);
        }
      } catch (error) {
        console.error('[Perfil] Error marking story as viewed:', error);
      }
    }
    
    if (currentStoryIndex < userStories.length - 1) {
      progressRef.setValue(0);
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else {
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
            console.log('[Perfil] Last story marked as viewed:', currentStory.id);
          }
        } catch (error) {
          console.error('[Perfil] Error marking last story as viewed:', error);
        }
      }
      
      await loadUserData();
      setShowStoryViewer(false);
      setCurrentStoryIndex(0);
      progressRef.setValue(0);
    }
  };

  const togglePauseStory = () => {
    setIsPaused(!isPaused);
  };

  const handleDeleteStory = async () => {
    const currentStory = userStories[currentStoryIndex];
    if (!currentStory || !user) return;

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

              const updatedStories = userStories.filter(s => s.id !== currentStory.id);
              setUserStories(updatedStories);

              setShowStoryViewer(false);
              setCurrentStoryIndex(0);
              progressRef.setValue(0);

              Alert.alert('Éxito', 'Historia eliminada correctamente');
            } catch (error) {
              console.error('[Perfil] Error deleting story:', error);
              Alert.alert('Error', 'No se pudo eliminar la historia');
            }
          },
        },
      ]
    );
  };

  const handleCrearHistoria = () => {
    router.push('/crear/historia');
  };

  const handleCreatePress = () => {
    if (!user) return;
    
    Alert.alert(
      'Crear',
      'Elige qué quieres crear',
      [
        {
          text: 'Nueva Publicación',
          onPress: () => router.push('/crear/publicacion'),
        },
        {
          text: 'Nueva Historia',
          onPress: () => router.push('/crear/historia'),
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  const handleVerPost = (postId: string) => {
    console.log('[Perfil] Opening post detail:', postId);
    router.push(`/social/post?id=${postId}`);
  };

  const findFirstUnviewedStoryIndex = useCallback((): number => {
    const firstUnviewedIndex = userStories.findIndex(story => !story.visto_por_usuario);
    return firstUnviewedIndex === -1 ? 0 : firstUnviewedIndex;
  }, [userStories]);

  const handleAvatarPress = () => {
    if (userStories.length > 0) {
      const firstUnviewedIndex = findFirstUnviewedStoryIndex();
      console.log('[Perfil] Avatar pressed - First unviewed story index:', firstUnviewedIndex);
      
      setShowStoryViewer(true);
      setCurrentStoryIndex(firstUnviewedIndex);
      progressRef.setValue(0);
    } else {
      handleCrearHistoria();
    }
  };

  const handleWebsitePress = () => {
    if (userWebsite) {
      let url = userWebsite;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Cargando perfil...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Perfil</Text>
          </View>
        </LinearGradient>

        <View style={styles.loginRequiredContainer}>
          <IconSymbol 
            name="person.circle" 
            size={80} 
            color={colors.primary} 
            style={styles.loginRequiredIcon}
          />
          <Text style={styles.loginRequiredTitle}>
            Inicia sesión para ver tu perfil
          </Text>
          <Text style={styles.loginRequiredText}>
            Regístrate o inicia sesión en BarLive para acceder a tu perfil, 
            guardar tus locales favoritos y conectar con la comunidad.
          </Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/auth/login-popup')}
            activeOpacity={0.7}
          >
            <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentStory = userStories[currentStoryIndex];
  const hasNewStories = userStories.length > 0;
  const hasUnviewedStories = userStories.some(s => !s.visto_por_usuario);

  const getCurrentPosts = () => {
    switch (tabActiva) {
      case 'posts':
        return userPosts;
      case 'guardados':
        return savedPosts;
      case 'locales':
        return [];
      case 'etiquetados':
        return taggedPosts;
      default:
        return [];
    }
  };

  const currentPosts = getCurrentPosts();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>{user.username || user.nombre}</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={handleCreatePress}
              activeOpacity={0.7}
            >
              <IconSymbol name="plus" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/(tabs)/perfil/configuracion')}
              activeOpacity={0.7}
            >
              <IconSymbol name="line.3.horizontal" size={24} color={colors.headerText} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileSection}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={handleAvatarPress}
            activeOpacity={0.7}
          >
            {hasUnviewedStories ? (
              <LinearGradient
                colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                style={styles.avatarGradientBorder}
              >
                {user.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>{user.nombre.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
              </LinearGradient>
            ) : user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{user.nombre.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            {!hasNewStories && (
              <TouchableOpacity 
                style={styles.addStoryButton} 
                onPress={handleCrearHistoria}
                activeOpacity={0.7}
              >
                <IconSymbol name="plus" size={12} color={colors.headerText} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userStats.posts}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => router.push(`/perfil/seguidores?userId=${user.id}`)}
              activeOpacity={0.7}
            >
              <Text style={styles.statNumber}>{userStats.seguidores}</Text>
              <Text style={styles.statLabel}>Seguidores</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => router.push(`/perfil/seguidos?userId=${user.id}`)}
              activeOpacity={0.7}
            >
              <Text style={styles.statNumber}>{userStats.seguidos}</Text>
              <Text style={styles.statLabel}>Siguiendo</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.nombre}</Text>
          {user.username && (
            <Text style={styles.userUsername}>@{user.username}</Text>
          )}
        </View>

        {(userBio || userWebsite) && (
          <View style={styles.bioSection}>
            {userBio && <Text style={styles.bioText}>{userBio}</Text>}
            {userWebsite && (
              <TouchableOpacity 
                style={styles.websiteLink}
                onPress={handleWebsitePress} 
                activeOpacity={0.7}
              >
                <IconSymbol name="link" size={16} color={colors.headerText} />
                <Text style={styles.websiteText}>{userWebsite}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/editar/perfil')}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>Editar Perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => router.push('/(tabs)/perfil/chats')}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>Mensajes</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, tabActiva === 'posts' && styles.tabActive]}
            onPress={() => setTabActiva('posts')}
            activeOpacity={0.7}
          >
            <IconSymbol
              name="square.grid.3x3"
              size={24}
              color={tabActiva === 'posts' ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tabActiva === 'guardados' && styles.tabActive]}
            onPress={() => setTabActiva('guardados')}
            activeOpacity={0.7}
          >
            <IconSymbol
              name="bookmark"
              size={24}
              color={tabActiva === 'guardados' ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tabActiva === 'locales' && styles.tabActive]}
            onPress={() => setTabActiva('locales')}
            activeOpacity={0.7}
          >
            <IconSymbol
              name="heart"
              size={24}
              color={tabActiva === 'locales' ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tabActiva === 'etiquetados' && styles.tabActive]}
            onPress={() => setTabActiva('etiquetados')}
            activeOpacity={0.7}
          >
            <IconSymbol
              name="at"
              size={24}
              color={tabActiva === 'etiquetados' ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {tabActiva === 'locales' ? (
            <>
              {savedLocales.length > 0 ? (
                <View style={styles.localesContainer}>
                  {savedLocales.map((local) => (
                    <TarjetaLocal
                      key={local.id}
                      local={local}
                      userLocation={null}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <IconSymbol
                    name="heart"
                    size={48}
                    color={colors.textSecondary}
                    style={styles.emptyIcon}
                  />
                  <Text style={styles.emptyText}>No hay locales favoritos</Text>
                  <Text style={styles.emptySubtext}>
                    Guarda tus locales favoritos para verlos aquí
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              {currentPosts.length > 0 ? (
                <View style={styles.postsGrid}>
                  {currentPosts.map((post) => (
                    <TouchableOpacity
                      key={post.id}
                      style={styles.postItem}
                      onPress={() => handleVerPost(post.id)}
                      activeOpacity={0.7}
                    >
                      {post.imagen && (
                        <Image source={{ uri: post.imagen }} style={styles.postImage} resizeMode="cover" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <IconSymbol
                    name={
                      tabActiva === 'posts'
                        ? 'photo.on.rectangle'
                        : tabActiva === 'guardados'
                        ? 'bookmark'
                        : 'at'
                    }
                    size={48}
                    color={colors.textSecondary}
                    style={styles.emptyIcon}
                  />
                  <Text style={styles.emptyText}>
                    {tabActiva === 'posts'
                      ? 'No hay publicaciones'
                      : tabActiva === 'guardados'
                      ? 'No hay guardados'
                      : 'No hay publicaciones etiquetadas'}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {tabActiva === 'posts'
                      ? 'Comparte tu primera publicación para que aparezca aquí'
                      : tabActiva === 'guardados'
                      ? 'Guarda publicaciones para verlas más tarde'
                      : 'Las publicaciones donde te etiqueten aparecerán aquí'}
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>

      <Modal
        visible={showStoryViewer}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={async () => {
          const currentStory = userStories[currentStoryIndex];
          
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
                console.log('[Perfil] Story marked as viewed on modal close:', currentStory.id);
              }
            } catch (error) {
              console.error('[Perfil] Error marking story as viewed on modal close:', error);
            }
            
            await loadUserData();
          }
          
          setShowStoryViewer(false);
          progressRef.setValue(0);
          setIsPaused(false);
        }}
      >
        <View style={styles.storyViewerOverlay}>
          <View style={styles.storyViewerHeader}>
            <View style={styles.storyProgressContainer}>
              {userStories.map((_, index) => (
                <View key={index} style={styles.storyProgressBar}>
                  {index < currentStoryIndex && (
                    <View style={[styles.storyProgressFill, { width: '100%' }]} />
                  )}
                  {index === currentStoryIndex && (
                    <Animated.View
                      style={[
                        styles.storyProgressFill,
                        {
                          width: progressRef.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  )}
                </View>
              ))}
            </View>

            <View style={styles.storyUserInfo}>
              <View style={styles.storyUserLeft}>
                {user.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.storyAvatar} />
                ) : (
                  <View style={[styles.storyAvatar, { backgroundColor: colors.primary }]}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                      {user.nombre.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.storyUserName}>{user.nombre}</Text>
                <Text style={styles.storyTime}>
                  {currentStory && formatearFecha(currentStory.created_at)}
                </Text>
              </View>
              <View style={styles.storyHeaderButtons}>
                <TouchableOpacity
                  style={styles.storyDeleteButton}
                  onPress={handleDeleteStory}
                  activeOpacity={0.7}
                >
                  <IconSymbol name="trash.fill" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.storyCloseButton}
                  onPress={async () => {
                    const currentStory = userStories[currentStoryIndex];
                    
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
                          console.log('[Perfil] Story marked as viewed on close:', currentStory.id);
                        }
                      } catch (error) {
                        console.error('[Perfil] Error marking story as viewed on close:', error);
                      }
                      
                      await loadUserData();
                    }
                    
                    setShowStoryViewer(false);
                    progressRef.setValue(0);
                    setIsPaused(false);
                  }}
                  activeOpacity={0.7}
                >
                  <IconSymbol name="xmark" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.storyContent}>
            {currentStory && currentStory.imagen && (
              <Image source={{ uri: currentStory.imagen }} style={styles.storyImage} />
            )}
          </View>

          <View style={styles.storyNavigation}>
            <Pressable
              style={styles.storyNavLeft}
              onPress={handlePreviousStory}
            />
            <Pressable
              style={styles.storyNavCenter}
              onPressIn={() => setIsPaused(true)}
              onPressOut={() => setIsPaused(false)}
            />
            <Pressable
              style={styles.storyNavRight}
              onPress={handleNextStory}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
