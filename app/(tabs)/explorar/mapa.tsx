
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { Local } from '@/types';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import FiltrosAvanzadosSheet from '@/components/home/FiltrosAvanzadosSheet';
import { supabase } from '@/utils/supabase';
import { getEstadoLocal } from '@/utils/timeUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useFilters } from '@/contexts/FilterContext';
import { addPubCategoryIfNeeded, getPrimaryIconForVenue } from '@/utils/categorizeLocal';
import { calcularDistancia } from '@/utils/locationUtils';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { scaleIconSize, scaleFontSize } from '@/utils/androidScaling';

const { width } = Dimensions.get('window');

const CATEGORIAS_LOCALES = [
  { id: 'todos', label: 'Todos', icon: 'mappin.circle.fill', androidIcon: 'location_on' },
  { id: 'cafe', label: 'Cafés', icon: 'cup.and.saucer.fill', androidIcon: 'local_cafe' },
  { id: 'restaurante', label: 'Restaurantes', icon: 'fork.knife', androidIcon: 'restaurant' },
  { id: 'bar', label: 'Bares', icon: 'wineglass.fill', androidIcon: 'wine_bar' },
  { id: 'pub', label: 'Pubs', icon: 'mug.fill', androidIcon: 'sports_bar' },
  { id: 'cocteleria', label: 'Coctelería', icon: 'wineglass', androidIcon: 'wine_bar' },
  { id: 'discoteca', label: 'Discotecas', icon: 'music.note', androidIcon: 'music_note' },
];

const COMUNIDAD_COORDINATES: Record<string, { lat: number; lng: number; zoom: number }> = {
  'Andalucía': { lat: 37.5443, lng: -4.7278, zoom: 7 },
  'Aragón': { lat: 41.5911, lng: -0.9064, zoom: 7 },
  'Asturias': { lat: 43.3614, lng: -5.8593, zoom: 8 },
  'Baleares': { lat: 39.6953, lng: 3.0176, zoom: 8 },
  'Canarias': { lat: 28.2916, lng: -16.6291, zoom: 7 },
  'Cantabria': { lat: 43.1828, lng: -3.9878, zoom: 8 },
  'Castilla y León': { lat: 41.8357, lng: -4.3976, zoom: 7 },
  'Castilla-La Mancha': { lat: 39.2797, lng: -3.0977, zoom: 7 },
  'Cataluña': { lat: 41.5912, lng: 1.5209, zoom: 7 },
  'Comunidad de Madrid': { lat: 40.4168, lng: -3.7038, zoom: 9 },
  'Comunidad Valenciana': { lat: 39.4840, lng: -0.7533, zoom: 7 },
  'Extremadura': { lat: 39.4937, lng: -6.0679, zoom: 7 },
  'Galicia': { lat: 42.5751, lng: -8.1339, zoom: 7 },
  'La Rioja': { lat: 42.2871, lng: -2.5396, zoom: 9 },
  'Navarra': { lat: 42.6954, lng: -1.6761, zoom: 8 },
  'País Vasco': { lat: 43.0627, lng: -2.4144, zoom: 8 },
  'Región de Murcia': { lat: 37.9922, lng: -1.1307, zoom: 8 },
  'Ceuta': { lat: 35.8894, lng: -5.3213, zoom: 12 },
  'Melilla': { lat: 35.2923, lng: -2.9381, zoom: 12 },
};

const PROVINCIA_COORDINATES: Record<string, { lat: number; lng: number; zoom: number }> = {
  'Almería': { lat: 36.8381, lng: -2.4597, zoom: 9 },
  'Cádiz': { lat: 36.5271, lng: -6.2886, zoom: 9 },
  'Córdoba': { lat: 37.8882, lng: -4.7794, zoom: 9 },
  'Granada': { lat: 37.1773, lng: -3.5986, zoom: 9 },
  'Huelva': { lat: 37.2614, lng: -6.9447, zoom: 9 },
  'Jaén': { lat: 37.7796, lng: -3.7849, zoom: 9 },
  'Málaga': { lat: 36.7213, lng: -4.4214, zoom: 9 },
  'Sevilla': { lat: 37.3891, lng: -5.9845, zoom: 9 },
  'Huesca': { lat: 42.1401, lng: -0.4080, zoom: 9 },
  'Teruel': { lat: 40.3456, lng: -1.1065, zoom: 9 },
  'Zaragoza': { lat: 41.6488, lng: -0.8891, zoom: 9 },
  'Asturias': { lat: 43.3614, lng: -5.8593, zoom: 8 },
  'Islas Baleares': { lat: 39.6953, lng: 3.0176, zoom: 8 },
  'Las Palmas': { lat: 28.1248, lng: -15.4300, zoom: 8 },
  'Santa Cruz de Tenerife': { lat: 28.4636, lng: -16.2518, zoom: 8 },
  'Cantabria': { lat: 43.1828, lng: -3.9878, zoom: 8 },
  'Ávila': { lat: 40.6570, lng: -4.6814, zoom: 9 },
  'Burgos': { lat: 42.3439, lng: -3.6969, zoom: 9 },
  'León': { lat: 42.5987, lng: -5.5671, zoom: 9 },
  'Palencia': { lat: 42.0096, lng: -4.5288, zoom: 9 },
  'Salamanca': { lat: 40.9701, lng: -5.6635, zoom: 9 },
  'Segovia': { lat: 40.9429, lng: -4.1088, zoom: 9 },
  'Soria': { lat: 41.7665, lng: -2.4790, zoom: 9 },
  'Valladolid': { lat: 41.6523, lng: -4.7245, zoom: 9 },
  'Zamora': { lat: 41.5034, lng: -5.7467, zoom: 9 },
  'Albacete': { lat: 38.9943, lng: -1.8585, zoom: 9 },
  'Ciudad Real': { lat: 38.9848, lng: -3.9273, zoom: 9 },
  'Cuenca': { lat: 40.0704, lng: -2.1374, zoom: 9 },
  'Guadalajara': { lat: 40.6318, lng: -3.1606, zoom: 9 },
  'Toledo': { lat: 39.8628, lng: -4.0273, zoom: 9 },
  'Barcelona': { lat: 41.3851, lng: 2.1734, zoom: 9 },
  'Girona': { lat: 41.9794, lng: 2.8214, zoom: 9 },
  'Lleida': { lat: 41.6176, lng: 0.6200, zoom: 9 },
  'Tarragona': { lat: 41.1189, lng: 1.2445, zoom: 9 },
  'Madrid': { lat: 40.4168, lng: -3.7038, zoom: 10 },
  'Alicante': { lat: 38.3452, lng: -0.4810, zoom: 9 },
  'Castellón': { lat: 39.9864, lng: -0.0513, zoom: 9 },
  'Valencia': { lat: 39.4699, lng: -0.3763, zoom: 9 },
  'Badajoz': { lat: 38.8794, lng: -6.9706, zoom: 9 },
  'Cáceres': { lat: 39.4753, lng: -6.3724, zoom: 9 },
  'A Coruña': { lat: 43.3623, lng: -8.4115, zoom: 9 },
  'Lugo': { lat: 43.0097, lng: -7.5567, zoom: 9 },
  'Ourense': { lat: 42.3406, lng: -7.8644, zoom: 9 },
  'Pontevedra': { lat: 42.4296, lng: -8.6446, zoom: 9 },
  'La Rioja': { lat: 42.2871, lng: -2.5396, zoom: 9 },
  'Navarra': { lat: 42.6954, lng: -1.6761, zoom: 8 },
  'Álava': { lat: 42.8467, lng: -2.6716, zoom: 9 },
  'Guipúzcoa': { lat: 43.1828, lng: -2.1764, zoom: 9 },
  'Vizcaya': { lat: 43.2630, lng: -2.9350, zoom: 9 },
  'Murcia': { lat: 37.9922, lng: -1.1307, zoom: 9 },
  'Ceuta': { lat: 35.8894, lng: -5.3213, zoom: 12 },
  'Melilla': { lat: 35.2923, lng: -2.9381, zoom: 12 },
};

interface LocalWithEvent extends Local {
  evento?: {
    id: string;
    titulo: string;
    fecha: string;
    fecha_fin?: string | null;
    hora: string;
    hora_fin?: string | null;
    imagen_url?: string | null;
    precio?: number | null;
  } | null;
  plan?: string | null;
}

/**
 * ✅ MAP SCREEN v104.0 - ANDROID CENTER BUTTON FIX
 * 
 * CRITICAL FIXES v104.0 (ANDROID ONLY):
 * - ✅ Center button repositioned to bottom-right corner (16px from right, 100px from bottom)
 * - ✅ Button positioned above bottom nav bar on Android
 * - ✅ All icons properly scaled with scaleIconSize()
 * - ✅ All text properly scaled with scaleFontSize()
 * - ✅ Fixed invalid Material icon names (chevron_left → arrow_back)
 * - ✅ Map popup content properly scaled
 * - ✅ Map markers properly scaled (44px → 40px on Android)
 * - ✅ iOS design remains unchanged
 */

export default function MapaScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { filtros: globalFiltros } = useFilters();
  const { locales: globalLocales, refreshData } = useGlobalData();
  
  const webViewRef = useRef<WebView>(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'abiertos'>('abiertos');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [todosLosLocales, setTodosLosLocales] = useState<LocalWithEvent[]>([]);
  const [localesFiltrados, setLocalesFiltrados] = useState<LocalWithEvent[]>([]);
  const [mapHTML, setMapHTML] = useState<string>('');
  const previousFiltersRef = useRef<string>('');
  const [isMapReady, setIsMapReady] = useState(false);
  const [isLoadingMarkers, setIsLoadingMarkers] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        console.log('[MAP v104.0] 🔍 Requesting location permissions...');
        
        const isAvailable = await Location.hasServicesEnabledAsync();
        if (!isAvailable) {
          console.log('[MAP v104.0] ⚠️ Location services are disabled, using default location (Madrid)');
          setUserLocation({ lat: 40.4168, lng: -3.7038 });
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('[MAP v104.0] ⚠️ Location permission denied, using default location (Madrid)');
          setUserLocation({ lat: 40.4168, lng: -3.7038 });
          return;
        }

        console.log('[MAP v104.0] ✅ Location permission granted, getting position...');
        
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 0,
        });
        
        setUserLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
        console.log('[MAP v104.0] 📍 User location obtained:', {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      } catch (error: any) {
        console.error('[MAP v104.0] ❌ Error getting location:', {
          message: error?.message || 'Unknown error',
          code: error?.code,
        });
        console.log('[MAP v104.0] ⚠️ Using default location (Madrid) due to error');
        setUserLocation({ lat: 40.4168, lng: -3.7038 });
      }
    })();
  }, []);

  useEffect(() => {
    console.log('⚡ [MAP v104.0] ========================================');
    console.log('⚡ [MAP v104.0] INSTANT HYDRATION from GlobalDataContext');
    console.log('⚡ [MAP v104.0] Total locales available:', globalLocales.length);
    
    if (globalLocales.length > 0) {
      setIsLoadingMarkers(true);
      
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      
      supabase
        .from('eventos')
        .select('id, titulo, fecha, fecha_fin, hora, hora_fin, imagen_url, precio, local_id')
        .eq('activo', true)
        .gte('fecha', currentDate)
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true })
        .then(({ data: allEvents }) => {
          const eventsByLocal = new Map<string, any>();
          if (allEvents) {
            for (const event of allEvents) {
              if (!eventsByLocal.has(event.local_id)) {
                const eventStartDate = new Date(`${event.fecha}T${event.hora}`);
                let eventEndDate: Date;
                if (event.fecha_fin && event.hora_fin) {
                  eventEndDate = new Date(`${event.fecha_fin}T${event.hora_fin}`);
                } else {
                  eventEndDate = new Date(eventStartDate.getTime() + 4 * 60 * 60 * 1000);
                }

                if (now <= eventEndDate) {
                  eventsByLocal.set(event.local_id, event);
                }
              }
            }
          }

          const localesTransformados: LocalWithEvent[] = globalLocales.map((local) => {
            const evento = eventsByLocal.get(local.id) || null;

            return {
              ...local,
              evento,
              plan: null,
            };
          });

          setTodosLosLocales(localesTransformados);
          setIsLoadingMarkers(false);
          console.log(`⚡ [MAP v104.0] ✅ INSTANT HYDRATION complete with ${localesTransformados.length} locals`);
        });
    }
  }, [globalLocales]);

  useEffect(() => {
    const backgroundRefresh = async () => {
      console.log('🔄 [MAP v104.0] Background refresh triggered');
      await refreshData(true);
    };

    const interval = setInterval(backgroundRefresh, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshData]);

  const localesFiltradosMemo = useMemo(() => {
    console.log('[MAP v104.0] 🔍 FILTERING LOCALS FOR MAP DISPLAY');
    
    let filtrados = todosLosLocales.filter(local => {
      let localCategories = local.barlive_types || (local.barlive_type ? [local.barlive_type] : []);
      localCategories = addPubCategoryIfNeeded(localCategories, local.horarios_completos);
      
      let matchCategoria = false;
      if (categoriaSeleccionada === 'todos') {
        matchCategoria = true;
      } else {
        matchCategoria = localCategories.some((cat: string) => 
          cat.toLowerCase() === categoriaSeleccionada.toLowerCase()
        );
      }
      
      let matchEstado = true;
      if (filtroEstado === 'abiertos') {
        const estado = getEstadoLocal(local);
        matchEstado = estado.estaAbierto === true;
      }
      
      let matchGlobalFilters = true;
      
      if (globalFiltros.comunidad && globalFiltros.comunidad !== 'Todas las Comunidades') {
        matchGlobalFilters = matchGlobalFilters && local.comunidad === globalFiltros.comunidad;
      }
      
      if (globalFiltros.provincia) {
        matchGlobalFilters = matchGlobalFilters && local.provincia === globalFiltros.provincia;
      }
      
      if (globalFiltros.tipo && globalFiltros.tipo.length > 0) {
        const hasMatchingType = globalFiltros.tipo.some(tipo => 
          localCategories.some((cat: string) => cat.toLowerCase() === tipo.toLowerCase())
        );
        matchGlobalFilters = matchGlobalFilters && hasMatchingType;
      }
      
      if (globalFiltros.servicios && globalFiltros.servicios.length > 0) {
        const localServices = local.servicios_disponibles || {};
        const hasAllServices = globalFiltros.servicios.every(servicio => 
          localServices[servicio] === true
        );
        matchGlobalFilters = matchGlobalFilters && hasAllServices;
      }
      
      if (globalFiltros.ambiente && globalFiltros.ambiente.length > 0 && !globalFiltros.ambiente.includes('cualquiera')) {
        const localAmbiente = local.ambiente_completo || {};
        const hasMatchingAmbiente = globalFiltros.ambiente.some(amb => 
          localAmbiente[amb] === true
        );
        matchGlobalFilters = matchGlobalFilters && hasMatchingAmbiente;
      }
      
      if (globalFiltros.clientela && globalFiltros.clientela.length > 0 && !globalFiltros.clientela.includes('cualquiera')) {
        const localClientela = local.clientela || {};
        const hasMatchingClientela = globalFiltros.clientela.some(cli => 
          localClientela[cli] === true
        );
        matchGlobalFilters = matchGlobalFilters && hasMatchingClientela;
      }
      
      if (globalFiltros.distancia && userLocation) {
        const distancia = calcularDistancia(
          userLocation.lat,
          userLocation.lng,
          local.coordenadas.lat,
          local.coordenadas.lng
        );
        matchGlobalFilters = matchGlobalFilters && distancia <= globalFiltros.distancia;
      }
      
      return matchCategoria && matchEstado && matchGlobalFilters;
    });
    
    console.log(`[MAP v104.0] ✅ Filtered locals: ${filtrados.length} of ${todosLosLocales.length}`);
    
    return filtrados;
  }, [todosLosLocales, categoriaSeleccionada, filtroEstado, globalFiltros, userLocation]);

  useEffect(() => {
    setLocalesFiltrados(localesFiltradosMemo);
  }, [localesFiltradosMemo]);

  const markersData = useMemo(() => {
    console.log('[MAP v104.0] 🎯 Memoizing markers data...');
    
    return localesFiltrados.map(local => {
      const estadoCompleto = getEstadoLocal(local);
      const estaAbierto = estadoCompleto.estaAbierto;
      const estado = estaAbierto === true ? 'abierto' : 
                     estaAbierto === false ? 'cerrado' : 'sin_info';
      
      let localCategories = local.barlive_types || (local.barlive_type ? [local.barlive_type] : []);
      localCategories = addPubCategoryIfNeeded(localCategories, local.horarios_completos);
      
      const icon = getPrimaryIconForVenue(localCategories, local.horarios_completos);
      
      let overlayIcon = null;
      if (estadoCompleto.overlayIcon === 'lock') {
        overlayIcon = '🔒';
      } else if (estadoCompleto.overlayIcon === 'questionmark') {
        overlayIcon = '❓';
      } else if (estadoCompleto.overlayIcon === 'clock') {
        overlayIcon = '🕐';
      }

      let isEventLive = false;
      if (local.evento) {
        const now = new Date();
        const eventStartDate = new Date(`${local.evento.fecha}T${local.evento.hora}`);
        let eventEndDate: Date;
        if (local.evento.fecha_fin && local.evento.hora_fin) {
          eventEndDate = new Date(`${local.evento.fecha_fin}T${local.evento.hora_fin}`);
        } else {
          eventEndDate = new Date(eventStartDate.getTime() + 4 * 60 * 60 * 1000);
        }
        isEventLive = now >= eventStartDate && now <= eventEndDate;
      }
      
      let distancia = 0.5;
      if (userLocation) {
        distancia = calcularDistancia(
          userLocation.lat,
          userLocation.lng,
          local.coordenadas.lat,
          local.coordenadas.lng
        );
      }
      
      return {
        id: local.id,
        lat: local.coordenadas.lat,
        lng: local.coordenadas.lng,
        nombre: local.nombre,
        tipo: localCategories[0] || local.tipo,
        categorias: localCategories,
        estado: estado,
        estadoBadge: estadoCompleto.badge,
        icon: icon,
        overlayIcon: overlayIcon,
        rating: local.valoracion_google || local.rating,
        imagen: local.imagen_url || local.imagenes?.[0] || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400',
        distancia: distancia,
        destacado: local.destacado || false,
        hasEvent: !!local.evento,
        isEventLive: isEventLive,
        eventTitulo: local.evento?.titulo || '',
        eventImagen: local.evento?.imagen_url || '',
        isPremium: local.plan === 'premium',
      };
    });
  }, [localesFiltrados, userLocation]);

  const generateMapHTML = useCallback(async () => {
    const centerLat = userLocation?.lat || 40.4168;
    const centerLng = userLocation?.lng || -3.7038;

    const checkInsByLocal = new Map<string, { isUserHere: boolean; friendsCount: number }>();
    
    if (user) {
      try {
        const { data: userCheckIn } = await supabase
          .from('check_ins')
          .select('local_id')
          .eq('usuario_id', user.id)
          .single();

        if (userCheckIn) {
          checkInsByLocal.set(userCheckIn.local_id, { isUserHere: true, friendsCount: 0 });
        }

        const { data: following } = await supabase
          .from('seguidores')
          .select('seguido_id')
          .eq('seguidor_id', user.id);

        const followedUserIds = following?.map(f => f.seguido_id) || [];

        if (followedUserIds.length > 0) {
          const { data: friendCheckIns } = await supabase
            .from('check_ins')
            .select('local_id, usuario_id, visibility, specific_user_ids')
            .in('usuario_id', followedUserIds);

          (friendCheckIns || []).forEach(checkIn => {
            const isVisible = 
              checkIn.visibility === 'all_users' ||
              checkIn.visibility === 'followers' ||
              (checkIn.visibility === 'specific_users' && checkIn.specific_user_ids?.includes(user.id));

            if (isVisible) {
              const existing = checkInsByLocal.get(checkIn.local_id) || { isUserHere: false, friendsCount: 0 };
              existing.friendsCount += 1;
              checkInsByLocal.set(checkIn.local_id, existing);
            }
          });
        }
      } catch (error) {
        console.error('[MAP v104.0] Error loading check-ins:', error);
      }
    }

    const markersWithCheckIns = markersData.map(marker => {
      const checkInInfo = checkInsByLocal.get(marker.id) || { isUserHere: false, friendsCount: 0 };
      return {
        ...marker,
        isUserHere: checkInInfo.isUserHere,
        friendsHereCount: checkInInfo.friendsCount,
      };
    });

    console.log(`[MAP v104.0] 🗺️ GENERATING MAP HTML WITH ${markersWithCheckIns.length} MARKERS`);

    // ✅ CRITICAL FIX v104.0: Apply Android scaling to popup content AND markers
    const popupFontSize = Platform.OS === 'android' ? Math.round(14 * 0.80) : 14;
    const popupTitleSize = Platform.OS === 'android' ? Math.round(16 * 0.80) : 16;
    const popupSmallSize = Platform.OS === 'android' ? Math.round(12 * 0.80) : 12;
    const popupBadgeSize = Platform.OS === 'android' ? Math.round(11 * 0.80) : 11;
    const markerSize = Platform.OS === 'android' ? 40 : 44; // ✅ Scaled marker size
    const markerDestacadoSize = Platform.OS === 'android' ? 48 : 52; // ✅ Scaled destacado marker
    const markerIconSize = Platform.OS === 'android' ? 20 : 22; // ✅ Scaled icon inside marker
    const eventIndicatorSize = Platform.OS === 'android' ? 18 : 20; // ✅ Scaled event indicator

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    #map { width: 100%; height: 100%; position: absolute; top: 0; left: 0; background-color: #A8E0FF; }
    
    .leaflet-container {
      background-color: #A8E0FF;
      font-family: Roboto, Arial, sans-serif;
    }
    
    /* ✅ CRITICAL FIX v104.0: Scaled marker sizes for Android */
    .custom-marker {
      width: ${markerSize}px;
      height: ${markerSize}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${markerIconSize}px;
      border: 3px solid #FFFFFF;
      transition: transform 0.2s;
      cursor: pointer;
      position: relative;
    }
    .custom-marker-destacado {
      width: ${markerDestacadoSize}px;
      height: ${markerDestacadoSize}px;
      border: 4px solid #FACC15;
      box-shadow: 0 0 0 2px #FFFFFF, 0 4px 12px rgba(250, 204, 21, 0.5);
      animation: pulse-destacado 2s infinite;
    }
    @keyframes pulse-destacado {
      0%, 100% { box-shadow: 0 0 0 2px #FFFFFF, 0 4px 12px rgba(250, 204, 21, 0.5); }
      50% { box-shadow: 0 0 0 2px #FFFFFF, 0 4px 16px rgba(250, 204, 21, 0.8); }
    }
    .custom-marker:hover {
      transform: scale(1.2);
      z-index: 1000;
    }
    .marker-abierto { 
      background-color: #22C55E;
      box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
    }
    .marker-cerrado { 
      background-color: #EF4444;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
    }
    .marker-sin_info { 
      background-color: #9CA3AF;
      box-shadow: 0 2px 8px rgba(156, 163, 175, 0.3);
    }
    
    /* ✅ CRITICAL FIX v104.0: Scaled event indicator */
    .event-indicator {
      position: absolute;
      top: -6px;
      right: -6px;
      width: ${eventIndicatorSize}px;
      height: ${eventIndicatorSize}px;
      background-color: #FACC15;
      border-radius: 50%;
      border: 2px solid #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${Math.round(eventIndicatorSize * 0.5)}px;
      z-index: 10;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    .event-indicator-live {
      animation: pulse-event 1.5s infinite;
    }
    
    @keyframes pulse-event {
      0%, 100% { 
        transform: scale(1);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      50% { 
        transform: scale(1.15);
        box-shadow: 0 2px 8px rgba(250, 204, 21, 0.6);
      }
    }
    
    .leaflet-popup-content-wrapper {
      border-radius: 8px;
      padding: 0;
      overflow: hidden;
      box-shadow: 0 2px 7px 1px rgba(0,0,0,0.3);
      font-family: Roboto, Arial, sans-serif;
    }
    .leaflet-popup-content {
      margin: 0;
      width: ${Platform.OS === 'android' ? '260px' : '280px'} !important;
      font-size: ${popupFontSize}px;
    }
    .leaflet-popup-tip {
      box-shadow: 0 2px 7px 1px rgba(0,0,0,0.3);
    }
    
    .popup-content {
      font-family: Roboto, Arial, sans-serif;
    }
    .popup-image-container {
      position: relative;
      width: 100%;
      height: ${Platform.OS === 'android' ? '120px' : '140px'};
    }
    .popup-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .popup-image-dimmed {
      filter: brightness(0.6);
    }
    .popup-overlay-icon {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: ${Platform.OS === 'android' ? '40px' : '48px'};
      z-index: 10;
    }
    .popup-badge-destacado {
      position: absolute;
      top: 8px;
      left: 8px;
      background-color: #FACC15;
      color: #92400E;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: ${popupBadgeSize}px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 4px;
      z-index: 11;
      border: 2px solid #FFFFFF;
    }
    
    .popup-event-banner {
      background: linear-gradient(135deg, #14B8A6 0%, #0D9488 100%);
      padding: ${Platform.OS === 'android' ? '10px' : '12px'};
      color: white;
      margin-bottom: ${Platform.OS === 'android' ? '10px' : '12px'};
    }
    .popup-event-banner-live {
      background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
    }
    .popup-event-title {
      font-size: ${popupFontSize}px;
      font-weight: 700;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .popup-event-live-badge {
      background-color: rgba(255, 255, 255, 0.3);
      padding: 2px 8px;
      border-radius: 8px;
      font-size: ${Platform.OS === 'android' ? '9px' : '10px'};
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .popup-event-image {
      width: 100%;
      height: ${Platform.OS === 'android' ? '70px' : '80px'};
      object-fit: cover;
      border-radius: 6px;
      margin-top: 8px;
    }
    
    .popup-info {
      padding: ${Platform.OS === 'android' ? '10px' : '12px'};
    }
    .popup-title {
      font-size: ${popupTitleSize}px;
      font-weight: 500;
      margin-bottom: 6px;
      color: #202124;
      line-height: ${Platform.OS === 'android' ? '18px' : '20px'};
    }
    .popup-estado {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: ${popupSmallSize}px;
      font-weight: 500;
      color: white;
      margin-bottom: 8px;
    }
    .estado-abierto { background-color: #22C55E; }
    .estado-cerrado { background-color: #EF4444; }
    .estado-sin_info { background-color: #9CA3AF; }
    .popup-rating {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 10px;
      font-size: ${Platform.OS === 'android' ? '12px' : '13px'};
      color: #70757A;
    }
    .popup-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: #14B8A6;
      color: #FFFFFF !important;
      padding: ${Platform.OS === 'android' ? '8px' : '10px'};
      border-radius: 4px;
      text-decoration: none;
      font-weight: 600;
      font-size: ${popupFontSize}px;
      margin-top: 6px;
      transition: background 0.2s;
    }
    .popup-button:hover {
      background: #0D9488;
      color: #FFFFFF !important;
    }
    .popup-button span {
      color: #FFFFFF !important;
    }
    
    .user-marker {
      width: 18px;
      height: 18px;
      background-color: #4285F4;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 8px rgba(66, 133, 244, 0.2), 0 2px 4px rgba(0,0,0,0.3);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 8px rgba(66, 133, 244, 0.2), 0 2px 4px rgba(0,0,0,0.3); }
      50% { box-shadow: 0 0 0 12px rgba(66, 133, 244, 0.1), 0 2px 4px rgba(0,0,0,0.3); }
    }
    
    .leaflet-control-attribution { display: none !important; }
    .leaflet-control-zoom { display: none !important; }
    
    .marker-cluster-small {
      background-color: rgba(20, 184, 166, 0.6);
    }
    .marker-cluster-small div {
      background-color: #FFFFFF;
      color: #14B8A6;
    }
    .marker-cluster-medium {
      background-color: rgba(20, 184, 166, 0.7);
    }
    .marker-cluster-medium div {
      background-color: #FFFFFF;
      color: #14B8A6;
    }
    .marker-cluster-large {
      background-color: rgba(20, 184, 166, 0.8);
    }
    .marker-cluster-large div {
      background-color: #FFFFFF;
      color: #14B8A6;
    }
    .marker-cluster {
      border-radius: 50%;
      text-align: center;
      font-weight: 700;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    .marker-cluster div {
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    try {
      console.log('[MAP HTML v104.0] ⚡ INSTANT INITIALIZATION');
      
      var map = L.map('map', {
        zoomControl: false,
        attributionControl: false
      }).setView([${centerLat}, ${centerLng}], 11);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: ''
      }).addTo(map);

      var markers = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: function(cluster) {
          var count = cluster.getChildCount();
          var size = count < 10 ? 'small' : count < 100 ? 'medium' : 'large';
          return L.divIcon({
            html: '<div>' + count + '</div>',
            className: 'marker-cluster marker-cluster-' + size,
            iconSize: L.point(44, 44)
          });
        }
      });

      ${userLocation ? `
        var userIcon = L.divIcon({
          className: 'user-marker',
          iconSize: [18, 18]
        });
        L.marker([${userLocation.lat}, ${userLocation.lng}], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
      ` : ''}

      var markersData = ${JSON.stringify(markersWithCheckIns)};
      
      var lastZoom = map.getZoom();
      map.on('zoomend', function() {
        var currentZoom = map.getZoom();
        if (currentZoom >= 16 && currentZoom > lastZoom) {
          var bounds = map.getBounds();
          markersData.forEach(function(data) {
            if (bounds.contains([data.lat, data.lng])) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'zoom_close',
                id: data.id
              }));
            }
          });
        }
        lastZoom = currentZoom;
      });
      
      markersData.forEach(function(data) {
        var markerClass = 'custom-marker marker-' + data.estado;
        if (data.destacado) {
          markerClass += ' custom-marker-destacado';
        }
        
        var markerHtml = data.icon;
        if (data.hasEvent) {
          var eventIndicatorClass = 'event-indicator';
          if (data.isEventLive) {
            eventIndicatorClass += ' event-indicator-live';
          }
          markerHtml = '<div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">' +
            data.icon +
            '<div class="' + eventIndicatorClass + '">🎵</div>' +
          '</div>';
        }
        
        var markerIcon = L.divIcon({
          className: markerClass,
          html: markerHtml,
          iconSize: data.destacado ? [${markerDestacadoSize}, ${markerDestacadoSize}] : [${markerSize}, ${markerSize}]
        });

        var marker = L.marker([data.lat, data.lng], { icon: markerIcon });
        
        var estadoText = data.estadoBadge || (data.estado === 'abierto' ? 'Abierto ahora' : 
                        data.estado === 'cerrado' ? 'Cerrado' : 'Sin información');
        
        var imageDimmed = data.estado === 'cerrado' || data.estado === 'sin_info';
        var imageClass = imageDimmed ? 'popup-image popup-image-dimmed' : 'popup-image';
        
        var overlayIconHtml = data.overlayIcon ? 
          '<div class="popup-overlay-icon" style="color: #FFFFFF;">' + data.overlayIcon + '</div>' : '';
        
        var destacadoBadge = data.destacado ? 
          '<div class="popup-badge-destacado">⭐ Destacado</div>' : '';
        
        var eventBannerHtml = '';
        if (data.isPremium && data.hasEvent) {
          var eventBannerClass = 'popup-event-banner';
          if (data.isEventLive) {
            eventBannerClass += ' popup-event-banner-live';
          }
          var liveBadge = data.isEventLive ? '<span class="popup-event-live-badge">EN VIVO</span>' : '';
          var eventImageHtml = data.eventImagen ? 
            '<img src="' + data.eventImagen + '" class="popup-event-image" onerror="this.style.display=\\'none\\'" />' : '';
          
          eventBannerHtml = '<div class="' + eventBannerClass + '">' +
            '<div class="popup-event-title">🎵 ' + data.eventTitulo + ' ' + liveBadge + '</div>' +
            eventImageHtml +
          '</div>';
        }
        
        var categoriasHtml = '';
        if (data.categorias && data.categorias.length > 0) {
          categoriasHtml = '<div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;">';
          data.categorias.forEach(function(cat) {
            var catIcon = '';
            if (cat.toLowerCase() === 'cafe') catIcon = '☕';
            else if (cat.toLowerCase() === 'restaurante') catIcon = '🍽️';
            else if (cat.toLowerCase() === 'bar') catIcon = '🍷';
            else if (cat.toLowerCase() === 'pub') catIcon = '🍺';
            else if (cat.toLowerCase() === 'cocteleria') catIcon = '🍸';
            else if (cat.toLowerCase() === 'discoteca') catIcon = '🎵';
            else if (cat.toLowerCase() === 'sala_conciertos') catIcon = '🎵';
            else if (cat.toLowerCase() === 'terraza') catIcon = '☀️';
            else if (cat.toLowerCase() === 'rooftop') catIcon = '🏢';
            else if (cat.toLowerCase() === 'lounge') catIcon = '🛋️';
            else catIcon = '📍';
            
            categoriasHtml += '<span style="background-color: rgba(20, 184, 166, 0.15); color: #14B8A6; padding: 4px 8px; border-radius: 12px; font-size: ${popupBadgeSize}px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">' +
              catIcon + ' ' + cat.charAt(0).toUpperCase() + cat.slice(1) +
            '</span>';
          });
          categoriasHtml += '</div>';
        }
        
        var checkInBadgesHtml = '';
        if (data.isUserHere || data.friendsHereCount > 0) {
          checkInBadgesHtml = '<div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;">';
          if (data.isUserHere) {
            checkInBadgesHtml += '<span style="background-color: rgba(16, 185, 129, 0.2); color: #10B981; padding: 4px 10px; border-radius: 12px; font-size: ${popupBadgeSize}px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; border: 1px solid rgba(16, 185, 129, 0.4);">' +
              '📍 Tú estás aquí' +
            '</span>';
          }
          if (data.friendsHereCount > 0) {
            checkInBadgesHtml += '<span style="background-color: rgba(20, 184, 166, 0.2); color: #14B8A6; padding: 4px 10px; border-radius: 12px; font-size: ${popupBadgeSize}px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; border: 1px solid rgba(20, 184, 166, 0.4);">' +
              '👥 ' + data.friendsHereCount + ' ' + (data.friendsHereCount === 1 ? 'amigo' : 'amigos') +
            '</span>';
          }
          checkInBadgesHtml += '</div>';
        }

        var popupContent = '<div class="popup-content">' +
          '<div class="popup-image-container">' +
            '<img src="' + data.imagen + '" class="' + imageClass + '" onerror="this.src=\\'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400\\'" />' +
            destacadoBadge +
            overlayIconHtml +
          '</div>' +
          '<div class="popup-info">' +
            eventBannerHtml +
            '<div class="popup-title">' + data.nombre + '</div>' +
            categoriasHtml +
            checkInBadgesHtml +
            '<span class="popup-estado estado-' + data.estado + '">' + estadoText + '</span>' +
            '<div class="popup-rating">⭐ ' + data.rating.toFixed(1) + ' • ' + data.distancia.toFixed(1) + ' km</div>' +
            '<a href="#" class="popup-button" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type: \\'navigate\\', id: \\'' + data.id + '\\'})); return false;">' +
              '<span style="color: #FFFFFF;">📍 Ver más detalles</span>' +
            '</a>' +
          '</div>' +
        '</div>';
        
        marker.bindPopup(popupContent, {
          maxWidth: ${Platform.OS === 'android' ? 260 : 280},
          className: 'custom-popup',
          closeButton: true,
          offset: [0, -10],
          autoPan: true,
          autoPanPadding: [50, 50],
          keepInView: true
        });

        marker.on('popupopen', function(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'popup_opened',
            id: data.id
          }));
          
          setTimeout(function() {
            var px = map.project(marker.getLatLng());
            px.y -= ${Platform.OS === 'android' ? 120 : 140};
            var newLatLng = map.unproject(px);
            map.panTo(newLatLng, { animate: true, duration: 0.5 });
          }, 100);
        });

        marker.on('click', function(e) {
          marker.openPopup();
        });

        markers.addLayer(marker);
      });

      map.addLayer(markers);
      
      console.log('[MAP HTML v104.0] ✅ Map initialized successfully');
      
      setTimeout(function() {
        map.invalidateSize();
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'map_ready' }));
      }, 100);
      
      window.flyToLocation = function(lat, lng, zoom) {
        console.log('[MAP HTML v104.0] 🛫 Flying to:', lat, lng, 'zoom:', zoom);
        map.flyTo([lat, lng], zoom, {
          animate: true,
          duration: 1.5,
          easeLinearity: 0.25
        });
      };
      
    } catch (error) {
      console.error('[MAP HTML v104.0] Map initialization error:', error);
    }
  </script>
</body>
</html>
    `;
  }, [markersData, user, userLocation]);

  useEffect(() => {
    const generateHTML = async () => {
      if (localesFiltrados.length > 0 && !isLoadingMarkers) {
        console.log('[MAP v104.0] 🚀 Generating map HTML with', localesFiltrados.length, 'markers');
        const html = await generateMapHTML();
        setMapHTML(html);
      }
    };
    
    generateHTML();
  }, [localesFiltrados, user, generateMapHTML, isLoadingMarkers]);

  useEffect(() => {
    const currentFiltersKey = JSON.stringify({
      comunidad: globalFiltros.comunidad,
      provincia: globalFiltros.provincia,
    });
    
    if (currentFiltersKey !== previousFiltersRef.current && webViewRef.current && isMapReady) {
      previousFiltersRef.current = currentFiltersKey;
      
      if (globalFiltros.provincia && PROVINCIA_COORDINATES[globalFiltros.provincia]) {
        const coords = PROVINCIA_COORDINATES[globalFiltros.provincia];
        console.log(`[MAP v104.0] 🛫 FLY-TO: Province "${globalFiltros.provincia}"`, coords);
        
        webViewRef.current.injectJavaScript(`
          if (typeof window.flyToLocation !== 'undefined') {
            window.flyToLocation(${coords.lat}, ${coords.lng}, ${coords.zoom});
          }
          true;
        `);
      }
      else if (globalFiltros.comunidad && globalFiltros.comunidad !== 'Todas las Comunidades' && COMUNIDAD_COORDINATES[globalFiltros.comunidad]) {
        const coords = COMUNIDAD_COORDINATES[globalFiltros.comunidad];
        console.log(`[MAP v104.0] 🛫 FLY-TO: Community "${globalFiltros.comunidad}"`, coords);
        
        webViewRef.current.injectJavaScript(`
          if (typeof window.flyToLocation !== 'undefined') {
            window.flyToLocation(${coords.lat}, ${coords.lng}, ${coords.zoom});
          }
          true;
        `);
      }
    }
  }, [globalFiltros, isMapReady]);

  useEffect(() => {
    if (webViewRef.current && localesFiltrados.length > 0 && categoriaSeleccionada !== 'todos' && isMapReady) {
      const lats = localesFiltrados.map(l => l.coordenadas.lat);
      const lngs = localesFiltrados.map(l => l.coordenadas.lng);
      
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      webViewRef.current.injectJavaScript(`
        if (typeof map !== 'undefined') {
          var bounds = L.latLngBounds(
            L.latLng(${minLat}, ${minLng}),
            L.latLng(${maxLat}, ${maxLng})
          );
          map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1 });
        }
        true;
      `);
    }
  }, [categoriaSeleccionada, localesFiltrados, isMapReady]);

  const centerOnUser = () => {
    if (userLocation && webViewRef.current && isMapReady) {
      webViewRef.current.injectJavaScript(`
        if (typeof map !== 'undefined') {
          map.setView([${userLocation.lat}, ${userLocation.lng}], 18, { animate: true, duration: 1 });
        }
        true;
      `);
    }
  };

  const handleVerDetalles = (localId: string) => {
    console.log('[MAP v104.0] Navigating to local details:', localId);
    router.push(`/detalle/local?id=${localId}`);
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📨 [MAP v104.0] Received message from WebView:', data);
      
      if (data.type === 'navigate' && data.id) {
        handleVerDetalles(data.id);
      } else if (data.type === 'map_ready') {
        console.log('✅ [MAP v104.0] Map is ready for interactions');
        setIsMapReady(true);
      }
    } catch (error) {
      console.error('❌ [MAP v104.0] Error parsing WebView message:', error);
    }
  };

  // ✅ CRITICAL FIX v104.0: Calculate scaled sizes
  const categoryIconSize = Platform.OS === 'android' ? scaleIconSize(28) : 28;
  const controlButtonSize = Platform.OS === 'android' ? scaleIconSize(48) : 48;
  const controlIconSize = Platform.OS === 'android' ? scaleIconSize(24) : 24;
  const centerButtonSize = Platform.OS === 'android' ? scaleIconSize(56) : 56;
  const centerIconSize = Platform.OS === 'android' ? scaleIconSize(24) : 24;

  return (
    <View style={commonStyles.container}>
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          <View style={styles.webNotSupported}>
            <IconSymbol 
              ios_icon_name="map" 
              android_material_icon_name="map" 
              size={Platform.OS === 'android' ? scaleIconSize(64) : 64} 
              color={colors.textSecondary} 
            />
            <Text style={[styles.webNotSupportedText, { fontSize: scaleFontSize(18) }]}>
              Los mapas no están disponibles en la versión web de Natively.
            </Text>
            <Text style={[styles.webNotSupportedSubtext, { fontSize: scaleFontSize(14) }]}>
              Por favor, usa la aplicación móvil para ver el mapa.
            </Text>
          </View>
        ) : (
          <>
            {isLoadingMarkers && (
              <View style={styles.loadingOverlay}>
                <View style={styles.loadingContent}>
                  <View style={styles.mapIconContainer}>
                    <IconSymbol 
                      ios_icon_name="map.fill" 
                      android_material_icon_name="map" 
                      size={Platform.OS === 'android' ? scaleIconSize(64) : 64} 
                      color={colors.primary} 
                    />
                  </View>
                  <ActivityIndicator size="large" color={colors.primary} style={styles.loadingSpinner} />
                  <Text style={[styles.loadingText, { fontSize: scaleFontSize(18) }]}>Preparando mapa...</Text>
                </View>
              </View>
            )}
            {mapHTML && (
              <WebView
                ref={webViewRef}
                source={{ html: mapHTML }}
                style={styles.webview}
                onMessage={handleWebViewMessage}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('[MAP v104.0] WebView error:', nativeEvent);
                }}
              />
            )}
          </>
        )}
      </View>

      <View style={styles.headerContainer}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriasScroll}
            style={styles.categoriasContainer}
          >
            {CATEGORIAS_LOCALES.map((categoria) => (
              <TouchableOpacity
                key={categoria.id}
                style={styles.categoriaButton}
                onPress={() => setCategoriaSeleccionada(categoria.id)}
              >
                <View style={[
                  styles.categoriaIconContainer,
                  categoriaSeleccionada === categoria.id && styles.categoriaIconContainerActive
                ]}>
                  <IconSymbol 
                    ios_icon_name={categoria.icon as any}
                    android_material_icon_name={categoria.androidIcon}
                    size={categoryIconSize} 
                    color={categoriaSeleccionada === categoria.id ? '#FFFFFF' : colors.primary}
                  />
                </View>
                <Text style={[
                  styles.categoriaLabel,
                  { fontSize: scaleFontSize(12) },
                  categoriaSeleccionada === categoria.id && styles.categoriaLabelActive
                ]}>
                  {categoria.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </LinearGradient>
      </View>

      <View style={styles.controlsLeft}>
        {/* ✅ CRITICAL FIX v104.0: Fixed invalid icon name chevron_left → arrow_back */}
        <TouchableOpacity 
          style={[styles.controlButton, {
            width: controlButtonSize,
            height: controlButtonSize,
            borderRadius: controlButtonSize / 2,
          }]}
          onPress={() => router.back()}
        >
          <IconSymbol 
            ios_icon_name="chevron.left" 
            android_material_icon_name="arrow_back" 
            size={controlIconSize} 
            color={colors.text} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.controlButton, {
            width: controlButtonSize,
            height: controlButtonSize,
            borderRadius: controlButtonSize / 2,
          }]}
          onPress={() => setMostrarFiltros(true)}
        >
          <IconSymbol 
            ios_icon_name="line.3.horizontal.decrease.circle.fill" 
            android_material_icon_name="filter_list" 
            size={controlIconSize} 
            color={colors.primary} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.controlsRight}>
        <View style={styles.estadoSelectorContainer}>
          <View style={styles.estadoSelector}>
            <TouchableOpacity
              style={[
                styles.estadoOption,
                filtroEstado === 'todos' && styles.estadoOptionActive
              ]}
              onPress={() => setFiltroEstado('todos')}
            >
              <Text style={[
                styles.estadoOptionText,
                { fontSize: scaleFontSize(11) },
                filtroEstado === 'todos' && styles.estadoOptionTextActive
              ]}>
                Todos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.estadoOption,
                filtroEstado === 'abiertos' && styles.estadoOptionActive
              ]}
              onPress={() => setFiltroEstado('abiertos')}
            >
              <Text style={[
                styles.estadoOptionText,
                { fontSize: scaleFontSize(11) },
                filtroEstado === 'abiertos' && styles.estadoOptionTextActive
              ]}>
                Abiertos
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.leyenda}>
          <View style={styles.leyendaItem}>
            <View style={[styles.leyendaDot, { backgroundColor: '#22C55E' }]} />
            <Text style={[styles.leyendaText, { fontSize: scaleFontSize(10) }]}>Abierto</Text>
          </View>
          <View style={styles.leyendaItem}>
            <View style={[styles.leyendaDot, { backgroundColor: '#EF4444' }]} />
            <Text style={[styles.leyendaText, { fontSize: scaleFontSize(10) }]}>Cerrado</Text>
          </View>
          <View style={styles.leyendaItem}>
            <View style={[styles.leyendaDot, { backgroundColor: '#9CA3AF' }]} />
            <Text style={[styles.leyendaText, { fontSize: scaleFontSize(10) }]}>S/Info</Text>
          </View>
        </View>
      </View>

      {/* ✅ CRITICAL FIX v104.0: Center button repositioned to bottom-right corner on Android */}
      <TouchableOpacity 
        style={[styles.centerButton, {
          width: centerButtonSize,
          height: centerButtonSize,
          borderRadius: centerButtonSize / 2,
          // ✅ CRITICAL FIX v104.0: Position above bottom nav (100px from bottom on both platforms)
          bottom: 100,
          right: 16,
        }]}
        onPress={centerOnUser}
      >
        <IconSymbol 
          ios_icon_name="location.fill" 
          android_material_icon_name="my_location" 
          size={centerIconSize} 
          color={colors.primary} 
        />
      </TouchableOpacity>

      <FiltrosAvanzadosSheet
        visible={mostrarFiltros}
        onClose={() => setMostrarFiltros(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#A8E0FF',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  mapIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loadingSpinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  webNotSupported: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.background,
  },
  webNotSupportedText: {
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: 16,
  },
  webNotSupportedSubtext: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 12,
  },
  categoriasContainer: {
    flexGrow: 0,
  },
  categoriasScroll: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  categoriaIconContainerActive: {
    borderColor: colors.primary,
    backgroundColor: '#00FF88',
    shadowOpacity: 0.25,
  },
  categoriaLabel: {
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
  },
  categoriaLabelActive: {
    color: colors.white,
    fontWeight: '700',
  },
  controlsLeft: {
    position: 'absolute',
    left: 16,
    top: Platform.OS === 'ios' ? 180 : 170,
    gap: 12,
    zIndex: 5,
  },
  controlsRight: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'ios' ? 180 : 170,
    gap: 12,
    zIndex: 5,
    alignItems: 'center',
  },
  controlButton: {
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  estadoSelectorContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  estadoSelector: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 2,
    borderWidth: 1.5,
    borderColor: colors.primary + '30',
  },
  estadoOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    minWidth: 65,
    alignItems: 'center',
  },
  estadoOptionActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  estadoOptionText: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  estadoOptionTextActive: {
    color: colors.headerText,
    fontWeight: '700',
  },
  leyenda: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leyendaItem: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  leyendaDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  leyendaText: {
    fontWeight: '600',
    color: colors.text,
  },
  centerButton: {
    position: 'absolute',
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 5,
  },
});
