
/**
 * FLOATING TAB BAR - v20.0.0 INSTAGRAM-STYLE FIXED
 * 
 * Wrapper component for backward compatibility.
 * Uses the new TabNavigationBar internally.
 * 
 * 🔥 INSTAGRAM-STYLE v20.0.0 FIX:
 * - Inactive icons: Outlined (hollow), pure white, 100% opacity
 * - Active icons: Filled, pure white, 100% opacity
 * - Icons are 32px (matching miniavatar size)
 * - Central "Explorar" button remains the same with gradient
 * - Visual distinction comes from different icon names (filled vs outlined)
 * - All icons now have CLEAR visual differences between states
 * - NO weight or fill props - distinction comes from icon name only
 * 
 * 🔧 FIX v20.0.0: Updated to use better Material Icons with clear distinctions
 */

import React, { useEffect } from 'react';
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
  const { currentMode, activeProfileType, activeProfileId, ownedLocals } = useMode();
  const { tabs, activeProfileAvatar, isOwner } = useTabNavigation();

  // Log whenever tabs change
  useEffect(() => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 [FloatingTabBar v20.0.0 INSTAGRAM-STYLE FIXED] RENDERING');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 Context State:');
    console.log('   Mode:', currentMode);
    console.log('   Profile Type:', activeProfileType);
    console.log('   Profile ID:', activeProfileId);
    console.log('   Is Owner:', isOwner);
    console.log('   Owned Locals:', ownedLocals?.length || 0);
    console.log('📋 Tabs (' + tabs.length + '):');
    tabs.forEach((tab, index) => {
      console.log(`   ${index + 1}. ${tab.label} (${tab.id}) - order: ${tab.order[currentMode]}`);
    });
    console.log('🎨 Icon Style:');
    console.log('   Active: FILLED icon name, pure white (#FFFFFF), 32px');
    console.log('   Inactive: OUTLINED icon name, pure white (#FFFFFF), 32px');
    console.log('   Distinction: Different icon names with CLEAR visual differences');
    console.log('═══════════════════════════════════════════════════════════');
  }, [tabs, currentMode, activeProfileType, activeProfileId, isOwner, ownedLocals]);

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
