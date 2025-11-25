
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
  StatusBar,
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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

interface NewStoryViewerProps {
  visible: boolean;
  stories: Historia[];
  initialIndex: number;
  onClose: () => void;
  onStoryChange?: (index: number) => void;
  onStoryDelete?: (storyId: string) => void;
  activeLocalProfileId?: string | null;
}

// Progress Bar Component with smooth animation - MATCHING PROFILE PAGE DESIGN
const ProgressBar = memo(({ 
  duration, 
  isPaused, 
  onComplete,
  isActive,
}: { 
  duration: number;
  isPaused: boolean;
  onComplete: () => void;
  isActive: boolean;
}) => {
  const progress = useRef(new Animated.Value(0)).current;
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

    // Start or resume animation
    const currentValue = (progress as any)._value || 0;
    const remainingDuration = duration * (1 - currentValue);

    animationRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: remainingDuration,
      easing: Easing.linear,
      useNativeDriver: false, // Can't use native driver for width
    });

    animationRef.current.start(({ finished }) => {
      if (finished) {
        onComplete();
      }
    });

    return () => {
      animationRef.current?.stop();
    };
  }, [isActive, isPaused, duration, onComplete]);

  const widthInterpolate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={progressStyles.container}>
      <View style={progressStyles.background}>
        <Animated.View style={[progressStyles.fill, { width: widthInterpolate }]}>
          <LinearGradient
            colors={['#FFD700', '#00FF00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={progressStyles.gradient}
          />
        </Animated.View>
      </View>
    </View>
  );
});

ProgressBar.displayName = 'ProgressBar';

const progressStyles = StyleSheet.create({
  container: {
    flex: 1,
    height: 3,
  },
  background: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    overflow: 'hidden',
    borderRadius: 2,
  },
  gradient: {
    flex: 1,
  },
});

// Story Stats Modal
const StoryStatsModal = memo(({ 
  visible, 
  onClose, 
  storyId,
  viewsCount,
  likesCount,
}: {
  visible: boolean;
  onClose: () => void;
  storyId: string;
  viewsCount: number;
  likesCount: number;
}) => {
  const [views, setViews] = useState<any[]>([]);
  const [likes, setLikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'views' | 'likes'>('views');

  useEffect(() => {
    if (visible) {
      loadStats();
    }
  }, [visible, storyId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [viewsData, likesData] = await Promise.all([
        supabase
          .from('historia_views')
          .select('id, usuario_id, viewed_at, usuario:usuarios(nombre, avatar, username)')
          .eq('historia_id', storyId)
          .order('viewed_at', { ascending: false }),
        supabase
          .from('historia_likes')
          .select('id, usuario_id, created_at, usuario:usuarios(nombre, avatar, username)')
          .eq('historia_id', storyId)
          .order('created_at', { ascending: false }),
      ]);

      setViews(viewsData.data || []);
      setLikes(likesData.data || []);
    } catch (error) {
      console.error('[StoryStats] Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderUser = (item: any) => {
    const user = item.usuario;
    if (!user) return null;

    return (
      <View key={item.id} style={statsStyles.userItem}>
        {user.avatar ? (
          <Image source={{ uri: user.avatar }} style={statsStyles.userAvatar} />
        ) : (
          <View style={[statsStyles.userAvatar, statsStyles.avatarPlaceholder]}>
            <Text style={statsStyles.avatarText}>
              {user.nombre?.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={statsStyles.userInfo}>
          <Text style={statsStyles.userName}>{user.nombre}</Text>
          {user.username && (
            <Text style={statsStyles.userUsername}>@{user.username}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={statsStyles.overlay} onPress={onClose}>
        <Pressable style={statsStyles.modal} onPress={(e) => e.stopPropagation()}>
          <View style={statsStyles.header}>
            <Text style={statsStyles.title}>Estadísticas</Text>
            <TouchableOpacity onPress={onClose} style={statsStyles.closeButton}>
              <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={statsStyles.tabs}>
            <TouchableOpacity
              style={[statsStyles.tab, activeTab === 'views' && statsStyles.tabActive]}
              onPress={() => setActiveTab('views')}
            >
              <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={20} color={activeTab === 'views' ? colors.primary : colors.textSecondary} />
              <Text style={[statsStyles.tabText, activeTab === 'views' && statsStyles.tabTextActive]}>
                {viewsCount} {viewsCount === 1 ? 'vista' : 'vistas'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[statsStyles.tab, activeTab === 'likes' && statsStyles.tabActive]}
              onPress={() => setActiveTab('likes')}
            >
              <IconSymbol ios_icon_name="heart.fill" android_material_icon_name="favorite" size={20} color={activeTab === 'likes' ? colors.primary : colors.textSecondary} />
              <Text style={[statsStyles.tabText, activeTab === 'likes' && statsStyles.tabTextActive]}>
                {likesCount} {likesCount === 1 ? 'me gusta' : 'me gusta'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={statsStyles.content}>
            {loading ? (
              <View style={statsStyles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <>
                {activeTab === 'views' && views.map(renderUser)}
                {activeTab === 'likes' && likes.map(renderUser)}
                {activeTab === 'views' && views.length === 0 && (
                  <Text style={statsStyles.emptyText}>Aún no hay vistas</Text>
                )}
                {activeTab === 'likes' && likes.length === 0 && (
                  <Text style={statsStyles.emptyText}>Aún no hay me gusta</Text>
                )}
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

StoryStatsModal.displayName = 'StoryStatsModal';

const statsStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  tabs: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tabActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  content: {
    padding: 16,
    maxHeight: 400,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  userUsername: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 40,
  },
});

// Main Story Viewer Component - MATCHING PROFILE PAGE DESIGN
function NewStoryViewer({
  visible,
  stories,
  initialIndex,
  onClose,
  onStoryChange,
  onStoryDelete,
  activeLocalProfileId,
}: NewStoryViewerProps) {
  const router = useRouter();
  const { user } = useAuth();
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const currentStory = stories[currentIndex];
  const isOwner = user && (
    (currentStory?.tipo === 'usuario' && currentStory.autor_id === user.id) ||
    (currentStory?.tipo === 'local' && activeLocalProfileId === currentStory.local_id)
  );

  // ✅ CRITICAL: Preload next images aggressively for smooth transitions
  useEffect(() => {
    if (visible && currentIndex < stories.length) {
      const nextImages = stories.slice(currentIndex, currentIndex + 3).map(s => s.imagen);
      console.log('[NewStoryViewer] Preloading next', nextImages.length, 'images');
      nextImages.forEach(uri => {
        Image.prefetch(uri).catch(() => {
          console.log('[NewStoryViewer] Failed to prefetch:', uri);
        });
      });
    }
  }, [visible, currentIndex, stories]);

  // Mark story as viewed
  useEffect(() => {
    if (visible && currentStory && user && !isOwner) {
      markAsViewed(currentStory.id);
    }
  }, [visible, currentStory, user, isOwner]);

  const markAsViewed = async (storyId: string) => {
    if (!user) return;
    try {
      const { data: existing } = await supabase
        .from('historia_views')
        .select('id')
        .eq('historia_id', storyId)
        .eq('usuario_id', user.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from('historia_views').insert({
          historia_id: storyId,
          usuario_id: user.id,
        });
      }
    } catch (error) {
      console.error('[NewStoryViewer] Error marking as viewed:', error);
    }
  };

  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setImageLoaded(false);
      onStoryChange?.(currentIndex + 1);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose, onStoryChange]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setImageLoaded(false);
      onStoryChange?.(currentIndex - 1);
    } else {
      onClose();
    }
  }, [currentIndex, onClose, onStoryChange]);

  const handleLike = async () => {
    if (!currentStory || !user) return;

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
      
      // Update local state
      currentStory.liked_by_user = !isLiked;
    } catch (error) {
      console.error('[NewStoryViewer] Error toggling like:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!currentStory || !user || !message.trim() || sendingMessage) return;

    const messageText = message.trim();
    setMessage('');
    setSendingMessage(true);

    try {
      const userId1 = user.id < currentStory.autor_id ? user.id : currentStory.autor_id;
      const userId2 = user.id < currentStory.autor_id ? currentStory.autor_id : user.id;

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

      const { data: existingChat } = await chatQuery.maybeSingle();

      let chatId = existingChat?.id;

      if (!chatId) {
        const chatData: any = {
          usuario1_id: userId1,
          usuario2_id: userId2,
          ultimo_mensaje: messageText,
          ultimo_mensaje_fecha: new Date().toISOString(),
        };

        if (currentStory.tipo === 'local' && currentStory.local_id) {
          chatData.local_id = currentStory.local_id;
        }

        const { data: newChat, error } = await supabase
          .from('chats')
          .insert(chatData)
          .select()
          .single();

        if (error) throw error;
        chatId = newChat.id;
      }

      await supabase.from('mensajes').insert({
        chat_id: chatId,
        remitente_id: user.id,
        contenido: messageText,
        historia_id: currentStory.id,
        historia_imagen: currentStory.imagen,
        tipo_mensaje: 'texto',
      });

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

      Alert.alert('Éxito', 'Mensaje enviado correctamente');
    } catch (error) {
      console.error('[NewStoryViewer] Error sending message:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDelete = () => {
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
              if (currentStory.imagen) {
                const imagePath = currentStory.imagen.split('/').pop();
                if (imagePath) {
                  await supabase.storage.from('historias').remove([imagePath]);
                }
              }

              await supabase.from('historias').delete().eq('id', currentStory.id);
              
              onStoryDelete?.(currentStory.id);
              onClose();
              
              Alert.alert('Éxito', 'Historia eliminada correctamente');
            } catch (error) {
              console.error('[NewStoryViewer] Error deleting story:', error);
              Alert.alert('Error', 'No se pudo eliminar la historia');
            }
          },
        },
      ]
    );
  };

  const handleViewStats = () => {
    setIsPaused(true);
    setShowStats(true);
  };

  const handleNavigateToProfile = () => {
    if (!currentStory) return;

    onClose();

    if (currentStory.tipo === 'local' && currentStory.local_id) {
      router.push(`/perfil/local?localId=${currentStory.local_id}`);
    } else if (user && currentStory.autor_id === user.id) {
      router.push('/(tabs)/perfil');
    } else {
      router.push(`/perfil/usuario?userId=${currentStory.autor_id}`);
    }
  };

  // Touch handlers - OPTIMIZED for better responsiveness
  const handleTouchStart = useRef({ x: 0, y: 0, time: 0 });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const onTouchStart = (e: any) => {
    const touch = e.nativeEvent.touches[0];
    handleTouchStart.current = {
      x: touch.pageX,
      y: touch.pageY,
      time: Date.now(),
    };

    longPressTimer.current = setTimeout(() => {
      setIsPaused(true);
    }, 150); // ✅ Reduced from 200ms for faster response
  };

  const onTouchEnd = (e: any) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    const touch = e.nativeEvent.changedTouches[0];
    const deltaX = touch.pageX - handleTouchStart.current.x;
    const deltaY = touch.pageY - handleTouchStart.current.y;
    const deltaTime = Date.now() - handleTouchStart.current.time;

    // Resume if was paused
    if (isPaused && deltaTime < 150) {
      setIsPaused(false);
      return;
    }

    // Swipe down to close
    if (deltaY > 100 && Math.abs(deltaX) < 50) {
      onClose();
      return;
    }

    // Tap zones
    if (Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20 && deltaTime < 150) {
      const tapX = touch.pageX;
      
      if (tapX < width / 3) {
        handlePrevious();
      } else if (tapX > (2 * width) / 3) {
        handleNext();
      }
    }
  };

  if (!currentStory) return null;

  const displayName = currentStory.tipo === 'local'
    ? (currentStory.autorNombre || 'Local')
    : (currentStory.autor?.username || currentStory.autorUsername || currentStory.autorNombre || currentStory.autor?.nombre || 'Usuario').replace(/^@/, '');

  const storyAuthorAvatar = currentStory.autor?.avatar || currentStory.autorAvatar;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent={false}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={styles.content}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Story Image */}
          <View style={styles.imageContainer}>
            {!imageLoaded && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}
            <Image
              source={{ uri: currentStory.imagen }}
              style={styles.image}
              resizeMode="contain"
              onLoad={() => setImageLoaded(true)}
              fadeDuration={0}
            />
          </View>

          {/* Progress Bars - MATCHING PROFILE PAGE */}
          <BlurView intensity={20} tint="dark" style={styles.progressContainer}>
            <View style={styles.progressBarsWrapper}>
              {stories.map((_, index) => (
                <ProgressBar
                  key={index}
                  duration={STORY_DURATION}
                  isPaused={isPaused || !imageLoaded}
                  onComplete={handleNext}
                  isActive={index === currentIndex}
                />
              ))}
            </View>
          </BlurView>

          {/* Header - MATCHING PROFILE PAGE */}
          <BlurView intensity={30} tint="dark" style={styles.header}>
            <TouchableOpacity
              style={styles.authorInfo}
              onPress={handleNavigateToProfile}
              activeOpacity={0.7}
            >
              <View style={styles.avatarWrapper}>
                {storyAuthorAvatar ? (
                  <Image source={{ uri: storyAuthorAvatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>
                      {displayName.charAt(0).toUpperCase()}
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
              <View style={styles.authorTextContainer}>
                <Text style={styles.authorName}>{displayName}</Text>
                <Text style={styles.storyTime}>
                  {formatStoryTime(currentStory.created_at)}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                style={styles.closeButtonGradient}
              >
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>

          {/* Owner Controls - MATCHING PROFILE PAGE */}
          {isOwner && (
            <BlurView intensity={30} tint="dark" style={styles.ownerControls}>
              <TouchableOpacity style={styles.controlButton} onPress={handleViewStats} activeOpacity={0.7}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                  style={styles.controlButtonGradient}
                >
                  <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={18} color="#fff" />
                  <Text style={styles.controlText}>{currentStory.views_count || 0}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={handleDelete} activeOpacity={0.7}>
                <LinearGradient
                  colors={['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.1)']}
                  style={styles.controlButtonGradient}
                >
                  <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </BlurView>
          )}

          {/* Interaction Bar - MATCHING PROFILE PAGE */}
          {!isOwner && (
            <BlurView intensity={30} tint="dark" style={styles.interactionBar}>
              <View style={styles.messageInputContainer}>
                <TextInput
                  style={styles.messageInput}
                  placeholder={`Enviar mensaje a ${displayName}...`}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={message}
                  onChangeText={setMessage}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                  editable={!sendingMessage}
                />
                {message.trim().length > 0 && (
                  <TouchableOpacity
                    style={styles.sendButton}
                    onPress={handleSendMessage}
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

              <TouchableOpacity style={styles.likeButton} onPress={handleLike} activeOpacity={0.7}>
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
        </View>

        <StoryStatsModal
          visible={showStats}
          onClose={() => {
            setShowStats(false);
            setIsPaused(false);
          }}
          storyId={currentStory.id}
          viewsCount={currentStory.views_count || 0}
          likesCount={currentStory.likes_count || 0}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

function formatStoryTime(timestamp: string): string {
  const now = new Date();
  const storyDate = new Date(timestamp);
  const diffMs = now.getTime() - storyDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMinutes < 1) return 'Ahora';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return '1d';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
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
    backgroundColor: '#000',
  },
  image: {
    width: width,
    height: height,
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
  header: {
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
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
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
  authorTextContainer: {
    flex: 1,
  },
  authorName: {
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
  closeButton: {
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
  ownerControls: {
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
  controlButton: {
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
  controlText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
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
    zIndex: 10,
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
});

export default memo(NewStoryViewer);
