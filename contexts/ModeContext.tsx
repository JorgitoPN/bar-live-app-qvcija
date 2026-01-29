
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useImpersonation } from './ImpersonationContext';

type Mode = 'cliente' | 'propietario' | 'admin';

interface ModeContextType {
  currentMode: Mode;
  setCurrentMode: (mode: Mode) => Promise<void>;
  activeProfileType: 'user' | 'local' | null;
  activeLocalData: any | null;
  ownedLocals: any[];
  loadOwnedLocals: () => Promise<void>;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isImpersonating } = useImpersonation();
  const [currentMode, setCurrentModeState] = useState<Mode>('cliente');
  const [activeProfileType, setActiveProfileType] = useState<'user' | 'local' | null>(null);
  const [activeLocalData, setActiveLocalData] = useState<any | null>(null);
  const [ownedLocals, setOwnedLocals] = useState<any[]>([]);

  const loadOwnedLocals = useCallback(async () => {
    console.log('[ModeContext] 📋 Loading owned locals...');
    // TODO: Implement loading owned locals from database
    setOwnedLocals([]);
  }, []);

  const setCurrentMode = useCallback(async (mode: Mode) => {
    console.log('[ModeContext] 🔄 Changing mode to:', mode);
    setCurrentModeState(mode);
    
    if (mode === 'propietario') {
      await loadOwnedLocals();
    }
  }, [loadOwnedLocals]);

  useEffect(() => {
    if (user) {
      // Set default mode based on user role
      if (user.rol_app === 'admin') {
        setCurrentModeState('admin');
      } else if (user.rol_app === 'propietario') {
        setCurrentModeState('propietario');
      } else {
        setCurrentModeState('cliente');
      }
    } else {
      setCurrentModeState('cliente');
    }
  }, [user]);

  return (
    <ModeContext.Provider value={{
      currentMode,
      setCurrentMode,
      activeProfileType,
      activeLocalData,
      ownedLocals,
      loadOwnedLocals,
    }}>
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
