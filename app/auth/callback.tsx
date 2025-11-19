
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { supabase, manuallyRestoreSession } from '@/utils/supabase';
import { getCurrentUser } from '@/utils/auth';
import { registerForPushNotifications, savePushToken } from '@/utils/notifications';
import { useAuth } from '@/contexts/AuthContext';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

    // NEW: Function to inspect storage contents
    const inspectStorage = async () => {
      try {
        addDebugInfo('🔍 === INSPECCIÓN DE STORAGE ===');
        
        const storageKey = 'supabase.auth.token';
        
        // Try SecureStore
        if (Platform.OS !== 'web') {
          try {
            const secureValue = await SecureStore.getItemAsync(storageKey);
            if (secureValue) {
              const parsed = JSON.parse(secureValue);
              addDebugInfo(`✅ SecureStore: Sesión encontrada`);
              addDebugInfo(`   - access_token: ${parsed.access_token ? 'presente' : 'ausente'}`);
              addDebugInfo(`   - refresh_token: ${parsed.refresh_token ? 'presente' : 'ausente'}`);
              addDebugInfo(`   - expires_at: ${parsed.expires_at ? new Date(parsed.expires_at * 1000).toISOString() : 'ausente'}`);
              addDebugInfo(`   - user.email: ${parsed.user?.email || 'ausente'}`);
            } else {
              addDebugInfo('⚠️ SecureStore: No hay sesión almacenada');
            }
          } catch (e: any) {
            addDebugInfo(`❌ SecureStore: Error - ${e.message}`);
          }
        }
        
        // Try AsyncStorage
        try {
          const asyncValue = await AsyncStorage.getItem(storageKey);
          if (asyncValue) {
            const parsed = JSON.parse(asyncValue);
            addDebugInfo(`✅ AsyncStorage: Sesión encontrada`);
            addDebugInfo(`   - access_token: ${parsed.access_token ? 'presente' : 'ausente'}`);
            addDebugInfo(`   - refresh_token: ${parsed.refresh_token ? 'presente' : 'ausente'}`);
            addDebugInfo(`   - expires_at: ${parsed.expires_at ? new Date(parsed.expires_at * 1000).toISOString() : 'ausente'}`);
            addDebugInfo(`   - user.email: ${parsed.user?.email || 'ausente'}`);
          } else {
            addDebugInfo('⚠️ AsyncStorage: No hay sesión almacenada');
          }
        } catch (e: any) {
          addDebugInfo(`❌ AsyncStorage: Error - ${e.message}`);
        }
        
        // Try localStorage (web only)
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          try {
            const localValue = localStorage.getItem(storageKey);
            if (localValue) {
              const parsed = JSON.parse(localValue);
              addDebugInfo(`✅ localStorage: Sesión encontrada`);
              addDebugInfo(`   - access_token: ${parsed.access_token ? 'presente' : 'ausente'}`);
              addDebugInfo(`   - refresh_token: ${parsed.refresh_token ? 'presente' : 'ausente'}`);
              addDebugInfo(`   - expires_at: ${parsed.expires_at ? new Date(parsed.expires_at * 1000).toISOString() : 'ausente'}`);
              addDebugInfo(`   - user.email: ${parsed.user?.email || 'ausente'}`);
            } else {
              addDebugInfo('⚠️ localStorage: No hay sesión almacenada');
            }
          } catch (e: any) {
            addDebugInfo(`❌ localStorage: Error - ${e.message}`);
          }
        }
        
        addDebugInfo('🔍 === FIN INSPECCIÓN ===');
      } catch (error: any) {
        addDebugInfo(`❌ Error inspeccionando storage: ${error.message}`);
      }
    };

    const handleCallback = async () => {
      try {
        addDebugInfo('🔄 Procesando callback de autenticación...');
        addDebugInfo(`Platform: ${Platform.OS}`);
        
        // For web, check for OAuth errors in URL
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
        }
        
        // STRATEGY 1: Wait for Supabase to automatically detect and process the OAuth callback
        addDebugInfo('⏳ Esperando detección automática de sesión (3s)...');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Increased from 2s to 3s
        
        // NEW: Inspect storage after waiting
        await inspectStorage();
        
        // STRATEGY 2: Try to get session with multiple retries
        addDebugInfo('🔍 Verificando sesión con reintentos...');
        
        let session = null;
        let retries = 10; // Increased from 8 to 10
        let delay = 500;
        
        while (retries > 0 && !session) {
          const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            addDebugInfo(`❌ Error obteniendo sesión: ${sessionError.message}`);
          }
          
          session = currentSession;
          
          if (session) {
            addDebugInfo(`✅ Sesión encontrada en intento ${11 - retries}`);
            break;
          }
          
          if (retries > 1) {
            addDebugInfo(`⏳ Sesión no encontrada, reintentando en ${delay}ms... (${11 - retries}/10)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay = Math.min(delay * 1.5, 3000); // Increased max delay
          }
          
          retries--;
        }

        // NEW: If still no session, inspect storage again
        if (!session) {
          addDebugInfo('⚠️ No se encontró sesión después de reintentos, inspeccionando storage nuevamente...');
          await inspectStorage();
        }

        // STRATEGY 3: If still no session, try manual restoration from storage
        if (!session) {
          addDebugInfo('🔧 Intentando restauración manual de sesión desde storage...');
          const { success, session: restoredSession } = await manuallyRestoreSession();
          
          if (success && restoredSession) {
            addDebugInfo('✅ Sesión restaurada manualmente desde storage');
            session = restoredSession;
          } else {
            addDebugInfo('❌ No se pudo restaurar sesión desde storage');
          }
        }

        // STRATEGY 4: If still no session, check if we're on web and have tokens in URL
        if (!session && Platform.OS === 'web' && typeof window !== 'undefined') {
          addDebugInfo('🔧 Intentando extraer tokens de URL...');
          
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          if (accessToken && refreshToken) {
            addDebugInfo('✅ Tokens encontrados en URL, estableciendo sesión...');
            
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (error) {
              addDebugInfo(`❌ Error estableciendo sesión desde URL: ${error.message}`);
            } else if (data.session) {
              addDebugInfo('✅ Sesión establecida desde tokens de URL');
              session = data.session;
              
              // NEW: Wait a bit for storage to persist
              await new Promise(resolve => setTimeout(resolve, 1000));
              await inspectStorage();
            }
          } else {
            addDebugInfo('⚠️ No se encontraron tokens en URL');
            addDebugInfo(`   - Hash params: ${window.location.hash}`);
          }
        }

        // NEW: STRATEGY 5: Try refreshing the session if we have a refresh token in storage
        if (!session) {
          addDebugInfo('🔧 ESTRATEGIA 5: Intentando refrescar sesión desde storage...');
          
          try {
            const storageKey = 'supabase.auth.token';
            let storedData = null;
            
            // Try to get from storage
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              const localValue = localStorage.getItem(storageKey);
              if (localValue) storedData = JSON.parse(localValue);
            } else {
              const secureValue = await SecureStore.getItemAsync(storageKey);
              if (secureValue) storedData = JSON.parse(secureValue);
            }
            
            if (storedData && storedData.refresh_token) {
              addDebugInfo('✅ Refresh token encontrado en storage, intentando refrescar...');
              
              const { data, error } = await supabase.auth.refreshSession({
                refresh_token: storedData.refresh_token,
              });
              
              if (error) {
                addDebugInfo(`❌ Error refrescando sesión: ${error.message}`);
              } else if (data.session) {
                addDebugInfo('✅ Sesión refrescada exitosamente');
                session = data.session;
                
                // Wait for storage to persist
                await new Promise(resolve => setTimeout(resolve, 1000));
                await inspectStorage();
              }
            } else {
              addDebugInfo('⚠️ No se encontró refresh token en storage');
            }
          } catch (error: any) {
            addDebugInfo(`❌ Error en estrategia 5: ${error.message}`);
          }
        }

        // Final check: If we still don't have a session, show error
        if (!session) {
          addDebugInfo('❌ No se pudo obtener la sesión después de todos los intentos');
          addDebugInfo('💡 Sugerencias:');
          addDebugInfo('   1. Verifica que Google OAuth esté configurado correctamente en Supabase');
          addDebugInfo('   2. Verifica que las URLs de redirección estén configuradas');
          addDebugInfo('   3. Verifica que el almacenamiento del dispositivo funcione correctamente');
          
          // Final storage inspection
          await inspectStorage();
          
          if (isMounted) {
            setStatus('error');
            setErrorMessage('No se pudo completar la autenticación');
            setErrorDetails('La sesión no se estableció correctamente. Por favor, intenta de nuevo o contacta con soporte si el problema persiste.');
          }
          safeRedirect('/(tabs)/explorar', 5000);
          return;
        }

        addDebugInfo(`✅ Sesión encontrada para: ${session.user.email}`);
        addDebugInfo(`User ID: ${session.user.id}`);
        addDebugInfo(`Session expires at: ${new Date(session.expires_at! * 1000).toISOString()}`);
        
        // Final storage inspection with session
        await inspectStorage();
        
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
        
        // Force refresh user in AuthContext multiple times
        addDebugInfo('🔄 Refrescando usuario en AuthContext...');
        await refreshUser();
        await new Promise(resolve => setTimeout(resolve, 500));
        await refreshUser();
        await new Promise(resolve => setTimeout(resolve, 500));
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
          <Text style={styles.debugTitle}>Debug Info (últimos 20):</Text>
          {debugInfo.slice(-20).map((info, index) => (
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
