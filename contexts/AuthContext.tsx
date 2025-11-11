
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('[AuthContext] 🚀 Inicializando contexto de autenticación');
    
    // Initialize auth state - NON-BLOCKING
    const initializeAuth = async () => {
      try {
        if (!isSupabaseConfigured()) {
          console.log('[AuthContext] ⚠️ Supabase no configurado - modo sin autenticación');
          return;
        }

        // Get current session silently
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          console.log('[AuthContext] ✅ Sesión existente encontrada');
          setSession(currentSession);
          
          // Load user profile in background
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
          }
        } else {
          console.log('[AuthContext] ℹ️ No hay sesión activa');
        }
      } catch (error) {
        console.error('[AuthContext] ❌ Error inicializando:', error);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    let subscription: { unsubscribe: () => void } | null = null;
    
    if (isSupabaseConfigured()) {
      const { data } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        console.log('[AuthContext] 🔄 Auth state cambió:', event);
        
        setSession(currentSession);
        
        if (event === 'SIGNED_IN' && currentSession) {
          console.log('[AuthContext] ✅ Usuario inició sesión');
          
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
        } else if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] 🚪 Usuario cerró sesión');
          setUser(null);
          setSession(null);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('[AuthContext] 🔄 Token refrescado');
        } else if (event === 'USER_UPDATED') {
          console.log('[AuthContext] 🔄 Usuario actualizado');
          const { user: userData } = await getCurrentUser();
          if (userData) {
            setUser(userData);
          }
        }
      });
      
      subscription = data.subscription;
    }

    return () => {
      if (subscription) {
        console.log('[AuthContext] 🧹 Limpiando suscripción');
        subscription.unsubscribe();
      }
    };
  }, []);

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
      const { user: userData } = await getCurrentUser();
      
      if (userData) {
        console.log('[AuthContext] ✅ Usuario refrescado:', userData.email);
        setUser(userData);
      }
    } catch (error) {
      console.error('[AuthContext] ❌ Error refrescando usuario:', error);
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
