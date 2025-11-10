
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Local } from '@/types';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { getEstadoLocal } from '@/utils/timeUtils';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { localPreloader } from '@/utils/localPreloader';

const { width } = Dimensions.get('window');

interface TarjetaLocalProps {
  local: Local;
  destacado?: boolean;
  userLocation?: { lat: number; lng: number } | null;
  onVisible?: () => void;
}

export default function TarjetaLocal({ local, destacado, userLocation, onVisible }: TarjetaLocalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);
  const [hasPreloaded, setHasPreloaded] = useState(false);

  const estado = getEstadoLocal(local);
  const imagenPrincipal = local.imagenes?.[0] || local.imagen_url;
  const isDestacado = destacado || local.destacado;

  // Preload local data when component becomes visible
  useEffect(() => {
    if (!hasPreloaded && local.id) {
      localPreloader.preload(local.id);
      setHasPreloaded(true);
      
      // Notify parent that this card is visible
      if (onVisible) {
        onVisible();
      }
    }
  }, [local.id, hasPreloaded, onVisible]);

  // Define checkIfFavorite before useEffect
  const checkIfFavorite = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('locales_guardados')
        .select('id')
        .eq('usuario_id', user.id)
        .eq('local_id', local.id)
        .single();

      if (data) {
        setIsFavorite(true);
      }
    } catch (error) {
      // Not favorited or error
      setIsFavorite(false);
    }
  }, [user, local.id]);

  // Check if local is already favorited
  useEffect(() => {
    if (user) {
      checkIfFavorite();
    }
  }, [user, checkIfFavorite]);

  const handlePress = () => {
    router.push(`/detalle/local?id=${local.id}`);
  };

  const handleComoLlegar = (e: any) => {
    e.stopPropagation();
    const { lat, lng } = local.coordenadas;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url);
  };

  const toggleFavorito = async (e: any) => {
    e.stopPropagation();
    
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para agregar favoritos');
      return;
    }

    setLoadingFavorite(true);
    try {
      if (isFavorite) {
        // Eliminar de favoritos
        const { error } = await supabase
          .from('locales_guardados')
          .delete()
          .eq('usuario_id', user.id)
          .eq('local_id', local.id);

        if (error) throw error;
        setIsFavorite(false);
      } else {
        // Agregar a favoritos
        const { error } = await supabase
          .from('locales_guardados')
          .insert({
            usuario_id: user.id,
            local_id: local.id,
          });

        if (error) throw error;
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error toggling favorito:', error);
      Alert.alert('Error', 'No se pudo actualizar favoritos');
    } finally {
      setLoadingFavorite(false);
    }
  };

  const getBadgeColor = () => {
    if (estado.badge === 'Abierto ahora' || estado.badge === 'Abierto 24h') {
      return '#22C55E'; // green-500
    }
    if (estado.badge === 'Cierra pronto') {
      return '#F97316'; // orange-500
    }
    if (estado.badge === 'Abre pronto') {
      return '#EAB308'; // yellow-500
    }
    // Cerrado, "Abre a las X", "Abre [día] a las X", etc.
    if (estado.estaAbierto === false) {
      return '#EF4444'; // red-500
    }
    return '#9CA3AF'; // gray-400
  };

  const getBadgeText = () => {
    // For 24h locals, just show "Abierto 24h" without time remaining
    if (estado.badge === 'Abierto 24h') {
      return 'Abierto 24h';
    }
    
    // Format the badge text with time remaining
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
      // For "Abre a las X" with time remaining
      return `${estado.badge} • ${estado.tiempoRestante}`;
    }
    return estado.badge;
  };

  // Get overlay icon based on status
  const getOverlayIcon = () => {
    if (estado.overlayIcon === 'lock') {
      return 'lock.fill';
    }
    if (estado.overlayIcon === 'questionmark') {
      return 'questionmark.circle.fill';
    }
    if (estado.overlayIcon === 'clock') {
      return 'clock.fill';
    }
    return null;
  };

  // Get overlay icon color - ALWAYS WHITE
  const getOverlayIconColor = () => {
    return '#FFFFFF'; // Always white for lock icon
  };

  // Determine if image should be dimmed
  const shouldDimImage = () => {
    return estado.estaAbierto === false || estado.estaAbierto === null;
  };

  // Formatear categorías para mostrar - Filter out unwanted categories
  const formatCategories = () => {
    const CATEGORIAS_EXCLUIDAS = ['terrazas', 'rooftops', 'lounge'];
    let categories = local.barlive_types || [];
    if (categories.length === 0 && local.barlive_type) {
      categories = [local.barlive_type];
    }
    // Filter out excluded categories (case-insensitive)
    return categories.filter((cat: string) => 
      !CATEGORIAS_EXCLUIDAS.includes(cat.toLowerCase())
    );
  };

  const categoriasAMostrar = formatCategories();
  const overlayIcon = getOverlayIcon();

  // Calculate rating from multiple sources
  const getRating = () => {
    // Priority: rating > google_rating > valoracion_google
    if (local.rating && local.rating > 0) {
      return local.rating;
    }
    if (local.google_rating && local.google_rating > 0) {
      return local.google_rating;
    }
    if (local.valoracion_google && local.valoracion_google > 0) {
      return local.valoracion_google;
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
      onPress={handlePress} 
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

        {/* Overlay icon (lock, question mark, or clock) - CENTERED with proper color */}
        {overlayIcon && (
          <View style={styles.overlayIconContainer}>
            <IconSymbol name={overlayIcon} size={64} color={getOverlayIconColor()} />
          </View>
        )}

        {/* Gradient overlay for better text visibility */}
        <View style={styles.imageOverlay} />

        {/* Badge "Destacado" en la cabecera - Esquina superior izquierda */}
        {isDestacado && (
          <View style={styles.badgeDestacadoHeader}>
            <IconSymbol name="star.fill" size={14} color="#92400E" />
            <Text style={styles.badgeDestacadoHeaderText}>Destacado</Text>
          </View>
        )}

        {/* Badge de estado con tiempo - Debajo del badge destacado o en la esquina superior izquierda */}
        <View style={[
          styles.badgeEstadoSuperior, 
          { backgroundColor: getBadgeColor() + 'E6' },
          isDestacado && styles.badgeEstadoSuperiorConDestacado
        ]}>
          <Text style={styles.badgeEstadoSuperiorText}>{getBadgeText()}</Text>
        </View>

        {/* Valoración - Esquina superior derecha - REDUCED TO HALF SIZE */}
        {displayRating > 0 && (
          <View style={styles.ratingBadge}>
            <IconSymbol name="star.fill" size={10} color="#FACC15" />
            <Text style={styles.ratingBadgeText}>{displayRating.toFixed(1)}</Text>
          </View>
        )}

        {/* Badge nuevo - Debajo de la valoración */}
        {local.nuevo && (
          <View style={styles.badgeNuevoContainer}>
            <View style={styles.badgeNuevo}>
              <Text style={styles.badgeNuevoText}>Nuevo</Text>
            </View>
          </View>
        )}

        {/* Botón de favorito - Esquina inferior derecha */}
        <TouchableOpacity
          style={styles.favoritoButton}
          onPress={toggleFavorito}
          disabled={loadingFavorite}
        >
          <IconSymbol
            name={isFavorite ? "heart.fill" : "heart"}
            size={20}
            color={isFavorite ? "#EF4444" : colors.headerText}
          />
        </TouchableOpacity>
      </View>

      {/* Contenido */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.nombre} numberOfLines={1}>
            {local.nombre}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <IconSymbol name="mappin" size={14} color={colors.textSecondary} />
          <Text style={styles.infoText} numberOfLines={1}>
            {local.direccion}
          </Text>
        </View>

        {/* Categorías del local */}
        {categoriasAMostrar.length > 0 && (
          <View style={styles.categoriasContainer}>
            {categoriasAMostrar.map((categoria, index) => (
              <View key={index} style={styles.categoriaBadge}>
                <Text style={styles.categoriaIcon}>{getCategoryIcon(categoria)}</Text>
                <Text style={styles.categoriaText}>{categoria}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Botón "Cómo llegar" con distancia dentro del botón - Ancho completo */}
        <TouchableOpacity style={styles.comoLlegarButton} onPress={handleComoLlegar}>
          <View style={styles.comoLlegarContent}>
            <View style={styles.comoLlegarLeft}>
              <IconSymbol name="arrow.triangle.turn.up.right.diamond.fill" size={16} color={colors.headerText} />
              <Text style={styles.comoLlegarText}>Cómo llegar</Text>
            </View>
            
            {local.distancia !== null && local.distancia !== undefined && (
              <View style={styles.distanciaInButton}>
                <IconSymbol name="location.fill" size={14} color={colors.headerText} />
                <Text style={styles.distanciaInButtonText}>{local.distancia.toFixed(1)} km</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
  overlayIconContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -32,
    marginTop: -32,
    zIndex: 2,
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
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 12,
  },
  ratingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.headerText,
    letterSpacing: 0.3,
  },
  badgeNuevoContainer: {
    position: 'absolute',
    top: 68,
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
    marginBottom: 12,
  },
  categoriaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  categoriaIcon: {
    fontSize: 12,
  },
  categoriaText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'capitalize',
  },
  comoLlegarButton: {
    width: '100%',
    backgroundColor: colors.primary + '99',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  comoLlegarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  comoLlegarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  comoLlegarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
  },
  distanciaInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanciaInButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
  },
});
