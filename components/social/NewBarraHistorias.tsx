
import React, { memo, useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useStoryState } from '@/contexts/StoryStateContext';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Historia } from '@/types';

interface NewBarraHistoriasProps {
  historias: Historia[];
  onHistoriaPress?: (historia: Historia) => void;
  onCrearHistoria?: () => void;
  userAvatar?: string;
  userName?: string;
  onStoriesUpdate?: (stories: Historia[]) => void;
}

// ✅ FIXED: Consistent story outline color
const STORY_OUTLINE_COLORS = ['#10B981', '#3B82F6']; // Green to Blue gradient

const NewBarraHistorias = memo(function NewBarraHistorias({
  historias,
  onHistoriaPress,
  onCrearHistoria,
  userAvatar,
  userName,
  onStoriesUpdate,
}: NewBarraHistoriasProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { hasUnviewedStories, refreshStoryStates } = useStoryState();
  const [loading, setLoading] = useState(false);

  // Group stories by user
  const groupedStories = React.useMemo(() => {
    const groups = new Map<string, Historia[]>();
    
    historias.forEach(historia => {
      const key = historia.tipo === 'usuario' 
        ? historia.autor_id 
        : `local-${historia.local_id}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(historia);
    });

    return Array.from(groups.entries()).map(([key, stories]) => ({
      userId: stories[0].autor_id,
      userName: stories[0].autorNombre || stories[0].autor?.nombre || 'Usuario',
      userAvatar: stories[0].autorAvatar || stories[0].autor?.avatar,
      stories: stories.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    }));
  }, [historias]);

  const handleHistoriaPress = useCallback((historia: Historia) => {
    if (onHistoriaPress) {
      onHistoriaPress(historia);
    } else {
      router.push({
        pathname: '/detalle/historia',
        params: { id: historia.id },
      });
    }
  }, [onHistoriaPress, router]);

  const handleCrearHistoria = useCallback(() => {
    if (onCrearHistoria) {
      onCrearHistoria();
    } else {
      router.push('/crear/historia');
    }
  }, [onCrearHistoria, router]);

  // Subscribe to real-time story updates
  useEffect(() => {
    if (!user) return;

    console.log('[NewBarraHistorias] 🔌 Subscribing to real-time story updates');

    const channel = supabase
      .channel('stories-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'historias',
        },
        async (payload) => {
          console.log('[NewBarraHistorias] ⚡ Real-time story update:', payload.eventType);
          
          // Refresh story states
          await refreshStoryStates();
          
          // Notify parent component if callback provided
          if (onStoriesUpdate) {
            setLoading(true);
            // Reload stories from database
            const { data: updatedStories } = await supabase
              .from('historias')
              .select(`
                id,
                autor_id,
                tipo,
                imagen,
                created_at,
                expires_at,
                visto,
                local_id,
                autor:usuarios!historias_autor_id_fkey(nombre, avatar, username)
              `)
              .gt('expires_at', new Date().toISOString())
              .order('created_at', { ascending: false });

            if (updatedStories) {
              const formattedStories = updatedStories.map(s => ({
                ...s,
                autorNombre: s.autor?.nombre,
                autorAvatar: s.autor?.avatar,
                visto_por_usuario: false, // Will be updated by StoryStateContext
              }));
              onStoriesUpdate(formattedStories);
            }
            setLoading(false);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[NewBarraHistorias] 🔌 Unsubscribing from real-time updates');
      supabase.removeChannel(channel);
    };
  }, [user, refreshStoryStates, onStoriesUpdate]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Create Story Button */}
        <TouchableOpacity
          style={styles.storyContainer}
          onPress={handleCrearHistoria}
          activeOpacity={0.8}
        >
          <View style={styles.createStoryCircle}>
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.2)', 'rgba(236, 72, 153, 0.2)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.createStoryGradient}
            >
              {userAvatar ? (
                <Image source={{ uri: userAvatar }} style={styles.createStoryAvatar} />
              ) : (
                <View style={styles.createStoryAvatarPlaceholder}>
                  <IconSymbol
                    ios_icon_name="person.fill"
                    android_material_icon_name="person"
                    size={32}
                    color={colors.primary}
                  />
                </View>
              )}
              <View style={styles.createStoryPlusButton}>
                <IconSymbol
                  ios_icon_name="plus"
                  android_material_icon_name="add"
                  size={16}
                  color={colors.headerText}
                />
              </View>
            </LinearGradient>
          </View>
          <Text style={styles.storyLabel} numberOfLines={1}>
            Tu historia
          </Text>
        </TouchableOpacity>

        {/* User Stories */}
        {groupedStories.map((group, index) => {
          const showOutline = hasUnviewedStories(group.userId, group.stories);
          
          return (
            <TouchableOpacity
              key={index}
              style={styles.storyContainer}
              onPress={() => handleHistoriaPress(group.stories[0])}
              activeOpacity={0.8}
            >
              <View style={styles.storyCircleWrapper}>
                {showOutline && (
                  <LinearGradient
                    colors={STORY_OUTLINE_COLORS}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.storyRing}
                  />
                )}
                <View style={styles.storyCircle}>
                  {group.stories[0].imagen ? (
                    <Image
                      source={{ uri: group.stories[0].imagen }}
                      style={styles.storyImage}
                    />
                  ) : group.userAvatar ? (
                    <Image
                      source={{ uri: group.userAvatar }}
                      style={styles.storyImage}
                    />
                  ) : (
                    <View style={styles.storyPlaceholder}>
                      <IconSymbol
                        ios_icon_name="person.fill"
                        android_material_icon_name="person"
                        size={32}
                        color={colors.headerText}
                      />
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.storyLabel} numberOfLines={1}>
                {group.userName}
              </Text>
            </TouchableOpacity>
          );
        })}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  storyContainer: {
    alignItems: 'center',
    width: 80,
  },
  createStoryCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
  },
  createStoryGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  createStoryAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  createStoryAvatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createStoryPlusButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  storyCircleWrapper: {
    position: 'relative',
    width: 76,
    height: 76,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyRing: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  storyCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.background,
    borderWidth: 3,
    borderColor: colors.background,
    overflow: 'hidden',
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  storyPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary + '40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
    width: '100%',
  },
  loadingContainer: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NewBarraHistorias;
