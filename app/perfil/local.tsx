
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

const { width, height } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 4) / 3;

const PUESTOS_LABORALES = [
  'Todos',
  'Camarero/a',
  'Cocinero/a',
  'Ayudante de cocina',
  'Barman/Coctelero/a',
  'DJ',
  'Bailarín/a',
  'Go-go',
  'Metre/Jefe de sala',
  'Relaciones Públicas',
  'Seguridad',
  'Personal de Limpieza',
];

const PROVINCIAS = [
  'Todas',
  'A Coruña',
  'Álava',
  'Albacete',
  'Alicante',
  'Almería',
  'Asturias',
  'Ávila',
  'Badajoz',
  'Barcelona',
  'Burgos',
  'Cáceres',
  'Cádiz',
  'Cantabria',
  'Castellón',
  'Ceuta',
  'Ciudad Real',
  'Córdoba',
  'Cuenca',
  'Girona',
  'Granada',
  'Guadalajara',
  'Guipúzcoa',
  'Huelva',
  'Huesca',
  'Islas Baleares',
  'Jaén',
  'La Rioja',
  'Las Palmas',
  'León',
  'Lleida',
  'Lugo',
  'Madrid',
  'Málaga',
  'Melilla',
  'Murcia',
  'Navarra',
  'Ourense',
  'Palencia',
  'Pontevedra',
  'Salamanca',
  'Santa Cruz de Tenerife',
  'Segovia',
  'Sevilla',
  'Soria',
  'Tarragona',
  'Teruel',
  'Toledo',
  'Valencia',
  'Valladolid',
  'Vizcaya',
  'Zamora',
  'Zaragoza',
];

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
  requisitos?: string[];
  provincia?: string;
  imagen_url?: string;
  created_at: string;
  local_id: string;
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
  created_at: string;
  usuario?: {
    nombre: string;
    avatar?: string;
    username?: string;
  };
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
  const [ofertas, setOfertas] = useState<OfertaTrabajo[]>([]);
  const [demandantes, setDemandantes] = useState<PerfilProfesional[]>([]);
  const [isFavorito, setIsFavorito] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'eventos' | 'empleo' | 'info'>('posts');
  const [empleoSubTab, setEmpleoSubTab] = useState<'ofertas' | 'demandantes'>('ofertas');

  // Filters for demandantes
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [puestoFiltro, setPuestoFiltro] = useState('Todos');
  const [provinciaFiltro, setProvinciaFiltro] = useState('Todas');
  const [showProvinciaDropdown, setShowProvinciaDropdown] = useState(false);
  
  // Infinite scroll state
  const [demandantesPage, setDemandantesPage] = useState(1);
  const [ofertasPage, setOfertasPage] = useState(1);
  const [hasMoreDemandantes, setHasMoreDemandantes] = useState(true);
  const [hasMoreOfertas, setHasMoreOfertas] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const ITEMS_PER_PAGE = 20;

  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [localStories, setLocalStories] = useState<LocalStory[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const storyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);

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
    const R = 6371; // Earth's radius in km
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

      if (user && localData.propietario_id === user.id) {
        setIsOwner(true);
        console.log('[LocalPerfil] ✅ User is owner of this local');
      } else {
        setIsOwner(false);
        console.log('[LocalPerfil] ✅ User is viewing another local');
      }

      // Load all content in parallel to avoid loading states when switching tabs
      const [postsResult, eventsResult, ofertasResult, demandantesResult, storiesResult, favResult] = await Promise.all([
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
          .from('ofertas_trabajo')
          .select('*')
          .eq('local_id', localId)
          .eq('activo', true)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('perfiles_profesionales')
          .select(`
            *,
            usuario:usuarios(nombre, avatar, username)
          `)
          .eq('activo', true)
          .order('created_at', { ascending: false }),
        
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

      if (!ofertasResult.error) {
        console.log('[LocalPerfil] ✅ Loaded', ofertasResult.data?.length || 0, 'job offers for local');
        const initialOfertas = (ofertasResult.data || []).slice(0, ITEMS_PER_PAGE);
        setOfertas(initialOfertas);
        setHasMoreOfertas((ofertasResult.data || []).length > ITEMS_PER_PAGE);
        setOfertasPage(1);
      }

      if (!demandantesResult.error && demandantesResult.data) {
        console.log('[LocalPerfil] ✅ Loaded', demandantesResult.data.length, 'professional profiles');
        
        // Sort by proximity if local has coordinates
        let sortedDemandantes = demandantesResult.data;
        if (localData.latitud && localData.longitud) {
          sortedDemandantes = demandantesResult.data.map(d => {
            // For now, we'll use a placeholder distance calculation
            // In a real app, you'd need to get user locations or use provincia as proxy
            return {
              ...d,
              distancia: Math.random() * 100, // Placeholder - replace with actual distance
            };
          }).sort((a, b) => a.distancia - b.distancia);
        }
        
        const initialDemandantes = sortedDemandantes.slice(0, ITEMS_PER_PAGE);
        setDemandantes(initialDemandantes);
        setHasMoreDemandantes(sortedDemandantes.length > ITEMS_PER_PAGE);
        setDemandantesPage(1);
        setContentLoaded(prev => ({ ...prev, empleo: true }));
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

  useEffect(() => {
    loadLocalData();
  }, [loadLocalData, localId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLocalData();
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

  const handleEditarOferta = (ofertaId: string) => {
    // Navigate to edit offer screen (to be implemented)
    Alert.alert('Editar Oferta', 'Funcionalidad de edición en desarrollo');
  };

  const handleEliminarOferta = async (ofertaId: string) => {
    Alert.alert(
      'Eliminar Oferta',
      '¿Estás seguro de que quieres eliminar esta oferta de trabajo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('ofertas_trabajo')
                .update({ activo: false })
                .eq('id', ofertaId);

              if (error) throw error;

              Alert.alert('Éxito', 'Oferta eliminada correctamente');
              await loadLocalData();
            } catch (error) {
              console.error('[LocalPerfil] Error deleting offer:', error);
              Alert.alert('Error', 'No se pudo eliminar la oferta');
            }
          },
        },
      ]
    );
  };

  const handleContactarDemandante = async (perfilId: string, usuarioId: string) => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión');
      return;
    }

    if (!usuarioId) {
      Alert.alert('Error', 'No se pudo obtener la información del usuario');
      return;
    }

    try {
      console.log('[LocalPerfil] Contacting applicant:', perfilId, 'User:', usuarioId);

      const { data: chatExistente, error: chatError } = await supabase
        .from('chats')
        .select('id')
        .or(`and(usuario1_id.eq.${user.id},usuario2_id.eq.${usuarioId}),and(usuario1_id.eq.${usuarioId},usuario2_id.eq.${user.id})`)
        .maybeSingle();

      if (chatError && chatError.code !== 'PGRST116') {
        console.error('[LocalPerfil] Error checking chat:', chatError);
        throw chatError;
      }

      let chatId = chatExistente?.id;

      if (!chatId) {
        console.log('[LocalPerfil] Creating new chat...');
        const { data: nuevoChat, error: nuevoChatError } = await supabase
          .from('chats')
          .insert({
            usuario1_id: user.id,
            usuario2_id: usuarioId,
          })
          .select()
          .single();

        if (nuevoChatError) {
          console.error('[LocalPerfil] Error creating chat:', nuevoChatError);
          throw nuevoChatError;
        }
        chatId = nuevoChat.id;
        console.log('[LocalPerfil] Chat created:', chatId);
      } else {
        console.log('[LocalPerfil] Existing chat found:', chatId);
      }

      const { error: interesError } = await supabase
        .from('intereses_empleo')
        .insert({
          perfil_id: perfilId,
          propietario_id: user.id,
          estado: 'pendiente',
        });

      if (interesError && !interesError.message.includes('duplicate')) {
        console.error('[LocalPerfil] Error registering interest:', interesError);
      } else {
        console.log('[LocalPerfil] Interest registered successfully');
      }

      const { error: notifError } = await supabase
        .from('notificaciones')
        .insert({
          usuario_id: usuarioId,
          tipo: 'sistema',
          titulo: 'Interés en tu perfil profesional',
          mensaje: `${local.nombre} está interesado en tu perfil. Revisa tus mensajes.`,
          usuario_origen_id: user.id,
        });

      if (notifError) {
        console.error('[LocalPerfil] Error creating notification:', notifError);
      } else {
        console.log('[LocalPerfil] Notification created successfully');
      }

      Alert.alert(
        'Mensaje Enviado',
        'Se ha enviado una notificación al profesional. Puedes continuar la conversación en tus chats.',
        [
          { text: 'Ver Chats', onPress: () => router.push('/(tabs)/perfil/chats') },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('[LocalPerfil] Error contacting applicant:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje. Intenta de nuevo.');
    }
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
      Alert.alert('Error', 'Solo el propietario puede crear ofertas de empleo');
      return;
    }
    
    console.log('[LocalPerfil] Setting interaction state for creating job offer');
    await switchToLocalProfile(localId);
    await setCurrentMode('propietario');
    
    router.push('/crear/oferta-trabajo');
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

  useEffect(() => {
    if (showStoryViewer && !isPaused) {
      startStoryTimer();
    }
    return () => {
      stopStoryTimer();
    };
  }, [showStoryViewer, currentStoryIndex, isPaused, startStoryTimer, stopStoryTimer]);

  const getTabsForRole = (): TabBarItem[] => {
    const userRole = user?.rol_app || 'cliente';

    if (userRole === 'admin' && currentMode === 'admin') {
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

  const calcularDiasPublicado = (fecha: string): number => {
    const fechaPublicacion = new Date(fecha);
    const hoy = new Date();
    const diff = hoy.getTime() - fechaPublicacion.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const limpiarFiltros = () => {
    setPuestoFiltro('Todos');
    setProvinciaFiltro('Todas');
    setSearchQuery('');
  };

  const loadMoreDemandantes = useCallback(async () => {
    if (loadingMore || !hasMoreDemandantes) return;

    setLoadingMore(true);
    try {
      const { data, error } = await supabase
        .from('perfiles_profesionales')
        .select(`
          *,
          usuario:usuarios(nombre, avatar, username)
        `)
        .eq('activo', true)
        .order('created_at', { ascending: false })
        .range(demandantesPage * ITEMS_PER_PAGE, (demandantesPage + 1) * ITEMS_PER_PAGE - 1);

      if (!error && data) {
        setDemandantes(prev => [...prev, ...data]);
        setDemandantesPage(prev => prev + 1);
        setHasMoreDemandantes(data.length === ITEMS_PER_PAGE);
      }
    } catch (error) {
      console.error('[LocalPerfil] Error loading more demandantes:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMoreDemandantes, demandantesPage]);

  const loadMoreOfertas = useCallback(async () => {
    if (loadingMore || !hasMoreOfertas) return;

    setLoadingMore(true);
    try {
      const { data, error } = await supabase
        .from('ofertas_trabajo')
        .select('*')
        .eq('local_id', localId)
        .eq('activo', true)
        .order('created_at', { ascending: false })
        .range(ofertasPage * ITEMS_PER_PAGE, (ofertasPage + 1) * ITEMS_PER_PAGE - 1);

      if (!error && data) {
        setOfertas(prev => [...prev, ...data]);
        setOfertasPage(prev => prev + 1);
        setHasMoreOfertas(data.length === ITEMS_PER_PAGE);
      }
    } catch (error) {
      console.error('[LocalPerfil] Error loading more ofertas:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMoreOfertas, ofertasPage, localId]);

  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

    if (isCloseToBottom && activeTab === 'empleo') {
      if (empleoSubTab === 'demandantes') {
        loadMoreDemandantes();
      } else if (empleoSubTab === 'ofertas') {
        loadMoreOfertas();
      }
    }
  }, [activeTab, empleoSubTab, loadMoreDemandantes, loadMoreOfertas]);

  // Filter demandantes
  const demandantesFiltrados = demandantes.filter((perfil) => {
    const matchBusqueda = perfil.nombre_completo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          perfil.puesto_deseado.toLowerCase().includes(searchQuery.toLowerCase());
    const matchProvincia = provinciaFiltro === 'Todas' || perfil.provincia === provinciaFiltro;
    const matchPuesto = puestoFiltro === 'Todos' || perfil.puesto_deseado.includes(puestoFiltro);
    
    return matchBusqueda && matchProvincia && matchPuesto;
  });

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

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={400}
      >
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{local.nombre}</Text>
            {isOwner && (user?.rol_app === 'propietario' || ownedLocals.length > 0) && (
              <TouchableOpacity 
                style={styles.switchProfileButton}
                onPress={() => setShowProfileSwitcher(true)}
                activeOpacity={0.8}
              >
                <IconSymbol name="arrow.triangle.2.circlepath" size={24} color={colors.headerText} />
              </TouchableOpacity>
            )}
            {!isOwner && <View style={styles.headerButton} />}
          </View>

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
                    colors={[colors.primary, colors.secondary]}
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
              name="briefcase" 
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
                    Mis Ofertas ({ofertas.length})
                  </Text>
                </TouchableOpacity>
                {isOwner && (
                  <TouchableOpacity
                    style={[styles.empleoSubTab, empleoSubTab === 'demandantes' && styles.empleoSubTabActive]}
                    onPress={() => setEmpleoSubTab('demandantes')}
                  >
                    <Text style={[styles.empleoSubTabText, empleoSubTab === 'demandantes' && styles.empleoSubTabTextActive]}>
                      Demandantes ({demandantesFiltrados.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {empleoSubTab === 'ofertas' ? (
                <>
                  {ofertas.length > 0 ? (
                    ofertas.map((oferta) => {
                      const diasPublicado = calcularDiasPublicado(oferta.created_at);
                      return (
                        <View key={oferta.id} style={styles.ofertaCard}>
                          {oferta.imagen_url && (
                            <Image 
                              source={{ uri: oferta.imagen_url }} 
                              style={styles.ofertaImagen}
                              resizeMode="cover"
                            />
                          )}
                          <View style={styles.ofertaContent}>
                            <View style={styles.ofertaHeader}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.ofertaTitulo}>{oferta.titulo}</Text>
                                <Text style={styles.ofertaTipo}>{oferta.tipo}</Text>
                              </View>
                              {diasPublicado < 7 && (
                                <View style={styles.badgeNuevo}>
                                  <Text style={styles.badgeNuevoText}>Nuevo</Text>
                                </View>
                              )}
                            </View>

                            <Text style={styles.ofertaDescripcion} numberOfLines={2}>
                              {oferta.descripcion}
                            </Text>

                            <View style={styles.ofertaDetalles}>
                              {oferta.salario && (
                                <View style={styles.detalleChip}>
                                  <IconSymbol name="eurosign.circle" size={14} color={colors.primary} />
                                  <Text style={styles.detalleTexto}>{oferta.salario}</Text>
                                </View>
                              )}
                              {oferta.provincia && (
                                <View style={styles.detalleChip}>
                                  <IconSymbol name="mappin" size={14} color={colors.primary} />
                                  <Text style={styles.detalleTexto}>{oferta.provincia}</Text>
                                </View>
                              )}
                            </View>

                            {oferta.requisitos && oferta.requisitos.length > 0 && (
                              <View style={styles.requisitosContainer}>
                                {oferta.requisitos.slice(0, 2).map((requisito, index) => (
                                  <View key={index} style={styles.requisitoChip}>
                                    <Text style={styles.requisitoTexto}>{requisito}</Text>
                                  </View>
                                ))}
                              </View>
                            )}

                            <View style={styles.ofertaFooter}>
                              <Text style={styles.fechaTexto}>
                                Publicado hace {diasPublicado} {diasPublicado === 1 ? 'día' : 'días'}
                              </Text>
                              <View style={styles.ofertaActions}>
                                <TouchableOpacity 
                                  style={styles.verMasButton}
                                  onPress={() => handleVerOferta(oferta.id)}
                                >
                                  <Text style={styles.verMasTexto}>Ver</Text>
                                </TouchableOpacity>
                                {isOwner && (
                                  <>
                                    <TouchableOpacity 
                                      style={[styles.verMasButton, styles.editButton]}
                                      onPress={() => handleEditarOferta(oferta.id)}
                                    >
                                      <IconSymbol name="pencil" size={14} color={colors.white} />
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                      style={[styles.verMasButton, styles.deleteButton]}
                                      onPress={() => handleEliminarOferta(oferta.id)}
                                    >
                                      <IconSymbol name="trash" size={14} color={colors.white} />
                                    </TouchableOpacity>
                                  </>
                                )}
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.emptyState}>
                      <IconSymbol name="briefcase" size={48} color={colors.textSecondary} />
                      <Text style={styles.emptyText}>
                        {isOwner ? 'Crea tu primera oferta de empleo' : 'No hay ofertas de empleo'}
                      </Text>
                      {isOwner && (
                        <TouchableOpacity style={styles.emptyButton} onPress={handleCrearOferta}>
                          <Text style={styles.emptyButtonText}>Crear Oferta</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </>
              ) : (
                <>
                  {/* Search and filters for demandantes */}
                  <View style={styles.searchContainer}>
                    <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Buscar por nombre o puesto..."
                      placeholderTextColor={colors.textSecondary}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    <TouchableOpacity onPress={() => setShowFilters(true)}>
                      <IconSymbol name="slider.horizontal.3" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  </View>

                  {/* Active filters display */}
                  {(puestoFiltro !== 'Todos' || provinciaFiltro !== 'Todas') && (
                    <View style={styles.activeFilters}>
                      {puestoFiltro !== 'Todos' && (
                        <View style={styles.activeFilterChip}>
                          <Text style={styles.activeFilterText}>{puestoFiltro}</Text>
                          <TouchableOpacity onPress={() => setPuestoFiltro('Todos')}>
                            <IconSymbol name="xmark.circle.fill" size={16} color={colors.primary} />
                          </TouchableOpacity>
                        </View>
                      )}
                      {provinciaFiltro !== 'Todas' && (
                        <View style={styles.activeFilterChip}>
                          <Text style={styles.activeFilterText}>{provinciaFiltro}</Text>
                          <TouchableOpacity onPress={() => setProvinciaFiltro('Todas')}>
                            <IconSymbol name="xmark.circle.fill" size={16} color={colors.primary} />
                          </TouchableOpacity>
                        </View>
                      )}
                      <TouchableOpacity onPress={limpiarFiltros}>
                        <Text style={styles.clearFiltersText}>Limpiar todo</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Demandantes list */}
                  {demandantesFiltrados.length > 0 ? (
                    demandantesFiltrados.map((perfil) => {
                      const diasPublicado = calcularDiasPublicado(perfil.created_at);
                      const fotoUrl = perfil.foto_url || perfil.usuario?.avatar;

                      return (
                        <TouchableOpacity
                          key={perfil.id}
                          style={styles.demandanteCard}
                          onPress={() => handleVerPerfil(perfil.id)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.demandanteHeader}>
                            {fotoUrl ? (
                              <Image 
                                source={{ uri: fotoUrl }} 
                                style={styles.demandanteFoto}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.demandanteFotoPlaceholder}>
                                <IconSymbol name="person.circle" size={40} color={colors.textSecondary} />
                              </View>
                            )}
                            
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={styles.demandanteNombre}>{perfil.nombre_completo}</Text>
                              <Text style={styles.demandantePuesto}>{perfil.puesto_deseado}</Text>
                              {perfil.provincia && (
                                <View style={styles.demandanteUbicacion}>
                                  <IconSymbol name="mappin" size={12} color={colors.textSecondary} />
                                  <Text style={styles.demandanteUbicacionText}>{perfil.provincia}</Text>
                                </View>
                              )}
                            </View>

                            {diasPublicado < 7 && (
                              <View style={styles.badgeNuevo}>
                                <Text style={styles.badgeNuevoText}>Nuevo</Text>
                              </View>
                            )}
                          </View>

                          <Text style={styles.demandanteExperiencia} numberOfLines={2}>
                            {perfil.experiencia}
                          </Text>

                          {perfil.habilidades && (
                            <View style={styles.demandanteHabilidades}>
                              {perfil.habilidades.split(',').slice(0, 3).map((habilidad, index) => (
                                <View key={index} style={styles.habilidadChip}>
                                  <Text style={styles.habilidadTexto}>{habilidad.trim()}</Text>
                                </View>
                              ))}
                            </View>
                          )}

                          <View style={styles.demandanteFooter}>
                            <Text style={styles.fechaTexto}>
                              Publicado hace {diasPublicado} {diasPublicado === 1 ? 'día' : 'días'}
                            </Text>
                            {perfil.usuario_id && (
                              <TouchableOpacity 
                                style={styles.contactarButton}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleContactarDemandante(perfil.id, perfil.usuario_id!);
                                }}
                              >
                                <IconSymbol name="paperplane.fill" size={14} color={colors.white} />
                                <Text style={styles.contactarTexto}>Contactar</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <View style={styles.emptyState}>
                      <IconSymbol name="person.2" size={48} color={colors.textSecondary} />
                      <Text style={styles.emptyText}>
                        No se encontraron demandantes de empleo
                      </Text>
                      {(puestoFiltro !== 'Todos' || provinciaFiltro !== 'Todas' || searchQuery) && (
                        <TouchableOpacity style={styles.emptyButton} onPress={limpiarFiltros}>
                          <Text style={styles.emptyButtonText}>Limpiar Filtros</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* Loading indicator for infinite scroll */}
                  {loadingMore && (
                    <View style={styles.loadingMoreContainer}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.loadingMoreText}>Cargando más...</Text>
                    </View>
                  )}

                  {/* End of list indicator */}
                  {!hasMoreDemandantes && demandantesFiltrados.length > 0 && empleoSubTab === 'demandantes' && (
                    <View style={styles.endOfListContainer}>
                      <Text style={styles.endOfListText}>No hay más demandantes</Text>
                    </View>
                  )}
                  {!hasMoreOfertas && ofertas.length > 0 && empleoSubTab === 'ofertas' && (
                    <View style={styles.endOfListContainer}>
                      <Text style={styles.endOfListText}>No hay más ofertas</Text>
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

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Puesto Laboral</Text>
                <View style={styles.filterChips}>
                  {PUESTOS_LABORALES.map((puesto) => (
                    <TouchableOpacity
                      key={puesto}
                      style={[
                        styles.filterChip,
                        puestoFiltro === puesto && styles.filterChipActive,
                      ]}
                      onPress={() => setPuestoFiltro(puesto)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          puestoFiltro === puesto && styles.filterChipTextActive,
                        ]}
                      >
                        {puesto}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Provincia</Text>
                <TouchableOpacity
                  style={styles.provinciaDropdownButton}
                  onPress={() => setShowProvinciaDropdown(true)}
                >
                  <Text style={styles.provinciaDropdownText}>{provinciaFiltro}</Text>
                  <IconSymbol name="chevron.down" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.limpiarButton}
                onPress={limpiarFiltros}
              >
                <Text style={styles.limpiarButtonText}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.aplicarButtonModal}
                onPress={() => setShowFilters(false)}
              >
                <LinearGradient
                  colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                  style={styles.aplicarButtonGradient}
                >
                  <Text style={styles.aplicarButtonText}>Aplicar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Provincia Dropdown Modal */}
      <Modal
        visible={showProvinciaDropdown}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProvinciaDropdown(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowProvinciaDropdown(false)}
        >
          <Pressable 
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Provincia</Text>
              <TouchableOpacity onPress={() => setShowProvinciaDropdown(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.provinciaList}>
              {PROVINCIAS.map((provincia) => (
                <TouchableOpacity
                  key={provincia}
                  style={[
                    styles.provinciaItem,
                    provinciaFiltro === provincia && styles.provinciaItemActive,
                  ]}
                  onPress={() => {
                    setProvinciaFiltro(provincia);
                    setShowProvinciaDropdown(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.provinciaItemText,
                      provinciaFiltro === provincia && styles.provinciaItemTextActive,
                    ]}
                  >
                    {provincia}
                  </Text>
                  {provinciaFiltro === provincia && (
                    <IconSymbol name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

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

      <ProfileSwitcher
        visible={showProfileSwitcher}
        onClose={() => setShowProfileSwitcher(false)}
      />

      <FloatingTabBar 
        tabs={tabs} 
        containerWidth={width}
        key={`${user?.rol_app || 'cliente'}-${currentMode}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  headerButton: {
    padding: 8,
    width: 40,
  },
  switchProfileButton: {
    padding: 8,
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
    padding: 16,
    gap: 16,
  },
  empleoSubTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  empleoSubTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  empleoSubTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  empleoSubTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  empleoSubTabTextActive: {
    color: colors.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  ofertaCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  ofertaImagen: {
    width: '100%',
    height: 160,
    backgroundColor: colors.cardBorder,
  },
  ofertaContent: {
    padding: 16,
  },
  ofertaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ofertaTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  ofertaTipo: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  badgeNuevo: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeNuevoText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  ofertaDescripcion: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  ofertaDetalles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  detalleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  detalleTexto: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  requisitosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  requisitoChip: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  requisitoTexto: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  ofertaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  fechaTexto: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  ofertaActions: {
    flexDirection: 'row',
    gap: 8,
  },
  verMasButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  verMasTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  editButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 12,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
  },
  demandanteCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  demandanteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  demandanteFoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.cardBorder,
  },
  demandanteFotoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demandanteNombre: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  demandantePuesto: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  demandanteUbicacion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  demandanteUbicacionText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  demandanteExperiencia: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  demandanteHabilidades: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  habilidadChip: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  habilidadTexto: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  demandanteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  contactarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  contactarTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  provinciaDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  provinciaDropdownText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  provinciaList: {
    maxHeight: 400,
  },
  provinciaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  provinciaItemActive: {
    backgroundColor: colors.primary + '10',
  },
  provinciaItemText: {
    fontSize: 16,
    color: colors.text,
  },
  provinciaItemTextActive: {
    fontWeight: '600',
    color: colors.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  limpiarButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  limpiarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  aplicarButtonModal: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  aplicarButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  aplicarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
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
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  endOfListContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  endOfListText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
