
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, Platform } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';

/**
 * ✅ INDEX SCREEN v69.0 - iOS EXPO GO FIX
 * 
 * CRITICAL FIXES v69.0:
 * - ✅ iOS: Prevents modal menu by ensuring proper initialization
 * - ✅ Waits for auth to be ready before redirecting
 * - ✅ Password recovery handling maintained for web
 * - ✅ Prevents navigation loops
 */

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log('[Index v69.0] 🏠 Estado:', { 
      hasUser: !!user, 
      userEmail: user?.email,
      loading,
      hasRedirected,
      isReady,
      platform: Platform.OS
    });

    // Wait for auth to be ready
    if (!loading && !isReady) {
      setIsReady(true);
    }

    // Prevent redirect loops
    if (hasRedirected) {
      console.log('[Index v69.0] ⚠️ Already redirected, skipping');
      return;
    }

    // Only check for password recovery on web
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        
        if (type === 'recovery' && accessToken) {
          console.log('[Index v69.0] 🔐 Password recovery detected, redirecting...');
          setHasRedirected(true);
          setTimeout(() => {
            router.replace('/auth/restablecer-password');
          }, 100);
          return;
        }
      }
    }
  }, [user, loading, router, hasRedirected, isReady]);

  // Show loading while auth is initializing
  if (loading || !isReady) {
    console.log('[Index v69.0] ⏳ Cargando...');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.text, fontSize: 16 }}>Cargando...</Text>
      </View>
    );
  }

  // ✅ CRITICAL FIX v69.0: Redirect to (tabs)/explorar after auth is ready
  console.log('[Index v69.0] 🚀 Redirigiendo a (tabs)/explorar');
  
  // Mark as redirected to prevent loops
  if (!hasRedirected) {
    setHasRedirected(true);
  }
  
  return <Redirect href="/(tabs)/explorar" />;
}
