
/**
 * ✅ ADVANCED CACHE SYSTEM v1.0 - INSTAGRAM-LEVEL CACHING
 * 
 * Sistema de caché persistente multi-nivel:
 * - Caché en memoria (Map) - Acceso instantáneo
 * - Caché en AsyncStorage - Persistencia entre sesiones
 * - Estrategia LRU (Least Recently Used)
 * - Prefetching inteligente
 * - Invalidación automática
 * 
 * OBJETIVO: Mostrar contenido guardado al instante (< 50ms)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
}

interface CacheConfig {
  maxAge: number; // Tiempo máximo en caché (ms)
  maxSize: number; // Número máximo de entradas
  persistToDisk: boolean; // Guardar en AsyncStorage
}

const DEFAULT_CONFIG: CacheConfig = {
  maxAge: 30 * 60 * 1000, // 30 minutos
  maxSize: Platform.OS === 'android' ? 50 : 100,
  persistToDisk: true,
};

/**
 * ✅ ADVANCED CACHE MANAGER
 * Gestiona caché en memoria y disco con estrategia LRU
 */
class AdvancedCacheManager<T = any> {
  private memoryCache: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;
  private cacheKey: string;

  constructor(cacheKey: string, config: Partial<CacheConfig> = {}) {
    this.cacheKey = cacheKey;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromDisk();
  }

  /**
   * ✅ INSTANT GET - Obtener dato de caché (< 5ms)
   */
  async get(key: string): Promise<T | null> {
    const startTime = Date.now();

    // ✅ PASO 1: Buscar en memoria (instantáneo)
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      const age = Date.now() - memoryEntry.timestamp;
      
      if (age < this.config.maxAge) {
        // ✅ Actualizar estadísticas de acceso
        memoryEntry.accessCount++;
        memoryEntry.lastAccess = Date.now();
        
        const duration = Date.now() - startTime;
        console.log(`[AdvancedCache] ⚡ INSTANT memory hit: ${key} (${duration}ms)`);
        
        return memoryEntry.data;
      } else {
        // ✅ Entrada expirada
        this.memoryCache.delete(key);
      }
    }

    // ✅ PASO 2: Buscar en disco (si está habilitado)
    if (this.config.persistToDisk) {
      try {
        const diskKey = `${this.cacheKey}:${key}`;
        const stored = await AsyncStorage.getItem(diskKey);
        
        if (stored) {
          const entry: CacheEntry<T> = JSON.parse(stored);
          const age = Date.now() - entry.timestamp;
          
          if (age < this.config.maxAge) {
            // ✅ Restaurar a memoria
            entry.accessCount++;
            entry.lastAccess = Date.now();
            this.memoryCache.set(key, entry);
            
            const duration = Date.now() - startTime;
            console.log(`[AdvancedCache] 💾 Disk hit: ${key} (${duration}ms)`);
            
            return entry.data;
          } else {
            // ✅ Entrada expirada
            await AsyncStorage.removeItem(diskKey);
          }
        }
      } catch (error) {
        console.error('[AdvancedCache] Error reading from disk:', error);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[AdvancedCache] ❌ Cache miss: ${key} (${duration}ms)`);
    
    return null;
  }

  /**
   * ✅ INSTANT SET - Guardar dato en caché (< 10ms)
   */
  async set(key: string, data: T): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccess: Date.now(),
    };

    // ✅ PASO 1: Guardar en memoria (instantáneo)
    this.memoryCache.set(key, entry);

    // ✅ PASO 2: Aplicar estrategia LRU si excede tamaño
    if (this.memoryCache.size > this.config.maxSize) {
      this.evictLRU();
    }

    // ✅ PASO 3: Guardar en disco (en segundo plano)
    if (this.config.persistToDisk) {
      requestAnimationFrame(() => {
        this.saveToDisk(key, entry);
      });
    }

    console.log(`[AdvancedCache] 💾 Cached: ${key}`);
  }

  /**
   * ✅ Eliminar entrada menos usada (LRU)
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Date.now();

    this.memoryCache.forEach((entry, key) => {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      console.log(`[AdvancedCache] 🗑️ Evicted LRU: ${oldestKey}`);
    }
  }

  /**
   * ✅ Guardar en disco (AsyncStorage)
   */
  private async saveToDisk(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      const diskKey = `${this.cacheKey}:${key}`;
      await AsyncStorage.setItem(diskKey, JSON.stringify(entry));
    } catch (error) {
      console.error('[AdvancedCache] Error saving to disk:', error);
    }
  }

  /**
   * ✅ Cargar caché desde disco al iniciar
   */
  private async loadFromDisk(): Promise<void> {
    if (!this.config.persistToDisk) return;

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(k => k.startsWith(`${this.cacheKey}:`));

      const entries = await AsyncStorage.multiGet(cacheKeys);

      entries.forEach(([diskKey, value]) => {
        if (value) {
          try {
            const entry: CacheEntry<T> = JSON.parse(value);
            const age = Date.now() - entry.timestamp;

            if (age < this.config.maxAge) {
              const key = diskKey.replace(`${this.cacheKey}:`, '');
              this.memoryCache.set(key, entry);
            } else {
              AsyncStorage.removeItem(diskKey);
            }
          } catch (parseError) {
            AsyncStorage.removeItem(diskKey);
          }
        }
      });

      console.log(`[AdvancedCache] 📦 Loaded ${this.memoryCache.size} entries from disk`);
    } catch (error) {
      console.error('[AdvancedCache] Error loading from disk:', error);
    }
  }

  /**
   * ✅ Invalidar entrada específica
   */
  async invalidate(key: string): Promise<void> {
    this.memoryCache.delete(key);
    
    if (this.config.persistToDisk) {
      const diskKey = `${this.cacheKey}:${key}`;
      await AsyncStorage.removeItem(diskKey);
    }

    console.log(`[AdvancedCache] 🗑️ Invalidated: ${key}`);
  }

  /**
   * ✅ Limpiar todo el caché
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();

    if (this.config.persistToDisk) {
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const cacheKeys = allKeys.filter(k => k.startsWith(`${this.cacheKey}:`));
        await AsyncStorage.multiRemove(cacheKeys);
      } catch (error) {
        console.error('[AdvancedCache] Error clearing disk cache:', error);
      }
    }

    console.log('[AdvancedCache] 🧹 Cache cleared');
  }

  /**
   * ✅ Obtener estadísticas de caché
   */
  getStats(): {
    size: number;
    hitRate: number;
    avgAccessCount: number;
  } {
    const entries = Array.from(this.memoryCache.values());
    const totalAccess = entries.reduce((sum, e) => sum + e.accessCount, 0);
    const avgAccessCount = entries.length > 0 ? totalAccess / entries.length : 0;

    return {
      size: this.memoryCache.size,
      hitRate: 0, // TODO: Implementar tracking de hits/misses
      avgAccessCount,
    };
  }
}

/**
 * ✅ CACHE INSTANCES - Pre-configurados para diferentes tipos de datos
 */
export const localesCache = new AdvancedCacheManager<any>('locales_cache', {
  maxAge: 30 * 60 * 1000, // 30 minutos
  maxSize: Platform.OS === 'android' ? 50 : 100,
  persistToDisk: true,
});

export const postsCache = new AdvancedCacheManager<any>('posts_cache', {
  maxAge: 15 * 60 * 1000, // 15 minutos
  maxSize: Platform.OS === 'android' ? 30 : 50,
  persistToDisk: true,
});

export const profilesCache = new AdvancedCacheManager<any>('profiles_cache', {
  maxAge: 60 * 60 * 1000, // 1 hora
  maxSize: Platform.OS === 'android' ? 20 : 50,
  persistToDisk: true,
});

export const eventsCache = new AdvancedCacheManager<any>('events_cache', {
  maxAge: 60 * 60 * 1000, // 1 hora
  maxSize: Platform.OS === 'android' ? 20 : 30,
  persistToDisk: true,
});

/**
 * ✅ HELPER: Wrapper para fetch con caché automático
 */
export async function fetchWithCache<T>(
  cacheKey: string,
  fetchFunction: () => Promise<T>,
  cache: AdvancedCacheManager<T> = new AdvancedCacheManager('default_cache')
): Promise<T> {
  // ✅ PASO 1: Intentar obtener de caché
  const cached = await cache.get(cacheKey);
  if (cached !== null) {
    console.log(`[AdvancedCache] ⚡ Using cached data for: ${cacheKey}`);
    
    // ✅ Refrescar en segundo plano
    requestAnimationFrame(() => {
      fetchFunction().then(freshData => {
        cache.set(cacheKey, freshData);
      }).catch(() => {});
    });
    
    return cached;
  }

  // ✅ PASO 2: Fetch y guardar en caché
  console.log(`[AdvancedCache] 🌐 Fetching fresh data for: ${cacheKey}`);
  const freshData = await fetchFunction();
  await cache.set(cacheKey, freshData);
  
  return freshData;
}
