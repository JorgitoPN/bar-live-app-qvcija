
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';
import {
  limpiarSalaVirtual,
  resetearSala24h,
  obtenerEstadisticasSalasVirtuales,
  ejecutarLimpiezaManual,
  type VirtualRoomStats,
  type CleanupStats,
} from '@/utils/virtualRoomCleanupService';
import { supabase } from '@/utils/supabase';

interface Local {
  id: string;
  nombre: string;
  horarios_completos?: Record<string, string[]>;
  usuarios_activos: number;
  mensajes_totales: number;
  ultimo_reset?: string;
}

export default function GestionarSalasVirtualesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [stats, setStats] = useState<VirtualRoomStats | null>(null);
  const [locales, setLocales] = useState<Local[]>([]);
  const [lastCleanup, setLastCleanup] = useState<CleanupStats | null>(null);

  const cargarDatos = useCallback(async () => {
    try {
      console.log('[GestionarSalas] 📊 Loading data...');
      
      // Cargar estadísticas globales
      const statsData = await obtenerEstadisticasSalasVirtuales();
      if (statsData) {
        setStats(statsData);
      }

      // Cargar locales con actividad
      const { data: localesData, error: localesError } = await supabase
        .from('locales')
        .select(`
          id,
          nombre,
          horarios_completos
        `)
        .eq('activo', true)
        .order('nombre');

      if (localesError) {
        console.error('[GestionarSalas] ❌ Error loading locales:', localesError);
        throw localesError;
      }

      // Para cada local, obtener usuarios activos y mensajes
      const localesConStats = await Promise.all(
        (localesData || []).map(async (local) => {
          // Usuarios activos
          const { count: usuariosCount } = await supabase
            .from('sala_virtual_checkins')
            .select('*', { count: 'exact', head: true })
            .eq('local_id', local.id)
            .eq('activo', true);

          // Mensajes totales
          const { count: mensajesCount } = await supabase
            .from('sala_virtual_interacciones')
            .select('*', { count: 'exact', head: true })
            .eq('local_id', local.id);

          // Último reset (para locales 24/7)
          const { data: resetData } = await supabase
            .from('sala_virtual_resets')
            .select('last_reset_at')
            .eq('local_id', local.id)
            .single();

          return {
            ...local,
            usuarios_activos: usuariosCount || 0,
            mensajes_totales: mensajesCount || 0,
            ultimo_reset: resetData?.last_reset_at,
          };
        })
      );

      // Filtrar solo locales con actividad
      const localesActivos = localesConStats.filter(
        (l) => l.usuarios_activos > 0 || l.mensajes_totales > 0
      );

      setLocales(localesActivos);
      console.log('[GestionarSalas] ✅ Data loaded successfully');
    } catch (error) {
      console.error('[GestionarSalas] ❌ Error loading data:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    cargarDatos();
  }, [cargarDatos]);

  const handleLimpiarSala = useCallback(async (local: Local) => {
    Alert.alert(
      'Limpiar Sala Virtual',
      `¿Estás seguro de que quieres limpiar la sala de "${local.nombre}"?\n\nEsto eliminará:\n• ${local.mensajes_totales} mensajes\n• Hará checkout de ${local.usuarios_activos} usuarios`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            try {
              setExecuting(true);
              const result = await limpiarSalaVirtual(local.id);
              
              if (result.success) {
                Alert.alert(
                  'Sala Limpiada',
                  `✅ Sala de "${local.nombre}" limpiada correctamente\n\n` +
                  `• Mensajes eliminados: ${result.mensajes_eliminados}\n` +
                  `• Checkouts realizados: ${result.checkouts_realizados}`
                );
                cargarDatos();
              } else {
                Alert.alert('Error', result.error || 'No se pudo limpiar la sala');
              }
            } catch (error) {
              console.error('[GestionarSalas] ❌ Error cleaning room:', error);
              Alert.alert('Error', 'No se pudo limpiar la sala');
            } finally {
              setExecuting(false);
            }
          },
        },
      ]
    );
  }, [cargarDatos]);

  const handleResetearSala24h = useCallback(async (local: Local) => {
    Alert.alert(
      'Resetear Sala 24/7',
      `¿Resetear la sala de "${local.nombre}"?\n\nEsto simulará una nueva jornada:\n• Eliminará ${local.mensajes_totales} mensajes\n• Hará checkout de ${local.usuarios_activos} usuarios`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetear',
          style: 'destructive',
          onPress: async () => {
            try {
              setExecuting(true);
              const result = await resetearSala24h(local.id);
              
              if (result.success) {
                Alert.alert(
                  'Sala Reseteada',
                  `✅ Sala 24/7 de "${local.nombre}" reseteada\n\n` +
                  `• Mensajes eliminados: ${result.mensajes_eliminados}\n` +
                  `• Checkouts realizados: ${result.checkouts_realizados}`
                );
                cargarDatos();
              } else {
                Alert.alert('Error', result.error || 'No se pudo resetear la sala');
              }
            } catch (error) {
              console.error('[GestionarSalas] ❌ Error resetting room:', error);
              Alert.alert('Error', 'No se pudo resetear la sala');
            } finally {
              setExecuting(false);
            }
          },
        },
      ]
    );
  }, [cargarDatos]);

  const handleLimpiezaAutomatica = useCallback(async () => {
    Alert.alert(
      'Limpieza Automática',
      '¿Ejecutar limpieza automática de todas las salas virtuales?\n\n' +
      'Esto limpiará:\n' +
      '• Salas de locales cerrados\n' +
      '• Salas 24/7 que necesiten reset\n' +
      '• Usuarios inactivos',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ejecutar',
          onPress: async () => {
            try {
              setExecuting(true);
              const result = await ejecutarLimpiezaManual();
              
              if (result.success) {
                setLastCleanup(result);
                Alert.alert(
                  'Limpieza Completada',
                  `✅ Limpieza automática ejecutada\n\n` +
                  `• Locales cerrados: ${result.stats.localesCerrados}\n` +
                  `• Locales 24/7: ${result.stats.locales24h}\n` +
                  `• Mensajes eliminados: ${result.stats.mensajesEliminados}\n` +
                  `• Checkouts: ${result.stats.checkoutsRealizados}\n\n` +
                  `Salas limpiadas:\n${result.stats.salasLimpiadas.join('\n')}`
                );
                cargarDatos();
              } else {
                Alert.alert('Error', result.error || 'No se pudo ejecutar la limpieza');
              }
            } catch (error) {
              console.error('[GestionarSalas] ❌ Error executing cleanup:', error);
              Alert.alert('Error', 'No se pudo ejecutar la limpieza');
            } finally {
              setExecuting(false);
            }
          },
        },
      ]
    );
  }, [cargarDatos]);

  const checkIf24Hours = (local: Local): boolean => {
    if (!local.horarios_completos) return false;

    const days = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
    
    for (const day of days) {
      const horarios = local.horarios_completos[day];
      if (!horarios || horarios.length === 0) return false;
      
      const has24h = horarios.some((h: string) => 
        h.includes('00:00–23:59') || 
        h.includes('00:00–00:00') ||
        h.includes('Abierto 24 horas')
      );
      
      if (!has24h) return false;
    }

    return true;
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { fontSize: scaleFontSize(16), color: colors.text }]}>
            Cargando datos...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary + '15', colors.background]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
            color={colors.text}
          />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { fontSize: scaleFontSize(24), color: colors.text }]}>
            Gestionar Salas Virtuales
          </Text>
          <Text style={[styles.headerSubtitle, { fontSize: scaleFontSize(14), color: colors.textSecondary }]}>
            Sistema de limpieza y caducidad
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Estadísticas Globales */}
        {stats && (
          <View style={[styles.statsCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(18), color: colors.text }]}>
              📊 Estadísticas Globales
            </Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { fontSize: scaleFontSize(28), color: colors.primary }]}>
                  {stats.total_locales}
                </Text>
                <Text style={[styles.statLabel, { fontSize: scaleFontSize(12), color: colors.textSecondary }]}>
                  Locales Activos
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { fontSize: scaleFontSize(28), color: colors.success }]}>
                  {stats.locales_con_usuarios}
                </Text>
                <Text style={[styles.statLabel, { fontSize: scaleFontSize(12), color: colors.textSecondary }]}>
                  Con Usuarios
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { fontSize: scaleFontSize(28), color: colors.warning }]}>
                  {stats.total_usuarios_activos}
                </Text>
                <Text style={[styles.statLabel, { fontSize: scaleFontSize(12), color: colors.textSecondary }]}>
                  Usuarios Activos
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { fontSize: scaleFontSize(28), color: colors.info }]}>
                  {stats.total_mensajes}
                </Text>
                <Text style={[styles.statLabel, { fontSize: scaleFontSize(12), color: colors.textSecondary }]}>
                  Mensajes Totales
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Botón de Limpieza Automática */}
        <TouchableOpacity
          style={[styles.cleanupButton, { backgroundColor: colors.primary }]}
          onPress={handleLimpiezaAutomatica}
          disabled={executing}
        >
          {executing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <IconSymbol
                ios_icon_name="sparkles"
                android_material_icon_name="auto_fix_high"
                size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                color="#FFFFFF"
              />
              <Text style={[styles.cleanupButtonText, { fontSize: scaleFontSize(16) }]}>
                Ejecutar Limpieza Automática
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Último Resultado de Limpieza */}
        {lastCleanup && lastCleanup.success && (
          <View style={[styles.lastCleanupCard, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
            <View style={styles.lastCleanupHeader}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
                color={colors.success}
              />
              <Text style={[styles.lastCleanupTitle, { fontSize: scaleFontSize(16), color: colors.text }]}>
                Última Limpieza Exitosa
              </Text>
            </View>
            <Text style={[styles.lastCleanupTime, { fontSize: scaleFontSize(12), color: colors.textSecondary }]}>
              {new Date(lastCleanup.timestamp).toLocaleString('es-ES')}
            </Text>
            <View style={styles.lastCleanupStats}>
              <Text style={[styles.lastCleanupStat, { fontSize: scaleFontSize(14), color: colors.text }]}>
                • Locales cerrados: {lastCleanup.stats.localesCerrados}
              </Text>
              <Text style={[styles.lastCleanupStat, { fontSize: scaleFontSize(14), color: colors.text }]}>
                • Locales 24/7: {lastCleanup.stats.locales24h}
              </Text>
              <Text style={[styles.lastCleanupStat, { fontSize: scaleFontSize(14), color: colors.text }]}>
                • Mensajes eliminados: {lastCleanup.stats.mensajesEliminados}
              </Text>
              <Text style={[styles.lastCleanupStat, { fontSize: scaleFontSize(14), color: colors.text }]}>
                • Checkouts: {lastCleanup.stats.checkoutsRealizados}
              </Text>
            </View>
          </View>
        )}

        {/* Lista de Locales con Actividad */}
        <View style={styles.localesSection}>
          <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(18), color: colors.text }]}>
            🏠 Locales con Actividad ({locales.length})
          </Text>
          
          {locales.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.cardBackground }]}>
              <IconSymbol
                ios_icon_name="checkmark.circle"
                android_material_icon_name="check_circle"
                size={Platform.OS === 'android' ? scaleIconSize(48) : 48}
                color={colors.success}
              />
              <Text style={[styles.emptyText, { fontSize: scaleFontSize(16), color: colors.text }]}>
                No hay salas con actividad
              </Text>
              <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14), color: colors.textSecondary }]}>
                Todas las salas están limpias
              </Text>
            </View>
          ) : (
            locales.map((local) => {
              const is24h = checkIf24Hours(local);
              const horasSinceReset = local.ultimo_reset
                ? (new Date().getTime() - new Date(local.ultimo_reset).getTime()) / (1000 * 60 * 60)
                : null;

              return (
                <View
                  key={local.id}
                  style={[styles.localCard, { backgroundColor: colors.cardBackground }]}
                >
                  <View style={styles.localHeader}>
                    <Text style={[styles.localName, { fontSize: scaleFontSize(16), color: colors.text }]}>
                      {local.nombre}
                    </Text>
                    {is24h && (
                      <View style={[styles.badge24h, { backgroundColor: colors.info + '20' }]}>
                        <Text style={[styles.badge24hText, { fontSize: scaleFontSize(10), color: colors.info }]}>
                          24/7
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.localStats}>
                    <View style={styles.localStat}>
                      <IconSymbol
                        ios_icon_name="person.fill"
                        android_material_icon_name="person"
                        size={Platform.OS === 'android' ? scaleIconSize(16) : 16}
                        color={colors.textSecondary}
                      />
                      <Text style={[styles.localStatText, { fontSize: scaleFontSize(14), color: colors.textSecondary }]}>
                        {local.usuarios_activos} usuarios
                      </Text>
                    </View>
                    
                    <View style={styles.localStat}>
                      <IconSymbol
                        ios_icon_name="bubble.left.fill"
                        android_material_icon_name="chat"
                        size={Platform.OS === 'android' ? scaleIconSize(16) : 16}
                        color={colors.textSecondary}
                      />
                      <Text style={[styles.localStatText, { fontSize: scaleFontSize(14), color: colors.textSecondary }]}>
                        {local.mensajes_totales} mensajes
                      </Text>
                    </View>
                  </View>

                  {is24h && horasSinceReset !== null && (
                    <Text style={[styles.resetInfo, { fontSize: scaleFontSize(12), color: colors.textSecondary }]}>
                      Último reset: hace {horasSinceReset.toFixed(1)}h
                    </Text>
                  )}

                  <View style={styles.localActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.danger + '20' }]}
                      onPress={() => handleLimpiarSala(local)}
                      disabled={executing}
                    >
                      <IconSymbol
                        ios_icon_name="trash.fill"
                        android_material_icon_name="delete"
                        size={Platform.OS === 'android' ? scaleIconSize(18) : 18}
                        color={colors.danger}
                      />
                      <Text style={[styles.actionButtonText, { fontSize: scaleFontSize(14), color: colors.danger }]}>
                        Limpiar
                      </Text>
                    </TouchableOpacity>

                    {is24h && (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.info + '20' }]}
                        onPress={() => handleResetearSala24h(local)}
                        disabled={executing}
                      >
                        <IconSymbol
                          ios_icon_name="arrow.clockwise"
                          android_material_icon_name="refresh"
                          size={Platform.OS === 'android' ? scaleIconSize(18) : 18}
                          color={colors.info}
                        />
                        <Text style={[styles.actionButtonText, { fontSize: scaleFontSize(14), color: colors.info }]}>
                          Reset 24h
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Información del Sistema */}
        <View style={[styles.infoCard, { backgroundColor: colors.info + '10', borderColor: colors.info }]}>
          <View style={styles.infoHeader}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={Platform.OS === 'android' ? scaleIconSize(24) : 24}
              color={colors.info}
            />
            <Text style={[styles.infoTitle, { fontSize: scaleFontSize(16), color: colors.text }]}>
              Sistema de Limpieza Automática
            </Text>
          </View>
          <Text style={[styles.infoText, { fontSize: scaleFontSize(14), color: colors.textSecondary }]}>
            • Apertura del local = Sala limpia{'\n'}
            • Mensajes públicos = Solo durante sesión activa{'\n'}
            • Mensajes privados = Eliminados al cerrar{'\n'}
            • Locales 24/7 = Reset cada 24 horas{'\n'}
            • Cron job = Ejecuta cada hora automáticamente
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: '700',
  },
  headerSubtitle: {
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  statsCard: {
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontWeight: '800',
  },
  statLabel: {
    textAlign: 'center',
  },
  cleanupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  cleanupButtonText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lastCleanupCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  lastCleanupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lastCleanupTitle: {
    fontWeight: '700',
  },
  lastCleanupTime: {
    fontStyle: 'italic',
  },
  lastCleanupStats: {
    gap: 4,
    marginTop: 8,
  },
  lastCleanupStat: {
    lineHeight: 20,
  },
  localesSection: {
    gap: 12,
  },
  emptyCard: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    textAlign: 'center',
  },
  localCard: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  localHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  localName: {
    flex: 1,
    fontWeight: '700',
  },
  badge24h: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badge24hText: {
    fontWeight: '700',
  },
  localStats: {
    flexDirection: 'row',
    gap: 16,
  },
  localStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  localStatText: {},
  resetInfo: {
    fontStyle: 'italic',
  },
  localActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontWeight: '600',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoTitle: {
    fontWeight: '700',
  },
  infoText: {
    lineHeight: 22,
  },
});
