
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase';
import { getEstadoLocal } from '@/utils/timeUtils';

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
 * ✅ useBaresQuery - THE BRAIN 🧠
 * 
 * UNIFIED BUSINESS LOGIC:
 * - Fetches locales from Supabase
 * - Applies filters (tipo, provincia, destacado)
 * - Calculates distance using Haversine formula
 * - Determines open/closed status
 * - Applies master sorting (open+featured → open+proximity → closed)
 * 
 * CACHE STRATEGY:
 * - queryKey includes [filtros, !!userLocation] for proper cache invalidation
 * - staleTime: 5 minutes (data considered fresh)
 * - gcTime: 24 hours (cache retention)
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
    // ✅ CRITICAL: queryKey includes filters and userLocation presence for cache invalidation
    queryKey: ['bares', filtros, !!userLocation],
    
    queryFn: async () => {
      console.log('[useBaresQuery] 📡 Fetching bares from Supabase...');
      console.log('[useBaresQuery] 🔍 Filters:', filtros);
      console.log('[useBaresQuery] 📍 User location:', userLocation ? 'Available' : 'Not available');
      
      // ✅ Build query with filters
      let query = supabase.from('locales').select('*').eq('activo', true);

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
        console.error('[useBaresQuery] ❌ Error fetching data:', error);
        throw error;
      }

      console.log('[useBaresQuery] ✅ Fetched', data?.length || 0, 'locales');

      // ✅ PROCESS DATA: Calculate open status and distance
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
        
        return {
          ...local,
          estaAbierto: estado.estaAbierto,
          distancia,
        };
      });

      // ✅ APPLY MASTER SORTING LOGIC
      const sorted = sortLocales(procesados);
      
      console.log('[useBaresQuery] 🎯 Sorted', sorted.length, 'locales');
      console.log('[useBaresQuery] 📊 First 3:', sorted.slice(0, 3).map(l => ({
        nombre: l.nombre,
        abierto: l.estaAbierto,
        destacado: l.destacado,
        distancia: l.distancia === Infinity ? 'N/A' : `${l.distancia.toFixed(1)}km`
      })));

      return sorted;
    },
    
    // ✅ CACHE CONFIGURATION
    staleTime: 1000 * 60 * 5, // Data is considered fresh for 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // Cache data for 24 hours
  });
};
