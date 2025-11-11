
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import TarjetaLocal from '@/components/home/TarjetaLocal';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';

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
        renderItem={({ item }) => (
          <TarjetaLocal
            local={item}
            userLocation={null}
          />
        )}
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
});
