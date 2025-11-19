
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '@/utils/supabase';
import { AuthUser, getCurrentUser } from '@/utils/auth';
import { registerForPushNotifications, savePushToken } from '@/utils/notifications';
import { Session } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

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

  useEffect(() => {
    console.log('[AuthContext] 🚀 Inicializando contexto de autenticación');
    
    let authSubscription: { unsubscribe: () => void } | null = null;
    
    // Initialize auth state
    const initializeAuth = async () => {
      try {
        if (!isSupabaseConfigured()) {
          console.log('[AuthContext] ⚠️ Supabase no configurado - modo sin autenticación');
          setLoading(false);
          return;
        }

        console.log('[AuthContext] 🔍 Obteniendo sesión actual...');
        
        // ENHANCED: Add retry logic with storage verification
        let currentSession = null;
        let retries = 5; // Increased retries
        
        while (retries > 0 && !currentSession) {
          const { data: { session: sessionData }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('[AuthContext] ❌ Error obteniendo sesión:', error);
          }
          
          currentSession = sessionData;
          
          if (!currentSession && retries > 1) {
            console.log('[AuthContext] ⏳ Sesión no encontrada, verificando storage...');
            
            // Check if session exists in storage
            try {
              if (Platform.OS !== 'web') {
                const storedSession = await SecureStore.getItemAsync('supabase.auth.token');
                console.log('[AuthContext] SecureStore session:', storedSession ? 'PRESENTE' : 'AUSENTE');
              } else {
                const storedSession = localStorage.getItem('supabase.auth.token');
                console.log('[AuthContext] localStorage session:', storedSession ? 'PRESENTE' : 'AUSENTE');
              }
            } catch (e) {
              console.error('[AuthContext] Error verificando storage:', e);
            }
            
            console.log('[AuthContext] ⏳ Reintentando en 700ms...');
            await new Promise(resolve => setTimeout(resolve, 700));
          }
          
          retries--;
        }
        
        if (currentSession) {
          console.log('[AuthContext] ✅ Sesión existente encontrada para:', currentSession.user.email);
          console.log('[AuthContext] Session expires at:', new Date(currentSession.expires_at! * 1000).toISOString());
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
          console.log('[AuthContext] ℹ️ No hay sesión activa después de', 5 - retries, 'intentos');
        }
      } catch (error) {
        console.error('[AuthContext] ❌ Error inicializando:', error);
      } finally {
        console.log('[AuthContext] ✅ Inicialización completada');
        setLoading(false);
      }
    };

    // Set up auth state listener
    const setupAuthListener = () => {
      if (!isSupabaseConfigured()) {
        return;
      }

      const { data } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        console.log('[AuthContext] 🔄 Auth state cambió:', event);
        console.log('[AuthContext] Session:', currentSession ? 'presente' : 'ausente');
        console.log('[AuthContext] User:', currentSession?.user?.email || 'ninguno');
        
        if (currentSession) {
          console.log('[AuthContext] Session expires at:', new Date(currentSession.expires_at! * 1000).toISOString());
        }
        
        setSession(currentSession);
        
        if (event === 'SIGNED_IN' && currentSession) {
          console.log('[AuthContext] ✅ Usuario inició sesión:', currentSession.user.email);
          
          // Load user profile
          try {
            // Wait a bit for the database trigger to create the profile
            await new Promise(resolve => setTimeout(resolve, 1000));
            
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
            } else {
              console.log('[AuthContext] ⚠️ No se pudo cargar el perfil del usuario');
            }
          } catch (error) {
            console.error('[AuthContext] ❌ Error cargando perfil:', error);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] 🚪 Usuario cerró sesión');
          setUser(null);
          setSession(null);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('[AuthContext] 🔄 Token refrescado');
          // Session is already updated, reload user profile to ensure it's current
          try {
            const { user: userData } = await getCurrentUser();
            if (userData) {
              console.log('[AuthContext] ✅ Perfil actualizado después de refresh:', userData.email);
              setUser(userData);
            }
          } catch (error) {
            console.error('[AuthContext] ❌ Error actualizando usuario después de refresh:', error);
          }
        } else if (event === 'USER_UPDATED') {
          console.log('[AuthContext] 🔄 Usuario actualizado');
          try {
            const { user: userData } = await getCurrentUser();
            if (userData) {
              setUser(userData);
            }
          } catch (error) {
            console.error('[AuthContext] ❌ Error actualizando usuario:', error);
          }
        } else if (event === 'INITIAL_SESSION') {
          console.log('[AuthContext] 🔄 Sesión inicial detectada');
          // This event fires when the session is first loaded from storage
          if (currentSession) {
            try {
              const { user: userData } = await getCurrentUser();
              if (userData) {
                console.log('[AuthContext] ✅ Perfil cargado desde sesión inicial:', userData.email);
                setUser(userData);
              }
            } catch (error) {
              console.error('[AuthContext] ❌ Error cargando perfil desde sesión inicial:', error);
            }
          }
        }
      });
      
      authSubscription = data.subscription;
    };

    // Initialize and set up listener
    initializeAuth().then(() => {
      setupAuthListener();
    });

    return () => {
      if (authSubscription) {
        console.log('[AuthContext] 🧹 Limpiando suscripción');
        authSubscription.unsubscribe();
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
      
      // ENHANCED: Add retry logic with storage verification
      let currentSession = null;
      let retries = 5; // Increased retries
      
      while (retries > 0 && !currentSession) {
        const { data: { session: sessionData }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthContext] ❌ Error obteniendo sesión en refresh:', error);
        }
        
        currentSession = sessionData;
        
        if (!currentSession && retries > 1) {
          console.log('[AuthContext] ⏳ Sesión no encontrada en refresh, verificando storage...');
          
          // Check if session exists in storage
          try {
            if (Platform.OS !== 'web') {
              const storedSession = await SecureStore.getItemAsync('supabase.auth.token');
              console.log('[AuthContext] SecureStore session:', storedSession ? 'PRESENTE' : 'AUSENTE');
              
              // If session exists in storage but not in memory, try to restore it
              if (storedSession) {
                console.log('[AuthContext] 🔧 Intentando restaurar sesión desde storage...');
                try {
                  const parsed = JSON.parse(storedSession);
                  if (parsed.access_token && parsed.refresh_token) {
                    const { data, error: setError } = await supabase.auth.setSession({
                      access_token: parsed.access_token,
                      refresh_token: parsed.refresh_token,
                    });
                    
                    if (!setError && data.session) {
                      console.log('[AuthContext] ✅ Sesión restaurada desde storage');
                      currentSession = data.session;
                      break;
                    }
                  }
                } catch (e) {
                  console.error('[AuthContext] Error restaurando sesión:', e);
                }
              }
            } else {
              const storedSession = localStorage.getItem('supabase.auth.token');
              console.log('[AuthContext] localStorage session:', storedSession ? 'PRESENTE' : 'AUSENTE');
            }
          } catch (e) {
            console.error('[AuthContext] Error verificando storage:', e);
          }
          
          console.log('[AuthContext] ⏳ Reintentando en 700ms...');
          await new Promise(resolve => setTimeout(resolve, 700));
        }
        
        retries--;
      }
      
      if (!currentSession) {
        console.log('[AuthContext] ⚠️ No hay sesión activa para refrescar después de', 5 - retries, 'intentos');
        setUser(null);
        setSession(null);
        return;
      }
      
      console.log('[AuthContext] ✅ Sesión encontrada:', currentSession.user.email);
      setSession(currentSession);
      
      const { user: userData } = await getCurrentUser();
      
      if (userData) {
        console.log('[AuthContext] ✅ Usuario refrescado:', userData.email);
        setUser(userData);
      } else {
        console.log('[AuthContext] ⚠️ No se pudo refrescar el usuario');
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
