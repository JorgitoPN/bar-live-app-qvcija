
import React, { memo, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Historia } from '@/types';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
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
        size={100}
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

// Helper function to truncate long names
const truncateName = (name: string, maxLength: number = 12): string => {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 1) + '...';
};

const NewBarraHistorias = memo(function NewBarraHistorias({
  historias,
  onHistoriaPress,
  onCrearHistoria,
  userAvatar,
  userName,
  onStoriesUpdate,
}: NewBarraHistoriasProps) {
  const { user } = useAuth();
  const { activeProfileType, activeProfileId, activeLocalData } = useMode();
  
  const isInteractingAsLocal = activeProfileType === 'local';
  const interactionId = isInteractingAsLocal ? activeProfileId : user?.id;
  
  console.log('[NewBarraHistorias] 🎭 Interaction context:', {
    activeProfileType,
    activeProfileId,
    isInteractingAsLocal,
    interactionId,
    localName: activeLocalData?.nombre,
  });
  
  const { userStories, otherStories } = useMemo(() => {
    if (isInteractingAsLocal && activeProfileId) {
      const userStories = historias.filter(h => 
        h.tipo === 'local' && h.local_id === activeProfileId
      );
      const otherStories = historias.filter(h => 
        !(h.tipo === 'local' && h.local_id === activeProfileId)
      );
      
      console.log('[NewBarraHistorias] 🏢 Local mode stories:', {
        localId: activeProfileId,
        userStories: userStories.length,
        otherStories: otherStories.length,
      });
      
      return { userStories, otherStories };
    } else if (user) {
      const userStories = historias.filter(h => 
        h.tipo === 'usuario' && h.autor_id === user.id
      );
      const otherStories = historias.filter(h => 
        !(h.tipo === 'usuario' && h.autor_id === user.id)
      );
      
      console.log('[NewBarraHistorias] 👤 User mode stories:', {
        userId: user.id,
        userStories: userStories.length,
        otherStories: otherStories.length,
      });
      
      return { userStories, otherStories };
    }
    
    return { userStories: [], otherStories: historias };
  }, [historias, user, isInteractingAsLocal, activeProfileId]);

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
          
          const { data: newStory, error } = await supabase
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
            .eq('id', payload.new.id)
            .single();

          if (error) {
            console.error('[NewBarraHistorias] Error fetching new story:', error);
            return;
          }

          if (newStory) {
            console.log('[NewBarraHistorias] ✅ Adding new story to list');
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
        {user && onCrearHistoria && (
          userStories.length > 0 ? (
            <View style={styles.storyContainer}>
              <StoryAvatar
                userId={interactionId || ''}
                userStories={userStories}
                avatarUrl={userAvatar}
                userName={isInteractingAsLocal ? activeLocalData?.nombre || 'Tu local' : 'Tu historia'}
                size={100}
                onPress={() => onHistoriaPress(userStories[0])}
                showLabel={true}
                labelText={isInteractingAsLocal 
                  ? truncateName(activeLocalData?.nombre || 'Tu local')
                  : 'Tu historia'}
              />
            </View>
          ) : (
            <CreateStoryButton 
              onPress={onCrearHistoria}
              userAvatar={userAvatar}
              userName={userName || (isInteractingAsLocal ? activeLocalData?.nombre : user.nombre)}
            />
          )
        )}

        {groupedStories.map(({ authorId, stories, latestStory }) => {
          // Get the display name based on story type
          let displayName = '';
          let avatarUrl = null;
          
          if (latestStory.tipo === 'local') {
            // For local stories, use the local name
            displayName = latestStory.local?.nombre || latestStory.autorNombre || 'Local';
            avatarUrl = latestStory.local?.imagen_url || latestStory.autorAvatar || null;
          } else {
            // For user stories, use username or name
            displayName = (latestStory.autor?.username || latestStory.autorUsername || latestStory.autorNombre || latestStory.autor?.nombre || 'Usuario').replace(/^@/, '');
            avatarUrl = latestStory.autorAvatar || latestStory.autor?.avatar || null;
          }
          
          // Truncate long names
          const truncatedName = truncateName(displayName);
          
          return (
            <View key={authorId} style={styles.storyContainer}>
              <StoryAvatar
                userId={authorId}
                userStories={stories}
                avatarUrl={avatarUrl || undefined}
                userName={truncatedName}
                size={100}
                onPress={() => onHistoriaPress(latestStory)}
                showLabel={true}
                labelText={truncatedName}
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  createStory: {
    alignItems: 'center',
    width: 100,
    position: 'relative',
  },
  createAddButton: {
    position: 'absolute',
    bottom: 24,
    right: 4,
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
    width: 100,
  },
});

export default NewBarraHistorias;
