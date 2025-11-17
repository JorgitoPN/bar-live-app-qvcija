
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, usePathname } from 'expo-router';
import { useMode } from '@/contexts/ModeContext';
import { useAuth } from '@/contexts/AuthContext';
import Svg, { Path } from 'react-native-svg';

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
    console.log('⚡ FloatingTabBar mounted, pathname:', pathname);
  }, [pathname]);

  // 🆕 FIX: Log when active profile changes to ensure reactivity
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
      
      if (cleanRoute === '(tabs)/perfil') {
        return cleanPathname === '(tabs)/perfil' || 
               cleanPathname === '(tabs)/perfil/' || 
               cleanPathname === '(tabs)/perfil/index' ||
               cleanPathname.startsWith('perfil/local');
      }
      
      return cleanPathname.startsWith(cleanRoute);
    } catch (error) {
      console.error('Error checking active route:', error);
      return false;
    }
  };

  // 🆕 FEATURE 2: Get the avatar for the currently active profile
  // This function now properly returns the correct avatar based on activeProfileType
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

  // 🆕 FIX: Recalculate avatar whenever dependencies change
  const activeAvatar = getActiveAvatar();

  // 🆕 FIX: Log avatar changes for debugging
  useEffect(() => {
    console.log('[FloatingTabBar] 🖼️ Active avatar updated:', activeAvatar);
  }, [activeAvatar]);

  // Check if profile tab is active
  const isProfileActive = isActive('(tabs)/perfil');

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

            if (active) {
              console.log('✅ Already on route:', tab.name);
              return;
            }

            console.log('⚡ INSTANT NAV to:', tab.name, tab.route);
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
              >
                <LinearGradient
                  colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.centerGradient}
                >
                  <IconSymbol name={tab.icon as any} size={32} color={colors.white} />
                </LinearGradient>
              </TouchableOpacity>
            );
          }

          // 🆕 FEATURE 2: For profile tab, show the active profile avatar (user or local)
          // 🔧 FIX: Avatar contour now shows on ALL tabs when profile is active (not just on profile tab)
          if (tab.name === 'perfil') {
            return (
              <TouchableOpacity
                key={tab.name}
                onPress={onPress}
                style={styles.tab}
                activeOpacity={0.5}
              >
                <View style={styles.tabContent}>
                  {activeAvatar ? (
                    <Image 
                      source={{ uri: activeAvatar }} 
                      style={[
                        styles.profileAvatar,
                        isProfileActive && styles.profileAvatarWithContour
                      ]} 
                    />
                  ) : (
                    <View style={[
                      styles.profileAvatar,
                      styles.profileAvatarPlaceholder,
                      isProfileActive && styles.profileAvatarWithContour
                    ]}>
                      <IconSymbol
                        name={activeProfileType === 'local' ? 'building.2' : 'person.fill'}
                        size={18}
                        color="#FFFFFF"
                      />
                    </View>
                  )}
                </View>
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
                <IconSymbol
                  name={tab.icon as any}
                  size={32}
                  color={active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)'}
                  weight={active ? 'fill' : 'regular'}
                />
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
  },
  // 🔧 FIXED: Contour now shows on ALL tabs when profile is active
  // Using the exact same white color (#FFFFFF) as active icons for consistency
  profileAvatarWithContour: {
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 4,
  },
  profileAvatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
