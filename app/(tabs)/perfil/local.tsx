
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

const SCREEN_VERSION = '7.0.0';

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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

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

  const loadSeguidoresLocal = useCallback(async () => {
    if (!localId) return;
    
    setLoadingSeguidores(true);
    try {
      console.log('[LocalPerfil] Loading followers for local:', localId);

      const { data, error } = await supabase
        .from('locales_guardados')
        .select(`
          usuario_id,
          usuarios!locales_guardados_usuario_id_fkey(
            id,
            nombre,
            username,
            avatar,
            bio
          )
        `)
        .eq('local_id', localId);

      if (error) {
        console.error('[LocalPerfil] Error loading followers:', error);
        return;
      }

      if (data) {
        const formattedSeguidores = data
          .filter(s => s.usuarios)
          .map((s: any) => ({
            id: s.usuarios.id,
            nombre: s.usuarios.nombre,
            username: s.usuarios.username,
            avatar: s.usuarios.avatar,
            bio: s.usuarios.bio,
          }));

        setSeguidores(formattedSeguidores);
        setSeguidoresCount(formattedSeguidores.length);
        console.log('[LocalPerfil] ✅ Loaded followers:', formattedSeguidores.length);
      }
    } catch (error) {
      console.error('[LocalPerfil] Error loading followers:', error);
    } finally {
      setLoadingSeguidores(false);
    }
  }, [localId]);

  const loadSeguidosLocal = useCallback(async () => {
    if (!localId || !local?.propietario_id) return;
    
    setLoadingSeguidos(true);
    try {
      console.log('[LocalPerfil] Loading following for local:', localId);

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
        console.error('[LocalPerfil] Error loading following:', error);
        return;
      }

      if (data) {
        const formattedSeguidos = data
          .filter(s => s.usuarios)
          .map((s: any) => ({
            id: s.usuarios.id,
            nombre: s.usuarios.nombre,
            username: s.usuarios.username,
            avatar: s.usuarios.avatar,
            bio: s.usuarios.bio,
          }));

        setSeguidos(formattedSeguidos);
        setSeguidosCount(formattedSeguidos.length);
        console.log('[LocalPerfil] ✅ Loaded following:', formattedSeguidos.length);
      }
    } catch (error) {
      console.error('[LocalPerfil] Error loading following:', error);
    } finally {
      setLoadingSeguidos(false);
    }
  }, [localId, local?.propietario_id]);

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
        console.log('[LocalPerfil] ✅ User IS OWNER of this local');
      } else {
        setIsOwner(false);
        console.log('[LocalPerfil] ✅ User is NOT owner of this local');
      }

      const { count: followersCount } = await supabase
        .from('locales_guardados')
        .select('*', { count: 'exact', head: true })
        .eq('local_id', localId);

      setSeguidoresCount(followersCount || 0);

      if (localData.propietario_id) {
        const { count: followingCount } = await supabase
          .from('seguidores')
          .select('*', { count: 'exact', head: true })
          .eq('seguidor_id', localData.propietario_id);

        setSeguidosCount(followingCount || 0);
      }

      const [postsResult, eventsResult, favResult] = await Promise.all([
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
          .from('locales_guardados')
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

      setIsFavorito(!!favResult.data);
      setContentLoaded(prev => ({ ...prev, info: true }));

      console.log('[LocalPerfil] ✅ Local data loaded successfully');
    } catch (error) {
      console.error('[LocalPerfil] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [localId, user, router]);

  const loadEmpleoData = useCallback(async () => {
    if (!localId) return;
    
    setLoadingEmpleo(true);
    try {
      console.log('[LocalPerfil] Loading job offers for local:', localId);

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
        console.log('[LocalPerfil] ✅ Loaded', ofertasData.length, 'job offers for this local');
        setOfertasTrabajo(ofertasData);
      }

      setContentLoaded(prev => ({ ...prev, empleo: true }));
    } catch (error) {
      console.error('[LocalPerfil] Error loading employment data:', error);
    } finally {
      setLoadingEmpleo(false);
    }
  }, [localId]);

  useEffect(() => {
    loadLocalData();
  }, [loadLocalData, localId]);

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
          .from('locales_guardados')
          .delete()
          .eq('usuario_id', user.id)
          .eq('local_id', localId);
        setIsFavorito(false);
        setSeguidoresCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase
          .from('locales_guardados')
          .insert({
            usuario_id: user.id,
            local_id: localId,
          });
        setIsFavorito(true);
        setSeguidoresCount(prev => prev + 1);
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

  const handleVerAnalisis = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión');
      return;
    }
    if (!isOwner) {
      Alert.alert('Error', 'Solo el propietario puede ver el análisis');
      return;
    }
    
    console.log('[LocalPerfil] Navigating to analytics panel');
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
      console.log('[LocalPerfil] Opening chat with LOCAL PROFILE (isolated messaging)');
      console.log('[LocalPerfil] Local ID:', localId);
      console.log('[LocalPerfil] Local Owner ID:', local.propietario_id);
      console.log('[LocalPerfil] Current User ID:', user.id);
      
      router.push(`/chat/conversacion?localId=${localId}&userId=${user.id}`);
    } catch (error) {
      console.error('[LocalPerfil] Error opening local chat:', error);
      Alert.alert('Error', 'No se pudo abrir el chat');
    }
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

  const handleSeguidores = async () => {
    setShowSeguidoresModal(true);
    await loadSeguidoresLocal();
  };

  const handleSeguidos = async () => {
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
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{local.nombre}</Text>
          <View style={styles.headerActions}>
            {isOwner && (user?.rol_app === 'propietario' || ownedLocals.length > 0) && (
              <TouchableOpacity 
                style={styles.switchProfileButton}
                onPress={() => setShowProfileSwitcher(true)}
                activeOpacity={0.8}
              >
                <IconSymbol ios_icon_name="arrow.triangle.2.circlepath" android_material_icon_name="sync" size={24} color={colors.headerText} />
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
              <View style={styles.avatarContainer}>
                {local.imagen_url ? (
                  <Image source={{ uri: local.imagen_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <IconSymbol ios_icon_name="building.2" android_material_icon_name="store" size={40} color={colors.headerText} />
                  </View>
                )}
              </View>
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
                <IconSymbol ios_icon_name="mappin" android_material_icon_name="location_on" size={16} color={colors.headerText} />
                <Text style={styles.addressText}>{local.direccion}</Text>
              </View>
            )}

            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: estado.estaAbierto ? '#22C55E' : '#EF4444' }]} />
              <Text style={styles.statusText}>{estado.badge}</Text>
            </View>

            {activeEvent && (
              <View style={{ marginBottom: 16 }}>
                <EventBanner evento={activeEvent} compact={true} />
              </View>
            )}

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{posts.length}</Text>
                <Text style={styles.statLabel}>Publicaciones</Text>
              </View>
              <View style={styles.statDivider} />
              <TouchableOpacity style={styles.statItem} onPress={handleSeguidores}>
                <Text style={styles.statNumber}>{seguidoresCount}</Text>
                <Text style={styles.statLabel}>Seguidores</Text>
              </TouchableOpacity>
              <View style={styles.statDivider} />
              <TouchableOpacity style={styles.statItem} onPress={handleSeguidos}>
                <Text style={styles.statNumber}>{seguidosCount}</Text>
                <Text style={styles.statLabel}>Seguidos</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionsContainer}>
              {isOwner ? (
                <View style={styles.ownerButtonsRow}>
                  <TouchableOpacity 
                    style={styles.ownerRowButton} 
                    onPress={handleEditarLocal}
                    activeOpacity={0.7}
                  >
                    <View style={styles.ownerButtonIconContainer}>
                      <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={20} color={colors.primary} />
                    </View>
                    <Text style={styles.ownerRowButtonText}>Editar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.ownerRowButton} 
                    onPress={handleCrearEvento}
                    activeOpacity={0.7}
                  >
                    <View style={styles.ownerButtonIconContainer}>
                      <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={20} color={colors.primary} />
                    </View>
                    <Text style={styles.ownerRowButtonText}>Evento</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.ownerRowButton} 
                    onPress={handleVerAnalisis}
                    activeOpacity={0.7}
                  >
                    <View style={styles.ownerButtonIconContainer}>
                      <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar_chart" size={20} color={colors.primary} />
                    </View>
                    <Text style={styles.ownerRowButtonText}>Análisis</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.visitorButtonsRow}>
                  <TouchableOpacity 
                    style={[styles.visitorRowButton, isFavorito && styles.visitorRowButtonFollowing]} 
                    onPress={toggleFavorito}
                    activeOpacity={0.7}
                  >
                    <IconSymbol 
                      ios_icon_name={isFavorito ? 'heart.fill' : 'heart'} 
                      android_material_icon_name={isFavorito ? 'favorite' : 'favorite_border'}
                      size={18} 
                      color={isFavorito ? colors.headerText : colors.primary} 
                    />
                    <Text style={[styles.visitorRowButtonText, isFavorito && styles.visitorRowButtonTextFollowing]}>
                      {isFavorito ? 'Siguiendo' : 'Seguir'}
                    </Text>
                  </TouchableOpacity>
                  
                  {local.telefono && (
                    <TouchableOpacity 
                      style={styles.visitorRowButton} 
                      onPress={handleLlamar}
                      activeOpacity={0.7}
                    >
                      <IconSymbol ios_icon_name="phone.fill" android_material_icon_name="phone" size={18} color={colors.primary} />
                      <Text style={styles.visitorRowButtonText}>Llamar</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity 
                    style={styles.visitorRowButton} 
                    onPress={handleEnviarMensaje}
                    activeOpacity={0.7}
                  >
                    <IconSymbol ios_icon_name="message.fill" android_material_icon_name="message" size={18} color={colors.primary} />
                    <Text style={styles.visitorRowButtonText}>Mensaje</Text>
                  </TouchableOpacity>
                </View>
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
              ios_icon_name="square.grid.3x3" 
              android_material_icon_name="grid_on"
              size={24} 
              color={activeTab === 'posts' ? colors.primary : colors.textSecondary} 
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
              color={activeTab === 'eventos' ? colors.primary : colors.textSecondary} 
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
              color={activeTab === 'empleo' ? colors.primary : colors.textSecondary} 
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
                        <IconSymbol ios_icon_name="photo" android_material_icon_name="photo" size={32} color={colors.textSecondary} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <IconSymbol ios_icon_name="photo.on.rectangle" android_material_icon_name="photo_library" size={48} color={colors.textSecondary} />
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
                        <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={14} color={colors.textSecondary} />
                        <Text style={styles.eventMetaText}>
                          {new Date(event.fecha).toLocaleDateString('es-ES', { 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                        </Text>
                        <IconSymbol ios_icon_name="clock" android_material_icon_name="schedule" size={14} color={colors.textSecondary} />
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
                  <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={48} color={colors.textSecondary} />
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
              <View style={styles.empleoHeader}>
                <Text style={styles.empleoHeaderTitle}>
                  {isOwner ? 'Mis Ofertas de Empleo' : 'Ofertas de Empleo'}
                </Text>
                <Text style={styles.empleoHeaderSubtitle}>
                  {isOwner 
                    ? 'Gestiona las ofertas de trabajo de tu local' 
                    : 'Ofertas de trabajo publicadas por este local'}
                </Text>
              </View>

              {loadingEmpleo ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Cargando...</Text>
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
                    <IconSymbol ios_icon_name="phone.fill" android_material_icon_name="phone" size={20} color={colors.primary} />
                    <Text style={styles.infoRowText}>{local.telefono}</Text>
                  </TouchableOpacity>
                )}
                {local.email && (
                  <View style={styles.infoRow}>
                    <IconSymbol ios_icon_name="envelope.fill" android_material_icon_name="email" size={20} color={colors.primary} />
                    <Text style={styles.infoRowText}>{local.email}</Text>
                  </View>
                )}
                {local.website && (
                  <TouchableOpacity style={styles.infoRow} onPress={handleWeb}>
                    <IconSymbol ios_icon_name="globe" android_material_icon_name="language" size={20} color={colors.primary} />
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
                  <IconSymbol ios_icon_name="map.fill" android_material_icon_name="map" size={20} color={colors.white} />
                  <Text style={styles.directionsButtonText}>Cómo llegar</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Sala Virtual</Text>
                <TouchableOpacity style={styles.virtualRoomButton} onPress={handleSalaVirtual}>
                  <IconSymbol ios_icon_name="person.3.fill" android_material_icon_name="groups" size={20} color={colors.white} />
                  <Text style={styles.virtualRoomButtonText}>Entrar a la Sala Virtual</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoSection}>
                <TouchableOpacity 
                  style={styles.moreInfoButton} 
                  onPress={() => router.push(`/detalle/local?id=${localId}`)}
                >
                  <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={20} color={colors.primary} />
                  <Text style={styles.moreInfoButtonText}>Ver información completa</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

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
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.createOptionsButtons}>
              <TouchableOpacity
                style={styles.createOptionButton}
                onPress={() => {
                  setShowCreateOptions(false);
                  handleCrearPost();
                }}
                activeOpacity={0.8}
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
            <Text style={styles.followModalTitle}>Seguidores</Text>
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
                      <Text style={styles.avatarText}>
                        {item.nombre.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.nombre}</Text>
                    {item.username && (
                      <Text style={styles.userUsername}>@{item.username}</Text>
                    )}
                    {item.bio && (
                      <Text style={styles.userBio} numberOfLines={2}>
                        {item.bio}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <IconSymbol ios_icon_name="person.2" android_material_icon_name="people" size={64} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>No hay seguidores aún</Text>
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
            <Text style={styles.followModalTitle}>Siguiendo</Text>
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
                      <Text style={styles.avatarText}>
                        {item.nombre.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.nombre}</Text>
                    {item.username && (
                      <Text style={styles.userUsername}>@{item.username}</Text>
                    )}
                    {item.bio && (
                      <Text style={styles.userBio} numberOfLines={2}>
                        {item.bio}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <IconSymbol ios_icon_name="person.2" android_material_icon_name="people" size={64} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>No sigue a nadie aún</Text>
                </View>
              }
            />
          )}
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
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: colors.headerText,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
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
    width: '100%',
  },
  ownerButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerRowButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  ownerButtonIconContainer: {
    marginBottom: 4,
  },
  ownerRowButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  visitorButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visitorRowButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  visitorRowButtonFollowing: {
    backgroundColor: colors.primary,
  },
  visitorRowButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  visitorRowButtonTextFollowing: {
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
    padding: 16,
  },
  empleoHeader: {
    marginBottom: 20,
  },
  empleoHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  empleoHeaderSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
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
    flex: 1,
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
  followModalHeader: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  followModalTitle: {
    fontSize: 20,
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
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  userBio: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
});
