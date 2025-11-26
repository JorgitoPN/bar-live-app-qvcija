
import React, { memo, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Historia } from '@/types';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { useStoryState } from '@/contexts/StoryStateContext';

interface NewBarraHistoriasProps {
  historias: Historia[];
  onHistoriaPress: (historia: Historia) => void;
  onCrearHistoria?: () => void;
  userAvatar?: string;
  userName?: string;
  onStoriesUpdate?: (historias: Historia[]) => void;
}

// ✅ INSTAGRAM-STYLE: Story outline colors
const STORY_OUTLINE_COLORS = ['#10B981', '#3B82F6']; // Green to Blue gradient
const VIEWED_OUTLINE_COLORS = ['#E5E7EB', '#E5E7EB']; // Gray for viewed

// Story Item Component
const StoryItem = memo(({ 
  historia, 
  onPress,
  isOwnStory = false,
  hasUnviewedStories = false,
}: { 
  historia: Historia; 
  onPress: () => void;
  isOwnStory?: boolean;
  hasUnviewedStories?: boolean;
}) => {
  // ✅ CRITICAL: Preload story image IMMEDIATELY and AGGRESSIVELY
  useEffect(() => {
    const imageUrl = historia.imagen_url || historia.imagen;
    if (imageUrl) {
      // Use Promise.race to ensure we don't wait too long
      Promise.race([
        Image.prefetch(imageUrl),
        new Promise((_, reject) => setTimeout(() => reject('timeout'), 100))
      ]).catch(() => {
        console.log('[StoryItem] Prefetch timeout or failed for:', imageUrl);
      });
    }
  }, [historia.imagen_url, historia.imagen]);
  
  const displayName = useMemo(() => {
    if (isOwnStory) return 'Tu historia';
    return historia.tipo === 'local'
      ? (historia.autorNombre || 'Local')
      : (historia.autor?.username || historia.autorUsername || historia.autorNombre || historia.autor?.nombre || 'Usuario').replace(/^@/, '');
  }, [historia.tipo, historia.autorNombre, historia.autor?.username, historia.autorUsername, historia.autor?.nombre, isOwnStory]);
  
  // ✅ INSTAGRAM-STYLE: Show outline for unviewed stories, gray for viewed
  const gradientColors = useMemo(() => {
    return hasUnviewedStories ? STORY_OUTLINE_COLORS : VIEWED_OUTLINE_COLORS;
  }, [hasUnviewedStories]);
  
  // Get avatar URL - check all possible sources
  const avatarUrl = useMemo(() => {
    return historia.autorAvatar || historia.autor?.avatar || null;
  }, [historia.autorAvatar, historia.autor?.avatar]);
  
  return (
    <TouchableOpacity
      style={styles.storyContainer}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.storyGradient}
      >
        <View style={styles.storyImageContainer}>
          {avatarUrl ? (
            <Image 
              source={{ uri: avatarUrl }} 
              style={styles.storyImage}
              fadeDuration={0}
            />
          ) : (
            <View style={styles.storyPlaceholder}>
              <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={40} color={colors.textSecondary} />
            </View>
          )}
        </View>
      </LinearGradient>
      <Text style={styles.storyName} numberOfLines={1}>
        {displayName}
      </Text>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.historia.id === nextProps.historia.id &&
    prevProps.hasUnviewedStories === nextProps.hasUnviewedStories &&
    prevProps.historia.autorAvatar === nextProps.historia.autorAvatar &&
    prevProps.historia.autor?.avatar === nextProps.historia.autor?.avatar &&
    prevProps.isOwnStory === nextProps.isOwnStory
  );
});

StoryItem.displayName = 'StoryItem';

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
      <View style={styles.createAvatarContainer}>
        <View style={styles.createAvatarBackground}>
          {userAvatar ? (
            <Image 
              source={{ uri: userAvatar }} 
              style={styles.userAvatarImage}
              fadeDuration={0}
            />
          ) : (
            <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={44} color={colors.textSecondary} />
          )}
        </View>
        <View style={styles.createAddButton}>
          <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={32} color={colors.primary} />
        </View>
      </View>
      <Text style={styles.createText}>Tu historia</Text>
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
  const { hasUnviewedStories } = useStoryState();
  
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
  
  // ✅ CRITICAL: Preload ALL story images IMMEDIATELY and AGGRESSIVELY
  useEffect(() => {
    const allImages = historias
      .map(h => h.imagen_url || h.imagen)
      .filter(Boolean) as string[];
    
    if (allImages.length > 0) {
      console.log('[NewBarraHistorias] ⚡⚡⚡ INSTANT PRELOAD:', allImages.length, 'images');
      
      // Preload all images in parallel with timeout
      allImages.forEach(uri => {
        Promise.race([
          Image.prefetch(uri),
          new Promise((_, reject) => setTimeout(() => reject('timeout'), 500))
        ]).catch(() => {
          console.log('[NewBarraHistorias] Prefetch timeout for:', uri);
        });
      });
    }
  }, [historias]);

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
  
  // ✅ INSTAGRAM-STYLE: Check if user has unviewed stories for outline
  const userHasUnviewedStories = useMemo(() => {
    if (!user || userStories.length === 0) return false;
    return hasUnviewedStories(user.id, userStories);
  }, [user, userStories, hasUnviewedStories]);
  
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
            // Show user's story with their avatar and outline if unviewed
            <StoryItem
              key={userStories[0].id}
              historia={userStories[0]}
              onPress={() => onHistoriaPress(userStories[0])}
              isOwnStory={true}
              hasUnviewedStories={userHasUnviewedStories}
            />
          ) : (
            // Show create story button with user's avatar and "+" icon
            <CreateStoryButton 
              onPress={onCrearHistoria}
              userAvatar={userAvatar || user.avatar}
              userName={userName || user.nombre}
            />
          )
        )}

        {/* ✅ INSTAGRAM-STYLE: Other Users' Stories (chronological order by last story) */}
        {otherStories.map((historia) => {
          // Get all stories from this author
          const authorId = historia.tipo === 'usuario' ? historia.autor_id : historia.local_id;
          const authorStories = otherStories.filter(h => 
            historia.tipo === 'usuario' 
              ? h.autor_id === authorId && h.tipo === 'usuario'
              : h.local_id === authorId && h.tipo === 'local'
          );
          
          // Check if this author has unviewed stories
          const hasUnviewed = hasUnviewedStories(authorId || '', authorStories);
          
          return (
            <StoryItem
              key={historia.id}
              historia={historia}
              onPress={() => onHistoriaPress(historia)}
              hasUnviewedStories={hasUnviewed}
            />
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
  },
  createAvatarContainer: {
    width: 92,
    height: 92,
    position: 'relative',
    marginBottom: 6,
  },
  createAvatarBackground: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
  },
  createAddButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  createText: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  storyContainer: {
    alignItems: 'center',
    width: 96,
  },
  storyGradient: {
    width: 92,
    height: 92,
    borderRadius: 46,
    padding: 3,
    marginBottom: 6,
  },
  storyImageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 43,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.background,
  },
  storyImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBorder,
  },
  storyPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyName: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default NewBarraHistorias;
