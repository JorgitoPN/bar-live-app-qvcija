
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';
import LoginPrompt from '@/components/common/LoginPrompt';
import EventoCard from '@/components/eventos/EventoCard';
import {
  getSearchBoxHeight,
  getCategoryIconSize,
  getCategoryIconInnerSize,
  scaleFontSize,
  scaleIconSize,
} from '@/utils/androidScaling';

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

// ✅ CRITICAL FIX v105.0: Category filters use ONLY emojis (match Explorar exactly)
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

// ✅ ANDROID HEADER SCROLL BEHAVIOR
const HEADER_MAX_HEIGHT = Platform.OS === 'android' ? 280 : 300;
const HEADER_MIN_HEIGHT = 0;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

/**
 * ✅ FAVORITOS EVENTOS SCREEN v105.0 - CATEGORY ICONS UNIFIED
 * 
 * CRITICAL FIX v105.0:
 * - ✅ Category filters now use ONLY emojis (match Explorar exactly)
 * - ✅ Same design and style as Lista de locales category filters
 * - ✅ Visual consistency across Explorar, Favoritos, and Eventos
 * - ✅ All text and icons properly scaled for Android
 * - ✅ iOS design remains unchanged
 */

export default function FavoritosEventosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [filteredEventos, setFilteredEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState('Todas');

  // ✅ ANDROID HEADER SCROLL BEHAVIOR
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -HEADER_SCROLL_DISTANCE],
    extrapolate: 'clamp',
  });

  const loadSavedEventos = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('[FavoritosEventos v105.0] Cargando eventos guardados...');
      
      const { data: savedEventosData, error: eventosError } = await supabase
        .from('eventos_guardados')
        .select(`
          evento_id,
          eventos (
            id,
            titulo,
            descripcion,
            fecha,
            fecha_fin,
            hora,
            hora_fin,
            precio,
            imagen_url,
            local_id,
            provincia,
            destacado,
            activo,
            propietario_id,
            locales (
              nombre,
              direccion,
              ciudad,
              latitud,
              longitud,
              barlive_type,
              barlive_types
            )
          )
        `)
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false });

      if (eventosError) throw eventosError;

      if (savedEventosData) {
        const formattedEventos = savedEventosData
          .filter(se => se.eventos && se.eventos.activo !== false)
          .map((se: any) => {
            const evento = se.eventos;
            const local = evento.locales;
            
            let localCategories: string[] = [];
            if (local?.barlive_types && Array.isArray(local.barlive_types)) {
              localCategories = local.barlive_types;
            } else if (local?.barlive_type) {
              localCategories = [local.barlive_type];
            }
            
            return {
              id: evento.id,
              titulo: evento.titulo,
              descripcion: evento.descripcion,
              fecha: evento.fecha,
              fecha_fin: evento.fecha_fin,
              hora: evento.hora,
              hora_fin: evento.hora_fin,
              precio: evento.precio,
              imagen_url: evento.imagen_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819',
              local_id: evento.local_id,
              provincia: evento.provincia || local?.ciudad || '',
              destacado: evento.destacado || false,
              activo: evento.activo,
              propietario_id: evento.propietario_id,
              local_nombre: local?.nombre || 'Local',
              local_direccion: local?.direccion,
              local_ciudad: local?.ciudad,
              local_latitud: local?.latitud,
              local_longitud: local?.longitud,
              local_categories: localCategories,
            };
          });
        
        setEventos(formattedEventos);
        setFilteredEventos(formattedEventos);
        
        console.log('[FavoritosEventos v105.0] Eventos guardados cargados:', formattedEventos.length);
      }
    } catch (error) {
      console.error('[FavoritosEventos v105.0] Error cargando eventos guardados:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSavedEventos();

    if (user) {
      const savedEventosChannel = supabase
        .channel('user-saved-eventos-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'eventos_guardados',
            filter: `usuario_id=eq.${user.id}`,
          },
          () => {
            console.log('[FavoritosEventos v105.0] Saved eventos changed, reloading...');
            loadSavedEventos();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(savedEventosChannel);
      };
    }
  }, [user, loadSavedEventos]);

  useEffect(() => {
    let filtered = [...eventos];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(evento => {
        const titulo = evento.titulo?.toLowerCase() || '';
        const descripcion = evento.descripcion?.toLowerCase() || '';
        const localNombre = evento.local_nombre?.toLowerCase() || '';
        
        return titulo.includes(query) || 
               descripcion.includes(query) || 
               localNombre.includes(query);
      });
    }

    if (selectedCategory !== 'todas') {
      filtered = filtered.filter(evento => {
        const localCategories = evento.local_categories || [];
        return localCategories.some(cat => 
          cat.toLowerCase().includes(selectedCategory.toLowerCase())
        );
      });
    }

    if (provinciaSeleccionada !== 'Todas') {
      filtered = filtered.filter(evento => evento.provincia === provinciaSeleccionada);
    }

    setFilteredEventos(filtered);
    
    console.log('[FavoritosEventos v105.0] Filters applied. Results:', filtered.length);
  }, [searchQuery, selectedCategory, provinciaSeleccionada, eventos]);

  const onRefresh = async () => {
    console.log('[FavoritosEventos v105.0] 🔄 Manual refresh triggered');
    setRefreshing(true);
    setSearchQuery('');
    setSelectedCategory('todas');
    setProvinciaSeleccionada('Todas');
    await loadSavedEventos();
    setRefreshing(false);
  };

  const clearFilters = useCallback(() => {
    console.log('[FavoritosEventos v105.0] 🧹 Clearing all filters');
    setSearchQuery('');
    setSelectedCategory('todas');
    setProvinciaSeleccionada('Todas');
  }, []);

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedCategory !== 'todas') count++;
    if (provinciaSeleccionada !== 'Todas') count++;
    return count;
  }, [searchQuery, selectedCategory, provinciaSeleccionada]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (event: any) => {
        if (Platform.OS !== 'android') return;
        
        const currentScrollY = event.nativeEvent.contentOffset.y;
        lastScrollY.current = currentScrollY;
      },
    }
  );

  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.headerGradient}
        >
          <Text style={[styles.headerTitle, { fontSize: scaleFontSize(32) }]}>Eventos Favoritos</Text>
        </LinearGradient>

        <LoginPrompt
          title="Inicia sesión para ver tus eventos favoritos"
          message="Regístrate o inicia sesión en BarLive para guardar eventos y acceder a ellos desde cualquier dispositivo."
          icon="calendar.circle"
          androidIcon="event"
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.headerGradient}
        >
          <Text style={[styles.headerTitle, { fontSize: scaleFontSize(32) }]}>Eventos Favoritos</Text>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { fontSize: scaleFontSize(16) }]}>Cargando eventos...</Text>
        </View>
      </View>
    );
  }

  // ✅ Get platform-specific dimensions
  const searchBoxHeight = getSearchBoxHeight();
  const categoryIconSize = getCategoryIconSize();
  const categoryIconInnerSize = getCategoryIconInnerSize();

  const HeaderContent = () => (
    <React.Fragment>
      <View style={styles.headerTop}>
        <Text style={[styles.headerTitle, { fontSize: scaleFontSize(32) }]}>Eventos Favoritos</Text>
        {activeFiltersCount > 0 && (
          <TouchableOpacity 
            style={styles.clearFiltersHeaderButton}
            onPress={clearFilters}
            activeOpacity={0.7}
          >
            <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={scaleIconSize(20)} color={colors.headerText} />
            <Text style={[styles.clearFiltersHeaderText, { fontSize: scaleFontSize(13) }]}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={[styles.searchContainer, { 
        height: searchBoxHeight,
        paddingVertical: Platform.OS === 'android' ? 10 : 10,
      }]}>
        <IconSymbol 
          ios_icon_name="magnifyingglass" 
          android_material_icon_name="search"
          size={scaleIconSize(20)} 
          color={colors.textSecondary}
        />
        <TextInput
          style={[styles.searchInput, { fontSize: scaleFontSize(16) }]}
          placeholder="Buscar eventos..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
            activeOpacity={0.7}
          >
            <IconSymbol 
              ios_icon_name="xmark.circle.fill" 
              android_material_icon_name="cancel"
              size={scaleIconSize(20)} 
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => setMostrarFiltros(true)}>
          <IconSymbol 
            ios_icon_name="slider.horizontal.3" 
            android_material_icon_name="tune" 
            size={scaleIconSize(20)} 
            color={colors.primary} 
          />
        </TouchableOpacity>
      </View>

      {/* ✅ CRITICAL FIX v105.0: Category filters use ONLY emojis (match Explorar) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIAS.map((categoria) => (
          <TouchableOpacity
            key={categoria.id}
            style={styles.categoriaButton}
            onPress={() => setSelectedCategory(categoria.id)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.categoriaIconContainer,
                {
                  width: categoryIconSize,
                  height: categoryIconSize,
                  borderRadius: categoryIconSize / 4,
                },
                selectedCategory === categoria.id && styles.categoriaIconContainerActive,
              ]}
            >
              <Text style={[styles.categoryEmoji, { fontSize: categoryIconInnerSize }]}>{categoria.emoji}</Text>
            </View>
            <Text
              style={[
                styles.categoriaLabel,
                { fontSize: scaleFontSize(12) },
                selectedCategory === categoria.id && styles.categoriaLabelActive,
              ]}
            >
              {categoria.nombre}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {eventos.length > 0 && (
        <View style={styles.resultsCountContainer}>
          <Text style={[styles.resultsCount, { fontSize: scaleFontSize(14) }]}>
            {activeFiltersCount > 0
              ? `${filteredEventos.length} de ${eventos.length} eventos`
              : `${filteredEventos.length} eventos guardados`
            }
          </Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterCountBadge}>
              <Text style={[styles.filterCountText, { fontSize: scaleFontSize(11) }]}>{activeFiltersCount}</Text>
            </View>
          )}
        </View>
      )}
    </React.Fragment>
  );

  return (
    <View style={styles.container}>
      {Platform.OS === 'android' ? (
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
            style={styles.headerGradient}
          >
            <HeaderContent />
          </LinearGradient>
        </Animated.View>
      ) : (
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.headerGradient}
        >
          <HeaderContent />
        </LinearGradient>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.eventosContainer,
          Platform.OS === 'android' && { marginTop: HEADER_MAX_HEIGHT },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        onScroll={Platform.OS === 'android' ? handleScroll : undefined}
        scrollEventThrottle={16}
      >
        {filteredEventos.length === 0 ? (
          <View style={styles.emptyState}>
            {activeFiltersCount > 0 ? (
              <>
                <IconSymbol
                  ios_icon_name="magnifyingglass"
                  android_material_icon_name="search"
                  size={64}
                  color={colors.textSecondary}
                />
                <Text style={[styles.emptyText, { fontSize: scaleFontSize(18) }]}>No se encontraron resultados</Text>
                <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14) }]}>
                  Intenta con otros filtros de búsqueda
                </Text>
                <TouchableOpacity 
                  style={styles.clearFiltersButton}
                  onPress={clearFilters}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.clearFiltersButtonText, { fontSize: scaleFontSize(14) }]}>Limpiar filtros</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="calendar"
                  android_material_icon_name="event"
                  size={64}
                  color={colors.textSecondary}
                />
                <Text style={[styles.emptyText, { fontSize: scaleFontSize(18) }]}>No tienes eventos favoritos</Text>
                <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14) }]}>
                  Explora eventos y guarda tus favoritos tocando el ícono de corazón
                </Text>
              </>
            )}
          </View>
        ) : (
          filteredEventos.map((evento) => (
            <EventoCard
              key={evento.id}
              evento={evento}
              showBanner={true}
            />
          ))
        )}
      </ScrollView>

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
            >
              <View style={styles.filterSection}>
                <Text style={[styles.filterTitle, { fontSize: scaleFontSize(16) }]}>Categoría de Local</Text>
                <View style={styles.categoriesGrid}>
                  {CATEGORIAS.map((categoria) => (
                    <TouchableOpacity
                      key={categoria.id}
                      style={[
                        styles.categoryFilterItem,
                        selectedCategory === categoria.id && styles.categoryFilterItemActive,
                      ]}
                      onPress={() => setSelectedCategory(categoria.id)}
                    >
                      <Text style={[styles.categoryFilterEmoji, { fontSize: categoryIconInnerSize }]}>{categoria.emoji}</Text>
                      <Text
                        style={[
                          styles.categoryFilterText,
                          { fontSize: scaleFontSize(14) },
                          selectedCategory === categoria.id && styles.categoryFilterTextActive,
                        ]}
                      >
                        {categoria.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
                onPress={() => {
                  setSelectedCategory('todas');
                  setProvinciaSeleccionada('Todas');
                }}
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

      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: colors.headerText,
  },
  clearFiltersHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  clearFiltersHeaderText: {
    fontWeight: '600',
    color: colors.headerText,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
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
  categoriesScroll: {
    marginBottom: 12,
    marginRight: -16,
  },
  categoriesContent: {
    paddingHorizontal: 0,
    paddingRight: 16,
    gap: 16,
  },
  categoriaButton: {
    alignItems: 'center',
    gap: 6,
    minWidth: 70,
  },
  categoriaIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  categoriaIconContainerActive: {
    borderColor: colors.white,
    backgroundColor: colors.white,
  },
  categoryEmoji: {
    // fontSize set dynamically
  },
  categoriaLabel: {
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  categoriaLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  resultsCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultsCount: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  filterCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterCountText: {
    fontWeight: '800',
    color: colors.headerText,
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
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  clearFiltersButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  clearFiltersButtonText: {
    fontWeight: '600',
    color: colors.headerText,
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
});
