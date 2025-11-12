
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { Evento } from '@/types';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { supabase } from '@/utils/supabase';

const { width } = Dimensions.get('window');
const cardWidth = width - 32;

// FIXED: Complete list of Spanish provinces
const PROVINCIAS = [
  'Todas',
  'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila', 'Badajoz',
  'Barcelona', 'Burgos', 'Cáceres', 'Cádiz', 'Cantabria', 'Castellón', 'Ciudad Real',
  'Córdoba', 'Cuenca', 'Girona', 'Granada', 'Guadalajara', 'Guipúzcoa', 'Huelva',
  'Huesca', 'Islas Baleares', 'Jaén', 'La Coruña', 'La Rioja', 'Las Palmas', 'León',
  'Lleida', 'Lugo', 'Madrid', 'Málaga', 'Murcia', 'Navarra', 'Ourense', 'Palencia',
  'Pontevedra', 'Salamanca', 'Santa Cruz de Tenerife', 'Segovia', 'Sevilla', 'Soria',
  'Tarragona', 'Teruel', 'Toledo', 'Valencia', 'Valladolid', 'Vizcaya', 'Zamora', 'Zaragoza'
];

export default function EventosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode } = useMode();
  const [tabActual, setTabActual] = useState<'hoy' | 'proximos'>('hoy');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState('Todas');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userRole = user?.rol_app || 'cliente';
  
  // Only show FAB for propietarios and admins in propietario mode
  const canCreateEvents = (userRole === 'propietario' && currentMode === 'propietario') || 
                          (userRole === 'admin' && currentMode === 'propietario');

  const cargarEventos = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[Eventos] Cargando eventos...');

      let query = supabase
        .from('eventos')
        .select(`
          *,
          locales:local_id (
            nombre,
            provincia
          ),
          usuarios:propietario_id (
            nombre,
            avatar
          )
        `)
        .eq('activo', true)
        .order('fecha', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('[Eventos] Error cargando eventos:', error);
        return;
      }

      console.log('[Eventos] Eventos cargados:', data?.length || 0);

      // Transform data to match Evento interface
      const eventosTransformados: Evento[] = (data || []).map((evento: any) => ({
        id: evento.id,
        localId: evento.local_id,
        titulo: evento.titulo,
        descripcion: evento.descripcion || '',
        fecha: evento.fecha,
        hora: evento.hora,
        precio: evento.precio,
        imagen: evento.imagen_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819',
        localNombre: evento.locales?.nombre || 'Local',
        provincia: evento.provincia || evento.locales?.provincia || '',
        destacado: evento.destacado || false,
      }));

      setEventos(eventosTransformados);
    } catch (error) {
      console.error('[Eventos] Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarEventos();
  }, [cargarEventos]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarEventos();
  };

  const eventosFiltrados = eventos.filter((evento) => {
    const matchBusqueda = evento.titulo.toLowerCase().includes(busqueda.toLowerCase());
    const matchProvincia = provinciaSeleccionada === 'Todas' || evento.provincia === provinciaSeleccionada;
    
    // Date range filter
    let matchFecha = true;
    if (fechaInicio && fechaFin) {
      const eventoFecha = new Date(evento.fecha);
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      matchFecha = eventoFecha >= inicio && eventoFecha <= fin;
    }

    // Tab filter (hoy vs proximos)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const eventoFecha = new Date(evento.fecha);
    eventoFecha.setHours(0, 0, 0, 0);
    
    const esHoy = eventoFecha.getTime() === hoy.getTime();
    const esProximo = eventoFecha.getTime() > hoy.getTime();

    const matchTab = tabActual === 'hoy' ? esHoy : esProximo;
    
    return matchBusqueda && matchProvincia && matchFecha && matchTab;
  });

  const calcularDiasRestantes = (fecha: string): number => {
    const fechaEvento = new Date(fecha);
    const hoy = new Date();
    const diff = fechaEvento.getTime() - hoy.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const limpiarFiltros = () => {
    setProvinciaSeleccionada('Todas');
    setFechaInicio('');
    setFechaFin('');
  };

  const renderEvento = (evento: Evento) => {
    const diasRestantes = calcularDiasRestantes(evento.fecha);

    return (
      <TouchableOpacity
        key={evento.id}
        style={[styles.eventoCard, commonStyles.cardShadow]}
        onPress={() => router.push(`/detalle/evento?id=${evento.id}`)}
        activeOpacity={0.8}
      >
        <Image source={{ uri: evento.imagen }} style={styles.eventoImagen} />
        
        {evento.destacado && (
          <View style={[styles.badgeDestacado, commonStyles.badgeDestacado]}>
            <Text style={commonStyles.badgeDestacadoText}>⭐ Destacado</Text>
          </View>
        )}

        <View style={styles.eventoInfo}>
          <View style={styles.eventoHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eventoTitulo} numberOfLines={2}>
                {evento.titulo}
              </Text>
              <Text style={styles.eventoLocal}>{evento.localNombre}</Text>
            </View>
            {evento.precio && (
              <View style={styles.precioContainer}>
                <Text style={styles.precioTexto}>{evento.precio}€</Text>
              </View>
            )}
          </View>

          <View style={styles.eventoDetalles}>
            <View style={styles.detalleItem}>
              <IconSymbol name="calendar" size={16} color={colors.primary} />
              <Text style={styles.detalleTexto}>
                {new Date(evento.fecha).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
            </View>
            <View style={styles.detalleItem}>
              <IconSymbol name="clock" size={16} color={colors.primary} />
              <Text style={styles.detalleTexto}>{evento.hora}</Text>
            </View>
            <View style={styles.detalleItem}>
              <IconSymbol name="mappin" size={16} color={colors.primary} />
              <Text style={styles.detalleTexto}>{evento.provincia}</Text>
            </View>
          </View>

          <View style={styles.diasRestantesContainer}>
            <Text style={styles.diasRestantesTexto}>
              {diasRestantes > 0 ? `${diasRestantes} días restantes` : 'Hoy'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={commonStyles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={commonStyles.headerGradient}
      >
        <Text style={[commonStyles.headerTitle, { color: colors.white }]}>Eventos</Text>

        {/* Search */}
        <View style={styles.searchContainer}>
          <IconSymbol name="magnifyingglass" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar eventos..."
            placeholderTextColor={colors.white}
            value={busqueda}
            onChangeText={setBusqueda}
          />
          <TouchableOpacity onPress={() => setMostrarFiltros(true)}>
            <IconSymbol name="slider.horizontal.3" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tabActual === 'hoy' && styles.tabActive]}
            onPress={() => setTabActual('hoy')}
          >
            <Text
              style={[
                styles.tabText,
                tabActual === 'hoy' && styles.tabTextActive,
              ]}
            >
              Hoy
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tabActual === 'proximos' && styles.tabActive]}
            onPress={() => setTabActual('proximos')}
          >
            <Text
              style={[
                styles.tabText,
                tabActual === 'proximos' && styles.tabTextActive,
              ]}
            >
              Próximos
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando eventos...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.eventosContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {eventosFiltrados.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="calendar" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>
                {tabActual === 'hoy' 
                  ? 'No hay eventos para hoy' 
                  : 'No hay eventos próximos'}
              </Text>
            </View>
          ) : (
            eventosFiltrados.map(renderEvento)
          )}
        </ScrollView>
      )}

      {/* FAB - Create Event (only for propietarios and admins in propietario mode) */}
      {canCreateEvents && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/crear/evento')}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={styles.fabGradient}
          >
            <IconSymbol name="plus" size={28} color={colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Modal de filtros */}
      <Modal
        visible={mostrarFiltros}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMostrarFiltros(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setMostrarFiltros(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setMostrarFiltros(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Provincia */}
              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Provincia</Text>
                <ScrollView style={styles.provinciasList} nestedScrollEnabled>
                  {PROVINCIAS.map((provincia) => (
                    <TouchableOpacity
                      key={provincia}
                      style={[
                        styles.provinciaItem,
                        provinciaSeleccionada === provincia && styles.provinciaItemActive,
                      ]}
                      onPress={() => setProvinciaSeleccionada(provincia)}
                    >
                      <Text
                        style={[
                          styles.provinciaText,
                          provinciaSeleccionada === provincia && styles.provinciaTextActive,
                        ]}
                      >
                        {provincia}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Rango de Fechas */}
              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Rango de Fechas</Text>
                <View style={styles.dateInputs}>
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateLabel}>Desde</Text>
                    <TextInput
                      style={styles.dateInput}
                      placeholder="DD/MM/AAAA"
                      placeholderTextColor={colors.textSecondary}
                      value={fechaInicio}
                      onChangeText={setFechaInicio}
                    />
                  </View>
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateLabel}>Hasta</Text>
                    <TextInput
                      style={styles.dateInput}
                      placeholder="DD/MM/AAAA"
                      placeholderTextColor={colors.textSecondary}
                      value={fechaFin}
                      onChangeText={setFechaFin}
                    />
                  </View>
                </View>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.limpiarButton}
                onPress={limpiarFiltros}
              >
                <Text style={styles.limpiarButtonText}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.aplicarButtonModal}
                onPress={() => setMostrarFiltros(false)}
              >
                <LinearGradient
                  colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                  style={styles.aplicarButtonGradient}
                >
                  <Text style={styles.aplicarButtonText}>Aplicar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 16,
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabActive: {
    backgroundColor: colors.white,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tabTextActive: {
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
  eventosContainer: {
    padding: 16,
    gap: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  eventoCard: {
    width: cardWidth,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  eventoImagen: {
    width: '100%',
    height: 200,
    backgroundColor: colors.cardBorder,
  },
  badgeDestacado: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  eventoInfo: {
    padding: 16,
  },
  eventoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventoTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  eventoLocal: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  precioContainer: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  precioTexto: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  eventoDetalles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  detalleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detalleTexto: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  diasRestantesContainer: {
    marginTop: 8,
  },
  diasRestantesTexto: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  provinciasList: {
    maxHeight: 300,
  },
  provinciaItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: colors.background,
  },
  provinciaItemActive: {
    backgroundColor: colors.primary,
  },
  provinciaText: {
    fontSize: 15,
    color: colors.text,
  },
  provinciaTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  dateInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  dateInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  limpiarButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  limpiarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  aplicarButtonModal: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  aplicarButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  aplicarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
