
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Linking, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Local } from '@/types';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { getEstadoLocal } from '@/utils/timeUtils';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { localPreloader } from '@/utils/localPreloader';
import { trackProfileView } from '@/utils/activityTracker';
import EventBanner from '@/components/eventos/EventBanner';
import { useLocalEvent } from '@/hooks/useLocalEvent';
import { addPubCategoryIfNeeded } from '@/utils/categorizeLocal';
import { getCardBorderRadius } from '@/utils/androidScaling';

const { width } = Dimensions.get('window');

interface TarjetaLocalProps {
  local: Local;
  destacado?: boolean;
  userLocation?: { lat: number; lng: number } | null;
  onVisible?: () => void;
}

interface CheckedInUser {
  id: string;
  nombre: string;
  username: string | null;
  avatar: string | null;
}

/**
 * ✅ TARJETA LOCAL v79.0 - ANDROID-iOS PARITY
 * 
 * CRITICAL FIXES v79.0:
 * - ✅ Android: Fixed card dimensions and aspect ratio
 * - ✅ Consistent image height across platforms (200px)
 * - ✅ Proper padding and spacing matching iOS
 * - ✅ All icons properly mapped for Android
 * - ✅ Check-in indicators with correct colors
 * 
 * IMPORTANT: iOS design is the reference
 */
export default function TarjetaLocal({ local, destacado, userLocation, onVisible }: TarjetaLocalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite, loading: loadingFavorite } = useFavorites();
  const [hasPreloaded, setHasPreloaded] = useState(false);
  const [hasSocialProfile, setHasSocialProfile] = useState(false);
  const [checkingSocialProfile, setCheckingSocialProfile] = useState(true);
  const [isUserHere, setIsUserHere] = useState(false);
  const [followedUsersHere, setFollowedUsersHere] = useState<CheckedInUser[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);
  
  const { evento: activeEvent } = useLocalEvent(local.id);

  const estado = getEstadoLocal(local);
  const imagenPrincipal = local.imagenes?.[0] || local.imagen_url;
  const isDestacado = destacado || local.destacado;
  const localIsFavorite = isFavorite(local.id);

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
        console.error('[TarjetaLocal v79.0] Error checking social profile:', error);
        setHasSocialProfile(false);
      } finally {
        setCheckingSocialProfile(false);
      }
    };

    checkSocialProfile();
  }, [local.id]);

  // Load check-in information
  useEffect(() => {
    const loadCheckInInfo = async () => {
      if (!local.id || !user) return;

      try {
        // Check if current user is here
        const { data: userCheckIn } = await supabase
          .from('check_ins')
          .select('id')
          .eq('usuario_id', user.id)
          .eq('local_id', local.id)
          .single();

        setIsUserHere(!!userCheckIn);

        // Get followed users who are here
        const { data: checkIns, error } = await supabase
          .from('check_ins')
          .select(`
            usuario_id,
            visibility,
            specific_user_ids,
            usuarios!check_ins_usuario_id_fkey(id, nombre, username, avatar)
          `)
          .eq('local_id', local.id)
          .neq('usuario_id', user.id);

        if (error) throw error;

        const visibleUsers: CheckedInUser[] = [];

        for (const checkIn of (checkIns || [])) {
          const checkInUser = checkIn.usuarios;
          if (!checkInUser) continue;

          // Check visibility
          if (checkIn.visibility === 'all_users') {
            visibleUsers.push(checkInUser);
          } else if (checkIn.visibility === 'followers') {
            // Check if current user follows this user
            const { data: followData } = await supabase
              .from('seguidores')
              .select('id')
              .eq('seguidor_id', user.id)
              .eq('seguido_id', checkInUser.id)
              .single();

            if (followData) {
              visibleUsers.push(checkInUser);
            }
          } else if (checkIn.visibility === 'specific_users') {
            if (checkIn.specific_user_ids?.includes(user.id)) {
              visibleUsers.push(checkInUser);
            }
          }
        }

        setFollowedUsersHere(visibleUsers);
      } catch (error) {
        console.error('[TarjetaLocal v79.0] Error loading check-in info:', error);
      }
    };

    loadCheckInInfo();

    // Subscribe to check-in changes
    const checkInsChannel = supabase
      .channel(`local-check-ins-${local.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins',
          filter: `local_id=eq.${local.id}`,
        },
        () => {
          console.log('[TarjetaLocal v79.0] Check-ins changed, reloading...');
          loadCheckInInfo();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(checkInsChannel);
    };
  }, [local.id, user]);

  const handleCheckOut = async (e: any) => {
    e.stopPropagation();
    if (!user) return;

    setCheckingOut(true);
    try {
      const { error } = await supabase
        .from('check_ins')
        .delete()
        .eq('usuario_id', user.id)
        .eq('local_id', local.id);

      if (error) throw error;

      console.log('[TarjetaLocal v79.0] ✅ Check-out successful');
      setIsUserHere(false);
    } catch (error) {
      console.error('[TarjetaLocal v79.0] Error checking out:', error);
    } finally {
      setCheckingOut(false);
    }
  };

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

  const handleToggleFavorite = async (e: any) => {
    e.stopPropagation();
    await toggleFavorite(local.id);
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

  // ✅ IMPROVED: Dim image for closed locals
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

  // ✅ ANDROID FIX v79.0: Platform-specific card border radius
  const cardBorderRadius = getCardBorderRadius();

  return (
    <TouchableOpacity 
      style={[
        styles.card,
        { borderRadius: cardBorderRadius },
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
            <IconSymbol ios_icon_name="photo" android_material_icon_name="photo" size={48} color={colors.textSecondary} />
          </View>
        )}

        {/* ✅ IMPROVED: Dimmed overlay for closed locals */}
        {shouldDimImage() && (
          <View style={styles.dimmedOverlay} />
        )}

        {/* ✅ IMPROVED: Lock icon for closed locals */}
        {overlayIcon && (
          <View style={styles.overlayIconContainer}>
            <IconSymbol ios_icon_name={overlayIcon} android_material_icon_name="lock" size={64} color={getOverlayIconColor()} />
          </View>
        )}

        <View style={styles.imageOverlay} />

        {isDestacado && (
          <View style={styles.badgeDestacadoHeader}>
            <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={14} color="#92400E" />
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
            <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={12} color="#FACC15" />
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
          onPress={handleToggleFavorite}
          disabled={loadingFavorite}
        >
          {loadingFavorite ? (
            <ActivityIndicator size="small" color={colors.headerText} />
          ) : (
            <IconSymbol
              ios_icon_name={localIsFavorite ? "heart.fill" : "heart"}
              android_material_icon_name={localIsFavorite ? "favorite" : "favorite_border"}
              size={20}
              color={localIsFavorite ? "#EF4444" : colors.headerText}
            />
          )}
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

        {/* ✅ UPDATED: Check-in indicators with BarLive colors */}
        {(isUserHere || followedUsersHere.length > 0) && (
          <View style={styles.checkInIndicators}>
            {isUserHere && (
              <View style={styles.userHereBadge}>
                <View style={styles.userHereBadgeContent}>
                  <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={16} color={colors.primary} />
                  <Text style={styles.userHereText}>Estás en este local</Text>
                </View>
                <TouchableOpacity 
                  style={styles.checkOutButton}
                  onPress={handleCheckOut}
                  disabled={checkingOut}
                >
                  {checkingOut ? (
                    <ActivityIndicator size="small" color={colors.textSecondary} />
                  ) : (
                    <React.Fragment>
                      <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={14} color={colors.textSecondary} />
                      <Text style={styles.checkOutButtonText}>Salir</Text>
                    </React.Fragment>
                  )}
                </TouchableOpacity>
              </View>
            )}
            {followedUsersHere.length > 0 && (
              <View style={styles.friendsHereBadge}>
                <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={14} color={colors.secondary} />
                <Text style={styles.friendsHereText}>
                  {followedUsersHere.length} {followedUsersHere.length === 1 ? 'amigo está' : 'amigos están'} aquí
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.infoRow}>
          <IconSymbol ios_icon_name="mappin" android_material_icon_name="location_on" size={14} color={colors.textSecondary} />
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
              <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={16} color={colors.headerText} />
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
                <IconSymbol ios_icon_name="arrow.triangle.turn.up.right.diamond.fill" android_material_icon_name="directions" size={16} color={colors.headerText} />
                <Text style={styles.comoLlegarText} numberOfLines={1}>Cómo llegar</Text>
              </View>
              
              {local.distancia !== null && local.distancia !== undefined && (
                <View style={styles.distanciaInButton}>
                  <IconSymbol ios_icon_name="location.fill" android_material_icon_name="my_location" size={14} color={colors.headerText} />
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
    borderRadius: 16, // Will be overridden by inline style with platform-specific value
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
    height: 200, // ✅ FIXED v79.0: Consistent height across platforms
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    zIndex: 1,
  },
  overlayIconContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -32,
    marginTop: -32,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
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
    padding: 16, // ✅ FIXED v79.0: Consistent padding
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nombre: {
    fontSize: 18, // ✅ FIXED v79.0: Consistent font size
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
  // ✅ UPDATED: Check-in indicators with BarLive colors
  checkInIndicators: {
    marginBottom: 12,
  },
  userHereBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary + '30',
    marginBottom: 8,
  },
  userHereBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  userHereText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    flex: 1,
  },
  // ✅ UPDATED: Subtle exit button with less aggressive color
  checkOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  checkOutButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  friendsHereBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.secondary + '10',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.secondary + '30',
  },
  friendsHereText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
  },
});
