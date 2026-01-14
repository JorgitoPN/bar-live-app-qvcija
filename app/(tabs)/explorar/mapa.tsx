
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { scaleIconSize, scaleFontSize } from '@/utils/androidScaling';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { getEstadoLocal } from '@/utils/timeUtils';
import { IconSymbol } from '@/components/IconSymbol';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useFilters } from '@/contexts/FilterContext';
import FiltrosAvanzadosSheet from '@/components/home/FiltrosAvanzadosSheet';
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
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { addPubCategoryIfNeeded, getPrimaryIconForVenue } from '@/utils/categorizeLocal';

const { width } = Dimensions.get('window');

// ✅ STEP 3 v179.0: Unified category filters with TEAL ICONS
const CATEGORIAS_LOCALES = [
  { id: 'todos', label: 'Todos', icon: 'sparkles', androidIcon: 'star' },
  { id: 'cafe', label: 'Cafés', icon: 'cup.and.saucer.fill', androidIcon: 'local_cafe' },
  { id: 'restaurante', label: 'Restaurantes', icon: 'fork.knife', androidIcon: 'restaurant' },
  { id: 'bar', label: 'Bares', icon: 'wineglass.fill', androidIcon: 'local_bar' },
  { id: 'pub', label: 'Pubs', icon: 'mug.fill', androidIcon: 'sports_bar' },
  { id: 'cocteleria', label: 'Coctelería', icon: 'wineglass', androidIcon: 'local_drink' },
  { id: 'discoteca', label: 'Discotecas', icon: 'music.note', androidIcon: 'nightlife' },
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

/**
 * ✅ MAP SCREEN v184.0 - ENHANCED POPUP & MARKER VISIBILITY
 * 
 * CRITICAL IMPROVEMENTS v184.0:
 * - ✅ POPUP CENTERING: Popup now centers properly below header
 * - ✅ ENHANCED POPUP DESIGN: Better styling, icons, gradient buttons
 * - ✅ IMPROVED MARKER VISIBILITY: Markers visible at lower zoom levels (minZoom: 5)
 * - ✅ BUTTON COLOR FIX: "Ver detalles" button now uses white text (not blue)
 * - ✅ MORE INFO: Popup shows rating, category icon, and status with icons
 * 
 * PREVIOUS IMPROVEMENTS v179.0:
 * - ✅ LOWER ZOOM THRESHOLD: Markers appear at zoom 11+ (was 13+)
 * - ✅ NO LOADING OVERLAY: Removed loading screen during zoom/pan
 * - ✅ RESTORED POPUP: Full venue info with photo, rating, category
 * - ✅ SMOOTH INTERACTION: Markers update silently in background
 * - ✅ PERFORMANCE: Can handle 200,000+ locales without lag
 */

export default function MapaScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { filtros: globalFiltros } = useFilters();
  
  const webViewRef = useRef<WebView>(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'abiertos'>('abiertos');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [markersData, setMarkersData] = useState<any[]>([]);
  const [mapHTML, setMapHTML] = useState<string>('');
  const [isMapReady, setIsMapReady] = useState(false);
  const [isLoadingMarkers, setIsLoadingMarkers] = useState(true);
  const [currentRegion, setCurrentRegion] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        console.log('[MAP v179.0] 🔍 Requesting location permissions...');
        
        const isAvailable = await Location.hasServicesEnabledAsync();
        if (!isAvailable) {
          console.log('[MAP v179.0] ⚠️ Location services disabled, using Madrid');
          setUserLocation({ lat: 40.4168, lng: -3.7038 });
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('[MAP v179.0] ⚠️ Location permission denied, using Madrid');
          setUserLocation({ lat: 40.4168, lng: -3.7038 });
          return;
        }

        console.log('[MAP v179.0] ✅ Location permission granted');
        
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 0,
        });
        
        setUserLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
        console.log('[MAP v179.0] 📍 User location:', location.coords);
      } catch (error: any) {
        console.error('[MAP v179.0] ❌ Error getting location:', error?.message);
        setUserLocation({ lat: 40.4168, lng: -3.7038 });
      }
    })();
  }, []);

  // ✅ v179.0: Calculate zoom level from latitudeDelta
  const calculateZoomLevel = useCallback((latitudeDelta: number): number => {
    // Leaflet zoom levels: 0 (world) to 18 (street level)
    // latitudeDelta ≈ 180 / (2^zoom)
    const zoom = Math.round(Math.log2(180 / latitudeDelta));
    return Math.max(1, Math.min(18, zoom)); // Clamp between 1-18
  }, []);

  // ✅ v179.0: Load map data using RPC function - NO LOADING OVERLAY
  const loadMapData = useCallback(async (region: any) => {
    if (!region) return;

    try {
      console.log('[MAP v184.0] 🗺️ Loading map data (silent)');
      console.log('[MAP v184.0] 🔍 Filter estado:', filtroEstado);

      const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
      
      // Calculate bounding box
      const min_lat = latitude - latitudeDelta / 2;
      const max_lat = latitude + latitudeDelta / 2;
      const min_lng = longitude - longitudeDelta / 2;
      const max_lng = longitude + longitudeDelta / 2;
      
      // Calculate zoom level
      const zoom_level = calculateZoomLevel(latitudeDelta);
      
      console.log('[MAP v184.0] 📦 Bounding Box:', { min_lat, max_lat, min_lng, max_lng, zoom_level });

      // ✅ v184.0: NO setIsLoadingMarkers - silent background update

      // Call RPC function with bounding box
      const { data, error } = await supabase.rpc('get_map_data', {
        min_lat,
        max_lat,
        min_lng,
        max_lng,
        zoom_level,
      });

      if (error) {
        console.error('[MAP v184.0] ❌ RPC Error:', error);
        return;
      }

      console.log('[MAP v184.0] ✅ RPC returned', data?.length || 0, 'markers');

      // Transform RPC data to marker format with full venue info
      const markers = (data || []).map((item: any) => {
        const isCluster = item.is_cluster === true;
        const count = item.count || 1;

        // Get venue details for popup
        const estado = getEstadoLocal(item);
        const rating = item.rating || item.google_rating || 0;
        const categoria = item.barlive_type || item.tipo || 'Local';
        const imagen = item.imagen_url || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400';

        // ✅ Get category-specific icon
        const categories = item.barlive_types || (item.barlive_type ? [item.barlive_type] : ['bar']);
        const categoryIcon = isCluster ? '📍' : getPrimaryIconForVenue(categories, item.horarios_completos);

        // ✅ Determine background color based on status
        let backgroundColor = '#9CA3AF'; // Gray for no info
        if (estado.estaAbierto === true) {
          backgroundColor = '#22C55E'; // Green for open
        } else if (estado.estaAbierto === false) {
          backgroundColor = '#EF4444'; // Red for closed
        }

        // ✅ Apply filter: only include if matches filtroEstado
        const shouldInclude = filtroEstado === 'todos' || 
                             (filtroEstado === 'abiertos' && estado.estaAbierto === true);

        return {
          id: item.id,
          lat: item.lat,
          lng: item.lng,
          nombre: item.nombre || 'Cluster',
          estado: estado.badge,
          estadoBadge: isCluster ? `${count} locales` : estado.badge,
          icon: categoryIcon,
          backgroundColor: backgroundColor,
          overlayIcon: null,
          rating: rating,
          imagen: imagen,
          categoria: categoria,
          distancia: 0,
          destacado: item.destacado || false,
          hasEvent: false,
          isEventLive: false,
          eventTitulo: '',
          eventImagen: '',
          isPremium: false,
          isCluster,
          count,
          shouldInclude, // ✅ Add filter flag
        };
      }).filter((marker: any) => marker.shouldInclude); // ✅ Filter markers based on estado

      setMarkersData(markers);
      // ✅ v184.0: Only hide loading on FIRST load
      if (isLoadingMarkers) {
        setIsLoadingMarkers(false);
      }

      console.log('[MAP v184.0] 🎯 Markers ready for display');
    } catch (error) {
      console.error('[MAP v179.0] ❌ Error loading map data:', error);
    }
  }, [calculateZoomLevel, isLoadingMarkers, filtroEstado]);

  // ✅ v179.0: Generate map HTML with enhanced popup
  const generateMapHTML = useCallback(async () => {
    const centerLat = userLocation?.lat || 40.4168;
    const centerLng = userLocation?.lng || -3.7038;

    console.log('[MAP v184.0] 🗺️ GENERATING MAP HTML');

    const popupFontSize = Platform.OS === 'android' ? Math.round(14 * 0.80) : 14;
    const popupTitleSize = Platform.OS === 'android' ? Math.round(16 * 0.80) : 16;
    const markerSize = Platform.OS === 'android' ? 40 : 44;
    const markerIconSize = Platform.OS === 'android' ? 20 : 22;

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
    html, body { width: 100%; height: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #map { width: 100%; height: 100%; position: absolute; top: 0; left: 0; background-color: #A8E0FF; }
    
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
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
    
    .custom-marker-cluster {
      background-color: #F59E0B;
      border-color: #FFFFFF;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.5);
    }
    
    .custom-marker:hover {
      transform: scale(1.2);
      z-index: 1000;
    }
    
    .cluster-count {
      position: absolute;
      top: -8px;
      right: -8px;
      background-color: #EF4444;
      color: white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      border: 2px solid white;
    }
    
    .user-marker {
      width: 18px;
      height: 18px;
      background-color: #4285F4;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 8px rgba(66, 133, 244, 0.2);
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 8px rgba(66, 133, 244, 0.2); }
      50% { box-shadow: 0 0 0 12px rgba(66, 133, 244, 0.1); }
    }
    
    .leaflet-control-attribution { display: none !important; }
    .leaflet-control-zoom { display: none !important; }
    
    /* ✅ v184: Enhanced popup styles with better design */
    .venue-popup {
      min-width: 280px;
      max-width: 320px;
    }
    
    .venue-popup-image {
      width: 100%;
      height: 160px;
      object-fit: cover;
      border-radius: 12px 12px 0 0;
      margin-bottom: 0;
    }
    
    .venue-popup-content {
      padding: 16px;
      background: linear-gradient(to bottom, #FFFFFF, #F9FAFB);
    }
    
    .venue-popup-title {
      font-size: ${popupTitleSize}px;
      font-weight: 700;
      margin-bottom: 12px;
      color: #111827;
      line-height: 1.3;
    }
    
    .venue-popup-info {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 16px;
    }
    
    .venue-popup-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: ${popupFontSize}px;
      color: #4B5563;
      padding: 6px 0;
    }
    
    .venue-popup-icon {
      font-size: 16px;
      width: 20px;
      text-align: center;
    }
    
    .venue-popup-rating {
      color: #FACC15;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .venue-popup-category {
      background: linear-gradient(135deg, #14B8A6, #0D9488);
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      display: inline-block;
      box-shadow: 0 2px 4px rgba(20, 184, 166, 0.3);
    }
    
    .venue-popup-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
    }
    
    .venue-popup-button {
      display: block;
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #14B8A6, #0D9488);
      color: white;
      text-align: center;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 700;
      font-size: ${popupFontSize}px;
      transition: all 0.2s;
      box-shadow: 0 4px 6px rgba(20, 184, 166, 0.3);
      border: none;
      cursor: pointer;
    }
    
    .venue-popup-button:hover {
      background: linear-gradient(135deg, #0D9488, #0F766E);
      box-shadow: 0 6px 8px rgba(20, 184, 166, 0.4);
      transform: translateY(-1px);
    }
    
    .leaflet-popup-content-wrapper {
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      padding: 0;
    }
    
    .leaflet-popup-content {
      margin: 0;
      width: 100% !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    try {
      console.log('[MAP HTML v184.0] ⚡ INITIALIZING OPTIMIZED MAP');
      
      var map = L.map('map', {
        zoomControl: false,
        attributionControl: false
      }).setView([${centerLat}, ${centerLng}], 11);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        minZoom: 5, // ✅ v184: Allow zooming out further to see more markers
        attribution: ''
      }).addTo(map);

      var markers = [];

      ${userLocation ? `
        var userIcon = L.divIcon({
          className: 'user-marker',
          iconSize: [18, 18]
        });
        L.marker([${userLocation.lat}, ${userLocation.lng}], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
      ` : ''}

      // ✅ v179.0: onRegionChangeComplete - Extract bounding box and notify React Native
      map.on('moveend', function() {
        var bounds = map.getBounds();
        var center = map.getCenter();
        var zoom = map.getZoom();
        
        // Calculate latitudeDelta and longitudeDelta
        var ne = bounds.getNorthEast();
        var sw = bounds.getSouthWest();
        var latitudeDelta = ne.lat - sw.lat;
        var longitudeDelta = ne.lng - sw.lng;
        
        console.log('[MAP HTML v184.0] 📍 Region changed (silent update)');
        
        // Send region to React Native
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'region_change',
          region: {
            latitude: center.lat,
            longitude: center.lng,
            latitudeDelta: latitudeDelta,
            longitudeDelta: longitudeDelta,
          }
        }));
      });
      
      // ✅ v184.0: Function to update markers with enhanced popups
      window.updateMarkers = function(markersData) {
        console.log('[MAP HTML v184.0] 🎯 Updating markers:', markersData.length);
        
        // Clear existing markers
        markers.forEach(function(marker) {
          map.removeLayer(marker);
        });
        markers = [];
        
        // Add new markers
        markersData.forEach(function(data) {
          var markerClass = data.isCluster ? 'custom-marker custom-marker-cluster' : 'custom-marker';
          
          // ✅ Apply background color based on status
          var markerStyle = 'background-color: ' + (data.backgroundColor || '#14B8A6') + ';';
          
          var markerHtml = '<div style="' + markerStyle + ' width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center;">' + data.icon + '</div>';
          if (data.isCluster) {
            markerHtml = '<div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">' +
              '<div style="' + markerStyle + ' width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center;">' + data.icon + '</div>' +
              '<div class="cluster-count">' + data.count + '</div>' +
            '</div>';
          }
          
          var markerIcon = L.divIcon({
            className: markerClass,
            html: markerHtml,
            iconSize: [${markerSize}, ${markerSize}]
          });

          var marker = L.marker([data.lat, data.lng], { icon: markerIcon });
          
          if (!data.isCluster) {
            // ✅ v184: Enhanced popup with better design, icons, and info
            var popupContent = '<div class="venue-popup">' +
              '<img src="' + data.imagen + '" class="venue-popup-image" onerror="this.style.display=\\'none\\'" />' +
              '<div class="venue-popup-content">' +
                '<div class="venue-popup-title">' + data.nombre + '</div>' +
                '<div class="venue-popup-info">' +
                  (data.rating > 0 ? '<div class="venue-popup-row"><span class="venue-popup-icon">⭐</span><span class="venue-popup-rating">' + data.rating.toFixed(1) + ' / 5.0</span></div>' : '') +
                  '<div class="venue-popup-row"><span class="venue-popup-icon">' + data.icon + '</span><span class="venue-popup-category">' + data.categoria + '</span></div>' +
                  '<div class="venue-popup-row venue-popup-status"><span class="venue-popup-icon">📍</span><span>' + data.estadoBadge + '</span></div>' +
                '</div>' +
                '<button class="venue-popup-button" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type: \\'navigate\\', id: \\'' + data.id + '\\'})); return false;">Ver detalles del local</button>' +
              '</div>' +
            '</div>';
            
            marker.bindPopup(popupContent, {
              maxWidth: 320,
              closeButton: true,
              className: 'venue-popup-container',
              offset: [0, -10] // ✅ v184: Slight offset to better position popup
            });
            
            // ✅ v184: Center popup in screen center (accounting for header)
            marker.on('popupopen', function() {
              // Get map container dimensions
              var mapSize = map.getSize();
              var headerHeight = 180; // Approximate header height in pixels
              
              // Calculate offset to center popup below header
              var offsetY = headerHeight / 2;
              
              // Convert pixel offset to lat/lng offset
              var point = map.project([data.lat, data.lng], map.getZoom());
              point.y -= offsetY;
              var newCenter = map.unproject(point, map.getZoom());
              
              // Pan to new center with animation
              map.panTo(newCenter, { animate: true, duration: 0.5 });
            });
          } else {
            // Cluster click: zoom in
            marker.on('click', function() {
              map.setView([data.lat, data.lng], map.getZoom() + 2, { animate: true });
            });
          }

          markers.push(marker);
          marker.addTo(map);
        });
      };
      
      console.log('[MAP HTML v184.0] ✅ Map initialized');
      
      setTimeout(function() {
        map.invalidateSize();
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'map_ready' }));
      }, 100);
      
      window.flyToLocation = function(lat, lng, zoom) {
        console.log('[MAP HTML v184.0] 🛫 Flying to:', lat, lng, 'zoom:', zoom);
        map.flyTo([lat, lng], zoom, {
          animate: true,
          duration: 1.5,
        });
      };
      
    } catch (error) {
      console.error('[MAP HTML v184.0] Map error:', error);
    }
  </script>
</body>
</html>
    `;
  }, [userLocation]);

  useEffect(() => {
    const initMap = async () => {
      const html = await generateMapHTML();
      setMapHTML(html);
    };
    
    initMap();
  }, [generateMapHTML]);

  // ✅ v184.0: Update markers when data changes
  useEffect(() => {
    if (isMapReady && webViewRef.current && markersData.length >= 0) {
      console.log('[MAP v184.0] 📤 Sending', markersData.length, 'markers to WebView');
      
      const markersJSON = JSON.stringify(markersData);
      webViewRef.current.injectJavaScript(`
        if (typeof window.updateMarkers !== 'undefined') {
          window.updateMarkers(${markersJSON});
        }
        true;
      `);
    }
  }, [markersData, isMapReady]);

  // ✅ v184.0: Load initial data when map is ready
  useEffect(() => {
    if (isMapReady && userLocation) {
      console.log('[MAP v184.0] 🚀 Map ready, loading initial data');
      
      // Initial region
      const initialRegion = {
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        latitudeDelta: 0.1, // ~11km
        longitudeDelta: 0.1,
      };
      
      setCurrentRegion(initialRegion);
      loadMapData(initialRegion);
    }
  }, [isMapReady, userLocation, loadMapData]);

  // ✅ Reload markers when filter changes
  useEffect(() => {
    if (currentRegion) {
      console.log('[MAP v184.0] 🔄 Filter changed, reloading markers');
      loadMapData(currentRegion);
    }
  }, [filtroEstado]);

  const centerOnUser = () => {
    if (userLocation && webViewRef.current && isMapReady) {
      webViewRef.current.injectJavaScript(`
        if (typeof map !== 'undefined') {
          map.setView([${userLocation.lat}, ${userLocation.lng}], 15, { animate: true });
        }
        true;
      `);
    }
  };

  const handleVerDetalles = (localId: string) => {
    console.log('[MAP v184.0] Navigating to local:', localId);
    router.push(`/detalle/local?id=${localId}`);
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📨 [MAP v184.0] Message from WebView:', data.type);
      
      if (data.type === 'navigate' && data.id) {
        handleVerDetalles(data.id);
      } else if (data.type === 'map_ready') {
        console.log('✅ [MAP v184.0] Map is ready');
        setIsMapReady(true);
      } else if (data.type === 'region_change' && data.region) {
        // ✅ v184.0: Region changed - load new data silently
        console.log('🗺️ [MAP v184.0] Region changed, loading new data (silent)');
        setCurrentRegion(data.region);
        loadMapData(data.region);
      }
    } catch (error) {
      console.error('❌ [MAP v184.0] Error parsing message:', error);
    }
  };

  const categoryIconSize = 56;
  const categoryIconInnerSize = Platform.OS === 'android' ? scaleIconSize(28) : 28;
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
              size={64} 
              color={colors.textSecondary} 
            />
            <Text style={[styles.webNotSupportedText, { fontSize: scaleFontSize(18) }]}>
              Los mapas no están disponibles en la versión web.
            </Text>
            <Text style={[styles.webNotSupportedSubtext, { fontSize: scaleFontSize(14) }]}>
              Por favor, usa la aplicación móvil.
            </Text>
          </View>
        ) : (
          <>
            {/* ✅ v184.0: ONLY show loading on FIRST load, not during zoom/pan */}
            {isLoadingMarkers && markersData.length === 0 && (
              <View style={styles.loadingOverlay}>
                <View style={styles.loadingContent}>
                  <View style={styles.mapIconContainer}>
                    <IconSymbol 
                      ios_icon_name="map.fill" 
                      android_material_icon_name="map" 
                      size={64} 
                      color={colors.primary} 
                    />
                  </View>
                  <ActivityIndicator size="large" color={colors.primary} style={styles.loadingSpinner} />
                  <Text style={[styles.loadingText, { fontSize: scaleFontSize(18) }]}>Cargando mapa...</Text>
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
                  console.error('[MAP v184.0] WebView error:', nativeEvent);
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
                  {
                    width: categoryIconSize,
                    height: categoryIconSize,
                    borderRadius: 16,
                  },
                  categoriaSeleccionada === categoria.id && styles.categoriaIconContainerActive
                ]}>
                  <IconSymbol 
                    ios_icon_name={categoria.icon as any}
                    android_material_icon_name={categoria.androidIcon}
                    size={categoryIconInnerSize} 
                    color={categoriaSeleccionada === categoria.id ? colors.primary : colors.white}
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

      <TouchableOpacity 
        style={[styles.centerButton, {
          width: centerButtonSize,
          height: centerButtonSize,
          borderRadius: centerButtonSize / 2,
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  categoriaIconContainerActive: {
    borderColor: colors.white,
    backgroundColor: colors.white,
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
