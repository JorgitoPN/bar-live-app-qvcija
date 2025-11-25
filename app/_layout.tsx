
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

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const isHandlingDeepLink = useRef(false);

  // Handle deep links for OAuth callbacks
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      // Prevent multiple simultaneous deep link handling
      if (isHandlingDeepLink.current) {
        console.log('[RootLayout] Already handling a deep link, skipping...');
        return;
      }

      console.log('[RootLayout] ========================================');
      console.log('[RootLayout] Deep link received:', event.url);
      console.log('[RootLayout] ========================================');
      
      // Check if this is an OAuth callback
      if (event.url.includes('access_token') || event.url.includes('auth/callback') || event.url.includes('auth/v1/callback')) {
        isHandlingDeepLink.current = true;
        console.log('[RootLayout] 🔐 OAuth callback detected');
        
        try {
          // Extract tokens from URL
          let accessToken: string | null = null;
          let refreshToken: string | null = null;
          
          // Try to get from hash first
          if (event.url.includes('#')) {
            const hashPart = event.url.split('#')[1];
            console.log('[RootLayout] Hash part:', hashPart);
            const hashParams = new URLSearchParams(hashPart);
            accessToken = hashParams.get('access_token');
            refreshToken = hashParams.get('refresh_token');
            
            console.log('[RootLayout] Tokens from hash:', {
              hasAccessToken: !!accessToken,
              hasRefreshToken: !!refreshToken,
            });
          }
          
          // If not in hash, try query params
          if (!accessToken && event.url.includes('?')) {
            const queryString = event.url.split('?')[1].split('#')[0];
            console.log('[RootLayout] Query part:', queryString);
            const queryParams = new URLSearchParams(queryString);
            accessToken = queryParams.get('access_token');
            refreshToken = queryParams.get('refresh_token');
            
            console.log('[RootLayout] Tokens from query:', {
              hasAccessToken: !!accessToken,
              hasRefreshToken: !!refreshToken,
            });
          }

          if (accessToken && refreshToken) {
            console.log('[RootLayout] ✅ Tokens found in deep link, setting session...');
            
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error('[RootLayout] ❌ Error setting session from deep link:', error);
              // Still navigate to callback to show error
              router.replace('/auth/callback');
            } else {
              console.log('[RootLayout] ✅ Session set successfully from deep link');
              console.log('[RootLayout] User:', data.user?.email);
              
              // Wait a bit for session to propagate
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Navigate to callback screen to complete the flow
              router.replace('/auth/callback');
            }
          } else {
            console.log('[RootLayout] ⚠️ No tokens found, navigating to callback anyway');
            // No tokens, just navigate to callback screen
            router.replace('/auth/callback');
          }
        } catch (error) {
          console.error('[RootLayout] ❌ Exception handling deep link:', error);
          // Navigate to callback to show error
          router.replace('/auth/callback');
        } finally {
          // Reset the flag after a delay
          setTimeout(() => {
            isHandlingDeepLink.current = false;
          }, 2000);
        }
      } else {
        console.log('[RootLayout] ℹ️ Non-OAuth deep link, ignoring');
      }
    };

    // Listen for deep links
    console.log('[RootLayout] Setting up deep link listener...');
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[RootLayout] App opened with URL:', url);
        handleDeepLink({ url });
      } else {
        console.log('[RootLayout] No initial URL');
      }
    });

    return () => {
      console.log('[RootLayout] Removing deep link listener');
      subscription.remove();
    };
  }, [router]);

  useEffect(() => {
    if (loading) {
      console.log('[RootLayout] Auth loading...');
      return;
    }

    console.log('[RootLayout] Auth state:', { user: user?.email, segments });

    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';

    // If user is logged in and trying to access auth screens, redirect to tabs
    if (user && inAuthGroup && segments[1] !== 'callback') {
      console.log('[RootLayout] User logged in, redirecting from auth to tabs');
      router.replace('/(tabs)/explorar');
    }
    // If user is not logged in and trying to access protected screens, allow it
    // (we handle login requirements at the component level)
  }, [user, loading, segments, router]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login-popup" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="auth/terms-acceptance" options={{ headerShown: false }} />
        <Stack.Screen name="auth/completar-perfil" options={{ headerShown: false }} />
        <Stack.Screen name="auth/bienvenida" options={{ headerShown: false }} />
        <Stack.Screen name="auth/bienvenida-propietario" options={{ headerShown: false }} />
        <Stack.Screen name="auth/onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="auth/local-ownership-request" options={{ headerShown: false }} />
        <Stack.Screen name="auth/propietario-request-status" options={{ headerShown: false }} />
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
