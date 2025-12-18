
/**
 * Debug utility for featured locals sorting
 * 
 * This utility helps diagnose issues with featured locals sorting
 * by providing detailed information about each local's properties
 * and the sorting logic applied.
 */

import { supabase } from './supabase';

interface LocalDebugInfo {
  id: string;
  nombre: string;
  destacado: boolean;
  latitud: number | null;
  longitud: number | null;
  distancia?: number;
  rating: number | null;
  google_rating: number | null;
  popularidad: number | null;
  sortCategory: 'destacado_cerca' | 'destacado_lejos' | 'no_destacado';
  sortOrder: number;
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
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
 * Debug featured locals sorting
 * 
 * @param userLat User's latitude
 * @param userLon User's longitude
 * @returns Array of locals with debug information
 */
export async function debugFeaturedLocals(
  userLat: number,
  userLon: number
): Promise<LocalDebugInfo[]> {
  console.log('[DebugFeaturedLocals] 🔍 Starting debug...');
  console.log('[DebugFeaturedLocals] 📍 User location:', { lat: userLat, lon: userLon });

  // Load all active locals
  const { data: locales, error } = await supabase
    .from('locales')
    .select('id, nombre, destacado, latitud, longitud, rating, google_rating, popularidad')
    .eq('activo', true)
    .limit(200);

  if (error) {
    console.error('[DebugFeaturedLocals] ❌ Error loading locals:', error);
    throw error;
  }

  console.log('[DebugFeaturedLocals] ✅ Loaded', locales?.length || 0, 'locals');

  // Calculate distances and categorize
  const localesWithDebugInfo: LocalDebugInfo[] = (locales || []).map(local => {
    let distancia: number | undefined;
    
    if (local.latitud && local.longitud) {
      distancia = calcularDistancia(
        userLat,
        userLon,
        parseFloat(local.latitud.toString()),
        parseFloat(local.longitud.toString())
      );
    }

    let sortCategory: 'destacado_cerca' | 'destacado_lejos' | 'no_destacado';
    
    if (local.destacado) {
      if (distancia !== undefined && distancia <= 20) {
        sortCategory = 'destacado_cerca';
      } else {
        sortCategory = 'destacado_lejos';
      }
    } else {
      sortCategory = 'no_destacado';
    }

    return {
      id: local.id,
      nombre: local.nombre,
      destacado: local.destacado,
      latitud: local.latitud,
      longitud: local.longitud,
      distancia,
      rating: local.rating,
      google_rating: local.google_rating,
      popularidad: local.popularidad,
      sortCategory,
      sortOrder: 0, // Will be set after sorting
    };
  });

  // Separate by category
  const destacadosCerca = localesWithDebugInfo.filter(l => l.sortCategory === 'destacado_cerca');
  const destacadosLejos = localesWithDebugInfo.filter(l => l.sortCategory === 'destacado_lejos');
  const noDestacados = localesWithDebugInfo.filter(l => l.sortCategory === 'no_destacado');

  console.log('[DebugFeaturedLocals] 📊 Categories:');
  console.log('  - Destacados ≤20km:', destacadosCerca.length);
  console.log('  - Destacados >20km:', destacadosLejos.length);
  console.log('  - No destacados:', noDestacados.length);

  // Sort destacados cerca by relevance (rating, then popularity)
  destacadosCerca.sort((a, b) => {
    const ratingA = parseFloat((a.rating || a.google_rating || 0).toString());
    const ratingB = parseFloat((b.rating || b.google_rating || 0).toString());
    const popularidadA = a.popularidad || 0;
    const popularidadB = b.popularidad || 0;
    
    if (ratingB !== ratingA) {
      return ratingB - ratingA;
    }
    return popularidadB - popularidadA;
  });

  // Sort destacados lejos by distance
  destacadosLejos.sort((a, b) => {
    const distA = a.distancia !== undefined ? a.distancia : 999;
    const distB = b.distancia !== undefined ? b.distancia : 999;
    return distA - distB;
  });

  // Sort no destacados by distance
  noDestacados.sort((a, b) => {
    const distA = a.distancia !== undefined ? a.distancia : 999;
    const distB = b.distancia !== undefined ? b.distancia : 999;
    return distA - distB;
  });

  // Combine and set sort order
  const sortedLocales = [...destacadosCerca, ...destacadosLejos, ...noDestacados];
  sortedLocales.forEach((local, index) => {
    local.sortOrder = index + 1;
  });

  // Log top 20 locals
  console.log('[DebugFeaturedLocals] 🔝 Top 20 locals:');
  sortedLocales.slice(0, 20).forEach((local, index) => {
    console.log(`  ${index + 1}. ${local.nombre}`);
    console.log(`     - Destacado: ${local.destacado}`);
    console.log(`     - Distancia: ${local.distancia?.toFixed(1) || 'N/A'} km`);
    console.log(`     - Rating: ${local.rating || local.google_rating || 'N/A'}`);
    console.log(`     - Popularidad: ${local.popularidad || 'N/A'}`);
    console.log(`     - Categoría: ${local.sortCategory}`);
    console.log('');
  });

  // Check for "Casa Paco"
  const casaPaco = sortedLocales.find(l => l.nombre.toLowerCase().includes('casa paco'));
  if (casaPaco) {
    console.log('[DebugFeaturedLocals] 🔍 Found "Casa Paco":');
    console.log('  - Position:', casaPaco.sortOrder);
    console.log('  - Destacado:', casaPaco.destacado);
    console.log('  - Distancia:', casaPaco.distancia?.toFixed(1) || 'N/A', 'km');
    console.log('  - Rating:', casaPaco.rating || casaPaco.google_rating || 'N/A');
    console.log('  - Categoría:', casaPaco.sortCategory);
    console.log('');
    console.log('  ⚠️ Expected position: Should be in "destacado_lejos" category if >20km');
    console.log('  ⚠️ Expected position: Should NOT be first if >500km');
  }

  return sortedLocales;
}

/**
 * Check if a specific local is correctly sorted
 */
export async function checkLocalSorting(
  localName: string,
  userLat: number,
  userLon: number
): Promise<void> {
  const sortedLocales = await debugFeaturedLocals(userLat, userLon);
  
  const local = sortedLocales.find(l => 
    l.nombre.toLowerCase().includes(localName.toLowerCase())
  );

  if (!local) {
    console.log(`[DebugFeaturedLocals] ❌ Local "${localName}" not found`);
    return;
  }

  console.log(`[DebugFeaturedLocals] ✅ Found "${local.nombre}":`);
  console.log('  - Position:', local.sortOrder, 'of', sortedLocales.length);
  console.log('  - Destacado:', local.destacado);
  console.log('  - Distancia:', local.distancia?.toFixed(1) || 'N/A', 'km');
  console.log('  - Rating:', local.rating || local.google_rating || 'N/A');
  console.log('  - Popularidad:', local.popularidad || 'N/A');
  console.log('  - Categoría:', local.sortCategory);
  console.log('');

  // Validation
  if (local.destacado && local.distancia && local.distancia > 20) {
    console.log('  ✅ Correctly categorized as "destacado_lejos"');
    
    // Check if it's first
    if (local.sortOrder === 1) {
      console.log('  ⚠️ WARNING: This local is first in the list!');
      console.log('  ⚠️ This should only happen if:');
      console.log('     1. There are no destacados ≤20km');
      console.log('     2. This is the closest destacado >20km');
      
      const destacadosCerca = sortedLocales.filter(l => l.sortCategory === 'destacado_cerca');
      console.log('  - Destacados ≤20km:', destacadosCerca.length);
      
      if (destacadosCerca.length > 0) {
        console.log('  ❌ ERROR: There are destacados ≤20km, but this local is first!');
      }
    }
  }

  if (local.destacado && local.distancia && local.distancia > 500) {
    console.log('  ⚠️ WARNING: This local is >500km away!');
    console.log('  ⚠️ It should appear AFTER all closer destacados');
    
    const closerDestacados = sortedLocales.filter(l => 
      l.destacado && 
      l.distancia !== undefined && 
      l.distancia < local.distancia! &&
      l.sortOrder > local.sortOrder
    );
    
    if (closerDestacados.length > 0) {
      console.log('  ❌ ERROR: There are', closerDestacados.length, 'closer destacados that appear AFTER this one!');
      console.log('  Closer destacados that should appear first:');
      closerDestacados.slice(0, 5).forEach(l => {
        console.log(`    - ${l.nombre} (${l.distancia?.toFixed(1)}km) at position ${l.sortOrder}`);
      });
    }
  }
}

/**
 * Export debug report to console
 */
export async function exportDebugReport(
  userLat: number,
  userLon: number
): Promise<string> {
  const sortedLocales = await debugFeaturedLocals(userLat, userLon);
  
  const report = {
    timestamp: new Date().toISOString(),
    userLocation: { lat: userLat, lon: userLon },
    totalLocals: sortedLocales.length,
    categories: {
      destacadosCerca: sortedLocales.filter(l => l.sortCategory === 'destacado_cerca').length,
      destacadosLejos: sortedLocales.filter(l => l.sortCategory === 'destacado_lejos').length,
      noDestacados: sortedLocales.filter(l => l.sortCategory === 'no_destacado').length,
    },
    top20: sortedLocales.slice(0, 20).map(l => ({
      position: l.sortOrder,
      nombre: l.nombre,
      destacado: l.destacado,
      distancia: l.distancia?.toFixed(1),
      rating: l.rating || l.google_rating,
      category: l.sortCategory,
    })),
  };

  const reportJson = JSON.stringify(report, null, 2);
  console.log('[DebugFeaturedLocals] 📄 Debug Report:');
  console.log(reportJson);
  
  return reportJson;
}
