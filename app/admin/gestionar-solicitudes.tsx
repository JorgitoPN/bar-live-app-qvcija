
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

interface SolicitudLocal {
  id: string;
  nombre: string;
  tipo: string;
  direccion: string;
  provincia: string;
  imagen_url?: string;
  estado_solicitud: 'pendiente' | 'en_revision' | 'aprobado' | 'denegado';
  fecha_solicitud: string;
  fecha_revision?: string;
  motivo_denegacion?: string;
  comentarios_admin?: string;
  propietario_id?: string;
  propietario?: {
    nombre: string;
    email: string;
  };
}

const SOLICITUDES_POR_PAGINA = 20;

export default function GestionarSolicitudesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<SolicitudLocal[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalSolicitudes, setTotalSolicitudes] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudLocal | null>(null);
  const [motivoDenegacion, setMotivoDenegacion] = useState('');
  const [comentariosAdmin, setComentariosAdmin] = useState('');
  const [processingReview, setProcessingReview] = useState(false);

  const [contadores, setContadores] = useState({
    total: 0,
    pendientes: 0,
    enRevision: 0,
    aprobados: 0,
    denegados: 0,
  });

  const cargarContadores = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('locales')
        .select('estado_solicitud');

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        pendientes: data?.filter(l => l.estado_solicitud === 'pendiente').length || 0,
        enRevision: data?.filter(l => l.estado_solicitud === 'en_revision').length || 0,
        aprobados: data?.filter(l => l.estado_solicitud === 'aprobado').length || 0,
        denegados: data?.filter(l => l.estado_solicitud === 'denegado').length || 0,
      };

      setContadores(stats);
    } catch (error) {
      console.error('[GestionarSolicitudes] Error cargando contadores:', error);
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

      let query = supabase
        .from('locales')
        .select(`
          *,
          propietario:usuarios!propietario_id(
            nombre,
            email
          )
        `, { count: 'exact' })
        .order('fecha_solicitud', { ascending: false })
        .range(from, to);

      if (busqueda) {
        query = query.or(`nombre.ilike.%${busqueda}%,direccion.ilike.%${busqueda}%`);
      }

      if (filtroEstado !== 'todos') {
        query = query.eq('estado_solicitud', filtroEstado);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('[GestionarSolicitudes] Error cargando solicitudes:', error);
        throw error;
      }

      console.log('[GestionarSolicitudes] Solicitudes cargadas:', data?.length || 0);
      
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
      console.error('[GestionarSolicitudes] Error cargando solicitudes:', error);
      Alert.alert('Error', 'No se pudieron cargar las solicitudes');
    } finally {
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }, [busqueda, filtroEstado]);

  useEffect(() => {
    console.log('[GestionarSolicitudes] Initial load');
    cargarContadores();
    cargarSolicitudes(true, 1);
  }, []);

  useEffect(() => {
    if (!initialLoading) {
      console.log('[GestionarSolicitudes] Filters changed, reloading...');
      const timer = setTimeout(() => {
        cargarSolicitudes(true, 1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [busqueda, filtroEstado, initialLoading]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !initialLoading) {
      console.log('[GestionarSolicitudes] Loading more, page:', paginaActual);
      cargarSolicitudes(false, paginaActual);
    }
  }, [hasMore, loadingMore, initialLoading, paginaActual, cargarSolicitudes]);

  const openReviewModal = (solicitud: SolicitudLocal) => {
    setSelectedSolicitud(solicitud);
    setMotivoDenegacion(solicitud.motivo_denegacion || '');
    setComentariosAdmin(solicitud.comentarios_admin || '');
    setShowReviewModal(true);
  };

  const handleAprobar = async () => {
    if (!selectedSolicitud || !user) return;

    setProcessingReview(true);
    try {
      const { error } = await supabase
        .from('locales')
        .update({
          estado_solicitud: 'aprobado',
          fecha_revision: new Date().toISOString(),
          revisado_por: user.id,
          comentarios_admin: comentariosAdmin || null,
          activo: true,
        })
        .eq('id', selectedSolicitud.id);

      if (error) throw error;

      // Send notification to owner
      if (selectedSolicitud.propietario_id) {
        await supabase
          .from('notificaciones_locales')
          .insert({
            local_id: selectedSolicitud.id,
            propietario_id: selectedSolicitud.propietario_id,
            tipo: 'aprobado',
            titulo: 'Local Aprobado',
            mensaje: `Tu local "${selectedSolicitud.nombre}" ha sido aprobado y ya está visible en BarLive.`,
          });
      }

      Alert.alert('Éxito', 'Local aprobado correctamente');
      setShowReviewModal(false);
      setSelectedSolicitud(null);
      cargarSolicitudes(true, 1);
      cargarContadores();
    } catch (error) {
      console.error('[GestionarSolicitudes] Error aprobando solicitud:', error);
      Alert.alert('Error', 'No se pudo aprobar la solicitud');
    } finally {
      setProcessingReview(false);
    }
  };

  const handleDenegar = async () => {
    if (!selectedSolicitud || !user) return;

    if (!motivoDenegacion.trim()) {
      Alert.alert('Error', 'Debes proporcionar un motivo de denegación');
      return;
    }

    setProcessingReview(true);
    try {
      const { error } = await supabase
        .from('locales')
        .update({
          estado_solicitud: 'denegado',
          fecha_revision: new Date().toISOString(),
          revisado_por: user.id,
          motivo_denegacion: motivoDenegacion,
          comentarios_admin: comentariosAdmin || null,
          activo: false,
        })
        .eq('id', selectedSolicitud.id);

      if (error) throw error;

      // Send notification to owner
      if (selectedSolicitud.propietario_id) {
        await supabase
          .from('notificaciones_locales')
          .insert({
            local_id: selectedSolicitud.id,
            propietario_id: selectedSolicitud.propietario_id,
            tipo: 'denegado',
            titulo: 'Local Denegado',
            mensaje: `Tu local "${selectedSolicitud.nombre}" ha sido denegado. Motivo: ${motivoDenegacion}`,
          });
      }

      Alert.alert('Éxito', 'Local denegado correctamente');
      setShowReviewModal(false);
      setSelectedSolicitud(null);
      setMotivoDenegacion('');
      setComentariosAdmin('');
      cargarSolicitudes(true, 1);
      cargarContadores();
    } catch (error) {
      console.error('[GestionarSolicitudes] Error denegando solicitud:', error);
      Alert.alert('Error', 'No se pudo denegar la solicitud');
    } finally {
      setProcessingReview(false);
    }
  };

  const handleMarcarEnRevision = async (solicitudId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('locales')
        .update({
          estado_solicitud: 'en_revision',
        })
        .eq('id', solicitudId);

      if (error) throw error;

      setSolicitudes(prevSolicitudes =>
        prevSolicitudes.map(sol =>
          sol.id === solicitudId ? { ...sol, estado_solicitud: 'en_revision' as const } : sol
        )
      );

      cargarContadores();
    } catch (error) {
      console.error('[GestionarSolicitudes] Error marcando en revisión:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

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
      case 'aprobado':
        return '#10B981';
      case 'denegado':
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
      case 'aprobado':
        return 'Aprobado';
      case 'denegado':
        return 'Denegado';
      default:
        return estado;
    }
  };

  const SolicitudCard = ({ solicitud }: { solicitud: SolicitudLocal }) => {
    const coverPhoto = solicitud.imagen_url;
    const estadoColor = getEstadoBadgeColor(solicitud.estado_solicitud);
    
    return (
      <View style={styles.solicitudCard}>
        <TouchableOpacity
          style={styles.solicitudCardContent}
          onPress={() => router.push(`/detalle/local?id=${solicitud.id}`)}
        >
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
                {solicitud.nombre}
              </Text>
              <View style={[styles.estadoBadge, { backgroundColor: estadoColor + '20' }]}>
                <Text style={[styles.estadoText, { color: estadoColor }]}>
                  {getEstadoLabel(solicitud.estado_solicitud)}
                </Text>
              </View>
            </View>

            <View style={styles.tipoBadge}>
              <Text style={styles.tipoText}>{solicitud.tipo}</Text>
            </View>

            <Text style={styles.solicitudDireccion} numberOfLines={2}>
              {solicitud.direccion}
            </Text>

            {solicitud.propietario && (
              <View style={styles.ownerInfo}>
                <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={12} color={colors.textSecondary} />
                <Text style={styles.ownerText} numberOfLines={1}>
                  {solicitud.propietario.nombre}
                </Text>
              </View>
            )}

            <View style={styles.fechaInfo}>
              <IconSymbol ios_icon_name="calendar" android_material_icon_name="calendar_today" size={12} color={colors.textSecondary} />
              <Text style={styles.fechaText}>
                {new Date(solicitud.fecha_solicitud).toLocaleDateString('es-ES')}
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
        </TouchableOpacity>

        <View style={styles.solicitudActions}>
          {solicitud.estado_solicitud === 'pendiente' && (
            <TouchableOpacity
              style={styles.revisionButton}
              onPress={() => handleMarcarEnRevision(solicitud.id)}
            >
              <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={16} color="#3B82F6" />
              <Text style={styles.revisionButtonText}>Marcar en Revisión</Text>
            </TouchableOpacity>
          )}

          {(solicitud.estado_solicitud === 'pendiente' || solicitud.estado_solicitud === 'en_revision') && (
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.aprobarButton}
                onPress={() => {
                  setSelectedSolicitud(solicitud);
                  setComentariosAdmin('');
                  setMotivoDenegacion('');
                  Alert.alert(
                    'Aprobar Local',
                    `¿Aprobar "${solicitud.nombre}"?`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Aprobar',
                        onPress: async () => {
                          try {
                            const { error } = await supabase
                              .from('locales')
                              .update({
                                estado_solicitud: 'aprobado',
                                fecha_revision: new Date().toISOString(),
                                revisado_por: user?.id,
                                activo: true,
                              })
                              .eq('id', solicitud.id);

                            if (error) throw error;

                            if (solicitud.propietario_id) {
                              await supabase
                                .from('notificaciones_locales')
                                .insert({
                                  local_id: solicitud.id,
                                  propietario_id: solicitud.propietario_id,
                                  tipo: 'aprobado',
                                  titulo: 'Local Aprobado',
                                  mensaje: `Tu local "${solicitud.nombre}" ha sido aprobado y ya está visible en BarLive.`,
                                });
                            }

                            Alert.alert('Éxito', 'Local aprobado correctamente');
                            cargarSolicitudes(true, 1);
                            cargarContadores();
                          } catch (error) {
                            console.error('[GestionarSolicitudes] Error aprobando:', error);
                            Alert.alert('Error', 'No se pudo aprobar la solicitud');
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={18} color={colors.white} />
                <Text style={styles.aprobarButtonText}>Aprobar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.denegarButton}
                onPress={() => openReviewModal(solicitud)}
              >
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={18} color={colors.white} />
                <Text style={styles.denegarButtonText}>Denegar</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => router.push(`/detalle/local?id=${solicitud.id}`)}
          >
            <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={18} color={colors.primary} />
            <Text style={styles.viewButtonText}>Ver Detalles</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSolicitudCard = useCallback(({ item }: { item: SolicitudLocal }) => (
    <SolicitudCard solicitud={item} />
  ), []);

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
            <Text style={[styles.statNumber, { color: '#10B981' }]}>{contadores.aprobados}</Text>
            <Text style={styles.statLabel}>Aprobados</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o dirección..."
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
        <Text style={styles.headerTitle}>Gestionar Solicitudes</Text>
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
                  {['todos', 'pendiente', 'en_revision', 'aprobado', 'denegado'].map(option => (
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

      {/* Modal de Revisión */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowReviewModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Revisar Solicitud</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.reviewModalBody}>
              {selectedSolicitud && (
                <React.Fragment>
                  <View style={styles.selectedLocalInfo}>
                    <Text style={styles.selectedLocalName}>{selectedSolicitud.nombre}</Text>
                    <Text style={styles.selectedLocalAddress}>{selectedSolicitud.direccion}</Text>
                    {selectedSolicitud.propietario && (
                      <View style={styles.selectedLocalOwner}>
                        <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={14} color={colors.textSecondary} />
                        <Text style={styles.selectedLocalOwnerText}>
                          {selectedSolicitud.propietario.nombre} ({selectedSolicitud.propietario.email})
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Comentarios del Administrador (Opcional)</Text>
                    <TextInput
                      style={styles.textArea}
                      value={comentariosAdmin}
                      onChangeText={setComentariosAdmin}
                      placeholder="Añade comentarios internos sobre esta solicitud..."
                      placeholderTextColor={colors.textSecondary}
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Motivo de Denegación (Requerido para denegar)</Text>
                    <TextInput
                      style={styles.textArea}
                      value={motivoDenegacion}
                      onChangeText={setMotivoDenegacion}
                      placeholder="Explica por qué se deniega esta solicitud..."
                      placeholderTextColor={colors.textSecondary}
                      multiline
                      numberOfLines={4}
                    />
                  </View>

                  <View style={styles.reviewActions}>
                    <TouchableOpacity
                      style={styles.aprobarButtonLarge}
                      onPress={handleAprobar}
                      disabled={processingReview}
                    >
                      {processingReview ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <React.Fragment>
                          <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color={colors.white} />
                          <Text style={styles.aprobarButtonLargeText}>Aprobar Local</Text>
                        </React.Fragment>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.denegarButtonLarge}
                      onPress={handleDenegar}
                      disabled={processingReview || !motivoDenegacion.trim()}
                    >
                      {processingReview ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <React.Fragment>
                          <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color={colors.white} />
                          <Text style={styles.denegarButtonLargeText}>Denegar Local</Text>
                        </React.Fragment>
                      )}
                    </TouchableOpacity>
                  </View>
                </React.Fragment>
              )}
            </ScrollView>
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
  solicitudDireccion: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 16,
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
  solicitudActions: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    padding: 12,
    gap: 8,
  },
  revisionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#3B82F6' + '20',
    paddingVertical: 10,
    borderRadius: 8,
  },
  revisionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  aprobarButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 8,
  },
  aprobarButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  denegarButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    borderRadius: 8,
  },
  denegarButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary + '20',
    paddingVertical: 10,
    borderRadius: 8,
  },
  viewButtonText: {
    fontSize: 13,
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
  reviewModalBody: {
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
  selectedLocalOwner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  selectedLocalOwnerText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  reviewActions: {
    gap: 12,
  },
  aprobarButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
  },
  aprobarButtonLargeText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  denegarButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
  },
  denegarButtonLargeText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
});
