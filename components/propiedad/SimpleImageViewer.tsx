
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

/**
 * ✅ VISOR SIMPLE DE IMÁGENES v4.0 - MEJORADO
 * 
 * Mejoras:
 * - Validación robusta de URLs
 * - Retry automático en caso de error
 * - Feedback claro al usuario
 * - Manejo de errores mejorado
 */

interface SimpleImageViewerProps {
  images: string[];
  title?: string;
  subtitle?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SimpleImageViewer({
  images,
  title = 'Imágenes',
  subtitle,
}: SimpleImageViewerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadingImages, setLoadingImages] = useState<Set<number>>(new Set());
  const [errorImages, setErrorImages] = useState<Set<number>>(new Set());
  const [retryCount, setRetryCount] = useState<Map<number, number>>(new Map());

  console.log('[SimpleImageViewer v4] 🎬 Inicializado');
  console.log('[SimpleImageViewer v4] 📸 Total de imágenes:', images.length);

  // Validar URLs
  const validImages = images.filter((url, index) => {
    if (!url || typeof url !== 'string') {
      console.warn('[SimpleImageViewer v4] ⚠️ URL inválida en índice', index);
      return false;
    }

    if (!url.startsWith('https://')) {
      console.warn('[SimpleImageViewer v4] ⚠️ URL no es HTTPS:', url.substring(0, 50));
      return false;
    }

    if (!url.includes('supabase.co')) {
      console.warn('[SimpleImageViewer v4] ⚠️ URL no es de Supabase');
      return false;
    }

    return true;
  });

  console.log('[SimpleImageViewer v4] ✅ URLs válidas:', validImages.length);

  if (validImages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <IconSymbol
          ios_icon_name="photo"
          android_material_icon_name="image"
          size={48}
          color={colors.textSecondary}
        />
        <Text style={styles.emptyText}>No hay imágenes para mostrar</Text>
        {images.length > 0 && (
          <Text style={styles.emptySubtext}>
            {images.length} URL(s) inválida(s)
          </Text>
        )}
      </View>
    );
  }

  const handleImageLoadStart = (index: number) => {
    console.log('[SimpleImageViewer v4] 🔄 Cargando imagen', index + 1);
    setLoadingImages(prev => new Set(prev).add(index));
  };

  const handleImageLoadEnd = (index: number) => {
    console.log('[SimpleImageViewer v4] ✅ Imagen', index + 1, 'cargada');
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
    setRetryCount(prev => {
      const newMap = new Map(prev);
      newMap.delete(index);
      return newMap;
    });
  };

  const handleImageError = (index: number, url: string) => {
    const currentRetries = retryCount.get(index) || 0;
    
    console.error('[SimpleImageViewer v4] ❌ Error en imagen', index + 1);
    console.error('[SimpleImageViewer v4] ❌ URL:', url);
    console.error('[SimpleImageViewer v4] ❌ Intento:', currentRetries + 1);

    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });

    if (currentRetries < 2) {
      console.log('[SimpleImageViewer v4] 🔄 Reintentando...');
      setRetryCount(prev => {
        const newMap = new Map(prev);
        newMap.set(index, currentRetries + 1);
        return newMap;
      });
      
      setTimeout(() => {
        setLoadingImages(prev => new Set(prev).add(index));
      }, 1000);
    } else {
      console.error('[SimpleImageViewer v4] ❌ Máximo de reintentos alcanzado');
      setErrorImages(prev => new Set(prev).add(index));
    }
  };

  const retryImage = (index: number) => {
    console.log('[SimpleImageViewer v4] 🔄 Reintento manual');
    setErrorImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
    setRetryCount(prev => {
      const newMap = new Map(prev);
      newMap.delete(index);
      return newMap;
    });
    setLoadingImages(prev => new Set(prev).add(index));
  };

  const showImageUrl = (url: string) => {
    Alert.alert('URL de la imagen', url);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{validImages.length}</Text>
        </View>
      </View>

      {/* Gallery */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.galleryContent}
      >
        {validImages.map((url, index) => (
          <TouchableOpacity
            key={`img-${index}`}
            style={styles.imageCard}
            onPress={() => {
              setSelectedIndex(index);
              setModalVisible(true);
            }}
            onLongPress={() => showImageUrl(url)}
            activeOpacity={0.8}
          >
            <View style={styles.imageNumberBadge}>
              <Text style={styles.imageNumberText}>{index + 1}</Text>
            </View>

            {errorImages.has(index) ? (
              <View style={[styles.imagePreview, styles.errorPreview]}>
                <IconSymbol
                  ios_icon_name="exclamationmark.triangle.fill"
                  android_material_icon_name="error"
                  size={32}
                  color="#EF4444"
                />
                <Text style={styles.errorText}>Error</Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => retryImage(index)}
                >
                  <IconSymbol
                    ios_icon_name="arrow.clockwise"
                    android_material_icon_name="refresh"
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={styles.retryBtnText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Image
                  source={{ uri: url }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                  onLoadStart={() => handleImageLoadStart(index)}
                  onLoad={() => handleImageLoadEnd(index)}
                  onError={() => handleImageError(index, url)}
                />
                {loadingImages.has(index) && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                )}
                {!loadingImages.has(index) && (
                  <View style={styles.expandIcon}>
                    <IconSymbol
                      ios_icon_name="arrow.up.left.and.arrow.down.right"
                      android_material_icon_name="fullscreen"
                      size={14}
                      color="#fff"
                    />
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setModalVisible(false)}
          >
            <View style={styles.closeBtnCircle}>
              <IconSymbol
                ios_icon_name="xmark"
                android_material_icon_name="close"
                size={24}
                color="#fff"
              />
            </View>
          </TouchableOpacity>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: selectedIndex * SCREEN_WIDTH, y: 0 }}
            onScroll={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              if (newIndex !== selectedIndex) {
                setSelectedIndex(newIndex);
              }
            }}
            scrollEventThrottle={16}
          >
            {validImages.map((url, index) => (
              <View key={`full-${index}`} style={styles.fullscreenContainer}>
                {errorImages.has(index) ? (
                  <View style={styles.fullscreenError}>
                    <IconSymbol
                      ios_icon_name="exclamationmark.triangle.fill"
                      android_material_icon_name="error"
                      size={64}
                      color="#EF4444"
                    />
                    <Text style={styles.fullscreenErrorText}>
                      No se pudo cargar la imagen
                    </Text>
                    <TouchableOpacity
                      style={styles.fullscreenRetryBtn}
                      onPress={() => retryImage(index)}
                    >
                      <IconSymbol
                        ios_icon_name="arrow.clockwise"
                        android_material_icon_name="refresh"
                        size={20}
                        color="#fff"
                      />
                      <Text style={styles.fullscreenRetryText}>Reintentar</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Image
                      source={{ uri: url }}
                      style={styles.fullscreenImage}
                      resizeMode="contain"
                      onLoadStart={() => handleImageLoadStart(index)}
                      onLoad={() => handleImageLoadEnd(index)}
                      onError={() => handleImageError(index, url)}
                    />
                    {loadingImages.has(index) && (
                      <View style={styles.fullscreenLoading}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={styles.loadingText}>Cargando...</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>
                {selectedIndex + 1} / {validImages.length}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.headerText,
  },
  galleryContent: {
    gap: 12,
  },
  imageCard: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary + '50',
  },
  imageNumberBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  imageNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.headerText,
  },
  imagePreview: {
    width: 140,
    height: 140,
    backgroundColor: colors.cardBorder,
  },
  errorPreview: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  retryBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    right: 20,
    zIndex: 100,
  },
  closeBtnCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  fullscreenError: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  fullscreenErrorText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  fullscreenRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  fullscreenRetryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  fullscreenLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  modalFooter: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  counterBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  counterText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
