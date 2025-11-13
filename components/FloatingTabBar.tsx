
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Platform, Text } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useMode } from '@/contexts/ModeContext';

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

export default function FloatingTabBar({ tabs, containerWidth = screenWidth }: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeProfileType, activeProfileId } = useMode();
  const [activeTab, setActiveTab] = useState<string>('');

  useEffect(() => {
    // Determine active tab based on current pathname
    const currentTab = tabs.find(tab => {
      // Handle nested routes
      if (pathname.startsWith(tab.route)) {
        return true;
      }
      // Handle exact match
      if (pathname === tab.route) {
        return true;
      }
      // Handle index routes
      if (pathname === `${tab.route}/index`) {
        return true;
      }
      return false;
    });

    if (currentTab) {
      setActiveTab(currentTab.name);
    }
  }, [pathname, tabs]);

  const handleTabPress = (tab: TabBarItem) => {
    console.log('[FloatingTabBar] 🔘 Tab pressed:', tab.name, 'Active profile type:', activeProfileType);
    
    // Special handling for Perfil tab
    if (tab.name === 'perfil') {
      // If currently viewing a local profile, navigate to that local's profile page
      if (activeProfileType === 'local' && activeProfileId) {
        console.log('[FloatingTabBar] 🏢 Navigating to local profile:', activeProfileId);
        router.push(`/perfil/local?localId=${activeProfileId}`);
        return;
      }
      // Otherwise, navigate to user's personal profile
      console.log('[FloatingTabBar] 👤 Navigating to user profile');
      router.push('/(tabs)/perfil');
      return;
    }

    // For all other tabs, use the default route
    console.log('[FloatingTabBar] 📍 Navigating to:', tab.route);
    router.push(tab.route as any);
  };

  const tabWidth = containerWidth / tabs.length;

  return (
    <View style={[styles.container, { width: containerWidth }]}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.name;
          
          return (
            <TouchableOpacity
              key={tab.name}
              style={[styles.tab, { width: tabWidth }]}
              onPress={() => handleTabPress(tab)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
                <IconSymbol
                  name={tab.icon}
                  size={24}
                  color={isActive ? colors.primary : colors.text}
                />
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: 10,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconContainerActive: {
    backgroundColor: colors.primary + '20',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  labelActive: {
    color: colors.primary,
  },
});
