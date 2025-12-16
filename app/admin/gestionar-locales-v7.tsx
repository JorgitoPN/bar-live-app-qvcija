
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
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

export default function GestionarLocalesV7Screen() {
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

  // Estados para los modales
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showLocalDetailModal, setShowLocalDetailModal] = useState(false);
  const [selectedLocal, setSelectedLocal] = useState<Local | null>(null);

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
      console.error('[GestionarLocalesV7] Error cargando contadores:', error);
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
        console.error('[GestionarLocalesV7] Error cargando locales:', error);
        throw error;
      }

      console.log('[GestionarLocalesV7] Locales cargados:', data?.length || 0);
      
      if (reset) {
        setLocales(data || []);
        setPaginaActual(2);
      } else {
        setLocales(prev => [...prev, ...(data || [])]);
        setPaginaActual(currentPage + 1);
      }
      
      setTotalLocales(count || 0);
      setHasMore((data?.length || 0) === LOCALES_POR_PAGINA);
    } catch (error) {
      console.error('[GestionarLocalesV7] Error cargando locales:', error);
      Alert.alert('Error', 'No se pudieron cargar los locales');
    } finally {
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }, [busqueda, filtroPropietario, filtroTipo, filtroEstado, filtroEnriquecido, filtroDestacado]);

  useEffect(() => {
    console.log('[GestionarLocalesV7] Initial load');
    cargarContadores();
    cargarLocales(true, 1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!initialLoading) {
      console.log('[GestionarLocalesV7] Filters changed, reloading...');
      const timer = setTimeout(() => {
        cargarLocales(true, 1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [busqueda, filtroPropietario, filtroTipo, filtroEstado, filtroEnriquecido, filtroDestacado]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleEstadoLocal = useCallback(async (localId: string, activo: boolean) => {
    try {
      const { error } = await supabase
        .from('locales')
        .update({ activo: !activo })
        .eq('id', localId);

      if (error) throw error;

      setLocales(prevLocales =>
        prevLocales.map(local =>
          local.id === localId ? { ...local, activo: !activo } : local
        )
      );

      Alert.alert(
        '✅ Éxito',
        `Local ${!activo ? 'activado' : 'desactivado'} correctamente`
      );
      cargarContadores();
    } catch (error) {
      console.error('[GestionarLocalesV7] Error actualizando local:', error);
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
      console.error('[GestionarLocalesV7] Error actualizando destacado:', error);
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

      setLocales(prevLocales => prevLocales.filter(local => local.id !== localId));
      setTotalLocales(prev => prev - 1);

      Alert.alert('✅ Éxito', 'Local eliminado correctamente');
      cargarContadores();
    } catch (error) {
      console.error('[GestionarLocalesV7] Error eliminando local:', error);
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
              
              const batchSize = 100;
              for (let i = 0; i < idsArray.length; i += batchSize) {
                const batch = idsArray.slice(i, i + batchSize);
                const { error } = await supabase
                  .from('locales')
                  .delete()
                  .in('id', batch);

                if (error) throw error;
              }

              setLocales(prevLocales => 
                prevLocales.filter(local => !localesSeleccionados.has(local.id))
              );
              setTotalLocales(prev => prev - localesSeleccionados.size);

              Alert.alert('✅ Éxito', `Se eliminaron ${localesSeleccionados.size} locales correctamente`);
              setLocalesSeleccionados(new Set());
              setModoSeleccion(false);
              cargarContadores();
            } catch (error) {
              console.error('[GestionarLocalesV7] Error eliminando locales:', error);
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
      console.log('[GestionarLocalesV7] Loading more, page:', paginaActual);
      cargarLocales(false, paginaActual);
    }
  }, [hasMore, loadingMore, initialLoading, paginaActual, cargarLocales]);

  const handleViewLocalDetail = (local: Local) => {
    setSelectedLocal(local);
    setShowLocalDetailModal(true);
  };

  const LocalCard = React.memo(({ local }: { local: Local }) => {
    return (
      <TouchableOpacity
        style={styles.localCardV7}
        onPress={() => {
          if (modoSeleccion) {
            toggleSeleccionLocal(local.id);
          } else {
            handleViewLocalDetail(local);
          }
        }}
        onLongPress={() => {
          if (!modoSeleccion) {
            setModoSeleccion(true);
            toggleSeleccionLocal(local.id);
          }
        }}
        activeOpacity={0.7}
      >
        {modoSeleccion && (
          <View style={styles.checkboxContainerV7}>
            <View style={[
              styles.checkboxV7,
              localesSeleccionados.has(local.id) && styles.checkboxCheckedV7
            ]}>
              {localesSeleccionados.has(local.id) && (
                <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={18} color={colors.white} />
              )}
            </View>
          </View>
        )}

        <View style={styles.localCardImageContainer}>
          {local.imagen_url ? (
            <Image source={{ uri: local.imagen_url }} style={styles.localCardImage} />
          ) : (
            <View style={[styles.localCardImage, styles.imagePlaceholderV7]}>
              <IconSymbol ios_icon_name="photo" android_material_icon_name="image" size={48} color={colors.textSecondary} />
            </View>
          )}
          
          {/* Status badges overlay */}
          <View style={styles.statusOverlay}>
            {local.enriquecido && (
              <View style={styles.statusBadgeOverlay}>
                <IconSymbol ios_icon_name="checkmark.seal.fill" android_material_icon_name="verified" size={14} color={colors.white} />
              </View>
            )}
            {local.destacado && (
              <View style={[styles.statusBadgeOverlay, { backgroundColor: colors.badgeDestacado }]}>
                <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={14} color={colors.white} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.localCardContent}>
          <View style={styles.localCardHeader}>
            <Text style={styles.localCardTitle} numberOfLines={1}>
              {local.nombre}
            </Text>
            <View style={[
              styles.statusIndicator,
              local.activo ? styles.statusIndicatorActive : styles.statusIndicatorInactive
            ]} />
          </View>

          <Text style={styles.localCardSubtitle} numberOfLines={1}>
            {local.tipo} • {local.provincia}
          </Text>

          <Text style={styles.localCardAddress} numberOfLines={2}>
            {local.direccion}
          </Text>

          {local.propietario ? (
            <View style={styles.ownerBadge}>
              <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={12} color={colors.primary} />
              <Text style={styles.ownerBadgeText} numberOfLines={1}>
                {local.propietario.nombre || local.propietario.email}
              </Text>
            </View>
          ) : (
            <View style={[styles.ownerBadge, styles.noOwnerBadge]}>
              <IconSymbol ios_icon_name="person.crop.circle.badge.xmark" android_material_icon_name="person_off" size={12} color={colors.textSecondary} />
              <Text style={[styles.ownerBadgeText, { color: colors.textSecondary }]}>
                Sin propietario
              </Text>
            </View>
          )}
        </View>

        {!modoSeleccion && (
          <View style={styles.localCardActions}>
            <TouchableOpacity
              style={styles.actionButtonV7}
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/editar/local?id=${local.id}` as any);
              }}
            >
              <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={18} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButtonV7, { backgroundColor: local.activo ? '#FEE2E2' : '#D1FAE5' }]}
              onPress={(e) => {
                e.stopPropagation();
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
            >
              <IconSymbol 
                ios_icon_name={local.activo ? 'eye.slash' : 'eye'} 
                android_material_icon_name={local.activo ? 'visibility_off' : 'visibility'} 
                size={18} 
                color={local.activo ? '#EF4444' : '#10B981'} 
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButtonV7, { backgroundColor: '#FEE2E2' }]}
              onPress={(e) => {
                e.stopPropagation();
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
                );
              }}
            >
              <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  });

  const renderLocalCard = useCallback(({ item }: { item: Local }) => (
    <LocalCard 
      key={item.id}
      local={item} 
    />
  ), []);

  const renderHeader = useMemo(() => (
    <React.Fragment>
      {/* Modern Stats Grid */}
      <View style={styles.statsGridV7}>
        <View style={styles.statCardV7}>
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            style={styles.statCardGradient}
          >
            <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={28} color={colors.white} />
            <Text style={styles.statCardNumber}>{contadores.total}</Text>
            <Text style={styles.statCardLabel}>Total Locales</Text>
          </LinearGradient>
        </View>

        <View style={styles.statCardV7}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.statCardGradient}
          >
            <IconSymbol ios_icon_name="checkmark.seal.fill" android_material_icon_name="verified" size={28} color={colors.white} />
            <Text style={styles.statCardNumber}>{contadores.enriquecidos}</Text>
            <Text style={styles.statCardLabel}>Enriquecidos</Text>
          </LinearGradient>
        </View>

        <View style={styles.statCardV7}>
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            style={styles.statCardGradient}
          >
            <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={28} color={colors.white} />
            <Text style={styles.statCardNumber}>{contadores.noEnriquecidos}</Text>
            <Text style={styles.statCardLabel}>Sin Enriquecer</Text>
          </LinearGradient>
        </View>

        <View style={styles.statCardV7}>
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            style={styles.statCardGradient}
          >
            <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={28} color={colors.white} />
            <Text style={styles.statCardNumber}>{contadores.conPropietario}</Text>
            <Text style={styles.statCardLabel}>Con Propietario</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Modern Search Bar */}
      <View style={styles.searchContainerV7}>
        <View style={styles.searchInputWrapper}>
          <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInputV7}
            placeholder="Buscar locales por nombre o dirección..."
            placeholderTextColor={colors.textSecondary}
            value={busqueda}
            onChangeText={setBusqueda}
          />
          {busqueda !== '' && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Modern Action Bar */}
      <View style={styles.actionBarV7}>
        <TouchableOpacity
          style={[styles.actionBarButton, hayFiltrosActivos() && styles.actionBarButtonActive]}
          onPress={() => setShowFiltersModal(true)}
        >
          <IconSymbol ios_icon_name="line.3.horizontal.decrease.circle" android_material_icon_name="filter_list" size={20} color={hayFiltrosActivos() ? colors.white : colors.text} />
          <Text style={[styles.actionBarButtonText, hayFiltrosActivos() && styles.actionBarButtonTextActive]}>
            Filtros {hayFiltrosActivos() && `(${Object.values({filtroPropietario, filtroTipo, filtroEstado, filtroEnriquecido, filtroDestacado}).filter(f => f !== 'todos').length})`}
          </Text>
        </TouchableOpacity>

        {hayFiltrosActivos() && (
          <TouchableOpacity
            style={styles.clearFiltersButtonV7}
            onPress={limpiarFiltros}
          >
            <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={16} color={colors.textSecondary} />
            <Text style={styles.clearFiltersTextV7}>Limpiar</Text>
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }} />

        {modoSeleccion ? (
          <React.Fragment>
            <TouchableOpacity
              style={styles.actionBarButton}
              onPress={seleccionarTodos}
            >
              <IconSymbol 
                ios_icon_name={localesSeleccionados.size === locales.length ? 'checkmark.square.fill' : 'square'} 
                android_material_icon_name={localesSeleccionados.size === locales.length ? 'check_box' : 'check_box_outline_blank'} 
                size={20} 
                color={colors.text} 
              />
              <Text style={styles.actionBarButtonText}>
                {localesSeleccionados.size === locales.length ? 'Deseleccionar' : 'Todos'}
              </Text>
            </TouchableOpacity>
            
            {localesSeleccionados.size > 0 && (
              <TouchableOpacity
                style={[styles.actionBarButton, { backgroundColor: '#EF4444' }]}
                onPress={eliminarSeleccionados}
              >
                <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={20} color={colors.white} />
                <Text style={[styles.actionBarButtonText, { color: colors.white }]}>
                  Eliminar ({localesSeleccionados.size})
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.actionBarButton}
              onPress={() => {
                setModoSeleccion(false);
                setLocalesSeleccionados(new Set());
              }}
            >
              <Text style={styles.actionBarButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </React.Fragment>
        ) : (
          <TouchableOpacity
            style={[styles.actionBarButton, { backgroundColor: colors.primary }]}
            onPress={() => setModoSeleccion(true)}
          >
            <IconSymbol ios_icon_name="checkmark.circle" android_material_icon_name="check_circle" size={20} color={colors.white} />
            <Text style={[styles.actionBarButtonText, { color: colors.white }]}>Seleccionar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results Indicator */}
      <View style={styles.resultsIndicatorV7}>
        <Text style={styles.resultsTextV7}>
          Mostrando {locales.length} de {totalLocales} locales
        </Text>
      </View>
    </React.Fragment>
  ), [contadores, busqueda, hayFiltrosActivos, modoSeleccion, localesSeleccionados, locales.length, totalLocales, seleccionarTodos, eliminarSeleccionados, limpiarFiltros, filtroPropietario, filtroTipo, filtroEstado, filtroEnriquecido, filtroDestacado]);

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
    <View style={styles.emptyStateV7}>
      <IconSymbol ios_icon_name="building.2" android_material_icon_name="store" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyTextV7}>No se encontraron locales</Text>
      <Text style={styles.emptySubtextV7}>
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
        style={styles.headerV7}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.backButtonV7} onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={28} color={colors.headerText} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitleV7}>Gestión de Locales</Text>
            <Text style={styles.headerSubtitleV7}>Versión 7.0 • Rediseño Completo</Text>
          </View>
          <TouchableOpacity
            style={styles.addButtonV7}
            onPress={() => router.push('/crear/local' as any)}
          >
            <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={32} color={colors.headerText} />
          </TouchableOpacity>
        </View>
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
        contentContainerStyle={styles.listContentV7}
        showsVerticalScrollIndicator={false}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
      />

      {/* Filters Modal - COMPLETELY REDESIGNED */}
      <Modal
        visible={showFiltersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <View style={styles.fullScreenModal}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.fullScreenModalHeader}
          >
            <TouchableOpacity
              style={styles.fullScreenModalClose}
              onPress={() => setShowFiltersModal(false)}
            >
              <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="close" size={32} color={colors.headerText} />
            </TouchableOpacity>
            <View style={styles.fullScreenModalHeaderContent}>
              <Text style={styles.fullScreenModalTitle}>Filtros Avanzados</Text>
              <Text style={styles.fullScreenModalSubtitle}>Personaliza la búsqueda de locales</Text>
            </View>
          </LinearGradient>

          <ScrollView style={styles.fullScreenModalContent} contentContainerStyle={styles.fullScreenModalContentContainer}>
            {/* Filtro Enriquecido */}
            <View style={styles.filterSectionV7}>
              <View style={styles.filterSectionHeaderV7}>
                <IconSymbol ios_icon_name="checkmark.seal.fill" android_material_icon_name="verified" size={24} color={colors.primary} />
                <Text style={styles.filterSectionTitleV7}>Enriquecimiento</Text>
              </View>
              <View style={styles.filterOptionsV7}>
                {['todos', 'enriquecidos', 'no-enriquecidos'].map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.filterOptionV7,
                      filtroEnriquecido === option && styles.filterOptionActiveV7
                    ]}
                    onPress={() => setFiltroEnriquecido(option)}
                  >
                    <Text style={[
                      styles.filterOptionTextV7,
                      filtroEnriquecido === option && styles.filterOptionTextActiveV7
                    ]}>
                      {option === 'todos' ? 'Todos' : option === 'enriquecidos' ? 'Enriquecidos' : 'Sin Enriquecer'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Filtro Estado */}
            <View style={styles.filterSectionV7}>
              <View style={styles.filterSectionHeaderV7}>
                <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={24} color="#10B981" />
                <Text style={styles.filterSectionTitleV7}>Estado</Text>
              </View>
              <View style={styles.filterOptionsV7}>
                {['todos', 'activos', 'inactivos'].map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.filterOptionV7,
                      filtroEstado === option && styles.filterOptionActiveV7
                    ]}
                    onPress={() => setFiltroEstado(option)}
                  >
                    <Text style={[
                      styles.filterOptionTextV7,
                      filtroEstado === option && styles.filterOptionTextActiveV7
                    ]}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Filtro Propietario */}
            <View style={styles.filterSectionV7}>
              <View style={styles.filterSectionHeaderV7}>
                <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={24} color="#8B5CF6" />
                <Text style={styles.filterSectionTitleV7}>Propietario</Text>
              </View>
              <View style={styles.filterOptionsV7}>
                {['todos', 'con-dueno', 'sin-dueno'].map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.filterOptionV7,
                      filtroPropietario === option && styles.filterOptionActiveV7
                    ]}
                    onPress={() => setFiltroPropietario(option)}
                  >
                    <Text style={[
                      styles.filterOptionTextV7,
                      filtroPropietario === option && styles.filterOptionTextActiveV7
                    ]}>
                      {option === 'todos' ? 'Todos' : option === 'con-dueno' ? 'Con Dueño' : 'Sin Dueño'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Filtro Tipo */}
            <View style={styles.filterSectionV7}>
              <View style={styles.filterSectionHeaderV7}>
                <IconSymbol ios_icon_name="list.bullet" android_material_icon_name="list" size={24} color="#F59E0B" />
                <Text style={styles.filterSectionTitleV7}>Tipo de Local</Text>
              </View>
              <View style={styles.filterOptionsV7}>
                {['todos', 'bar', 'restaurante', 'cafe', 'pub', 'discoteca'].map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.filterOptionV7,
                      filtroTipo === option && styles.filterOptionActiveV7
                    ]}
                    onPress={() => setFiltroTipo(option)}
                  >
                    <Text style={[
                      styles.filterOptionTextV7,
                      filtroTipo === option && styles.filterOptionTextActiveV7
                    ]}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Filtro Destacado */}
            <View style={styles.filterSectionV7}>
              <View style={styles.filterSectionHeaderV7}>
                <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={24} color={colors.badgeDestacado} />
                <Text style={styles.filterSectionTitleV7}>Destacado</Text>
              </View>
              <View style={styles.filterOptionsV7}>
                {['todos', 'destacados', 'no-destacados'].map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.filterOptionV7,
                      filtroDestacado === option && styles.filterOptionActiveV7
                    ]}
                    onPress={() => setFiltroDestacado(option)}
                  >
                    <Text style={[
                      styles.filterOptionTextV7,
                      filtroDestacado === option && styles.filterOptionTextActiveV7
                    ]}>
                      {option === 'todos' ? 'Todos' : option === 'destacados' ? 'Destacados' : 'No Destacados'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.fullScreenModalFooter}>
            <TouchableOpacity
              style={styles.fullScreenModalButton}
              onPress={() => setShowFiltersModal(false)}
            >
              <LinearGradient
                colors={[colors.primary, colors.primary + 'DD']}
                style={styles.fullScreenModalButtonGradient}
              >
                <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.white} />
                <Text style={styles.fullScreenModalButtonText}>Aplicar Filtros</Text>
              </LinearGradient>
            </TouchableOpacity>
            {hayFiltrosActivos() && (
              <TouchableOpacity
                style={styles.clearAllFiltersButtonV7}
                onPress={limpiarFiltros}
              >
                <Text style={styles.clearAllFiltersTextV7}>Limpiar Todos los Filtros</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Local Detail Modal - COMPLETELY REDESIGNED */}
      <Modal
        visible={showLocalDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocalDetailModal(false)}
      >
        <View style={styles.fullScreenModal}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.fullScreenModalHeader}
          >
            <TouchableOpacity
              style={styles.fullScreenModalClose}
              onPress={() => setShowLocalDetailModal(false)}
            >
              <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="close" size={32} color={colors.headerText} />
            </TouchableOpacity>
            <View style={styles.fullScreenModalHeaderContent}>
              <Text style={styles.fullScreenModalTitle}>Detalles del Local</Text>
              <Text style={styles.fullScreenModalSubtitle}>Información completa y gestión</Text>
            </View>
          </LinearGradient>

          {selectedLocal && (
            <ScrollView style={styles.fullScreenModalContent} contentContainerStyle={styles.fullScreenModalContentContainer}>
              {selectedLocal.imagen_url && (
                <Image 
                  source={{ uri: selectedLocal.imagen_url }} 
                  style={styles.detailImageV7}
                />
              )}

              <View style={styles.detailSectionV7}>
                <Text style={styles.detailTitleV7}>{selectedLocal.nombre}</Text>
                <Text style={styles.detailSubtitleV7}>{selectedLocal.tipo} • {selectedLocal.provincia}</Text>
              </View>

              <View style={styles.detailSectionV7}>
                <View style={styles.detailSectionHeaderV7}>
                  <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={24} color={colors.primary} />
                  <Text style={styles.detailSectionTitleV7}>Información</Text>
                </View>
                <View style={styles.detailRowV7}>
                  <View style={styles.detailRowIconV7}>
                    <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={24} color={colors.primary} />
                  </View>
                  <Text style={styles.detailRowTextV7}>{selectedLocal.direccion}</Text>
                </View>
                <View style={styles.detailRowV7}>
                  <View style={styles.detailRowIconV7}>
                    <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={24} color={colors.primary} />
                  </View>
                  <Text style={styles.detailRowTextV7}>
                    Creado: {new Date(selectedLocal.fecha_creacion).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSectionV7}>
                <View style={styles.detailSectionHeaderV7}>
                  <IconSymbol ios_icon_name="checkmark.seal.fill" android_material_icon_name="verified" size={24} color="#10B981" />
                  <Text style={styles.detailSectionTitleV7}>Estado</Text>
                </View>
                <View style={styles.detailStatusGridV7}>
                  <View style={[styles.detailStatusCardV7, selectedLocal.activo && styles.detailStatusCardActiveV7]}>
                    <IconSymbol 
                      ios_icon_name="eye.fill" 
                      android_material_icon_name="visibility" 
                      size={28} 
                      color={selectedLocal.activo ? '#10B981' : colors.textSecondary} 
                    />
                    <Text style={styles.detailStatusTextV7}>{selectedLocal.activo ? 'Activo' : 'Inactivo'}</Text>
                  </View>
                  <View style={[styles.detailStatusCardV7, selectedLocal.enriquecido && styles.detailStatusCardActiveV7]}>
                    <IconSymbol 
                      ios_icon_name="checkmark.seal.fill" 
                      android_material_icon_name="verified" 
                      size={28} 
                      color={selectedLocal.enriquecido ? colors.primary : colors.textSecondary} 
                    />
                    <Text style={styles.detailStatusTextV7}>{selectedLocal.enriquecido ? 'Enriquecido' : 'Sin Enriquecer'}</Text>
                  </View>
                  <View style={[styles.detailStatusCardV7, selectedLocal.destacado && styles.detailStatusCardActiveV7]}>
                    <IconSymbol 
                      ios_icon_name="star.fill" 
                      android_material_icon_name="star" 
                      size={28} 
                      color={selectedLocal.destacado ? colors.badgeDestacado : colors.textSecondary} 
                    />
                    <Text style={styles.detailStatusTextV7}>{selectedLocal.destacado ? 'Destacado' : 'Normal'}</Text>
                  </View>
                </View>
              </View>

              {selectedLocal.propietario && (
                <View style={styles.detailSectionV7}>
                  <View style={styles.detailSectionHeaderV7}>
                    <IconSymbol ios_icon_name="person.circle.fill" android_material_icon_name="account_circle" size={24} color="#8B5CF6" />
                    <Text style={styles.detailSectionTitleV7}>Propietario</Text>
                  </View>
                  <View style={styles.ownerCardV7}>
                    <View style={styles.ownerCardIconV7}>
                      <IconSymbol ios_icon_name="person.circle.fill" android_material_icon_name="account_circle" size={48} color={colors.primary} />
                    </View>
                    <View style={styles.ownerCardInfoV7}>
                      <Text style={styles.ownerCardNameV7}>{selectedLocal.propietario.nombre}</Text>
                      <Text style={styles.ownerCardEmailV7}>{selectedLocal.propietario.email}</Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          <View style={styles.fullScreenModalFooter}>
            <TouchableOpacity
              style={styles.fullScreenModalButton}
              onPress={() => {
                setShowLocalDetailModal(false);
                if (selectedLocal) {
                  router.push(`/editar/local?id=${selectedLocal.id}` as any);
                }
              }}
            >
              <LinearGradient
                colors={[colors.primary, colors.primary + 'DD']}
                style={styles.fullScreenModalButtonGradient}
              >
                <IconSymbol ios_icon_name="pencil.circle.fill" android_material_icon_name="edit" size={24} color={colors.white} />
                <Text style={styles.fullScreenModalButtonText}>Editar Local</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
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
  headerV7: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButtonV7: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitleV7: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitleV7: {
    fontSize: 12,
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 2,
  },
  addButtonV7: {
    padding: 4,
  },
  listContentV7: {
    padding: 16,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  statsGridV7: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCardV7: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 56) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    ...commonStyles.shadow,
  },
  statCardGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statCardNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.white,
    marginTop: 8,
  },
  statCardLabel: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.9,
    marginTop: 4,
    textAlign: 'center',
  },
  searchContainerV7: {
    marginBottom: 16,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    ...commonStyles.shadow,
  },
  searchInputV7: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  actionBarV7: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  actionBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cardBackground,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    ...commonStyles.shadow,
  },
  actionBarButtonActive: {
    backgroundColor: colors.primary,
  },
  actionBarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  actionBarButtonTextActive: {
    color: colors.white,
  },
  clearFiltersButtonV7: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  clearFiltersTextV7: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  resultsIndicatorV7: {
    marginBottom: 16,
  },
  resultsTextV7: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  localCardV7: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    marginBottom: 16,
    marginHorizontal: 6,
    overflow: 'hidden',
    ...commonStyles.shadow,
  },
  checkboxContainerV7: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
  },
  checkboxV7: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCheckedV7: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  localCardImageContainer: {
    position: 'relative',
  },
  localCardImage: {
    width: '100%',
    height: 160,
  },
  imagePlaceholderV7: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 6,
  },
  statusBadgeOverlay: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localCardContent: {
    padding: 12,
  },
  localCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  localCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  statusIndicatorActive: {
    backgroundColor: '#10B981',
  },
  statusIndicatorInactive: {
    backgroundColor: '#EF4444',
  },
  localCardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  localCardAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 16,
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary + '15',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  noOwnerBadge: {
    backgroundColor: colors.cardBorder,
  },
  ownerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  localCardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    padding: 8,
    gap: 8,
  },
  actionButtonV7: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primary + '15',
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
  emptyStateV7: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTextV7: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtextV7: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  // FULL SCREEN MODAL STYLES
  fullScreenModal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fullScreenModalHeader: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullScreenModalClose: {
    padding: 4,
    marginRight: 12,
  },
  fullScreenModalHeaderContent: {
    flex: 1,
  },
  fullScreenModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  fullScreenModalSubtitle: {
    fontSize: 14,
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 4,
  },
  fullScreenModalContent: {
    flex: 1,
  },
  fullScreenModalContentContainer: {
    paddingBottom: 120,
  },
  fullScreenModalFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.cardBackground,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    ...commonStyles.shadow,
  },
  fullScreenModalButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  fullScreenModalButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
  },
  fullScreenModalButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.white,
  },
  filterSectionV7: {
    marginBottom: 24,
  },
  filterSectionHeaderV7: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterSectionTitleV7: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  filterOptionsV7: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
  },
  filterOptionV7: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  filterOptionActiveV7: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterOptionTextV7: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  filterOptionTextActiveV7: {
    color: colors.white,
  },
  clearAllFiltersButtonV7: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  clearAllFiltersTextV7: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  detailImageV7: {
    width: '100%',
    height: 300,
  },
  detailSectionV7: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  detailTitleV7: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  detailSubtitleV7: {
    fontSize: 17,
    color: colors.textSecondary,
  },
  detailSectionHeaderV7: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  detailSectionTitleV7: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  detailRowV7: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  detailRowIconV7: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailRowTextV7: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
    paddingTop: 8,
  },
  detailStatusGridV7: {
    flexDirection: 'row',
    gap: 12,
  },
  detailStatusCardV7: {
    flex: 1,
    alignItems: 'center',
    padding: 18,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  detailStatusCardActiveV7: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  detailStatusTextV7: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: 10,
    textAlign: 'center',
  },
  ownerCardV7: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  ownerCardIconV7: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerCardInfoV7: {
    flex: 1,
  },
  ownerCardNameV7: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  ownerCardEmailV7: {
    fontSize: 15,
    color: colors.textSecondary,
  },
});
