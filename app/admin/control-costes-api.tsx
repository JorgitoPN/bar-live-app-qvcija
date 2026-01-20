
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import {
  obtenerEstadisticasUso,
  obtenerConfiguracionAPIs,
  actualizarConfiguracionAPIs,
  resetearContadorManual,
  toggleAPIManual,
  actualizarLimiteMensual,
  calcularCosteEstimado,
} from '@/utils/apiCostControl';
import { ConfiguracionAPIs } from '@/types';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    ...commonStyles.shadow,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 15,
    marginRight: '4%',
    marginBottom: 10,
  },
  statBoxFull: {
    width: '100%',
    marginRight: 0,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  statSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 3,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressGreen: {
    backgroundColor: '#10B981',
  },
  progressYellow: {
    backgroundColor: '#F59E0B',
  },
  progressRed: {
    backgroundColor: '#EF4444',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#065F46',
  },
  statusTextInactive: {
    color: '#991B1B',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLabel: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  settingDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonDanger: {
    backgroundColor: '#EF4444',
  },
  buttonSecondary: {
    backgroundColor: colors.secondary,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  alertBox: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 5,
  },
  alertText: {
    fontSize: 13,
    color: '#92400E',
  },
  costTable: {
    marginTop: 10,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  costLabel: {
    fontSize: 13,
    color: colors.text,
  },
  costValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});

export default function ControlCostesAPIScreen() {
  const router = useRouter();
  const [config, setConfig] = useState<ConfiguracionAPIs | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nuevoLimite, setNuevoLimite] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [configData, statsData] = await Promise.all([
        obtenerConfiguracionAPIs(),
        obtenerEstadisticasUso(),
      ]);
      setConfig(configData);
      setStats(statsData);
      setNuevoLimite(configData.limite_mensual_places.toString());
    } catch (error) {
      console.error('[Screen] Error loading data:', error);
      Alert.alert('Error', 'No se pudo cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAPI = async (value: boolean) => {
    try {
      await toggleAPIManual(value);
      await cargarDatos();
      Alert.alert(
        'Éxito',
        value ? 'API activada correctamente' : 'API desactivada correctamente'
      );
    } catch (error) {
      console.error('[Screen] Error toggling API:', error);
      Alert.alert('Error', 'No se pudo cambiar el estado de la API');
    }
  };

  const handleTogglePausaAutomatica = async (value: boolean) => {
    try {
      await actualizarConfiguracionAPIs({ pausar_automaticamente: value });
      await cargarDatos();
    } catch (error) {
      console.error('[Screen] Error updating config:', error);
      Alert.alert('Error', 'No se pudo actualizar la configuración');
    }
  };

  const handleResetearContador = () => {
    Alert.alert(
      'Resetear Contador',
      '¿Estás seguro de que quieres resetear el contador de llamadas API?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetear',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetearContadorManual();
              await cargarDatos();
              Alert.alert('Éxito', 'Contador reseteado correctamente');
            } catch (error) {
              console.error('[Screen] Error resetting counter:', error);
              Alert.alert('Error', 'No se pudo resetear el contador');
            }
          },
        },
      ]
    );
  };

  const handleActualizarLimite = () => {
    const limite = parseInt(nuevoLimite);
    if (isNaN(limite) || limite <= 0) {
      Alert.alert('Error', 'Ingresa un límite válido');
      return;
    }

    Alert.alert(
      'Actualizar Límite',
      `¿Cambiar el límite mensual a ${limite} llamadas?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Actualizar',
          onPress: async () => {
            try {
              await actualizarLimiteMensual(limite);
              await cargarDatos();
              Alert.alert('Éxito', 'Límite actualizado correctamente');
            } catch (error) {
              console.error('[Screen] Error updating limit:', error);
              Alert.alert('Error', 'No se pudo actualizar el límite');
            }
          },
        },
      ]
    );
  };

  const getProgressColor = (porcentaje: number) => {
    if (porcentaje < 80) return styles.progressGreen;
    if (porcentaje < 95) return styles.progressYellow;
    return styles.progressRed;
  };

  if (loading || !config || !stats) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Control de Costes API</Text>
        </LinearGradient>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Cargando...</Text>
        </View>
      </View>
    );
  }

  const costeEstimadoLote = calcularCosteEstimado({
    textSearch: 25,
    placeDetails: 25,
    photos: 100,
  });

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Control de Costes API</Text>
        <Text style={styles.headerSubtitle}>
          Gestión y monitoreo de Google Places API
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Estado de la API */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estado Actual</Text>
          <View style={styles.card}>
            <View style={[styles.statusBadge, stats.activa ? styles.statusActive : styles.statusInactive]}>
              <View style={[styles.statusDot, { backgroundColor: stats.activa ? '#10B981' : '#EF4444' }]} />
              <Text style={[styles.statusText, stats.activa ? styles.statusTextActive : styles.statusTextInactive]}>
                {stats.activa ? 'API Activa' : 'API Desactivada'}
              </Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Llamadas este mes</Text>
                <Text style={styles.statValue}>{stats.contador}</Text>
                <Text style={styles.statSubtext}>de {stats.limite}</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Porcentaje usado</Text>
                <Text style={styles.statValue}>{stats.porcentaje.toFixed(1)}%</Text>
                <Text style={styles.statSubtext}>
                  {stats.restantes} restantes
                </Text>
              </View>

              <View style={[styles.statBox, styles.statBoxFull]}>
                <Text style={styles.statLabel}>Progreso mensual</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      getProgressColor(stats.porcentaje),
                      { width: `${Math.min(stats.porcentaje, 100)}%` },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Alertas */}
        {stats.porcentaje >= 80 && (
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>
              ⚠️ {stats.porcentaje >= 95 ? 'Límite casi alcanzado' : 'Uso elevado'}
            </Text>
            <Text style={styles.alertText}>
              {stats.porcentaje >= 95
                ? `Has usado el ${stats.porcentaje.toFixed(1)}% del límite mensual. La API se pausará automáticamente al alcanzar el 100%.`
                : `Has usado el ${stats.porcentaje.toFixed(1)}% del límite mensual. Considera reducir el uso o aumentar el límite.`}
            </Text>
          </View>
        )}

        {/* Configuración */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuración</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>API Activa</Text>
                <Text style={styles.settingDescription}>
                  Activar o desactivar manualmente la API
                </Text>
              </View>
              <Switch
                value={stats.activa}
                onValueChange={handleToggleAPI}
                trackColor={{ false: '#D1D5DB', true: colors.primary }}
                thumbColor="white"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Pausa Automática</Text>
                <Text style={styles.settingDescription}>
                  Pausar automáticamente al alcanzar el límite
                </Text>
              </View>
              <Switch
                value={config.pausar_automaticamente}
                onValueChange={handleTogglePausaAutomatica}
                trackColor={{ false: '#D1D5DB', true: colors.primary }}
                thumbColor="white"
              />
            </View>

            <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Límite Mensual</Text>
                <Text style={styles.settingDescription}>
                  Número máximo de llamadas por mes
                </Text>
              </View>
            </View>

            <TextInput
              style={styles.input}
              value={nuevoLimite}
              onChangeText={setNuevoLimite}
              keyboardType="number-pad"
              placeholder="Ej: 1000"
            />

            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary, { marginTop: 10 }]}
              onPress={handleActualizarLimite}
            >
              <Text style={styles.buttonText}>Actualizar Límite</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Costes Estimados */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Costes Estimados</Text>
          <View style={styles.card}>
            <Text style={[styles.settingLabel, { marginBottom: 10 }]}>
              Lote de 25 locales (estrategia completa):
            </Text>

            <View style={styles.costTable}>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>25 × Text Search</Text>
                <Text style={styles.costValue}>$0.80</Text>
              </View>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>25 × Place Details</Text>
                <Text style={styles.costValue}>$0.43</Text>
              </View>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>100 × Photos (4 por local)</Text>
                <Text style={styles.costValue}>$0.70</Text>
              </View>
              <View style={[styles.costRow, { borderBottomWidth: 2, borderBottomColor: colors.primary }]}>
                <Text style={[styles.costLabel, { fontWeight: 'bold' }]}>Total por lote</Text>
                <Text style={[styles.costValue, { fontSize: 16, fontWeight: 'bold' }]}>
                  ${costeEstimadoLote.costeUSD.toFixed(2)}
                </Text>
              </View>
            </View>

            <Text style={[styles.settingDescription, { marginTop: 15 }]}>
              💡 Con el límite actual de {stats.limite} llamadas, puedes enriquecer aproximadamente{' '}
              {Math.floor(stats.limite / costeEstimadoLote.llamadas)} lotes de 25 locales por mes.
            </Text>
          </View>
        </View>

        {/* Acciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones</Text>
          <TouchableOpacity
            style={[styles.button, styles.buttonDanger]}
            onPress={handleResetearContador}
          >
            <Text style={styles.buttonText}>🔄 Resetear Contador</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={cargarDatos}
          >
            <Text style={styles.buttonText}>♻️ Actualizar Datos</Text>
          </TouchableOpacity>
        </View>

        {/* Info adicional */}
        <View style={[styles.card, { backgroundColor: '#EFF6FF', marginBottom: 30 }]}>
          <Text style={[styles.sectionTitle, { color: '#1E40AF', marginBottom: 8 }]}>
            📊 Información del Sistema
          </Text>
          <Text style={[styles.settingDescription, { color: '#1E40AF', marginBottom: 5 }]}>
            • Mes actual: {stats.mesActual}
          </Text>
          <Text style={[styles.settingDescription, { color: '#1E40AF', marginBottom: 5 }]}>
            • Último reset: {new Date(config.ultimo_reset).toLocaleDateString('es-ES')}
          </Text>
          <Text style={[styles.settingDescription, { color: '#1E40AF', marginBottom: 5 }]}>
            • Alerta 80%: {config.alerta_80_porciento ? 'Enviada ✓' : 'Pendiente'}
          </Text>
          <Text style={[styles.settingDescription, { color: '#1E40AF' }]}>
            • Alerta 95%: {config.alerta_95_porciento ? 'Enviada ✓' : 'Pendiente'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
