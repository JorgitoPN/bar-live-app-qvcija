
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { getCurrentUser } from '@/utils/auth';
import { registerForPushNotifications, savePushToken } from '@/utils/notifications';
import * as Linking from 'expo-linking';

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
          try {
            router.replace(path as any);
          } catch (error) {
            console.error('[Callback] ❌ Error en redirección:', error);
            // Fallback: try push instead of replace
            router.push(path as any);
          }
        }
      }, delay);
    };

    const handleCallback = async () => {
      try {
        console.log('[Callback] 🔄 Procesando callback de autenticación...');
        console.log('[Callback] Platform:', Platform.OS);
        console.log('[Callback] Params:', params);
        
        // Get the current URL to extract tokens
        let url = '';
        
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          url = window.location.href;
          console.log('[Callback] Web URL:', url);
        } else {
          // For native, try to get the initial URL
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl) {
            url = initialUrl;
            console.log('[Callback] Native initial URL:', url);
          }
        }

        // Parse tokens from URL
        let accessToken: string | null = null;
        let refreshToken: string | null = null;
        let errorParam: string | null = null;
        let errorDescription: string | null = null;

        if (url) {
          // Try to get from hash first (web OAuth flow)
          if (url.includes('#')) {
            const hashParams = new URLSearchParams(url.split('#')[1]);
            accessToken = hashParams.get('access_token');
            refreshToken = hashParams.get('refresh_token');
            errorParam = hashParams.get('error');
            errorDescription = hashParams.get('error_description');
          }
          
          // If not in hash, try query params (native OAuth flow)
          if (!accessToken && url.includes('?')) {
            const queryString = url.split('?')[1].split('#')[0]; // Get query params before hash
            const queryParams = new URLSearchParams(queryString);
            accessToken = queryParams.get('access_token');
            refreshToken = queryParams.get('refresh_token');
            errorParam = queryParams.get('error');
            errorDescription = queryParams.get('error_description');
          }
        }

        console.log('[Callback] Tokens parsed:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          error: errorParam,
        });

        // Check for OAuth errors
        if (errorParam) {
          console.error('[Callback] ❌ Error en OAuth:', errorParam);
          if (isMounted) {
            setStatus('error');
            setErrorMessage(errorDescription || errorParam);
          }
          safeRedirect('/(tabs)/explorar', 2000);
          return;
        }

        // If we have tokens, set the session
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
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Register push notifications (non-blocking)
            registerForPushNotifications()
              .then(pushToken => {
                if (pushToken) {
                  savePushToken(data.user.id, pushToken).catch(() => {
                    console.log('[Callback] Failed to save push token');
                  });
                }
              })
              .catch(() => {
                console.log('[Callback] Failed to register push notifications');
              });
            
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
                safeRedirect(`/auth/terms-acceptance?userId=${userData.id}`, 500);
                return;
              }
              
              // Check if user needs to complete profile (username and name are mandatory)
              // New users (without username or nombre) should go to /editar/perfil
              if (!userData.username || !userData.nombre) {
                console.log('[Callback] 📝 Usuario nuevo - redirigiendo a editar perfil');
                if (isMounted) setStatus('success');
                safeRedirect('/editar/perfil', 500);
                return;
              }
              
              // Existing users (with username and nombre) go to explorar
              console.log('[Callback] ✅ Usuario existente - redirigiendo a explorar');
              if (isMounted) setStatus('success');
              safeRedirect('/(tabs)/explorar', 500);
              return;
            }
            
            // If no user data, redirect to explorar
            console.log('[Callback] ⚠️ No se pudo obtener datos del usuario, redirigiendo a explorar');
            if (isMounted) setStatus('success');
            safeRedirect('/(tabs)/explorar', 500);
            return;
          }
        }
        
        // If no tokens, check for existing session
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
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Register push notifications (non-blocking)
          registerForPushNotifications()
            .then(pushToken => {
              if (pushToken) {
                savePushToken(session.user.id, pushToken).catch(() => {
                  console.log('[Callback] Failed to save push token');
                });
              }
            })
            .catch(() => {
              console.log('[Callback] Failed to register push notifications');
            });
          
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
              safeRedirect(`/auth/terms-acceptance?userId=${userData.id}`, 500);
              return;
            }
            
            // Check if user needs to complete profile (username and name are mandatory)
            // New users (without username or nombre) should go to /editar/perfil
            if (!userData.username || !userData.nombre) {
              console.log('[Callback] 📝 Usuario nuevo - redirigiendo a editar perfil');
              if (isMounted) setStatus('success');
              safeRedirect('/editar/perfil', 500);
              return;
            }
            
            // Existing users (with username and nombre) go to explorar
            console.log('[Callback] ✅ Usuario existente - redirigiendo a explorar');
            if (isMounted) setStatus('success');
            safeRedirect('/(tabs)/explorar', 500);
            return;
          }
          
          // If no user data, redirect to explorar
          console.log('[Callback] ⚠️ No se pudo obtener datos del usuario, redirigiendo a explorar');
          if (isMounted) setStatus('success');
          safeRedirect('/(tabs)/explorar', 500);
        } else {
          console.log('[Callback] ℹ️ No hay sesión activa, redirigiendo a explorar');
          safeRedirect('/(tabs)/explorar', 1000);
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
  }, [router, params]);

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
