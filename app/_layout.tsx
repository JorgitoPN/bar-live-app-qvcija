
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { useColorScheme, View, ActivityIndicator } from 'react-native';
import { AuthProvider } from '@/contexts/AuthContext';
import { ModeProvider } from '@/contexts/ModeContext';
import { GlobalDataProvider } from '@/contexts/GlobalDataContext';
import { SelectedLocalProvider } from '@/contexts/SelectedLocalContext';
import { colors } from '@/styles/commonStyles';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      // Hide splash screen after fonts are loaded
      // GlobalDataProvider will handle data loading
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <SelectedLocalProvider>
          <ModeProvider>
            <GlobalDataProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'none', // Instant navigation - no animations
                  animationDuration: 0,
                }}
              >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="auth/login-popup" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="auth/bienvenida" options={{ headerShown: false }} />
                <Stack.Screen name="auth/bienvenida-propietario" options={{ headerShown: false }} />
                <Stack.Screen name="auth/completar-perfil" options={{ headerShown: false }} />
                <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
                <Stack.Screen name="crear/publicacion" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="crear/historia" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="crear/local" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="crear/evento" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="crear/oferta-trabajo" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="crear/perfil-profesional" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="detalle/local" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="detalle/local-updated" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="detalle/evento" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="detalle/sala-virtual" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="editar/perfil" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="social/amigos" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="social/configuracion" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="social/favoritos" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="social/post" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="perfil/usuario" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="perfil/seguidores" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="perfil/seguidos" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="solicitudes/solicitar-rol-propietario" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="admin/importacion-osm" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="admin/enriquecimiento-google" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="admin/control-costes-api" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="admin/gestionar-locales" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="admin/gestionar-usuarios" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="admin/vision-finanzas" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="admin/configuracion-general" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="admin/configuracion-supabase" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="admin/datos-maestros" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="admin/sincronizacion" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="admin/backups" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="admin/contenido-legal" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="admin/gestion-emails" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="admin/probar-emails" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="admin/solicitudes-propietario" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="admin/ver-ficha" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="admin/importacion-masiva" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="admin/navegacion-paginas" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="gestion/mis-locales" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="gestion/planes-suscripcion" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </GlobalDataProvider>
          </ModeProvider>
        </SelectedLocalProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
