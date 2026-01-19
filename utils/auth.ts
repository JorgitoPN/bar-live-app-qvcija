
import { supabase } from '@/app/integrations/supabase/client';
import { Alert } from 'react-native';

export interface AuthUser {
  id: string;
  email: string;
  nombre: string;
  avatar?: string;
  rol_app: 'cliente' | 'propietario' | 'admin';
  provider?: 'barlive' | 'google';
  ha_visto_mensaje_propietario?: boolean;
  ha_aceptado_terminos?: boolean;
  fecha_aceptacion_terminos?: string;
  perfil_completado?: boolean;
  solicitud_propietario_id?: string;
  fecha_aprobacion_propietario?: string;
  bio?: string;
  username?: string;
  sitio_web?: string;
  ubicacion?: string;
  mostrar_ubicacion?: boolean;
  en_linea?: boolean;
  mostrar_estado_online?: boolean;
}

// Helper function to wait for user profile to be created by trigger
const waitForUserProfile = async (userId: string, maxRetries = 5): Promise<{ success: boolean; profile?: any; error?: string }> => {
  let retries = maxRetries;
  
  while (retries > 0) {
    console.log(`[Auth] Verificando perfil de usuario (intento ${maxRetries - retries + 1}/${maxRetries})...`);
    
    const { data: profile, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profile) {
      console.log('[Auth] Perfil encontrado:', profile);
      return { success: true, profile };
    }
    
    if (error) {
      console.error('[Auth] Error verificando perfil:', error);
    }
    
    retries--;
    if (retries > 0) {
      console.log('[Auth] Perfil no encontrado, esperando 1 segundo antes de reintentar...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return { success: false, error: 'No se pudo encontrar el perfil después de varios intentos' };
};

// Helper function to create user profile manually if trigger fails
const createUserProfileManually = async (userId: string, email: string, nombre: string, avatar?: string, provider: 'barlive' | 'google' = 'barlive'): Promise<{ success: boolean; profile?: any; error?: string }> => {
  try {
    console.log('[Auth] Creando perfil de usuario manualmente...');
    
    const { data: profile, error } = await supabase
      .from('usuarios')
      .insert({
        id: userId,
        email: email,
        nombre: nombre,
        avatar: avatar,
        rol_app: 'cliente',
        provider: provider,
        activo: true,
        ha_visto_mensaje_propietario: false,
        fecha_registro: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[Auth] Error creando perfil manualmente:', error);
      return { success: false, error: error.message };
    }

    console.log('[Auth] Perfil creado manualmente:', profile);
    return { success: true, profile };
  } catch (error: any) {
    console.error('[Auth] Excepción al crear perfil manualmente:', error);
    return { success: false, error: error.message };
  }
};

// BarLive Authentication (Email/Password) - Version 3.0
export const signUpWithBarLive = async (
  email: string,
  password: string,
  nombre: string
): Promise<{ user: AuthUser | null; error: string | null }> => {
  try {
    console.log('[Auth] Iniciando registro con BarLive 3.0:', email);

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
          rol_app: 'cliente',
          provider: 'barlive',
        },
        emailRedirectTo: 'https://natively.dev/email-confirmed',
      },
    });

    if (authError) {
      console.error('[Auth] Error en signup:', authError);
      return { user: null, error: authError.message };
    }

    if (!authData.user) {
      return { user: null, error: 'No se pudo crear el usuario' };
    }

    console.log('[Auth] Usuario creado en Auth:', authData.user.id);

    // Wait for trigger to create profile
    const { success, profile } = await waitForUserProfile(authData.user.id);
    
    if (!success || !profile) {
      console.error('[Auth] No se pudo obtener el perfil del usuario');
      return { user: null, error: 'Error al crear el perfil de usuario' };
    }

    const user: AuthUser = {
      id: authData.user.id,
      email: authData.user.email || email,
      nombre: profile.nombre,
      avatar: profile.avatar,
      rol_app: profile.rol_app || 'cliente',
      provider: 'barlive',
      ha_visto_mensaje_propietario: profile.ha_visto_mensaje_propietario || false,
    };

    console.log('[Auth] Registro completado exitosamente');
    return { user, error: null };
  } catch (error: any) {
    console.error('[Auth] Error en signUpWithBarLive:', error);
    return { user: null, error: error.message || 'Error desconocido' };
  }
};

export const signInWithBarLive = async (
  email: string,
  password: string
): Promise<{ user: AuthUser | null; error: string | null }> => {
  try {
    console.log('[Auth] Iniciando sesión con BarLive 3.0:', email);

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('[Auth] Error en signin:', authError);
      return { user: null, error: 'Email o contraseña incorrectos' };
    }

    if (!authData.user) {
      return { user: null, error: 'No se pudo iniciar sesión' };
    }

    console.log('[Auth] Sesión iniciada en Auth:', authData.user.id);

    // Get user profile from database
    const { data: profileData, error: profileError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileError || !profileData) {
      console.error('[Auth] Error obteniendo perfil:', profileError);
      return { user: null, error: 'No se pudo obtener el perfil de usuario' };
    }

    const user: AuthUser = {
      id: authData.user.id,
      email: authData.user.email || email,
      nombre: profileData.nombre || 'Usuario',
      avatar: profileData.avatar,
      rol_app: profileData.rol_app || 'cliente',
      provider: profileData.provider || 'barlive',
      ha_visto_mensaje_propietario: profileData.ha_visto_mensaje_propietario || false,
    };

    console.log('[Auth] Inicio de sesión completado exitosamente');
    return { user, error: null };
  } catch (error: any) {
    console.error('[Auth] Error en signInWithBarLive:', error);
    return { user: null, error: error.message || 'Error desconocido' };
  }
};

// Sign out
export const signOut = async (): Promise<{ error: string | null }> => {
  try {
    console.log('[Auth] Cerrando sesión');

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('[Auth] Error en signOut:', error);
      return { error: error.message };
    }

    console.log('[Auth] Sesión cerrada exitosamente');
    return { error: null };
  } catch (error: any) {
    console.error('[Auth] Error en signOut:', error);
    return { error: error.message || 'Error al cerrar sesión' };
  }
};

// Get current user
export const getCurrentUser = async (): Promise<{ user: AuthUser | null; error: string | null }> => {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('[Auth] Error obteniendo usuario:', authError);
      return { user: null, error: authError.message };
    }

    if (!authUser) {
      return { user: null, error: null };
    }

    // Get user profile from database
    const { data: profileData, error: profileError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileError || !profileData) {
      console.error('[Auth] Error obteniendo perfil:', profileError);
      return { user: null, error: 'No se pudo obtener el perfil de usuario' };
    }

    const user: AuthUser = {
      id: authUser.id,
      email: authUser.email || '',
      nombre: profileData.nombre || 'Usuario',
      avatar: profileData.avatar,
      rol_app: profileData.rol_app || 'cliente',
      provider: profileData.provider || 'barlive',
      ha_visto_mensaje_propietario: profileData.ha_visto_mensaje_propietario || false,
      ha_aceptado_terminos: profileData.ha_aceptado_terminos || false,
      fecha_aceptacion_terminos: profileData.fecha_aceptacion_terminos,
      perfil_completado: profileData.perfil_completado || false,
      solicitud_propietario_id: profileData.solicitud_propietario_id,
      fecha_aprobacion_propietario: profileData.fecha_aprobacion_propietario,
      bio: profileData.bio,
      username: profileData.username,
      sitio_web: profileData.sitio_web,
      ubicacion: profileData.ubicacion,
      mostrar_ubicacion: profileData.mostrar_ubicacion,
      en_linea: profileData.en_linea,
      mostrar_estado_online: profileData.mostrar_estado_online,
    };

    return { user, error: null };
  } catch (error: any) {
    console.error('[Auth] Error en getCurrentUser:', error);
    return { user: null, error: error.message || 'Error desconocido' };
  }
};

// Update user role
export const updateUserRole = async (
  userId: string,
  newRole: 'cliente' | 'propietario' | 'admin'
): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase
      .from('usuarios')
      .update({ rol_app: newRole })
      .eq('id', userId);

    if (error) {
      console.error('[Auth] Error actualizando rol:', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (error: any) {
    console.error('[Auth] Error en updateUserRole:', error);
    return { error: error.message || 'Error al actualizar rol' };
  }
};

// Mark that user has seen the propietario message
export const markPropietarioMessageSeen = async (userId: string): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase
      .from('usuarios')
      .update({ ha_visto_mensaje_propietario: true })
      .eq('id', userId);

    if (error) {
      console.error('[Auth] Error marcando mensaje visto:', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (error: any) {
    console.error('[Auth] Error en markPropietarioMessageSeen:', error);
    return { error: error.message || 'Error al marcar mensaje' };
  }
};

// Password reset
export const resetPassword = async (email: string): Promise<{ error: string | null }> => {
  try {
    console.log('[Auth] Solicitando recuperación de contraseña para:', email);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://natively.dev/auth/reset-password',
    });

    if (error) {
      console.error('[Auth] Error en resetPassword:', error);
      return { error: error.message };
    }

    console.log('[Auth] Email de recuperación enviado');
    return { error: null };
  } catch (error: any) {
    console.error('[Auth] Error en resetPassword:', error);
    return { error: error.message || 'Error al enviar email de recuperación' };
  }
};
