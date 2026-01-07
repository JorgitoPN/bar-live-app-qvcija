
/**
 * TAB NAVIGATION HOOK v107.0 - ANDROID AVATAR PERSISTENCE FIX
 * 
 * CRITICAL FIX v107.0 (ANDROID ONLY):
 * - ✅ Fixed avatar persistence by using stable user.avatar reference
 * - ✅ Avatar now remains visible across all pages on Android
 * - ✅ Uses useMemo with user?.avatar dependency instead of entire user object
 * - ✅ Prevents unnecessary re-renders that caused avatar to disappear
 */

import { useMemo } from 'react';
import { usePathname } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { TabConfig } from './TabConfig';
import type { TabBarItem } from '../FloatingTabBar';

export function useTabNavigation() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { currentMode, activeProfileType, activeProfileId } = useMode();

  // ✅ CRITICAL FIX v107.0: Use stable avatar reference to prevent re-renders
  const activeProfileAvatar = useMemo(() => {
    if (!user) return null;
    
    // Filter out file:// URLs
    if (user.avatar && user.avatar.startsWith('file://')) {
      return null;
    }
    
    return user.avatar || null;
  }, [user?.avatar]); // ✅ Only depend on user.avatar, not entire user object

  const tabs = useMemo(() => {
    console.log('[useTabNavigation v107.0] 🔄 Calculating tabs for mode:', currentMode);
    
    if (currentMode === 'propietario' && activeProfileType === 'local' && activeProfileId) {
      console.log('[useTabNavigation v107.0] 📍 Using LOCAL PROFILE tabs');
      return TabConfig.getLocalProfileTabs();
    }
    
    if (currentMode === 'admin') {
      console.log('[useTabNavigation v107.0] 🔧 Using ADMIN tabs');
      return TabConfig.getAdminTabs();
    }
    
    if (currentMode === 'propietario') {
      console.log('[useTabNavigation v107.0] 🏢 Using PROPIETARIO tabs');
      return TabConfig.getPropietarioTabs();
    }
    
    console.log('[useTabNavigation v107.0] 👤 Using CLIENTE tabs (default)');
    return TabConfig.getClienteTabs();
  }, [currentMode, activeProfileType, activeProfileId]);

  const activeTab = useMemo(() => {
    const normalizedPath = pathname.split('?')[0];
    
    const matchingTab = tabs.find(tab => {
      if (tab.route === '/(tabs)/(home)') {
        return normalizedPath === '/' || 
               normalizedPath === '/(tabs)' || 
               normalizedPath === '/(tabs)/(home)' ||
               normalizedPath.startsWith('/(tabs)/(home)');
      }
      
      if (tab.route.includes('(tabs)')) {
        const routeBase = tab.route.replace('/(tabs)/', '').split('/')[0];
        return normalizedPath.includes(`/(tabs)/${routeBase}`);
      }
      
      return normalizedPath === tab.route || normalizedPath.startsWith(tab.route + '/');
    });

    const result = matchingTab?.name || 'home';
    console.log('[useTabNavigation v107.0] 📍 Active tab:', result, 'for path:', normalizedPath);
    return result;
  }, [pathname, tabs]);

  console.log('[useTabNavigation v107.0] ✅ Avatar URL:', activeProfileAvatar ? 'Present' : 'None');

  return {
    tabs,
    activeTab,
    activeProfileAvatar,
  };
}
