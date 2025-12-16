
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

  // Helper function to manually set session (for immediate updates after login)
  const setSessionManually = (newSession: Session | null) => {
    console.log('[AuthContext] 📝 Actualizando sesión manualmente');
    setSession(newSession);
    setSessionReady(!!newSession);
  };

  // Helper function to ensure we have a valid session
  const ensureValidSession = async (): Promise<Session | null> => {
    console.log('[AuthContext] 🔍 ensureValidSession - Iniciando verificación...');
    
    try {
      // ALWAYS get fresh session from Supabase to ensure we have the latest state
      console.log('[AuthContext] 🔄 Obteniendo sesión fresca de Supabase...');
      const { data: { session: currentSession }, error: getError } = await supabase.auth.getSession();
      
      if (getError) {
        console.error('[AuthContext] ❌ Error obteniendo sesión:', getError);
        return null;
      }

      if (!currentSession) {
        console.error('[AuthContext] ❌ No hay sesión activa');
        return null;
      }

      console.log('[AuthContext] 📊 Sesión obtenida:', {
        userId: currentSession.user.id,
        email: currentSession.user.email,
        expiresAt: new Date(currentSession.expires_at! * 1000).toLocaleString(),
        hasAccessToken: !!currentSession.access_token,
      });

      // Check if session needs refresh
      const expiresAt = currentSession.expires_at! * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      console.log('[AuthContext] ⏱️ Tiempo hasta expiración:', Math.floor(timeUntilExpiry / 1000 / 60), 'minutos');

      // If session is expired or about to expire (less than 5 minutes), refresh it
      if (timeUntilExpiry < 5 * 60 * 1000) {
        console.log('[AuthContext] 🔄 Sesión próxima a expirar o expirada, refrescando...');
        
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('[AuthContext] ❌ Error refrescando sesión:', refreshError);
          // If refresh failed and session is expired, return null
          if (timeUntilExpiry <= 0) {
            console.error('[AuthContext] ❌ Sesión expirada y no se pudo refrescar');
            return null;
          }
          // If refresh failed but session is still valid, use current session
          console.log('[AuthContext] ⚠️ Usando sesión actual a pesar del error de refresh');
          setSession(currentSession);
          setSessionReady(true);
          return currentSession;
        }

        if (!refreshedSession) {
          console.error('[AuthContext] ❌ No se pudo refrescar la sesión');
          return null;
        }

        console.log('[AuthContext] ✅ Sesión refrescada exitosamente');
        console.log('[AuthContext] 📅 Nueva expiración:', new Date(refreshedSession.expires_at! * 1000).toLocaleString());
        
        // Update the session in state
        setSession(refreshedSession);
        setSessionReady(true);
        
        return refreshedSession;
      }

      console.log('[AuthContext] ✅ Sesión válida, actualizando estado');
      // Update state with fresh session
      setSession(currentSession);
      setSessionReady(true);
      return currentSession;
    } catch (error) {
      console.error('[AuthContext] ❌ Error inesperado en ensureValidSession:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('[AuthContext] 🚀 Inicializando contexto de autenticación');
    
    // Initialize auth state
    const initializeAuth = async () => {
      try {
        console.log('[AuthContext] 🔍 Obteniendo sesión actual...');
        
        // Get current session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[AuthContext] ❌ Error obteniendo sesión:', sessionError);
          setInitializing(false);
          setLoading(false);
          return;
        }
        
        if (currentSession) {
          console.log('[AuthContext] ✅ Sesión existente encontrada para:', currentSession.user.email);
          console.log('[AuthContext] 📅 Sesión expira en:', new Date(currentSession.expires_at! * 1000).toLocaleString());
          
          // ✅ CRITICAL FIX: Set session IMMEDIATELY before loading user profile
          setSession(currentSession);
          setSessionReady(true);
          
          // Load user profile
          console.log('[AuthContext] 📥 Cargando perfil de usuario...');
          const { user: userData, error: userError } = await getCurrentUser();
          
          if (userError) {
            console.error('[AuthContext] ❌ Error cargando perfil:', userError);
          } else if (userData) {
            console.log('[AuthContext] ✅ Usuario cargado:', userData.email);
            setUser(userData);
            
            // Register push notifications (non-blocking)
            registerForPushNotifications()
              .then(pushToken => {
                if (pushToken) {
                  savePushToken(userData.id, pushToken).catch(() => {});
                }
              })
              .catch(() => {});
          } else {
            console.log('[AuthContext] ⚠️ No se pudo cargar el perfil del usuario');
          }
        } else {
          console.log('[AuthContext] ℹ️ No hay sesión activa');
        }
      } catch (error) {
        console.error('[AuthContext] ❌ Error inicializando:', error);
      } finally {
        setInitializing(false);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    let subscription: { unsubscribe: () => void } | null = null;
    let refreshInterval: NodeJS.Timeout | null = null;
    
    const { data } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('[AuthContext] 🔄 Auth state cambió:', event);
      
      // ✅ CRITICAL FIX: Always update session state IMMEDIATELY for all events
      // This ensures the session is available before any navigation happens
      if (currentSession) {
        console.log('[AuthContext] 📝 Actualizando sesión inmediatamente');
        setSession(currentSession);
        setSessionReady(true);
      } else {
        console.log('[AuthContext] 📝 Limpiando sesión');
        setSession(null);
        setSessionReady(false);
      }
      
      // Don't process user profile updates during initialization
      if (initializing) {
        console.log('[AuthContext] ⏳ Ignorando actualización de perfil durante inicialización');
        return;
      }
      
      if (event === 'SIGNED_IN' && currentSession) {
        console.log('[AuthContext] ✅ Usuario inició sesión:', currentSession.user.email);
        console.log('[AuthContext] 📅 Sesión expira en:', new Date(currentSession.expires_at! * 1000).toLocaleString());
        setLoading(true);
        
        // ✅ CRITICAL FIX: Wait a bit to ensure session is fully persisted
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Load user profile
        const { user: userData, error: userError } = await getCurrentUser();
        
        if (userError) {
          console.error('[AuthContext] ❌ Error cargando perfil después de login:', userError);
        } else if (userData) {
          console.log('[AuthContext] ✅ Perfil cargado:', userData.email);
          setUser(userData);
          
          // Register push notifications (non-blocking)
          registerForPushNotifications()
            .then(pushToken => {
              if (pushToken) {
                savePushToken(userData.id, pushToken).catch(() => {});
              }
            })
            .catch(() => {});
        } else {
          console.log('[AuthContext] ⚠️ No se pudo cargar el perfil después de login');
        }
        
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        console.log('[AuthContext] 🚪 Usuario cerró sesión');
        setUser(null);
        setSession(null);
        setSessionReady(false);
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('[AuthContext] 🔄 Token refrescado exitosamente');
        if (currentSession) {
          console.log('[AuthContext] 📅 Nueva expiración:', new Date(currentSession.expires_at! * 1000).toLocaleString());
        }
        // Session is already updated, just log
      } else if (event === 'USER_UPDATED') {
        console.log('[AuthContext] 🔄 Usuario actualizado');
        setLoading(true);
        const { user: userData } = await getCurrentUser();
        if (userData) {
          setUser(userData);
        }
        setLoading(false);
      }
    });
    
    subscription = data.subscription;

    // Set up automatic session refresh every 5 minutes
    // This ensures the session stays fresh and prevents expiration during uploads
    refreshInterval = setInterval(async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          const expiresAt = currentSession.expires_at! * 1000;
          const now = Date.now();
          const timeUntilExpiry = expiresAt - now;
          
          // Refresh if less than 10 minutes until expiry
          if (timeUntilExpiry < 10 * 60 * 1000) {
            console.log('[AuthContext] ⏰ Sesión próxima a expirar, refrescando automáticamente...');
            const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
            
            if (error) {
              console.error('[AuthContext] ❌ Error refrescando sesión automáticamente:', error);
            } else if (refreshedSession) {
              console.log('[AuthContext] ✅ Sesión refrescada automáticamente');
              console.log('[AuthContext] 📅 Nueva expiración:', new Date(refreshedSession.expires_at! * 1000).toLocaleString());
              setSession(refreshedSession);
              setSessionReady(true);
            }
          }
        }
      } catch (error) {
        console.error('[AuthContext] ❌ Error en refresh automático:', error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => {
      if (subscription) {
        console.log('[AuthContext] 🧹 Limpiando suscripción');
        subscription.unsubscribe();
      }
      if (refreshInterval) {
        console.log('[AuthContext] 🧹 Limpiando intervalo de refresh');
        clearInterval(refreshInterval);
      }
    };
  }, [initializing]);

  const handleSignOut = async () => {
    try {
      console.log('[AuthContext] 🚪 Iniciando cierre de sesión...');
      
      // Clear local state immediately
      setUser(null);
      setSession(null);
      setSessionReady(false);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[AuthContext] ❌ Error cerrando sesión:', error);
      } else {
        console.log('[AuthContext] ✅ Sesión cerrada exitosamente');
      }
    } catch (error) {
      console.error('[AuthContext] ❌ Error en signOut:', error);
    }
  };

  const refreshUser = async () => {
    try {
      console.log('[AuthContext] 🔄 Refrescando usuario...');
      setLoading(true);
      
      const { user: userData } = await getCurrentUser();
      
      if (userData) {
        console.log('[AuthContext] ✅ Usuario refrescado:', userData.email);
        setUser(userData);
      } else {
        console.log('[AuthContext] ⚠️ No se pudo refrescar el usuario');
      }
    } catch (error) {
      console.error('[AuthContext] ❌ Error refrescando usuario:', error);
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
