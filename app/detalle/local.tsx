
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Platform, Alert, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../integrations/supabase/client';
import { colors } from '../../styles/commonStyles';
import { localPreloader } from '../../utils/localPreloader';
import OptimizedImage from '../../components/common/OptimizedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Local {
  id: string;
  nombre: string;
  descripcion?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  web?: string;
  horario?: string;
  categoria?: string;
  subcategoria?: string;
  precio_medio?: number;
  valoracion?: number;
  foto_principal?: string;
  fotos?: string[];
  galeria_urls?: string[];
  latitud?: number;
  longitud?: number;
  ciudad?: string;
  provincia?: string;
  codigo_postal?: string;
  capacidad?: number;
  servicios?: string[];
  ambiente?: string;
  musica?: string;
  dress_code?: string;
  edad_minima?: number;
  accesibilidad?: boolean;
  parking?: boolean;
  terraza?: boolean;
  wifi?: boolean;
  reservas?: boolean;
  delivery?: boolean;
  takeaway?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Review {
  id: string;
  local_id: string;
  usuario_id: string;
  rating: number;
  texto?: string;
  created_at: string;
  usuario?: {
    nombre?: string;
    avatar?: string;
  };
}

export default function DetalleLocalScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [local, setLocal] = useState<Local | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const cargarReviewsBarlive = useCallback(async () => {
    try {
      setLoadingReviews(true);
      const { data, error } = await supabase
        .from('reviews_barlive')
        .select(`
          *,
          usuario:usuario_id (
            nombre,
            avatar
          )
        `)
        .eq('local_id', params.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('[DetalleLocal] Error loading reviews:', error);
        return;
      }

      console.log('[DetalleLocal] Loaded reviews:', data);
      setReviews(data || []);
      setLoadingReviews(false);
    } catch (error) {
      console.error('[DetalleLocal] Error loading reviews:', error);
      setLoadingReviews(false);
    }
  }, [params.id]);

  const cargarLocal = useCallback(async () => {
    try {
      const cachedData = localPreloader.getCached(params.id as string);
      if (cachedData) {
        console.log('[DetalleLocal] Using cached data - INSTANT LOAD');
        setLocal(cachedData);
        setLoading(false);
        cargarReviewsBarlive();
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('locales')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) {
        console.error('[DetalleLocal] Error loading local:', error);
        setLoading(false);
        return;
      }

      console.log('[DetalleLocal] Loaded local from Supabase:', data);
      setLocal(data);
      setLoading(false);
      cargarReviewsBarlive();
    } catch (error) {
      console.error('[DetalleLocal] Error:', error);
      setLoading(false);
    }
  }, [params.id, cargarReviewsBarlive]);

  useEffect(() => {
    if (params.id) {
      cargarLocal();
    }
  }, [params.id, cargarLocal]);

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
    if (local?.web) {
      Linking.openURL(local.web);
    }
  };

  const handleDirections = () => {
    if (local?.latitud && local?.longitud) {
      const url = Platform.select({
        ios: `maps:0,0?q=${local.latitud},${local.longitud}`,
        android: `geo:0,0?q=${local.latitud},${local.longitud}`,
        default: `https://www.google.com/maps/search/?api=1&query=${local.latitud},${local.longitud}`
      });
      Linking.openURL(url);
    }
  };

  const handleShare = () => {
    Alert.alert('Compartir', 'Funcionalidad de compartir próximamente');
  };

  const handleFavorite = () => {
    Alert.alert('Favoritos', 'Funcionalidad de favoritos próximamente');
  };

  const handleVirtualRoom = () => {
    router.push({
      pathname: '/detalle/sala-virtual',
      params: { localId: params.id }
    });
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
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <Text style={styles.errorText}>No se pudo cargar el local</Text>
        <TouchableOpacity style={styles.retryButton} onPress={cargarLocal}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Get all images
  const allImages = [
    local.foto_principal,
    ...(local.fotos || []),
    ...(local.galeria_urls || [])
  ].filter(Boolean);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Image Gallery */}
      {allImages.length > 0 && (
        <View style={styles.galleryContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setCurrentImageIndex(index);
            }}
            scrollEventThrottle={16}
          >
            {allImages.map((image, index) => (
              <OptimizedImage
                key={index}
                source={{ uri: image }}
                style={styles.headerImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
          
          {/* Image Indicators */}
          {allImages.length > 1 && (
            <View style={styles.imageIndicators}>
              {allImages.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    currentImageIndex === index && styles.indicatorActive
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <BlurView intensity={80} tint="dark" style={styles.buttonBlur}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </BlurView>
      </TouchableOpacity>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <BlurView intensity={80} tint="dark" style={styles.buttonBlur}>
            <Ionicons name="share-outline" size={22} color="#fff" />
          </BlurView>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleFavorite}>
          <BlurView intensity={80} tint="dark" style={styles.buttonBlur}>
            <Ionicons name="heart-outline" size={22} color="#fff" />
          </BlurView>
        </TouchableOpacity>
      </View>

      {/* Content Card */}
      <View style={styles.contentCard}>
        {/* Title and Rating */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{local.nombre}</Text>
          {local.valoracion && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={18} color="#FFD700" />
              <Text style={styles.rating}>{local.valoracion.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Category */}
        {local.categoria && (
          <View style={styles.categoryRow}>
            <Ionicons name="pricetag" size={16} color={colors.primary} />
            <Text style={styles.category}>{local.categoria}</Text>
            {local.subcategoria && (
              <Text style={styles.subcategory}> • {local.subcategoria}</Text>
            )}
          </View>
        )}

        {/* Quick Action Buttons */}
        <View style={styles.quickActions}>
          {local.telefono && (
            <TouchableOpacity style={styles.quickActionButton} onPress={handleCall}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.quickActionGradient}
              >
                <Ionicons name="call" size={20} color="#fff" />
                <Text style={styles.quickActionText}>Llamar</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          
          {local.latitud && local.longitud && (
            <TouchableOpacity style={styles.quickActionButton} onPress={handleDirections}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.quickActionGradient}
              >
                <Ionicons name="navigate" size={20} color="#fff" />
                <Text style={styles.quickActionText}>Cómo llegar</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.quickActionButton} onPress={handleVirtualRoom}>
            <LinearGradient
              colors={['#9333EA', '#C026D3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.quickActionGradient}
            >
              <Ionicons name="cube" size={20} color="#fff" />
              <Text style={styles.quickActionText}>Sala Virtual</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Description */}
        {local.descripcion && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={22} color={colors.primary} />
              <Text style={styles.sectionTitle}>Descripción</Text>
            </View>
            <Text style={styles.description}>{local.descripcion}</Text>
          </View>
        )}

        {/* Contact Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="call" size={22} color={colors.primary} />
            <Text style={styles.sectionTitle}>Información de contacto</Text>
          </View>
          
          {local.direccion && (
            <TouchableOpacity style={styles.infoRow} onPress={handleDirections}>
              <View style={styles.infoIcon}>
                <Ionicons name="location" size={20} color={colors.primary} />
              </View>
              <Text style={styles.infoText}>{local.direccion}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          {local.telefono && (
            <TouchableOpacity style={styles.infoRow} onPress={handleCall}>
              <View style={styles.infoIcon}>
                <Ionicons name="call" size={20} color={colors.primary} />
              </View>
              <Text style={styles.infoText}>{local.telefono}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          {local.email && (
            <TouchableOpacity style={styles.infoRow} onPress={handleEmail}>
              <View style={styles.infoIcon}>
                <Ionicons name="mail" size={20} color={colors.primary} />
              </View>
              <Text style={styles.infoText}>{local.email}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          {local.web && (
            <TouchableOpacity style={styles.infoRow} onPress={handleWebsite}>
              <View style={styles.infoIcon}>
                <Ionicons name="globe" size={20} color={colors.primary} />
              </View>
              <Text style={styles.infoText} numberOfLines={1}>{local.web}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Schedule */}
        {local.horario && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time" size={22} color={colors.primary} />
              <Text style={styles.sectionTitle}>Horario</Text>
            </View>
            <View style={styles.scheduleCard}>
              <Text style={styles.scheduleText}>{local.horario}</Text>
            </View>
          </View>
        )}

        {/* Features Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            <Text style={styles.sectionTitle}>Características</Text>
          </View>
          <View style={styles.featuresGrid}>
            {local.parking && (
              <View style={styles.featureCard}>
                <Ionicons name="car" size={24} color={colors.primary} />
                <Text style={styles.featureText}>Parking</Text>
              </View>
            )}
            {local.terraza && (
              <View style={styles.featureCard}>
                <Ionicons name="sunny" size={24} color={colors.primary} />
                <Text style={styles.featureText}>Terraza</Text>
              </View>
            )}
            {local.wifi && (
              <View style={styles.featureCard}>
                <Ionicons name="wifi" size={24} color={colors.primary} />
                <Text style={styles.featureText}>WiFi</Text>
              </View>
            )}
            {local.accesibilidad && (
              <View style={styles.featureCard}>
                <Ionicons name="accessibility" size={24} color={colors.primary} />
                <Text style={styles.featureText}>Accesible</Text>
              </View>
            )}
            {local.reservas && (
              <View style={styles.featureCard}>
                <Ionicons name="calendar" size={24} color={colors.primary} />
                <Text style={styles.featureText}>Reservas</Text>
              </View>
            )}
            {local.delivery && (
              <View style={styles.featureCard}>
                <Ionicons name="bicycle" size={24} color={colors.primary} />
                <Text style={styles.featureText}>Delivery</Text>
              </View>
            )}
          </View>
        </View>

        {/* Services */}
        {local.servicios && local.servicios.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list" size={22} color={colors.primary} />
              <Text style={styles.sectionTitle}>Servicios</Text>
            </View>
            <View style={styles.servicesContainer}>
              {local.servicios.map((servicio, index) => (
                <View key={index} style={styles.serviceChip}>
                  <Text style={styles.serviceText}>{servicio}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Reviews */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={22} color={colors.primary} />
            <Text style={styles.sectionTitle}>Reseñas</Text>
          </View>
          {loadingReviews ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : reviews.length > 0 ? (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAuthor}>
                    {review.usuario?.avatar ? (
                      <OptimizedImage
                        source={{ uri: review.usuario.avatar }}
                        style={styles.reviewAvatar}
                      />
                    ) : (
                      <View style={styles.reviewAvatarPlaceholder}>
                        <Ionicons name="person" size={20} color={colors.textSecondary} />
                      </View>
                    )}
                    <Text style={styles.reviewAuthorName}>
                      {review.usuario?.nombre || 'Usuario anónimo'}
                    </Text>
                  </View>
                  <View style={styles.reviewRating}>
                    <Ionicons name="star" size={16} color="#FFD700" />
                    <Text style={styles.reviewRatingText}>{review.rating}</Text>
                  </View>
                </View>
                {review.texto && (
                  <Text style={styles.reviewComment}>{review.texto}</Text>
                )}
                <Text style={styles.reviewDate}>
                  {new Date(review.created_at).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.noReviewsCard}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.noReviews}>No hay reseñas todavía</Text>
              <Text style={styles.noReviewsSubtext}>Sé el primero en dejar una reseña</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: 120,
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
    color: colors.text,
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
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  galleryContainer: {
    position: 'relative',
  },
  headerImage: {
    width: SCREEN_WIDTH,
    height: 400,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    zIndex: 10,
  },
  buttonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    position: 'absolute',
    top: 48,
    right: 16,
    flexDirection: 'row',
    gap: 12,
    zIndex: 10,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  contentCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    padding: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  rating: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 6,
  },
  category: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  subcategory: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickActionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  scheduleCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
  },
  scheduleText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    width: (SCREEN_WIDTH - 64) / 3,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceChip: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  serviceText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  reviewAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAuthorName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reviewRatingText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  reviewComment: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  noReviewsCard: {
    backgroundColor: colors.card,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  noReviews: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    marginTop: 12,
  },
  noReviewsSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
