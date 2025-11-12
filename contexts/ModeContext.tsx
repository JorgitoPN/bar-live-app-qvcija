
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

type UserMode = 'cliente' | 'propietario' | 'admin';

interface ModeContextType {
  currentMode: UserMode;
  setCurrentMode: (mode: UserMode) => void;
  selectedLocalId: string | null;
  setSelectedLocalId: (localId: string | null) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

const MODE_STORAGE_KEY = '@barlive_user_mode';
const SELECTED_LOCAL_STORAGE_KEY = '@barlive_selected_local';

export function ModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentMode, setCurrentModeState] = useState<UserMode>('cliente');
  const [selectedLocalId, setSelectedLocalIdState] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize mode and selected local from storage or user role (only once)
  useEffect(() => {
    const initializeMode = async () => {
      try {
        // Try to load saved mode and local from storage
        const [savedMode, savedLocalId] = await Promise.all([
          AsyncStorage.getItem(MODE_STORAGE_KEY),
          AsyncStorage.getItem(SELECTED_LOCAL_STORAGE_KEY),
        ]);
        
        // Restore selected local if available
        if (savedLocalId) {
          console.log('[ModeContext] Restored selected local from storage:', savedLocalId);
          setSelectedLocalIdState(savedLocalId);
        }
        
        if (savedMode && (savedMode === 'cliente' || savedMode === 'propietario' || savedMode === 'admin')) {
          // Validate that the saved mode is still valid for the current user
          if (user) {
            const userRole = user.rol_app || 'cliente';
            
            // Check if saved mode is allowed for current user
            const isValidMode = 
              (savedMode === 'cliente') || // Everyone can be cliente
              (savedMode === 'propietario' && (userRole === 'propietario' || userRole === 'admin')) ||
              (savedMode === 'admin' && userRole === 'admin');
            
            if (isValidMode) {
              console.log('[ModeContext] Restored mode from storage:', savedMode);
              setCurrentModeState(savedMode as UserMode);
              setIsInitialized(true);
              return;
            }
          } else {
            // No user, but we have a saved mode - use it if it's cliente
            if (savedMode === 'cliente') {
              console.log('[ModeContext] No user, using saved cliente mode');
              setCurrentModeState('cliente');
              setIsInitialized(true);
              return;
            }
          }
        }
        
        // No saved mode or invalid mode - set default based on user
        if (!user) {
          console.log('[ModeContext] No user, defaulting to cliente mode');
          setCurrentModeState('cliente');
        } else {
          const userRole = user.rol_app || 'cliente';
          
          if (userRole === 'admin') {
            // Admin defaults to admin mode
            console.log('[ModeContext] Admin user, defaulting to admin mode');
            setCurrentModeState('admin');
            await AsyncStorage.setItem(MODE_STORAGE_KEY, 'admin');
          } else if (userRole === 'propietario') {
            // Propietario defaults to cliente mode
            console.log('[ModeContext] Propietario user, defaulting to cliente mode');
            setCurrentModeState('cliente');
            await AsyncStorage.setItem(MODE_STORAGE_KEY, 'cliente');
          } else {
            // Cliente always in cliente mode
            console.log('[ModeContext] Cliente user, defaulting to cliente mode');
            setCurrentModeState('cliente');
            await AsyncStorage.setItem(MODE_STORAGE_KEY, 'cliente');
          }
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('[ModeContext] Error initializing mode:', error);
        setCurrentModeState('cliente');
        setIsInitialized(true);
      }
    };

    // Only initialize once
    if (!isInitialized) {
      initializeMode();
    }
  }, [user, isInitialized]);

  const setCurrentMode = async (mode: UserMode) => {
    try {
      console.log('[ModeContext] Setting mode to:', mode);
      
      // Validate mode is allowed for current user
      if (user) {
        const userRole = user.rol_app || 'cliente';
        
        const isValidMode = 
          (mode === 'cliente') || // Everyone can be cliente
          (mode === 'propietario' && (userRole === 'propietario' || userRole === 'admin')) ||
          (mode === 'admin' && userRole === 'admin');
        
        if (!isValidMode) {
          console.warn('[ModeContext] Invalid mode for user role:', mode, userRole);
          return;
        }
      }
      
      // Save to storage for persistence
      await AsyncStorage.setItem(MODE_STORAGE_KEY, mode);
      setCurrentModeState(mode);
      console.log('[ModeContext] Mode saved to storage:', mode);
    } catch (error) {
      console.error('[ModeContext] Error saving mode:', error);
      // Still update state even if storage fails
      setCurrentModeState(mode);
    }
  };

  const setSelectedLocalId = async (localId: string | null) => {
    try {
      console.log('[ModeContext] Setting selected local to:', localId);
      
      if (localId) {
        await AsyncStorage.setItem(SELECTED_LOCAL_STORAGE_KEY, localId);
      } else {
        await AsyncStorage.removeItem(SELECTED_LOCAL_STORAGE_KEY);
      }
      
      setSelectedLocalIdState(localId);
      console.log('[ModeContext] Selected local saved to storage:', localId);
    } catch (error) {
      console.error('[ModeContext] Error saving selected local:', error);
      // Still update state even if storage fails
      setSelectedLocalIdState(localId);
    }
  };

  return (
    <ModeContext.Provider value={{ currentMode, setCurrentMode, selectedLocalId, setSelectedLocalId }}>
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
