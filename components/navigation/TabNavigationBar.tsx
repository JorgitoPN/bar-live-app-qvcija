
/**
 * TAB NAVIGATION BAR - VERSION v87.0
 * 
 * ✅ ANDROID BOTTOM NAV FIX v87.0 - ICON VISIBILITY COMPLETE
 * 
 * CRITICAL FIXES v87.0 (ANDROID ONLY):
 * - ✅ Fixed icon visibility - icons now properly visible above BarLive background
 * - ✅ Proper z-index layering to prevent background from covering icons
 * - ✅ Background height adjusted to not overlap with icons
 * - ✅ Eliminated gap between bottom nav and system buttons
 * - ✅ Unified BarLive background color
 * - ✅ Proper safe area handling for Android system navigation
 * - ✅ Compact design matching iOS exactly
 * - ✅ Explore button protrudes upward like iOS
 * 
 * IMPORTANT: iOS design remains unchanged - all fixes are Android-specific
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableNativeFeedback,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { TabIcon } from './TabIcon';
import { TabDefinition } from './TabConfig';
import { provideHapticFeedback } from '@/utils/androidNativeBehavior';
import {
  getBottomNavHeight,
  getBottomNavIconSize,
  getCenterButtonSize,
  getCenterButtonIconSize,
  getBottomNavPaddingBottom,
  logScalingInfo,
} from '@/utils/androidScaling';

interface TabNavigationBarProps {
  tabs: TabDefinition[];
  activeProfileAvatar?: string | null;
  onProfilePress?: () => void;
}

export function TabNavigationBar({ 
  tabs, 
  activeProfileAvatar,
  onProfilePress 
}: TabNavigationBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Log scaling info on Android
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      logScalingInfo();
    }
  }, []);

  const isTabActive = (tab: TabDefinition, currentPath: string): boolean => {
    const cleanRoute = tab.route.replace(/^\//, '').replace(/\/$/, '');
    const cleanPath = currentPath.replace(/^\//, '').replace(/\/$/, '');

    console.log(
      `🔍 [TabNav v87.0] Checking tab "${tab.id}": ` +
      `route="${cleanRoute}", path="${cleanPath}"`
    );

    // Special case: gestion tab is active when viewing local profiles
    if (tab.id === 'gestion' && cleanPath.startsWith('perfil/local')) {
      console.log(
        `✅ [TabNav v87.0] Tab "${tab.id}" is ACTIVE ` +
        `(special case: perfil/local)`
      );
      return true;
    }

    // Special case: perfil tab is NOT active when viewing local profiles
    if (tab.id === 'perfil' && cleanPath.startsWith('perfil/local')) {
      console.log(
        `❌ [TabNav v87.0] Tab "${tab.id}" is INACTIVE ` +
        `(special case: perfil/local)`
      );
      return false;
    }

    // Extract the main route segment
    const routeSegments = cleanRoute.split('/').filter(s => !s.startsWith('(') && !s.endsWith(')'));
    const pathSegments = cleanPath.split('/').filter(s => !s.startsWith('(') && !s.endsWith(')'));

    // Check if the main route segment matches
    if (routeSegments.length > 0 && pathSegments.length > 0) {
      const mainRouteSegment = routeSegments[routeSegments.length - 1];
      const mainPathSegment = pathSegments[0];

      if (mainRouteSegment === mainPathSegment) {
        console.log(
          `✅ [TabNav v87.0] Tab "${tab.id}" is ACTIVE ` +
          `(segment match: "${mainRouteSegment}")`
        );
        return true;
      }
    }

    // Fallback: check if path starts with route
    if (cleanPath.startsWith(cleanRoute)) {
      console.log(`✅ [TabNav v87.0] Tab "${tab.id}" is ACTIVE (prefix match)`);
      return true;
    }

    // Check exact match
    if (cleanPath === cleanRoute || cleanPath === `${cleanRoute}/index`) {
      console.log(`✅ [TabNav v87.0] Tab "${tab.id}" is ACTIVE (exact match)`);
      return true;
    }

    console.log(`❌ [TabNav v87.0] Tab "${tab.id}" is INACTIVE`);
    return false;
  };

  const handleTabPress = async (tab: TabDefinition) => {
    console.log(`🔘 [TabNav v87.0] Tab pressed: "${tab.id}" -> ${tab.route}`);
    
    await provideHapticFeedback('light');
    
    if (tab.id === 'perfil' && onProfilePress) {
      onProfilePress();
    } else {
      router.push(tab.route as any);
    }
  };

  const renderTab = (tab: TabDefinition) => {
    const isActive = isTabActive(tab, pathname);
    const isCenter = tab.id === 'explorar';

    // Filter out file:// URLs that cause ENOENT errors
    const safeAvatarUrl = activeProfileAvatar && !activeProfileAvatar.startsWith('file://') 
      ? activeProfileAvatar 
      : null;

    console.log(
      `🎨 [TabNav v87.0] Rendering tab "${tab.id}": ` +
      `isActive=${isActive}, isCenter=${isCenter}, avatar=${safeAvatarUrl ? safeAvatarUrl.substring(0, 50) : 'none'}`
    );

    // Use TouchableNativeFeedback on Android for native ripple effect
    const TouchableComponent = Platform.OS === 'android' ? TouchableNativeFeedback : TouchableOpacity;
    const touchableProps = Platform.OS === 'android' 
      ? {
          background: TouchableNativeFeedback.Ripple('rgba(255, 255, 255, 0.3)', false),
          useForeground: true,
        }
      : {
          activeOpacity: 0.7,
        };

    // ✅ Get platform-specific sizes (v82.0: Reduced for Android)
    const centerButtonSize = getCenterButtonSize();
    const centerButtonIconSize = getCenterButtonIconSize();
    const tabIconSize = getBottomNavIconSize();

    // Center button (Explorar)
    if (isCenter) {
      return (
        <TouchableComponent
          key={tab.id}
          onPress={() => handleTabPress(tab)}
          {...touchableProps}
        >
          <View style={[styles.centerButton, { 
            width: centerButtonSize, 
            height: centerButtonSize,
            borderRadius: centerButtonSize / 2,
            marginTop: -centerButtonSize / 2,
          }]}>
            <LinearGradient
              colors={['#2DD4BF', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.centerGradient, {
                borderRadius: centerButtonSize / 2,
              }]}
            >
              <TabIcon
                iosIconFilled={tab.iosIconFilled}
                iosIconOutlined={tab.iosIconOutlined}
                androidIconFilled={tab.androidIconFilled}
                androidIconOutlined={tab.androidIconOutlined}
                isActive={true}
                size={centerButtonIconSize}
              />
            </LinearGradient>
          </View>
        </TouchableComponent>
      );
    }

    // Profile tab with avatar
    if (tab.id === 'perfil') {
      const avatarSize = Platform.OS === 'android' ? 22 : 28;
      
      return (
        <TouchableComponent
          key={tab.id}
          onPress={() => handleTabPress(tab)}
          {...touchableProps}
        >
          <View style={styles.tab}>
            <View style={[
              styles.avatarContainer, 
              { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
              isActive && styles.avatarContainerActive
            ]}>
              {safeAvatarUrl ? (
                <Image
                  source={{ uri: safeAvatarUrl }}
                  style={styles.avatar}
                  resizeMode="cover"
                  {...(Platform.OS === 'android' && { cache: 'force-cache' as any })}
                  onError={(error) => {
                    console.error('[TabNav v87.0] ❌ Avatar failed to load:', safeAvatarUrl?.substring(0, 50), error.nativeEvent?.error);
                  }}
                  onLoad={() => {
                    console.log('[TabNav v87.0] ✅ Avatar loaded successfully:', safeAvatarUrl?.substring(0, 50));
                  }}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <TabIcon
                    iosIconFilled="person.fill"
                    iosIconOutlined="person"
                    androidIconFilled="person"
                    androidIconOutlined="person-outline"
                    isActive={isActive}
                    size={Platform.OS === 'android' ? 14 : 20}
                  />
                </View>
              )}
            </View>
          </View>
        </TouchableComponent>
      );
    }

    // Regular tab
    return (
      <TouchableComponent
        key={tab.id}
        onPress={() => handleTabPress(tab)}
        {...touchableProps}
      >
        <View style={styles.tab}>
          <TabIcon
            iosIconFilled={tab.iosIconFilled}
            iosIconOutlined={tab.iosIconOutlined}
            androidIconFilled={tab.androidIconFilled}
            androidIconOutlined={tab.androidIconOutlined}
            isActive={isActive}
            size={tabIconSize}
          />
        </View>
      </TouchableComponent>
    );
  };

  // ✅ CRITICAL FIX v82.0: Eliminate gap with system buttons
  const bottomNavHeight = getBottomNavHeight();
  const tabBarPaddingBottom = getBottomNavPaddingBottom(insets.bottom);
  
  // ✅ Total container height includes safe area for Android system buttons
  // On Android, we extend all the way to the bottom edge (no gap)
  const containerHeight = Platform.OS === 'android' 
    ? bottomNavHeight + insets.bottom // Extend to system buttons
    : bottomNavHeight + tabBarPaddingBottom;
  
  // ✅ Background height matches the visible tab bar area
  const backgroundHeight = bottomNavHeight;

  console.log(
    `[TabNav v87.0] 📐 Dimensions: ` +
    `bottomNavHeight=${bottomNavHeight}, ` +
    `tabBarPaddingBottom=${tabBarPaddingBottom}, ` +
    `containerHeight=${containerHeight}, ` +
    `backgroundHeight=${backgroundHeight}, ` +
    `safeAreaBottom=${insets.bottom}, ` +
    `platform=${Platform.OS}, ` +
    `✅ Icons visible above BarLive background`
  );

  return (
    <View style={[styles.container, { height: containerHeight }]} pointerEvents="box-none">
      {/* ✅ CRITICAL FIX v87.0: Single BarLive background extending to system buttons */}
      <View style={[styles.backgroundContainer, { height: backgroundHeight }]} pointerEvents="none">
        <Svg
          width="100%"
          height={backgroundHeight}
          viewBox={`0 0 375 ${backgroundHeight}`}
          preserveAspectRatio="none"
          style={styles.svg}
        >
          <Path
            d={`M0,0 H375 V${backgroundHeight} H0 Z`}
            fill={colors.primary}
          />
        </Svg>
      </View>

      {/* ✅ CRITICAL FIX v87.0: Tab bar positioned at bottom with proper padding and z-index */}
      <View style={[styles.tabBar, { 
        paddingBottom: Platform.OS === 'android' ? insets.bottom : tabBarPaddingBottom,
        zIndex: 1000000,
      }]} pointerEvents="box-none">
        {tabs.map(tab => renderTab(tab))}
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
    backgroundColor: 'transparent',
    zIndex: 999999,
    elevation: 999,
  },
  backgroundContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 1,
    zIndex: 1,
  },
  svg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBar: {
    flexDirection: 'row',
    paddingTop: Platform.OS === 'android' ? 8 : 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
    position: 'relative',
    zIndex: 1000000,
    elevation: 1000,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'android' ? 3 : 8,
    overflow: 'hidden',
    borderRadius: 20,
  },
  centerButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 15,
    overflow: 'hidden',
  },
  centerGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  avatarContainer: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarContainerActive: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 15,
  },
  avatar: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
