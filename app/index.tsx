
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, Platform } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';

/**
 * ✅ INDEX SCREEN v68.0 - CRITICAL iOS EXPO GO FIX
 * 
 * CRITICAL FIXES v68.0:
 * - ✅ iOS Expo Go: COMPLETELY PREVENTS modal menu from showing
 * - ✅ Direct redirect to (tabs)/explorar without any conditions
 * - ✅ Password recovery handling maintained for web
 * - ✅ Prevents navigation loops
 * - ✅ Simplified logic to prevent any modal interference
 * - ✅ GUARANTEED: No modal screens will appear on iOS
 */

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    console.log('[Index v68.0] 🏠 Estado:', { 
      hasUser: !!user, 
      userEmail: user?.email,
      loading,
      hasRedirected,
      platform: Platform.OS
    });

    // Prevent redirect loops
    if (hasRedirected) {
      console.log('[Index v68.0] ⚠️ Already redirected, skipping');
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
          console.log('[Index v68.0] 🔐 Password recovery detected, redirecting...');
          setHasRedirected(true);
          setTimeout(() => {
            router.replace('/auth/restablecer-password');
          }, 100);
          return;
        }
      }
    }
  }, [user, loading, router, hasRedirected]);

  // Show loading only while auth is initializing
  if (loading) {
    console.log('[Index v68.0] ⏳ Cargando...');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.text, fontSize: Platform.OS === 'ios' ? 16 : 8 }}>Cargando...</Text>
      </View>
    );
  }

  // ✅ CRITICAL FIX v68.0: ALWAYS redirect to (tabs)/explorar - NO CONDITIONS
  // This is the ONLY way to prevent the modal menu from showing on iOS Expo Go
  console.log('[Index v68.0] 🚀 Redirigiendo directamente a (tabs)/explorar (sin condiciones)');
  
  // Mark as redirected to prevent loops
  if (!hasRedirected) {
    setHasRedirected(true);
  }
  
  return <Redirect href="/(tabs)/explorar" />;
}
