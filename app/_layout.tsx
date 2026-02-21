
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

/**
 * ✅ ROOT LAYOUT v12.0 - ANDROID SYSTEM UI FIX
 * 
 * CHANGES v12.0:
 * - ✅ FIXED: Android system navigation bar now uses Barlive corporate blue (#1A73E8)
 * - ✅ FIXED: Applies globally to all screens in the app
 * - ✅ FIXED: No more transparent navigation bar on Android
 * 
 * CHANGES v11.0:
 * - ✅ FIXED: Sala virtual ahora usa presentation: 'card' explícitamente (NO modal)
 * - ✅ FIXED: Configuración específica para iOS para evitar comportamiento de modal
 * - ✅ FIXED: headerShown = false para pantalla completa
 * - ✅ RESULTADO: Experiencia consistente en iOS y Android - pantalla completa
 */

export default function RootLayout() {
  // ✅ ANDROID FIX v12.0: Set global system navigation bar color
  useEffect(() => {
    if (Platform.OS === 'android') {
      const barliveBlue = '#1A73E8'; // Barlive corporate blue
      SystemUI.setBackgroundColorAsync(barliveBlue);
    }
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
