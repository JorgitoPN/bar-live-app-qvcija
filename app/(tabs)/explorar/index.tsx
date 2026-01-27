
import ProfileSwitcher from '@/components/perfil/ProfileSwitcher';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useMode } from '@/contexts/ModeContext';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getSearchBoxHeight,
  getCategoryIconSize,
  getCategoryIconInnerSize,
  scaleFontSize,
  scaleIconSize,
  getHeaderTitleSize,
  getHeaderIconSize,
  getContentBottomPadding,
} from '@/utils/androidScaling';
import { useRouter } from 'expo-router';
import { getEstadoLocal } from '@/utils/timeUtils';
import { IconSymbol } from '@/components/IconSymbol';
import LoginPrompt from '@/components/common/LoginPrompt';
import * as Location from 'expo-location';
import { calcularDistancia } from '@/utils/locationUtils';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { useFavorites } from '@/contexts/FavoritesContext';

// ✅ CRITICAL PERFORMANCE FIX v229.0: INFINITE SCROLL WITH PROPER PAGINATION
const ITEMS_PER_PAGE = 20;

// ✅ COMPACT HEADER v265.0: Reduced header height significantly
const HEADER_MAX_HEIGHT = Platform.OS === 'android' ? 180 : 220;
const HEADER_MIN_HEIGHT = Platform.OS === 'android' ? 0 : 0;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

const PROVINCIAS = [
  'Todas',
  'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila', 'Badajoz',
  'Barcelona', 'Burgos', 'Cáceres', 'Cádiz', 'Cantabria', 'Castellón', 'Ciudad Real',
  'Córdoba', 'Cuenca', 'Girona', 'Granada', 'Guadalajara', 'Guipúzcoa', 'Huelva',
  'Huesca', 'Islas Baleares', 'Jaén', 'La Coruña', 'La Rioja', 'Las Palmas', 'León',
  'Lleida', 'Lugo', 'Madrid', 'Málaga', 'Murcia', 'Navarra', 'Ourense', 'Palencia',
  'Pontevedra', 'Salamanca', 'Santa Cruz de Tenerife', 'Segovia', 'Sevilla', 'Soria',
  'Tarragona', 'Teruel', 'Toledo', 'Valencia', 'Valladolid', 'Vizcaya', 'Zamora', 'Zaragoza'
];

const CATEGORIAS = [
  { id: 'todas', nombre: 'Todas', iosIcon: 'sparkles', androidIcon: 'star' },
  { id: 'cafe', nombre: 'Cafés', iosIcon: 'cup.and.saucer.fill', androidIcon: 'local_cafe' },
  { id: 'restaurante', nombre: 'Restaurantes', iosIcon: 'fork.knife', androidIcon: 'restaurant' },
  { id: 'bar', nombre: 'Bares', iosIcon: 'wineglass.fill', androidIcon: 'local_bar' },
  { id: 'pub', nombre: 'Pubs', iosIcon: 'mug.fill', androidIcon: 'sports_bar' },
  { id: 'cocteleria', nombre: 'Coctelería', iosIcon: 'wineglass', androidIcon: 'liquor' },
  { id: 'discoteca', nombre: 'Discotecas', iosIcon: 'music.note', androidIcon: 'nightlife' },
];

/**
 * ✅ EXPLORAR SCREEN v264.0 - OPTIMISTIC UI FOR FAVORITES
 * 
 * NEW FEATURES v264.0:
 * - ✅ OPTIMISTIC UI: Uses FavoritesContext for instant heart icon updates
 * - ✅ NO LOADING INDICATORS: Heart icon changes immediately
 * - ✅ BACKGROUND SYNC: Server request happens asynchronously
 * - ✅ ERROR HANDLING: Reverts UI state if server request fails
 * 
 * Previous fixes maintained (v240.0):
 * - ✅ CRITICAL: TextInput is DIRECTLY in return (no conditional rendering)
 * - ✅ CRITICAL: Controlled component with value={searchQuery}
 * - ✅ CRITICAL: Debounce with useEffect + cleanup (300ms)
 * - ✅ CRITICAL: Separate states: searchQuery (immediate) vs debouncedQuery (filtered)
 * - ✅ CRITICAL: FlatList has keyboardShouldPersistTaps="handled"
 * - ✅ CRITICAL: TextInput has blurOnSubmit={false}
 * - ✅ CRITICAL: No component functions declared inside parent
 */

export default function ExplorarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode, setCurrentMode, activeProfileType, activeLocalData } = useMode();
  const { prefetchNextPage } = useGlobalData();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const [dataReady, setDataReady] = useState(false);
  const [displayedLocales, setDisplayedLocales] = useState<any[]>([]);
  const [allLoadedLocales, setAllLoadedLocales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // ✅ FIX v240.0: Controlled input state (STABLE)
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [socialProfiles, setSocialProfiles] = useState<Map<string, boolean>>(new Map());
  const [showModeSelectorModal, setShowModeSelectorModal] = useState(false);
  
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState('Todas');

  const scrollY = useRef(0);
  const lastScrollY = useRef(0);
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastFiltersRef = useRef<string>('');
  const hasLoadedInitialDataRef = useRef(false);

  // ✅ FIX v240.0: Debounce with cleanup (300ms)
  useEffect(() => {
    console.log('[Explorar v264.0] 📝 Search query changed:', searchQuery);
    
    const timer = setTimeout(() => {
      console.log('[Explorar v264.0] 🔍 Applying debounced search');
      setDebouncedQuery(searchQuery);
    }, 300);
    
    // Cleanup function - CRITICAL
    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const isValidSpainCoordinate = useCallback((lat: number, lng: number): boolean => {
    const MIN_LAT = 27.0;
    const MAX_LAT = 44.0;
    const MIN_LNG = -18.5;
    const MAX_LNG = 5.0;
    
    const isValid = lat >= MIN_LAT && lat <= MAX_LAT && lng >= MIN_LNG && lng <= MAX_LNG;
    
    if (!isValid) {
      console.warn('[Explorar v264.0] ⚠️ Invalid coordinates detected:', { lat, lng });
    }
    
    return isValid;
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    (async () => {
      try {
        console.log('[Explorar v264.0] 📍 Step 1: Requesting location permission...');
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (!isMounted) return;
        
        if (status !== 'granted') {
          console.log('[Explorar v264.0] ⚠️ Location permission denied - proceeding without location');
          setLocationError('Permiso de ubicación denegado. Las distancias no estarán disponibles.');
          setLocationReady(true);
          return;
        }

        console.log('[Explorar v264.0] 📍 Step 2: Getting current position...');
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        if (!isMounted) return;
        
        const lat = location.coords.latitude;
        const lng = location.coords.longitude;
        
        console.log('[Explorar v264.0] 📍 Step 3: Location obtained:', { lat, lng });
        
        if (!isValidSpainCoordinate(lat, lng)) {
          console.error('[Explorar v264.0] ❌ Location outside Spain bounds!');
          setLocationError('Ubicación fuera de España. Mostrando todos los locales.');
          setUserLocation(null);
          setLocationReady(true);
          return;
        }
        
        setUserLocation({ lat, lng });
        setLocationError(null);
        console.log('[Explorar v264.0] ✅ Step 4: Valid location set:', { lat, lng });
        console.log('[Explorar v264.0] 🎯 Step 5: Marking location as READY - data will now load');
        setLocationReady(true);
        
      } catch (error: any) {
        if (!isMounted) return;
        console.error('[Explorar v264.0] ❌ Error getting location:', error);
        setLocationError('No se pudo obtener la ubicación. Mostrando todos los locales.');
        setUserLocation(null);
        setLocationReady(true);
      }
    })();
    
    return () => {
      isMounted = false;
    };
  }, [isValidSpainCoordinate]);

  const loadLocales = useCallback(async (page: number = 1, append: boolean = false) => {
    console.log('[Explorar v264.0] 🚀 loadLocales called - page:', page, 'append:', append, 'locationReady:', locationReady);
    
    if (!locationReady && !hasLoadedInitialDataRef.current) {
      console.log('[Explorar v264.0] ⏸️ Location not ready yet, waiting...');
      return;
    }
    
    if (isLoadingMore && append) {
      console.log('[Explorar v264.0] ⏸️ Already loading more, skipping...');
      return;
    }

    const filtersKey = `${selectedCategory}-${provinciaSeleccionada}`;
    const filtersChanged = filtersKey !== lastFiltersRef.current;

    if (filtersChanged) {
      console.log('[Explorar v264.0] 🔄 Filters changed, resetting...');
      lastFiltersRef.current = filtersKey;
      setCurrentPage(1);
      setAllLoadedLocales([]);
      setDisplayedLocales([]);
      setDataReady(false);
      setHasMore(true);
      setIsLoadingMore(false);
      page = 1;
      append = false;
    }

    if (append) {
      console.log('[Explorar v264.0] 📥 Setting isLoadingMore = true');
      setIsLoadingMore(true);
    } else {
      if (!hasLoadedInitialDataRef.current) {
        console.log('[Explorar v264.0] ⚡ First load - showing skeleton UI');
        setInitialLoading(true);
        setDataReady(false);
      }
    }

    try {
      console.log('[Explorar v264.0] 📡 Loading page', page, 'from server...');
      
      const hasValidLocation = userLocation && isValidSpainCoordinate(userLocation.lat, userLocation.lng);
      
      const locationParams = hasValidLocation 
        ? { user_lat: userLocation.lat, user_lng: userLocation.lng }
        : { user_lat: null, user_lng: null };
      
      console.log('[Explorar v264.0] 📍 Using location params:', locationParams);
      console.log('[Explorar v264.0] 🎯 hasValidLocation:', hasValidLocation);
      
      const offset = (page - 1) * ITEMS_PER_PAGE;
      const { data, error } = await supabase.rpc('get_locales_paginados', {
        ...locationParams,
        p_limit: ITEMS_PER_PAGE,
        p_offset: offset,
      });

      if (error) {
        console.error('[Explorar v264.0] Error loading locales:', error);
        throw error;
      }

      console.log('[Explorar v264.0] ✅ Loaded', data?.length || 0, 'locales from server');

      if (data && data.length > 0) {
        const transformedLocales = data.map((local: any) => {
          let distanciaKm = null;
          
          if (hasValidLocation && local.latitud && local.longitud) {
            const localLat = parseFloat(local.latitud);
            const localLng = parseFloat(local.longitud);
            
            if (!isNaN(localLat) && !isNaN(localLng)) {
              distanciaKm = calcularDistancia(
                userLocation.lat,
                userLocation.lng,
                localLat,
                localLng
              );
            }
          } else if (local.distancia_metros !== null && local.distancia_metros !== undefined) {
            distanciaKm = Number(local.distancia_metros) / 1000;
          }
          
          const estaAbierto = local.is_open_now;
          const tieneHorarios = local.has_schedule_info;
          
          return {
            ...local,
            coordenadas: {
              lat: parseFloat(local.latitud),
              lng: parseFloat(local.longitud),
            },
            imagenes: local.galeria_urls || (local.imagen_url ? [local.imagen_url] : []),
            estaAbierto: estaAbierto,
            tieneHorarios: tieneHorarios,
            distancia: distanciaKm,
          };
        });

        if (append) {
          setAllLoadedLocales(prev => {
            const newLocales = [...prev, ...transformedLocales];
            console.log('[Explorar v264.0] ➕ Appending', transformedLocales.length, 'locales. Total now:', newLocales.length);
            return newLocales;
          });
        } else {
          console.log('[Explorar v264.0] 🔄 Replacing with', transformedLocales.length, 'locales');
          setAllLoadedLocales(transformedLocales);
          setDataReady(true);
        }

        const gotLessThanRequested = data.length < ITEMS_PER_PAGE;
        setHasMore(!gotLessThanRequested);
        setCurrentPage(page);

        const localIdsToCheck = transformedLocales.slice(0, 30).map((l: any) => l.id);
        if (localIdsToCheck.length > 0) {
          try {
            const { data: posts, error: postsError } = await supabase
              .from('posts')
              .select('local_id')
              .eq('tipo', 'local')
              .in('local_id', localIdsToCheck);

            if (!postsError && posts) {
              const newSocialProfiles = new Map();
              const localsWithPosts = new Set(posts.map(p => p.local_id));
              
              localIdsToCheck.forEach((localId: string) => {
                newSocialProfiles.set(localId, localsWithPosts.has(localId));
              });
              
              setSocialProfiles(prev => new Map([...prev, ...newSocialProfiles]));
            }
          } catch (error) {
            console.error('[Explorar v264.0] Error checking social profiles:', error);
          }
        }
        
        hasLoadedInitialDataRef.current = true;
      } else {
        console.log('[Explorar v264.0] ⚠️ No more data available');
        setHasMore(false);
        if (!append) {
          setAllLoadedLocales([]);
          setDataReady(true);
        }
      }
    } catch (error) {
      console.error('[Explorar v264.0] Error loading locales:', error);
      Alert.alert('Error', 'No se pudieron cargar los locales');
      setDataReady(true);
    } finally {
      setLoading(false);
      setInitialLoading(false);
      console.log('[Explorar v264.0] 📥 Setting isLoadingMore = false');
      setIsLoadingMore(false);
    }
  }, [userLocation, isValidSpainCoordinate, selectedCategory, provinciaSeleccionada, isLoadingMore, locationReady, allLoadedLocales]);

  // ✅ FIX v240.0: Filter using debounced query
  const filteredLocales = useMemo(() => {
    const query = debouncedQuery.toLowerCase().trim();
    
    let filtered = allLoadedLocales;
    
    if (selectedCategory && selectedCategory !== 'todas') {
      filtered = filtered.filter(local => {
        const barliveTypes = local.barlive_types || [];
        const barliveType = local.barlive_type || '';
        
        const categoryMap: Record<string, string[]> = {
          'cafe': ['cafe', 'cafeteria', 'cafetería'],
          'restaurante': ['restaurante', 'restaurant'],
          'bar': ['bar'],
          'pub': ['pub'],
          'cocteleria': ['cocteleria', 'cocktail', 'cóctel'],
          'discoteca': ['discoteca', 'nightclub', 'club', 'disco']
        };
        
        const targetCategories = categoryMap[selectedCategory] || [selectedCategory];
        
        const allCategories = [...barliveTypes, barliveType]
          .filter(c => c && c.trim())
          .map(c => c.toLowerCase().trim());
        
        for (const localCat of allCategories) {
          for (const targetCat of targetCategories) {
            if (localCat === targetCat || localCat.includes(targetCat) || targetCat.includes(localCat)) {
              return true;
            }
          }
        }
        
        return false;
      });
    }
    
    if (query) {
      filtered = filtered.filter(local => {
        const nombre = local.nombre?.toLowerCase() || '';
        const direccion = local.direccion?.toLowerCase() || '';
        const provincia = local.provincia?.toLowerCase() || '';
        const tipo = local.tipo?.toLowerCase() || '';
        const barliveTypes = (local.barlive_types || []).join(' ').toLowerCase();
        
        return nombre.includes(query) || 
               direccion.includes(query) || 
               provincia.includes(query) ||
               tipo.includes(query) ||
               barliveTypes.includes(query);
      });
    }

    return filtered;
  }, [allLoadedLocales, debouncedQuery, selectedCategory]);

  useEffect(() => {
    if (dataReady) {
      setDisplayedLocales(filteredLocales);
    }
  }, [filteredLocales, dataReady]);

  useEffect(() => {
    if (locationReady) {
      console.log('[Explorar v264.0] 🚀 Location is ready - loading initial data');
      loadLocales(1, false);
    }
  }, [locationReady, selectedCategory, provinciaSeleccionada]);

  const loadMoreLocales = useCallback(() => {
    console.log('[Explorar v264.0] 🔄 loadMoreLocales called - hasMore:', hasMore, 'isLoadingMore:', isLoadingMore, 'loading:', loading);
    
    if (!hasMore) {
      console.log('[Explorar v264.0] ⏸️ No more data available');
      return;
    }
    
    if (isLoadingMore) {
      console.log('[Explorar v264.0] ⏸️ Already loading more');
      return;
    }
    
    if (loading) {
      console.log('[Explorar v264.0] ⏸️ Initial loading in progress');
      return;
    }

    console.log('[Explorar v264.0] 📥 Loading page', currentPage + 1);
    loadLocales(currentPage + 1, true);
  }, [hasMore, isLoadingMore, loading, currentPage, loadLocales]);

  const onRefresh = async () => {
    console.log('[Explorar v264.0] 🔄 Manual refresh triggered');
    setRefreshing(true);
    setDataReady(false);
    setSearchQuery('');
    setDebouncedQuery('');
    setSelectedCategory('todas');
    setProvinciaSeleccionada('Todas');
    setCurrentPage(1);
    setAllLoadedLocales([]);
    setDisplayedLocales([]);
    setHasMore(true);
    setIsLoadingMore(false);
    
    await loadLocales(1, false);
    setRefreshing(false);
  };

  const clearFilters = useCallback(() => {
    console.log('[Explorar v264.0] 🧹 Clearing all filters');
    setSearchQuery('');
    setDebouncedQuery('');
    setSelectedCategory('todas');
    setProvinciaSeleccionada('Todas');
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (debouncedQuery.trim()) count++;
    if (selectedCategory !== 'todas') count++;
    if (provinciaSeleccionada !== 'Todas') count++;
    return count;
  }, [debouncedQuery, selectedCategory, provinciaSeleccionada]);

  // ✅ NEW v264.0: Use optimistic UI from FavoritesContext
  const handleToggleFavorito = useCallback(async (localId: string, e?: any) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (!user) {
      router.push('/auth/login-v6');
      return;
    }

    if (!localId) {
      return;
    }

    console.log('[Explorar v264.0] ⚡ User tapped favorite button - toggling with OPTIMISTIC UI');
    
    // ✅ OPTIMISTIC UI: toggleFavorite updates UI instantly
    await toggleFavorite(localId);
    
    console.log('[Explorar v264.0] ✅ Favorite toggle completed (optimistic UI + background sync)');
  }, [user, router, toggleFavorite]);

  const handleComoLlegar = useCallback((local: any, e: any) => {
    e.stopPropagation();
    const { lat, lng } = local.coordenadas;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url);
  }, []);

  const handlePerfilSocial = useCallback((localId: string, e: any) => {
    e.stopPropagation();
    router.push(`/perfil/local?localId=${localId}`);
  }, [router]);

  const handleNavigateToMap = () => {
    router.push('/(tabs)/explorar/mapa');
  };

  const handleClaimOrCreateLocal = () => {
    if (!user) {
      router.push('/auth/account-required');
      return;
    }
    
    router.push('/solicitudes/solicitar-propiedad-ultra-simple');
  };

  const getModeLabel = () => {
    if (currentMode === 'admin') return 'Admin';
    if (currentMode === 'propietario') return 'Propietario';
    return 'Cliente';
  };

  const getModeIcon = () => {
    if (currentMode === 'admin') return { ios: 'shield.fill', android: 'admin_panel_settings' };
    if (currentMode === 'propietario') return { ios: 'building.2.fill', android: 'store' };
    return { ios: 'person.fill', android: 'person' };
  };

  const handleModeChange = async (newMode: 'cliente' | 'propietario' | 'admin') => {
    try {
      await setCurrentMode(newMode);
      setShowModeSelectorModal(false);
    } catch (error) {
      console.error('[Explorar v264.0] Error changing mode:', error);
      Alert.alert('Error', 'No se pudo cambiar el modo');
    }
  };

  const handleScroll = useCallback((event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const diff = currentScrollY - lastScrollY.current;
    
    if (Math.abs(diff) > 5) {
      if (diff > 0 && currentScrollY > 50) {
        Animated.timing(headerTranslateY, {
          toValue: -HEADER_SCROLL_DISTANCE,
          duration: 250,
          useNativeDriver: true,
        }).start();
      } else if (diff < 0) {
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    }
    
    lastScrollY.current = currentScrollY;
    scrollY.current = currentScrollY;
  }, [headerTranslateY]);

  const renderSkeletonCard = useCallback(() => {
    return (
      <View style={styles.card}>
        <View style={[styles.imageContainer, styles.skeletonImage]}>
          <View style={styles.skeletonShimmer} />
        </View>
        <View style={styles.content}>
          <View style={[styles.skeletonText, { width: '70%', height: 20, marginBottom: 8 }]} />
          <View style={[styles.skeletonText, { width: '90%', height: 14, marginBottom: 12 }]} />
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <View style={[styles.skeletonText, { width: 80, height: 24, borderRadius: 6 }]} />
            <View style={[styles.skeletonText, { width: 100, height: 24, borderRadius: 6 }]} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={[styles.skeletonText, { flex: 1, height: 40, borderRadius: 8 }]} />
            <View style={[styles.skeletonText, { flex: 1, height: 40, borderRadius: 8 }]} />
          </View>
        </View>
      </View>
    );
  }, []);

  const renderLocalCard = useCallback(({ item }: { item: any }) => {
    const imagenPrincipal = item.imagenes?.[0] || item.imagen_url;
    const isDestacado = item.destacado;
    const hasSocialProfile = socialProfiles.get(item.id) || false;
    
    // ✅ NEW v264.0: Use isFavorite from FavoritesContext for real-time updates
    const localIsFavorite = user ? isFavorite(item.id) : false;

    const getBadgeInfo = () => {
      if (item.estaAbierto === true) {
        return {
          text: 'Abierto ahora',
          color: '#22C55E',
        };
      } else if (item.estaAbierto === false) {
        return {
          text: 'Cerrado ahora',
          color: '#EF4444',
        };
      } else {
        return {
          text: 'Sin info de horario',
          color: '#9CA3AF',
        };
      }
    };

    const badgeInfo = getBadgeInfo();

    const shouldDimImage = () => {
      return item.estaAbierto === false;
    };

    const formatCategories = () => {
      const CATEGORIAS_EXCLUIDAS = ['terrazas', 'rooftops', 'lounge'];
      let categories = item.barlive_types || [];
      if (categories.length === 0 && item.barlive_type) {
        categories = [item.barlive_type];
      }
      
      return categories.filter((cat: string) => 
        !CATEGORIAS_EXCLUIDAS.includes(cat.toLowerCase())
      );
    };

    const categoriasAMostrar = formatCategories();

    const getRating = () => {
      if (item.rating && item.rating > 0) {
        return item.rating;
      }
      if (item.google_rating && item.google_rating > 0) {
        return item.google_rating;
      }
      return 0;
    };

    const displayRating = getRating();

    const iconSize = Platform.OS === 'android' ? scaleIconSize(14) : 14;
    const starIconSize = Platform.OS === 'android' ? scaleIconSize(12) : 12;
    const heartIconSize = Platform.OS === 'android' ? scaleIconSize(20) : 20;
    const actionIconSize = Platform.OS === 'android' ? scaleIconSize(16) : 16;

    return (
      <TouchableOpacity 
        style={[
          styles.card,
          isDestacado && styles.cardDestacado
        ]} 
        onPress={() => router.push(`/detalle/local?id=${item.id}`)}
        activeOpacity={0.9}
      >
        <View style={styles.imageContainer}>
          {imagenPrincipal ? (
            <Image
              source={{ uri: imagenPrincipal }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.image, styles.placeholderImage]}>
              <IconSymbol ios_icon_name="photo" android_material_icon_name="photo" size={48} color={colors.textSecondary} />
            </View>
          )}

          {shouldDimImage() && (
            <View style={styles.dimmedOverlay} />
          )}

          <View style={styles.imageOverlay} />

          {isDestacado && (
            <View style={styles.badgeDestacadoHeader}>
              <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={starIconSize} color="#92400E" />
              <Text style={[styles.badgeDestacadoHeaderText, { fontSize: scaleFontSize(12) }]}>Destacado</Text>
            </View>
          )}

          <View style={[
            styles.badgeEstadoSuperior, 
            { backgroundColor: badgeInfo.color + 'E6' },
            isDestacado && styles.badgeEstadoSuperiorConDestacado
          ]}>
            <Text style={[styles.badgeEstadoSuperiorText, { fontSize: scaleFontSize(12) }]} numberOfLines={1}>
              {badgeInfo.text}
            </Text>
          </View>

          {displayRating > 0 && (
            <View style={styles.ratingBadge}>
              <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={starIconSize} color="#FACC15" />
              <Text style={[styles.ratingBadgeText, { fontSize: scaleFontSize(12) }]}>{displayRating.toFixed(1)}</Text>
            </View>
          )}

          {item.nuevo && (
            <View style={styles.badgeNuevoContainer}>
              <View style={styles.badgeNuevo}>
                <Text style={[styles.badgeNuevoText, { fontSize: scaleFontSize(12) }]}>Nuevo</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.favoritoButton}
            onPress={(e) => {
              console.log('[Explorar v264.0] 👆 User tapped favorite button for local:', item.id);
              handleToggleFavorito(item.id, e);
            }}
          >
            <IconSymbol
              ios_icon_name={localIsFavorite ? "heart.fill" : "heart"}
              android_material_icon_name={localIsFavorite ? "favorite" : "favorite_border"}
              size={heartIconSize}
              color={localIsFavorite ? "#EF4444" : "#FFFFFF"}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.nombre, { fontSize: scaleFontSize(18) }]} numberOfLines={1}>
              {item.nombre}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol ios_icon_name="mappin" android_material_icon_name="location_on" size={iconSize} color={colors.textSecondary} />
            <Text style={[styles.infoText, { fontSize: scaleFontSize(14) }]} numberOfLines={1}>
              {item.direccion}
            </Text>
          </View>

          {categoriasAMostrar.length > 0 && (
            <View style={styles.categoriasContainer}>
              {categoriasAMostrar.map((categoria: string, index: number) => (
                <View key={index} style={styles.categoriaBadge}>
                  <Text style={[styles.categoriaIcon, { fontSize: scaleFontSize(12) }]}>{getCategoryIcon(categoria)}</Text>
                  <Text style={[styles.categoriaText, { fontSize: scaleFontSize(12) }]} numberOfLines={1}>{categoria}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.actionButtonsContainer}>
            {hasSocialProfile && (
              <TouchableOpacity 
                style={styles.perfilSocialButton} 
                onPress={(e) => handlePerfilSocial(item.id, e)}
              >
                <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={actionIconSize} color={colors.headerText} />
                <Text style={[styles.perfilSocialText, { fontSize: scaleFontSize(13) }]} numberOfLines={1}>Perfil Social</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[
                styles.comoLlegarButton,
                !hasSocialProfile && styles.comoLlegarButtonFull
              ]} 
              onPress={(e) => handleComoLlegar(item, e)}
            >
              <View style={styles.comoLlegarContent}>
                <View style={styles.comoLlegarLeft}>
                  <IconSymbol ios_icon_name="arrow.triangle.turn.up.right.diamond.fill" android_material_icon_name="directions" size={actionIconSize} color={colors.headerText} />
                  <Text style={[styles.comoLlegarText, { fontSize: scaleFontSize(13) }]} numberOfLines={1}>Cómo llegar</Text>
                </View>
                
                {item.distancia !== null && item.distancia !== undefined && (
                  <View style={styles.distanciaInButton}>
                    <IconSymbol ios_icon_name="location.fill" android_material_icon_name="my_location" size={iconSize} color={colors.headerText} />
                    <Text style={[styles.distanciaInButtonText, { fontSize: scaleFontSize(13) }]} numberOfLines={1}>
                      {item.distancia.toFixed(1)} km
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [router, socialProfiles, user, isFavorite, handleToggleFavorito, handleComoLlegar, handlePerfilSocial]);

  const renderFooter = () => {
    if (!hasMore && displayedLocales.length > 0) {
      return (
        <View style={styles.footerContainer}>
          <Text style={[styles.footerText, { fontSize: scaleFontSize(14) }]}>
            ✅ Has visto todos los locales disponibles
          </Text>
        </View>
      );
    }

    if (isLoadingMore) {
      return (
        <View style={styles.footerLoadingContainer}>
          <View style={styles.footerLoadingHeader}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.footerText, { fontSize: scaleFontSize(14) }]}>
              Cargando más locales...
            </Text>
          </View>
          {renderSkeletonCard()}
          {renderSkeletonCard()}
        </View>
      );
    }

    return null;
  };

  const renderEmpty = () => {
    if (initialLoading || !dataReady) {
      return (
        <View style={styles.skeletonContainer}>
          {[1, 2, 3, 4, 5].map((_, index) => (
            <React.Fragment key={index}>
              {renderSkeletonCard()}
            </React.Fragment>
          ))}
        </View>
      );
    }
    
    if (activeFiltersCount > 0 && displayedLocales.length === 0) {
      return (
        <View style={styles.emptyState}>
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={[styles.emptyText, { fontSize: scaleFontSize(18) }]}>No se encontraron resultados</Text>
          <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14) }]}>
            Intenta con otros filtros de búsqueda
          </Text>
          <TouchableOpacity 
            style={styles.clearFiltersButton}
            onPress={clearFilters}
            activeOpacity={0.7}
          >
            <Text style={[styles.clearFiltersButtonText, { fontSize: scaleFontSize(14) }]}>Limpiar filtros</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyState}>
        <IconSymbol
          ios_icon_name="map"
          android_material_icon_name="map"
          size={64}
          color={colors.textSecondary}
        />
        <Text style={[styles.emptyText, { fontSize: scaleFontSize(18) }]}>No hay locales disponibles</Text>
        <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14) }]}>
          Intenta buscar en otra ubicación
        </Text>
      </View>
    );
  };

  const searchBoxHeight = getSearchBoxHeight();
  const categoryIconSize = getCategoryIconSize();
  const categoryIconInnerSize = getCategoryIconInnerSize();
  const modeIcon = getModeIcon();

  const headerTitleSize = Platform.OS === 'android' ? scaleFontSize(32) : 32;
  const headerIconSize = Platform.OS === 'android' ? scaleIconSize(28) : 28;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.headerContainer,
          {
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <Text style={[styles.headerTitle, { fontSize: headerTitleSize }]}>Explorar</Text>
            <View style={styles.headerActions}>
              {user && (
                <TouchableOpacity 
                  style={styles.modeSelectorButton}
                  onPress={() => setShowModeSelectorModal(true)}
                  activeOpacity={0.7}
                >
                  <IconSymbol 
                    ios_icon_name={modeIcon.ios} 
                    android_material_icon_name={modeIcon.android} 
                    size={scaleIconSize(18)} 
                    color={colors.headerText} 
                  />
                  <Text style={[styles.modeSelectorText, { fontSize: scaleFontSize(13) }]} numberOfLines={1}>
                    {getModeLabel()}
                  </Text>
                  <IconSymbol 
                    ios_icon_name="chevron.down" 
                    android_material_icon_name="arrow_drop_down" 
                    size={scaleIconSize(16)} 
                    color={colors.headerText} 
                  />
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={styles.mapButton}
                onPress={handleNavigateToMap}
                activeOpacity={0.7}
              >
                <IconSymbol 
                  ios_icon_name="map.fill" 
                  android_material_icon_name="map" 
                  size={headerIconSize} 
                  color={colors.headerText} 
                />
              </TouchableOpacity>

              {activeFiltersCount > 0 && (
                <TouchableOpacity 
                  style={styles.clearFiltersHeaderButton}
                  onPress={clearFilters}
                  activeOpacity={0.7}
                >
                  <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={scaleIconSize(20)} color={colors.headerText} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {locationError && (
            <View style={styles.locationWarningBanner}>
              <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={scaleIconSize(16)} color="#F97316" />
              <Text style={[styles.locationWarningText, { fontSize: scaleFontSize(12) }]} numberOfLines={2}>
                {locationError}
              </Text>
            </View>
          )}
        
        {/* ✅ COMPACT HEADER v265.0: Redesigned compact layout */}
        <View style={styles.compactSearchRow}>
          <View style={[styles.searchContainer, { 
            height: searchBoxHeight,
            paddingVertical: Platform.OS === 'android' ? 8 : 8,
            flex: 1,
          }]}>
            <IconSymbol 
              ios_icon_name="magnifyingglass" 
              android_material_icon_name="search"
              size={scaleIconSize(18)} 
              color={colors.textSecondary}
            />
            <TextInput
              style={[styles.searchInput, { fontSize: scaleFontSize(15) }]}
              placeholder="Buscar..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              blurOnSubmit={false}
              enablesReturnKeyAutomatically={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={() => {
                  setSearchQuery('');
                  setDebouncedQuery('');
                }}
                style={styles.clearButton}
                activeOpacity={0.7}
              >
                <IconSymbol 
                  ios_icon_name="xmark.circle.fill" 
                  android_material_icon_name="cancel"
                  size={scaleIconSize(18)} 
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity 
            onPress={() => setMostrarFiltros(true)}
            style={styles.filterIconButtonCompact}
            activeOpacity={0.7}
          >
            <IconSymbol 
              ios_icon_name="slider.horizontal.3" 
              android_material_icon_name="tune" 
              size={scaleIconSize(20)} 
              color={colors.headerText} 
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
          keyboardShouldPersistTaps="handled"
        >
          {CATEGORIAS.map((categoria) => (
            <TouchableOpacity
              key={categoria.id}
              style={styles.categoriaButtonCompact}
              onPress={() => {
                console.log('[Explorar v265.0] 👆 Usuario seleccionó categoría:', categoria.id);
                setSelectedCategory(categoria.id);
              }}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.categoriaIconContainerCompact,
                  selectedCategory === categoria.id && styles.categoriaIconContainerActive,
                ]}
              >
                <IconSymbol
                  ios_icon_name={categoria.iosIcon}
                  android_material_icon_name={categoria.androidIcon}
                  size={Platform.OS === 'android' ? 16 : 18}
                  color={selectedCategory === categoria.id ? colors.primary : colors.white}
                />
              </View>
              <Text
                style={[
                  styles.categoriaLabelCompact,
                  selectedCategory === categoria.id && styles.categoriaLabelActive,
                ]}
                numberOfLines={1}
              >
                {categoria.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity 
          style={styles.claimBannerCompact}
          onPress={handleClaimOrCreateLocal}
          activeOpacity={0.8}
        >
          <View style={styles.claimBannerContentCompact}>
            <IconSymbol 
              ios_icon_name="building.2.fill" 
              android_material_icon_name="store" 
              size={scaleIconSize(20)} 
              color={colors.headerText} 
            />
            <Text style={[styles.claimBannerTitleCompact, { fontSize: scaleFontSize(14) }]}>
              ¿Tienes un local?
            </Text>
            <IconSymbol 
              ios_icon_name="chevron.right" 
              android_material_icon_name="chevron_right" 
              size={scaleIconSize(18)} 
              color={colors.headerText} 
            />
          </View>
        </TouchableOpacity>
        </LinearGradient>
      </Animated.View>

      <FlatList
        data={displayedLocales}
        renderItem={renderLocalCard}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { 
            // ✅ COMPACT HEADER v265.0: Added margin to prevent content being covered
            marginTop: Platform.OS === 'android' ? HEADER_MAX_HEIGHT + 48 : HEADER_MAX_HEIGHT,
            paddingTop: 16,
            paddingBottom: getContentBottomPadding(100)
          },
        ]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={loadMoreLocales}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />

      <Modal
        visible={showModeSelectorModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModeSelectorModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowModeSelectorModal(false)}
        >
          <Pressable style={styles.modeSelectorModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: scaleFontSize(20) }]}>Seleccionar Rol</Text>
              <TouchableOpacity onPress={() => setShowModeSelectorModal(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={scaleIconSize(24)} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modeOptionsContainer}>
              <TouchableOpacity
                style={[
                  styles.modeOption,
                  currentMode === 'cliente' && styles.modeOptionActive
                ]}
                onPress={() => handleModeChange('cliente')}
                activeOpacity={0.7}
              >
                <IconSymbol 
                  ios_icon_name="person.fill" 
                  android_material_icon_name="person" 
                  size={scaleIconSize(32)} 
                  color={currentMode === 'cliente' ? colors.primary : colors.text} 
                />
                <Text style={[
                  styles.modeOptionText,
                  { fontSize: scaleFontSize(16) },
                  currentMode === 'cliente' && styles.modeOptionTextActive
                ]}>
                  Cliente
                </Text>
                {currentMode === 'cliente' && (
                  <IconSymbol 
                    ios_icon_name="checkmark.circle.fill" 
                    android_material_icon_name="check_circle" 
                    size={scaleIconSize(24)} 
                    color={colors.primary} 
                  />
                )}
              </TouchableOpacity>

              {(user?.rol_app === 'propietario' || user?.rol_app === 'admin') && (
                <TouchableOpacity
                  style={[
                    styles.modeOption,
                    currentMode === 'propietario' && styles.modeOptionActive
                  ]}
                  onPress={() => handleModeChange('propietario')}
                  activeOpacity={0.7}
                >
                  <IconSymbol 
                    ios_icon_name="building.2.fill" 
                    android_material_icon_name="store" 
                    size={scaleIconSize(32)} 
                    color={currentMode === 'propietario' ? colors.primary : colors.text} 
                  />
                  <Text style={[
                    styles.modeOptionText,
                    { fontSize: scaleFontSize(16) },
                    currentMode === 'propietario' && styles.modeOptionTextActive
                  ]}>
                    Propietario
                  </Text>
                  {currentMode === 'propietario' && (
                    <IconSymbol 
                      ios_icon_name="checkmark.circle.fill" 
                      android_material_icon_name="check_circle" 
                      size={scaleIconSize(24)} 
                      color={colors.primary} 
                    />
                  )}
                </TouchableOpacity>
              )}

              {user?.rol_app === 'admin' && (
                <TouchableOpacity
                  style={[
                    styles.modeOption,
                    currentMode === 'admin' && styles.modeOptionActive
                  ]}
                  onPress={() => handleModeChange('admin')}
                  activeOpacity={0.7}
                >
                  <IconSymbol 
                    ios_icon_name="shield.fill" 
                    android_material_icon_name="admin_panel_settings" 
                    size={scaleIconSize(32)} 
                    color={currentMode === 'admin' ? colors.primary : colors.text} 
                  />
                  <Text style={[
                    styles.modeOptionText,
                    { fontSize: scaleFontSize(16) },
                    currentMode === 'admin' && styles.modeOptionTextActive
                  ]}>
                    Admin
                  </Text>
                  {currentMode === 'admin' && (
                    <IconSymbol 
                      ios_icon_name="checkmark.circle.fill" 
                      android_material_icon_name="check_circle" 
                      size={scaleIconSize(24)} 
                      color={colors.primary} 
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={mostrarFiltros}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMostrarFiltros(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setMostrarFiltros(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: scaleFontSize(20) }]}>Filtros</Text>
              <TouchableOpacity onPress={() => setMostrarFiltros(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={scaleIconSize(24)} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={true}
              bounces={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.filterSection}>
                <Text style={[styles.filterTitle, { fontSize: scaleFontSize(16) }]}>Categoría de Local</Text>
                <View style={styles.categoriesGrid}>
                  {CATEGORIAS.map((categoria) => (
                    <TouchableOpacity
                      key={categoria.id}
                      style={[
                        styles.categoryFilterItem,
                        selectedCategory === categoria.id && styles.categoryFilterItemActive,
                      ]}
                      onPress={() => {
                        console.log('[Explorar Modal v264.0] 👆 Usuario seleccionó categoría:', categoria.id);
                        setSelectedCategory(categoria.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <IconSymbol
                        ios_icon_name={categoria.iosIcon}
                        android_material_icon_name={categoria.androidIcon}
                        size={categoryIconInnerSize}
                        color={selectedCategory === categoria.id ? colors.white : colors.primary}
                      />
                      <Text
                        style={[
                          styles.categoryFilterText,
                          { fontSize: scaleFontSize(14) },
                          selectedCategory === categoria.id && styles.categoryFilterTextActive,
                        ]}
                      >
                        {categoria.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={[styles.filterTitle, { fontSize: scaleFontSize(16) }]}>Provincia</Text>
                <View style={styles.provinciasListContainer}>
                  {PROVINCIAS.map((provincia) => (
                    <TouchableOpacity
                      key={provincia}
                      style={[
                        styles.provinciaItem,
                        provinciaSeleccionada === provincia && styles.provinciaItemActive,
                      ]}
                      onPress={() => setProvinciaSeleccionada(provincia)}
                    >
                      <Text
                        style={[
                          styles.provinciaText,
                          { fontSize: scaleFontSize(15) },
                          provinciaSeleccionada === provincia && styles.provinciaTextActive,
                        ]}
                      >
                        {provincia}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.limpiarButton}
                onPress={() => {
                  setSelectedCategory('todas');
                  setProvinciaSeleccionada('Todas');
                }}
              >
                <Text style={[styles.limpiarButtonText, { fontSize: scaleFontSize(16) }]}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.aplicarButtonModal}
                onPress={() => setMostrarFiltros(false)}
              >
                <LinearGradient
                  colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                  style={styles.aplicarButtonGradient}
                >
                  <Text style={[styles.aplicarButtonText, { fontSize: scaleFontSize(16) }]}>Aplicar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: colors.background,
  },
  // ✅ COMPACT HEADER v265.0: Reduced padding significantly
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? 44 : 50,
    paddingBottom: Platform.OS === 'android' ? 8 : 12,
    paddingHorizontal: 16,
  },
  // ✅ COMPACT HEADER v265.0: Reduced margins
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 6 : 8,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    maxWidth: 150,
  },
  modeSelectorText: {
    fontWeight: '600',
    color: colors.headerText,
    flexShrink: 1,
  },
  mapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearFiltersHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  locationWarningText: {
    flex: 1,
    color: colors.headerText,
    fontWeight: '500',
  },
  // ✅ COMPACT HEADER v265.0: Compact search container
  compactSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Platform.OS === 'android' ? 6 : 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    padding: 0,
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
  },
  filterIconButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ✅ COMPACT HEADER v265.0: Compact filter button
  filterIconButtonCompact: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ✅ COMPACT HEADER v265.0: Reduced margins
  categoriesScroll: {
    marginBottom: Platform.OS === 'android' ? 6 : 8,
    marginRight: -16,
  },
  categoriesContent: {
    paddingHorizontal: 0,
    paddingRight: 16,
    gap: 16,
  },
  categoriaButton: {
    alignItems: 'center',
    gap: 6,
    minWidth: 70,
  },
  // ✅ COMPACT HEADER v265.0: Compact category button
  categoriaButtonCompact: {
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
  },
  categoriaIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  // ✅ COMPACT HEADER v265.0: Compact category icon
  categoriaIconContainerCompact: {
    width: Platform.OS === 'android' ? 36 : 40,
    height: Platform.OS === 'android' ? 36 : 40,
    borderRadius: Platform.OS === 'android' ? 9 : 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  categoriaIconContainerActive: {
    borderColor: colors.white,
    backgroundColor: colors.white,
  },
  categoriaLabel: {
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  // ✅ COMPACT HEADER v265.0: Compact category label
  categoriaLabelCompact: {
    fontSize: Platform.OS === 'android' ? 11 : 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  categoriaLabelActive: {
    color: colors.white,
    fontWeight: '700',
  },
  claimBanner: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    marginBottom: Platform.OS === 'android' ? 8 : 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  claimBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  claimBannerTextContainer: {
    flex: 1,
  },
  claimBannerTitle: {
    fontWeight: '700',
    color: colors.headerText,
    marginBottom: 2,
  },
  claimBannerSubtitle: {
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  // ✅ COMPACT HEADER v265.0: Compact claim banner
  claimBannerCompact: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    marginBottom: Platform.OS === 'android' ? 6 : 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  claimBannerContentCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    gap: 8,
  },
  claimBannerTitleCompact: {
    fontWeight: '600',
    color: colors.headerText,
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
  },
  locationErrorText: {
    marginTop: 8,
    color: '#F97316',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  footerContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
    minHeight: 60,
  },
  footerLoadingContainer: {
    paddingVertical: 20,
    minHeight: 600,
  },
  footerLoadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  footerText: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  clearFiltersButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  clearFiltersButtonText: {
    fontWeight: '600',
    color: colors.headerText,
  },
  skeletonContainer: {
    padding: 16,
  },
  skeletonImage: {
    backgroundColor: colors.cardBorder,
    overflow: 'hidden',
  },
  skeletonShimmer: {
    position: 'absolute',
    top: 0,
    left: -200,
    width: 200,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  skeletonText: {
    backgroundColor: colors.cardBorder,
    borderRadius: 4,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardDestacado: {
    borderWidth: 3,
    borderColor: '#FACC15',
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  badgeDestacadoHeader: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FACC15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 11,
  },
  badgeDestacadoHeaderText: {
    fontWeight: '700',
    color: '#92400E',
  },
  badgeEstadoSuperior: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
    maxWidth: '70%',
  },
  badgeEstadoSuperiorConDestacado: {
    top: 52,
  },
  badgeEstadoSuperiorText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 12,
  },
  ratingBadgeText: {
    fontWeight: '700',
    color: colors.headerText,
    letterSpacing: 0.3,
  },
  badgeNuevoContainer: {
    position: 'absolute',
    top: 56,
    right: 12,
    zIndex: 9,
  },
  badgeNuevo: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeNuevoText: {
    fontWeight: '700',
    color: colors.headerText,
  },
  favoritoButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nombre: {
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  infoText: {
    color: colors.textSecondary,
    flex: 1,
  },
  categoriasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoriaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    maxWidth: '48%',
  },
  categoriaIcon: {
  },
  categoriaText: {
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'capitalize',
    flexShrink: 1,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  perfilSocialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary + '99',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
    minWidth: 0,
  },
  perfilSocialText: {
    fontWeight: '600',
    color: colors.headerText,
    flexShrink: 1,
  },
  comoLlegarButton: {
    flex: 1,
    backgroundColor: colors.primary + '99',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 0,
  },
  comoLlegarButtonFull: {
    flex: 1,
  },
  comoLlegarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  comoLlegarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  comoLlegarText: {
    fontWeight: '600',
    color: colors.headerText,
    flexShrink: 1,
  },
  distanciaInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  distanciaInButtonText: {
    fontWeight: '600',
    color: colors.headerText,
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
    maxHeight: '80%',
  },
  modeSelectorModal: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontWeight: 'bold',
    color: colors.text,
  },
  modeOptionsContainer: {
    padding: 20,
    gap: 12,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  modeOptionText: {
    flex: 1,
    fontWeight: '600',
    color: colors.text,
  },
  modeOptionTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  modalScrollView: {
    maxHeight: '100%',
    paddingHorizontal: 20,
  },
  filterSection: {
    marginTop: 20,
    marginBottom: 16,
  },
  filterTitle: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minWidth: '47%',
  },
  categoryFilterItemActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryFilterText: {
    fontWeight: '600',
    color: colors.text,
  },
  categoryFilterTextActive: {
    color: colors.white,
  },
  provinciasListContainer: {
    gap: 8,
  },
  provinciaItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  provinciaItemActive: {
    backgroundColor: colors.primary,
  },
  provinciaText: {
    color: colors.text,
  },
  provinciaTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
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
    fontWeight: '600',
    color: colors.white,
  },
});
