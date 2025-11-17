
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
      
      console.log('[FloatingTabBar] 🔍 Checking if active:', {
        route: cleanRoute,
        pathname: cleanPathname,
        currentMode,
        activeProfileType
      });
      
      // Special handling for perfil routes - match ALL profile screens
      if (cleanRoute === '(tabs)/perfil') {
        const isProfileActive = cleanPathname === '(tabs)/perfil' || 
               cleanPathname === '(tabs)/perfil/' || 
               cleanPathname === '(tabs)/perfil/index' ||
               cleanPathname.startsWith('perfil/usuario') ||
               // ✅ CRITICAL FIX: Don't match perfil/local when in propietario mode
               (cleanPathname.startsWith('perfil/local') && currentMode !== 'propietario') ||
               (cleanPathname.startsWith('perfil/') && !cleanPathname.startsWith('perfil/local')) ||
               (cleanPathname === 'perfil' && currentMode !== 'propietario');
        
        if (isProfileActive) {
          console.log('[FloatingTabBar] ✅ Profile tab is ACTIVE - pathname:', cleanPathname);
        }
        
        return isProfileActive;
      }

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
                  <IconSymbol name={tab.icon as any} size={32} color="#FFFFFF" style={styles.iconBase} />
                </LinearGradient>
              </TouchableOpacity>
            );
          }

          // ✅ UNIFIED BEHAVIOR: Profile tab now uses the SAME active state styling as other icons
          // When active: Pure white border + white glow effect (matching other active icons)
          // When inactive: Semi-transparent appearance (matching other inactive icons)
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
                // @ts-expect-error - aria attributes for web accessibility
                aria-pressed={active}
                aria-current={active ? 'page' : undefined}
              >
                <View style={styles.tabContent}>
                  {/* ✅ CRITICAL FIX: Wrap avatar in active/inactive container for consistent glow effect */}
                  <View style={active ? styles.activeIconContainer : styles.inactiveIconContainer}>
                    {activeAvatar ? (
                      <Image 
                        source={{ uri: activeAvatar }} 
                        style={[
                          styles.profileAvatar,
                          // ✅ FIX: Reduced border width from 4 to 2 for thinner border when active
                          active && styles.profileAvatarActive
                        ]} 
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[
                        styles.profileAvatar,
                        styles.profileAvatarPlaceholder,
                        // ✅ FIX: Reduced border width from 4 to 2 for thinner border when active
                        active && styles.profileAvatarActive
                      ]}>
                        <IconSymbol
                          name={activeProfileType === 'local' ? 'building.2' : 'person.fill'}
                          size={18}
                          // ✅ UNIFIED: Icon inside avatar uses same color logic as other icons
                          color={active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)'}
                          style={styles.iconBase}
                        />
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }

          // ✅ CRITICAL FIX: Regular icons with PURE WHITE when active
          // Active icons: Pure white (#FFFFFF) with 100% opacity + strong glow effect
          // Inactive icons: Semi-transparent white (rgba(255, 255, 255, 0.4)) for maximum contrast
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={onPress}
              style={styles.tab}
              activeOpacity={0.5}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
              // @ts-expect-error - aria attributes for web accessibility
              aria-pressed={active}
              aria-current={active ? 'page' : undefined}
            >
              <View style={[styles.tabContent, active && styles.tabContentActive]}>
                <View style={active ? styles.activeIconContainer : styles.inactiveIconContainer}>
                  <IconSymbol
                    name={tab.icon as any}
                    size={32}
                    // ✅ CRITICAL FIX: Pure white (#FFFFFF) when active, semi-transparent when inactive
                    color={active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)'}
                    style={styles.iconBase}
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
  // ✅ UNIFIED: Active icon container with STRONG white glow effect
  // Applied to BOTH regular icons AND profile avatar for consistent behavior
  activeIconContainer: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  // ✅ UNIFIED: Inactive icon container with no effects
  // Applied to BOTH regular icons AND profile avatar for consistent behavior
  inactiveIconContainer: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  // ✅ CRITICAL FIX: Base icon style with 100% opacity
  // This ensures icons are always fully opaque, with transparency handled by color value
  iconBase: {
    opacity: 1,
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
  // ✅ FIX: Reduced border width from 4 to 2 for thinner border when active
  // Profile avatar active state with PURE WHITE border and NO opacity interference
  // Matches the behavior of regular active icons (pure white #FFFFFF)
  profileAvatarActive: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    // Note: Shadow/glow is applied by the parent activeIconContainer
  },
  profileAvatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
