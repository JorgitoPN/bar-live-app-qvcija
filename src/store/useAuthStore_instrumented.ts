
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 AUTH STORE - INSTRUMENTADO PARA FASE 0 & 1
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ESTE ARCHIVO ES UNA COPIA INSTRUMENTADA DE src/store/useAuthStore.ts
 * 
 * INSTRUCCIONES:
 * 1. Renombrar src/store/useAuthStore.ts a src/store/useAuthStore_original.ts
 * 2. Renombrar este archivo a src/store/useAuthStore.ts
 * 3. Correr la app
 * 
 * MÉTRICAS QUE SE MIDEN:
 * - Auth_TTFB_SessionCheck: TTFB de supabase.auth.getSession()
 * - Auth_TTFB_ProfileLoad: TTFB de getCurrentUser()
 */

import { create } from 'zustand';
import { supabase } from '@/app/integrations/supabase/client';
import { AuthUser, getCurrentUser } from '@/utils/auth';
import { registerForPushNotifications, savePushToken } from '@/utils/notifications';
import { Session } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import PerformanceTracker from '@/utils/performanceTracker';

interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  sessionReady: boolean;
  
  setUser: (user: AuthUser | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setSessionReady: (ready: boolean) => void;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  ensureValidSession: () => Promise<Session | null>;
  setSessionManually: (session: Session | null) => void;
  
  initialize: () => Promise<void>;
}

const log = Platform.OS === 'android' ? () => {} : console.log;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  sessionReady: false,
  
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session, sessionReady: !!session }),
  setLoading: (loading) => set({ loading }),
  setSessionReady: (sessionReady) => set({ sessionReady }),
  
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
  
  ensureValidSession: async () => {
    try {
      log('[AuthStore INSTRUMENTED] 🔍 Checking session validity...');
      const { data: { session: currentSession }, error: getError } = await supabase.auth.getSession();
      
      if (getError) {
        console.error('[AuthStore INSTRUMENTED] ❌ Error getting session:', getError);
        return null;
      }
      
      if (!currentSession) {
        log('[AuthStore INSTRUMENTED] ⚠️ No active session found');
        return null;
      }

      const expiresAt = currentSession.expires_at! * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      
      log('[AuthStore INSTRUMENTED] ⏰ Session expires in:', Math.floor(timeUntilExpiry / 1000 / 60), 'minutes');

      if (timeUntilExpiry < 5 * 60 * 1000) {
        log('[AuthStore INSTRUMENTED] 🔄 Session expiring soon, refreshing...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('[AuthStore INSTRUMENTED] ❌ Error refreshing session:', refreshError);
          if (timeUntilExpiry <= 0) {
            log('[AuthStore INSTRUMENTED] ⚠️ Session expired, cannot refresh');
            return null;
          }
          log('[AuthStore INSTRUMENTED] ⚠️ Refresh failed but session still valid');
          set({ session: currentSession, sessionReady: true });
          return currentSession;
        }

        if (!refreshedSession) {
          log('[AuthStore INSTRUMENTED] ⚠️ No refreshed session returned');
          return null;
        }
        
        log('[AuthStore INSTRUMENTED] ✅ Session refreshed successfully');
        set({ session: refreshedSession, sessionReady: true });
        return refreshedSession;
      }

      log('[AuthStore INSTRUMENTED] ✅ Session is valid');
      set({ session: currentSession, sessionReady: true });
      return currentSession;
    } catch (err) {
      console.error('[AuthStore INSTRUMENTED] ❌ Exception in ensureValidSession:', err);
      return null;
    }
  },
  
  signOut: async () => {
    try {
      set({ user: null, session: null, sessionReady: false });
      supabase.auth.signOut().then(() => {}).catch(() => {});
    } catch (err) {
      set({ user: null, session: null, sessionReady: false });
    }
  },
  
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
  
  // ✅ INSTRUMENTADO: Inicialización con mediciones
  initialize: async () => {
    const startTime = performance.now();
    console.log('[AuthStore INSTRUMENTED] 🚀 Initializing auth...');
    
    try {
      // ✅ MEDICIÓN: Session Check TTFB
      PerformanceTracker.start('Auth_TTFB_SessionCheck');
      
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null }, error: Error }>((resolve) => {
        setTimeout(() => {
          console.log('[AuthStore INSTRUMENTED] ⏱️ Session check timeout (3s)');
          resolve({ data: { session: null }, error: new Error('Timeout') });
        }, 3000);
      });
      
      const { data: { session: currentSession }, error: sessionError } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]);
      
      PerformanceTracker.end('Auth_TTFB_SessionCheck', 'Auth_TTFB_SessionCheck_Duration');
      
      const sessionTime = performance.now() - startTime;
      console.log('[AuthStore INSTRUMENTED] ⚡ Session check completed in', `${sessionTime.toFixed(0)}ms`);
      
      set({ loading: false, sessionReady: true });
      
      if (sessionError && sessionError.message !== 'Timeout') {
        console.error('[AuthStore INSTRUMENTED] ❌ Session error:', sessionError);
        return;
      }
      
      if (currentSession) {
        console.log('[AuthStore INSTRUMENTED] ✅ Session found');
        set({ session: currentSession });
        
        // ✅ MEDICIÓN: Profile Load TTFB
        (async () => {
          const profileStart = performance.now();
          
          PerformanceTracker.start('Auth_TTFB_ProfileLoad');
          
          const profilePromise = getCurrentUser();
          const profileTimeoutPromise = new Promise<{ user: null, error: Error }>((resolve) => {
            setTimeout(() => {
              console.log('[AuthStore INSTRUMENTED] ⏱️ Profile fetch timeout (2s)');
              resolve({ user: null, error: new Error('Timeout') });
            }, 2000);
          });
          
          const { user: userData, error: userError } = await Promise.race([
            profilePromise,
            profileTimeoutPromise
          ]);
          
          PerformanceTracker.end('Auth_TTFB_ProfileLoad', 'Auth_TTFB_ProfileLoad_Duration');
          
          const profileTime = performance.now() - profileStart;
          
          if (!userError && userData) {
            console.log('[AuthStore INSTRUMENTED] ✅ User profile loaded in', `${profileTime.toFixed(0)}ms`);
            set({ user: userData });
            
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
            console.error('[AuthStore INSTRUMENTED] ❌ Profile error:', userError);
          }
        })();
      } else {
        console.log('[AuthStore INSTRUMENTED] ℹ️ No session found');
      }
      
      const totalTime = performance.now() - startTime;
      console.log('[AuthStore INSTRUMENTED] ✅ Auth initialized in', `${totalTime.toFixed(0)}ms`);
    } catch (err) {
      console.error('[AuthStore INSTRUMENTED] ❌ Initialization error:', err);
      set({ loading: false, sessionReady: true });
    }
  },
}));
