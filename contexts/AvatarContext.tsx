
/**
 * AVATAR CONTEXT v140.0 - PERSISTENT MINIAVATAR FIX
 * 
 * CRITICAL FIX v140.0 (ANDROID ONLY):
 * - ✅ FIXED: Avatar URL persists across ALL page navigations
 * - ✅ FIXED: Real-time updates when avatar changes
 * - ✅ FIXED: Proper validation of avatar URLs (filters file:// URLs)
 * - ✅ FIXED: Fallback icon displays when user not logged in
 * - ✅ FIXED: Single source of truth for avatar state
 * - ✅ iOS design remains unchanged
 * 
 * This context provides a global state for the user's avatar that persists
 * across all navigation and component unmounts/remounts.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from './AuthContext';

interface AvatarContextType {
  avatarUrl: string | null;
  isLoading: boolean;
  refreshAvatar: () => Promise<void>;
}

const AvatarContext = createContext<AvatarContextType | undefined>(undefined);

export function AvatarProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  console.log('[AvatarContext v140.0] 🎨 Provider initialized');

  // Validate avatar URL
  const isValidUrl = (url: string | null): boolean => {
    if (!url) return false;
    if (url.startsWith('file://')) return false;
    if (url.length < 10) return false;
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
  };

  // Load avatar URL from database
  const loadAvatarUrl = async () => {
    if (!user?.id) {
      console.log('[AvatarContext v140.0] ❌ No user logged in, clearing avatar');
      setAvatarUrl(null);
      setIsLoading(false);
      return;
    }

    try {
      console.log('[AvatarContext v140.0] 🔄 Loading avatar for user:', user.id);
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('avatar_url')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('[AvatarContext v140.0] ❌ Error loading avatar:', error);
        setAvatarUrl(null);
        setIsLoading(false);
        return;
      }

      const validUrl = isValidUrl(data?.avatar_url) ? data.avatar_url : null;
      
      console.log('[AvatarContext v140.0] ✅ Avatar loaded:', {
        userId: user.id,
        hasAvatar: !!validUrl,
        urlPreview: validUrl?.substring(0, 50) || 'none',
      });

      setAvatarUrl(validUrl);
      setIsLoading(false);
    } catch (error) {
      console.error('[AvatarContext v140.0] ❌ Exception loading avatar:', error);
      setAvatarUrl(null);
      setIsLoading(false);
    }
  };

  // Load avatar when user changes
  useEffect(() => {
    loadAvatarUrl();
  }, [user?.id]);

  // Subscribe to avatar updates
  useEffect(() => {
    if (!user?.id) return;

    console.log('[AvatarContext v140.0] 🔔 Setting up real-time subscription for user:', user.id);

    const channel = supabase
      .channel(`avatar-context-${user.id}-v140`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'usuarios',
          filter: `id=eq.${user.id}`,
        },
        (payload: any) => {
          console.log('[AvatarContext v140.0] 🔄 Avatar updated in real-time:', payload.new);
          const newUrl = payload.new?.avatar_url;
          if (newUrl && !newUrl.startsWith('file://')) {
            setAvatarUrl(newUrl);
          } else {
            setAvatarUrl(null);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[AvatarContext v140.0] 🔌 Unsubscribing from avatar updates');
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const refreshAvatar = async () => {
    console.log('[AvatarContext v140.0] 🔄 Manual refresh requested');
    await loadAvatarUrl();
  };

  return (
    <AvatarContext.Provider value={{ avatarUrl, isLoading, refreshAvatar }}>
      {children}
    </AvatarContext.Provider>
  );
}

export function useAvatar() {
  const context = useContext(AvatarContext);
  if (context === undefined) {
    throw new Error('useAvatar must be used within an AvatarProvider');
  }
  return context;
}
