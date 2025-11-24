
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';

export default function Index() {
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log('[Index] 🏠 Estado:', { 
      hasUser: !!user, 
      userEmail: user?.email,
      loading 
    });
  }, [user, loading]);

  // Show loading while auth is initializing
  if (loading) {
    console.log('[Index] ⏳ Cargando autenticación...');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.text }}>Cargando...</Text>
      </View>
    );
  }

  // Always redirect to explorar
  // The app will handle authentication state internally
  console.log('[Index] 🚀 Redirigiendo a explorar');
  return <Redirect href="/(tabs)/explorar" />;
}
