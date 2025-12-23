
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';

// ✅ CRITICAL: Only this email can access admin panel
const ADMIN_EMAIL = 'jorgepereznoyagh@gmail.com';

export default function AdminLayout() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [permissionChecked, setPermissionChecked] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      console.log('[AdminLayout] 🔍 Checking admin access...');
      
      // Wait for auth to finish loading
      if (authLoading) {
        console.log('[AdminLayout] ⏳ Waiting for auth to load...');
        return;
      }

      // If no user, redirect to login
      if (!user) {
        console.error('[AdminLayout] ❌ No user found, redirecting to login');
        Alert.alert(
          'Sesión Requerida',
          'Debes iniciar sesión para acceder al panel de administración',
          [{ text: 'OK', onPress: () => router.replace('/auth/login') }]
        );
        return;
      }

      // ✅ CRITICAL FIX: Check BOTH role AND email address
      const isAdmin = user.rol_app === 'admin';
      const isAuthorizedEmail = user.email === ADMIN_EMAIL;

      console.log('[AdminLayout] 📋 Permission check:', {
        email: user.email,
        role: user.rol_app,
        isAdmin,
        isAuthorizedEmail,
        hasAccess: isAdmin && isAuthorizedEmail,
      });

      // User must have admin role AND be the authorized email
      if (!isAdmin || !isAuthorizedEmail) {
        console.error('[AdminLayout] ❌ Access denied:', {
          reason: !isAdmin ? 'Not admin role' : 'Not authorized email',
          userEmail: user.email,
          userRole: user.rol_app,
        });
        
        Alert.alert(
          'Acceso Denegado',
          'No tienes permisos para acceder al panel de administración',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)/(home)' as any) }]
        );
        return;
      }

      console.log('[AdminLayout] ✅ Admin access granted for:', user.email);
      setPermissionChecked(true);
    };

    checkAdminAccess();
  }, [user, authLoading, router]);

  // Show loading while checking permissions
  if (authLoading || !permissionChecked) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.text }}>Verificando permisos de administrador...</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        animationDuration: 0,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
