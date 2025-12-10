
import React, { memo, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Historia } from '@/types';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { supabase } from '@/utils/supabase';
import StoryAvatarV10 from '@/components/common/StoryAvatarV10';

interface InstagramStoriesBarV10Props {
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
      <View style={styles.storyAvatarContainer}>
        <StoryAvatarV10
          userId=""
          userStories={[]}
          avatarUrl={userAvatar}
          userName={userName || 'Tu historia'}
          size={72}
          onPress={onPress}
          showLabel={false}
        />
        <View style={styles.createAddButton}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addButtonGradient}
          >
            <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={16} color={colors.white} />
          </LinearGradient>
        </View>
      </View>
      <Text style={styles.storyLabel} numberOfLines={1}>Tu historia</Text>
    </TouchableOpacity>
  );
});

CreateStoryButton.displayName = 'CreateStoryButton';

const truncateName = (name: string, maxLength: number = 10): string => {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 1) + '...';
};

/**
 * ✅ INSTAGRAM STORIES BAR V10.0 - Complete Instagram-style stories carousel
 * 
 * Features:
 * - ✅ Uses StoryAvatarV10 for consistent border behavior
 * - ✅ Real-time story updates via Supabase subscriptions
 * - ✅ Interaction context support (user/local)
 * - ✅ Grouped stories by author
 * - ✅ Create story button with gradient
 * - ✅ Optimized with memo for performance
 */
const InstagramStoriesBarV10 = memo(function InstagramStoriesBarV10({
  historias,
  onHistoriaPress,
  onCrearHistoria,
  userAvatar,
  userName,
  onStoriesUpdate,
}: InstagramStoriesBarV10Props) {
  const { user } = useAuth();
  const { activeProfileType, activeProfileId, activeLocalData } = useMode();
  
  const isInteractingAsLocal = activeProfileType === 'local';
  const interactionId = isInteractingAsLocal ? activeProfileId : user?.id;
  
  console.log('[InstagramStoriesBarV10] 🎭 V10.0 - Interaction context:', {
    activeProfileType,
    activeProfileId,
    isInteractingAsLocal,
    interactionId,
    localName: activeLocalData?.nombre,
    totalStories: historias.length,
  });
  
  // ✅ SEPARATE USER STORIES: Own stories vs others
  const { userStories, otherStories } = useMemo(() => {
    if (isInteractingAsLocal && activeProfileId) {
      const userStories = historias.filter(h => 
        h.tipo === 'local' && h.local_id === activeProfileId
      );
      const otherStories = historias.filter(h => 
        !(h.tipo === 'local' && h.local_id === activeProfileId)
      );
      
      console.log('[InstagramStoriesBarV10] 🏢 Local mode stories:', {
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
      
      console.log('[InstagramStoriesBarV10] 👤 User mode stories:', {
        userId: user.id,
        userStories: userStories.length,
        otherStories: otherStories.length,
      });
      
      return { userStories, otherStories };
    }
    
    return { userStories: [], otherStories: historias };
  }, [historias, user, isInteractingAsLocal, activeProfileId]);

  // ✅ REAL-TIME UPDATES: Subscribe to story changes
  useEffect(() => {
    if (!user || !onStoriesUpdate) return;

    console.log('[InstagramStoriesBarV10] ⚡ Setting up real-time story subscription');

    const channel = supabase
      .channel('stories_realtime_v10')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'historias',
        },
        async (payload) => {
          console.log('[InstagramStoriesBarV10] ⚡ New story detected:', payload);
          
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
            console.error('[InstagramStoriesBarV10] Error fetching new story:', error);
            return;
          }

          if (newStory) {
            console.log('[InstagramStoriesBarV10] ✅ Adding new story to list');
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
          console.log('[InstagramStoriesBarV10] ⚡ Story deleted:', payload);
          onStoriesUpdate(historias.filter(h => h.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        console.log('[InstagramStoriesBarV10] Subscription status:', status);
      });

    return () => {
      console.log('[InstagramStoriesBarV10] Unsubscribing from stories');
      supabase.removeChannel(channel);
    };
  }, [user, historias, onStoriesUpdate]);
  
  // ✅ GROUP STORIES BY AUTHOR: One avatar per user/local
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
        {/* ✅ OWN STORIES: Show create button or existing stories */}
        {user && onCrearHistoria && (
          userStories.length > 0 ? (
            <View style={styles.storyContainer}>
              <StoryAvatarV10
                userId={interactionId || ''}
                userStories={userStories}
                avatarUrl={userAvatar}
                userName={isInteractingAsLocal ? activeLocalData?.nombre || 'Tu local' : 'Tu historia'}
                size={72}
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

        {/* ✅ OTHER USERS' STORIES: Grouped by author */}
        {groupedStories.map(({ authorId, stories, latestStory }) => {
          let displayName = '';
          let avatarUrl = null;
          
          if (latestStory.tipo === 'local') {
            displayName = latestStory.local?.nombre || latestStory.autorNombre || 'Local';
            avatarUrl = latestStory.local?.imagen_url || latestStory.autorAvatar || null;
          } else {
            displayName = (latestStory.autor?.username || latestStory.autorUsername || latestStory.autorNombre || latestStory.autor?.nombre || 'Usuario').replace(/^@/, '');
            avatarUrl = latestStory.autorAvatar || latestStory.autor?.avatar || null;
          }
          
          const truncatedName = truncateName(displayName);
          
          return (
            <View key={authorId} style={styles.storyContainer}>
              <StoryAvatarV10
                userId={authorId}
                userStories={stories}
                avatarUrl={avatarUrl || undefined}
                userName={truncatedName}
                size={72}
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
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 16,
  },
  createStory: {
    alignItems: 'center',
    width: 72,
  },
  storyAvatarContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  createAddButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.background,
    zIndex: 2,
  },
  addButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyContainer: {
    alignItems: 'center',
    width: 72,
  },
  storyLabel: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    marginTop: 4,
    fontFamily: 'System',
  },
});

export default InstagramStoriesBarV10;
