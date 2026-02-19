
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
import { calcularDistancia } from '@/utils/locationUtils';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { navigationOptimizer, useScreenPerformance } from '@/utils/performanceMonitor';
import { useFavorites } from '@/contexts/FavoritesContext';
import FiltrosAvanzadosSheet from '@/components/home/FiltrosAvanzadosSheet';
import { useFilters } from '@/contexts/FilterContext';
import { applyAdvancedFilters } from '@/utils/filterLocals';

const ITEMS_PER_PAGE = Platform.OS === 'android' ? 10 : 20;

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
 * ✅ EXPLORAR SCREEN v363.0 - CRITICAL PAGINATION FIX
 * 
 * 🔥 CRITICAL FIX v363.0:
 * Fixed the flickering and instability when loading the next batch of locales.
 * 
 * ROOT CAUSE:
 * - Multiple `onEndReached` calls were triggering due to state updates causing re-renders
 * - The `setTimeout` in `loadLocales` was causing delays and race conditions
 * - The ref guard wasn't being set early enough
 * 
 * SOLUTION:
 * - Removed the `setTimeout` from `loadLocales` for immediate state updates
 * - Set the ref guard IMMEDIATELY at the start of `loadMoreLocales`
 * - Added better state synchronization to prevent flickering
 * - Increased `onEndReachedThreshold` to 0.5 to prevent premature triggers
 * - Added `maintainVisibleContentPosition` to prevent scroll jumps
 */

export default function ExplorarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode, setCurrentMode, activeProfileType, activeLocalData } = useMode();
  const { prefetchNextPage, loadDataOnDemand } = useGlobalData();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const { 
    filtros: globalFiltros, 
    limpiarFiltros,
    hasActiveFilters,
  } = useFilters();
  
  const { isReady, deferOperation, deferDataLoading, deferWithPriority } = useScreenPerformance('Explorar');
  
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [allLoadedLocales, setAllLoadedLocales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [applyingFilters, setApplyingFilters] = useState(false);
  
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [socialProfiles, setSocialProfiles] = useState<Map<string, boolean>>(new Map());
  const [activeEvents, setActiveEvents] = useState<Map<string, any>>(new Map());
  
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState('Todas');

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const categoryCache = useRef<Map<string, {
    locales: any[];
    hasMore: boolean;
    timestamp: number;
  }>>(new Map());
  const preloadInProgress = useRef(false);
  const preloadedCategories = useRef<Set<string>>(new Set());

  const scrollY = useRef(0);
  const lastScrollY = useRef(0);
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastFiltersRef = useRef<string>('');
  const hasLoadedInitialDataRef = useRef(false);
  
  const flatListRef = useRef<FlatList>(null);
  
  const savedScrollPosition = useRef<number>(0);
  const isReturningFromDetail = useRef<boolean>(false);

  const loadMoreLocalesInProgressRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (isReturningFromDetail.current) {
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ 
            offset: savedScrollPosition.current, 
            animated: false 
          });
        }, 150);
        isReturningFromDetail.current = false;
      } else {
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          savedScrollPosition.current = 0;
        }, 100);
      }
    }, [])
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    
    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const isValidSpainCoordinate = useCallback((lat: number, lng: number): boolean => {
    const MIN_LAT = 27.0;
    const MAX_LAT = 44.0;
    const MIN_LNG = -18.5;
    const MAX_LNG = 5.0;
    
    return lat >= MIN_LAT && lat <= MAX_LAT && lng >= MIN_LNG && lng <= MAX_LNG;
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    if (Platform.OS === 'android') {
      setLocationReady(true);
      
      deferWithPriority(async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          
          if (!isMounted) return;
          
          if (status !== 'granted') {
            setLocationError('Permiso de ubicación denegado. Las distancias no estarán disponibles.');
            return;
          }

          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          
          if (!isMounted) return;
          
          const lat = location.coords.latitude;
          const lng = location.coords.longitude;
          
          if (!isValidSpainCoordinate(lat, lng)) {
            setLocationError('Ubicación fuera de España. Mostrando todos los locales.');
            setUserLocation(null);
            return;
          }
          
          setUserLocation({ lat, lng });
          setLocationError(null);
          
        } catch (error: any) {
          if (!isMounted) return;
          setLocationError('No se pudo obtener la ubicación. Mostrando todos los locales.');
          setUserLocation(null);
        }
      }, 'LOW');
      
      return () => {
        isMounted = false;
      };
    }
    
    const timer = setTimeout(() => {
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          
          if (!isMounted) return;
          
          if (status !== 'granted') {
            setLocationError('Permiso de ubicación denegado. Las distancias no estarán disponibles.');
            setLocationReady(true);
            return;
          }

          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          
          if (!isMounted) return;
          
          const lat = location.coords.latitude;
          const lng = location.coords.longitude;
          
          if (!isValidSpainCoordinate(lat, lng)) {
            setLocationError('Ubicación fuera de España. Mostrando todos los locales.');
            setUserLocation(null);
            setLocationReady(true);
            return;
          }
          
          setUserLocation({ lat, lng });
          setLocationError(null);
          setLocationReady(true);
          
        } catch (error: any) {
          if (!isMounted) return;
          setLocationError('No se pudo obtener la ubicación. Mostrando todos los locales.');
          setUserLocation(null);
          setLocationReady(true);
        }
      })();
    }, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isValidSpainCoordinate, deferWithPriority]);

  const preloadCategoryData = useCallback(async (category: string) => {
    if (Platform.OS === 'android') return;
    
    const cached = categoryCache.current.get(category);
    if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
      return;
    }

    try {
      const hasValidLocation = userLocation && isValidSpainCoordinate(userLocation.lat, userLocation.lng);
      
      const locationParams = hasValidLocation 
        ? { user_lat: userLocation.lat, user_lng: userLocation.lng }
        : { user_lat: null, user_lng: null };
      
      const { data, error } = await supabase.rpc('get_locales_paginados', {
        ...locationParams,
        p_limit: ITEMS_PER_PAGE,
        p_offset: 0,
      });

      if (error) return;

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
          
          const estadoLocal = getEstadoLocal(local);
          
          return {
            ...local,
            coordenadas: {
              lat: parseFloat(local.latitud),
              lng: parseFloat(local.longitud),
            },
            imagenes: local.galeria_urls || (local.imagen_url ? [local.imagen_url] : []),
            estadoCompleto: estadoLocal,
            estaAbierto: estadoLocal.estaAbierto,
            tieneHorarios: local.has_schedule_info,
            distancia: distanciaKm,
          };
        });

        let filteredLocales = transformedLocales;
        if (category !== 'todas') {
          filteredLocales = transformedLocales.filter(local => {
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
            
            const targetCategories = categoryMap[category] || [category];
            
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

        categoryCache.current.set(category, {
          locales: filteredLocales,
          hasMore: data.length >= ITEMS_PER_PAGE,
          timestamp: Date.now(),
        });

        preloadedCategories.current.add(category);
      }
    } catch (error) {
      console.error('[Explorar v363.0] ❌ Error preloading category:', error);
    }
  }, [userLocation, isValidSpainCoordinate]);

  const preloadAllCategories = useCallback(async () => {
    if (Platform.OS === 'android') return;
    
    if (preloadInProgress.current) return;

    preloadInProgress.current = true;

    try {
      await preloadCategoryData('todas');

      setTimeout(() => {
        const otherCategories = CATEGORIAS
          .filter(cat => cat.id !== 'todas')
          .map(cat => cat.id);

        Promise.all(
          otherCategories.map(category => preloadCategoryData(category))
        );
      }, 500);

    } catch (error) {
      console.error('[Explorar v363.0] ❌ Error preloading categories:', error);
    } finally {
      preloadInProgress.current = false;
    }
  }, [preloadCategoryData]);

  const loadLocales = useCallback(async (page: number = 1, append: boolean = false) => {
    console.log('[Explorar v363.0] 🔄 loadLocales START:', { 
      page, 
      append, 
      currentPage, 
      locationReady, 
      hasLoadedInitialDataRef: hasLoadedInitialDataRef.current,
      allLoadedLocalesLength: allLoadedLocales.length,
      hasMore,
      isLoadingMore,
      loadMoreLocalesInProgressRef: loadMoreLocalesInProgressRef.current
    });
    
    if (!locationReady && !hasLoadedInitialDataRef.current) {
      console.log('[Explorar v363.0] ⚠️ Location not ready and no initial data - ABORTING');
      return;
    }
    
    if (append && loadMoreLocalesInProgressRef.current) {
      console.log('[Explorar v363.0] ⚠️ Already loading more (ref guard) - ABORTING');
      return;
    }

    const filtersKey = `${selectedCategory}-${provinciaSeleccionada}`;
    
    if (!append) {
      const filtersChanged = filtersKey !== lastFiltersRef.current;

      if (filtersChanged) {
        console.log('[Explorar v363.0] 🔄 Filters changed, resetting pagination');
        lastFiltersRef.current = filtersKey;
        setCurrentPage(1);
        setAllLoadedLocales([]);
        setHasMore(true);
        setIsLoadingMore(false);
        loadMoreLocalesInProgressRef.current = false;
        page = 1;
        
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          savedScrollPosition.current = 0;
        }, 100);
      } else if (lastFiltersRef.current === '') {
        lastFiltersRef.current = filtersKey;
        console.log('[Explorar v363.0] 🆕 First load, initializing filter ref');
      }
    } else {
      console.log('[Explorar v363.0] ✅ Appending data (page', page, '), NOT checking filter ref');
    }

    if (page === 1 && !append && provinciaSeleccionada === 'Todas') {
      const cached = categoryCache.current.get(selectedCategory);
      if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
        console.log('[Explorar v363.0] 📦 Using cached data for category:', selectedCategory);
        setAllLoadedLocales(cached.locales);
        setHasMore(cached.hasMore);
        setIsInitialLoad(false);
        hasLoadedInitialDataRef.current = true;
        
        if (savedScrollPosition.current > 0 && isReturningFromDetail.current) {
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({ 
              offset: savedScrollPosition.current, 
              animated: false 
            });
          }, 150);
        }
        
        if (Platform.OS !== 'android') {
          const localIdsToCheck = cached.locales.slice(0, 30).map((l: any) => l.id);
          if (localIdsToCheck.length > 0) {
            deferWithPriority(async () => {
              try {
                const [postsResult, eventsResult] = await Promise.all([
                  supabase
                    .from('posts')
                    .select('local_id')
                    .eq('tipo', 'local')
                    .in('local_id', localIdsToCheck),
                  supabase
                    .from('eventos')
                    .select('id, titulo, fecha, fecha_fin, hora, hora_fin, imagen_url, precio, local_id')
                    .eq('activo', true)
                    .in('local_id', localIdsToCheck)
                    .order('fecha', { ascending: true })
                    .order('hora', { ascending: true })
                ]);

                if (!postsResult.error && postsResult.data) {
                  const newSocialProfiles = new Map();
                  const localsWithPosts = new Set(postsResult.data.map(p => p.local_id));
                  
                  localIdsToCheck.forEach((localId: string) => {
                    newSocialProfiles.set(localId, localsWithPosts.has(localId));
                  });
                  
                  setSocialProfiles(prev => new Map([...prev, ...newSocialProfiles]));
                }

                if (!eventsResult.error && eventsResult.data) {
                  const now = new Date();
                  const newActiveEvents = new Map();

                  const eventsByLocal = new Map<string, any[]>();
                  eventsResult.data.forEach(event => {
                    if (!eventsByLocal.has(event.local_id)) {
                      eventsByLocal.set(event.local_id, []);
                    }
                    eventsByLocal.get(event.local_id)!.push(event);
                  });

                  eventsByLocal.forEach((events, localId) => {
                    let liveEvent = null;
                    let upcomingEvent = null;

                    for (const event of events) {
                      const eventStartDate = new Date(`${event.fecha}T${event.hora}`);
                      
                      let eventEndDate: Date;
                      if (event.fecha_fin && event.hora_fin) {
                        eventEndDate = new Date(`${event.fecha_fin}T${event.hora_fin}`);
                      } else {
                        eventEndDate = new Date(eventStartDate.getTime() + 4 * 60 * 60 * 1000);
                      }

                      if (now >= eventStartDate && now <= eventEndDate) {
                        liveEvent = event;
                        break;
                      }

                      if (!upcomingEvent && now < eventStartDate) {
                        upcomingEvent = event;
                      }
                    }

                    if (liveEvent || upcomingEvent) {
                      newActiveEvents.set(localId, liveEvent || upcomingEvent);
                    }
                  });

                  setActiveEvents(prev => new Map([...prev, ...newActiveEvents]));
                }
              } catch (error) {
                console.error('[Explorar v363.0] ❌ Error loading social data:', error);
              }
            }, 'LOW');
          }
        }
        
        return;
      }
    }

    if (append) {
      console.log('[Explorar v363.0] 📊 Setting loading more state');
      setIsLoadingMore(true);
      loadMoreLocalesInProgressRef.current = true;
    } else {
      if (!hasLoadedInitialDataRef.current) {
        setIsInitialLoad(true);
      }
      setLoading(true);
    }

    try {
      const hasValidLocation = userLocation && isValidSpainCoordinate(userLocation.lat, userLocation.lng);
      
      const locationParams = hasValidLocation 
        ? { user_lat: userLocation.lat, user_lng: userLocation.lng }
        : { user_lat: null, user_lng: null };
      
      const offset = (page - 1) * ITEMS_PER_PAGE;
      
      console.log('[Explorar v363.0] 🌐 Fetching locales:', { 
        page, 
        offset, 
        limit: ITEMS_PER_PAGE,
        hasValidLocation,
        selectedCategory,
        provinciaSeleccionada
      });
      
      const { data, error } = await supabase.rpc('get_locales_paginados', {
        ...locationParams,
        p_limit: ITEMS_PER_PAGE,
        p_offset: offset,
      });

      if (error) {
        console.error('[Explorar v363.0] ❌ Error fetching locales:', error);
        throw error;
      }

      console.log('[Explorar v363.0] ✅ Fetched', data?.length || 0, 'locales from backend');

      if (data && data.length > 0) {
        const transformedLocales = data.map((local: any) => {
          let distanciaKm = null;
          
          if (Platform.OS !== 'android' && hasValidLocation && local.latitud && local.longitud) {
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
          
          const estadoLocal = getEstadoLocal(local);
          
          return {
            ...local,
            coordenadas: {
              lat: parseFloat(local.latitud),
              lng: parseFloat(local.longitud),
            },
            imagenes: local.galeria_urls || (local.imagen_url ? [local.imagen_url] : []),
            estadoCompleto: estadoLocal,
            estaAbierto: estadoLocal.estaAbierto,
            tieneHorarios: local.has_schedule_info,
            distancia: distanciaKm,
          };
        });

        console.log('[Explorar v363.0] 🔄 Transformed', transformedLocales.length, 'locales');

        if (append) {
          console.log('[Explorar v363.0] ➕ APPEND MODE - Current state:', {
            existingLocales: allLoadedLocales.length,
            newLocales: transformedLocales.length,
            currentPage
          });
          
          const existingIds = new Set(allLoadedLocales.map(l => l.id));
          console.log('[Explorar v363.0] 📋 Existing IDs count:', existingIds.size);
          
          const newUniqueLocales = transformedLocales.filter(l => !existingIds.has(l.id));
          
          console.log('[Explorar v363.0] 🔍 Deduplication results:', {
            fetched: transformedLocales.length,
            duplicates: transformedLocales.length - newUniqueLocales.length,
            unique: newUniqueLocales.length
          });
          
          if (newUniqueLocales.length > 0) {
            console.log('[Explorar v363.0] ✅ Adding', newUniqueLocales.length, 'new unique locales');
            
            setAllLoadedLocales(prev => {
              const updated = [...prev, ...newUniqueLocales];
              console.log('[Explorar v363.0] 📊 Updated allLoadedLocales:', {
                previous: prev.length,
                added: newUniqueLocales.length,
                total: updated.length
              });
              return updated;
            });
            
            setCurrentPage(page);
            console.log('[Explorar v363.0] ✅ Updated currentPage to:', page);
            
            const hasMoreData = newUniqueLocales.length >= ITEMS_PER_PAGE;
            setHasMore(hasMoreData);
            console.log('[Explorar v363.0] 📊 Has more data:', hasMoreData, '(unique:', newUniqueLocales.length, ', page size:', ITEMS_PER_PAGE, ')');
          } else {
            console.log('[Explorar v363.0] ⚠️ NO NEW UNIQUE LOCALES - All were duplicates');
            console.log('[Explorar v363.0] ⚠️ Marking hasMore as FALSE');
            console.log('[Explorar v363.0] ⚠️ NOT incrementing currentPage (stays at', currentPage, ')');
            setHasMore(false);
          }
        } else {
          console.log('[Explorar v363.0] 🔄 REPLACE MODE - Setting', transformedLocales.length, 'locales');
          setAllLoadedLocales(transformedLocales);
          setCurrentPage(page);
          
          const hasMoreData = data.length >= ITEMS_PER_PAGE;
          setHasMore(hasMoreData);
          console.log('[Explorar v363.0] 📊 Has more data:', hasMoreData, '(fetched:', data.length, ', page size:', ITEMS_PER_PAGE, ')');
        }
        
        hasLoadedInitialDataRef.current = true;
      } else {
        console.log('[Explorar v363.0] ⚠️ No data returned from backend');
        setHasMore(false);
        if (!append) {
          setAllLoadedLocales([]);
        }
      }
    } catch (error) {
      console.error('[Explorar v363.0] ❌ Error loading locales:', error);
      Alert.alert('Error', 'No se pudieron cargar los locales');
    } finally {
      console.log('[Explorar v363.0] ✅ Load complete, resetting loading states');
      setLoading(false);
      setIsInitialLoad(false);
      setIsLoadingMore(false);
      loadMoreLocalesInProgressRef.current = false;
    }
  }, [userLocation, isValidSpainCoordinate, selectedCategory, provinciaSeleccionada, deferWithPriority, locationReady, allLoadedLocales, currentPage]);

  const filteredLocales = useMemo(() => {
    const startTime = Date.now();
    console.log('[Explorar v363.0] 🔍 Starting filter application...');
    console.log('[Explorar v363.0] 📊 Input:', allLoadedLocales.length, 'locals');
    
    const query = debouncedQuery.toLowerCase().trim();
    
    let filtered = allLoadedLocales;
    
    if (selectedCategory && selectedCategory !== 'todas') {
      console.log('[Explorar v363.0] 🏷️ Applying category filter:', selectedCategory);
      const beforeCategoryFilter = filtered.length;
      
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
      
      console.log('[Explorar v363.0] 🏷️ Category filter removed:', beforeCategoryFilter - filtered.length, 'locals');
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

    const beforeAdvancedFilters = filtered.length;
    filtered = applyAdvancedFilters(filtered, globalFiltros);
    console.log('[Explorar v363.0] 🔧 Advanced filters removed:', beforeAdvancedFilters - filtered.length, 'locals');

    const uniqueLocales = filtered.filter((item, index, self) =>
      index === self.findIndex((t) => t.id === item.id)
    );

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('[Explorar v363.0] ✅ Filter application complete');
    console.log('[Explorar v363.0] ⏱️ Duration:', duration, 'ms');
    console.log('[Explorar v363.0] 📊 Result:', uniqueLocales.length, 'locals');

    return uniqueLocales;
  }, [allLoadedLocales, debouncedQuery, selectedCategory, globalFiltros, hasActiveFilters]);

  useEffect(() => {
    if (locationReady && !hasLoadedInitialDataRef.current && !loadMoreLocalesInProgressRef.current) {
      console.log('[Explorar v363.0] 🚀 Initial load triggered');
      if (Platform.OS === 'android') {
        loadLocales(1, false);
        
        deferWithPriority(() => {
          loadDataOnDemand('locales');
        }, 'MEDIUM');
      } else {
        preloadAllCategories();
        loadLocales(1, false);
      }
    }
  }, [locationReady, loadLocales, preloadAllCategories, loadDataOnDemand, deferWithPriority]);

  useEffect(() => {
    if (locationReady && hasLoadedInitialDataRef.current && !loadMoreLocalesInProgressRef.current) {
      console.log('[Explorar v363.0] 🔄 Filters changed, reloading');
      loadLocales(1, false);
    }
  }, [selectedCategory, provinciaSeleccionada, locationReady, loadLocales]);

  const loadMoreLocales = useCallback(async () => {
    console.log('[Explorar v363.0] 📊 loadMoreLocales called:', {
      hasMore,
      isLoadingMore,
      loading,
      locationReady,
      currentPage,
      allLoadedLocalesLength: allLoadedLocales.length,
      filteredLocalesLength: filteredLocales.length,
      loadMoreLocalesInProgressRef: loadMoreLocalesInProgressRef.current,
    });
    
    // 🔥 CRITICAL FIX v363.0: Set ref IMMEDIATELY to prevent race conditions
    if (loadMoreLocalesInProgressRef.current) {
      console.log('[Explorar v363.0] ⚠️ Already loading more (ref guard) - ABORTING');
      return;
    }
    
    if (!hasMore) {
      console.log('[Explorar v363.0] ⚠️ No more data to load - ABORTING');
      return;
    }
    
    if (isLoadingMore) {
      console.log('[Explorar v363.0] ⚠️ Already loading more (state) - ABORTING');
      return;
    }
    
    if (loading) {
      console.log('[Explorar v363.0] ⚠️ Already loading - ABORTING');
      return;
    }
    
    if (!locationReady) {
      console.log('[Explorar v363.0] ⚠️ Location not ready - ABORTING');
      return;
    }

    // 🔥 CRITICAL FIX v363.0: Set the ref IMMEDIATELY before any async operations
    loadMoreLocalesInProgressRef.current = true;
    setIsLoadingMore(true);

    const nextPage = currentPage + 1;
    console.log('[Explorar v363.0] ✅ Loading more locales, next page:', nextPage, '(current:', currentPage, ')');
    
    try {
      await loadLocales(nextPage, true);
    } catch (error) {
      console.error('[Explorar v363.0] ❌ Error loading more locales:', error);
    } finally {
      // Reset states in finally block to ensure they're always reset
      setIsLoadingMore(false);
      loadMoreLocalesInProgressRef.current = false;
    }
  }, [hasMore, isLoadingMore, loading, currentPage, locationReady, loadLocales, allLoadedLocales.length, filteredLocales.length]);

  const onRefresh = async () => {
    console.log('[Explorar v363.0] 🔄 Refresh triggered');
    setRefreshing(true);
    setSearchQuery('');
    setDebouncedQuery('');
    setSelectedCategory('todas');
    setProvinciaSeleccionada('Todas');
    setCurrentPage(1);
    setAllLoadedLocales([]);
    setHasMore(true);
    setIsLoadingMore(false);
    loadMoreLocalesInProgressRef.current = false;
    
    categoryCache.current.clear();
    preloadedCategories.current.clear();
    preloadInProgress.current = false;
    
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      savedScrollPosition.current = 0;
    }, 100);
    
    await preloadAllCategories();
    await loadLocales(1, false);
    setRefreshing(false);
  };

  const clearFilters = useCallback(() => {
    console.log('[Explorar v363.0] 🧹 Clearing filters');
    setSearchQuery('');
    setDebouncedQuery('');
    setSelectedCategory('todas');
    setProvinciaSeleccionada('Todas');
    
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      savedScrollPosition.current = 0;
    }, 100);
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (debouncedQuery.trim()) count++;
    if (selectedCategory !== 'todas') count++;
    if (provinciaSeleccionada !== 'Todas') count++;
    return count;
  }, [debouncedQuery, selectedCategory, provinciaSeleccionada]);

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
    console.log('[Explorar v363.0] 🔍 Opening advanced filters');
    setShowAdvancedFilters(true);
  }, []);

  const handleCloseAdvancedFilters = useCallback(() => {
    console.log('[Explorar v363.0] ✅ Closing advanced filters');
    setShowAdvancedFilters(false);
  }, []);

  const handleClearAdvancedFilters = useCallback(() => {
    console.log('[Explorar v363.0] 🧹 Clearing advanced filters');
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

  const handleScroll = useCallback((event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    savedScrollPosition.current = currentScrollY;
    
    const diff = currentScrollY - lastScrollY.current;
    
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

    if (isLoadingMore && filteredLocales.length > 0) {
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
    if (isInitialLoad) {
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
              ? 'Tienes filtros avanzados activos que están limitando los resultados' 
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

  const searchBoxHeight = getSearchBoxHeight();
  const categoryIconSize = getCategoryIconSize();
  const categoryIconInnerSize = getCategoryIconInnerSize();
  const modeIcon = getModeIcon();

  const headerTitleSize = Platform.OS === 'android' ? scaleFontSize(32) : 32;
  const headerIconSize = Platform.OS === 'android' ? scaleIconSize(28) : 28;

  return (
    <View style={styles.container}>
      {applyingFilters && (
        <View style={styles.filterLoadingOverlay}>
          <View style={styles.filterLoadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.filterLoadingText, { fontSize: scaleFontSize(15) }]}>
              Aplicando filtros...
            </Text>
          </View>
        </View>
      )}

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

          {hasActiveFilters && (
            <View style={styles.activeFiltersBanner}>
              <View style={styles.activeFiltersBannerLeft}>
                <IconSymbol ios_icon_name="slider.horizontal.3" android_material_icon_name="tune" size={scaleIconSize(16)} color="#3B82F6" />
                <Text style={[styles.activeFiltersBannerText, { fontSize: scaleFontSize(12) }]} numberOfLines={2}>
                  Filtros avanzados activos
                </Text>
              </View>
              <TouchableOpacity 
                onPress={handleClearAdvancedFilters}
                style={styles.activeFiltersBannerButton}
                activeOpacity={0.7}
              >
                <Text style={[styles.activeFiltersBannerButtonText, { fontSize: scaleFontSize(12) }]}>
                  Limpiar
                </Text>
              </TouchableOpacity>
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
              onPress={() => {
                setSelectedCategory(categoria.id);
                
                setTimeout(() => {
                  flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                  savedScrollPosition.current = 0;
                }, 100);
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
        </LinearGradient>
      </Animated.View>

      <FlatList
        ref={flatListRef}
        data={filteredLocales}
        renderItem={renderLocalCard}
        keyExtractor={(item: any) => item.id}
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
        initialNumToRender={15}
        maxToRenderPerBatch={15}
        windowSize={10}
        removeClippedSubviews={false}
        updateCellsBatchingPeriod={50}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        getItemLayout={(data, index) => ({
          length: 280,
          offset: 280 * index,
          index,
        })}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10,
        }}
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
  filterLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  filterLoadingCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  filterLoadingText: {
    fontWeight: '600',
    color: colors.text,
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
  activeFiltersBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  activeFiltersBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  activeFiltersBannerText: {
    flex: 1,
    color: colors.headerText,
    fontWeight: '600',
  },
  activeFiltersBannerButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  activeFiltersBannerButtonText: {
    color: colors.headerText,
    fontWeight: '700',
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
  filterIconButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
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
  categoriaButton: {
    alignItems: 'center',
    gap: 6,
    minWidth: 70,
  },
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
  categoriaLabel: {
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
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
