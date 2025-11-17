
/**
 * TAB NAVIGATION HOOK - v1.0.0
 * 
 * Custom hook to manage tab navigation state and logic.
 */

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { getTabsForContext, TabDefinition } from './TabConfig';

export function useTabNavigation() {
  const { user } = useAuth();
  const { currentMode, activeProfileType, activeProfileId, activeLocalData } = useMode();

  // Determine user role
  const userRole = user?.rol_app || 'cliente';

  // Determine if user is viewing their own local profile
  const isOwner = useMemo(() => {
    if (!user || activeProfileType !== 'local' || !activeProfileId) {
      return false;
    }
    // Check if the active local is owned by the user
    // This would need to be verified against the database
    // For now, we assume if we're in propietario mode with a local profile, we're the owner
    return currentMode === 'propietario';
  }, [user, activeProfileType, activeProfileId, currentMode]);

  // Get tabs for current context
  const tabs = useMemo(() => {
    const contextTabs = getTabsForContext(
      userRole as 'cliente' | 'propietario' | 'admin',
      currentMode,
      isOwner
    );

    console.log('🎯 [useTabNavigation] Computed tabs:', {
      userRole,
      currentMode,
      isOwner,
      tabCount: contextTabs.length,
      tabs: contextTabs.map(t => t.id).join(', ')
    });

    return contextTabs;
  }, [userRole, currentMode, isOwner]);

  // Get active profile avatar
  const activeProfileAvatar = useMemo(() => {
    if (activeProfileType === 'local' && activeLocalData) {
      return activeLocalData.imagen_url || null;
    }
    return user?.avatar || null;
  }, [activeProfileType, activeLocalData, user]);

  return {
    tabs,
    activeProfileAvatar,
    userRole,
    currentMode,
    isOwner,
  };
}
