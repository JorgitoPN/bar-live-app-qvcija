
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { getCurrentUser } from '@/utils/auth';
import { registerForPushNotifications, savePushToken } from '@/utils/notifications';
import { useAuth } from '@/contexts/AuthContext';

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

    const handleCallback = async () => {
      try {
        addDebugInfo('🔄 Procesando callback de autenticación...');
        addDebugInfo(`Platform: ${Platform.OS}`);
        
        // For web, check for OAuth tokens in URL
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          addDebugInfo('🌐 Detectando OAuth callback en web...');
          addDebugInfo(`URL: ${window.location.href}`);
          
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const errorParam = hashParams.get('error');
          const errorDescription = hashParams.get('error_description');

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

          // Extract tokens from URL hash if present
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          if (accessToken && refreshToken) {
            addDebugInfo('✅ Tokens encontrados en URL');
            addDebugInfo(`Access token (primeros 20 chars): ${accessToken.substring(0, 20)}...`);
            addDebugInfo(`Refresh token (primeros 20 chars): ${refreshToken.substring(0, 20)}...`);
            
            try {
              // CRITICAL: Set the session explicitly with the tokens from URL
              addDebugInfo('🔐 Estableciendo sesión con tokens de URL...');
              const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              
              if (sessionError) {
                addDebugInfo(`❌ Error estableciendo sesión: ${sessionError.message}`);
                throw sessionError;
              }
              
              if (!sessionData.session) {
                addDebugInfo('❌ setSession no devolvió sesión');
                throw new Error('No se pudo establecer la sesión');
              }
              
              addDebugInfo('✅ Sesión establecida exitosamente');
              addDebugInfo(`User: ${sessionData.session.user.email}`);
              addDebugInfo(`Session expires at: ${new Date(sessionData.session.expires_at! * 1000).toISOString()}`);
              
              // CRITICAL: Wait for storage to persist the session
              addDebugInfo('⏳ Esperando persistencia en storage (2s)...');
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Verify session was persisted
              addDebugInfo('🔍 Verificando sesión persistida...');
              const { data: { session: verifiedSession }, error: verifyError } = await supabase.auth.getSession();
              
              if (verifyError) {
                addDebugInfo(`❌ Error verificando sesión: ${verifyError.message}`);
              }
              
              if (!verifiedSession) {
                addDebugInfo('❌ Sesión no se persistió correctamente');
                throw new Error('La sesión no se guardó en el almacenamiento');
              }
              
              addDebugInfo('✅ Sesión verificada en storage');
              addDebugInfo(`Verified user: ${verifiedSession.user.email}`);
              
              // Force refresh user in AuthContext
              addDebugInfo('🔄 Refrescando usuario en AuthContext...');
              await refreshUser();
              
              // Get user profile
              addDebugInfo('🔍 Obteniendo perfil de usuario...');
              const { user: userData } = await getCurrentUser();
              
              if (userData) {
                addDebugInfo(`✅ Perfil obtenido: ${userData.email}`);
                
                // Register push notifications (non-blocking)
                registerForPushNotifications()
                  .then(pushToken => {
                    if (pushToken) {
                      savePushToken(userData.id, pushToken).catch(() => {});
                    }
                  })
                  .catch(() => {});
                
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
                return;
              } else {
                addDebugInfo('⚠️ No se pudo obtener perfil de usuario');
                throw new Error('No se pudo cargar el perfil del usuario');
              }
            } catch (error: any) {
              addDebugInfo(`❌ Error en proceso de sesión: ${error.message}`);
              console.error('[Callback] ❌ Error:', error);
              
              if (isMounted) {
                setStatus('error');
                setErrorMessage('No se pudo completar la autenticación');
                setErrorDetails(error.message || 'Error al establecer la sesión');
              }
              safeRedirect('/(tabs)/explorar', 3000);
              return;
            }
          } else {
            addDebugInfo('⚠️ No se encontraron tokens en URL');
          }
        }
        
        // FALLBACK: For native or if no tokens in URL
        addDebugInfo('⏳ Esperando detección automática de sesión (3s)...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Try to get session
        addDebugInfo('🔍 Verificando sesión...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          addDebugInfo(`❌ Error obteniendo sesión: ${sessionError.message}`);
        }
        
        if (!session) {
          addDebugInfo('❌ No se encontró sesión después de esperar');
          
          if (isMounted) {
            setStatus('error');
            setErrorMessage('No se pudo completar la autenticación');
            setErrorDetails('La sesión no se estableció correctamente. Por favor, intenta de nuevo.');
          }
          safeRedirect('/(tabs)/explorar', 3000);
          return;
        }

        addDebugInfo(`✅ Sesión encontrada para: ${session.user.email}`);
        
        // Force refresh user in AuthContext
        addDebugInfo('🔄 Refrescando usuario en AuthContext...');
        await refreshUser();
        
        // Get user profile
        addDebugInfo('🔍 Obteniendo perfil de usuario...');
        const { user: userData } = await getCurrentUser();
        
        if (userData) {
          addDebugInfo(`✅ Perfil obtenido: ${userData.email}`);
          
          // Register push notifications (non-blocking)
          registerForPushNotifications()
            .then(pushToken => {
              if (pushToken) {
                savePushToken(userData.id, pushToken).catch(() => {});
              }
            })
            .catch(() => {});
          
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
          return;
        }
        
        // If no user data, redirect to explorar
        addDebugInfo('⚠️ No se pudo obtener datos del usuario, redirigiendo a explorar');
        if (isMounted) setStatus('success');
        safeRedirect('/(tabs)/explorar', 500);
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
      
      {/* Debug info - always show in development */}
      {__DEV__ && debugInfo.length > 0 && (
        <ScrollView style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Debug Info (últimos 30):</Text>
          {debugInfo.slice(-30).map((info, index) => (
            <Text key={index} style={styles.debugText}>{info}</Text>
          ))}
        </ScrollView>
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
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.95)',
    padding: 10,
    borderRadius: 8,
    maxHeight: 400,
  },
  debugTitle: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  debugText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 11,
  },
});
