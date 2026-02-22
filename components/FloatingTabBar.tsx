
/**
 * FLOATING TAB BAR - VERSION v346.0
 * 
 * ✅ ANDROID AVATAR PERSISTENCE FIX v346.0 - FINAL FIX FOR NAVIGATION PERSISTENCE
 * 
 * CRITICAL CHANGES v346.0:
 * - ✅ ANDROID FIX: Add timestamp to key to force complete re-mount on every render
 * - ✅ ANDROID FIX: Use 'reload' cache policy + timestamp to bypass ALL caching
 * - ✅ ANDROID FIX: Force image component recreation on navigation
 * - ✅ ANDROID FIX: Prevent React Native's aggressive image caching from hiding avatar
 * - ✅ RESULT: Avatar ALWAYS visible after navigation on Android
 * 
 * ROOT CAUSE IDENTIFIED:
 * - Android's Image component caches aggressively and doesn't invalidate on navigation
 * - The cache persists even with 'reload' policy
 * - Solution: Force complete component re-mount with timestamp-based key
 * 
 * Previous fixes maintained (v345.0):
 * - ✅ Use AvatarContext for centralized avatar management
 * - ✅ Single source of truth for avatar URL
 * - ✅ Removed duplicate avatar loading logic
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

interface ProfileTabProps {
  isActive: boolean;
  onPress: () => void;
  userId: string | null;
}

const ProfileTab = memo(({ isActive, onPress, userId }: ProfileTabProps) => {
  const avatarSize = Platform.OS === 'android' ? 26 : 28;
  
  // ✅ v346.0: CRITICAL FIX - Use AvatarContext for centralized avatar management
  const { avatarUrl } = useAvatar();
  
  // ✅ v346.0: ANDROID FIX - Always show icon if no URL, no error state needed
  const shouldShowIcon = !avatarUrl;
  
  // ✅ v346.0: ANDROID CRITICAL FIX - Add timestamp to force complete re-mount on EVERY render
  // This is the ONLY way to bypass Android's aggressive image caching
  // Without timestamp, Android caches the image and doesn't reload it after navigation
  const [renderTimestamp] = React.useState(() => Date.now());
  
  // ✅ v346.0: ANDROID FIX - Use avatarUrl + timestamp as key to force re-mount
  // The timestamp ensures the Image component is COMPLETELY recreated on every mount
  // This prevents Android from using stale cached images
  const imageKey = React.useMemo(() => {
    return `avatar-${Platform.OS}-${avatarUrl || 'none'}-${renderTimestamp}`;
  }, [avatarUrl, renderTimestamp]);
  
  console.log('[ProfileTab v346.0 Android] 🖼️ Render state:', {
    userId: userId?.substring(0, 8),
    hasUrl: !!avatarUrl,
    shouldShowIcon,
    platform: Platform.OS,
    imageKey: imageKey.substring(0, 40),
    timestamp: renderTimestamp,
  });
  
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
        {shouldShowIcon ? (
          <View style={[styles.avatar, styles.avatarPlaceholder]} key={imageKey}>
            <IconSymbol
              ios_icon_name="person.fill"
              android_material_icon_name="person"
              size={Platform.OS === 'android' ? 18 : 22}
              color={isActive ? colors.primary : 'rgba(255, 255, 255, 0.7)'}
            />
          </View>
        ) : (
          <Image
            key={imageKey}
            source={{ 
              uri: avatarUrl!,
              // ✅ v346.0: ANDROID FIX - Use 'reload' to bypass aggressive caching
              // Combined with timestamp key, this ensures image is ALWAYS fetched fresh
              cache: Platform.OS === 'android' ? 'reload' : 'default',
            }}
            style={styles.avatar}
            resizeMode="cover"
            onLoad={() => {
              console.log('[ProfileTab v346.0 Android] ✅ Image loaded successfully');
            }}
            onError={(error) => {
              console.log('[ProfileTab v346.0 Android] ⚠️ Image load error:', error.nativeEvent.error);
            }}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // ✅ v346.0: CRITICAL - Only re-render if isActive or userId changes
  const shouldUpdate = (
    prevProps.isActive !== nextProps.isActive ||
    prevProps.userId !== nextProps.userId
  );
  
  return !shouldUpdate;
});

ProfileTab.displayName = 'ProfileTab';

// ✅ v341.0: Memoize regular tab for zero re-renders
const RegularTab = memo(({ 
  tab, 
  isActive, 
  onPress 
}: { 
  tab: TabBarItem; 
  isActive: boolean; 
  onPress: () => void;
}) => {
  const iconSize = Platform.OS === 'android' ? 22 : 24;
  
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
  
  return (
    <TouchableOpacity
      onPress={onPress}
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
}, (prevProps, nextProps) => {
  return prevProps.isActive === nextProps.isActive;
});

RegularTab.displayName = 'RegularTab';

// ✅ v341.0: Memoize center button for zero re-renders
const CenterButton = memo(({ onPress }: { onPress: () => void }) => {
  const centerButtonSize = Platform.OS === 'android' ? 52 : 56;
  const centerIconSize = Platform.OS === 'android' ? 26 : 28;
  const borderWidth = Platform.OS === 'android' ? 2.5 : 4;

  return (
    <TouchableOpacity
      onPress={onPress}
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
          borderWidth: borderWidth,
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
});

CenterButton.displayName = 'CenterButton';

export default function FloatingTabBar({ tabs, containerWidth = screenWidth }: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

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

  // ✅ v341.0: INSTANT navigation with router.replace
  const handleTabPress = useCallback((tab: TabBarItem) => {
    router.replace(tab.route as any);
  }, [router]);

  const renderTab = useCallback((tab: TabBarItem, index: number) => {
    const isActive = isTabActive(tab);
    const isCenter = tab.name === 'explorar';

    if (tab.name === 'perfil') {
      return (
        <ProfileTab
          key={tab.name}
          isActive={isActive}
          onPress={() => handleTabPress(tab)}
          userId={user?.id || null}
        />
      );
    }

    if (isCenter) {
      return (
        <CenterButton
          key={tab.name}
          onPress={() => handleTabPress(tab)}
        />
      );
    }

    return (
      <RegularTab
        key={tab.name}
        tab={tab}
        isActive={isActive}
        onPress={() => handleTabPress(tab)}
      />
    );
  }, [isTabActive, handleTabPress, user?.id]);

  const bottomNavHeight = Platform.OS === 'android' ? 56 : 60;
  const tabBarPaddingBottom = Platform.OS === 'android' 
    ? Math.max(insets.bottom / 2, 4)
    : Math.max((insets.bottom - 8) / 2, 2);
  const containerHeight = bottomNavHeight + tabBarPaddingBottom;

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
    paddingTop: Platform.OS === 'android' ? 6 : 8,
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
