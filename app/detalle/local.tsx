
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Platform, Alert, Dimensions, Share as RNShare } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../integrations/supabase/client';
import { colors } from '../../styles/commonStyles';
import { localPreloader } from '../../utils/localPreloader';
import OptimizedImage from '../../components/common/OptimizedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { IconSymbol } from '../../components/IconSymbol';
import * as Location from 'expo-location';
import ImageGalleryModal from '../../components/detalle/ImageGalleryModal';

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
  imagen_url?: string;
  fotos?: string[];
  galeria_urls?: string[];
  latitud?: number;
  longitud?: number;
  ciudad?: string;
  provincia?: string;
  codigo_postal?: string;
  capacidad?: number;
  servicios?: string[];
  servicios_disponibles?: Record<string, any>;
  ambiente?: string;
  ambiente_completo?: Record<string, boolean>;
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
  barlive_type?: string;
  analisis_reviews?: Record<string, any>;
  reviews_google?: any[];
  google_rating?: number;
  google_user_ratings_total?: number;
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
const getCategoryIcon = (categoria?: string): { ios: string; android: string } => {
  const categoryMap: Record<string, { ios: string; android: string }> = {
    'bar': { ios: 'wineglass.fill', android: 'local_bar' },
    'restaurante': { ios: 'fork.knife', android: 'restaurant' },
    'cafe': { ios: 'cup.and.saucer.fill', android: 'local_cafe' },
    'pub': { ios: 'wineglass', android: 'sports_bar' },
    'discoteca': { ios: 'music.note', android: 'nightlife' },
    'cocteleria': { ios: 'wineglass.fill', android: 'local_bar' },
    'lounge': { ios: 'sofa', android: 'weekend' },
    'terraza': { ios: 'sun.max.fill', android: 'wb_sunny' },
    'rooftop': { ios: 'arrow.up.circle.fill', android: 'roofing' },
  };
  return categoryMap[categoria?.toLowerCase() || ''] || { ios: 'mappin.circle.fill', android: 'location_on' };
};

// Helper function to get service icon
const getServiceIcon = (servicio: string): { ios: string; android: string } => {
  const serviceMap: Record<string, { ios: string; android: string }> = {
    'cerveza': { ios: 'wineglass', android: 'sports_bar' },
    'cócteles': { ios: 'wineglass.fill', android: 'local_bar' },
    'cocktails': { ios: 'wineglass.fill', android: 'local_bar' },
    'efectivo': { ios: 'banknote', android: 'payments' },
    'tarjetas': { ios: 'creditcard.fill', android: 'credit_card' },
    'wifi': { ios: 'wifi', android: 'wifi' },
    'terraza': { ios: 'sun.max.fill', android: 'wb_sunny' },
    'parking': { ios: 'car.fill', android: 'local_parking' },
    'accesibilidad': { ios: 'figure.roll', android: 'accessible' },
    'reservas': { ios: 'calendar', android: 'event' },
    'delivery': { ios: 'bicycle', android: 'delivery_dining' },
    'takeaway': { ios: 'bag.fill', android: 'takeout_dining' },
    'comida': { ios: 'fork.knife', android: 'restaurant' },
    'bebidas': { ios: 'cup.and.saucer.fill', android: 'local_cafe' },
    'musica en vivo': { ios: 'music.note', android: 'music_note' },
    'karaoke': { ios: 'mic.fill', android: 'mic' },
    'tv': { ios: 'tv.fill', android: 'tv' },
    'juegos': { ios: 'gamecontroller.fill', android: 'sports_esports' },
  };
  
  const lowerServicio = servicio.toLowerCase();
  for (const [key, value] of Object.entries(serviceMap)) {
    if (lowerServicio.includes(key)) {
      return value;
    }
  }
  
  return { ios: 'checkmark.circle.fill', android: 'check_circle' };
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

// Helper function to calculate distance
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  
  if (d < 1) {
    return `${Math.round(d * 1000)} m`;
  }
  return `${d.toFixed(1)} km`;
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
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
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (error) {
        console.error('[DetalleLocal] Error getting location:', error);
      }
    })();
  }, []);

  useEffect(() => {
    if (userLocation && local?.latitud && local?.longitud) {
      const dist = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        Number(local.latitud),
        Number(local.longitud)
      );
      setDistance(dist);
    }
  }, [userLocation, local]);

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

  const handleShare = async () => {
    try {
      await RNShare.share({
        message: `¡Mira este local en BarLive! ${local?.nombre}`,
        title: local?.nombre || 'Local en BarLive',
      });
    } catch (error) {
      console.error('[DetalleLocal] Error sharing:', error);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Debes iniciar sesión para agregar favoritos');
        return;
      }

      if (isFavorite) {
        await supabase
          .from('locales_favoritos')
          .delete()
          .eq('usuario_id', user.id)
          .eq('local_id', params.id);
        setIsFavorite(false);
      } else {
        await supabase
          .from('locales_favoritos')
          .insert({
            usuario_id: user.id,
            local_id: params.id,
          });
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('[DetalleLocal] Error toggling favorite:', error);
    }
  };

  const handleAddReview = () => {
    Alert.alert('Añadir Reseña', 'Funcionalidad de añadir reseña próximamente');
  };

  const handleOpenGallery = (index: number) => {
    setGalleryInitialIndex(index);
    setGalleryVisible(true);
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
    local.imagen_url || local.foto_principal,
    ...(local.fotos || []),
    ...(local.galeria_urls || [])
  ].filter(Boolean);

  const isOpen = local.estado_actual === 'abierto_ahora';
  const timeUntilClosing = getTimeUntilClosing(local.horarios_completos);
  const hasSocialProfile = local.plan_activo === 'estandar' || local.plan_activo === 'premium';

  // Extract services from servicios_disponibles
  const allServices: string[] = [];
  if (local.servicios_disponibles) {
    Object.values(local.servicios_disponibles).forEach((category: any) => {
      if (typeof category === 'object') {
        Object.entries(category).forEach(([key, value]) => {
          if (value === true) {
            allServices.push(key.replace(/_/g, ' '));
          }
        });
      }
    });
  }
  if (local.servicios && local.servicios.length > 0) {
    allServices.push(...local.servicios);
  }

  // Extract ambiente tags
  const ambienteTags: string[] = [];
  if (local.ambiente_completo) {
    Object.entries(local.ambiente_completo).forEach(([key, value]) => {
      if (value === true) {
        ambienteTags.push(key.replace(/_/g, ' '));
      }
    });
  }
  if (local.ambiente && !ambienteTags.length) {
    ambienteTags.push(local.ambiente);
  }

  // Extract clientela tags
  const clientelaTags: string[] = [];
  if (local.clientela) {
    Object.entries(local.clientela).forEach(([key, value]) => {
      if (value === true) {
        clientelaTags.push(key.replace(/_/g, ' '));
      }
    });
  }

  // Get current day for schedule
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const currentDayName = dayNames[new Date().getDay()];

  // Calculate rating to display (Google or BarLive)
  const displayRating = local.google_rating || averageRating || 0;
  const displayRatingCount = local.google_user_ratings_total || reviews.length || 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Cover Photo with Status Badge and Rating */}
      {allImages.length > 0 && (
        <View style={styles.coverContainer}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => handleOpenGallery(currentImageIndex)}
          >
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
          </TouchableOpacity>
          
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <BlurView intensity={80} tint="dark" style={styles.buttonBlur}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </BlurView>
          </TouchableOpacity>

          {/* Status Badge - Above Back Button */}
          <View style={styles.statusBadge}>
            <BlurView intensity={80} tint="dark" style={styles.statusBlur}>
              <View style={[styles.statusDot, isOpen ? styles.statusDotOpen : styles.statusDotClosed]} />
              <Text style={styles.statusText}>
                {isOpen ? 'Abierto' : 'Cerrado'}
              </Text>
              {isOpen && timeUntilClosing && (
                <Text style={styles.statusSubtext}>• Cierra en {timeUntilClosing}</Text>
              )}
            </BlurView>
          </View>

          {/* Rating Badge - Top Right */}
          {displayRating > 0 && (
            <View style={styles.ratingBadgeTop}>
              <BlurView intensity={80} tint="dark" style={styles.ratingBlur}>
                <Ionicons name="star" size={18} color="#FFD700" />
                <Text style={styles.ratingTextTop}>{displayRating.toFixed(1)}</Text>
              </BlurView>
            </View>
          )}

          {/* Share Button - Below Rating */}
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <BlurView intensity={80} tint="dark" style={styles.buttonBlur}>
              <IconSymbol ios_icon_name="square.and.arrow.up" android_material_icon_name="share" size={22} color="#fff" />
            </BlurView>
          </TouchableOpacity>

          {/* Favorite Button - Bottom Right */}
          <TouchableOpacity style={styles.favoriteButton} onPress={handleToggleFavorite}>
            <BlurView intensity={80} tint="dark" style={styles.buttonBlur}>
              <IconSymbol 
                ios_icon_name={isFavorite ? "heart.fill" : "heart"} 
                android_material_icon_name={isFavorite ? "favorite" : "favorite_border"} 
                size={24} 
                color={isFavorite ? "#EF4444" : "#fff"} 
              />
            </BlurView>
          </TouchableOpacity>
          
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

      {/* Photo Gallery Below Cover */}
      {allImages.length > 1 && (
        <View style={styles.gallerySection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
            {allImages.slice(1, 6).map((image, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.galleryItem}
                onPress={() => handleOpenGallery(index + 1)}
              >
                <OptimizedImage
                  source={{ uri: image }}
                  style={styles.galleryImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
            {allImages.length > 6 && (
              <TouchableOpacity 
                style={styles.galleryItem}
                onPress={() => handleOpenGallery(6)}
              >
                <OptimizedImage
                  source={{ uri: allImages[6] }}
                  style={styles.galleryImage}
                  resizeMode="cover"
                />
                <View style={styles.galleryOverlay}>
                  <Text style={styles.galleryOverlayText}>+{allImages.length - 6}</Text>
                </View>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      {/* Content Card */}
      <View style={styles.contentCard}>
        {/* Title */}
        <Text style={styles.title}>{local.nombre}</Text>

        {/* Category with Icon */}
        {(local.barlive_type || local.categoria) && (
          <View style={styles.categoryRow}>
            <IconSymbol 
              ios_icon_name={getCategoryIcon(local.barlive_type || local.categoria).ios} 
              android_material_icon_name={getCategoryIcon(local.barlive_type || local.categoria).android} 
              size={18} 
              color={colors.primary} 
            />
            <Text style={styles.category}>{local.barlive_type || local.categoria}</Text>
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
                <View style={styles.actionButtonContent}>
                  <Text style={styles.actionButtonText}>Cómo llegar</Text>
                  {distance && (
                    <Text style={styles.distanceText}>{distance}</Text>
                  )}
                </View>
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
            <Text style={styles.virtualRoomText}>Ver Sala Virtual</Text>
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
              {Object.entries(local.horarios_completos).map(([day, hours]) => {
                const isToday = day.toLowerCase() === currentDayName.toLowerCase();
                return (
                  <View key={day} style={[styles.scheduleRow, isToday && styles.scheduleRowToday]}>
                    <View style={styles.scheduleDayContainer}>
                      <Text style={[styles.scheduleDay, isToday && styles.scheduleDayToday]}>
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </Text>
                      {isToday && (
                        <View style={styles.todayBadge}>
                          <Text style={styles.todayBadgeText}>Hoy</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.scheduleHours, isToday && styles.scheduleHoursToday]}>
                      {hours.length > 0 ? hours.join(', ') : 'Cerrado'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Services Section with Icons */}
        {allServices.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol ios_icon_name="list.bullet.circle.fill" android_material_icon_name="list" size={22} color={colors.primary} />
              <Text style={styles.sectionTitle}>Servicios Disponibles</Text>
            </View>
            <View style={styles.servicesGrid}>
              {allServices.map((servicio, index) => {
                const icon = getServiceIcon(servicio);
                return (
                  <View key={index} style={styles.serviceItem}>
                    <IconSymbol 
                      ios_icon_name={icon.ios} 
                      android_material_icon_name={icon.android} 
                      size={20} 
                      color={colors.primary} 
                    />
                    <Text style={styles.serviceText}>{servicio}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Atmosphere Section */}
        {ambienteTags.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={22} color={colors.primary} />
              <Text style={styles.sectionTitle}>Ambiente</Text>
            </View>
            <View style={styles.chipContainer}>
              {ambienteTags.map((tag, index) => (
                <View key={index} style={styles.chip}>
                  <Text style={styles.chipText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Typical Clientele Section */}
        {clientelaTags.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={22} color={colors.primary} />
              <Text style={styles.sectionTitle}>Clientela Típica</Text>
            </View>
            <View style={styles.chipContainer}>
              {clientelaTags.map((tag, index) => (
                <View key={index} style={styles.chip}>
                  <Text style={styles.chipText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Review Analysis Section */}
        {local.analisis_reviews && Object.keys(local.analisis_reviews).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="bar_chart" size={22} color={colors.primary} />
              <Text style={styles.sectionTitle}>Análisis de Reseñas</Text>
            </View>
            <View style={styles.analysisCard}>
              {local.analisis_reviews.sentimiento_general && (
                <Text style={styles.analysisTitle}>
                  Sentimiento: {local.analisis_reviews.sentimiento_general}
                </Text>
              )}
              {local.analisis_reviews.resumen_automatico && (
                <Text style={styles.analysisText}>
                  {local.analisis_reviews.resumen_automatico}
                </Text>
              )}
              {local.analisis_reviews.palabras_destacadas_google && local.analisis_reviews.palabras_destacadas_google.length > 0 && (
                <View style={styles.analysisTagsContainer}>
                  {local.analisis_reviews.palabras_destacadas_google.map((palabra: string, index: number) => (
                    <View key={index} style={styles.analysisTag}>
                      <Text style={styles.analysisTagText}>{palabra}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Google Reviews Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={22} color={colors.primary} />
            <Text style={styles.sectionTitle}>Reseñas</Text>
            {displayRatingCount > 0 && (
              <Text style={styles.reviewCount}>({displayRatingCount})</Text>
            )}
          </View>

          {/* Google Reviews */}
          {local.reviews_google && local.reviews_google.length > 0 && (
            <>
              {local.reviews_google.map((review: any, index: number) => (
                <View key={index} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewAuthor}>
                      {review.profile_photo_url ? (
                        <OptimizedImage
                          source={{ uri: review.profile_photo_url }}
                          style={styles.reviewAvatar}
                        />
                      ) : (
                        <View style={styles.reviewAvatarPlaceholder}>
                          <Ionicons name="person" size={20} color={colors.textSecondary} />
                        </View>
                      )}
                      <Text style={styles.reviewAuthorName}>
                        {review.author_name || 'Usuario anónimo'}
                      </Text>
                    </View>
                    <View style={styles.reviewRating}>
                      <Ionicons name="star" size={16} color="#FFD700" />
                      <Text style={styles.reviewRatingText}>{review.rating}</Text>
                    </View>
                  </View>
                  {review.text && (
                    <Text style={styles.reviewComment}>{review.text}</Text>
                  )}
                  {review.time && (
                    <Text style={styles.reviewDate}>
                      {new Date(review.time * 1000).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </Text>
                  )}
                </View>
              ))}
            </>
          )}

          {/* BarLive Reviews */}
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
                      <View>
                        <Text style={styles.reviewAuthorName}>
                          {review.usuario?.nombre || 'Usuario anónimo'}
                        </Text>
                        <Text style={styles.reviewSource}>BarLive</Text>
                      </View>
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
            </>
          ) : null}

          {/* Add Review Button */}
          <TouchableOpacity style={styles.addReviewButton} onPress={handleAddReview}>
            <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={20} color="#fff" />
            <Text style={styles.addReviewButtonText}>Añadir Reseña de BarLive</Text>
          </TouchableOpacity>

          {/* No reviews message */}
          {(!local.reviews_google || local.reviews_google.length === 0) && reviews.length === 0 && (
            <View style={styles.noReviewsCard}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.noReviews}>No hay reseñas todavía</Text>
            </View>
          )}
        </View>
      </View>

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        visible={galleryVisible}
        images={allImages}
        initialIndex={galleryInitialIndex}
        onClose={() => setGalleryVisible(false)}
      />
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
  statusBadge: {
    position: 'absolute',
    top: 100,
    left: 16,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 5,
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
    top: 48,
    right: 16,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 10,
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
  shareButton: {
    position: 'absolute',
    top: 100,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    zIndex: 10,
  },
  favoriteButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    zIndex: 10,
  },
  buttonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
  gallerySection: {
    backgroundColor: colors.background,
    paddingVertical: 12,
  },
  galleryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  galleryItem: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
    position: 'relative',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryOverlayText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  contentCard: {
    backgroundColor: colors.background,
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
    textTransform: 'capitalize',
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
  actionButtonContent: {
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  distanceText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
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
  reviewCount: {
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  scheduleContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scheduleRowToday: {
    backgroundColor: colors.primary + '10',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  scheduleDayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleDay: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  scheduleDayToday: {
    color: colors.primary,
    fontWeight: '700',
  },
  todayBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  scheduleHours: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  scheduleHoursToday: {
    color: colors.text,
    fontWeight: '600',
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
    textTransform: 'capitalize',
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
    textTransform: 'capitalize',
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
    textTransform: 'capitalize',
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
  reviewSource: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
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
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
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
  },
});
