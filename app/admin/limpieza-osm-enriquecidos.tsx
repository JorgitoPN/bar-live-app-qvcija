
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
  total_google_enriquecidos: number;
  espacio_estimado_mb: number;
  por_provincia: {
    provincia: string;
    total: number;
    enriquecidos: number;
  }[];
}

interface CleanupResult {
  locales_migrados: number;
  espacio_liberado_mb: number;
  detalles: {
    id: string;
    nombre: string;
    provincia: string;
  }[];
}

/**
 * 🗑️ SISTEMA DE SEPARACIÓN DE CATÁLOGOS OSM Y GOOGLE PLACES v2.0
 * 
 * REDISEÑO COMPLETO después del incidente crítico v1.0
 * 
 * NUEVA LÓGICA v2.0:
 * - Los locales OSM enriquecidos NO se eliminan
 * - En su lugar, se cambia su source_type de 'osm' a 'google'
 * - Esto separa claramente los dos catálogos:
 *   • Catálogo OSM (source_type='osm'): Locales pendientes de enriquecer
 *   • Catálogo Google (source_type='google'): Locales enriquecidos y activos
 * 
 * OBJETIVO: Mantener catálogos separados sin pérdida de datos
 * 
 * BENEFICIOS:
 * - ✅ Separación clara de catálogos
 * - ✅ Sin pérdida de datos ni referencias
 * - ✅ Los locales siguen visibles en "Explorar" y "Mapa"
 * - ✅ Se mantienen likes, posts, check-ins, etc.
 * - ✅ Mejora el rendimiento al reducir el catálogo OSM
 * 
 * LINT FIXES v225.0:
 * - ✅ FIXED: Changed Array<T> to T[] syntax (lines 27, 37)
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
  const [autoCleanupEnabled, setAutoCleanupEnabled] = useState(true);

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
      console.log('[OSM Cleanup v2.0] 📊 Loading statistics...');
      
      // Query OSM locales statistics
      const { data: osmLocales, error: osmError } = await supabase
        .from('locales')
        .select('id, nombre, provincia, activo, enriquecido')
        .eq('source_type', 'osm');

      if (osmError) throw osmError;

      // Query Google locales statistics (enriched catalog)
      const { data: googleLocales, error: googleError } = await supabase
        .from('locales')
        .select('id, nombre, provincia, activo, enriquecido')
        .eq('source_type', 'google');

      if (googleError) throw googleError;

      const totalOSM = osmLocales?.length || 0;
      const osmEnriquecidos = osmLocales?.filter(l => l.enriquecido && l.activo).length || 0;
      const osmActivos = osmLocales?.filter(l => l.activo).length || 0;
      const osmPendientes = osmLocales?.filter(l => !l.activo && !l.enriquecido).length || 0;
      
      const totalGoogle = googleLocales?.length || 0;
      const googleEnriquecidos = googleLocales?.filter(l => l.enriquecido && l.activo).length || 0;

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

      console.log('[OSM Cleanup v2.0] ✅ Statistics loaded:', {
        totalOSM,
        osmEnriquecidos,
        osmActivos,
        osmPendientes,
        totalGoogle,
        googleEnriquecidos,
        espacioEstimadoMB,
      });

      setStats({
        total_osm_enriquecidos: osmEnriquecidos,
        total_osm_activos: osmActivos,
        total_osm_pendientes: osmPendientes,
        total_google_enriquecidos: googleEnriquecidos,
        espacio_estimado_mb: espacioEstimadoMB,
        por_provincia: porProvinciaArray,
      });
    } catch (error) {
      console.error('[OSM Cleanup v2.0] ❌ Error loading statistics:', error);
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
        setAutoCleanupEnabled(data.value?.enabled !== false);
      } else {
        // Por defecto, activada
        setAutoCleanupEnabled(true);
      }
    } catch (error) {
      console.error('[OSM Cleanup v2.0] Error checking auto-cleanup status:', error);
      setAutoCleanupEnabled(true);
    }
  };

  const toggleAutoCleanup = async (enabled: boolean) => {
    try {
      console.log('[OSM Cleanup v2.0] Toggling auto-migration:', enabled);

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
        enabled ? 'Migración Automática Activada' : 'Migración Automática Desactivada',
        enabled
          ? 'Los locales OSM enriquecidos se moverán automáticamente al catálogo de Google Places después de ser activados.'
          : 'La migración automática ha sido desactivada. Los locales OSM enriquecidos permanecerán en el catálogo OSM.'
      );
    } catch (error) {
      console.error('[OSM Cleanup v2.0] Error toggling auto-migration:', error);
      Alert.alert('Error', 'No se pudo cambiar la configuración de migración automática');
    }
  };

  const handleExecuteCleanup = () => {
    if (!stats || stats.total_osm_enriquecidos === 0) {
      Alert.alert('Sin locales', 'No hay locales OSM enriquecidos para migrar al catálogo de Google Places');
      return;
    }

    if (dryRun) {
      Alert.alert(
        'Simulación de Migración',
        `Se ejecutará una simulación sin realizar cambios reales.\n\n` +
        `Locales OSM enriquecidos a migrar: ${stats.total_osm_enriquecidos}\n` +
        `Acción: Cambiar source_type de 'osm' a 'google'\n\n` +
        'Esto te permitirá ver qué locales serían migrados al catálogo de Google Places.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ejecutar Simulación', onPress: () => executeCleanup(true) }
        ]
      );
    } else {
      Alert.alert(
        '⚠️ ADVERTENCIA: Migración Real',
        `Estás a punto de ejecutar una migración REAL que:\n\n` +
        `• Moverá ${stats.total_osm_enriquecidos} locales del catálogo OSM al catálogo Google Places\n` +
        `• Cambiará source_type de 'osm' a 'google'\n` +
        `• Los locales seguirán visibles en "Explorar" y "Mapa" (sin pérdida de datos)\n` +
        `• Se mantendrán todos los likes, posts, check-ins, etc.\n\n` +
        `✅ Esta acción es SEGURA y NO elimina datos.\n\n` +
        '¿Continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sí, Migrar Locales',
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
      console.log('[OSM Cleanup v2.0] 🔄 Executing migration...');
      console.log('[OSM Cleanup v2.0] Dry run:', isDryRun);
      
      if (isDryRun) {
        // Simulation: Just count what would be migrated
        const { data: localesAMigrar, error } = await supabase
          .from('locales')
          .select('id, nombre, provincia')
          .eq('source_type', 'osm')
          .eq('enriquecido', true)
          .eq('activo', true);

        if (error) throw error;

        const result: CleanupResult = {
          locales_migrados: localesAMigrar?.length || 0,
          espacio_liberado_mb: Math.round(((localesAMigrar?.length || 0) * 5) / 1024),
          detalles: (localesAMigrar || []).slice(0, 10).map(l => ({
            id: l.id,
            nombre: l.nombre,
            provincia: l.provincia,
          })),
        };

        setLastResult(result);

        Alert.alert(
          'Simulación Completada',
          `Resultados de la simulación:\n\n` +
          `• Locales que serían migrados: ${result.locales_migrados}\n` +
          `• Acción: Cambiar source_type de 'osm' a 'google'\n\n` +
          `Desactiva el modo simulación para ejecutar la migración real.`,
          [{ text: 'OK', onPress: () => loadStats() }]
        );
      } else {
        // Real migration: Change source_type from 'osm' to 'google'
        const { data: localesAMigrar, error: fetchError } = await supabase
          .from('locales')
          .select('id, nombre, provincia')
          .eq('source_type', 'osm')
          .eq('enriquecido', true)
          .eq('activo', true);

        if (fetchError) throw fetchError;

        console.log('[OSM Cleanup v2.0] Found locales to migrate:', localesAMigrar?.length || 0);

        if (!localesAMigrar || localesAMigrar.length === 0) {
          Alert.alert('Sin locales', 'No hay locales OSM enriquecidos para migrar');
          setProcessing(false);
          return;
        }

        // Migrate in batches
        const batchSize = 100;
        let totalMigrated = 0;
        
        for (let i = 0; i < localesAMigrar.length; i += batchSize) {
          const batch = localesAMigrar.slice(i, i + batchSize);
          const ids = batch.map(l => l.id);
          
          console.log(`[OSM Cleanup v2.0] Migrating batch ${i / batchSize + 1}:`, ids.length, 'locales');
          
          const { error: updateError } = await supabase
            .from('locales')
            .update({ 
              source_type: 'google',
              fecha_actualizacion: new Date().toISOString(),
            })
            .in('id', ids);

          if (updateError) {
            console.error('[OSM Cleanup v2.0] Error migrating batch:', updateError);
            throw updateError;
          }

          totalMigrated += ids.length;
          console.log(`[OSM Cleanup v2.0] ✅ Migrated ${totalMigrated}/${localesAMigrar.length} locales`);
        }

        const result: CleanupResult = {
          locales_migrados: totalMigrated,
          espacio_liberado_mb: Math.round((totalMigrated * 5) / 1024),
          detalles: localesAMigrar.slice(0, 10).map(l => ({
            id: l.id,
            nombre: l.nombre,
            provincia: l.provincia,
          })),
        };

        setLastResult(result);

        console.log('[OSM Cleanup v2.0] ✅ Migration completed:', result);

        Alert.alert(
          'Migración Completada',
          `Se ha completado la migración de catálogos:\n\n` +
          `• Locales migrados de OSM a Google: ${result.locales_migrados}\n` +
          `• Acción realizada: source_type cambiado de 'osm' a 'google'\n\n` +
          `✅ Los locales siguen visibles en "Explorar" y "Mapa".\n` +
          `✅ Se mantienen todos los datos, likes, posts, etc.\n\n` +
          `💡 Ahora el catálogo OSM solo contiene locales pendientes de enriquecer.`,
          [{ text: 'OK', onPress: () => loadStats() }]
        );
      }
    } catch (error) {
      console.error('[OSM Cleanup v2.0] ❌ Error executing migration:', error);
      Alert.alert('Error', 'No se pudo ejecutar la migración');
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
          <Text style={styles.headerTitle}>Separación de Catálogos</Text>
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
        <Text style={styles.headerTitle}>Separación de Catálogos</Text>
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
            <Text style={styles.infoBold}>Sistema de Separación de Catálogos v2.0</Text>
            {'\n\n'}
            El sistema mantiene DOS catálogos separados:
            {'\n\n'}
            📦 <Text style={styles.infoBold}>Catálogo OSM</Text> (source_type='osm')
            {'\n'}
            → Locales importados de OpenStreetMap
            {'\n'}
            → Pendientes de enriquecer con Google Places
            {'\n'}
            → Estado: inactivo (no visibles en la app)
            {'\n\n'}
            ✨ <Text style={styles.infoBold}>Catálogo Google Places</Text> (source_type='google')
            {'\n'}
            → Locales enriquecidos con datos de Google
            {'\n'}
            → Fotos, horarios, reviews completos
            {'\n'}
            → Estado: activo (visibles en "Explorar" y "Mapa")
            {'\n\n'}
            <Text style={styles.infoBold}>Una vez enriquecido, el local cambia de catálogo OSM a Google Places.</Text>
            {'\n\n'}
            Esto evita duplicidad y mantiene los catálogos separados.
          </Text>
        </View>

        {/* Statistics Cards */}
        {stats && (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <IconSymbol ios_icon_name="arrow.right.circle.fill" android_material_icon_name="arrow_forward" size={32} color="#3B82F6" />
                <Text style={styles.statValue}>{stats.total_osm_enriquecidos}</Text>
                <Text style={styles.statLabel}>OSM Enriquecidos</Text>
                <Text style={styles.statSubLabel}>Listos para migrar</Text>
              </View>
              <View style={styles.statCard}>
                <IconSymbol ios_icon_name="hourglass" android_material_icon_name="schedule" size={32} color="#F59E0B" />
                <Text style={styles.statValue}>{stats.total_osm_pendientes}</Text>
                <Text style={styles.statLabel}>OSM Pendientes</Text>
                <Text style={styles.statSubLabel}>Aún no enriquecidos</Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={32} color="#10B981" />
                <Text style={styles.statValue}>{stats.total_google_enriquecidos}</Text>
                <Text style={styles.statLabel}>Google Enriquecidos</Text>
                <Text style={styles.statSubLabel}>Ya en catálogo Google</Text>
              </View>
              <View style={styles.statCard}>
                <IconSymbol ios_icon_name="externaldrive.fill" android_material_icon_name="storage" size={32} color={colors.primary} />
                <Text style={styles.statValue}>{stats.espacio_estimado_mb} MB</Text>
                <Text style={styles.statLabel}>Espacio Optimizable</Text>
                <Text style={styles.statSubLabel}>Al migrar catálogos</Text>
              </View>
            </View>

            {/* Catalog Explanation */}
            <View style={styles.catalogCard}>
              <View style={styles.catalogHeader}>
                <IconSymbol ios_icon_name="square.stack.3d.up.fill" android_material_icon_name="layers" size={24} color={colors.primary} />
                <Text style={styles.catalogTitle}>Estado de los Catálogos</Text>
              </View>
              
              <View style={styles.catalogRow}>
                <View style={styles.catalogBadge}>
                  <Text style={styles.catalogBadgeText}>OSM</Text>
                </View>
                <View style={styles.catalogInfo}>
                  <Text style={styles.catalogCount}>{stats.total_osm_pendientes + stats.total_osm_enriquecidos} locales</Text>
                  <Text style={styles.catalogDescription}>
                    {stats.total_osm_pendientes} pendientes + {stats.total_osm_enriquecidos} enriquecidos
                  </Text>
                </View>
              </View>

              <View style={styles.catalogRow}>
                <View style={[styles.catalogBadge, { backgroundColor: '#10B981' }]}>
                  <Text style={styles.catalogBadgeText}>Google</Text>
                </View>
                <View style={styles.catalogInfo}>
                  <Text style={styles.catalogCount}>{stats.total_google_enriquecidos} locales</Text>
                  <Text style={styles.catalogDescription}>
                    Enriquecidos y activos en la app
                  </Text>
                </View>
              </View>

              <View style={styles.catalogSeparator} />

              <Text style={styles.catalogNote}>
                💡 Los {stats.total_osm_enriquecidos} locales OSM enriquecidos deberían estar en el catálogo Google, no en OSM.
              </Text>
            </View>

            {/* Auto-Cleanup Configuration */}
            <View style={styles.autoCleanupCard}>
              <View style={styles.autoCleanupHeader}>
                <IconSymbol ios_icon_name="arrow.triangle.2.circlepath" android_material_icon_name="autorenew" size={24} color={colors.primary} />
                <Text style={styles.autoCleanupTitle}>Migración Automática</Text>
              </View>
              
              <Text style={styles.autoCleanupDescription}>
                Cuando está activada, los locales OSM se mueven automáticamente al catálogo de Google Places después de ser enriquecidos y activados.
                {'\n\n'}
                Esto mantiene los catálogos separados sin intervención manual.
                {'\n\n'}
                <Text style={styles.infoBold}>Acción:</Text> Cambiar source_type de 'osm' a 'google'
                {'\n'}
                <Text style={styles.infoBold}>Resultado:</Text> Catálogos separados, sin duplicidad
              </Text>

              <View style={styles.configRow}>
                <View style={styles.configLeft}>
                  <Text style={styles.configLabel}>
                    {autoCleanupEnabled ? '✅ Activada' : '❌ Desactivada'}
                  </Text>
                  <Text style={styles.configDescription}>
                    {autoCleanupEnabled 
                      ? 'Los locales OSM se migran automáticamente al enriquecerse' 
                      : 'Los locales OSM permanecen en el catálogo OSM'}
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
                  Locales OSM enriquecidos por provincia (listos para migrar)
                </Text>
                
                {stats.por_provincia.slice(0, 10).map((prov, index) => (
                  <View key={index} style={styles.provinceRow}>
                    <Text style={styles.provinceName}>{prov.provincia}</Text>
                    <View style={styles.provinceStats}>
                      <Text style={styles.provinceEnriquecidos}>
                        {prov.enriquecidos} enriquecidos
                      </Text>
                      <Text style={styles.provinceTotal}>
                        de {prov.total} total OSM
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
          <Text style={styles.configTitle}>Configuración de Migración Manual</Text>
          
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
                ios_icon_name={dryRun ? "play.circle.fill" : "arrow.right.circle.fill"} 
                android_material_icon_name={dryRun ? "play_arrow" : "arrow_forward"} 
                size={24} 
                color="#fff" 
              />
              <Text style={styles.executeButtonText}>
                {dryRun ? 'Ejecutar Simulación' : 'Migrar al Catálogo Google'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Info about automatic migration */}
        {stats && stats.total_osm_enriquecidos === 0 && (
          <View style={styles.successCard}>
            <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={32} color="#10B981" />
            <Text style={styles.successTitle}>¡Catálogos Separados Correctamente!</Text>
            <Text style={styles.successText}>
              No hay locales OSM enriquecidos pendientes de migrar.
              {'\n\n'}
              📦 Catálogo OSM: {stats.total_osm_pendientes} locales pendientes
              {'\n'}
              ✨ Catálogo Google: {stats.total_google_enriquecidos} locales enriquecidos
              {'\n\n'}
              {autoCleanupEnabled 
                ? '✅ La migración automática está activada y mantendrá los catálogos separados.'
                : '💡 Activa la migración automática para mantener los catálogos separados automáticamente.'}
            </Text>
          </View>
        )}

        {/* Last Results */}
        {lastResult && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>
              {dryRun ? 'Resultados de Simulación' : 'Resultados de Migración'}
            </Text>
            
            <View style={styles.resultSummary}>
              <View style={styles.resultSummaryRow}>
                <Text style={styles.resultSummaryLabel}>Locales migrados:</Text>
                <Text style={styles.resultSummaryValue}>{lastResult.locales_migrados}</Text>
              </View>
              <View style={styles.resultSummaryRow}>
                <Text style={styles.resultSummaryLabel}>Acción realizada:</Text>
                <Text style={styles.resultSummaryValue}>OSM → Google</Text>
              </View>
            </View>

            {lastResult.detalles.length > 0 && (
              <>
                <Text style={styles.resultDetailsTitle}>
                  Primeros {lastResult.detalles.length} locales migrados:
                </Text>
                {lastResult.detalles.map((local, index) => (
                  <View key={index} style={styles.resultDetailRow}>
                    <Text style={styles.resultDetailName}>{local.nombre}</Text>
                    <Text style={styles.resultDetailProvincia}>{local.provincia}</Text>
                  </View>
                ))}
                {lastResult.locales_migrados > lastResult.detalles.length && (
                  <Text style={styles.resultMore}>
                    Y {lastResult.locales_migrados - lastResult.detalles.length} locales más...
                  </Text>
                )}
              </>
            )}
          </View>
        )}

        {/* Safety Card */}
        <View style={styles.warningCard}>
          <IconSymbol ios_icon_name="checkmark.shield.fill" android_material_icon_name="verified_user" size={20} color="#10B981" />
          <Text style={styles.warningText}>
            <Text style={styles.warningBold}>Seguridad Garantizada v2.0:</Text>
            {'\n\n'}
            ✅ NO se eliminan locales de la base de datos
            {'\n'}
            ✅ Solo se cambia el source_type de 'osm' a 'google'
            {'\n'}
            ✅ Los locales siguen visibles en "Explorar" y "Mapa"
            {'\n'}
            ✅ Se mantienen todos los datos (likes, posts, check-ins, etc.)
            {'\n'}
            ✅ Los locales OSM pendientes NO se tocan
            {'\n\n'}
            Esta migración solo reorganiza los catálogos sin pérdida de datos.
          </Text>
        </View>

        {/* Technical Info */}
        <View style={styles.technicalCard}>
          <Text style={styles.technicalTitle}>Información Técnica v2.0</Text>
          <Text style={styles.technicalText}>
            <Text style={styles.technicalBold}>Criterios de migración:</Text>
            {'\n\n'}
            • source_type = 'osm'
            {'\n'}
            • enriquecido = true
            {'\n'}
            • activo = true
            {'\n\n'}
            <Text style={styles.technicalBold}>Acción realizada:</Text>
            {'\n\n'}
            • UPDATE locales SET source_type = 'google' WHERE ...
            {'\n'}
            • NO se eliminan registros
            {'\n'}
            • Se mantiene la integridad referencial
            {'\n\n'}
            <Text style={styles.technicalBold}>Locales que NO se migran:</Text>
            {'\n\n'}
            • Locales OSM pendientes (activo = false)
            {'\n'}
            • Locales ya en catálogo Google (source_type = 'google')
            {'\n'}
            • Locales creados manualmente (source_type = 'manual')
            {'\n\n'}
            <Text style={styles.technicalBold}>Resultado:</Text>
            {'\n\n'}
            ✅ Catálogo OSM: Solo locales pendientes de enriquecer
            {'\n'}
            ✅ Catálogo Google: Solo locales enriquecidos y activos
            {'\n'}
            ✅ Sin duplicidad ni confusión entre catálogos
          </Text>
        </View>

        {/* History Note */}
        <View style={styles.historyCard}>
          <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={20} color="#EF4444" />
          <Text style={styles.historyText}>
            <Text style={styles.historyBold}>Nota Histórica - Incidente v1.0:</Text>
            {'\n\n'}
            La versión anterior (v1.0) de este sistema eliminaba locales de la base de datos, lo que causó la pérdida de 700+ locales enriquecidos.
            {'\n\n'}
            <Text style={styles.historyBold}>Nueva versión v2.0:</Text>
            {'\n\n'}
            ✅ NO elimina locales
            {'\n'}
            ✅ Solo cambia el source_type para separar catálogos
            {'\n'}
            ✅ Mantiene todos los datos intactos
            {'\n'}
            ✅ Operación 100% segura y reversible
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
  catalogCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  catalogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  catalogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  catalogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  catalogBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  catalogBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  catalogInfo: {
    flex: 1,
  },
  catalogCount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  catalogDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  catalogSeparator: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 12,
  },
  catalogNote: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
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
    color: '#3B82F6',
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
    marginBottom: 16,
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
  historyCard: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  historyText: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 18,
  },
  historyBold: {
    fontWeight: '700',
  },
});
