
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import TarjetaLocal from '@/components/home/TarjetaLocal';
import BarraFiltrosInteractiva from '@/components/home/BarraFiltrosInteractiva';
import * as Location from 'expo-location';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ✅ MAXIMUM DISTANCE FOR FEATURED LOCALS (in km)
const MAX_FEATURED_DISTANCE_KM = 100;

interface Local {
  id: string;
  nombre: string;
  tipo: string;
  direccion: string;
  provincia: string;
  imagen_url?: string;
  rating: number;
  google_rating?: number;
  precio_medio?: number;
  destacado: boolean;
  nuevo: boolean;
  abierto: boolean;
  distancia?: number;
  latitud?: number;
  longitud?: number;
  popularidad?: number;
}

interface Filtro {
  id: string;
  label: string;
  icon?: string;
  activo?: boolean;
}

export default function HomeScreen() {
  const router = useRouter();
  const { userId, user, isImpersonating } = useEffectiveUser();
  const { impersonationSession } = useImpersonation();
  const [locales, setLocales] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [filtros, setFiltros] = useState({
    tipo: 'todos',
    provincia: 'todos',
    precioMedio: 'todos',
    abierto: false,
    destacado: false,
  });

  const filtrosArray: Filtro[] = useMemo(() => [
    {
      id: 'todos',
      label: 'Todos',
      icon: 'building.2',
      activo: filtros.tipo === 'todos',
    },
    {
      id: 'bar',
      label: 'Bares',
      icon: 'wineglass',
      activo: filtros.tipo === 'bar',
    },
    {
      id: 'restaurante',
      label: 'Restaurantes',
      icon: 'fork.knife',
      activo: filtros.tipo === 'restaurante',
    },
    {
      id: 'discoteca',
      label: 'Discotecas',
      icon: 'music.note',
      activo: filtros.tipo === 'discoteca',
    },
    {
      id: 'abierto',
      label: 'Abierto ahora',
      icon: 'clock',
      activo: filtros.abierto,
    },
    {
      id: 'destacado',
      label: 'Destacados',
      icon: 'star.fill',
      activo: filtros.destacado,
    },
  ], [filtros]);

  const obtenerUbicacion = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[Home] Permiso de ubicación denegado');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      console.log('[Home] ✅ Ubicación obtenida:', {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error) {
      console.error('[Home] Error obteniendo ubicación:', error);
    }
  }, []);

  const calcularDistancia = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const cargarLocales = useCallback(async () => {
    try {
      console.log(`[Home] 🔄 Cargando locales para usuario ${userId} (${isImpersonating ? 'IMPERSONATING' : 'NORMAL'})`);
      
      let query = supabase
        .from('locales')
        .select('*')
        .eq('activo', true)
        .limit(200);

      // Aplicar filtros
      if (filtros.tipo !== 'todos') {
        query = query.eq('tipo', filtros.tipo);
      }

      if (filtros.provincia !== 'todos') {
        query = query.eq('provincia', filtros.provincia);
      }

      if (filtros.precioMedio !== 'todos') {
        const precioNum = parseInt(filtros.precioMedio);
        query = query.eq('precio_medio', precioNum);
      }

      if (filtros.abierto) {
        query = query.eq('abierto', true);
      }

      if (filtros.destacado) {
        query = query.eq('destacado', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      let localesConDistancia = data || [];

      // ✅ FIXED SORTING LOGIC v6 - Featured beyond 100km are EXCLUDED, non-featured within 100km are prioritized
      if (userLocation) {
        console.log('[Home] 📍 User location:', userLocation);
        
        // Calculate distance for all locals
        localesConDistancia = localesConDistancia.map(local => {
          if (local.latitud && local.longitud) {
            const distancia = calcularDistancia(
              userLocation.latitude,
              userLocation.longitude,
              parseFloat(local.latitud.toString()),
              parseFloat(local.longitud.toString())
            );
            return { ...local, distancia };
          }
          return { ...local, distancia: 999 };
        });

        // ✅ CRITICAL FIX: Separate featured and non-featured by distance
        const destacadosCerca = localesConDistancia.filter(l => 
          l.destacado === true && l.distancia !== undefined && l.distancia <= MAX_FEATURED_DISTANCE_KM
        );
        
        const noDestacadosCerca = localesConDistancia.filter(l => 
          !l.destacado && l.distancia !== undefined && l.distancia <= MAX_FEATURED_DISTANCE_KM
        );

        const noDestacadosLejos = localesConDistancia.filter(l => 
          !l.destacado && l.distancia !== undefined && l.distancia > MAX_FEATURED_DISTANCE_KM
        );

        // Featured locals beyond MAX_FEATURED_DISTANCE_KM are EXCLUDED
        const destacadosMuyLejos = localesConDistancia.filter(l => 
          l.destacado === true && l.distancia !== undefined && l.distancia > MAX_FEATURED_DISTANCE_KM
        );

        console.log('[Home] 📍 Destacados ≤100km:', destacadosCerca.length);
        console.log('[Home] 📍 No destacados ≤100km:', noDestacadosCerca.length);
        console.log('[Home] 📍 No destacados >100km:', noDestacadosLejos.length);
        console.log('[Home] 🚫 Destacados >100km (EXCLUDED):', destacadosMuyLejos.length);

        if (destacadosMuyLejos.length > 0) {
          console.log('[Home] 🚫 Excluded featured locals (too far):');
          destacadosMuyLejos.forEach(l => {
            console.log(`  - ${l.nombre} (${l.distancia?.toFixed(1)}km) - ${l.direccion}`);
          });
        }

        // Sort featured locals ≤100km by distance
        destacadosCerca.sort((a, b) => {
          const distA = a.distancia !== undefined && a.distancia !== null ? a.distancia : 999;
          const distB = b.distancia !== undefined && b.distancia !== null ? b.distancia : 999;
          return distA - distB;
        });

        // Sort non-featured locals by distance
        noDestacadosCerca.sort((a, b) => {
          const distA = a.distancia !== undefined && a.distancia !== null ? a.distancia : 999;
          const distB = b.distancia !== undefined && b.distancia !== null ? b.distancia : 999;
          return distA - distB;
        });

        noDestacadosLejos.sort((a, b) => {
          const distA = a.distancia !== undefined && a.distancia !== null ? a.distancia : 999;
          const distB = b.distancia !== undefined && b.distancia !== null ? b.distancia : 999;
          return distA - distB;
        });

        // ✅ FIXED PRIORITY ORDER:
        // 1. Featured ≤100km (by distance)
        // 2. Non-featured ≤100km (by distance) - PRIORITIZED OVER FAR FEATURED
        // 3. Non-featured >100km (by distance)
        // Featured >100km are EXCLUDED
        localesConDistancia = [
          ...destacadosCerca,
          ...noDestacadosCerca,
          ...noDestacadosLejos,
        ];

        console.log('[Home] ✅ FIXED sorting applied (featured >100km EXCLUDED):');
        console.log('  📍 Featured ≤100km:', destacadosCerca.length, destacadosCerca.map(l => `${l.nombre} (${l.distancia?.toFixed(1)}km)`));
        console.log('  📍 Non-featured ≤100km:', noDestacadosCerca.length);
        console.log('  📍 Non-featured >100km:', noDestacadosLejos.length);
        
        console.log('[Home] 🔝 First 10 locals in list:');
        localesConDistancia.slice(0, 10).forEach((l, i) => {
          console.log(`  ${i + 1}. ${l.nombre} - Destacado: ${l.destacado}, Distancia: ${l.distancia?.toFixed(1)}km`);
        });
      } else {
        console.log('[Home] ⚠️ No user location available, sorting by destacado and rating only');
        
        localesConDistancia.sort((a, b) => {
          if (a.destacado !== b.destacado) {
            return a.destacado ? -1 : 1;
          }
          const ratingA = parseFloat((a.rating || a.google_rating || 0).toString());
          const ratingB = parseFloat((b.rating || b.google_rating || 0).toString());
          return ratingB - ratingA;
        });
      }

      console.log('[Home] ✅ Locales cargados:', localesConDistancia.length);
      setLocales(localesConDistancia);
    } catch (error) {
      console.error('[Home] ❌ Error cargando locales:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, isImpersonating, filtros, userLocation, calcularDistancia]);

  useEffect(() => {
    obtenerUbicacion();
  }, [obtenerUbicacion]);

  useEffect(() => {
    if (userId) {
      cargarLocales();
    }
  }, [userId, cargarLocales]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    cargarLocales();
  }, [cargarLocales]);

  const handleFiltroPress = useCallback((filtroId: string) => {
    console.log('[Home] Filtro presionado:', filtroId);
    
    if (filtroId === 'todos') {
      setFiltros(prev => ({ ...prev, tipo: 'todos' }));
    } else if (filtroId === 'bar' || filtroId === 'restaurante' || filtroId === 'discoteca') {
      setFiltros(prev => ({ ...prev, tipo: filtroId }));
    } else if (filtroId === 'abierto') {
      setFiltros(prev => ({ ...prev, abierto: !prev.abierto }));
    } else if (filtroId === 'destacado') {
      setFiltros(prev => ({ ...prev, destacado: !prev.destacado }));
    }
  }, []);

  const handleMasFiltrosPress = useCallback(() => {
    console.log('[Home] Más filtros presionado');
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando locales...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>BarLive</Text>
          <Text style={styles.headerSubtitle}>
            {isImpersonating 
              ? `Viendo como ${impersonationSession?.impersonated_user_name}` 
              : 'Descubre los mejores locales'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.mapButton}
          onPress={() => router.push('/(tabs)/explorar/mapa' as any)}
        >
          <IconSymbol ios_icon_name="map.fill" android_material_icon_name="map" size={24} color={colors.headerText} />
        </TouchableOpacity>
      </LinearGradient>

      {isImpersonating && (
        <View style={styles.impersonationIndicator}>
          <IconSymbol ios_icon_name="person.crop.circle.badge.checkmark" android_material_icon_name="supervised_user_circle" size={18} color={colors.white} />
          <Text style={styles.impersonationIndicatorText}>
            Vista de usuario impersonado
          </Text>
        </View>
      )}

      <BarraFiltrosInteractiva 
        filtros={filtrosArray}
        onFiltroPress={handleFiltroPress}
        onMasFiltrosPress={handleMasFiltrosPress}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {locales.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol ios_icon_name="building.2" android_material_icon_name="store" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No se encontraron locales</Text>
            <Text style={styles.emptySubtext}>
              Intenta ajustar los filtros de búsqueda
            </Text>
          </View>
        ) : (
          <React.Fragment>
            {locales.map((local) => (
              <TarjetaLocal key={local.id} local={local} />
            ))}
          </React.Fragment>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.text,
    marginTop: 16,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 4,
  },
  mapButton: {
    padding: 8,
  },
  impersonationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  impersonationIndicatorText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
});
