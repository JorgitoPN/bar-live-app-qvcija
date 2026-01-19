
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

interface InvalidLocal {
  local_id: string;
  nombre: string;
  direccion: string;
  tipo: string;
  motivo_invalido: string;
  google_place_id: string;
  source_type: string;
  source_id: string;
}

/**
 * ✅ REVISAR LOCALES INVÁLIDOS v1.0
 * 
 * Página de administración para revisar locales que no cumplen
 * los criterios de enriquecimiento antes de excluirlos
 */

export default function RevisarLocalesInvalidosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invalidLocals, setInvalidLocals] = useState<InvalidLocal[]>([]);
  const [selectedLocals, setSelectedLocals] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);

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
    loadInvalidLocals();
  }, [checkAdminAccess]);

  const loadInvalidLocals = async () => {
    try {
      console.log('[RevisarInvalidos] 🔍 Loading invalid locals...');
      
      const { data, error } = await supabase.rpc('detectar_locales_invalidos');

      if (error) throw error;

      console.log('[RevisarInvalidos] ✅ Found', data?.length || 0, 'invalid locals');
      setInvalidLocals(data || []);
    } catch (error) {
      console.error('[RevisarInvalidos] ❌ Error loading invalid locals:', error);
      Alert.alert('Error', 'No se pudieron cargar los locales inválidos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleLocalSelection = (localId: string) => {
    const newSelected = new Set(selectedLocals);
    if (newSelected.has(localId)) {
      newSelected.delete(localId);
    } else {
      newSelected.add(localId);
    }
    setSelectedLocals(newSelected);
  };

  const selectAll = () => {
    if (selectedLocals.size === invalidLocals.length) {
      setSelectedLocals(new Set());
    } else {
      setSelectedLocals(new Set(invalidLocals.map(l => l.local_id)));
    }
  };

  const handleExcludeSelected = () => {
    if (selectedLocals.size === 0) {
      Alert.alert('Error', 'Selecciona al menos un local para excluir');
      return;
    }

    Alert.alert(
      'Confirmar Exclusión',
      `¿Estás seguro de que quieres excluir ${selectedLocals.size} locales?\n\n` +
      `Estos locales:\n` +
      `• Se marcarán como inactivos\n` +
      `• Se agregarán a la lista de exclusión\n` +
      `• No aparecerán en futuros enriquecimientos\n` +
      `• No se podrán importar desde OSM\n\n` +
      `⚠️ Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir Locales',
          style: 'destructive',
          onPress: () => excludeSelectedLocals()
        }
      ]
    );
  };

  const excludeSelectedLocals = async () => {
    setProcessing(true);
    
    try {
      console.log('[RevisarInvalidos] 🗑️ Excluding selected locals...');
      
      let excludedCount = 0;
      
      for (const localId of selectedLocals) {
        const local = invalidLocals.find(l => l.local_id === localId);
        if (!local) continue;

        // Agregar a locales_excluidos
        const { error: insertError } = await supabase
          .from('locales_excluidos')
          .insert({
            local_id: localId,
            nombre: local.nombre,
            direccion: local.direccion,
            google_place_id: local.google_place_id,
            osm_id: local.source_type === 'osm' ? local.source_id : null,
            motivo_exclusion: 'invalido',
            descripcion_exclusion: local.motivo_invalido,
            excluido_por: user?.id,
            metadata: {
              tipo_original: local.tipo,
              source_type: local.source_type,
              source_id: local.source_id,
            }
          });

        if (insertError) {
          console.error('[RevisarInvalidos] Error inserting to locales_excluidos:', insertError);
          continue;
        }

        // Marcar como inactivo
        const { error: updateError } = await supabase
          .from('locales')
          .update({ activo: false, updated_at: new Date().toISOString() })
          .eq('id', localId);

        if (updateError) {
          console.error('[RevisarInvalidos] Error updating local:', updateError);
          continue;
        }

        excludedCount++;
      }

      console.log('[RevisarInvalidos] ✅ Excluded', excludedCount, 'locals');
      
      Alert.alert(
        'Locales Excluidos',
        `Se excluyeron ${excludedCount} locales correctamente.\n\n` +
        `Estos locales no aparecerán en futuros procesos de enriquecimiento.`,
        [{ text: 'OK', onPress: () => {
          setSelectedLocals(new Set());
          loadInvalidLocals();
        }}]
      );
    } catch (error) {
      console.error('[RevisarInvalidos] ❌ Error excluding locals:', error);
      Alert.alert('Error', 'No se pudieron excluir los locales');
    } finally {
      setProcessing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInvalidLocals();
  };

  const getMotivoColor = (motivo: string) => {
    if (motivo.includes('Sin ubicación') || motivo.includes('Sin nombre')) return '#EF4444';
    if (motivo.includes('Cerrado permanentemente')) return '#F59E0B';
    if (motivo.includes('Fuera de España')) return '#8B5CF6';
    if (motivo.includes('Tipo de negocio') || motivo.includes('Nombre indica')) return '#EC4899';
    return colors.textSecondary;
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
          <Text style={styles.headerTitle}>Locales Inválidos</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Buscando locales inválidos...</Text>
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
        <Text style={styles.headerTitle}>Locales Inválidos</Text>
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
            <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="error" size={32} color="#EF4444" />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>Locales Inválidos Detectados</Text>
            <Text style={styles.summaryCount}>{invalidLocals.length}</Text>
            <Text style={styles.summaryDescription}>
              Locales que no cumplen los criterios de enriquecimiento
            </Text>
          </View>
        </View>

        {/* Selection Controls */}
        {invalidLocals.length > 0 && (
          <View style={styles.controlsCard}>
            <TouchableOpacity style={styles.selectAllButton} onPress={selectAll}>
              <IconSymbol 
                ios_icon_name={selectedLocals.size === invalidLocals.length ? "checkmark.square.fill" : "square"} 
                android_material_icon_name={selectedLocals.size === invalidLocals.length ? "check_box" : "check_box_outline_blank"} 
                size={24} 
                color={colors.primary} 
              />
              <Text style={styles.selectAllText}>
                {selectedLocals.size === invalidLocals.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
              </Text>
            </TouchableOpacity>

            {selectedLocals.size > 0 && (
              <TouchableOpacity
                style={[styles.excludeButton, processing && styles.excludeButtonDisabled]}
                onPress={handleExcludeSelected}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={20} color="#fff" />
                    <Text style={styles.excludeButtonText}>
                      Excluir {selectedLocals.size} Seleccionados
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Invalid Locals List */}
        {invalidLocals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={64} color="#10B981" />
            <Text style={styles.emptyTitle}>¡No hay locales inválidos!</Text>
            <Text style={styles.emptyDescription}>
              Todos los locales activos cumplen los criterios de enriquecimiento
            </Text>
          </View>
        ) : (
          invalidLocals.map((local, index) => {
            const isSelected = selectedLocals.has(local.local_id);
            const motivoColor = getMotivoColor(local.motivo_invalido);

            return (
              <TouchableOpacity
                key={local.local_id}
                style={[styles.localCard, isSelected && styles.localCardSelected]}
                onPress={() => toggleLocalSelection(local.local_id)}
              >
                <View style={styles.localHeader}>
                  <View style={styles.localNumberBadge}>
                    <Text style={styles.localNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.localHeaderInfo}>
                    <Text style={styles.localName} numberOfLines={1}>
                      {local.nombre}
                    </Text>
                    <Text style={styles.localAddress} numberOfLines={1}>
                      {local.direccion || 'Sin dirección'}
                    </Text>
                  </View>
                  <View style={styles.checkboxContainer}>
                    <IconSymbol 
                      ios_icon_name={isSelected ? "checkmark.circle.fill" : "circle"} 
                      android_material_icon_name={isSelected ? "check_circle" : "radio_button_unchecked"} 
                      size={28} 
                      color={isSelected ? colors.primary : colors.cardBorder} 
                    />
                  </View>
                </View>

                <View style={styles.localDetails}>
                  <View style={[styles.motivoBadge, { backgroundColor: motivoColor + '20' }]}>
                    <Text style={[styles.motivoText, { color: motivoColor }]}>
                      {local.motivo_invalido}
                    </Text>
                  </View>

                  <View style={styles.localMetadata}>
                    <Text style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Tipo:</Text> {local.tipo || 'N/A'}
                    </Text>
                    <Text style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Fuente:</Text> {local.source_type || 'N/A'}
                    </Text>
                    {local.source_id && (
                      <Text style={styles.metadataItem}>
                        <Text style={styles.metadataLabel}>ID Fuente:</Text> {local.source_id}
                      </Text>
                    )}
                    {local.google_place_id && (
                      <Text style={styles.metadataItem}>
                        <Text style={styles.metadataLabel}>Google Place ID:</Text> {local.google_place_id.substring(0, 20)}...
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
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
    backgroundColor: '#EF4444' + '20',
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
  controlsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  selectAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  excludeButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  excludeButtonDisabled: {
    opacity: 0.6,
  },
  excludeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
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
  localCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  localCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  localHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  localNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  localNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  localHeaderInfo: {
    flex: 1,
  },
  localName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  localAddress: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  checkboxContainer: {
    padding: 4,
  },
  localDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    padding: 16,
    gap: 12,
  },
  motivoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  motivoText: {
    fontSize: 13,
    fontWeight: '700',
  },
  localMetadata: {
    gap: 6,
  },
  metadataItem: {
    fontSize: 12,
    color: colors.text,
  },
  metadataLabel: {
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
