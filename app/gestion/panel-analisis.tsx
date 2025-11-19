
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

  const renderCompactStatCard = (
    icon: string,
    label: string,
    value: string | number,
    color: string
  ) => (
    <View style={styles.compactStatCard}>
      <IconSymbol name={icon as any} size={20} color={color} />
      <Text style={styles.compactStatValue}>{value}</Text>
      <Text style={styles.compactStatLabel}>{label}</Text>
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
      {/* Compact Header */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.compactHeader}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Análisis</Text>
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

        {/* Inline Time Range Selector */}
        <View style={styles.inlineTimeRange}>
          {(['7d', '30d', '90d'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.inlineTimeButton, timeRange === range && styles.inlineTimeButtonActive]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[styles.inlineTimeText, timeRange === range && styles.inlineTimeTextActive]}>
                {range === '7d' ? '7d' : range === '30d' ? '30d' : '90d'}
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
        {/* Compact Stats Grid */}
        <View style={styles.compactStatsGrid}>
          {renderCompactStatCard('eye.fill', 'Vistas', analyticsData.stats.total_views.toLocaleString(), '#3B82F6')}
          {renderCompactStatCard('heart.fill', 'Likes', analyticsData.stats.total_likes.toLocaleString(), '#EF4444')}
          {renderCompactStatCard('bubble.left.fill', 'Comentarios', analyticsData.stats.total_comments.toLocaleString(), '#10B981')}
          {renderCompactStatCard('chart.line.uptrend.xyaxis', 'Engagement', `${analyticsData.stats.engagement_rate.toFixed(1)}%`, '#F59E0B')}
          {renderCompactStatCard('person.2.badge.plus', 'Seguidores', analyticsData.stats.nuevos_seguidores.toLocaleString(), '#8B5CF6')}
          {renderCompactStatCard('antenna.radiowaves.left.and.right', 'Alcance', analyticsData.stats.reach.toLocaleString(), '#06B6D4')}
        </View>

        {/* AI Recommendations - Compact & Prominent */}
        <View style={styles.recommendationsSection}>
          <View style={styles.recommendationsHeader}>
            <IconSymbol name="sparkles" size={22} color="#F59E0B" />
            <Text style={styles.recommendationsTitle}>Recomendaciones IA</Text>
            {recommendations.length > 0 && (
              <View style={styles.recommendationsBadge}>
                <Text style={styles.recommendationsBadgeText}>{recommendations.length}</Text>
              </View>
            )}
          </View>

          {recommendations.length === 0 ? (
            <TouchableOpacity
              style={styles.generateCompactButton}
              onPress={generateRecommendations}
              disabled={generatingRecommendations}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.generateCompactGradient}
              >
                {generatingRecommendations ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <IconSymbol name="sparkles" size={18} color="#FFFFFF" />
                    <Text style={styles.generateCompactText}>Generar Recomendaciones</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <>
              {recommendations.map((rec) => (
                <View key={rec.id} style={styles.compactRecommendationCard}>
                  <TouchableOpacity
                    style={styles.recommendationHeader}
                    onPress={() => setExpandedRecommendation(expandedRecommendation === rec.id ? null : rec.id)}
                  >
                    <View style={styles.recommendationTitleRow}>
                      <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(rec.prioridad) }]} />
                      <Text style={styles.compactRecommendationTitle} numberOfLines={expandedRecommendation === rec.id ? undefined : 1}>
                        {rec.titulo}
                      </Text>
                    </View>
                    <IconSymbol
                      name={expandedRecommendation === rec.id ? 'chevron.up' : 'chevron.down'}
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {expandedRecommendation === rec.id && (
                    <View style={styles.recommendationExpanded}>
                      <Text style={styles.recommendationDescription}>{rec.descripcion}</Text>
                      
                      {rec.acciones_sugeridas && rec.acciones_sugeridas.length > 0 && (
                        <View style={styles.compactActionsContainer}>
                          <Text style={styles.compactActionsTitle}>Acciones:</Text>
                          {rec.acciones_sugeridas.slice(0, 3).map((accion, index) => (
                            <View key={index} style={styles.compactActionItem}>
                              <Text style={styles.compactActionBullet}>•</Text>
                              <Text style={styles.compactActionText}>{accion}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      <View style={styles.recommendationFooter}>
                        <View style={styles.compactImpactBadge}>
                          <Text style={styles.compactImpactText}>{rec.impacto_estimado}</Text>
                        </View>
                        <View style={styles.compactConfidenceBadge}>
                          <Text style={styles.compactConfidenceText}>
                            {Math.round(rec.confianza * 100)}% confianza
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              ))}
              
              <TouchableOpacity
                style={styles.refreshRecommendationsCompact}
                onPress={generateRecommendations}
                disabled={generatingRecommendations}
              >
                <IconSymbol name="arrow.clockwise" size={16} color={colors.primary} />
                <Text style={styles.refreshRecommendationsText}>Actualizar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Compact Best Times & Days */}
        <View style={styles.compactSection}>
          <Text style={styles.compactSectionTitle}>⏰ Mejores Momentos</Text>
          <View style={styles.timesAndDaysRow}>
            {/* Best Hours */}
            <View style={styles.halfCard}>
              <Text style={styles.halfCardTitle}>Horarios</Text>
              {analyticsData.bestPostingTimes.slice(0, 3).map((time, index) => (
                <View key={index} style={styles.compactTimeItem}>
                  <View style={styles.compactTimeRank}>
                    <Text style={styles.compactTimeRankText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.compactTimeText}>{time.hour}:00</Text>
                </View>
              ))}
            </View>

            {/* Best Days */}
            <View style={styles.halfCard}>
              <Text style={styles.halfCardTitle}>Días</Text>
              {analyticsData.bestDays.slice(0, 3).map((day, index) => (
                <View key={index} style={styles.compactTimeItem}>
                  <View style={styles.compactTimeRank}>
                    <Text style={styles.compactTimeRankText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.compactTimeText}>{dayNames[day.day]}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Compact Content Stats */}
        <View style={styles.compactSection}>
          <Text style={styles.compactSectionTitle}>📊 Contenido</Text>
          <View style={styles.contentStatsCompactRow}>
            <View style={styles.contentStatCompactItem}>
              <IconSymbol name="photo.fill" size={24} color={colors.primary} />
              <Text style={styles.contentStatCompactValue}>{analyticsData.stats.total_posts}</Text>
              <Text style={styles.contentStatCompactLabel}>Posts</Text>
            </View>
            <View style={styles.contentStatCompactItem}>
              <IconSymbol name="camera.fill" size={24} color="#8B5CF6" />
              <Text style={styles.contentStatCompactValue}>{analyticsData.stats.total_stories}</Text>
              <Text style={styles.contentStatCompactLabel}>Historias</Text>
            </View>
            <View style={styles.contentStatCompactItem}>
              <IconSymbol name="calendar" size={24} color="#F59E0B" />
              <Text style={styles.contentStatCompactValue}>{analyticsData.stats.total_eventos}</Text>
              <Text style={styles.contentStatCompactLabel}>Eventos</Text>
            </View>
          </View>
        </View>

        {/* Compact Audience */}
        <View style={styles.compactSection}>
          <Text style={styles.compactSectionTitle}>👥 Audiencia</Text>
          <View style={styles.audienceCompactCard}>
            <View style={styles.audienceCompactRow}>
              <IconSymbol name="person.2.fill" size={20} color={colors.primary} />
              <Text style={styles.audienceCompactValue}>{analyticsData.local.seguidores.toLocaleString()}</Text>
              <Text style={styles.audienceCompactLabel}>Seguidores</Text>
            </View>
            <View style={styles.audienceCompactRow}>
              <IconSymbol name="location.fill" size={20} color="#10B981" />
              <Text style={styles.audienceCompactValue}>{analyticsData.local.check_ins.toLocaleString()}</Text>
              <Text style={styles.audienceCompactLabel}>Check-ins</Text>
            </View>
            <View style={styles.audienceCompactRow}>
              <IconSymbol name="star.fill" size={20} color="#F59E0B" />
              <Text style={styles.audienceCompactValue}>{analyticsData.local.rating.toFixed(1)}</Text>
              <Text style={styles.audienceCompactLabel}>Rating</Text>
            </View>
          </View>
        </View>

        {/* Info Footer */}
        <View style={styles.compactInfoBanner}>
          <IconSymbol name="info.circle.fill" size={16} color={colors.primary} />
          <Text style={styles.compactInfoText}>
            Las recomendaciones de IA incluyen cuándo publicar eventos y destacar tu local para máxima visibilidad.
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
  compactHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerBackButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.headerText,
    opacity: 0.9,
  },
  headerRefreshButton: {
    padding: 4,
  },
  inlineTimeRange: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  inlineTimeButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  inlineTimeButtonActive: {
    backgroundColor: colors.headerText,
  },
  inlineTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.headerText,
  },
  inlineTimeTextActive: {
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
    padding: 16,
    paddingBottom: 100,
  },
  compactStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  compactStatCard: {
    width: (width - 48) / 3,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  compactStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
  },
  compactStatLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  recommendationsSection: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  recommendationsBadge: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  recommendationsBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  generateCompactButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  generateCompactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  generateCompactText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  compactRecommendationCard: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
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
    gap: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactRecommendationTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  recommendationExpanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  recommendationDescription: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    marginBottom: 12,
  },
  compactActionsContainer: {
    marginBottom: 12,
  },
  compactActionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  compactActionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  compactActionBullet: {
    fontSize: 13,
    color: colors.primary,
    marginRight: 6,
    marginTop: 1,
  },
  compactActionText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  recommendationFooter: {
    flexDirection: 'row',
    gap: 8,
  },
  compactImpactBadge: {
    flex: 1,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  compactImpactText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#065F46',
  },
  compactConfidenceBadge: {
    flex: 1,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  compactConfidenceText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1E40AF',
  },
  refreshRecommendationsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
  },
  refreshRecommendationsText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  compactSection: {
    marginBottom: 16,
  },
  compactSectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  timesAndDaysRow: {
    flexDirection: 'row',
    gap: 8,
  },
  halfCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  halfCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  compactTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  compactTimeRank: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactTimeRankText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  compactTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  contentStatsCompactRow: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  contentStatCompactItem: {
    flex: 1,
    alignItems: 'center',
  },
  contentStatCompactValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
  },
  contentStatCompactLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  audienceCompactCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  audienceCompactRow: {
    flex: 1,
    alignItems: 'center',
  },
  audienceCompactValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
  },
  audienceCompactLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  compactInfoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.primary + '10',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  compactInfoText: {
    flex: 1,
    fontSize: 11,
    color: colors.text,
    lineHeight: 16,
  },
});
