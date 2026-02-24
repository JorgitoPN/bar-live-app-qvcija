
/**
 * ✅ EJEMPLO DE USO DE TANSTACK QUERY - useBaresQuery Hook
 * 
 * Este hook demuestra cómo usar TanStack Query para obtener datos de Supabase
 * con caché persistente (MMKV en native, AsyncStorage en web).
 * 
 * BENEFICIOS:
 * - 🚀 Datos instantáneos desde caché (0ms de espera)
 * - 🔄 Actualización automática en segundo plano
 * - 💾 Persistencia entre sesiones (MMKV)
 * - 🎯 Deduplicación de peticiones
 * - 📡 Pull-to-refresh integrado
 * 
 * CÓMO USAR EN TU COMPONENTE:
 * 
 * import { useBaresQuery } from '@/hooks/useBaresQuery';
 * 
 * function MyComponent() {
 *   const { data: bares, isLoading, error, refetch } = useBaresQuery();
 * 
 *   if (isLoading) return <ActivityIndicator />;
 *   if (error) return <Text>Error: {error.message}</Text>;
 * 
 *   return (
 *     <ScrollView refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
 *       {bares?.map(bar => <BarCard key={bar.id} bar={bar} />)}
 *     </ScrollView>
 *   );
 * }
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase';

/**
 * Hook para obtener la lista de bares/locales desde Supabase
 * con caché persistente y actualización automática.
 * 
 * @returns {Object} - Objeto con data, isLoading, error, refetch, etc.
 */
export const useBaresQuery = () => {
  return useQuery({
    // queryKey: Identificador único de la query (usado para caché)
    queryKey: ['bares'],
    
    // queryFn: Función que obtiene los datos
    queryFn: async () => {
      console.log('[useBaresQuery] 📡 Fetching bares from Supabase...');
      
      const { data, error } = await supabase
        .from('locales')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[useBaresQuery] ❌ Error fetching bares:', error);
        throw error;
      }
      
      console.log('[useBaresQuery] ✅ Fetched', data?.length || 0, 'bares');
      return data;
    },
    
    // staleTime: Tiempo que los datos se consideran "frescos" (5 minutos)
    // Durante este tiempo, NO se hace petición a la red
    staleTime: 1000 * 60 * 5, // 5 minutos
    
    // gcTime: Tiempo que los datos permanecen en caché (24 horas)
    // Después de este tiempo, se eliminan de la caché
    gcTime: 1000 * 60 * 60 * 24, // 24 horas
    
    // retry: Número de reintentos si falla la petición
    retry: 2,
    
    // refetchOnWindowFocus: No refrescar cuando la app vuelve al foreground
    // (usamos pull-to-refresh manual)
    refetchOnWindowFocus: false,
    
    // refetchOnReconnect: Refrescar cuando se restaura la conexión a internet
    refetchOnReconnect: true,
  });
};

/**
 * Hook para obtener un bar específico por ID
 * 
 * @param {string} barId - ID del bar a obtener
 * @returns {Object} - Objeto con data, isLoading, error, refetch, etc.
 */
export const useBarQuery = (barId: string) => {
  return useQuery({
    queryKey: ['bar', barId],
    queryFn: async () => {
      console.log('[useBarQuery] 📡 Fetching bar:', barId);
      
      const { data, error } = await supabase
        .from('locales')
        .select('*')
        .eq('id', barId)
        .single();
      
      if (error) {
        console.error('[useBarQuery] ❌ Error fetching bar:', error);
        throw error;
      }
      
      console.log('[useBarQuery] ✅ Fetched bar:', data?.nombre);
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 60 * 24, // 24 horas
    enabled: !!barId, // Solo ejecutar si barId existe
  });
};

/**
 * Hook para obtener bares filtrados por provincia
 * 
 * @param {string} provincia - Provincia para filtrar
 * @returns {Object} - Objeto con data, isLoading, error, refetch, etc.
 */
export const useBaresQueryByProvincia = (provincia?: string) => {
  return useQuery({
    queryKey: ['bares', 'provincia', provincia],
    queryFn: async () => {
      console.log('[useBaresQueryByProvincia] 📡 Fetching bares for provincia:', provincia);
      
      let query = supabase.from('locales').select('*');
      
      if (provincia) {
        query = query.eq('provincia', provincia);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('[useBaresQueryByProvincia] ❌ Error:', error);
        throw error;
      }
      
      console.log('[useBaresQueryByProvincia] ✅ Fetched', data?.length || 0, 'bares');
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 60 * 24, // 24 horas
  });
};
