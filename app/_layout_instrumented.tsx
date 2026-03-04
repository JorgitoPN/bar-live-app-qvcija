
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 ROOT LAYOUT - INSTRUMENTADO PARA FASE 0 & 1
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ESTE ARCHIVO ES UNA COPIA INSTRUMENTADA DE app/_layout.tsx
 * 
 * INSTRUCCIONES:
 * 1. Renombrar app/_layout.tsx a app/_layout_original.tsx
 * 2. Renombrar este archivo a app/_layout.tsx
 * 3. Correr la app en un dispositivo físico (NO emulador)
 * 4. Observar los logs en la consola
 * 5. Copiar el output de PerformanceTracker.getSummary()
 * 6. Devolver los resultados al desarrollador
 * 
 * MÉTRICAS QUE SE MIDEN:
 * - AppLaunch: Tiempo total desde inicio hasta TTI
 * - AuthInitialization: Tiempo de inicialización de autenticación
 * - Auth_TTFB_SessionCheck: TTFB de supabase.auth.getSession()
 * - Auth_TTFB_ProfileLoad: TTFB de getCurrentUser()
 * - GlobalDataInitialization: Tiempo de carga de datos globales
 * - FilterStoreInitialization: Tiempo de carga de opciones de filtros
 * - PrefetchBares: Tiempo de prefetch de locales
 * - PrefetchBares_TTFB: TTFB de la query RPC
 * - TTI_MainContentRendered: Tiempo hasta que la UI es interactiva
 */

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
import { supabase } from '@/utils/supabase';
import PerformanceTracker from '@/utils/performanceTracker';

// ✅ PASO 4: Create QueryClient with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

// ✅ PASO 4.2: Create async persister
console.log('[TanStack Query] 🚀 Initializing async cache persister with supabaseStorage adapter');

const persister = createAsyncStoragePersister({
  storage: supabaseStorage,
  key: 'tanstack-query-cache-v1',
  throttleTime: 1000,
});

console.log('[TanStack Query] ✅ Async cache persister initialized successfully');

export default function RootLayout() {
  // ✅ INSTRUMENTACIÓN: Marcar inicio del bootstrap
  useEffect(() => {
    PerformanceTracker.start('AppLaunch');
    console.log('[RootLayout INSTRUMENTED] 🚀 Starting INSTRUMENTED initialization...');
    
    const initAuth = async () => {
      try {
        // ✅ MEDICIÓN 1: Auth Initialization
        PerformanceTracker.start('AuthInitialization');
        await useAuthStore.getState().initialize();
        PerformanceTracker.end('AuthInitialization', 'AuthInitDuration');
        
        // ✅ MEDICIÓN 2: Parallel Initializations
        PerformanceTracker.start('ParallelInitializations');
        await Promise.all([
          // Global data store
          (async () => {
            PerformanceTracker.start('GlobalDataInitialization');
            await useGlobalDataStore.getState().initialize();
            PerformanceTracker.end('GlobalDataInitialization', 'GlobalDataInitDuration');
          })().catch(err => {
            console.log('[RootLayout INSTRUMENTED] ⚠️ Global data init failed:', err);
          }),
          
          // Filter store
          (async () => {
            PerformanceTracker.start('FilterStoreInitialization');
            await useFilterStore.getState().refreshDynamicOptions();
            PerformanceTracker.end('FilterStoreInitialization', 'FilterStoreInitDuration');
          })().catch(err => {
            console.log('[RootLayout INSTRUMENTED] ⚠️ Filter store init failed:', err);
          }),
          
          // Prefetch critical data
          (async () => {
            try {
              PerformanceTracker.start('PrefetchBares');
              console.log('[RootLayout INSTRUMENTED] 🚀 Prefetching CRITICAL data...');
              
              await queryClient.prefetchInfiniteQuery({
                queryKey: ['bares_infinite_v24.0.0', null, null, null, '', {}],
                queryFn: async () => {
                  PerformanceTracker.start('PrefetchBares_TTFB');
                  
                  const { data, error } = await supabase.rpc('get_sorted_locales_by_proximity_cursor', {
                    p_user_lat: 40.4168,
                    p_user_lng: -3.7038,
                    p_limit: 10,
                    p_last_id: null,
                    p_last_sorting_tier: null,
                    p_last_distance_km: null,
                    p_category_filter: null,
                    p_servicios_filter: null,
                    p_ambiente_filter: null,
                    p_clientela_filter: null,
                    p_comunidad_filter: null,
                    p_provincia_filter: null,
                    p_max_distance_km: null,
                    p_search_query: null,
                  });
                  
                  PerformanceTracker.end('PrefetchBares_TTFB', 'PrefetchBares_TTFB_Duration');
                  
                  if (error) throw error;
                  
                  const venues = data || [];
                  console.log('[RootLayout INSTRUMENTED] ✅ Prefetched', venues.length, 'locales');
                  
                  return {
                    venues,
                    nextCursor: venues.length === 10 ? {
                      last_id: venues[venues.length - 1].id,
                      last_tier: venues[venues.length - 1].sorting_tier,
                      last_distance: venues[venues.length - 1].distancia,
                      offset: 10,
                    } : undefined,
                  };
                },
                initialPageParam: undefined,
              });
              
              PerformanceTracker.end('PrefetchBares', 'PrefetchBaresDuration');
            } catch (error) {
              console.log('[RootLayout INSTRUMENTED] ⚠️ Prefetch failed:', error);
            }
          })(),
        ]);
        
        PerformanceTracker.end('ParallelInitializations', 'ParallelInitDuration');
        
        // ✅ MEDICIÓN 3: Total Bootstrap Time (Pre-Render)
        PerformanceTracker.end('AppLaunch', 'TotalBootstrapTime_PreRender');
        
        // ✅ IMPRIMIR RESUMEN PARCIAL
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('📊 RESUMEN PARCIAL DE PERFORMANCE (PRE-RENDER)');
        console.log('═══════════════════════════════════════════════════════');
        console.log(PerformanceTracker.getSummary());
        
      } catch (error) {
        console.error('[RootLayout INSTRUMENTED] ❌ Auth initialization failed:', error);
      }
    };
    
    initAuth();
  }, []);

  // ✅ ANDROID FIX: Set global system navigation bar color
  useEffect(() => {
    if (Platform.OS === 'android') {
      const white = '#FFFFFF';
      SystemUI.setBackgroundColorAsync(white);
    }
  }, []);

  // ✅ NOTIFICATION SYSTEM
  useEffect(() => {
    console.log('[RootLayout INSTRUMENTED] 🔔 Inicializando sistema de notificaciones...');
    
    notificationHandler.initialize();
    
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const isInForeground = nextAppState === 'active';
      console.log('[RootLayout INSTRUMENTED] 📱 Estado de app cambió:', nextAppState);
      notificationHandler.setAppState(isInForeground);
    });
    
    return () => {
      console.log('[RootLayout INSTRUMENTED] 🧹 Limpiando sistema de notificaciones...');
      notificationHandler.cleanup();
      subscription.remove();
    };
  }, []);

  // ✅ BACKGROUND SYSTEMS
  useEffect(() => {
    const initializeBackgroundSystems = async () => {
      try {
        console.log('[RootLayout INSTRUMENTED] 🚀 Initializing background systems');
        
        try {
          await backgroundSync.initialize();
          console.log('[RootLayout INSTRUMENTED] ✅ Background sync initialized');
        } catch (syncError) {
          console.log('[RootLayout INSTRUMENTED] ⚠️ Background sync init failed');
        }
        
        if (Platform.OS === 'ios') {
          console.log('[RootLayout INSTRUMENTED] ⏸️ Skipping background location on iOS');
          return;
        }
        
        try {
          const started = await startBackgroundLocationTracking();
          if (started) {
            console.log('[RootLayout INSTRUMENTED] ✅ Background location tracking started');
          }
        } catch (trackingError) {
          console.log('[RootLayout INSTRUMENTED] ⚠️ Background tracking failed');
        }
      } catch (error) {
        console.log('[RootLayout INSTRUMENTED] ⚠️ Background systems error');
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
                          
                          <Stack.Group screenOptions={{ presentation: 'modal' }}>
                            <Stack.Screen name="modal" options={{ title: 'Modal' }} />
                            <Stack.Screen name="formsheet" options={{ presentation: 'formSheet' }} />
                            <Stack.Screen name="transparent-modal" options={{ presentation: 'transparentModal' }} />
                          </Stack.Group>

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
