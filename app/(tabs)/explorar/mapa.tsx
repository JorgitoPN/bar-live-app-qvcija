import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useFilters } from '@/contexts/FilterContext';
import FiltrosAvanzadosSheet from '@/components/home/FiltrosAvanzadosSheet';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

const SUPABASE_URL = 'https://embntaqwlwmgazvrglaf.supabase.co';
const SUPABASE_PUBLIC_KEY = 'sb_publishable_ffrXoLqKentwGrBXq3ZTDg_WxsX2y_2';
const WEB_TILE_TEMPLATE =
  SUPABASE_URL + '/functions/v1/map-static-tile/{z}/{x}/{y}.pbf';
const NATIVE_TILE_TEMPLATE =
  'https://media.barliveapp.es/map/static/v404-geom6-z9-canonical/{z}/{x}/{y}.pbf';
const STATE_URL =
  SUPABASE_URL +
  '/rest/v1/map_marker_state_cache?select=local_id,latitud,longitud,tipo,destacado,estado';

const CATEGORIAS = [
  { id: 'todas', nombre: 'Todas', iosIcon: 'sparkles', androidIcon: 'star' },
  { id: 'cafe', nombre: 'Cafés', iosIcon: 'cup.and.saucer.fill', androidIcon: 'local-cafe' },
  { id: 'restaurante', nombre: 'Restaurantes', iosIcon: 'fork.knife', androidIcon: 'restaurant' },
  { id: 'bar', nombre: 'Bares', iosIcon: 'wineglass.fill', androidIcon: 'local-bar' },
  { id: 'pub', nombre: 'Pubs', iosIcon: 'mug.fill', androidIcon: 'sports-bar' },
  { id: 'cocteleria', nombre: 'Coctelería', iosIcon: 'wineglass', androidIcon: 'liquor' },
  { id: 'discoteca', nombre: 'Discotecas', iosIcon: 'music.note', androidIcon: 'nightlife' },
];

type Estado = 'todos' | 'no_cerrados';

const normalizeCategory = (value?: string | null) => {
  const v = String(value || 'todas').toLowerCase().trim();
  if (v === 'cafe') return 'cafeteria';
  if (v === 'restaurant') return 'restaurante';
  if (v === 'nightclub' || v === 'club') return 'discoteca';
  if (v === 'cocktail' || v === 'cocktail_bar') return 'cocteleria';
  return v || 'todas';
};

const CategoriaButton = React.memo(
  ({
    categoria,
    isSelected,
    onPress,
  }: {
    categoria: (typeof CATEGORIAS)[0];
    isSelected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={styles.categoriaButton}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.categoriaIcon,
          isSelected && styles.categoriaIconActive,
        ]}
      >
        <IconSymbol
          ios_icon_name={categoria.iosIcon as any}
          android_material_icon_name={categoria.androidIcon}
          size={Platform.OS === 'android' ? 16 : 18}
          color={isSelected ? colors.primary : colors.white}
        />
      </View>
      <Text
        style={[
          styles.categoriaLabel,
          isSelected && styles.categoriaLabelActive,
        ]}
      >
        {categoria.nombre}
      </Text>
    </TouchableOpacity>
  )
);
CategoriaButton.displayName = 'CategoriaButton';

function buildMapHtml(
  lat: number,
  lng: number,
  zoom: number,
  category: string,
  state: Estado
) {
  const tileTemplate =
    Platform.OS === 'web' ? WEB_TILE_TEMPLATE : NATIVE_TILE_TEMPLATE;
  const categoryJson = JSON.stringify(normalizeCategory(category));
  const stateJson = JSON.stringify(state);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@3.6.2/dist/maplibre-gl.css"/>
<script src="https://cdn.jsdelivr.net/npm/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
<style>
*{box-sizing:border-box}
html,body,#map{margin:0;width:100%;height:100%;overflow:hidden;background:#A8E0FF}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.maplibregl-canvas{outline:none}
.maplibregl-ctrl-attrib{font-size:9px!important;opacity:.65}
.maplibregl-ctrl-logo{opacity:.7}
.maplibregl-popup-content{padding:0;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.18)}
.b-popup{padding:10px 12px;min-width:150px}
.b-title{font-size:13px;font-weight:800;color:#0f172a;margin-bottom:7px}
.b-button{border:0;border-radius:8px;background:#14b8a6;color:#fff;padding:8px 10px;font-size:11px;font-weight:800;cursor:pointer;width:100%}
</style>
</head>
<body>
<div id="map"></div>
<script>
(function(){
  var selectedCategory = ${categoryJson};
  var selectedState = ${stateJson};
  var userMarker = null;

  function send(payload) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      } else if (window.parent) {
        window.parent.postMessage({ __barliveMap: true, payload: payload }, '*');
      }
    } catch (_) {}
  }

  function normalizedCategory(value) {
    var v = String(value || 'todas').toLowerCase();
    if (v === 'cafe') return 'cafeteria';
    if (v === 'restaurant') return 'restaurante';
    if (v === 'nightclub' || v === 'club') return 'discoteca';
    if (v === 'cocktail' || v === 'cocktail_bar') return 'cocteleria';
    return v || 'todas';
  }

  var map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [${lng}, ${lat}],
    zoom: ${zoom},
    minZoom: 4,
    maxZoom: 20,
    attributionControl: true,
    renderWorldCopies: false,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    keyboard: false,
    doubleClickZoom: true,
    scrollZoom: true,
    boxZoom: true,
    dragPan: true,
    fadeDuration: 0,
    crossSourceCollisions: false,
    cancelPendingTileRequestsWhileZooming: true,
    maxTileCacheZoomLevels: 3,
    validateStyle: false
  });

  try { map.touchZoomRotate.disableRotation(); } catch (_) {}

  function drawCenteredEmoji(ctx, emoji, cx, cy, fontSize, category) {
    ctx.font = fontSize + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var dx = category === 'restaurante' ? -2 : 0;
    ctx.fillText(emoji, cx + dx, cy + 1);
  }

  function addMarkerImage(name, category, markerState) {
    if (map.hasImage(name)) return;
    var emoji = {
      cafeteria: '☕',
      restaurante: '🍽️',
      bar: '🍺',
      pub: '🍻',
      cocteleria: '🍸',
      discoteca: '🪩',
      default: '📍'
    }[category] || '📍';

    var fill = {
      abierto: '#22C55E',
      cerrado: '#EF4444',
      sin_info: '#94A3B8'
    }[markerState] || '#94A3B8';

    var canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,64,64);
    ctx.beginPath();
    ctx.arc(32,32,28,0,Math.PI*2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    drawCenteredEmoji(ctx, emoji, 32, 32, 25, category);

    map.addImage(name, {
      width: 64,
      height: 64,
      data: ctx.getImageData(0,0,64,64).data
    });
  }

  function loadImages() {
    ['cafeteria','restaurante','bar','pub','cocteleria','discoteca','default'].forEach(function(cat){
      ['abierto','cerrado','sin_info'].forEach(function(st){
        addMarkerImage('venue-' + cat + '-' + st, cat, st);
      });
    });
  }

  function staticFilter() {
    if (selectedState === 'no_cerrados') {
      return ['==', ['get','id'], '__never__'];
    }
    if (!selectedCategory || selectedCategory === 'todas') return true;
    return ['==', ['get','tipo'], selectedCategory];
  }

  function realtimeFilter() {
    var filters = ['all'];
    if (selectedCategory && selectedCategory !== 'todas') {
      filters.push(['==', ['get','tipo'], selectedCategory]);
    }
    if (selectedState === 'no_cerrados') {
      filters.push(['==', ['get','estado'], 'abierto']);
    }
    return filters;
  }

  function applyFilters() {
    ['barlive-static-markers','barlive-static-icons','barlive-static-labels'].forEach(function(id){
      if (map.getLayer(id)) map.setFilter(id, staticFilter());
    });
    ['barlive-state-markers','barlive-state-icons'].forEach(function(id){
      if (map.getLayer(id)) map.setFilter(id, realtimeFilter());
    });
  }

  function toFeatures(rows) {
    return rows.map(function(row){
      var rowLat = Number(row && row.latitud);
      var rowLon = Number(row && row.longitud);
      if (!isFinite(rowLat) || !isFinite(rowLon)) return null;
      return {
        type:'Feature',
        id:String(row.local_id || ''),
        geometry:{type:'Point',coordinates:[rowLon,rowLat]},
        properties:{
          id:String(row.local_id || ''),
          tipo:String(row.tipo || 'bar'),
          destacado:!!row.destacado,
          estado:String(row.estado || 'sin_info')
        }
      };
    }).filter(Boolean);
  }

  function loadState() {
    fetch('https://embntaqwlwmgazvrglaf.supabase.co/rest/v1/map_marker_state_cache?select=local_id,latitud,longitud,tipo,destacado,estado', {
      headers: {
        Accept: 'application/json',
        apikey: 'sb_publishable_ffrXoLqKentwGrBXq3ZTDg_WxsX2y_2'
      },
      cache: 'default'
    })
      .then(function(r){
        if (!r.ok) throw new Error('state HTTP ' + r.status);
        return r.json();
      })
      .then(function(rows){
        if (!Array.isArray(rows)) return;
        var source = map.getSource('barlive-state');
        if (source) source.setData({type:'FeatureCollection',features:toFeatures(rows)});
        applyFilters();
        send({type:'state_ready',count:rows.length});
      })
      .catch(function(error){
        console.warn('[BarLive map] state overlay error', error);
      });
  }

  function showPopup(feature, coordinates) {
    var p = feature && feature.properties || {};
    var name = String(p.nombre || 'Local BarLive');
    var id = String(p.id || feature.id || '');
    if (!id) return;

    var root = document.createElement('div');
    root.className = 'b-popup';

    var title = document.createElement('div');
    title.className = 'b-title';
    title.textContent = name;
    root.appendChild(title);

    var button = document.createElement('button');
    button.className = 'b-button';
    button.textContent = 'Ver local';
    button.onclick = function(){ send({type:'navigate',id:id}); };
    root.appendChild(button);

    new maplibregl.Popup({closeButton:false,offset:16})
      .setLngLat(coordinates)
      .setDOMContent(root)
      .addTo(map);
  }

  function handleClick(event) {
    var feature = event && event.features && event.features[0];
    if (!feature) return;
    var coordinates = feature.geometry && feature.geometry.coordinates;
    if (!coordinates) return;
    showPopup(feature, coordinates.slice());
  }

  map.once('style.load', function(){
    loadImages();

    map.addSource('barlive-static', {
      type:'vector',
      tiles:['${tileTemplate}'],
      minzoom:4,
      maxzoom:9,
      bounds:[-18.25,27.45,4.55,44.25],
      scheme:'xyz',
      promoteId:'id'
    });

    map.addLayer({
      id:'barlive-static-markers',
      type:'circle',
      source:'barlive-static',
      'source-layer':'locales',
      minzoom:4,
      filter:staticFilter(),
      paint:{
        'circle-radius':['interpolate',['linear'],['zoom'],4,1.4,7,2.1,9,3,10.5,5.5,13,5,20,5],
        'circle-color':'#94A3B8',
        'circle-opacity':.96,
        'circle-stroke-width':['interpolate',['linear'],['zoom'],4,0,9,0,10.5,1.5,20,1.5],
        'circle-stroke-color':['case',['==',['get','destacado'],true],'#F59E0B','#fff']
      }
    });

    map.addLayer({
      id:'barlive-static-icons',
      type:'symbol',
      source:'barlive-static',
      'source-layer':'locales',
      minzoom:10.65,
      filter:staticFilter(),
      layout:{
        'icon-image':['concat','venue-',
          ['case',
            ['==',['get','tipo'],'cafeteria'],'cafeteria',
            ['==',['get','tipo'],'restaurante'],'restaurante',
            ['==',['get','tipo'],'pub'],'pub',
            ['==',['get','tipo'],'cocteleria'],'cocteleria',
            ['==',['get','tipo'],'discoteca'],'discoteca',
            ['==',['get','tipo'],'bar'],'bar',
            'default'
          ],
          '-sin_info'
        ],
        'icon-size':['interpolate',['linear'],['zoom'],10.45,.24,11,.29,12,.36,13,.45,16,.54,20,.58],
        'icon-anchor':'center',
        'icon-allow-overlap':true,
        'icon-ignore-placement':true,
        'icon-padding':0
      }
    });

    map.addLayer({
      id:'barlive-static-labels',
      type:'symbol',
      source:'barlive-static',
      'source-layer':'locales',
      minzoom:17,
      filter:staticFilter(),
      layout:{
        'text-field':['coalesce',['get','nombre'],''],
        'text-size':['interpolate',['linear'],['zoom'],17,10,20,13],
        'text-offset':[0,1.15],
        'text-anchor':'top',
        'text-optional':true,
        'text-allow-overlap':false
      },
      paint:{
        'text-color':'#202124',
        'text-halo-color':'#fff',
        'text-halo-width':1.5
      }
    });

    map.addSource('barlive-state', {
      type:'geojson',
      data:{type:'FeatureCollection',features:[]},
      promoteId:'id'
    });

    map.addLayer({
      id:'barlive-state-markers',
      type:'circle',
      source:'barlive-state',
      minzoom:4,
      filter:realtimeFilter(),
      paint:{
        'circle-radius':['interpolate',['linear'],['zoom'],4,1.4,7,2.1,9,3,10.5,5.5,13,5,20,5],
        'circle-color':['case',['==',['get','estado'],'abierto'],'#22C55E',['==',['get','estado'],'cerrado'],'#EF4444','#94A3B8'],
        'circle-opacity':1,
        'circle-stroke-width':['interpolate',['linear'],['zoom'],4,0,9,0,10.5,1.5,20,1.5],
        'circle-stroke-color':['case',['==',['get','destacado'],true],'#F59E0B','#fff']
      }
    });

    map.addLayer({
      id:'barlive-state-icons',
      type:'symbol',
      source:'barlive-state',
      minzoom:10.65,
      filter:realtimeFilter(),
      layout:{
        'icon-image':['concat','venue-',
          ['case',
            ['==',['get','tipo'],'cafeteria'],'cafeteria',
            ['==',['get','tipo'],'restaurante'],'restaurante',
            ['==',['get','tipo'],'pub'],'pub',
            ['==',['get','tipo'],'cocteleria'],'cocteleria',
            ['==',['get','tipo'],'discoteca'],'discoteca',
            ['==',['get','tipo'],'bar'],'bar',
            'default'
          ],
          '-',
          ['case',
            ['==',['get','estado'],'abierto'],'abierto',
            ['==',['get','estado'],'cerrado'],'cerrado',
            'sin_info'
          ]
        ],
        'icon-size':['interpolate',['linear'],['zoom'],10.45,.24,11,.29,12,.36,13,.45,16,.54,20,.58],
        'icon-anchor':'center',
        'icon-allow-overlap':true,
        'icon-ignore-placement':true,
        'icon-padding':0
      }
    });

    ['barlive-state-icons','barlive-state-markers','barlive-static-icons','barlive-static-markers'].forEach(function(id){
      map.on('click',id,handleClick);
      map.on('mouseenter',id,function(){ map.getCanvas().style.cursor='pointer'; });
      map.on('mouseleave',id,function(){ map.getCanvas().style.cursor=''; });
    });

    loadState();
    setInterval(loadState,120000);
    applyFilters();
    send({type:'map_ready'});
  });

  window.filtrarCategoria = function(cat) {
    selectedCategory = normalizedCategory(cat);
    applyFilters();
  };

  window.setStateFilter = function(nextState) {
    selectedState = nextState === 'no_cerrados' ? 'no_cerrados' : 'todos';
    applyFilters();
  };

  window.applyAdvancedFilters = function(criteria) {
    if (criteria && Array.isArray(criteria.tipo) && criteria.tipo.length) {
      selectedCategory = normalizedCategory(criteria.tipo[0]);
    }
    applyFilters();
  };

  window.updateUserLocation = function(nextLat, nextLon) {
    nextLat = Number(nextLat);
    nextLon = Number(nextLon);
    if (!isFinite(nextLat) || !isFinite(nextLon)) return;
    if (!userMarker) {
      var el = document.createElement('div');
      el.style.width='18px';
      el.style.height='18px';
      el.style.borderRadius='50%';
      el.style.background='#2563EB';
      el.style.border='4px solid #fff';
      el.style.boxShadow='0 2px 8px rgba(37,99,235,.35)';
      userMarker = new maplibregl.Marker({element:el,anchor:'center'})
        .setLngLat([nextLon,nextLat])
        .addTo(map);
    } else {
      userMarker.setLngLat([nextLon,nextLat]);
    }
  };

  window.flyToLocation = function(nextLat, nextLon, nextZoom) {
    map.easeTo({
      center:[Number(nextLon),Number(nextLat)],
      zoom:Number(nextZoom || 15),
      duration:500
    });
  };

  function handleCommand(cmd) {
    if (!cmd || typeof cmd !== 'object') return;
    if (cmd.type === 'category') window.filtrarCategoria(cmd.value);
    if (cmd.type === 'state') window.setStateFilter(cmd.value);
    if (cmd.type === 'filters') window.applyAdvancedFilters(cmd.value || {});
    if (cmd.type === 'location') window.updateUserLocation(cmd.lat,cmd.lng);
    if (cmd.type === 'fly') window.flyToLocation(cmd.lat,cmd.lng,cmd.zoom);
  }

  window.addEventListener('message', function(event){
    var data = event && event.data;
    if (data && data.__barliveCommand) handleCommand(data.command);
  });
})();
</script>
</body>
</html>`;
}

export default function MapaScreen() {
  const router = useRouter();
  const {
    filtros: globalFiltros,
    setFiltros,
    limpiarFiltros,
    hasActiveFilters,
  } = useFilters();

  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<any>(null);

  const categoriaSeleccionada = useMemo(() => {
    if (globalFiltros.tipo && globalFiltros.tipo.length > 0) {
      return globalFiltros.tipo[0];
    }
    return 'todas';
  }, [globalFiltros.tipo]);

  const [filtroEstado, setFiltroEstado] = useState<Estado>('todos');
  const [userLocation, setUserLocation] = useState({ lat: 40.4168, lng: -3.7038 });
  const [isMapReady, setIsMapReady] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!alive) return;
        setUserLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  const mapHTML = useMemo(
    () =>
      buildMapHtml(
        userLocation.lat,
        userLocation.lng,
        13,
        categoriaSeleccionada,
        filtroEstado
      ),
    []
  );

  const handlePayload = useCallback(
    (data: any) => {
      if (!data) return;
      if (data.type === 'map_ready') {
        setIsMapReady(true);
      } else if (data.type === 'navigate' && data.id) {
        router.push(`/detalle/local?id=${data.id}` as any);
      }
    },
    [router]
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const listener = (event: any) => {
      const data = event?.data;
      if (data?.__barliveMap) handlePayload(data.payload);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [handlePayload]);

  const sendCommand = useCallback((command: any) => {
    if (Platform.OS === 'web') {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          { __barliveCommand: true, command },
          '*'
        );
      } catch {}
      return;
    }

    const json = JSON.stringify(command).replace(/</g, '\\u003c');
    webViewRef.current?.injectJavaScript(`
      (function(){
        var cmd=${json};
        if(cmd.type==='category' && window.filtrarCategoria) window.filtrarCategoria(cmd.value);
        if(cmd.type==='state' && window.setStateFilter) window.setStateFilter(cmd.value);
        if(cmd.type==='filters' && window.applyAdvancedFilters) window.applyAdvancedFilters(cmd.value||{});
        if(cmd.type==='location' && window.updateUserLocation) window.updateUserLocation(cmd.lat,cmd.lng);
        if(cmd.type==='fly' && window.flyToLocation) window.flyToLocation(cmd.lat,cmd.lng,cmd.zoom);
      })();
      true;
    `);
  }, []);

  useEffect(() => {
    if (!isMapReady) return;
    sendCommand({ type: 'category', value: categoriaSeleccionada });
  }, [categoriaSeleccionada, isMapReady, sendCommand]);

  useEffect(() => {
    if (!isMapReady) return;
    sendCommand({ type: 'state', value: filtroEstado });
  }, [filtroEstado, isMapReady, sendCommand]);

  useEffect(() => {
    if (!isMapReady) return;
    sendCommand({
      type: 'filters',
      value: {
        tipo: globalFiltros.tipo || [],
        servicios: globalFiltros.servicios || [],
        ambiente: globalFiltros.ambiente || [],
        clientela: globalFiltros.clientela || [],
        comunidad: globalFiltros.comunidad || null,
        provincia: globalFiltros.provincia || null,
        distancia: globalFiltros.distancia || null,
      },
    });
  }, [globalFiltros, isMapReady, sendCommand]);

  useEffect(() => {
    if (!isMapReady) return;
    sendCommand({
      type: 'location',
      lat: userLocation.lat,
      lng: userLocation.lng,
    });
  }, [userLocation, isMapReady, sendCommand]);

  const handleCategoriaChange = useCallback(
    (id: string) => {
      setFiltros({
        ...globalFiltros,
        tipo: id === 'todas' ? undefined : [id],
      });
    },
    [globalFiltros, setFiltros]
  );

  const centerOnUser = useCallback(() => {
    sendCommand({
      type: 'fly',
      lat: userLocation.lat,
      lng: userLocation.lng,
      zoom: 16,
    });
  }, [sendCommand, userLocation]);

  return (
    <View style={commonStyles.container}>
      <View style={styles.mapContainer}>
        {Platform.OS === 'web'
          ? React.createElement('iframe' as any, {
              ref: iframeRef,
              srcDoc: mapHTML,
              title: 'Mapa BarLive',
              style: {
                width: '100%',
                height: '100%',
                border: 0,
                display: 'block',
                background: '#A8E0FF',
              },
              allow: 'geolocation',
            })
          : (
            <WebView
              ref={webViewRef}
              source={{ html: mapHTML }}
              style={styles.webview}
              onMessage={(event: any) => {
                try {
                  handlePayload(JSON.parse(event.nativeEvent.data));
                } catch {}
              }}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState={false}
              cacheEnabled
              incognito={false}
              androidLayerType="hardware"
              androidHardwareAccelerationDisabled={false}
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
        <TouchableOpacity style={styles.controlButton} onPress={() => router.back()}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={20}
            color={colors.text}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setMostrarFiltros(true)}
        >
          <IconSymbol
            ios_icon_name="slider.horizontal.3"
            android_material_icon_name="tune"
            size={20}
            color={colors.primary}
          />
          {hasActiveFilters ? <View style={styles.activeDot} /> : null}
        </TouchableOpacity>

        {hasActiveFilters ? (
          <TouchableOpacity
            style={[styles.controlButton, styles.clearButton]}
            onPress={limpiarFiltros}
          >
            <IconSymbol
              ios_icon_name="xmark"
              android_material_icon_name="close"
              size={18}
              color="#fff"
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.controlsRight}>
        <View style={styles.estadoSelector}>
          <TouchableOpacity
            style={[
              styles.estadoOption,
              filtroEstado === 'todos' && styles.estadoOptionActive,
            ]}
            onPress={() => setFiltroEstado('todos')}
          >
            <Text
              style={[
                styles.estadoText,
                filtroEstado === 'todos' && styles.estadoTextActive,
              ]}
            >
              Todos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.estadoOption,
              filtroEstado === 'no_cerrados' && styles.estadoOptionActive,
            ]}
            onPress={() => setFiltroEstado('no_cerrados')}
          >
            <Text
              style={[
                styles.estadoText,
                filtroEstado === 'no_cerrados' && styles.estadoTextActive,
              ]}
            >
              Abiertos
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#22C55E' }]} />
            <Text style={styles.legendText}>Abierto</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>Cerrado</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#94A3B8' }]} />
            <Text style={styles.legendText}>S/Info</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.centerButton} onPress={centerOnUser}>
        <IconSymbol
          ios_icon_name="location.fill"
          android_material_icon_name="my_location"
          size={Platform.OS === 'android' ? scaleIconSize(22) : 22}
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
  mapContainer: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#A8E0FF' },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : Platform.OS === 'web' ? 8 : 14,
    paddingBottom: 8,
  },
  categoriasScroll: {
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoriaButton: {
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
  },
  categoriaIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,.3)',
  },
  categoriaIconActive: {
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  categoriaLabel: {
    fontSize: Platform.OS === 'android' ? scaleFontSize(11) : 12,
    fontWeight: '600',
    color: '#fff',
  },
  categoriaLabelActive: {
    fontWeight: '800',
    color: '#fff',
  },
  controlsLeft: {
    position: 'absolute',
    left: 16,
    top: Platform.OS === 'ios' ? 145 : Platform.OS === 'web' ? 102 : 108,
    gap: 10,
    zIndex: 12,
  },
  controlsRight: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'ios' ? 145 : Platform.OS === 'web' ? 102 : 108,
    gap: 10,
    zIndex: 12,
    alignItems: 'center',
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,.92)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  clearButton: { backgroundColor: '#EF4444' },
  activeDot: {
    position: 'absolute',
    right: 3,
    top: 3,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#fff',
  },
  estadoSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,.92)',
    borderRadius: 16,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,.2)',
  },
  estadoOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    minWidth: 62,
    alignItems: 'center',
  },
  estadoOptionActive: { backgroundColor: colors.primary },
  estadoText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  estadoTextActive: { color: '#fff' },
  legend: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,.92)',
  },
  legendItem: { alignItems: 'center', gap: 2 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 9, fontWeight: '700', color: colors.text },
  centerButton: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 7,
  },
});
