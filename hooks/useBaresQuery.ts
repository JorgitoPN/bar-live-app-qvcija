
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase';
import { getEstadoLocal } from '@/utils/timeUtils';
import { getOptimizedImageUrl } from '@/src/utils/imageUtils';

/**
 * ✅ HAVERSINE FORMULA - Distance calculation between two coordinates
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

/**
 * ✅ MASTER SORTING LOGIC - Three-tier sorting strategy
 * 1. OPEN + FEATURED locals first
 * 2. OPEN locals by proximity
 * 3. CLOSED locals at the end
 */
const sortLocales = (locales: any[]) => {
  return locales.sort((a, b) => {
    // 1️⃣ FIRST: Open vs Closed (open first)
    if (a.estaAbierto !== b.estaAbierto) {
      return a.estaAbierto ? -1 : 1;
    }
    
    // 2️⃣ SECOND: Among open locals, featured first
    if (a.estaAbierto && b.estaAbierto) {
      if (a.destacado !== b.destacado) {
        return a.destacado ? -1 : 1;
      }
    }
    
    // 3️⃣ THIRD: By proximity (distance)
    return a.distancia - b.distancia;
  });
};

/**
 * ✅ useBaresQuery v615.0 - SOLUCIÓN DEFINITIVA DE IMÁGENES
 * 
 * UNIFIED BUSINESS LOGIC:
 * - Fetches locales from Supabase with SPECIFIC FIELDS (reduced payload)
 * - ✅ FIXED v615: Limpieza destructiva de URLs + transformación correcta
 * - Applies filters (tipo, provincia, destacado)
 * - Calculates distance using Haversine formula
 * - Determines open/closed status
 * - Applies master sorting (open+featured → open+proximity → closed)
 * - ✅ v615: URLs optimizadas estilo Instagram (ligeras y rápidas)
 * 
 * OPTIMIZATIONS v615.0:
 * 1️⃣ REDUCED PAYLOAD: Select only necessary fields (not select('*'))
 * 2️⃣ IMAGE OPTIMIZATION: Transform imagen_url using getOptimizedImageUrl (destructive cleanup)
 * 3️⃣ MEMOIZATION: Lightweight distance and status calculations
 * 4️⃣ ✅ FIXED: Limpieza destructiva elimina /object/ completamente
 * 5️⃣ ✅ FIXED: Transformación correcta /storage/v1/public/ → /storage/v1/render/image/public/
 * 6️⃣ ✅ FIXED v615: Cache invalidation + expo-image disk cache para velocidad
 * 
 * CACHE STRATEGY v615:
 * - queryKey includes [filtros, !!userLocation, 'v615'] for FORCED cache invalidation
 * - staleTime: 5 minutes (data considered fresh)
 * - gcTime: 24 hours (cache retention)
 * - v615 version forces TanStack Query to ignore old cached URLs with errors
 * 
 * @param userLocation - User's current location { latitude, longitude }
 * @param filtros - Active filters { tipo, provincia, destacado, abierto, precioMedio }
 * @returns TanStack Query result with sorted and processed locales
 */
export const useBaresQuery = (
  userLocation: { latitude: number; longitude: number } | null,
  filtros: {
    tipo: string;
    provincia: string;
    destacado: boolean;
    abierto: boolean;
    precioMedio: string;
  }
) => {
  return useQuery({
    // ✅ CRITICAL v615: queryKey includes 'v615' to FORCE cache invalidation and ignore old malformed URLs
    queryKey: ['bares', filtros, !!userLocation, 'v615'],
    
    queryFn: async () => {
      console.log('[useBaresQuery v615.0] 📡 Fetching bares from Supabase...');
      console.log('[useBaresQuery v615.0] 🔍 Filters:', filtros);
      console.log('[useBaresQuery v615.0] 📍 User location:', userLocation ? 'Available' : 'Not available');
      
      // ✅ v612: FIXED - Removed 'imagenes' field (doesn't exist in DB)
      // Only fetch imagen_url which is the actual column name
      let query = supabase
        .from('locales')
        .select('id, nombre, direccion, imagen_url, latitud, longitud, destacado, horarios_completos, barlive_type, barlive_types, rating, google_rating')
        .eq('activo', true);

      // Apply filters dynamically
      if (filtros.tipo && filtros.tipo !== 'todos') {
        query = query.eq('tipo', filtros.tipo);
      }
      if (filtros.provincia && filtros.provincia !== 'todos') {
        query = query.eq('provincia', filtros.provincia);
      }
      if (filtros.destacado) {
        query = query.eq('destacado', true);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[useBaresQuery v615.0] ❌ Error fetching data:', error);
        throw error;
      }

      console.log('[useBaresQuery v615.0] ✅ Fetched', data?.length || 0, 'locales');

      // ✅ v613: PROCESS DATA - Calculate open status, distance, and OPTIMIZE IMAGES
      const procesados = data.map(local => {
        // Determine if local is open/closed
        const estado = getEstadoLocal(local);
        
        // Calculate distance using Haversine formula
        let distancia = Infinity; // Use Infinity for better sorting of locals without coordinates
        if (userLocation && local.latitud && local.longitud) {
          distancia = calcularDistancia(
            userLocation.latitude,
            userLocation.longitude,
            local.latitud,
            local.longitud
          );
        }
        
        // ✅ v615: OPTIMIZE IMAGE - Limpieza destructiva + transformación correcta
        const optimizedImageUrl = getOptimizedImageUrl(local.imagen_url, 400, 70);
        
        return {
          ...local,
          estaAbierto: estado.estaAbierto,
          estadoCompleto: estado,
          distancia,
          coordenadas: {
            lat: local.latitud,
            lng: local.longitud,
          },
          // ✅ Replace original URL with optimized version
          imagen_url: optimizedImageUrl,
        };
      });

      // ✅ APPLY MASTER SORTING LOGIC
      const sorted = sortLocales(procesados);
      
      console.log('[useBaresQuery v615.0] 🎯 Sorted', sorted.length, 'locales');
      console.log('[useBaresQuery v615.0] 📊 First 3 with images:', sorted.slice(0, 3).map(l => ({
        nombre: l.nombre,
        abierto: l.estaAbierto,
        destacado: l.destacado,
        distancia: l.distancia === Infinity ? 'N/A' : `${l.distancia.toFixed(1)}km`,
        imageUrl: l.imagen_url ? l.imagen_url.substring(0, 80) + '...' : 'NO IMAGE',
        hasCorrectPath: l.imagen_url ? l.imagen_url.includes('/storage/v1/render/image/public/') : false,
        hasInvalidPath: l.imagen_url ? l.imagen_url.includes('/object/render/') : false
      })));

      return sorted;
    },
    
    // ✅ CACHE CONFIGURATION
    staleTime: 1000 * 60 * 5, // Data is considered fresh for 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // Cache data for 24 hours
  });
};
