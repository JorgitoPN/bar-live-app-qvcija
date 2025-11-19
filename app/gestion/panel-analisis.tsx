
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
    total_profile_views?: number;
    total_map_views?: number;
    total_search_appearances?: number;
    total_event_interactions?: number;
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

    // Real-time synchronization for analytics
    console.log('[PanelAnalisis] 🔄 Setting up real-time subscriptions for local:', localId);

    const postsChannel = supabase
      .channel(`analytics-posts-${localId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `local_id=eq.${localId}`,
        },
        (payload) => {
          console.log('[PanelAnalisis] 📊 Posts changed, reloading analytics');
          loadAnalyticsData();
        }
      )
      .subscribe();

    const storiesChannel = supabase
      .channel(`analytics-stories-${localId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'historias',
          filter: `local_id=eq.${localId}`,
        },
        (payload) => {
          console.log('[PanelAnalisis] 📊 Stories changed, reloading analytics');
          loadAnalyticsData();
        }
      )
      .subscribe();

    const eventsChannel = supabase
      .channel(`analytics-events-${localId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'eventos',
          filter: `local_id=eq.${localId}`,
        },
        (payload) => {
          console.log('[PanelAnalisis] 📊 Events changed, reloading analytics');
          loadAnalyticsData();
        }
      )
      .subscribe();

    const followersChannel = supabase
      .channel(`analytics-followers-${localId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'locales_favoritos',
          filter: `local_id=eq.${localId}`,
        },
        (payload) => {
          console.log('[PanelAnalisis] 📊 Followers changed, reloading analytics');
          loadAnalyticsData();
        }
      )
      .subscribe();

    const checkInsChannel = supabase
      .channel(`analytics-checkins-${localId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins',
          filter: `local_id=eq.${localId}`,
        },
        (payload) => {
          console.log('[PanelAnalisis] 📊 Check-ins changed, reloading analytics');
          loadAnalyticsData();
        }
      )
      .subscribe();

    return () => {
      console.log('[PanelAnalisis] 🧹 Cleaning up real-time subscriptions');
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(storiesChannel);
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(followersChannel);
      supabase.removeChannel(checkInsChannel);
    };
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
        .from('locales_favoritos')
        .select('created_at')
        .eq('local_id', localId)
        .gte('created_at', startDate.toISOString());

      const { data: profileViewsData } = await supabase
        .from('profile_views')
        .select('id, created_at')
        .eq('local_id', localId)
        .gte('created_at', startDate.toISOString());

      const { data: mapViewsData } = await supabase
        .from('map_interactions')
        .select('id, created_at')
        .eq('local_id', localId)
        .gte('created_at', startDate.toISOString());

      const { data: searchAppearancesData } = await supabase
        .from('search_results')
        .select('id, created_at')
        .eq('local_id', localId)
        .gte('created_at', startDate.toISOString());

      const { data: eventInteractionsData } = await supabase
        .from('evento_interacciones')
        .select('id, created_at, tipo')
        .eq('local_id', localId)
        .gte('created_at', startDate.toISOString());

      const totalPosts = postsData?.length || 0;
      const totalStories = storiesData?.length || 0;
      const totalLikes = (postsData?.reduce((sum, p) => sum + (p.likes || 0), 0) || 0) + (storyLikesData?.length || 0);
      const totalComments = postsData?.reduce((sum, p) => sum + (p.comentarios || 0), 0) || 0;
      const totalViews = (storyViewsData?.length || 0) + (checkInsData?.length || 0);
      const totalEventos = eventosData?.length || 0;
      const nuevosSeguidores = newFollowersData?.length || 0;

      const totalProfileViews = profileViewsData?.length || 0;
      const totalMapViews = mapViewsData?.length || 0;
      const totalSearchAppearances = searchAppearancesData?.length || 0;
      const totalEventInteractions = eventInteractionsData?.length || 0;

      const totalReach = totalViews + totalProfileViews + totalMapViews + totalSearchAppearances;
      
      const totalInteractions = totalLikes + totalComments + totalEventInteractions;
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
          reach: totalReach,
          total_profile_views: totalProfileViews,
          total_map_views: totalMapViews,
          total_search_appearances: totalSearchAppearances,
          total_event_interactions: totalEventInteractions,
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
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Panel de Análisis</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{analyticsData.local.nombre}</Text>
          </View>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={generateRecommendations}
            disabled={generatingRecommendations}
          >
            {generatingRecommendations ? (
              <ActivityIndicator size="small" color={colors.headerText} />
            ) : (
              <IconSymbol name="sparkles" size={24} color={colors.headerText} />
            )}
          </TouchableOpacity>
        </View>

        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {['7d', '30d', '90d'].map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.timeButton, timeRange === range && styles.timeButtonActive]}
              onPress={() => setTimeRange(range as any)}
            >
              <Text style={[styles.timeButtonText, timeRange === range && styles.timeButtonTextActive]}>
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
        {/* Info Card - What is this? */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <IconSymbol name="info.circle.fill" size={20} color={colors.primary} />
            <Text style={styles.infoCardTitle}>¿Qué es el Panel de Análisis?</Text>
          </View>
          <Text style={styles.infoCardText}>
            Aquí puedes ver cómo está funcionando tu local en BarLive. Te mostramos cuántas personas ven tu local, 
            cuántos les gusta tu contenido y te damos consejos para mejorar. Todo en tiempo real y fácil de entender.
          </Text>
        </View>

        {/* Main Stats - Simple Cards */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="chart.bar.fill" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Resumen General</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Estas son las cifras más importantes de tu local en los últimos {timeRange === '7d' ? '7 días' : timeRange === '30d' ? '30 días' : '90 días'}
          </Text>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
              <IconSymbol name="eye.fill" size={28} color="#3B82F6" />
              <Text style={styles.statValue}>{analyticsData.stats.reach.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Personas Alcanzadas</Text>
              <Text style={styles.statHelp}>Cuántas personas vieron tu local</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
              <IconSymbol name="heart.fill" size={28} color="#F59E0B" />
              <Text style={styles.statValue}>{analyticsData.stats.total_likes.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Me Gusta</Text>
              <Text style={styles.statHelp}>A cuántas personas les gustó</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
              <IconSymbol name="person.2.fill" size={28} color="#10B981" />
              <Text style={styles.statValue}>{analyticsData.stats.nuevos_seguidores.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Nuevos Seguidores</Text>
              <Text style={styles.statHelp}>Personas que te siguen ahora</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#FCE7F3' }]}>
              <IconSymbol name="chart.line.uptrend.xyaxis" size={28} color="#EC4899" />
              <Text style={styles.statValue}>{analyticsData.stats.engagement_rate.toFixed(1)}%</Text>
              <Text style={styles.statLabel}>Interacción</Text>
              <Text style={styles.statHelp}>Qué tan activa es tu audiencia</Text>
            </View>
          </View>
        </View>

        {/* AI Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="sparkles" size={20} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Consejos Personalizados</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Nuestra inteligencia artificial ha analizado tu local y te da estos consejos para mejorar
            </Text>

            {recommendations.map((rec) => (
              <TouchableOpacity 
                key={rec.id} 
                style={styles.recommendationCard}
                onPress={() => openRecommendationModal(rec)}
                activeOpacity={0.7}
              >
                <View style={[styles.recPriorityDot, { backgroundColor: getPriorityColor(rec.prioridad) }]} />
                <View style={styles.recContent}>
                  <Text style={styles.recTitle} numberOfLines={2}>{rec.titulo}</Text>
                  <Text style={styles.recDescription} numberOfLines={2}>{rec.descripcion}</Text>
                  <View style={styles.recFooter}>
                    <View style={styles.recBadge}>
                      <IconSymbol name="chart.bar.fill" size={12} color="#10B981" />
                      <Text style={styles.recBadgeText} numberOfLines={1}>{rec.impacto_estimado}</Text>
                    </View>
                    <View style={styles.recConfidenceBadge}>
                      <Text style={styles.recConfidenceText}>{Math.round(rec.confianza * 100)}%</Text>
                    </View>
                  </View>
                </View>
                <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Where People See You */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="location.fill" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Dónde Te Ven</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Estos son los lugares de BarLive donde las personas encuentran tu local
          </Text>

          <View style={styles.platformGrid}>
            <View style={styles.platformCard}>
              <View style={[styles.platformIcon, { backgroundColor: '#EFF6FF' }]}>
                <IconSymbol name="person.fill" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.platformValue}>{analyticsData.stats.total_profile_views?.toLocaleString() || 0}</Text>
              <Text style={styles.platformLabel}>Visitas al Perfil</Text>
              <Text style={styles.platformHelp}>Personas que entraron a ver tu perfil completo</Text>
            </View>

            <View style={styles.platformCard}>
              <View style={[styles.platformIcon, { backgroundColor: '#D1FAE5' }]}>
                <IconSymbol name="map.fill" size={24} color="#10B981" />
              </View>
              <Text style={styles.platformValue}>{analyticsData.stats.total_map_views?.toLocaleString() || 0}</Text>
              <Text style={styles.platformLabel}>Vistas en Mapa</Text>
              <Text style={styles.platformHelp}>Personas que te vieron en el mapa de locales</Text>
            </View>

            <View style={styles.platformCard}>
              <View style={[styles.platformIcon, { backgroundColor: '#FEF3C7' }]}>
                <IconSymbol name="magnifyingglass" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.platformValue}>{analyticsData.stats.total_search_appearances?.toLocaleString() || 0}</Text>
              <Text style={styles.platformLabel}>Búsquedas</Text>
              <Text style={styles.platformHelp}>Veces que apareciste en resultados de búsqueda</Text>
            </View>

            <View style={styles.platformCard}>
              <View style={[styles.platformIcon, { backgroundColor: '#F3E8FF' }]}>
                <IconSymbol name="calendar" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.platformValue}>{analyticsData.stats.total_event_interactions?.toLocaleString() || 0}</Text>
              <Text style={styles.platformLabel}>Eventos</Text>
              <Text style={styles.platformHelp}>Interacciones con tus eventos publicados</Text>
            </View>
          </View>
        </View>

        {/* Your Content */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="photo.fill" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Tu Contenido</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Resumen de lo que has publicado y cómo ha funcionado
          </Text>

          <View style={styles.contentGrid}>
            <View style={styles.contentCard}>
              <IconSymbol name="photo.fill" size={32} color="#3B82F6" />
              <Text style={styles.contentValue}>{analyticsData.stats.total_posts}</Text>
              <Text style={styles.contentLabel}>Publicaciones</Text>
            </View>
            <View style={styles.contentCard}>
              <IconSymbol name="camera.fill" size={32} color="#8B5CF6" />
              <Text style={styles.contentValue}>{analyticsData.stats.total_stories}</Text>
              <Text style={styles.contentLabel}>Historias</Text>
            </View>
            <View style={styles.contentCard}>
              <IconSymbol name="calendar" size={32} color="#F59E0B" />
              <Text style={styles.contentValue}>{analyticsData.stats.total_eventos}</Text>
              <Text style={styles.contentLabel}>Eventos</Text>
            </View>
          </View>
        </View>

        {/* Best Times to Post */}
        {analyticsData.bestPostingTimes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="clock.fill" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Mejores Horarios</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Estos son los mejores momentos para publicar según tu audiencia
            </Text>

            <View style={styles.timesContainer}>
              {analyticsData.bestPostingTimes.map((time, index) => (
                <View key={index} style={styles.timeCard}>
                  <View style={[styles.timeRank, { backgroundColor: index === 0 ? '#F59E0B' : index === 1 ? '#3B82F6' : '#10B981' }]}>
                    <Text style={styles.timeRankText}>#{index + 1}</Text>
                  </View>
                  <Text style={styles.timeValue}>{time.hour}:00 - {time.hour + 1}:00</Text>
                  <Text style={styles.timeHelp}>Mejor momento para publicar</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Best Days */}
        {analyticsData.bestDays.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="calendar" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Mejores Días</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Los días de la semana donde tu contenido funciona mejor
            </Text>

            <View style={styles.daysContainer}>
              {analyticsData.bestDays.map((day, index) => (
                <View key={index} style={styles.dayCard}>
                  <View style={[styles.dayRank, { backgroundColor: index === 0 ? '#F59E0B' : index === 1 ? '#3B82F6' : '#10B981' }]}>
                    <Text style={styles.dayRankText}>#{index + 1}</Text>
                  </View>
                  <Text style={styles.dayValue}>{dayNames[day.day]}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bottom Spacer */}
        <View style={{ height: 100 }} />
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
                    <IconSymbol name="xmark.circle.fill" size={32} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalTitle}>{selectedRecommendation.titulo}</Text>
                  <Text style={styles.modalDescription}>{selectedRecommendation.descripcion}</Text>

                  <View style={styles.modalMetrics}>
                    <View style={styles.modalMetric}>
                      <IconSymbol name="chart.bar.fill" size={20} color="#10B981" />
                      <Text style={styles.modalMetricLabel}>Impacto Esperado</Text>
                      <Text style={styles.modalMetricValue}>{selectedRecommendation.impacto_estimado}</Text>
                    </View>
                    <View style={styles.modalMetric}>
                      <IconSymbol name="checkmark.seal.fill" size={20} color="#3B82F6" />
                      <Text style={styles.modalMetricLabel}>Confianza</Text>
                      <Text style={styles.modalMetricValue}>{Math.round(selectedRecommendation.confianza * 100)}%</Text>
                    </View>
                  </View>

                  {selectedRecommendation.acciones_sugeridas && selectedRecommendation.acciones_sugeridas.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Qué Puedes Hacer</Text>
                      <Text style={styles.modalSectionHelp}>Sigue estos pasos para mejorar tu local:</Text>
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
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerBackButton: {
    padding: 4,
    marginRight: 8,
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
  headerActionButton: {
    padding: 4,
    marginLeft: 8,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    padding: 4,
  },
  timeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeButtonActive: {
    backgroundColor: colors.white,
  },
  timeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.headerText,
  },
  timeButtonTextActive: {
    color: colors.primary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  backButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 10,
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
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  infoCardText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 44) / 2,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 4,
    textAlign: 'center',
  },
  statHelp: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  recommendationCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  recPriorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recContent: {
    flex: 1,
  },
  recTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  recDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  recFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 1,
  },
  recBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
    flexShrink: 1,
  },
  recConfidenceBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recConfidenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  platformCard: {
    width: (width - 44) / 2,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  platformIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  platformValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  platformLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  platformHelp: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  contentGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  contentCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  contentValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  contentLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  timesContainer: {
    gap: 12,
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  timeRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeRankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timeValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  timeHelp: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  daysContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dayCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  dayRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayRankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dayValue: {
    fontSize: 14,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 20,
  },
  modalMetrics: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  modalMetric: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalMetricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  modalMetricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  modalSectionHelp: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
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
