
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

  // Always redirect to explorar immediately
  // This is the main landing page of the app
  console.log('[Index] 🚀 Redirigiendo a explorar');
  return <Redirect href="/(tabs)/explorar" />;
}
