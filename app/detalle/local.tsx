
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
import { CATEGORIAS_EXCLUIDAS } from '../../utils/constants';
import { getEstadoLocal } from '../../utils/timeUtils';
import { useAuth } from '../../contexts/AuthContext';

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
  barlive_types?: string[];
  analisis_reviews?: Record<string, any>;
  reviews_google?: any[];
  google_rating?: number;
  google_user_ratings_total?: number;
  destacado?: boolean;
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

interface Evento {
  id: string;
  titulo: string;
  descripcion?: string;
  fecha: string;
  hora_inicio?: string;
  hora_fin?: string;
  imagen_url?: string;
  precio?: number;
}

// Helper function to get category icon
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
    'sala_conciertos': { ios: 'music.note.list', android: 'music_note', color: '#F59E0B' },
  };
  return categoryMap[categoria?.toLowerCase() || ''] || { ios: 'mappin.circle.fill', android: 'location_on', color: colors.primary };
};

// Helper function to get service icon with colors
const getServiceIcon = (servicio: string): { ios: string; android: string; color: string } => {
  const serviceMap: Record<string, { ios: string; android: string; color: string }> = {
    'cerveza': { ios: 'wineglass', android: 'sports_bar', color: '#F59E0B' },
    'cócteles': { ios: 'wineglass.fill', android: 'local_bar', color: '#EC4899' },
    'cocktails': { ios: 'wineglass.fill', android: 'local_bar', color: '#EC4899' },
    'efectivo': { ios: 'banknote', android: 'payments', color: '#10B981' },
    'tarjetas': { ios: 'creditcard.fill', android: 'credit_card', color: '#3B82F6' },
    'wifi': { ios: 'wifi', android: 'wifi', color: '#8B5CF6' },
    'terraza': { ios: 'sun.max.fill', android: 'wb_sunny', color: '#F59E0B' },
    'parking': { ios: 'car.fill', android: 'local_parking', color: '#6366F1' },
    'accesibilidad': { ios: 'figure.roll', android: 'accessible', color: '#10B981' },
    'reservas': { ios: 'calendar', android: 'event', color: '#EF4444' },
    'delivery': { ios: 'bicycle', android: 'delivery_dining', color: '#F59E0B' },
    'takeaway': { ios: 'bag.fill', android: 'takeout_dining', color: '#8B5CF6' },
    'comida': { ios: 'fork.knife', android: 'restaurant', color: '#EF4444' },
    'bebidas': { ios: 'cup.and.saucer.fill', android: 'local_cafe', color: '#F59E0B' },
    'musica en vivo': { ios: 'music.note', android: 'music_note', color: '#EC4899' },
    'música en vivo': { ios: 'music.note', android: 'music_note', color: '#EC4899' },
    'karaoke': { ios: 'mic.fill', android: 'mic', color: '#8B5CF6' },
    'tv': { ios: 'tv.fill', android: 'tv', color: '#3B82F6' },
    'juegos': { ios: 'gamecontroller.fill', android: 'sports_esports', color: '#10B981' },
  };
  
  const lowerServicio = servicio.toLowerCase();
  for (const [key, value] of Object.entries(serviceMap)) {
    if (lowerServicio.includes(key)) {
      return value;
    }
  }
  
  return { ios: 'checkmark.circle.fill', android: 'check_circle', color: colors.primary };
};

// Helper function to get ambiente icon
const getAmbienteIcon = (ambiente: string): { ios: string; android: string; color: string } => {
  const ambienteMap: Record<string, { ios: string; android: string; color: string }> = {
    'familiar': { ios: 'person.3.fill', android: 'family_restroom', color: '#14B8A6' },
    'tranquilo': { ios: 'leaf.fill', android: 'spa', color: '#06B6D4' },
    'animado': { ios: 'bolt.fill', android: 'celebration', color: '#F59E0B' },
    'romántico': { ios: 'heart.fill', android: 'favorite', color: '#EC4899' },
    'romantico': { ios: 'heart.fill', android: 'favorite', color: '#EC4899' },
    'moderno': { ios: 'sparkles', android: 'auto_awesome', color: '#8B5CF6' },
    'elegante': { ios: 'star.fill', android: 'star', color: '#F59E0B' },
    'acogedor': { ios: 'house.fill', android: 'home', color: '#F59E0B' },
    'de_moda': { ios: 'sparkles', android: 'auto_awesome', color: '#EC4899' },
    'juvenil': { ios: 'bolt.fill', android: 'celebration', color: '#3B82F6' },
    'tematico': { ios: 'star.fill', android: 'star', color: '#8B5CF6' },
  };
  
  const lowerAmbiente = ambiente.toLowerCase();
  for (const [key, value] of Object.entries(ambienteMap)) {
    if (lowerAmbiente.includes(key)) {
      return value;
    }
  }
  
  return { ios: 'sparkles', android: 'auto_awesome', color: colors.primary };
};

// Helper function to get clientela icon
const getClientelaIcon = (clientela: string): { ios: string; android: string; color: string } => {
  const clientelaMap: Record<string, { ios: string; android: string; color: string }> = {
    'grupos': { ios: 'person.3.fill', android: 'groups', color: '#10B981' },
    'familias': { ios: 'house.fill', android: 'family_restroom', color: '#059669' },
    'parejas': { ios: 'heart.fill', android: 'favorite', color: '#EC4899' },
    'estudiantes': { ios: 'book.fill', android: 'school', color: '#3B82F6' },
    'turistas': { ios: 'airplane', android: 'flight', color: '#F59E0B' },
    'ninos_bienvenidos': { ios: 'figure.2.and.child.holdinghands', android: 'child_care', color: '#14B8A6' },
    'lgtbi_friendly': { ios: 'heart.fill', android: 'favorite', color: '#EC4899' },
    'locales': { ios: 'person.2.fill', android: 'people', color: '#8B5CF6' },
  };
  
  const lowerClientela = clientela.toLowerCase();
  for (const [key, value] of Object.entries(clientelaMap)) {
    if (lowerClientela.includes(key)) {
      return value;
    }
  }
  
  return { ios: 'person.2.fill', android: 'people', color: colors.primary };
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

// Helper function to summarize text
const summarizeText = (text: string, maxLength: number = 120): { summary: string; needsExpansion: boolean } => {
  if (!text || text.length <= maxLength) {
    return { summary: text, needsExpansion: false };
  }
  
  const summary = text.substring(0, maxLength).trim() + '...';
  return { summary, needsExpansion: true };
};

export default function DetalleLocalScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
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
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loadingEventos, setLoadingEventos] = useState(false);

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

  // Check if local is favorite
  const checkIfFavorite = useCallback(async () => {
    if (!user || !params.id) return;
    
    try {
      const { data, error } = await supabase
        .from('locales_favoritos')
        .select('id')
        .eq('usuario_id', user.id)
        .eq('local_id', params.id)
        .single();
      
      if (!error && data) {
        setIsFavorite(true);
      } else {
        setIsFavorite(false);
      }
    } catch (error) {
      console.error('[DetalleLocal] Error checking favorite:', error);
      setIsFavorite(false);
    }
  }, [user, params.id]);

  useEffect(() => {
    if (user) {
      checkIfFavorite();
    }
  }, [user, checkIfFavorite]);

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
        .limit(3);

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

  const cargarEventos = useCallback(async () => {
    try {
      setLoadingEventos(true);
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .eq('local_id', params.id)
        .eq('activo', true)
        .gte('fecha', new Date().toISOString().split('T')[0])
        .order('fecha', { ascending: true })
        .limit(3);

      if (error) {
        console.error('[DetalleLocal] Error loading eventos:', error);
        return;
      }

      console.log('[DetalleLocal] Loaded eventos:', data);
      setEventos(data || []);
      setLoadingEventos(false);
    } catch (error) {
      console.error('[DetalleLocal] Error loading eventos:', error);
      setLoadingEventos(false);
    }
  }, [params.id]);

  const cargarLocal = useCallback(async () => {
    try {
      const timestamp = Date.now();
      console.log('[DetalleLocal] Loading local with timestamp:', timestamp);
      
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

      console.log('[DetalleLocal] Loaded local from Supabase:', {
        id: data.id,
        nombre: data.nombre,
        hasServicios: !!data.servicios_disponibles,
        serviciosCount: data.servicios_disponibles ? Object.keys(data.servicios_disponibles).length : 0,
        hasHorarios: !!data.horarios_completos,
        planActivo: data.plan_activo,
        destacado: data.destacado,
        hasAmbiente: !!data.ambiente_completo,
        hasClientela: !!data.clientela,
        hasAnalisisReviews: !!data.analisis_reviews
      });
      
      setLocal(data);
      setLoading(false);
      cargarReviewsBarlive();
      cargarEventos();
    } catch (error) {
      console.error('[DetalleLocal] Error:', error);
      setLoading(false);
    }
  }, [params.id, cargarReviewsBarlive, cargarEventos]);

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
      Alert.alert(
        'Cómo llegar',
        'Elige tu aplicación de navegación',
        [
          {
            text: 'Google Maps',
            onPress: () => {
              const url = Platform.select({
                ios: `comgooglemaps://?q=${local.latitud},${local.longitud}`,
                android: `google.navigation:q=${local.latitud},${local.longitud}`,
                default: `https://www.google.com/maps/search/?api=1&query=${local.latitud},${local.longitud}`
              });
              Linking.canOpenURL(url).then(supported => {
                if (supported) {
                  Linking.openURL(url);
                } else {
                  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${local.latitud},${local.longitud}`);
                }
              });
            }
          },
          {
            text: 'Apple Maps',
            onPress: () => {
              const url = `maps:0,0?q=${local.latitud},${local.longitud}`;
              Linking.openURL(url);
            }
          },
          {
            text: 'Waze',
            onPress: () => {
              const url = `waze://?ll=${local.latitud},${local.longitud}&navigate=yes`;
              Linking.canOpenURL(url).then(supported => {
                if (supported) {
                  Linking.openURL(url);
                } else {
                  Alert.alert('Error', 'Waze no está instalado');
                }
              });
            }
          },
          {
            text: 'Cancelar',
            style: 'cancel'
          }
        ]
      );
    }
  };

  const handleVirtualRoom = () => {
    if (!params.id) {
      Alert.alert('Error', 'No se pudo cargar la sala virtual');
      return;
    }
    
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
      console.log('[DetalleLocal] Toggle favorite - User:', user?.id);
      
      if (!user) {
        Alert.alert('Error', 'Debes iniciar sesión para agregar a favoritos');
        return;
      }

      if (isFavorite) {
        await supabase
          .from('locales_favoritos')
          .delete()
          .eq('usuario_id', user.id)
          .eq('local_id', params.id);
        setIsFavorite(false);
        Alert.alert('Eliminado', 'Local eliminado de favoritos');
      } else {
        await supabase
          .from('locales_favoritos')
          .insert({
            usuario_id: user.id,
            local_id: params.id,
          });
        setIsFavorite(true);
        Alert.alert('Añadido', 'Local añadido a favoritos');
      }
      
      // Refresh to sync with card
      checkIfFavorite();
    } catch (error) {
      console.error('[DetalleLocal] Error toggling favorite:', error);
      Alert.alert('Error', 'No se pudo actualizar favoritos');
    }
  };

  const handleAddReview = () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para añadir una reseña');
      return;
    }
    Alert.alert('Añadir Reseña', 'Funcionalidad de añadir reseña próximamente');
  };

  const handleOpenGallery = (index: number) => {
    setGalleryInitialIndex(index);
    setGalleryVisible(true);
  };

  const toggleReviewExpansion = (reviewId: string) => {
    setExpandedReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
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

  // Get all images with cache busting
  const allImages = [
    local.imagen_url || local.foto_principal,
    ...(local.fotos || []),
    ...(local.galeria_urls || [])
  ].filter(Boolean).map(img => `${img}?v=${Date.now()}`);

  // Use comprehensive status calculation from timeUtils
  const estadoLocal = getEstadoLocal(local);
  const isOpen = estadoLocal.estaAbierto === true;
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

  // Show only BarLive reviews count, including up to 2 Google reviews
  const barliveReviewsCount = reviews.length;
  const googleReviewsToShow = Math.min(2, (local.reviews_google || []).length);
  const totalReviewsToShow = barliveReviewsCount + googleReviewsToShow;

  // Combine and limit reviews to 3 total (compact)
  const allReviews = [
    ...reviews.map(r => ({ ...r, isGoogle: false })),
    ...(local.reviews_google || []).slice(0, 3 - reviews.length).map((r: any) => ({
      ...r,
      isGoogle: true,
      id: r.time?.toString() || Math.random().toString(),
    }))
  ].slice(0, 3);

  // Get all categories and filter out excluded ones
  const allCategories = (local.barlive_types && local.barlive_types.length > 0 
    ? local.barlive_types 
    : local.barlive_type 
      ? [local.barlive_type] 
      : local.categoria 
        ? [local.categoria] 
        : []
  ).filter(cat => !CATEGORIAS_EXCLUIDAS.some(excluded => cat.toLowerCase().includes(excluded.toLowerCase())));

  // Calculate back button position based on destacado badge
  const backButtonTop = local.destacado ? 92 : 52;

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
          
          {/* Status Badge - Top Left */}
          <View style={styles.statusBadgeTop}>
            <BlurView intensity={90} tint="dark" style={styles.statusBlur}>
              <View style={[styles.statusDot, isOpen ? styles.statusDotOpen : styles.statusDotClosed]} />
              <Text style={styles.statusText}>
                {estadoLocal.badge}
              </Text>
              {estadoLocal.tiempoRestante && (
                <Text style={styles.statusSubtext}>• {estadoLocal.tiempoRestante}</Text>
              )}
            </BlurView>
          </View>

          {/* Destacado Badge - Below Status Badge, Above Back Button */}
          {local.destacado && (
            <View style={styles.destacadoBadgeTop}>
              <BlurView intensity={90} tint="dark" style={styles.destacadoBlur}>
                <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={16} color="#F59E0B" />
                <Text style={styles.destacadoText}>Destacado</Text>
              </BlurView>
            </View>
          )}

          {/* Back Button - Position depends on destacado badge */}
          <TouchableOpacity style={[styles.backButton, { top: backButtonTop }]} onPress={() => router.back()}>
            <BlurView intensity={80} tint="dark" style={styles.buttonBlur}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </BlurView>
          </TouchableOpacity>

          {/* Rating Badge - Top Right */}
          {displayRating > 0 && (
            <View style={styles.ratingBadgeTop}>
              <BlurView intensity={90} tint="dark" style={styles.ratingBlur}>
                <Ionicons name="star" size={18} color="#FFD700" />
                <Text style={styles.ratingTextTop}>{displayRating.toFixed(1)}</Text>
              </BlurView>
            </View>
          )}

          {/* Share Button */}
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <BlurView intensity={80} tint="dark" style={styles.buttonBlur}>
              <IconSymbol ios_icon_name="square.and.arrow.up" android_material_icon_name="share" size={22} color="#fff" />
            </BlurView>
          </TouchableOpacity>

          {/* Favorite Button */}
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
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{local.nombre}</Text>
        </View>

        {/* Display ALL categories (excluding lounge, terraza, rooftop, salón, azotea) */}
        {allCategories.length > 0 && (
          <View style={styles.categoriesContainer}>
            {allCategories.map((categoria, index) => {
              const icon = getCategoryIcon(categoria);
              return (
                <View key={index} style={styles.categoryChip}>
                  <View style={[styles.categoryIconSmall, { backgroundColor: icon.color }]}>
                    <IconSymbol 
                      ios_icon_name={icon.ios} 
                      android_material_icon_name={icon.android} 
                      size={20} 
                      color="#fff" 
                    />
                  </View>
                  <Text style={styles.categoryChipText}>{categoria}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Address */}
        {local.direccion && (
          <TouchableOpacity style={styles.addressRow} onPress={handleDirections}>
            <View style={styles.addressIconContainer}>
              <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={22} color={colors.primary} />
            </View>
            <Text style={styles.addressText}>{local.direccion}</Text>
            {distance && (
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>{distance}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          {local.telefono && (
            <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
              <View style={[styles.actionButtonContent, { backgroundColor: colors.primary }]}>
                <IconSymbol ios_icon_name="phone.fill" android_material_icon_name="phone" size={22} color="#fff" />
                <Text style={styles.actionButtonText}>Llamar</Text>
              </View>
            </TouchableOpacity>
          )}
          
          {local.latitud && local.longitud && (
            <TouchableOpacity style={styles.actionButton} onPress={handleDirections}>
              <View style={[styles.actionButtonContent, { backgroundColor: colors.secondary }]}>
                <IconSymbol ios_icon_name="map.fill" android_material_icon_name="map" size={22} color="#fff" />
                <Text style={styles.actionButtonText}>Cómo llegar</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Virtual Room Button */}
        <TouchableOpacity style={styles.virtualRoomButton} onPress={handleVirtualRoom}>
          <View style={[styles.virtualRoomContent, { backgroundColor: '#8B5CF6' }]}>
            <IconSymbol ios_icon_name="cube.fill" android_material_icon_name="view_in_ar" size={24} color="#fff" />
            <Text style={styles.virtualRoomText}>Ver Sala Virtual</Text>
          </View>
        </TouchableOpacity>

        {/* Social Profile Button (if plan is standard or premium) */}
        {hasSocialProfile && (
          <TouchableOpacity style={styles.socialProfileButton} onPress={handleSocialProfile}>
            <View style={[styles.socialProfileContent, { backgroundColor: colors.primary }]}>
              <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={24} color="#fff" />
              <Text style={styles.socialProfileText}>Ver Perfil Social</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Events Banner (if there are active or upcoming events) */}
        {eventos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: colors.primary }]}>
                <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={26} color="#fff" />
              </View>
              <Text style={styles.sectionTitle}>Eventos Próximos</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventosScroll}>
              {eventos.map((evento) => (
                <TouchableOpacity
                  key={evento.id}
                  style={styles.eventoCard}
                  onPress={() => router.push({ pathname: '/detalle/evento', params: { id: evento.id } })}
                >
                  {evento.imagen_url && (
                    <OptimizedImage
                      source={{ uri: `${evento.imagen_url}?v=${Date.now()}` }}
                      style={styles.eventoImage}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.eventoInfo}>
                    <Text style={styles.eventoTitulo} numberOfLines={2}>{evento.titulo}</Text>
                    <Text style={styles.eventoFecha}>
                      {new Date(evento.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Schedule Section with Current Day Highlighted */}
        {local.horarios_completos && Object.keys(local.horarios_completos).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: colors.primary }]}>
                <IconSymbol ios_icon_name="clock.fill" android_material_icon_name="schedule" size={26} color="#fff" />
              </View>
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

        {/* Services Section */}
        {allServices.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: colors.primary }]}>
                <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={26} color="#fff" />
              </View>
              <Text style={styles.sectionTitle}>Servicios Disponibles</Text>
            </View>
            <View style={styles.servicesGrid}>
              {allServices.map((servicio, index) => {
                const icon = getServiceIcon(servicio);
                return (
                  <View key={index} style={styles.serviceItem}>
                    <View style={[styles.serviceIconBg, { backgroundColor: icon.color + '15' }]}>
                      <IconSymbol 
                        ios_icon_name={icon.ios} 
                        android_material_icon_name={icon.android} 
                        size={20} 
                        color={icon.color} 
                      />
                    </View>
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
              <View style={[styles.sectionIconContainer, { backgroundColor: colors.secondary }]}>
                <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={26} color="#fff" />
              </View>
              <Text style={styles.sectionTitle}>Ambiente</Text>
            </View>
            <View style={styles.chipContainer}>
              {ambienteTags.map((tag, index) => {
                const icon = getAmbienteIcon(tag);
                return (
                  <View key={index} style={styles.chipWithIcon}>
                    <View style={[styles.chipIconBg, { backgroundColor: icon.color + '15' }]}>
                      <IconSymbol 
                        ios_icon_name={icon.ios} 
                        android_material_icon_name={icon.android} 
                        size={18} 
                        color={icon.color} 
                      />
                    </View>
                    <Text style={styles.chipText}>{tag}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Typical Clientele Section */}
        {clientelaTags.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: colors.primary }]}>
                <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={26} color="#fff" />
              </View>
              <Text style={styles.sectionTitle}>Clientela Típica</Text>
            </View>
            <View style={styles.chipContainer}>
              {clientelaTags.map((tag, index) => {
                const icon = getClientelaIcon(tag);
                return (
                  <View key={index} style={styles.chipWithIcon}>
                    <View style={[styles.chipIconBg, { backgroundColor: icon.color + '15' }]}>
                      <IconSymbol 
                        ios_icon_name={icon.ios} 
                        android_material_icon_name={icon.android} 
                        size={18} 
                        color={icon.color} 
                      />
                    </View>
                    <Text style={styles.chipText}>{tag}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Reviews Analysis Section */}
        {local.analisis_reviews && Object.keys(local.analisis_reviews).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#8B5CF6' }]}>
                <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="analytics" size={26} color="#fff" />
              </View>
              <Text style={styles.sectionTitle}>Análisis de Reseñas</Text>
            </View>
            <View style={styles.analysisCard}>
              {local.analisis_reviews.sentimiento_general && (
                <View style={styles.analysisRow}>
                  <Text style={styles.analysisLabel}>Sentimiento:</Text>
                  <Text style={[styles.analysisValue, { color: local.analisis_reviews.sentimiento_general === 'positivo' ? '#10B981' : '#EF4444' }]}>
                    {local.analisis_reviews.sentimiento_general === 'positivo' ? 'Muy Positivo' : 'Negativo'}
                  </Text>
                </View>
              )}
              {local.analisis_reviews.palabras_destacadas_google && local.analisis_reviews.palabras_destacadas_google.length > 0 && (
                <View style={styles.analysisKeywords}>
                  <Text style={styles.analysisLabel}>Palabras clave destacadas:</Text>
                  <View style={styles.keywordsContainer}>
                    {local.analisis_reviews.palabras_destacadas_google.slice(0, 5).map((keyword: string, index: number) => (
                      <View key={index} style={styles.keywordChip}>
                        <Text style={styles.keywordText}>{keyword}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {local.analisis_reviews.resumen_automatico && (
                <View style={styles.analysisSummary}>
                  <Text style={styles.analysisLabel}>Resumen automático:</Text>
                  <Text style={styles.analysisSummaryText}>{local.analisis_reviews.resumen_automatico}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Reviews Section with Avatars */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: '#F59E0B' }]}>
              <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={26} color="#fff" />
            </View>
            <Text style={styles.sectionTitle}>Reseñas</Text>
            {totalReviewsToShow > 0 && (
              <Text style={styles.reviewCount}>({totalReviewsToShow})</Text>
            )}
          </View>

          {/* All Reviews (BarLive + up to 2 Google, max 3 total) - ULTRA COMPACT */}
          {allReviews.length > 0 ? (
            <>
              {allReviews.map((review: any) => {
                const isExpanded = expandedReviews.has(review.id);
                const reviewText = review.text || review.texto || '';
                const { summary, needsExpansion } = summarizeText(reviewText);
                const displayText = isExpanded ? reviewText : summary;
                
                return (
                  <View key={review.id} style={styles.reviewCardCompact}>
                    <View style={styles.reviewHeaderCompact}>
                      {review.isGoogle ? (
                        <View style={styles.reviewAvatarCompact}>
                          <Ionicons name="logo-google" size={20} color="#4285F4" />
                        </View>
                      ) : review.usuario?.avatar ? (
                        <OptimizedImage
                          source={{ uri: `${review.usuario.avatar}?v=${Date.now()}` }}
                          style={styles.reviewAvatarCompact}
                        />
                      ) : (
                        <View style={styles.reviewAvatarCompact}>
                          <Ionicons name="person" size={20} color={colors.textSecondary} />
                        </View>
                      )}
                      <View style={styles.reviewInfoCompact}>
                        <Text style={styles.reviewAuthorNameCompact}>
                          {review.isGoogle ? '🌐 Cliente Google' : (review.usuario?.nombre || 'Usuario')}
                        </Text>
                        <View style={styles.reviewRatingCompact}>
                          <Ionicons name="star" size={16} color="#FFD700" />
                          <Text style={styles.reviewRatingTextCompact}>{review.rating}</Text>
                        </View>
                      </View>
                    </View>
                    {reviewText && (
                      <>
                        <Text style={styles.reviewCommentCompact}>{displayText}</Text>
                        {needsExpansion && (
                          <TouchableOpacity onPress={() => toggleReviewExpansion(review.id)}>
                            <Text style={styles.verMasText}>
                              {isExpanded ? 'Ver menos' : 'Ver más'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </View>
                );
              })}
            </>
          ) : (
            <View style={styles.noReviewsCard}>
              <Ionicons name="chatbubbles-outline" size={40} color={colors.textSecondary} />
              <Text style={styles.noReviews}>No hay reseñas todavía</Text>
            </View>
          )}

          {/* Add Review Button */}
          <TouchableOpacity style={styles.addReviewButton} onPress={handleAddReview}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addReviewGradient}
            >
              <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={24} color="#fff" />
              <Text style={styles.addReviewButtonText}>Añadir Reseña</Text>
            </LinearGradient>
          </TouchableOpacity>
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
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  statusSubtext: {
    fontSize: 12,
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
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    zIndex: 8,
  },
  ratingBadgeTop: {
    position: 'absolute',
    top: 12,
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
    gap: 6,
  },
  ratingTextTop: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  shareButton: {
    position: 'absolute',
    top: 64,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    zIndex: 5,
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
    borderRadius: 12,
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
  titleContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.3,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 28,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  categoryIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
    gap: 14,
  },
  addressIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
    fontWeight: '600',
  },
  distanceBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
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
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  virtualRoomButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  virtualRoomContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  virtualRoomText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  socialProfileButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  socialProfileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  socialProfileText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 18,
  },
  sectionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  reviewCount: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  eventosScroll: {
    paddingRight: 16,
    gap: 12,
  },
  eventoCard: {
    width: 200,
    backgroundColor: colors.card,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventoImage: {
    width: '100%',
    height: 120,
  },
  eventoInfo: {
    padding: 12,
  },
  eventoTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  eventoFecha: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  scheduleContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scheduleRowToday: {
    backgroundColor: colors.primary + '10',
    marginHorizontal: -18,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderBottomWidth: 0,
    marginVertical: 4,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  scheduleDayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scheduleDay: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  scheduleDayToday: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  todayBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
    fontSize: 15,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  serviceIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chipWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  chipIconBg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  analysisCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  analysisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  analysisLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  analysisValue: {
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  analysisKeywords: {
    marginBottom: 12,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  keywordChip: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  keywordText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  analysisSummary: {
    marginTop: 4,
  },
  analysisSummaryText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginTop: 6,
  },
  reviewCardCompact: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  reviewHeaderCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  reviewAvatarCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  reviewInfoCompact: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewAuthorNameCompact: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  reviewRatingCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  reviewRatingTextCompact: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  reviewCommentCompact: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  verMasText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
  addReviewButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  addReviewGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  addReviewButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },
  noReviewsCard: {
    backgroundColor: colors.card,
    padding: 28,
    borderRadius: 12,
    alignItems: 'center',
  },
  noReviews: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
    marginTop: 10,
  },
});
