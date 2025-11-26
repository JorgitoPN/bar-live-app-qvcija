
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
  StatusBar,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Story {
  id: string;
  imagen_url?: string;
  imagen?: string;
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
  autorNombre?: string;
  autorAvatar?: string;
  autorUsername?: string;
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
      useNativeDriver: false,
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
      <Animated.View 
        style={[
          styles.progressBarFill, 
          { 
            width: progress.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            })
          }
        ]} 
      />
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
  const isLongPressing = useRef(false);

  const currentStory = stories[currentIndex];
  const isOwner = currentStory?.tipo === 'usuario' 
    ? currentStory?.autor_id === user?.id
    : currentStory?.local_id === activeLocalProfileId;

  const storyImageUrl = currentStory?.imagen_url || currentStory?.imagen || '';

  const markAsViewed = useCallback(async (storyId: string) => {
    if (!user || !storyId) return;

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

  useEffect(() => {
    if (visible && currentStory && user && !isOwner) {
      markAsViewed(currentStory.id);
    }
  }, [visible, currentStory, user, isOwner, markAsViewed]);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setLoading(true);
      progressValues.forEach(p => p.setValue(0));
    }
  }, [visible, initialIndex, progressValues]);

  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      progressValues[currentIndex].setValue(1);
      setCurrentIndex(currentIndex + 1);
      setLoading(true);
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
      setLoading(true);
      if (onStoryChange) {
        onStoryChange(currentIndex - 1);
      }
    }
  }, [currentIndex, progressValues, onStoryChange]);

  const handleLongPressIn = useCallback(() => {
    isLongPressing.current = true;
    setIsPaused(true);
    console.log('[NewStoryViewer] Story paused');
  }, []);

  const handleLongPressOut = useCallback(() => {
    isLongPressing.current = false;
    setIsPaused(false);
    console.log('[NewStoryViewer] Story resumed');
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gestureState) => {
        // Start pause timer
        longPressTimer.current = setTimeout(() => {
          handleLongPressIn();
        }, 100); // Very short delay to detect hold
      },
      onPanResponderMove: (_, gestureState) => {
        // If user moves finger significantly, cancel long press
        if (Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10) {
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Clear timer if still running
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        // If was long pressing, just resume
        if (isLongPressing.current) {
          handleLongPressOut();
          return;
        }
        
        // Otherwise handle tap navigation
        const { dx, dy } = gestureState;
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
          const tapX = gestureState.x0;
          if (tapX < SCREEN_WIDTH / 2) {
            handlePrevious();
          } else {
            handleNext();
          }
        }
      },
      onPanResponderTerminate: () => {
        // Clean up on termination
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        if (isLongPressing.current) {
          handleLongPressOut();
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

  const authorAvatar = currentStory.tipo === 'usuario'
    ? (currentStory.autor?.avatar || currentStory.autorAvatar)
    : (currentStory.local?.logo);
  
  const authorName = currentStory.tipo === 'usuario'
    ? (currentStory.autor?.nombre || currentStory.autorNombre || 'Usuario')
    : (currentStory.local?.nombre || 'Local');

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      hardwareAccelerated
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.container} {...panResponder.panHandlers}>
        {storyImageUrl ? (
          <Image
            source={{ uri: storyImageUrl }}
            style={styles.storyImage}
            resizeMode="contain"
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              console.error('[NewStoryViewer] Error loading image:', storyImageUrl);
              setLoading(false);
            }}
          />
        ) : (
          <View style={styles.errorContainer}>
            <IconSymbol ios_icon_name="exclamationmark.triangle" android_material_icon_name="error" size={48} color="#fff" />
            <Text style={styles.errorText}>Error al cargar la historia</Text>
          </View>
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.headerText} />
          </View>
        )}

        <BlurView intensity={20} tint="dark" style={styles.progressContainer}>
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
        </BlurView>

        <BlurView intensity={30} tint="dark" style={styles.header}>
          <View style={styles.authorInfo}>
            {authorAvatar ? (
              <Image
                source={{ uri: authorAvatar }}
                style={styles.authorAvatar}
              />
            ) : (
              <View style={styles.authorAvatarPlaceholder}>
                <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={16} color="#fff" />
              </View>
            )}
            <View style={styles.authorTextContainer}>
              <Text style={styles.authorName}>{authorName}</Text>
              <Text style={styles.storyTime}>
                {new Date(currentStory.created_at).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short'
                })}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            {isOwner && (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <IconSymbol
                  ios_icon_name="trash"
                  android_material_icon_name="delete"
                  size={22}
                  color={colors.headerText}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.headerButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <IconSymbol
                ios_icon_name="xmark"
                android_material_icon_name="close"
                size={22}
                color={colors.headerText}
              />
            </TouchableOpacity>
          </View>
        </BlurView>

        {isPaused && (
          <View style={styles.pauseIndicator}>
            <IconSymbol ios_icon_name="pause.fill" android_material_icon_name="pause" size={48} color="rgba(255, 255, 255, 0.8)" />
          </View>
        )}
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
    backgroundColor: '#000',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 16,
  },
  progressContainer: {
    position: 'absolute',
    top: 60,
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    overflow: 'hidden',
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
    paddingVertical: 12,
    borderRadius: 16,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  authorAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  authorTextContainer: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.headerText,
  },
  storyTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  pauseIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default memo(NewStoryViewer);
