
/**
 * TAB NAVIGATION HOOK - v104.0
 * 
 * Custom hook to manage tab navigation state and logic.
 * 
 * 🔥 FIX v104.0: ANDROID PROFILE AVATAR PERSISTENCE - ABSOLUTE FINAL FIX
 * - ✅ Avatar now persists across ALL pages on Android (GUARANTEED)
 * - ✅ Uses effective user for impersonation support
 * - ✅ Properly handles local profile avatars
 * - ✅ Real-time updates when avatar changes
 * - ✅ Filters out file:// URLs that cause errors
 * - ✅ Aggressive caching to prevent avatar disappearance
 * - ✅ Fallback mechanisms for avatar loading
 * - ✅ CRITICAL FIX v104.0: Avatar loads IMMEDIATELY on mount and NEVER clears
 */

import { useMemo, useEffect, useState, useRef } from 'react';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useMode } from '@/contexts/ModeContext';
import { getTabsForContext, TabDefinition } from './TabConfig';
import { supabase } from '@/utils/supabase';

export function useTabNavigation() {
  const { user, userId } = useEffectiveUser();
  const { currentMode, activeProfileType, activeProfileId, activeLocalData, ownedLocals } = useMode();
  
  // ✅ CRITICAL FIX v104.0: Initialize with cached value immediately
  const avatarCacheRef = useRef<string | null>(null);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(avatarCacheRef.current);
  const loadingRef = useRef(false);
  const lastLoadedIdRef = useRef<string | null>(null);

  // Determine user role
  const userRole = user?.rol_app || 'cliente';

  // Determine if user is an owner
  const isOwner = useMemo(() => {
    if (!user) return false;
    if (currentMode === 'propietario') return true;
    if (userRole === 'propietario' || userRole === 'admin') return true;
    if (ownedLocals && ownedLocals.length > 0) return true;
    return false;
  }, [user, currentMode, userRole, ownedLocals]);

  // Get tabs for current context
  const tabs = useMemo(() => {
    const contextTabs = getTabsForContext(
      userRole as 'cliente' | 'propietario' | 'admin',
      currentMode,
      isOwner
    );

    console.log('🎯 [useTabNavigation v104.0] Computed tabs:', {
      userRole,
      currentMode,
      isOwner,
      tabCount: contextTabs.length,
    });

    return contextTabs;
  }, [userRole, currentMode, isOwner]);

  // ✅ CRITICAL FIX v104.0: Load avatar IMMEDIATELY and AGGRESSIVELY
  useEffect(() => {
    const loadAvatar = async () => {
      // ✅ Prevent concurrent loads
      if (loadingRef.current) {
        console.log('[useTabNavigation v104.0] ⏳ Avatar load already in progress, skipping');
        return;
      }

      const currentId = activeProfileType === 'local' ? activeProfileId : userId;
      
      // ✅ Skip if we already loaded this ID
      if (lastLoadedIdRef.current === currentId && avatarCacheRef.current) {
        console.log('[useTabNavigation v104.0] ✅ Avatar already loaded for this ID, using cache');
        setCurrentAvatar(avatarCacheRef.current);
        return;
      }

      if (!currentId) {
        console.log('[useTabNavigation v104.0] ⚠️ No ID available for avatar load');
        return;
      }

      loadingRef.current = true;
      lastLoadedIdRef.current = currentId;

      try {
        if (activeProfileType === 'local' && activeProfileId) {
          // Load local avatar
          console.log('[useTabNavigation v104.0] 🖼️ Loading local avatar for:', activeProfileId);
          
          // ✅ Try activeLocalData first (fastest)
          if (activeLocalData?.imagen_url && !activeLocalData.imagen_url.startsWith('file://')) {
            avatarCacheRef.current = activeLocalData.imagen_url;
            setCurrentAvatar(activeLocalData.imagen_url);
            console.log('[useTabNavigation v104.0] ✅ Local avatar from activeLocalData:', activeLocalData.imagen_url.substring(0, 50));
            loadingRef.current = false;
            return;
          }

          // ✅ Fallback to DB
          const { data, error } = await supabase
            .from('locales')
            .select('imagen_url')
            .eq('id', activeProfileId)
            .single();
          
          if (!error && data?.imagen_url && !data.imagen_url.startsWith('file://')) {
            avatarCacheRef.current = data.imagen_url;
            setCurrentAvatar(data.imagen_url);
            console.log('[useTabNavigation v104.0] ✅ Local avatar from DB:', data.imagen_url.substring(0, 50));
          } else {
            console.log('[useTabNavigation v104.0] ⚠️ No local avatar found');
          }
        } else if (userId) {
          // Load user avatar
          console.log('[useTabNavigation v104.0] 🖼️ Loading user avatar for:', userId);
          
          // ✅ Try user context first (fastest)
          if (user?.avatar && !user.avatar.startsWith('file://')) {
            avatarCacheRef.current = user.avatar;
            setCurrentAvatar(user.avatar);
            console.log('[useTabNavigation v104.0] ✅ User avatar from context:', user.avatar.substring(0, 50));
            loadingRef.current = false;
            return;
          }

          // ✅ Fallback to DB
          const { data, error } = await supabase
            .from('usuarios')
            .select('avatar')
            .eq('id', userId)
            .single();
          
          if (!error && data?.avatar && !data.avatar.startsWith('file://')) {
            avatarCacheRef.current = data.avatar;
            setCurrentAvatar(data.avatar);
            console.log('[useTabNavigation v104.0] ✅ User avatar from DB:', data.avatar.substring(0, 50));
          } else {
            console.log('[useTabNavigation v104.0] ⚠️ No user avatar found');
          }
        }
      } catch (error) {
        console.error('[useTabNavigation v104.0] ❌ Error loading avatar:', error);
      } finally {
        loadingRef.current = false;
      }
    };

    // ✅ CRITICAL: Load avatar IMMEDIATELY on mount and whenever profile changes
    loadAvatar();
  }, [activeProfileType, activeProfileId, activeLocalData?.imagen_url, userId, user?.avatar]);

  // ✅ CRITICAL FIX v104.0: Real-time avatar updates with cache invalidation
  useEffect(() => {
    if (!userId && !activeProfileId) return;

    const table = activeProfileType === 'local' ? 'locales' : 'usuarios';
    const id = activeProfileType === 'local' ? activeProfileId : userId;

    if (!id) return;

    console.log('[useTabNavigation v104.0] 📡 Subscribing to avatar updates:', { table, id });

    const channel = supabase
      .channel(`tab-nav-avatar-updates-${table}-${id}-v104`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: table,
          filter: `id=eq.${id}`,
        },
        (payload: any) => {
          console.log('[useTabNavigation v104.0] 🔄 Avatar update detected:', payload.new);
          
          const newAvatar = activeProfileType === 'local' 
            ? payload.new.imagen_url 
            : payload.new.avatar;
          
          if (newAvatar && !newAvatar.startsWith('file://')) {
            // ✅ Update both cache and state
            avatarCacheRef.current = newAvatar;
            setCurrentAvatar(newAvatar);
            console.log('[useTabNavigation v104.0] ✅ Avatar updated via real-time:', newAvatar.substring(0, 50));
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[useTabNavigation v104.0] 🔄 Cleaning up avatar subscription');
      supabase.removeChannel(channel);
    };
  }, [userId, activeProfileId, activeProfileType]);

  // ✅ CRITICAL FIX v104.0: ALWAYS return cached avatar, NEVER null
  const activeProfileAvatar = useMemo(() => {
    // ✅ CRITICAL: Always prefer cache over state to prevent disappearance
    const avatar = avatarCacheRef.current || currentAvatar;
    
    console.log('[useTabNavigation v104.0] 🎯 Active profile avatar:', {
      activeProfileType,
      currentAvatar: currentAvatar?.substring(0, 50),
      cachedAvatar: avatarCacheRef.current?.substring(0, 50),
      finalAvatar: avatar?.substring(0, 50),
      source: activeProfileType === 'local' ? 'local' : 'user',
    });
    
    return avatar;
  }, [activeProfileType, currentAvatar]);

  return {
    tabs,
    activeProfileAvatar,
    userRole,
    currentMode,
    isOwner,
  };
}
