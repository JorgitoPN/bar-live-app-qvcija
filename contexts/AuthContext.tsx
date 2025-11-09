
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '@/utils/supabase';
import { AuthUser, getCurrentUser } from '@/utils/auth';
import { registerForPushNotifications, savePushToken } from '@/utils/notifications';
import { Session } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'expo-router';

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
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.log('[AuthContext] Inicializando...');
    
    // Get initial session with timeout
    const initializeAuth = async () => {
      try {
        if (!isSupabaseConfigured()) {
          console.log('[AuthContext] Supabase no configurado - continuando sin autenticación');
          setLoading(false);
          return;
        }

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Auth initialization timeout')), 5000);
        });

        const authPromise = (async () => {
          // Get current session
          const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('[AuthContext] Error obteniendo sesión:', sessionError);
            return;
          }

          console.log('[AuthContext] Sesión actual:', currentSession ? 'Existe' : 'No existe');
          
          if (currentSession) {
            setSession(currentSession);
            
            // Get user profile
            const { user: userData, error: userError } = await getCurrentUser();
            
            if (userError) {
              console.error('[AuthContext] Error obteniendo usuario:', userError);
            } else if (userData) {
              console.log('[AuthContext] Usuario cargado:', userData.email, 'Rol:', userData.rol_app);
              setUser(userData);
              
              // Register for push notifications (non-blocking)
              registerForPushNotifications()
                .then(pushToken => {
                  if (pushToken) {
                    savePushToken(userData.id, pushToken)
                      .then(() => console.log('[AuthContext] Push token registrado'))
                      .catch(err => console.log('[AuthContext] Error guardando push token:', err));
                  }
                })
                .catch(err => console.log('[AuthContext] Error registrando notificaciones:', err));
            }
          }
        })();

        await Promise.race([authPromise, timeoutPromise]);
      } catch (error) {
        console.error('[AuthContext] Error inicializando auth:', error);
        // Continue anyway - app should work without auth
      } finally {
        setLoading(false);
        console.log('[AuthContext] Inicialización completada');
      }
    };

    initializeAuth();

    // Listen for auth changes
    let subscription: { unsubscribe: () => void } | null = null;
    
    try {
      if (isSupabaseConfigured()) {
        const { data } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
          console.log('[AuthContext] Auth state cambió:', event);
          console.log('[AuthContext] Current pathname:', pathname);
          
          setSession(currentSession);
          
          if (event === 'SIGNED_IN' && currentSession) {
            console.log('[AuthContext] Usuario inició sesión');
            
            // Get user profile
            const { user: userData, error: userError } = await getCurrentUser();
            
            if (userError) {
              console.error('[AuthContext] Error obteniendo usuario:', userError);
            } else if (userData) {
              console.log('[AuthContext] Usuario actualizado:', userData.email, 'Rol:', userData.rol_app);
              setUser(userData);
              
              // Only redirect if NOT on callback page (callback handles its own redirect)
              if (!pathname?.includes('/auth/callback')) {
                // FIXED: Check if user is new (no username or nombre) or existing
                const isNewUser = !userData.username || !userData.nombre;
                
                if (isNewUser) {
                  console.log('[AuthContext] Usuario nuevo, redirigiendo a editar perfil...');
                  router.replace('/editar/perfil');
                } else {
                  console.log('[AuthContext] Usuario existente, redirigiendo a explorar...');
                  router.replace('/(tabs)/explorar');
                }
              } else {
                console.log('[AuthContext] En página de callback, no redirigiendo');
              }
              
              // Register for push notifications (non-blocking)
              registerForPushNotifications()
                .then(pushToken => {
                  if (pushToken) {
                    savePushToken(userData.id, pushToken)
                      .then(() => console.log('[AuthContext] Push token registrado'))
                      .catch(err => console.log('[AuthContext] Error guardando push token:', err));
                  }
                })
                .catch(err => console.log('[AuthContext] Error registrando notificaciones:', err));
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('[AuthContext] Usuario cerró sesión - limpiando estado');
            setUser(null);
            setSession(null);
            
            // FIXED: Redirect to explorar (locales list) after logout
            router.replace('/(tabs)/explorar');
          } else if (event === 'TOKEN_REFRESHED') {
            console.log('[AuthContext] Token refrescado');
          } else if (event === 'USER_UPDATED') {
            console.log('[AuthContext] Usuario actualizado');
            
            // Refresh user data
            getCurrentUser()
              .then(({ user: userData }) => {
                if (userData) {
                  setUser(userData);
                }
              })
              .catch(err => console.error('[AuthContext] Error refrescando usuario:', err));
          }
        });
        
        subscription = data.subscription;
      }
    } catch (error) {
      console.error('[AuthContext] Error configurando listener de auth:', error);
    }

    return () => {
      if (subscription) {
        console.log('[AuthContext] Limpiando suscripción');
        subscription.unsubscribe();
      }
    };
  }, [router, pathname]);

  const handleSignOut = async () => {
    try {
      console.log('[AuthContext] Iniciando cierre de sesión...');
      
      // Clear local state first
      setUser(null);
      setSession(null);
      
      if (!isSupabaseConfigured()) {
        console.log('[AuthContext] Supabase no configurado, sesión local limpiada');
        // Redirect to explorar (locales list)
        router.replace('/(tabs)/explorar');
        return;
      }

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[AuthContext] Error cerrando sesión en Supabase:', error);
        throw error;
      }
      
      console.log('[AuthContext] Sesión cerrada exitosamente en Supabase');
      
      // Redirect to explorar (locales list)
      router.replace('/(tabs)/explorar');
    } catch (error) {
      console.error('[AuthContext] Error en signOut:', error);
      // Even if there's an error, we've already cleared local state
      // This ensures the user is logged out locally
      router.replace('/(tabs)/explorar');
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      console.log('[AuthContext] Refrescando usuario...');
      const { user: userData, error } = await getCurrentUser();
      
      if (error) {
        console.error('[AuthContext] Error refrescando usuario:', error);
        return;
      }
      
      if (userData) {
        console.log('[AuthContext] Usuario refrescado:', userData.email, 'Rol:', userData.rol_app);
        setUser(userData);
      }
    } catch (error) {
      console.error('[AuthContext] Error en refreshUser:', error);
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
