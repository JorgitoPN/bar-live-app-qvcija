
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import TarjetaLocal from '@/components/home/TarjetaLocal';
import BarraFiltrosInteractiva from '@/components/home/BarraFiltrosInteractiva';
import { SkeletonLocalCard } from '@/components/common/SkeletonLoader';
import * as Location from 'expo-location';
import { scaleFontSize } from '@/utils/androidScaling';
import { useBaresQuery } from '@/hooks/useBaresQuery';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  estaAbierto?: boolean;
}

interface Filtro {
  id: string;
  label: string;
  icon?: string;
  activo?: boolean;
}

/**
 * ✅ HOME SCREEN v105.0 - TANSTACK QUERY REFACTOR
 * 
 * CRITICAL OPTIMIZATIONS v105.0:
 * - ✅ Unified business logic in useBaresQuery hook
 * - ✅ Removed manual fetch logic (cargarLocales, useEffects)
 * - ✅ Removed loading states (handled by TanStack Query)
 * - ✅ Maintained Animated.event for Header
 * - ✅ Maintained obtenerUbicacion function
 * - ✅ FlashList uses locales from useBaresQuery
 * - ✅ refetch integrated with pull-to-refresh
 * 
 * WHY THIS IS BETTER:
 * 1. SINGLE SOURCE OF TRUTH: All data fetching logic in one hook
 * 2. AUTOMATIC CACHING: TanStack Query handles caching automatically
 * 3. BACKGROUND REFETCHING: Data updates in background without blocking UI
 * 4. DEDUPLICATION: Multiple components can use same query without duplicate requests
 * 5. CLEANER CODE: No manual loading states, error handling, or useEffect chains
 * 
 * Previous optimizations maintained (v104.0):
 * - ✅ FlashList for 60 FPS scrolling
 * - ✅ estimatedItemSize={250} for optimal cell recycling
 * - ✅ Skeleton screens on first load
 * - ✅ TarjetaLocal wrapped in React.memo
 * - ✅ expo-image with cachePolicy="memory-disk"
 */

export default function HomeScreen() {
  const router = useRouter();
  const { userId, user, isImpersonating } = useEffectiveUser();
  const { impersonationSession } = useImpersonation();
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

  // ✅ USE TANSTACK QUERY HOOK - All business logic unified here
  const { data: locales, isLoading, refetch } = useBaresQuery(userLocation, filtros);

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

  // ✅ MAINTAINED: obtenerUbicacion function
  const obtenerUbicacion = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[Home v105.0] Permiso de ubicación denegado');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      console.log('[Home v105.0] ✅ Ubicación obtenida:', {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error) {
      console.error('[Home v105.0] Error obteniendo ubicación:', error);
    }
  }, []);

  useEffect(() => {
    obtenerUbicacion();
  }, [obtenerUbicacion]);

  const handleFiltroPress = useCallback((filtroId: string) => {
    console.log('[Home v105.0] Filtro presionado:', filtroId);
    
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
    console.log('[Home v105.0] Más filtros presionado');
  }, []);

  const renderItem = useCallback(({ item }: { item: Local }) => (
    <TarjetaLocal key={item.id} local={item} />
  ), []);

  const keyExtractor = useCallback((item: Local) => item.id, []);

  const renderListEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.skeletonContainer}>
          <SkeletonLocalCard />
          <SkeletonLocalCard />
          <SkeletonLocalCard />
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <IconSymbol ios_icon_name="building.2" android_material_icon_name="store" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { fontSize: scaleFontSize(20) }]}>No se encontraron locales</Text>
        <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(15) }]}>
          Intenta ajustar los filtros de búsqueda
        </Text>
      </View>
    );
  }, [isLoading]);

  const handleClaimOrCreateLocal = useCallback(() => {
    router.push('/auth/local-ownership-request' as any);
  }, [router]);

  // ✅ MAINTAINED: Animated.event for Header
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

      <View style={styles.flashListContainer}>
        {/* ✅ FLASHLIST USES locales FROM useBaresQuery AND refetch FOR PULL-TO-REFRESH */}
        <FlashList
          data={locales || []}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          estimatedItemSize={250}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={renderListEmpty}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.flashListContent}
          onScroll={Platform.OS === 'android' ? handleScroll : undefined}
          scrollEventThrottle={16}
        />
      </View>
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
  },
  content: {
    flex: 1,
    marginTop: Platform.OS === 'android' ? HEADER_MAX_HEIGHT : 0,
  },
  flashListContainer: {
    flex: 1,
    marginTop: Platform.OS === 'android' ? HEADER_MAX_HEIGHT : 0,
  },
  flashListContent: {
    padding: 16,
    paddingBottom: 100,
  },
  skeletonContainer: {
    padding: 16,
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
