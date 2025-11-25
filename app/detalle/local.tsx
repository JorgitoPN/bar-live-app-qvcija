
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import { localPreloader } from '@/utils/localPreloader';
import ImageGalleryModal from '@/components/detalle/ImageGalleryModal';
import { calcularTiempoHasta, formatDayName } from '@/utils/timeUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Local {
  id: string;
  nombre: string;
  descripcion?: string;
  descripcion_google?: string;
  direccion?: string;
  telefono?: string;
  telefono_internacional?: string;
  email?: string;
  website?: string;
  horarios_completos?: any;
  horarios_texto?: string[];
  estado_actual?: string;
  tipo?: string;
  barlive_type?: string;
  barlive_types?: string[];
  precio_medio?: number;
  nivel_precio_google?: number;
  rango_precios?: string;
  rating?: number;
  google_rating?: number;
  google_user_ratings_total?: number;
  latitud?: number;
  longitud?: number;
  imagen_url?: string;
  galeria_urls?: string[];
  servicios?: string[];
  servicios_disponibles?: any;
  ambiente?: string[];
  ambiente_completo?: any;
  musica?: string[];
  musica_principal?: string;
  tipos_cocina?: string[];
  clientela?: any;
  metodos_pago_completos?: any;
  analisis_reviews?: any;
  reviews_google?: any[];
  created_at?: string;
  updated_at?: string;
}

interface Review {
  id: string;
  usuario_id: string;
  local_id: string;
  rating: number;
  texto?: string;
  fecha?: string;
  created_at: string;
  usuario?: {
    nombre: string;
    username: string;
    avatar?: string;
  };
}

export default function DetalleLocalScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [local, setLocal] = useState<Local | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const cargarReviewsBarlive = useCallback(async () => {
    if (!params.id) {
      console.log('[DetalleLocal] No local ID provided');
      return;
    }

    setLoadingReviews(true);
    try {
      const { data, error } = await supabase
        .from('reviews_barlive')
        .select(`
          *,
          usuario:usuarios(nombre, username, avatar)
        `)
        .eq('local_id', params.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('[DetalleLocal] Error loading reviews:', error);
        return;
      }

      console.log('[DetalleLocal] Loaded reviews:', data?.length || 0);
      setReviews(data || []);
    } catch (error) {
      console.error('[DetalleLocal] Error:', error);
    } finally {
      setLoadingReviews(false);
    }
  }, [params.id]);

  const cargarLocal = useCallback(async () => {
    if (!params.id) {
      console.log('[DetalleLocal] No local ID provided');
      setLoading(false);
      return;
    }

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
    cargarLocal();
  }, [cargarLocal]);

  useEffect(() => {
    if (user && params.id) {
      checkFavorite();
    }
  }, [user, params.id]);

  const checkFavorite = async () => {
    if (!user || !params.id) return;

    try {
      const { data, error } = await supabase
        .from('locales_favoritos')
        .select('id')
        .eq('usuario_id', user.id)
        .eq('local_id', params.id)
        .single();

      setIsFavorite(!!data);
    } catch (error) {
      console.log('[DetalleLocal] Not a favorite');
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para guardar favoritos');
      return;
    }

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('locales_favoritos')
          .delete()
          .eq('usuario_id', user.id)
          .eq('local_id', params.id);

        if (error) {
          console.error('[DetalleLocal] Error removing favorite:', error);
          Alert.alert('Error', 'No se pudo eliminar de favoritos');
          return;
        }

        setIsFavorite(false);
        Alert.alert('Éxito', 'Eliminado de favoritos');
      } else {
        const { error } = await supabase
          .from('locales_favoritos')
          .insert({
            usuario_id: user.id,
            local_id: params.id,
          });

        if (error) {
          console.error('[DetalleLocal] Error adding favorite:', error);
          Alert.alert('Error', 'No se pudo agregar a favoritos');
          return;
        }

        setIsFavorite(true);
        Alert.alert('Éxito', 'Agregado a favoritos');
      }
    } catch (error) {
      console.error('[DetalleLocal] Error:', error);
      Alert.alert('Error', 'Ocurrió un error');
    }
  };

  const handleCall = () => {
    if (!local?.telefono && !local?.telefono_internacional) {
      Alert.alert('Error', 'No hay número de teléfono disponible');
      return;
    }

    const phoneNumber = (local.telefono_internacional || local.telefono || '').replace(/\s/g, '');
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleEmail = () => {
    if (!local?.email) {
      Alert.alert('Error', 'No hay email disponible');
      return;
    }

    Linking.openURL(`mailto:${local.email}`);
  };

  const handleWebsite = () => {
    if (!local?.website) {
      Alert.alert('Error', 'No hay sitio web disponible');
      return;
    }

    Linking.openURL(local.website);
  };

  const handleShare = async () => {
    if (!local) return;

    try {
      await Share.share({
        message: `¡Mira este lugar! ${local.nombre} - ${local.direccion || ''}`,
        title: local.nombre,
      });
    } catch (error) {
      console.error('[DetalleLocal] Error sharing:', error);
    }
  };

  const handleImagePress = (index: number) => {
    setSelectedImageIndex(index);
    setShowGallery(true);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!local) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No se encontró el local</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const allImages = [local.imagen_url, ...(local.galeria_urls || [])].filter(Boolean) as string[];
  const displayRating = local.google_rating || local.rating || 0;
  const displayRatingCount = local.google_user_ratings_total || 0;
  const descripcionTexto = local.descripcion_google || local.descripcion || '';
  
  // Calculate opening status
  const tiempoEstado = local.horarios_completos ? calcularTiempoHasta(local.horarios_completos, local.estado_actual) : '';
  const isOpen = local.estado_actual === 'abierto_ahora';

  // Parse JSONB fields
  const serviciosDisponibles = local.servicios_disponibles || {};
  const ambienteCompleto = local.ambiente_completo || {};
  const clientela = local.clientela || {};
  const metodosPago = local.metodos_pago_completos || {};

  // Get active services
  const serviciosActivos = Object.entries(serviciosDisponibles)
    .filter(([_, value]) => value === true)
    .map(([key]) => key);

  // Get active ambiente attributes
  const ambienteActivo = Object.entries(ambienteCompleto)
    .filter(([_, value]) => value === true)
    .map(([key]) => key);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {local.imagen_url && (
          <TouchableOpacity onPress={() => handleImagePress(0)}>
            <Image source={{ uri: local.imagen_url }} style={styles.headerImage} />
          </TouchableOpacity>
        )}

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButtonCircle}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerActionsRight}>
            <TouchableOpacity onPress={handleShare} style={styles.actionButtonCircle}>
              <IconSymbol ios_icon_name="square.and.arrow.up" android_material_icon_name="share-social" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleFavorite} style={styles.actionButtonCircle}>
              <IconSymbol
                ios_icon_name={isFavorite ? "heart.fill" : "heart"}
                android_material_icon_name={isFavorite ? "heart" : "heart-outline"}
                size={24}
                color={isFavorite ? colors.error : colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{local.nombre}</Text>

          {(local.barlive_type || local.tipo) && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{local.barlive_type || local.tipo}</Text>
            </View>
          )}

          {displayRating > 0 && (
            <View style={styles.ratingContainer}>
              <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={20} color={colors.warning} />
              <Text style={styles.ratingText}>
                {Number(displayRating).toFixed(1)} ({displayRatingCount} valoraciones)
              </Text>
            </View>
          )}

          {tiempoEstado && (
            <View style={[styles.estadoBadge, isOpen ? styles.estadoAbierto : styles.estadoCerrado]}>
              <View style={styles.estadoDot} />
              <Text style={styles.estadoText}>{tiempoEstado}</Text>
            </View>
          )}

          {descripcionTexto && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Descripción</Text>
              <Text style={styles.description}>{descripcionTexto}</Text>
            </View>
          )}

          {local.direccion && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dirección</Text>
              <View style={styles.direccionContainer}>
                <IconSymbol ios_icon_name="mappin" android_material_icon_name="pin" size={20} color={colors.primary} />
                <Text style={styles.infoText}>{local.direccion}</Text>
              </View>
            </View>
          )}

          {local.horarios_completos && Object.keys(local.horarios_completos).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Horario</Text>
              <View style={styles.horariosContainer}>
                {Object.entries(local.horarios_completos).map(([dia, horas]: [string, any]) => (
                  <View key={dia} style={styles.horarioRow}>
                    <Text style={styles.horarioDia}>{formatDayName(dia)}</Text>
                    <Text style={styles.horarioHoras}>
                      {Array.isArray(horas) ? horas.join(', ') : horas}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.contactButtons}>
            {(local.telefono || local.telefono_internacional) && (
              <TouchableOpacity onPress={handleCall} style={styles.contactButton}>
                <IconSymbol ios_icon_name="phone.fill" android_material_icon_name="call" size={20} color={colors.background} />
                <Text style={styles.contactButtonText}>Llamar</Text>
              </TouchableOpacity>
            )}
            {local.latitud && local.longitud && (
              <TouchableOpacity onPress={handleComoLlegar} style={styles.contactButton}>
                <IconSymbol ios_icon_name="map.fill" android_material_icon_name="map" size={20} color={colors.background} />
                <Text style={styles.contactButtonText}>Cómo llegar</Text>
              </TouchableOpacity>
            )}
            {local.email && (
              <TouchableOpacity onPress={handleEmail} style={styles.contactButton}>
                <IconSymbol ios_icon_name="envelope.fill" android_material_icon_name="mail" size={20} color={colors.background} />
                <Text style={styles.contactButtonText}>Email</Text>
              </TouchableOpacity>
            )}
            {local.website && (
              <TouchableOpacity onPress={handleWebsite} style={styles.contactButton}>
                <IconSymbol ios_icon_name="globe" android_material_icon_name="globe" size={20} color={colors.background} />
                <Text style={styles.contactButtonText}>Web</Text>
              </TouchableOpacity>
            )}
          </View>

          {local.tipos_cocina && local.tipos_cocina.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tipos de Cocina</Text>
              <View style={styles.tagsContainer}>
                {local.tipos_cocina.map((cocina, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{cocina}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {serviciosActivos.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Servicios</Text>
              <View style={styles.tagsContainer}>
                {serviciosActivos.map((servicio, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{servicio.replace(/_/g, ' ')}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {ambienteActivo.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ambiente</Text>
              <View style={styles.tagsContainer}>
                {ambienteActivo.map((ambiente, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{ambiente.replace(/_/g, ' ')}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {local.galeria_urls && local.galeria_urls.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Galería</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
                {local.galeria_urls.map((img, index) => (
                  <TouchableOpacity key={index} onPress={() => handleImagePress(index + 1)}>
                    <Image source={{ uri: img }} style={styles.galleryImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {reviews.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reseñas</Text>
              {reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Image
                      source={{ uri: review.usuario?.avatar || 'https://via.placeholder.com/40' }}
                      style={styles.reviewAvatar}
                    />
                    <View style={styles.reviewHeaderText}>
                      <Text style={styles.reviewUsername}>{review.usuario?.username || 'Usuario'}</Text>
                      <View style={styles.reviewRating}>
                        {[...Array(5)].map((_, i) => (
                          <IconSymbol
                            key={i}
                            ios_icon_name={i < review.rating ? "star.fill" : "star"}
                            android_material_icon_name={i < review.rating ? "star" : "star-outline"}
                            size={16}
                            color={colors.warning}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                  {review.texto && (
                    <Text style={styles.reviewComment}>{review.texto}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {showGallery && (
        <ImageGalleryModal
          visible={showGallery}
          images={allImages}
          initialIndex={selectedImageIndex}
          onClose={() => setShowGallery(false)}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: colors.text,
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  headerImage: {
    width: SCREEN_WIDTH,
    height: 300,
    resizeMode: 'cover',
  },
  headerActions: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionsRight: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.primary,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.background,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 16,
  },
  estadoAbierto: {
    backgroundColor: '#22C55E',
  },
  estadoCerrado: {
    backgroundColor: '#EF4444',
  },
  estadoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.headerText,
  },
  estadoText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  direccionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  horariosContainer: {
    gap: 8,
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
    width: 100,
  },
  horarioHoras: {
    flex: 1,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  contactButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  contactButton: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  gallery: {
    marginTop: 8,
  },
  galleryImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 12,
  },
  reviewCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  reviewHeaderText: {
    flex: 1,
  },
  reviewUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
});
