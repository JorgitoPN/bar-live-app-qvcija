
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Stack, useRouter, Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { ADMIN_EMAILS } from '@/utils/adminAccess';

export default function AdminLayout() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      console.log('[AdminLayout] 🔍 Checking admin access...');
      
      // Wait for auth to finish loading
      if (authLoading) {
        console.log('[AdminLayout] ⏳ Waiting for auth to load...');
        return;
      }

      // If no user, silently redirect to home
      if (!user) {
        console.log('[AdminLayout] ❌ No user found, redirecting silently');
        setPermissionChecked(true);
        setHasAccess(false);
        return;
      }

      // ✅ CRITICAL FIX: Check BOTH role AND email address
      const isAdmin = user.rol_app === 'admin';
      const isAuthorizedEmail = ADMIN_EMAILS.includes(user.email || '');

      console.log('[AdminLayout] 📋 Permission check:', {
        email: user.email,
        role: user.rol_app,
        isAdmin,
        isAuthorizedEmail,
        hasAccess: isAdmin && isAuthorizedEmail,
        authorizedEmails: ADMIN_EMAILS,
      });

      // User must have admin role AND be one of the authorized emails
      if (!isAdmin || !isAuthorizedEmail) {
        console.log('[AdminLayout] ❌ Access denied - redirecting silently');
        setPermissionChecked(true);
        setHasAccess(false);
        return;
      }

      console.log('[AdminLayout] ✅ Admin access granted for:', user.email);
      setPermissionChecked(true);
      setHasAccess(true);
    };

    checkAdminAccess();
  }, [user, authLoading, router]);

  // Show loading while checking permissions
  if (authLoading || !permissionChecked) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.text }}>Cargando...</Text>
      </View>
    );
  }

  // Silently redirect non-admin users without showing any error
  if (!hasAccess) {
    return <Redirect href="/(tabs)/explorar" />;
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
