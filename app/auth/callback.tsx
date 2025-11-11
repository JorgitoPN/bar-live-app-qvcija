
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { getCurrentUser } from '@/utils/auth';
import { registerForPushNotifications, savePushToken } from '@/utils/notifications';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    let redirectTimeout: NodeJS.Timeout;

    const safeRedirect = (path: string, delay: number = 0) => {
      if (!isMounted) return;
      
      console.log('[Callback] 🚀 Programando redirección a:', path, 'en', delay, 'ms');
      
      redirectTimeout = setTimeout(() => {
        if (isMounted) {
          console.log('[Callback] ✅ Ejecutando redirección a:', path);
          router.replace(path as any);
        }
      }, delay);
    };

    const handleCallback = async () => {
      try {
        console.log('[Callback] 🔄 Procesando callback de autenticación...');
        console.log('[Callback] Platform:', Platform.OS);
        console.log('[Callback] Params:', params);
        
        // For web, check URL hash for tokens
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const errorParam = hashParams.get('error');
          const errorDescription = hashParams.get('error_description');

          console.log('[Callback] Hash params:', {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            error: errorParam,
          });

          if (errorParam) {
            console.error('[Callback] ❌ Error en OAuth:', errorParam);
            if (isMounted) {
              setStatus('error');
              setErrorMessage(errorDescription || errorParam);
            }
            safeRedirect('/(tabs)/explorar', 2000);
            return;
          }

          if (accessToken && refreshToken) {
            console.log('[Callback] ✅ Tokens encontrados, estableciendo sesión...');
            
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error('[Callback] ❌ Error estableciendo sesión:', sessionError);
              if (isMounted) {
                setStatus('error');
                setErrorMessage('Error al establecer la sesión');
              }
              safeRedirect('/(tabs)/explorar', 2000);
              return;
            }

            if (data.user) {
              console.log('[Callback] ✅ Sesión establecida para usuario:', data.user.email);
              
              // Wait a bit for session to propagate
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Register push notifications (non-blocking)
              registerForPushNotifications()
                .then(pushToken => {
                  if (pushToken) {
                    savePushToken(data.user.id, pushToken).catch(() => {});
                  }
                })
                .catch(() => {});
              
              // Get user profile to check if needs profile completion
              console.log('[Callback] 🔍 Obteniendo perfil de usuario...');
              const { user: userData } = await getCurrentUser();
              
              if (userData) {
                console.log('[Callback] ✅ Perfil obtenido:', {
                  email: userData.email,
                  hasAcceptedTerms: userData.ha_aceptado_terminos,
                  profileCompleted: userData.perfil_completado,
                  hasUsername: !!userData.username,
                  hasName: !!userData.nombre,
                });
                
                // Check if user needs to accept terms
                if (!userData.ha_aceptado_terminos) {
                  console.log('[Callback] 📋 Usuario debe aceptar términos');
                  if (isMounted) setStatus('success');
                  safeRedirect(`/auth/terms-acceptance?userId=${userData.id}`, 300);
                  return;
                }
                
                // Check if user needs to complete profile
                if (!userData.perfil_completado || !userData.username || !userData.nombre) {
                  console.log('[Callback] 📝 Usuario debe completar perfil');
                  if (isMounted) setStatus('success');
                  safeRedirect(`/auth/completar-perfil?userId=${userData.id}`, 300);
                  return;
                }
              }
              
              // All good, go to main app
              console.log('[Callback] ✅ Todo listo, redirigiendo a explorar');
              if (isMounted) setStatus('success');
              safeRedirect('/(tabs)/explorar', 300);
              return;
            }
          }
        }
        
        // For native or if no hash params, check for existing session
        console.log('[Callback] 🔍 Verificando sesión existente...');
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[Callback] ❌ Error obteniendo sesión:', sessionError);
          if (isMounted) {
            setStatus('error');
            setErrorMessage('Error al verificar la sesión');
          }
          safeRedirect('/(tabs)/explorar', 2000);
          return;
        }

        if (session?.user) {
          console.log('[Callback] ✅ Sesión encontrada para:', session.user.email);
          
          // Wait a bit for session to propagate
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Register push notifications (non-blocking)
          registerForPushNotifications()
            .then(pushToken => {
              if (pushToken) {
                savePushToken(session.user.id, pushToken).catch(() => {});
              }
            })
            .catch(() => {});
          
          // Get user profile to check if needs profile completion
          console.log('[Callback] 🔍 Obteniendo perfil de usuario...');
          const { user: userData } = await getCurrentUser();
          
          if (userData) {
            console.log('[Callback] ✅ Perfil obtenido:', {
              email: userData.email,
              hasAcceptedTerms: userData.ha_aceptado_terminos,
              profileCompleted: userData.perfil_completado,
              hasUsername: !!userData.username,
              hasName: !!userData.nombre,
            });
            
            // Check if user needs to accept terms
            if (!userData.ha_aceptado_terminos) {
              console.log('[Callback] 📋 Usuario debe aceptar términos');
              if (isMounted) setStatus('success');
              safeRedirect(`/auth/terms-acceptance?userId=${userData.id}`, 300);
              return;
            }
            
            // Check if user needs to complete profile
            if (!userData.perfil_completado || !userData.username || !userData.nombre) {
              console.log('[Callback] 📝 Usuario debe completar perfil');
              if (isMounted) setStatus('success');
              safeRedirect(`/auth/completar-perfil?userId=${userData.id}`, 300);
              return;
            }
          }
          
          // All good, go to main app
          console.log('[Callback] ✅ Todo listo, redirigiendo a explorar');
          if (isMounted) setStatus('success');
          safeRedirect('/(tabs)/explorar', 300);
        } else {
          console.log('[Callback] ℹ️ No hay sesión activa, redirigiendo a explorar');
          safeRedirect('/(tabs)/explorar', 500);
        }
      } catch (error: any) {
        console.error('[Callback] ❌ Error en callback:', error);
        if (isMounted) {
          setStatus('error');
          setErrorMessage(error.message || 'Error inesperado');
        }
        safeRedirect('/(tabs)/explorar', 2000);
      }
    };

    handleCallback();

    return () => {
      console.log('[Callback] 🧹 Limpiando componente');
      isMounted = false;
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
      }
    };
  }, [router]);

  return (
    <View style={styles.container}>
      {status === 'processing' && (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.text}>Completando autenticación...</Text>
          <Text style={styles.subText}>Por favor espera un momento</Text>
        </>
      )}
      
      {status === 'success' && (
        <>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.text}>¡Autenticación exitosa!</Text>
          <Text style={styles.subText}>Redirigiendo...</Text>
        </>
      )}
      
      {status === 'error' && (
        <>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Text style={styles.subText}>Redirigiendo...</Text>
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
  subText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold',
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
});
