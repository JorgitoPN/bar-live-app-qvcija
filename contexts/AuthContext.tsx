
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '@/utils/supabase';
import { AuthUser, getCurrentUser } from '@/utils/auth';
import { registerForPushNotifications, savePushToken } from '@/utils/notifications';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] 🚀 Inicializando contexto de autenticación');
    
    // Initialize auth state
    const initializeAuth = async () => {
      try {
        if (!isSupabaseConfigured()) {
          console.log('[AuthContext] ⚠️ Supabase no configurado - modo sin autenticación');
          setInitializing(false);
          setLoading(false);
          return;
        }

        console.log('[AuthContext] 🔍 Obteniendo sesión actual...');
        
        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          console.log('[AuthContext] ✅ Sesión existente encontrada para:', currentSession.user.email);
          console.log('[AuthContext] 📅 Sesión expira en:', new Date(currentSession.expires_at! * 1000).toLocaleString());
          setSession(currentSession);
          
          // Load user profile
          console.log('[AuthContext] 📥 Cargando perfil de usuario...');
          const { user: userData } = await getCurrentUser();
          if (userData) {
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
    
    if (isSupabaseConfigured()) {
      const { data } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        console.log('[AuthContext] 🔄 Auth state cambió:', event);
        
        // Don't process events during initialization
        if (initializing) {
          console.log('[AuthContext] ⏳ Ignorando evento durante inicialización');
          return;
        }
        
        setSession(currentSession);
        
        if (event === 'SIGNED_IN' && currentSession) {
          console.log('[AuthContext] ✅ Usuario inició sesión:', currentSession.user.email);
          console.log('[AuthContext] 📅 Sesión expira en:', new Date(currentSession.expires_at! * 1000).toLocaleString());
          setLoading(true);
          
          // Load user profile
          const { user: userData } = await getCurrentUser();
          if (userData) {
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
          }
          
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] 🚪 Usuario cerró sesión');
          setUser(null);
          setSession(null);
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

      // Set up automatic session refresh every 30 minutes
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
              console.log('[AuthContext] ⏰ Sesión próxima a expirar, refrescando...');
              const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
              
              if (error) {
                console.error('[AuthContext] ❌ Error refrescando sesión automáticamente:', error);
              } else if (refreshedSession) {
                console.log('[AuthContext] ✅ Sesión refrescada automáticamente');
                console.log('[AuthContext] 📅 Nueva expiración:', new Date(refreshedSession.expires_at! * 1000).toLocaleString());
                setSession(refreshedSession);
              }
            }
          }
        } catch (error) {
          console.error('[AuthContext] ❌ Error en refresh automático:', error);
        }
      }, 5 * 60 * 1000); // Check every 5 minutes
    }

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
      
      if (isSupabaseConfigured()) {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('[AuthContext] ❌ Error cerrando sesión:', error);
        } else {
          console.log('[AuthContext] ✅ Sesión cerrada exitosamente');
        }
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
