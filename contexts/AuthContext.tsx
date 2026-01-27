
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/app/integrations/supabase/client';
import { AuthUser, getCurrentUser } from '@/utils/auth';
import { registerForPushNotifications, savePushToken } from '@/utils/notifications';
import { Session } from '@supabase/supabase-js';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);

  // ✅ FIX v35.0: Helper function to manually set session (for immediate updates after login)
  const setSessionManually = (newSession: Session | null) => {
    setSession(newSession);
    setSessionReady(!!newSession);
    
    // ✅ CRITICAL FIX: If session is set, immediately load user profile
    if (newSession) {
      getCurrentUser().then(({ user: userData, error: userError }) => {
        if (userError) {
          console.error('[AuthContext v35.0] ❌ Error cargando perfil:', userError);
        } else if (userData) {
          setUser(userData);
        }
      });
    } else {
      setUser(null);
    }
  };

  // ✅ FIX v35.0: Reduced logging to prevent performance issues
  const ensureValidSession = async (): Promise<Session | null> => {
    try {
      const { data: { session: currentSession }, error: getError } = await supabase.auth.getSession();
      
      if (getError) {
        console.error('[AuthContext v35.0] ❌ Error obteniendo sesión:', getError);
        return null;
      }

      if (!currentSession) {
        return null;
      }

      // Check if session needs refresh
      const expiresAt = currentSession.expires_at! * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      // If session is expired or about to expire (less than 5 minutes), refresh it
      if (timeUntilExpiry < 5 * 60 * 1000) {
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('[AuthContext v35.0] ❌ Error refrescando sesión:', refreshError);
          // If refresh failed and session is expired, return null
          if (timeUntilExpiry <= 0) {
            return null;
          }
          // If refresh failed but session is still valid, use current session
          setSession(currentSession);
          setSessionReady(true);
          return currentSession;
        }

        if (!refreshedSession) {
          return null;
        }
        
        // Update the session in state
        setSession(refreshedSession);
        setSessionReady(true);
        
        return refreshedSession;
      }

      // Update state with fresh session
      setSession(currentSession);
      setSessionReady(true);
      return currentSession;
    } catch (error) {
      console.error('[AuthContext v35.0] ❌ Error inesperado en ensureValidSession:', error);
      return null;
    }
  };

  useEffect(() => {
    // ✅ FIX v35.0: Reduced logging to prevent performance issues
    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[AuthContext v35.0] ❌ Error obteniendo sesión:', sessionError);
          setInitializing(false);
          setLoading(false);
          return;
        }
        
        if (currentSession) {
          // ✅ CRITICAL FIX: Set session IMMEDIATELY before loading user profile
          setSession(currentSession);
          setSessionReady(true);
          
          // Load user profile
          const { user: userData, error: userError } = await getCurrentUser();
          
          if (userError) {
            console.error('[AuthContext v35.0] ❌ Error cargando perfil:', userError);
          } else if (userData) {
            setUser(userData);
            
            // Register push notifications (non-blocking)
            registerForPushNotifications()
              .then(pushToken => {
                if (pushToken) {
                  savePushToken(userData.id, pushToken).catch(() => {});
                }
              })
              .catch(() => {});
          }
        }
      } catch (error) {
        console.error('[AuthContext v35.0] ❌ Error inicializando:', error);
      } finally {
        setInitializing(false);
        setLoading(false);
      }
    };

    initializeAuth();

    // ✅ FIX v35.0: Reduced logging to prevent performance issues
    let subscription: { unsubscribe: () => void } | null = null;
    let refreshInterval: NodeJS.Timeout | null = null;
    
    const { data } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      // ✅ CRITICAL FIX v35.0: Always update session state IMMEDIATELY for all events
      if (currentSession) {
        setSession(currentSession);
        setSessionReady(true);
      } else {
        setSession(null);
        setSessionReady(false);
        setUser(null);
      }
      
      // Don't process user profile updates during initialization
      if (initializing) {
        return;
      }
      
      if (event === 'SIGNED_IN' && currentSession) {
        setLoading(true);
        
        // ✅ CRITICAL FIX v35.0: Wait a bit to ensure session is fully persisted
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // ✅ CRITICAL FIX v35.0: Verify session is still valid after wait
        const { data: { session: verifiedSession } } = await supabase.auth.getSession();
        
        if (!verifiedSession) {
          console.error('[AuthContext v35.0] ❌ Session lost after wait');
          setLoading(false);
          return;
        }
        
        // Load user profile
        const { user: userData, error: userError } = await getCurrentUser();
        
        if (userError) {
          console.error('[AuthContext v35.0] ❌ Error cargando perfil después de login:', userError);
        } else if (userData) {
          setUser(userData);
          
          // Register push notifications (non-blocking)
          registerForPushNotifications()
            .then(pushToken => {
              if (pushToken) {
                savePushToken(userData.id, pushToken).catch(() => {});
              }
            })
            .catch(() => {});
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

    // ✅ FIX v35.0: Increased refresh interval to prevent flickering
    // Set up automatic session refresh every 15 minutes (instead of 5)
    refreshInterval = setInterval(async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          const expiresAt = currentSession.expires_at! * 1000;
          const now = Date.now();
          const timeUntilExpiry = expiresAt - now;
          
          // Refresh if less than 10 minutes until expiry
          if (timeUntilExpiry < 10 * 60 * 1000) {
            const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
            
            if (error) {
              console.error('[AuthContext v35.0] ❌ Error refrescando sesión automáticamente:', error);
            } else if (refreshedSession) {
              setSession(refreshedSession);
              setSessionReady(true);
            }
          }
        }
      } catch (error) {
        console.error('[AuthContext v35.0] ❌ Error en refresh automático:', error);
      }
    }, 15 * 60 * 1000); // ✅ FIX v35.0: Check every 15 minutes (instead of 5)

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
      // Clear local state immediately
      setUser(null);
      setSession(null);
      setSessionReady(false);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[AuthContext v35.0] ❌ Error cerrando sesión:', error);
      }
    } catch (error) {
      console.error('[AuthContext v35.0] ❌ Error en signOut:', error);
    }
  };

  const refreshUser = async () => {
    try {
      setLoading(true);
      
      const { user: userData } = await getCurrentUser();
      
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error('[AuthContext v35.0] ❌ Error refrescando usuario:', error);
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
