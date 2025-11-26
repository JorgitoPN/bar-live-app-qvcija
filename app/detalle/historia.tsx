
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import NewStoryViewer from '@/components/social/NewStoryViewer';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { useMode } from '@/contexts/ModeContext';

export default function HistoriaDetalleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { stories } = useGlobalData();
  const { activeLocalProfileId } = useMode();

  const storyId = params.id as string;

  // Find the story and its index
  const storyIndex = stories.findIndex(s => s.id === storyId);
  const story = stories[storyIndex];

  useEffect(() => {
    if (!story || storyIndex === -1) {
      console.log('[HistoriaDetalle] Story not found, going back');
      router.back();
    }
  }, [story, storyIndex, router]);

  if (!story || storyIndex === -1) {
    return null;
  }

  // Get all stories from the same author
  const authorStories = stories.filter(s => 
    story.tipo === 'usuario' 
      ? s.autor_id === story.autor_id && s.tipo === 'usuario'
      : s.local_id === story.local_id && s.tipo === 'local'
  );

  // Find the index of the current story within the author's stories
  const authorStoryIndex = authorStories.findIndex(s => s.id === storyId);

  return (
    <View style={styles.container}>
      <NewStoryViewer
        visible={true}
        stories={authorStories}
        initialIndex={authorStoryIndex >= 0 ? authorStoryIndex : 0}
        onClose={() => router.back()}
        onStoryChange={(index) => {
          console.log('[HistoriaDetalle] Story changed to index:', index);
        }}
        onStoryDelete={(deletedStoryId) => {
          console.log('[HistoriaDetalle] Story deleted:', deletedStoryId);
          if (authorStories.length <= 1) {
            router.back();
          }
        }}
        activeLocalProfileId={activeLocalProfileId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
