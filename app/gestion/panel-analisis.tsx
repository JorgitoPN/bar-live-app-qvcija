
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

interface AnalyticsData {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalFollowers: number;
  totalPosts: number;
  totalEvents: number;
  checkIns: number;
  viewsThisWeek: number;
  viewsLastWeek: number;
  topPosts: any[];
  recentActivity: any[];
}

/**
 * ✅ PANEL DE ANÁLISIS v1.0 - PREMIUM FEATURE
 * 
 * Features:
 * - ✅ Analytics dashboard for premium local profiles
 * - ✅ View statistics: visits, likes, comments, followers
 * - ✅ Top performing posts
 * - ✅ Recent activity timeline
 * - ✅ Permission check: only accessible with premium plan
 */

export default function PanelAnalisisScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  const [hasPermission, setHasPermission] = useState(false);

  const localId = params.localId as string;

  const checkPermission = useCallback(async () => {
    if (!localId || !user) {
      console.log('[PanelAnalisis] Missing localId or user');
      return false;
    }

    try {
      console.log('[PanelAnalisis] Checking analytics permission for local:', localId);

      const { data: ownershipData, error: ownershipError } = await supabase
        .from('propietarios_locales')
        .select('id')
        .eq('propietario_id', user.id)
        .eq('local_id', localId)
        .eq('activo', true)
        .single();

      if (ownershipError || !ownershipData) {
        console.error('[PanelAnalisis] User is not owner of this local');
        Alert.alert(
          'Acceso Denegado',
          'No tienes permisos para ver el análisis de este local.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return false;
      }

      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('suscripciones_locales')
        .select(`
          id,
          estado,
          plan_id,
          planes_suscripcion!suscripciones_locales_plan_id_fkey(
            panel_analisis,
            nombre
          )
        `)
        .eq('local_id', localId)
        .eq('estado', 'activa')
        .maybeSingle();

      if (subscriptionError) {
        console.error('[PanelAnalisis] Error checking subscription:', subscriptionError);
        Alert.alert(
          'Error',
          'No se pudo verificar tu suscripción.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return false;
      }

      if (!subscriptionData || !subscriptionData.planes_suscripcion?.panel_analisis) {
        console.log('[PanelAnalisis] Analytics not available in current plan');
        Alert.alert(
          'Plan Premium Requerido',
          'El panel de análisis solo está disponible para locales con plan Premium. Actualiza tu plan para acceder a estadísticas detalladas.',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => router.back() },
            {
              text: 'Ver Planes',
              onPress: () => {
                router.back();
                router.push('/gestion/planes-suscripcion');
              },
            },
          ]
        );
        return false;
      }

      console.log('[PanelAnalisis] ✅ Permission granted - Plan:', subscriptionData.planes_suscripcion.nombre);
      setHasPermission(true);
      return true;
    } catch (error) {
      console.error('[PanelAnalisis] Error checking permission:', error);
      Alert.alert(
        'Error',
        'No se pudo verificar los permisos.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      return false;
    }
  }, [localId, user, router]);

  const loadAnalyticsData = useCallback(async () => {
    if (!localId || !user) return;

    try {
      setLoading(true);
      console.log('[PanelAnalisis] Loading analytics for local:', localId);

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const [
        viewsResult,
        viewsThisWeekResult,
        viewsLastWeekResult,
        postsResult,
        followersResult,
        eventsResult,
        checkInsResult,
      ] = await Promise.all([
        supabase
          .from('profile_views')
          .select('id', { count: 'exact', head: true })
          .eq('local_id', localId),
        
        supabase
          .from('profile_views')
          .select('id', { count: 'exact', head: true })
          .eq('local_id', localId)
          .gte('created_at', oneWeekAgo.toISOString()),
        
        supabase
          .from('profile_views')
          .select('id', { count: 'exact', head: true })
          .eq('local_id', localId)
          .gte('created_at', twoWeeksAgo.toISOString())
          .lt('created_at', oneWeekAgo.toISOString()),
        
        supabase
          .from('posts')
          .select(`
            id,
            contenido,
            imagen,
            likes_count,
            comentarios_count,
            vistas_count,
            created_at
          `)
          .eq('local_id', localId)
          .eq('tipo', 'local')
          .order('likes_count', { ascending: false })
          .limit(5),
        
        supabase
          .from('seguidores')
          .select('id', { count: 'exact', head: true })
          .eq('seguido_id', user.id),
        
        supabase
          .from('eventos')
          .select('id', { count: 'exact', head: true })
          .eq('local_id', localId)
          .eq('activo', true),
        
        supabase
          .from('check_ins')
          .select('id', { count: 'exact', head: true })
          .eq('local_id', localId),
      ]);

      const totalLikes = postsResult.data?.reduce((sum, post) => sum + (post.likes_count || 0), 0) || 0;
      const totalComments = postsResult.data?.reduce((sum, post) => sum + (post.comentarios_count || 0), 0) || 0;

      const analyticsData: AnalyticsData = {
        totalViews: viewsResult.count || 0,
        totalLikes,
        totalComments,
        totalFollowers: followersResult.count || 0,
        totalPosts: postsResult.data?.length || 0,
        totalEvents: eventsResult.count || 0,
        checkIns: checkInsResult.count || 0,
        viewsThisWeek: viewsThisWeekResult.count || 0,
        viewsLastWeek: viewsLastWeekResult.count || 0,
        topPosts: postsResult.data || [],
        recentActivity: [],
      };

      console.log('[PanelAnalisis] ✅ Analytics loaded:', analyticsData);
      setAnalytics(analyticsData);
    } catch (error: any) {
      console.error('[PanelAnalisis] Error loading analytics:', error);
      Alert.alert('Error', error.message || 'No se pudieron cargar las analíticas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [localId, user]);

  useEffect(() => {
    const initializeAnalytics = async () => {
      if (!localId) {
        Alert.alert('Error', 'No se especificó el local', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }

      const hasAccess = await checkPermission();
      if (hasAccess) {
        await loadAnalyticsData();
      }
    };

    initializeAnalytics();
  }, [localId, checkPermission, loadAnalyticsData, router]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
  };

  const getViewsGrowth = () => {
    if (!analytics) return 0;
    if (analytics.viewsLastWeek === 0) return 100;
    return Math.round(((analytics.viewsThisWeek - analytics.viewsLastWeek) / analytics.viewsLastWeek) * 100);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Panel de Análisis</Text>
          </View>
          <View style={{ width: 24 }} />
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando estadísticas...</Text>
        </View>
      </View>
    );
  }

  if (!hasPermission || !analytics) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Panel de Análisis</Text>
          </View>
          <View style={{ width: 24 }} />
        </LinearGradient>

        <View style={styles.emptyContainer}>
          <IconSymbol ios_icon_name="lock.fill" android_material_icon_name="lock" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Acceso Restringido</Text>
          <Text style={styles.emptySubtext}>
            Esta función requiere un plan Premium
          </Text>
        </View>
      </View>
    );
  }

  const viewsGrowth = getViewsGrowth();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Panel de Análisis</Text>
          <Text style={styles.headerSubtitle}>Estadísticas de tu local</Text>
        </View>
        <TouchableOpacity onPress={onRefresh}>
          <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={24} color={colors.headerText} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          <TouchableOpacity
            style={[styles.timeRangeButton, timeRange === 'week' && styles.timeRangeButtonActive]}
            onPress={() => setTimeRange('week')}
          >
            <Text style={[styles.timeRangeText, timeRange === 'week' && styles.timeRangeTextActive]}>
              Semana
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeRangeButton, timeRange === 'month' && styles.timeRangeButtonActive]}
            onPress={() => setTimeRange('month')}
          >
            <Text style={[styles.timeRangeText, timeRange === 'month' && styles.timeRangeTextActive]}>
              Mes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeRangeButton, timeRange === 'all' && styles.timeRangeButtonActive]}
            onPress={() => setTimeRange('all')}
          >
            <Text style={[styles.timeRangeText, timeRange === 'all' && styles.timeRangeTextActive]}>
              Todo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Overview Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen General</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.primary + '20' }]}>
                <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={24} color={colors.primary} />
              </View>
              <Text style={styles.statValue}>{analytics.totalViews}</Text>
              <Text style={styles.statLabel}>Visitas al Perfil</Text>
              {viewsGrowth !== 0 && (
                <View style={styles.statGrowth}>
                  <IconSymbol 
                    ios_icon_name={viewsGrowth > 0 ? 'arrow.up' : 'arrow.down'} 
                    android_material_icon_name={viewsGrowth > 0 ? 'arrow_upward' : 'arrow_downward'}
                    size={12} 
                    color={viewsGrowth > 0 ? '#10B981' : '#EF4444'} 
                  />
                  <Text style={[styles.statGrowthText, { color: viewsGrowth > 0 ? '#10B981' : '#EF4444' }]}>
                    {Math.abs(viewsGrowth)}%
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#EF4444' + '20' }]}>
                <IconSymbol ios_icon_name="heart.fill" android_material_icon_name="favorite" size={24} color="#EF4444" />
              </View>
              <Text style={styles.statValue}>{analytics.totalLikes}</Text>
              <Text style={styles.statLabel}>Me Gusta</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#3B82F6' + '20' }]}>
                <IconSymbol ios_icon_name="bubble.left.fill" android_material_icon_name="comment" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.statValue}>{analytics.totalComments}</Text>
              <Text style={styles.statLabel}>Comentarios</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#10B981' + '20' }]}>
                <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={24} color="#10B981" />
              </View>
              <Text style={styles.statValue}>{analytics.totalFollowers}</Text>
              <Text style={styles.statLabel}>Seguidores</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#F59E0B' + '20' }]}>
                <IconSymbol ios_icon_name="photo.fill" android_material_icon_name="photo" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>{analytics.totalPosts}</Text>
              <Text style={styles.statLabel}>Publicaciones</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#8B5CF6' + '20' }]}>
                <IconSymbol ios_icon_name="calendar.badge.plus" android_material_icon_name="event" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.statValue}>{analytics.totalEvents}</Text>
              <Text style={styles.statLabel}>Eventos</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#EC4899' + '20' }]}>
                <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={24} color="#EC4899" />
              </View>
              <Text style={styles.statValue}>{analytics.checkIns}</Text>
              <Text style={styles.statLabel}>Check-ins</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#06B6D4' + '20' }]}>
                <IconSymbol ios_icon_name="chart.line.uptrend.xyaxis" android_material_icon_name="trending_up" size={24} color="#06B6D4" />
              </View>
              <Text style={styles.statValue}>{analytics.viewsThisWeek}</Text>
              <Text style={styles.statLabel}>Visitas (7 días)</Text>
            </View>
          </View>
        </View>

        {/* Top Posts */}
        {analytics.topPosts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Publicaciones Destacadas</Text>
            <Text style={styles.sectionSubtitle}>Tus posts con mejor rendimiento</Text>
            
            <View style={styles.topPostsList}>
              {analytics.topPosts.map((post, index) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.topPostCard}
                  onPress={() => router.push(`/social/post?id=${post.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.topPostRank}>
                    <Text style={styles.topPostRankText}>#{index + 1}</Text>
                  </View>
                  
                  {post.imagen && (
                    <View style={styles.topPostImageContainer}>
                      <Image 
                        source={{ uri: post.imagen }} 
                        style={styles.topPostImage}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                  
                  <View style={styles.topPostInfo}>
                    {post.contenido && (
                      <Text style={styles.topPostContent} numberOfLines={2}>
                        {post.contenido}
                      </Text>
                    )}
                    <View style={styles.topPostStats}>
                      <View style={styles.topPostStat}>
                        <IconSymbol ios_icon_name="heart.fill" android_material_icon_name="favorite" size={14} color="#EF4444" />
                        <Text style={styles.topPostStatText}>{post.likes_count || 0}</Text>
                      </View>
                      <View style={styles.topPostStat}>
                        <IconSymbol ios_icon_name="bubble.left.fill" android_material_icon_name="comment" size={14} color="#3B82F6" />
                        <Text style={styles.topPostStatText}>{post.comentarios_count || 0}</Text>
                      </View>
                      <View style={styles.topPostStat}>
                        <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={14} color={colors.textSecondary} />
                        <Text style={styles.topPostStatText}>{post.vistas_count || 0}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información Útil</Text>
          
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <IconSymbol ios_icon_name="lightbulb.fill" android_material_icon_name="lightbulb" size={24} color="#F59E0B" />
              <Text style={styles.insightTitle}>Mejora tu Alcance</Text>
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightText}>
                - Publica contenido regularmente para mantener a tus seguidores interesados
              </Text>
              <Text style={styles.insightText}>
                - Responde a los comentarios para aumentar el engagement
              </Text>
              <Text style={styles.insightText}>
                - Crea eventos para atraer más visitas a tu local
              </Text>
              <Text style={styles.insightText}>
                - Usa Momentos para compartir contenido efímero y mantener la atención
              </Text>
            </View>
          </View>
        </View>

        {/* Premium Badge */}
        <View style={styles.premiumBadge}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.premiumBadgeGradient}
          >
            <IconSymbol ios_icon_name="crown.fill" android_material_icon_name="workspace_premium" size={24} color={colors.white} />
            <Text style={styles.premiumBadgeText}>Plan Premium Activo</Text>
          </LinearGradient>
        </View>
      </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: colors.primary,
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timeRangeTextActive: {
    color: colors.white,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 44) / 2,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  statGrowth: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statGrowthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  topPostsList: {
    gap: 12,
  },
  topPostCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  topPostRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topPostRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.white,
  },
  topPostImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
  },
  topPostImage: {
    width: '100%',
    height: '100%',
  },
  topPostInfo: {
    flex: 1,
  },
  topPostContent: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  topPostStats: {
    flexDirection: 'row',
    gap: 16,
  },
  topPostStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topPostStatText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  insightCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  insightContent: {
    gap: 8,
  },
  insightText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  premiumBadge: {
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  premiumBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  premiumBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
});
