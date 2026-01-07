
import React, { useEffect, useRef } from 'react';
import { Dimensions, Alert } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import FloatingTabBar from '@/components/FloatingTabBar';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';

const { width: screenWidth } = Dimensions.get('window');

export default function TabLayout() {
  const { user } = useAuth();
  const { currentMode } = useMode();
  const router = useRouter();
  const pathname = usePathname();
  
  // ✅ FIXED: Track if we've already shown the alert to prevent duplicates
  const hasShownAdminAlert = useRef(false);
  const hasShownGestionAlert = useRef(false);

  // Determine user's actual role from database
  const userRole = user?.rol_app || 'cliente';

  console.log('[TabLayout] ⚡ User role:', userRole, 'Current mode:', currentMode, 'Pathname:', pathname);

  // ✅ FIXED: Prevent access to admin pages for non-admin users (silently redirect)
  useEffect(() => {
    // Only check if user is logged in and pathname exists
    if (!user || !pathname) {
      hasShownAdminAlert.current = false;
      return;
    }
    
    // ✅ CRITICAL: Check if user is the authorized admin email
    const ADMIN_EMAIL = 'jorgepereznoyagh@gmail.com';
    const isAuthorizedAdmin = userRole === 'admin' && user.email === ADMIN_EMAIL;
    
    // Only check if user is NOT the authorized admin
    if (!isAuthorizedAdmin) {
      // ✅ FIXED: More specific check - only trigger for actual admin pages
      const isAdminIndexPage = pathname === '/(tabs)/admin' || pathname === '/(tabs)/admin/';
      const isAdminSubPage = pathname.startsWith('/(tabs)/admin/') || pathname.startsWith('/admin/');
      
      if ((isAdminIndexPage || isAdminSubPage) && !hasShownAdminAlert.current) {
        console.log('[TabLayout] ⚠️ Unauthorized user trying to access admin page:', pathname);
        hasShownAdminAlert.current = true;
        
        // Silently redirect without showing error message
        router.replace('/(tabs)/explorar');
        
        // Reset flag after redirect
        setTimeout(() => {
          hasShownAdminAlert.current = false;
        }, 500);
      }
    } else {
      // Reset flag when user is authorized admin
      hasShownAdminAlert.current = false;
    }
  }, [user, userRole, pathname, router]);

  // ✅ FIXED: Prevent access to gestion pages for non-propietario users (more specific check)
  useEffect(() => {
    // Only check if user is logged in and pathname exists
    if (!user || !pathname) {
      hasShownGestionAlert.current = false;
      return;
    }
    
    // Only check if user is NOT a propietario or admin
    if (userRole !== 'propietario' && userRole !== 'admin') {
      // ✅ FIXED: More specific check - only trigger for actual gestion pages
      const isGestionIndexPage = pathname === '/(tabs)/gestion' || pathname === '/(tabs)/gestion/';
      const isGestionSubPage = pathname.startsWith('/(tabs)/gestion/') || pathname.startsWith('/gestion/');
      
      if ((isGestionIndexPage || isGestionSubPage) && !hasShownGestionAlert.current) {
        console.log('[TabLayout] ⚠️ Non-propietario user trying to access gestion page:', pathname);
        hasShownGestionAlert.current = true;
        
        // Use setTimeout to avoid multiple alerts
        setTimeout(() => {
          Alert.alert(
            'Acceso Denegado',
            'No tienes permisos para acceder a esta sección.',
            [{ 
              text: 'OK', 
              onPress: () => {
                router.replace('/(tabs)/explorar');
                hasShownGestionAlert.current = false;
              }
            }]
          );
        }, 100);
      }
    } else {
      // Reset flag when user is propietario or admin
      hasShownGestionAlert.current = false;
    }
  }, [user, userRole, pathname, router]);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
          animation: 'none',
          animationDuration: 0,
          lazy: false,
        }}
      >
        <Tabs.Screen 
          name="explorar" 
          options={{ 
            href: '/(tabs)/explorar',
            animation: 'none',
            animationDuration: 0,
            lazy: false,
          }} 
        />
        <Tabs.Screen 
          name="eventos" 
          options={{ 
            href: '/(tabs)/eventos',
            animation: 'none',
            animationDuration: 0,
            lazy: false,
          }} 
        />
        <Tabs.Screen 
          name="favoritos" 
          options={{ 
            href: '/(tabs)/favoritos',
            animation: 'none',
            animationDuration: 0,
            lazy: false,
          }} 
        />
        <Tabs.Screen 
          name="social" 
          options={{ 
            href: '/(tabs)/social',
            animation: 'none',
            animationDuration: 0,
            lazy: false,
          }} 
        />
        <Tabs.Screen 
          name="perfil" 
          options={{ 
            href: '/(tabs)/perfil',
            animation: 'none',
            animationDuration: 0,
            lazy: false,
          }} 
        />
        <Tabs.Screen 
          name="gestion" 
          options={{ 
            href: userRole === 'propietario' || userRole === 'admin' ? '/(tabs)/gestion' : null,
            animation: 'none',
            animationDuration: 0,
            lazy: false,
          }} 
        />
        <Tabs.Screen 
          name="admin" 
          options={{ 
            href: (userRole === 'admin' && user?.email === 'jorgepereznoyagh@gmail.com') ? '/(tabs)/admin' : null,
            animation: 'none',
            animationDuration: 0,
            lazy: false,
          }} 
        />
        <Tabs.Screen 
          name="(home)" 
          options={{ 
            href: null,
          }} 
        />
        <Tabs.Screen 
          name="empleo" 
          options={{ 
            href: null,
          }} 
        />
      </Tabs>
      
      {/* ⚡ Floating Tab Bar - Optimized for instant navigation */}
      <FloatingTabBar 
        containerWidth={screenWidth} 
        key={`${userRole}-${currentMode}`} 
      />
    </>
  );
}
