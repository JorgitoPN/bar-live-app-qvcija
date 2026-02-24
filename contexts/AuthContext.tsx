
/**
 * ✅ AUTH CONTEXT v3.2 - ALIASED TO ZUSTAND STORE
 * 
 * CRITICAL CHANGES v3.2 (PASO 3.2 - HOOK ALIASING):
 * - ✅ ALIASING: useAuth now internally calls useAuthStore
 * - ✅ NO PROVIDER NEEDED: Components can use useAuth without AuthProvider
 * - ✅ BACKWARD COMPATIBLE: Old components work without changes
 * - ✅ ZUSTAND POWERED: All state management through Zustand
 * - ✅ RESULT: Smooth migration without breaking existing code
 * 
 * This file now acts as a FACADE/ALIAS to the Zustand store.
 * The AuthProvider component has been removed.
 * All state is managed by useAuthStore from src/store/useAuthStore.ts
 */

import { useAuthStore } from '@/src/store/useAuthStore';
import { AuthUser } from '@/utils/auth';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  sessionReady: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  ensureValidSession: () => Promise<Session | null>;
  setSessionManually: (session: Session | null) => void;
}

/**
 * ✅ ALIASED HOOK - useAuth now points to Zustand store
 * 
 * This hook acts as a facade/alias to useAuthStore.
 * Components can continue using useAuth() without knowing
 * that the underlying implementation has changed to Zustand.
 * 
 * NO PROVIDER NEEDED - Just import and use!
 */
export function useAuth(): AuthContextType {
  // ✅ ALIASING: Internally call useAuthStore
  const user = useAuthStore(state => state.user);
  const session = useAuthStore(state => state.session);
  const loading = useAuthStore(state => state.loading);
  const sessionReady = useAuthStore(state => state.sessionReady);
  const signOut = useAuthStore(state => state.signOut);
  const refreshUser = useAuthStore(state => state.refreshUser);
  const ensureValidSession = useAuthStore(state => state.ensureValidSession);
  const setSessionManually = useAuthStore(state => state.setSessionManually);
  
  // Return the same interface as before
  return {
    user,
    session,
    loading,
    sessionReady,
    signOut,
    refreshUser,
    ensureValidSession,
    setSessionManually,
  };
}

// ✅ DEPRECATED: AuthProvider is no longer needed
// The component is kept for backward compatibility but does nothing
// All state is managed by useAuthStore
export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.warn('[AuthContext v3.2] ⚠️ AuthProvider is deprecated. Remove it from your app - Zustand handles state now.');
  return <>{children}</>;
}
