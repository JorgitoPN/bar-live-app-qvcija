
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
  Animated,
  Alert,
  TextInput,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  KeyboardAvoidingView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import StoryStatsModal from './StoryStatsModal';

const { width, height } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 seconds per story
const TAP_THRESHOLD = 200; // milliseconds
const SWIPE_THRESHOLD = 50; // pixels
const LONG_PRESS_DURATION = 200; // milliseconds for pause

interface Historia {
  id: string;
  autor_id: string;
  tipo: string;
  imagen: string;
  created_at: string;
  expires_at: string;
  visto: boolean;
  autor?: {
    nombre: string;
    avatar?: string;
    username?: string;
  };
  autorNombre?: string;
  autorAvatar?: string;
  visto_por_usuario?: boolean;
  views_count?: number;
  likes_count?: number;
  liked_by_user?: boolean;
  comments_count?: number;
  local_id?: string;
}

interface StoryViewerProps {
  visible: boolean;
  stories: Historia[];
  initialIndex: number;
  onClose: () => void;
  onStoryChange?: (index: number) => void;
  onStoryDelete?: (storyId: string) => void;
  activeLocalProfileId?: string | null;
}

// ✅ OPTIMIZED: Memoized story image component with instant loading
const StoryImage = memo(({ uri, onLoad }: { uri: string; onLoad?: () => void }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
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
        onLoadEnd={() => {
          setImageLoaded(true);
          onLoad?.();
        }}
        onError={() => {
          console.error('[StoryViewer] Error loading image:', uri);
          setImageError(true);
        }}
        fadeDuration={0}
        progressiveRenderingEnabled={true}
        cache="force-cache"
      />
    </>
  );
});

StoryImage.displayName = 'StoryImage';

function StoryViewer({
  visible,
  stories,
  initialIndex,
  onClose,
  onStoryChange,
  onStoryDelete,
  activeLocalProfileId,
}: StoryViewerProps) {
  const router = useRouter();
  const { user } = useAuth();
  
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [storyMessage, setStoryMessage] = useState('');
  const [showStoryStats, setShowStoryStats] = useState(false);
  const [storyViews, setStoryViews] = useState<any[]>([]);
  const [storyLikes, setStoryLikes] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // ✅ ULTRA-SMOOTH: Progress bar with high-precision timing
  const progressValue = useRef(0);
  const animationFrameId = useRef<number | null>(null);
  const startTime = useRef<number>(0);
  const pausedAt = useRef<number>(0);
  const isAnimating = useRef(false);
  
  // Gesture tracking refs
  const touchStartTime = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const isSwiping = useRef(false);

  const currentStory = stories[currentStoryIndex];

  // ✅ ULTRA-SMOOTH: Animation loop with 60fps precision
  const animateProgress = useCallback(() => {
    if (!isAnimating.current || isPaused) {
      return;
    }

    const now = performance.now();
    const elapsed = now - startTime.current + pausedAt.current;
    const progress = Math.min(elapsed / STORY_DURATION, 1);

    progressValue.current = progress;

    // Force re-render by updating a dummy state if needed
    // But we'll use the ref directly in the render

    if (progress >= 1) {
      isAnimating.current = false;
      handleNextStory();
    } else {
      animationFrameId.current = requestAnimationFrame(animateProgress);
    }
  }, [isPaused]);

  // ✅ ULTRA-SMOOTH: Start animation with precise timing
  const startAnimation = useCallback(() => {
    if (!imageLoaded || isPaused) {
      console.log('[StoryViewer] ⏸️ Not starting animation - imageLoaded:', imageLoaded, 'isPaused:', isPaused);
      return;
    }

    if (isAnimating.current) {
      console.log('[StoryViewer] ⚠️ Animation already running');
      return;
    }

    console.log('[StoryViewer] ▶️ Starting ultra-smooth animation from progress:', pausedAt.current);
    
    isAnimating.current = true;
    startTime.current = performance.now();
    
    // Cancel any existing animation frame
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
    }
    
    // Start new animation loop
    animationFrameId.current = requestAnimationFrame(animateProgress);
  }, [imageLoaded, isPaused, animateProgress]);

  // ✅ ULTRA-SMOOTH: Stop animation and save progress
  const stopAnimation = useCallback(() => {
    console.log('[StoryViewer] ⏸️ Stopping animation');
    
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    
    if (isAnimating.current && startTime.current > 0) {
      const elapsed = performance.now() - startTime.current;
      pausedAt.current = Math.min(pausedAt.current + elapsed, STORY_DURATION);
      console.log('[StoryViewer] 💾 Saved progress:', pausedAt.current, 'ms');
    }
    
    isAnimating.current = false;
    startTime.current = 0;
  }, []);

  // ✅ ULTRA-SMOOTH: Reset animation for new story
  const resetAnimation = useCallback(() => {
    console.log('[StoryViewer] 🔄 Resetting animation for new story');
    
    // Stop any running animation
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    
    // Reset all progress tracking
    isAnimating.current = false;
    progressValue.current = 0;
    pausedAt.current = 0;
    startTime.current = 0;
    
    // Reset image loaded state
    setImageLoaded(false);
    
    console.log('[StoryViewer] ✅ Animation reset complete');
  }, []);

  const markStoryAsViewed = useCallback(async (storyId: string) => {
    if (!user) return;

    try {
      const { data: existingView } = await supabase
        .from('historia_views')
        .select('id')
        .eq('historia_id', storyId)
        .eq('usuario_id', user.id)
        .maybeSingle();

      if (!existingView) {
        await supabase.from('historia_views').insert({
          historia_id: storyId,
          usuario_id: user.id,
        });
        console.log('[StoryViewer] ✅ Story marked as viewed');
      }
    } catch (error) {
      console.error('[StoryViewer] Error marking story as viewed:', error);
    }
  }, [user]);

  const handleNextStory = useCallback(() => {
    console.log('[StoryViewer] ⏭️ Moving to next story');
    
    if (currentStory && user) {
      markStoryAsViewed(currentStory.id);
    }
    
    if (currentStoryIndex < stories.length - 1) {
      const newIndex = currentStoryIndex + 1;
      setCurrentStoryIndex(newIndex);
      resetAnimation();
      onStoryChange?.(newIndex);
    } else {
      console.log('[StoryViewer] 🏁 No more stories, closing viewer');
      onClose();
    }
  }, [currentStoryIndex, stories.length, currentStory, user, markStoryAsViewed, onClose, resetAnimation, onStoryChange]);

  const handlePreviousStory = useCallback(() => {
    console.log('[StoryViewer] ⏮️ Moving to previous story');
    
    if (currentStoryIndex > 0) {
      const newIndex = currentStoryIndex - 1;
      setCurrentStoryIndex(newIndex);
      resetAnimation();
      onStoryChange?.(newIndex);
    } else {
      console.log('[StoryViewer] 🏁 First story, closing viewer');
      onClose();
    }
  }, [currentStoryIndex, onClose, resetAnimation, onStoryChange]);

  const handleStoryLike = useCallback(async () => {
    if (!currentStory || !user) {
      return;
    }

    const isLiked = currentStory.liked_by_user;

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
      console.log('[StoryViewer] ✅ Story like toggled');
    } catch (error) {
      console.error('[StoryViewer] Error toggling story like:', error);
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

    console.log('[StoryViewer] 📊 Opening story stats');
    setIsPaused(true);
    stopAnimation();

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
        .order('created_at', { ascending: false });

      if (likesError) throw likesError;

      setStoryViews(viewsData || []);
      setStoryLikes(likesData || []);
      console.log('[StoryViewer] ✅ Story stats loaded');
    } catch (error) {
      console.error('[StoryViewer] Error loading story stats:', error);
      Alert.alert('Error', 'No se pudieron cargar las estadísticas');
    } finally {
      setLoadingStats(false);
    }
  }, [currentStory, user, stopAnimation, activeLocalProfileId]);

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
              const { error } = await supabase
                .from('historias')
                .delete()
                .eq('id', currentStory.id);

              if (error) throw error;

              onStoryDelete?.(currentStory.id);
              onClose();

              Alert.alert('Éxito', 'Historia eliminada correctamente');
            } catch (error) {
              console.error('[StoryViewer] Error deleting story:', error);
              Alert.alert('Error', 'No se pudo eliminar la historia');
            }
          },
        },
      ]
    );
  }, [currentStory, user, activeLocalProfileId, onStoryDelete, onClose]);

  const handleSendStoryMessage = useCallback(async () => {
    if (!currentStory || !user || !storyMessage.trim()) {
      return;
    }

    try {
      const usuario1_id = user.id < currentStory.autor_id ? user.id : currentStory.autor_id;
      const usuario2_id = user.id < currentStory.autor_id ? currentStory.autor_id : user.id;
      
      const { data: chatExistente, error: chatError } = await supabase
        .from('chats')
        .select('id')
        .eq('usuario1_id', usuario1_id)
        .eq('usuario2_id', usuario2_id)
        .is('local_id', null)
        .maybeSingle();

      let chatId = chatExistente?.id;

      if (!chatId) {
        const { data: nuevoChat, error: nuevoChatError } = await supabase
          .from('chats')
          .insert({
            usuario1_id: usuario1_id,
            usuario2_id: usuario2_id,
          })
          .select()
          .single();

        if (nuevoChatError) throw nuevoChatError;
        chatId = nuevoChat.id;
      }

      const { error: mensajeError } = await supabase
        .from('mensajes')
        .insert({
          chat_id: chatId,
          remitente_id: user.id,
          contenido: storyMessage,
          historia_id: currentStory.id,
          historia_imagen: currentStory.imagen,
          tipo_mensaje: 'texto',
        });

      if (mensajeError) throw mensajeError;

      await supabase.from('notificaciones').insert({
        usuario_id: currentStory.autor_id,
        tipo: 'mensaje_privado',
        titulo: 'Mensaje sobre tu historia',
        mensaje: `${user.nombre} te envió un mensaje sobre tu historia`,
        usuario_origen_id: user.id,
      });

      setStoryMessage('');
      Alert.alert('Éxito', 'Mensaje enviado correctamente');
      console.log('[StoryViewer] ✅ Story message sent');
    } catch (error) {
      console.error('[StoryViewer] Error sending story message:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
    }
  }, [user, currentStory, storyMessage]);

  const handleNavigateToStoryAuthorProfile = useCallback(() => {
    if (!currentStory) return;

    onClose();

    if (currentStory.tipo === 'local' && currentStory.local_id) {
      router.push(`/perfil/local?localId=${currentStory.local_id}`);
    } else if (user && currentStory.autor_id === user.id) {
      router.push('/(tabs)/perfil');
    } else {
      router.push(`/perfil/usuario?userId=${currentStory.autor_id}`);
    }
  }, [currentStory, user, router, onClose]);

  const handleCloseStoryViewerAndNavigate = useCallback(() => {
    setShowStoryStats(false);
    onClose();
  }, [onClose]);

  // ✅ FIXED: Improved PanResponder with better gesture detection
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
      },
      onMoveShouldSetPanResponderCapture: () => false,
      
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        touchStartTime.current = Date.now();
        touchStartX.current = evt.nativeEvent.pageX;
        touchStartY.current = evt.nativeEvent.pageY;
        isLongPress.current = false;
        isSwiping.current = false;
        
        longPressTimer.current = setTimeout(() => {
          isLongPress.current = true;
          setIsPaused(true);
          stopAnimation();
          console.log('[StoryViewer] ⏸️ Long press detected - paused');
        }, LONG_PRESS_DURATION);
      },
      
      onPanResponderMove: (_, gestureState: PanResponderGestureState) => {
        const { dx, dy } = gestureState;
        
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
          isSwiping.current = true;
        }
      },
      
      onPanResponderRelease: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        const { dx, dy } = gestureState;
        const touchDuration = Date.now() - touchStartTime.current;
        const touchX = evt.nativeEvent.pageX;
        
        if (isLongPress.current) {
          setIsPaused(false);
          startAnimation();
          console.log('[StoryViewer] ▶️ Long press released - resumed');
          return;
        }
        
        if (dy > SWIPE_THRESHOLD && Math.abs(dx) < SWIPE_THRESHOLD) {
          console.log('[StoryViewer] 👇 Swipe down detected - closing');
          onClose();
          return;
        }
        
        if (dx < -SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
          console.log('[StoryViewer] 👈 Swipe left detected - next story');
          handleNextStory();
          return;
        }
        
        if (dx > SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
          console.log('[StoryViewer] 👉 Swipe right detected - previous story');
          handlePreviousStory();
          return;
        }
        
        if (!isSwiping.current && Math.abs(dx) < 20 && Math.abs(dy) < 20 && touchDuration < TAP_THRESHOLD) {
          const tapZone = touchX / width;
          
          if (tapZone < 0.33) {
            console.log('[StoryViewer] 👆 Tap left - previous story');
            handlePreviousStory();
            return;
          }
          
          if (tapZone > 0.67) {
            console.log('[StoryViewer] 👆 Tap right - next story');
            handleNextStory();
            return;
          }
        }
      },
      
      onPanResponderTerminate: () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      },
    })
  ).current;

  // ✅ ULTRA-SMOOTH: Handle animation lifecycle
  useEffect(() => {
    if (!visible) {
      stopAnimation();
      return;
    }

    if (isPaused) {
      stopAnimation();
      return;
    }

    if (imageLoaded) {
      startAnimation();
    }

    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [visible, isPaused, imageLoaded, currentStoryIndex, startAnimation, stopAnimation]);

  // Mark story as viewed when it appears
  useEffect(() => {
    if (visible && currentStory && user) {
      markStoryAsViewed(currentStory.id);
    }
  }, [visible, currentStory, user, markStoryAsViewed]);

  // ✅ OPTIMIZED: Preload next 2 story images
  useEffect(() => {
    if (visible) {
      const preloadPromises: Promise<boolean>[] = [];
      
      if (currentStoryIndex < stories.length - 1) {
        const nextStory = stories[currentStoryIndex + 1];
        if (nextStory?.imagen) {
          preloadPromises.push(Image.prefetch(nextStory.imagen));
        }
      }
      
      if (currentStoryIndex < stories.length - 2) {
        const nextNextStory = stories[currentStoryIndex + 2];
        if (nextNextStory?.imagen) {
          preloadPromises.push(Image.prefetch(nextNextStory.imagen));
        }
      }
      
      if (preloadPromises.length > 0) {
        Promise.all(preloadPromises).then(() => {
          console.log('[StoryViewer] ✅ Preloaded next stories');
        }).catch(() => {
          console.log('[StoryViewer] ⚠️ Failed to preload some stories');
        });
      }
    }
  }, [visible, currentStoryIndex, stories]);

  // Reset to initial index when modal opens
  useEffect(() => {
    if (visible) {
      console.log('[StoryViewer] 🚀 Opening story viewer at index:', initialIndex);
      setCurrentStoryIndex(initialIndex);
      resetAnimation();
    } else {
      console.log('[StoryViewer] 🔒 Closing story viewer, cleaning up');
      stopAnimation();
      setImageLoaded(false);
      setIsPaused(false);
    }
  }, [visible, initialIndex, resetAnimation, stopAnimation]);

  if (!currentStory) {
    return null;
  }

  const isCurrentStoryOwner = user && (
    (currentStory.tipo === 'usuario' && currentStory.autor_id === user.id) ||
    (currentStory.tipo === 'local' && activeLocalProfileId === currentStory.local_id)
  );

  // ✅ FIXED: Remove @ symbol from username display
  const storyAuthorAvatar = currentStory.autor?.avatar || currentStory.autorAvatar;
  const storyAuthorName = currentStory.autor?.nombre || currentStory.autorNombre || 'Usuario';
  const storyAuthorUsername = (currentStory.tipo === 'local' 
    ? storyAuthorName
    : currentStory.autor?.username || currentStory.autorNombre || storyAuthorName
  ).replace(/^@/, '');

  // ✅ ULTRA-SMOOTH: Calculate progress percentage for rendering
  const progressPercentage = `${(progressValue.current * 100).toFixed(2)}%`;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      hardwareAccelerated={true}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.storyViewerModal} {...panResponder.panHandlers}>
          {/* ✅ ULTRA-SMOOTH: Progress bars with direct percentage rendering */}
          <View style={styles.storyProgressContainer}>
            {stories.map((_, index) => (
              <View key={index} style={styles.storyProgressBar}>
                {index < currentStoryIndex && (
                  <View style={[styles.storyProgressFill, { width: '100%' }]} />
                )}
                {index === currentStoryIndex && (
                  <View 
                    style={[
                      styles.storyProgressFill,
                      { width: progressPercentage },
                    ]} 
                  />
                )}
              </View>
            ))}
          </View>

          {/* Header */}
          <View style={styles.storyHeader}>
            <TouchableOpacity 
              style={styles.storyAutorInfo}
              onPress={handleNavigateToStoryAuthorProfile}
              activeOpacity={0.7}
            >
              {storyAuthorAvatar ? (
                <Image source={{ uri: storyAuthorAvatar }} style={styles.storyAutorAvatar} />
              ) : (
                <View style={[styles.storyAutorAvatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {storyAuthorName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.storyAutorTextContainer}>
                <Text style={styles.storyAutorNombre}>
                  {storyAuthorUsername}
                </Text>
                <Text style={styles.storyTime}>
                  {formatStoryTime(currentStory.created_at)}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.storyCloseButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Story content */}
          <View style={styles.storyContent}>
            <StoryImage 
              uri={currentStory.imagen} 
              onLoad={() => {
                console.log('[StoryViewer] ✅ Image loaded for story:', currentStory.id);
                setImageLoaded(true);
              }}
            />
          </View>

          {/* Owner controls */}
          {isCurrentStoryOwner && (
            <View style={styles.storyOwnerControls}>
              <TouchableOpacity
                style={styles.storyControlButton}
                onPress={handleViewStoryStats}
                activeOpacity={0.7}
              >
                <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={20} color="#fff" />
                <Text style={styles.storyControlText}>
                  {currentStory.views_count || 0}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.storyControlButton}
                onPress={handleDeleteStory}
                activeOpacity={0.7}
              >
                <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Viewer interaction bar */}
          {!isCurrentStoryOwner && (
            <View style={styles.storyInteractionBar}>
              <View style={styles.storyMessageInputContainer}>
                <TextInput
                  style={styles.storyMessageInput}
                  placeholder={`Enviar mensaje a ${storyAuthorUsername}...`}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={storyMessage}
                  onChangeText={setStoryMessage}
                  onFocus={() => {
                    setIsPaused(true);
                    stopAnimation();
                  }}
                  onBlur={() => {
                    setIsPaused(false);
                    startAnimation();
                  }}
                />
                {storyMessage.trim().length > 0 && (
                  <TouchableOpacity
                    style={styles.storySendButton}
                    onPress={handleSendStoryMessage}
                    activeOpacity={0.7}
                  >
                    <IconSymbol ios_icon_name="paperplane.fill" android_material_icon_name="send" size={18} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.storyLikeButton}
                onPress={handleStoryLike}
                activeOpacity={0.7}
              >
                <IconSymbol
                  ios_icon_name={currentStory.liked_by_user ? 'heart.fill' : 'heart'}
                  android_material_icon_name={currentStory.liked_by_user ? 'favorite' : 'favorite_border'}
                  size={24}
                  color={currentStory.liked_by_user ? '#EF4444' : '#fff'}
                />
              </TouchableOpacity>
            </View>
          )}

          <StoryStatsModal
            visible={showStoryStats}
            onClose={() => {
              setShowStoryStats(false);
              setIsPaused(false);
              startAnimation();
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
  storyProgressContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
    zIndex: 10,
  },
  storyProgressBar: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  storyProgressFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  storyHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    zIndex: 10,
  },
  storyAutorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storyAutorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  storyAutorTextContainer: {
    flex: 1,
  },
  storyAutorNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  storyTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  storyCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyImage: {
    width: width,
    height: height,
  },
  storyOwnerControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 16,
    flexDirection: 'row',
    gap: 12,
    zIndex: 10,
  },
  storyControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  storyControlText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyLikeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default memo(StoryViewer);
