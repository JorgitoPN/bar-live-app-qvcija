
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

const { width } = Dimensions.get('window');

interface FinancialData {
  ingresosMensuales: number;
  gastosAPIs: number;
  suscripcionesActivas: number;
  ingresosSuscripciones: number;
  ingresosPublicidad: number;
  beneficioNeto: number;
}

export default function VisionFinanzasScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<'mes' | 'trimestre' | 'año'>('mes');
  const [financialData, setFinancialData] = useState<FinancialData>({
    ingresosMensuales: 0,
    gastosAPIs: 0,
    suscripcionesActivas: 0,
    ingresosSuscripciones: 0,
    ingresosPublicidad: 0,
    beneficioNeto: 0,
  });

  const cargarDatosFinancieros = useCallback(async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on period
      const now = new Date();
      let startDate = new Date();
      
      if (periodo === 'mes') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (periodo === 'trimestre') {
        startDate.setMonth(now.getMonth() - 3);
      } else if (periodo === 'año') {
        startDate.setFullYear(now.getFullYear() - 1);
      }

      // Get active subscriptions
      const { data: suscripciones, error: subsError } = await supabase
        .from('suscripciones_locales')
        .select(`
          *,
          planes_suscripcion!suscripciones_locales_plan_id_fkey(nombre, precio_mensual)
        `)
        .eq('estado', 'activa')
        .gte('fecha_inicio', startDate.toISOString());

      if (subsError) {
        console.error('Error loading subscriptions:', subsError);
      }

      // Calculate subscription revenue
      const ingresosSuscripciones = suscripciones?.reduce((total, sub: any) => {
        const precio = sub.planes_suscripcion?.precio_mensual || 0;
        return total + precio;
      }, 0) || 0;

      // Get API costs from configuration
      const { data: apiConfig } = await supabase
        .from('configuracion_apis')
        .select('contador_llamadas_mes')
        .single();

      // Estimate API costs (assuming $0.01 per call average)
      const gastosAPIs = (apiConfig?.contador_llamadas_mes || 0) * 0.01;

      // Get destacado posts (advertising revenue)
      const { data: destacados, error: destacadosError } = await supabase
        .from('posts')
        .select('id')
        .eq('destacado', true)
        .gte('created_at', startDate.toISOString());

      if (destacadosError) {
        console.error('Error loading destacados:', destacadosError);
      }

      // Estimate advertising revenue (€50 per destacado post)
      const ingresosPublicidad = (destacados?.length || 0) * 50;

      const ingresosMensuales = ingresosSuscripciones + ingresosPublicidad;
      const beneficioNeto = ingresosMensuales - gastosAPIs;

      const data: FinancialData = {
        ingresosMensuales,
        gastosAPIs,
        suscripcionesActivas: suscripciones?.length || 0,
        ingresosSuscripciones,
        ingresosPublicidad,
        beneficioNeto,
      };

      setFinancialData(data);
    } catch (error) {
      console.error('Error cargando datos financieros:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos financieros');
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => {
    cargarDatosFinancieros();
  }, [cargarDatosFinancieros]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const calcularPorcentaje = (parte: number, total: number) => {
    return ((parte / total) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Visión Financiera</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={styles.periodSelector}>
        {(['mes', 'trimestre', 'año'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, periodo === p && styles.periodButtonActive]}
            onPress={() => setPeriodo(p)}
          >
            <Text
              style={[
                styles.periodButtonText,
                periodo === p && styles.periodButtonTextActive,
              ]}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {/* Resumen Principal */}
        <View style={styles.mainCard}>
          <Text style={styles.mainCardLabel}>Ingresos Totales</Text>
          <Text style={styles.mainCardValue}>
            {formatCurrency(financialData.ingresosMensuales)}
          </Text>
          <View style={styles.mainCardSubInfo}>
            <View style={styles.subInfoItem}>
              <IconSymbol ios_icon_name="arrow.up.circle.fill" android_material_icon_name="arrow_upward" size={16} color="#10B981" />
              <Text style={styles.subInfoText}>+12.5% vs mes anterior</Text>
            </View>
          </View>
        </View>

        {/* Beneficio Neto */}
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.beneficioCard}
        >
          <View style={styles.beneficioHeader}>
            <Text style={styles.beneficioLabel}>Beneficio Neto</Text>
            <IconSymbol ios_icon_name="chart.line.uptrend.xyaxis" android_material_icon_name="trending_up" size={20} color="white" />
          </View>
          <Text style={styles.beneficioValue}>
            {formatCurrency(financialData.beneficioNeto)}
          </Text>
          <Text style={styles.beneficioSubtext}>
            Después de gastos operativos
          </Text>
        </LinearGradient>

        {/* Desglose de Ingresos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Desglose de Ingresos</Text>

          <View style={styles.incomeCard}>
            <View style={styles.incomeHeader}>
              <View style={styles.incomeIcon}>
                <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={20} color={colors.primary} />
              </View>
              <View style={styles.incomeInfo}>
                <Text style={styles.incomeLabel}>Suscripciones Premium</Text>
                <Text style={styles.incomeValue}>
                  {formatCurrency(financialData.ingresosSuscripciones)}
                </Text>
              </View>
              <Text style={styles.incomePercentage}>
                {calcularPorcentaje(
                  financialData.ingresosSuscripciones,
                  financialData.ingresosMensuales
                )}
                %
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${calcularPorcentaje(
                      financialData.ingresosSuscripciones,
                      financialData.ingresosMensuales
                    )}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.incomeDetail}>
              {financialData.suscripcionesActivas} suscripciones activas
            </Text>
          </View>

          <View style={styles.incomeCard}>
            <View style={styles.incomeHeader}>
              <View style={styles.incomeIcon}>
                <IconSymbol ios_icon_name="megaphone.fill" android_material_icon_name="campaign" size={20} color={colors.badgeDestacado} />
              </View>
              <View style={styles.incomeInfo}>
                <Text style={styles.incomeLabel}>Publicidad Destacada</Text>
                <Text style={styles.incomeValue}>
                  {formatCurrency(financialData.ingresosPublicidad)}
                </Text>
              </View>
              <Text style={styles.incomePercentage}>
                {calcularPorcentaje(
                  financialData.ingresosPublicidad,
                  financialData.ingresosMensuales
                )}
                %
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${calcularPorcentaje(
                      financialData.ingresosPublicidad,
                      financialData.ingresosMensuales
                    )}%`,
                    backgroundColor: colors.badgeDestacado,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Gastos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gastos Operativos</Text>

          <View style={styles.expenseCard}>
            <View style={styles.expenseHeader}>
              <IconSymbol ios_icon_name="cloud.fill" android_material_icon_name="cloud" size={24} color={colors.textSecondary} />
              <View style={styles.expenseInfo}>
                <Text style={styles.expenseLabel}>APIs y Servicios</Text>
                <Text style={styles.expenseValue}>
                  {formatCurrency(financialData.gastosAPIs)}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.detailButton}
              onPress={() => router.push('/admin/control-costes-api')}
            >
              <Text style={styles.detailButtonText}>Ver Detalles</Text>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Métricas Clave */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Métricas Clave</Text>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <IconSymbol ios_icon_name="person.3.fill" android_material_icon_name="people" size={24} color={colors.primary} />
              <Text style={styles.metricValue}>87</Text>
              <Text style={styles.metricLabel}>Suscriptores</Text>
              <Text style={styles.metricChange}>+5 este mes</Text>
            </View>

            <View style={styles.metricCard}>
              <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar_chart" size={24} color={colors.badgeDestacado} />
              <Text style={styles.metricValue}>€100</Text>
              <Text style={styles.metricLabel}>Ingreso Medio</Text>
              <Text style={styles.metricChange}>por suscriptor</Text>
            </View>

            <View style={styles.metricCard}>
              <IconSymbol ios_icon_name="arrow.up.right" android_material_icon_name="trending_up" size={24} color="#10B981" />
              <Text style={styles.metricValue}>12.5%</Text>
              <Text style={styles.metricLabel}>Crecimiento</Text>
              <Text style={styles.metricChange}>mensual</Text>
            </View>

            <View style={styles.metricCard}>
              <IconSymbol ios_icon_name="dollarsign.circle.fill" android_material_icon_name="attach_money" size={24} color={colors.badgeNuevo} />
              <Text style={styles.metricValue}>82.0%</Text>
              <Text style={styles.metricLabel}>Margen</Text>
              <Text style={styles.metricChange}>de beneficio</Text>
            </View>
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
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  periodButtonTextActive: {
    color: colors.headerText,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  mainCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    ...commonStyles.cardShadow,
  },
  mainCardLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  mainCardValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  mainCardSubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subInfoText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  beneficioCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    ...commonStyles.cardShadow,
    overflow: 'hidden',
  },
  beneficioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  beneficioLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  beneficioValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  beneficioSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  incomeCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...commonStyles.cardShadow,
  },
  incomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  incomeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  incomeInfo: {
    flex: 1,
  },
  incomeLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  incomeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  incomePercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.cardBorder,
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  incomeDetail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  expenseCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    ...commonStyles.cardShadow,
  },
  expenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  expenseInfo: {
    flex: 1,
    marginLeft: 12,
  },
  expenseLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  expenseValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: `${colors.primary}15`,
    gap: 6,
  },
  detailButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: (width - 44) / 2,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...commonStyles.cardShadow,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  metricChange: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
