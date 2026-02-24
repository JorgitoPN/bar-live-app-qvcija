
/**
 * ✅ GLOBAL DATA CONTEXT v3.2 - ALIASED TO ZUSTAND STORE
 * 
 * CRITICAL CHANGES v3.2 (PASO 3.2 - HOOK ALIASING):
 * - ✅ ALIASING: useGlobalData now internally calls useGlobalDataStore
 * - ✅ NO PROVIDER NEEDED: Components can use useGlobalData without GlobalDataProvider
 * - ✅ BACKWARD COMPATIBLE: Old components work without changes
 * - ✅ ZUSTAND POWERED: All state management through Zustand
 * - ✅ RESULT: Smooth migration without breaking existing code
 * 
 * This file now acts as a FACADE/ALIAS to the Zustand store.
 * The GlobalDataProvider component has been removed.
 * All state is managed by useGlobalDataStore from src/store/useGlobalDataStore.ts
 */

import { useGlobalDataStore } from '@/src/store/useGlobalDataStore';
import { Local } from '@/types';

interface GlobalDataContextType {
  locales: Local[];
  posts: any[];
  eventos: any[];
  ofertas: any[];
  isInitialLoading: boolean;
  isRefreshing: boolean;
  hasLoadedOnce: boolean;
  refreshData: (silent?: boolean) => Promise<void>;
  loadDataOnDemand: (dataType: 'locales' | 'posts' | 'eventos' | 'ofertas') => Promise<void>;
  updateLocal: (localId: string, updates: Partial<Local>) => void;
  updatePost: (postId: string, updates: Partial<any>) => void;
  prefetchNextPage: (currentPage: number, pageSize: number) => void;
  loadLocalesInBounds: (bounds: { north: number; south: number; east: number; west: number }) => Promise<Local[]>;
  lastUpdate: number;
}

/**
 * ✅ ALIASED HOOK - useGlobalData now points to Zustand store
 * 
 * This hook acts as a facade/alias to useGlobalDataStore.
 * Components can continue using useGlobalData() without knowing
 * that the underlying implementation has changed to Zustand.
 * 
 * NO PROVIDER NEEDED - Just import and use!
 */
export function useGlobalData(): GlobalDataContextType {
  // ✅ ALIASING: Internally call useGlobalDataStore
  const locales = useGlobalDataStore(state => state.locales);
  const posts = useGlobalDataStore(state => state.posts);
  const eventos = useGlobalDataStore(state => state.eventos);
  const ofertas = useGlobalDataStore(state => state.ofertas);
  const isInitialLoading = useGlobalDataStore(state => state.isInitialLoading);
  const isRefreshing = useGlobalDataStore(state => state.isRefreshing);
  const hasLoadedOnce = useGlobalDataStore(state => state.hasLoadedOnce);
  const refreshData = useGlobalDataStore(state => state.refreshData);
  const loadDataOnDemand = useGlobalDataStore(state => state.loadDataOnDemand);
  const updateLocal = useGlobalDataStore(state => state.updateLocal);
  const updatePost = useGlobalDataStore(state => state.updatePost);
  const loadLocalesInBounds = useGlobalDataStore(state => state.loadLocalesInBounds);
  const lastUpdate = useGlobalDataStore(state => state.lastUpdate);
  
  // Dummy prefetchNextPage (not used in Zustand version)
  const prefetchNextPage = () => {};
  
  // Return the same interface as before
  return {
    locales,
    posts,
    eventos,
    ofertas,
    isInitialLoading,
    isRefreshing,
    hasLoadedOnce,
    refreshData,
    loadDataOnDemand,
    updateLocal,
    updatePost,
    prefetchNextPage,
    loadLocalesInBounds,
    lastUpdate,
  };
}

// ✅ DEPRECATED: GlobalDataProvider is no longer needed
// The component is kept for backward compatibility but does nothing
// All state is managed by useGlobalDataStore
export function GlobalDataProvider({ children }: { children: React.ReactNode }) {
  console.warn('[GlobalDataContext v3.2] ⚠️ GlobalDataProvider is deprecated. Remove it from your app - Zustand handles state now.');
  return <>{children}</>;
}


