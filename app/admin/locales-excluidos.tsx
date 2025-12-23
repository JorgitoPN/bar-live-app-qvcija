
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

interface ExcludedLocal {
  id: string;
  local_id: string;
  nombre: string;
  direccion: string;
  latitud: number;
  longitud: number;
  google_place_id: string;
  osm_id: string;
  motivo_exclusion: string;
  descripcion_exclusion: string;
  fecha_exclusion: string;
  excluido_por: string;
  metadata: any;
}

/**
 * ✅ LOCALES EXCLUIDOS v1.0
 * 
 * Página de administración para ver y gestionar locales excluidos
 * del sistema de enriquecimiento
 */

export default function LocalesExcluidosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [excludedLocals, setExcludedLocals] = useState<ExcludedLocal[]>([]);
  const [filteredLocals, setFilteredLocals] = useState<ExcludedLocal[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMotivo, setFilterMotivo] = useState<string | null>(null);

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
    loadExcludedLocals();
  }, [checkAdminAccess]);

  useEffect(() => {
    filterLocals();
  }, [searchQuery, filterMotivo, excludedLocals]);

  const loadExcludedLocals = async () => {
    try {
      console.log('[LocalesExcluidos] 🔍 Loading excluded locals...');
      
      const { data, error } = await supabase
        .from('locales_excluidos')
        .select('*')
        .order('fecha_exclusion', { ascending: false });

      if (error) throw error;

      console.log('[LocalesExcluidos] ✅ Found', data?.length || 0, 'excluded locals');
      setExcludedLocals(data || []);
    } catch (error) {
      console.error('[LocalesExcluidos] ❌ Error loading excluded locals:', error);
      Alert.alert('Error', 'No se pudieron cargar los locales excluidos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterLocals = () => {
    let filtered = excludedLocals;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(local =>
        local.nombre.toLowerCase().includes(query) ||
        local.direccion?.toLowerCase().includes(query) ||
        local.descripcion_exclusion?.toLowerCase().includes(query)
      );
    }

    // Filter by motivo
    if (filterMotivo) {
      filtered = filtered.filter(local => local.motivo_exclusion === filterMotivo);
    }

    setFilteredLocals(filtered);
  };

  const handleRestoreLocal = (local: ExcludedLocal) => {
    Alert.alert(
      'Restaurar Local',
      `¿Estás seguro de que quieres restaurar "${local.nombre}"?\n\n` +
      `El local volverá a estar disponible para enriquecimiento e importación.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: () => restoreLocal(local)
        }
      ]
    );
  };

  const restoreLocal = async (local: ExcludedLocal) => {
    try {
      console.log('[LocalesExcluidos] 🔄 Restoring local:', local.nombre);
      
      // Eliminar de locales_excluidos
      const { error: deleteError } = await supabase
        .from('locales_excluidos')
        .delete()
        .eq('id', local.id);

      if (deleteError) throw deleteError;

      // Si el local aún existe en la tabla locales, reactivarlo
      if (local.local_id) {
        const { error: updateError } = await supabase
          .from('locales')
          .update({ activo: true, updated_at: new Date().toISOString() })
          .eq('id', local.local_id);

        if (updateError) {
          console.error('[LocalesExcluidos] Error reactivating local:', updateError);
        }
      }

      console.log('[LocalesExcluidos] ✅ Local restored');
      
      Alert.alert(
        'Local Restaurado',
        `El local "${local.nombre}" ha sido restaurado correctamente.`,
        [{ text: 'OK', onPress: () => loadExcludedLocals() }]
      );
    } catch (error) {
      console.error('[LocalesExcluidos] ❌ Error restoring local:', error);
      Alert.alert('Error', 'No se pudo restaurar el local');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadExcludedLocals();
  };

  const getMotivoLabel = (motivo: string) => {
    switch (motivo) {
      case 'duplicado': return 'Duplicado';
      case 'invalido': return 'Inválido';
      case 'fuera_categoria': return 'Fuera de Categoría';
      case 'datos_incorrectos': return 'Datos Incorrectos';
      case 'cerrado_permanentemente': return 'Cerrado Permanentemente';
      case 'no_existe': return 'No Existe';
      default: return motivo;
    }
  };

  const getMotivoColor = (motivo: string) => {
    switch (motivo) {
      case 'duplicado': return '#F59E0B';
      case 'invalido': return '#EF4444';
      case 'fuera_categoria': return '#8B5CF6';
      case 'datos_incorrectos': return '#EC4899';
      case 'cerrado_permanentemente': return '#F97316';
      case 'no_existe': return '#6B7280';
      default: return colors.textSecondary;
    }
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

  const motivoOptions = ['duplicado', 'invalido', 'fuera_categoria', 'datos_incorrectos', 'cerrado_permanentemente', 'no_existe'];

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
          <Text style={styles.headerTitle}>Locales Excluidos</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando locales excluidos...</Text>
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
        <Text style={styles.headerTitle}>Locales Excluidos</Text>
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
            <IconSymbol ios_icon_name="xmark.shield.fill" android_material_icon_name="block" size={32} color="#EF4444" />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryTitle}>Total Locales Excluidos</Text>
            <Text style={styles.summaryCount}>{excludedLocals.length}</Text>
            <Text style={styles.summaryDescription}>
              Locales bloqueados para enriquecimiento e importación
            </Text>
          </View>
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

        {/* Filter by Motivo */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterChip, filterMotivo === null && styles.filterChipActive]}
            onPress={() => setFilterMotivo(null)}
          >
            <Text style={[styles.filterChipText, filterMotivo === null && styles.filterChipTextActive]}>
              Todos ({excludedLocals.length})
            </Text>
          </TouchableOpacity>
          {motivoOptions.map(motivo => {
            const count = excludedLocals.filter(l => l.motivo_exclusion === motivo).length;
            if (count === 0) return null;
            
            return (
              <TouchableOpacity
                key={motivo}
                style={[styles.filterChip, filterMotivo === motivo && styles.filterChipActive]}
                onPress={() => setFilterMotivo(motivo)}
              >
                <Text style={[styles.filterChipText, filterMotivo === motivo && styles.filterChipTextActive]}>
                  {getMotivoLabel(motivo)} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Excluded Locals List */}
        {filteredLocals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No se encontraron resultados</Text>
            <Text style={styles.emptyDescription}>
              Intenta ajustar los filtros de búsqueda
            </Text>
          </View>
        ) : (
          filteredLocals.map((local, index) => {
            const motivoColor = getMotivoColor(local.motivo_exclusion);

            return (
              <View key={local.id} style={styles.localCard}>
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
                </View>

                <View style={styles.localDetails}>
                  <View style={[styles.motivoBadge, { backgroundColor: motivoColor + '20' }]}>
                    <Text style={[styles.motivoText, { color: motivoColor }]}>
                      {getMotivoLabel(local.motivo_exclusion)}
                    </Text>
                  </View>

                  <Text style={styles.descripcionText}>
                    {local.descripcion_exclusion}
                  </Text>

                  <View style={styles.localMetadata}>
                    <Text style={styles.metadataItem}>
                      <Text style={styles.metadataLabel}>Fecha Exclusión:</Text> {formatDate(local.fecha_exclusion)}
                    </Text>
                    {local.google_place_id && (
                      <Text style={styles.metadataItem}>
                        <Text style={styles.metadataLabel}>Google Place ID:</Text> {local.google_place_id.substring(0, 30)}...
                      </Text>
                    )}
                    {local.osm_id && (
                      <Text style={styles.metadataItem}>
                        <Text style={styles.metadataLabel}>OSM ID:</Text> {local.osm_id}
                      </Text>
                    )}
                    {local.latitud && local.longitud && (
                      <Text style={styles.metadataItem}>
                        <Text style={styles.metadataLabel}>Ubicación:</Text> {local.latitud.toFixed(6)}, {local.longitud.toFixed(6)}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.restoreButton}
                    onPress={() => handleRestoreLocal(local)}
                  >
                    <IconSymbol ios_icon_name="arrow.counterclockwise" android_material_icon_name="restore" size={18} color={colors.primary} />
                    <Text style={styles.restoreButtonText}>Restaurar Local</Text>
                  </TouchableOpacity>
                </View>
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
  filterContainer: {
    marginBottom: 16,
  },
  filterChip: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  filterChipTextActive: {
    color: colors.headerText,
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
  descripcionText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
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
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary + '10',
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
