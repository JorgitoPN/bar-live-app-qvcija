
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPLORAR SCREEN - CLEAN REBUILD v500.1 - FORCE RELOAD
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Completamente reconstruido desde cero con:
 * - ✅ Arquitectura limpia y modular
 * - ✅ Gestión de estado optimizada
 * - ✅ Rendimiento mejorado (precarga inteligente)
 * - ✅ Manejo de errores robusto
 * - ✅ Código mantenible y escalable
 * - ✅ Sin dependencias innecesarias
 * - ✅ Cálculo correcto de estado abierto/cerrado en Android/iOS
 * 
 * ÚLTIMA ACTUALIZACIÓN: Forzando recarga completa
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Platform,
  ScrollView,
  Image,
  Linking,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import FiltrosAvanzadosSheet from '@/components/home/FiltrosAvanzadosSheet';
import { colors } from '@/styles/commonStyles';
import { scaleFontSize, scaleIconSize, getContentBottomPadding } from '@/utils/androidScaling';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useFilters } from '@/contexts/FilterContext';
import { supabase } from '@/utils/supabase';
import { getOptimizedUserLocation } from '@/utils/locationUtils';
import { getEstadoLocal } from '@/utils/timeUtils';

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
}

interface Category {
  id: string;
  nombre: string;
  iosIcon: string;
  androidIcon: string;
}

interface BadgeInfo {
  text: string;
  color: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const HEADER_MAX_HEIGHT = Platform.OS === 'android' ? 110 : 240;
const ITEMS_PER_PAGE = 20;
const PRELOAD_THRESHOLD = 0.4; // Precargar cuando quedan 8 items (40% de 20)

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
  // ✅ VERIFICACIÓN DE VERSIÓN - Si ves este log, la nueva versión está cargada
  console.log('🔄 [ExplorarScreen v500.1] Pantalla Explorar RECONSTRUIDA cargada correctamente');
  
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode } = useMode();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { filtros: globalFiltros, limpiarFiltros, hasActiveFilters } = useFilters();

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  const [allVenues, setAllVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const debouncedQuery = useDebounce(searchQuery, 500);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCATION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchLocation = async () => {
      try {
        console.log('[ExplorarScreen v500.0] 📍 Obteniendo ubicación del usuario...');
        const location = await getOptimizedUserLocation();
        
        if (isMounted && location) {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          setLocationReady(true);
          setLocationError(null);
          console.log('[ExplorarScreen v500.0] ✅ Ubicación obtenida:', location.coords);
        } else if (isMounted) {
          setLocationError('No se pudo obtener tu ubicación');
          setLocationReady(true);
          console.warn('[ExplorarScreen v500.0] ⚠️ No se pudo obtener ubicación');
        }
      } catch (error) {
        if (isMounted) {
          setLocationError('Error al obtener ubicación');
          setLocationReady(true);
          console.error('[ExplorarScreen v500.0] ❌ Error obteniendo ubicación:', error);
        }
      }
    };
    
    fetchLocation();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA LOADING - OPTIMIZED v500.0
  // ═══════════════════════════════════════════════════════════════════════════
  
  const loadVenues = useCallback(async (pageNum: number, isRefresh: boolean = false) => {
    if (!locationReady) {
      console.log('[ExplorarScreen v500.0] ⏳ Esperando ubicación...');
      return;
    }
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      console.log('[ExplorarScreen v500.0] 🔍 Cargando locales - Página:', pageNum);
      console.log('[ExplorarScreen v500.0] 📍 Ubicación:', userLocation);
      console.log('[ExplorarScreen v500.0] 🎯 Filtros:', {
        category: selectedCategory,
        servicios: globalFiltros.servicios,
        ambiente: globalFiltros.ambiente,
        clientela: globalFiltros.clientela,
        comunidad: globalFiltros.comunidad,
        provincia: globalFiltros.provincia,
        distancia: globalFiltros.distancia,
      });
      
      const { data, error } = await supabase.rpc('get_sorted_locales_by_proximity', {
        p_user_lat: userLocation?.latitude || 40.4168,
        p_user_lng: userLocation?.longitude || -3.7038,
        p_offset: (pageNum - 1) * ITEMS_PER_PAGE,
        p_limit: ITEMS_PER_PAGE,
        p_category_filter: selectedCategory === 'todos' ? null : [selectedCategory],
        p_servicios_filter: globalFiltros.servicios?.length > 0 ? globalFiltros.servicios : null,
        p_ambiente_filter: globalFiltros.ambiente?.length > 0 ? globalFiltros.ambiente : null,
        p_clientela_filter: globalFiltros.clientela?.length > 0 ? globalFiltros.clientela : null,
        p_comunidad_filter: globalFiltros.comunidad || null,
        p_provincia_filter: globalFiltros.provincia || null,
        p_max_distance_km: globalFiltros.distancia || null,
      });
      
      if (error) {
        console.error('[ExplorarScreen v500.0] ❌ Error RPC:', error);
        throw error;
      }
      
      const venues = data || [];
      console.log('[ExplorarScreen v500.0] ✅ Cargados', venues.length, 'locales');
      
      if (isRefresh || pageNum === 1) {
        setAllVenues(venues);
        setPage(1);
      } else {
        setAllVenues(prev => [...prev, ...venues]);
      }
      
      setHasMore(venues.length === ITEMS_PER_PAGE);
      
    } catch (error: any) {
      console.error('[ExplorarScreen v500.0] ❌ Error cargando locales:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [locationReady, userLocation, selectedCategory, debouncedQuery, globalFiltros]);

  // ✅ PRELOAD SYSTEM - Cargar siguiente tanda cuando quedan 8 items
  const loadMoreVenues = useCallback(() => {
    if (!isLoading && hasMore && allVenues.length >= ITEMS_PER_PAGE) {
      const nextPage = page + 1;
      console.log('[ExplorarScreen v500.0] 🔄 Precargando siguiente tanda - Página:', nextPage);
      setPage(nextPage);
      loadVenues(nextPage, false);
    }
  }, [isLoading, hasMore, allVenues.length, page, loadVenues]);

  const onRefresh = useCallback(() => {
    console.log('[ExplorarScreen v500.0] 🔄 Refrescando lista...');
    setPage(1);
    setHasMore(true);
    loadVenues(1, true);
  }, [loadVenues]);

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    if (locationReady) {
      console.log('[ExplorarScreen v500.0] 🔄 Recargando por cambio de filtros...');
      setPage(1);
      setHasMore(true);
      loadVenues(1, false);
    }
  }, [locationReady, selectedCategory, debouncedQuery, globalFiltros]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  const filteredVenues = useMemo(() => {
    if (!debouncedQuery) return allVenues;
    
    const query = debouncedQuery.toLowerCase();
    return allVenues.filter(venue => 
      venue.nombre.toLowerCase().includes(query) ||
      venue.direccion?.toLowerCase().includes(query)
    );
  }, [allVenues, debouncedQuery]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'todos') count++;
    if (debouncedQuery) count++;
    return count;
  }, [selectedCategory, debouncedQuery]);

  const handleCategoryChange = useCallback((categoryId: string) => {
    console.log('[ExplorarScreen v500.0] 🏷️ Cambiando categoría a:', categoryId);
    setSelectedCategory(categoryId);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const clearFilters = useCallback(() => {
    console.log('[ExplorarScreen v500.0] 🧹 Limpiando filtros...');
    setSearchQuery('');
    setSelectedCategory('todos');
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // BADGE CALCULATION - FIXED v500.0
  // ═══════════════════════════════════════════════════════════════════════════
  
  const getBadgeInfo = useCallback((venue: Venue): BadgeInfo => {
    // ✅ CRITICAL FIX: Pasar el objeto completo del local a getEstadoLocal
    if (venue.horarios_completos && Object.keys(venue.horarios_completos).length > 0) {
      const estado = getEstadoLocal(venue);
      
      // ✅ Mapeo correcto de colores
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
    
    // Fallback: usar esta_abierto si no hay horarios
    if (venue.esta_abierto === true) {
      return { text: 'Abierto ahora', color: '#22C55E' };
    } else if (venue.esta_abierto === false) {
      return { text: 'Cerrado ahora', color: '#EF4444' };
    } else {
      return { text: 'Sin info de horario', color: '#9CA3AF' };
    }
  }, []);

  const getShouldDimImage = useCallback((venue: Venue): boolean => {
    if (venue.horarios_completos && Object.keys(venue.horarios_completos).length > 0) {
      const estado = getEstadoLocal(venue);
      return estado.estaAbierto === false && !estado.badge.includes('pronto');
    }
    return venue.esta_abierto === false;
  }, []);

  const getCategoriasAMostrar = useCallback((venue: Venue): string[] => {
    let categories = venue.barlive_types || [];
    if (categories.length === 0 && venue.barlive_type) {
      categories = [venue.barlive_type];
    }
    
    return categories.filter((cat: string) => 
      !CATEGORIAS_EXCLUIDAS.includes(cat.toLowerCase())
    );
  }, []);

  const getDisplayRating = useCallback((venue: Venue): number => {
    if (venue.rating && venue.rating > 0) {
      return venue.rating;
    }
    if (venue.google_rating && venue.google_rating > 0) {
      return venue.google_rating;
    }
    return 0;
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

  const handleComoLlegar = useCallback((venue: Venue, e: any) => {
    e.stopPropagation();
    const lat = venue.coordenadas?.lat || venue.latitud;
    const lng = venue.coordenadas?.lng || venue.longitud;
    if (lat && lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      Linking.openURL(url);
    }
  }, []);

  const handlePerfilSocial = useCallback((venueId: string, e: any) => {
    e.stopPropagation();
    router.push(`/perfil/local?localId=${venueId}`);
  }, [router]);

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
  
  const renderSkeletonCard = useCallback(() => {
    return <SkeletonCard />;
  }, []);

  const renderVenueCard = useCallback(({ item, index }: { item: Venue; index: number }) => {
    const imagenPrincipal = item.galeria_urls?.[0] || item.imagen_url;
    const isDestacado = item.destacado;
    const hasSocialProfile = false;
    const activeEvent = null;
    
    const distancia = item.distance_km;
    const coordenadas = item.coordenadas || { lat: item.latitud || 0, lng: item.longitud || 0 };
    
    const venueIsFavorite = user ? isFavorite(item.id) : false;
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

          {shouldDimImage && <View style={styles.dimmedOverlay} />}
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

          <TouchableOpacity
            style={styles.favoritoButton}
            onPress={(e) => handleToggleFavorito(item.id, e)}
          >
            <IconSymbol
              ios_icon_name={venueIsFavorite ? "heart.fill" : "heart"}
              android_material_icon_name={venueIsFavorite ? "favorite" : "favorite_border"}
              size={heartIconSize}
              color={venueIsFavorite ? "#EF4444" : "#FFFFFF"}
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
                
                {distancia !== null && distancia !== undefined && (
                  <View style={styles.distanciaInButton}>
                    <IconSymbol ios_icon_name="location.fill" android_material_icon_name="my_location" size={iconSize} color={colors.headerText} />
                    <Text style={[styles.distanciaInButtonText, { fontSize: scaleFontSize(13) }]} numberOfLines={1}>
                      {distancia.toFixed(1)} km
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [router, user, isFavorite, handleToggleFavorito, handleComoLlegar, handlePerfilSocial, getBadgeInfo, getShouldDimImage, getCategoriasAMostrar, getDisplayRating]);

  const renderFooter = useCallback(() => {
    if (filteredVenues.length === 0 && hasActiveFilters) {
      return null;
    }

    if (!hasMore && filteredVenues.length > 0) {
      return (
        <View style={styles.footerContainer}>
          <Text style={[styles.footerText, { fontSize: scaleFontSize(14) }]}>
            ✅ Has visto todos los locales disponibles
          </Text>
        </View>
      );
    }

    if (isLoading && filteredVenues.length >= 20) {
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
  }, [filteredVenues.length, hasActiveFilters, hasMore, isLoading, renderSkeletonCard]);

  const renderEmpty = useCallback(() => {
    if (isLoading && allVenues.length === 0) {
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
  }, [isLoading, allVenues.length, activeFiltersCount, hasActiveFilters, renderSkeletonCard, handleClearAdvancedFilters, clearFilters]);

  const modeIcon = getModeIcon();

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerContainer}>
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
      </View>

      {/* VENUE LIST */}
      <FlatList
        ref={flatListRef}
        data={filteredVenues}
        renderItem={renderVenueCard}
        keyExtractor={(item: Venue) => `local-${item.id}`}
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
        onEndReached={filteredVenues.length > 0 ? loadMoreVenues : undefined}
        onEndReachedThreshold={PRELOAD_THRESHOLD}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        initialNumToRender={Platform.OS === 'android' ? 8 : 10}
        maxToRenderPerBatch={Platform.OS === 'android' ? 8 : 10}
        windowSize={Platform.OS === 'android' ? 7 : 5}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={Platform.OS === 'android' ? 50 : 100}
        scrollEventThrottle={Platform.OS === 'android' ? 32 : 16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />

      {/* ADVANCED FILTERS SHEET */}
      <FiltrosAvanzadosSheet
        visible={showAdvancedFilters}
        onClose={handleCloseAdvancedFilters}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKELETON CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const SkeletonCard = React.memo(() => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
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

SkeletonCard.displayName = 'SkeletonCard';

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
