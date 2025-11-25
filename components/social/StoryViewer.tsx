
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
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
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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
  autorUsername?: string;
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

// ✅ ULTRA-OPTIMIZED: Memoized story image component with INSTANT loading
const StoryImage = memo(({ uri }: { uri: string }) => {
  const [imageError, setImageError] = useState(false);
  
  return (
    <>
      {imageError && (
        <View style={[styles.storyImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}>
          <IconSymbol ios_icon_name="exclamationmark.triangle" android_material_icon_name="error" size={48} color="#fff" />
          <Text style={{ color: '#fff', marginTop: 16 }}>Error al cargar la imagen</Text>
        </View>
      )}
      <Image 
        source={{ uri }} 
        style={styles.storyImage} 
        resizeMode="contain"
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

// ✅ FIXED: Ultra-smooth progress bar with proper animation
const ProgressBar = memo(({ 
  index, 
  currentIndex, 
  isActive, 
  isPaused, 
  duration,
  onComplete 
}: { 
  index: number;
  currentIndex: number;
  isActive: boolean;
  isPaused: boolean;
  duration: number;
  onComplete: () => void;
}) => {
  const [progress, setProgress] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedTimeRef = useRef<number>(0);

  useEffect(() => {
    // Set initial progress based on position
    if (index < currentIndex) {
      setProgress(1); // Completed
      return;
    } else if (index > currentIndex) {
      setProgress(0); // Not started
      return;
    }

    // Current story - start animation
    if (isActive && !isPaused) {
      startTimeRef.current = performance.now();
      
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTimeRef.current + elapsedTimeRef.current;
        const newProgress = Math.min(elapsed / duration, 1);
        
        setProgress(newProgress);
        
        if (newProgress >= 1) {
          elapsedTimeRef.current = 0;
          onComplete();
        } else {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [index, currentIndex, isActive, isPaused, duration, onComplete]);

  // Handle pause/resume
  useEffect(() => {
    if (isActive && index === currentIndex) {
      if (isPaused && animationFrameRef.current !== null) {
        // Save elapsed time when pausing
        const now = performance.now();
        elapsedTimeRef.current += (now - startTimeRef.current);
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [isPaused, isActive, index, currentIndex]);

  // Reset when story changes
  useEffect(() => {
    if (index === currentIndex && isActive) {
      elapsedTimeRef.current = 0;
      setProgress(0);
    }
  }, [currentIndex, index, isActive]);

  return (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]}>
          <LinearGradient
            colors={['#FFD700', '#00FF00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progressGradient}
          />
        </View>
      </View>
    </View>
  );
});

ProgressBar.displayName = 'ProgressBar';

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
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  const isPausedRef = useRef<boolean>(false);
  
  // Gesture tracking refs
  const touchStartTime = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const isSwiping = useRef(false);

  const currentStory = stories[currentStoryIndex];

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
      }
    } catch (error) {
      console.error('[StoryViewer] Error marking story as viewed:', error);
    }
  }, [user]);

  const handleNextStory = useCallback(() => {
    if (currentStory && user) {
      markStoryAsViewed(currentStory.id);
    }
    
    if (currentStoryIndex < stories.length - 1) {
      const newIndex = currentStoryIndex + 1;
      setCurrentStoryIndex(newIndex);
      onStoryChange?.(newIndex);
      
      // ✅ Preload next images in background
      if (newIndex + 1 < stories.length) {
        const nextImages = stories.slice(newIndex + 1, newIndex + 4).map(s => s.imagen).filter(Boolean);
        Promise.all(nextImages.map(uri => Image.prefetch(uri))).catch(() => {});
      }
    } else {
      onClose();
    }
  }, [currentStoryIndex, stories.length, currentStory, user, markStoryAsViewed, onClose, onStoryChange]);

  const handlePreviousStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      const newIndex = currentStoryIndex - 1;
      setCurrentStoryIndex(newIndex);
      onStoryChange?.(newIndex);
    } else {
      onClose();
    }
  }, [currentStoryIndex, onClose, onStoryChange]);

  const handleStoryLike = useCallback(async () => {
    if (!currentStory || !user) {
      return;
    }

    // ✅ OPTIMISTIC UI: Update immediately
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
      console.error('[StoryViewer] Error toggling story like:', error);
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
    } catch (error) {
      console.error('[StoryViewer] Error loading story stats:', error);
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
              // ✅ Delete story image from storage
              if (currentStory.imagen) {
                const imagePath = currentStory.imagen.split('/').pop();
                if (imagePath) {
                  await supabase.storage
                    .from('historias')
                    .remove([imagePath]);
                  console.log('[StoryViewer] ✅ Story image deleted from storage');
                }
              }

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
    if (!currentStory || !user || !storyMessage.trim() || sendingMessage) {
      return;
    }

    const messageText = storyMessage.trim();
    
    // ✅ OPTIMISTIC UI: Clear input and show success IMMEDIATELY
    setStoryMessage('');
    setSendingMessage(true);
    Alert.alert('Éxito', 'Mensaje enviado correctamente');

    try {
      console.log('[StoryViewer] 📨 Sending story message to author:', currentStory.autor_id);
      
      // ✅ Check if a conversation already exists
      const userId1 = user.id < currentStory.autor_id ? user.id : currentStory.autor_id;
      const userId2 = user.id < currentStory.autor_id ? currentStory.autor_id : user.id;
      
      console.log('[StoryViewer] 🔍 Checking for existing chat:', { userId1, userId2 });
      
      // ✅ For local stories, check for local-specific chat
      let chatQuery = supabase
        .from('chats')
        .select('id')
        .eq('usuario1_id', userId1)
        .eq('usuario2_id', userId2);
      
      if (currentStory.tipo === 'local' && currentStory.local_id) {
        console.log('[StoryViewer] 🏢 Checking for local-specific chat with local_id:', currentStory.local_id);
        chatQuery = chatQuery.eq('local_id', currentStory.local_id);
      } else {
        console.log('[StoryViewer] 👤 Checking for user-to-user chat (no local_id)');
        chatQuery = chatQuery.is('local_id', null);
      }
      
      const { data: chatExistente, error: chatError } = await chatQuery.maybeSingle();

      if (chatError && chatError.code !== 'PGRST116') {
        console.error('[StoryViewer] Error checking for existing chat:', chatError);
        throw chatError;
      }

      let chatId = chatExistente?.id;

      if (!chatId) {
        console.log('[StoryViewer] 🆕 Creating new chat');
        
        const chatData: any = {
          usuario1_id: userId1,
          usuario2_id: userId2,
          ultimo_mensaje: messageText,
          ultimo_mensaje_fecha: new Date().toISOString(),
        };
        
        // ✅ Set local_id for local stories
        if (currentStory.tipo === 'local' && currentStory.local_id) {
          chatData.local_id = currentStory.local_id;
          console.log('[StoryViewer] 🏢 Creating local-specific chat with local_id:', currentStory.local_id);
        } else {
          chatData.local_id = null;
          console.log('[StoryViewer] 👤 Creating user-to-user chat (no local_id)');
        }
        
        const { data: nuevoChat, error: nuevoChatError } = await supabase
          .from('chats')
          .insert(chatData)
          .select()
          .single();

        if (nuevoChatError) {
          console.error('[StoryViewer] Error creating chat:', nuevoChatError);
          
          // Check if it's a duplicate key error (race condition)
          if (nuevoChatError.code === '23505') {
            console.log('[StoryViewer] Chat already exists (race condition), fetching it...');
            
            let retryQuery = supabase
              .from('chats')
              .select('id')
              .eq('usuario1_id', userId1)
              .eq('usuario2_id', userId2);
            
            if (currentStory.tipo === 'local' && currentStory.local_id) {
              retryQuery = retryQuery.eq('local_id', currentStory.local_id);
            } else {
              retryQuery = retryQuery.is('local_id', null);
            }
            
            const { data: retryChat, error: retryError } = await retryQuery.single();
            
            if (retryChat) {
              console.log('[StoryViewer] ✅ Found existing chat on retry:', retryChat.id);
              chatId = retryChat.id;
            } else {
              throw retryError || nuevoChatError;
            }
          } else {
            throw nuevoChatError;
          }
        } else {
          chatId = nuevoChat.id;
          console.log('[StoryViewer] ✅ Created new chat:', chatId);
        }
      } else {
        console.log('[StoryViewer] ✅ Using existing chat:', chatId);
      }

      // Send message
      console.log('[StoryViewer] 📤 Sending message to chat:', chatId);
      
      const { error: mensajeError } = await supabase
        .from('mensajes')
        .insert({
          chat_id: chatId,
          remitente_id: user.id,
          contenido: messageText,
          historia_id: currentStory.id,
          historia_imagen: currentStory.imagen,
          tipo_mensaje: 'texto',
        });

      if (mensajeError) {
        console.error('[StoryViewer] Error sending message:', mensajeError);
        throw mensajeError;
      }

      // Update chat
      await supabase
        .from('chats')
        .update({
          ultimo_mensaje: messageText,
          ultimo_mensaje_fecha: new Date().toISOString(),
        })
        .eq('id', chatId);

      // Send notification
      await supabase.from('notificaciones').insert({
        usuario_id: currentStory.autor_id,
        tipo: 'mensaje_privado',
        titulo: 'Mensaje sobre tu historia',
        mensaje: `${user.nombre} te envió un mensaje sobre tu historia`,
        usuario_origen_id: user.id,
      });

      console.log('[StoryViewer] ✅ Message sent successfully');
    } catch (error) {
      console.error('[StoryViewer] Error sending story message:', error);
    } finally {
      setSendingMessage(false);
    }
  }, [user, currentStory, storyMessage, sendingMessage]);

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

  // ✅ Improved PanResponder with better gesture detection
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
          isPausedRef.current = true;
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
          isPausedRef.current = false;
          return;
        }
        
        if (dy > SWIPE_THRESHOLD && Math.abs(dx) < SWIPE_THRESHOLD) {
          onClose();
          return;
        }
        
        if (dx < -SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
          handleNextStory();
          return;
        }
        
        if (dx > SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
          handlePreviousStory();
          return;
        }
        
        if (!isSwiping.current && Math.abs(dx) < 20 && Math.abs(dy) < 20 && touchDuration < TAP_THRESHOLD) {
          const tapZone = touchX / width;
          
          if (tapZone < 0.33) {
            handlePreviousStory();
            return;
          }
          
          if (tapZone > 0.67) {
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

  // Mark story as viewed when it appears
  useEffect(() => {
    if (visible && currentStory && user) {
      markStoryAsViewed(currentStory.id);
    }
  }, [visible, currentStory, user, markStoryAsViewed]);

  // ✅ CRITICAL FIX: Preload images BEFORE opening viewer
  useEffect(() => {
    if (visible && !isReady) {
      console.log('[StoryViewer] 🚀 Preloading images...');
      
      const imagesToPreload: string[] = [];
      
      // Preload current + next 3 stories
      for (let i = initialIndex; i < Math.min(initialIndex + 4, stories.length); i++) {
        if (stories[i]?.imagen) {
          imagesToPreload.push(stories[i].imagen);
        }
      }
      
      Promise.all(imagesToPreload.map(uri => Image.prefetch(uri)))
        .then(() => {
          console.log('[StoryViewer] ✅ Images preloaded, starting animation');
          setIsReady(true);
        })
        .catch(() => {
          console.log('[StoryViewer] ⚠️ Some images failed to preload, continuing anyway');
          setIsReady(true);
        });
    }
  }, [visible, stories, initialIndex, isReady]);

  // ✅ Preload next 2 story images for INSTANT loading
  useEffect(() => {
    if (visible && isReady) {
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
        Promise.all(preloadPromises).catch(() => {
          console.log('[StoryViewer] Failed to preload some stories');
        });
      }
    }
  }, [visible, currentStoryIndex, stories, isReady]);

  // Reset to initial index when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentStoryIndex(initialIndex);
      setIsPaused(false);
      isPausedRef.current = false;
      setIsReady(false);
    } else {
      setIsPaused(false);
      isPausedRef.current = false;
      setIsReady(false);
    }
  }, [visible, initialIndex]);

  if (!currentStory) {
    return null;
  }

  const isCurrentStoryOwner = user && (
    (currentStory.tipo === 'usuario' && currentStory.autor_id === user.id) ||
    (currentStory.tipo === 'local' && activeLocalProfileId === currentStory.local_id)
  );

  // ✅ CRITICAL FIX: Display username correctly WITHOUT @ symbol
  // For locals, use the local name directly
  // For users, prioritize username over full name, NO @ symbol
  const storyAuthorAvatar = currentStory.autor?.avatar || currentStory.autorAvatar;
  const storyAuthorName = currentStory.autor?.nombre || currentStory.autorNombre || 'Usuario';
  
  const displayName = currentStory.tipo === 'local' 
    ? storyAuthorName // For locals, use the local name directly
    : (currentStory.autor?.username || currentStory.autorUsername || storyAuthorName).replace(/^@/, ''); // Remove @ if present

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
          {/* ✅ ULTRA-SMOOTH progress bars using requestAnimationFrame */}
          <BlurView intensity={20} tint="dark" style={styles.progressContainer}>
            <View style={styles.progressBarsWrapper}>
              {stories.map((_, index) => (
                <ProgressBar
                  key={index}
                  index={index}
                  currentIndex={currentStoryIndex}
                  isActive={isReady && visible}
                  isPaused={isPaused}
                  duration={STORY_DURATION}
                  onComplete={handleNextStory}
                />
              ))}
            </View>
          </BlurView>

          {/* ✅ Modern header with glassmorphism */}
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
                  colors={['rgba(255, 215, 0, 0.3)', 'rgba(0, 255, 0, 0.3)']}
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

            <TouchableOpacity
              style={styles.storyCloseButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                style={styles.closeButtonGradient}
              >
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>

          {/* Story content */}
          <View style={styles.storyContent}>
            <StoryImage uri={currentStory.imagen} />
          </View>

          {/* ✅ Modern owner controls with glassmorphism */}
          {isCurrentStoryOwner && (
            <BlurView intensity={30} tint="dark" style={styles.storyOwnerControls}>
              <TouchableOpacity
                style={styles.storyControlButton}
                onPress={handleViewStoryStats}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                  style={styles.controlButtonGradient}
                >
                  <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={18} color="#fff" />
                  <Text style={styles.storyControlText}>
                    {currentStory.views_count || 0}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.storyControlButton}
                onPress={handleDeleteStory}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.1)']}
                  style={styles.controlButtonGradient}
                >
                  <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </BlurView>
          )}

          {/* ✅ Modern interaction bar with glassmorphism */}
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
  storyCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  closeButtonGradient: {
    width: '100%',
    height: '100%',
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
    borderRadius: 24,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  storyControlButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  controlButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  storyControlText: {
    fontSize: 14,
    fontWeight: '700',
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

export default memo(StoryViewer);
