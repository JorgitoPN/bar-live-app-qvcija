
import React, { memo, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Historia } from '@/types';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import StoryAvatar from '@/components/common/StoryAvatar';

interface NewBarraHistoriasProps {
  historias: Historia[];
  onHistoriaPress: (historia: Historia) => void;
  onCrearHistoria?: () => void;
  userAvatar?: string;
  userName?: string;
  onStoriesUpdate?: (historias: Historia[]) => void;
}

// ✅ INSTAGRAM-STYLE: Create Story Button (shown when user has no stories)
const CreateStoryButton = memo(({ 
  onPress,
  userAvatar,
  userName,
}: { 
  onPress: () => void;
  userAvatar?: string;
  userName?: string;
}) => {
  return (
    <TouchableOpacity style={styles.createStory} onPress={onPress} activeOpacity={0.7}>
      <StoryAvatar
        userId=""
        userStories={[]}
        avatarUrl={userAvatar}
        userName={userName || 'Tu historia'}
        size={92}
        onPress={onPress}
        showLabel={true}
        labelText="Tu historia"
      />
      <View style={styles.createAddButton}>
        <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={32} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
});

CreateStoryButton.displayName = 'CreateStoryButton';

// Main Component
const NewBarraHistorias = memo(function NewBarraHistorias({
  historias,
  onHistoriaPress,
  onCrearHistoria,
  userAvatar,
  userName,
  onStoriesUpdate,
}: NewBarraHistoriasProps) {
  const { user } = useAuth();
  
  // Separate user's own stories from others
  const { userStories, otherStories } = useMemo(() => {
    const userStories = historias.filter(h => 
      h.tipo === 'usuario' && h.autor_id === user?.id
    );
    const otherStories = historias.filter(h => 
      !(h.tipo === 'usuario' && h.autor_id === user?.id)
    );
    
    return { userStories, otherStories };
  }, [historias, user?.id]);

  // ✅ REAL-TIME: Story updates subscription
  useEffect(() => {
    if (!user || !onStoriesUpdate) return;

    console.log('[NewBarraHistorias] ⚡ Setting up real-time story subscription');

    const channel = supabase
      .channel('stories_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'historias',
        },
        async (payload) => {
          console.log('[NewBarraHistorias] ⚡ New story detected:', payload);
          
          // Fetch the complete story data with author info
          const { data: newStory, error } = await supabase
            .from('historias')
            .select(`
              *,
              autor:usuarios!historias_autor_id_fkey(
                id,
                nombre,
                username,
                avatar
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (error) {
            console.error('[NewBarraHistorias] Error fetching new story:', error);
            return;
          }

          if (newStory) {
            console.log('[NewBarraHistorias] ✅ Adding new story to list');
            // Add the new story to the existing list
            onStoriesUpdate([...historias, newStory as Historia]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'historias',
        },
        (payload) => {
          console.log('[NewBarraHistorias] ⚡ Story deleted:', payload);
          // Remove the deleted story from the list
          onStoriesUpdate(historias.filter(h => h.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        console.log('[NewBarraHistorias] Subscription status:', status);
      });

    return () => {
      console.log('[NewBarraHistorias] Unsubscribing from stories');
      supabase.removeChannel(channel);
    };
  }, [user, historias, onStoriesUpdate]);
  
  // Group stories by author to show only one avatar per author
  const groupedStories = useMemo(() => {
    const groups = new Map<string, Historia[]>();
    
    otherStories.forEach(historia => {
      const authorId = historia.tipo === 'usuario' ? historia.autor_id : historia.local_id;
      if (!authorId) return;
      
      if (!groups.has(authorId)) {
        groups.set(authorId, []);
      }
      groups.get(authorId)!.push(historia);
    });
    
    // Convert to array and sort by most recent story
    return Array.from(groups.entries())
      .map(([authorId, stories]) => ({
        authorId,
        stories: stories.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
        latestStory: stories[0],
      }))
      .sort((a, b) => 
        new Date(b.latestStory.created_at).getTime() - new Date(a.latestStory.created_at).getTime()
      );
  }, [otherStories]);
  
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        removeClippedSubviews={false}
        scrollEventThrottle={16}
        decelerationRate="fast"
      >
        {/* ✅ INSTAGRAM-STYLE: User's Own Story or Create Story Button (FIRST ELEMENT) */}
        {user && onCrearHistoria && (
          userStories.length > 0 ? (
            // Show user's story with StoryAvatar component
            <View style={styles.storyContainer}>
              <StoryAvatar
                userId={user.id}
                userStories={userStories}
                avatarUrl={userAvatar || user.avatar}
                userName="Tu historia"
                size={92}
                onPress={() => onHistoriaPress(userStories[0])}
                showLabel={true}
                labelText="Tu historia"
              />
            </View>
          ) : (
            // Show create story button
            <CreateStoryButton 
              onPress={onCrearHistoria}
              userAvatar={userAvatar || user.avatar}
              userName={userName || user.nombre}
            />
          )
        )}

        {/* ✅ INSTAGRAM-STYLE: Other Users' Stories (grouped by author) */}
        {groupedStories.map(({ authorId, stories, latestStory }) => {
          const displayName = latestStory.tipo === 'local'
            ? (latestStory.autorNombre || 'Local')
            : (latestStory.autor?.username || latestStory.autorUsername || latestStory.autorNombre || latestStory.autor?.nombre || 'Usuario').replace(/^@/, '');
          
          const avatarUrl = latestStory.autorAvatar || latestStory.autor?.avatar || null;
          
          return (
            <View key={authorId} style={styles.storyContainer}>
              <StoryAvatar
                userId={authorId}
                userStories={stories}
                avatarUrl={avatarUrl || undefined}
                userName={displayName}
                size={92}
                onPress={() => onHistoriaPress(latestStory)}
                showLabel={true}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.historias.length === nextProps.historias.length &&
    prevProps.historias[0]?.id === nextProps.historias[0]?.id &&
    prevProps.historias[0]?.visto_por_usuario === nextProps.historias[0]?.visto_por_usuario &&
    prevProps.historias[0]?.autorAvatar === nextProps.historias[0]?.autorAvatar &&
    prevProps.userAvatar === nextProps.userAvatar &&
    prevProps.userName === nextProps.userName
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingVertical: 0,
    borderBottomWidth: 0,
    marginTop: 0,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  createStory: {
    alignItems: 'center',
    width: 96,
    position: 'relative',
  },
  createAddButton: {
    position: 'absolute',
    bottom: 20,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  storyContainer: {
    alignItems: 'center',
    width: 96,
  },
});

export default NewBarraHistorias;
