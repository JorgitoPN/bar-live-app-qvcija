
/**
 * TAB NAVIGATION BAR - VERSION v73.0
 * 
 * ✅ CRITICAL FIXES v73.0 - ANDROID UI IMPROVEMENTS
 * 
 * CRITICAL FIXES v73.0:
 * - ✅ Android: Bottom menu background stops EXACTLY at 75% of "Explorar" button height (no overflow)
 * - ✅ Android: Icons properly centered in bottom menu
 * - ✅ iOS: Maintained existing functionality (unchanged)
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
    const cleanRoute = tab.route.replace(/^\//, '').replace(/\/$/, '');
    const cleanPath = currentPath.replace(/^\//, '').replace(/\/$/, '');

    console.log(
      `🔍 [TabNav v73.0] Checking tab "${tab.id}": ` +
      `route="${cleanRoute}", path="${cleanPath}"`
    );

    if (tab.id === 'gestion' && cleanPath.startsWith('perfil/local')) {
      console.log(
        `✅ [TabNav v73.0] Tab "${tab.id}" is ACTIVE ` +
        `(special case: perfil/local)`
      );
      return true;
    }

    if (tab.id === 'perfil' && cleanPath.startsWith('perfil/local')) {
      console.log(
        `❌ [TabNav v73.0] Tab "${tab.id}" is INACTIVE ` +
        `(special case: perfil/local)`
      );
      return false;
    }

    const routeSegments = cleanRoute.split('/').filter(s => !s.startsWith('(') && !s.endsWith(')'));
    const pathSegments = cleanPath.split('/').filter(s => !s.startsWith('(') && !s.endsWith(')'));

    if (routeSegments.length > 0 && pathSegments.length > 0) {
      const mainRouteSegment = routeSegments[routeSegments.length - 1];
      const mainPathSegment = pathSegments[0];

      if (mainRouteSegment === mainPathSegment) {
        console.log(
          `✅ [TabNav v73.0] Tab "${tab.id}" is ACTIVE ` +
          `(segment match: "${mainRouteSegment}")`
        );
        return true;
      }
    }

    if (cleanPath.startsWith(cleanRoute)) {
      console.log(`✅ [TabNav v73.0] Tab "${tab.id}" is ACTIVE (prefix match)`);
      return true;
    }

    if (cleanPath === cleanRoute || cleanPath === `${cleanRoute}/index`) {
      console.log(`✅ [TabNav v73.0] Tab "${tab.id}" is ACTIVE (exact match)`);
      return true;
    }

    console.log(`❌ [TabNav v73.0] Tab "${tab.id}" is INACTIVE`);
    return false;
  };

  const handleTabPress = async (tab: TabDefinition) => {
    console.log(`🔘 [TabNav v73.0] Tab pressed: "${tab.id}" -> ${tab.route}`);
    
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

    const safeAvatarUrl = activeProfileAvatar && !activeProfileAvatar.startsWith('file://') 
      ? activeProfileAvatar 
      : null;

    console.log(
      `🎨 [TabNav v73.0] Rendering tab "${tab.id}": ` +
      `isActive=${isActive}, isCenter=${isCenter}`
    );

    const TouchableComponent = Platform.OS === 'android' ? TouchableNativeFeedback : TouchableOpacity;
    const touchableProps = Platform.OS === 'android' 
      ? {
          background: TouchableNativeFeedback.Ripple('rgba(255, 255, 255, 0.3)', false),
          useForeground: true,
        }
      : {
          activeOpacity: 0.7,
        };

    // ✅ CRITICAL v73.0: Center button icon sizes normalized on Android (85% of iOS)
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
                size={Platform.OS === 'ios' ? 28 : 24}
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
                  {...(Platform.OS === 'android' && { cache: 'force-cache' as any })}
                  onError={(error) => {
                    console.error('[TabNav v73.0] ❌ Avatar failed to load:', safeAvatarUrl?.substring(0, 50), error.nativeEvent?.error);
                  }}
                  onLoad={() => {
                    console.log('[TabNav v73.0] ✅ Avatar loaded successfully:', safeAvatarUrl?.substring(0, 50));
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
                    size={Platform.OS === 'ios' ? 18 : 15}
                  />
                </View>
              )}
            </View>
          </View>
        </TouchableComponent>
      );
    }

    // ✅ CRITICAL v73.0: Regular tab icons normalized to 85% on Android
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
            size={Platform.OS === 'ios' ? 26 : 22}
          />
        </View>
      </TouchableComponent>
    );
  };

  // ✅ CRITICAL FIX v73.0: Android bottom menu background stops EXACTLY at 75% of button height
  const baseHeight = 60;
  const buttonHeight = 56;
  const buttonProtrusion = buttonHeight / 2; // 28px - half of button protrudes above
  
  // ✅ CRITICAL v73.0: Background should cover 75% of the button height
  // Button protrudes 28px above the base, so 75% of 28px = 21px
  const coverageHeight = buttonProtrusion * 0.75; // 21px on iOS, 21px on Android
  const backgroundHeight = baseHeight + coverageHeight;
  
  const containerHeight = baseHeight + (Platform.OS === 'android' ? Math.max(insets.bottom, 8) : 0);
  const tabBarPaddingBottom = Platform.OS === 'ios' ? 20 : Math.max(insets.bottom, 8);

  console.log('[TabNav v73.0] 📐 Tab bar dimensions:', {
    platform: Platform.OS,
    baseHeight,
    buttonHeight,
    buttonProtrusion,
    coverageHeight,
    backgroundHeight,
    containerHeight,
    visibleButtonHeight: buttonProtrusion - coverageHeight,
    coveragePercent: '75%',
  });

  return (
    <View style={[styles.container, { height: containerHeight }]}>
      {/* ✅ CRITICAL FIX v73.0: Background stops EXACTLY at 75% of button height (21px coverage) */}
      <View style={[styles.backgroundContainer, { height: backgroundHeight, bottom: Platform.OS === 'android' ? Math.max(insets.bottom, 8) : 0 }]}>
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

      {/* ✅ CRITICAL FIX v73.0: Icons properly centered in bottom menu */}
      <View style={[styles.tabBar, { paddingBottom: tabBarPaddingBottom }]}>
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
    height: 60,
    backgroundColor: 'transparent',
    zIndex: 999999,
    elevation: 999,
  },
  backgroundContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
    zIndex: 999,
    elevation: 999,
  },
  // ✅ CRITICAL FIX v73.0: Icons properly centered in tab
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'ios' ? 6 : 8,
    overflow: 'hidden',
    borderRadius: 20,
  },
  // ✅ v73.0: Central button protrudes upwards (28px = half of 56px button)
  centerButton: {
    width: 56,
    height: 56,
    marginTop: -28,
    borderRadius: 28,
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
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  // ✅ CRITICAL v73.0: Avatar sizes normalized (85% on Android)
  avatarContainer: {
    width: Platform.OS === 'ios' ? 24 : 20,
    height: Platform.OS === 'ios' ? 24 : 20,
    borderRadius: Platform.OS === 'ios' ? 12 : 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarContainerActive: {
    borderWidth: 2,
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
