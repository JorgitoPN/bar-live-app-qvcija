
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { colors } from '@/styles/commonStyles';
import UnifiedStoryViewerV9 from '@/components/social/UnifiedStoryViewerV9';
import { useMode } from '@/contexts/ModeContext';

export default function HistoriaDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { activeProfileType, activeProfileId } = useMode();
  const [stories, setStories] = useState<any[]>([]);
  const [initialIndex, setInitialIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // ✅ Fixed: Added loadStories to dependencies
  useEffect(() => {
    loadStories();
  }, [id, loadStories]);

  const loadStories = React.useCallback(async () => {
    if (!id) {
      router.back();
      return;
    }

    try {
      // First, load the current story with proper joins
      const { data: currentStory, error: storyError } = await supabase
        .from('historias')
        .select(`
          *,
          autor:usuarios!historias_autor_id_fkey(
            id,
            nombre,
            username,
            avatar
          ),
          local:locales!historias_local_id_fkey(
            id,
            nombre,
            imagen_url
          )
        `)
        .eq('id', id)
        .single();

      if (storyError) {
        console.error('[HistoriaDetail] Error loading story:', storyError);
        router.back();
        return;
      }

      if (!currentStory) {
        console.error('[HistoriaDetail] Story not found');
        router.back();
        return;
      }

      // Determine the author ID based on story type
      const authorId = currentStory.tipo === 'usuario' 
        ? currentStory.autor_id 
        : currentStory.local_id;

      // Build query for all stories from the same author
      let storiesQuery = supabase
        .from('historias')
        .select(`
          *,
          autor:usuarios!historias_autor_id_fkey(
            id,
            nombre,
            username,
            avatar
          ),
          local:locales!historias_local_id_fkey(
            id,
            nombre,
            imagen_url
          )
        `)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      // Filter by story type and author
      if (currentStory.tipo === 'usuario') {
        storiesQuery = storiesQuery
          .eq('tipo', 'usuario')
          .eq('autor_id', authorId);
      } else {
        storiesQuery = storiesQuery
          .eq('tipo', 'local')
          .eq('local_id', authorId);
      }

      const { data: allStories, error: storiesError } = await storiesQuery;

      if (storiesError) {
        console.error('[HistoriaDetail] Error loading stories:', storiesError);
        setStories([currentStory]);
        setInitialIndex(0);
      } else {
        const storiesList = allStories || [currentStory];
        const index = storiesList.findIndex(s => s.id === id);
        setStories(storiesList);
        setInitialIndex(index >= 0 ? index : 0);
      }
    } catch (error) {
      console.error('[HistoriaDetail] Error:', error);
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const handleClose = () => {
    router.back();
  };

  const handleStoryDelete = (storyId: string) => {
    const updatedStories = stories.filter(s => s.id !== storyId);
    setStories(updatedStories);
    
    if (updatedStories.length === 0) {
      router.back();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando historia...</Text>
      </View>
    );
  }

  return (
    <UnifiedStoryViewerV9
      visible={true}
      stories={stories}
      initialIndex={initialIndex}
      onClose={handleClose}
      onStoryDelete={handleStoryDelete}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
});
