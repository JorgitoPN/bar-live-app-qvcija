
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../integrations/supabase/client';
import { colors } from '../../styles/commonStyles';
import { localPreloader } from '../../utils/localPreloader';
import OptimizedImage from '../../components/common/OptimizedImage';

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

  const cargarReviewsBarlive = useCallback(async () => {
    try {
      setLoadingReviews(true);
      // ✅ FIXED: Changed from 'reviews' to 'reviews_barlive'
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header Image */}
      {local.foto_principal && (
        <OptimizedImage
          source={{ uri: local.foto_principal }}
          style={styles.headerImage}
          resizeMode="cover"
        />
      )}

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleFavorite}>
          <Ionicons name="heart-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title and Rating */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{local.nombre}</Text>
          {local.valoracion && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={20} color={colors.warning} />
              <Text style={styles.rating}>{local.valoracion.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Category */}
        {local.categoria && (
          <View style={styles.categoryContainer}>
            <Text style={styles.category}>{local.categoria}</Text>
            {local.subcategoria && (
              <Text style={styles.subcategory}> • {local.subcategoria}</Text>
            )}
          </View>
        )}

        {/* Description */}
        {local.descripcion && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descripción</Text>
            <Text style={styles.description}>{local.descripcion}</Text>
          </View>
        )}

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de contacto</Text>
          
          {local.direccion && (
            <TouchableOpacity style={styles.infoRow} onPress={handleDirections}>
              <Ionicons name="location-outline" size={24} color={colors.primary} />
              <Text style={styles.infoText}>{local.direccion}</Text>
            </TouchableOpacity>
          )}

          {local.telefono && (
            <TouchableOpacity style={styles.infoRow} onPress={handleCall}>
              <Ionicons name="call-outline" size={24} color={colors.primary} />
              <Text style={styles.infoText}>{local.telefono}</Text>
            </TouchableOpacity>
          )}

          {local.email && (
            <TouchableOpacity style={styles.infoRow} onPress={handleEmail}>
              <Ionicons name="mail-outline" size={24} color={colors.primary} />
              <Text style={styles.infoText}>{local.email}</Text>
            </TouchableOpacity>
          )}

          {local.web && (
            <TouchableOpacity style={styles.infoRow} onPress={handleWebsite}>
              <Ionicons name="globe-outline" size={24} color={colors.primary} />
              <Text style={styles.infoText}>{local.web}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Schedule */}
        {local.horario && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Horario</Text>
            <Text style={styles.infoText}>{local.horario}</Text>
          </View>
        )}

        {/* Services */}
        {local.servicios && local.servicios.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Servicios</Text>
            <View style={styles.servicesContainer}>
              {local.servicios.map((servicio, index) => (
                <View key={index} style={styles.serviceTag}>
                  <Text style={styles.serviceText}>{servicio}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Características</Text>
          <View style={styles.featuresContainer}>
            {local.parking && (
              <View style={styles.featureItem}>
                <Ionicons name="car-outline" size={20} color={colors.primary} />
                <Text style={styles.featureText}>Parking</Text>
              </View>
            )}
            {local.terraza && (
              <View style={styles.featureItem}>
                <Ionicons name="sunny-outline" size={20} color={colors.primary} />
                <Text style={styles.featureText}>Terraza</Text>
              </View>
            )}
            {local.wifi && (
              <View style={styles.featureItem}>
                <Ionicons name="wifi-outline" size={20} color={colors.primary} />
                <Text style={styles.featureText}>WiFi</Text>
              </View>
            )}
            {local.accesibilidad && (
              <View style={styles.featureItem}>
                <Ionicons name="accessibility-outline" size={20} color={colors.primary} />
                <Text style={styles.featureText}>Accesible</Text>
              </View>
            )}
            {local.reservas && (
              <View style={styles.featureItem}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={styles.featureText}>Reservas</Text>
              </View>
            )}
          </View>
        </View>

        {/* Reviews */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reseñas</Text>
          {loadingReviews ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : reviews.length > 0 ? (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewAuthor}>
                    {review.usuario?.nombre || 'Usuario anónimo'}
                  </Text>
                  <View style={styles.reviewRating}>
                    <Ionicons name="star" size={16} color={colors.warning} />
                    <Text style={styles.reviewRatingText}>{review.rating}</Text>
                  </View>
                </View>
                {review.texto && (
                  <Text style={styles.reviewComment}>{review.texto}</Text>
                )}
                <Text style={styles.reviewDate}>
                  {new Date(review.created_at).toLocaleDateString()}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noReviews}>No hay reseñas todavía</Text>
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
    paddingBottom: 100,
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
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerImage: {
    width: '100%',
    height: 300,
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  actionButtons: {
    position: 'absolute',
    top: 48,
    right: 16,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  category: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  subcategory: {
    fontSize: 16,
    color: colors.textSecondary,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary + '20',
    borderRadius: 16,
  },
  serviceText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '45%',
  },
  featureText: {
    fontSize: 14,
    color: colors.text,
  },
  reviewCard: {
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewAuthor: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewRatingText: {
    fontSize: 14,
    fontWeight: '600',
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
  noReviews: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
