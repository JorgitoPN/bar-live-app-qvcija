
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { supabase } from '@/utils/supabase';

type UserMode = 'cliente' | 'propietario' | 'admin';

interface LocalProfile {
  id: string;
  nombre: string;
  imagen_url?: string;
  tipo: string;
}

interface ModeContextType {
  currentMode: UserMode;
  setCurrentMode: (mode: UserMode) => Promise<void>;
  
  // Active profile management
  activeProfileId: string | null; // The current active user ID (could be client user or local profile user)
  activeProfileType: 'cliente' | 'local'; // Type of the active profile
  activeLocalData: LocalProfile | null; // If activeProfileType is 'local', this contains the local data
  
  // Owner's local profiles
  ownedLocals: LocalProfile[]; // All locals owned by the current user
  loadOwnedLocals: () => Promise<void>;
  
  // Profile switching
  switchToClientProfile: () => Promise<void>;
  switchToLocalProfile: (localId: string) => Promise<void>;
  
  // Legacy support (for backwards compatibility)
  selectedLocalId: string | null;
  isInteractingAsLocal: boolean;
  activeLocalProfileId: string | null;
  publicationMode: 'cliente' | 'local';
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

const MODE_STORAGE_KEY = '@barlive_user_mode';
const ACTIVE_PROFILE_STORAGE_KEY = '@barlive_active_profile';
const ACTIVE_PROFILE_TYPE_STORAGE_KEY = '@barlive_active_profile_type';

export function ModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentMode, setCurrentModeState] = useState<UserMode>('cliente');
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [activeProfileType, setActiveProfileTypeState] = useState<'cliente' | 'local'>('cliente');
  const [activeLocalData, setActiveLocalData] = useState<LocalProfile | null>(null);
  const [ownedLocals, setOwnedLocals] = useState<LocalProfile[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize all state from AsyncStorage on mount
  useEffect(() => {
    const initializeMode = async () => {
      try {
        console.log('[ModeContext] 🔄 Initializing from AsyncStorage...');
        
        const [savedMode, savedProfileId, savedProfileType] = await Promise.all([
          AsyncStorage.getItem(MODE_STORAGE_KEY),
          AsyncStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY),
          AsyncStorage.getItem(ACTIVE_PROFILE_TYPE_STORAGE_KEY),
        ]);
        
        // Restore mode
        if (savedMode && (savedMode === 'cliente' || savedMode === 'propietario' || savedMode === 'admin')) {
          if (user) {
            const userRole = user.rol_app || 'cliente';
            
            const isValidMode = 
              (savedMode === 'cliente') ||
              (savedMode === 'propietario' && (userRole === 'propietario' || userRole === 'admin')) ||
              (savedMode === 'admin' && userRole === 'admin');
            
            if (isValidMode) {
              console.log('[ModeContext] ✅ Restored mode from storage:', savedMode);
              setCurrentModeState(savedMode as UserMode);
            }
          } else if (savedMode === 'cliente') {
            setCurrentModeState('cliente');
          }
        }

        // Restore active profile
        if (savedProfileId && savedProfileType) {
          console.log('[ModeContext] ✅ Restored active profile:', savedProfileId, savedProfileType);
          setActiveProfileIdState(savedProfileId);
          setActiveProfileTypeState(savedProfileType as 'cliente' | 'local');
          
          // If it's a local profile, load the local data
          if (savedProfileType === 'local') {
            const { data: localData } = await supabase
              .from('locales')
              .select('id, nombre, imagen_url, tipo')
              .eq('id', savedProfileId)
              .single();
            
            if (localData) {
              setActiveLocalData(localData);
            }
          }
        } else if (user) {
          // Default to client profile
          setActiveProfileIdState(user.id);
          setActiveProfileTypeState('cliente');
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

  // Load owned locals when user changes or mode changes to propietario
  useEffect(() => {
    if (user && (currentMode === 'propietario' || user.rol_app === 'propietario' || user.rol_app === 'admin')) {
      loadOwnedLocals();
    }
  }, [user, currentMode]);

  const loadOwnedLocals = async () => {
    if (!user) {
      setOwnedLocals([]);
      return;
    }

    try {
      console.log('[ModeContext] 🔄 Loading owned locals for user:', user.id);
      
      const { data, error } = await supabase
        .from('propietarios_locales')
        .select(`
          local_id,
          locales (
            id,
            nombre,
            imagen_url,
            tipo
          )
        `)
        .eq('propietario_id', user.id);

      if (error) {
        console.error('[ModeContext] ❌ Error loading owned locals:', error);
        return;
      }

      const locals = data
        ?.map(item => item.locales)
        .filter(Boolean)
        .map(local => ({
          id: local.id,
          nombre: local.nombre,
          imagen_url: local.imagen_url,
          tipo: local.tipo,
        })) || [];

      console.log('[ModeContext] ✅ Loaded', locals.length, 'owned locals');
      setOwnedLocals(locals);
    } catch (error) {
      console.error('[ModeContext] ❌ Error loading owned locals:', error);
      setOwnedLocals([]);
    }
  };

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

  const switchToClientProfile = async () => {
    if (!user) {
      console.warn('[ModeContext] ⚠️ Cannot switch to client profile: no user');
      return;
    }

    try {
      console.log('[ModeContext] 🔄 Switching to client profile:', user.id);
      
      // FIXED: First update the mode to cliente
      await setCurrentMode('cliente');
      
      // Then update the profile information
      await AsyncStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, user.id);
      await AsyncStorage.setItem(ACTIVE_PROFILE_TYPE_STORAGE_KEY, 'cliente');
      
      setActiveProfileIdState(user.id);
      setActiveProfileTypeState('cliente');
      setActiveLocalData(null);
      
      console.log('[ModeContext] ✅ Switched to client profile and cliente mode');
    } catch (error) {
      console.error('[ModeContext] ❌ Error switching to client profile:', error);
    }
  };

  const switchToLocalProfile = async (localId: string) => {
    if (!user) {
      console.warn('[ModeContext] ⚠️ Cannot switch to local profile: no user');
      return;
    }

    try {
      console.log('[ModeContext] 🔄 Switching to local profile:', localId);
      
      // Verify user owns this local
      const { data: ownershipData } = await supabase
        .from('propietarios_locales')
        .select('id')
        .eq('propietario_id', user.id)
        .eq('local_id', localId)
        .single();

      if (!ownershipData) {
        console.error('[ModeContext] ❌ User does not own this local');
        return;
      }

      // Load local data
      const { data: localData, error: localError } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url, tipo')
        .eq('id', localId)
        .single();

      if (localError || !localData) {
        console.error('[ModeContext] ❌ Error loading local data:', localError);
        return;
      }

      // FIXED: First update the mode to propietario
      await setCurrentMode('propietario');
      
      // Then update the profile information
      await AsyncStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, localId);
      await AsyncStorage.setItem(ACTIVE_PROFILE_TYPE_STORAGE_KEY, 'local');
      
      setActiveProfileIdState(localId);
      setActiveProfileTypeState('local');
      setActiveLocalData(localData);
      
      console.log('[ModeContext] ✅ Switched to local profile and propietario mode:', localData.nombre);
    } catch (error) {
      console.error('[ModeContext] ❌ Error switching to local profile:', error);
    }
  };

  // Legacy support - compute these values from the new state
  const selectedLocalId = activeProfileType === 'local' ? activeProfileId : null;
  const isInteractingAsLocal = activeProfileType === 'local';
  const activeLocalProfileId = activeProfileType === 'local' ? activeProfileId : null;
  const publicationMode = activeProfileType === 'local' ? 'local' : 'cliente';

  return (
    <ModeContext.Provider value={{ 
      currentMode, 
      setCurrentMode,
      activeProfileId,
      activeProfileType,
      activeLocalData,
      ownedLocals,
      loadOwnedLocals,
      switchToClientProfile,
      switchToLocalProfile,
      // Legacy support
      selectedLocalId,
      isInteractingAsLocal,
      activeLocalProfileId,
      publicationMode,
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
