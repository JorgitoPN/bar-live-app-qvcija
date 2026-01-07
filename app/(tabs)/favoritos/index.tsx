
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  getSearchBoxHeight,
  getCategoryIconSize,
  getCategoryIconInnerSize,
  scaleFontSize,
  scaleIconSize,
} from '@/utils/androidScaling';
import LoginPrompt from '@/components/common/LoginPrompt';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { getEstadoLocal } from '@/utils/timeUtils';
import { getCategoryIcon } from '@/utils/categoryIcons';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';
import { calcularDistancia } from '@/utils/locationUtils';
import { IconSymbol } from '@/components/IconSymbol';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
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

const ITEMS_PER_PAGE = 20;
const HEADER_MAX_HEIGHT = 180;
const HEADER_MIN_HEIGHT = 60;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

const PROVINCIAS = [
  'Todas',
  'Madrid',
  'Barcelona',
  'Valencia',
  'Sevilla',
  'Zaragoza',
  'Málaga',
  'Murcia',
  'Palma',
  'Las Palmas',
  'Bilbao',
];

const CATEGORIAS = [
  { id: 'todos', label: 'Todos', icon: 'apps', color: colors.teal },
  { id: 'bar', label: 'Bares', icon: 'local_bar', color: colors.teal },
  { id: 'discoteca', label: 'Discotecas', icon: 'nightlife', color: colors.teal },
  { id: 'restaurante', label: 'Restaurantes', icon: 'restaurant', color: colors.teal },
  { id: 'pub', label: 'Pubs', icon: 'sports_bar', color: colors.teal },
  { id: 'cafe', label: 'Cafés', icon: 'local_cafe', color: colors.teal },
  { id: 'terraza', label: 'Terrazas', icon: 'deck', color: colors.teal },
];

export default function FavoritosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [allSavedLocales, setAllSavedLocales] = useState<any[]>([]);
  const [filteredLocales, setFilteredLocales] = useState<any[]>([]);
  const [displayedLocales, setDisplayedLocales] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState('Todas');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

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

  const loadSavedLocales = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('favoritos')
        .select(`
          local_id,
          locales (
            id,
            nombre,
            tipo,
            direccion,
            provincia,
            imagen_url,
            latitud,
            longitud,
            horarios_completos,
            google_business_status,
            estado_actual,
            valoracion,
            google_rating,
            precio_medio,
            nivel_precio_google,
            barlive_types
          )
        `)
        .eq('usuario_id', user.id);

      if (error) throw error;

      const locales = data
        ?.map((fav: any) => fav.locales)
        .filter((local: any) => local !== null) || [];

      setAllSavedLocales(locales);
      setFilteredLocales(locales);
      setDisplayedLocales(locales.slice(0, ITEMS_PER_PAGE));
      setCurrentPage(1);
    } catch (error) {
      console.error('Error loading saved locales:', error);
      Alert.alert('Error', 'No se pudieron cargar los locales guardados');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSavedLocales();
  }, [user, loadSavedLocales]);

  useEffect(() => {
    let filtered = [...allSavedLocales];

    if (selectedCategory !== 'todos') {
      filtered = filtered.filter((local) => {
        const tipos = local.barlive_types || [local.tipo];
        return tipos.some((t: string) => t?.toLowerCase() === selectedCategory.toLowerCase());
      });
    }

    if (provinciaSeleccionada !== 'Todas') {
      filtered = filtered.filter((local) => local.provincia === provinciaSeleccionada);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (local) =>
          local.nombre?.toLowerCase().includes(query) ||
          local.direccion?.toLowerCase().includes(query) ||
          local.provincia?.toLowerCase().includes(query)
      );
    }

    setFilteredLocales(filtered);
    setDisplayedLocales(filtered.slice(0, ITEMS_PER_PAGE));
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, provinciaSeleccionada, allSavedLocales]);

  const loadMoreLocales = useCallback(() => {
    if (displayedLocales.length >= filteredLocales.length) return;

    const nextPage = currentPage + 1;
    const newLocales = filteredLocales.slice(0, nextPage * ITEMS_PER_PAGE);
    setDisplayedLocales(newLocales);
    setCurrentPage(nextPage);
  }, [currentPage, displayedLocales.length, filteredLocales]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSavedLocales();
    setRefreshing(false);
  }, [loadSavedLocales]);

  const toggleFavorito = useCallback(
    async (localId: string) => {
      if (!user) {
        setShowLoginModal(true);
        return;
      }

      try {
        const { error } = await supabase
          .from('favoritos')
          .delete()
          .eq('usuario_id', user.id)
          .eq('local_id', localId);

        if (error) throw error;

        setAllSavedLocales((prev) => prev.filter((local) => local.id !== localId));
      } catch (error) {
        console.error('Error removing favorite:', error);
        Alert.alert('Error', 'No se pudo eliminar de favoritos');
      }
    },
    [user]
  );

  const handleComoLlegar = useCallback((local: any, e: any) => {
    e.stopPropagation();
    if (local.latitud && local.longitud) {
      const url = Platform.select({
        ios: `maps:0,0?q=${local.latitud},${local.longitud}`,
        android: `geo:0,0?q=${local.latitud},${local.longitud}(${encodeURIComponent(local.nombre)})`,
      });
      if (url) Linking.openURL(url);
    }
  }, []);

  const handlePerfilSocial = useCallback(
    (localId: string, e: any) => {
      e.stopPropagation();
      router.push(`/perfil/local?id=${localId}`);
    },
    [router]
  );

  const renderLocalCard = useCallback(
    ({ item }: { item: any }) => {
      const estado = getEstadoLocal(item.horarios_completos, item.google_business_status);
      const distancia = userLocation && item.latitud && item.longitud
        ? calcularDistancia(
            userLocation.latitude,
            userLocation.longitude,
            item.latitud,
            item.longitud
          )
        : null;

      return (
        <TouchableOpacity
          style={styles.localCard}
          onPress={() => router.push(`/detalle/local?id=${item.id}`)}
          activeOpacity={0.7}
        >
          <Image
            source={{ uri: item.imagen_url || 'https://via.placeholder.com/150' }}
            style={styles.localImage}
          />
          <View style={styles.localInfo}>
            <View style={styles.localHeader}>
              <Text style={styles.localNombre} numberOfLines={1}>
                {item.nombre}
              </Text>
              <TouchableOpacity
                onPress={() => toggleFavorito(item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <IconSymbol
                  android_material_icon_name="favorite"
                  ios_icon_name="heart.fill"
                  size={scaleIconSize(20)}
                  color={colors.teal}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.localDetails}>
              <Text style={styles.localDireccion} numberOfLines={1}>
                {item.direccion || 'Sin dirección'}
              </Text>
              {distancia && (
                <Text style={styles.distancia}>{distancia.toFixed(1)} km</Text>
              )}
            </View>

            <View style={styles.localFooter}>
              <View style={[styles.estadoBadge, estado.color === 'green' ? styles.estadoAbierto : styles.estadoCerrado]}>
                <Text style={styles.estadoTexto}>{estado.texto}</Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={(e) => handleComoLlegar(item, e)}
                >
                  <IconSymbol
                    android_material_icon_name="directions"
                    ios_icon_name="arrow.triangle.turn.up.right.diamond"
                    size={scaleIconSize(18)}
                    color={colors.teal}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={(e) => handlePerfilSocial(item.id, e)}
                >
                  <IconSymbol
                    android_material_icon_name="person"
                    ios_icon_name="person.circle"
                    size={scaleIconSize(18)}
                    color={colors.teal}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [userLocation, router, toggleFavorito, handleComoLlegar, handlePerfilSocial]
  );

  const renderFooter = useCallback(() => {
    if (displayedLocales.length >= filteredLocales.length) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.teal} />
      </View>
    );
  }, [displayedLocales.length, filteredLocales.length]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <IconSymbol
          android_material_icon_name="favorite_border"
          ios_icon_name="heart"
          size={scaleIconSize(64)}
          color={colors.textSecondary}
        />
        <Text style={styles.emptyText}>
          {!user
            ? 'Inicia sesión para guardar tus locales favoritos'
            : 'No tienes locales guardados'}
        </Text>
        {!user && (
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => setShowLoginModal(true)}
          >
            <Text style={styles.loginButtonText}>Iniciar sesión</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [loading, user]);

  const HeaderContent = useCallback(() => {
    const headerHeight = scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_DISTANCE],
      outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
      extrapolate: 'clamp',
    });

    const headerOpacity = scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
      outputRange: [1, 0.5, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <LinearGradient
          colors={['#0D9488', '#14B8A6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <Animated.View style={[styles.headerContent, { opacity: headerOpacity }]}>
          <Text style={styles.headerTitle}>Locales Favoritos</Text>
          <Text style={styles.headerSubtitle}>
            {filteredLocales.length} {filteredLocales.length === 1 ? 'local' : 'locales'}
          </Text>
        </Animated.View>

        <View style={styles.searchContainer}>
          <IconSymbol
            android_material_icon_name="search"
            ios_icon_name="magnifyingglass"
            size={scaleIconSize(20)}
            color={colors.textSecondary}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar locales..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <IconSymbol
                android_material_icon_name="close"
                ios_icon_name="xmark.circle.fill"
                size={scaleIconSize(20)}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIAS.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <View style={[
                styles.categoryIconContainer,
                selectedCategory === cat.id && styles.categoryIconContainerActive
              ]}>
                <IconSymbol
                  android_material_icon_name={cat.icon}
                  ios_icon_name={cat.icon}
                  size={getCategoryIconInnerSize()}
                  color={selectedCategory === cat.id ? '#FFFFFF' : cat.color}
                />
              </View>
              <Text
                style={[
                  styles.categoryLabel,
                  selectedCategory === cat.id && styles.categoryLabelActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    );
  }, [scrollY, searchQuery, selectedCategory, filteredLocales.length]);

  if (!user) {
    return <LoginPrompt />;
  }

  return (
    <View style={styles.container}>
      <HeaderContent />
      <FlatList
        data={displayedLocales}
        renderItem={renderLocalCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.teal}
            colors={[colors.teal]}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        onEndReached={loadMoreLocales}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
      />
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
  header: {
    overflow: 'hidden',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerContent: {
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: scaleFontSize(28),
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: scaleFontSize(14),
    color: 'rgba(255, 255, 255, 0.9)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: getSearchBoxHeight(),
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: scaleFontSize(16),
    color: colors.text,
  },
  categoriesScroll: {
    marginTop: 5,
  },
  categoriesContent: {
    paddingRight: 20,
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginRight: 10,
    gap: 8,
  },
  categoryChipActive: {
    backgroundColor: colors.teal,
  },
  categoryIconContainer: {
    width: getCategoryIconSize(),
    height: getCategoryIconSize(),
    borderRadius: getCategoryIconSize() / 2,
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIconContainerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryLabel: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: colors.text,
  },
  categoryLabelActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 15,
    paddingTop: 10,
  },
  localCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  localImage: {
    width: 100,
    height: 120,
  },
  localInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  localHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  localNombre: {
    flex: 1,
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: colors.text,
    marginRight: 8,
  },
  localDetails: {
    marginBottom: 8,
  },
  localDireccion: {
    fontSize: scaleFontSize(13),
    color: colors.textSecondary,
    marginBottom: 4,
  },
  distancia: {
    fontSize: scaleFontSize(12),
    color: colors.teal,
    fontWeight: '500',
  },
  localFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  estadoAbierto: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  estadoCerrado: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  estadoTexto: {
    fontSize: scaleFontSize(11),
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: scaleFontSize(16),
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: colors.teal,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: scaleFontSize(16),
    fontWeight: '600',
  },
});
