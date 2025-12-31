
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
  Modal,
  Pressable,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';
import LoginPrompt from '@/components/common/LoginPrompt';
import { getEstadoLocal } from '@/utils/timeUtils';
import { getCategoryIcon } from '@/utils/categoryIcons';
import * as Location from 'expo-location';
import { calcularDistancia } from '@/utils/locationUtils';

const ITEMS_PER_PAGE = 20;

// ✅ ANDROID HEADER SCROLL BEHAVIOR v95.0
const HEADER_MAX_HEIGHT = Platform.OS === 'android' ? 280 : 300;
const HEADER_MIN_HEIGHT = Platform.OS === 'android' ? 0 : 0;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

// ✅ FIX v95.0: Create Animated FlatList component for Android
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

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
  { id: 'todas', nombre: 'Todas', emoji: '🎉' },
  { id: 'cafe', nombre: 'Cafés', emoji: '☕' },
  { id: 'restaurante', nombre: 'Restaurantes', emoji: '🍽️' },
  { id: 'bar', nombre: 'Bares', emoji: '🍺' },
  { id: 'pub', nombre: 'Pubs', emoji: '🍻' },
  { id: 'cocteleria', nombre: 'Coctelería', emoji: '🍸' },
  { id: 'discoteca', nombre: 'Discotecas', emoji: '💃' },
];

/**
 * ✅ FAVORITOS SCREEN v95.0 - ANDROID FIXES
 * 
 * CRITICAL FIXES v95.0:
 * - ✅ Fixed VirtualizedList error by using Animated.createAnimatedComponent
 * - ✅ Header hides completely on scroll down (Android only)
 * - ✅ Header shows on scroll up (Android only)
 * - ✅ Smooth animation using Animated API with useNativeDriver
 * - ✅ iOS behavior unchanged (static header)
 * - ✅ Consistent with Home and Events screens
 */

export default function FavoritosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [allSavedLocales, setAllSavedLocales] = useState<any[]>([]);
  const [displayedLocales, setDisplayedLocales] = useState<any[]>([]);
  const [filteredLocales, setFilteredLocales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [checkingSocialProfiles, setCheckingSocialProfiles] = useState<Set<string>>(new Set());
  const [socialProfiles, setSocialProfiles] = useState<Map<string, boolean>>(new Map());
  
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState('Todas');

  // ✅ ANDROID HEADER SCROLL BEHAVIOR v95.0
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -HEADER_SCROLL_DISTANCE],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          });
          console.log('[Favoritos v95.0] User location obtained:', location.coords);
        }
      } catch (error) {
        console.error('[Favoritos v95.0] Error getting location:', error);
      }
    })();
  }, []);

  const checkSocialProfilesForLocales = useCallback(async (localIds: string[]) => {
    if (localIds.length === 0) return;

    try {
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('local_id')
        .eq('tipo', 'local')
        .in('local_id', localIds);

      if (postsError) throw postsError;

      const newSocialProfiles = new Map();
      const localsWithPosts = new Set(posts?.map(p => p.local_id) || []);
      
      localIds.forEach(localId => {
        newSocialProfiles.set(localId, localsWithPosts.has(localId));
      });
      
      setSocialProfiles(newSocialProfiles);
    } catch (error) {
      console.error('[Favoritos v95.0] Error checking social profiles:', error);
    }
  }, []);

  const loadSavedLocales = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('[Favoritos v95.0] Cargando locales guardados...');
      const { data: savedLocalesData, error: localesError } = await supabase
        .from('locales_guardados')
        .select(`
          local_id,
          locales (
            id,
            nombre,
            direccion,
            provincia,
            comunidad,
            latitud,
            longitud,
            imagen_url,
            galeria_urls,
            rating,
            tipo,
            barlive_type,
            barlive_types,
            horarios_completos,
            estado_actual,
            destacado,
            nuevo,
            google_rating
          )
        `)
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false });

      if (localesError) throw localesError;

      if (savedLocalesData) {
        const formattedLocales = savedLocalesData
          .filter(sl => sl.locales)
          .map((sl: any) => {
            const local = sl.locales;
            
            let distancia = null;
            if (userLocation && local.latitud && local.longitud) {
              distancia = calcularDistancia(
                userLocation.lat,
                userLocation.lng,
                parseFloat(local.latitud),
                parseFloat(local.longitud)
              );
            }
            
            return {
              ...local,
              coordenadas: {
                lat: parseFloat(local.latitud),
                lng: parseFloat(local.longitud),
              },
              imagenes: local.galeria_urls || (local.imagen_url ? [local.imagen_url] : []),
              distancia: distancia,
            };
          });
        
        setAllSavedLocales(formattedLocales);
        setFilteredLocales(formattedLocales);
        
        const firstPage = formattedLocales.slice(0, ITEMS_PER_PAGE);
        setDisplayedLocales(firstPage);
        setCurrentPage(1);
        setHasMore(formattedLocales.length > ITEMS_PER_PAGE);
        
        console.log('[Favoritos v95.0] Locales guardados cargados:', formattedLocales.length);
        
        checkSocialProfilesForLocales(formattedLocales.map(l => l.id));
      }
    } catch (error) {
      console.error('[Favoritos v95.0] Error cargando locales guardados:', error);
    } finally {
      setLoading(false);
    }
  }, [user, userLocation, checkSocialProfilesForLocales]);

  useEffect(() => {
    loadSavedLocales();

    if (user) {
      const savedLocalesChannel = supabase
        .channel('user-saved-locales-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'locales_guardados',
            filter: `usuario_id=eq.${user.id}`,
          },
          () => {
            console.log('[Favoritos v95.0] Saved locales changed, reloading...');
            loadSavedLocales();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(savedLocalesChannel);
      };
    }
  }, [user, loadSavedLocales]);

  useEffect(() => {
    if (userLocation && allSavedLocales.length > 0) {
      console.log('[Favoritos v95.0] Recalculating distances with new user location');
      const updatedLocales = allSavedLocales.map(local => {
        const distancia = calcularDistancia(
          userLocation.lat,
          userLocation.lng,
          local.coordenadas.lat,
          local.coordenadas.lng
        );
        return {
          ...local,
          distancia: distancia,
        };
      });
      setAllSavedLocales(updatedLocales);
      setFilteredLocales(updatedLocales);
      
      const firstPage = updatedLocales.slice(0, currentPage * ITEMS_PER_PAGE);
      setDisplayedLocales(firstPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, currentPage]);

  useEffect(() => {
    let filtered = [...allSavedLocales];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(local => {
        const nombre = local.nombre?.toLowerCase() || '';
        const direccion = local.direccion?.toLowerCase() || '';
        const provincia = local.provincia?.toLowerCase() || '';
        const tipo = local.tipo?.toLowerCase() || '';
        
        return nombre.includes(query) || 
               direccion.includes(query) || 
               provincia.includes(query) ||
               tipo.includes(query);
      });
    }

    if (selectedCategory !== 'todas') {
      filtered = filtered.filter(local => {
        const barliveTypes = local.barlive_types || [];
        
        if (selectedCategory === 'discoteca') {
          return barliveTypes.includes('discoteca') || barliveTypes.includes('sala_conciertos');
        }
        
        return barliveTypes.includes(selectedCategory);
      });
    }

    if (provinciaSeleccionada !== 'Todas') {
      filtered = filtered.filter(local => local.provincia === provinciaSeleccionada);
    }

    setFilteredLocales(filtered);
    const firstPage = filtered.slice(0, ITEMS_PER_PAGE);
    setDisplayedLocales(firstPage);
    setCurrentPage(1);
    setHasMore(filtered.length > ITEMS_PER_PAGE);
    
    console.log('[Favoritos v95.0] Filters applied. Results:', filtered.length);
  }, [searchQuery, selectedCategory, provinciaSeleccionada, allSavedLocales]);

  const loadMoreLocales = useCallback(() => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    
    setTimeout(() => {
      const nextPage = currentPage + 1;
      const startIndex = currentPage * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const nextItems = filteredLocales.slice(startIndex, endIndex);
      
      if (nextItems.length > 0) {
        setDisplayedLocales(prev => [...prev, ...nextItems]);
        setCurrentPage(nextPage);
        setHasMore(endIndex < filteredLocales.length);
        console.log('[Favoritos v95.0] Cargando más locales, página:', nextPage);
      } else {
        setHasMore(false);
      }
      
      setLoadingMore(false);
    }, 300);
  }, [currentPage, filteredLocales, loadingMore, hasMore]);

  const onRefresh = async () => {
    console.log('[Favoritos v95.0] 🔄 Manual refresh triggered');
    setRefreshing(true);
    setSearchQuery('');
    setSelectedCategory('todas');
    setProvinciaSeleccionada('Todas');
    await loadSavedLocales();
    setRefreshing(false);
  };

  const clearFilters = useCallback(() => {
    console.log('[Favoritos v95.0] 🧹 Clearing all filters');
    setSearchQuery('');
    setSelectedCategory('todas');
    setProvinciaSeleccionada('Todas');
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedCategory !== 'todas') count++;
    if (provinciaSeleccionada !== 'Todas') count++;
    return count;
  }, [searchQuery, selectedCategory, provinciaSeleccionada]);

  const toggleFavorito = async (localId: string, e?: any) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (!user) {
      console.log('[Favoritos v95.0] User not authenticated');
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para gestionar favoritos');
      return;
    }

    if (!localId) {
      console.log('[Favoritos v95.0] No local ID');
      return;
    }

    try {
      console.log('[Favoritos v95.0] Removing from favorites. User:', user.id, 'Local:', localId);
      
      const { error } = await supabase
        .from('locales_guardados')
        .delete()
        .eq('usuario_id', user.id)
        .eq('local_id', localId);

      if (error) {
        console.error('[Favoritos v95.0] Error removing favorite:', error);
        Alert.alert('Error', 'No se pudo quitar de favoritos');
        return;
      }
      
      console.log('[Favoritos v95.0] ✅ Removed from favorites');
      
      await loadSavedLocales();
    } catch (error) {
      console.error('[Favoritos v95.0] Error removing favorito:', error);
      Alert.alert('Error', 'No se pudo eliminar de favoritos');
    }
  };

  const handleComoLlegar = (local: any, e: any) => {
    e.stopPropagation();
    const { lat, lng } = local.coordenadas;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url);
  };

  const handlePerfilSocial = (localId: string, e: any) => {
    e.stopPropagation();
    router.push(`/perfil/local?localId=${localId}`);
  };

  const renderLocalCard = ({ item }: { item: any }) => {
    const estado = getEstadoLocal(item);
    const imagenPrincipal = item.imagenes?.[0] || item.imagen_url;
    const isDestacado = item.destacado;
    const hasSocialProfile = socialProfiles.get(item.id) || false;

    const getBadgeColor = () => {
      if (estado.badge === 'Abierto ahora' || estado.badge === 'Abierto 24h') {
        return '#22C55E';
      }
      if (estado.badge === 'Cierra pronto') {
        return '#F97316';
      }
      if (estado.badge === 'Abre pronto') {
        return '#EAB308';
      }
      if (estado.estaAbierto === false) {
        return '#EF4444';
      }
      return '#9CA3AF';
    };

    const getBadgeText = () => {
      if (estado.badge === 'Abierto 24h') {
        return 'Abierto 24h';
      }
      
      if (estado.tiempoRestante) {
        if (estado.badge === 'Abierto ahora') {
          return `Abierto ahora • Cierra en ${estado.tiempoRestante}`;
        }
        if (estado.badge === 'Cierra pronto') {
          return `Cierra en ${estado.tiempoRestante}`;
        }
        if (estado.badge === 'Abre pronto') {
          return `Abre en ${estado.tiempoRestante}`;
        }
        return `${estado.badge} • ${estado.tiempoRestante}`;
      }
      return estado.badge;
    };

    const shouldDimImage = () => {
      return estado.estaAbierto === false || estado.estaAbierto === null;
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
              <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={14} color="#92400E" />
              <Text style={styles.badgeDestacadoHeaderText}>Destacado</Text>
            </View>
          )}

          <View style={[
            styles.badgeEstadoSuperior, 
            { backgroundColor: getBadgeColor() + 'E6' },
            isDestacado && styles.badgeEstadoSuperiorConDestacado
          ]}>
            <Text style={styles.badgeEstadoSuperiorText} numberOfLines={1}>{getBadgeText()}</Text>
          </View>

          {displayRating > 0 && (
            <View style={styles.ratingBadge}>
              <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={12} color="#FACC15" />
              <Text style={styles.ratingBadgeText}>{displayRating.toFixed(1)}</Text>
            </View>
          )}

          {item.nuevo && (
            <View style={styles.badgeNuevoContainer}>
              <View style={styles.badgeNuevo}>
                <Text style={styles.badgeNuevoText}>Nuevo</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.favoritoButton}
            onPress={(e) => {
              e.stopPropagation();
              toggleFavorito(item.id, e);
            }}
          >
            <IconSymbol
              ios_icon_name="heart.fill"
              android_material_icon_name="favorite"
              size={20}
              color="#EF4444"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.nombre} numberOfLines={1}>
              {item.nombre}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol ios_icon_name="mappin" android_material_icon_name="location_on" size={14} color={colors.textSecondary} />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.direccion}
            </Text>
          </View>

          {categoriasAMostrar.length > 0 && (
            <View style={styles.categoriasContainer}>
              {categoriasAMostrar.map((categoria: string, index: number) => (
                <View key={index} style={styles.categoriaBadge}>
                  <Text style={styles.categoriaIcon}>{getCategoryIcon(categoria)}</Text>
                  <Text style={styles.categoriaText} numberOfLines={1}>{categoria}</Text>
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
                <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={16} color={colors.headerText} />
                <Text style={styles.perfilSocialText} numberOfLines={1}>Perfil Social</Text>
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
                  <IconSymbol ios_icon_name="arrow.triangle.turn.up.right.diamond.fill" android_material_icon_name="directions" size={16} color={colors.headerText} />
                  <Text style={styles.comoLlegarText} numberOfLines={1}>Cómo llegar</Text>
                </View>
                
                {item.distancia !== null && item.distancia !== undefined && (
                  <View style={styles.distanciaInButton}>
                    <IconSymbol ios_icon_name="location.fill" android_material_icon_name="location_on" size={14} color={colors.headerText} />
                    <Text style={styles.distanciaInButtonText} numberOfLines={1}>
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
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.footerLoaderText}>Cargando más...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    
    if (activeFiltersCount > 0 && filteredLocales.length === 0) {
      return (
        <View style={styles.emptyState}>
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyText}>No se encontraron resultados</Text>
          <Text style={styles.emptySubtext}>
            Intenta con otros filtros de búsqueda
          </Text>
          <TouchableOpacity 
            style={styles.clearFiltersButton}
            onPress={clearFilters}
            activeOpacity={0.7}
          >
            <Text style={styles.clearFiltersButtonText}>Limpiar filtros</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyState}>
        <IconSymbol
          ios_icon_name="heart"
          android_material_icon_name="favorite_border"
          size={64}
          color={colors.textSecondary}
        />
        <Text style={styles.emptyText}>No tienes locales favoritos</Text>
        <Text style={styles.emptySubtext}>
          Explora locales y guarda tus favoritos tocando el ícono de corazón
        </Text>
      </View>
    );
  };

  // ✅ ANDROID HEADER SCROLL BEHAVIOR v95.0: Fixed with Animated.createAnimatedComponent
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (event: any) => {
        if (Platform.OS !== 'android') return;
        
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const diff = currentScrollY - lastScrollY.current;
        
        if (diff > 5) {
          // Scrolling down
        } else if (diff < -5) {
          // Scrolling up
        }
        
        lastScrollY.current = currentScrollY;
      },
    }
  );

  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.headerGradient}
        >
          <Text style={styles.headerTitle}>Locales Favoritos</Text>
        </LinearGradient>

        <LoginPrompt
          title="Inicia sesión para ver tus favoritos"
          message="Regístrate o inicia sesión en BarLive para guardar tus locales favoritos y acceder a ellos desde cualquier dispositivo."
          icon="heart.circle"
          androidIcon="favorite"
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.headerGradient}
        >
          <Text style={styles.headerTitle}>Locales Favoritos</Text>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando favoritos...</Text>
        </View>
      </View>
    );
  }

  // ✅ ANDROID HEADER SCROLL BEHAVIOR v95.0: Render with animated header
  const HeaderContent = () => (
    <React.Fragment>
      <View style={styles.headerTop}>
        <Text style={styles.headerTitle}>Locales Favoritos</Text>
        {activeFiltersCount > 0 && (
          <TouchableOpacity 
            style={styles.clearFiltersHeaderButton}
            onPress={clearFilters}
            activeOpacity={0.7}
          >
            <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color={colors.headerText} />
            <Text style={styles.clearFiltersHeaderText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.searchContainer}>
        <IconSymbol 
          ios_icon_name="magnifyingglass" 
          android_material_icon_name="search"
          size={20} 
          color={colors.textSecondary}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar en favoritos..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
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
              size={20} 
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => setMostrarFiltros(true)}>
          <IconSymbol 
            ios_icon_name="slider.horizontal.3" 
            android_material_icon_name="tune" 
            size={20} 
            color={colors.primary} 
          />
        </TouchableOpacity>
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
            style={[
              styles.categoryChip,
              selectedCategory === categoria.id && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(categoria.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.categoryEmoji}>{categoria.emoji}</Text>
            <Text
              style={[
                styles.categoryText,
                selectedCategory === categoria.id && styles.categoryTextActive,
              ]}
            >
              {categoria.nombre}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {allSavedLocales.length > 0 && (
        <View style={styles.resultsCountContainer}>
          <Text style={styles.resultsCount}>
            {activeFiltersCount > 0
              ? `${filteredLocales.length} de ${allSavedLocales.length} locales`
              : `${filteredLocales.length} locales guardados`
            }
          </Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterCountBadge}>
              <Text style={styles.filterCountText}>{activeFiltersCount}</Text>
            </View>
          )}
        </View>
      )}
    </React.Fragment>
  );

  // ✅ FIX v95.0: Use AnimatedFlatList for Android to support useNativeDriver
  const ListComponent = Platform.OS === 'android' ? AnimatedFlatList : FlatList;

  return (
    <View style={styles.container}>
      {/* ✅ ANDROID HEADER SCROLL BEHAVIOR v95.0: Animated header for Android */}
      {Platform.OS === 'android' ? (
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
            <HeaderContent />
          </LinearGradient>
        </Animated.View>
      ) : (
        // iOS: Static header (no animation)
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.headerGradient}
        >
          <HeaderContent />
        </LinearGradient>
      )}

      <ListComponent
        data={displayedLocales}
        renderItem={renderLocalCard}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={[
          styles.listContent,
          Platform.OS === 'android' && { marginTop: HEADER_MAX_HEIGHT },
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
        onScroll={Platform.OS === 'android' ? handleScroll : undefined}
        scrollEventThrottle={16}
      />

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
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setMostrarFiltros(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={true}
              bounces={false}
            >
              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Categoría de Local</Text>
                <View style={styles.categoriesGrid}>
                  {CATEGORIAS.map((categoria) => (
                    <TouchableOpacity
                      key={categoria.id}
                      style={[
                        styles.categoryFilterItem,
                        selectedCategory === categoria.id && styles.categoryFilterItemActive,
                      ]}
                      onPress={() => setSelectedCategory(categoria.id)}
                    >
                      <Text style={styles.categoryFilterEmoji}>{categoria.emoji}</Text>
                      <Text
                        style={[
                          styles.categoryFilterText,
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
                <Text style={styles.filterTitle}>Provincia</Text>
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
                <Text style={styles.limpiarButtonText}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.aplicarButtonModal}
                onPress={() => setMostrarFiltros(false)}
              >
                <LinearGradient
                  colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                  style={styles.aplicarButtonGradient}
                >
                  <Text style={styles.aplicarButtonText}>Aplicar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // ✅ ANDROID HEADER SCROLL BEHAVIOR v95.0
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  clearFiltersHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  clearFiltersHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.headerText,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    padding: 0,
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
  },
  categoriesScroll: {
    marginBottom: 12,
    marginRight: -16,
  },
  categoriesContent: {
    paddingHorizontal: 0,
    paddingRight: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  categoryChipActive: {
    backgroundColor: colors.white,
    borderColor: colors.white,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  categoryTextActive: {
    color: colors.primary,
  },
  resultsCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultsCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  filterCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.headerText,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  footerLoaderText: {
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
    marginBottom: 8,
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
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
    fontSize: 12,
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
    fontSize: 12,
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
    fontSize: 12,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nombre: {
    fontSize: 18,
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
    maxWidth: '48%',
  },
  categoriaIcon: {
    fontSize: 12,
  },
  categoriaText: {
    fontSize: 12,
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
    fontSize: 13,
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
    fontSize: 13,
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
    fontSize: 13,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
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
    fontSize: 16,
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
  categoryFilterEmoji: {
    fontSize: 20,
  },
  categoryFilterText: {
    fontSize: 14,
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
    fontSize: 15,
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
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
