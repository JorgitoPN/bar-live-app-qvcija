
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
 * ✅ ROOT LAYOUT v18.2 - TANSTACK QUERY ASYNC PERSISTER (PASO 4.2 COMPLETADO)
 * 
 * 🎉 PASO 4.2 COMPLETADO: TANSTACK QUERY CON PERSISTENCIA ASÍNCRONA CORRECTA
 * 
 * CAMBIOS v18.2:
 * - 🔧 CORREGIDO: Migración a createAsyncStoragePersister (compatible con supabaseStorage asíncrono)
 * - 🚀 AÑADIDO: TanStack Query para gestión de caché de datos de Supabase
 * - 🚀 PERSISTENCIA: Caché persistente con MMKV (iOS/Android) y AsyncStorage (Web)
 * - 🚀 STALE TIME: 5 minutos - los datos no se refrescan constantemente
 * - 🚀 CACHE TIME: 24 horas - los datos persisten incluso después de cerrar la app
 * - 🚀 INSTANT UI: Los bares aparecen instantáneamente al abrir la app (desde caché)
 * 
 * CÓMO FUNCIONA LA CACHÉ DE TANSTACK QUERY:
 * 
 * ❌ ANTES (Sin TanStack Query):
 * - Cada vez que abres la app: Spinner de carga → Petición a Supabase → Datos aparecen
 * - Tiempo de espera: 1-3 segundos cada vez
 * - Experiencia: Lenta, frustrante
 * 
 * ✅ AHORA (Con TanStack Query + MMKV):
 * - Primera vez: Spinner → Petición a Supabase → Datos aparecen → Se guardan en MMKV
 * - Siguientes veces: Datos aparecen INSTANTÁNEAMENTE desde MMKV → Petición en segundo plano (si stale)
 * - Tiempo de espera: 0 segundos (datos instantáneos)
 * - Experiencia: Rápida, fluida, como Instagram/WhatsApp
 * 
 * CÓMO USAR TANSTACK QUERY EN TUS COMPONENTES:
 * 
 * Ejemplo: Crear un hook useBaresQuery para obtener los bares
 * 
 * // hooks/useBaresQuery.ts (ARCHIVO DE EJEMPLO CREADO)
 * import { useQuery } from '@tanstack/react-query';
 * import { supabase } from '@/utils/supabase';
 * 
 * export const useBaresQuery = () => {
 *   return useQuery({
 *     queryKey: ['bares'], // Identificador único de la query
 *     queryFn: async () => {
 *       console.log('[useBaresQuery] Fetching bares from Supabase...');
 *       const { data, error } = await supabase.from('locales').select('*');
 *       if (error) throw error;
 *       return data;
 *     },
 *     staleTime: 1000 * 60 * 5, // 5 minutos
 *   });
 * };
 * 
 * // En tu componente:
 * const { data: bares, isLoading, error, refetch } = useBaresQuery();
 * 
 * // Pull-to-refresh:
 * <ScrollView refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
 *   {bares?.map(bar => <BarCard key={bar.id} bar={bar} />)}
 * </ScrollView>
 * 
 * STALE TIME (5 minutos):
 * - Si los datos tienen menos de 5 minutos: NO se hace petición a la red
 * - Si los datos tienen más de 5 minutos: Se hace petición en segundo plano (pero los datos viejos se muestran primero)
 * - Resultado: Menos peticiones a Supabase, menos consumo de datos, más rápido
 * 
 * CACHE TIME (24 horas):
 * - Los datos se mantienen en MMKV durante 24 horas
 * - Incluso si cierras la app, los datos siguen ahí
 * - Resultado: Apertura instantánea de la app, sin spinners
 * 
 * PULL-TO-REFRESH:
 * - Cuando el usuario tira hacia abajo: Se ejecuta refetch() de la query
 * - Esto fuerza una petición a Supabase, ignorando el staleTime
 * - Los datos se actualizan y se guardan en MMKV
 * 
 * PROVIDERS ACTUALES (9):
 * - QueryClientProvider (TanStack Query - NUEVO)
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
 * - useGlobalDataStore (locales, posts, eventos, ofertas) - AHORA COMPLEMENTADO CON TANSTACK QUERY
 * 
 * BENEFICIOS DE TANSTACK QUERY:
 * 1. 🚀 INSTANT UI: Datos aparecen instantáneamente desde caché
 * 2. 🔄 SMART REFETCH: Solo se refrescan los datos cuando son "stale" (viejos)
 * 3. 💾 PERSISTENT CACHE: Los datos persisten entre sesiones (MMKV)
 * 4. 📡 BACKGROUND SYNC: Actualización en segundo plano sin bloquear UI
 * 5. 🎯 DEDUPLICATION: Múltiples componentes pueden usar la misma query sin duplicar peticiones
 * 
 * VERIFICACIÓN FINAL:
 * ✅ staleTime: 5 minutos (1000 * 60 * 5)
 * ✅ gcTime: 24 horas (1000 * 60 * 60 * 24)
 * ✅ Persister: createAsyncStoragePersister con supabaseStorage
 * ✅ Throttle: 1000ms para evitar escrituras excesivas
 * 
 * Cambios previos:
 * - v18.1: Migración inicial a TanStack Query (con error de persister)
 * - v17.0: Migración a Zustand (Paso 3)
 * - v16.0: Sistema de notificaciones push
 * - v15.0: Sistema inicial de notificaciones
 * - v14.0: Fix de crash en iOS Expo Go
 * - v13.0: Ubicación en segundo plano y precarga inteligente
 * - v12.0: Fix de color de barra de navegación Android
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
// This adapter already handles MMKV (native) and AsyncStorage (web) fallback
// supabaseStorage is fully async-compatible, so we use createAsyncStoragePersister
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
