
/**
 * FLOATING TAB BAR - v3.0.0
 * 
 * Wrapper component for backward compatibility.
 * Uses the new TabNavigationBar internally.
 * 
 * ✅ ENHANCED v3.0.0:
 * - Much clearer active state indication
 * - More visible inactive icons (60% opacity)
 * - Stronger visual feedback for active tabs
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
  tabs?: TabBarItem[]; // Legacy prop, ignored in new implementation
  containerWidth?: number; // Legacy prop, ignored in new implementation
}

export default function FloatingTabBar({ tabs: legacyTabs, containerWidth }: FloatingTabBarProps) {
  const router = useRouter();
  const { currentMode, activeProfileType, activeProfileId, switchToLocalProfile } = useMode();
  const { tabs, activeProfileAvatar } = useTabNavigation();

  console.log('🎯 [FloatingTabBar v3.0] Rendering with enhanced visibility');
  console.log('   Mode:', currentMode);
  console.log('   Profile Type:', activeProfileType);
  console.log('   Profile ID:', activeProfileId);
  console.log('   Tabs:', tabs.map(t => t.id).join(', '));

  const handleProfilePress = async () => {
    console.log('👤 [FloatingTabBar] Profile pressed');
    
    // If in propietario mode with a local profile, navigate to that local's profile
    if (currentMode === 'propietario' && activeProfileType === 'local' && activeProfileId) {
      console.log('   → Navigating to local profile:', activeProfileId);
      router.push(`/perfil/local?localId=${activeProfileId}` as any);
    } else {
      console.log('   → Navigating to user profile');
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
