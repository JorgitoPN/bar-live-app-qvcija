
import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';
import { getEstadoLocal } from '@/utils/timeUtils';
import { getCategoryIcon } from '@/utils/categoryIcons';

const ITEMS_PER_PAGE = 20;

export default function FavoritosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [allSavedLocales, setAllSavedLocales] = useState<any[]>([]);
  const [displayedLocales, setDisplayedLocales] = useState<any[]>([]);
  const [filteredLocales, setFilteredLocales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const loadSavedLocales = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('[Favoritos] Cargando locales guardados...');
      const { data: savedLocalesData, error: localesError } = await supabase
        .from('locales_guardados')
        .select(`
          local_id,
          locales (
            id,
            nombre,
            direccion,
            provincia,
            latitud,
            longitud,
            imagen_url,
            galeria_urls,
            rating,
            tipo,
            barlive_type,
            barlive_types,
            horarios_completos,
            estado_actual,
            destacado,
            nuevo
          )
        `)
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false });

      if (localesError) throw localesError;

      if (savedLocalesData) {
        const formattedLocales = savedLocalesData
          .filter(sl => sl.locales)
          .map((sl: any) => {
            const local = sl.locales;
            return {
              ...local,
              coordenadas: {
                lat: parseFloat(local.latitud),
                lng: parseFloat(local.longitud),
              },
              imagenes: local.galeria_urls || (local.imagen_url ? [local.imagen_url] : []),
            };
          });
        
        setAllSavedLocales(formattedLocales);
        setFilteredLocales(formattedLocales);
        
        // Load first page
        const firstPage = formattedLocales.slice(0, ITEMS_PER_PAGE);
        setDisplayedLocales(firstPage);
        setCurrentPage(1);
        setHasMore(formattedLocales.length > ITEMS_PER_PAGE);
        
        console.log('[Favoritos] Locales guardados cargados:', formattedLocales.length);
      }
    } catch (error) {
      console.error('[Favoritos] Error cargando locales guardados:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSavedLocales();

    if (user) {
      // Subscribe to changes in saved locales
      const savedLocalesChannel = supabase
        .channel('user-saved-locales-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'locales_guardados',
            filter: `usuario_id=eq.${user.id}`,
          },
          () => {
            console.log('[Favoritos] Saved locales changed, reloading...');
            loadSavedLocales();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(savedLocalesChannel);
      };
    }
  }, [user, loadSavedLocales]);

  // Predictive search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredLocales(allSavedLocales);
      const firstPage = allSavedLocales.slice(0, ITEMS_PER_PAGE);
      setDisplayedLocales(firstPage);
      setCurrentPage(1);
      setHasMore(allSavedLocales.length > ITEMS_PER_PAGE);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = allSavedLocales.filter(local => {
      const nombre = local.nombre?.toLowerCase() || '';
      const direccion = local.direccion?.toLowerCase() || '';
      const provincia = local.provincia?.toLowerCase() || '';
      const tipo = local.tipo?.toLowerCase() || '';
      
      return nombre.includes(query) || 
             direccion.includes(query) || 
             provincia.includes(query) ||
             tipo.includes(query);
    });

    setFilteredLocales(filtered);
    const firstPage = filtered.slice(0, ITEMS_PER_PAGE);
    setDisplayedLocales(firstPage);
    setCurrentPage(1);
    setHasMore(filtered.length > ITEMS_PER_PAGE);
    
    console.log('[Favoritos] Búsqueda:', query, 'Resultados:', filtered.length);
  }, [searchQuery, allSavedLocales]);

  const loadMoreLocales = useCallback(() => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    
    setTimeout(() => {
      const nextPage = currentPage + 1;
      const startIndex = currentPage * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const nextItems = filteredLocales.slice(startIndex, endIndex);
      
      if (nextItems.length > 0) {
        setDisplayedLocales(prev => [...prev, ...nextItems]);
        setCurrentPage(nextPage);
        setHasMore(endIndex < filteredLocales.length);
        console.log('[Favoritos] Cargando más locales, página:', nextPage);
      } else {
        setHasMore(false);
      }
      
      setLoadingMore(false);
    }, 300);
  }, [currentPage, filteredLocales, loadingMore, hasMore]);

  const onRefresh = async () => {
    setRefreshing(true);
    setSearchQuery('');
    await loadSavedLocales();
    setRefreshing(false);
  };

  const toggleFavorito = async (localId: string) => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para gestionar favoritos');
      return;
    }

    try {
      // Remove from favorites
      const { error } = await supabase
        .from('locales_guardados')
        .delete()
        .eq('usuario_id', user.id)
        .eq('local_id', localId);

      if (error) throw error;

      // Reload the list
      await loadSavedLocales();
    } catch (error) {
      console.error('Error removing favorito:', error);
      Alert.alert('Error', 'No se pudo eliminar de favoritos');
    }
  };

  const renderLocalCard = ({ item }: { item: any }) => {
    const estado = getEstadoLocal(item);
    const imagenPrincipal = item.imagenes?.[0] || item.imagen_url;
    const isDestacado = item.destacado;

    const getBadgeColor = () => {
      if (estado.badge === 'Abierto ahora' || estado.badge === 'Abierto 24h') {
        return '#22C55E';
      }
      if (estado.badge === 'Cierra pronto') {
        return '#F97316';
      }
      if (estado.badge === 'Abre pronto') {
        return '#EAB308';
      }
      if (estado.estaAbierto === false) {
        return '#EF4444';
      }
      return '#9CA3AF';
    };

    const getBadgeText = () => {
      if (estado.badge === 'Abierto 24h') {
        return 'Abierto 24h';
      }
      
      if (estado.tiempoRestante) {
        if (estado.badge === 'Abierto ahora') {
          return `Abierto ahora • Cierra en ${estado.tiempoRestante}`;
        }
        if (estado.badge === 'Cierra pronto') {
          return `Cierra en ${estado.tiempoRestante}`;
        }
        if (estado.badge === 'Abre pronto') {
          return `Abre en ${estado.tiempoRestante}`;
        }
        return `${estado.badge} • ${estado.tiempoRestante}`;
      }
      return estado.badge;
    };

    const shouldDimImage = () => {
      return estado.estaAbierto === false || estado.estaAbierto === null;
    };

    const formatCategories = () => {
      const CATEGORIAS_EXCLUIDAS = ['terrazas', 'rooftops', 'lounge'];
      let categories = item.barlive_types || [];
      if (categories.length === 0 && item.barlive_type) {
        categories = [item.barlive_type];
      }
      
      return categories.filter((cat: string) => 
        !CATEGORIAS_EXCLUIDAS.includes(cat.toLowerCase())
      );
    };

    const categoriasAMostrar = formatCategories();

    const getRating = () => {
      if (item.rating && item.rating > 0) {
        return item.rating;
      }
      if (item.google_rating && item.google_rating > 0) {
        return item.google_rating;
      }
      if (item.valoracion_google && item.valoracion_google > 0) {
        return item.valoracion_google;
      }
      return 0;
    };

    const displayRating = getRating();

    return (
      <TouchableOpacity 
        style={[
          styles.card,
          isDestacado && styles.cardDestacado
        ]} 
        onPress={() => router.push(`/detalle/local?id=${item.id}`)}
        activeOpacity={0.9}
      >
        {/* Imagen */}
        <View style={styles.imageContainer}>
          {imagenPrincipal ? (
            <Image
              source={{ uri: imagenPrincipal }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.image, styles.placeholderImage]}>
              <IconSymbol name="photo" size={48} color={colors.textSecondary} />
            </View>
          )}

          {/* Dimmed overlay for closed/no info locals */}
          {shouldDimImage() && (
            <View style={styles.dimmedOverlay} />
          )}

          {/* Gradient overlay for better text visibility */}
          <View style={styles.imageOverlay} />

          {/* Badge "Destacado" */}
          {isDestacado && (
            <View style={styles.badgeDestacadoHeader}>
              <IconSymbol name="star.fill" size={14} color="#92400E" />
              <Text style={styles.badgeDestacadoHeaderText}>Destacado</Text>
            </View>
          )}

          {/* Badge de estado */}
          <View style={[
            styles.badgeEstadoSuperior, 
            { backgroundColor: getBadgeColor() + 'E6' },
            isDestacado && styles.badgeEstadoSuperiorConDestacado
          ]}>
            <Text style={styles.badgeEstadoSuperiorText} numberOfLines={1}>{getBadgeText()}</Text>
          </View>

          {/* Valoración */}
          {displayRating > 0 && (
            <View style={styles.ratingBadge}>
              <IconSymbol name="star.fill" size={12} color="#FACC15" />
              <Text style={styles.ratingBadgeText}>{displayRating.toFixed(1)}</Text>
            </View>
          )}

          {/* Badge nuevo */}
          {item.nuevo && (
            <View style={styles.badgeNuevoContainer}>
              <View style={styles.badgeNuevo}>
                <Text style={styles.badgeNuevoText}>Nuevo</Text>
              </View>
            </View>
          )}

          {/* ✅ NEW: Synchronized favorite button */}
          <TouchableOpacity
            style={styles.favoritoButton}
            onPress={(e) => {
              e.stopPropagation();
              toggleFavorito(item.id);
            }}
          >
            <IconSymbol
              name="heart.fill"
              size={20}
              color="#EF4444"
            />
          </TouchableOpacity>
        </View>

        {/* Contenido */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.nombre} numberOfLines={1}>
              {item.nombre}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol name="mappin" size={14} color={colors.textSecondary} />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.direccion}
            </Text>
          </View>

          {/* Categorías del local */}
          {categoriasAMostrar.length > 0 && (
            <View style={styles.categoriasContainer}>
              {categoriasAMostrar.map((categoria: string, index: number) => (
                <View key={index} style={styles.categoriaBadge}>
                  <Text style={styles.categoriaIcon}>{getCategoryIcon(categoria)}</Text>
                  <Text style={styles.categoriaText} numberOfLines={1}>{categoria}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.footerLoaderText}>Cargando más...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    
    if (searchQuery.trim() && filteredLocales.length === 0) {
      return (
        <View style={styles.emptyState}>
          <IconSymbol
            name="magnifyingglass"
            size={64}
            color={colors.textSecondary}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyText}>No se encontraron resultados</Text>
          <Text style={styles.emptySubtext}>
            Intenta con otros términos de búsqueda
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyState}>
        <IconSymbol
          name="heart"
          size={64}
          color={colors.textSecondary}
          style={styles.emptyIcon}
        />
        <Text style={styles.emptyText}>No tienes locales favoritos</Text>
        <Text style={styles.emptySubtext}>
          Explora locales y guarda tus favoritos tocando el ícono de corazón
        </Text>
      </View>
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Locales Favoritos</Text>
        </LinearGradient>

        <View style={styles.loginRequiredContainer}>
          <IconSymbol 
            name="heart.circle" 
            size={80} 
            color={colors.primary} 
            style={styles.loginRequiredIcon}
          />
          <Text style={styles.loginRequiredTitle}>
            Inicia sesión para ver tus favoritos
          </Text>
          <Text style={styles.loginRequiredText}>
            Regístrate o inicia sesión en BarLive para guardar tus locales favoritos
            y acceder a ellos desde cualquier dispositivo.
          </Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/auth/login-popup')}
            activeOpacity={0.7}
          >
            <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Locales Favoritos</Text>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando favoritos...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Locales Favoritos</Text>
        
        {/* Search bar */}
        <View style={styles.searchContainer}>
          <IconSymbol 
            name="magnifyingglass" 
            size={20} 
            color={colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar en favoritos..."
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
                name="xmark.circle.fill" 
                size={20} 
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Results count */}
        {allSavedLocales.length > 0 && (
          <Text style={styles.resultsCount}>
            {searchQuery.trim() 
              ? `${filteredLocales.length} de ${allSavedLocales.length} locales`
              : `${allSavedLocales.length} locales guardados`
            }
          </Text>
        )}
      </LinearGradient>

      <FlatList
        data={displayedLocales}
        renderItem={renderLocalCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={loadMoreLocales}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
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
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  resultsCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginTop: 4,
  },
  listContent: {
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
    fontSize: 16,
    color: colors.textSecondary,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerLoaderText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loginRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loginRequiredIcon: {
    marginBottom: 24,
  },
  loginRequiredTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  loginRequiredText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardDestacado: {
    borderWidth: 3,
    borderColor: '#FACC15',
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  badgeDestacadoHeader: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FACC15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 11,
  },
  badgeDestacadoHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  badgeEstadoSuperior: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
    maxWidth: '70%',
  },
  badgeEstadoSuperiorConDestacado: {
    top: 52,
  },
  badgeEstadoSuperiorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 12,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.headerText,
    letterSpacing: 0.3,
  },
  badgeNuevoContainer: {
    position: 'absolute',
    top: 56,
    right: 12,
    zIndex: 9,
  },
  badgeNuevo: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeNuevoText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.headerText,
  },
  favoritoButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nombre: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  categoriasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoriaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    maxWidth: '48%',
  },
  categoriaIcon: {
    fontSize: 12,
  },
  categoriaText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'capitalize',
    flexShrink: 1,
  },
});
