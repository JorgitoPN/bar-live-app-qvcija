
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  TouchableOpacity,
  Platform,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { BlurView } from 'expo-blur';
import { supabase } from '@/utils/supabase';
import OptimizedImage from '@/components/common/OptimizedImage';
import { getEstadoLocal } from '@/utils/timeUtils';
import { CATEGORIAS_EXCLUIDAS } from '@/utils/constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { calcularDistancia } from '@/utils/locationUtils';
import { trackProfileView } from '@/utils/activityTracker';
import { useMode } from '@/contexts/ModeContext';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LocalDetailsModalProps {
  visible: boolean;
  localId: string;
  onClose: () => void;
}

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
  plan_activo?: string;
  local_profile_id?: string;
}

const getCategoryIcon = (categoria?: string): { ios: string; android: string; color: string } => {
  const categoryMap: Record<string, { ios: string; android: string; color: string }> = {
    'bar': { ios: 'wineglass.fill', android: 'local_bar', color: '#F59E0B' },
    'restaurante': { ios: 'fork.knife', android: 'restaurant', color: '#EF4444' },
    'cafe': { ios: 'cup.and.saucer.fill', android: 'local_cafe', color: '#8B5CF6' },
    'cafetería': { ios: 'cup.and.saucer.fill', android: 'local_cafe', color: '#8B5CF6' },
    'pub': { ios: 'wineglass', android: 'sports_bar', color: '#10B981' },
    'discoteca': { ios: 'music.note', android: 'nightlife', color: '#EC4899' },
    'cocteleria': { ios: 'wineglass.fill', android: 'local_bar', color: '#3B82F6' },
    'coctelería': { ios: 'wineglass.fill', android: 'local_bar', color: '#3B82F6' },
  };
  return categoryMap[categoria?.toLowerCase() || ''] || { ios: 'mappin.circle.fill', android: 'location_on', color: colors.primary };
}

/**
 * ✅ LOCAL DETAILS MODAL v141.0 - ANDROID SCALING COMPLETE
 * 
 * CRITICAL FIXES v141.0 (ANDROID ONLY):
 * - ✅ All font sizes use scaleFontSize() for consistency
 * - ✅ All icon sizes use scaleIconSize() for proper proportions
 * - ✅ All text elements properly scaled
 * - ✅ iOS design remains unchanged
 * 
 * Previous fixes maintained (v55.0):
 * - ✅ Rating synced with actual reviews from reviews_barlive table
 * - ✅ "Estoy en este local" and "Sala Virtual" buttons hidden in propietario mode
 * - ✅ Real-time rating updates
 */

export default function LocalDetailsModal({
  visible,
  localId,
  onClose,
}: LocalDetailsModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode, activeProfileType } = useMode();
  const { isFavorite, toggleFavorite, loading: loadingFavorite } = useFavorites();
  const [local, setLocal] = useState<Local | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [actualRating, setActualRating] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);

  const localIsFavorite = localId ? isFavorite(localId) : false;

  // ✅ Check if user is in propietario mode with local profile active
  const isInPropietarioMode = currentMode === 'propietario' && activeProfileType === 'local';

  // ✅ Load user location for distance calculation
  useEffect(() => {
    (async () => {
      try {
        const isAvailable = await Location.hasServicesEnabledAsync();
        if (!isAvailable) {
          console.log('[LocalDetailsModal v141.0] ⚠️ Location services are disabled');
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('[LocalDetailsModal v141.0] ⚠️ Location permission denied');
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 0,
        });
        
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        console.log('[LocalDetailsModal v141.0] 📍 User location obtained');
      } catch (error: any) {
        console.error('[LocalDetailsModal v141.0] ❌ Error getting location:', error?.message);
        setUserLocation(null);
      }
    })();
  }, []);

  // ✅ Calculate distance when location and local data are available
  useEffect(() => {
    if (userLocation && local?.latitud && local?.longitud) {
      const distKm = calcularDistancia(
        userLocation.latitude, 
        userLocation.longitude, 
        Number(local.latitud), 
        Number(local.longitud)
      );

      const dist = distKm < 1 
        ? `${Math.round(distKm * 1000)} m` 
        : `${distKm.toFixed(1)} km`;

      setDistance(dist);
      console.log('[LocalDetailsModal v141.0] 📏 Distance calculated:', dist);
    }
  }, [userLocation, local]);

  const loadLocalData = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('locales')
        .select('*')
        .eq('id', localId)
        .single();

      if (error) throw error;
      setLocal(data);
      console.log('[LocalDetailsModal v141.0] ✅ Local loaded:', {
        id: data.id,
        nombre: data.nombre,
        plan_activo: data.plan_activo,
        local_profile_id: data.local_profile_id,
      });

      // ✅ CRITICAL FIX v55.0: Load actual rating from reviews_barlive table
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews_barlive')
        .select('rating')
        .eq('local_id', localId);

      if (!reviewsError && reviewsData && reviewsData.length > 0) {
        const avgRating = reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length;
        setActualRating(avgRating);
        setReviewCount(reviewsData.length);
        console.log('[LocalDetailsModal v141.0] ✅ Calculated rating from reviews:', {
          avgRating: avgRating.toFixed(1),
          reviewCount: reviewsData.length,
        });
      } else {
        // Fall back to Google rating or local rating
        const fallbackRating = data.rating || data.google_rating || 0;
        setActualRating(fallbackRating);
        setReviewCount(0);
        console.log('[LocalDetailsModal v141.0] ℹ️ Using fallback rating:', fallbackRating);
      }
    } catch (error) {
      console.error('[LocalDetailsModal v141.0] Error loading local:', error);
      Alert.alert('Error', 'No se pudo cargar el local');
    } finally {
      setLoading(false);
    }
  }, [localId]);

  useEffect(() => {
    if (visible) {
      console.log('[LocalDetailsModal v141.0] 🚀 Opening modal for local:', localId);
      loadLocalData();
    } else {
      setLocal(null);
      setLoading(true);
      setActualRating(0);
      setReviewCount(0);
    }
  }, [visible, localId, loadLocalData]);

  // ✅ NEW v55.0: Real-time rating updates
  useEffect(() => {
    if (visible && localId) {
      console.log('[LocalDetailsModal v141.0] 🔄 Setting up real-time rating listener for:', localId);
      
      const subscription = supabase
        .channel(`reviews-${localId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reviews_barlive',
            filter: `local_id=eq.${localId}`,
          },
          async (payload) => {
            console.log('[LocalDetailsModal v141.0] 🔔 Review updated:', payload);
            
            // Reload rating
            const { data: reviewsData, error: reviewsError } = await supabase
              .from('reviews_barlive')
              .select('rating')
              .eq('local_id', localId);

            if (!reviewsError && reviewsData && reviewsData.length > 0) {
              const avgRating = reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length;
              setActualRating(avgRating);
              setReviewCount(reviewsData.length);
              console.log('[LocalDetailsModal v141.0] ✅ Rating updated:', avgRating.toFixed(1));
            }
          }
        )
        .subscribe();

      return () => {
        console.log('[LocalDetailsModal v141.0] 🔌 Unsubscribing from rating updates');
        subscription.unsubscribe();
      };
    }
  }, [visible, localId]);

  const handleToggleFavorito = async (e: any) => {
    e.stopPropagation();
    if (localId) {
      await toggleFavorite(localId);
    }
  };

  const handleCall = () => {
    if (local?.telefono) {
      Linking.openURL(`tel:${local.telefono}`);
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
    }
  };

  const handleViewFullDetails = () => {
    onClose();
    setTimeout(() => {
      router.push({ pathname: '/detalle/local', params: { id: localId } });
    }, 300);
  };

  const handlePerfilSocial = () => {
    trackProfileView(localId, user?.id, 'social');
    onClose();
    setTimeout(() => {
      if (local?.local_profile_id) {
        router.push(`/perfil/local?localId=${local.local_profile_id}`);
      } else {
        router.push(`/perfil/local?localId=${localId}`);
      }
    }, 300);
  };

  if (!visible) return null;

  const allImages = local ? [
    local.imagen_url || local.foto_principal,
    ...(local.fotos || []),
    ...(local.galeria_urls || [])
  ].filter(Boolean) : [];

  const estadoLocal = local ? getEstadoLocal(local) : null;
  const isOpen = estadoLocal?.estaAbierto === true;

  const allCategories = local ? (local.barlive_types && local.barlive_types.length > 0 
    ? local.barlive_types 
    : local.barlive_type 
      ? [local.barlive_type] 
      : local.categoria 
        ? [local.categoria] 
        : []
  ).filter(cat => !CATEGORIAS_EXCLUIDAS.some(excluded => cat.toLowerCase().includes(excluded.toLowerCase()))) : [];

  // ✅ CRITICAL FIX v55.0: Use actual rating from reviews
  const displayRating = actualRating > 0 ? actualRating : (local?.rating || local?.google_rating || 0);

  const closeButtonTop = local?.destacado 
    ? (Platform.OS === 'ios' ? 100 : 100)
    : (Platform.OS === 'ios' ? 60 : 60);

  const hasSocialProfile = !!(
    local?.local_profile_id || 
    local?.plan_activo === 'premium' || 
    local?.plan_activo === 'estandar'
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0, 0, 0, 0.7)" translucent />
      
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity 
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView 
            style={styles.contentContainer}
            contentContainerStyle={styles.contentContainerInner}
            showsVerticalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled={true}
            scrollEnabled={true}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { fontSize: scaleFontSize(16) }]}>Cargando local...</Text>
              </View>
            ) : local ? (
              <React.Fragment>
                {allImages.length > 0 && (
                  <View style={styles.coverContainer}>
                    <OptimizedImage
                      source={{ uri: allImages[currentImageIndex] }}
                      style={styles.coverImage}
                      resizeMode="cover"
                    />

                    <TouchableOpacity 
                      style={[styles.closeButtonFixed, { top: closeButtonTop }]} 
                      onPress={onClose}
                    >
                      <BlurView intensity={80} tint="dark" style={styles.buttonBlur}>
                        <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={scaleIconSize(18)} color="#fff" />
                      </BlurView>
                    </TouchableOpacity>
                
                    {/* ✅ CRITICAL FIX v55.0: Show actual rating with review count */}
                    {displayRating > 0 && (
                      <View style={styles.ratingBadgeTopRight}>
                        <BlurView intensity={90} tint="dark" style={styles.ratingBlur}>
                          <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={scaleIconSize(16)} color="#FFD700" />
                          <Text style={[styles.ratingText, { fontSize: scaleFontSize(15) }]}>{displayRating.toFixed(1)}</Text>
                          {reviewCount > 0 && (
                            <Text style={[styles.reviewCountText, { fontSize: scaleFontSize(12) }]}>({reviewCount})</Text>
                          )}
                        </BlurView>
                      </View>
                    )}
                
                    {estadoLocal && (
                      <View style={styles.statusBadgeTop}>
                        <BlurView intensity={90} tint="dark" style={styles.statusBlur}>
                          <View style={[styles.statusDot, isOpen ? styles.statusDotOpen : styles.statusDotClosed]} />
                          <Text style={[styles.statusText, { fontSize: scaleFontSize(14) }]}>
                            {estadoLocal.badge}
                          </Text>
                          {estadoLocal.tiempoRestante && (
                            <Text style={[styles.statusSubtext, { fontSize: scaleFontSize(12) }]}>• {estadoLocal.tiempoRestante}</Text>
                          )}
                        </BlurView>
                      </View>
                    )}

                    {local.destacado && (
                      <View style={styles.destacadoBadgeTop}>
                        <BlurView intensity={90} tint="dark" style={styles.destacadoBlur}>
                          <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={scaleIconSize(16)} color="#F59E0B" />
                          <Text style={[styles.destacadoText, { fontSize: scaleFontSize(13) }]}>Destacado</Text>
                        </BlurView>
                      </View>
                    )}
                
                    <TouchableOpacity
                      style={styles.favoritoButton}
                      onPress={handleToggleFavorito}
                      disabled={loadingFavorite}
                    >
                      <BlurView intensity={80} tint="dark" style={styles.favoritoBlur}>
                        {loadingFavorite ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <IconSymbol
                            ios_icon_name={localIsFavorite ? "heart.fill" : "heart"}
                            android_material_icon_name={localIsFavorite ? "favorite" : "favorite_border"}
                            size={scaleIconSize(22)}
                            color={localIsFavorite ? "#EF4444" : "#FFFFFF"}
                          />
                        )}
                      </BlurView>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.contentCard}>
                  {allCategories.length > 0 && (
                    <View style={styles.categoriesRow}>
                      {allCategories.map((categoria, index) => {
                        const icon = getCategoryIcon(categoria);
                        return (
                          <View key={index} style={[styles.categoryChip, { backgroundColor: icon.color }]}>
                            <IconSymbol 
                              ios_icon_name={icon.ios} 
                              android_material_icon_name={icon.android} 
                              size={scaleIconSize(18)} 
                              color="#fff" 
                            />
                            <Text style={[styles.categoryChipText, { fontSize: scaleFontSize(13) }]}>{categoria.toUpperCase()}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {local.direccion && (
                    <View style={styles.addressContainer}>
                      <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={scaleIconSize(18)} color={colors.primary} />
                      <Text style={[styles.addressText, { fontSize: scaleFontSize(14) }]} numberOfLines={2}>
                        {local.direccion}
                      </Text>
                    </View>
                  )}

                  {distance && (
                    <View style={styles.distanceContainer}>
                      <IconSymbol ios_icon_name="location.fill" android_material_icon_name="my_location" size={scaleIconSize(16)} color={colors.primary} />
                      <Text style={[styles.distanceText, { fontSize: scaleFontSize(14) }]}>A {distance} de tu ubicación</Text>
                    </View>
                  )}

                  {(local.descripcion_google || local.descripcion) && (
                    <Text style={[styles.descriptionText, { fontSize: scaleFontSize(15) }]} numberOfLines={3}>
                      {local.descripcion_google || local.descripcion}
                    </Text>
                  )}
                  
                  {/* ✅ CRITICAL FIX v55.0: Hide "Estoy en este local" button in propietario mode */}
                  {!isInPropietarioMode && (
                    <TouchableOpacity 
                      style={styles.checkInButton}
                      onPress={handleViewFullDetails}
                    >
                      <LinearGradient
                        colors={[colors.primary, colors.secondary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.checkInGradient}
                      >
                        <IconSymbol ios_icon_name="location.fill" android_material_icon_name="location_on" size={scaleIconSize(20)} color="#fff" />
                        <Text style={[styles.checkInText, { fontSize: scaleFontSize(15) }]}>Estoy en este local</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                  
                  <View style={styles.actionsRow}>
                    {local.telefono && (
                      <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
                        <LinearGradient
                          colors={['#10B981', '#059669']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.actionBtnGradient}
                        >
                          <IconSymbol ios_icon_name="phone.fill" android_material_icon_name="phone" size={scaleIconSize(20)} color="#fff" />
                          <Text style={[styles.actionBtnText, { fontSize: scaleFontSize(14) }]}>Llamar</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                
                    {local.latitud && local.longitud && (
                      <TouchableOpacity style={styles.actionBtn} onPress={handleDirections}>
                        <LinearGradient
                          colors={[colors.primary, colors.secondary]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.actionBtnGradient}
                        >
                          <View style={styles.actionBtnContent}>
                            <IconSymbol ios_icon_name="map.fill" android_material_icon_name="map" size={scaleIconSize(20)} color="#fff" />
                            <Text style={[styles.actionBtnText, { fontSize: scaleFontSize(14) }]}>Cómo llegar</Text>
                            {distance && Platform.OS === 'android' && (
                              <Text style={[styles.actionBtnDistance, { fontSize: scaleFontSize(12) }]}>({distance})</Text>
                            )}
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>

                  {hasSocialProfile && (
                    <TouchableOpacity 
                      style={styles.perfilSocialButton} 
                      onPress={handlePerfilSocial}
                    >
                      <LinearGradient
                        colors={[colors.primary, colors.secondary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.perfilSocialGradient}
                      >
                        <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={scaleIconSize(20)} color="#fff" />
                        <Text style={[styles.perfilSocialText, { fontSize: scaleFontSize(15) }]}>Ver Perfil Social</Text>
                        <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={scaleIconSize(18)} color="#fff" />
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              </React.Fragment>
            ) : (
              <View style={styles.errorContainer}>
                <IconSymbol ios_icon_name="exclamationmark.triangle" android_material_icon_name="error" size={scaleIconSize(48)} color={colors.badgeDestacado} />
                <Text style={[styles.errorText, { fontSize: scaleFontSize(16) }]}>No se pudo cargar el local</Text>
              </View>
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    maxHeight: SCREEN_HEIGHT * 0.85,
    backgroundColor: colors.background,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  contentContainer: {
    flex: 1,
  },
  contentContainerInner: {
    flexGrow: 1,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    marginTop: 16,
    color: colors.text,
  },
  coverContainer: {
    position: 'relative',
    height: 250,
  },
  coverImage: {
    width: '100%',
    height: 250,
  },
  closeButtonFixed: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingBadgeTopRight: {
    position: 'absolute',
    top: 12,
    right: 16,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 11,
  },
  ratingBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  ratingText: {
    fontWeight: '800',
    color: '#fff',
  },
  reviewCountText: {
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statusBadgeTop: {
    position: 'absolute',
    top: 12,
    left: 16,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 10,
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
    fontWeight: '700',
    color: '#fff',
  },
  statusSubtext: {
    color: '#fff',
    fontWeight: '600',
  },
  destacadoBadgeTop: {
    position: 'absolute',
    top: 52,
    left: 16,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 9,
  },
  destacadoBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  destacadoText: {
    fontWeight: '700',
    color: '#fff',
  },
  favoritoButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  favoritoBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 25, 25, 0.62)',
  },
  contentCard: {
    padding: 20,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  categoryChipText: {
    fontWeight: '800',
    color: '#fff',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  addressText: {
    flex: 1,
    color: colors.text,
    fontWeight: '600',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  distanceText: {
    color: colors.primary,
    fontWeight: '700',
  },
  descriptionText: {
    color: colors.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  checkInButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  checkInGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  checkInText: {
    fontWeight: '700',
    color: '#fff',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionBtnGradient: {
    paddingVertical: 12,
  },
  actionBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnText: {
    fontWeight: '700',
    color: '#fff',
  },
  actionBtnDistance: {
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  perfilSocialButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  perfilSocialGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  perfilSocialText: {
    flex: 1,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 10,
  },
});
