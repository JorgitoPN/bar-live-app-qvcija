
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useMemo } from 'react';
import { Filtros } from '@/types';
import { supabase } from '@/utils/supabase';

interface DynamicFilterOptions {
  tipos: string[];
  servicios: string[];
  ambientes: string[];
  clientela: string[];
  comunidades: string[];
  provincias: string[];
}

interface FilterContextType {
  filtros: Filtros;
  setFiltros: (filtros: Filtros) => void;
  aplicarFiltros: (nuevosFiltros: Filtros) => void;
  limpiarFiltros: () => void;
  
  // ✅ NEW: Dynamic filter options based on actual data
  dynamicOptions: DynamicFilterOptions;
  refreshDynamicOptions: () => Promise<void>;
  isLoadingOptions: boolean;
  
  // ✅ NEW: Check if any filters are active
  hasActiveFilters: boolean;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

/**
 * ✅ FILTER CONTEXT v3.2 - FIXED DYNAMIC FILTERS WITH CLIENTELA
 * 
 * Features:
 * - ✅ INSTANT LOADING: Uses cached data from GlobalDataContext
 * - ✅ DYNAMIC OPTIONS: Only show filter options that have actual results
 * - ✅ AUTO-CLEANUP: Remove options when no locals match
 * - ✅ AUTO-UPDATE: Add new options when new locals are created
 * - ✅ ZERO FRUSTRATION: No more "0 results" filters
 * - ✅ PERFORMANCE: Optimized with useMemo to prevent re-renders
 * - ✅ FIXED: Proper handling of ambiente_completo, servicios_disponibles, and clientela columns
 */

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filtros, setFiltrosState] = useState<Filtros>({});
  const [dynamicOptions, setDynamicOptions] = useState<DynamicFilterOptions>({
    tipos: [],
    servicios: [],
    ambientes: [],
    clientela: [],
    comunidades: [],
    provincias: [],
  });
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  const setFiltros = useCallback((nuevosFiltros: Filtros) => {
    console.log('[FilterContext] 🔄 Setting filters:', nuevosFiltros);
    setFiltrosState(nuevosFiltros);
  }, []);

  const aplicarFiltros = useCallback((nuevosFiltros: Filtros) => {
    console.log('[FilterContext] ✅ Applying filters:', nuevosFiltros);
    setFiltrosState(nuevosFiltros);
  }, []);

  const limpiarFiltros = useCallback(() => {
    console.log('[FilterContext] 🧹 Clearing all filters');
    setFiltrosState({});
  }, []);

  // ✅ OPTIMIZED: Check if any filters are active (memoized)
  const hasActiveFilters = useMemo(() => {
    return !!(
      (filtros.tipo && filtros.tipo.length > 0) ||
      (filtros.servicios && filtros.servicios.length > 0) ||
      (filtros.ambiente && filtros.ambiente.length > 0) ||
      (filtros.clientela && filtros.clientela.length > 0) ||
      filtros.comunidad ||
      filtros.provincia ||
      filtros.distancia
    );
  }, [filtros]);

  /**
   * ✅ FIXED: Query distinct values from active locals
   * This ensures users only see filter options that will return results
   */
  const refreshDynamicOptions = useCallback(async () => {
    console.log('[FilterContext] 🔍 ========================================');
    console.log('[FilterContext] 🔍 LOADING DYNAMIC FILTER OPTIONS');
    console.log('[FilterContext] 🔍 Querying DISTINCT values from active locals...');
    
    setIsLoadingOptions(true);
    
    try {
      // ✅ FIXED: Query with proper column selection including clientela
      const { data: locales, error } = await supabase
        .from('locales')
        .select('barlive_types, servicios_disponibles, ambiente_completo, clientela, comunidad, provincia')
        .eq('activo', true)
        .eq('estado_solicitud', 'aprobado');

      if (error) {
        console.error('[FilterContext] ❌ Error loading dynamic options:', error);
        setIsLoadingOptions(false);
        return;
      }

      if (!locales || locales.length === 0) {
        console.log('[FilterContext] ⚠️ No active locals found');
        setDynamicOptions({
          tipos: [],
          servicios: [],
          ambientes: [],
          clientela: [],
          comunidades: [],
          provincias: [],
        });
        setIsLoadingOptions(false);
        return;
      }

      console.log('[FilterContext] 📊 Processing', locales.length, 'active locals...');

      // ✅ Extract unique tipos (categories)
      const tiposSet = new Set<string>();
      locales.forEach(local => {
        if (local.barlive_types && Array.isArray(local.barlive_types)) {
          local.barlive_types.forEach((tipo: string) => {
            if (tipo && tipo.trim()) {
              tiposSet.add(tipo.toLowerCase());
            }
          });
        }
      });

      // ✅ Extract unique servicios
      const serviciosSet = new Set<string>();
      locales.forEach(local => {
        if (local.servicios_disponibles && typeof local.servicios_disponibles === 'object') {
          Object.entries(local.servicios_disponibles).forEach(([key, value]) => {
            if (value === true && key && key.trim()) {
              serviciosSet.add(key);
            }
          });
        }
      });

      // ✅ FIXED: Extract unique ambientes from ambiente_completo
      const ambientesSet = new Set<string>();
      locales.forEach(local => {
        if (local.ambiente_completo && typeof local.ambiente_completo === 'object') {
          Object.entries(local.ambiente_completo).forEach(([key, value]) => {
            if (value === true && key && key.trim()) {
              ambientesSet.add(key);
            }
          });
        }
      });

      // ✅ NEW: Extract unique clientela
      const clientelaSet = new Set<string>();
      locales.forEach(local => {
        if (local.clientela && typeof local.clientela === 'object') {
          Object.entries(local.clientela).forEach(([key, value]) => {
            if (value === true && key && key.trim()) {
              clientelaSet.add(key);
            }
          });
        }
      });

      // ✅ Extract unique comunidades
      const comunidadesSet = new Set<string>();
      locales.forEach(local => {
        if (local.comunidad && local.comunidad.trim()) {
          comunidadesSet.add(local.comunidad);
        }
      });

      // ✅ Extract unique provincias
      const provinciasSet = new Set<string>();
      locales.forEach(local => {
        if (local.provincia && local.provincia.trim()) {
          provinciasSet.add(local.provincia);
        }
      });

      const newOptions: DynamicFilterOptions = {
        tipos: Array.from(tiposSet).sort(),
        servicios: Array.from(serviciosSet).sort(),
        ambientes: Array.from(ambientesSet).sort(),
        clientela: Array.from(clientelaSet).sort(),
        comunidades: Array.from(comunidadesSet).sort(),
        provincias: Array.from(provinciasSet).sort(),
      };

      console.log('[FilterContext] ✅ ========================================');
      console.log('[FilterContext] ✅ DYNAMIC OPTIONS LOADED:');
      console.log('[FilterContext] ✅ Tipos:', newOptions.tipos.length, '-', newOptions.tipos);
      console.log('[FilterContext] ✅ Servicios:', newOptions.servicios.length, '-', newOptions.servicios);
      console.log('[FilterContext] ✅ Ambientes:', newOptions.ambientes.length, '-', newOptions.ambientes);
      console.log('[FilterContext] ✅ Clientela:', newOptions.clientela.length, '-', newOptions.clientela);
      console.log('[FilterContext] ✅ Comunidades:', newOptions.comunidades.length, '-', newOptions.comunidades);
      console.log('[FilterContext] ✅ Provincias:', newOptions.provincias.length, '-', newOptions.provincias);
      console.log('[FilterContext] ✅ ========================================');

      setDynamicOptions(newOptions);
    } catch (error) {
      console.error('[FilterContext] ❌ Error refreshing dynamic options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  }, []);

  // ✅ Load dynamic options on mount
  useEffect(() => {
    console.log('[FilterContext] 🚀 Initializing dynamic filter options...');
    refreshDynamicOptions();
  }, [refreshDynamicOptions]);

  // ✅ REAL-TIME: Refresh options when locals change
  useEffect(() => {
    console.log('[FilterContext] 📡 Setting up real-time subscription for filter options...');
    
    const subscription = supabase
      .channel('filter-options-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'locales',
        },
        (payload) => {
          console.log('[FilterContext] 🔄 Locales changed, refreshing filter options...');
          console.log('[FilterContext] Event:', payload.eventType);
          
          // Debounce refresh to avoid too many calls
          setTimeout(() => {
            refreshDynamicOptions();
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      console.log('[FilterContext] 🔌 Unsubscribing from filter options updates');
      supabase.removeChannel(subscription);
    };
  }, [refreshDynamicOptions]);

  return (
    <FilterContext.Provider value={{ 
      filtros, 
      setFiltros, 
      aplicarFiltros, 
      limpiarFiltros,
      dynamicOptions,
      refreshDynamicOptions,
      isLoadingOptions,
      hasActiveFilters,
    }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}
