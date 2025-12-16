
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from './AuthContext';
import { Alert } from 'react-native';

interface FavoritesContextType {
  favorites: Set<string>;
  isFavorite: (localId: string) => boolean;
  toggleFavorite: (localId: string) => Promise<boolean>;
  refreshFavorites: () => Promise<void>;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, ensureValidSession } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Load all favorites when user logs in
  const loadFavorites = useCallback(async () => {
    if (!user?.id) {
      setFavorites(new Set());
      return;
    }

    try {
      console.log('[FavoritesContext] 📥 Loading favorites for user:', user.id);
      
      const { data, error } = await supabase
        .from('locales_guardados')
        .select('local_id')
        .eq('usuario_id', user.id);

      if (error) {
        console.error('[FavoritesContext] ❌ Error loading favorites:', error);
        return;
      }

      const favoriteIds = new Set(data?.map(item => item.local_id) || []);
      setFavorites(favoriteIds);
      console.log('[FavoritesContext] ✅ Loaded', favoriteIds.size, 'favorites');
    } catch (error) {
      console.error('[FavoritesContext] ❌ Error loading favorites:', error);
    }
  }, [user?.id]);

  // Load favorites when user changes
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const isFavorite = useCallback((localId: string): boolean => {
    return favorites.has(localId);
  }, [favorites]);

  const toggleFavorite = useCallback(async (localId: string): Promise<boolean> => {
    if (!user?.id) {
      console.log('[FavoritesContext] ⚠️ No user logged in');
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para agregar favoritos');
      return false;
    }

    setLoading(true);
    const wasFavorite = favorites.has(localId);
    
    // Optimistic update
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
      console.log('[FavoritesContext] 🔄 Toggling favorite. Current state:', wasFavorite, '-> New state:', !wasFavorite);

      // Ensure we have a valid session
      console.log('[FavoritesContext] 🔐 Ensuring valid session...');
      const validSession = await ensureValidSession();
      
      if (!validSession) {
        console.error('[FavoritesContext] ❌ No valid session available');
        // Revert optimistic update
        setFavorites(prev => {
          const newSet = new Set(prev);
          if (wasFavorite) {
            newSet.add(localId);
          } else {
            newSet.delete(localId);
          }
          return newSet;
        });
        Alert.alert('Sesión expirada', 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        setLoading(false);
        return false;
      }

      console.log('[FavoritesContext] ✅ Valid session confirmed');

      if (wasFavorite) {
        // ✅ FIXED v2.0: Remove from favorites WITHOUT unfollowing
        console.log('[FavoritesContext] ➖ Removing from favorites (keeping follow status)...');
        const { error } = await supabase
          .from('locales_guardados')
          .delete()
          .eq('usuario_id', user.id)
          .eq('local_id', localId);

        if (error) {
          console.error('[FavoritesContext] ❌ Error removing favorite:', error);
          console.error('[FavoritesContext] Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
          
          // Revert optimistic update
          setFavorites(prev => {
            const newSet = new Set(prev);
            newSet.add(localId);
            return newSet;
          });
          
          if (error.code === '42501') {
            Alert.alert('Error de permisos', 'No tienes permisos para eliminar favoritos. Por favor, cierra sesión y vuelve a iniciar sesión.');
          } else {
            Alert.alert('Error', 'No se pudo eliminar de favoritos');
          }
          
          setLoading(false);
          return false;
        }
        
        console.log('[FavoritesContext] ✅ Removed from favorites (follow status unchanged)');
        setLoading(false);
        return true;
      } else {
        // Check if already exists (to avoid duplicate key error)
        console.log('[FavoritesContext] 🔍 Checking if already in favorites...');
        const { data: existing } = await supabase
          .from('locales_guardados')
          .select('id')
          .eq('usuario_id', user.id)
          .eq('local_id', localId)
          .maybeSingle();

        if (existing) {
          console.log('[FavoritesContext] ℹ️ Already in favorites');
          setLoading(false);
          return true;
        }

        // ✅ FIXED v2.0: Add to favorites WITHOUT following
        console.log('[FavoritesContext] ➕ Adding to favorites (NOT following)...');
        const { error } = await supabase
          .from('locales_guardados')
          .insert({
            usuario_id: user.id,
            local_id: localId,
          });

        if (error) {
          console.error('[FavoritesContext] ❌ Error adding favorite:', error);
          console.error('[FavoritesContext] Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
          
          // Revert optimistic update
          setFavorites(prev => {
            const newSet = new Set(prev);
            newSet.delete(localId);
            return newSet;
          });
          
          // Handle specific errors
          if (error.code === '23505') {
            console.log('[FavoritesContext] ℹ️ Already in favorites (duplicate key)');
            setFavorites(prev => {
              const newSet = new Set(prev);
              newSet.add(localId);
              return newSet;
            });
            setLoading(false);
            return true;
          } else if (error.code === '42501') {
            Alert.alert('Error de permisos', 'No tienes permisos para agregar favoritos. Por favor, cierra sesión y vuelve a iniciar sesión.');
          } else {
            Alert.alert('Error', 'No se pudo agregar a favoritos');
          }
          
          setLoading(false);
          return false;
        }
        
        console.log('[FavoritesContext] ✅ Added to favorites (follow status unchanged)');
        console.log('[FavoritesContext] ℹ️ NOTE: Saving as favorite does NOT automatically follow the local');
        setLoading(false);
        return true;
      }
    } catch (error: any) {
      console.error('[FavoritesContext] ❌ Error toggling favorite:', error);
      // Revert optimistic update
      setFavorites(prev => {
        const newSet = new Set(prev);
        if (wasFavorite) {
          newSet.add(localId);
        } else {
          newSet.delete(localId);
        }
        return newSet;
      });
      Alert.alert('Error', 'No se pudo actualizar favoritos');
      setLoading(false);
      return false;
    }
  }, [user?.id, favorites, ensureValidSession]);

  const refreshFavorites = useCallback(async () => {
    await loadFavorites();
  }, [loadFavorites]);

  const value = {
    favorites,
    isFavorite,
    toggleFavorite,
    refreshFavorites,
    loading,
  };

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  
  if (context === undefined) {
    throw new Error('useFavorites debe ser usado dentro de un FavoritesProvider');
  }
  
  return context;
}
