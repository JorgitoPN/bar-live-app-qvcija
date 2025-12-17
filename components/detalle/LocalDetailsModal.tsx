
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  TouchableOpacity,
  Platform,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { BlurView } from 'expo-blur';
import { supabase } from '@/utils/supabase';
import OptimizedImage from '@/components/common/OptimizedImage';
import { getEstadoLocal } from '@/utils/timeUtils';
import { CATEGORIAS_EXCLUIDAS } from '@/utils/constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LocalDetailsModalProps {
  visible: boolean;
  localId: string;
  onClose: () => void;
}

interface Local {
  id: string;
  nombre: string;
  descripcion?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  website?: string;
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
  horarios_completos?: Record<string, string[]>;
  estado_actual?: 'abierto_ahora' | 'cerrado_ahora';
  barlive_type?: string;
  barlive_types?: string[];
  destacado?: boolean;
  rating?: number;
  google_rating?: number;
  descripcion_google?: string;
  servicios_disponibles?: Record<string, any>;
  ambiente_completo?: Record<string, boolean>;
  clientela?: Record<string, boolean>;
  metodos_pago_completos?: Record<string, boolean>;
}

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
  };
  return categoryMap[categoria?.toLowerCase() || ''] || { ios: 'mappin.circle.fill', android: 'location_on', color: colors.primary };
};

export default function LocalDetailsModal({
  visible,
  localId,
  onClose,
}: LocalDetailsModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite, loading: loadingFavorite } = useFavorites();
  const [local, setLocal] = useState<Local | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const localIsFavorite = localId ? isFavorite(localId) : false;

  useEffect(() => {
    if (visible && localId) {
      console.log('[LocalDetailsModal] 🚀 Opening modal for local:', localId);
      loadLocalData();
    } else {
      setLocal(null);
      setLoading(true);
      setCurrentImageIndex(0);
    }
  }, [visible, localId]);

  const loadLocalData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('locales')
        .select('*')
        .eq('id', localId)
        .single();

      if (error) throw error;
      console.log('[LocalDetailsModal] ✅ Local loaded:', data?.nombre);
      setLocal(data);
    } catch (error) {
      console.error('[LocalDetailsModal] ❌ Error loading local:', error);
      Alert.alert('Error', 'No se pudo cargar el local');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorito = async (e: any) => {
    e.stopPropagation();
    if (localId) {
      await toggleFavorite(localId);
    }
  };

  const handleCall = () => {
    if (local?.telefono) {
      Linking.openURL(`tel:${local.telefono}`);
    }
  };

  const handleDirections = () => {
    if (local?.latitud && local?.longitud) {
      const url = Platform.select({
        ios: `maps:0,0?q=${local.latitud},${local.longitud}`,
        android: `google.navigation:q=${local.latitud},${local.longitud}`,
        default: `https://www.google.com/maps/search/?api=1&query=${local.latitud},${local.longitud}`
      });
      Linking.openURL(url);
    }
  };

  const handleViewFullDetails = () => {
    onClose();
    setTimeout(() => {
      router.push({ pathname: '/detalle/local', params: { id: localId } });
    }, 300);
  };

  if (!visible) return null;

  const allImages = local ? [
    local.imagen_url || local.foto_principal,
    ...(local.fotos || []),
    ...(local.galeria_urls || [])
  ].filter(Boolean) : [];

  const estadoLocal = local ? getEstadoLocal(local) : null;
  const isOpen = estadoLocal?.estaAbierto === true;

  const allCategories = local ? (local.barlive_types && local.barlive_types.length > 0 
    ? local.barlive_types 
    : local.barlive_type 
      ? [local.barlive_type] 
      : local.categoria 
        ? [local.categoria] 
        : []
  ).filter(cat => !CATEGORIAS_EXCLUIDAS.some(excluded => cat.toLowerCase().includes(excluded.toLowerCase()))) : [];

  const displayRating = local?.rating || local?.google_rating || 0;

  const closeButtonTop = local?.destacado 
    ? (Platform.OS === 'ios' ? 108 : 108)
    : (Platform.OS === 'ios' ? 68 : 68);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0, 0, 0, 0.7)" translucent />
      
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity 
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView 
            style={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Cargando local...</Text>
              </View>
            ) : local ? (
              <React.Fragment>
                {allImages.length > 0 && (
                  <View style={styles.coverContainer}>
                    <OptimizedImage
                      source={{ uri: allImages[currentImageIndex] }}
                      style={styles.coverImage}
                      resizeMode="cover"
                    />

                    <TouchableOpacity 
                      style={[styles.closeButtonFixed, { top: closeButtonTop }]} 
                      onPress={onClose}
                    >
                      <BlurView intensity={80} tint="dark" style={styles.buttonBlur}>
                        <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={18} color="#fff" />
                      </BlurView>
                    </TouchableOpacity>
                
                    {displayRating > 0 && (
                      <View style={styles.ratingBadgeTopRight}>
                        <BlurView intensity={90} tint="dark" style={styles.ratingBlur}>
                          <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={16} color="#FFD700" />
                          <Text style={styles.ratingText}>{displayRating.toFixed(1)}</Text>
                        </BlurView>
                      </View>
                    )}
                
                    {estadoLocal && (
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
                    )}

                    {local.destacado && (
                      <View style={styles.destacadoBadgeTop}>
                        <BlurView intensity={90} tint="dark" style={styles.destacadoBlur}>
                          <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={16} color="#F59E0B" />
                          <Text style={styles.destacadoText}>Destacado</Text>
                        </BlurView>
                      </View>
                    )}
                
                    <TouchableOpacity
                      style={styles.favoritoButton}
                      onPress={handleToggleFavorito}
                      disabled={loadingFavorite}
                    >
                      <BlurView intensity={80} tint="dark" style={styles.favoritoBlur}>
                        {loadingFavorite ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <IconSymbol
                            ios_icon_name={localIsFavorite ? "heart.fill" : "heart"}
                            android_material_icon_name={localIsFavorite ? "favorite" : "favorite_border"}
                            size={22}
                            color={localIsFavorite ? "#EF4444" : "#FFFFFF"}
                          />
                        )}
                      </BlurView>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.contentCard}>
                  <Text style={styles.localNameText}>{local.nombre}</Text>

                  {allCategories.length > 0 && (
                    <View style={styles.categoriesRow}>
                      {allCategories.map((categoria, index) => {
                        const icon = getCategoryIcon(categoria);
                        return (
                          <View key={index} style={[styles.categoryChip, { backgroundColor: icon.color }]}>
                            <IconSymbol 
                              ios_icon_name={icon.ios} 
                              android_material_icon_name={icon.android} 
                              size={18} 
                              color="#fff" 
                            />
                            <Text style={styles.categoryChipText}>{categoria.toUpperCase()}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {local.direccion && (
                    <View style={styles.addressContainer}>
                      <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={18} color={colors.primary} />
                      <Text style={styles.addressText} numberOfLines={2}>
                        {local.direccion}
                      </Text>
                    </View>
                  )}

                  {(local.descripcion_google || local.descripcion) && (
                    <Text style={styles.descriptionText} numberOfLines={3}>
                      {local.descripcion_google || local.descripcion}
                    </Text>
                  )}

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

                  <TouchableOpacity style={styles.viewFullButton} onPress={handleViewFullDetails}>
                    <LinearGradient
                      colors={[colors.primary, colors.secondary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.viewFullButtonGradient}
                    >
                      <Text style={styles.viewFullButtonText}>Ver Detalles Completos</Text>
                      <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </React.Fragment>
            ) : (
              <View style={styles.errorContainer}>
                <IconSymbol ios_icon_name="exclamationmark.triangle" android_material_icon_name="error" size={48} color={colors.badgeDestacado} />
                <Text style={styles.errorText}>No se pudo cargar el local</Text>
              </View>
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    maxHeight: SCREEN_HEIGHT * 0.85,
    backgroundColor: colors.background,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
  },
  coverContainer: {
    position: 'relative',
    height: 250,
  },
  coverImage: {
    width: '100%',
    height: 250,
  },
  closeButtonFixed: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
  favoritoButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
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
  contentCard: {
    padding: 20,
  },
  localNameText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
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
  viewFullButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  viewFullButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  viewFullButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
