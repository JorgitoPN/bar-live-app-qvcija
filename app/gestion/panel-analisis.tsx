
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AnalyticsData {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  followers: number;
  engagement_rate: number;
  top_posts: any[];
  demographics: any;
}

interface Recommendation {
  id: string;
  local_id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  prioridad: 'alta' | 'media' | 'baja';
  created_at: string;
  aplicada: boolean;
}

export default function PanelAnalisisScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const localId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [generatingRecommendations, setGeneratingRecommendations] = useState(false);

  // ✅ FIXED: Wrapped loadAnalyticsData in useCallback with proper dependencies
  const loadAnalyticsData = useCallback(async () => {
    if (!localId) {
      console.log('[PanelAnalisis] No local ID provided');
      return;
    }

    setLoading(true);
    try {
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const [postsResult, likesResult, commentsResult, followersResult] = await Promise.all([
        supabase
          .from('publicaciones')
          .select('id, likes, created_at')
          .eq('local_id', localId)
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('likes')
          .select('id')
          .eq('local_id', localId)
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('comentarios')
          .select('id')
          .eq('local_id', localId)
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('locales_favoritos')
          .select('id')
          .eq('local_id', localId),
      ]);

      const posts = postsResult.data || [];
      const totalViews = posts.reduce((sum, post) => sum + (post.views || 0), 0);
      const totalLikes = likesResult.data?.length || 0;
      const totalComments = commentsResult.data?.length || 0;
      const totalFollowers = followersResult.data?.length || 0;

      const engagementRate = posts.length > 0
        ? ((totalLikes + totalComments) / (totalViews || 1)) * 100
        : 0;

      const topPosts = posts
        .sort((a, b) => (b.likes || 0) - (a.likes || 0))
        .slice(0, 5);

      setAnalyticsData({
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
        shares: 0,
        followers: totalFollowers,
        engagement_rate: engagementRate,
        top_posts: topPosts,
        demographics: {},
      });

      console.log('[PanelAnalisis] Analytics loaded:', {
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
        followers: totalFollowers,
      });
    } catch (error) {
      console.error('[PanelAnalisis] Error loading analytics:', error);
      Alert.alert('Error', 'No se pudieron cargar las analíticas');
    } finally {
      setLoading(false);
    }
  }, [localId, timeRange]);

  // ✅ FIXED: Wrapped loadRecommendations in useCallback with proper dependencies
  const loadRecommendations = useCallback(async () => {
    if (!localId) {
      console.log('[PanelAnalisis] No local ID provided');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('recomendaciones_ia')
        .select('*')
        .eq('local_id', localId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('[PanelAnalisis] Error loading recommendations:', error);
        return;
      }

      console.log('[PanelAnalisis] Recommendations loaded:', data?.length || 0);
      setRecommendations(data || []);
    } catch (error) {
      console.error('[PanelAnalisis] Error:', error);
    }
  }, [localId]);

  // ✅ FIXED: Wrapped generateRecommendations in useCallback
  const generateRecommendations = useCallback(async () => {
    if (!localId || !user) {
      Alert.alert('Error', 'No se puede generar recomendaciones');
      return;
    }

    setGeneratingRecommendations(true);

    try {
      console.log('[PanelAnalisis] Calling Edge Function to generate recommendations...');

      const { data, error } = await supabase.functions.invoke('generate-analytics-recommendations', {
        body: {
          local_id: localId,
          user_id: user.id,
        },
      });

      if (error) {
        console.error('[PanelAnalisis] Error generating recommendations:', error);
        Alert.alert('Error', 'No se pudieron generar las recomendaciones');
        return;
      }

      console.log('[PanelAnalisis] Recommendations generated:', data);
      Alert.alert('Éxito', 'Recomendaciones generadas correctamente');
      await loadRecommendations();
    } catch (error) {
      console.error('[PanelAnalisis] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al generar las recomendaciones');
    } finally {
      setGeneratingRecommendations(false);
    }
  }, [localId, user, loadRecommendations]);

  // ✅ FIXED: Wrapped checkAndGenerateRecommendations in useCallback with proper dependencies
  const checkAndGenerateRecommendations = useCallback(async () => {
    if (!localId) {
      console.log('[PanelAnalisis] No local ID provided');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('recomendaciones_ia')
        .select('id')
        .eq('local_id', localId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('[PanelAnalisis] Error checking recommendations:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.log('[PanelAnalisis] No recommendations found, generating...');
        await generateRecommendations();
      } else {
        console.log('[PanelAnalisis] Recommendations already exist');
      }
    } catch (error) {
      console.error('[PanelAnalisis] Error:', error);
    }
  }, [localId, generateRecommendations]);

  // ✅ FIXED: Added all dependencies to useEffect
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

    const subscription = supabase
      .channel('recomendaciones_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recomendaciones_ia',
          filter: `local_id=eq.${localId}`,
        },
        (payload) => {
          console.log('[PanelAnalisis] Recommendations changed:', payload);
          loadRecommendations();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [localId, timeRange, loadAnalyticsData, loadRecommendations, checkAndGenerateRecommendations, router]);

  const handleMarkAsApplied = async (recommendationId: string) => {
    try {
      const { error } = await supabase
        .from('recomendaciones_ia')
        .update({ aplicada: true })
        .eq('id', recommendationId);

      if (error) {
        console.error('[PanelAnalisis] Error marking as applied:', error);
        Alert.alert('Error', 'No se pudo marcar como aplicada');
        return;
      }

      await loadRecommendations();
      Alert.alert('Éxito', 'Recomendación marcada como aplicada');
    } catch (error) {
      console.error('[PanelAnalisis] Error:', error);
      Alert.alert('Error', 'Ocurrió un error');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta':
        return colors.error;
      case 'media':
        return colors.warning;
      case 'baja':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Panel de Análisis</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.timeRangeSelector}>
          {(['7d', '30d', '90d'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              onPress={() => setTimeRange(range)}
              style={[
                styles.timeRangeButton,
                timeRange === range && styles.timeRangeButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.timeRangeButtonText,
                  timeRange === range && styles.timeRangeButtonTextActive,
                ]}
              >
                {range === '7d' ? '7 días' : range === '30d' ? '30 días' : '90 días'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {analyticsData && (
          <View style={styles.analyticsSection}>
            <Text style={styles.sectionTitle}>Métricas</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={32} color={colors.primary} />
                <Text style={styles.metricValue}>{analyticsData.views}</Text>
                <Text style={styles.metricLabel}>Vistas</Text>
              </View>

              <View style={styles.metricCard}>
                <IconSymbol ios_icon_name="heart.fill" android_material_icon_name="favorite" size={32} color={colors.error} />
                <Text style={styles.metricValue}>{analyticsData.likes}</Text>
                <Text style={styles.metricLabel}>Me gusta</Text>
              </View>

              <View style={styles.metricCard}>
                <IconSymbol ios_icon_name="bubble.left.fill" android_material_icon_name="chat_bubble" size={32} color={colors.success} />
                <Text style={styles.metricValue}>{analyticsData.comments}</Text>
                <Text style={styles.metricLabel}>Comentarios</Text>
              </View>

              <View style={styles.metricCard}>
                <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={32} color={colors.warning} />
                <Text style={styles.metricValue}>{analyticsData.followers}</Text>
                <Text style={styles.metricLabel}>Seguidores</Text>
              </View>
            </View>

            <View style={styles.engagementCard}>
              <Text style={styles.engagementLabel}>Tasa de Engagement</Text>
              <Text style={styles.engagementValue}>{analyticsData.engagement_rate.toFixed(2)}%</Text>
            </View>
          </View>
        )}

        <View style={styles.recommendationsSection}>
          <View style={styles.recommendationsHeader}>
            <Text style={styles.sectionTitle}>Recomendaciones IA</Text>
            <TouchableOpacity
              onPress={generateRecommendations}
              style={styles.generateButton}
              disabled={generatingRecommendations}
            >
              {generatingRecommendations ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <React.Fragment>
                  <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={20} color={colors.background} />
                  <Text style={styles.generateButtonText}>Generar</Text>
                </React.Fragment>
              )}
            </TouchableOpacity>
          </View>

          {recommendations.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol ios_icon_name="lightbulb" android_material_icon_name="lightbulb" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>No hay recomendaciones</Text>
              <Text style={styles.emptyStateSubtext}>Genera recomendaciones con IA</Text>
            </View>
          ) : (
            recommendations.map((recommendation) => (
              <View key={recommendation.id} style={styles.recommendationCard}>
                <View style={styles.recommendationHeader}>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(recommendation.prioridad) }]}>
                    <Text style={styles.priorityText}>{recommendation.prioridad.toUpperCase()}</Text>
                  </View>
                  {recommendation.aplicada && (
                    <View style={styles.appliedBadge}>
                      <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={16} color={colors.success} />
                      <Text style={styles.appliedText}>Aplicada</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.recommendationTitle}>{recommendation.titulo}</Text>
                <Text style={styles.recommendationDescription}>{recommendation.descripcion}</Text>

                {!recommendation.aplicada && (
                  <TouchableOpacity
                    onPress={() => handleMarkAsApplied(recommendation.id)}
                    style={styles.applyButton}
                  >
                    <Text style={styles.applyButtonText}>Marcar como aplicada</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: colors.primary,
  },
  timeRangeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  timeRangeButtonTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  analyticsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 56) / 2,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  engagementCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  engagementLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  engagementValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  recommendationsSection: {
    padding: 16,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  recommendationCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.background,
  },
  appliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: colors.success + '20',
  },
  appliedText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.success,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  recommendationDescription: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  applyButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background,
  },
});
