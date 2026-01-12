
/**
 * FLOATING TAB BAR - VERSION v132.0
 * 
 * ✅ ANDROID MINIAVATAR FIX v132.0 - COMPLETE FIX
 * 
 * CRITICAL FIXES v132.0 (ANDROID ONLY):
 * - ✅ FIXED: Miniavatar now shows on ALL pages, not just profile
 * - ✅ FIXED: Avatar URL properly passed from AuthContext
 * - ✅ FIXED: Fallback icon displays when user not logged in
 * - ✅ FIXED: Consistent avatar display across all navigation
 * - ✅ iOS design remains unchanged (reference design)
 * 
 * Previous fixes maintained (v98.0):
 * - ✅ White strip above bottom menu eliminated
 * - ✅ Solid BarLive teal background throughout
 * - ✅ Proper z-index layering
 */

import React, { useEffect, useState } from 'react';
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

// ✅ CRITICAL FIX v98.0: Explicitly define BarLive color
const BARLIVE_COLOR = '#14B8A6';

export default function FloatingTabBar({ tabs, containerWidth = screenWidth }: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  console.log('[FloatingTabBar v132.0] 🎨 Android miniavatar fix - loading avatar for all pages');

  // ✅ CRITICAL FIX v132.0: Load avatar URL from database for ALL pages
  useEffect(() => {
    const loadAvatarUrl = async () => {
      if (!user?.id) {
        console.log('[FloatingTabBar v132.0] ❌ No user logged in, showing fallback icon');
        setAvatarUrl(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('avatar_url')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('[FloatingTabBar v132.0] ❌ Error loading avatar:', error);
          setAvatarUrl(null);
          return;
        }

        // ✅ Filter out file:// URLs and validate
        const isValidUrl = (url: string | null): boolean => {
          if (!url) return false;
          if (url.startsWith('file://')) return false;
          if (url.length < 10) return false;
          return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
        };

        const validUrl = isValidUrl(data?.avatar_url) ? data.avatar_url : null;
        
        console.log('[FloatingTabBar v132.0] ✅ Avatar loaded:', {
          userId: user.id,
          hasAvatar: !!validUrl,
          urlPreview: validUrl?.substring(0, 50) || 'none',
        });

        setAvatarUrl(validUrl);
      } catch (error) {
        console.error('[FloatingTabBar v132.0] ❌ Exception loading avatar:', error);
        setAvatarUrl(null);
      }
    };

    loadAvatarUrl();

    // ✅ Subscribe to avatar updates
    if (user?.id) {
      const channel = supabase
        .channel(`floating-tab-avatar-${user.id}-v132`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'usuarios',
            filter: `id=eq.${user.id}`,
          },
          (payload: any) => {
            console.log('[FloatingTabBar v132.0] 🔄 Avatar updated in real-time:', payload.new);
            const newUrl = payload.new?.avatar_url;
            if (newUrl && !newUrl.startsWith('file://')) {
              setAvatarUrl(newUrl);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

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
    console.log(`[FloatingTabBar v132.0] 🔘 Tab pressed: "${tab.name}" -> ${tab.route}`);
    router.push(tab.route as any);
  };

  const renderTab = (tab: TabBarItem, index: number) => {
    const isActive = isTabActive(tab);
    const isCenter = tab.name === 'explorar';

    // ✅ CRITICAL FIX v132.0: Profile tab with avatar from database
    if (tab.name === 'perfil') {
      const avatarSize = Platform.OS === 'android' ? 28 : 32;
      
      return (
        <TouchableOpacity
          key={tab.name}
          onPress={() => handleTabPress(tab)}
          style={styles.tab}
          activeOpacity={0.7}
        >
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
                  console.error('[FloatingTabBar v132.0] ❌ Avatar failed to load:', avatarUrl?.substring(0, 50), error.nativeEvent?.error);
                  setAvatarUrl(null); // Fallback to icon on error
                }}
                onLoad={() => {
                  console.log('[FloatingTabBar v132.0] ✅ Avatar loaded successfully');
                }}
              />
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

  // Calculate dimensions
  const bottomNavHeight = Platform.OS === 'android' ? 60 : 70;
  const tabBarPaddingBottom = Platform.OS === 'android' ? Math.max(insets.bottom, 8) : Math.max(insets.bottom, 12);
  const containerHeight = bottomNavHeight + tabBarPaddingBottom;

  console.log(
    `[FloatingTabBar v132.0] 📐 Dimensions: ` +
    `height=${containerHeight}, ` +
    `platform=${Platform.OS}, ` +
    `hasAvatar=${!!avatarUrl}, ` +
    `✅ v132.0: Miniavatar shows on ALL pages`
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
