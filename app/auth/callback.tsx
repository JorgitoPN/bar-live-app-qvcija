
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
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (info: string) => {
    console.log('[Callback]', info);
    setDebugInfo(prev => [...prev, info]);
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
        addDebugInfo('========================================');
        addDebugInfo('🔄 Procesando callback de autenticación');
        addDebugInfo(`Platform: ${Platform.OS}`);
        addDebugInfo(`Params: ${JSON.stringify(params)}`);
        addDebugInfo('========================================');
        
        // Wait a moment for the deep link handler to set the session
        addDebugInfo('⏳ Esperando a que se establezca la sesión...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Check for existing session
        addDebugInfo('🔍 Verificando sesión existente...');
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          addDebugInfo(`❌ Error obteniendo sesión: ${sessionError.message}`);
          if (isMounted) {
            setStatus('error');
            setErrorMessage('Error al verificar la sesión');
          }
          safeRedirect('/(tabs)/explorar', 2000);
          return;
        }

        if (session?.user) {
          addDebugInfo(`✅ Sesión encontrada para: ${session.user.email}`);
          
          // Wait a bit more for session to fully propagate
          await new Promise(resolve => setTimeout(resolve, 1000));
          
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
          
          // Get user profile to check if needs profile completion
          addDebugInfo('🔍 Obteniendo perfil de usuario...');
          const { user: userData } = await getCurrentUser();
          
          if (userData) {
            addDebugInfo(`✅ Perfil obtenido: ${userData.email}`);
            addDebugInfo(`Terms: ${userData.ha_aceptado_terminos}, Username: ${!!userData.username}, Name: ${!!userData.nombre}`);
            
            // Check if user needs to accept terms
            if (!userData.ha_aceptado_terminos) {
              addDebugInfo('📋 Usuario debe aceptar términos');
              if (isMounted) setStatus('success');
              safeRedirect(`/auth/terms-acceptance?userId=${userData.id}`, 500);
              return;
            }
            
            // Check if user needs to complete profile (username and name are mandatory)
            // New users (without username or nombre) should go to /editar/perfil
            if (!userData.username || !userData.nombre) {
              addDebugInfo('📝 Usuario nuevo - redirigiendo a editar perfil');
              if (isMounted) setStatus('success');
              safeRedirect('/editar/perfil', 500);
              return;
            }
            
            // Existing users (with username and nombre) go to explorar
            addDebugInfo('✅ Usuario existente - redirigiendo a explorar');
            if (isMounted) setStatus('success');
            safeRedirect('/(tabs)/explorar', 500);
            return;
          }
          
          // If no user data, redirect to explorar
          addDebugInfo('⚠️ No se pudo obtener datos del usuario, redirigiendo a explorar');
          if (isMounted) setStatus('success');
          safeRedirect('/(tabs)/explorar', 500);
        } else {
          addDebugInfo('ℹ️ No hay sesión activa después de esperar');
          addDebugInfo('⚠️ Esto puede indicar un problema con el flujo OAuth');
          if (isMounted) {
            setStatus('error');
            setErrorMessage('No se pudo establecer la sesión. Por favor, intenta de nuevo.');
          }
          safeRedirect('/(tabs)/explorar', 3000);
        }
      } catch (error: any) {
        addDebugInfo(`❌ Error en callback: ${error.message}`);
        console.error('[Callback] ❌ Error stack:', error.stack);
        if (isMounted) {
          setStatus('error');
          setErrorMessage(error.message || 'Error inesperado');
        }
        safeRedirect('/(tabs)/explorar', 2000);
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
  }, [router, params]);

  return (
    <View style={styles.container}>
      {status === 'processing' && (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.text}>Completando autenticación...</Text>
          <Text style={styles.subText}>Por favor espera un momento</Text>
          
          {/* Debug info - only show in development */}
          {__DEV__ && debugInfo.length > 0 && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>Debug Info:</Text>
              {debugInfo.slice(-8).map((info, index) => (
                <Text key={index} style={styles.debugText}>{info}</Text>
              ))}
            </View>
          )}
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
          
          {/* Debug info - only show in development */}
          {__DEV__ && debugInfo.length > 0 && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>Debug Info:</Text>
              {debugInfo.slice(-8).map((info, index) => (
                <Text key={index} style={styles.debugText}>{info}</Text>
              ))}
            </View>
          )}
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
  debugContainer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 8,
    maxWidth: '90%',
    maxHeight: 200,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  debugText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
  },
});
