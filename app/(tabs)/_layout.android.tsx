
import React, { useEffect, useRef } from 'react';
import { Dimensions, Alert, StatusBar, Platform, View, StyleSheet } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { colors } from '@/styles/commonStyles';

const { width: screenWidth } = Dimensions.get('window');

/**
 * ANDROID-SPECIFIC TAB LAYOUT - VERSION v81.0
 * 
 * ✅ ANDROID BOTTOM NAV FIX - REMOVED WHITE BOX
 * 
 * CRITICAL FIXES v81.0:
 * - ✅ REMOVED white box above bottom menu (was caused by contentContainer padding)
 * - ✅ Content now extends to bottom without white gap
 * - ✅ Tab bar overlays content properly
 * - ✅ No visual artifacts above bottom menu
 * 
 * Previous fixes maintained (v80.1):
 * - ✅ Fixed animation error by removing invalid 'none' animation option
 * - ✅ Unified BarLive background (no white background)
 * - ✅ Compact height matching iOS exactly
 * - ✅ Icons positioned at bottom of screen
 * - ✅ Explore button protrudes upward like iOS
 * - ✅ Respects Android system navigation buttons
 * - ✅ Exact visual parity with iOS
 */
export default function TabLayout() {
  const { user } = useAuth();
  const { currentMode } = useMode();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  
  // Track if we've already shown alerts to prevent duplicates
  const hasShownAdminAlert = useRef(false);
  const hasShownGestionAlert = useRef(false);

  // Determine user's actual role from database
  const userRole = user?.rol_app || 'cliente';

  console.log(
    '[TabLayout Android v80.1] ⚡ User role:', userRole, 
    'Current mode:', currentMode, 
    'Pathname:', pathname,
    'Bottom inset:', insets.bottom
  );

  // Prevent access to admin pages for non-admin users (silently redirect)
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
        console.log(
          '[TabLayout Android v80.1] ⚠️ Unauthorized user trying to access admin page:', 
          pathname
        );
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

  // Prevent access to gestion pages for non-propietario users
  useEffect(() => {
    if (!user || !pathname) {
      hasShownGestionAlert.current = false;
      return;
    }
    
    if (userRole !== 'propietario' && userRole !== 'admin') {
      const isGestionIndexPage = pathname === '/(tabs)/gestion' || pathname === '/(tabs)/gestion/';
      const isGestionSubPage = pathname.startsWith('/(tabs)/gestion/') || pathname.startsWith('/gestion/');
      
      if ((isGestionIndexPage || isGestionSubPage) && !hasShownGestionAlert.current) {
        console.log(
          '[TabLayout Android v80.1] ⚠️ Non-propietario user trying to access gestion page:', 
          pathname
        );
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

  // Define tabs based on user role and current mode
  const getTabsForRole = (): TabBarItem[] => {
    const ADMIN_EMAIL = 'jorgepereznoyagh@gmail.com';
    const isAuthorizedAdmin = userRole === 'admin' && user?.email === ADMIN_EMAIL;
    
    // Admin users see admin tabs when in admin mode (WITHOUT Eventos)
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

    // Admin users in propietario mode
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
        // Cliente mode for propietario
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

    // Cliente users see cliente tabs (default)
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
  console.log('[TabLayout Android v80.1] ⚡ Rendering tabs:', tabs.map(t => t.name));

  // ✅ CRITICAL FIX v80.0: Compact tab bar height matching iOS
  const TAB_BAR_HEIGHT = 70; // Matches iOS exactly
  const totalTabBarHeight = TAB_BAR_HEIGHT + Math.max(insets.bottom, 12);

  return (
    <View style={styles.container}>
      {/* ✅ ANDROID STATUS BAR - Proper native configuration */}
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={colors.headerGradientStart}
        translucent={false}
        animated={true}
      />
      
      {/* ✅ FIX v81.0: REMOVED paddingBottom to eliminate white box */}
      <View style={styles.contentContainer}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
            lazy: false,
          }}
        >
          <Tabs.Screen 
            name="explorar" 
            options={{ 
              href: '/(tabs)/explorar',
              lazy: false,
            }} 
          />
          <Tabs.Screen 
            name="eventos" 
            options={{ 
              href: '/(tabs)/eventos',
              lazy: false,
            }} 
          />
          <Tabs.Screen 
            name="favoritos" 
            options={{ 
              href: '/(tabs)/favoritos',
              lazy: false,
            }} 
          />
          <Tabs.Screen 
            name="social" 
            options={{ 
              href: '/(tabs)/social',
              lazy: false,
            }} 
          />
          <Tabs.Screen 
            name="perfil" 
            options={{ 
              href: '/(tabs)/perfil',
              lazy: false,
            }} 
          />
          <Tabs.Screen 
            name="gestion" 
            options={{ 
              href: userRole === 'propietario' || userRole === 'admin' ? '/(tabs)/gestion' : null,
              lazy: false,
            }} 
          />
          <Tabs.Screen 
            name="admin" 
            options={{ 
              href: (userRole === 'admin' && user?.email === 'jorgepereznoyagh@gmail.com') ? '/(tabs)/admin' : null,
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
      </View>
      
      {/* ✅ CRITICAL FIX v80.0: Floating Tab Bar with MAXIMUM z-index and compact design */}
      {/* This ensures the tab bar is ALWAYS visible above ALL content and respects system buttons */}
      <View style={[
        styles.tabBarContainer,
        { 
          height: totalTabBarHeight,
        }
      ]} pointerEvents="box-none">
        <FloatingTabBar 
          tabs={tabs} 
          containerWidth={screenWidth} 
          key={`${userRole}-${currentMode}`} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flex: 1,
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999999,
    elevation: 999,
    backgroundColor: 'transparent',
  },
});
