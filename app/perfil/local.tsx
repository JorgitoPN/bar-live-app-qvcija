
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Pressable,
  Animated,
  Linking,
  TextInput,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { supabase } from '@/utils/supabase';
import { getEstadoLocal, calcularTiempoHasta } from '@/utils/timeUtils';
import { getCategoryIcon } from '@/utils/categoryIcons';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import ProfileSwitcher from '@/components/perfil/ProfileSwitcher';
import OfertaTrabajoCard from '@/components/empleo/OfertaTrabajoCard';
import PerfilProfesionalCard from '@/components/empleo/PerfilProfesionalCard';
import StoryStatsModal from '@/components/social/StoryStatsModal';
import { PROVINCIAS, getProvinceVariations, filterByProvincia } from '@/utils/provinceNormalizer';

// ✅ VERSION MARKER - Force cache bust: v3.0.0 - MAJOR UPDATE
const SCREEN_VERSION = '3.0.0';

const { width, height } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 4) / 3;

interface LocalPost {
  id: string;
  autor_id: string;
  tipo: string;
  imagen?: string;
  contenido?: string;
  local_id: string;
  likes: number;
  comentarios: number;
  created_at: string;
}

interface LocalStory {
  id: string;
  autor_id: string;
  tipo: string;
  imagen: string;
  local_id: string;
  created_at: string;
  expires_at: string;
  visto_por_usuario?: boolean;
  views_count?: number;
  likes_count?: number;
  liked_by_user?: boolean;
}

interface LocalEvent {
  id: string;
  titulo: string;
  descripcion?: string;
  fecha: string;
  hora: string;
  precio?: number;
  imagen_url?: string;
  local_id: string;
  destacado: boolean;
}

interface OfertaTrabajo {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: string;
  salario?: string;
  provincia?: string;
  local_id?: string;
  propietario_id?: string;
  activo: boolean;
  created_at: string;
  imagen_url?: string;
  locales?: {
    nombre: string;
    imagen_url?: string;
  };
}

interface PerfilProfesional {
  id: string;
  usuario_id?: string;
  nombre_completo: string;
  puesto_deseado: string;
  experiencia: string;
  habilidades?: string;
  disponibilidad?: string;
  foto_url?: string;
  provincia?: string;
  activo: boolean;
  created_at: string;
}

export default function LocalPerfilScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  
  const { 
    currentMode,
    activeProfileId,
    activeProfileType,
    switchToLocalProfile,
    setCurrentMode,
    ownedLocals,
  } = useMode();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [local, setLocal] = useState<any>(null);
  const [posts, setPosts] = useState<LocalPost[]>([]);
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [isFavorito, setIsFavorito] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'eventos' | 'empleo' | 'info'>('posts');

  // Employment tab state
  const [empleoSubTab, setEmpleoSubTab] = useState<'ofertas' | 'demandantes'>('ofertas');
  const [ofertasTrabajo, setOfertasTrabajo] = useState<OfertaTrabajo[]>([]);
  const [perfilesProfesionales, setPerfilesProfesionales] = useState<PerfilProfesional[]>([]);
  const [loadingEmpleo, setLoadingEmpleo] = useState(false);
  
  // Filters for employment
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvincia, setSelectedProvincia] = useState<string | null>(null);
  const [showProvinciaModal, setShowProvinciaModal] = useState(false);

  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [localStories, setLocalStories] = useState<LocalStory[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const storyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);

  const [showStoryStats, setShowStoryStats] = useState(false);
  const [storyViews, setStoryViews] = useState<any[]>([]);
  const [storyLikes, setStoryLikes] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const localId = params.localId as string;

  const isInteractingAsLocal = activeProfileType === 'local';
  const activeLocalProfileId = activeProfileType === 'local' ? activeProfileId : null;

  // Pre-load all tab content to avoid loading states
  const [contentLoaded, setContentLoaded] = useState({
    posts: false,
    eventos: false,
    empleo: false,
    info: false,
  });

  useEffect(() => {
    console.log(`⚡⚡⚡ LocalPerfilScreen v${SCREEN_VERSION} MOUNTED ⚡⚡⚡`);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const loadLocalData = useCallback(async () => {
    if (!localId) {
      console.error('[LocalPerfil] ❌ No localId provided');
      Alert.alert('Error', 'No se pudo cargar el perfil del local', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/explorar') }
      ]);
      return;
    }

    try {
      console.log('[LocalPerfil] ✅ Loading local data for:', localId);

      const { data: localData, error: localError } = await supabase
        .from('locales')
        .select('*')
        .eq('id', localId)
        .single();

      if (localError || !localData) {
        console.error('[LocalPerfil] Error loading local:', localError);
        Alert.alert('Error', 'No se pudo cargar el perfil del local', [
          { text: 'OK', onPress: () => router.replace('/(tabs)/explorar') }
        ]);
        return;
      }

      setLocal(localData);

      // ✅ CRITICAL FIX: Determine ownership based on propietario_id
      if (user && localData.propietario_id === user.id) {
        setIsOwner(true);
        console.log('[LocalPerfil] ✅ User IS OWNER of this local');
      } else {
        setIsOwner(false);
        console.log('[LocalPerfil] ✅ User is NOT owner of this local');
      }

      const [postsResult, eventsResult, storiesResult, favResult] = await Promise.all([
        supabase
          .from('posts')
          .select('*')
          .eq('tipo', 'local')
          .eq('local_id', localId)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('eventos')
          .select('*')
          .eq('local_id', localId)
          .eq('activo', true)
          .gte('fecha', new Date().toISOString().split('T')[0])
          .order('fecha', { ascending: true })
          .limit(6),
        
        supabase
          .from('historias')
          .select('*')
          .eq('tipo', 'local')
          .eq('local_id', localId)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: true }),
        
        user ? supabase
          .from('locales_favoritos')
          .select('id')
          .eq('usuario_id', user.id)
          .eq('local_id', localId)
          .single() : Promise.resolve({ data: null })
      ]);

      if (!postsResult.error) {
        console.log('[LocalPerfil] ✅ Loaded', postsResult.data?.length || 0, 'posts for local');
        setPosts(postsResult.data || []);
        setContentLoaded(prev => ({ ...prev, posts: true }));
      }

      if (!eventsResult.error) {
        setEvents(eventsResult.data || []);
        setContentLoaded(prev => ({ ...prev, eventos: true }));
      }

      if (storiesResult.data && user) {
        console.log('[LocalPerfil] ✅ Loaded', storiesResult.data.length, 'stories for local');
        const storyIds = storiesResult.data.map(s => s.id);
        
        const [viewedData, viewsCountData, likesCountData, likedData] = await Promise.all([
          supabase
            .from('historia_views')
            .select('historia_id')
            .eq('usuario_id', user.id)
            .in('historia_id', storyIds),
          supabase
            .from('historia_views')
            .select('historia_id')
            .in('historia_id', storyIds),
          supabase
            .from('historia_likes')
            .select('historia_id')
            .in('historia_id', storyIds),
          supabase
            .from('historia_likes')
            .select('historia_id')
            .eq('usuario_id', user.id)
            .in('historia_id', storyIds),
        ]);

        const viewedStoryIds = new Set(viewedData.data?.map(v => v.historia_id) || []);
        const likedStoryIds = new Set(likedData.data?.map(l => l.historia_id) || []);
        
        const viewsCounts = viewsCountData.data?.reduce((acc, v) => {
          acc[v.historia_id] = (acc[v.historia_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};
        
        const likesCounts = likesCountData.data?.reduce((acc, l) => {
          acc[l.historia_id] = (acc[l.historia_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const storiesWithStatus = storiesResult.data.map(story => ({
          ...story,
          visto_por_usuario: viewedStoryIds.has(story.id),
          views_count: viewsCounts[story.id] || 0,
          likes_count: likesCounts[story.id] || 0,
          liked_by_user: likedStoryIds.has(story.id),
        }));

        setLocalStories(storiesWithStatus);
      } else if (storiesResult.data) {
        setLocalStories(storiesResult.data);
      }

      setIsFavorito(!!favResult.data);
      setContentLoaded(prev => ({ ...prev, info: true }));

      console.log('[LocalPerfil] ✅ Local data loaded successfully');
    } catch (error) {
      console.error('[LocalPerfil] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [localId, user, router]);

  // Load employment data with province normalization
  const loadEmpleoData = useCallback(async () => {
    if (!localId) return;
    
    setLoadingEmpleo(true);
    try {
      console.log('[LocalPerfil] Loading employment data with filters:', {
        searchQuery,
        selectedProvincia
      });

      // Load ALL job offers first (we'll filter by province in memory)
      let ofertasQuery = supabase
        .from('ofertas_trabajo')
        .select(`
          *,
          locales (
            nombre,
            imagen_url
          )
        `)
        .eq('activo', true)
        .order('created_at', { ascending: false });

      // Apply search filter at database level
      if (searchQuery) {
        ofertasQuery = ofertasQuery.or(`titulo.ilike.%${searchQuery}%,descripcion.ilike.%${searchQuery}%`);
      }

      const { data: ofertasData, error: ofertasError } = await ofertasQuery;

      if (!ofertasError && ofertasData) {
        // Filter by province in memory using the normalizer
        let filteredOfertas = ofertasData;
        if (selectedProvincia) {
          filteredOfertas = filterByProvincia(ofertasData, selectedProvincia);
          console.log('[LocalPerfil] ✅ Filtered job offers by province:', {
            selectedProvincia,
            totalOffers: ofertasData.length,
            filteredOffers: filteredOfertas.length
          });
        }
        
        console.log('[LocalPerfil] ✅ Loaded', filteredOfertas.length, 'job offers');
        setOfertasTrabajo(filteredOfertas);
      }

      // Load ALL professional profiles first (we'll filter by province in memory)
      let perfilesQuery = supabase
        .from('perfiles_profesionales')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false });

      // Apply search filter at database level
      if (searchQuery) {
        perfilesQuery = perfilesQuery.or(`nombre_completo.ilike.%${searchQuery}%,puesto_deseado.ilike.%${searchQuery}%`);
      }

      const { data: perfilesData, error: perfilesError } = await perfilesQuery;

      if (!perfilesError && perfilesData) {
        // Filter by province in memory using the normalizer
        let filteredPerfiles = perfilesData;
        if (selectedProvincia) {
          filteredPerfiles = filterByProvincia(perfilesData, selectedProvincia);
          console.log('[LocalPerfil] ✅ Filtered professional profiles by province:', {
            selectedProvincia,
            totalProfiles: perfilesData.length,
            filteredProfiles: filteredPerfiles.length
          });
        }
        
        console.log('[LocalPerfil] ✅ Loaded', filteredPerfiles.length, 'professional profiles');
        setPerfilesProfesionales(filteredPerfiles);
      }

      setContentLoaded(prev => ({ ...prev, empleo: true }));
    } catch (error) {
      console.error('[LocalPerfil] Error loading employment data:', error);
    } finally {
      setLoadingEmpleo(false);
    }
  }, [localId, searchQuery, selectedProvincia]);

  useEffect(() => {
    loadLocalData();
  }, [loadLocalData, localId]);

  // Load employment data when tab is active
  useEffect(() => {
    if (activeTab === 'empleo' && !contentLoaded.empleo) {
      loadEmpleoData();
    }
  }, [activeTab, contentLoaded.empleo, loadEmpleoData]);

  // Reload employment data when filters change
  useEffect(() => {
    if (activeTab === 'empleo') {
      loadEmpleoData();
    }
  }, [searchQuery, selectedProvincia, activeTab, loadEmpleoData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLocalData();
    if (activeTab === 'empleo') {
      await loadEmpleoData();
    }
    setRefreshing(false);
  };

  const toggleFavorito = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para seguir locales');
      return;
    }

    try {
      if (isFavorito) {
        await supabase
          .from('locales_favoritos')
          .delete()
          .eq('usuario_id', user.id)
          .eq('local_id', localId);
        setIsFavorito(false);
        
        if (local) {
          setLocal({
            ...local,
            seguidores: Math.max(0, (local.seguidores || 0) - 1),
          });
        }
      } else {
        await supabase
          .from('locales_favoritos')
          .insert({
            usuario_id: user.id,
            local_id: localId,
          });
        setIsFavorito(true);
        
        if (local) {
          setLocal({
            ...local,
            seguidores: (local.seguidores || 0) + 1,
          });
        }
      }
    } catch (error) {
      console.error('[LocalPerfil] Error toggling favorito:', error);
      Alert.alert('Error', 'No se pudo completar la acción');
    }
  };

  const handleComoLlegar = () => {
    if (local?.latitud && local?.longitud) {
      const url = Platform.select({
        ios: `maps://app?daddr=${local.latitud},${local.longitud}`,
        android: `google.navigation:q=${local.latitud},${local.longitud}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${local.latitud},${local.longitud}`,
      });
      Linking.openURL(url);
    }
  };

  const handleLlamar = () => {
    if (local?.telefono) {
      Linking.openURL(`tel:${local.telefono}`);
    }
  };

  const handleWeb = () => {
    if (local?.website) {
      Linking.openURL(local.website);
    }
  };

  const handleSalaVirtual = () => {
    router.push(`/detalle/sala-virtual?id=${localId}`);
  };

  const handleVerPost = (postId: string) => {
    router.push(`/social/post?id=${postId}`);
  };

  const handleVerEvento = (eventoId: string) => {
    router.push(`/detalle/evento?id=${eventoId}`);
  };

  const handleVerOferta = (ofertaId: string) => {
    router.push(`/empleo/oferta-detalle?id=${ofertaId}`);
  };

  const handleVerPerfil = (perfilId: string) => {
    router.push(`/empleo/perfil-detalle?id=${perfilId}`);
  };

  const handleCrearPost = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión');
      return;
    }
    if (!isOwner) {
      Alert.alert('Error', 'Solo el propietario puede crear publicaciones');
      return;
    }
    
    console.log('[LocalPerfil] Setting interaction state for creating post');
    await switchToLocalProfile(localId);
    await setCurrentMode('propietario');
    
    router.push(`/crear/publicacion?localId=${localId}`);
  };

  const handleCrearHistoria = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión');
      return;
    }
    if (!isOwner) {
      Alert.alert('Error', 'Solo el propietario puede crear historias');
      return;
    }
    
    console.log('[LocalPerfil] Setting interaction state for creating story');
    await switchToLocalProfile(localId);
    await setCurrentMode('propietario');
    
    router.push(`/crear/historia?localId=${localId}`);
  };

  const handleCrearEvento = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión');
      return;
    }
    if (!isOwner) {
      Alert.alert('Error', 'Solo el propietario puede crear eventos');
      return;
    }
    
    console.log('[LocalPerfil] Setting interaction state for creating event');
    await switchToLocalProfile(localId);
    await setCurrentMode('propietario');
    
    router.push(`/crear/evento?localId=${localId}`);
  };

  const handleCrearOferta = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión');
      return;
    }
    if (!isOwner) {
      Alert.alert('Error', 'Solo el propietario puede crear ofertas de trabajo');
      return;
    }
    
    console.log('[LocalPerfil] Setting interaction state for creating job offer');
    await switchToLocalProfile(localId);
    await setCurrentMode('propietario');
    
    router.push(`/crear/oferta-trabajo?localId=${localId}`);
  };

  const handleEditarLocal = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión');
      return;
    }
    if (!isOwner) {
      Alert.alert('Error', 'Solo el propietario puede editar el local');
      return;
    }
    
    console.log('[LocalPerfil] Setting interaction state for editing local');
    await switchToLocalProfile(localId);
    await setCurrentMode('propietario');
    
    router.push(`/editar/local?id=${localId}`);
  };

  const handleGoBack = () => {
    try {
      if (router.canGoBack()) {
        console.log('[LocalPerfil] ✅ Going back to previous screen');
        router.back();
      } else {
        console.log('[LocalPerfil] ⚠️ No previous screen, navigating to explorar');
        router.replace('/(tabs)/explorar');
      }
    } catch (error) {
      console.error('[LocalPerfil] ❌ Error navigating back:', error);
      router.replace('/(tabs)/explorar');
    }
  };

  const stopStoryTimer = useCallback(() => {
    if (storyTimerRef.current) {
      clearTimeout(storyTimerRef.current);
      storyTimerRef.current = null;
    }
    progressAnim.stopAnimation();
  }, [progressAnim]);

  const handleNextStory = useCallback(async () => {
    const currentStory = localStories[currentStoryIndex];
    
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
        console.error('[LocalPerfil] Error marking story as viewed:', error);
      }
    }
    
    if (currentStoryIndex < localStories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      progressAnim.setValue(0);
    } else {
      await loadLocalData();
      setShowStoryViewer(false);
      stopStoryTimer();
    }
  }, [currentStoryIndex, localStories, stopStoryTimer, user, loadLocalData, progressAnim]);

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

  const handleAvatarPress = useCallback(async () => {
    if (localStories.length > 0) {
      setCurrentStoryIndex(0);
      setShowStoryViewer(true);
      setIsPaused(false);
      startStoryTimer();
    } else if (isOwner) {
      handleCrearHistoria();
    }
  }, [localStories, startStoryTimer, isOwner]);

  const handleViewStoryStats = useCallback(async () => {
    const currentStory = localStories[currentStoryIndex];
    
    if (!currentStory || !user || !isOwner) {
      return;
    }

    setIsPaused(true);
    stopStoryTimer();

    setLoadingStats(true);
    setShowStoryStats(true);

    try {
      const { data: viewsData, error: viewsError } = await supabase
        .from('historia_views')
        .select(`
          id,
          usuario_id,
          viewed_at,
          usuario:usuarios(nombre, avatar, username)
        `)
        .eq('historia_id', currentStory.id)
        .order('viewed_at', { ascending: false });

      if (viewsError) throw viewsError;

      const { data: likesData, error: likesError } = await supabase
        .from('historia_likes')
        .select(`
          id,
          usuario_id,
          created_at,
          usuario:usuarios(nombre, avatar, username)
        `)
        .eq('historia_id', currentStory.id)
        .order('created_at', { ascending: false });

      if (likesError) throw likesError;

      setStoryViews(viewsData || []);
      setStoryLikes(likesData || []);
    } catch (error) {
      console.error('[LocalPerfil] Error loading story stats:', error);
      Alert.alert('Error', 'No se pudieron cargar las estadísticas');
    } finally {
      setLoadingStats(false);
    }
  }, [localStories, currentStoryIndex, user, isOwner, stopStoryTimer]);

  const handleDeleteStory = useCallback(async () => {
    const currentStory = localStories[currentStoryIndex];
    
    if (!currentStory || !user || !isOwner) {
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

              const newStories = localStories.filter((_, i) => i !== currentStoryIndex);
              setLocalStories(newStories);

              if (newStories.length === 0) {
                setShowStoryViewer(false);
                stopStoryTimer();
              } else if (currentStoryIndex >= newStories.length) {
                setCurrentStoryIndex(newStories.length - 1);
              }

              Alert.alert('Éxito', 'Historia eliminada correctamente');
            } catch (error) {
              console.error('[LocalPerfil] Error deleting story:', error);
              Alert.alert('Error', 'No se pudo eliminar la historia');
            }
          },
        },
      ]
    );
  }, [localStories, currentStoryIndex, user, isOwner, stopStoryTimer]);

  useEffect(() => {
    if (showStoryViewer && !isPaused) {
      startStoryTimer();
    }
    return () => {
      stopStoryTimer();
    };
  }, [showStoryViewer, currentStoryIndex, isPaused, startStoryTimer, stopStoryTimer]);

  // ✅ CRITICAL FIX: Determine tabs based on whether user is owner viewing their own local
  // When viewing own local profile, show owner tabs (gestion, favoritos, social)
  // When viewing other's local or as client, show client tabs (eventos, favoritos, social)
  const getTabsForRole = (): TabBarItem[] => {
    const userRole = user?.rol_app || 'cliente';

    console.log('🔍🔍🔍 [getTabsForRole] Determining tabs:', {
      userRole,
      currentMode,
      isOwner,
      localId,
      activeProfileId,
      activeProfileType,
      localPropietarioId: local?.propietario_id,
      userId: user?.id
    });

    // Admin mode
    if (userRole === 'admin' && currentMode === 'admin') {
      console.log('📋 [getTabsForRole] Showing ADMIN tabs');
      return [
        {
          name: 'admin',
          route: '/(tabs)/admin',
          icon: 'gear',
          label: 'Admin',
        },
        {
          name: 'explorar',
          route: '/(tabs)/explorar',
          icon: 'sparkles',
          label: 'Explorar',
        },
        {
          name: 'perfil',
          route: '/(tabs)/perfil',
          icon: 'person.fill',
          label: 'Perfil',
        },
      ];
    }

    // ✅ CRITICAL FIX: If user is owner of this local AND in propietario mode, show owner tabs with GESTION icon
    if (isOwner && currentMode === 'propietario') {
      console.log('🏢🏢🏢 [getTabsForRole] Showing OWNER tabs with GESTION icon (building.2) - User owns this local');
      return [
        {
          name: 'gestion',
          route: '/(tabs)/gestion',
          icon: 'building.2',
          label: 'Gestión',
        },
        {
          name: 'favoritos',
          route: '/(tabs)/favoritos',
          icon: 'heart.fill',
          label: 'Favoritos',
        },
        {
          name: 'explorar',
          route: '/(tabs)/explorar',
          icon: 'sparkles',
          label: 'Explorar',
        },
        {
          name: 'social',
          route: '/(tabs)/social',
          icon: 'person.2.fill',
          label: 'Social',
        },
        {
          name: 'perfil',
          route: '/(tabs)/perfil',
          icon: 'person.fill',
          label: 'Perfil',
        },
      ];
    }

    // Default: client tabs (eventos, favoritos, social)
    console.log('👤 [getTabsForRole] Showing CLIENT tabs (eventos, favoritos, social) - Not owner or not in propietario mode');
    return [
      {
        name: 'eventos',
        route: '/(tabs)/eventos',
        icon: 'calendar',
        label: 'Eventos',
      },
      {
        name: 'favoritos',
        route: '/(tabs)/favoritos',
        icon: 'heart.fill',
        label: 'Favoritos',
      },
      {
        name: 'explorar',
        route: '/(tabs)/explorar',
        icon: 'sparkles',
        label: 'Explorar',
      },
      {
        name: 'social',
        route: '/(tabs)/social',
        icon: 'person.2.fill',
        label: 'Social',
      },
      {
        name: 'perfil',
        route: '/(tabs)/perfil',
        icon: 'person.fill',
        label: 'Perfil',
      },
    ];
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Cargando perfil del local...</Text>
      </View>
    );
  }

  if (!local) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>Local no encontrado</Text>
      </View>
    );
  }

  const estado = getEstadoLocal(local);
  const hasActiveStory = localStories.length > 0;
  const hasUnviewedStories = localStories.some(s => !s.visto_por_usuario);
  const currentStory = localStories[currentStoryIndex];

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  let categoriasLocal = local.barlive_types || [];
  if (categoriasLocal.length === 0 && local.barlive_type) {
    categoriasLocal = [local.barlive_type];
  }

  const tabs = getTabsForRole();

  console.log('🎯🎯🎯 [LocalPerfil] Rendering with tabs:', tabs.map(t => `${t.name}(${t.icon})`).join(', '));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.fixedHeader}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{local.nombre}</Text>
          <View style={styles.headerActions}>
            {isOwner && (user?.rol_app === 'propietario' || ownedLocals.length > 0) && (
              <TouchableOpacity 
                style={styles.switchProfileButton}
                onPress={() => setShowProfileSwitcher(true)}
                activeOpacity={0.8}
              >
                <IconSymbol name="arrow.triangle.2.circlepath" size={24} color={colors.headerText} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        scrollEventThrottle={400}
      >
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.profileHeaderGradient}
        >
          {local.imagen_portada && (
            <View style={styles.coverPhotoContainer}>
              <Image 
                source={{ uri: local.imagen_portada }} 
                style={styles.coverPhoto}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.3)']}
                style={styles.coverGradient}
              />
            </View>
          )}

          <Animated.View 
            style={[
              styles.profileSection,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              }
            ]}
          >
            <View style={styles.profileHeader}>
              <TouchableOpacity 
                style={styles.avatarContainer}
                onPress={handleAvatarPress}
                activeOpacity={0.8}
              >
                {hasActiveStory && hasUnviewedStories && (
                  <LinearGradient
                    colors={['#FFD700', '#00FF00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.storyRing}
                  />
                )}
                {local.imagen_url ? (
                  <Image source={{ uri: local.imagen_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <IconSymbol name="building.2" size={40} color={colors.headerText} />
                  </View>
                )}
                {!hasActiveStory && isOwner && (
                  <View style={styles.addStoryIcon}>
                    <IconSymbol name="plus" size={18} color={colors.white} />
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{local.nombre}</Text>
                {categoriasLocal.length > 0 && (
                  <View style={styles.categoriesContainer}>
                    {categoriasLocal.slice(0, 2).map((categoria: string, index: number) => (
                      <View key={index} style={styles.categoryBadge}>
                        <Text style={styles.categoryIcon}>{getCategoryIcon(categoria)}</Text>
                        <Text style={styles.categoryText}>{categoria}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {local.direccion && (
              <View style={styles.addressContainer}>
                <IconSymbol name="mappin" size={16} color={colors.headerText} />
                <Text style={styles.addressText}>{local.direccion}</Text>
              </View>
            )}

            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: estado.estaAbierto ? '#22C55E' : '#EF4444' }]} />
              <Text style={styles.statusText}>{estado.badge}</Text>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{posts.length}</Text>
                <Text style={styles.statLabel}>Publicaciones</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{local.seguidores || 0}</Text>
                <Text style={styles.statLabel}>Seguidores</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{events.length}</Text>
                <Text style={styles.statLabel}>Eventos</Text>
              </View>
            </View>

            <View style={styles.actionsContainer}>
              {isOwner ? (
                <>
                  <TouchableOpacity style={styles.actionButton} onPress={handleEditarLocal}>
                    <IconSymbol name="pencil" size={18} color={colors.headerText} />
                    <Text style={styles.actionButtonText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionButton, styles.createButton]} onPress={() => setShowCreateOptions(true)}>
                    <IconSymbol name="plus.circle.fill" size={18} color={colors.white} />
                    <Text style={[styles.actionButtonText, { color: colors.white }]}>Publicar</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity 
                    style={[styles.actionButton, isFavorito && styles.actionButtonFollowing]} 
                    onPress={toggleFavorito}
                  >
                    <IconSymbol 
                      name={isFavorito ? 'heart.fill' : 'heart'} 
                      size={18} 
                      color={colors.headerText} 
                    />
                    <Text style={styles.actionButtonText}>
                      {isFavorito ? 'Siguiendo' : 'Seguir'}
                    </Text>
                  </TouchableOpacity>
                  {local.telefono && (
                    <TouchableOpacity style={styles.actionButton} onPress={handleLlamar}>
                      <IconSymbol name="phone.fill" size={18} color={colors.headerText} />
                      <Text style={styles.actionButtonText}>Llamar</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </Animated.View>
        </LinearGradient>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
            onPress={() => setActiveTab('posts')}
          >
            <IconSymbol 
              name="square.grid.3x3" 
              size={24} 
              color={activeTab === 'posts' ? colors.primary : colors.textSecondary} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'eventos' && styles.tabActive]}
            onPress={() => setActiveTab('eventos')}
          >
            <IconSymbol 
              name="calendar" 
              size={24} 
              color={activeTab === 'eventos' ? colors.primary : colors.textSecondary} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'empleo' && styles.tabActive]}
            onPress={() => setActiveTab('empleo')}
          >
            <IconSymbol 
              name="briefcase.fill" 
              size={24} 
              color={activeTab === 'empleo' ? colors.primary : colors.textSecondary} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'info' && styles.tabActive]}
            onPress={() => setActiveTab('info')}
          >
            <IconSymbol 
              name="info.circle" 
              size={24} 
              color={activeTab === 'info' ? colors.primary : colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {activeTab === 'posts' && (
            <View style={styles.postsGrid}>
              {posts.length > 0 ? (
                posts.map((post) => (
                  <TouchableOpacity
                    key={post.id}
                    style={styles.gridItem}
                    onPress={() => handleVerPost(post.id)}
                    activeOpacity={0.8}
                  >
                    {post.imagen ? (
                      <Image source={{ uri: post.imagen }} style={styles.gridImage} />
                    ) : (
                      <View style={[styles.gridImage, styles.gridImagePlaceholder]}>
                        <IconSymbol name="photo" size={32} color={colors.textSecondary} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <IconSymbol name="photo.on.rectangle" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>
                    {isOwner ? 'Crea tu primera publicación' : 'No hay publicaciones'}
                  </Text>
                  {isOwner && (
                    <TouchableOpacity style={styles.emptyButton} onPress={handleCrearPost}>
                      <Text style={styles.emptyButtonText}>Crear Publicación</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

          {activeTab === 'eventos' && (
            <View style={styles.eventsContainer}>
              {events.length > 0 ? (
                events.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.eventCard}
                    onPress={() => handleVerEvento(event.id)}
                    activeOpacity={0.8}
                  >
                    {event.imagen_url && (
                      <Image source={{ uri: event.imagen_url }} style={styles.eventImage} />
                    )}
                    <View style={styles.eventContent}>
                      <Text style={styles.eventTitle}>{event.titulo}</Text>
                      <View style={styles.eventMeta}>
                        <IconSymbol name="calendar" size={14} color={colors.textSecondary} />
                        <Text style={styles.eventMetaText}>
                          {new Date(event.fecha).toLocaleDateString('es-ES', { 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                        </Text>
                        <IconSymbol name="clock" size={14} color={colors.textSecondary} />
                        <Text style={styles.eventMetaText}>{event.hora}</Text>
                      </View>
                      {event.precio !== null && event.precio !== undefined && (
                        <Text style={styles.eventPrice}>
                          {event.precio === 0 ? 'Gratis' : `${event.precio}€`}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <IconSymbol name="calendar" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>
                    {isOwner ? 'Crea tu primer evento' : 'No hay eventos próximos'}
                  </Text>
                  {isOwner && (
                    <TouchableOpacity style={styles.emptyButton} onPress={handleCrearEvento}>
                      <Text style={styles.emptyButtonText}>Crear Evento</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

          {activeTab === 'empleo' && (
            <View style={styles.empleoContainer}>
              {/* Sub-tabs for Empleo */}
              <View style={styles.empleoSubTabs}>
                <TouchableOpacity
                  style={[styles.empleoSubTab, empleoSubTab === 'ofertas' && styles.empleoSubTabActive]}
                  onPress={() => setEmpleoSubTab('ofertas')}
                >
                  <Text style={[styles.empleoSubTabText, empleoSubTab === 'ofertas' && styles.empleoSubTabTextActive]}>
                    Ofertas de Empleo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.empleoSubTab, empleoSubTab === 'demandantes' && styles.empleoSubTabActive]}
                  onPress={() => setEmpleoSubTab('demandantes')}
                >
                  <Text style={[styles.empleoSubTabText, empleoSubTab === 'demandantes' && styles.empleoSubTabTextActive]}>
                    Demandantes
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Filters */}
              <View style={styles.filtersContainer}>
                <View style={styles.searchContainer}>
                  <IconSymbol name="magnifyingglass" size={18} color={colors.textSecondary} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={empleoSubTab === 'ofertas' ? 'Buscar por puesto...' : 'Buscar por nombre o puesto...'}
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <IconSymbol name="xmark.circle.fill" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.provinciaFilter}
                  onPress={() => {
                    console.log('[LocalPerfil] Opening provincia modal, PROVINCIAS count:', PROVINCIAS.length);
                    setShowProvinciaModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <IconSymbol name="location.fill" size={18} color={selectedProvincia ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.provinciaFilterText, selectedProvincia && styles.provinciaFilterTextActive]}>
                    {selectedProvincia || 'Provincia'}
                  </Text>
                  <IconSymbol name="chevron.down" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Active filters display */}
              {(searchQuery || selectedProvincia) && (
                <View style={styles.activeFilters}>
                  {searchQuery && (
                    <View style={styles.activeFilterChip}>
                      <Text style={styles.activeFilterText}>Búsqueda: {searchQuery}</Text>
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <IconSymbol name="xmark" size={12} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  )}
                  {selectedProvincia && (
                    <View style={styles.activeFilterChip}>
                      <Text style={styles.activeFilterText}>{selectedProvincia}</Text>
                      <TouchableOpacity onPress={() => setSelectedProvincia(null)}>
                        <IconSymbol name="xmark" size={12} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.clearFiltersButton}
                    onPress={() => {
                      setSearchQuery('');
                      setSelectedProvincia(null);
                    }}
                  >
                    <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Content */}
              {loadingEmpleo ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Cargando...</Text>
                </View>
              ) : (
                <>
                  {empleoSubTab === 'ofertas' && (
                    <View style={styles.empleoList}>
                      {ofertasTrabajo.length > 0 ? (
                        ofertasTrabajo.map((oferta) => (
                          <OfertaTrabajoCard
                            key={oferta.id}
                            empleo={{
                              id: oferta.id,
                              localId: oferta.local_id || '',
                              titulo: oferta.titulo,
                              descripcion: oferta.descripcion,
                              tipo: oferta.tipo,
                              salario: oferta.salario,
                              localNombre: oferta.locales?.nombre || 'Local',
                              fechaPublicacion: oferta.created_at,
                              provincia: oferta.provincia || '',
                            }}
                            onPress={() => handleVerOferta(oferta.id)}
                          />
                        ))
                      ) : (
                        <View style={styles.emptyState}>
                          <IconSymbol name="briefcase" size={48} color={colors.textSecondary} />
                          <Text style={styles.emptyText}>
                            {isOwner ? 'Publica tu primera oferta de empleo' : 'No hay ofertas disponibles'}
                          </Text>
                          {isOwner && (
                            <TouchableOpacity style={styles.emptyButton} onPress={handleCrearOferta}>
                              <Text style={styles.emptyButtonText}>Crear Oferta</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  )}

                  {empleoSubTab === 'demandantes' && (
                    <View style={styles.empleoList}>
                      {perfilesProfesionales.length > 0 ? (
                        perfilesProfesionales.map((perfil) => (
                          <PerfilProfesionalCard
                            key={perfil.id}
                            perfil={{
                              id: perfil.id,
                              nombre: perfil.nombre_completo,
                              avatar: perfil.foto_url,
                              puesto: perfil.puesto_deseado,
                              experiencia: perfil.experiencia,
                              ubicacion: perfil.provincia || 'No especificada',
                              habilidades: perfil.habilidades ? perfil.habilidades.split(',').map(h => h.trim()) : [],
                              disponibilidad: perfil.disponibilidad || 'Disponible',
                            }}
                            onPress={() => handleVerPerfil(perfil.id)}
                          />
                        ))
                      ) : (
                        <View style={styles.emptyState}>
                          <IconSymbol name="person.2" size={48} color={colors.textSecondary} />
                          <Text style={styles.emptyText}>No hay demandantes de empleo</Text>
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {activeTab === 'info' && (
            <View style={styles.infoContainer}>
              {local.descripcion_google && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>Descripción</Text>
                  <Text style={styles.infoText}>{local.descripcion_google}</Text>
                </View>
              )}

              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Contacto</Text>
                {local.telefono && (
                  <TouchableOpacity style={styles.infoRow} onPress={handleLlamar}>
                    <IconSymbol name="phone.fill" size={20} color={colors.primary} />
                    <Text style={styles.infoRowText}>{local.telefono}</Text>
                  </TouchableOpacity>
                )}
                {local.email && (
                  <View style={styles.infoRow}>
                    <IconSymbol name="envelope.fill" size={20} color={colors.primary} />
                    <Text style={styles.infoRowText}>{local.email}</Text>
                  </View>
                )}
                {local.website && (
                  <TouchableOpacity style={styles.infoRow} onPress={handleWeb}>
                    <IconSymbol name="globe" size={20} color={colors.primary} />
                    <Text style={styles.infoRowText}>{local.website}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {local.horarios_completos && Object.keys(local.horarios_completos).length > 0 && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>Horarios</Text>
                  {Object.entries(local.horarios_completos).map(([dia, horas]: [string, any]) => (
                    <View key={dia} style={styles.horarioRow}>
                      <Text style={styles.horarioDia}>{dia.charAt(0).toUpperCase() + dia.slice(1)}</Text>
                      <Text style={styles.horarioHoras}>
                        {Array.isArray(horas) ? horas.join(', ') : horas}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {local.servicios_disponibles && Object.keys(local.servicios_disponibles).length > 0 && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>Servicios</Text>
                  <View style={styles.servicesGrid}>
                    {Object.entries(local.servicios_disponibles)
                      .filter(([_, value]) => value === true)
                      .map(([key]) => (
                        <View key={key} style={styles.serviceBadge}>
                          <Text style={styles.serviceText}>
                            {key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.replace(/_/g, ' ').slice(1)}
                          </Text>
                        </View>
                      ))}
                  </View>
                </View>
              )}

              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Ubicación</Text>
                <TouchableOpacity style={styles.directionsButton} onPress={handleComoLlegar}>
                  <IconSymbol name="map.fill" size={20} color={colors.white} />
                  <Text style={styles.directionsButtonText}>Cómo llegar</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Sala Virtual</Text>
                <TouchableOpacity style={styles.virtualRoomButton} onPress={handleSalaVirtual}>
                  <IconSymbol name="person.3.fill" size={20} color={colors.white} />
                  <Text style={styles.virtualRoomButtonText}>Entrar a la Sala Virtual</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoSection}>
                <TouchableOpacity 
                  style={styles.moreInfoButton} 
                  onPress={() => router.push(`/detalle/local?id=${localId}`)}
                >
                  <IconSymbol name="info.circle.fill" size={20} color={colors.primary} />
                  <Text style={styles.moreInfoButtonText}>Ver información completa</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Story Viewer Modal */}
      <Modal
        visible={showStoryViewer}
        animationType="fade"
        onRequestClose={async () => {
          const currentStory = localStories[currentStoryIndex];
          
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
              console.error('[LocalPerfil] Error marking story as viewed on modal close:', error);
            }
          }
          
          await loadLocalData();
          setShowStoryViewer(false);
          stopStoryTimer();
        }}
      >
        <View style={styles.storyViewerModal}>
          {currentStory && (
            <>
              <View style={styles.storyViewerHeader}>
                <View style={styles.storyProgressContainer}>
                  {localStories.map((_, index) => (
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
                  {local.imagen_url ? (
                    <Image source={{ uri: local.imagen_url }} style={styles.storyAutorAvatar} />
                  ) : (
                    <View style={[styles.storyAutorAvatar, styles.avatarPlaceholder]}>
                      <IconSymbol name="building.2" size={18} color={colors.headerText} />
                    </View>
                  )}
                  <Text style={styles.storyAutorNombre}>{local.nombre}</Text>
                  <TouchableOpacity
                    style={styles.storyCloseButton}
                    onPress={async () => {
                      const currentStory = localStories[currentStoryIndex];
                      
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
                          console.error('[LocalPerfil] Error marking story as viewed on close:', error);
                        }
                      }
                      
                      await loadLocalData();
                      setShowStoryViewer(false);
                      stopStoryTimer();
                    }}
                    activeOpacity={0.8}
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

              {/* Bottom-left controls for owner stories */}
              {isOwner && (
                <View style={styles.storyBottomLeftControls}>
                  <TouchableOpacity
                    style={styles.storyStatsButtonBottom}
                    onPress={handleViewStoryStats}
                    activeOpacity={0.8}
                  >
                    <IconSymbol name="eye.fill" size={24} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.storyDeleteButtonBottom}
                    onPress={handleDeleteStory}
                    activeOpacity={0.8}
                  >
                    <IconSymbol name="trash.fill" size={24} color="#fff" />
                  </TouchableOpacity>
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

              {/* Stats Modal - Rendered INSIDE the story viewer */}
              <StoryStatsModal
                visible={showStoryStats}
                onClose={() => {
                  setShowStoryStats(false);
                  setIsPaused(false);
                  startStoryTimer();
                }}
                storyId={currentStory.id}
                viewsCount={currentStory.views_count || 0}
                likesCount={currentStory.likes_count || 0}
                views={storyViews}
                likes={storyLikes}
                loading={loadingStats}
              />
            </>
          )}
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
              <Text style={styles.createOptionsTitle}>Publicar</Text>
              <TouchableOpacity onPress={() => setShowCreateOptions(false)} activeOpacity={0.8}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.createOptionsButtons}>
              <TouchableOpacity
                style={styles.createOptionButton}
                onPress={() => {
                  setShowCreateOptions(false);
                  handleCrearHistoria();
                }}
                activeOpacity={0.8}
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
                  handleCrearPost();
                }}
                activeOpacity={0.8}
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

      {/* Provincia Filter Modal - FIXED VERSION */}
      <Modal
        visible={showProvinciaModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProvinciaModal(false)}
      >
        <View style={styles.provinciaModalOverlay}>
          <Pressable 
            style={styles.provinciaModalBackdrop}
            onPress={() => setShowProvinciaModal(false)}
          />
          <View style={styles.provinciaModalContent}>
            <View style={styles.provinciaModalHeader}>
              <Text style={styles.provinciaModalTitle}>Seleccionar Provincia</Text>
              <TouchableOpacity 
                onPress={() => setShowProvinciaModal(false)} 
                activeOpacity={0.8}
              >
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {selectedProvincia && (
              <TouchableOpacity
                style={styles.clearProvinciaButton}
                onPress={() => {
                  setSelectedProvincia(null);
                  setShowProvinciaModal(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.clearProvinciaText}>Limpiar filtro</Text>
              </TouchableOpacity>
            )}

            <ScrollView 
              style={styles.provinciaList}
              contentContainerStyle={styles.provinciaListContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {PROVINCIAS.map((provincia, index) => (
                <TouchableOpacity
                  key={`provincia-${index}-${provincia}`}
                  style={[
                    styles.provinciaItem,
                    selectedProvincia === provincia && styles.provinciaItemSelected
                  ]}
                  onPress={() => {
                    console.log('[LocalPerfil] Selected provincia:', provincia);
                    setSelectedProvincia(provincia);
                    setShowProvinciaModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.provinciaItemText,
                    selectedProvincia === provincia && styles.provinciaItemTextSelected
                  ]}>
                    {provincia}
                  </Text>
                  {selectedProvincia === provincia && (
                    <IconSymbol name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ProfileSwitcher
        visible={showProfileSwitcher}
        onClose={() => setShowProfileSwitcher(false)}
      />

      <FloatingTabBar 
        tabs={tabs} 
        containerWidth={width}
        key={`${user?.rol_app || 'cliente'}-${currentMode}-${isOwner}-${activeProfileType}-${activeProfileId}-${localId}-v${SCREEN_VERSION}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fixedHeader: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  switchProfileButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  profileHeaderGradient: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  coverPhotoContainer: {
    width: '100%',
    height: 140,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  profileSection: {
    paddingTop: 0,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 20,
  },
  storyRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 48,
    zIndex: 0,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: colors.headerText,
    zIndex: 1,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addStoryIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.headerGradientStart,
    zIndex: 2,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 8,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  categoryIcon: {
    fontSize: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.headerText,
    textTransform: 'capitalize',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  addressText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.headerText,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingVertical: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statDivider: {
    width: 1,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
  },
  createButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  actionButtonFollowing: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.headerText,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  content: {
    flex: 1,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    backgroundColor: colors.cardBorder,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
    borderRadius: 4,
  },
  gridImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    width: '100%',
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  eventsContainer: {
    padding: 16,
    gap: 16,
  },
  eventCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  eventImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.cardBorder,
  },
  eventContent: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  eventMetaText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  eventPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  empleoContainer: {
    flex: 1,
  },
  empleoSubTabs: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  empleoSubTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  empleoSubTabActive: {
    borderBottomColor: colors.primary,
  },
  empleoSubTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  empleoSubTabTextActive: {
    color: colors.primary,
  },
  filtersContainer: {
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  provinciaFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  provinciaFilterText: {
    flex: 1,
    fontSize: 15,
    color: colors.textSecondary,
  },
  provinciaFilterTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    paddingTop: 0,
    gap: 8,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  activeFilterText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearFiltersText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  empleoList: {
    padding: 16,
  },
  infoContainer: {
    padding: 16,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  infoRowText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  horarioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  horarioDia: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  horarioHoras: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  serviceText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  directionsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  virtualRoomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  virtualRoomButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  moreInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  moreInfoButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
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
    paddingTop: 50,
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
  storyBottomLeftControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 16,
    flexDirection: 'row',
    gap: 16,
    zIndex: 10,
  },
  storyStatsButtonBottom: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyDeleteButtonBottom: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createOptionsModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  createOptionsContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 34,
  },
  createOptionsHeader: {
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  createOptionsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  createOptionsButtons: {
    padding: 20,
    gap: 16,
  },
  createOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  createOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  createOptionInfo: {
    flex: 1,
  },
  createOptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  createOptionDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  provinciaModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  provinciaModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  provinciaModalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: height * 0.75,
    paddingBottom: 34,
  },
  provinciaModalHeader: {
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  provinciaModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  clearProvinciaButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  clearProvinciaText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  provinciaList: {
    flex: 1,
  },
  provinciaListContent: {
    paddingBottom: 20,
  },
  provinciaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  provinciaItemSelected: {
    backgroundColor: colors.primary + '10',
  },
  provinciaItemText: {
    fontSize: 16,
    color: colors.text,
  },
  provinciaItemTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
});
