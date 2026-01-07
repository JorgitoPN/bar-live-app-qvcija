
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { calcularDistancia } from '@/utils/locationUtils';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  getSearchBoxHeight,
  getCategoryIconSize,
  getCategoryIconInnerSize,
  scaleFontSize,
  scaleIconSize,
} from '@/utils/androidScaling';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';
import { getEstadoLocal } from '@/utils/timeUtils';
import LoginPrompt from '@/components/common/LoginPrompt';
import { IconSymbol } from '@/components/IconSymbol';
import { getCategoryIcon } from '@/utils/categoryIcons';

const ITEMS_PER_PAGE = 20;
const HEADER_MAX_HEIGHT = 280;
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
  { id: 'todas', nombre: 'Todas', emoji: '🎉' },
  { id: 'cafe', nombre: 'Cafés', emoji: '☕' },
  { id: 'restaurante', nombre: 'Restaurantes', emoji: '🍽️' },
  { id: 'bar', nombre: 'Bares', emoji: '🍺' },
  { id: 'pub', nombre: 'Pubs', emoji: '🍻' },
  { id: 'cocteleria', nombre: 'Coctelería', emoji: '🍸' },
  { id: 'discoteca', nombre: 'Discotecas', emoji: '💃' },
];

export default function ExplorarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState('Todas');
  const [allLocales, setAllLocales] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -HEADER_SCROLL_DISTANCE],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    })();
  }, []);

  const loadLocales = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('locales')
        .select('*')
        .eq('activo', true)
        .order('destacado', { ascending: false })
        .order('nombre', { ascending: true });

      if (error) throw error;
      setAllLocales(data || []);
    } catch (error) {
      console.error('Error loading locales:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLocales();
  }, [loadLocales]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLocales();
  };

  const filteredLocales = useMemo(() => {
    return allLocales.filter((local) => {
      const matchSearch = local.nombre.toLowerCase().includes(searchQuery.toLowerCase());
      const matchProvincia = provinciaSeleccionada === 'Todas' || local.provincia === provinciaSeleccionada;
      
      let matchCategory = true;
      if (selectedCategory !== 'todas') {
        const localTypes = local.barlive_types || (local.barlive_type ? [local.barlive_type] : []);
        matchCategory = localTypes.some((type: string) => 
          type.toLowerCase().includes(selectedCategory.toLowerCase())
        );
      }

      return matchSearch && matchProvincia && matchCategory;
    });
  }, [allLocales, searchQuery, provinciaSeleccionada, selectedCategory]);

  const paginatedLocales = useMemo(() => {
    return filteredLocales.slice(0, currentPage * ITEMS_PER_PAGE);
  }, [filteredLocales, currentPage]);

  const handleComoLlegar = (local: any, e: any) => {
    e.stopPropagation();
    if (!local.latitud || !local.longitud) {
      Alert.alert('Error', 'No hay coordenadas disponibles para este local');
      return;
    }
    const url = Platform.select({
      ios: `maps:0,0?q=${local.latitud},${local.longitud}`,
      android: `geo:0,0?q=${local.latitud},${local.longitud}(${encodeURIComponent(local.nombre)})`,
    });
    if (url) Linking.openURL(url);
  };

  const handlePerfilSocial = (localId: string, e: any) => {
    e.stopPropagation();
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push(`/perfil/local?localId=${localId}` as any);
  };

  const renderLocalCard = ({ item }: { item: any }) => {
    const distancia = userLocation && item.latitud && item.longitud
      ? calcularDistancia(
          userLocation.latitude,
          userLocation.longitude,
          item.latitud,
          item.longitud
        )
      : null;

    const estado = getEstadoLocal(item.horarios_completos, item.google_business_status);

    return (
      <TouchableOpacity
        style={styles.localCard}
        onPress={() => router.push(`/detalle/local?id=${item.id}` as any)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.imagen_url || 'https://via.placeholder.com/400x200' }}
          style={styles.localImage}
          resizeMode="cover"
        />
        
        {item.destacado && (
          <View style={styles.destacadoBadge}>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.destacadoGradient}
            >
              <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={scaleIconSize(12)} color="#FFF" />
              <Text style={[styles.destacadoText, { fontSize: scaleFontSize(10) }]}>Destacado</Text>
            </LinearGradient>
          </View>
        )}

        <View style={styles.localInfo}>
          <View style={styles.localHeader}>
            <Text style={[styles.localName, { fontSize: scaleFontSize(16) }]} numberOfLines={1}>
              {item.nombre}
            </Text>
            {estado && (
              <View style={[styles.estadoBadge, estado.abierto ? styles.estadoAbierto : styles.estadoCerrado]}>
                <Text style={[styles.estadoText, { fontSize: scaleFontSize(10) }]}>
                  {estado.abierto ? 'Abierto' : 'Cerrado'}
                </Text>
              </View>
            )}
          </View>

          {item.direccion && (
            <Text style={[styles.localAddress, { fontSize: scaleFontSize(13) }]} numberOfLines={1}>
              📍 {item.direccion}
            </Text>
          )}

          {distancia && (
            <Text style={[styles.localDistance, { fontSize: scaleFontSize(12) }]}>
              📏 {distancia.toFixed(1)} km
            </Text>
          )}

          <View style={styles.localActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => handleComoLlegar(item, e)}
            >
              <IconSymbol ios_icon_name="location.fill" android_material_icon_name="directions" size={scaleIconSize(18)} color={colors.primary} />
              <Text style={[styles.actionText, { fontSize: scaleFontSize(12) }]}>Cómo llegar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => handlePerfilSocial(item.id, e)}
            >
              <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={scaleIconSize(18)} color={colors.primary} />
              <Text style={[styles.actionText, { fontSize: scaleFontSize(12) }]}>Perfil</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (paginatedLocales.length >= filteredLocales.length) return null;
    return (
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={() => setCurrentPage(prev => prev + 1)}
      >
        <Text style={[styles.loadMoreText, { fontSize: scaleFontSize(14) }]}>Cargar más</Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyStateText, { fontSize: scaleFontSize(16) }]}>
        No se encontraron locales
      </Text>
    </View>
  );

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

  const searchBoxHeight = getSearchBoxHeight();
  const categoryIconSize = getCategoryIconSize();
  const categoryIconInnerSize = getCategoryIconInnerSize();

  const HeaderContent = () => (
    <React.Fragment>
      <Text style={[commonStyles.headerTitle, { color: colors.white, fontSize: scaleFontSize(32) }]}>
        Explorar
      </Text>

      <View style={[styles.searchContainer, { height: searchBoxHeight }]}>
        <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={scaleIconSize(20)} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { 
            fontSize: scaleFontSize(16),
            textAlignVertical: Platform.OS === 'android' ? 'center' : 'auto',
            paddingVertical: Platform.OS === 'android' ? 0 : 12,
          }]}
          placeholder="Buscar locales..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity onPress={() => setShowFiltersModal(true)}>
          <IconSymbol ios_icon_name="slider.horizontal.3" android_material_icon_name="tune" size={scaleIconSize(20)} color={colors.primary} />
        </TouchableOpacity>
      </View>

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

      {/* ✅ CRITICAL FIX: Banner sin fondo blanco en Android */}
      <TouchableOpacity
        style={styles.claimLocalBanner}
        onPress={() => router.push('/auth/local-ownership-request' as any)}
        activeOpacity={0.8}
      >
        <View style={styles.claimLocalIcon}>
          <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="business" size={scaleIconSize(24)} color={colors.primary} />
        </View>
        <View style={styles.claimLocalTextContainer}>
          <Text style={[styles.claimLocalTitle, { 
            fontSize: scaleFontSize(16),
            backgroundColor: 'transparent', // ✅ FIX: Fondo transparente en Android
          }]}>
            Reclama tu local o crea uno nuevo
          </Text>
          <Text style={[styles.claimLocalSubtitle, { 
            fontSize: scaleFontSize(13),
            backgroundColor: 'transparent', // ✅ FIX: Fondo transparente en Android
          }]}>
            ¿Eres propietario? Gestiona tu local en BarLive
          </Text>
        </View>
        <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={scaleIconSize(20)} color={colors.primary} />
      </TouchableOpacity>
    </React.Fragment>
  );

  return (
    <View style={commonStyles.container}>
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
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <HeaderContent />
          </LinearGradient>
        </Animated.View>
      ) : (
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={commonStyles.headerGradient}
        >
          <HeaderContent />
        </LinearGradient>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { fontSize: scaleFontSize(16) }]}>Cargando locales...</Text>
        </View>
      ) : (
        <FlatList
          data={paginatedLocales}
          renderItem={renderLocalCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            Platform.OS === 'android' && { marginTop: HEADER_MAX_HEIGHT },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          onScroll={Platform.OS === 'android' ? handleScroll : undefined}
          scrollEventThrottle={16}
        />
      )}

      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      <Modal
        visible={showFiltersModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowFiltersModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: scaleFontSize(20) }]}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowFiltersModal(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={scaleIconSize(24)} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
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
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.limpiarButton}
                onPress={() => {
                  setProvinciaSeleccionada('Todas');
                  setSelectedCategory('todas');
                }}
              >
                <Text style={[styles.limpiarButtonText, { fontSize: scaleFontSize(16) }]}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.aplicarButtonModal}
                onPress={() => setShowFiltersModal(false)}
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
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
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
  categoriesScroll: {
    marginTop: 12,
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
  categoryEmoji: {},
  categoriaLabel: {
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  categoriaLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  claimLocalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  claimLocalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimLocalTextContainer: {
    flex: 1,
  },
  claimLocalTitle: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  claimLocalSubtitle: {
    color: colors.textSecondary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  localCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  localImage: {
    width: '100%',
    height: 200,
  },
  destacadoBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  destacadoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  destacadoText: {
    color: '#FFF',
    fontWeight: '600',
  },
  localInfo: {
    padding: 16,
  },
  localHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  localName: {
    flex: 1,
    fontWeight: '700',
    color: colors.text,
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  estadoAbierto: {
    backgroundColor: '#10B981',
  },
  estadoCerrado: {
    backgroundColor: '#EF4444',
  },
  estadoText: {
    color: '#FFF',
    fontWeight: '600',
  },
  localAddress: {
    color: colors.textSecondary,
    marginBottom: 4,
  },
  localDistance: {
    color: colors.textSecondary,
    marginBottom: 12,
  },
  localActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.primary + '15',
  },
  actionText: {
    color: colors.primary,
    fontWeight: '600',
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
  loadMoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  loadMoreText: {
    color: colors.primary,
    fontWeight: '600',
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
