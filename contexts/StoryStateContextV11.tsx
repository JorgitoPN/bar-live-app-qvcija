
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
 * ✅ STORY STATE CONTEXT V11.1.0 - COMPLETE REWRITE FOR RELIABILITY
 * 
 * FIXES IN V11.1.0:
 * - ✅ CRITICAL FIX: Simplified state management for better reliability
 * - ✅ CRITICAL FIX: Immediate optimistic updates with proper backend sync
 * - ✅ CRITICAL FIX: Real-time subscription with proper cleanup
 * - ✅ CRITICAL FIX: Debounced refresh to prevent race conditions
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
      console.log('[StoryStateV11.1.0] 🚀 Initializing for user:', user.id);
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

    // Debounce: Prevent too frequent refreshes
    const now = Date.now();
    if (now - lastRefreshTime.current < 200) {
      console.log('[StoryStateV11.1.0] ⏭️ Skipping refresh - too soon (< 200ms)');
      return;
    }
    lastRefreshTime.current = now;

    setIsLoading(true);
    try {
      console.log('[StoryStateV11.1.0] 📥 Loading viewed stories for user:', user.id);
      
      const { data, error } = await supabase
        .from('historia_views')
        .select('historia_id')
        .eq('usuario_id', user.id);

      if (error) {
        console.error('[StoryStateV11.1.0] ❌ Error loading viewed stories:', error);
        return;
      }

      if (!mountedRef.current) return;

      const viewedIds = new Set(data?.map(v => v.historia_id) || []);
      setViewedStoryIds(viewedIds);
      console.log('[StoryStateV11.1.0] ✅ Loaded', viewedIds.size, 'viewed stories');
    } catch (error) {
      console.error('[StoryStateV11.1.0] ❌ Error:', error);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  /**
   * ✅ V11.1.0: INSTAGRAM LOGIC - Check if user has unviewed stories
   * - Show border ONLY if at least one story is unviewed
   * - Border disappears when ALL stories are viewed
   */
  const hasUnviewedStories = useCallback((userId: string, stories: any[]) => {
    if (!user || stories.length === 0) {
      return false;
    }
    
    // Check if ANY story is unviewed
    const hasUnviewed = stories.some(s => !viewedStoryIds.has(s.id));
    
    const isOwnStories = userId === user.id;
    
    console.log('[StoryStateV11.1.0] 👁️ Instagram logic result:', {
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
   * ✅ V11.1.0: OPTIMISTIC UPDATE + DELAYED REFRESH
   * This provides instant UI feedback AND ensures database sync
   */
  const markStoriesAsViewed = useCallback((storyIds: string[]) => {
    console.log('[StoryStateV11.1.0] 📝 Marking stories as viewed (optimistic):', storyIds);
    
    // STEP 1: Optimistic update for instant UI feedback
    setViewedStoryIds(prev => {
      const newSet = new Set(prev);
      storyIds.forEach(id => newSet.add(id));
      console.log('[StoryStateV11.1.0] ✅ Optimistic update - Total viewed stories:', newSet.size);
      return newSet;
    });

    // STEP 2: Delayed refresh from database to ensure sync (after 300ms)
    setTimeout(() => {
      if (mountedRef.current) {
        console.log('[StoryStateV11.1.0] 🔄 Delayed refresh after marking viewed');
        loadViewedStories();
      }
    }, 300);
  }, []);

  /**
   * ✅ V11.1.0: SINGLE REFRESH - No aggressive cycles
   */
  const refreshStoryState = useCallback(() => {
    console.log('[StoryStateV11.1.0] 🔄 Refreshing story state');
    
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Single delayed refresh
    refreshTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        console.log('[StoryStateV11.1.0] 🔄 Executing refresh');
        loadViewedStories();
      }
    }, 200);
  }, []);

  // ✅ V11.1.0: REAL-TIME SUBSCRIPTION - Listen for new story views
  useEffect(() => {
    if (!user) return;

    console.log('[StoryStateV11.1.0] ⚡ Setting up real-time subscription for story views');

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`story-views-v11.1.0-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'historia_views',
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[StoryStateV11.1.0] ⚡ New story view detected:', payload.new);
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
          console.log('[StoryStateV11.1.0] ⚡ Story view updated:', payload.new);
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
          console.log('[StoryStateV11.1.0] ⚡ Story view deleted:', payload.old);
          refreshStoryState();
        }
      )
      .subscribe((status) => {
        console.log('[StoryStateV11.1.0] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('[StoryStateV11.1.0] Unsubscribing from story views');
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
