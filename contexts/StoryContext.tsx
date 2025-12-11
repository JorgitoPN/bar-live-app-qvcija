
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from './AuthContext';

interface StoryContextType {
  viewedStories: Set<string>;
  markAsViewed: (storyId: string) => Promise<void>;
  hasUnviewedStories: (userId: string, stories: any[]) => boolean;
  refreshViews: () => Promise<void>;
}

const StoryContext = createContext<StoryContextType | undefined>(undefined);

export function StoryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  // Cargar historias vistas al iniciar
  const loadViewedStories = useCallback(async () => {
    if (!user || loading) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('historia_views')
        .select('historia_id')
        .eq('usuario_id', user.id);

      if (error) throw error;

      if (mountedRef.current) {
        const viewed = new Set(data?.map(v => v.historia_id) || []);
        setViewedStories(viewed);
        console.log('[StoryContext] ✅ Loaded', viewed.size, 'viewed stories');
      }
    } catch (error) {
      console.error('[StoryContext] ❌ Error loading viewed stories:', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [user, loading]);

  // Cargar al montar y cuando cambie el usuario
  useEffect(() => {
    mountedRef.current = true;
    if (user) {
      loadViewedStories();
    } else {
      setViewedStories(new Set());
    }

    return () => {
      mountedRef.current = false;
    };
  }, [user]);

  // Marcar historia como vista
  const markAsViewed = useCallback(async (storyId: string) => {
    if (!user || !storyId) return;

    // Actualización optimista
    setViewedStories(prev => {
      const newSet = new Set(prev);
      newSet.add(storyId);
      return newSet;
    });

    try {
      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('historia_views')
        .select('id')
        .eq('historia_id', storyId)
        .eq('usuario_id', user.id)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase
          .from('historia_views')
          .insert({
            historia_id: storyId,
            usuario_id: user.id,
            viewed_at: new Date().toISOString(),
            tipo: 'usuario',
          });

        if (error) throw error;
        console.log('[StoryContext] ✅ Story marked as viewed:', storyId);
      }
    } catch (error) {
      console.error('[StoryContext] ❌ Error marking story as viewed:', error);
      // Revertir actualización optimista
      setViewedStories(prev => {
        const newSet = new Set(prev);
        newSet.delete(storyId);
        return newSet;
      });
    }
  }, [user]);

  // Verificar si un usuario tiene historias sin ver
  const hasUnviewedStories = useCallback((userId: string, stories: any[]) => {
    if (!user || stories.length === 0) return false;
    
    // Si hay al menos una historia sin ver, mostrar borde
    const hasUnviewed = stories.some(story => !viewedStories.has(story.id));
    
    console.log('[StoryContext] 👁️ Check unviewed:', {
      userId,
      totalStories: stories.length,
      viewedCount: stories.filter(s => viewedStories.has(s.id)).length,
      hasUnviewed,
    });
    
    return hasUnviewed;
  }, [user, viewedStories]);

  // Refrescar vistas
  const refreshViews = useCallback(async () => {
    await loadViewedStories();
  }, [loadViewedStories]);

  // Suscripción en tiempo real
  useEffect(() => {
    if (!user) return;

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
          console.log('[StoryContext] ⚡ New view detected:', payload.new);
          if (payload.new.historia_id) {
            setViewedStories(prev => {
              const newSet = new Set(prev);
              newSet.add(payload.new.historia_id);
              return newSet;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <StoryContext.Provider value={{ viewedStories, markAsViewed, hasUnviewedStories, refreshViews }}>
      {children}
    </StoryContext.Provider>
  );
}

export function useStoryContext() {
  const context = useContext(StoryContext);
  if (!context) {
    throw new Error('useStoryContext must be used within StoryProvider');
  }
  return context;
}
