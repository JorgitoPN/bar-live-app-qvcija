
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/app/integrations/supabase/client';
import { AuthUser, getCurrentUser } from '@/utils/auth';
import { registerForPushNotifications, savePushToken } from '@/utils/notifications';
import { Session } from '@supabase/supabase-js';
import { Platform, InteractionManager } from 'react-native';

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
 * ✅ AUTH CONTEXT v400.0 - MAXIMUM ANDROID PERFORMANCE
 * 
 * CRITICAL OPTIMIZATIONS v400.0 (INSTAGRAM-LEVEL PERFORMANCE):
 * - ✅ ZERO-DELAY INITIALIZATION: User data loads in background, UI renders instantly
 * - ✅ DEFERRED OPERATIONS: All heavy operations use InteractionManager
 * - ✅ SMART CACHING: Session validation only when necessary
 * - ✅ NO BLOCKING: getCurrentUser() never blocks the main thread
 * - ✅ RESULT: Instant login, identical to guest mode performance
 * 
 * KEY CHANGES:
 * 1. Session loads instantly without validation on Android
 * 2. User data fetches in background after UI renders
 * 3. Push notifications completely disabled on Android
 * 4. Session refresh only when < 2 minutes to expiry
 * 5. All auth state changes are non-blocking
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
      // ✅ v400.0: Defer user data fetch to background
      InteractionManager.runAfterInteractions(() => {
        getCurrentUser().then(({ user: userData, error: userError }) => {
          if (!userError && userData) {
            setUser(userData);
          }
        });
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

      // ✅ v400.0: Only refresh if < 2 minutes to expiry
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
        // ✅ v400.0: CRITICAL ANDROID PERFORMANCE FIX
        // INSTANT session load without validation - identical to guest mode
        if (Platform.OS === 'android') {
          // ✅ INSTANT: Get session without waiting for validation
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          
          if (currentSession) {
            // ✅ INSTANT: Set session immediately (no validation delay)
            setSession(currentSession);
            setSessionReady(true);
            
            // ✅ BACKGROUND: Load user data in background (doesn't block UI)
            InteractionManager.runAfterInteractions(() => {
              getCurrentUser().then(({ user: userData, error: userError }) => {
                if (!userError && userData) {
                  setUser(userData);
                }
              });
            });
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
        // ✅ v400.0: INSTANT LOGIN on Android (guest mode parity)
        if (Platform.OS === 'android') {
          // ✅ INSTANT: Set session immediately, no validation delay
          setSession(currentSession);
          setSessionReady(true);
          
          // ✅ BACKGROUND: Load user data in background
          InteractionManager.runAfterInteractions(() => {
            getCurrentUser().then(({ user: userData, error: userError }) => {
              if (!userError && userData) {
                setUser(userData);
              }
            });
          });
          
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
        // ✅ v400.0: Defer user update to background
        InteractionManager.runAfterInteractions(async () => {
          const { user: userData } = await getCurrentUser();
          if (userData) {
            setUser(userData);
          }
        });
      }
    });
    
    subscription = data.subscription;

    // ✅ v400.0: DISABLED on Android (guest mode doesn't refresh sessions)
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
      // ✅ v400.0: Don't set loading state (causes re-renders)
      const { user: userData } = await getCurrentUser();
      
      if (userData) {
        setUser(userData);
      }
    } catch (err) {
      // Silent error
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
