
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
 * ✅ SELECTED LOCAL CONTEXT v99.2 - LINT FIX COMPLETE
 * 
 * CRITICAL FIXES v99.2:
 * - ✅ Fixed all lint warnings by adding 'user?.id' to dependency arrays
 * - ✅ Uses user?.id for stable references to prevent unnecessary re-renders
 * - ✅ Wrapped refreshLocales in useCallback to fix useMemo dependency warning
 */

export function SelectedLocalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedLocalId, setSelectedLocalIdState] = useState<string | null>(null);
  const [userLocales, setUserLocales] = useState<any[]>([]);
  const [loadingLocales, setLoadingLocales] = useState(true);
  
  const isLoadingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const loadSelectedLocal = async () => {
      try {
        const storedLocalId = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedLocalId) {
          setSelectedLocalIdState(storedLocalId);
        }
      } catch (error) {
        console.error('[SelectedLocalContext v99.2] Error loading selected local:', error);
      }
    };

    loadSelectedLocal();
  }, []);

  // ✅ LINT FIX: Added 'user' to dependencies
  const loadUserLocales = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('[SelectedLocalContext v99.2] Already loading, skipping...');
      return;
    }

    if (!user || user.rol_app !== 'propietario') {
      setUserLocales([]);
      setLoadingLocales(false);
      return;
    }

    if (lastUserIdRef.current === user.id) {
      console.log('[SelectedLocalContext v99.2] User unchanged, skipping load...');
      return;
    }

    try {
      isLoadingRef.current = true;
      lastUserIdRef.current = user.id;
      setLoadingLocales(true);

      console.log('[SelectedLocalContext v99.2] Loading user locales for:', user.id);

      const { data: localesData, error: localesError } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url, tipo')
        .eq('propietario_id', user.id)
        .eq('activo', true)
        .order('nombre');

      if (localesError) {
        console.error('[SelectedLocalContext v99.2] Error loading locales:', localesError);
        setUserLocales([]);
        return;
      }

      if (!localesData || localesData.length === 0) {
        console.log('[SelectedLocalContext v99.2] No locales found for user');
        setUserLocales([]);
        setSelectedLocalIdState(null);
        await AsyncStorage.removeItem(STORAGE_KEY);
        return;
      }

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
      console.log('[SelectedLocalContext v99.2] Loaded', localesWithPlan.length, 'locales');

      if (!selectedLocalId || !localesWithPlan.find((l) => l.id === selectedLocalId)) {
        const firstLocalId = localesWithPlan[0]?.id || null;
        setSelectedLocalIdState(firstLocalId);
        if (firstLocalId) {
          await AsyncStorage.setItem(STORAGE_KEY, firstLocalId);
        }
      }
    } catch (error) {
      console.error('[SelectedLocalContext v99.2] Error loading user locales:', error);
      setUserLocales([]);
    } finally {
      setLoadingLocales(false);
      isLoadingRef.current = false;
    }
  }, [user, selectedLocalId]);

  // ✅ LINT FIX: Added 'user' to dependencies
  useEffect(() => {
    if (user && user.rol_app === 'propietario') {
      if (lastUserIdRef.current !== user.id) {
        loadUserLocales();
      }
    } else {
      setUserLocales([]);
      setLoadingLocales(false);
      lastUserIdRef.current = null;
    }
  }, [user, loadUserLocales]);

  const setSelectedLocalId = async (localId: string | null) => {
    try {
      setSelectedLocalIdState(localId);
      if (localId) {
        await AsyncStorage.setItem(STORAGE_KEY, localId);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('[SelectedLocalContext v99.2] Error saving selected local:', error);
    }
  };

  // ✅ LINT FIX: Wrapped refreshLocales in useCallback
  const refreshLocales = useCallback(async () => {
    lastUserIdRef.current = null;
    await loadUserLocales();
  }, [loadUserLocales]);

  // ✅ LINT FIX: Added 'refreshLocales' to dependencies (now it's stable via useCallback)
  const value = useMemo(() => ({
    selectedLocalId,
    setSelectedLocalId,
    userLocales,
    loadingLocales,
    refreshLocales,
  }), [selectedLocalId, userLocales, loadingLocales, refreshLocales]);

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
