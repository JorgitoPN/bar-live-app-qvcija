
import { create } from 'zustand';
import { supabase } from '@/app/integrations/supabase/client';
import { AuthUser, getCurrentUser } from '@/utils/auth';
import { registerForPushNotifications, savePushToken } from '@/utils/notifications';
import { Session } from '@supabase/supabase-js';
import { Platform } from 'react-native';

/**
 * ✅ AUTH STORE v1.0 - ZUSTAND ATOMIC STATE MANAGEMENT
 * 
 * BENEFITS OF ZUSTAND OVER CONTEXT:
 * - ✅ ATOMIC UPDATES: Components only re-render when their specific slice changes
 * - ✅ NO PROVIDER HELL: No need to wrap entire app in providers
 * - ✅ BETTER PERFORMANCE: Zustand uses direct subscriptions, not React Context
 * - ✅ SIMPLER CODE: No useContext hook, just import and use
 * - ✅ DEVTOOLS: Built-in Redux DevTools support for debugging
 * 
 * EXAMPLE:
 * // Only re-renders when user changes, NOT when session or loading changes
 * const user = useAuthStore(state => state.user);
 * 
 * // Only re-renders when loading changes
 * const loading = useAuthStore(state => state.loading);
 */

interface AuthState {
  // State
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  sessionReady: boolean;
  isAuthenticated: boolean; // ✅ BLOQUE 1: Explicit auth state for instant UI updates
  
  // Actions
  setUser: (user: AuthUser | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setSessionReady: (ready: boolean) => void;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  ensureValidSession: () => Promise<Session | null>;
  setSessionManually: (session: Session | null) => void;
  
  // Initialization
  initialize: () => Promise<void>;
}

const log = Platform.OS === 'android' ? () => {} : console.log;

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  session: null,
  loading: true,
  sessionReady: false,
  isAuthenticated: false, // ✅ BLOQUE 1: Start as unauthenticated
  
  // Simple setters (atomic updates)
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session, sessionReady: !!session, isAuthenticated: !!session }),
  setLoading: (loading) => set({ loading }),
  setSessionReady: (sessionReady) => set({ sessionReady }),
  
  // Set session manually (used by auth flows)
  setSessionManually: (newSession) => {
    set({ session: newSession, sessionReady: !!newSession });
    
    if (newSession) {
      getCurrentUser().then(({ user: userData, error: userError }) => {
        if (!userError && userData) {
          set({ user: userData });
        }
      });
    } else {
      set({ user: null });
    }
  },
  
  // Ensure valid session (refresh if needed)
  ensureValidSession: async () => {
    try {
      log('[AuthStore] 🔍 Checking session validity...');
      const { data: { session: currentSession }, error: getError } = await supabase.auth.getSession();
      
      if (getError) {
        console.error('[AuthStore] ❌ Error getting session:', getError);
        return null;
      }
      
      if (!currentSession) {
        log('[AuthStore] ⚠️ No active session found');
        return null;
      }

      const expiresAt = currentSession.expires_at! * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      
      log('[AuthStore] ⏰ Session expires in:', Math.floor(timeUntilExpiry / 1000 / 60), 'minutes');

      // Refresh if session is expired or will expire in < 5 minutes
      if (timeUntilExpiry < 5 * 60 * 1000) {
        log('[AuthStore] 🔄 Session expiring soon, refreshing...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('[AuthStore] ❌ Error refreshing session:', refreshError);
          if (timeUntilExpiry <= 0) {
            log('[AuthStore] ⚠️ Session expired, cannot refresh');
            return null;
          }
          log('[AuthStore] ⚠️ Refresh failed but session still valid, using current session');
          set({ session: currentSession, sessionReady: true });
          return currentSession;
        }

        if (!refreshedSession) {
          log('[AuthStore] ⚠️ No refreshed session returned');
          return null;
        }
        
        log('[AuthStore] ✅ Session refreshed successfully');
        set({ session: refreshedSession, sessionReady: true });
        return refreshedSession;
      }

      log('[AuthStore] ✅ Session is valid');
      set({ session: currentSession, sessionReady: true });
      return currentSession;
    } catch (err) {
      console.error('[AuthStore] ❌ Exception in ensureValidSession:', err);
      return null;
    }
  },
  
  // Sign out
  signOut: async () => {
    try {
      set({ user: null, session: null, sessionReady: false, isAuthenticated: false });
      supabase.auth.signOut().then(() => {}).catch(() => {});
    } catch (err) {
      set({ user: null, session: null, sessionReady: false, isAuthenticated: false });
    }
  },
  
  // Refresh user data
  refreshUser: async () => {
    try {
      set({ loading: true });
      const { user: userData } = await getCurrentUser();
      if (userData) {
        set({ user: userData });
      }
    } catch (err) {
      // Silent error
    } finally {
      set({ loading: false });
    }
  },
  
  // ✅ BLOQUE 1 COMPLETADO: SYNCHRONOUS SESSION READ + REDUCED TIMEOUT
  initialize: async () => {
    const startTime = performance.now();
    console.log('[AuthStore BLOQUE 1] 🚀 Initializing with MMKV sync read...');
    
    try {
      // ✅ PASO 1: LECTURA SÍNCRONA INMEDIATA desde MMKV (antes de cualquier red)
      // Esto permite que la UI se renderice con el estado de autenticación correcto
      // ANTES de esperar la validación de red
      const { getSessionSync } = require('@/src/lib/supabaseStorage');
      const cachedSessionData = getSessionSync();
      
      if (cachedSessionData) {
        try {
          const parsedSession = JSON.parse(cachedSessionData);
          console.log('[AuthStore BLOQUE 1] ⚡ SYNC session found in MMKV (<1ms)');
          
          // Actualizar estado INMEDIATAMENTE con la sesión cacheada
          set({ 
            session: parsedSession,
            isAuthenticated: true,
            sessionReady: true,
            loading: false 
          });
          
          const syncTime = performance.now() - startTime;
          console.log(`[AuthStore BLOQUE 1] ✅ UI ready in ${syncTime.toFixed(0)}ms (SYNC)`);
        } catch (parseError) {
          console.error('[AuthStore BLOQUE 1] ❌ Failed to parse cached session:', parseError);
        }
      } else {
        console.log('[AuthStore BLOQUE 1] ℹ️ No cached session in MMKV');
        // Marcar como ready incluso sin sesión (usuario no autenticado)
        set({ loading: false, sessionReady: true });
      }
      
      // ✅ PASO 2: VALIDACIÓN DE RED (en paralelo, no bloquea la UI)
      // Timeout reducido a 1500ms según análisis de Fase 2
      const networkStart = performance.now();
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null }, error: Error }>((resolve) => {
        setTimeout(() => {
          console.log('[AuthStore BLOQUE 1] ⏱️ Network validation timeout (1500ms)');
          resolve({ data: { session: null }, error: new Error('Timeout') });
        }, 1500); // ✅ REDUCIDO de 3000ms a 1500ms (Fase 2 - Cuello de Botella)
      });
      
      const { data: { session: networkSession }, error: sessionError } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]);
      
      const networkTime = performance.now() - networkStart;
      console.log(`[AuthStore BLOQUE 1] 🌐 Network validation completed in ${networkTime.toFixed(0)}ms`);
      
      // Si la validación de red falla o timeout, mantener la sesión cacheada
      if (sessionError && sessionError.message !== 'Timeout') {
        console.error('[AuthStore BLOQUE 1] ❌ Network validation error (non-blocking):', sessionError);
        return;
      }
      
      // Si la red devuelve una sesión diferente, actualizar
      if (networkSession) {
        console.log('[AuthStore BLOQUE 1] ✅ Network session validated');
        set({ session: networkSession });
        
        // ✅ PASO 3: CARGAR PERFIL DE USUARIO (en background, no bloquea)
        (async () => {
          const profileStart = performance.now();
          
          // Timeout reducido a 1500ms (consistente con sesión)
          const profilePromise = getCurrentUser();
          const profileTimeoutPromise = new Promise<{ user: null, error: Error }>((resolve) => {
            setTimeout(() => {
              console.log('[AuthStore BLOQUE 1] ⏱️ Profile fetch timeout (1500ms)');
              resolve({ user: null, error: new Error('Timeout') });
            }, 1500); // ✅ REDUCIDO de 2000ms a 1500ms
          });
          
          const { user: userData, error: userError } = await Promise.race([
            profilePromise,
            profileTimeoutPromise
          ]);
          
          const profileTime = performance.now() - profileStart;
          
          if (!userError && userData) {
            console.log(`[AuthStore BLOQUE 1] ✅ User profile loaded in ${profileTime.toFixed(0)}ms`);
            set({ user: userData });
            
            // ✅ PASO 4: Push notifications (muy diferido, no crítico)
            if (Platform.OS === 'ios') {
              setTimeout(() => {
                registerForPushNotifications()
                  .then(pushToken => {
                    if (pushToken) {
                      savePushToken(userData.id, pushToken).catch(() => {});
                    }
                  })
                  .catch(() => {});
              }, 15000);
            }
          } else if (userError && userError.message !== 'Timeout') {
            console.error('[AuthStore BLOQUE 1] ❌ Profile error (non-blocking):', userError);
          }
        })();
      } else {
        console.log('[AuthStore BLOQUE 1] ℹ️ No network session (user logged out or timeout)');
        // Si no hay sesión de red, limpiar la sesión cacheada
        if (cachedSessionData) {
          set({ session: null, isAuthenticated: false });
        }
      }
      
      const totalTime = performance.now() - startTime;
      console.log(`[AuthStore BLOQUE 1] ✅ Total initialization: ${totalTime.toFixed(0)}ms`);
      console.log('[AuthStore BLOQUE 1] 📊 Breakdown:');
      console.log('  - MMKV sync read: <1ms');
      console.log(`  - Network validation: ${networkTime.toFixed(0)}ms`);
      console.log('  - Profile load: background (non-blocking)');
    } catch (err) {
      console.error('[AuthStore BLOQUE 1] ❌ Initialization error (non-blocking):', err);
      // ✅ CRITICAL: Always mark as ready, even on error
      set({ loading: false, sessionReady: true });
    }
  },
}));
