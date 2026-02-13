
/**
 * ✅ LOCAL CARD OPTIMIZED v2.0 - AGGRESSIVE MEMOIZATION + PAYLOAD REDUCTION
 * 
 * Optimizaciones implementadas v2.0:
 * - ✅ React.memo: Previene re-renders innecesarios
 * - ✅ useCallback: Estabiliza funciones
 * - ✅ useMemo: Estabiliza valores computados
 * - ✅ Optimistic UI: Favoritos instantáneos
 * - ✅ Skeleton Loader: Placeholder mientras carga imagen
 * - ✅ Image Prefetching: Precarga controlada con InteractionManager
 * - ✅ Lazy Loading: Datos bajo demanda
 * - ✅ Payload Reduction: Solicita thumbnails apropiados (140px, no 1080px)
 * 
 * OBJETIVO: Solo re-renderizar cuando los datos del local cambien
 */

import React, { useState, useCallback, memo, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Linking,
  InteractionManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useAuth } from '@/contexts/AuthContext';
import { intelligentPreloader } from '@/utils/intelligentPreloader';
import { Skeleton } from '@/components/common/SkeletonLoader';

// ✅ THUMBNAIL SIZE: Solicitar imágenes apropiadas (140px, no 1080px)
const CARD_IMAGE_HEIGHT = 140;
const THUMBNAIL_WIDTH = 400; // Suficiente para pantallas HD
const THUMBNAIL_HEIGHT = 300;

interface LocalCardOptimizedProps {
  local: any;
  index: number;
  onPress: () => void;
  socialProfiles: Map<string, boolean>;
  activeEvents: Map<string, any>;
}

/**
 * ✅ HELPER: Generar URL de thumbnail optimizado
 */
const getOptimizedImageUrl = (originalUrl: string, width: number, height: number): string => {
  if (!originalUrl) return '';
  
  if (originalUrl.includes('w=') || originalUrl.includes('width=')) {
    return originalUrl;
  }
  
  if (originalUrl.includes('supabase')) {
    const separator = originalUrl.includes('?') ? '&' : '?';
    return `${originalUrl}${separator}width=${Math.round(width)}&height=${Math.round(height)}&quality=75`;
  }
  
  return originalUrl;
};

const LocalCardOptimized = memo(({ local, index, onPress, socialProfiles, activeEvents }: LocalCardOptimizedProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [localIsFavorite, setLocalIsFavorite] = useState(isFavorite(local.id));

  // ✅ MEMOIZED: Optimized image URL
  const optimizedImageUrl = useMemo(() => {
    const imagenPrincipal = local.imagenes?.[0] || local.imagen_url;
    if (!imagenPrincipal) return null;
    
    return getOptimizedImageUrl(imagenPrincipal, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
  }, [local.imagenes, local.imagen_url]);

  const isDestacado = local.destacado;
  const hasSocialProfile = socialProfiles.get(local.id) || false;
  const activeEvent = activeEvents.get(local.id);

  // ✅ CONTROLLED PREFETCH: Solo cuando JS thread está inactivo
  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      if (optimizedImageUrl) {
        intelligentPreloader.prefetchImages([optimizedImageUrl], 'MEDIUM');
      }
      
      if (local.imagenes && local.imagenes.length > 1) {
        const otherImages = local.imagenes.slice(1, 3).map((img: string) => 
          getOptimizedImageUrl(img, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT)
        );
        intelligentPreloader.prefetchImages(otherImages, 'LOW');
      }
    });
  }, [optimizedImageUrl, local.imagenes]);

  useEffect(() => {
    setLocalIsFavorite(isFavorite(local.id));
  }, [isFavorite, local.id]);

  /**
   * ✅ OPTIMISTIC FAVORITE - Respuesta instantánea
   */
  const handleToggleFavorito = useCallback(async (e: any) => {
    e.stopPropagation();
    
    if (!user) {
      router.push('/auth/login-v6');
      return;
    }

    if (!local.id) return;

    console.log('[LocalCardOptimized v2.0] ⭐ INSTANT favorite toggle');

    const newFavoriteState = !localIsFavorite;
    setLocalIsFavorite(newFavoriteState);

    try {
      await toggleFavorite(local.id);
    } catch (error) {
      console.log('[LocalCardOptimized v2.0] 🔄 Rolling back favorite');
      setLocalIsFavorite(!newFavoriteState);
    }
  }, [user, router, local.id, localIsFavorite, toggleFavorite]);

  const handleComoLlegar = useCallback((e: any) => {
    e.stopPropagation();
    const { lat, lng } = local.coordenadas;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url);
  }, [local.coordenadas]);

  const handlePerfilSocial = useCallback((e: any) => {
    e.stopPropagation();
    router.push(`/perfil/local?localId=${local.id}`);
  }, [router, local.id]);

  // ✅ MEMOIZED: Badge info
  const badgeInfo = useMemo(() => {
    if (local.estadoCompleto) {
      const estado = local.estadoCompleto;
      
      const colorMap: Record<string, string> = {
        'bg-green-500': '#22C55E',
        'bg-orange-500': '#F97316',
        'bg-yellow-500': '#EAB308',
        'bg-red-500': '#EF4444',
        'bg-gray-400': '#9CA3AF',
      };
      
      const badgeColor = colorMap[estado.claseBg || 'bg-gray-400'] || '#9CA3AF';
      
      return {
        text: estado.badge,
        color: badgeColor,
      };
    }
    
    if (local.estaAbierto === true) {
      return {
        text: 'Abierto ahora',
        color: '#22C55E',
      };
    } else if (local.estaAbierto === false) {
      return {
        text: 'Cerrado ahora',
        color: '#EF4444',
      };
    } else {
      return {
        text: 'Sin info de horario',
        color: '#9CA3AF',
      };
    }
  }, [local.estadoCompleto, local.estaAbierto]);

  // ✅ MEMOIZED: Should dim image
  const shouldDimImage = useMemo(() => {
    if (local.estadoCompleto) {
      return local.estadoCompleto.estaAbierto === false && 
             !local.estadoCompleto.badge.includes('pronto');
    }
    return local.estaAbierto === false;
  }, [local.estadoCompleto, local.estaAbierto]);

  // ✅ MEMOIZED: Categorias a mostrar
  const categoriasAMostrar = useMemo(() => {
    const CATEGORIAS_EXCLUIDAS = ['terrazas', 'rooftops', 'lounge'];
    let categories = local.barlive_types || [];
    if (categories.length === 0 && local.barlive_type) {
      categories = [local.barlive_type];
    }
    
    return categories.filter((cat: string) => 
      !CATEGORIAS_EXCLUIDAS.includes(cat.toLowerCase())
    );
  }, [local.barlive_types, local.barlive_type]);

  // ✅ MEMOIZED: Display rating
  const displayRating = useMemo(() => {
    if (local.rating && local.rating > 0) {
      return local.rating;
    }
    if (local.google_rating && local.google_rating > 0) {
      return local.google_rating;
    }
    return 0;
  }, [local.rating, local.google_rating]);

  // ✅ MEMOIZED: Icon sizes
  const iconSize = useMemo(() => Platform.OS === 'android' ? scaleIconSize(14) : 14, []);
  const starIconSize = useMemo(() => Platform.OS === 'android' ? scaleIconSize(12) : 12, []);
  const heartIconSize = useMemo(() => Platform.OS === 'android' ? scaleIconSize(20) : 20, []);
  const actionIconSize = useMemo(() => Platform.OS === 'android' ? scaleIconSize(16) : 16, []);

  // ✅ MEMOIZED: Card style
  const cardStyle = useMemo(() => [
    styles.card,
    isDestacado && styles.cardDestacado,
    Platform.OS === 'android' && index === 0 && { marginTop: 8 }
  ], [isDestacado, index]);

  return (
    <TouchableOpacity 
      style={cardStyle} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        {!imageLoaded && (
          <View style={styles.skeletonImageContainer}>
            <Skeleton width="100%" height={CARD_IMAGE_HEIGHT} borderRadius={0} />
          </View>
        )}
        
        {optimizedImageUrl ? (
          <Image
            source={{ uri: optimizedImageUrl }}
            style={[styles.image, !imageLoaded && styles.imageHidden]}
            resizeMode="cover"
            onLoad={() => setImageLoaded(true)}
            fadeDuration={0}
            progressiveRenderingEnabled={true}
          />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <IconSymbol ios_icon_name="photo" android_material_icon_name="photo" size={48} color={colors.textSecondary} />
          </View>
        )}

        {shouldDimImage && imageLoaded && (
          <View style={styles.dimmedOverlay} />
        )}

        {imageLoaded && <View style={styles.imageOverlay} />}

        {isDestacado && imageLoaded && (
          <View style={styles.badgeDestacadoHeader}>
            <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={starIconSize} color="#92400E" />
            <Text style={[styles.badgeDestacadoHeaderText, { fontSize: scaleFontSize(12) }]}>Destacado</Text>
          </View>
        )}

        {imageLoaded && (
          <View style={[
            styles.badgeEstadoSuperior, 
            { backgroundColor: badgeInfo.color + 'E6' },
            isDestacado && styles.badgeEstadoSuperiorConDestacado
          ]}>
            <Text style={[styles.badgeEstadoSuperiorText, { fontSize: scaleFontSize(12) }]} numberOfLines={1}>
              {badgeInfo.text}
            </Text>
          </View>
        )}

        {displayRating > 0 && imageLoaded && (
          <View style={styles.ratingBadge}>
            <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={starIconSize} color="#FACC15" />
            <Text style={[styles.ratingBadgeText, { fontSize: scaleFontSize(12) }]}>{displayRating.toFixed(1)}</Text>
          </View>
        )}

        {local.nuevo && imageLoaded && (
          <View style={styles.badgeNuevoContainer}>
            <View style={styles.badgeNuevo}>
              <Text style={[styles.badgeNuevoText, { fontSize: scaleFontSize(12) }]}>Nuevo</Text>
            </View>
          </View>
        )}

        {activeEvent && imageLoaded && (
          <View style={styles.badgeEventoContainer}>
            <View style={styles.badgeEvento}>
              <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={starIconSize} color="#FFFFFF" />
              <Text style={[styles.badgeEventoText, { fontSize: scaleFontSize(11) }]} numberOfLines={1}>
                {activeEvent.titulo}
              </Text>
            </View>
          </View>
        )}

        {imageLoaded && (
          <TouchableOpacity
            style={styles.favoritoButton}
            onPress={handleToggleFavorito}
          >
            <IconSymbol
              ios_icon_name={localIsFavorite ? "heart.fill" : "heart"}
              android_material_icon_name={localIsFavorite ? "favorite" : "favorite_border"}
              size={heartIconSize}
              color={localIsFavorite ? "#EF4444" : "#FFFFFF"}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.nombre, { fontSize: scaleFontSize(18) }]} numberOfLines={1}>
            {local.nombre}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <IconSymbol ios_icon_name="mappin" android_material_icon_name="location_on" size={iconSize} color={colors.textSecondary} />
          <Text style={[styles.infoText, { fontSize: scaleFontSize(14) }]} numberOfLines={1}>
            {local.direccion}
          </Text>
        </View>

        {categoriasAMostrar.length > 0 && (
          <View style={styles.categoriasContainer}>
            {categoriasAMostrar.map((categoria: string, catIndex: number) => (
              <View key={catIndex} style={styles.categoriaBadge}>
                <Text style={[styles.categoriaIcon, { fontSize: scaleFontSize(12) }]}>{getCategoryIcon(categoria)}</Text>
                <Text style={[styles.categoriaText, { fontSize: scaleFontSize(12) }]} numberOfLines={1}>{categoria}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actionButtonsContainer}>
          {hasSocialProfile && (
            <TouchableOpacity 
              style={styles.perfilSocialButton} 
              onPress={handlePerfilSocial}
            >
              <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={actionIconSize} color={colors.headerText} />
              <Text style={[styles.perfilSocialText, { fontSize: scaleFontSize(13) }]} numberOfLines={1}>Perfil Social</Text>
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
                <IconSymbol ios_icon_name="arrow.triangle.turn.up.right.diamond.fill" android_material_icon_name="directions" size={actionIconSize} color={colors.headerText} />
                <Text style={[styles.comoLlegarText, { fontSize: scaleFontSize(13) }]} numberOfLines={1}>Cómo llegar</Text>
              </View>
              
              {local.distancia !== null && local.distancia !== undefined && (
                <View style={styles.distanciaInButton}>
                  <IconSymbol ios_icon_name="location.fill" android_material_icon_name="my_location" size={iconSize} color={colors.headerText} />
                  <Text style={[styles.distanciaInButtonText, { fontSize: scaleFontSize(13) }]} numberOfLines={1}>
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
}, (prevProps, nextProps) => {
  // ✅ CRITICAL: Solo re-renderizar si los datos del local cambian
  return (
    prevProps.local.id === nextProps.local.id &&
    prevProps.local.destacado === nextProps.local.destacado &&
    prevProps.local.estaAbierto === nextProps.local.estaAbierto &&
    prevProps.socialProfiles.get(prevProps.local.id) === nextProps.socialProfiles.get(nextProps.local.id) &&
    prevProps.activeEvents.get(prevProps.local.id) === nextProps.activeEvents.get(nextProps.local.id)
  );
});

LocalCardOptimized.displayName = 'LocalCardOptimized';

export default LocalCardOptimized;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardDestacado: {
    borderWidth: 3,
    borderColor: '#FACC15',
    ...Platform.select({
      ios: {
        shadowColor: '#FACC15',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  imageContainer: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    position: 'relative',
  },
  skeletonImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageHidden: {
    opacity: 0,
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
    zIndex: 11,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  badgeDestacadoHeaderText: {
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
    zIndex: 10,
    maxWidth: '70%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  badgeEstadoSuperiorConDestacado: {
    top: 52,
  },
  badgeEstadoSuperiorText: {
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
    zIndex: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  ratingBadgeText: {
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
    fontWeight: '700',
    color: colors.headerText,
  },
  badgeEventoContainer: {
    position: 'absolute',
    bottom: 56,
    left: 12,
    right: 12,
    zIndex: 9,
  },
  badgeEvento: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  badgeEventoText: {
    fontWeight: '700',
    color: colors.headerText,
    flex: 1,
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
  },
  categoriaText: {
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
    fontWeight: '600',
    color: colors.headerText,
  },
});
