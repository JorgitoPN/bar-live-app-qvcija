
/**
 * FLOATING TAB BAR - ANDROID-iOS PARITY v56.0
 * 
 * ✅ CRITICAL FIX v56.0:
 * - Reduced tab bar height on Android to match iOS
 * - Fixed excessive bottom spacing
 * - Improved icon and label sizing
 * - Better touch targets without excessive height
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
