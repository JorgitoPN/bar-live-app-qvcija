
import { supabase, isSupabaseConfigured } from './supabase';
import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

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

// Helper to get the correct redirect URL based on environment
const getRedirectUrl = (): string => {
  console.log('[Auth] ========================================');
  console.log('[Auth] Determinando redirect URL');
  console.log('[Auth] Platform:', Platform.OS);
  console.log('[Auth] App Ownership:', Constants.appOwnership);
  console.log('[Auth] ========================================');
  
  if (Platform.OS === 'web') {
    // For web, use the current origin + callback path
    if (typeof window !== 'undefined') {
      const webUrl = `${window.location.origin}/auth/callback`;
      console.log('[Auth] Web redirect URL:', webUrl);
      return webUrl;
    }
    return 'http://localhost:19006/auth/callback';
  }
  
  // For iOS and Android native apps, use custom URL scheme
  // This is more reliable than Universal Links for OAuth callbacks
  const customScheme = 'com.barlive.app://auth/callback';
  
  console.log('[Auth] Native redirect URL:', customScheme);
  return customScheme;
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

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    console.log('[Auth] Email normalizado:', normalizedEmail);

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
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
      
      // Provide user-friendly error messages
      if (authError.message.includes('already registered')) {
        return { user: null, error: 'Este email ya está registrado. ¿Quieres iniciar sesión?' };
      } else if (authError.message.includes('Password')) {
        return { user: null, error: 'La contraseña debe tener al menos 6 caracteres' };
      }
      
      return { user: null, error: authError.message };
    }

    if (!authData.user) {
      return { user: null, error: 'No se pudo crear el usuario' };
    }

    console.log('[Auth] Usuario creado en Auth:', authData.user.id);
    console.log('[Auth] ⚠️ IMPORTANTE: Verifica tu email para activar tu cuenta');

    // Wait for trigger to create profile
    const { success, profile } = await waitForUserProfile(authData.user.id);
    
    if (!success || !profile) {
      console.error('[Auth] No se pudo obtener el perfil del usuario');
      return { user: null, error: 'Error al crear el perfil de usuario' };
    }

    const user: AuthUser = {
      id: authData.user.id,
      email: authData.user.email || normalizedEmail,
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
    console.log('[Auth] ========================================');
    console.log('[Auth] Iniciando sesión con BarLive');
    console.log('[Auth] Email original:', email);
    console.log('[Auth] ========================================');
    
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

    // Normalize email: trim whitespace and convert to lowercase
    const normalizedEmail = email.toLowerCase().trim();
    console.log('[Auth] Email normalizado:', normalizedEmail);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      console.error('[Auth] ❌ Formato de email inválido');
      return { 
        user: null, 
        error: 'Por favor, introduce un email válido' 
      };
    }

    // Validate password
    if (!password || password.length < 6) {
      console.error('[Auth] ❌ Contraseña muy corta');
      return { 
        user: null, 
        error: 'La contraseña debe tener al menos 6 caracteres' 
      };
    }

    // Sign in with Supabase Auth
    console.log('[Auth] Llamando a supabase.auth.signInWithPassword...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authError) {
      console.error('[Auth] ❌ Error en signin:', authError);
      console.error('[Auth] Error code:', authError.status);
      console.error('[Auth] Error message:', authError.message);
      console.error('[Auth] Error name:', authError.name);
      
      // Provide more specific and user-friendly error messages
      const errorMessage = authError.message.toLowerCase();
      
      if (errorMessage.includes('invalid login credentials') || 
          errorMessage.includes('invalid') ||
          authError.status === 400) {
        return { 
          user: null, 
          error: '❌ Email o contraseña incorrectos\n\n' +
                 '✓ Verifica que el email esté escrito correctamente\n' +
                 '✓ Verifica que la contraseña sea correcta\n' +
                 '✓ Asegúrate de haber verificado tu email\n\n' +
                 '💡 ¿Olvidaste tu contraseña? Usa "Recuperar contraseña"'
        };
      } else if (errorMessage.includes('email not confirmed')) {
        return { 
          user: null, 
          error: '📧 Email no verificado\n\n' +
                 'Por favor, verifica tu correo electrónico antes de iniciar sesión.\n\n' +
                 'Revisa tu bandeja de entrada (y spam) y haz clic en el enlace de verificación.'
        };
      } else if (errorMessage.includes('user not found')) {
        return { 
          user: null, 
          error: '❌ No existe una cuenta con este email\n\n' +
                 '¿Quieres crear una cuenta nueva?'
        };
      } else if (errorMessage.includes('too many requests')) {
        return { 
          user: null, 
          error: '⏱️ Demasiados intentos\n\n' +
                 'Por favor, espera unos minutos e intenta nuevamente.'
        };
      } else if (errorMessage.includes('network')) {
        return { 
          user: null, 
          error: '🌐 Error de conexión\n\n' +
                 'Verifica tu conexión a internet e intenta nuevamente.'
        };
      }
      
      return { user: null, error: `Error: ${authError.message}` };
    }

    if (!authData.user) {
      console.error('[Auth] ❌ No se obtuvo usuario de la respuesta');
      return { user: null, error: 'No se pudo iniciar sesión. Por favor, intenta nuevamente.' };
    }

    console.log('[Auth] ✅ Sesión iniciada en Auth');
    console.log('[Auth] User ID:', authData.user.id);
    console.log('[Auth] Email:', authData.user.email);
    console.log('[Auth] Email confirmado:', authData.user.email_confirmed_at ? 'Sí' : 'No');

    // Check if email is confirmed
    if (!authData.user.email_confirmed_at) {
      console.warn('[Auth] ⚠️ Email no confirmado');
      // Sign out the user since email is not confirmed
      await supabase.auth.signOut();
      return { 
        user: null, 
        error: '📧 Email no verificado\n\n' +
               'Por favor, verifica tu correo electrónico antes de iniciar sesión.\n\n' +
               'Revisa tu bandeja de entrada (y spam) y haz clic en el enlace de verificación.'
      };
    }

    // Get user profile from database
    console.log('[Auth] Obteniendo perfil de usuario...');
    const { data: profileData, error: profileError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[Auth] ❌ Error obteniendo perfil:', profileError);
      return { user: null, error: 'No se pudo obtener el perfil de usuario. Por favor, intenta nuevamente.' };
    }

    if (!profileData) {
      console.log('[Auth] ⚠️ Perfil no encontrado, intentando crear...');
      // Try to create profile if it doesn't exist
      const createResult = await createUserProfileManually(
        authData.user.id,
        authData.user.email || normalizedEmail,
        authData.user.user_metadata?.nombre || normalizedEmail.split('@')[0],
        authData.user.user_metadata?.avatar,
        'barlive'
      );
      
      if (!createResult.success || !createResult.profile) {
        console.error('[Auth] ❌ No se pudo crear el perfil');
        return { user: null, error: 'No se pudo crear el perfil de usuario. Por favor, contacta con soporte.' };
      }
      
      const user: AuthUser = {
        id: authData.user.id,
        email: authData.user.email || normalizedEmail,
        nombre: createResult.profile.nombre || 'Usuario',
        avatar: createResult.profile.avatar,
        rol_app: createResult.profile.rol_app || 'cliente',
        provider: 'barlive',
        ha_visto_mensaje_propietario: createResult.profile.ha_visto_mensaje_propietario || false,
      };

      console.log('[Auth] ✅ Inicio de sesión completado (perfil creado)');
      return { user, error: null };
    }

    const user: AuthUser = {
      id: authData.user.id,
      email: authData.user.email || normalizedEmail,
      nombre: profileData.nombre || 'Usuario',
      avatar: profileData.avatar,
      rol_app: profileData.rol_app || 'cliente',
      provider: 'barlive',
      ha_visto_mensaje_propietario: profileData.ha_visto_mensaje_propietario || false,
    };

    console.log('[Auth] ✅ Inicio de sesión completado exitosamente');
    console.log('[Auth] Usuario:', user.nombre);
    console.log('[Auth] ========================================');
    return { user, error: null };
  } catch (error: any) {
    console.error('[Auth] ❌ Excepción en signInWithBarLive:', error);
    console.error('[Auth] Error stack:', error.stack);
    return { 
      user: null, 
      error: '❌ Error inesperado al iniciar sesión\n\n' +
             'Por favor, verifica tu conexión a internet e intenta nuevamente.\n\n' +
             `Detalles técnicos: ${error.message}`
    };
  }
};

// Google Sign-In with proper OAuth flow
export const signInWithGoogle = async (): Promise<{ user: AuthUser | null; error: string | null; isNewUser?: boolean }> => {
  try {
    console.log('[Google Auth] ========================================');
    console.log('[Google Auth] Iniciando Google Sign-In');
    console.log('[Google Auth] Platform:', Platform.OS);
    console.log('[Google Auth] App Ownership:', Constants.appOwnership);
    console.log('[Google Auth] ========================================');
    
    if (!isSupabaseConfigured()) {
      console.log('[Google Auth] Supabase no configurado');
      return { 
        user: null, 
        error: 'Para usar Google Sign-In, necesitas configurar Supabase con tus credenciales de Google Auth. Visita la documentación de Supabase para más información.' 
      };
    }

    // Get the appropriate redirect URL
    const redirectUrl = getRedirectUrl();
    console.log('[Google Auth] Redirect URL configurada:', redirectUrl);

    // Start the OAuth flow
    console.log('[Google Auth] Iniciando OAuth flow con Supabase...');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: Platform.OS !== 'web', // Skip for native, let us handle it
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('[Google Auth] ❌ Error en Google OAuth:', error);
      
      // Check if it's a configuration error
      if (error.message.includes('Provider') || error.message.includes('not enabled')) {
        return { 
          user: null, 
          error: 'Google Sign-In no está configurado correctamente en Supabase.\n\n' +
                 'Pasos para configurar:\n' +
                 '1. Ve a tu Dashboard de Supabase\n' +
                 '2. Authentication > Providers > Google\n' +
                 '3. Habilita el proveedor\n' +
                 '4. Configura el Client ID y Secret de Google Cloud Console\n' +
                 '5. Asegúrate de que la URL de redirección esté configurada correctamente'
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
      console.log('[Google Auth] 🌐 Abriendo navegador para autenticación');
      console.log('[Google Auth] OAuth URL:', data.url);
      
      try {
        // Warm up the browser for better UX
        await WebBrowser.warmUpAsync();
        
        // Use WebBrowser to open the OAuth URL
        console.log('[Google Auth] Llamando a WebBrowser.openAuthSessionAsync...');
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        console.log('[Google Auth] 📱 Resultado de WebBrowser:', result.type);

        // Cool down the browser
        await WebBrowser.coolDownAsync();

        if (result.type === 'success' && result.url) {
          console.log('[Google Auth] ✅ Autenticación exitosa');
          console.log('[Google Auth] Callback URL:', result.url);
          
          // Extract tokens from the callback URL
          let accessToken: string | null = null;
          let refreshToken: string | null = null;
          
          // Try hash parameters first
          if (result.url.includes('#')) {
            const hashPart = result.url.split('#')[1];
            const hashParams = new URLSearchParams(hashPart);
            accessToken = hashParams.get('access_token');
            refreshToken = hashParams.get('refresh_token');
            console.log('[Google Auth] Tokens del hash:', { hasAccess: !!accessToken, hasRefresh: !!refreshToken });
          }
          
          // Try query parameters if not in hash
          if (!accessToken && result.url.includes('?')) {
            const queryString = result.url.split('?')[1].split('#')[0];
            const queryParams = new URLSearchParams(queryString);
            accessToken = queryParams.get('access_token');
            refreshToken = queryParams.get('refresh_token');
            console.log('[Google Auth] Tokens de query:', { hasAccess: !!accessToken, hasRefresh: !!refreshToken });
          }
          
          if (accessToken && refreshToken) {
            console.log('[Google Auth] ✅ Tokens encontrados, estableciendo sesión...');
            
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (sessionError) {
              console.error('[Google Auth] ❌ Error estableciendo sesión:', sessionError);
              return { user: null, error: 'Error al establecer la sesión. Por favor, intenta nuevamente.' };
            }
            
            if (sessionData.user) {
              console.log('[Google Auth] ✅ Sesión establecida para:', sessionData.user.email);
              
              // Wait a bit for the database trigger to create the profile
              console.log('[Google Auth] ⏳ Esperando a que se cree el perfil...');
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Get user profile
              let profileResult = await waitForUserProfile(sessionData.user.id);
              
              // If profile not found, try to create it manually
              if (!profileResult.success || !profileResult.profile) {
                console.log('[Google Auth] ⚠️ Perfil no encontrado por trigger, intentando crear manualmente...');
                
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
                console.error('[Google Auth] ❌ No se pudo obtener ni crear el perfil del usuario');
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

              console.log('[Google Auth] ✅ Google Sign-In completado exitosamente');
              return { user, error: null, isNewUser };
            }
          } else {
            console.error('[Google Auth] ❌ No se encontraron tokens en la URL de callback');
            return { 
              user: null, 
              error: 'No se pudieron obtener los tokens de autenticación. Por favor, intenta nuevamente.' 
            };
          }
        } else if (result.type === 'cancel') {
          console.log('[Google Auth] ℹ️ Usuario canceló la autenticación');
          return { user: null, error: null }; // Don't show error for user cancellation
        } else if (result.type === 'dismiss') {
          console.log('[Google Auth] ℹ️ Usuario cerró el navegador');
          return { user: null, error: null }; // Don't show error for user dismissal
        } else {
          console.log('[Google Auth] ⚠️ Resultado inesperado:', result.type);
          return { user: null, error: 'Resultado inesperado de autenticación' };
        }
      } catch (browserError: any) {
        console.error('[Google Auth] ❌ Error abriendo navegador:', browserError);
        
        // Clean up browser
        try {
          await WebBrowser.coolDownAsync();
        } catch (e) {
          // Ignore cleanup errors
        }
        
        return { user: null, error: `Error abriendo navegador: ${browserError.message}` };
      }
    } else {
      console.error('[Google Auth] ❌ No se obtuvo URL de OAuth');
      return { user: null, error: 'No se pudo obtener la URL de autenticación' };
    }

    return { user: null, error: 'No se pudo completar la autenticación' };
  } catch (error: any) {
    console.error('[Google Auth] ❌ Error en signInWithGoogle:', error);
    console.error('[Google Auth] Error stack:', error.stack);
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

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    const redirectUrl = Platform.OS === 'web'
      ? `${window.location.origin}/auth/reset-password`
      : 'com.barlive.app://auth/reset-password';
    
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
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
