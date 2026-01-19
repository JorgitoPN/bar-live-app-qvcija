
/**
 * 🚀 MAP CACHE v2.0 - CACHE DE SESIÓN EN RAM
 * 
 * ⚡ OPTIMIZACIÓN: Cache en memoria RAM (no AsyncStorage)
 * - Mantiene Set de IDs de locales descargados en la sesión actual
 * - Evita re-descargas al volver a zonas visitadas
 * - Se limpia automáticamente al cerrar la app
 * - Tiempo de acceso: O(1) con Set
 * 
 * USO:
 * - sessionCache.add(localId) - Añadir local al cache
 * - sessionCache.has(localId) - Verificar si está en cache
 * - sessionCache.size - Número de locales en cache
 * - sessionCache.clear() - Limpiar cache (al cambiar categoría)
 */

// ⚡ Cache de sesión en RAM (Set para O(1) lookup)
class SessionCache {
  private cache: Set<string>;
  private stats: {
    hits: number;
    misses: number;
    totalRequests: number;
  };

  constructor() {
    this.cache = new Set<string>();
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
    };
    console.log('💾 [SessionCache] Inicializado');
  }

  /**
   * Añadir local al cache
   */
  add(localId: string): void {
    if (!this.cache.has(localId)) {
      this.cache.add(localId);
      console.log(`💾 [SessionCache] ➕ Añadido: ${localId} (Total: ${this.cache.size})`);
    }
  }

  /**
   * Verificar si local está en cache
   */
  has(localId: string): boolean {
    this.stats.totalRequests++;
    const exists = this.cache.has(localId);
    
    if (exists) {
      this.stats.hits++;
      console.log(`💾 [SessionCache] ✅ HIT: ${localId}`);
    } else {
      this.stats.misses++;
      console.log(`💾 [SessionCache] ❌ MISS: ${localId}`);
    }
    
    return exists;
  }

  /**
   * Añadir múltiples locales
   */
  addBatch(localIds: string[]): { new: number; existing: number } {
    let newCount = 0;
    let existingCount = 0;
    
    localIds.forEach(id => {
      if (!this.cache.has(id)) {
        this.cache.add(id);
        newCount++;
      } else {
        existingCount++;
      }
    });
    
    console.log(`💾 [SessionCache] Batch añadido: ${newCount} nuevos | ${existingCount} ya existían | Total: ${this.cache.size}`);
    
    return { new: newCount, existing: existingCount };
  }

  /**
   * Limpiar cache (al cambiar categoría o filtros)
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
    };
    console.log(`💾 [SessionCache] 🧹 Cache limpiado (${size} locales eliminados)`);
  }

  /**
   * Obtener tamaño del cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Obtener estadísticas
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    totalRequests: number;
    hitRate: number;
  } {
    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.hits / this.stats.totalRequests) * 100 
      : 0;
    
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      totalRequests: this.stats.totalRequests,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Imprimir estadísticas en consola
   */
  printStats(): void {
    const stats = this.getStats();
    console.log('📊 [SessionCache] Estadísticas:');
    console.log(`   Tamaño: ${stats.size} locales`);
    console.log(`   Hits: ${stats.hits} (${stats.hitRate}%)`);
    console.log(`   Misses: ${stats.misses}`);
    console.log(`   Total requests: ${stats.totalRequests}`);
  }

  /**
   * Verificar si un área ya está cubierta por el cache
   * (Opcional - para optimización futura)
   */
  hasArea(localIds: string[]): boolean {
    return localIds.every(id => this.cache.has(id));
  }
}

// Exportar instancia singleton
export const sessionCache = new SessionCache();

// Exportar clase para testing
export { SessionCache };

/**
 * EJEMPLO DE USO:
 * 
 * import { sessionCache } from '@/utils/mapCache';
 * 
 * // Al cargar locales
 * const { data } = await supabase.rpc('get_locales_in_bbox', {...});
 * const result = sessionCache.addBatch(data.map(l => l.id));
 * console.log(`Nuevos: ${result.new} | Ya en cache: ${result.existing}`);
 * 
 * // Al cambiar categoría
 * sessionCache.clear();
 * 
 * // Ver estadísticas
 * sessionCache.printStats();
 */
