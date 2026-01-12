
/**
 * TAB NAVIGATION BAR - VERSION v140.0
 * 
 * ✅ ANDROID MINIAVATAR FIX v140.0 - PERSISTENT STATE SOLUTION
 * 
 * CRITICAL FIXES v140.0 (ANDROID ONLY):
 * - ✅ FIXED: Miniavatar now uses AvatarContext for persistent state
 * - ✅ FIXED: Avatar displays correctly on ALL pages without losing state
 * - ✅ FIXED: No more remounting issues when navigating
 * - ✅ FIXED: Single source of truth for avatar URL
 * - ✅ FIXED: Real-time updates when avatar changes
 * - ✅ FIXED: Fallback icon displays when user not logged in
 * - ✅ iOS design remains unchanged (reference design)
 * 
 * Previous fixes maintained (v98.0):
 * - ✅ White strip above bottom menu eliminated
 * - ✅ Solid BarLive teal background throughout
 * - ✅ Proper z-index layering
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  TouchableNativeFeedback,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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
import { useAuth } from '@/contexts/AuthContext';
import { useAvatar } from '@/contexts/AvatarContext';

interface TabNavigationBarProps {
  tabs: TabDefinition[];
  activeProfileAvatar?: string | null;
  onProfilePress?: () => void;
}

// ✅ CRITICAL FIX v98.0: Explicitly define BarLive color to prevent white background
const BARLIVE_COLOR = '#14B8A6';

export function TabNavigationBar({ 
  tabs, 
  activeProfileAvatar,
  onProfilePress 
}: TabNavigationBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { avatarUrl, isLoading } = useAvatar(); // ✅ v140.0: Use AvatarContext

  // Log scaling info on Android
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      logScalingInfo();
      console.log(`[TabNav v140.0] 🎨 Android background color: ${BARLIVE_COLOR}`);
      console.log(`[TabNav v140.0] ✅ White strip ELIMINATED - no extra padding`);
      console.log(`[TabNav v140.0] 🖼️ Profile avatar from context:`, avatarUrl?.substring(0, 50) || 'none');
      console.log(`[TabNav v140.0] ✅ Avatar persists across ALL page navigations`);
    }
  }, [avatarUrl]);

  const isTabActive = (tab: TabDefinition, currentPath: string): boolean => {
    const cleanRoute = tab.route.replace(/^\//, '').replace(/\/$/, '');
    const cleanPath = currentPath.replace(/^\//, '').replace(/\/$/, '');

    console.log(
      `🔍 [TabNav v140.0] Checking tab "${tab.id}": ` +
      `route="${cleanRoute}", path="${cleanPath}"`
    );

    // Special case: gestion tab is active when viewing local profiles
    if (tab.id === 'gestion' && cleanPath.startsWith('perfil/local')) {
      console.log(
        `✅ [TabNav v140.0] Tab "${tab.id}" is ACTIVE ` +
        `(special case: perfil/local)`
      );
      return true;
    }

    // Special case: perfil tab is NOT active when viewing local profiles
    if (tab.id === 'perfil' && cleanPath.startsWith('perfil/local')) {
      console.log(
        `❌ [TabNav v140.0] Tab "${tab.id}" is INACTIVE ` +
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
          `✅ [TabNav v140.0] Tab "${tab.id}" is ACTIVE ` +
          `(segment match: "${mainRouteSegment}")`
        );
        return true;
      }
    }

    // Fallback: check if path starts with route
    if (cleanPath.startsWith(cleanRoute)) {
      console.log(`✅ [TabNav v140.0] Tab "${tab.id}" is ACTIVE (prefix match)`);
      return true;
    }

    // Check exact match
    if (cleanPath === cleanRoute || cleanPath === `${cleanRoute}/index`) {
      console.log(`✅ [TabNav v140.0] Tab "${tab.id}" is ACTIVE (exact match)`);
      return true;
    }

    console.log(`❌ [TabNav v140.0] Tab "${tab.id}" is INACTIVE`);
    return false;
  };

  const handleTabPress = async (tab: TabDefinition) => {
    console.log(`🔘 [TabNav v140.0] Tab pressed: "${tab.id}" -> ${tab.route}`);
    
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

    console.log(
      `🎨 [TabNav v140.0] Rendering tab "${tab.id}": ` +
      `isActive=${isActive}, isCenter=${isCenter}, ` +
      `avatar=${avatarUrl ? 'valid' : 'none/invalid'}, ` +
      `originalUrl=${avatarUrl?.substring(0, 50) || 'none'}`
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

    // ✅ CRITICAL FIX v140.0: Profile tab with avatar from AvatarContext
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
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatar}
                  resizeMode="cover"
                  {...(Platform.OS === 'android' && { cache: 'force-cache' as any })}
                  onError={(error) => {
                    console.error('[TabNav v140.0] ❌ Avatar failed to load:', avatarUrl?.substring(0, 50), error.nativeEvent?.error);
                  }}
                  onLoad={() => {
                    console.log('[TabNav v140.0] ✅ Avatar loaded successfully from context:', avatarUrl?.substring(0, 50));
                  }}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <TabIcon
                    iosIconFilled="person.fill"
                    iosIconOutlined="person"
                    androidIconFilled="person"
                    androidIconOutlined="person"
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
  const tabBarPaddingBottom = getBottomNavPaddingBottom(insets.bottom);
  
  // ✅ CRITICAL FIX v98.0: Simplified container height - no extra padding
  const containerHeight = Platform.OS === 'android' 
    ? bottomNavHeight + insets.bottom
    : bottomNavHeight + tabBarPaddingBottom;
  
  // ✅ CRITICAL FIX v98.0: Background height matches container exactly - no extension needed
  const backgroundHeight = containerHeight;

  console.log(
    `[TabNav v140.0] 📐 Dimensions: ` +
    `bottomNavHeight=${bottomNavHeight}, ` +
    `tabBarPaddingBottom=${tabBarPaddingBottom}, ` +
    `containerHeight=${containerHeight}, ` +
    `backgroundHeight=${backgroundHeight}, ` +
    `safeAreaBottom=${insets.bottom}, ` +
    `platform=${Platform.OS}, ` +
    `backgroundColor=${BARLIVE_COLOR}, ` +
    `✅ v140.0: Android miniavatar FIXED - uses AvatarContext on ALL pages`
  );

  return (
    <View style={[styles.container, { 
      height: containerHeight,
      backgroundColor: BARLIVE_COLOR, // ✅ v98.0: Ensure container has BarLive background
    }]} pointerEvents="box-none">
      {/* ✅ CRITICAL FIX v98.0: Simplified background - no extension, just solid color */}
      <View style={[styles.backgroundContainer, { 
        height: backgroundHeight,
        backgroundColor: BARLIVE_COLOR, // ✅ v98.0: Explicit BarLive color
      }]} pointerEvents="none">
        <View style={[styles.solidBackground, { 
          height: backgroundHeight, 
          backgroundColor: BARLIVE_COLOR, // ✅ v98.0: Explicit BarLive color
        }]} />
      </View>

      {/* ✅ Tab bar positioned ABOVE background with higher z-index */}
      <View style={[styles.tabBar, { 
        paddingBottom: Platform.OS === 'android' ? insets.bottom : tabBarPaddingBottom,
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
    // ✅ v98.0: Background color set via inline style
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
    // ✅ v98.0: Background color set via inline style
  },
  solidBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    // ✅ v98.0: Background color set via inline style to ensure BarLive color
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
    backgroundColor: 'transparent', // ✅ v98.0: Transparent to show BarLive background below
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'android' ? 3 : 8,
    overflow: 'hidden',
    borderRadius: 20,
    zIndex: 10,
    backgroundColor: 'transparent', // ✅ v98.0: Transparent to show BarLive background
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
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});
