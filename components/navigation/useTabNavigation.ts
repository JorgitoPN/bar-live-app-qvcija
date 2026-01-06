
/**
 * TAB NAVIGATION HOOK - v102.0
 * 
 * Custom hook to manage tab navigation state and logic.
 * 
 * 🔥 FIX v102.0: ANDROID PROFILE AVATAR PERSISTENCE FIX
 * - ✅ Avatar now persists across all pages on Android
 * - ✅ Uses effective user for impersonation support
 * - ✅ Properly handles local profile avatars
 * - ✅ Real-time updates when avatar changes
 * - ✅ Filters out file:// URLs that cause errors
 */

import { useMemo, useEffect, useState } from 'react';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useMode } from '@/contexts/ModeContext';
import { getTabsForContext, TabDefinition } from './TabConfig';
import { supabase } from '@/utils/supabase';

export function useTabNavigation() {
  const { user, userId } = useEffectiveUser();
  const { currentMode, activeProfileType, activeProfileId, activeLocalData, ownedLocals } = useMode();
  
  // ✅ CRITICAL FIX v102.0: Local state for avatar to ensure persistence
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);

  // Determine user role
  const userRole = user?.rol_app || 'cliente';

  // Determine if user is an owner (has permission to see ownership-required tabs)
  const isOwner = useMemo(() => {
    if (!user) {
      return false;
    }

    // If user is in propietario mode, they are considered an owner
    if (currentMode === 'propietario') {
      console.log('🔑 [useTabNavigation v102.0] User is in propietario mode → isOwner = true');
      return true;
    }

    // If user has propietario or admin role, they are considered an owner
    if (userRole === 'propietario' || userRole === 'admin') {
      console.log('🔑 [useTabNavigation v102.0] User has propietario/admin role → isOwner = true');
      return true;
    }

    // If user has any owned locals, they are considered an owner
    if (ownedLocals && ownedLocals.length > 0) {
      console.log('🔑 [useTabNavigation v102.0] User owns', ownedLocals.length, 'locals → isOwner = true');
      return true;
    }

    console.log('🔑 [useTabNavigation v102.0] User is not an owner → isOwner = false');
    return false;
  }, [user, currentMode, userRole, ownedLocals]);

  // Get tabs for current context
  const tabs = useMemo(() => {
    const contextTabs = getTabsForContext(
      userRole as 'cliente' | 'propietario' | 'admin',
      currentMode,
      isOwner
    );

    console.log('🎯 [useTabNavigation v102.0] Computed tabs:', {
      userRole,
      currentMode,
      isOwner,
      tabCount: contextTabs.length,
      tabs: contextTabs.map(t => `${t.id} (order: ${t.order[currentMode]})`).join(', ')
    });

    return contextTabs;
  }, [userRole, currentMode, isOwner]);

  // ✅ CRITICAL FIX v102.0: Load and maintain avatar state
  useEffect(() => {
    const loadAvatar = async () => {
      if (activeProfileType === 'local' && activeProfileId) {
        // Load local avatar
        console.log('[useTabNavigation v102.0] 🖼️ Loading local avatar for:', activeProfileId);
        
        if (activeLocalData?.imagen_url) {
          const safeUrl = activeLocalData.imagen_url.startsWith('file://') 
            ? null 
            : activeLocalData.imagen_url;
          setCurrentAvatar(safeUrl);
          console.log('[useTabNavigation v102.0] ✅ Local avatar from cache:', safeUrl?.substring(0, 50));
        } else {
          const { data, error } = await supabase
            .from('locales')
            .select('imagen_url')
            .eq('id', activeProfileId)
            .single();
          
          if (!error && data?.imagen_url) {
            const safeUrl = data.imagen_url.startsWith('file://') 
              ? null 
              : data.imagen_url;
            setCurrentAvatar(safeUrl);
            console.log('[useTabNavigation v102.0] ✅ Local avatar from DB:', safeUrl?.substring(0, 50));
          } else {
            setCurrentAvatar(null);
            console.log('[useTabNavigation v102.0] ⚠️ No local avatar found');
          }
        }
      } else if (userId) {
        // Load user avatar
        console.log('[useTabNavigation v102.0] 🖼️ Loading user avatar for:', userId);
        
        if (user?.avatar) {
          const safeUrl = user.avatar.startsWith('file://') 
            ? null 
            : user.avatar;
          setCurrentAvatar(safeUrl);
          console.log('[useTabNavigation v102.0] ✅ User avatar from context:', safeUrl?.substring(0, 50));
        } else {
          const { data, error } = await supabase
            .from('usuarios')
            .select('avatar')
            .eq('id', userId)
            .single();
          
          if (!error && data?.avatar) {
            const safeUrl = data.avatar.startsWith('file://') 
              ? null 
              : data.avatar;
            setCurrentAvatar(safeUrl);
            console.log('[useTabNavigation v102.0] ✅ User avatar from DB:', safeUrl?.substring(0, 50));
          } else {
            setCurrentAvatar(null);
            console.log('[useTabNavigation v102.0] ⚠️ No user avatar found');
          }
        }
      } else {
        setCurrentAvatar(null);
        console.log('[useTabNavigation v102.0] ⚠️ No userId available');
      }
    };

    loadAvatar();
  }, [activeProfileType, activeProfileId, activeLocalData, userId, user]);

  // ✅ CRITICAL FIX v102.0: Subscribe to real-time avatar updates
  useEffect(() => {
    if (!userId && !activeProfileId) return;

    const table = activeProfileType === 'local' ? 'locales' : 'usuarios';
    const id = activeProfileType === 'local' ? activeProfileId : userId;

    if (!id) return;

    console.log('[useTabNavigation v102.0] 📡 Subscribing to avatar updates:', { table, id });

    const channel = supabase
      .channel(`tab-nav-avatar-updates-${table}-${id}-v102`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: table,
          filter: `id=eq.${id}`,
        },
        (payload: any) => {
          console.log('[useTabNavigation v102.0] 🔄 Avatar update detected:', payload.new);
          
          const newAvatar = activeProfileType === 'local' 
            ? payload.new.imagen_url 
            : payload.new.avatar;
          
          if (newAvatar) {
            const safeUrl = newAvatar.startsWith('file://') ? null : newAvatar;
            setCurrentAvatar(safeUrl);
            console.log('[useTabNavigation v102.0] ✅ Avatar updated via real-time:', safeUrl?.substring(0, 50));
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[useTabNavigation v102.0] 🔄 Cleaning up avatar subscription');
      supabase.removeChannel(channel);
    };
  }, [userId, activeProfileId, activeProfileType]);

  // ✅ CRITICAL FIX v102.0: Return currentAvatar from local state for persistence
  const activeProfileAvatar = useMemo(() => {
    console.log('[useTabNavigation v102.0] 🎯 Active profile avatar:', {
      activeProfileType,
      currentAvatar: currentAvatar?.substring(0, 50),
      source: activeProfileType === 'local' ? 'local' : 'user',
    });
    
    return currentAvatar;
  }, [activeProfileType, currentAvatar]);

  return {
    tabs,
    activeProfileAvatar,
    userRole,
    currentMode,
    isOwner,
  };
}
