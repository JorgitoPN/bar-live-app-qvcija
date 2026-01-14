
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/utils/supabase';
import { Local } from '@/types';
import { Image } from 'react-native';

interface GlobalDataContextType {
  // Data
  locales: Local[];
  posts: any[];
  eventos: any[];
  ofertas: any[];
  
  // Loading states
  isInitialLoading: boolean;
  isRefreshing: boolean;
  hasLoadedOnce: boolean;
  
  // Actions
  refreshData: (silent?: boolean) => Promise<void>;
  updateLocal: (localId: string, updates: Partial<Local>) => void;
  updatePost: (postId: string, updates: Partial<any>) => void;
  
  // Timestamps
  lastUpdate: number;
}

const GlobalDataContext = createContext<GlobalDataContextType | undefined>(undefined);

const CACHE_KEYS = {
  LOCALES: 'global_cache_locales',
  POSTS: 'global_cache_posts',
  EVENTOS: 'global_cache_eventos',
  OFERTAS: 'global_cache_ofertas',
  TIMESTAMP: 'global_cache_timestamp',
};

// ✅ CRITICAL PERFORMANCE FIX v197.0: Optimized cache settings
const CACHE_DURATION = 30 * 60 * 1000;
const BACKGROUND_REFRESH_INTERVAL = 10 * 60 * 1000; // Increased to 10 minutes

// ✅ FIX v197.0: Further reduced cache size for better performance
const MAX_CACHE_ITEMS = {
  LOCALES: 150,  // Reduced from 200
  POSTS: 30,     // Reduced from 50
  EVENTOS: 20,   // Reduced from 30
  OFERTAS: 20,   // Reduced from 30
};

export function GlobalDataProvider({ children }: { children: ReactNode }) {
  const [locales, setLocales] = useState<Local[]>([]);
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
  
  // ✅ CRITICAL PERFORMANCE FIX v197.0: Track mount state to prevent memory leaks
  const isMountedRef = useRef(true);

  // ✅ CRITICAL PERFORMANCE FIX v197.0: Reduced image preloading to prevent memory issues
  const preloadImages = useCallback(async (posts: any[]) => {
    const imagesToPreload: string[] = [];
    
    // ✅ Only preload first 10 posts (reduced from 20)
    posts.slice(0, 10).forEach(post => {
      if (post.imagen && !preloadedImagesRef.current.has(post.imagen)) {
        imagesToPreload.push(post.imagen);
        preloadedImagesRef.current.add(post.imagen);
      }
      // ✅ Skip preloading multiple images per post
      if (post.autor?.avatar && !preloadedImagesRef.current.has(post.autor.avatar)) {
        imagesToPreload.push(post.autor.avatar);
        preloadedImagesRef.current.add(post.autor.avatar);
      }
    });
    
    // ✅ Limit total preloaded images to 15
    const limitedImages = imagesToPreload.slice(0, 15);
    
    if (limitedImages.length > 0 && isMountedRef.current) {
      console.log('[GlobalData v197.0] 🚀 Preloading', limitedImages.length, 'images...');
      
      Promise.allSettled(
        limitedImages.map(uri => Image.prefetch(uri))
      ).then(results => {
        if (isMountedRef.current) {
          const successCount = results.filter(r => r.status === 'fulfilled').length;
          console.log('[GlobalData v197.0] ✅ Preloaded', successCount, '/', limitedImages.length, 'images');
        }
      }).catch(() => {
        if (isMountedRef.current) {
          console.log('[GlobalData v197.0] ⚠️ Some images failed to preload');
        }
      });
    }
  }, []);

  // ✅ FIX v95.0: Sanitize data before caching to reduce size
  const sanitizeForCache = useCallback((data: any[], type: 'locales' | 'posts' | 'eventos' | 'ofertas'): any[] => {
    const maxItems = MAX_CACHE_ITEMS[type.toUpperCase() as keyof typeof MAX_CACHE_ITEMS];
    const limitedData = data.slice(0, maxItems);
    
    // Remove large fields that can be refetched
    return limitedData.map(item => {
      const sanitized = { ...item };
      
      // Remove large text fields for posts
      if (type === 'posts' && sanitized.contenido && sanitized.contenido.length > 500) {
        sanitized.contenido = sanitized.contenido.substring(0, 500) + '...';
      }
      
      // Limit gallery URLs
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
      console.log('[GlobalData v197.0] 📦 Loading from cache...');
      
      const [
        cachedLocales,
        cachedPosts,
        cachedEventos,
        cachedOfertas,
        cachedTimestamp,
      ] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEYS.LOCALES),
        AsyncStorage.getItem(CACHE_KEYS.POSTS),
        AsyncStorage.getItem(CACHE_KEYS.EVENTOS),
        AsyncStorage.getItem(CACHE_KEYS.OFERTAS),
        AsyncStorage.getItem(CACHE_KEYS.TIMESTAMP),
      ]);

      const timestamp = cachedTimestamp ? parseInt(cachedTimestamp, 10) : 0;
      let hasData = false;

      if (cachedLocales) {
        try {
          const parsedLocales = JSON.parse(cachedLocales);
          setLocales(parsedLocales);
          console.log('[GlobalData v197.0] ⚡ INSTANT locales from cache:', parsedLocales.length);
          hasData = true;
        } catch (parseError) {
          console.error('[GlobalData v197.0] Error parsing cached locales:', parseError);
          await AsyncStorage.removeItem(CACHE_KEYS.LOCALES);
        }
      }

      if (cachedPosts) {
        try {
          const parsedPosts = JSON.parse(cachedPosts);
          setPosts(parsedPosts);
          console.log('[GlobalData v197.0] ⚡ INSTANT posts from cache:', parsedPosts.length);
          preloadImages(parsedPosts);
          hasData = true;
        } catch (parseError) {
          console.error('[GlobalData v197.0] Error parsing cached posts:', parseError);
          await AsyncStorage.removeItem(CACHE_KEYS.POSTS);
        }
      }

      if (cachedEventos) {
        try {
          const parsedEventos = JSON.parse(cachedEventos);
          setEventos(parsedEventos);
          console.log('[GlobalData v197.0] ⚡ INSTANT eventos from cache:', parsedEventos.length);
          hasData = true;
        } catch (parseError) {
          console.error('[GlobalData v197.0] Error parsing cached eventos:', parseError);
          await AsyncStorage.removeItem(CACHE_KEYS.EVENTOS);
        }
      }

      if (cachedOfertas) {
        try {
          const parsedOfertas = JSON.parse(cachedOfertas);
          setOfertas(parsedOfertas);
          console.log('[GlobalData v197.0] ⚡ INSTANT ofertas from cache:', parsedOfertas.length);
          hasData = true;
        } catch (parseError) {
          console.error('[GlobalData v197.0] Error parsing cached ofertas:', parseError);
          await AsyncStorage.removeItem(CACHE_KEYS.OFERTAS);
        }
      }

      if (hasData) {
        setLastUpdate(timestamp);
        setHasLoadedOnce(true);
      }

      return hasData;
    } catch (error) {
      console.error('[GlobalData v197.0] Error loading from cache:', error);
      // Clear corrupted cache
      try {
        await AsyncStorage.multiRemove([
          CACHE_KEYS.LOCALES,
          CACHE_KEYS.POSTS,
          CACHE_KEYS.EVENTOS,
          CACHE_KEYS.OFERTAS,
          CACHE_KEYS.TIMESTAMP,
        ]);
        console.log('[GlobalData v95.0] 🧹 Cleared corrupted cache');
      } catch (clearError) {
        console.error('[GlobalData v197.0] Error clearing cache:', clearError);
      }
      return false;
    }
  }, [preloadImages]);

  const saveToCache = useCallback(async (data: {
    locales?: Local[];
    posts?: any[];
    eventos?: any[];
    ofertas?: any[];
  }) => {
    try {
      const timestamp = Date.now().toString();
      const promises: Promise<void>[] = [
        AsyncStorage.setItem(CACHE_KEYS.TIMESTAMP, timestamp),
      ];

      // ✅ FIX v95.0: Sanitize data before caching
      if (data.locales) {
        const sanitized = sanitizeForCache(data.locales, 'locales');
        promises.push(AsyncStorage.setItem(CACHE_KEYS.LOCALES, JSON.stringify(sanitized)));
        console.log('[GlobalData v197.0] 💾 Caching', sanitized.length, 'locales (limited from', data.locales.length, ')');
      }
      if (data.posts) {
        const sanitized = sanitizeForCache(data.posts, 'posts');
        promises.push(AsyncStorage.setItem(CACHE_KEYS.POSTS, JSON.stringify(sanitized)));
        console.log('[GlobalData v197.0] 💾 Caching', sanitized.length, 'posts (limited from', data.posts.length, ')');
      }
      if (data.eventos) {
        const sanitized = sanitizeForCache(data.eventos, 'eventos');
        promises.push(AsyncStorage.setItem(CACHE_KEYS.EVENTOS, JSON.stringify(sanitized)));
        console.log('[GlobalData v197.0] 💾 Caching', sanitized.length, 'eventos (limited from', data.eventos.length, ')');
      }
      if (data.ofertas) {
        const sanitized = sanitizeForCache(data.ofertas, 'ofertas');
        promises.push(AsyncStorage.setItem(CACHE_KEYS.OFERTAS, JSON.stringify(sanitized)));
        console.log('[GlobalData v197.0] 💾 Caching', sanitized.length, 'ofertas (limited from', data.ofertas.length, ')');
      }

      await Promise.all(promises);
      console.log('[GlobalData v197.0] ✅ Data saved to cache');
    } catch (error: any) {
      console.error('[GlobalData v197.0] Error saving to cache:', error.message);
      // If cache is full, clear it
      if (error.message?.includes('QuotaExceededError') || error.message?.includes('too big')) {
        console.log('[GlobalData v197.0] 🧹 Cache quota exceeded, clearing...');
        try {
          await AsyncStorage.multiRemove([
            CACHE_KEYS.LOCALES,
            CACHE_KEYS.POSTS,
            CACHE_KEYS.EVENTOS,
            CACHE_KEYS.OFERTAS,
          ]);
          console.log('[GlobalData v95.0] ✅ Cache cleared');
        } catch (clearError) {
          console.error('[GlobalData v197.0] Error clearing cache:', clearError);
        }
      }
    }
  }, [sanitizeForCache]);

  const transformarLocal = useCallback((local: any): Local => {
    const CATEGORIAS_EXCLUIDAS = ['terrazas', 'rooftops', 'lounge'];
    let categoriasLocal = local.barlive_types || [];
    if (categoriasLocal.length === 0 && local.barlive_type) {
      categoriasLocal = [local.barlive_type];
    }
    categoriasLocal = categoriasLocal.filter(
      (cat: string) => !CATEGORIAS_EXCLUIDAS.includes(cat.toLowerCase())
    );

    return {
      ...local,
      coordenadas: {
        lat: parseFloat(local.latitud),
        lng: parseFloat(local.longitud),
      },
      imagenes: local.galeria_urls || (local.imagen_url ? [local.imagen_url] : []),
      barlive_types: categoriasLocal,
    };
  }, []);

  const loadFromSupabase = useCallback(async () => {
    try {
      console.log('[GlobalData v197.0] 🌐 Loading from Supabase...');

      // ✅ CRITICAL PERFORMANCE FIX v197.0: Reduced query limits and optimized fields
      const [
        localesResult,
        postsResult,
        eventosResult,
        ofertasResult,
      ] = await Promise.all([
        supabase
          .from('locales')
          .select('id, nombre, tipo, direccion, provincia, latitud, longitud, imagen_url, destacado, horarios_completos, barlive_types, barlive_type, rating, google_rating, activo, comunidad')
          .eq('activo', true)
          .order('destacado', { ascending: false })
          .order('rating', { ascending: false })
          .limit(300), // ✅ Reduced from 500 to 300
        
        supabase
          .from('posts')
          .select(`
            id, autor_id, contenido, imagen, imagenes, likes, comentarios, created_at, tipo, local_id,
            autor:usuarios!posts_autor_id_fkey(nombre, avatar, username),
            local:locales!posts_local_id_fkey(nombre, imagen_url)
          `)
          .order('created_at', { ascending: false })
          .limit(50), // ✅ Reduced from 100 to 50
        
        supabase
          .from('eventos')
          .select('id, titulo, descripcion, fecha, fecha_fin, hora, hora_fin, imagen_url, precio, local_id, activo')
          .gte('fecha', new Date().toISOString())
          .order('fecha', { ascending: true })
          .limit(30), // ✅ Reduced from 50 to 30
        
        supabase
          .from('ofertas_trabajo')
          .select(`
            id, titulo, descripcion, tipo, salario, provincia, local_id, propietario_id, activo, created_at,
            local:locales(nombre),
            propietario:usuarios(nombre)
          `)
          .order('created_at', { ascending: false })
          .limit(30), // ✅ Reduced from 50 to 30
      ]);

      if (!localesResult.error && localesResult.data) {
        const transformedLocales = localesResult.data.map(transformarLocal);
        setLocales(transformedLocales);
        console.log('[GlobalData v197.0] ✅ Locales loaded:', transformedLocales.length);
      }

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
        console.log('[GlobalData v197.0] ✅ Posts loaded:', mappedPosts.length);
        preloadImages(mappedPosts);
      }

      if (!eventosResult.error && eventosResult.data) {
        setEventos(eventosResult.data);
        console.log('[GlobalData v197.0] ✅ Eventos loaded:', eventosResult.data.length);
      }

      if (!ofertasResult.error && ofertasResult.data) {
        setOfertas(ofertasResult.data);
        console.log('[GlobalData v197.0] ✅ Ofertas loaded:', ofertasResult.data.length);
      }

      await saveToCache({
        locales: localesResult.data ? localesResult.data.map(transformarLocal) : undefined,
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
      console.log('[GlobalData v197.0] ✅ All data loaded and cached');
    } catch (error) {
      console.error('[GlobalData v197.0] Error loading from Supabase:', error);
    }
  }, [transformarLocal, saveToCache, preloadImages]);

  const refreshData = useCallback(async (silent: boolean = false) => {
    if (isLoadingRef.current) {
      console.log('[GlobalData v197.0] Already loading, skipping...');
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

  const updateLocal = useCallback((localId: string, updates: Partial<Local>) => {
    setLocales(prev => prev.map(local =>
      local.id === localId ? { ...local, ...updates } : local
    ));
  }, []);

  const updatePost = useCallback((postId: string, updates: Partial<any>) => {
    setPosts(prev => prev.map(post =>
      post.id === postId ? { ...post, ...updates } : post
    ));
  }, []);

  useEffect(() => {
    const initialize = async () => {
      console.log('[GlobalData v197.0] 🚀 Initializing...');
      
      const hasCache = await loadFromCache();
      
      if (hasCache) {
        console.log('[GlobalData v197.0] ⚡⚡⚡ INSTANT START with cached data');
        setHasLoadedOnce(true);
        
        setTimeout(() => {
          console.log('[GlobalData v197.0] 🔄 Background refresh...');
          refreshData(true);
        }, 10);
      } else {
        console.log('[GlobalData v197.0] 📡 No cache, loading from Supabase...');
        await loadFromSupabase();
      }
    };

    initialize();

    backgroundRefreshTimer.current = setInterval(() => {
      console.log('[GlobalData v197.0] ⏰ Background refresh triggered');
      refreshData(true);
    }, BACKGROUND_REFRESH_INTERVAL);

    return () => {
      isMountedRef.current = false;
      if (backgroundRefreshTimer.current) {
        clearInterval(backgroundRefreshTimer.current);
      }
    };
  }, [loadFromCache, loadFromSupabase, refreshData]);

  useEffect(() => {
    console.log('[GlobalData v197.0] 📡 Setting up real-time subscriptions...');

    const localesChannel = supabase
      .channel('global-locales-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'locales',
        },
        () => {
          console.log('[GlobalData v197.0] 🔄 Locales changed, refreshing...');
          refreshData(true);
        }
      )
      .subscribe();

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
          console.log('[GlobalData v197.0] 🔄 Posts changed, refreshing...');
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
          console.log('[GlobalData v197.0] 🔄 Likes changed, refreshing posts...');
          refreshData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(localesChannel);
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(likesChannel);
    };
  }, [refreshData]);

  const value: GlobalDataContextType = React.useMemo(() => ({
    locales,
    posts,
    eventos,
    ofertas,
    isInitialLoading,
    isRefreshing,
    hasLoadedOnce,
    refreshData,
    updateLocal,
    updatePost,
    lastUpdate,
  }), [
    locales,
    posts,
    eventos,
    ofertas,
    isInitialLoading,
    isRefreshing,
    hasLoadedOnce,
    refreshData,
    updateLocal,
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
