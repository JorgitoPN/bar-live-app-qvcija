
import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';
import { GlobalDataProvider } from '@/contexts/GlobalDataContext';
import { ModeProvider } from '@/contexts/ModeContext';
import { SelectedLocalProvider } from '@/contexts/SelectedLocalContext';
import { WidgetProvider } from '@/contexts/WidgetContext';
import { StoryStateProvider } from '@/contexts/StoryStateContextV11';
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
    <AuthProvider>
      <GlobalDataProvider>
        <ModeProvider>
          <SelectedLocalProvider>
            <WidgetProvider>
              <StoryStateProvider>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    animation: Platform.OS === 'ios' ? 'default' : 'fade',
                  }}
                >
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="auth" options={{ headerShown: false }} />
                  <Stack.Screen name="admin" options={{ headerShown: false }} />
                  <Stack.Screen name="crear" options={{ headerShown: false }} />
                  <Stack.Screen name="detalle" options={{ headerShown: false }} />
                  <Stack.Screen name="editar" options={{ headerShown: false }} />
                  <Stack.Screen name="perfil" options={{ headerShown: false }} />
                  <Stack.Screen name="social" options={{ headerShown: false }} />
                  <Stack.Screen name="chat" options={{ headerShown: false }} />
                  <Stack.Screen name="empleo" options={{ headerShown: false }} />
                  <Stack.Screen name="gestion" options={{ headerShown: false }} />
                  <Stack.Screen name="legal" options={{ headerShown: false }} />
                  <Stack.Screen name="soporte" options={{ headerShown: false }} />
                  <Stack.Screen name="solicitudes" options={{ headerShown: false }} />
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
                      headerShown: false,
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
              </StoryStateProvider>
            </WidgetProvider>
          </SelectedLocalProvider>
        </ModeProvider>
      </GlobalDataProvider>
    </AuthProvider>
  );
}
