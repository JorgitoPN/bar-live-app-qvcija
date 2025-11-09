
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

type UserMode = 'cliente' | 'propietario' | 'admin';

interface ModeContextType {
  currentMode: UserMode;
  setCurrentMode: (mode: UserMode) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentMode, setCurrentModeState] = useState<UserMode>('cliente');

  // Initialize mode based on user role
  useEffect(() => {
    if (!user) {
      setCurrentModeState('cliente');
      return;
    }

    const userRole = user.rol_app || 'cliente';
    
    if (userRole === 'admin') {
      // Admin defaults to admin mode
      setCurrentModeState('admin');
    } else if (userRole === 'propietario') {
      // Propietario defaults to cliente mode
      setCurrentModeState('cliente');
    } else {
      // Cliente always in cliente mode
      setCurrentModeState('cliente');
    }
  }, [user]);

  const setCurrentMode = (mode: UserMode) => {
    console.log('[ModeContext] Setting mode to:', mode);
    setCurrentModeState(mode);
  };

  return (
    <ModeContext.Provider value={{ currentMode, setCurrentMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  
  if (context === undefined) {
    throw new Error('useMode debe ser usado dentro de un ModeProvider');
  }
  
  return context;
}
