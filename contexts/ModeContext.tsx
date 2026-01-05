
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useImpersonation } from './ImpersonationContext';
import { supabase } from '@/utils/supabase';
import { isAdminUser } from '@/utils/adminAccess';

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

/**
 * ✅ MODE CONTEXT v97.0 - CIRCULAR DEPENDENCY FIX
 * 
 * CRITICAL FIXES v97.0:
 * - ✅ Fixed "Maximum update depth exceeded" error
 * - ✅ Removed circular dependencies in useEffect hooks
 * - ✅ Used useMemo to prevent unnecessary context recreation
 * - ✅ Simplified dependency arrays to prevent infinite loops
 * - ✅ Proper initialization flow without circular triggers
 */

export function ModeProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();
  const { isImpersonating, impersonatedUser, effectiveUser } = useImpersonation();
  
  // ✅ FIXED: Use effective user for all operations
  const user = effectiveUser || authUser;
  
  const [currentMode, setCurrentModeState] = useState<UserMode>('cliente');
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [activeProfileType, setActiveProfileTypeState] = useState<'cliente' | 'local'>('cliente');
  const [activeLocalData, setActiveLocalData] = useState<LocalProfile | null>(null);
  const [ownedLocals, setOwnedLocals] = useState<LocalProfile[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // ✅ CRITICAL FIX v97.0: Use ref to prevent concurrent loads
  const isLoadingLocalsRef = useRef(false);

  // ✅ CRITICAL FIX v97.0: Memoize loadOwnedLocals to prevent recreation
  const loadOwnedLocals = useCallback(async () => {
    // ✅ Prevent concurrent loads
    if (isLoadingLocalsRef.current) {
      console.log('[ModeContext v97.0] Already loading locals, skipping...');
      return;
    }

    if (!user) {
      setOwnedLocals([]);
      return;
    }

    try {
      isLoadingLocalsRef.current = true;
      console.log('[ModeContext v97.0] 🔄 Loading owned locals for user:', user.id, isImpersonating ? '(impersonated)' : '(actual)');
      
      // ✅ CRITICAL FIX v55.0: Only load ACTIVE local assignments
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
        .eq('propietario_id', user.id)
        .eq('activo', true); // ✅ CRITICAL: Only load active assignments

      if (error) {
        console.error('[ModeContext v97.0] ❌ Error loading owned locals:', error);
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

      console.log('[ModeContext v97.0] ✅ Loaded', locals.length, 'active owned locals');
      setOwnedLocals(locals);
    } catch (error) {
      console.error('[ModeContext v97.0] ❌ Error loading owned locals:', error);
      setOwnedLocals([]);
    } finally {
      isLoadingLocalsRef.current = false;
    }
  }, [user?.id, isImpersonating]);

  // Initialize all state from AsyncStorage on mount
  useEffect(() => {
    const initializeMode = async () => {
      try {
        console.log('[ModeContext v97.0] 🔄 Initializing from AsyncStorage...');
        
        const [savedMode, savedProfileId, savedProfileType] = await Promise.all([
          AsyncStorage.getItem(MODE_STORAGE_KEY),
          AsyncStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY),
          AsyncStorage.getItem(ACTIVE_PROFILE_TYPE_STORAGE_KEY),
        ]);
        
        console.log('[ModeContext v97.0] 📦 Loaded from storage:', { savedMode, savedProfileId, savedProfileType });
        
        // Restore mode
        if (savedMode && (savedMode === 'cliente' || savedMode === 'propietario' || savedMode === 'admin')) {
          if (user) {
            const userRole = user.rol_app || 'cliente';
            
            // ✅ CRITICAL FIX: Admin mode is ONLY available to authorized admin users
            const userIsAdmin = isAdminUser(user);
            
            const isValidMode = 
              (savedMode === 'cliente') ||
              (savedMode === 'propietario' && (userRole === 'propietario' || userRole === 'admin')) ||
              (savedMode === 'admin' && userIsAdmin); // ✅ Check both role AND email
            
            if (isValidMode) {
              console.log('[ModeContext v97.0] ✅ Restored mode from storage:', savedMode);
              setCurrentModeState(savedMode as UserMode);
            } else {
              console.log('[ModeContext v97.0] ⚠️ Invalid mode for user, resetting to cliente');
              setCurrentModeState('cliente');
              // Clear invalid mode from storage
              await AsyncStorage.setItem(MODE_STORAGE_KEY, 'cliente');
            }
          } else if (savedMode === 'cliente') {
            setCurrentModeState('cliente');
          }
        } else if (user) {
          // No saved mode, default to cliente
          console.log('[ModeContext v97.0] ℹ️ No saved mode, defaulting to cliente');
          setCurrentModeState('cliente');
          await AsyncStorage.setItem(MODE_STORAGE_KEY, 'cliente');
        }

        // Restore active profile
        if (savedProfileId && savedProfileType) {
          console.log('[ModeContext v97.0] ✅ Restoring active profile:', savedProfileId, savedProfileType);
          
          // If it's a local profile, verify ownership and load the local data
          if (savedProfileType === 'local' && user) {
            console.log('[ModeContext v97.0] 🔄 Verifying local ownership and loading data for:', savedProfileId);
            
            // ✅ CRITICAL FIX v55.0: Verify user owns this local AND it's active
            const { data: ownershipData, error: ownershipError } = await supabase
              .from('propietarios_locales')
              .select('id')
              .eq('propietario_id', user.id)
              .eq('local_id', savedProfileId)
              .eq('activo', true) // ✅ CRITICAL: Only allow active assignments
              .single();

            if (ownershipError || !ownershipData) {
              console.error('[ModeContext v97.0] ❌ User does not own saved local, resetting to client profile');
              setActiveProfileIdState(user.id);
              setActiveProfileTypeState('cliente');
              setActiveLocalData(null);
              setCurrentModeState('cliente');
              // Clear invalid profile from storage
              await AsyncStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, user.id);
              await AsyncStorage.setItem(ACTIVE_PROFILE_TYPE_STORAGE_KEY, 'cliente');
              await AsyncStorage.setItem(MODE_STORAGE_KEY, 'cliente');
            } else {
              // Load local data
              const { data: localData, error: localError } = await supabase
                .from('locales')
                .select('id, nombre, imagen_url, tipo')
                .eq('id', savedProfileId)
                .single();
              
              if (localError || !localData) {
                console.error('[ModeContext v97.0] ❌ Error loading local data, resetting to client profile:', localError);
                setActiveProfileIdState(user.id);
                setActiveProfileTypeState('cliente');
                setActiveLocalData(null);
                setCurrentModeState('cliente');
                // Clear invalid profile from storage
                await AsyncStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, user.id);
                await AsyncStorage.setItem(ACTIVE_PROFILE_TYPE_STORAGE_KEY, 'cliente');
                await AsyncStorage.setItem(MODE_STORAGE_KEY, 'cliente');
              } else {
                console.log('[ModeContext v97.0] ✅ Loaded local data:', localData.nombre);
                setActiveProfileIdState(savedProfileId);
                setActiveProfileTypeState('local');
                setActiveLocalData(localData);
                // Ensure mode is propietario when restoring local profile
                if (savedMode !== 'propietario') {
                  console.log('[ModeContext v97.0] ⚠️ Mode was not propietario, correcting...');
                  setCurrentModeState('propietario');
                  await AsyncStorage.setItem(MODE_STORAGE_KEY, 'propietario');
                }
              }
            }
          } else if (savedProfileType === 'cliente' && user) {
            // Restore client profile
            setActiveProfileIdState(user.id);
            setActiveProfileTypeState('cliente');
            setActiveLocalData(null);
          } else {
            // Invalid saved profile, reset to default
            console.log('[ModeContext v97.0] ⚠️ Invalid saved profile, resetting to default');
            if (user) {
              setActiveProfileIdState(user.id);
              setActiveProfileTypeState('cliente');
              setActiveLocalData(null);
              await AsyncStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, user.id);
              await AsyncStorage.setItem(ACTIVE_PROFILE_TYPE_STORAGE_KEY, 'cliente');
            }
          }
        } else if (user) {
          // Default to client profile
          console.log('[ModeContext v97.0] ℹ️ No saved profile, defaulting to client profile');
          setActiveProfileIdState(user.id);
          setActiveProfileTypeState('cliente');
          setActiveLocalData(null);
          await AsyncStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, user.id);
          await AsyncStorage.setItem(ACTIVE_PROFILE_TYPE_STORAGE_KEY, 'cliente');
        }
        
        setIsInitialized(true);
        console.log('[ModeContext v97.0] ✅ Initialization complete');
      } catch (error) {
        console.error('[ModeContext v97.0] ❌ Error initializing mode:', error);
        if (user) {
          setCurrentModeState('cliente');
          setActiveProfileIdState(user.id);
          setActiveProfileTypeState('cliente');
          setActiveLocalData(null);
        }
        setIsInitialized(true);
      }
    };

    if (!isInitialized && user) {
      initializeMode();
    } else if (!user && !isInitialized) {
      // No user, just mark as initialized
      setIsInitialized(true);
    }
  }, [user?.id, isInitialized]);

  // ✅ CRITICAL FIX v97.0: Simplified dependency - only load when user changes or mode becomes propietario
  useEffect(() => {
    if (user && (currentMode === 'propietario' || user.rol_app === 'propietario' || user.rol_app === 'admin')) {
      loadOwnedLocals();
    }
  }, [user?.id, currentMode]);

  const setCurrentMode = async (mode: UserMode) => {
    try {
      console.log('[ModeContext v97.0] 🔄 Setting mode to:', mode);
      
      // Validate mode is allowed for current user
      if (user) {
        const userRole = user.rol_app || 'cliente';
        
        // ✅ CRITICAL FIX: Admin mode is ONLY available to authorized admin users
        const userIsAdmin = isAdminUser(user);
        
        const isValidMode = 
          (mode === 'cliente') ||
          (mode === 'propietario' && (userRole === 'propietario' || userRole === 'admin')) ||
          (mode === 'admin' && userIsAdmin); // ✅ Check both role AND email
        
        if (!isValidMode) {
          console.warn('[ModeContext v97.0] ⚠️ Invalid mode for user:', mode, userRole);
          return;
        }
      }
      
      await AsyncStorage.setItem(MODE_STORAGE_KEY, mode);
      setCurrentModeState(mode);
      
      console.log('[ModeContext v97.0] ✅ Mode saved to storage:', mode);

      // 🆕 FEATURE 1 v53.0: Auto-select first local when switching to propietario mode
      if (mode === 'propietario' && user) {
        console.log('[ModeContext v97.0] 🔍 Auto-assigning first local role...');
        
        // Load owned locals if not already loaded
        if (ownedLocals.length === 0) {
          await loadOwnedLocals();
        }
        
        // Wait a bit for state to update
        setTimeout(async () => {
          // ✅ CRITICAL FIX v55.0: Only load ACTIVE local assignments
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
            .eq('propietario_id', user.id)
            .eq('activo', true) // ✅ CRITICAL: Only load active assignments
            .limit(1);

          if (!error && data && data.length > 0) {
            const firstLocal = data[0].locales;
            if (firstLocal) {
              console.log('[ModeContext v97.0] ✅ Auto-selecting first local:', firstLocal.nombre);
              await switchToLocalProfile(firstLocal.id);
            }
          } else {
            console.log('[ModeContext v97.0] ℹ️ User has no active locals, staying in cliente mode');
            // If no locals, switch back to cliente mode
            await switchToClientProfile();
          }
        }, 100);
      }
      
      // 🆕 FIX v53.0: When switching to cliente mode, automatically switch to client profile
      if (mode === 'cliente' && user) {
        console.log('[ModeContext v97.0] 🔄 Mode changed to cliente, switching to client profile');
        await switchToClientProfile();
      }
    } catch (error) {
      console.error('[ModeContext v97.0] ❌ Error saving mode:', error);
      setCurrentModeState(mode);
    }
  };

  const switchToClientProfile = async () => {
    if (!user) {
      console.warn('[ModeContext v97.0] ⚠️ Cannot switch to client profile: no user');
      return;
    }

    try {
      console.log('[ModeContext v97.0] 🔄 Switching to client profile:', user.id);
      
      // CRITICAL: Update state FIRST, then persist to storage
      // This ensures the UI updates immediately
      setCurrentModeState('cliente');
      setActiveProfileIdState(user.id);
      setActiveProfileTypeState('cliente');
      setActiveLocalData(null);
      
      console.log('[ModeContext v97.0] ✅ State updated - Mode: cliente, Profile:', user.nombre);
      
      // Then persist to storage (async, non-blocking)
      try {
        await Promise.all([
          AsyncStorage.setItem(MODE_STORAGE_KEY, 'cliente'),
          AsyncStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, user.id),
          AsyncStorage.setItem(ACTIVE_PROFILE_TYPE_STORAGE_KEY, 'cliente'),
        ]);
        console.log('[ModeContext v97.0] 📦 Persisted to storage:', { mode: 'cliente', profileId: user.id, profileType: 'cliente' });
      } catch (storageError) {
        console.error('[ModeContext v97.0] ⚠️ Error persisting to storage (state is still updated):', storageError);
      }
    } catch (error) {
      console.error('[ModeContext v97.0] ❌ Error switching to client profile:', error);
    }
  };

  const switchToLocalProfile = async (localId: string) => {
    if (!user) {
      console.warn('[ModeContext v97.0] ⚠️ Cannot switch to local profile: no user');
      return;
    }

    try {
      console.log('[ModeContext v97.0] 🔄 Switching to local profile:', localId);
      
      // ✅ CRITICAL FIX v55.0: Verify user owns this local AND it's active
      const { data: ownershipData, error: ownershipError } = await supabase
        .from('propietarios_locales')
        .select('id')
        .eq('propietario_id', user.id)
        .eq('local_id', localId)
        .eq('activo', true) // ✅ CRITICAL: Only allow active assignments
        .single();

      if (ownershipError || !ownershipData) {
        console.error('[ModeContext v97.0] ❌ User does not own this local:', ownershipError);
        return;
      }

      // Load local data
      const { data: localData, error: localError } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url, tipo')
        .eq('id', localId)
        .single();

      if (localError || !localData) {
        console.error('[ModeContext v97.0] ❌ Error loading local data:', localError);
        return;
      }

      // CRITICAL: Update state FIRST, then persist to storage
      // This ensures the UI updates immediately
      setCurrentModeState('propietario');
      setActiveProfileIdState(localId);
      setActiveProfileTypeState('local');
      setActiveLocalData(localData);
      
      console.log('[ModeContext v97.0] ✅ State updated - Mode: propietario, Profile:', localData.nombre);
      
      // Then persist to storage (async, non-blocking)
      try {
        await Promise.all([
          AsyncStorage.setItem(MODE_STORAGE_KEY, 'propietario'),
          AsyncStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, localId),
          AsyncStorage.setItem(ACTIVE_PROFILE_TYPE_STORAGE_KEY, 'local'),
        ]);
        console.log('[ModeContext v97.0] 📦 Persisted to storage:', { mode: 'propietario', profileId: localId, profileType: 'local' });
      } catch (storageError) {
        console.error('[ModeContext v97.0] ⚠️ Error persisting to storage (state is still updated):', storageError);
      }
    } catch (error) {
      console.error('[ModeContext v97.0] ❌ Error switching to local profile:', error);
    }
  };

  // Legacy support - compute these values from the new state
  const selectedLocalId = activeProfileType === 'local' ? activeProfileId : null;
  const isInteractingAsLocal = activeProfileType === 'local';
  const activeLocalProfileId = activeProfileType === 'local' ? activeProfileId : null;
  const publicationMode = activeProfileType === 'local' ? 'local' : 'cliente';

  // ✅ CRITICAL FIX v97.0: Memoize context value to prevent recreation
  const contextValue = useMemo(() => ({
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
  }), [
    currentMode,
    activeProfileId,
    activeProfileType,
    activeLocalData,
    ownedLocals,
    selectedLocalId,
    isInteractingAsLocal,
    activeLocalProfileId,
    publicationMode,
  ]);

  return (
    <ModeContext.Provider value={contextValue}>
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
