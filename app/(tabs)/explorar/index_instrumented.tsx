
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 EXPLORAR SCREEN - INSTRUMENTADO PARA FASE 0 & 1 (TTI)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ESTE ARCHIVO ES UNA COPIA INSTRUMENTADA DE app/(tabs)/explorar/index.tsx
 * 
 * INSTRUCCIONES:
 * 1. Renombrar app/(tabs)/explorar/index.tsx a app/(tabs)/explorar/index_original.tsx
 * 2. Renombrar este archivo a app/(tabs)/explorar/index.tsx
 * 3. Correr la app
 * 
 * MÉTRICAS QUE SE MIDEN:
 * - TTI_MainContentRendered: Tiempo hasta que la UI es interactiva (lista renderizada)
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
import PerformanceTracker from '@/utils/performanceTracker';

// ✅ Animated FlashList
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

// ... (copiar todas las interfaces, constantes, y componentes auxiliares del archivo original)

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
}

interface Category {
  id: string;
  nombre: string;
  iosIcon: string;
  androidIcon: string;
}

const HEADER_MAX_HEIGHT = Platform.OS === 'android' ? 200 : 240;
const ITEMS_PER_PAGE = 10;
const PRELOAD_THRESHOLD = 0.4;
const SCROLL_THROTTLE = 16;
const INITIAL_NUM_TO_RENDER = 8;
const MAX_TO_RENDER_PER_BATCH = 8;
const WINDOW_SIZE = 4;
const ESTIMATED_ITEM_SIZE = 350;
const DRAW_DISTANCE = Dimensions.get('window').height * 1.5;

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

const SkeletonCard = memo(() => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonImage} />
    <View style={styles.skeletonContent}>
      <View style={[styles.skeletonLine, { width: '70%', height: 20 }]} />
      <View style={[styles.skeletonLine, { width: '90%', height: 14, marginTop: 8 }]} />
      <View style={styles.skeletonBadges}>
        <View style={[styles.skeletonLine, { width: 80, height: 24, borderRadius: 6 }]} />
        <View style={[styles.skeletonLine, { width: 100, height: 24, borderRadius: 6 }]} />
      </View>
    </View>
  </View>
));

SkeletonCard.displayName = 'SkeletonCard';

export default function ExplorarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode } = useMode();
  const queryClient = useQueryClient();
  
  const filtros = useFilterStore(state => state.filtros);
  const selectedCategory = useFilterStore(state => state.selectedCategory);
  const setSelectedCategory = useFilterStore(state => state.setSelectedCategory);
  const limpiarFiltros = useFilterStore(state => state.limpiarFiltros);
  const hasActiveFilters = useFilterStore(state => state.hasActiveFilters);

  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number }>(DEFAULT_LOCATION);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [listKey, setListKey] = useState(0);
  const [ttiReported, setTtiReported] = useState(false);
  
  const flashListRef = useRef<FlashList<Venue>>(null);
  const debouncedQuery = useDebounce(searchQuery, 500);
  
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
  
  const allVenues = useMemo(() => {
    if (!data?.pages) return [];
    
    const flatVenues = data.pages.flatMap(page => page?.venues || []);
    const uniqueVenues = Array.from(new Map(flatVenues.map(v => [v.id, v])).values());
    
    console.log('[ExplorarScreen INSTRUMENTED] 📊 Venues:', {
      total: flatVenues.length,
      unique: uniqueVenues.length,
      duplicates: flatVenues.length - uniqueVenues.length,
    });
    
    return uniqueVenues;
  }, [data]);
  
  // ✅ INSTRUMENTACIÓN: Medir TTI cuando la lista se renderiza por primera vez
  useEffect(() => {
    if (allVenues.length > 0 && !isLoading && !isFetching && !ttiReported) {
      // ✅ MEDICIÓN: TTI (Time To Interactive)
      PerformanceTracker.end('AppLaunch', 'TTI_MainContentRendered');
      
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('🎉 TTI ALCANZADO - CONTENIDO PRINCIPAL RENDERIZADO');
      console.log('═══════════════════════════════════════════════════════');
      console.log(PerformanceTracker.getSummary());
      console.log('═══════════════════════════════════════════════════════\n');
      
      // ✅ Imprimir JSON para fácil copia
      console.log('📋 COPIAR ESTE JSON:');
      console.log(JSON.stringify(PerformanceTracker.getMeasures(), null, 2));
      
      setTtiReported(true);
      
      // ✅ Limpiar mediciones para próxima sesión
      setTimeout(() => {
        PerformanceTracker.clearMeasures();
      }, 5000);
    }
  }, [allVenues, isLoading, isFetching, ttiReported]);
  
  // ... (copiar el resto del código del archivo original)
  
  const handleScrollToTopAndRefresh = useCallback(() => {
    console.log('[ExplorarScreen INSTRUMENTED] 🚀 Scroll to top & refresh');
    
    queryClient.resetQueries({ queryKey: ['bares_infinite_v24.0.0'] });
    setListKey(prev => prev + 1);
    
    setTimeout(() => {
      if (flashListRef.current) {
        try {
          flashListRef.current.scrollToOffset({ offset: 0, animated: false });
        } catch (error) {
          console.warn('[ExplorarScreen INSTRUMENTED] ⚠️ Scroll error:', error);
        }
      }
    }, 50);
    
    setTimeout(() => {
      refetch();
    }, 100);
  }, [queryClient, refetch]);
  
  useScrollToTop(
    useRef({
      scrollToTop: handleScrollToTopAndRefresh,
    })
  );
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('up');

  useEffect(() => {
    let isMounted = true;
    
    const fetchLocation = async () => {
      try {
        console.log('[ExplorarScreen INSTRUMENTED] 📍 Fetching location...');
        const location = await getOptimizedUserLocation();
        
        if (isMounted && location) {
          console.log('[ExplorarScreen INSTRUMENTED] ✅ Location obtained');
          
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          setLocationError(null);
        } else if (isMounted) {
          console.warn('[ExplorarScreen INSTRUMENTED] ⚠️ Using default location');
          setLocationError('Usando ubicación por defecto (Madrid)');
        }
      } catch (error) {
        if (isMounted) {
          console.error('[ExplorarScreen INSTRUMENTED] ❌ Location error:', error);
          setLocationError('Usando ubicación por defecto (Madrid)');
        }
      }
    };
    
    fetchLocation();
    
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    console.log('[ExplorarScreen INSTRUMENTED] 🔄 Filters changed - Resetting list');
    
    setListKey(prev => prev + 1);
    
    setTimeout(() => {
      if (flashListRef.current) {
        try {
          flashListRef.current.scrollToOffset({ offset: 0, animated: false });
        } catch (error) {
          console.warn('[ExplorarScreen INSTRUMENTED] ⚠️ Scroll error:', error);
        }
      }
    }, 50);
  }, [selectedCategory, filtros, debouncedQuery, hasActiveFilters]);

  const loadMoreVenues = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !error) {
      console.log('[ExplorarScreen INSTRUMENTED] 🚀 Loading next page');
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, error, fetchNextPage]);

  const onRefresh = useCallback(() => {
    console.log('[ExplorarScreen INSTRUMENTED] 🔄 Pull-to-refresh');
    refetch();
  }, [refetch]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'todos' && selectedCategory !== null) count++;
    if (debouncedQuery) count++;
    return count;
  }, [selectedCategory, debouncedQuery]);

  const handleCategoryChange = useCallback((categoryId: string) => {
    console.log('[ExplorarScreen INSTRUMENTED] 🏷️ Category changed:', categoryId);
    const newCategory = categoryId === 'todos' ? null : categoryId;
    setSelectedCategory(newCategory);
  }, [setSelectedCategory]);

  const clearFilters = useCallback(() => {
    console.log('[ExplorarScreen INSTRUMENTED] 🧹 Clearing filters');
    setSearchQuery('');
    limpiarFiltros();
  }, [limpiarFiltros]);

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

  const renderVenueCard = useCallback(({ item, index }: { item: Venue; index: number }) => {
    if (!item || !item.id) {
      console.warn('[ExplorarScreen INSTRUMENTED] ⚠️ Invalid item at index:', index);
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
    if ((isLoading || isFetching) && allVenues.length === 0 && !data) {
      return (
        <View style={styles.skeletonContainer}>
          {[...Array(5)].map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </View>
      );
    }
    
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
  ]);

  const modeIcon = getModeIcon();

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

  return (
    <View style={styles.container}>
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
          {/* ... (copiar todo el header del archivo original) */}
        </LinearGradient>
      </Animated.View>

      {allVenues.length > 0 || isLoading || isFetching ? (
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
          ListEmptyComponent={renderEmpty}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      ) : (
        <View style={[styles.listContent, { marginTop: HEADER_MAX_HEIGHT }]}>
          {renderEmpty()}
        </View>
      )}

      <FiltrosAvanzadosSheet
        visible={showAdvancedFilters}
        onClose={handleCloseAdvancedFilters}
      />
    </View>
  );
}

// ... (copiar todos los estilos del archivo original)

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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
