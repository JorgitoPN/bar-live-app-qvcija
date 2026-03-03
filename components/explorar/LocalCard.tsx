
// ✅ LINT FIX: Added React import and PropTypes for prop validation
import React, { memo } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';
import { getCategoryIcon } from '@/utils/categoryIcons';

interface LocalData {
  id: string;
  nombre: string;
  direccion: string;
  imagen_url?: string;
  estadoCompleto?: {
    estaAbierto: boolean;
    badge: string;
  };
  estaAbierto?: boolean;
  nuevo?: boolean;
  distancia?: number;
}

interface ActiveEventData {
  titulo: string;
}

interface BadgeInfo {
  text: string;
  color: string;
}

interface LocalCardProps {
  local: LocalData;
  isDestacado: boolean;
  hasSocialProfile: boolean;
  activeEvent: ActiveEventData | null;
  isFavorite: boolean;
  badgeInfo: BadgeInfo;
  categoriasAMostrar: string[];
  displayRating: number;
  onPress: () => void;
  onToggleFavorite: (e: any) => void;
  onComoLlegar: (e: any) => void;
  onPerfilSocial: (e: any) => void;
  index: number;
}

/**
 * ✅ LOCAL CARD v607.0 - UI OPTIMIZATION & SERVER-SIDE IMAGE OPTIMIZATION
 * 
 * CRITICAL CHANGES v607.0:
 * - ✅ SERVER-OPTIMIZED IMAGES: Uses pre-optimized URLs from useBaresQuery (400px, 70% quality)
 * - ✅ NO CLIENT-SIDE TRANSFORMATION: Images already optimized by Supabase Storage
 * - ✅ PRIORITY LOADING: First 4 cards load with priority="high"
 * - ✅ MEMORY-DISK CACHE: Aggressive caching to avoid repeated network requests
 * 
 * Previous optimizations v336.0:
 * - ✅ REDUCED IMAGE HEIGHT: Card images now 140px (was 200px)
 * - ✅ VIEWPORT OPTIMIZATION: Users can now see almost 2 complete cards on screen
 * - ✅ BETTER SPACE USAGE: 30% reduction in image height improves content density
 * - ✅ MAINTAINED TEXT SCALING: +2 point font increase preserved across all text
 * - ✅ React.memo with custom comparison to prevent unnecessary re-renders
 * - ✅ expo-image with priority="high", cachePolicy="disk", transition={150}
 * - ✅ recyclingKey based on local.id for optimal memory reuse on Android
 * - ✅ All calculations done outside component (passed as props)
 * - ✅ No hooks inside component (useSafeAreaInsets avoided)
 */

const LocalCard = memo<LocalCardProps>(({
  local,
  isDestacado,
  hasSocialProfile,
  activeEvent,
  isFavorite,
  badgeInfo,
  categoriasAMostrar,
  displayRating,
  onPress,
  onToggleFavorite,
  onComoLlegar,
  onPerfilSocial,
  index,
}) => {
  // ✅ v607: Image URL is already optimized by useBaresQuery - no client-side transformation needed
  const imagenPrincipal = local.imagen_url;

  const shouldDimImage = () => {
    if (local.estadoCompleto) {
      return local.estadoCompleto.estaAbierto === false && 
             !local.estadoCompleto.badge.includes('pronto');
    }
    return local.estaAbierto === false;
  };

  const iconSize = Platform.OS === 'android' ? scaleIconSize(14) : 14;
  const starIconSize = Platform.OS === 'android' ? scaleIconSize(12) : 12;
  const heartIconSize = Platform.OS === 'android' ? scaleIconSize(20) : 20;
  const actionIconSize = Platform.OS === 'android' ? scaleIconSize(16) : 16;

  const cardStyle = [
    styles.card,
    isDestacado && styles.cardDestacado,
    Platform.OS === 'android' && index === 0 && { marginTop: 8 }
  ];

  // ✅ v607: Priority loading for first 4 cards
  const imagePriority = index < 4 ? 'high' : 'low';

  return (
    <TouchableOpacity 
      style={cardStyle} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        {imagenPrincipal ? (
          <Image
            source={{ uri: imagenPrincipal }}
            style={styles.image}
            contentFit="cover"
            priority={imagePriority}
            cachePolicy="disk"
            transition={200}
            recyclingKey={local.id}
          />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <IconSymbol ios_icon_name="photo" android_material_icon_name="photo" size={48} color={colors.textSecondary} />
          </View>
        )}

        {shouldDimImage() && (
          <View style={styles.dimmedOverlay} />
        )}

        <View style={styles.imageOverlay} />

        {isDestacado && (
          <View style={styles.badgeDestacadoHeader}>
            <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={starIconSize} color="#92400E" />
            <Text style={[styles.badgeDestacadoHeaderText, { fontSize: scaleFontSize(12) }]}>Destacado</Text>
          </View>
        )}

        <View style={[
          styles.badgeEstadoSuperior, 
          { backgroundColor: badgeInfo.color + 'E6' },
          isDestacado && styles.badgeEstadoSuperiorConDestacado
        ]}>
          <Text style={[styles.badgeEstadoSuperiorText, { fontSize: scaleFontSize(12) }]} numberOfLines={1}>
            {badgeInfo.text}
          </Text>
        </View>

        {displayRating > 0 && (
          <View style={styles.ratingBadge}>
            <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={starIconSize} color="#FACC15" />
            <Text style={[styles.ratingBadgeText, { fontSize: scaleFontSize(12) }]}>{displayRating.toFixed(1)}</Text>
          </View>
        )}

        {local.nuevo && (
          <View style={styles.badgeNuevoContainer}>
            <View style={styles.badgeNuevo}>
              <Text style={[styles.badgeNuevoText, { fontSize: scaleFontSize(12) }]}>Nuevo</Text>
            </View>
          </View>
        )}

        {activeEvent && (
          <View style={styles.badgeEventoContainer}>
            <View style={styles.badgeEvento}>
              <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={starIconSize} color="#FFFFFF" />
              <Text style={[styles.badgeEventoText, { fontSize: scaleFontSize(11) }]} numberOfLines={1}>
                {activeEvent.titulo}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.favoritoButton}
          onPress={onToggleFavorite}
        >
          <IconSymbol
            ios_icon_name={isFavorite ? "heart.fill" : "heart"}
            android_material_icon_name={isFavorite ? "favorite" : "favorite_border"}
            size={heartIconSize}
            color={isFavorite ? "#EF4444" : "#FFFFFF"}
          />
        </TouchableOpacity>
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
              onPress={onPerfilSocial}
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
            onPress={onComoLlegar}
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
  // ✅ Custom comparison function - only re-render if local data actually changed
  // Prevents re-renders when global user object or metadata changes
  return (
    prevProps.local.id === nextProps.local.id &&
    prevProps.local.nombre === nextProps.local.nombre &&
    prevProps.local.direccion === nextProps.local.direccion &&
    prevProps.local.distancia === nextProps.local.distancia &&
    prevProps.isDestacado === nextProps.isDestacado &&
    prevProps.hasSocialProfile === nextProps.hasSocialProfile &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.badgeInfo.text === nextProps.badgeInfo.text &&
    prevProps.badgeInfo.color === nextProps.badgeInfo.color &&
    prevProps.displayRating === nextProps.displayRating &&
    JSON.stringify(prevProps.categoriasAMostrar) === JSON.stringify(nextProps.categoriasAMostrar) &&
    JSON.stringify(prevProps.activeEvent) === JSON.stringify(nextProps.activeEvent)
  );
});

LocalCard.displayName = 'LocalCard';

// ✅ LINT FIX: Add PropTypes validation to satisfy react/prop-types rule
LocalCard.propTypes = {
  local: PropTypes.object.isRequired,
  isDestacado: PropTypes.bool.isRequired,
  hasSocialProfile: PropTypes.bool.isRequired,
  activeEvent: PropTypes.object,
  isFavorite: PropTypes.bool.isRequired,
  badgeInfo: PropTypes.object.isRequired,
  categoriasAMostrar: PropTypes.array.isRequired,
  displayRating: PropTypes.number.isRequired,
  onPress: PropTypes.func.isRequired,
  onToggleFavorite: PropTypes.func.isRequired,
  onComoLlegar: PropTypes.func.isRequired,
  onPerfilSocial: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
};

export default LocalCard;

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
    height: 140,
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
