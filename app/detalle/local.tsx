
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Linking,
  Alert,
  ActivityIndicator,
  Share,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import OptimizedImage from '@/components/common/OptimizedImage';
import { getEstadoLocal } from '@/utils/timeUtils';
import { LinearGradient } from 'expo-linear-gradient';
import ImageGalleryModal from '@/components/detalle/ImageGalleryModal';
import ReviewsModal from '@/components/social/ReviewsModal';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = 300;
const HEADER_SCROLL_DISTANCE = HEADER_HEIGHT - 100;

interface Local {
  id: string;
  nombre: string;
  descripcion?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  website?: string;
  categoria?: string;
  subcategoria?: string;
  precio_medio?: number;
  valoracion?: number;
  foto_principal?: string;
  imagen_url?: string;
  fotos?: string[];
  galeria_urls?: string[];
  latitud?: number;
  longitud?: number;
  ciudad?: string;
  provincia?: string;
  horarios_completos?: Record<string, string[]>;
  estado_actual?: 'abierto_ahora' | 'cerrado_ahora';
  barlive_type?: string;
  barlive_types?: string[];
  destacado?: boolean;
  rating?: number;
  google_rating?: number;
  descripcion_google?: string;
  servicios_disponibles?: Record<string, any>;
  ambiente_completo?: Record<string, boolean>;
  clientela?: Record<string, boolean>;
  metodos_pago_completos?: Record<string, boolean>;
  coordenadas?: { lat: number; lng: number };
}

const DIAS_SEMANA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

export default function DetalleLocalScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user, ensureValidSession } = useAuth();
  const { isFavorite, toggleFavorite, loading: loadingFavorite } = useFavorites();
  
  const [local, setLocal] = useState<Local | null>(null);
  const [loading, setLoading] = useState(true);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [reviewsVisible, setReviewsVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  const scrollY = useSharedValue(0);
  const localId = params.id as string;
  const localIsFavorite = localId ? isFavorite(localId) : false;

  useEffect(() => {
    if (localId) {
      loadLocalData();
      loadReviewCount();
    }
  }, [localId]);

  const loadLocalData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('locales')
        .select('*')
        .eq('id', localId)
        .single();

      if (error) throw error;
      console.log('[DetalleLocal] ✅ Local loaded:', data?.nombre);
      setLocal(data);
    } catch (error) {
      console.error('[DetalleLocal] ❌ Error loading local:', error);
      Alert.alert('Error', 'No se pudo cargar el local');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadReviewCount = async () => {
    try {
      const { count, error } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('local_id', localId);

      if (error) throw error;
      setReviewCount(count || 0);
    } catch (error) {
      console.error('[DetalleLocal] Error loading review count:', error);
    }
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
      [0, 0, 1],
      Extrapolate.CLAMP
    );

    return {
      opacity,
    };
  });

  const imageAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [-100, 0],
      [1.5, 1],
      Extrapolate.CLAMP
    );

    const translateY = interpolate(
      scrollY.value,
      [0, HEADER_SCROLL_DISTANCE],
      [0, -HEADER_SCROLL_DISTANCE / 2],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ scale }, { translateY }],
    };
  });

  const handleToggleFavorito = async () => {
    if (localId) {
      await toggleFavorite(localId);
    }
  };

  const handleCall = () => {
    if (local?.telefono) {
      Linking.openURL(`tel:${local.telefono}`);
    }
  };

  const handleEmail = () => {
    if (local?.email) {
      Linking.openURL(`mailto:${local.email}`);
    }
  };

  const handleWebsite = () => {
    if (local?.website) {
      Linking.openURL(local.website);
    }
  };

  const handleDirections = () => {
    if (local?.latitud && local?.longitud) {
      const url = Platform.select({
        ios: `maps:0,0?q=${local.latitud},${local.longitud}`,
        android: `google.navigation:q=${local.latitud},${local.longitud}`,
        default: `https://www.google.com/maps/search/?api=1&query=${local.latitud},${local.longitud}`
      });
      Linking.openURL(url);
    } else if (local?.coordenadas) {
      const { lat, lng } = local.coordenadas;
      const url = Platform.select({
        ios: `maps:0,0?q=${lat},${lng}`,
        android: `google.navigation:q=${lat},${lng}`,
        default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      });
      Linking.openURL(url);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `¡Mira este local! ${local?.nombre} - ${local?.direccion}`,
        url: `https://natively.dev/detalle/local?id=${localId}`,
      });
    } catch (error) {
      console.error('[DetalleLocal] Error sharing:', error);
    }
  };

  const handleOpenGallery = (index: number) => {
    setCurrentImageIndex(index);
    setGalleryVisible(true);
  };

  const handleOpenReviews = () => {
    setReviewsVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando local...</Text>
      </View>
    );
  }

  if (!local) {
    return (
      <View style={styles.errorContainer}>
        <IconSymbol ios_icon_name="exclamationmark.triangle" android_material_icon_name="error" size={48} color={colors.badgeDestacado} />
        <Text style={styles.errorText}>No se pudo cargar el local</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const allImages = [
    local.imagen_url || local.foto_principal,
    ...(local.fotos || []),
    ...(local.galeria_urls || [])
  ].filter(Boolean);

  const estadoLocal = getEstadoLocal(local);
  const isOpen = estadoLocal?.estaAbierto === true;

  const allCategories = (local.barlive_types && local.barlive_types.length > 0 
    ? local.barlive_types 
    : local.barlive_type 
      ? [local.barlive_type] 
      : local.categoria 
        ? [local.categoria] 
        : []
  );

  const displayRating = local.rating || local.google_rating || 0;

  const horarios = local.horarios_completos || {};
  const hasHorarios = Object.keys(horarios).length > 0;

  const servicios = local.servicios_disponibles || {};
  const hasServicios = Object.keys(servicios).some(key => servicios[key]);

  const ambiente = local.ambiente_completo || {};
  const hasAmbiente = Object.keys(ambiente).some(key => ambiente[key]);

  const clientela = local.clientela || {};
  const hasClientela = Object.keys(clientela).some(key => clientela[key]);

  const metodosPago = local.metodos_pago_completos || {};
  const hasMetodosPago = Object.keys(metodosPago).some(key => metodosPago[key]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Image */}
        <Animated.View style={[styles.headerImageContainer, imageAnimatedStyle]}>
          {allImages.length > 0 ? (
            <TouchableOpacity onPress={() => handleOpenGallery(0)} activeOpacity={0.9}>
              <OptimizedImage
                source={{ uri: allImages[0] }}
                style={styles.headerImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : (
            <View style={[styles.headerImage, styles.placeholderImage]}>
              <IconSymbol ios_icon_name="photo" android_material_icon_name="photo" size={64} color={colors.textSecondary} />
            </View>
          )}

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.headerGradient}
          />

          {/* Status Badge */}
          {estadoLocal && (
            <View style={styles.statusBadge}>
              <BlurView intensity={90} tint="dark" style={styles.statusBlur}>
                <View style={[styles.statusDot, isOpen ? styles.statusDotOpen : styles.statusDotClosed]} />
                <Text style={styles.statusText}>{estadoLocal.badge}</Text>
                {estadoLocal.tiempoRestante && (
                  <Text style={styles.statusSubtext}>• {estadoLocal.tiempoRestante}</Text>
                )}
              </BlurView>
            </View>
          )}

          {/* Rating Badge */}
          {displayRating > 0 && (
            <View style={styles.ratingBadge}>
              <BlurView intensity={90} tint="dark" style={styles.ratingBlur}>
                <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>{displayRating.toFixed(1)}</Text>
              </BlurView>
            </View>
          )}

          {/* Destacado Badge */}
          {local.destacado && (
            <View style={styles.destacadoBadge}>
              <BlurView intensity={90} tint="dark" style={styles.destacadoBlur}>
                <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={16} color="#F59E0B" />
                <Text style={styles.destacadoText}>Destacado</Text>
              </BlurView>
            </View>
          )}
        </Animated.View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.localName}>{local.nombre}</Text>
            
            {allCategories.length > 0 && (
              <View style={styles.categoriesRow}>
                {allCategories.map((categoria, index) => (
                  <View key={index} style={styles.categoryChip}>
                    <Text style={styles.categoryChipText}>{categoria.toUpperCase()}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Address */}
          {local.direccion && (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={24} color={colors.primary} />
                <Text style={styles.infoText}>{local.direccion}</Text>
              </View>
            </View>
          )}

          {/* Description */}
          {(local.descripcion_google || local.descripcion) && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Descripción</Text>
              <Text style={styles.descriptionText}>
                {local.descripcion_google || local.descripcion}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {local.telefono && (
              <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionButtonGradient}
                >
                  <IconSymbol ios_icon_name="phone.fill" android_material_icon_name="phone" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Llamar</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {(local.latitud || local.coordenadas) && (
              <TouchableOpacity style={styles.actionButton} onPress={handleDirections}>
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionButtonGradient}
                >
                  <IconSymbol ios_icon_name="map.fill" android_material_icon_name="map" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Cómo llegar</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {local.email && (
              <TouchableOpacity style={styles.actionButton} onPress={handleEmail}>
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionButtonGradient}
                >
                  <IconSymbol ios_icon_name="envelope.fill" android_material_icon_name="email" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Email</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {local.website && (
              <TouchableOpacity style={styles.actionButton} onPress={handleWebsite}>
                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionButtonGradient}
                >
                  <IconSymbol ios_icon_name="globe" android_material_icon_name="language" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Web</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Gallery */}
          {allImages.length > 1 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Galería ({allImages.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                {allImages.map((image, index) => (
                  <TouchableOpacity key={index} onPress={() => handleOpenGallery(index)}>
                    <OptimizedImage
                      source={{ uri: image }}
                      style={styles.galleryImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Horarios */}
          {hasHorarios && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Horarios</Text>
              {DIAS_SEMANA.map((dia) => {
                const horariosDia = horarios[dia] || [];
                return (
                  <View key={dia} style={styles.horarioRow}>
                    <Text style={styles.horarioDia}>{dia.charAt(0).toUpperCase() + dia.slice(1)}</Text>
                    <Text style={styles.horarioHoras}>
                      {horariosDia.length > 0 ? horariosDia.join(', ') : 'Cerrado'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Servicios */}
          {hasServicios && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Servicios</Text>
              <View style={styles.tagsContainer}>
                {Object.entries(servicios).map(([key, value]) => {
                  if (value) {
                    return (
                      <View key={key} style={styles.tag}>
                        <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={16} color={colors.primary} />
                        <Text style={styles.tagText}>{key.replace(/_/g, ' ')}</Text>
                      </View>
                    );
                  }
                  return null;
                })}
              </View>
            </View>
          )}

          {/* Ambiente */}
          {hasAmbiente && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Ambiente</Text>
              <View style={styles.tagsContainer}>
                {Object.entries(ambiente).map(([key, value]) => {
                  if (value) {
                    return (
                      <View key={key} style={styles.tag}>
                        <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={16} color={colors.primary} />
                        <Text style={styles.tagText}>{key.replace(/_/g, ' ')}</Text>
                      </View>
                    );
                  }
                  return null;
                })}
              </View>
            </View>
          )}

          {/* Clientela */}
          {hasClientela && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Clientela</Text>
              <View style={styles.tagsContainer}>
                {Object.entries(clientela).map(([key, value]) => {
                  if (value) {
                    return (
                      <View key={key} style={styles.tag}>
                        <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={16} color={colors.primary} />
                        <Text style={styles.tagText}>{key.replace(/_/g, ' ')}</Text>
                      </View>
                    );
                  }
                  return null;
                })}
              </View>
            </View>
          )}

          {/* Métodos de Pago */}
          {hasMetodosPago && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Métodos de Pago</Text>
              <View style={styles.tagsContainer}>
                {Object.entries(metodosPago).map(([key, value]) => {
                  if (value) {
                    return (
                      <View key={key} style={styles.tag}>
                        <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={16} color={colors.primary} />
                        <Text style={styles.tagText}>{key.replace(/_/g, ' ')}</Text>
                      </View>
                    );
                  }
                  return null;
                })}
              </View>
            </View>
          )}

          {/* Reviews */}
          <TouchableOpacity style={styles.reviewsCard} onPress={handleOpenReviews}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Reseñas</Text>
              <View style={styles.reviewsCount}>
                <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={18} color="#FFD700" />
                <Text style={styles.reviewsCountText}>{reviewCount}</Text>
              </View>
            </View>
            <Text style={styles.reviewsSubtext}>Ver todas las reseñas</Text>
            <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Bottom Padding */}
          <View style={{ height: 100 }} />
        </View>
      </Animated.ScrollView>

      {/* Fixed Header */}
      <Animated.View style={[styles.fixedHeader, headerAnimatedStyle]}>
        <BlurView intensity={100} tint="dark" style={styles.headerBlur}>
          <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{local.nombre}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionButton} onPress={handleShare}>
              <IconSymbol ios_icon_name="square.and.arrow.up" android_material_icon_name="share" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionButton} onPress={handleToggleFavorito} disabled={loadingFavorite}>
              {loadingFavorite ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <IconSymbol
                  ios_icon_name={localIsFavorite ? "heart.fill" : "heart"}
                  android_material_icon_name={localIsFavorite ? "favorite" : "favorite_border"}
                  size={20}
                  color={localIsFavorite ? "#EF4444" : "#fff"}
                />
              )}
            </TouchableOpacity>
          </View>
        </BlurView>
      </Animated.View>

      {/* Floating Back Button */}
      <TouchableOpacity style={styles.floatingBackButton} onPress={() => router.back()}>
        <BlurView intensity={80} tint="dark" style={styles.floatingBackBlur}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color="#fff" />
        </BlurView>
      </TouchableOpacity>

      {/* Floating Actions */}
      <View style={styles.floatingActions}>
        <TouchableOpacity style={styles.floatingActionButton} onPress={handleShare}>
          <BlurView intensity={80} tint="dark" style={styles.floatingActionBlur}>
            <IconSymbol ios_icon_name="square.and.arrow.up" android_material_icon_name="share" size={20} color="#fff" />
          </BlurView>
        </TouchableOpacity>
        <TouchableOpacity style={styles.floatingActionButton} onPress={handleToggleFavorito} disabled={loadingFavorite}>
          <BlurView intensity={80} tint="dark" style={styles.floatingActionBlur}>
            {loadingFavorite ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <IconSymbol
                ios_icon_name={localIsFavorite ? "heart.fill" : "heart"}
                android_material_icon_name={localIsFavorite ? "favorite" : "favorite_border"}
                size={20}
                color={localIsFavorite ? "#EF4444" : "#fff"}
              />
            )}
          </BlurView>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      {galleryVisible && (
        <ImageGalleryModal
          visible={galleryVisible}
          images={allImages}
          initialIndex={currentImageIndex}
          onClose={() => setGalleryVisible(false)}
        />
      )}

      {reviewsVisible && (
        <ReviewsModal
          visible={reviewsVisible}
          localId={localId}
          onClose={() => setReviewsVisible(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerImageContainer: {
    height: HEADER_HEIGHT,
    width: '100%',
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  statusBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 48,
    left: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  statusBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  statusDotOpen: {
    backgroundColor: '#10B981',
  },
  statusDotClosed: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  statusSubtext: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  ratingBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 48,
    right: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  ratingBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  destacadoBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 88,
    left: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  destacadoBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  destacadoText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  contentContainer: {
    padding: 16,
  },
  titleSection: {
    marginBottom: 16,
  },
  localName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  infoCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  galleryScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  galleryImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginRight: 12,
  },
  horarioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  horarioDia: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  horarioHoras: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  reviewsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewsHeader: {
    flex: 1,
  },
  reviewsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  reviewsCountText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  reviewsSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 8,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 100 : 80,
    zIndex: 100,
  },
  headerBlur: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBackButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 48,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 99,
  },
  floatingBackBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingActions: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 48,
    right: 16,
    gap: 12,
    zIndex: 99,
  },
  floatingActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  floatingActionBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
