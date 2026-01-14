
import { calcularDistancia } from '@/utils/locationUtils';
import { supabase } from '@/utils/supabase';
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
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { LinearGradient } from 'expo-linear-gradient';
import LoginPrompt from '@/components/common/LoginPrompt';
import { useAuth } from '@/contexts/AuthContext';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { IconSymbol } from '@/components/IconSymbol';
import { getEstadoLocal } from '@/utils/timeUtils';
import { getCategoryIcon } from '@/utils/categoryIcons';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';
import { colors, commonStyles } from '@/styles/commonStyles';
import * as Location from 'expo-location';
import { useMode } from '@/contexts/ModeContext';
import ProfileSwitcher from '@/components/perfil/ProfileSwitcher';

const ITEMS_PER_PAGE = 20;
const PRELOAD_THRESHOLD = 5; // Cargar más cuando quedan 5 items por ver
const HEADER_MAX_HEIGHT = 280;
const HEADER_MIN_HEIGHT = 120;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

const PROVINCIAS = [
  'Todas',
  'A Coruña',
  'Álava',
  'Albacete',
  'Alicante',
  'Almería',
  'Asturias',
  'Ávila',
  'Badajoz',
  'Barcelona',
  'Burgos',
  'Cáceres',
  'Cádiz',
  'Cantabria',
  'Castellón',
  'Ciudad Real',
  'Córdoba',
  'Cuenca',
  'Girona',
  'Granada',
  'Guadalajara',
  'Guipúzcoa',
  'Huelva',
  'Huesca',
  'Islas Baleares',
  'Jaén',
  'La Rioja',
  'Las Palmas',
  'León',
  'Lleida',
  'Lugo',
  'Madrid',
  'Málaga',
  'Murcia',
  'Navarra',
  'Ourense',
  'Palencia',
  'Pontevedra',
  'Salamanca',
  'Santa Cruz de Tenerife',
  'Segovia',
  'Sevilla',
  'Soria',
  'Tarragona',
  'Teruel',
  'Toledo',
  'Valencia',
  'Valladolid',
  'Vizcaya',
  'Zamora',
  'Zaragoza',
];

const CATEGORIAS = [
  { id: 'todas', nombre: 'Todas', icono: 'apps' },
  { id: 'bar', nombre: 'Bares', icono: 'local-bar' },
  { id: 'restaurante', nombre: 'Restaurantes', icono: 'restaurant' },
  { id: 'discoteca', nombre: 'Discotecas', icono: 'nightlife' },
  { id: 'pub', nombre: 'Pubs', icono: 'sports-bar' },
  { id: 'cafeteria', nombre: 'Cafeterías', icono: 'local-cafe' },
];

export default function ExplorarScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { mode } = useMode();
  // ✅ FIX: Use 'locales' instead of 'globalLocales' to match the context export
  const { locales: globalLocales, refreshData: refreshGlobalData, isRefreshing: isLoadingGlobal } = useGlobalData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState('Todas');
  const [showProvinciaModal, setShowProvinciaModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Estados para paginación e infinite scroll
  const [displayedLocales, setDisplayedLocales] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);

  const scrollY = useRef(new Animated.Value(0)).current;

  // Obtener ubicación del usuario
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('User tapped Explorar - Location permission denied');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        console.log('User location obtained:', location.coords);
      } catch (error) {
        console.error('Error getting location:', error);
      }
    })();
  }, []);

  // Filtrar y ordenar locales
  const filteredAndSortedLocales = useMemo(() => {
    console.log('Filtering locales - Category:', selectedCategory, 'Province:', provinciaSeleccionada, 'Search:', searchQuery);
    
    // ✅ FIX: Add safety check to ensure globalLocales is defined and is an array
    if (!globalLocales || !Array.isArray(globalLocales)) {
      console.log('globalLocales is not available yet, returning empty array');
      return [];
    }

    let filtered = globalLocales.filter((local) => {
      // Filtro de búsqueda
      if (searchQuery) {
        const matchesSearch =
          local.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          local.direccion?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          local.ciudad?.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
      }

      // Filtro de categoría
      if (selectedCategory !== 'todas') {
        const matchesCategory = local.tipo?.toLowerCase() === selectedCategory.toLowerCase();
        if (!matchesCategory) return false;
      }

      // Filtro de provincia
      if (provinciaSeleccionada !== 'Todas') {
        const matchesProvincia = local.provincia === provinciaSeleccionada;
        if (!matchesProvincia) return false;
      }

      return true;
    });

    // Ordenar por distancia si hay ubicación
    if (userLocation) {
      filtered = filtered.map((local) => {
        const distance =
          local.latitud && local.longitud
            ? calcularDistancia(
                userLocation.latitude,
                userLocation.longitude,
                local.latitud,
                local.longitud
              )
            : 999999;
        return { ...local, distance };
      });

      // Ordenar por prioridad y distancia
      filtered.sort((a, b) => {
        const estadoA = getEstadoLocal(a.horarios_completos, a.google_business_status);
        const estadoB = getEstadoLocal(b.horarios_completos, b.google_business_status);

        // Prioridad 1: Destacados y abiertos dentro de 100km
        const aDestacadoCerca = a.destacado && estadoA === 'abierto_ahora' && a.distance <= 100;
        const bDestacadoCerca = b.destacado && estadoB === 'abierto_ahora' && b.distance <= 100;
        if (aDestacadoCerca && !bDestacadoCerca) return -1;
        if (!aDestacadoCerca && bDestacadoCerca) return 1;

        // Prioridad 2: Abiertos sin destacar dentro de 100km
        const aAbiertoCerca = estadoA === 'abierto_ahora' && a.distance <= 100;
        const bAbiertoCerca = estadoB === 'abierto_ahora' && b.distance <= 100;
        if (aAbiertoCerca && !bAbiertoCerca) return -1;
        if (!aAbiertoCerca && bAbiertoCerca) return 1;

        // Prioridad 3: Destacados y abiertos fuera de 100km
        const aDestacadoLejos = a.destacado && estadoA === 'abierto_ahora' && a.distance > 100;
        const bDestacadoLejos = b.destacado && estadoB === 'abierto_ahora' && b.distance > 100;
        if (aDestacadoLejos && !bDestacadoLejos) return -1;
        if (!aDestacadoLejos && bDestacadoLejos) return 1;

        // Prioridad 4: Con eventos activos
        const aConEvento = a.evento_activo;
        const bConEvento = b.evento_activo;
        if (aConEvento && !bConEvento) return -1;
        if (!aConEvento && bConEvento) return 1;

        // Prioridad 5: Sin información de horario
        const aSinInfo = estadoA === 'sin_info';
        const bSinInfo = estadoB === 'sin_info';
        if (aSinInfo && !bSinInfo) return -1;
        if (!aSinInfo && bSinInfo) return 1;

        // Prioridad 6: Cerrados
        const aCerrado = estadoA === 'cerrado_ahora';
        const bCerrado = estadoB === 'cerrado_ahora';
        if (!aCerrado && bCerrado) return -1;
        if (aCerrado && !bCerrado) return 1;

        // Dentro de cada prioridad, ordenar por distancia
        return a.distance - b.distance;
      });
    }

    console.log('Filtered locales count:', filtered.length);
    return filtered;
  }, [globalLocales, searchQuery, selectedCategory, provinciaSeleccionada, userLocation]);

  // Cargar página inicial
  useEffect(() => {
    console.log('Loading initial page of locales');
    const initialLocales = filteredAndSortedLocales.slice(0, ITEMS_PER_PAGE);
    setDisplayedLocales(initialLocales);
    setCurrentPage(1);
    setHasMoreData(filteredAndSortedLocales.length > ITEMS_PER_PAGE);
  }, [filteredAndSortedLocales]);

  // Función para cargar más locales
  const loadMoreLocales = useCallback(() => {
    if (isLoadingMore || !hasMoreData) {
      return;
    }

    console.log('Loading more locales - Current page:', currentPage);
    setIsLoadingMore(true);

    // Simular un pequeño delay para mejor UX
    setTimeout(() => {
      const nextPage = currentPage + 1;
      const startIndex = currentPage * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const newLocales = filteredAndSortedLocales.slice(startIndex, endIndex);

      if (newLocales.length > 0) {
        setDisplayedLocales((prev) => [...prev, ...newLocales]);
        setCurrentPage(nextPage);
        setHasMoreData(endIndex < filteredAndSortedLocales.length);
        console.log('Loaded', newLocales.length, 'more locales. Total displayed:', displayedLocales.length + newLocales.length);
      } else {
        setHasMoreData(false);
        console.log('No more locales to load');
      }

      setIsLoadingMore(false);
    }, 300);
  }, [currentPage, filteredAndSortedLocales, isLoadingMore, hasMoreData, displayedLocales.length]);

  // Detectar cuando el usuario está cerca del final y pre-cargar
  const handleScroll = useCallback(
    (event: any) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const paddingToBottom = 20;
      const isCloseToBottom =
        layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

      // Pre-cargar cuando quedan PRELOAD_THRESHOLD items por ver
      const currentIndex = Math.floor(contentOffset.y / 200); // Asumiendo ~200px por item
      const remainingItems = displayedLocales.length - currentIndex;

      if (remainingItems <= PRELOAD_THRESHOLD && hasMoreData && !isLoadingMore) {
        console.log('Pre-loading next batch - Remaining items:', remainingItems);
        loadMoreLocales();
      }
    },
    [displayedLocales.length, hasMoreData, isLoadingMore, loadMoreLocales]
  );

  const onRefresh = useCallback(async () => {
    console.log('User pulled to refresh locales list');
    setRefreshing(true);
    await refreshGlobalData();
    setRefreshing(false);
  }, [refreshGlobalData]);

  const toggleFavorito = useCallback(
    async (localId: string) => {
      if (!user) {
        console.log('User tapped favorite - Not logged in, showing login modal');
        setShowLoginModal(true);
        return;
      }

      console.log('User toggled favorite for local:', localId);
      try {
        const { data: existingFav } = await supabase
          .from('favoritos')
          .select('id')
          .eq('usuario_id', user.id)
          .eq('local_id', localId)
          .single();

        if (existingFav) {
          await supabase.from('favoritos').delete().eq('id', existingFav.id);
          console.log('Removed from favorites');
        } else {
          await supabase.from('favoritos').insert({
            usuario_id: user.id,
            local_id: localId,
          });
          console.log('Added to favorites');
        }

        await refreshGlobalData();
      } catch (error) {
        console.error('Error toggling favorite:', error);
      }
    },
    [user, refreshGlobalData]
  );

  const handleComoLlegar = useCallback((local: any, e: any) => {
    e.stopPropagation();
    console.log('User tapped directions for local:', local.nombre);
    if (local.latitud && local.longitud) {
      const url = Platform.select({
        ios: `maps:0,0?q=${local.latitud},${local.longitud}`,
        android: `geo:0,0?q=${local.latitud},${local.longitud}(${encodeURIComponent(local.nombre)})`,
        default: `https://www.google.com/maps/search/?api=1&query=${local.latitud},${local.longitud}`,
      });
      Linking.openURL(url);
    }
  }, []);

  const handlePerfilSocial = useCallback(
    (localId: string, e: any) => {
      e.stopPropagation();
      console.log('User tapped social profile for local:', localId);
      router.push(`/perfil/local?id=${localId}`);
    },
    [router]
  );

  const handleNavigateToMap = useCallback(() => {
    console.log('User navigated to map view');
    router.push('/explorar/mapa');
  }, [router]);

  const handleClaimOrCreateLocal = useCallback(() => {
    if (!user) {
      console.log('User tapped claim/create local - Not logged in, showing login modal');
      setShowLoginModal(true);
      return;
    }
    console.log('User navigated to claim/create local');
    router.push('/auth/local-ownership-request');
  }, [user, router]);

  const getModeLabel = useCallback(() => {
    switch (mode) {
      case 'cliente':
        return 'Cliente';
      case 'propietario':
        return 'Propietario';
      case 'admin':
        return 'Admin';
      default:
        return 'Cliente';
    }
  }, [mode]);

  const getModeIcon = useCallback(() => {
    switch (mode) {
      case 'cliente':
        return 'person';
      case 'propietario':
        return 'store';
      case 'admin':
        return 'admin-panel-settings';
      default:
        return 'person';
    }
  }, [mode]);

  const handleModeChange = useCallback(
    (newMode: 'cliente' | 'propietario' | 'admin') => {
      console.log('User changed mode to:', newMode);
      // La lógica de cambio de modo está en ModeContext
    },
    []
  );

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.footerText}>Cargando más locales...</Text>
      </View>
    );
  }, [isLoadingMore]);

  const renderEmpty = useCallback(() => {
    if (isLoadingGlobal) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyText}>Cargando locales...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <IconSymbol
          ios_icon_name="magnifyingglass"
          android_material_icon_name="search"
          size={scaleIconSize(64)}
          color={colors.textSecondary}
        />
        <Text style={styles.emptyText}>No se encontraron locales</Text>
        <Text style={styles.emptySubtext}>
          Intenta cambiar los filtros o la búsqueda
        </Text>
      </View>
    );
  }, [isLoadingGlobal]);

  const HeaderContent = useCallback(() => {
    const headerHeight = scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_DISTANCE],
      outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
      extrapolate: 'clamp',
    });

    const headerOpacity = scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
      outputRange: [1, 1, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Explorar</Text>
              <Text style={styles.headerSubtitle}>
                {displayedLocales.length} de {filteredAndSortedLocales.length} locales
              </Text>
            </View>
            <View style={styles.headerRight}>
              <ProfileSwitcher />
              <TouchableOpacity
                style={styles.mapButton}
                onPress={handleNavigateToMap}
              >
                <IconSymbol
                  ios_icon_name="map"
                  android_material_icon_name="map"
                  size={scaleIconSize(24)}
                  color={colors.background}
                />
              </TouchableOpacity>
            </View>
          </View>

          <Animated.View style={{ opacity: headerOpacity }}>
            <View style={styles.searchContainer}>
              <IconSymbol
                ios_icon_name="magnifyingglass"
                android_material_icon_name="search"
                size={scaleIconSize(20)}
                color={colors.textSecondary}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar locales..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <IconSymbol
                    ios_icon_name="xmark.circle.fill"
                    android_material_icon_name="cancel"
                    size={scaleIconSize(20)}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesScroll}
              contentContainerStyle={styles.categoriesContent}
            >
              {CATEGORIAS.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat.id && styles.categoryChipActive,
                  ]}
                  onPress={() => {
                    console.log('User selected category:', cat.nombre);
                    setSelectedCategory(cat.id);
                  }}
                >
                  <IconSymbol
                    ios_icon_name={cat.icono}
                    android_material_icon_name={cat.icono}
                    size={scaleIconSize(20)}
                    color={
                      selectedCategory === cat.id
                        ? colors.background
                        : colors.text
                    }
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === cat.id &&
                        styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.provinciaButton}
              onPress={() => setShowProvinciaModal(true)}
            >
              <IconSymbol
                ios_icon_name="location"
                android_material_icon_name="location-on"
                size={scaleIconSize(20)}
                color={colors.text}
              />
              <Text style={styles.provinciaButtonText}>
                {provinciaSeleccionada}
              </Text>
              <IconSymbol
                ios_icon_name="chevron.down"
                android_material_icon_name="arrow-drop-down"
                size={scaleIconSize(20)}
                color={colors.text}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    );
  }, [
    scrollY,
    searchQuery,
    selectedCategory,
    provinciaSeleccionada,
    displayedLocales.length,
    filteredAndSortedLocales.length,
    handleNavigateToMap,
  ]);

  const renderLocalCard = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const estado = getEstadoLocal(
        item.horarios_completos,
        item.google_business_status
      );
      const isFavorito = item.is_favorito;

      return (
        <TouchableOpacity
          key={`${item.id}-${index}`}
          style={styles.localCard}
          onPress={() => {
            console.log('User tapped local card:', item.nombre);
            router.push(`/detalle/local?id=${item.id}`);
          }}
        >
          <Image
            source={{
              uri:
                item.imagen_url ||
                item.foto_principal ||
                'https://via.placeholder.com/400x200?text=Sin+Imagen',
            }}
            style={styles.localImage}
          />
          {item.destacado && (
            <View style={styles.destacadoBadge}>
              <IconSymbol
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={scaleIconSize(16)}
                color={colors.warning}
              />
              <Text style={styles.destacadoText}>Destacado</Text>
            </View>
          )}
          <View style={styles.localInfo}>
            <View style={styles.localHeader}>
              <Text style={styles.localNombre} numberOfLines={1}>
                {item.nombre}
              </Text>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  toggleFavorito(item.id);
                }}
              >
                <IconSymbol
                  ios_icon_name={isFavorito ? 'heart.fill' : 'heart'}
                  android_material_icon_name={
                    isFavorito ? 'favorite' : 'favorite-border'
                  }
                  size={scaleIconSize(24)}
                  color={isFavorito ? colors.error : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.localMeta}>
              <View style={styles.localMetaItem}>
                <IconSymbol
                  ios_icon_name="mappin"
                  android_material_icon_name="location-on"
                  size={scaleIconSize(16)}
                  color={colors.textSecondary}
                />
                <Text style={styles.localMetaText} numberOfLines={1}>
                  {item.direccion || item.ciudad || 'Sin dirección'}
                </Text>
              </View>
              {item.distance !== undefined && (
                <Text style={styles.localDistance}>
                  {item.distance < 1
                    ? `${Math.round(item.distance * 1000)}m`
                    : `${item.distance.toFixed(1)}km`}
                </Text>
              )}
            </View>
            <View style={styles.localFooter}>
              <View
                style={[
                  styles.estadoBadge,
                  estado === 'abierto_ahora' && styles.estadoBadgeAbierto,
                  estado === 'cerrado_ahora' && styles.estadoBadgeCerrado,
                ]}
              >
                <Text
                  style={[
                    styles.estadoText,
                    estado === 'abierto_ahora' && styles.estadoTextAbierto,
                    estado === 'cerrado_ahora' && styles.estadoTextCerrado,
                  ]}
                >
                  {estado === 'abierto_ahora'
                    ? 'Abierto'
                    : estado === 'cerrado_ahora'
                    ? 'Cerrado'
                    : 'Sin info'}
                </Text>
              </View>
              <View style={styles.localActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => handleComoLlegar(item, e)}
                >
                  <IconSymbol
                    ios_icon_name="arrow.triangle.turn.up.right.diamond"
                    android_material_icon_name="directions"
                    size={scaleIconSize(20)}
                    color={colors.primary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => handlePerfilSocial(item.id, e)}
                >
                  <IconSymbol
                    ios_icon_name="person.circle"
                    android_material_icon_name="account-circle"
                    size={scaleIconSize(20)}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [router, toggleFavorito, handleComoLlegar, handlePerfilSocial]
  );

  return (
    <View style={styles.container}>
      <HeaderContent />
      <FlatList
        data={displayedLocales}
        renderItem={renderLocalCard}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: HEADER_MAX_HEIGHT },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            progressViewOffset={HEADER_MAX_HEIGHT}
          />
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: false,
            listener: handleScroll,
          }
        )}
        scrollEventThrottle={16}
        onEndReached={loadMoreLocales}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
      />

      {/* Modal de selección de provincia */}
      <Modal
        visible={showProvinciaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProvinciaModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowProvinciaModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Provincia</Text>
              <TouchableOpacity onPress={() => setShowProvinciaModal(false)}>
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={scaleIconSize(24)}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {PROVINCIAS.map((provincia) => (
                <TouchableOpacity
                  key={provincia}
                  style={[
                    styles.provinciaItem,
                    provinciaSeleccionada === provincia &&
                      styles.provinciaItemActive,
                  ]}
                  onPress={() => {
                    console.log('User selected province:', provincia);
                    setProvinciaSeleccionada(provincia);
                    setShowProvinciaModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.provinciaItemText,
                      provinciaSeleccionada === provincia &&
                        styles.provinciaItemTextActive,
                    ]}
                  >
                    {provincia}
                  </Text>
                  {provinciaSeleccionada === provincia && (
                    <IconSymbol
                      ios_icon_name="checkmark"
                      android_material_icon_name="check"
                      size={scaleIconSize(20)}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
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
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
  },
  headerContent: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: getHeaderTitleSize(),
    fontWeight: 'bold',
    color: colors.background,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: scaleFontSize(14),
    color: colors.background,
    opacity: 0.8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: scaleFontSize(16),
    color: colors.text,
  },
  categoriesScroll: {
    marginBottom: 12,
  },
  categoriesContent: {
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
  },
  categoryChipText: {
    fontSize: scaleFontSize(14),
    color: colors.text,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: colors.background,
  },
  provinciaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  provinciaButtonText: {
    flex: 1,
    fontSize: scaleFontSize(16),
    color: colors.text,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: getContentBottomPadding(),
  },
  localCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    ...commonStyles.shadow,
  },
  localImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.border,
  },
  destacadoBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  destacadoText: {
    fontSize: scaleFontSize(12),
    color: colors.warning,
    fontWeight: '600',
  },
  localInfo: {
    padding: 16,
  },
  localHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  localNombre: {
    flex: 1,
    fontSize: scaleFontSize(18),
    fontWeight: 'bold',
    color: colors.text,
    marginRight: 8,
  },
  localMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  localMetaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  localMetaText: {
    flex: 1,
    fontSize: scaleFontSize(14),
    color: colors.textSecondary,
  },
  localDistance: {
    fontSize: scaleFontSize(14),
    color: colors.textSecondary,
    fontWeight: '600',
  },
  localFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  estadoBadgeAbierto: {
    backgroundColor: colors.successLight,
  },
  estadoBadgeCerrado: {
    backgroundColor: colors.errorLight,
  },
  estadoText: {
    fontSize: scaleFontSize(12),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  estadoTextAbierto: {
    color: colors.success,
  },
  estadoTextCerrado: {
    color: colors.error,
  },
  localActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: scaleFontSize(14),
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: scaleFontSize(14),
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: 'bold',
    color: colors.text,
  },
  modalScroll: {
    maxHeight: 400,
  },
  provinciaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  provinciaItemActive: {
    backgroundColor: colors.primaryLight,
  },
  provinciaItemText: {
    fontSize: scaleFontSize(16),
    color: colors.text,
  },
  provinciaItemTextActive: {
    fontWeight: '600',
    color: colors.primary,
  },
});
