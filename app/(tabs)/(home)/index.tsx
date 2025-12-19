
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

      // ✅ CRITICAL FIX v9 - IMPLEMENT EXACT MANDATORY ALGORITHM
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
          return { ...local, distancia: 999999 }; // Very high distance for locals without coordinates
        });

        console.log('[Home] 🧠 Applying MANDATORY sorting algorithm (NON-INTERPRETABLE)...');

        // 🧠 MANDATORY ALGORITHM (NON-INTERPRETABLE)
        // groupA = locales with distance <= 100km
        const groupA = localesConDistancia.filter(l => 
          l.distancia !== undefined && l.distancia <= MAX_FEATURED_DISTANCE_KM
        );
        
        // groupB = locales with distance > 100km
        const groupB = localesConDistancia.filter(l => 
          l.distancia !== undefined && l.distancia > MAX_FEATURED_DISTANCE_KM
        );

        console.log('[Home] 📊 Groups created:');
        console.log('  - Group A (≤100km):', groupA.length, 'locals');
        console.log('  - Group B (>100km):', groupB.length, 'locals');

        // groupA_destacados = groupA where destacado == true sorted by distance
        const groupA_destacados = groupA
          .filter(l => l.destacado === true)
          .sort((a, b) => (a.distancia || 999999) - (b.distancia || 999999));

        // groupA_no_destacados = groupA where destacado == false sorted by distance
        const groupA_no_destacados = groupA
          .filter(l => l.destacado === false)
          .sort((a, b) => (a.distancia || 999999) - (b.distancia || 999999));

        // groupB_no_destacados = groupB where destacado == false sorted by distance
        const groupB_no_destacados = groupB
          .filter(l => l.destacado === false)
          .sort((a, b) => (a.distancia || 999999) - (b.distancia || 999999));

        // groupB_destacados = groupB where destacado == true sorted by distance
        const groupB_destacados = groupB
          .filter(l => l.destacado === true)
          .sort((a, b) => (a.distancia || 999999) - (b.distancia || 999999));

        console.log('[Home] 📊 Sub-groups created:');
        console.log('  1. Group A Featured (≤100km, destacado=true):', groupA_destacados.length);
        console.log('  2. Group A Non-Featured (≤100km, destacado=false):', groupA_no_destacados.length);
        console.log('  3. Group B Non-Featured (>100km, destacado=false):', groupB_no_destacados.length);
        console.log('  4. Group B Featured (>100km, destacado=true):', groupB_destacados.length);

        // resultado_final = groupA_destacados + groupA_no_destacados + groupB_no_destacados + groupB_destacados
        localesConDistancia = [
          ...groupA_destacados,
          ...groupA_no_destacados,
          ...groupB_no_destacados,
          ...groupB_destacados,
        ];

        console.log('[Home] ✅ FINAL SORTING APPLIED - Total locals:', localesConDistancia.length);
        console.log('[Home] 🔝 First 20 locals in final list:');
        localesConDistancia.slice(0, 20).forEach((l, i) => {
          const group = l.distancia! <= MAX_FEATURED_DISTANCE_KM ? 'A' : 'B';
          const featured = l.destacado ? '⭐ DESTACADO' : '   NORMAL   ';
          console.log(`  ${String(i + 1).padStart(2, '0')}. [Group ${group}] ${featured} | ${l.nombre}`);
          console.log(`      📍 Distancia: ${l.distancia?.toFixed(1)}km | 📌 Dirección: ${l.direccion}`);
        });

        // 📌 CRITICAL VERIFICATION: Find Casa Paco position
        const casaPacoIndex = localesConDistancia.findIndex(l => 
          l.nombre.toLowerCase().includes('casa paco') || 
          l.direccion?.toLowerCase().includes('rincón de san nicolás')
        );
        
        if (casaPacoIndex !== -1) {
          const casaPaco = localesConDistancia[casaPacoIndex];
          const expectedGroup = casaPaco.distancia! > MAX_FEATURED_DISTANCE_KM ? 'B' : 'A';
          const expectedSubgroup = casaPaco.destacado ? 'Featured' : 'Non-Featured';
          
          console.log('[Home] 📌 ========================================');
          console.log('[Home] 📌 CASA PACO VERIFICATION:');
          console.log('[Home] 📌 ========================================');
          console.log(`[Home] 📌 Position in list: #${casaPacoIndex + 1} of ${localesConDistancia.length}`);
          console.log(`[Home] 📌 Name: ${casaPaco.nombre}`);
          console.log(`[Home] 📌 Address: ${casaPaco.direccion}`);
          console.log(`[Home] 📌 Featured: ${casaPaco.destacado}`);
          console.log(`[Home] 📌 Distance: ${casaPaco.distancia?.toFixed(1)}km`);
          console.log(`[Home] 📌 Expected Group: ${expectedGroup} (${expectedSubgroup})`);
          console.log(`[Home] 📌 Expected Position: LAST BLOCK (Group B Featured)`);
          
          // Count how many locals should be before Casa Paco
          const expectedPosition = groupA_destacados.length + groupA_no_destacados.length + groupB_no_destacados.length;
          
          console.log(`[Home] 📌 Expected minimum position: #${expectedPosition + 1}`);
          console.log(`[Home] 📌 Actual position: #${casaPacoIndex + 1}`);
          
          if (casaPacoIndex < expectedPosition) {
            console.error('[Home] ❌❌❌ CRITICAL ERROR: Casa Paco is NOT in the correct position!');
            console.error(`[Home] ❌ It should be at position #${expectedPosition + 1} or later, but it's at #${casaPacoIndex + 1}`);
          } else {
            console.log('[Home] ✅✅✅ Casa Paco is CORRECTLY positioned in the last block (Group B Featured)');
          }
          console.log('[Home] 📌 ========================================');
        } else {
          console.log('[Home] ℹ️ Casa Paco not found in current results');
        }
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

  const handleClaimOrCreateLocal = useCallback(() => {
    router.push('/auth/local-ownership-request' as any);
  }, [router]);

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

      {/* NEW: Claim or Create Local Section */}
      <TouchableOpacity 
        style={styles.claimLocalBanner}
        onPress={handleClaimOrCreateLocal}
        activeOpacity={0.8}
      >
        <View style={styles.claimLocalContent}>
          <View style={styles.claimLocalIconContainer}>
            <IconSymbol 
              ios_icon_name="building.2.fill" 
              android_material_icon_name="business" 
              size={24} 
              color={colors.primary} 
            />
          </View>
          <View style={styles.claimLocalTextContainer}>
            <Text style={styles.claimLocalTitle}>Reclama tu local o crea uno nuevo</Text>
            <Text style={styles.claimLocalSubtitle}>
              ¿Eres propietario? Gestiona tu local en BarLive
            </Text>
          </View>
          <IconSymbol 
            ios_icon_name="chevron.right" 
            android_material_icon_name="chevron_right" 
            size={20} 
            color={colors.textSecondary} 
          />
        </View>
      </TouchableOpacity>

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
  claimLocalBanner: {
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  claimLocalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  claimLocalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimLocalTextContainer: {
    flex: 1,
  },
  claimLocalTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  claimLocalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
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
