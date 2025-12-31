
/**
 * TAB NAVIGATION BAR - VERSION v93.0
 * 
 * ✅ ANDROID BOTTOM NAV FIX v93.0 - WHITE STRIPE ELIMINATED
 * 
 * CRITICAL FIXES v93.0 (ANDROID ONLY):
 * - ✅ Eliminated white stripe above bottom menu
 * - ✅ Background extends seamlessly to top of icons
 * - ✅ Proper z-index layering to prevent white gaps
 * - ✅ Maintains all previous fixes from v92.0
 * 
 * Previous fixes maintained:
 * - ✅ Reduced bottom margin for compact design
 * - ✅ Solid BarLive background color
 * - ✅ White icons visible on BarLive background
 * - ✅ Proper safe area handling
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

// ✅ CRITICAL FIX v91.0: Explicitly define BarLive color to prevent white background
const BARLIVE_COLOR = '#14B8A6';

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
      console.log(`[TabNav v93.0] 🎨 Android background color: ${BARLIVE_COLOR}`);
      console.log(`[TabNav v93.0] ✅ WHITE STRIPE FIX APPLIED`);
    }
  }, []);

  const isTabActive = (tab: TabDefinition, currentPath: string): boolean => {
    const cleanRoute = tab.route.replace(/^\//, '').replace(/\/$/, '');
    const cleanPath = currentPath.replace(/^\//, '').replace(/\/$/, '');

    console.log(
      `🔍 [TabNav v93.0] Checking tab "${tab.id}": ` +
      `route="${cleanRoute}", path="${cleanPath}"`
    );

    // Special case: gestion tab is active when viewing local profiles
    if (tab.id === 'gestion' && cleanPath.startsWith('perfil/local')) {
      console.log(
        `✅ [TabNav v93.0] Tab "${tab.id}" is ACTIVE ` +
        `(special case: perfil/local)`
      );
      return true;
    }

    // Special case: perfil tab is NOT active when viewing local profiles
    if (tab.id === 'perfil' && cleanPath.startsWith('perfil/local')) {
      console.log(
        `❌ [TabNav v93.0] Tab "${tab.id}" is INACTIVE ` +
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
          `✅ [TabNav v93.0] Tab "${tab.id}" is ACTIVE ` +
          `(segment match: "${mainRouteSegment}")`
        );
        return true;
      }
    }

    // Fallback: check if path starts with route
    if (cleanPath.startsWith(cleanRoute)) {
      console.log(`✅ [TabNav v93.0] Tab "${tab.id}" is ACTIVE (prefix match)`);
      return true;
    }

    // Check exact match
    if (cleanPath === cleanRoute || cleanPath === `${cleanRoute}/index`) {
      console.log(`✅ [TabNav v93.0] Tab "${tab.id}" is ACTIVE (exact match)`);
      return true;
    }

    console.log(`❌ [TabNav v93.0] Tab "${tab.id}" is INACTIVE`);
    return false;
  };

  const handleTabPress = async (tab: TabDefinition) => {
    console.log(`🔘 [TabNav v93.0] Tab pressed: "${tab.id}" -> ${tab.route}`);
    
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
      `🎨 [TabNav v93.0] Rendering tab "${tab.id}": ` +
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

    // Get platform-specific sizes
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
                    console.error('[TabNav v93.0] ❌ Avatar failed to load:', safeAvatarUrl?.substring(0, 50), error.nativeEvent?.error);
                  }}
                  onLoad={() => {
                    console.log('[TabNav v93.0] ✅ Avatar loaded successfully:', safeAvatarUrl?.substring(0, 50));
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

  // Calculate dimensions
  const bottomNavHeight = getBottomNavHeight();
  
  // ✅ v92.0: Reduced bottom padding from 20 to 10 for more compact design
  const defaultBottomPadding = 10;
  const tabBarPaddingBottom = Platform.OS === 'android' 
    ? Math.max(insets.bottom, 8)
    : defaultBottomPadding;
  
  // Total container height includes safe area for Android system buttons
  const containerHeight = Platform.OS === 'android' 
    ? bottomNavHeight + insets.bottom
    : bottomNavHeight + tabBarPaddingBottom;
  
  // ✅ CRITICAL FIX v93.0: Background height extends HIGHER to eliminate white stripe
  // On Android, extend background significantly higher to ensure no gap
  const backgroundHeight = Platform.OS === 'android'
    ? bottomNavHeight + insets.bottom + 30 // Extra 30px to eliminate white stripe
    : bottomNavHeight + 20; // iOS: Extra 20px to ensure full icon coverage

  console.log(
    `[TabNav v93.0] 📐 Dimensions: ` +
    `bottomNavHeight=${bottomNavHeight}, ` +
    `tabBarPaddingBottom=${tabBarPaddingBottom}, ` +
    `containerHeight=${containerHeight}, ` +
    `backgroundHeight=${backgroundHeight}, ` +
    `safeAreaBottom=${insets.bottom}, ` +
    `platform=${Platform.OS}, ` +
    `backgroundColor=${BARLIVE_COLOR}, ` +
    `✅ v93.0: WHITE STRIPE ELIMINATED on Android`
  );

  return (
    <View style={[styles.container, { 
      height: containerHeight,
      backgroundColor: BARLIVE_COLOR, // ✅ Ensure container has BarLive background
    }]} pointerEvents="box-none">
      {/* ✅ CRITICAL FIX v93.0: Extended background to eliminate white stripe */}
      <View style={[styles.backgroundContainer, { 
        height: backgroundHeight,
        backgroundColor: BARLIVE_COLOR,
      }]} pointerEvents="none">
        <View style={[styles.solidBackground, { 
          height: backgroundHeight, 
          backgroundColor: BARLIVE_COLOR,
        }]} />
      </View>

      {/* ✅ Tab bar positioned ABOVE background with higher z-index */}
      <View style={[styles.tabBar, { 
        paddingBottom: tabBarPaddingBottom,
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
  solidBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
  },
  tabBar: {
    flexDirection: 'row',
    paddingTop: Platform.OS === 'android' ? 8 : 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
    position: 'relative',
    zIndex: 10,
    elevation: 10,
    backgroundColor: 'transparent',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'android' ? 3 : 8,
    overflow: 'hidden',
    borderRadius: 20,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  centerButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 15,
    overflow: 'hidden',
    zIndex: 10,
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
    zIndex: 10,
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
