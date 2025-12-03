
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, Platform } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checkingRecovery, setCheckingRecovery] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    console.log('[Index] 🏠 Estado:', { 
      hasUser: !!user, 
      userEmail: user?.email,
      loading 
    });

    // Check for password recovery token in URL hash (web only)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = window.location.hash;
      console.log('[Index] 🔍 Checking URL hash:', hash);
      
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        
        console.log('[Index] 📋 Hash params:', {
          type,
          hasAccessToken: !!accessToken,
        });
        
        // If this is a password recovery link, redirect to password reset screen
        if (type === 'recovery' && accessToken) {
          console.log('[Index] 🔐 Password recovery detected, redirecting to reset screen...');
          setIsRecovery(true);
          setCheckingRecovery(false);
          
          // Use setTimeout to ensure the redirect happens after render
          setTimeout(() => {
            router.replace('/auth/restablecer-password');
          }, 100);
          return;
        }
      }
    }
    
    setCheckingRecovery(false);
  }, [user, loading, router]);

  // Show loading while checking for recovery or auth is initializing
  if (loading || checkingRecovery) {
    console.log('[Index] ⏳ Cargando...');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.text }}>Cargando...</Text>
      </View>
    );
  }

  // If this is a recovery flow, don't redirect yet (let useEffect handle it)
  if (isRecovery) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.text }}>Redirigiendo a restablecer contraseña...</Text>
      </View>
    );
  }

  // Always redirect to explorar
  // The app will handle authentication state internally
  console.log('[Index] 🚀 Redirigiendo a explorar');
  return <Redirect href="/(tabs)/explorar" />;
}
