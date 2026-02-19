
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

import { colors } from '@/styles/commonStyles';
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
import { IconSymbol } from '@/components/IconSymbol';
import { getEstadoLocal } from '@/utils/timeUtils';
import { calcularDistancia } from '@/utils/locationUtils';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { useFavorites } from '@/contexts/FavoritesContext';
import FiltrosAvanzadosSheet from '@/components/home/FiltrosAvanzadosSheet';
import { useFilters } from '@/contexts/FilterContext';
import { applyAdvancedFilters } from '@/utils/filterLocals';
import { useMode } from '@/contexts/ModeContext';

const PAGE_SIZE = 20;
const HEADER_MAX_HEIGHT = Platform.OS === 'android' ? 200 : 240;

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
 * ✅ EXPLORAR SCREEN v400.0 - COMPLETE REWRITE
 * 
 * NUEVA ARQUITECTURA LIMPIA:
 * - Sistema de paginación simple y robusto
 * - Deduplicación en origen
 * - Filtrado eficiente con memoización
 * - Control de carga con flags claros
 * - Sin parches ni soluciones temporales
 */

export default function ExplorarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode } = useMode();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { filtros: globalFiltros, limpiarFiltros, hasActiveFilters } = useFilters();
  
  // Estado principal
  const [locales, setLocales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Ubicación
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  
  // UI
  const flatListRef = useRef<FlatList>(null);
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  
  // Control de carga
  const isLoadingRef = useRef(false);
  const loadedIdsRef = useRef<Set<string>>(new Set());

  console.log('[Explorar v400.0] 🚀 Component render:', {
    localesCount: locales.length,
    loading,
    loadingMore,
    hasMore,
    currentPage,
    selectedCategory,
    searchQuery,
  });

  // ============================================
  // UBICACIÓN
  // ============================================
  
  useEffect(() => {
    let isMounted = true;
    
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (!isMounted) return;
        
        if (status !== 'granted') {
          console.log('[Explorar v400.0] ⚠️ Location permission denied');
          setLocationReady(true);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        if (!isMounted) return;
        
        const lat = location.coords.latitude;
        const lng = location.coords.longitude;
        
        // Validar que esté en España
        if (lat >= 27.0 && lat <= 44.0 && lng >= -18.5 && lng <= 5.0) {
          setUserLocation({ lat, lng });
          console.log('[Explorar v400.0] ✅ Location obtained:', { lat, lng });
        } else {
          console.log('[Explorar v400.0] ⚠️ Location outside Spain');
        }
        
        setLocationReady(true);
      } catch (error) {
        console.error('[Explorar v400.0] ❌ Location error:', error);
        if (isMounted) {
          setLocationReady(true);
        }
      }
    };
    
    getLocation();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // ============================================
  // CARGA DE DATOS
  // ============================================
  
  const loadLocales = useCallback(async (page: number, append: boolean = false) => {
    console.log('[Explorar v400.0] 📥 loadLocales called:', { page, append, isLoadingRef: isLoadingRef.current });
    
    // Prevenir cargas duplicadas
    if (isLoadingRef.current) {
      console.log('[Explorar v400.0] ⚠️ Already loading - blocking');
      return;
    }
    
    isLoadingRef.current = true;
    
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    try {
      const offset = page * PAGE_SIZE;
      
      console.log('[Explorar v400.0] 🌐 Fetching:', { offset, limit: PAGE_SIZE });
      
      const locationParams = userLocation 
        ? { user_lat: userLocation.lat, user_lng: userLocation.lng }
        : { user_lat: null, user_lng: null };
      
      const { data, error } = await supabase.rpc('get_locales_paginados', {
        ...locationParams,
        p_limit: PAGE_SIZE,
        p_offset: offset,
      });

      if (error) {
        console.error('[Explorar v400.0] ❌ Fetch error:', error);
        throw error;
      }

      console.log('[Explorar v400.0] ✅ Fetched:', data?.length || 0, 'locales');

      if (data && data.length > 0) {
        // Transformar datos
        const transformedLocales = data.map((local: any) => {
          let distanciaKm = null;
          
          if (userLocation && local.latitud && local.longitud) {
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

        if (append) {
          // Deduplicar antes de agregar
          const newLocales = transformedLocales.filter(l => !loadedIdsRef.current.has(l.id));
          
          console.log('[Explorar v400.0] ➕ Appending:', newLocales.length, 'new unique locales');
          
          if (newLocales.length > 0) {
            newLocales.forEach(l => loadedIdsRef.current.add(l.id));
            setLocales(prev => [...prev, ...newLocales]);
          }
        } else {
          // Reemplazar todo
          console.log('[Explorar v400.0] 🔄 Replacing with:', transformedLocales.length, 'locales');
          loadedIdsRef.current.clear();
          transformedLocales.forEach(l => loadedIdsRef.current.add(l.id));
          setLocales(transformedLocales);
        }

        // Actualizar estado de paginación
        setHasMore(data.length >= PAGE_SIZE);
        setCurrentPage(page);
      } else {
        console.log('[Explorar v400.0] ⚠️ No data returned');
        setHasMore(false);
        if (!append) {
          setLocales([]);
          loadedIdsRef.current.clear();
        }
      }
    } catch (error) {
      console.error('[Explorar v400.0] ❌ Load error:', error);
      Alert.alert('Error', 'No se pudieron cargar los locales');
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userLocation]);

  // ============================================
  // CARGA INICIAL
  // ============================================
  
  useEffect(() => {
    if (locationReady && locales.length === 0 && !loading) {
      console.log('[Explorar v400.0] 🎬 Initial load');
      loadLocales(0, false);
    }
  }, [locationReady, locales.length, loading, loadLocales]);

  // ============================================
  // RECARGA AL CAMBIAR FILTROS
  // ============================================
  
  useEffect(() => {
    if (locationReady && locales.length > 0) {
      console.log('[Explorar v400.0] 🔄 Filters changed, reloading');
      loadedIdsRef.current.clear();
      setCurrentPage(0);
      setHasMore(true);
      loadLocales(0, false);
      
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }
  }, [selectedCategory, locationReady]);

  // ============================================
  // FILTRADO
  // ============================================
  
  const filteredLocales = useMemo(() => {
    console.log('[Explorar v400.0] 🔍 Filtering:', locales.length, 'locales');
    
    let filtered = locales;
    
    // Filtro de categoría
    if (selectedCategory !== 'todas') {
      const categoryMap: Record<string, string[]> = {
        'cafe': ['cafe', 'cafeteria', 'cafetería'],
        'restaurante': ['restaurante', 'restaurant'],
        'bar': ['bar'],
        'pub': ['pub'],
        'cocteleria': ['cocteleria', 'cocktail', 'cóctel'],
        'discoteca': ['discoteca', 'nightclub', 'club', 'disco']
      };
      
      const targetCategories = categoryMap[selectedCategory] || [selectedCategory];
      
      filtered = filtered.filter(local => {
        const barliveTypes = local.barlive_types || [];
        const barliveType = local.barlive_type || '';
        
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
    
    // Filtro de búsqueda
    const query = searchQuery.toLowerCase().trim();
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

    // Filtros avanzados
    filtered = applyAdvancedFilters(filtered, globalFiltros);

    console.log('[Explorar v400.0] ✅ Filtered result:', filtered.length, 'locales');
    
    return filtered;
  }, [locales, selectedCategory, searchQuery, globalFiltros]);

  // ============================================
  // PAGINACIÓN
  // ============================================
  
  const loadMore = useCallback(() => {
    console.log('[Explorar v400.0] 📊 loadMore called:', {
      hasMore,
      loadingMore,
      loading,
      isLoadingRef: isLoadingRef.current,
    });
    
    if (!hasMore || loadingMore || loading || isLoadingRef.current) {
      console.log('[Explorar v400.0] ⚠️ Load more blocked');
      return;
    }
    
    const nextPage = currentPage + 1;
    console.log('[Explorar v400.0] ✅ Loading page:', nextPage);
    loadLocales(nextPage, true);
  }, [hasMore, loadingMore, loading, currentPage, loadLocales]);

  // ============================================
  // REFRESH
  // ============================================
  
  const onRefresh = useCallback(async () => {
    console.log('[Explorar v400.0] 🔄 Refresh triggered');
    setRefreshing(true);
    setSearchQuery('');
    setSelectedCategory('todas');
    loadedIdsRef.current.clear();
    setCurrentPage(0);
    setHasMore(true);
    
    await loadLocales(0, false);
    setRefreshing(false);
    
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);
  }, [loadLocales]);

  // ============================================
  // ACCIONES
  // ============================================
  
  const handleToggleFavorito = useCallback(async (localId: string, e?: any) => {
    if (e) e.stopPropagation();
    
    if (!user) {
      router.push('/auth/login-v6');
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

  const handleScroll = useCallback((event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
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
  }, [headerTranslateY]);

  // ============================================
  // RENDER HELPERS
  // ============================================
  
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
      return { text: 'Abierto ahora', color: '#22C55E' };
    } else if (item.estaAbierto === false) {
      return { text: 'Cerrado ahora', color: '#EF4444' };
    } else {
      return { text: 'Sin info de horario', color: '#9CA3AF' };
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
    if (item.rating && item.rating > 0) return item.rating;
    if (item.google_rating && item.google_rating > 0) return item.google_rating;
    return 0;
  }, []);

  // ============================================
  // RENDER CARD
  // ============================================
  
  const renderLocalCard = useCallback(({ item }: { item: any }) => {
    const imagenPrincipal = item.imagenes?.[0] || item.imagen_url;
    const isDestacado = item.destacado;
    const localIsFavorite = user ? isFavorite(item.id) : false;
    const badgeInfo = getBadgeInfo(item);
    const shouldDimImage = getShouldDimImage(item);
    const categoriasAMostrar = getCategoriasAMostrar(item);
    const displayRating = getDisplayRating(item);

    return (
      <TouchableOpacity 
        style={[styles.card, isDestacado && styles.cardDestacado]} 
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
            <View style={styles.badgeDestacado}>
              <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={12} color="#92400E" />
              <Text style={styles.badgeDestacadoText}>Destacado</Text>
            </View>
          )}

          <View style={[styles.badgeEstado, { backgroundColor: badgeInfo.color + 'E6' }]}>
            <Text style={styles.badgeEstadoText} numberOfLines={1}>{badgeInfo.text}</Text>
          </View>

          {displayRating > 0 && (
            <View style={styles.ratingBadge}>
              <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={12} color="#FACC15" />
              <Text style={styles.ratingBadgeText}>{displayRating.toFixed(1)}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.favoritoButton}
            onPress={(e) => handleToggleFavorito(item.id, e)}
          >
            <IconSymbol
              ios_icon_name={localIsFavorite ? "heart.fill" : "heart"}
              android_material_icon_name={localIsFavorite ? "favorite" : "favorite_border"}
              size={20}
              color={localIsFavorite ? "#EF4444" : "#FFFFFF"}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.nombre} numberOfLines={1}>{item.nombre}</Text>

          <View style={styles.infoRow}>
            <IconSymbol ios_icon_name="mappin" android_material_icon_name="location_on" size={14} color={colors.textSecondary} />
            <Text style={styles.infoText} numberOfLines={1}>{item.direccion}</Text>
          </View>

          {categoriasAMostrar.length > 0 && (
            <View style={styles.categoriasContainer}>
              {categoriasAMostrar.map((categoria: string, catIndex: number) => (
                <View key={catIndex} style={styles.categoriaBadge}>
                  <Text style={styles.categoriaIcon}>{getCategoryIcon(categoria)}</Text>
                  <Text style={styles.categoriaText} numberOfLines={1}>{categoria}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.comoLlegarButton} 
              onPress={(e) => handleComoLlegar(item, e)}
            >
              <IconSymbol ios_icon_name="arrow.triangle.turn.up.right.diamond.fill" android_material_icon_name="directions" size={16} color={colors.headerText} />
              <Text style={styles.comoLlegarText} numberOfLines={1}>Cómo llegar</Text>
              {item.distancia !== null && item.distancia !== undefined && (
                <Text style={styles.distanciaText}>{item.distancia.toFixed(1)} km</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [router, user, isFavorite, handleToggleFavorito, handleComoLlegar, getBadgeInfo, getShouldDimImage, getCategoriasAMostrar, getDisplayRating]);

  // ============================================
  // RENDER FOOTER
  // ============================================
  
  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.footerText}>Cargando más locales...</Text>
        </View>
      );
    }

    if (!hasMore && filteredLocales.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerText}>✅ Has visto todos los locales disponibles</Text>
        </View>
      );
    }

    return null;
  };

  // ============================================
  // RENDER EMPTY
  // ============================================
  
  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando locales...</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyState}>
        <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={64} color={colors.textSecondary} />
        <Text style={styles.emptyText}>No se encontraron resultados</Text>
        <Text style={styles.emptySubtext}>Intenta con otros filtros de búsqueda</Text>
      </View>
    );
  };

  // ============================================
  // RENDER
  // ============================================
  
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.headerContainer,
          { transform: [{ translateY: headerTranslateY }] },
        ]}
      >
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Explorar</Text>
            <TouchableOpacity 
              style={styles.mapButton}
              onPress={() => router.push('/(tabs)/explorar/mapa')}
            >
              <IconSymbol ios_icon_name="map.fill" android_material_icon_name="map" size={28} color={colors.headerText} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
            contentContainerStyle={styles.categoriesContent}
          >
            {CATEGORIAS.map((categoria) => (
              <TouchableOpacity
                key={categoria.id}
                style={styles.categoriaButton}
                onPress={() => setSelectedCategory(categoria.id)}
              >
                <View
                  style={[
                    styles.categoriaIcon,
                    selectedCategory === categoria.id && styles.categoriaIconActive,
                  ]}
                >
                  <IconSymbol
                    ios_icon_name={categoria.iosIcon}
                    android_material_icon_name={categoria.androidIcon}
                    size={18}
                    color={selectedCategory === categoria.id ? colors.primary : colors.white}
                  />
                </View>
                <Text
                  style={[
                    styles.categoriaLabel,
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
          { marginTop: HEADER_MAX_HEIGHT, paddingBottom: getContentBottomPadding(100) },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      <FiltrosAvanzadosSheet
        visible={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
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
  },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? 36 : 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.headerText,
  },
  mapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 6,
    height: 40,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    padding: 0,
    marginLeft: 8,
  },
  categoriesScroll: {
    marginBottom: 10,
  },
  categoriesContent: {
    gap: 16,
  },
  categoriaButton: {
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
  },
  categoriaIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  categoriaIconActive: {
    borderColor: colors.white,
    backgroundColor: colors.white,
  },
  categoriaLabel: {
    fontSize: 12,
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
  badgeDestacado: {
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
  },
  badgeDestacadoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  badgeEstado: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  badgeEstadoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
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
  },
  ratingBadgeText: {
    fontSize: 12,
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
  nombre: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
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
  },
  categoriaIcon: {
    fontSize: 12,
  },
  categoriaText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'capitalize',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  comoLlegarButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '99',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  comoLlegarText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.headerText,
  },
  distanciaText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.headerText,
  },
  footerLoading: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  footerEnd: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
