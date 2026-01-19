
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../integrations/supabase/client';
import { colors } from '../../styles/commonStyles';
import { IconSymbol } from '../../components/IconSymbol';

interface StripeConfig {
  id: number;
  publishable_key: string;
  secret_key: string;
  webhook_secret: string;
  mode: 'test' | 'live';
  updated_at: string;
}

interface PaymentStats {
  total_transactions: number;
  total_amount: number;
  successful_payments: number;
  failed_payments: number;
}

export default function GestionarPagosStripe() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<StripeConfig | null>(null);
  const [stats, setStats] = useState<PaymentStats>({
    total_transactions: 0,
    total_amount: 0,
    successful_payments: 0,
    failed_payments: 0,
  });

  useEffect(() => {
    loadConfiguration();
    loadStats();
  }, []);

  const loadConfiguration = async () => {
    try {
      const { data, error } = await supabase
        .from('stripe_configuration')
        .select('*')
        .single();

      if (error) {
        console.log('No configuration found');
        setConfig(null);
      } else {
        setConfig(data);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('amount, status');

      if (!error && data) {
        const stats: PaymentStats = {
          total_transactions: data.length,
          total_amount: data.reduce((sum, t) => sum + (t.amount || 0), 0),
          successful_payments: data.filter((t) => t.status === 'succeeded').length,
          failed_payments: data.filter((t) => t.status === 'failed').length,
        };
        setStats(stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const testConnection = async () => {
    if (!config) return;

    setLoading(true);
    try {
      const response = await fetch('https://api.stripe.com/v1/customers?limit=1', {
        headers: {
          Authorization: `Bearer ${config.secret_key}`,
        },
      });

      if (response.ok) {
        Alert.alert('¡Éxito!', 'La conexión con Stripe funciona correctamente');
      } else {
        const error = await response.json();
        Alert.alert('Error', `No se pudo conectar: ${error.error?.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      Alert.alert('Error', 'No se pudo probar la conexión');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </View>
    );
  }

  if (!config) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gestionar Pagos</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.emptyContainer}>
          <IconSymbol
            ios_icon_name="creditcard.fill"
            android_material_icon_name="credit_card"
            size={80}
            color={colors.textSecondary}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyTitle}>Stripe no configurado</Text>
          <Text style={styles.emptyDescription}>
            Usa el Asistente de Stripe para configurar los pagos de forma rápida y sencilla.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/admin/asistente-stripe')}
          >
            <IconSymbol ios_icon_name="wand.and.stars" android_material_icon_name="auto_fix_high" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Abrir Asistente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestionar Pagos</Text>
        <TouchableOpacity onPress={() => router.push('/admin/asistente-stripe')} style={styles.headerButton}>
          <IconSymbol ios_icon_name="gearshape.fill" android_material_icon_name="settings" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Estado de Stripe</Text>
            <View style={[styles.statusBadge, config.mode === 'live' ? styles.statusLive : styles.statusTest]}>
              <Text style={styles.statusBadgeText}>
                {config.mode === 'live' ? 'Producción' : 'Prueba'}
              </Text>
            </View>
          </View>
          <Text style={styles.statusDescription}>
            Última actualización: {new Date(config.updated_at).toLocaleDateString('es-ES')}
          </Text>
          <TouchableOpacity style={styles.testButton} onPress={testConnection}>
            <IconSymbol ios_icon_name="checkmark.shield.fill" android_material_icon_name="verified_user" size={20} color={colors.primary} />
            <Text style={styles.testButtonText}>Probar Conexión</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar_chart" size={32} color={colors.primary} />
            <Text style={styles.statValue}>{stats.total_transactions}</Text>
            <Text style={styles.statLabel}>Transacciones</Text>
          </View>
          <View style={styles.statCard}>
            <IconSymbol ios_icon_name="eurosign.circle.fill" android_material_icon_name="euro" size={32} color={colors.success} />
            <Text style={styles.statValue}>€{(stats.total_amount / 100).toFixed(2)}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={32} color={colors.success} />
            <Text style={styles.statValue}>{stats.successful_payments}</Text>
            <Text style={styles.statLabel}>Exitosos</Text>
          </View>
          <View style={styles.statCard}>
            <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={32} color={colors.error} />
            <Text style={styles.statValue}>{stats.failed_payments}</Text>
            <Text style={styles.statLabel}>Fallidos</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/admin/asistente-stripe')}
          >
            <IconSymbol ios_icon_name="wand.and.stars" android_material_icon_name="auto_fix_high" size={24} color={colors.primary} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Reconfigurar Stripe</Text>
              <Text style={styles.actionDescription}>Usar el asistente para cambiar la configuración</Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/admin/gestionar-planes')}
          >
            <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={24} color="#FFD700" />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Gestionar Planes</Text>
              <Text style={styles.actionDescription}>Crear y editar planes de suscripción</Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/admin/vision-finanzas')}
          >
            <IconSymbol ios_icon_name="chart.line.uptrend.xyaxis" android_material_icon_name="trending_up" size={24} color={colors.success} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Visión Financiera</Text>
              <Text style={styles.actionDescription}>Ver análisis detallado de ingresos</Text>
            </View>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {config.mode === 'test' && (
          <View style={styles.warningCard}>
            <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={24} color={colors.warning} />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Modo de Prueba Activo</Text>
              <Text style={styles.warningText}>
                Estás usando claves de prueba. Cambia a modo de producción cuando estés listo para aceptar pagos reales.
              </Text>
            </View>
          </View>
        )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  headerButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusTest: {
    backgroundColor: colors.warning + '20',
  },
  statusLive: {
    backgroundColor: colors.success + '20',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  statusDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.warning,
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
