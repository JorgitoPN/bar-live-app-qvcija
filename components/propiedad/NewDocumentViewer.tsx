
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
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

/**
 * 🆕 NUEVO SISTEMA DE VISUALIZACIÓN DE DOCUMENTOS v3.0
 * 
 * Sistema completamente nuevo desde cero:
 * - Sin dependencias del código anterior
 * - Galería horizontal simple
 * - Modal de pantalla completa
 * - Manejo robusto de errores
 * - Interfaz intuitiva
 */

interface NewDocumentViewerProps {
  imageUrls: string[];
  title?: string;
  emptyMessage?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function NewDocumentViewer({
  imageUrls,
  title = 'Documentos',
  emptyMessage = 'No hay documentos para mostrar',
}: NewDocumentViewerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<number>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<number>>(new Set());

  console.log('[NewDocumentViewer] 🎬 Inicializado');
  console.log('[NewDocumentViewer] 📄 Total de URLs:', imageUrls.length);

  // Filtrar URLs válidas
  const validUrls = imageUrls.filter(url => {
    const isValid = url && typeof url === 'string' && url.startsWith('https://');
    if (!isValid) {
      console.warn('[NewDocumentViewer] ⚠️ URL inválida:', url);
    }
    return isValid;
  });

  console.log('[NewDocumentViewer] ✅ URLs válidas:', validUrls.length);

  if (validUrls.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <IconSymbol
          ios_icon_name="doc.text"
          android_material_icon_name="description"
          size={48}
          color={colors.textSecondary}
        />
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  const openImageModal = (index: number) => {
    console.log('[NewDocumentViewer] 👁️ Abriendo imagen', index + 1, 'de', validUrls.length);
    setSelectedImageIndex(index);
    setModalVisible(true);
  };

  const closeModal = () => {
    console.log('[NewDocumentViewer] 🚪 Cerrando modal');
    setModalVisible(false);
  };

  const handleImageLoadStart = (index: number) => {
    console.log('[NewDocumentViewer] 🔄 Cargando imagen', index + 1);
    setLoadingImages(prev => new Set(prev).add(index));
  };

  const handleImageLoadEnd = (index: number) => {
    console.log('[NewDocumentViewer] ✅ Imagen', index + 1, 'cargada');
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  };

  const handleImageError = (index: number, url: string) => {
    console.error('[NewDocumentViewer] ❌ Error cargando imagen', index + 1);
    console.error('[NewDocumentViewer] ❌ URL:', url);
    setImageLoadErrors(prev => new Set(prev).add(index));
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  };

  return (
    <View style={styles.container}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{validUrls.length}</Text>
        </View>
      </View>

      {/* Galería horizontal */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.galleryContent}
        style={styles.gallery}
      >
        {validUrls.map((url, index) => (
          <TouchableOpacity
            key={`thumbnail-${index}`}
            style={styles.thumbnailWrapper}
            onPress={() => openImageModal(index)}
            activeOpacity={0.8}
          >
            {/* Número de imagen */}
            <View style={styles.imageNumber}>
              <Text style={styles.imageNumberText}>{index + 1}</Text>
            </View>

            {/* Imagen o estado de error */}
            {imageLoadErrors.has(index) ? (
              <View style={[styles.thumbnail, styles.errorThumbnail]}>
                <IconSymbol
                  ios_icon_name="exclamationmark.triangle.fill"
                  android_material_icon_name="error"
                  size={32}
                  color={colors.textSecondary}
                />
                <Text style={styles.errorLabel}>Error</Text>
              </View>
            ) : (
              <>
                <Image
                  source={{ uri: url }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                  onLoadStart={() => handleImageLoadStart(index)}
                  onLoad={() => handleImageLoadEnd(index)}
                  onError={() => handleImageError(index, url)}
                />
                
                {/* Indicador de carga */}
                {loadingImages.has(index) && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                )}

                {/* Icono de expandir */}
                {!loadingImages.has(index) && (
                  <View style={styles.expandBadge}>
                    <IconSymbol
                      ios_icon_name="arrow.up.left.and.arrow.down.right"
                      android_material_icon_name="fullscreen"
                      size={16}
                      color="#fff"
                    />
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Modal de pantalla completa */}
      <Modal
        visible={modalVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        <View style={styles.modalContainer}>
          {/* Botón de cerrar */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={closeModal}
            activeOpacity={0.8}
          >
            <View style={styles.closeButtonCircle}>
              <IconSymbol
                ios_icon_name="xmark"
                android_material_icon_name="close"
                size={24}
                color="#fff"
              />
            </View>
          </TouchableOpacity>

          {/* Imagen en pantalla completa */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: selectedImageIndex * SCREEN_WIDTH, y: 0 }}
            onScroll={(event) => {
              const newIndex = Math.round(
                event.nativeEvent.contentOffset.x / SCREEN_WIDTH
              );
              if (newIndex !== selectedImageIndex) {
                console.log('[NewDocumentViewer] 📸 Navegando a imagen', newIndex + 1);
                setSelectedImageIndex(newIndex);
              }
            }}
            scrollEventThrottle={16}
          >
            {validUrls.map((url, index) => (
              <View key={`fullscreen-${index}`} style={styles.fullscreenImageContainer}>
                {imageLoadErrors.has(index) ? (
                  <View style={styles.fullscreenError}>
                    <IconSymbol
                      ios_icon_name="exclamationmark.triangle.fill"
                      android_material_icon_name="error"
                      size={64}
                      color="#fff"
                    />
                    <Text style={styles.fullscreenErrorText}>
                      No se pudo cargar la imagen
                    </Text>
                    <Text style={styles.fullscreenErrorUrl}>
                      {url.substring(0, 60)}...
                    </Text>
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

          {/* Contador e indicadores */}
          <View style={styles.modalFooter}>
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>
                {selectedImageIndex + 1} / {validUrls.length}
              </Text>
            </View>

            {validUrls.length > 1 && (
              <View style={styles.indicatorsContainer}>
                {validUrls.map((_, index) => (
                  <View
                    key={`indicator-${index}`}
                    style={[
                      styles.indicator,
                      index === selectedImageIndex && styles.indicatorActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  countBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.headerText,
  },
  gallery: {
    marginHorizontal: -4,
  },
  galleryContent: {
    paddingHorizontal: 4,
    gap: 12,
  },
  thumbnailWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary + '50',
    backgroundColor: colors.cardBackground,
  },
  thumbnail: {
    width: 150,
    height: 150,
    backgroundColor: colors.cardBorder,
  },
  errorThumbnail: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  errorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  imageNumber: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  imageNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.headerText,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    right: 20,
    zIndex: 100,
  },
  closeButtonCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImageContainer: {
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
  fullscreenErrorUrl: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
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
    gap: 16,
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
  indicatorsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  indicatorActive: {
    backgroundColor: '#fff',
    width: 24,
  },
});
