
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from './AuthContext';

interface StoryStateContextType {
  hasUnviewedStories: (userId: string, stories: any[]) => boolean;
  markStoriesAsViewed: (storyIds: string[]) => void;
  refreshStoryState: () => void;
  viewedStoryIds: Set<string>;
}

const StoryStateContext = createContext<StoryStateContextType | undefined>(undefined);

/**
 * ✅ STORY STATE CONTEXT V10.0 - Instagram-style story view tracking
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
  const [loading, setLoading] = useState(false);

  // Load viewed stories on mount and when user changes
  useEffect(() => {
    if (user) {
      loadViewedStories();
    } else {
      setViewedStoryIds(new Set());
    }
  }, [user]);

  const loadViewedStories = async () => {
    if (!user || loading) return;

    setLoading(true);
    try {
      console.log('[StoryStateV10] 📥 Loading viewed stories for user:', user.id);
      
      const { data, error } = await supabase
        .from('historia_views')
        .select('historia_id')
        .eq('usuario_id', user.id);

      if (error) {
        console.error('[StoryStateV10] ❌ Error loading viewed stories:', error);
        return;
      }

      const viewedIds = new Set(data?.map(v => v.historia_id) || []);
      setViewedStoryIds(viewedIds);
      console.log('[StoryStateV10] ✅ Loaded', viewedIds.size, 'viewed stories');
    } catch (error) {
      console.error('[StoryStateV10] ❌ Error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * ✅ INSTAGRAM LOGIC: Check if user has unviewed stories
   * - Own stories always show border (for stats access)
   * - Other users: Show border ONLY if at least one story is unviewed
   * - Border disappears when ALL stories are viewed
   */
  const hasUnviewedStories = useCallback((userId: string, stories: any[]) => {
    if (!user || stories.length === 0) {
      return false;
    }
    
    // Own stories always show border (for stats)
    if (userId === user.id) {
      console.log('[StoryStateV10] 👤 Own stories - always show border');
      return true;
    }
    
    // ✅ INSTAGRAM LOGIC: Check if ANY story is unviewed
    const hasUnviewed = stories.some(s => !viewedStoryIds.has(s.id));
    
    console.log('[StoryStateV10] 👁️ Instagram logic:', {
      userId,
      totalStories: stories.length,
      viewedCount: stories.filter(s => viewedStoryIds.has(s.id)).length,
      hasUnviewed,
      willShowBorder: hasUnviewed,
    });
    
    return hasUnviewed;
  }, [user, viewedStoryIds]);

  /**
   * ✅ OPTIMISTIC UPDATE: Mark stories as viewed immediately
   * This provides instant UI feedback while the database updates
   */
  const markStoriesAsViewed = useCallback((storyIds: string[]) => {
    console.log('[StoryStateV10] 📝 Marking stories as viewed (optimistic):', storyIds);
    setViewedStoryIds(prev => {
      const newSet = new Set(prev);
      storyIds.forEach(id => newSet.add(id));
      console.log('[StoryStateV10] ✅ Total viewed stories:', newSet.size);
      return newSet;
    });
  }, []);

  /**
   * ✅ REFRESH: Reload viewed stories from database
   * Used after real-time updates or manual refresh
   */
  const refreshStoryState = useCallback(() => {
    console.log('[StoryStateV10] 🔄 Refreshing story state');
    loadViewedStories();
  }, [user, loading]);

  // ✅ REAL-TIME SUBSCRIPTION: Listen for new story views
  useEffect(() => {
    if (!user) return;

    console.log('[StoryStateV10] ⚡ Setting up real-time subscription for story views');

    const channel = supabase
      .channel(`story-views-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'historia_views',
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[StoryStateV10] ⚡ New story view detected:', payload.new);
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
          console.log('[StoryStateV10] ⚡ Story view updated:', payload.new);
          // Refresh to ensure consistency
          setTimeout(() => {
            refreshStoryState();
          }, 300);
        }
      )
      .subscribe((status) => {
        console.log('[StoryStateV10] Subscription status:', status);
      });

    return () => {
      console.log('[StoryStateV10] Unsubscribing from story views');
      supabase.removeChannel(channel);
    };
  }, [user, markStoriesAsViewed, refreshStoryState]);

  return (
    <StoryStateContext.Provider value={{ 
      hasUnviewedStories, 
      markStoriesAsViewed, 
      refreshStoryState,
      viewedStoryIds,
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
