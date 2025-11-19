
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
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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
    tipo: string;
    provincia: string;
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
  const [selectedRecommendation, setSelectedRecommendation] = useState<AIRecommendation | null>(null);
  const [showRecommendationModal, setShowRecommendationModal] = useState(false);

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
        .select('id, nombre, imagen_url, propietario_id, seguidores, check_ins, rating, tipo, provincia')
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

  const openRecommendationModal = (recommendation: AIRecommendation) => {
    setSelectedRecommendation(recommendation);
    setShowRecommendationModal(true);
  };

  const renderCompactStat = (icon: string, value: string | number, label: string, color: string) => (
    <View style={styles.compactStat}>
      <View style={[styles.compactStatIcon, { backgroundColor: color + '20' }]}>
        <IconSymbol name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.compactStatContent}>
        <Text style={styles.compactStatValue}>{value}</Text>
        <Text style={styles.compactStatLabel}>{label}</Text>
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
      {/* Compact Header */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={22} color={colors.headerText} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Analíticas</Text>
            <Text style={styles.headerSubtitle}>{analyticsData.local.nombre}</Text>
          </View>
          <TouchableOpacity
            style={styles.headerActionButton}
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
          {['7d', '30d', '90d'].map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.inlineTimeButton, timeRange === range && styles.inlineTimeButtonActive]}
              onPress={() => setTimeRange(range as any)}
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
        {/* Local Info Card */}
        <View style={styles.localInfoCard}>
          <View style={styles.localInfoHeader}>
            <View style={styles.localInfoContent}>
              <Text style={styles.localInfoName}>{analyticsData.local.nombre}</Text>
              <Text style={styles.localInfoDetails}>
                {analyticsData.local.tipo} • {analyticsData.local.provincia}
              </Text>
            </View>
            <View style={styles.planBadge}>
              <IconSymbol name="star.fill" size={12} color="#FFFFFF" />
              <Text style={styles.planBadgeText}>{analyticsData.subscription.plan_nombre.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Hero Stats - 2x2 Grid */}
        <View style={styles.heroGrid}>
          <View style={[styles.heroCard, { backgroundColor: '#3B82F6' }]}>
            <IconSymbol name="eye.fill" size={24} color="#FFFFFF" />
            <Text style={styles.heroValue}>{analyticsData.stats.total_views.toLocaleString()}</Text>
            <Text style={styles.heroLabel}>Vistas</Text>
          </View>
          <View style={[styles.heroCard, { backgroundColor: '#EF4444' }]}>
            <IconSymbol name="heart.fill" size={24} color="#FFFFFF" />
            <Text style={styles.heroValue}>{analyticsData.stats.total_likes.toLocaleString()}</Text>
            <Text style={styles.heroLabel}>Me Gusta</Text>
          </View>
          <View style={[styles.heroCard, { backgroundColor: '#10B981' }]}>
            <IconSymbol name="person.2.badge.plus" size={24} color="#FFFFFF" />
            <Text style={styles.heroValue}>{analyticsData.stats.nuevos_seguidores.toLocaleString()}</Text>
            <Text style={styles.heroLabel}>Seguidores</Text>
          </View>
          <View style={[styles.heroCard, { backgroundColor: '#F59E0B' }]}>
            <IconSymbol name="chart.line.uptrend.xyaxis" size={24} color="#FFFFFF" />
            <Text style={styles.heroValue}>{analyticsData.stats.engagement_rate.toFixed(1)}%</Text>
            <Text style={styles.heroLabel}>Engagement</Text>
          </View>
        </View>

        {/* AI Recommendations - Clickable Cards */}
        {recommendations.length > 0 && (
          <View style={styles.compactSection}>
            <View style={styles.compactSectionHeader}>
              <IconSymbol name="sparkles" size={18} color="#F59E0B" />
              <Text style={styles.compactSectionTitle}>Recomendaciones de IA</Text>
              <TouchableOpacity onPress={generateRecommendations} disabled={generatingRecommendations}>
                <IconSymbol name="arrow.clockwise" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
            {recommendations.map((rec) => (
              <TouchableOpacity 
                key={rec.id} 
                style={styles.recommendationCard}
                onPress={() => openRecommendationModal(rec)}
                activeOpacity={0.7}
              >
                <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(rec.prioridad) }]}>
                  <IconSymbol name={getPriorityIcon(rec.prioridad) as any} size={16} color="#FFFFFF" />
                </View>
                <View style={styles.recommendationContent}>
                  <View style={styles.recommendationHeader}>
                    <Text style={styles.recommendationTitle}>{rec.titulo}</Text>
                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(rec.prioridad) }]}>
                      <Text style={styles.priorityBadgeText}>{rec.prioridad.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.recommendationDesc} numberOfLines={2}>{rec.descripcion}</Text>
                  <View style={styles.recommendationFooter}>
                    <View style={styles.impactBadge}>
                      <IconSymbol name="chart.bar.fill" size={12} color="#10B981" />
                      <Text style={styles.impactText}>{rec.impacto_estimado}</Text>
                    </View>
                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceText}>{Math.round(rec.confianza * 100)}% confianza</Text>
                    </View>
                  </View>
                </View>
                <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Content & Audience - Side by Side */}
        <View style={styles.dualSection}>
          <View style={styles.dualCard}>
            <View style={styles.dualCardHeader}>
              <IconSymbol name="photo.fill" size={16} color={colors.primary} />
              <Text style={styles.dualCardTitle}>Contenido</Text>
            </View>
            {renderCompactStat('photo.fill', analyticsData.stats.total_posts, 'Posts', '#3B82F6')}
            {renderCompactStat('camera.fill', analyticsData.stats.total_stories, 'Historias', '#8B5CF6')}
            {renderCompactStat('calendar', analyticsData.stats.total_eventos, 'Eventos', '#F59E0B')}
          </View>

          <View style={styles.dualCard}>
            <View style={styles.dualCardHeader}>
              <IconSymbol name="person.2.fill" size={16} color={colors.primary} />
              <Text style={styles.dualCardTitle}>Audiencia</Text>
            </View>
            {renderCompactStat('person.2.fill', analyticsData.local.seguidores.toLocaleString(), 'Seguidores', '#3B82F6')}
            {renderCompactStat('location.fill', analyticsData.local.check_ins.toLocaleString(), 'Check-ins', '#10B981')}
            {renderCompactStat('star.fill', analyticsData.local.rating.toFixed(1), 'Rating', '#F59E0B')}
          </View>
        </View>

        {/* Trend Chart - Compact */}
        {analyticsData.timeSeriesData.length > 0 && (
          <View style={styles.compactSection}>
            <View style={styles.compactSectionHeader}>
              <IconSymbol name="chart.bar.fill" size={18} color={colors.primary} />
              <Text style={styles.compactSectionTitle}>Tendencia</Text>
            </View>
            <View style={styles.miniChart}>
              {analyticsData.timeSeriesData.slice(-7).map((data, index) => {
                const maxValue = Math.max(...analyticsData.timeSeriesData.map((d) => d.views + d.interactions));
                const height = ((data.views + data.interactions) / maxValue) * 100;
                return (
                  <View key={index} style={styles.miniBar}>
                    <View style={[styles.miniBarFill, { height: `${height}%` }]} />
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Best Times - Horizontal Pills */}
        {analyticsData.bestPostingTimes.length > 0 && (
          <View style={styles.compactSection}>
            <View style={styles.compactSectionHeader}>
              <IconSymbol name="clock.fill" size={18} color={colors.primary} />
              <Text style={styles.compactSectionTitle}>Mejores Horarios</Text>
            </View>
            <View style={styles.pillsContainer}>
              {analyticsData.bestPostingTimes.map((time, index) => (
                <View key={index} style={[styles.timePill, { backgroundColor: index === 0 ? '#F59E0B' : index === 1 ? '#3B82F6' : '#10B981' }]}>
                  <Text style={styles.timePillText}>#{index + 1}</Text>
                  <Text style={styles.timePillTime}>{time.hour}:00</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Top Content - Minimal */}
        {analyticsData.topContent.length > 0 && (
          <View style={styles.compactSection}>
            <View style={styles.compactSectionHeader}>
              <IconSymbol name="trophy.fill" size={18} color={colors.primary} />
              <Text style={styles.compactSectionTitle}>Top Posts</Text>
            </View>
            {analyticsData.topContent.slice(0, 3).map((content, index) => (
              <View key={content.id} style={styles.topContentMini}>
                <View style={[styles.topRank, { backgroundColor: index === 0 ? '#F59E0B' : index === 1 ? '#3B82F6' : '#10B981' }]}>
                  <Text style={styles.topRankText}>#{index + 1}</Text>
                </View>
                <Text style={styles.topContentMiniText} numberOfLines={1}>{content.contenido || 'Sin texto'}</Text>
                <View style={styles.topContentMiniStats}>
                  <View style={styles.topContentMiniStat}>
                    <IconSymbol name="heart.fill" size={12} color="#EF4444" />
                    <Text style={styles.topContentMiniStatText}>{content.likes}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Recommendation Detail Modal */}
      <Modal
        visible={showRecommendationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRecommendationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedRecommendation && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalPriorityBadge, { backgroundColor: getPriorityColor(selectedRecommendation.prioridad) }]}>
                    <IconSymbol name={getPriorityIcon(selectedRecommendation.prioridad) as any} size={20} color="#FFFFFF" />
                    <Text style={styles.modalPriorityText}>{selectedRecommendation.prioridad.toUpperCase()}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowRecommendationModal(false)} style={styles.modalCloseButton}>
                    <IconSymbol name="xmark.circle.fill" size={28} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalTitle}>{selectedRecommendation.titulo}</Text>
                  <Text style={styles.modalDescription}>{selectedRecommendation.descripcion}</Text>

                  <View style={styles.modalMetrics}>
                    <View style={styles.modalMetric}>
                      <IconSymbol name="chart.bar.fill" size={18} color="#10B981" />
                      <Text style={styles.modalMetricLabel}>Impacto Estimado</Text>
                      <Text style={styles.modalMetricValue}>{selectedRecommendation.impacto_estimado}</Text>
                    </View>
                    <View style={styles.modalMetric}>
                      <IconSymbol name="checkmark.seal.fill" size={18} color="#3B82F6" />
                      <Text style={styles.modalMetricLabel}>Confianza</Text>
                      <Text style={styles.modalMetricValue}>{Math.round(selectedRecommendation.confianza * 100)}%</Text>
                    </View>
                  </View>

                  {selectedRecommendation.acciones_sugeridas && selectedRecommendation.acciones_sugeridas.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Acciones Sugeridas</Text>
                      {selectedRecommendation.acciones_sugeridas.map((accion, index) => (
                        <View key={index} style={styles.modalActionItem}>
                          <View style={styles.modalActionBullet}>
                            <Text style={styles.modalActionBulletText}>{index + 1}</Text>
                          </View>
                          <Text style={styles.modalActionText}>{accion}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {selectedRecommendation.datos_soporte && Object.keys(selectedRecommendation.datos_soporte).length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Datos de Soporte</Text>
                      <View style={styles.modalDataCard}>
                        <Text style={styles.modalDataText}>{JSON.stringify(selectedRecommendation.datos_soporte, null, 2)}</Text>
                      </View>
                    </View>
                  )}
                </ScrollView>

                <TouchableOpacity 
                  style={styles.modalActionButton}
                  onPress={() => setShowRecommendationModal(false)}
                >
                  <LinearGradient
                    colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                    style={styles.modalActionButtonGradient}
                  >
                    <Text style={styles.modalActionButtonText}>Entendido</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  headerActionButton: {
    padding: 4,
  },
  inlineTimeRange: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 4,
  },
  inlineTimeButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  inlineTimeButtonActive: {
    backgroundColor: colors.white,
  },
  inlineTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.headerText,
  },
  inlineTimeTextActive: {
    color: colors.primary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  backButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 100,
  },
  localInfoCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  localInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  localInfoContent: {
    flex: 1,
  },
  localInfoName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  localInfoDetails: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  heroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  heroCard: {
    width: (width - 32) / 2,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  heroValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  heroLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  compactSection: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  compactSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  compactSectionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  recommendationCard: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  priorityIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  recommendationTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  recommendationDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  recommendationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  impactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  impactText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#065F46',
  },
  confidenceBadge: {
    backgroundColor: colors.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
  },
  dualSection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  dualCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  dualCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dualCardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
  },
  compactStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  compactStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactStatContent: {
    flex: 1,
  },
  compactStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  compactStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  miniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 60,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 8,
  },
  miniBar: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  miniBarFill: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
    minHeight: 4,
  },
  pillsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  timePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timePillText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timePillTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  topContentMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    gap: 8,
  },
  topRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRankText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  topContentMiniText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
  },
  topContentMiniStats: {
    flexDirection: 'row',
    gap: 8,
  },
  topContentMiniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  topContentMiniStatText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalPriorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  modalPriorityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScroll: {
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  modalMetrics: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  modalMetric: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalMetricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  modalMetricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  modalActionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalActionBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionBulletText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalActionText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  modalDataCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalDataText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalActionButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalActionButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalActionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
