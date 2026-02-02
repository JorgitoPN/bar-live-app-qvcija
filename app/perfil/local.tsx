
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
  Animated,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { getEstadoLocal } from '@/utils/timeUtils';
import { getCategoryIcon } from '@/utils/categoryIcons';
import MomentoViewer from '@/components/momento/MomentoViewer';
import PostViewerModal from '@/components/social/PostViewerModal';
import UnifiedMomentoAvatar from '@/components/common/UnifiedMomentoAvatar';
import { scaleFontSize } from '@/utils/androidScaling';
import { formatFollowersCount } from '@/utils/formatters';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 4) / 3;

/**
 * ✅ STANDALONE LOCAL PROFILE v113.0 - UNIFIED DESIGN
 * 
 * NEW CHANGES v113.0:
 * - ✅ IMPROVED: Applied same design as user profile page
 * - ✅ IMPROVED: Unified momento avatar with same size (96px)
 * - ✅ IMPROVED: Same counter layout and formatting (Instagram-style)
 * - ✅ FIXED: Removed excessive top margin in tab menu (marginTop: 0)
 * - ✅ IMPROVED: Consistent visual hierarchy and spacing
 */

export default function LocalPerfilStandaloneScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user: currentUser } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [local, setLocal] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showMomentoViewer, setShowMomentoViewer] = useState(false);
  const [stats, setStats] = useState({
    posts: 0,
    seguidores: 0,
    seguidos: 0,
  });

  const [showPostViewer, setShowPostViewer] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [allPostIds, setAllPostIds] = useState<string[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const isTogglingFollow = useRef(false);
  const hasLoadedOnce = useRef(false);

  const localId = params.localId as string;

  const loadLocalData = useCallback(async (silent: boolean = false) => {
    if (!localId) {
      router.back();
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
      }

      const { data: localData, error: localError } = await supabase
        .from('locales')
        .select('*')
        .eq('id', localId)
        .single();

      if (localError || !localData) {
        console.error('[LocalPerfilStandalone v113.0] Error loading local:', localError);
        if (!silent) {
          Alert.alert('Error', 'No se pudo cargar el perfil del local');
          router.back();
        }
        return;
      }

      setLocal(localData);

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('tipo', 'local')
        .eq('local_id', localId)
        .order('created_at', { ascending: false });

      if (!postsError && postsData) {
        setPosts(postsData);
      }

      const { count: followersCount } = await supabase
        .from('seguidores')
        .select('*', { count: 'exact', head: true })
        .eq('seguido_id', localData.propietario_id);

      const { count: followingCount } = await supabase
        .from('seguidores')
        .select('*', { count: 'exact', head: true })
        .eq('seguidor_id', localData.propietario_id);

      const newStats = {
        posts: postsData?.length || 0,
        seguidores: followersCount || 0,
        seguidos: followingCount || 0,
      };

      setStats(newStats);

      if (currentUser) {
        const { data: followData } = await supabase
          .from('seguidores')
          .select('id')
          .eq('seguidor_id', currentUser.id)
          .eq('seguido_id', localData.propietario_id)
          .single();

        setIsFollowing(!!followData);
      }

      hasLoadedOnce.current = true;
    } catch (error) {
      console.error('[LocalPerfilStandalone v113.0] Error loading data:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [localId, currentUser, router]);

  useFocusEffect(
    useCallback(() => {
      console.log('[LocalPerfilStandalone v113.0] ⚡ Screen focused');
      
      if (!hasLoadedOnce.current) {
        loadLocalData(false);
      } else {
        console.log('[LocalPerfilStandalone v113.0] 🔄 Background refresh...');
        loadLocalData(true);
      }
      
      return () => {
        console.log('[LocalPerfilStandalone v113.0] Screen unfocused');
      };
    }, [loadLocalData])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLocalData(false);
    setRefreshing(false);
  };

  const handleFollow = useCallback(async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Debes iniciar sesión para seguir locales');
      return;
    }

    if (!local?.propietario_id) {
      Alert.alert('Error', 'No se puede seguir este local');
      return;
    }

    if (isTogglingFollow.current) {
      return;
    }

    isTogglingFollow.current = true;

    const wasFollowing = isFollowing;
    const previousSeguidores = stats.seguidores;

    try {
      setIsFollowing(!wasFollowing);
      setStats(prev => ({
        ...prev,
        seguidores: wasFollowing ? Math.max(0, prev.seguidores - 1) : prev.seguidores + 1,
      }));

      if (wasFollowing) {
        const { error: deleteError } = await supabase
          .from('seguidores')
          .delete()
          .eq('seguidor_id', currentUser.id)
          .eq('seguido_id', local.propietario_id);

        if (deleteError) throw deleteError;
      } else {
        const { data: existingFollow } = await supabase
          .from('seguidores')
          .select('id')
          .eq('seguidor_id', currentUser.id)
          .eq('seguido_id', local.propietario_id)
          .single();

        if (existingFollow) {
          isTogglingFollow.current = false;
          return;
        }

        const { error: insertError } = await supabase
          .from('seguidores')
          .insert({
            seguidor_id: currentUser.id,
            seguido_id: local.propietario_id,
          });

        if (insertError) throw insertError;

        await supabase
          .from('notificaciones')
          .insert({
            usuario_id: local.propietario_id,
            tipo: 'seguidor',
            titulo: 'Nuevo seguidor',
            mensaje: `${currentUser.nombre} ha comenzado a seguir tu local ${local.nombre}`,
            usuario_origen_id: currentUser.id,
          });
      }

      const { count: updatedFollowersCount } = await supabase
        .from('seguidores')
        .select('*', { count: 'exact', head: true })
        .eq('seguido_id', local.propietario_id);

      setStats(prev => ({
        ...prev,
        seguidores: updatedFollowersCount || 0,
      }));
    } catch (error) {
      console.error('[LocalPerfilStandalone v113.0] Error toggling follow:', error);
      
      setIsFollowing(wasFollowing);
      setStats(prev => ({
        ...prev,
        seguidores: previousSeguidores,
      }));
      
      Alert.alert('Error', 'No se pudo completar la acción. Por favor, intenta de nuevo.');
    } finally {
      isTogglingFollow.current = false;
    }
  }, [currentUser, isFollowing, stats.seguidores, local]);

  const handleMessage = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Debes iniciar sesión para enviar mensajes');
      return;
    }

    if (!local?.propietario_id) {
      Alert.alert('Error', 'No se puede enviar mensaje a este local');
      return;
    }

    router.push(`/chat/conversacion?localId=${localId}&userId=${currentUser.id}`);
  };

  const handleVerPost = (postId: string) => {
    const postIds = posts.map(p => p.id);
    
    setSelectedPostId(postId);
    setAllPostIds(postIds);
    setShowPostViewer(true);
  };

  const handleOpenMomentoViewer = () => {
    if (!localId) return;
    setShowMomentoViewer(true);
  };

  const handleSeguidores = () => {
    router.push(`/perfil/seguidores?localId=${localId}`);
  };

  const handleSeguidos = () => {
    router.push(`/perfil/seguidos?localId=${localId}`);
  };

  if (loading && !local) {
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

  let categoriasLocal = local.barlive_types || [];
  if (categoriasLocal.length === 0 && local.barlive_type) {
    categoriasLocal = [local.barlive_type];
  }

  const seguidoresFormatted = formatFollowersCount(stats.seguidores);
  const seguidosFormatted = formatFollowersCount(stats.seguidos);
  const publicacionesFormatted = formatFollowersCount(stats.posts);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.scrollableHeader}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
          </View>
        </LinearGradient>

        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.profileHeaderGradient}
        >
          <Animated.View 
            style={[
              styles.profileSection,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              }
            ]}
          >
            <View style={styles.profileHeader}>
              <UnifiedMomentoAvatar
                localId={localId}
                imageUrl={local.imagen_url}
                size={96}
                showAddButton={false}
                isOwner={false}
                onPress={handleOpenMomentoViewer}
              />
              
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { fontSize: scaleFontSize(22) }]}>{local.nombre}</Text>
                {local.username && (
                  <Text style={[styles.profileUsername, { fontSize: scaleFontSize(15) }]}>@{local.username}</Text>
                )}
                {categoriasLocal.length > 0 && (
                  <View style={styles.categoriesContainer}>
                    {categoriasLocal.slice(0, 2).map((categoria: string, index: number) => (
                      <View key={index} style={styles.categoryBadge}>
                        <Text style={[styles.categoryIcon, { fontSize: scaleFontSize(12) }]}>{getCategoryIcon(categoria)}</Text>
                        <Text style={[styles.categoryText, { fontSize: scaleFontSize(12) }]}>{categoria}</Text>
                      </View>
                    ))}
                  </View>
                )}
                
                <View style={styles.statsContainerCompact}>
                  <View style={styles.statItemCompact}>
                    <Text style={[styles.statNumberCompact, { fontSize: scaleFontSize(18) }]}>{publicacionesFormatted}</Text>
                    <Text style={[styles.statLabelCompact, { fontSize: scaleFontSize(13) }]}>publicaciones</Text>
                  </View>
                  <TouchableOpacity style={styles.statItemCompact} onPress={handleSeguidores}>
                    <Text style={[styles.statNumberCompact, { fontSize: scaleFontSize(18) }]}>{seguidoresFormatted}</Text>
                    <Text style={[styles.statLabelCompact, { fontSize: scaleFontSize(13) }]}>seguidores</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.statItemCompact} onPress={handleSeguidos}>
                    <Text style={[styles.statNumberCompact, { fontSize: scaleFontSize(18) }]}>{seguidosFormatted}</Text>
                    <Text style={[styles.statLabelCompact, { fontSize: scaleFontSize(13) }]}>siguiendo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {local.direccion && (
              <View style={styles.addressContainer}>
                <IconSymbol ios_icon_name="mappin" android_material_icon_name="location_on" size={14} color={colors.headerText} />
                <Text style={[styles.addressText, { fontSize: scaleFontSize(14) }]}>{local.direccion}</Text>
              </View>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, isFollowing && styles.actionButtonFollowing]}
                onPress={handleFollow}
                disabled={isTogglingFollow.current}
              >
                <IconSymbol 
                  ios_icon_name={isFollowing ? 'person.fill.checkmark' : 'person.badge.plus'} 
                  android_material_icon_name={isFollowing ? 'person_add_disabled' : 'person_add'}
                  size={18} 
                  color={colors.headerText} 
                />
                <Text style={[styles.actionButtonText, { fontSize: scaleFontSize(15) }]}>
                  {isFollowing ? 'Siguiendo' : 'Seguir'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
                <IconSymbol ios_icon_name="message.fill" android_material_icon_name="message" size={18} color={colors.headerText} />
                <Text style={[styles.actionButtonText, { fontSize: scaleFontSize(15) }]}>Mensaje</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </LinearGradient>

        {/* ✅ FIX v113.0: Removed excessive marginTop - tabs now directly follow profile section */}
        <View style={styles.tabsContainer}>
          <View style={styles.tab}>
            <IconSymbol 
              ios_icon_name="square.grid.3x3" 
              android_material_icon_name="grid_on"
              size={24} 
              color={colors.primary} 
            />
          </View>
        </View>

        <View style={styles.content}>
          {posts.length > 0 ? (
            <View style={styles.postsGrid}>
              {posts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.gridItem}
                  onPress={() => handleVerPost(post.id)}
                  activeOpacity={0.8}
                >
                  {post.imagen ? (
                    <Image source={{ uri: post.imagen }} style={styles.gridImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.gridImage, styles.gridImagePlaceholder]}>
                      <IconSymbol ios_icon_name="photo" android_material_icon_name="photo" size={32} color={colors.textSecondary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol ios_icon_name="photo.on.rectangle" android_material_icon_name="photo_library" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { fontSize: scaleFontSize(16) }]}>No hay publicaciones</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <MomentoViewer
        visible={showMomentoViewer}
        authorId={localId}
        authorType="local"
        onClose={() => setShowMomentoViewer(false)}
      />

      {selectedPostId && allPostIds.length > 0 && (
        <PostViewerModal
          visible={showPostViewer}
          initialPostId={selectedPostId}
          allPostIds={allPostIds}
          hideTagIcon={true}
          onClose={() => {
            setShowPostViewer(false);
            setSelectedPostId(null);
            setAllPostIds([]);
          }}
          onUpdate={() => {
            loadLocalData(true);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  scrollableHeader: {
    paddingTop: Platform.OS === 'android' ? 36 : 50,
    paddingBottom: Platform.OS === 'android' ? 8 : 12,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
  },
  profileHeaderGradient: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  profileSection: {
    paddingTop: 0,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 2,
  },
  profileUsername: {
    color: 'rgba(255, 255, 255, 0.9)',
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
    // fontSize set dynamically
  },
  categoryText: {
    fontWeight: '600',
    color: colors.headerText,
    textTransform: 'capitalize',
  },
  statsContainerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statItemCompact: {
    alignItems: 'center',
    gap: 2,
  },
  statNumberCompact: {
    fontWeight: '700',
    color: colors.headerText,
  },
  statLabelCompact: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  addressText: {
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  actionButtonFollowing: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  actionButtonText: {
    fontWeight: '600',
    color: colors.headerText,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    marginTop: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  content: {
    flex: 1,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    backgroundColor: colors.cardBorder,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
    borderRadius: 4,
  },
  gridImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    width: '100%',
  },
  emptyText: {
    color: colors.textSecondary,
    marginTop: 16,
  },
});
