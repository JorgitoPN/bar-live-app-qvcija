
/**
 * FLOATING TAB BAR - VERSION v269.0
 * 
 * ✅ ULTRA COMPACT DESIGN v269.0 - MINIMAL iOS SPACING
 * 
 * CRITICAL FIXES v269.0:
 * - ✅ iOS SPACING ELIMINATED: Removed all unnecessary bottom padding on iOS
 * - ✅ MINIMAL SAFE AREA: Only 2pt bottom padding on iOS (was 4pt)
 * - ✅ TIGHTER HEIGHT: Further reduced tab bar height
 * - ✅ NO EMPTY GAP: Icons now sit directly above safe area
 * 
 * Previous fixes maintained (v268.0):
 * - ✅ REDUCED HEIGHT: Tab bar is now more compact (56dp Android, 60pt iOS)
 * - ✅ iOS SPACING FIX: Eliminated empty gap between icons and bottom edge
 * - ✅ SMALLER ICONS: Reduced icon sizes for better proportions
 * - ✅ TIGHTER PADDING: Reduced vertical padding for more screen space
 * - ✅ INSTANT FEEDBACK: Reduced activeOpacity to 0.6 for immediate visual response
 * - ✅ REMOVED DELAYS: Eliminated any animation delays on press
 * - ✅ OPTIMIZED RENDERING: Memoized components to prevent unnecessary re-renders
 * - ✅ FASTER NAVIGATION: Direct router.push without delays
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { useAvatar } from '@/contexts/AvatarContext';

const { width: screenWidth } = Dimensions.get('window');

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

const BARLIVE_COLOR = '#14B8A6';

// ✅ CRITICAL FIX v160.0: Memoized ProfileTab for better performance
interface ProfileTabProps {
  isActive: boolean;
  onPress: () => void;
  avatarUrl: string | null;
}

const ProfileTab = memo(({ isActive, onPress, avatarUrl }: ProfileTabProps) => {
  const avatarSize = Platform.OS === 'android' ? 26 : 30;
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  
  React.useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [avatarUrl]);
  
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tab}
      activeOpacity={0.6}
    >
      <View style={[
        styles.avatarContainer,
        { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
        isActive && styles.avatarContainerActive
      ]}>
        {avatarUrl && !imageError ? (
          <>
            <Image
              key={`avatar-${avatarUrl}`}
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              resizeMode="cover"
              onError={() => {
                setImageError(true);
                setImageLoaded(false);
              }}
              onLoad={() => {
                setImageError(false);
                setImageLoaded(true);
              }}
            />
            {!imageLoaded && (
              <View style={[styles.avatar, styles.avatarPlaceholder, StyleSheet.absoluteFillObject]}>
                <IconSymbol
                  ios_icon_name="person.fill"
                  android_material_icon_name="person"
                  size={Platform.OS === 'android' ? 18 : 22}
                  color={isActive ? colors.primary : 'rgba(255, 255, 255, 0.7)'}
                />
              </View>
            )}
          </>
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <IconSymbol
              ios_icon_name="person.fill"
              android_material_icon_name="person"
              size={Platform.OS === 'android' ? 16 : 20}
              color={isActive ? colors.primary : 'rgba(255, 255, 255, 0.7)'}
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

ProfileTab.displayName = 'ProfileTab';

export default function FloatingTabBar({ tabs, containerWidth = screenWidth }: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { avatarUrl } = useAvatar();

  const isTabActive = useCallback((tab: TabBarItem): boolean => {
    const cleanRoute = tab.route.replace(/^\//, '').replace(/\/$/, '');
    const cleanPath = pathname.replace(/^\//, '').replace(/\/$/, '');

    if (tab.name === 'gestion' && cleanPath.startsWith('perfil/local')) {
      return true;
    }

    if (tab.name === 'perfil' && cleanPath.startsWith('perfil/local')) {
      return false;
    }

    const routeSegments = cleanRoute.split('/').filter(s => !s.startsWith('(') && !s.endsWith(')'));
    const pathSegments = cleanPath.split('/').filter(s => !s.startsWith('(') && !s.endsWith(')'));

    if (routeSegments.length > 0 && pathSegments.length > 0) {
      const mainRouteSegment = routeSegments[routeSegments.length - 1];
      const mainPathSegment = pathSegments[0];

      if (mainRouteSegment === mainPathSegment) {
        return true;
      }
    }

    if (cleanPath.startsWith(cleanRoute)) {
      return true;
    }

    if (cleanPath === cleanRoute || cleanPath === `${cleanRoute}/index`) {
      return true;
    }

    return false;
  }, [pathname]);

  // ✅ CRITICAL FIX v160.0: Instant navigation without delays
  const handleTabPress = useCallback((tab: TabBarItem) => {
    console.log(`[FloatingTabBar v160.0] ⚡ INSTANT TAP: "${tab.name}" -> ${tab.route}`);
    router.push(tab.route as any);
  }, [router]);

  const getAndroidIcon = useCallback((iosIcon: string): string => {
    const iconMap: Record<string, string> = {
      'calendar': 'event',
      'heart.fill': 'favorite',
      'sparkles': 'explore',
      'person.2.fill': 'people',
      'person.fill': 'person',
      'briefcase.fill': 'work',
      'gear': 'settings',
    };
    return iconMap[iosIcon] || iosIcon;
  }, []);

  // ✅ CRITICAL FIX v160.0: Memoized tab rendering for better performance
  const renderTab = useCallback((tab: TabBarItem, index: number) => {
    const isActive = isTabActive(tab);
    const isCenter = tab.name === 'explorar';

    if (tab.name === 'perfil') {
      return (
        <ProfileTab
          key={tab.name}
          isActive={isActive}
          onPress={() => handleTabPress(tab)}
          avatarUrl={avatarUrl}
        />
      );
    }

    if (isCenter) {
      const centerButtonSize = Platform.OS === 'android' ? 52 : 58;
      const centerIconSize = Platform.OS === 'android' ? 26 : 30;

      return (
        <TouchableOpacity
          key={tab.name}
          onPress={() => handleTabPress(tab)}
          style={[styles.centerButton, {
            width: centerButtonSize,
            height: centerButtonSize,
            borderRadius: centerButtonSize / 2,
            marginTop: -centerButtonSize / 2,
          }]}
          activeOpacity={0.6}
        >
          <LinearGradient
            colors={['#2DD4BF', '#06B6D4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.centerGradient, {
              borderRadius: centerButtonSize / 2,
            }]}
          >
            <IconSymbol
              ios_icon_name="sparkles"
              android_material_icon_name="explore"
              size={centerIconSize}
              color="#FFFFFF"
            />
          </LinearGradient>
        </TouchableOpacity>
      );
    }

    const iconSize = Platform.OS === 'android' ? 22 : 26;
    
    return (
      <TouchableOpacity
        key={tab.name}
        onPress={() => handleTabPress(tab)}
        style={styles.tab}
        activeOpacity={0.6}
      >
        <IconSymbol
          ios_icon_name={tab.icon}
          android_material_icon_name={getAndroidIcon(tab.icon)}
          size={iconSize}
          color={isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'}
        />
      </TouchableOpacity>
    );
  }, [isTabActive, handleTabPress, avatarUrl, getAndroidIcon]);

  // ✅ ULTRA COMPACT TAB BAR v269.0: Minimal iOS bottom spacing
  const bottomNavHeight = Platform.OS === 'android' ? 56 : 58;
  const tabBarPaddingBottom = Platform.OS === 'android' ? Math.max(insets.bottom, 8) : Math.max(insets.bottom - 12, 2);
  const containerHeight = bottomNavHeight + tabBarPaddingBottom;

  console.log(
    `[FloatingTabBar v269.0] ⚡ ULTRA COMPACT MODE - ` +
    `height=${bottomNavHeight}pt, iOS spacing MINIMAL (${tabBarPaddingBottom}pt), no empty gap`
  );

  return (
    <View style={[styles.container, {
      height: containerHeight,
      backgroundColor: BARLIVE_COLOR,
    }]} pointerEvents="box-none">
      <View style={[styles.backgroundContainer, {
        height: containerHeight,
        backgroundColor: BARLIVE_COLOR,
      }]} pointerEvents="none">
        <View style={[styles.solidBackground, {
          height: containerHeight,
          backgroundColor: BARLIVE_COLOR,
        }]} />
      </View>

      <View style={[styles.tabBar, {
        paddingBottom: tabBarPaddingBottom,
      }]} pointerEvents="box-none">
        {tabs.map((tab, index) => renderTab(tab, index))}
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
    paddingTop: Platform.OS === 'android' ? 8 : 8,
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
    paddingVertical: Platform.OS === 'android' ? 4 : 4,
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
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});
