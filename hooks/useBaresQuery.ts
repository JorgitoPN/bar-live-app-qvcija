
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase';
import { getEstadoLocal } from '@/utils/timeUtils';

// Haversine formula for distance calculation
const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

export const useBaresQuery = (userLocation: any, filtros: any) => {
  return useQuery({
    queryKey: ['bares', filtros, !!userLocation], // Query key includes filters and userLocation presence
    queryFn: async () => {
      console.log('[useBaresQuery] 📡 Fetching bares from Supabase...');
      
      let query = supabase.from('locales').select('*').eq('activo', true);

      // Apply filters dynamically
      if (filtros.tipo !== 'todos') query = query.eq('tipo', filtros.tipo);
      if (filtros.provincia !== 'todos') query = query.eq('provincia', filtros.provincia);
      if (filtros.destacado) query = query.eq('destacado', true);

      const { data, error } = await query;
      if (error) throw error;

      // Process data: calculate open status and distance
      let procesados = data.map(local => {
        const estado = getEstadoLocal(local); // Determines if local is open
        let distancia = 999999; // Default large distance if location is unavailable
        if (userLocation && local.latitud && local.longitud) {
          distancia = calcularDistancia(userLocation.latitude, userLocation.longitude, local.latitud, local.longitud);
        }
        return { ...local, estaAbierto: estado.estaAbierto, distancia };
      });

      // Sort processed data: open first, then featured, then by distance
      return procesados.sort((a, b) => {
        if (a.estaAbierto !== b.estaAbierto) return a.estaAbierto ? -1 : 1; // Open locals first
        if (a.destacado !== b.destacado) return a.destacado ? -1 : 1;     // Featured locals next
        return a.distancia - b.distancia;                                 // Then by distance
      });
    },
    staleTime: 1000 * 60 * 5, // Data is considered fresh for 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // Cache data for 24 hours
  });
};
