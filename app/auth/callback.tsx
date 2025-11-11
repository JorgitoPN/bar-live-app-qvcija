
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { registerForPushNotifications, savePushToken } from '@/utils/notifications';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [mensaje, setMensaje] = useState('Completando autenticación...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const handleCallback = async () => {
      try {
        console.log('[Callback] Procesando callback de autenticación...');
        console.log('[Callback] Platform:', Platform.OS);
        console.log('[Callback] Params:', params);
        
        // For web, check URL hash for tokens
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash) {
          console.log('[Callback] Procesando callback web con hash');
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const errorParam = hashParams.get('error');
          const errorDescription = hashParams.get('error_description');

          console.log('[Callback] Hash params:', {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            error: errorParam,
            errorDescription,
          });

          if (errorParam) {
            console.error('[Callback] Error en OAuth callback:', errorParam, errorDescription);
            if (isMounted) {
              setError(`Error de autenticación: ${errorDescription || errorParam}`);
            }
            
            setTimeout(() => {
              if (isMounted) {
                router.replace('/(tabs)/explorar');
              }
            }, 3000);
            return;
          }

          if (accessToken && refreshToken) {
            console.log('[Callback] Tokens encontrados en hash, estableciendo sesión...');
            if (isMounted) {
              setMensaje('Estableciendo sesión...');
            }
            
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error('[Callback] Error estableciendo sesión:', sessionError);
              if (isMounted) {
                setError('Error al establecer la sesión. Por favor, intenta nuevamente.');
              }
              
              setTimeout(() => {
                if (isMounted) {
                  router.replace('/(tabs)/explorar');
                }
              }, 3000);
              return;
            }

            if (data.user) {
              await processUserAfterAuth(data.user);
              return;
            }
          }
        }
        
        // For native or if no hash params, check for existing session
        console.log('[Callback] Verificando sesión existente...');
        if (isMounted) {
          setMensaje('Verificando sesión...');
        }
        
        // Wait a bit for the session to be established
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[Callback] Error obteniendo sesión:', sessionError);
          if (isMounted) {
            setError('Error al verificar la sesión.');
          }
          
          setTimeout(() => {
            if (isMounted) {
              router.replace('/(tabs)/explorar');
            }
          }, 2000);
          return;
        }

        if (session?.user) {
          console.log('[Callback] Sesión encontrada para usuario:', session.user.id);
          await processUserAfterAuth(session.user);
        } else {
          console.log('[Callback] No hay sesión activa, redirigiendo a explorar...');
          if (isMounted) {
            setMensaje('Redirigiendo...');
          }
          
          setTimeout(() => {
            if (isMounted) {
              router.replace('/(tabs)/explorar');
            }
          }, 1000);
        }
      } catch (error: any) {
        console.error('[Callback] Error en callback:', error);
        if (isMounted) {
          setError(`Error inesperado: ${error.message || 'Error desconocido'}`);
        }
        
        setTimeout(() => {
          if (isMounted) {
            router.replace('/(tabs)/explorar');
          }
        }, 3000);
      }
    };

    const processUserAfterAuth = async (user: any) => {
      try {
        console.log('[Callback] Procesando usuario después de autenticación:', user.id);
        if (isMounted) {
          setMensaje('Configurando perfil...');
        }
        
        // Wait for the trigger to create the profile (give it a moment)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Check if user profile exists (should be created by trigger)
        let retries = 3;
        let profileData = null;
        
        while (retries > 0 && !profileData) {
          console.log(`[Callback] Intentando obtener perfil (intento ${4 - retries}/3)...`);
          
          const { data, error: profileError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (data) {
            profileData = data;
            console.log('[Callback] Perfil encontrado:', profileData.email);
            break;
          }
          
          if (profileError) {
            console.error('[Callback] Error obteniendo perfil:', profileError);
          }
          
          retries--;
          if (retries > 0) {
            console.log('[Callback] Perfil no encontrado, esperando 1 segundo antes de reintentar...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        if (!profileData) {
          console.error('[Callback] No se pudo obtener el perfil después de varios intentos');
          if (isMounted) {
            setError('Error al cargar el perfil de usuario. Por favor, intenta cerrar sesión y volver a iniciar.');
          }
          
          setTimeout(() => {
            if (isMounted) {
              router.replace('/(tabs)/explorar');
            }
          }, 3000);
          return;
        }

        // Register for push notifications (non-blocking)
        try {
          if (isMounted) {
            setMensaje('Configurando notificaciones...');
          }
          const pushToken = await registerForPushNotifications();
          if (pushToken) {
            await savePushToken(user.id, pushToken);
            console.log('[Callback] Push token registrado');
          }
        } catch (notifError) {
          console.log('[Callback] Error registrando notificaciones:', notifError);
          // Continue anyway, notifications are not critical
        }

        // FIXED: Determine where to redirect based on profile completeness
        // Check if user has username and nombre (required fields)
        const isNewUser = !profileData.username || !profileData.nombre;
        
        if (isNewUser) {
          console.log('[Callback] Usuario nuevo sin perfil completo, redirigiendo a editar perfil...');
          if (isMounted) {
            setMensaje('¡Bienvenido! Completa tu perfil...');
          }
          
          setTimeout(() => {
            if (isMounted) {
              router.replace('/editar/perfil');
            }
          }, 500);
        } else {
          console.log('[Callback] Usuario existente con perfil completo, redirigiendo a explorar...');
          if (isMounted) {
            setMensaje('¡Autenticación exitosa! Redirigiendo...');
          }
          
          setTimeout(() => {
            if (isMounted) {
              router.replace('/(tabs)/explorar');
            }
          }, 500);
        }
      } catch (error: any) {
        console.error('[Callback] Error procesando usuario:', error);
        if (isMounted) {
          setError(`Error al procesar usuario: ${error.message || 'Error desconocido'}`);
        }
        
        setTimeout(() => {
          if (isMounted) {
            router.replace('/(tabs)/explorar');
          }
        }, 3000);
      }
    };

    handleCallback();

    return () => {
      isMounted = false;
    };
  }, [router, params]);

  return (
    <View style={styles.container}>
      {error ? (
        <>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.subText}>Redirigiendo...</Text>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.text}>{mensaje}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: colors.error || '#EF4444',
    textAlign: 'center',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
