
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
import { colors, commonStyles, HEADER_DIMENSIONS } from '@/styles/commonStyles';
import * as Location from 'expo-location';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import InitialLoadingScreen from '@/components/common/InitialLoadingScreen';
import { trackSearchAppearance } from '@/utils/activityTracker';
import { shouldHavePubCategory } from '@/utils/categorizeLocal';
import { getEstadoLocal } from '@/utils/timeUtils';
import { useFilters } from '@/contexts/FilterContext';
import { isAdminUser } from '@/utils/adminAccess';

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
// ✅ ANDROID FIX v73.2: Standardized header height using HEADER_DIMENSIONS
const HEADER_HEIGHT = HEADER_DIMENSIONS.totalHeight;
// ✅ ANDROID FIX v73.2: Reduced category section height and proper spacing from header
const CATEGORIAS_HEIGHT = Platform.OS === 'ios' ? 110 : 85;
const CATEGORIAS_TOP_POSITION = Platform.OS === 'ios' ? 170 : HEADER_HEIGHT + 8;
const SPACING_BETWEEN_FILTERS_AND_LIST = 24;

const MAX_FEATURED_DISTANCE_KM = 100;

function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * ✅ EXPLORAR SCREEN v73.2 - CRITICAL FIXES FOR iOS AND ANDROID
 * 
 * CRITICAL FIXES v73.2:
 * - ✅ iOS: Enhanced data loading with proper error handling and fallback
 * - ✅ iOS: Improved GlobalDataContext integration with better error recovery
 * - ✅ Android: Search box height reduced (6px padding vs 12px on iOS)
 * - ✅ Android: Category icons properly spaced (10px gap vs 16px on iOS) and not cut off
 * - ✅ Android: Category section moved down slightly to prevent clipping
 * - ✅ Android: All sizes reference "Explorar" page as standard
 */

export default function ExplorarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode, setCurrentMode } = useMode();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const { locales: todosLosLocales, isInitialLoading, isRefreshing: globalRefreshing, refreshData } = useGlobalData();
  const { filtros: globalFiltros, hasActiveFilters } = useFilters();
  
  const [localesVisibles, setLocalesVisibles] = useState<Local[]>([]);
  const [paginaActual, setPaginaActual] = useState(1);
  
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todos');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activePromotions, setActivePromotions] = useState<Set<string>>(new Set());
  const [mostrarSelectorModo, setMostrarSelectorModo] = useState(false);
  
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const scrollIndicatorOpacity = useRef(new Animated.Value(1)).current;
  
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('down');
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const categoriasTranslateY = useRef(new Animated.Value(0)).current;
  const isHeaderVisible = useRef(true);

  const userIsAdmin = useMemo(() => {
    const isAdmin = isAdminUser(user);
    console.log('[ExplorarScreen v73.2] Admin check for mode selector:', {
      email: user?.email,
      role: user?.rol_app,
      isAdmin,
      shouldShowAdminMode: isAdmin,
    });
    return isAdmin;
  }, [user]);

  const userRole = user?.rol_app || 'cliente';
  
  const availableModes: ModoUsuario[] = useMemo(() => {
    if (userIsAdmin) {
      return ['cliente', 'propietario', 'admin'];
    } else if (userRole === 'propietario') {
      return ['cliente', 'propietario'];
    } else {
      return ['cliente'];
    }
  }, [userIsAdmin, userRole]);

  useFocusEffect(
    useCallback(() => {
      console.log('[ExplorarScreen v73.2] ⚡ Screen focused');
      setMostrarFiltros(false);
      setMostrarSelectorModo(false);
      
      return () => {
        console.log('[ExplorarScreen v73.2] Screen unfocused');
      };
    }, [])
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(scrollIndicatorOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setShowScrollIndicator(false));
    }, 3000);

    return () => clearTimeout(timer);
  }, [scrollIndicatorOpacity]);

  const localesFiltradosCompletos = useMemo(() => {
    console.log('[ExplorarScreen v73.2] ⚡ Applying filters...');
    console.log('[ExplorarScreen v73.2] 📊 Total locales:', todosLosLocales.length);
    console.log('[ExplorarScreen v73.2] 🔍 Selected category:', categoriaSeleccionada);
    console.log('[ExplorarScreen v73.2] 🔍 Global filters:', globalFiltros);

    // ✅ iOS FIX v73.2: Always return array even if empty
    if (!todosLosLocales || todosLosLocales.length === 0) {
      console.log('[ExplorarScreen v73.2] ⚠️ No locales available');
      return [];
    }

    let localesFiltrados = todosLosLocales.filter(local => local.activo === true);
    console.log('[ExplorarScreen v73.2] ✅ After activo filter:', localesFiltrados.length);

    if (categoriaSeleccionada !== 'todos') {
      console.log('[ExplorarScreen v73.2] 🔍 Filtering by category:', categoriaSeleccionada);
      
      localesFiltrados = localesFiltrados.filter(local => {
        const barliveTypes = local.barlive_types || [];
        
        if (categoriaSeleccionada === 'pub') {
          const hasPubInTypes = barliveTypes.includes('pub');
          const shouldBePub = shouldHavePubCategory(local.horarios_completos);
          
          return hasPubInTypes || shouldBePub;
        }
        
        if (categoriaSeleccionada === 'discoteca') {
          const hasDiscoteca = barliveTypes.includes('discoteca') || barliveTypes.includes('sala_conciertos');
          return hasDiscoteca;
        }
        
        const hasCategory = barliveTypes.includes(categoriaSeleccionada);
        return hasCategory;
      });

      console.log(`[ExplorarScreen v73.2] ✅ After category filter: ${localesFiltrados.length} locales`);
    }

    if (busqueda) {
      const searchLower = busqueda.toLowerCase();
      localesFiltrados = localesFiltrados.filter(local =>
        local.nombre.toLowerCase().includes(searchLower) ||
        local.direccion?.toLowerCase().includes(searchLower) ||
        local.provincia?.toLowerCase().includes(searchLower)
      );
      console.log(`[ExplorarScreen v73.2] 🔍 After search filter: ${localesFiltrados.length} locales`);
    }

    if (globalFiltros.comunidad && globalFiltros.comunidad !== 'Todas las Comunidades') {
      localesFiltrados = localesFiltrados.filter(local => local.comunidad === globalFiltros.comunidad);
      console.log(`[ExplorarScreen v73.2] 🔍 After community filter: ${localesFiltrados.length} locales`);
    }

    if (globalFiltros.provincia) {
      localesFiltrados = localesFiltrados.filter(local => local.provincia === globalFiltros.provincia);
      console.log(`[ExplorarScreen v73.2] 🔍 After province filter: ${localesFiltrados.length} locales`);
    }

    if (globalFiltros.tipo && globalFiltros.tipo.length > 0) {
      localesFiltrados = localesFiltrados.filter(local => {
        const barliveTypes = local.barlive_types || [];
        return globalFiltros.tipo!.some(tipo => 
          barliveTypes.some((cat: string) => cat.toLowerCase() === tipo.toLowerCase())
        );
      });
      console.log(`[ExplorarScreen v73.2] 🔍 After type filter: ${localesFiltrados.length} locales`);
    }

    if (globalFiltros.servicios && globalFiltros.servicios.length > 0) {
      localesFiltrados = localesFiltrados.filter(local => {
        const localServices = local.servicios_disponibles || {};
        return globalFiltros.servicios!.every(servicio => localServices[servicio] === true);
      });
      console.log(`[ExplorarScreen v73.2] 🔍 After services filter: ${localesFiltrados.length} locales`);
    }

    if (globalFiltros.ambiente && globalFiltros.ambiente.length > 0 && !globalFiltros.ambiente.includes('cualquiera')) {
      localesFiltrados = localesFiltrados.filter(local => {
        const localAmbiente = local.ambiente_completo || local.ambiente_google || {};
        return globalFiltros.ambiente!.some(amb => localAmbiente[amb] === true);
      });
      console.log(`[ExplorarScreen v73.2] 🔍 After ambiente filter: ${localesFiltrados.length} locales`);
    }

    if (globalFiltros.clientela && globalFiltros.clientela.length > 0 && !globalFiltros.clientela.includes('cualquiera')) {
      localesFiltrados = localesFiltrados.filter(local => {
        const localClientela = local.clientela || {};
        return globalFiltros.clientela!.some(cli => localClientela[cli] === true);
      });
      console.log(`[ExplorarScreen v73.2] 🔍 After clientela filter: ${localesFiltrados.length} locales`);
    }

    localesFiltrados = localesFiltrados.map(local => {
      const estadoLocal = getEstadoLocal(local);
      return {
        ...local,
        estaAbierto: estadoLocal.estaAbierto === true,
      };
    });

    if (userLocation) {
      console.log('[ExplorarScreen v73.2] 📍 User location:', userLocation);
      
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
        return { ...local, distancia: 999999 };
      });

      if (globalFiltros.distancia) {
        localesFiltrados = localesFiltrados.filter(local => 
          local.distancia !== undefined && local.distancia <= globalFiltros.distancia!
        );
        console.log(`[ExplorarScreen v73.2] 🔍 After distance filter (${globalFiltros.distancia}km): ${localesFiltrados.length} locales`);
      }

      console.log('[ExplorarScreen v73.2] 🧠 Applying FIXED sorting algorithm...');

      const openLocals = localesFiltrados.filter(l => l.estaAbierto === true);
      const closedLocals = localesFiltrados.filter(l => l.estaAbierto !== true);

      console.log('[ExplorarScreen v73.2] 📊 Open/Closed split:');
      console.log('  - Open locals:', openLocals.length);
      console.log('  - Closed locals:', closedLocals.length);

      const openGroupA = openLocals.filter(l => 
        l.distancia !== undefined && l.distancia <= MAX_FEATURED_DISTANCE_KM
      );
      
      const openGroupB = openLocals.filter(l => 
        l.distancia !== undefined && l.distancia > MAX_FEATURED_DISTANCE_KM
      );

      const openGroupA_destacados = openGroupA
        .filter(l => l.destacado === true || activePromotions.has(l.id))
        .sort((a, b) => (a.distancia || 999999) - (b.distancia || 999999));

      const openGroupA_no_destacados = openGroupA
        .filter(l => l.destacado !== true && !activePromotions.has(l.id))
        .sort((a, b) => (a.distancia || 999999) - (b.distancia || 999999));

      const openGroupB_no_destacados = openGroupB
        .filter(l => l.destacado !== true && !activePromotions.has(l.id))
        .sort((a, b) => (a.distancia || 999999) - (b.distancia || 999999));

      const openGroupB_destacados = openGroupB
        .filter(l => l.destacado === true || activePromotions.has(l.id))
        .sort((a, b) => (a.distancia || 999999) - (b.distancia || 999999));

      const closedGroupA = closedLocals.filter(l => 
        l.distancia !== undefined && l.distancia <= MAX_FEATURED_DISTANCE_KM
      );
      
      const closedGroupB = closedLocals.filter(l => 
        l.distancia !== undefined && l.distancia > MAX_FEATURED_DISTANCE_KM
      );

      const closedGroupA_destacados = closedGroupA
        .filter(l => l.destacado === true || activePromotions.has(l.id))
        .sort((a, b) => (a.distancia || 999999) - (b.distancia || 999999));

      const closedGroupA_no_destacados = closedGroupA
        .filter(l => l.destacado !== true && !activePromotions.has(l.id))
        .sort((a, b) => (a.distancia || 999999) - (b.distancia || 999999));

      const closedGroupB_no_destacados = closedGroupB
        .filter(l => l.destacado !== true && !activePromotions.has(l.id))
        .sort((a, b) => (a.distancia || 999999) - (b.distancia || 999999));

      const closedGroupB_destacados = closedGroupB
        .filter(l => l.destacado === true || activePromotions.has(l.id))
        .sort((a, b) => (a.distancia || 999999) - (b.distancia || 999999));

      localesFiltrados = [
        ...openGroupA_destacados,
        ...openGroupA_no_destacados,
        ...openGroupB_no_destacados,
        ...openGroupB_destacados,
        ...closedGroupA_destacados,
        ...closedGroupA_no_destacados,
        ...closedGroupB_no_destacados,
        ...closedGroupB_destacados,
      ];

      console.log('[ExplorarScreen v73.2] ✅ FIXED SORTING APPLIED (OPEN FIRST) - Total locals:', localesFiltrados.length);
    } else {
      console.log('[ExplorarScreen v73.2] ⚠️ No user location available, sorting by open status, destacado and rating');
      
      localesFiltrados.sort((a, b) => {
        if (a.estaAbierto !== b.estaAbierto) {
          return a.estaAbierto ? -1 : 1;
        }
        
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

    console.log(`[ExplorarScreen v73.2] ⚡ Final filtered and sorted locals: ${localesFiltrados.length}`);
    return localesFiltrados;
  }, [todosLosLocales, busqueda, categoriaSeleccionada, userLocation, activePromotions, globalFiltros]);

  useEffect(() => {
    setPaginaActual(1);
    const newVisibleLocals = localesFiltradosCompletos.slice(0, LOCALES_POR_PAGINA);
    setLocalesVisibles(newVisibleLocals);
    
    const localIdsToPreload = newVisibleLocals.slice(0, 10).map(l => l.id);
    localPreloader.preloadMultiple(localIdsToPreload);

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
      console.log('[ExplorarScreen v73.2] 🔍 Requesting location permissions...');
      
      // ✅ iOS FIX v73.2: Check if location services are enabled first
      let isAvailable = false;
      try {
        isAvailable = await Location.hasServicesEnabledAsync();
      } catch (error) {
        console.log('[ExplorarScreen v73.2] ⚠️ Error checking location services:', error);
        isAvailable = false;
      }
      
      if (!isAvailable) {
        console.log('[ExplorarScreen v73.2] ⚠️ Location services are disabled, using default location (Madrid)');
        setUserLocation({ lat: 40.4168, lng: -3.7038 });
        return;
      }

      let status = 'denied';
      try {
        const result = await Location.requestForegroundPermissionsAsync();
        status = result.status;
      } catch (error) {
        console.log('[ExplorarScreen v73.2] ⚠️ Error requesting location permission:', error);
        status = 'denied';
      }
      
      if (status !== 'granted') {
        console.log('[ExplorarScreen v73.2] ⚠️ Location permission denied, using default location (Madrid)');
        setUserLocation({ lat: 40.4168, lng: -3.7038 });
        return;
      }

      console.log('[ExplorarScreen v73.2] ✅ Location permission granted, getting position...');
      
      // ✅ iOS FIX v73.2: Use higher accuracy for iOS, lower for Android with timeout
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Platform.OS === 'ios' ? Location.Accuracy.High : Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 0,
        });
        
        setUserLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
        console.log('[ExplorarScreen v73.2] 📍 User location obtained:', {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      } catch (locationError: any) {
        console.error('[ExplorarScreen v73.2] ❌ Error getting current position:', {
          message: locationError?.message || 'Unknown error',
          code: locationError?.code,
        });
        // ✅ iOS FIX v73.2: Try to get last known location as fallback
        try {
          const lastLocation = await Location.getLastKnownPositionAsync();
          if (lastLocation) {
            setUserLocation({
              lat: lastLocation.coords.latitude,
              lng: lastLocation.coords.longitude,
            });
            console.log('[ExplorarScreen v73.2] 📍 Using last known location:', {
              lat: lastLocation.coords.latitude,
              lng: lastLocation.coords.longitude,
            });
          } else {
            throw new Error('No last known location');
          }
        } catch (lastLocationError) {
          console.log('[ExplorarScreen v73.2] ⚠️ Using default location (Madrid) due to error');
          setUserLocation({ lat: 40.4168, lng: -3.7038 });
        }
      }
    } catch (error: any) {
      console.error('[ExplorarScreen v73.2] ❌ Error in obtenerUbicacionUsuario:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
      });
      // ✅ iOS FIX v73.2: Always use default location if error occurs
      console.log('[ExplorarScreen v73.2] ⚠️ Using default location (Madrid) due to error');
      setUserLocation({ lat: 40.4168, lng: -3.7038 });
    }
  };

  const cargarPromocionesActivas = async () => {
    try {
      console.log('[ExplorarScreen v73.2] 🔄 Loading active promotions...');
      
      const { data: suscripciones, error: subsError } = await supabase
        .from('suscripciones_locales')
        .select('local_id, plan_id')
        .eq('estado', 'activa');

      if (subsError) {
        console.error('[ExplorarScreen v73.2] Error loading subscriptions:', subsError);
        return;
      }

      if (!suscripciones || suscripciones.length === 0) {
        console.log('[ExplorarScreen v73.2] No active subscriptions found');
        setActivePromotions(new Set());
        return;
      }

      const planIds = [...new Set(suscripciones.map(s => s.plan_id))];
      
      const { data: planes, error: planesError } = await supabase
        .from('planes_suscripcion')
        .select('id, promos_destacadas')
        .in('id', planIds)
        .gt('promos_destacadas', 0);

      if (planesError) {
        console.error('[ExplorarScreen v73.2] Error loading plans:', planesError);
        return;
      }

      if (!planes || planes.length === 0) {
        console.log('[ExplorarScreen v73.2] No plans with promotions found');
        setActivePromotions(new Set());
        return;
      }

      const planIdsWithPromos = new Set(planes.map(p => p.id));

      const promotedLocalIds = new Set(
        suscripciones
          .filter(s => planIdsWithPromos.has(s.plan_id))
          .map(s => s.local_id)
      );

      setActivePromotions(promotedLocalIds);
      console.log('[ExplorarScreen v73.2] 💰 Active promotions loaded:', promotedLocalIds.size);
    } catch (error) {
      console.error('[ExplorarScreen v73.2] Error in cargarPromocionesActivas:', error);
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
    console.log('[ExplorarScreen v73.2] Mode change:', modo);
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
                  <IconSymbol ios_icon_name={getModoIcon(currentMode)} android_material_icon_name={getModoIcon(currentMode)} size={Platform.OS === 'ios' ? 20 : 17} color={colors.headerText} />
                  <Text style={styles.modoButtonText}>{getModoLabel(currentMode)}</Text>
                  <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="expand_more" size={Platform.OS === 'ios' ? 16 : 14} color={colors.headerText} />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => router.push('/explorar/mapa')}
              >
                <IconSymbol ios_icon_name="map.fill" android_material_icon_name="map" size={Platform.OS === 'ios' ? 24 : 20} color={colors.headerText} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ✅ CRITICAL FIX v73.2: Search box height reduced on Android (6px vs 12px padding) */}
          <View style={styles.searchContainer}>
            <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={Platform.OS === 'ios' ? 20 : 17} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar locales..."
              placeholderTextColor={colors.textSecondary}
              value={busqueda}
              onChangeText={setBusqueda}
            />
            <TouchableOpacity onPress={() => setMostrarFiltros(true)} style={styles.filterButtonContainer}>
              <IconSymbol ios_icon_name="line.3.horizontal.decrease.circle.fill" android_material_icon_name="filter_list" size={Platform.OS === 'ios' ? 24 : 20} color={colors.primary} />
              {hasActiveFilters && (
                <View style={styles.filterBadge}>
                  <View style={styles.filterBadgeDot} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* ✅ CRITICAL FIX v73.2: Category section properly spaced (10px gap on Android vs 16px on iOS) and not cut off */}
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
                  <IconSymbol ios_icon_name={categoria.icon as any} android_material_icon_name={categoria.icon as any} size={Platform.OS === 'ios' ? 28 : 24} color={colors.primary} />
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
          
          {showScrollIndicator && (
            <Animated.View 
              style={[
                styles.scrollIndicator,
                { opacity: scrollIndicatorOpacity }
              ]}
            >
              <IconSymbol 
                ios_icon_name="chevron.right" 
                android_material_icon_name="chevron_right"
                size={16} 
                color={colors.textSecondary} 
              />
            </Animated.View>
          )}
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
                  ios_icon_name="building.2.fill" 
                  android_material_icon_name="store"
                  size={Platform.OS === 'ios' ? 22 : 19} 
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
                  ios_icon_name="chevron.right" 
                  android_material_icon_name="chevron_right"
                  size={Platform.OS === 'ios' ? 18 : 15} 
                  color={colors.primary} 
                />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {localesVisibles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol ios_icon_name="mappin.slash" android_material_icon_name="location_off" size={Platform.OS === 'ios' ? 64 : 54} color={colors.textSecondary} />
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
                      ios_icon_name={getModoIcon(modo)} 
                      android_material_icon_name={getModoIcon(modo)}
                      size={Platform.OS === 'ios' ? 24 : 20} 
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
                  <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={Platform.OS === 'ios' ? 24 : 20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <FiltrosAvanzadosSheet
        visible={mostrarFiltros}
        onClose={() => setMostrarFiltros(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // ✅ CRITICAL v73.2: Uses HEADER_DIMENSIONS for consistency
  header: {
    paddingTop: HEADER_DIMENSIONS.paddingTop,
    paddingHorizontal: HEADER_DIMENSIONS.paddingHorizontal,
    paddingBottom: HEADER_DIMENSIONS.paddingBottom,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  // ✅ ANDROID FIX v73.2: Normalized font size on Android (80% of iOS)
  headerTitle: {
    fontSize: Platform.OS === 'ios' ? 32 : 26,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'ios' ? 12 : 10,
  },
  modoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: Platform.OS === 'ios' ? 12 : 10,
    paddingVertical: Platform.OS === 'ios' ? 8 : 7,
    gap: Platform.OS === 'ios' ? 6 : 5,
  },
  modoButtonText: {
    fontSize: Platform.OS === 'ios' ? 14 : 11,
    fontWeight: '600',
    color: colors.headerText,
  },
  headerIconButton: {
    padding: Platform.OS === 'ios' ? 8 : 7,
  },
  // ✅ CRITICAL FIX v73.2: Search box height reduced on Android (6px vs 12px padding)
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.headerText,
    borderRadius: 12,
    paddingHorizontal: Platform.OS === 'ios' ? 16 : 13,
    paddingVertical: Platform.OS === 'ios' ? 12 : 6,
    gap: Platform.OS === 'ios' ? 12 : 10,
  },
  searchInput: {
    flex: 1,
    fontSize: Platform.OS === 'ios' ? 16 : 13,
    color: colors.text,
  },
  filterButtonContainer: {
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.headerText,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  filterBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  // ✅ CRITICAL FIX v73.2: Category section properly spaced (10px gap on Android vs 16px on iOS) and not cut off
  categoriasContainer: {
    paddingVertical: Platform.OS === 'ios' ? 16 : 14,
    paddingTop: Platform.OS === 'ios' ? 16 : 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    position: 'relative',
  },
  categoriasScroll: {
    flexDirection: 'row',
    gap: Platform.OS === 'ios' ? 16 : 10,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  categoriaButton: {
    alignItems: 'center',
    gap: 6,
    minWidth: 70,
  },
  // ✅ ANDROID FIX v73.2: Category icon container sizes normalized on Android (85% of iOS)
  categoriaIconContainer: {
    width: Platform.OS === 'ios' ? 56 : 48,
    height: Platform.OS === 'ios' ? 56 : 48,
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
  // ✅ ANDROID FIX v73.2: Category label sizes normalized on Android (80% of iOS)
  categoriaLabel: {
    fontSize: Platform.OS === 'ios' ? 12 : 10,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  categoriaLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  scrollIndicator: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: [{ translateY: -12 }],
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    elevation: 0,
    shadowOpacity: 0,
  },
  claimLocalGradient: {
    borderWidth: 1.5,
    borderColor: colors.primary + '30',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  claimLocalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: 'transparent',
  },
  // ✅ ANDROID FIX v73.2: Icon container sizes normalized on Android (85% of iOS)
  claimLocalIconContainer: {
    width: Platform.OS === 'ios' ? 42 : 36,
    height: Platform.OS === 'ios' ? 42 : 36,
    borderRadius: Platform.OS === 'ios' ? 21 : 18,
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
  // ✅ ANDROID FIX v73.2: Text sizes normalized on Android (80% of iOS)
  claimLocalTitle: {
    fontSize: Platform.OS === 'ios' ? 14 : 11,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  claimLocalSubtitle: {
    fontSize: Platform.OS === 'ios' ? 11.5 : 9,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  // ✅ ANDROID FIX v73.2: Arrow container sizes normalized on Android (85% of iOS)
  claimLocalArrow: {
    width: Platform.OS === 'ios' ? 28 : 24,
    height: Platform.OS === 'ios' ? 28 : 24,
    borderRadius: Platform.OS === 'ios' ? 14 : 12,
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
  // ✅ ANDROID FIX v73.2: Empty state text sizes normalized on Android (80% of iOS)
  emptyText: {
    fontSize: Platform.OS === 'ios' ? 18 : 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: Platform.OS === 'ios' ? 14 : 11,
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
    fontSize: Platform.OS === 'ios' ? 14 : 11,
    fontWeight: '600',
    color: colors.text,
  },
  endContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  endText: {
    fontSize: Platform.OS === 'ios' ? 14 : 11,
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
  // ✅ ANDROID FIX v73.2: Modal text sizes normalized on Android (80% of iOS)
  modalTitle: {
    fontSize: Platform.OS === 'ios' ? 20 : 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: Platform.OS === 'ios' ? 14 : 11,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  modoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: Platform.OS === 'ios' ? 16 : 13,
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
    gap: Platform.OS === 'ios' ? 12 : 10,
    flex: 1,
  },
  modoOptionIcon: {
    width: Platform.OS === 'ios' ? 48 : 40,
    height: Platform.OS === 'ios' ? 48 : 40,
    borderRadius: Platform.OS === 'ios' ? 24 : 20,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modoOptionIconActive: {
    backgroundColor: colors.primary,
  },
  modoOptionLabel: {
    fontSize: Platform.OS === 'ios' ? 16 : 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  modoOptionLabelActive: {
    color: colors.primary,
  },
  modoOptionDescription: {
    fontSize: Platform.OS === 'ios' ? 12 : 10,
    color: colors.textSecondary,
  },
});
