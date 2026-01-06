
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { useRouter } from 'expo-router';
import { getEstadoLocal } from '@/utils/timeUtils';
import FiltrosAvanzadosSheet from '@/components/home/FiltrosAvanzadosSheet';
import { supabase } from '@/utils/supabase';
import { scaleIconSize, scaleFontSize } from '@/utils/androidScaling';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as Location from 'expo-location';
import { useFilters } from '@/contexts/FilterContext';
import { addPubCategoryIfNeeded, getPrimaryIconForVenue } from '@/utils/categorizeLocal';
import { calcularDistancia } from '@/utils/locationUtils';
import { colors, commonStyles } from '@/styles/commonStyles';
import { WebView } from 'react-native-webview';
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
import { Local } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';

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

const CATEGORIAS_LOCALES = [
  { id: 'todas', nombre: 'Todas', emoji: '🎉' },
  { id: 'cafe', nombre: 'Cafés', emoji: '☕' },
  { id: 'restaurante', nombre: 'Restaurantes', emoji: '🍽️' },
  { id: 'bar', nombre: 'Bares', emoji: '🍺' },
  { id: 'pub', nombre: 'Pubs', emoji: '🍻' },
  { id: 'cocteleria', nombre: 'Coctelería', emoji: '🍸' },
  { id: 'discoteca', nombre: 'Discotecas', emoji: '💃' },
];

const COMUNIDAD_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Andalucía': { lat: 37.5443, lng: -4.7278 },
  'Aragón': { lat: 41.5911, lng: -0.9053 },
  'Asturias': { lat: 43.3614, lng: -5.8593 },
  'Islas Baleares': { lat: 39.6953, lng: 3.0176 },
  'Canarias': { lat: 28.2916, lng: -16.6291 },
  'Cantabria': { lat: 43.1828, lng: -3.9878 },
  'Castilla y León': { lat: 41.6523, lng: -4.7245 },
  'Castilla-La Mancha': { lat: 39.2797, lng: -3.0977 },
  'Cataluña': { lat: 41.5912, lng: 1.5209 },
  'Comunidad Valenciana': { lat: 39.4840, lng: -0.7533 },
  'Extremadura': { lat: 39.4937, lng: -6.0679 },
  'Galicia': { lat: 42.5751, lng: -8.1339 },
  'Madrid': { lat: 40.4168, lng: -3.7038 },
  'Murcia': { lat: 37.9922, lng: -1.1307 },
  'Navarra': { lat: 42.6954, lng: -1.6761 },
  'País Vasco': { lat: 43.0000, lng: -2.7500 },
  'La Rioja': { lat: 42.2871, lng: -2.5396 },
};

const PROVINCIA_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Álava': { lat: 42.8467, lng: -2.6716 },
  'Albacete': { lat: 38.9943, lng: -1.8585 },
  'Alicante': { lat: 38.3452, lng: -0.4810 },
  'Almería': { lat: 36.8381, lng: -2.4597 },
  'Asturias': { lat: 43.3614, lng: -5.8593 },
  'Ávila': { lat: 40.6561, lng: -4.6818 },
  'Badajoz': { lat: 38.8794, lng: -6.9707 },
  'Barcelona': { lat: 41.3851, lng: 2.1734 },
  'Burgos': { lat: 42.3439, lng: -3.6969 },
  'Cáceres': { lat: 39.4753, lng: -6.3724 },
  'Cádiz': { lat: 36.5271, lng: -6.2886 },
  'Cantabria': { lat: 43.1828, lng: -3.9878 },
  'Castellón': { lat: 39.9864, lng: -0.0513 },
  'Ciudad Real': { lat: 38.9848, lng: -3.9273 },
  'Córdoba': { lat: 37.8882, lng: -4.7794 },
  'Cuenca': { lat: 40.0704, lng: -2.1374 },
  'Girona': { lat: 41.9794, lng: 2.8214 },
  'Granada': { lat: 37.1773, lng: -3.5986 },
  'Guadalajara': { lat: 40.6318, lng: -3.1679 },
  'Guipúzcoa': { lat: 43.3183, lng: -1.9812 },
  'Huelva': { lat: 37.2614, lng: -6.9447 },
  'Huesca': { lat: 42.1401, lng: -0.4080 },
  'Islas Baleares': { lat: 39.6953, lng: 3.0176 },
  'Jaén': { lat: 37.7796, lng: -3.7849 },
  'La Coruña': { lat: 43.3623, lng: -8.4115 },
  'La Rioja': { lat: 42.2871, lng: -2.5396 },
  'Las Palmas': { lat: 28.1248, lng: -15.4300 },
  'León': { lat: 42.5987, lng: -5.5671 },
  'Lleida': { lat: 41.6176, lng: 0.6200 },
  'Lugo': { lat: 43.0097, lng: -7.5567 },
  'Madrid': { lat: 40.4168, lng: -3.7038 },
  'Málaga': { lat: 36.7213, lng: -4.4214 },
  'Murcia': { lat: 37.9922, lng: -1.1307 },
  'Navarra': { lat: 42.6954, lng: -1.6761 },
  'Ourense': { lat: 42.3406, lng: -7.8636 },
  'Palencia': { lat: 42.0096, lng: -4.5288 },
  'Pontevedra': { lat: 42.4296, lng: -8.6446 },
  'Salamanca': { lat: 40.9701, lng: -5.6635 },
  'Santa Cruz de Tenerife': { lat: 28.4636, lng: -16.2518 },
  'Segovia': { lat: 40.9429, lng: -4.1088 },
  'Sevilla': { lat: 37.3891, lng: -5.9845 },
  'Soria': { lat: 41.7665, lng: -2.4790 },
  'Tarragona': { lat: 41.1189, lng: 1.2445 },
  'Teruel': { lat: 40.3456, lng: -1.1065 },
  'Toledo': { lat: 39.8628, lng: -4.0273 },
  'Valencia': { lat: 39.4699, lng: -0.3763 },
  'Valladolid': { lat: 41.6528, lng: -4.7245 },
  'Vizcaya': { lat: 43.2630, lng: -2.9350 },
  'Zamora': { lat: 41.5034, lng: -5.7467 },
  'Zaragoza': { lat: 41.6488, lng: -0.8891 },
};

export default function MapaScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { globalLocales, refreshData } = useGlobalData();
  const { globalFiltros } = useFilters();
  const webViewRef = useRef<WebView>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isLoadingMarkers, setIsLoadingMarkers] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('todas');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          });
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    })();
  }, []);

  useEffect(() => {
    if (isMapReady && categoriaSeleccionada) {
      generateMapHTML();
    }
  }, [categoriaSeleccionada, isMapReady]);

  useEffect(() => {
    if (isMapReady && globalFiltros) {
      generateMapHTML();
    }
  }, [globalFiltros, isMapReady]);

  useEffect(() => {
    if (globalLocales && globalLocales.length > 0) {
      console.log('[MapaScreen] Global locales updated:', globalLocales.length);
    }
  }, [globalLocales]);

  useEffect(() => {
    refreshData();
  }, []);

  const localesFiltrados = useMemo(() => {
    let filtered = [...(globalLocales || [])];

    if (categoriaSeleccionada !== 'todas') {
      filtered = filtered.filter(local => {
        const barliveTypes = local.barlive_types || [];
        if (categoriaSeleccionada === 'discoteca') {
          return barliveTypes.includes('discoteca') || barliveTypes.includes('sala_conciertos');
        }
        return barliveTypes.includes(categoriaSeleccionada);
      });
    }

    if (globalFiltros?.provincia && globalFiltros.provincia !== 'Todas') {
      filtered = filtered.filter(local => local.provincia === globalFiltros.provincia);
    }

    if (globalFiltros?.comunidad && globalFiltros.comunidad !== 'Todas') {
      filtered = filtered.filter(local => local.comunidad === globalFiltros.comunidad);
    }

    return filtered;
  }, [globalLocales, categoriaSeleccionada, globalFiltros]);

  const localesFiltradosMemo = useMemo(() => localesFiltrados, [localesFiltrados]);

  useEffect(() => {
    if (isMapReady && localesFiltradosMemo.length > 0) {
      setIsLoadingMarkers(true);
      generateMapHTML();
      setTimeout(() => setIsLoadingMarkers(false), 500);
    }
  }, [localesFiltradosMemo]);

  const centerOnUser = useCallback(() => {
    if (userLocation && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (map) {
          map.setView([${userLocation.lat}, ${userLocation.lng}], 15);
        }
        true;
      `);
    }
  }, [userLocation]);

  const handleVerDetalles = (localId: string) => {
    router.push(`/detalle/local?id=${localId}`);
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'mapReady') {
        console.log('[MapaScreen] Map is ready');
        setIsMapReady(true);
      } else if (data.type === 'markerClick') {
        console.log('[MapaScreen] Marker clicked:', data.localId);
        handleVerDetalles(data.localId);
      }
    } catch (error) {
      console.error('[MapaScreen] Error parsing message:', error);
    }
  };

  const generateMapHTML = useCallback(() => {
    const markers = localesFiltradosMemo
      .filter(local => local.latitud && local.longitud)
      .map(local => {
        const estado = getEstadoLocal(local);
        const icon = getPrimaryIconForVenue(local);
        
        return {
          id: local.id,
          lat: parseFloat(local.latitud),
          lng: parseFloat(local.longitud),
          nombre: local.nombre,
          direccion: local.direccion || '',
          icon: icon,
          estado: estado.badge,
          estaAbierto: estado.estaAbierto,
        };
      });

    const initialCenter = userLocation || 
      (globalFiltros?.provincia && PROVINCIA_COORDINATES[globalFiltros.provincia]) ||
      (globalFiltros?.comunidad && COMUNIDAD_COORDINATES[globalFiltros.comunidad]) ||
      { lat: 40.4168, lng: -3.7038 };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { width: 100%; height: 100vh; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map').setView([${initialCenter.lat}, ${initialCenter.lng}], 13);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          const markers = ${JSON.stringify(markers)};
          
          markers.forEach(marker => {
            const markerIcon = L.divIcon({
              html: '<div style="font-size: 24px;">' + marker.icon + '</div>',
              className: 'custom-marker',
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            });
            
            const leafletMarker = L.marker([marker.lat, marker.lng], { icon: markerIcon })
              .addTo(map)
              .bindPopup('<b>' + marker.nombre + '</b><br>' + marker.direccion);
            
            leafletMarker.on('click', () => {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'markerClick',
                localId: marker.id
              }));
            });
          });

          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
        </script>
      </body>
      </html>
    `;

    if (webViewRef.current) {
      webViewRef.current.reload();
    }

    return html;
  }, [localesFiltradosMemo, userLocation, globalFiltros]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {CATEGORIAS_LOCALES.map((categoria) => (
            <TouchableOpacity
              key={categoria.id}
              style={[
                styles.categoryButton,
                categoriaSeleccionada === categoria.id && styles.categoryButtonActive,
              ]}
              onPress={() => setCategoriaSeleccionada(categoria.id)}
            >
              <Text style={styles.categoryEmoji}>{categoria.emoji}</Text>
              <Text
                style={[
                  styles.categoryText,
                  categoriaSeleccionada === categoria.id && styles.categoryTextActive,
                ]}
              >
                {categoria.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <WebView
        ref={webViewRef}
        source={{ html: generateMapHTML() }}
        style={styles.map}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />

      {/* ✅ FIX: Repositioned center button for Android */}
      {userLocation && (
        <TouchableOpacity
          style={styles.centerButton}
          onPress={centerOnUser}
        >
          <IconSymbol
            ios_icon_name="location.fill"
            android_material_icon_name="my_location"
            size={scaleIconSize(24)}
            color={colors.primary}
          />
        </TouchableOpacity>
      )}

      {isLoadingMarkers && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.cardBackground,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  categoriesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryEmoji: {
    fontSize: 18,
  },
  categoryText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: colors.text,
  },
  categoryTextActive: {
    color: colors.white,
  },
  map: {
    flex: 1,
  },
  // ✅ FIX: Repositioned center button for Android
  centerButton: {
    position: 'absolute',
    ...Platform.select({
      ios: {
        bottom: 100,
        right: 20,
      },
      android: {
        bottom: 90, // Position above tab bar
        right: 20,
      },
    }),
    backgroundColor: '#fff',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
