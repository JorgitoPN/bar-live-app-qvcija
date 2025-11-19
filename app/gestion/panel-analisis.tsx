
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';

const { width } = Dimensions.get('window');

interface AnalyticsData {
  local: {
    id: string;
    nombre: string;
    imagen_url?: string;
    seguidores: number;
    check_ins: number;
    rating: number;
  };
  subscription: {
    plan_nombre: string;
    plan_precio: number;
  };
  stats: {
    total_views: number;
    total_likes: number;
    total_comments: number;
    total_shares: number;
    total_stories: number;
    total_posts: number;
    total_eventos: number;
    engagement_rate: number;
    nuevos_seguidores: number;
    reach: number;
  };
  timeSeriesData: {
    date: string;
    views: number;
    interactions: number;
    engagement_rate: number;
  }[];
  topContent: {
    id: string;
    tipo: string;
    contenido: string;
    imagen?: string;
    likes: number;
    comentarios: number;
    created_at: string;
  }[];
  bestPostingTimes: {
    hour: number;
    avgEngagement: number;
  }[];
  bestDays: {
    day: number;
    avgEngagement: number;
  }[];
}

interface AIRecommendation {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  datos_soporte: any;
  acciones_sugeridas: string[];
  impacto_estimado: string;
  confianza: number;
  estado: string;
  created_at: string;
}

export default function PanelAnalisisScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { localId } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [generatingRecommendations, setGeneratingRecommendations] = useState(false);

  useEffect(() => {
    if (!localId) {
      Alert.alert('Error', 'No se especificó el local');
      router.back();
      return;
    }

    loadAnalyticsData();
    loadRecommendations();
  }, [localId, timeRange]);

  const loadAnalyticsData = async () => {
    if (!localId || !user) return;

    try {
      setLoading(true);
      console.log('[PanelAnalisis] Loading analytics for local:', localId);

      // 1. Verify local ownership
      const { data: localData, error: localError } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url, propietario_id, seguidores, check_ins, rating')
        .eq('id', localId)
        .single();

      if (localError || !localData) {
        throw new Error('Local no encontrado');
      }

      if (localData.propietario_id !== user.id) {
        Alert.alert('Acceso Denegado', 'No tienes permiso para ver las analíticas de este local');
        router.back();
        return;
      }

      // 2. Verify Premium subscription
      console.log('[PanelAnalisis] Checking subscription for local:', localId);
      
      const { data: subscriptionData, error: subError } = await supabase
        .from('suscripciones_locales')
        .select('id, plan_id, estado')
        .eq('local_id', localId)
        .eq('estado', 'activa')
        .maybeSingle();

      console.log('[PanelAnalisis] Subscription query result:', { subscriptionData, subError });

      if (subError) {
        console.error('[PanelAnalisis] Subscription query error:', subError);
        Alert.alert(
          'Error',
          'No se pudo verificar tu plan de suscripción. Intenta de nuevo.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      if (!subscriptionData) {
        console.log('[PanelAnalisis] No active subscription found');
        Alert.alert(
          'Plan Requerido',
          'Necesitas un plan activo para acceder al panel de análisis.',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => router.back() },
            {
              text: 'Ver Planes',
              onPress: () => router.push(`/gestion/planes-suscripcion?localId=${localId}`),
            },
          ]
        );
        return;
      }

      const { data: planData, error: planError } = await supabase
        .from('planes_suscripcion')
        .select('nombre, precio_mensual, panel_analisis')
        .eq('id', subscriptionData.plan_id)
        .single();

      console.log('[PanelAnalisis] Plan data:', planData);

      if (planError || !planData) {
        console.error('[PanelAnalisis] Plan query error:', planError);
        Alert.alert(
          'Error de Configuración',
          'Tu suscripción no tiene un plan asociado. Contacta con soporte.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      if (!planData.panel_analisis) {
        console.log('[PanelAnalisis] Plan does not have analytics access:', planData.nombre);
        Alert.alert(
          'Plan Premium Requerido',
          `Tu plan actual (${planData.nombre.toUpperCase()}) no incluye acceso al panel de análisis.\n\nActualiza a Premium para acceder a estadísticas detalladas y recomendaciones de IA.`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => router.back() },
            {
              text: 'Actualizar Plan',
              onPress: () => router.push(`/gestion/planes-suscripcion?localId=${localId}`),
            },
          ]
        );
        return;
      }

      console.log('[PanelAnalisis] Access granted! Loading analytics data...');

      // 3. Load analytics data
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data: postsData } = await supabase
        .from('posts')
        .select('id, likes, comentarios, created_at, contenido, imagen')
        .eq('local_id', localId)
        .gte('created_at', startDate.toISOString())
        .order('likes', { ascending: false });

      const { data: storiesData } = await supabase
        .from('historias')
        .select('id, created_at')
        .eq('local_id', localId)
        .gte('created_at', startDate.toISOString());

      const { data: storyViewsData } = await supabase
        .from('historia_views')
        .select('historia_id, viewed_at')
        .in(
          'historia_id',
          storiesData?.map((s) => s.id) || []
        );

      const { data: storyLikesData } = await supabase
        .from('historia_likes')
        .select('historia_id, created_at')
        .in(
          'historia_id',
          storiesData?.map((s) => s.id) || []
        );

      const { data: eventosData } = await supabase
        .from('eventos')
        .select('id, titulo, fecha, entradas_vendidas, entradas_totales')
        .eq('local_id', localId)
        .gte('created_at', startDate.toISOString());

      const { data: checkInsData } = await supabase
        .from('check_ins')
        .select('id, created_at, usuario_id')
        .eq('local_id', localId)
        .gte('created_at', startDate.toISOString());

      const { data: newFollowersData } = await supabase
        .from('seguidores')
        .select('created_at')
        .eq('seguido_id', localId)
        .gte('created_at', startDate.toISOString());

      // Calculate stats
      const totalPosts = postsData?.length || 0;
      const totalStories = storiesData?.length || 0;
      const totalLikes = (postsData?.reduce((sum, p) => sum + (p.likes || 0), 0) || 0) + (storyLikesData?.length || 0);
      const totalComments = postsData?.reduce((sum, p) => sum + (p.comentarios || 0), 0) || 0;
      const totalViews = (storyViewsData?.length || 0) + (checkInsData?.length || 0);
      const totalEventos = eventosData?.length || 0;
      const nuevosSeguidores = newFollowersData?.length || 0;

      const totalInteractions = totalLikes + totalComments;
      const engagementRate = totalPosts + totalStories > 0 ? ((totalInteractions / (totalPosts + totalStories)) * 100) : 0;

      // Build time series data
      const timeSeriesMap = new Map<string, { views: number; interactions: number }>();
      
      checkInsData?.forEach((checkIn) => {
        const date = new Date(checkIn.created_at).toISOString().split('T')[0];
        const existing = timeSeriesMap.get(date) || { views: 0, interactions: 0 };
        timeSeriesMap.set(date, { ...existing, views: existing.views + 1 });
      });

      storyViewsData?.forEach((view) => {
        const date = new Date(view.viewed_at).toISOString().split('T')[0];
        const existing = timeSeriesMap.get(date) || { views: 0, interactions: 0 };
        timeSeriesMap.set(date, { ...existing, views: existing.views + 1 });
      });

      postsData?.forEach((post) => {
        const date = new Date(post.created_at).toISOString().split('T')[0];
        const existing = timeSeriesMap.get(date) || { views: 0, interactions: 0 };
        timeSeriesMap.set(date, {
          ...existing,
          interactions: existing.interactions + (post.likes || 0) + (post.comentarios || 0),
        });
      });

      const timeSeriesData = Array.from(timeSeriesMap.entries())
        .map(([date, data]) => ({
          date,
          ...data,
          engagement_rate: data.views > 0 ? (data.interactions / data.views) * 100 : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const topContent = postsData?.slice(0, 5).map((post) => ({
        id: post.id,
        tipo: 'post',
        contenido: post.contenido || '',
        imagen: post.imagen,
        likes: post.likes || 0,
        comentarios: post.comentarios || 0,
        created_at: post.created_at,
      })) || [];

      // Best posting times
      const postsByHour = new Map<number, { count: number; engagement: number }>();
      postsData?.forEach((post) => {
        const hour = new Date(post.created_at).getHours();
        const engagement = (post.likes || 0) + (post.comentarios || 0);
        const existing = postsByHour.get(hour) || { count: 0, engagement: 0 };
        postsByHour.set(hour, {
          count: existing.count + 1,
          engagement: existing.engagement + engagement,
        });
      });

      const bestPostingTimes = Array.from(postsByHour.entries())
        .map(([hour, data]) => ({
          hour,
          avgEngagement: data.engagement / data.count,
        }))
        .sort((a, b) => b.avgEngagement - a.avgEngagement)
        .slice(0, 3);

      // Best days
      const postsByDay = new Map<number, { count: number; engagement: number }>();
      postsData?.forEach((post) => {
        const day = new Date(post.created_at).getDay();
        const engagement = (post.likes || 0) + (post.comentarios || 0);
        const existing = postsByDay.get(day) || { count: 0, engagement: 0 };
        postsByDay.set(day, {
          count: existing.count + 1,
          engagement: existing.engagement + engagement,
        });
      });

      const bestDays = Array.from(postsByDay.entries())
        .map(([day, data]) => ({
          day,
          avgEngagement: data.engagement / data.count,
        }))
        .sort((a, b) => b.avgEngagement - a.avgEngagement)
        .slice(0, 3);

      setAnalyticsData({
        local: localData,
        subscription: {
          plan_nombre: planData.nombre,
          plan_precio: planData.precio_mensual,
        },
        stats: {
          total_views: totalViews,
          total_likes: totalLikes,
          total_comments: totalComments,
          total_shares: 0,
          total_stories: totalStories,
          total_posts: totalPosts,
          total_eventos: totalEventos,
          engagement_rate: engagementRate,
          nuevos_seguidores: nuevosSeguidores,
          reach: totalViews + totalInteractions,
        },
        timeSeriesData,
        topContent,
        bestPostingTimes,
        bestDays,
      });

      console.log('[PanelAnalisis] Analytics loaded successfully');
    } catch (error: any) {
      console.error('[PanelAnalisis] Error loading analytics:', error);
      Alert.alert('Error', error.message || 'No se pudieron cargar las analíticas');
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadRecommendations = async () => {
    if (!localId) return;

    try {
      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('local_id', localId)
        .eq('estado', 'activa')
        .order('prioridad', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[PanelAnalisis] Error loading recommendations:', error);
        return;
      }

      setRecommendations(data || []);
    } catch (error) {
      console.error('[PanelAnalisis] Error:', error);
    }
  };

  const generateRecommendations = async () => {
    if (!localId || generatingRecommendations) return;

    try {
      setGeneratingRecommendations(true);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('[PanelAnalisis] Session error:', sessionError);
        throw new Error('No se pudo obtener la sesión. Por favor, inicia sesión de nuevo.');
      }

      console.log('[PanelAnalisis] Making request with fresh token');

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-analytics-recommendations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ localId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error('[PanelAnalisis] Edge Function error:', result);
        throw new Error(result.error || 'Error al generar recomendaciones');
      }

      console.log('[PanelAnalisis] Recommendations generated:', result);

      Alert.alert(
        '✅ Recomendaciones Generadas',
        `Se han generado ${result.count} recomendaciones personalizadas para tu local.`
      );

      await loadRecommendations();
    } catch (error: any) {
      console.error('[PanelAnalisis] Error generating recommendations:', error);
      Alert.alert(
        'Error',
        error.message || 'No se pudieron generar las recomendaciones. Intenta de nuevo.'
      );
    } finally {
      setGeneratingRecommendations(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    await loadRecommendations();
  };

  const getPriorityColor = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente':
        return '#EF4444';
      case 'alta':
        return '#F59E0B';
      case 'media':
        return '#3B82F6';
      default:
        return '#10B981';
    }
  };

  const getPriorityIcon = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente':
        return 'exclamationmark.triangle.fill';
      case 'alta':
        return 'exclamationmark.circle.fill';
      case 'media':
        return 'info.circle.fill';
      default:
        return 'checkmark.circle.fill';
    }
  };

  const renderStatCard = (
    icon: string,
    label: string,
    value: string | number,
    color: string,
    subtitle?: string
  ) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
        <IconSymbol name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando analíticas...</Text>
      </View>
    );
  }

  if (!analyticsData) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <IconSymbol name="exclamationmark.triangle" size={64} color={colors.textSecondary} />
        <Text style={[styles.loadingText, { marginTop: 16, textAlign: 'center' }]}>
          No se pudieron cargar las analíticas
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Panel de Análisis</Text>
          <Text style={styles.headerSubtitle}>{analyticsData.local.nombre}</Text>
        </View>
        <TouchableOpacity
          style={styles.headerRefreshButton}
          onPress={generateRecommendations}
          disabled={generatingRecommendations}
        >
          {generatingRecommendations ? (
            <ActivityIndicator size="small" color={colors.headerText} />
          ) : (
            <IconSymbol name="sparkles" size={24} color={colors.headerText} />
          )}
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Premium Badge */}
        <View style={styles.premiumBanner}>
          <IconSymbol name="star.fill" size={20} color="#F59E0B" />
          <Text style={styles.premiumText}>
            Plan {analyticsData.subscription.plan_nombre.toUpperCase()} • Analíticas Completas + IA
          </Text>
        </View>

        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          <TouchableOpacity
            style={[styles.timeRangeButton, timeRange === '7d' && styles.timeRangeButtonActive]}
            onPress={() => setTimeRange('7d')}
          >
            <Text
              style={[
                styles.timeRangeButtonText,
                timeRange === '7d' && styles.timeRangeButtonTextActive,
              ]}
            >
              7 días
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeRangeButton, timeRange === '30d' && styles.timeRangeButtonActive]}
            onPress={() => setTimeRange('30d')}
          >
            <Text
              style={[
                styles.timeRangeButtonText,
                timeRange === '30d' && styles.timeRangeButtonTextActive,
              ]}
            >
              30 días
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeRangeButton, timeRange === '90d' && styles.timeRangeButtonActive]}
            onPress={() => setTimeRange('90d')}
          >
            <Text
              style={[
                styles.timeRangeButtonText,
                timeRange === '90d' && styles.timeRangeButtonTextActive,
              ]}
            >
              90 días
            </Text>
          </TouchableOpacity>
        </View>

        {/* AI Recommendations Section */}
        {recommendations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <IconSymbol name="sparkles" size={24} color="#F59E0B" />
                <Text style={styles.sectionTitle}>Recomendaciones IA</Text>
              </View>
              <TouchableOpacity onPress={generateRecommendations} disabled={generatingRecommendations}>
                <IconSymbol name="arrow.clockwise" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionSubtitle}>
              Sugerencias personalizadas para mejorar el rendimiento
            </Text>
            {recommendations.map((rec) => (
              <View key={rec.id} style={styles.recommendationCard}>
                <View style={styles.recommendationHeader}>
                  <View style={styles.recommendationTitleRow}>
                    <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(rec.prioridad) }]} />
                    <Text style={styles.recommendationTitle}>{rec.titulo}</Text>
                  </View>
                  <View
                    style={[
                      styles.priorityBadge,
                      { backgroundColor: getPriorityColor(rec.prioridad) },
                    ]}
                  >
                    <Text style={styles.priorityBadgeText}>
                      {rec.prioridad.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.recommendationDescription}>{rec.descripcion}</Text>
                
                {rec.acciones_sugeridas && rec.acciones_sugeridas.length > 0 && (
                  <View style={styles.actionsContainer}>
                    <Text style={styles.actionsTitle}>Acciones Sugeridas:</Text>
                    {rec.acciones_sugeridas.map((accion, index) => (
                      <View key={index} style={styles.actionItem}>
                        <View style={styles.actionBullet} />
                        <Text style={styles.actionText}>{accion}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.recommendationFooter}>
                  <View style={styles.impactBadge}>
                    <IconSymbol name="chart.line.uptrend.xyaxis" size={14} color="#10B981" />
                    <Text style={styles.impactText}>{rec.impacto_estimado}</Text>
                  </View>
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceText}>
                      {Math.round(rec.confianza * 100)}% confianza
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Generate Recommendations Button */}
        {recommendations.length === 0 && (
          <TouchableOpacity
            style={styles.generateButton}
            onPress={generateRecommendations}
            disabled={generatingRecommendations}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.generateGradient}
            >
              {generatingRecommendations ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <React.Fragment>
                  <IconSymbol name="sparkles" size={20} color="#FFFFFF" />
                  <Text style={styles.generateButtonText}>Generar Recomendaciones IA</Text>
                </React.Fragment>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Overview Stats Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen General</Text>
          <View style={styles.statsGrid}>
            {renderStatCard(
              'eye.fill',
              'Visualizaciones',
              analyticsData.stats.total_views.toLocaleString(),
              '#3B82F6',
              'Total de vistas'
            )}
            {renderStatCard(
              'heart.fill',
              'Me Gusta',
              analyticsData.stats.total_likes.toLocaleString(),
              '#EF4444',
              'Likes recibidos'
            )}
            {renderStatCard(
              'bubble.left.fill',
              'Comentarios',
              analyticsData.stats.total_comments.toLocaleString(),
              '#10B981',
              'Interacciones'
            )}
            {renderStatCard(
              'chart.line.uptrend.xyaxis',
              'Engagement',
              `${analyticsData.stats.engagement_rate.toFixed(1)}%`,
              '#F59E0B',
              'Tasa de interacción'
            )}
            {renderStatCard(
              'person.2.badge.plus',
              'Nuevos Seguidores',
              analyticsData.stats.nuevos_seguidores.toLocaleString(),
              '#8B5CF6',
              `Últimos ${timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'} días`
            )}
            {renderStatCard(
              'antenna.radiowaves.left.and.right',
              'Alcance',
              analyticsData.stats.reach.toLocaleString(),
              '#06B6D4',
              'Personas alcanzadas'
            )}
          </View>
        </View>

        {/* Content & Audience Row */}
        <View style={styles.twoColumnSection}>
          {/* Content Stats */}
          <View style={styles.halfCard}>
            <View style={styles.cardHeader}>
              <IconSymbol name="photo.fill" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>Contenido</Text>
            </View>
            <View style={styles.contentStatsColumn}>
              <View style={styles.contentStatRow}>
                <IconSymbol name="photo.fill" size={20} color="#3B82F6" />
                <View style={styles.contentStatInfo}>
                  <Text style={styles.contentStatValue}>{analyticsData.stats.total_posts}</Text>
                  <Text style={styles.contentStatLabel}>Posts</Text>
                </View>
              </View>
              <View style={styles.contentStatRow}>
                <IconSymbol name="camera.fill" size={20} color="#8B5CF6" />
                <View style={styles.contentStatInfo}>
                  <Text style={styles.contentStatValue}>{analyticsData.stats.total_stories}</Text>
                  <Text style={styles.contentStatLabel}>Historias</Text>
                </View>
              </View>
              <View style={styles.contentStatRow}>
                <IconSymbol name="calendar" size={20} color="#F59E0B" />
                <View style={styles.contentStatInfo}>
                  <Text style={styles.contentStatValue}>{analyticsData.stats.total_eventos}</Text>
                  <Text style={styles.contentStatLabel}>Eventos</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Audience Stats */}
          <View style={styles.halfCard}>
            <View style={styles.cardHeader}>
              <IconSymbol name="person.2.fill" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>Audiencia</Text>
            </View>
            <View style={styles.contentStatsColumn}>
              <View style={styles.contentStatRow}>
                <IconSymbol name="person.2.fill" size={20} color="#3B82F6" />
                <View style={styles.contentStatInfo}>
                  <Text style={styles.contentStatValue}>{analyticsData.local.seguidores.toLocaleString()}</Text>
                  <Text style={styles.contentStatLabel}>Seguidores</Text>
                </View>
              </View>
              <View style={styles.contentStatRow}>
                <IconSymbol name="location.fill" size={20} color="#10B981" />
                <View style={styles.contentStatInfo}>
                  <Text style={styles.contentStatValue}>{analyticsData.local.check_ins.toLocaleString()}</Text>
                  <Text style={styles.contentStatLabel}>Check-ins</Text>
                </View>
              </View>
              <View style={styles.contentStatRow}>
                <IconSymbol name="star.fill" size={20} color="#F59E0B" />
                <View style={styles.contentStatInfo}>
                  <Text style={styles.contentStatValue}>{analyticsData.local.rating.toFixed(1)}</Text>
                  <Text style={styles.contentStatLabel}>Valoración</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Best Posting Times & Days */}
        {(analyticsData.bestPostingTimes.length > 0 || analyticsData.bestDays.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <IconSymbol name="clock.fill" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Mejores Momentos</Text>
              </View>
            </View>
            <Text style={styles.sectionSubtitle}>
              Horarios y días con mayor engagement
            </Text>
            
            {analyticsData.bestPostingTimes.length > 0 && (
              <View style={styles.timesGrid}>
                {analyticsData.bestPostingTimes.map((time, index) => (
                  <View key={index} style={styles.timeCard}>
                    <View style={[styles.timeRank, { backgroundColor: index === 0 ? '#F59E0B' : index === 1 ? '#3B82F6' : '#10B981' }]}>
                      <Text style={styles.timeRankText}>#{index + 1}</Text>
                    </View>
                    <Text style={styles.timeHour}>
                      {time.hour}:00
                    </Text>
                    <Text style={styles.timeEngagement}>
                      {Math.round(time.avgEngagement)} interacciones
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {analyticsData.bestDays.length > 0 && (
              <View style={styles.daysGrid}>
                {analyticsData.bestDays.map((day, index) => (
                  <View key={index} style={styles.dayCard}>
                    <View style={[styles.dayRank, { backgroundColor: index === 0 ? '#F59E0B' : index === 1 ? '#3B82F6' : '#10B981' }]}>
                      <Text style={styles.dayRankText}>#{index + 1}</Text>
                    </View>
                    <Text style={styles.dayName}>{dayNames[day.day]}</Text>
                    <Text style={styles.dayEngagement}>
                      {Math.round(day.avgEngagement)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Top Content */}
        {analyticsData.topContent.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <IconSymbol name="trophy.fill" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Contenido Destacado</Text>
              </View>
            </View>
            <Text style={styles.sectionSubtitle}>
              Tus publicaciones con mejor rendimiento
            </Text>
            {analyticsData.topContent.map((content, index) => (
              <View key={content.id} style={styles.topContentCard}>
                <View style={[styles.topContentRank, { backgroundColor: index === 0 ? '#F59E0B' : index === 1 ? '#3B82F6' : '#10B981' }]}>
                  <Text style={styles.topContentRankText}>#{index + 1}</Text>
                </View>
                <View style={styles.topContentInfo}>
                  <Text style={styles.topContentText} numberOfLines={2}>
                    {content.contenido || 'Sin texto'}
                  </Text>
                  <View style={styles.topContentStats}>
                    <View style={styles.topContentStat}>
                      <IconSymbol name="heart.fill" size={16} color="#EF4444" />
                      <Text style={styles.topContentStatText}>{content.likes}</Text>
                    </View>
                    <View style={styles.topContentStat}>
                      <IconSymbol name="bubble.left.fill" size={16} color="#10B981" />
                      <Text style={styles.topContentStatText}>{content.comentarios}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Performance Trend */}
        {analyticsData.timeSeriesData.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <IconSymbol name="chart.bar.fill" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Tendencia</Text>
              </View>
            </View>
            <Text style={styles.sectionSubtitle}>
              Evolución de tus métricas
            </Text>
            <View style={styles.trendCard}>
              {analyticsData.timeSeriesData.slice(-7).map((data, index) => {
                const maxValue = Math.max(
                  ...analyticsData.timeSeriesData.map((d) => d.views + d.interactions)
                );
                const height = ((data.views + data.interactions) / maxValue) * 100;
                return (
                  <View key={index} style={styles.trendBar}>
                    <View
                      style={[
                        styles.trendBarFill,
                        { height: `${height}%`, backgroundColor: colors.primary },
                      ]}
                    />
                    <Text style={styles.trendBarLabel}>
                      {new Date(data.date).getDate()}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <IconSymbol name="info.circle.fill" size={20} color={colors.primary} />
          <Text style={styles.infoBannerText}>
            Las analíticas se actualizan en tiempo real. Desliza hacia abajo para refrescar los datos.
          </Text>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBackButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 2,
  },
  headerRefreshButton: {
    padding: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  backButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  premiumText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeRangeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  timeRangeButtonTextActive: {
    color: colors.white,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  recommendationCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recommendationTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recommendationTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  recommendationDescription: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  actionsContainer: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  actionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  actionBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 7,
  },
  actionText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  recommendationFooter: {
    flexDirection: 'row',
    gap: 8,
  },
  impactBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  impactText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E40AF',
  },
  generateButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  generateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    gap: 12,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  twoColumnSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  halfCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  contentStatsColumn: {
    gap: 12,
  },
  contentStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contentStatInfo: {
    flex: 1,
  },
  contentStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  contentStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  timesGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  timeCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  timeRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  timeRankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timeHour: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  timeEngagement: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  dayCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  dayRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dayRankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dayName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  dayEngagement: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  topContentCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  topContentRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topContentRankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  topContentInfo: {
    flex: 1,
  },
  topContentText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  topContentStats: {
    flexDirection: 'row',
    gap: 16,
  },
  topContentStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topContentStatText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  trendCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 150,
  },
  trendBar: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  trendBarFill: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  trendBarLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
});
