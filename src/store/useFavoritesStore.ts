
import { create } from 'zustand';
import { supabase } from '@/utils/supabase';
import { Alert } from 'react-native';

/**
 * ✅ FAVORITES STORE v1.0 - ZUSTAND ATOMIC STATE MANAGEMENT
 * 
 * BENEFITS:
 * - ✅ ATOMIC UPDATES: Only components using favorites re-render
 * - ✅ LAZY LOADING: Favorites load only when needed
 * - ✅ OPTIMISTIC UI: Instant feedback, background sync
 * - ✅ NO PROVIDER: Direct import and use
 * 
 * EXAMPLE:
 * // Only re-renders when favorites change
 * const favorites = useFavoritesStore(state => state.favorites);
 * const toggleFavorite = useFavoritesStore(state => state.toggleFavorite);
 */

interface FavoritesState {
  // State
  favorites: Set<string>;
  loading: boolean;
  hasLoaded: boolean;
  
  // Actions
  setFavorites: (favorites: Set<string>) => void;
  setLoading: (loading: boolean) => void;
  isFavorite: (localId: string) => boolean;
  toggleFavorite: (localId: string, userId: string, ensureValidSession: () => Promise<any>) => Promise<boolean>;
  refreshFavorites: (userId: string) => Promise<void>;
  loadFavorites: (userId: string) => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  // Initial state
  favorites: new Set<string>(),
  loading: false,
  hasLoaded: false,
  
  // Simple setters
  setFavorites: (favorites) => set({ favorites }),
  setLoading: (loading) => set({ loading }),
  
  // Check if local is favorite
  isFavorite: (localId) => {
    const { favorites, hasLoaded } = get();
    
    // Lazy load if not loaded yet
    if (!hasLoaded) {
      // Trigger load in background (will be handled by component)
      return false;
    }
    
    return favorites.has(localId);
  },
  
  // Load favorites from database
  loadFavorites: async (userId) => {
    const { hasLoaded } = get();
    
    // Only load once
    if (hasLoaded) {
      return;
    }
    
    try {
      console.log('[FavoritesStore] 📥 Loading favorites for user:', userId);
      
      const { data, error } = await supabase
        .from('locales_guardados')
        .select('local_id')
        .eq('usuario_id', userId);

      if (error) {
        console.error('[FavoritesStore] ❌ Error loading favorites:', error);
        return;
      }

      const favoriteIds = new Set(data?.map(item => item.local_id) || []);
      set({ favorites: favoriteIds, hasLoaded: true });
      console.log('[FavoritesStore] ✅ Loaded', favoriteIds.size, 'favorites');
    } catch (error) {
      console.error('[FavoritesStore] ❌ Error loading favorites:', error);
    }
  },
  
  // Toggle favorite (optimistic UI)
  toggleFavorite: async (localId, userId, ensureValidSession) => {
    if (!userId) {
      console.log('[FavoritesStore] ⚠️ No user logged in');
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para agregar favoritos');
      return false;
    }

    const { favorites, hasLoaded, loadFavorites } = get();
    
    // Lazy load if needed
    if (!hasLoaded) {
      await loadFavorites(userId);
    }

    const wasFavorite = favorites.has(localId);
    
    console.log('[FavoritesStore] ⚡ OPTIMISTIC UPDATE - Changing UI instantly');
    
    // Optimistic update
    const newFavorites = new Set(favorites);
    if (wasFavorite) {
      newFavorites.delete(localId);
    } else {
      newFavorites.add(localId);
    }
    set({ favorites: newFavorites });

    console.log('[FavoritesStore] 🔄 BACKGROUND SYNC - Starting server request...');
    
    set({ loading: true });

    try {
      const validSession = await ensureValidSession();
      
      if (!validSession) {
        console.error('[FavoritesStore] ❌ No valid session available');
        
        // Revert optimistic update
        const revertedFavorites = new Set(favorites);
        if (wasFavorite) {
          revertedFavorites.add(localId);
        } else {
          revertedFavorites.delete(localId);
        }
        set({ favorites: revertedFavorites, loading: false });
        
        Alert.alert('Sesión expirada', 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        return false;
      }

      if (wasFavorite) {
        const { error } = await supabase
          .from('locales_guardados')
          .delete()
          .eq('usuario_id', userId)
          .eq('local_id', localId);

        if (error) {
          console.error('[FavoritesStore] ❌ Server error removing favorite:', error);
          
          // Revert optimistic update
          const revertedFavorites = new Set(favorites);
          revertedFavorites.add(localId);
          set({ favorites: revertedFavorites, loading: false });
          
          if (error.code === '42501') {
            Alert.alert('Error de permisos', 'No tienes permisos para eliminar favoritos. Por favor, cierra sesión y vuelve a iniciar sesión.');
          } else {
            Alert.alert('Error', 'No se pudo eliminar de favoritos. Por favor, intenta de nuevo.');
          }
          
          return false;
        }
        
        console.log('[FavoritesStore] ✅ Server confirmed: Removed from favorites');
        set({ loading: false });
        return true;
      } else {
        const { data: existing } = await supabase
          .from('locales_guardados')
          .select('id')
          .eq('usuario_id', userId)
          .eq('local_id', localId)
          .maybeSingle();

        if (existing) {
          console.log('[FavoritesStore] ℹ️ Already in favorites on server');
          set({ loading: false });
          return true;
        }

        const { error } = await supabase
          .from('locales_guardados')
          .insert({
            usuario_id: userId,
            local_id: localId,
          });

        if (error) {
          console.error('[FavoritesStore] ❌ Server error adding favorite:', error);
          
          // Revert optimistic update
          const revertedFavorites = new Set(favorites);
          revertedFavorites.delete(localId);
          set({ favorites: revertedFavorites, loading: false });
          
          if (error.code === '23505') {
            console.log('[FavoritesStore] ℹ️ Already in favorites (duplicate key)');
            const confirmedFavorites = new Set(favorites);
            confirmedFavorites.add(localId);
            set({ favorites: confirmedFavorites });
            return true;
          } else if (error.code === '42501') {
            Alert.alert('Error de permisos', 'No tienes permisos para agregar favoritos. Por favor, cierra sesión y vuelve a iniciar sesión.');
          } else {
            Alert.alert('Error', 'No se pudo agregar a favoritos. Por favor, intenta de nuevo.');
          }
          
          return false;
        }
        
        console.log('[FavoritesStore] ✅ Server confirmed: Added to favorites');
        set({ loading: false });
        return true;
      }
    } catch (error: any) {
      console.error('[FavoritesStore] ❌ Unexpected error toggling favorite:', error);
      
      // Revert optimistic update
      const revertedFavorites = new Set(favorites);
      if (wasFavorite) {
        revertedFavorites.add(localId);
      } else {
        revertedFavorites.delete(localId);
      }
      set({ favorites: revertedFavorites, loading: false });
      
      Alert.alert('Error', 'No se pudo actualizar favoritos. Por favor, intenta de nuevo.');
      return false;
    }
  },
  
  // Refresh favorites (force reload)
  refreshFavorites: async (userId) => {
    set({ hasLoaded: false });
    await get().loadFavorites(userId);
  },
}));
