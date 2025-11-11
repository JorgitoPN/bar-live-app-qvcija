
import React, { useEffect } from 'react';
import { Dimensions, Alert, InteractionManager } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';

const { width: screenWidth } = Dimensions.get('window');

export default function TabLayout() {
  const { user } = useAuth();
  const { currentMode } = useMode();
  const router = useRouter();
  const pathname = usePathname();

  // Determine user's actual role from database
  const userRole = user?.rol_app || 'cliente';

  console.log('[TabLayout] ⚡ User role:', userRole, 'Current mode:', currentMode, 'Pathname:', pathname);

  // Prevent access to admin pages for non-admin users
  useEffect(() => {
    // Only check if user is logged in and pathname exists
    if (!user || !pathname) return;
    
    // Only check if user is NOT an admin
    if (userRole !== 'admin') {
      // Check if user is trying to access admin routes
      // Must start with /(tabs)/admin to avoid false positives
      if (pathname.startsWith('/(tabs)/admin') || pathname.startsWith('/admin')) {
        console.log('[TabLayout] ⚠️ Non-admin user trying to access admin page, redirecting...');
        
        // Use setTimeout to avoid multiple alerts
        setTimeout(() => {
          Alert.alert(
            'Acceso Denegado',
            'No tienes permisos para acceder a esta sección.',
            [{ text: 'OK', onPress: () => router.replace('/(tabs)/explorar') }]
          );
        }, 100);
      }
    }
  }, [user, userRole, pathname, router]);

  // Prevent access to gestion pages for non-propietario users
  useEffect(() => {
    // Only check if user is logged in and pathname exists
    if (!user || !pathname) return;
    
    // Only check if user is NOT a propietario or admin
    if (userRole !== 'propietario' && userRole !== 'admin') {
      // Check if user is trying to access gestion routes
      // Must start with /(tabs)/gestion to avoid false positives
      if (pathname.startsWith('/(tabs)/gestion') || pathname.startsWith('/gestion')) {
        console.log('[TabLayout] ⚠️ Non-propietario user trying to access gestion page, redirecting...');
        
        // Use setTimeout to avoid multiple alerts
        setTimeout(() => {
          Alert.alert(
            'Acceso Denegado',
            'No tienes permisos para acceder a esta sección.',
            [{ text: 'OK', onPress: () => router.replace('/(tabs)/explorar') }]
          );
        }, 100);
      }
    }
  }, [user, userRole, pathname, router]);

  // Define tabs based on user role and current mode
  const getTabsForRole = (): TabBarItem[] => {
    // Admin users see admin tabs when in admin mode (WITHOUT Eventos)
    if (userRole === 'admin' && currentMode === 'admin') {
      return [
        {
          name: 'admin',
          route: '/(tabs)/admin',
          icon: 'gear',
          label: 'Admin',
        },
        {
          name: 'explorar',
          route: '/(tabs)/explorar',
          icon: 'sparkles',
          label: 'Explorar',
        },
        {
          name: 'perfil',
          route: '/(tabs)/perfil',
          icon: 'person.fill',
          label: 'Perfil',
        },
      ];
    }

    // Admin users in propietario mode
    if (userRole === 'admin' && currentMode === 'propietario') {
      return [
        {
          name: 'gestion',
          route: '/(tabs)/gestion',
          icon: 'briefcase.fill',
          label: 'Gestión',
        },
        {
          name: 'empleo',
          route: '/(tabs)/empleo',
          icon: 'person.badge.plus',
          label: 'Empleo',
        },
        {
          name: 'explorar',
          route: '/(tabs)/explorar',
          icon: 'sparkles',
          label: 'Explorar',
        },
        {
          name: 'eventos',
          route: '/(tabs)/eventos',
          icon: 'calendar',
          label: 'Eventos',
        },
        {
          name: 'perfil',
          route: '/(tabs)/perfil',
          icon: 'person.fill',
          label: 'Perfil',
        },
      ];
    }

    // Propietario users can switch between cliente and propietario modes
    if (userRole === 'propietario') {
      if (currentMode === 'propietario') {
        return [
          {
            name: 'gestion',
            route: '/(tabs)/gestion',
            icon: 'briefcase.fill',
            label: 'Gestión',
          },
          {
            name: 'empleo',
            route: '/(tabs)/empleo',
            icon: 'person.badge.plus',
            label: 'Empleo',
          },
          {
            name: 'explorar',
            route: '/(tabs)/explorar',
            icon: 'sparkles',
            label: 'Explorar',
          },
          {
            name: 'eventos',
            route: '/(tabs)/eventos',
            icon: 'calendar',
            label: 'Eventos',
          },
          {
            name: 'perfil',
            route: '/(tabs)/perfil',
            icon: 'person.fill',
            label: 'Perfil',
          },
        ];
      } else {
        // Cliente mode for propietario
        return [
          {
            name: 'eventos',
            route: '/(tabs)/eventos',
            icon: 'calendar',
            label: 'Eventos',
          },
          {
            name: 'empleo',
            route: '/(tabs)/empleo',
            icon: 'person.badge.plus',
            label: 'Empleo',
          },
          {
            name: 'explorar',
            route: '/(tabs)/explorar',
            icon: 'sparkles',
            label: 'Explorar',
          },
          {
            name: 'social',
            route: '/(tabs)/social',
            icon: 'heart.fill',
            label: 'Social',
          },
          {
            name: 'perfil',
            route: '/(tabs)/perfil',
            icon: 'person.fill',
            label: 'Perfil',
          },
        ];
      }
    }

    // Cliente users see cliente tabs (default)
    // Also used for admin in cliente mode
    return [
      {
        name: 'eventos',
        route: '/(tabs)/eventos',
        icon: 'calendar',
        label: 'Eventos',
      },
      {
        name: 'empleo',
        route: '/(tabs)/empleo',
        icon: 'person.badge.plus',
        label: 'Empleo',
      },
      {
        name: 'explorar',
        route: '/(tabs)/explorar',
        icon: 'sparkles',
        label: 'Explorar',
      },
      {
        name: 'social',
        route: '/(tabs)/social',
        icon: 'heart.fill',
        label: 'Social',
      },
      {
        name: 'perfil',
        route: '/(tabs)/perfil',
        icon: 'person.fill',
        label: 'Perfil',
      },
    ];
  };

  const tabs = getTabsForRole();
  console.log('[TabLayout] ⚡ Rendering tabs:', tabs.map(t => t.name));

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
          name="empleo" 
          options={{ 
            href: '/(tabs)/empleo',
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
            href: userRole === 'admin' ? '/(tabs)/admin' : null,
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
          name="profile" 
          options={{ 
            href: null,
          }} 
        />
      </Tabs>
      
      {/* ⚡ Floating Tab Bar - Optimized for instant navigation */}
      <FloatingTabBar 
        tabs={tabs} 
        containerWidth={screenWidth} 
        key={`${userRole}-${currentMode}`} 
      />
    </>
  );
}
