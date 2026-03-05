
import { create } from 'zustand';
import { Filtros } from '@/types';
import { supabase } from '@/utils/supabase';

/**
 * ✅ FILTER STORE v2.0 - SYNCHRONIZED SINGLE LOCAL TYPE SELECTION
 * 
 * NEW FEATURES v2.0:
 * - 🎯 SINGLE SELECTION: Only one "Tipo de Local" can be active at a time
 * - 🔄 BIDIRECTIONAL SYNC: Changes in Advanced Filters sync with Explore filter bar
 * - ✅ EXCLUSIVE TOGGLE: Selecting a new type automatically deselects the previous one
 * - 🌐 GLOBAL STATE: Both components consume the same state variable
 * 
 * BENEFITS:
 * - ✅ ATOMIC UPDATES: Only filter-using components re-render
 * - ✅ SINGLE CATEGORY: Synchronized category selection
 * - ✅ DYNAMIC OPTIONS: Real-time filter options from database
 * - ✅ NO PROVIDER: Direct import and use
 * 
 * EXAMPLE:
 * // Only re-renders when filters change
 * const filtros = useFilterStore(state => state.filtros);
 * const setFiltros = useFilterStore(state => state.setFiltros);
 */

interface DynamicFilterOptions {
  tipos: string[];
  servicios: string[];
  ambientes: string[];
  clientela: string[];
  comunidades: string[];
  provincias: string[];
}

interface FilterState {
  // State
  filtros: Filtros;
  selectedLocalType: string | null; // ✅ NEW: Single selected local type
  selectedCategory: string | null;
  dynamicOptions: DynamicFilterOptions;
  isLoadingOptions: boolean;
  hasActiveFilters: boolean;
  
  // Actions
  setFiltros: (filtros: Filtros) => void;
  aplicarFiltros: (filtros: Filtros) => void;
  limpiarFiltros: () => void;
  setSelectedCategory: (category: string | null) => void;
  toggleLocalType: (tipo: string) => void; // ✅ NEW: Toggle single local type
  refreshDynamicOptions: () => Promise<void>;
}

export const useFilterStore = create<FilterState>((set, get) => ({
  // Initial state
  filtros: {},
  selectedLocalType: null, // ✅ NEW: Track single selected local type
  selectedCategory: null,
  dynamicOptions: {
    tipos: [],
    servicios: [],
    ambientes: [],
    clientela: [],
    comunidades: [],
    provincias: [],
  },
  isLoadingOptions: false,
  hasActiveFilters: false,
  
  // Set filters
  setFiltros: (nuevosFiltros) => {
    console.log('[FilterStore v2.0] 🔄 Setting filters:', nuevosFiltros);
    
    // ✅ Extract selectedLocalType from filtros.tipo (single value)
    const selectedType = nuevosFiltros.tipo || null;
    
    // Calculate if any filters are active
    const hasActive = !!(
      nuevosFiltros.tipo ||
      (nuevosFiltros.servicios && nuevosFiltros.servicios.length > 0) ||
      (nuevosFiltros.ambiente && nuevosFiltros.ambiente.length > 0) ||
      (nuevosFiltros.clientela && nuevosFiltros.clientela.length > 0) ||
      nuevosFiltros.comunidad ||
      nuevosFiltros.provincia ||
      nuevosFiltros.distancia
    );
    
    set({ 
      filtros: nuevosFiltros, 
      selectedLocalType: selectedType,
      hasActiveFilters: hasActive 
    });
  },
  
  // Apply filters (same as setFiltros)
  aplicarFiltros: (nuevosFiltros) => {
    console.log('[FilterStore v2.0] ✅ Applying filters:', nuevosFiltros);
    get().setFiltros(nuevosFiltros);
  },
  
  // Clear all filters
  limpiarFiltros: () => {
    console.log('[FilterStore v2.0] 🧹 Clearing all filters');
    set({ 
      filtros: {}, 
      selectedLocalType: null, // ✅ Clear selected local type
      selectedCategory: null,
      hasActiveFilters: false,
    });
  },
  
  // Set selected category
  setSelectedCategory: (category) => {
    console.log('[FilterStore v2.0] 🏷️ Setting category:', category);
    set({ selectedCategory: category });
  },
  
  // ✅ NEW: Toggle single local type (exclusive selection)
  toggleLocalType: (tipo) => {
    const currentType = get().selectedLocalType;
    const currentFiltros = get().filtros;
    
    // If clicking the same type, deselect it
    if (currentType === tipo) {
      console.log('[FilterStore v2.0] 🔄 Deselecting local type:', tipo);
      const newFiltros = { ...currentFiltros };
      delete newFiltros.tipo;
      
      set({ 
        selectedLocalType: null,
        filtros: newFiltros,
        hasActiveFilters: !!(
          (newFiltros.servicios && newFiltros.servicios.length > 0) ||
          (newFiltros.ambiente && newFiltros.ambiente.length > 0) ||
          (newFiltros.clientela && newFiltros.clientela.length > 0) ||
          newFiltros.comunidad ||
          newFiltros.provincia ||
          newFiltros.distancia
        ),
      });
    } else {
      // Select new type (automatically deselects previous)
      console.log('[FilterStore v2.0] ✅ Selecting local type:', tipo, '(previous:', currentType, ')');
      const newFiltros = { ...currentFiltros, tipo };
      
      set({ 
        selectedLocalType: tipo,
        filtros: newFiltros,
        hasActiveFilters: true,
      });
    }
  },
  
  // Refresh dynamic filter options from database
  refreshDynamicOptions: async () => {
    console.log('[FilterStore v2.0] 🔍 Loading dynamic filter options...');
    
    set({ isLoadingOptions: true });
    
    try {
      const { data: locales, error } = await supabase
        .from('locales')
        .select('barlive_types, servicios_disponibles, ambiente_completo, clientela, comunidad, provincia')
        .eq('activo', true);

      if (error) {
        console.error('[FilterStore v2.0] ❌ Error loading dynamic options:', error);
        set({ isLoadingOptions: false });
        return;
      }

      if (!locales || locales.length === 0) {
        console.log('[FilterStore v2.0] ⚠️ No active locals found');
        set({ 
          dynamicOptions: {
            tipos: [],
            servicios: [],
            ambientes: [],
            clientela: [],
            comunidades: [],
            provincias: [],
          },
          isLoadingOptions: false,
        });
        return;
      }

      console.log('[FilterStore v2.0] 📊 Processing', locales.length, 'active locals...');

      // Extract unique tipos
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

      // Extract unique servicios
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

      // Extract unique ambientes
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

      // Extract unique clientela
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

      // Extract unique comunidades
      const comunidadesSet = new Set<string>();
      locales.forEach(local => {
        if (local.comunidad && local.comunidad.trim()) {
          comunidadesSet.add(local.comunidad);
        }
      });

      // Extract unique provincias
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

      console.log('[FilterStore v2.0] ✅ Dynamic options loaded:', {
        tipos: newOptions.tipos.length,
        servicios: newOptions.servicios.length,
        ambientes: newOptions.ambientes.length,
        clientela: newOptions.clientela.length,
        comunidades: newOptions.comunidades.length,
        provincias: newOptions.provincias.length,
      });

      set({ dynamicOptions: newOptions, isLoadingOptions: false });
    } catch (error) {
      console.error('[FilterStore v2.0] ❌ Error refreshing dynamic options:', error);
      set({ isLoadingOptions: false });
    }
  },
}));
