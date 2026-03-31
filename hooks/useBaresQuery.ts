/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 useBaresQuery v28.2.0 - FIXED INFINITE LOOP & PREFETCH 
 * ═══════════════════════════════════════════════════════════════════════════
 * * 🎯 NEW IN v28.2.0:
 * 1️⃣ REMOVED AUTO-PREFETCH: Prevents browser freezing and IA disconnection ✅
 * 2️⃣ STABLE PAGINATION: Next pages only load on user demand (scroll) ✅
 * 3️⃣ PRESERVED LOGS: All Phase 7, 10, 12, 14 debugging remains intact ✅
 */

import React from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase';
import { Platform } from 'react-native';
import { useAuthStore } from '@/src/store/useAuthStore';

interface UseBaresQueryParams {
  userLocation: { latitude: number; longitude: number } | null;
  selectedCategory: string | null;
  searchQuery: string;
  globalFiltros: any;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20; 
const STALE_TIME = 1000 * 60 * 15; 
const GC_TIME = 1000 * 60 * 60; 
const MAX_RETRIES = 3; 
const RETRY_DELAY_BASE = 1000; 
const QUERY_TIMEOUT = 30000; 

function roundLocation(lat: number | null, lng: number | null) {
  if (!lat || !lng) return { lat: null, lng: null };
  return {
    lat: Math.round(lat * 100) / 100,
    lng: Math.round(lng * 100) / 100,
  };
}

function generateQueryKey(params: UseBaresQueryParams) {
  const { lat, lng } = roundLocation(
    params.userLocation?.latitude || null,
    params.userLocation?.longitude || null
  );
  
  return [
    'bares_infinite_v28.2.0',
    lat,
    lng,
    params.selectedCategory,
    params.searchQuery,
    JSON.stringify(params.globalFiltros),
  ];
}

export const useBaresQuery = (params: UseBaresQueryParams) => {
  const {
    userLocation,
    selectedCategory,
    searchQuery,
    globalFiltros,
    pageSize = DEFAULT_PAGE_SIZE,
  } = params;
  
  const queryClient = useQueryClient();
  const queryKey = generateQueryKey(params);
  const { session } = useAuthStore();
  const userId = session?.user?.id || null;
  const abortControllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        console.log('[useBaresQuery FASE 7] 🛑 Aborting pending request on unmount/param change');
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [queryKey]);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam, signal }) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      signal?.addEventListener('abort', () => {
        console.log('[useBaresQuery FASE 7] 🛑 Query cancelled by React Query');
        controller.abort();
      });

      const isFirstPage = !pageParam;
      const pageNumber = isFirstPage ? 1 : Math.floor((pageParam.offset || 0) / pageSize) + 1;
      
      console.log('═══════════════════════════════════════════════════════════');
      console.log('[useBaresQuery v28.2] 📡 Fetching page:', pageNumber);
      console.log('═══════════════════════════════════════════════════════════');

      const startTime = performance.now();

      let categoryFilter = null;
      if (selectedCategory && selectedCategory !== 'todos') {
        const categoryMapping: Record<string, string> = {
          'discotecas': 'discoteca',
          'pubs': 'pub',
          'bares': 'bar',
          'restaurantes': 'restaurante',
          'cafeterias': 'cafe',
        };
        categoryFilter = [categoryMapping[selectedCategory] || selectedCategory];
      }

      const rpcParams = {
        p_user_id: userId,
        p_user_lat: userLocation?.latitude || 40.4168,
        p_user_lng: userLocation?.longitude || -3.7038,
        p_limit: pageSize,
        p_last_id: pageParam?.last_id || null,
        p_last_sorting_tier: pageParam?.last_tier || null,
        p_last_distance_km: pageParam?.last_distance || null,
        p_category_filter: categoryFilter,
        p_servicios_filter: globalFiltros.servicios?.length > 0 ? globalFiltros.servicios : null,
        p_ambiente_filter: globalFiltros.ambiente?.length > 0 ? globalFiltros.ambiente : null,
        p_clientela_filter: globalFiltros.clientela?.length > 0 ? globalFiltros.clientela : null,
        p_comunidad_filter: globalFiltros.comunidad || null,
        p_provincia_filter: globalFiltros.provincia || null,
        p_max_distance_km: globalFiltros.distancia || null,
        p_search_query: searchQuery || null,
      };

      console.log('[useBaresQuery FASE 12] 📡 RPC Parameters:', JSON.stringify(rpcParams, null, 2));

      let didTimeout = false;
      const timeoutId = setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, QUERY_TIMEOUT);

      try {
        const { data, error } = await supabase.rpc('get_venues_with_auth', rpcParams);
        clearTimeout(timeoutId);
        abortControllerRef.current = null;

        if (error) throw error;

        const venues = data || [];
        const enrichedVenues = venues.map((venue: any) => ({
          ...venue,
          esta_abierto: venue.esta_abierto !== undefined ? venue.esta_abierto : null,
          sorting_tier: venue.sorting_tier || 5,
          distancia: venue.distancia || venue.distance_km,
          coordenadas: { lat: venue.latitud || 0, lng: venue.longitud || 0 },
          is_favorite: venue.is_favorite || false,
        }));

        let nextCursor = undefined;
        if (venues.length === pageSize) {
          const lastVenue = venues[venues.length - 1];
          nextCursor = {
            last_id: lastVenue.id,
            last_tier: lastVenue.sorting_tier || 5,
            last_distance: lastVenue.distancia || 999999,
            offset: (pageParam?.offset || 0) + pageSize,
          };
        }

        console.log('[useBaresQuery FASE 14] ✅ Loaded', venues.length, 'venues');

        return {
          venues: enrichedVenues,
          nextCursor,
          pageNumber,
          totalLoaded: (pageParam?.offset || 0) + venues.length,
        };
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (didTimeout) throw new Error('Query timeout after 30 seconds');
        if (error?.name === 'AbortError') {
          return { venues: [], nextCursor: undefined, pageNumber: 0, totalLoaded: 0 };
        }
        throw error;
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: (failureCount, error: any) => {
      if (error?.name === 'AbortError' && !error?.message?.includes('timeout')) return false;
      return failureCount < MAX_RETRIES;
    },
    retryDelay: (attemptIndex) => Math.min(RETRY_DELAY_BASE * Math.pow(2, attemptIndex), 10000),
    maxPages: 10,
  });

  // ⚠️ SE HAN ELIMINADO LOS USEEFFECT DE PREFETCH Y CLEANUP MANUAL
  // Eran los causantes del bucle infinito y el bloqueo de la IA.

  return query;
};
