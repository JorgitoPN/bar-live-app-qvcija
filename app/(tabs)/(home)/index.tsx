
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Animated,
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
import { getEstadoLocal } from '@/utils/timeUtils';
import { scaleFontSize } from '@/utils/androidScaling';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MAX_FEATURED_DISTANCE_KM = 100;

const HEADER_MAX_HEIGHT = Platform.OS === 'android' ? 200 : 220;
const HEADER_MIN_HEIGHT = Platform.OS === 'android' ? 0 : 0;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

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
  horarios_completos?: Record<string, string[]>;
  google_business_status?: string;
  estado_actual?: string;
}

interface Filtro {
  id: string;
  label: string;
  icon?: string;
  activo?: boolean;
}

/**
 * ✅ HOME SCREEN v101.0 - ANDROID SCALING + BANNER WHITE BACKGROUND FIX
 * 
 * CRITICAL FIXES v101.0 (ANDROID ONLY):
 * - ✅ All text uses scaleFontSize() for consistency
 * - ✅ Banner white background removed on Android
 * - ✅ Header properly scaled
 * - ✅ iOS design remains unchanged
 */

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

  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('down');

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -HEADER_SCROLL_DISTANCE],
    extrapolate: 'clamp',
  });

  const filtrosArray: Filtro[] = React.useMemo(() => [
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
        console.log('[Home v101.0] Permiso de ubicación denegado');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      console.log('[Home v101.0] ✅ Ubicación obtenida:', {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error) {
      console.error('[Home v101.0] Error obteniendo ubicación:', error);
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
      console.log(`[Home v101.0] 🔄 Cargando locales para usuario ${userId} (${isImpersonating ? 'IMPERSONATING' : 'NORMAL'})`);
      
      let query = supabase
        .from('locales')
        .select('*')
        .eq('activo', true)
        .limit(200);

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

      localesConDistancia = localesConDistancia.map(local => {
        const estadoLocal = getEstadoLocal(local);
        return {
          ...local,
          estaAbierto: estadoLocal.estaAbierto,
        };
      });

      if (userLocation) {
        console.log('[Home v101.0] 📍 User location:', userLocation);
        
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
          return { ...local, distancia: 999999 };
        });

        const localesAbiertos = localesConDistancia.filter(l => l.estaAbierto === true);
        const localesCerrados = localesConDistancia.filter(l => l.estaAbierto !== true);

        const groupA = localesAbiertos.filter(l => 
          l.distancia !== undefined && l.distancia <= MAX_FEATURED_DISTANCE_KM
        );
        
        const groupB = localesAbiertos.filter(l => 
          l.distancia !== undefined && l.distancia > MAX_FEATURED_DISTANCE_KM
        );

        const groupA_destacados = groupA
          .filter(l => l.destacado === true)
          .sort((a, b) => (a.distancia || 999999) - (b.distancia || 999999));

        const groupA_no_destacados = groupA
          .filter(l => l.destacado === false)
          .sort((a, b) => (a.distancia || 999999) - (b.distancia || 999999));

        const groupB_no_destacados = groupB
          .filter(l => l.destacado === false)
          .sort((a, b) => (a.distancia || 999999) - (b.distancia || 999999));

        const groupB_destacados = groupB
          .filter(l => l.destacado === true)
          .sort((a, b) => (a.distancia || 999999) - (b.distancia || 999999));

        const localesCerradosOrdenados = localesCerrados.sort((a, b) => 
          (a.distancia || 999999) - (b.distancia || 999999)
        );

        localesConDistancia = [
          ...groupA_destacados,
          ...groupA_no_destacados,
          ...groupB_no_destacados,
          ...groupB_destacados,
          ...localesCerradosOrdenados,
        ];
      } else {
        const localesAbiertos = localesConDistancia.filter(l => l.estaAbierto === true);
        const localesCerrados = localesConDistancia.filter(l => l.estaAbierto !== true);

        localesAbiertos.sort((a, b) => {
          if (a.destacado !== b.destacado) {
            return a.destacado ? -1 : 1;
          }
          const ratingA = parseFloat((a.rating || a.google_rating || 0).toString());
          const ratingB = parseFloat((b.rating || b.google_rating || 0).toString());
          return ratingB - ratingA;
        });

        localesCerrados.sort((a, b) => {
          if (a.destacado !== b.destacado) {
            return a.destacado ? -1 : 1;
          }
          const ratingA = parseFloat((a.rating || a.google_rating || 0).toString());
          const ratingB = parseFloat((b.rating || b.google_rating || 0).toString());
          return ratingB - ratingA;
        });

        localesConDistancia = [...localesAbiertos, ...localesCerrados];
      }

      console.log('[Home v101.0] ✅ Locales cargados:', localesConDistancia.length);
      setLocales(localesConDistancia);
    } catch (error) {
      console.error('[Home v101.0] ❌ Error cargando locales:', error);
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
    console.log('[Home v101.0] Filtro presionado:', filtroId);
    
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
    console.log('[Home v101.0] Más filtros presionado');
  }, []);

  const handleClaimOrCreateLocal = useCallback(() => {
    router.push('/auth/local-ownership-request' as any);
  }, [router]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (event: any) => {
        if (Platform.OS !== 'android') return;
        
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const diff = currentScrollY - lastScrollY.current;
        
        if (diff > 5) {
          scrollDirection.current = 'down';
        } else if (diff < -5) {
          scrollDirection.current = 'up';
        }
        
        lastScrollY.current = currentScrollY;
      },
    }
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { fontSize: scaleFontSize(16) }]}>Cargando locales...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Platform.OS === 'android' ? (
        <Animated.View
          style={[
            styles.headerContainer,
            {
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <Text style={[styles.headerTitle, { fontSize: scaleFontSize(32) }]}>BarLive</Text>
              <Text style={[styles.headerSubtitle, { fontSize: scaleFontSize(15) }]}>
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
              <Text style={[styles.impersonationIndicatorText, { fontSize: scaleFontSize(13) }]}>
                Vista de usuario impersonado
              </Text>
            </View>
          )}

          <BarraFiltrosInteractiva 
            filtros={filtrosArray}
            onFiltroPress={handleFiltroPress}
            onMasFiltrosPress={handleMasFiltrosPress}
          />

          {/* ✅ CRITICAL FIX v101.0: Banner with NO white background on Android */}
          <TouchableOpacity 
            style={styles.claimLocalBanner}
            onPress={handleClaimOrCreateLocal}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[colors.primary + '20', colors.primary + '10']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.claimLocalGradient}
            >
              <View style={styles.claimLocalContent}>
                <IconSymbol 
                  ios_icon_name="building.2" 
                  android_material_icon_name="business" 
                  size={16} 
                  color={colors.primary} 
                />
                {/* ✅ CRITICAL FIX v101.0: NO backgroundColor - text displays directly on gradient */}
                <Text 
                  style={[
                    styles.claimLocalText, 
                    { fontSize: scaleFontSize(13) }
                  ]} 
                  numberOfLines={1}
                >
                  Reclama tu local o crea uno nuevo
                </Text>
                <IconSymbol 
                  ios_icon_name="chevron.right" 
                  android_material_icon_name="chevron_right" 
                  size={14} 
                  color={colors.textSecondary} 
                />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <React.Fragment>
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

          <TouchableOpacity 
            style={styles.claimLocalBanner}
            onPress={handleClaimOrCreateLocal}
            activeOpacity={0.8}
          >
            <View style={styles.claimLocalContent}>
              <IconSymbol 
                ios_icon_name="building.2" 
                android_material_icon_name="business" 
                size={16} 
                color={colors.primary} 
              />
              <Text style={styles.claimLocalText} numberOfLines={1}>
                Reclama tu local o crea uno nuevo
              </Text>
              <IconSymbol 
                ios_icon_name="chevron.right" 
                android_material_icon_name="chevron_right" 
                size={14} 
                color={colors.textSecondary} 
              />
            </View>
          </TouchableOpacity>
        </React.Fragment>
      )}

      <Animated.ScrollView
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
        onScroll={Platform.OS === 'android' ? handleScroll : undefined}
        scrollEventThrottle={16}
      >
        {locales.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol ios_icon_name="building.2" android_material_icon_name="store" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { fontSize: scaleFontSize(20) }]}>No se encontraron locales</Text>
            <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(15) }]}>
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
      </Animated.ScrollView>
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
    color: colors.text,
    marginTop: 16,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: colors.background,
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
    fontWeight: '600',
    color: colors.white,
  },
  claimLocalBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  claimLocalGradient: {
    borderWidth: 1.5,
    borderColor: colors.primary + '30',
    borderRadius: 12,
  },
  claimLocalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  claimLocalText: {
    flex: 1,
    fontWeight: '600',
    color: colors.text,
    // ✅ CRITICAL FIX v101.0: NO backgroundColor - text displays directly on gradient
  },
  content: {
    flex: 1,
    marginTop: Platform.OS === 'android' ? HEADER_MAX_HEIGHT : 0,
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
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
});
