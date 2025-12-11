
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
import { trackProfileView } from '@/utils/activityTracker';
import EventBanner from '@/components/eventos/EventBanner';
import { useLocalEvent } from '@/hooks/useLocalEvent';
import { addPubCategoryIfNeeded } from '@/utils/categorizeLocal';

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
  const [hasSocialProfile, setHasSocialProfile] = useState(false);
  const [checkingSocialProfile, setCheckingSocialProfile] = useState(true);
  
  const { evento: activeEvent } = useLocalEvent(local.id);

  const estado = getEstadoLocal(local);
  const imagenPrincipal = local.imagenes?.[0] || local.imagen_url;
  const isDestacado = destacado || local.destacado;

  useEffect(() => {
    if (!hasPreloaded && local.id) {
      localPreloader.preload(local.id);
      setHasPreloaded(true);
      
      if (onVisible) {
        onVisible();
      }
    }
  }, [local.id, hasPreloaded, onVisible]);

  useEffect(() => {
    const checkSocialProfile = async () => {
      if (!local.id) {
        setCheckingSocialProfile(false);
        return;
      }

      try {
        const { data: posts, error: postsError } = await supabase
          .from('posts')
          .select('id')
          .eq('tipo', 'local')
          .eq('local_id', local.id)
          .limit(1);

        if (postsError) throw postsError;

        if (posts && posts.length > 0) {
          setHasSocialProfile(true);
        } else {
          setHasSocialProfile(false);
        }
      } catch (error) {
        console.error('[TarjetaLocal] Error checking social profile:', error);
        setHasSocialProfile(false);
      } finally {
        setCheckingSocialProfile(false);
      }
    };

    checkSocialProfile();
  }, [local.id]);

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
      setIsFavorite(false);
    }
  }, [user, local.id]);

  useEffect(() => {
    if (user) {
      checkIfFavorite();
    }
  }, [user, checkIfFavorite]);

  const handlePress = () => {
    trackProfileView(local.id, user?.id, 'explore');
    router.push(`/detalle/local?id=${local.id}`);
  };

  const handlePerfilSocial = (e: any) => {
    e.stopPropagation();
    trackProfileView(local.id, user?.id, 'social');
    router.push(`/perfil/local?localId=${local.id}`);
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
        const { error } = await supabase
          .from('locales_guardados')
          .delete()
          .eq('usuario_id', user.id)
          .eq('local_id', local.id);

        if (error) throw error;
        setIsFavorite(false);
      } else {
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

  const getOverlayIconColor = () => {
    return '#FFFFFF';
  };

  const shouldDimImage = () => {
    return estado.estaAbierto === false || estado.estaAbierto === null;
  };

  const formatCategories = () => {
    const CATEGORIAS_EXCLUIDAS = ['terrazas', 'rooftops', 'lounge'];
    let categories = local.barlive_types || [];
    if (categories.length === 0 && local.barlive_type) {
      categories = [local.barlive_type];
    }
    
    categories = addPubCategoryIfNeeded(categories, local.horarios_completos);
    
    return categories.filter((cat: string) => 
      !CATEGORIAS_EXCLUIDAS.includes(cat.toLowerCase())
    );
  };

  const categoriasAMostrar = formatCategories();
  const overlayIcon = getOverlayIcon();

  const getRating = () => {
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

        {shouldDimImage() && (
          <View style={styles.dimmedOverlay} />
        )}

        {overlayIcon && (
          <View style={styles.overlayIconContainer}>
            <IconSymbol name={overlayIcon} size={64} color={getOverlayIconColor()} />
          </View>
        )}

        <View style={styles.imageOverlay} />

        {isDestacado && (
          <View style={styles.badgeDestacadoHeader}>
            <IconSymbol name="star.fill" size={14} color="#92400E" />
            <Text style={styles.badgeDestacadoHeaderText}>Destacado</Text>
          </View>
        )}

        <View style={[
          styles.badgeEstadoSuperior, 
          { backgroundColor: getBadgeColor() + 'E6' },
          isDestacado && styles.badgeEstadoSuperiorConDestacado
        ]}>
          <Text style={styles.badgeEstadoSuperiorText} numberOfLines={1}>{getBadgeText()}</Text>
        </View>

        {displayRating > 0 && (
          <View style={styles.ratingBadge}>
            <IconSymbol name="star.fill" size={12} color="#FACC15" />
            <Text style={styles.ratingBadgeText}>{displayRating.toFixed(1)}</Text>
          </View>
        )}

        {local.nuevo && (
          <View style={styles.badgeNuevoContainer}>
            <View style={styles.badgeNuevo}>
              <Text style={styles.badgeNuevoText}>Nuevo</Text>
            </View>
          </View>
        )}

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

      <View style={styles.content}>
        {activeEvent && (
          <EventBanner evento={activeEvent} compact={true} />
        )}
        
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

        {categoriasAMostrar.length > 0 && (
          <View style={styles.categoriasContainer}>
            {categoriasAMostrar.map((categoria, index) => (
              <View key={index} style={styles.categoriaBadge}>
                <Text style={styles.categoriaIcon}>{getCategoryIcon(categoria)}</Text>
                <Text style={styles.categoriaText} numberOfLines={1}>{categoria}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actionButtonsContainer}>
          {!checkingSocialProfile && hasSocialProfile && (
            <TouchableOpacity style={styles.perfilSocialButton} onPress={handlePerfilSocial}>
              <IconSymbol name="person.2.fill" size={16} color={colors.headerText} />
              <Text style={styles.perfilSocialText} numberOfLines={1}>Perfil Social</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[
              styles.comoLlegarButton,
              !hasSocialProfile && styles.comoLlegarButtonFull
            ]} 
            onPress={handleComoLlegar}
          >
            <View style={styles.comoLlegarContent}>
              <View style={styles.comoLlegarLeft}>
                <IconSymbol name="arrow.triangle.turn.up.right.diamond.fill" size={16} color={colors.headerText} />
                <Text style={styles.comoLlegarText} numberOfLines={1}>Cómo llegar</Text>
              </View>
              
              {local.distancia !== null && local.distancia !== undefined && (
                <View style={styles.distanciaInButton}>
                  <IconSymbol name="location.fill" size={14} color={colors.headerText} />
                  <Text style={styles.distanciaInButtonText} numberOfLines={1}>
                    {local.distancia.toFixed(1)} km
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
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
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  perfilSocialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary + '99',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
    minWidth: 0,
  },
  perfilSocialText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.headerText,
    flexShrink: 1,
  },
  comoLlegarButton: {
    flex: 1,
    backgroundColor: colors.primary + '99',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 0,
  },
  comoLlegarButtonFull: {
    flex: 1,
  },
  comoLlegarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  comoLlegarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  comoLlegarText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.headerText,
    flexShrink: 1,
  },
  distanciaInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  distanciaInButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.headerText,
  },
});
