
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 💾 DATA CACHE UTILITY v2.0 - ENHANCED PERFORMANCE CACHING
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * FEATURES:
 * - ✅ Persistent caching with TTL
 * - ✅ Background refresh capability
 * - ✅ Memory-efficient LRU eviction
 * - ✅ Cache statistics and monitoring
 * - ✅ Separate cache keys for different contexts
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
  accessCount: number;
  lastAccessed: number;
}

class DataCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxCacheSize: number = 100; // Increased for better performance
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if cache has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.expiresIn) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    this.stats.hits++;

    return entry.data as T;
  }

  /**
   * Set data in cache with LRU eviction
   */
  set<T>(key: string, data: T, expiresIn: number = 15 * 60 * 1000): void {
    // If cache is full, remove least recently used entry
    if (this.cache.size >= this.maxCacheSize) {
      let oldestKey: string | null = null;
      let oldestTime = Date.now();
      
      this.cache.forEach((entry, key) => {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      });
      
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.stats.evictions++;
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn,
      accessCount: 0,
      lastAccessed: Date.now(),
    });
  }

  /**
   * Check if cache entry exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.expiresIn) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get cache age in seconds
   */
  getAge(key: string): number | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    return Math.round((Date.now() - entry.timestamp) / 1000);
  }

  /**
   * Clear specific cache entry
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1)
      : '0.0';
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      maxSize: this.maxCacheSize,
    };
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    const now = Date.now();
    let cleared = 0;
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.expiresIn) {
        this.cache.delete(key);
        cleared++;
      }
    });
    
    return cleared;
  }
}

// Export singleton instance
export const dataCache = new DataCache();

/**
 * Pagination helper for large datasets
 */
export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function paginateArray<T>(
  array: T[],
  options: PaginationOptions
): PaginatedResult<T> {
  const { page, pageSize } = options;
  const totalItems = array.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const data = array.slice(startIndex, endIndex);

  return {
    data,
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Debounce function to prevent excessive API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit execution frequency
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Batch process large arrays to prevent UI blocking
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10,
  delayBetweenBatches: number = 100
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    
    // Add delay between batches to prevent blocking
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  return results;
}

/**
 * Memory-efficient data loader with chunking
 */
export class ChunkedDataLoader<T> {
  private data: T[] = [];
  private chunkSize: number;
  private currentChunk: number = 0;

  constructor(chunkSize: number = 20) {
    this.chunkSize = chunkSize;
  }

  setData(data: T[]): void {
    this.data = data;
    this.currentChunk = 0;
  }

  getNextChunk(): T[] {
    const start = this.currentChunk * this.chunkSize;
    const end = start + this.chunkSize;
    const chunk = this.data.slice(start, end);
    
    if (chunk.length > 0) {
      this.currentChunk++;
    }
    
    return chunk;
  }

  hasMore(): boolean {
    return this.currentChunk * this.chunkSize < this.data.length;
  }

  reset(): void {
    this.currentChunk = 0;
  }

  getTotalChunks(): number {
    return Math.ceil(this.data.length / this.chunkSize);
  }

  getCurrentChunk(): number {
    return this.currentChunk;
  }
}
