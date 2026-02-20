
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useRouter, useFocusEffect } from 'expo-router';
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
  scaleIconSize,
  getStatusBarHeight,
  getHeaderHeight,
  getContentBottomPadding,
} from '@/utils/androidScaling';
import { navigationOptimizer } from '@/utils/performanceMonitor';

const { width } = Dimensions.get('window');

const HEADER_MAX_HEIGHT = Platform.OS === 'android' ? 170 : 210;
const HEADER_MIN_HEIGHT = 0;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

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
  { id: 'todas', nombre: 'Todas', iosIcon: 'sparkles', androidIcon: 'star' },
  { id: 'cafe', nombre: 'Cafés', iosIcon: 'cup.and.saucer.fill', androidIcon: 'local_cafe' },
  { id: 'restaurante', nombre: 'Restaurantes', iosIcon: 'fork.knife', androidIcon: 'restaurant' },
  { id: 'bar', nombre: 'Bares', iosIcon: 'wineglass.fill', androidIcon: 'local_bar' },
  { id: 'pub', nombre: 'Pubs', iosIcon: 'mug.fill', androidIcon: 'sports_bar' },
  { id: 'cocteleria', nombre: 'Coctelería', iosIcon: 'wineglass', androidIcon: 'liquor' },
  { id: 'discoteca', nombre: 'Discotecas', iosIcon: 'music.note', androidIcon: 'nightlife' },
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
 * ✅ EVENTOS SCREEN v342.0 - INSTANT LOADING & NAVIGATION
 * 
 * NEW CHANGES v342.0 (MAXIMUM PERFORMANCE):
 * - ✅ INSTANT: Screen renders immediately, no loading state
 * - ✅ ZERO-DELAY: All heavy operations deferred with requestAnimationFrame
 * - ✅ BACKGROUND: Data loads in background after UI is visible
 * - ✅ SMART: Only load data when tab is focused
 * - ✅ RESULT: Instant screen load, identical to guest mode
 */

export default function EventosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode } = useMode();
  const [tabActual, setTabActual] = useState<'hoy' | 'proximos'>('hoy');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState('Todas');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
  
  const [fechaInicio, setFechaInicio] = useState<Date | null>(null);
  const [fechaFin, setFechaFin] = useState<Date | null>(null);
  const [showDatePickerInicio, setShowDatePickerInicio] = useState(false);
  const [showDatePickerFin, setShowDatePickerFin] = useState(false);
  
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(false); // ✅ v342.0: Start with false for instant render
  const [refreshing, setRefreshing] = useState(false);

  const scrollY = useRef(0);
  const lastScrollY = useRef(0);
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  
  const hasLoadedOnceRef = useRef(false);
  const isFocusedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    
    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const query = supabase
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
        return;
      }

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
      // Silent error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ✅ v342.0: INSTANT load on focus
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      
      if (!hasLoadedOnceRef.current) {
        hasLoadedOnceRef.current = true;
        
        // ✅ v342.0: Defer data load to background (CRITICAL priority)
        navigationOptimizer.deferWithPriority(() => {
          cargarEventos();
        }, 'CRITICAL');
      }

      return () => {
        isFocusedRef.current = false;
      };
    }, [cargarEventos])
  );

  const onRefresh = () => {
    setRefreshing(true);
    cargarEventos();
  };

  const eventosFiltrados = eventos.filter((evento) => {
    const query = debouncedQuery.toLowerCase().trim();
    const matchBusqueda = evento.titulo.toLowerCase().includes(query);
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
    setSearchQuery('');
    setDebouncedQuery('');
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

  const formatDateShort = (date: Date | null): string => {
    if (!date) return 'Seleccionar';
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
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
              const { error } = await supabase
                .from('eventos')
                .update({ activo: false })
                .eq('id', eventoId);

              if (error) {
                throw error;
              }

              Alert.alert('Éxito', 'Evento eliminado correctamente');
              await cargarEventos();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo eliminar el evento');
            }
          },
        },
      ]
    );
  }, [user, canDeleteEvent, cargarEventos]);

  const handleScroll = useCallback((event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const diff = currentScrollY - lastScrollY.current;
    
    if (Math.abs(diff) > 5) {
      if (diff > 0 && currentScrollY > 50) {
        Animated.timing(headerTranslateY, {
          toValue: -HEADER_SCROLL_DISTANCE,
          duration: 250,
          useNativeDriver: true,
        }).start();
      } else if (diff < 0) {
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    }
    
    lastScrollY.current = currentScrollY;
    scrollY.current = currentScrollY;
  }, [headerTranslateY]);

  const searchBoxHeight = getSearchBoxHeight();
  const categoryIconSize = getCategoryIconSize();
  const categoryIconInnerSize = getCategoryIconInnerSize();

  return (
    <View style={commonStyles.container}>
      <Animated.View
        style={[
          styles.headerContainer,
          {
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <View style={styles.compactSearchRow}>
            <View style={styles.searchContainer}>
              <IconSymbol 
                ios_icon_name="magnifyingglass" 
                android_material_icon_name="search" 
                size={scaleIconSize(18)} 
                color={colors.textSecondary} 
              />
              <TextInput
                style={[styles.searchInput, { 
                  fontSize: scaleFontSize(15),
                }]}
                placeholder="Buscar eventos..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                blurOnSubmit={false}
                enablesReturnKeyAutomatically={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => {
                    setSearchQuery('');
                    setDebouncedQuery('');
                  }}
                  style={styles.clearButton}
                  activeOpacity={0.7}
                >
                  <IconSymbol 
                    ios_icon_name="xmark.circle.fill" 
                    android_material_icon_name="cancel"
                    size={scaleIconSize(18)} 
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity 
              onPress={() => setMostrarFiltros(true)}
              style={styles.filterIconButtonCompact}
              activeOpacity={0.7}
            >
              <IconSymbol 
                ios_icon_name="slider.horizontal.3" 
                android_material_icon_name="tune" 
                size={scaleIconSize(20)} 
                color={colors.headerText} 
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

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
            contentContainerStyle={styles.categoriesContent}
            keyboardShouldPersistTaps="handled"
          >
            {CATEGORIAS.map((categoria) => (
              <TouchableOpacity
                key={categoria.id}
                style={styles.categoriaButtonCompact}
                onPress={() => setCategoriaSeleccionada(categoria.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.categoriaIconContainerCompact,
                    categoriaSeleccionada === categoria.id && styles.categoriaIconContainerActive,
                  ]}
                >
                  <IconSymbol
                    ios_icon_name={categoria.iosIcon}
                    android_material_icon_name={categoria.androidIcon}
                    size={Platform.OS === 'android' ? 16 : 18}
                    color={categoriaSeleccionada === categoria.id ? colors.primary : colors.white}
                  />
                </View>
                <Text
                  style={[
                    styles.categoriaLabelCompact,
                    categoriaSeleccionada === categoria.id && styles.categoriaLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {categoria.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </LinearGradient>
      </Animated.View>

      <ScrollView
        contentContainerStyle={[
          styles.eventosContainer,
          { 
            marginTop: HEADER_MAX_HEIGHT,
            paddingTop: 0,
            paddingBottom: getContentBottomPadding(100),
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { fontSize: scaleFontSize(16) }]}>Cargando eventos...</Text>
          </View>
        ) : eventosFiltrados.length === 0 ? (
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

      {canCreateEvents && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/crear/evento')}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={styles.fabGradient}
          >
            <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={scaleIconSize(28)} color={colors.white} />
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
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={scaleIconSize(24)} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              showsHorizontalScrollIndicator={false}
              bounces={false}
              keyboardShouldPersistTaps="handled"
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
                      <IconSymbol
                        ios_icon_name={categoria.iosIcon}
                        android_material_icon_name={categoria.androidIcon}
                        size={categoryIconInnerSize}
                        color={categoriaSeleccionada === categoria.id ? colors.white : colors.primary}
                      />
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
                      <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={scaleIconSize(18)} color={colors.primary} />
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
                      <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={scaleIconSize(18)} color={colors.primary} />
                      <Text style={[styles.dateButtonText, { fontSize: scaleFontSize(14) }]}>
                        {formatDate(fechaFin)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {fechaInicio && fechaFin && (
                  <View style={styles.dateRangeInfo}>
                    <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={scaleIconSize(16)} color={colors.primary} />
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
                                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={scaleIconSize(28)} color={colors.textSecondary} />
                              </TouchableOpacity>
                            </View>
                            <DateTimePicker
                              value={fechaInicio || new Date()}
                              mode="date"
                              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                              onChange={onChangeDateInicio}
                              minimumDate={new Date()}
                              textColor={colors.text}
                              themeVariant="light"
                              locale="es-ES"
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
                                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={scaleIconSize(28)} color={colors.textSecondary} />
                              </TouchableOpacity>
                            </View>
                            <DateTimePicker
                              value={fechaFin || fechaInicio || new Date()}
                              mode="date"
                              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                              onChange={onChangeDateFin}
                              minimumDate={fechaInicio || new Date()}
                              textColor={colors.text}
                              themeVariant="light"
                              locale="es-ES"
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
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? 36 : 50,
    paddingBottom: Platform.OS === 'android' ? 6 : 12,
    paddingHorizontal: 16,
  },
  compactSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Platform.OS === 'android' ? 6 : 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 6,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    padding: 0,
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
  },
  filterIconButtonCompact: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 8,
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
  eventosContainer: {
    padding: 16,
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
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
    gap: 16,
  },
  categoriaButtonCompact: {
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
  },
  categoriaIconContainerCompact: {
    width: Platform.OS === 'android' ? 36 : 40,
    height: Platform.OS === 'android' ? 36 : 40,
    borderRadius: Platform.OS === 'android' ? 9 : 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Platform.select({
      android: {
        elevation: 0,
      },
    }),
  },
  categoriaIconContainerActive: {
    borderColor: colors.white,
    backgroundColor: colors.white,
  },
  categoriaLabelCompact: {
    fontSize: Platform.OS === 'android' ? scaleFontSize(11) : 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  categoriaLabelActive: {
    color: colors.white,
    fontWeight: '700',
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
  categoryFilterText: {
    fontWeight: '600',
    color: colors.text,
  },
  categoryFilterTextActive: {
    color: colors.white,
  },
});
