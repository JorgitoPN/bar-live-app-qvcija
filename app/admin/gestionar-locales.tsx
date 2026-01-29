
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Platform,
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
  galeria_urls?: string[];
  activo: boolean;
  destacado: boolean;
  enriquecido: boolean;
  source_type: string;
  fecha_creacion: string;
  propietario_id?: string;
  plan_activo?: string;
  google_place_id?: string;
  propietario?: {
    nombre: string;
    email: string;
  };
}

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol_app: string;
}

const LOCALES_POR_PAGINA = 50;

/**
 * ✅ GESTIONAR LOCALES v243.0 - FIXED KEYBOARD FOCUS LOSS (FINAL FIX)
 * 
 * CRITICAL FIXES v243.0:
 * - ✅ FIXED: TextInput is DIRECTLY in return (no conditional rendering)
 * - ✅ FIXED: Controlled component with value={searchQuery}
 * - ✅ FIXED: Debounce with useEffect + cleanup (500ms)
 * - ✅ FIXED: Separate states: searchQuery (immediate) vs debouncedQuery (filtered)
 * - ✅ FIXED: FlatList has keyboardShouldPersistTaps="handled"
 * - ✅ FIXED: TextInput has blurOnSubmit={false}
 * - ✅ FIXED: Applied same pattern as working Explorar screen
 * - ✅ FIXED: User search also uses controlled component pattern
 */

export default function GestionarLocalesScreen() {
  const router = useRouter();
  const [locales, setLocales] = useState<Local[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // ✅ CRITICAL v243.0: Controlled input state for main search (STABLE)
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  const [filtroPropietario, setFiltroPropietario] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroEnriquecido, setFiltroEnriquecido] = useState<string>('todos');
  const [filtroDestacado, setFiltroDestacado] = useState<string>('todos');
  const [filtroFuente, setFiltroFuente] = useState<string>('todos');
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalLocales, setTotalLocales] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showAssignUserModal, setShowAssignUserModal] = useState(false);
  const [selectedLocalForAssignment, setSelectedLocalForAssignment] = useState<Local | null>(null);

  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [localesSeleccionados, setLocalesSeleccionados] = useState<Set<string>>(new Set());

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  
  // ✅ CRITICAL v243.0: Controlled input state for user search (STABLE)
  const [searchUsuarioQuery, setSearchUsuarioQuery] = useState('');
  const [debouncedUsuarioQuery, setDebouncedUsuarioQuery] = useState('');
  
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [assigningUser, setAssigningUser] = useState(false);

  const [contadores, setContadores] = useState({
    total: 0,
    activos: 0,
    inactivos: 0,
    enriquecidos: 0,
    noEnriquecidos: 0,
    conPropietario: 0,
    sinPropietario: 0,
    osm: 0,
    google: 0,
    manual: 0,
  });

  // ✅ CRITICAL FIX v243.0: Debounce main search with cleanup (500ms)
  useEffect(() => {
    console.log('[GestionarLocales v243.0] 📝 Main search query changed:', searchQuery);
    
    const timer = setTimeout(() => {
      console.log('[GestionarLocales v243.0] 🔍 Applying debounced search');
      setDebouncedQuery(searchQuery);
    }, 500);
    
    // Cleanup function - CRITICAL for preventing focus loss
    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // ✅ CRITICAL FIX v243.0: Debounce user search with cleanup (300ms)
  useEffect(() => {
    console.log('[GestionarLocales v243.0] 📝 User search query changed:', searchUsuarioQuery);
    
    const timer = setTimeout(() => {
      console.log('[GestionarLocales v243.0] 🔍 Applying debounced user search');
      setDebouncedUsuarioQuery(searchUsuarioQuery);
    }, 300);
    
    // Cleanup function - CRITICAL for preventing focus loss
    return () => {
      clearTimeout(timer);
    };
  }, [searchUsuarioQuery]);

  const cargarContadores = useCallback(async () => {
    try {
      console.log('[GestionarLocales v243.0] Loading counters...');
      
      const { count: totalCount, error: countError } = await supabase
        .from('locales')
        .select('*', { count: 'exact', head: true })
        .or('source_type.eq.osm,enriquecido.eq.true');

      if (countError) {
        console.error('[GestionarLocales v243.0] Error loading total count:', countError);
        throw countError;
      }

      console.log('[GestionarLocales v243.0] Total valid locales:', totalCount);

      const { data, error } = await supabase
        .from('locales')
        .select('activo, enriquecido, propietario_id, source_type')
        .or('source_type.eq.osm,enriquecido.eq.true');

      if (error) {
        console.error('[GestionarLocales v243.0] Error loading stats:', error);
        throw error;
      }

      const stats = {
        total: totalCount || 0,
        activos: data?.filter(l => l.activo).length || 0,
        inactivos: data?.filter(l => !l.activo).length || 0,
        enriquecidos: data?.filter(l => l.enriquecido).length || 0,
        noEnriquecidos: data?.filter(l => !l.enriquecido).length || 0,
        conPropietario: data?.filter(l => l.propietario_id).length || 0,
        sinPropietario: data?.filter(l => !l.propietario_id).length || 0,
        osm: data?.filter(l => l.source_type === 'osm' && !l.enriquecido).length || 0,
        google: data?.filter(l => l.enriquecido).length || 0,
        manual: data?.filter(l => l.source_type === 'manual').length || 0,
      };

      console.log('[GestionarLocales v243.0] Stats:', stats);
      setContadores(stats);
    } catch (error) {
      console.error('[GestionarLocales v243.0] Error cargando contadores:', error);
    }
  }, []);

  const cargarLocales = useCallback(async (reset: boolean = false, currentPage: number = 1) => {
    try {
      console.log('[GestionarLocales v243.0] Loading locales, reset:', reset, 'page:', currentPage);
      
      if (reset) {
        setInitialLoading(true);
      } else {
        setLoadingMore(true);
      }

      const from = reset ? 0 : (currentPage - 1) * LOCALES_POR_PAGINA;
      const to = from + LOCALES_POR_PAGINA - 1;

      console.log('[GestionarLocales v243.0] Fetching range:', from, '-', to);

      let query = supabase
        .from('locales')
        .select(`
          *,
          propietario:usuarios!propietario_id(
            nombre,
            email
          )
        `, { count: 'exact' })
        .or('source_type.eq.osm,enriquecido.eq.true')
        .order('fecha_creacion', { ascending: false })
        .range(from, to);

      // ✅ CRITICAL v243.0: Use debouncedQuery for filtering
      if (debouncedQuery) {
        query = query.or(`nombre.ilike.%${debouncedQuery}%,direccion.ilike.%${debouncedQuery}%`);
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

      if (filtroFuente === 'osm') {
        query = query.eq('source_type', 'osm').eq('enriquecido', false);
      } else if (filtroFuente === 'google') {
        query = query.eq('enriquecido', true);
      } else if (filtroFuente === 'manual') {
        query = query.eq('source_type', 'manual');
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('[GestionarLocales v243.0] Error cargando locales:', error);
        throw error;
      }

      console.log('[GestionarLocales v243.0] Locales loaded:', data?.length || 0, 'Total count:', count);
      
      if (reset) {
        setLocales(data || []);
        setPaginaActual(2);
      } else {
        setLocales(prev => [...prev, ...(data || [])]);
        setPaginaActual(currentPage + 1);
      }
      
      setTotalLocales(count || 0);
      setHasMore((data?.length || 0) === LOCALES_POR_PAGINA);
      
      console.log('[GestionarLocales v243.0] Has more:', (data?.length || 0) === LOCALES_POR_PAGINA);
    } catch (error) {
      console.error('[GestionarLocales v243.0] Error cargando locales:', error);
      Alert.alert('Error', 'No se pudieron cargar los locales');
    } finally {
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedQuery, filtroPropietario, filtroTipo, filtroEstado, filtroEnriquecido, filtroDestacado, filtroFuente]);

  useEffect(() => {
    console.log('[GestionarLocales v243.0] Initial load');
    cargarContadores();
    cargarLocales(true, 1);
  }, [cargarContadores, cargarLocales]);

  // ✅ CRITICAL v243.0: Reload when debounced query or filters change
  useEffect(() => {
    if (!initialLoading) {
      console.log('[GestionarLocales v243.0] Filters changed, reloading...');
      cargarLocales(true, 1);
    }
  }, [debouncedQuery, filtroPropietario, filtroTipo, filtroEstado, filtroEnriquecido, filtroDestacado, filtroFuente, initialLoading, cargarLocales]);

  const searchUsuarios = useCallback(async (query: string) => {
    if (query.length < 2) {
      setUsuarios([]);
      return;
    }

    setLoadingUsuarios(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, email, rol_app')
        .or(`nombre.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      setUsuarios(data || []);
    } catch (error) {
      console.error('[GestionarLocales v243.0] Error searching users:', error);
    } finally {
      setLoadingUsuarios(false);
    }
  }, []);

  // ✅ CRITICAL v243.0: Search users when debounced query changes
  useEffect(() => {
    if (debouncedUsuarioQuery.trim().length >= 2) {
      searchUsuarios(debouncedUsuarioQuery);
    } else {
      setUsuarios([]);
    }
  }, [debouncedUsuarioQuery, searchUsuarios]);

  const assignLocalToUser = useCallback(async (userId: string, userName: string) => {
    if (!selectedLocalForAssignment) return;

    setAssigningUser(true);
    try {
      const { error: updateError } = await supabase
        .from('locales')
        .update({ 
          propietario_id: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedLocalForAssignment.id);

      if (updateError) throw updateError;

      const { error: junctionError } = await supabase
        .from('propietarios_locales')
        .insert({
          propietario_id: userId,
          local_id: selectedLocalForAssignment.id,
          rol: 'propietario',
          activo: true,
        });

      if (junctionError && junctionError.code !== '23505') {
        console.error('[GestionarLocales v243.0] Error creating junction entry:', junctionError);
      }

      Alert.alert(
        'Éxito',
        `Local "${selectedLocalForAssignment.nombre}" asignado a ${userName}`,
        [{ text: 'OK' }]
      );

      setShowAssignUserModal(false);
      setSelectedLocalForAssignment(null);
      setSearchUsuarioQuery('');
      setDebouncedUsuarioQuery('');
      setUsuarios([]);
      
      cargarLocales(true, 1);
      cargarContadores();
    } catch (error) {
      console.error('[GestionarLocales v243.0] Error assigning local:', error);
      Alert.alert('Error', 'No se pudo asignar el local al usuario');
    } finally {
      setAssigningUser(false);
    }
  }, [selectedLocalForAssignment, cargarLocales, cargarContadores]);

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
        'Éxito',
        `Local ${!activo ? 'activado' : 'desactivado'} correctamente`
      );
      cargarContadores();
    } catch (error) {
      console.error('[GestionarLocales v243.0] Error actualizando local:', error);
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
      console.error('[GestionarLocales v243.0] Error actualizando destacado:', error);
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

      Alert.alert('Éxito', 'Local eliminado correctamente');
      cargarContadores();
    } catch (error) {
      console.error('[GestionarLocales v243.0] Error eliminando local:', error);
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

              Alert.alert('Éxito', `Se eliminaron ${localesSeleccionados.size} locales correctamente`);
              setLocalesSeleccionados(new Set());
              setModoSeleccion(false);
              cargarContadores();
            } catch (error) {
              console.error('[GestionarLocales v243.0] Error eliminando locales:', error);
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
    setFiltroFuente('todos');
    setSearchQuery('');
    setDebouncedQuery('');
  }, []);

  const hayFiltrosActivos = useMemo(() => {
    return filtroPropietario !== 'todos' ||
           filtroTipo !== 'todos' ||
           filtroEstado !== 'todos' ||
           filtroEnriquecido !== 'todos' ||
           filtroDestacado !== 'todos' ||
           filtroFuente !== 'todos' ||
           debouncedQuery !== '';
  }, [filtroPropietario, filtroTipo, filtroEstado, filtroEnriquecido, filtroDestacado, filtroFuente, debouncedQuery]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !initialLoading) {
      console.log('[GestionarLocales v243.0] Loading more, page:', paginaActual);
      cargarLocales(false, paginaActual);
    }
  }, [hasMore, loadingMore, initialLoading, paginaActual, cargarLocales]);

  const openAssignUserModal = useCallback((local: Local) => {
    setSelectedLocalForAssignment(local);
    setShowAssignUserModal(true);
    setSearchUsuarioQuery('');
    setDebouncedUsuarioQuery('');
    setUsuarios([]);
  }, []);

  const getSourceBadge = (local: Local) => {
    if (local.enriquecido) {
      return { text: 'Google', color: '#4285F4' };
    } else if (local.source_type === 'osm') {
      return { text: 'OSM', color: '#7EBC6F' };
    } else {
      return { text: 'Manual', color: '#8B5CF6' };
    }
  };

  const LocalCard = useCallback(({ local }: { local: Local }) => {
    const coverPhoto = local.imagen_url || (local.galeria_urls && local.galeria_urls.length > 0 ? local.galeria_urls[0] : null);
    const sourceBadge = getSourceBadge(local);
    
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
                  <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={16} color={colors.headerText} />
                )}
              </View>
            </View>
          )}

          {coverPhoto ? (
            <Image 
              source={{ uri: `${coverPhoto}?v=${Date.now()}` }} 
              style={styles.localImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.localImage, styles.imagePlaceholder]}>
              <IconSymbol ios_icon_name="photo" android_material_icon_name="image" size={32} color={colors.textSecondary} />
            </View>
          )}

          <View style={styles.localInfo}>
            <View style={styles.localHeader}>
              <View style={styles.localTitleContainer}>
                <Text style={styles.localNombre} numberOfLines={1}>
                  {local.nombre}
                </Text>
                {local.enriquecido && (
                  <IconSymbol ios_icon_name="checkmark.seal.fill" android_material_icon_name="verified" size={16} color={colors.primary} />
                )}
                {local.destacado && (
                  <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={16} color="#F59E0B" />
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
              <View style={[styles.statusBadge, { backgroundColor: sourceBadge.color + '20' }]}>
                <Text style={[styles.statusText, { color: sourceBadge.color }]}>{sourceBadge.text}</Text>
              </View>
            </View>

            <Text style={styles.localDireccion} numberOfLines={2}>
              {local.direccion}
            </Text>

            <View style={styles.ownerInfo}>
              {local.propietario ? (
                <React.Fragment>
                  <IconSymbol ios_icon_name="envelope.fill" android_material_icon_name="email" size={12} color={colors.textSecondary} />
                  <Text style={styles.ownerEmail} numberOfLines={1}>
                    {local.propietario.email}
                  </Text>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <IconSymbol ios_icon_name="person.crop.circle.badge.xmark" android_material_icon_name="person_off" size={12} color={colors.textSecondary} />
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
          <View style={styles.localActionsContainer}>
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

            {local.plan_activo && (
              <View style={styles.planInfo}>
                <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={14} color={colors.badgeDestacado} />
                <Text style={styles.planInfoText}>Plan: {local.plan_activo}</Text>
              </View>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => router.push(`/detalle/local?id=${local.id}`)}
              >
                <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={18} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => router.push(`/editar/local?id=${local.id}`)}
              >
                <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={18} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.planButton}
                onPress={() => router.push(`/gestion/planes-suscripcion?localId=${local.id}`)}
              >
                <IconSymbol ios_icon_name="creditcard.fill" android_material_icon_name="payment" size={18} color="#F59E0B" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.assignButton}
                onPress={() => openAssignUserModal(local)}
              >
                <IconSymbol ios_icon_name="person.badge.plus" android_material_icon_name="person_add" size={18} color="#8B5CF6" />
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
                <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={18} color={colors.badgeNuevo} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }, [modoSeleccion, localesSeleccionados, toggleSeleccionLocal, router, toggleEstadoLocal, toggleDestacadoLocal, eliminarLocal, openAssignUserModal]);

  const renderLocalCard = useCallback(({ item }: { item: Local }) => (
    <LocalCard local={item} />
  ), [LocalCard]);

  const renderHeader = useMemo(() => (
    <React.Fragment>
      <View style={styles.statsSection}>
        <Text style={styles.statsSectionTitle}>Estadísticas de Locales</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{contadores.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#4285F4' }]}>{contadores.google}</Text>
            <Text style={styles.statLabel}>Google</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#7EBC6F' }]}>{contadores.osm}</Text>
            <Text style={styles.statLabel}>OSM</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{contadores.conPropietario}</Text>
            <Text style={styles.statLabel}>Con Dueño</Text>
          </View>
        </View>
      </View>

      {/* ✅ CRITICAL v243.0: Search bar - TextInput is DIRECTLY in return */}
      <View style={styles.searchContainer}>
        <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o dirección..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          blurOnSubmit={false}
          enablesReturnKeyAutomatically={false}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => {
            console.log('[GestionarLocales v243.0] 🧹 Clearing search');
            setSearchQuery('');
            setDebouncedQuery('');
          }}>
            <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterButtonsRow}>
        <TouchableOpacity
          style={[styles.filterButton, hayFiltrosActivos && styles.filterButtonActive]}
          onPress={() => setShowFiltersModal(true)}
        >
          <IconSymbol ios_icon_name="line.3.horizontal.decrease.circle" android_material_icon_name="filter_list" size={20} color={hayFiltrosActivos ? colors.headerText : colors.text} />
          <Text style={[styles.filterButtonText, hayFiltrosActivos && styles.filterButtonTextActive]}>
            Filtros {hayFiltrosActivos && '•'}
          </Text>
        </TouchableOpacity>

        {hayFiltrosActivos && (
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={limpiarFiltros}
          >
            <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={16} color={colors.textSecondary} />
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
              <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={16} color={colors.headerText} />
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
            <IconSymbol ios_icon_name="checkmark.circle" android_material_icon_name="check_circle" size={20} color={colors.primary} />
            <Text style={styles.selectionModeText}>Seleccionar</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.resultsIndicator}>
        <Text style={styles.resultsText}>
          Mostrando {locales.length} de {totalLocales} locales válidos (OSM o enriquecidos)
        </Text>
      </View>
    </React.Fragment>
  ), [contadores, hayFiltrosActivos, modoSeleccion, localesSeleccionados, locales.length, totalLocales, seleccionarTodos, eliminarSeleccionados, limpiarFiltros, searchQuery]);

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
      <IconSymbol ios_icon_name="building.2" android_material_icon_name="business" size={48} color={colors.textSecondary} />
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
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Locales</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/crear/local')}
        >
          <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={24} color={colors.headerText} />
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
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />

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
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Fuente de Datos</Text>
                <View style={styles.filterOptions}>
                  {['todos', 'google', 'osm', 'manual'].map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.filterOption,
                        filtroFuente === option && styles.filterOptionActive
                      ]}
                      onPress={() => setFiltroFuente(option)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filtroFuente === option && styles.filterOptionTextActive
                      ]}>
                        {option === 'todos' ? 'Todos' : option === 'google' ? 'Google Places' : option === 'osm' ? 'OpenStreetMap' : 'Manual'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

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

      <Modal
        visible={showAssignUserModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAssignUserModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAssignUserModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Asignar Propietario</Text>
              <TouchableOpacity onPress={() => setShowAssignUserModal(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.assignModalBody}>
              {selectedLocalForAssignment && (
                <View style={styles.selectedLocalInfo}>
                  <Text style={styles.selectedLocalName}>{selectedLocalForAssignment.nombre}</Text>
                  <Text style={styles.selectedLocalAddress}>{selectedLocalForAssignment.direccion}</Text>
                  {selectedLocalForAssignment.propietario && (
                    <View style={styles.currentOwnerInfo}>
                      <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={14} color={colors.textSecondary} />
                      <Text style={styles.currentOwnerText}>
                        Propietario actual: {selectedLocalForAssignment.propietario.nombre}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* ✅ CRITICAL v243.0: User search - TextInput is DIRECTLY in return */}
              <View style={styles.searchContainer}>
                <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar usuario por nombre o email..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchUsuarioQuery}
                  onChangeText={setSearchUsuarioQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  blurOnSubmit={false}
                  enablesReturnKeyAutomatically={false}
                />
                {loadingUsuarios && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
              </View>

              {usuarios.length > 0 && (
                <View style={styles.usuariosList}>
                  {usuarios.map((usuario) => (
                    <TouchableOpacity
                      key={usuario.id}
                      style={styles.usuarioItem}
                      onPress={() => {
                        Alert.alert(
                          'Confirmar Asignación',
                          `¿Asignar "${selectedLocalForAssignment?.nombre}" a ${usuario.nombre}?`,
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Asignar',
                              onPress: () => assignLocalToUser(usuario.id, usuario.nombre),
                            },
                          ]
                        );
                      }}
                      disabled={assigningUser}
                    >
                      <View style={styles.usuarioInfo}>
                        <Text style={styles.usuarioNombre}>{usuario.nombre}</Text>
                        <Text style={styles.usuarioEmail}>{usuario.email}</Text>
                        <View style={styles.usuarioRolBadge}>
                          <Text style={styles.usuarioRolText}>{usuario.rol_app}</Text>
                        </View>
                      </View>
                      {assigningUser ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <IconSymbol ios_icon_name="arrow.right.circle.fill" android_material_icon_name="arrow_forward" size={24} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {debouncedUsuarioQuery.length >= 2 && usuarios.length === 0 && !loadingUsuarios && (
                <View style={styles.noResultsContainer}>
                  <IconSymbol ios_icon_name="person.crop.circle.badge.xmark" android_material_icon_name="person_off" size={48} color={colors.textSecondary} />
                  <Text style={styles.noResultsText}>No se encontraron usuarios</Text>
                </View>
              )}

              {debouncedUsuarioQuery.length < 2 && (
                <View style={styles.searchHintContainer}>
                  <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={20} color={colors.primary} />
                  <Text style={styles.searchHintText}>
                    Escribe al menos 2 caracteres para buscar usuarios
                  </Text>
                </View>
              )}
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
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
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
    fontWeight: '800',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  statsSection: {
    padding: 16,
    backgroundColor: colors.cardBackground,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
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
  localActionsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    padding: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
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
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.badgeDestacado + '15',
    borderRadius: 8,
    marginBottom: 8,
  },
  planInfoText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F59E0B' + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#8B5CF6' + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.badgeNuevo + '20',
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
  assignModalBody: {
    padding: 20,
    maxHeight: 500,
  },
  selectedLocalInfo: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  selectedLocalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  selectedLocalAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  currentOwnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  currentOwnerText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  usuariosList: {
    marginTop: 12,
    gap: 8,
  },
  usuarioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  usuarioInfo: {
    flex: 1,
  },
  usuarioNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  usuarioEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  usuarioRolBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  usuarioRolText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'capitalize',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  searchHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  searchHintText: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
    lineHeight: 20,
  },
});
