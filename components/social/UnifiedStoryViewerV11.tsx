
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
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import StoryStatsModal from './StoryStatsModal';
import { useRouter } from 'expo-router';
import { useInteractionContext } from '@/hooks/useInteractionContext';
import { useStoryState } from '@/contexts/StoryStateContextV11';
import { Video, ResizeMode } from 'expo-av';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ✅ DEFAULT AVATAR - Simple user icon (non-realistic)
const DEFAULT_AVATAR_ICON = 'person.circle.fill';

// ✅ STORY DURATION - 5 seconds per image (Instagram standard)
const IMAGE_STORY_DURATION = 5000;

// ✅ VIEW THRESHOLDS - When to mark story as viewed
const IMAGE_VIEW_THRESHOLD_PERCENT = 0.3; // 30% of duration
const IMAGE_VIEW_THRESHOLD_MIN = 1000; // 1 second minimum
const VIDEO_VIEW_THRESHOLD_PERCENT = 0.5; // 50% of duration

// ✅ GESTURE THRESHOLDS - Instagram-style gesture recognition
const TAP_THRESHOLD = 25; // Maximum movement for tap (pixels)
const SWIPE_THRESHOLD = 50; // Minimum movement for swipe (pixels)
const LONG_PRESS_DURATION = 250; // Milliseconds for long press

interface Story {
  id: string;
  imagen_url?: string;
  imagen?: string;
  video_url?: string;
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
    imagen_url?: string;
  };
}

interface UnifiedStoryViewerV11Props {
  visible: boolean;
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  onStoryChange?: (index: number) => void;
  onStoryDelete?: (storyId: string) => void;
  duration?: number;
}

interface ProgressBarProps {
  isActive: boolean;
  isPaused: boolean;
  duration: number;
  onComplete: () => void;
  progress: Animated.Value;
  isCompleted: boolean;
}

const truncateName = (name: string, maxLength: number = 20): string => {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 1) + '...';
};

/**
 * ✅ PROGRESS BAR COMPONENT - Instagram-style continuous progress
 * 
 * Features:
 * - Continuous animation without resets
 * - Completed segments stay filled
 * - Pauses when user holds
 * - Smooth transitions
 */
const ProgressBar = memo(({ isActive, isPaused, duration, onComplete, progress, isCompleted }: ProgressBarProps) => {
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!progress) {
      console.log('[ProgressBar] ⚠️ Progress value is undefined');
      return;
    }

    // Stop any existing animation
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }

    // Reset completion flag
    completedRef.current = false;

    // ✅ INSTAGRAM LOGIC: Keep completed bars filled
    if (isCompleted) {
      progress.setValue(1);
      return;
    }

    if (!isActive) {
      progress.setValue(0);
      return;
    }

    if (isPaused) {
      return;
    }

    // Calculate remaining duration based on current progress
    const currentValue = (progress as any)?._value ?? 0;
    const remainingDuration = duration * (1 - currentValue);

    const newAnimation = Animated.timing(progress, {
      toValue: 1,
      duration: remainingDuration,
      easing: Easing.linear,
      useNativeDriver: false,
    });

    animationRef.current = newAnimation;

    newAnimation.start(({ finished }) => {
      if (finished && !completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    });

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
    };
  }, [isActive, isPaused, duration, onComplete, progress, isCompleted]);

  const widthValue = progress ? progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  }) : '0%';

  return (
    <View style={styles.progressBarContainer}>
      <Animated.View 
        style={[
          styles.progressBarFill, 
          { width: widthValue }
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
  );
});

ProgressBar.displayName = 'ProgressBar';

/**
 * ✅ UNIFIED STORY VIEWER V11.2.0 - COMPLETE INSTAGRAM-STYLE IMPLEMENTATION
 * 
 * COMPLETE FEATURE SET:
 * 
 * 1. GESTURE HANDLING (Instagram-style):
 *    ✅ Tap right → Next story (auto-close on last)
 *    ✅ Tap left → Previous story
 *    ✅ Press & hold → Pause story (freezes progress bar)
 *    ✅ Swipe horizontal → Navigate between users
 *    ✅ Swipe down → Close viewer
 *    ✅ Proper thresholds: TAP=25px, SWIPE=50px, LONG_PRESS=250ms
 * 
 * 2. PROGRESS BAR & TIMER:
 *    ✅ Fixed duration → 5s for images, video duration for videos
 *    ✅ Continuous animation → No resets between stories
 *    ✅ Completed segments → Stay filled when advancing
 *    ✅ Manual advance → Marks segment as complete
 *    ✅ Rewind → Empties and replays previous segment
 * 
 * 3. VIEW TRACKING:
 *    ✅ Threshold-based → 30% or 1s for images, 50% for videos
 *    ✅ Marks as viewed → Only after reaching threshold
 *    ✅ Updates backend → Inserts/updates historia_views table
 *    ✅ Notifies UI → Optimistic updates + context refresh
 * 
 * 4. AVATAR BORDER LOGIC:
 *    ✅ Neon green border → Shows when ANY story is unviewed
 *    ✅ Disappears immediately → When ALL stories are viewed
 *    ✅ Global state → Uses StoryStateContextV11
 *    ✅ Real-time updates → Supabase subscriptions
 *    ✅ Works everywhere → Social, profile, comments, etc.
 * 
 * 5. UNIFIED VIEWER:
 *    ✅ Single shared component → Used everywhere
 *    ✅ Global state → StoryStateContextV11 manages viewed/unviewed
 *    ✅ Auto-close → Closes on last story
 *    ✅ Proper cleanup → Clears timers and subscriptions
 * 
 * 6. TOUCH EVENTS:
 *    ✅ Removed pointerEvents → No blocking
 *    ✅ Proper activeOpacity → Visual feedback
 *    ✅ Better touch targets → Larger hit areas
 */
function UnifiedStoryViewerV11({
  visible,
  stories,
  initialIndex,
  onClose,
  onStoryChange,
  onStoryDelete,
  duration = IMAGE_STORY_DURATION,
}: UnifiedStoryViewerV11Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { interactionUserId, interactionLocalId, isInteractingAsLocal } = useInteractionContext();
  const { markStoriesAsViewed, refreshStoryState } = useStoryState();
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [storyMessage, setStoryMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showStoryStats, setShowStoryStats] = useState(false);
  const [storyViews, setStoryViews] = useState<any[]>([]);
  const [storyLikes, setStoryLikes] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  
  const progressValues = useRef<Animated.Value[]>([]);
  const videoRef = useRef<Video>(null);
  
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPressing = useRef(false);
  const viewStartTime = useRef<number>(Date.now());
  const hasMarkedAsViewed = useRef<Set<string>>(new Set());
  const isClosing = useRef(false);

  const currentStory = stories[currentIndex];
  
  const isOwner = currentStory?.tipo === 'usuario' 
    ? currentStory?.autor_id === interactionUserId
    : currentStory?.tipo === 'local' && interactionLocalId === currentStory?.local_id;

  const isVideo = !!(currentStory?.video_url);
  const storyMediaUrl = currentStory?.video_url || currentStory?.imagen_url || currentStory?.imagen || '';
  
  const currentStoryDuration = isVideo && videoDuration ? videoDuration * 1000 : duration;

  console.log('[UnifiedStoryViewerV11.2.0] 🎭 Story viewer:', {
    interactionUserId,
    interactionLocalId,
    isInteractingAsLocal,
    isOwner,
    storyType: currentStory?.tipo,
    currentIndex,
    totalStories: stories.length,
    isLastStory: currentIndex >= stories.length - 1,
    isVideo,
    videoDuration,
    currentStoryDuration,
    visible,
  });

  // Initialize progress values
  useEffect(() => {
    progressValues.current = stories.map(() => new Animated.Value(0));
    console.log('[UnifiedStoryViewerV11.2.0] ✅ Initialized', stories.length, 'progress values');
  }, [stories.length]);

  /**
   * ✅ MARK AS VIEWED - Threshold-based view tracking
   * 
   * Logic:
   * - Images: 30% of duration OR 1 second minimum
   * - Videos: 50% of duration
   * - Only marks once per story
   * - Optimistic UI update + backend sync
   */
  const markAsViewed = useCallback(async (storyId: string) => {
    if (!interactionUserId || !storyId || isOwner || hasMarkedAsViewed.current.has(storyId)) {
      console.log('[UnifiedStoryViewerV11.2.0] ⏭️ Skipping mark as viewed:', {
        hasUser: !!interactionUserId,
        hasStoryId: !!storyId,
        isOwner,
        alreadyMarked: hasMarkedAsViewed.current.has(storyId),
      });
      return;
    }

    const viewDuration = Date.now() - viewStartTime.current;
    
    let thresholdMet = false;
    
    if (isVideo && videoDuration) {
      const videoThreshold = videoDuration * 1000 * VIDEO_VIEW_THRESHOLD_PERCENT;
      thresholdMet = viewDuration >= videoThreshold;
      console.log('[UnifiedStoryViewerV11.2.0] 📹 Video threshold check:', {
        viewDuration,
        videoThreshold,
        thresholdMet,
      });
    } else {
      const imageThresholdPercent = duration * IMAGE_VIEW_THRESHOLD_PERCENT;
      thresholdMet = viewDuration >= imageThresholdPercent || viewDuration >= IMAGE_VIEW_THRESHOLD_MIN;
      console.log('[UnifiedStoryViewerV11.2.0] 🖼️ Image threshold check:', {
        viewDuration,
        imageThresholdPercent,
        minThreshold: IMAGE_VIEW_THRESHOLD_MIN,
        thresholdMet,
      });
    }
    
    if (!thresholdMet) {
      console.log('[UnifiedStoryViewerV11.2.0] ⏭️ View threshold not met');
      return;
    }

    hasMarkedAsViewed.current.add(storyId);

    try {
      console.log('[UnifiedStoryViewerV11.2.0] 👁️ Marking story as viewed:', storyId);
      
      const viewData: any = {
        historia_id: storyId,
        usuario_id: interactionUserId,
        viewed_at: new Date().toISOString(),
        tipo: isInteractingAsLocal ? 'local' : 'usuario',
        local_id: isInteractingAsLocal ? interactionLocalId : null,
        duracion_vista: Math.floor(viewDuration / 1000),
      };

      let existingViewQuery = supabase
        .from('historia_views')
        .select('id')
        .eq('historia_id', storyId)
        .eq('usuario_id', interactionUserId);

      if (isInteractingAsLocal && interactionLocalId) {
        existingViewQuery = existingViewQuery.eq('local_id', interactionLocalId);
      } else {
        existingViewQuery = existingViewQuery.is('local_id', null);
      }

      const { data: existingView } = await existingViewQuery.maybeSingle();

      if (existingView) {
        const { error } = await supabase
          .from('historia_views')
          .update({ 
            viewed_at: new Date().toISOString(),
            duracion_vista: Math.floor(viewDuration / 1000),
          })
          .eq('id', existingView.id);

        if (error) {
          console.error('[UnifiedStoryViewerV11.2.0] ❌ Error updating story view:', error);
          hasMarkedAsViewed.current.delete(storyId);
        } else {
          console.log('[UnifiedStoryViewerV11.2.0] ✅ Story view updated');
          // ✅ Optimistic update via context
          markStoriesAsViewed([storyId]);
        }
      } else {
        const { error } = await supabase
          .from('historia_views')
          .insert(viewData);

        if (error) {
          console.error('[UnifiedStoryViewerV11.2.0] ❌ Error inserting story view:', error);
          hasMarkedAsViewed.current.delete(storyId);
        } else {
          console.log('[UnifiedStoryViewerV11.2.0] ✅ Story view inserted');
          // ✅ Optimistic update via context
          markStoriesAsViewed([storyId]);
        }
      }

      console.log('[UnifiedStoryViewerV11.2.0] 🔄 Story view recorded - avatars should update');
    } catch (error) {
      console.error('[UnifiedStoryViewerV11.2.0] ❌ Error:', error);
      hasMarkedAsViewed.current.delete(storyId);
    }
  }, [interactionUserId, interactionLocalId, isInteractingAsLocal, isOwner, markStoriesAsViewed, isVideo, videoDuration, duration]);

  const checkIfLiked = useCallback(async (storyId: string) => {
    if (!interactionUserId || !storyId) {
      setIsLiked(false);
      return;
    }

    try {
      let query = supabase
        .from('historia_likes')
        .select('id')
        .eq('historia_id', storyId)
        .eq('usuario_id', interactionUserId);

      if (isInteractingAsLocal && interactionLocalId) {
        query = query.eq('local_id', interactionLocalId);
      } else {
        query = query.is('local_id', null);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('[UnifiedStoryViewerV11.2.0] Error checking like status:', error);
        setIsLiked(false);
        return;
      }

      setIsLiked(!!data);
    } catch (error) {
      console.error('[UnifiedStoryViewerV11.2.0] Error:', error);
      setIsLiked(false);
    }
  }, [interactionUserId, interactionLocalId, isInteractingAsLocal]);

  useEffect(() => {
    if (visible && currentStory) {
      viewStartTime.current = Date.now();
      checkIfLiked(currentStory.id);
      
      if (!isVideo) {
        setVideoDuration(null);
      }
    }
  }, [visible, currentStory, checkIfLiked, isVideo]);

  // Mark as viewed when leaving a story
  useEffect(() => {
    return () => {
      if (currentStory && interactionUserId && !isOwner) {
        markAsViewed(currentStory.id);
      }
    };
  }, [currentStory, interactionUserId, isOwner, markAsViewed]);

  useEffect(() => {
    if (visible) {
      console.log('[UnifiedStoryViewerV11.2.0] 🎬 Story viewer opened:', {
        initialIndex,
        totalStories: stories.length,
        duration,
      });
      setCurrentIndex(initialIndex);
      setLoading(true);
      setIsPaused(false);
      isClosing.current = false;
      
      progressValues.current.forEach((p, index) => {
        if (p && typeof p.setValue === 'function') {
          if (index < initialIndex) {
            p.setValue(1);
          } else {
            p.setValue(0);
          }
        }
      });
      
      viewStartTime.current = Date.now();
      hasMarkedAsViewed.current.clear();
    } else {
      setIsPaused(false);
      setLoading(false);
      setStoryMessage('');
      setSendingMessage(false);
      setShowStoryStats(false);
      setVideoDuration(null);
      isClosing.current = false;
    }
  }, [visible, initialIndex, stories.length, duration]);

  /**
   * ✅ HANDLE NEXT - Navigate to next story with auto-close
   * 
   * Instagram behavior:
   * - Marks current story as viewed
   * - Advances to next story
   * - Auto-closes on last story
   * - Fills progress bar for completed story
   */
  const handleNext = useCallback(() => {
    if (isClosing.current) {
      console.log('[UnifiedStoryViewerV11.2.0] ⏭️ Already closing, ignoring');
      return;
    }

    console.log('[UnifiedStoryViewerV11.2.0] ⏭️ Next story:', {
      currentIndex,
      totalStories: stories.length,
      isLastStory: currentIndex >= stories.length - 1,
    });

    // Mark current story as viewed before advancing
    if (currentStory && interactionUserId && !isOwner) {
      markAsViewed(currentStory.id);
    }

    // ✅ INSTAGRAM BEHAVIOR - Auto-close when reaching the end
    if (currentIndex >= stories.length - 1) {
      console.log('[UnifiedStoryViewerV11.2.0] 🏁 LAST STORY - Auto-closing viewer (Instagram behavior)');
      isClosing.current = true;
      setTimeout(() => {
        onClose();
      }, 100);
      return;
    }

    // Advance to next story
    const currentProgress = progressValues.current[currentIndex];
    if (currentProgress && typeof currentProgress.setValue === 'function') {
      currentProgress.setValue(1);
    }
    
    setCurrentIndex(currentIndex + 1);
    setLoading(true);
    viewStartTime.current = Date.now();
    if (onStoryChange) {
      onStoryChange(currentIndex + 1);
    }
  }, [currentIndex, stories.length, progressValues, onStoryChange, onClose, currentStory, interactionUserId, isOwner, markAsViewed]);

  /**
   * ✅ HANDLE PREVIOUS - Navigate to previous story
   * 
   * Instagram behavior:
   * - Empties current progress bar
   * - Goes back to previous story
   * - Replays previous story from start
   */
  const handlePrevious = useCallback(() => {
    if (isClosing.current) {
      console.log('[UnifiedStoryViewerV11.2.0] ⏮️ Already closing, ignoring');
      return;
    }

    console.log('[UnifiedStoryViewerV11.2.0] ⏮️ Previous story:', {
      currentIndex,
    });

    if (currentIndex > 0) {
      const currentProgress = progressValues.current[currentIndex];
      if (currentProgress && typeof currentProgress.setValue === 'function') {
        currentProgress.setValue(0);
      }
      
      setCurrentIndex(currentIndex - 1);
      setLoading(true);
      viewStartTime.current = Date.now();
      if (onStoryChange) {
        onStoryChange(currentIndex - 1);
      }
    }
  }, [currentIndex, progressValues, onStoryChange]);

  /**
   * ✅ LONG PRESS HANDLERS - Pause/resume story
   * 
   * Instagram behavior:
   * - Press & hold pauses story
   * - Freezes progress bar
   * - Pauses video playback
   * - Resumes on release
   */
  const handleLongPressIn = useCallback(() => {
    console.log('[UnifiedStoryViewerV11.2.0] ⏸️ Story paused (long press)');
    isLongPressing.current = true;
    setIsPaused(true);
    
    if (isVideo && videoRef.current) {
      videoRef.current.pauseAsync();
    }
  }, [isVideo]);

  const handleLongPressOut = useCallback(() => {
    console.log('[UnifiedStoryViewerV11.2.0] ▶️ Story resumed (release)');
    isLongPressing.current = false;
    setIsPaused(false);
    
    if (isVideo && videoRef.current) {
      videoRef.current.playAsync();
    }
    
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, [isVideo]);

  /**
   * ✅ PAN RESPONDER - Complete Instagram-style gesture handling
   * 
   * Gestures:
   * - Tap left (x < 50% screen) → Previous story
   * - Tap right (x >= 50% screen) → Next story (auto-close on last)
   * - Swipe left → Next story (auto-close on last)
   * - Swipe right → Previous story
   * - Swipe down → Close viewer
   * - Press & hold → Pause story
   * 
   * Thresholds:
   * - TAP_THRESHOLD = 25px (max movement for tap)
   * - SWIPE_THRESHOLD = 50px (min movement for swipe)
   * - LONG_PRESS_DURATION = 250ms (time for long press)
   */
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onMoveShouldSetPanResponderCapture: () => false,
      
      onPanResponderGrant: (evt, gestureState) => {
        console.log('[UnifiedStoryViewerV11.2.0] 👆 Gesture started at:', {
          x: gestureState.x0,
          y: gestureState.y0,
          currentIndex,
          totalStories: stories.length,
          isLastStory: currentIndex >= stories.length - 1,
        });
        
        // Start long press timer
        longPressTimer.current = setTimeout(() => {
          console.log('[UnifiedStoryViewerV11.2.0] ⏸️ Long press detected');
          handleLongPressIn();
        }, LONG_PRESS_DURATION);
      },
      
      onPanResponderMove: (evt, gestureState) => {
        // Cancel long press if user moves finger
        if (Math.abs(gestureState.dx) > TAP_THRESHOLD || Math.abs(gestureState.dy) > TAP_THRESHOLD) {
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
            console.log('[UnifiedStoryViewerV11.2.0] ❌ Long press cancelled (movement detected)');
          }
        }
      },
      
      onPanResponderRelease: (evt, gestureState) => {
        // Clear long press timer
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        // If was long pressing, just release
        if (isLongPressing.current) {
          console.log('[UnifiedStoryViewerV11.2.0] ▶️ Releasing long press');
          handleLongPressOut();
          return;
        }
        
        const { dx, dy } = gestureState;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        
        console.log('[UnifiedStoryViewerV11.2.0] 👆 Gesture released:', {
          dx,
          dy,
          absDx,
          absDy,
          currentIndex,
          totalStories: stories.length,
          isLastStory: currentIndex >= stories.length - 1,
        });
        
        // ✅ SWIPE DOWN - Close viewer
        if (absDy > SWIPE_THRESHOLD && dy > 0 && absDy > absDx) {
          console.log('[UnifiedStoryViewerV11.2.0] 👇 Swipe down detected - closing viewer');
          onClose();
          return;
        }
        
        // ✅ SWIPE UP - Show actions (future feature)
        if (absDy > SWIPE_THRESHOLD && dy < 0 && absDy > absDx) {
          console.log('[UnifiedStoryViewerV11.2.0] 👆 Swipe up detected - actions (future)');
          return;
        }
        
        // ✅ SWIPE LEFT - Next story (or close if last)
        if (absDx > SWIPE_THRESHOLD && dx < 0 && absDx > absDy) {
          console.log('[UnifiedStoryViewerV11.2.0] 👈 Swipe left detected');
          handleNext(); // Will auto-close if last story
          return;
        }
        
        // ✅ SWIPE RIGHT - Previous story
        if (absDx > SWIPE_THRESHOLD && dx > 0 && absDx > absDy) {
          console.log('[UnifiedStoryViewerV11.2.0] 👉 Swipe right detected - previous story');
          handlePrevious();
          return;
        }
        
        // ✅ TAP - Navigate based on position (INSTAGRAM BEHAVIOR)
        if (absDx < TAP_THRESHOLD && absDy < TAP_THRESHOLD) {
          const tapX = gestureState.x0;
          const isLeftTap = tapX < SCREEN_WIDTH / 2;
          
          console.log('[UnifiedStoryViewerV11.2.0] 👆 Tap detected:', {
            tapX,
            screenWidth: SCREEN_WIDTH,
            isLeftTap,
            currentIndex,
            totalStories: stories.length,
            isLastStory: currentIndex >= stories.length - 1,
          });
          
          if (isLeftTap) {
            console.log('[UnifiedStoryViewerV11.2.0] ⏮️ Tap left - previous story');
            handlePrevious();
          } else {
            console.log('[UnifiedStoryViewerV11.2.0] ⏭️ Tap right - next story (will auto-close if last)');
            handleNext(); // Will auto-close if last story
          }
        }
      },
      
      onPanResponderTerminate: () => {
        console.log('[UnifiedStoryViewerV11.2.0] ❌ Gesture terminated');
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        if (isLongPressing.current) {
          handleLongPressOut();
        }
      },
      
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => false,
    })
  ).current;

  const handleDelete = useCallback(async () => {
    if (!currentStory || !isOwner) return;

    Alert.alert(
      'Eliminar historia',
      '¿Estás seguro de que quieres eliminar esta historia?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('historias')
                .delete()
                .eq('id', currentStory.id);

              if (error) {
                console.error('[UnifiedStoryViewerV11.2.0] Error deleting story:', error);
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
              console.error('[UnifiedStoryViewerV11.2.0] Error:', error);
            }
          },
        },
      ]
    );
  }, [currentStory, isOwner, currentIndex, stories.length, onStoryDelete, handleNext, handlePrevious, onClose]);

  const handleViewStoryStats = useCallback(async () => {
    if (!currentStory || !interactionUserId || !isOwner) {
      return;
    }

    setIsPaused(true);
    setLoadingStats(true);
    setShowStoryStats(true);

    try {
      const { data: viewsData, error: viewsError } = await supabase
        .from('historia_views')
        .select(`
          id,
          usuario_id,
          viewed_at,
          usuario:usuarios(nombre, avatar, username)
        `)
        .eq('historia_id', currentStory.id)
        .neq('usuario_id', interactionUserId)
        .order('viewed_at', { ascending: false });

      if (viewsError) throw viewsError;

      const { data: likesData, error: likesError } = await supabase
        .from('historia_likes')
        .select(`
          id,
          usuario_id,
          created_at,
          usuario:usuarios(nombre, avatar, username)
        `)
        .eq('historia_id', currentStory.id)
        .neq('usuario_id', interactionUserId)
        .order('created_at', { ascending: false});

      if (likesError) throw likesError;

      setStoryViews(viewsData || []);
      setStoryLikes(likesData || []);
    } catch (error) {
      console.error('[UnifiedStoryViewerV11.2.0] Error loading story stats:', error);
      Alert.alert('Error', 'No se pudieron cargar las estadísticas');
    } finally {
      setLoadingStats(false);
    }
  }, [currentStory, interactionUserId, isOwner]);

  const handleStoryLike = useCallback(async () => {
    if (!currentStory || !interactionUserId) {
      return;
    }

    const newLikedState = !isLiked;
    setIsLiked(newLikedState);

    try {
      if (newLikedState) {
        const likeData: any = {
          historia_id: currentStory.id,
          usuario_id: interactionUserId,
          tipo: isInteractingAsLocal ? 'local' : 'usuario',
          local_id: isInteractingAsLocal ? interactionLocalId : null,
        };

        await supabase.from('historia_likes').insert(likeData);
      } else {
        let deleteQuery = supabase
          .from('historia_likes')
          .delete()
          .eq('historia_id', currentStory.id)
          .eq('usuario_id', interactionUserId);

        if (isInteractingAsLocal && interactionLocalId) {
          deleteQuery = deleteQuery.eq('local_id', interactionLocalId);
        } else {
          deleteQuery = deleteQuery.is('local_id', null);
        }

        await deleteQuery;
      }
    } catch (error) {
      console.error('[UnifiedStoryViewerV11.2.0] Error toggling story like:', error);
      setIsLiked(!newLikedState);
    }
  }, [interactionUserId, interactionLocalId, isInteractingAsLocal, currentStory, isLiked]);

  const handleSendStoryMessage = useCallback(async () => {
    if (!currentStory || !interactionUserId || !storyMessage.trim() || sendingMessage) {
      return;
    }

    const messageText = storyMessage.trim();
    
    setStoryMessage('');
    setSendingMessage(true);
    Alert.alert('Éxito', 'Mensaje enviado correctamente');

    try {
      const userId1 = interactionUserId < currentStory.autor_id! ? interactionUserId : currentStory.autor_id!;
      const userId2 = interactionUserId < currentStory.autor_id! ? currentStory.autor_id! : interactionUserId;
      
      let chatQuery = supabase
        .from('chats')
        .select('id')
        .eq('usuario1_id', userId1)
        .eq('usuario2_id', userId2);
      
      if (currentStory.tipo === 'local' && currentStory.local_id) {
        chatQuery = chatQuery.eq('local_id', currentStory.local_id);
      } else {
        chatQuery = chatQuery.is('local_id', null);
      }
      
      const { data: chatExistente, error: chatError } = await chatQuery.maybeSingle();

      if (chatError && chatError.code !== 'PGRST116') {
        throw chatError;
      }

      let chatId = chatExistente?.id;

      if (!chatId) {
        const chatData: any = {
          usuario1_id: userId1,
          usuario2_id: userId2,
          ultimo_mensaje: messageText,
          ultimo_mensaje_fecha: new Date().toISOString(),
        };
        
        if (currentStory.tipo === 'local' && currentStory.local_id) {
          chatData.local_id = currentStory.local_id;
        } else {
          chatData.local_id = null;
        }
        
        const { data: nuevoChat, error: nuevoChatError } = await supabase
          .from('chats')
          .insert(chatData)
          .select()
          .single();

        if (nuevoChatError) {
          throw nuevoChatError;
        }
        
        chatId = nuevoChat.id;
      }

      const { error: mensajeError } = await supabase
        .from('mensajes')
        .insert({
          chat_id: chatId,
          remitente_id: interactionUserId,
          contenido: messageText,
          historia_id: currentStory.id,
          historia_imagen: storyMediaUrl,
          tipo_mensaje: 'texto',
        });

      if (mensajeError) {
        throw mensajeError;
      }

      await supabase
        .from('chats')
        .update({
          ultimo_mensaje: messageText,
          ultimo_mensaje_fecha: new Date().toISOString(),
        })
        .eq('id', chatId);

      await supabase.from('notificaciones').insert({
        usuario_id: currentStory.autor_id,
        tipo: 'mensaje_privado',
        titulo: 'Mensaje sobre tu historia',
        mensaje: `Te enviaron un mensaje sobre tu historia`,
        usuario_origen_id: interactionUserId,
      });
    } catch (error) {
      console.error('[UnifiedStoryViewerV11.2.0] Error sending story message:', error);
    } finally {
      setSendingMessage(false);
    }
  }, [interactionUserId, currentStory, storyMessage, sendingMessage, storyMediaUrl]);

  const handleNavigateToStoryAuthorProfile = useCallback(() => {
    if (!currentStory) return;

    onClose();

    if (currentStory.tipo === 'local' && currentStory.local_id) {
      router.push(`/perfil/local?localId=${currentStory.local_id}`);
    } else if (interactionUserId && currentStory.autor_id === interactionUserId) {
      router.push('/(tabs)/perfil');
    } else {
      router.push(`/perfil/usuario?userId=${currentStory.autor_id}`);
    }
  }, [currentStory, interactionUserId, router, onClose]);

  const handleCloseStoryViewerAndNavigate = useCallback(() => {
    setShowStoryStats(false);
    onClose();
  }, [onClose]);

  const handleVideoPlaybackStatusUpdate = useCallback((status: any) => {
    if (status.isLoaded) {
      if (status.durationMillis && !videoDuration) {
        const durationSeconds = status.durationMillis / 1000;
        setVideoDuration(durationSeconds);
        console.log('[UnifiedStoryViewerV11.2.0] 📹 Video duration set:', durationSeconds, 'seconds');
      }
      
      if (status.didJustFinish) {
        console.log('[UnifiedStoryViewerV11.2.0] 📹 Video finished - advancing to next');
        handleNext();
      }
    }
  }, [videoDuration, handleNext]);

  if (!visible || !currentStory) {
    return null;
  }

  const authorAvatar = currentStory.tipo === 'usuario'
    ? (currentStory.autor?.avatar || currentStory.autorAvatar)
    : (currentStory.local?.imagen_url);
  
  const authorName = currentStory.tipo === 'usuario'
    ? (currentStory.autor?.nombre || currentStory.autorNombre || 'Usuario')
    : (currentStory.local?.nombre || 'Local');

  const displayName = currentStory.tipo === 'local' 
    ? truncateName(authorName)
    : (currentStory.autor?.username || currentStory.autorUsername || authorName).replace(/^@/, '');

  const hasAvatar = !!authorAvatar;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      hardwareAccelerated
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.container} {...panResponder.panHandlers}>
          {isVideo ? (
            <Video
              ref={videoRef}
              source={{ uri: storyMediaUrl }}
              style={styles.storyVideo}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={!isPaused && !loading}
              isLooping={false}
              onPlaybackStatusUpdate={handleVideoPlaybackStatusUpdate}
              onLoadStart={() => {
                console.log('[UnifiedStoryViewerV11.2.0] 📹 Video loading started');
                setLoading(true);
              }}
              onLoad={() => {
                console.log('[UnifiedStoryViewerV11.2.0] ✅ Video loaded successfully');
                setLoading(false);
              }}
              onError={(error) => {
                console.error('[UnifiedStoryViewerV11.2.0] ❌ Error loading video:', error);
                setLoading(false);
              }}
            />
          ) : storyMediaUrl ? (
            <Image
              source={{ uri: storyMediaUrl }}
              style={styles.storyImage}
              resizeMode="contain"
              onLoadStart={() => {
                console.log('[UnifiedStoryViewerV11.2.0] 🖼️ Image loading started');
                setLoading(true);
              }}
              onLoadEnd={() => {
                console.log('[UnifiedStoryViewerV11.2.0] ✅ Image loaded successfully');
                setLoading(false);
              }}
              onError={() => {
                console.error('[UnifiedStoryViewerV11.2.0] ❌ Error loading image:', storyMediaUrl);
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
            {stories.map((_, index) => {
              const progressValue = progressValues.current[index];
              const isCompleted = index < currentIndex;
              
              return (
                <View key={index} style={styles.progressBarWrapper}>
                  {progressValue ? (
                    <ProgressBar
                      isActive={index === currentIndex}
                      isPaused={isPaused || loading}
                      duration={index === currentIndex ? currentStoryDuration : duration}
                      onComplete={handleNext}
                      progress={progressValue}
                      isCompleted={isCompleted}
                    />
                  ) : (
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBarFill, { width: '0%' }]} />
                    </View>
                  )}
                </View>
              );
            })}
          </BlurView>

          <BlurView intensity={30} tint="dark" style={styles.header}>
            <TouchableOpacity 
              style={styles.authorInfo}
              onPress={handleNavigateToStoryAuthorProfile}
              activeOpacity={0.7}
            >
              <View style={styles.avatarWrapper}>
                {hasAvatar ? (
                  <Image
                    source={{ uri: authorAvatar }}
                    style={styles.authorAvatar}
                  />
                ) : (
                  <View style={styles.authorAvatarPlaceholder}>
                    <IconSymbol
                      ios_icon_name={DEFAULT_AVATAR_ICON}
                      android_material_icon_name="account_circle"
                      size={36}
                      color={colors.headerText}
                    />
                  </View>
                )}
              </View>
              <View style={styles.authorTextContainer}>
                <Text style={styles.authorName}>{displayName}</Text>
                <Text style={styles.storyTime}>
                  {new Date(currentStory.created_at).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short'
                  })}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.headerActions}>
              {isOwner && (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={handleViewStoryStats}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    ios_icon_name="eye.fill"
                    android_material_icon_name="visibility"
                    size={22}
                    color={colors.headerText}
                  />
                </TouchableOpacity>
              )}
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

          {!isOwner && (
            <BlurView intensity={30} tint="dark" style={styles.interactionBar}>
              <View style={styles.messageInputContainer}>
                <TextInput
                  style={styles.messageInput}
                  placeholder={`Enviar mensaje a ${displayName}...`}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={storyMessage}
                  onChangeText={setStoryMessage}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                  editable={!sendingMessage}
                />
                {storyMessage.trim().length > 0 && (
                  <TouchableOpacity
                    style={styles.sendButton}
                    onPress={handleSendStoryMessage}
                    activeOpacity={0.7}
                    disabled={sendingMessage}
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.secondary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.sendButtonGradient}
                    >
                      {sendingMessage ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <IconSymbol ios_icon_name="paperplane.fill" android_material_icon_name="send" size={16} color="#fff" />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.likeButton}
                onPress={handleStoryLike}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={isLiked 
                    ? ['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.1)']
                    : ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                  style={styles.likeButtonGradient}
                >
                  <IconSymbol
                    ios_icon_name={isLiked ? 'heart.fill' : 'heart'}
                    android_material_icon_name={isLiked ? 'favorite' : 'favorite_border'}
                    size={22}
                    color={isLiked ? '#EF4444' : '#fff'}
                  />
                </LinearGradient>
              </TouchableOpacity>
            </BlurView>
          )}

          {isPaused && (
            <View style={styles.pauseIndicator}>
              <IconSymbol ios_icon_name="pause.fill" android_material_icon_name="pause" size={48} color="rgba(255, 255, 255, 0.8)" />
            </View>
          )}

          <StoryStatsModal
            visible={showStoryStats}
            onClose={() => {
              setShowStoryStats(false);
              setIsPaused(false);
            }}
            onNavigateToProfile={handleCloseStoryViewerAndNavigate}
            storyId={currentStory.id}
            viewsCount={currentStory.views_count || 0}
            likesCount={storyLikes.length}
            views={storyViews}
            likes={storyLikes}
            loading={loadingStats}
          />
        </View>
      </KeyboardAvoidingView>
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
  storyVideo: {
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
    borderRadius: 1.5,
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
  avatarWrapper: {
    marginRight: 12,
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#fff',
  },
  authorAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
  interactionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    gap: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  messageInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  messageInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingRight: 8,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  likeButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
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

export default memo(UnifiedStoryViewerV11);
