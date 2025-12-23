
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
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
import { mapCache } from '@/utils/mapCache';
import { useGlobalData } from '@/contexts/GlobalDataContext';

const { width } = Dimensions.get('window');

const CATEGORIAS_LOCALES = [
  { id: 'todos', label: 'Todos', icon: 'mappin.circle.fill' },
  { id: 'cafe', label: 'Cafés', icon: 'cup.and.saucer.fill' },
  { id: 'restaurante', label: 'Restaurantes', icon: 'fork.knife' },
  { id: 'bar', label: 'Bares', icon: 'wineglass.fill' },
  { id: 'pub', label: 'Pubs', icon: 'mug.fill' },
  { id: 'cocteleria', label: 'Coctelería', icon: 'wineglass' },
  { id: 'discoteca', label: 'Discotecas', icon: 'music.note' },
];

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
 * ✅ MAP SCREEN v2.0 - INSTANT LOADING WITH ZERO-WAIT
 * 
 * Features:
 * - ✅ NO "Cargando mapa..." message - instant display
 * - ✅ Uses cached data from GlobalDataContext (same as Lista de Locales)
 * - ✅ Background sync for fresh data without blocking UI
 * - ✅ Synchronized with FilterContext for instant filter updates
 * - ✅ Shares data with Lista de Locales - no duplicate API calls
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

  // ✅ Get user location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[MAP] Permission to access location was denied');
        setUserLocation({ lat: 40.4168, lng: -3.7038 });
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    })();
  }, []);

  // ✅ INSTANT LOAD: Use data from GlobalDataContext (same as Lista de Locales)
  useEffect(() => {
    console.log('⚡ [MAP] ========================================');
    console.log('⚡ [MAP] INSTANT LOAD from GlobalDataContext');
    console.log('⚡ [MAP] Total locales available:', globalLocales.length);
    
    if (globalLocales.length > 0) {
      // Transform global locales to map format
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      
      // Load events in background
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

          // Transform locales with events
          const localesTransformados: LocalWithEvent[] = globalLocales.map((local) => {
            const evento = eventsByLocal.get(local.id) || null;

            return {
              ...local,
              evento,
              plan: null, // Will be loaded in background if needed
            };
          });

          setTodosLosLocales(localesTransformados);
          console.log(`⚡ [MAP] INSTANT display ready with ${localesTransformados.length} locals`);
        });
    }
  }, [globalLocales]);

  // ✅ BACKGROUND SYNC: Refresh data silently in background
  useEffect(() => {
    const backgroundRefresh = async () => {
      console.log('🔄 [MAP] Background refresh triggered');
      await refreshData(true); // Silent refresh
    };

    // Refresh every 2 minutes in background
    const interval = setInterval(backgroundRefresh, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshData]);

  const markersData = useMemo(() => {
    const checkInsByLocal = new Map<string, { isUserHere: boolean; friendsCount: number }>();
    
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

      const checkInInfo = checkInsByLocal.get(local.id) || { isUserHere: false, friendsCount: 0 };
      
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
        isUserHere: checkInInfo.isUserHere,
        friendsHereCount: checkInInfo.friendsCount,
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
        console.error('[MAP] Error loading check-ins:', error);
      }
    }

    console.log(`[MAP] 🗺️ ========================================`);
    console.log(`[MAP] 🗺️ GENERATING MAP HTML`);
    console.log(`[MAP] 🗺️ Total markers to display: ${markersData.length}`);
    console.log(`[MAP] 🗺️ Center: ${centerLat}, ${centerLng}`);
    console.log(`[MAP] 🗺️ ========================================`);

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
    
    .custom-marker {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      border: 3px solid #FFFFFF;
      transition: transform 0.2s;
      cursor: pointer;
      position: relative;
    }
    .custom-marker-destacado {
      width: 52px;
      height: 52px;
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
    
    .event-indicator {
      position: absolute;
      top: -6px;
      right: -6px;
      width: 20px;
      height: 20px;
      background-color: #FACC15;
      border-radius: 50%;
      border: 2px solid #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
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
      width: 280px !important;
      font-size: 14px;
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
      height: 140px;
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
      font-size: 48px;
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
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 4px;
      z-index: 11;
      border: 2px solid #FFFFFF;
    }
    
    .popup-event-banner {
      background: linear-gradient(135deg, #14B8A6 0%, #0D9488 100%);
      padding: 12px;
      color: white;
      margin-bottom: 12px;
    }
    .popup-event-banner-live {
      background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
    }
    .popup-event-title {
      font-size: 14px;
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
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .popup-event-image {
      width: 100%;
      height: 80px;
      object-fit: cover;
      border-radius: 6px;
      margin-top: 8px;
    }
    
    .popup-info {
      padding: 12px;
    }
    .popup-title {
      font-size: 16px;
      fontWeight: 500;
      margin-bottom: 6px;
      color: #202124;
      line-height: 20px;
    }
    .popup-estado {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
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
      font-size: 13px;
      color: #70757A;
    }
    .popup-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: #14B8A6;
      color: #FFFFFF !important;
      padding: 10px;
      border-radius: 4px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
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
      console.log('[MAP HTML] ========================================');
      console.log('[MAP HTML] Initializing map with ${markersData.length} markers');
      
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

      var markersData = ${JSON.stringify(markersData)};
      
      console.log('[MAP HTML] Markers data loaded:', markersData.length);
      
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
      
      var markersCreated = 0;
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
          iconSize: data.destacado ? [52, 52] : [44, 44]
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
            
            categoriasHtml += '<span style="background-color: rgba(20, 184, 166, 0.15); color: #14B8A6; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">' +
              catIcon + ' ' + cat.charAt(0).toUpperCase() + cat.slice(1) +
            '</span>';
          });
          categoriasHtml += '</div>';
        }
        
        var checkInBadgesHtml = '';
        if (data.isUserHere || data.friendsHereCount > 0) {
          checkInBadgesHtml = '<div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;">';
          if (data.isUserHere) {
            checkInBadgesHtml += '<span style="background-color: rgba(16, 185, 129, 0.2); color: #10B981; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; border: 1px solid rgba(16, 185, 129, 0.4);">' +
              '📍 Tú estás aquí' +
            '</span>';
          }
          if (data.friendsHereCount > 0) {
            checkInBadgesHtml += '<span style="background-color: rgba(20, 184, 166, 0.2); color: #14B8A6; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; border: 1px solid rgba(20, 184, 166, 0.4);">' +
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
          maxWidth: 280,
          className: 'custom-popup',
          closeButton: true,
          offset: [0, -10]
        });

        marker.on('popupopen', function(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'popup_opened',
            id: data.id
          }));
        });

        marker.on('click', function(e) {
          marker.openPopup();
          
          setTimeout(function() {
            var popupHeight = 280;
            var mapSize = map.getSize();
            var pixelOffset = popupHeight / 2;
            var zoom = Math.max(map.getZoom(), 16);
            var latOffset = (pixelOffset / mapSize.y) * 0.01;
            var newLat = data.lat + latOffset;
            
            map.setView([newLat, data.lng], zoom, {
              animate: true,
              duration: 0.5,
              easeLinearity: 0.25
            });
          }, 100);
        });

        markers.addLayer(marker);
        markersCreated++;
      });

      map.addLayer(markers);
      
      console.log('[MAP HTML] ========================================');
      console.log('[MAP HTML] Map initialized successfully');
      console.log('[MAP HTML] Total markers created:', markersCreated);
      console.log('[MAP HTML] ========================================');
      
      setTimeout(function() {
        map.invalidateSize();
      }, 100);
      
    } catch (error) {
      console.error('[MAP HTML] Map initialization error:', error);
    }
  </script>
</body>
</html>
    `;
  }, [markersData, user, userLocation]);

  useEffect(() => {
    const generateHTML = async () => {
      const html = await generateMapHTML();
      setMapHTML(html);
    };
    
    if (localesFiltrados.length > 0) {
      generateHTML();
    }
  }, [localesFiltrados, user, generateMapHTML]);

  // ✅ SYNCHRONIZED FILTERS: Apply global filters from FilterContext
  useEffect(() => {
    console.log('[MAP] 🔍 ========================================');
    console.log('[MAP] 🔍 FILTERING LOCALS FOR MAP DISPLAY');
    console.log('[MAP] 🔍 Selected category:', categoriaSeleccionada);
    console.log('[MAP] 🔍 Filter state:', filtroEstado);
    console.log('[MAP] 🔍 Global filters:', globalFiltros);
    console.log('[MAP] 📊 Total locals to filter:', todosLosLocales.length);
    
    let filtrados = todosLosLocales.filter(local => {
      // Category filter
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
      
      // Open/Closed filter
      let matchEstado = true;
      if (filtroEstado === 'abiertos') {
        const estado = getEstadoLocal(local);
        matchEstado = estado.estaAbierto === true;
      }
      
      // ✅ SYNCHRONIZED: Apply global filters from FilterContext
      let matchGlobalFilters = true;
      
      // Community filter
      if (globalFiltros.comunidad && globalFiltros.comunidad !== 'Todas las Comunidades') {
        matchGlobalFilters = matchGlobalFilters && local.comunidad === globalFiltros.comunidad;
      }
      
      // Province filter
      if (globalFiltros.provincia) {
        matchGlobalFilters = matchGlobalFilters && local.provincia === globalFiltros.provincia;
      }
      
      // Type filter
      if (globalFiltros.tipo && globalFiltros.tipo.length > 0) {
        const hasMatchingType = globalFiltros.tipo.some(tipo => 
          localCategories.some((cat: string) => cat.toLowerCase() === tipo.toLowerCase())
        );
        matchGlobalFilters = matchGlobalFilters && hasMatchingType;
      }
      
      // Services filter
      if (globalFiltros.servicios && globalFiltros.servicios.length > 0) {
        const localServices = local.servicios_disponibles || {};
        const hasMatchingService = globalFiltros.servicios.some(servicio => 
          localServices[servicio] === true
        );
        matchGlobalFilters = matchGlobalFilters && hasMatchingService;
      }
      
      // Ambiente filter
      if (globalFiltros.ambiente && globalFiltros.ambiente.length > 0 && !globalFiltros.ambiente.includes('cualquiera')) {
        const localAmbiente = local.ambiente_google || {};
        const hasMatchingAmbiente = globalFiltros.ambiente.some(amb => 
          localAmbiente[amb] === true
        );
        matchGlobalFilters = matchGlobalFilters && hasMatchingAmbiente;
      }
      
      return matchCategoria && matchEstado && matchGlobalFilters;
    });
    
    console.log(`[MAP] ✅ Filtered locals: ${filtrados.length} of ${todosLosLocales.length}`);
    
    setLocalesFiltrados(filtrados);
  }, [todosLosLocales, categoriaSeleccionada, filtroEstado, globalFiltros]);

  useEffect(() => {
    if (webViewRef.current && localesFiltrados.length > 0 && categoriaSeleccionada !== 'todos') {
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
  }, [categoriaSeleccionada, localesFiltrados]);

  const centerOnUser = () => {
    if (userLocation && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (typeof map !== 'undefined') {
          map.setView([${userLocation.lat}, ${userLocation.lng}], 18, { animate: true, duration: 1 });
        }
        true;
      `);
    }
  };

  const handleVerDetalles = (localId: string) => {
    console.log('[MAP] Navigating to local details:', localId);
    router.push(`/detalle/local?id=${localId}`);
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📨 [MAP] Received message from WebView:', data);
      
      if (data.type === 'navigate' && data.id) {
        console.log('🗺️ [MAP] Navigating to local details:', data.id);
        handleVerDetalles(data.id);
      } else if (data.type === 'popup_opened' && data.id) {
        console.log('📍 [MAP] Popup opened for local:', data.id);
      } else if (data.type === 'zoom_close' && data.id) {
        console.log('🔍 [MAP] Zoomed close to local:', data.id);
      }
    } catch (error) {
      console.error('❌ [MAP] Error parsing WebView message:', error);
    }
  };

  // ✅ INSTANT DISPLAY: Show map immediately with cached/global data
  const initialMapHTML = useMemo(() => {
    const centerLat = userLocation?.lat || 40.4168;
    const centerLng = userLocation?.lng || -3.7038;
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; background-color: #A8E0FF; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${centerLat}, ${centerLng}], 11);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
  </script>
</body>
</html>
    `;
  }, [userLocation]);

  return (
    <View style={commonStyles.container}>
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          <View style={styles.webNotSupported}>
            <IconSymbol ios_icon_name="map" android_material_icon_name="map" size={64} color={colors.textSecondary} />
            <Text style={styles.webNotSupportedText}>
              Los mapas no están disponibles en la versión web de Natively.
            </Text>
            <Text style={styles.webNotSupportedSubtext}>
              Por favor, usa la aplicación móvil para ver el mapa.
            </Text>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ html: mapHTML || initialMapHTML }}
            style={styles.webview}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('[MAP] WebView error:', nativeEvent);
            }}
          />
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
                    android_material_icon_name={categoria.icon as any}
                    size={28} 
                    color={categoriaSeleccionada === categoria.id ? '#FFFFFF' : colors.primary}
                  />
                </View>
                <Text style={[
                  styles.categoriaLabel,
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
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => router.back()}
        >
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="chevron_left" size={24} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => setMostrarFiltros(true)}
        >
          <IconSymbol ios_icon_name="line.3.horizontal.decrease.circle.fill" android_material_icon_name="filter_list" size={24} color={colors.primary} />
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
            <Text style={styles.leyendaText}>Abierto</Text>
          </View>
          <View style={styles.leyendaItem}>
            <View style={[styles.leyendaDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.leyendaText}>Cerrado</Text>
          </View>
          <View style={styles.leyendaItem}>
            <View style={[styles.leyendaDot, { backgroundColor: '#9CA3AF' }]} />
            <Text style={styles.leyendaText}>S/Info</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.centerButton}
        onPress={centerOnUser}
      >
        <IconSymbol ios_icon_name="location.fill" android_material_icon_name="my_location" size={24} color={colors.primary} />
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
  webNotSupported: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.background,
  },
  webNotSupportedText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: 16,
  },
  webNotSupportedSubtext: {
    fontSize: 14,
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
    fontSize: 12,
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
    width: 48,
    height: 48,
    borderRadius: 24,
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
    fontSize: 11,
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
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
  },
  centerButton: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
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
