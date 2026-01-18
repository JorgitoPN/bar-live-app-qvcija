
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

type Mode = 'cliente' | 'propietario' | 'admin';

interface ModeContextType {
  currentMode: Mode;
  setMode: (mode: Mode) => void;
  isPropietario: boolean;
  isAdmin: boolean;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentMode, setCurrentMode] = useState<Mode>('cliente');

  // Load saved mode from storage
  useEffect(() => {
    const loadMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('userMode');
        if (savedMode && (savedMode === 'cliente' || savedMode === 'propietario' || savedMode === 'admin')) {
          setCurrentMode(savedMode as Mode);
        }
      } catch (error) {
        console.error('[ModeContext] Error loading mode:', error);
      }
    };
    loadMode();
  }, []);

  const setMode = async (mode: Mode) => {
    console.log('[ModeContext] Setting mode to:', mode);
    setCurrentMode(mode);
    try {
      await AsyncStorage.setItem('userMode', mode);
    } catch (error) {
      console.error('[ModeContext] Error saving mode:', error);
    }
  };

  const isPropietario = currentMode === 'propietario';
  const isAdmin = currentMode === 'admin';

  return (
    <ModeContext.Provider value={{ currentMode, setMode, isPropietario, isAdmin }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
}
