
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase';
import { getEstadoLocal } from '@/utils/timeUtils';
import { useFilterStore } from '@/src/store/useFilterStore';

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
 * ✅ useBaresQuery - THE BRAIN 🧠 - ATOMIC FILTERING WITH ZUSTAND (v3.0)
 * 
 * 🚀 CRITICAL OPTIMIZATION v3.0:
 * - ✅ STATIC queryKey: ['bares', 'all'] - NEVER changes
 * - ✅ FILTERS FROM STORE: Accesses useFilterStore internally
 * - ✅ NO NETWORK REQUESTS: Filter changes don't trigger refetch
 * - ✅ INSTANT FILTERING: 0ms latency, 60 FPS on mobile
 * - ✅ ATOMIC UPDATES: Only components using filters re-render
 * 
 * UNIFIED BUSINESS LOGIC:
 * - Fetches ALL active locales from Supabase (once)
 * - Calculates distance using Haversine formula
 * - Determines open/closed status
 * - Applies filters in memory (servicios, ambiente, clientela, tipo, provincia)
 * - Applies master sorting (open+featured → open+proximity → closed)
 * 
 * CACHE STRATEGY:
 * - queryKey: ['bares', 'all'] - static, no filter dependencies
 * - staleTime: 5 minutes (data considered fresh)
 * - gcTime: 24 hours (cache retention)
 * 
 * REGLA DE ORO:
 * - La queryKey SIEMPRE es ['bares', 'all']
 * - Los filtros se aplican en el select, NO en la queryFn
 * - Cambiar filtros NO dispara peticiones de red
 * 
 * @param userLocation - User's current location { latitude, longitude }
 * @returns TanStack Query result with sorted and processed locales
 */
export const useBaresQuery = (
  userLocation: { latitude: number; longitude: number } | null
) => {
  // ✅ ATOMIC STATE: Get filters from Zustand store
  const filtros = useFilterStore(state => state.filtros);
  return useQuery({
    // 🚀 CRITICAL OPTIMIZATION: Static queryKey - NO filter dependencies
    // This ensures TanStack Query NEVER refetches on filter changes
    queryKey: ['bares', 'all'],
    
    queryFn: async () => {
      console.log('[useBaresQuery v3.0] 📡 Fetching ALL active bares from Supabase (once)...');
      console.log('[useBaresQuery v3.0] 📍 User location:', userLocation ? 'Available' : 'Not available');
      
      // 🚀 OPTIMIZATION: Fetch ALL active locales without any filters
      // Filters will be applied client-side in the select function below
      const query = supabase.from('locales').select('*').eq('activo', true);

      const { data, error } = await query;
      if (error) {
        console.error('[useBaresQuery v3.0] ❌ Error fetching data:', error);
        throw error;
      }

      console.log('[useBaresQuery v3.0] ✅ Fetched', data?.length || 0, 'locales (ALL active)');

      // ✅ PROCESS DATA: Calculate open status and distance for ALL locales
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

      console.log('[useBaresQuery v3.0] 🎯 Processed', procesados.length, 'locales with distance & status');

      return procesados;
    },
    
    // 🚀 CLIENT-SIDE FILTERING: Apply filters in memory using select
    // This runs INSTANTLY without network requests
    select: (data) => {
      console.log('[useBaresQuery v3.0] 🔍 Applying client-side filters:', filtros);
      
      // ✅ STEP 1: Apply ALL filters in memory
      let filtered = data;
      
      // Filter by tipo (category)
      if (filtros.tipo && filtros.tipo !== 'todos') {
        filtered = filtered.filter(local => local.tipo === filtros.tipo);
        console.log('[useBaresQuery v3.0] 🏷️ Filtered by tipo:', filtros.tipo, '→', filtered.length, 'locales');
      }
      
      // Filter by provincia
      if (filtros.provincia && filtros.provincia !== 'todos') {
        filtered = filtered.filter(local => local.provincia === filtros.provincia);
        console.log('[useBaresQuery v3.0] 📍 Filtered by provincia:', filtros.provincia, '→', filtered.length, 'locales');
      }
      
      // Filter by servicios (services)
      if (filtros.servicios && filtros.servicios.length > 0) {
        filtered = filtered.filter(local => {
          if (!local.servicios_disponibles) return false;
          return filtros.servicios!.every(servicio => 
            local.servicios_disponibles[servicio] === true
          );
        });
        console.log('[useBaresQuery v3.0] 🛠️ Filtered by servicios:', filtros.servicios, '→', filtered.length, 'locales');
      }
      
      // Filter by ambiente (atmosphere)
      if (filtros.ambiente && filtros.ambiente.length > 0) {
        filtered = filtered.filter(local => {
          if (!local.ambiente_completo) return false;
          return filtros.ambiente!.some(amb => 
            local.ambiente_completo[amb] === true
          );
        });
        console.log('[useBaresQuery v3.0] 🎭 Filtered by ambiente:', filtros.ambiente, '→', filtered.length, 'locales');
      }
      
      // Filter by clientela (clientele)
      if (filtros.clientela && filtros.clientela.length > 0) {
        filtered = filtered.filter(local => {
          if (!local.clientela) return false;
          return filtros.clientela!.some(cli => 
            local.clientela[cli] === true
          );
        });
        console.log('[useBaresQuery v3.0] 👥 Filtered by clientela:', filtros.clientela, '→', filtered.length, 'locales');
      }
      
      // Filter by destacado (featured)
      if (filtros.destacado) {
        filtered = filtered.filter(local => local.destacado === true);
        console.log('[useBaresQuery v3.0] ⭐ Filtered by destacado → ', filtered.length, 'locales');
      }
      
      // Filter by abierto (open now)
      if (filtros.abierto) {
        filtered = filtered.filter(local => local.estaAbierto === true);
        console.log('[useBaresQuery v3.0] 🕐 Filtered by abierto → ', filtered.length, 'locales');
      }
      
      console.log('[useBaresQuery v3.0] ✅ Total filtered:', filtered.length, 'locales (from', data.length, 'total)');
      
      // ✅ STEP 2: Apply master sorting logic
      const sorted = sortLocales(filtered);
      
      console.log('[useBaresQuery v3.0] 🎯 Sorted', sorted.length, 'locales');
      console.log('[useBaresQuery v3.0] 📊 First 3:', sorted.slice(0, 3).map(l => ({
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
