
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
  ScrollView,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';

interface Evento {
  id: string;
  titulo: string;
  descripcion?: string;
  fecha: string;
  hora: string;
  hora_inicio?: string;
  hora_fin?: string;
  precio?: number;
  imagen_url?: string;
  local_id?: string;
  propietario_id?: string;
  provincia?: string;
  destacado: boolean;
  activo: boolean;
  created_at: string;
  local?: {
    nombre: string;
    provincia: string;
  };
  propietario?: {
    nombre: string;
    email: string;
  };
}

const EVENTOS_POR_PAGINA = 20;

export default function GestionarEventosScreen() {
  const router = useRouter();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [filtroDestacado, setFiltroDestacado] = useState<'todos' | 'destacados' | 'normales'>('todos');
  const [filtroProvincia, setFiltroProvincia] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalEventos, setTotalEventos] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  const cargarEventos = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('eventos')
        .select(`
          *,
          local:locales(nombre, provincia),
          propietario:usuarios(nombre, email)
        `, { count: 'exact' });

      // Apply filters
      if (busqueda) {
        query = query.or(`titulo.ilike.%${busqueda}%,descripcion.ilike.%${busqueda}%`);
      }

      if (filtroEstado === 'activos') {
        query = query.eq('activo', true);
      } else if (filtroEstado === 'inactivos') {
        query = query.eq('activo', false);
      }

      if (filtroDestacado === 'destacados') {
        query = query.eq('destacado', true);
      } else if (filtroDestacado === 'normales') {
        query = query.eq('destacado', false);
      }

      if (filtroProvincia) {
        query = query.eq('provincia', filtroProvincia);
      }

      // Pagination
      const desde = (paginaActual - 1) * EVENTOS_POR_PAGINA;
      const hasta = desde + EVENTOS_POR_PAGINA - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(desde, hasta);

      if (error) throw error;

      setEventos(data || []);
      setTotalEventos(count || 0);
    } catch (error) {
      console.error('[GestionarEventos] Error cargando eventos:', error);
      Alert.alert('Error', 'No se pudieron cargar los eventos');
    } finally {
      setLoading(false);
    }
  }, [busqueda, filtroEstado, filtroDestacado, filtroProvincia, paginaActual]);

  useEffect(() => {
    cargarEventos();
  }, [cargarEventos]);

  const toggleEstadoEvento = async (eventoId: string, activo: boolean) => {
    try {
      const { error } = await supabase
        .from('eventos')
        .update({ activo: !activo })
        .eq('id', eventoId);

      if (error) throw error;

      Alert.alert('Éxito', `Evento ${!activo ? 'activado' : 'desactivado'} correctamente`);
      cargarEventos();
    } catch (error) {
      console.error('[GestionarEventos] Error cambiando estado:', error);
      Alert.alert('Error', 'No se pudo cambiar el estado del evento');
    }
  };

  const toggleDestacado = async (eventoId: string, destacado: boolean) => {
    try {
      const { error } = await supabase
        .from('eventos')
        .update({ destacado: !destacado })
        .eq('id', eventoId);

      if (error) throw error;

      Alert.alert('Éxito', `Evento ${!destacado ? 'destacado' : 'no destacado'} correctamente`);
      cargarEventos();
    } catch (error) {
      console.error('[GestionarEventos] Error cambiando destacado:', error);
      Alert.alert('Error', 'No se pudo cambiar el estado destacado');
    }
  };

  const eliminarEvento = async (evento: Evento) => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de que quieres eliminar "${evento.titulo}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingEventId(evento.id);
              
              console.log('[GestionarEventos] ========================================');
              console.log('[GestionarEventos] Admin deleting event');
              console.log('[GestionarEventos] Event ID:', evento.id);
              console.log('[GestionarEventos] Event Title:', evento.titulo);
              console.log('[GestionarEventos] Event Owner ID:', evento.propietario_id);
              console.log('[GestionarEventos] ========================================');

              // Optimistically remove from UI
              setEventos(prev => prev.filter(e => e.id !== evento.id));
              
              // Admin can delete any event
              const { error, data } = await supabase
                .from('eventos')
                .delete()
                .eq('id', evento.id)
                .select();

              if (error) {
                console.error('[GestionarEventos] Delete error:', error);
                console.error('[GestionarEventos] Error code:', error.code);
                console.error('[GestionarEventos] Error message:', error.message);
                
                // Rollback optimistic update
                await cargarEventos();
                throw error;
              }

              console.log('[GestionarEventos] Delete successful!');
              console.log('[GestionarEventos] Deleted data:', data);
              console.log('[GestionarEventos] ========================================');

              Alert.alert('Éxito', 'Evento eliminado correctamente');
              
              // Reload to ensure consistency
              await cargarEventos();
            } catch (error: any) {
              console.error('[GestionarEventos] Error eliminando evento:', error);
              
              let errorMessage = 'No se pudo eliminar el evento';
              
              if (error.message) {
                errorMessage += `: ${error.message}`;
              }
              
              if (error.code === 'PGRST301') {
                errorMessage = 'Error de permisos. Verifica tu rol de administrador.';
              } else if (error.code === '42501') {
                errorMessage = 'Permisos insuficientes. Contacta con el administrador del sistema.';
              }
              
              Alert.alert('Error', errorMessage);
            } finally {
              setDeletingEventId(null);
            }
          },
        },
      ]
    );
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroEstado('todos');
    setFiltroDestacado('todos');
    setFiltroProvincia('');
    setPaginaActual(1);
  };

  const hayFiltrosActivos = () => {
    return busqueda || filtroEstado !== 'todos' || filtroDestacado !== 'todos' || filtroProvincia;
  };

  const renderEventoCard = ({ item }: { item: Evento }) => {
    const isDeleting = deletingEventId === item.id;
    
    return (
      <View style={[styles.eventoCard, isDeleting && styles.eventoCardDeleting]}>
        <View style={styles.eventoHeader}>
          {item.imagen_url && (
            <Image source={{ uri: item.imagen_url }} style={styles.eventoImagen} />
          )}
          <View style={styles.eventoInfo}>
            <Text style={styles.eventoTitulo} numberOfLines={2}>{item.titulo}</Text>
            {item.local && (
              <Text style={styles.eventoLocal}>{item.local.nombre}</Text>
            )}
            <View style={styles.eventoMeta}>
              <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={14} color={colors.textSecondary} />
              <Text style={styles.eventoMetaText}>
                {new Date(item.fecha).toLocaleDateString('es-ES')}
              </Text>
              <IconSymbol ios_icon_name="clock" android_material_icon_name="schedule" size={14} color={colors.textSecondary} />
              <Text style={styles.eventoMetaText}>{item.hora}</Text>
            </View>
            {item.precio !== null && item.precio !== undefined && (
              <Text style={styles.eventoPrecio}>
                {item.precio === 0 ? 'Gratis' : `${item.precio}€`}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.eventoActions}>
          <View style={styles.eventoBadges}>
            <View style={[styles.badge, item.activo ? styles.badgeActivo : styles.badgeInactivo]}>
              <Text style={styles.badgeText}>{item.activo ? 'Activo' : 'Inactivo'}</Text>
            </View>
            {item.destacado && (
              <View style={[styles.badge, styles.badgeDestacado]}>
                <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={12} color="#fff" />
                <Text style={styles.badgeText}>Destacado</Text>
              </View>
            )}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/detalle/evento?id=${item.id}` as any)}
              activeOpacity={0.7}
              disabled={isDeleting}
            >
              <IconSymbol ios_icon_name="eye" android_material_icon_name="visibility" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => toggleDestacado(item.id, item.destacado)}
              activeOpacity={0.7}
              disabled={isDeleting}
            >
              <IconSymbol 
                ios_icon_name={item.destacado ? 'star.fill' : 'star'} 
                android_material_icon_name={item.destacado ? 'star' : 'star_border'}
                size={20} 
                color={item.destacado ? '#F59E0B' : colors.textSecondary} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => toggleEstadoEvento(item.id, item.activo)}
              activeOpacity={0.7}
              disabled={isDeleting}
            >
              <IconSymbol 
                ios_icon_name={item.activo ? 'eye.slash' : 'eye'} 
                android_material_icon_name={item.activo ? 'visibility_off' : 'visibility'}
                size={20} 
                color={colors.textSecondary} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => eliminarEvento(item)}
              activeOpacity={0.7}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={20} color="#EF4444" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.searchContainer}>
        <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar eventos..."
          placeholderTextColor={colors.textSecondary}
          value={busqueda}
          onChangeText={setBusqueda}
        />
        {busqueda.length > 0 && (
          <TouchableOpacity onPress={() => setBusqueda('')} activeOpacity={0.7}>
            <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
          activeOpacity={0.7}
        >
          <IconSymbol ios_icon_name="line.3.horizontal.decrease.circle" android_material_icon_name="filter_list" size={20} color={colors.primary} />
          <Text style={styles.filterButtonText}>Filtros</Text>
          {hayFiltrosActivos() && <View style={styles.filterDot} />}
        </TouchableOpacity>

        {hayFiltrosActivos() && (
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={limpiarFiltros}
            activeOpacity={0.7}
          >
            <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          Total: {totalEventos} eventos
        </Text>
        <Text style={styles.statsText}>
          Página {paginaActual} de {Math.ceil(totalEventos / EVENTOS_POR_PAGINA)}
        </Text>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (totalEventos <= EVENTOS_POR_PAGINA) return null;

    const totalPaginas = Math.ceil(totalEventos / EVENTOS_POR_PAGINA);

    return (
      <View style={styles.pagination}>
        <TouchableOpacity
          style={[styles.paginationButton, paginaActual === 1 && styles.paginationButtonDisabled]}
          onPress={() => setPaginaActual(paginaActual - 1)}
          disabled={paginaActual === 1}
          activeOpacity={0.7}
        >
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="chevron_left" size={20} color={paginaActual === 1 ? colors.textSecondary : colors.primary} />
        </TouchableOpacity>

        <Text style={styles.paginationText}>
          {paginaActual} / {totalPaginas}
        </Text>

        <TouchableOpacity
          style={[styles.paginationButton, paginaActual === totalPaginas && styles.paginationButtonDisabled]}
          onPress={() => setPaginaActual(paginaActual + 1)}
          disabled={paginaActual === totalPaginas}
          activeOpacity={0.7}
        >
          <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={paginaActual === totalPaginas ? colors.textSecondary : colors.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyText}>No se encontraron eventos</Text>
      {hayFiltrosActivos() && (
        <TouchableOpacity style={styles.emptyButton} onPress={limpiarFiltros} activeOpacity={0.7}>
          <Text style={styles.emptyButtonText}>Limpiar filtros</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.topHeader}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.title}>Gestionar Eventos</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando eventos...</Text>
        </View>
      ) : (
        <FlatList
          data={eventos}
          renderItem={renderEventoCard}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowFilters(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)} activeOpacity={0.7}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Estado</Text>
                <View style={styles.filterOptions}>
                  {['todos', 'activos', 'inactivos'].map((estado) => (
                    <TouchableOpacity
                      key={estado}
                      style={[
                        styles.filterOption,
                        filtroEstado === estado && styles.filterOptionActive,
                      ]}
                      onPress={() => setFiltroEstado(estado as any)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          filtroEstado === estado && styles.filterOptionTextActive,
                        ]}
                      >
                        {estado.charAt(0).toUpperCase() + estado.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Destacado</Text>
                <View style={styles.filterOptions}>
                  {['todos', 'destacados', 'normales'].map((destacado) => (
                    <TouchableOpacity
                      key={destacado}
                      style={[
                        styles.filterOption,
                        filtroDestacado === destacado && styles.filterOptionActive,
                      ]}
                      onPress={() => setFiltroDestacado(destacado as any)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          filtroDestacado === destacado && styles.filterOptionTextActive,
                        ]}
                      >
                        {destacado.charAt(0).toUpperCase() + destacado.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Provincia</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Filtrar por provincia..."
                  placeholderTextColor={colors.textSecondary}
                  value={filtroProvincia}
                  onChangeText={setFiltroProvincia}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  limpiarFiltros();
                  setShowFilters(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonText}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => setShowFilters(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                  Aplicar
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
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  listContent: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  eventoCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  eventoCardDeleting: {
    opacity: 0.5,
  },
  eventoHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  eventoImagen: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: colors.cardBorder,
  },
  eventoInfo: {
    flex: 1,
  },
  eventoTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  eventoLocal: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  eventoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  eventoMetaText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  eventoPrecio: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  eventoActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  eventoBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeActivo: {
    backgroundColor: '#10B981',
  },
  badgeInactivo: {
    backgroundColor: '#6B7280',
  },
  badgeDestacado: {
    backgroundColor: '#F59E0B',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 20,
  },
  paginationButton: {
    padding: 8,
  },
  paginationButtonDisabled: {
    opacity: 0.3,
  },
  paginationText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterOptionTextActive: {
    color: colors.white,
  },
  filterInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalButtonTextPrimary: {
    color: colors.white,
  },
});
