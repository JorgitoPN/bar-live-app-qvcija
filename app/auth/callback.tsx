
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
    let redirectTimeout: NodeJS.Timeout;
    let hasRedirected = false;

    const safeRedirect = (path: string) => {
      if (!hasRedirected && isMounted) {
        hasRedirected = true;
        console.log('[Callback] 🚀 Redirigiendo a:', path);
        // Use replace to avoid back button issues
        router.replace(path as any);
      }
    };

    const handleCallback = async () => {
      try {
        console.log('[Callback] Procesando callback de autenticación...');
        console.log('[Callback] Platform:', Platform.OS);
        console.log('[Callback] Params:', params);
        
        // FIXED: Reduced timeout to 3 seconds for faster redirect
        redirectTimeout = setTimeout(() => {
          if (isMounted && !hasRedirected) {
            console.log('[Callback] ⚠️ Timeout alcanzado, redirigiendo a explorar...');
            setMensaje('Redirigiendo...');
            safeRedirect('/(tabs)/explorar');
          }
        }, 3000); // 3 seconds max
        
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
            
            clearTimeout(redirectTimeout);
            setTimeout(() => {
              safeRedirect('/(tabs)/explorar');
            }, 1500);
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
              
              clearTimeout(redirectTimeout);
              setTimeout(() => {
                safeRedirect('/(tabs)/explorar');
              }, 1500);
              return;
            }

            if (data.user) {
              clearTimeout(redirectTimeout);
              
              // Register for push notifications (non-blocking)
              try {
                const pushToken = await registerForPushNotifications();
                if (pushToken) {
                  await savePushToken(data.user.id, pushToken);
                  console.log('[Callback] Push token registrado');
                }
              } catch (notifError) {
                console.log('[Callback] Error registrando notificaciones:', notifError);
              }
              
              // FIXED: Immediate redirect - let AuthContext handle profile completion check
              console.log('[Callback] ✅ Sesión establecida, redirigiendo inmediatamente');
              safeRedirect('/(tabs)/explorar');
              return;
            }
          }
        }
        
        // For native or if no hash params, check for existing session
        console.log('[Callback] Verificando sesión existente...');
        if (isMounted) {
          setMensaje('Verificando sesión...');
        }
        
        // FIXED: Reduced wait time to 500ms
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[Callback] Error obteniendo sesión:', sessionError);
          if (isMounted) {
            setError('Error al verificar la sesión.');
          }
          
          clearTimeout(redirectTimeout);
          setTimeout(() => {
            safeRedirect('/(tabs)/explorar');
          }, 1000);
          return;
        }

        if (session?.user) {
          console.log('[Callback] ✅ Sesión encontrada para usuario:', session.user.id);
          clearTimeout(redirectTimeout);
          
          // Register for push notifications (non-blocking)
          try {
            const pushToken = await registerForPushNotifications();
            if (pushToken) {
              await savePushToken(session.user.id, pushToken);
              console.log('[Callback] Push token registrado');
            }
          } catch (notifError) {
            console.log('[Callback] Error registrando notificaciones:', notifError);
          }
          
          // FIXED: Immediate redirect - let AuthContext handle profile completion check
          console.log('[Callback] ✅ Redirigiendo inmediatamente a explorar');
          safeRedirect('/(tabs)/explorar');
        } else {
          console.log('[Callback] No hay sesión activa, redirigiendo a explorar...');
          if (isMounted) {
            setMensaje('Redirigiendo...');
          }
          
          clearTimeout(redirectTimeout);
          setTimeout(() => {
            safeRedirect('/(tabs)/explorar');
          }, 300);
        }
      } catch (error: any) {
        console.error('[Callback] Error en callback:', error);
        if (isMounted) {
          setError(`Error inesperado: ${error.message || 'Error desconocido'}`);
        }
        
        clearTimeout(redirectTimeout);
        setTimeout(() => {
          safeRedirect('/(tabs)/explorar');
        }, 1000);
      }
    };

    handleCallback();

    return () => {
      isMounted = false;
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
      }
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
          <Text style={styles.subText}>Por favor espera un momento...</Text>
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
    fontWeight: '600',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  subText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
