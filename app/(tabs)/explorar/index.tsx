
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/utils/supabase';
import FiltrosAvanzadosSheet from '@/components/home/FiltrosAvanzadosSheet';
import { localPreloader } from '@/utils/localPreloader';
import { Local, Filtros } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import TarjetaLocal from '@/components/home/TarjetaLocal';
import { IconSymbol } from '@/components/IconSymbol';
import { useMode } from '@/contexts/ModeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, commonStyles } from '@/styles/commonStyles';
import * as Location from 'expo-location';
import { filterAndSortLocals } from '@/utils/filterLocals';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import InitialLoadingScreen from '@/components/common/InitialLoadingScreen';

type ModoUsuario = 'cliente' | 'propietario' | 'admin';

const CATEGORIAS_LOCALES = [
  { id: 'todos', label: 'Todos', icon: 'mappin.circle.fill' },
  { id: 'cafe', label: 'Cafés', icon: 'cup.and.saucer.fill' },
  { id: 'restaurante', label: 'Restaurantes', icon: 'fork.knife' },
  { id: 'bar', label: 'Bares', icon: 'wineglass.fill' },
  { id: 'pub', label: 'Pubs', icon: 'mug.fill' },
  { id: 'cocteleria', label: 'Coctelería', icon: 'wineglass' },
  { id: 'discoteca', label: 'Discotecas', icon: 'music.note' },
];

const CATEGORIAS_EXCLUIDAS = ['terrazas', 'rooftops', 'lounge'];
const LOCALES_POR_PAGINA = 20;
const HEADER_HEIGHT = Platform.OS === 'ios' ? 110 : 100;
const CATEGORIAS_HEIGHT = 140; // Increased to ensure full visibility of category icons

export default function ExplorarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode, setCurrentMode } = useMode();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const { locales: todosLosLocales, isInitialLoading, isRefreshing: globalRefreshing, refreshData } = useGlobalData();
  
  const [localesVisibles, setLocalesVisibles] = useState<Local[]>([]);
  const [paginaActual, setPaginaActual] = useState(1);
  
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todos');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtrosActivos, setFiltrosActivos] = useState<Filtros>({});
  const [cargandoMas, setCargandoMas] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activePromotions, setActivePromotions] = useState<Set<string>>(new Set());
  const [mostrarSelectorModo, setMostrarSelectorModo] = useState(false);
  
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('down');
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const categoriasTranslateY = useRef(new Animated.Value(0)).current;
  const isHeaderVisible = useRef(true);

  const userRole = user?.rol_app || 'cliente';
  const availableModes: ModoUsuario[] = 
    userRole === 'admin' ? ['cliente', 'propietario', 'admin'] :
    userRole === 'propietario' ? ['cliente', 'propietario'] :
    ['cliente'];

  useFocusEffect(
    useCallback(() => {
      console.log('[ExplorarScreen] ⚡ Screen focused');
      setMostrarFiltros(false);
      setMostrarSelectorModo(false);
      
      return () => {
        console.log('[ExplorarScreen] Screen unfocused');
      };
    }, [])
  );

  const localesFiltradosCompletos = useMemo(() => {
    console.log('[ExplorarScreen] ⚡ Applying filters...');

    const filtrosCombinados: Filtros = {
      ...filtrosActivos,
      busqueda: busqueda || undefined,
      tipo: categoriaSeleccionada !== 'todos' ? [categoriaSeleccionada] : filtrosActivos.tipo,
    };

    const localesOrdenados = filterAndSortLocals(
      todosLosLocales,
      filtrosCombinados,
      userLocation,
      activePromotions
    );

    console.log(`[ExplorarScreen] ⚡ Filtered locals: ${localesOrdenados.length}`);
    return localesOrdenados;
  }, [todosLosLocales, busqueda, categoriaSeleccionada, filtrosActivos, userLocation, activePromotions]);

  useEffect(() => {
    setPaginaActual(1);
    const newVisibleLocals = localesFiltradosCompletos.slice(0, LOCALES_POR_PAGINA);
    setLocalesVisibles(newVisibleLocals);
    
    const localIdsToPreload = newVisibleLocals.slice(0, 10).map(l => l.id);
    localPreloader.preloadMultiple(localIdsToPreload);
  }, [localesFiltradosCompletos]);

  useEffect(() => {
    obtenerUbicacionUsuario();
    cargarPromocionesActivas();
  }, []);

  const obtenerUbicacionUsuario = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[ExplorarScreen] Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
      console.log('[ExplorarScreen] 📍 User location obtained');
    } catch (error) {
      console.error('[ExplorarScreen] Error getting location:', error);
    }
  };

  const cargarPromocionesActivas = async () => {
    try {
      const { data, error } = await supabase
        .from('suscripciones_locales')
        .select('local_id, plan_id, planes_suscripcion(promos_destacadas)')
        .eq('estado', 'activa')
        .gt('planes_suscripcion.promos_destacadas', 0);

      if (error) {
        console.error('[ExplorarScreen] Error loading promotions:', error);
        return;
      }

      const promotedLocalIds = new Set(data?.map((s: any) => s.local_id) || []);
      setActivePromotions(promotedLocalIds);
      console.log('[ExplorarScreen] 💰 Active promotions loaded:', promotedLocalIds.size);
    } catch (error) {
      console.error('[ExplorarScreen] Error in cargarPromocionesActivas:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData(false);
    await cargarPromocionesActivas();
    setRefreshing(false);
  }, [refreshData]);

  const handleModoChange = (modo: ModoUsuario) => {
    console.log('[ExplorarScreen] Mode change:', modo);
    setCurrentMode(modo);
    setMostrarSelectorModo(false);
  };

  const cargarMasLocales = useCallback(() => {
    if (cargandoMas) return;

    const totalFiltrados = localesFiltradosCompletos.length;
    const totalVisibles = localesVisibles.length;

    if (totalVisibles >= totalFiltrados) {
      return;
    }

    setCargandoMas(true);

    const siguientePagina = paginaActual + 1;
    const inicio = 0;
    const fin = siguientePagina * LOCALES_POR_PAGINA;

    const nuevosLocalesVisibles = localesFiltradosCompletos.slice(inicio, fin);

    setLocalesVisibles(nuevosLocalesVisibles);
    setPaginaActual(siguientePagina);
    
    const startPreloadIndex = Math.max(0, nuevosLocalesVisibles.length - 10);
    const localIdsToPreload = nuevosLocalesVisibles.slice(startPreloadIndex).map(l => l.id);
    localPreloader.preloadMultiple(localIdsToPreload);
    
    setCargandoMas(false);
  }, [cargandoMas, localesFiltradosCompletos, localesVisibles, paginaActual]);

  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollDiff = currentScrollY - lastScrollY.current;

    if (scrollDiff > 0) {
      scrollDirection.current = 'down';
    } else if (scrollDiff < 0) {
      scrollDirection.current = 'up';
    }

    if (scrollDirection.current === 'down' && scrollDiff > 5 && currentScrollY > 50 && isHeaderVisible.current) {
      console.log('[ExplorarScreen] ⬇️ Hiding header and categories');
      isHeaderVisible.current = false;
      
      Animated.parallel([
        Animated.timing(headerTranslateY, {
          toValue: -HEADER_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(categoriasTranslateY, {
          toValue: -CATEGORIAS_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } 
    else if (scrollDirection.current === 'up' && scrollDiff < -10 && !isHeaderVisible.current) {
      console.log('[ExplorarScreen] ⬆️ Showing header and categories');
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

    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      cargarMasLocales();
    }
  };

  const getModoLabel = (modo: ModoUsuario): string => {
    switch (modo) {
      case 'cliente': return 'Cliente';
      case 'propietario': return 'Propietario';
      case 'admin': return 'Admin';
      default: return 'Cliente';
    }
  };

  const getModoIcon = (modo: ModoUsuario): any => {
    switch (modo) {
      case 'cliente': return 'person.fill';
      case 'propietario': return 'briefcase.fill';
      case 'admin': return 'gear';
      default: return 'person.fill';
    }
  };

  const hayMasLocalesParaMostrar = localesVisibles.length < localesFiltradosCompletos.length;

  if (isInitialLoading) {
    return <InitialLoadingScreen />;
  }

  return (
    <View style={commonStyles.container}>
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
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Explorar</Text>
            <View style={styles.headerActions}>
              {availableModes.length > 1 && (
                <TouchableOpacity
                  style={styles.modoButton}
                  onPress={() => setMostrarSelectorModo(true)}
                >
                  <IconSymbol name={getModoIcon(currentMode)} size={20} color={colors.headerText} />
                  <Text style={styles.modoButtonText}>{getModoLabel(currentMode)}</Text>
                  <IconSymbol name="chevron.down" size={16} color={colors.headerText} />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={styles.mapaButton}
                onPress={() => router.push('/explorar/mapa')}
              >
                <IconSymbol name="map.fill" size={24} color={colors.headerText} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar locales..."
              placeholderTextColor={colors.textSecondary}
              value={busqueda}
              onChangeText={setBusqueda}
            />
            <TouchableOpacity onPress={() => setMostrarFiltros(true)}>
              <IconSymbol name="line.3.horizontal.decrease.circle.fill" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View
        style={{
          position: 'absolute',
          top: HEADER_HEIGHT,
          left: 0,
          right: 0,
          zIndex: 99,
          backgroundColor: colors.background,
          transform: [{ translateY: categoriasTranslateY }],
        }}
      >
        <View style={styles.categoriasContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriasScroll}
          >
            {CATEGORIAS_LOCALES.map((categoria) => (
              <TouchableOpacity
                key={categoria.id}
                style={styles.categoriaButton}
                onPress={() => setCategoriaSeleccionada(categoria.id)}
              >
                <View
                  style={[
                    styles.categoriaIconContainer,
                    categoriaSeleccionada === categoria.id && styles.categoriaIconContainerActive,
                  ]}
                >
                  <IconSymbol name={categoria.icon as any} size={28} color={colors.primary} />
                </View>
                <Text
                  style={[
                    styles.categoriaLabel,
                    categoriaSeleccionada === categoria.id && styles.categoriaLabelActive,
                  ]}
                >
                  {categoria.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Animated.View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: HEADER_HEIGHT + CATEGORIAS_HEIGHT + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing || globalRefreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.primary}
            progressViewOffset={HEADER_HEIGHT + CATEGORIAS_HEIGHT}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {localesVisibles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol name="mappin.slash" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No se encontraron locales</Text>
            <Text style={styles.emptySubtext}>Intenta ajustar los filtros de búsqueda</Text>
          </View>
        ) : (
          <>
            {localesVisibles.map((local) => (
              <TarjetaLocal
                key={local.id}
                local={local}
                destacado={local.destacado}
                userLocation={userLocation}
              />
            ))}
            {hayMasLocalesParaMostrar && (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingMoreText}>
                  Mostrando {localesVisibles.length} de {localesFiltradosCompletos.length}
                </Text>
              </View>
            )}
            {!hayMasLocalesParaMostrar && localesVisibles.length > 0 && (
              <View style={styles.endContainer}>
                <Text style={styles.endText}>
                  ✅ Mostrando todos los locales ({localesVisibles.length})
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={mostrarSelectorModo}
        transparent
        animationType="fade"
        onRequestClose={() => setMostrarSelectorModo(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMostrarSelectorModo(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cambiar modo de usuario</Text>
            <Text style={styles.modalSubtitle}>Selecciona cómo quieres usar BarLive</Text>
            
            {availableModes.map((modo) => (
              <TouchableOpacity
                key={modo}
                style={[
                  styles.modoOption,
                  currentMode === modo && styles.modoOptionActive,
                ]}
                onPress={() => handleModoChange(modo)}
              >
                <View style={styles.modoOptionLeft}>
                  <View style={[
                    styles.modoOptionIcon,
                    currentMode === modo && styles.modoOptionIconActive,
                  ]}>
                    <IconSymbol 
                      name={getModoIcon(modo)} 
                      size={24} 
                      color={currentMode === modo ? colors.headerText : colors.primary} 
                    />
                  </View>
                  <View>
                    <Text style={[
                      styles.modoOptionLabel,
                      currentMode === modo && styles.modoOptionLabelActive,
                    ]}>
                      {getModoLabel(modo)}
                    </Text>
                    <Text style={styles.modoOptionDescription}>
                      {modo === 'cliente' && 'Explora locales y eventos'}
                      {modo === 'propietario' && 'Gestiona tus locales'}
                      {modo === 'admin' && 'Administra la plataforma'}
                    </Text>
                  </View>
                </View>
                {currentMode === modo && (
                  <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <FiltrosAvanzadosSheet
        visible={mostrarFiltros}
        onClose={() => setMostrarFiltros(false)}
        filtros={filtrosActivos}
        onAplicarFiltros={(filtros) => {
          setFiltrosActivos(filtros);
          setMostrarFiltros(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerContent: {
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  modoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
  },
  mapaButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.headerText,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  categoriasContainer: {
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  categoriasScroll: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
  },
  categoriaButton: {
    alignItems: 'center',
    gap: 8,
    minWidth: 70,
  },
  categoriaIconContainer: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  categoriaIconContainerActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  categoriaLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  categoriaLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  endContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  endText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  modoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  modoOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  modoOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modoOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modoOptionIconActive: {
    backgroundColor: colors.primary,
  },
  modoOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  modoOptionLabelActive: {
    color: colors.primary,
  },
  modoOptionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
