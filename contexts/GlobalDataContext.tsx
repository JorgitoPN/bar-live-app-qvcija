
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/utils/supabase';
import { Local } from '@/types';
import { performanceOptimizer } from '@/utils/performanceOptimizer';

interface GlobalDataContextType {
  locales: Local[];
  isInitialLoading: boolean;
  isRefreshing: boolean;
  refreshData: (showLoading?: boolean) => Promise<void>;
  lastRefreshTime: Date | null;
}

const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

export function GlobalDataProvider({ children }: { children: ReactNode }) {
  const [locales, setLocales] = useState<Local[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  const loadLocales = useCallback(async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setIsRefreshing(true);
      }

      console.log('[GlobalData] 🔄 Loading locales...');

      // Try cache first for INSTANT loading
      const cachedLocales = await performanceOptimizer.getCache<Local[]>('global_locales_data');
      if (cachedLocales && cachedLocales.length > 0) {
        console.log('[GlobalData] ⚡ INSTANT load from cache:', cachedLocales.length);
        setLocales(cachedLocales);
        setIsInitialLoading(false);
        setIsRefreshing(false);
        // Continue loading in background to update cache
      }

      // ✅ CRITICAL FIX: Load ALL locales with activo = true
      const { data, error, count } = await supabase
        .from('locales')
        .select('*', { count: 'exact' })
        .eq('activo', true)
        .not('latitud', 'is', null)
        .not('longitud', 'is', null);

      if (error) {
        console.error('[GlobalData] ❌ Error loading locales:', error);
        setIsInitialLoading(false);
        setIsRefreshing(false);
        return;
      }

      console.log(`[GlobalData] ✅ Loaded ${data?.length || 0} active locales from DB (total: ${count})`);

      // Log details about loaded locales
      if (data && data.length > 0) {
        const enrichedCount = data.filter(l => l.enriquecido === true).length;
        const osmCount = data.filter(l => l.source_type === 'osm').length;
        const googleCount = data.filter(l => l.source_type === 'google').length;
        
        console.log('[GlobalData] 📊 Breakdown:');
        console.log(`  - Enriched: ${enrichedCount}`);
        console.log(`  - OSM: ${osmCount}`);
        console.log(`  - Google: ${googleCount}`);
        
        // Log sample of locals
        console.log('[GlobalData] 📋 Sample locales (first 5):');
        data.slice(0, 5).forEach((local, i) => {
          console.log(`  ${i + 1}. ${local.nombre} (${local.provincia}) - ${local.barlive_types?.join(', ') || local.tipo}`);
        });
      }

      const localesTransformados: Local[] = (data || []).map((local) => ({
        id: local.id,
        nombre: local.nombre,
        tipo: local.tipo,
        descripcion: local.descripcion || '',
        direccion: local.direccion,
        ciudad: local.ciudad || '',
        provincia: local.provincia,
        coordenadas: {
          lat: parseFloat(local.latitud),
          lng: parseFloat(local.longitud),
        },
        imagenes: local.galeria_urls || (local.imagen_url ? [local.imagen_url] : []),
        rating: parseFloat(local.google_rating || local.rating || 0),
        precioMedio: local.precio_medio || 0,
        horarios: [],
        ambiente: local.ambiente || [],
        musica: local.musica || [],
        servicios: local.servicios || [],
        metodosPago: local.metodos_pago || [],
        destacado: local.destacado || false,
        nuevo: local.nuevo || false,
        abierto: local.abierto || false,
        popularidad: local.popularidad || 0,
        checkIns: local.check_ins || 0,
        seguidores: local.seguidores || 0,
        telefono: local.telefono,
        web: local.website,
        google_place_id: local.google_place_id,
        valoracion_google: parseFloat(local.google_rating || 0),
        numero_reviews_google: local.google_user_ratings_total || 0,
        website_url: local.website,
        tipos_google: local.tipos_google || [],
        nivel_precio_google: local.nivel_precio_google,
        google_maps_url: local.google_maps_url,
        descripcion_google: local.descripcion_google,
        horarios_completos: local.horarios_completos,
        estado_actual: local.estado_actual,
        servicios_disponibles: local.servicios_disponibles,
        ambiente_google: local.ambiente_completo,
        clientela: local.clientela,
        imagen_url: local.imagen_url,
        galeria_urls: local.galeria_urls || [],
        reviews_google: local.reviews_google,
        activo: local.activo,
        source_type: local.source_type,
        source_id: local.source_id,
        comunidad: local.comunidad,
        fecha_importacion_google: local.fecha_actualizacion,
        enriquecido: local.enriquecido,
        barlive_type: local.barlive_type,
        barlive_types: local.barlive_types || [],
        estado_negocio: local.google_business_status,
      }));

      setLocales(localesTransformados);
      setLastRefreshTime(new Date());
      
      // Cache for next time (10 minutes TTL)
      await performanceOptimizer.setCache('global_locales_data', localesTransformados, 10 * 60 * 1000);
      
      console.log('[GlobalData] ✅ Data loaded and cached successfully');
    } catch (error) {
      console.error('[GlobalData] ❌ Error in loadLocales:', error);
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const refreshData = useCallback(async (showLoading: boolean = true) => {
    console.log('[GlobalData] 🔄 Manual refresh triggered');
    // Clear cache to force fresh data
    await performanceOptimizer.clearCache('global_locales_data');
    await loadLocales(showLoading);
  }, [loadLocales]);

  useEffect(() => {
    loadLocales(true);
  }, [loadLocales]);

  return (
    <GlobalDataContext.Provider
      value={{
        locales,
        isInitialLoading,
        isRefreshing,
        refreshData,
        lastRefreshTime,
      }}
    >
      {children}
    </GlobalDataContext.Provider>
  );
}

export function useGlobalData() {
  const context = useContext(GlobalDataContext);
  if (context === undefined) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }
  return context;
}
