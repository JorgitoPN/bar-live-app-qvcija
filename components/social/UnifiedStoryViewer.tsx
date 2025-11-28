
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
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
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import StoryStatsModal from './StoryStatsModal';
import { useRouter } from 'expo-router';
import { useStoryState } from '@/contexts/StoryStateContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ✅ CONSTANTS - Instagram-style
const STORY_DURATION = 5000; // 5 seconds per story
const TAP_THRESHOLD = 200; // milliseconds
const SWIPE_THRESHOLD = 50; // pixels
const LONG_PRESS_DURATION = 200; // milliseconds for pause

interface Story {
  id: string;
  imagen_url?: string;
  imagen?: string;
  tipo: 'usuario' | 'local';
  autor_id?: string;
  local_id?: string;
  created_at: string;
  expires_at?: string;
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

interface UnifiedStoryViewerProps {
  visible: boolean;
  stories: Story[];
  initialStoryIndex: number;
  onClose: () => void;
  onStoryChange?: (storyIndex: number) => void;
  onStoryDelete?: (storyId: string) => void;
  onUserChange?: (userIndex: number) => void;
  activeLocalProfileId?: string | null;
}

interface ProgressBarProps {
  index: number;
  currentIndex: number;
  isActive: boolean;
  isPaused: boolean;
  duration: number;
  onComplete: () => void;
}

// ✅ OPTIMIZED: Progress bar with green-to-blue gradient
const ProgressBar = memo(({ 
  index, 
  currentIndex, 
  isActive, 
  isPaused, 
  duration,
  onComplete 
}: ProgressBarProps) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedProgressRef = useRef<number>(0);

  useEffect(() => {
    // Set initial progress based on position
    if (index < currentIndex) {
      progressAnim.setValue(1); // Completed
      return;
    } else if (index > currentIndex) {
      progressAnim.setValue(0); // Not started
      return;
    }

    // Current story - start animation
    if (isActive && !isPaused && index === currentIndex) {
      progressAnim.setValue(pausedProgressRef.current);
      startTimeRef.current = Date.now();
      
      const remainingDuration = duration * (1 - pausedProgressRef.current);
      
      animationRef.current = Animated.timing(progressAnim, {
        toValue: 1,
        duration: remainingDuration,
        useNativeDriver: false,
        easing: Easing.linear,
      });
      
      animationRef.current.start(({ finished }) => {
        if (finished) {
          pausedProgressRef.current = 0;
          onComplete();
        }
      });
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [index, currentIndex, isActive, isPaused, duration, onComplete, progressAnim]);

  // Handle pause/resume
  useEffect(() => {
    if (index === currentIndex && isActive) {
      if (isPaused && animationRef.current) {
        animationRef.current.stop();
        // Save current progress
        const elapsed = Date.now() - startTimeRef.current;
        const progress = Math.min(1, pausedProgressRef.current + (elapsed / duration));
        pausedProgressRef.current = progress;
        progressAnim.setValue(progress);
      } else if (!isPaused && pausedProgressRef.current > 0) {
        // Resume from saved progress
        startTimeRef.current = Date.now();
        const remainingDuration = duration * (1 - pausedProgressRef.current);
        
        animationRef.current = Animated.timing(progressAnim, {
          toValue: 1,
          duration: remainingDuration,
          useNativeDriver: false,
          easing: Easing.linear,
        });
        
        animationRef.current.start(({ finished }) => {
          if (finished) {
            pausedProgressRef.current = 0;
            onComplete();
          }
        });
      }
    }
  }, [isPaused, isActive, index, currentIndex, duration, onComplete, progressAnim]);

  // Reset when story changes
  useEffect(() => {
    if (index !== currentIndex) {
      pausedProgressRef.current = 0;
    }
  }, [currentIndex, index]);

  const widthInterpolate = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarBackground}>
        <Animated.View style={[styles.progressBarFill, { width: widthInterpolate }]}>
          <LinearGradient
            colors={['#10B981', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progressGradient}
          />
        </Animated.View>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.index === nextProps.index &&
    prevProps.currentIndex === nextProps.currentIndex &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isPaused === nextProps.isPaused
  );
});

ProgressBar.displayName = 'ProgressBar';

// ✅ OPTIMIZED: Story image with instant loading
const StoryImage = memo(({ uri, onLoad }: { uri: string; onLoad?: () => void }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Preload image immediately
  useEffect(() => {
    Image.prefetch(uri).catch(() => setImageError(true));
  }, [uri]);
  
  return (
    <>
      {!imageLoaded && !imageError && (
        <View style={[styles.storyImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
      {imageError && (
        <View style={[styles.storyImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}>
          <IconSymbol ios_icon_name="exclamationmark.triangle" android_material_icon_name="error" size={48} color="#fff" />
          <Text style={{ color: '#fff', marginTop: 16 }}>Error al cargar la imagen</Text>
        </View>
      )}
      <Image 
        source={{ uri }} 
        style={[styles.storyImage, !imageLoaded && { opacity: 0 }]} 
        resizeMode="contain"
        onLoad={() => {
          setImageLoaded(true);
          onLoad?.();
        }}
        onError={() => {
          console.error('[UnifiedStoryViewer] Error loading image:', uri);
          setImageError(true);
        }}
        fadeDuration={0}
        progressiveRenderingEnabled={true}
      />
    </>
  );
}, (prevProps, nextProps) => prevProps.uri === nextProps.uri);

StoryImage.displayName = 'StoryImage';

function UnifiedStoryViewer({
  visible,
  stories,
  initialStoryIndex,
  onClose,
  onStoryChange,
  onStoryDelete,
  onUserChange,
  activeLocalProfileId,
}: UnifiedStoryViewerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { markStoryAsViewed } = useStoryState();
  
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [storyMessage, setStoryMessage] = useState('');
  const [showStoryStats, setShowStoryStats] = useState(false);
  const [storyViews, setStoryViews] = useState<any[]>([]);
  const [storyLikes, setStoryLikes] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const isPausedRef = useRef<boolean>(false);
  
  // Gesture tracking refs
  const touchStartTime = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const isSwiping = useRef(false);

  const currentStory = stories[currentStoryIndex];

  // ✅ CRITICAL: Preload next 5 story images aggressively
  useEffect(() => {
    if (visible && currentStoryIndex < stories.length) {
      const imagesToPreload: string[] = [];
      
      // Preload current + next 5 stories
      for (let i = currentStoryIndex; i < Math.min(currentStoryIndex + 6, stories.length); i++) {
        const imageUrl = stories[i]?.imagen_url || stories[i]?.imagen;
        if (imageUrl) {
          imagesToPreload.push(imageUrl);
        }
      }
      
      // Preload in parallel without blocking
      Promise.allSettled(imagesToPreload.map(uri => Image.prefetch(uri)))
        .then(results => {
          const successCount = results.filter(r => r.status === 'fulfilled').length;
          console.log('[UnifiedStoryViewer] ✅ Preloaded', successCount, '/', imagesToPreload.length, 'images');
        })
        .catch(() => {
          console.log('[UnifiedStoryViewer] ⚠️ Some images failed to preload');
        });
    }
  }, [visible, currentStoryIndex, stories]);

  const markAsViewed = useCallback(async (storyId: string) => {
    if (!user || !storyId) return;
    
    // Check if this is the user's own story
    const story = stories.find(s => s.id === storyId);
    if (!story) return;
    
    const isOwner = story.tipo === 'usuario' 
      ? story.autor_id === user.id
      : story.tipo === 'local' && activeLocalProfileId === story.local_id;
    
    // Don't mark own stories as viewed
    if (isOwner) {
      console.log('[UnifiedStoryViewer] ⚠️ Skipping view count for own story');
      return;
    }

    try {
      // Use the global story state context to mark as viewed
      await markStoryAsViewed(storyId);
      console.log('[UnifiedStoryViewer] ✅ Story marked as viewed globally');
    } catch (error) {
      console.error('[UnifiedStoryViewer] Error marking story as viewed:', error);
    }
  }, [user, stories, activeLocalProfileId, markStoryAsViewed]);

  const handleNextStory = useCallback(() => {
    // ✅ FIXED: Mark story as viewed BEFORE moving to next
    if (currentStory && user) {
      markAsViewed(currentStory.id);
    }
    
    if (currentStoryIndex < stories.length - 1) {
      const newIndex = currentStoryIndex + 1;
      setCurrentStoryIndex(newIndex);
      setImageLoaded(false);
      onStoryChange?.(newIndex);
    } else {
      // ✅ FIXED: Last story - mark as viewed and close properly
      if (currentStory && user) {
        markAsViewed(currentStory.id);
      }
      // ✅ FIXED: Ensure proper cleanup before closing
      setCurrentStoryIndex(initialStoryIndex);
      setImageLoaded(false);
      setIsPaused(false);
      isPausedRef.current = false;
      onClose();
    }
  }, [currentStoryIndex, stories.length, currentStory, user, markAsViewed, onClose, onStoryChange, initialStoryIndex]);

  const handlePreviousStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      const newIndex = currentStoryIndex - 1;
      setCurrentStoryIndex(newIndex);
      setImageLoaded(false);
      onStoryChange?.(newIndex);
    } else {
      // ✅ FIXED: First story - close properly
      setCurrentStoryIndex(initialStoryIndex);
      setImageLoaded(false);
      setIsPaused(false);
      isPausedRef.current = false;
      onClose();
    }
  }, [currentStoryIndex, onClose, onStoryChange, initialStoryIndex]);

  const handleStoryLike = useCallback(async () => {
    if (!currentStory || !user) {
      return;
    }

    // Optimistic UI update
    const isLiked = currentStory.liked_by_user;
    currentStory.liked_by_user = !isLiked;

    try {
      if (isLiked) {
        await supabase
          .from('historia_likes')
          .delete()
          .eq('historia_id', currentStory.id)
          .eq('usuario_id', user.id);
      } else {
        await supabase.from('historia_likes').insert({
          historia_id: currentStory.id,
          usuario_id: user.id,
        });
      }
    } catch (error) {
      console.error('[UnifiedStoryViewer] Error toggling story like:', error);
      // Revert on error
      currentStory.liked_by_user = isLiked;
    }
  }, [user, currentStory]);

  const handleViewStoryStats = useCallback(async () => {
    if (!currentStory || !user) {
      return;
    }

    const isOwner = currentStory.tipo === 'usuario' 
      ? currentStory.autor_id === user.id
      : currentStory.tipo === 'local' && activeLocalProfileId === currentStory.local_id;

    if (!isOwner) {
      return;
    }

    setIsPaused(true);
    isPausedRef.current = true;

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
        .neq('usuario_id', user.id)
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
        .neq('usuario_id', user.id)
        .order('created_at', { ascending: false });

      if (likesError) throw likesError;

      setStoryViews(viewsData || []);
      setStoryLikes(likesData || []);
    } catch (error) {
      console.error('[UnifiedStoryViewer] Error loading story stats:', error);
      Alert.alert('Error', 'No se pudieron cargar las estadísticas');
    } finally {
      setLoadingStats(false);
    }
  }, [currentStory, user, activeLocalProfileId]);

  const handleDeleteStory = useCallback(async () => {
    if (!currentStory || !user) {
      return;
    }

    const isOwner = currentStory.tipo === 'usuario' 
      ? currentStory.autor_id === user.id
      : currentStory.tipo === 'local' && activeLocalProfileId === currentStory.local_id;

    if (!isOwner) {
      return;
    }

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
              // Delete story image from storage
              const imageUrl = currentStory.imagen_url || currentStory.imagen;
              if (imageUrl) {
                const imagePath = imageUrl.split('/').pop();
                if (imagePath) {
                  await supabase.storage
                    .from('historias')
                    .remove([imagePath]);
                  console.log('[UnifiedStoryViewer] ✅ Story image deleted from storage');
                }
              }

              const { error } = await supabase
                .from('historias')
                .delete()
                .eq('id', currentStory.id);

              if (error) throw error;

              onStoryDelete?.(currentStory.id);
              
              // Move to next story or close
              if (currentStoryIndex < stories.length - 1) {
                handleNextStory();
              } else if (currentStoryIndex > 0) {
                handlePreviousStory();
              } else {
                onClose();
              }

              Alert.alert('Éxito', 'Historia eliminada correctamente');
            } catch (error) {
              console.error('[UnifiedStoryViewer] Error deleting story:', error);
              Alert.alert('Error', 'No se pudo eliminar la historia');
            }
          },
        },
      ]
    );
  }, [currentStory, user, activeLocalProfileId, onStoryDelete, currentStoryIndex, stories.length, handleNextStory, handlePreviousStory, onClose]);

  const handleSendStoryMessage = useCallback(async () => {
    if (!currentStory || !user || !storyMessage.trim() || sendingMessage) {
      return;
    }

    const messageText = storyMessage.trim();
    
    setStoryMessage('');
    setSendingMessage(true);
    Alert.alert('Éxito', 'Mensaje enviado correctamente');

    try {
      console.log('[UnifiedStoryViewer] 📨 Sending story message to author:', currentStory.autor_id);
      
      const authorId = currentStory.autor_id || '';
      const userId1 = user.id < authorId ? user.id : authorId;
      const userId2 = user.id < authorId ? authorId : user.id;
      
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

      const storyImageUrl = currentStory.imagen_url || currentStory.imagen || '';
      
      const { error: mensajeError } = await supabase
        .from('mensajes')
        .insert({
          chat_id: chatId,
          remitente_id: user.id,
          contenido: messageText,
          historia_id: currentStory.id,
          historia_imagen: storyImageUrl,
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
        mensaje: `${user.nombre} te envió un mensaje sobre tu historia`,
        usuario_origen_id: user.id,
      });

      console.log('[UnifiedStoryViewer] ✅ Message sent successfully');
    } catch (error) {
      console.error('[UnifiedStoryViewer] Error sending story message:', error);
    } finally {
      setSendingMessage(false);
    }
  }, [user, currentStory, storyMessage, sendingMessage]);

  const handleNavigateToStoryAuthorProfile = useCallback(() => {
    if (!currentStory) return;

    // ✅ FIXED: Proper cleanup before navigation
    setCurrentStoryIndex(initialStoryIndex);
    setImageLoaded(false);
    setIsPaused(false);
    isPausedRef.current = false;
    onClose();

    if (currentStory.tipo === 'local' && currentStory.local_id) {
      router.push(`/perfil/local?localId=${currentStory.local_id}`);
    } else if (user && currentStory.autor_id === user.id) {
      router.push('/(tabs)/perfil');
    } else {
      router.push(`/perfil/usuario?userId=${currentStory.autor_id}`);
    }
  }, [currentStory, user, router, onClose, initialStoryIndex]);

  const handleCloseStoryViewerAndNavigate = useCallback(() => {
    setShowStoryStats(false);
    // ✅ FIXED: Proper cleanup before closing
    setCurrentStoryIndex(initialStoryIndex);
    setImageLoaded(false);
    setIsPaused(false);
    isPausedRef.current = false;
    onClose();
  }, [onClose, initialStoryIndex]);

  // ✅ INSTAGRAM-STYLE: Gesture handling
  const handleTouchStart = useCallback((evt: GestureResponderEvent) => {
    touchStartTime.current = Date.now();
    touchStartX.current = evt.nativeEvent.pageX;
    touchStartY.current = evt.nativeEvent.pageY;
    isLongPress.current = false;
    isSwiping.current = false;
    
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setIsPaused(true);
      isPausedRef.current = true;
    }, LONG_PRESS_DURATION);
  }, []);

  const handleTouchMove = useCallback((gestureState: PanResponderGestureState) => {
    const { dx, dy } = gestureState;
    
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      isSwiping.current = true;
    }
  }, []);

  const handleTouchEnd = useCallback((evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    const { dx, dy } = gestureState;
    const touchDuration = Date.now() - touchStartTime.current;
    const touchX = evt.nativeEvent.pageX;
    
    // ✅ Long press - resume
    if (isLongPress.current) {
      setIsPaused(false);
      isPausedRef.current = false;
      return;
    }
    
    // ✅ Swipe down - close viewer
    if (dy > SWIPE_THRESHOLD && Math.abs(dx) < SWIPE_THRESHOLD) {
      // ✅ FIXED: Proper cleanup before closing
      setCurrentStoryIndex(initialStoryIndex);
      setImageLoaded(false);
      setIsPaused(false);
      isPausedRef.current = false;
      onClose();
      return;
    }
    
    // ✅ Swipe left - next story
    if (dx < -SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
      handleNextStory();
      return;
    }
    
    // ✅ Swipe right - previous story
    if (dx > SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
      handlePreviousStory();
      return;
    }
    
    // ✅ Tap - navigate stories
    if (!isSwiping.current && Math.abs(dx) < 20 && Math.abs(dy) < 20 && touchDuration < TAP_THRESHOLD) {
      const tapZone = touchX / SCREEN_WIDTH;
      
      // Left third - previous story
      if (tapZone < 0.33) {
        handlePreviousStory();
        return;
      }
      
      // Right third - next story
      if (tapZone > 0.67) {
        handleNextStory();
        return;
      }
    }
  }, [onClose, handleNextStory, handlePreviousStory, initialStoryIndex]);

  // ✅ Memoized PanResponder for better performance
  const panResponder = React.useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
      },
      onMoveShouldSetPanResponderCapture: () => false,
      
      onPanResponderGrant: handleTouchStart,
      onPanResponderMove: (_, gestureState) => handleTouchMove(gestureState),
      onPanResponderRelease: handleTouchEnd,
      
      onPanResponderTerminate: () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      },
    }),
    [handleTouchStart, handleTouchMove, handleTouchEnd]
  );

  // Mark story as viewed when it appears
  useEffect(() => {
    if (visible && currentStory && user) {
      markAsViewed(currentStory.id);
    }
  }, [visible, currentStory, user, markAsViewed]);

  // Reset to initial index when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentStoryIndex(initialStoryIndex);
      setIsPaused(false);
      isPausedRef.current = false;
      setImageLoaded(false);
    } else {
      // ✅ FIXED: Cleanup when modal closes
      setIsPaused(false);
      isPausedRef.current = false;
      setImageLoaded(false);
    }
  }, [visible, initialStoryIndex]);

  if (!currentStory) {
    return null;
  }

  const isCurrentStoryOwner = user && (
    (currentStory.tipo === 'usuario' && currentStory.autor_id === user.id) ||
    (currentStory.tipo === 'local' && activeLocalProfileId === currentStory.local_id)
  );

  // Get story image URL
  const storyImageUrl = currentStory.imagen_url || currentStory.imagen || '';

  // Display username correctly without @ symbol
  const storyAuthorAvatar = currentStory.tipo === 'usuario'
    ? (currentStory.autor?.avatar || currentStory.autorAvatar)
    : (currentStory.local?.logo);
  
  const storyAuthorName = currentStory.tipo === 'usuario'
    ? (currentStory.autor?.nombre || currentStory.autorNombre || 'Usuario')
    : (currentStory.local?.nombre || 'Local');
  
  const displayName = currentStory.tipo === 'local' 
    ? storyAuthorName
    : (currentStory.autor?.username || currentStory.autorUsername || storyAuthorName).replace(/^@/, '');

  return (
    <Modal
      visible={visible}
      animationType="none"
      onRequestClose={() => {
        // ✅ FIXED: Proper cleanup on back button press
        setCurrentStoryIndex(initialStoryIndex);
        setImageLoaded(false);
        setIsPaused(false);
        isPausedRef.current = false;
        onClose();
      }}
      statusBarTranslucent
      hardwareAccelerated={true}
      transparent={false}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.storyViewerModal} {...panResponder.panHandlers}>
          {/* ✅ Progress bars - SAME POSITION, COLOR, THICKNESS everywhere */}
          <BlurView intensity={20} tint="dark" style={styles.progressContainer}>
            <View style={styles.progressBarsWrapper}>
              {stories.map((_, index) => (
                <ProgressBar
                  key={index}
                  index={index}
                  currentIndex={currentStoryIndex}
                  isActive={visible && imageLoaded}
                  isPaused={isPaused}
                  duration={STORY_DURATION}
                  onComplete={handleNextStory}
                />
              ))}
            </View>
          </BlurView>

          {/* ✅ Header - SAME DESIGN everywhere */}
          <BlurView intensity={30} tint="dark" style={styles.storyHeader}>
            <TouchableOpacity 
              style={styles.storyAutorInfo}
              onPress={handleNavigateToStoryAuthorProfile}
              activeOpacity={0.7}
            >
              <View style={styles.avatarWrapper}>
                {storyAuthorAvatar ? (
                  <Image source={{ uri: storyAuthorAvatar }} style={styles.storyAutorAvatar} />
                ) : (
                  <View style={[styles.storyAutorAvatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>
                      {storyAuthorName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <LinearGradient
                  colors={['rgba(16, 185, 129, 0.3)', 'rgba(59, 130, 246, 0.3)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarRing}
                />
              </View>
              <View style={styles.storyAutorTextContainer}>
                <Text style={styles.storyAutorNombre}>
                  {displayName}
                </Text>
                <Text style={styles.storyTime}>
                  {formatStoryTime(currentStory.created_at)}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.headerActions}>
              {/* ✅ Eye icon - SAME POSITION everywhere (only for own stories) */}
              {isCurrentStoryOwner && (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={handleViewStoryStats}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                    style={styles.headerButtonGradient}
                  >
                    <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={18} color="#fff" />
                    <Text style={styles.viewsCountText}>
                      {currentStory.views_count || 0}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              
              {/* ✅ Delete icon - SAME POSITION everywhere (only for own stories) */}
              {isCurrentStoryOwner && (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={handleDeleteStory}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.1)']}
                    style={styles.headerButtonGradient}
                  >
                    <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={18} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              )}
              
              {/* ✅ Close button - SAME POSITION everywhere */}
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => {
                  // ✅ FIXED: Proper cleanup on close button press
                  setCurrentStoryIndex(initialStoryIndex);
                  setImageLoaded(false);
                  setIsPaused(false);
                  isPausedRef.current = false;
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                  style={styles.headerButtonGradient}
                >
                  <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>

          {/* ✅ Story content */}
          <View style={styles.storyContent}>
            {storyImageUrl ? (
              <StoryImage uri={storyImageUrl} onLoad={() => setImageLoaded(true)} />
            ) : (
              <View style={styles.errorContainer}>
                <IconSymbol ios_icon_name="exclamationmark.triangle" android_material_icon_name="error" size={48} color="#fff" />
                <Text style={styles.errorText}>Error al cargar la historia</Text>
              </View>
            )}
          </View>

          {/* ✅ Interaction bar - SAME DESIGN everywhere (only for other users' stories) */}
          {!isCurrentStoryOwner && (
            <BlurView intensity={30} tint="dark" style={styles.storyInteractionBar}>
              <View style={styles.storyMessageInputContainer}>
                <TextInput
                  style={styles.storyMessageInput}
                  placeholder={`Enviar mensaje a ${displayName}...`}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={storyMessage}
                  onChangeText={setStoryMessage}
                  onFocus={() => {
                    setIsPaused(true);
                    isPausedRef.current = true;
                  }}
                  onBlur={() => {
                    setIsPaused(false);
                    isPausedRef.current = false;
                  }}
                  editable={!sendingMessage}
                />
                {storyMessage.trim().length > 0 && (
                  <TouchableOpacity
                    style={styles.storySendButton}
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
                style={styles.storyLikeButton}
                onPress={handleStoryLike}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={currentStory.liked_by_user 
                    ? ['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.1)']
                    : ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                  style={styles.likeButtonGradient}
                >
                  <IconSymbol
                    ios_icon_name={currentStory.liked_by_user ? 'heart.fill' : 'heart'}
                    android_material_icon_name={currentStory.liked_by_user ? 'favorite' : 'favorite_border'}
                    size={22}
                    color={currentStory.liked_by_user ? '#EF4444' : '#fff'}
                  />
                </LinearGradient>
              </TouchableOpacity>
            </BlurView>
          )}

          {/* ✅ NO PAUSE ICON - as requested */}

          <StoryStatsModal
            visible={showStoryStats}
            onClose={() => {
              setShowStoryStats(false);
              setIsPaused(false);
              isPausedRef.current = false;
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

function formatStoryTime(timestamp: string): string {
  const now = new Date();
  const storyDate = new Date(timestamp);
  const diffMs = now.getTime() - storyDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Ahora';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return '1d';
}

const styles = StyleSheet.create({
  storyViewerModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  progressContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 12,
    zIndex: 10,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  progressBarsWrapper: {
    flexDirection: 'row',
    gap: 4,
  },
  progressBarContainer: {
    flex: 1,
    height: 3,
  },
  progressBarBackground: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    overflow: 'hidden',
    borderRadius: 2,
  },
  progressGradient: {
    flex: 1,
  },
  storyHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 75 : 65,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    zIndex: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  storyAutorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  storyAutorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 1,
  },
  avatarRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 23,
    zIndex: 0,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  storyAutorTextContainer: {
    flex: 1,
  },
  storyAutorNombre: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  storyTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  headerButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  viewsCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  storyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
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
  storyInteractionBar: {
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
    zIndex: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  storyMessageInputContainer: {
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
  storyMessageInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingRight: 8,
  },
  storySendButton: {
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
  storyLikeButton: {
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
});

export default memo(UnifiedStoryViewer);
