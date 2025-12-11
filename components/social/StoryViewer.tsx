
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  PanResponder,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useInteractionContext } from '@/hooks/useInteractionContext';
import { useStoryContext } from '@/contexts/StoryContext';
import { Video, ResizeMode } from 'expo-av';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const STORY_DURATION = 5000; // 5 segundos por historia
const TAP_THRESHOLD = 30;
const SWIPE_THRESHOLD = 50;

interface Story {
  id: string;
  imagen_url?: string;
  imagen?: string;
  video_url?: string;
  tipo: 'usuario' | 'local';
  autor_id?: string;
  local_id?: string;
  created_at: string;
  autor?: {
    id: string;
    nombre: string;
    username?: string;
    avatar?: string;
  };
  local?: {
    id: string;
    nombre: string;
    imagen_url?: string;
  };
}

interface StoryViewerProps {
  visible: boolean;
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
}

export default function StoryViewer({
  visible,
  stories,
  initialIndex,
  onClose,
}: StoryViewerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { interactionUserId, interactionLocalId, isInteractingAsLocal } = useInteractionContext();
  const { markAsViewed } = useStoryContext();
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const progressValues = useRef<Animated.Value[]>([]);
  const videoRef = useRef<Video>(null);
  const viewStartTime = useRef<number>(Date.now());
  const hasMarkedAsViewed = useRef<Set<string>>(new Set());
  
  const currentStory = stories[currentIndex];
  const isOwner = currentStory?.tipo === 'usuario' 
    ? currentStory?.autor_id === interactionUserId
    : currentStory?.tipo === 'local' && interactionLocalId === currentStory?.local_id;

  const isVideo = !!(currentStory?.video_url);
  const storyMediaUrl = currentStory?.video_url || currentStory?.imagen_url || currentStory?.imagen || '';

  // Inicializar valores de progreso
  useEffect(() => {
    progressValues.current = stories.map(() => new Animated.Value(0));
  }, [stories.length]);

  // Marcar como vista después de 2 segundos
  useEffect(() => {
    if (!visible || !currentStory || isOwner || hasMarkedAsViewed.current.has(currentStory.id)) {
      return;
    }

    const timer = setTimeout(() => {
      console.log('[StoryViewer] ✅ Marking story as viewed:', currentStory.id);
      markAsViewed(currentStory.id);
      hasMarkedAsViewed.current.add(currentStory.id);
    }, 2000);

    return () => clearTimeout(timer);
  }, [visible, currentStory, isOwner, markAsViewed]);

  // Resetear al abrir
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setLoading(true);
      setIsPaused(false);
      hasMarkedAsViewed.current.clear();
      
      progressValues.current.forEach((p, index) => {
        if (index < initialIndex) {
          p.setValue(1);
        } else {
          p.setValue(0);
        }
      });
      
      viewStartTime.current = Date.now();
    }
  }, [visible, initialIndex]);

  // Avanzar a la siguiente historia
  const handleNext = useCallback(() => {
    console.log('[StoryViewer] ⏭️ Next story');
    
    if (currentIndex >= stories.length - 1) {
      console.log('[StoryViewer] 🏁 Last story - closing');
      onClose();
      return;
    }

    progressValues.current[currentIndex]?.setValue(1);
    setCurrentIndex(currentIndex + 1);
    setLoading(true);
    viewStartTime.current = Date.now();
  }, [currentIndex, stories.length, onClose]);

  // Retroceder a la historia anterior
  const handlePrevious = useCallback(() => {
    console.log('[StoryViewer] ⏮️ Previous story');
    
    if (currentIndex > 0) {
      progressValues.current[currentIndex]?.setValue(0);
      setCurrentIndex(currentIndex - 1);
      setLoading(true);
      viewStartTime.current = Date.now();
    }
  }, [currentIndex]);

  // Animación de progreso
  useEffect(() => {
    if (!visible || isPaused || loading || isVideo) return;

    const progress = progressValues.current[currentIndex];
    if (!progress) return;

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (finished) {
        handleNext();
      }
    });

    return () => animation.stop();
  }, [visible, currentIndex, isPaused, loading, isVideo, handleNext]);

  // Gestos táctiles
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderGrant: () => {
        setIsPaused(true);
        if (isVideo && videoRef.current) {
          videoRef.current.pauseAsync();
        }
      },
      
      onPanResponderRelease: (evt, gestureState) => {
        setIsPaused(false);
        if (isVideo && videoRef.current) {
          videoRef.current.playAsync();
        }

        const { dx, dy } = gestureState;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        
        // Swipe down - cerrar
        if (absDy > SWIPE_THRESHOLD && dy > 0 && absDy > absDx) {
          onClose();
          return;
        }
        
        // Swipe left - siguiente
        if (absDx > SWIPE_THRESHOLD && dx < 0 && absDx > absDy) {
          handleNext();
          return;
        }
        
        // Swipe right - anterior
        if (absDx > SWIPE_THRESHOLD && dx > 0 && absDx > absDy) {
          handlePrevious();
          return;
        }
        
        // Tap
        if (absDx < TAP_THRESHOLD && absDy < TAP_THRESHOLD) {
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

  if (!visible || !currentStory) {
    return null;
  }

  const authorAvatar = currentStory.tipo === 'usuario'
    ? currentStory.autor?.avatar
    : currentStory.local?.imagen_url;
  
  const authorName = currentStory.tipo === 'usuario'
    ? (currentStory.autor?.username || currentStory.autor?.nombre || 'Usuario')
    : (currentStory.local?.nombre || 'Local');

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.container} {...panResponder.panHandlers}>
        {isVideo ? (
          <Video
            ref={videoRef}
            source={{ uri: storyMediaUrl }}
            style={styles.media}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={!isPaused && !loading}
            isLooping={false}
            onLoad={() => setLoading(false)}
            onPlaybackStatusUpdate={(status: any) => {
              if (status.didJustFinish) {
                handleNext();
              }
            }}
          />
        ) : (
          <Image
            source={{ uri: storyMediaUrl }}
            style={styles.media}
            resizeMode="contain"
            onLoadEnd={() => setLoading(false)}
          />
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        {/* Barras de progreso */}
        <BlurView intensity={20} tint="dark" style={styles.progressContainer}>
          {stories.map((_, index) => (
            <View key={index} style={styles.progressBarWrapper}>
              <View style={styles.progressBarBg}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: progressValues.current[index]?.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }) || '0%',
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['#39FF14', '#00D9FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.progressGradient}
                  />
                </Animated.View>
              </View>
            </View>
          ))}
        </BlurView>

        {/* Header */}
        <BlurView intensity={30} tint="dark" style={styles.header}>
          <View style={styles.authorInfo}>
            {authorAvatar ? (
              <Image source={{ uri: authorAvatar }} style={styles.authorAvatar} />
            ) : (
              <View style={styles.authorAvatarPlaceholder}>
                <IconSymbol
                  ios_icon_name="person.circle.fill"
                  android_material_icon_name="account_circle"
                  size={36}
                  color="#fff"
                />
              </View>
            )}
            <Text style={styles.authorName}>{authorName}</Text>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <IconSymbol
              ios_icon_name="xmark"
              android_material_icon_name="close"
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        </BlurView>

        {isPaused && (
          <View style={styles.pauseIndicator}>
            <IconSymbol
              ios_icon_name="pause.fill"
              android_material_icon_name="pause"
              size={48}
              color="rgba(255, 255, 255, 0.8)"
            />
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
  media: {
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
    top: Platform.OS === 'ios' ? 60 : 40,
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
  },
  progressBarBg: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 80 : 60,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
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
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  authorAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  pauseIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
  },
});
