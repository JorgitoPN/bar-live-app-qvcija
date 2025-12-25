
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';
import { ModeProvider } from '@/contexts/ModeContext';
import { SelectedLocalProvider } from '@/contexts/SelectedLocalContext';
import { GlobalDataProvider } from '@/contexts/GlobalDataContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { ImpersonationProvider } from '@/contexts/ImpersonationContext';
import { PostsProvider } from '@/contexts/PostsContext';
import { FilterProvider } from '@/contexts/FilterContext';
import { colors } from '@/styles/commonStyles';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import { initializeAndroidBehavior } from '@/utils/androidNativeBehavior';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // ✅ CRITICAL FIX v25.0: Initialize Android-specific behavior
    let cleanupAndroid: (() => void) | undefined;
    
    if (Platform.OS === 'android') {
      console.log('[RootLayout v25.0] 🤖 Initializing Android native behavior...');
      cleanupAndroid = initializeAndroidBehavior();
    }

    // Hide splash screen
    setTimeout(() => {
      SplashScreen.hideAsync();
    }, 100);

    // Cleanup function
    return () => {
      if (cleanupAndroid) {
        cleanupAndroid();
      }
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ImpersonationProvider>
          <ModeProvider>
            <SelectedLocalProvider>
              <GlobalDataProvider>
                <FavoritesProvider>
                  <FilterProvider>
                    <PostsProvider>
                      <StatusBar style="light" />
                      <Stack
                        screenOptions={{
                          headerShown: false,
                          contentStyle: { backgroundColor: colors.background },
                          animation: Platform.OS === 'android' ? 'slide_from_right' : 'default',
                          gestureEnabled: true,
                          gestureDirection: 'horizontal',
                        }}
                      >
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen name="auth" options={{ headerShown: false }} />
                        <Stack.Screen name="crear" options={{ headerShown: false }} />
                        <Stack.Screen name="detalle" options={{ headerShown: false }} />
                        <Stack.Screen name="editar" options={{ headerShown: false }} />
                        <Stack.Screen name="perfil" options={{ headerShown: false }} />
                        <Stack.Screen name="social" options={{ headerShown: false }} />
                        <Stack.Screen name="chat" options={{ headerShown: false }} />
                        <Stack.Screen name="admin" options={{ headerShown: false }} />
                        <Stack.Screen name="gestion" options={{ headerShown: false }} />
                        <Stack.Screen name="empleo" options={{ headerShown: false }} />
                        <Stack.Screen name="legal" options={{ headerShown: false }} />
                        <Stack.Screen name="soporte" options={{ headerShown: false }} />
                        <Stack.Screen name="solicitudes" options={{ headerShown: false }} />
                      </Stack>
                    </PostsProvider>
                  </FilterProvider>
                </FavoritesProvider>
              </GlobalDataProvider>
            </SelectedLocalProvider>
          </ModeProvider>
        </ImpersonationProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
