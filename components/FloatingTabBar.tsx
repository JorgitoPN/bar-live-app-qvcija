
import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import UnifiedMomentoAvatar from './common/UnifiedMomentoAvatar';

export interface TabBarItem {
  name: string;
  icon: string;
  androidIcon: string;
  path: string;
  requiresAuth?: boolean;
}

interface FloatingTabBarProps {
  items: TabBarItem[];
}

export default function FloatingTabBar({ items }: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [scaleAnims] = useState(items.map(() => new Animated.Value(1)));

  const handlePress = (item: TabBarItem, index: number) => {
    // Animate button press
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate
    if (item.requiresAuth && !user) {
      router.push('/auth/login');
    } else {
      router.push(item.path);
    }
  };

  const isActive = (item: TabBarItem) => {
    if (item.path === '/(tabs)/(home)') {
      return pathname === '/' || pathname === '/(tabs)/(home)' || pathname.startsWith('/(tabs)/(home)');
    }
    return pathname.startsWith(item.path);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {items.map((item, index) => {
          const active = isActive(item);
          
          // Special handling for profile tab
          if (item.name === 'Perfil') {
            return (
              <Animated.View
                key={item.name}
                style={[
                  styles.tabItem,
                  { transform: [{ scale: scaleAnims[index] }] },
                ]}
              >
                <TouchableOpacity
                  onPress={() => handlePress(item, index)}
                  style={styles.tabButton}
                  activeOpacity={0.7}
                >
                  <UnifiedMomentoAvatar
                    userId={user?.id}
                    size={28}
                    showBorder={active}
                    borderColor={active ? colors.white : colors.textSecondary}
                    onPress={() => handlePress(item, index)}
                  />
                </TouchableOpacity>
              </Animated.View>
            );
          }

          return (
            <Animated.View
              key={item.name}
              style={[
                styles.tabItem,
                { transform: [{ scale: scaleAnims[index] }] },
              ]}
            >
              <TouchableOpacity
                onPress={() => handlePress(item, index)}
                style={styles.tabButton}
                activeOpacity={0.7}
              >
                <IconSymbol
                  ios_icon_name={item.icon}
                  android_material_icon_name={item.androidIcon}
                  size={28}
                  color={active ? colors.white : colors.textSecondary}
                />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ✅ FIX: Remove white strip above tab bar on Android
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent', // Make container transparent
    ...Platform.select({
      android: {
        paddingBottom: 0, // Remove extra padding
      },
    }),
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    ...Platform.select({
      android: {
        borderTopWidth: 0, // Remove any border that might cause white line
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
});
