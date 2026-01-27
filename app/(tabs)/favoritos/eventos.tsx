
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import LoginPrompt from '@/components/common/LoginPrompt';
import {
  scaleFontSize,
  scaleIconSize,
  getSearchBoxHeight,
} from '@/utils/androidScaling';

interface Evento {
  id: string;
  titulo: string;
  descripcion?: string;
  fecha: string;
  fecha_fin?: string | null;
  hora: string;
  hora_fin?: string | null;
  precio?: number;
  imagen_url?: string;
  local_id: string;
  destacado: boolean;
  locales?: {
    nombre: string;
    direccion?: string;
    imagen_url?: string;
  };
}

/**
 * ✅ EVENTOS FAVORITOS SCREEN v242.0 - FIXED KEYBOARD FOCUS LOSS (FINAL FIX)
 * 
 * CRITICAL FIX v242.0:
 * - ✅ FIXED: TextInput is DIRECTLY in return (no conditional rendering)
 * - ✅ FIXED: Controlled component with value={searchQuery}
 * - ✅ FIXED: Debounce with useEffect + cleanup (300ms)
 * - ✅ FIXED: Separate states: searchQuery (immediate) vs debouncedQuery (filtered)
 * - ✅ FIXED: FlatList has keyboardShouldPersistTaps="handled"
 * - ✅ FIXED: TextInput has blurOnSubmit={false}
 * - ✅ FIXED: Applied same pattern as working Explorar screen
 */

export default function EventosFavoritosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [allSavedEventos, setAllSavedEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // ✅ CRITICAL v242.0: Controlled input state (STABLE) - same as Explorar
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // ✅ CRITICAL FIX v242.0: Debounce with cleanup (300ms) - same as Explorar
  useEffect(() => {
    console.log('[EventosFavoritos v242.0] 📝 Search query changed:', searchQuery);
    
    const timer = setTimeout(() => {
      console.log('[EventosFavoritos v242.0] 🔍 Applying debounced search');
      setDebouncedQuery(searchQuery);
    }, 300);
    
    // Cleanup function - CRITICAL for preventing focus loss
    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const loadSavedEventos = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('[EventosFavoritos v242.0] Cargando eventos guardados...');
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
            destacado,
            locales (
              nombre,
              direccion,
              imagen_url
            )
          )
        `)
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false });

      if (eventosError) throw eventosError;

      if (savedEventosData) {
        const formattedEventos = savedEventosData
          .filter(se => se.eventos)
          .map((se: any) => se.eventos);
        
        setAllSavedEventos(formattedEventos);
        console.log('[EventosFavoritos v242.0] Eventos guardados cargados:', formattedEventos.length);
      }
    } catch (error) {
      console.error('[EventosFavoritos v242.0] Error cargando eventos guardados:', error);
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
            console.log('[EventosFavoritos v242.0] Saved eventos changed, reloading...');
            loadSavedEventos();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(savedEventosChannel);
      };
    }
  }, [user, loadSavedEventos]);

  // ✅ CRITICAL v242.0: Client-side filtering (triggered by debouncedQuery) - same as Explorar
  const filteredEventos = useMemo(() => {
    const query = debouncedQuery.toLowerCase().trim();
    console.log('[EventosFavoritos v242.0] 🔍 Filtering eventos client-side, search:', query);
    
    if (!query) {
      return allSavedEventos;
    }

    const filtered = allSavedEventos.filter(evento => {
      const titulo = evento.titulo?.toLowerCase() || '';
      const descripcion = evento.descripcion?.toLowerCase() || '';
      const localNombre = evento.locales?.nombre?.toLowerCase() || '';
      
      return titulo.includes(query) || 
             descripcion.includes(query) || 
             localNombre.includes(query);
    });

    console.log('[EventosFavoritos v242.0] ✅ Filtered', filtered.length, 'eventos from', allSavedEventos.length);
    return filtered;
  }, [debouncedQuery, allSavedEventos]);

  const onRefresh = async () => {
    console.log('[EventosFavoritos v242.0] 🔄 Manual refresh triggered');
    setRefreshing(true);
    setSearchQuery('');
    setDebouncedQuery('');
    await loadSavedEventos();
    setRefreshing(false);
  };

  const clearSearch = useCallback(() => {
    console.log('[EventosFavoritos v242.0] 🧹 Clearing search');
    setSearchQuery('');
    setDebouncedQuery('');
  }, []);

  const toggleFavorito = async (eventoId: string, e?: any) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para gestionar favoritos');
      return;
    }

    try {
      const { error } = await supabase
        .from('eventos_guardados')
        .delete()
        .eq('usuario_id', user.id)
        .eq('evento_id', eventoId);

      if (error) {
        console.error('[EventosFavoritos v242.0] Error removing favorite:', error);
        Alert.alert('Error', 'No se pudo quitar de favoritos');
        return;
      }
      
      console.log('[EventosFavoritos v242.0] ✅ Removed from favorites');
      await loadSavedEventos();
    } catch (error) {
      console.error('[EventosFavoritos v242.0] Error removing favorito:', error);
      Alert.alert('Error', 'No se pudo eliminar de favoritos');
    }
  };

  const formatFecha = (fecha: string, fechaFin?: string | null) => {
    const fechaInicio = new Date(fecha);
    const opciones: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    };
    
    if (fechaFin) {
      const fechaFinDate = new Date(fechaFin);
      return `${fechaInicio.toLocaleDateString('es-ES', opciones)} - ${fechaFinDate.toLocaleDateString('es-ES', opciones)}`;
    }
    
    return fechaInicio.toLocaleDateString('es-ES', opciones);
  };

  const formatHora = (hora: string, horaFin?: string | null) => {
    if (horaFin) {
      return `${hora} - ${horaFin}`;
    }
    return hora;
  };

  const renderEventoCard = ({ item }: { item: Evento }) => {
    const imagenPrincipal = item.imagen_url || item.locales?.imagen_url;
    const isDestacado = item.destacado;

    const iconSize = Platform.OS === 'android' ? scaleIconSize(14) : 14;
    const heartIconSize = Platform.OS === 'android' ? scaleIconSize(20) : 20;

    return (
      <TouchableOpacity 
        style={[
          styles.card,
          isDestacado && styles.cardDestacado
        ]} 
        onPress={() => router.push(`/detalle/evento?id=${item.id}`)}
        activeOpacity={0.9}
      >
        <View style={styles.imageContainer}>
          {imagenPrincipal ? (
            <Image
              source={{ uri: imagenPrincipal }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.image, styles.placeholderImage]}>
              <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={48} color={colors.textSecondary} />
            </View>
          )}

          <View style={styles.imageOverlay} />

          {isDestacado && (
            <View style={styles.badgeDestacado}>
              <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={12} color="#92400E" />
              <Text style={[styles.badgeDestacadoText, { fontSize: scaleFontSize(12) }]}>Destacado</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.favoritoButton}
            onPress={(e) => {
              e.stopPropagation();
              toggleFavorito(item.id, e);
            }}
          >
            <IconSymbol
              ios_icon_name="heart.fill"
              android_material_icon_name="favorite"
              size={heartIconSize}
              color="#EF4444"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={[styles.titulo, { fontSize: scaleFontSize(18) }]} numberOfLines={2}>
            {item.titulo}
          </Text>

          {item.locales && (
            <View style={styles.infoRow}>
              <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={iconSize} color={colors.textSecondary} />
              <Text style={[styles.infoText, { fontSize: scaleFontSize(14) }]} numberOfLines={1}>
                {item.locales.nombre}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={iconSize} color={colors.textSecondary} />
            <Text style={[styles.infoText, { fontSize: scaleFontSize(14) }]} numberOfLines={1}>
              {formatFecha(item.fecha, item.fecha_fin)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol ios_icon_name="clock.fill" android_material_icon_name="schedule" size={iconSize} color={colors.textSecondary} />
            <Text style={[styles.infoText, { fontSize: scaleFontSize(14) }]} numberOfLines={1}>
              {formatHora(item.hora, item.hora_fin)}
            </Text>
          </View>

          {item.precio !== null && item.precio !== undefined && (
            <View style={styles.precioContainer}>
              <Text style={[styles.precioLabel, { fontSize: scaleFontSize(13) }]}>Precio:</Text>
              <Text style={[styles.precioValue, { fontSize: scaleFontSize(16) }]}>
                {item.precio === 0 ? 'Gratis' : `${item.precio.toFixed(2)}€`}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    
    if (debouncedQuery && filteredEventos.length === 0) {
      return (
        <View style={styles.emptyState}>
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={[styles.emptyText, { fontSize: scaleFontSize(18) }]}>No se encontraron resultados</Text>
          <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14) }]}>
            Intenta con otros términos de búsqueda
          </Text>
          <TouchableOpacity 
            style={styles.clearSearchButton}
            onPress={clearSearch}
            activeOpacity={0.7}
          >
            <Text style={[styles.clearSearchButtonText, { fontSize: scaleFontSize(14) }]}>Limpiar búsqueda</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyState}>
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
      </View>
    );
  };

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
          message="Regístrate o inicia sesión en BarLive para guardar tus eventos favoritos y acceder a ellos desde cualquier dispositivo."
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

  const searchBoxHeight = getSearchBoxHeight();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.headerGradient}
      >
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { fontSize: scaleFontSize(32) }]}>Eventos Favoritos</Text>
          {debouncedQuery && (
            <TouchableOpacity 
              style={styles.clearSearchHeaderButton}
              onPress={clearSearch}
              activeOpacity={0.7}
            >
              <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={scaleIconSize(20)} color={colors.headerText} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* ✅ CRITICAL v242.0: Search bar - TextInput is DIRECTLY in return */}
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
            returnKeyType="search"
            blurOnSubmit={false}
            enablesReturnKeyAutomatically={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={clearSearch}
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
        </View>

        {allSavedEventos.length > 0 && (
          <View style={styles.resultsCountContainer}>
            <Text style={[styles.resultsCount, { fontSize: scaleFontSize(14) }]}>
              {debouncedQuery
                ? `${filteredEventos.length} de ${allSavedEventos.length} eventos`
                : `${filteredEventos.length} eventos guardados`
              }
            </Text>
          </View>
        )}
      </LinearGradient>

      <FlatList
        data={filteredEventos}
        renderItem={renderEventoCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={renderEmpty}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  clearSearchHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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
  resultsCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultsCount: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
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
  clearSearchButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  clearSearchButtonText: {
    fontWeight: '600',
    color: colors.headerText,
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
    height: 180,
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
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  badgeDestacado: {
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
  },
  badgeDestacadoText: {
    fontWeight: '700',
    color: '#92400E',
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
  titulo: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  infoText: {
    color: colors.textSecondary,
    flex: 1,
  },
  precioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  precioLabel: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  precioValue: {
    color: colors.primary,
    fontWeight: '700',
  },
});
