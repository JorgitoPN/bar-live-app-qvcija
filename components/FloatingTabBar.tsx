
/**
 * FLOATING TAB BAR - v15.0.0 INSTAGRAM-STYLE
 * 
 * Wrapper component for backward compatibility.
 * Uses the new TabNavigationBar internally.
 * 
 * 🔥 INSTAGRAM-STYLE v15.0.0:
 * - Inactive icons: Outlined (hollow), pure white, 100% opacity, regular weight
 * - Active icons: Filled, pure white, 100% opacity, semibold weight
 * - Icons are 32px (matching miniavatar size)
 * - Central "Explorar" button remains the same with gradient
 * - Visual distinction comes from icon variant AND weight
 * - "Gestión de Locales" icon is properly configured for owner mode
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

  console.log('🎯 [FloatingTabBar v15.0 INSTAGRAM-STYLE] Rendering with outlined/filled distinction');
  console.log('   Mode:', currentMode);
  console.log('   Profile Type:', activeProfileType);
  console.log('   Profile ID:', activeProfileId);
  console.log('   Tabs:', tabs.map(t => `${t.id} (${t.label})`).join(', '));
  console.log('   🎨 Active icons: FILLED, pure white (#FFFFFF), 32px, semibold weight');
  console.log('   🎨 Inactive icons: OUTLINED, pure white (#FFFFFF), 32px, regular weight');

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
