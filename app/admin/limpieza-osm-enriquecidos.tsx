
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
  total_osm_enriquecidos: number;
  total_osm_activos: number;
  total_osm_pendientes: number;
  espacio_estimado_mb: number;
  por_provincia: Array<{
    provincia: string;
    total: number;
    enriquecidos: number;
  }>;
}

interface CleanupResult {
  locales_eliminados: number;
  espacio_liberado_mb: number;
  detalles: Array<{
    id: string;
    nombre: string;
    provincia: string;
  }>;
}

/**
 * 🗑️ SISTEMA DE LIMPIEZA DE LOCALES OSM ENRIQUECIDOS
 * 
 * Este sistema elimina automáticamente los locales importados de OSM
 * que ya han sido enriquecidos con Google Places y están activos en la app.
 * 
 * OBJETIVO: Liberar espacio y mejorar rendimiento eliminando datos redundantes.
 * 
 * LÓGICA:
 * - Los locales OSM solo son útiles DURANTE el proceso de enriquecimiento
 * - Una vez enriquecidos con Google Places y activados, ya no se necesitan en OSM
 * - Los locales enriquecidos están publicados en "Explorar" y "Mapa"
 * - Eliminar OSM enriquecidos NO afecta la visibilidad en la app
 */

export default function LimpiezaOSMEnriquecidosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<CleanupStats | null>(null);
  const [processing, setProcessing] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [lastResult, setLastResult] = useState<CleanupResult | null>(null);
  const [autoCleanupEnabled, setAutoCleanupEnabled] = useState(false);

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
    checkAutoCleanupStatus();
  }, [checkAdminAccess]);

  const loadStats = async () => {
    try {
      console.log('[OSM Cleanup] 📊 Loading statistics...');
      
      // Query OSM locales statistics
      const { data: osmLocales, error } = await supabase
        .from('locales')
        .select('id, nombre, provincia, activo, enriquecido, source_type')
        .eq('source_type', 'osm');

      if (error) throw error;

      const totalOSM = osmLocales?.length || 0;
      const osmEnriquecidos = osmLocales?.filter(l => l.enriquecido && l.activo).length || 0;
      const osmActivos = osmLocales?.filter(l => l.activo).length || 0;
      const osmPendientes = osmLocales?.filter(l => !l.activo && !l.enriquecido).length || 0;

      // Estimate space (rough estimate: ~5KB per local)
      const espacioEstimadoMB = Math.round((osmEnriquecidos * 5) / 1024);

      // Group by province
      const porProvincia: Record<string, { total: number; enriquecidos: number }> = {};
      osmLocales?.forEach(local => {
        const provincia = local.provincia || 'Desconocida';
        if (!porProvincia[provincia]) {
          porProvincia[provincia] = { total: 0, enriquecidos: 0 };
        }
        porProvincia[provincia].total++;
        if (local.enriquecido && local.activo) {
          porProvincia[provincia].enriquecidos++;
        }
      });

      const porProvinciaArray = Object.entries(porProvincia)
        .map(([provincia, data]) => ({
          provincia,
          total: data.total,
          enriquecidos: data.enriquecidos,
        }))
        .sort((a, b) => b.enriquecidos - a.enriquecidos);

      console.log('[OSM Cleanup] ✅ Statistics loaded:', {
        totalOSM,
        osmEnriquecidos,
        osmActivos,
        osmPendientes,
        espacioEstimadoMB,
      });

      setStats({
        total_osm_enriquecidos: osmEnriquecidos,
        total_osm_activos: osmActivos,
        total_osm_pendientes: osmPendientes,
        espacio_estimado_mb: espacioEstimadoMB,
        por_provincia: porProvinciaArray,
      });
    } catch (error) {
      console.error('[OSM Cleanup] ❌ Error loading statistics:', error);
      Alert.alert('Error', 'No se pudieron cargar las estadísticas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkAutoCleanupStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'auto_cleanup_osm_enriched')
        .single();

      if (!error && data) {
        setAutoCleanupEnabled(data.value?.enabled === true);
      }
    } catch (error) {
      console.error('[OSM Cleanup] Error checking auto-cleanup status:', error);
    }
  };

  const toggleAutoCleanup = async (enabled: boolean) => {
    try {
      console.log('[OSM Cleanup] Toggling auto-cleanup:', enabled);

      const { error } = await supabase
        .from('app_config')
        .upsert({
          key: 'auto_cleanup_osm_enriched',
          value: { enabled },
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setAutoCleanupEnabled(enabled);
      
      Alert.alert(
        enabled ? 'Limpieza Automática Activada' : 'Limpieza Automática Desactivada',
        enabled
          ? 'Los locales OSM enriquecidos se eliminarán automáticamente después de ser activados en la app.'
          : 'La limpieza automática ha sido desactivada. Los locales OSM enriquecidos permanecerán en la base de datos.'
      );
    } catch (error) {
      console.error('[OSM Cleanup] Error toggling auto-cleanup:', error);
      Alert.alert('Error', 'No se pudo cambiar la configuración de limpieza automática');
    }
  };

  const handleExecuteCleanup = () => {
    if (!stats || stats.total_osm_enriquecidos === 0) {
      Alert.alert('Sin locales', 'No hay locales OSM enriquecidos para eliminar');
      return;
    }

    if (dryRun) {
      Alert.alert(
        'Simulación de Limpieza',
        `Se ejecutará una simulación sin realizar cambios reales.\n\n` +
        `Locales OSM enriquecidos a eliminar: ${stats.total_osm_enriquecidos}\n` +
        `Espacio estimado a liberar: ${stats.espacio_estimado_mb} MB\n\n` +
        'Esto te permitirá ver qué locales serían eliminados.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ejecutar Simulación', onPress: () => executeCleanup(true) }
        ]
      );
    } else {
      Alert.alert(
        '⚠️ ADVERTENCIA: Limpieza Real',
        `Estás a punto de ejecutar una limpieza REAL que:\n\n` +
        `• Eliminará ${stats.total_osm_enriquecidos} locales OSM enriquecidos\n` +
        `• Liberará aproximadamente ${stats.espacio_estimado_mb} MB de espacio\n` +
        `• Los locales seguirán visibles en "Explorar" y "Mapa" (están enriquecidos con Google Places)\n\n` +
        `⚠️ Esta acción NO se puede deshacer.\n\n` +
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
    setLastResult(null);
    
    try {
      console.log('[OSM Cleanup] 🧹 Executing cleanup...');
      console.log('[OSM Cleanup] Dry run:', isDryRun);
      
      if (isDryRun) {
        // Simulation: Just count what would be deleted
        const { data: localesAEliminar, error } = await supabase
          .from('locales')
          .select('id, nombre, provincia')
          .eq('source_type', 'osm')
          .eq('enriquecido', true)
          .eq('activo', true);

        if (error) throw error;

        const result: CleanupResult = {
          locales_eliminados: localesAEliminar?.length || 0,
          espacio_liberado_mb: Math.round(((localesAEliminar?.length || 0) * 5) / 1024),
          detalles: (localesAEliminar || []).slice(0, 10).map(l => ({
            id: l.id,
            nombre: l.nombre,
            provincia: l.provincia,
          })),
        };

        setLastResult(result);

        Alert.alert(
          'Simulación Completada',
          `Resultados de la simulación:\n\n` +
          `• Locales que serían eliminados: ${result.locales_eliminados}\n` +
          `• Espacio que se liberaría: ${result.espacio_liberado_mb} MB\n\n` +
          `Desactiva el modo simulación para ejecutar la limpieza real.`,
          [{ text: 'OK', onPress: () => loadStats() }]
        );
      } else {
        // Real cleanup: Delete enriched OSM locales
        const { data: localesAEliminar, error: fetchError } = await supabase
          .from('locales')
          .select('id, nombre, provincia')
          .eq('source_type', 'osm')
          .eq('enriquecido', true)
          .eq('activo', true);

        if (fetchError) throw fetchError;

        console.log('[OSM Cleanup] Found locales to delete:', localesAEliminar?.length || 0);

        if (!localesAEliminar || localesAEliminar.length === 0) {
          Alert.alert('Sin locales', 'No hay locales OSM enriquecidos para eliminar');
          setProcessing(false);
          return;
        }

        // Delete in batches
        const batchSize = 100;
        let totalDeleted = 0;
        
        for (let i = 0; i < localesAEliminar.length; i += batchSize) {
          const batch = localesAEliminar.slice(i, i + batchSize);
          const ids = batch.map(l => l.id);
          
          console.log(`[OSM Cleanup] Deleting batch ${i / batchSize + 1}:`, ids.length, 'locales');
          
          const { error: deleteError } = await supabase
            .from('locales')
            .delete()
            .in('id', ids);

          if (deleteError) {
            console.error('[OSM Cleanup] Error deleting batch:', deleteError);
            throw deleteError;
          }

          totalDeleted += ids.length;
          console.log(`[OSM Cleanup] ✅ Deleted ${totalDeleted}/${localesAEliminar.length} locales`);
        }

        const result: CleanupResult = {
          locales_eliminados: totalDeleted,
          espacio_liberado_mb: Math.round((totalDeleted * 5) / 1024),
          detalles: localesAEliminar.slice(0, 10).map(l => ({
            id: l.id,
            nombre: l.nombre,
            provincia: l.provincia,
          })),
        };

        setLastResult(result);

        console.log('[OSM Cleanup] ✅ Cleanup completed:', result);

        Alert.alert(
          'Limpieza Completada',
          `Se ha completado la limpieza:\n\n` +
          `• Locales OSM eliminados: ${result.locales_eliminados}\n` +
          `• Espacio liberado: ${result.espacio_liberado_mb} MB\n\n` +
          `✅ Los locales siguen visibles en "Explorar" y "Mapa" porque están enriquecidos con Google Places.\n\n` +
          `💡 El catálogo OSM ahora solo contiene locales pendientes de enriquecer.`,
          [{ text: 'OK', onPress: () => loadStats() }]
        );
      }
    } catch (error) {
      console.error('[OSM Cleanup] ❌ Error executing cleanup:', error);
      Alert.alert('Error', 'No se pudo ejecutar la limpieza');
    } finally {
      setProcessing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
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
          <Text style={styles.headerTitle}>Limpieza OSM Enriquecidos</Text>
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
        <Text style={styles.headerTitle}>Limpieza OSM Enriquecidos</Text>
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
            <Text style={styles.infoBold}>¿Por qué eliminar locales OSM enriquecidos?</Text>
            {'\n\n'}
            Los locales importados de OSM solo son útiles DURANTE el proceso de enriquecimiento.
            {'\n\n'}
            Una vez enriquecidos con Google Places y activados, ya NO se necesitan en el catálogo OSM porque:
            {'\n\n'}
            ✅ Están publicados en "Explorar" y "Mapa" con datos de Google Places
            {'\n'}
            ✅ Tienen fotos, horarios, reviews y toda la información completa
            {'\n'}
            ✅ Mantenerlos en OSM solo ocupa espacio y ralentiza la app
            {'\n\n'}
            <Text style={styles.infoBold}>Eliminarlos NO afecta su visibilidad en la app.</Text>
          </Text>
        </View>

        {/* Statistics Cards */}
        {stats && (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={32} color="#EF4444" />
                <Text style={styles.statValue}>{stats.total_osm_enriquecidos}</Text>
                <Text style={styles.statLabel}>OSM Enriquecidos</Text>
                <Text style={styles.statSubLabel}>Listos para eliminar</Text>
              </View>
              <View style={styles.statCard}>
                <IconSymbol ios_icon_name="hourglass" android_material_icon_name="schedule" size={32} color="#F59E0B" />
                <Text style={styles.statValue}>{stats.total_osm_pendientes}</Text>
                <Text style={styles.statLabel}>OSM Pendientes</Text>
                <Text style={styles.statSubLabel}>Aún no enriquecidos</Text>
              </View>
            </View>

            <View style={styles.spaceCard}>
              <View style={styles.spaceHeader}>
                <IconSymbol ios_icon_name="externaldrive.fill" android_material_icon_name="storage" size={28} color={colors.primary} />
                <View style={styles.spaceInfo}>
                  <Text style={styles.spaceTitle}>Espacio a Liberar</Text>
                  <Text style={styles.spaceValue}>{stats.espacio_estimado_mb} MB</Text>
                  <Text style={styles.spaceDescription}>
                    Eliminando {stats.total_osm_enriquecidos} locales OSM redundantes
                  </Text>
                </View>
              </View>
            </View>

            {/* Auto-Cleanup Configuration */}
            <View style={styles.autoCleanupCard}>
              <View style={styles.autoCleanupHeader}>
                <IconSymbol ios_icon_name="arrow.triangle.2.circlepath" android_material_icon_name="autorenew" size={24} color={colors.primary} />
                <Text style={styles.autoCleanupTitle}>Limpieza Automática</Text>
              </View>
              
              <Text style={styles.autoCleanupDescription}>
                Cuando está activada, los locales OSM se eliminan automáticamente después de ser enriquecidos y activados.
                {'\n\n'}
                Esto mantiene el catálogo limpio sin intervención manual.
              </Text>

              <View style={styles.configRow}>
                <View style={styles.configLeft}>
                  <Text style={styles.configLabel}>
                    {autoCleanupEnabled ? '✅ Activada' : '❌ Desactivada'}
                  </Text>
                  <Text style={styles.configDescription}>
                    {autoCleanupEnabled 
                      ? 'Los locales OSM se eliminan automáticamente al enriquecerse' 
                      : 'Los locales OSM permanecen en la base de datos'}
                  </Text>
                </View>
                <Switch
                  value={autoCleanupEnabled}
                  onValueChange={toggleAutoCleanup}
                  trackColor={{ false: colors.cardBorder, true: colors.primary }}
                  thumbColor={colors.headerText}
                />
              </View>
            </View>

            {/* Province Breakdown */}
            {stats.por_provincia.length > 0 && (
              <View style={styles.provinceCard}>
                <Text style={styles.provinceTitle}>Desglose por Provincia</Text>
                <Text style={styles.provinceSubtitle}>
                  Locales OSM enriquecidos por provincia
                </Text>
                
                {stats.por_provincia.slice(0, 10).map((prov, index) => (
                  <View key={index} style={styles.provinceRow}>
                    <Text style={styles.provinceName}>{prov.provincia}</Text>
                    <View style={styles.provinceStats}>
                      <Text style={styles.provinceEnriquecidos}>
                        {prov.enriquecidos} enriquecidos
                      </Text>
                      <Text style={styles.provinceTotal}>
                        de {prov.total} total
                      </Text>
                    </View>
                  </View>
                ))}
                
                {stats.por_provincia.length > 10 && (
                  <Text style={styles.provinceMore}>
                    Y {stats.por_provincia.length - 10} provincias más...
                  </Text>
                )}
              </View>
            )}
          </>
        )}

        {/* Configuration */}
        <View style={styles.configCard}>
          <Text style={styles.configTitle}>Configuración de Limpieza Manual</Text>
          
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
        </View>

        {/* Execute Button */}
        <TouchableOpacity
          style={[styles.executeButton, (processing || !stats || stats.total_osm_enriquecidos === 0) && styles.executeButtonDisabled]}
          onPress={handleExecuteCleanup}
          disabled={processing || !stats || stats.total_osm_enriquecidos === 0}
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

        {/* Info about automatic cleanup */}
        {stats && stats.total_osm_enriquecidos === 0 && (
          <View style={styles.successCard}>
            <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={32} color="#10B981" />
            <Text style={styles.successTitle}>¡Catálogo OSM Limpio!</Text>
            <Text style={styles.successText}>
              No hay locales OSM enriquecidos en la base de datos.
              {'\n\n'}
              {autoCleanupEnabled 
                ? '✅ La limpieza automática está activada y mantendrá el catálogo limpio.'
                : '💡 Activa la limpieza automática para mantener el catálogo limpio automáticamente.'}
            </Text>
          </View>
        )}

        {/* Last Results */}
        {lastResult && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>
              {dryRun ? 'Resultados de Simulación' : 'Resultados de Limpieza'}
            </Text>
            
            <View style={styles.resultSummary}>
              <View style={styles.resultSummaryRow}>
                <Text style={styles.resultSummaryLabel}>Locales eliminados:</Text>
                <Text style={styles.resultSummaryValue}>{lastResult.locales_eliminados}</Text>
              </View>
              <View style={styles.resultSummaryRow}>
                <Text style={styles.resultSummaryLabel}>Espacio liberado:</Text>
                <Text style={styles.resultSummaryValue}>{lastResult.espacio_liberado_mb} MB</Text>
              </View>
            </View>

            {lastResult.detalles.length > 0 && (
              <>
                <Text style={styles.resultDetailsTitle}>
                  Primeros {lastResult.detalles.length} locales:
                </Text>
                {lastResult.detalles.map((local, index) => (
                  <View key={index} style={styles.resultDetailRow}>
                    <Text style={styles.resultDetailName}>{local.nombre}</Text>
                    <Text style={styles.resultDetailProvincia}>{local.provincia}</Text>
                  </View>
                ))}
                {lastResult.locales_eliminados > lastResult.detalles.length && (
                  <Text style={styles.resultMore}>
                    Y {lastResult.locales_eliminados - lastResult.detalles.length} locales más...
                  </Text>
                )}
              </>
            )}
          </View>
        )}

        {/* Warning Card */}
        <View style={styles.warningCard}>
          <IconSymbol ios_icon_name="checkmark.shield.fill" android_material_icon_name="verified_user" size={20} color="#10B981" />
          <Text style={styles.warningText}>
            <Text style={styles.warningBold}>Seguridad Garantizada:</Text>
            {'\n\n'}
            ✅ Solo se eliminan locales OSM que están enriquecidos Y activos
            {'\n'}
            ✅ Los locales siguen visibles en "Explorar" y "Mapa"
            {'\n'}
            ✅ Los datos de Google Places se mantienen intactos
            {'\n'}
            ✅ Los locales OSM pendientes NO se tocan
            {'\n\n'}
            Esta limpieza solo elimina datos redundantes del catálogo OSM.
          </Text>
        </View>

        {/* Technical Info */}
        <View style={styles.technicalCard}>
          <Text style={styles.technicalTitle}>Información Técnica</Text>
          <Text style={styles.technicalText}>
            <Text style={styles.technicalBold}>Criterios de eliminación:</Text>
            {'\n\n'}
            • source_type = 'osm'
            {'\n'}
            • enriquecido = true
            {'\n'}
            • activo = true
            {'\n\n'}
            <Text style={styles.technicalBold}>Locales que NO se eliminan:</Text>
            {'\n\n'}
            • Locales OSM pendientes de enriquecer (activo = false)
            {'\n'}
            • Locales creados manualmente (source_type = 'manual')
            {'\n'}
            • Locales de Google Places (source_type = 'google')
            {'\n\n'}
            <Text style={styles.technicalBold}>Impacto en la app:</Text>
            {'\n\n'}
            ✅ NINGUNO - Los locales siguen visibles porque están enriquecidos
            {'\n'}
            ✅ Mejora el rendimiento al reducir el tamaño de la base de datos
            {'\n'}
            ✅ Acelera las consultas en "Explorar" y "Mapa"
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
    fontSize: 18,
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
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: '700',
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
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  statSubLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  spaceCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  spaceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  spaceInfo: {
    flex: 1,
  },
  spaceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  spaceValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  spaceDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  autoCleanupCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  autoCleanupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  autoCleanupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#166534',
  },
  autoCleanupDescription: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 20,
    marginBottom: 16,
  },
  provinceCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  provinceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  provinceSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  provinceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  provinceName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  provinceStats: {
    alignItems: 'flex-end',
  },
  provinceEnriquecidos: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  provinceTotal: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  provinceMore: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
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
  resultSummary: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  resultSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultSummaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  resultSummaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  resultDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  resultDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  resultDetailName: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  resultDetailProvincia: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  resultMore: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  warningCard: {
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#6EE7B7',
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#065F46',
    lineHeight: 20,
  },
  warningBold: {
    fontWeight: '700',
  },
  technicalCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  technicalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  technicalText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  technicalBold: {
    fontWeight: '700',
    color: colors.text,
  },
  successCard: {
    backgroundColor: '#D1FAE5',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#065F46',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  successText: {
    fontSize: 14,
    color: '#065F46',
    textAlign: 'center',
    lineHeight: 20,
  },
});
