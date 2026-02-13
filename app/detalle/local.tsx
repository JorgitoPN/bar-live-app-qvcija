
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
  Dimensions,
  Share as RNShare,
  Image as RNImage,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../integrations/supabase/client';
import { colors } from '../../styles/commonStyles';
import OptimizedImage from '../../components/common/OptimizedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { IconSymbol } from '../../components/IconSymbol';
import * as Location from 'expo-location';
import ImageGalleryModal from '../../components/detalle/ImageGalleryModal';
import { CATEGORIAS_EXCLUIDAS } from '../../utils/constants';
import { getEstadoLocal } from '../../utils/timeUtils';
import { useEffectiveUser } from '../../hooks/useEffectiveUser';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useMode } from '../../contexts/ModeContext';
import { calcularDistancia } from '../../utils/locationUtils';
import ParsedText from '../../components/social/ParsedText';
import ReviewsModal from '../../components/social/ReviewsModal';
import CheckInModal from '../../components/detalle/CheckInModal';
import UsersInLocalModal from '../../components/detalle/UsersInLocalModal';
import { scaleFontSize, getCoverPhotoButtonSize, getGalleryThumbnailSize, getActionButtonPaddingVertical, getCategoryBadgePaddingHorizontal, getCategoryBadgePaddingVertical } from '../../utils/androidScaling';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Local {
  id: string;
  nombre: string;
  descripcion?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  website?: string;
  horario?: string;
  categoria?: string;
  subcategoria?: string;
  precio_medio?: number;
  valoracion?: number;
  foto_principal?: string;
  imagen_url?: string;
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
  barlive_type?: string;
  barlive_types?: string[];
  analisis_reviews?: Record<string, any>;
  reviews_google?: any[];
  google_rating?: number;
  google_user_ratings_total?: number;
  destacado?: boolean;
  rating?: number;
  metodos_pago_completos?: Record<string, boolean>;
  tipos_cocina?: string[];
  descripcion_google?: string;
  rango_precios?: string;
  nivel_precio_google?: number;
  propietario_id?: string;
  local_profile_id?: string;
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

interface GoogleReview {
  author_name: string;
  author_url?: string;
  language?: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description?: string;
  text?: string;
  time: number;
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

interface CheckedInUser {
  id: string;
  nombre: string;
  username: string | null;
  avatar: string | null;
}

const getCategoryIcon = (categoria?: string): { ios: string; android: string; color: string } => {
  const categoryMap: Record<string, { ios: string; android: string; color: string }> = {
    bar: { ios: 'wineglass.fill', android: 'wine_bar', color: '#F59E0B' },
    restaurante: { ios: 'fork.knife', android: 'restaurant', color: '#EF4444' },
    cafe: { ios: 'cup.and.saucer.fill', android: 'local_cafe', color: '#8B5CF6' },
    cafetería: { ios: 'cup.and.saucer.fill', android: 'local_cafe', color: '#8B5CF6' },
    pub: { ios: 'wineglass', android: 'sports_bar', color: '#10B981' },
    discoteca: { ios: 'music.note', android: 'nightlife', color: '#EC4899' },
    cocteleria: { ios: 'wineglass.fill', android: 'wine_bar', color: '#3B82F6' },
    coctelería: { ios: 'wineglass.fill', android: 'wine_bar', color: '#3B82F6' },
    sala_conciertos: { ios: 'music.note.list', android: 'music_note', color: '#F59E0B' },
  };
  return categoryMap[categoria?.toLowerCase() || ''] || { ios: 'mappin.circle.fill', android: 'place', color: colors.primary };
};

const SERVICES_SECTION_COLOR = '#10B981';

const getServiceIcon = (servicio: string): { ios: string; android: string; color: string } => {
  const serviceMap: Record<string, { ios: string; android: string }> = {
    cerveza: { ios: 'wineglass', android: 'sports_bar' },
    cócteles: { ios: 'wineglass.fill', android: 'wine_bar' },
    cocteles: { ios: 'wineglass.fill', android: 'wine_bar' },
    cocktails: { ios: 'wineglass.fill', android: 'wine_bar' },
    efectivo: { ios: 'banknote', android: 'payments' },
    pago_efectivo: { ios: 'banknote', android: 'payments' },
    tarjetas: { ios: 'creditcard.fill', android: 'credit_card' },
    pago_tarjetas: { ios: 'creditcard.fill', android: 'credit_card' },
    tarjetas_credito: { ios: 'creditcard.fill', android: 'credit_card' },
    tarjetas_debito: { ios: 'creditcard.fill', android: 'credit_card' },
    wifi: { ios: 'wifi', android: 'wifi' },
    wifi_gratis: { ios: 'wifi', android: 'wifi' },
    terraza: { ios: 'sun.max.fill', android: 'wb_sunny' },
    terraza_exterior: { ios: 'sun.max.fill', android: 'wb_sunny' },
    parking: { ios: 'car.fill', android: 'local_parking' },
    aparcamiento: { ios: 'car.fill', android: 'local_parking' },
    accesibilidad: { ios: 'figure.roll', android: 'accessible' },
    accesible_silla_ruedas: { ios: 'figure.roll', android: 'accessible' },
    reservas: { ios: 'calendar', android: 'event' },
    delivery: { ios: 'bicycle', android: 'delivery_dining' },
    entrega_domicilio: { ios: 'bicycle', android: 'delivery_dining' },
    takeaway: { ios: 'bag.fill', android: 'shopping_bag' },
    para_llevar: { ios: 'bag.fill', android: 'shopping_bag' },
    comida: { ios: 'fork.knife', android: 'restaurant' },
    almuerzo: { ios: 'fork.knife', android: 'restaurant' },
    cena: { ios: 'fork.knife', android: 'restaurant' },
    desayuno: { ios: 'cup.and.saucer.fill', android: 'local_cafe' },
    bebidas: { ios: 'cup.and.saucer.fill', android: 'local_cafe' },
    cafe: { ios: 'cup.and.saucer.fill', android: 'local_cafe' },
    vino: { ios: 'wineglass.fill', android: 'wine_bar' },
    'musica en vivo': { ios: 'music.note', android: 'music_note' },
    'música en vivo': { ios: 'music.note', android: 'music_note' },
    musica_vivo: { ios: 'music.note', android: 'music_note' },
    karaoke: { ios: 'mic.fill', android: 'mic' },
    tv: { ios: 'tv.fill', android: 'tv' },
    deportes_tv: { ios: 'tv.fill', android: 'tv' },
    juegos: { ios: 'gamecontroller.fill', android: 'sports_esports' },
    dj: { ios: 'music.note.list', android: 'queue_music' },
    sin_gluten: { ios: 'leaf.fill', android: 'eco' },
    opciones_veganas: { ios: 'leaf.fill', android: 'eco' },
    comida_vegetariana: { ios: 'leaf.fill', android: 'eco' },
  };

  const lowerServicio = servicio.toLowerCase().replace(/ /g, '_');
  for (const [key, value] of Object.entries(serviceMap)) {
    if (lowerServicio.includes(key) || key.includes(lowerServicio)) {
      return { ...value, color: SERVICES_SECTION_COLOR };
    }
  }

  return { ios: 'checkmark.circle.fill', android: 'check_circle', color: SERVICES_SECTION_COLOR };
};

const AMBIENTE_SECTION_COLOR = '#8B5CF6';

const getAmbienteIcon = (ambiente: string): { ios: string; android: string; color: string } => {
  const ambienteMap: Record<string, { ios: string; android: string }> = {
    familiar: { ios: 'person.3.fill', android: 'people' },
    tranquilo: { ios: 'leaf.fill', android: 'eco' },
    animado: { ios: 'bolt.fill', android: 'flash_on' },
    romántico: { ios: 'heart.fill', android: 'favorite' },
    romantico: { ios: 'heart.fill', android: 'favorite' },
    moderno: { ios: 'sparkles', android: 'auto_awesome' },
    elegante: { ios: 'star.fill', android: 'star' },
    acogedor: { ios: 'house.fill', android: 'home' },
    de_moda: { ios: 'sparkles', android: 'auto_awesome' },
    juvenil: { ios: 'bolt.fill', android: 'flash_on' },
    tematico: { ios: 'star.fill', android: 'star' },
  };

  const lowerAmbiente = ambiente.toLowerCase().replace(/ /g, '_');
  for (const [key, value] of Object.entries(ambienteMap)) {
    if (lowerAmbiente.includes(key) || key.includes(lowerAmbiente)) {
      return { ...value, color: AMBIENTE_SECTION_COLOR };
    }
  }

  return { ios: 'sparkles', android: 'auto_awesome', color: AMBIENTE_SECTION_COLOR };
};

const CLIENTELA_SECTION_COLOR = '#EC4899';

const getClientelaIcon = (clientela: string): { ios: string; android: string; color: string } => {
  const clientelaMap: Record<string, { ios: string; android: string }> = {
    grupos: { ios: 'person.3.fill', android: 'people' },
    familias: { ios: 'house.fill', android: 'home' },
    parejas: { ios: 'heart.fill', android: 'favorite' },
    estudiantes: { ios: 'book.fill', android: 'school' },
    turistas: { ios: 'airplane', android: 'flight' },
    ninos_bienvenidos: { ios: 'figure.2.and.child.holdinghands', android: 'people' },
    lgtbi_friendly: { ios: 'heart.fill', android: 'favorite' },
    locales: { ios: 'person.2.fill', android: 'people' },
  };

  const lowerClientela = clientela.toLowerCase().replace(/ /g, '_');
  for (const [key, value] of Object.entries(clientelaMap)) {
    if (lowerClientela.includes(key) || key.includes(lowerClientela)) {
      return { ...value, color: CLIENTELA_SECTION_COLOR };
    }
  }

  return { ios: 'person.2.fill', android: 'people', color: CLIENTELA_SECTION_COLOR };
};

const summarizeText = (text: string, maxLength: number = 120): { summary: string; needsExpansion: boolean } => {
  if (!text || text.length <= maxLength) {
    return { summary: text, needsExpansion: false };
  }

  const summary = text.substring(0, maxLength).trim() + '...';
  return { summary, needsExpansion: true };
};

const calculateSentiment = (rating: number): { sentiment: string; color: string } => {
  if (rating >= 4.5) {
    return { sentiment: 'Excelente', color: '#10B981' };
  } else if (rating >= 4) {
    return { sentiment: 'Muy Positivo', color: '#10B981' };
  } else if (rating >= 3) {
    return { sentiment: 'Positivo', color: '#3B82F6' };
  } else if (rating >= 2) {
    return { sentiment: 'Neutral', color: '#F59E0B' };
  } else {
    return { sentiment: 'Negativo', color: '#EF4444' };
  }
};

const normalizeDayName = (day: string): string => {
  const normalizations: Record<string, string> = {
    lunes: 'lunes',
    martes: 'martes',
    miércoles: 'miercoles',
    miercoles: 'miercoles',
    jueves: 'jueves',
    viernes: 'viernes',
    sábado: 'sabado',
    sabado: 'sabado',
    domingo: 'domingo',
  };
  return normalizations[day.toLowerCase()] || day;
};

const formatOpeningHours = (hours: string[]): string => {
  if (!hours || hours.length === 0) {
    return 'Cerrado';
  }

  const sortedHours = [...hours].sort((a, b) => {
    const timeA = a.split('–')[0]?.trim() || a.split('-')[0]?.trim() || '';
    const timeB = b.split('–')[0]?.trim() || b.split('-')[0]?.trim() || '';
    return timeA.localeCompare(timeB);
  });

  return sortedHours.join(', ');
};

/**
 * ✅ DETALLE LOCAL SCREEN v335.0 - ENHANCED VIRTUAL ROOM BUTTON
 * 
 * 🚨 NEW CHANGES v335.0:
 * - ✅ REDESIGNED: Virtual Room button with immersive 3D-style design
 * - ✅ ENHANCED: Gradient with purple/violet tones matching virtual room essence
 * - ✅ IMPROVED: Larger icon with container for better visual hierarchy
 * - ✅ ADDED: Subtitle explaining functionality
 * - ✅ RESULT: More attractive and coherent with virtual room concept
 */
export default function DetalleLocalScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useEffectiveUser();
  const { currentMode, activeProfileType } = useMode();
  const { isFavorite, toggleFavorite, loading: loadingFavorite } = useFavorites();

  const [local, setLocal] = useState<Local | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loadingEventos, setLoadingEventos] = useState(false);
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkedInUsers, setCheckedInUsers] = useState<CheckedInUser[]>([]);
  const [loadingCheckIns, setLoadingCheckIns] = useState(false);
  
  const [showUsersModal, setShowUsersModal] = useState(false);

  const [displayedReviewsCount, setDisplayedReviewsCount] = useState(5);
  const [allReviews, setAllReviews] = useState<(Review | (GoogleReview & { source: 'google' }))[]>([]);

  const localIsFavorite = params.id ? isFavorite(params.id as string) : false;

  const [showReviewsModal, setShowReviewsModal] = useState(false);

  const isClientMode = currentMode === 'cliente' || activeProfileType === 'cliente';
  const isOwnerOfLocal = user && local && local.propietario_id === user.id;

  const coverPhotoButtonSize = getCoverPhotoButtonSize();
  const galleryThumbnailSize = getGalleryThumbnailSize();
  const actionButtonPaddingVertical = getActionButtonPaddingVertical();
  const categoryBadgePaddingH = getCategoryBadgePaddingHorizontal();
  const categoryBadgePaddingV = getCategoryBadgePaddingVertical();

  console.log('[DetalleLocal v335.0] 🎭 Mode check:', {
    currentMode,
    activeProfileType,
    isClientMode,
    isOwnerOfLocal,
    shouldShowButtons: isClientMode,
  });

  useEffect(() => {
    (async () => {
      try {
        console.log('[DetalleLocal v335.0] 🔍 Requesting location permissions...');
        
        const isAvailable = await Location.hasServicesEnabledAsync();
        if (!isAvailable) {
          console.log('[DetalleLocal v335.0] ⚠️ Location services are disabled');
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('[DetalleLocal v335.0] ⚠️ Location permission denied');
          return;
        }

        console.log('[DetalleLocal v335.0] ✅ Location permission granted, getting position...');
        
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 0,
        });
        
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        console.log('[DetalleLocal v335.0] 📍 User location obtained');
      } catch (error: any) {
        console.error('[DetalleLocal v335.0] ❌ Error getting location:', error?.message);
        setUserLocation(null);
      }
    })();
  }, []);

  useEffect(() => {
    if (userLocation && local?.latitud && local?.longitud) {
      const distKm = calcularDistancia(userLocation.latitude, userLocation.longitude, Number(local.latitud), Number(local.longitud));

      const dist = distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`;

      setDistance(dist);
    }
  }, [userLocation, local]);

  const loadCheckedInUsers = useCallback(async () => {
    if (!params.id) return;

    try {
      setLoadingCheckIns(true);
      
      const { data: checkIns, error } = await supabase
        .from('check_ins')
        .select(`
          usuario_id,
          visibility,
          specific_user_ids,
          usuarios!check_ins_usuario_id_fkey(id, nombre, username, avatar)
        `)
        .eq('local_id', params.id);

      if (error) throw error;

      const visibleUsers: CheckedInUser[] = [];

      checkIns?.forEach((checkIn: any) => {
        const checkInUser = checkIn.usuarios;
        if (!checkInUser) return;

        if (checkIn.visibility === 'all_users') {
          visibleUsers.push(checkInUser);
        } else if (checkIn.visibility === 'followers' && user) {
          supabase
            .from('seguidores')
            .select('id')
            .eq('seguidor_id', user.id)
            .eq('seguido_id', checkInUser.id)
            .single()
            .then(({ data }) => {
              if (data) {
                visibleUsers.push(checkInUser);
              }
            });
        } else if (checkIn.visibility === 'specific_users' && user) {
          if (checkIn.specific_user_ids?.includes(user.id)) {
            visibleUsers.push(checkInUser);
          }
        }
      });

      setCheckedInUsers(visibleUsers);
      console.log('[DetalleLocal v335.0] ✅ Loaded checked-in users:', visibleUsers.length);
    } catch (error) {
      console.error('[DetalleLocal v335.0] Error loading checked-in users:', error);
    } finally {
      setLoadingCheckIns(false);
    }
  }, [params.id, user]);

  const checkUserCheckInStatus = useCallback(async () => {
    if (!user || !params.id) return;

    try {
      const { data, error } = await supabase
        .from('check_ins')
        .select('id')
        .eq('usuario_id', user.id)
        .eq('local_id', params.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[DetalleLocal v335.0] Error checking check-in status:', error);
        return;
      }

      setIsCheckedIn(!!data);
    } catch (error) {
      console.error('[DetalleLocal v335.0] Error checking check-in status:', error);
    }
  }, [user, params.id]);

  const cargarReviewsUnificadas = useCallback(async () => {
    try {
      setLoadingReviews(true);
      
      const { data: barliveReviews, error: barliveError } = await supabase
        .from('reviews_barlive')
        .select(`
          *,
          usuario:usuario_id (
            nombre,
            avatar
          )
        `)
        .eq('local_id', params.id)
        .order('created_at', { ascending: false });

      if (barliveError) {
        console.error('[DetalleLocal v335.0] Error loading Barlive reviews:', barliveError);
      }

      const { data: localData } = await supabase
        .from('locales')
        .select('reviews_google, google_rating')
        .eq('id', params.id)
        .single();

      const googleReviews = (localData?.reviews_google || []) as GoogleReview[];

      const combinedReviews: (Review | (GoogleReview & { source: 'google' }))[] = [
        ...(barliveReviews || []),
        ...googleReviews.map(gr => ({ ...gr, source: 'google' as const })),
      ].sort((a, b) => {
        const dateA = 'created_at' in a ? new Date(a.created_at).getTime() : a.time * 1000;
        const dateB = 'created_at' in b ? new Date(b.created_at).getTime() : b.time * 1000;
        return dateB - dateA;
      });

      setAllReviews(combinedReviews);
      console.log('[DetalleLocal v335.0] ✅ Loaded unified reviews:', {
        barlive: barliveReviews?.length || 0,
        google: googleReviews.length,
        total: combinedReviews.length,
      });

      if (barliveReviews && barliveReviews.length > 0) {
        const avg = barliveReviews.reduce((sum, r) => sum + r.rating, 0) / barliveReviews.length;
        setAverageRating(avg);
        
        console.log('[DetalleLocal v335.0] 📊 Calculated average rating:', avg.toFixed(2), 'from', barliveReviews.length, 'reviews');
        
        const { error: updateError } = await supabase
          .from('locales')
          .update({ rating: avg })
          .eq('id', params.id);

        if (updateError) {
          console.error('[DetalleLocal v335.0] ❌ Error updating rating:', updateError);
        } else {
          console.log('[DetalleLocal v335.0] ✅ Rating updated in database');
        }
      } else if (localData?.google_rating) {
        setAverageRating(localData.google_rating);
        console.log('[DetalleLocal v335.0] 📊 Using Google rating:', localData.google_rating);
      }

      setLoadingReviews(false);
    } catch (error) {
      console.error('[DetalleLocal v335.0] Error loading reviews:', error);
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
        console.error('[DetalleLocal v335.0] Error loading eventos:', error);
        return;
      }

      setEventos(data || []);
      setLoadingEventos(false);
    } catch (error) {
      console.error('[DetalleLocal v335.0] Error loading eventos:', error);
      setLoadingEventos(false);
    }
  }, [params.id]);

  const cargarLocal = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('locales').select('*').eq('id', params.id).single();

      if (error) {
        console.error('[DetalleLocal v335.0] Error loading local:', error);
        setLoading(false);
        return;
      }

      console.log('[DetalleLocal v335.0] ✅ Local loaded:', {
        id: data.id,
        nombre: data.nombre,
        propietario_id: data.propietario_id,
        rating: data.rating,
        google_rating: data.google_rating,
      });

      setLocal(data);
      setLoading(false);
      cargarReviewsUnificadas();
      cargarEventos();
      checkUserCheckInStatus();
      loadCheckedInUsers();
    } catch (error) {
      console.error('[DetalleLocal v335.0] Error:', error);
      setLoading(false);
    }
  }, [params.id, cargarReviewsUnificadas, cargarEventos, checkUserCheckInStatus, loadCheckedInUsers]);

  useEffect(() => {
    if (params.id) {
      cargarLocal();
    }
  }, [params.id, cargarLocal]);

  useEffect(() => {
    if (!params.id) return;

    const reviewsChannel = supabase
      .channel(`local-reviews-${params.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews_barlive',
          filter: `local_id=eq.${params.id}`,
        },
        () => {
          console.log('[DetalleLocal v335.0] 🔄 Reviews changed, reloading...');
          cargarReviewsUnificadas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reviewsChannel);
    };
  }, [params.id, cargarReviewsUnificadas]);

  useEffect(() => {
    if (!params.id || !user) return;

    const checkInsChannel = supabase
      .channel(`local-check-ins-${params.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins',
          filter: `local_id=eq.${params.id}`,
        },
        () => {
          console.log('[DetalleLocal v335.0] Check-ins changed, reloading...');
          loadCheckedInUsers();
          checkUserCheckInStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(checkInsChannel);
    };
  }, [params.id, user, loadCheckedInUsers, checkUserCheckInStatus]);

  const handleClose = useCallback(() => {
    console.log('[DetalleLocal v335.0] 🔙 Close button pressed - using fast navigation');
    router.back();
    console.log('[DetalleLocal v335.0] ✅ Fast navigation executed - scroll position preserved');
  }, [router]);

  const handleToggleFavorito = async (e: any) => {
    e.stopPropagation();
    if (params.id) {
      await toggleFavorite(params.id as string);
    }
  };

  const handleCall = () => {
    if (local?.telefono) {
      Linking.openURL(`tel:${local.telefono}`);
    }
  };

  const handleDirections = () => {
    if (local?.latitud && local?.longitud) {
      Alert.alert('Cómo llegar', 'Elige tu aplicación de navegación', [
        {
          text: 'Google Maps',
          onPress: () => {
            const url = Platform.select({
              ios: `comgooglemaps://?q=${local.latitud},${local.longitud}`,
              android: `google.navigation:q=${local.latitud},${local.longitud}`,
              default: `https://www.google.com/maps/search/?api=1&query=${local.latitud},${local.longitud}`,
            });
            Linking.canOpenURL(url).then((supported) => {
              if (supported) {
                Linking.openURL(url);
              } else {
                Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${local.latitud},${local.longitud}`);
              }
            });
          },
        },
        {
          text: 'Apple Maps',
          onPress: () => {
            const url = `maps:0,0?q=${local.latitud},${local.longitud}`;
            Linking.openURL(url);
          },
        },
        {
          text: 'Waze',
          onPress: () => {
            const url = `waze://?ll=${local.latitud},${local.longitud}&navigate=yes`;
            Linking.canOpenURL(url).then((supported) => {
              if (supported) {
                Linking.openURL(url);
              } else {
                Alert.alert('Error', 'Waze no está instalado');
              }
            });
          },
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]);
    }
  };

  const handleSocialProfile = () => {
    if (local?.local_profile_id) {
      router.push({
        pathname: '/perfil/local',
        params: { localId: local.local_profile_id },
      });
    } else {
      router.push({
        pathname: '/perfil/local',
        params: { localId: params.id },
      });
    }
  };

  const handleShare = async () => {
    try {
      await RNShare.share({
        message: `¡Mira este local en BarLive! ${local?.nombre}`,
        title: local?.nombre || 'Local en BarLive',
      });
    } catch (error) {
      console.error('[DetalleLocal v335.0] Error sharing:', error);
    }
  };

  const handleAddReview = () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para añadir una reseña');
      return;
    }
    setShowReviewsModal(true);
  };

  const handleOpenGallery = (index: number) => {
    setGalleryInitialIndex(index);
    setGalleryVisible(true);
  };

  const toggleReviewExpansion = (reviewId: string) => {
    setExpandedReviews((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  const handleCheckIn = () => {
    if (!user) {
      Alert.alert('Inicia Sesión', 'Debes iniciar sesión para hacer check-in en este local.');
      return;
    }
    
    if (!isClientMode) {
      Alert.alert(
        'No Disponible',
        'La función "Estoy en este local" solo está disponible en modo cliente. Cambia a modo cliente para usar esta función.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setShowCheckInModal(true);
  };

  const handleCheckOut = async () => {
    if (!user) return;

    Alert.alert(
      'Salir del local',
      '¿Quieres indicar que ya no estás en este local?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('check_ins')
                .delete()
                .eq('usuario_id', user.id)
                .eq('local_id', params.id);

              if (error) throw error;

              setIsCheckedIn(false);
              Alert.alert('✅ Check-out realizado', 'Ya no estás en este local');
              loadCheckedInUsers();
            } catch (error) {
              console.error('[DetalleLocal v335.0] Error checking out:', error);
              Alert.alert('Error', 'No se pudo realizar el check-out');
            }
          },
        },
      ]
    );
  };

  const handleClaimLocal = () => {
    console.log('[DetalleLocal v335.0] User tapped Claim Local button');
    router.push({
      pathname: '/solicitudes/solicitar-propiedad',
      params: { localId: params.id, type: 'reclamar_local' },
    });
  };

  const handleLoadMoreReviews = () => {
    console.log('[DetalleLocal v335.0] 📄 Loading more reviews...');
    setDisplayedReviewsCount(prev => prev + 5);
  };

  const handleVirtualRoom = () => {
    if (!user) {
      Alert.alert('Inicia Sesión', 'Debes iniciar sesión para acceder a la Sala Virtual.');
      return;
    }

    if (!isClientMode) {
      Alert.alert(
        'No Disponible',
        'La Sala Virtual solo está disponible en modo cliente. Cambia a modo cliente para acceder.',
        [{ text: 'OK' }]
      );
      return;
    }

    console.log('[DetalleLocal v335.0] 🚀 Navigating to virtual room from local details');
    router.push({ 
      pathname: '/detalle/sala-virtual-enhanced', 
      params: { 
        localId: params.id,
        from: 'local-details'
      } 
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { fontSize: scaleFontSize(16) }]}>Cargando local...</Text>
      </View>
    );
  }

  if (!local) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.badgeNuevo} />
        <Text style={[styles.errorText, { fontSize: scaleFontSize(18) }]}>No se pudo cargar el local</Text>
        <TouchableOpacity style={styles.retryButton} onPress={cargarLocal}>
          <Text style={[styles.retryButtonText, { fontSize: scaleFontSize(16) }]}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const allImages = [
    local.imagen_url || local.foto_principal,
    ...(local.galeria_urls || [])
  ]
    .filter(Boolean)
    .map((img) => `${img}?v=${Date.now()}`);

  const estadoLocal = getEstadoLocal(local);
  const isOpen = estadoLocal.estaAbierto === true;
  
  const hasSocialProfile = !!(
    local.local_profile_id || 
    local.plan_activo === 'premium' || 
    local.plan_activo === 'estandar'
  );
  
  const hasOwner = !!local.propietario_id;

  const allServices: string[] = [];
  const serviceSet = new Set<string>();

  if (local.servicios_disponibles) {
    Object.entries(local.servicios_disponibles).forEach(([key, value]) => {
      if (value === true) {
        const serviceName = key.replace(/_/g, ' ');
        if (!serviceSet.has(serviceName.toLowerCase())) {
          serviceSet.add(serviceName.toLowerCase());
          allServices.push(serviceName);
        }
      }
    });
  }

  if (local.servicios && local.servicios.length > 0) {
    local.servicios.forEach((servicio) => {
      if (!serviceSet.has(servicio.toLowerCase())) {
        serviceSet.add(servicio.toLowerCase());
        allServices.push(servicio);
      }
    });
  }

  if (local.metodos_pago_completos) {
    Object.entries(local.metodos_pago_completos).forEach(([key, value]) => {
      if (value === true) {
        const serviceName = key.replace(/_/g, ' ');
        if (!serviceSet.has(serviceName.toLowerCase())) {
          serviceSet.add(serviceName.toLowerCase());
          allServices.push(serviceName);
        }
      }
    });
  }

  const ambienteTags: string[] = [];
  const ambienteSet = new Set<string>();

  if (local.ambiente_completo) {
    Object.entries(local.ambiente_completo).forEach(([key, value]) => {
      if (value === true) {
        const ambienteName = key.replace(/_/g, ' ');
        if (!ambienteSet.has(ambienteName.toLowerCase())) {
          ambienteSet.add(ambienteName.toLowerCase());
          ambienteTags.push(ambienteName);
        }
      }
    });
  }

  if (local.ambiente && !ambienteTags.length) {
    if (!ambienteSet.has(local.ambiente.toLowerCase())) {
      ambienteSet.add(local.ambiente.toLowerCase());
      ambienteTags.push(local.ambiente);
    }
  }

  const clientelaTags: string[] = [];
  const clientelaSet = new Set<string>();

  if (local.clientela) {
    Object.entries(local.clientela).forEach(([key, value]) => {
      if (value === true) {
        const clientelaName = key.replace(/_/g, ' ');
        if (!clientelaSet.has(clientelaName.toLowerCase())) {
          clientelaSet.add(clientelaName.toLowerCase());
          clientelaTags.push(clientelaName);
        }
      }
    });
  }

  const diaLogicoParaResaltar = estadoLocal.diaLogico || 'lunes';

  const displayRating = local.rating || local.google_rating || averageRating || 0;

  const allCategories = (
    local.barlive_types && local.barlive_types.length > 0
      ? local.barlive_types
      : local.barlive_type
      ? [local.barlive_type]
      : local.categoria
      ? [local.categoria]
      : []
  ).filter((cat) => !CATEGORIAS_EXCLUIDAS.some((excluded) => cat.toLowerCase().includes(excluded.toLowerCase())));

  const description = local.descripcion_google || local.descripcion || '';
  const { summary: descriptionSummary, needsExpansion: needsDescriptionExpansion } = summarizeText(description, 150);

  const orderedDaysDisplay = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

  const displayedReviews: (Review | (GoogleReview & { source: 'google' }))[] = allReviews.slice(0, displayedReviewsCount);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEnabled={true}
        nestedScrollEnabled={Platform.OS === 'android'}
        scrollEventThrottle={16}
      >
        {allImages.length > 0 && (
          <View style={styles.coverContainer}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => handleOpenGallery(currentImageIndex)}>
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
                  <View key={index} style={{ width: SCREEN_WIDTH, height: 300 }}>
                    <OptimizedImage source={{ uri: image }} style={styles.coverImage} resizeMode="cover" />
                  </View>
                ))}
              </ScrollView>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleClose}
              style={[
                styles.closeButton,
                {
                  width: coverPhotoButtonSize,
                  height: coverPhotoButtonSize,
                  borderRadius: coverPhotoButtonSize / 2,
                }
              ]}
            >
              <BlurView intensity={80} tint="dark" style={styles.closeButtonBlur}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={Platform.OS === 'android' ? 16 : 20} color="#fff" />
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.shareButton,
                {
                  width: coverPhotoButtonSize,
                  height: coverPhotoButtonSize,
                  borderRadius: coverPhotoButtonSize / 2,
                }
              ]} 
              onPress={handleShare}
            >
              <BlurView intensity={80} tint="dark" style={styles.buttonBlur}>
                <IconSymbol ios_icon_name="square.and.arrow.up" android_material_icon_name="share" size={Platform.OS === 'android' ? 18 : 22} color="#fff" />
              </BlurView>
            </TouchableOpacity>

            {displayRating > 0 && (
              <View style={styles.ratingBadge}>
                <BlurView intensity={90} tint="dark" style={styles.ratingBlur}>
                  <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={Platform.OS === 'android' ? 14 : 16} color="#FFD700" />
                  <Text style={[styles.ratingText, { fontSize: scaleFontSize(15) }]}>{displayRating.toFixed(1)}</Text>
                </BlurView>
              </View>
            )}

            <View style={styles.statusBadge}>
              <BlurView intensity={90} tint="dark" style={styles.statusBlur}>
                <View style={[styles.statusDot, isOpen ? styles.statusDotOpen : styles.statusDotClosed]} />
                <Text style={[styles.statusText, { fontSize: scaleFontSize(14) }]}>{estadoLocal.badge}</Text>
                {estadoLocal.tiempoRestante && <Text style={[styles.statusSubtext, { fontSize: scaleFontSize(12) }]}>• {estadoLocal.tiempoRestante}</Text>}
              </BlurView>
            </View>

            {local.destacado && (
              <View style={styles.destacadoBadge}>
                <BlurView intensity={90} tint="dark" style={styles.destacadoBlur}>
                  <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={Platform.OS === 'android' ? 14 : 16} color="#F59E0B" />
                  <Text style={[styles.destacadoText, { fontSize: scaleFontSize(13) }]}>Destacado</Text>
                </BlurView>
              </View>
            )}

            <TouchableOpacity 
              style={[
                styles.favoritoButton,
                {
                  width: coverPhotoButtonSize,
                  height: coverPhotoButtonSize,
                  borderRadius: coverPhotoButtonSize / 2,
                }
              ]} 
              onPress={handleToggleFavorito} 
              disabled={loadingFavorite}
            >
              <BlurView intensity={80} tint="dark" style={styles.favoritoBlur}>
                {loadingFavorite ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <IconSymbol
                    ios_icon_name={localIsFavorite ? 'heart.fill' : 'heart'}
                    android_material_icon_name={localIsFavorite ? 'favorite' : 'favorite_border'}
                    size={Platform.OS === 'android' ? 18 : 22}
                    color={localIsFavorite ? '#EF4444' : '#FFFFFF'}
                  />
                )}
              </BlurView>
            </TouchableOpacity>
          </View>
        )}

        {allImages.length > 1 && (
          <View style={styles.gallerySection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
              {allImages.slice(1, 6).map((image, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[
                    styles.galleryItem,
                    {
                      width: galleryThumbnailSize,
                      height: galleryThumbnailSize,
                    }
                  ]} 
                  onPress={() => handleOpenGallery(index + 1)}
                >
                  <OptimizedImage source={{ uri: image }} style={styles.galleryImage} resizeMode="cover" />
                </TouchableOpacity>
              ))}
              {allImages.length > 6 && (
                <TouchableOpacity 
                  style={[
                    styles.galleryItem,
                    {
                      width: galleryThumbnailSize,
                      height: galleryThumbnailSize,
                    }
                  ]} 
                  onPress={() => handleOpenGallery(6)}
                >
                  <OptimizedImage source={{ uri: allImages[6] }} style={styles.galleryImage} resizeMode="cover" />
                  <View style={styles.galleryOverlay}>
                    <Text style={[styles.galleryOverlayText, { fontSize: scaleFontSize(20) }]}>+{allImages.length - 6}</Text>
                  </View>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}

        <View style={styles.contentCard}>
          <View style={styles.headerSection}>
            <Text style={[styles.localNameText, { fontSize: scaleFontSize(28) }]}>{local.nombre}</Text>

            {allCategories.length > 0 && (
              <View style={styles.categoriesRow}>
                {allCategories.map((categoria, index) => {
                  const icon = getCategoryIcon(categoria);
                  return (
                    <View 
                      key={index} 
                      style={[
                        styles.categoryChipHighlighted, 
                        { 
                          backgroundColor: icon.color,
                          paddingHorizontal: categoryBadgePaddingH,
                          paddingVertical: categoryBadgePaddingV,
                        }
                      ]}
                    >
                      <IconSymbol ios_icon_name={icon.ios} android_material_icon_name={icon.android} size={Platform.OS === 'android' ? 16 : 18} color="#fff" />
                      <Text style={[styles.categoryChipTextHighlighted, { fontSize: scaleFontSize(13) }]}>{categoria.toUpperCase()}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {local.direccion && (
              <View style={styles.addressCompact}>
                <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={18} color={colors.primary} />
                <Text style={[styles.addressTextCompact, { fontSize: scaleFontSize(14) }]} numberOfLines={1}>
                  {local.direccion}
                </Text>
              </View>
            )}

            {distance && (
              <View style={styles.distanceContainer}>
                <IconSymbol ios_icon_name="location.fill" android_material_icon_name="my_location" size={16} color={colors.primary} />
                <Text style={[styles.distanceText, { fontSize: scaleFontSize(14) }]}>A {distance} de tu ubicación</Text>
              </View>
            )}
          </View>

          {!hasOwner && (
            <TouchableOpacity 
              style={styles.claimLocalCard}
              onPress={handleClaimLocal}
              activeOpacity={0.8}
            >
              <View style={styles.claimLocalCardContent}>
                <IconSymbol 
                  ios_icon_name="building.2" 
                  android_material_icon_name="business" 
                  size={16} 
                  color={colors.primary} 
                />
                <Text style={[styles.claimLocalCardText, { fontSize: scaleFontSize(13) }]}>
                  ¿Este es tu local? Reclámalo ahora
                </Text>
                <IconSymbol 
                  ios_icon_name="chevron.right" 
                  android_material_icon_name="chevron_right" 
                  size={14} 
                  color={colors.textSecondary} 
                />
              </View>
            </TouchableOpacity>
          )}

          {checkedInUsers.length > 0 && (
            <TouchableOpacity 
              style={styles.checkedInSection}
              onPress={() => setShowUsersModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.checkedInHeader}>
                <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={20} color={colors.primary} />
                <Text style={[styles.checkedInTitle, { fontSize: scaleFontSize(15) }]}>
                  {checkedInUsers.length} {checkedInUsers.length === 1 ? 'persona está' : 'personas están'} en este local
                </Text>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron_right"
                  size={18}
                  color={colors.primary}
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.checkedInUsersScroll}>
                {checkedInUsers.slice(0, 5).map((checkedUser) => (
                  <View
                    key={checkedUser.id}
                    style={styles.checkedInUserCard}
                  >
                    <View style={styles.checkedInUserAvatar}>
                      {checkedUser.avatar ? (
                        <RNImage 
                          source={{ uri: checkedUser.avatar }} 
                          style={styles.checkedInUserAvatarImage}
                        />
                      ) : (
                        <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={20} color={colors.headerText} />
                      )}
                    </View>
                    <Text style={[styles.checkedInUserName, { fontSize: scaleFontSize(12) }]} numberOfLines={1}>
                      {checkedUser.nombre}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </TouchableOpacity>
          )}

          {user && isOpen && isClientMode && (
            <View style={styles.checkInButtonsContainer}>
              {!isCheckedIn ? (
                <TouchableOpacity style={styles.checkInButton} onPress={handleCheckIn}>
                  <LinearGradient colors={['#10B981', '#059669']} style={styles.checkInButtonGradient}>
                    <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="add_location" size={22} color="#fff" />
                    <Text style={[styles.checkInButtonText, { fontSize: scaleFontSize(15) }]}>Estoy en este local</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.checkOutButton} onPress={handleCheckOut}>
                  <LinearGradient colors={['#9CA3AF', '#6B7280']} style={styles.checkInButtonGradient}>
                    <IconSymbol ios_icon_name="mappin.slash.circle.fill" android_material_icon_name="location_off" size={22} color="#fff" />
                    <Text style={[styles.checkInButtonText, { fontSize: scaleFontSize(15) }]}>Ya no estoy en este local</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.actionsRow}>
            {local.telefono && (
              <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
                <LinearGradient 
                  colors={['#10B981', '#059669']} 
                  start={{ x: 0, y: 0 }} 
                  end={{ x: 1, y: 1 }} 
                  style={[
                    styles.actionBtnGradient,
                    { paddingVertical: actionButtonPaddingVertical }
                  ]}
                >
                  <IconSymbol ios_icon_name="phone.fill" android_material_icon_name="phone" size={20} color="#fff" />
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
                  style={[
                    styles.actionBtnGradient,
                    { paddingVertical: actionButtonPaddingVertical }
                  ]}
                >
                  <IconSymbol ios_icon_name="map.fill" android_material_icon_name="map" size={20} color="#fff" />
                  <Text style={[styles.actionBtnText, { fontSize: scaleFontSize(14) }]}>Cómo llegar</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.socialButtonsContainer}>
            {hasSocialProfile && (
              <TouchableOpacity style={styles.specialButton} onPress={handleSocialProfile}>
                <LinearGradient 
                  colors={[colors.primary, colors.secondary]} 
                  start={{ x: 0, y: 0 }} 
                  end={{ x: 1, y: 1 }} 
                  style={[
                    styles.specialButtonGradient,
                    { paddingVertical: actionButtonPaddingVertical }
                  ]}
                >
                  <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={22} color="#fff" />
                  <Text style={[styles.specialButtonText, { fontSize: scaleFontSize(15) }]}>Ver Perfil Social</Text>
                  <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            )}

            {(local.website || local.email) && (
              <TouchableOpacity 
                style={styles.specialButton} 
                onPress={() => {
                  if (local.website) {
                    Linking.openURL(local.website.startsWith('http') ? local.website : `https://${local.website}`);
                  } else if (local.email) {
                    Linking.openURL(`mailto:${local.email}`);
                  }
                }}
              >
                <LinearGradient 
                  colors={['#10B981', '#059669']} 
                  start={{ x: 0, y: 0 }} 
                  end={{ x: 1, y: 1 }} 
                  style={[
                    styles.specialButtonGradient,
                    { paddingVertical: actionButtonPaddingVertical }
                  ]}
                >
                  <IconSymbol 
                    ios_icon_name={local.website ? "globe" : "envelope.fill"} 
                    android_material_icon_name={local.website ? "language" : "email"} 
                    size={22} 
                    color="#fff" 
                  />
                  <Text style={[styles.specialButtonText, { fontSize: scaleFontSize(15) }]}>
                    {local.website ? 'Sitio Web' : 'Enviar Email'}
                  </Text>
                  <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {isOpen && isClientMode && (
            <TouchableOpacity
              style={styles.virtualRoomButton}
              onPress={handleVirtualRoom}
              activeOpacity={0.85}
            >
              <LinearGradient 
                colors={['#A855F7', '#8B5CF6', '#7C3AED', '#6D28D9']} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 1 }} 
                style={[
                  styles.virtualRoomButtonGradient,
                  { paddingVertical: Platform.OS === 'android' ? actionButtonPaddingVertical + 4 : 18 }
                ]}
              >
                <View style={styles.virtualRoomIconContainer}>
                  <View style={styles.virtualRoomIconGlow} />
                  <IconSymbol 
                    ios_icon_name="cube.fill" 
                    android_material_icon_name="view_in_ar" 
                    size={Platform.OS === 'android' ? 24 : 28} 
                    color="#fff" 
                  />
                </View>
                <View style={styles.virtualRoomTextContainer}>
                  <View style={styles.virtualRoomTitleRow}>
                    <Text style={[styles.virtualRoomButtonTitle, { fontSize: scaleFontSize(18) }]}>Sala Virtual</Text>
                    <View style={styles.livePulseDot} />
                  </View>
                  <Text style={[styles.virtualRoomButtonSubtitle, { fontSize: scaleFontSize(13) }]}>
                    Chatea en tiempo real con otros usuarios
                  </Text>
                </View>
                <View style={styles.virtualRoomArrowContainer}>
                  <IconSymbol 
                    ios_icon_name="chevron.right" 
                    android_material_icon_name="chevron_right" 
                    size={Platform.OS === 'android' ? 20 : 24} 
                    color="rgba(255, 255, 255, 0.9)" 
                  />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {eventos.length > 0 && (
            <View style={styles.compactSection}>
              <View style={styles.compactSectionHeader}>
                <View style={[styles.compactIconCircle, { backgroundColor: colors.primary + '20' }]}>
                  <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.compactSectionTitle, { fontSize: scaleFontSize(18) }]}>Eventos Próximos</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventsScroll}>
                {eventos.map((evento) => (
                  <TouchableOpacity
                    key={evento.id}
                    style={styles.eventCard}
                    onPress={() => router.push({ pathname: '/detalle/evento', params: { id: evento.id } })}
                  >
                    {evento.imagen_url && (
                      <OptimizedImage source={{ uri: `${evento.imagen_url}?v=${Date.now()}` }} style={styles.eventImage} resizeMode="cover" />
                    )}
                    <View style={styles.eventContent}>
                      <Text style={[styles.eventTitle, { fontSize: scaleFontSize(14) }]} numberOfLines={2}>
                        {evento.titulo}
                      </Text>
                      <Text style={[styles.eventDate, { fontSize: scaleFontSize(12) }]}>
                        {new Date(evento.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {local.horarios_completos && Object.keys(local.horarios_completos).length > 0 && (
            <View style={styles.compactSection}>
              <View style={styles.compactSectionHeader}>
                <View style={[styles.compactIconCircle, { backgroundColor: '#3B82F6' + '20' }]}>
                  <IconSymbol ios_icon_name="clock.fill" android_material_icon_name="schedule" size={20} color="#3B82F6" />
                </View>
                <Text style={[styles.compactSectionTitle, { fontSize: scaleFontSize(18) }]}>Horarios</Text>
              </View>
              <View style={styles.scheduleCompact}>
                {orderedDaysDisplay.map((dayDisplay) => {
                  const dayNormalized = normalizeDayName(dayDisplay);
                  const hours = local.horarios_completos?.[dayNormalized] || [];
                  const isToday = dayNormalized.toLowerCase() === normalizeDayName(diaLogicoParaResaltar).toLowerCase();

                  const formattedHours = formatOpeningHours(hours);

                  return (
                    <View key={dayDisplay} style={[styles.scheduleRow, isToday && styles.scheduleRowToday]}>
                      <View style={styles.scheduleDayContainer}>
                        <Text style={[styles.scheduleDayCompact, { fontSize: scaleFontSize(13) }, isToday && styles.scheduleDayTodayCompact]}>
                          {dayDisplay.charAt(0).toUpperCase() + dayDisplay.slice(1, 3)}
                        </Text>
                        {isToday && <View style={styles.todayDot} />}
                      </View>
                      <Text style={[styles.scheduleHoursCompact, { fontSize: scaleFontSize(12) }, isToday && styles.scheduleHoursTodayCompact]} numberOfLines={2}>
                        {formattedHours}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {allServices.length > 0 && (
            <View style={styles.compactSection}>
              <View style={styles.compactSectionHeader}>
                <View style={[styles.compactIconCircle, { backgroundColor: '#10B981' + '20' }]}>
                  <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color="#10B981" />
                </View>
                <Text style={[styles.compactSectionTitle, { fontSize: scaleFontSize(18) }]}>Servicios Disponibles</Text>
              </View>
              <View style={styles.tagsGrid}>
                {allServices.map((servicio, index) => {
                  const icon = getServiceIcon(servicio);
                  return (
                    <View 
                      key={index} 
                      style={[
                        styles.tag, 
                        { 
                          backgroundColor: icon.color + '15', 
                          borderColor: icon.color + '30',
                          paddingHorizontal: categoryBadgePaddingH + 2,
                          paddingVertical: categoryBadgePaddingV + 3,
                        }
                      ]}
                    >
                      <IconSymbol ios_icon_name={icon.ios} android_material_icon_name={icon.android} size={16} color={icon.color} />
                      <Text style={[styles.tagText, { fontSize: scaleFontSize(13), color: icon.color }]}>{servicio}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {ambienteTags.length > 0 && (
            <View style={styles.compactSection}>
              <View style={styles.compactSectionHeader}>
                <View style={[styles.compactIconCircle, { backgroundColor: '#8B5CF6' + '20' }]}>
                  <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={20} color="#8B5CF6" />
                </View>
                <Text style={[styles.compactSectionTitle, { fontSize: scaleFontSize(18) }]}>Ambiente</Text>
              </View>
              <View style={styles.tagsGrid}>
                {ambienteTags.map((tag, index) => {
                  const icon = getAmbienteIcon(tag);
                  return (
                    <View 
                      key={index} 
                      style={[
                        styles.tag, 
                        { 
                          backgroundColor: icon.color + '15', 
                          borderColor: icon.color + '30',
                          paddingHorizontal: categoryBadgePaddingH + 2,
                          paddingVertical: categoryBadgePaddingV + 3,
                        }
                      ]}
                    >
                      <IconSymbol ios_icon_name={icon.ios} android_material_icon_name={icon.android} size={16} color={icon.color} />
                      <Text style={[styles.tagText, { fontSize: scaleFontSize(13), color: icon.color }]}>{tag}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {clientelaTags.length > 0 && (
            <View style={styles.compactSection}>
              <View style={styles.compactSectionHeader}>
                <View style={[styles.compactIconCircle, { backgroundColor: '#EC4899' + '20' }]}>
                  <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={20} color="#EC4899" />
                </View>
                <Text style={[styles.compactSectionTitle, { fontSize: scaleFontSize(18) }]}>Clientela Típica</Text>
              </View>
              <View style={styles.tagsGrid}>
                {clientelaTags.map((tag, index) => {
                  const icon = getClientelaIcon(tag);
                  return (
                    <View 
                      key={index} 
                      style={[
                        styles.tag, 
                        { 
                          backgroundColor: icon.color + '15', 
                          borderColor: icon.color + '30',
                          paddingHorizontal: categoryBadgePaddingH + 2,
                          paddingVertical: categoryBadgePaddingV + 3,
                        }
                      ]}
                    >
                      <IconSymbol ios_icon_name={icon.ios} android_material_icon_name={icon.android} size={16} color={icon.color} />
                      <Text style={[styles.tagText, { fontSize: scaleFontSize(13), color: icon.color }]}>{tag}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {((local.analisis_reviews && Object.keys(local.analisis_reviews).length > 0) || allReviews.length > 0) && (
            <View style={styles.compactSection}>
              <View style={styles.compactSectionHeader}>
                <View style={[styles.compactIconCircle, { backgroundColor: '#F59E0B' + '20' }]}>
                  <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="analytics" size={20} color="#F59E0B" />
                </View>
                <Text style={[styles.compactSectionTitle, { fontSize: scaleFontSize(18) }]}>Análisis de Reseñas</Text>
              </View>
              <View style={styles.analysisBox}>
                {averageRating > 0 && (
                  <View style={styles.analysisItem}>
                    <Text style={[styles.analysisLabel, { fontSize: scaleFontSize(13) }]}>Sentimiento General</Text>
                    <View style={[styles.sentimentBadge, { backgroundColor: calculateSentiment(averageRating).color + '20' }]}>
                      <Text style={[styles.sentimentText, { fontSize: scaleFontSize(14), color: calculateSentiment(averageRating).color }]}>
                        {calculateSentiment(averageRating).sentiment}
                      </Text>
                    </View>
                  </View>
                )}
                {local.analisis_reviews?.palabras_destacadas_google && local.analisis_reviews.palabras_destacadas_google.length > 0 && (
                  <View style={styles.analysisItem}>
                    <Text style={[styles.analysisLabel, { fontSize: scaleFontSize(13) }]}>Palabras Clave</Text>
                    <View style={styles.keywordsRow}>
                      {local.analisis_reviews.palabras_destacadas_google.slice(0, 5).map((keyword: string, index: number) => (
                        <View key={index} style={[styles.keywordTag, { backgroundColor: '#F59E0B' + '20', borderColor: '#F59E0B' + '30' }]}>
                          <Text style={[styles.keywordTagText, { fontSize: scaleFontSize(12), color: '#F59E0B' }]}>{keyword}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {local.analisis_reviews?.resumen_automatico && (
                  <View style={styles.analysisItem}>
                    <Text style={[styles.analysisLabel, { fontSize: scaleFontSize(13) }]}>Resumen</Text>
                    <Text style={[styles.analysisSummary, { fontSize: scaleFontSize(13) }]}>{local.analisis_reviews.resumen_automatico}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {allReviews.length > 0 && (
            <View style={styles.compactSection}>
              <View style={styles.compactSectionHeader}>
                <View style={[styles.compactIconCircle, { backgroundColor: '#FFD700' + '20' }]}>
                  <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={20} color="#FFD700" />
                </View>
                <Text style={[styles.compactSectionTitle, { fontSize: scaleFontSize(18) }]}>Reseñas</Text>
                <Text style={[styles.reviewsCount, { fontSize: scaleFontSize(16) }]}>({allReviews.length})</Text>
              </View>

              {displayedReviews.map((review, index) => {
                const isGoogleReview = 'source' in review && review.source === 'google';
                
                if (isGoogleReview) {
                  const googleReview = review as GoogleReview & { source: 'google' };
                  const reviewText = googleReview.text || '';
                  const { summary, needsExpansion } = summarizeText(reviewText, 150);
                  const isExpanded = expandedReviews.has(`google-${index}`);
                  const displayText = isExpanded ? reviewText : summary;

                  return (
                    <View key={`google-${index}`} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <View style={styles.reviewAvatar}>
                          {googleReview.profile_photo_url ? (
                            <RNImage 
                              source={{ uri: googleReview.profile_photo_url }} 
                              style={styles.avatar}
                            />
                          ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                              <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={18} color={colors.headerText} />
                            </View>
                          )}
                        </View>
                        <View style={styles.reviewInfo}>
                          <View style={styles.reviewAuthorRow}>
                            <Text style={[styles.reviewAuthor, { fontSize: scaleFontSize(14) }]}>Cliente del local</Text>
                          </View>
                          <View style={styles.reviewRating}>
                            <Ionicons name="star" size={14} color="#FFD700" />
                            <Text style={[styles.reviewRatingText, { fontSize: scaleFontSize(13) }]}>{googleReview.rating}</Text>
                          </View>
                        </View>
                        <Text style={[styles.googleReviewTime, { fontSize: scaleFontSize(12) }]}>{googleReview.relative_time_description}</Text>
                      </View>
                      {reviewText && (
                        <React.Fragment>
                          <Text style={[styles.reviewText, { fontSize: scaleFontSize(14) }]}>{displayText}</Text>
                          {needsExpansion && (
                            <TouchableOpacity onPress={() => toggleReviewExpansion(`google-${index}`)}>
                              <Text style={[styles.expandButton, { fontSize: scaleFontSize(14) }]}>{isExpanded ? 'Ver menos' : 'Ver más'}</Text>
                            </TouchableOpacity>
                          )}
                        </React.Fragment>
                      )}
                    </View>
                  );
                } else {
                  const barliveReview = review as Review;
                  const isExpanded = expandedReviews.has(barliveReview.id);
                  const reviewText = barliveReview.texto || '';
                  const { summary, needsExpansion } = summarizeText(reviewText);
                  const displayText = isExpanded ? reviewText : summary;
                  const isOwner = user && barliveReview.usuario_id === user.id;

                  return (
                    <View key={barliveReview.id} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <View style={styles.reviewAvatar}>
                          {barliveReview.usuario?.avatar ? (
                            <RNImage 
                              source={{ uri: barliveReview.usuario.avatar }} 
                              style={styles.avatar}
                            />
                          ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                              <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={18} color={colors.headerText} />
                            </View>
                          )}
                        </View>
                        <View style={styles.reviewInfo}>
                          <View style={styles.reviewAuthorRow}>
                            <Text style={[styles.reviewAuthor, { fontSize: scaleFontSize(14) }]}>
                              {isOwner ? 'Tu reseña' : barliveReview.usuario?.nombre || 'Usuario de Barlive'}
                            </Text>
                          </View>
                          <View style={styles.reviewRating}>
                            <Ionicons name="star" size={14} color="#FFD700" />
                            <Text style={[styles.reviewRatingText, { fontSize: scaleFontSize(13) }]}>{barliveReview.rating}</Text>
                          </View>
                        </View>
                      </View>
                      {reviewText && (
                        <React.Fragment>
                          <ParsedText text={displayText} style={[styles.reviewText, { fontSize: scaleFontSize(14) }]} />
                          {needsExpansion && (
                            <TouchableOpacity onPress={() => toggleReviewExpansion(barliveReview.id)}>
                              <Text style={[styles.expandButton, { fontSize: scaleFontSize(14) }]}>{isExpanded ? 'Ver menos' : 'Ver más'}</Text>
                            </TouchableOpacity>
                          )}
                        </React.Fragment>
                      )}
                    </View>
                  );
                }
              })}

              {allReviews.length > displayedReviewsCount && (
                <TouchableOpacity 
                  style={styles.loadMoreReviewsButton}
                  onPress={handleLoadMoreReviews}
                >
                  <Text style={[styles.loadMoreReviewsText, { fontSize: scaleFontSize(15) }]}>Ver más</Text>
                  <IconSymbol
                    ios_icon_name="chevron.down"
                    android_material_icon_name="expand_more"
                    size={16}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.addReviewBtn} onPress={handleAddReview}>
                <LinearGradient 
                  colors={[colors.primary, colors.secondary]} 
                  start={{ x: 0, y: 0 }} 
                  end={{ x: 1, y: 0 }} 
                  style={[
                    styles.addReviewGradient,
                    { paddingVertical: actionButtonPaddingVertical }
                  ]}
                >
                  <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={20} color="#fff" />
                  <Text style={[styles.addReviewText, { fontSize: scaleFontSize(15) }]}>
                    {allReviews.some((r) => 'usuario_id' in r && r.usuario_id === user?.id) ? 'Editar Reseña' : 'Añadir Reseña'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {galleryVisible && (
        <ImageGalleryModal 
          visible={galleryVisible} 
          images={allImages} 
          initialIndex={galleryInitialIndex} 
          onClose={() => setGalleryVisible(false)} 
        />
      )}

      {showReviewsModal && (
        <ReviewsModal
          visible={showReviewsModal}
          localId={params.id as string}
          onClose={() => setShowReviewsModal(false)}
          onReviewAdded={() => {
            cargarReviewsUnificadas();
          }}
        />
      )}

      {showCheckInModal && (
        <CheckInModal
          visible={showCheckInModal}
          localId={params.id as string}
          localName={local?.nombre || ''}
          onClose={() => setShowCheckInModal(false)}
          onCheckInComplete={() => {
            setIsCheckedIn(true);
            loadCheckedInUsers();
          }}
        />
      )}

      {showUsersModal && (
        <UsersInLocalModal
          visible={showUsersModal}
          onClose={() => setShowUsersModal(false)}
          users={checkedInUsers}
          localName={local?.nombre || ''}
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
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 48,
    left: 16,
    overflow: 'hidden',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButtonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 48,
    right: 16,
    overflow: 'hidden',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 116 : 104,
    right: 16,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
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
  scrollView: {
    flex: 1,
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
    top: Platform.OS === 'ios' ? 60 : 48,
    left: 70,
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
    fontWeight: '700',
    color: '#fff',
  },
  statusSubtext: {
    color: '#fff',
    fontWeight: '600',
  },
  destacadoBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
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
    bottom: 16,
    right: 16,
    overflow: 'hidden',
    zIndex: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  favoritoBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 25, 25, 0.62)',
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
    fontWeight: '700',
    color: '#fff',
  },
  contentCard: {
    backgroundColor: colors.background,
    padding: 16,
  },
  headerSection: {
    marginBottom: 16,
  },
  localNameText: {
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryChipHighlighted: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryChipTextHighlighted: {
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  addressCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  addressTextCompact: {
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
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  distanceText: {
    color: colors.primary,
    fontWeight: '700',
  },
  claimLocalCard: {
    marginBottom: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  claimLocalCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  claimLocalCardText: {
    flex: 1,
    fontWeight: '600',
    color: colors.text,
  },
  checkedInSection: {
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  checkedInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  checkedInTitle: {
    flex: 1,
    fontWeight: '700',
    color: colors.text,
  },
  checkedInUsersScroll: {
    gap: 12,
  },
  checkedInUserCard: {
    alignItems: 'center',
    width: 80,
  },
  checkedInUserAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  checkedInUserAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  checkedInUserName: {
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  checkInButtonsContainer: {
    marginBottom: 16,
  },
  checkInButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  checkOutButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  checkInButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  checkInButtonText: {
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnText: {
    fontWeight: '700',
    color: '#fff',
  },
  socialButtonsContainer: {
    gap: 10,
    marginBottom: 10,
  },
  specialButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  specialButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  specialButtonText: {
    flex: 1,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 10,
  },
  virtualRoomButton: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  virtualRoomButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 14,
  },
  virtualRoomIconContainer: {
    width: Platform.OS === 'android' ? 52 : 56,
    height: Platform.OS === 'android' ? 52 : 56,
    borderRadius: Platform.OS === 'android' ? 26 : 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  virtualRoomIconGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: Platform.OS === 'android' ? 26 : 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  virtualRoomTextContainer: {
    flex: 1,
  },
  virtualRoomTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  virtualRoomButtonTitle: {
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  virtualRoomButtonSubtitle: {
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  virtualRoomArrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactSection: {
    marginTop: 20,
  },
  compactSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  compactIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactSectionTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  reviewsCount: {
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  eventsScroll: {
    paddingRight: 16,
    gap: 10,
  },
  eventCard: {
    width: 180,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 100,
  },
  eventContent: {
    padding: 10,
  },
  eventTitle: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  eventDate: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  scheduleCompact: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  scheduleRowToday: {
    backgroundColor: colors.primary + '15',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  scheduleDayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 50,
    gap: 4,
  },
  scheduleDayCompact: {
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  scheduleDayTodayCompact: {
    color: colors.primary,
    fontWeight: '800',
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  scheduleHoursCompact: {
    flex: 1,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  scheduleHoursTodayCompact: {
    color: colors.text,
    fontWeight: '600',
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
  },
  tagText: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  analysisBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 14,
  },
  analysisItem: {
    marginBottom: 12,
  },
  analysisLabel: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  sentimentBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  sentimentText: {
    fontWeight: '700',
  },
  keywordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  keywordTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  keywordTagText: {
    fontWeight: '600',
  },
  analysisSummary: {
    color: colors.text,
    lineHeight: 19,
  },
  reviewCard: {
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  googleReviewTime: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewAuthor: {
    fontWeight: '700',
    color: colors.text,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  reviewRatingText: {
    fontWeight: '800',
    color: colors.text,
  },
  reviewText: {
    color: colors.text,
    lineHeight: 20,
  },
  loadMoreReviewsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  loadMoreReviewsText: {
    fontWeight: '700',
    color: colors.primary,
  },
  noReviewsBox: {
    backgroundColor: colors.cardBackground,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  noReviewsText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    marginTop: 8,
  },
  addReviewBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },
  addReviewGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addReviewText: {
    fontWeight: '800',
    color: '#fff',
  },
  expandButton: {
    color: colors.primary,
    fontWeight: '700',
    marginTop: 6,
  },
});
