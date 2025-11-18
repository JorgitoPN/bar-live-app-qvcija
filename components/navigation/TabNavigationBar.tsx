
/**
 * TAB NAVIGATION BAR - FIXED VERSION v20.0
 * 
 * Clean tab navigation bar with Instagram-style filled/outlined icons.
 * Active icons are filled with white, inactive icons are outlined with white.
 * 
 * FIX: Improved route matching logic to correctly detect active tabs
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/styles/commonStyles';
import { TabIcon } from './TabIcon';
import { TabDefinition } from './TabConfig';

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

  const isTabActive = (tab: TabDefinition, currentPath: string): boolean => {
    // Clean up paths for comparison
    const cleanRoute = tab.route.replace(/^\//, '').replace(/\/$/, '');
    const cleanPath = currentPath.replace(/^\//, '').replace(/\/$/, '');

    console.log(`🔍 [TabNav v20.0] Checking tab "${tab.id}": route="${cleanRoute}", path="${cleanPath}"`);

    // Special case: gestion tab is active when viewing local profiles
    if (tab.id === 'gestion' && cleanPath.startsWith('perfil/local')) {
      console.log(`✅ [TabNav v20.0] Tab "${tab.id}" is ACTIVE (special case: perfil/local)`);
      return true;
    }

    // Special case: perfil tab is NOT active when viewing local profiles
    if (tab.id === 'perfil' && cleanPath.startsWith('perfil/local')) {
      console.log(`❌ [TabNav v20.0] Tab "${tab.id}" is INACTIVE (special case: perfil/local)`);
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
        console.log(`✅ [TabNav v20.0] Tab "${tab.id}" is ACTIVE (segment match: "${mainRouteSegment}")`);
        return true;
      }
    }

    // Fallback: check if path starts with route
    if (cleanPath.startsWith(cleanRoute)) {
      console.log(`✅ [TabNav v20.0] Tab "${tab.id}" is ACTIVE (prefix match)`);
      return true;
    }

    // Check exact match
    if (cleanPath === cleanRoute || cleanPath === `${cleanRoute}/index`) {
      console.log(`✅ [TabNav v20.0] Tab "${tab.id}" is ACTIVE (exact match)`);
      return true;
    }

    console.log(`❌ [TabNav v20.0] Tab "${tab.id}" is INACTIVE`);
    return false;
  };

  const handleTabPress = (tab: TabDefinition) => {
    console.log(`🔘 [TabNav v20.0] Tab pressed: "${tab.id}" -> ${tab.route}`);
    if (tab.id === 'perfil' && onProfilePress) {
      onProfilePress();
    } else {
      router.push(tab.route as any);
    }
  };

  const renderTab = (tab: TabDefinition) => {
    const isActive = isTabActive(tab, pathname);
    const isCenter = tab.id === 'explorar';

    console.log(`🎨 [TabNav v20.0] Rendering tab "${tab.id}": isActive=${isActive}, isCenter=${isCenter}`);

    // Center button (Explorar)
    if (isCenter) {
      return (
        <TouchableOpacity
          key={tab.id}
          onPress={() => handleTabPress(tab)}
          style={styles.centerButton}
          activeOpacity={0.7}
        >
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
        </TouchableOpacity>
      );
    }

    // Profile tab with avatar
    if (tab.id === 'perfil') {
      return (
        <TouchableOpacity
          key={tab.id}
          onPress={() => handleTabPress(tab)}
          style={styles.tab}
          activeOpacity={0.7}
        >
          <View style={[styles.avatarContainer, isActive && styles.avatarContainerActive]}>
            {activeProfileAvatar ? (
              <Image
                source={{ uri: activeProfileAvatar }}
                style={styles.avatar}
                resizeMode="cover"
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
        </TouchableOpacity>
      );
    }

    // Regular tab
    return (
      <TouchableOpacity
        key={tab.id}
        onPress={() => handleTabPress(tab)}
        style={styles.tab}
        activeOpacity={0.7}
      >
        <TabIcon
          iosIconFilled={tab.iosIconFilled}
          iosIconOutlined={tab.iosIconOutlined}
          androidIconFilled={tab.androidIconFilled}
          androidIconOutlined={tab.androidIconOutlined}
          isActive={isActive}
          size={28}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.backgroundContainer} pointerEvents="none">
        <Svg
          width="100%"
          height="80"
          viewBox="0 0 375 80"
          preserveAspectRatio="none"
          style={styles.svg}
        >
          <Path
            d="M0,0 H375 V80 H0 Z"
            fill={colors.primary}
          />
        </Svg>
      </View>

      <View style={styles.tabBar} pointerEvents="box-none">
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
    elevation: 10,
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
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
    zIndex: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
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
    elevation: 10,
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
