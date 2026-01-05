
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from "react";
import { Platform } from "react-native";
import { supabase } from "@/app/integrations/supabase/client";

interface User {
  id: string;
  email: string;
  nombre?: string;
  avatar?: string;
  rol_app?: string;
  username?: string;
  bio?: string;
  sitio_web?: string;
  ubicacion?: string;
  mostrar_ubicacion?: boolean;
  en_linea?: boolean;
  mostrar_estado_online?: boolean;
  ha_visto_mensaje_propietario?: boolean;
  ha_aceptado_terminos?: boolean;
  fecha_aceptacion_terminos?: string;
  perfil_completado?: boolean;
  solicitud_propietario_id?: string;
  fecha_aprobacion_propietario?: string;
  provider?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * ✅ AUTH CONTEXT v100.0 - MAXIMUM UPDATE DEPTH FIX
 * 
 * CRITICAL FIXES v100.0:
 * - ✅ Fixed "Maximum update depth exceeded" error by removing circular dependencies
 * - ✅ Used useRef to prevent concurrent fetches and unnecessary re-renders
 * - ✅ Memoized all callbacks with useCallback for stable references
 * - ✅ Memoized context value with useMemo to prevent recreation on every render
 * - ✅ Added mounted checks to prevent state updates after unmount
 * - ✅ Proper cleanup in useEffect
 * - ✅ Fixed import path to use @/utils/auth instead of @/lib/auth
 */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 🔥 FIX: Prevent concurrent fetches
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchUser = useCallback(async () => {
    if (isFetchingRef.current) {
      console.log('[AuthContext v100.0] Already fetching, skipping...');
      return;
    }
    
    isFetchingRef.current = true;
    try {
      setLoading(true);
      
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (!mountedRef.current) return;
      
      if (authError || !authUser) {
        setUser(null);
        return;
      }

      // Get user profile from database
      const { data: profileData, error: profileError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!mountedRef.current) return;

      if (profileError || !profileData) {
        console.error('[AuthContext v100.0] Error loading profile:', profileError);
        setUser(null);
        return;
      }

      const userData: User = {
        id: authUser.id,
        email: authUser.email || '',
        nombre: profileData.nombre || 'Usuario',
        avatar: profileData.avatar,
        rol_app: profileData.rol_app || 'cliente',
        username: profileData.username,
        bio: profileData.bio,
        sitio_web: profileData.sitio_web,
        ubicacion: profileData.ubicacion,
        mostrar_ubicacion: profileData.mostrar_ubicacion,
        en_linea: profileData.en_linea,
        mostrar_estado_online: profileData.mostrar_estado_online,
        ha_visto_mensaje_propietario: profileData.ha_visto_mensaje_propietario || false,
        ha_aceptado_terminos: profileData.ha_aceptado_terminos || false,
        fecha_aceptacion_terminos: profileData.fecha_aceptacion_terminos,
        perfil_completado: profileData.perfil_completado || false,
        solicitud_propietario_id: profileData.solicitud_propietario_id,
        fecha_aprobacion_propietario: profileData.fecha_aprobacion_propietario,
        provider: profileData.provider || 'barlive',
      };

      setUser(userData);
    } catch (error) {
      console.error("[AuthContext v100.0] Failed to fetch user:", error);
      if (mountedRef.current) {
        setUser(null);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      await fetchUser();
    } catch (error) {
      console.error("[AuthContext v100.0] Email sign in failed:", error);
      throw error;
    }
  }, [fetchUser]);

  const signUpWithEmail = useCallback(async (email: string, password: string, name?: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre: name,
            rol_app: 'cliente',
            provider: 'barlive',
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      await fetchUser();
    } catch (error) {
      console.error("[AuthContext v100.0] Email sign up failed:", error);
      throw error;
    }
  }, [fetchUser]);

  const signInWithGoogle = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: Platform.OS === 'web' ? `${window.location.origin}/auth/callback` : 'barlive://auth/callback',
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      await fetchUser();
    } catch (error) {
      console.error("[AuthContext v100.0] Google sign in failed:", error);
      throw error;
    }
  }, [fetchUser]);

  const signInWithApple = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: Platform.OS === 'web' ? `${window.location.origin}/auth/callback` : 'barlive://auth/callback',
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      await fetchUser();
    } catch (error) {
      console.error("[AuthContext v100.0] Apple sign in failed:", error);
      throw error;
    }
  }, [fetchUser]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      if (mountedRef.current) {
        setUser(null);
      }
    } catch (error) {
      console.error("[AuthContext v100.0] Sign out failed:", error);
      throw error;
    }
  }, []);

  // 🔥 FIX: Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    signOut,
    fetchUser,
  }), [user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, signOut, fetchUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
