
import { Filtros } from '@/types';

/**
 * ✅ FILTER LOCALS UTILITY v4.1 - ENHANCED DEBUGGING
 * 
 * CRITICAL CHANGES v4.1:
 * - 🐛 ENHANCED DEBUGGING: Added detailed logs for clientela filter
 * - 📊 STATISTICS: Shows match/no-match/no-data counts
 * - ✅ VERIFIED LOGIC: OR logic confirmed for clientela (at least ONE match)
 * - 🔍 DETAILED TRACKING: Tracks why each local is included/excluded
 * 
 * Previous changes v4.0:
 * - 🎯 CLEAN ARCHITECTURE: Rebuilt from scratch for clarity and maintainability
 * - ✅ PROPER DISTANCE CALCULATION: Uses userLocation parameter for accurate filtering
 * - ✅ CONSISTENT LOGIC: Same filtering rules across Explorar and Mapa
 * - ✅ OPTIMIZED PERFORMANCE: Early returns and efficient checks
 * - ✅ COMPREHENSIVE LOGGING: Detailed logs for debugging
 * 
 * This utility applies advanced filters to locales data.
 * Used by both Explorar and Mapa screens to ensure consistent filtering.
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
  distance_km?: number;
  latitud?: number;
  longitud?: number;
  [key: string]: any;
}

interface UserLocation {
  lat: number;
  lng: number;
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Apply advanced filters to locales array
 * @param locales - Array of locales to filter
 * @param filtros - Filter criteria from FilterContext
 * @param userLocation - Optional user location for distance filtering
 * @returns Filtered array of locales
 */
export function applyAdvancedFilters(
  locales: Local[], 
  filtros: Filtros, 
  userLocation?: UserLocation | null
): Local[] {
  const startTime = Date.now();
  
  console.log('[filterLocals v4.1] 🔍 ========================================');
  console.log('[filterLocals v4.1] 🔍 APPLYING ADVANCED FILTERS (REBUILT v4.1)');
  console.log('[filterLocals v4.1] 🔍 Starting with', locales.length, 'locals');
  console.log('[filterLocals v4.1] 📋 Active filters:', JSON.stringify(filtros, null, 2));
  console.log('[filterLocals v4.1] 📍 User location:', userLocation ? `${userLocation.lat.toFixed(2)}, ${userLocation.lng.toFixed(2)}` : 'null');
  
  // ✅ DEBUG: Log each filter type
  if (filtros.tipo) console.log('[filterLocals v4.1] 🏷️ Tipo filter:', filtros.tipo);
  if (filtros.servicios) console.log('[filterLocals v4.1] 🔧 Servicios filter:', filtros.servicios);
  if (filtros.ambiente) console.log('[filterLocals v4.1] ✨ Ambiente filter:', filtros.ambiente);
  if (filtros.clientela) console.log('[filterLocals v4.1] 👥 Clientela filter:', filtros.clientela);
  if (filtros.comunidad) console.log('[filterLocals v4.1] 📍 Comunidad filter:', filtros.comunidad);
  if (filtros.provincia) console.log('[filterLocals v4.1] 📍 Provincia filter:', filtros.provincia);
  if (filtros.distancia) console.log('[filterLocals v4.1] 📏 Distancia filter:', filtros.distancia, 'km');
  
  // ✅ OPTIMIZATION: Early return if no filters are active
  const hasFilters = !!(
    (filtros.tipo && filtros.tipo.length > 0) ||
    (filtros.servicios && filtros.servicios.length > 0) ||
    (filtros.ambiente && filtros.ambiente.length > 0) ||
    (filtros.clientela && filtros.clientela.length > 0) ||
    filtros.comunidad ||
    filtros.provincia ||
    filtros.distancia
  );

  if (!hasFilters) {
    console.log('[filterLocals v4.1] ⚡ No filters active, returning all', locales.length, 'locals');
    console.log('[filterLocals v4.1] 🔍 ========================================');
    return locales;
  }
  
  console.log('[filterLocals v4.1] ✅ Filters detected, proceeding with filtering...');

  let filtered = [...locales]; // Create a copy to avoid mutations

  // ✅ FILTER 1: TYPE (cafe, bar, restaurante, etc.)
  if (filtros.tipo && filtros.tipo.length > 0) {
    const beforeCount = filtered.length;
    const tipoSet = new Set(filtros.tipo.map(t => t.toLowerCase().trim()));
    
    console.log('[filterLocals v4.1] 🏷️ Filtering by tipo:', Array.from(tipoSet));
    
    filtered = filtered.filter(local => {
      const barliveTypes = local.barlive_types || [];
      const barliveType = local.barlive_type || '';
      
      const allTypes = [...barliveTypes, barliveType]
        .filter(t => t && typeof t === 'string' && t.trim())
        .map(t => t.toLowerCase().trim());
      
      // Check if any of the local's types match any of the filter types
      for (const localType of allTypes) {
        if (tipoSet.has(localType)) return true;
        
        // Fuzzy match for common variations
        if (tipoSet.has('cafe') && (localType.includes('cafe') || localType.includes('cafeteria'))) return true;
        if (tipoSet.has('cocteleria') && (localType.includes('coctel') || localType.includes('cocktail'))) return true;
        if (tipoSet.has('discoteca') && (localType.includes('discoteca') || localType.includes('nightclub') || localType.includes('club'))) return true;
      }
      
      return false;
    });
    
    console.log('[filterLocals v4.1] ✅ After tipo filter:', filtered.length, 'locals (removed', beforeCount - filtered.length, ')');
  }

  // ✅ FILTER 2: SERVICES (wifi, parking, terraza, etc.)
  if (filtros.servicios && filtros.servicios.length > 0) {
    const beforeCount = filtered.length;
    console.log('[filterLocals v4.1] 🔧 Filtering by servicios:', filtros.servicios);
    console.log('[filterLocals v4.1] 🔧 Using AND logic - local must have ALL selected services');
    
    filtered = filtered.filter(local => {
      if (!local.servicios_disponibles || typeof local.servicios_disponibles !== 'object') {
        return false;
      }
      
      // Local must have ALL selected services (AND logic)
      return filtros.servicios!.every(servicio => {
        return local.servicios_disponibles![servicio] === true;
      });
    });
    
    console.log('[filterLocals v4.1] ✅ After servicios filter:', filtered.length, 'locals (removed', beforeCount - filtered.length, ')');
  }

  // ✅ FILTER 3: AMBIENTE (tranquilo, animado, etc.)
  if (filtros.ambiente && filtros.ambiente.length > 0) {
    const beforeCount = filtered.length;
    console.log('[filterLocals v4.1] ✨ Filtering by ambiente:', filtros.ambiente);
    console.log('[filterLocals v4.1] ✨ Using OR logic - local must have at least ONE selected ambiente');
    
    filtered = filtered.filter(local => {
      if (!local.ambiente_completo || typeof local.ambiente_completo !== 'object') {
        return false;
      }
      
      // ✅ CRITICAL FIX v4.1: Check if local has at least ONE of the selected ambientes
      // Using OR logic: local matches if ANY selected ambiente is true
      const hasMatch = filtros.ambiente!.some(ambiente => {
        return local.ambiente_completo![ambiente] === true;
      });
      
      return hasMatch;
    });
    
    console.log('[filterLocals v4.1] ✅ After ambiente filter:', filtered.length, 'locals (removed', beforeCount - filtered.length, ')');
  }

  // ✅ FILTER 4: CLIENTELA (grupos, turistas, familias, etc.)
  if (filtros.clientela && filtros.clientela.length > 0) {
    const beforeCount = filtered.length;
    console.log('[filterLocals v4.1] 👥 ========================================');
    console.log('[filterLocals v4.1] 👥 CLIENTELA FILTER - Starting with', beforeCount, 'locals');
    console.log('[filterLocals v4.1] 👥 Looking for locals with ANY of:', filtros.clientela);
    console.log('[filterLocals v4.1] 👥 Using OR logic - local must have at least ONE selected clientela type');
    
    let matchCount = 0;
    let noDataCount = 0;
    let noMatchCount = 0;
    
    filtered = filtered.filter(local => {
      if (!local.clientela || typeof local.clientela !== 'object') {
        noDataCount++;
        return false;
      }
      
      // ✅ CRITICAL FIX v4.1: Check if local has at least ONE of the selected clientela types
      // Using OR logic: local matches if ANY selected clientela is true
      const hasMatch = filtros.clientela!.some(clientelaTipo => {
        const value = local.clientela![clientelaTipo];
        return value === true;
      });
      
      if (hasMatch) {
        matchCount++;
      } else {
        noMatchCount++;
      }
      
      return hasMatch;
    });
    
    console.log('[filterLocals v4.1] 👥 Results:');
    console.log('[filterLocals v4.1] 👥 - Matched:', matchCount, 'locals');
    console.log('[filterLocals v4.1] 👥 - No clientela data:', noDataCount, 'locals');
    console.log('[filterLocals v4.1] 👥 - No match:', noMatchCount, 'locals');
    console.log('[filterLocals v4.1] 👥 Final count:', filtered.length, 'locals');
    console.log('[filterLocals v4.1] 👥 ========================================');
  }

  // ✅ FILTER 5: COMUNIDAD
  if (filtros.comunidad && filtros.comunidad !== 'Todas las Comunidades') {
    const beforeCount = filtered.length;
    console.log('[filterLocals v4.1] 📍 Filtering by comunidad:', filtros.comunidad);
    
    filtered = filtered.filter(local => {
      return local.comunidad === filtros.comunidad;
    });
    
    console.log('[filterLocals v4.1] ✅ After comunidad filter:', filtered.length, 'locals (removed', beforeCount - filtered.length, ')');
  }

  // ✅ FILTER 6: PROVINCIA
  if (filtros.provincia) {
    const beforeCount = filtered.length;
    console.log('[filterLocals v4.1] 📍 Filtering by provincia:', filtros.provincia);
    
    filtered = filtered.filter(local => {
      return local.provincia === filtros.provincia;
    });
    
    console.log('[filterLocals v4.1] ✅ After provincia filter:', filtered.length, 'locals (removed', beforeCount - filtered.length, ')');
  }

  // ✅ FILTER 7: DISTANCE (radius in km)
  if (filtros.distancia && filtros.distancia > 0) {
    const beforeCount = filtered.length;
    console.log('[filterLocals v4.1] 📏 Filtering by distance:', filtros.distancia, 'km');
    
    if (userLocation) {
      filtered = filtered.filter(local => {
        // Try to get distance from local object first
        let distance = local.distancia ?? local.distance_km;
        
        // If no distance in object, calculate it
        if (distance === null || distance === undefined) {
          if (local.latitud && local.longitud) {
            distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              parseFloat(local.latitud as any),
              parseFloat(local.longitud as any)
            );
          } else {
            // No coordinates, keep the local (don't filter out)
            return true;
          }
        }
        
        return distance <= filtros.distancia!;
      });
      
      console.log('[filterLocals v4.1] ✅ After distance filter:', filtered.length, 'locals (removed', beforeCount - filtered.length, ')');
    } else {
      console.log('[filterLocals v4.1] ⚠️ Distance filter skipped - no user location available');
    }
  }

  const endTime = Date.now();
  const duration = endTime - startTime;
  const removedCount = locales.length - filtered.length;
  const removalPercentage = ((removedCount / locales.length) * 100).toFixed(1);
  
  console.log('[filterLocals v4.1] 🎯 ========================================');
  console.log('[filterLocals v4.1] 🎯 FINAL RESULT:');
  console.log('[filterLocals v4.1] 🎯 - Started with:', locales.length, 'locals');
  console.log('[filterLocals v4.1] 🎯 - Removed:', removedCount, 'locals (', removalPercentage, '%)');
  console.log('[filterLocals v4.1] 🎯 - Final count:', filtered.length, 'locals');
  console.log('[filterLocals v4.1] ⏱️ Filter duration:', duration, 'ms');
  console.log('[filterLocals v4.1] 🚀 Performance:', duration < 50 ? 'EXCELLENT ⚡' : duration < 150 ? 'GOOD ✅' : 'NEEDS OPTIMIZATION ⚠️');
  console.log('[filterLocals v4.1] 🎯 ========================================');
  
  return filtered;
}
