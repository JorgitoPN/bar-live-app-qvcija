
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
  
  // Simple setters (atomic updates)
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session, sessionReady: !!session }),
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
      set({ user: null, session: null, sessionReady: false });
      supabase.auth.signOut().then(() => {}).catch(() => {});
    } catch (err) {
      set({ user: null, session: null, sessionReady: false });
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
  
  // ✅ v17.0: ULTRA-FAST INITIALIZATION - Aggressive optimization with smart fallbacks
  initialize: async () => {
    const startTime = performance.now();
    console.log('[AuthStore v17.0] 🚀 Initializing auth (ULTRA-FAST)...');
    
    try {
      // ✅ OPTIMIZATION 1: Reduced timeout to 3 seconds (from 5s)
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null }, error: Error }>((resolve) => {
        setTimeout(() => {
          console.log('[AuthStore v17.0] ⏱️ Session check timeout (3s)');
          resolve({ data: { session: null }, error: new Error('Timeout') });
        }, 3000); // ✅ Reduced from 5000ms
      });
      
      const { data: { session: currentSession }, error: sessionError } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]);
      
      const sessionTime = performance.now() - startTime;
      console.log('[AuthStore v17.0] ⚡ Session check completed in', `${sessionTime.toFixed(0)}ms`);
      
      // ✅ OPTIMIZATION 2: Mark as ready IMMEDIATELY, even on error
      set({ loading: false, sessionReady: true });
      
      if (sessionError && sessionError.message !== 'Timeout') {
        console.error('[AuthStore v17.0] ❌ Session error (non-blocking):', sessionError);
        return;
      }
      
      if (currentSession) {
        console.log('[AuthStore v17.0] ✅ Session found');
        set({ session: currentSession });
        
        // ✅ OPTIMIZATION 3: Load user profile IMMEDIATELY in background (no delay)
        (async () => {
          const profileStart = performance.now();
          
          // Reduced timeout to 2 seconds (from 3s)
          const profilePromise = getCurrentUser();
          const profileTimeoutPromise = new Promise<{ user: null, error: Error }>((resolve) => {
            setTimeout(() => {
              console.log('[AuthStore v17.0] ⏱️ Profile fetch timeout (2s)');
              resolve({ user: null, error: new Error('Timeout') });
            }, 2000); // ✅ Reduced from 3000ms
          });
          
          const { user: userData, error: userError } = await Promise.race([
            profilePromise,
            profileTimeoutPromise
          ]);
          
          const profileTime = performance.now() - profileStart;
          
          if (!userError && userData) {
            console.log('[AuthStore v17.0] ✅ User profile loaded in', `${profileTime.toFixed(0)}ms`);
            set({ user: userData });
            
            // ✅ OPTIMIZATION 4: Push notifications ONLY on iOS, heavily delayed
            if (Platform.OS === 'ios') {
              setTimeout(() => {
                registerForPushNotifications()
                  .then(pushToken => {
                    if (pushToken) {
                      savePushToken(userData.id, pushToken).catch(() => {});
                    }
                  })
                  .catch(() => {});
              }, 15000); // ✅ Increased delay to 15 seconds (from 10s)
            }
          } else if (userError && userError.message !== 'Timeout') {
            console.error('[AuthStore v17.0] ❌ Profile error (non-blocking):', userError);
          }
        })(); // ✅ No setTimeout - start immediately
      } else {
        console.log('[AuthStore v17.0] ℹ️ No session found');
      }
      
      const totalTime = performance.now() - startTime;
      console.log('[AuthStore v17.0] ✅ Auth initialized in', `${totalTime.toFixed(0)}ms`);
    } catch (err) {
      console.error('[AuthStore v17.0] ❌ Initialization error (non-blocking):', err);
      // ✅ CRITICAL: Always mark as ready, even on error
      set({ loading: false, sessionReady: true });
    }
  },
}));
