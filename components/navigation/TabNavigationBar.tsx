
/**
 * TAB NAVIGATION BAR - v7.0.0
 * 
 * Modern, clean tab navigation bar with Instagram-style active state visibility.
 * Built from scratch with no legacy code.
 * 
 * ✅ INSTAGRAM-STYLE v7.0.0:
 * - Central "Explorar" button: NO transparency, fully opaque
 * - Icons and mini-avatar: 36px
 * - Inactive icons: 40% opacity (clearly visible, just softened)
 * - Active icons: 100% opacity (pure white, no transparency)
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
    console.log('🎯 [TabNavigationBar v7.0] Rendered with', tabs.length, 'tabs');
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

    // Center button (Explorar) - NO transparency, fully opaque
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
            colors={['#2DD4BF', '#06B6D4']} // Fully opaque colors, no transparency
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.centerGradient}
          >
            <TabIcon
              iosIcon={tab.iosIcon}
              androidIcon={tab.androidIcon}
              isActive={false} // Don't use active state for center button
              size={28}
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
                  size={18}
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
    borderColor: '#FFFFFF', // Fully opaque white border
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarContainerActive: {
    borderWidth: 3,
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
