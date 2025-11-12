
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Pressable,
  Animated,
  Linking,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { supabase } from '@/utils/supabase';
import { getEstadoLocal, calcularTiempoHasta } from '@/utils/timeUtils';
import { getCategoryIcon } from '@/utils/categoryIcons';

const { width, height } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 3) / 3;

interface LocalPost {
  id: string;
  autor_id: string;
  tipo: string;
  imagen?: string;
  contenido?: string;
  local_id: string;
  likes: number;
  comentarios: number;
  created_at: string;
}

interface LocalStory {
  id: string;
  autor_id: string;
  tipo: string;
  imagen: string;
  local_id: string;
  created_at: string;
  expires_at: string;
  visto_por_usuario?: boolean;
  views_count?: number;
  likes_count?: number;
  liked_by_user?: boolean;
}

interface LocalEvent {
  id: string;
  titulo: string;
  descripcion?: string;
  fecha: string;
  hora: string;
  precio?: number;
  imagen_url?: string;
  local_id: string;
  destacado: boolean;
}

export default function LocalPerfilScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { 
    currentMode, 
    selectedLocalId, 
    setSelectedLocalId, 
    setCurrentMode, 
    isInteractingAsLocal, 
    setIsInteractingAsLocal,
    activeLocalProfileId,
    setActiveLocalProfileId,
    publicationMode,
    setPublicationMode,
  } = useMode();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [local, setLocal] = useState<any>(null);
  const [posts, setPosts] = useState<LocalPost[]>([]);
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [isFavorito, setIsFavorito] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'eventos' | 'info'>('posts');

  // Story viewer states
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [localStories, setLocalStories] = useState<LocalStory[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const storyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const localId = params.localId as string;

  const loadLocalData = useCallback(async () => {
    if (!localId) {
      router.back();
      return;
    }

    try {
      console.log('[LocalPerfil] ✅ Loading local data for:', localId);

      // Load local details
      const { data: localData, error: localError } = await supabase
        .from('locales')
        .select('*')
        .eq('id', localId)
        .single();

      if (localError || !localData) {
        console.error('[LocalPerfil] Error loading local:', localError);
        Alert.alert('Error', 'No se pudo cargar el perfil del local');
        router.back();
        return;
      }

      setLocal(localData);

      // Check if current user is the owner
      if (user && localData.propietario_id === user.id) {
        setIsOwner(true);
        
        // FIXED: Set this local as selected, switch to owner mode, and persist interaction
        console.log('[LocalPerfil] ✅ User is owner, setting local as active profile');
        await setSelectedLocalId(localId);
        await setCurrentMode('propietario');
        await setIsInteractingAsLocal(true);
        await setActiveLocalProfileId(localId);
        await setPublicationMode('local');
      } else {
        // User is viewing another local, don't change their mode
        console.log('[LocalPerfil] ✅ User is viewing another local');
      }

      // FIXED: Load local posts (ONLY posts with tipo='local' and matching local_id)
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('tipo', 'local')
        .eq('local_id', localId)
        .order('created_at', { ascending: false });

      if (!postsError) {
        console.log('[LocalPerfil] ✅ Loaded', postsData?.length || 0, 'posts for local');
        setPosts(postsData || []);
      } else {
        console.error('[LocalPerfil] Error loading posts:', postsError);
      }

      // Load local events
      const { data: eventsData, error: eventsError } = await supabase
        .from('eventos')
        .select('*')
        .eq('local_id', localId)
        .eq('activo', true)
        .gte('fecha', new Date().toISOString().split('T')[0])
        .order('fecha', { ascending: true })
        .limit(6);

      if (!eventsError) {
        setEvents(eventsData || []);
      }

      // FIXED: Load local stories (ONLY stories with tipo='local' and matching local_id)
      const { data: storiesData } = await supabase
        .from('historias')
        .select('*')
        .eq('tipo', 'local')
        .eq('local_id', localId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (storiesData && user) {
        console.log('[LocalPerfil] ✅ Loaded', storiesData.length, 'stories for local');
        const storyIds = storiesData.map(s => s.id);
        
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

        const storiesWithStatus = storiesData.map(story => ({
          ...story,
          visto_por_usuario: viewedStoryIds.has(story.id),
          views_count: viewsCounts[story.id] || 0,
          likes_count: likesCounts[story.id] || 0,
          liked_by_user: likedStoryIds.has(story.id),
        }));

        setLocalStories(storiesWithStatus);
      } else if (storiesData) {
        setLocalStories(storiesData);
      }

      // Check if user has favorited this local
      if (user) {
        const { data: favData } = await supabase
          .from('locales_favoritos')
          .select('id')
          .eq('usuario_id', user.id)
          .eq('local_id', localId)
          .single();

        setIsFavorito(!!favData);
      }

      console.log('[LocalPerfil] ✅ Local data loaded successfully');
    } catch (error) {
      console.error('[LocalPerfil] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [localId, user, router, setSelectedLocalId, setCurrentMode, setIsInteractingAsLocal, setActiveLocalProfileId, setPublicationMode]);

  useEffect(() => {
    loadLocalData();

    // Don't reset interaction state when unmounting
    // The interaction state should persist until the user explicitly leaves the local profile
    return () => {
      console.log('[LocalPerfil] Component unmounting, keeping interaction state');
    };
  }, [loadLocalData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLocalData();
    setRefreshing(false);
  };

  const toggleFavorito = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para seguir locales');
      return;
    }

    try {
      if (isFavorito) {
        await supabase
          .from('locales_favoritos')
          .delete()
          .eq('usuario_id', user.id)
          .eq('local_id', localId);
        setIsFavorito(false);
        
        // Update local state
        if (local) {
          setLocal({
            ...local,
            seguidores: Math.max(0, (local.seguidores || 0) - 1),
          });
        }
      } else {
        await supabase
          .from('locales_favoritos')
          .insert({
            usuario_id: user.id,
            local_id: localId,
          });
        setIsFavorito(true);
        
        // Update local state
        if (local) {
          setLocal({
            ...local,
            seguidores: (local.seguidores || 0) + 1,
          });
        }
      }
    } catch (error) {
      console.error('[LocalPerfil] Error toggling favorito:', error);
      Alert.alert('Error', 'No se pudo completar la acción');
    }
  };

  const handleComoLlegar = () => {
    if (local?.latitud && local?.longitud) {
      const url = Platform.select({
        ios: `maps://app?daddr=${local.latitud},${local.longitud}`,
        android: `google.navigation:q=${local.latitud},${local.longitud}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${local.latitud},${local.longitud}`,
      });
      Linking.openURL(url);
    }
  };

  const handleLlamar = () => {
    if (local?.telefono) {
      Linking.openURL(`tel:${local.telefono}`);
    }
  };

  const handleWeb = () => {
    if (local?.website) {
      Linking.openURL(local.website);
    }
  };

  const handleSalaVirtual = () => {
    router.push(`/detalle/sala-virtual?id=${localId}`);
  };

  const handleVerPost = (postId: string) => {
    router.push(`/social/post?id=${postId}`);
  };

  const handleVerEvento = (eventoId: string) => {
    router.push(`/detalle/evento?id=${eventoId}`);
  };

  const handleCrearPost = () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión');
      return;
    }
    if (!isOwner) {
      Alert.alert('Error', 'Solo el propietario puede crear publicaciones');
      return;
    }
    router.push(`/crear/publicacion?localId=${localId}`);
  };

  const handleCrearHistoria = () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión');
      return;
    }
    if (!isOwner) {
      Alert.alert('Error', 'Solo el propietario puede crear historias');
      return;
    }
    router.push(`/crear/historia?localId=${localId}`);
  };

  const handleCrearEvento = () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión');
      return;
    }
    if (!isOwner) {
      Alert.alert('Error', 'Solo el propietario puede crear eventos');
      return;
    }
    router.push(`/crear/evento?localId=${localId}`);
  };

  const handleEditarLocal = () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión');
      return;
    }
    if (!isOwner) {
      Alert.alert('Error', 'Solo el propietario puede editar el local');
      return;
    }
    router.push(`/editar/local?id=${localId}`);
  };

  // Story viewer functions
  const stopStoryTimer = useCallback(() => {
    if (storyTimerRef.current) {
      clearTimeout(storyTimerRef.current);
      storyTimerRef.current = null;
    }
    progressAnim.stopAnimation();
  }, [progressAnim]);

  const handleNextStory = useCallback(async () => {
    const currentStory = localStories[currentStoryIndex];
    
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
        console.error('[LocalPerfil] Error marking story as viewed:', error);
      }
    }
    
    if (currentStoryIndex < localStories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      progressAnim.setValue(0);
    } else {
      await loadLocalData();
      setShowStoryViewer(false);
      stopStoryTimer();
    }
  }, [currentStoryIndex, localStories, stopStoryTimer, user, loadLocalData, progressAnim]);

  const startStoryTimer = useCallback(() => {
    if (storyTimerRef.current) {
      clearTimeout(storyTimerRef.current);
    }

    progressAnim.setValue(0);

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false,
    }).start();

    storyTimerRef.current = setTimeout(() => {
      handleNextStory();
    }, 5000);
  }, [handleNextStory, progressAnim]);

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

  const handleAvatarPress = useCallback(() => {
    if (localStories.length > 0) {
      setCurrentStoryIndex(0);
      setShowStoryViewer(true);
      setIsPaused(false);
      startStoryTimer();
    } else if (isOwner) {
      handleCrearHistoria();
    }
  }, [localStories, startStoryTimer, isOwner]);

  useEffect(() => {
    if (showStoryViewer && !isPaused) {
      startStoryTimer();
    }
    return () => {
      stopStoryTimer();
    };
  }, [showStoryViewer, currentStoryIndex, isPaused, startStoryTimer, stopStoryTimer]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Cargando perfil del local...</Text>
      </View>
    );
  }

  if (!local) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>Local no encontrado</Text>
      </View>
    );
  }

  const estado = getEstadoLocal(local);
  const hasActiveStory = localStories.length > 0;
  const hasUnviewedStories = localStories.some(s => !s.visto_por_usuario);
  const currentStory = localStories[currentStoryIndex];

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Get categories
  let categoriasLocal = local.barlive_types || [];
  if (categoriasLocal.length === 0 && local.barlive_type) {
    categoriasLocal = [local.barlive_type];
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          {/* FIXED: Back button with contrasting color */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{local.nombre}</Text>
          <TouchableOpacity onPress={toggleFavorito} style={styles.headerButton}>
            <IconSymbol
              name={isFavorito ? 'heart.fill' : 'heart'}
              size={24}
              color={isFavorito ? '#EF4444' : colors.headerText}
            />
          </TouchableOpacity>
        </View>

        {/* Local Profile Section */}
        <View style={styles.profileSection}>
          {/* Avatar with story ring */}
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={handleAvatarPress}
            activeOpacity={0.7}
          >
            {hasActiveStory && hasUnviewedStories && (
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.storyRing}
              />
            )}
            {local.imagen_url ? (
              <Image source={{ uri: local.imagen_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <IconSymbol name="building.2" size={40} color={colors.headerText} />
              </View>
            )}
            {!hasActiveStory && isOwner && (
              <View style={styles.addStoryIcon}>
                <IconSymbol name="plus" size={18} color={colors.white} />
              </View>
            )}
          </TouchableOpacity>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{posts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{local.seguidores || 0}</Text>
              <Text style={styles.statLabel}>Seguidores</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{events.length}</Text>
              <Text style={styles.statLabel}>Eventos</Text>
            </View>
          </View>
        </View>

        {/* Local Info */}
        <View style={styles.localInfo}>
          <Text style={styles.localName}>{local.nombre}</Text>
          
          {/* Categories */}
          {categoriasLocal.length > 0 && (
            <View style={styles.categoriesContainer}>
              {categoriasLocal.slice(0, 3).map((categoria: string, index: number) => (
                <View key={index} style={styles.categoryBadge}>
                  <Text style={styles.categoryIcon}>{getCategoryIcon(categoria)}</Text>
                  <Text style={styles.categoryText}>{categoria}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: estado.estaAbierto ? '#22C55E' : '#EF4444' }]}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{estado.badge}</Text>
          </View>

          {/* Address */}
          {local.direccion && (
            <View style={styles.addressContainer}>
              <IconSymbol name="mappin" size={16} color={colors.headerText} />
              <Text style={styles.addressText}>{local.direccion}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {isOwner ? (
            <>
              <TouchableOpacity style={styles.actionButton} onPress={handleEditarLocal}>
                <IconSymbol name="pencil" size={18} color={colors.headerText} />
                <Text style={styles.actionButtonText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleCrearPost}>
                <IconSymbol name="plus.circle" size={18} color={colors.headerText} />
                <Text style={styles.actionButtonText}>Post</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleCrearEvento}>
                <IconSymbol name="calendar.badge.plus" size={18} color={colors.headerText} />
                <Text style={styles.actionButtonText}>Evento</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, isFavorito && styles.actionButtonFollowing]} 
                onPress={toggleFavorito}
              >
                <IconSymbol 
                  name={isFavorito ? 'heart.fill' : 'heart'} 
                  size={18} 
                  color={colors.headerText} 
                />
                <Text style={styles.actionButtonText}>
                  {isFavorito ? 'Siguiendo' : 'Seguir'}
                </Text>
              </TouchableOpacity>
              {local.telefono && (
                <TouchableOpacity style={styles.actionButton} onPress={handleLlamar}>
                  <IconSymbol name="phone.fill" size={18} color={colors.headerText} />
                  <Text style={styles.actionButtonText}>Llamar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.actionButton} onPress={handleComoLlegar}>
                <IconSymbol name="map.fill" size={18} color={colors.headerText} />
                <Text style={styles.actionButtonText}>Cómo llegar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => setActiveTab('posts')}
        >
          <IconSymbol 
            name="square.grid.3x3" 
            size={24} 
            color={activeTab === 'posts' ? colors.primary : colors.textSecondary} 
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'eventos' && styles.tabActive]}
          onPress={() => setActiveTab('eventos')}
        >
          <IconSymbol 
            name="calendar" 
            size={24} 
            color={activeTab === 'eventos' ? colors.primary : colors.textSecondary} 
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'info' && styles.tabActive]}
          onPress={() => setActiveTab('info')}
        >
          <IconSymbol 
            name="info.circle" 
            size={24} 
            color={activeTab === 'info' ? colors.primary : colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'posts' && (
          <View style={styles.postsGrid}>
            {posts.length > 0 ? (
              posts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.gridItem}
                  onPress={() => handleVerPost(post.id)}
                  activeOpacity={0.9}
                >
                  {post.imagen ? (
                    <Image source={{ uri: post.imagen }} style={styles.gridImage} />
                  ) : (
                    <View style={[styles.gridImage, styles.gridImagePlaceholder]}>
                      <IconSymbol name="photo" size={32} color={colors.textSecondary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <IconSymbol name="photo.on.rectangle" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>
                  {isOwner ? 'Crea tu primera publicación' : 'No hay publicaciones'}
                </Text>
                {isOwner && (
                  <TouchableOpacity style={styles.emptyButton} onPress={handleCrearPost}>
                    <Text style={styles.emptyButtonText}>Crear Publicación</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {activeTab === 'eventos' && (
          <View style={styles.eventsContainer}>
            {events.length > 0 ? (
              events.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={styles.eventCard}
                  onPress={() => handleVerEvento(event.id)}
                  activeOpacity={0.7}
                >
                  {event.imagen_url && (
                    <Image source={{ uri: event.imagen_url }} style={styles.eventImage} />
                  )}
                  <View style={styles.eventContent}>
                    <Text style={styles.eventTitle}>{event.titulo}</Text>
                    <View style={styles.eventMeta}>
                      <IconSymbol name="calendar" size={14} color={colors.textSecondary} />
                      <Text style={styles.eventMetaText}>
                        {new Date(event.fecha).toLocaleDateString('es-ES', { 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                      </Text>
                      <IconSymbol name="clock" size={14} color={colors.textSecondary} />
                      <Text style={styles.eventMetaText}>{event.hora}</Text>
                    </View>
                    {event.precio !== null && event.precio !== undefined && (
                      <Text style={styles.eventPrice}>
                        {event.precio === 0 ? 'Gratis' : `${event.precio}€`}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <IconSymbol name="calendar" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>
                  {isOwner ? 'Crea tu primer evento' : 'No hay eventos próximos'}
                </Text>
                {isOwner && (
                  <TouchableOpacity style={styles.emptyButton} onPress={handleCrearEvento}>
                    <Text style={styles.emptyButtonText}>Crear Evento</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {activeTab === 'info' && (
          <View style={styles.infoContainer}>
            {/* Description */}
            {local.descripcion_google && (
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Descripción</Text>
                <Text style={styles.infoText}>{local.descripcion_google}</Text>
              </View>
            )}

            {/* Contact Info */}
            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>Contacto</Text>
              {local.telefono && (
                <TouchableOpacity style={styles.infoRow} onPress={handleLlamar}>
                  <IconSymbol name="phone.fill" size={20} color={colors.primary} />
                  <Text style={styles.infoRowText}>{local.telefono}</Text>
                </TouchableOpacity>
              )}
              {local.email && (
                <View style={styles.infoRow}>
                  <IconSymbol name="envelope.fill" size={20} color={colors.primary} />
                  <Text style={styles.infoRowText}>{local.email}</Text>
                </View>
              )}
              {local.website && (
                <TouchableOpacity style={styles.infoRow} onPress={handleWeb}>
                  <IconSymbol name="globe" size={20} color={colors.primary} />
                  <Text style={styles.infoRowText}>{local.website}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Opening Hours */}
            {local.horarios_completos && Object.keys(local.horarios_completos).length > 0 && (
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Horarios</Text>
                {Object.entries(local.horarios_completos).map(([dia, horas]: [string, any]) => (
                  <View key={dia} style={styles.horarioRow}>
                    <Text style={styles.horarioDia}>{dia.charAt(0).toUpperCase() + dia.slice(1)}</Text>
                    <Text style={styles.horarioHoras}>
                      {Array.isArray(horas) ? horas.join(', ') : horas}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Services */}
            {local.servicios_disponibles && Object.keys(local.servicios_disponibles).length > 0 && (
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Servicios</Text>
                <View style={styles.servicesGrid}>
                  {Object.entries(local.servicios_disponibles)
                    .filter(([_, value]) => value === true)
                    .map(([key]) => (
                      <View key={key} style={styles.serviceBadge}>
                        <Text style={styles.serviceText}>
                          {key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.replace(/_/g, ' ').slice(1)}
                        </Text>
                      </View>
                    ))}
                </View>
              </View>
            )}

            {/* Distance & Directions */}
            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>Ubicación</Text>
              <TouchableOpacity style={styles.directionsButton} onPress={handleComoLlegar}>
                <IconSymbol name="map.fill" size={20} color={colors.white} />
                <Text style={styles.directionsButtonText}>Cómo llegar</Text>
              </TouchableOpacity>
            </View>

            {/* Virtual Room */}
            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>Sala Virtual</Text>
              <TouchableOpacity style={styles.virtualRoomButton} onPress={handleSalaVirtual}>
                <IconSymbol name="person.3.fill" size={20} color={colors.white} />
                <Text style={styles.virtualRoomButtonText}>Entrar a la Sala Virtual</Text>
              </TouchableOpacity>
            </View>

            {/* More Info */}
            <View style={styles.infoSection}>
              <TouchableOpacity 
                style={styles.moreInfoButton} 
                onPress={() => router.push(`/detalle/local?id=${localId}`)}
              >
                <IconSymbol name="info.circle.fill" size={20} color={colors.primary} />
                <Text style={styles.moreInfoButtonText}>Ver información completa</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Story Viewer Modal */}
      <Modal
        visible={showStoryViewer}
        animationType="fade"
        onRequestClose={async () => {
          const currentStory = localStories[currentStoryIndex];
          
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
              console.error('[LocalPerfil] Error marking story as viewed on modal close:', error);
            }
          }
          
          await loadLocalData();
          setShowStoryViewer(false);
          stopStoryTimer();
        }}
      >
        <View style={styles.storyViewerModal}>
          {currentStory && (
            <>
              <View style={styles.storyViewerHeader}>
                <View style={styles.storyProgressContainer}>
                  {localStories.map((_, index) => (
                    <View key={index} style={styles.storyProgressBar}>
                      {index < currentStoryIndex && (
                        <View style={[styles.storyProgressFill, { width: '100%' }]} />
                      )}
                      {index === currentStoryIndex && (
                        <Animated.View
                          style={[styles.storyProgressFill, { width: progressWidth }]}
                        />
                      )}
                    </View>
                  ))}
                </View>

                <View style={styles.storyAutorInfo}>
                  {local.imagen_url ? (
                    <Image source={{ uri: local.imagen_url }} style={styles.storyAutorAvatar} />
                  ) : (
                    <View style={[styles.storyAutorAvatar, styles.avatarPlaceholder]}>
                      <IconSymbol name="building.2" size={18} color={colors.headerText} />
                    </View>
                  )}
                  <Text style={styles.storyAutorNombre}>{local.nombre}</Text>
                  <TouchableOpacity
                    style={styles.storyCloseButton}
                    onPress={async () => {
                      const currentStory = localStories[currentStoryIndex];
                      
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
                          console.error('[LocalPerfil] Error marking story as viewed on close:', error);
                        }
                      }
                      
                      await loadLocalData();
                      setShowStoryViewer(false);
                      stopStoryTimer();
                    }}
                    activeOpacity={0.7}
                  >
                    <IconSymbol name="xmark" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.storyContent}>
                <Image
                  source={{ uri: currentStory.imagen }}
                  style={styles.storyImage}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.storyTouchZones}>
                <Pressable
                  style={styles.storyTouchZone}
                  onPress={handlePreviousStory}
                />
                <Pressable
                  style={styles.storyTouchZone}
                  onPressIn={() => {
                    setIsPaused(true);
                    stopStoryTimer();
                  }}
                  onPressOut={() => {
                    setIsPaused(false);
                    startStoryTimer();
                  }}
                />
                <Pressable
                  style={styles.storyTouchZone}
                  onPress={handleNextStory}
                />
              </View>
            </>
          )}
        </View>
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
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  headerButton: {
    padding: 8,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 20,
  },
  storyRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 48,
    zIndex: 0,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: colors.headerText,
    zIndex: 1,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addStoryIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.headerGradientStart,
    zIndex: 2,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  localInfo: {
    paddingHorizontal: 0,
    marginBottom: 16,
  },
  localName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 8,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  categoryIcon: {
    fontSize: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.headerText,
    textTransform: 'capitalize',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.headerText,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.headerText,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  actionButtonFollowing: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.headerText,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  content: {
    flex: 1,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    backgroundColor: colors.cardBorder,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
  },
  gridImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    width: '100%',
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  eventsContainer: {
    padding: 16,
    gap: 16,
  },
  eventCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  eventImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.cardBorder,
  },
  eventContent: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  eventMetaText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  eventPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  infoContainer: {
    padding: 16,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  infoRowText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  horarioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  horarioDia: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  horarioHoras: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  serviceText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  directionsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  virtualRoomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  virtualRoomButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  moreInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  moreInfoButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
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
  storyAutorNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  storyCloseButton: {
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
