
import React, { useState, useEffect, useCallback } from 'react';
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
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * ✅ FIXED v226.0: Property request detail navigation
 * - Changed navigation from /detalle/local to /admin/solicitud-detalle
 * - This screen manages property REQUESTS, not venues
 */

interface SolicitudPropietario {
  id: string;
  usuario_id: string;
  local_id?: string;
  nombre_local: string;
  direccion_local?: string;
  ciudad_local?: string;
  provincia_local?: string;
  tipo_local?: string;
  estado: 'pendiente' | 'en_revision' | 'informacion_adicional' | 'aprobada' | 'denegada';
  tipo_solicitud: 'reclamar_local' | 'nuevo_local';
  created_at: string;
  motivo_denegacion?: string;
  usuario?: {
    nombre: string;
    email: string;
  };
  imagen_portada_url?: string;
}

const SOLICITUDES_POR_PAGINA = 20;

export default function GestionarSolicitudesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<SolicitudPropietario[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalSolicitudes, setTotalSolicitudes] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [showFiltersModal, setShowFiltersModal] = useState(false);

  const [contadores, setContadores] = useState({
    total: 0,
    pendientes: 0,
    enRevision: 0,
    aprobadas: 0,
    denegadas: 0,
  });

  const cargarContadores = useCallback(async () => {
    try {
      console.log('[GestionarSolicitudes v226.0] Loading counters...');
      
      const { data, error } = await supabase
        .from('solicitudes_propietario')
        .select('estado');

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        pendientes: data?.filter(s => s.estado === 'pendiente').length || 0,
        enRevision: data?.filter(s => s.estado === 'en_revision').length || 0,
        aprobadas: data?.filter(s => s.estado === 'aprobada').length || 0,
        denegadas: data?.filter(s => s.estado === 'denegada').length || 0,
      };

      console.log('[GestionarSolicitudes v226.0] Counters:', stats);
      setContadores(stats);
    } catch (error) {
      console.error('[GestionarSolicitudes v226.0] Error loading counters:', error);
    }
  }, []);

  const cargarSolicitudes = useCallback(async (reset: boolean = false, currentPage: number = 1) => {
    try {
      if (reset) {
        setInitialLoading(true);
      } else {
        setLoadingMore(true);
      }

      const from = reset ? 0 : (currentPage - 1) * SOLICITUDES_POR_PAGINA;
      const to = from + SOLICITUDES_POR_PAGINA - 1;

      console.log('[GestionarSolicitudes v226.0] Loading requests from', from, 'to', to);

      let query = supabase
        .from('solicitudes_propietario')
        .select(`
          *,
          usuario:usuarios!solicitudes_propietario_usuario_id_fkey (
            nombre,
            email
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (busqueda) {
        query = query.or(`nombre_local.ilike.%${busqueda}%,direccion_local.ilike.%${busqueda}%,ciudad_local.ilike.%${busqueda}%`);
      }

      if (filtroEstado !== 'todos') {
        query = query.eq('estado', filtroEstado);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('[GestionarSolicitudes v226.0] Error loading requests:', error);
        throw error;
      }

      console.log('[GestionarSolicitudes v226.0] ✅ Loaded', data?.length || 0, 'requests');
      
      if (reset) {
        setSolicitudes(data || []);
        setPaginaActual(2);
      } else {
        setSolicitudes(prev => [...prev, ...(data || [])]);
        setPaginaActual(currentPage + 1);
      }
      
      setTotalSolicitudes(count || 0);
      setHasMore((data?.length || 0) === SOLICITUDES_POR_PAGINA);
    } catch (error) {
      console.error('[GestionarSolicitudes v226.0] Error loading requests:', error);
      Alert.alert('Error', 'No se pudieron cargar las solicitudes');
    } finally {
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }, [busqueda, filtroEstado]);

  useEffect(() => {
    console.log('[GestionarSolicitudes v226.0] Initial load');
    cargarContadores();
    cargarSolicitudes(true, 1);
  }, [cargarContadores, cargarSolicitudes]);

  useEffect(() => {
    if (!initialLoading) {
      console.log('[GestionarSolicitudes v226.0] Filters changed, reloading...');
      const timer = setTimeout(() => {
        cargarSolicitudes(true, 1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [busqueda, filtroEstado, initialLoading, cargarSolicitudes]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !initialLoading) {
      console.log('[GestionarSolicitudes v226.0] Loading more, page:', paginaActual);
      cargarSolicitudes(false, paginaActual);
    }
  }, [hasMore, loadingMore, initialLoading, paginaActual, cargarSolicitudes]);

  const limpiarFiltros = useCallback(() => {
    setFiltroEstado('todos');
    setBusqueda('');
  }, []);

  const hayFiltrosActivos = useCallback(() => {
    return filtroEstado !== 'todos' || busqueda !== '';
  }, [filtroEstado, busqueda]);

  const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return '#F59E0B';
      case 'en_revision':
        return '#3B82F6';
      case 'informacion_adicional':
        return '#8B5CF6';
      case 'aprobada':
        return '#10B981';
      case 'denegada':
        return '#EF4444';
      default:
        return colors.textSecondary;
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'en_revision':
        return 'En Revisión';
      case 'informacion_adicional':
        return 'Info Adicional';
      case 'aprobada':
        return 'Aprobada';
      case 'denegada':
        return 'Denegada';
      case 'todos':
        return 'Todos';
      default:
        return estado;
    }
  };

  const SolicitudCard = useCallback(({ solicitud }: { solicitud: SolicitudPropietario }) => {
    const coverPhoto = solicitud.imagen_portada_url;
    const estadoColor = getEstadoBadgeColor(solicitud.estado);
    
    return (
      <TouchableOpacity
        style={styles.solicitudCard}
        onPress={() => {
          console.log('[GestionarSolicitudes v226.0] 🔍 Opening request detail:', solicitud.id);
          router.push(`/admin/solicitud-detalle?id=${solicitud.id}`);
        }}
      >
        <View style={styles.solicitudCardContent}>
          {coverPhoto ? (
            <Image 
              source={{ uri: coverPhoto }} 
              style={styles.solicitudImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.solicitudImage, styles.imagePlaceholder]}>
              <IconSymbol ios_icon_name="photo" android_material_icon_name="image" size={32} color={colors.textSecondary} />
            </View>
          )}

          <View style={styles.solicitudInfo}>
            <View style={styles.solicitudHeader}>
              <Text style={styles.solicitudNombre} numberOfLines={1}>
                {solicitud.nombre_local}
              </Text>
              <View style={[styles.estadoBadge, { backgroundColor: estadoColor + '20' }]}>
                <Text style={[styles.estadoText, { color: estadoColor }]}>
                  {getEstadoLabel(solicitud.estado)}
                </Text>
              </View>
            </View>

            {solicitud.tipo_local && (
              <View style={styles.tipoBadge}>
                <Text style={styles.tipoText}>{solicitud.tipo_local}</Text>
              </View>
            )}

            <View style={styles.tipoSolicitudBadge}>
              <IconSymbol 
                ios_icon_name={solicitud.tipo_solicitud === 'reclamar_local' ? 'hand.raised.fill' : 'plus.circle.fill'} 
                android_material_icon_name={solicitud.tipo_solicitud === 'reclamar_local' ? 'pan_tool' : 'add_circle'} 
                size={12} 
                color={colors.primary} 
              />
              <Text style={styles.tipoSolicitudText}>
                {solicitud.tipo_solicitud === 'reclamar_local' ? 'Reclamar Local' : 'Nuevo Local'}
              </Text>
            </View>

            {solicitud.direccion_local && (
              <Text style={styles.solicitudDireccion} numberOfLines={2}>
                {solicitud.direccion_local}
              </Text>
            )}

            {solicitud.ciudad_local && (
              <Text style={styles.solicitudCiudad} numberOfLines={1}>
                {solicitud.ciudad_local}, {solicitud.provincia_local}
              </Text>
            )}

            {solicitud.usuario && (
              <View style={styles.ownerInfo}>
                <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={12} color={colors.textSecondary} />
                <Text style={styles.ownerText} numberOfLines={1}>
                  {solicitud.usuario.nombre}
                </Text>
              </View>
            )}

            <View style={styles.fechaInfo}>
              <IconSymbol ios_icon_name="calendar" android_material_icon_name="calendar_today" size={12} color={colors.textSecondary} />
              <Text style={styles.fechaText}>
                {new Date(solicitud.created_at).toLocaleDateString('es-ES')}
              </Text>
            </View>

            {solicitud.motivo_denegacion && (
              <View style={styles.motivoContainer}>
                <Text style={styles.motivoLabel}>Motivo de denegación:</Text>
                <Text style={styles.motivoText} numberOfLines={2}>
                  {solicitud.motivo_denegacion}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.viewDetailsFooter}>
          <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={18} color={colors.primary} />
          <Text style={styles.viewDetailsText}>Ver Detalles</Text>
          <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={18} color={colors.primary} />
        </View>
      </TouchableOpacity>
    );
  }, [router]);

  const renderSolicitudCard = useCallback(({ item }: { item: SolicitudPropietario }) => (
    <SolicitudCard solicitud={item} />
  ), [SolicitudCard]);

  const renderHeader = useMemo(() => (
    <React.Fragment>
      <View style={styles.statsSection}>
        <Text style={styles.statsSectionTitle}>Estadísticas de Solicitudes</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{contadores.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{contadores.pendientes}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#3B82F6' }]}>{contadores.enRevision}</Text>
            <Text style={styles.statLabel}>En Revisión</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>{contadores.aprobadas}</Text>
            <Text style={styles.statLabel}>Aprobadas</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, dirección o ciudad..."
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

      <View style={styles.filterButtonsRow}>
        <TouchableOpacity
          style={[styles.filterButton, hayFiltrosActivos() && styles.filterButtonActive]}
          onPress={() => setShowFiltersModal(true)}
        >
          <IconSymbol ios_icon_name="line.3.horizontal.decrease.circle" android_material_icon_name="filter_list" size={20} color={hayFiltrosActivos() ? colors.headerText : colors.text} />
          <Text style={[styles.filterButtonText, hayFiltrosActivos() && styles.filterButtonTextActive]}>
            Filtros {hayFiltrosActivos() && '•'}
          </Text>
        </TouchableOpacity>

        {hayFiltrosActivos() && (
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={limpiarFiltros}
          >
            <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={16} color={colors.textSecondary} />
            <Text style={styles.clearFiltersText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.resultsIndicator}>
        <Text style={styles.resultsText}>
          Mostrando {solicitudes.length} de {totalSolicitudes} solicitudes
        </Text>
      </View>
    </React.Fragment>
  ), [contadores, busqueda, hayFiltrosActivos, solicitudes.length, totalSolicitudes, limpiarFiltros]);

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
      <IconSymbol ios_icon_name="doc.text" android_material_icon_name="description" size={48} color={colors.textSecondary} />
      <Text style={styles.emptyText}>No se encontraron solicitudes</Text>
      <Text style={styles.emptySubtext}>
        Intenta ajustar los filtros de búsqueda
      </Text>
    </View>
  ), []);

  if (initialLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando solicitudes...</Text>
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
        <Text style={styles.headerTitle}>Solicitudes de Propiedad</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <FlatList
        data={solicitudes}
        renderItem={renderSolicitudCard}
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
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Estado</Text>
                <View style={styles.filterOptions}>
                  {['todos', 'pendiente', 'en_revision', 'informacion_adicional', 'aprobada', 'denegada'].map(option => (
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
                        {getEstadoLabel(option)}
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
  resultsIndicator: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  resultsText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  solicitudCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    ...commonStyles.cardShadow,
  },
  solicitudCardContent: {
    flexDirection: 'row',
  },
  solicitudImage: {
    width: 100,
    height: 140,
  },
  imagePlaceholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  solicitudInfo: {
    flex: 1,
    padding: 12,
  },
  solicitudHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  solicitudNombre: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  estadoBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  estadoText: {
    fontSize: 10,
    fontWeight: '600',
  },
  tipoBadge: {
    backgroundColor: `${colors.primary}20`,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  tipoText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  tipoSolicitudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '10',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  tipoSolicitudText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  solicitudDireccion: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    lineHeight: 16,
  },
  solicitudCiudad: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  ownerText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  fechaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  fechaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  motivoContainer: {
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  motivoLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 2,
  },
  motivoText: {
    fontSize: 11,
    color: '#DC2626',
    lineHeight: 14,
  },
  viewDetailsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingVertical: 12,
    backgroundColor: colors.primary + '10',
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
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
