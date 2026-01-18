
import React, { useEffect, Component, ReactNode, useState } from 'react';
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
import { Platform, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
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
 * ROOT LAYOUT v144.0 - ULTRA-FAST STARTUP WITH VISUAL FEEDBACK
 * 
 * OPTIMIZATIONS v144.0:
 * - ✅ Immediate visual feedback on mount
 * - ✅ Splash screen hidden instantly
 * - ✅ Minimal initialization blocking
 * - ✅ Better console logging for debugging preview issues
 * - ✅ Loading indicator shows immediately in preview
 */

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log('[RootLayout] ========================================');
    console.log('[RootLayout] App starting - Platform:', Platform.OS);
    console.log('[RootLayout] ========================================');
    
    // Initialize app
    const initializeApp = async () => {
      try {
        // Hide splash screen IMMEDIATELY for instant visual feedback
        await SplashScreen.hideAsync();
        console.log('[RootLayout] ✅ Splash screen hidden successfully');
      } catch (error) {
        console.log('[RootLayout] ⚠️ Splash screen already hidden');
      }

      // Initialize Android-specific behavior (non-blocking)
      if (Platform.OS === 'android') {
        try {
          initializeAndroidBehavior();
          console.log('[RootLayout] ✅ Android behavior initialized');
        } catch (error) {
          console.error('[RootLayout] ❌ Android init error:', error);
        }
      }

      console.log('[RootLayout] ✅ App ready - rendering UI');
      setIsReady(true);
    };

    initializeApp();
  }, []);

  // Show immediate loading screen while initializing
  if (!isReady) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: colors.background 
      }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ 
          color: colors.text, 
          marginTop: 16, 
          fontSize: 18,
          fontWeight: '600'
        }}>
          BarLive
        </Text>
        <Text style={{ 
          color: colors.textSecondary, 
          marginTop: 8, 
          fontSize: 14 
        }}>
          Cargando aplicación...
        </Text>
      </View>
    );
  }

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
