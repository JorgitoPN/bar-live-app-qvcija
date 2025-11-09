
import React, { useEffect } from 'react';
import { Dimensions, Alert } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';

const { width: screenWidth } = Dimensions.get('window');

export default function TabLayout() {
  const { user } = useAuth();
  const { currentMode } = useMode();
  const router = useRouter();

  // Determine user's actual role from database
  const userRole = user?.rol_app || 'cliente';

  console.log('[TabLayout] User role:', userRole, 'Current mode:', currentMode);

  // Prevent access to admin pages for non-admin users
  useEffect(() => {
    if (user && userRole !== 'admin') {
      // Check if user is trying to access admin routes
      const currentPath = router.pathname || '';
      if (currentPath.includes('/admin')) {
        console.log('[TabLayout] Non-admin user trying to access admin page, redirecting...');
        Alert.alert(
          'Acceso Denegado',
          'No tienes permisos para acceder a esta sección.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)/explorar') }]
        );
      }
    }
  }, [user, userRole, router]);

  // Prevent access to gestion pages for non-propietario users
  useEffect(() => {
    if (user && userRole !== 'propietario' && userRole !== 'admin') {
      const currentPath = router.pathname || '';
      if (currentPath.includes('/gestion')) {
        console.log('[TabLayout] Non-propietario user trying to access gestion page, redirecting...');
        Alert.alert(
          'Acceso Denegado',
          'No tienes permisos para acceder a esta sección.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)/explorar') }]
        );
      }
    }
  }, [user, userRole, router]);

  // Define tabs based on user role and current mode
  const getTabsForRole = (): TabBarItem[] => {
    // Admin users see admin tabs when in admin mode (WITHOUT Eventos)
    if (userRole === 'admin' && currentMode === 'admin') {
      return [
        {
          name: 'admin',
          route: '/admin',
          icon: 'gear',
          label: 'Admin',
        },
        {
          name: 'explorar',
          route: '/explorar',
          icon: 'sparkles',
          label: 'Explorar',
        },
        {
          name: 'perfil',
          route: '/perfil',
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
          route: '/gestion',
          icon: 'briefcase.fill',
          label: 'Gestión',
        },
        {
          name: 'empleo',
          route: '/empleo',
          icon: 'person.badge.plus',
          label: 'Empleo',
        },
        {
          name: 'explorar',
          route: '/explorar',
          icon: 'sparkles',
          label: 'Explorar',
        },
        {
          name: 'eventos',
          route: '/eventos',
          icon: 'calendar',
          label: 'Eventos',
        },
        {
          name: 'perfil',
          route: '/perfil',
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
            route: '/gestion',
            icon: 'briefcase.fill',
            label: 'Gestión',
          },
          {
            name: 'empleo',
            route: '/empleo',
            icon: 'person.badge.plus',
            label: 'Empleo',
          },
          {
            name: 'explorar',
            route: '/explorar',
            icon: 'sparkles',
            label: 'Explorar',
          },
          {
            name: 'eventos',
            route: '/eventos',
            icon: 'calendar',
            label: 'Eventos',
          },
          {
            name: 'perfil',
            route: '/perfil',
            icon: 'person.fill',
            label: 'Perfil',
          },
        ];
      } else {
        // Cliente mode for propietario
        return [
          {
            name: 'eventos',
            route: '/eventos',
            icon: 'calendar',
            label: 'Eventos',
          },
          {
            name: 'empleo',
            route: '/empleo',
            icon: 'person.badge.plus',
            label: 'Empleo',
          },
          {
            name: 'explorar',
            route: '/explorar',
            icon: 'sparkles',
            label: 'Explorar',
          },
          {
            name: 'social',
            route: '/social',
            icon: 'heart.fill',
            label: 'Social',
          },
          {
            name: 'perfil',
            route: '/perfil',
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
        route: '/eventos',
        icon: 'calendar',
        label: 'Eventos',
      },
      {
        name: 'empleo',
        route: '/empleo',
        icon: 'person.badge.plus',
        label: 'Empleo',
      },
      {
        name: 'explorar',
        route: '/explorar',
        icon: 'sparkles',
        label: 'Explorar',
      },
      {
        name: 'social',
        route: '/social',
        icon: 'heart.fill',
        label: 'Social',
      },
      {
        name: 'perfil',
        route: '/perfil',
        icon: 'person.fill',
        label: 'Perfil',
      },
    ];
  };

  const tabs = getTabsForRole();
  console.log('[TabLayout] Rendering tabs:', tabs.map(t => t.name));

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen 
          name="explorar" 
          options={{ 
            href: '/explorar',
          }} 
        />
        <Tabs.Screen 
          name="eventos" 
          options={{ 
            href: '/eventos',
          }} 
        />
        <Tabs.Screen 
          name="empleo" 
          options={{ 
            href: '/empleo',
          }} 
        />
        <Tabs.Screen 
          name="social" 
          options={{ 
            href: '/social',
          }} 
        />
        <Tabs.Screen 
          name="perfil" 
          options={{ 
            href: '/perfil',
          }} 
        />
        <Tabs.Screen 
          name="gestion" 
          options={{ 
            href: userRole === 'propietario' || userRole === 'admin' ? '/gestion' : null,
          }} 
        />
        <Tabs.Screen 
          name="admin" 
          options={{ 
            href: userRole === 'admin' ? '/admin' : null,
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
      
      {/* Floating Tab Bar - key ensures it re-renders when mode changes */}
      <FloatingTabBar 
        tabs={tabs} 
        containerWidth={screenWidth} 
        key={`${userRole}-${currentMode}`} 
      />
    </>
  );
}
