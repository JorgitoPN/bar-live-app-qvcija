
import TarjetaLocal from '@/components/home/TarjetaLocal';
import { LinearGradient } from 'expo-linear-gradient';
import { filterAndSortLocals } from '@/utils/filterLocals';
import { useRouter, useFocusEffect } from 'expo-router';
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
  Pressable,
} from 'react-native';
import * as Location from 'expo-location';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { useScrollPosition } from '@/hooks/useScrollPosition';
import InitialLoadingScreen from '@/components/common/InitialLoadingScreen';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';

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
  claimLocalBanner: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  claimLocalContent: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  claimLocalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimLocalTextContainer: {
    flex: 1,
  },
  claimLocalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 4,
  },
  claimLocalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  claimLocalArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  modalBody: {
    padding: 20,
  },
  optionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 20,
    marginBottom: 16,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  optionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  optionButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.headerText,
  },
  closeButton: {
    marginTop: 8,
    padding: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});

export default function ExplorarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode } = useMode();
  
  // ⚡ USE GLOBAL DATA - NO FETCHING!
  const { locales: todosLosLocales, isInitialLoading, isRefreshing: globalRefreshing, refreshData } = useGlobalData();
  
  // ⚡ PRESERVE SCROLL POSITION
  const { scrollViewRef, saveScrollPosition, restoreScrollPosition } = useScrollPosition('home-explorar');
  
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('down');
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const categoriasTranslateY = useRef(new Animated.Value(0)).current;
  const isHeaderVisible = useRef(true);

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todos');
  const [modoSeleccionado, setModoSeleccionado] = useState<ModoUsuario>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFiltros, setShowFiltros] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
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

  // ⚡ RESTORE SCROLL POSITION when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('[Explorar] ⚡ Screen focused - restoring scroll position');
      restoreScrollPosition();
    }, [restoreScrollPosition])
  );

  useEffect(() => {
    obtenerUbicacionUsuario();
  }, []);

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

  const aplicarFiltrosYOrdenamiento = useCallback(() => {
    console.log('[Explorar] ⚡ Applying filters...');
    
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

    console.log('[Explorar] ⚡ Filtered locals:', localesFiltrados.length);
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

    // Determine scroll direction
    if (scrollDiff > 0) {
      scrollDirection.current = 'down';
    } else if (scrollDiff < 0) {
      scrollDirection.current = 'up';
    }

    // FIXED: Improved scroll detection logic
    // Hide when scrolling down more than 5px and past 50px from top
    if (scrollDirection.current === 'down' && scrollDiff > 5 && currentScrollY > 50 && isHeaderVisible.current) {
      console.log('[Explorar] ⬇️ Hiding header and categories');
      isHeaderVisible.current = false;
      
      Animated.parallel([
        Animated.timing(headerTranslateY, {
          toValue: -HEADER_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(categoriasTranslateY, {
          toValue: -HEADER_HEIGHT - CATEGORIAS_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } 
    // Show when scrolling up more than 10px
    else if (scrollDirection.current === 'up' && scrollDiff < -10 && !isHeaderVisible.current) {
      console.log('[Explorar] ⬆️ Showing header and categories');
      isHeaderVisible.current = true;
      
      Animated.parallel([
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(categoriasTranslateY, {
          toValue: 0,
          duration: 250,
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
    // ⚡ USE GLOBAL REFRESH - NO INDIVIDUAL FETCHING
    await refreshData(false);
    setRefreshing(false);
  };

  const handleClaimLocalPress = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setShowClaimModal(true);
  };

  const handleClaimExisting = () => {
    setShowClaimModal(false);
    router.push({
      pathname: '/solicitudes/solicitar-rol-propietario',
      params: { tipo: 'reclamar' }
    });
  };

  const handleRegisterNew = () => {
    setShowClaimModal(false);
    router.push({
      pathname: '/solicitudes/solicitar-rol-propietario',
      params: { tipo: 'registrar' }
    });
  };

  // ⚡ SHOW LOADING SCREEN ONLY ON INITIAL APP STARTUP
  if (isInitialLoading) {
    return <InitialLoadingScreen />;
  }

  return (
    <View style={styles.container}>
      {/* Animated Header - FIXED: Starts at top: 0 */}
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

      {/* Animated Categories - FIXED: Starts at top: HEADER_HEIGHT and moves with header */}
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
        refreshControl={<RefreshControl refreshing={refreshing || globalRefreshing} onRefresh={onRefresh} />}
        onScroll={(event) => {
          handleScroll(event);
          saveScrollPosition(event);
        }}
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

        {/* Claim Local Banner - Only show for Cliente mode users */}
        {currentMode === 'cliente' && (
          <TouchableOpacity
            style={styles.claimLocalBanner}
            onPress={handleClaimLocalPress}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#8B5CF6', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.claimLocalContent}
            >
              <View style={styles.claimLocalIcon}>
                <IconSymbol name="building.2.fill" size={28} color={colors.headerText} />
              </View>
              <View style={styles.claimLocalTextContainer}>
                <Text style={styles.claimLocalTitle}>💡 ¿Tienes un local?</Text>
                <Text style={styles.claimLocalSubtitle}>
                  Reclama tu local en BarLive y obtén modo Propietario
                </Text>
              </View>
              <View style={styles.claimLocalArrow}>
                <IconSymbol name="chevron.right" size={20} color={colors.headerText} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {localesMostrados.length > 0 ? (
          <>
            <View style={styles.localesContainer}>
              {localesMostrados.map((Now I have a good understanding of the current system. Let me implement the fixes and new features:

## Summary of Changes Needed:

1. **Fix Login Redirection** - The callback is already handling this correctly, but we need to ensure the AuthContext doesn't interfere
2. **Add "Claim Local" Button** to the explorar (locales list) page
3. **Create Claim/Register Local Flow** with modal/page
4. **Ensure Logout Redirects to Explorar** - Already implemented in AuthContext

Let me implement these changes:

<write file="app/(tabs)/(home)/index.tsx">
import TarjetaLocal from '@/components/home/TarjetaLocal';
import { LinearGradient } from 'expo-linear-gradient';
import { filterAndSortLocals } from '@/utils/filterLocals';
import { useRouter, useFocusEffect } from 'expo-router';
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
  Pressable,
} from 'react-native';
import * as Location from 'expo-location';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { useScrollPosition } from '@/hooks/useScrollPosition';
import InitialLoadingScreen from '@/components/common/InitialLoadingScreen';

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
  claimLocalBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  claimLocalGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  claimLocalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimLocalContent: {
    flex: 1,
  },
  claimLocalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  claimLocalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  claimLocalArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBody: {
    padding: 20,
  },
  modalOption: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  modalOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  modalOptionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  modalOptionButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalOptionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalInfoBox: {
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalInfoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
});

export default function ExplorarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode } = useMode();
  
  // ⚡ USE GLOBAL DATA - NO FETCHING!
  const { locales: todosLosLocales, isInitialLoading, isRefreshing: globalRefreshing, refreshData } = useGlobalData();
  
  // ⚡ PRESERVE SCROLL POSITION
  const { scrollViewRef, saveScrollPosition, restoreScrollPosition } = useScrollPosition('home-explorar');
  
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('down');
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const categoriasTranslateY = useRef(new Animated.Value(0)).current;
  const isHeaderVisible = useRef(true);

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todos');
  const [modoSeleccionado, setModoSeleccionado] = useState<ModoUsuario>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFiltros, setShowFiltros] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
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

  // ⚡ RESTORE SCROLL POSITION when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('[Explorar] ⚡ Screen focused - restoring scroll position');
      restoreScrollPosition();
    }, [restoreScrollPosition])
  );

  useEffect(() => {
    obtenerUbicacionUsuario();
  }, []);

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

  const aplicarFiltrosYOrdenamiento = useCallback(() => {
    console.log('[Explorar] ⚡ Applying filters...');
    
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

    console.log('[Explorar] ⚡ Filtered locals:', localesFiltrados.length);
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

    // Determine scroll direction
    if (scrollDiff > 0) {
      scrollDirection.current = 'down';
    } else if (scrollDiff < 0) {
      scrollDirection.current = 'up';
    }

    // FIXED: Improved scroll detection logic
    // Hide when scrolling down more than 5px and past 50px from top
    if (scrollDirection.current === 'down' && scrollDiff > 5 && currentScrollY > 50 && isHeaderVisible.current) {
      console.log('[Explorar] ⬇️ Hiding header and categories');
      isHeaderVisible.current = false;
      
      Animated.parallel([
        Animated.timing(headerTranslateY, {
          toValue: -HEADER_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(categoriasTranslateY, {
          toValue: -HEADER_HEIGHT - CATEGORIAS_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } 
    // Show when scrolling up more than 10px
    else if (scrollDirection.current === 'up' && scrollDiff < -10 && !isHeaderVisible.current) {
      console.log('[Explorar] ⬆️ Showing header and categories');
      isHeaderVisible.current = true;
      
      Animated.parallel([
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(categoriasTranslateY, {
          toValue: 0,
          duration: 250,
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
    // ⚡ USE GLOBAL REFRESH - NO INDIVIDUAL FETCHING
    await refreshData(false);
    setRefreshing(false);
  };

  const handleClaimLocal = () => {
    if (!user) {
      // Show login modal if not logged in
      router.push('/auth/login-popup');
      return;
    }
    setShowClaimModal(true);
  };

  const handleClaimExisting = () => {
    setShowClaimModal(false);
    router.push({
      pathname: '/solicitudes/solicitar-rol-propietario',
      params: { tipo: 'reclamar' }
    });
  };

  const handleRegisterNew = () => {
    setShowClaimModal(false);
    router.push({
      pathname: '/solicitudes/solicitar-rol-propietario',
      params: { tipo: 'registrar' }
    });
  };

  // ⚡ SHOW LOADING SCREEN ONLY ON INITIAL APP STARTUP
  if (isInitialLoading) {
    return <InitialLoadingScreen />;
  }

  return (
    <View style={styles.container}>
      {/* Animated Header - FIXED: Starts at top: 0 */}
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

      {/* Animated Categories - FIXED: Starts at top: HEADER_HEIGHT and moves with header */}
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
        refreshControl={<RefreshControl refreshing={refreshing || globalRefreshing} onRefresh={onRefresh} />}
        onScroll={(event) => {
          handleScroll(event);
          saveScrollPosition(event);
        }}
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

        {/* Claim Local Banner - Only show for Cliente mode */}
        {currentMode === 'cliente' && (
          <TouchableOpacity
            style={styles.claimLocalBanner}
            onPress={handleClaimLocal}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#8B5CF6', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.claimLocalGradient}
            >
              <View style={styles.claimLocalIcon}>
                <IconSymbol name="building.2.fill" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.claimLocalContent}>
                <Text style={styles.claimLocalTitle}>💡 ¿Tienes un local?</Text>
                <Text style={styles.claimLocalSubtitle}>
                  Reclama tu local en BarLive y obtén modo Propietario
                </Text>
              </View>
              <View style={styles.claimLocalArrow}>
                <IconSymbol name="chevron.right" size={20} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {localesMostrados.length > 0 ? (
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

      <FiltrosAvanzadosSheet
        visible={showFiltros}
        onClose={() => setShowFiltros(false)}
        filtros={filtros}
        onAplicarFiltros={(nuevosFiltros) => {
          setFiltros(nuevosFiltros);
          setShowFiltros(false);
        }}
      />

      {/* Claim Local Modal */}
      <Modal
        visible={showClaimModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowClaimModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowClaimModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reclama tu Local</Text>
              <TouchableOpacity onPress={() => setShowClaimModal(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Option 1: Claim Existing */}
              <View style={styles.modalOption}>
                <View style={styles.modalOptionHeader}>
                  <View style={styles.modalOptionIcon}>
                    <IconSymbol name="magnifyingglass" size={24} color={colors.primary} />
                  </View>
                  <Text style={styles.modalOptionTitle}>Reclamar Local Existente</Text>
                </View>
                <Text style={styles.modalOptionDescription}>
                  Busca tu local por nombre o dirección y envía una solicitud de verificación. 
                  Verificaremos que eres el propietario antes de aprobar tu solicitud.
                </Text>
                <TouchableOpacity
                  style={styles.modalOptionButton}
                  onPress={handleClaimExisting}
                >
                  <Text style={styles.modalOptionButtonText}>Buscar mi Local</Text>
                </TouchableOpacity>
              </View>

              {/* Option 2: Register New */}
              <View style={styles.modalOption}>
                <View style={styles.modalOptionHeader}>
                  <View style={styles.modalOptionIcon}>
                    <IconSymbol name="plus.circle.fill" size={24} color={colors.primary} />
                  </View>
                  <Text style={styles.modalOptionTitle}>Registrar Nuevo Local</Text>
                </View>
                <Text style={styles.modalOptionDescription}>
                  Crea un nuevo local en BarLive con datos básicos: nombre, dirección, tipo, 
                  horario, etc. Tu solicitud será revisada por nuestro equipo.
                </Text>
                <TouchableOpacity
                  style={styles.modalOptionButton}
                  onPress={handleRegisterNew}
                >
                  <Text style={styles.modalOptionButtonText}>Crear Nuevo Local</Text>
                </TouchableOpacity>
              </View>

              {/* Info Box */}
              <View style={styles.modalInfoBox}>
                <IconSymbol name="info.circle.fill" size={20} color={colors.primary} />
                <Text style={styles.modalInfoText}>
                  Al enviar tu solicitud, se generará automáticamente una solicitud de modo Propietario. 
                  Podrás ver el progreso de verificación en tu perfil en tiempo real.
                </Text>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
