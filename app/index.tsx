
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';

/**
 * ✅ INDEX SCREEN v70.0 - iOS EXPO GO CRITICAL FIX
 * 
 * CRITICAL FIXES v70.0:
 * - ✅ iOS: Simplified initialization to prevent modal menu
 * - ✅ Immediate redirect to explorar after minimal auth check
 * - ✅ Removed complex state management that was causing issues
 * - ✅ Password recovery handling maintained for web
 */

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('[Index v70.0] 🏠 Estado:', { 
      hasUser: !!user, 
      userEmail: user?.email,
      loading,
      platform: Platform.OS
    });

    // Only check for password recovery on web
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        
        if (type === 'recovery' && accessToken) {
          console.log('[Index v70.0] 🔐 Password recovery detected, redirecting...');
          router.replace('/auth/restablecer-password');
          return;
        }
      }
    }
  }, [user, loading, router]);

  // ✅ CRITICAL FIX v70.0: Show minimal loading only during initial auth check
  if (loading) {
    console.log('[Index v70.0] ⏳ Cargando autenticación...');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ✅ CRITICAL FIX v70.0: Redirect immediately after auth is ready
  console.log('[Index v70.0] 🚀 Redirigiendo a explorar');
  return <Redirect href="/(tabs)/explorar" />;
}
