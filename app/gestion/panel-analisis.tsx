
import React, { useState, useEffect, useCallback } from 'react';
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
const CONTENT_MAX_WIDTH = 600;

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
  const [expandedRecommendation, setExpandedRecommendation] = useState<string | null>(null);

  const loadAnalyticsData = useCallback(async () => {
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
  }, [localId, timeRange, user, router]);

  const loadRecommendations = useCallback(async () => {
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
  }, [localId]);

  useEffect(() => {
    if (!localId) {
      Alert.alert('Error', 'No se especificó el local');
      router.back();
      return;
    }

    loadAnalyticsData();
    loadRecommendations();
  }, [localId, timeRange, loadAnalyticsData, loadRecommendations, router]);

  const generateRecommendations = async () => {
    if (!localId || generatingRecommendations) return;

    try {
      setGeneratingRecommendations(true);
      console.log('[PanelAnalisis] Starting recommendation generation...');

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('[PanelAnalisis] Session error:', sessionError);
        throw new Error('No se pudo obtener la sesión. Por favor, inicia sesión de nuevo.');
      }

      console.log('[PanelAnalisis] Session obtained successfully');

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/generate-analytics-recommendations`;
      
      console.log('[PanelAnalisis] Making request to:', functionUrl);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ localId }),
      });

      console.log('[PanelAnalisis] Response status:', response.status);

      const result = await response.json();
      console.log('[PanelAnalisis] Response body:', result);

      if (!response.ok) {
        console.error('[PanelAnalisis] Edge Function error:', result);
        throw new Error(result.error || 'Error al generar recomendaciones');
      }

      console.log('[PanelAnalisis] Recommendations generated successfully:', result.count);

      Alert.alert(
        '✅ Recomendaciones Generadas',
        `Se han generado ${result.count} recomendaciones personalizadas para tu local, incluyendo cuándo publicar eventos y destacar tu local.`
      );

      await loadRecommendations();
    } catch (error: any) {
      console.error('[PanelAnalisis] Error generating recommendations:', error);
      
      let errorMessage = 'No se pudieron generar las recomendaciones. Intenta de nuevo.';
      
      if (error.message.includes('sesión') || error.message.includes('session')) {
        errorMessage = 'Tu sesión ha expirado. Por favor, cierra sesión y vuelve a iniciar.';
      } else if (error.message.includes('Authentication') || error.message.includes('Auth')) {
        errorMessage = 'Error de autenticación. Por favor, verifica que has iniciado sesión correctamente.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
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

  const renderCenteredStatCard = (
    icon: string,
    label: string,
    value: string | number,
    color: string
  ) => (
    <View style={styles.centeredStatCard}>
      <IconSymbol name={icon as any} size={22} color={color} />
      <Text style={styles.centeredStatValue}>{value}</Text>
      <Text style={styles.centeredStatLabel}>{label}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando analíticas...</Text>
      </View>
    );
  }

  if (!analyticsData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
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
      {/* Centered Header */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
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
              <IconSymbol name="sparkles" size={22} color={colors.headerText} />
            )}
          </TouchableOpacity>
        </View>

        {/* Centered Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {(['7d', '30d', '90d'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.timeButton, timeRange === range && styles.timeButtonActive]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[styles.timeText, timeRange === range && styles.timeTextActive]}>
                {range === '7d' ? '7 días' : range === '30d' ? '30 días' : '90 días'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.centeredContainer}>
          {/* Centered Stats Grid */}
          <View style={styles.statsGrid}>
            {renderCenteredStatCard('eye.fill', 'Vistas', analyticsData.stats.total_views.toLocaleString(), '#3B82F6')}
            {renderCenteredStatCard('heart.fill', 'Likes', analyticsData.stats.total_likes.toLocaleString(), '#EF4444')}
            {renderCenteredStatCard('bubble.left.fill', 'Comentarios', analyticsData.stats.total_comments.toLocaleString(), '#10B981')}
            {renderCenteredStatCard('chart.line.uptrend.xyaxis', 'Engagement', `${analyticsData.stats.engagement_rate.toFixed(1)}%`, '#F59E0B')}
            {renderCenteredStatCard('person.2.badge.plus', 'Seguidores', analyticsData.stats.nuevos_seguidores.toLocaleString(), '#8B5CF6')}
            {renderCenteredStatCard('antenna.radiowaves.left.and.right', 'Alcance', analyticsData.stats.reach.toLocaleString(), '#06B6D4')}
          </View>

          {/* AI Recommendations - Prominent & Centered */}
          <View style={styles.recommendationsSection}>
            <View style={styles.recommendationsHeader}>
              <IconSymbol name="sparkles" size={24} color="#F59E0B" />
              <Text style={styles.recommendationsTitle}>Recomendaciones de IA</Text>
              {recommendations.length > 0 && (
                <View style={styles.recommendationsBadge}>
                  <Text style={styles.recommendationsBadgeText}>{recommendations.length}</Text>
                </View>
              )}
            </View>

            <Text style={styles.recommendationsSubtitle}>
              Incluye cuándo publicar eventos y destacar tu local
            </Text>

            {recommendations.length === 0 ? (
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
                    <>
                      <IconSymbol name="sparkles" size={20} color="#FFFFFF" />
                      <Text style={styles.generateText}>Generar Recomendaciones</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <>
                {recommendations.map((rec) => (
                  <View key={rec.id} style={styles.recommendationCard}>
                    <TouchableOpacity
                      style={styles.recommendationHeader}
                      onPress={() => setExpandedRecommendation(expandedRecommendation === rec.id ? null : rec.id)}
                    >
                      <View style={styles.recommendationTitleRow}>
                        <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(rec.prioridad) }]} />
                        <Text style={styles.recommendationTitle} numberOfLines={expandedRecommendation === rec.id ? undefined : 2}>
                          {rec.titulo}
                        </Text>
                      </View>
                      <IconSymbol
                        name={expandedRecommendation === rec.id ? 'chevron.up' : 'chevron.down'}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {expandedRecommendation === rec.id && (
                      <View style={styles.recommendationExpanded}>
                        <Text style={styles.recommendationDescription}>{rec.descripcion}</Text>
                        
                        {rec.acciones_sugeridas && rec.acciones_sugeridas.length > 0 && (
                          <View style={styles.actionsContainer}>
                            <Text style={styles.actionsTitle}>Acciones Recomendadas:</Text>
                            {rec.acciones_sugeridas.map((accion, index) => (
                              <View key={index} style={styles.actionItem}>
                                <View style={styles.actionBullet}>
                                  <Text style={styles.actionBulletText}>{index + 1}</Text>
                                </View>
                                <Text style={styles.actionText}>{accion}</Text>
                              </View>
                            ))}
                          </View>
                        )}

                        <View style={styles.recommendationFooter}>
                          <View style={styles.impactBadge}>
                            <IconSymbol name="chart.line.uptrend.xyaxis" size={14} color="#065F46" />
                            <Text style={styles.impactText}>{rec.impacto_estimado}</Text>
                          </View>
                          <View style={styles.confidenceBadge}>
                            <IconSymbol name="checkmark.seal.fill" size={14} color="#1E40AF" />
                            <Text style={styles.confidenceText}>
                              {Math.round(rec.confianza * 100)}% confianza
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
                
                <TouchableOpacity
                  style={styles.refreshRecommendations}
                  onPress={generateRecommendations}
                  disabled={generatingRecommendations}
                >
                  <IconSymbol name="arrow.clockwise" size={18} color={colors.primary} />
                  <Text style={styles.refreshRecommendationsText}>Actualizar Recomendaciones</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Centered Best Times & Days */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏰ Mejores Momentos para Publicar</Text>
            <View style={styles.timesAndDaysRow}>
              {/* Best Hours */}
              <View style={styles.halfCard}>
                <Text style={styles.halfCardTitle}>Horarios Óptimos</Text>
                {analyticsData.bestPostingTimes.slice(0, 3).map((time, index) => (
                  <View key={index} style={styles.timeItem}>
                    <View style={[styles.timeRank, { backgroundColor: index === 0 ? '#F59E0B' : index === 1 ? '#3B82F6' : '#10B981' }]}>
                      <Text style={styles.timeRankText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.timeText}>{time.hour}:00 - {time.hour + 1}:00</Text>
                    <Text style={styles.timeEngagement}>{Math.round(time.avgEngagement)} interacciones</Text>
                  </View>
                ))}
              </View>

              {/* Best Days */}
              <View style={styles.halfCard}>
                <Text style={styles.halfCardTitle}>Mejores Días</Text>
                {analyticsData.bestDays.slice(0, 3).map((day, index) => (
                  <View key={index} style={styles.timeItem}>
                    <View style={[styles.timeRank, { backgroundColor: index === 0 ? '#F59E0B' : index === 1 ? '#3B82F6' : '#10B981' }]}>
                      <Text style={styles.timeRankText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.timeText}>{dayNames[day.day]}</Text>
                    <Text style={styles.timeEngagement}>{Math.round(day.avgEngagement)} interacciones</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Centered Content Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Resumen de Contenido</Text>
            <View style={styles.contentStatsRow}>
              <View style={styles.contentStatItem}>
                <IconSymbol name="photo.fill" size={28} color={colors.primary} />
                <Text style={styles.contentStatValue}>{analyticsData.stats.total_posts}</Text>
                <Text style={styles.contentStatLabel}>Publicaciones</Text>
              </View>
              <View style={styles.contentStatItem}>
                <IconSymbol name="camera.fill" size={28} color="#8B5CF6" />
                <Text style={styles.contentStatValue}>{analyticsData.stats.total_stories}</Text>
                <Text style={styles.contentStatLabel}>Historias</Text>
              </View>
              <View style={styles.contentStatItem}>
                <IconSymbol name="calendar" size={28} color="#F59E0B" />
                <Text style={styles.contentStatValue}>{analyticsData.stats.total_eventos}</Text>
                <Text style={styles.contentStatLabel}>Eventos</Text>
              </View>
            </View>
          </View>

          {/* Centered Audience */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 Tu Audiencia</Text>
            <View style={styles.audienceCard}>
              <View style={styles.audienceRow}>
                <IconSymbol name="person.2.fill" size={24} color={colors.primary} />
                <View style={styles.audienceInfo}>
                  <Text style={styles.audienceValue}>{analyticsData.local.seguidores.toLocaleString()}</Text>
                  <Text style={styles.audienceLabel}>Seguidores Totales</Text>
                </View>
              </View>
              <View style={styles.audienceRow}>
                <IconSymbol name="location.fill" size={24} color="#10B981" />
                <View style={styles.audienceInfo}>
                  <Text style={styles.audienceValue}>{analyticsData.local.check_ins.toLocaleString()}</Text>
                  <Text style={styles.audienceLabel}>Check-ins</Text>
                </View>
              </View>
              <View style={styles.audienceRow}>
                <IconSymbol name="star.fill" size={24} color="#F59E0B" />
                <View style={styles.audienceInfo}>
                  <Text style={styles.audienceValue}>{analyticsData.local.rating.toFixed(1)}</Text>
                  <Text style={styles.audienceLabel}>Valoración</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Info Footer */}
          <View style={styles.infoBanner}>
            <IconSymbol name="lightbulb.fill" size={20} color="#F59E0B" />
            <Text style={styles.infoText}>
              Las recomendaciones de IA analizan tus datos para sugerirte cuándo publicar eventos, 
              destacar tu local y optimizar tu estrategia de contenido para máxima visibilidad.
            </Text>
          </View>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerBackButton: {
    padding: 4,
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
    fontSize: 13,
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 2,
  },
  headerRefreshButton: {
    padding: 4,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  timeButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  timeButtonActive: {
    backgroundColor: colors.headerText,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
  },
  timeTextActive: {
    color: colors.primary,
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
    paddingBottom: 100,
  },
  centeredContainer: {
    maxWidth: CONTENT_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
    justifyContent: 'center',
  },
  centeredStatCard: {
    width: (Math.min(width, CONTENT_MAX_WIDTH) - 56) / 3,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  centeredStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  centeredStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  recommendationsSection: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  recommendationsBadge: {
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  recommendationsBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  recommendationsSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  generateButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  generateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  generateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  recommendationCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recommendationTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  recommendationTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  recommendationExpanded: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  recommendationDescription: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionsContainer: {
    marginBottom: 16,
  },
  actionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  actionBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  actionBulletText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  actionText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  recommendationFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  impactBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  impactText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
  },
  confidenceBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confidenceText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#1E40AF',
  },
  refreshRecommendations: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  refreshRecommendationsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  timesAndDaysRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  halfCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  timeRank: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeRankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  timeEngagement: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  contentStatsRow: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  contentStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  contentStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  contentStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  audienceCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  audienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  audienceInfo: {
    flex: 1,
  },
  audienceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  audienceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
});
