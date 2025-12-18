
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface AnalyticsData {
  ingresosTotales: number;
  ingresosHoy: number;
  ingresosMes: number;
  transaccionesHoy: number;
  transaccionesMes: number;
  suscripcionesActivas: number;
  ingresosRecurrentes: number;
  tasaConversion: number;
}

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  local?: {
    nombre: string;
  };
  plan?: {
    nombre: string;
  };
}

export default function AnalisisIngresosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    ingresosTotales: 0,
    ingresosHoy: 0,
    ingresosMes: 0,
    transaccionesHoy: 0,
    transaccionesMes: 0,
    suscripcionesActivas: 0,
    ingresosRecurrentes: 0,
    tasaConversion: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const cargarAnalytics = useCallback(async () => {
    try {
      console.log('[AnalisisIngresos] ✅ Cargando analytics...');

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Transacciones totales
      const { data: allTransactions, error: allError } = await supabase
        .from('payment_transactions')
        .select('amount')
        .eq('status', 'succeeded');

      if (allError) throw allError;

      const ingresosTotales = allTransactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Transacciones de hoy
      const { data: todayTransactions, error: todayError } = await supabase
        .from('payment_transactions')
        .select('amount')
        .eq('status', 'succeeded')
        .gte('created_at', startOfToday.toISOString());

      if (todayError) throw todayError;

      const ingresosHoy = todayTransactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const transaccionesHoy = todayTransactions?.length || 0;

      // Transacciones del mes
      const { data: monthTransactions, error: monthError } = await supabase
        .from('payment_transactions')
        .select('amount')
        .eq('status', 'succeeded')
        .gte('created_at', startOfMonth.toISOString());

      if (monthError) throw monthError;

      const ingresosMes = monthTransactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const transaccionesMes = monthTransactions?.length || 0;

      // Suscripciones activas
      const { count: suscripcionesActivas, error: subsError } = await supabase
        .from('suscripciones_locales')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'activa');

      if (subsError) throw subsError;

      // Calcular ingresos recurrentes mensuales (MRR)
      const { data: planes, error: planesError } = await supabase
        .from('suscripciones_locales')
        .select(`
          plan_id,
          planes_suscripcion!inner(precio_mensual)
        `)
        .eq('estado', 'activa');

      if (planesError) throw planesError;

      const ingresosRecurrentes = planes?.reduce((sum, s: any) => {
        return sum + (Number(s.planes_suscripcion?.precio_mensual) || 0);
      }, 0) || 0;

      // Tasa de conversión (simplificada)
      const { count: totalLocales } = await supabase
        .from('locales')
        .select('*', { count: 'exact', head: true });

      const tasaConversion = totalLocales ? ((suscripcionesActivas || 0) / totalLocales) * 100 : 0;

      setAnalytics({
        ingresosTotales,
        ingresosHoy,
        ingresosMes,
        transaccionesHoy,
        transaccionesMes,
        suscripcionesActivas: suscripcionesActivas || 0,
        ingresosRecurrentes,
        tasaConversion,
      });

      console.log('[AnalisisIngresos] ✅ Analytics cargados');
    } catch (error) {
      console.error('[AnalisisIngresos] Error cargando analytics:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos de ingresos');
    }
  }, []);

  const cargarTransaccionesRecientes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          *,
          local:local_id(nombre),
          plan:plan_id(nombre)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setRecentTransactions(data || []);
    } catch (error) {
      console.error('[AnalisisIngresos] Error cargando transacciones:', error);
    }
  }, []);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    await Promise.all([cargarAnalytics(), cargarTransaccionesRecientes()]);
    setLoading(false);
  }, [cargarAnalytics, cargarTransaccionesRecientes]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      console.log('[AnalisisIngresos] 🔄 Auto-refresh...');
      cargarDatos();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, cargarDatos]);

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      pending: { color: '#F59E0B', text: 'Pendiente' },
      succeeded: { color: '#10B981', text: 'Exitoso' },
      failed: { color: '#EF4444', text: 'Fallido' },
      refunded: { color: '#6B7280', text: 'Reembolsado' },
    };

    const badge = badges[status] || badges.pending;

    return (
      <View style={[styles.statusBadge, { backgroundColor: badge.color + '20' }]}>
        <Text style={[styles.statusText, { color: badge.color }]}>{badge.text}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.headerGradientStart, colors.headerGradientEnd]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Análisis de Ingresos</Text>
          </View>
          <View style={{ width: 24 }} />
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando datos...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.headerGradientStart, colors.headerGradientEnd]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Análisis de Ingresos</Text>
          <Text style={styles.headerSubtitle}>Datos en tiempo real</Text>
        </View>
        <TouchableOpacity onPress={cargarDatos}>
          <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={24} color={colors.headerText} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Auto-refresh toggle */}
        <TouchableOpacity
          style={[styles.autoRefreshCard, autoRefresh && styles.autoRefreshCardActive]}
          onPress={() => setAutoRefresh(!autoRefresh)}
        >
          <IconSymbol
            ios_icon_name={autoRefresh ? 'arrow.clockwise.circle.fill' : 'arrow.clockwise.circle'}
            android_material_icon_name={autoRefresh ? 'sync' : 'sync_disabled'}
            size={24}
            color={autoRefresh ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.autoRefreshText, autoRefresh && styles.autoRefreshTextActive]}>
            Actualización automática {autoRefresh ? 'activada' : 'desactivada'}
          </Text>
        </TouchableOpacity>

        {/* Main Stats */}
        <View style={styles.mainStatsGrid}>
          <View style={styles.mainStatCard}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.mainStatGradient}>
              <IconSymbol ios_icon_name="eurosign.circle.fill" android_material_icon_name="euro" size={32} color={colors.white} />
              <Text style={styles.mainStatNumber}>{formatCurrency(analytics.ingresosTotales)}</Text>
              <Text style={styles.mainStatLabel}>Ingresos Totales</Text>
            </LinearGradient>
          </View>

          <View style={styles.mainStatCard}>
            <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.mainStatGradient}>
              <IconSymbol ios_icon_name="calendar.circle.fill" android_material_icon_name="today" size={32} color={colors.white} />
              <Text style={styles.mainStatNumber}>{formatCurrency(analytics.ingresosHoy)}</Text>
              <Text style={styles.mainStatLabel}>Ingresos Hoy</Text>
              <Text style={styles.mainStatSubLabel}>{analytics.transaccionesHoy} transacciones</Text>
            </LinearGradient>
          </View>

          <View style={styles.mainStatCard}>
            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.mainStatGradient}>
              <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar_chart" size={32} color={colors.white} />
              <Text style={styles.mainStatNumber}>{formatCurrency(analytics.ingresosMes)}</Text>
              <Text style={styles.mainStatLabel}>Ingresos Este Mes</Text>
              <Text style={styles.mainStatSubLabel}>{analytics.transaccionesMes} transacciones</Text>
            </LinearGradient>
          </View>

          <View style={styles.mainStatCard}>
            <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.mainStatGradient}>
              <IconSymbol ios_icon_name="arrow.triangle.2.circlepath.circle.fill" android_material_icon_name="autorenew" size={32} color={colors.white} />
              <Text style={styles.mainStatNumber}>{formatCurrency(analytics.ingresosRecurrentes)}</Text>
              <Text style={styles.mainStatLabel}>MRR (Mensual Recurrente)</Text>
              <Text style={styles.mainStatSubLabel}>{analytics.suscripcionesActivas} suscripciones</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Secondary Stats */}
        <View style={styles.secondaryStatsRow}>
          <View style={styles.secondaryStatCard}>
            <Text style={styles.secondaryStatNumber}>{analytics.suscripcionesActivas}</Text>
            <Text style={styles.secondaryStatLabel}>Suscripciones Activas</Text>
          </View>
          <View style={styles.secondaryStatCard}>
            <Text style={styles.secondaryStatNumber}>{analytics.tasaConversion.toFixed(1)}%</Text>
            <Text style={styles.secondaryStatLabel}>Tasa de Conversión</Text>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transacciones Recientes</Text>
          {recentTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol ios_icon_name="creditcard" android_material_icon_name="credit_card" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No hay transacciones recientes</Text>
            </View>
          ) : (
            <React.Fragment>
              {recentTransactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionCard}>
                  <View style={styles.transactionHeader}>
                    <View style={styles.transactionHeaderLeft}>
                      <Text style={styles.transactionAmount}>
                        {formatCurrency(Number(transaction.amount), transaction.currency)}
                      </Text>
                      <Text style={styles.transactionLocal}>
                        {transaction.local?.nombre || 'Local desconocido'}
                      </Text>
                      {transaction.plan && (
                        <Text style={styles.transactionPlan}>Plan: {transaction.plan.nombre}</Text>
                      )}
                    </View>
                    {getStatusBadge(transaction.status)}
                  </View>
                  <Text style={styles.transactionDate}>
                    {new Date(transaction.created_at).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              ))}
            </React.Fragment>
          )}
        </View>

        <View style={styles.infoCard}>
          <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Análisis en Tiempo Real</Text>
            <Text style={styles.infoText}>
              - Los datos se actualizan automáticamente cada 30 segundos{'\n'}
              - MRR: Ingresos Mensuales Recurrentes estimados{'\n'}
              - Tasa de conversión: % de locales con suscripción activa{'\n'}
              - Todas las cifras incluyen IVA (21%)
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
  header: {
    paddingTop: 50,
    paddingBottom: 20,
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
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
  autoRefreshCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 20,
  },
  autoRefreshCardActive: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary + '30',
  },
  autoRefreshText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  autoRefreshTextActive: {
    color: colors.primary,
  },
  mainStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  mainStatCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 16,
    overflow: 'hidden',
    ...commonStyles.shadow,
  },
  mainStatGradient: {
    padding: 20,
    alignItems: 'center',
  },
  mainStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginTop: 12,
  },
  mainStatLabel: {
    fontSize: 13,
    color: colors.white,
    opacity: 0.9,
    marginTop: 6,
    textAlign: 'center',
  },
  mainStatSubLabel: {
    fontSize: 11,
    color: colors.white,
    opacity: 0.8,
    marginTop: 2,
  },
  secondaryStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  secondaryStatCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    ...commonStyles.shadow,
  },
  secondaryStatNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 6,
  },
  secondaryStatLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  transactionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...commonStyles.shadow,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  transactionHeaderLeft: {
    flex: 1,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  transactionLocal: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  transactionPlan: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
