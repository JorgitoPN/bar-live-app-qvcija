
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, usePathname } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useMode } from '@/contexts/ModeContext';
import { useAuth } from '@/contexts/AuthContext';

export interface TabBarItem {
  name: string;
  route: string;
  icon: string;
  label: string;
}

interface FloatingTabBarProps {
  tabs: TabBarItem[];
  containerWidth?: number;
}

export default function FloatingTabBar({ tabs, containerWidth }: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentMode } = useMode();
  const { user } = useAuth();
  const navigationInProgress = useRef(false);
  const lastNavigationTime = useRef(0);

  const userRole = user?.rol_app || 'cliente';
  const isPropietarioMode = currentMode === 'propietario' || (userRole === 'admin' && currentMode === 'propietario');

  useEffect(() => {
    console.log('⚡ FloatingTabBar mounted, pathname:', pathname);
  }, [pathname]);

  const isActive = (route: string) => {
    try {
      const cleanRoute = route.startsWith('/') ? route.substring(1) : route;
      const cleanPathname = pathname.startsWith('/') ? pathname.substring(1) : pathname;
      
      if (cleanRoute === '(tabs)/perfil') {
        return cleanPathname === '(tabs)/perfil' || 
               cleanPathname === '(tabs)/perfil/' || 
               cleanPathname === '(tabs)/perfil/index';
      }
      
      return cleanPathname.startsWith(cleanRoute);
    } catch (error) {
      console.error('Error checking active route:', error);
      return false;
    }
  };

  // FIXED: Dynamic tabs based on mode - Remove Events icon in owner mode
  const getDisplayTabs = () => {
    if (isPropietarioMode) {
      // Owner mode: Remove Events, add Social before Perfil
      return tabs
        .filter(tab => tab.name !== 'eventos') // Remove Events icon
        .map(tab => {
          // Replace Favoritos with Eventos in the same position
          if (tab.name === 'favoritos') {
            return {
              name: 'eventos',
              route: '/(tabs)/eventos',
              icon: 'calendar',
              label: 'Eventos',
            };
          }
          return tab;
        });
    }
    return tabs;
  };

  const displayTabs = getDisplayTabs();

  // Add Social tab before Perfil in propietario mode
  const finalTabs = isPropietarioMode 
    ? [
        ...displayTabs.filter(t => t.name !== 'perfil'),
        {
          name: 'social',
          route: '/(tabs)/social',
          icon: 'person.2',
          label: 'Social',
        },
        ...displayTabs.filter(t => t.name === 'perfil'),
      ]
    : displayTabs;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.svgContainer} pointerEvents="none">
        <Svg
          width="100%"
          height="80"
          viewBox="0 0 375 80"
          preserveAspectRatio="none"
          style={styles.svg}
        >
          <Path
            d="M0,0 H375 V80 H0 Z"
            fill={colors.primary}
          />
        </Svg>
      </View>

      <View style={[styles.tabBar, containerWidth && { width: containerWidth }]} pointerEvents="box-none">
        {finalTabs.map((tab) => {
          const isCenter = tab.name === 'explorar';
          const active = isActive(tab.route);

          const onPress = () => {
            const now = Date.now();
            
            if (now - lastNavigationTime.current < 50) {
              console.log('⚠️ Tap too fast, ignoring');
              return;
            }

            if (active) {
              console.log('✅ Already on route:', tab.name);
              return;
            }

            console.log('⚡ INSTANT NAV to:', tab.name, tab.route);
            lastNavigationTime.current = now;

            try {
              router.push(tab.route as any);
            } catch (error) {
              console.error('❌ Navigation error:', error);
            }
          };

          if (isCenter) {
            return (
              <TouchableOpacity
                key={tab.name}
                onPress={onPress}
                style={styles.centerButton}
                activeOpacity={0.6}
              >
                <LinearGradient
                  colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.centerGradient}
                >
                  <IconSymbol name={tab.icon as any} size={30} color={colors.white} />
                </LinearGradient>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={onPress}
              style={styles.tab}
              activeOpacity={0.5}
            >
              <View style={[styles.tabContent, active && styles.tabContentActive]}>
                {/* FIXED: Active icons have bright white with 90% opacity, inactive have 60% opacity */}
                <IconSymbol
                  name={tab.icon as any}
                  size={26}
                  color={active ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)'}
                  weight={active ? 'fill' : 'regular'}
                />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'transparent',
  },
  svgContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  svg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBar: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
    zIndex: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  tabContentActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  tabLabelActive: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '900',
  },
  centerButton: {
    width: 64,
    height: 64,
    marginTop: -32,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  centerGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.white,
  },
});
