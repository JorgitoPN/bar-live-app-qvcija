
/**
 * Utility functions for filtering and sorting locals
 */

import { Local, Filtros, LocalCategory } from '@/types';
import { getEstadoLocal } from './timeUtils';
import { addPubCategoryIfNeeded } from './categorizeLocal';

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calcularDistancia(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get opening status badge for sorting (uses new comprehensive logic)
 */
export function getEstadoBadge(
  horarios_completos: Record<string, string[]> | null,
  estado_actual: string | null,
  estado_negocio?: string
): string {
  const local = { 
    horarios_completos, 
    estado_actual,
    estado_negocio 
  };
  
  const estado = getEstadoLocal(local);
  return estado.badge;
}

/**
 * Determine if a local belongs to GROUP 1 (open/relevant) or GROUP 2 (closed/no info)
 * GROUP 1: Abierto ahora, Abierto 24h, Cierra pronto, Abre pronto
 * GROUP 2: Cerrado ahora, Sin información, Cerrado temporalmente, Cerrado permanentemente
 */
function esGrupoAbierto(badge: string): boolean {
  const grupoAbierto = [
    'Abierto ahora',
    'Abierto 24h',
    'Cierra pronto',
    'Abre pronto'
  ];
  
  return grupoAbierto.includes(badge);
}

/**
 * Get sort priority within GROUP 1 (open/relevant locals)
 * Priority 4: "Abierto ahora" / "Abierto 24h" / "Cierra pronto"
 * Priority 3: "Abre pronto"
 */
function getPrioridadEstadoGrupo1(badge: string): number {
  if (badge === 'Abierto ahora' || badge === 'Abierto 24h' || badge === 'Cierra pronto') {
    return 4;
  }
  if (badge === 'Abre pronto') {
    return 3;
  }
  return 0;
}

/**
 * Check if a local is featured (destacado)
 */
function esDestacado(local: Local, activePromotions: Set<string>): boolean {
  // Admin destacado tiene prioridad
  if (local.destacado === true) return true;
  if (local.destacado === false) return false;

  // Si no está definido por admin, verificar promociones activas
  return activePromotions.has(local.id);
}

/**
 * ✅ FIXED: Check if local matches category filter with proper PUB category support
 * Now correctly handles all category fields and dynamically adds PUB category
 */
function matchesCategory(local: Local, categorias: string[]): boolean {
  if (!categorias || categorias.length === 0) return true;
  
  // Collect all categories from the local
  let localCategories: string[] = [];
  
  // 1. Add barlive_types if exists (array)
  if (local.barlive_types && Array.isArray(local.barlive_types)) {
    localCategories.push(...local.barlive_types);
  }
  
  // 2. Add barlive_type if exists (string)
  if (local.barlive_type && typeof local.barlive_type === 'string') {
    localCategories.push(local.barlive_type);
  }
  
  // 3. Add tipo if exists (legacy field - string)
  if (local.tipo && typeof local.tipo === 'string') {
    localCategories.push(local.tipo);
  }
  
  // Remove duplicates
  localCategories = Array.from(new Set(localCategories));
  
  // ✅ CRITICAL FIX: Add PUB category dynamically if venue closes after 2:30 AM
  // Convert to LocalCategory[] for addPubCategoryIfNeeded
  const categoriesAsLocalCategory = localCategories as LocalCategory[];
  const categoriesWithPub = addPubCategoryIfNeeded(categoriesAsLocalCategory, local.horarios_completos);
  
  // Debug logging for PUB category
  if (categorias.includes('pub')) {
    console.log(`[matchesCategory] 🍺 Checking ${local.nombre}:`, {
      originalCategories: localCategories,
      withPubAdded: categoriesWithPub,
      closingTimes: local.horarios_completos,
      searchingFor: categorias,
    });
  }
  
  // Check if any category matches (case-insensitive)
  const hasMatch = categorias.some(categoria => 
    categoriesWithPub.some(localCat => 
      localCat.toLowerCase() === categoria.toLowerCase()
    )
  );
  
  if (categorias.includes('pub')) {
    console.log(`[matchesCategory] 🍺 ${local.nombre} matches pub filter: ${hasMatch}`);
  }
  
  return hasMatch;
}

/**
 * Filter and sort locals based on criteria
 * 
 * ORDEN CORRECTO (SIMPLIFICADO):
 * 1. DIVIDIR EN 2 GRUPOS:
 *    - GRUPO 1 (Prioridad Alta): Abierto ahora, Abierto 24h, Cierra pronto, Abre pronto
 *    - GRUPO 2 (Prioridad Baja): Cerrado ahora, Sin información, Cerrado temporalmente
 * 
 * 2. ORDENAR DENTRO DE CADA GRUPO:
 *    GRUPO 1:
 *      a) Por estado específico (Abierto ahora > Abre pronto)
 *      b) Por destacado (destacados primero)
 *      c) Por distancia (más cerca primero)
 *    
 *    GRUPO 2:
 *      a) Por destacado (destacados primero)
 *      b) Por distancia (más cerca primero)
 * 
 * 3. GRUPO 1 siempre antes que GRUPO 2
 */
export function filterAndSortLocals(
  locals: Local[],
  filtros: Filtros,
  userLocation: { lat: number; lng: number } | null,
  activePromotions: Set<string> = new Set()
): Local[] {
  console.log('🔍 [SORTING] ========================================');
  console.log('🔍 [SORTING] Iniciando filtrado y ordenamiento...');
  console.log('🔍 [SORTING] Total locales recibidos:', locals.length);
  console.log('🔍 [SORTING] Filtros:', filtros);
  console.log('🔍 [SORTING] User location:', userLocation);
  console.log('🔍 [SORTING] Active promotions:', activePromotions.size);

  // PASO 1: Filtrar locales cerrados permanentemente
  let filteredLocals = locals.filter((local) => {
    // ❌ NO mostrar locales cerrados permanentemente
    if (local.estado_negocio === 'CLOSED_PERMANENTLY') {
      console.log('❌ [SORTING] Rechazado (cerrado permanentemente):', local.nombre);
      return false;
    }
    return true;
  });

  console.log(`✅ [SORTING] Locales después de filtrar cerrados permanentemente: ${filteredLocals.length}`);

  // PASO 2: Filtrar por criterios
  filteredLocals = filteredLocals.filter((local) => {
    // Filtro por tipo (ahora soporta múltiples categorías y PUB dinámico)
    if (filtros.tipo && filtros.tipo.length > 0) {
      const hasMatchingType = matchesCategory(local, filtros.tipo);
      if (!hasMatchingType) {
        console.log('❌ [SORTING] Rechazado por categoría:', local.nombre, 'Categorías del local:', {
          barlive_types: local.barlive_types,
          barlive_type: local.barlive_type,
          tipo: local.tipo,
        });
        return false;
      }
    }

    // Filtro por provincia
    if (filtros.provincia && local.provincia !== filtros.provincia) {
      return false;
    }

    // Filtro por comunidad
    if (filtros.comunidad && local.comunidad !== filtros.comunidad) {
      return false;
    }

    // Filtro por búsqueda
    if (filtros.busqueda) {
      const searchTerm = filtros.busqueda.toLowerCase();
      const matchesSearch =
        local.nombre.toLowerCase().includes(searchTerm) ||
        local.direccion?.toLowerCase().includes(searchTerm) ||
        local.descripcion?.toLowerCase().includes(searchTerm);
      if (!matchesSearch) return false;
    }

    return true;
  });

  console.log(`✅ [SORTING] Locales después de filtrar: ${filteredLocals.length}`);

  // PASO 3: Calcular distancia desde usuario
  filteredLocals = filteredLocals.map((local) => {
    if (userLocation && local.coordenadas) {
      const distancia = calcularDistancia(
        userLocation.lat,
        userLocation.lng,
        local.coordenadas.lat,
        local.coordenadas.lng
      );
      return { ...local, distancia };
    }
    return { ...local, distancia: null };
  });

  // PASO 4: Determinar si está destacado
  filteredLocals = filteredLocals.map((local) => ({
    ...local,
    esDestacado: esDestacado(local, activePromotions),
  }));

  // PASO 5: Calcular estado actual (abierto/cerrado) usando la nueva lógica completa
  filteredLocals = filteredLocals.map((local) => {
    const estado = getEstadoLocal(local);
    return {
      ...local,
      estadoBadge: estado.badge,
      estadoCompleto: estado,
    };
  });

  // Filtro por distancia (después de calcular)
  if (filtros.distancia && userLocation) {
    filteredLocals = filteredLocals.filter(
      (local) => local.distancia !== null && local.distancia <= filtros.distancia!
    );
  }

  console.log(`✅ [SORTING] Locales después de calcular distancia y estado: ${filteredLocals.length}`);

  // PASO 6: DIVIDIR EN 2 GRUPOS
  const grupo1: Local[] = []; // Abiertos/Relevantes
  const grupo2: Local[] = []; // Cerrados/Sin info

  filteredLocals.forEach((local) => {
    const badge = local.estadoBadge || 'Sin información de horario';
    if (esGrupoAbierto(badge)) {
      grupo1.push(local);
    } else {
      grupo2.push(local);
    }
  });

  console.log('📊 [SORTING] ========================================');
  console.log('📊 [SORTING] División en grupos:');
  console.log('📊 [SORTING] GRUPO 1 (Abiertos/Relevantes):', grupo1.length);
  console.log('📊 [SORTING] GRUPO 2 (Cerrados/Sin info):', grupo2.length);
  console.log('📊 [SORTING] ========================================');

  // Log detallado de GRUPO 1
  if (grupo1.length > 0) {
    console.log('🟢 [SORTING] GRUPO 1 - Primeros 5 locales:');
    grupo1.slice(0, 5).forEach((local, i) => {
      console.log(`  ${i + 1}. ${local.nombre}`);
      console.log(`     Estado: ${local.estadoBadge}`);
      console.log(`     Destacado: ${local.esDestacado ? '⭐ SÍ' : '⬜ NO'}`);
      console.log(`     Distancia: ${local.distancia ? `${local.distancia} km` : 'N/A'}`);
    });
  }

  // Log detallado de GRUPO 2
  if (grupo2.length > 0) {
    console.log('🔴 [SORTING] GRUPO 2 - Primeros 5 locales:');
    grupo2.slice(0, 5).forEach((local, i) => {
      console.log(`  ${i + 1}. ${local.nombre}`);
      console.log(`     Estado: ${local.estadoBadge}`);
      console.log(`     Destacado: ${local.esDestacado ? '⭐ SÍ' : '⬜ NO'}`);
      console.log(`     Distancia: ${local.distancia ? `${local.distancia} km` : 'N/A'}`);
    });
  }

  // PASO 7: ORDENAR GRUPO 1 (Abiertos/Relevantes)
  // Orden: Estado específico → Destacado → Distancia
  grupo1.sort((a, b) => {
    const estadoA = a.estadoBadge || 'Sin información de horario';
    const estadoB = b.estadoBadge || 'Sin información de horario';

    // 7.1. Por estado específico (Abierto ahora > Abre pronto)
    const prioridadA = getPrioridadEstadoGrupo1(estadoA);
    const prioridadB = getPrioridadEstadoGrupo1(estadoB);

    if (prioridadA !== prioridadB) {
      return prioridadB - prioridadA; // Mayor prioridad primero
    }

    // 7.2. Por destacado
    if (a.esDestacado !== b.esDestacado) {
      return a.esDestacado ? -1 : 1; // Destacados primero
    }

    // 7.3. Por distancia
    if (a.distancia !== null && b.distancia !== null) {
      return a.distancia - b.distancia; // Más cerca primero
    }

    // Si uno tiene distancia y otro no
    if (a.distancia !== null) return -1; // Con distancia primero
    if (b.distancia !== null) return 1;

    return 0;
  });

  // PASO 8: ORDENAR GRUPO 2 (Cerrados/Sin info)
  // Orden: Destacado → Distancia
  grupo2.sort((a, b) => {
    // 8.1. Por destacado
    if (a.esDestacado !== b.esDestacado) {
      return a.esDestacado ? -1 : 1; // Destacados primero
    }

    // 8.2. Por distancia
    if (a.distancia !== null && b.distancia !== null) {
      return a.distancia - b.distancia; // Más cerca primero
    }

    // Si uno tiene distancia y otro no
    if (a.distancia !== null) return -1; // Con distancia primero
    if (b.distancia !== null) return 1;

    return 0;
  });

  // PASO 9: COMBINAR GRUPOS (GRUPO 1 primero, luego GRUPO 2)
  const sortedLocals = [...grupo1, ...grupo2];

  console.log('✅ [SORTING] ========================================');
  console.log('✅ [SORTING] RESULTADO FINAL - Locales ordenados:', sortedLocals.length);
  console.log('✅ [SORTING] ========================================');
  console.log('📋 [SORTING] PRIMEROS 15 LOCALES EN LA LISTA:');
  sortedLocals.slice(0, 15).forEach((local, index) => {
    const grupo = esGrupoAbierto(local.estadoBadge || '') ? 'GRUPO 1 🟢' : 'GRUPO 2 🔴';
    console.log(`  #${index + 1} [${grupo}] ${local.nombre}`);
    console.log(`      Estado: ${local.estadoBadge}`);
    console.log(`      Destacado: ${local.esDestacado ? '⭐ SÍ' : '⬜ NO'}`);
    console.log(`      Distancia: ${local.distancia ? `${local.distancia} km` : 'N/A'}`);
  });
  console.log('✅ [SORTING] ========================================');

  return sortedLocals;
}
