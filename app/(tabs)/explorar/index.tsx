
import { useRouter, useFocusEffect } from 'expo-router';
import { getEstadoLocal } from '@/utils/timeUtils';
import { getCategoryIcon } from '@/utils/categoryIcons';
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
import { applyAdvancedFilters } from '@/utils/filterLocals';
import LoginPrompt from '@/components/common/LoginPrompt';
import FiltrosAvanzadosSheet from '@/components/home/FiltrosAvanzadosSheet';
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
import { navigationOptimizer, useScreenPerformance } from '@/utils/performanceMonitor';
import { useMode } from '@/contexts/ModeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { useFilters } from '@/contexts/FilterContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import ProfileSwitcher from '@/components/perfil/ProfileSwitcher';
import { IconSymbol } from '@/components/IconSymbol';
import * as Location from 'expo-location';
import { useAuth } from '@/contexts/AuthContext';
import { colors, commonStyles } from '@/styles/commonStyles';
import { calcularDistancia } from '@/utils/locationUtils';
import { supabase } from '@/utils/supabase';

const ITEMS_PER_PAGE = 20;
const HEADER_MAX_HEIGHT = 200;
const HEADER_MIN_HEIGHT = 60;

const PROVINCIAS = [
  'Todas',
  'Madrid',
  'Barcelona',
  'Valencia',
  'Sevilla',
  'Zaragoza',
  'Málaga',
  'Murcia',
  'Palma',
  'Las Palmas',
  'Bilbao',
];

const CATEGORIAS = [
  { id: 'todas', nombre: 'Todas', icono: 'apps' },
  { id: 'bar', nombre: 'Bares', icono: 'local-bar' },
  { id: 'discoteca', nombre: 'Discotecas', icono: 'nightlife' },
  { id: 'restaurante', nombre: 'Restaurantes', icono: 'restaurant' },
  { id: 'pub', nombre: 'Pubs', icono: 'sports-bar' },
  { id: 'cafeteria', nombre: 'Cafeterías', icono: 'local-cafe' },
];

interface Local {
  id: string;
  nombre: string;
  tipo: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  imagen_url?: string;
  latitud?: number;
  longitud?: number;
  valoracion?: number;
  distancia?: number;
  destacado?: boolean;
  plan_activo?: string;
  horarios_completos?: Record<string, string[]>;
  estado_actual?: string;
}

export default function ExplorarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { mode } = useMode();
  const { favorites } = useFavorites();
  const {
    selectedCategory,
    setSelectedCategory,
    provinciaSeleccionada,
    setProvinciaSeleccionada,
    globalFiltros,
    searchQuery,
    setSearchQuery,
  } = useFilters();
  const { locales: globalLocales } = useGlobalData();

  // ============================================
  // ESTADO PRINCIPAL - SIMPLIFICADO
  // ============================================
  const [displayedLocales, setDisplayedLocales] = useState<Local[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Estado de ubicación
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationReady, setLocationReady] = useState(false);

  // UI State
  const [showFiltrosSheet, setShowFiltrosSheet] = useState(false);
  const [showProvinciaModal, setShowProvinciaModal] = useState(false);

  // ============================================
  // REFS PARA PREVENIR RACE CONDITIONS
  // ============================================
  const isLoadingRef = useRef(false);
  const lastFiltersRef = useRef('');
  const mountedRef = useRef(true);

  // ============================================
  // PERFORMANCE MONITORING
  // ============================================
  useScreenPerformance('ExplorarScreen');

  // ============================================
  // UBICACIÓN DEL USUARIO
  // ============================================
  useEffect(() => {
    let isMounted = true;

    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Permiso de ubicación denegado');
          if (isMounted) {
            setLocationReady(true);
          }
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (isMounted) {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          setLocationReady(true);
          console.log('Ubicación obtenida:', location.coords);
        }
      } catch (error) {
        console.error('Error obteniendo ubicación:', error);
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
  // FUNCIÓN PRINCIPAL DE CARGA - MEJORADA
  // ============================================
  const loadLocales = useCallback(
    async (page: number, isRefresh: boolean = false) => {
      // Prevenir llamadas concurrentes
      if (isLoadingRef.current) {
        console.log('⏸️ Carga ya en progreso, ignorando...');
        return;
      }

      console.log(`📥 Cargando página ${page} (refresh: ${isRefresh})`);

      isLoadingRef.current = true;

      if (isRefresh) {
        setRefreshing(true);
      } else if (page === 1) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const offset = (page - 1) * ITEMS_PER_PAGE;

        // Construir query
        let query = supabase
          .from('locales')
          .select('*')
          .eq('activo', true)
          .range(offset, offset + ITEMS_PER_PAGE - 1)
          .order('destacado', { ascending: false })
          .order('nombre', { ascending: true });

        // Aplicar filtros
        if (selectedCategory && selectedCategory !== 'todas') {
          query = query.eq('tipo', selectedCategory);
        }

        if (provinciaSeleccionada && provinciaSeleccionada !== 'Todas') {
          query = query.eq('provincia', provinciaSeleccionada);
        }

        if (searchQuery && searchQuery.trim()) {
          query = query.ilike('nombre', `%${searchQuery.trim()}%`);
        }

        const { data, error } = await query;

        if (error) {
          console.error('❌ Error cargando locales:', error);
          throw error;
        }

        if (!mountedRef.current) {
          console.log('⚠️ Componente desmontado, cancelando actualización');
          return;
        }

        console.log(`✅ Cargados ${data?.length || 0} locales para página ${page}`);

        // Calcular distancias si hay ubicación
        let processedLocales = data || [];
        if (userLocation && processedLocales.length > 0) {
          processedLocales = processedLocales.map((local) => {
            if (local.latitud && local.longitud) {
              const distancia = calcularDistancia(
                userLocation.latitude,
                userLocation.longitude,
                local.latitud,
                local.longitud
              );
              return { ...local, distancia };
            }
            return local;
          });
        }

        // Aplicar filtros avanzados
        const filteredData = applyAdvancedFilters(processedLocales, globalFiltros);

        // Actualizar estado según el tipo de carga
        if (isRefresh || page === 1) {
          // Primera carga o refresh: reemplazar todo
          console.log('🔄 Reemplazando lista completa');
          setDisplayedLocales(filteredData);
          setCurrentPage(1);
          setHasMore(filteredData.length >= ITEMS_PER_PAGE);
        } else {
          // Carga incremental: añadir al final
          console.log('➕ Añadiendo locales al final de la lista');
          setDisplayedLocales((prev) => {
            // Deduplicar por ID
            const existingIds = new Set(prev.map((l) => l.id));
            const newLocales = filteredData.filter((l) => !existingIds.has(l.id));
            
            if (newLocales.length === 0) {
              console.log('⚠️ No hay locales nuevos únicos');
              setHasMore(false);
              return prev;
            }

            console.log(`✨ Añadiendo ${newLocales.length} locales nuevos`);
            return [...prev, ...newLocales];
          });
          setCurrentPage(page);
          setHasMore(filteredData.length >= ITEMS_PER_PAGE);
        }
      } catch (error) {
        console.error('❌ Error en loadLocales:', error);
        Alert.alert('Error', 'No se pudieron cargar los locales');
      } finally {
        isLoadingRef.current = false;
        setLoading(false);
        setRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [selectedCategory, provinciaSeleccionada, searchQuery, globalFiltros, userLocation]
  );

  // ============================================
  // CARGA INICIAL Y CAMBIOS DE FILTROS
  // ============================================
  useEffect(() => {
    if (!locationReady) {
      console.log('⏳ Esperando ubicación...');
      return;
    }

    // Detectar cambios en filtros
    const filtersKey = `${selectedCategory}-${provinciaSeleccionada}-${searchQuery}-${JSON.stringify(globalFiltros)}`;
    
    if (filtersKey !== lastFiltersRef.current) {
      console.log('🔄 Filtros cambiados, recargando desde página 1');
      lastFiltersRef.current = filtersKey;
      
      // Reset completo
      setDisplayedLocales([]);
      setCurrentPage(1);
      setHasMore(true);
      
      // Cargar primera página
      loadLocales(1, false);
    } else if (displayedLocales.length === 0 && !loading && !isLoadingRef.current) {
      console.log('🆕 Carga inicial');
      loadLocales(1, false);
    }
  }, [locationReady, selectedCategory, provinciaSeleccionada, searchQuery, globalFiltros, loadLocales]);

  // ============================================
  // INFINITE SCROLL - MEJORADO
  // ============================================
  const handleLoadMore = useCallback(() => {
    // Condiciones de seguridad
    if (!hasMore) {
      console.log('⛔ No hay más locales para cargar');
      return;
    }

    if (isLoadingRef.current || loading || isLoadingMore || refreshing) {
      console.log('⏸️ Ya hay una carga en progreso');
      return;
    }

    if (!locationReady) {
      console.log('⏳ Ubicación no lista');
      return;
    }

    console.log(`📄 Cargando siguiente página: ${currentPage + 1}`);
    loadLocales(currentPage + 1, false);
  }, [hasMore, loading, isLoadingMore, refreshing, locationReady, currentPage, loadLocales]);

  // ============================================
  // PULL TO REFRESH
  // ============================================
  const onRefresh = useCallback(() => {
    console.log('🔄 Pull to refresh');
    setDisplayedLocales([]);
    setCurrentPage(1);
    setHasMore(true);
    loadLocales(1, true);
  }, [loadLocales]);

  // ============================================
  // CLEANUP
  // ============================================
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      isLoadingRef.current = false;
    };
  }, []);

  // ============================================
  // RENDER ITEM - OPTIMIZADO
  // ============================================
  const renderLocalCard = useCallback(
    ({ item }: { item: Local }) => {
      const estadoLocal = getEstadoLocal(item.horarios_completos);
      const distanciaText = item.distancia ? `${item.distancia.toFixed(1)} km` : null;

      return (
        <TouchableOpacity
          style={styles.localCard}
          onPress={() => router.push(`/detalle/local?id=${item.id}`)}
          activeOpacity={0.7}
        >
          {item.imagen_url ? (
            <Image source={{ uri: item.imagen_url }} style={styles.localImage} />
          ) : (
            <View style={[styles.localImage, styles.placeholderImage]}>
              <IconSymbol
                ios_icon_name="photo"
                android_material_icon_name="image"
                size={40}
                color={colors.textSecondary}
              />
            </View>
          )}

          {item.destacado && (
            <View style={styles.destacadoBadge}>
              <IconSymbol
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={16}
                color="#FFD700"
              />
            </View>
          )}

          <View style={styles.localInfo}>
            <Text style={styles.localNombre} numberOfLines={1}>
              {item.nombre}
            </Text>
            <Text style={styles.localTipo} numberOfLines={1}>
              {item.tipo}
            </Text>
            {item.direccion && (
              <Text style={styles.localDireccion} numberOfLines={1}>
                {item.direccion}
              </Text>
            )}
            <View style={styles.localFooter}>
              {distanciaText && (
                <View style={styles.distanciaContainer}>
                  <IconSymbol
                    ios_icon_name="location.fill"
                    android_material_icon_name="location-on"
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={styles.distanciaText}>{distanciaText}</Text>
                </View>
              )}
              {estadoLocal && (
                <View
                  style={[
                    styles.estadoBadge,
                    estadoLocal === 'abierto_ahora'
                      ? styles.estadoAbierto
                      : styles.estadoCerrado,
                  ]}
                >
                  <Text style={styles.estadoText}>
                    {estadoLocal === 'abierto_ahora' ? 'Abierto' : 'Cerrado'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [router]
  );

  // ============================================
  // FOOTER - LOADING INDICATOR
  // ============================================
  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.footerText}>Cargando más locales...</Text>
      </View>
    );
  }, [isLoadingMore]);

  // ============================================
  // EMPTY STATE
  // ============================================
  const renderEmpty = useCallback(() => {
    if (loading) {
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
          size={64}
          color={colors.textSecondary}
        />
        <Text style={styles.emptyText}>No se encontraron locales</Text>
        <Text style={styles.emptySubtext}>
          Intenta cambiar los filtros o la búsqueda
        </Text>
      </View>
    );
  }, [loading]);

  // ============================================
  // RENDER PRINCIPAL
  // ============================================
  return (
    <View style={styles.container}>
      {/* Header con búsqueda y filtros */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={20}
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
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Categorías horizontales */}
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
              onPress={() => setSelectedCategory(cat.id)}
            >
              <IconSymbol
                ios_icon_name={cat.icono}
                android_material_icon_name={cat.icono}
                size={18}
                color={
                  selectedCategory === cat.id ? colors.background : colors.text
                }
              />
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat.id && styles.categoryChipTextActive,
                ]}
              >
                {cat.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Botones de filtros */}
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowProvinciaModal(true)}
          >
            <IconSymbol
              ios_icon_name="location.fill"
              android_material_icon_name="location-on"
              size={18}
              color={colors.primary}
            />
            <Text style={styles.filterButtonText}>{provinciaSeleccionada}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFiltrosSheet(true)}
          >
            <IconSymbol
              ios_icon_name="slider.horizontal.3"
              android_material_icon_name="tune"
              size={18}
              color={colors.primary}
            />
            <Text style={styles.filterButtonText}>Filtros</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de locales */}
      <FlatList
        data={displayedLocales}
        renderItem={renderLocalCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        removeClippedSubviews={false}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
        initialNumToRender={10}
      />

      {/* Modal de provincias */}
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
            <Text style={styles.modalTitle}>Seleccionar Provincia</Text>
            <ScrollView>
              {PROVINCIAS.map((prov) => (
                <TouchableOpacity
                  key={prov}
                  style={[
                    styles.provinciaItem,
                    provinciaSeleccionada === prov && styles.provinciaItemActive,
                  ]}
                  onPress={() => {
                    setProvinciaSeleccionada(prov);
                    setShowProvinciaModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.provinciaText,
                      provinciaSeleccionada === prov && styles.provinciaTextActive,
                    ]}
                  >
                    {prov}
                  </Text>
                  {provinciaSeleccionada === prov && (
                    <IconSymbol
                      ios_icon_name="checkmark"
                      android_material_icon_name="check"
                      size={20}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Sheet de filtros avanzados */}
      <FiltrosAvanzadosSheet
        visible={showFiltrosSheet}
        onClose={() => setShowFiltrosSheet(false)}
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
    backgroundColor: colors.card,
    paddingTop: Platform.OS === 'android' ? 48 : 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: scaleFontSize(16),
    color: colors.text,
  },
  categoriesScroll: {
    marginBottom: 12,
  },
  categoriesContent: {
    paddingRight: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    marginLeft: 6,
    fontSize: scaleFontSize(14),
    color: colors.text,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: colors.background,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: scaleFontSize(14),
    color: colors.text,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: getContentBottomPadding(),
  },
  localCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  localImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.background,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  destacadoBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 6,
  },
  localInfo: {
    padding: 12,
  },
  localNombre: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  localTipo: {
    fontSize: scaleFontSize(14),
    color: colors.textSecondary,
    marginBottom: 4,
  },
  localDireccion: {
    fontSize: scaleFontSize(13),
    color: colors.textSecondary,
    marginBottom: 8,
  },
  localFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanciaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanciaText: {
    marginLeft: 4,
    fontSize: scaleFontSize(13),
    color: colors.primary,
    fontWeight: '500',
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  estadoAbierto: {
    backgroundColor: '#4CAF50',
  },
  estadoCerrado: {
    backgroundColor: '#F44336',
  },
  estadoText: {
    fontSize: scaleFontSize(12),
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    marginTop: 8,
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
    marginTop: 16,
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: scaleFontSize(14),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  provinciaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  provinciaItemActive: {
    backgroundColor: colors.background,
  },
  provinciaText: {
    fontSize: scaleFontSize(16),
    color: colors.text,
  },
  provinciaTextActive: {
    fontWeight: '600',
    color: colors.primary,
  },
});
