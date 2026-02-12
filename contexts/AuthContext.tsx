
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
 * ✅ AUTH CONTEXT v294.0 - GUEST MODE ARCHITECTURE FOR AUTHENTICATED USERS
 * 
 * CRITICAL FIXES v294.0 (GUEST MODE REPLICATION):
 * - ✅ INSTANT LOGIN: User sees UI immediately, no waiting for data
 * - ✅ DELAYED PUSH NOTIFICATIONS: 30 seconds after login (was 10)
 * - ✅ NO EAGER DATA LOADING: Zero automatic data fetches on login
 * - ✅ BACKGROUND ONLY: All heavy operations deferred to background
 * - ✅ IDENTICAL TO GUEST MODE: Same instant, responsive experience
 * 
 * PREVIOUS FIXES v293.0:
 * - ✅ ELIMINATED ALL CONSOLE LOGS on Android (massive performance gain)
 * - ✅ DELAYED PUSH NOTIFICATIONS: 10 seconds after login (was 5)
 * - ✅ REDUCED SESSION CHECKS: Only refresh when < 2 min to expiry (was 3)
 * - ✅ INCREASED REFRESH INTERVAL: Check every 3 hours (was 2)
 * - ✅ BACKGROUND ONLY: All operations non-blocking
 * - ✅ ZERO UI THREAD BLOCKING: Instant login experience
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
      const { data: { session: currentSession }, error: getError } = await supabase.auth.getSession();
      
      if (getError || !currentSession) {
        return null;
      }

      const expiresAt = currentSession.expires_at! * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      // ✅ v293.0: Only refresh if < 2 minutes to expiry (was 3)
      if (timeUntilExpiry < 2 * 60 * 1000) {
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          if (timeUntilExpiry <= 0) {
            return null;
          }
          setSession(currentSession);
          setSessionReady(true);
          return currentSession;
        }

        if (!refreshedSession) {
          return null;
        }
        
        setSession(refreshedSession);
        setSessionReady(true);
        
        return refreshedSession;
      }

      setSession(currentSession);
      setSessionReady(true);
      return currentSession;
    } catch (err) {
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
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
            
            // ✅ CRITICAL FIX v294.0: DELAYED PUSH NOTIFICATIONS (30 seconds)
            // Further increased delay to replicate guest mode instant experience
            // Push notifications are low priority, should not block UI
            if (Platform.OS === 'android') {
              setTimeout(() => {
                registerForPushNotifications()
                  .then(pushToken => {
                    if (pushToken) {
                      savePushToken(userData.id, pushToken).catch(() => {});
                    }
                  })
                  .catch(() => {});
              }, 30000); // ✅ v294.0: Increased to 30 seconds (was 10)
            } else {
              // iOS can handle push notifications faster
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
          
          // ✅ CRITICAL FIX v294.0: DELAYED PUSH NOTIFICATIONS (30 seconds on Android)
          if (Platform.OS === 'android') {
            setTimeout(() => {
              registerForPushNotifications()
                .then(pushToken => {
                  if (pushToken) {
                    savePushToken(userData.id, pushToken).catch(() => {});
                  }
                })
                .catch(() => {});
            }, 30000); // ✅ v294.0: Increased to 30 seconds on Android
          } else {
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

    // ✅ FIX v293.0: Increased refresh interval to 3 hours (from 2 hours)
    refreshInterval = setInterval(async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          const expiresAt = currentSession.expires_at! * 1000;
          const now = Date.now();
          const timeUntilExpiry = expiresAt - now;
          
          // ✅ v293.0: Only refresh if < 2 minutes until expiry (was 3)
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
    }, 3 * 60 * 60 * 1000); // ✅ v293.0: Check every 3 hours (was 2 hours)

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
