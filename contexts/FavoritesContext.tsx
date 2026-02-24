
/**
 * ✅ FAVORITES CONTEXT v3.2 - ALIASED TO ZUSTAND STORE
 * 
 * CRITICAL CHANGES v3.2 (PASO 3.2 - HOOK ALIASING):
 * - ✅ ALIASING: useFavorites now internally calls useFavoritesStore
 * - ✅ NO PROVIDER NEEDED: Components can use useFavorites without FavoritesProvider
 * - ✅ BACKWARD COMPATIBLE: Old components work without changes
 * - ✅ ZUSTAND POWERED: All state management through Zustand
 * - ✅ RESULT: Smooth migration without breaking existing code
 * 
 * This file now acts as a FACADE/ALIAS to the Zustand store.
 * The FavoritesProvider component has been removed.
 * All state is managed by useFavoritesStore from src/store/useFavoritesStore.ts
 */

import { useFavoritesStore } from '@/src/store/useFavoritesStore';
import { useAuth } from './AuthContext';

interface FavoritesContextType {
  favorites: Set<string>;
  isFavorite: (localId: string) => boolean;
  toggleFavorite: (localId: string) => Promise<boolean>;
  refreshFavorites: () => Promise<void>;
  loading: boolean;
}

/**
 * ✅ ALIASED HOOK - useFavorites now points to Zustand store
 * 
 * This hook acts as a facade/alias to useFavoritesStore.
 * Components can continue using useFavorites() without knowing
 * that the underlying implementation has changed to Zustand.
 * 
 * NO PROVIDER NEEDED - Just import and use!
 */
export function useFavorites(): FavoritesContextType {
  const { user, ensureValidSession } = useAuth();
  
  // ✅ ALIASING: Internally call useFavoritesStore
  const favorites = useFavoritesStore(state => state.favorites);
  const loading = useFavoritesStore(state => state.loading);
  const isFavoriteStore = useFavoritesStore(state => state.isFavorite);
  const toggleFavoriteStore = useFavoritesStore(state => state.toggleFavorite);
  const refreshFavoritesStore = useFavoritesStore(state => state.refreshFavorites);
  const loadFavorites = useFavoritesStore(state => state.loadFavorites);
  
  // Wrapper functions to match old interface
  const isFavorite = (localId: string): boolean => {
    // Trigger lazy load if needed
    if (user?.id) {
      loadFavorites(user.id);
    }
    return isFavoriteStore(localId);
  };
  
  const toggleFavorite = async (localId: string): Promise<boolean> => {
    if (!user?.id) {
      return false;
    }
    return toggleFavoriteStore(localId, user.id, ensureValidSession);
  };
  
  const refreshFavorites = async (): Promise<void> => {
    if (!user?.id) {
      return;
    }
    return refreshFavoritesStore(user.id);
  };
  
  // Return the same interface as before
  return {
    favorites,
    isFavorite,
    toggleFavorite,
    refreshFavorites,
    loading,
  };
}

// ✅ DEPRECATED: FavoritesProvider is no longer needed
// The component is kept for backward compatibility but does nothing
// All state is managed by useFavoritesStore
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  console.warn('[FavoritesContext v3.2] ⚠️ FavoritesProvider is deprecated. Remove it from your app - Zustand handles state now.');
  return <>{children}</>;
}
