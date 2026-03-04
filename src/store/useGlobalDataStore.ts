
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/utils/supabase';
import { Local } from '@/types';
import { Platform } from 'react-native';

/**
 * ✅ GLOBAL DATA STORE v1.0 - ZUSTAND ATOMIC STATE MANAGEMENT
 * 
 * BENEFITS:
 * - ✅ ATOMIC UPDATES: Only components using specific data re-render
 * - ✅ LAZY LOADING: Data loads only when needed
 * - ✅ SMART CACHING: Aggressive cache limits for instant reads
 * - ✅ NO PROVIDER: Direct import and use
 * 
 * EXAMPLE:
 * // Only re-renders when locales change
 * const locales = useGlobalDataStore(state => state.locales);
 * const loadDataOnDemand = useGlobalDataStore(state => state.loadDataOnDemand);
 */

const CACHE_KEYS = {
  LOCALES: 'global_cache_locales_v2',
  POSTS: 'global_cache_posts',
  EVENTOS: 'global_cache_eventos',
  OFERTAS: 'global_cache_ofertas',
  TIMESTAMP: 'global_cache_timestamp',
};

const CACHE_DURATION = 30 * 60 * 1000;

const MAX_CACHE_ITEMS = {
  LOCALES: Platform.OS === 'android' ? 15 : 50,
  POSTS: Platform.OS === 'android' ? 6 : 20,
  EVENTOS: Platform.OS === 'android' ? 5 : 15,
  OFERTAS: Platform.OS === 'android' ? 5 : 15,
};

// ✅ FASE 6: Circuit Breaker State
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

interface GlobalDataState {
  // State
  locales: Local[];
  posts: any[];
  eventos: any[];
  ofertas: any[];
  isInitialLoading: boolean;
  isRefreshing: boolean;
  hasLoadedOnce: boolean;
  lastUpdate: number;
  
  // ✅ FASE 6: Circuit Breaker State
  circuitBreaker: CircuitBreakerState;
  
  // Actions
  setLocales: (locales: Local[]) => void;
  setPosts: (posts: any[]) => void;
  setEventos: (eventos: any[]) => void;
  setOfertas: (ofertas: any[]) => void;
  refreshData: (silent?: boolean) => Promise<void>;
  loadDataOnDemand: (dataType: 'locales' | 'posts' | 'eventos' | 'ofertas') => Promise<void>;
  updateLocal: (localId: string, updates: Partial<Local>) => void;
  updatePost: (postId: string, updates: Partial<any>) => void;
  loadLocalesInBounds: (bounds: { north: number; south: number; east: number; west: number }) => Promise<Local[]>;
  initialize: () => Promise<void>;
  
  // ✅ FASE 6: Circuit Breaker Actions
  recordFailure: () => void;
  recordSuccess: () => void;
  resetCircuitBreaker: () => void;
}

const transformarLocal = (local: any): Local => {
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
};

// ✅ FASE 6: Circuit Breaker Constants
const CIRCUIT_BREAKER_THRESHOLD = 3; // Fallos consecutivos antes de abrir
const CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 segundos antes de intentar de nuevo
const CIRCUIT_BREAKER_RESET_TIME = 60000; // 1 minuto para resetear contador

export const useGlobalDataStore = create<GlobalDataState>((set, get) => ({
  // Initial state
  locales: [],
  posts: [],
  eventos: [],
  ofertas: [],
  isInitialLoading: false,
  isRefreshing: false,
  hasLoadedOnce: false,
  lastUpdate: 0,
  
  // ✅ FASE 6: Circuit Breaker Initial State
  circuitBreaker: {
    failures: 0,
    lastFailureTime: 0,
    isOpen: false,
  },
  
  // Simple setters
  setLocales: (locales) => set({ locales }),
  setPosts: (posts) => set({ posts }),
  setEventos: (eventos) => set({ eventos }),
  setOfertas: (ofertas) => set({ ofertas }),
  
  // Update single local
  updateLocal: (localId, updates) => {
    const { locales } = get();
    const updatedLocales = locales.map(local =>
      local.id === localId ? { ...local, ...updates } : local
    );
    set({ locales: updatedLocales });
  },
  
  // Update single post
  updatePost: (postId, updates) => {
    const { posts } = get();
    const updatedPosts = posts.map(post =>
      post.id === postId ? { ...post, ...updates } : post
    );
    set({ posts: updatedPosts });
  },
  
  // ✅ FASE 6: Circuit Breaker Actions
  recordFailure: () => {
    const { circuitBreaker } = get();
    const now = Date.now();
    
    // Reset contador si ha pasado suficiente tiempo
    if (now - circuitBreaker.lastFailureTime > CIRCUIT_BREAKER_RESET_TIME) {
      set({
        circuitBreaker: {
          failures: 1,
          lastFailureTime: now,
          isOpen: false,
        },
      });
      console.log('[GlobalDataStore FASE 6] 🔄 Circuit Breaker: Primer fallo después de reset');
      return;
    }
    
    const newFailures = circuitBreaker.failures + 1;
    const shouldOpen = newFailures >= CIRCUIT_BREAKER_THRESHOLD;
    
    set({
      circuitBreaker: {
        failures: newFailures,
        lastFailureTime: now,
        isOpen: shouldOpen,
      },
    });
    
    if (shouldOpen) {
      console.error('[GlobalDataStore FASE 6] 🚨 Circuit Breaker ABIERTO:', newFailures, 'fallos consecutivos');
    } else {
      console.warn('[GlobalDataStore FASE 6] ⚠️ Circuit Breaker:', newFailures, 'fallos');
    }
  },
  
  recordSuccess: () => {
    const { circuitBreaker } = get();
    
    if (circuitBreaker.failures > 0 || circuitBreaker.isOpen) {
      console.log('[GlobalDataStore FASE 6] ✅ Circuit Breaker: Éxito - reseteando contador');
      set({
        circuitBreaker: {
          failures: 0,
          lastFailureTime: 0,
          isOpen: false,
        },
      });
    }
  },
  
  resetCircuitBreaker: () => {
    console.log('[GlobalDataStore FASE 6] 🔄 Circuit Breaker: Reset manual');
    set({
      circuitBreaker: {
        failures: 0,
        lastFailureTime: 0,
        isOpen: false,
      },
    });
  },
  
  // Load locales in map bounds
  loadLocalesInBounds: async (bounds) => {
    const { circuitBreaker, recordFailure, recordSuccess } = get();
    
    // ✅ FASE 6: Verificar Circuit Breaker
    if (circuitBreaker.isOpen) {
      const timeSinceLastFailure = Date.now() - circuitBreaker.lastFailureTime;
      
      if (timeSinceLastFailure < CIRCUIT_BREAKER_TIMEOUT) {
        console.warn('[GlobalDataStore FASE 6] 🚫 Circuit Breaker ABIERTO - rechazando petición');
        return [];
      }
      
      console.log('[GlobalDataStore FASE 6] 🔄 Circuit Breaker: Intentando reconectar...');
    }
    
    try {
      const mapLimit = Platform.OS === 'android' ? 75 : 200;
      
      // ✅ FASE 7: AbortController con timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('[GlobalDataStore FASE 7] ⏱️ Timeout en loadLocalesInBounds');
        controller.abort();
      }, 5000);
      
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, tipo, direccion, provincia, latitud, longitud, imagen_url, destacado, horarios_completos, barlive_types, barlive_type, rating, google_rating, activo, comunidad')
        .eq('activo', true)
        .gte('latitud', bounds.south)
        .lte('latitud', bounds.north)
        .gte('longitud', bounds.west)
        .lte('longitud', bounds.east)
        .order('destacado', { ascending: false })
        .order('rating', { ascending: false })
        .limit(mapLimit)
        .abortSignal(controller.signal);
      
      clearTimeout(timeoutId);

      if (error) throw error;
      
      // ✅ FASE 6: Registrar éxito
      recordSuccess();

      return (data || []).map(transformarLocal);
    } catch (error: any) {
      // ✅ FASE 6: Registrar fallo
      if (error.name !== 'AbortError') {
        recordFailure();
      }
      
      return [];
    }
  },
  
  // Load data on demand
  loadDataOnDemand: async (dataType) => {
    const { locales, posts, eventos, ofertas, lastUpdate } = get();
    
    const hasData = {
      locales: locales.length > 0,
      posts: posts.length > 0,
      eventos: eventos.length > 0,
      ofertas: ofertas.length > 0,
    };

    if (hasData[dataType]) {
      const dataAge = Date.now() - lastUpdate;
      if (dataAge < 5 * 60 * 1000) {
        return; // Data is fresh
      }
    }

    // Load in background
    requestAnimationFrame(() => {
      const loadData = async () => {
        try {
          const localesLimit = Platform.OS === 'android' ? 15 : 50;
          const postsLimit = Platform.OS === 'android' ? 6 : 20;
          const eventosLimit = Platform.OS === 'android' ? 5 : 15;
          const ofertasLimit = Platform.OS === 'android' ? 5 : 15;

          switch (dataType) {
            case 'locales':
              const { data: localesData, error: localesError } = await supabase
                .from('locales')
                .select('id, nombre, tipo, direccion, provincia, latitud, longitud, imagen_url, destacado, horarios_completos, barlive_types, barlive_type, rating, google_rating, activo, comunidad')
                .eq('activo', true)
                .order('destacado', { ascending: false })
                .order('rating', { ascending: false })
                .limit(localesLimit);
              
              if (!localesError && localesData) {
                const transformed = localesData.map(transformarLocal);
                set({ locales: transformed, lastUpdate: Date.now(), hasLoadedOnce: true });
              }
              break;

            case 'posts':
              const { data: postsData, error: postsError } = await supabase
                .from('posts')
                .select(`
                  id, autor_id, contenido, imagen, imagenes, likes, comentarios, created_at, tipo, local_id,
                  autor:usuarios!posts_autor_id_fkey(nombre, avatar, username),
                  local:locales!posts_local_id_fkey(nombre, imagen_url)
                `)
                .order('created_at', { ascending: false })
                .limit(postsLimit);
              
              if (!postsError && postsData) {
                const mapped = postsData.map(post => ({
                  ...post,
                  autor: post.tipo === 'local' && post.local 
                    ? {
                        nombre: post.local.nombre,
                        avatar: post.local.imagen_url,
                        username: post.local.nombre,
                      }
                    : post.autor,
                }));
                set({ posts: mapped, lastUpdate: Date.now(), hasLoadedOnce: true });
              }
              break;

            case 'eventos':
              const { data: eventosData, error: eventosError } = await supabase
                .from('eventos')
                .select('id, titulo, descripcion, fecha, fecha_fin, hora, hora_fin, imagen_url, precio, local_id, activo')
                .gte('fecha', new Date().toISOString())
                .order('fecha', { ascending: true })
                .limit(eventosLimit);
              
              if (!eventosError && eventosData) {
                set({ eventos: eventosData, lastUpdate: Date.now(), hasLoadedOnce: true });
              }
              break;

            case 'ofertas':
              const { data: ofertasData, error: ofertasError } = await supabase
                .from('ofertas_trabajo')
                .select(`
                  id, titulo, descripcion, tipo, salario, provincia, local_id, propietario_id, activo, created_at,
                  local:locales(nombre),
                  propietario:usuarios(nombre)
                `)
                .order('created_at', { ascending: false })
                .limit(ofertasLimit);
              
              if (!ofertasError && ofertasData) {
                set({ ofertas: ofertasData, lastUpdate: Date.now(), hasLoadedOnce: true });
              }
              break;
          }
        } catch (error) {
          // Silent error
        }
      };

      loadData();
    });
  },
  
  // Refresh all data
  refreshData: async (silent = false) => {
    if (!silent) {
      set({ isRefreshing: true });
    }

    try {
      const localesLimit = Platform.OS === 'android' ? 15 : 50;
      const postsLimit = Platform.OS === 'android' ? 6 : 20;
      const eventosLimit = Platform.OS === 'android' ? 5 : 15;
      const ofertasLimit = Platform.OS === 'android' ? 5 : 15;
      
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
          .limit(localesLimit),
        
        supabase
          .from('posts')
          .select(`
            id, autor_id, contenido, imagen, imagenes, likes, comentarios, created_at, tipo, local_id,
            autor:usuarios!posts_autor_id_fkey(nombre, avatar, username),
            local:locales!posts_local_id_fkey(nombre, imagen_url)
          `)
          .order('created_at', { ascending: false })
          .limit(postsLimit),
        
        supabase
          .from('eventos')
          .select('id, titulo, descripcion, fecha, fecha_fin, hora, hora_fin, imagen_url, precio, local_id, activo')
          .gte('fecha', new Date().toISOString())
          .order('fecha', { ascending: true })
          .limit(eventosLimit),
        
        supabase
          .from('ofertas_trabajo')
          .select(`
            id, titulo, descripcion, tipo, salario, provincia, local_id, propietario_id, activo, created_at,
            local:locales(nombre),
            propietario:usuarios(nombre)
          `)
          .order('created_at', { ascending: false })
          .limit(ofertasLimit),
      ]);

      if (!localesResult.error && localesResult.data) {
        const transformedLocales = localesResult.data.map(transformarLocal);
        set({ locales: transformedLocales });
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
        set({ posts: mappedPosts });
      }

      if (!eventosResult.error && eventosResult.data) {
        set({ eventos: eventosResult.data });
      }

      if (!ofertasResult.error && ofertasResult.data) {
        set({ ofertas: ofertasResult.data });
      }

      set({ lastUpdate: Date.now(), hasLoadedOnce: true });
    } catch (error) {
      // Silent error
    } finally {
      if (!silent) {
        set({ isRefreshing: false });
      }
    }
  },
  
  // Initialize (load from cache)
  initialize: async () => {
    if (Platform.OS === 'android') {
      // Instant cache load with requestAnimationFrame
      requestAnimationFrame(async () => {
        try {
          const cachedLocales = await AsyncStorage.getItem(CACHE_KEYS.LOCALES);
          if (cachedLocales) {
            const parsedLocales = JSON.parse(cachedLocales);
            set({ locales: parsedLocales, hasLoadedOnce: true });
          }
        } catch (error) {
          // Silent error
        }
      });
      
      return;
    }
    
    // iOS: Load cache normally
    try {
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

      if (cachedLocales) {
        const parsedLocales = JSON.parse(cachedLocales);
        set({ locales: parsedLocales });
      }

      if (cachedPosts) {
        const parsedPosts = JSON.parse(cachedPosts);
        set({ posts: parsedPosts });
      }

      if (cachedEventos) {
        const parsedEventos = JSON.parse(cachedEventos);
        set({ eventos: parsedEventos });
      }

      if (cachedOfertas) {
        const parsedOfertas = JSON.parse(cachedOfertas);
        set({ ofertas: parsedOfertas });
      }

      set({ lastUpdate: timestamp, hasLoadedOnce: true });
    } catch (error) {
      // Silent error
    }
  },
}));
