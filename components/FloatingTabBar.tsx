
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
      // Special handling for local profile pages
      if (tab.name === 'perfil' && pathname.startsWith('/perfil/local')) {
        return true;
      }
      return false;
    });

    if (currentTab) {
      setActiveTab(currentTab.name);
    }
  }, [pathname, tabs]);

  const handleTabPress = (tab: TabBarItem) => {
    console.log('[FloatingTabBar] 🔘 Tab pressed:', tab.name, 'Active profile type:', activeProfileType, 'Active profile ID:', activeProfileId);
    
    // Special handling for Perfil tab
    if (tab.name === 'perfil') {
      // FIXED: If currently interacting as a local, navigate to that local's profile page
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
              <IconSymbol
                name={tab.icon}
                size={26}
                color={isActive ? colors.primary : colors.text}
              />
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
    paddingVertical: 12,
    paddingHorizontal: 8,
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
    paddingVertical: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    marginTop: 4,
  },
  labelActive: {
    color: colors.primary,
  },
});
