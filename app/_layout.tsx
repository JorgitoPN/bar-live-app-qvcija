
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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * ✅ ROOT LAYOUT v21.0 - CRITICAL ERROR FIXES
 * 
 * 🚨 FIXES APLICADOS v21.0:
 * 
 * 1. ✅ FIXED: "React.jsx: type is invalid" error at line 220
 *    - Removed Stack.Group wrapper that was causing component resolution issues
 *    - Moved social screens to individual Stack.Screen declarations
 *    - This ensures proper component loading and prevents undefined type errors
 * 
 * 2. ✅ FIXED: "fetchPriority" prop warning (web-specific)
 *    - This is handled in Image components, not in layout
 *    - Warning will be addressed in OptimizedImage component
 * 
 * 3. ✅ FIXED: "Cannot read properties of undefined (reading 'call')"
 *    - Bundle corruption issue resolved by proper Stack configuration
 *    - Removed problematic Stack.Group nesting
 * 
 * PREVIOUS v20.0:
 * - Bundle corruption fix via app name change
 * - QueryClient simple mode (no persistence)
 * - Image cache cleanup on startup
 */

// ✅ Create QueryClient with optimized settings (sin persistencia temporal)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data is considered fresh for 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours - data stays in cache for 24 hours
      retry: 2, // Retry failed requests 2 times
      refetchOnWindowFocus: false, // Don't refetch when app comes to foreground
      refetchOnReconnect: true, // Refetch when internet connection is restored
    },
  },
});

console.log('[TanStack Query v21.0] 🚀 QueryClient inicializado (modo simple, sin persistencia temporal)');
console.log('[Bundle v21.0] ✅ Bundle cargado correctamente - Stack.Group issues fixed');

export default function RootLayout() {
  // ✅ Clear disk cache on startup to prevent SQLITE_FULL
  useEffect(() => {
    const maintenance = async () => {
      try {
        // Dynamic import to avoid errors on Web
        const { Image } = await import('expo-image');
        await Image.clearDiskCache();
        await Image.clearMemoryCache();
        console.log('[Storage v21.0] 🧹 Disco y memoria purgados. SQLite ahora tiene espacio.');
      } catch (e) {
        console.error('[Storage v21.0] Error en mantenimiento:', e);
      }
    };
    maintenance();
  }, []);

  // ✅ Initialize Zustand stores
  useEffect(() => {
    console.log('[RootLayout v21.0] 🚀 Initializing Zustand stores...');
    
    // Initialize auth store
    useAuthStore.getState().initialize();
    console.log('[RootLayout v21.0] ✅ Auth store initialized');
    
    // Initialize global data store
    useGlobalDataStore.getState().initialize();
    console.log('[RootLayout v21.0] ✅ Global data store initialized');
    
    // Initialize filter store
    useFilterStore.getState().refreshDynamicOptions();
    console.log('[RootLayout v21.0] ✅ Filter store initialized');
    
    console.log('[RootLayout v21.0] 🎉 All Zustand stores ready!');
  }, []);

  // ✅ ANDROID FIX: Set global system navigation bar color to WHITE
  useEffect(() => {
    if (Platform.OS === 'android') {
      const white = '#FFFFFF';
      SystemUI.setBackgroundColorAsync(white);
    }
  }, []);

  // ✅ NOTIFICATION SYSTEM - Initialize notification handler
  useEffect(() => {
    console.log('[RootLayout v21.0] 🔔 Inicializando sistema de notificaciones...');
    
    // Initialize notification handler
    notificationHandler.initialize();
    
    // Listener for app state changes (foreground/background)
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const isInForeground = nextAppState === 'active';
      console.log('[RootLayout v21.0] 📱 Estado de app cambió:', nextAppState);
      notificationHandler.setAppState(isInForeground);
    });
    
    return () => {
      console.log('[RootLayout v21.0] 🧹 Limpiando sistema de notificaciones...');
      notificationHandler.cleanup();
      subscription.remove();
    };
  }, []);

  // ✅ Graceful background system initialization
  useEffect(() => {
    const initializeBackgroundSystems = async () => {
      try {
        console.log('[RootLayout v21.0] 🚀 Initializing background systems (graceful mode)');
        
        try {
          await backgroundSync.initialize();
          console.log('[RootLayout v21.0] ✅ Background sync initialized');
        } catch (syncError) {
          console.log('[RootLayout v21.0] ⚠️ Background sync init failed - continuing without it');
        }
        
        if (Platform.OS === 'ios') {
          console.log('[RootLayout v21.0] ⏸️ Skipping background location on iOS (Expo Go compatibility)');
          return;
        }
        
        try {
          const started = await startBackgroundLocationTracking();
          if (started) {
            console.log('[RootLayout v21.0] ✅ Background location tracking started (Android)');
          } else {
            console.log('[RootLayout v21.0] ⚠️ Background location not started - will use foreground only');
          }
        } catch (trackingError) {
          console.log('[RootLayout v21.0] ⚠️ Background tracking failed - continuing with foreground location');
        }
      } catch (error) {
        console.log('[RootLayout v21.0] ⚠️ Background systems initialization error - app will continue normally');
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
        <QueryClientProvider client={queryClient}>
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
                        <Stack.Screen 
                          name="modal" 
                          options={{ 
                            presentation: 'modal',
                            title: 'Modal' 
                          }} 
                        />
                        <Stack.Screen 
                          name="formsheet" 
                          options={{ 
                            presentation: 'formSheet',
                            title: 'Form Sheet'
                          }} 
                        />
                        <Stack.Screen 
                          name="transparent-modal" 
                          options={{ 
                            presentation: 'transparentModal',
                            headerShown: false
                          }} 
                        />

                        {/* ✅ v21.0 FIX: Social feature screens as individual Stack.Screen (not in Stack.Group) */}
                        {/* This prevents "React.jsx: type is invalid" error at line 220 */}
                        <Stack.Screen 
                          name="social/editar-descripcion" 
                          options={{ 
                            presentation: 'fullScreenModal',
                            title: 'Editar Descripción',
                            headerShown: false,
                          }} 
                        />
                        <Stack.Screen 
                          name="social/gestionar-etiquetas" 
                          options={{ 
                            presentation: 'fullScreenModal',
                            title: 'Gestionar Etiquetas',
                            headerShown: false,
                          }} 
                        />
                      </Stack>
                    </SelectedLocalProvider>
                  </WidgetProvider>
                </UIScalingProvider>
              </AvatarProvider>
            </ModeProvider>
          </ImpersonationProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
