
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
      console.log('[DeepLink] ========================================');
      console.log('[DeepLink] Received URL:', event.url);
      console.log('[DeepLink] Is handling:', isHandlingDeepLink.current);
      console.log('[DeepLink] ========================================');
      
      if (isHandlingDeepLink.current) {
        console.log('[DeepLink] Already handling a deep link, ignoring...');
        return;
      }

      // Check if this is an OAuth callback
      const isOAuthCallback = event.url.includes('access_token') || 
                             event.url.includes('auth/callback') || 
                             event.url.includes('auth/v1/callback') ||
                             event.url.includes('com.barlive.app://auth/callback');
      
      if (!isOAuthCallback) {
        console.log('[DeepLink] Not an OAuth callback, ignoring...');
        return;
      }

      isHandlingDeepLink.current = true;
      console.log('[DeepLink] 🔄 Processing OAuth callback...');
      
      try {
        let accessToken: string | null = null;
        let refreshToken: string | null = null;
        let errorParam: string | null = null;
        let errorDescription: string | null = null;
        
        // Try to extract tokens from hash first
        if (event.url.includes('#')) {
          const hashPart = event.url.split('#')[1];
          console.log('[DeepLink] Hash part:', hashPart);
          const hashParams = new URLSearchParams(hashPart);
          accessToken = hashParams.get('access_token');
          refreshToken = hashParams.get('refresh_token');
          errorParam = hashParams.get('error');
          errorDescription = hashParams.get('error_description');
          
          console.log('[DeepLink] Tokens from hash:', {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            error: errorParam,
          });
        }
        
        // If not in hash, try query params
        if (!accessToken && event.url.includes('?')) {
          const queryString = event.url.split('?')[1].split('#')[0];
          console.log('[DeepLink] Query part:', queryString);
          const queryParams = new URLSearchParams(queryString);
          accessToken = queryParams.get('access_token');
          refreshToken = queryParams.get('refresh_token');
          errorParam = queryParams.get('error');
          errorDescription = queryParams.get('error_description');
          
          console.log('[DeepLink] Tokens from query:', {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            error: errorParam,
          });
        }

        // Check for OAuth errors
        if (errorParam) {
          console.error('[DeepLink] ❌ OAuth error:', errorParam);
          router.replace('/auth/callback');
          return;
        }

        // If we have tokens, set the session
        if (accessToken && refreshToken) {
          console.log('[DeepLink] ✅ Tokens found, setting session...');
          
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('[DeepLink] ❌ Error setting session:', error);
            router.replace('/auth/callback');
          } else if (data.user) {
            console.log('[DeepLink] ✅ Session set for user:', data.user.email);
            // Wait a bit for session to propagate
            await new Promise(resolve => setTimeout(resolve, 500));
            router.replace('/auth/callback');
          } else {
            console.error('[DeepLink] ❌ No user in session data');
            router.replace('/auth/callback');
          }
        } else {
          console.log('[DeepLink] ⚠️ No tokens found, redirecting to callback...');
          router.replace('/auth/callback');
        }
      } catch (error) {
        console.error('[DeepLink] ❌ Exception handling deep link:', error);
        router.replace('/auth/callback');
      } finally {
        // Reset the flag after a delay to allow for new deep links
        setTimeout(() => {
          console.log('[DeepLink] 🧹 Resetting handler flag');
          isHandlingDeepLink.current = false;
        }, 3000);
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check for initial URL (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[DeepLink] Initial URL:', url);
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
