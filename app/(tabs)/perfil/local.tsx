
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
  Linking,
  FlatList,
  Animated,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { supabase } from '@/utils/supabase';
import { getEstadoLocal } from '@/utils/timeUtils';
import { getCategoryIcon } from '@/utils/categoryIcons';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import ProfileSwitcher from '@/components/perfil/ProfileSwitcher';
import OfertaTrabajoCard from '@/components/empleo/OfertaTrabajoCard';
import EventBanner from '@/components/eventos/EventBanner';
import { useLocalEvent } from '@/hooks/useLocalEvent';
import MomentoViewer from '@/components/momento/MomentoViewer';
import MomentoUpload from '@/components/momento/MomentoUpload';
import UnifiedMomentoAvatar from '@/components/common/UnifiedMomentoAvatar';
import PermissionGuard from '@/components/social/PermissionGuard';
import { scaleFontSize } from '@/utils/androidScaling';
import LocalSolicitudStatus from '@/components/perfil/LocalSolicitudStatus';
import { formatFollowersCount } from '@/utils/formatters';

const SCREEN_VERSION = '326.0.0';

const { width } = Dimensions.get('window');
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

interface LocalEvent {
  id: string;
  titulo: string;
  descripcion?: string;
  fecha: string;
  fecha_fin?: string | null;
  hora: string;
  hora_fin?: string | null;
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

interface Seguidor {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  bio?: string;
}

/**
 * ✅ LOCAL PROFILE v326.0 - TABS SPACING REDUCED BY HALF (FINAL FIX)
 * 
 * CAMBIOS v326.0:
 * - ✅ FIXED: Reducida a la mitad la separación entre botones y tabs (marginTop: 16 → 8)
 * - ✅ RESULTADO: Espacio más compacto y mejor aprovechamiento visual
 * - ✅ VERIFICADO: El cambio está en la línea correcta del código (tabsContainer)
 */

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
  const [isFollowing, setIsFollowing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'eventos' | 'empleo' | 'info'>('posts');

  const [ofertasTrabajo, setOfertasTrabajo] = useState<OfertaTrabajo[]>([]);
  const [loadingEmpleo, setLoadingEmpleo] = useState(false);

  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);

  const [showSeguidoresModal, setShowSeguidoresModal] = useState(false);
  const [showSeguidosModal, setShowSeguidosModal] = useState(false);
  const [seguidores, setSeguidores] = useState<Seguidor[]>([]);
  const [seguidos, setSeguidos] = useState<Seguidor[]>([]);
  const [loadingSeguidores, setLoadingSeguidores] = useState(false);
  const [loadingSeguidos, setLoadingSeguidos] = useState(false);
  const [seguidoresCount, setSeguidoresCount] = useState(0);
  const [seguidosCount, setSeguidosCount] = useState(0);

  const [showMomentoViewer, setShowMomentoViewer] = useState(false);
  const [showMomentoUpload, setShowMomentoUpload] = useState(false);

  const [hasAnalyticsPermission, setHasAnalyticsPermission] = useState(false);
  const [hasSocialProfile, setHasSocialProfile] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const isTogglingFollow = useRef(false);

  const localId = params.localId as string;

  const [contentLoaded, setContentLoaded] = useState({
    posts: false,
    eventos: false,
    empleo: false,
    info: false,
  });
  
  const { evento: activeEvent } = useLocalEvent(localId);

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
  }, [fadeAnim, scaleAnim]);

  const checkSubscriptionAndPermissions = useCallback(async () => {
    if (!localId) return;

    try {
      console.log('[LocalPerfil v326.0] 🔍 Checking subscription and permissions for local:', localId);

      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('suscripciones_locales')
        .select(`
          id,
          estado,
          plan_id,
          planes_suscripcion!suscripciones_locales_plan_id_fkey(
            nombre,
            panel_analisis,
            perfil_social
          )
        `)
        .eq('local_id', localId)
        .eq('estado', 'activa')
        .maybeSingle();

      if (subscriptionError) {
        console.error('[LocalPerfil v326.0] ❌ Error checking subscription:', subscriptionError);
        setHasAnalyticsPermission(false);
        setHasSocialProfile(false);
        setHasActiveSubscription(false);
        return;
      }

      const hasActiveSub = !!subscriptionData;
      const planName = subscriptionData?.planes_suscripcion?.nombre?.toLowerCase() || 'free';
      const hasAnalytics = subscriptionData?.planes_suscripcion?.panel_analisis || false;
      const hasSocial = subscriptionData?.planes_suscripcion?.perfil_social || false;

      console.log('[LocalPerfil v326.0] 📊 Permissions:', {
        hasActiveSubscription: hasActiveSub,
        planName,
        hasAnalytics,
        hasSocial,
      });

      setHasActiveSubscription(hasActiveSub);
      setHasAnalyticsPermission(hasAnalytics);
      setHasSocialProfile(hasSocial);
    } catch (error) {
      console.error('[LocalPerfil v326.0] ❌ Error checking permissions:', error);
      setHasAnalyticsPermission(false);
      setHasSocialProfile(false);
      setHasActiveSubscription(false);
    }
  }, [localId]);

  const loadSeguidoresLocal = useCallback(async () => {
    if (!localId || !hasSocialProfile) return;
    
    setLoadingSeguidores(true);
    try {
      console.log('[LocalPerfil v326.0] 📊 Loading followers for local:', localId);

      const { data, error } = await supabase
        .from('seguidores')
        .select(`
          seguidor_id,
          usuarios!seguidores_seguidor_id_fkey(
            id,
            nombre,
            username,
            avatar,
            bio
          )
        `)
        .eq('seguido_id', local?.propietario_id);

      if (error) {
        console.error('[LocalPerfil v326.0] Error loading followers:', error);
        return;
      }

      if (data) {
        const formattedSeguidores = data
          .filter(s => s.usuarios)
          .map((s: any) => ({
            id: s.usuarios.id,
            nombre: s.usuarios.nombre,
            username: s.usuarios.username,
            avatar: s.usuarios.avatar && !s.usuarios.avatar.startsWith('file://') ? s.usuarios.avatar : null,
            bio: s.usuarios.bio,
          }));

        setSeguidores(formattedSeguidores);
        setSeguidoresCount(formattedSeguidores.length);
        console.log('[LocalPerfil v326.0] ✅ Loaded followers:', formattedSeguidores.length);
      }
    } catch (error) {
      console.error('[LocalPerfil v326.0] Error loading followers:', error);
    } finally {
      setLoadingSeguidores(false);
    }
  }, [localId, local?.propietario_id, hasSocialProfile]);

  const loadSeguidosLocal = useCallback(async () => {
    if (!localId || !local?.propietario_id || !hasSocialProfile) return;
    
    setLoadingSeguidos(true);
    try {
      console.log('[LocalPerfil v326.0] 📊 Loading following for local:', localId);

      const { data, error } = await supabase
        .from('seguidores')
        .select(`
          seguido_id,
          usuarios!seguidores_seguido_id_fkey(
            id,
            nombre,
            username,
            avatar,
            bio
          )
        `)
        .eq('seguidor_id', local.propietario_id);

      if (error) {
        console.error('[LocalPerfil v326.0] Error loading following:', error);
        return;
      }

      if (data) {
        const formattedSeguidos = data
          .filter(s => s.usuarios)
          .map((s: any) => ({
            id: s.usuarios.id,
            nombre: s.usuarios.nombre,
            username: s.usuarios.username,
            avatar: s.usuarios.avatar && !s.usuarios.avatar.startsWith('file://') ? s.usuarios.avatar : null,
            bio: s.usuarios.bio,
          }));

        setSeguidos(formattedSeguidos);
        setSeguidosCount(formattedSeguidos.length);
        console.log('[LocalPerfil v326.0] ✅ Loaded following:', formattedSeguidos.length);
      }
    } catch (error) {
      console.error('[LocalPerfil v326.0] Error loading following:', error);
    } finally {
      setLoadingSeguidos(false);
    }
  }, [localId, local?.propietario_id, hasSocialProfile]);

  const loadLocalData = useCallback(async () => {
    if (!localId) {
      console.error('[LocalPerfil v326.0] ❌ No localId provided');
      Alert.alert('Error', 'No se pudo cargar el perfil del local', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/explorar') }
      ]);
      return;
    }

    try {
      console.log('[LocalPerfil v326.0] ✅ Loading local data for:', localId);

      const { data: localData, error: localError } = await supabase
        .from('locales')
        .select('*')
        .eq('id', localId)
        .single();

      if (localError || !localData) {
        console.error('[LocalPerfil v326.0] Error loading local:', localError);
        Alert.alert('Error', 'No se pudo cargar el perfil del local', [
          { text: 'OK', onPress: () => router.replace('/(tabs)/explorar') }
        ]);
        return;
      }

      setLocal(localData);

      if (user && localData.propietario_id === user.id) {
        setIsOwner(true);
        console.log('[LocalPerfil v326.0] ✅ User IS OWNER of this local');
      } else {
        setIsOwner(false);
        console.log('[LocalPerfil v326.0] ✅ User is NOT owner of this local');
      }

      if (hasSocialProfile) {
        const { count: followersCount } = await supabase
          .from('seguidores')
          .select('*', { count: 'exact', head: true })
          .eq('seguido_id', localData.propietario_id);

        setSeguidoresCount(followersCount || 0);
        console.log('[LocalPerfil v326.0] ✅ Followers count:', followersCount || 0);

        if (localData.propietario_id) {
          const { count: followingCount } = await supabase
            .from('seguidores')
            .select('*', { count: 'exact', head: true })
            .eq('seguidor_id', localData.propietario_id);

          setSeguidosCount(followingCount || 0);
          console.log('[LocalPerfil v326.0] ✅ Following count:', followingCount || 0);
        }
      } else {
        console.log('[LocalPerfil v326.0] ⚠️ Social profile not active, hiding metrics');
        setSeguidoresCount(0);
        setSeguidosCount(0);
      }

      const [postsResult, eventsResult, followResult] = await Promise.all([
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
        
        user ? supabase
          .from('seguidores')
          .select('id')
          .eq('seguidor_id', user.id)
          .eq('seguido_id', localData.propietario_id)
          .single() : Promise.resolve({ data: null })
      ]);

      if (!postsResult.error) {
        console.log('[LocalPerfil v326.0] ✅ Loaded', postsResult.data?.length || 0, 'posts for local');
        setPosts(postsResult.data || []);
        setContentLoaded(prev => ({ ...prev, posts: true }));
      }

      if (!eventsResult.error) {
        setEvents(eventsResult.data || []);
        setContentLoaded(prev => ({ ...prev, eventos: true }));
      }

      setIsFollowing(!!followResult.data);
      console.log('[LocalPerfil v326.0] ✅ Is following:', !!followResult.data);
      setContentLoaded(prev => ({ ...prev, info: true }));

      console.log('[LocalPerfil v326.0] ✅ Local data loaded successfully');
    } catch (error) {
      console.error('[LocalPerfil v326.0] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [localId, user, router, hasSocialProfile]);

  const loadEmpleoData = useCallback(async () => {
    if (!localId) return;
    
    setLoadingEmpleo(true);
    try {
      console.log('[LocalPerfil v326.0] Loading job offers for local:', localId);

      const { data: ofertasData, error: ofertasError } = await supabase
        .from('ofertas_trabajo')
        .select(`
          *,
          locales (
            nombre,
            imagen_url
          )
        `)
        .eq('local_id', localId)
        .eq('activo', true)
        .order('created_at', { ascending: false});

      if (!ofertasError && ofertasData) {
        console.log('[LocalPerfil v326.0] ✅ Loaded', ofertasData.length, 'job offers for this local');
        setOfertasTrabajo(ofertasData);
      }

      setContentLoaded(prev => ({ ...prev, empleo: true }));
    } catch (error) {
      console.error('[LocalPerfil v326.0] Error loading employment data:', error);
    } finally {
      setLoadingEmpleo(false);
    }
  }, [localId]);

  useEffect(() => {
    loadLocalData();
  }, [loadLocalData, localId]);

  useEffect(() => {
    if (localId && user) {
      checkSubscriptionAndPermissions();
    }
  }, [localId, user, checkSubscriptionAndPermissions]);

  useEffect(() => {
    if (activeTab === 'empleo' && !contentLoaded.empleo) {
      loadEmpleoData();
    }
  }, [activeTab, contentLoaded.empleo, loadEmpleoData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLocalData();
    if (activeTab === 'empleo') {
      await loadEmpleoData();
    }
    await checkSubscriptionAndPermissions();
    setRefreshing(false);
  };

  const handleFollow = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para seguir locales');
      return;
    }

    if (!local?.propietario_id) {
      Alert.alert('Error', 'No se puede seguir este local');
      return;
    }

    if (isTogglingFollow.current) {
      console.log('[LocalPerfil v326.0] Already toggling follow, skipping...');
      return;
    }

    isTogglingFollow.current = true;

    const wasFollowing = isFollowing;
    const previousSeguidores = seguidoresCount;

    try {
      console.log('[LocalPerfil v326.0] 🔄 Toggling FOLLOW status (social network)');

      setIsFollowing(!wasFollowing);
      setSeguidoresCount(wasFollowing ? Math.max(0, previousSeguidores - 1) : previousSeguidores + 1);

      if (wasFollowing) {
        console.log('[LocalPerfil v326.0] ➖ Unfollowing local in social network...');
        
        const { error: deleteError } = await supabase
          .from('seguidores')
          .delete()
          .eq('seguidor_id', user.id)
          .eq('seguido_id', local.propietario_id);

        if (deleteError) throw deleteError;

        console.log('[LocalPerfil v326.0] ✅ Unfollow successful');
      } else {
        console.log('[LocalPerfil v326.0] ➕ Following local in social network...');

        const { data: existingFollow } = await supabase
          .from('seguidores')
          .select('id')
          .eq('seguidor_id', user.id)
          .eq('seguido_id', local.propietario_id)
          .single();

        if (existingFollow) {
          console.log('[LocalPerfil v326.0] Already following, skipping insert');
          isTogglingFollow.current = false;
          return;
        }

        const { error: insertError } = await supabase
          .from('seguidores')
          .insert({
            seguidor_id: user.id,
            seguido_id: local.propietario_id,
          });

        if (insertError) throw insertError;

        await supabase
          .from('notificaciones')
          .insert({
            usuario_id: local.propietario_id,
            tipo: 'seguidor',
            titulo: 'Nuevo seguidor',
            mensaje: `${user.nombre} ha comenzado a seguir tu local ${local.nombre}`,
            usuario_origen_id: user.id,
          });

        console.log('[LocalPerfil v326.0] ✅ Follow successful');
      }

      const { count: updatedFollowersCount } = await supabase
        .from('seguidores')
        .select('*', { count: 'exact', head: true })
        .eq('seguido_id', local.propietario_id);

      setSeguidoresCount(updatedFollowersCount || 0);
    } catch (error) {
      console.error('[LocalPerfil v326.0] Error toggling follow:', error);
      
      setIsFollowing(wasFollowing);
      setSeguidoresCount(previousSeguidores);
      
      Alert.alert('Error', 'No se pudo completar la acción. Por favor, intenta de nuevo.');
    } finally {
      isTogglingFollow.current = false;
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

  const handleVerPost = (postId: string) => {
    router.push(`/social/post?id=${postId}`);
  };

  const handleVerEvento = (eventoId: string) => {
    router.push(`/detalle/evento?id=${eventoId}`);
  };

  const handleVerOferta = (ofertaId: string) => {
    router.push(`/empleo/oferta-detalle?id=${ofertaId}`);
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
    
    console.log('[LocalPerfil v326.0] Setting interaction state for creating post');
    await switchToLocalProfile(localId);
    await setCurrentMode('propietario');
    
    router.push(`/crear/publicacion?localId=${localId}`);
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
    
    console.log('[LocalPerfil v326.0] Setting interaction state for creating event');
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
    
    console.log('[LocalPerfil v326.0] Setting interaction state for creating job offer');
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
    
    console.log('[LocalPerfil v326.0] Setting interaction state for editing local');
    await switchToLocalProfile(localId);
    await setCurrentMode('propietario');
    
    router.push(`/editar/local?id=${localId}`);
  };

  const handleVerAnalisis = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión');
      return;
    }
    if (!isOwner) {
      Alert.alert('Error', 'Solo el propietario puede ver el análisis');
      return;
    }

    if (!hasAnalyticsPermission) {
      Alert.alert(
        'Plan Premium Requerido',
        'El panel de análisis solo está disponible para locales con plan Premium. Actualiza tu plan para acceder a estadísticas detalladas.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Ver Planes',
            onPress: () => router.push('/gestion/planes-suscripcion'),
          },
        ]
      );
      return;
    }
    
    console.log('[LocalPerfil v326.0] Navigating to analytics panel');
    await switchToLocalProfile(localId);
    await setCurrentMode('propietario');
    
    router.push(`/gestion/panel-analisis?localId=${localId}`);
  };

  const handleEnviarMensaje = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para enviar mensajes');
      return;
    }

    if (!local?.propietario_id) {
      Alert.alert('Error', 'No se puede enviar mensaje a este local');
      return;
    }

    try {
      console.log('[LocalPerfil v326.0] Opening chat with LOCAL PROFILE (isolated messaging)');
      
      router.push(`/chat/conversacion?localId=${localId}&userId=${user.id}`);
    } catch (error) {
      console.error('[LocalPerfil v326.0] Error opening local chat:', error);
      Alert.alert('Error', 'No se pudo abrir el chat');
    }
  };

  const handleGoBack = () => {
    try {
      if (router.canGoBack()) {
        console.log('[LocalPerfil v326.0] ✅ Going back to previous screen');
        router.back();
      } else {
        console.log('[LocalPerfil v326.0] ⚠️ No previous screen, navigating to explorar');
        router.replace('/(tabs)/explorar');
      }
    } catch (error) {
      console.error('[LocalPerfil v326.0] ❌ Error navigating back:', error);
      router.replace('/(tabs)/explorar');
    }
  };

  const handleSeguidores = async () => {
    if (!hasSocialProfile) {
      Alert.alert(
        'Perfil Social No Activo',
        'Este local no tiene un perfil social activo. Necesita un plan Estándar o Premium para acceder a funciones sociales.',
        [{ text: 'OK' }]
      );
      return;
    }
    setShowSeguidoresModal(true);
    await loadSeguidoresLocal();
  };

  const handleSeguidos = async () => {
    if (!hasSocialProfile) {
      Alert.alert(
        'Perfil Social No Activo',
        'Este local no tiene un perfil social activo. Necesita un plan Estándar o Premium para acceder a funciones sociales.',
        [{ text: 'OK' }]
      );
      return;
    }
    setShowSeguidosModal(true);
    await loadSeguidosLocal();
  };

  const handleUserPressInModal = (userId: string) => {
    setShowSeguidoresModal(false);
    setShowSeguidosModal(false);
    
    if (user && userId === user.id) {
      router.push('/(tabs)/perfil');
    } else {
      router.push(`/perfil/usuario?userId=${userId}`);
    }
  };

  const getTabsForRole = (): TabBarItem[] => {
    const userRole = user?.rol_app || 'cliente';

    console.log('🔍🔍🔍 [getTabsForRole v326.0] Determining tabs:', {
      userRole,
      currentMode,
      isOwner,
      localId,
      activeProfileId,
      activeProfileType,
      localPropietarioId: local?.propietario_id,
      userId: user?.id
    });

    if (userRole === 'admin' && currentMode === 'admin') {
      console.log('📋 [getTabsForRole v326.0] Showing ADMIN tabs');
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

    if (isOwner && currentMode === 'propietario') {
      console.log('🏢🏢🏢 [getTabsForRole v326.0] Showing OWNER tabs with GESTION icon (building.2) - User owns this local');
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

    console.log('👤 [getTabsForRole v326.0] Showing CLIENT tabs (eventos, favoritos, social) - Not owner or not in propietario mode');
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

  let categoriasLocal = local.barlive_types || [];
  if (categoriasLocal.length === 0 && local.barlive_type) {
    categoriasLocal = [local.barlive_type];
  }

  const tabs = getTabsForRole();

  console.log('🎯🎯🎯 [LocalPerfil v326.0] Rendering with tabs:', tabs.map(t => `${t.name}(${t.icon})`).join(', '));

  const seguidoresFormatted = formatFollowersCount(seguidoresCount);
  const seguidosFormatted = formatFollowersCount(seguidosCount);
  const publicacionesFormatted = formatFollowersCount(posts.length);

  return (
    <PermissionGuard requireSocialProfile={true} localId={localId}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          scrollEventThrottle={16}
        >
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.scrollableHeader}
          >
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              {isOwner && (user?.rol_app === 'propietario' || ownedLocals.length > 0) && (
                <TouchableOpacity 
                  style={styles.switchProfileButton}
                  onPress={() => setShowProfileSwitcher(true)}
                  activeOpacity={0.8}
                >
                  <IconSymbol ios_icon_name="arrow.triangle.2.circlepath" android_material_icon_name="swap_horiz" size={24} color={colors.headerText} />
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>

          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.profileHeaderGradient}
          >
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
                <UnifiedMomentoAvatar
                  localId={localId}
                  imageUrl={local.imagen_url}
                  size={96}
                  showAddButton={isOwner}
                  isOwner={isOwner}
                  onPress={() => setShowMomentoViewer(true)}
                  onAddPress={() => setShowMomentoUpload(true)}
                />

                <View style={styles.profileInfo}>
                  <Text style={[styles.profileName, { fontSize: scaleFontSize(22) }]}>{local.nombre}</Text>
                  {local.username && (
                    <Text style={[styles.profileUsername, { fontSize: scaleFontSize(15) }]}>@{local.username}</Text>
                  )}
                  {categoriasLocal.length > 0 && (
                    <View style={styles.categoriesContainer}>
                      {categoriasLocal.slice(0, 2).map((categoria: string, index: number) => (
                        <View key={index} style={styles.categoryBadge}>
                          <Text style={[styles.categoryIcon, { fontSize: scaleFontSize(12) }]}>{getCategoryIcon(categoria)}</Text>
                          <Text style={[styles.categoryText, { fontSize: scaleFontSize(12) }]}>{categoria}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  <View style={styles.statsContainerCompact}>
                    <View style={styles.statItemCompact}>
                      <Text style={[styles.statNumberCompact, { fontSize: scaleFontSize(18) }]}>{publicacionesFormatted}</Text>
                      <Text style={[styles.statLabelCompact, { fontSize: scaleFontSize(13) }]}>publicaciones</Text>
                    </View>
                    {hasSocialProfile ? (
                      <React.Fragment>
                        <TouchableOpacity style={styles.statItemCompact} onPress={handleSeguidores}>
                          <Text style={[styles.statNumberCompact, { fontSize: scaleFontSize(18) }]}>{seguidoresFormatted}</Text>
                          <Text style={[styles.statLabelCompact, { fontSize: scaleFontSize(13) }]}>seguidores</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.statItemCompact} onPress={handleSeguidos}>
                          <Text style={[styles.statNumberCompact, { fontSize: scaleFontSize(18) }]}>{seguidosFormatted}</Text>
                          <Text style={[styles.statLabelCompact, { fontSize: scaleFontSize(13) }]}>siguiendo</Text>
                        </TouchableOpacity>
                      </React.Fragment>
                    ) : (
                      <View style={styles.statItemCompact}>
                        <IconSymbol ios_icon_name="lock.fill" android_material_icon_name="lock" size={16} color="rgba(255, 255, 255, 0.6)" />
                        <Text style={[styles.statLabelLockedCompact, { fontSize: scaleFontSize(11) }]}>Social No Activo</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {local.direccion && (
                <View style={styles.addressContainer}>
                  <IconSymbol ios_icon_name="mappin" android_material_icon_name="location_on" size={14} color={colors.headerText} />
                  <Text style={[styles.addressText, { fontSize: scaleFontSize(14) }]}>{local.direccion}</Text>
                </View>
              )}

              {activeEvent && (
                <View style={{ marginBottom: 12 }}>
                  <EventBanner evento={activeEvent} compact={true} />
                </View>
              )}

              <View style={styles.actionButtons}>
                {isOwner ? (
                  <React.Fragment>
                    <TouchableOpacity 
                      style={styles.actionButton} 
                      onPress={handleEditarLocal}
                      activeOpacity={0.7}
                    >
                      <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={18} color={colors.headerText} />
                      <Text style={[styles.actionButtonText, { fontSize: scaleFontSize(15) }]}>Editar Perfil</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.createButton]} 
                      onPress={handleCrearEvento}
                      activeOpacity={0.7}
                    >
                      <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={18} color={colors.white} />
                      <Text style={[styles.actionButtonText, { color: colors.white, fontSize: scaleFontSize(15) }]}>Crear</Text>
                    </TouchableOpacity>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <TouchableOpacity 
                      style={[styles.actionButton, isFollowing && styles.actionButtonFollowing]} 
                      onPress={handleFollow}
                      activeOpacity={0.7}
                      disabled={isTogglingFollow.current}
                    >
                      <IconSymbol 
                        ios_icon_name={isFollowing ? 'person.fill.checkmark' : 'person.badge.plus'} 
                        android_material_icon_name={isFollowing ? 'person_add_disabled' : 'person_add'}
                        size={18} 
                        color={colors.headerText} 
                      />
                      <Text style={[styles.actionButtonText, { fontSize: scaleFontSize(15) }]}>
                        {isFollowing ? 'Siguiendo' : 'Seguir'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionButton} 
                      onPress={handleEnviarMensaje}
                      activeOpacity={0.7}
                    >
                      <IconSymbol ios_icon_name="message.fill" android_material_icon_name="message" size={18} color={colors.headerText} />
                      <Text style={[styles.actionButtonText, { fontSize: scaleFontSize(15) }]}>Mensaje</Text>
                    </TouchableOpacity>
                  </React.Fragment>
                )}
              </View>
            </Animated.View>

            <View style={{ paddingTop: 16 }}>
              <LocalSolicitudStatus localId={localId} />
            </View>

            {/* ✅ FIX v326.0: Reducida a la mitad la separación entre botones y tabs (16 → 8) */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
                onPress={() => setActiveTab('posts')}
              >
                <IconSymbol 
                  ios_icon_name="square.grid.3x3" 
                  android_material_icon_name="grid_on"
                  size={24} 
                  color={activeTab === 'posts' ? colors.white : 'rgba(255, 255, 255, 0.6)'} 
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'eventos' && styles.tabActive]}
                onPress={() => setActiveTab('eventos')}
              >
                <IconSymbol 
                  ios_icon_name="calendar" 
                  android_material_icon_name="event"
                  size={24} 
                  color={activeTab === 'eventos' ? colors.white : 'rgba(255, 255, 255, 0.6)'} 
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'empleo' && styles.tabActive]}
                onPress={() => setActiveTab('empleo')}
              >
                <IconSymbol 
                  ios_icon_name="briefcase.fill" 
                  android_material_icon_name="work"
                  size={24} 
                  color={activeTab === 'empleo' ? colors.white : 'rgba(255, 255, 255, 0.6)'} 
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'info' && styles.tabActive]}
                onPress={() => setActiveTab('info')}
              >
                <IconSymbol 
                  ios_icon_name="info.circle" 
                  android_material_icon_name="info"
                  size={24} 
                  color={activeTab === 'info' ? colors.white : 'rgba(255, 255, 255, 0.6)'} 
                />
              </TouchableOpacity>
            </View>
          </LinearGradient>

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
                          <IconSymbol ios_icon_name="photo" android_material_icon_name="photo" size={32} color={colors.textSecondary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <IconSymbol ios_icon_name="photo.on.rectangle" android_material_icon_name="photo_library" size={48} color={colors.textSecondary} />
                    <Text style={[styles.emptyText, { fontSize: scaleFontSize(14) }]}>
                      {isOwner ? 'Crea tu primera publicación' : 'No hay publicaciones'}
                    </Text>
                    {isOwner && (
                      <TouchableOpacity style={styles.emptyButton} onPress={handleCrearPost}>
                        <Text style={[styles.emptyButtonText, { fontSize: scaleFontSize(14) }]}>Crear Publicación</Text>
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
                        <Text style={[styles.eventTitle, { fontSize: scaleFontSize(18) }]}>{event.titulo}</Text>
                        <View style={styles.eventMeta}>
                          <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={14} color={colors.textSecondary} />
                          <Text style={[styles.eventMetaText, { fontSize: scaleFontSize(14) }]}>
                            {new Date(event.fecha).toLocaleDateString('es-ES', { 
                              day: 'numeric', 
                              month: 'short' 
                            })}
                          </Text>
                          <IconSymbol ios_icon_name="clock" android_material_icon_name="schedule" size={14} color={colors.textSecondary} />
                          <Text style={[styles.eventMetaText, { fontSize: scaleFontSize(14) }]}>{event.hora}</Text>
                        </View>
                        {event.precio !== null && event.precio !== undefined && (
                          <Text style={[styles.eventPrice, { fontSize: scaleFontSize(16) }]}>
                            {event.precio === 0 ? 'Gratis' : `${event.precio}€`}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={48} color={colors.textSecondary} />
                    <Text style={[styles.emptyText, { fontSize: scaleFontSize(14) }]}>
                      {isOwner ? 'Crea tu primer evento' : 'No hay eventos próximos'}
                    </Text>
                    {isOwner && (
                      <TouchableOpacity style={styles.emptyButton} onPress={handleCrearEvento}>
                        <Text style={[styles.emptyButtonText, { fontSize: scaleFontSize(14) }]}>Crear Evento</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}

            {activeTab === 'empleo' && (
              <View style={styles.empleoContainer}>
                <View style={styles.empleoHeader}>
                  <Text style={[styles.empleoHeaderTitle, { fontSize: scaleFontSize(20) }]}>
                    {isOwner ? 'Mis Ofertas de Empleo' : 'Ofertas de Empleo'}
                  </Text>
                  <Text style={[styles.empleoHeaderSubtitle, { fontSize: scaleFontSize(14) }]}>
                    {isOwner 
                      ? 'Gestiona las ofertas de trabajo de tu local' 
                      : 'Ofertas de trabajo publicadas por este local'}
                  </Text>
                </View>

                {loadingEmpleo ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { fontSize: scaleFontSize(14) }]}>Cargando...</Text>
                  </View>
                ) : (
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
                            localNombre: oferta.locales?.nombre || local.nombre,
                            fechaPublicacion: oferta.created_at,
                            provincia: oferta.provincia || local.provincia || '',
                          }}
                          onPress={() => handleVerOferta(oferta.id)}
                        />
                      ))
                    ) : (
                      <View style={styles.emptyState}>
                        <IconSymbol ios_icon_name="briefcase" android_material_icon_name="work" size={48} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { fontSize: scaleFontSize(14) }]}>
                          {isOwner ? 'Publica tu primera oferta de empleo' : 'No hay ofertas disponibles'}
                        </Text>
                        {isOwner && (
                          <TouchableOpacity style={styles.emptyButton} onPress={handleCrearOferta}>
                            <Text style={[styles.emptyButtonText, { fontSize: scaleFontSize(14) }]}>Crear Oferta</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {activeTab === 'info' && (
              <View style={styles.infoContainer}>
                {local.descripcion_google && (
                  <View style={styles.infoSection}>
                    <Text style={[styles.infoSectionTitle, { fontSize: scaleFontSize(18) }]}>Descripción</Text>
                    <Text style={[styles.infoText, { fontSize: scaleFontSize(15) }]}>{local.descripcion_google}</Text>
                  </View>
                )}

                <View style={styles.infoSection}>
                  <Text style={[styles.infoSectionTitle, { fontSize: scaleFontSize(18) }]}>Contacto</Text>
                  {local.telefono && (
                    <TouchableOpacity style={styles.infoRow} onPress={handleLlamar}>
                      <IconSymbol ios_icon_name="phone.fill" android_material_icon_name="phone" size={20} color={colors.primary} />
                      <Text style={[styles.infoRowText, { fontSize: scaleFontSize(15) }]}>{local.telefono}</Text>
                    </TouchableOpacity>
                  )}
                  {local.email && (
                    <View style={styles.infoRow}>
                      <IconSymbol ios_icon_name="envelope.fill" android_material_icon_name="email" size={20} color={colors.primary} />
                      <Text style={[styles.infoRowText, { fontSize: scaleFontSize(15) }]}>{local.email}</Text>
                    </View>
                  )}
                  {local.website && (
                    <TouchableOpacity style={styles.infoRow} onPress={handleWeb}>
                      <IconSymbol ios_icon_name="globe" android_material_icon_name="language" size={20} color={colors.primary} />
                      <Text style={[styles.infoRowText, { fontSize: scaleFontSize(15) }]}>{local.website}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {local.horarios_completos && Object.keys(local.horarios_completos).length > 0 && (
                  <View style={styles.infoSection}>
                    <Text style={[styles.infoSectionTitle, { fontSize: scaleFontSize(18) }]}>Horarios</Text>
                    {Object.entries(local.horarios_completos).map(([dia, horas]: [string, any]) => (
                      <View key={dia} style={styles.horarioRow}>
                        <Text style={[styles.horarioDia, { fontSize: scaleFontSize(15) }]}>{dia.charAt(0).toUpperCase() + dia.slice(1)}</Text>
                        <Text style={[styles.horarioHoras, { fontSize: scaleFontSize(15) }]}>
                          {Array.isArray(horas) ? horas.join(', ') : horas}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {local.servicios_disponibles && Object.keys(local.servicios_disponibles).length > 0 && (
                  <View style={styles.infoSection}>
                    <Text style={[styles.infoSectionTitle, { fontSize: scaleFontSize(18) }]}>Servicios</Text>
                    <View style={styles.servicesGrid}>
                      {Object.entries(local.servicios_disponibles)
                        .filter(([_, value]) => value === true)
                        .map(([key]) => (
                          <View key={key} style={styles.serviceBadge}>
                            <Text style={[styles.serviceText, { fontSize: scaleFontSize(13) }]}>
                              {key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.replace(/_/g, ' ').slice(1)}
                            </Text>
                          </View>
                        ))}
                    </View>
                  </View>
                )}

                <View style={styles.infoSection}>
                  <Text style={[styles.infoSectionTitle, { fontSize: scaleFontSize(18) }]}>Ubicación</Text>
                  <TouchableOpacity style={styles.directionsButton} onPress={handleComoLlegar}>
                    <IconSymbol ios_icon_name="map.fill" android_material_icon_name="map" size={20} color={colors.white} />
                    <Text style={[styles.directionsButtonText, { fontSize: scaleFontSize(15) }]}>Cómo llegar</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.infoSection}>
                  <TouchableOpacity 
                    style={styles.moreInfoButton} 
                    onPress={() => router.push(`/detalle/local?id=${localId}`)}
                  >
                    <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={20} color={colors.primary} />
                    <Text style={[styles.moreInfoButtonText, { fontSize: scaleFontSize(15) }]}>Ver información completa</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        <Modal
          visible={showSeguidoresModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowSeguidoresModal(false)}
        >
          <View style={styles.container}>
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              style={styles.followModalHeader}
            >
              <TouchableOpacity onPress={() => setShowSeguidoresModal(false)} activeOpacity={0.7}>
                <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
              </TouchableOpacity>
              <Text style={[styles.followModalTitle, { fontSize: scaleFontSize(20) }]}>Seguidores</Text>
              <View style={{ width: 24 }} />
            </LinearGradient>
            
            {loadingSeguidores ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={seguidores}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.userItem}
                    onPress={() => handleUserPressInModal(item.id)}
                    activeOpacity={0.7}
                  >
                    {item.avatar ? (
                      <Image source={{ uri: item.avatar }} style={styles.userAvatar} />
                    ) : (
                      <View style={[styles.userAvatar, styles.avatarPlaceholder]}>
                        <Text style={[styles.avatarText, { fontSize: scaleFontSize(20) }]}>
                          {item.nombre.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, { fontSize: scaleFontSize(16) }]}>{item.nombre}</Text>
                      {item.username && (
                        <Text style={[styles.userUsername, { fontSize: scaleFontSize(14) }]}>@{item.username}</Text>
                      )}
                      {item.bio && (
                        <Text style={[styles.userBio, { fontSize: scaleFontSize(13) }]} numberOfLines={2}>
                          {item.bio}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <IconSymbol ios_icon_name="person.2" android_material_icon_name="people" size={64} color={colors.textSecondary} />
                    <Text style={[styles.emptyText, { fontSize: scaleFontSize(14) }]}>No hay seguidores aún</Text>
                  </View>
                }
              />
            )}
          </View>
        </Modal>

        <Modal
          visible={showSeguidosModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowSeguidosModal(false)}
        >
          <View style={styles.container}>
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              style={styles.followModalHeader}
            >
              <TouchableOpacity onPress={() => setShowSeguidosModal(false)} activeOpacity={0.7}>
                <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
              </TouchableOpacity>
              <Text style={[styles.followModalTitle, { fontSize: scaleFontSize(20) }]}>Siguiendo</Text>
              <View style={{ width: 24 }} />
            </LinearGradient>
            
            {loadingSeguidos ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={seguidos}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.userItem}
                    onPress={() => handleUserPressInModal(item.id)}
                    activeOpacity={0.7}
                  >
                    {item.avatar ? (
                      <Image source={{ uri: item.avatar }} style={styles.userAvatar} />
                    ) : (
                      <View style={[styles.userAvatar, styles.avatarPlaceholder]}>
                        <Text style={[styles.avatarText, { fontSize: scaleFontSize(20) }]}>
                          {item.nombre.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, { fontSize: scaleFontSize(16) }]}>{item.nombre}</Text>
                      {item.username && (
                        <Text style={[styles.userUsername, { fontSize: scaleFontSize(14) }]}>@{item.username}</Text>
                      )}
                      {item.bio && (
                        <Text style={[styles.userBio, { fontSize: scaleFontSize(13) }]} numberOfLines={2}>
                          {item.bio}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <IconSymbol ios_icon_name="person.2" android_material_icon_name="people" size={64} color={colors.textSecondary} />
                    <Text style={[styles.emptyText, { fontSize: scaleFontSize(14) }]}>No sigue a nadie aún</Text>
                  </View>
                }
              />
            )}
          </View>
        </Modal>

        {showMomentoViewer && (
          <MomentoViewer
            visible={showMomentoViewer}
            onClose={() => setShowMomentoViewer(false)}
            authorId={localId}
            authorType="local"
          />
        )}

        {showMomentoUpload && isOwner && (
          <MomentoUpload
            visible={showMomentoUpload}
            onClose={() => setShowMomentoUpload(false)}
            onSuccess={() => {
              console.log('[LocalPerfil v326.0] Momento uploaded successfully');
            }}
          />
        )}

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
    </PermissionGuard>
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
  scrollViewContent: {
    paddingBottom: 100,
  },
  scrollableHeader: {
    paddingTop: Platform.OS === 'android' ? 36 : 50,
    paddingBottom: Platform.OS === 'android' ? 8 : 12,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
  },
  switchProfileButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
  },
  profileHeaderGradient: {
    paddingTop: 12,
    paddingBottom: 0,
    paddingHorizontal: 20,
  },
  profileSection: {
    paddingTop: 0,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 2,
  },
  profileUsername: {
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
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
  },
  categoryText: {
    fontWeight: '600',
    color: colors.headerText,
    textTransform: 'capitalize',
  },
  statsContainerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statItemCompact: {
    alignItems: 'center',
    gap: 2,
  },
  statNumberCompact: {
    fontWeight: '700',
    color: colors.headerText,
  },
  statLabelCompact: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  statLabelLockedCompact: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
    fontSize: scaleFontSize(11),
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  addressText: {
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  createButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  actionButtonFollowing: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  actionButtonText: {
    fontWeight: '600',
    color: colors.headerText,
  },
  // ✅ FIX v326.0: Reducida a la mitad la separación entre botones y tabs (16 → 8)
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.white,
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
    color: colors.textSecondary,
  },
  eventPrice: {
    fontWeight: '700',
    color: colors.primary,
  },
  empleoContainer: {
    flex: 1,
    padding: 16,
  },
  empleoHeader: {
    marginBottom: 20,
  },
  empleoHeaderTitle: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  empleoHeaderSubtitle: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 12,
  },
  empleoList: {
    flex: 1,
  },
  infoContainer: {
    padding: 16,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoSectionTitle: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  infoText: {
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
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  horarioHoras: {
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
    fontWeight: '600',
    color: colors.primary,
  },
  followModalHeader: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  followModalTitle: {
    fontWeight: 'bold',
    color: colors.headerText,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.cardBorder,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  userUsername: {
    color: colors.textSecondary,
    marginBottom: 4,
  },
  userBio: {
    color: colors.text,
    lineHeight: 18,
  },
});
