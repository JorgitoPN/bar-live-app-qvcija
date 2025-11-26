
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';
import { GlobalDataProvider } from '@/contexts/GlobalDataContext';
import { ModeProvider } from '@/contexts/ModeContext';
import { SelectedLocalProvider } from '@/contexts/SelectedLocalContext';
import { WidgetProvider } from '@/contexts/WidgetContext';
import { StoryStateProvider } from '@/contexts/StoryStateContext';
import { colors } from '@/styles/commonStyles';
import { StatusBar } from 'expo-status-bar';
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
                <StatusBar style="light" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                    animation: 'fade',
                  }}
                >
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="auth" />
                  <Stack.Screen name="admin" />
                  <Stack.Screen name="crear" />
                  <Stack.Screen name="detalle" />
                  <Stack.Screen name="editar" />
                  <Stack.Screen name="empleo" />
                  <Stack.Screen name="gestion" />
                  <Stack.Screen name="legal" />
                  <Stack.Screen name="perfil" />
                  <Stack.Screen name="social" />
                  <Stack.Screen name="solicitudes" />
                  <Stack.Screen name="soporte" />
                  <Stack.Screen name="chat" />
                  <Stack.Screen name="integrations" />
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
