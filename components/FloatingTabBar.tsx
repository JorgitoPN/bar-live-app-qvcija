
/**
 * FLOATING TAB BAR - VERSION v159.0
 * 
 * ✅ LINT FIXES v159.0 - REACT HOOKS COMPLIANCE
 * 
 * CRITICAL FIXES v159.0:
 * - ✅ FIXED: Moved React Hooks out of renderTab function into separate component
 * - ✅ FIXED: ProfileTab component properly uses hooks at top level
 * - ✅ FIXED: Removed unnecessary dependency from useEffect
 * - ✅ COMPLIANT: All hooks now follow react-hooks/rules-of-hooks
 * 
 * Previous fixes maintained (v158.0):
 * - ✅ Enhanced image loading with key prop for proper remounting
 * - ✅ Better error handling with fallback to placeholder
 * - ✅ Proper cache control for Android
 * - ✅ Avatar displays correctly on ALL pages
 */

import React from 'react';
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

// ✅ CRITICAL FIX v98.0: Explicitly define BarLive color
const BARLIVE_COLOR = '#14B8A6';

// ✅ CRITICAL FIX v159.0: Separate component for profile tab to properly use hooks
interface ProfileTabProps {
  isActive: boolean;
  onPress: () => void;
  avatarUrl: string | null;
}

function ProfileTab({ isActive, onPress, avatarUrl }: ProfileTabProps) {
  const avatarSize = Platform.OS === 'android' ? 28 : 32;
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  
  console.log('[FloatingTabBar v159.0] 🎨 Rendering profile tab:', {
    hasAvatarUrl: !!avatarUrl,
    avatarUrlPreview: avatarUrl?.substring(0, 50),
    isActive,
    imageError,
    imageLoaded,
  });
  
  // ✅ v159.0: Reset error state when URL changes
  React.useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [avatarUrl]);
  
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.tab}
      activeOpacity={0.7}
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
              onError={(error) => {
                console.error('[FloatingTabBar v159.0] ❌ Avatar failed to load:', {
                  url: avatarUrl?.substring(0, 50),
                  error: error.nativeEvent?.error,
                });
                setImageError(true);
                setImageLoaded(false);
              }}
              onLoad={() => {
                console.log('[FloatingTabBar v159.0] ✅ Avatar loaded successfully');
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
              size={Platform.OS === 'android' ? 18 : 22}
              color={isActive ? colors.primary : 'rgba(255, 255, 255, 0.7)'}
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function FloatingTabBar({ tabs, containerWidth = screenWidth }: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { avatarUrl, isLoading } = useAvatar();

  console.log('[FloatingTabBar v159.0] 🎨 Using AvatarContext - avatar persists across navigation');

  const isTabActive = (tab: TabBarItem): boolean => {
    const cleanRoute = tab.route.replace(/^\//, '').replace(/\/$/, '');
    const cleanPath = pathname.replace(/^\//, '').replace(/\/$/, '');

    // Special case: gestion tab is active when viewing local profiles
    if (tab.name === 'gestion' && cleanPath.startsWith('perfil/local')) {
      return true;
    }

    // Special case: perfil tab is NOT active when viewing local profiles
    if (tab.name === 'perfil' && cleanPath.startsWith('perfil/local')) {
      return false;
    }

    // Extract main route segment
    const routeSegments = cleanRoute.split('/').filter(s => !s.startsWith('(') && !s.endsWith(')'));
    const pathSegments = cleanPath.split('/').filter(s => !s.startsWith('(') && !s.endsWith(')'));

    if (routeSegments.length > 0 && pathSegments.length > 0) {
      const mainRouteSegment = routeSegments[routeSegments.length - 1];
      const mainPathSegment = pathSegments[0];

      if (mainRouteSegment === mainPathSegment) {
        return true;
      }
    }

    // Fallback checks
    if (cleanPath.startsWith(cleanRoute)) {
      return true;
    }

    if (cleanPath === cleanRoute || cleanPath === `${cleanRoute}/index`) {
      return true;
    }

    return false;
  };

  const handleTabPress = (tab: TabBarItem) => {
    console.log(`[FloatingTabBar v159.0] 🔘 Tab pressed: "${tab.name}" -> ${tab.route}`);
    router.push(tab.route as any);
  };

  // Helper to convert iOS icon names to Android Material icons
  const getAndroidIcon = (iosIcon: string): string => {
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
  };

  const renderTab = (tab: TabBarItem, index: number) => {
    const isActive = isTabActive(tab);
    const isCenter = tab.name === 'explorar';

    // ✅ CRITICAL FIX v159.0: Use ProfileTab component for profile tab
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

    // Center button (Explorar)
    if (isCenter) {
      const centerButtonSize = Platform.OS === 'android' ? 56 : 64;
      const centerIconSize = Platform.OS === 'android' ? 28 : 32;

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
          activeOpacity={0.8}
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

    // Regular tab
    const iconSize = Platform.OS === 'android' ? 24 : 28;
    
    return (
      <TouchableOpacity
        key={tab.name}
        onPress={() => handleTabPress(tab)}
        style={styles.tab}
        activeOpacity={0.7}
      >
        <IconSymbol
          ios_icon_name={tab.icon}
          android_material_icon_name={getAndroidIcon(tab.icon)}
          size={iconSize}
          color={isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'}
        />
      </TouchableOpacity>
    );
  };

  // Calculate dimensions
  const bottomNavHeight = Platform.OS === 'android' ? 60 : 70;
  const tabBarPaddingBottom = Platform.OS === 'android' ? Math.max(insets.bottom, 8) : Math.max(insets.bottom, 12);
  const containerHeight = bottomNavHeight + tabBarPaddingBottom;

  console.log(
    `[FloatingTabBar v159.0] 📐 Dimensions: ` +
    `height=${containerHeight}, ` +
    `platform=${Platform.OS}, ` +
    `hasAvatar=${!!avatarUrl}, ` +
    `isLoading=${isLoading}, ` +
    `✅ v159.0: Hooks compliance fixed - ProfileTab component`
  );

  return (
    <View style={[styles.container, {
      height: containerHeight,
      backgroundColor: BARLIVE_COLOR,
    }]} pointerEvents="box-none">
      {/* Background */}
      <View style={[styles.backgroundContainer, {
        height: containerHeight,
        backgroundColor: BARLIVE_COLOR,
      }]} pointerEvents="none">
        <View style={[styles.solidBackground, {
          height: containerHeight,
          backgroundColor: BARLIVE_COLOR,
        }]} />
      </View>

      {/* Tab bar */}
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
    paddingVertical: Platform.OS === 'android' ? 4 : 8,
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
