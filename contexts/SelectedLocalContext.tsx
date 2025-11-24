
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/utils/supabase';
import { useAuth } from './AuthContext';

interface SelectedLocalContextType {
  selectedLocalId: string | null;
  setSelectedLocalId: (localId: string | null) => Promise<void>;
  userLocales: Array<{
    id: string;
    nombre: string;
    imagen_url: string | null;
    tipo: string;
    plan_nombre?: string;
    destacados_restantes?: number;
  }>;
  loadingLocales: boolean;
  refreshLocales: () => Promise<void>;
}

const SelectedLocalContext = createContext<SelectedLocalContextType | undefined>(undefined);

const STORAGE_KEY = '@selected_local_id';

export function SelectedLocalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedLocalId, setSelectedLocalIdState] = useState<string | null>(null);
  const [userLocales, setUserLocales] = useState<any[]>([]);
  const [loadingLocales, setLoadingLocales] = useState(true);

  // Load selected local from storage
  useEffect(() => {
    const loadSelectedLocal = async () => {
      try {
        const storedLocalId = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedLocalId) {
          setSelectedLocalIdState(storedLocalId);
        }
      } catch (error) {
        console.error('[SelectedLocalContext] Error loading selected local:', error);
      }
    };

    loadSelectedLocal();
  }, []);

  // Load user's locales
  const loadUserLocales = async () => {
    if (!user || user.rol_app !== 'propietario') {
      setUserLocales([]);
      setLoadingLocales(false);
      return;
    }

    try {
      setLoadingLocales(true);

      // Get user's locales
      const { data: localesData, error: localesError } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url, tipo')
        .eq('propietario_id', user.id)
        .eq('activo', true)
        .order('nombre');

      if (localesError) {
        console.error('[SelectedLocalContext] Error loading locales:', localesError);
        setUserLocales([]);
        return;
      }

      if (!localesData || localesData.length === 0) {
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

      // If no local is selected or the selected local is not in the list, select the first one
      if (!selectedLocalId || !localesWithPlan.find((l) => l.id === selectedLocalId)) {
        const firstLocalId = localesWithPlan[0]?.id || null;
        setSelectedLocalIdState(firstLocalId);
        if (firstLocalId) {
          await AsyncStorage.setItem(STORAGE_KEY, firstLocalId);
        }
      }
    } catch (error) {
      console.error('[SelectedLocalContext] Error loading user locales:', error);
      setUserLocales([]);
    } finally {
      setLoadingLocales(false);
    }
  };

  useEffect(() => {
    loadUserLocales();
  }, [user]);

  const setSelectedLocalId = async (localId: string | null) => {
    try {
      setSelectedLocalIdState(localId);
      if (localId) {
        await AsyncStorage.setItem(STORAGE_KEY, localId);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('[SelectedLocalContext] Error saving selected local:', error);
    }
  };

  const refreshLocales = async () => {
    await loadUserLocales();
  };

  const value = {
    selectedLocalId,
    setSelectedLocalId,
    userLocales,
    loadingLocales,
    refreshLocales,
  };

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
