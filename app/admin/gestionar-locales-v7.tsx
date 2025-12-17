
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Pressable,
  Switch,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Local {
  id: string;
  nombre: string;
  tipo: string;
  direccion: string;
  provincia: string;
  activo: boolean;
  destacado: boolean;
  imagen_url?: string;
  telefono?: string;
  email?: string;
  website?: string;
  descripcion?: string;
  enriquecido?: boolean;
  created_at: string;
  updated_at: string;
}

export default function GestionarLocalesV7Screen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locales, setLocales] = useState<Local[]>([]);
  const [filteredLocales, setFilteredLocales] = useState<Local[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterProvincia, setFilterProvincia] = useState<string>('todas');
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  
  // Selection mode
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [localesSeleccionados, setLocalesSeleccionados] = useState<Set<string>>(new Set());
  
  // Modals
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    inactivos: 0,
    destacados: 0,
    enriquecidos: 0,
  });

  useEffect(() => {
    loadLocales();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [locales, searchQuery, filterTipo, filterProvincia, filterEstado]);

  const loadLocales = async () => {
    try {
      const { data, error } = await supabase
        .from('locales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLocales(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('[GestionarLocalesV7] Error loading locales:', error);
      Alert.alert('Error', 'No se pudieron cargar los locales');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (data: Local[]) => {
    setStats({
      total: data.length,
      activos: data.filter(l => l.activo).length,
      inactivos: data.filter(l => !l.activo).length,
      destacados: data.filter(l => l.destacado).length,
      enriquecidos: data.filter(l => l.enriquecido).length,
    });
  };

  const applyFilters = () => {
    let filtered = [...locales];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(local =>
        local.nombre.toLowerCase().includes(query) ||
        local.direccion.toLowerCase().includes(query) ||
        local.provincia.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (filterTipo !== 'todos') {
      filtered = filtered.filter(local => local.tipo === filterTipo);
    }

    // Province filter
    if (filterProvincia !== 'todas') {
      filtered = filtered.filter(local => local.provincia === filterProvincia);
    }

    // Status filter
    if (filterEstado === 'activos') {
      filtered = filtered.filter(local => local.activo);
    } else if (filterEstado === 'inactivos') {
      filtered = filtered.filter(local => !local.activo);
    } else if (filterEstado === 'destacados') {
      filtered = filtered.filter(local => local.destacado);
    } else if (filterEstado === 'enriquecidos') {
      filtered = filtered.filter(local => local.enriquecido);
    }

    setFilteredLocales(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadLocales();
  };

  const toggleSeleccionLocal = (localId: string) => {
    const newSelection = new Set(localesSeleccionados);
    if (newSelection.has(localId)) {
      newSelection.delete(localId);
    } else {
      newSelection.add(localId);
    }
    setLocalesSeleccionados(newSelection);
  };

  const seleccionarTodos = () => {
    if (localesSeleccionados.size === filteredLocales.length) {
      setLocalesSeleccionados(new Set());
    } else {
      setLocalesSeleccionados(new Set(filteredLocales.map(l => l.id)));
    }
  };

  const handleBulkAction = async (action: 'activar' | 'desactivar' | 'destacar' | 'eliminar') => {
    if (localesSeleccionados.size === 0) {
      Alert.alert('Error', 'No hay locales seleccionados');
      return;
    }

    const selectedIds = Array.from(localesSeleccionados);

    try {
      if (action === 'eliminar') {
        Alert.alert(
          'Confirmar eliminación',
          `¿Estás seguro de que quieres eliminar ${selectedIds.length} locales?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Eliminar',
              style: 'destructive',
              onPress: async () => {
                const { error } = await supabase
                  .from('locales')
                  .delete()
                  .in('id', selectedIds);

                if (error) throw error;

                Alert.alert('Éxito', 'Locales eliminados correctamente');
                setLocalesSeleccionados(new Set());
                setModoSeleccion(false);
                loadLocales();
              },
            },
          ]
        );
        return;
      }

      const updateData: any = {};
      if (action === 'activar') updateData.activo = true;
      if (action === 'desactivar') updateData.activo = false;
      if (action === 'destacar') updateData.destacado = true;

      const { error } = await supabase
        .from('locales')
        .update(updateData)
        .in('id', selectedIds);

      if (error) throw error;

      Alert.alert('Éxito', 'Acción aplicada correctamente');
      setLocalesSeleccionados(new Set());
      setModoSeleccion(false);
      setShowBulkActionsModal(false);
      loadLocales();
    } catch (error) {
      console.error('[GestionarLocalesV7] Error in bulk action:', error);
      Alert.alert('Error', 'No se pudo completar la acción');
    }
  };

  const handleViewLocalDetail = (localId: string) => {
    if (modoSeleccion) {
      toggleSeleccionLocal(localId);
    } else {
      router.push({
        pathname: '/detalle/local',
        params: { id: localId },
      });
    }
  };

  const handleEditLocal = (localId: string) => {
    router.push({
      pathname: '/editar/local',
      params: { id: localId },
    });
  };

  const LocalCard = ({ local }: { local: Local }) => {
    const isSelected = localesSeleccionados.has(local.id);

    return (
      <TouchableOpacity
        style={[
          styles.localCard,
          isSelected && styles.localCardSelected,
        ]}
        onPress={() => handleViewLocalDetail(local.id)}
        onLongPress={() => {
          if (!modoSeleccion) {
            setModoSeleccion(true);
            toggleSeleccionLocal(local.id);
          }
        }}
        activeOpacity={0.7}
      >
        {modoSeleccion && (
          <View style={styles.selectionCheckbox}>
            {isSelected ? (
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={24}
                color={colors.primary}
              />
            ) : (
              <IconSymbol
                ios_icon_name="circle"
                android_material_icon_name="radio_button_unchecked"
                size={24}
                color={colors.textSecondary}
              />
            )}
          </View>
        )}

        <View style={styles.localInfo}>
          <View style={styles.localHeader}>
            <Text style={styles.localName} numberOfLines={1}>
              {local.nombre}
            </Text>
            <View style={styles.badges}>
              {local.destacado && (
                <View style={[styles.badge, styles.badgeDestacado]}>
                  <IconSymbol
                    ios_icon_name="star.fill"
                    android_material_icon_name="star"
                    size={12}
                    color={colors.headerText}
                  />
                </View>
              )}
              {local.enriquecido && (
                <View style={[styles.badge, styles.badgeEnriquecido]}>
                  <IconSymbol
                    ios_icon_name="checkmark.seal.fill"
                    android_material_icon_name="verified"
                    size={12}
                    color={colors.headerText}
                  />
                </View>
              )}
            </View>
          </View>

          <Text style={styles.localTipo}>{local.tipo}</Text>
          <Text style={styles.localDireccion} numberOfLines={1}>
            {local.direccion}
          </Text>
          <Text style={styles.localProvincia}>{local.provincia}</Text>

          <View style={styles.localFooter}>
            <View style={[
              styles.statusBadge,
              local.activo ? styles.statusBadgeActive : styles.statusBadgeInactive,
            ]}>
              <Text style={[
                styles.statusText,
                local.activo ? styles.statusTextActive : styles.statusTextInactive,
              ]}>
                {local.activo ? 'Activo' : 'Inactivo'}
              </Text>
            </View>

            {!modoSeleccion && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEditLocal(local.id)}
              >
                <IconSymbol
                  ios_icon_name="pencil"
                  android_material_icon_name="edit"
                  size={18}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderLocalCard = useCallback(({ item }: { item: Local }) => (
    <LocalCard local={item} />
  ), [modoSeleccion, localesSeleccionados]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Cargando locales...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow_back"
              size={24}
              color={colors.headerText}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gestionar Locales</Text>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <IconSymbol
              ios_icon_name="line.3.horizontal.decrease.circle"
              android_material_icon_name="filter_list"
              size={24}
              color={colors.headerText}
            />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsContainer}
          contentContainerStyle={styles.statsContent}
        >
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.activos}</Text>
            <Text style={styles.statLabel}>Activos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.inactivos}</Text>
            <Text style={styles.statLabel}>Inactivos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.destacados}</Text>
            <Text style={styles.statLabel}>Destacados</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.enriquecidos}</Text>
            <Text style={styles.statLabel}>Enriquecidos</Text>
          </View>
        </ScrollView>

        {/* Search */}
        <View style={styles.searchContainer}>
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={20}
            color={colors.textSecondary}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar locales..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="cancel"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Selection Mode Bar */}
      {modoSeleccion && (
        <View style={styles.selectionBar}>
          <TouchableOpacity
            style={styles.selectionButton}
            onPress={() => {
              setModoSeleccion(false);
              setLocalesSeleccionados(new Set());
            }}
          >
            <Text style={styles.selectionButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <Text style={styles.selectionCount}>
            {localesSeleccionados.size} seleccionados
          </Text>

          <View style={styles.selectionActions}>
            <TouchableOpacity
              style={styles.selectionButton}
              onPress={seleccionarTodos}
            >
              <Text style={styles.selectionButtonText}>
                {localesSeleccionados.size === filteredLocales.length ? 'Deseleccionar' : 'Todos'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.selectionButton, styles.selectionButtonPrimary]}
              onPress={() => setShowBulkActionsModal(true)}
              disabled={localesSeleccionados.size === 0}
            >
              <Text style={styles.selectionButtonTextPrimary}>Acciones</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Locales List */}
      <FlatList
        data={filteredLocales}
        renderItem={renderLocalCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <IconSymbol
              ios_icon_name="building.2"
              android_material_icon_name="business"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>No se encontraron locales</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || filterTipo !== 'todos' || filterProvincia !== 'todas'
                ? 'Intenta ajustar los filtros'
                : 'Añade tu primer local'}
            </Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowFilterModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Filter options would go here */}
              <Text style={styles.filterSectionTitle}>Estado</Text>
              <View style={styles.filterOptions}>
                {['todos', 'activos', 'inactivos', 'destacados', 'enriquecidos'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.filterOption,
                      filterEstado === option && styles.filterOptionActive,
                    ]}
                    onPress={() => {
                      setFilterEstado(option);
                      setShowFilterModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        filterEstado === option && styles.filterOptionTextActive,
                      ]}
                    >
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Bulk Actions Modal */}
      <Modal
        visible={showBulkActionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBulkActionsModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowBulkActionsModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Acciones en lote</Text>
              <TouchableOpacity onPress={() => setShowBulkActionsModal(false)}>
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={() => handleBulkAction('activar')}
              >
                <IconSymbol
                  ios_icon_name="checkmark.circle"
                  android_material_icon_name="check_circle"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.bulkActionText}>Activar seleccionados</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={() => handleBulkAction('desactivar')}
              >
                <IconSymbol
                  ios_icon_name="xmark.circle"
                  android_material_icon_name="cancel"
                  size={24}
                  color={colors.textSecondary}
                />
                <Text style={styles.bulkActionText}>Desactivar seleccionados</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bulkActionButton}
                onPress={() => handleBulkAction('destacar')}
              >
                <IconSymbol
                  ios_icon_name="star.fill"
                  android_material_icon_name="star"
                  size={24}
                  color="#F59E0B"
                />
                <Text style={styles.bulkActionText}>Destacar seleccionados</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bulkActionButton, styles.bulkActionButtonDanger]}
                onPress={() => handleBulkAction('eliminar')}
              >
                <IconSymbol
                  ios_icon_name="trash"
                  android_material_icon_name="delete"
                  size={24}
                  color="#EF4444"
                />
                <Text style={[styles.bulkActionText, styles.bulkActionTextDanger]}>
                  Eliminar seleccionados
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  filterButton: {
    padding: 8,
  },
  statsContainer: {
    marginBottom: 16,
  },
  statsContent: {
    gap: 12,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  statLabel: {
    fontSize: 12,
    color: colors.headerText,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.headerText,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
  },
  selectionCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  selectionButtonPrimary: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  selectionButtonTextPrimary: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  listContent: {
    padding: 16,
  },
  localCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...commonStyles.shadow,
  },
  localCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  selectionCheckbox: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  localInfo: {
    flex: 1,
  },
  localHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  localName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeDestacado: {
    backgroundColor: '#F59E0B',
  },
  badgeEnriquecido: {
    backgroundColor: colors.primary,
  },
  localTipo: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  localDireccion: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  localProvincia: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  localFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeActive: {
    backgroundColor: '#10B98120',
  },
  statusBadgeInactive: {
    backgroundColor: '#EF444420',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#10B981',
  },
  statusTextInactive: {
    color: '#EF4444',
  },
  editButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBody: {
    padding: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  filterOptions: {
    gap: 8,
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  filterOptionActive: {
    backgroundColor: colors.primary + '20',
  },
  filterOptionText: {
    fontSize: 15,
    color: colors.text,
  },
  filterOptionTextActive: {
    fontWeight: '600',
    color: colors.primary,
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.background,
    marginBottom: 12,
  },
  bulkActionButtonDanger: {
    backgroundColor: '#FEE2E2',
  },
  bulkActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  bulkActionTextDanger: {
    color: '#EF4444',
  },
});
