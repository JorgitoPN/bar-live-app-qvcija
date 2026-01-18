
import React, { useEffect, Component, ReactNode } from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';
import { AvatarProvider } from '@/contexts/AvatarContext';
import { ImpersonationProvider } from '@/contexts/ImpersonationContext';
import { ModeProvider } from '@/contexts/ModeContext';
import { SelectedLocalProvider } from '@/contexts/SelectedLocalContext';
import { GlobalDataProvider } from '@/contexts/GlobalDataContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { PostsProvider } from '@/contexts/PostsContext';
import { FilterProvider } from '@/contexts/FilterContext';
import { colors } from '@/styles/commonStyles';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, View, Text, TouchableOpacity } from 'react-native';
import { initializeAndroidBehavior } from '@/utils/androidNativeBehavior';

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ErrorBoundary] App crashed:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 20 }}>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
            Oops! Algo salió mal
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 16, textAlign: 'center', marginBottom: 24 }}>
            La aplicación encontró un error inesperado.
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24, fontFamily: 'monospace' }}>
            {this.state.error?.message || 'Error desconocido'}
          </Text>
          <TouchableOpacity
            onPress={() => {
              this.setState({ hasError: false, error: null });
            }}
            style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

// Prevent auto-hiding splash screen
SplashScreen.preventAutoHideAsync().catch(() => {
  // Silently ignore if already hidden
});

/**
 * ROOT LAYOUT v143.0 - OPTIMIZED FOR FAST STARTUP
 * 
 * OPTIMIZATIONS v143.0:
 * - ✅ Disabled errorLogger temporarily (was blocking startup with fetch calls)
 * - ✅ Simplified splash screen hiding (immediate)
 * - ✅ Reduced console.log calls
 * - ✅ Optimized context providers loading
 */

export default function RootLayout() {
  useEffect(() => {
    // Minimal logging for faster startup
    console.log('[RootLayout] Starting app...');
    
    // Initialize Android-specific behavior
    let cleanupAndroid: (() => void) | undefined;
    
    if (Platform.OS === 'android') {
      try {
        cleanupAndroid = initializeAndroidBehavior();
      } catch (error) {
        console.error('[RootLayout] Android init error:', error);
      }
    }

    // Hide splash screen immediately for faster perceived startup
    SplashScreen.hideAsync().catch(() => {
      // Silently ignore errors
    });

    // Cleanup function
    return () => {
      if (cleanupAndroid) {
        try {
          cleanupAndroid();
        } catch (error) {
          // Silently ignore cleanup errors
        }
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <AvatarProvider>
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
                            {/* Main app routes */}
                            <Stack.Screen name="index" options={{ headerShown: false }} />
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
          </AvatarProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
