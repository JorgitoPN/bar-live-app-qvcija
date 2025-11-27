
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { logger } from '@/utils/logger';

export default function Index() {
  const { user, loading } = useAuth();

  useEffect(() => {
    logger.debug('[Index] Estado:', { 
      hasUser: !!user, 
      userEmail: user?.email,
      loading 
    });
  }, [user, loading]);

  // Show loading while auth is initializing
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.text }}>Cargando...</Text>
      </View>
    );
  }

  // Always redirect to explorar
  logger.debug('[Index] Redirigiendo a explorar');
  return <Redirect href="/(tabs)/explorar" />;
}
