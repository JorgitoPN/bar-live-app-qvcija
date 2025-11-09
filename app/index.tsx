
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [forceRedirect, setForceRedirect] = useState(false);

  useEffect(() => {
    console.log('[Index] Estado de autenticación:', { user: user?.email, loading });
    
    // Force redirect after 3 seconds if still loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('[Index] Timeout alcanzado - forzando redirección');
        setForceRedirect(true);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [user, loading]);

  // Force redirect if timeout reached
  if (forceRedirect) {
    console.log('[Index] Redirección forzada a explorar');
    return <Redirect href="/(tabs)/explorar" />;
  }

  // Show loading while checking authentication
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.text, fontSize: 16 }}>
          Iniciando BarLive...
        </Text>
      </View>
    );
  }

  // Always redirect to explorar (home page with list of locales)
  // Users can access most features without authentication
  console.log('[Index] Redirigiendo a explorar (página principal)');
  return <Redirect href="/(tabs)/explorar" />;
}
