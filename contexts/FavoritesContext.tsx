
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

/**
 * ✅ FAVORITES CONTEXT v2.0 - OPTIMISTIC UI IMPLEMENTATION
 * 
 * CRITICAL FEATURES v2.0:
 * - ✅ OPTIMISTIC UI: Icon changes INSTANTLY before server response
 * - ✅ BACKGROUND SYNC: Server request happens asynchronously
 * - ✅ ERROR HANDLING: Reverts UI state if server request fails
 * - ✅ USER NOTIFICATION: Shows alert on error
 * - ✅ NO BLOCKING: Visual response is immediate, no waiting for server
 * 
 * ACCEPTANCE CRITERIA:
 * ✅ Heart icon changes state immediately on click
 * ✅ Visual response does not depend on server response time
 * ✅ Backend synchronization happens asynchronously
 * ✅ On error, visual state is corrected properly
 */

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
      console.log('[FavoritesContext v2.0] 📥 Loading favorites for user:', user.id);
      
      const { data, error } = await supabase
        .from('locales_guardados')
        .select('local_id')
        .eq('usuario_id', user.id);

      if (error) {
        console.error('[FavoritesContext v2.0] ❌ Error loading favorites:', error);
        return;
      }

      const favoriteIds = new Set(data?.map(item => item.local_id) || []);
      setFavorites(favoriteIds);
      console.log('[FavoritesContext v2.0] ✅ Loaded', favoriteIds.size, 'favorites');
    } catch (error) {
      console.error('[FavoritesContext v2.0] ❌ Error loading favorites:', error);
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
      console.log('[FavoritesContext v2.0] ⚠️ No user logged in');
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para agregar favoritos');
      return false;
    }

    const wasFavorite = favorites.has(localId);
    
    // ✅ STEP 1: OPTIMISTIC UPDATE - Update UI IMMEDIATELY
    console.log('[FavoritesContext v2.0] ⚡ OPTIMISTIC UPDATE - Changing UI instantly');
    console.log('[FavoritesContext v2.0] 📊 Previous state:', wasFavorite, '→ New state:', !wasFavorite);
    
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (wasFavorite) {
        newSet.delete(localId);
        console.log('[FavoritesContext v2.0] 💔 UI: Heart icon changed to EMPTY (optimistic)');
      } else {
        newSet.add(localId);
        console.log('[FavoritesContext v2.0] ❤️ UI: Heart icon changed to FILLED (optimistic)');
      }
      return newSet;
    });

    // ✅ STEP 2: BACKGROUND SYNC - Server request happens asynchronously
    console.log('[FavoritesContext v2.0] 🔄 BACKGROUND SYNC - Starting server request...');
    console.log('[FavoritesContext v2.0] ⚠️ User can continue interacting with the app');
    
    setLoading(true);

    try {
      // Ensure we have a valid session
      console.log('[FavoritesContext v2.0] 🔐 Ensuring valid session...');
      const validSession = await ensureValidSession();
      
      if (!validSession) {
        console.error('[FavoritesContext v2.0] ❌ No valid session available');
        
        // ✅ STEP 3: REVERT OPTIMISTIC UPDATE on error
        console.log('[FavoritesContext v2.0] ⏪ REVERTING optimistic update due to session error');
        setFavorites(prev => {
          const newSet = new Set(prev);
          if (wasFavorite) {
            newSet.add(localId);
            console.log('[FavoritesContext v2.0] ❤️ UI: Heart icon REVERTED to FILLED');
          } else {
            newSet.delete(localId);
            console.log('[FavoritesContext v2.0] 💔 UI: Heart icon REVERTED to EMPTY');
          }
          return newSet;
        });
        
        Alert.alert('Sesión expirada', 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        setLoading(false);
        return false;
      }

      console.log('[FavoritesContext v2.0] ✅ Valid session confirmed');

      if (wasFavorite) {
        // Remove from favorites
        console.log('[FavoritesContext v2.0] ➖ Removing from favorites on server...');
        
        const { error } = await supabase
          .from('locales_guardados')
          .delete()
          .eq('usuario_id', user.id)
          .eq('local_id', localId);

        if (error) {
          console.error('[FavoritesContext v2.0] ❌ Server error removing favorite:', error);
          
          // ✅ STEP 3: REVERT OPTIMISTIC UPDATE on error
          console.log('[FavoritesContext v2.0] ⏪ REVERTING optimistic update due to server error');
          setFavorites(prev => {
            const newSet = new Set(prev);
            newSet.add(localId);
            console.log('[FavoritesContext v2.0] ❤️ UI: Heart icon REVERTED to FILLED');
            return newSet;
          });
          
          if (error.code === '42501') {
            Alert.alert('Error de permisos', 'No tienes permisos para eliminar favoritos. Por favor, cierra sesión y vuelve a iniciar sesión.');
          } else {
            Alert.alert('Error', 'No se pudo eliminar de favoritos. Por favor, intenta de nuevo.');
          }
          
          setLoading(false);
          return false;
        }
        
        console.log('[FavoritesContext v2.0] ✅ Server confirmed: Removed from favorites');
        setLoading(false);
        return true;
      } else {
        // Check if already exists (to avoid duplicate key error)
        console.log('[FavoritesContext v2.0] 🔍 Checking if already in favorites...');
        const { data: existing } = await supabase
          .from('locales_guardados')
          .select('id')
          .eq('usuario_id', user.id)
          .eq('local_id', localId)
          .maybeSingle();

        if (existing) {
          console.log('[FavoritesContext v2.0] ℹ️ Already in favorites on server');
          setLoading(false);
          return true;
        }

        // Add to favorites
        console.log('[FavoritesContext v2.0] ➕ Adding to favorites on server...');
        
        const { error } = await supabase
          .from('locales_guardados')
          .insert({
            usuario_id: user.id,
            local_id: localId,
          });

        if (error) {
          console.error('[FavoritesContext v2.0] ❌ Server error adding favorite:', error);
          
          // ✅ STEP 3: REVERT OPTIMISTIC UPDATE on error
          console.log('[FavoritesContext v2.0] ⏪ REVERTING optimistic update due to server error');
          setFavorites(prev => {
            const newSet = new Set(prev);
            newSet.delete(localId);
            console.log('[FavoritesContext v2.0] 💔 UI: Heart icon REVERTED to EMPTY');
            return newSet;
          });
          
          // Handle specific errors
          if (error.code === '23505') {
            console.log('[FavoritesContext v2.0] ℹ️ Already in favorites (duplicate key)');
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
            Alert.alert('Error', 'No se pudo agregar a favoritos. Por favor, intenta de nuevo.');
          }
          
          setLoading(false);
          return false;
        }
        
        console.log('[FavoritesContext v2.0] ✅ Server confirmed: Added to favorites');
        setLoading(false);
        return true;
      }
    } catch (error: any) {
      console.error('[FavoritesContext v2.0] ❌ Unexpected error toggling favorite:', error);
      
      // ✅ STEP 3: REVERT OPTIMISTIC UPDATE on error
      console.log('[FavoritesContext v2.0] ⏪ REVERTING optimistic update due to unexpected error');
      setFavorites(prev => {
        const newSet = new Set(prev);
        if (wasFavorite) {
          newSet.add(localId);
          console.log('[FavoritesContext v2.0] ❤️ UI: Heart icon REVERTED to FILLED');
        } else {
          newSet.delete(localId);
          console.log('[FavoritesContext v2.0] 💔 UI: Heart icon REVERTED to EMPTY');
        }
        return newSet;
      });
      
      Alert.alert('Error', 'No se pudo actualizar favoritos. Por favor, intenta de nuevo.');
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
