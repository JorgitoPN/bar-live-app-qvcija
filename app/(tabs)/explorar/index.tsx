
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPLORAR SCREEN - REACT QUERY + FLASHLIST v7.1.0 (SCROLL RESET + FILTER SYNC)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 🎯 NEW IN v7.1.0 (SCROLL & FILTER FIXES):
 * 1️⃣ SCROLL RESET: Auto-scroll to top when filters change
 * 2️⃣ FILTER SYNC: Advanced filters use same useFilterStore as category bar
 * 3️⃣ TAB BEHAVIOR: Tap "Explorar" tab → scroll to top + refetch
 * 4️⃣ STRICT 5-TIER: Maintains v7.0.0 sorting logic
 * 
 * ✅ SORTING LOGIC (v7.0.0 - MAINTAINED):
 * 1️⃣ TIER 1: Destacados Abiertos (< 50km) - HIGHEST PRIORITY
 * 2️⃣ TIER 2: Locales Abiertos (Estándar) - SECOND PRIORITY
 * 3️⃣ TIER 3: Sin Información de Horario - THIRD PRIORITY
 * 4️⃣ TIER 4: Destacados Cerrados (< 50km) - FOURTH PRIORITY
 * 5️⃣ TIER 5: Locales Cerrados (Estándar) - LOWEST PRIORITY
 * 
 * 🚀 RESULTADO v7.1.0:
 * - Filtros cambian → Scroll automático al inicio ✅
 * - Filtros avanzados → Sincronizados con categorías ✅
 * - Tap en tab "Explorar" → Scroll + refetch ✅
 * - Ordenamiento: Abiertos → Sin info → Cerrados 🎯
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import FiltrosAvanzadosSheet from '@/components/home/FiltrosAvanzadosSheet';
import { colors } from '@/styles/commonStyles';
import { scaleFontSize, scaleIconSize, getContentBottomPadding } from '@/utils/androidScaling';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useFilterStore } from '@/src/store/useFilterStore';
import { getOptimizedUserLocation } from '@/utils/locationUtils';
import LocalCardOptimized from '@/components/explorar/LocalCardOptimized';
import { intelligentPreloader } from '@/utils/intelligentPreloader';
import { useBaresQuery } from '@/hooks/useBaresQuery';
import { getEstadoLocal } from '@/utils/timeUtils';
import { useScrollToTop } from '@react-navigation/native';

// ✅ FIX: Wrap FlashList with Animated for native scroll events
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface Venue {
  id: string;
  nombre: string;
  direccion: string;
  imagenes?: string[];
  imagen_url?: string;
  galeria_urls?: string[];
  esta_abierto?: boolean;
  destacado?: boolean;
  distance_km?: number;
  rating?: number;
  google_rating?: number;
  barlive_types?: string[];
  barlive_type?: string;
  latitud?: number;
  longitud?: number;
  horarios_completos?: Record<string, string[]>;
  coordenadas?: { lat: number; lng: number };
  distancia?: number;
  estadoCompleto?: any;
  estaAbierto?: boolean;
  nuevo?: boolean;
}

interface Category {
  id: string;
  nombre: string;
  iosIcon: string;
  androidIcon: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const HEADER_MAX_HEIGHT = Platform.OS === 'android' ? 200 : 240;
const HEADER_MIN_HEIGHT = 0;
const ITEMS_PER_PAGE = 20;
const PRELOAD_THRESHOLD = 0.5;
const SCROLL_THROTTLE = 16;

const CATEGORIAS: Category[] = [
  { id: 'todos', nombre: 'Todos', iosIcon: 'square.grid.2x2', androidIcon: 'apps' },
  { id: 'discotecas', nombre: 'Discotecas', iosIcon: 'music.note', androidIcon: 'music_note' },
  { id: 'pubs', nombre: 'Pubs', iosIcon: 'wineglass', androidIcon: 'local_bar' },
  { id: 'bares', nombre: 'Bares', iosIcon: 'cup.and.saucer', androidIcon: 'local_cafe' },
  { id: 'restaurantes', nombre: 'Restaurantes', iosIcon: 'fork.knife', androidIcon: 'restaurant' },
  { id: 'cafeterias', nombre: 'Cafeterías', iosIcon: 'cup.and.saucer.fill', androidIcon: 'local_cafe' },
];

const CATEGORIAS_EXCLUIDAS = ['terrazas', 'rooftops', 'lounge'];

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM HOOK: useDebounce
// ═══════════════════════════════════════════════════════════════════════════

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ExplorarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode } = useMode();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  // ✅ FIX 2: Use Zustand store directly for filter synchronization
  const filtros = useFilterStore(state => state.filtros);
  const selectedCategory = useFilterStore(state => state.selectedCategory);
  const setSelectedCategory = useFilterStore(state => state.setSelectedCategory);
  const limpiarFiltros = useFilterStore(state => state.limpiarFiltros);
  const hasActiveFilters = useFilterStore(state => state.hasActiveFilters);

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  
  const flashListRef = useRef<FlashList<Venue>>(null);
  const debouncedQuery = useDebounce(searchQuery, 500);
  
  // ✅ FIX 3: useScrollToTop for tab navigation behavior
  useScrollToTop(flashListRef as any);
  
  // ✅ v606.0: REACT QUERY - Global cache with infinite scroll
  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useBaresQuery({
    userLocation,
    selectedCategory,
    searchQuery: debouncedQuery,
    globalFiltros: filtros,
    pageSize: ITEMS_PER_PAGE,
  });
  
  // ✅ Flatten paginated data into single array
  const allVenues = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.venues);
  }, [data]);
  
  // ✅ FIX 4 v602: Animated header - FIXED to show on scroll up
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('up');
  
  // ✅ v602: Header animation with smooth timing
  const animateHeader = useCallback((direction: 'up' | 'down') => {
    Animated.timing(headerTranslateY, {
      toValue: direction === 'down' ? -HEADER_MAX_HEIGHT : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [headerTranslateY]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCATION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchLocation = async () => {
      try {
        console.log('[ExplorarScreen v7.1.0] 📍 Obteniendo ubicación del usuario...');
        const location = await getOptimizedUserLocation();
        
        if (isMounted && location) {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          setLocationReady(true);
          setLocationError(null);
          console.log('[ExplorarScreen v7.1.0] ✅ Ubicación obtenida:', location.coords);
        } else if (isMounted) {
          setLocationError('No se pudo obtener tu ubicación');
          setLocationReady(true);
          console.warn('[ExplorarScreen v7.1.0] ⚠️ No se pudo obtener ubicación');
        }
      } catch (error) {
        if (isMounted) {
          setLocationError('Error al obtener ubicación');
          setLocationReady(true);
          console.error('[ExplorarScreen v7.1.0] ❌ Error obteniendo ubicación:', error);
        }
      }
    };
    
    fetchLocation();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // ✅ FIX 1: SCROLL RESET ON FILTER CHANGE
  // ═══════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    console.log('[ExplorarScreen v7.1.0] 🔄 Filters changed - Scrolling to top');
    console.log('[ExplorarScreen v7.1.0] 📊 Active filters:', {
      category: selectedCategory,
      hasAdvancedFilters: hasActiveFilters,
      searchQuery: debouncedQuery,
    });
    
    // ✅ Scroll to top when filters change
    if (flashListRef.current) {
      flashListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [selectedCategory, filtros, debouncedQuery, hasActiveFilters]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA LOADING - v606.0 REACT QUERY (SIMPLIFIED)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // ✅ v7.0.0: INTELLIGENT PRELOAD - Fetch next page predictively
  const loadMoreVenues = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage && allVenues.length >= ITEMS_PER_PAGE) {
      console.log('[ExplorarScreen v7.1.0] 🚀 PRECARGA INTELIGENTE - Fetching next page');
      console.log('[ExplorarScreen v7.1.0] 📊 Items actuales:', allVenues.length);
      fetchNextPage();
    }
  }, [isFetchingNextPage, hasNextPage, allVenues.length, fetchNextPage]);

  // ✅ v7.1.0: PULL-TO-REFRESH - Force refetch from server
  const onRefresh = useCallback(() => {
    console.log('[ExplorarScreen v7.1.0] 🔄 Pull-to-refresh - Refetching from server...');
    refetch();
  }, [refetch]);

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  // ✅ v7.0.0: React Query handles refetching automatically when filters change
  // No manual refetch needed - queryKey includes all filters
  
  // ✅ v7.0.0: Prefetch images when data loads
  useEffect(() => {
    if (allVenues.length > 0) {
      intelligentPreloader.prefetchNextItems(0, allVenues, 'local');
    }
  }, [allVenues]);

  // ✅ v7.1.0: Scroll position persistence - React Query maintains data across navigation
  useFocusEffect(
    useCallback(() => {
      console.log('[ExplorarScreen v7.1.0] 👁️ Pantalla enfocada - Datos desde caché:', allVenues.length);
      
      return () => {
        console.log('[ExplorarScreen v7.1.0] 👁️ Pantalla desenfocada - Datos persisten en caché');
      };
    }, [allVenues.length])
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  // ✅ REMOVED: Frontend filtering is no longer needed - backend handles search
  // The backend now performs predictive search with ILIKE for better performance
  const filteredVenues = allVenues;

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'todos' && selectedCategory !== null) count++;
    if (debouncedQuery) count++;
    return count;
  }, [selectedCategory, debouncedQuery]);

  const handleCategoryChange = useCallback((categoryId: string) => {
    console.log('[ExplorarScreen v7.1.0] 🏷️ Cambiando categoría a:', categoryId);
    console.log('[ExplorarScreen v7.1.0] 🏷️ Category ID received:', categoryId);
    console.log('[ExplorarScreen v7.1.0] 🏷️ Will set to:', categoryId === 'todos' ? 'null (all)' : categoryId);
    
    // ✅ v7.1.0: Update category - React Query will handle cache invalidation automatically
    const newCategory = categoryId === 'todos' ? null : categoryId;
    setSelectedCategory(newCategory);
    
    console.log('[ExplorarScreen v7.1.0] ✅ Category changed - React Query will refetch automatically');
  }, [setSelectedCategory]);

  const clearFilters = useCallback(() => {
    console.log('[ExplorarScreen v7.1.0] 🧹 Limpiando filtros...');
    setSearchQuery('');
    limpiarFiltros();
  }, [limpiarFiltros]);

  // ═══════════════════════════════════════════════════════════════════════════
  // BADGE CALCULATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  const getBadgeInfo = useCallback((venue: Venue) => {
    if (venue.horarios_completos && Object.keys(venue.horarios_completos).length > 0) {
      const estado = getEstadoLocal(venue);
      
      const colorMap: Record<string, string> = {
        'bg-green-500': '#22C55E',
        'bg-orange-500': '#F97316',
        'bg-yellow-500': '#EAB308',
        'bg-red-500': '#EF4444',
        'bg-gray-400': '#9CA3AF',
      };
      
      const hexColor = colorMap[estado.claseBg || 'bg-gray-400'] || '#9CA3AF';
      
      return {
        text: estado.badge,
        color: hexColor,
      };
    }
    
    if (venue.esta_abierto === true) {
      return { text: 'Abierto ahora', color: '#22C55E' };
    } else if (venue.esta_abierto === false) {
      return { text: 'Cerrado ahora', color: '#EF4444' };
    } else {
      return { text: 'Sin info de horario', color: '#9CA3AF' };
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTION HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const handleToggleFavorito = useCallback(async (venueId: string, e?: any) => {
    if (e) e.stopPropagation();
    if (!user) {
      router.push('/auth/login-v6');
      return;
    }
    if (!venueId) return;
    await toggleFavorite(venueId);
  }, [user, router, toggleFavorite]);

  const handleNavigateToMap = useCallback(() => {
    router.push('/(tabs)/explorar/mapa');
  }, [router]);

  const handleClaimOrCreateLocal = useCallback(() => {
    if (!user) {
      router.push('/auth/account-required');
      return;
    }
    router.push('/solicitudes/solicitar-propiedad-v2');
  }, [user, router]);

  // ✅ FIX 3 v602: Apertura instantánea del modal - ULTRA OPTIMIZED
  const handleOpenAdvancedFilters = useCallback(() => {
    console.log('[ExplorarScreen v7.1.0] 🎯 Abriendo filtros avanzados - INSTANT RESPONSE');
    
    // ✅ v602: Respuesta INMEDIATA - sin requestAnimationFrame
    setShowAdvancedFilters(true);
  }, []);

  const handleCloseAdvancedFilters = useCallback(() => {
    console.log('[ExplorarScreen v7.1.0] 🔒 Cerrando filtros avanzados');
    setShowAdvancedFilters(false);
  }, []);

  const handleClearAdvancedFilters = useCallback(() => {
    console.log('[ExplorarScreen v7.1.0] 🧹 Limpiando filtros avanzados');
    limpiarFiltros();
  }, [limpiarFiltros]);

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const getModeLabel = useCallback(() => {
    if (currentMode === 'admin') return 'Admin';
    if (currentMode === 'propietario') return 'Propietario';
    return 'Cliente';
  }, [currentMode]);

  const getModeIcon = useCallback(() => {
    if (currentMode === 'admin') return { ios: 'shield.fill', android: 'admin_panel_settings' };
    if (currentMode === 'propietario') return { ios: 'building.2.fill', android: 'store' };
    return { ios: 'person.fill', android: 'person' };
  }, [currentMode]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const renderVenueCard = useCallback(({ item, index }: { item: Venue; index: number }) => {
    return (
      <LocalCardOptimized
        local={item}
        index={index}
        onPress={() => router.push(`/detalle/local?id=${item.id}`)}
        socialProfiles={new Map()}
        activeEvents={new Map()}
      />
    );
  }, [router]);

  const renderFooter = useCallback(() => {
    if (filteredVenues.length === 0 && hasActiveFilters) {
      return null;
    }

    if (!hasNextPage && filteredVenues.length > 0) {
      return (
        <View style={styles.footerContainer}>
          <Text style={[styles.footerText, { fontSize: scaleFontSize(14) }]}>
            ✅ Has visto todos los locales disponibles
          </Text>
        </View>
      );
    }

    // ✅ v606.0: SMART LOADING - Only show spinner when loading MORE pages (not initial load with cache)
    if (isFetchingNextPage && filteredVenues.length >= 20) {
      return (
        <View style={styles.footerLoadingContainer}>
          <View style={styles.footerLoadingHeader}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.footerText, { fontSize: scaleFontSize(14) }]}>
              Cargando más locales...
            </Text>
          </View>
        </View>
      );
    }

    return null;
  }, [filteredVenues.length, hasActiveFilters, hasNextPage, isFetchingNextPage]);

  const renderEmpty = useCallback(() => {
    // ✅ v7.0.0: SMART LOADING - Only show spinner if NO cached data AND loading
    if ((isLoading || isFetching) && allVenues.length === 0 && !data) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { fontSize: scaleFontSize(16) }]}>Cargando locales...</Text>
        </View>
      );
    }
    
    if (activeFiltersCount > 0 || hasActiveFilters) {
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
            {hasActiveFilters 
              ? 'Intenta ajustar los filtros avanzados' 
              : 'Intenta con otros filtros de búsqueda'}
          </Text>
          
          <View style={styles.emptyStateButtons}>
            {hasActiveFilters && (
              <TouchableOpacity 
                style={[styles.clearFiltersButton, styles.clearAdvancedButton]}
                onPress={handleClearAdvancedFilters}
                activeOpacity={0.7}
              >
                <IconSymbol 
                  ios_icon_name="slider.horizontal.3" 
                  android_material_icon_name="tune" 
                  size={scaleIconSize(16)} 
                  color={colors.headerText} 
                />
                <Text style={[styles.clearFiltersButtonText, { fontSize: scaleFontSize(14) }]}>
                  Limpiar filtros avanzados
                </Text>
              </TouchableOpacity>
            )}
            
            {activeFiltersCount > 0 && (
              <TouchableOpacity 
                style={styles.clearFiltersButton}
                onPress={clearFilters}
                activeOpacity={0.7}
              >
                <Text style={[styles.clearFiltersButtonText, { fontSize: scaleFontSize(14) }]}>
                  Limpiar todos los filtros
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
  }, [isLoading, isFetching, allVenues.length, data, activeFiltersCount, hasActiveFilters, handleClearAdvancedFilters, clearFilters]);

  const modeIcon = getModeIcon();

  // ✅ v603: OPTIMIZED SCROLL HANDLER - Throttled para mejor rendimiento
  const scrollThrottleTimer = useRef<NodeJS.Timeout | null>(null);
  
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { 
      useNativeDriver: true,
      listener: (event: any) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const diff = currentScrollY - lastScrollY.current;
        
        // ✅ v603: Throttle para evitar cálculos excesivos
        if (scrollThrottleTimer.current) {
          return;
        }
        
        scrollThrottleTimer.current = setTimeout(() => {
          scrollThrottleTimer.current = null;
        }, SCROLL_THROTTLE);
        
        // ✅ Detectar dirección del scroll con threshold optimizado
        if (diff > 5 && currentScrollY > 50) {
          // Scroll hacia abajo - ocultar header
          if (scrollDirection.current !== 'down') {
            scrollDirection.current = 'down';
            Animated.timing(headerTranslateY, {
              toValue: -HEADER_MAX_HEIGHT,
              duration: 250,
              useNativeDriver: true,
            }).start();
          }
        } else if (diff < -5) {
          // Scroll hacia arriba - mostrar header
          if (scrollDirection.current !== 'up') {
            scrollDirection.current = 'up';
            Animated.timing(headerTranslateY, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }).start();
          }
        }
        
        lastScrollY.current = currentScrollY;
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  
  return (
    <View style={styles.container}>
      {/* ✅ FIX 4: ANIMATED HEADER */}
      <Animated.View 
        style={[
          styles.headerContainer,
          { transform: [{ translateY: headerTranslateY }] }
        ]}
      >
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.claimBannerInHeader}
              onPress={handleClaimOrCreateLocal}
              activeOpacity={0.8}
            >
              <IconSymbol 
                ios_icon_name="building.2.fill" 
                android_material_icon_name="store" 
                size={scaleIconSize(18)} 
                color={colors.headerText} 
              />
              <Text style={[styles.claimBannerInHeaderText, { fontSize: scaleFontSize(14) }]} numberOfLines={1}>
                ¿Tienes un local?
              </Text>
            </TouchableOpacity>

            <View style={styles.headerActions}>
              {user && (
                <TouchableOpacity 
                  style={styles.modeSelectorButton}
                  onPress={() => router.push('/explorar/selector-modo')}
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
                  size={scaleIconSize(28)} 
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
        
          <View style={styles.compactSearchRow}>
            <View style={styles.searchContainer}>
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
                  onPress={() => setSearchQuery('')}
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
            
            <View style={styles.filterButtonContainer}>
              <TouchableOpacity 
                onPress={handleOpenAdvancedFilters}
                style={styles.filterIconButtonCompact}
                activeOpacity={0.7}
              >
                <IconSymbol 
                  ios_icon_name="slider.horizontal.3" 
                  android_material_icon_name="tune" 
                  size={scaleIconSize(20)} 
                  color={colors.headerText} 
                />
                {hasActiveFilters && (
                  <View style={styles.filterActiveDot} />
                )}
              </TouchableOpacity>
              
              {hasActiveFilters && (
                <TouchableOpacity 
                  onPress={handleClearAdvancedFilters}
                  style={styles.clearAdvancedFiltersButton}
                  activeOpacity={0.7}
                >
                  <IconSymbol 
                    ios_icon_name="xmark.circle.fill" 
                    android_material_icon_name="cancel" 
                    size={scaleIconSize(18)} 
                    color={colors.headerText} 
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
            contentContainerStyle={styles.categoriesContent}
            keyboardShouldPersistTaps="handled"
          >
            {CATEGORIAS.map((categoria) => {
              const isSelected = (categoria.id === 'todos' && !selectedCategory) || selectedCategory === categoria.id;
              
              return (
                <TouchableOpacity
                  key={categoria.id}
                  style={styles.categoriaButtonCompact}
                  onPress={() => handleCategoryChange(categoria.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.categoriaIconContainerCompact,
                      isSelected && styles.categoriaIconContainerActive,
                    ]}
                  >
                    <IconSymbol
                      ios_icon_name={categoria.iosIcon}
                      android_material_icon_name={categoria.androidIcon}
                      size={Platform.OS === 'android' ? 16 : 18}
                      color={isSelected ? colors.primary : colors.white}
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoriaLabelCompact,
                      isSelected && styles.categoriaLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {categoria.nombre}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </LinearGradient>
      </Animated.View>

      {/* ✅ v7.1.0: FLASHLIST + REACT QUERY + STRICT 5-TIER SORTING - Status-based hierarchy + 60 FPS + Global Cache */}
      <AnimatedFlashList
        ref={flashListRef}
        data={filteredVenues}
        renderItem={renderVenueCard}
        keyExtractor={(item: Venue) => `local-${item.id}`}
        estimatedItemSize={450}
        initialNumToRender={10}
        contentContainerStyle={[
          styles.listContent,
          { 
            marginTop: HEADER_MAX_HEIGHT,
            paddingTop: 4,
            paddingBottom: getContentBottomPadding(100)
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={SCROLL_THROTTLE}
        onEndReached={filteredVenues.length > 0 ? loadMoreVenues : undefined}
        onEndReachedThreshold={PRELOAD_THRESHOLD}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        extraData={selectedCategory}
      />

      {/* ✅ FIX 2: ADVANCED FILTERS SHEET - Synchronized with Zustand store */}
      <FiltrosAvanzadosSheet
        visible={showAdvancedFilters}
        onClose={handleCloseAdvancedFilters}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

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
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? 36 : 50,
    paddingBottom: Platform.OS === 'android' ? 4 : 6,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 4 : 6,
  },
  claimBannerInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
    maxWidth: '60%',
    marginRight: 12,
  },
  claimBannerInHeaderText: {
    fontWeight: '600',
    color: colors.headerText,
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
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
  compactSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Platform.OS === 'android' ? 4 : 6,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 6,
    height: 40,
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
  filterButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterIconButtonCompact: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: colors.headerText,
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  clearAdvancedFiltersButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  categoriesScroll: {
    marginBottom: Platform.OS === 'android' ? 4 : 6,
    marginRight: -16,
  },
  categoriesContent: {
    paddingHorizontal: 0,
    paddingRight: 16,
    gap: 16,
  },
  categoriaButtonCompact: {
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
  },
  categoriaIconContainerCompact: {
    width: Platform.OS === 'android' ? 36 : 40,
    height: Platform.OS === 'android' ? 36 : 40,
    borderRadius: Platform.OS === 'android' ? 9 : 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Platform.select({
      android: {
        elevation: 0,
      },
    }),
  },
  categoriaIconContainerActive: {
    borderColor: colors.white,
    backgroundColor: colors.white,
  },
  categoriaLabelCompact: {
    fontSize: Platform.OS === 'android' ? scaleFontSize(11) : 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  categoriaLabelActive: {
    color: colors.white,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  footerContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
    minHeight: 60,
  },
  footerLoadingContainer: {
    paddingVertical: 20,
    minHeight: 100,
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
  emptyStateButtons: {
    marginTop: 20,
    gap: 12,
    alignItems: 'center',
  },
  clearFiltersButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearAdvancedButton: {
    backgroundColor: '#EF4444',
  },
  clearFiltersButtonText: {
    fontWeight: '600',
    color: colors.headerText,
  },
});
