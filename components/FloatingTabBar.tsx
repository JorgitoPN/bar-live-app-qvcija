
/**
 * FLOATING TAB BAR - VERSION v349.0
 * 
 * ✅ ANDROID AVATAR PERSISTENCE FIX v349.0 - TRUNCATED URL PROTECTION
 * 
 * CRITICAL CHANGES v349.0:
 * - ✅ ANDROID FIX: Validate avatar URL to reject truncated URLs
 * - ✅ ANDROID FIX: Detect Supabase storage URL truncation
 * - ✅ ANDROID FIX: Show icon fallback for invalid/truncated URLs
 * - ✅ RESULT: Avatar displays correctly or shows fallback icon
 * 
 * ROOT CAUSE IDENTIFIED:
 * - Avatar URLs were being truncated in the data flow
 * - Truncated: https://...supabase.co/storage/v (invalid)
 * - Full: https://...supabase.co/storage/v1/object/public/... (valid)
 * - Solution: Validate URL before rendering Image component
 * 
 * Previous fixes maintained (v348.0):
 * - ✅ ANDROID FIX: Removed React.memo from ProfileTab (was blocking updates)
 * - ✅ ANDROID FIX: Direct pathname dependency in useEffect
 * - ✅ ANDROID FIX: Force Image remount on EVERY navigation
 * - ✅ ANDROID FIX: Simplified key generation with pathname hash
 * 
 * Previous fixes maintained (v345.0-v347.0):
 * - ✅ Use AvatarContext for centralized avatar management
 * - ✅ Single source of truth for avatar URL
 * - ✅ Timestamp-based key regeneration
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
  pathname: string; // ✅ v348.0: Track pathname to detect navigation
}

// ✅ v349.0: CRITICAL FIX - Validate avatar URL to prevent truncated URLs
const isValidAvatarUrl = (url: string | null): boolean => {
  if (!url) return false;
  if (url.length < 10) return false;
  
  // ✅ CRITICAL: Reject truncated Supabase storage URLs
  // Full URL: https://embntaqwlwmgazvrglaf.supabase.co/storage/v1/object/public/...
  // Truncated URL: https://embntaqwlwmgazvrglaf.supabase.co/storage/v
  if (url.includes('supabase.co/storage/v') && !url.includes('/object/')) {
    if (Platform.OS === 'android') {
      console.log('[ProfileTab v349.0 Android] ❌ Rejected truncated URL:', url.substring(0, 60));
    }
    return false;
  }
  
  return url.startsWith('http://') || url.startsWith('https://');
};

// ✅ v348.0: CRITICAL FIX - REMOVED React.memo
// React.memo was preventing re-renders even with pathname changes
// Let React handle natural re-renders for avatar persistence
const ProfileTab = ({ isActive, onPress, userId, pathname }: ProfileTabProps) => {
  const avatarSize = Platform.OS === 'android' ? 26 : 28;
  
  // ✅ v348.0: CRITICAL FIX - Use AvatarContext for centralized avatar management
  const { avatarUrl } = useAvatar();
  
  // ✅ v349.0: ANDROID FIX - Validate URL and show icon if invalid/truncated
  const isValidUrl = isValidAvatarUrl(avatarUrl);
  const shouldShowIcon = !isValidUrl;
  
  // ✅ v348.0: ANDROID CRITICAL FIX - Generate NEW timestamp when pathname OR avatarUrl changes
  // This ensures the Image component is COMPLETELY recreated after navigation
  const [renderTimestamp, setRenderTimestamp] = React.useState(() => Date.now());
  
  // ✅ v349.0: CRITICAL - Regenerate timestamp when pathname OR avatarUrl changes
  React.useEffect(() => {
    const newTimestamp = Date.now();
    setRenderTimestamp(newTimestamp);
    
    if (Platform.OS === 'android') {
      console.log('[ProfileTab v349.0 Android] 🔄 Navigation/Avatar change detected:', {
        pathname: pathname.substring(0, 30),
        hasAvatar: !!avatarUrl,
        isValidUrl,
        avatarUrl: avatarUrl?.substring(0, 60),
        timestamp: newTimestamp,
      });
    }
  }, [pathname, avatarUrl, isValidUrl]); // ✅ Regenerate on navigation OR avatar change
  
  // ✅ v348.0: ANDROID FIX - Simplified key with pathname hash for uniqueness
  // Include pathname in key to force complete remount on navigation
  const pathnameHash = pathname.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const imageKey = `avatar-${Platform.OS}-${pathnameHash}-${renderTimestamp}`;
  
  if (Platform.OS === 'android') {
    console.log('[ProfileTab v349.0 Android] 🖼️ Render:', {
      userId: userId?.substring(0, 8),
      hasUrl: !!avatarUrl,
      isValidUrl,
      avatarUrl: avatarUrl?.substring(0, 60),
      shouldShowIcon,
      pathname: pathname.substring(0, 30),
      imageKey: imageKey.substring(0, 50),
    });
  }
  
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
              // ✅ v349.0: ANDROID FIX - Force reload to bypass cache
              cache: Platform.OS === 'android' ? 'reload' : 'default',
            }}
            style={styles.avatar}
            resizeMode="cover"
            onLoad={() => {
              if (Platform.OS === 'android') {
                console.log('[ProfileTab v349.0 Android] ✅ Image loaded successfully:', avatarUrl?.substring(0, 60));
              }
            }}
            onError={(error) => {
              if (Platform.OS === 'android') {
                console.log('[ProfileTab v349.0 Android] ⚠️ Image load error:', {
                  error: error.nativeEvent.error,
                  url: avatarUrl?.substring(0, 60),
                });
              }
            }}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

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
          pathname={pathname} // ✅ v347.0: Pass pathname to detect navigation
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
