
import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';
import { ImpersonationProvider } from '@/contexts/ImpersonationContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { GlobalDataProvider } from '@/contexts/GlobalDataContext';
import { ModeProvider } from '@/contexts/ModeContext';
import { SelectedLocalProvider } from '@/contexts/SelectedLocalContext';
import { WidgetProvider } from '@/contexts/WidgetContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen after a short delay
    setTimeout(() => {
      SplashScreen.hideAsync();
    }, 1000);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ImpersonationProvider>
          <GlobalDataProvider>
            <FavoritesProvider>
              <ModeProvider>
                <SelectedLocalProvider>
                  <WidgetProvider>
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        animation: Platform.OS === 'ios' ? 'default' : 'fade',
                        contentStyle: { backgroundColor: 'transparent' },
                      }}
                    >
                      <Stack.Screen name="index" />
                      <Stack.Screen name="(tabs)" />
                      <Stack.Screen name="auth" />
                      <Stack.Screen name="admin" />
                      <Stack.Screen name="detalle" />
                      <Stack.Screen name="editar" />
                      <Stack.Screen name="crear" />
                      <Stack.Screen name="perfil" />
                      <Stack.Screen name="social" />
                      <Stack.Screen name="chat" />
                      <Stack.Screen name="empleo" />
                      <Stack.Screen name="gestion" />
                      <Stack.Screen name="legal" />
                      <Stack.Screen name="soporte" />
                      <Stack.Screen name="solicitudes" />
                      <Stack.Screen
                        name="modal"
                        options={{
                          presentation: 'modal',
                          animation: 'slide_from_bottom',
                        }}
                      />
                      <Stack.Screen
                        name="transparent-modal"
                        options={{
                          presentation: 'transparentModal',
                          animation: 'fade',
                        }}
                      />
                      <Stack.Screen
                        name="formsheet"
                        options={{
                          presentation: 'formSheet',
                          animation: 'slide_from_bottom',
                        }}
                      />
                    </Stack>
                  </WidgetProvider>
                </SelectedLocalProvider>
              </ModeProvider>
            </FavoritesProvider>
          </GlobalDataProvider>
        </ImpersonationProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
