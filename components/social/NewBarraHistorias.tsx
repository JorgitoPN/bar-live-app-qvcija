
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import StoryAvatar from '@/components/common/StoryAvatar';

interface Story {
  historia_id: string;
  autor_id: string;
  autor_nombre: string;
  autor_username: string;
  autor_avatar?: string;
  tipo: 'usuario' | 'local';
  local_id?: string;
  local_nombre?: string;
  imagen: string;
  user_has_viewed: boolean;
  created_at: string;
}

interface StoryGroup {
  autor_id: string;
  autor_nombre: string;
  autor_username: string;
  autor_avatar?: string;
  tipo: 'usuario' | 'local';
  local_id?: string;
  local_nombre?: string;
  stories: Story[];
  has_unviewed: boolean;
}

export default function NewBarraHistorias() {
  const { user } = useAuth();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(false);
      
      const { data, error: fetchError } = await supabase.rpc('get_active_stories', {
        p_usuario_id: user.id,
      });

      if (fetchError) {
        console.error('Error loading stories:', fetchError);
        setError(true);
        setLoading(false);
        return;
      }

      if (data && Array.isArray(data)) {
        // Group stories by author
        const grouped: { [key: string]: StoryGroup } = {};

        data.forEach((story: any) => {
          if (!story || !story.historia_id || !story.autor_id) return;
          
          const key = story.autor_id;
          
          if (!grouped[key]) {
            grouped[key] = {
              autor_id: story.autor_id,
              autor_nombre: story.autor_nombre || 'Usuario',
              autor_username: story.autor_username || 'usuario',
              autor_avatar: story.autor_avatar,
              tipo: story.tipo || 'usuario',
              local_id: story.local_id,
              local_nombre: story.local_nombre,
              stories: [],
              has_unviewed: false,
            };
          }

          grouped[key].stories.push({
            historia_id: story.historia_id,
            autor_id: story.autor_id,
            autor_nombre: story.autor_nombre || 'Usuario',
            autor_username: story.autor_username || 'usuario',
            autor_avatar: story.autor_avatar,
            tipo: story.tipo || 'usuario',
            local_id: story.local_id,
            local_nombre: story.local_nombre,
            imagen: story.imagen,
            user_has_viewed: story.user_has_viewed || false,
            created_at: story.created_at,
          });

          if (!story.user_has_viewed) {
            grouped[key].has_unviewed = true;
          }
        });

        setStoryGroups(Object.values(grouped));
      } else {
        setStoryGroups([]);
      }
    } catch (err) {
      console.error('Error in loadStories:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleStoryPress = (group: StoryGroup) => {
    router.push({
      pathname: '/detalle/historia',
      params: {
        autorId: group.autor_id,
        tipo: group.tipo,
      },
    });
  };

  const handleCreateStory = () => {
    router.push('/crear/historia');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error al cargar historias</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Create Story Button */}
        <TouchableOpacity style={styles.storyItem} onPress={handleCreateStory}>
          <View style={styles.createStoryContainer}>
            <StoryAvatar
              imageUrl={user?.avatar}
              size={64}
              hasStory={false}
              viewed={false}
            />
            <View style={styles.addButton}>
              <Ionicons name="add" size={20} color="#fff" />
            </View>
          </View>
          <Text style={styles.storyLabel} numberOfLines={1}>
            Tu historia
          </Text>
        </TouchableOpacity>

        {/* Story Groups */}
        {storyGroups.map((group) => (
          <TouchableOpacity
            key={group.autor_id}
            style={styles.storyItem}
            onPress={() => handleStoryPress(group)}
          >
            <StoryAvatar
              imageUrl={group.autor_avatar}
              size={64}
              hasStory={true}
              viewed={!group.has_unviewed}
            />
            <Text style={styles.storyLabel} numberOfLines={1}>
              {group.tipo === 'local' && group.local_nombre
                ? group.local_nombre
                : group.autor_nombre}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 12,
  },
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  errorContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  scrollContent: {
    paddingHorizontal: 8,
  },
  storyItem: {
    alignItems: 'center',
    marginHorizontal: 6,
    width: 72,
  },
  createStoryContainer: {
    position: 'relative',
  },
  addButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  storyLabel: {
    fontSize: 12,
    color: colors.text,
    marginTop: 6,
    textAlign: 'center',
    width: '100%',
  },
});
