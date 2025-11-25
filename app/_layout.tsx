
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';
import { useColorScheme } from 'react-native';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { GlobalDataProvider } from '@/contexts/GlobalDataContext';
import { ModeProvider } from '@/contexts/ModeContext';
import { SelectedLocalProvider } from '@/contexts/SelectedLocalContext';
import { WidgetProvider } from '@/contexts/WidgetContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import { supabase } from '@/utils/supabase';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const isHandlingDeepLink = useRef(false);

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      if (isHandlingDeepLink.current) {
        return;
      }

      if (event.url.includes('access_token') || event.url.includes('auth/callback') || event.url.includes('auth/v1/callback')) {
        isHandlingDeepLink.current = true;
        
        try {
          let accessToken: string | null = null;
          let refreshToken: string | null = null;
          
          if (event.url.includes('#')) {
            const hashPart = event.url.split('#')[1];
            const hashParams = new URLSearchParams(hashPart);
            accessToken = hashParams.get('access_token');
            refreshToken = hashParams.get('refresh_token');
          }
          
          if (!accessToken && event.url.includes('?')) {
            const queryString = event.url.split('?')[1].split('#')[0];
            const queryParams = new URLSearchParams(queryString);
            accessToken = queryParams.get('access_token');
            refreshToken = queryParams.get('refresh_token');
          }

          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('Error setting session from deep link:', error);
              router.replace('/auth/callback');
            } else {
              await new Promise(resolve => setTimeout(resolve, 500));
              router.replace('/auth/callback');
            }
          } else {
            router.replace('/auth/callback');
          }
        } catch (error) {
          console.error('Exception handling deep link:', error);
          router.replace('/auth/callback');
        } finally {
          setTimeout(() => {
            isHandlingDeepLink.current = false;
          }, 2000);
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const inAuthGroup = segments[0] === 'auth';

    if (user && inAuthGroup && segments[1] !== 'callback') {
      router.replace('/(tabs)/explorar');
    }
  }, [user, loading, segments, router]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/login-popup" options={{ presentation: 'modal' }} />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="auth/terms-acceptance" />
        <Stack.Screen name="auth/completar-perfil" />
        <Stack.Screen name="auth/bienvenida" />
        <Stack.Screen name="auth/bienvenida-propietario" />
        <Stack.Screen name="auth/onboarding" />
        <Stack.Screen name="auth/local-ownership-request" />
        <Stack.Screen name="auth/propietario-request-status" />
        <Stack.Screen name="auth/registro-email" />
        <Stack.Screen name="auth/verificar-email" />
        <Stack.Screen name="auth/datos-basicos" />
        <Stack.Screen name="auth/crear-usuario-password" />
        <Stack.Screen name="auth/completar-perfil-opcional" />
        <Stack.Screen name="auth/crear-password-google" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <GlobalDataProvider>
          <ModeProvider>
            <SelectedLocalProvider>
              <WidgetProvider>
                <RootLayoutNav />
              </WidgetProvider>
            </SelectedLocalProvider>
          </ModeProvider>
        </GlobalDataProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
