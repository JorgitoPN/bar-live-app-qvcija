
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { useColorScheme } from 'react-native';
import { AuthProvider } from '@/contexts/AuthContext';
import { ModeProvider } from '@/contexts/ModeContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
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
        <ModeProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth/login-popup" options={{ presentation: 'modal' }} />
            <Stack.Screen name="auth/bienvenida" options={{ headerShown: false }} />
            <Stack.Screen name="auth/bienvenida-propietario" options={{ headerShown: false }} />
            <Stack.Screen name="auth/completar-perfil" options={{ headerShown: false }} />
            <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
            <Stack.Screen name="crear/publicacion" options={{ presentation: 'modal' }} />
            <Stack.Screen name="crear/historia" options={{ presentation: 'modal' }} />
            <Stack.Screen name="crear/local" options={{ presentation: 'modal' }} />
            <Stack.Screen name="crear/evento" options={{ presentation: 'modal' }} />
            <Stack.Screen name="crear/oferta-trabajo" options={{ presentation: 'modal' }} />
            <Stack.Screen name="crear/perfil-profesional" options={{ presentation: 'modal' }} />
            <Stack.Screen name="detalle/local" options={{ presentation: 'modal' }} />
            <Stack.Screen name="detalle/local-updated" options={{ presentation: 'modal' }} />
            <Stack.Screen name="detalle/evento" options={{ presentation: 'modal' }} />
            <Stack.Screen name="detalle/sala-virtual" options={{ presentation: 'modal' }} />
            <Stack.Screen name="editar/perfil" options={{ presentation: 'modal' }} />
            <Stack.Screen name="social/amigos" options={{ presentation: 'modal' }} />
            <Stack.Screen name="social/configuracion" options={{ presentation: 'modal' }} />
            <Stack.Screen name="social/favoritos" options={{ presentation: 'modal' }} />
            <Stack.Screen name="solicitudes/solicitar-rol-propietario" options={{ presentation: 'modal' }} />
            <Stack.Screen name="admin/importacion-osm" options={{ presentation: 'modal' }} />
            <Stack.Screen name="admin/enriquecimiento-google" options={{ presentation: 'modal' }} />
            <Stack.Screen name="admin/control-costes-api" options={{ presentation: 'modal' }} />
            <Stack.Screen name="admin/gestionar-locales" options={{ presentation: 'modal' }} />
            <Stack.Screen name="admin/gestionar-usuarios" options={{ presentation: 'modal' }} />
            <Stack.Screen name="admin/vision-finanzas" options={{ presentation: 'modal' }} />
            <Stack.Screen name="admin/configuracion-general" options={{ presentation: 'modal' }} />
            <Stack.Screen name="admin/configuracion-supabase" options={{ presentation: 'modal' }} />
            <Stack.Screen name="admin/datos-maestros" options={{ presentation: 'modal' }} />
            <Stack.Screen name="admin/sincronizacion" options={{ presentation: 'modal' }} />
            <Stack.Screen name="admin/backups" options={{ presentation: 'modal' }} />
            <Stack.Screen name="admin/contenido-legal" options={{ presentation: 'modal' }} />
            <Stack.Screen name="admin/gestion-emails" options={{ presentation: 'modal' }} />
            <Stack.Screen name="admin/probar-emails" options={{ presentation: 'modal' }} />
            <Stack.Screen name="admin/solicitudes-propietario" options={{ presentation: 'modal' }} />
            <Stack.Screen name="admin/ver-ficha" options={{ presentation: 'modal' }} />
            <Stack.Screen name="admin/importacion-masiva" options={{ presentation: 'modal' }} />
            <Stack.Screen name="admin/navegacion-paginas" options={{ presentation: 'modal' }} />
            <Stack.Screen name="gestion/mis-locales" options={{ presentation: 'modal' }} />
            <Stack.Screen name="gestion/planes-suscripcion" options={{ presentation: 'modal' }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </ModeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
