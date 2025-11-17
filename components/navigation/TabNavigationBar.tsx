
/**
 * TAB NAVIGATION BAR - v3.0.0
 * 
 * Modern, clean tab navigation bar with CRYSTAL CLEAR active state visibility.
 * Built from scratch with no legacy code.
 * 
 * ✅ ENHANCED v3.0.0:
 * - Much more visible inactive icons (60% opacity instead of 35%)
 * - Stronger active state indication with double glow effect
 * - Central "Explorar" button stands out with solid gradient
 * - Profile avatar has clear active state with thick border
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/styles/commonStyles';
import { TabIcon } from './TabIcon';
import { TabDefinition } from './TabConfig';

const { width } = Dimensions.get('window');

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

  useEffect(() => {
    console.log('🎯 [TabNavigationBar v3.0] Rendered with', tabs.length, 'tabs');
    console.log('📍 [TabNavigationBar] Current pathname:', pathname);
    tabs.forEach(tab => {
      const active = isTabActive(tab, pathname);
      console.log(`   ${active ? '✅ ACTIVE' : '⚪ inactive'} ${tab.label} (${tab.id})`);
    });
  }, [pathname, tabs]);

  const isTabActive = (tab: TabDefinition, currentPath: string): boolean => {
    // Normalize paths
    const cleanRoute = tab.route.replace(/^\//, '').replace(/\/$/, '');
    const cleanPath = currentPath.replace(/^\//, '').replace(/\/$/, '');

    // Special handling for perfil/local when in gestion tab
    if (tab.id === 'gestion' && cleanPath.startsWith('perfil/local')) {
      return true;
    }

    // Special handling for perfil tab - don't match perfil/local
    if (tab.id === 'perfil' && cleanPath.startsWith('perfil/local')) {
      return false;
    }

    // Check if current path starts with tab route
    if (cleanPath.startsWith(cleanRoute)) {
      return true;
    }

    // Check if we're on the index of this tab
    if (cleanPath === cleanRoute || cleanPath === `${cleanRoute}/index`) {
      return true;
    }

    return false;
  };

  const handleTabPress = (tab: TabDefinition) => {
    console.log('🔄 [TabNavigationBar] Tab pressed:', tab.label, '→', tab.route);
    
    if (tab.id === 'perfil' && onProfilePress) {
      onProfilePress();
    } else {
      router.push(tab.route as any);
    }
  };

  const renderTab = (tab: TabDefinition) => {
    const isActive = isTabActive(tab, pathname);
    const isCenter = tab.id === 'explorar';

    // Center button (Explorar) with special styling - NO transparency, stands out
    if (isCenter) {
      return (
        <TouchableOpacity
          key={tab.id}
          onPress={() => handleTabPress(tab)}
          style={styles.centerButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={tab.label}
          accessibilityState={{ selected: isActive }}
        >
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.centerGradient}
          >
            <TabIcon
              iosIcon={tab.iosIcon}
              androidIcon={tab.androidIcon}
              isActive={true}
              size={34}
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
          accessibilityRole="button"
          accessibilityLabel={tab.label}
          accessibilityState={{ selected: isActive }}
        >
          <View style={[styles.avatarContainer, isActive && styles.avatarContainerActive]}>
            {/* Strong active state glow */}
            {isActive && (
              <>
                <View style={styles.avatarGlowOuter} />
                <View style={styles.avatarGlowInner} />
              </>
            )}
            
            {activeProfileAvatar ? (
              <Image
                source={{ uri: activeProfileAvatar }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <TabIcon
                  iosIcon="person.fill"
                  androidIcon="person"
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
        accessibilityRole="button"
        accessibilityLabel={tab.label}
        accessibilityState={{ selected: isActive }}
      >
        <TabIcon
          iosIcon={tab.iosIcon}
          androidIcon={tab.androidIcon}
          isActive={isActive}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Background with shadow */}
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

      {/* Tab buttons */}
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
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
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
    width: 68,
    height: 68,
    marginTop: -34,
    borderRadius: 34,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
  centerGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: colors.white,
  },
  avatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarContainerActive: {
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 20,
  },
  avatarGlowOuter: {
    position: 'absolute',
    top: -12,
    left: -12,
    right: -12,
    bottom: -12,
    borderRadius: 31,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 15,
    zIndex: -1,
  },
  avatarGlowInner: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 18,
    zIndex: -1,
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
