
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Alert,
  Linking,
  Pressable,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import TarjetaLocal from '@/components/home/TarjetaLocal';
import { useMode } from '@/contexts/ModeContext';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, commonStyles } from '@/styles/commonStyles';

type UserMode = 'cliente' | 'propietario';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  addStoryButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.headerGradientEnd,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  profileStats: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  verificationBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  verificationGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  verificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationContent: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  verificationSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  verificationArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  actionButtonTextPrimary: {
    color: '#FFFFFF',
  },
  bioSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  bioText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  websiteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  websiteText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.background,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 1,
  },
  postItem: {
    width: (Dimensions.get('window').width - 2) / 3,
    height: (Dimensions.get('window').width - 2) / 3,
    padding: 1,
  },
  postImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBackground,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  localesContainer: {
    padding: 16,
  },
  storyViewerOverlay: {
    flex: 1,
    backgroundColor: '#000',
  },
  storyViewerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  storyProgressContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 16,
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
    backgroundColor: '#FFFFFF',
  },
  storyUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storyUserLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storyUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  storyUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  storyUserTime: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  storyCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  storyNavigation: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  storyNavButton: {
    flex: 1,
  },
  storyActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 40,
    flexDirection: 'row',
    gap: 12,
  },
  storyDeleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storyDeleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

function formatearFecha(fecha: string): string {
  const date = new Date(fecha);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `hace ${days}d`;
  if (hours > 0) return `hace ${hours}h`;
  if (minutes > 0) return `hace ${minutes}m`;
  return 'ahora';
}

export default function PerfilScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode } = useMode();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'locales'>('posts');
  const [posts, setPosts] = useState<any[]>([]);
  const [locales, setLocales] = useState<any[]>([]);
  const [seguidores, setSeguidores] = useState(0);
  const [seguidos, setSeguidos] = useState(0);
  const [historias, setHistorias] = useState<any[]>([]);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const storyProgress = useRef(new Animated.Value(0)).current;
  const storyTimer = useRef<NodeJS.Timeout | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<any>(null);

  const loadUserData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Load posts
      const { data: postsData } = await supabase
        .from('publicaciones')
        .select('*')
        .eq('autor_id', user.id)
        .order('created_at', { ascending: false });

      setPosts(postsData || []);

      // Load locales if propietario
      if (currentMode === 'propietario') {
        const { data: localesData } = await supabase
          .from('locales')
          .select('*')
          .eq('propietario_id', user.id)
          .order('created_at', { ascending: false });

        setLocales(localesData || []);
      }

      // Load historias
      const { data: historiasData } = await supabase
        .from('historias')
        .select('*')
        .eq('autor_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      setHistorias(historiasData || []);

      // Load verification status
      const { data: statusData } = await supabase
        .rpc('get_user_verification_status', { user_id: user.id });

      if (statusData && statusData.length > 0 && statusData[0].has_request) {
        setVerificationStatus(statusData[0]);
      }
    } catch (error) {
      console.error('[Perfil] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, currentMode]);

  const loadFollowerCounts = useCallback(async () => {
    if (!user) return;

    try {
      const { count: seguidoresCount } = await supabase
        .from('seguidores')
        .select('*', { count: 'exact', head: true })
        .eq('seguido_id', user.id);

      const { count: seguidosCount } = await supabase
        .from('seguidores')
        .select('*', { count: 'exact', head: true })
        .eq('seguidor_id', user.id);

      setSeguidores(seguidoresCount || 0);
      setSeguidos(seguidosCount || 0);
    } catch (error) {
      console.error('[Perfil] Error loading follower counts:', error);
    }
  }, [user]);

  useEffect(() => {
    loadUserData();
    loadFollowerCounts();
  }, [loadUserData, loadFollowerCounts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
    loadFollowerCounts();
  };

  const startStoryTimer = useCallback(() => {
    if (storyTimer.current) {
      clearInterval(storyTimer.current);
    }

    storyProgress.setValue(0);

    Animated.timing(storyProgress, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !isPaused) {
        handleNextStory();
      }
    });
  }, [isPaused, storyProgress]);

  const stopStoryTimer = useCallback(() => {
    if (storyTimer.current) {
      clearInterval(storyTimer.current);
      storyTimer.current = null;
    }
    storyProgress.stopAnimation();
  }, [storyProgress]);

  useEffect(() => {
    if (showStoryViewer && !isPaused) {
      startStoryTimer();
    } else {
      stopStoryTimer();
    }

    return () => stopStoryTimer();
  }, [showStoryViewer, currentStoryIndex, isPaused, startStoryTimer, stopStoryTimer]);

  const handlePreviousStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    } else {
      setShowStoryViewer(false);
    }
  };

  const handleNextStory = () => {
    if (currentStoryIndex < historias.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else {
      setShowStoryViewer(false);
    }
  };

  const togglePauseStory = () => {
    setIsPaused(!isPaused);
  };

  const handleDeleteStory = async () => {
    const historia = historias[currentStoryIndex];
    if (!historia) return;

    Alert.alert(
      'Eliminar Historia',
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
                .eq('id', historia.id);

              if (error) throw error;

              const newHistorias = historias.filter((h) => h.id !== historia.id);
              setHistorias(newHistorias);

              if (newHistorias.length === 0) {
                setShowStoryViewer(false);
              } else if (currentStoryIndex >= newHistorias.length) {
                setCurrentStoryIndex(newHistorias.length - 1);
              }

              Alert.alert('Éxito', 'Historia eliminada');
            } catch (error) {
              console.error('[Perfil] Error deleting story:', error);
              Alert.alert('Error', 'No se pudo eliminar la historia');
            }
          },
        },
      ]
    );
  };

  const handleCrearHistoria = () => {
    router.push('/crear/historia');
  };

  const handleCreatePress = () => {
    if (activeTab === 'posts') {
      router.push('/crear/publicacion');
    } else {
      router.push('/crear/local');
    }
  };

  const handleVerPost = (postId: string) => {
    router.push({
      pathname: '/social/post',
      params: { id: postId },
    });
  };

  const handleAvatarPress = () => {
    if (historias.length > 0) {
      setCurrentStoryIndex(0);
      setShowStoryViewer(true);
    }
  };

  const handleWebsitePress = () => {
    if (user?.sitio_web) {
      Linking.openURL(user.sitio_web);
    }
  };

  const getCurrentPosts = () => {
    return activeTab === 'posts' ? posts : [];
  };

  const getVerificationStatusColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return ['#F59E0B', '#F97316'];
      case 'en_revision':
        return ['#3B82F6', '#2563EB'];
      case 'documentacion_solicitada':
        return ['#8B5CF6', '#7C3AED'];
      case 'documentacion_recibida':
        return ['#10B981', '#059669'];
      case 'aprobada':
        return ['#10B981', '#059669'];
      case 'rechazada':
        return ['#EF4444', '#DC2626'];
      default:
        return [colors.primary, colors.primary];
    }
  };

  const getVerificationStatusLabel = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'Solicitud Recibida';
      case 'en_revision':
        return 'En Revisión';
      case 'documentacion_solicitada':
        return 'Documentación Solicitada';
      case 'documentacion_recibida':
        return 'Documentación Recibida';
      case 'aprobada':
        return 'Aprobada';
      case 'rechazada':
        return 'Rechazada';
      default:
        return estado;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <IconSymbol name="person.circle" size={64} color={colors.textSecondary} />
        <Text style={styles.loadingText}>Inicia sesión para ver tu perfil</Text>
        <TouchableOpacity
          style={{ marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
          onPress={() => router.push('/auth/login-popup')}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Perfil</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleCreatePress}
            >
              <IconSymbol name="plus" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/(tabs)/perfil/configuracion')}
            >
              <IconSymbol name="gearshape.fill" size={24} color={colors.headerText} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handleAvatarPress}>
            <Image
              source={{
                uri: user.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
              }}
              style={styles.avatar}
            />
            {historias.length === 0 && (
              <TouchableOpacity style={styles.addStoryButton} onPress={handleCrearHistoria}>
                <IconSymbol name="plus" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.nombre || 'Usuario'}</Text>
            <Text style={styles.profileUsername}>@{user.username || 'username'}</Text>
            <View style={styles.profileStats}>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => router.push('/perfil/seguidores')}
              >
                <Text style={styles.statValue}>{seguidores}</Text>
                <Text style={styles.statLabel}>Seguidores</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => router.push('/perfil/seguidos')}
              >
                <Text style={styles.statValue}>{seguidos}</Text>
                <Text style={styles.statLabel}>Seguidos</Text>
              </TouchableOpacity>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{posts.length}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Verification Status Banner */}
        {verificationStatus && verificationStatus.estado !== 'aprobada' && (
          <TouchableOpacity
            style={styles.verificationBanner}
            onPress={() => router.push('/auth/propietario-request-status')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={getVerificationStatusColor(verificationStatus.estado)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.verificationGradient}
            >
              <View style={styles.verificationIcon}>
                <IconSymbol name="clock.fill" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.verificationContent}>
                <Text style={styles.verificationTitle}>
                  {getVerificationStatusLabel(verificationStatus.estado)}
                </Text>
                <Text style={styles.verificationSubtitle}>
                  {verificationStatus.estado_detalle || 'Toca para ver más detalles'}
                </Text>
              </View>
              <View style={styles.verificationArrow}>
                <IconSymbol name="chevron.right" size={20} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={() => router.push('/editar/perfil')}
          >
            <IconSymbol name="pencil" size={18} color="#FFFFFF" />
            <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
              Editar Perfil
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/social/favoritos')}
          >
            <IconSymbol name="heart" size={18} color={colors.text} />
            <Text style={styles.actionButtonText}>Favoritos</Text>
          </TouchableOpacity>
        </View>

        {user.bio && (
          <View style={styles.bioSection}>
            <Text style={styles.bioText}>{user.bio}</Text>
            {user.sitio_web && (
              <TouchableOpacity style={styles.websiteLink} onPress={handleWebsitePress}>
                <IconSymbol name="link" size={16} color={colors.primary} />
                <Text style={styles.websiteText}>{user.sitio_web}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>
              Publicaciones
            </Text>
          </TouchableOpacity>
          {currentMode === 'propietario' && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'locales' && styles.tabActive]}
              onPress={() => setActiveTab('locales')}
            >
              <Text style={[styles.tabText, activeTab === 'locales' && styles.tabTextActive]}>
                Mis Locales
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {activeTab === 'posts' ? (
          posts.length > 0 ? (
            <View style={styles.postsGrid}>
              {posts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postItem}
                  onPress={() => handleVerPost(post.id)}
                >
                  <Image source={{ uri: post.imagen }} style={styles.postImage} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol name="photo.on.rectangle" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>
                Aún no has publicado nada.{'\n'}¡Comparte tu primera publicación!
              </Text>
            </View>
          )
        ) : (
          locales.length > 0 ? (
            <View style={styles.localesContainer}>
              {locales.map((local) => (
                <TarjetaLocal key={local.id} local={local} userLocation={null} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol name="building.2" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>
                No tienes locales registrados.{'\n'}¡Crea tu primer local!
              </Text>
            </View>
          )
        )}
      </ScrollView>

      {/* Story Viewer Modal */}
      <Modal
        visible={showStoryViewer}
        animationType="fade"
        onRequestClose={() => setShowStoryViewer(false)}
      >
        <View style={styles.storyViewerOverlay}>
          <View style={styles.storyViewerHeader}>
            <View style={styles.storyProgressContainer}>
              {historias.map((_, index) => (
                <View key={index} style={styles.storyProgressBar}>
                  {index === currentStoryIndex && (
                    <Animated.View
                      style={[
                        styles.storyProgressFill,
                        {
                          width: storyProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  )}
                  {index < currentStoryIndex && (
                    <View style={[styles.storyProgressFill, { width: '100%' }]} />
                  )}
                </View>
              ))}
            </View>

            <View style={styles.storyUserInfo}>
              <View style={styles.storyUserLeft}>
                <Image
                  source={{
                    uri: user.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
                  }}
                  style={styles.storyUserAvatar}
                />
                <View>
                  <Text style={styles.storyUserName}>{user.nombre}</Text>
                  <Text style={styles.storyUserTime}>
                    {historias[currentStoryIndex] &&
                      formatearFecha(historias[currentStoryIndex].created_at)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.storyCloseButton}
                onPress={() => setShowStoryViewer(false)}
              >
                <IconSymbol name="xmark" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <Pressable style={styles.storyContent} onPress={togglePauseStory}>
            {historias[currentStoryIndex] && (
              <Image
                source={{ uri: historias[currentStoryIndex].imagen }}
                style={styles.storyImage}
                resizeMode="contain"
              />
            )}
          </Pressable>

          <View style={styles.storyNavigation}>
            <TouchableOpacity style={styles.storyNavButton} onPress={handlePreviousStory} />
            <TouchableOpacity style={styles.storyNavButton} onPress={handleNextStory} />
          </View>

          <View style={styles.storyActions}>
            <TouchableOpacity style={styles.storyDeleteButton} onPress={handleDeleteStory}>
              <IconSymbol name="trash" size={20} color="#FFFFFF" />
              <Text style={styles.storyDeleteButtonText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
