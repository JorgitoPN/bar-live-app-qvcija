
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
import { useGlobalData } from '@/contexts/GlobalDataContext';
import InitialLoadingScreen from '@/components/common/InitialLoadingScreen';
import { trackSearchAppearance } from '@/utils/activityTracker';
import { shouldHavePubCategory } from '@/utils/categorizeLocal';

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

const LOCALES_POR_PAGINA = 20;
const HEADER_HEIGHT = Platform.OS === 'ios' ? 110 : 100;
const CATEGORIAS_HEIGHT = 110;
const CATEGORIAS_TOP_POSITION = 170;
const SPACING_BETWEEN_FILTERS_AND_LIST = 24;

// ✅ MAXIMUM DISTANCE FOR FEATURED LOCALS (in km)
const MAX_FEATURED_DISTANCE_KM = 100;

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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

  // ✅ FIXED: Apply category filter with dynamic PUB category support AND USER REQUESTED SORTING
  const localesFiltradosCompletos = useMemo(() => {
    console.log('[ExplorarScreen] ⚡ Applying filters...');
    console.log('[ExplorarScreen] 📊 Total locales:', todosLosLocales.length);
    console.log('[ExplorarScreen] 🔍 Selected category:', categoriaSeleccionada);

    // ✅ CRITICAL FIX: Filter by activo = true to match map behavior
    let localesFiltrados = todosLosLocales.filter(local => local.activo === true);
    console.log('[ExplorarScreen] ✅ After activo filter:', localesFiltrados.length);

    // ✅ FIXED: Apply category filter with dynamic PUB category support
    if (categoriaSeleccionada !== 'todos') {
      console.log('[ExplorarScreen] 🔍 Filtering by category:', categoriaSeleccionada);
      
      localesFiltrados = localesFiltrados.filter(local => {
        // Get barlive_types array
        const barliveTypes = local.barlive_types || [];
        
        // ✅ CRITICAL FIX: For "pub" category, check if venue should have pub category based on closing time
        if (categoriaSeleccionada === 'pub') {
          // Check if venue already has "pub" in barlive_types
          const hasPubInTypes = barliveTypes.includes('pub');
          
          // Check if venue should have pub category based on closing time (closes after 2:30 AM)
          const shouldBePub = shouldHavePubCategory(local.horarios_completos);
          
          console.log(`[ExplorarScreen] 🍺 Checking "${local.nombre}":`, {
            barliveTypes,
            hasPubInTypes,
            shouldBePub,
            horarios: local.horarios_completos,
          });
          
          // Include venue if it has "pub" in types OR if it should be categorized as pub based on closing time
          return hasPubInTypes || shouldBePub;
        }
        
        // ✅ FIXED: For "discoteca" category, only show locales with "discoteca" or "sala_conciertos"
        if (categoriaSeleccionada === 'discoteca') {
          const hasDiscoteca = barliveTypes.includes('discoteca') || barliveTypes.includes('sala_conciertos');
          console.log(`[ExplorarScreen] 💃 Checking "${local.nombre}":`, {
            barliveTypes,
            hasDiscoteca,
          });
          return hasDiscoteca;
        }
        
        // For other categories, check if the category is in barlive_types
        const hasCategory = barliveTypes.includes(categoriaSeleccionada);
        return hasCategory;
      });

      console.log(`[ExplorarScreen] ✅ After category filter: ${localesFiltrados.length} locales`);
    }

    // Apply search filter
    if (busqueda) {
      const searchLower = busqueda.toLowerCase();
      localesFiltrados = localesFiltrados.filter(local =>
        local.nombre.toLowerCase().includes(searchLower) ||
        local.direccion?.toLowerCase().includes(searchLower) ||
        local.provincia?.toLowerCase().includes(searchLower)
      );
      console.log(`[ExplorarScreen] 🔍 After search filter: ${localesFiltrados.length} locales`);
    }

    // ✅ USER REQUESTED SORTING ALGORITHM
    if (userLocation) {
      console.log('[ExplorarScreen] 📍 User location:', userLocation);
      
      // Calculate distance for all locals
      localesFiltrados = localesFiltrados.map(local => {
        if (local.latitud && local.longitud) {
          const distancia = calcularDistancia(
            userLocation.lat,
            userLocation.lng,
            parseFloat(local.latitud.toString()),
            parseFloat(local.longitud.toString())
          );
          return { ...local, distancia };
        }
        return { ...local, distancia: 999999 }; // Very high distance for locals without coordinates
      });

      console.log('[ExplorarScreen] 🧠 Applying USER REQUESTED sorting algorithm...');
      console.log('[ExplorarScreen] 📋 CORRECT ORDER (USER REQUESTED):');
      console.log('[ExplorarScreen]    1. Group A (≤100km) - FEATURED sorted by distance');
      console.log('[ExplorarScreen]    2. Group A (≤100km) - NON-FEATURED sorted by distance');
      console.log('[ExplorarScreen]    3. Group B (>100km) - NON-FEATURED sorted by distance');
      console.log('[ExplorarScreen]    4. Group B (>100km) - FEATURED sorted by distance');

      // 🧠 USER REQUESTED ALGORITHM
      // groupA = locales with distance <= 100km
      const groupA = localesFiltrados.filter(l => 
        l.distancia !== undefined && l.distancia <= MAX_FEATURED_DISTANCE_KM
      );
      
      // groupB = locales with distance > 100km
      const groupB = localesFiltrados.filter(l => 
        l.distancia !== undefined && l.distancia > MAX_FEATURED_DISTANCE_KM
      );

      console.log('[ExplorarScreen] 📊 Groups created:');
      console.log('  - Group A (≤100km):', groupA.length, 'locals');
      console.log('  - Group B (>100km):', groupB.length, 'locals');

      // ✅ USER REQUESTED ORDER: Group A FEATURED first, then NON-FEATURED
      const groupA_destacados = groupA
        .filter(l => l.destacado === true || activePromotions.has(l.id))
        .sort((a, b) => (a.distancia || 999999) - (b.distancia || 999999));

      const groupA_no_destacados = groupA
        .filter(l => l.destacado !== true && !activePromotions.has(l.id))
        .sort((a, b) => (a.distancia || 999999) - (b.distancia || 999999));

      // Group B NON-FEATURED first, then FEATURED
      const groupB_no_destacados = groupB
        .filter(l => l.destacado !== true && !activePromotions.has(l.id))
        .sort((a, b) => (a.distancia || 999999) - (b.distancia || 999999));

      const groupB_destacados = groupB
        .filter(l => l.destacado === true || activePromotions.has(l.id))
        .sort((a, b) => (a.distancia || 999999) - (b.distancia || 999999));

      console.log('[ExplorarScreen] 📊 Sub-groups created (USER REQUESTED ORDER):');
      console.log('  1. Group A Featured (≤100km, destacado=true):', groupA_destacados.length);
      console.log('  2. Group A Non-Featured (≤100km, destacado=false):', groupA_no_destacados.length);
      console.log('  3. Group B Non-Featured (>100km, destacado=false):', groupB_no_destacados.length);
      console.log('  4. Group B Featured (>100km, destacado=true):', groupB_destacados.length);

      // ✅ USER REQUESTED FINAL ORDER
      localesFiltrados = [
        ...groupA_destacados,          // 1. Nearby featured
        ...groupA_no_destacados,       // 2. Nearby non-featured
        ...groupB_no_destacados,       // 3. Distant non-featured
        ...groupB_destacados,          // 4. Distant featured (Casa Paco should be here)
      ];

      console.log('[ExplorarScreen] ✅ USER REQUESTED SORTING APPLIED - Total locals:', localesFiltrados.length);
      console.log('[ExplorarScreen] 🔝 First 20 locals in final list:');
      localesFiltrados.slice(0, 20).forEach((l, i) => {
        const group = l.distancia! <= MAX_FEATURED_DISTANCE_KM ? 'A' : 'B';
        const featured = (l.destacado || activePromotions.has(l.id)) ? '⭐ DESTACADO' : '   NORMAL   ';
        console.log(`  ${String(i + 1).padStart(2, '0')}. [Group ${group}] ${featured} | ${l.nombre}`);
        console.log(`      📍 Distancia: ${l.distancia?.toFixed(1)}km | 📌 Dirección: ${l.direccion}`);
      });

      // 📌 CRITICAL VERIFICATION: Find Casa Paco position
      const casaPacoIndex = localesFiltrados.findIndex(l => 
        l.nombre.toLowerCase().includes('casa paco') || 
        l.direccion?.toLowerCase().includes('rincón de san nicolás')
      );
      
      if (casaPacoIndex !== -1) {
        const casaPaco = localesFiltrados[casaPacoIndex];
        const expectedGroup = casaPaco.distancia! > MAX_FEATURED_DISTANCE_KM ? 'B' : 'A';
        const expectedSubgroup = (casaPaco.destacado || activePromotions.has(casaPaco.id)) ? 'Featured' : 'Non-Featured';
        
        console.log('[ExplorarScreen] 📌 ========================================');
        console.log('[ExplorarScreen] 📌 CASA PACO VERIFICATION:');
        console.log('[ExplorarScreen] 📌 ========================================');
        console.log(`[ExplorarScreen] 📌 Position in list: #${casaPacoIndex + 1} of ${localesFiltrados.length}`);
        console.log(`[ExplorarScreen] 📌 Name: ${casaPaco.nombre}`);
        console.log(`[ExplorarScreen] 📌 Address: ${casaPaco.direccion}`);
        console.log(`[ExplorarScreen] 📌 Featured: ${casaPaco.destacado || activePromotions.has(casaPaco.id)}`);
        console.log(`[ExplorarScreen] 📌 Distance: ${casaPaco.distancia?.toFixed(1)}km`);
        console.log(`[ExplorarScreen] 📌 Expected Group: ${expectedGroup} (${expectedSubgroup})`);
        console.log(`[ExplorarScreen] 📌 Expected Position: LAST BLOCK (Group B Featured)`);
        
        // Count how many locals should be before Casa Paco
        const expectedPosition = groupA_destacados.length + groupA_no_destacados.length + groupB_no_destacados.length;
        
        console.log(`[ExplorarScreen] 📌 Expected minimum position: #${expectedPosition + 1}`);
        console.log(`[ExplorarScreen] 📌 Actual position: #${casaPacoIndex + 1}`);
        
        if (casaPacoIndex < expectedPosition) {
          console.error('[ExplorarScreen] ❌❌❌ CRITICAL ERROR: Casa Paco is NOT in the correct position!');
          console.error(`[ExplorarScreen] ❌ It should be at position #${expectedPosition + 1} or later, but it's at #${casaPacoIndex + 1}`);
        } else {
          console.log('[ExplorarScreen] ✅✅✅ Casa Paco is CORRECTLY positioned in the last block (Group B Featured)');
        }
        console.log('[ExplorarScreen] 📌 ========================================');
      } else {
        console.log('[ExplorarScreen] ℹ️ Casa Paco not found in current results');
      }
    } else {
      console.log('[ExplorarScreen] ⚠️ No user location available, sorting by destacado and rating only');
      
      localesFiltrados.sort((a, b) => {
        const aDestacado = a.destacado || activePromotions.has(a.id);
        const bDestacado = b.destacado || activePromotions.has(b.id);
        
        if (aDestacado !== bDestacado) {
          return aDestacado ? -1 : 1;
        }
        const ratingA = parseFloat((a.rating || a.google_rating || 0).toString());
        const ratingB = parseFloat((b.rating || b.google_rating || 0).toString());
        return ratingB - ratingA;
      });
    }

    console.log(`[ExplorarScreen] ⚡ Final filtered and sorted locals: ${localesFiltrados.length}`);
    return localesFiltrados;
  }, [todosLosLocales, busqueda, categoriaSeleccionada, filtrosActivos, userLocation, activePromotions]);

  useEffect(() => {
    setPaginaActual(1);
    const newVisibleLocals = localesFiltradosCompletos.slice(0, LOCALES_POR_PAGINA);
    setLocalesVisibles(newVisibleLocals);
    
    const localIdsToPreload = newVisibleLocals.slice(0, 10).map(l => l.id);
    localPreloader.preloadMultiple(localIdsToPreload);

    // Track search appearances for visible locals
    if (busqueda && newVisibleLocals.length > 0) {
      newVisibleLocals.forEach((local, index) => {
        trackSearchAppearance(local.id, busqueda, index + 1, false, user?.id);
      });
    }
  }, [localesFiltradosCompletos, busqueda, user]);

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
      console.log('[ExplorarScreen] 🔄 Loading active promotions...');
      
      // FIXED: Use a simpler query approach - first get active subscriptions
      const { data: suscripciones, error: subsError } = await supabase
        .from('suscripciones_locales')
        .select('local_id, plan_id')
        .eq('estado', 'activa');

      if (subsError) {
        console.error('[ExplorarScreen] Error loading subscriptions:', subsError);
        return;
      }

      if (!suscripciones || suscripciones.length === 0) {
        console.log('[ExplorarScreen] No active subscriptions found');
        setActivePromotions(new Set());
        return;
      }

      // Get the plan IDs
      const planIds = [...new Set(suscripciones.map(s => s.plan_id))];
      
      // FIXED: Now get the plans with promotions
      const { data: planes, error: planesError } = await supabase
        .from('planes_suscripcion')
        .select('id, promos_destacadas')
        .in('id', planIds)
        .gt('promos_destacadas', 0);

      if (planesError) {
        console.error('[ExplorarScreen] Error loading plans:', planesError);
        return;
      }

      if (!planes || planes.length === 0) {
        console.log('[ExplorarScreen] No plans with promotions found');
        setActivePromotions(new Set());
        return;
      }

      // Create a set of plan IDs that have promotions
      const planIdsWithPromos = new Set(planes.map(p => p.id));

      // Filter subscriptions to only those with promotional plans
      const promotedLocalIds = new Set(
        suscripciones
          .filter(s => planIdsWithPromos.has(s.plan_id))
          .map(s => s.local_id)
      );

      setActivePromotions(promotedLocalIds);
      console.log('[ExplorarScreen] 💰 Active promotions loaded:', promotedLocalIds.size);
    } catch (error) {
      console.error('[ExplorarScreen] Error in cargarPromocionesActivas:', error);
      setActivePromotions(new Set());
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
          toValue: -(CATEGORIAS_TOP_POSITION + CATEGORIAS_HEIGHT),
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

  const handleClaimOrCreateLocal = () => {
    router.push('/auth/local-ownership-request' as any);
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
                style={styles.headerIconButton}
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
          top: CATEGORIAS_TOP_POSITION,
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
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingTop: CATEGORIAS_TOP_POSITION + CATEGORIAS_HEIGHT + SPACING_BETWEEN_FILTERS_AND_LIST }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing || globalRefreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.primary}
            progressViewOffset={CATEGORIAS_TOP_POSITION + CATEGORIAS_HEIGHT + SPACING_BETWEEN_FILTERS_AND_LIST}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* ✅ CLAIM OR CREATE LOCAL SECTION - COMPACT SINGLE LINE DESIGN */}
        <TouchableOpacity 
          style={styles.claimLocalBanner}
          onPress={handleClaimOrCreateLocal}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[colors.primary + '20', colors.primary + '10']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.claimLocalGradient}
          >
            <View style={styles.claimLocalContent}>
              <View style={styles.claimLocalIconContainer}>
                <IconSymbol 
                  name="building.2.fill" 
                  size={22} 
                  color={colors.primary} 
                />
              </View>
              <View style={styles.claimLocalTextContainer}>
                <Text style={styles.claimLocalTitle} numberOfLines={1} ellipsizeMode="tail">
                  Reclama tu local o crea uno nuevo
                </Text>
                <Text style={styles.claimLocalSubtitle} numberOfLines={1} ellipsizeMode="tail">
                  ¿Eres propietario? Gestiona tu local en BarLive
                </Text>
              </View>
              <View style={styles.claimLocalArrow}>
                <IconSymbol 
                  name="chevron.right" 
                  size={18} 
                  color={colors.primary} 
                />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

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
                destacado={local.destacado || activePromotions.has(local.id)}
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
  headerIconButton: {
    padding: 8,
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  categoriasScroll: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  categoriaButton: {
    alignItems: 'center',
    gap: 6,
    minWidth: 70,
  },
  categoriaIconContainer: {
    width: 56,
    height: 56,
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
    fontSize: 12,
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
  claimLocalBanner: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  claimLocalGradient: {
    borderWidth: 1.5,
    borderColor: colors.primary + '30',
    borderRadius: 12,
  },
  claimLocalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  claimLocalIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary + '30',
  },
  claimLocalTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  claimLocalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  claimLocalSubtitle: {
    fontSize: 11.5,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  claimLocalArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
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
