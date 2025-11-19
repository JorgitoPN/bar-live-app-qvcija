
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { getCurrentUser } from '@/utils/auth';
import { registerForPushNotifications, savePushToken } from '@/utils/notifications';
import { useAuth } from '@/contexts/AuthContext';
import * as SecureStore from 'expo-secure-store';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (message: string) => {
    console.log('[Callback]', message);
    setDebugInfo(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${message}`]);
  };

  useEffect(() => {
    let isMounted = true;
    let redirectTimeout: NodeJS.Timeout;

    const safeRedirect = (path: string, delay: number = 0) => {
      if (!isMounted) return;
      
      addDebugInfo(`🚀 Programando redirección a: ${path} en ${delay}ms`);
      
      redirectTimeout = setTimeout(() => {
        if (isMounted) {
          addDebugInfo(`✅ Ejecutando redirección a: ${path}`);
          
          // For web, use window.location to ensure clean navigation
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            // Clean up the URL hash before redirecting
            window.history.replaceState({}, document.title, window.location.pathname);
            window.location.href = path;
          } else {
            router.replace(path as any);
          }
        }
      }, delay);
    };

    const verifyStoredSession = async () => {
      try {
        addDebugInfo('🔍 Verificando sesión almacenada en SecureStore...');
        
        if (Platform.OS !== 'web') {
          const storedSession = await SecureStore.getItemAsync('supabase.auth.token');
          addDebugInfo(`SecureStore session: ${storedSession ? 'PRESENTE' : 'AUSENTE'}`);
          
          if (storedSession) {
            try {
              const parsed = JSON.parse(storedSession);
              addDebugInfo(`Session data: access_token=${parsed.access_token ? 'SI' : 'NO'}, refresh_token=${parsed.refresh_token ? 'SI' : 'NO'}`);
            } catch (e) {
              addDebugInfo('Error parseando session data');
            }
          }
        } else {
          addDebugInfo('Web platform - usando localStorage');
          const storedSession = localStorage.getItem('supabase.auth.token');
          addDebugInfo(`localStorage session: ${storedSession ? 'PRESENTE' : 'AUSENTE'}`);
        }
      } catch (error: any) {
        addDebugInfo(`❌ Error verificando storage: ${error.message}`);
      }
    };

    const handleCallback = async () => {
      try {
        addDebugInfo('🔄 Procesando callback de autenticación...');
        addDebugInfo(`Platform: ${Platform.OS}`);
        addDebugInfo(`Params: ${JSON.stringify(params)}`);
        
        // For web, check URL hash for tokens
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          addDebugInfo('🌐 Detectando tokens en URL...');
          addDebugInfo(`URL completa: ${window.location.href}`);
          addDebugInfo(`Hash: ${window.location.hash}`);
          addDebugInfo(`Search: ${window.location.search}`);
          
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const errorParam = hashParams.get('error');
          const errorDescription = hashParams.get('error_description');

          addDebugInfo(`Hash params: access_token=${!!accessToken}, refresh_token=${!!refreshToken}, error=${errorParam}`);

          // Check for OAuth errors
          if (errorParam) {
            addDebugInfo(`❌ Error en OAuth: ${errorParam} - ${errorDescription}`);
            
            // Only show error if it's not a user cancellation
            if (!errorParam.includes('access_denied') && !errorParam.includes('cancelled')) {
              if (isMounted) {
                setStatus('error');
                setErrorMessage('No se pudo completar la autenticación');
                setErrorDetails(errorDescription || 'Por favor, intenta de nuevo.');
              }
              safeRedirect('/(tabs)/explorar', 3000);
            } else {
              // User cancelled, just redirect without error
              addDebugInfo('ℹ️ Usuario canceló la autenticación');
              safeRedirect('/(tabs)/explorar', 500);
            }
            return;
          }

          if (accessToken && refreshToken) {
            addDebugInfo('✅ Tokens encontrados en URL, estableciendo sesión...');
            
            // CRITICAL: Set the session with the tokens
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              addDebugInfo(`❌ Error estableciendo sesión: ${sessionError.message}`);
              if (isMounted) {
                setStatus('error');
                setErrorMessage('No se pudo completar la autenticación');
                setErrorDetails('Error al establecer la sesión. Código: ' + sessionError.message);
              }
              safeRedirect('/(tabs)/explorar', 3000);
              return;
            }

            if (data.session && data.user) {
              addDebugInfo(`✅ Sesión establecida para usuario: ${data.user.email}`);
              addDebugInfo(`User ID: ${data.user.id}`);
              addDebugInfo(`Session expires at: ${data.session.expires_at}`);
              
              // CRITICAL: Wait for the session to be persisted to storage
              addDebugInfo('⏳ Esperando persistencia en storage (2000ms)...');
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Verify storage
              await verifyStoredSession();
              
              // Verify the session was persisted
              addDebugInfo('🔍 Verificando sesión persistida...');
              const { data: { session: verifySession } } = await supabase.auth.getSession();
              
              if (!verifySession) {
                addDebugInfo('❌ La sesión no se persistió correctamente');
                
                // Try one more time to set the session
                addDebugInfo('🔄 Reintentando establecer sesión...');
                const { data: retryData, error: retryError } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
                
                if (retryError || !retryData.session) {
                  addDebugInfo(`❌ Reintento falló: ${retryError?.message || 'No session'}`);
                  if (isMounted) {
                    setStatus('error');
                    setErrorMessage('No se pudo completar la autenticación');
                    setErrorDetails('La sesión no se guardó correctamente. Por favor, intenta de nuevo.');
                  }
                  safeRedirect('/(tabs)/explorar', 3000);
                  return;
                }
                
                addDebugInfo('✅ Sesión establecida en segundo intento');
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
              
              addDebugInfo('✅ Sesión verificada y persistida correctamente');
              
              // Register push notifications (non-blocking)
              registerForPushNotifications()
                .then(pushToken => {
                  if (pushToken) {
                    savePushToken(data.user.id, pushToken).catch(() => {
                      addDebugInfo('Failed to save push token');
                    });
                  }
                })
                .catch(() => {
                  addDebugInfo('Failed to register push notifications');
                });
              
              // Force multiple refreshes to ensure AuthContext picks up the session
              addDebugInfo('🔄 Refrescando usuario en AuthContext (intento 1)...');
              await refreshUser();
              
              await new Promise(resolve => setTimeout(resolve, 800));
              
              addDebugInfo('🔄 Refrescando usuario en AuthContext (intento 2)...');
              await refreshUser();
              
              await new Promise(resolve => setTimeout(resolve, 500));
              
              addDebugInfo('🔄 Refrescando usuario en AuthContext (intento 3)...');
              await refreshUser();
              
              // Get user profile to check if needs profile completion
              addDebugInfo('🔍 Obteniendo perfil de usuario...');
              
              const { user: userData } = await getCurrentUser();
              
              if (userData) {
                addDebugInfo(`✅ Perfil obtenido: ${userData.email}`);
                addDebugInfo(`hasAcceptedTerms: ${userData.ha_aceptado_terminos}`);
                addDebugInfo(`hasUsername: ${!!userData.username}`);
                addDebugInfo(`hasName: ${!!userData.nombre}`);
                
                if (isMounted) setStatus('success');
                
                // Check if user needs to accept terms
                if (!userData.ha_aceptado_terminos) {
                  addDebugInfo('📋 Usuario debe aceptar términos');
                  safeRedirect(`/auth/terms-acceptance?userId=${userData.id}`, 500);
                  return;
                }
                
                // Check if user needs to complete profile (username and name are mandatory)
                if (!userData.username || !userData.nombre) {
                  addDebugInfo('📝 Usuario nuevo - redirigiendo a editar perfil');
                  safeRedirect('/editar/perfil', 500);
                  return;
                }
                
                // Existing users go to explorar
                addDebugInfo('✅ Usuario existente - redirigiendo a explorar');
                safeRedirect('/(tabs)/explorar', 500);
                return;
              }
              
              // If no user data, redirect to explorar
              addDebugInfo('⚠️ No se pudo obtener datos del usuario, redirigiendo a explorar');
              if (isMounted) setStatus('success');
              safeRedirect('/(tabs)/explorar', 500);
              return;
            } else {
              addDebugInfo('❌ No se obtuvo sesión o usuario después de setSession');
              if (isMounted) {
                setStatus('error');
                setErrorMessage('No se pudo completar la autenticación');
                setErrorDetails('No se pudo establecer la sesión. Por favor, intenta de nuevo.');
              }
              safeRedirect('/(tabs)/explorar', 3000);
              return;
            }
          } else {
            addDebugInfo('ℹ️ No se encontraron tokens en URL hash');
          }
        }
        
        // For native or if no hash params, check for existing session
        addDebugInfo('🔍 Verificando sesión existente...');
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          addDebugInfo(`❌ Error obteniendo sesión: ${sessionError.message}`);
          if (isMounted) {
            setStatus('error');
            setErrorMessage('No se pudo completar la autenticación');
            setErrorDetails('Error al verificar la sesión. Código: ' + sessionError.message);
          }
          safeRedirect('/(tabs)/explorar', 3000);
          return;
        }

        if (session?.user) {
          addDebugInfo(`✅ Sesión encontrada para: ${session.user.email}`);
          
          // Register push notifications (non-blocking)
          registerForPushNotifications()
            .then(pushToken => {
              if (pushToken) {
                savePushToken(session.user.id, pushToken).catch(() => {
                  addDebugInfo('Failed to save push token');
                });
              }
            })
            .catch(() => {
              addDebugInfo('Failed to register push notifications');
            });
          
          // Wait for the session to be fully established
          addDebugInfo('⏳ Esperando establecimiento completo de sesión...');
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Force refresh user in AuthContext multiple times
          addDebugInfo('🔄 Refrescando usuario en AuthContext (intento 1)...');
          await refreshUser();
          
          await new Promise(resolve => setTimeout(resolve, 800));
          
          addDebugInfo('🔄 Refrescando usuario en AuthContext (intento 2)...');
          await refreshUser();
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
          addDebugInfo('🔄 Refrescando usuario en AuthContext (intento 3)...');
          await refreshUser();
          
          // Get user profile to check if needs profile completion
          addDebugInfo('🔍 Obteniendo perfil de usuario...');
          
          const { user: userData } = await getCurrentUser();
          
          if (userData) {
            addDebugInfo(`✅ Perfil obtenido: ${userData.email}`);
            
            if (isMounted) setStatus('success');
            
            // Check if user needs to accept terms
            if (!userData.ha_aceptado_terminos) {
              addDebugInfo('📋 Usuario debe aceptar términos');
              safeRedirect(`/auth/terms-acceptance?userId=${userData.id}`, 500);
              return;
            }
            
            // Check if user needs to complete profile
            if (!userData.username || !userData.nombre) {
              addDebugInfo('📝 Usuario nuevo - redirigiendo a editar perfil');
              safeRedirect('/editar/perfil', 500);
              return;
            }
            
            // Existing users go to explorar
            addDebugInfo('✅ Usuario existente - redirigiendo a explorar');
            safeRedirect('/(tabs)/explorar', 500);
          } else {
            // If no user data, redirect to explorar
            addDebugInfo('⚠️ No se pudo obtener datos del usuario, redirigiendo a explorar');
            if (isMounted) setStatus('success');
            safeRedirect('/(tabs)/explorar', 500);
          }
        } else {
          addDebugInfo('ℹ️ No hay sesión activa, redirigiendo a explorar');
          if (isMounted) {
            setStatus('error');
            setErrorMessage('No se pudo completar la autenticación');
            setErrorDetails('No se encontró una sesión activa. Por favor, intenta iniciar sesión de nuevo.');
          }
          safeRedirect('/(tabs)/explorar', 3000);
        }
      } catch (error: any) {
        addDebugInfo(`❌ Error en callback: ${error.message}`);
        console.error('[Callback] ❌ Error en callback:', error);
        if (isMounted) {
          setStatus('error');
          setErrorMessage('No se pudo completar la autenticación');
          setErrorDetails('Ocurrió un error inesperado: ' + (error.message || 'Error desconocido'));
        }
        safeRedirect('/(tabs)/explorar', 3000);
      }
    };

    handleCallback();

    return () => {
      addDebugInfo('🧹 Limpiando componente');
      isMounted = false;
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
      }
    };
  }, [router, params, refreshUser]);

  return (
    <View style={styles.container}>
      {status === 'processing' && (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.text}>Completando autenticación...</Text>
          <Text style={styles.subText}>Un momento por favor</Text>
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
          {errorDetails && (
            <Text style={styles.errorDetails}>{errorDetails}</Text>
          )}
          <Text style={styles.subText}>Redirigiendo...</Text>
        </>
      )}
      
      {/* Debug info - only show in development */}
      {__DEV__ && debugInfo.length > 0 && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Debug Info:</Text>
          {debugInfo.slice(-10).map((info, index) => (
            <Text key={index} style={styles.debugText}>{info}</Text>
          ))}
        </View>
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
    fontSize: 18,
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
    fontSize: 18,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
    paddingHorizontal: 20,
  },
  errorDetails: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  debugContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 8,
    maxHeight: 200,
  },
  debugTitle: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  debugText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
