
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Linking,
  Platform,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { calcularTiempoHasta, formatDayName, getEstadoLocal } from '@/utils/timeUtils';
import ImageGalleryModal from '@/components/detalle/ImageGalleryModal';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { localPreloader } from '@/utils/localPreloader';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: width,
    height: 300,
    backgroundColor: colors.cardBorder,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
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
  overlayIconContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -40,
    marginTop: -40,
    zIndex: 2,
  },
  badgeDestacadoOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 10 : 10,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FACC15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 151,
  },
  badgeDestacadoText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  estadoBadgeOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 10 : 10,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    zIndex: 150,
  },
  estadoBadgeOverlayConDestacado: {
    top: Platform.OS === 'ios' ? 50 : 50,
  },
  estadoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.headerText,
  },
  estadoText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.headerText,
  },
  ratingBadgeOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 10 : 10,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    zIndex: 150,
  },
  ratingTextOverlay: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  favoritoButtonOverlay: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 200,
  },
  favoritoBackgroundOverlay: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galeriaContainer: {
    paddingVertical: 16,
    paddingLeft: 20,
  },
  galeriaScroll: {
    paddingRight: 20,
  },
  galeriaImageWrapper: {
    marginRight: 12,
  },
  galeriaImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: colors.cardBorder,
  },
  content: {
    flex: 1,
  },
  mainInfo: {
    padding: 20,
    backgroundColor: colors.cardBackground,
  },
  nombre: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  estadoAbierto: {
    backgroundColor: '#22C55E',
  },
  estadoCerrado: {
    backgroundColor: '#EF4444',
  },
  direccionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    gap: 8,
  },
  direccionText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  descripcion: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
    marginTop: 16,
  },
  section: {
    padding: 20,
    backgroundColor: colors.cardBackground,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
  },
  actionButtonSecondary: {
    backgroundColor: colors.secondary,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.headerText,
  },
  horariosContainer: {
    gap: 12,
  },
  horarioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  horarioRowActual: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  horarioDia: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    width: 100,
  },
  horarioDiaActual: {
    color: colors.primary,
    fontWeight: '700',
  },
  horarioHoras: {
    flex: 1,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  horarioHorasActual: {
    color: colors.primary,
    fontWeight: '600',
  },
  serviciosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  servicioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  servicioText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  ambienteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ambienteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  ambienteText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  reviewsContainer: {
    gap: 16,
  },
  reviewCard: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  reviewHeaderInfo: {
    flex: 1,
  },
  reviewAuthor: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  reviewDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewRatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.badgeDestacado,
  },
  reviewText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  reviewTextCollapsed: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  leerMasButton: {
    marginTop: 8,
  },
  leerMasText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  verMasButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    marginTop: 12,
    gap: 6,
  },
  verMasButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  escribirReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  escribirReviewButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.headerText,
  },
  analisisCard: {
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  analisisTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  analisisText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  palabrasClaveContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  palabraClaveBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  palabraClaveText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.headerText,
  },
  cocinaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cocinaBadge: {
    backgroundColor: colors.badgeDestacado + '20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cocinaText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.badgeDestacado,
  },
  categoriasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  categoriaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoriaIcon: {
    fontSize: 14,
  },
  categoriaText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'capitalize',
  },
  noDataText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  starButton: {
    padding: 4,
  },
  reviewInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.headerText,
  },
  barliveReviewBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  barliveReviewBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.headerText,
  },
  salaVirtualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
  },
  salaVirtualButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.headerText,
  },
});

export default function DetalleLocalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [local, setLocal] = useState<any>(null);
  const [loading, setLoading] = useState(false); // Changed to false - show cached data immediately
  const [mostrarTodasReviews, setMostrarTodasReviews] = useState(false);
  const [mostrarModalReview, setMostrarModalReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTexto, setReviewTexto] = useState('');
  const [enviandoReview, setEnviandoReview] = useState(false);
  const [reviewsBarlive, setReviewsBarlive] = useState<any[]>([]);
  const [isFavorito, setIsFavorito] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  const [expandedReviews, setExpandedReviews] = useState<Set<number>>(new Set());

  // Define functions BEFORE useEffect
  const cargarLocal = async () => {
    try {
      // Try to get cached data first - INSTANT LOAD
      const cachedData = localPreloader.getCached(params.id as string);
      if (cachedData) {
        console.log('[DetalleLocal] Using cached data - INSTANT LOAD');
        setLocal(cachedData);
        // Load reviews in background
        cargarReviewsBarlive();
        return;
      }

      // If no cache, load from Supabase
      setLoading(true);
      const { data, error } = await supabase
        .from('locales')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) {
        console.error('[DetalleLocal] Error loading local:', error);
        return;
      }

      console.log('[DetalleLocal] Loaded local from Supabase:', data);
      setLocal(data);
      setLoading(false);
    } catch (error) {
      console.error('[DetalleLocal] Error:', error);
      setLoading(false);
    }
  };

  const cargarReviewsBarlive = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews_barlive')
        .select(`
          *,
          usuario:usuarios(id, nombre, username, avatar)
        `)
        .eq('local_id', params.id)
        .order('fecha', { ascending: false });

      if (error) {
        console.error('[DetalleLocal] Error loading Barlive reviews:', error);
        return;
      }

      setReviewsBarlive(data || []);
    } catch (error) {
      console.error('[DetalleLocal] Error:', error);
    }
  };

  // Now useEffect can reference the functions
  useEffect(() => {
    if (params.id) {
      cargarLocal();
    }
  }, [params.id]);

  const handleEnviarReview = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para escribir una reseña');
      return;
    }

    if (!reviewTexto.trim()) {
      Alert.alert('Error', 'Por favor escribe tu reseña');
      return;
    }

    try {
      setEnviandoReview(true);

      const { error } = await supabase
        .from('reviews_barlive')
        .upsert({
          local_id: params.id,
          usuario_id: user.id,
          rating: reviewRating,
          texto: reviewTexto.trim(),
        });

      if (error) {
        console.error('[DetalleLocal] Error saving review:', error);
        Alert.alert('Error', 'No se pudo guardar la reseña');
        return;
      }

      Alert.alert('¡Éxito!', 'Tu reseña ha sido publicada');
      setMostrarModalReview(false);
      setReviewTexto('');
      setReviewRating(5);
      cargarReviewsBarlive();
    } catch (error) {
      console.error('[DetalleLocal] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al guardar la reseña');
    } finally {
      setEnviandoReview(false);
    }
  };

  const handleComoLlegar = () => {
    if (local?.latitud && local?.longitud) {
      const url = Platform.select({
        ios: `maps://app?daddr=${local.latitud},${local.longitud}`,
        android: `google.navigation:q=${local.latitud},${local.longitud}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${local.latitud},${local.longitud}`,
      });
      Linking.openURL(url);
    }
  };

  const handleLlamar = () => {
    if (local?.telefono) {
      Linking.openURL(`tel:${local.telefono}`);
    }
  };

  const handleWeb = () => {
    if (local?.website) {
      Linking.openURL(local.website);
    }
  };

  const toggleFavorito = () => {
    setIsFavorito(!isFavorito);
  };

  const handleImagePress = (index: number) => {
    setGalleryInitialIndex(index);
    setShowGalleryModal(true);
  };

  const toggleReviewExpanded = (index: number) => {
    const newExpanded = new Set(expandedReviews);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedReviews(newExpanded);
  };

  const formatServiceName = (key: string): string => {
    const names: Record<string, string> = {
      cerveza: '🍺 Cerveza',
      vino: '🍷 Vino',
      cocteles: '🍸 Cócteles',
      cafe: '☕ Café',
      comida: '🍽️ Comida',
      terraza_exterior: '☀️ Terraza',
      wifi_gratis: '📶 WiFi Gratis',
      reservas: '📅 Reservas',
      delivery: '🚚 Delivery',
      parking: '🅿️ Parking',
      musica_vivo: '🎵 Música en Vivo',
      dj: '🎧 DJ',
      deportes_tv: '📺 Deportes TV',
      desayuno: '🌅 Desayuno',
      almuerzo: '🍴 Almuerzo',
      cena: '🌙 Cena',
      para_llevar: '🥡 Para Llevar',
      entrega_domicilio: '🛵 Entrega a Domicilio',
      pago_tarjetas: '💳 Tarjetas',
      pago_efectivo: '💵 Efectivo',
      accesible_silla_ruedas: '♿ Accesible',
      comida_vegetariana: '🥗 Vegetariano',
      opciones_veganas: '🌱 Vegano',
      sin_gluten: '🌾 Sin Gluten',
    };
    return names[key] || key.replace(/_/g, ' ');
  };

  const formatAmbienteName = (key: string): string => {
    const names: Record<string, string> = {
      acogedor: '🏠 Acogedor',
      romantico: '💕 Romántico',
      elegante: '✨ Elegante',
      moderno: '🎨 Moderno',
      de_moda: '🔥 De Moda',
      animado: '🎉 Animado',
      juvenil: '👥 Juvenil',
      tranquilo: '😌 Tranquilo',
      familiar: '👨‍👩‍👧‍👦 Familiar',
      tematico: '🎭 Temático',
    };
    return names[key] || key.replace(/_/g, ' ');
  };

  const formatClientelaName = (key: string): string => {
    const names: Record<string, string> = {
      grupos: '👥 Grupos',
      turistas: '🧳 Turistas',
      familias: '👨‍👩‍👧‍👦 Familias',
      ninos_bienvenidos: '👶 Niños Bienvenidos',
      estudiantes: '🎓 Estudiantes',
      lgtbi_friendly: '🏳️‍🌈 LGTBI Friendly',
      parejas: '💑 Parejas',
    };
    return names[key] || key.replace(/_/g, ' ');
  };

  const getCurrentDayName = (): string => {
    if (!local) return '';
    
    // Use the logical day from getEstadoLocal
    const estado = getEstadoLocal(local);
    return estado.diaLogico || '';
  };

  const getBadgeColor = (): string => {
    if (!local) return '#9CA3AF';
    
    const estado = getEstadoLocal(local);
    
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

  const getOverlayIcon = () => {
    if (!local) return null;
    
    const estado = getEstadoLocal(local);
    
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
    // ALWAYS return white for the lock icon
    return '#FFFFFF';
  };

  const shouldDimImage = () => {
    if (!local) return false;
    
    const estado = getEstadoLocal(local);
    return estado.estaAbierto === false || estado.estaAbierto === null;
  };

  const getBadgeText = () => {
    if (!local) return '';
    
    const estado = getEstadoLocal(local);
    
    // For 24h locals, just show "Abierto 24h" without time remaining
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

  // Show loading only if no data at all
  if (loading && !local) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!local) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.noDataText}>Local no encontrado</Text>
      </View>
    );
  }

  const serviciosDisponibles = local.servicios_disponibles || {};
  const ambienteCompleto = local.ambiente_completo || {};
  const clientela = local.clientela || {};
  const metodosPago = local.metodos_pago_completos || {};
  const analisisReviews = local.analisis_reviews || {};
  const reviewsGoogle = local.reviews_google || [];
  const horariosCompletos = local.horarios_completos || {};
  const tiposCocina = local.tipos_cocina || [];
  const galeriaUrls = local.galeria_urls || [];
  const isDestacado = local.destacado || false;

  // Filter out unwanted categories
  const CATEGORIAS_EXCLUIDAS = ['terrazas', 'rooftops', 'lounge'];
  let categoriasLocal = local.barlive_types || [];
  if (categoriasLocal.length === 0 && local.barlive_type) {
    categoriasLocal = [local.barlive_type];
  }
  // Filter out excluded categories (case-insensitive)
  categoriasLocal = categoriasLocal.filter((cat: string) => 
    !CATEGORIAS_EXCLUIDAS.includes(cat.toLowerCase())
  );

  const serviciosActivos = Object.entries(serviciosDisponibles)
    .filter(([_, value]) => value === true)
    .map(([key]) => key);

  const ambienteActivo = Object.entries(ambienteCompleto)
    .filter(([_, value]) => value === true)
    .map(([key]) => key);

  const clientelaActiva = Object.entries(clientela)
    .filter(([key, value]) => value === true && key !== 'locales')
    .map(([key]) => key);

  const estado = getEstadoLocal(local);
  const isOpen = estado.estaAbierto === true;

  const todasLasReviews = [
    ...reviewsBarlive.map(r => ({
      ...r,
      source: 'barlive',
      author_name: r.usuario?.username || r.usuario?.nombre || 'Usuario',
      author_avatar: r.usuario?.avatar,
    })),
    ...reviewsGoogle.map((r: any) => ({
      ...r,
      source: 'google',
      author_name: 'Cliente del local',
      author_avatar: null,
    })),
  ].sort((a, b) => {
    const dateA = a.fecha ? new Date(a.fecha).getTime() : a.time * 1000;
    const dateB = b.fecha ? new Date(b.fecha).getTime() : b.time * 1000;
    return dateB - dateA;
  });

  const reviewsAMostrar = mostrarTodasReviews ? todasLasReviews : todasLasReviews.slice(0, 2);

  const totalRating = reviewsBarlive.reduce((sum, r) => sum + r.rating, 0) + 
                      reviewsGoogle.reduce((sum: number, r: any) => sum + r.rating, 0);
  const totalReviews = reviewsBarlive.length + reviewsGoogle.length;
  const ratingCombinado = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : local.google_rating;

  const currentDay = getCurrentDayName();
  const overlayIcon = getOverlayIcon();

  // Ordenar los días de la semana empezando por el día LÓGICO actual
  const diasOrdenados = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const currentDayIndex = diasOrdenados.indexOf(currentDay);
  const diasReordenados = currentDayIndex >= 0 ? [
    ...diasOrdenados.slice(currentDayIndex),
    ...diasOrdenados.slice(0, currentDayIndex)
  ] : diasOrdenados;

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Imagen con overlays */}
        <View style={styles.imageContainer}>
          {local.imagen_url ? (
            <Image source={{ uri: local.imagen_url }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, { backgroundColor: colors.cardBorder, justifyContent: 'center', alignItems: 'center' }]}>
              <IconSymbol name="photo" size={64} color={colors.textSecondary} />
            </View>
          )}

          {/* Dimmed overlay for closed/no info locals */}
          {shouldDimImage() && (
            <View style={styles.dimmedOverlay} />
          )}

          {/* Overlay icon (lock, question mark, or clock) - CENTERED with proper color */}
          {overlayIcon && (
            <View style={styles.overlayIconContainer}>
              <IconSymbol name={overlayIcon} size={80} color={getOverlayIconColor()} />
            </View>
          )}

          {/* Header Buttons - z-index 100 */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
              <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={() => console.log('Share')}>
              <IconSymbol name="square.and.arrow.up" size={24} color={colors.headerText} />
            </TouchableOpacity>
          </View>

          {/* Badge "Destacado" - Esquina superior izquierda ARRIBA del botón volver - z-index 151 */}
          {isDestacado && (
            <View style={styles.badgeDestacadoOverlay}>
              <IconSymbol name="star.fill" size={14} color="#92400E" />
              <Text style={styles.badgeDestacadoText}>Destacado</Text>
            </View>
          )}

          {/* Estado (tiempo) - Debajo del badge destacado o en la esquina superior izquierda - z-index 150 */}
          <View style={[
            styles.estadoBadgeOverlay,
            { backgroundColor: getBadgeColor() },
            isDestacado && styles.estadoBadgeOverlayConDestacado
          ]}>
            <View style={styles.estadoDot} />
            <Text style={styles.estadoText}>{getBadgeText()}</Text>
          </View>

          {/* Valoración - Esquina superior derecha ARRIBA del botón compartir - z-index 150 */}
          {ratingCombinado && (
            <View style={styles.ratingBadgeOverlay}>
              <IconSymbol name="star.fill" size={16} color={colors.badgeDestacado} />
              <Text style={styles.ratingTextOverlay}>{ratingCombinado}</Text>
            </View>
          )}

          {/* Botón favorito - Esquina inferior derecha */}
          <TouchableOpacity
            style={styles.favoritoButtonOverlay}
            onPress={toggleFavorito}
            activeOpacity={0.8}
          >
            <View style={styles.favoritoBackgroundOverlay}>
              <IconSymbol
                name={isFavorito ? 'heart.fill' : 'heart'}
                size={24}
                color={isFavorito ? colors.badgeNuevo : colors.headerText}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Mini Galería */}
        {galeriaUrls.length > 0 && (
          <View style={styles.galeriaContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galeriaScroll}>
              {galeriaUrls.map((url: string, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={styles.galeriaImageWrapper}
                  onPress={() => handleImagePress(index)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: url }}
                    style={styles.galeriaImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Información Principal */}
        <View style={styles.mainInfo}>
          <Text style={styles.nombre}>{local.nombre}</Text>

          {/* Categorías del local */}
          {categoriasLocal.length > 0 && (
            <View style={styles.categoriasContainer}>
              {categoriasLocal.map((categoria: string, index: number) => (
                <View key={index} style={styles.categoriaBadge}>
                  <Text style={styles.categoriaIcon}>{getCategoryIcon(categoria)}</Text>
                  <Text style={styles.categoriaText}>{categoria}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Dirección */}
          {local.direccion && (
            <View style={styles.direccionContainer}>
              <IconSymbol name="mappin" size={20} color={colors.primary} />
              <Text style={styles.direccionText}>{local.direccion}</Text>
            </View>
          )}

          {/* Descripción */}
          {local.descripcion_google && (
            <Text style={styles.descripcion}>{local.descripcion_google}</Text>
          )}

          {/* Botones de Acción */}
          <View style={styles.actionButtons}>
            {local.telefono && (
              <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]} onPress={handleLlamar}>
                <IconSymbol name="phone.fill" size={20} color={colors.headerText} />
                <Text style={styles.actionButtonText}>Llamar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]} onPress={handleComoLlegar}>
              <IconSymbol name="map.fill" size={20} color={colors.headerText} />
              <Text style={styles.actionButtonText}>Cómo llegar</Text>
            </TouchableOpacity>
          </View>

          {local.website && (
            <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary, { marginTop: 12 }]} onPress={handleWeb}>
              <IconSymbol name="globe" size={20} color={colors.headerText} />
              <Text style={styles.actionButtonText}>Visitar Web</Text>
            </TouchableOpacity>
          )}

          {/* Botón Sala Virtual */}
          <TouchableOpacity 
            style={styles.salaVirtualButton}
            onPress={() => router.push(`/detalle/sala-virtual?id=${local.id}`)}
          >
            <IconSymbol name="person.3.fill" size={20} color={colors.headerText} />
            <Text style={styles.salaVirtualButtonText}>Ver Sala Virtual</Text>
          </TouchableOpacity>
        </View>

        {/* Tipos de Cocina */}
        {tiposCocina.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🍴 Tipos de Cocina</Text>
            <View style={styles.cocinaContainer}>
              {tiposCocina.map((cocina: string, index: number) => (
                <View key={index} style={styles.cocinaBadge}>
                  <Text style={styles.cocinaText}>{cocina}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Horarios con día actual destacado - REORDENADOS POR DÍA LÓGICO */}
        {Object.keys(horariosCompletos).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🕐 Horarios</Text>
            <View style={styles.horariosContainer}>
              {diasReordenados.map((dia) => {
                const horas = horariosCompletos[dia];
                if (!horas) return null;
                
                const isCurrentDay = dia === currentDay;
                return (
                  <View 
                    key={dia} 
                    style={[
                      styles.horarioRow,
                      isCurrentDay && styles.horarioRowActual
                    ]}
                  >
                    <Text style={[
                      styles.horarioDia,
                      isCurrentDay && styles.horarioDiaActual
                    ]}>
                      {formatDayName(dia)}
                    </Text>
                    <Text style={[
                      styles.horarioHoras,
                      isCurrentDay && styles.horarioHorasActual
                    ]}>
                      {Array.isArray(horas) ? horas.join(', ') : horas}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Servicios Disponibles */}
        {serviciosActivos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛎️ Servicios Disponibles</Text>
            <View style={styles.serviciosGrid}>
              {serviciosActivos.map((servicio) => (
                <View key={servicio} style={styles.servicioBadge}>
                  <Text style={styles.servicioText}>{formatServiceName(servicio)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Ambiente */}
        {ambienteActivo.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎭 Ambiente</Text>
            <View style={styles.ambienteGrid}>
              {ambienteActivo.map((ambiente) => (
                <View key={ambiente} style={styles.ambienteBadge}>
                  <Text style={styles.ambienteText}>{formatAmbienteName(ambiente)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Clientela */}
        {clientelaActiva.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 Clientela Típica</Text>
            <View style={styles.ambienteGrid}>
              {clientelaActiva.map((cliente) => (
                <View key={cliente} style={styles.ambienteBadge}>
                  <Text style={styles.ambienteText}>{formatClientelaName(cliente)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Análisis de Reviews */}
        {analisisReviews.resumen_automatico && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🧠 Análisis de Reseñas</Text>
            <View style={styles.analisisCard}>
              <Text style={styles.analisisTitle}>
                Sentimiento: {analisisReviews.sentimiento_general}
              </Text>
              <Text style={styles.analisisText}>{analisisReviews.resumen_automatico}</Text>
              
              {analisisReviews.palabras_clave_detectadas && analisisReviews.palabras_clave_detectadas.length > 0 && (
                <View style={styles.palabrasClaveContainer}>
                  {analisisReviews.palabras_clave_detectadas.map((palabra: string, index: number) => (
                    <View key={index} style={styles.palabraClaveBadge}>
                      <Text style={styles.palabraClaveText}>{palabra}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Reseñas */}
        {todasLasReviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⭐ Reseñas</Text>
            
            {user && (
              <TouchableOpacity
                style={styles.escribirReviewButton}
                onPress={() => setMostrarModalReview(true)}
              >
                <IconSymbol name="pencil" size={20} color={colors.headerText} />
                <Text style={styles.escribirReviewButtonText}>Escribir reseña</Text>
              </TouchableOpacity>
            )}

            <View style={styles.reviewsContainer}>
              {reviewsAMostrar.map((review: any, index: number) => {
                const reviewText = review.texto || review.text || '';
                const isLongReview = reviewText.length > 200;
                const isExpanded = expandedReviews.has(index);
                const displayText = isLongReview && !isExpanded 
                  ? reviewText.substring(0, 200) + '...' 
                  : reviewText;

                return (
                  <View key={index} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewAvatar}>
                        {review.author_avatar ? (
                          <Image source={{ uri: review.author_avatar }} style={styles.reviewAvatarImage} />
                        ) : (
                          <IconSymbol name="person.fill" size={20} color={colors.textSecondary} />
                        )}
                      </View>
                      <View style={styles.reviewHeaderInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.reviewAuthor}>{review.author_name}</Text>
                          {review.source === 'barlive' && (
                            <View style={styles.barliveReviewBadge}>
                              <Text style={styles.barliveReviewBadgeText}>BARLIVE</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.reviewDate}>
                          {review.fecha 
                            ? new Date(review.fecha).toLocaleDateString('es-ES')
                            : review.relative_time_description || 'Hace tiempo'
                          }
                        </Text>
                      </View>
                      <View style={styles.reviewRating}>
                        <IconSymbol name="star.fill" size={14} color={colors.badgeDestacado} />
                        <Text style={styles.reviewRatingText}>{review.rating}</Text>
                      </View>
                    </View>
                    <Text style={styles.reviewText}>{displayText}</Text>
                    {isLongReview && (
                      <TouchableOpacity 
                        style={styles.leerMasButton}
                        onPress={() => toggleReviewExpanded(index)}
                      >
                        <Text style={styles.leerMasText}>
                          {isExpanded ? 'Leer menos' : 'Leer más'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>

            {todasLasReviews.length > 2 && (
              <TouchableOpacity
                style={styles.verMasButton}
                onPress={() => setMostrarTodasReviews(!mostrarTodasReviews)}
              >
                <Text style={styles.verMasButtonText}>
                  {mostrarTodasReviews ? 'Ver menos' : `Ver más (${todasLasReviews.length - 2} más)`}
                </Text>
                <IconSymbol
                  name={mostrarTodasReviews ? 'chevron.up' : 'chevron.down'}
                  size={16}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal para escribir reseña */}
      <Modal
        visible={mostrarModalReview}
        transparent
        animationType="slide"
        onRequestClose={() => setMostrarModalReview(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Escribir reseña</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setMostrarModalReview(false)}
              >
                <IconSymbol name="xmark" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.ratingSelector}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  style={styles.starButton}
                  onPress={() => setReviewRating(star)}
                >
                  <IconSymbol
                    name={star <= reviewRating ? 'star.fill' : 'star'}
                    size={32}
                    color={colors.badgeDestacado}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Escribe tu reseña aquí..."
              placeholderTextColor={colors.textSecondary}
              value={reviewTexto}
              onChangeText={setReviewTexto}
              multiline
              numberOfLines={6}
            />

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleEnviarReview}
              disabled={enviandoReview}
            >
              {enviandoReview ? (
                <ActivityIndicator color={colors.headerText} />
              ) : (
                <Text style={styles.submitButtonText}>Publicar reseña</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de galería de imágenes */}
      <ImageGalleryModal
        visible={showGalleryModal}
        images={galeriaUrls}
        initialIndex={galleryInitialIndex}
        onClose={() => setShowGalleryModal(false)}
      />
    </View>
  );
}
