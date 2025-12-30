
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

const CACHE_DURATION = 30 * 60 * 1000;
const BACKGROUND_REFRESH_INTERVAL = 5 * 60 * 1000;

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
      console.log('[GlobalData] 🚀 Preloading', imagesToPreload.length, 'images...');
      
      Promise.allSettled(
        imagesToPreload.map(uri => Image.prefetch(uri))
      ).then(results => {
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        console.log('[GlobalData] ✅ Preloaded', successCount, '/', imagesToPreload.length, 'images');
      }).catch(() => {
        console.log('[GlobalData] ⚠️ Some images failed to preload');
      });
    }
  }, []);

  const loadFromCache = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[GlobalData] 📦 Loading from cache...');
      
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
        const parsedLocales = JSON.parse(cachedLocales);
        setLocales(parsedLocales);
        console.log('[GlobalData] ⚡ INSTANT locales from cache:', parsedLocales.length);
        hasData = true;
      }

      if (cachedPosts) {
        const parsedPosts = JSON.parse(cachedPosts);
        setPosts(parsedPosts);
        console.log('[GlobalData] ⚡ INSTANT posts from cache:', parsedPosts.length);
        preloadImages(parsedPosts);
        hasData = true;
      }

      if (cachedEventos) {
        const parsedEventos = JSON.parse(cachedEventos);
        setEventos(parsedEventos);
        console.log('[GlobalData] ⚡ INSTANT eventos from cache:', parsedEventos.length);
        hasData = true;
      }

      if (cachedOfertas) {
        const parsedOfertas = JSON.parse(cachedOfertas);
        setOfertas(parsedOfertas);
        console.log('[GlobalData] ⚡ INSTANT ofertas from cache:', parsedOfertas.length);
        hasData = true;
      }

      if (hasData) {
        setLastUpdate(timestamp);
        setHasLoadedOnce(true);
      }

      return hasData;
    } catch (error) {
      console.error('[GlobalData] Error loading from cache:', error);
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

      if (data.locales) {
        promises.push(AsyncStorage.setItem(CACHE_KEYS.LOCALES, JSON.stringify(data.locales)));
      }
      if (data.posts) {
        promises.push(AsyncStorage.setItem(CACHE_KEYS.POSTS, JSON.stringify(data.posts)));
      }
      if (data.eventos) {
        promises.push(AsyncStorage.setItem(CACHE_KEYS.EVENTOS, JSON.stringify(data.eventos)));
      }
      if (data.ofertas) {
        promises.push(AsyncStorage.setItem(CACHE_KEYS.OFERTAS, JSON.stringify(data.ofertas)));
      }

      await Promise.all(promises);
      console.log('[GlobalData] 💾 Data saved to cache');
    } catch (error) {
      console.error('[GlobalData] Error saving to cache:', error);
    }
  }, []);

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
      console.log('[GlobalData] 🌐 Loading from Supabase...');

      const [
        localesResult,
        postsResult,
        eventosResult,
        ofertasResult,
      ] = await Promise.all([
        supabase
          .from('locales')
          .select('*')
          .eq('activo', true)
          .order('destacado', { ascending: false })
          .order('rating', { ascending: false }),
        
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

      if (!localesResult.error && localesResult.data) {
        const transformedLocales = localesResult.data.map(transformarLocal);
        setLocales(transformedLocales);
        console.log('[GlobalData] ✅ Locales loaded:', transformedLocales.length);
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
        console.log('[GlobalData] ✅ Posts loaded:', mappedPosts.length);
        preloadImages(mappedPosts);
      }

      if (!eventosResult.error && eventosResult.data) {
        setEventos(eventosResult.data);
        console.log('[GlobalData] ✅ Eventos loaded:', eventosResult.data.length);
      }

      if (!ofertasResult.error && ofertasResult.data) {
        setOfertas(ofertasResult.data);
        console.log('[GlobalData] ✅ Ofertas loaded:', ofertasResult.data.length);
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
      console.log('[GlobalData] ✅ All data loaded and cached');
    } catch (error) {
      console.error('[GlobalData] Error loading from Supabase:', error);
    }
  }, [transformarLocal, saveToCache, preloadImages]);

  const refreshData = useCallback(async (silent: boolean = false) => {
    if (isLoadingRef.current) {
      console.log('[GlobalData] Already loading, skipping...');
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
      console.log('[GlobalData] 🚀 Initializing...');
      
      const hasCache = await loadFromCache();
      
      if (hasCache) {
        console.log('[GlobalData] ⚡⚡⚡ INSTANT START with cached data');
        setHasLoadedOnce(true);
        
        setTimeout(() => {
          console.log('[GlobalData] 🔄 Background refresh...');
          refreshData(true);
        }, 10);
      } else {
        console.log('[GlobalData] 📡 No cache, loading from Supabase...');
        await loadFromSupabase();
      }
    };

    initialize();

    backgroundRefreshTimer.current = setInterval(() => {
      console.log('[GlobalData] ⏰ Background refresh triggered');
      refreshData(true);
    }, BACKGROUND_REFRESH_INTERVAL);

    return () => {
      if (backgroundRefreshTimer.current) {
        clearInterval(backgroundRefreshTimer.current);
      }
    };
  }, [loadFromCache, loadFromSupabase, refreshData]);

  useEffect(() => {
    console.log('[GlobalData] 📡 Setting up real-time subscriptions...');

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
          console.log('[GlobalData] 🔄 Locales changed, refreshing...');
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
          console.log('[GlobalData] 🔄 Posts changed, refreshing...');
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
          console.log('[GlobalData] 🔄 Likes changed, refreshing posts...');
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
