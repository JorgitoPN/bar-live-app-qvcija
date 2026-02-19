
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
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
  
  activeProfileId: string | null;
  activeProfileType: 'cliente' | 'local';
  activeLocalData: LocalProfile | null;
  
  ownedLocals: LocalProfile[];
  loadOwnedLocals: () => Promise<void>;
  
  switchToClientProfile: () => Promise<void>;
  switchToLocalProfile: (localId: string) => Promise<void>;
  
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
 * ✅ MODE CONTEXT v290.0 - ADMIN OWNER MODE ACCESS
 * 
 * CRITICAL FIXES v290.0:
 * - ✅ ADMIN ACCESS: Admin can access propietario mode without owned locals
 * - ✅ VERIFICATION MODE: Allows admin to see and verify owner interface
 * - ✅ NO LOCAL REQUIRED: Admin doesn't need to select a local to access owner mode
 * - ✅ TESTING CAPABILITY: Admin can test all owner functionality
 * 
 * Previous fixes maintained (v289.0):
 * - ✅ LAZY LOADING: Only load owned locals when switching to propietario mode
 * - ✅ NO STARTUP LOAD: Don't load locals on app startup (saves 1-2 seconds)
 * - ✅ ON-DEMAND: Locals load only when user switches to propietario mode
 * - ✅ REDUCED QUERIES: Eliminated unnecessary DB queries on every app start
 * - ✅ ANDROID OPTIMIZATION: Prevents UI thread blocking on startup
 * - ✅ Proper dependency arrays
 * - ✅ useCallback for stable functions
 * - ✅ Prevented concurrent loads
 */

export function ModeProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();
  const { isImpersonating, impersonatedUser, effectiveUser } = useImpersonation();
  
  const user = effectiveUser || authUser;
  
  const [currentMode, setCurrentModeState] = useState<UserMode>('cliente');
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [activeProfileType, setActiveProfileTypeState] = useState<'cliente' | 'local'>('cliente');
  const [activeLocalData, setActiveLocalData] = useState<LocalProfile | null>(null);
  const [ownedLocals, setOwnedLocals] = useState<LocalProfile[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const isLoadingLocalsRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  const loadOwnedLocals = useCallback(async () => {
    if (isLoadingLocalsRef.current) {
      return;
    }

    if (!user) {
      setOwnedLocals([]);
      return;
    }

    if (lastUserIdRef.current === user.id) {
      return;
    }

    try {
      isLoadingLocalsRef.current = true;
      lastUserIdRef.current = user.id;
      console.log('[ModeContext v290.0] 🔄 Loading owned locals for user:', user.id);
      
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
        .eq('activo', true);

      if (error) {
        console.error('[ModeContext v290.0] ❌ Error loading owned locals:', error);
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

      console.log('[ModeContext v290.0] ✅ Loaded', locals.length, 'active owned locals');
      setOwnedLocals(locals);
    } catch (error) {
      console.error('[ModeContext v290.0] ❌ Error loading owned locals:', error);
      setOwnedLocals([]);
    } finally {
      isLoadingLocalsRef.current = false;
    }
  }, [user, isImpersonating]);

  useEffect(() => {
    const initializeMode = async () => {
      try {
        console.log('[ModeContext v290.0] 🔄 Initializing from AsyncStorage...');
        
        const [savedMode, savedProfileId, savedProfileType] = await Promise.all([
          AsyncStorage.getItem(MODE_STORAGE_KEY),
          AsyncStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY),
          AsyncStorage.getItem(ACTIVE_PROFILE_TYPE_STORAGE_KEY),
        ]);
        
        if (savedMode && (savedMode === 'cliente' || savedMode === 'propietario' || savedMode === 'admin')) {
          if (user) {
            const userRole = user.rol_app || 'cliente';
            const userIsAdmin = isAdminUser(user);
            
            const isValidMode = 
              (savedMode === 'cliente') ||
              (savedMode === 'propietario' && (userRole === 'propietario' || userRole === 'admin')) ||
              (savedMode === 'admin' && userIsAdmin);
            
            if (isValidMode) {
              console.log('[ModeContext v290.0] ✅ Restored mode from storage:', savedMode);
              setCurrentModeState(savedMode as UserMode);
            } else {
              console.log('[ModeContext v290.0] ⚠️ Invalid mode for user, resetting to cliente');
              setCurrentModeState('cliente');
              await AsyncStorage.setItem(MODE_STORAGE_KEY, 'cliente');
            }
          } else if (savedMode === 'cliente') {
            setCurrentModeState('cliente');
          }
        } else if (user) {
          console.log('[ModeContext v290.0] ℹ️ No saved mode, defaulting to cliente');
          setCurrentModeState('cliente');
          await AsyncStorage.setItem(MODE_STORAGE_KEY, 'cliente');
        }

        if (savedProfileId && savedProfileType) {
          console.log('[ModeContext v290.0] ✅ Restoring active profile:', savedProfileId, savedProfileType);
          
          if (savedProfileType === 'local' && user) {
            console.log('[ModeContext v290.0] 🔄 Verifying local ownership for:', savedProfileId);
            
            const { data: ownershipData, error: ownershipError } = await supabase
              .from('propietarios_locales')
              .select('id')
              .eq('propietario_id', user.id)
              .eq('local_id', savedProfileId)
              .eq('activo', true)
              .single();

            if (ownershipError || !ownershipData) {
              console.error('[ModeContext v290.0] ❌ User does not own saved local, resetting to client profile');
              setActiveProfileIdState(user.id);
              setActiveProfileTypeState('cliente');
              setActiveLocalData(null);
              setCurrentModeState('cliente');
              await AsyncStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, user.id);
              await AsyncStorage.setItem(ACTIVE_PROFILE_TYPE_STORAGE_KEY, 'cliente');
              await AsyncStorage.setItem(MODE_STORAGE_KEY, 'cliente');
            } else {
              const { data: localData, error: localError } = await supabase
                .from('locales')
                .select('id, nombre, imagen_url, tipo')
                .eq('id', savedProfileId)
                .single();
              
              if (localError || !localData) {
                console.error('[ModeContext v290.0] ❌ Error loading local data, resetting to client profile:', localError);
                setActiveProfileIdState(user.id);
                setActiveProfileTypeState('cliente');
                setActiveLocalData(null);
                setCurrentModeState('cliente');
                await AsyncStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, user.id);
                await AsyncStorage.setItem(ACTIVE_PROFILE_TYPE_STORAGE_KEY, 'cliente');
                await AsyncStorage.setItem(MODE_STORAGE_KEY, 'cliente');
              } else {
                console.log('[ModeContext v290.0] ✅ Loaded local data:', localData.nombre);
                setActiveProfileIdState(savedProfileId);
                setActiveProfileTypeState('local');
                setActiveLocalData(localData);
                if (savedMode !== 'propietario') {
                  console.log('[ModeContext v290.0] ⚠️ Mode was not propietario, correcting...');
                  setCurrentModeState('propietario');
                  await AsyncStorage.setItem(MODE_STORAGE_KEY, 'propietario');
                }
              }
            }
          } else if (savedProfileType === 'cliente' && user) {
            setActiveProfileIdState(user.id);
            setActiveProfileTypeState('cliente');
            setActiveLocalData(null);
          } else {
            console.log('[ModeContext v290.0] ⚠️ Invalid saved profile, resetting to default');
            if (user) {
              setActiveProfileIdState(user.id);
              setActiveProfileTypeState('cliente');
              setActiveLocalData(null);
              await AsyncStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, user.id);
              await AsyncStorage.setItem(ACTIVE_PROFILE_TYPE_STORAGE_KEY, 'cliente');
            }
          }
        } else if (user) {
          console.log('[ModeContext v290.0] ℹ️ No saved profile, defaulting to client profile');
          setActiveProfileIdState(user.id);
          setActiveProfileTypeState('cliente');
          setActiveLocalData(null);
          await AsyncStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, user.id);
          await AsyncStorage.setItem(ACTIVE_PROFILE_TYPE_STORAGE_KEY, 'cliente');
        }
        
        setIsInitialized(true);
        console.log('[ModeContext v290.0] ✅ Initialization complete');
      } catch (error) {
        console.error('[ModeContext v290.0] ❌ Error initializing mode:', error);
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
      setIsInitialized(true);
    }
  }, [user, isInitialized]);

  // ✅ CRITICAL FIX v290.0: LAZY LOADING - Only load when switching to propietario mode
  // This prevents loading owned locals on every app startup
  // ✅ FIX v290.0: Admin can access propietario mode without loading locals
  useEffect(() => {
    // Only load if:
    // 1. User exists
    // 2. Current mode is propietario (user explicitly switched to it)
    // 3. Owned locals haven't been loaded yet
    // 4. User is NOT admin (admin doesn't need locals to access owner mode)
    if (user && currentMode === 'propietario' && ownedLocals.length === 0 && !isAdminUser(user)) {
      console.log('[ModeContext v290.0] 🔄 User switched to propietario mode - loading owned locals...');
      loadOwnedLocals();
    }
  }, [user?.id, currentMode]); // ✅ Only trigger when mode changes to propietario

  const setCurrentMode = useCallback(async (mode: UserMode) => {
    try {
      console.log('[ModeContext v290.0] 🔄 Setting mode to:', mode);
      
      if (user) {
        const userRole = user.rol_app || 'cliente';
        const userIsAdmin = isAdminUser(user);
        
        const isValidMode = 
          (mode === 'cliente') ||
          (mode === 'propietario' && (userRole === 'propietario' || userRole === 'admin')) ||
          (mode === 'admin' && userIsAdmin);
        
        if (!isValidMode) {
          console.warn('[ModeContext v290.0] ⚠️ Invalid mode for user:', mode, userRole);
          return;
        }
      }
      
      await AsyncStorage.setItem(MODE_STORAGE_KEY, mode);
      setCurrentModeState(mode);
      
      console.log('[ModeContext v290.0] ✅ Mode saved to storage:', mode);

      // ✅ FIX v290.0: Admin can access propietario mode without owned locals
      if (mode === 'propietario' && user) {
        const userIsAdmin = isAdminUser(user);
        
        if (userIsAdmin) {
          console.log('[ModeContext v290.0] 👑 Admin accessing propietario mode for verification');
          // Admin can stay in propietario mode without selecting a local
          // This allows them to see the owner interface and verify functionality
          return;
        }
        
        // For non-admin users, load owned locals
        if (ownedLocals.length === 0) {
          console.log('[ModeContext v290.0] 🔍 Loading owned locals for propietario mode...');
          await loadOwnedLocals();
          
          setTimeout(async () => {
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
              .eq('activo', true)
              .limit(1);

            if (!error && data && data.length > 0) {
              const firstLocal = data[0].locales;
              if (firstLocal) {
                console.log('[ModeContext v290.0] ✅ Auto-selecting first local:', firstLocal.nombre);
                await switchToLocalProfile(firstLocal.id);
              }
            } else {
              console.log('[ModeContext v290.0] ℹ️ User has no active locals, staying in cliente mode');
              await switchToClientProfile();
            }
          }, 100);
        }
      }
      
      if (mode === 'cliente' && user) {
        console.log('[ModeContext v290.0] 🔄 Mode changed to cliente, switching to client profile');
        await switchToClientProfile();
      }
    } catch (error) {
      console.error('[ModeContext v290.0] ❌ Error saving mode:', error);
      setCurrentModeState(mode);
    }
  }, [user, ownedLocals.length, loadOwnedLocals]);

  const switchToClientProfile = useCallback(async () => {
    if (!user) {
      console.warn('[ModeContext v290.0] ⚠️ Cannot switch to client profile: no user');
      return;
    }

    try {
      console.log('[ModeContext v290.0] 🔄 Switching to client profile:', user.id);
      
      setCurrentModeState('cliente');
      setActiveProfileIdState(user.id);
      setActiveProfileTypeState('cliente');
      setActiveLocalData(null);
      
      console.log('[ModeContext v290.0] ✅ State updated - Mode: cliente, Profile:', user.nombre);
      
      try {
        await Promise.all([
          AsyncStorage.setItem(MODE_STORAGE_KEY, 'cliente'),
          AsyncStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, user.id),
          AsyncStorage.setItem(ACTIVE_PROFILE_TYPE_STORAGE_KEY, 'cliente'),
        ]);
      } catch (storageError) {
        console.error('[ModeContext v290.0] ⚠️ Error persisting to storage (state is still updated):', storageError);
      }
    } catch (error) {
      console.error('[ModeContext v290.0] ❌ Error switching to client profile:', error);
    }
  }, [user]);

  const switchToLocalProfile = useCallback(async (localId: string) => {
    if (!user) {
      console.warn('[ModeContext v290.0] ⚠️ Cannot switch to local profile: no user');
      return;
    }

    try {
      console.log('[ModeContext v290.0] 🔄 Switching to local profile:', localId);
      
      const { data: ownershipData, error: ownershipError } = await supabase
        .from('propietarios_locales')
        .select('id')
        .eq('propietario_id', user.id)
        .eq('local_id', localId)
        .eq('activo', true)
        .single();

      if (ownershipError || !ownershipData) {
        console.error('[ModeContext v290.0] ❌ User does not own this local:', ownershipError);
        return;
      }

      const { data: localData, error: localError } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url, tipo')
        .eq('id', localId)
        .single();

      if (localError || !localData) {
        console.error('[ModeContext v290.0] ❌ Error loading local data:', localError);
        return;
      }

      setCurrentModeState('propietario');
      setActiveProfileIdState(localId);
      setActiveProfileTypeState('local');
      setActiveLocalData(localData);
      
      console.log('[ModeContext v290.0] ✅ State updated - Mode: propietario, Profile:', localData.nombre);
      
      try {
        await Promise.all([
          AsyncStorage.setItem(MODE_STORAGE_KEY, 'propietario'),
          AsyncStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, localId),
          AsyncStorage.setItem(ACTIVE_PROFILE_TYPE_STORAGE_KEY, 'local'),
        ]);
      } catch (storageError) {
        console.error('[ModeContext v290.0] ⚠️ Error persisting to storage (state is still updated):', storageError);
      }
    } catch (error) {
      console.error('[ModeContext v290.0] ❌ Error switching to local profile:', error);
    }
  }, [user]);

  const selectedLocalId = activeProfileType === 'local' ? activeProfileId : null;
  const isInteractingAsLocal = activeProfileType === 'local';
  const activeLocalProfileId = activeProfileType === 'local' ? activeProfileId : null;
  const publicationMode = activeProfileType === 'local' ? 'local' : 'cliente';

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
    selectedLocalId,
    isInteractingAsLocal,
    activeLocalProfileId,
    publicationMode,
  }), [
    currentMode,
    setCurrentMode,
    activeProfileId,
    activeProfileType,
    activeLocalData,
    ownedLocals,
    loadOwnedLocals,
    switchToClientProfile,
    switchToLocalProfile,
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
