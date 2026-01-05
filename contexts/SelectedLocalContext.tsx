
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
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
 * ✅ SELECTED LOCAL CONTEXT v97.0 - CIRCULAR DEPENDENCY FIX
 * 
 * CRITICAL FIXES v97.0:
 * - ✅ Fixed "Maximum update depth exceeded" error
 * - ✅ Removed circular dependency in useEffect
 * - ✅ Used useRef to prevent unnecessary re-renders
 * - ✅ Memoized context value to prevent recreation on every render
 * - ✅ Simplified dependency arrays
 */

export function SelectedLocalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedLocalId, setSelectedLocalIdState] = useState<string | null>(null);
  const [userLocales, setUserLocales] = useState<any[]>([]);
  const [loadingLocales, setLoadingLocales] = useState(true);
  
  // ✅ CRITICAL FIX v97.0: Use ref to prevent circular dependency
  const isLoadingRef = useRef(false);

  // Load selected local from storage
  useEffect(() => {
    const loadSelectedLocal = async () => {
      try {
        const storedLocalId = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedLocalId) {
          setSelectedLocalIdState(storedLocalId);
        }
      } catch (error) {
        console.error('[SelectedLocalContext v97.0] Error loading selected local:', error);
      }
    };

    loadSelectedLocal();
  }, []);

  // ✅ CRITICAL FIX v97.0: Memoize loadUserLocales to prevent recreation
  const loadUserLocales = useCallback(async () => {
    // ✅ Prevent concurrent loads
    if (isLoadingRef.current) {
      console.log('[SelectedLocalContext v97.0] Already loading, skipping...');
      return;
    }

    if (!user || user.rol_app !== 'propietario') {
      setUserLocales([]);
      setLoadingLocales(false);
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoadingLocales(true);

      console.log('[SelectedLocalContext v97.0] Loading user locales for:', user.id);

      // Get user's locales
      const { data: localesData, error: localesError } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url, tipo')
        .eq('propietario_id', user.id)
        .eq('activo', true)
        .order('nombre');

      if (localesError) {
        console.error('[SelectedLocalContext v97.0] Error loading locales:', localesError);
        setUserLocales([]);
        return;
      }

      if (!localesData || localesData.length === 0) {
        console.log('[SelectedLocalContext v97.0] No locales found for user');
        setUserLocales([]);
        setSelectedLocalIdState(null);
        await AsyncStorage.removeItem(STORAGE_KEY);
        return;
      }

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
      console.log('[SelectedLocalContext v97.0] Loaded', localesWithPlan.length, 'locales');

      // If no local is selected or the selected local is not in the list, select the first one
      if (!selectedLocalId || !localesWithPlan.find((l) => l.id === selectedLocalId)) {
        const firstLocalId = localesWithPlan[0]?.id || null;
        setSelectedLocalIdState(firstLocalId);
        if (firstLocalId) {
          await AsyncStorage.setItem(STORAGE_KEY, firstLocalId);
        }
      }
    } catch (error) {
      console.error('[SelectedLocalContext v97.0] Error loading user locales:', error);
      setUserLocales([]);
    } finally {
      setLoadingLocales(false);
      isLoadingRef.current = false;
    }
  }, [user, selectedLocalId]);

  // ✅ CRITICAL FIX v97.0: Simplified dependency array - only depend on user
  useEffect(() => {
    if (user) {
      loadUserLocales();
    } else {
      setUserLocales([]);
      setLoadingLocales(false);
    }
  }, [user?.id, user?.rol_app]); // Only re-run when user ID or role changes

  const setSelectedLocalId = async (localId: string | null) => {
    try {
      setSelectedLocalIdState(localId);
      if (localId) {
        await AsyncStorage.setItem(STORAGE_KEY, localId);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('[SelectedLocalContext v97.0] Error saving selected local:', error);
    }
  };

  const refreshLocales = async () => {
    await loadUserLocales();
  };

  // ✅ CRITICAL FIX v97.0: Memoize context value to prevent recreation
  const value = useMemo(() => ({
    selectedLocalId,
    setSelectedLocalId,
    userLocales,
    loadingLocales,
    refreshLocales,
  }), [selectedLocalId, userLocales, loadingLocales]);

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
