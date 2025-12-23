
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface CleanupStats {
  total_locales_activos: number;
  total_locales_excluidos: number;
  duplicados_ubicacion: number;
  duplicados_google: number;
  duplicados_osm: number;
  invalidos: number;
  fuera_categoria: number;
  cerrados_permanentemente: number;
}

interface CleanupResult {
  tipo_limpieza: string;
  grupos_procesados: number;
  locales_eliminados: number;
  locales_excluidos: number;
  detalles: any;
}

/**
 * ✅ SISTEMA DE LIMPIEZA AUTOMÁTICA v1.0
 * 
 * Sistema automático para identificar y eliminar:
 * - Locales duplicados (por ubicación, Google Place ID, OSM ID)
 * - Locales inválidos (sin ubicación, cerrados permanentemente, tipos prohibidos)
 * - Previene futuros enriquecimientos y re-importaciones de locales excluidos
 */

export default function SistemaLimpiezaAutomaticaScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<CleanupStats | null>(null);
  const [processing, setProcessing] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [incluirDuplicados, setIncluirDuplicados] = useState(true);
  const [incluirInvalidos, setIncluirInvalidos] = useState(true);
  const [lastResults, setLastResults] = useState<CleanupResult[]>([]);

  const checkAdminAccess = useCallback(async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión');
      router.back();
      return;
    }

    const { data: userData } = await supabase
      .from('usuarios')
      .select('rol_app')
      .eq('id', user.id)
      .single();

    if (userData?.rol_app !== 'admin') {
      Alert.alert('Acceso Denegado', 'Solo los administradores pueden acceder a esta página');
      router.back();
    }
  }, [user, router]);

  useEffect(() => {
    checkAdminAccess();
    loadStats();
  }, [checkAdminAccess]);

  const loadStats = async () => {
    try {
      console.log('[SistemaLimpieza] 📊 Loading cleanup statistics...');
      
      const { data, error } = await supabase.rpc('obtener_estadisticas_limpieza');

      if (error) throw error;

      console.log('[SistemaLimpieza] ✅ Statistics loaded:', data);
      setStats(data[0]);
    } catch (error) {
      console.error('[SistemaLimpieza] ❌ Error loading statistics:', error);
      Alert.alert('Error', 'No se pudieron cargar las estadísticas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleExecuteCleanup = () => {
    if (dryRun) {
      Alert.alert(
        'Simulación de Limpieza',
        'Se ejecutará una simulación sin realizar cambios reales en la base de datos.\n\n' +
        'Esto te permitirá ver qué locales serían eliminados o excluidos.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ejecutar Simulación', onPress: () => executeCleanup(true) }
        ]
      );
    } else {
      Alert.alert(
        '⚠️ ADVERTENCIA: Limpieza Real',
        'Estás a punto de ejecutar una limpieza REAL que:\n\n' +
        (incluirDuplicados ? '• Eliminará locales duplicados\n' : '') +
        (incluirInvalidos ? '• Excluirá locales inválidos\n' : '') +
        '\n⚠️ Esta acción NO se puede deshacer.\n\n' +
        '¿Estás completamente seguro?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sí, Ejecutar Limpieza',
            style: 'destructive',
            onPress: () => executeCleanup(false)
          }
        ]
      );
    }
  };

  const executeCleanup = async (isDryRun: boolean) => {
    setProcessing(true);
    setLastResults([]);
    
    try {
      console.log('[SistemaLimpieza] 🧹 Executing cleanup...');
      console.log('[SistemaLimpieza] Dry run:', isDryRun);
      console.log('[SistemaLimpieza] Include duplicates:', incluirDuplicados);
      console.log('[SistemaLimpieza] Include invalids:', incluirInvalidos);
      
      const { data, error } = await supabase.rpc('ejecutar_limpieza_completa', {
        p_admin_id: user?.id,
        p_dry_run: isDryRun,
        p_incluir_duplicados: incluirDuplicados,
        p_incluir_invalidos: incluirInvalidos
      });

      if (error) throw error;

      console.log('[SistemaLimpieza] ✅ Cleanup completed:', data);
      setLastResults(data || []);
      
      // Calculate totals
      const totalEliminados = data?.reduce((sum: number, r: CleanupResult) => sum + r.locales_eliminados, 0) || 0;
      const totalExcluidos = data?.reduce((sum: number, r: CleanupResult) => sum + r.locales_excluidos, 0) || 0;
      
      if (isDryRun) {
        Alert.alert(
          'Simulación Completada',
          `Resultados de la simulación:\n\n` +
          `• Locales que serían eliminados: ${totalEliminados}\n` +
          `• Locales que serían excluidos: ${totalExcluidos}\n\n` +
          `Desactiva el modo simulación para ejecutar la limpieza real.`,
          [{ text: 'OK', onPress: () => loadStats() }]
        );
      } else {
        Alert.alert(
          'Limpieza Completada',
          `Se ha completado la limpieza:\n\n` +
          `• Locales eliminados: ${totalEliminados}\n` +
          `• Locales excluidos: ${totalExcluidos}\n\n` +
          `Los locales excluidos no aparecerán en futuros procesos de enriquecimiento ni importaciones de OSM.`,
          [{ text: 'OK', onPress: () => loadStats() }]
        );
      }
    } catch (error) {
      console.error('[SistemaLimpieza] ❌ Error executing cleanup:', error);
      Alert.alert('Error', 'No se pudo ejecutar la limpieza');
    } finally {
      setProcessing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const getCleanupTypeLabel = (type: string) => {
    switch (type) {
      case 'invalidos': return 'Locales Inválidos';
      case 'duplicados_ubicacion': return 'Duplicados por Ubicación';
      case 'duplicados_google': return 'Duplicados por Google Place ID';
      case 'duplicados_osm': return 'Duplicados por OSM ID';
      default: return type;
    }
  };

  const getCleanupTypeIcon = (type: string) => {
    switch (type) {
      case 'invalidos': return 'xmark.circle.fill';
      case 'duplicados_ubicacion': return 'location.fill';
      case 'duplicados_google': return 'g.circle.fill';
      case 'duplicados_osm': return 'map.fill';
      default: return 'info.circle.fill';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sistema de Limpieza</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando estadísticas...</Text>
        </View>
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
        <Text style={styles.headerTitle}>Sistema de Limpieza</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={24} color={colors.headerText} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Este sistema identifica y elimina automáticamente locales duplicados e inválidos.
            {'\n\n'}
            Los locales excluidos no aparecerán en futuros procesos de enriquecimiento ni importaciones de OSM.
          </Text>
        </View>

        {/* Statistics Cards */}
        {stats && (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={32} color="#10B981" />
                <Text style={styles.statValue}>{stats.total_locales_activos}</Text>
                <Text style={styles.statLabel}>Locales Activos</Text>
              </View>
              <View style={styles.statCard}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={32} color="#EF4444" />
                <Text style={styles.statValue}>{stats.total_locales_excluidos}</Text>
                <Text style={styles.statLabel}>Locales Excluidos</Text>
              </View>
            </View>

            <View style={styles.problemsCard}>
              <Text style={styles.problemsTitle}>Problemas Detectados</Text>
              
              <View style={styles.problemRow}>
                <View style={styles.problemIcon}>
                  <IconSymbol ios_icon_name="location.fill" android_material_icon_name="location_on" size={20} color="#F59E0B" />
                </View>
                <Text style={styles.problemLabel}>Duplicados por Ubicación</Text>
                <Text style={styles.problemValue}>{stats.duplicados_ubicacion}</Text>
              </View>

              <View style={styles.problemRow}>
                <View style={styles.problemIcon}>
                  <IconSymbol ios_icon_name="g.circle.fill" android_material_icon_name="place" size={20} color="#F59E0B" />
                </View>
                <Text style={styles.problemLabel}>Duplicados por Google</Text>
                <Text style={styles.problemValue}>{stats.duplicados_google}</Text>
              </View>

              <View style={styles.problemRow}>
                <View style={styles.problemIcon}>
                  <IconSymbol ios_icon_name="map.fill" android_material_icon_name="map" size={20} color="#F59E0B" />
                </View>
                <Text style={styles.problemLabel}>Duplicados por OSM</Text>
                <Text style={styles.problemValue}>{stats.duplicados_osm}</Text>
              </View>

              <View style={styles.problemRow}>
                <View style={styles.problemIcon}>
                  <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="error" size={20} color="#EF4444" />
                </View>
                <Text style={styles.problemLabel}>Locales Inválidos</Text>
                <Text style={styles.problemValue}>{stats.invalidos}</Text>
              </View>

              <View style={styles.problemRow}>
                <View style={styles.problemIcon}>
                  <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={20} color="#EF4444" />
                </View>
                <Text style={styles.problemLabel}>Cerrados Permanentemente</Text>
                <Text style={styles.problemValue}>{stats.cerrados_permanentemente}</Text>
              </View>
            </View>
          </>
        )}

        {/* Configuration */}
        <View style={styles.configCard}>
          <Text style={styles.configTitle}>Configuración de Limpieza</Text>
          
          <View style={styles.configRow}>
            <View style={styles.configLeft}>
              <Text style={styles.configLabel}>Modo Simulación</Text>
              <Text style={styles.configDescription}>
                {dryRun ? 'No se realizarán cambios reales' : '⚠️ Se realizarán cambios permanentes'}
              </Text>
            </View>
            <Switch
              value={dryRun}
              onValueChange={setDryRun}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor={colors.headerText}
            />
          </View>

          <View style={styles.configRow}>
            <View style={styles.configLeft}>
              <Text style={styles.configLabel}>Incluir Duplicados</Text>
              <Text style={styles.configDescription}>
                Eliminar locales duplicados
              </Text>
            </View>
            <Switch
              value={incluirDuplicados}
              onValueChange={setIncluirDuplicados}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor={colors.headerText}
            />
          </View>

          <View style={styles.configRow}>
            <View style={styles.configLeft}>
              <Text style={styles.configLabel}>Incluir Inválidos</Text>
              <Text style={styles.configDescription}>
                Excluir locales inválidos
              </Text>
            </View>
            <Switch
              value={incluirInvalidos}
              onValueChange={setIncluirInvalidos}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor={colors.headerText}
            />
          </View>
        </View>

        {/* Execute Button */}
        <TouchableOpacity
          style={[styles.executeButton, processing && styles.executeButtonDisabled]}
          onPress={handleExecuteCleanup}
          disabled={processing || (!incluirDuplicados && !incluirInvalidos)}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <IconSymbol 
                ios_icon_name={dryRun ? "play.circle.fill" : "trash.fill"} 
                android_material_icon_name={dryRun ? "play_arrow" : "delete"} 
                size={24} 
                color="#fff" 
              />
              <Text style={styles.executeButtonText}>
                {dryRun ? 'Ejecutar Simulación' : 'Ejecutar Limpieza Real'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Last Results */}
        {lastResults.length > 0 && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>
              {dryRun ? 'Resultados de Simulación' : 'Resultados de Limpieza'}
            </Text>
            
            {lastResults.map((result, index) => (
              <View key={index} style={styles.resultRow}>
                <View style={styles.resultHeader}>
                  <IconSymbol 
                    ios_icon_name={getCleanupTypeIcon(result.tipo_limpieza)} 
                    android_material_icon_name="info" 
                    size={20} 
                    color={colors.primary} 
                  />
                  <Text style={styles.resultType}>
                    {getCleanupTypeLabel(result.tipo_limpieza)}
                  </Text>
                </View>
                <View style={styles.resultStats}>
                  {result.grupos_procesados > 0 && (
                    <Text style={styles.resultStat}>
                      Grupos: {result.grupos_procesados}
                    </Text>
                  )}
                  {result.locales_eliminados > 0 && (
                    <Text style={styles.resultStat}>
                      Eliminados: {result.locales_eliminados}
                    </Text>
                  )}
                  {result.locales_excluidos > 0 && (
                    <Text style={styles.resultStat}>
                      Excluidos: {result.locales_excluidos}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Warning Card */}
        <View style={styles.warningCard}>
          <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={20} color="#F59E0B" />
          <Text style={styles.warningText}>
            <Text style={styles.warningBold}>Importante:</Text> Los locales excluidos se agregan a la tabla `locales_excluidos` y no aparecerán en:
            {'\n\n'}
            • Futuros procesos de enriquecimiento con Google
            {'\n'}
            • Importaciones desde OpenStreetMap
            {'\n'}
            • Búsquedas de duplicados
          </Text>
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
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  infoCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  problemsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  problemsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  problemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  problemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  problemLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  problemValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  configCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  configTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  configLeft: {
    flex: 1,
    marginRight: 16,
  },
  configLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  configDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  executeButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  executeButtonDisabled: {
    opacity: 0.6,
  },
  executeButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.headerText,
  },
  resultsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  resultRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  resultType: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  resultStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  resultStat: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  warningCard: {
    backgroundColor: '#F59E0B' + '10',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#F59E0B' + '30',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  warningBold: {
    fontWeight: '700',
  },
});
