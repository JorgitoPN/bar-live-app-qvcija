
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
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { esNombreLocalValido } from '@/utils/enrichmentExclusionCheck';

interface LocalToValidate {
  id: string;
  nombre: string;
  direccion: string;
  tipo: string;
  latitud: number;
  longitud: number;
  activo: boolean;
  enriquecido: boolean;
  google_place_id?: string;
  osm_id?: string;
  source_type?: string;
}

/**
 * ✅ VALIDAR NOMBRES DE LOCALES v1.0
 * 
 * Página de administración para validar nombres de locales
 * según las palabras clave permitidas
 */

export default function ValidarNombresLocalesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locales, setLocales] = useState<LocalToValidate[]>([]);
  const [localesInvalidos, setLocalesInvalidos] = useState<LocalToValidate[]>([]);
  const [localesValidos, setLocalesValidos] = useState<LocalToValidate[]>([]);
  const [selectedLocals, setSelectedLocals] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyInvalid, setShowOnlyInvalid] = useState(true);
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
    loadLocales();
  }, [checkAdminAccess]);

  const loadLocales = async () => {
    try {
      console.log('[ValidarNombres] 🔍 Loading locales...');
      
      // Cargar todos los locales (activos e inactivos)
      const { data, error } = await supabase
        .from('locales')
        .select('id, nombre, direccion, tipo, latitud, longitud, activo, enriquecido, google_place_id, osm_id, source_type')
        .order('nombre', { ascending: true });

      if (error) throw error;

      console.log('[ValidarNombres] ✅ Found', data?.length || 0, 'locales');
      
      // Validar nombres
      const invalidos: LocalToValidate[] = [];
      const validos: LocalToValidate[] = [];

      for (const local of data || []) {
        const validacion = esNombreLocalValido(local.nombre);
        if (validacion.valido) {
          validos.push(local);
        } else {
          invalidos.push(local);
        }
      }

      console.log('[ValidarNombres] Válidos:', validos.length);
      console.log('[ValidarNombres] Inválidos:', invalidos.length);

      setLocales(data || []);
      setLocalesValidos(validos);
      setLocalesInvalidos(invalidos);
    } catch (error) {
      console.error('[ValidarNombres] ❌ Error loading locales:', error);
      Alert.alert('Error', 'No se pudieron cargar los locales');
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
    const currentList = showOnlyInvalid ? localesInvalidos : localesValidos;
    const filteredList = filterLocales(currentList);
    
    if (selectedLocals.size === filteredList.length) {
      setSelectedLocals(new Set());
    } else {
      setSelectedLocals(new Set(filteredList.map(l => l.id)));
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
      `Motivo: Nombre no contiene palabras clave válidas`,
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
      console.log('[ValidarNombres] 🗑️ Excluding selected locals...');
      
      let excludedCount = 0;
      
      for (const localId of selectedLocals) {
        const local = localesInvalidos.find(l => l.id === localId);
        if (!local) continue;

        // Agregar a locales_excluidos
        const { error: insertError } = await supabase
          .from('locales_excluidos')
          .insert({
            local_id: localId,
            nombre: local.nombre,
            direccion: local.direccion,
            latitud: local.latitud,
            longitud: local.longitud,
            google_place_id: local.google_place_id,
            osm_id: local.osm_id,
            motivo_exclusion: 'invalido',
            descripcion_exclusion: 'El nombre no contiene palabras clave válidas (Bar, Discoteca, Restaurante, Cafetería, Café, Pub, Coctelería)',
            excluido_por: user?.id,
            metadata: {
              tipo_original: local.tipo,
              source_type: local.source_type,
              validacion_nombre: false,
            }
          });

        if (insertError) {
          console.error('[ValidarNombres] Error inserting to locales_excluidos:', insertError);
          continue;
        }

        // Marcar como inactivo
        const { error: updateError } = await supabase
          .from('locales')
          .update({ activo: false, updated_at: new Date().toISOString() })
          .eq('id', localId);

        if (updateError) {
          console.error('[ValidarNombres] Error updating local:', updateError);
          continue;
        }

        excludedCount++;
      }

      console.log('[ValidarNombres] ✅ Excluded', excludedCount, 'locals');
      
      Alert.alert(
        'Locales Excluidos',
        `Se excluyeron ${excludedCount} locales correctamente.\n\n` +
        `Estos locales no aparecerán en futuros procesos de enriquecimiento.`,
        [{ text: 'OK', onPress: () => {
          setSelectedLocals(new Set());
          loadLocales();
        }}]
      );
    } catch (error) {
      console.error('[ValidarNombres] ❌ Error excluding locals:', error);
      Alert.alert('Error', 'No se pudieron excluir los locales');
    } finally {
      setProcessing(false);
    }
  };

  const filterLocales = (localesList: LocalToValidate[]) => {
    if (!searchQuery.trim()) return localesList;
    
    const query = searchQuery.toLowerCase();
    return localesList.filter(local =>
      local.nombre.toLowerCase().includes(query) ||
      local.direccion?.toLowerCase().includes(query)
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLocales();
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
          <Text style={styles.headerTitle}>Validar Nombres</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Validando nombres de locales...</Text>
        </View>
      </View>
    );
  }

  const currentList = showOnlyInvalid ? localesInvalidos : localesValidos;
  const filteredList = filterLocales(currentList);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Validar Nombres</Text>
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
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.summaryCardHalf]}>
            <View style={[styles.summaryIconContainer, { backgroundColor: '#10B981' + '20' }]}>
              <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={28} color="#10B981" />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryTitle}>Válidos</Text>
              <Text style={styles.summaryCount}>{localesValidos.length}</Text>
            </View>
          </View>

          <View style={[styles.summaryCard, styles.summaryCardHalf]}>
            <View style={[styles.summaryIconContainer, { backgroundColor: '#EF4444' + '20' }]}>
              <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color="#EF4444" />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryTitle}>Inválidos</Text>
              <Text style={styles.summaryCount}>{localesInvalidos.length}</Text>
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Palabras Clave Válidas</Text>
            <Text style={styles.infoText}>
              Bar, Discoteca, Restaurante, Cafetería, Café, Pub, Coctelería
            </Text>
            <Text style={styles.infoDescription}>
              Un local es válido si su nombre contiene al menos una de estas palabras.
            </Text>
          </View>
        </View>

        {/* Filter Toggle */}
        <View style={styles.filterToggle}>
          <TouchableOpacity
            style={[styles.filterToggleButton, showOnlyInvalid && styles.filterToggleButtonActive]}
            onPress={() => {
              setShowOnlyInvalid(true);
              setSelectedLocals(new Set());
            }}
          >
            <Text style={[styles.filterToggleText, showOnlyInvalid && styles.filterToggleTextActive]}>
              Inválidos ({localesInvalidos.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterToggleButton, !showOnlyInvalid && styles.filterToggleButtonActive]}
            onPress={() => {
              setShowOnlyInvalid(false);
              setSelectedLocals(new Set());
            }}
          >
            <Text style={[styles.filterToggleText, !showOnlyInvalid && styles.filterToggleTextActive]}>
              Válidos ({localesValidos.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o dirección..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Selection Controls */}
        {showOnlyInvalid && filteredList.length > 0 && (
          <View style={styles.controlsCard}>
            <TouchableOpacity style={styles.selectAllButton} onPress={selectAll}>
              <IconSymbol 
                ios_icon_name={selectedLocals.size === filteredList.length ? "checkmark.square.fill" : "square"} 
                android_material_icon_name={selectedLocals.size === filteredList.length ? "check_box" : "check_box_outline_blank"} 
                size={24} 
                color={colors.primary} 
              />
              <Text style={styles.selectAllText}>
                {selectedLocals.size === filteredList.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
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

        {/* Locales List */}
        {filteredList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol 
              ios_icon_name={showOnlyInvalid ? "checkmark.circle.fill" : "magnifyingglass"} 
              android_material_icon_name={showOnlyInvalid ? "check_circle" : "search"} 
              size={64} 
              color={showOnlyInvalid ? "#10B981" : colors.textSecondary} 
            />
            <Text style={styles.emptyTitle}>
              {showOnlyInvalid ? '¡No hay locales inválidos!' : 'No se encontraron resultados'}
            </Text>
            <Text style={styles.emptyDescription}>
              {showOnlyInvalid 
                ? 'Todos los locales tienen nombres válidos' 
                : 'Intenta ajustar los filtros de búsqueda'}
            </Text>
          </View>
        ) : (
          filteredList.map((local, index) => {
            const isSelected = selectedLocals.has(local.id);
            const isInvalid = showOnlyInvalid;

            return (
              <TouchableOpacity
                key={local.id}
                style={[
                  styles.localCard,
                  isSelected && styles.localCardSelected,
                  !isInvalid && styles.localCardValid
                ]}
                onPress={() => showOnlyInvalid && toggleLocalSelection(local.id)}
                disabled={!showOnlyInvalid}
              >
                <View style={styles.localHeader}>
                  <View style={[
                    styles.localNumberBadge,
                    isInvalid && { backgroundColor: '#EF4444' + '20' },
                    !isInvalid && { backgroundColor: '#10B981' + '20' }
                  ]}>
                    <Text style={[
                      styles.localNumberText,
                      isInvalid && { color: '#EF4444' },
                      !isInvalid && { color: '#10B981' }
                    ]}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={styles.localHeaderInfo}>
                    <Text style={styles.localName} numberOfLines={1}>
                      {local.nombre}
                    </Text>
                    <Text style={styles.localAddress} numberOfLines={1}>
                      {local.direccion || 'Sin dirección'}
                    </Text>
                  </View>
                  {showOnlyInvalid && (
                    <View style={styles.checkboxContainer}>
                      <IconSymbol 
                        ios_icon_name={isSelected ? "checkmark.circle.fill" : "circle"} 
                        android_material_icon_name={isSelected ? "check_circle" : "radio_button_unchecked"} 
                        size={28} 
                        color={isSelected ? colors.primary : colors.cardBorder} 
                      />
                    </View>
                  )}
                </View>

                <View style={styles.localDetails}>
                  <View style={styles.localMetadata}>
                    <Text style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Tipo:</Text> {local.tipo || 'N/A'}
                    </Text>
                    <Text style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Estado:</Text> {local.activo ? 'Activo' : 'Inactivo'}
                    </Text>
                    <Text style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Enriquecido:</Text> {local.enriquecido ? 'Sí' : 'No'}
                    </Text>
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
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  summaryCardHalf: {
    flex: 1,
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  infoCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  filterToggle: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterToggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterToggleButtonActive: {
    backgroundColor: colors.primary,
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterToggleTextActive: {
    color: colors.headerText,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
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
  localCardValid: {
    borderColor: '#10B981' + '40',
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
