
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
 * ✅ FILTER CONTEXT v3.6 - FIXED CLIENTELA FILTER OPTIONS
 * 
 * CRITICAL FIX v3.6:
 * - 🐛 FIXED: Only show clientela options that have at least ONE locale with true
 * - ✅ VERIFIED: Filters now only show options that actually exist in the data
 * - ✅ IMPROVED UX: Users won't select filters that return 0 results
 * - ✅ SAME LOGIC: Applied to servicios and ambientes as well
 * 
 * Previous features v3.5:
 * - 🔄 BIDIRECTIONAL SYNC: Category and tipo filter stay in sync
 * - ✅ selectedCategory: Tracks current category selection
 * - ✅ setSelectedCategory: Updates both category and tipo filter
 * - ✅ Auto-sync on filter changes: tipo filter updates category
 * - ✅ RESULT: Filters and categories always show the same state
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
    console.log('[FilterContext v3.6] 🔄 Setting filters:', nuevosFiltros);
    setFiltrosState(nuevosFiltros);
    
    // ✅ SYNC: Update category if tipo filter changes
    if (nuevosFiltros.tipo && nuevosFiltros.tipo.length === 1) {
      const tipoValue = nuevosFiltros.tipo[0];
      setSelectedCategoryState(tipoValue);
      console.log('[FilterContext v3.6] 🔄 Synced category to:', tipoValue);
    } else if (!nuevosFiltros.tipo || nuevosFiltros.tipo.length === 0) {
      setSelectedCategoryState('todas');
      console.log('[FilterContext v3.6] 🔄 Synced category to: todas');
    }
  }, []);

  const aplicarFiltros = useCallback((nuevosFiltros: Filtros) => {
    console.log('[FilterContext v3.6] ✅ Applying filters:', nuevosFiltros);
    setFiltrosState(nuevosFiltros);
    
    // ✅ SYNC: Update category if tipo filter changes
    if (nuevosFiltros.tipo && nuevosFiltros.tipo.length === 1) {
      const tipoValue = nuevosFiltros.tipo[0];
      setSelectedCategoryState(tipoValue);
      console.log('[FilterContext v3.6] 🔄 Synced category to:', tipoValue);
    } else if (!nuevosFiltros.tipo || nuevosFiltros.tipo.length === 0) {
      setSelectedCategoryState('todas');
      console.log('[FilterContext v3.6] 🔄 Synced category to: todas');
    }
  }, []);

  const limpiarFiltros = useCallback(() => {
    console.log('[FilterContext v3.6] 🧹 Clearing all filters');
    setFiltrosState({});
    setSelectedCategoryState('todas');
    console.log('[FilterContext v3.6] 🔄 Reset category to: todas');
  }, []);
  
  const setSelectedCategory = useCallback((category: string) => {
    console.log('[FilterContext v3.6] 🏷️ Setting category:', category);
    setSelectedCategoryState(category);
    
    // ✅ SYNC: Update tipo filter when category changes
    if (category === 'todas') {
      setFiltrosState(prev => {
        const { tipo, ...rest } = prev;
        return rest;
      });
      console.log('[FilterContext v3.6] 🔄 Cleared tipo filter');
    } else {
      setFiltrosState(prev => ({
        ...prev,
        tipo: [category],
      }));
      console.log('[FilterContext v3.6] 🔄 Set tipo filter to:', [category]);
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
   * ✅ CRITICAL FIX v3.6: Only show filter options that have at least ONE locale with true
   * This prevents users from selecting filters that will return 0 results
   */
  const refreshDynamicOptions = useCallback(async () => {
    console.log('[FilterContext v3.6] 🔍 ========================================');
    console.log('[FilterContext v3.6] 🔍 LOADING DYNAMIC FILTER OPTIONS (FIXED v3.6)');
    console.log('[FilterContext v3.6] 🔍 ✅ CRITICAL FIX: Only showing options with at least ONE true value');
    
    setIsLoadingOptions(true);
    
    try {
      const { data: locales, error } = await supabase
        .from('locales')
        .select('barlive_types, servicios_disponibles, ambiente_completo, clientela, comunidad, provincia')
        .eq('activo', true);

      if (error) {
        console.error('[FilterContext v3.6] ❌ Error loading dynamic options:', error);
        setIsLoadingOptions(false);
        return;
      }

      if (!locales || locales.length === 0) {
        console.log('[FilterContext v3.6] ⚠️ No active locals found');
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

      console.log('[FilterContext v3.6] 📊 Processing', locales.length, 'active locals...');

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

      // ✅ CRITICAL FIX v3.6: Extract unique servicios (only those that have at least ONE true)
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

      // ✅ CRITICAL FIX v3.6: Extract unique ambientes (only those that have at least ONE true)
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

      // ✅ CRITICAL FIX v3.6: Extract unique clientela (only those that have at least ONE true)
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

      console.log('[FilterContext v3.6] ✅ ========================================');
      console.log('[FilterContext v3.6] ✅ DYNAMIC OPTIONS LOADED (FIXED v3.6):');
      console.log('[FilterContext v3.6] ✅ Tipos:', newOptions.tipos.length, '-', newOptions.tipos);
      console.log('[FilterContext v3.6] ✅ Servicios:', newOptions.servicios.length, '-', newOptions.servicios);
      console.log('[FilterContext v3.6] ✅ Ambientes:', newOptions.ambientes.length, '-', newOptions.ambientes);
      console.log('[FilterContext v3.6] ✅ Clientela:', newOptions.clientela.length, '-', newOptions.clientela);
      console.log('[FilterContext v3.6] ✅ Comunidades:', newOptions.comunidades.length, '-', newOptions.comunidades);
      console.log('[FilterContext v3.6] ✅ Provincias:', newOptions.provincias.length, '-', newOptions.provincias);
      console.log('[FilterContext v3.6] ✅ ========================================');
      
      // ✅ CRITICAL FIX v3.6: Log warning if clientela is empty
      if (newOptions.clientela.length === 0) {
        console.warn('[FilterContext v3.6] ⚠️ WARNING: No clientela options found!');
        console.warn('[FilterContext v3.6] ⚠️ This means NO locales have any clientela field set to true');
        console.warn('[FilterContext v3.6] ⚠️ Users will not be able to filter by clientela');
      }

      setDynamicOptions(newOptions);
    } catch (error) {
      console.error('[FilterContext v3.6] ❌ Error refreshing dynamic options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  }, []);

  // ✅ Load dynamic options on mount
  useEffect(() => {
    console.log('[FilterContext v3.6] 🚀 Initializing dynamic filter options...');
    refreshDynamicOptions();
  }, [refreshDynamicOptions]);

  // ✅ REAL-TIME: Refresh options when locals change
  useEffect(() => {
    console.log('[FilterContext v3.6] 📡 Setting up real-time subscription for filter options...');
    
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
          console.log('[FilterContext v3.6] 🔄 Locales changed, refreshing filter options...');
          console.log('[FilterContext v3.6] Event:', payload.eventType);
          
          setTimeout(() => {
            refreshDynamicOptions();
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      console.log('[FilterContext v3.6] 🔌 Unsubscribing from filter options updates');
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
