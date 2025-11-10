
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Modal,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import FiltrosAvanzadosSheet from '@/components/home/FiltrosAvanzadosSheet';
import { Local, Filtros } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import TarjetaLocal from '@/components/home/TarjetaLocal';
import { IconSymbol } from '@/components/IconSymbol';
import { useMode } from '@/contexts/ModeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, commonStyles } from '@/styles/commonStyles';
import * as Location from 'expo-location';
import { filterAndSortLocals } from '@/utils/filterLocals';

type ModoUsuario = 'cliente' | 'propietario' | 'admin';

const CATEGORIAS_LOCALES = [
  { id: 'todos', label: 'Todos', icon: 'mappin.circle.fill' },
  { id: 'cafe', label: 'Cafés', icon: 'cup.and.saucer.fill' },
  { id: 'restaurante', label: 'Restaurantes', icon: 'fork.knife' },
  { id: 'bar', label: 'Bares', icon: 'wineglass.fill' },
  { id: 'pub', label: 'Pubs', icon: 'mug.fill' },
  { id: 'cocteleria', label: 'Coctelería', icon: 'wineglass' },
  { id: 'discoteca', label: 'Discotecas', icon: 'music.note' },
];

// Categories to exclude from display
const CATEGORIAS_EXCLUIDAS = ['terrazas', 'rooftops', 'lounge'];

const LOCALES_POR_PAGINA = 20;
const HEADER_HEIGHT = Platform.OS === 'ios' ? 110 : 100;
const CATEGORIAS_HEIGHT = 120;

export default function ExplorarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode, setCurrentMode } = useMode();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Estado para TODOS los locales de la base de datos
  const [todosLosLocales, setTodosLosLocales] = useState<Local[]>([]);
  
  // Estado para locales visibles (paginados)
  const [localesVisibles, setLocalesVisibles] = useState<Local[]>([]);
  const [paginaActual, setPaginaActual] = useState(1);
  
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todos');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtrosActivos, setFiltrosActivos] = useState<Filtros>({});
  const [cargandoMas, setCargandoMas] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activePromotions, setActivePromotions] = useState<Set<string>>(new Set());
  const [mostrarSelectorModo, setMostrarSelectorModo] = useState(false);
  
  const scrollY = useRef(new Animated.Value(0)).current;

  // Determine available modes based on user role
  const userRole = user?.rol_app || 'cliente';
  const availableModes: ModoUsuario[] = 
    userRole === 'admin' ? ['cliente', 'propietario', 'admin'] :
    userRole === 'propietario' ? ['cliente', 'propietario'] :
    ['cliente'];

  const cargarTodosLosLocales = useCallback(async () => {
    try {
      setCargando(true);
      console.log('🔄 Cargando locales de la base de datos...');

      // Cargar locales activos
      const { data, error, count } = await supabase
        .from('locales')
        .select('*', { count: 'exact' })
        .eq('activo', true)
        .order('destacado', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error cargando locales:', error);
        return;
      }

      console.log(`✅ Cargados ${data?.length || 0} locales desde Supabase`);

      const localesTransformados: Local[] = (data || []).map(transformarLocal);
      setTodosLosLocales(localesTransformados);
    } catch (error) {
      console.error('❌ Error en cargarTodosLosLocales:', error);
    } finally {
      setCargando(false);
    }
  }, []);

  // Memoize filtered and sorted locals to avoid recalculating on every render
  const localesFiltradosCompletos = useMemo(() => {
    console.log('🔄 Aplicando filtros y ordenamiento...');

    // Construir filtros combinados
    const filtrosCombinados: Filtros = {
      ...filtrosActivos,
      busqueda: busqueda || undefined,
      tipo: categoriaSeleccionada !== 'todos' ? [categoriaSeleccionada] : filtrosActivos.tipo,
    };

    // Aplicar filtros y ordenamiento
    const localesOrdenados = filterAndSortLocals(
      todosLosLocales,
      filtrosCombinados,
      userLocation,
      activePromotions
    );

    console.log(`✅ Locales filtrados: ${localesOrdenados.length}`);
    return localesOrdenados;
  }, [todosLosLocales, busqueda, categoriaSeleccionada, filtrosActivos, userLocation, activePromotions]);

  // Update visible locals when filtered list changes
  useEffect(() => {
    setPaginaActual(1);
    setLocalesVisibles(localesFiltradosCompletos.slice(0, LOCALES_POR_PAGINA));
  }, [localesFiltradosCompletos]);

  useEffect(() => {
    cargarTodosLosLocales();
    obtenerUbicacionUsuario();
    cargarPromocionesActivas();
  }, [cargarTodosLosLocales]);

  const obtenerUbicacionUsuario = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
      console.log('📍 Ubicación del usuario obtenida');
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };

  const cargarPromocionesActivas = async () => {
    try {
      // Cargar suscripciones activas con promociones
      const { data, error } = await supabase
        .from('suscripciones_locales')
        .select('local_id, plan_id, planes_suscripcion(promos_destacadas)')
        .eq('estado', 'activa')
        .gt('planes_suscripcion.promos_destacadas', 0);

      if (error) {
        console.error('Error cargando promociones activas:', error);
        return;
      }

      const promotedLocalIds = new Set(data?.map((s: any) => s.local_id) || []);
      setActivePromotions(promotedLocalIds);
      console.log('💰 Promociones activas cargadas:', promotedLocalIds.size);
    } catch (error) {
      console.error('Error en cargarPromocionesActivas:', error);
    }
  };

  const transformarLocal = (local: any): Local => {
    // Filter out excluded categories
    let barliveTypes = local.barlive_types || [];
    barliveTypes = barliveTypes.filter((cat: string) => 
      !CATEGORIAS_EXCLUIDAS.includes(cat.toLowerCase())
    );
    
    // Also check barlive_type
    let barliveType = local.barlive_type;
    if (barliveType && CATEGORIAS_EXCLUIDAS.includes(barliveType.toLowerCase())) {
      barliveType = barliveTypes.length > 0 ? barliveTypes[0] : local.tipo;
    }
    
    return {
      id: local.id,
      nombre: local.nombre,
      tipo: local.tipo,
      descripcion: local.descripcion || '',
      direccion: local.direccion,
      ciudad: local.ciudad || '',
      provincia: local.provincia,
      coordenadas: {
        lat: parseFloat(local.latitud),
        lng: parseFloat(local.longitud),
      },
      imagenes: local.galeria_urls || (local.imagen_url ? [local.imagen_url] : []),
      rating: parseFloat(local.google_rating || local.rating || 0),
      precioMedio: local.precio_medio || 0,
      horarios: [],
      ambiente: local.ambiente || [],
      musica: local.musica || [],
      servicios: local.servicios || [],
      metodosPago: local.metodos_pago || [],
      destacado: local.destacado || false,
      nuevo: local.nuevo || false,
      abierto: local.abierto || false,
      popularidad: local.popularidad || 0,
      checkIns: local.check_ins || 0,
      seguidores: local.seguidores || 0,
      telefono: local.telefono,
      web: local.website,
      google_place_id: local.google_place_id,
      valoracion_google: parseFloat(local.google_rating || 0),
      numero_reviews_google: local.google_user_ratings_total || 0,
      website_url: local.website,
      tipos_google: local.tipos_google || [],
      nivel_precio_google: local.nivel_precio_google,
      google_maps_url: local.google_maps_url,
      descripcion_google: local.descripcion_google,
      horarios_completos: local.horarios_completos,
      estado_actual: local.estado_actual,
      estado_negocio: local.estado_negocio,
      servicios_disponibles: local.servicios_disponibles,
      ambiente_google: local.ambiente_completo,
      clientela: local.clientela,
      imagen_url: local.imagen_url,
      galeria_urls: local.galeria_urls || [],
      reviews_google: local.reviews_google,
      activo: local.activo,
      source_type: local.source_type,
      source_id: local.source_id,
      comunidad: local.comunidad,
      fecha_importacion_google: local.fecha_actualizacion,
      enriquecido: local.enriquecido,
      barlive_type: barliveType,
      barlive_types: barliveTypes,
    };
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await cargarTodosLosLocales();
    await cargarPromocionesActivas();
    setRefreshing(false);
  }, [cargarTodosLosLocales]);

  const handleModoChange = (modo: ModoUsuario) => {
    console.log('[ExplorarScreen] Cambio de modo:', modo);
    setCurrentMode(modo);
    setMostrarSelectorModo(false);
  };

  /**
   * Cargar más locales desde la lista filtrada completa
   */
  const cargarMasLocales = useCallback(() => {
    if (cargandoMas) return;

    const totalFiltrados = localesFiltradosCompletos.length;
    const totalVisibles = localesVisibles.length;

    // Si ya mostramos todos los locales filtrados, no hay más que cargar
    if (totalVisibles >= totalFiltrados) {
      return;
    }

    setCargandoMas(true);

    // Calcular el siguiente lote
    const siguientePagina = paginaActual + 1;
    const inicio = 0;
    const fin = siguientePagina * LOCALES_POR_PAGINA;

    // Obtener el siguiente lote de la lista filtrada completa
    const nuevosLocalesVisibles = localesFiltradosCompletos.slice(inicio, fin);

    setLocalesVisibles(nuevosLocalesVisibles);
    setPaginaActual(siguientePagina);
    setCargandoMas(false);
  }, [cargandoMas, localesFiltradosCompletos, localesVisibles, paginaActual]);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      cargarMasLocales();
    }
  };

  const getModoLabel = (modo: ModoUsuario): string => {
    switch (modo) {
      case 'cliente': return 'Cliente';
      case 'propietario': return 'Propietario';
      case 'admin': return 'Admin';
      default: return 'Cliente';
    }
  };

  const getModoIcon = (modo: ModoUsuario): any => {
    switch (modo) {
      case 'cliente': return 'person.fill';
      case 'propietario': return 'briefcase.fill';
      case 'admin': return 'gear';
      default: return 'person.fill';
    }
  };

  const hayMasLocalesParaMostrar = localesVisibles.length < localesFiltradosCompletos.length;

  return (
    <View style={commonStyles.container}>
      {/* Header con gradiente */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Explorar</Text>
          <View style={styles.headerActions}>
            {/* Selector de modo de usuario - solo si tiene múltiples modos disponibles */}
            {availableModes.length > 1 && (
              <TouchableOpacity
                style={styles.modoButton}
                onPress={() => setMostrarSelectorModo(true)}
              >
                <IconSymbol name={getModoIcon(currentMode)} size={20} color={colors.headerText} />
                <Text style={styles.modoButtonText}>{getModoLabel(currentMode)}</Text>
                <IconSymbol name="chevron.down" size={16} color={colors.headerText} />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.mapaButton}
              onPress={() => router.push('/explorar/mapa')}
            >
              <IconSymbol name="map.fill" size={24} color={colors.headerText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Barra de búsqueda */}
        <View style={styles.searchContainer}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar locales..."
            placeholderTextColor={colors.textSecondary}
            value={busqueda}
            onChangeText={setBusqueda}
          />
          <TouchableOpacity onPress={() => setMostrarFiltros(true)}>
            <IconSymbol name="line.3.horizontal.decrease.circle.fill" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Categorías horizontales */}
      <View style={styles.categoriasContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriasScroll}
        >
          {CATEGORIAS_LOCALES.map((categoria) => (
            <TouchableOpacity
              key={categoria.id}
              style={styles.categoriaButton}
              onPress={() => setCategoriaSeleccionada(categoria.id)}
            >
              <View
                style={[
                  styles.categoriaIconContainer,
                  categoriaSeleccionada === categoria.id && styles.categoriaIconContainerActive,
                ]}
              >
                <IconSymbol name={categoria.icon as any} size={28} color={colors.primary} />
              </View>
              <Text
                style={[
                  styles.categoriaLabel,
                  categoriaSeleccionada === categoria.id && styles.categoriaLabelActive,
                ]}
              >
                {categoria.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Lista de locales */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onScroll={handleScroll}
        scrollEventThrottle={400}
      >
        {cargando ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Cargando locales...</Text>
          </View>
        ) : localesVisibles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol name="mappin.slash" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No se encontraron locales</Text>
            <Text style={styles.emptySubtext}>Intenta ajustar los filtros de búsqueda</Text>
          </View>
        ) : (
          <>
            {localesVisibles.map((local) => (
              <TarjetaLocal
                key={local.id}
                local={local}
                destacado={local.destacado}
                userLocation={userLocation}
              />
            ))}
            {hayMasLocalesParaMostrar && (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingMoreText}>
                  Mostrando {localesVisibles.length} de {localesFiltradosCompletos.length}
                </Text>
              </View>
            )}
            {!hayMasLocalesParaMostrar && localesVisibles.length > 0 && (
              <View style={styles.endContainer}>
                <Text style={styles.endText}>
                  ✅ Mostrando todos los locales ({localesVisibles.length})
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Modal selector de modo */}
      <Modal
        visible={mostrarSelectorModo}
        transparent
        animationType="fade"
        onRequestClose={() => setMostrarSelectorModo(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMostrarSelectorModo(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cambiar modo de usuario</Text>
            <Text style={styles.modalSubtitle}>Selecciona cómo quieres usar BarLive</Text>
            
            {availableModes.map((modo) => (
              <TouchableOpacity
                key={modo}
                style={[
                  styles.modoOption,
                  currentMode === modo && styles.modoOptionActive,
                ]}
                onPress={() => handleModoChange(modo)}
              >
                <View style={styles.modoOptionLeft}>
                  <View style={[
                    styles.modoOptionIcon,
                    currentMode === modo && styles.modoOptionIconActive,
                  ]}>
                    <IconSymbol 
                      name={getModoIcon(modo)} 
                      size={24} 
                      color={currentMode === modo ? colors.headerText : colors.primary} 
                    />
                  </View>
                  <View>
                    <Text style={[
                      styles.modoOptionLabel,
                      currentMode === modo && styles.modoOptionLabelActive,
                    ]}>
                      {getModoLabel(modo)}
                    </Text>
                    <Text style={styles.modoOptionDescription}>
                      {modo === 'cliente' && 'Explora locales y eventos'}
                      {modo === 'propietario' && 'Gestiona tus locales'}
                      {modo === 'admin' && 'Administra la plataforma'}
                    </Text>
                  </View>
                </View>
                {currentMode === modo && (
                  <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <FiltrosAvanzadosSheet
        visible={mostrarFiltros}
        onClose={() => setMostrarFiltros(false)}
        filtros={filtrosActivos}
        onAplicarFiltros={(filtros) => {
          setFiltrosActivos(filtros);
          setMostrarFiltros(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  modoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
  },
  mapaButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.headerText,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  categoriasContainer: {
    backgroundColor: colors.background,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  categoriasScroll: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  categoriaButton: {
    alignItems: 'center',
    gap: 6,
    minWidth: 70,
  },
  categoriaIconContainer: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  categoriaIconContainerActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  categoriaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  categoriaLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  endContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  endText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  modoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  modoOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  modoOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modoOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modoOptionIconActive: {
    backgroundColor: colors.primary,
  },
  modoOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  modoOptionLabelActive: {
    color: colors.primary,
  },
  modoOptionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
