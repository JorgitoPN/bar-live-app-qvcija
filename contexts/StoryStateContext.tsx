
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from './AuthContext';

interface StoryStateContextType {
  hasUnviewedStories: (userId: string, stories: any[]) => boolean;
  markStoriesAsViewed: (storyIds: string[]) => void;
  refreshStoryState: () => void;
}

const StoryStateContext = createContext<StoryStateContextType | undefined>(undefined);

export function StoryStateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set());

  // Load viewed stories on mount
  useEffect(() => {
    if (user) {
      loadViewedStories();
    }
  }, [user]);

  const loadViewedStories = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('historia_views')
        .select('historia_id')
        .eq('usuario_id', user.id);

      if (error) {
        console.error('[StoryState] Error loading viewed stories:', error);
        return;
      }

      const viewedIds = new Set(data?.map(v => v.historia_id) || []);
      setViewedStoryIds(viewedIds);
      console.log('[StoryState] ✅ Loaded', viewedIds.size, 'viewed stories');
    } catch (error) {
      console.error('[StoryState] Error:', error);
    }
  };

  const hasUnviewedStories = useCallback((userId: string, stories: any[]) => {
    if (!user || stories.length === 0) return false;
    
    // Own stories always show border (for stats)
    if (userId === user.id) return true;
    
    // Check if ANY story is unviewed (Instagram logic)
    return stories.some(s => !viewedStoryIds.has(s.id));
  }, [user, viewedStoryIds]);

  const markStoriesAsViewed = useCallback((storyIds: string[]) => {
    setViewedStoryIds(prev => {
      const newSet = new Set(prev);
      storyIds.forEach(id => newSet.add(id));
      return newSet;
    });
  }, []);

  const refreshStoryState = useCallback(() => {
    loadViewedStories();
  }, [user]);

  return (
    <StoryStateContext.Provider value={{ hasUnviewedStories, markStoriesAsViewed, refreshStoryState }}>
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
