
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
 * ✅ useBaresQuery v614.0 - MANDATORY CLEANUP PHASE + CACHE INVALIDATION
 * 
 * UNIFIED BUSINESS LOGIC:
 * - Fetches locales from Supabase with SPECIFIC FIELDS (reduced payload)
 * - ✅ FIXED v609: Removed 'imagenes' array field (column doesn't exist in DB)
 * - ✅ FIXED v610: Enhanced logging to debug image URL optimization
 * - ✅ FIXED v611: Prevent duplicate 'render/image' path in URLs
 * - ✅ FIXED v612: Correct path replacement to avoid /object/render/image/ malformation
 * - ✅ FIXED v613: DESTRUCTIVE pre-cleaning of URLs before optimization to eliminate /object/render/image/ errors
 * - ✅ FIXED v614: MANDATORY cleanup phase in getOptimizedImageUrl + cache invalidation via queryKey v614
 * - Applies filters (tipo, provincia, destacado)
 * - Calculates distance using Haversine formula
 * - Determines open/closed status
 * - Applies master sorting (open+featured → open+proximity → closed)
 * - ✅ v614: Automatic cleanup in getOptimizedImageUrl + verification logging
 * 
 * OPTIMIZATIONS v614.0:
 * 1️⃣ REDUCED PAYLOAD: Select only necessary fields (not select('*'))
 * 2️⃣ IMAGE OPTIMIZATION: Transform imagen_url using getOptimizedImageUrl (mandatory cleanup)
 * 3️⃣ MEMOIZATION: Lightweight distance and status calculations
 * 4️⃣ ✅ FIXED: Only use imagen_url field (the actual column that exists)
 * 5️⃣ ✅ FIXED: Correct URL path transformation without duplication
 * 6️⃣ ✅ FIXED v614: Mandatory cleanup phase + cache invalidation to force UI refresh
 * 
 * CACHE STRATEGY v614:
 * - queryKey includes [filtros, !!userLocation, 'v614'] for FORCED cache invalidation
 * - staleTime: 5 minutes (data considered fresh)
 * - gcTime: 24 hours (cache retention)
 * - v614 version forces TanStack Query to ignore old cached URLs with errors
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
    // ✅ CRITICAL v614: queryKey includes 'v614' to FORCE cache invalidation and ignore old malformed URLs
    queryKey: ['bares', filtros, !!userLocation, 'v614'],
    
    queryFn: async () => {
      console.log('[useBaresQuery v614.0] 📡 Fetching bares from Supabase...');
      console.log('[useBaresQuery v614.0] 🔍 Filters:', filtros);
      console.log('[useBaresQuery v614.0] 📍 User location:', userLocation ? 'Available' : 'Not available');
      
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
        console.error('[useBaresQuery v614.0] ❌ Error fetching data:', error);
        throw error;
      }

      console.log('[useBaresQuery v614.0] ✅ Fetched', data?.length || 0, 'locales');

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
        
        // ✅ v614: VERIFICACIÓN DE LIMPIEZA - Detectar URLs con errores antes de optimizar
        const originalImageUrl = local.imagen_url;
        let hadObjectRenderError = false;
        
        // Verificar si la URL contiene el error /object/render/ antes de la limpieza
        if (originalImageUrl && typeof originalImageUrl === 'string' && originalImageUrl.includes('/object/render/')) {
          hadObjectRenderError = true;
          console.log(`[useBaresQuery v614] ⚠️ URL con error detectada para ${local.nombre}:`, originalImageUrl.substring(0, 80));
        }
        
        // ✅ v614: OPTIMIZE IMAGE - La función getOptimizedImageUrl ahora incluye limpieza automática
        const optimizedImageUrl = getOptimizedImageUrl(originalImageUrl, 400, 70);
        
        // Log específico si se limpió una URL con error
        if (hadObjectRenderError && optimizedImageUrl) {
          console.log(`[useBaresQuery v614] ✅ URL limpiada exitosamente:`, {
            local: local.nombre,
            antes: originalImageUrl.substring(0, 80) + '...',
            despues: optimizedImageUrl.substring(0, 80) + '...',
            errorEliminado: !optimizedImageUrl.includes('/object/render/')
          });
        }
        
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
      
      console.log('[useBaresQuery v614.0] 🎯 Sorted', sorted.length, 'locales');
      console.log('[useBaresQuery v614.0] 📊 First 3 with images:', sorted.slice(0, 3).map(l => ({
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
