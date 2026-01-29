
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from './AuthContext';

interface FavoritesContextType {
  favorites: Set<string>;
  isFavorite: (localId: string) => boolean;
  toggleFavorite: (localId: string) => Promise<void>;
  loadFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const loadFavorites = useCallback(async () => {
    if (!user) {
      setFavorites(new Set());
      return;
    }

    try {
      console.log('[FavoritesContext] 📥 Loading favorites for user:', user.id);
      const { data, error } = await supabase
        .from('favoritos')
        .select('local_id')
        .eq('usuario_id', user.id);

      if (error) {
        console.error('[FavoritesContext] ❌ Error loading favorites:', error);
        return;
      }

      const favoriteIds = new Set(data?.map(f => f.local_id) || []);
      setFavorites(favoriteIds);
      console.log('[FavoritesContext] ✅ Loaded', favoriteIds.size, 'favorites');
    } catch (error) {
      console.error('[FavoritesContext] ❌ Error loading favorites:', error);
    }
  }, [user]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const isFavorite = useCallback((localId: string) => {
    return favorites.has(localId);
  }, [favorites]);

  const toggleFavorite = useCallback(async (localId: string) => {
    if (!user) {
      console.log('[FavoritesContext] ⚠️ No user, cannot toggle favorite');
      return;
    }

    const wasFavorite = favorites.has(localId);
    console.log('[FavoritesContext] ⚡ Toggling favorite:', localId, 'wasFavorite:', wasFavorite);

    // Optimistic UI update
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (wasFavorite) {
        newSet.delete(localId);
      } else {
        newSet.add(localId);
      }
      return newSet;
    });

    try {
      if (wasFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('favoritos')
          .delete()
          .eq('usuario_id', user.id)
          .eq('local_id', localId);

        if (error) throw error;
        console.log('[FavoritesContext] ✅ Removed from favorites');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favoritos')
          .insert({
            usuario_id: user.id,
            local_id: localId,
          });

        if (error) throw error;
        console.log('[FavoritesContext] ✅ Added to favorites');
      }
    } catch (error) {
      console.error('[FavoritesContext] ❌ Error toggling favorite:', error);
      // Revert optimistic update on error
      setFavorites(prev => {
        const newSet = new Set(prev);
        if (wasFavorite) {
          newSet.add(localId);
        } else {
          newSet.delete(localId);
        }
        return newSet;
      });
    }
  }, [user, favorites]);

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, loadFavorites }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
