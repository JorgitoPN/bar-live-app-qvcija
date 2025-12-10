
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ✅ DEFAULT AVATAR URL - Barlive branded default avatar
const DEFAULT_AVATAR_URL = 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop';

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
    imagen_url?: string;
  };
}

interface UnifiedStoryViewerV9Props {
  visible: boolean;
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  onStoryChange?: (index: number) => void;
  onStoryDelete?: (storyId: string) => void;
}

interface ProgressBarProps {
  isActive: boolean;
  isPaused: boolean;
  duration: number;
  onComplete: () => void;
  progress: Animated.Value;
}

// Helper function to truncate long names
const truncateName = (name: string, maxLength: number = 20): string => {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 1) + '...';
};

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
      >
        <LinearGradient
          colors={['#10B981', '#3B82F6']}
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
 * ✅ UNIFIED STORY VIEWER V9.0
 * 
 * The ultimate story viewer with all features:
 * - Consistent design across all pages
 * - Interaction context support (user/local)
 * - Story statistics for owners
 * - Like and message functionality
 * - Smooth animations and gestures
 * - Proper view tracking
 * - Default avatars for users without profile pictures
 */
function UnifiedStoryViewerV9({
  visible,
  stories,
  initialIndex,
  onClose,
  onStoryChange,
  onStoryDelete,
}: UnifiedStoryViewerV9Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { interactionUserId, interactionLocalId, isInteractingAsLocal } = useInteractionContext();
  
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
  
  const progressValues = useRef(stories.map(() => new Animated.Value(0))).current;
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPressing = useRef(false);

  const currentStory = stories[currentIndex];
  
  // ✅ FIXED: Determine ownership based on interaction context
  const isOwner = currentStory?.tipo === 'usuario' 
    ? currentStory?.autor_id === interactionUserId
    : currentStory?.tipo === 'local' && interactionLocalId === currentStory?.local_id;

  const storyImageUrl = currentStory?.imagen_url || currentStory?.imagen || '';

  console.log('[UnifiedStoryViewerV9] 🎭 Interaction context:', {
    interactionUserId,
    interactionLocalId,
    isInteractingAsLocal,
    isOwner,
    storyType: currentStory?.tipo,
  });

  const markAsViewed = useCallback(async (storyId: string) => {
    if (!interactionUserId || !storyId || isOwner) {
      return;
    }

    try {
      // ✅ CRITICAL FIX: Use proper upsert with correct conflict resolution
      const viewData: any = {
        historia_id: storyId,
        usuario_id: interactionUserId,
        viewed_at: new Date().toISOString(),
        tipo: isInteractingAsLocal ? 'local' : 'usuario',
        local_id: isInteractingAsLocal ? interactionLocalId : null,
      };

      // First, try to find existing view
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
        // Update existing view
        const { error } = await supabase
          .from('historia_views')
          .update({ viewed_at: new Date().toISOString() })
          .eq('id', existingView.id);

        if (error) {
          console.error('[UnifiedStoryViewerV9] Error updating story view:', error);
        }
      } else {
        // Insert new view
        const { error } = await supabase
          .from('historia_views')
          .insert(viewData);

        if (error) {
          console.error('[UnifiedStoryViewerV9] Error inserting story view:', error);
        }
      }
    } catch (error) {
      console.error('[UnifiedStoryViewerV9] Error:', error);
    }
  }, [interactionUserId, interactionLocalId, isInteractingAsLocal, isOwner]);

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
        console.error('[UnifiedStoryViewerV9] Error checking like status:', error);
        setIsLiked(false);
        return;
      }

      setIsLiked(!!data);
    } catch (error) {
      console.error('[UnifiedStoryViewerV9] Error:', error);
      setIsLiked(false);
    }
  }, [interactionUserId, interactionLocalId, isInteractingAsLocal]);

  useEffect(() => {
    if (visible && currentStory) {
      if (interactionUserId && !isOwner) {
        markAsViewed(currentStory.id);
      }
      checkIfLiked(currentStory.id);
    }
  }, [visible, currentStory, interactionUserId, isOwner, markAsViewed, checkIfLiked]);

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
  }, []);

  const handleLongPressOut = useCallback(() => {
    isLongPressing.current = false;
    setIsPaused(false);
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
        longPressTimer.current = setTimeout(() => {
          handleLongPressIn();
        }, 100);
      },
      onPanResponderMove: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10) {
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        if (isLongPressing.current) {
          handleLongPressOut();
          return;
        }
        
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
                console.error('[UnifiedStoryViewerV9] Error deleting story:', error);
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
              console.error('[UnifiedStoryViewerV9] Error:', error);
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
      console.error('[UnifiedStoryViewerV9] Error loading story stats:', error);
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
      console.error('[UnifiedStoryViewerV9] Error toggling story like:', error);
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
        mensaje: `Te enviaron un mensaje sobre tu historia`,
        usuario_origen_id: interactionUserId,
      });
    } catch (error) {
      console.error('[UnifiedStoryViewerV9] Error sending story message:', error);
    } finally {
      setSendingMessage(false);
    }
  }, [interactionUserId, currentStory, storyMessage, sendingMessage, storyImageUrl]);

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

  if (!visible || !currentStory) {
    return null;
  }

  // Get avatar and name based on story type
  const authorAvatar = currentStory.tipo === 'usuario'
    ? (currentStory.autor?.avatar || currentStory.autorAvatar)
    : (currentStory.local?.imagen_url);
  
  const authorName = currentStory.tipo === 'usuario'
    ? (currentStory.autor?.nombre || currentStory.autorNombre || 'Usuario')
    : (currentStory.local?.nombre || 'Local');

  // For display, use username for users and full name for locals
  const displayName = currentStory.tipo === 'local' 
    ? truncateName(authorName)
    : (currentStory.autor?.username || currentStory.autorUsername || authorName).replace(/^@/, '');

  // ✅ FIXED: Use default avatar if no avatar URL
  const displayAvatarUrl = authorAvatar || DEFAULT_AVATAR_URL;

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
          {storyImageUrl ? (
            <Image
              source={{ uri: storyImageUrl }}
              style={styles.storyImage}
              resizeMode="contain"
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                console.error('[UnifiedStoryViewerV9] Error loading image:', storyImageUrl);
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
            <TouchableOpacity 
              style={styles.authorInfo}
              onPress={handleNavigateToStoryAuthorProfile}
              activeOpacity={0.7}
            >
              <View style={styles.avatarWrapper}>
                {/* ✅ FIXED: Always show avatar (fetched or default) */}
                <Image
                  source={{ uri: displayAvatarUrl }}
                  style={styles.authorAvatar}
                />
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
    overflow: 'hidden',
    borderRadius: 1.5,
  },
  progressGradient: {
    flex: 1,
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarPlaceholderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
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

export default memo(UnifiedStoryViewerV9);
