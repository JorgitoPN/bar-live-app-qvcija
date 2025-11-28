
import React, { memo, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';
import { useStoryState } from '@/contexts/StoryStateContext';
import type { Historia } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EnhancedStoryCarouselProps {
  historias: Historia[];
  onHistoriaPress?: (historia: Historia) => void;
  onCrearHistoria?: () => void;
  userAvatar?: string;
  userName?: string;
  onStoriesUpdate?: (stories: Historia[]) => void;
}

// ✅ ENHANCED: Story Avatar with gradient ring and animations
const StoryAvatar = memo(({ 
  historia, 
  onPress, 
  hasUnviewed 
}: { 
  historia: Historia; 
  onPress: () => void;
  hasUnviewed: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (hasUnviewed) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [hasUnviewed]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const imageUrl = historia.media_url || historia.imagen_url || historia.imagen;
  const displayName = historia.usuario_nombre || historia.autorNombre || 'Usuario';

  return (
    <TouchableOpacity
      style={styles.storyContainer}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.storyAvatarWrapper,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* ✅ ENHANCED: Gradient ring that disappears when viewed */}
        {hasUnviewed && (
          <Animated.View
            style={[
              styles.storyRingContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['#10B981', '#3B82F6', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.storyRing}
            />
          </Animated.View>
        )}
        
        {/* ✅ Avatar */}
        <View style={styles.storyAvatarInner}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.storyImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.storyPlaceholder}>
              <Text style={styles.storyPlaceholderText}>
                {displayName[0]?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
      
      <Text style={styles.storyLabel} numberOfLines={1}>
        {displayName}
      </Text>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.historia.id === nextProps.historia.id &&
    prevProps.hasUnviewed === nextProps.hasUnviewed
  );
});

StoryAvatar.displayName = 'StoryAvatar';

// ✅ ENHANCED: Create Story Button with gradient
const CreateStoryButton = memo(({ onPress, userAvatar, userName }: { 
  onPress: () => void;
  userAvatar?: string;
  userName?: string;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      style={styles.storyContainer}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.storyAvatarWrapper,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.createStoryRing}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.createStoryGradient}
          >
            {userAvatar ? (
              <Image
                source={{ uri: userAvatar }}
                style={styles.createStoryImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.createStoryPlaceholder}>
                <Text style={styles.createStoryPlaceholderText}>
                  {userName?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View style={styles.createStoryPlusButton}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createStoryPlusGradient}
              >
                <Text style={styles.createStoryPlus}>+</Text>
              </LinearGradient>
            </View>
          </LinearGradient>
        </View>
      </Animated.View>
      
      <Text style={styles.storyLabel} numberOfLines={1}>
        Tu historia
      </Text>
    </TouchableOpacity>
  );
});

CreateStoryButton.displayName = 'CreateStoryButton';

const EnhancedStoryCarousel = memo(function EnhancedStoryCarousel({
  historias,
  onHistoriaPress,
  onCrearHistoria,
  userAvatar,
  userName,
  onStoriesUpdate,
}: EnhancedStoryCarouselProps) {
  const router = useRouter();
  const { hasUnviewedStories } = useStoryState();
  
  // ✅ Group stories by user/local
  const groupedStories = useMemo(() => {
    const groups = new Map<string, Historia[]>();
    
    historias.forEach(historia => {
      const key = historia.tipo === 'usuario' 
        ? `user_${historia.autor_id}`
        : `local_${historia.local_id}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(historia);
    });
    
    // Convert to array and sort by most recent story
    return Array.from(groups.values())
      .map(stories => ({
        stories,
        latestStory: stories.reduce((latest, current) => 
          new Date(current.created_at) > new Date(latest.created_at) ? current : latest
        ),
      }))
      .sort((a, b) => 
        new Date(b.latestStory.created_at).getTime() - new Date(a.latestStory.created_at).getTime()
      );
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

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={SCREEN_WIDTH / 5}
        snapToAlignment="start"
      >
        {/* ✅ Create Story Button */}
        <CreateStoryButton
          onPress={handleCrearHistoria}
          userAvatar={userAvatar}
          userName={userName}
        />

        {/* ✅ Story Avatars */}
        {groupedStories.map((group, index) => {
          const historia = group.latestStory;
          const userId = historia.tipo === 'usuario' ? historia.autor_id : historia.local_id;
          const hasUnviewed = userId ? hasUnviewedStories(userId, group.stories) : false;
          
          return (
            <StoryAvatar
              key={`${historia.tipo}_${userId}_${index}`}
              historia={historia}
              onPress={() => handleHistoriaPress(historia)}
              hasUnviewed={hasUnviewed}
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
    prevProps.userAvatar === nextProps.userAvatar &&
    prevProps.userName === nextProps.userName
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
  storyAvatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  storyRingContainer: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 40,
  },
  storyRing: {
    flex: 1,
    borderRadius: 40,
    padding: 3,
  },
  storyAvatarInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.background,
    padding: 3,
    overflow: 'hidden',
  },
  storyImage: {
    width: '100%',
    height: '100%',
    borderRadius: 33,
  },
  storyPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 33,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyPlaceholderText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  storyLabel: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  createStoryRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
  },
  createStoryGradient: {
    flex: 1,
    padding: 3,
    position: 'relative',
  },
  createStoryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 33,
  },
  createStoryPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 33,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createStoryPlaceholderText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  createStoryPlusButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.background,
  },
  createStoryPlusGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createStoryPlus: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginTop: -2,
  },
});

export default EnhancedStoryCarousel;
