
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';

interface UIScalingContextType {
  scaleFactor: number;
  isEnabled: boolean;
  updateScaleFactor: (factor: number) => void;
  toggleEnabled: (enabled: boolean) => void;
}

const UIScalingContext = createContext<UIScalingContextType | undefined>(undefined);

export function UIScalingProvider({ children }: { children: ReactNode }) {
  const [scaleFactor, setScaleFactor] = useState(1.0);
  const [isEnabled, setIsEnabled] = useState(Platform.OS === 'android');

  const updateScaleFactor = (factor: number) => {
    setScaleFactor(factor);
  };

  const toggleEnabled = (enabled: boolean) => {
    setIsEnabled(enabled);
  };

  return (
    <UIScalingContext.Provider
      value={{
        scaleFactor,
        isEnabled,
        updateScaleFactor,
        toggleEnabled,
      }}
    >
      {children}
    </UIScalingContext.Provider>
  );
}

export function useUIScaling() {
  const context = useContext(UIScalingContext);
  if (context === undefined) {
    throw new Error('useUIScaling must be used within a UIScalingProvider');
  }
  return context;
}
