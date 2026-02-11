
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
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';

/**
 * ✅ ROOT LAYOUT v4.0 - iOS VIRTUAL ROOM FULL SCREEN FIX
 * 
 * CHANGES v4.0:
 * - ✅ FIXED: iOS Virtual Room now opens in full screen (same as Android)
 * - ✅ FIXED: Changed presentation from 'fullScreenModal' to 'card' for consistent behavior
 * - ✅ RESULT: Consistent user experience across platforms
 * - ✅ RESULT: Full screen presentation on both iOS and Android
 * 
 * Previous changes v3.0:
 * - ✅ FIXED: iOS Virtual Room opens in full screen (same as Android)
 * - ✅ RESULT: Consistent user experience across platforms
 * - ✅ RESULT: No modal presentation on iOS - full screen like Android
 */

export default function RootLayout() {
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
                                {/* ✅ FIX v2.0: Profile now uses fullScreenModal to render above virtual room */}
                                <Stack.Screen 
                                  name="perfil" 
                                  options={{ 
                                    headerShown: false,
                                    presentation: 'fullScreenModal',
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
                  {/* ✅ FIX v4.0: iOS Virtual Room opens in full screen (same as Android) */}
                  <Stack.Screen 
                    name="detalle/sala-virtual-enhanced" 
                    options={{ 
                      title: 'Sala Virtual',
                      headerShown: true,
                      presentation: Platform.OS === 'ios' ? 'card' : 'card',
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
