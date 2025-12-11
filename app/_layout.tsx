
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { useColorScheme } from 'react-native';
import { AuthProvider } from '@/contexts/AuthContext';
import { GlobalDataProvider } from '@/contexts/GlobalDataContext';
import { ModeProvider } from '@/contexts/ModeContext';
import { SelectedLocalProvider } from '@/contexts/SelectedLocalContext';
import { WidgetProvider } from '@/contexts/WidgetContext';
import { StoryProvider } from '@/contexts/StoryContext';
import { StoryStateProvider } from '@/contexts/StoryStateContextV11';

SplashScreen.preventAutoHideAsync();

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
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <GlobalDataProvider>
          <ModeProvider>
            <SelectedLocalProvider>
              <WidgetProvider>
                <StoryProvider>
                  <StoryStateProvider>
                    <Stack>
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                      <Stack.Screen name="auth" options={{ headerShown: false }} />
                      <Stack.Screen name="admin" options={{ headerShown: false }} />
                      <Stack.Screen name="crear" options={{ headerShown: false }} />
                      <Stack.Screen name="detalle" options={{ headerShown: false }} />
                      <Stack.Screen name="editar" options={{ headerShown: false }} />
                      <Stack.Screen name="empleo" options={{ headerShown: false }} />
                      <Stack.Screen name="gestion" options={{ headerShown: false }} />
                      <Stack.Screen name="legal" options={{ headerShown: false }} />
                      <Stack.Screen name="perfil" options={{ headerShown: false }} />
                      <Stack.Screen name="social" options={{ headerShown: false }} />
                      <Stack.Screen name="solicitudes" options={{ headerShown: false }} />
                      <Stack.Screen name="soporte" options={{ headerShown: false }} />
                      <Stack.Screen name="chat" options={{ headerShown: false }} />
                      <Stack.Screen name="+not-found" />
                    </Stack>
                    <StatusBar style="auto" />
                  </StoryStateProvider>
                </StoryProvider>
              </WidgetProvider>
            </SelectedLocalProvider>
          </ModeProvider>
        </GlobalDataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
