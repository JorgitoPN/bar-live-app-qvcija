
import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Easing,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Story {
  id: string;
  imagen_url: string;
  tipo: 'usuario' | 'local';
  autor_id?: string;
  local_id?: string;
  created_at: string;
  visto_por_usuario?: boolean;
  liked_by_user?: boolean;
  views_count?: number;
  comments_count?: number;
  autor?: {
    id: string;
    nombre: string;
    username?: string;
    avatar?: string;
  };
  local?: {
    id: string;
    nombre: string;
    logo?: string;
  };
}

interface NewStoryViewerProps {
  visible: boolean;
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  onStoryChange?: (index: number) => void;
  onStoryDelete?: (storyId: string) => void;
  activeLocalProfileId?: string | null;
}

interface ProgressBarProps {
  isActive: boolean;
  isPaused: boolean;
  duration: number;
  onComplete: () => void;
  progress: Animated.Value;
}

const ProgressBar = memo(({ isActive, isPaused, duration, onComplete, progress }: ProgressBarProps) => {
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // ✅ FIXED: Removed unnecessary dependencies
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
  }, [isActive, isPaused]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.progressBarContainer}>
      <Animated.View style={[styles.progressBarFill, { width }]} />
    </View>
  );
});

ProgressBar.displayName = 'ProgressBar';

function NewStoryViewer({
  visible,
  stories,
  initialIndex,
  onClose,
  onStoryChange,
  onStoryDelete,
  activeLocalProfileId,
}: NewStoryViewerProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const progressValues = useRef(stories.map(() => new Animated.Value(0))).current;
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const currentStory = stories[currentIndex];
  const isOwner = currentStory?.tipo === 'usuario' 
    ? currentStory?.autor_id === user?.id
    : currentStory?.local_id === activeLocalProfileId;

  const markAsViewed = useCallback(async (storyId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('historia_views')
        .upsert({
          historia_id: storyId,
          usuario_id: user.id,
          viewed_at: new Date().toISOString(),
        }, {
          onConflict: 'historia_id,usuario_id',
        });

      if (error) {
        console.error('[NewStoryViewer] Error marking story as viewed:', error);
      }
    } catch (error) {
      console.error('[NewStoryViewer] Error:', error);
    }
  }, [user]);

  // ✅ FIXED: Removed unnecessary dependencies
  useEffect(() => {
    if (visible && currentStory && user && !isOwner) {
      markAsViewed(currentStory.id);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      progressValues.forEach(p => p.setValue(0));
    }
  }, [visible, initialIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      progressValues[currentIndex].setValue(1);
      setCurrentIndex(currentIndex + 1);
      if (onStoryChange) {
        onStoryChange(currentIndex + 1);
      }
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, progressValues, onStoryChange, onClose]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      progressValues[currentIndex].setValue(0);
      setCurrentIndex(currentIndex - 1);
      if (onStoryChange) {
        onStoryChange(currentIndex - 1);
      }
    }
  }, [currentIndex, progressValues, onStoryChange]);

  const handleLongPressIn = useCallback(() => {
    setIsPaused(true);
    longPressTimer.current = setTimeout(() => {
      console.log('[NewStoryViewer] Long press detected');
    }, 500);
  }, []);

  const handleLongPressOut = useCallback(() => {
    setIsPaused(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: handleLongPressIn,
      onPanResponderRelease: (_, gestureState) => {
        handleLongPressOut();
        
        const { dx } = gestureState;
        if (Math.abs(dx) < 50) {
          const tapX = gestureState.x0;
          if (tapX < SCREEN_WIDTH / 2) {
            handlePrevious();
          } else {
            handleNext();
          }
        }
      },
    })
  ).current;

  const handleDelete = useCallback(async () => {
    if (!currentStory || !isOwner) return;

    try {
      const { error } = await supabase
        .from('historias')
        .delete()
        .eq('id', currentStory.id);

      if (error) {
        console.error('[NewStoryViewer] Error deleting story:', error);
        return;
      }

      if (onStoryDelete) {
        onStoryDelete(currentStory.id);
      }

      if (currentIndex < stories.length - 1) {
        handleNext();
      } else if (currentIndex > 0) {
        handlePrevious();
      } else {
        onClose();
      }
    } catch (error) {
      console.error('[NewStoryViewer] Error:', error);
    }
  }, [currentStory, isOwner, currentIndex, stories.length, onStoryDelete, handleNext, handlePrevious, onClose]);

  if (!visible || !currentStory) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container} {...panResponder.panHandlers}>
        <Image
          source={{ uri: currentStory.imagen_url }}
          style={styles.storyImage}
          resizeMode="contain"
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
        />

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.headerText} />
          </View>
        )}

        <View style={styles.progressContainer}>
          {stories.map((_, index) => (
            <View key={index} style={styles.progressBarWrapper}>
              <ProgressBar
                isActive={index === currentIndex}
                isPaused={isPaused || loading}
                duration={5000}
                onComplete={handleNext}
                progress={progressValues[index]}
              />
            </View>
          ))}
        </View>

        <View style={styles.header}>
          <View style={styles.authorInfo}>
            <Image
              source={{
                uri: currentStory.tipo === 'usuario'
                  ? currentStory.autor?.avatar || 'https://via.placeholder.com/40'
                  : currentStory.local?.logo || 'https://via.placeholder.com/40',
              }}
              style={styles.authorAvatar}
            />
            <Text style={styles.authorName}>
              {currentStory.tipo === 'usuario'
                ? currentStory.autor?.nombre || 'Usuario'
                : currentStory.local?.nombre || 'Local'}
            </Text>
            <Text style={styles.storyTime}>
              {new Date(currentStory.created_at).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.headerActions}>
            {isOwner && (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleDelete}
              >
                <IconSymbol
                  ios_icon_name="trash"
                  android_material_icon_name="delete"
                  size={24}
                  color={colors.headerText}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.headerButton}
              onPress={onClose}
            >
              <IconSymbol
                ios_icon_name="xmark"
                android_material_icon_name="close"
                size={24}
                color={colors.headerText}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  storyImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  progressContainer: {
    position: 'absolute',
    top: 60,
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  progressBarWrapper: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBarContainer: {
    flex: 1,
    height: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.headerText,
  },
  header: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
    marginRight: 8,
  },
  storyTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
});

export default memo(NewStoryViewer);
