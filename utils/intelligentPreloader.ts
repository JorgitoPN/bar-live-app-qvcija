
/**
 * ✅ INTELLIGENT PRELOADER v1.0 - INSTAGRAM-LEVEL PREFETCHING
 * 
 * Sistema de precarga inteligente:
 * - Prefetch de los siguientes 5 elementos en listas
 * - Predicción de navegación basada en comportamiento
 * - Precarga de imágenes y datos
 * - Gestión de prioridades
 * - Cancelación de precargas innecesarias
 * 
 * OBJETIVO: Contenido listo ANTES de que el usuario lo necesite
 */

import { Image, Platform } from 'react-native';
import { supabase } from './supabase';
import { localesCache, postsCache, profilesCache } from './advancedCache';

interface PreloadTask {
  id: string;
  type: 'image' | 'data' | 'profile';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  url?: string;
  dataFetcher?: () => Promise<any>;
  timestamp: number;
}

/**
 * ✅ INTELLIGENT PRELOADER
 * Gestiona precarga inteligente de contenido
 */
class IntelligentPreloader {
  private preloadQueue: PreloadTask[] = [];
  private processing: boolean = false;
  private preloadedImages: Set<string> = new Set();
  private maxQueueSize: number = Platform.OS === 'android' ? 10 : 20;

  /**
   * ✅ PREFETCH IMAGES - Precargar imágenes
   */
  async prefetchImages(urls: string[], priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'): Promise<void> {
    const newUrls = urls.filter(url => !this.preloadedImages.has(url));
    
    if (newUrls.length === 0) return;

    console.log(`[IntelligentPreloader] 🖼️ Prefetching ${newUrls.length} images (${priority})`);

    newUrls.forEach(url => {
      const task: PreloadTask = {
        id: `image-${url}`,
        type: 'image',
        priority,
        url,
        timestamp: Date.now(),
      };

      this.addToQueue(task);
    });

    this.processQueue();
  }

  /**
   * ✅ PREFETCH NEXT ITEMS - Precargar siguientes elementos en lista
   */
  async prefetchNextItems(
    currentIndex: number,
    items: any[],
    itemType: 'local' | 'post' | 'event'
  ): Promise<void> {
    const PREFETCH_COUNT = 5;
    const startIndex = currentIndex + 1;
    const endIndex = Math.min(startIndex + PREFETCH_COUNT, items.length);
    
    const itemsToPrefetch = items.slice(startIndex, endIndex);
    
    if (itemsToPrefetch.length === 0) return;

    console.log(`[IntelligentPreloader] 📦 Prefetching ${itemsToPrefetch.length} ${itemType}s from index ${startIndex}`);

    // ✅ Precargar imágenes
    const imagesToPrefetch: string[] = [];
    
    itemsToPrefetch.forEach(item => {
      if (itemType === 'local') {
        if (item.imagen_url) imagesToPrefetch.push(item.imagen_url);
        if (item.galeria_urls && item.galeria_urls[0]) {
          imagesToPrefetch.push(item.galeria_urls[0]);
        }
      } else if (itemType === 'post') {
        if (item.imagenes && item.imagenes[0]) {
          imagesToPrefetch.push(item.imagenes[0]);
        }
        if (item.autor?.avatar) {
          imagesToPrefetch.push(item.autor.avatar);
        }
      } else if (itemType === 'event') {
        if (item.imagen_url) imagesToPrefetch.push(item.imagen_url);
      }
    });

    if (imagesToPrefetch.length > 0) {
      this.prefetchImages(imagesToPrefetch, 'MEDIUM');
    }

    // ✅ Precargar datos adicionales (reviews, eventos, etc.)
    if (itemType === 'local') {
      itemsToPrefetch.forEach(local => {
        this.prefetchLocalDetails(local.id);
      });
    }
  }

  /**
   * ✅ PREFETCH LOCAL DETAILS - Precargar detalles de local
   */
  private async prefetchLocalDetails(localId: string): Promise<void> {
    const cacheKey = `local-details-${localId}`;
    
    // ✅ Verificar si ya está en caché
    const cached = await localesCache.get(cacheKey);
    if (cached) return;

    const task: PreloadTask = {
      id: cacheKey,
      type: 'data',
      priority: 'LOW',
      dataFetcher: async () => {
        const { data, error } = await supabase
          .from('locales')
          .select('*')
          .eq('id', localId)
          .single();

        if (!error && data) {
          await localesCache.set(cacheKey, data);
          return data;
        }
        return null;
      },
      timestamp: Date.now(),
    };

    this.addToQueue(task);
    this.processQueue();
  }

  /**
   * ✅ PREFETCH PROFILE - Precargar perfil de usuario
   */
  async prefetchProfile(userId: string): Promise<void> {
    const cacheKey = `profile-${userId}`;
    
    const cached = await profilesCache.get(cacheKey);
    if (cached) return;

    console.log(`[IntelligentPreloader] 👤 Prefetching profile: ${userId}`);

    const task: PreloadTask = {
      id: cacheKey,
      type: 'profile',
      priority: 'MEDIUM',
      dataFetcher: async () => {
        const { data, error } = await supabase
          .from('usuarios')
          .select('id, nombre, username, avatar, bio')
          .eq('id', userId)
          .single();

        if (!error && data) {
          await profilesCache.set(cacheKey, data);
          
          // ✅ Precargar avatar
          if (data.avatar) {
            this.prefetchImages([data.avatar], 'LOW');
          }
          
          return data;
        }
        return null;
      },
      timestamp: Date.now(),
    };

    this.addToQueue(task);
    this.processQueue();
  }

  /**
   * ✅ Añadir tarea a la cola
   */
  private addToQueue(task: PreloadTask): void {
    // ✅ Evitar duplicados
    const existingIndex = this.preloadQueue.findIndex(t => t.id === task.id);
    if (existingIndex !== -1) {
      return;
    }

    // ✅ Añadir y ordenar por prioridad
    this.preloadQueue.push(task);
    this.preloadQueue.sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // ✅ Limitar tamaño de cola
    if (this.preloadQueue.length > this.maxQueueSize) {
      this.preloadQueue = this.preloadQueue.slice(0, this.maxQueueSize);
    }
  }

  /**
   * ✅ Procesar cola de precarga
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.preloadQueue.length === 0) return;

    this.processing = true;

    while (this.preloadQueue.length > 0) {
      const task = this.preloadQueue.shift();
      if (!task) break;

      try {
        if (task.type === 'image' && task.url) {
          await Image.prefetch(task.url);
          this.preloadedImages.add(task.url);
          console.log(`[IntelligentPreloader] ✅ Image prefetched: ${task.url.substring(0, 50)}...`);
        } else if (task.type === 'data' && task.dataFetcher) {
          await task.dataFetcher();
          console.log(`[IntelligentPreloader] ✅ Data prefetched: ${task.id}`);
        } else if (task.type === 'profile' && task.dataFetcher) {
          await task.dataFetcher();
          console.log(`[IntelligentPreloader] ✅ Profile prefetched: ${task.id}`);
        }
      } catch (error) {
        console.error(`[IntelligentPreloader] ❌ Prefetch failed: ${task.id}`, error);
      }

      // ✅ Pequeña pausa entre tareas para no bloquear UI
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    this.processing = false;
  }

  /**
   * ✅ Cancelar todas las precargas
   */
  cancelAll(): void {
    this.preloadQueue = [];
    console.log('[IntelligentPreloader] 🛑 All prefetch tasks cancelled');
  }

  /**
   * ✅ Obtener estadísticas
   */
  getStats(): {
    queueSize: number;
    preloadedImages: number;
    processing: boolean;
  } {
    return {
      queueSize: this.preloadQueue.length,
      preloadedImages: this.preloadedImages.size,
      processing: this.processing,
    };
  }

  /**
   * ✅ Limpiar caché de imágenes precargadas
   */
  clearPreloadedImages(): void {
    this.preloadedImages.clear();
    console.log('[IntelligentPreloader] 🧹 Preloaded images cache cleared');
  }
}

export const intelligentPreloader = new IntelligentPreloader();

/**
 * ✅ HOOK: useIntelligentPrefetch
 * Hook para usar prefetching en componentes de lista
 */
export function useIntelligentPrefetch(
  items: any[],
  itemType: 'local' | 'post' | 'event'
) {
  const lastPrefetchIndex = React.useRef(-1);

  const handleScroll = React.useCallback((visibleIndex: number) => {
    // ✅ Precargar solo si avanzamos en la lista
    if (visibleIndex > lastPrefetchIndex.current) {
      lastPrefetchIndex.current = visibleIndex;
      intelligentPreloader.prefetchNextItems(visibleIndex, items, itemType);
    }
  }, [items, itemType]);

  return { handleScroll };
}

// ✅ Necesario para React hooks
import React from 'react';
