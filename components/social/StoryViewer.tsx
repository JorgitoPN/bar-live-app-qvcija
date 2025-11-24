
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import StoryStatsModal from './StoryStatsModal';

const { width, height } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 seconds per story

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

export default function StoryViewer({
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
  
  const storyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const currentStory = stories[currentStoryIndex];

  const stopStoryTimer = useCallback(() => {
    if (storyTimerRef.current) {
      clearTimeout(storyTimerRef.current);
      storyTimerRef.current = null;
    }
    progressAnim.stopAnimation();
  }, [progressAnim]);

  const markStoryAsViewed = useCallback(async (storyId: string) => {
    if (!user) return;

    try {
      console.log('[StoryViewer] ⚡ INSTANT - Marking story as viewed:', storyId);
      
      const { data: existingView } = await supabase
        .from('historia_views')
        .select('id')
        .eq('historia_id', storyId)
        .eq('usuario_id', user.id)
        .single();

      if (!existingView) {
        await supabase.from('historia_views').insert({
          historia_id: storyId,
          usuario_id: user.id,
        });
        
        console.log('[StoryViewer] ✅ Story marked as viewed in database');
      } else {
        console.log('[StoryViewer] ℹ️ Story already viewed');
      }
    } catch (error) {
      console.error('[StoryViewer] Error marking story as viewed:', error);
    }
  }, [user]);

  const handleNextStory = useCallback(async () => {
    if (currentStory && user) {
      await markStoryAsViewed(currentStory.id);
    }
    
    if (currentStoryIndex < stories.length - 1) {
      const newIndex = currentStoryIndex + 1;
      setCurrentStoryIndex(newIndex);
      progressAnim.setValue(0);
      onStoryChange?.(newIndex);
    } else {
      onClose();
      stopStoryTimer();
    }
  }, [currentStoryIndex, stories.length, currentStory, user, markStoryAsViewed, onClose, stopStoryTimer, progressAnim, onStoryChange]);

  const handlePreviousStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      const newIndex = currentStoryIndex - 1;
      setCurrentStoryIndex(newIndex);
      progressAnim.setValue(0);
      onStoryChange?.(newIndex);
    } else {
      onClose();
      stopStoryTimer();
    }
  }, [currentStoryIndex, onClose, stopStoryTimer, progressAnim, onStoryChange]);

  const startStoryTimer = useCallback(() => {
    if (storyTimerRef.current) {
      clearTimeout(storyTimerRef.current);
    }

    progressAnim.setValue(0);

    // ✅ Animate width from 0% to 100% using scaleX with transformOrigin: 'left'
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !isPaused) {
        handleNextStory();
      }
    });

    storyTimerRef.current = setTimeout(() => {
      if (!isPaused) {
        handleNextStory();
      }
    }, STORY_DURATION);
  }, [handleNextStory, progressAnim, isPaused]);

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

    setIsPaused(true);
    stopStoryTimer();

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
  }, [currentStory, user, stopStoryTimer, activeLocalProfileId]);

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
              stopStoryTimer();

              Alert.alert('Éxito', 'Historia eliminada correctamente');
            } catch (error) {
              console.error('[StoryViewer] Error deleting story:', error);
              Alert.alert('Error', 'No se pudo eliminar la historia');
            }
          },
        },
      ]
    );
  }, [currentStory, user, activeLocalProfileId, onStoryDelete, onClose, stopStoryTimer]);

  const handleSendStoryMessage = useCallback(async () => {
    if (!currentStory || !user || !storyMessage.trim()) {
      return;
    }

    try {
      console.log('[StoryViewer] 📨 Sending story message...');
      
      // ✅ Respect the chats_check constraint (usuario1_id < usuario2_id)
      const usuario1_id = user.id < currentStory.autor_id ? user.id : currentStory.autor_id;
      const usuario2_id = user.id < currentStory.autor_id ? currentStory.autor_id : user.id;
      
      console.log('[StoryViewer] 🔍 Checking for existing chat between:', usuario1_id, 'and', usuario2_id);
      
      const { data: chatExistente, error: chatError } = await supabase
        .from('chats')
        .select('id')
        .eq('usuario1_id', usuario1_id)
        .eq('usuario2_id', usuario2_id)
        .is('local_id', null)
        .single();

      let chatId = chatExistente?.id;

      if (!chatId) {
        console.log('[StoryViewer] ✅ No existing chat found, creating new chat');
        const { data: nuevoChat, error: nuevoChatError } = await supabase
          .from('chats')
          .insert({
            usuario1_id: usuario1_id,
            usuario2_id: usuario2_id,
          })
          .select()
          .single();

        if (nuevoChatError) {
          console.error('[StoryViewer] ❌ Error creating chat:', nuevoChatError);
          throw nuevoChatError;
        }
        chatId = nuevoChat.id;
        console.log('[StoryViewer] ✅ New chat created:', chatId);
      } else {
        console.log('[StoryViewer] ✅ Using existing chat:', chatId);
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

      if (mensajeError) {
        console.error('[StoryViewer] ❌ Error sending message:', mensajeError);
        throw mensajeError;
      }

      console.log('[StoryViewer] ✅ Message sent successfully');

      await supabase.from('notificaciones').insert({
        usuario_id: currentStory.autor_id,
        tipo: 'mensaje_privado',
        titulo: 'Mensaje sobre tu historia',
        mensaje: `${user.nombre} te envió un mensaje sobre tu historia`,
        usuario_origen_id: user.id,
      });

      setStoryMessage('');
      Alert.alert('Éxito', 'Mensaje enviado correctamente');
    } catch (error) {
      console.error('[StoryViewer] ❌ Error sending story message:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
    }
  }, [user, currentStory, storyMessage]);

  const handleNavigateToStoryAuthorProfile = useCallback(() => {
    if (!currentStory) return;

    onClose();
    stopStoryTimer();

    if (currentStory.tipo === 'local' && currentStory.local_id) {
      router.push(`/perfil/local?localId=${currentStory.local_id}`);
    } else if (user && currentStory.autor_id === user.id) {
      router.push('/(tabs)/perfil');
    } else {
      router.push(`/perfil/usuario?userId=${currentStory.autor_id}`);
    }
  }, [currentStory, user, router, onClose, stopStoryTimer]);

  const handleCloseStoryViewerAndNavigate = useCallback(() => {
    console.log('[StoryViewer] ✅ Closing story viewer before navigation from stats modal');
    setShowStoryStats(false);
    onClose();
    stopStoryTimer();
  }, [onClose, stopStoryTimer]);

  // ✅ Instagram-like story gestures with PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to significant movements
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        // ✅ Pause on touch start (tap and hold)
        console.log('[StoryViewer] 👆 Touch started - pausing story');
        setIsPaused(true);
        stopStoryTimer();
      },
      onPanResponderRelease: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const { dx, dy } = gestureState;
        const locationX = evt.nativeEvent.locationX;
        
        console.log('[StoryViewer] 👆 Touch released - dx:', dx, 'dy:', dy, 'locationX:', locationX);
        
        // ✅ Swipe down to close
        if (dy > 100 && Math.abs(dx) < 50) {
          console.log('[StoryViewer] ⬇️ Swipe down detected - closing story viewer');
          onClose();
          stopStoryTimer();
          return;
        }
        
        // ✅ Swipe right to go to previous story
        if (dx > 100 && Math.abs(dy) < 50) {
          console.log('[StoryViewer] ➡️ Swipe right detected - going to previous story');
          handlePreviousStory();
          setIsPaused(false);
          return;
        }
        
        // ✅ Swipe left to go to next story
        if (dx < -100 && Math.abs(dy) < 50) {
          console.log('[StoryViewer] ⬅️ Swipe left detected - going to next story');
          handleNextStory();
          setIsPaused(false);
          return;
        }
        
        // ✅ Tap left side to go to previous story
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && locationX < width / 2) {
          console.log('[StoryViewer] ⏮️ Tap left detected - going to previous story');
          handlePreviousStory();
          setIsPaused(false);
          return;
        }
        
        // ✅ Tap right side to go to next story
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && locationX >= width / 2) {
          console.log('[StoryViewer] ⏭️ Tap right detected - going to next story');
          handleNextStory();
          setIsPaused(false);
          return;
        }
        
        // ✅ Resume story if no gesture was detected
        console.log('[StoryViewer] ▶️ Resuming story');
        setIsPaused(false);
        startStoryTimer();
      },
    })
  ).current;

  useEffect(() => {
    if (visible && !isPaused) {
      startStoryTimer();
    }
    return () => {
      stopStoryTimer();
    };
  }, [visible, currentStoryIndex, isPaused, startStoryTimer, stopStoryTimer]);

  useEffect(() => {
    if (visible && currentStory && user) {
      markStoryAsViewed(currentStory.id);
    }
  }, [visible, currentStory, user, markStoryAsViewed]);

  useEffect(() => {
    setCurrentStoryIndex(initialIndex);
  }, [initialIndex]);

  if (!currentStory) {
    return null;
  }

  const isCurrentStoryOwner = user && (
    (currentStory.tipo === 'usuario' && currentStory.autor_id === user.id) ||
    (currentStory.tipo === 'local' && activeLocalProfileId === currentStory.local_id)
  );

  // ✅ Get display username for story author WITHOUT @ symbol
  const storyAuthorUsername = currentStory.tipo === 'local' 
    ? currentStory.autor?.nombre // Locals use their name
    : currentStory.autor?.username || currentStory.autor?.nombre; // Users should have username

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.storyViewerModal} {...panResponder.panHandlers}>
          <View style={styles.storyViewerHeader}>
            <View style={styles.storyProgressContainer}>
              {stories.map((_, index) => (
                <View key={index} style={styles.storyProgressBar}>
                  {index < currentStoryIndex && (
                    <View style={[styles.storyProgressFill, { width: '100%' }]} />
                  )}
                  {index === currentStoryIndex && (
                    <Animated.View 
                      style={[
                        styles.storyProgressFill,
                        {
                          width: '100%',
                          transform: [
                            {
                              scaleX: progressAnim,
                            },
                          ],
                        },
                      ]} 
                    />
                  )}
                </View>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.storyAutorInfo}
              onPress={handleNavigateToStoryAuthorProfile}
              activeOpacity={0.7}
            >
              {currentStory.autor?.avatar ? (
                <Image source={{ uri: currentStory.autor.avatar }} style={styles.storyAutorAvatar} />
              ) : (
                <View style={[styles.storyAutorAvatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {currentStory.autor?.nombre?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <Text style={styles.storyAutorNombre}>
                {storyAuthorUsername}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.storyCloseButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={styles.storyContent}>
            <Image source={{ uri: currentStory.imagen }} style={styles.storyImage} resizeMode="contain" />
          </View>

          {isCurrentStoryOwner && (
            <View style={styles.storyBottomLeftControls}>
              <TouchableOpacity
                style={styles.storyStatsButtonBottom}
                onPress={handleViewStoryStats}
                activeOpacity={0.7}
              >
                <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.storyDeleteButtonBottom}
                onPress={handleDeleteStory}
                activeOpacity={0.7}
              >
                <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {!isCurrentStoryOwner && (
            <View style={styles.storyInteractionBar}>
              <TouchableOpacity
                style={styles.storyInteractionButton}
                onPress={handleStoryLike}
                activeOpacity={0.7}
              >
                <IconSymbol
                  ios_icon_name={currentStory.liked_by_user ? 'heart.fill' : 'heart'}
                  android_material_icon_name={currentStory.liked_by_user ? 'favorite' : 'favorite_border'}
                  size={20}
                  color={currentStory.liked_by_user ? '#EF4444' : '#fff'}
                />
              </TouchableOpacity>

              <TextInput
                style={styles.storyMessageInput}
                placeholder="Enviar mensaje..."
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={storyMessage}
                onChangeText={setStoryMessage}
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
              />

              {storyMessage.trim().length > 0 && (
                <TouchableOpacity
                  style={styles.storySendButton}
                  onPress={handleSendStoryMessage}
                  activeOpacity={0.7}
                >
                  <IconSymbol ios_icon_name="paperplane.fill" android_material_icon_name="send" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          )}

          <StoryStatsModal
            visible={showStoryStats}
            onClose={() => {
              setShowStoryStats(false);
              setIsPaused(false);
              startStoryTimer();
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
  storyViewerModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  storyViewerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  storyProgressContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  storyProgressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  storyProgressFill: {
    height: '100%',
    backgroundColor: '#fff',
    transformOrigin: 'left',
  },
  storyAutorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyAutorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
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
  storyAutorNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  storyCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  storyBottomLeftControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 16,
    flexDirection: 'row',
    gap: 16,
    zIndex: 10,
  },
  storyStatsButtonBottom: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyDeleteButtonBottom: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  storyInteractionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    zIndex: 10,
  },
  storyInteractionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  storyMessageInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  storySendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
