
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useImpersonation } from './ImpersonationContext';
import { supabase } from '@/utils/supabase';

type Mode = 'cliente' | 'propietario' | 'admin';
type ProfileType = 'user' | 'local';

interface ModeContextType {
  currentMode: Mode;
  setCurrentMode: (mode: Mode) => void;
  activeProfileId: string | null;
  activeProfileType: ProfileType;
  switchToClientProfile: () => Promise<void>;
  switchToLocalProfile: (localId: string) => Promise<void>;
  ownedLocals: any[];
  loadOwnedLocals: () => Promise<void>;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function useMode() {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
}

/**
 * ModeProvider - Manages application mode and profile switching
 * 
 * CRITICAL FIX: Removed circular dependencies from useCallback dependency arrays
 * - setCurrentMode no longer depends on switchToClientProfile/switchToLocalProfile
 * - This fixes the "Cannot access before initialization" error
 */
export function ModeProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();
  const { isImpersonating, impersonatedUser, effectiveUser } = useImpersonation();
  
  const user = effectiveUser || authUser;
  
  const [currentModeState, setCurrentModeState] = useState<Mode>('cliente');
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [activeProfileType, setActiveProfileType] = useState<ProfileType>('user');
  const [ownedLocals, setOwnedLocals] = useState<any[]>([]);

  // Load owned locals
  const loadOwnedLocals = useCallback(async () => {
    if (!user) {
      setOwnedLocals([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url, propietario_id')
        .eq('propietario_id', user.id)
        .eq('activo', true);

      if (error) {
        console.error('[ModeContext] Error loading owned locals:', error);
        setOwnedLocals([]);
        return;
      }

      setOwnedLocals(data || []);
      console.log('[ModeContext] ✅ Loaded owned locals:', data?.length || 0);
    } catch (error) {
      console.error('[ModeContext] Error loading owned locals:', error);
      setOwnedLocals([]);
    }
  }, [user]);

  // Initialize mode based on user role
  useEffect(() => {
    if (!user) {
      setCurrentModeState('cliente');
      setActiveProfileId(null);
      setActiveProfileType('user');
      return;
    }

    const userRole = user.rol_app || 'cliente';
    
    if (userRole === 'admin') {
      setCurrentModeState('admin');
    } else if (userRole === 'propietario') {
      setCurrentModeState('propietario');
    } else {
      setCurrentModeState('cliente');
    }

    setActiveProfileId(user.id);
    setActiveProfileType('user');
    
    console.log('[ModeContext] ✅ Initialized mode:', {
      mode: userRole === 'admin' ? 'admin' : userRole === 'propietario' ? 'propietario' : 'cliente',
      userId: user.id,
      userRole
    });
  }, [user]);

  // Load owned locals when user changes
  useEffect(() => {
    if (user) {
      loadOwnedLocals();
    }
  }, [user, loadOwnedLocals]);

  // ✅ CRITICAL FIX: Removed switchToClientProfile and switchToLocalProfile from dependencies
  // These functions are defined AFTER setCurrentMode, causing circular dependency
  const setCurrentMode = useCallback((mode: Mode) => {
    if (!user) {
      console.warn('[ModeContext] Cannot set mode without user');
      return;
    }

    console.log('[ModeContext] 🔄 Setting mode:', mode);
    setCurrentModeState(mode);

    // Reset to user profile when switching to cliente or admin mode
    if (mode === 'cliente' || mode === 'admin') {
      setActiveProfileId(user.id);
      setActiveProfileType('user');
      console.log('[ModeContext] ✅ Reset to user profile');
    }
  }, [user, ownedLocals, loadOwnedLocals]); // ✅ Removed circular dependencies

  // Switch to client profile
  const switchToClientProfile = useCallback(async () => {
    if (!user) {
      console.warn('[ModeContext] Cannot switch to client profile without user');
      return;
    }

    console.log('[ModeContext] 🔄 Switching to CLIENT profile');
    setCurrentModeState('cliente');
    setActiveProfileId(user.id);
    setActiveProfileType('user');
    console.log('[ModeContext] ✅ Switched to client profile');
  }, [user]);

  // Switch to local profile
  const switchToLocalProfile = useCallback(async (localId: string) => {
    if (!user) {
      console.warn('[ModeContext] Cannot switch to local profile without user');
      return;
    }

    try {
      // Verify user owns this local
      const { data: local, error } = await supabase
        .from('locales')
        .select('id, nombre, propietario_id')
        .eq('id', localId)
        .eq('propietario_id', user.id)
        .single();

      if (error || !local) {
        console.error('[ModeContext] User does not own this local:', localId);
        return;
      }

      console.log('[ModeContext] 🔄 Switching to LOCAL profile:', local.nombre);
      setCurrentModeState('propietario');
      setActiveProfileId(localId);
      setActiveProfileType('local');
      console.log('[ModeContext] ✅ Switched to local profile:', localId);
    } catch (error) {
      console.error('[ModeContext] Error switching to local profile:', error);
    }
  }, [user, ownedLocals, loadOwnedLocals]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    currentMode: currentModeState,
    setCurrentMode,
    activeProfileId,
    activeProfileType,
    switchToClientProfile,
    switchToLocalProfile,
    ownedLocals,
    loadOwnedLocals,
  }), [
    currentModeState,
    setCurrentMode,
    activeProfileId,
    activeProfileType,
    switchToClientProfile,
    switchToLocalProfile,
    ownedLocals,
    loadOwnedLocals,
  ]);

  return (
    <ModeContext.Provider value={contextValue}>
      {children}
    </ModeContext.Provider>
  );
}
