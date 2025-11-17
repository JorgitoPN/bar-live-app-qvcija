
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, usePathname } from 'expo-router';
import { useMode } from '@/contexts/ModeContext';
import { useAuth } from '@/contexts/AuthContext';
import Svg, { Path } from 'react-native-svg';

// ✅ VERSION MARKER - Force cache bust: v3.0.0 - MAJOR UPDATE
const COMPONENT_VERSION = '3.0.0';

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
  const { currentMode, activeProfileType, activeProfileId, activeLocalData } = useMode();
  const { user } = useAuth();
  const navigationInProgress = useRef(false);
  const lastNavigationTime = useRef(0);

  useEffect(() => {
    console.log(`⚡⚡⚡ FloatingTabBar v${COMPONENT_VERSION} MOUNTED ⚡⚡⚡`);
    console.log('📍 Current pathname:', pathname);
    console.log('🎯 Current mode:', currentMode);
    console.log('👤 Active profile type:', activeProfileType);
    console.log('🆔 Active profile ID:', activeProfileId);
    console.log('📋 Tabs:', tabs.map(t => `${t.name}(${t.icon})`).join(', '));
  }, [pathname, tabs, currentMode, activeProfileType, activeProfileId]);

  const isActive = (route: string) => {
    try {
      const cleanRoute = route.startsWith('/') ? route.substring(1) : route;
      const cleanPathname = pathname.startsWith('/') ? pathname.substring(1) : pathname;
      
      console.log('🔍 [isActive] Checking:', {
        route: cleanRoute,
        pathname: cleanPathname,
        currentMode,
        activeProfileType
      });
      
      // ✅ CRITICAL FIX: Special handling for gestion routes
      // When viewing perfil/local in propietario mode, the gestion tab should be active
      if (cleanRoute === '(tabs)/gestion') {
        const isGestionActive = cleanPathname === '(tabs)/gestion' || 
               cleanPathname === '(tabs)/gestion/' || 
               cleanPathname === '(tabs)/gestion/index' ||
               cleanPathname.startsWith('gestion/') ||
               cleanPathname === 'gestion' ||
               // ✅ CRITICAL FIX: Match perfil/local when in propietario mode viewing own local
               (cleanPathname.startsWith('perfil/local') && currentMode === 'propietario' && activeProfileType === 'local');
        
        console.log('🏢 [isActive] Gestion check:', isGestionActive ? '✅ ACTIVE' : '❌ INACTIVE');
        return isGestionActive;
      }
      
      // Special handling for perfil routes - match ALL profile screens EXCEPT when in propietario mode on perfil/local
      if (cleanRoute === '(tabs)/perfil') {
        const isProfileActive = (cleanPathname === '(tabs)/perfil' || 
               cleanPathname === '(tabs)/perfil/' || 
               cleanPathname === '(tabs)/perfil/index' ||
               cleanPathname.startsWith('perfil/usuario') ||
               (cleanPathname.startsWith('perfil/') && !cleanPathname.startsWith('perfil/local')) ||
               (cleanPathname === 'perfil' && currentMode !== 'propietario')) &&
               // ✅ CRITICAL FIX: Don't match perfil/local when in propietario mode
               !(cleanPathname.startsWith('perfil/local') && currentMode === 'propietario' && activeProfileType === 'local');
        
        console.log('👤 [isActive] Profile check:', isProfileActive ? '✅ ACTIVE' : '❌ INACTIVE');
        return isProfileActive;
      }
      
      // Default: match by route prefix
      const isDefaultActive = cleanPathname.startsWith(cleanRoute);
      console.log('📍 [isActive] Default check:', isDefaultActive ? '✅ ACTIVE' : '❌ INACTIVE');
      
      return isDefaultActive;
    } catch (error) {
      console.error('❌ Error checking active route:', error);
      return false;
    }
  };

  const getActiveAvatar = () => {
    if (activeProfileType === 'local' && activeLocalData) {
      console.log('🏢 Using local avatar:', activeLocalData.nombre);
      return activeLocalData.imagen_url;
    } else if (user) {
      console.log('👤 Using user avatar:', user.nombre);
      return user.avatar;
    }
    console.log('⚠️ No avatar available');
    return null;
  };

  const activeAvatar = getActiveAvatar();

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
        {tabs.map((tab) => {
          const isCenter = tab.name === 'explorar';
          const active = isActive(tab.route);

          // ✅ CRITICAL: Log active state for each tab
          console.log(`🎯 Tab "${tab.name}" (${tab.icon}):`, active ? '✅ ACTIVE' : '❌ INACTIVE');

          const onPress = () => {
            const now = Date.now();
            
            if (now - lastNavigationTime.current < 50) {
              console.log('⚠️ Tap too fast, ignoring');
              return;
            }

            console.log('⚡ NAVIGATING to:', tab.name, tab.route, 'from:', pathname);
            lastNavigationTime.current = now;

            try {
              if (tab.name === 'perfil') {
                console.log('🔍 Perfil tab pressed, currentMode:', currentMode, 'activeProfileType:', activeProfileType);
                
                if (currentMode === 'propietario' && activeProfileType === 'local' && activeProfileId) {
                  console.log('✅ Navigating to local profile:', activeProfileId);
                  router.push(`/perfil/local?localId=${activeProfileId}` as any);
                } else {
                  console.log('✅ Navigating to user profile');
                  router.push(tab.route as any);
                }
              } else {
                router.push(tab.route as any);
              }
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
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab.label}
              >
                <LinearGradient
                  colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.centerGradient}
                >
                  <IconSymbol name={tab.icon as any} size={32} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            );
          }

          if (tab.name === 'perfil') {
            return (
              <TouchableOpacity
                key={tab.name}
                onPress={onPress}
                style={styles.tab}
                activeOpacity={0.5}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab.label}
              >
                <View style={styles.tabContent}>
                  <View style={active ? styles.activeIconContainer : styles.inactiveIconContainer}>
                    {activeAvatar ? (
                      <Image 
                        source={{ uri: activeAvatar }} 
                        style={[
                          styles.profileAvatar,
                          active && styles.profileAvatarActive
                        ]} 
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[
                        styles.profileAvatar,
                        styles.profileAvatarPlaceholder,
                        active && styles.profileAvatarActive
                      ]}>
                        <IconSymbol
                          name={activeProfileType === 'local' ? 'building.2' : 'person.fill'}
                          size={18}
                          color={active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)'}
                        />
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }

          // ✅ CRITICAL FIX: Regular icons with PURE WHITE (#FFFFFF) when active
          // The color is passed directly to IconSymbol with NO opacity style applied
          const iconColor = active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)';
          
          console.log(`🎨 Rendering icon "${tab.icon}" with color:`, iconColor, active ? '(ACTIVE - PURE WHITE)' : '(INACTIVE)');

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={onPress}
              style={styles.tab}
              activeOpacity={0.5}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
            >
              <View style={[styles.tabContent, active && styles.tabContentActive]}>
                <View style={active ? styles.activeIconContainer : styles.inactiveIconContainer}>
                  <IconSymbol
                    name={tab.icon as any}
                    size={32}
                    color={iconColor}
                  />
                </View>
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
    paddingVertical: 8,
    borderRadius: 16,
  },
  tabContentActive: {
    backgroundColor: 'transparent',
  },
  // ✅ CRITICAL FIX: Enhanced active icon container with STRONG white glow effect
  activeIconContainer: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 16,
  },
  inactiveIconContainer: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
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
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileAvatarActive: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileAvatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
