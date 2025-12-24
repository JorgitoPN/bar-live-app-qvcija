
/**
 * TAB NAVIGATION HOOK - v1.3.0
 * 
 * Custom hook to manage tab navigation state and logic.
 * 
 * 🔥 FIX v1.3.0: Use effective user for impersonation support
 * - When admin is impersonating, show impersonated user's avatar
 * - When admin is impersonating, use impersonated user's role and owned locals
 * - This ensures impersonation works correctly in the tab bar
 */

import { useMemo } from 'react';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useMode } from '@/contexts/ModeContext';
import { getTabsForContext, TabDefinition } from './TabConfig';

export function useTabNavigation() {
  const { user } = useEffectiveUser();
  const { currentMode, activeProfileType, activeProfileId, activeLocalData, ownedLocals } = useMode();

  // Determine user role
  const userRole = user?.rol_app || 'cliente';

  // Determine if user is an owner (has permission to see ownership-required tabs)
  const isOwner = useMemo(() => {
    if (!user) {
      return false;
    }

    // If user is in propietario mode, they are considered an owner
    if (currentMode === 'propietario') {
      console.log('🔑 [useTabNavigation v1.3.0] User is in propietario mode → isOwner = true');
      return true;
    }

    // If user has propietario or admin role, they are considered an owner
    if (userRole === 'propietario' || userRole === 'admin') {
      console.log('🔑 [useTabNavigation v1.3.0] User has propietario/admin role → isOwner = true');
      return true;
    }

    // If user has any owned locals, they are considered an owner
    if (ownedLocals && ownedLocals.length > 0) {
      console.log('🔑 [useTabNavigation v1.3.0] User owns', ownedLocals.length, 'locals → isOwner = true');
      return true;
    }

    console.log('🔑 [useTabNavigation v1.3.0] User is not an owner → isOwner = false');
    return false;
  }, [user, currentMode, userRole, ownedLocals]);

  // Get tabs for current context
  const tabs = useMemo(() => {
    const contextTabs = getTabsForContext(
      userRole as 'cliente' | 'propietario' | 'admin',
      currentMode,
      isOwner
    );

    console.log('🎯 [useTabNavigation v1.3.0] Computed tabs:', {
      userRole,
      currentMode,
      isOwner,
      tabCount: contextTabs.length,
      tabs: contextTabs.map(t => `${t.id} (order: ${t.order[currentMode]})`).join(', ')
    });

    return contextTabs;
  }, [userRole, currentMode, isOwner]);

  // Get active profile avatar
  // ✅ FIXED: Use effective user's avatar for impersonation support
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
