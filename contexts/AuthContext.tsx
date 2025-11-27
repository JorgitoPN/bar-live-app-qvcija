
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '@/utils/supabase';
import { AuthUser, getCurrentUser } from '@/utils/auth';
import { registerForPushNotifications, savePushToken } from '@/utils/notifications';
import { Session } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

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
    logger.info('[AuthContext] Inicializando contexto de autenticación');
    
    // Initialize auth state
    const initializeAuth = async () => {
      try {
        if (!isSupabaseConfigured()) {
          logger.warn('[AuthContext] Supabase no configurado - modo sin autenticación');
          setInitializing(false);
          setLoading(false);
          return;
        }

        logger.debug('[AuthContext] Obteniendo sesión actual...');
        
        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          logger.info('[AuthContext] Sesión existente encontrada');
          setSession(currentSession);
          
          // Load user profile
          const { user: userData } = await getCurrentUser();
          if (userData) {
            logger.info('[AuthContext] Usuario cargado');
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
          logger.debug('[AuthContext] No hay sesión activa');
        }
      } catch (error) {
        logger.error('[AuthContext] Error inicializando:', error);
      } finally {
        setInitializing(false);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    let subscription: { unsubscribe: () => void } | null = null;
    
    if (isSupabaseConfigured()) {
      const { data } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        logger.debug('[AuthContext] Auth state cambió:', event);
        
        // Don't process events during initialization
        if (initializing) {
          return;
        }
        
        setSession(currentSession);
        
        if (event === 'SIGNED_IN' && currentSession) {
          logger.info('[AuthContext] Usuario inició sesión');
          setLoading(true);
          
          // Load user profile
          const { user: userData } = await getCurrentUser();
          if (userData) {
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
          logger.info('[AuthContext] Usuario cerró sesión');
          setUser(null);
          setSession(null);
        } else if (event === 'USER_UPDATED') {
          logger.debug('[AuthContext] Usuario actualizado');
          setLoading(true);
          const { user: userData } = await getCurrentUser();
          if (userData) {
            setUser(userData);
          }
          setLoading(false);
        }
      });
      
      subscription = data.subscription;
    }

    return () => {
      if (subscription) {
        logger.debug('[AuthContext] Limpiando suscripción');
        subscription.unsubscribe();
      }
    };
  }, [initializing]);

  const handleSignOut = async () => {
    try {
      logger.info('[AuthContext] Iniciando cierre de sesión...');
      
      // Clear local state immediately
      setUser(null);
      setSession(null);
      
      if (isSupabaseConfigured()) {
        const { error } = await supabase.auth.signOut();
        if (error) {
          logger.error('[AuthContext] Error cerrando sesión:', error);
        } else {
          logger.info('[AuthContext] Sesión cerrada exitosamente');
        }
      }
    } catch (error) {
      logger.error('[AuthContext] Error en signOut:', error);
    }
  };

  const refreshUser = async () => {
    try {
      logger.debug('[AuthContext] Refrescando usuario...');
      setLoading(true);
      
      const { user: userData } = await getCurrentUser();
      
      if (userData) {
        logger.info('[AuthContext] Usuario refrescado');
        setUser(userData);
      }
    } catch (error) {
      logger.error('[AuthContext] Error refrescando usuario:', error);
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
