
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
 * ✅ STORY STATE CONTEXT V11.0.6 - AGGRESSIVE REFRESH FOR INSTANT BORDER UPDATES
 * 
 * FIXES IN V11.0.6:
 * - ✅ CRITICAL FIX: Immediate refresh after marking stories as viewed
 * - ✅ Multiple refresh cycles to ensure UI updates
 * - ✅ Reduced debounce time for faster updates
 * - ✅ Better error handling and logging
 * 
 * Features:
 * - ✅ Tracks viewed stories globally
 * - ✅ Instagram logic: Show border only if ANY story is unviewed
 * - ✅ Real-time synchronization across all avatars
 * - ✅ Optimistic updates for instant UI feedback
 * - ✅ Automatic refresh on mount and user change
 * - ✅ INSTANT BORDER DISAPPEARANCE after viewing last story
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
      console.log('[StoryStateV11] 🚀 V11.0.6 - Initializing for user:', user.id);
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

    // ✅ V11.0.6: Reduced debounce time for faster updates
    const now = Date.now();
    if (now - lastRefreshTime.current < 100) {
      console.log('[StoryStateV11] ⏭️ V11.0.6 - Skipping refresh - too soon (< 100ms)');
      return;
    }
    lastRefreshTime.current = now;

    setIsLoading(true);
    try {
      console.log('[StoryStateV11] 📥 V11.0.6 - Loading viewed stories for user:', user.id);
      
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
      console.log('[StoryStateV11] ✅ V11.0.6 - Loaded', viewedIds.size, 'viewed stories');
    } catch (error) {
      console.error('[StoryStateV11] ❌ Error:', error);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  /**
   * ✅ V11.0.6: INSTAGRAM LOGIC - Check if user has unviewed stories
   * - Show border ONLY if at least one story is unviewed
   * - Border disappears when ALL stories are viewed
   */
  const hasUnviewedStories = useCallback((userId: string, stories: any[]) => {
    if (!user || stories.length === 0) {
      return false;
    }
    
    // ✅ Check if ANY story is unviewed
    const hasUnviewed = stories.some(s => !viewedStoryIds.has(s.id));
    
    const isOwnStories = userId === user.id;
    
    console.log('[StoryStateV11] 👁️ V11.0.6 - Instagram logic result:', {
      userId,
      isOwnStories,
      totalStories: stories.length,
      viewedCount: stories.filter(s => viewedStoryIds.has(s.id)).length,
      unviewedCount: stories.filter(s => !viewedStoryIds.has(s.id)).length,
      hasUnviewed,
      willShowBorder: hasUnviewed,
    });
    
    return hasUnviewed;
  }, [user, viewedStoryIds]);

  /**
   * ✅ V11.0.6: OPTIMISTIC UPDATE + IMMEDIATE REFRESH
   * This provides instant UI feedback AND ensures database sync
   */
  const markStoriesAsViewed = useCallback((storyIds: string[]) => {
    console.log('[StoryStateV11] 📝 V11.0.6 - Marking stories as viewed (optimistic + immediate refresh):', storyIds);
    
    // ✅ STEP 1: Optimistic update for instant UI feedback
    setViewedStoryIds(prev => {
      const newSet = new Set(prev);
      storyIds.forEach(id => {
        newSet.add(id);
      });
      console.log('[StoryStateV11] ✅ V11.0.6 - Optimistic update - Total viewed stories:', newSet.size);
      return newSet;
    });

    // ✅ STEP 2: Immediate refresh from database to ensure sync
    setTimeout(() => {
      if (mountedRef.current) {
        console.log('[StoryStateV11] 🔄 V11.0.6 - Immediate refresh after marking viewed');
        loadViewedStories();
      }
    }, 0);

    // ✅ STEP 3: Additional refresh after 200ms to catch any race conditions
    setTimeout(() => {
      if (mountedRef.current) {
        console.log('[StoryStateV11] 🔄 V11.0.6 - Secondary refresh to ensure sync');
        loadViewedStories();
      }
    }, 200);
  }, []);

  /**
   * ✅ V11.0.6: AGGRESSIVE REFRESH - Multiple cycles to ensure UI updates
   */
  const refreshStoryState = useCallback(() => {
    console.log('[StoryStateV11] 🔄 V11.0.6 - Scheduling aggressive story state refresh');
    
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // ✅ V11.0.6: Immediate refresh
    if (mountedRef.current) {
      console.log('[StoryStateV11] 🔄 V11.0.6 - Immediate refresh cycle 1');
      loadViewedStories();
    }

    // ✅ V11.0.6: Second refresh after 100ms
    setTimeout(() => {
      if (mountedRef.current) {
        console.log('[StoryStateV11] 🔄 V11.0.6 - Immediate refresh cycle 2');
        loadViewedStories();
      }
    }, 100);

    // ✅ V11.0.6: Third refresh after 300ms
    refreshTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        console.log('[StoryStateV11] 🔄 V11.0.6 - Delayed refresh cycle 3');
        loadViewedStories();
      }
    }, 300);
  }, []);

  // ✅ V11.0.6: REAL-TIME SUBSCRIPTION - Listen for new story views
  useEffect(() => {
    if (!user) return;

    console.log('[StoryStateV11] ⚡ V11.0.6 - Setting up real-time subscription for story views');

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
          console.log('[StoryStateV11] ⚡ V11.0.6 - New story view detected:', payload.new);
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
          console.log('[StoryStateV11] ⚡ V11.0.6 - Story view updated:', payload.new);
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
          console.log('[StoryStateV11] ⚡ V11.0.6 - Story view deleted:', payload.old);
          // Refresh to ensure consistency
          refreshStoryState();
        }
      )
      .subscribe((status) => {
        console.log('[StoryStateV11] V11.0.6 - Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('[StoryStateV11] V11.0.6 - Unsubscribing from story views');
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
