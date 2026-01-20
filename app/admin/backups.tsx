
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';

interface Backup {
  id: string;
  backup_name: string;
  backup_type: 'manual' | 'automatic';
  backup_status: 'in_progress' | 'completed' | 'failed';
  backup_size_bytes: number;
  backup_url: string;
  tables_backed_up: string[];
  created_at: string;
  completed_at: string;
  metadata: {
    table_counts?: Record<string, number>;
  };
}

export default function BackupsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creando, setCreando] = useState(false);
  const [backups, setBackups] = useState<Backup[]>([]);

  const cargarBackups = useCallback(async () => {
    try {
      console.log('[Backups] ✅ Cargando backups...');
      
      const { data, error } = await supabase
        .from('database_backups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('[Backups] ❌ Error cargando backups:', error);
        throw error;
      }

      console.log('[Backups] ✅ Backups cargados:', data?.length || 0);
      setBackups(data || []);
    } catch (error) {
      console.error('[Backups] Error cargando backups:', error);
      Alert.alert('Error', 'No se pudieron cargar los backups');
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await cargarBackups();
      setLoading(false);
    };
    init();
  }, [cargarBackups]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await cargarBackups();
    setRefreshing(false);
  }, [cargarBackups]);

  const crearBackup = async () => {
    Alert.alert(
      'Crear Backup',
      '¿Deseas crear un backup manual de la base de datos?\n\nEsto puede tardar varios minutos dependiendo del tamaño de los datos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Crear',
          onPress: async () => {
            setCreando(true);
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) {
                throw new Error('No hay sesión activa');
              }

              const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-database-backup`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ backup_type: 'manual' }),
                }
              );

              const result = await response.json();

              if (!response.ok) {
                throw new Error(result.error || 'Error creando backup');
              }

              Alert.alert(
                'Éxito',
                `Backup creado correctamente\n\nTablas respaldadas: ${result.tables_backed_up}\nTamaño: ${(result.size_bytes / 1024 / 1024).toFixed(2)} MB`
              );
              
              await cargarBackups();
            } catch (error: any) {
              console.error('[Backups] Error creando backup:', error);
              Alert.alert('Error', error.message || 'No se pudo crear el backup');
            } finally {
              setCreando(false);
            }
          },
        },
      ]
    );
  };

  const restaurarBackup = async (backup: Backup) => {
    Alert.alert(
      'Restaurar Backup',
      `¿Deseas restaurar el backup del ${new Date(backup.created_at).toLocaleString('es-ES')}?\n\n⚠️ ADVERTENCIA: Esta acción sobrescribirá los datos actuales con los datos del backup.\n\nTablas a restaurar: ${backup.tables_backed_up.length}\nTamaño: ${(backup.backup_size_bytes / 1024 / 1024).toFixed(2)} MB`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) {
                throw new Error('No hay sesión activa');
              }

              Alert.alert('Restaurando...', 'Por favor espera, esto puede tardar varios minutos.');

              const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/restore-database-backup`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ backup_id: backup.id }),
                }
              );

              const result = await response.json();

              if (!response.ok) {
                throw new Error(result.error || 'Error restaurando backup');
              }

              if (result.success) {
                Alert.alert(
                  'Éxito',
                  `Backup restaurado correctamente\n\nTablas restauradas: ${result.tables_restored}/${result.total_tables}`
                );
              } else {
                Alert.alert(
                  'Restauración Parcial',
                  `Se restauraron ${result.tables_restored}/${result.total_tables} tablas.\n\nErrores:\n${result.errors?.join('\n')}`
                );
              }
            } catch (error: any) {
              console.error('[Backups] Error restaurando backup:', error);
              Alert.alert('Error', error.message || 'No se pudo restaurar el backup');
            }
          },
        },
      ]
    );
  };

  const eliminarBackup = async (backupId: string, backupName: string) => {
    Alert.alert(
      'Eliminar Backup',
      `¿Estás seguro de eliminar el backup "${backupName}"?\n\nEsta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('database_backups')
                .delete()
                .eq('id', backupId);

              if (error) throw error;

              Alert.alert('Éxito', 'Backup eliminado correctamente');
              await cargarBackups();
            } catch (error) {
              console.error('[Backups] Error eliminando backup:', error);
              Alert.alert('Error', 'No se pudo eliminar el backup');
            }
          },
        },
      ]
    );
  };

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      completed: { color: '#10B981', text: 'Completado' },
      in_progress: { color: '#F59E0B', text: 'En Progreso' },
      failed: { color: '#EF4444', text: 'Error' },
    };

    const badge = badges[estado] || badges.completed;

    return (
      <View style={[styles.estadoBadge, { backgroundColor: badge.color + '20' }]}>
        <Text style={[styles.estadoText, { color: badge.color }]}>{badge.text}</Text>
      </View>
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.headerGradientStart, colors.headerGradientEnd]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Gestión de Backups</Text>
          </View>
          <View style={{ width: 24 }} />
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando backups...</Text>
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
          <Text style={styles.headerTitle}>Gestión de Backups</Text>
          <Text style={styles.headerSubtitle}>Copias de seguridad automáticas</Text>
        </View>
        <TouchableOpacity onPress={onRefresh}>
          <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={24} color={colors.headerText} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <TouchableOpacity
          style={styles.createButton}
          onPress={crearBackup}
          disabled={creando}
        >
          {creando ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={24} color={colors.white} />
              <Text style={styles.createButtonText}>Crear Backup Manual</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Sistema de Backups Automáticos</Text>
            <Text style={styles.infoText}>
              • Se crean backups automáticos diariamente a las 03:00 AM{'\n'}
              • Se conservan los últimos 3 backups (3 días){'\n'}
              • Los backups antiguos se eliminan automáticamente{'\n'}
              • Puedes crear backups manuales en cualquier momento
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Backups Disponibles ({backups.length})</Text>
        </View>

        {backups.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol ios_icon_name="externaldrive" android_material_icon_name="storage" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No hay backups disponibles</Text>
            <Text style={styles.emptySubtext}>Crea tu primer backup manual</Text>
          </View>
        ) : (
          backups.map((backup) => (
            <View key={backup.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconContainer}>
                  <IconSymbol
                    ios_icon_name={backup.backup_type === 'manual' ? 'hand.raised.fill' : 'clock.fill'}
                    android_material_icon_name={backup.backup_type === 'manual' ? 'touch_app' : 'schedule'}
                    size={28}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>
                    {new Date(backup.created_at).toLocaleString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {formatBytes(backup.backup_size_bytes)} • {backup.backup_type === 'manual' ? 'Manual' : 'Automático'}
                  </Text>
                  {backup.tables_backed_up && (
                    <Text style={styles.cardDetails}>
                      {backup.tables_backed_up.length} tablas respaldadas
                    </Text>
                  )}
                </View>
                {getEstadoBadge(backup.backup_status)}
              </View>

              {backup.backup_status === 'completed' && (
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonPrimary]}
                    onPress={() => restaurarBackup(backup)}
                  >
                    <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="restore" size={16} color={colors.white} />
                    <Text style={styles.actionButtonText}>Restaurar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonDanger]}
                    onPress={() => eliminarBackup(backup.id, backup.backup_name)}
                  >
                    <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={16} color={colors.white} />
                    <Text style={styles.actionButtonText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              )}

              {backup.backup_status === 'failed' && backup.error_message && (
                <View style={styles.errorContainer}>
                  <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="error" size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{backup.error_message}</Text>
                </View>
              )}
            </View>
          ))
        )}

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
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...commonStyles.shadow,
  },
  createButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...commonStyles.shadow,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  cardDetails: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
  },
  actionButtonDanger: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
  },
});
