
import { Filtros } from '@/types';

/**
 * ✅ FILTER LOCALS UTILITY v2.0 - APPLY ADVANCED FILTERS
 * 
 * This utility applies advanced filters from FilterContext to the locals data.
 * Used by both Explorar and Mapa screens to ensure consistent filtering.
 * 
 * FEATURES:
 * - ✅ Type filtering (cafe, bar, restaurante, etc.)
 * - ✅ Services filtering (wifi, parking, terraza, etc.)
 * - ✅ Ambiente filtering (tranquilo, animado, etc.)
 * - ✅ Clientela filtering (grupos, turistas, familias, etc.)
 * - ✅ Location filtering (comunidad, provincia)
 * - ✅ Distance filtering (radius in km)
 */

interface Local {
  id: string;
  nombre: string;
  barlive_types?: string[];
  barlive_type?: string;
  servicios_disponibles?: Record<string, boolean>;
  ambiente_completo?: Record<string, boolean>;
  clientela?: Record<string, boolean>;
  comunidad?: string;
  provincia?: string;
  distancia?: number;
  latitud?: number;
  longitud?: number;
  [key: string]: any;
}

export function applyAdvancedFilters(locales: Local[], filtros: Filtros): Local[] {
  console.log('[filterLocals v2.0] 🔍 Applying advanced filters to', locales.length, 'locals');
  console.log('[filterLocals v2.0] 📋 Filters:', filtros);

  let filtered = [...locales];

  // ✅ FILTER BY TYPE (cafe, bar, restaurante, etc.)
  if (filtros.tipo && filtros.tipo.length > 0) {
    console.log('[filterLocals v2.0] 🏪 Filtering by tipo:', filtros.tipo);
    
    filtered = filtered.filter(local => {
      const barliveTypes = local.barlive_types || [];
      const barliveType = local.barlive_type || '';
      
      const allTypes = [...barliveTypes, barliveType]
        .filter(t => t && t.trim())
        .map(t => t.toLowerCase().trim());
      
      // Check if any of the local's types match any of the filter types
      return filtros.tipo!.some(filterTipo => {
        const filterTipoLower = filterTipo.toLowerCase();
        
        // Direct match
        if (allTypes.includes(filterTipoLower)) {
          return true;
        }
        
        // Fuzzy match for variations
        if (filterTipoLower === 'cafe' || filterTipoLower === 'cafeteria') {
          return allTypes.some(t => t.includes('cafe') || t.includes('cafeteria'));
        }
        if (filterTipoLower === 'cocteleria' || filterTipoLower === 'cocktail') {
          return allTypes.some(t => t.includes('coctel') || t.includes('cocktail'));
        }
        if (filterTipoLower === 'discoteca' || filterTipoLower === 'nightclub') {
          return allTypes.some(t => t.includes('discoteca') || t.includes('nightclub') || t.includes('club'));
        }
        
        return false;
      });
    });
    
    console.log('[filterLocals v2.0] ✅ After tipo filter:', filtered.length, 'locals');
  }

  // ✅ FILTER BY SERVICES (wifi, parking, terraza, etc.)
  if (filtros.servicios && filtros.servicios.length > 0) {
    console.log('[filterLocals v2.0] ✓ Filtering by servicios:', filtros.servicios);
    
    filtered = filtered.filter(local => {
      if (!local.servicios_disponibles || typeof local.servicios_disponibles !== 'object') {
        return false;
      }
      
      // Local must have ALL selected services
      return filtros.servicios!.every(servicio => {
        return local.servicios_disponibles![servicio] === true;
      });
    });
    
    console.log('[filterLocals v2.0] ✅ After servicios filter:', filtered.length, 'locals');
  }

  // ✅ FILTER BY AMBIENTE (tranquilo, animado, etc.)
  if (filtros.ambiente && filtros.ambiente.length > 0) {
    console.log('[filterLocals v2.0] 🌟 Filtering by ambiente:', filtros.ambiente);
    
    filtered = filtered.filter(local => {
      if (!local.ambiente_completo || typeof local.ambiente_completo !== 'object') {
        return false;
      }
      
      // Local must have at least ONE of the selected ambientes
      return filtros.ambiente!.some(ambiente => {
        return local.ambiente_completo![ambiente] === true;
      });
    });
    
    console.log('[filterLocals v2.0] ✅ After ambiente filter:', filtered.length, 'locals');
  }

  // ✅ FILTER BY CLIENTELA (grupos, turistas, familias, etc.)
  if (filtros.clientela && filtros.clientela.length > 0) {
    console.log('[filterLocals v2.0] 👥 Filtering by clientela:', filtros.clientela);
    
    filtered = filtered.filter(local => {
      if (!local.clientela || typeof local.clientela !== 'object') {
        return false;
      }
      
      // Local must have at least ONE of the selected clientela types
      return filtros.clientela!.some(clientelaTipo => {
        return local.clientela![clientelaTipo] === true;
      });
    });
    
    console.log('[filterLocals v2.0] ✅ After clientela filter:', filtered.length, 'locals');
  }

  // ✅ FILTER BY COMUNIDAD
  if (filtros.comunidad && filtros.comunidad !== 'Todas las Comunidades') {
    console.log('[filterLocals v2.0] 📍 Filtering by comunidad:', filtros.comunidad);
    
    filtered = filtered.filter(local => {
      return local.comunidad === filtros.comunidad;
    });
    
    console.log('[filterLocals v2.0] ✅ After comunidad filter:', filtered.length, 'locals');
  }

  // ✅ FILTER BY PROVINCIA
  if (filtros.provincia) {
    console.log('[filterLocals v2.0] 📍 Filtering by provincia:', filtros.provincia);
    
    filtered = filtered.filter(local => {
      return local.provincia === filtros.provincia;
    });
    
    console.log('[filterLocals v2.0] ✅ After provincia filter:', filtered.length, 'locals');
  }

  // ✅ FILTER BY DISTANCE (radius in km)
  if (filtros.distancia && filtros.distancia > 0) {
    console.log('[filterLocals v2.0] 📏 Filtering by distance:', filtros.distancia, 'km');
    
    filtered = filtered.filter(local => {
      if (local.distancia === null || local.distancia === undefined) {
        return true; // Keep locals without distance info
      }
      
      return local.distancia <= filtros.distancia!;
    });
    
    console.log('[filterLocals v2.0] ✅ After distance filter:', filtered.length, 'locals');
  }

  console.log('[filterLocals v2.0] 🎯 Final result:', filtered.length, 'locals after all filters');
  
  return filtered;
}
