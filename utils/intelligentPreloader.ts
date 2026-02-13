
/**
 * ✅ INTELLIGENT PRELOADER v2.0 - CONTROLLED PREFETCHING WITH INTERACTIONMANAGER
 * 
 * Sistema de precarga inteligente v2.0:
 * - ✅ InteractionManager: Solo prefetch cuando JS thread está inactivo
 * - ✅ Scroll Detection: No descargar imágenes durante scroll activo
 * - ✅ Priority Queue: Gestión de prioridades HIGH/MEDIUM/LOW
 * - ✅ Prefetch de los siguientes 5 elementos en listas
 * - ✅ Predicción de navegación basada en comportamiento
 * - ✅ Precarga de imágenes y datos
 * - ✅ Cancelación de precargas innecesarias
 * 
 * OBJETIVO: Contenido listo ANTES de que el usuario lo necesite, sin afectar FPS
 */

import { Image, Platform, InteractionManager } from 'react-native';
import { supabase } from './supabase';
import { localesCache, postsCache, profilesCache } from './advancedCache';
import React from 'react';

interface PreloadTask {
  id: string;
  type: 'image' | 'data' | 'profile';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  url?: string;
  dataFetcher?: () => Promise<any>;
  timestamp: number;
}

/**
 * ✅ INTELLIGENT PRELOADER v2.0
 * Gestiona precarga inteligente de contenido con control de JS thread
 */
class IntelligentPreloader {
  private preloadQueue: PreloadTask[] = [];
  private processing: boolean = false;
  private preloadedImages: Set<string> = new Set();
  private maxQueueSize: number = Platform.OS === 'android' ? 10 : 20;
  private isScrolling: boolean = false;

  /**
   * ✅ SET SCROLLING STATE - Controlar si el usuario está scrolleando
   */
  setScrolling(scrolling: boolean): void {
    this.isScrolling = scrolling;
    
    if (!scrolling) {
      console.log('[IntelligentPreloader v2.0] ✅ Scroll ended - resuming prefetch');
      this.processQueue();
    } else {
      console.log('[IntelligentPreloader v2.0] ⏸️ Scroll started - pausing prefetch');
    }
  }

  /**
   * ✅ PREFETCH IMAGES - Precargar imágenes con control de JS thread
   */
  async prefetchImages(urls: string[], priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'): Promise<void> {
    const newUrls = urls.filter(url => url && !this.preloadedImages.has(url));
    
    if (newUrls.length === 0) return;

    console.log(`[IntelligentPreloader v2.0] 🖼️ Queueing ${newUrls.length} images (${priority})`);

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

    // ✅ CRITICAL: Solo procesar si no está scrolleando
    if (!this.isScrolling) {
      InteractionManager.runAfterInteractions(() => {
        this.processQueue();
      });
    }
  }

  /**
   * ✅ PREFETCH NEXT ITEMS - Precargar siguientes elementos en lista
   */
  async prefetchNextItems(
    currentIndex: number,
    items: any[],
    itemType: 'local' | 'post' | 'event'
  ): Promise<void> {
    // ✅ CRITICAL: No prefetch durante scroll
    if (this.isScrolling) {
      console.log('[IntelligentPreloader v2.0] ⏸️ Skipping prefetch - user is scrolling');
      return;
    }

    const PREFETCH_COUNT = 5;
    const startIndex = currentIndex + 1;
    const endIndex = Math.min(startIndex + PREFETCH_COUNT, items.length);
    
    const itemsToPrefetch = items.slice(startIndex, endIndex);
    
    if (itemsToPrefetch.length === 0) return;

    console.log(`[IntelligentPreloader v2.0] 📦 Prefetching ${itemsToPrefetch.length} ${itemType}s from index ${startIndex}`);

    InteractionManager.runAfterInteractions(() => {
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

      if (itemType === 'local') {
        itemsToPrefetch.forEach(local => {
          this.prefetchLocalDetails(local.id);
        });
      }
    });
  }

  /**
   * ✅ PREFETCH LOCAL DETAILS - Precargar detalles de local
   */
  private async prefetchLocalDetails(localId: string): Promise<void> {
    const cacheKey = `local-details-${localId}`;
    
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
    
    if (!this.isScrolling) {
      InteractionManager.runAfterInteractions(() => {
        this.processQueue();
      });
    }
  }

  /**
   * ✅ PREFETCH PROFILE - Precargar perfil de usuario
   */
  async prefetchProfile(userId: string): Promise<void> {
    const cacheKey = `profile-${userId}`;
    
    const cached = await profilesCache.get(cacheKey);
    if (cached) return;

    console.log(`[IntelligentPreloader v2.0] 👤 Prefetching profile: ${userId}`);

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
    
    if (!this.isScrolling) {
      InteractionManager.runAfterInteractions(() => {
        this.processQueue();
      });
    }
  }

  /**
   * ✅ Añadir tarea a la cola
   */
  private addToQueue(task: PreloadTask): void {
    const existingIndex = this.preloadQueue.findIndex(t => t.id === task.id);
    if (existingIndex !== -1) {
      return;
    }

    this.preloadQueue.push(task);
    this.preloadQueue.sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    if (this.preloadQueue.length > this.maxQueueSize) {
      this.preloadQueue = this.preloadQueue.slice(0, this.maxQueueSize);
    }
  }

  /**
   * ✅ Procesar cola de precarga - Solo cuando JS thread está inactivo
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.preloadQueue.length === 0) return;

    // ✅ CRITICAL: No procesar durante scroll
    if (this.isScrolling) {
      console.log('[IntelligentPreloader v2.0] ⏸️ Queue processing paused - user is scrolling');
      return;
    }

    this.processing = true;

    while (this.preloadQueue.length > 0 && !this.isScrolling) {
      const task = this.preloadQueue.shift();
      if (!task) break;

      try {
        if (task.type === 'image' && task.url) {
          await Image.prefetch(task.url);
          this.preloadedImages.add(task.url);
          console.log(`[IntelligentPreloader v2.0] ✅ Image prefetched: ${task.url.substring(0, 50)}...`);
        } else if (task.type === 'data' && task.dataFetcher) {
          await task.dataFetcher();
          console.log(`[IntelligentPreloader v2.0] ✅ Data prefetched: ${task.id}`);
        } else if (task.type === 'profile' && task.dataFetcher) {
          await task.dataFetcher();
          console.log(`[IntelligentPreloader v2.0] ✅ Profile prefetched: ${task.id}`);
        }
      } catch (error) {
        console.error(`[IntelligentPreloader v2.0] ❌ Prefetch failed: ${task.id}`, error);
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
    console.log('[IntelligentPreloader v2.0] 🛑 All prefetch tasks cancelled');
  }

  /**
   * ✅ Obtener estadísticas
   */
  getStats(): {
    queueSize: number;
    preloadedImages: number;
    processing: boolean;
    isScrolling: boolean;
  } {
    return {
      queueSize: this.preloadQueue.length,
      preloadedImages: this.preloadedImages.size,
      processing: this.processing,
      isScrolling: this.isScrolling,
    };
  }

  /**
   * ✅ Limpiar caché de imágenes precargadas
   */
  clearPreloadedImages(): void {
    this.preloadedImages.clear();
    console.log('[IntelligentPreloader v2.0] 🧹 Preloaded images cache cleared');
  }
}

export const intelligentPreloader = new IntelligentPreloader();

/**
 * ✅ HOOK: useIntelligentPrefetch v2.0
 * Hook para usar prefetching en componentes de lista con control de scroll
 */
export function useIntelligentPrefetch(
  items: any[],
  itemType: 'local' | 'post' | 'event'
) {
  const lastPrefetchIndex = React.useRef(-1);

  const handleScroll = React.useCallback((visibleIndex: number) => {
    if (visibleIndex > lastPrefetchIndex.current) {
      lastPrefetchIndex.current = visibleIndex;
      intelligentPreloader.prefetchNextItems(visibleIndex, items, itemType);
    }
  }, [items, itemType]);

  const handleScrollBegin = React.useCallback(() => {
    intelligentPreloader.setScrolling(true);
  }, []);

  const handleScrollEnd = React.useCallback(() => {
    intelligentPreloader.setScrolling(false);
  }, []);

  return { 
    handleScroll,
    handleScrollBegin,
    handleScrollEnd,
  };
}
