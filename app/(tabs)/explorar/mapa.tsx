
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
 * 🗺️ MAPA SCREEN v295.0 - CLUSTER COUNT DISPLAY ENABLED
 * 
 * NEW FIXES v295.0:
 * - ✅ CLUSTER COUNT: Each cluster now displays the number of venues inside
 * - ✅ TEXT STYLING: White text (color: #FFFFFF) with dark halo for maximum readability
 * - ✅ HALO EFFECT: textHaloColor: rgba(0, 0, 0, 0.8) with 2px width for strong contrast
 * - ✅ RESPONSIVE SIZE: Text size scales from 14px to 18px based on cluster size
 * - ✅ VERIFICATION: Cluster count layer added with point_count_abbreviated field
 * - ✅ USER EXPERIENCE: Users can now see how many markers are in each cluster area
 */

const CATEGORIAS = [
  { id: 'todas', label: 'Todas', icon: 'sparkles', androidIcon: 'star' },
  { id: 'cafe', label: 'Cafés', icon: 'cup.and.saucer.fill', androidIcon: 'local_cafe' },
  { id: 'restaurante', label: 'Restaurantes', icon: 'fork.knife', androidIcon: 'restaurant' },
  { id: 'bar', label: 'Bares', icon: 'wineglass.fill', androidIcon: 'local_bar' },
  { id: 'pub', label: 'Pubs', icon: 'mug.fill', androidIcon: 'sports_bar' },
  { id: 'cocteleria', label: 'Coctelería', icon: 'wineglass', androidIcon: 'liquor' },
  { id: 'discoteca', label: 'Discotecas', icon: 'music.note', androidIcon: 'nightlife' },
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
          ios_icon_name={categoria.icon as any}
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
  const { filtros: globalFiltros } = useFilters();
  
  const webViewRef = useRef<WebView>(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('todas');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'no_cerrados'>('no_cerrados');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  
  const handleCategoriaChange = useCallback((categoriaId: string) => {
    console.log('🗺️ [MAPA v295.0] Cambiando categoría a:', categoriaId);
    setCategoriaSeleccionada(categoriaId);
  }, []);
  
  const handleEstadoChange = useCallback((estado: 'todos' | 'no_cerrados') => {
    console.log('🗺️ [MAPA v295.0] Cambiando estado a:', estado);
    setFiltroEstado(estado);
  }, []);
  
  const handleToggleFiltros = useCallback(() => {
    setMostrarFiltros(prev => !prev);
  }, []);
  
  const handleCloseFiltros = useCallback(() => {
    setMostrarFiltros(false);
  }, []);

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
console.log('🗺️ [MAPA v295.0] Inicializando MapLibre GL JS con cluster count display');

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
  
  console.log('🗺️ [MAPA v295.0] Iconos de categorías cargados');
}

window.getEstadoLocalRealTime = function(local) {
  if (local.google_business_status === 'CLOSED_PERMANENTLY') return 'cerrado';
  if (local.google_business_status === 'CLOSED_TEMPORARILY') return 'cerrado';
  if (!local.horarios_completos || Object.keys(local.horarios_completos).length === 0) return 'sin_info';
  
  const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
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
  
  const now = new Date();
  const diaActualIndex = now.getDay();
  const diaActual = diasSemana[diaActualIndex];
  const horaActual = now.getHours() * 60 + now.getMinutes();
  
  let diaLogico = diaActual;
  
  if (horaActual < 480) {
    const diaAnteriorIndex = (diaActualIndex - 1 + 7) % 7;
    const diaAnterior = diasSemana[diaAnteriorIndex];
    const horarioAnterior = local.horarios_completos[diaAnterior];
    
    if (horarioAnterior && horarioAnterior.length > 0 && horarioAnterior[0] !== 'Cerrado') {
      for (const rango of horarioAnterior) {
        if (rango === 'Cerrado' || rango.toLowerCase().includes('24')) continue;
        const partes = rango.split(/[–-]/);
        if (partes.length !== 2) continue;
        const [inicio, fin] = partes;
        const [horaInicio, minInicio] = inicio.trim().split(':').map(Number);
        const [horaFin, minFin] = fin.trim().split(':').map(Number);
        if (isNaN(horaInicio) || isNaN(minInicio) || isNaN(horaFin) || isNaN(minFin)) continue;
        const cierre = horaFin * 60 + minFin;
        if (cierre < 480 && horaActual < cierre) {
          diaLogico = diaAnterior;
          break;
        }
      }
    }
  }
  
  const horarioParaVerificar = local.horarios_completos[diaLogico];
  if (!horarioParaVerificar || horarioParaVerificar.length === 0 || horarioParaVerificar[0] === 'Cerrado') return 'cerrado';
  
  for (const rango of horarioParaVerificar) {
    if (rango === 'Cerrado' || rango.toLowerCase().includes('24')) continue;
    const partes = rango.split(/[–-]/);
    if (partes.length !== 2) continue;
    const [inicio, fin] = partes;
    const [horaInicio, minInicio] = inicio.trim().split(':').map(Number);
    const [horaFin, minFin] = fin.trim().split(':').map(Number);
    if (isNaN(horaInicio) || isNaN(minInicio) || isNaN(horaFin) || isNaN(minFin)) continue;
    const apertura = horaInicio * 60 + minInicio;
    const cierre = horaFin * 60 + minFin;
    const esNocturno = cierre < 480 || cierre < apertura;
    
    if (esNocturno) {
      if (cierre < apertura) {
        if (horaActual < cierre || horaActual >= apertura) return 'abierto';
      } else if (apertura < cierre && apertura < 480 && cierre < 480) {
        if (horaActual >= apertura && horaActual < cierre) return 'abierto';
      }
    } else {
      if (horaActual >= apertura && horaActual < cierre) return 'abierto';
    }
  }
  
  return 'cerrado';
};

map.on('load', function() {
  console.log('🗺️ [MAPA v295.0] Mapa cargado, añadiendo source GeoJSON');
  
  setTimeout(function() {
    map.resize();
    console.log('🗺️ [MAPA v295.0] ✅ map.resize() ejecutado');
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
  
  console.log('🗺️ [MAPA v295.0] ✅ Adding cluster-count SymbolLayer with white text and dark halo');
  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'locales-source',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      'text-size': [
        'step',
        ['get', 'point_count'],
        14,
        10, 16,
        100, 18
      ],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
      'text-anchor': 'center',
      'text-offset': [0, 0],
      'text-justify': 'center'
    },
    paint: {
      'text-color': '#FFFFFF',
      'text-halo-color': 'rgba(0, 0, 0, 0.8)',
      'text-halo-width': 2,
      'text-halo-blur': 0.5
    }
  });
  console.log('🗺️ [MAPA v295.0] ✅ Cluster count layer added successfully');
  
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
  
  console.log('🗺️ [MAPA v295.0] ✅ Cluster count display ENABLED');
  
  window.loadLocales();
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'map_ready' }));
});

window.allLocales = [];
window.currentPopup = null;
window.filtros = { cat: 'todas', estado: 'no_cerrados' };

window.loadLocales = async function() {
  try {
    console.log('🗺️ [MAPA v295.0] Cargando locales desde Supabase...');
    
    const response = await fetch('https://embntaqwlwmgazvrglaf.supabase.co/rest/v1/locales?select=id,nombre,direccion,latitud,longitud,imagen_url,rating,google_rating,barlive_types,horarios_completos,estado_actual,google_business_status,google_user_ratings_total&activo=eq.true&latitud=not.is.null&longitud=not.is.null', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtYm50YXF3bHdtZ2F6dnJnbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Mjk1NzMsImV4cCI6MjA3NzUwNTU3M30.mgqmCBX7FVpuejaN6pGuFHhMxKA033U-ALJwC-DCUEI',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtYm50YXF3bHdtZ2F6dnJnbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Mjk1NzMsImV4cCI6MjA3NzUwNTU3M30.mgqmCBX7FVpuejaN6pGuFHhMxKA033U-ALJwC-DCUEI'
      }
    });
    
    if (!response.ok) throw new Error('Error cargando locales: ' + response.status);
    
    const locales = await response.json();
    console.log('🗺️ [MAPA v295.0] Locales cargados:', locales.length);
    
    window.allLocales = locales;
    window.applyFilters();
  } catch (error) {
    console.error('🗺️ [MAPA v295.0] Error cargando locales:', error);
  }
};

window.applyFilters = function() {
  if (!window.allLocales || window.allLocales.length === 0) return;
  
  console.log('🗺️ [MAPA v295.0] Aplicando filtros:', window.filtros);
  
  var filteredLocales = window.allLocales.filter(function(local) {
    var estado = window.getEstadoLocalRealTime(local);
    
    if (window.filtros.estado === 'no_cerrados') {
      if (estado === 'cerrado') return false;
    }
    
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
    
    return true;
  });
  
  console.log('🗺️ [MAPA v295.0] Locales filtrados:', filteredLocales.length);
  
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
    console.log('🗺️ [MAPA v295.0] ✅ GeoJSON actualizado con', geojson.features.length, 'marcadores');
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
  console.log('🗺️ [MAPA v295.0] 📍 Actualizando ubicación del usuario:', lat, lng);
  
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
    
    console.log('🗺️ [MAPA v295.0] ✅ Marcador de usuario creado');
  } else {
    window.userMarker.setLngLat([lng, lat]);
    console.log('🗺️ [MAPA v295.0] ✅ Marcador de usuario actualizado');
  }
};

window.flyToLocation = function(lat, lng, zoom) {
  map.flyTo({ center: [lng, lat], zoom: zoom, essential: true });
};

function showPopupForFeature(feature, coordinates) {
  if (!feature || !feature.properties) return;
  
  var properties = feature.properties;
  if (!properties.id) return;
  
  console.log('🗺️ [MAPA v295.0] ✅ Mostrando popup para local:', properties.name);
  
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
  console.log('🗺️ [MAPA v295.0] 🎯 Click detectado');
  
  var clusterFeatures = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
  if (clusterFeatures.length > 0) {
    console.log('🗺️ [MAPA v295.0] 🔵 CLUSTER detectado - ejecutando zoom-in');
    
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
    console.log('🗺️ [MAPA v295.0] 🎉 Local encontrado:', detectado.nombre);
    
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

console.log('🗺️ [MAPA v295.0] ═══════════════════════════════════════════════════════');
console.log('🗺️ [MAPA v295.0] ✅ CLUSTER COUNT DISPLAY HABILITADO');
console.log('🗺️ [MAPA v295.0] ✅ Texto blanco con halo oscuro para máxima legibilidad');
console.log('🗺️ [MAPA v295.0] ✅ Tamaño responsive (14-18px según tamaño del cluster)');
console.log('🗺️ [MAPA v295.0] ═══════════════════════════════════════════════════════');
</script>
</body>
</html>`;
  }, [userLocation, popupWidth, popupImageHeight, markerScale, userMarkerSize]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('🗺️ [MAPA v295.0] Permisos de ubicación denegados');
          setUserLocation({ lat: 40.4168, lng: -3.7038 });
          return;
        }

        console.log('🗺️ [MAPA v295.0] Obteniendo ubicación del usuario...');
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        console.log('🗺️ [MAPA v295.0] Ubicación obtenida:', location.coords.latitude, location.coords.longitude);
        setUserLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      } catch (error) {
        console.error('🗺️ [MAPA v295.0] Error obteniendo ubicación:', error);
        setUserLocation({ lat: 40.4168, lng: -3.7038 });
      }
    })();
  }, []);

  useEffect(() => {
    console.log('🗺️ [MAPA v295.0] Filtros cambiados');
  }, [categoriaSeleccionada, globalFiltros]);

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
    
    console.log('🗺️ [MAPA v295.0] 📍 Inyectando ubicación del usuario');
    
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
            console.error('🗺️ [MAPA v295.0] ❌ Error actualizando ubicación:', error);
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
      console.log('🗺️ [MAPA v295.0] Centrando en ubicación del usuario');
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
        console.log('🗺️ [MAPA v295.0] Navegando a local:', data.id);
        router.push(`/detalle/local?id=${data.id}`);
      } else if (data.type === 'map_ready') {
        console.log('🗺️ [MAPA v295.0] Mapa listo');
        setIsMapReady(true);
      }
    } catch (error) {
      console.error('🗺️ [MAPA v295.0] Error procesando mensaje:', error);
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

        <TouchableOpacity 
          style={[styles.controlButton, {
            width: controlButtonSize,
            height: controlButtonSize,
            borderRadius: controlButtonSize / 2,
          }]}
          onPress={handleToggleFiltros}
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
