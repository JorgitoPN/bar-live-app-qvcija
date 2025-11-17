
/**
 * TAB NAVIGATION BAR - v4.0.0
 * 
 * Modern, clean tab navigation bar with EXTREME active state visibility.
 * Built from scratch with no legacy code.
 * 
 * ✅ ENHANCED v4.0.0:
 * - Much more visible inactive icons (80% opacity)
 * - EXTREME active state indication with triple glow effect
 * - Central "Explorar" button: LESS prominent, more subtle gradient
 * - Profile avatar has EXTREME active state with massive glow
 * - 5X greater distinction between active and inactive states
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
    console.log('🎯 [TabNavigationBar v4.0] Rendered with', tabs.length, 'tabs');
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

    // Center button (Explorar) - LESS prominent, more subtle
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
            colors={['rgba(45, 212, 191, 0.85)', 'rgba(6, 182, 212, 0.85)']} // More subtle, less bright
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.centerGradient}
          >
            <TabIcon
              iosIcon={tab.iosIcon}
              androidIcon={tab.androidIcon}
              isActive={false} // Don't use active state for center button
              size={30} // Slightly smaller
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
            {/* EXTREME active state glow */}
            {isActive && (
              <>
                <View style={styles.avatarGlowOuter} />
                <View style={styles.avatarGlowMiddle} />
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
    width: 60, // Smaller (was 68)
    height: 60, // Smaller (was 68)
    marginTop: -30, // Adjusted for smaller size
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, // Less shadow
    shadowOpacity: 0.25, // Less shadow
    shadowRadius: 8, // Less shadow
    elevation: 10, // Less elevation
  },
  centerGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3, // Thinner border (was 5)
    borderColor: 'rgba(255, 255, 255, 0.9)', // Slightly transparent border
  },
  avatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarContainerActive: {
    borderWidth: 5, // Thicker border for extreme visibility
    borderColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 25,
  },
  avatarGlowOuter: {
    position: 'absolute',
    top: -18,
    left: -18,
    right: -18,
    bottom: -18,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 35,
    elevation: 20,
    zIndex: -1,
  },
  avatarGlowMiddle: {
    position: 'absolute',
    top: -14,
    left: -14,
    right: -14,
    bottom: -14,
    borderRadius: 33,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 22,
    zIndex: -1,
  },
  avatarGlowInner: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 29,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 24,
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
