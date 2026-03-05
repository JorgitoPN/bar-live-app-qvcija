
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { scaleIconSize, scaleFontSize, getMapPopupWidth, getMapPopupImageHeight, getMapMarkerScale, getUserLocationMarkerSize } from '@/utils/androidScaling';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { getEstadoLocal } from '@/utils/timeUtils';
import { IconSymbol } from '@/components/IconSymbol';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useFilters } from '@/contexts/FilterContext';
import FiltrosAvanzadosSheet from '@/components/home/FiltrosAvanzadosSheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { calcularDistancia } from '@/utils/locationUtils';
import { addPubCategoryIfNeeded, getPrimaryIconForVenue } from '@/utils/categorizeLocal';
import { supabase } from '@/utils/supabase';

const { width, height } = Dimensions.get('window');

const HEADER_MAX_HEIGHT = Platform.OS === 'android' ? 110 : 120;
const HEADER_MIN_HEIGHT = 0;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

/**
 * 🗺️ MAPA SCREEN v447.0 - MAP MARKER STATUS FIX
 * 
 * CRITICAL FIXES v447.0:
 * - 🔥 MAP MARKER STATUS: Markers now use Spain timezone matching backend
 * - 🔥 CORRECT COLORS: Green=open, Red=closed (matching backend RPC)
 * - 🔥 OVERNIGHT SCHEDULES: Correctly handled for venues open past midnight
 * - ✅ Status calculation matches backend 100%
 * - ✅ No more false positives/negatives
 * 
 * Previous features v350.0:
 * - 🔥 CATEGORY SYNC: Category selection syncs with FilterContext
 * - 🔥 BIDIRECTIONAL: Changes in map update Explorar and vice versa
 * - 🔥 SINGLE SELECTION: Only one category at a time
 * - ✅ Advanced filters work correctly
 * - ✅ Map markers update with all filters
 * - ✅ Visual indicator (red dot) when filters are active
 * - ✅ Quick clear button for advanced filters
 */

// ✅ v451.0 SYNCHRONIZED WITH FILTROS-SIMPLES - EXACT SAME ICONS
// These icons MUST match EXACTLY with app/(tabs)/explorar/filtros-simples.tsx
// Using IDENTICAL icon names for both iOS and Android
const CATEGORIAS = [
  { id: 'todas', label: 'Todas', iosIcon: 'sparkles', androidIcon: 'star' },
  { id: 'cafe', label: 'Cafés', iosIcon: 'cup.and.saucer.fill', androidIcon: 'local_cafe' },
  { id: 'restaurante', label: 'Restaurantes', iosIcon: 'fork.knife', androidIcon: 'restaurant' },
  { id: 'bar', label: 'Bares', iosIcon: 'wineglass.fill', androidIcon: 'local_bar' },
  { id: 'pub', label: 'Pubs', iosIcon: 'mug.fill', androidIcon: 'sports_bar' },
  { id: 'cocteleria', label: 'Coctelería', iosIcon: 'wineglass', androidIcon: 'liquor' },
  { id: 'discoteca', label: 'Discotecas', iosIcon: 'music.note', androidIcon: 'nightlife' },
];

const CategoriaButton = React.memo(({ 
  categoria, 
  isSelected, 
  onPress
}: { 
  categoria: typeof CATEGORIAS[0]; 
  isSelected: boolean; 
  onPress: () => void;
}) => {
  return (
    <TouchableOpacity
      style={styles.categoriaButtonCompact}
      onPress={onPress}
      delayPressIn={0}
      activeOpacity={0.7}
    >
      <View style={[
        styles.categoriaIconContainerCompact,
        isSelected && styles.categoriaIconContainerActive
      ]}>
        <IconSymbol 
          ios_icon_name={categoria.iosIcon as any}
          android_material_icon_name={categoria.androidIcon}
          size={Platform.OS === 'android' ? 16 : 18}
          color={isSelected ? colors.primary : colors.white}
        />
      </View>
      <Text style={[
        styles.categoriaLabelCompact,
        isSelected && styles.categoriaLabelActive
      ]} numberOfLines={1}>
        {categoria.label}
      </Text>
    </TouchableOpacity>
  );
});

const EstadoSelector = React.memo(({ 
  filtroEstado, 
  onChangeEstado 
}: { 
  filtroEstado: 'todos' | 'no_cerrados'; 
  onChangeEstado: (estado: 'todos' | 'no_cerrados') => void;
}) => {
  const handleTodos = useCallback(() => onChangeEstado('todos'), [onChangeEstado]);
  const handleAbiertos = useCallback(() => onChangeEstado('no_cerrados'), [onChangeEstado]);
  
  return (
    <View style={styles.estadoSelectorContainer}>
      <View style={styles.estadoSelector}>
        <TouchableOpacity
          style={[
            styles.estadoOption,
            filtroEstado === 'todos' && styles.estadoOptionActive
          ]}
          onPress={handleTodos}
          delayPressIn={0}
          activeOpacity={0.7}
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
            filtroEstado === 'no_cerrados' && styles.estadoOptionActive
          ]}
          onPress={handleAbiertos}
          delayPressIn={0}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.estadoOptionText,
            { fontSize: scaleFontSize(11) },
            filtroEstado === 'no_cerrados' && styles.estadoOptionTextActive
          ]}>
            Abiertos
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function MapaScreen() {
  const router = useRouter();
  
  // ✅ CRITICAL FIX v350.0: Use FilterContext for category sync
  const { 
    filtros: globalFiltros, 
    setFiltros,
    limpiarFiltros,
    hasActiveFilters,
  } = useFilters();
  
  const webViewRef = useRef<WebView>(null);
  
  // ✅ CRITICAL FIX v350.0: Derive category from FilterContext
  const categoriaSeleccionada = useMemo(() => {
    if (globalFiltros.tipo && globalFiltros.tipo.length > 0) {
      return globalFiltros.tipo[0];
    }
    return 'todas';
  }, [globalFiltros.tipo]);
  
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'no_cerrados'>('no_cerrados');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  // ✅ CRITICAL FIX v350.0: Update FilterContext when category changes
  const handleCategoriaChange = useCallback((categoriaId: string) => {
    console.log('🗺️ [MAPA v350.0] Cambiando categoría a:', categoriaId);
    
    if (categoriaId === 'todas') {
      // Clear tipo filter
      setFiltros({
        ...globalFiltros,
        tipo: undefined,
      });
    } else {
      // Set single tipo filter
      setFiltros({
        ...globalFiltros,
        tipo: [categoriaId],
      });
    }
  }, [globalFiltros, setFiltros]);
  
  const handleEstadoChange = useCallback((estado: 'todos' | 'no_cerrados') => {
    console.log('🗺️ [MAPA v350.0] Cambiando estado a:', estado);
    setFiltroEstado(estado);
  }, []);
  
  const handleToggleFiltros = useCallback(() => {
    console.log('🗺️ [MAPA v350.0] 🔍 Opening advanced filters');
    setMostrarFiltros(prev => !prev);
  }, []);
  
  const handleCloseFiltros = useCallback(() => {
    console.log('🗺️ [MAPA v350.0] ✅ Closing advanced filters');
    setMostrarFiltros(false);
  }, []);

  const handleClearAdvancedFilters = useCallback(() => {
    console.log('🗺️ [MAPA v350.0] 🧹 Clearing advanced filters');
    limpiarFiltros();
  }, [limpiarFiltros]);

  const popupWidth = getMapPopupWidth();
  const popupImageHeight = getMapPopupImageHeight();
  const markerScale = getMapMarkerScale();
  const userMarkerSize = getUserLocationMarkerSize();

  const mapHTML = useMemo(() => {
    const initialLat = userLocation?.lat || 40.4168;
    const initialLng = userLocation?.lng || -3.7038;
    const initialZoom = userLocation ? 13 : 6;
    
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css"/>
<script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-user-select:none;user-select:none;touch-action:none!important}
#map{width:100%;height:100%;position:absolute;top:0;left:0;background:#A8E0FF;-webkit-tap-highlight-color:rgba(0,0,0,0);-webkit-user-select:none;user-select:none;touch-action:none!important}
.maplibregl-canvas{pointer-events:auto!important;touch-action:none!important;-webkit-tap-highlight-color:rgba(0,0,0,0);-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}
.maplibregl-canvas-container{pointer-events:auto!important;touch-action:none!important;-webkit-tap-highlight-color:rgba(0,0,0,0);-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}
.maplibregl-popup-anchor-top,.maplibregl-popup-anchor-bottom{pointer-events:none!important}
.maplibregl-popup-content{pointer-events:auto!important;border-radius:12px;padding:0;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.3);width:${popupWidth}px!important;min-width:${popupWidth}px!important;max-width:${popupWidth}px!important;z-index:9999!important}
.custom-popup{z-index:9999!important}
.maplibregl-popup{z-index:9999!important}
.maplibregl-popup-close-button{display:none!important}
.popup-img{width:100%;height:${popupImageHeight}px;object-fit:cover;display:block;min-height:${popupImageHeight}px;max-height:${popupImageHeight}px}
.popup-info{padding:${Platform.OS === 'android' ? '10px' : '12px'}}
.popup-title{font-size:${Platform.OS === 'android' ? scaleFontSize(16) : 16}px;font-weight:700;margin-bottom:8px;color:#202124}
.popup-rating{display:flex;align-items:center;gap:4px;margin-bottom:10px;font-size:${Platform.OS === 'android' ? scaleFontSize(13) : 13}px;color:#70757A}
.popup-btn{display:flex;align-items:center;justify-content:center;gap:6px;background:#14B8A6;color:#FFF!important;padding:${Platform.OS === 'android' ? '8px' : '10px'};border-radius:8px;text-decoration:none;font-weight:700;font-size:${Platform.OS === 'android' ? scaleFontSize(13) : 13}px;transition:background .2s;cursor:pointer}
.popup-category{font-size:${Platform.OS === 'android' ? scaleFontSize(12) : 11}px;color:#70757A;margin-bottom:8px}
.popup-btn:hover{background:#0D9488}
.maplibregl-ctrl-attrib{display:none!important}
.maplibregl-ctrl-zoom-in,.maplibregl-ctrl-zoom-out{display:none!important}
.maplibregl-ctrl-group{display:none!important}
</style>
</head>
<body>
<div id="map"></div>
<script>
console.log('🗺️ [MAPA v447.0] Inicializando MapLibre GL JS - Map Marker Status Fix');

var map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      'carto-light': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
          'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
          'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        ],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors'
      }
    },
    layers: [
      {
        id: 'carto-light-layer',
        type: 'raster',
        source: 'carto-light',
        minzoom: 0,
        maxzoom: 22
      }
    ]
  },
  center: [${initialLng}, ${initialLat}],
  zoom: ${initialZoom},
  minZoom: 6,
  maxZoom: 20,
  attributionControl: false,
  dragRotate: false,
  pitchWithRotate: false,
  touchZoomRotate: { around: 'center' },
  touchPitch: false,
  keyboard: false,
  doubleClickZoom: true,
  scrollZoom: true,
  boxZoom: true,
  dragPan: true
});

map.touchZoomRotate.disableRotation();

function loadCategoryIcons() {
  const icons = {
    'cafe-icon': '☕',
    'restaurant-icon': '🍽️',
    'bar-icon': '🍷',
    'pub-icon': '🍺',
    'cocktail-icon': '🍹',
    'nightclub-icon': '🎵',
    'default-icon': '📍'
  };
  
  Object.entries(icons).forEach(([name, emoji]) => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 32, 32);
    
    map.addImage(name, {
      width: 64,
      height: 64,
      data: ctx.getImageData(0, 0, 64, 64).data
    });
  });
  
  console.log('🗺️ [MAPA v350.0] Iconos de categorías cargados');
}

window.getEstadoLocalRealTime = function(local) {
  // ✅ v447.0: CRITICAL FIX - Match backend RPC logic EXACTLY
  // Use Spain timezone for consistency
  
  if (local.google_business_status === 'CLOSED_PERMANENTLY') return 'cerrado';
  if (local.google_business_status === 'CLOSED_TEMPORARILY') return 'cerrado';
  if (!local.horarios_completos || Object.keys(local.horarios_completos).length === 0) return 'sin_info';
  
  const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  
  // Check if 24h (all 7 days must have 24h schedule)
  let diasCon24h = 0;
  for (const dia of diasSemana) {
    const horarioDia = local.horarios_completos[dia];
    if (!horarioDia || horarioDia.length === 0 || horarioDia[0] === 'Cerrado') break;
    
    const es24h = horarioDia.some(function(h) {
      const horarioLower = h.toLowerCase().trim();
      return horarioLower === '24 horas' || horarioLower === '24h' || horarioLower === 'abierto 24 horas' || horarioLower.includes('abierto 24');
    });
    
    if (es24h) diasCon24h++;
  }
  
  if (diasCon24h === 7) return 'abierto';
  
  // Get Spain time (Europe/Madrid timezone)
  const now = new Date();
  const spainTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  const diaActualIndex = spainTime.getDay();
  const diaActual = diasSemana[diaActualIndex];
  const horaActual = spainTime.getHours() * 60 + spainTime.getMinutes();
  
  // ✅ STEP 1: Check current day's schedule
  const horarioActual = local.horarios_completos[diaActual];
  
  if (!horarioActual || horarioActual.length === 0 || horarioActual[0] === 'Cerrado') {
    return 'cerrado';
  }
  
  // ✅ STEP 2: Check if open in current day's schedule
  for (const rango of horarioActual) {
    if (rango === 'Cerrado' || rango.toLowerCase().includes('24')) continue;
    
    const partes = rango.split(/[–-]/);
    if (partes.length !== 2) continue;
    
    const [inicio, fin] = partes;
    const inicioTrim = inicio.trim();
    const finTrim = fin.trim();
    
    // Normalize 24:00 to 23:59
    const inicioNorm = inicioTrim === '24:00' ? '23:59' : inicioTrim;
    const finNorm = finTrim === '24:00' ? '23:59' : finTrim;
    
    const [horaInicio, minInicio] = inicioNorm.split(':').map(Number);
    const [horaFin, minFin] = finNorm.split(':').map(Number);
    
    if (isNaN(horaInicio) || isNaN(minInicio) || isNaN(horaFin) || isNaN(minFin)) continue;
    
    const apertura = horaInicio * 60 + minInicio;
    const cierre = horaFin * 60 + minFin;
    
    // Normal schedule (start < end)
    if (apertura < cierre) {
      if (horaActual >= apertura && horaActual < cierre) {
        return 'abierto';
      }
    }
    // Overnight schedule (start > end): evening part
    else if (apertura > cierre) {
      if (horaActual >= apertura) {
        return 'abierto';
      }
    }
  }
  
  // ✅ STEP 3: Check if in morning continuation of previous day's overnight schedule
  const diaAnteriorIndex = (diaActualIndex - 1 + 7) % 7;
  const diaAnterior = diasSemana[diaAnteriorIndex];
  const horarioAnterior = local.horarios_completos[diaAnterior];
  
  if (horarioAnterior && horarioAnterior.length > 0 && horarioAnterior[0] !== 'Cerrado') {
    for (const rango of horarioAnterior) {
      if (rango === 'Cerrado' || rango.toLowerCase().includes('24')) continue;
      
      const partes = rango.split(/[–-]/);
      if (partes.length !== 2) continue;
      
      const [inicio, fin] = partes;
      const inicioTrim = inicio.trim();
      const finTrim = fin.trim();
      
      // Normalize 24:00 to 23:59
      const inicioNorm = inicioTrim === '24:00' ? '23:59' : inicioTrim;
      const finNorm = finTrim === '24:00' ? '23:59' : finTrim;
      
      const [horaInicio, minInicio] = inicioNorm.split(':').map(Number);
      const [horaFin, minFin] = finNorm.split(':').map(Number);
      
      if (isNaN(horaInicio) || isNaN(minInicio) || isNaN(horaFin) || isNaN(minFin)) continue;
      
      const apertura = horaInicio * 60 + minInicio;
      const cierre = horaFin * 60 + minFin;
      
      // Only overnight schedules (start > end) morning continuation
      if (apertura > cierre) {
        if (horaActual < cierre) {
          return 'abierto';
        }
      }
    }
  }
  
  return 'cerrado';
};

map.on('load', function() {
  console.log('🗺️ [MAPA v350.0] Mapa cargado, añadiendo source GeoJSON');
  
  setTimeout(function() {
    map.resize();
    console.log('🗺️ [MAPA v350.0] ✅ map.resize() ejecutado');
  }, 100);
  
  loadCategoryIcons();
  
  map.addSource('locales-source', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 60,
    clusterProperties: { 'sum': ['+', ['get', 'count']] }
  });
  
  const markerScale = ${markerScale};
  
  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'locales-source',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step',
        ['get', 'point_count'],
        'rgba(20, 184, 166, 0.7)',
        10, 'rgba(13, 148, 136, 0.75)',
        100, 'rgba(15, 118, 110, 0.8)'
      ],
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        Math.round(28 * markerScale),
        10, Math.round(35 * markerScale),
        100, Math.round(42 * markerScale)
      ],
      'circle-stroke-width': 3,
      'circle-stroke-color': 'rgba(255, 255, 255, 0.9)',
      'circle-opacity': 1
    }
  });
  
  console.log('🗺️ [MAPA v350.0] ✅ Adding cluster-count layer with MAXIMUM visibility');
  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'locales-source',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['to-string', ['get', 'point_count']],
      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      'text-size': [
        'step',
        ['get', 'point_count'],
        16,
        10, 18,
        100, 20
      ],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
      'text-anchor': 'center',
      'text-offset': [0, 0],
      'text-optional': false
    },
    paint: {
      'text-color': '#FFFFFF',
      'text-halo-color': '#000000',
      'text-halo-width': 2,
      'text-opacity': 1
    }
  });
  console.log('🗺️ [MAPA v350.0] ✅ Cluster count layer added');
  
  map.addLayer({
    id: 'locales-layer',
    type: 'circle',
    source: 'locales-source',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, Math.round(18 * markerScale),
        13, Math.round(22 * markerScale),
        16, Math.round(24 * markerScale),
        20, Math.round(26 * markerScale)
      ],
      'circle-color': [
        'case',
        ['==', ['get', 'estado'], 'abierto'], '#22C55E',
        ['==', ['get', 'estado'], 'cerrado'], '#EF4444',
        '#9CA3AF'
      ],
      'circle-stroke-width': 3,
      'circle-stroke-color': '#FFFFFF',
      'circle-opacity': 1
    },
    layout: { 'visibility': 'visible' }
  });
  
  map.addLayer({
    id: 'locales-icons',
    type: 'symbol',
    source: 'locales-source',
    filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': [
        'case',
        ['in', 'cafe', ['get', 'barlive_types']], 'cafe-icon',
        ['in', 'cafeteria', ['get', 'barlive_types']], 'cafe-icon',
        ['in', 'restaurante', ['get', 'barlive_types']], 'restaurant-icon',
        ['in', 'bar', ['get', 'barlive_types']], 'bar-icon',
        ['in', 'pub', ['get', 'barlive_types']], 'pub-icon',
        ['in', 'cocteleria', ['get', 'barlive_types']], 'cocktail-icon',
        ['in', 'cocktail', ['get', 'barlive_types']], 'cocktail-icon',
        ['in', 'discoteca', ['get', 'barlive_types']], 'nightclub-icon',
        ['in', 'nightclub', ['get', 'barlive_types']], 'nightclub-icon',
        'default-icon'
      ],
      'icon-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, 0.5,
        13, 0.55,
        16, 0.6,
        20, 0.65
      ],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'visibility': 'visible'
    }
  });
  
  map.addLayer({
    id: 'locales-labels',
    type: 'symbol',
    source: 'locales-source',
    filter: ['!', ['has', 'point_count']],
    layout: {
      'text-field': ['get', 'name'],
      'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
      'text-radial-offset': 0.8,
      'text-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, 10,
        13, 12,
        16, 14
      ],
      'text-font': ['Open Sans Regular'],
      'text-optional': true
    },
    paint: {
      'text-color': '#202124',
      'text-halo-color': '#FFFFFF',
      'text-halo-width': 1.5
    }
  });
  
  console.log('🗺️ [MAPA v350.0] ✅ All layers added');
  
  window.loadLocales();
  
  if (window.pendingAdvancedFilters) {
    console.log('🗺️ [MAPA v350.0] Applying pending advanced filters');
    window.applyAdvancedFilters(window.pendingAdvancedFilters);
    window.pendingAdvancedFilters = null;
  }
  
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'map_ready' }));
});

window.allLocales = [];
window.currentPopup = null;
window.filtros = { cat: 'todas', estado: 'no_cerrados' };
window.advancedFilters = {
  tipo: [],
  servicios: [],
  ambiente: [],
  clientela: [],
  comunidad: null,
  provincia: null,
  distancia: null
};
window.pendingAdvancedFilters = null;

window.loadLocales = async function() {
  try {
    console.log('🗺️ [MAPA v350.0] Cargando locales desde Supabase...');
    
    const response = await fetch('https://embntaqwlwmgazvrglaf.supabase.co/rest/v1/locales?select=id,nombre,direccion,latitud,longitud,imagen_url,rating,google_rating,barlive_types,horarios_completos,estado_actual,google_business_status,google_user_ratings_total,servicios_disponibles,ambiente_completo,clientela,comunidad,provincia&activo=eq.true&latitud=not.is.null&longitud=not.is.null', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtYm50YXF3bHdtZ2F6dnJnbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Mjk1NzMsImV4cCI6MjA3NzUwNTU3M30.mgqmCBX7FVpuejaN6pGuFHhMxKA033U-ALJwC-DCUEI',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtYm50YXF3bHdtZ2F6dnJnbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Mjk1NzMsImV4cCI6MjA3NzUwNTU3M30.mgqmCBX7FVpuejaN6pGuFHhMxKA033U-ALJwC-DCUEI'
      }
    });
    
    if (!response.ok) throw new Error('Error cargando locales: ' + response.status);
    
    const locales = await response.json();
    console.log('🗺️ [MAPA v350.0] Locales cargados:', locales.length);
    
    window.allLocales = locales;
    window.applyFilters();
  } catch (error) {
    console.error('🗺️ [MAPA v350.0] Error cargando locales:', error);
  }
};

window.applyAdvancedFilters = function(filterCriteria) {
  console.log('🗺️ [MAPA v350.0] 🔍 Setting advanced filters:', filterCriteria);
  window.advancedFilters = filterCriteria;
  window.applyFilters();
};

window.applyFilters = function() {
  if (!window.allLocales || window.allLocales.length === 0) return;
  
  console.log('🗺️ [MAPA v350.0] Aplicando filtros:', window.filtros);
  console.log('🗺️ [MAPA v350.0] Advanced filters:', window.advancedFilters);
  
  var filteredLocales = window.allLocales.filter(function(local) {
    // ✅ STEP 1: Estado filter (abierto/cerrado)
    var estado = window.getEstadoLocalRealTime(local);
    
    if (window.filtros.estado === 'no_cerrados') {
      if (estado === 'cerrado') return false;
    }
    
    // ✅ STEP 2: Category filter (cafe, bar, etc.)
    if (window.filtros.cat !== 'todas') {
      var types = local.barlive_types || [];
      var hasCategory = false;
      
      if (window.filtros.cat === 'cafe') {
        hasCategory = types.includes('cafe') || types.includes('cafeteria');
      } else if (window.filtros.cat === 'cocteleria') {
        hasCategory = types.includes('cocteleria') || types.includes('cocktail');
      } else if (window.filtros.cat === 'discoteca') {
        hasCategory = types.includes('discoteca') || types.includes('nightclub');
      } else {
        hasCategory = types.includes(window.filtros.cat);
      }
      
      if (!hasCategory) return false;
    }
    
    // ✅ STEP 3: Advanced tipo filter (from FilterContext)
    if (window.advancedFilters.tipo && window.advancedFilters.tipo.length > 0) {
      var localTypes = local.barlive_types || [];
      var hasAdvancedType = false;
      
      for (var i = 0; i < window.advancedFilters.tipo.length; i++) {
        var filterTipo = window.advancedFilters.tipo[i].toLowerCase();
        
        for (var j = 0; j < localTypes.length; j++) {
          var localType = localTypes[j].toLowerCase();
          
          if (localType === filterTipo || localType.includes(filterTipo) || filterTipo.includes(localType)) {
            hasAdvancedType = true;
            break;
          }
        }
        
        if (hasAdvancedType) break;
      }
      
      if (!hasAdvancedType) return false;
    }
    
    // ✅ STEP 4: Servicios filter
    if (window.advancedFilters.servicios && window.advancedFilters.servicios.length > 0) {
      if (!local.servicios_disponibles) return false;
      
      for (var i = 0; i < window.advancedFilters.servicios.length; i++) {
        var servicio = window.advancedFilters.servicios[i];
        if (local.servicios_disponibles[servicio] !== true) {
          return false;
        }
      }
    }
    
    // ✅ STEP 5: Ambiente filter
    if (window.advancedFilters.ambiente && window.advancedFilters.ambiente.length > 0) {
      if (!local.ambiente_completo) return false;
      
      var hasAmbiente = false;
      for (var i = 0; i < window.advancedFilters.ambiente.length; i++) {
        var ambiente = window.advancedFilters.ambiente[i];
        if (local.ambiente_completo[ambiente] === true) {
          hasAmbiente = true;
          break;
        }
      }
      
      if (!hasAmbiente) return false;
    }
    
    // ✅ STEP 6: Clientela filter
    if (window.advancedFilters.clientela && window.advancedFilters.clientela.length > 0) {
      if (!local.clientela) return false;
      
      var hasClientela = false;
      for (var i = 0; i < window.advancedFilters.clientela.length; i++) {
        var clientelaTipo = window.advancedFilters.clientela[i];
        if (local.clientela[clientelaTipo] === true) {
          hasClientela = true;
          break;
        }
      }
      
      if (!hasClientela) return false;
    }
    
    // ✅ STEP 7: Comunidad filter
    if (window.advancedFilters.comunidad && window.advancedFilters.comunidad !== 'Todas las Comunidades') {
      if (local.comunidad !== window.advancedFilters.comunidad) return false;
    }
    
    // ✅ STEP 8: Provincia filter
    if (window.advancedFilters.provincia) {
      if (local.provincia !== window.advancedFilters.provincia) return false;
    }
    
    // ✅ STEP 9: Distance filter (if user location is available)
    if (window.advancedFilters.distancia && window.advancedFilters.distancia > 0) {
      if (local.distancia !== null && local.distancia !== undefined) {
        if (local.distancia > window.advancedFilters.distancia) return false;
      }
    }
    
    return true;
  });
  
  console.log('🗺️ [MAPA v350.0] Locales filtrados:', filteredLocales.length);
  
  var geojson = {
    type: 'FeatureCollection',
    features: filteredLocales.map(function(local) {
      var lng = parseFloat(local.longitud);
      var lat = parseFloat(local.latitud);
      if (isNaN(lng) || isNaN(lat)) return null;
      
      var estadoCalculado = window.getEstadoLocalRealTime(local);
      
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          id: local.id,
          name: local.nombre,
          direccion: local.direccion || 'Dirección no disponible',
          imagen_url: local.imagen_url,
          rating: local.rating || 0,
          estado: estadoCalculado,
          barlive_types: local.barlive_types || [],
          count: 1
        }
      };
    }).filter(function(feature) { return feature !== null; })
  };
  
  var source = map.getSource('locales-source');
  if (source) {
    source.setData(geojson);
    console.log('🗺️ [MAPA v350.0] ✅ GeoJSON actualizado con', geojson.features.length, 'marcadores');
  }
};

window.setStateFilter = function(filterType) {
  window.filtros.estado = filterType;
  window.applyFilters();
};

window.filtrarCategoria = function(idCategoria) {
  window.filtros.cat = idCategoria;
  window.applyFilters();
};

window.setCategoryFilter = window.filtrarCategoria;

window.updateUserLocation = function(lat, lng) {
  console.log('🗺️ [MAPA v350.0] 📍 Actualizando ubicación del usuario:', lat, lng);
  
  if (!map) return;
  
  const userMarkerSize = ${userMarkerSize};
  const pulseSize = userMarkerSize * 2;
  
  if (!window.userMarker) {
    var el = document.createElement('div');
    el.className = 'user-marker';
    el.style.cssText = 'position:relative;width:' + userMarkerSize + 'px;height:' + userMarkerSize + 'px;z-index:9999;';
    
    var innerCircle = document.createElement('div');
    innerCircle.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#1E88E5;width:' + userMarkerSize + 'px;height:' + userMarkerSize + 'px;border-radius:50%;border:4px solid #FFF;box-shadow:0 3px 12px rgba(30,136,229,0.7),0 0 0 2px rgba(30,136,229,0.3);z-index:2;';
    el.appendChild(innerCircle);
    
    var outerCircle = document.createElement('div');
    outerCircle.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(30,136,229,0.4);width:' + pulseSize + 'px;height:' + pulseSize + 'px;border-radius:50%;animation:pulse 2s infinite;z-index:1;';
    el.appendChild(outerCircle);
    
    var style = document.createElement('style');
    style.textContent = '@keyframes pulse{0%{transform:translate(-50%,-50%) scale(1);opacity:1}50%{transform:translate(-50%,-50%) scale(1.3);opacity:0.5}100%{transform:translate(-50%,-50%) scale(1);opacity:1}}';
    document.head.appendChild(style);
    
    window.userMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([lng, lat])
      .addTo(map);
    
    console.log('🗺️ [MAPA v350.0] ✅ Marcador de usuario creado');
  } else {
    window.userMarker.setLngLat([lng, lat]);
    console.log('🗺️ [MAPA v350.0] ✅ Marcador de usuario actualizado');
  }
};

window.flyToLocation = function(lat, lng, zoom) {
  map.flyTo({ center: [lng, lat], zoom: zoom, essential: true });
};

function showPopupForFeature(feature, coordinates) {
  if (!feature || !feature.properties) return;
  
  var properties = feature.properties;
  if (!properties.id) return;
  
  console.log('🗺️ [MAPA v350.0] ✅ Mostrando popup para local:', properties.name);
  
  var localCompleto = window.allLocales.find(function(l) { return l.id === properties.id; });
  
  var ratingValue = 0;
  if (localCompleto) {
    if (localCompleto.rating && localCompleto.rating > 0) {
      ratingValue = localCompleto.rating;
    } else if (localCompleto.google_rating && localCompleto.google_rating > 0) {
      ratingValue = localCompleto.google_rating;
    }
  }
  
  var rating = ratingValue > 0 ? ratingValue.toFixed(1) : '0.0';
  var categorias = properties.barlive_types || [];
  var categoriasTexto = categorias.length > 0 ? categorias.slice(0, 2).join(', ') : 'Local';
  
  var estadoTexto = '';
  var estadoColor = '';
  if (properties.estado === 'abierto') {
    estadoTexto = '🟢 Abierto ahora';
    estadoColor = '#22C55E';
  } else if (properties.estado === 'cerrado') {
    estadoTexto = '🔴 Cerrado ahora';
    estadoColor = '#EF4444';
  } else {
    estadoTexto = '⚪ Sin información de horario';
    estadoColor = '#9CA3AF';
  }
  
  var popupHTML = '<div>' +
    '<img src="' + (properties.imagen_url || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400') + '" class="popup-img" onerror="this.src=\\'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400\\'"/>' +
    '<div class="popup-info">' +
    '<div class="popup-title">' + properties.name + '</div>' +
    '<div style="font-size:12px;color:#70757A;margin-bottom:10px;display:flex;align-items:flex-start;gap:4px">' +
    '<span style="flex-shrink:0">📍</span>' +
    '<span style="flex:1">' + (properties.direccion || 'Dirección no disponible') + '</span>' +
    '</div>' +
    (ratingValue > 0 ? '<div class="popup-rating">⭐ ' + rating + '</div>' : '') +
    '<div class="popup-category">' + categoriasTexto + '</div>' +
    '<div style="font-size:12px;font-weight:600;color:' + estadoColor + ';margin-bottom:10px">' + estadoTexto + '</div>' +
    '<a href="#" class="popup-btn" onclick="event.preventDefault();window.ReactNativeWebView.postMessage(JSON.stringify({type:\\'navigate\\',id:\\''+properties.id+'\\'}));return false">' +
    '<span style="color:#FFF">📍 Ver detalles</span>' +
    '</a>' +
    '</div>' +
    '</div>';
  
  if (window.currentPopup) {
    window.currentPopup.remove();
    window.currentPopup = null;
  }
  
  window.currentPopup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: true,
    maxWidth: '${popupWidth}px',
    className: 'custom-popup'
  })
    .setLngLat(coordinates)
    .setHTML(popupHTML)
    .addTo(map);
}

map.on('click', function(e) {
  console.log('🗺️ [MAPA v350.0] 🎯 Click detectado');
  
  var clusterFeatures = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
  if (clusterFeatures.length > 0) {
    console.log('🗺️ [MAPA v350.0] 🔵 CLUSTER detectado - ejecutando zoom-in');
    
    var clusterId = clusterFeatures[0].properties.cluster_id;
    var source = map.getSource('locales-source');
    
    source.getClusterExpansionZoom(clusterId, function(err, zoom) {
      if (err) return;
      map.flyTo({
        center: clusterFeatures[0].geometry.coordinates,
        zoom: zoom,
        speed: 1.2,
        curve: 1,
        essential: true
      });
    });
    
    return;
  }
  
  var filtroCategoria = window.filtros.cat || 'todas';
  var soloAbiertos = window.filtros.estado === 'no_cerrados';
  var touchPoint = e.point;
  var toleranciaPixeles = 20;
  var detectado = null;
  var minimaDistanciaPixeles = Infinity;
  
  window.allLocales.forEach(function(local) {
    var estadoLocal = window.getEstadoLocalRealTime(local);
    
    var cumpleCategoria = false;
    if (filtroCategoria === 'todas') {
      cumpleCategoria = true;
    } else {
      var types = local.barlive_types || [];
      if (filtroCategoria === 'cafe') {
        cumpleCategoria = types.includes('cafe') || types.includes('cafeteria');
      } else if (filtroCategoria === 'cocteleria') {
        cumpleCategoria = types.includes('cocteleria') || types.includes('cocktail');
      } else if (filtroCategoria === 'discoteca') {
        cumpleCategoria = types.includes('discoteca') || types.includes('nightclub');
      } else {
        cumpleCategoria = types.includes(filtroCategoria);
      }
    }
    
    var cumpleEstado = !soloAbiertos || (estadoLocal === 'abierto' || estadoLocal === 'sin_info');
    
    if (cumpleCategoria && cumpleEstado) {
      var localPixel = map.project([parseFloat(local.longitud), parseFloat(local.latitud)]);
      var dx = localPixel.x - touchPoint.x;
      var dy = localPixel.y - touchPoint.y;
      var distanciaPixeles = Math.sqrt(dx * dx + dy * dy);
      
      if (distanciaPixeles < toleranciaPixeles && distanciaPixeles < minimaDistanciaPixeles) {
        minimaDistanciaPixeles = distanciaPixeles;
        detectado = local;
      }
    }
  });
  
  if (detectado) {
    console.log('🗺️ [MAPA v350.0] 🎉 Local encontrado:', detectado.nombre);
    
    var coords = [parseFloat(detectado.longitud), parseFloat(detectado.latitud)];
    var estadoCalculado = window.getEstadoLocalRealTime(detectado);
    
    var fakeFeature = { 
      properties: { 
        id: detectado.id,
        name: detectado.nombre,
        direccion: detectado.direccion || 'Dirección no disponible',
        imagen_url: detectado.imagen_url,
        rating: detectado.rating || 0,
        estado: estadoCalculado,
        barlive_types: detectado.barlive_types || [],
        google_user_ratings_total: detectado.google_user_ratings_total || 0
      } 
    };
    
    map.flyTo({
      center: coords,
      zoom: 17,
      speed: 1.2,
      curve: 1,
      duration: 500,
      essential: true
    });
    
    var onMoveEnd = function() {
      showPopupForFeature(fakeFeature, coords);
      
      setTimeout(function() {
        var popupElement = document.querySelector('.maplibregl-popup-content');
        var popupHeight = popupElement ? popupElement.offsetHeight : ${popupImageHeight + 120};
        
        var markerPoint = map.project(coords);
        var screenCenterY = window.innerHeight / 2;
        var popupTopY = markerPoint.y - popupHeight - 10;
        var popupCenterY = popupTopY + (popupHeight / 2);
        var offsetY = screenCenterY - popupCenterY;
        
        var targetPoint = { x: markerPoint.x, y: markerPoint.y + offsetY };
        var targetCoords = map.unproject(targetPoint);
        
        map.flyTo({
          center: targetCoords,
          zoom: 17,
          speed: 1.5,
          curve: 1,
          duration: 400,
          essential: true
        });
      }, 100);
      
      map.off('moveend', onMoveEnd);
    };
    
    map.on('moveend', onMoveEnd);
  }
});

map.on('click', 'clusters', function(e) {
  var features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
  if (!features.length) return;
  
  var clusterId = features[0].properties.cluster_id;
  var source = map.getSource('locales-source');
  
  source.getClusterExpansionZoom(clusterId, function(err, zoom) {
    if (err) return;
    map.easeTo({ center: features[0].geometry.coordinates, zoom: zoom });
  });
});

map.on('mouseenter', 'locales-layer', function() { map.getCanvas().style.cursor = 'pointer'; });
map.on('mouseleave', 'locales-layer', function() { map.getCanvas().style.cursor = ''; });
map.on('mouseenter', 'locales-icons', function() { map.getCanvas().style.cursor = 'pointer'; });
map.on('mouseleave', 'locales-icons', function() { map.getCanvas().style.cursor = ''; });
map.on('mouseenter', 'clusters', function() { map.getCanvas().style.cursor = 'pointer'; });
map.on('mouseleave', 'clusters', function() { map.getCanvas().style.cursor = ''; });

window.addEventListener('resize', function() {
  map.resize();
});

console.log('🗺️ [MAPA v350.0] ✅ Map initialization complete with category sync + advanced filters');
</script>
</body>
</html>`;
  }, [userLocation, popupWidth, popupImageHeight, markerScale, userMarkerSize]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('🗺️ [MAPA v350.0] Permisos de ubicación denegados');
          setUserLocation({ lat: 40.4168, lng: -3.7038 });
          return;
        }

        console.log('🗺️ [MAPA v350.0] Obteniendo ubicación del usuario...');
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        console.log('🗺️ [MAPA v350.0] Ubicación obtenida:', location.coords.latitude, location.coords.longitude);
        setUserLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      } catch (error) {
        console.error('🗺️ [MAPA v350.0] Error obteniendo ubicación:', error);
        setUserLocation({ lat: 40.4168, lng: -3.7038 });
      }
    })();
  }, []);

  // ✅ CRITICAL FIX v350.0: Apply advanced filters to map
  useEffect(() => {
    if (!webViewRef.current || !isMapReady) {
      return;
    }
    
    console.log('🗺️ [MAPA v350.0] 🔍 Applying advanced filters to map:', globalFiltros);
    
    const filterCriteria = {
      tipo: globalFiltros.tipo || [],
      servicios: globalFiltros.servicios || [],
      ambiente: globalFiltros.ambiente || [],
      clientela: globalFiltros.clientela || [],
      comunidad: globalFiltros.comunidad || null,
      provincia: globalFiltros.provincia || null,
      distancia: globalFiltros.distancia || null,
    };
    
    requestAnimationFrame(() => {
      webViewRef.current?.injectJavaScript(`
        (function() {
          console.log('🗺️ [MAPA v350.0] Applying advanced filters in WebView:', ${JSON.stringify(filterCriteria)});
          
          if (typeof window.applyAdvancedFilters !== 'undefined') {
            window.applyAdvancedFilters(${JSON.stringify(filterCriteria)});
          } else {
            window.pendingAdvancedFilters = ${JSON.stringify(filterCriteria)};
          }
        })();
        true;
      `);
    });
  }, [categoriaSeleccionada, globalFiltros, isMapReady]);

  useEffect(() => {
    if (!webViewRef.current || !isMapReady) {
      return;
    }
    
    requestAnimationFrame(() => {
      webViewRef.current?.injectJavaScript(`
        (function() {
          if (typeof window.setStateFilter !== 'undefined') {
            window.setStateFilter('${filtroEstado}');
          }
        })();
        true;
      `);
    });
  }, [filtroEstado, isMapReady]);

  useEffect(() => {
    if (!webViewRef.current || !isMapReady) {
      return;
    }
    
    requestAnimationFrame(() => {
      webViewRef.current?.injectJavaScript(`
        (function() {
          if (typeof window.filtrarCategoria !== 'undefined') {
            window.filtrarCategoria('${categoriaSeleccionada}');
          }
        })();
        true;
      `);
    });
  }, [categoriaSeleccionada, isMapReady]);

  useEffect(() => {
    if (!webViewRef.current || !userLocation || !isMapReady) {
      return;
    }
    
    console.log('🗺️ [MAPA v350.0] 📍 Inyectando ubicación del usuario');
    
    const injectUserLocation = () => {
      webViewRef.current?.injectJavaScript(`
        (function() {
          try {
            if (typeof window.updateUserLocation !== 'undefined') {
              window.updateUserLocation(${userLocation.lat}, ${userLocation.lng});
            } else {
              setTimeout(function() {
                if (typeof window.updateUserLocation !== 'undefined') {
                  window.updateUserLocation(${userLocation.lat}, ${userLocation.lng});
                }
              }, 100);
            }
          } catch (error) {
            console.error('🗺️ [MAPA v350.0] ❌ Error actualizando ubicación:', error);
          }
        })();
        true;
      `);
    };
    
    if (Platform.OS === 'ios') {
      injectUserLocation();
    } else {
      setTimeout(injectUserLocation, 50);
    }
  }, [userLocation, isMapReady]);

  const centerOnUser = useCallback(() => {
    if (userLocation && webViewRef.current && isMapReady) {
      console.log('🗺️ [MAPA v350.0] Centrando en ubicación del usuario');
      webViewRef.current.injectJavaScript(`
        if (typeof window.flyToLocation !== 'undefined') {
          window.flyToLocation(${userLocation.lat}, ${userLocation.lng}, 16);
        }
        true;
      `);
    }
  }, [userLocation, isMapReady]);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'navigate' && data.id) {
        console.log('🗺️ [MAPA v350.0] Navegando a local:', data.id);
        router.push(`/detalle/local?id=${data.id}`);
      } else if (data.type === 'map_ready') {
        console.log('🗺️ [MAPA v350.0] Mapa listo');
        setIsMapReady(true);
      }
    } catch (error) {
      console.error('🗺️ [MAPA v350.0] Error procesando mensaje:', error);
    }
  }, [router]);

  const controlButtonSize = useMemo(() => 40, []);
  const controlIconSize = useMemo(() => Platform.OS === 'android' ? scaleIconSize(20) : 20, []);
  const centerButtonSize = useMemo(() => Platform.OS === 'android' ? scaleIconSize(56) : 56, []);
  const centerIconSize = useMemo(() => Platform.OS === 'android' ? scaleIconSize(24) : 24, []);

  return (
    <View style={commonStyles.container}>
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          <View style={styles.webNotSupported}>
            <IconSymbol 
              ios_icon_name="map" 
              android_material_icon_name="map" 
              size={Math.min(width * 0.2, 80)} 
              color={colors.textSecondary} 
            />
            <Text style={[styles.webNotSupportedText, { fontSize: scaleFontSize(16) }]}>
              Los mapas no están disponibles en la versión web de Natively.
            </Text>
            <Text style={[styles.webNotSupportedSubtext, { fontSize: scaleFontSize(14) }]}>
              Por favor, usa la aplicación móvil para ver el mapa.
            </Text>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ html: mapHTML }}
            style={styles.webview}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={false}
            cacheEnabled={false}
            incognito={true}
            androidLayerType="hardware"
            androidHardwareAccelerationDisabled={false}
          />
        )}
      </View>

      <View 
        style={styles.headerContainer}
      >
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
            {CATEGORIAS.map((categoria) => (
              <CategoriaButton
                key={categoria.id}
                categoria={categoria}
                isSelected={categoriaSeleccionada === categoria.id}
                onPress={() => handleCategoriaChange(categoria.id)}
              />
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

        <View style={styles.filterButtonWrapper}>
          <TouchableOpacity 
            style={[styles.controlButton, {
              width: controlButtonSize,
              height: controlButtonSize,
              borderRadius: controlButtonSize / 2,
            }]}
            onPress={handleToggleFiltros}
          >
            <IconSymbol 
              ios_icon_name="slider.horizontal.3" 
              android_material_icon_name="tune" 
              size={controlIconSize} 
              color={colors.primary} 
            />
            {hasActiveFilters && (
              <View style={styles.filterActiveDotMap} />
            )}
          </TouchableOpacity>
        </View>

        {hasActiveFilters && (
          <TouchableOpacity 
            style={[styles.controlButton, styles.clearAdvancedFiltersButtonMap, {
              width: controlButtonSize,
              height: controlButtonSize,
              borderRadius: controlButtonSize / 2,
            }]}
            onPress={handleClearAdvancedFilters}
          >
            <IconSymbol 
              ios_icon_name="xmark.circle.fill" 
              android_material_icon_name="cancel" 
              size={controlIconSize} 
              color={colors.white} 
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.controlsRight}>
        <EstadoSelector 
          filtroEstado={filtroEstado}
          onChangeEstado={handleEstadoChange}
        />

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
          bottom: Platform.OS === 'android' ? 110 : 100,
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
        onClose={handleCloseFiltros}
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
    paddingHorizontal: Math.max(width * 0.08, 24),
    paddingVertical: Math.max(height * 0.05, 32),
    backgroundColor: colors.background,
  },
  webNotSupportedText: {
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: Math.max(height * 0.02, 16),
    lineHeight: scaleFontSize(16) * 1.5,
    maxWidth: Math.min(width * 0.8, 400),
  },
  webNotSupportedSubtext: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: Math.max(height * 0.01, 8),
    lineHeight: scaleFontSize(14) * 1.5,
    maxWidth: Math.min(width * 0.8, 400),
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
    paddingBottom: 8,
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
  categoriaButtonCompact: {
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
  },
  categoriaIconContainerCompact: {
    width: Platform.OS === 'android' ? 36 : 40,
    height: Platform.OS === 'android' ? 36 : 40,
    borderRadius: Platform.OS === 'android' ? 9 : 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  categoriaIconContainerActive: {
    borderColor: colors.white,
    backgroundColor: colors.white,
    shadowOpacity: 0.25,
  },
  categoriaLabelCompact: {
    fontSize: Platform.OS === 'android' ? scaleFontSize(11) : 12,
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
    top: Platform.OS === 'ios' ? 148 : 138,
    gap: 12,
    zIndex: 5,
  },
  filterButtonWrapper: {
    position: 'relative',
  },
  filterActiveDotMap: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  clearAdvancedFiltersButtonMap: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  controlsRight: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'ios' ? 148 : 138,
    gap: 12,
    zIndex: 5,
    alignItems: 'center',
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  estadoSelectorContainer: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  estadoSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
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
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      },
      android: {
        elevation: 0,
      },
    }),
    transform: [{ scale: 1.05 }],
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
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 8,
    padding: 8,
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
    }),
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
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
      },
    }),
  },
});
