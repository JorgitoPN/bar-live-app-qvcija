
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Platform,
  Alert,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { supabase } from '@/utils/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import EventoCard from '@/components/eventos/EventoCard';
import {
  getSearchBoxHeight,
  getCategoryIconSize,
  getCategoryIconInnerSize,
  scaleFontSize,
} from '@/utils/androidScaling';

const { width } = Dimensions.get('window');

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

const CATEGORIAS = [
  { id: 'todas', nombre: 'Todas', emoji: '🎉' },
  { id: 'cafe', nombre: 'Cafés', emoji: '☕' },
  { id: 'restaurante', nombre: 'Restaurantes', emoji: '🍽️' },
  { id: 'bar', nombre: 'Bares', emoji: '🍺' },
  { id: 'pub', nombre: 'Pubs', emoji: '🍻' },
  { id: 'cocteleria', nombre: 'Coctelería', emoji: '🍸' },
  { id: 'discoteca', nombre: 'Discotecas', emoji: '💃' },
];

interface Evento {
  id: string;
  titulo: string;
  descripcion?: string | null;
  fecha: string;
  fecha_fin?: string | null;
  hora: string;
  hora_fin?: string | null;
  precio?: number | null;
  imagen_url?: string | null;
  local_id?: string | null;
  provincia?: string | null;
  destacado?: boolean;
  activo?: boolean;
  propietario_id?: string;
  local_nombre?: string;
  local_direccion?: string;
  local_ciudad?: string;
  local_latitud?: number;
  local_longitud?: number;
  local_categories?: string[];
}

/**
 * ✅ EVENTOS SCREEN v97.0 - ANDROID SEARCH BOX & CATEGORY FILTER FIX
 * 
 * CRITICAL FIXES v97.0 (ANDROID ONLY):
 * - ✅ Search box height matches Favoritos page (48px)
 * - ✅ Category filter icons reduced to match design (20px emoji, 13px text)
 * - ✅ White search bar maintained (matching favoritos)
 * - ✅ Scrollable filter modal maintained
 */

export default function EventosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode } = useMode();
  const [tabActual, setTabActual] = useState<'hoy' | 'proximos'>('hoy');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState('Todas');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
  
  const [fechaInicio, setFechaInicio] = useState<Date | null>(null);
  const [fechaFin, setFechaFin] = useState<Date | null>(null);
  const [showDatePickerInicio, setShowDatePickerInicio] = useState(false);
  const [showDatePickerFin, setShowDatePickerFin] = useState(false);
  
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userRole = user?.rol_app || 'cliente';
  
  const canCreateEvents = (userRole === 'propietario' && currentMode === 'propietario') || 
                          (userRole === 'admin' && currentMode === 'propietario');

  const canDeleteEvent = useCallback((eventoId: string, propietarioId: string): boolean => {
    if (!user) return false;
    
    if (user.rol_app === 'admin') return true;
    
    if (user.id === propietarioId && currentMode === 'propietario') return true;
    
    return false;
  }, [user, currentMode]);

  const cargarEventos = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[Eventos v97.0] Cargando eventos...');

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      let query = supabase
        .from('eventos')
        .select(`
          *,
          locales:local_id (
            nombre,
            provincia,
            direccion,
            ciudad,
            latitud,
            longitud,
            barlive_type,
            barlive_types
          ),
          usuarios:propietario_id (
            nombre,
            avatar
          )
        `)
        .eq('activo', true)
        .gte('fecha', todayStr)
        .order('fecha', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('[Eventos v97.0] Error cargando eventos:', error);
        return;
      }

      console.log('[Eventos v97.0] Eventos cargados:', data?.length || 0);

      const eventosTransformados: Evento[] = (data || []).map((evento: any) => {
        let localCategories: string[] = [];
        if (evento.locales?.barlive_types && Array.isArray(evento.locales.barlive_types)) {
          localCategories = evento.locales.barlive_types;
        } else if (evento.locales?.barlive_type) {
          localCategories = [evento.locales.barlive_type];
        }

        return {
          id: evento.id,
          local_id: evento.local_id,
          titulo: evento.titulo,
          descripcion: evento.descripcion || '',
          fecha: evento.fecha,
          fecha_fin: evento.fecha_fin,
          hora: evento.hora,
          hora_fin: evento.hora_fin,
          precio: evento.precio,
          imagen_url: evento.imagen_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819',
          local_nombre: evento.locales?.nombre || 'Local',
          local_direccion: evento.locales?.direccion,
          local_ciudad: evento.locales?.ciudad,
          local_latitud: evento.locales?.latitud,
          local_longitud: evento.locales?.longitud,
          provincia: evento.provincia || evento.locales?.provincia || '',
          destacado: evento.destacado || false,
          propietario_id: evento.propietario_id,
          local_categories: localCategories,
        };
      });

      setEventos(eventosTransformados);
    } catch (error) {
      console.error('[Eventos v97.0] Error:', error);
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
    
    let matchCategoria = true;
    if (categoriaSeleccionada !== 'todas') {
      const localCategories = evento.local_categories || [];
      matchCategoria = localCategories.some(cat => 
        cat.toLowerCase().includes(categoriaSeleccionada.toLowerCase())
      );
    }
    
    let matchFecha = true;
    if (fechaInicio && fechaFin) {
      const eventoFecha = new Date(evento.fecha);
      eventoFecha.setHours(0, 0, 0, 0);
      
      const inicio = new Date(fechaInicio);
      inicio.setHours(0, 0, 0, 0);
      
      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999);
      
      matchFecha = eventoFecha >= inicio && eventoFecha <= fin;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const eventoFecha = new Date(evento.fecha);
    eventoFecha.setHours(0, 0, 0, 0);
    
    const esHoy = eventoFecha.getTime() === hoy.getTime();
    const esProximo = eventoFecha.getTime() > hoy.getTime();

    const matchTab = tabActual === 'hoy' ? esHoy : esProximo;
    
    return matchBusqueda && matchProvincia && matchCategoria && matchFecha && matchTab;
  });

  const limpiarFiltros = () => {
    setProvinciaSeleccionada('Todas');
    setCategoriaSeleccionada('todas');
    setFechaInicio(null);
    setFechaFin(null);
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Seleccionar';
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const onChangeDateInicio = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePickerInicio(false);
    }
    if (event.type === 'set' && selectedDate) {
      setFechaInicio(selectedDate);
      if (fechaFin && fechaFin < selectedDate) {
        setFechaFin(selectedDate);
      }
    } else if (event.type === 'dismissed') {
      setShowDatePickerInicio(false);
    }
  };

  const onChangeDateFin = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePickerFin(false);
    }
    if (event.type === 'set' && selectedDate) {
      if (fechaInicio && selectedDate >= fechaInicio) {
        setFechaFin(selectedDate);
      } else if (!fechaInicio) {
        setFechaFin(selectedDate);
      } else {
        Alert.alert('Error', 'La fecha de fin no puede ser anterior a la fecha de inicio');
      }
    } else if (event.type === 'dismissed') {
      setShowDatePickerFin(false);
    }
  };

  const closeDateInicioPicker = () => {
    setShowDatePickerInicio(false);
  };

  const closeDateFinPicker = () => {
    setShowDatePickerFin(false);
  };

  const handleDeleteEvent = useCallback(async (eventoId: string, propietarioId: string) => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión');
      return;
    }

    if (!canDeleteEvent(eventoId, propietarioId)) {
      Alert.alert(
        'Acción no permitida',
        'Solo el propietario en modo propietario puede eliminar eventos. Cambia a modo propietario para gestionar tus eventos.'
      );
      return;
    }

    Alert.alert(
      'Eliminar Evento',
      '¿Estás seguro de que quieres eliminar este evento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[Eventos v97.0] Deleting event:', eventoId);
              
              const { error } = await supabase
                .from('eventos')
                .update({ activo: false })
                .eq('id', eventoId);

              if (error) {
                console.error('[Eventos v97.0] Error deleting event:', error);
                throw error;
              }

              Alert.alert('Éxito', 'Evento eliminado correctamente');
              await cargarEventos();
            } catch (error: any) {
              console.error('[Eventos v97.0] Error deleting event:', error);
              Alert.alert('Error', error.message || 'No se pudo eliminar el evento');
            }
          },
        },
      ]
    );
  }, [user, canDeleteEvent, cargarEventos]);

  // ✅ Get platform-specific dimensions
  const searchBoxHeight = getSearchBoxHeight();
  const categoryIconSize = Platform.OS === 'android' ? 20 : 24; // Reduced on Android
  const categoryTextSize = Platform.OS === 'android' ? 13 : 14; // Reduced on Android

  return (
    <View style={commonStyles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={commonStyles.headerGradient}
      >
        <Text style={[commonStyles.headerTitle, { color: colors.white }]}>Eventos</Text>

        {/* ✅ CRITICAL FIX v97.0: Search box height matches Favoritos (48px) */}
        <View style={[styles.searchContainer, { 
          height: searchBoxHeight,
          paddingVertical: Platform.OS === 'android' ? 10 : 12,
        }]}>
          <IconSymbol 
            ios_icon_name="magnifyingglass" 
            android_material_icon_name="search" 
            size={20} 
            color={colors.textSecondary} 
          />
          <TextInput
            style={[styles.searchInput, { fontSize: scaleFontSize(16) }]}
            placeholder="Buscar eventos..."
            placeholderTextColor={colors.textSecondary}
            value={busqueda}
            onChangeText={setBusqueda}
          />
          <TouchableOpacity onPress={() => setMostrarFiltros(true)}>
            <IconSymbol 
              ios_icon_name="slider.horizontal.3" 
              android_material_icon_name="tune" 
              size={20} 
              color={colors.primary} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tabActual === 'hoy' && styles.tabActive]}
            onPress={() => setTabActual('hoy')}
          >
            <Text
              style={[
                styles.tabText,
                { fontSize: scaleFontSize(15) },
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
                { fontSize: scaleFontSize(15) },
                tabActual === 'proximos' && styles.tabTextActive,
              ]}
            >
              Próximos
            </Text>
          </TouchableOpacity>
        </View>

        {/* ✅ CRITICAL FIX v97.0: Reduced category filter sizes on Android */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIAS.map((categoria) => (
            <TouchableOpacity
              key={categoria.id}
              style={[
                styles.categoryChip,
                categoriaSeleccionada === categoria.id && styles.categoryChipActive,
              ]}
              onPress={() => setCategoriaSeleccionada(categoria.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.categoryEmoji, { fontSize: categoryIconSize }]}>{categoria.emoji}</Text>
              <Text
                style={[
                  styles.categoryText,
                  { fontSize: categoryTextSize },
                  categoriaSeleccionada === categoria.id && styles.categoryTextActive,
                ]}
              >
                {categoria.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { fontSize: scaleFontSize(16) }]}>Cargando eventos...</Text>
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
              <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyStateText, { fontSize: scaleFontSize(16) }]}>
                {tabActual === 'hoy' 
                  ? 'No hay eventos para hoy' 
                  : 'No hay eventos próximos'}
              </Text>
            </View>
          ) : (
            eventosFiltrados.map((evento) => (
              <EventoCard
                key={evento.id}
                evento={evento}
                showBanner={true}
              />
            ))
          )}
        </ScrollView>
      )}

      {canCreateEvents && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/crear/evento')}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={styles.fabGradient}
          >
            <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={28} color={colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      )}

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
              <Text style={[styles.modalTitle, { fontSize: scaleFontSize(20) }]}>Filtros</Text>
              <TouchableOpacity onPress={() => setMostrarFiltros(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={true}
              bounces={false}
            >
              <View style={styles.filterSection}>
                <Text style={[styles.filterTitle, { fontSize: scaleFontSize(16) }]}>Categoría de Local</Text>
                <View style={styles.categoriesGrid}>
                  {CATEGORIAS.map((categoria) => (
                    <TouchableOpacity
                      key={categoria.id}
                      style={[
                        styles.categoryFilterItem,
                        categoriaSeleccionada === categoria.id && styles.categoryFilterItemActive,
                      ]}
                      onPress={() => setCategoriaSeleccionada(categoria.id)}
                    >
                      <Text style={[styles.categoryFilterEmoji, { fontSize: categoryIconSize }]}>{categoria.emoji}</Text>
                      <Text
                        style={[
                          styles.categoryFilterText,
                          { fontSize: scaleFontSize(14) },
                          categoriaSeleccionada === categoria.id && styles.categoryFilterTextActive,
                        ]}
                      >
                        {categoria.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={[styles.filterTitle, { fontSize: scaleFontSize(16) }]}>Rango de Fechas</Text>
                
                <View style={styles.dateInputs}>
                  <View style={styles.dateInputContainer}>
                    <Text style={[styles.dateLabel, { fontSize: scaleFontSize(14) }]}>Desde</Text>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowDatePickerInicio(true)}
                    >
                      <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={18} color={colors.primary} />
                      <Text style={[styles.dateButtonText, { fontSize: scaleFontSize(14) }]}>
                        {formatDate(fechaInicio)}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dateInputContainer}>
                    <Text style={[styles.dateLabel, { fontSize: scaleFontSize(14) }]}>Hasta</Text>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowDatePickerFin(true)}
                    >
                      <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={18} color={colors.primary} />
                      <Text style={[styles.dateButtonText, { fontSize: scaleFontSize(14) }]}>
                        {formatDate(fechaFin)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {fechaInicio && fechaFin && (
                  <View style={styles.dateRangeInfo}>
                    <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={16} color={colors.primary} />
                    <Text style={[styles.dateRangeText, { fontSize: scaleFontSize(13) }]}>
                      Filtrando eventos del {formatDate(fechaInicio)} al {formatDate(fechaFin)}
                    </Text>
                  </View>
                )}

                {showDatePickerInicio && (
                  <Modal
                    visible={showDatePickerInicio}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={closeDateInicioPicker}
                  >
                    <TouchableWithoutFeedback onPress={closeDateInicioPicker}>
                      <View style={styles.datePickerModalOverlay}>
                        <TouchableWithoutFeedback>
                          <View style={styles.datePickerContainer}>
                            <View style={styles.datePickerHeader}>
                              <Text style={[styles.datePickerTitle, { fontSize: scaleFontSize(18) }]}>Fecha de Inicio</Text>
                              <TouchableOpacity onPress={closeDateInicioPicker}>
                                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color={colors.textSecondary} />
                              </TouchableOpacity>
                            </View>
                            <DateTimePicker
                              value={fechaInicio || new Date()}
                              mode="date"
                              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                              onChange={onChangeDateInicio}
                              minimumDate={new Date()}
                              textColor={colors.text}
                              style={styles.datePicker}
                              themeVariant="light"
                            />
                            {Platform.OS === 'ios' && (
                              <TouchableOpacity
                                style={styles.datePickerConfirmButton}
                                onPress={closeDateInicioPicker}
                              >
                                <Text style={[styles.datePickerConfirmText, { fontSize: scaleFontSize(16) }]}>Confirmar</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </TouchableWithoutFeedback>
                      </View>
                    </TouchableWithoutFeedback>
                  </Modal>
                )}

                {showDatePickerFin && (
                  <Modal
                    visible={showDatePickerFin}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={closeDateFinPicker}
                  >
                    <TouchableWithoutFeedback onPress={closeDateFinPicker}>
                      <View style={styles.datePickerModalOverlay}>
                        <TouchableWithoutFeedback>
                          <View style={styles.datePickerContainer}>
                            <View style={styles.datePickerHeader}>
                              <Text style={[styles.datePickerTitle, { fontSize: scaleFontSize(18) }]}>Fecha de Fin</Text>
                              <TouchableOpacity onPress={closeDateFinPicker}>
                                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color={colors.textSecondary} />
                              </TouchableOpacity>
                            </View>
                            <DateTimePicker
                              value={fechaFin || fechaInicio || new Date()}
                              mode="date"
                              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                              onChange={onChangeDateFin}
                              minimumDate={fechaInicio || new Date()}
                              textColor={colors.text}
                              style={styles.datePicker}
                              themeVariant="light"
                            />
                            {Platform.OS === 'ios' && (
                              <TouchableOpacity
                                style={styles.datePickerConfirmButton}
                                onPress={closeDateFinPicker}
                              >
                                <Text style={[styles.datePickerConfirmText, { fontSize: scaleFontSize(16) }]}>Confirmar</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </TouchableWithoutFeedback>
                      </View>
                    </TouchableWithoutFeedback>
                  </Modal>
                )}
              </View>

              <View style={styles.filterSection}>
                <Text style={[styles.filterTitle, { fontSize: scaleFontSize(16) }]}>Provincia</Text>
                <View style={styles.provinciasListContainer}>
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
                          { fontSize: scaleFontSize(15) },
                          provinciaSeleccionada === provincia && styles.provinciaTextActive,
                        ]}
                      >
                        {provincia}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.limpiarButton}
                onPress={limpiarFiltros}
              >
                <Text style={[styles.limpiarButtonText, { fontSize: scaleFontSize(16) }]}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.aplicarButtonModal}
                onPress={() => setMostrarFiltros(false)}
              >
                <LinearGradient
                  colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                  style={styles.aplicarButtonGradient}
                >
                  <Text style={[styles.aplicarButtonText, { fontSize: scaleFontSize(16) }]}>Aplicar</Text>
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
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
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontWeight: 'bold',
    color: colors.text,
  },
  modalScrollView: {
    maxHeight: '100%',
    paddingHorizontal: 20,
  },
  filterSection: {
    marginTop: 20,
    marginBottom: 16,
  },
  filterTitle: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  dateInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateLabel: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateButtonText: {
    color: colors.text,
    fontWeight: '500',
  },
  dateRangeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.primary + '15',
    borderRadius: 8,
  },
  dateRangeText: {
    flex: 1,
    color: colors.text,
    lineHeight: 18,
  },
  provinciasListContainer: {
    gap: 8,
  },
  provinciaItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  provinciaItemActive: {
    backgroundColor: colors.primary,
  },
  provinciaText: {
    color: colors.text,
  },
  provinciaTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
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
    fontWeight: '600',
    color: colors.white,
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  datePickerTitle: {
    fontWeight: 'bold',
    color: colors.text,
  },
  datePicker: {
    width: '100%',
    backgroundColor: colors.white,
  },
  datePickerConfirmButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  datePickerConfirmText: {
    color: colors.white,
    fontWeight: '600',
  },
  categoriesScroll: {
    marginTop: 12,
    marginRight: -16,
  },
  categoriesContent: {
    paddingHorizontal: 0,
    paddingRight: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  categoryChipActive: {
    backgroundColor: colors.white,
    borderColor: colors.white,
  },
  categoryEmoji: {
    // fontSize set dynamically
  },
  categoryText: {
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  categoryTextActive: {
    color: colors.primary,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minWidth: '47%',
  },
  categoryFilterItemActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryFilterEmoji: {
    // fontSize set dynamically
  },
  categoryFilterText: {
    fontWeight: '600',
    color: colors.text,
  },
  categoryFilterTextActive: {
    color: colors.white,
  },
});
