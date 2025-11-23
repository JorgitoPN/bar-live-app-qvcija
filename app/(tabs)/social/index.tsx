
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import FeedSocial from '@/components/social/FeedSocial';
import BarraHistorias from '@/components/social/BarraHistorias';

const { width, height } = Dimensions.get('window');
const STORY_DURATION = 5000;

interface Historia {
  id: string;
  autor_id: string;
  tipo: 'usuario' | 'local';
  imagen: string;
  created_at: string;
  expires_at: string;
  local_id?: string;
  visto_por_usuario?: boolean;
  views_count?: number;
  likes_count?: number;
  liked_by_user?: boolean;
  autor?: {
    nombre: string;
    avatar?: string;
    username?: string;
  };
  local?: {
    nombre: string;
    imagen_url?: string;
  };
  autorNombre?: string;
  autorUsername?: string;
  autorAvatar?: string;
}

export default function SocialScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [historias, setHistorias] = useState<Historia[]>([]);
  const [loadingHistorias, setLoadingHistorias] = useState(true);

  // Story viewer state
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [currentStories, setCurrentStories] = useState<Historia[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [storyMessage, setStoryMessage] = useState('');
  const [progressBarWidth, setProgressBarWidth] = useState(0);

  const storyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const loadHistorias = useCallback(async () => {
    if (!user) {
      setLoadingHistorias(false);
      return;
    }

    try {
      console.log('[Social] Loading stories...');

      // Get all active stories (user + local)
      const { data: historiasData, error: historiasError } = await supabase
        .from('historias')
        .select(`
          id,
          autor_id,
          tipo,
          imagen,
          created_at,
          expires_at,
          local_id,
          usuarios:autor_id(nombre, avatar, username),
          locales:local_id(nombre, imagen_url)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (historiasError) {
        console.error('[Social] Error loading stories:', historiasError);
        return;
      }

      if (!historiasData || historiasData.length === 0) {
        console.log('[Social] No active stories found');
        setHistorias([]);
        return;
      }

      // Get story IDs
      const storyIds = historiasData.map(h => h.id);

      // Get views and likes for current user
      const [viewedData, viewsCountData, likesCountData, likedData] = await Promise.all([
        supabase
          .from('historia_views')
          .select('historia_id')
          .eq('usuario_id', user.id)
          .in('historia_id', storyIds),
        supabase
          .from('historia_views')
          .select('historia_id')
          .in('historia_id', storyIds),
        supabase
          .from('historia_likes')
          .select('historia_id')
          .in('historia_id', storyIds),
        supabase
          .from('historia_likes')
          .select('historia_id')
          .eq('usuario_id', user.id)
          .in('historia_id', storyIds),
      ]);

      const viewedStoryIds = new Set(viewedData.data?.map(v => v.historia_id) || []);
      const likedStoryIds = new Set(likedData.data?.map(l => l.historia_id) || []);

      const viewsCounts = viewsCountData.data?.reduce((acc, v) => {
        acc[v.historia_id] = (acc[v.historia_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const likesCounts = likesCountData.data?.reduce((acc, l) => {
        acc[l.historia_id] = (acc[l.historia_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Transform data
      const historiasConEstado = historiasData.map((h: any) => ({
        ...h,
        visto_por_usuario: viewedStoryIds.has(h.id),
        views_count: viewsCounts[h.id] || 0,
        likes_count: likesCounts[h.id] || 0,
        liked_by_user: likedStoryIds.has(h.id),
        autor: h.tipo === 'usuario' ? h.usuarios : h.locales,
        autorNombre: h.tipo === 'usuario' ? h.usuarios?.nombre : h.locales?.nombre,
        autorUsername: h.tipo === 'usuario' ? h.usuarios?.username : undefined,
        autorAvatar: h.tipo === 'usuario' ? h.usuarios?.avatar : h.locales?.imagen_url,
      }));

      console.log('[Social] ✅ Loaded', historiasConEstado.length, 'stories');
      setHistorias(historiasConEstado);
    } catch (error) {
      console.error('[Social] Error loading stories:', error);
    } finally {
      setLoadingHistorias(false);
    }
  }, [user]);

  useEffect(() => {
    loadHistorias();
  }, [loadHistorias]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistorias();
    setRefreshing(false);
  };

  const stopStoryTimer = useCallback(() => {
    if (storyTimerRef.current) {
      clearTimeout(storyTimerRef.current);
      storyTimerRef.current = null;
    }
    progressAnim.stopAnimation();
  }, [progressAnim]);

  const handleNextStory = useCallback(async () => {
    const currentStory = currentStories[currentStoryIndex];

    if (currentStory && user) {
      try {
        const { data: existingView } = await supabase
          .from('historia_views')
          .select('id')
          .eq('historia_id', currentStory.id)
          .eq('usuario_id', user.id)
          .single();

        if (!existingView) {
          await supabase.from('historia_views').insert({
            historia_id: currentStory.id,
            usuario_id: user.id,
          });
        }
      } catch (error) {
        console.error('[Social] Error marking story as viewed:', error);
      }
    }

    if (currentStoryIndex < currentStories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      progressAnim.setValue(0);
    } else {
      await loadHistorias();
      setShowStoryViewer(false);
      stopStoryTimer();
    }
  }, [currentStoryIndex, currentStories, stopStoryTimer, user, loadHistorias, progressAnim]);

  const startStoryTimer = useCallback(() => {
    if (storyTimerRef.current) {
      clearTimeout(storyTimerRef.current);
    }

    progressAnim.setValue(0);

    Animated.timing(progressAnim, {
      toValue: progressBarWidth,
      duration: STORY_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        handleNextStory();
      }
    });

    storyTimerRef.current = setTimeout(() => {
      handleNextStory();
    }, STORY_DURATION);
  }, [handleNextStory, progressAnim, progressBarWidth]);

  const handlePreviousStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      progressAnim.setValue(0);
      startStoryTimer();
    } else {
      setShowStoryViewer(false);
      stopStoryTimer();
    }
  }, [currentStoryIndex, startStoryTimer, stopStoryTimer, progressAnim]);

  const handleStoryLike = useCallback(async () => {
    const currentStory = currentStories[currentStoryIndex];

    if (!currentStory || !user) {
      Alert.alert('Error', 'Debes iniciar sesión para dar me gusta');
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

      setCurrentStories(prev => prev.map((s, i) =>
        i === currentStoryIndex
          ? { ...s, liked_by_user: !isLiked, likes_count: (s.likes_count || 0) + (isLiked ? -1 : 1) }
          : s
      ));
    } catch (error) {
      console.error('[Social] Error toggling story like:', error);
    }
  }, [user, currentStoryIndex, currentStories]);

  const handleSendStoryMessage = useCallback(async () => {
    const currentStory = currentStories[currentStoryIndex];

    if (!currentStory || !user || !storyMessage.trim()) {
      return;
    }

    try {
      console.log('[Social] Sending story message...');

      if (currentStory.tipo === 'local' && currentStory.local_id) {
        router.push(`/chat/conversacion?localId=${currentStory.local_id}&userId=${user.id}&storyId=${currentStory.id}&storyMessage=${encodeURIComponent(storyMessage)}`);
      } else {
        router.push(`/chat/conversacion?userId=${currentStory.autor_id}&storyId=${currentStory.id}&storyMessage=${encodeURIComponent(storyMessage)}`);
      }

      setStoryMessage('');
      setShowStoryViewer(false);
      stopStoryTimer();
    } catch (error) {
      console.error('[Social] Error sending story message:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
    }
  }, [user, currentStoryIndex, currentStories, storyMessage, router, stopStoryTimer]);

  const handleStoryAuthorPress = useCallback(() => {
    const currentStory = currentStories[currentStoryIndex];
    if (!currentStory) return;

    setShowStoryViewer(false);
    stopStoryTimer();

    if (currentStory.tipo === 'local' && currentStory.local_id) {
      router.push(`/perfil/local?localId=${currentStory.local_id}`);
    } else {
      if (user && currentStory.autor_id === user.id) {
        router.push('/(tabs)/perfil');
      } else {
        router.push(`/perfil/usuario?userId=${currentStory.autor_id}`);
      }
    }
  }, [currentStories, currentStoryIndex, router, stopStoryTimer, user]);

  const handleOpenStoryViewer = useCallback((historia: Historia) => {
    // Group stories by author
    const storiesByAuthor = historias.filter(h => h.autor_id === historia.autor_id);
    const startIndex = storiesByAuthor.findIndex(h => h.id === historia.id);
    
    setCurrentStories(storiesByAuthor);
    setCurrentStoryIndex(startIndex >= 0 ? startIndex : 0);
    setShowStoryViewer(true);
    setIsPaused(false);
    startStoryTimer();
  }, [historias, startStoryTimer]);

  useEffect(() => {
    if (showStoryViewer && !isPaused) {
      startStoryTimer();
    }
    return () => {
      stopStoryTimer();
    };
  }, [showStoryViewer, currentStoryIndex, isPaused, startStoryTimer, stopStoryTimer]);

  const currentStory = currentStories[currentStoryIndex];

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, progressBarWidth],
    outputRange: [-progressBarWidth, 0],
  });

  // Header component for FeedSocial
  const ListHeaderComponent = (
    <View>
      {loadingHistorias ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <BarraHistorias
          historias={historias}
          onHistoriaPress={handleOpenStoryViewer}
          onCrearHistoria={() => router.push('/crear/historia')}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Social</Text>
      </LinearGradient>

      <FeedSocial
        posts={[]}
        onRefresh={onRefresh}
        refreshing={refreshing}
        ListHeaderComponent={ListHeaderComponent}
      />

      <Modal
        visible={showStoryViewer}
        animationType="fade"
        onRequestClose={async () => {
          if (currentStory && user) {
            try {
              const { data: existingView } = await supabase
                .from('historia_views')
                .select('id')
                .eq('historia_id', currentStory.id)
                .eq('usuario_id', user.id)
                .single();

              if (!existingView) {
                await supabase.from('historia_views').insert({
                  historia_id: currentStory.id,
                  usuario_id: user.id,
                });
              }
            } catch (error) {
              console.error('[Social] Error marking story as viewed:', error);
            }
          }

          await loadHistorias();
          setShowStoryViewer(false);
          stopStoryTimer();
        }}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.storyViewerModal}>
            {currentStory && (
              <>
                <View style={styles.storyViewerHeader}>
                  <View
                    style={styles.storyProgressContainer}
                    onLayout={(e) => {
                      const { width: containerWidth } = e.nativeEvent.layout;
                      const barWidth = (containerWidth - (currentStories.length - 1) * 4) / currentStories.length;
                      setProgressBarWidth(barWidth);
                      console.log('[Social] 📐 Progress bar width:', barWidth);
                    }}
                  >
                    {currentStories.map((_, index) => (
                      <View key={index} style={styles.storyProgressBar}>
                        {index < currentStoryIndex && (
                          <View style={[styles.storyProgressFill, { width: '100%' }]} />
                        )}
                        {index === currentStoryIndex && progressBarWidth > 0 && (
                          <Animated.View
                            style={[
                              styles.storyProgressFill,
                              {
                                width: progressBarWidth,
                                transform: [{ translateX: progressWidth }]
                              }
                            ]}
                          />
                        )}
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.storyAutorInfo}
                    onPress={handleStoryAuthorPress}
                    activeOpacity={0.7}
                  >
                    {currentStory.autor?.avatar ? (
                      <Image source={{ uri: currentStory.autor.avatar }} style={styles.storyAutorAvatar} />
                    ) : (
                      <View style={[styles.storyAutorAvatar, styles.avatarPlaceholder]}>
                        <IconSymbol
                          ios_icon_name={currentStory.tipo === 'local' ? 'building.2' : 'person.fill'}
                          android_material_icon_name={currentStory.tipo === 'local' ? 'business' : 'person'}
                          size={18}
                          color={colors.headerText}
                        />
                      </View>
                    )}
                    <Text style={styles.storyAutorNombre}>{currentStory.autor?.nombre || 'Usuario'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.storyCloseButton}
                    onPress={async () => {
                      if (currentStory && user) {
                        try {
                          const { data: existingView } = await supabase
                            .from('historia_views')
                            .select('id')
                            .eq('historia_id', currentStory.id)
                            .eq('usuario_id', user.id)
                            .single();

                          if (!existingView) {
                            await supabase.from('historia_views').insert({
                              historia_id: currentStory.id,
                              usuario_id: user.id,
                            });
                          }
                        } catch (error) {
                          console.error('[Social] Error marking story as viewed:', error);
                        }
                      }

                      await loadHistorias();
                      setShowStoryViewer(false);
                      stopStoryTimer();
                    }}
                    activeOpacity={0.8}
                  >
                    <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <View style={styles.storyContent}>
                  <Image
                    source={{ uri: currentStory.imagen }}
                    style={styles.storyImage}
                    resizeMode="contain"
                  />
                </View>

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
                    onFocus={() => {
                      setIsPaused(true);
                      stopStoryTimer();
                    }}
                    onBlur={() => {
                      setIsPaused(false);
                      startStoryTimer();
                    }}
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

                <View style={styles.storyTouchZones}>
                  <Pressable
                    style={styles.storyTouchZone}
                    onPress={handlePreviousStory}
                  />
                  <Pressable
                    style={styles.storyTouchZone}
                    onPress={handleNextStory}
                  />
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
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
    paddingTop: 50,
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
    position: 'absolute',
    left: 0,
    top: 0,
  },
  storyAutorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  storyAutorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyAutorNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  storyCloseButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
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
  storyTouchZones: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  storyTouchZone: {
    flex: 1,
  },
});
