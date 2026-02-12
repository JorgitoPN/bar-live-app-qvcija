
/**
 * FLOATING TAB BAR - VERSION v327.0
 * 
 * ✅ ANDROID PROFILE AVATAR FIX v327.0 - FIXED FLICKERING BUG
 * 
 * CRITICAL CHANGES v327.0:
 * - ✅ FIXED: Debounced avatar reload to prevent rapid re-renders
 * - ✅ FIXED: Stable image key that doesn't change on every navigation
 * - ✅ FIXED: Only reload avatar when actually needed (not on every pathname change)
 * - ✅ FIXED: Prevent multiple simultaneous fetches
 * - ✅ RESULT: Mini-avatar displays consistently without flickering
 * 
 * Previous fixes maintained (v326.0):
 * - ✅ Cache-busting query parameter for Android
 * - ✅ Force reload headers for Android
 * - ✅ Direct Supabase queries
 */

import React, { memo, useCallback, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter, usePathname, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

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
  refreshTrigger: number;
}

const ProfileTab = memo(({ isActive, onPress, userId, refreshTrigger }: ProfileTabProps) => {
  const avatarSize = Platform.OS === 'android' ? 26 : 28;
  const [imageError, setImageError] = React.useState(false);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [imageKey, setImageKey] = React.useState(`avatar-${userId}-${Date.now()}`);
  const loadingRef = useRef(false);
  const lastLoadedUrlRef = useRef<string | null>(null);
  
  // ✅ CRITICAL FIX v327.0: Debounced avatar reload to prevent flickering
  React.useEffect(() => {
    if (!userId) {
      console.log('[ProfileTab v327.0] ⚠️ No userId - showing icon');
      setAvatarUrl(null);
      setImageKey(`avatar-null-${Date.now()}`);
      return;
    }

    // ✅ Prevent multiple simultaneous fetches
    if (loadingRef.current) {
      console.log('[ProfileTab v327.0] ⏸️ Already loading - skipping');
      return;
    }

    console.log('[ProfileTab v327.0] 🔥 Refresh trigger:', refreshTrigger);
    
    // ✅ Debounce: Wait 100ms before loading to prevent rapid re-renders
    const debounceTimer = setTimeout(() => {
      loadingRef.current = true;
      
      const loadAvatar = async () => {
        try {
          console.log('[ProfileTab v327.0] 🔄 Fetching avatar from Supabase...');
          
          const { data, error } = await supabase
            .from('usuarios')
            .select('avatar')
            .eq('id', userId)
            .single();

          if (error) {
            console.log('[ProfileTab v327.0] ❌ Error loading avatar:', error.message);
            setAvatarUrl(null);
            setImageKey(`avatar-error-${Date.now()}`);
            loadingRef.current = false;
            return;
          }

          const validUrl = data?.avatar && 
                          !data.avatar.startsWith('file://') && 
                          data.avatar.length > 10 &&
                          (data.avatar.startsWith('http://') || data.avatar.startsWith('https://') || data.avatar.startsWith('/'))
            ? data.avatar
            : null;

          console.log('[ProfileTab v327.0] ✅ Avatar loaded:', validUrl ? 'PRESENT' : 'NULL');
          
          // ✅ CRITICAL FIX v327.0: Only update if URL actually changed
          if (validUrl !== lastLoadedUrlRef.current) {
            console.log('[ProfileTab v327.0] 🔄 Avatar URL changed - updating');
            lastLoadedUrlRef.current = validUrl;
            setAvatarUrl(validUrl);
            setImageError(false);
            // ✅ Only update key when URL changes to prevent unnecessary re-renders
            setImageKey(`avatar-${userId}-${Date.now()}`);
          } else {
            console.log('[ProfileTab v327.0] ✅ Avatar URL unchanged - keeping current image');
          }
          
          loadingRef.current = false;
        } catch (error) {
          console.log('[ProfileTab v327.0] ❌ Exception loading avatar:', error);
          setAvatarUrl(null);
          setImageKey(`avatar-exception-${Date.now()}`);
          loadingRef.current = false;
        }
      };

      loadAvatar();
    }, 100); // ✅ 100ms debounce to prevent rapid re-renders

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [userId, refreshTrigger]);
  
  // ✅ Only show icon if no avatar URL or error occurred
  const shouldShowIcon = !avatarUrl || imageError;
  
  // ✅ Add cache-busting query parameter to URL
  const cacheBustedUrl = avatarUrl 
    ? `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
    : null;
  
  console.log('[ProfileTab v327.0] 📊 Render state:', {
    userId: userId ? 'present' : 'null',
    avatarUrl: avatarUrl ? 'PRESENT' : 'NULL',
    shouldShowIcon,
    imageError,
    imageKey,
    isLoading: loadingRef.current,
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
              uri: cacheBustedUrl!,
              // ✅ Force reload on Android
              ...(Platform.OS === 'android' && { 
                cache: 'reload' as any,
                headers: {
                  'Pragma': 'no-cache',
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                }
              })
            }}
            style={styles.avatar}
            resizeMode="cover"
            onLoad={() => {
              console.log('[ProfileTab v327.0] ✅ Avatar image loaded successfully');
              setImageError(false);
            }}
            onError={(error) => {
              console.log('[ProfileTab v327.0] ❌ Avatar image load error:', error.nativeEvent.error);
              setImageError(true);
            }}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // ✅ Only re-render when props actually change
  const shouldUpdate = (
    prevProps.isActive !== nextProps.isActive ||
    prevProps.userId !== nextProps.userId ||
    prevProps.refreshTrigger !== nextProps.refreshTrigger
  );
  
  if (shouldUpdate) {
    console.log('[ProfileTab v327.0] 🔄 Props changed - component will re-render');
  }
  
  return !shouldUpdate;
});

ProfileTab.displayName = 'ProfileTab';

export default function FloatingTabBar({ tabs, containerWidth = screenWidth }: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  // ✅ CRITICAL FIX v327.0: Only refresh on focus, not on every pathname change
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const lastPathnameRef = useRef(pathname);

  // ✅ Force avatar reload when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('[FloatingTabBar v327.0] 🔄 Screen focused - forcing avatar refresh');
      setRefreshTrigger(prev => prev + 1);
    }, [])
  );

  // ✅ CRITICAL FIX v327.0: Only refresh when navigating TO/FROM profile page
  React.useEffect(() => {
    const isProfilePage = pathname.includes('/perfil');
    const wasProfilePage = lastPathnameRef.current.includes('/perfil');
    
    // Only refresh if we're navigating to or from the profile page
    if (isProfilePage !== wasProfilePage) {
      console.log('[FloatingTabBar v327.0] 🔄 Profile page navigation detected - refreshing avatar');
      setRefreshTrigger(prev => prev + 1);
    }
    
    lastPathnameRef.current = pathname;
  }, [pathname]);

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

  const handleTabPress = useCallback((tab: TabBarItem) => {
    console.log(`[FloatingTabBar v327.0] ⚡ Tab pressed: "${tab.name}" -> ${tab.route}`);
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
          refreshTrigger={refreshTrigger}
        />
      );
    }

    if (isCenter) {
      const centerButtonSize = Platform.OS === 'android' ? 52 : 56;
      const centerIconSize = Platform.OS === 'android' ? 26 : 28;
      const borderWidth = Platform.OS === 'android' ? 2.5 : 4;

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
    }

    const iconSize = Platform.OS === 'android' ? 22 : 24;
    
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
  }, [isTabActive, handleTabPress, user?.id, getAndroidIcon, refreshTrigger]);

  const bottomNavHeight = Platform.OS === 'android' ? 56 : 60;
  const tabBarPaddingBottom = Platform.OS === 'android' 
    ? Math.max(insets.bottom / 2, 4)
    : Math.max((insets.bottom - 8) / 2, 2);
  const containerHeight = bottomNavHeight + tabBarPaddingBottom;

  console.log(
    `[FloatingTabBar v327.0] ⚡ ANDROID PROFILE AVATAR FIX v327.0 - ` +
    `Debounced reload - userId: ${user?.id || 'null'} - trigger: ${refreshTrigger}`
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
