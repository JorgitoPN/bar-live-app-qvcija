
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from './AuthContext';

interface StoryState {
  id: string;
  viewed: boolean;
  expired: boolean;
  deleted: boolean;
}

interface StoryStateContextType {
  storyStates: Map<string, StoryState>;
  markStoryAsViewed: (storyId: string) => Promise<void>;
  markStoryAsDeleted: (storyId: string) => void;
  isStoryViewed: (storyId: string) => boolean;
  hasUnviewedStories: (userId: string, stories: any[]) => boolean;
  refreshStoryStates: () => Promise<void>;
}

const StoryStateContext = createContext<StoryStateContextType | undefined>(undefined);

export function StoryStateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [storyStates, setStoryStates] = useState<Map<string, StoryState>>(new Map());
  const channelRef = useRef<any>(null);

  // Load all story view states for the current user
  const loadStoryStates = useCallback(async () => {
    if (!user) {
      setStoryStates(new Map());
      return;
    }

    try {
      console.log('[StoryState] 🔄 Loading story states for user:', user.id);

      // Get all active stories (not expired)
      const { data: stories, error: storiesError } = await supabase
        .from('historias')
        .select('id, expires_at, autor_id, tipo, local_id')
        .gt('expires_at', new Date().toISOString());

      if (storiesError) {
        console.error('[StoryState] Error loading stories:', storiesError);
        return;
      }

      // Get all viewed stories for this user
      const { data: views, error: viewsError } = await supabase
        .from('historia_views')
        .select('historia_id')
        .eq('usuario_id', user.id);

      if (viewsError) {
        console.error('[StoryState] Error loading views:', viewsError);
        return;
      }

      const viewedStoryIds = new Set(views?.map(v => v.historia_id) || []);
      const newStates = new Map<string, StoryState>();

      stories?.forEach(story => {
        const isExpired = new Date(story.expires_at) < new Date();
        const isOwn = story.tipo === 'usuario' && story.autor_id === user.id;
        
        newStates.set(story.id, {
          id: story.id,
          viewed: isOwn || viewedStoryIds.has(story.id), // Own stories are always "viewed"
          expired: isExpired,
          deleted: false,
        });
      });

      setStoryStates(newStates);
      console.log('[StoryState] ✅ Loaded', newStates.size, 'story states');
    } catch (error) {
      console.error('[StoryState] Error loading story states:', error);
    }
  }, [user]);

  // ✅ GLOBAL SYNC: Mark a story as viewed and broadcast to all components
  const markStoryAsViewed = useCallback(async (storyId: string) => {
    if (!user) return;

    try {
      // Check if this is the user's own story
      const { data: story } = await supabase
        .from('historias')
        .select('autor_id, tipo, local_id')
        .eq('id', storyId)
        .single();

      if (!story) return;

      // Don't mark own stories as viewed
      const isOwn = story.tipo === 'usuario' && story.autor_id === user.id;

      if (isOwn) {
        console.log('[StoryState] ⚠️ Skipping view for own story');
        return;
      }

      console.log('[StoryState] 📝 Marking story as viewed:', storyId);

      // Check if already viewed
      const { data: existingView } = await supabase
        .from('historia_views')
        .select('id')
        .eq('historia_id', storyId)
        .eq('usuario_id', user.id)
        .maybeSingle();

      if (!existingView) {
        // Insert view record
        const { error } = await supabase
          .from('historia_views')
          .insert({
            historia_id: storyId,
            usuario_id: user.id,
          });

        if (error) {
          console.error('[StoryState] Error inserting view:', error);
          return;
        }
      }

      // ✅ GLOBAL SYNC: Update local state immediately
      setStoryStates(prev => {
        const newStates = new Map(prev);
        const currentState = newStates.get(storyId);
        if (currentState) {
          newStates.set(storyId, { ...currentState, viewed: true });
        } else {
          newStates.set(storyId, { id: storyId, viewed: true, expired: false, deleted: false });
        }
        return newStates;
      });

      console.log('[StoryState] ✅ Story marked as viewed globally');
    } catch (error) {
      console.error('[StoryState] Error marking story as viewed:', error);
    }
  }, [user]);

  // Mark a story as deleted
  const markStoryAsDeleted = useCallback((storyId: string) => {
    console.log('[StoryState] 🗑️ Marking story as deleted:', storyId);
    
    setStoryStates(prev => {
      const newStates = new Map(prev);
      const currentState = newStates.get(storyId);
      if (currentState) {
        newStates.set(storyId, { ...currentState, deleted: true });
      }
      return newStates;
    });
  }, []);

  // Check if a story is viewed
  const isStoryViewed = useCallback((storyId: string): boolean => {
    const state = storyStates.get(storyId);
    return state?.viewed || state?.expired || state?.deleted || false;
  }, [storyStates]);

  // ✅ GLOBAL SYNC: Check if a user has unviewed stories
  const hasUnviewedStories = useCallback((userId: string, stories: any[]): boolean => {
    if (!user) return false;
    
    // If viewing own stories, always show outline (for stats)
    if (userId === user.id) {
      return stories.length > 0;
    }

    // For other users, check if any story is unviewed
    return stories.some(story => {
      const state = storyStates.get(story.id);
      return !state?.viewed && !state?.expired && !state?.deleted;
    });
  }, [user, storyStates]);

  // Refresh story states
  const refreshStoryStates = useCallback(async () => {
    await loadStoryStates();
  }, [loadStoryStates]);

  // Load story states on mount and when user changes
  useEffect(() => {
    loadStoryStates();
  }, [loadStoryStates]);

  // ✅ REAL-TIME: Subscribe to story view updates
  useEffect(() => {
    if (!user) return;

    console.log('[StoryState] 🔌 Subscribing to real-time story updates');

    // Subscribe to story views
    const viewsChannel = supabase
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
          console.log('[StoryState] ⚡ Real-time view update:', payload);
          const storyId = payload.new.historia_id;
          
          setStoryStates(prev => {
            const newStates = new Map(prev);
            const currentState = newStates.get(storyId);
            if (currentState) {
              newStates.set(storyId, { ...currentState, viewed: true });
            } else {
              newStates.set(storyId, { id: storyId, viewed: true, expired: false, deleted: false });
            }
            return newStates;
          });
        }
      )
      .subscribe();

    // Subscribe to story deletions
    const storiesChannel = supabase
      .channel('story-deletions')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'historias',
        },
        (payload) => {
          console.log('[StoryState] ⚡ Real-time story deletion:', payload);
          const storyId = payload.old.id;
          markStoryAsDeleted(storyId);
        }
      )
      .subscribe();

    channelRef.current = { viewsChannel, storiesChannel };

    return () => {
      console.log('[StoryState] 🔌 Unsubscribing from real-time updates');
      supabase.removeChannel(viewsChannel);
      supabase.removeChannel(storiesChannel);
    };
  }, [user, markStoryAsDeleted]);

  return (
    <StoryStateContext.Provider
      value={{
        storyStates,
        markStoryAsViewed,
        markStoryAsDeleted,
        isStoryViewed,
        hasUnviewedStories,
        refreshStoryStates,
      }}
    >
      {children}
    </StoryStateContext.Provider>
  );
}

export function useStoryState() {
  const context = useContext(StoryStateContext);
  if (context === undefined) {
    throw new Error('useStoryState must be used within a StoryStateProvider');
  }
  return context;
}
