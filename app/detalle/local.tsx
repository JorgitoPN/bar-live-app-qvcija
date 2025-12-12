
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Platform, Alert, Dimensions, Share as RNShare, Modal, TextInput } from 'react-native';
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
import { useAuth } from '../../contexts/AuthContext';
import { calcularDistancia } from '../../utils/locationUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    'cocteles': { ios: 'wineglass.fill', android: 'local_bar', color: '#EC4899' },
    'cocktails': { ios: 'wineglass.fill', android: 'local_bar', color: '#EC4899' },
    'efectivo': { ios: 'banknote', android: 'payments', color: '#10B981' },
    'pago_efectivo': { ios: 'banknote', android: 'payments', color: '#10B981' },
    'tarjetas': { ios: 'creditcard.fill', android: 'credit_card', color: '#3B82F6' },
    'pago_tarjetas': { ios: 'creditcard.fill', android: 'credit_card', color: '#3B82F6' },
    'tarjetas_credito': { ios: 'creditcard.fill', android: 'credit_card', color: '#3B82F6' },
    'tarjetas_debito': { ios: 'creditcard.fill', android: 'credit_card', color: '#3B82F6' },
    'wifi': { ios: 'wifi', android: 'wifi', color: '#8B5CF6' },
    'wifi_gratis': { ios: 'wifi', android: 'wifi', color: '#8B5CF6' },
    'terraza': { ios: 'sun.max.fill', android: 'wb_sunny', color: '#F59E0B' },
    'terraza_exterior': { ios: 'sun.max.fill', android: 'wb_sunny', color: '#F59E0B' },
    'parking': { ios: 'car.fill', android: 'local_parking', color: '#6366F1' },
    'aparcamiento': { ios: 'car.fill', android: 'local_parking', color: '#6366F1' },
    'accesibilidad': { ios: 'figure.roll', android: 'accessible', color: '#10B981' },
    'accesible_silla_ruedas': { ios: 'figure.roll', android: 'accessible', color: '#10B981' },
    'reservas': { ios: 'calendar', android: 'event', color: '#EF4444' },
    'delivery': { ios: 'bicycle', android: 'delivery_dining', color: '#F59E0B' },
    'entrega_domicilio': { ios: 'bicycle', android: 'delivery_dining', color: '#F59E0B' },
    'takeaway': { ios: 'bag.fill', android: 'takeout_dining', color: '#8B5CF6' },
    'para_llevar': { ios: 'bag.fill', android: 'takeout_dining', color: '#8B5CF6' },
    'comida': { ios: 'fork.knife', android: 'restaurant', color: '#EF4444' },
    'almuerzo': { ios: 'fork.knife', android: 'restaurant', color: '#EF4444' },
    'cena': { ios: 'fork.knife', android: 'restaurant', color: '#EF4444' },
    'desayuno': { ios: 'cup.and.saucer.fill', android: 'local_cafe', color: '#F59E0B' },
    'bebidas': { ios: 'cup.and.saucer.fill', android: 'local_cafe', color: '#F59E0B' },
    'cafe': { ios: 'cup.and.saucer.fill', android: 'local_cafe', color: '#F59E0B' },
    'vino': { ios: 'wineglass.fill', android: 'wine_bar', color: '#8B5CF6' },
    'musica en vivo': { ios: 'music.note', android: 'music_note', color: '#EC4899' },
    'música en vivo': { ios: 'music.note', android: 'music_note', color: '#EC4899' },
    'musica_vivo': { ios: 'music.note', android: 'music_note', color: '#EC4899' },
    'karaoke': { ios: 'mic.fill', android: 'mic', color: '#8B5CF6' },
    'tv': { ios: 'tv.fill', android: 'tv', color: '#3B82F6' },
    'deportes_tv': { ios: 'tv.fill', android: 'tv', color: '#3B82F6' },
    'juegos': { ios: 'gamecontroller.fill', android: 'sports_esports', color: '#10B981' },
    'dj': { ios: 'music.note.list', android: 'music_note', color: '#EC4899' },
    'sin_gluten': { ios: 'leaf.fill', android: 'eco', color: '#10B981' },
    'opciones_veganas': { ios: 'leaf.fill', android: 'eco', color: '#10B981' },
    'comida_vegetariana': { ios: 'leaf.fill', android: 'eco', color: '#10B981' },
  };
  
  const lowerServicio = servicio.toLowerCase().replace(/ /g, '_');
  for (const [key, value] of Object.entries(serviceMap)) {
    if (lowerServicio.includes(key) || key.includes(lowerServicio)) {
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
  
  const lowerAmbiente = ambiente.toLowerCase().replace(/ /g, '_');
  for (const [key, value] of Object.entries(ambienteMap)) {
    if (lowerAmbiente.includes(key) || key.includes(lowerAmbiente)) {
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
  
  const lowerClientela = clientela.toLowerCase().replace(/ /g, '_');
  for (const [key, value] of Object.entries(clientelaMap)) {
    if (lowerClientela.includes(key) || key.includes(lowerClientela)) {
      return value;
    }
  }
  
  return { ios: 'person.2.fill', android: 'people', color: colors.primary };
};

// Helper function to summarize text
const summarizeText = (text: string, maxLength: number = 120): { summary: string; needsExpansion: boolean } => {
  if (!text || text.length <= maxLength) {
    return { summary: text, needsExpansion: false };
  }
  
  const summary = text.substring(0, maxLength).trim() + '...';
  return { summary, needsExpansion: true };
};

// Helper function to calculate sentiment based on rating
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

// Helper function to normalize day names (remove accents for database lookup)
const normalizeDayName = (day: string): string => {
  const normalizations: Record<string, string> = {
    'lunes': 'lunes',
    'martes': 'martes',
    'miércoles': 'miercoles',
    'miercoles': 'miercoles',
    'jueves': 'jueves',
    'viernes': 'viernes',
    'sábado': 'sabado',
    'sabado': 'sabado',
    'domingo': 'domingo',
  };
  return normalizations[day.toLowerCase()] || day;
};

// ✅ FIXED: Helper function to format opening hours correctly with multiple ranges
const formatOpeningHours = (hours: string[]): string => {
  if (!hours || hours.length === 0) {
    return 'Cerrado';
  }
  
  // Sort hours to ensure proper order (earlier times first)
  const sortedHours = [...hours].sort((a, b) => {
    // Extract start time from each range (handle both – and - separators)
    const timeA = a.split('–')[0]?.trim() || a.split('-')[0]?.trim() || '';
    const timeB = b.split('–')[0]?.trim() || b.split('-')[0]?.trim() || '';
    return timeA.localeCompare(timeB);
  });
  
  // Join multiple ranges with comma and space
  return sortedHours.join(', ');
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
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loadingEventos, setLoadingEventos] = useState(false);
  const [expandedDescription, setExpandedDescription] = useState(false);
  
  // ✅ Favorite state
  const [isFavorite, setIsFavorite] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);

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
          console.log('[DetalleLocal] ✅ User location obtained:', location.coords.latitude, location.coords.longitude);
        } else {
          console.log('[DetalleLocal] ⚠️ Location permission not granted');
        }
      } catch (error) {
        console.error('[DetalleLocal] Error getting location:', error);
      }
    })();
  }, []);

  useEffect(() => {
    if (userLocation && local?.latitud && local?.longitud) {
      // ✅ FIXED: Use calcularDistancia from locationUtils for consistent distance calculation
      const distKm = calcularDistancia(
        userLocation.latitude,
        userLocation.longitude,
        Number(local.latitud),
        Number(local.longitud)
      );
      
      // Format distance for display
      const dist = distKm < 1 
        ? `${Math.round(distKm * 1000)} m` 
        : `${distKm.toFixed(1)} km`;
      
      setDistance(dist);
      console.log('[DetalleLocal] ✅ Real distance calculated:', dist, 'from user:', userLocation, 'to local:', local.latitud, local.longitud);
    } else {
      console.log('[DetalleLocal] ⚠️ Cannot calculate distance - missing data:', {
        hasUserLocation: !!userLocation,
        hasLocalLat: !!local?.latitud,
        hasLocalLon: !!local?.longitud
      });
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
        .limit(3);

      if (error) {
        console.error('[DetalleLocal] Error loading reviews:', error);
        return;
      }

      console.log('[DetalleLocal] Loaded reviews:', data);
      setReviews(data || []);
      
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

  // ✅ Check if local is favorite
  const checkIfFavorite = useCallback(async () => {
    if (!user) {
      setIsFavorite(false);
      return;
    }
    
    try {
      console.log('[DetalleLocal] 🔍 Checking favorite status for user:', user.id, 'local:', params.id);
      
      const { data, error } = await supabase
        .from('locales_guardados')
        .select('id')
        .eq('usuario_id', user.id)
        .eq('local_id', params.id)
        .maybeSingle();

      if (error) {
        console.error('[DetalleLocal] Error checking favorite:', error);
        setIsFavorite(false);
        return;
      }

      const favoriteStatus = !!data;
      setIsFavorite(favoriteStatus);
      console.log('[DetalleLocal] ✅ Favorite status checked:', favoriteStatus, 'Data:', data);
    } catch (error) {
      console.error('[DetalleLocal] Error checking favorite:', error);
      setIsFavorite(false);
    }
  }, [user, params.id]);

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
        horariosKeys: data.horarios_completos ? Object.keys(data.horarios_completos) : [],
        planActivo: data.plan_activo,
        destacado: data.destacado,
        hasAmbiente: !!data.ambiente_completo,
        hasClientela: !!data.clientela,
        hasAnalisisReviews: !!data.analisis_reviews,
        latitud: data.latitud,
        longitud: data.longitud
      });
      
      setLocal(data);
      setLoading(false);
      cargarReviewsBarlive();
      cargarEventos();
      checkIfFavorite();
    } catch (error) {
      console.error('[DetalleLocal] Error:', error);
      setLoading(false);
    }
  }, [params.id, cargarReviewsBarlive, cargarEventos, checkIfFavorite]);

  useEffect(() => {
    if (params.id) {
      cargarLocal();
    }
  }, [params.id, cargarLocal]);

  // ✅ FIXED: Toggle favorite function with better session handling
  const toggleFavorito = async (e: any) => {
    e.stopPropagation();
    
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para agregar favoritos');
      return;
    }

    setLoadingFavorite(true);
    
    // ✅ Optimistic UI update
    const previousState = isFavorite;
    setIsFavorite(!isFavorite);
    
    try {
      // ✅ FIXED: Get current session without forcing refresh
      console.log('[DetalleLocal] 🔍 Getting current session...');
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData?.session) {
        console.error('[DetalleLocal] Session error:', sessionError);
        setIsFavorite(previousState);
        setLoadingFavorite(false);
        Alert.alert(
          'Sesión expirada',
          'Tu sesión ha expirado. Por favor cierra sesión y vuelve a iniciar sesión.'
        );
        return;
      }

      const session = sessionData.session;
      console.log('[DetalleLocal] ✅ Session valid. User ID:', session.user.id);

      // ✅ Verify user ID matches
      if (session.user.id !== user.id) {
        console.error('[DetalleLocal] User ID mismatch:', session.user.id, 'vs', user.id);
        setIsFavorite(previousState);
        setLoadingFavorite(false);
        Alert.alert(
          'Error de autenticación',
          'Hay un problema con tu cuenta. Por favor cierra sesión y vuelve a iniciar sesión.'
        );
        return;
      }

      console.log('[DetalleLocal] 🔄 Toggling favorite. Current state:', previousState, '-> New state:', !previousState);

      if (previousState) {
        // Remove from favorites
        console.log('[DetalleLocal] Removing from favorites...');
        const { error } = await supabase
          .from('locales_guardados')
          .delete()
          .eq('usuario_id', user.id)
          .eq('local_id', params.id);

        if (error) {
          console.error('[DetalleLocal] Error removing favorite:', error);
          setIsFavorite(previousState);
          setLoadingFavorite(false);
          
          // Provide specific error messages
          if (error.code === '42501') {
            Alert.alert(
              'Error de permisos',
              'No tienes permisos para eliminar favoritos. Por favor cierra sesión y vuelve a iniciar sesión.'
            );
          } else if (error.message && error.message.toLowerCase().includes('session')) {
            Alert.alert(
              'Sesión expirada',
              'Tu sesión ha expirado. Por favor cierra sesión y vuelve a iniciar sesión.'
            );
          } else {
            Alert.alert('Error', 'No se pudo eliminar de favoritos. Por favor intenta de nuevo.');
          }
          
          return;
        }
        
        console.log('[DetalleLocal] ✅ Removed from favorites');
      } else {
        // Add to favorites - use maybeSingle to check if already exists
        console.log('[DetalleLocal] Checking if already in favorites...');
        const { data: existing } = await supabase
          .from('locales_guardados')
          .select('id')
          .eq('usuario_id', user.id)
          .eq('local_id', params.id)
          .maybeSingle();

        if (existing) {
          console.log('[DetalleLocal] Already in favorites');
          setIsFavorite(true);
          setLoadingFavorite(false);
          return;
        }

        console.log('[DetalleLocal] Adding to favorites...');
        const { error } = await supabase
          .from('locales_guardados')
          .insert({
            usuario_id: user.id,
            local_id: params.id as string,
          });

        if (error) {
          console.error('[DetalleLocal] Error adding favorite:', error);
          setIsFavorite(previousState);
          setLoadingFavorite(false);
          
          // Provide specific error messages
          if (error.code === '42501') {
            Alert.alert(
              'Error de permisos',
              'No tienes permisos para agregar favoritos. Por favor cierra sesión y vuelve a iniciar sesión.'
            );
          } else if (error.message && error.message.toLowerCase().includes('session')) {
            Alert.alert(
              'Sesión expirada',
              'Tu sesión ha expirado. Por favor cierra sesión y vuelve a iniciar sesión.'
            );
          } else if (error.code === '23505') {
            // Duplicate key error - already exists
            console.log('[DetalleLocal] Already in favorites (duplicate key)');
            setIsFavorite(true);
          } else {
            Alert.alert('Error', 'No se pudo agregar a favoritos. Por favor intenta de nuevo.');
          }
          
          return;
        }
        
        console.log('[DetalleLocal] ✅ Added to favorites');
      }
    } catch (error: any) {
      console.error('[DetalleLocal] Error toggling favorito:', error);
      setIsFavorite(previousState);
      
      // Check for specific error types
      if (error.message && error.message.toLowerCase().includes('session')) {
        Alert.alert(
          'Sesión expirada',
          'Tu sesión ha expirado. Por favor cierra sesión y vuelve a iniciar sesión.'
        );
      } else if (error.name === 'AuthSessionMissingError') {
        Alert.alert(
          'Sesión no encontrada',
          'No se encontró tu sesión. Por favor cierra sesión y vuelve a iniciar sesión.'
        );
      } else {
        Alert.alert('Error', 'No se pudo actualizar favoritos. Por favor intenta de nuevo.');
      }
    } finally {
      setLoadingFavorite(false);
    }
  };

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

  const [showAddReviewModal, setShowAddReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleAddReview = () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para añadir una reseña');
      return;
    }
    setShowAddReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!user || !params.id) {
      Alert.alert('Error', 'Debes iniciar sesión para añadir una reseña');
      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      Alert.alert('Error', 'Por favor selecciona una calificación');
      return;
    }

    setSubmittingReview(true);
    try {
      console.log('[DetalleLocal] Submitting review:', {
        local_id: params.id,
        usuario_id: user.id,
        rating: reviewRating,
        texto: reviewText
      });

      const { error } = await supabase
        .from('reviews_barlive')
        .insert({
          local_id: params.id as string,
          usuario_id: user.id,
          rating: reviewRating,
          texto: reviewText.trim() || null,
        });

      if (error) {
        console.error('[DetalleLocal] Error submitting review:', error);
        Alert.alert('Error', 'No se pudo enviar la reseña. Por favor intenta de nuevo.');
        setSubmittingReview(false);
        return;
      }

      console.log('[DetalleLocal] ✅ Review submitted successfully');
      Alert.alert('¡Gracias!', 'Tu reseña ha sido publicada correctamente');
      
      // Reset form
      setReviewRating(5);
      setReviewText('');
      setShowAddReviewModal(false);
      
      // Reload reviews
      cargarReviewsBarlive();
      
      setSubmittingReview(false);
    } catch (error) {
      console.error('[DetalleLocal] Error submitting review:', error);
      Alert.alert('Error', 'No se pudo enviar la reseña. Por favor intenta de nuevo.');
      setSubmittingReview(false);
    }
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

  // ✅ Handle delete review
  const handleDeleteReview = async (reviewId: string) => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para eliminar reseñas');
      return;
    }

    Alert.alert(
      'Eliminar reseña',
      '¿Estás seguro de que quieres eliminar esta reseña?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[DetalleLocal] Deleting review:', reviewId);
              
              const { error } = await supabase
                .from('reviews_barlive')
                .delete()
                .eq('id', reviewId)
                .eq('usuario_id', user.id); // Ensure user owns the review

              if (error) {
                console.error('[DetalleLocal] Error deleting review:', error);
                Alert.alert('Error', 'No se pudo eliminar la reseña');
                return;
              }

              console.log('[DetalleLocal] ✅ Review deleted successfully');
              Alert.alert('Éxito', 'Reseña eliminada correctamente');
              
              // Reload reviews
              cargarReviewsBarlive();
            } catch (error) {
              console.error('[DetalleLocal] Error deleting review:', error);
              Alert.alert('Error', 'No se pudo eliminar la reseña');
            }
          },
        },
      ]
    );
  };

  // ✅ Handle edit review
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editReviewRating, setEditReviewRating] = useState(5);
  const [editReviewText, setEditReviewText] = useState('');
  const [showEditReviewModal, setShowEditReviewModal] = useState(false);

  const handleEditReview = (review: Review) => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para editar reseñas');
      return;
    }

    setEditingReviewId(review.id);
    setEditReviewRating(review.rating);
    setEditReviewText(review.texto || '');
    setShowEditReviewModal(true);
  };

  const handleSubmitEditReview = async () => {
    if (!user || !editingReviewId) {
      Alert.alert('Error', 'Debes iniciar sesión para editar reseñas');
      return;
    }

    if (editReviewRating < 1 || editReviewRating > 5) {
      Alert.alert('Error', 'Por favor selecciona una calificación');
      return;
    }

    setSubmittingReview(true);
    try {
      console.log('[DetalleLocal] Updating review:', {
        id: editingReviewId,
        rating: editReviewRating,
        texto: editReviewText
      });

      const { error } = await supabase
        .from('reviews_barlive')
        .update({
          rating: editReviewRating,
          texto: editReviewText.trim() || null,
        })
        .eq('id', editingReviewId)
        .eq('usuario_id', user.id); // Ensure user owns the review

      if (error) {
        console.error('[DetalleLocal] Error updating review:', error);
        Alert.alert('Error', 'No se pudo actualizar la reseña. Por favor intenta de nuevo.');
        setSubmittingReview(false);
        return;
      }

      console.log('[DetalleLocal] ✅ Review updated successfully');
      Alert.alert('¡Gracias!', 'Tu reseña ha sido actualizada correctamente');
      
      // Reset form
      setEditingReviewId(null);
      setEditReviewRating(5);
      setEditReviewText('');
      setShowEditReviewModal(false);
      
      // Reload reviews
      cargarReviewsBarlive();
      
      setSubmittingReview(false);
    } catch (error) {
      console.error('[DetalleLocal] Error updating review:', error);
      Alert.alert('Error', 'No se pudo actualizar la reseña. Por favor intenta de nuevo.');
      setSubmittingReview(false);
    }
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

  const allImages = [
    local.imagen_url || local.foto_principal,
    ...(local.fotos || []),
    ...(local.galeria_urls || [])
  ].filter(Boolean).map(img => `${img}?v=${Date.now()}`);

  const estadoLocal = getEstadoLocal(local);
  const isOpen = estadoLocal.estaAbierto === true;
  const hasSocialProfile = local.plan_activo === 'estandar' || local.plan_activo === 'premium';

  // Extract services from servicios_disponibles - DEDUPLICATE
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
    local.servicios.forEach(servicio => {
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

  // Extract ambiente tags - DEDUPLICATE
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

  // Extract clientela tags - DEDUPLICATE
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
  console.log('[DetalleLocal] ========================================');
  console.log('[DetalleLocal] Local:', local.nombre);
  console.log('[DetalleLocal] Estado local:', estadoLocal);
  console.log('[DetalleLocal] Día lógico para resaltar:', diaLogicoParaResaltar);
  console.log('[DetalleLocal] Horarios completos:', local.horarios_completos);
  console.log('[DetalleLocal] ========================================');

  const displayRating = local.rating || local.google_rating || averageRating || 0;

  const allReviewsForSentiment = [
    ...reviews,
    ...(local.reviews_google || [])
  ];
  
  const averageRatingForSentiment = allReviewsForSentiment.length > 0
    ? allReviewsForSentiment.reduce((sum, r) => sum + (r.rating || 0), 0) / allReviewsForSentiment.length
    : displayRating;

  const allReviews = [
    ...reviews.map(r => ({ ...r, isGoogle: false })),
    ...(local.reviews_google || []).slice(0, 3 - reviews.length).map((r: any) => ({
      ...r,
      isGoogle: true,
      id: r.time?.toString() || Math.random().toString(),
    }))
  ].slice(0, 3);

  const allCategories = (local.barlive_types && local.barlive_types.length > 0 
    ? local.barlive_types 
    : local.barlive_type 
      ? [local.barlive_type] 
      : local.categoria 
        ? [local.categoria] 
        : []
  ).filter(cat => !CATEGORIAS_EXCLUIDAS.some(excluded => cat.toLowerCase().includes(excluded.toLowerCase())));

  const backButtonTop = local.destacado ? 92 : 52;

  // Description handling
  const description = local.descripcion_google || local.descripcion || '';
  const { summary: descriptionSummary, needsExpansion: needsDescriptionExpansion } = summarizeText(description, 150);

  const orderedDaysDisplay = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Cover Photo */}
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
                <View key={index} style={{ width: SCREEN_WIDTH, height: 300 }}>
                  <OptimizedImage
                    source={{ uri: image }}
                    style={styles.coverImage}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </ScrollView>
          </TouchableOpacity>
          
          {displayRating > 0 && (
            <View style={styles.ratingBadgeTopRight}>
              <BlurView intensity={90} tint="dark" style={styles.ratingBlur}>
                <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>{displayRating.toFixed(1)}</Text>
              </BlurView>
            </View>
          )}
          
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

          {local.destacado && (
            <View style={styles.destacadoBadgeTop}>
              <BlurView intensity={90} tint="dark" style={styles.destacadoBlur}>
                <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={16} color="#F59E0B" />
                <Text style={styles.destacadoText}>Destacado</Text>
              </BlurView>
            </View>
          )}

          <TouchableOpacity style={[styles.backButton, { top: backButtonTop }]} onPress={() => router.back()}>
            <BlurView intensity={80} tint="dark" style={styles.buttonBlur}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <BlurView intensity={80} tint="dark" style={styles.buttonBlur}>
              <IconSymbol ios_icon_name="square.and.arrow.up" android_material_icon_name="share" size={22} color="#fff" />
            </BlurView>
          </TouchableOpacity>
          
          {/* ✅ FIXED: Favorite button with RED heart when saved */}
          <TouchableOpacity
            style={styles.favoritoButton}
            onPress={toggleFavorito}
            disabled={loadingFavorite}
          >
            <BlurView intensity={80} tint="dark" style={styles.favoritoBlur}>
              {loadingFavorite ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <IconSymbol
                  ios_icon_name={isFavorite ? "heart.fill" : "heart"}
                  android_material_icon_name={isFavorite ? "favorite" : "favorite_border"}
                  size={22}
                  color={isFavorite ? "#EF4444" : "#FFFFFF"}
                />
              )}
            </BlurView>
          </TouchableOpacity>
        </View>
      )}

      {/* Photo Gallery */}
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
        {/* Header Section with Local Name */}
        <View style={styles.headerSection}>
          {/* ✅ Local Name - ONLY HERE */}
          <Text style={styles.localNameText}>{local.nombre}</Text>

          {allCategories.length > 0 && (
            <View style={styles.categoriesRow}>
              {allCategories.map((categoria, index) => {
                const icon = getCategoryIcon(categoria);
                return (
                  <View key={index} style={[styles.categoryChipHighlighted, { backgroundColor: icon.color }]}>
                    <IconSymbol 
                      ios_icon_name={icon.ios} 
                      android_material_icon_name={icon.android} 
                      size={18} 
                      color="#fff" 
                    />
                    <Text style={styles.categoryChipTextHighlighted}>{categoria.toUpperCase()}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Address with Distance */}
          {local.direccion && (
            <View style={styles.addressCompact}>
              <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={18} color={colors.primary} />
              <Text style={styles.addressTextCompact} numberOfLines={1}>
                {local.direccion}
              </Text>
            </View>
          )}

          {/* Distance Display - Separate and Prominent */}
          {distance && (
            <View style={styles.distanceContainer}>
              <IconSymbol ios_icon_name="location.fill" android_material_icon_name="my_location" size={16} color={colors.primary} />
              <Text style={styles.distanceText}>A {distance} de tu ubicación</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionText}>
              {expandedDescription ? description : descriptionSummary}
            </Text>
            {needsDescriptionExpansion && (
              <TouchableOpacity onPress={() => setExpandedDescription(!expandedDescription)}>
                <Text style={styles.expandButton}>
                  {expandedDescription ? 'Ver menos' : 'Ver más'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          {local.telefono && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionBtnGradient}
              >
                <IconSymbol ios_icon_name="phone.fill" android_material_icon_name="phone" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Llamar</Text>
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
                <IconSymbol ios_icon_name="map.fill" android_material_icon_name="map" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Cómo llegar</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Social Profile Button */}
        {hasSocialProfile && (
          <TouchableOpacity style={styles.specialButton} onPress={handleSocialProfile}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.specialButtonGradient}
            >
              <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={22} color="#fff" />
              <Text style={styles.specialButtonText}>Perfil Social</Text>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Virtual Room Button */}
        {isOpen && (
          <TouchableOpacity 
            style={styles.virtualRoomButton} 
            onPress={() => router.push({ pathname: '/detalle/sala-virtual', params: { localId: params.id } })}
          >
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.virtualRoomButtonGradient}
            >
              <IconSymbol ios_icon_name="cube.fill" android_material_icon_name="view_in_ar" size={22} color="#fff" />
              <Text style={styles.virtualRoomButtonText}>Sala Virtual</Text>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Events */}
        {eventos.length > 0 && (
          <View style={styles.compactSection}>
            <View style={styles.compactSectionHeader}>
              <View style={[styles.compactIconCircle, { backgroundColor: colors.primary + '20' }]}>
                <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={20} color={colors.primary} />
              </View>
              <Text style={styles.compactSectionTitle}>Eventos Próximos</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventsScroll}>
              {eventos.map((evento) => (
                <TouchableOpacity
                  key={evento.id}
                  style={styles.eventCard}
                  onPress={() => router.push({ pathname: '/detalle/evento', params: { id: evento.id } })}
                >
                  {evento.imagen_url && (
                    <OptimizedImage
                      source={{ uri: `${evento.imagen_url}?v=${Date.now()}` }}
                      style={styles.eventImage}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.eventContent}>
                    <Text style={styles.eventTitle} numberOfLines={2}>{evento.titulo}</Text>
                    <Text style={styles.eventDate}>
                      {new Date(evento.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ✅ FIXED: Schedule - Correct formatting with multiple time ranges */}
        {local.horarios_completos && Object.keys(local.horarios_completos).length > 0 && (
          <View style={styles.compactSection}>
            <View style={styles.compactSectionHeader}>
              <View style={[styles.compactIconCircle, { backgroundColor: '#3B82F6' + '20' }]}>
                <IconSymbol ios_icon_name="clock.fill" android_material_icon_name="schedule" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.compactSectionTitle}>Horarios</Text>
            </View>
            <View style={styles.scheduleCompact}>
              {orderedDaysDisplay.map((dayDisplay) => {
                const dayNormalized = normalizeDayName(dayDisplay);
                const hours = local.horarios_completos?.[dayNormalized] || [];
                const isToday = dayNormalized.toLowerCase() === normalizeDayName(diaLogicoParaResaltar).toLowerCase();
                
                // ✅ FIXED: Format hours correctly
                const formattedHours = formatOpeningHours(hours);
                
                console.log(`[DetalleLocal] Day: ${dayDisplay} (normalized: ${dayNormalized}), Raw Hours:`, hours, 'Formatted:', formattedHours, 'IsToday:', isToday);
                
                return (
                  <View key={dayDisplay} style={[styles.scheduleRow, isToday && styles.scheduleRowToday]}>
                    <View style={styles.scheduleDayContainer}>
                      <Text style={[styles.scheduleDayCompact, isToday && styles.scheduleDayTodayCompact]}>
                        {dayDisplay.charAt(0).toUpperCase() + dayDisplay.slice(1, 3)}
                      </Text>
                      {isToday && <View style={styles.todayDot} />}
                    </View>
                    <Text style={[styles.scheduleHoursCompact, isToday && styles.scheduleHoursTodayCompact]} numberOfLines={2}>
                      {formattedHours}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Services */}
        {allServices.length > 0 && (
          <View style={styles.compactSection}>
            <View style={styles.compactSectionHeader}>
              <View style={[styles.compactIconCircle, { backgroundColor: '#10B981' + '20' }]}>
                <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color="#10B981" />
              </View>
              <Text style={styles.compactSectionTitle}>Servicios Disponibles</Text>
            </View>
            <View style={styles.tagsGrid}>
              {allServices.map((servicio, index) => {
                const icon = getServiceIcon(servicio);
                return (
                  <View key={index} style={[styles.tag, { backgroundColor: icon.color + '15', borderColor: icon.color + '30' }]}>
                    <IconSymbol 
                      ios_icon_name={icon.ios} 
                      android_material_icon_name={icon.android} 
                      size={16} 
                      color={icon.color} 
                    />
                    <Text style={[styles.tagText, { color: icon.color }]}>{servicio}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Atmosphere */}
        {ambienteTags.length > 0 && (
          <View style={styles.compactSection}>
            <View style={styles.compactSectionHeader}>
              <View style={[styles.compactIconCircle, { backgroundColor: '#8B5CF6' + '20' }]}>
                <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.compactSectionTitle}>Ambiente</Text>
            </View>
            <View style={styles.tagsGrid}>
              {ambienteTags.map((tag, index) => {
                const icon = getAmbienteIcon(tag);
                return (
                  <View key={index} style={[styles.tag, { backgroundColor: icon.color + '15', borderColor: icon.color + '30' }]}>
                    <IconSymbol 
                      ios_icon_name={icon.ios} 
                      android_material_icon_name={icon.android} 
                      size={16} 
                      color={icon.color} 
                    />
                    <Text style={[styles.tagText, { color: icon.color }]}>{tag}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Clientele */}
        {clientelaTags.length > 0 && (
          <View style={styles.compactSection}>
            <View style={styles.compactSectionHeader}>
              <View style={[styles.compactIconCircle, { backgroundColor: '#EC4899' + '20' }]}>
                <IconSymbol ios_icon_name="person.2.fill" android_material_icon_name="people" size={20} color="#EC4899" />
              </View>
              <Text style={styles.compactSectionTitle}>Clientela Típica</Text>
            </View>
            <View style={styles.tagsGrid}>
              {clientelaTags.map((tag, index) => {
                const icon = getClientelaIcon(tag);
                return (
                  <View key={index} style={[styles.tag, { backgroundColor: icon.color + '15', borderColor: icon.color + '30' }]}>
                    <IconSymbol 
                      ios_icon_name={icon.ios} 
                      android_material_icon_name={icon.android} 
                      size={16} 
                      color={icon.color} />
                    <Text style={[styles.tagText, { color: icon.color }]}>{tag}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Reviews Analysis */}
        {((local.analisis_reviews && Object.keys(local.analisis_reviews).length > 0) || allReviewsForSentiment.length > 0) && (
          <View style={styles.compactSection}>
            <View style={styles.compactSectionHeader}>
              <View style={[styles.compactIconCircle, { backgroundColor: '#F59E0B' + '20' }]}>
                <IconSymbol ios_icon_name="chart.bar.fill" android_material_icon_name="analytics" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.compactSectionTitle}>Análisis de Reseñas</Text>
            </View>
            <View style={styles.analysisBox}>
              {averageRatingForSentiment > 0 && (
                <View style={styles.analysisItem}>
                  <Text style={styles.analysisLabel}>Sentimiento General</Text>
                  <View style={[styles.sentimentBadge, { backgroundColor: calculateSentiment(averageRatingForSentiment).color + '20' }]}>
                    <Text style={[styles.sentimentText, { color: calculateSentiment(averageRatingForSentiment).color }]}>
                      {calculateSentiment(averageRatingForSentiment).sentiment}
                    </Text>
                  </View>
                </View>
              )}
              {local.analisis_reviews?.palabras_destacadas_google && local.analisis_reviews.palabras_destacadas_google.length > 0 && (
                <View style={styles.analysisItem}>
                  <Text style={styles.analysisLabel}>Palabras Clave</Text>
                  <View style={styles.keywordsRow}>
                    {local.analisis_reviews.palabras_destacadas_google.slice(0, 5).map((keyword: string, index: number) => (
                      <View key={index} style={styles.keywordTag}>
                        <Text style={styles.keywordTagText}>{keyword}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {local.analisis_reviews?.resumen_automatico && (
                <View style={styles.analysisItem}>
                  <Text style={styles.analysisLabel}>Resumen</Text>
                  <Text style={styles.analysisSummary}>{local.analisis_reviews.resumen_automatico}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Reviews */}
        <View style={styles.compactSection}>
          <View style={styles.compactSectionHeader}>
            <View style={[styles.compactIconCircle, { backgroundColor: '#FFD700' + '20' }]}>
              <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={20} color="#FFD700" />
            </View>
            <Text style={styles.compactSectionTitle}>Reseñas</Text>
          </View>

          {allReviews.length > 0 ? (
            <>
              {allReviews.map((review: any) => {
                const isExpanded = expandedReviews.has(review.id);
                const reviewText = review.text || review.texto || '';
                const { summary, needsExpansion } = summarizeText(reviewText);
                const displayText = isExpanded ? reviewText : summary;
                
                // ✅ Check if user owns this review
                const isOwner = user && !review.isGoogle && review.usuario_id === user.id;
                
                return (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewAvatar}>
                        <Ionicons name="person" size={18} color={colors.textSecondary} />
                      </View>
                      <View style={styles.reviewInfo}>
                        <Text style={styles.reviewAuthor}>
                          {isOwner ? 'Tu reseña' : 'Cliente del local'}
                        </Text>
                        <View style={styles.reviewRating}>
                          <Ionicons name="star" size={14} color="#FFD700" />
                          <Text style={styles.reviewRatingText}>{review.rating}</Text>
                        </View>
                      </View>
                      {/* ✅ Show edit/delete buttons for owner */}
                      {isOwner && (
                        <View style={styles.reviewActions}>
                          <TouchableOpacity
                            style={styles.reviewActionButton}
                            onPress={() => handleEditReview(review)}
                          >
                            <IconSymbol 
                              ios_icon_name="pencil" 
                              android_material_icon_name="edit" 
                              size={18} 
                              color={colors.primary} 
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.reviewActionButton}
                            onPress={() => handleDeleteReview(review.id)}
                          >
                            <IconSymbol 
                              ios_icon_name="trash" 
                              android_material_icon_name="delete" 
                              size={18} 
                              color="#EF4444" 
                            />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    {reviewText && (
                      <>
                        <Text style={styles.reviewText}>{displayText}</Text>
                        {needsExpansion && (
                          <TouchableOpacity onPress={() => toggleReviewExpansion(review.id)}>
                            <Text style={styles.expandButton}>
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
            <View style={styles.noReviewsBox}>
              <Ionicons name="chatbubbles-outline" size={36} color={colors.textSecondary} />
              <Text style={styles.noReviewsText}>No hay reseñas todavía</Text>
            </View>
          )}

          <TouchableOpacity style={styles.addReviewBtn} onPress={handleAddReview}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addReviewGradient}
            >
              <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={20} color="#fff" />
              <Text style={styles.addReviewText}>Añadir Reseña</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <ImageGalleryModal
        visible={galleryVisible}
        images={allImages}
        initialIndex={galleryInitialIndex}
        onClose={() => setGalleryVisible(false)}
      />

      {/* Add Review Modal */}
      <Modal
        visible={showAddReviewModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Añadir Reseña</Text>
              <TouchableOpacity onPress={() => setShowAddReviewModal(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Calificación</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setReviewRating(star)}
                    style={styles.starButton}
                  >
                    <Ionicons
                      name={star <= reviewRating ? 'star' : 'star-outline'}
                      size={40}
                      color={star <= reviewRating ? '#FFD700' : colors.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Comentario (opcional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Comparte tu experiencia..."
                placeholderTextColor={colors.textSecondary}
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={styles.characterCount}>{reviewText.length}/500</Text>

              <TouchableOpacity
                style={[styles.submitButton, submittingReview && styles.submitButtonDisabled]}
                onPress={handleSubmitReview}
                disabled={submittingReview}
              >
                {submittingReview ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Publicar Reseña</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ✅ Edit Review Modal */}
      <Modal
        visible={showEditReviewModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowEditReviewModal(false);
          setEditingReviewId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Reseña</Text>
              <TouchableOpacity onPress={() => {
                setShowEditReviewModal(false);
                setEditingReviewId(null);
              }}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Calificación</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setEditReviewRating(star)}
                    style={styles.starButton}
                  >
                    <Ionicons
                      name={star <= editReviewRating ? 'star' : 'star-outline'}
                      size={40}
                      color={star <= editReviewRating ? '#FFD700' : colors.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Comentario (opcional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Comparte tu experiencia..."
                placeholderTextColor={colors.textSecondary}
                value={editReviewText}
                onChangeText={setEditReviewText}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={styles.characterCount}>{editReviewText.length}/500</Text>

              <TouchableOpacity
                style={[styles.submitButton, submittingReview && styles.submitButtonDisabled]}
                onPress={handleSubmitEditReview}
                disabled={submittingReview}
              >
                {submittingReview ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Actualizar Reseña</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
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
  buttonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ✅ FIXED: Favorite button styles with RED heart when saved
  favoritoButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
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
    padding: 16,
  },
  headerSection: {
    marginBottom: 16,
  },
  localNameText: {
    fontSize: 28,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryChipTextHighlighted: {
    fontSize: 13,
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
    fontSize: 14,
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
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
  descriptionSection: {
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  expandButton: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 6,
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
    paddingVertical: 12,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  specialButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  specialButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  specialButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 10,
  },
  virtualRoomButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  virtualRoomButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  virtualRoomButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 10,
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
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
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
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 12,
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
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  scheduleDayTodayCompact: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  scheduleHoursCompact: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  scheduleHoursTodayCompact: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
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
    fontSize: 13,
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
    fontSize: 14,
    fontWeight: '700',
  },
  keywordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  keywordTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  keywordTagText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  analysisSummary: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
  },
  reviewCard: {
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
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
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  reviewInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewAuthor: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  reviewRatingText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  // ✅ Review action buttons styles
  reviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewActionButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  reviewText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
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
    paddingVertical: 12,
  },
  addReviewText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  starButton: {
    padding: 4,
  },
  textInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  characterCount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
