
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { setUiScaleFactor } from '@/utils/androidScaling';
import { supabase } from '@/utils/supabase';

interface UIScalingContextType {
  scaleFactor: number;
  isEnabled: boolean;
  refreshScaling: () => Promise<void>;
}

const UIScalingContext = createContext<UIScalingContextType | undefined>(undefined);

export function UIScalingProvider({ children }: { children: ReactNode }) {
  const [scaleFactor, setScaleFactorState] = useState(1.0);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchScalingConfig = async () => {
    try {
      // Only fetch for Android devices
      if (Platform.OS !== 'android') {
        setIsLoading(false);
        return;
      }

      // TODO: Backend Integration - Fetch UI scaling configuration from backend
      // For now, fetch from Supabase app_config table
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'ui_scaling_android')
        .single();

      if (error) {
        console.log('[UIScaling] No config found, using defaults');
        setUiScaleFactor(1.0);
        setScaleFactorState(1.0);
        setIsEnabled(false);
      } else if (data?.value) {
        const config = data.value as { enabled: boolean; scale_factor: number };
        
        if (config.enabled && config.scale_factor) {
          setUiScaleFactor(config.scale_factor);
          setScaleFactorState(config.scale_factor);
          setIsEnabled(true);
          console.log('[UIScaling] Applied scale factor:', config.scale_factor);
        } else {
          setUiScaleFactor(1.0);
          setScaleFactorState(1.0);
          setIsEnabled(false);
        }
      }
    } catch (error) {
      console.error('[UIScaling] Failed to fetch config:', error);
      // Fallback to default
      setUiScaleFactor(1.0);
      setScaleFactorState(1.0);
      setIsEnabled(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScalingConfig();
  }, []);

  const refreshScaling = async () => {
    await fetchScalingConfig();
  };

  return (
    <UIScalingContext.Provider value={{ scaleFactor, isEnabled, refreshScaling }}>
      {children}
    </UIScalingContext.Provider>
  );
}

export function useUIScaling() {
  const context = useContext(UIScalingContext);
  if (context === undefined) {
    throw new Error('useUIScaling must be used within UIScalingProvider');
  }
  return context;
}
