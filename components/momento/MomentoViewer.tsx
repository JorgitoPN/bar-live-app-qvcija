
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import { captureRef } from 'react-native-view-shot';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MOMENTO_DURATION = 6000; // 6 seconds per momento
const PROGRESS_BAR_HEIGHT = 3;

interface Momento {
  id: string;
  autor_id: string;
  tipo: 'usuario' | 'local';
  local_id: string | null;
  imagen_url: string;
  categoria: string | null;
  likes_count: number;
  vistas_count: number;
  created_at: string;
  expires_at: string;
  user_has_liked: boolean;
  user_has_viewed: boolean;
}

interface Author {
  id: string;
  nombre: string;
  avatar: string | null;
  tipo: 'usuario' | 'local';
}

interface MomentoViewerProps {
  visible: boolean;
  authorId: string;
  authorType: 'usuario' | 'local';
  onClose: () => void;
}

export default function MomentoViewer({
  visible,
  authorId,
  authorType,
  onClose,
}: MomentoViewerProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [momentos, setMomentos] = useState<Momento[]>([]);
  const [author, setAuthor] = useState<Author | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const [likers, setLikers] = useState<any[]>([]);

  const progressAnims = useRef<Animated.Value[]>([]).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const momentoViewRef = useRef<View>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const markAsViewed = useCallback(async (momentoId: string) => {
    if (!user) return;

    try {
      await supabase.from('momento_views').insert({
        momento_id: momentoId,
        usuario_id: user.id,
        tipo_viewer: 'usuario',
      });

      // Update view count
      await supabase.rpc('increment_momento_views', { momento_id: momentoId });

      // Update local state
      setMomentos(prev =>
        prev.map(m =>
          m.id === momentoId
            ? { ...m, user_has_viewed: true, vistas_count: m.vistas_count + 1 }
            : m
        )
      );
    } catch (error) {
      console.error('[MomentoViewer] Error marking as viewed:', error);
    }
  }, [user]);

  const loadMomentos = useCallback(async () => {
    if (!user || !authorId) return;

    try {
      setLoading(true);
      console.log('[MomentoViewer] Loading momentos for:', { authorId, authorType });

      // Load author info
      if (authorType === 'usuario') {
        const { data: userData } = await supabase
          .from('usuarios')
          .select('id, nombre, avatar')
          .eq('id', authorId)
          .single();

        if (userData) {
          setAuthor({
            id: userData.id,
            nombre: userData.nombre,
            avatar: userData.avatar,
            tipo: 'usuario',
          });
        }
      } else {
        const { data: localData } = await supabase
          .from('locales')
          .select('id, nombre, imagen_url')
          .eq('id', authorId)
          .single();

        if (localData) {
          setAuthor({
            id: localData.id,
            nombre: localData.nombre,
            avatar: localData.imagen_url,
            tipo: 'local',
          });
        }
      }

      // Load momentos
      const query = supabase
        .from('momentos')
        .select('*')
        .eq('tipo', authorType)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (authorType === 'usuario') {
        query.eq('autor_id', authorId);
      } else {
        query.eq('local_id', authorId);
      }

      const { data: momentosData, error } = await query;

      if (error) throw error;

      if (!momentosData || momentosData.length === 0) {
        Alert.alert('Sin Momentos', 'Este usuario no tiene Momentos activos');
        onClose();
        return;
      }

      // Check which momentos user has liked/viewed
      const momentoIds = momentosData.map(m => m.id);
      
      const [likesResult, viewsResult] = await Promise.all([
        supabase
          .from('momento_likes')
          .select('momento_id')
          .eq('usuario_id', user.id)
          .in('momento_id', momentoIds),
        supabase
          .from('momento_views')
          .select('momento_id')
          .eq('usuario_id', user.id)
          .in('momento_id', momentoIds),
      ]);

      const likedIds = new Set(likesResult.data?.map(l => l.momento_id) || []);
      const viewedIds = new Set(viewsResult.data?.map(v => v.momento_id) || []);

      const momentosWithStatus = momentosData.map(m => ({
        ...m,
        user_has_liked: likedIds.has(m.id),
        user_has_viewed: viewedIds.has(m.id),
      }));

      setMomentos(momentosWithStatus);

      // Initialize progress animations - set all previous momentos to 100%
      progressAnims.length = 0;
      momentosWithStatus.forEach(() => {
        progressAnims.push(new Animated.Value(0));
      });

      // Find first unviewed momento or start at beginning
      const firstUnviewedIndex = momentosWithStatus.findIndex(m => !m.user_has_viewed);
      const startIndex = firstUnviewedIndex >= 0 ? firstUnviewedIndex : 0;
      
      // Set all previous progress bars to 100%
      for (let i = 0; i < startIndex; i++) {
        progressAnims[i].setValue(1);
      }
      
      setCurrentIndex(startIndex);
      console.log('[MomentoViewer] Starting at index:', startIndex, 'of', momentosWithStatus.length);

      // Mark first momento as viewed
      if (momentosWithStatus.length > 0 && !momentosWithStatus[startIndex].user_has_viewed) {
        markAsViewed(momentosWithStatus[startIndex].id);
      }

      console.log('[MomentoViewer] ✅ Loaded momentos:', momentosWithStatus.length);
    } catch (error) {
      console.error('[MomentoViewer] Error loading momentos:', error);
      Alert.alert('Error', 'No se pudieron cargar los Momentos');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [user, authorId, authorType, onClose, progressAnims, markAsViewed]);

  const handleLike = async () => {
    if (!user || momentos.length === 0) return;

    const currentMomento = momentos[currentIndex];
    if (!currentMomento) return;

    const hasLiked = currentMomento.user_has_liked;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (hasLiked) {
        // Unlike
        await supabase
          .from('momento_likes')
          .delete()
          .eq('momento_id', currentMomento.id)
          .eq('usuario_id', user.id);

        await supabase.rpc('decrement_momento_likes', { momento_id: currentMomento.id });

        setMomentos(prev =>
          prev.map(m =>
            m.id === currentMomento.id
              ? { ...m, user_has_liked: false, likes_count: m.likes_count - 1 }
              : m
          )
        );
      } else {
        // Like
        await supabase.from('momento_likes').insert({
          momento_id: currentMomento.id,
          usuario_id: user.id,
          tipo_liker: 'usuario',
        });

        await supabase.rpc('increment_momento_likes', { momento_id: currentMomento.id });

        setMomentos(prev =>
          prev.map(m =>
            m.id === currentMomento.id
              ? { ...m, user_has_liked: true, likes_count: m.likes_count + 1 }
              : m
          )
        );
      }
    } catch (error) {
      console.error('[MomentoViewer] Error toggling like:', error);
    }
  };

  const captureMomentoScreenshot = async (): Promise<string | null> => {
    if (!momentoViewRef.current) return null;

    try {
      console.log('[MomentoViewer] Capturing momento screenshot...');
      
      // Capture the momento view as an image
      const uri = await captureRef(momentoViewRef, {
        format: 'jpg',
        quality: 0.8,
      });

      console.log('[MomentoViewer] Screenshot captured:', uri);
      return uri;
    } catch (error) {
      console.error('[MomentoViewer] Error capturing screenshot:', error);
      return null;
    }
  };

  const handleSendMessage = async () => {
    if (!user || !author || momentos.length === 0) return;

    const currentMomento = momentos[currentIndex];
    if (!currentMomento) return;

    try {
      // Capture screenshot of the momento
      const screenshotUri = await captureMomentoScreenshot();
      
      let screenshotUrl: string | null = null;
      
      if (screenshotUri) {
        // Upload screenshot to storage
        const fileName = `momento-screenshot-${Date.now()}.jpg`;
        const filePath = `${user.id}/momento-screenshots/${fileName}`;
        
        const base64 = await FileSystem.readAsStringAsync(screenshotUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        const { decode } = await import('base64-arraybuffer');
        const arrayBuffer = decode(base64);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('momentos')
          .upload(filePath, arrayBuffer, {
            contentType: 'image/jpeg',
            upsert: false,
          });
        
        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from('momentos')
            .getPublicUrl(filePath);
          
          screenshotUrl = urlData.publicUrl;
          console.log('[MomentoViewer] Screenshot uploaded:', screenshotUrl);
        }
      }

      // Create or get existing chat
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .or(`and(usuario1_id.eq.${user.id},usuario2_id.eq.${author.id}),and(usuario1_id.eq.${author.id},usuario2_id.eq.${user.id})`)
        .single();

      let chatId = existingChat?.id;

      if (!chatId) {
        const { data: newChat } = await supabase
          .from('chats')
          .insert({
            usuario1_id: user.id,
            usuario2_id: author.id,
          })
          .select('id')
          .single();

        chatId = newChat?.id;
      }

      if (chatId) {
        // Store momento message with screenshot
        await supabase.from('momento_messages').insert({
          momento_id: currentMomento.id,
          chat_id: chatId,
          remitente_id: user.id,
          mensaje: 'Respondió a tu Momento',
          momento_screenshot_url: screenshotUrl,
        });

        // Navigate to chat
        router.push({
          pathname: '/chat/conversacion',
          params: {
            chatId,
            momentoId: currentMomento.id,
          },
        });
        onClose();
      }
    } catch (error) {
      console.error('[MomentoViewer] Error creating chat:', error);
      Alert.alert('Error', 'No se pudo crear la conversación');
    }
  };

  const handleShowStats = async () => {
    if (momentos.length === 0) return;

    const currentMomento = momentos[currentIndex];
    if (!currentMomento) return;

    try {
      // Load viewers and likers
      const [viewersResult, likersResult] = await Promise.all([
        supabase
          .from('momento_views')
          .select(`
            usuario_id,
            viewed_at,
            usuarios (
              id,
              nombre,
              avatar
            )
          `)
          .eq('momento_id', currentMomento.id)
          .order('viewed_at', { ascending: false }),
        supabase
          .from('momento_likes')
          .select(`
            usuario_id,
            created_at,
            usuarios (
              id,
              nombre,
              avatar
            )
          `)
          .eq('momento_id', currentMomento.id)
          .order('created_at', { ascending: false }),
      ]);

      setViewers(viewersResult.data || []);
      setLikers(likersResult.data || []);
      setShowStats(true);
    } catch (error) {
      console.error('[MomentoViewer] Error loading stats:', error);
    }
  };

  const handleDelete = async () => {
    if (!user || momentos.length === 0) return;

    const currentMomento = momentos[currentIndex];
    if (!currentMomento) return;

    // Check if user is the author
    if (currentMomento.autor_id !== user.id) {
      Alert.alert('Error', 'Solo el autor puede eliminar este Momento');
      return;
    }

    Alert.alert(
      'Eliminar Momento',
      '¿Estás seguro de que quieres eliminar este Momento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase
                .from('momentos')
                .delete()
                .eq('id', currentMomento.id);

              // Remove from local state
              const newMomentos = momentos.filter(m => m.id !== currentMomento.id);
              
              if (newMomentos.length === 0) {
                onClose();
              } else {
                setMomentos(newMomentos);
                if (currentIndex >= newMomentos.length) {
                  setCurrentIndex(newMomentos.length - 1);
                }
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('[MomentoViewer] Error deleting momento:', error);
              Alert.alert('Error', 'No se pudo eliminar el Momento');
            }
          },
        },
      ]
    );
  };

  const handleNext = useCallback(() => {
    // Clear any existing timer
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    if (currentIndex < momentos.length - 1) {
      // Set current progress bar to 100% (keep it full)
      if (progressAnims[currentIndex]) {
        Animated.timing(progressAnims[currentIndex], {
          toValue: 1,
          duration: 100,
          useNativeDriver: false,
        }).start();
      }
      
      setCurrentIndex(currentIndex + 1);
      if (!momentos[currentIndex + 1]?.user_has_viewed) {
        markAsViewed(momentos[currentIndex + 1].id);
      }
    } else {
      onClose();
    }
  }, [currentIndex, momentos, onClose, progressAnims, markAsViewed]);

  const handlePrevious = () => {
    // Clear any existing timer
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    if (currentIndex > 0) {
      // Reset current progress bar
      if (progressAnims[currentIndex]) {
        progressAnims[currentIndex].setValue(0);
      }
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleClose = () => {
    // Clear any existing timer
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    // Reset all state before closing
    setCurrentIndex(0);
    setMomentos([]);
    setAuthor(null);
    setPaused(false);
    setShowStats(false);
    setViewers([]);
    setLikers([]);
    progressAnims.forEach(anim => anim.setValue(0));
    onClose();
  };

  const handleLongPressStart = () => {
    setPaused(true);
    Animated.timing(glowAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleLongPressEnd = () => {
    setPaused(false);
    Animated.timing(glowAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
      },
      onPanResponderRelease: (_, gestureState) => {
        // Swipe down to close
        if (gestureState.dy > 100) {
          handleClose();
        }
        // Swipe left/right for next/previous momento
        else if (gestureState.dx > 50) {
          handlePrevious();
        } else if (gestureState.dx < -50) {
          handleNext();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible && authorId) {
      console.log('[MomentoViewer] Opening viewer for:', { authorId, authorType });
      loadMomentos();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else if (!visible) {
      // Reset fade animation when closing
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, authorId, authorType, fadeAnim, loadMomentos]);

  // Auto-progress timer
  useEffect(() => {
    if (!paused && momentos.length > 0 && !loading && visible) {
      // Clear any existing timer
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
      }

      // Set new timer
      progressTimerRef.current = setTimeout(() => {
        handleNext();
      }, MOMENTO_DURATION);

      // Animate progress bar
      Animated.timing(progressAnims[currentIndex], {
        toValue: 1,
        duration: MOMENTO_DURATION,
        useNativeDriver: false,
      }).start();

      return () => {
        if (progressTimerRef.current) {
          clearTimeout(progressTimerRef.current);
          progressTimerRef.current = null;
        }
      };
    }
  }, [currentIndex, paused, momentos, loading, progressAnims, handleNext, visible]);

  if (!visible) return null;

  if (loading) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Cargando Momentos...</Text>
        </View>
      </Modal>
    );
  }

  const currentMomento = momentos[currentIndex];
  
  // Safety check: if currentMomento is undefined, close the viewer
  if (!currentMomento) {
    console.error('[MomentoViewer] Current momento is undefined');
    handleClose();
    return null;
  }

  const isAuthor = user?.id === currentMomento.autor_id;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.backgroundOverlay} />
        
        {/* Momento Image */}
        <View style={styles.imageContainer} {...panResponder.panHandlers} ref={momentoViewRef} collapsable={false}>
          <TouchableOpacity
            style={styles.imageTouchable}
            activeOpacity={1}
            onPress={(e) => {
              const x = e.nativeEvent.locationX;
              if (x < SCREEN_WIDTH / 2) {
                handlePrevious();
              } else {
                handleNext();
              }
            }}
            onLongPress={handleLongPressStart}
            onPressOut={handleLongPressEnd}
          >
            <Animated.View
              style={[
                styles.imageWrapper,
                {
                  transform: [
                    {
                      scale: glowAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.05],
                      }),
                    },
                  ],
                },
              ]}
            >
              {currentMomento.imagen_url ? (
                <Image
                  source={{ uri: currentMomento.imagen_url }}
                  style={styles.image}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <IconSymbol
                    ios_icon_name="photo"
                    android_material_icon_name="photo"
                    size={64}
                    color="#fff"
                  />
                </View>
              )}
              {paused && (
                <View style={styles.pausedOverlay}>
                  <View style={styles.glowEffect} />
                </View>
              )}
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* ✅ FIXED: Progress Bars - Positioned at the very top with highest z-index */}
        <View style={styles.progressContainer}>
          {momentos.map((_, index) => (
            <View key={index} style={styles.progressBarBackground}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: index < currentIndex 
                      ? '100%' 
                      : index === currentIndex
                      ? progressAnims[index]?.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        })
                      : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* ✅ FIXED: Header - Positioned below progress bars with lower z-index */}
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent']}
          style={styles.header}
        >
          <View style={styles.authorInfo}>
            {author?.avatar ? (
              <Image source={{ uri: author.avatar }} style={styles.authorAvatar} />
            ) : (
              <View style={styles.authorAvatarPlaceholder}>
                <IconSymbol
                  ios_icon_name={author?.tipo === 'local' ? 'building.2.fill' : 'person.fill'}
                  android_material_icon_name={author?.tipo === 'local' ? 'store' : 'person'}
                  size={20}
                  color="#fff"
                />
              </View>
            )}
            <Text style={styles.authorName}>{author?.nombre}</Text>
            <Text style={styles.timeAgo}>
              {getTimeAgo(currentMomento.created_at)}
            </Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <IconSymbol
              ios_icon_name="xmark"
              android_material_icon_name="close"
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        </LinearGradient>

        {/* Actions with more subtle icons (smaller size, reduced opacity) and WHITE delete icon */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)']}
          style={styles.actions}
        >
          <TouchableOpacity onPress={handleSendMessage} style={styles.actionButton}>
            <IconSymbol
              ios_icon_name="paperplane.fill"
              android_material_icon_name="send"
              size={20}
              color="rgba(255, 255, 255, 0.75)"
            />
            <Text style={styles.actionLabel}>Mensaje</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
            <IconSymbol
              ios_icon_name={currentMomento.user_has_liked ? 'heart.fill' : 'heart'}
              android_material_icon_name={currentMomento.user_has_liked ? 'favorite' : 'favorite_border'}
              size={20}
              color={currentMomento.user_has_liked ? '#FF3B30' : 'rgba(255, 255, 255, 0.75)'}
            />
            <Text style={styles.actionLabel}>
              {currentMomento.likes_count > 0 ? currentMomento.likes_count : 'Me gusta'}
            </Text>
          </TouchableOpacity>

          {isAuthor && (
            <TouchableOpacity onPress={handleShowStats} style={styles.actionButton}>
              <IconSymbol
                ios_icon_name="eye.fill"
                android_material_icon_name="visibility"
                size={20}
                color="rgba(255, 255, 255, 0.75)"
              />
              <Text style={styles.actionLabel}>{currentMomento.vistas_count}</Text>
            </TouchableOpacity>
          )}

          {isAuthor && (
            <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
              <IconSymbol
                ios_icon_name="trash.fill"
                android_material_icon_name="delete"
                size={20}
                color="rgba(255, 255, 255, 0.75)"
              />
              <Text style={styles.actionLabel}>Eliminar</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>

        {/* Stats Modal */}
        {showStats && (
          <View style={styles.statsModal}>
            <View style={styles.statsContent}>
              <View style={styles.statsHeader}>
                <Text style={styles.statsTitle}>Estadísticas</Text>
                <TouchableOpacity onPress={() => setShowStats(false)}>
                  <IconSymbol
                    ios_icon_name="xmark"
                    android_material_icon_name="close"
                    size={24}
                    color={colors.text}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.statsSection}>
                <Text style={styles.statsSectionTitle}>
                  Vistas ({viewers.length})
                </Text>
                {viewers.map((viewer: any, index: number) => (
                  <View key={index} style={styles.statsItem}>
                    {viewer.usuarios?.avatar ? (
                      <Image
                        source={{ uri: viewer.usuarios.avatar }}
                        style={styles.statsAvatar}
                      />
                    ) : (
                      <View style={styles.statsAvatarPlaceholder}>
                        <IconSymbol
                          ios_icon_name="person.fill"
                          android_material_icon_name="person"
                          size={16}
                          color={colors.primary}
                        />
                      </View>
                    )}
                    <Text style={styles.statsName}>{viewer.usuarios?.nombre}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.statsSection}>
                <Text style={styles.statsSectionTitle}>
                  Me gusta ({likers.length})
                </Text>
                {likers.map((liker: any, index: number) => (
                  <View key={index} style={styles.statsItem}>
                    {liker.usuarios?.avatar ? (
                      <Image
                        source={{ uri: liker.usuarios.avatar }}
                        style={styles.statsAvatar}
                      />
                    ) : (
                      <View style={styles.statsAvatarPlaceholder}>
                        <IconSymbol
                          ios_icon_name="person.fill"
                          android_material_icon_name="person"
                          size={16}
                          color={colors.primary}
                        />
                      </View>
                    )}
                    <Text style={styles.statsName}>{liker.usuarios?.nombre}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffHours >= 1) {
    return `${diffHours}h`;
  } else if (diffMinutes >= 1) {
    return `${diffMinutes}m`;
  } else {
    return 'Ahora';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
    fontFamily: 'System',
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageTouchable: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowEffect: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  // ✅ FIXED: Progress bars positioned at the very top with highest z-index
  progressContainer: {
    position: 'absolute',
    top: 50,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 4,
    zIndex: 300,
  },
  progressBarBackground: {
    flex: 1,
    height: PROGRESS_BAR_HEIGHT,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: PROGRESS_BAR_HEIGHT / 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: PROGRESS_BAR_HEIGHT / 2,
  },
  // ✅ FIXED: Header positioned below progress bars with lower z-index
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 200,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
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
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'System',
  },
  timeAgo: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'System',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 50,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 10,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.75)',
    fontFamily: 'System',
    fontWeight: '500',
  },
  statsModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
    zIndex: 20,
  },
  statsContent: {
    padding: 20,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    fontFamily: 'System',
  },
  statsSection: {
    marginBottom: 20,
  },
  statsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    fontFamily: 'System',
  },
  statsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  statsAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  statsAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsName: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'System',
  },
});
