
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

interface Local {
  id: string;
  nombre: string;
  tipo: string;
  direccion: string;
  provincia: string;
  imagen_url?: string;
  activo: boolean;
  destacado: boolean;
  enriquecido: boolean;
  source_type: string;
  fecha_creacion: string;
  propietario_id?: string;
  propietario?: {
    nombre: string;
    email: string;
  };
}

const LOCALES_POR_PAGINA = 20;

export default function GestionarLocalesScreen() {
  const router = useRouter();
  const [locales, setLocales] = useState<Local[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroPropietario, setFiltroPropietario] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroEnriquecido, setFiltroEnriquecido] = useState<string>('todos');
  const [filtroDestacado, setFiltroDestacado] = useState<string>('todos');
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalLocales, setTotalLocales] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Estados para los modales de selección
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Estados para selección múltiple
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [localesSeleccionados, setLocalesSeleccionados] = useState<Set<string>>(new Set());

  // Contadores
  const [contadores, setContadores] = useState({
    total: 0,
    activos: 0,
    inactivos: 0,
    enriquecidos: 0,
    noEnriquecidos: 0,
    conPropietario: 0,
    sinPropietario: 0,
  });

  const cargarContadores = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('locales')
        .select('activo, enriquecido, propietario_id');

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        activos: data?.filter(l => l.activo).length || 0,
        inactivos: data?.filter(l => !l.activo).length || 0,
        enriquecidos: data?.filter(l => l.enriquecido).length || 0,
        noEnriquecidos: data?.filter(l => !l.enriquecido).length || 0,
        conPropietario: data?.filter(l => l.propietario_id).length || 0,
        sinPropietario: data?.filter(l => !l.propietario_id).length || 0,
      };

      setContadores(stats);
    } catch (error) {
      console.error('[GestionarLocales] Error cargando contadores:', error);
    }
  }, []);

  const cargarLocales = useCallback(async (reset: boolean = false, currentPage: number = 1) => {
    try {
      if (reset) {
        setInitialLoading(true);
      } else {
        setLoadingMore(true);
      }

      const from = reset ? 0 : (currentPage - 1) * LOCALES_POR_PAGINA;
      const to = from + LOCALES_POR_PAGINA - 1;

      let query = supabase
        .from('locales')
        .select(`
          *,
          propietario:usuarios!propietario_id(
            nombre,
            email
          )
        `, { count: 'exact' })
        .order('fecha_creacion', { ascending: false })
        .range(from, to);

      // Aplicar filtros
      if (busqueda) {
        query = query.or(`nombre.ilike.%${busqueda}%,direccion.ilike.%${busqueda}%`);
      }

      if (filtroPropietario === 'con-dueno') {
        query = query.not('propietario_id', 'is', null);
      } else if (filtroPropietario === 'sin-dueno') {
        query = query.is('propietario_id', null);
      }

      if (filtroTipo !== 'todos') {
        query = query.eq('tipo', filtroTipo);
      }

      if (filtroEstado === 'activos') {
        query = query.eq('activo', true);
      } else if (filtroEstado === 'inactivos') {
        query = query.eq('activo', false);
      }

      if (filtroEnriquecido === 'enriquecidos') {
        query = query.eq('enriquecido', true);
      } else if (filtroEnriquecido === 'no-enriquecidos') {
        query = query.eq('enriquecido', false);
      }

      if (filtroDestacado === 'destacados') {
        query = query.eq('destacado', true);
      } else if (filtroDestacado === 'no-destacados') {
        query = query.eq('destacado', false);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('[GestionarLocales] Error cargando locales:', error);
        throw error;
      }

      console.log('[GestionarLocales] Locales cargados:', data?.length || 0);
      
      if (reset) {
        setLocales(data || []);
        setPaginaActual(2); // Next page will be 2
      } else {
        setLocales(prev => [...prev, ...(data || [])]);
        setPaginaActual(currentPage + 1);
      }
      
      setTotalLocales(count || 0);
      setHasMore((data?.length || 0) === LOCALES_POR_PAGINA);
    } catch (error) {
      console.error('[GestionarLocales] Error cargando locales:', error);
      Alert.alert('Error', 'No se pudieron cargar los locales');
    } finally {
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }, [busqueda, filtroPropietario, filtroTipo, filtroEstado, filtroEnriquecido, filtroDestacado]);

  // Initial load only - runs once on mount
  useEffect(() => {
    console.log('[GestionarLocales] Initial load');
    cargarContadores();
    cargarLocales(true, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when filters change - with debounce to prevent rapid calls
  useEffect(() => {
    if (!initialLoading) {
      console.log('[GestionarLocales] Filters changed, reloading...');
      const timer = setTimeout(() => {
        cargarLocales(true, 1);
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, filtroPropietario, filtroTipo, filtroEstado, filtroEnriquecido, filtroDestacado]);

  const toggleEstadoLocal = useCallback(async (localId: string, activo: boolean) => {
    try {
      const { error } = await supabase
        .from('locales')
        .update({ activo: !activo })
        .eq('id', localId);

      if (error) throw error;

      // Update local state without reloading
      setLocales(prevLocales =>
        prevLocales.map(local =>
          local.id === localId ? { ...local, activo: !activo } : local
        )
      );

      Alert.alert(
        'Éxito',
        `Local ${!activo ? 'activado' : 'desactivado'} correctamente`
      );
      cargarContadores();
    } catch (error) {
      console.error('[GestionarLocales] Error actualizando local:', error);
      Alert.alert('Error', 'No se pudo actualizar el local');
    }
  }, [cargarContadores]);

  const toggleDestacadoLocal = useCallback(async (localId: string, destacado: boolean) => {
    try {
      const { error } = await supabase
        .from('locales')
        .update({ destacado: !destacado })
        .eq('id', localId);

      if (error) throw error;

      setLocales(prevLocales =>
        prevLocales.map(local =>
          local.id === localId ? { ...local, destacado: !destacado } : local
        )
      );
    } catch (error) {
      console.error('[GestionarLocales] Error actualizando destacado:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado destacado');
    }
  }, []);

  const eliminarLocal = useCallback(async (localId: string) => {
    try {
      const { error } = await supabase
        .from('locales')
        .delete()
        .eq('id', localId);

      if (error) throw error;

      // Update local state without reloading
      setLocales(prevLocales => prevLocales.filter(local => local.id !== localId));
      setTotalLocales(prev => prev - 1);

      Alert.alert('Éxito', 'Local eliminado correctamente');
      cargarContadores();
    } catch (error) {
      console.error('[GestionarLocales] Error eliminando local:', error);
      Alert.alert('Error', 'No se pudo eliminar el local');
    }
  }, [cargarContadores]);

  const toggleSeleccionLocal = useCallback((localId: string) => {
    setLocalesSeleccionados(prev => {
      const newSet = new Set(prev);
      if (newSet.has(localId)) {
        newSet.delete(localId);
      } else {
        newSet.add(localId);
      }
      return newSet;
    });
  }, []);

  const seleccionarTodos = useCallback(() => {
    if (localesSeleccionados.size === locales.length) {
      setLocalesSeleccionados(new Set());
    } else {
      setLocalesSeleccionados(new Set(locales.map(l => l.id)));
    }
  }, [locales, localesSeleccionados.size]);

  const eliminarSeleccionados = useCallback(async () => {
    if (localesSeleccionados.size === 0) {
      Alert.alert('Aviso', 'No hay locales seleccionados');
      return;
    }

    Alert.alert(
      'Confirmar Eliminación',
      `¿Estás seguro de eliminar ${localesSeleccionados.size} locales? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const idsArray = Array.from(localesSeleccionados);
              
              // Eliminar en lotes de 100
              const batchSize = 100;
              for (let i = 0; i < idsArray.length; i += batchSize) {
                const batch = idsArray.slice(i, i + batchSize);
                const { error } = await supabase
                  .from('locales')
                  .delete()
                  .in('id', batch);

                if (error) throw error;
              }

              // Update local state without reloading
              setLocales(prevLocales => 
                prevLocales.filter(local => !localesSeleccionados.has(local.id))
              );
              setTotalLocales(prev => prev - localesSeleccionados.size);

              Alert.alert('Éxito', `Se eliminaron ${localesSeleccionados.size} locales correctamente`);
              setLocalesSeleccionados(new Set());
              setModoSeleccion(false);
              cargarContadores();
            } catch (error) {
              console.error('[GestionarLocales] Error eliminando locales:', error);
              Alert.alert('Error', 'No se pudieron eliminar todos los locales');
            }
          },
        },
      ]
    );
  }, [localesSeleccionados, cargarContadores]);

  const limpiarFiltros = useCallback(() => {
    setFiltroPropietario('todos');
    setFiltroTipo('todos');
    setFiltroEstado('todos');
    setFiltroEnriquecido('todos');
    setFiltroDestacado('todos');
    setBusqueda('');
  }, []);

  const hayFiltrosActivos = useCallback(() => {
    return filtroPropietario !== 'todos' ||
           filtroTipo !== 'todos' ||
           filtroEstado !== 'todos' ||
           filtroEnriquecido !== 'todos' ||
           filtroDestacado !== 'todos' ||
           busqueda !== '';
  }, [filtroPropietario, filtroTipo, filtroEstado, filtroEnriquecido, filtroDestacado, busqueda]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !initialLoading) {
      console.log('[GestionarLocales] Loading more, page:', paginaActual);
      cargarLocales(false, paginaActual);
    }
  }, [hasMore, loadingMore, initialLoading, paginaActual, cargarLocales]);

  const LocalCard = useCallback(({ local }: { local: Local }) => {
    return (
      <View style={styles.localCard}>
        <Pressable
          style={styles.localCardContent}
          onPress={() => {
            if (modoSeleccion) {
              toggleSeleccionLocal(local.id);
            } else {
              router.push(`/detalle/local?id=${local.id}`);
            }
          }}
          onLongPress={() => {
            if (!modoSeleccion) {
              setModoSeleccion(true);
              toggleSeleccionLocal(local.id);
            }
          }}
        >
          {modoSeleccion && (
            <View style={styles.checkboxContainer}>
              <View style={[
                styles.checkbox,
                localesSeleccionados.has(local.id) && styles.checkboxChecked
              ]}>
                {localesSeleccionados.has(local.id) && (
                  <IconSymbol name="checkmark" size={16} color={colors.headerText} />
                )}
              </View>
            </View>
          )}

          {local.imagen_url ? (
            <Image source={{ uri: local.imagen_url }} style={styles.localImage} />
          ) : (
            <View style={[styles.localImage, styles.imagePlaceholder]}>
              <IconSymbol name="photo" size={32} color={colors.textSecondary} />
            </View>
          )}

          <View style={styles.localInfo}>
            <View style={styles.localHeader}>
              <View style={styles.localTitleContainer}>
                <Text style={styles.localNombre} numberOfLines={1}>
                  {local.nombre}
                </Text>
                {local.enriquecido && (
                  <IconSymbol name="checkmark.seal.fill" size={16} color={colors.primary} />
                )}
              </View>
            </View>

            <View style={styles.statusRow}>
              <View style={[
                styles.statusBadge,
                local.activo ? styles.statusActivo : styles.statusInactivo
              ]}>
                <Text style={styles.statusText}>
                  {local.activo ? 'Activo' : 'Inactivo'}
                </Text>
              </View>
              {local.enriquecido && (
                <View style={[styles.statusBadge, styles.statusEnriquecido]}>
                  <Text style={styles.statusText}>Enriquecido</Text>
                </View>
              )}
            </View>

            <Text style={styles.localDireccion} numberOfLines={2}>
              {local.direccion}
            </Text>

            <View style={styles.ownerInfo}>
              {local.propietario ? (
                <React.Fragment>
                  <IconSymbol name="envelope.fill" size={12} color={colors.textSecondary} />
                  <Text style={styles.ownerEmail} numberOfLines={1}>
                    {local.propietario.email}
                  </Text>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <IconSymbol name="person.crop.circle.badge.xmark" size={12} color={colors.textSecondary} />
                  <Text style={styles.ownerEmail}>Sin propietario</Text>
                </React.Fragment>
              )}
            </View>

            <View style={styles.localMeta}>
              <View style={styles.tipoBadge}>
                <Text style={styles.tipoText}>{local.tipo}</Text>
              </View>
            </View>
          </View>
        </Pressable>

        {!modoSeleccion && (
          <View style={styles.localActions}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleItem}>
                <Text style={styles.toggleLabel}>Activo:</Text>
                <Switch
                  value={local.activo}
                  onValueChange={() => {
                    Alert.alert(
                      local.activo ? 'Desactivar Local' : 'Activar Local',
                      `¿Estás seguro de ${local.activo ? 'desactivar' : 'activar'} ${local.nombre}?`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: local.activo ? 'Desactivar' : 'Activar',
                          onPress: () => toggleEstadoLocal(local.id, local.activo),
                        },
                      ]
                    );
                  }}
                  trackColor={{ false: colors.cardBorder, true: colors.primary }}
                  thumbColor={colors.headerText}
                />
              </View>

              <View style={styles.toggleItem}>
                <Text style={styles.toggleLabel}>Destacado:</Text>
                <Switch
                  value={local.destacado}
                  onValueChange={() => toggleDestacadoLocal(local.id, local.destacado)}
                  trackColor={{ false: colors.cardBorder, true: colors.badgeDestacado }}
                  thumbColor={colors.headerText}
                />
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => router.push(`/editar/local?id=${local.id}`)}
              >
                <IconSymbol name="pencil" size={18} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() =>
                  Alert.alert(
                    'Eliminar Local',
                    `¿Estás seguro de eliminar ${local.nombre}? Esta acción no se puede deshacer.`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Eliminar',
                        onPress: () => eliminarLocal(local.id),
                        style: 'destructive',
                      },
                    ]
                  )
                }
              >
                <IconSymbol name="trash" size={18} color={colors.badgeNuevo} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }, [modoSeleccion, localesSeleccionados, toggleSeleccionLocal, toggleEstadoLocal, toggleDestacadoLocal, eliminarLocal, router]);

  const renderLocalCard = useCallback(({ item }: { item: Local }) => (
    <LocalCard local={item} />
  ), [LocalCard]);

  const renderHeader = useMemo(() => (
    <React.Fragment>
      {/* Contadores informativos */}
      <View style={styles.statsSection}>
        <Text style={styles.statsSectionTitle}>Estadísticas de Locales</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{contadores.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>{contadores.enriquecidos}</Text>
            <Text style={styles.statLabel}>Enriquecidos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{contadores.noEnriquecidos}</Text>
            <Text style={styles.statLabel}>Sin Enriquecer</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{contadores.conPropietario}</Text>
            <Text style={styles.statLabel}>Con Propietario</Text>
          </View>
        </View>
      </View>

      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o dirección..."
          placeholderTextColor={colors.textSecondary}
          value={busqueda}
          onChangeText={setBusqueda}
        />
        {busqueda !== '' && (
          <TouchableOpacity onPress={() => setBusqueda('')}>
            <IconSymbol name="xmark.circle.fill" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Botones de filtros compactos */}
      <View style={styles.filterButtonsRow}>
        <TouchableOpacity
          style={[styles.filterButton, hayFiltrosActivos() && styles.filterButtonActive]}
          onPress={() => setShowFiltersModal(true)}
        >
          <IconSymbol name="line.3.horizontal.decrease.circle" size={20} color={hayFiltrosActivos() ? colors.headerText : colors.text} />
          <Text style={[styles.filterButtonText, hayFiltrosActivos() && styles.filterButtonTextActive]}>
            Filtros {hayFiltrosActivos() && '•'}
          </Text>
        </TouchableOpacity>

        {hayFiltrosActivos() && (
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={limpiarFiltros}
          >
            <IconSymbol name="xmark.circle.fill" size={16} color={colors.textSecondary} />
            <Text style={styles.clearFiltersText}>Limpiar</Text>
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }} />

        {modoSeleccion ? (
          <React.Fragment>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={seleccionarTodos}
            >
              <Text style={styles.selectAllText}>
                {localesSeleccionados.size === locales.length ? 'Deseleccionar' : 'Seleccionar'} Todos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteSelectedButton}
              onPress={eliminarSeleccionados}
              disabled={localesSeleccionados.size === 0}
            >
              <IconSymbol name="trash.fill" size={16} color={colors.headerText} />
              <Text style={styles.deleteSelectedText}>
                {localesSeleccionados.size > 0 ? `(${localesSeleccionados.size})` : 'Eliminar'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelSelectionButton}
              onPress={() => {
                setModoSeleccion(false);
                setLocalesSeleccionados(new Set());
              }}
            >
              <Text style={styles.cancelSelectionText}>Cancelar</Text>
            </TouchableOpacity>
          </React.Fragment>
        ) : (
          <TouchableOpacity
            style={styles.selectionModeButton}
            onPress={() => setModoSeleccion(true)}
          >
            <IconSymbol name="checkmark.circle" size={20} color={colors.primary} />
            <Text style={styles.selectionModeText}>Seleccionar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Indicador de resultados */}
      <View style={styles.resultsIndicator}>
        <Text style={styles.resultsText}>
          Mostrando {locales.length} de {totalLocales} locales
        </Text>
      </View>
    </React.Fragment>
  ), [contadores, busqueda, hayFiltrosActivos, modoSeleccion, localesSeleccionados, locales.length, totalLocales, seleccionarTodos, eliminarSeleccionados, limpiarFiltros]);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.footerLoaderText}>Cargando más...</Text>
      </View>
    );
  }, [loadingMore]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyState}>
      <IconSymbol name="building.2" size={48} color={colors.textSecondary} />
      <Text style={styles.emptyText}>No se encontraron locales</Text>
      <Text style={styles.emptySubtext}>
        Intenta ajustar los filtros de búsqueda
      </Text>
    </View>
  ), []);

  if (initialLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando locales...</Text>
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
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestionar Locales</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/crear/local')}
        >
          <IconSymbol name="plus" size={24} color={colors.headerText} />
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        data={locales}
        renderItem={renderLocalCard}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
      />

      {/* Modal de Filtros */}
      <Modal
        visible={showFiltersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowFiltersModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowFiltersModal(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Filtro Enriquecido */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Enriquecimiento</Text>
                <View style={styles.filterOptions}>
                  {['todos', 'enriquecidos', 'no-enriquecidos'].map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.filterOption,
                        filtroEnriquecido === option && styles.filterOptionActive
                      ]}
                      onPress={() => setFiltroEnriquecido(option)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filtroEnriquecido === option && styles.filterOptionTextActive
                      ]}>
                        {option === 'todos' ? 'Todos' : option === 'enriquecidos' ? 'Enriquecidos' : 'Sin Enriquecer'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Filtro Estado */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Estado</Text>
                <View style={styles.filterOptions}>
                  {['todos', 'activos', 'inactivos'].map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.filterOption,
                        filtroEstado === option && styles.filterOptionActive
                      ]}
                      onPress={() => setFiltroEstado(option)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filtroEstado === option && styles.filterOptionTextActive
                      ]}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Filtro Propietario */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Propietario</Text>
                <View style={styles.filterOptions}>
                  {['todos', 'con-dueno', 'sin-dueno'].map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.filterOption,
                        filtroPropietario === option && styles.filterOptionActive
                      ]}
                      onPress={() => setFiltroPropietario(option)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filtroPropietario === option && styles.filterOptionTextActive
                      ]}>
                        {option === 'todos' ? 'Todos' : option === 'con-dueno' ? 'Con Dueño' : 'Sin Dueño'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Filtro Tipo */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Tipo</Text>
                <View style={styles.filterOptions}>
                  {['todos', 'bar', 'restaurante', 'cafe', 'pub', 'discoteca'].map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.filterOption,
                        filtroTipo === option && styles.filterOptionActive
                      ]}
                      onPress={() => setFiltroTipo(option)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filtroTipo === option && styles.filterOptionTextActive
                      ]}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Filtro Destacado */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Destacado</Text>
                <View style={styles.filterOptions}>
                  {['todos', 'destacados', 'no-destacados'].map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.filterOption,
                        filtroDestacado === option && styles.filterOptionActive
                      ]}
                      onPress={() => setFiltroDestacado(option)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filtroDestacado === option && styles.filterOptionTextActive
                      ]}>
                        {option === 'todos' ? 'Todos' : option === 'destacados' ? 'Destacados' : 'No Destacados'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={limpiarFiltros}
              >
                <Text style={styles.modalButtonSecondaryText}>Limpiar Filtros</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={() => setShowFiltersModal(false)}
              >
                <Text style={styles.modalButtonPrimaryText}>Aplicar</Text>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.text,
    marginTop: 16,
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
  addButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  listContent: {
    paddingBottom: 20,
  },
  statsSection: {
    padding: 16,
    backgroundColor: colors.cardBackground,
    marginBottom: 12,
  },
  statsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    ...commonStyles.cardShadow,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: colors.text,
  },
  filterButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterButtonTextActive: {
    color: colors.headerText,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  clearFiltersText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  selectionModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  selectionModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  selectAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  deleteSelectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.badgeNuevo,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  deleteSelectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
  },
  cancelSelectionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelSelectionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  resultsIndicator: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  resultsText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  localCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    ...commonStyles.cardShadow,
  },
  localCardContent: {
    flexDirection: 'row',
  },
  checkboxContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  localImage: {
    width: 100,
    height: 140,
  },
  imagePlaceholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localInfo: {
    flex: 1,
    padding: 12,
  },
  localHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  localTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  localNombre: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 6,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  statusActivo: {
    backgroundColor: '#10B98120',
  },
  statusInactivo: {
    backgroundColor: `${colors.textSecondary}20`,
  },
  statusEnriquecido: {
    backgroundColor: `${colors.primary}20`,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
  },
  localDireccion: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 16,
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  ownerEmail: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  localMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipoBadge: {
    backgroundColor: `${colors.primary}20`,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  tipoText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  localActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: `${colors.badgeNuevo}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
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
    maxHeight: '80%',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBody: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  filterOptionTextActive: {
    color: colors.headerText,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalButtonSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.headerText,
  },
});
