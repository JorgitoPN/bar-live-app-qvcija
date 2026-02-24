
import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';
import { ModeProvider } from '@/contexts/ModeContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { ImpersonationProvider } from '@/contexts/ImpersonationContext';
import { GlobalDataProvider } from '@/contexts/GlobalDataContext';
import { FilterProvider } from '@/contexts/FilterContext';
import { PostsProvider } from '@/contexts/PostsContext';
import { AvatarProvider } from '@/contexts/AvatarContext';
import { UIScalingProvider } from '@/contexts/UIScalingContext';
import { WidgetProvider } from '@/contexts/WidgetContext';
import { SelectedLocalProvider } from '@/contexts/SelectedLocalContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { colors } from '@/styles/commonStyles';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { startBackgroundLocationTracking } from '@/utils/locationUtils';
import { backgroundSync } from '@/utils/backgroundSync';
import { notificationHandler } from '@/utils/notificationHandler';

/**
 * ✅ ROOT LAYOUT v16.0 - SISTEMA ROBUSTO DE NOTIFICACIONES PUSH COMPLETO
 * 
 * CHANGES v16.0:
 * - 🔔 ENHANCED: Sistema completo de notificaciones push con 14 categorías
 * - 🔔 ADDED: Manejo de estados (foreground, background, cerrada)
 * - 🔔 ADDED: Deep linking dinámico por tipo de notificación
 * - 🔔 ADDED: Banner interno personalizado cuando app está abierta
 * - 🔔 ADDED: Toast notifications en Android para notificaciones no urgentes
 * - 🔔 ADDED: Feedback háptico diferenciado por prioridad
 * - 🔔 ADDED: Soporte para recordatorios genéricos
 * - 🔔 ADDED: Logging detallado para debugging
 * - 🔔 ADDED: Manejo robusto de errores con fallbacks
 * 
 * CATEGORÍAS DE NOTIFICACIONES (14):
 * 📱 Interacciones (4): like, comment, follow, mention
 * 💬 Comunicación (2): message, cheers
 * 💳 Transacciones (2): plan_purchase, plan_renewal
 * 🔔 Sistema y Alertas (6): event, featured_local_reminder, urgent, sistema, promo, reminder
 * 
 * Previous changes:
 * - v15.0: Initial notification system
 * - v14.0: iOS Expo Go crash fix
 * - v13.0: Background location & intelligent preloading
 * - v12.0: Android navigation bar color fix
 */

export default function RootLayout() {
  // ✅ ANDROID FIX v13.0: Set global system navigation bar color to WHITE (no blue flash)
  useEffect(() => {
    if (Platform.OS === 'android') {
      const white = '#FFFFFF';
      SystemUI.setBackgroundColorAsync(white);
    }
  }, []);

  // ✅ v15.0: NOTIFICATION SYSTEM - Inicializar sistema de notificaciones
  useEffect(() => {
    console.log('[RootLayout v15.0] 🔔 Inicializando sistema de notificaciones...');
    
    // Inicializar handler de notificaciones
    notificationHandler.initialize();
    
    // Listener para cambios de estado de la app (foreground/background)
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const isInForeground = nextAppState === 'active';
      console.log('[RootLayout v15.0] 📱 Estado de app cambió:', nextAppState);
      notificationHandler.setAppState(isInForeground);
    });
    
    return () => {
      console.log('[RootLayout v15.0] 🧹 Limpiando sistema de notificaciones...');
      notificationHandler.cleanup();
      subscription.remove();
    };
  }, []);

  // ✅ v14.0: CRITICAL FIX - Graceful background system initialization (iOS crash fix)
  useEffect(() => {
    const initializeBackgroundSystems = async () => {
      try {
        console.log('[RootLayout v14.0] 🚀 Initializing background systems (graceful mode)');
        
        try {
          await backgroundSync.initialize();
          console.log('[RootLayout v14.0] ✅ Background sync initialized');
        } catch (syncError) {
          console.log('[RootLayout v14.0] ⚠️ Background sync init failed - continuing without it');
        }
        
        if (Platform.OS === 'ios') {
          console.log('[RootLayout v14.0] ⏸️ Skipping background location on iOS (Expo Go compatibility)');
          return;
        }
        
        try {
          const started = await startBackgroundLocationTracking();
          if (started) {
            console.log('[RootLayout v14.0] ✅ Background location tracking started (Android)');
          } else {
            console.log('[RootLayout v14.0] ⚠️ Background location not started - will use foreground only');
          }
        } catch (trackingError) {
          console.log('[RootLayout v14.0] ⚠️ Background tracking failed - continuing with foreground location');
        }
      } catch (error) {
        console.log('[RootLayout v14.0] ⚠️ Background systems initialization error - app will continue normally');
      }
    };

    const timer = setTimeout(() => {
      initializeBackgroundSystems();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <AuthProvider>
          <ImpersonationProvider>
            <ModeProvider>
              <FavoritesProvider>
                <GlobalDataProvider>
                  <FilterProvider>
                    <PostsProvider>
                      <AvatarProvider>
                        <UIScalingProvider>
                          <WidgetProvider>
                            <SelectedLocalProvider>
                              <Stack
                                screenOptions={{
                                  headerShown: false,
                                  contentStyle: { backgroundColor: colors.background },
                                  animation: 'default',
                                }}
                              >
                                <Stack.Screen name="index" options={{ headerShown: false }} />
                                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                                <Stack.Screen name="auth" options={{ headerShown: false }} />
                                <Stack.Screen name="detalle" options={{ headerShown: false }} />
                                <Stack.Screen name="crear" options={{ headerShown: false }} />
                                <Stack.Screen name="editar" options={{ headerShown: false }} />
                                <Stack.Screen 
                                  name="perfil" 
                                  options={{ 
                                    headerShown: false,
                                    presentation: 'card',
                                  }} 
                                />
                                <Stack.Screen name="chat" options={{ headerShown: false }} />
                                <Stack.Screen name="social" options={{ headerShown: false }} />
                                <Stack.Screen name="explorar" options={{ headerShown: false }} />
                                <Stack.Screen name="gestion" options={{ headerShown: false }} />
                                <Stack.Screen name="admin" options={{ headerShown: false }} />
                                <Stack.Screen name="solicitudes" options={{ headerShown: false }} />
                                <Stack.Screen name="empleo" options={{ headerShown: false }} />
                                <Stack.Screen name="soporte" options={{ headerShown: false }} />
                                <Stack.Screen name="legal" options={{ headerShown: false }} />
                                
                                {/* Modal presentations */}
                                <Stack.Group screenOptions={{ presentation: 'modal' }}>
                                  <Stack.Screen name="modal" options={{ title: 'Modal' }} />
                                  <Stack.Screen name="formsheet" options={{ presentation: 'formSheet' }} />
                                  <Stack.Screen name="transparent-modal" options={{ presentation: 'transparentModal' }} />
                                </Stack.Group>

                                {/* Full screen modals for social features */}
                                <Stack.Group screenOptions={{ presentation: 'fullScreenModal' }}>
                                  <Stack.Screen 
                                    name="social/editar-descripcion" 
                                    options={{ 
                                      title: 'Editar Descripción',
                                      headerShown: true,
                                    }} 
                                  />
                                  <Stack.Screen 
                                    name="social/gestionar-etiquetas" 
                                    options={{ 
                                      title: 'Gestionar Etiquetas',
                                      headerShown: true,
                                    }} 
                                  />
                                </Stack.Group>
                              </Stack>
                            </SelectedLocalProvider>
                          </WidgetProvider>
                        </UIScalingProvider>
                      </AvatarProvider>
                    </PostsProvider>
                  </FilterProvider>
                </GlobalDataProvider>
              </FavoritesProvider>
            </ModeProvider>
          </ImpersonationProvider>
        </AuthProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
