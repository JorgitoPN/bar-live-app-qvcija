
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
import { useRouter, useFocusEffect } from 'expo-router';
import { getEstadoLocal } from '@/utils/timeUtils';
import { IconSymbol } from '@/components/IconSymbol';
import LoginPrompt from '@/components/common/LoginPrompt';
import * as Location from 'expo-location';
import { 
  calcularDistancia, 
  getOptimizedUserLocation, 
  getCachedLocation, 
  clearLocationCache,
  startBackgroundLocationTracking,
  subscribeToLocationUpdates,
  isBackgroundTrackingEnabled,
} from '@/utils/locationUtils';
import { backgroundSync } from '@/utils/backgroundSync';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { navigationOptimizer, useScreenPerformance } from '@/utils/performanceMonitor';
import { useFavorites } from '@/contexts/FavoritesContext';
import FiltrosAvanzadosSheet from '@/components/home/FiltrosAvanzadosSheet';
import { useFilters } from '@/contexts/FilterContext';

// ✅ CONSTANTE CRÍTICA: Tamaño de página para carga incremental
const ITEMS_PER_PAGE = 20;

const HEADER_MAX_HEIGHT = Platform.OS === 'android' ? 200 : 240;
const HEADER_MIN_HEIGHT = 0;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT;

const PROVINCIAS = [
  'Todas',
  'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila', 'Badajoz',
  'Barcelona', 'Burgos', 'Cáceres', 'Cádiz', 'Cantabria', 'Castellón', 'Ciudad Real',
  'Córdoba', 'Cuenca', 'Girona', 'Granada', 'Guadalajara', 'Guipúzcoa', 'Huelva',
  'Huesca', 'Islas Baleares', 'Jaén', 'La Coruña', 'La Rioja', 'Las Palmas', 'León',
  'Lleida', 'Lugo', 'Madrid', 'Málaga', 'Murcia', 'Navarra', 'Ourense', 'Palencia',
  'Pontevedra', 'Salamanca', 'Santa Cruz de Tenerife', 'Segovia', 'Sevilla', 'Soria',
  'Tarragoza', 'Teruel', 'Toledo', 'Valencia', 'Valladolid', 'Vizcaya', 'Zamora', 'Zaragoza'
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
 * ✅ EXPLORAR SCREEN v438.0 - CRITICAL FIX: SORTING & SCROLL STABILITY
 * 
 * CRITICAL FIX v438.0 (2026-02-23):
 * - 🔧 FIXED: Featured closed venues appearing in open venues section
 *   - Changed from 5-tier to 3-tier sorting: Featured Open → Regular Open → All Closed
 *   - Featured closed venues now ONLY appear after ALL regular open venues
 * - 🔧 FIXED: Screen jumping to top when reaching end of 20-item batch
 *   - Removed automatic scroll-to-top on data updates during scroll
 *   - Improved scroll position preservation during pagination
 * 
 * Previous fixes:
 * - v437.0: iOS Expo Go crash fix (background location tracking)
 * - v436.0: Scroll jumps and iOS crash (maintainVisibleContentPosition removed)
 * - v435.0: Scroll stability with state update prevention
 * - v434.0: Infinite loop and location error fixes
 * - v433.0: Featured locals and sorting consistency
 */

// ✅ SKELETON CARD COMPONENT - Extracted to fix React Hooks rules
const SkeletonCard = React.memo(() => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);
  
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });
  
  return (
    <View style={styles.card}>
      <View style={[styles.imageContainer, styles.skeletonImage]}>
        <Animated.View 
          style={[
            styles.skeletonShimmer,
            {
              transform: [{ translateX: shimmerTranslate }],
            }
          ]} 
        />
      </View>
      <View style={styles.content}>
        <View style={[styles.skeletonText, { width: '70%', height: 20, marginBottom: 8 }]}>
          <Animated.View 
            style={[
              styles.skeletonShimmer,
              {
                transform: [{ translateX: shimmerTranslate }],
              }
            ]} 
          />
        </View>
        <View style={[styles.skeletonText, { width: '90%', height: 14, marginBottom: 12 }]}>
          <Animated.View 
            style={[
              styles.skeletonShimmer,
              {
                transform: [{ translateX: shimmerTranslate }],
              }
            ]} 
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <View style={[styles.skeletonText, { width: 80, height: 24, borderRadius: 6 }]}>
            <Animated.View 
              style={[
                styles.skeletonShimmer,
                {
                  transform: [{ translateX: shimmerTranslate }],
                }
              ]} 
            />
          </View>
          <View style={[styles.skeletonText, { width: 100, height: 24, borderRadius: 6 }]}>
            <Animated.View 
              style={[
                styles.skeletonShimmer,
                {
                  transform: [{ translateX: shimmerTranslate }],
                }
              ]} 
            />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={[styles.skeletonText, { flex: 1, height: 40, borderRadius: 8 }]}>
            <Animated.View 
              style={[
                styles.skeletonShimmer,
                {
                  transform: [{ translateX: shimmerTranslate }],
                }
              ]} 
            />
          </View>
          <View style={[styles.skeletonText, { flex: 1, height: 40, borderRadius: 8 }]}>
            <Animated.View 
              style={[
                styles.skeletonShimmer,
                {
                  transform: [{ translateX: shimmerTranslate }],
                }
              ]} 
            />
          </View>
        </View>
      </View>
    </View>
  );
});

export default function ExplorarScreen() {
  const mountedRef = useRef(false);
  const errorCountRef = useRef(0);
  const MAX_ERROR_RETRIES = 3;
  
  useEffect(() => {
    if (!mountedRef.current) {
      console.log('[Explorar v438.0] 🚀 Component mounted - SORTING & SCROLL FIX APPLIED');
      mountedRef.current = true;
    }
  }, []);
  
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode, setCurrentMode, activeProfileType, activeLocalData } = useMode();
  const { prefetchNextPage, loadDataOnDemand } = useGlobalData();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const { 
    filtros: globalFiltros, 
    setFiltros,
    limpiarFiltros,
    hasActiveFilters,
  } = useFilters();
  
  const { isReady, deferOperation, deferDataLoading, deferWithPriority } = useScreenPerformance('Explorar');
  
  // ✅ ESTADOS SIMPLIFICADOS - Solo lo esencial
  const [allLocales, setAllLocales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  
  const [socialProfiles, setSocialProfiles] = useState<Map<string, boolean>>(new Map());
  const [activeEvents, setActiveEvents] = useState<Map<string, any>>(new Map());
  
  // ✅ CRITICAL FIX v420.0: Single category state (synced with FilterContext)
  const selectedCategory = useMemo(() => {
    // If advanced filters have a tipo selected, use the first one
    if (globalFiltros.tipo && globalFiltros.tipo.length > 0) {
      return globalFiltros.tipo[0];
    }
    return 'todas';
  }, [globalFiltros.tipo]);

  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState('Todas');

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // ✅ v436.0: CRITICAL FIX - SIMPLIFIED SCROLL TRACKING (NO maintainVisibleContentPosition)
  const scrollY = useRef(0);
  const lastScrollY = useRef(0);
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const savedScrollPosition = useRef<number>(0);
  const isReturningFromDetail = useRef<boolean>(false);
  
  // ✅ REF CRÍTICO: Previene cargas duplicadas
  const loadingRef = useRef(false);
  
  // ✅ REF PARA TRACKING DE FILTROS - CRITICAL FIX: Stable serialization
  const lastFiltersRef = useRef<string>('');

  // ✅ v436.0: CRITICAL FIX - PREVENT STATE UPDATES DURING SCROLL
  const hasReEvaluatedRef = useRef(false);
  const localesSnapshotRef = useRef<string>('');
  const isScrollingRef = useRef(false);
  const pendingUpdateRef = useRef<any[] | null>(null);
  
  useFocusEffect(
    useCallback(() => {
      console.log('[Explorar v438.0] 🔄 Screen focused - checking if re-evaluation needed');
      
      // ✅ CRITICAL FIX: Create stable snapshot using IDs + status
      const createSnapshot = (locales: any[]) => {
        return locales.map(l => `${l.id}-${l.estaAbierto ? '1' : '0'}`).join('|');
      };
      
      const currentSnapshot = createSnapshot(allLocales);
      const dataChanged = currentSnapshot !== localesSnapshotRef.current;
      
      if (allLocales.length > 0 && (dataChanged || !hasReEvaluatedRef.current)) {
        console.log('[Explorar v438.0] 🔄 Re-evaluating', allLocales.length, 'locales (data changed:', dataChanged, ')');
        
        // Store snapshot BEFORE re-evaluation to prevent loop
        hasReEvaluatedRef.current = true;
        
        // ✅ CRITICAL: Re-evaluate IN PLACE to avoid creating new array
        const reEvaluatedLocales = allLocales.map((local: any) => {
          const estadoLocal = getEstadoLocal(local);
          
          // Only update if status actually changed
          if (estadoLocal.estaAbierto !== local.estaAbierto) {
            return {
              ...local,
              estadoCompleto: estadoLocal,
              estaAbierto: estadoLocal.estaAbierto,
            };
          }
          
          return local;
        });
        
        // ✅ CRITICAL: Re-apply 5-tier sorting
        const reSortedLocales = [...reEvaluatedLocales].sort((a: any, b: any) => {
          // Tier 1: Featured + Open (highest priority)
          const aTier1 = a.destacado && a.estaAbierto;
          const bTier1 = b.destacado && b.estaAbierto;
          if (aTier1 && !bTier1) return -1;
          if (!aTier1 && bTier1) return 1;
          
          // Tier 2: Featured + Closed
          const aTier2 = a.destacado && !a.estaAbierto;
          const bTier2 = b.destacado && !b.estaAbierto;
          if (aTier2 && !bTier2) return -1;
          if (!aTier2 && bTier2) return 1;
          
          // Tier 3: Regular + Open
          const aTier3 = !a.destacado && a.estaAbierto;
          const bTier3 = !b.destacado && b.estaAbierto;
          if (aTier3 && !bTier3) return -1;
          if (!aTier3 && bTier3) return 1;
          
          // Tier 4: Regular + Closed
          const aTier4 = !a.destacado && !a.estaAbierto;
          const bTier4 = !b.destacado && !b.estaAbierto;
          if (aTier4 && !bTier4) return -1;
          if (!aTier4 && bTier4) return 1;
          
          // Tier 5: Within same tier, sort by distance
          if (a.distancia !== null && b.distancia !== null) {
            return a.distancia - b.distancia;
          }
          
          return 0;
        });
        
        // ✅ v436.0: CRITICAL FIX - Only update if NOT scrolling
        const newSnapshot = createSnapshot(reSortedLocales);
        const sortingChanged = newSnapshot !== currentSnapshot;
        
        if (sortingChanged) {
          console.log('[Explorar v438.0] 🔄 Sorting changed - scheduling update');
          localesSnapshotRef.current = newSnapshot;
          
          // ✅ CRITICAL: If scrolling, store pending update
          if (isScrollingRef.current) {
            console.log('[Explorar v438.0] ⏸️ User is scrolling - deferring update');
            pendingUpdateRef.current = reSortedLocales;
          } else {
            // Update immediately if not scrolling
            setAllLocales(reSortedLocales);
          }
        } else {
          console.log('[Explorar v438.0] ✅ Sorting unchanged - no state update needed');
          localesSnapshotRef.current = currentSnapshot;
        }
      } else {
        console.log('[Explorar v438.0] ⏸️ No re-evaluation needed');
        if (allLocales.length > 0) {
          localesSnapshotRef.current = createSnapshot(allLocales);
        }
      }
      
      // ✅ v438.0: CRITICAL FIX - Only restore scroll position when returning from detail
      // DON'T scroll to top automatically (causes jumps during pagination)
      if (isReturningFromDetail.current) {
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ 
            offset: savedScrollPosition.current, 
            animated: false 
          });
        }, 150);
        isReturningFromDetail.current = false;
      }
      // ✅ REMOVED: Automatic scroll to top on focus (was causing jumps during pagination)
      
      // Reset flag when screen loses focus
      return () => {
        hasReEvaluatedRef.current = false;
      };
    }, [allLocales])
  );

  // ✅ DEBOUNCE DE BÚSQUEDA - 500ms PARA REDUCIR PARPADEO
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ✅ VALIDACIÓN DE COORDENADAS DE ESPAÑA
  const isValidSpainCoordinate = useCallback((lat: number, lng: number): boolean => {
    const MIN_LAT = 27.0;
    const MAX_LAT = 44.0;
    const MIN_LNG = -18.5;
    const MAX_LNG = 5.0;
    
    return lat >= MIN_LAT && lat <= MAX_LAT && lng >= MIN_LNG && lng <= MAX_LNG;
  }, []);

  // ✅ v437.0: CRITICAL FIX - iOS CRASH FIX (Graceful location handling)
  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;
    
    (async () => {
      try {
        console.log('[Explorar v438.0] 🚀 Starting location system (iOS crash fix)');
        
        // ✅ CRITICAL: Skip background tracking on iOS in Expo Go (causes crashes)
        if (Platform.OS === 'ios') {
          console.log('[Explorar v438.0] ⏸️ Skipping background tracking on iOS (Expo Go compatibility)');
        } else {
          // ✅ STEP 1: Start background location tracking on Android only
          if (!isBackgroundTrackingEnabled()) {
            try {
              const started = await startBackgroundLocationTracking();
              if (started) {
                console.log('[Explorar v438.0] ✅ Background tracking started (Android)');
              }
            } catch (trackingError) {
              console.log('[Explorar v438.0] ⚠️ Background tracking error - continuing');
            }
          }
        }
        
        // ✅ STEP 2: Subscribe to location updates (with error handling)
        try {
          unsubscribe = subscribeToLocationUpdates('explorar-screen', (location) => {
            if (!isMounted) return;
            
            console.log('[Explorar v438.0] 📍 Location update received');
            
            if (isValidSpainCoordinate(location.latitude, location.longitude)) {
              setUserLocation({ lat: location.latitude, lng: location.longitude });
              setLocationError(null);
              setLocationReady(true);
              
              // ✅ Trigger intelligent preloading (with error handling)
              try {
                backgroundSync.preloadLocalesForLocation(
                  location.latitude,
                  location.longitude,
                  false
                );
              } catch (preloadError) {
                // Silent fail - data will load on demand
              }
            }
          });
        } catch (subscribeError) {
          console.log('[Explorar v438.0] ⚠️ Location subscription error - using manual updates');
        }
        
        // ✅ STEP 3: Check cached location first (instant)
        const cached = getCachedLocation();
        if (cached) {
          console.log('[Explorar v438.0] ⚡ Using cached location');
          
          if (isValidSpainCoordinate(cached.latitude, cached.longitude)) {
            if (isMounted) {
              setUserLocation({ lat: cached.latitude, lng: cached.longitude });
              setLocationError(null);
              setLocationReady(true);
              
              // Preload data for cached location
              try {
                backgroundSync.preloadLocalesForLocation(
                  cached.latitude,
                  cached.longitude,
                  false
                );
              } catch (preloadError) {
                // Silent fail
              }
            }
            return;
          }
        }
        
        // ✅ STEP 4: Fetch fresh location if no cache
        const location = await getOptimizedUserLocation();
        
        if (!isMounted) return;
        
        if (!location) {
          console.log('[Explorar v438.0] ⚠️ Location not available');
          setLocationError('No se pudo obtener la ubicación. Mostrando todos los locales.');
          setUserLocation(null);
          setLocationReady(true);
          return;
        }
        
        const lat = location.coords.latitude;
        const lng = location.coords.longitude;
        
        console.log('[Explorar v438.0] ✅ Location obtained');
        
        if (!isValidSpainCoordinate(lat, lng)) {
          console.log('[Explorar v438.0] ⚠️ Location outside Spain');
          setLocationError('Ubicación fuera de España. Mostrando todos los locales.');
          setUserLocation(null);
          setLocationReady(true);
          return;
        }
        
        setUserLocation({ lat, lng });
        setLocationError(null);
        setLocationReady(true);
        
        // Preload data for this location
        try {
          backgroundSync.preloadLocalesForLocation(lat, lng, true);
          console.log('[Explorar v438.0] ✅ Location ready');
        } catch (preloadError) {
          // Silent fail
        }
        
      } catch (error: any) {
        if (!isMounted) return;
        console.log('[Explorar v438.0] ⚠️ Location error - continuing with fallback');
        setLocationError('No se pudo obtener la ubicación. Mostrando todos los locales.');
        setUserLocation(null);
        setLocationReady(true);
      }
    })();
    
    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isValidSpainCoordinate]);

  // ✅ MAPEO DE CATEGORÍAS PARA EL BACKEND
  const getCategoryFilterForBackend = useCallback((category: string): string[] | null => {
    if (!category || category === 'todas') {
      return null;
    }
    
    const categoryMap: Record<string, string[]> = {
      'cafe': ['cafe', 'cafeteria', 'cafetería'],
      'restaurante': ['restaurante', 'restaurant'],
      'bar': ['bar'],
      'pub': ['pub'],
      'cocteleria': ['cocteleria', 'cocktail', 'cóctel'],
      'discoteca': ['discoteca', 'nightclub', 'club', 'disco']
    };
    
    return categoryMap[category] || null;
  }, []);

  // ✅ CRITICAL FIX v420.0: Función para sincronizar categoría con FilterContext
  const handleCategoryChange = useCallback((categoryId: string) => {
    console.log('[Explorar v438.0] 🔄 Category changed to:', categoryId);
    
    // Update FilterContext to sync with Filtros Avanzados
    if (categoryId === 'todas') {
      // Clear tipo filter
      setFiltros({
        ...globalFiltros,
        tipo: undefined,
      });
    } else {
      // Set single tipo filter
      setFiltros({
        ...globalFiltros,
        tipo: [categoryId],
      });
    }
    
    errorCountRef.current = 0; // Reset error count on category change
    
    // Scroll to top
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      savedScrollPosition.current = 0;
    }, 100);
  }, [globalFiltros, setFiltros]);

  // ✅ v433.0: CRITICAL FIX - MAINTAIN SORTING & PRIORITIZATION ON NAVIGATION
  const loadLocales = useCallback(async (reset: boolean = false) => {
    // ✅ GUARDIA 1: Verificar si ya está cargando
    if (loadingRef.current) {
      console.log('[Explorar v438.0] ⏸️ Already loading, skipping...');
      return;
    }
    
    // ✅ GUARDIA 2: Si no es reset y no hay más datos, no cargar
    if (!reset && !hasMore) {
      console.log('[Explorar v438.0] ⏸️ No more data to load');
      return;
    }
    
    // ✅ GUARDIA 3: Verificar que la ubicación esté lista
    if (!locationReady) {
      console.log('[Explorar v438.0] ⏸️ Location not ready yet');
      return;
    }

    // ✅ GUARDIA 4: Verificar límite de reintentos de error
    if (errorCountRef.current >= MAX_ERROR_RETRIES) {
      console.log('[Explorar v438.0] ⏸️ Max error retries reached, stopping...');
      return;
    }

    // ✅ v433.0: STEP 1 - Try to use preloaded data first (INSTANT)
    if (reset && userLocation) {
      const preloaded = await backgroundSync.getPreloadedLocales(
        userLocation.lat,
        userLocation.lng
      );
      
      if (preloaded && preloaded.length > 0) {
        console.log('[Explorar v438.0] ⚡ Using preloaded data (INSTANT):', preloaded.length, 'locales');
        
        // ✅ CRITICAL FIX: Transform AND re-evaluate business rules
        const transformedLocales = preloaded.map((local: any) => {
          // ✅ RE-EVALUATE estado local with current time
          const estadoLocal = getEstadoLocal(local);
          
          return {
            ...local,
            coordenadas: {
              lat: parseFloat(local.latitud),
              lng: parseFloat(local.longitud),
            },
            imagenes: local.galeria_urls || (local.imagen_url ? [local.imagen_url] : []),
            estadoCompleto: estadoLocal,
            // ✅ CRITICAL: Use re-evaluated estado, not cached value
            estaAbierto: estadoLocal.estaAbierto,
            tieneHorarios: local.has_schedule_info,
            distancia: local.distance_km,
            sortingTier: local.sorting_tier,
            // ✅ PRESERVE destacado flag from backend
            destacado: local.destacado || false,
          };
        });
        
        // ✅ CRITICAL FIX v438.0: STRICT 3-TIER SORTING (Featured closed NEVER mix with regular open)
        const sortedLocales = transformedLocales.sort((a: any, b: any) => {
          // Tier 1: Featured + Open (highest priority)
          const aTier1 = a.destacado && a.estaAbierto;
          const bTier1 = b.destacado && b.estaAbierto;
          if (aTier1 && !bTier1) return -1;
          if (!aTier1 && bTier1) return 1;
          
          // Tier 2: Regular + Open (BEFORE featured closed)
          const aTier2 = !a.destacado && a.estaAbierto;
          const bTier2 = !b.destacado && b.estaAbierto;
          if (aTier2 && !bTier2) return -1;
          if (!aTier2 && bTier2) return 1;
          
          // Tier 3: ALL CLOSED (featured and regular together at the end)
          const aTier3 = !a.estaAbierto;
          const bTier3 = !b.estaAbierto;
          
          // Within closed tier, featured first
          if (aTier3 && bTier3) {
            if (a.destacado && !b.destacado) return -1;
            if (!a.destacado && b.destacado) return 1;
          }
          
          // Within same tier, sort by distance
          if (a.distancia !== null && b.distancia !== null) {
            return a.distancia - b.distancia;
          }
          
          return 0;
        });
        
        console.log('[Explorar v438.0] ✅ Re-sorted preloaded data - First 5:', sortedLocales.slice(0, 5).map((l: any) => ({
          nombre: l.nombre,
          destacado: l.destacado,
          estaAbierto: l.estaAbierto,
          distancia: l.distancia ? `${l.distancia.toFixed(1)}km` : 'N/A',
        })));
        
        setAllLocales(sortedLocales);
        setHasMore(true); // Allow loading more
        setIsLoading(false);
        
        // Continue loading in background to get fresh data
        setTimeout(() => {
          loadingRef.current = false;
        }, 100);
        
        return;
      }
    }

    // ✅ ACTIVAR GUARDIA Y ESTADO DE CARGA
    loadingRef.current = true;
    setIsLoading(true);

    try {
      const offset = reset ? 0 : allLocales.length;
      const categoryFilter = getCategoryFilterForBackend(selectedCategory);
      
      // ✅ CRITICAL FIX v433.0: Pass ALL advanced filter parameters to RPC
      const rpcParams = {
        p_user_lat: userLocation?.lat || null,
        p_user_lng: userLocation?.lng || null,
        p_category_filter: categoryFilter,
        p_servicios_filter: globalFiltros.servicios && globalFiltros.servicios.length > 0 ? globalFiltros.servicios : null,
        p_ambiente_filter: globalFiltros.ambiente && globalFiltros.ambiente.length > 0 ? globalFiltros.ambiente : null,
        p_clientela_filter: globalFiltros.clientela && globalFiltros.clientela.length > 0 ? globalFiltros.clientela : null,
        p_comunidad_filter: globalFiltros.comunidad || null,
        p_provincia_filter: globalFiltros.provincia || null,
        p_max_distance_km: globalFiltros.distancia || null,
        p_limit: ITEMS_PER_PAGE,
        p_offset: offset
      };
      
      console.log('[Explorar v438.0] 📡 Fetching locales with FULL advanced filters...');
      console.log('[Explorar v438.0] 📍 User location:', userLocation);
      console.log('[Explorar v438.0] 🏷️ Category filter:', categoryFilter);
      console.log('[Explorar v438.0] 📄 Offset:', offset, 'Limit:', ITEMS_PER_PAGE);
      
      const { data, error } = await supabase.rpc('get_sorted_locales_by_proximity', rpcParams);

      if (error) {
        console.error('[Explorar v438.0] ❌ Error fetching:', error);
        errorCountRef.current += 1;
        
        // Show user-friendly error message
        if (errorCountRef.current >= MAX_ERROR_RETRIES) {
          Alert.alert(
            'Error de conexión',
            'No se pudieron cargar los locales después de varios intentos. Por favor, intenta de nuevo más tarde.',
            [{ text: 'OK' }]
          );
        }
        throw error;
      }

      // Reset error count on successful load
      errorCountRef.current = 0;

      if (data && data.length > 0) {
        console.log('[Explorar v438.0] ✅ Received', data.length, 'locales from backend');
        
        // ✅ CRITICAL FIX: Transform AND re-evaluate business rules
        const transformedLocales = data.map((local: any) => {
          // ✅ RE-EVALUATE estado local with current time
          const estadoLocal = getEstadoLocal(local);
          
          return {
            ...local,
            coordenadas: {
              lat: parseFloat(local.latitud),
              lng: parseFloat(local.longitud),
            },
            imagenes: local.galeria_urls || (local.imagen_url ? [local.imagen_url] : []),
            estadoCompleto: estadoLocal,
            // ✅ CRITICAL: Use re-evaluated estado, not cached value
            estaAbierto: estadoLocal.estaAbierto,
            tieneHorarios: local.has_schedule_info,
            distancia: local.distance_km,
            sortingTier: local.sorting_tier,
            // ✅ PRESERVE destacado flag from backend
            destacado: local.destacado || false,
          };
        });

        // ✅ CRITICAL FIX: Re-apply 5-tier sorting after transformation
        const sortedLocales = transformedLocales.sort((a: any, b: any) => {
          // Tier 1: Featured + Open (highest priority)
          const aTier1 = a.destacado && a.estaAbierto;
          const bTier1 = b.destacado && b.estaAbierto;
          if (aTier1 && !bTier1) return -1;
          if (!aTier1 && bTier1) return 1;
          
          // Tier 2: Featured + Closed
          const aTier2 = a.destacado && !a.estaAbierto;
          const bTier2 = b.destacado && !b.estaAbierto;
          if (aTier2 && !bTier2) return -1;
          if (!aTier2 && bTier2) return 1;
          
          // Tier 3: Regular + Open
          const aTier3 = !a.destacado && a.estaAbierto;
          const bTier3 = !b.destacado && b.estaAbierto;
          if (aTier3 && !bTier3) return -1;
          if (!aTier3 && bTier3) return 1;
          
          // Tier 4: Regular + Closed
          const aTier4 = !a.destacado && !a.estaAbierto;
          const bTier4 = !b.destacado && !b.estaAbierto;
          if (aTier4 && !bTier4) return -1;
          if (!aTier4 && bTier4) return 1;
          
          // Tier 5: Within same tier, sort by distance
          if (a.distancia !== null && b.distancia !== null) {
            return a.distancia - b.distancia;
          }
          
          return 0;
        });

        console.log('[Explorar v438.0] ✅ Re-sorted after transformation - First 5:', sortedLocales.slice(0, 5).map((l: any) => ({
          nombre: l.nombre,
          destacado: l.destacado,
          estaAbierto: l.estaAbierto,
          distancia: l.distancia ? `${l.distancia.toFixed(1)}km` : 'N/A',
        })));

        if (reset) {
          setAllLocales(sortedLocales);
        } else {
          setAllLocales(prev => {
            const existingIds = new Set(prev.map(l => l.id));
            const newUniqueLocales = sortedLocales.filter(l => !existingIds.has(l.id));
            return [...prev, ...newUniqueLocales];
          });
        }

        const hasMoreData = data.length >= ITEMS_PER_PAGE;
        setHasMore(hasMoreData);
        console.log('[Explorar v438.0] 📊 Has more data:', hasMoreData);
        
      } else {
        console.log('[Explorar v438.0] 📭 No data received');
        setHasMore(false);
        if (reset) {
          setAllLocales([]);
        }
      }
    } catch (error: any) {
      console.error('[Explorar v438.0] ❌ Error loading locales:', error);
      
      // Only show alert if we haven't reached max retries
      if (errorCountRef.current < MAX_ERROR_RETRIES) {
        // Don't show alert for every error, just log it
        console.log('[Explorar v438.0] 🔄 Will retry on next attempt...');
      }
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [userLocation, locationReady, allLocales.length, hasMore, selectedCategory, globalFiltros, getCategoryFilterForBackend]);

  // ✅ v433.0: CARGA INICIAL CON PRELOADED DATA
  useEffect(() => {
    if (locationReady && allLocales.length === 0 && !isLoading && errorCountRef.current < MAX_ERROR_RETRIES) {
      console.log('[Explorar v438.0] 🎬 Initial load triggered (will use preloaded data if available)');
      loadLocales(true);
    }
  }, [locationReady, allLocales.length, isLoading, loadLocales]);

  // ✅ CRITICAL FIX v420.0: Stable filter change detection
  useEffect(() => {
    // Create a stable filter key that properly serializes objects
    const createFilterKey = () => {
      const parts = [
        selectedCategory,
        provinciaSeleccionada,
        debouncedQuery,
        // Serialize advanced filters in a stable way
        JSON.stringify({
          servicios: (globalFiltros.servicios || []).sort(),
          ambiente: (globalFiltros.ambiente || []).sort(),
          clientela: (globalFiltros.clientela || []).sort(),
          comunidad: globalFiltros.comunidad || null,
          provincia: globalFiltros.provincia || null,
          distancia: globalFiltros.distancia || null,
        })
      ];
      return parts.join('|');
    };
    
    const filtersKey = createFilterKey();
    const filtersChanged = filtersKey !== lastFiltersRef.current;

    if (filtersChanged && lastFiltersRef.current !== '') {
      console.log('[Explorar v438.0] 🔄 Filters changed, resetting...');
      
      lastFiltersRef.current = filtersKey;
      
      // Reset state
      setAllLocales([]);
      setHasMore(true);
      loadingRef.current = false;
      errorCountRef.current = 0; // Reset error count on filter change
      
      // Scroll to top
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        savedScrollPosition.current = 0;
      }, 100);
      
      // Load with new filters
      loadLocales(true);
    } else if (lastFiltersRef.current === '') {
      lastFiltersRef.current = filtersKey;
    }
  }, [selectedCategory, provinciaSeleccionada, debouncedQuery, globalFiltros.servicios, globalFiltros.ambiente, globalFiltros.clientela, globalFiltros.comunidad, globalFiltros.provincia, globalFiltros.distancia, loadLocales]);

  // ✅ v433.0: APLICAR FILTROS CLIENT-SIDE (solo búsqueda - advanced filters are now in RPC)
  const filteredLocales = useMemo(() => {
    const query = debouncedQuery.toLowerCase().trim();
    let filtered = allLocales;
    
    // Apply search query
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

    // ✅ NO CLIENT-SIDE ADVANCED FILTERING - Backend handles it all
    // ✅ NO SORTING HERE - Data already sorted by 5-tier system in loadLocales
    console.log('[Explorar v438.0] 📊 Filtered locales (search only):', filtered.length);
    
    return filtered;
  }, [allLocales, debouncedQuery]);

  // ✅ CARGA AUTOMÁTICA CUANDO LA LISTA FILTRADA ES PEQUEÑA
  useEffect(() => {
    const MIN_FILTERED_ITEMS = 10;
    
    if (
      filteredLocales.length < MIN_FILTERED_ITEMS &&
      hasMore &&
      !isLoading &&
      !loadingRef.current &&
      allLocales.length > 0 &&
      locationReady &&
      errorCountRef.current < MAX_ERROR_RETRIES
    ) {
      console.log('[Explorar v438.0] 🔄 Auto-loading more (filtered list too small)');
      loadLocales(false);
    }
  }, [filteredLocales.length, hasMore, isLoading, allLocales.length, locationReady, loadLocales]);

  // ✅ FUNCIÓN PARA CARGAR MÁS LOCALES (INFINITE SCROLL)
  const loadMoreLocales = useCallback(() => {
    if (loadingRef.current || isLoading || !hasMore || errorCountRef.current >= MAX_ERROR_RETRIES) {
      return;
    }

    console.log('[Explorar v438.0] 📜 Loading more locales (infinite scroll)');
    loadLocales(false);
  }, [hasMore, isLoading, loadLocales]);

  // ✅ v433.0: REFRESH WITH INTELLIGENT CACHE MANAGEMENT
  const onRefresh = async () => {
    console.log('[Explorar v438.0] 🔄 Refreshing...');
    setRefreshing(true);
    
    // ✅ Clear location cache to force fresh location fetch
    clearLocationCache();
    console.log('[Explorar v438.0] 🧹 Location cache cleared - will fetch fresh location');
    
    // ✅ Clear preloaded cache to force fresh data
    await backgroundSync.clearPreloadedCache();
    console.log('[Explorar v438.0] 🧹 Preloaded cache cleared');
    
    setSearchQuery('');
    setDebouncedQuery('');
    
    // Clear category filter in context
    setFiltros({
      ...globalFiltros,
      tipo: undefined,
    });
    
    setProvinciaSeleccionada('Todas');
    
    setAllLocales([]);
    setHasMore(true);
    loadingRef.current = false;
    errorCountRef.current = 0; // Reset error count on refresh
    lastFiltersRef.current = '';
    
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      savedScrollPosition.current = 0;
    }, 100);
    
    // ✅ Fetch fresh location before loading locales
    const location = await getOptimizedUserLocation();
    if (location && isValidSpainCoordinate(location.coords.latitude, location.coords.longitude)) {
      setUserLocation({ lat: location.coords.latitude, lng: location.coords.longitude });
      console.log('[Explorar v438.0] ✅ Fresh location obtained on refresh');
      
      // ✅ Trigger fresh preload
      backgroundSync.preloadLocalesForLocation(
        location.coords.latitude,
        location.coords.longitude,
        true // Force preload
      );
    }
    
    await loadLocales(true);
    setRefreshing(false);
  };

  // ✅ LIMPIAR FILTROS
  const clearFilters = useCallback(() => {
    console.log('[Explorar v438.0] 🧹 Clearing filters');
    setSearchQuery('');
    setDebouncedQuery('');
    
    // Clear category in context
    setFiltros({
      ...globalFiltros,
      tipo: undefined,
    });
    
    setProvinciaSeleccionada('Todas');
    errorCountRef.current = 0; // Reset error count when clearing filters
    
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      savedScrollPosition.current = 0;
    }, 100);
  }, [globalFiltros, setFiltros]);

  // ✅ CONTADOR DE FILTROS ACTIVOS
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (debouncedQuery.trim()) count++;
    if (selectedCategory !== 'todas') count++;
    if (provinciaSeleccionada !== 'Todas') count++;
    return count;
  }, [debouncedQuery, selectedCategory, provinciaSeleccionada]);

  // ✅ HANDLERS DE ACCIONES
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
    
    await toggleFavorite(localId);
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
    
    router.push('/solicitudes/solicitar-propiedad-v2');
  };

  const handleOpenAdvancedFilters = useCallback(() => {
    setShowAdvancedFilters(true);
  }, []);

  const handleCloseAdvancedFilters = useCallback(() => {
    setShowAdvancedFilters(false);
  }, []);

  const handleClearAdvancedFilters = useCallback(() => {
    limpiarFiltros();
  }, [limpiarFiltros]);

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

  // ✅ v438.0: CRITICAL FIX - SIMPLIFIED SCROLL HANDLER (NO COMPLEX ANIMATIONS)
  const handleScroll = useCallback((event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const layoutHeight = event.nativeEvent.layoutMeasurement.height;
    
    savedScrollPosition.current = currentScrollY;
    
    // ✅ CRITICAL: Mark as scrolling to prevent state updates
    isScrollingRef.current = true;
    
    const diff = currentScrollY - lastScrollY.current;
    
    // ✅ SIMPLIFIED: Basic header hide/show (no complex transforms)
    if (Math.abs(diff) > 5) {
      if (diff > 0 && currentScrollY > 50) {
        Animated.timing(headerTranslateY, {
          toValue: -HEADER_MAX_HEIGHT - 10,
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
    
    const distanceFromBottom = contentHeight - (currentScrollY + layoutHeight);
    const shouldPreload = distanceFromBottom < layoutHeight * 3;
    
    if (shouldPreload && hasMore && !isLoading && !loadingRef.current && filteredLocales.length > 0) {
      loadMoreLocales();
    }
    
    lastScrollY.current = currentScrollY;
    scrollY.current = currentScrollY;
  }, [headerTranslateY, hasMore, isLoading, filteredLocales.length, loadMoreLocales]);
  
  // ✅ v438.0: CRITICAL - Apply pending updates after scroll ends
  const handleScrollEnd = useCallback(() => {
    // Delay to ensure scroll has fully stopped
    setTimeout(() => {
      isScrollingRef.current = false;
      
      // Apply any pending updates
      if (pendingUpdateRef.current) {
        console.log('[Explorar v438.0] ✅ Applying pending update after scroll ended');
        setAllLocales(pendingUpdateRef.current);
        pendingUpdateRef.current = null;
      }
    }, 100);
  }, []);

  // ✅ RENDER SKELETON CARD
  const renderSkeletonCard = useCallback(() => {
    return <SkeletonCard />;
  }, []);

  // ✅ HELPERS PARA RENDERIZADO DE CARDS
  const getBadgeInfo = useCallback((item: any) => {
    if (item.estadoCompleto) {
      const estado = item.estadoCompleto;
      
      const colorMap: Record<string, string> = {
        'bg-green-500': '#22C55E',
        'bg-orange-500': '#F97316',
        'bg-yellow-500': '#EAB308',
        'bg-red-500': '#EF4444',
        'bg-gray-400': '#9CA3AF',
      };
      
      const badgeColor = colorMap[estado.claseBg || 'bg-gray-400'] || '#9CA3AF';
      
      return {
        text: estado.badge,
        color: badgeColor,
      };
    }
    
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
  }, []);

  const getShouldDimImage = useCallback((item: any) => {
    if (item.estadoCompleto) {
      return item.estadoCompleto.estaAbierto === false && 
             !item.estadoCompleto.badge.includes('pronto');
    }
    return item.estaAbierto === false;
  }, []);

  const getCategoriasAMostrar = useCallback((item: any) => {
    const CATEGORIAS_EXCLUIDAS = ['terrazas', 'rooftops', 'lounge'];
    let categories = item.barlive_types || [];
    if (categories.length === 0 && item.barlive_type) {
      categories = [item.barlive_type];
    }
    
    return categories.filter((cat: string) => 
      !CATEGORIAS_EXCLUIDAS.includes(cat.toLowerCase())
    );
  }, []);

  const getDisplayRating = useCallback((item: any) => {
    if (item.rating && item.rating > 0) {
      return item.rating;
    }
    if (item.google_rating && item.google_rating > 0) {
      return item.google_rating;
    }
    return 0;
  }, []);

  // ✅ RENDER LOCAL CARD
  const renderLocalCard = useCallback(({ item, index }: { item: any; index: number }) => {
    const imagenPrincipal = item.imagenes?.[0] || item.imagen_url;
    const isDestacado = item.destacado;
    const hasSocialProfile = socialProfiles.get(item.id) || false;
    const activeEvent = activeEvents.get(item.id);
    
    const localIsFavorite = user ? isFavorite(item.id) : false;

    const badgeInfo = getBadgeInfo(item);
    const shouldDimImage = getShouldDimImage(item);
    const categoriasAMostrar = getCategoriasAMostrar(item);
    const displayRating = getDisplayRating(item);

    const iconSize = Platform.OS === 'android' ? scaleIconSize(14) : 14;
    const starIconSize = Platform.OS === 'android' ? scaleIconSize(12) : 12;
    const heartIconSize = Platform.OS === 'android' ? scaleIconSize(20) : 20;
    const actionIconSize = Platform.OS === 'android' ? scaleIconSize(16) : 16;

    const cardStyle = [
      styles.card,
      isDestacado && styles.cardDestacado,
      Platform.OS === 'android' && index === 0 && { marginTop: 8 }
    ];

    return (
      <TouchableOpacity 
        style={cardStyle} 
        onPress={() => {
          isReturningFromDetail.current = true;
          router.push(`/detalle/local?id=${item.id}`);
        }}
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

          {shouldDimImage && (
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

          {activeEvent && (
            <View style={styles.badgeEventoContainer}>
              <View style={styles.badgeEvento}>
                <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={starIconSize} color="#FFFFFF" />
                <Text style={[styles.badgeEventoText, { fontSize: scaleFontSize(11) }]} numberOfLines={1}>
                  {activeEvent.titulo}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.favoritoButton}
            onPress={(e) => handleToggleFavorito(item.id, e)}
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
              {categoriasAMostrar.map((categoria: string, catIndex: number) => (
                <View key={catIndex} style={styles.categoriaBadge}>
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
  }, [router, socialProfiles, activeEvents, user, isFavorite, handleToggleFavorito, handleComoLlegar, handlePerfilSocial, getBadgeInfo, getShouldDimImage, getCategoriasAMostrar, getDisplayRating]);

  // ✅ RENDER FOOTER
  const renderFooter = () => {
    if (filteredLocales.length === 0 && hasActiveFilters) {
      return null;
    }

    if (!hasMore && filteredLocales.length > 0) {
      return (
        <View style={styles.footerContainer}>
          <Text style={[styles.footerText, { fontSize: scaleFontSize(14) }]}>
            ✅ Has visto todos los locales disponibles
          </Text>
        </View>
      );
    }

    if (isLoading && filteredLocales.length >= ITEMS_PER_PAGE) {
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

  // ✅ RENDER EMPTY
  const renderEmpty = () => {
    if (isLoading && allLocales.length === 0) {
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
  };

  const modeIcon = getModeIcon();

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
                  onPress={() => {
                    if (Platform.OS === 'android') {
                      router.push('/explorar/selector-modo');
                    } else {
                      router.push('/explorar/selector-modo');
                    }
                  }}
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
          {CATEGORIAS.map((categoria) => (
            <TouchableOpacity
              key={categoria.id}
              style={styles.categoriaButtonCompact}
              onPress={() => handleCategoryChange(categoria.id)}
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
        </LinearGradient>
      </Animated.View>

      <FlatList
        ref={flatListRef}
        data={filteredLocales}
        renderItem={renderLocalCard}
        keyExtractor={(item: any) => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          { 
            marginTop: HEADER_MAX_HEIGHT,
            paddingTop: 0,
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
        onEndReached={filteredLocales.length > 0 ? loadMoreLocales : undefined}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={100}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />

      <FiltrosAvanzadosSheet
        visible={showAdvancedFilters}
        onClose={handleCloseAdvancedFilters}
      />
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
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? 36 : 50,
    paddingBottom: Platform.OS === 'android' ? 8 : 14,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 8 : 10,
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
    marginBottom: Platform.OS === 'android' ? 8 : 10,
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
    marginBottom: Platform.OS === 'android' ? 8 : 10,
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
    padding: 16,
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
  skeletonContainer: {
    padding: 16,
  },
  skeletonImage: {
    backgroundColor: colors.cardBorder,
    overflow: 'hidden',
    position: 'relative',
  },
  skeletonShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  skeletonText: {
    backgroundColor: colors.cardBorder,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardDestacado: {
    borderWidth: 3,
    borderColor: '#FACC15',
    ...Platform.select({
      ios: {
        shadowColor: '#FACC15',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  imageContainer: {
    width: '100%',
    height: 140,
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
    zIndex: 11,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
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
    zIndex: 10,
    maxWidth: '70%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
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
    zIndex: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
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
  badgeEventoContainer: {
    position: 'absolute',
    bottom: 56,
    left: 12,
    right: 12,
    zIndex: 9,
  },
  badgeEvento: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  badgeEventoText: {
    fontWeight: '700',
    color: colors.headerText,
    flex: 1,
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
});
