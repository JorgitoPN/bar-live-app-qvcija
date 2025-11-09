
import TarjetaLocal from '@/components/home/TarjetaLocal';
import { LinearGradient } from 'expo-linear-gradient';
import { filterAndSortLocals } from '@/utils/filterLocals';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Local, Filtros } from '@/types';
import { useMode } from '@/contexts/ModeContext';
import FiltrosAvanzadosSheet from '@/components/home/FiltrosAvanzadosSheet';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Modal,
  Animated,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

type ModoUsuario = 'todos' | 'cercanos' | 'destacados' | 'nuevos';

const CATEGORIAS_LOCALES = [
  { id: 'todos', nombre: 'Todos', emoji: '🌟' },
  { id: 'bares', nombre: 'Bares', emoji: '🍺' },
  { id: 'restaurantes', nombre: 'Restaurantes', emoji: '🍽️' },
  { id: 'discotecas', nombre: 'Discotecas', emoji: '💃' },
  { id: 'cafeterias', nombre: 'Cafeterías', emoji: '☕' },
  { id: 'pubs', nombre: 'Pubs', emoji: '🍻' },
  { id: 'coctelerias', nombre: 'Coctelerías', emoji: '🍸' },
];

const CATEGORIAS_EXCLUIDAS = ['terrazas', 'rooftops', 'lounge'];

const LOCALES_POR_PAGINA = 20;
const HEADER_HEIGHT = 140;
const CATEGORIAS_HEIGHT = 100;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.headerText,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.headerText,
    marginLeft: 8,
  },
  categoriasContainer: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: colors.background,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.cardBorder,
  },
  categoriaItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    minWidth: 90,
  },
  categoriaItemActiva: {
    backgroundColor: colors.primary,
  },
  categoriaEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoriaNombre: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  categoriaNombreActiva: {
    color: colors.headerText,
  },
  modoSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: colors.background,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.cardBorder,
  },
  modoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    gap: 6,
  },
  modoButtonActivo: {
    backgroundColor: colors.primary,
  },
  modoButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  modoButtonTextActivo: {
    color: colors.headerText,
  },
  localesContainer: {
    padding: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  loadMoreButton: {
    margin: 16,
    padding: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
  },
  loadMoreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.headerText,
  },
});

export default function ExplorarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode } = useMode();
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const categoriasTranslateY = useRef(new Animated.Value(0)).current;

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todos');
  const [modoSeleccionado, setModoSeleccionado] = useState<ModoUsuario>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFiltros, setShowFiltros] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [todosLosLocales, setTodosLosLocales] = useState<Local[]>([]);
  const [localesFiltradosCompletos, setLocalesFiltradosCompletos] = useState<Local[]>([]);
  const [localesMostrados, setLocalesMostrados] = useState<Local[]>([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [filtros, setFiltros] = useState<Filtros>({
    precioMin: 1,
    precioMax: 4,
    distanciaMax: 50,
    servicios: [],
    ambiente: [],
    musica: [],
    abierto: false,
  });

  const cargarTodosLosLocales = useCallback(async () => {
    try {
      console.log('[Explorar] Loading all locals...');
      setLoading(true);

      const { data, error } = await supabase
        .from('locales')
        .select('*')
        .eq('activo', true)
        .order('destacado', { ascending: false })
        .order('rating', { ascending: false });

      if (error) {
        console.error('[Explorar] Error loading locals:', error);
        return;
      }

      console.log('[Explorar] Loaded locals:', data?.length);

      const localesTransformados = (data || []).map(transformarLocal);
      setTodosLosLocales(localesTransformados);
    } catch (error) {
      console.error('[Explorar] Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarPromocionesActivas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('promociones')
        .select('local_id')
        .eq('activo', true)
        .gte('fecha_fin', new Date().toISOString());

      if (!error && data) {
        const localesDestacados = data.map((p) => p.local_id);
        setTodosLosLocales((prevLocales) =>
          prevLocales.map((local) => ({
            ...local,
            destacado: localesDestacados.includes(local.id) || local.destacado,
          }))
        );
      }
    } catch (error) {
      console.error('[Explorar] Error loading promotions:', error);
    }
  }, []);

  useEffect(() => {
    cargarTodosLosLocales();
    cargarPromocionesActivas();
    obtenerUbicacionUsuario();
  }, [cargarTodosLosLocales, cargarPromocionesActivas]);

  const obtenerUbicacionUsuario = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error('[Explorar] Error getting location:', error);
    }
  };

  const transformarLocal = (local: any): Local => {
    let categoriasLocal = local.barlive_types || [];
    if (categoriasLocal.length === 0 && local.barlive_type) {
      categoriasLocal = [local.barlive_type];
    }
    categoriasLocal = categoriasLocal.filter(
      (cat: string) => !CATEGORIAS_EXCLUIDAS.includes(cat.toLowerCase())
    );

    return {
      ...local,
      coordenadas: {
        lat: parseFloat(local.latitud),
        lng: parseFloat(local.longitud),
      },
      imagenes: local.galeria_urls || (local.imagen_url ? [local.imagen_url] : []),
      barlive_types: categoriasLocal,
    };
  };

  const aplicarFiltrosYOrdenamiento = useCallback(() => {
    console.log('[Explorar] Applying filters...');
    
    let localesFiltrados = [...todosLosLocales];

    if (categoriaSeleccionada !== 'todos') {
      localesFiltrados = localesFiltrados.filter((local) =>
        local.barlive_types?.some(
          (tipo: string) => tipo.toLowerCase() === categoriaSeleccionada.toLowerCase()
        )
      );
    }

    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase();
      localesFiltrados = localesFiltrados.filter(
        (local) =>
          local.nombre.toLowerCase().includes(busquedaLower) ||
          local.direccion?.toLowerCase().includes(busquedaLower) ||
          local.provincia?.toLowerCase().includes(busquedaLower)
      );
    }

    localesFiltrados = filterAndSortLocals(localesFiltrados, filtros, userLocation);

    switch (modoSeleccionado) {
      case 'cercanos':
        if (userLocation) {
          localesFiltrados.sort((a, b) => {
            const distA = a.distancia || Infinity;
            const distB = b.distancia || Infinity;
            return distA - distB;
          });
        }
        break;
      case 'destacados':
        localesFiltrados = localesFiltrados.filter((local) => local.destacado);
        break;
      case 'nuevos':
        localesFiltrados = localesFiltrados.filter((local) => local.nuevo);
        break;
    }

    console.log('[Explorar] Filtered locals:', localesFiltrados.length);
    setLocalesFiltradosCompletos(localesFiltrados);
    setPaginaActual(1);
  }, [todosLosLocales, categoriaSeleccionada, busqueda, filtros, modoSeleccionado, userLocation]);

  useEffect(() => {
    aplicarFiltrosYOrdenamiento();
  }, [aplicarFiltrosYOrdenamiento]);

  useEffect(() => {
    const localesParaMostrar = localesFiltradosCompletos.slice(0, paginaActual * LOCALES_POR_PAGINA);
    setLocalesMostrados(localesParaMostrar);
  }, [localesFiltradosCompletos, paginaActual]);

  const handleModoChange = (modo: ModoUsuario) => {
    setModoSeleccionado(modo);
  };

  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollDiff = currentScrollY - lastScrollY.current;

    // Scroll down - hide both header and categories
    if (scrollDiff > 5 && currentScrollY > 50) {
      Animated.parallel([
        Animated.timing(headerTranslateY, {
          toValue: -HEADER_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(categoriasTranslateY, {
          toValue: -CATEGORIAS_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    // Scroll up - show only header
    else if (scrollDiff < -5) {
      Animated.parallel([
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(categoriasTranslateY, {
          toValue: -CATEGORIAS_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    // At top - show both
    else if (currentScrollY < 10) {
      Animated.parallel([
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(categoriasTranslateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }

    lastScrollY.current = currentScrollY;
  };

  const getModoLabel = (modo: ModoUsuario): string => {
    const labels = {
      todos: 'Todos',
      cercanos: 'Cercanos',
      destacados: 'Destacados',
      nuevos: 'Nuevos',
    };
    return labels[modo];
  };

  const getModoIcon = (modo: ModoUsuario): string => {
    const icons = {
      todos: 'square.grid.2x2',
      cercanos: 'location.fill',
      destacados: 'star.fill',
      nuevos: 'sparkles',
    };
    return icons[modo];
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarTodosLosLocales();
    await cargarPromocionesActivas();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* Animated Header */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          transform: [{ translateY: headerTranslateY }],
        }}
      >
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Explorar</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setShowFiltros(true)}
                activeOpacity={0.7}
              >
                <IconSymbol name="slider.horizontal.3" size={24} color={colors.headerText} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => router.push('/(tabs)/explorar/mapa')}
                activeOpacity={0.7}
              >
                <IconSymbol name="map" size={24} color={colors.headerText} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <IconSymbol name="magnifyingglass" size={20} color={colors.headerText} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar locales..."
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              value={busqueda}
              onChangeText={setBusqueda}
            />
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Animated Categories */}
      <Animated.View
        style={{
          position: 'absolute',
          top: HEADER_HEIGHT,
          left: 0,
          right: 0,
          zIndex: 99,
          transform: [{ translateY: categoriasTranslateY }],
        }}
      >
        <View style={styles.categoriasContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIAS_LOCALES.map((categoria) => (
              <TouchableOpacity
                key={categoria.id}
                style={[
                  styles.categoriaItem,
                  categoriaSeleccionada === categoria.id && styles.categoriaItemActiva,
                ]}
                onPress={() => setCategoriaSeleccionada(categoria.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.categoriaEmoji}>{categoria.emoji}</Text>
                <Text
                  style={[
                    styles.categoriaNombre,
                    categoriaSeleccionada === categoria.id && styles.categoriaNombreActiva,
                  ]}
                >
                  {categoria.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Animated.View>

      {/* Content with top padding */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ paddingTop: HEADER_HEIGHT + CATEGORIAS_HEIGHT }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.modoSelector}>
          {(['todos', 'cercanos', 'destacados', 'nuevos'] as ModoUsuario[]).map((modo) => (
            <TouchableOpacity
              key={modo}
              style={[styles.modoButton, modoSeleccionado === modo && styles.modoButtonActivo]}
              onPress={() => handleModoChange(modo)}
              activeOpacity={0.7}
            >
              <IconSymbol
                name={getModoIcon(modo)}
                size={16}
                color={modoSeleccionado === modo ? colors.headerText : colors.text}
              />
              <Text
                style={[
                  styles.modoButtonText,
                  modoSeleccionado === modo && styles.modoButtonTextActivo,
                ]}
              >
                {getModoLabel(modo)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Cargando locales...</Text>
          </View>
        ) : localesMostrados.length > 0 ? (
          <>
            <View style={styles.localesContainer}>
              {localesMostrados.map((local) => (
                <TarjetaLocal key={local.id} local={local} userLocation={userLocation} />
              ))}
            </View>

            {localesMostrados.length < localesFiltradosCompletos.length && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => setPaginaActual(paginaActual + 1)}
                activeOpacity={0.7}
              >
                <Text style={styles.loadMoreButtonText}>Cargar más locales</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <IconSymbol name="magnifyingglass" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>
              No se encontraron locales con los filtros seleccionados
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showFiltros}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFiltros(false)}
      >
        <FiltrosAvanzadosSheet
          filtros={filtros}
          onAplicar={(nuevosFiltros) => {
            setFiltros(nuevosFiltros);
            setShowFiltros(false);
          }}
          onCerrar={() => setShowFiltros(false)}
        />
      </Modal>
    </View>
  );
}
