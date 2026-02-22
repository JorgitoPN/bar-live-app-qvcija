
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
import { Platform } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { startBackgroundLocationTracking } from '@/utils/locationUtils';
import { backgroundSync } from '@/utils/backgroundSync';

/**
 * ✅ ROOT LAYOUT v14.0 - CRITICAL FIX: iOS EXPO GO CRASH
 * 
 * CHANGES v14.0:
 * - 🔧 FIXED: iOS Expo Go crash on app launch
 * - 🔧 FIXED: Background location tracking disabled on iOS (causes crashes)
 * - 🔧 IMPROVED: Graceful initialization with proper error handling
 * - 🔧 IMPROVED: 1-second delay before background system initialization
 * 
 * ROOT CAUSE:
 * - Background location tracking started too early on iOS
 * - Permission issues in Expo Go caused immediate crash
 * 
 * SOLUTION:
 * - Skip background tracking on iOS entirely
 * - Use foreground location only on iOS
 * - Wrap all initialization in try-catch blocks
 * - Delay initialization to avoid race conditions
 * 
 * Previous changes:
 * - v13.0: Background location & intelligent preloading
 * - v12.0: Android navigation bar color fix
 * - v11.0: Sala virtual presentation fix
 */

export default function RootLayout() {
  // ✅ ANDROID FIX v13.0: Set global system navigation bar color to WHITE (no blue flash)
  useEffect(() => {
    if (Platform.OS === 'android') {
      const white = '#FFFFFF'; // White background to prevent blue flash
      SystemUI.setBackgroundColorAsync(white);
    }
  }, []);

  // ✅ v14.0: CRITICAL FIX - Graceful background system initialization (iOS crash fix)
  useEffect(() => {
    const initializeBackgroundSystems = async () => {
      try {
        console.log('[RootLayout v14.0] 🚀 Initializing background systems (graceful mode)');
        
        // ✅ CRITICAL: Wrap everything in try-catch to prevent crashes
        try {
          // Initialize background sync manager (non-blocking)
          await backgroundSync.initialize();
          console.log('[RootLayout v14.0] ✅ Background sync initialized');
        } catch (syncError) {
          console.log('[RootLayout v14.0] ⚠️ Background sync init failed - continuing without it');
        }
        
        // ✅ CRITICAL: Don't start background tracking on iOS in Expo Go
        // It causes crashes due to permission issues
        if (Platform.OS === 'ios') {
          console.log('[RootLayout v14.0] ⏸️ Skipping background location on iOS (Expo Go compatibility)');
          return;
        }
        
        // Only try background tracking on Android
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
        // ✅ CRITICAL: Never let this crash the app
        console.log('[RootLayout v14.0] ⚠️ Background systems initialization error - app will continue normally');
      }
    };

    // ✅ CRITICAL: Delay initialization to avoid race conditions
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
