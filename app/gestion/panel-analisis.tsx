
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

      const totalPosts = postsData?.length || 0;
      const totalStories = storiesData?.length || 0;
      const totalLikes = (postsData?.reduce((sum, p) => sum + (p.likes || 0), 0) || 0) + (storyLikesData?.length || 0);
      const totalComments = postsData?.reduce((sum, p) => sum + (p.comentarios || 0), 0) || 0;
      const totalViews = (storyViewsData?.length || 0) + (checkInsData?.length || 0);
      const totalEventos = eventosData?.length || 0;
      const nuevosSeguidores = newFollowersData?.length || 0;

      const totalInteractions = totalLikes + totalComments;
      const engagementRate = totalPosts + totalStories > 0 ? ((totalInteractions / (totalPosts + totalStories)) * 100) : 0;

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

  const getPriorityIcon = (prioridad: string): 'exclamationmark.triangle.fill' | 'star.fill' | 'lightbulb.fill' | 'info.circle.fill' => {
    switch (prioridad) {
      case 'urgente':
        return 'exclamationmark.triangle.fill';
      case 'alta':
        return 'star.fill';
      case 'media':
        return 'lightbulb.fill';
      default:
        return 'info.circle.fill';
    }
  };

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
        <IconSymbol ios_icon_name="exclamationmark.triangle" android_material_icon_name="warning" size={64} color={colors.textSecondary} />
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
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Panel de Análisis</Text>
            <Text style={styles.headerSubtitle}>{analyticsData.local.nombre}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={generateRecommendations}
              disabled={generatingRecommendations}
            >
              {generatingRecommendations ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.timeRangeContainer}>
          {(['7d', '30d', '90d'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.timeButton, timeRange === range && styles.timeButtonActive]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[styles.timeText, timeRange === range && styles.timeTextActive]}>
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
        <View style={styles.centeredContainer}>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={20} color="#3B82F6" />
              <Text style={styles.metricValue}>{analyticsData.stats.total_views.toLocaleString()}</Text>
              <Text style={styles.metricLabel}>Vistas</Text>
            </View>
            <View style={styles.metricCard}>
              <IconSymbol ios_icon_name="heart.fill" android_material_icon_name="favorite" size={20} color="#EF4444" />
              <Text style={styles.metricValue}>{analyticsData.stats.total_likes.toLocaleString()}</Text>
              <Text style={styles.metricLabel}>Likes</Text>
            </View>
            <View style={styles.metricCard}>
              <IconSymbol ios_icon_name="message.fill" android_material_icon_name="chat" size={20} color="#10B981" />
              <Text style={styles.metricValue}>{analyticsData.stats.total_comments.toLocaleString()}</Text>
              <Text style={styles.metricLabel}>Comentarios</Text>
            </View>
            <View style={styles.metricCard}>
              <IconSymbol ios_icon_name="arrow.up" android_material_icon_name="trending_up" size={20} color="#F59E0B" />
              <Text style={styles.metricValue}>{analyticsData.stats.engagement_rate.toFixed(1)}%</Text>
              <Text style={styles.metricLabel}>Engagement</Text>
            </View>
            <View style={styles.metricCard}>
              <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={20} color="#8B5CF6" />
              <Text style={styles.metricValue}>{analyticsData.stats.nuevos_seguidores.toLocaleString()}</Text>
              <Text style={styles.metricLabel}>Seguidores</Text>
            </View>
            <View style={styles.metricCard}>
              <IconSymbol ios_icon_name="antenna.radiowaves.left.and.right" android_material_icon_name="signal_cellular_alt" size={20} color="#06B6D4" />
              <Text style={styles.metricValue}>{analyticsData.stats.reach.toLocaleString()}</Text>
              <Text style={styles.metricLabel}>Alcance</Text>
            </View>
          </View>

          <View style={styles.aiSection}>
            <View style={styles.aiHeader}>
              <View style={styles.aiTitleRow}>
                <LinearGradient
                  colors={['#F59E0B', '#D97706']}
                  style={styles.aiIconGradient}
                >
                  <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={18} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.aiTitle}>Recomendaciones IA</Text>
                {recommendations.length > 0 && (
                  <View style={styles.aiBadge}>
                    <Text style={styles.aiBadgeText}>{recommendations.length}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.aiSubtitle}>
                Incluye cuándo publicar eventos y destacar tu local
              </Text>
            </View>

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
                    <React.Fragment>
                      <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={18} color="#FFFFFF" />
                      <Text style={styles.generateText}>Generar Recomendaciones</Text>
                    </React.Fragment>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <React.Fragment>
                {recommendations.map((rec, index) => (
                  <View key={rec.id} style={styles.recCard}>
                    <TouchableOpacity
                      style={styles.recHeader}
                      onPress={() => setExpandedRecommendation(expandedRecommendation === rec.id ? null : rec.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.recTitleRow}>
                        <View style={[styles.recIconCircle, { backgroundColor: getPriorityColor(rec.prioridad) }]}>
                          <IconSymbol
                            ios_icon_name={getPriorityIcon(rec.prioridad)}
                            android_material_icon_name={rec.prioridad === 'urgente' ? 'warning' : rec.prioridad === 'alta' ? 'star' : rec.prioridad === 'media' ? 'lightbulb' : 'info'}
                            size={14}
                            color="#FFFFFF"
                          />
                        </View>
                        <Text style={styles.recTitle} numberOfLines={expandedRecommendation === rec.id ? undefined : 2}>
                          {rec.titulo}
                        </Text>
                      </View>
                      <IconSymbol
                        ios_icon_name={expandedRecommendation === rec.id ? 'chevron.up' : 'chevron.down'}
                        android_material_icon_name={expandedRecommendation === rec.id ? 'expand_less' : 'expand_more'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {expandedRecommendation === rec.id && (
                      <View style={styles.recExpanded}>
                        <Text style={styles.recDescription}>{rec.descripcion}</Text>
                        
                        {rec.acciones_sugeridas && rec.acciones_sugeridas.length > 0 && (
                          <View style={styles.actionsContainer}>
                            <Text style={styles.actionsTitle}>Acciones:</Text>
                            {rec.acciones_sugeridas.map((accion, idx) => (
                              <View key={idx} style={styles.actionItem}>
                                <View style={styles.actionDot} />
                                <Text style={styles.actionText}>{accion}</Text>
                              </View>
                            ))}
                          </View>
                        )}

                        <View style={styles.recFooter}>
                          <View style={styles.impactBadge}>
                            <IconSymbol ios_icon_name="arrow.up" android_material_icon_name="trending_up" size={12} color="#065F46" />
                            <Text style={styles.impactText}>{rec.impacto_estimado}</Text>
                          </View>
                          <View style={styles.confidenceBadge}>
                            <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={12} color="#1E40AF" />
                            <Text style={styles.confidenceText}>
                              {Math.round(rec.confianza * 100)}%
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
                
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={generateRecommendations}
                  disabled={generatingRecommendations}
                >
                  <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={16} color={colors.primary} />
                  <Text style={styles.refreshText}>Actualizar</Text>
                </TouchableOpacity>
              </React.Fragment>
            )}
          </View>

          <View style={styles.compactCard}>
            <View style={styles.compactCardHeader}>
              <IconSymbol ios_icon_name="clock.fill" android_material_icon_name="schedule" size={20} color="#F59E0B" />
              <Text style={styles.compactCardTitle}>Mejores Momentos</Text>
            </View>
            <View style={styles.timesRow}>
              <View style={styles.timesColumn}>
                <Text style={styles.timesColumnTitle}>Horarios</Text>
                {analyticsData.bestPostingTimes.slice(0, 3).map((time, idx) => (
                  <View key={idx} style={styles.timeRow}>
                    <View style={[styles.timeRank, { backgroundColor: idx === 0 ? '#F59E0B' : idx === 1 ? '#3B82F6' : '#10B981' }]}>
                      <Text style={styles.timeRankText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.timeValue}>{time.hour}:00</Text>
                  </View>
                ))}
              </View>
              <View style={styles.timesDivider} />
              <View style={styles.timesColumn}>
                <Text style={styles.timesColumnTitle}>Días</Text>
                {analyticsData.bestDays.slice(0, 3).map((day, idx) => (
                  <View key={idx} style={styles.timeRow}>
                    <View style={[styles.timeRank, { backgroundColor: idx === 0 ? '#F59E0B' : idx === 1 ? '#3B82F6' : '#10B981' }]}>
                      <Text style={styles.timeRankText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.timeValue}>{dayNames[day.day]}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.compactCard}>
            <View style={styles.compactCardHeader}>
              <IconSymbol ios_icon_name="square.grid.3x3" android_material_icon_name="grid_view" size={20} color="#8B5CF6" />
              <Text style={styles.compactCardTitle}>Resumen de Contenido</Text>
            </View>
            <View style={styles.contentRow}>
              <View style={styles.contentItem}>
                <IconSymbol ios_icon_name="photo.fill" android_material_icon_name="photo" size={24} color={colors.primary} />
                <Text style={styles.contentValue}>{analyticsData.stats.total_posts}</Text>
                <Text style={styles.contentLabel}>Posts</Text>
              </View>
              <View style={styles.contentItem}>
                <IconSymbol ios_icon_name="camera.fill" android_material_icon_name="camera_alt" size={24} color="#8B5CF6" />
                <Text style={styles.contentValue}>{analyticsData.stats.total_stories}</Text>
                <Text style={styles.contentLabel}>Historias</Text>
              </View>
              <View style={styles.contentItem}>
                <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={24} color="#F59E0B" />
                <Text style={styles.contentValue}>{analyticsData.stats.total_eventos}</Text>
                <Text style={styles.contentLabel}>Eventos</Text>
              </View>
            </View>
          </View>

          <View style={styles.compactCard}>
            <View style={styles.compactCardHeader}>
              <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={20} color={colors.primary} />
              <Text style={styles.compactCardTitle}>Tu Audiencia</Text>
            </View>
            <View style={styles.audienceGrid}>
              <View style={styles.audienceItem}>
                <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={20} color={colors.primary} />
                <Text style={styles.audienceValue}>{analyticsData.local.seguidores.toLocaleString()}</Text>
                <Text style={styles.audienceLabel}>Seguidores</Text>
              </View>
              <View style={styles.audienceItem}>
                <IconSymbol ios_icon_name="location.fill" android_material_icon_name="location_on" size={20} color="#10B981" />
                <Text style={styles.audienceValue}>{analyticsData.local.check_ins.toLocaleString()}</Text>
                <Text style={styles.audienceLabel}>Check-ins</Text>
              </View>
              <View style={styles.audienceItem}>
                <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={20} color="#F59E0B" />
                <Text style={styles.audienceValue}>{analyticsData.local.rating.toFixed(1)}</Text>
                <Text style={styles.audienceLabel}>Rating</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoFooter}>
            <IconSymbol ios_icon_name="lightbulb.fill" android_material_icon_name="lightbulb" size={18} color="#F59E0B" />
            <Text style={styles.infoText}>
              Las recomendaciones de IA analizan tus datos para sugerirte cuándo publicar eventos, 
              destacar tu local y optimizar tu estrategia de contenido.
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
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 20,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 20,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  timeButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  timeButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
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
    paddingBottom: 120,
  },
  centeredContainer: {
    maxWidth: CONTENT_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
    padding: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    width: (Math.min(width, CONTENT_MAX_WIDTH) - 40) / 3,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 6,
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  aiSection: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#F59E0B',
  },
  aiHeader: {
    marginBottom: 12,
  },
  aiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  aiIconGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  aiBadge: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  aiBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  aiSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
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
    gap: 8,
    paddingVertical: 14,
  },
  generateText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  recCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  recExpanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  recDescription: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    marginBottom: 12,
  },
  actionsContainer: {
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
    marginBottom: 6,
  },
  actionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 6,
    marginRight: 8,
  },
  actionText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  recFooter: {
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
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: '#065F46',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1E40AF',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  compactCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  compactCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  compactCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  timesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timesColumn: {
    flex: 1,
  },
  timesColumnTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  timeRank: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeRankText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timeValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  timesDivider: {
    width: 1,
    backgroundColor: colors.cardBorder,
  },
  contentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  contentItem: {
    flex: 1,
    alignItems: 'center',
  },
  contentValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 6,
  },
  contentLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  audienceGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  audienceItem: {
    flex: 1,
    alignItems: 'center',
  },
  audienceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 6,
  },
  audienceLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
  },
});
