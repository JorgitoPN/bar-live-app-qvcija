
import { supabase, isSupabaseConfigured } from './supabase';
import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

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

// BarLive Authentication (Email/Password)
export const signUpWithBarLive = async (
  email: string,
  password: string,
  nombre: string
): Promise<{ user: AuthUser | null; error: string | null }> => {
  try {
    console.log('[Auth] Iniciando registro con BarLive:', email);
    
    if (!isSupabaseConfigured()) {
      console.log('[Auth] Supabase no configurado, usando modo simulado');
      // Simulate successful signup
      const mockUser: AuthUser = {
        id: `mock-${Date.now()}`,
        email,
        nombre,
        rol_app: 'cliente',
        provider: 'barlive',
        ha_visto_mensaje_propietario: false,
      };
      return { user: mockUser, error: null };
    }

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
          rol_app: 'cliente',
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
    console.log('[Auth] Iniciando sesión con BarLive:', email);
    
    if (!isSupabaseConfigured()) {
      console.log('[Auth] Supabase no configurado, usando modo simulado');
      // Simulate successful login
      const mockUser: AuthUser = {
        id: `mock-${Date.now()}`,
        email,
        nombre: 'Usuario Demo',
        rol_app: 'cliente',
        provider: 'barlive',
        ha_visto_mensaje_propietario: true,
      };
      return { user: mockUser, error: null };
    }

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
      provider: 'barlive',
      ha_visto_mensaje_propietario: profileData.ha_visto_mensaje_propietario || false,
    };

    console.log('[Auth] Inicio de sesión completado exitosamente');
    return { user, error: null };
  } catch (error: any) {
    console.error('[Auth] Error en signInWithBarLive:', error);
    return { user: null, error: error.message || 'Error desconocido' };
  }
};

// Google Sign-In with proper OAuth flow
export const signInWithGoogle = async (): Promise<{ user: AuthUser | null; error: string | null; isNewUser?: boolean }> => {
  try {
    console.log('[Google Auth] Iniciando Google Sign-In');
    console.log('[Google Auth] Platform:', Platform.OS);
    
    if (!isSupabaseConfigured()) {
      console.log('[Google Auth] Supabase no configurado');
      return { 
        user: null, 
        error: 'Para usar Google Sign-In, necesitas configurar Supabase con tus credenciales de Google Auth. Visita la documentación de Supabase para más información.' 
      };
    }

    // Determine redirect URL based on platform
    let redirectUrl: string;
    
    if (Platform.OS === 'web') {
      // For web, use the current origin + callback path
      if (typeof window !== 'undefined') {
        redirectUrl = `${window.location.origin}/auth/callback`;
        console.log('[Google Auth] Web redirect URL:', redirectUrl);
      } else {
        redirectUrl = 'http://localhost:19006/auth/callback';
      }
    } else {
      // For native apps, use the app scheme
      redirectUrl = 'natively://auth/callback';
      console.log('[Google Auth] Native redirect URL:', redirectUrl);
    }

    console.log('[Google Auth] Redirect URL configurada:', redirectUrl);

    // Start the OAuth flow
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: Platform.OS === 'web', // Don't skip on web, let Supabase handle it
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('[Google Auth] Error en Google OAuth:', error);
      
      // Check if it's a configuration error
      if (error.message.includes('Provider') || error.message.includes('not enabled')) {
        return { 
          user: null, 
          error: 'Google Sign-In no está configurado en Supabase. Por favor, habilita el proveedor de Google en tu Dashboard de Supabase (Authentication > Providers > Google).' 
        };
      }
      
      return { user: null, error: error.message };
    }

    // For web, Supabase will handle the redirect automatically
    if (Platform.OS === 'web') {
      console.log('[Google Auth] Redirigiendo a Google OAuth en web...');
      if (data?.url) {
        // Redirect to Google OAuth page
        window.location.href = data.url;
      }
      // Return null as the actual authentication will complete after redirect
      return { user: null, error: null };
    }

    // For native apps, open the auth URL in a browser
    if (data?.url) {
      console.log('[Google Auth] Abriendo navegador para autenticación');
      
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl,
        {
          showInRecents: true,
        }
      );

      console.log('[Google Auth] Resultado de autenticación:', result.type);

      if (result.type === 'success') {
        // Extract the URL from the result
        const url = result.url;
        console.log('[Google Auth] URL de callback recibida');
        
        // Parse the URL to get the tokens from hash
        const hashParams = new URLSearchParams(url.split('#')[1]);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          console.log('[Google Auth] Tokens obtenidos, estableciendo sesión');
          
          // Set the session with the tokens
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('[Google Auth] Error estableciendo sesión:', sessionError);
            return { user: null, error: sessionError.message };
          }

          if (sessionData.user) {
            console.log('[Google Auth] Sesión establecida para usuario:', sessionData.user.id);
            console.log('[Google Auth] User metadata:', sessionData.user.user_metadata);
            console.log('[Google Auth] App metadata:', sessionData.user.app_metadata);
            
            // Wait for trigger to create profile
            let profileResult = await waitForUserProfile(sessionData.user.id);
            
            // If profile not found, try to create it manually
            if (!profileResult.success || !profileResult.profile) {
              console.log('[Google Auth] Perfil no encontrado por trigger, intentando crear manualmente...');
              
              const nombre = sessionData.user.user_metadata?.full_name || 
                            sessionData.user.user_metadata?.name || 
                            sessionData.user.email?.split('@')[0] || 
                            'Usuario';
              const avatar = sessionData.user.user_metadata?.avatar_url || 
                            sessionData.user.user_metadata?.picture;
              
              profileResult = await createUserProfileManually(
                sessionData.user.id,
                sessionData.user.email || '',
                nombre,
                avatar,
                'google'
              );
            }
            
            if (!profileResult.success || !profileResult.profile) {
              console.error('[Google Auth] No se pudo obtener ni crear el perfil del usuario');
              return { 
                user: null, 
                error: 'Error al obtener el perfil de usuario. Por favor, intenta cerrar sesión y volver a iniciar sesión.' 
              };
            }

            const isNewUser = !profileResult.profile.ha_visto_mensaje_propietario;

            const user: AuthUser = {
              id: sessionData.user.id,
              email: sessionData.user.email || '',
              nombre: profileResult.profile.nombre || 'Usuario',
              avatar: profileResult.profile.avatar,
              rol_app: profileResult.profile.rol_app || 'cliente',
              provider: 'google',
              ha_visto_mensaje_propietario: profileResult.profile.ha_visto_mensaje_propietario || false,
            };

            console.log('[Google Auth] Google Sign-In completado exitosamente');
            return { user, error: null, isNewUser };
          }
        }
      } else if (result.type === 'cancel') {
        console.log('[Google Auth] Usuario canceló la autenticación');
        return { user: null, error: 'Autenticación cancelada' };
      }
    }

    return { user: null, error: 'No se pudo completar la autenticación' };
  } catch (error: any) {
    console.error('[Google Auth] Error en signInWithGoogle:', error);
    return { user: null, error: error.message || 'Error al iniciar sesión con Google' };
  }
};

// Sign out
export const signOut = async (): Promise<{ error: string | null }> => {
  try {
    console.log('[Auth] Cerrando sesión');
    
    if (!isSupabaseConfigured()) {
      console.log('[Auth] Supabase no configurado, cerrando sesión local');
      return { error: null };
    }

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
    if (!isSupabaseConfigured()) {
      console.log('[Auth] Supabase no configurado');
      return { user: null, error: null };
    }

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
    if (!isSupabaseConfigured()) {
      console.log('[Auth] Supabase no configurado, actualizando rol localmente');
      return { error: null };
    }

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
    if (!isSupabaseConfigured()) {
      console.log('[Auth] Supabase no configurado');
      return { error: null };
    }

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
    
    if (!isSupabaseConfigured()) {
      console.log('[Auth] Supabase no configurado');
      Alert.alert('Información', 'Por favor configura Supabase para usar recuperación de contraseña');
      return { error: null };
    }

    const redirectUrl = Platform.OS === 'web'
      ? `${window.location.origin}/auth/reset-password`
      : 'natively://auth/reset-password';
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
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
