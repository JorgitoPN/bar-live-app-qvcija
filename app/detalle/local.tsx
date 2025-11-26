
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
import { IconSymbol } from '../../components/IconSymbol';

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
  horarios_completos?: Record<string, string[]>;
  estado_actual?: 'abierto_ahora' | 'cerrado_ahora';
  clientela?: Record<string, boolean>;
  plan_activo?: string;
  logo?: string;
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

// Helper function to get category icon
const getCategoryIcon = (categoria?: string): string => {
  const categoryMap: Record<string, string> = {
    'bar': 'beer',
    'restaurante': 'restaurant',
    'cafe': 'cafe',
    'pub': 'beer-outline',
    'discoteca': 'musical-notes',
    'cocteleria': 'wine',
    'lounge': 'bed',
    'terraza': 'sunny',
    'rooftop': 'arrow-up-circle',
  };
  return categoryMap[categoria?.toLowerCase() || ''] || 'location';
};

// Helper function to get service icon
const getServiceIcon = (servicio: string): string => {
  const serviceMap: Record<string, string> = {
    'cerveza': 'beer',
    'cócteles': 'wine',
    'efectivo': 'cash',
    'tarjetas': 'card',
  };
  return serviceMap[servicio.toLowerCase()] || 'checkmark-circle';
};

// Helper function to calculate time until closing
const getTimeUntilClosing = (horarios?: Record<string, string[]>): string | null => {
  if (!horarios) return null;
  
  const now = new Date();
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const currentDay = dayNames[now.getDay()];
  const todayHours = horarios[currentDay];
  
  if (!todayHours || todayHours.length === 0) return null;
  
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  for (const range of todayHours) {
    const [open, close] = range.split('–').map(t => {
      const [h, m] = t.trim().split(':').map(Number);
      return h * 60 + m;
    });
    
    if (currentTime >= open && currentTime < close) {
      const minutesUntilClose = close - currentTime;
      const hours = Math.floor(minutesUntilClose / 60);
      const minutes = minutesUntilClose % 60;
      
      if (hours > 0) {
        return `${hours} h ${minutes} min`;
      }
      return `${minutes} min`;
    }
  }
  
  return null;
};

export default function DetalleLocalScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [local, setLocal] = useState<Local | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [averageRating, setAverageRating] = useState(0);

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
      
      // Calculate average rating
      if (data && data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setAverageRating(avg);
      }
      
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

  const handleVirtualRoom = () => {
    router.push({
      pathname: '/detalle/sala-virtual',
      params: { localId: params.id }
    });
  };

  const handleSocialProfile = () => {
    router.push({
      pathname: '/perfil/local',
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

  const isOpen = local.estado_actual === 'abierto_ahora';
  const timeUntilClosing = getTimeUntilClosing(local.horarios_completos);
  const hasSocialProfile = local.plan_activo === 'estandar' || local.plan_activo === 'premium';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Cover Photo with Status Badge and Rating */}
      {allImages.length > 0 && (
        <View style={styles.coverContainer}>
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
                style={styles.coverImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
          
          {/* Status Badge - Top Left */}
          <View style={styles.statusBadge}>
            <BlurView intensity={80} tint="dark" style={styles.statusBlur}>
              <View style={[styles.statusDot, isOpen ? styles.statusDotOpen : styles.statusDotClosed]} />
              <Text style={styles.statusText}>
                {isOpen ? 'Abierto ahora' : 'Cerrado ahora'}
              </Text>
              {isOpen && timeUntilClosing && (
                <Text style={styles.statusSubtext}>• Cierra en {timeUntilClosing}</Text>
              )}
            </BlurView>
          </View>

          {/* Rating Badge - Top Right */}
          {averageRating > 0 && (
            <View style={styles.ratingBadgeTop}>
              <BlurView intensity={80} tint="dark" style={styles.ratingBlur}>
                <Ionicons name="star" size={18} color="#FFD700" />
                <Text style={styles.ratingTextTop}>{averageRating.toFixed(1)}</Text>
              </BlurView>
            </View>
          )}
          
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

      {/* Content Card */}
      <View style={styles.contentCard}>
        {/* Title */}
        <Text style={styles.title}>{local.nombre}</Text>

        {/* Category with Icon */}
        {local.categoria && (
          <View style={styles.categoryRow}>
            <IconSymbol 
              ios_icon_name={getCategoryIcon(local.categoria)} 
              android_material_icon_name={getCategoryIcon(local.categoria)} 
              size={18} 
              color={colors.primary} 
            />
            <Text style={styles.category}>{local.categoria}</Text>
            {local.subcategoria && (
              <Text style={styles.subcategory}> • {local.subcategoria}</Text>
            )}
          </View>
        )}

        {/* Address */}
        {local.direccion && (
          <TouchableOpacity style={styles.addressRow} onPress={handleDirections}>
            <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={18} color={colors.primary} />
            <Text style={styles.addressText}>{local.direccion}</Text>
          </TouchableOpacity>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          {local.telefono && (
            <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionButtonGradient}
              >
                <IconSymbol ios_icon_name="phone.fill" android_material_icon_name="phone" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Llamar</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          
          {local.latitud && local.longitud && (
            <TouchableOpacity style={styles.actionButton} onPress={handleDirections}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionButtonGradient}
              >
                <IconSymbol ios_icon_name="map.fill" android_material_icon_name="map" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Cómo llegar</Text>
                {local.latitud && (
                  <Text style={styles.distanceText}>• 2.5 km</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Virtual Room Button */}
        <TouchableOpacity style={styles.virtualRoomButton} onPress={handleVirtualRoom}>
          <LinearGradient
            colors={['#9333EA', '#C026D3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.virtualRoomGradient}
          >
            <IconSymbol ios_icon_name="cube.fill" android_material_icon_name="view_in_ar" size={22} color="#fff" />
            <Text style={styles.virtualRoomText}>Sala Virtual</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Social Profile Button (if plan is standard or premium) */}
        {hasSocialProfile && (
          <TouchableOpacity style={styles.socialProfileButton} onPress={handleSocialProfile}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.socialProfileGradient}
            >
              <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={22} color="#fff" />
              <Text style={styles.socialProfileText}>Ver Perfil Social</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Schedule Section */}
        {local.horarios_completos && Object.keys(local.horarios_completos).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol ios_icon_name="clock.fill" android_material_icon_name="schedule" size={22} color={colors.primary} />
              <Text style={styles.sectionTitle}>Horarios</Text>
            </View>
            <View style={styles.scheduleContainer}>
              {Object.entries(local.horarios_completos).map(([day, hours]) => (
                <View key={day} style={styles.scheduleRow}>
                  <Text style={styles.scheduleDay}>{day.charAt(0).toUpperCase() + day.slice(1)}</Text>
                  <Text style={styles.scheduleHours}>
                    {hours.length > 0 ? hours.join(', ') : 'Cerrado'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Services Section with Icons */}
        {local.servicios && local.servicios.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol ios_icon_name="bell.fill" android_material_icon_name="notifications" size={22} color={colors.primary} />
              <Text style={styles.sectionTitle}>Servicios Disponibles</Text>
            </View>
            <View style={styles.servicesGrid}>
              {local.servicios.map((servicio, index) => (
                <View key={index} style={styles.serviceItem}>
                  <IconSymbol 
                    ios_icon_name={getServiceIcon(servicio)} 
                    android_material_icon_name={getServiceIcon(servicio)} 
                    size={20} 
                    color={colors.primary} 
                  />
                  <Text style={styles.serviceText}>{servicio}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Atmosphere Section */}
        {local.ambiente && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={22} color={colors.primary} />
              <Text style={styles.sectionTitle}>Ambiente</Text>
            </View>
            <View style={styles.chipContainer}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>{local.ambiente}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Typical Clientele Section */}
        {local.clientela && Object.keys(local.clientela).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={22} color={colors.primary} />
              <Text style={styles.sectionTitle}>Clientela Típica</Text>
            </View>
            <View style={styles.chipContainer}>
              {Object.entries(local.clientela)
                .filter(([_, value]) => value)
                .map(([key, _]) => (
                  <View key={key} style={styles.chip}>
                    <Text style={styles.chipText}>{key}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Review Analysis Section */}
        {reviews.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar_chart" size={22} color={colors.primary} />
              <Text style={styles.sectionTitle}>Análisis de Reseñas</Text>
            </View>
            <View style={styles.analysisCard}>
              <Text style={styles.analysisTitle}>Sentimiento: positivo</Text>
              <Text style={styles.analysisText}>
                Los usuarios destacan comida, precio, calidad.
              </Text>
              <View style={styles.analysisTagsContainer}>
                <View style={styles.analysisTag}>
                  <Text style={styles.analysisTagText}>comida</Text>
                </View>
                <View style={styles.analysisTag}>
                  <Text style={styles.analysisTagText}>precio</Text>
                </View>
                <View style={styles.analysisTag}>
                  <Text style={styles.analysisTagText}>calidad</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Google Reviews Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={22} color={colors.primary} />
            <Text style={styles.sectionTitle}>Reseñas de Google</Text>
          </View>
          {loadingReviews ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : reviews.length > 0 ? (
            <>
              {reviews.map((review) => (
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
              ))}
              <TouchableOpacity style={styles.addReviewButton}>
                <Text style={styles.addReviewButtonText}>Añadir Reseña de BarLive</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.noReviewsCard}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.noReviews}>No hay reseñas todavía</Text>
              <TouchableOpacity style={styles.addReviewButton}>
                <Text style={styles.addReviewButtonText}>Sé el primero en añadir una reseña</Text>
              </TouchableOpacity>
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
  coverContainer: {
    position: 'relative',
    height: 300,
  },
  coverImage: {
    width: SCREEN_WIDTH,
    height: 300,
  },
  statusBadge: {
    position: 'absolute',
    top: 60,
    left: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  statusBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotOpen: {
    backgroundColor: '#10B981',
  },
  statusDotClosed: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  statusSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  ratingBadgeTop: {
    position: 'absolute',
    top: 60,
    right: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  ratingBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  ratingTextTop: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
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
  contentCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
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
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  addressText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  distanceText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  virtualRoomButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  virtualRoomGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  virtualRoomText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  socialProfileButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  socialProfileGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  socialProfileText: {
    fontSize: 15,
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
  scheduleContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scheduleDay: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  scheduleHours: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  serviceText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  analysisCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  analysisText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  analysisTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  analysisTag: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  analysisTagText: {
    fontSize: 13,
    color: '#fff',
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
  addReviewButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addReviewButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
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
    marginBottom: 16,
  },
});
