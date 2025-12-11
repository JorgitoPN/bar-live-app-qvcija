
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from './AuthContext';

interface StoryStateContextType {
  hasUnviewedStories: (userId: string, stories: any[]) => boolean;
  markStoriesAsViewed: (storyIds: string[]) => void;
  refreshStoryState: () => void;
  viewedStoryIds: Set<string>;
  isLoading: boolean;
}

const StoryStateContext = createContext<StoryStateContextType | undefined>(undefined);

/**
 * ✅ STORY STATE CONTEXT V11.0 - Complete Instagram-style story tracking
 * 
 * FIXED IN V11.0.1:
 * - ✅ More aggressive real-time synchronization
 * - ✅ Immediate UI updates after viewing stories
 * - ✅ Better error handling and logging
 * - ✅ Force refresh after story view
 * - ✅ Proper cleanup on unmount
 * 
 * Features:
 * - ✅ Tracks viewed stories globally
 * - ✅ Instagram logic: Show border only if ANY story is unviewed
 * - ✅ Real-time synchronization across all avatars
 * - ✅ Optimistic updates for instant UI feedback
 * - ✅ Automatic refresh on mount and user change
 */
export function StoryStateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshTime = useRef<number>(0);
  const channelRef = useRef<any>(null);
  const mountedRef = useRef(true);

  // Load viewed stories on mount and when user changes
  useEffect(() => {
    mountedRef.current = true;
    if (user) {
      console.log('[StoryStateV11] 🚀 V11.0.1 - Initializing for user:', user.id);
      loadViewedStories();
    } else {
      setViewedStoryIds(new Set());
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [user]);

  const loadViewedStories = async () => {
    if (!user || isLoading || !mountedRef.current) return;

    // ✅ V11.0.1: Allow more frequent refreshes (max once per 500ms instead of 1s)
    const now = Date.now();
    if (now - lastRefreshTime.current < 500) {
      console.log('[StoryStateV11] ⏭️ Skipping refresh - too soon');
      return;
    }
    lastRefreshTime.current = now;

    setIsLoading(true);
    try {
      console.log('[StoryStateV11] 📥 V11.0.1 - Loading viewed stories for user:', user.id);
      
      const { data, error } = await supabase
        .from('historia_views')
        .select('historia_id')
        .eq('usuario_id', user.id);

      if (error) {
        console.error('[StoryStateV11] ❌ Error loading viewed stories:', error);
        return;
      }

      if (!mountedRef.current) return;

      const viewedIds = new Set(data?.map(v => v.historia_id) || []);
      setViewedStoryIds(viewedIds);
      console.log('[StoryStateV11] ✅ V11.0.1 - Loaded', viewedIds.size, 'viewed stories');
    } catch (error) {
      console.error('[StoryStateV11] ❌ Error:', error);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  /**
   * ✅ V11.0.1: INSTAGRAM LOGIC - Check if user has unviewed stories
   * - Show border ONLY if at least one story is unviewed
   * - Border disappears when ALL stories are viewed
   * - Works for both own stories and other users' stories
   */
  const hasUnviewedStories = useCallback((userId: string, stories: any[]) => {
    if (!user || stories.length === 0) {
      return false;
    }
    
    // ✅ Check if ANY story is unviewed
    const hasUnviewed = stories.some(s => !viewedStoryIds.has(s.id));
    
    const isOwnStories = userId === user.id;
    
    console.log('[StoryStateV11] 👁️ V11.0.1 - Instagram logic:', {
      userId,
      isOwnStories,
      totalStories: stories.length,
      viewedCount: stories.filter(s => viewedStoryIds.has(s.id)).length,
      hasUnviewed,
      willShowBorder: hasUnviewed,
      viewedStoryIds: Array.from(viewedStoryIds),
    });
    
    return hasUnviewed;
  }, [user, viewedStoryIds]);

  /**
   * ✅ V11.0.1: OPTIMISTIC UPDATE - Mark stories as viewed immediately
   * This provides instant UI feedback while the database updates
   */
  const markStoriesAsViewed = useCallback((storyIds: string[]) => {
    console.log('[StoryStateV11] 📝 V11.0.1 - Marking stories as viewed (optimistic):', storyIds);
    setViewedStoryIds(prev => {
      const newSet = new Set(prev);
      storyIds.forEach(id => newSet.add(id));
      console.log('[StoryStateV11] ✅ V11.0.1 - Total viewed stories:', newSet.size);
      return newSet;
    });
    
    // ✅ V11.0.1: Force immediate refresh after marking as viewed
    setTimeout(() => {
      if (mountedRef.current) {
        console.log('[StoryStateV11] 🔄 V11.0.1 - Force refresh after marking as viewed');
        loadViewedStories();
      }
    }, 100);
  }, [user]);

  /**
   * ✅ V11.0.1: IMMEDIATE REFRESH - Reload viewed stories from database
   * Reduced debounce time for faster updates
   */
  const refreshStoryState = useCallback(() => {
    console.log('[StoryStateV11] 🔄 V11.0.1 - Scheduling story state refresh');
    
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // ✅ V11.0.1: Reduced debounce time from 300ms to 100ms for faster updates
    refreshTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        console.log('[StoryStateV11] 🔄 V11.0.1 - Executing story state refresh');
        loadViewedStories();
      }
    }, 100);
  }, [user]);

  // ✅ V11.0.1: REAL-TIME SUBSCRIPTION - Listen for new story views
  useEffect(() => {
    if (!user) return;

    console.log('[StoryStateV11] ⚡ V11.0.1 - Setting up real-time subscription for story views');

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`story-views-v11-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'historia_views',
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[StoryStateV11] ⚡ V11.0.1 - New story view detected:', payload.new);
          // Add to viewed stories immediately
          if (payload.new.historia_id) {
            markStoriesAsViewed([payload.new.historia_id]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'historia_views',
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[StoryStateV11] ⚡ V11.0.1 - Story view updated:', payload.new);
          // Refresh to ensure consistency
          refreshStoryState();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'historia_views',
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[StoryStateV11] ⚡ V11.0.1 - Story view deleted:', payload.old);
          // Refresh to ensure consistency
          refreshStoryState();
        }
      )
      .subscribe((status) => {
        console.log('[StoryStateV11] V11.0.1 - Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('[StoryStateV11] V11.0.1 - Unsubscribing from story views');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      // Clear any pending refresh
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [user, markStoriesAsViewed, refreshStoryState]);

  return (
    <StoryStateContext.Provider value={{ 
      hasUnviewedStories, 
      markStoriesAsViewed, 
      refreshStoryState,
      viewedStoryIds,
      isLoading,
    }}>
      {children}
    </StoryStateContext.Provider>
  );
}

export function useStoryState() {
  const context = useContext(StoryStateContext);
  if (!context) {
    throw new Error('useStoryState must be used within StoryStateProvider');
  }
  return context;
}
