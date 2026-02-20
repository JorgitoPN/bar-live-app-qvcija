
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
  
  // ✅ NEW v3.5: Single category selection
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

/**
 * ✅ FILTER CONTEXT v3.5 - SINGLE CATEGORY SELECTION + FULL SYNCHRONIZATION
 * 
 * NEW FEATURES v3.5:
 * - ✅ selectedCategory: Single category selection (synchronized with Explorar)
 * - ✅ setSelectedCategory: Update category from anywhere
 * - ✅ BIDIRECTIONAL SYNC: Category changes in Filtros Avanzados update Explorar and vice versa
 * - ✅ NO DUPLICATE STATE: Single source of truth for category filter
 * - ✅ RESULT: Perfect synchronization between Explorar and Filtros Avanzados
 * 
 * Previous features v3.4:
 * - ✅ Dynamic filter options based on actual data
 * - ✅ Auto-cleanup of invalid filter options
 * - ✅ Real-time updates when locals change
 * - ✅ Performance optimizations with useMemo
 */

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filtros, setFiltrosState] = useState<Filtros>({});
  const [selectedCategory, setSelectedCategoryState] = useState<string | null>(null);
  const [dynamicOptions, setDynamicOptions] = useState<DynamicFilterOptions>({
    tipos: [],
    servicios: [],
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
  }, []);

  const aplicarFiltros = useCallback((nuevosFiltros: Filtros) => {
    console.log('[FilterContext v3.5] ✅ Applying filters:', nuevosFiltros);
    setFiltrosState(nuevosFiltros);
  }, []);

  const limpiarFiltros = useCallback(() => {
    console.log('[FilterContext v3.5] 🧹 Clearing all filters');
    setFiltrosState({});
    setSelectedCategoryState(null);
  }, []);

  const setSelectedCategory = useCallback((category: string | null) => {
    console.log('[FilterContext v3.5] 🏷️ Setting category:', category);
    setSelectedCategoryState(category);
  }, []);

  // ✅ OPTIMIZED: Check if any filters are active (memoized)
  const hasActiveFilters = useMemo(() => {
    return !!(
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
    console.log('[FilterContext v3.5] 🔍 ========================================');
    console.log('[FilterContext v3.5] 🔍 LOADING DYNAMIC FILTER OPTIONS');
    console.log('[FilterContext v3.5] 🔍 Querying DISTINCT values from active locals...');
    console.log('[FilterContext v3.5] 🔍 ✅ FIXED: Removed estado_solicitud filter');
    
    setIsLoadingOptions(true);
    
    try {
      const { data: locales, error } = await supabase
        .from('locales')
        .select('barlive_types, servicios_disponibles, ambiente_completo, clientela, comunidad, provincia')
        .eq('activo', true);

      if (error) {
        console.error('[FilterContext v3.5] ❌ Error loading dynamic options:', error);
        setIsLoadingOptions(false);
        return;
      }

      if (!locales || locales.length === 0) {
        console.log('[FilterContext v3.5] ⚠️ No active locals found');
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

      console.log('[FilterContext v3.5] 📊 Processing', locales.length, 'active locals...');

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

      console.log('[FilterContext v3.5] ✅ ========================================');
      console.log('[FilterContext v3.5] ✅ DYNAMIC OPTIONS LOADED:');
      console.log('[FilterContext v3.5] ✅ Tipos:', newOptions.tipos.length, '-', newOptions.tipos);
      console.log('[FilterContext v3.5] ✅ Servicios:', newOptions.servicios.length, '-', newOptions.servicios);
      console.log('[FilterContext v3.5] ✅ Ambientes:', newOptions.ambientes.length, '-', newOptions.ambientes);
      console.log('[FilterContext v3.5] ✅ Clientela:', newOptions.clientela.length, '-', newOptions.clientela);
      console.log('[FilterContext v3.5] ✅ Comunidades:', newOptions.comunidades.length, '-', newOptions.comunidades);
      console.log('[FilterContext v3.5] ✅ Provincias:', newOptions.provincias.length, '-', newOptions.provincias);
      console.log('[FilterContext v3.5] ✅ ========================================');

      setDynamicOptions(newOptions);
    } catch (error) {
      console.error('[FilterContext v3.5] ❌ Error refreshing dynamic options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  }, []);

  // ✅ Load dynamic options on mount
  useEffect(() => {
    console.log('[FilterContext v3.5] 🚀 Initializing dynamic filter options...');
    refreshDynamicOptions();
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
