
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
  console.log('[RootLayout] Splash screen already hidden');
});

/**
 * ROOT LAYOUT v327.0 - FULL SCREEN MODAL FIX FOR EDIT PAGES
 * 
 * NEW CHANGES v327.0:
 * - ✅ FIXED: "Editar descripción" and "Gestionar etiquetas" now use fullScreenModal
 * - ✅ FIXED: Edit pages no longer get covered by the post viewer
 * - ✅ FIXED: Pages open completely on top with proper z-index
 * - ✅ IMPROVED: Seamless editing experience without visual glitches
 * 
 * Previous changes v325.0:
 * - ✅ FIXED: "Nuevo momento" (crear/publicacion) now opens as fullScreen, not modal
 * - ✅ FIXED: Modal pages (editar-descripcion, gestionar-etiquetas) properly stack above PostViewerModal
 * - ✅ IMPROVED: Post viewer stays open in background when editing/managing tags
 * 
 * Previous changes v322.0:
 * - ✅ Changed "Editar descripción" and "Gestionar etiquetas" to use presentation: 'modal'
 * - ✅ These pages now open as modals ABOVE the post viewer, keeping it open in background
 * - ✅ Proper modal behavior: post stays visible underneath
 * - ✅ Closing these modals returns to the post viewer
 */

export default function RootLayout() {
  useEffect(() => {
    console.log('[RootLayout v325.0] 🚀 App starting...');
    console.log('[RootLayout v325.0] 📱 Platform:', Platform.OS);
    
    // ✅ CRITICAL FIX v25.0: Initialize Android-specific behavior
    let cleanupAndroid: (() => void) | undefined;
    
    if (Platform.OS === 'android') {
      console.log('[RootLayout v325.0] 🤖 Initializing Android native behavior...');
      try {
        cleanupAndroid = initializeAndroidBehavior();
      } catch (error) {
        console.error('[RootLayout] Error initializing Android behavior:', error);
      }
    }

    // Hide splash screen
    const timer = setTimeout(() => {
      console.log('[RootLayout v325.0] 🎨 Hiding splash screen...');
      SplashScreen.hideAsync()
        .then(() => {
          console.log('[RootLayout v325.0] ✅ Splash screen hidden');
        })
        .catch((error) => {
          console.error('[RootLayout] Error hiding splash screen:', error);
        });
    }, 100);

    // Cleanup function
    return () => {
      clearTimeout(timer);
      if (cleanupAndroid) {
        try {
          cleanupAndroid();
        } catch (error) {
          console.error('[RootLayout] Error cleaning up Android behavior:', error);
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
                            
                            {/* ✅ v325.0: "Nuevo momento" opens as fullScreen, not modal */}
                            <Stack.Screen 
                              name="crear/publicacion" 
                              options={{ 
                                presentation: 'fullScreenModal',
                                headerShown: false,
                                animation: 'slide_from_bottom',
                              }} 
                            />
                            
                            <Stack.Screen name="detalle" options={{ headerShown: false }} />
                            <Stack.Screen name="editar" options={{ headerShown: false }} />
                            <Stack.Screen name="perfil" options={{ headerShown: false }} />
                            <Stack.Screen name="social" options={{ headerShown: false }} />
                            
                            {/* ✅ v327.0: FULL SCREEN MODAL - Pages open COMPLETELY ABOVE post viewer */}
                            <Stack.Screen 
                              name="social/gestionar-etiquetas" 
                              options={{ 
                                presentation: 'fullScreenModal',
                                headerShown: false,
                                animation: 'slide_from_bottom',
                              }} 
                            />
                            <Stack.Screen 
                              name="social/editar-descripcion" 
                              options={{ 
                                presentation: 'fullScreenModal',
                                headerShown: false,
                                animation: 'slide_from_bottom',
                              }} 
                            />
                            <Stack.Screen 
                              name="social/comentarios" 
                              options={{ 
                                presentation: 'modal',
                                headerShown: false,
                                animation: 'slide_from_bottom',
                              }} 
                            />
                            <Stack.Screen 
                              name="social/likes" 
                              options={{ 
                                presentation: 'modal',
                                headerShown: false,
                                animation: 'slide_from_bottom',
                              }} 
                            />
                            <Stack.Screen 
                              name="editar/publicacion" 
                              options={{ 
                                presentation: 'card',
                                headerShown: false,
                                animation: 'slide_from_right',
                              }} 
                            />
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
