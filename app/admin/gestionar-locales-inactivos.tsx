
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

interface Stats {
  totalInactivos: number;
  porProvincia: Record<string, number>;
  porCategoria: Record<string, number>;
  sinEnriquecer: number;
  rechazados: number;
}

/**
 * ✅ GESTIONAR LOCALES INACTIVOS v160.0
 * 
 * HERRAMIENTA PARA OPTIMIZAR RENDIMIENTO:
 * - Ver estadísticas de locales inactivos (OSM sin enriquecer)
 * - Activar locales por lotes (provincia + categoría)
 * - Eliminar locales inactivos que no se van a usar
 * - Mantener la base de datos limpia y rápida
 * 
 * RECOMENDACIÓN:
 * - Solo activa locales que hayas enriquecido con Google Places
 * - Los locales inactivos no afectan el rendimiento (no se cargan)
 * - Puedes eliminar locales OSM que no planeas enriquecer
 */

export default function GestionarLocalesInactivosScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalInactivos: 0,
    porProvincia: {},
    porCategoria: {},
    sinEnriquecer: 0,
    rechazados: 0,
  });
  const [processing, setProcessing] = useState(false);
  const [autoActivarEnriquecidos, setAutoActivarEnriquecidos] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      console.log('[GestionarInactivos v160.0] Loading stats...');
      setLoading(true);

      // Get all inactive locales
      const { data: inactivos, error } = await supabase
        .from('locales')
        .select('id, provincia, tipo, enriquecido, notas_rechazo, source_type')
        .eq('activo', false);

      if (error) throw error;

      console.log('[GestionarInactivos v160.0] Inactive locales:', inactivos?.length || 0);

      // Calculate stats
      const porProvincia: Record<string, number> = {};
      const porCategoria: Record<string, number> = {};
      let sinEnriquecer = 0;
      let rechazados = 0;

      (inactivos || []).forEach(local => {
        // By province
        porProvincia[local.provincia] = (porProvincia[local.provincia] || 0) + 1;
        
        // By category
        porCategoria[local.tipo] = (porCategoria[local.tipo] || 0) + 1;
        
        // Without enrichment
        if (!local.enriquecido) {
          sinEnriquecer++;
        }
        
        // Rejected
        if (local.notas_rechazo) {
          rechazados++;
        }
      });

      setStats({
        totalInactivos: inactivos?.length || 0,
        porProvincia,
        porCategoria,
        sinEnriquecer,
        rechazados,
      });

      console.log('[GestionarInactivos v160.0] Stats calculated:', {
        total: inactivos?.length || 0,
        sinEnriquecer,
        rechazados,
      });
    } catch (error) {
      console.error('[GestionarInactivos v160.0] Error loading stats:', error);
      Alert.alert('Error', 'No se pudieron cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const activarLocalesEnriquecidos = useCallback(async () => {
    Alert.alert(
      'Activar Locales Enriquecidos',
      `Se activarán TODOS los locales inactivos que ya están enriquecidos.\n\nEsto mejorará el catálogo visible para los usuarios.\n\n¿Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Activar',
          onPress: async () => {
            try {
              setProcessing(true);
              console.log('[GestionarInactivos v160.0] Activating enriched locales...');

              const { data: updated, error } = await supabase
                .from('locales')
                .update({ activo: true })
                .eq('activo', false)
                .eq('enriquecido', true)
                .is('notas_rechazo', null)
                .select('id');

              if (error) throw error;

              console.log('[GestionarInactivos v160.0] Activated:', updated?.length || 0);

              Alert.alert(
                'Éxito',
                `Se activaron ${updated?.length || 0} locales enriquecidos`,
                [{ text: 'OK', onPress: () => loadStats() }]
              );
            } catch (error) {
              console.error('[GestionarInactivos v160.0] Error:', error);
              Alert.alert('Error', 'No se pudieron activar los locales');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  }, [loadStats]);

  const eliminarLocalesSinEnriquecer = useCallback(async () => {
    Alert.alert(
      '⚠️ ELIMINAR LOCALES SIN ENRIQUECER',
      `Esta acción eliminará ${stats.sinEnriquecer} locales inactivos que NO están enriquecidos.\n\nEsto incluye:\n- Locales OSM sin datos de Google\n- Locales que no planeas enriquecer\n\n⚠️ ESTA ACCIÓN NO SE PUEDE DESHACER\n\n¿Estás seguro?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              console.log('[GestionarInactivos v160.0] Deleting unenriched locales...');

              // Get IDs to delete
              const { data: toDelete, error: selectError } = await supabase
                .from('locales')
                .select('id, nombre')
                .eq('activo', false)
                .eq('enriquecido', false)
                .is('notas_rechazo', null);

              if (selectError) throw selectError;

              console.log('[GestionarInactivos v160.0] Locales to delete:', toDelete?.length || 0);

              if (!toDelete || toDelete.length === 0) {
                Alert.alert('Info', 'No hay locales sin enriquecer para eliminar');
                setProcessing(false);
                return;
              }

              // Delete in batches of 100
              const batchSize = 100;
              let deleted = 0;

              for (let i = 0; i < toDelete.length; i += batchSize) {
                const batch = toDelete.slice(i, i + batchSize);
                const ids = batch.map(l => l.id);

                const { error: deleteError } = await supabase
                  .from('locales')
                  .delete()
                  .in('id', ids);

                if (deleteError) {
                  console.error('[GestionarInactivos v160.0] Error deleting batch:', deleteError);
                } else {
                  deleted += batch.length;
                  console.log('[GestionarInactivos v160.0] Deleted batch:', batch.length, 'Total:', deleted);
                }
              }

              Alert.alert(
                'Éxito',
                `Se eliminaron ${deleted} locales sin enriquecer.\n\nLa base de datos ahora es más rápida y eficiente.`,
                [{ text: 'OK', onPress: () => loadStats() }]
              );
            } catch (error) {
              console.error('[GestionarInactivos v160.0] Error:', error);
              Alert.alert('Error', 'No se pudieron eliminar los locales');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  }, [stats.sinEnriquecer, loadStats]);

  const eliminarLocalesRechazados = useCallback(async () => {
    Alert.alert(
      '⚠️ ELIMINAR LOCALES RECHAZADOS',
      `Esta acción eliminará ${stats.rechazados} locales que fueron rechazados durante el enriquecimiento.\n\n⚠️ ESTA ACCIÓN NO SE PUEDE DESHACER\n\n¿Estás seguro?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              console.log('[GestionarInactivos v160.0] Deleting rejected locales...');

              const { data: deleted, error } = await supabase
                .from('locales')
                .delete()
                .eq('activo', false)
                .not('notas_rechazo', 'is', null)
                .select('id');

              if (error) throw error;

              console.log('[GestionarInactivos v160.0] Deleted:', deleted?.length || 0);

              Alert.alert(
                'Éxito',
                `Se eliminaron ${deleted?.length || 0} locales rechazados`,
                [{ text: 'OK', onPress: () => loadStats() }]
              );
            } catch (error) {
              console.error('[GestionarInactivos v160.0] Error:', error);
              Alert.alert('Error', 'No se pudieron eliminar los locales');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  }, [stats.rechazados, loadStats]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { fontSize: scaleFontSize(16) }]}>Cargando estadísticas...</Text>
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
          <IconSymbol 
            ios_icon_name="chevron.left" 
            android_material_icon_name="arrow_back" 
            size={Platform.OS === 'android' ? scaleIconSize(24) : 24} 
            color={colors.headerText} 
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: scaleFontSize(20) }]}>Gestionar Locales Inactivos</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Box */}
        <View style={[styles.infoBox, { backgroundColor: '#DBEAFE' }]}>
          <IconSymbol 
            ios_icon_name="info.circle.fill" 
            android_material_icon_name="info" 
            size={Platform.OS === 'android' ? scaleIconSize(24) : 24} 
            color="#1E40AF" 
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoBoxTitle, { color: '#1E40AF', fontSize: scaleFontSize(14) }]}>
              💡 Optimización de Rendimiento
            </Text>
            <Text style={[styles.infoBoxText, { color: '#1E40AF', fontSize: scaleFontSize(12) }]}>
              Los locales inactivos NO afectan el rendimiento de la app (no se cargan).
              {'\n\n'}
              Solo activa locales que hayas enriquecido con Google Places.
              {'\n\n'}
              Puedes eliminar locales OSM que no planeas enriquecer para mantener la base de datos limpia.
            </Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { fontSize: scaleFontSize(32) }]}>{stats.totalInactivos}</Text>
            <Text style={[styles.statLabel, { fontSize: scaleFontSize(12) }]}>Total Inactivos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#F59E0B', fontSize: scaleFontSize(32) }]}>{stats.sinEnriquecer}</Text>
            <Text style={[styles.statLabel, { fontSize: scaleFontSize(12) }]}>Sin Enriquecer</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#EF4444', fontSize: scaleFontSize(32) }]}>{stats.rechazados}</Text>
            <Text style={[styles.statLabel, { fontSize: scaleFontSize(12) }]}>Rechazados</Text>
          </View>
        </View>

        {/* Auto-activate enriched locales */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(18) }]}>Activación Automática</Text>
          
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { fontSize: scaleFontSize(15) }]}>
                  Activar locales enriquecidos automáticamente
                </Text>
                <Text style={[styles.switchSubLabel, { fontSize: scaleFontSize(12) }]}>
                  Los locales se activarán al completar el enriquecimiento
                </Text>
              </View>
              <Switch
                value={autoActivarEnriquecidos}
                onValueChange={setAutoActivarEnriquecidos}
                trackColor={{ false: colors.cardBorder, true: colors.primary }}
                thumbColor={colors.headerText}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary, { marginTop: 16 }]}
              onPress={activarLocalesEnriquecidos}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color={colors.headerText} />
              ) : (
                <React.Fragment>
                  <IconSymbol 
                    ios_icon_name="checkmark.circle.fill" 
                    android_material_icon_name="check_circle" 
                    size={Platform.OS === 'android' ? scaleIconSize(20) : 20} 
                    color={colors.headerText} 
                  />
                  <Text style={[styles.buttonText, { fontSize: scaleFontSize(15) }]}>
                    Activar Todos los Enriquecidos
                  </Text>
                </React.Fragment>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Cleanup Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(18) }]}>Limpieza de Base de Datos</Text>
          
          <View style={styles.card}>
            <View style={styles.actionRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionTitle, { fontSize: scaleFontSize(15) }]}>
                  Eliminar locales sin enriquecer
                </Text>
                <Text style={[styles.actionSubtitle, { fontSize: scaleFontSize(12) }]}>
                  {stats.sinEnriquecer} locales OSM que no están enriquecidos
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.button, styles.buttonDanger]}
                onPress={eliminarLocalesSinEnriquecer}
                disabled={processing || stats.sinEnriquecer === 0}
              >
                <IconSymbol 
                  ios_icon_name="trash.fill" 
                  android_material_icon_name="delete" 
                  size={Platform.OS === 'android' ? scaleIconSize(18) : 18} 
                  color={colors.headerText} 
                />
                <Text style={[styles.buttonText, { fontSize: scaleFontSize(13) }]}>Eliminar</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.actionRow, { marginTop: 16 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionTitle, { fontSize: scaleFontSize(15) }]}>
                  Eliminar locales rechazados
                </Text>
                <Text style={[styles.actionSubtitle, { fontSize: scaleFontSize(12) }]}>
                  {stats.rechazados} locales que fueron rechazados
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.button, styles.buttonDanger]}
                onPress={eliminarLocalesRechazados}
                disabled={processing || stats.rechazados === 0}
              >
                <IconSymbol 
                  ios_icon_name="trash.fill" 
                  android_material_icon_name="delete" 
                  size={Platform.OS === 'android' ? scaleIconSize(18) : 18} 
                  color={colors.headerText} 
                />
                <Text style={[styles.buttonText, { fontSize: scaleFontSize(13) }]}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Stats by Province */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(18) }]}>Por Provincia</Text>
          <View style={styles.card}>
            {Object.entries(stats.porProvincia)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([provincia, count]) => (
                <View key={provincia} style={styles.statRow}>
                  <Text style={[styles.statRowLabel, { fontSize: scaleFontSize(14) }]}>{provincia}</Text>
                  <Text style={[styles.statRowValue, { fontSize: scaleFontSize(14) }]}>{count}</Text>
                </View>
              ))}
          </View>
        </View>

        {/* Stats by Category */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(18) }]}>Por Categoría</Text>
          <View style={styles.card}>
            {Object.entries(stats.porCategoria)
              .sort((a, b) => b[1] - a[1])
              .map(([categoria, count]) => (
                <View key={categoria} style={styles.statRow}>
                  <Text style={[styles.statRowLabel, { fontSize: scaleFontSize(14) }]}>{categoria}</Text>
                  <Text style={[styles.statRowValue, { fontSize: scaleFontSize(14) }]}>{count}</Text>
                </View>
              ))}
          </View>
        </View>

        {/* Performance Tips */}
        <View style={[styles.infoBox, { backgroundColor: '#D1FAE5', marginTop: 20 }]}>
          <IconSymbol 
            ios_icon_name="bolt.fill" 
            android_material_icon_name="flash_on" 
            size={Platform.OS === 'android' ? scaleIconSize(24) : 24} 
            color="#065F46" 
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoBoxTitle, { color: '#065F46', fontSize: scaleFontSize(14) }]}>
              ⚡ Consejos de Rendimiento
            </Text>
            <Text style={[styles.infoBoxText, { color: '#065F46', fontSize: scaleFontSize(12) }]}>
              1. Solo activa locales enriquecidos con Google Places
              {'\n'}
              2. Elimina locales OSM que no planeas enriquecer
              {'\n'}
              3. Los locales inactivos no afectan el rendimiento
              {'\n'}
              4. Enriquece por lotes de 25-50 locales
              {'\n'}
              5. Activa gradualmente por provincia
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
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
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
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
    fontWeight: '800',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoBoxTitle: {
    fontWeight: '700',
    marginBottom: 6,
  },
  infoBoxText: {
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...commonStyles.cardShadow,
  },
  statNumber: {
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    ...commonStyles.cardShadow,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  switchSubLabel: {
    color: colors.textSecondary,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonDanger: {
    backgroundColor: colors.badgeNuevo,
  },
  buttonText: {
    fontWeight: '600',
    color: colors.headerText,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionTitle: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  actionSubtitle: {
    color: colors.textSecondary,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  statRowLabel: {
    color: colors.text,
    fontWeight: '500',
  },
  statRowValue: {
    color: colors.primary,
    fontWeight: '700',
  },
});
