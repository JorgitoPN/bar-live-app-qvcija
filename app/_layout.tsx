
import { Stack } from 'expo-router';
import { ImpersonationProvider } from '@/contexts/ImpersonationContext';
import { ModeProvider } from '@/contexts/ModeContext';
import { AvatarProvider } from '@/contexts/AvatarContext';
import { UIScalingProvider } from '@/contexts/UIScalingContext';
import { WidgetProvider } from '@/contexts/WidgetContext';
import { SelectedLocalProvider } from '@/contexts/SelectedLocalContext';
import { LocationProvider } from '@/contexts/LocationContext';
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
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { supabaseStorage } from '@/src/lib/supabaseStorage';

/**
 * ✅ ROOT LAYOUT v18.3 - LOCATION PROVIDER WRAPPING STACK (CORRECCIÓN 1)
 * 
 * 🎯 CORRECCIÓN 1: Protección contra el Crash de Ubicación
 * - ✅ LocationProvider envuelve el Stack (no solo dentro de PersistQueryClientProvider)
 * - ✅ Esto asegura que el contexto de ubicación esté disponible ANTES de que se renderice cualquier pantalla
 * - ✅ Previene crashes por acceso a useLocation() antes de que el provider esté montado
 * 
 * ORDEN DE PROVIDERS (CRÍTICO):
 * 1. GestureHandlerRootView (gestos)
 * 2. ErrorBoundary (manejo de errores)
 * 3. PersistQueryClientProvider (caché de TanStack Query)
 * 4. LocationProvider (ubicación - AHORA ENVUELVE EL STACK) ✅ NUEVO
 * 5. ImpersonationProvider (admin)
 * 6. ModeProvider (modo claro/oscuro)
 * 7. AvatarProvider (avatares)
 * 8. UIScalingProvider (diseño responsivo)
 * 9. WidgetProvider (widgets)
 * 10. SelectedLocalProvider (local actual)
 * 11. Stack (navegación)
 */

// ✅ PASO 4: Create QueryClient with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data is considered fresh for 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours - data stays in cache for 24 hours (renamed from cacheTime)
      retry: 2, // Retry failed requests 2 times
      refetchOnWindowFocus: false, // Don't refetch when app comes to foreground (we have pull-to-refresh)
      refetchOnReconnect: true, // Refetch when internet connection is restored
    },
  },
});

// ✅ PASO 4.2: Create async persister with the existing supabaseStorage adapter
console.log('[TanStack Query] 🚀 Initializing async cache persister with supabaseStorage adapter');

const persister = createAsyncStoragePersister({
  storage: supabaseStorage,
  key: 'tanstack-query-cache-v1',
  throttleTime: 1000,
});

console.log('[TanStack Query] ✅ Async cache persister initialized successfully');

export default function RootLayout() {
  // ✅ v17.0: Initialize Zustand stores (replaces Provider initialization)
  useEffect(() => {
    console.log('[RootLayout v18.3] 🚀 Initializing Zustand stores...');
    
    // Initialize auth store
    useAuthStore.getState().initialize();
    console.log('[RootLayout v18.3] ✅ Auth store initialized');
    
    // Initialize global data store
    useGlobalDataStore.getState().initialize();
    console.log('[RootLayout v18.3] ✅ Global data store initialized');
    
    // Initialize filter store (load dynamic options)
    useFilterStore.getState().refreshDynamicOptions();
    console.log('[RootLayout v18.3] ✅ Filter store initialized');
    
    console.log('[RootLayout v18.3] 🎉 All Zustand stores ready!');
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
    console.log('[RootLayout v18.3] 🔔 Inicializando sistema de notificaciones...');
    
    // Inicializar handler de notificaciones
    notificationHandler.initialize();
    
    // Listener para cambios de estado de la app (foreground/background)
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const isInForeground = nextAppState === 'active';
      console.log('[RootLayout v18.3] 📱 Estado de app cambió:', nextAppState);
      notificationHandler.setAppState(isInForeground);
    });
    
    return () => {
      console.log('[RootLayout v18.3] 🧹 Limpiando sistema de notificaciones...');
      notificationHandler.cleanup();
      subscription.remove();
    };
  }, []);

  // ✅ v14.0: CRITICAL FIX - Graceful background system initialization (iOS crash fix)
  useEffect(() => {
    const initializeBackgroundSystems = async () => {
      try {
        console.log('[RootLayout v18.3] 🚀 Initializing background systems (graceful mode)');
        
        try {
          await backgroundSync.initialize();
          console.log('[RootLayout v18.3] ✅ Background sync initialized');
        } catch (syncError) {
          console.log('[RootLayout v18.3] ⚠️ Background sync init failed - continuing without it');
        }
        
        if (Platform.OS === 'ios') {
          console.log('[RootLayout v18.3] ⏸️ Skipping background location on iOS (Expo Go compatibility)');
          return;
        }
        
        try {
          const started = await startBackgroundLocationTracking();
          if (started) {
            console.log('[RootLayout v18.3] ✅ Background location tracking started (Android)');
          } else {
            console.log('[RootLayout v18.3] ⚠️ Background location not started - will use foreground only');
          }
        } catch (trackingError) {
          console.log('[RootLayout v18.3] ⚠️ Background tracking failed - continuing with foreground location');
        }
      } catch (error) {
        console.log('[RootLayout v18.3] ⚠️ Background systems initialization error - app will continue normally');
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
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister }}
        >
          {/* ✅ CORRECCIÓN 1: LocationProvider envuelve el Stack */}
          <LocationProvider>
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
        </LocationProvider>
        </PersistQueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
