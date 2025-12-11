
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
 * NEW IN V11.0:
 * - ✅ Improved real-time synchronization
 * - ✅ Better performance with optimized queries
 * - ✅ Enhanced error handling
 * - ✅ Consistent border behavior across all pages
 * - ✅ Proper cleanup on unmount
 * - ✅ Loading state for better UX
 * - ✅ FIXED: Own stories border disappears after viewing all stories
 * 
 * Features:
 * - ✅ Tracks viewed stories globally
 * - ✅ Instagram logic: Show border only if ANY story is unviewed
 * - ✅ Real-time synchronization across all avatars
 * - ✅ Optimistic updates for instant UI feedback
 * - ✅ Automatic refresh on mount and user change
 * - ✅ Debounced refresh to prevent excessive database calls
 */
export function StoryStateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshTime = useRef<number>(0);
  const channelRef = useRef<any>(null);

  // Load viewed stories on mount and when user changes
  useEffect(() => {
    if (user) {
      loadViewedStories();
    } else {
      setViewedStoryIds(new Set());
    }
  }, [user]);

  const loadViewedStories = async () => {
    if (!user || isLoading) return;

    // ✅ V11.0: Prevent excessive refreshes (max once per second)
    const now = Date.now();
    if (now - lastRefreshTime.current < 1000) {
      console.log('[StoryStateV11] ⏭️ Skipping refresh - too soon');
      return;
    }
    lastRefreshTime.current = now;

    setIsLoading(true);
    try {
      console.log('[StoryStateV11] 📥 Loading viewed stories for user:', user.id);
      
      const { data, error } = await supabase
        .from('historia_views')
        .select('historia_id')
        .eq('usuario_id', user.id);

      if (error) {
        console.error('[StoryStateV11] ❌ Error loading viewed stories:', error);
        return;
      }

      const viewedIds = new Set(data?.map(v => v.historia_id) || []);
      setViewedStoryIds(viewedIds);
      console.log('[StoryStateV11] ✅ Loaded', viewedIds.size, 'viewed stories');
    } catch (error) {
      console.error('[StoryStateV11] ❌ Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * ✅ V11.0: INSTAGRAM LOGIC - Check if user has unviewed stories
   * - ✅ FIXED: Own stories also check for unviewed status
   * - Other users: Show border ONLY if at least one story is unviewed
   * - Border disappears when ALL stories are viewed
   */
  const hasUnviewedStories = useCallback((userId: string, stories: any[]) => {
    if (!user || stories.length === 0) {
      return false;
    }
    
    // ✅ FIXED: Check if ANY story is unviewed (including own stories)
    const hasUnviewed = stories.some(s => !viewedStoryIds.has(s.id));
    
    const isOwnStories = userId === user.id;
    
    console.log('[StoryStateV11] 👁️ Instagram logic:', {
      userId,
      isOwnStories,
      totalStories: stories.length,
      viewedCount: stories.filter(s => viewedStoryIds.has(s.id)).length,
      hasUnviewed,
      willShowBorder: hasUnviewed,
    });
    
    return hasUnviewed;
  }, [user, viewedStoryIds]);

  /**
   * ✅ V11.0: OPTIMISTIC UPDATE - Mark stories as viewed immediately
   * This provides instant UI feedback while the database updates
   */
  const markStoriesAsViewed = useCallback((storyIds: string[]) => {
    console.log('[StoryStateV11] 📝 Marking stories as viewed (optimistic):', storyIds);
    setViewedStoryIds(prev => {
      const newSet = new Set(prev);
      storyIds.forEach(id => newSet.add(id));
      console.log('[StoryStateV11] ✅ Total viewed stories:', newSet.size);
      return newSet;
    });
  }, []);

  /**
   * ✅ V11.0: DEBOUNCED REFRESH - Reload viewed stories from database
   * Debounced to prevent excessive database calls during rapid updates
   */
  const refreshStoryState = useCallback(() => {
    console.log('[StoryStateV11] 🔄 Scheduling story state refresh');
    
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Schedule new refresh after 300ms
    refreshTimeoutRef.current = setTimeout(() => {
      console.log('[StoryStateV11] 🔄 Executing story state refresh');
      loadViewedStories();
    }, 300);
  }, [user, isLoading]);

  // ✅ V11.0: REAL-TIME SUBSCRIPTION - Listen for new story views
  useEffect(() => {
    if (!user) return;

    console.log('[StoryStateV11] ⚡ Setting up real-time subscription for story views');

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
          console.log('[StoryStateV11] ⚡ New story view detected:', payload.new);
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
          console.log('[StoryStateV11] ⚡ Story view updated:', payload.new);
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
          console.log('[StoryStateV11] ⚡ Story view deleted:', payload.old);
          // Refresh to ensure consistency
          refreshStoryState();
        }
      )
      .subscribe((status) => {
        console.log('[StoryStateV11] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('[StoryStateV11] Unsubscribing from story views');
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
