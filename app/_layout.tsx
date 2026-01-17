
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { useColorScheme } from 'react-native';
import { AuthProvider } from '@/contexts/AuthContext';
import { ModeProvider } from '@/contexts/ModeContext';
import { FilterProvider } from '@/contexts/FilterContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { AvatarProvider } from '@/contexts/AvatarContext';
import { ImpersonationProvider } from '@/contexts/ImpersonationContext';
import { PostsProvider } from '@/contexts/PostsContext';
import { GlobalDataProvider } from '@/contexts/GlobalDataContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import InitialLoadingScreen from '@/components/common/InitialLoadingScreen';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appIsReady, setAppIsReady] = useState(false);
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    console.log('App initialization started');
    
    async function prepare() {
      try {
        // Simulate minimum loading time for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('App preparation complete');
      } catch (e) {
        console.warn('Error during app preparation:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    if (loaded) {
      prepare();
    }
  }, [loaded]);

  useEffect(() => {
    if (loaded && appIsReady) {
      console.log('Hiding splash screen');
      SplashScreen.hideAsync();
    }
  }, [loaded, appIsReady]);

  if (!loaded || !appIsReady) {
    return <InitialLoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <ModeProvider>
            <FilterProvider>
              <FavoritesProvider>
                <AvatarProvider>
                  <ImpersonationProvider>
                    <PostsProvider>
                      <GlobalDataProvider>
                        <Stack>
                          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                          <Stack.Screen name="+not-found" />
                        </Stack>
                        <StatusBar style="auto" />
                      </GlobalDataProvider>
                    </PostsProvider>
                  </ImpersonationProvider>
                </AvatarProvider>
              </FavoritesProvider>
            </FilterProvider>
          </ModeProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
