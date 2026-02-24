
import { Stack } from 'expo-router';
import { ImpersonationProvider } from '@/contexts/ImpersonationContext';
import { ModeProvider } from '@/contexts/ModeContext';
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
import { useAuthStore } from '@/src/store/useAuthStore';
import { useGlobalDataStore } from '@/src/store/useGlobalDataStore';
import { useFilterStore } from '@/src/store/useFilterStore';

/**
 * ✅ ROOT LAYOUT v17.0 - ZUSTAND MIGRATION (PASO 3 COMPLETADO)
 * 
 * 🎉 PASO 3 COMPLETADO: REESTRUCTURACIÓN DEL ESTADO
 * 
 * CAMBIOS v17.0:
 * - 🚀 MIGRADO: Auth, Favorites, Filter, GlobalData a Zustand stores
 * - 🚀 ELIMINADO: 4 Context Providers (AuthProvider, FavoritesProvider, FilterProvider, GlobalDataProvider)
 * - 🚀 RENDIMIENTO: Actualizaciones atómicas - componentes solo se re-renderizan cuando su slice cambia
 * - 🚀 MÁS LIMPIO: De 12 providers a 8 providers (33% de reducción)
 * - 🚀 MÁS RÁPIDO: No más Provider Hell - suscripciones directas a stores
 * 
 * PROVIDERS RESTANTES (8):
 * - ImpersonationProvider (funcionalidad admin)
 * - ModeProvider (modo claro/oscuro)
 * - AvatarProvider (gestión de avatares)
 * - UIScalingProvider (diseño responsivo)
 * - WidgetProvider (estado de widgets)
 * - SelectedLocalProvider (local actual)
 * - GestureHandlerRootView (requerido para gestos)
 * - ErrorBoundary (manejo de errores)
 * 
 * ZUSTAND STORES (4):
 * - useAuthStore (sesión, usuario)
 * - useFavoritesStore (favoritos)
 * - useFilterStore (filtros, categorías)
 * - useGlobalDataStore (locales, posts, eventos, ofertas)
 * 
 * CÓMO FUNCIONA LA ESTRUCTURA ATÓMICA DE ZUSTAND:
 * 
 * ❌ ANTES (Context API):
 * - Cuando cambiaba CUALQUIER dato en el Context, TODOS los componentes que usaban useAuth() se re-renderizaban
 * - Ejemplo: Si cambiaba "loading", se re-renderizaban componentes que solo usaban "user"
 * - Resultado: Re-renders innecesarios, navegación lenta
 * 
 * ✅ AHORA (Zustand):
 * - Los componentes se suscriben SOLO a los datos que necesitan
 * - Ejemplo: useAuthStore(state => state.user) → Solo se re-renderiza cuando "user" cambia
 * - Resultado: Re-renders mínimos, navegación instantánea
 * 
 * EJEMPLO DE USO:
 * ```tsx
 * // ✅ BUENO: Solo se re-renderiza cuando user cambia
 * const user = useAuthStore(state => state.user);
 * 
 * // ✅ BUENO: Nunca se re-renderiza (referencia estable)
 * const signOut = useAuthStore(state => state.signOut);
 * 
 * // ❌ MALO: Se re-renderiza en CUALQUIER cambio del store
 * const { user, session, loading } = useAuthStore();
 * 
 * // ✅ BUENO: Solo se re-renderiza cuando user O loading cambian
 * const { user, loading } = useAuthStore(state => ({ 
 *   user: state.user, 
 *   loading: state.loading 
 * }));
 * ```
 * 
 * BENEFICIOS DE LA ESTRUCTURA ATÓMICA:
 * 1. 🚀 RENDIMIENTO: Solo se re-renderizan los componentes que realmente necesitan actualizarse
 * 2. 🧹 CÓDIGO MÁS LIMPIO: No más Provider wrappers anidados
 * 3. 🔍 DEBUGGING: Más fácil rastrear qué componente se re-renderiza y por qué
 * 4. 📦 BUNDLE SIZE: Menos código de Context API
 * 5. ⚡ NAVEGACIÓN: Transiciones instantáneas entre pantallas
 * 
 * Cambios previos:
 * - v16.0: Sistema de notificaciones push
 * - v15.0: Sistema inicial de notificaciones
 * - v14.0: Fix de crash en iOS Expo Go
 * - v13.0: Ubicación en segundo plano y precarga inteligente
 * - v12.0: Fix de color de barra de navegación Android
 */

export default function RootLayout() {
  // ✅ v17.0: Initialize Zustand stores (replaces Provider initialization)
  useEffect(() => {
    console.log('[RootLayout v17.0] 🚀 Initializing Zustand stores...');
    
    // Initialize auth store
    useAuthStore.getState().initialize();
    console.log('[RootLayout v17.0] ✅ Auth store initialized');
    
    // Initialize global data store
    useGlobalDataStore.getState().initialize();
    console.log('[RootLayout v17.0] ✅ Global data store initialized');
    
    // Initialize filter store (load dynamic options)
    useFilterStore.getState().refreshDynamicOptions();
    console.log('[RootLayout v17.0] ✅ Filter store initialized');
    
    console.log('[RootLayout v17.0] 🎉 All Zustand stores ready!');
  }, []);

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
        <ImpersonationProvider>
          <ModeProvider>
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
          </ModeProvider>
        </ImpersonationProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
