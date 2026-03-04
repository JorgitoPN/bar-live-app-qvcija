
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 EXPLORAR SCREEN v32.3.0 - FIXED SORTING ORDER PRESERVATION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 🎯 NEW IN v32.3.0 (FIXED SORTING ORDER):
 * 1️⃣ PRESERVE DB ORDER: No re-sorting in frontend, respect database order ✅
 * 2️⃣ PROPER TIER DISPLAY: Show venues in exact order from RPC function ✅
 * 3️⃣ NO MIXING: Destacados, abiertos, sin info, cerrados in correct blocks ✅
 * 4️⃣ RESULT: Perfect 5-tier sorting as specified ✅
 * 
 * 🎯 v32.2.0 (FIXED PAGINATION SIZE):
 * 1️⃣ 20 PER PAGE: Restored to 20 items per page (was incorrectly set to 10) ✅
 * 2️⃣ PROPER ORDER: Venues respect priority tiers across all pages ✅
 * 3️⃣ STABLE PAGINATION: Cursor uses (tier, distance, id) for consistency ✅
 * 4️⃣ SMOOTH SCROLL: Infinite scroll with correct ordering ✅
 * 
 * ARCHITECTURAL PRINCIPLES:
 * - ✅ Separation of Concerns (UI, Logic, Data)
 * - ✅ Single Responsibility Principle
 * - ✅ DRY (Don't Repeat Yourself)
 * - ✅ SOLID principles throughout
 * - ✅ Defensive programming (null checks everywhere)
 * - ✅ Performance-first mindset
 * - ✅ User experience above all
 * - ✅ NO FRONTEND SORTING - Respect database order
 * 
 * PERFORMANCE TARGETS:
 * - Initial UI: <50ms (skeleton) ⚡⚡⚡
 * - Data load: <200ms (background) ⚡⚡
 * - Transition: 300ms smooth fade-in ✨
 * - Scroll: 60fps smooth 🎯
 * - Memory: <100MB for 200 items 💾
 * - Network: Optimized payloads 📡
 * - Battery: Minimal drain 🔋
 */

import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
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
  Dimensions,
  Alert,
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
import { useFilterStore } from '@/src/store/useFilterStore';
import { getOptimizedUserLocation } from '@/utils/locationUtils';
import LocalCardOptimizedV2 from '@/components/explorar/LocalCardOptimizedV2';
import { useBaresQuery } from '@/hooks/useBaresQuery';
import { useScrollToTop } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useGlobalDataStore } from '@/src/store/useGlobalDataStore';

// ✅ Animated FlashList for native scroll events
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
  sorting_tier?: number;
}

interface Category {
  id: string;
  nombre: string;
  iosIcon: string;
  androidIcon: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS - Tuned for optimal performance
// ═══════════════════════════════════════════════════════════════════════════

const HEADER_MAX_HEIGHT = Platform.OS === 'android' ? 200 : 240;
const ITEMS_PER_PAGE = 20; // ✅ v32.2: FIXED - 20 items per page as specified
const PRELOAD_THRESHOLD = 0.5; // ✅ Load next page at 50% scroll
const SCROLL_THROTTLE = 16; // 60fps
const INITIAL_NUM_TO_RENDER = 10; // ✅ Initial render count
const MAX_TO_RENDER_PER_BATCH = 10; // ✅ Batch render count
const WINDOW_SIZE = 5; // ✅ Window size for recycling
const ESTIMATED_ITEM_SIZE = 350;
const DRAW_DISTANCE = Dimensions.get('window').height * 2; // ✅ Draw distance

// ✅ DEFAULT LOCATION: Madrid center
const DEFAULT_LOCATION = {
  latitude: 40.4168,
  longitude: -3.7038,
};

const CATEGORIAS: Category[] = [
  { id: 'todos', nombre: 'Todos', iosIcon: 'square.grid.2x2', androidIcon: 'apps' },
  { id: 'discotecas', nombre: 'Discotecas', iosIcon: 'music.note', androidIcon: 'music_note' },
  { id: 'pubs', nombre: 'Pubs', iosIcon: 'wineglass', androidIcon: 'local_bar' },
  { id: 'bares', nombre: 'Bares', iosIcon: 'cup.and.saucer', androidIcon: 'local_cafe' },
  { id: 'restaurantes', nombre: 'Restaurantes', iosIcon: 'fork.knife', androidIcon: 'restaurant' },
  { id: 'cafeterias', nombre: 'Cafeterías', iosIcon: 'cup.and.saucer.fill', androidIcon: 'local_cafe' },
];

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
// SKELETON CARD COMPONENT - BLOQUE 2: UI OPTIMISTA
// ═══════════════════════════════════════════════════════════════════════════

const SkeletonCard = memo(() => {
  // ✅ BLOQUE 2: Animated skeleton for better UX
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    shimmer.start();
    
    return () => shimmer.stop();
  }, [shimmerAnim]);
  
  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });
  
  return (
    <View style={styles.skeletonCard}>
      <Animated.View style={[styles.skeletonImage, { opacity: shimmerOpacity }]} />
      <View style={styles.skeletonContent}>
        <Animated.View style={[styles.skeletonLine, { width: '70%', height: 20, opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: '90%', height: 14, marginTop: 8, opacity: shimmerOpacity }]} />
        <View style={styles.skeletonBadges}>
          <Animated.View style={[styles.skeletonLine, { width: 80, height: 24, borderRadius: 6, opacity: shimmerOpacity }]} />
          <Animated.View style={[styles.skeletonLine, { width: 100, height: 24, borderRadius: 6, opacity: shimmerOpacity }]} />
        </View>
      </View>
    </View>
  );
});

SkeletonCard.displayName = 'SkeletonCard';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ExplorarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode } = useMode();
  const queryClient = useQueryClient();
  
  // ✅ Zustand store for filters
  const filtros = useFilterStore(state => state.filtros);
  const selectedCategory = useFilterStore(state => state.selectedCategory);
  const setSelectedCategory = useFilterStore(state => state.setSelectedCategory);
  const limpiarFiltros = useFilterStore(state => state.limpiarFiltros);
  const hasActiveFilters = useFilterStore(state => state.hasActiveFilters);
  
  // ✅ FASE 6: Circuit Breaker State
  const circuitBreaker = useGlobalDataStore(state => state.circuitBreaker);
  const resetCircuitBreaker = useGlobalDataStore(state => state.resetCircuitBreaker);

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number }>(DEFAULT_LOCATION);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [listKey, setListKey] = useState(0);
  
  const flashListRef = useRef<FlashList<Venue>>(null);
  const debouncedQuery = useDebounce(searchQuery, 500);
  
  // ✅ REACT QUERY - Optimized with v26.3.0 hook
  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
    error,
    isError,
  } = useBaresQuery({
    userLocation,
    selectedCategory,
    searchQuery: debouncedQuery,
    globalFiltros: filtros,
    pageSize: ITEMS_PER_PAGE,
  });
  
  // ✅ v32.3.0: CRITICAL - DO NOT RE-SORT! Preserve database order
  // The venues come from the RPC function in the correct 5-tier order
  const allVenues = useMemo(() => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[ExplorarScreen v32.3.0] 🔍 Processing venues - PRESERVING DB ORDER', {
      hasData: !!data,
      hasPages: !!data?.pages,
      pageCount: data?.pages?.length || 0,
      isLoading,
      isFetching,
      isError,
      error: error?.message,
    });
    
    if (!data?.pages) {
      console.log('[ExplorarScreen v32.3.0] ⚠️ No data.pages - returning empty array');
      console.log('═══════════════════════════════════════════════════════════');
      return [];
    }
    
    // ✅ v32.3.0: Simply flatten pages - DO NOT SORT!
    // The database already returns venues in the correct order
    const flatVenues = data.pages.flatMap(page => page?.venues || []);
    const uniqueVenues = Array.from(new Map(flatVenues.map(v => [v.id, v])).values());
    
    console.log('[ExplorarScreen v32.3.0] 📊 Venues processed - ORDER PRESERVED:', {
      total: flatVenues.length,
      unique: uniqueVenues.length,
      duplicates: flatVenues.length - uniqueVenues.length,
      hasData: uniqueVenues.length > 0,
      isLoading,
      isFetching,
      isCircuitOpen: circuitBreaker.isOpen,
      sampleOrder: uniqueVenues.slice(0, 10).map(v => ({
        nombre: v.nombre,
        tier: v.sorting_tier,
        abierto: v.esta_abierto,
        destacado: v.destacado,
        distancia: v.distancia?.toFixed(2),
      })),
    });
    console.log('[ExplorarScreen v32.3.0] ✅ RETURNING', uniqueVenues.length, 'venues IN DATABASE ORDER');
    console.log('═══════════════════════════════════════════════════════════');
    
    return uniqueVenues;
  }, [data, isLoading, isFetching, isError, error, circuitBreaker.isOpen]);
  
  const [showContent, setShowContent] = useState(true);
  const contentOpacity = useRef(new Animated.Value(1)).current;
  
  // ✅ SCROLL TO TOP & REFRESH
  const handleScrollToTopAndRefresh = useCallback(() => {
    console.log('[ExplorarScreen v32.3] 🚀 Scroll to top & refresh - Invalidating cache');
    
    // Step 1: Clear cache first to prevent stale data
    queryClient.resetQueries({ queryKey: ['bares_infinite_v26.3.0'] });
    
    // Step 2: Force remount to clear FlashList internal state
    setListKey(prev => prev + 1);
    
    // Step 3: Scroll to top after remount
    setTimeout(() => {
      if (flashListRef.current) {
        try {
          flashListRef.current.scrollToOffset({ offset: 0, animated: false });
        } catch (error) {
          console.warn('[ExplorarScreen v32.3] ⚠️ Scroll error:', error);
        }
      }
    }, 50);
    
    // Step 4: Refetch data
    setTimeout(() => {
      refetch();
    }, 100);
  }, [queryClient, refetch]);
  
  // ✅ v32.3: FORCE RESET cache on mount to ensure fresh data with correct ordering
  useEffect(() => {
    console.log('[ExplorarScreen v32.3] 🔄 FORCE RESETTING cache on mount (fixed ordering v26.3)');
    queryClient.resetQueries({ queryKey: ['bares_infinite_v26.3.0'] });
    
    // Force refetch after reset
    setTimeout(() => {
      console.log('[ExplorarScreen v32.3] 🔄 Forcing refetch after cache reset');
      refetch();
    }, 100);
  }, [queryClient, refetch]);
  
  // ✅ React Navigation integration
  useScrollToTop(
    useRef({
      scrollToTop: handleScrollToTopAndRefresh,
    })
  );
  
  // ✅ Animated header
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('up');

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCATION MANAGEMENT - Non-blocking
  // ═══════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchLocation = async () => {
      try {
        console.log('[ExplorarScreen v32.3.0] 📍 Fetching location (non-blocking)...');
        const location = await getOptimizedUserLocation();
        
        if (isMounted && location) {
          console.log('[ExplorarScreen v32.3.0] ✅ Location obtained:', {
            lat: location.coords.latitude.toFixed(4),
            lng: location.coords.longitude.toFixed(4),
          });
          
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          setLocationError(null);
        } else if (isMounted) {
          console.warn('[ExplorarScreen v32.3.0] ⚠️ Using default location (Madrid)');
          setLocationError('Usando ubicación por defecto (Madrid)');
        }
      } catch (error) {
        if (isMounted) {
          console.error('[ExplorarScreen v32.3.0] ❌ Location error:', error);
          setLocationError('Usando ubicación por defecto (Madrid)');
        }
      }
    };
    
    fetchLocation();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // SCROLL RESET ON FILTER CHANGE
  // ═══════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    console.log('[ExplorarScreen v32.3.0] 🔄 Filters changed - Resetting list');
    
    // Force remount FlashList to clear internal layout cache
    setListKey(prev => prev + 1);
    
    // Scroll to top after remount
    setTimeout(() => {
      if (flashListRef.current) {
        try {
          flashListRef.current.scrollToOffset({ offset: 0, animated: false });
        } catch (error) {
          console.warn('[ExplorarScreen v32.3.0] ⚠️ Scroll error:', error);
        }
      }
    }, 50);
  }, [selectedCategory, filtros, debouncedQuery, hasActiveFilters]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD MORE VENUES - With guard conditions
  // ═══════════════════════════════════════════════════════════════════════════
  
  const loadMoreVenues = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !error) {
      console.log('[ExplorarScreen v32.3.0] 🚀 Loading next page');
      fetchNextPage();
    } else {
      console.log('[ExplorarScreen v32.3.0] ⏸️ Load blocked:', {
        hasNextPage,
        isFetchingNextPage,
        hasError: !!error,
      });
    }
  }, [hasNextPage, isFetchingNextPage, error, fetchNextPage]);

  // ✅ PULL-TO-REFRESH
  const onRefresh = useCallback(() => {
    console.log('[ExplorarScreen v32.3.0] 🔄 Pull-to-refresh');
    refetch();
  }, [refetch]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'todos' && selectedCategory !== null) count++;
    if (debouncedQuery) count++;
    return count;
  }, [selectedCategory, debouncedQuery]);

  const handleCategoryChange = useCallback((categoryId: string) => {
    console.log('[ExplorarScreen v32.3.0] 🏷️ Category changed:', categoryId);
    const newCategory = categoryId === 'todos' ? null : categoryId;
    setSelectedCategory(newCategory);
  }, [setSelectedCategory]);

  const clearFilters = useCallback(() => {
    console.log('[ExplorarScreen v32.3.0] 🧹 Clearing filters');
    setSearchQuery('');
    limpiarFiltros();
  }, [limpiarFiltros]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTION HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  
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

  const handleOpenAdvancedFilters = useCallback(() => {
    setShowAdvancedFilters(true);
  }, []);

  const handleCloseAdvancedFilters = useCallback(() => {
    setShowAdvancedFilters(false);
  }, []);

  const handleClearAdvancedFilters = useCallback(() => {
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
    // ✅ Defensive check - ensure item exists and has required properties
    if (!item || !item.id) {
      console.warn('[ExplorarScreen v32.3.0] ⚠️ Invalid item at index:', index);
      return null;
    }
    
    return (
      <LocalCardOptimizedV2
        local={item}
        index={index}
        onPress={() => router.push(`/detalle/local?id=${item.id}`)}
        socialProfiles={new Map()}
        activeEvents={new Map()}
      />
    );
  }, [router]);
  
  const getItemType = useCallback(() => {
    return 'local-card';
  }, []);

  // ✅ FOOTER - Shows loading indicator or null
  const renderFooter = useCallback(() => {
    if (!hasNextPage) {
      return null;
    }

    if (allVenues.length === 0 && hasActiveFilters) {
      return null;
    }

    if (isFetchingNextPage && allVenues.length >= 20) {
      return (
        <View style={styles.footerLoadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.footerLoadingText, { fontSize: scaleFontSize(14) }]}>
            Cargando más locales...
          </Text>
        </View>
      );
    }

    return null;
  }, [allVenues.length, hasActiveFilters, hasNextPage, isFetchingNextPage]);

  const renderEmpty = useCallback(() => {
    // ✅ FASE 6: Circuit Breaker - Mostrar error amigable si está abierto
    if (circuitBreaker.isOpen) {
      const timeSinceLastFailure = Date.now() - circuitBreaker.lastFailureTime;
      const secondsRemaining = Math.ceil((30000 - timeSinceLastFailure) / 1000);
      
      return (
        <View style={styles.emptyState}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="error"
            size={64}
            color="#EF4444"
          />
          <Text style={[styles.emptyText, { fontSize: scaleFontSize(18) }]}>
            Servicio temporalmente no disponible
          </Text>
          <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14) }]}>
            Estamos experimentando problemas de conexión.{'\n'}
            {secondsRemaining > 0 
              ? `Reintentando en ${secondsRemaining} segundos...` 
              : 'Puedes intentar de nuevo ahora.'}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              resetCircuitBreaker();
              refetch();
            }}
            activeOpacity={0.7}
          >
            <IconSymbol 
              ios_icon_name="arrow.clockwise" 
              android_material_icon_name="refresh" 
              size={scaleIconSize(18)} 
              color={colors.headerText} 
            />
            <Text style={[styles.retryButtonText, { fontSize: scaleFontSize(14) }]}>
              Reintentar ahora
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // ✅ Skeleton loader
    if ((isLoading || isFetching) && allVenues.length === 0 && !data) {
      return (
        <View style={styles.skeletonContainer}>
          {[...Array(8)].map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </View>
      );
    }
    
    // Show error state
    if (isError && error) {
      return (
        <View style={styles.emptyState}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="warning"
            size={64}
            color="#EF4444"
          />
          <Text style={[styles.emptyText, { fontSize: scaleFontSize(18) }]}>
            Error al cargar locales
          </Text>
          <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14) }]}>
            {error?.message || 'Ocurrió un error inesperado'}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => refetch()}
            activeOpacity={0.7}
          >
            <IconSymbol 
              ios_icon_name="arrow.clockwise" 
              android_material_icon_name="refresh" 
              size={scaleIconSize(18)} 
              color={colors.headerText} 
            />
            <Text style={[styles.retryButtonText, { fontSize: scaleFontSize(14) }]}>
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    // Show empty state with filters
    if (activeFiltersCount > 0 || hasActiveFilters) {
      return (
        <View style={styles.emptyState}>
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={[styles.emptyText, { fontSize: scaleFontSize(18) }]}>
            No se encontraron resultados
          </Text>
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
    
    // Show generic empty state
    return (
      <View style={styles.emptyState}>
        <IconSymbol
          ios_icon_name="map"
          android_material_icon_name="map"
          size={64}
          color={colors.textSecondary}
        />
        <Text style={[styles.emptyText, { fontSize: scaleFontSize(18) }]}>
          No hay locales disponibles
        </Text>
        <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14) }]}>
          Intenta buscar en otra ubicación
        </Text>
      </View>
    );
  }, [
    isLoading,
    isFetching,
    allVenues.length,
    data,
    isError,
    error,
    activeFiltersCount,
    hasActiveFilters,
    handleClearAdvancedFilters,
    clearFilters,
    refetch,
    circuitBreaker.isOpen,
    circuitBreaker.lastFailureTime,
    resetCircuitBreaker,
  ]);

  const modeIcon = getModeIcon();

  // ✅ OPTIMIZED SCROLL HANDLER
  const scrollThrottleTimer = useRef<NodeJS.Timeout | null>(null);
  
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { 
      useNativeDriver: true,
      listener: (event: any) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const diff = currentScrollY - lastScrollY.current;
        
        if (scrollThrottleTimer.current) {
          return;
        }
        
        scrollThrottleTimer.current = setTimeout(() => {
          scrollThrottleTimer.current = null;
        }, SCROLL_THROTTLE);
        
        if (diff > 5 && currentScrollY > 50) {
          if (scrollDirection.current !== 'down') {
            scrollDirection.current = 'down';
            Animated.timing(headerTranslateY, {
              toValue: -HEADER_MAX_HEIGHT,
              duration: 250,
              useNativeDriver: true,
            }).start();
          }
        } else if (diff < -5) {
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
      {/* ✅ ANIMATED HEADER */}
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

      {/* ✅ v32.3.0: FLASHLIST WITH DATABASE ORDER PRESERVED */}
      {allVenues.length > 0 || isLoading || isFetching ? (
        <Animated.View style={{ flex: 1, opacity: showContent ? contentOpacity : 1 }}>
          <AnimatedFlashList
            key={listKey}
            ref={flashListRef}
            data={allVenues}
            renderItem={renderVenueCard}
            keyExtractor={(item: Venue) => item.id}
            getItemType={getItemType}
            estimatedItemSize={ESTIMATED_ITEM_SIZE}
            initialNumToRender={INITIAL_NUM_TO_RENDER}
            maxToRenderPerBatch={MAX_TO_RENDER_PER_BATCH}
            windowSize={WINDOW_SIZE}
            removeClippedSubviews={true}
            drawDistance={DRAW_DISTANCE}
            maintainVisibleContentPosition={undefined}
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
            onEndReached={allVenues.length > 0 ? loadMoreVenues : undefined}
            onEndReachedThreshold={PRELOAD_THRESHOLD}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={null}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          />
        </Animated.View>
      ) : (
        <View style={[styles.listContent, { marginTop: HEADER_MAX_HEIGHT }]}>
          {renderEmpty()}
        </View>
      )}

      {/* ✅ ADVANCED FILTERS SHEET */}
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
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  skeletonCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  skeletonImage: {
    width: '100%',
    height: 140,
    backgroundColor: colors.cardBorder,
  },
  skeletonContent: {
    padding: 16,
  },
  skeletonLine: {
    backgroundColor: colors.cardBorder,
    borderRadius: 4,
  },
  skeletonBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  footerLoadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 80,
  },
  footerLoadingText: {
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
  retryButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryButtonText: {
    fontWeight: '600',
    color: colors.headerText,
  },
});
