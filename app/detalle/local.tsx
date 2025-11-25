
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  num_valoraciones?: number;
  latitud?: number;
  longitud?: number;
  imagen_principal?: string;
  imagenes?: string[];
  servicios?: string[];
  ambiente?: string[];
  musica?: string[];
  created_at?: string;
  updated_at?: string;
}

interface Review {
  id: string;
  usuario_id: string;
  local_id: string;
  valoracion: number;
  comentario?: string;
  created_at: string;
  usuario?: {
    nombre: string;
    username: string;
    avatar_url?: string;
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

  // ✅ FIXED: Moved useCallback inside component and added cargarReviewsBarlive to dependencies
  const cargarReviewsBarlive = useCallback(async () => {
    if (!params.id) {
      console.log('[DetalleLocal] No local ID provided');
      return;
    }

    setLoadingReviews(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          usuario:usuarios(nombre, username, avatar_url)
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
    try {
      const cachedData = localPreloader.getCached(params.id as string);
      if (cachedData) {
        console.log('[DetalleLocal] Using cached data - INSTANT LOAD');
        setLocal(cachedData);
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
    if (!local?.telefono) {
      Alert.alert('Error', 'No hay número de teléfono disponible');
      return;
    }

    const phoneNumber = local.telefono.replace(/\s/g, '');
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
    if (!local?.web) {
      Alert.alert('Error', 'No hay sitio web disponible');
      return;
    }

    Linking.openURL(local.web);
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

  const allImages = [local.imagen_principal, ...(local.imagenes || [])].filter(Boolean) as string[];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {local.imagen_principal && (
          <TouchableOpacity onPress={() => handleImagePress(0)}>
            <Image source={{ uri: local.imagen_principal }} style={styles.headerImage} />
          </TouchableOpacity>
        )}

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButtonCircle}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerActionsRight}>
            <TouchableOpacity onPress={handleShare} style={styles.actionButtonCircle}>
              <IconSymbol ios_icon_name="square.and.arrow.up" android_material_icon_name="share" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleFavorite} style={styles.actionButtonCircle}>
              <IconSymbol
                ios_icon_name={isFavorite ? "heart.fill" : "heart"}
                android_material_icon_name={isFavorite ? "favorite" : "favorite_border"}
                size={24}
                color={isFavorite ? colors.error : colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{local.nombre}</Text>

          {local.categoria && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{local.categoria}</Text>
            </View>
          )}

          {local.valoracion && (
            <View style={styles.ratingContainer}>
              <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={20} color={colors.warning} />
              <Text style={styles.ratingText}>
                {local.valoracion.toFixed(1)} ({local.num_valoraciones || 0} valoraciones)
              </Text>
            </View>
          )}

          {local.descripcion && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Descripción</Text>
              <Text style={styles.description}>{local.descripcion}</Text>
            </View>
          )}

          {local.direccion && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dirección</Text>
              <Text style={styles.infoText}>{local.direccion}</Text>
            </View>
          )}

          {local.horario && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Horario</Text>
              <Text style={styles.infoText}>{local.horario}</Text>
            </View>
          )}

          <View style={styles.contactButtons}>
            {local.telefono && (
              <TouchableOpacity onPress={handleCall} style={styles.contactButton}>
                <IconSymbol ios_icon_name="phone.fill" android_material_icon_name="phone" size={20} color={colors.background} />
                <Text style={styles.contactButtonText}>Llamar</Text>
              </TouchableOpacity>
            )}
            {local.email && (
              <TouchableOpacity onPress={handleEmail} style={styles.contactButton}>
                <IconSymbol ios_icon_name="envelope.fill" android_material_icon_name="email" size={20} color={colors.background} />
                <Text style={styles.contactButtonText}>Email</Text>
              </TouchableOpacity>
            )}
            {local.web && (
              <TouchableOpacity onPress={handleWebsite} style={styles.contactButton}>
                <IconSymbol ios_icon_name="globe" android_material_icon_name="language" size={20} color={colors.background} />
                <Text style={styles.contactButtonText}>Web</Text>
              </TouchableOpacity>
            )}
          </View>

          {local.imagenes && local.imagenes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Galería</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
                {local.imagenes.map((img, index) => (
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
                      source={{ uri: review.usuario?.avatar_url || 'https://via.placeholder.com/40' }}
                      style={styles.reviewAvatar}
                    />
                    <View style={styles.reviewHeaderText}>
                      <Text style={styles.reviewUsername}>{review.usuario?.username || 'Usuario'}</Text>
                      <View style={styles.reviewRating}>
                        {[...Array(5)].map((_, i) => (
                          <IconSymbol
                            key={i}
                            ios_icon_name={i < review.valoracion ? "star.fill" : "star"}
                            android_material_icon_name={i < review.valoracion ? "star" : "star_border"}
                            size={16}
                            color={colors.warning}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                  {review.comentario && (
                    <Text style={styles.reviewComment}>{review.comentario}</Text>
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
  infoText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  contactButton: {
    flex: 1,
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
