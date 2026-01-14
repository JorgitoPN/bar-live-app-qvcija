
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/utils/supabase';
import { Local } from '@/types';
import { Image } from 'react-native';

interface GlobalDataContextType {
  // Data - ✅ STEP 3: Removed locales array (now loaded on-demand via RPC)
  posts: any[];
  eventos: any[];
  ofertas: any[];
  
  // Loading states
  isInitialLoading: boolean;
  isRefreshing: boolean;
  hasLoadedOnce: boolean;
  
  // Actions
  refreshData: (silent?: boolean) => Promise<void>;
  updatePost: (postId: string, updates: Partial<any>) => void;
  
  // Timestamps
  lastUpdate: number;
}

const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

const CACHE_KEYS = {
  // ✅ STEP 3: Removed LOCALES cache key - locales are now loaded on-demand
  POSTS: 'global_cache_posts',
  EVENTOS: 'global_cache_eventos',
  OFERTAS: 'global_cache_ofertas',
  TIMESTAMP: 'global_cache_timestamp',
};

const CACHE_DURATION = 30 * 60 * 1000;
const BACKGROUND_REFRESH_INTERVAL = 5 * 60 * 1000;

const MAX_CACHE_ITEMS = {
  POSTS: 50,
  EVENTOS: 30,
  OFERTAS: 30,
};

/**
 * ✅ GLOBAL DATA CONTEXT v178.0 - STEP 3: MEMORY CLEANUP
 * 
 * CRITICAL CHANGES v178.0:
 * - ✅ REMOVED: locales array (was storing 200,000+ items in memory)
 * - ✅ REMOVED: sortLocalesByPriority function (heavy client-side processing)
 * - ✅ REMOVED: calcularDistancia function (now done by Supabase)
 * - ✅ REMOVED: horarios processing (now done by Supabase)
 * - ✅ STATELESS: App no longer holds massive arrays in memory
 * - ✅ ON-DEMAND: Locales loaded via RPC when needed
 * 
 * WHAT REMAINS:
 * - Posts, Eventos, Ofertas (small datasets, <100 items each)
 * - Cache management for social feed
 * - Real-time subscriptions for posts/likes
 */

export function GlobalDataProvider({ children }: { children: ReactNode }) {
  // ✅ STEP 3: Removed locales state - no longer stored in memory
  const [posts, setPosts] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [ofertas, setOfertas] = useState<any[]>([]);
  
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);
  
  const isLoadingRef = useRef(false);
  const backgroundRefreshTimer = useRef<NodeJS.Timeout | null>(null);
  const preloadedImagesRef = useRef<Set<string>>(new Set());

  const preloadImages = useCallback(async (posts: any[]) => {
    const imagesToPreload: string[] = [];
    
    posts.slice(0, 20).forEach(post => {
      if (post.imagen && !preloadedImagesRef.current.has(post.imagen)) {
        imagesToPreload.push(post.imagen);
        preloadedImagesRef.current.add(post.imagen);
      }
      if (post.imagenes && Array.isArray(post.imagenes)) {
        post.imagenes.slice(0, 1).forEach((img: string) => {
          if (!preloadedImagesRef.current.has(img)) {
            imagesToPreload.push(img);
            preloadedImagesRef.current.add(img);
          }
        });
      }
      if (post.autor?.avatar && !preloadedImagesRef.current.has(post.autor.avatar)) {
        imagesToPreload.push(post.autor.avatar);
        preloadedImagesRef.current.add(post.autor.avatar);
      }
    });
    
    if (imagesToPreload.length > 0) {
      console.log('[GlobalData v178.0] 🚀 Preloading', imagesToPreload.length, 'images...');
      
      Promise.allSettled(
        imagesToPreload.map(uri => Image.prefetch(uri))
      ).then(results => {
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        console.log('[GlobalData v178.0] ✅ Preloaded', successCount, '/', imagesToPreload.length, 'images');
      }).catch(() => {
        console.log('[GlobalData v178.0] ⚠️ Some images failed to preload');
      });
    }
  }, []);

  const sanitizeForCache = useCallback((data: any[], type: 'posts' | 'eventos' | 'ofertas'): any[] => {
    const maxItems = MAX_CACHE_ITEMS[type.toUpperCase() as keyof typeof MAX_CACHE_ITEMS];
    const limitedData = data.slice(0, maxItems);
    
    return limitedData.map(item => {
      const sanitized = { ...item };
      
      if (type === 'posts' && sanitized.contenido && sanitized.contenido.length > 500) {
        sanitized.contenido = sanitized.contenido.substring(0, 500) + '...';
      }
      
      if (sanitized.galeria_urls && Array.isArray(sanitized.galeria_urls)) {
        sanitized.galeria_urls = sanitized.galeria_urls.slice(0, 3);
      }
      
      if (sanitized.imagenes && Array.isArray(sanitized.imagenes)) {
        sanitized.imagenes = sanitized.imagenes.slice(0, 3);
      }
      
      return sanitized;
    });
  }, []);

  const loadFromCache = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[GlobalData v178.0] 📦 Loading from cache...');
      
      const [
        cachedPosts,
        cachedEventos,
        cachedOfertas,
        cachedTimestamp,
      ] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEYS.POSTS),
        AsyncStorage.getItem(CACHE_KEYS.EVENTOS),
        AsyncStorage.getItem(CACHE_KEYS.OFERTAS),
        AsyncStorage.getItem(CACHE_KEYS.TIMESTAMP),
      ]);

      const timestamp = cachedTimestamp ? parseInt(cachedTimestamp, 10) : 0;
      let hasData = false;

      if (cachedPosts) {
        try {
          const parsedPosts = JSON.parse(cachedPosts);
          setPosts(parsedPosts);
          console.log('[GlobalData v178.0] ⚡ INSTANT posts from cache:', parsedPosts.length);
          preloadImages(parsedPosts);
          hasData = true;
        } catch (parseError) {
          console.error('[GlobalData v178.0] Error parsing cached posts:', parseError);
          await AsyncStorage.removeItem(CACHE_KEYS.POSTS);
        }
      }

      if (cachedEventos) {
        try {
          const parsedEventos = JSON.parse(cachedEventos);
          setEventos(parsedEventos);
          console.log('[GlobalData v178.0] ⚡ INSTANT eventos from cache:', parsedEventos.length);
          hasData = true;
        } catch (parseError) {
          console.error('[GlobalData v178.0] Error parsing cached eventos:', parseError);
          await AsyncStorage.removeItem(CACHE_KEYS.EVENTOS);
        }
      }

      if (cachedOfertas) {
        try {
          const parsedOfertas = JSON.parse(cachedOfertas);
          setOfertas(parsedOfertas);
          console.log('[GlobalData v178.0] ⚡ INSTANT ofertas from cache:', parsedOfertas.length);
          hasData = true;
        } catch (parseError) {
          console.error('[GlobalData v178.0] Error parsing cached ofertas:', parseError);
          await AsyncStorage.removeItem(CACHE_KEYS.OFERTAS);
        }
      }

      if (hasData) {
        setLastUpdate(timestamp);
        setHasLoadedOnce(true);
      }

      return hasData;
    } catch (error) {
      console.error('[GlobalData v178.0] Error loading from cache:', error);
      try {
        await AsyncStorage.multiRemove([
          CACHE_KEYS.POSTS,
          CACHE_KEYS.EVENTOS,
          CACHE_KEYS.OFERTAS,
          CACHE_KEYS.TIMESTAMP,
        ]);
        console.log('[GlobalData v178.0] 🧹 Cleared corrupted cache');
      } catch (clearError) {
        console.error('[GlobalData v178.0] Error clearing cache:', clearError);
      }
      return false;
    }
  }, [preloadImages]);

  const saveToCache = useCallback(async (data: {
    posts?: any[];
    eventos?: any[];
    ofertas?: any[];
  }) => {
    try {
      const timestamp = Date.now().toString();
      const promises: Promise<void>[] = [
        AsyncStorage.setItem(CACHE_KEYS.TIMESTAMP, timestamp),
      ];

      if (data.posts) {
        const sanitized = sanitizeForCache(data.posts, 'posts');
        promises.push(AsyncStorage.setItem(CACHE_KEYS.POSTS, JSON.stringify(sanitized)));
        console.log('[GlobalData v178.0] 💾 Caching', sanitized.length, 'posts');
      }
      if (data.eventos) {
        const sanitized = sanitizeForCache(data.eventos, 'eventos');
        promises.push(AsyncStorage.setItem(CACHE_KEYS.EVENTOS, JSON.stringify(sanitized)));
        console.log('[GlobalData v178.0] 💾 Caching', sanitized.length, 'eventos');
      }
      if (data.ofertas) {
        const sanitized = sanitizeForCache(data.ofertas, 'ofertas');
        promises.push(AsyncStorage.setItem(CACHE_KEYS.OFERTAS, JSON.stringify(sanitized)));
        console.log('[GlobalData v178.0] 💾 Caching', sanitized.length, 'ofertas');
      }

      await Promise.all(promises);
      console.log('[GlobalData v178.0] ✅ Data saved to cache');
    } catch (error: any) {
      console.error('[GlobalData v178.0] Error saving to cache:', error.message);
      if (error.message?.includes('QuotaExceededError') || error.message?.includes('too big')) {
        console.log('[GlobalData v178.0] 🧹 Cache quota exceeded, clearing...');
        try {
          await AsyncStorage.multiRemove([
            CACHE_KEYS.POSTS,
            CACHE_KEYS.EVENTOS,
            CACHE_KEYS.OFERTAS,
          ]);
          console.log('[GlobalData v178.0] ✅ Cache cleared');
        } catch (clearError) {
          console.error('[GlobalData v178.0] Error clearing cache:', clearError);
        }
      }
    }
  }, [sanitizeForCache]);

  const loadFromSupabase = useCallback(async () => {
    try {
      console.log('[GlobalData v178.0] 🌐 Loading from Supabase');
      console.log('[GlobalData v178.0] ℹ️ NOTE: Locales are now loaded on-demand via RPC');

      const [
        postsResult,
        eventosResult,
        ofertasResult,
      ] = await Promise.all([
        supabase
          .from('posts')
          .select(`
            *,
            autor:usuarios!posts_autor_id_fkey(nombre, avatar, username),
            local:locales!posts_local_id_fkey(nombre, imagen_url)
          `)
          .order('created_at', { ascending: false })
          .limit(100),
        
        supabase
          .from('eventos')
          .select('*')
          .gte('fecha', new Date().toISOString())
          .order('fecha', { ascending: true })
          .limit(50),
        
        supabase
          .from('ofertas_trabajo')
          .select(`
            *,
            local:locales(nombre),
            propietario:usuarios(nombre)
          `)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (!postsResult.error && postsResult.data) {
        const mappedPosts = postsResult.data.map(post => ({
          ...post,
          autor: post.tipo === 'local' && post.local 
            ? {
                nombre: post.local.nombre,
                avatar: post.local.imagen_url,
                username: post.local.nombre,
              }
            : post.autor,
        }));
        setPosts(mappedPosts);
        console.log('[GlobalData v178.0] ✅ Posts loaded:', mappedPosts.length);
        preloadImages(mappedPosts);
      }

      if (!eventosResult.error && eventosResult.data) {
        setEventos(eventosResult.data);
        console.log('[GlobalData v178.0] ✅ Eventos loaded:', eventosResult.data.length);
      }

      if (!ofertasResult.error && ofertasResult.data) {
        setOfertas(ofertasResult.data);
        console.log('[GlobalData v178.0] ✅ Ofertas loaded:', ofertasResult.data.length);
      }

      await saveToCache({
        posts: postsResult.data ? postsResult.data.map(post => ({
          ...post,
          autor: post.tipo === 'local' && post.local 
            ? {
                nombre: post.local.nombre,
                avatar: post.local.imagen_url,
                username: post.local.nombre,
              }
            : post.autor,
        })) : undefined,
        eventos: eventosResult.data || undefined,
        ofertas: ofertasResult.data || undefined,
      });

      setLastUpdate(Date.now());
      setHasLoadedOnce(true);
      console.log('[GlobalData v178.0] ✅ All data loaded and cached');
    } catch (error) {
      console.error('[GlobalData v178.0] Error loading from Supabase:', error);
    }
  }, [saveToCache, preloadImages]);

  const refreshData = useCallback(async (silent: boolean = false) => {
    if (isLoadingRef.current) {
      console.log('[GlobalData v178.0] Already loading, skipping...');
      return;
    }

    isLoadingRef.current = true;

    if (!silent) {
      setIsRefreshing(true);
    }

    try {
      await loadFromSupabase();
    } finally {
      if (!silent) {
        setIsRefreshing(false);
      }
      isLoadingRef.current = false;
    }
  }, [loadFromSupabase]);

  const updatePost = useCallback((postId: string, updates: Partial<any>) => {
    setPosts(prev => prev.map(post =>
      post.id === postId ? { ...post, ...updates } : post
    ));
  }, []);

  useEffect(() => {
    const initialize = async () => {
      console.log('[GlobalData v178.0] 🚀 Initializing...');
      console.log('[GlobalData v178.0] ℹ️ STEP 3: Locales are now loaded on-demand via RPC');
      
      const hasCache = await loadFromCache();
      
      if (hasCache) {
        console.log('[GlobalData v178.0] ⚡⚡⚡ INSTANT START with cached data');
        setHasLoadedOnce(true);
        
        setTimeout(() => {
          console.log('[GlobalData v178.0] 🔄 Background refresh...');
          refreshData(true);
        }, 10);
      } else {
        console.log('[GlobalData v178.0] 📡 No cache, loading from Supabase...');
        await loadFromSupabase();
      }
    };

    initialize();

    backgroundRefreshTimer.current = setInterval(() => {
      console.log('[GlobalData v178.0] ⏰ Background refresh triggered');
      refreshData(true);
    }, BACKGROUND_REFRESH_INTERVAL);

    return () => {
      if (backgroundRefreshTimer.current) {
        clearInterval(backgroundRefreshTimer.current);
      }
    };
  }, [loadFromCache, loadFromSupabase, refreshData]);

  useEffect(() => {
    console.log('[GlobalData v178.0] 📡 Setting up real-time subscriptions...');

    // ✅ STEP 3: Removed locales subscription - no longer needed
    // Locales are loaded on-demand via RPC

    const postsChannel = supabase
      .channel('global-posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
        },
        () => {
          console.log('[GlobalData v178.0] 🔄 Posts changed, refreshing...');
          refreshData(true);
        }
      )
      .subscribe();

    const likesChannel = supabase
      .channel('global-likes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
        },
        () => {
          console.log('[GlobalData v178.0] 🔄 Likes changed, refreshing posts...');
          refreshData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(likesChannel);
    };
  }, [refreshData]);

  const value: GlobalDataContextType = React.useMemo(() => ({
    // ✅ STEP 3: Removed locales from context
    posts,
    eventos,
    ofertas,
    isInitialLoading,
    isRefreshing,
    hasLoadedOnce,
    refreshData,
    updatePost,
    lastUpdate,
  }), [
    posts,
    eventos,
    ofertas,
    isInitialLoading,
    isRefreshing,
    hasLoadedOnce,
    refreshData,
    updatePost,
    lastUpdate,
  ]);

  return (
    <GlobalDataContext.Provider value={value}>
      {children}
    </GlobalDataContext.Provider>
  );
}

export function useGlobalData() {
  const context = useContext(GlobalDataContext);
  
  if (context === undefined) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }
  
  return context;
}
