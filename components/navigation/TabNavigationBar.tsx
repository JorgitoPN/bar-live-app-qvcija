
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, Image } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { TabBarItem } from './useTabNavigation';
import { BlurView } from 'expo-blur';

interface TabNavigationBarProps {
  tabs: TabBarItem[];
  activeProfileAvatar?: string | null;
  onProfilePress?: () => void;
}

/**
 * ✅ TAB NAVIGATION BAR v56.0 - ANDROID-iOS PARITY FIX
 * 
 * CRITICAL FIXES v56.0:
 * - ✅ Reduced tab bar height on Android from 70px to 56px
 * - ✅ Reduced icon size from 28px to 24px
 * - ✅ Reduced label font size from 11px to 10px
 * - ✅ Optimized padding and spacing
 * - ✅ Better visual balance matching iOS
 */

export function TabNavigationBar({ tabs, activeProfileAvatar, onProfilePress }: TabNavigationBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isActive = (route: string) => {
    if (route === '/(tabs)/explorar') {
      return pathname === '/(tabs)/explorar' || pathname === '/explorar';
    }
    if (route === '/(tabs)/eventos') {
      return pathname === '/(tabs)/eventos' || pathname === '/eventos';
    }
    if (route === '/(tabs)/favoritos') {
      return pathname === '/(tabs)/favoritos' || pathname === '/favoritos';
    }
    if (route === '/(tabs)/social') {
      return pathname === '/(tabs)/social' || pathname === '/social';
    }
    if (route === '/(tabs)/perfil') {
      return pathname === '/(tabs)/perfil' || pathname === '/perfil';
    }
    if (route === '/(tabs)/gestion') {
      return pathname === '/(tabs)/gestion' || pathname === '/gestion';
    }
    if (route === '/(tabs)/admin') {
      return pathname === '/(tabs)/admin' || pathname === '/admin';
    }
    return pathname === route;
  };

  const handleTabPress = (route: string, name: string) => {
    if (name === 'perfil' && onProfilePress) {
      onProfilePress();
    } else {
      router.push(route as any);
    }
  };

  // ✅ ANDROID FIX v56.0: Reduced height from 70 to 56
  const TAB_BAR_HEIGHT = 56;
  const totalHeight = TAB_BAR_HEIGHT + insets.bottom;

  return (
    <View 
      style={[
        styles.container,
        { 
          height: totalHeight,
          paddingBottom: insets.bottom,
        }
      ]}
      pointerEvents="box-none"
    >
      <BlurView intensity={95} tint="light" style={styles.blurContainer}>
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const active = isActive(tab.route);
            const isPerfil = tab.name === 'perfil';

            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.tab}
                onPress={() => handleTabPress(tab.route, tab.name)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, active && styles.iconContainerActive]}>
                  {isPerfil && activeProfileAvatar ? (
                    <View style={styles.avatarContainer}>
                      <Image
                        source={{ uri: activeProfileAvatar }}
                        style={styles.avatar}
                      />
                      {active && <View style={styles.avatarBorder} />}
                    </View>
                  ) : (
                    <IconSymbol
                      ios_icon_name={tab.icon as any}
                      android_material_icon_name={tab.icon as any}
                      size={24}
                      color={active ? colors.primary : colors.textSecondary}
                    />
                  )}
                </View>
                <Text style={[styles.label, active && styles.labelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999999,
    elevation: 999,
  },
  blurContainer: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 4,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  iconContainerActive: {
    // Active state handled by icon color
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  avatarContainer: {
    position: 'relative',
    width: 32,
    height: 32,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.primary,
  },
});
