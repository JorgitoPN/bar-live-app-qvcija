
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Historia {
  id: string;
  imagen: string;
  autor_id?: string;
  local_id?: string;
  tipo: 'usuario' | 'local';
  created_at: string;
  visto_por_usuario?: boolean;
  liked_by_user?: boolean;
  views_count?: number;
  comments_count?: number;
  autor?: {
    id: string;
    nombre: string;
    username: string;
    avatar_url?: string;
  };
  local?: {
    id: string;
    nombre: string;
    avatar_url?: string;
  };
}

interface StoryProgressBarProps {
  isActive: boolean;
  isPaused: boolean;
  duration: number;
  onComplete: () => void;
}

function StoryProgressBar({ isActive, isPaused, duration, onComplete }: StoryProgressBarProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // ✅ FIXED: Added missing dependency 'progress'
  useEffect(() => {
    if (!isActive) {
      progress.setValue(0);
      return;
    }

    if (isPaused) {
      animationRef.current?.stop();
      return;
    }

    const currentValue = (progress as any)._value || 0;
    const remainingDuration = duration * (1 - currentValue);

    animationRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: remainingDuration,
      easing: Easing.linear,
      useNativeDriver: true,
    });

    animationRef.current.start(({ finished }) => {
      if (finished) {
        onComplete();
      }
    });

    return () => {
      animationRef.current?.stop();
    };
  }, [isActive, isPaused, duration, onComplete, progress]);

  return (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarBackground}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              transform: [
                {
                  scaleX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                },
              ],
            },
          ]}
        />
      </View>
    </View>
  );
}

interface NewStoryViewerProps {
  visible: boolean;
  stories: Historia[];
  initialIndex: number;
  onClose: () => void;
}

export default function NewStoryViewer({ visible, stories, initialIndex, onClose }: NewStoryViewerProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const currentStory = stories[currentIndex];
  const isOwner = currentStory?.tipo === 'usuario'
    ? currentStory.autor_id === user?.id
    : currentStory?.local_id === user?.id;

  const markAsViewed = useCallback(async (storyId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('historia_views')
        .upsert({
          historia_id: storyId,
          usuario_id: user.id,
        }, {
          onConflict: 'historia_id,usuario_id',
        });

      if (error) {
        console.error('[NewStoryViewer] Error marking as viewed:', error);
      }
    } catch (error) {
      console.error('[NewStoryViewer] Error:', error);
    }
  }, [user]);

  // ✅ FIXED: Added missing dependency 'markAsViewed'
  useEffect(() => {
    if (visible && currentStory && user && !isOwner) {
      markAsViewed(currentStory.id);
    }
  }, [visible, currentStory, user, isOwner, markAsViewed]);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setLoading(true);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setLoading(true);
    }
  }, [currentIndex]);

  const handlePressIn = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setIsPaused(true);
    }, 200);
  }, []);

  const handlePressOut = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsPaused(false);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: handlePressIn,
      onPanResponderRelease: (evt, gestureState) => {
        handlePressOut();
        const { dx, moveX } = gestureState;

        if (Math.abs(dx) < 50) {
          if (moveX < SCREEN_WIDTH / 2) {
            handlePrevious();
          } else {
            handleNext();
          }
        }
      },
    })
  ).current;

  if (!visible || !currentStory) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        />

        <View style={styles.progressBarsContainer}>
          {stories.map((_, index) => (
            <StoryProgressBar
              key={index}
              isActive={index === currentIndex}
              isPaused={isPaused}
              duration={5000}
              onComplete={handleNext}
            />
          ))}
        </View>

        <View style={styles.header}>
          <View style={styles.authorInfo}>
            <Image
              source={{
                uri: currentStory.tipo === 'usuario'
                  ? currentStory.autor?.avatar_url
                  : currentStory.local?.avatar_url,
              }}
              style={styles.authorAvatar}
            />
            <Text style={styles.authorName}>
              {currentStory.tipo === 'usuario'
                ? currentStory.autor?.username
                : currentStory.local?.nombre}
            </Text>
            <Text style={styles.storyTime}>
              {getTimeAgo(currentStory.created_at)}
            </Text>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.background} />
          </TouchableOpacity>
        </View>

        <View style={styles.imageContainer} {...panResponder.panHandlers}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.background} />
            </View>
          )}
          <Image
            source={{ uri: currentStory.imagen }}
            style={styles.storyImage}
            onLoadEnd={() => setLoading(false)}
            resizeMode="contain"
          />
        </View>

        {isOwner && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={20} color={colors.background} />
              <Text style={styles.statText}>{currentStory.views_count || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <IconSymbol ios_icon_name="heart.fill" android_material_icon_name="favorite" size={20} color={colors.background} />
              <Text style={styles.statText}>{currentStory.comments_count || 0}</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Ahora';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  progressBarsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 48,
    gap: 4,
    zIndex: 10,
  },
  progressBarContainer: {
    flex: 1,
    height: 2,
  },
  progressBarBackground: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBarFill: {
    flex: 1,
    backgroundColor: colors.background,
    transformOrigin: 'left',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.background,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background,
  },
  storyTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  closeButton: {
    padding: 8,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  statsContainer: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 16,
    zIndex: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background,
  },
});
