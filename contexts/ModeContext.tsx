
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

type UserMode = 'cliente' | 'propietario' | 'admin';
type PublicationMode = 'cliente' | 'local';

interface ModeContextType {
  currentMode: UserMode;
  setCurrentMode: (mode: UserMode) => Promise<void>;
  selectedLocalId: string | null;
  setSelectedLocalId: (localId: string | null) => Promise<void>;
  isInteractingAsLocal: boolean;
  setIsInteractingAsLocal: (value: boolean) => Promise<void>;
  activeLocalProfileId: string | null;
  setActiveLocalProfileId: (localId: string | null) => Promise<void>;
  publicationMode: PublicationMode;
  setPublicationMode: (mode: PublicationMode) => Promise<void>;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

const MODE_STORAGE_KEY = '@barlive_user_mode';
const SELECTED_LOCAL_STORAGE_KEY = '@barlive_selected_local';
const INTERACTING_AS_LOCAL_KEY = '@barlive_interacting_as_local';
const ACTIVE_LOCAL_PROFILE_KEY = '@barlive_active_local_profile';
const PUBLICATION_MODE_KEY = '@barlive_publication_mode';

export function ModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentMode, setCurrentModeState] = useState<UserMode>('cliente');
  const [selectedLocalId, setSelectedLocalIdState] = useState<string | null>(null);
  const [isInteractingAsLocal, setIsInteractingAsLocalState] = useState(false);
  const [activeLocalProfileId, setActiveLocalProfileIdState] = useState<string | null>(null);
  const [publicationMode, setPublicationModeState] = useState<PublicationMode>('cliente');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize all state from AsyncStorage on mount
  useEffect(() => {
    const initializeMode = async () => {
      try {
        console.log('[ModeContext] 🔄 Initializing from AsyncStorage...');
        
        const [savedMode, savedLocalId, savedInteracting, savedActiveProfile, savedPubMode] = await Promise.all([
          AsyncStorage.getItem(MODE_STORAGE_KEY),
          AsyncStorage.getItem(SELECTED_LOCAL_STORAGE_KEY),
          AsyncStorage.getItem(INTERACTING_AS_LOCAL_KEY),
          AsyncStorage.getItem(ACTIVE_LOCAL_PROFILE_KEY),
          AsyncStorage.getItem(PUBLICATION_MODE_KEY),
        ]);
        
        // Restore selected local if available
        if (savedLocalId) {
          console.log('[ModeContext] ✅ Restored selected local from storage:', savedLocalId);
          setSelectedLocalIdState(savedLocalId);
        }

        // Restore interaction state
        if (savedInteracting === 'true') {
          console.log('[ModeContext] ✅ Restored interaction state: true');
          setIsInteractingAsLocalState(true);
        }

        // Restore active local profile
        if (savedActiveProfile) {
          console.log('[ModeContext] ✅ Restored active local profile:', savedActiveProfile);
          setActiveLocalProfileIdState(savedActiveProfile);
        }

        // Restore publication mode with proper persistence
        if (savedPubMode === 'local' || savedPubMode === 'cliente') {
          console.log('[ModeContext] ✅ Restored publication mode:', savedPubMode);
          setPublicationModeState(savedPubMode as PublicationMode);
        }
        
        if (savedMode && (savedMode === 'cliente' || savedMode === 'propietario' || savedMode === 'admin')) {
          // Validate that the saved mode is still valid for the current user
          if (user) {
            const userRole = user.rol_app || 'cliente';
            
            const isValidMode = 
              (savedMode === 'cliente') ||
              (savedMode === 'propietario' && (userRole === 'propietario' || userRole === 'admin')) ||
              (savedMode === 'admin' && userRole === 'admin');
            
            if (isValidMode) {
              console.log('[ModeContext] ✅ Restored mode from storage:', savedMode);
              setCurrentModeState(savedMode as UserMode);
              setIsInitialized(true);
              return;
            }
          } else {
            if (savedMode === 'cliente') {
              console.log('[ModeContext] ✅ No user, using saved cliente mode');
              setCurrentModeState('cliente');
              setIsInitialized(true);
              return;
            }
          }
        }
        
        // No saved mode or invalid mode - set default based on user
        if (!user) {
          console.log('[ModeContext] ✅ No user, defaulting to cliente mode');
          setCurrentModeState('cliente');
        } else {
          const userRole = user.rol_app || 'cliente';
          
          if (userRole === 'admin') {
            console.log('[ModeContext] ✅ Admin user, defaulting to admin mode');
            setCurrentModeState('admin');
            await AsyncStorage.setItem(MODE_STORAGE_KEY, 'admin');
          } else if (userRole === 'propietario') {
            console.log('[ModeContext] ✅ Propietario user, defaulting to cliente mode');
            setCurrentModeState('cliente');
            await AsyncStorage.setItem(MODE_STORAGE_KEY, 'cliente');
          } else {
            console.log('[ModeContext] ✅ Cliente user, defaulting to cliente mode');
            setCurrentModeState('cliente');
            await AsyncStorage.setItem(MODE_STORAGE_KEY, 'cliente');
          }
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('[ModeContext] ❌ Error initializing mode:', error);
        setCurrentModeState('cliente');
        setIsInitialized(true);
      }
    };

    if (!isInitialized) {
      initializeMode();
    }
  }, [user, isInitialized]);

  // FIXED: Auto-reset when switching to cliente mode
  useEffect(() => {
    if (currentMode === 'cliente') {
      console.log('[ModeContext] 🔄 Switching to cliente mode, resetting local context');
      setPublicationMode('cliente');
      setSelectedLocalIdState(null);
      setIsInteractingAsLocalState(false);
      setActiveLocalProfileIdState(null);
      AsyncStorage.removeItem(SELECTED_LOCAL_STORAGE_KEY);
      AsyncStorage.removeItem(INTERACTING_AS_LOCAL_KEY);
      AsyncStorage.removeItem(ACTIVE_LOCAL_PROFILE_KEY);
      AsyncStorage.setItem(PUBLICATION_MODE_KEY, 'cliente');
    }
  }, [currentMode]);

  const setCurrentMode = async (mode: UserMode) => {
    try {
      console.log('[ModeContext] 🔄 Setting mode to:', mode);
      
      // Validate mode is allowed for current user
      if (user) {
        const userRole = user.rol_app || 'cliente';
        
        const isValidMode = 
          (mode === 'cliente') ||
          (mode === 'propietario' && (userRole === 'propietario' || userRole === 'admin')) ||
          (mode === 'admin' && userRole === 'admin');
        
        if (!isValidMode) {
          console.warn('[ModeContext] ⚠️ Invalid mode for user role:', mode, userRole);
          return;
        }
      }
      
      await AsyncStorage.setItem(MODE_STORAGE_KEY, mode);
      setCurrentModeState(mode);
      console.log('[ModeContext] ✅ Mode saved to storage:', mode);
    } catch (error) {
      console.error('[ModeContext] ❌ Error saving mode:', error);
      setCurrentModeState(mode);
    }
  };

  const setSelectedLocalId = async (localId: string | null) => {
    try {
      console.log('[ModeContext] 🔄 Setting selected local to:', localId);
      
      if (localId) {
        await AsyncStorage.setItem(SELECTED_LOCAL_STORAGE_KEY, localId);
      } else {
        await AsyncStorage.removeItem(SELECTED_LOCAL_STORAGE_KEY);
      }
      
      setSelectedLocalIdState(localId);
      console.log('[ModeContext] ✅ Selected local saved to storage:', localId);
    } catch (error) {
      console.error('[ModeContext] ❌ Error saving selected local:', error);
      setSelectedLocalIdState(localId);
    }
  };

  const setIsInteractingAsLocal = async (value: boolean) => {
    try {
      console.log('[ModeContext] 🔄 Setting interaction state to:', value);
      
      if (value) {
        await AsyncStorage.setItem(INTERACTING_AS_LOCAL_KEY, 'true');
      } else {
        await AsyncStorage.removeItem(INTERACTING_AS_LOCAL_KEY);
        // FIXED: Also clear active local profile when stopping interaction
        await AsyncStorage.removeItem(ACTIVE_LOCAL_PROFILE_KEY);
        setActiveLocalProfileIdState(null);
      }
      
      setIsInteractingAsLocalState(value);
      console.log('[ModeContext] ✅ Interaction state saved to storage:', value);
    } catch (error) {
      console.error('[ModeContext] ❌ Error saving interaction state:', error);
      setIsInteractingAsLocalState(value);
    }
  };

  const setActiveLocalProfileId = async (localId: string | null) => {
    try {
      console.log('[ModeContext] 🔄 Setting active local profile to:', localId);
      
      if (localId) {
        await AsyncStorage.setItem(ACTIVE_LOCAL_PROFILE_KEY, localId);
        // FIXED: When setting active local profile, also set interaction state
        await AsyncStorage.setItem(INTERACTING_AS_LOCAL_KEY, 'true');
        setIsInteractingAsLocalState(true);
      } else {
        await AsyncStorage.removeItem(ACTIVE_LOCAL_PROFILE_KEY);
      }
      
      setActiveLocalProfileIdState(localId);
      console.log('[ModeContext] ✅ Active local profile saved to storage:', localId);
    } catch (error) {
      console.error('[ModeContext] ❌ Error saving active local profile:', error);
      setActiveLocalProfileIdState(localId);
    }
  };

  const setPublicationMode = async (mode: PublicationMode) => {
    try {
      console.log('[ModeContext] 🔄 Setting publication mode to:', mode);
      
      await AsyncStorage.setItem(PUBLICATION_MODE_KEY, mode);
      setPublicationModeState(mode);
      console.log('[ModeContext] ✅ Publication mode saved to storage:', mode);

      // FIXED: Auto-reset local selection when switching to cliente publication mode
      if (mode === 'cliente') {
        await setSelectedLocalId(null);
      }
    } catch (error) {
      console.error('[ModeContext] ❌ Error saving publication mode:', error);
      setPublicationModeState(mode);
    }
  };

  return (
    <ModeContext.Provider value={{ 
      currentMode, 
      setCurrentMode, 
      selectedLocalId, 
      setSelectedLocalId,
      isInteractingAsLocal,
      setIsInteractingAsLocal,
      activeLocalProfileId,
      setActiveLocalProfileId,
      publicationMode,
      setPublicationMode,
    }}>
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
