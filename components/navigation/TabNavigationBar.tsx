
/**
 * TAB NAVIGATION BAR - v15.0.0 INSTAGRAM-STYLE WITH PROPER WEIGHT DISTINCTION
 * 
 * Modern, clean tab navigation bar with Instagram-style outlined/filled icon distinction.
 * Built from scratch with no legacy code.
 * 
 * 🔥 INSTAGRAM-STYLE v15.0.0:
 * - Inactive icons: Outlined (hollow), pure white, 100% opacity, regular weight
 * - Active icons: Filled, pure white, 100% opacity, semibold weight
 * - Icons are 32px (matching miniavatar size)
 * - Central "Explorar" button remains the same with gradient
 * - Visual distinction comes from icon variant AND weight
 * - Icons positioned slightly higher (reduced paddingTop and paddingVertical)
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
    console.log('🎯 [TabNavigationBar v15.0 INSTAGRAM-STYLE] Rendered with', tabs.length, 'tabs');
    console.log('📍 [TabNavigationBar] Current pathname:', pathname);
    tabs.forEach(tab => {
      const active = isTabActive(tab, pathname);
      console.log(`   ${active ? '✅ FILLED (active, semibold)' : '⚪ OUTLINED (inactive, regular)'} ${tab.label} (${tab.id}) - 32px size`);
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

    // Center button (Explorar) - remains the same with gradient
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
            colors={['#2DD4BF', '#06B6D4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.centerGradient, { opacity: 1 }]}
          >
            <TabIcon
              iosIconFilled={tab.iosIconFilled}
              iosIconOutlined={tab.iosIconOutlined}
              androidIconFilled={tab.androidIconFilled}
              androidIconOutlined={tab.androidIconOutlined}
              isActive={true} // Always show as active for center button
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

    // Regular tab with outlined/filled icon distinction
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
          iosIconFilled={tab.iosIconFilled}
          iosIconOutlined={tab.iosIconOutlined}
          androidIconFilled={tab.androidIconFilled}
          androidIconOutlined={tab.androidIconOutlined}
          isActive={isActive}
          size={32}
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

      {/* Tab buttons - positioned higher with 32px icons */}
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
    opacity: 1,
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
    opacity: 1,
  },
  svg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingTop: 2, // Reduced to position icons higher
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
    zIndex: 1,
    opacity: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4, // Reduced to position icons higher
    opacity: 1,
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
    opacity: 1,
  },
  centerGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    opacity: 1,
  },
  avatarContainer: {
    width: 32, // Match icon size
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    opacity: 1,
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
    opacity: 1,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
