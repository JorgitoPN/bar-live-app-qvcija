
/**
 * ✅ FILTER CONTEXT v3.3 - ALIASED TO ZUSTAND STORE
 * 
 * CHANGES v3.3:
 * - 🚫 REMOVED: "tipos" from DynamicFilterOptions interface
 * - ✅ Venue type filtering completely removed from data layer
 * 
 * CRITICAL CHANGES v3.2 (PASO 3.2 - HOOK ALIASING):
 * - ✅ ALIASING: useFilters now internally calls useFilterStore
 * - ✅ NO PROVIDER NEEDED: Components can use useFilters without FilterProvider
 * - ✅ BACKWARD COMPATIBLE: Old components work without changes
 * - ✅ ZUSTAND POWERED: All state management through Zustand
 * - ✅ RESULT: Smooth migration without breaking existing code
 * 
 * This file now acts as a FACADE/ALIAS to the Zustand store.
 * The FilterProvider component has been removed.
 * All state is managed by useFilterStore from src/store/useFilterStore.ts
 */

import { useFilterStore } from '@/src/store/useFilterStore';
import { Filtros } from '@/types';

interface DynamicFilterOptions {
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
  dynamicOptions: DynamicFilterOptions;
  refreshDynamicOptions: () => Promise<void>;
  isLoadingOptions: boolean;
  hasActiveFilters: boolean;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
}

/**
 * ✅ ALIASED HOOK - useFilters now points to Zustand store
 * 
 * This hook acts as a facade/alias to useFilterStore.
 * Components can continue using useFilters() without knowing
 * that the underlying implementation has changed to Zustand.
 * 
 * NO PROVIDER NEEDED - Just import and use!
 */
export function useFilters(): FilterContextType {
  // ✅ ALIASING: Internally call useFilterStore
  const filtros = useFilterStore(state => state.filtros);
  const setFiltros = useFilterStore(state => state.setFiltros);
  const aplicarFiltros = useFilterStore(state => state.aplicarFiltros);
  const limpiarFiltros = useFilterStore(state => state.limpiarFiltros);
  const dynamicOptions = useFilterStore(state => state.dynamicOptions);
  const refreshDynamicOptions = useFilterStore(state => state.refreshDynamicOptions);
  const isLoadingOptions = useFilterStore(state => state.isLoadingOptions);
  const hasActiveFilters = useFilterStore(state => state.hasActiveFilters);
  const selectedCategory = useFilterStore(state => state.selectedCategory);
  const setSelectedCategory = useFilterStore(state => state.setSelectedCategory);
  
  // Return the same interface as before
  return {
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
  };
}

// ✅ DEPRECATED: FilterProvider is no longer needed
// The component is kept for backward compatibility but does nothing
// All state is managed by useFilterStore
export function FilterProvider({ children }: { children: React.ReactNode }) {
  console.warn('[FilterContext v3.2] ⚠️ FilterProvider is deprecated. Remove it from your app - Zustand handles state now.');
  return <>{children}</>;
}
