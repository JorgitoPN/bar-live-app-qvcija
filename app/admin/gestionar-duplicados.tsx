
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface DuplicateGroup {
  nombre: string;
  latitud: number;
  longitud: number;
  duplicate_count: number;
  local_ids: string[];
  oldest_id: string;
  newest_id: string;
}

interface LocalDetail {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  propietario_id: string;
  estado_solicitud: string;
  created_at: string;
}

/**
 * ✅ GESTIONAR DUPLICADOS v1.0
 * 
 * Admin page to find and remove duplicate locals
 * - Shows all duplicate groups (same name + exact location)
 * - Allows viewing details of each duplicate
 * - Safely removes duplicates keeping the oldest one
 * - Prevents costly Google enrichment on duplicate locals
 */

export default function GestionarDuplicadosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [localDetails, setLocalDetails] = useState<Record<string, LocalDetail[]>>({});
  const [processingGroup, setProcessingGroup] = useState<string | null>(null);

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
    loadDuplicates();
  }, [checkAdminAccess]); // loadDuplicates is stable, doesn't need to be in deps

  const loadDuplicates = async () => {
    try {
      console.log('[GestionarDuplicados] 🔍 Loading duplicate locals...');
      
      const { data, error } = await supabase.rpc('find_all_duplicate_locals');

      if (error) throw error;

      console.log('[GestionarDuplicados] ✅ Found', data?.length || 0, 'duplicate groups');
      setDuplicateGroups(data || []);
    } catch (error) {
      console.error('[GestionarDuplicados] ❌ Error loading duplicates:', error);
      Alert.alert('Error', 'No se pudieron cargar los locales duplicados');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadGroupDetails = async (group: DuplicateGroup) => {
    const groupKey = `${group.nombre}-${group.latitud}-${group.longitud}`;
    
    if (localDetails[groupKey]) {
      // Already loaded, just toggle
      setExpandedGroup(expandedGroup === groupKey ? null : groupKey);
      return;
    }

    try {
      console.log('[GestionarDuplicados] 📋 Loading details for group:', groupKey);
      
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, direccion, ciudad, provincia, propietario_id, estado_solicitud, created_at')
        .in('id', group.local_ids)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setLocalDetails(prev => ({
        ...prev,
        [groupKey]: data || []
      }));
      setExpandedGroup(groupKey);
    } catch (error) {
      console.error('[GestionarDuplicados] ❌ Error loading group details:', error);
      Alert.alert('Error', 'No se pudieron cargar los detalles');
    }
  };

  const handleRemoveDuplicates = (group: DuplicateGroup) => {
    const groupKey = `${group.nombre}-${group.latitud}-${group.longitud}`;
    
    Alert.alert(
      'Confirmar Eliminación',
      `¿Estás seguro de que quieres eliminar ${group.duplicate_count - 1} duplicados de "${group.nombre}"?\n\n` +
      `Se mantendrá el local más antiguo y se eliminarán los demás.\n\n` +
      `⚠️ Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar Duplicados',
          style: 'destructive',
          onPress: () => confirmRemoveDuplicates(group, groupKey)
        }
      ]
    );
  };

  const confirmRemoveDuplicates = async (group: DuplicateGroup, groupKey: string) => {
    setProcessingGroup(groupKey);
    
    try {
      console.log('[GestionarDuplicados] 🗑️ Removing duplicates for:', group.nombre);
      
      const { data, error } = await supabase.rpc('remove_duplicate_locals', {
        p_nombre: group.nombre,
        p_latitud: group.latitud,
        p_longitud: group.longitud,
        p_keep_oldest: true
      });

      if (error) throw error;

      const result = data[0];
      console.log('[GestionarDuplicados] ✅ Removed', result.removed_count, 'duplicates');
      
      Alert.alert(
        'Duplicados Eliminados',
        `Se eliminaron ${result.removed_count} locales duplicados.\n\n` +
        `Local mantenido: ${result.kept_id}`,
        [{ text: 'OK', onPress: () => loadDuplicates() }]
      );
    } catch (error) {
      console.error('[GestionarDuplicados] ❌ Error removing duplicates:', error);
      Alert.alert('Error', 'No se pudieron eliminar los duplicados');
    } finally {
      setProcessingGroup(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDuplicates();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprobado': return '#10B981';
      case 'pendiente': return '#F59E0B';
      case 'en_revision': return '#3B82F6';
      case 'denegado': return '#EF4444';
      default: return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aprobado': return 'Aprobado';
      case 'pendiente': return 'Pendiente';
      case 'en_revision': return 'En Revisión';
      case 'denegado': return 'Denegado';
      default: return status;
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
          <Text style={styles.headerTitle}>Gestionar Duplicados</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Buscando duplicados...</Text>
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
        <Text style={styles.headerTitle}>Gestionar Duplicados</Text>
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
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconContainer}>
            <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={32} color="#F59E0B" />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>Locales Duplicados Encontrados</Text>
            <Text style={styles.summaryCount}>{duplicateGroups.length}</Text>
            <Text style={styles.summaryDescription}>
              Grupos de locales con el mismo nombre y ubicación exacta
            </Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Los duplicados se detectan cuando dos o más locales tienen el mismo nombre y están en la misma ubicación (dentro de 11 metros).
            {'\n\n'}
            Al eliminar duplicados, se mantiene el local más antiguo y se eliminan los demás para evitar costes innecesarios de enriquecimiento con Google.
          </Text>
        </View>

        {/* Duplicate Groups */}
        {duplicateGroups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={64} color="#10B981" />
            <Text style={styles.emptyTitle}>¡No hay duplicados!</Text>
            <Text style={styles.emptyDescription}>
              No se encontraron locales duplicados en la base de datos
            </Text>
          </View>
        ) : (
          duplicateGroups.map((group, index) => {
            const groupKey = `${group.nombre}-${group.latitud}-${group.longitud}`;
            const isExpanded = expandedGroup === groupKey;
            const details = localDetails[groupKey];
            const isProcessing = processingGroup === groupKey;

            return (
              <View key={groupKey} style={styles.duplicateCard}>
                <TouchableOpacity
                  style={styles.duplicateHeader}
                  onPress={() => loadGroupDetails(group)}
                  disabled={isProcessing}
                >
                  <View style={styles.duplicateHeaderLeft}>
                    <View style={styles.duplicateNumberBadge}>
                      <Text style={styles.duplicateNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.duplicateHeaderInfo}>
                      <Text style={styles.duplicateName} numberOfLines={1}>
                        {group.nombre}
                      </Text>
                      <Text style={styles.duplicateLocation} numberOfLines={1}>
                        📍 {group.latitud.toFixed(6)}, {group.longitud.toFixed(6)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.duplicateHeaderRight}>
                    <View style={styles.duplicateCountBadge}>
                      <Text style={styles.duplicateCountText}>{group.duplicate_count}</Text>
                    </View>
                    <IconSymbol
                      ios_icon_name={isExpanded ? "chevron.up" : "chevron.down"}
                      android_material_icon_name={isExpanded ? "expand_less" : "expand_more"}
                      size={24}
                      color={colors.text}
                    />
                  </View>
                </TouchableOpacity>

                {isExpanded && details && (
                  <View style={styles.duplicateDetails}>
                    {details.map((local, localIndex) => (
                      <View key={local.id} style={styles.localDetailCard}>
                        <View style={styles.localDetailHeader}>
                          <View style={styles.localDetailBadge}>
                            <Text style={styles.localDetailBadgeText}>
                              {localIndex === 0 ? '🏆 Más Antiguo' : `#${localIndex + 1}`}
                            </Text>
                          </View>
                          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(local.estado_solicitud) + '20' }]}>
                            <Text style={[styles.statusBadgeText, { color: getStatusColor(local.estado_solicitud) }]}>
                              {getStatusLabel(local.estado_solicitud)}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.localDetailName}>{local.nombre}</Text>
                        <Text style={styles.localDetailAddress}>
                          {local.direccion || 'Sin dirección'}
                        </Text>
                        <Text style={styles.localDetailCity}>
                          {local.ciudad}, {local.provincia}
                        </Text>
                        <Text style={styles.localDetailDate}>
                          Creado: {formatDate(local.created_at)}
                        </Text>
                        <Text style={styles.localDetailId}>ID: {local.id}</Text>
                      </View>
                    ))}

                    <TouchableOpacity
                      style={[styles.removeButton, isProcessing && styles.removeButtonDisabled]}
                      onPress={() => handleRemoveDuplicates(group)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={20} color="#fff" />
                          <Text style={styles.removeButtonText}>
                            Eliminar {group.duplicate_count - 1} Duplicados
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
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
  summaryCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  summaryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F59E0B' + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  summaryDescription: {
    fontSize: 12,
    color: colors.textSecondary,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  duplicateCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  duplicateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  duplicateHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  duplicateNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duplicateNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.headerText,
  },
  duplicateHeaderInfo: {
    flex: 1,
  },
  duplicateName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  duplicateLocation: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  duplicateHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  duplicateCountBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  duplicateCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  duplicateDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    padding: 16,
    gap: 12,
  },
  localDetailCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  localDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  localDetailBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  localDetailBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  localDetailName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  localDetailAddress: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 2,
  },
  localDetailCity: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  localDetailDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  localDetailId: {
    fontSize: 10,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  removeButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  removeButtonDisabled: {
    opacity: 0.6,
  },
  removeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
