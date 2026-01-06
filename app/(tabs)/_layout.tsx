
import React, { useEffect, useRef } from 'react';
import { Dimensions, Alert } from 'react-native';
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
  
  const hasShownAdminAlert = useRef(false);
  const hasShownGestionAlert = useRef(false);

  const userRole = user?.rol_app || 'cliente';

  console.log('[TabLayout] ⚡ User role:', userRole, 'Current mode:', currentMode, 'Pathname:', pathname);

  useEffect(() => {
    if (!user || !pathname) {
      hasShownAdminAlert.current = false;
      return;
    }
    
    const ADMIN_EMAIL = 'jorgepereznoyagh@gmail.com';
    const isAuthorizedAdmin = userRole === 'admin' && user.email === ADMIN_EMAIL;
    
    if (!isAuthorizedAdmin) {
      const isAdminIndexPage = pathname === '/(tabs)/admin' || pathname === '/(tabs)/admin/';
      const isAdminSubPage = pathname.startsWith('/(tabs)/admin/') || pathname.startsWith('/admin/');
      
      if ((isAdminIndexPage || isAdminSubPage) && !hasShownAdminAlert.current) {
        console.log('[TabLayout] ⚠️ Unauthorized user trying to access admin page:', pathname);
        hasShownAdminAlert.current = true;
        
        router.replace('/(tabs)/explorar');
        
        setTimeout(() => {
          hasShownAdminAlert.current = false;
        }, 500);
      }
    } else {
      hasShownAdminAlert.current = false;
    }
  }, [user, userRole, pathname, router]);

  useEffect(() => {
    if (!user || !pathname) {
      hasShownGestionAlert.current = false;
      return;
    }
    
    if (userRole !== 'propietario' && userRole !== 'admin') {
      const isGestionIndexPage = pathname === '/(tabs)/gestion' || pathname === '/(tabs)/gestion/';
      const isGestionSubPage = pathname.startsWith('/(tabs)/gestion/') || pathname.startsWith('/gestion/');
      
      if ((isGestionIndexPage || isGestionSubPage) && !hasShownGestionAlert.current) {
        console.log('[TabLayout] ⚠️ Non-propietario user trying to access gestion page:', pathname);
        hasShownGestionAlert.current = true;
        
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
      hasShownGestionAlert.current = false;
    }
  }, [user, userRole, pathname, router]);

  const getTabsForRole = (): TabBarItem[] => {
    const ADMIN_EMAIL = 'jorgepereznoyagh@gmail.com';
    const isAuthorizedAdmin = userRole === 'admin' && user?.email === ADMIN_EMAIL;
    
    if (isAuthorizedAdmin && currentMode === 'admin') {
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

    if (isAuthorizedAdmin && currentMode === 'propietario') {
      return [
        {
          name: 'gestion',
          route: '/(tabs)/gestion',
          icon: 'briefcase.fill',
          label: 'Gestión',
        },
        {
          name: 'favoritos',
          route: '/(tabs)/favoritos',
          icon: 'heart.fill',
          label: 'Favoritos',
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
          icon: 'person.2.fill',
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
            name: 'favoritos',
            route: '/(tabs)/favoritos',
            icon: 'heart.fill',
            label: 'Favoritos',
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
            icon: 'person.2.fill',
            label: 'Social',
          },
          {
            name: 'perfil',
            route: '/(tabs)/perfil',
            icon: 'person.fill',
            label: 'Perfil',
          },
        ];
      } else {
        return [
          {
            name: 'eventos',
            route: '/(tabs)/eventos',
            icon: 'calendar',
            label: 'Eventos',
          },
          {
            name: 'favoritos',
            route: '/(tabs)/favoritos',
            icon: 'heart.fill',
            label: 'Favoritos',
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
            icon: 'person.2.fill',
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

    return [
      {
        name: 'eventos',
        route: '/(tabs)/eventos',
        icon: 'calendar',
        label: 'Eventos',
      },
      {
        name: 'favoritos',
        route: '/(tabs)/favoritos',
        icon: 'heart.fill',
        label: 'Favoritos',
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
        icon: 'person.2.fill',
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
          // ✅ FIX v103.0: Remove white strip above tab bar
          tabBarStyle: { 
            display: 'none',
            borderTopWidth: 0,
            elevation: 0,
          },
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
      
      <FloatingTabBar 
        tabs={tabs} 
        containerWidth={screenWidth} 
        key={`${userRole}-${currentMode}`} 
      />
    </>
  );
}
