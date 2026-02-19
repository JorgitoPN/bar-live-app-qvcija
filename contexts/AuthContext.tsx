
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

/**
 * ✅ AUTH CONTEXT v289.0 - ANDROID PERFORMANCE OPTIMIZATION
 * 
 * CRITICAL FIXES v289.0:
 * - ✅ LAZY PUSH NOTIFICATIONS: Moved push token registration to background (non-blocking)
 * - ✅ DELAYED REGISTRATION: Push notifications register 3 seconds after login
 * - ✅ NO UI BLOCKING: User can interact immediately while notifications register
 * - ✅ REDUCED LOGGING: Minimized console logs to prevent performance overhead
 * - ✅ OPTIMIZED REFRESH: Increased refresh interval from 15 to 30 minutes
 * - ✅ ANDROID OPTIMIZATION: Eliminated startup blocking operations
 * 
 * Previous fixes maintained (v35.0):
 * - ✅ Immediate session updates
 * - ✅ Proper session refresh handling
 * - ✅ Error recovery mechanisms
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
        if (userError) {
          console.error('[AuthContext v289.0] ❌ Error cargando perfil:', userError);
        } else if (userData) {
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

      if (timeUntilExpiry < 5 * 60 * 1000) {
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
    } catch (error) {
      console.error('[AuthContext v289.0] ❌ Error en ensureValidSession:', error);
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[AuthContext v289.0] ❌ Error obteniendo sesión:', sessionError);
          setInitializing(false);
          setLoading(false);
          return;
        }
        
        if (currentSession) {
          setSession(currentSession);
          setSessionReady(true);
          
          const { user: userData, error: userError } = await getCurrentUser();
          
          if (userError) {
            console.error('[AuthContext v289.0] ❌ Error cargando perfil:', userError);
          } else if (userData) {
            setUser(userData);
            
            // ✅ CRITICAL FIX v289.0: LAZY PUSH NOTIFICATIONS
            // Register push notifications in background after 3 seconds
            // This prevents blocking the UI thread on Android startup
            setTimeout(() => {
              console.log('[AuthContext v289.0] 📱 Starting background push notification registration...');
              registerForPushNotifications()
                .then(pushToken => {
                  if (pushToken) {
                    savePushToken(userData.id, pushToken)
                      .then(() => {
                        console.log('[AuthContext v289.0] ✅ Push token saved in background');
                      })
                      .catch((error) => {
                        console.error('[AuthContext v289.0] ⚠️ Error saving push token (non-critical):', error);
                      });
                  }
                })
                .catch((error) => {
                  console.error('[AuthContext v289.0] ⚠️ Error registering push notifications (non-critical):', error);
                });
            }, 3000); // ✅ Delay 3 seconds to allow UI to load first
          }
        }
      } catch (error) {
        console.error('[AuthContext v289.0] ❌ Error inicializando:', error);
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
          console.error('[AuthContext v289.0] ❌ Session lost after wait');
          setLoading(false);
          return;
        }
        
        const { user: userData, error: userError } = await getCurrentUser();
        
        if (userError) {
          console.error('[AuthContext v289.0] ❌ Error cargando perfil después de login:', userError);
        } else if (userData) {
          setUser(userData);
          
          // ✅ CRITICAL FIX v289.0: LAZY PUSH NOTIFICATIONS on login
          setTimeout(() => {
            console.log('[AuthContext v289.0] 📱 Starting background push notification registration after login...');
            registerForPushNotifications()
              .then(pushToken => {
                if (pushToken) {
                  savePushToken(userData.id, pushToken).catch(() => {});
                }
              })
              .catch(() => {});
          }, 3000);
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

    // ✅ FIX v289.0: Increased refresh interval to 30 minutes (from 15)
    refreshInterval = setInterval(async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          const expiresAt = currentSession.expires_at! * 1000;
          const now = Date.now();
          const timeUntilExpiry = expiresAt - now;
          
          if (timeUntilExpiry < 10 * 60 * 1000) {
            const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
            
            if (!error && refreshedSession) {
              setSession(refreshedSession);
              setSessionReady(true);
            }
          }
        }
      } catch (error) {
        // Silent fail - non-critical background operation
      }
    }, 30 * 60 * 1000); // ✅ Check every 30 minutes (from 15)

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
      // ✅ FIX v325.0: IMMEDIATE UI UPDATE - User sees logout instantly
      console.log('[AuthContext v325.0] 🚪 Logging out - immediate UI update');
      setUser(null);
      setSession(null);
      setSessionReady(false);
      
      // ✅ Backend logout continues in background (non-blocking)
      supabase.auth.signOut().then(({ error }) => {
        if (error) {
          console.error('[AuthContext v325.0] ⚠️ Error cerrando sesión en backend (non-critical):', error);
        } else {
          console.log('[AuthContext v325.0] ✅ Backend logout completed');
        }
      }).catch((error) => {
        console.error('[AuthContext v325.0] ⚠️ Error en signOut backend (non-critical):', error);
      });
      
      // User is already logged out from UI perspective
      console.log('[AuthContext v325.0] ✅ User logged out from UI immediately');
    } catch (error) {
      console.error('[AuthContext v325.0] ❌ Error en signOut:', error);
      // Even if there's an error, ensure user is logged out from UI
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
    } catch (error) {
      console.error('[AuthContext v289.0] ❌ Error refrescando usuario:', error);
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
