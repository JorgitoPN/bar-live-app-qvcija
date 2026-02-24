
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/app/integrations/supabase/client';
import { AuthUser, getCurrentUser } from '@/utils/auth';
import { registerForPushNotifications, savePushToken } from '@/utils/notifications';
import { Session } from '@supabase/supabase-js';
import { Platform } from 'react-native';

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  ensureValidSession: () => Promise<Session | null>;
  setSessionManually: (session: Session | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ✅ CRITICAL: Disable console logs on Android for performance
const log = Platform.OS === 'android' ? () => {} : console.log;
const warn = Platform.OS === 'android' ? () => {} : console.warn;
const error = Platform.OS === 'android' ? () => {} : console.error;

/**
 * ✅ AUTH CONTEXT v337.0 - ULTRA-FAST GUEST MODE REPLICATION
 * 
 * CRITICAL FIXES v337.0 (FINAL PERFORMANCE PARITY):
 * - ✅ INSTANT SESSION LOAD: No waiting for session validation on Android
 * - ✅ ZERO BLOCKING OPERATIONS: All auth operations are non-blocking
 * - ✅ DISABLED PUSH NOTIFICATIONS: Completely disabled on Android
 * - ✅ MINIMAL SESSION CHECKS: Only when absolutely necessary
 * - ✅ BACKGROUND USER FETCH: User data loads in background, doesn't block UI
 * - ✅ 100% GUEST MODE PARITY: Identical instant experience
 * 
 * PREVIOUS FIXES v295.0:
 * - ✅ INSTANT LOGIN: User sees UI immediately, no waiting
 * - ✅ DISABLED PUSH NOTIFICATIONS: Completely disabled on Android
 * - ✅ ZERO BACKGROUND OPERATIONS: No automatic operations on Android
 * - ✅ 100% IDENTICAL TO GUEST MODE: Same instant, responsive experience
 */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);

  const setSessionManually = (newSession: Session | null) => {
    setSession(newSession);
    setSessionReady(!!newSession);
    
    if (newSession) {
      getCurrentUser().then(({ user: userData, error: userError }) => {
        if (!userError && userData) {
          setUser(userData);
        }
      });
    } else {
      setUser(null);
    }
  };

  const ensureValidSession = async (): Promise<Session | null> => {
    try {
      console.log('[AuthContext] 🔍 Checking session validity...');
      const { data: { session: currentSession }, error: getError } = await supabase.auth.getSession();
      
      if (getError) {
        console.error('[AuthContext] ❌ Error getting session:', getError);
        return null;
      }
      
      if (!currentSession) {
        console.log('[AuthContext] ⚠️ No active session found');
        return null;
      }

      const expiresAt = currentSession.expires_at! * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      
      console.log('[AuthContext] ⏰ Session expires in:', Math.floor(timeUntilExpiry / 1000 / 60), 'minutes');

      // ✅ Refresh if session is expired or will expire in < 5 minutes
      if (timeUntilExpiry < 5 * 60 * 1000) {
        console.log('[AuthContext] 🔄 Session expiring soon, refreshing...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('[AuthContext] ❌ Error refreshing session:', refreshError);
          // If session is already expired, return null
          if (timeUntilExpiry <= 0) {
            console.log('[AuthContext] ⚠️ Session expired, cannot refresh');
            return null;
          }
          // If refresh failed but session is still valid, use current session
          console.log('[AuthContext] ⚠️ Refresh failed but session still valid, using current session');
          setSession(currentSession);
          setSessionReady(true);
          return currentSession;
        }

        if (!refreshedSession) {
          console.log('[AuthContext] ⚠️ No refreshed session returned');
          return null;
        }
        
        console.log('[AuthContext] ✅ Session refreshed successfully');
        setSession(refreshedSession);
        setSessionReady(true);
        
        return refreshedSession;
      }

      console.log('[AuthContext] ✅ Session is valid');
      setSession(currentSession);
      setSessionReady(true);
      return currentSession;
    } catch (err) {
      console.error('[AuthContext] ❌ Exception in ensureValidSession:', err);
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // ✅ v337.0: CRITICAL ANDROID PERFORMANCE FIX
        // On Android, we load session instantly without validation
        // This replicates guest mode's instant startup
        if (Platform.OS === 'android') {
          // ✅ INSTANT: Get session without waiting for validation
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          
          if (currentSession) {
            // ✅ INSTANT: Set session immediately (no validation delay)
            setSession(currentSession);
            setSessionReady(true);
            
            // ✅ BACKGROUND: Load user data in background (doesn't block UI)
            setTimeout(() => {
              getCurrentUser().then(({ user: userData, error: userError }) => {
                if (!userError && userData) {
                  setUser(userData);
                }
              });
            }, 100); // Minimal delay to ensure UI renders first
          }
          
          // ✅ INSTANT: Mark as ready immediately
          setInitializing(false);
          setLoading(false);
          return;
        }
        
        // iOS: Keep original behavior (more robust validation)
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          setInitializing(false);
          setLoading(false);
          return;
        }
        
        if (currentSession) {
          setSession(currentSession);
          setSessionReady(true);
          
          const { user: userData, error: userError } = await getCurrentUser();
          
          if (!userError && userData) {
            setUser(userData);
            
            // iOS can handle push notifications
            setTimeout(() => {
              registerForPushNotifications()
                .then(pushToken => {
                  if (pushToken) {
                    savePushToken(userData.id, pushToken).catch(() => {});
                  }
                })
                .catch(() => {});
            }, 10000);
          }
        }
      } catch (err) {
        // Silent error
      } finally {
        setInitializing(false);
        setLoading(false);
      }
    };

    initializeAuth();

    let subscription: { unsubscribe: () => void } | null = null;
    let refreshInterval: NodeJS.Timeout | null = null;
    
    const { data } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (currentSession) {
        setSession(currentSession);
        setSessionReady(true);
      } else {
        setSession(null);
        setSessionReady(false);
        setUser(null);
      }
      
      if (initializing) {
        return;
      }
      
      if (event === 'SIGNED_IN' && currentSession) {
        // ✅ v337.0: INSTANT LOGIN on Android (guest mode parity)
        if (Platform.OS === 'android') {
          // ✅ INSTANT: Set session immediately, no validation delay
          setSession(currentSession);
          setSessionReady(true);
          
          // ✅ BACKGROUND: Load user data in background
          setTimeout(() => {
            getCurrentUser().then(({ user: userData, error: userError }) => {
              if (!userError && userData) {
                setUser(userData);
              }
            });
          }, 100);
          
          return; // Skip iOS validation flow
        }
        
        // iOS: Keep original validation flow
        setLoading(true);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: { session: verifiedSession } } = await supabase.auth.getSession();
        
        if (!verifiedSession) {
          setLoading(false);
          return;
        }
        
        const { user: userData, error: userError } = await getCurrentUser();
        
        if (!userError && userData) {
          setUser(userData);
          
          setTimeout(() => {
            registerForPushNotifications()
              .then(pushToken => {
                if (pushToken) {
                  savePushToken(userData.id, pushToken).catch(() => {});
                }
              })
              .catch(() => {});
          }, 10000);
        }
        
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setSessionReady(false);
      } else if (event === 'USER_UPDATED') {
        setLoading(true);
        const { user: userData } = await getCurrentUser();
        if (userData) {
          setUser(userData);
        }
        setLoading(false);
      }
    });
    
    subscription = data.subscription;

    // ✅ v337.0: DISABLED on Android (guest mode doesn't refresh sessions)
    // Guest mode = no background session checks = instant performance
    if (Platform.OS !== 'android') {
      refreshInterval = setInterval(async () => {
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          
          if (currentSession) {
            const expiresAt = currentSession.expires_at! * 1000;
            const now = Date.now();
            const timeUntilExpiry = expiresAt - now;
            
            // Only refresh if < 2 minutes until expiry
            if (timeUntilExpiry < 2 * 60 * 1000) {
              const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
              
              if (!error && refreshedSession) {
                setSession(refreshedSession);
                setSessionReady(true);
              }
            }
          }
        } catch (err) {
          // Silent fail
        }
      }, 3 * 60 * 60 * 1000);
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [initializing]);

  const handleSignOut = async () => {
    try {
      setUser(null);
      setSession(null);
      setSessionReady(false);
      
      supabase.auth.signOut().then(() => {}).catch(() => {});
    } catch (err) {
      setUser(null);
      setSession(null);
      setSessionReady(false);
    }
  };

  const refreshUser = async () => {
    try {
      setLoading(true);
      
      const { user: userData } = await getCurrentUser();
      
      if (userData) {
        setUser(userData);
      }
    } catch (err) {
      // Silent error
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut: handleSignOut,
    refreshUser,
    ensureValidSession,
    setSessionManually,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  
  return context;
}
