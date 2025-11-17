
/**
 * TAB NAVIGATION BAR - v10.0.0 INSTAGRAM-EXACT
 * 
 * Modern, clean tab navigation bar with EXACT Instagram-style active state visibility.
 * Built from scratch with no legacy code.
 * 
 * 🔥 INSTAGRAM-EXACT v10.0.0:
 * - Central "Explorar" button: NO transparency, fully opaque
 * - Icons and mini-avatar: 36px
 * - Inactive icons: 40% opacity (rgba(255,255,255,0.4)) - clearly visible, just softened
 * - Active icons: 100% opacity (#FFFFFF) - pure white, NO transparency
 * - NO filters, NO parent opacity, maximum contrast
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
    console.log('🎯 [TabNavigationBar v10.0 INSTAGRAM-EXACT] Rendered with', tabs.length, 'tabs');
    console.log('📍 [TabNavigationBar] Current pathname:', pathname);
    tabs.forEach(tab => {
      const active = isTabActive(tab, pathname);
      console.log(`   ${active ? '✅ ACTIVE (#FFFFFF 100%)' : '⚪ INACTIVE (rgba(255,255,255,0.4))'} ${tab.label} (${tab.id})`);
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
          style={[styles.centerButton, { opacity: 1 }]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={tab.label}
          accessibilityState={{ selected: isActive }}
        >
          <LinearGradient
            colors={['#2DD4BF', '#06B6D4']} // Fully opaque colors, no transparency
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.centerGradient, { opacity: 1 }]}
          >
            <TabIcon
              iosIcon={tab.iosIcon}
              androidIcon={tab.androidIcon}
              isActive={true} // Always show as active for center button
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
          style={[styles.tab, { opacity: 1 }]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={tab.label}
          accessibilityState={{ selected: isActive }}
        >
          <View style={[styles.avatarContainer, isActive && styles.avatarContainerActive, { opacity: 1 }]}>
            {activeProfileAvatar ? (
              <Image
                source={{ uri: activeProfileAvatar }}
                style={[styles.avatar, { opacity: 1 }]}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { opacity: 1 }]}>
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
        style={[styles.tab, { opacity: 1 }]}
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
    <View style={[styles.container, { opacity: 1 }]} pointerEvents="box-none">
      {/* Background with shadow - NO opacity applied */}
      <View style={[styles.backgroundContainer, { opacity: 1 }]} pointerEvents="none">
        <Svg
          width="100%"
          height="80"
          viewBox="0 0 375 80"
          preserveAspectRatio="none"
          style={[styles.svg, { opacity: 1 }]}
        >
          <Path
            d="M0,0 H375 V80 H0 Z"
            fill={colors.primary}
          />
        </Svg>
      </View>

      {/* Tab buttons - NO opacity applied */}
      <View style={[styles.tabBar, { opacity: 1 }]} pointerEvents="box-none">
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
    opacity: 1, // Force 100% opacity - NO transparency on container
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
    opacity: 1, // Force 100% opacity - NO transparency
  },
  svg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 1, // Force 100% opacity - NO transparency
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
    opacity: 1, // Force 100% opacity - NO transparency
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    opacity: 1, // Force 100% opacity - NO transparency
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
    opacity: 1, // Force 100% opacity - NO transparency
  },
  centerGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF', // Fully opaque white border
    opacity: 1, // Force 100% opacity - NO transparency
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    opacity: 1, // Force 100% opacity - NO transparency
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
    opacity: 1, // Force 100% opacity - NO transparency
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
