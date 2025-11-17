
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, usePathname } from 'expo-router';
import { useMode } from '@/contexts/ModeContext';
import { useAuth } from '@/contexts/AuthContext';
import Svg, { Path } from 'react-native-svg';

// ✅ VERSION MARKER - Force cache bust: v2.0.1
const COMPONENT_VERSION = '2.0.1';

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
    console.log(`⚡ FloatingTabBar v${COMPONENT_VERSION} mounted, pathname:`, pathname);
    console.log('⚡ FloatingTabBar tabs:', tabs.map(t => ({ name: t.name, icon: t.icon })));
  }, [pathname, tabs]);

  useEffect(() => {
    console.log('[FloatingTabBar] 📊 Active profile changed:', {
      activeProfileType,
      activeProfileId,
      activeLocalName: activeLocalData?.nombre,
      userAvatar: user?.avatar,
    });
  }, [activeProfileType, activeProfileId, activeLocalData, user]);

  const isActive = (route: string) => {
    try {
      const cleanRoute = route.startsWith('/') ? route.substring(1) : route;
      const cleanPathname = pathname.startsWith('/') ? pathname.substring(1) : pathname;
      
      console.log('[FloatingTabBar] 🔍 Checking if active:', {
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
        
        if (isGestionActive) {
          console.log('[FloatingTabBar] ✅ Gestion tab is ACTIVE - pathname:', cleanPathname, 'mode:', currentMode, 'profileType:', activeProfileType);
        }
        
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
        
        if (isProfileActive) {
          console.log('[FloatingTabBar] ✅ Profile tab is ACTIVE - pathname:', cleanPathname);
        }
        
        return isProfileActive;
      }
      
      // Default: match by route prefix
      const isDefaultActive = cleanPathname.startsWith(cleanRoute);
      
      if (isDefaultActive) {
        console.log('[FloatingTabBar] ✅ Tab is ACTIVE (default match) - route:', cleanRoute);
      }
      
      return isDefaultActive;
    } catch (error) {
      console.error('Error checking active route:', error);
      return false;
    }
  };

  const getActiveAvatar = () => {
    if (activeProfileType === 'local' && activeLocalData) {
      console.log('[FloatingTabBar] 🏢 Using local avatar:', activeLocalData.nombre, activeLocalData.imagen_url);
      return activeLocalData.imagen_url;
    } else if (user) {
      console.log('[FloatingTabBar] 👤 Using user avatar:', user.nombre, user.avatar);
      return user.avatar;
    }
    console.log('[FloatingTabBar] ⚠️ No avatar available');
    return null;
  };

  const activeAvatar = getActiveAvatar();

  useEffect(() => {
    console.log('[FloatingTabBar] 🖼️ Active avatar updated:', activeAvatar);
  }, [activeAvatar]);

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

          const onPress = () => {
            const now = Date.now();
            
            if (now - lastNavigationTime.current < 50) {
              console.log('⚠️ Tap too fast, ignoring');
              return;
            }

            // ✅ CRITICAL FIX: Remove the "already on route" check that was preventing navigation
            // This was causing the gestion icon to be unclickable when on perfil/local
            console.log('⚡ NAVIGATING to:', tab.name, tab.route, 'from:', pathname);
            lastNavigationTime.current = now;

            try {
              if (tab.name === 'perfil') {
                console.log('[FloatingTabBar] 🔍 Perfil tab pressed, currentMode:', currentMode, 'activeProfileType:', activeProfileType, 'activeProfileId:', activeProfileId);
                
                if (currentMode === 'propietario' && activeProfileType === 'local' && activeProfileId) {
                  console.log('[FloatingTabBar] ✅ Navigating to local profile:', activeProfileId);
                  router.push(`/perfil/local?localId=${activeProfileId}` as any);
                } else {
                  console.log('[FloatingTabBar] ✅ Navigating to user profile');
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
            if (active) {
              console.log('[FloatingTabBar] 🎨 Rendering profile avatar WITH active state - active:', active, 'avatar:', activeAvatar);
            }
            
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

          // ✅ CRITICAL FIX: Regular icons with PURE WHITE when active
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
                    color={active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'}
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
