
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/utils/supabase';
import { useAuth } from './AuthContext';

interface SelectedLocalContextType {
  selectedLocalId: string | null;
  setSelectedLocalId: (localId: string | null) => Promise<void>;
  userLocales: {
    id: string;
    nombre: string;
    imagen_url: string | null;
    tipo: string;
    plan_nombre?: string;
    destacados_restantes?: number;
  }[];
  loadingLocales: boolean;
  refreshLocales: () => Promise<void>;
}

const SelectedLocalContext = createContext<SelectedLocalContextType | undefined>(undefined);

const STORAGE_KEY = '@selected_local_id';

/**
 * ✅ SELECTED LOCAL CONTEXT v96.0 - FIXED "MAXIMUM UPDATE DEPTH EXCEEDED" ERROR
 * 
 * CRITICAL FIXES v96.0:
 * - ✅ Fixed circular dependency causing infinite re-renders
 * - ✅ Used useRef to prevent unnecessary re-renders
 * - ✅ Memoized context value to prevent recreation on every render
 * - ✅ Simplified dependency arrays to prevent circular updates
 * - ✅ Prevented concurrent loads with loading flag
 * 
 * IMPORTANT: This fix prevents the "Maximum update depth exceeded" error
 */
export function SelectedLocalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedLocalId, setSelectedLocalIdState] = useState<string | null>(null);
  const [userLocales, setUserLocales] = useState<any[]>([]);
  const [loadingLocales, setLoadingLocales] = useState(true);
  
  // ✅ FIX v96.0: Use ref to prevent circular dependencies
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  // ✅ FIX v96.0: Load selected local from storage only once
  useEffect(() => {
    const loadSelectedLocal = async () => {
      try {
        const storedLocalId = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedLocalId) {
          setSelectedLocalIdState(storedLocalId);
          console.log('[SelectedLocalContext v96.0] ✅ Loaded selected local from storage:', storedLocalId);
        }
      } catch (error) {
        console.error('[SelectedLocalContext v96.0] ❌ Error loading selected local:', error);
      }
    };

    loadSelectedLocal();
  }, []); // Empty dependency array - run only once

  // ✅ FIX v96.0: Memoize loadUserLocales to prevent recreation
  const loadUserLocales = useCallback(async () => {
    // ✅ FIX v96.0: Prevent concurrent loads
    if (isLoadingRef.current) {
      console.log('[SelectedLocalContext v96.0] ⚠️ Already loading, skipping...');
      return;
    }

    if (!user || user.rol_app !== 'propietario') {
      console.log('[SelectedLocalContext v96.0] ℹ️ User is not propietario, clearing locales');
      setUserLocales([]);
      setLoadingLocales(false);
      hasLoadedRef.current = true;
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoadingLocales(true);
      console.log('[SelectedLocalContext v96.0] 🔄 Loading user locales for:', user.id);

      // Get user's locales
      const { data: localesData, error: localesError } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url, tipo')
        .eq('propietario_id', user.id)
        .eq('activo', true)
        .order('nombre');

      if (localesError) {
        console.error('[SelectedLocalContext v96.0] ❌ Error loading locales:', localesError);
        setUserLocales([]);
        return;
      }

      if (!localesData || localesData.length === 0) {
        console.log('[SelectedLocalContext v96.0] ℹ️ No locales found for user');
        setUserLocales([]);
        setSelectedLocalIdState(null);
        await AsyncStorage.removeItem(STORAGE_KEY);
        return;
      }

      console.log('[SelectedLocalContext v96.0] ✅ Found', localesData.length, 'locales');

      // Get subscription info for each local
      const localesWithPlan = await Promise.all(
        localesData.map(async (local) => {
          const { data: suscripcion } = await supabase
            .from('suscripciones_locales')
            .select(`
              eventos_usados_mes,
              planes_suscripcion (
                nombre,
                eventos_mes,
                promos_destacadas
              )
            `)
            .eq('local_id', local.id)
            .eq('estado', 'activa')
            .single();

          const planNombre = (suscripcion?.planes_suscripcion as any)?.nombre || 'basico';
          const promosDestacadas = (suscripcion?.planes_suscripcion as any)?.promos_destacadas || 0;

          return {
            ...local,
            plan_nombre: planNombre,
            destacados_restantes: promosDestacadas,
          };
        })
      );

      setUserLocales(localesWithPlan);
      console.log('[SelectedLocalContext v96.0] ✅ Loaded locales with plans:', localesWithPlan.length);

      // ✅ FIX v96.0: Only set selected local if not already set
      if (!selectedLocalId && localesWithPlan.length > 0) {
        const firstLocalId = localesWithPlan[0].id;
        setSelectedLocalIdState(firstLocalId);
        await AsyncStorage.setItem(STORAGE_KEY, firstLocalId);
        console.log('[SelectedLocalContext v96.0] ✅ Auto-selected first local:', firstLocalId);
      }

      hasLoadedRef.current = true;
    } catch (error) {
      console.error('[SelectedLocalContext v96.0] ❌ Error loading user locales:', error);
      setUserLocales([]);
    } finally {
      setLoadingLocales(false);
      isLoadingRef.current = false;
    }
  }, [user, selectedLocalId]); // ✅ FIX v96.0: Simplified dependencies

  // ✅ FIX v96.0: Load locales only when user changes or on mount
  useEffect(() => {
    if (!hasLoadedRef.current) {
      loadUserLocales();
    }
  }, [user?.id]); // ✅ FIX v96.0: Only depend on user.id, not entire user object

  // ✅ FIX v96.0: Memoize setSelectedLocalId to prevent recreation
  const setSelectedLocalId = useCallback(async (localId: string | null) => {
    try {
      console.log('[SelectedLocalContext v96.0] 🔄 Setting selected local:', localId);
      setSelectedLocalIdState(localId);
      if (localId) {
        await AsyncStorage.setItem(STORAGE_KEY, localId);
        console.log('[SelectedLocalContext v96.0] ✅ Saved to storage:', localId);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
        console.log('[SelectedLocalContext v96.0] ✅ Removed from storage');
      }
    } catch (error) {
      console.error('[SelectedLocalContext v96.0] ❌ Error saving selected local:', error);
    }
  }, []); // No dependencies - function never changes

  // ✅ FIX v96.0: Memoize refreshLocales to prevent recreation
  const refreshLocales = useCallback(async () => {
    console.log('[SelectedLocalContext v96.0] 🔄 Manual refresh requested');
    hasLoadedRef.current = false; // Reset flag to allow reload
    await loadUserLocales();
  }, [loadUserLocales]);

  // ✅ FIX v96.0: Memoize context value to prevent recreation
  const value = useMemo(() => ({
    selectedLocalId,
    setSelectedLocalId,
    userLocales,
    loadingLocales,
    refreshLocales,
  }), [selectedLocalId, setSelectedLocalId, userLocales, loadingLocales, refreshLocales]);

  return (
    <SelectedLocalContext.Provider value={value}>
      {children}
    </SelectedLocalContext.Provider>
  );
}

export function useSelectedLocal() {
  const context = useContext(SelectedLocalContext);

  if (context === undefined) {
    throw new Error('useSelectedLocal must be used within a SelectedLocalProvider');
  }

  return context;
}
