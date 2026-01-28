
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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

// ✅ FIX v275.0: INCREASED header height for more margin between header and controls
const HEADER_MAX_HEIGHT = Platform.OS === 'android' ? 110 : 120;
const HEADER_MIN_HEIGHT = 0;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

/**
 * 🗺️ MAPA SCREEN v277.0 - ANDROID COMPACT HEADERS + CENTER BUTTON REPOSITIONED
 * 
 * NEW FIXES v277.0:
 * - ✅ FIXED: Center map button repositioned to BOTTOM RIGHT on Android (same as iOS)
 * - ✅ FIXED: Button positioned at bottom: 100px, right: 16px on Android
 * - ✅ FIXED: Consistent positioning across iOS and Android
 * - ✅ FIXED: Android headers now use COMPACT font sizes (matching venue cards)
 * - ✅ FIXED: Center button has MORE TRANSPARENCY (rgba 0.85 opacity)
 * 
 * Previous features maintained (v275.0):
 * - ✅ Controls have MORE TRANSPARENCY (backgroundColor: rgba with 0.75 opacity)
 * - ✅ Back button, filters, selector, and legend all more transparent
 * - ✅ MORE margin between header and controls (18px gap)
 * - ✅ Controls positioned at top: 138-148px (more space below header)
 * - ✅ Better visibility and spacing
 * 
 * Previous features maintained (v273.0):
 * - ✅ Controls positioned BELOW header to prevent being covered
 * - ✅ REMOVED eye button for hiding header
 * - ✅ REMOVED zoom +/- buttons (MapLibre built-in controls)
 * - ✅ Category icon buttons use EXACT same sizes as Explorar page (36-40px)
 * - ✅ Using compact category button style with smaller labels (11-12px)
 * - ✅ Consistent sizing across all pages (Explorar, Eventos, Favoritos, Mapa)
 * - ✅ FIXED: Map markers now use REAL-TIME opening status calculation
 * - ✅ FIXED: Synchronized with actual venue schedules (horarios_completos)
 * - ✅ FIXED: Proper handling of overnight schedules (e.g., 23:00-06:00)
 * - ✅ FIXED: Proper handling of venues that open after midnight (e.g., 00:30-06:00)
 * - ✅ FIXED: Uses same logic as utils/timeUtils.ts for consistency
 * - ✅ Filter button height standardized to 40px (same as Explorar)
 * - ✅ Consistent button sizing across all pages
 * - ✅ MAPLIBRE GL JS CON GEOJSON
 * - ✅ CONTROLES DE MAPA RESTRINGIDOS
 * - ✅ DETECCIÓN MANUAL POR PROXIMIDAD EN PÍXELES CON FILTROS SINCRONIZADOS
 * - ✅ FILTROS DINÁMICOS
 * - ✅ UBICACIÓN DEL USUARIO
 * - ✅ CENTRADO DINÁMICO DEL POPUP DESPUÉS DEL ZOOM
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

// 🚀 COMPONENTE MEMOIZADO - Evita re-renders innecesarios
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

// 🚀 COMPONENTE MEMOIZADO - Selector de estado
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
  
  // 🚀 CALLBACKS MEMOIZADOS - Evitar recreación en cada render
  const handleCategoriaChange = useCallback((categoriaId: string) => {
    console.log('🗺️ [MAPA v275.0] Cambiando categoría a:', categoriaId);
    setCategoriaSeleccionada(categoriaId);
  }, []);
  
  const handleEstadoChange = useCallback((estado: 'todos' | 'no_cerrados') => {
    console.log('🗺️ [MAPA v275.0] Cambiando estado a:', estado);
    setFiltroEstado(estado);
  }, []);
  
  const handleToggleFiltros = useCallback(() => {
    setMostrarFiltros(prev => !prev);
  }, []);
  
  const handleCloseFiltros = useCallback(() => {
    setMostrarFiltros(false);
  }, []);

  // HTML con MAPLIBRE GL JS + DETECCIÓN MANUAL POR PROXIMIDAD
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
/* ✅ CRITICAL: Evitar selección de texto que interfiere con clics */
#map{width:100%;height:100%;position:absolute;top:0;left:0;background:#A8E0FF;-webkit-tap-highlight-color:rgba(0,0,0,0);-webkit-user-select:none;user-select:none;touch-action:none!important}
/* ✅ CRITICAL: Ensure map canvas has pointer-events enabled and touch-action none */
.maplibregl-canvas{pointer-events:auto!important;touch-action:none!important;-webkit-tap-highlight-color:rgba(0,0,0,0);-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}
/* ✅ CRITICAL: Ensure no invisible layers block interactions */
.maplibregl-canvas-container{pointer-events:auto!important;touch-action:none!important;-webkit-tap-highlight-color:rgba(0,0,0,0);-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}
/* ✅ CRITICAL: Contenedor invisible del popup no debe bloquear clics */
.maplibregl-popup-anchor-top,.maplibregl-popup-anchor-bottom{pointer-events:none!important}
/* ✅ CRITICAL: Contenido del popup sí debe recibir clics */
.maplibregl-popup-content{pointer-events:auto!important;border-radius:12px;padding:0;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.3);width:${Platform.OS === 'android' ? '260px' : '280px'}!important;min-width:${Platform.OS === 'android' ? '260px' : '280px'}!important;z-index:9999!important}
/* ✅ CRITICAL: Ensure popup appears above all other elements */
.custom-popup{z-index:9999!important}
.maplibregl-popup{z-index:9999!important}
.maplibregl-popup-close-button{display:none!important}
.popup-img{width:100%;height:${Platform.OS === 'android' ? '120px' : '140px'};object-fit:cover;display:block;min-height:${Platform.OS === 'android' ? '120px' : '140px'};max-height:${Platform.OS === 'android' ? '120px' : '140px'}}
.popup-info{padding:${Platform.OS === 'android' ? '10px' : '12px'}}
.popup-title{font-size:${Platform.OS === 'android' ? '15px' : '16px'};font-weight:700;margin-bottom:8px;color:#202124}
.popup-rating{display:flex;align-items:center;gap:4px;margin-bottom:10px;font-size:${Platform.OS === 'android' ? '12px' : '13px'};color:#70757A}
.popup-btn{display:flex;align-items:center;justify-content:center;gap:6px;background:#14B8A6;color:#FFF!important;padding:${Platform.OS === 'android' ? '9px' : '10px'};border-radius:8px;text-decoration:none;font-weight:700;font-size:${Platform.OS === 'android' ? '12px' : '13px'};transition:background .2s;cursor:pointer}
.popup-btn:hover{background:#0D9488}
.maplibregl-ctrl-attrib{display:none!important}
/* ✅ FIX v272.0: HIDE zoom controls (MapLibre built-in controls) */
.maplibregl-ctrl-zoom-in,.maplibregl-ctrl-zoom-out{display:none!important}
.maplibregl-ctrl-group{display:none!important}
</style>
</head>
<body>
<div id="map"></div>
<script>
// 🚀🚀🚀 MAPLIBRE GL JS CON DETECCIÓN MANUAL POR PROXIMIDAD MATEMÁTICA 🚀🚀🚀
console.log('🗺️ [MAPA v275.0] Inicializando MapLibre GL JS con cálculo de estado en tiempo real');

// 🚀 CREAR MAPA CON MAPLIBRE GL JS
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
  // 🚨 DESACTIVAR ROTACIÓN E INCLINACIÓN (SOLO PERMITIR ZOOM Y DESPLAZAMIENTO)
  dragRotate: false,
  pitchWithRotate: false,
  touchZoomRotate: {
    around: 'center'
  },
  touchPitch: false,
  keyboard: false,
  doubleClickZoom: true,
  scrollZoom: true,
  boxZoom: true,
  dragPan: true
});

// ✅ FIX v272.0: NO AÑADIR CONTROLES DE ZOOM (REMOVIDOS)
// Los controles de zoom están ocultos con CSS

// 🚨 DESACTIVAR ROTACIÓN CON GESTOS MULTI-TOUCH
map.touchZoomRotate.disableRotation();

// 🚀 CARGAR ICONOS PARA LOS MARCADORES
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
  
  console.log('🗺️ [MAPA v274.0] Iconos de categorías cargados');
}

// ✅ FIX v270.0: FUNCIÓN COMPLETA PARA DETERMINAR ESTADO DEL LOCAL EN TIEMPO REAL
// Esta función replica la lógica de utils/timeUtils.ts para sincronización perfecta
window.getEstadoLocalRealTime = function(local) {
  console.log('⏰ [MAPA v275.0] Calculando estado en tiempo real para:', local.nombre);
  
  // PASO 1: Verificar estado del negocio
  if (local.google_business_status === 'CLOSED_PERMANENTLY') {
    console.log('⏰ [MAPA v274.0] ❌ Local cerrado permanentemente');
    return 'cerrado';
  }
  
  if (local.google_business_status === 'CLOSED_TEMPORARILY') {
    console.log('⏰ [MAPA v274.0] ❌ Local cerrado temporalmente');
    return 'cerrado';
  }
  
  // PASO 2: Verificar si tiene horarios
  if (!local.horarios_completos || Object.keys(local.horarios_completos).length === 0) {
    console.log('⏰ [MAPA v274.0] ⚠️ Sin información de horario');
    return 'sin_info';
  }
  
  // PASO 3: Verificar si es 24 horas (TODOS los días deben ser 24h)
  const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  let diasCon24h = 0;
  
  for (const dia of diasSemana) {
    const horarioDia = local.horarios_completos[dia];
    if (!horarioDia || horarioDia.length === 0 || horarioDia[0] === 'Cerrado') {
      break; // Si un día no es 24h, no es un local 24h
    }
    
    const es24h = horarioDia.some(function(h) {
      const horarioLower = h.toLowerCase().trim();
      return (
        horarioLower === '24 horas' || 
        horarioLower === '24h' || 
        horarioLower === 'abierto 24 horas' ||
        horarioLower.includes('abierto 24')
      );
    });
    
    if (es24h) {
      diasCon24h++;
    }
  }
  
  if (diasCon24h === 7) {
    console.log('⏰ [MAPA v274.0] ✅ Local abierto 24 horas');
    return 'abierto';
  }
  
  // PASO 4: Calcular estado basado en horarios normales
  const now = new Date();
  const diaActualIndex = now.getDay();
  const diaActual = diasSemana[diaActualIndex];
  const horaActual = now.getHours() * 60 + now.getMinutes();
  
  console.log('⏰ [MAPA v274.0] Día actual:', diaActual, '| Hora actual:', horaActual, 'minutos');
  
  // PASO 4.1: Determinar el día lógico (importante para horarios nocturnos)
  let diaLogico = diaActual;
  let diaLogicoIndex = diaActualIndex;
  
  // Si estamos en la madrugada (00:00-08:00), verificar si es continuación del día anterior
  if (horaActual < 480) {
    console.log('⏰ [MAPA v274.0] Es madrugada, verificando día anterior...');
    
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
        
        const apertura = horaInicio * 60 + minInicio;
        const cierre = horaFin * 60 + minFin;
        
        // Si es horario nocturno (cierra en la madrugada) y estamos antes del cierre
        if (cierre < 480 && horaActual < cierre) {
          console.log('⏰ [MAPA v274.0] Horario nocturno del día anterior detectado');
          diaLogico = diaAnterior;
          diaLogicoIndex = diaAnteriorIndex;
          break;
        }
      }
    }
    
    // Si no encontramos horario del día anterior, verificar si el día actual tiene horario nocturno
    if (diaLogico === diaActual) {
      const horarioActual = local.horarios_completos[diaActual];
      
      if (horarioActual && horarioActual.length > 0 && horarioActual[0] !== 'Cerrado') {
        for (const rango of horarioActual) {
          if (rango === 'Cerrado' || rango.toLowerCase().includes('24')) continue;
          
          const partes = rango.split(/[–-]/);
          if (partes.length !== 2) continue;
          
          const [inicio, fin] = partes;
          const [horaInicio, minInicio] = inicio.trim().split(':').map(Number);
          const [horaFin, minFin] = fin.trim().split(':').map(Number);
          
          if (isNaN(horaInicio) || isNaN(minInicio) || isNaN(horaFin) || isNaN(minFin)) continue;
          
          const apertura = horaInicio * 60 + minInicio;
          const cierre = horaFin * 60 + minFin;
          
          // Si abre después de medianoche y cierra en la madrugada
          if (apertura < 480 && cierre < 480) {
            console.log('⏰ [MAPA v274.0] Horario nocturno del día actual (abre después de medianoche)');
            // El día lógico es el anterior (la noche pertenece al día anterior)
            diaLogico = diasSemana[(diaActualIndex - 1 + 7) % 7];
            diaLogicoIndex = (diaActualIndex - 1 + 7) % 7;
            break;
          }
        }
      }
    }
  }
  
  console.log('⏰ [MAPA v274.0] Día lógico determinado:', diaLogico);
  
  // PASO 4.2: Obtener horario para verificar
  let horarioParaVerificar;
  let diaParaVerificar;
  
  if (horaActual < 480 && diaLogico !== diaActual) {
    // Verificar horario del día calendario pero reportar como día lógico
    horarioParaVerificar = local.horarios_completos[diaActual];
    diaParaVerificar = diaActual;
    console.log('⏰ [MAPA v274.0] Verificando horario del día calendario:', diaActual);
  } else {
    // Caso normal: verificar horario del día lógico
    horarioParaVerificar = local.horarios_completos[diaLogico];
    diaParaVerificar = diaLogico;
    console.log('⏰ [MAPA v274.0] Verificando horario del día lógico:', diaLogico);
  }
  
  if (!horarioParaVerificar || horarioParaVerificar.length === 0 || horarioParaVerificar[0] === 'Cerrado') {
    console.log('⏰ [MAPA v274.0] ❌ Local cerrado (sin horario)');
    return 'cerrado';
  }
  
  // PASO 4.3: Verificar si está abierto en algún rango horario
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
    
    console.log('⏰ [MAPA v274.0] Verificando rango:', rango, '| Apertura:', apertura, '| Cierre:', cierre);
    
    // Determinar si es horario nocturno
    const esNocturno = cierre < 480 || cierre < apertura;
    
    if (esNocturno) {
      console.log('⏰ [MAPA v274.0] Horario nocturno detectado');
      
      // Caso 1: Horario nocturno tradicional (cruza medianoche)
      if (cierre < apertura) {
        // Estamos en la madrugada del día anterior
        if (horaActual < cierre) {
          console.log('⏰ [MAPA v274.0] ✅ ABIERTO (madrugada del horario nocturno)');
          return 'abierto';
        }
        // Estamos en la noche del día lógico
        if (horaActual >= apertura) {
          console.log('⏰ [MAPA v274.0] ✅ ABIERTO (noche del horario nocturno)');
          return 'abierto';
        }
      }
      // Caso 2: Horario nocturno que abre después de medianoche
      else if (apertura < cierre && apertura < 480 && cierre < 480) {
        if (horaActual >= apertura && horaActual < cierre) {
          console.log('⏰ [MAPA v274.0] ✅ ABIERTO (horario nocturno después de medianoche)');
          return 'abierto';
        }
      }
    } else {
      // Horariodiurno normal
      if (horaActual >= apertura && horaActual < cierre) {
        console.log('⏰ [MAPA v274.0] ✅ ABIERTO (horario diurno)');
        return 'abierto';
      }
    }
  }
  
  console.log('⏰ [MAPA v274.0] ❌ CERRADO (fuera de todos los rangos)');
  return 'cerrado';
};

// 🚀 ESPERAR A QUE EL MAPA ESTÉ LISTO
map.on('load', function() {
  console.log('🗺️ [MAPA v274.0] Mapa cargado, añadiendo source GeoJSON');
  
  // ✅ CRITICAL: Resize map to ensure proper rendering
  setTimeout(function() {
    map.resize();
    console.log('🗺️ [MAPA v274.0] ✅ map.resize() ejecutado para ajustar el mapa al contenedor');
  }, 100);
  
  // Cargar iconos primero
  loadCategoryIcons();
  
  // 🚀 AÑADIR SOURCE GEOJSON VACÍO CON CLUSTERING OPTIMIZADO
  map.addSource('locales-source', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 60,
    clusterProperties: {
      'sum': ['+', ['get', 'count']]
    }
  });
  
  // 🚀 AÑADIR LAYER DE CLUSTERS (CÍRCULOS)
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
        28,
        10, 35,
        100, 42
      ],
      'circle-stroke-width': 3,
      'circle-stroke-color': 'rgba(255, 255, 255, 0.9)',
      'circle-opacity': 1
    }
  });
  
  // 🚀 AÑADIR LAYER DE CONTEO DE CLUSTERS
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
        22,
        10, 24,
        100, 26
      ],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
      'text-anchor': 'center',
      'text-offset': [0, 0],
      'text-justify': 'center'
    },
    paint: {
      'text-color': '#FFFFFF',
      'text-halo-color': 'rgba(0, 0, 0, 0.7)',
      'text-halo-width': 3,
      'text-halo-blur': 0.5
    }
  });
  
  // 🚀 AÑADIR LAYER DE MARCADORES INDIVIDUALES
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
        10, 18,
        13, 22,
        16, 24,
        20, 26
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
    layout: {
      'visibility': 'visible'
    }
  });
  
  // 🚀 AÑADIR ICONOS DE CATEGORÍA
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
  
  // 🚀 AÑADIR LAYER DE ETIQUETAS
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
  
  console.log('🗺️ [MAPA v274.0] Source y layers GeoJSON añadidos correctamente');
  
  // 🚀 CARGAR DATOS INICIALES
  window.loadLocales();
  
  // 🚀 NOTIFICAR MAPA LISTO
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'map_ready' }));
});

// 🚀 VARIABLE GLOBAL PARA ALMACENAR TODOS LOS LOCALES
window.allLocales = [];

// 🚀 VARIABLE GLOBAL PARA ALMACENAR EL POPUP ACTUAL
window.currentPopup = null;

// 🚀 FILTROS PARA MAPLIBRE
window.filtros = {
  cat: 'todas',
  estado: 'no_cerrados'
};

// 🚀 FUNCIÓN PARA CARGAR LOCALES DESDE SUPABASE
window.loadLocales = async function() {
  try {
    console.log('🗺️ [MAPA v274.0] Cargando locales desde Supabase...');
    
    const response = await fetch('https://embntaqwlwmgazvrglaf.supabase.co/rest/v1/locales?select=id,nombre,direccion,latitud,longitud,imagen_url,rating,google_rating,barlive_types,horarios_completos,estado_actual,google_business_status,google_user_ratings_total&activo=eq.true&latitud=not.is.null&longitud=not.is.null', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtYm50YXF3bHdtZ2F6dnJnbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Mjk1NzMsImV4cCI6MjA3NzUwNTU3M30.mgqmCBX7FVpuejaN6pGuFHhMxKA033U-ALJwC-DCUEI',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtYm50YXF3bHdtZ2F6dnJnbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Mjk1NzMsImV4cCI6MjA3NzUwNTU3M30.mgqmCBX7FVpuejaN6pGuFHhMxKA033U-ALJwC-DCUEI'
      }
    });
    
    if (!response.ok) {
      throw new Error('Error cargando locales: ' + response.status);
    }
    
    const locales = await response.json();
    console.log('🗺️ [MAPA v274.0] Locales cargados:', locales.length);
    
    // ✅ CRITICAL: Almacenar TODOS los locales en window.allLocales para búsqueda manual
    window.allLocales = locales;
    console.log('🗺️ [MAPA v274.0] ✅ window.allLocales poblado con', window.allLocales.length, 'locales');
    
    window.applyFilters();
    
  } catch (error) {
    console.error('🗺️ [MAPA v274.0] Error cargando locales:', error);
  }
};

// 🚀 APLICAR FILTROS Y ACTUALIZAR GEOJSON
window.applyFilters = function() {
  if (!window.allLocales || window.allLocales.length === 0) {
    console.log('🗺️ [MAPA v274.0] No hay locales para filtrar');
    return;
  }
  
  console.log('🗺️ [MAPA v274.0] Aplicando filtros:', window.filtros);
  
  var filteredLocales = window.allLocales.filter(function(local) {
    // ✅ FIX v270.0: Calcular estado en tiempo real usando la función completa
    var estado = window.getEstadoLocalRealTime(local);
    
    if (window.filtros.estado === 'no_cerrados') {
      if (estado === 'cerrado') {
        return false;
      }
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
      
      if (!hasCategory) {
        return false;
      }
    }
    
    return true;
  });
  
  console.log('🗺️ [MAPA v274.0] Locales filtrados:', filteredLocales.length);
  
  var geojson = {
    type: 'FeatureCollection',
    features: filteredLocales.map(function(local) {
      var lng = parseFloat(local.longitud);
      var lat = parseFloat(local.latitud);
      
      if (isNaN(lng) || isNaN(lat)) {
        console.warn('🗺️ [MAPA v274.0] ⚠️ Coordenadas inválidas para local:', local.nombre);
        return null;
      }
      
      // ✅ FIX v270.0: Calcular estado en tiempo real para cada local
      var estadoCalculado = window.getEstadoLocalRealTime(local);
      
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        properties: {
          id: local.id,
          name: local.nombre,
          direccion: local.direccion || 'Dirección no disponible',
          imagen_url: local.imagen_url,
          rating: local.rating || 0,
          estado: estadoCalculado, // ✅ Estado calculado en tiempo real
          barlive_types: local.barlive_types || [],
          count: 1
        }
      };
    }).filter(function(feature) { return feature !== null; })
  };
  
  var source = map.getSource('locales-source');
  if (source) {
    source.setData(geojson);
    console.log('🗺️ [MAPA v274.0] ✅ GeoJSON actualizado con', geojson.features.length, 'marcadores (estados calculados en tiempo real)');
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

// 🚀 MARCADOR DE UBICACIÓN DEL USUARIO
window.updateUserLocation = function(lat, lng) {
  console.log('🗺️ [MAPA v274.0] 📍 Actualizando ubicación del usuario:', lat, lng);
  
  if (!window.userMarker) {
    var el = document.createElement('div');
    el.className = 'user-marker';
    el.style.cssText = 'position:relative;width:24px;height:24px;';
    
    var innerCircle = document.createElement('div');
    innerCircle.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#4285F4;width:24px;height:24px;border-radius:50%;border:4px solid #FFF;box-shadow:0 2px 12px rgba(66,133,244,0.6);z-index:2;';
    el.appendChild(innerCircle);
    
    var outerCircle = document.createElement('div');
    outerCircle.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(66,133,244,0.3);width:48px;height:48px;border-radius:50%;animation:pulse 2s infinite;z-index:1;';
    el.appendChild(outerCircle);
    
    var style = document.createElement('style');
    style.textContent = '@keyframes pulse{0%{transform:translate(-50%,-50%) scale(1);opacity:1}50%{transform:translate(-50%,-50%) scale(1.3);opacity:0.5}100%{transform:translate(-50%,-50%) scale(1);opacity:1}}';
    document.head.appendChild(style);
    
    window.userMarker = new maplibregl.Marker({ 
      element: el,
      anchor: 'center'
    })
      .setLngLat([lng, lat])
      .addTo(map);
    
    console.log('🗺️ [MAPA v274.0] ✅ Marcador de usuario creado');
  } else {
    window.userMarker.setLngLat([lng, lat]);
    console.log('🗺️ [MAPA v274.0] ✅ Marcador de usuario actualizado');
  }
};

window.flyToLocation = function(lat, lng, zoom) {
  map.flyTo({
    center: [lng, lat],
    zoom: zoom,
    essential: true
  });
};

// 🚀 FUNCIÓN UNIFICADA PARA MOSTRAR POPUP
function showPopupForFeature(feature, coordinates) {
  if (!feature || !feature.properties) {
    console.error('🗺️ [MAPA v274.0] ❌ Feature inválida para mostrar popup');
    return;
  }
  
  var properties = feature.properties;
  
  if (!properties.id) {
    console.error('🗺️ [MAPA v274.0] ❌ ID del local no encontrado');
    return;
  }
  
  console.log('🗺️ [MAPA v274.0] ✅ Mostrando popup para local:', properties.name);
  
  var localCompleto = window.allLocales.find(function(l) { return l.id === properties.id; });
  
  // ✅ FIX: Obtener rating correcto del local completo
  var ratingValue = 0;
  if (localCompleto) {
    // Prioridad: rating > google_rating
    if (localCompleto.rating && localCompleto.rating > 0) {
      ratingValue = localCompleto.rating;
    } else if (localCompleto.google_rating && localCompleto.google_rating > 0) {
      ratingValue = localCompleto.google_rating;
    }
  }
  
  // Formatear rating con 1 decimal (usar punto como separador decimal)
  var rating = ratingValue > 0 ? ratingValue.toFixed(1) : '0.0';
  
  var categorias = properties.barlive_types || [];
  var categoriasTexto = categorias.length > 0 ? categorias.slice(0, 2).join(', ') : 'Local';
  
  // ✅ FIX v270.0: Usar el estado calculado en tiempo real
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
  
  // ✅ FIX: Popup SIN cantidad total de reseñas, solo rating
  var popupHTML = '<div>' +
    '<img src="' + (properties.imagen_url || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400') + '" class="popup-img" onerror="this.src=\\'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400\\'"/>' +
    '<div class="popup-info">' +
    '<div class="popup-title">' + properties.name + '</div>' +
    '<div style="font-size:13px;color:#70757A;margin-bottom:10px;display:flex;align-items:flex-start;gap:4px">' +
    '<span style="flex-shrink:0">📍</span>' +
    '<span style="flex:1">' + (properties.direccion || 'Dirección no disponible') + '</span>' +
    '</div>' +
    (ratingValue > 0 ? '<div class="popup-rating">⭐ ' + rating + '</div>' : '') +
    '<div style="font-size:12px;color:#70757A;margin-bottom:8px">' + categoriasTexto + '</div>' +
    '<div style="font-size:13px;font-weight:600;color:' + estadoColor + ';margin-bottom:10px">' + estadoTexto + '</div>' +
    '<a href="#" class="popup-btn" onclick="event.preventDefault();window.ReactNativeWebView.postMessage(JSON.stringify({type:\\'navigate\\',id:\\''+properties.id+'\\'}));return false">' +
    '<span style="color:#FFF">📍 Ver detalles</span>' +
    '</a>' +
    '</div>' +
    '</div>';
  
  // ✅ Cerrar popup anterior si existe
  if (window.currentPopup) {
    window.currentPopup.remove();
    window.currentPopup = null;
  }
  
  // ✅ Crear nuevo popup
  window.currentPopup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: true,
    maxWidth: '${Platform.OS === 'android' ? '260px' : '280px'}',
    className: 'custom-popup'
  })
    .setLngLat(coordinates)
    .setHTML(popupHTML)
    .addTo(map);
}

// 🚀🚀🚀 DETECCIÓN MANUAL POR PROXIMIDAD EN PÍXELES CON CENTRADO DINÁMICO v267.0 🚀🚀🚀
// ✅ PASO 1: BLOQUEO DE CLUSTERS (PRIORIDAD MÁXIMA)
// ✅ PASO 2: SINCRONIZA CON FILTROS ACTIVOS (categoría y estado)
// ✅ PASO 3: BÚSQUEDA DEL MÁS CERCANO con tolerancia reducida (20px)
// ✅ PASO 4: AUTO-CENTRADO DINÁMICO del popup DESPUÉS del zoom (NUEVO v267.0)
map.on('click', function(e) {
  console.log('🗺️ [MAPA v274.0] 🎯 Click detectado - iniciando proceso de 4 pasos');
  
  // ═══════════════════════════════════════════════════════════════
  // 🚨 PASO 1: BLOQUEO DE CLUSTERS (PRIORIDAD ABSOLUTA)
  // ═══════════════════════════════════════════════════════════════
  // Si el usuario toca un cluster, ejecutar zoom-in y DETENER el proceso
  var clusterFeatures = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
  if (clusterFeatures.length > 0) {
    console.log('🗺️ [MAPA v274.0] 🔵 CLUSTER detectado - ejecutando zoom-in y deteniendo proceso');
    
    var clusterId = clusterFeatures[0].properties.cluster_id;
    var source = map.getSource('locales-source');
    
    source.getClusterExpansionZoom(clusterId, function(err, zoom) {
      if (err) {
        console.error('🗺️ [MAPA v274.0] ❌ Error obteniendo zoom del cluster:', err);
        return;
      }
      
      map.flyTo({
        center: clusterFeatures[0].geometry.coordinates,
        zoom: zoom,
        speed: 1.2,
        curve: 1,
        essential: true
      });
      
      console.log('🗺️ [MAPA v274.0] ✅ Zoom-in del cluster ejecutado correctamente');
    });
    
    // 🚨 RETURN INMEDIATO - No continuar con la detección de locales individuales
    return;
  }
  
  console.log('🗺️ [MAPA v274.0] ✅ No es un cluster - continuando con detección de locales individuales');
  
  // ═══════════════════════════════════════════════════════════════
  // 🚨 PASO 2: OBTENER FILTROS ACTIVOS DE REACT
  // ═══════════════════════════════════════════════════════════════
  var filtroCategoria = window.filtros.cat || 'todas';
  var soloAbiertos = window.filtros.estado === 'no_cerrados';
  console.log('🗺️ [MAPA v274.0] 🔍 Filtros activos - Categoría:', filtroCategoria, '| Solo abiertos:', soloAbiertos);
  
  // ═══════════════════════════════════════════════════════════════
  // 🚨 PASO 3: DETECCIÓN MANUAL POR PROXIMIDAD CON FILTROS
  // ═══════════════════════════════════════════════════════════════
  var touchPoint = e.point;
  console.log('🗺️ [MAPA v274.0] 📍 Punto del clic en píxeles:', touchPoint.x, touchPoint.y);
  
  // ✅ Tolerancia REDUCIDA para mayor precisión (20px en lugar de 30px)
  var toleranciaPixeles = 20;
  console.log('🗺️ [MAPA v274.0] 📏 Tolerancia REDUCIDA en píxeles:', toleranciaPixeles, 'px (más preciso)');
  
  var detectado = null;
  var minimaDistanciaPixeles = Infinity;
  var localesEvaluados = 0;
  var localesFiltrados = 0;
  
  window.allLocales.forEach(function(local) {
    localesEvaluados++;
    
    // ✅ FIX v270.0: Calcular estado en tiempo real ANTES de validar filtros
    var estadoLocal = window.getEstadoLocalRealTime(local);
    
    // 🚨 VALIDAR FILTROS ACTIVOS ANTES DE CALCULAR DISTANCIA (¡CRÍTICO!)
    // 1. Validar Categoría
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
    
    // 2. Validar Estado (Abierto/Cerrado) - usando estado calculado en tiempo real
    var cumpleEstado = !soloAbiertos || estadoLocal === 'abierto';
    
    // ✅ SOLO SI CUMPLE AMBOS FILTROS, CALCULAMOS LA DISTANCIA
    if (cumpleCategoria && cumpleEstado) {
      // Proyectar coordenadas del local a píxeles en pantalla
      var localPixel = map.project([parseFloat(local.longitud), parseFloat(local.latitud)]);
      
      // Calcular distancia en píxeles (Pitágoras)
      var dx = localPixel.x - touchPoint.x;
      var dy = localPixel.y - touchPoint.y;
      var distanciaPixeles = Math.sqrt(dx * dx + dy * dy);
      
      // Si está dentro de la tolerancia Y es el más cercano hasta ahora
      if (distanciaPixeles < toleranciaPixeles && distanciaPixeles < minimaDistanciaPixeles) {
        console.log('🗺️ [MAPA v274.0] ✅ Candidato encontrado:', local.nombre, '- Distancia:', distanciaPixeles.toFixed(2), 'px - Estado:', estadoLocal);
        minimaDistanciaPixeles = distanciaPixeles;
        detectado = local;
      }
    } else {
      localesFiltrados++;
    }
  });
  
  console.log('🗺️ [MAPA v274.0] 📊 Locales evaluados:', localesEvaluados);
  console.log('🗺️ [MAPA v274.0] 📊 Locales filtrados (ocultos):', localesFiltrados);
  console.log('🗺️ [MAPA v274.0] 📊 Locales visibles:', localesEvaluados - localesFiltrados);
  
  // ═══════════════════════════════════════════════════════════════
  // 🚨 PASO 4: SI SE DETECTÓ UN LOCAL, ABRIR POPUP Y AUTO-CENTRAR DINÁMICAMENTE (NUEVO v267.0)
  // ═══════════════════════════════════════════════════════════════
  if (detectado) {
    console.log('🗺️ [MAPA v274.0] 🎉 Local MÁS CERCANO encontrado:', detectado.nombre);
    console.log('🗺️ [MAPA v274.0] 📊 Distancia final:', minimaDistanciaPixeles.toFixed(2), 'píxeles');
    
    // Coordenadas del local detectado
    var coords = [parseFloat(detectado.longitud), parseFloat(detectado.latitud)];
    
    // ✅ FIX v270.0: Calcular estado en tiempo real para el popup
    var estadoCalculado = window.getEstadoLocalRealTime(detectado);
    
    // Crear una estructura de 'feature' falsa para reutilizar showPopupForFeature
    var fakeFeature = { 
      properties: { 
        id: detectado.id,
        name: detectado.nombre,
        direccion: detectado.direccion || 'Dirección no disponible',
        imagen_url: detectado.imagen_url,
        rating: detectado.rating || 0,
        estado: estadoCalculado, // ✅ Estado calculado en tiempo real
        barlive_types: detectado.barlive_types || [],
        google_user_ratings_total: detectado.google_user_ratings_total || 0
      } 
    };
    
    // ✅ FIX v267.0: CENTRADO DINÁMICO DEL POPUP DESPUÉS DEL ZOOM
    // ESTRATEGIA:
    // 1. Hacer zoom al marcador (zoom 17)
    // 2. ESPERAR a que termine el zoom (evento 'moveend')
    // 3. Abrir el popup
    // 4. Calcular la altura REAL del popup desde el DOM
    // 5. Ajustar el centro del mapa para que el popup quede centrado en pantalla
    
    console.log('🗺️ [MAPA v274.0] 🎯 Iniciando centrado dinámico del popup');
    
    // Paso 1: Hacer zoom al marcador
    map.flyTo({
      center: coords,
      zoom: 17,
      speed: 1.2,
      curve: 1,
      duration: 500,
      essential: true
    });
    
    // Paso 2: Esperar a que termine el zoom
    var onMoveEnd = function() {
      console.log('🗺️ [MAPA v274.0] ✅ Zoom completado, abriendo popup');
      
      // Paso 3: Abrir el popup
      showPopupForFeature(fakeFeature, coords);
      
      // Paso 4: Esperar un frame para que el popup se renderice en el DOM
      setTimeout(function() {
        // Obtener la altura REAL del popup desde el DOM
        var popupElement = document.querySelector('.maplibregl-popup-content');
        var popupHeight = popupElement ? popupElement.offsetHeight : ${Platform.OS === 'android' ? '240' : '280'};
        
        console.log('🗺️ [MAPA v274.0] 📐 Altura real del popup:', popupHeight, 'px');
        
        // Paso 5: Calcular el offset necesario para centrar el POPUP (no el marcador)
        var markerPoint = map.project(coords);
        var screenCenterY = window.innerHeight / 2;
        
        // El popup aparece ARRIBA del marcador con un offset de ~10px
        var popupTopY = markerPoint.y - popupHeight - 10;
        var popupCenterY = popupTopY + (popupHeight / 2);
        
        // Calcular cuánto necesitamos desplazar el mapa
        var offsetY = screenCenterY - popupCenterY;
        
        console.log('🗺️ [MAPA v274.0] 📐 Calculando centrado del popup:');
        console.log('🗺️ [MAPA v274.0] 📐 - Altura del popup:', popupHeight, 'px');
        console.log('🗺️ [MAPA v274.0] 📐 - Centro de pantalla Y:', screenCenterY, 'px');
        console.log('🗺️ [MAPA v274.0] 📐 - Centro del popup Y:', popupCenterY, 'px');
        console.log('🗺️ [MAPA v274.0] 📐 - Offset necesario Y:', offsetY, 'px');
        
        // Aplicar el offset al punto del marcador
        var targetPoint = { x: markerPoint.x, y: markerPoint.y + offsetY };
        var targetCoords = map.unproject(targetPoint);
        
        // Paso 6: Hacer un segundo flyTo para centrar el popup
        map.flyTo({
          center: targetCoords,
          zoom: 17,
          speed: 1.5,
          curve: 1,
          duration: 400,
          essential: true
        });
        
        console.log('🗺️ [MAPA v274.0] ✅ Popup centrado dinámicamente en la pantalla');
        console.log('🗺️ [MAPA v274.0] ✅ El POPUP ahora queda completamente visible y centrado');
      }, 100);
      
      // Remover el listener para evitar múltiples ejecuciones
      map.off('moveend', onMoveEnd);
    };
    
    // Registrar el listener
    map.on('moveend', onMoveEnd);
    
  } else {
    console.log('🗺️ [MAPA v274.0] ❌ No se encontró ningún local visible en el área de proximidad');
    console.log('🗺️ [MAPA v274.0] 💡 Posibles razones:');
    console.log('🗺️ [MAPA v274.0] 💡 1. No hay marcadores cerca del clic (20px de radio)');
    console.log('🗺️ [MAPA v274.0] 💡 2. Los locales cercanos están ocultos por los filtros activos');
    console.log('🗺️ [MAPA v274.0] 💡 3. Intenta hacer clic directamente sobre un marcador visible');
    // ✅ NO HACER NADA si no se encuentra ningún local que cumpla los filtros
  }
});

// 🚀 CLICK EN CLUSTERS - HACER ZOOM
map.on('click', 'clusters', function(e) {
  var features = map.queryRenderedFeatures(e.point, {
    layers: ['clusters']
  });
  
  if (!features.length) return;
  
  var clusterId = features[0].properties.cluster_id;
  var source = map.getSource('locales-source');
  
  source.getClusterExpansionZoom(clusterId, function(err, zoom) {
    if (err) return;
    
    map.easeTo({
      center: features[0].geometry.coordinates,
      zoom: zoom
    });
  });
});

// 🚀 CAMBIAR CURSOR AL PASAR SOBRE ELEMENTOS CLICKEABLES
map.on('mouseenter', 'locales-layer', function() {
  map.getCanvas().style.cursor = 'pointer';
});

map.on('mouseleave', 'locales-layer', function() {
  map.getCanvas().style.cursor = '';
});

map.on('mouseenter', 'locales-icons', function() {
  map.getCanvas().style.cursor = 'pointer';
});

map.on('mouseleave', 'locales-icons', function() {
  map.getCanvas().style.cursor = '';
});

map.on('mouseenter', 'clusters', function() {
  map.getCanvas().style.cursor = 'pointer';
});

map.on('mouseleave', 'clusters', function() {
  map.getCanvas().style.cursor = '';
});

// ✅ CRITICAL: Resize map on window resize for proper rendering
window.addEventListener('resize', function() {
  map.resize();
  console.log('🗺️ [MAPA v274.0] ✅ map.resize() ejecutado en window resize');
});

console.log('🗺️ [MAPA v275.0] ═══════════════════════════════════════════════════════');
console.log('🗺️ [MAPA v275.0] ✅ Sistema de mapa configurado completamente');
console.log('🗺️ [MAPA v275.0] ✅ CÁLCULO DE ESTADO EN TIEMPO REAL activado');
console.log('🗺️ [MAPA v275.0] ✅ Sincronizado con horarios_completos de cada local');
console.log('🗺️ [MAPA v275.0] ✅ Manejo correcto de horarios nocturnos (23:00-06:00)');
console.log('🗺️ [MAPA v275.0] ✅ Manejo correcto de locales que abren después de medianoche');
console.log('🗺️ [MAPA v275.0] ✅ DETECCIÓN MANUAL CON PROYECCIÓN A PÍXELES activada');
console.log('🗺️ [MAPA v275.0] ✅ Tolerancia fija: 20 píxeles (tamaño del dedo)');
console.log('🗺️ [MAPA v275.0] ✅ Área de clic CONSISTENTE sin importar el zoom');
console.log('🗺️ [MAPA v275.0] ✅ Proyección: map.project([lng, lat]) → coordenadas de pantalla');
console.log('🗺️ [MAPA v275.0] ✅ Distancia en píxeles: sqrt(dx² + dy²)');
console.log('🗺️ [MAPA v275.0] ✅ SINCRONIZACIÓN CON FILTROS: valida categoría y estado');
console.log('🗺️ [MAPA v275.0] ✅ Búsqueda del local MÁS CERCANO (minimaDistanciaPixeles)');
console.log('🗺️ [MAPA v275.0] ✅ window.allLocales: Array global con todos los locales');
console.log('🗺️ [MAPA v275.0] ✅ touch-action: none para evitar scroll del navegador');
console.log('🗺️ [MAPA v275.0] ✅ POPUP CENTRADO DINÁMICAMENTE (v267.0)');
console.log('🗺️ [MAPA v275.0] ✅ Altura del popup calculada desde el DOM');
console.log('🗺️ [MAPA v275.0] ═══════════════════════════════════════════════════════');
</script>
</body>
</html>`;
  }, [userLocation]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('🗺️ [MAPA v274.0] Permisos de ubicación denegados');
          setUserLocation({ lat: 40.4168, lng: -3.7038 });
          return;
        }

        console.log('🗺️ [MAPA v274.0] Obteniendo ubicación del usuario...');
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        console.log('🗺️ [MAPA v274.0] Ubicación obtenida:', location.coords.latitude, location.coords.longitude);
        setUserLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      } catch (error) {
        console.error('🗺️ [MAPA v274.0] Error obteniendo ubicación:', error);
        setUserLocation({ lat: 40.4168, lng: -3.7038 });
      }
    })();
  }, []);

  useEffect(() => {
    console.log('🗺️ [MAPA v275.0] Filtros cambiados');
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
    
    console.log('🗺️ [MAPA v275.0] 📍 Inyectando ubicación del usuario');
    
    webViewRef.current.injectJavaScript(`
      (function() {
        try {
          if (typeof window.updateUserLocation !== 'undefined') {
            window.updateUserLocation(${userLocation.lat}, ${userLocation.lng});
          }
        } catch (error) {
          console.error('🗺️ [MAPA v275.0] ❌ Error actualizando ubicación:', error);
        }
      })();
      true;
    `);
  }, [userLocation, isMapReady]);

  const centerOnUser = useCallback(() => {
    if (userLocation && webViewRef.current && isMapReady) {
      console.log('🗺️ [MAPA v275.0] Centrando en ubicación del usuario');
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
        console.log('🗺️ [MAPA v275.0] Navegando a local:', data.id);
        router.push(`/detalle/local?id=${data.id}`);
      } else if (data.type === 'map_ready') {
        console.log('🗺️ [MAPA v275.0] Mapa listo');
        setIsMapReady(true);
      }
    } catch (error) {
      console.error('🗺️ [MAPA v275.0] Error procesando mensaje:', error);
    }
  }, [router]);

  // ✅ FIX v269.0: Standardized control button size to 40px (same as Explorar filter button)
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
          {/* ✅ FIX v271.0: Category buttons now use EXACT same compact style as Explorar */}
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

      {/* ✅ FIX v275.0: Controls with MORE TRANSPARENCY and positioned BELOW header (top: 138-148px) */}
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

      {/* ✅ FIX v275.0: Controls with MORE TRANSPARENCY and positioned BELOW header (top: 138-148px) */}
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

      {/* ✅ FIX v276.0: Center button with TRANSPARENCY and repositioned on Android */}
      <TouchableOpacity 
        style={[styles.centerButton, {
          width: centerButtonSize,
          height: centerButtonSize,
          borderRadius: centerButtonSize / 2,
          // ✅ FIX v276.0: Same position on both platforms (bottom right corner)
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
  // ✅ FIX v274.0: REDUCED padding for minimal margin
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
  // ✅ FIX v271.0: Compact category button (same as Explorar)
  categoriaButtonCompact: {
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
  },
  // ✅ FIX v271.0: Compact category icon container (same as Explorar)
  categoriaIconContainerCompact: {
    width: Platform.OS === 'android' ? 36 : 40,
    height: Platform.OS === 'android' ? 36 : 40,
    borderRadius: Platform.OS === 'android' ? 9 : 10,
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
  // ✅ FIX v271.0: Compact category label (same as Explorar)
  categoriaLabelCompact: {
    fontSize: Platform.OS === 'android' ? 11 : 12,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
  },
  categoriaLabelActive: {
    color: colors.white,
    fontWeight: '700',
  },
  // ✅ FIX v275.0: Controls with MORE TRANSPARENCY (rgba 0.75) and positioned BELOW header (top: 138-148px)
  controlsLeft: {
    position: 'absolute',
    left: 16,
    top: Platform.OS === 'ios' ? 148 : 138, // ✅ MOVED DOWN to 148/138 (18px below header)
    gap: 12,
    zIndex: 5,
  },
  // ✅ FIX v275.0: Controls with MORE TRANSPARENCY (rgba 0.75) and positioned BELOW header (top: 138-148px)
  controlsRight: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'ios' ? 148 : 138, // ✅ MOVED DOWN to 148/138 (18px below header)
    gap: 12,
    zIndex: 5,
    alignItems: 'center',
  },
  // ✅ FIX v275.0: Control button with MORE TRANSPARENCY (rgba 0.75)
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)', // ✅ MORE TRANSPARENCY
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  // ✅ FIX v275.0: Estado selector with MORE TRANSPARENCY (rgba 0.75)
  estadoSelectorContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  estadoSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.75)', // ✅ MORE TRANSPARENCY
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
  // ✅ FIX v275.0: Legend with MORE TRANSPARENCY (rgba 0.75)
  leyenda: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.75)', // ✅ MORE TRANSPARENCY
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
  // ✅ FIX v276.0: Center button with TRANSPARENCY (rgba 0.85)
  centerButton: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.85)', // ✅ ADDED TRANSPARENCY
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
