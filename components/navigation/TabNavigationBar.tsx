
/**
 * TAB NAVIGATION BAR - VERSION v47.0
 * 
 * Clean tab navigation bar with Instagram-style filled/outlined icons.
 * Active icons are filled with white, inactive icons are outlined with white.
 * 
 * COMPLETE ANDROID-iOS PARITY + NATIVE ANDROID BEHAVIOR:
 * - Consistent behavior on both platforms
 * - Proper route matching logic
 * - Better error handling
 * - Android-specific optimizations (native touch feedback)
 * - Native ripple effect on Android
 * - Smooth animations
 * - ✅ FIXED v47.0: CRITICAL - Always display user avatar correctly
 * - ✅ FIXED v47.0: Filter out file:// URLs that cause ENOENT errors
 * - ✅ FIXED v47.0: Safe Area handling for Android system buttons
 * - ✅ FIXED v47.0: Tab bar ALWAYS visible above all content
 * - ✅ FIXED v47.0: Profile avatar properly visible on Android
 * - ✅ FIXED v47.0: User @jorge avatar now displays correctly
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

  const isTabActive = (tab: TabDefinition, currentPath: string): boolean => {
    // Clean up paths for comparison
    const cleanRoute = tab.route.replace(/^\//, '').replace(/\/$/, '');
    const cleanPath = currentPath.replace(/^\//, '').replace(/\/$/, '');

    console.log(
      `🔍 [TabNav v47.0] Checking tab "${tab.id}": ` +
      `route="${cleanRoute}", path="${cleanPath}"`
    );

    // Special case: gestion tab is active when viewing local profiles
    if (tab.id === 'gestion' && cleanPath.startsWith('perfil/local')) {
      console.log(
        `✅ [TabNav v47.0] Tab "${tab.id}" is ACTIVE ` +
        `(special case: perfil/local)`
      );
      return true;
    }

    // Special case: perfil tab is NOT active when viewing local profiles
    if (tab.id === 'perfil' && cleanPath.startsWith('perfil/local')) {
      console.log(
        `❌ [TabNav v47.0] Tab "${tab.id}" is INACTIVE ` +
        `(special case: perfil/local)`
      );
      return false;
    }

    // Extract the main route segment (e.g., "(tabs)/favoritos" -> "favoritos")
    const routeSegments = cleanRoute.split('/').filter(s => !s.startsWith('(') && !s.endsWith(')'));
    const pathSegments = cleanPath.split('/').filter(s => !s.startsWith('(') && !s.endsWith(')'));

    // Check if the main route segment matches
    if (routeSegments.length > 0 && pathSegments.length > 0) {
      const mainRouteSegment = routeSegments[routeSegments.length - 1];
      const mainPathSegment = pathSegments[0];

      if (mainRouteSegment === mainPathSegment) {
        console.log(
          `✅ [TabNav v47.0] Tab "${tab.id}" is ACTIVE ` +
          `(segment match: "${mainRouteSegment}")`
        );
        return true;
      }
    }

    // Fallback: check if path starts with route
    if (cleanPath.startsWith(cleanRoute)) {
      console.log(`✅ [TabNav v47.0] Tab "${tab.id}" is ACTIVE (prefix match)`);
      return true;
    }

    // Check exact match
    if (cleanPath === cleanRoute || cleanPath === `${cleanRoute}/index`) {
      console.log(`✅ [TabNav v47.0] Tab "${tab.id}" is ACTIVE (exact match)`);
      return true;
    }

    console.log(`❌ [TabNav v47.0] Tab "${tab.id}" is INACTIVE`);
    return false;
  };

  const handleTabPress = async (tab: TabDefinition) => {
    console.log(`🔘 [TabNav v47.0] Tab pressed: "${tab.id}" -> ${tab.route}`);
    
    // ✅ CRITICAL FIX v47.0: Provide native haptic feedback on Android
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

    // ✅ CRITICAL FIX v47.0: Filter out file:// URLs that cause ENOENT errors
    const safeAvatarUrl = activeProfileAvatar && !activeProfileAvatar.startsWith('file://') 
      ? activeProfileAvatar 
      : null;

    console.log(
      `🎨 [TabNav v47.0] Rendering tab "${tab.id}": ` +
      `isActive=${isActive}, isCenter=${isCenter}, avatar=${safeAvatarUrl ? safeAvatarUrl.substring(0, 50) : 'none'}`
    );

    // ✅ CRITICAL FIX v47.0: Use TouchableNativeFeedback on Android for native ripple effect
    const TouchableComponent = Platform.OS === 'android' ? TouchableNativeFeedback : TouchableOpacity;
    const touchableProps = Platform.OS === 'android' 
      ? {
          background: TouchableNativeFeedback.Ripple('rgba(255, 255, 255, 0.3)', false),
          useForeground: true,
        }
      : {
          activeOpacity: 0.7,
        };

    // Center button (Explorar)
    if (isCenter) {
      return (
        <TouchableComponent
          key={tab.id}
          onPress={() => handleTabPress(tab)}
          {...touchableProps}
        >
          <View style={styles.centerButton}>
            <LinearGradient
              colors={['#2DD4BF', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.centerGradient}
            >
              <TabIcon
                iosIconFilled={tab.iosIconFilled}
                iosIconOutlined={tab.iosIconOutlined}
                androidIconFilled={tab.androidIconFilled}
                androidIconOutlined={tab.androidIconOutlined}
                isActive={true}
                size={30}
              />
            </LinearGradient>
          </View>
        </TouchableComponent>
      );
    }

    // Profile tab with avatar
    if (tab.id === 'perfil') {
      return (
        <TouchableComponent
          key={tab.id}
          onPress={() => handleTabPress(tab)}
          {...touchableProps}
        >
          <View style={styles.tab}>
            <View style={[styles.avatarContainer, isActive && styles.avatarContainerActive]}>
              {safeAvatarUrl ? (
                <Image
                  source={{ uri: safeAvatarUrl }}
                  style={styles.avatar}
                  resizeMode="cover"
                  // ✅ ANDROID FIX v47.0: Force cache for better loading
                  {...(Platform.OS === 'android' && { cache: 'force-cache' as any })}
                  onError={(error) => {
                    console.error('[TabNav v47.0] ❌ Avatar failed to load:', safeAvatarUrl?.substring(0, 50), error.nativeEvent?.error);
                  }}
                  onLoad={() => {
                    console.log('[TabNav v47.0] ✅ Avatar loaded successfully:', safeAvatarUrl?.substring(0, 50));
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
                    size={20}
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
            size={28}
          />
        </View>
      </TouchableComponent>
    );
  };

  // ✅ ANDROID FIX v47.0: Add safe area padding for system buttons
  const containerHeight = 80 + (Platform.OS === 'android' ? Math.max(insets.bottom, 12) : 0);
  const tabBarPaddingBottom = Platform.OS === 'ios' ? 20 : Math.max(insets.bottom, 12);

  return (
    <View style={[styles.container, { height: containerHeight }]} pointerEvents="box-none">
      <View style={[styles.backgroundContainer, { height: containerHeight }]} pointerEvents="none">
        <Svg
          width="100%"
          height={containerHeight}
          viewBox={`0 0 375 ${containerHeight}`}
          preserveAspectRatio="none"
          style={styles.svg}
        >
          <Path
            d={`M0,0 H375 V${containerHeight} H0 Z`}
            fill={colors.primary}
          />
        </Svg>
      </View>

      <View style={[styles.tabBar, { paddingBottom: tabBarPaddingBottom }]} pointerEvents="box-none">
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
    height: 80,
    backgroundColor: 'transparent',
    // ✅ CRITICAL FIX v47.0: MAXIMUM z-index and elevation for guaranteed visibility
    zIndex: 999999,
    elevation: 999,
  },
  backgroundContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 998,
    zIndex: 999998,
  },
  svg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBar: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
    zIndex: 999999,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    overflow: 'hidden',
    borderRadius: 20,
  },
  centerButton: {
    width: 60,
    height: 60,
    marginTop: -30,
    borderRadius: 30,
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
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
