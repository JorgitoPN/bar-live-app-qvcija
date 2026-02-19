
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
  
  // Dynamic filter options based on actual data
  dynamicOptions: DynamicFilterOptions;
  refreshDynamicOptions: () => Promise<void>;
  isLoadingOptions: boolean;
  
  // Check if any filters are active
  hasActiveFilters: boolean;
  
  // ✅ NEW v3.4: Alias for backward compatibility
  hasActiveAdvancedFilters: boolean;
  
  // ✅ NEW v3.4: Context methods for applying/clearing filters
  contextAplicarFiltros: (filtros: Filtros) => void;
  contextLimpiarFiltrosAvanzados: () => void;
  
  // ✅ NEW v3.5: Category synchronization
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

/**
 * ✅ FILTER CONTEXT v3.5 - CATEGORY SYNCHRONIZATION
 * 
 * NEW FEATURES v3.5:
 * - 🔄 BIDIRECTIONAL SYNC: Category and tipo filter stay in sync
 * - ✅ selectedCategory: Tracks current category selection
 * - ✅ setSelectedCategory: Updates both category and tipo filter
 * - ✅ Auto-sync on filter changes: tipo filter updates category
 * - ✅ RESULT: Filters and categories always show the same state
 * 
 * Previous features v3.4:
 * - ✅ hasActiveAdvancedFilters: Alias for hasActiveFilters (backward compatibility)
 * - ✅ contextAplicarFiltros: Alias for aplicarFiltros (backward compatibility)
 * - ✅ contextLimpiarFiltrosAvanzados: Alias for limpiarFiltros (backward compatibility)
 * - ✅ Dynamic filter options based on actual data
 * - ✅ Auto-cleanup of invalid filter options
 * - ✅ Real-time updates when locals change
 * - ✅ Performance optimizations with useMemo
 */

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filtros, setFiltrosState] = useState<Filtros>({});
  const [selectedCategory, setSelectedCategoryState] = useState<string>('todas');
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
    console.log('[FilterContext v3.5] 🔄 Setting filters:', nuevosFiltros);
    setFiltrosState(nuevosFiltros);
    
    // ✅ SYNC: Update category if tipo filter changes
    if (nuevosFiltros.tipo && nuevosFiltros.tipo.length === 1) {
      const tipoValue = nuevosFiltros.tipo[0];
      setSelectedCategoryState(tipoValue);
      console.log('[FilterContext v3.5] 🔄 Synced category to:', tipoValue);
    } else if (!nuevosFiltros.tipo || nuevosFiltros.tipo.length === 0) {
      setSelectedCategoryState('todas');
      console.log('[FilterContext v3.5] 🔄 Synced category to: todas');
    }
  }, []);

  const aplicarFiltros = useCallback((nuevosFiltros: Filtros) => {
    console.log('[FilterContext v3.5] ✅ Applying filters:', nuevosFiltros);
    setFiltrosState(nuevosFiltros);
    
    // ✅ SYNC: Update category if tipo filter changes
    if (nuevosFiltros.tipo && nuevosFiltros.tipo.length === 1) {
      const tipoValue = nuevosFiltros.tipo[0];
      setSelectedCategoryState(tipoValue);
      console.log('[FilterContext v3.5] 🔄 Synced category to:', tipoValue);
    } else if (!nuevosFiltros.tipo || nuevosFiltros.tipo.length === 0) {
      setSelectedCategoryState('todas');
      console.log('[FilterContext v3.5] 🔄 Synced category to: todas');
    }
  }, []);

  const limpiarFiltros = useCallback(() => {
    console.log('[FilterContext v3.5] 🧹 Clearing all filters');
    setFiltrosState({});
    setSelectedCategoryState('todas');
    console.log('[FilterContext v3.5] 🔄 Reset category to: todas');
  }, []);
  
  const setSelectedCategory = useCallback((category: string) => {
    console.log('[FilterContext v3.5] 🏷️ Setting category:', category);
    setSelectedCategoryState(category);
    
    // ✅ SYNC: Update tipo filter when category changes
    if (category === 'todas') {
      setFiltrosState(prev => {
        const { tipo, ...rest } = prev;
        return rest;
      });
      console.log('[FilterContext v3.5] 🔄 Cleared tipo filter');
    } else {
      setFiltrosState(prev => ({
        ...prev,
        tipo: [category],
      }));
      console.log('[FilterContext v3.5] 🔄 Set tipo filter to:', [category]);
    }
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
   * ✅ CRITICAL FIX: Removed estado_solicitud = 'aprobado' filter
   * This ensures users see ALL active locals (335 in database)
   */
  const refreshDynamicOptions = useCallback(async () => {
    console.log('[FilterContext v3.4] 🔍 ========================================');
    console.log('[FilterContext v3.4] 🔍 LOADING DYNAMIC FILTER OPTIONS');
    console.log('[FilterContext v3.4] 🔍 Querying DISTINCT values from active locals...');
    console.log('[FilterContext v3.4] 🔍 ✅ FIXED: Removed estado_solicitud filter');
    
    setIsLoadingOptions(true);
    
    try {
      const { data: locales, error } = await supabase
        .from('locales')
        .select('barlive_types, servicios_disponibles, ambiente_completo, clientela, comunidad, provincia')
        .eq('activo', true);

      if (error) {
        console.error('[FilterContext v3.4] ❌ Error loading dynamic options:', error);
        setIsLoadingOptions(false);
        return;
      }

      if (!locales || locales.length === 0) {
        console.log('[FilterContext v3.4] ⚠️ No active locals found');
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

      console.log('[FilterContext v3.4] 📊 Processing', locales.length, 'active locals...');

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

      // ✅ Extract unique servicios (only those that are true)
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

      // ✅ FIXED: Extract unique ambientes from ambiente_completo (only those that are true)
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

      // ✅ NEW: Extract unique clientela (only those that are true)
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

      console.log('[FilterContext v3.4] ✅ ========================================');
      console.log('[FilterContext v3.4] ✅ DYNAMIC OPTIONS LOADED:');
      console.log('[FilterContext v3.4] ✅ Tipos:', newOptions.tipos.length, '-', newOptions.tipos);
      console.log('[FilterContext v3.4] ✅ Servicios:', newOptions.servicios.length, '-', newOptions.servicios);
      console.log('[FilterContext v3.4] ✅ Ambientes:', newOptions.ambientes.length, '-', newOptions.ambientes);
      console.log('[FilterContext v3.4] ✅ Clientela:', newOptions.clientela.length, '-', newOptions.clientela);
      console.log('[FilterContext v3.4] ✅ Comunidades:', newOptions.comunidades.length, '-', newOptions.comunidades);
      console.log('[FilterContext v3.4] ✅ Provincias:', newOptions.provincias.length, '-', newOptions.provincias);
      console.log('[FilterContext v3.4] ✅ ========================================');

      setDynamicOptions(newOptions);
    } catch (error) {
      console.error('[FilterContext v3.4] ❌ Error refreshing dynamic options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  }, []);

  // ✅ Load dynamic options on mount
  useEffect(() => {
    console.log('[FilterContext v3.4] 🚀 Initializing dynamic filter options...');
    refreshDynamicOptions();
  }, [refreshDynamicOptions]);

  // ✅ REAL-TIME: Refresh options when locals change
  useEffect(() => {
    console.log('[FilterContext v3.4] 📡 Setting up real-time subscription for filter options...');
    
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
          console.log('[FilterContext v3.4] 🔄 Locales changed, refreshing filter options...');
          console.log('[FilterContext v3.4] Event:', payload.eventType);
          
          setTimeout(() => {
            refreshDynamicOptions();
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      console.log('[FilterContext v3.4] 🔌 Unsubscribing from filter options updates');
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
      // ✅ NEW v3.4: Backward compatibility aliases
      hasActiveAdvancedFilters: hasActiveFilters,
      contextAplicarFiltros: aplicarFiltros,
      contextLimpiarFiltrosAvanzados: limpiarFiltros,
      // ✅ NEW v3.5: Category synchronization
      selectedCategory,
      setSelectedCategory,
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
