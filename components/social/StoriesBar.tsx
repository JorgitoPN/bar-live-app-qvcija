
import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import StoryAvatar from '@/components/common/StoryAvatar';

interface StoriesBarProps {
  historias: any[];
  onHistoriaPress: (historia: any) => void;
  onCrearHistoria?: () => void;
  userAvatar?: string;
  userName?: string;
}

const StoriesBar = memo(function StoriesBar({
  historias,
  onHistoriaPress,
  onCrearHistoria,
  userAvatar,
  userName,
}: StoriesBarProps) {
  const { user } = useAuth();
  const { activeProfileType, activeProfileId, activeLocalData } = useMode();
  
  const isInteractingAsLocal = activeProfileType === 'local';
  const interactionId = isInteractingAsLocal ? activeProfileId : user?.id;
  
  // Separar historias propias de las de otros
  const { userStories, otherStories } = useMemo(() => {
    if (isInteractingAsLocal && activeProfileId) {
      const userStories = historias.filter(h => 
        h.tipo === 'local' && h.local_id === activeProfileId
      );
      const otherStories = historias.filter(h => 
        !(h.tipo === 'local' && h.local_id === activeProfileId)
      );
      return { userStories, otherStories };
    } else if (user) {
      const userStories = historias.filter(h => 
        h.tipo === 'usuario' && h.autor_id === user.id
      );
      const otherStories = historias.filter(h => 
        !(h.tipo === 'usuario' && h.autor_id === user.id)
      );
      return { userStories, otherStories };
    }
    
    return { userStories: [], otherStories: historias };
  }, [historias, user, isInteractingAsLocal, activeProfileId]);

  // Agrupar historias por autor
  const groupedStories = useMemo(() => {
    const groups = new Map<string, any[]>();
    
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
      >
        {/* Botón para crear historia */}
        {user && onCrearHistoria && userStories.length === 0 && (
          <TouchableOpacity style={styles.createStory} onPress={onCrearHistoria}>
            <View style={styles.createAvatarContainer}>
              <StoryAvatar
                userId=""
                userStories={[]}
                avatarUrl={userAvatar}
                userName="Tu historia"
                size={80}
                onPress={onCrearHistoria}
                showLabel={false}
              />
              <View style={styles.createAddButton}>
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addButtonGradient}
                >
                  <IconSymbol
                    ios_icon_name="plus"
                    android_material_icon_name="add"
                    size={18}
                    color="#fff"
                  />
                </LinearGradient>
              </View>
            </View>
            <Text style={styles.storyLabel}>Tu historia</Text>
          </TouchableOpacity>
        )}

        {/* Historias propias */}
        {userStories.length > 0 && (
          <View style={styles.storyContainer}>
            <StoryAvatar
              userId={interactionId || ''}
              userStories={userStories}
              avatarUrl={userAvatar}
              userName={isInteractingAsLocal ? activeLocalData?.nombre || 'Tu local' : 'Tu historia'}
              size={80}
              onPress={() => onHistoriaPress(userStories[0])}
              showLabel={true}
            />
          </View>
        )}

        {/* Historias de otros usuarios */}
        {groupedStories.map(({ authorId, stories, latestStory }) => {
          let displayName = '';
          let avatarUrl = null;
          
          if (latestStory.tipo === 'local') {
            displayName = latestStory.local?.nombre || 'Local';
            avatarUrl = latestStory.local?.imagen_url || null;
          } else {
            displayName = latestStory.autor?.username || latestStory.autor?.nombre || 'Usuario';
            avatarUrl = latestStory.autor?.avatar || null;
          }
          
          return (
            <View key={authorId} style={styles.storyContainer}>
              <StoryAvatar
                userId={authorId}
                userStories={stories}
                avatarUrl={avatarUrl || undefined}
                userName={displayName}
                size={80}
                onPress={() => onHistoriaPress(latestStory)}
                showLabel={true}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 16,
  },
  createStory: {
    alignItems: 'center',
    width: 80,
  },
  createAvatarContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  createAddButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 3,
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
    width: 80,
  },
  storyLabel: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    marginTop: 4,
  },
});

export default StoriesBar;
