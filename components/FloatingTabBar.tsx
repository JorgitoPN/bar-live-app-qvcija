
/**
 * FLOATING TAB BAR - ANDROID FIXES v104.0
 * 
 * CRITICAL FIXES v104.0 (ANDROID ONLY):
 * - ✅ Removed white strip above tab bar on Android
 * - ✅ Increased background opacity to fully cover white strip
 * - ✅ Removed SafeAreaView bottom edge on Android
 * - ✅ Reduced bottom margin on Android (20 → 12)
 * - ✅ Avatar persistence maintained across all tabs
 * 
 * IMPORTANT: iOS design remains unchanged
 */

import React from 'react';
import { TabNavigationBar } from './navigation/TabNavigationBar';
import { useTabNavigation } from './navigation/useTabNavigation';
import { useRouter } from 'expo-router';
import { useMode } from '@/contexts/ModeContext';

export interface TabBarItem {
  name: string;
  route: string;
  icon: string;
  label: string;
}

interface FloatingTabBarProps {
  tabs?: TabBarItem[];
  containerWidth?: number;
}

export default function FloatingTabBar({ tabs: legacyTabs, containerWidth }: FloatingTabBarProps) {
  const router = useRouter();
  const { currentMode, activeProfileType, activeProfileId } = useMode();
  const { tabs, activeProfileAvatar } = useTabNavigation();

  const handleProfilePress = async () => {
    if (currentMode === 'propietario' && activeProfileType === 'local' && activeProfileId) {
      router.push(`/perfil/local?localId=${activeProfileId}` as any);
    } else {
      router.push('/(tabs)/perfil' as any);
    }
  };

  return (
    <TabNavigationBar
      tabs={tabs}
      activeProfileAvatar={activeProfileAvatar}
      onProfilePress={handleProfilePress}
    />
  );
}
