
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AnalyticsData {
  fecha: string;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_saves: number;
  posts_publicados: number;
  historias_publicadas: number;
  eventos_creados: number;
  nuevos_seguidores: number;
  check_ins: number;
  visitas_perfil: number;
  engagement_rate: number;
  reach: number;
  impresiones: number;
}

interface Recommendation {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  datos_soporte: any;
  acciones_sugeridas: string[];
  impacto_estimado: string;
  confianza: number;
  estado: 'activa' | 'aplicada' | 'descartada' | 'expirada';
  created_at: string;
}

export default function PanelAnalisisScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const localId = params.localId as string;
  const timeRange = (params.timeRange as string) || '7d';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [generatingRecommendations, setGeneratingRecommendations] = useState(false);

  // ✅ FIXED: Removed unnecessary dependencies
  const loadAnalyticsData = useCallback(async () => {
    if (!localId || !user) return;

    try {
      setLoading(true);
      console.log('[PanelAnalisis] Loading analytics for local:', localId);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 7);
      }

      // Fetch analytics data
      const { data, error } = await supabase
        .from('analytics_data')
        .select('*')
        .eq('local_id', localId)
        .gte('fecha', startDate.toISOString().split('T')[0])
        .lte('fecha', endDate.toISOString().split('T')[0])
        .order('fecha', { ascending: true });

      if (error) {
        console.error('[PanelAnalisis] Error loading analytics:', error);
        Alert.alert('Error', 'No se pudieron cargar las analíticas');
        return;
      }

      console.log('[PanelAnalisis] Analytics data loaded:', data?.length || 0, 'records');
      setAnalyticsData(data || []);
    } catch (error: any) {
      console.error('[PanelAnalisis] Error loading analytics:', error);
      Alert.alert('Error', error.message || 'No se pudieron cargar las analíticas');
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [localId, user, timeRange]);

  // ✅ FIXED: Removed unnecessary dependency
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

  // ✅ FIXED: Removed unnecessary dependency
  const checkAndGenerateRecommendations = useCallback(async () => {
    if (!localId) return;

    try {
      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('id')
        .eq('local_id', localId)
        .eq('estado', 'activa')
        .limit(1);

      if (error) {
        console.error('[PanelAnalisis] Error checking recommendations:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.log('[PanelAnalisis] 🤖 No recommendations found, auto-generating...');
        await generateRecommendations();
      }
    } catch (error) {
      console.error('[PanelAnalisis] Error checking recommendations:', error);
    }
  }, [localId]);

  useEffect(() => {
    if (!localId) {
      Alert.alert('Error', 'No se especificó el local');
      router.back();
      return;
    }

    console.log('[PanelAnalisis] 🔄 Auto-loading analytics and recommendations on page access');
    loadAnalyticsData();
    loadRecommendations();
    checkAndGenerateRecommendations();

    // Set up real-time subscription for new recommendations
    const channel = supabase
      .channel(`analytics:${localId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_recommendations',
          filter: `local_id=eq.${localId}`,
        },
        (payload) => {
          console.log('[PanelAnalisis] New recommendation received:', payload.new);
          setRecommendations((prev) => [payload.new as Recommendation, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [localId, loadAnalyticsData, loadRecommendations, checkAndGenerateRecommendations, router]);

  const generateRecommendations = async () => {
    if (!localId || !user) {
      Alert.alert('Error', 'No se pudo generar recomendaciones');
      return;
    }

    try {
      setGeneratingRecommendations(true);
      console.log('[PanelAnalisis] 🤖 Generating AI recommendations...');

      const { data, error } = await supabase.functions.invoke('generate-analytics-recommendations', {
        body: { localId },
      });

      if (error) {
        console.error('[PanelAnalisis] Error generating recommendations:', error);
        Alert.alert('Error', 'No se pudieron generar las recomendaciones');
        return;
      }

      console.log('[PanelAnalisis] ✅ Recommendations generated successfully');
      Alert.alert('Éxito', 'Recomendaciones generadas correctamente');
      
      // Reload recommendations
      await loadRecommendations();
    } catch (error: any) {
      console.error('[PanelAnalisis] Error:', error);
      Alert.alert('Error', error.message || 'Ocurrió un error al generar las recomendaciones');
    } finally {
      setGeneratingRecommendations(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalyticsData();
    loadRecommendations();
  };

  const getTotalMetric = (metric: keyof AnalyticsData) => {
    return analyticsData.reduce((sum, day) => sum + (Number(day[metric]) || 0), 0);
  };

  const getAverageMetric = (metric: keyof AnalyticsData) => {
    if (analyticsData.length === 0) return 0;
    return getTotalMetric(metric) / analyticsData.length;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgente':
        return '#EF4444';
      case 'alta':
        return '#F59E0B';
      case 'media':
        return '#3B82F6';
      case 'baja':
        return '#10B981';
      default:
        return colors.textSecondary;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgente':
        return 'exclamationmark.triangle.fill';
      case 'alta':
        return 'exclamationmark.circle.fill';
      case 'media':
        return 'info.circle.fill';
      case 'baja':
        return 'checkmark.circle.fill';
      default:
        return 'info.circle';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Panel de Análisis',
            headerShown: true,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando analíticas...</Text>
        </View>
      </View>
    );
  }

  const totalViews = getTotalMetric('total_views');
  const totalLikes = getTotalMetric('total_likes');
  const totalComments = getTotalMetric('total_comments');
  const totalShares = getTotalMetric('total_shares');
  const totalSaves = getTotalMetric('total_saves');
  const avgEngagement = getAverageMetric('engagement_rate');

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Panel de Análisis',
          headerShown: true,
        }}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.summaryGradient}
            >
              <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={32} color="#fff" />
              <Text style={styles.summaryValue}>{totalViews.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Visualizaciones</Text>
            </LinearGradient>
          </View>

          <View style={styles.summaryCard}>
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              style={styles.summaryGradient}
            >
              <IconSymbol ios_icon_name="heart.fill" android_material_icon_name="favorite" size={32} color="#fff" />
              <Text style={styles.summaryValue}>{totalLikes.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Me gusta</Text>
            </LinearGradient>
          </View>

          <View style={styles.summaryCard}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.summaryGradient}
            >
              <IconSymbol ios_icon_name="bubble.left.fill" android_material_icon_name="comment" size={32} color="#fff" />
              <Text style={styles.summaryValue}>{totalComments.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Comentarios</Text>
            </LinearGradient>
          </View>

          <View style={styles.summaryCard}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.summaryGradient}
            >
              <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="trending_up" size={32} color="#fff" />
              <Text style={styles.summaryValue}>{avgEngagement.toFixed(1)}%</Text>
              <Text style={styles.summaryLabel}>Engagement</Text>
            </LinearGradient>
          </View>
        </View>

        {/* AI Recommendations Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Recomendaciones IA</Text>
            </View>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={generateRecommendations}
              disabled={generatingRecommendations}
            >
              {generatingRecommendations ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          {recommendations.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol ios_icon_name="lightbulb" android_material_icon_name="lightbulb" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No hay recomendaciones disponibles</Text>
              <Text style={styles.emptySubtext}>Genera recomendaciones basadas en tus analíticas</Text>
              <TouchableOpacity
                style={styles.generateButtonLarge}
                onPress={generateRecommendations}
                disabled={generatingRecommendations}
              >
                <Text style={styles.generateButtonText}>
                  {generatingRecommendations ? 'Generando...' : 'Generar Recomendaciones'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.recommendationsList}>
              {recommendations.map((rec) => (
                <View key={rec.id} style={styles.recommendationCard}>
                  <View style={styles.recommendationHeader}>
                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(rec.prioridad) }]}>
                      <IconSymbol
                        ios_icon_name={getPriorityIcon(rec.prioridad)}
                        android_material_icon_name="priority_high"
                        size={16}
                        color="#fff"
                      />
                      <Text style={styles.priorityText}>{rec.prioridad.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.recommendationTitle}>{rec.titulo}</Text>
                  <Text style={styles.recommendationDescription}>{rec.descripcion}</Text>
                  
                  {rec.acciones_sugeridas && rec.acciones_sugeridas.length > 0 && (
                    <View style={styles.actionsContainer}>
                      <Text style={styles.actionsTitle}>Acciones sugeridas:</Text>
                      {rec.acciones_sugeridas.map((action, index) => (
                        <View key={index} style={styles.actionItem}>
                          <IconSymbol ios_icon_name="checkmark.circle" android_material_icon_name="check_circle" size={16} color={colors.primary} />
                          <Text style={styles.actionText}>{action}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {rec.impacto_estimado && (
                    <View style={styles.impactContainer}>
                      <IconSymbol ios_icon_name="chart.line.uptrend.xyaxis" android_material_icon_name="trending_up" size={16} color={colors.success} />
                      <Text style={styles.impactText}>Impacto estimado: {rec.impacto_estimado}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryGradient: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  generateButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  generateButtonLarge: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  generateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  recommendationsList: {
    gap: 12,
  },
  recommendationCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  recommendationTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  recommendationDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actionsContainer: {
    gap: 8,
    marginTop: 8,
  },
  actionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  actionText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  impactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  impactText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
  },
});
