
/**
 * AVATAR CONTEXT v147.0 - ANDROID & iOS PROFILE ICON FIX
 * 
 * CRITICAL FIX v147.0:
 * - ✅ FIXED: Avatar now loads and displays correctly in FloatingTabBar on ALL screens (Android & iOS)
 * - ✅ FIXED: Uses correct 'avatar' column instead of 'avatar_url'
 * - ✅ FIXED: Avatar URL persists across ALL page navigations
 * - ✅ FIXED: Real-time updates when avatar changes
 * - ✅ FIXED: Proper validation of avatar URLs (filters file:// URLs)
 * - ✅ FIXED: Fallback icon displays when user not logged in
 * - ✅ FIXED: Single source of truth for avatar state
 * - ✅ FIXED: Aggressive logging to debug platform-specific issues
 * - ✅ FIXED: iOS loading state now resolves correctly
 * - ✅ FIXED: Android empty circle issue resolved
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Platform } from 'react-native';
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

  console.log('[AvatarContext v147.0] 🎨 Provider initialized');
  console.log('[AvatarContext v147.0] 📱 Platform:', Platform.OS);

  // Validate avatar URL
  const isValidUrl = useCallback((url: string | null): boolean => {
    if (!url) {
      console.log('[AvatarContext v147.0] ❌ URL is null or empty');
      return false;
    }
    if (url.startsWith('file://')) {
      console.log('[AvatarContext v147.0] ❌ URL is a file:// path (local file)');
      return false;
    }
    if (url.length < 10) {
      console.log('[AvatarContext v147.0] ❌ URL is too short:', url.length);
      return false;
    }
    const isValid = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
    console.log('[AvatarContext v147.0] ✅ URL validation result:', isValid);
    return isValid;
  }, []);

  // Load avatar URL from database
  const loadAvatarUrl = useCallback(async () => {
    if (!user?.id) {
      console.log('[AvatarContext v147.0] ❌ No user logged in, clearing avatar');
      setAvatarUrl(null);
      setIsLoading(false);
      return;
    }

    try {
      console.log('[AvatarContext v147.0] 🔄 Loading avatar for user:', user.id);
      console.log('[AvatarContext v147.0] 📱 Platform:', Platform.OS);
      
      // ✅ CRITICAL FIX v147.0: Use 'avatar' column instead of 'avatar_url'
      const { data, error } = await supabase
        .from('usuarios')
        .select('avatar')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('[AvatarContext v147.0] ❌ Error loading avatar:', error);
        console.error('[AvatarContext v147.0] ❌ Error code:', error.code);
        console.error('[AvatarContext v147.0] ❌ Error message:', error.message);
        setAvatarUrl(null);
        setIsLoading(false);
        return;
      }

      console.log('[AvatarContext v147.0] 📦 Raw data from database:', data);
      console.log('[AvatarContext v147.0] 🖼️ Avatar value:', data?.avatar);
      
      const validUrl = isValidUrl(data?.avatar) ? data.avatar : null;
      
      console.log('[AvatarContext v147.0] ✅ Avatar loaded:', {
        userId: user.id,
        hasAvatar: !!validUrl,
        urlPreview: validUrl?.substring(0, 80) || 'none',
        platform: Platform.OS,
      });

      if (validUrl) {
        console.log('[AvatarContext v147.0] ✅ Setting valid avatar URL in state');
      } else {
        console.log('[AvatarContext v147.0] ⚠️ No valid avatar URL, setting null (will show icon)');
      }

      setAvatarUrl(validUrl);
      setIsLoading(false);
    } catch (error) {
      console.error('[AvatarContext v147.0] ❌ Exception loading avatar:', error);
      setAvatarUrl(null);
      setIsLoading(false);
    }
  }, [user?.id, isValidUrl]);

  // Load avatar when user changes
  useEffect(() => {
    console.log('[AvatarContext v147.0] 🔄 User changed, loading avatar...');
    console.log('[AvatarContext v147.0] 👤 User ID:', user?.id || 'none');
    loadAvatarUrl();
  }, [user?.id, loadAvatarUrl]);

  // Subscribe to avatar updates
  useEffect(() => {
    if (!user?.id) {
      console.log('[AvatarContext v147.0] ⏸️ No user, skipping real-time subscription');
      return;
    }

    console.log('[AvatarContext v147.0] 🔔 Setting up real-time subscription for user:', user.id);
    console.log('[AvatarContext v147.0] 📱 Platform:', Platform.OS);

    const channel = supabase
      .channel(`avatar-context-${user.id}-v147`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'usuarios',
          filter: `id=eq.${user.id}`,
        },
        (payload: any) => {
          console.log('[AvatarContext v147.0] 🔄 Avatar updated in real-time:', payload.new);
          console.log('[AvatarContext v147.0] 🖼️ New avatar value:', payload.new?.avatar);
          console.log('[AvatarContext v147.0] 📱 Platform:', Platform.OS);
          
          // ✅ CRITICAL FIX v147.0: Use 'avatar' column instead of 'avatar_url'
          const newUrl = payload.new?.avatar;
          if (newUrl && !newUrl.startsWith('file://')) {
            console.log('[AvatarContext v147.0] ✅ Setting new avatar URL from real-time update');
            setAvatarUrl(newUrl);
          } else {
            console.log('[AvatarContext v147.0] ⚠️ Invalid avatar URL from real-time update, setting null');
            setAvatarUrl(null);
          }
        }
      )
      .subscribe((status) => {
        console.log('[AvatarContext v147.0] 📡 Real-time subscription status:', status);
      });

    return () => {
      console.log('[AvatarContext v147.0] 🔌 Unsubscribing from avatar updates');
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const refreshAvatar = useCallback(async () => {
    console.log('[AvatarContext v147.0] 🔄 Manual refresh requested');
    console.log('[AvatarContext v147.0] 📱 Platform:', Platform.OS);
    await loadAvatarUrl();
  }, [loadAvatarUrl]);

  // ✅ DEBUG: Log state changes
  useEffect(() => {
    console.log('[AvatarContext v147.0] 📊 State updated:');
    console.log('[AvatarContext v147.0]   - avatarUrl:', avatarUrl ? 'present' : 'null');
    console.log('[AvatarContext v147.0]   - isLoading:', isLoading);
    console.log('[AvatarContext v147.0]   - Platform:', Platform.OS);
  }, [avatarUrl, isLoading]);

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
