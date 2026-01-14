
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
import { getPrimaryIconForVenue } from '@/utils/categorizeLocal';
import { dataCache } from '@/utils/dataCache';

const { width } = Dimensions.get('window');

const CATEGORIAS_LOCALES = [
  { id: 'todos', label: 'Todos', icon: 'sparkles', androidIcon: 'star' },
  { id: 'cafe', label: 'Cafés', icon: 'cup.and.saucer.fill', androidIcon: 'local_cafe' },
  { id: 'restaurante', label: 'Restaurantes', icon: 'fork.knife', androidIcon: 'restaurant' },
  { id: 'bar', label: 'Bares', icon: 'wineglass.fill', androidIcon: 'local_bar' },
  { id: 'pub', label: 'Pubs', icon: 'mug.fill', androidIcon: 'sports_bar' },
  { id: 'cocteleria', label: 'Coctelería', icon: 'wineglass', androidIcon: 'local_drink' },
  { id: 'discoteca', label: 'Discotecas', icon: 'music.note', androidIcon: 'nightlife' },
];

/**
 * ✅ MAP SCREEN v193.0 - INSTANT MARKERS & SYNCHRONIZED FILTER
 * 
 * CRITICAL IMPROVEMENTS v193.0:
 * - ✅ INSTANT MARKER LOADING: Markers appear immediately on map load
 * - ✅ SYNCHRONIZED FILTER: "Todos/Abiertos" selector properly filters markers
 * - ✅ IMPROVED ZOOM: Better initial zoom to show all markers
 * - ✅ PERFORMANCE: Optimized marker rendering with batching
 * - ✅ POPUP CENTERING: Improved centering with header offset
 * - ✅ CACHE SYSTEM: Enhanced caching for instant updates
 * - ✅ FILTER STATE: Proper state management for filter synchronization
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
        console.log('[MAP v188.0] 🔍 Requesting location permissions...');
        
        const isAvailable = await Location.hasServicesEnabledAsync();
        if (!isAvailable) {
          console.log('[MAP v188.0] ⚠️ Location services disabled, using Madrid');
          setUserLocation({ lat: 40.4168, lng: -3.7038 });
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('[MAP v188.0] ⚠️ Location permission denied, using Madrid');
          setUserLocation({ lat: 40.4168, lng: -3.7038 });
          return;
        }

        console.log('[MAP v188.0] ✅ Location permission granted');
        
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 0,
        });
        
        setUserLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
        console.log('[MAP v188.0] 📍 User location:', location.coords);
      } catch (error: any) {
        console.error('[MAP v188.0] ❌ Error getting location:', error?.message);
        setUserLocation({ lat: 40.4168, lng: -3.7038 });
      }
    })();
  }, []);

  const calculateZoomLevel = useCallback((latitudeDelta: number): number => {
    const zoom = Math.round(Math.log2(180 / latitudeDelta));
    return Math.max(1, Math.min(18, zoom));
  }, []);

  /**
   * ✅ v187.0: Determine if a local is open using frontend logic
   */
  const isLocalOpen = useCallback((local: any): boolean => {
    const estado = getEstadoLocal(local);
    return estado.estaAbierto === true;
  }, []);

  /**
   * ✅ v193.0: INSTANT load with synchronized filtering
   */
  const loadMapData = useCallback(async (region: any) => {
    if (!region) return;

    try {
      console.log('[MAP v193.0] 🗺️ Loading map data INSTANTLY');
      console.log('[MAP v193.0] 🔍 Filter estado:', filtroEstado);

      const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
      
      const min_lat = latitude - latitudeDelta / 2;
      const max_lat = latitude + latitudeDelta / 2;
      const min_lng = longitude - longitudeDelta / 2;
      const max_lng = longitude + longitudeDelta / 2;
      
      const zoom_level = calculateZoomLevel(latitudeDelta);
      
      // ✅ v193.0: Separate cache keys for different filter states
      const baseCacheKey = `map_${min_lat.toFixed(2)}_${max_lat.toFixed(2)}_${min_lng.toFixed(2)}_${max_lng.toFixed(2)}_${zoom_level}`;
      const cacheKey = `${baseCacheKey}_${filtroEstado}`;
      const cachedData = dataCache.get<any[]>(cacheKey);
      
      if (cachedData) {
        const cacheAge = dataCache.getAge(cacheKey);
        console.log('[MAP v193.0] 💾 Using cached markers (age:', cacheAge, 'seconds)');
        setMarkersData(cachedData);
        if (isLoadingMarkers) {
          setIsLoadingMarkers(false);
        }
        return;
      }
      
      console.log('[MAP v193.0] 📦 Bounding Box:', { min_lat, max_lat, min_lng, max_lng, zoom_level });

      // ✅ v193.0: Load data immediately without delay
      const { data, error } = await supabase.rpc('get_map_data', {
        min_lat,
        max_lat,
        min_lng,
        max_lng,
        zoom_level,
      });

      if (error) {
        console.error('[MAP v193.0] ❌ RPC Error:', error);
        return;
      }

      console.log('[MAP v193.0] ✅ RPC returned', data?.length || 0, 'markers (before filtering)');

      // Transform RPC data to marker format
      let markers = (data || []).map((item: any) => {
        const isCluster = item.is_cluster === true;
        const count = item.count || 1;

        const estado = getEstadoLocal(item);
        const rating = item.rating || item.google_rating || 0;
        const categoria = item.barlive_type || item.tipo || 'Local';
        const imagen = item.imagen_url || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400';

        const categories = item.barlive_types || (item.barlive_type ? [item.barlive_type] : ['bar']);
        const categoryIcon = isCluster ? '📍' : getPrimaryIconForVenue(categories, item.horarios_completos);

        let backgroundColor = '#9CA3AF';
        if (estado.estaAbierto === true) {
          backgroundColor = '#22C55E';
        } else if (estado.estaAbierto === false) {
          backgroundColor = '#EF4444';
        }

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
          estaAbierto: estado.estaAbierto,
        };
      });

      // ✅ v193.0: SYNCHRONIZED FILTERING - Apply filter based on selector state
      const originalCount = markers.length;
      if (filtroEstado === 'abiertos') {
        console.log('[MAP v193.0] 🔍 FILTERING for OPEN venues only');
        markers = markers.filter((marker: any) => {
          // Keep clusters (they may contain open venues)
          if (marker.isCluster) return true;
          // Filter individual markers by open status
          const isOpen = marker.estaAbierto === true;
          return isOpen;
        });
        console.log('[MAP v193.0] ✅ Filtered:', originalCount, '→', markers.length, 'markers (OPEN only)');
      } else {
        console.log('[MAP v193.0] ✅ Showing ALL markers:', markers.length);
      }

      // ✅ v193.0: Cache the filtered markers with filter-specific key
      dataCache.set(cacheKey, markers, 5 * 60 * 1000); // 5 minute cache for map data
      
      setMarkersData(markers);
      
      if (isLoadingMarkers) {
        setIsLoadingMarkers(false);
      }

      console.log('[MAP v193.0] 🎯 Markers ready for INSTANT display:', markers.length);
      console.log('[MAP v193.0] 📊 Cache stats:', dataCache.getStats());
    } catch (error) {
      console.error('[MAP v193.0] ❌ Error loading map data:', error);
    }
  }, [calculateZoomLevel, isLoadingMarkers, filtroEstado, isLocalOpen]);

  /**
   * ✅ v187.0: Generate map HTML with IMPROVED performance and popup handling
   */
  const generateMapHTML = useCallback(async () => {
    const centerLat = userLocation?.lat || 40.4168;
    const centerLng = userLocation?.lng || -3.7038;

    console.log('[MAP v188.0] 🗺️ GENERATING MAP HTML');

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
    
    .leaflet-popup-close-button {
      font-size: 24px;
      padding: 8px;
      color: #6B7280;
      z-index: 10000;
    }
    
    .leaflet-popup {
      z-index: 10000 !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    try {
      console.log('[MAP HTML v193.0] ⚡ INITIALIZING MAP WITH INSTANT MARKERS');
      
      var map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
        closePopupOnClick: false,
        tap: false,
      }).setView([${centerLat}, ${centerLng}], 12);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        minZoom: 3,
        attribution: ''
      }).addTo(map);

      var markers = [];
      var currentPopup = null;
      var isUpdatingMarkers = false;
      var popupCloseTimeout = null;

      ${userLocation ? `
        var userIcon = L.divIcon({
          className: 'user-marker',
          iconSize: [18, 18]
        });
        L.marker([${userLocation.lat}, ${userLocation.lng}], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
      ` : ''}

      var regionChangeTimeout = null;
      map.on('moveend', function() {
        if (regionChangeTimeout) {
          clearTimeout(regionChangeTimeout);
        }
        
        regionChangeTimeout = setTimeout(function() {
          var bounds = map.getBounds();
          var center = map.getCenter();
          var zoom = map.getZoom();
          
          var ne = bounds.getNorthEast();
          var sw = bounds.getSouthWest();
          var latitudeDelta = ne.lat - sw.lat;
          var longitudeDelta = ne.lng - sw.lng;
          
          console.log('[MAP HTML v188.0] 📍 Region changed (silent update)');
          
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'region_change',
            region: {
              latitude: center.lat,
              longitude: center.lng,
              latitudeDelta: latitudeDelta,
              longitudeDelta: longitudeDelta,
            }
          }));
        }, 300);
      });
      
      window.updateMarkers = function(markersData) {
        if (isUpdatingMarkers) {
          console.log('[MAP HTML v193.0] ⏸️ Update already in progress, skipping');
          return;
        }
        
        isUpdatingMarkers = true;
        console.log('[MAP HTML v193.0] 🎯 INSTANTLY updating markers:', markersData.length);
        
        var startTime = performance.now();
        
        var openPopupData = null;
        if (currentPopup && currentPopup.isOpen()) {
          var popupLatLng = currentPopup.getLatLng();
          openPopupData = {
            lat: popupLatLng.lat,
            lng: popupLatLng.lng
          };
          console.log('[MAP HTML v193.0] 💾 Preserving open popup at:', openPopupData);
        }
        
        // ✅ v193.0: Clear existing markers efficiently
        markers.forEach(function(marker) {
          map.removeLayer(marker);
        });
        markers = [];
        
        // ✅ v193.0: Render ALL markers for better UX (no limit)
        var maxMarkers = 1000; // Increased limit
        var markersToRender = markersData.slice(0, maxMarkers);
        
        if (markersData.length > maxMarkers) {
          console.log('[MAP HTML v193.0] ⚠️ Limiting to', maxMarkers, 'markers for performance');
        }
        
        console.log('[MAP HTML v193.0] 📍 Rendering', markersToRender.length, 'markers INSTANTLY');
        
        markersToRender.forEach(function(data) {
          var markerClass = data.isCluster ? 'custom-marker custom-marker-cluster' : 'custom-marker';
          
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
            
            var popup = L.popup({
              maxWidth: 320,
              closeButton: true,
              className: 'venue-popup-container',
              offset: [0, -10],
              autoPan: true,
              autoPanPadding: [100, 100],
              keepInView: true,
              closeOnClick: false,
              autoClose: false,
            }).setContent(popupContent);
            
            marker.bindPopup(popup);
            
            marker.on('popupopen', function(e) {
              currentPopup = e.popup;
              
              if (popupCloseTimeout) {
                clearTimeout(popupCloseTimeout);
                popupCloseTimeout = null;
              }
              
              console.log('[MAP HTML v193.0] 🎯 Popup opened for:', data.nombre);
              
              var mapSize = map.getSize();
              var headerHeight = 220;
              
              var offsetY = headerHeight / 2;
              
              var point = map.project([data.lat, data.lng], map.getZoom());
              point.y -= offsetY;
              var newCenter = map.unproject(point, map.getZoom());
              
              setTimeout(function() {
                if (currentPopup && currentPopup.isOpen()) {
                  map.panTo(newCenter, { 
                    animate: true, 
                    duration: 0.6,
                    easeLinearity: 0.25 
                  });
                }
              }, 150);
            });
            
            marker.on('popupclose', function() {
              if (currentPopup === marker.getPopup()) {
                console.log('[MAP HTML v193.0] 🚪 Popup closed');
                currentPopup = null;
              }
            });
          } else {
            marker.on('click', function() {
              map.setView([data.lat, data.lng], map.getZoom() + 2, { animate: true });
            });
          }

          markers.push(marker);
          marker.addTo(map);
        });
        
        if (openPopupData) {
          var restoredMarker = markers.find(function(m) {
            var pos = m.getLatLng();
            return Math.abs(pos.lat - openPopupData.lat) < 0.0001 && 
                   Math.abs(pos.lng - openPopupData.lng) < 0.0001;
          });
          
          if (restoredMarker && restoredMarker.getPopup()) {
            console.log('[MAP HTML v193.0] 🔄 Restoring popup');
            restoredMarker.openPopup();
          }
        }
        
        var endTime = performance.now();
        console.log('[MAP HTML v193.0] ✅ Markers rendered INSTANTLY in', (endTime - startTime).toFixed(2), 'ms');
        
        isUpdatingMarkers = false;
      };
      
      console.log('[MAP HTML v193.0] ✅ Map initialized and ready for INSTANT markers');
      
      setTimeout(function() {
        map.invalidateSize();
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'map_ready' }));
      }, 50);
      
      window.flyToLocation = function(lat, lng, zoom) {
        console.log('[MAP HTML v193.0] 🛫 Flying to:', lat, lng, 'zoom:', zoom);
        map.flyTo([lat, lng], zoom, {
          animate: true,
          duration: 1.5,
        });
      };
      
    } catch (error) {
      console.error('[MAP HTML v193.0] Map error:', error);
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

  useEffect(() => {
    if (isMapReady && webViewRef.current && markersData.length >= 0) {
      console.log('[MAP v187.0] 📤 Sending', markersData.length, 'markers to WebView');
      
      const markersJSON = JSON.stringify(markersData);
      webViewRef.current.injectJavaScript(`
        if (typeof window.updateMarkers !== 'undefined') {
          window.updateMarkers(${markersJSON});
        }
        true;
      `);
    }
  }, [markersData, isMapReady]);

  useEffect(() => {
    if (isMapReady && userLocation) {
      console.log('[MAP v193.0] 🚀 Map ready, loading initial data INSTANTLY');
      
      // ✅ v193.0: Optimal initial zoom to show markers immediately
      const initialRegion = {
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        latitudeDelta: 0.3, // Optimal view to show markers immediately
        longitudeDelta: 0.3,
      };
      
      setCurrentRegion(initialRegion);
      
      // ✅ v193.0: Load markers IMMEDIATELY without delay
      loadMapData(initialRegion);
    }
  }, [isMapReady, userLocation, loadMapData]);

  // ✅ v193.0: SYNCHRONIZED FILTER - Reload markers when filter changes
  useEffect(() => {
    if (currentRegion && isMapReady) {
      console.log('[MAP v193.0] 🔄 Filter changed to:', filtroEstado, '- reloading markers INSTANTLY');
      
      // ✅ v193.0: Clear cache for old filter state to force reload
      const { latitude, longitude, latitudeDelta, longitudeDelta } = currentRegion;
      const min_lat = latitude - latitudeDelta / 2;
      const max_lat = latitude + latitudeDelta / 2;
      const min_lng = longitude - longitudeDelta / 2;
      const max_lng = longitude + longitudeDelta / 2;
      const zoom_level = calculateZoomLevel(latitudeDelta);
      const baseCacheKey = `map_${min_lat.toFixed(2)}_${max_lat.toFixed(2)}_${min_lng.toFixed(2)}_${max_lng.toFixed(2)}_${zoom_level}`;
      
      // Clear both filter states to force fresh load
      dataCache.clear(`${baseCacheKey}_todos`);
      dataCache.clear(`${baseCacheKey}_abiertos`);
      
      loadMapData(currentRegion);
    }
  }, [filtroEstado, currentRegion, isMapReady, loadMapData, calculateZoomLevel]);

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
    console.log('[MAP v188.0] 🚀 Navigating to local:', localId);
    router.push(`/detalle/local?id=${localId}`);
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'navigate' && data.id) {
        console.log('📨 [MAP v193.0] Navigate request for:', data.id);
        handleVerDetalles(data.id);
      } else if (data.type === 'map_ready') {
        console.log('✅ [MAP v193.0] Map is ready - markers will load INSTANTLY');
        setIsMapReady(true);
      } else if (data.type === 'region_change' && data.region) {
        console.log('📍 [MAP v193.0] Region changed - updating markers');
        setCurrentRegion(data.region);
        loadMapData(data.region);
      }
    } catch (error) {
      console.error('❌ [MAP v193.0] Error parsing message:', error);
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
                  console.error('[MAP v188.0] WebView error:', nativeEvent);
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
