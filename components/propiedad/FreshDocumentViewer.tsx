
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
 * 🆕 SISTEMA TOTALMENTE NUEVO v5.0 - FRESH VIEWER
 * 
 * Visor construido desde CERO:
 * - Sin dependencias del código anterior
 * - Validación robusta de URLs
 * - Manejo de errores mejorado
 * - Retry automático
 * - Interfaz clara
 */

interface FreshDocumentViewerProps {
  imageUrls: string[];
  title?: string;
  subtitle?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function FreshDocumentViewer({
  imageUrls,
  title = 'Documentos',
  subtitle,
}: FreshDocumentViewerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadErrors, setLoadErrors] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<Set<number>>(new Set());
  const [retries, setRetries] = useState<Map<number, number>>(new Map());

  console.log('[FreshViewer] 🎬 Componente montado');
  console.log('[FreshViewer] 📄 URLs recibidas:', imageUrls.length);

  // Validar URLs
  const validUrls = imageUrls.filter((url, index) => {
    if (!url || typeof url !== 'string') {
      console.warn('[FreshViewer] ⚠️ URL inválida en índice', index);
      return false;
    }

    if (!url.startsWith('https://')) {
      console.warn('[FreshViewer] ⚠️ URL no es HTTPS:', url.substring(0, 50));
      return false;
    }

    if (!url.includes('supabase.co')) {
      console.warn('[FreshViewer] ⚠️ URL no es de Supabase');
      return false;
    }

    console.log('[FreshViewer] ✅ URL válida:', index + 1);
    return true;
  });

  console.log('[FreshViewer] ✅ URLs válidas:', validUrls.length);

  if (validUrls.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <IconSymbol
          ios_icon_name="doc.text"
          android_material_icon_name="description"
          size={48}
          color={colors.textSecondary}
        />
        <Text style={styles.emptyText}>No hay documentos</Text>
        {imageUrls.length > 0 && (
          <Text style={styles.emptySubtext}>
            {imageUrls.length} URL(s) inválida(s)
          </Text>
        )}
      </View>
    );
  }

  const openModal = (index: number) => {
    console.log('[FreshViewer] 👁️ Abriendo imagen', index + 1);
    setSelectedIndex(index);
    setModalVisible(true);
  };

  const closeModal = () => {
    console.log('[FreshViewer] 🚪 Cerrando modal');
    setModalVisible(false);
  };

  const handleLoadStart = (index: number) => {
    console.log('[FreshViewer] 🔄 Cargando imagen', index + 1);
    setLoading(prev => new Set(prev).add(index));
  };

  const handleLoadEnd = (index: number) => {
    console.log('[FreshViewer] ✅ Imagen', index + 1, 'cargada');
    setLoading(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
    setRetries(prev => {
      const newMap = new Map(prev);
      newMap.delete(index);
      return newMap;
    });
  };

  const handleError = (index: number, url: string) => {
    const currentRetries = retries.get(index) || 0;
    
    console.error('[FreshViewer] ❌ Error en imagen', index + 1);
    console.error('[FreshViewer] ❌ URL:', url.substring(0, 60));
    console.error('[FreshViewer] ❌ Intento:', currentRetries + 1, 'de 3');

    setLoading(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });

    if (currentRetries < 2) {
      console.log('[FreshViewer] 🔄 Reintentando...');
      setRetries(prev => {
        const newMap = new Map(prev);
        newMap.set(index, currentRetries + 1);
        return newMap;
      });
      
      setTimeout(() => {
        setLoading(prev => new Set(prev).add(index));
      }, 1000);
    } else {
      console.error('[FreshViewer] ❌ Máximo de reintentos alcanzado');
      setLoadErrors(prev => new Set(prev).add(index));
    }
  };

  const retryImage = (index: number) => {
    console.log('[FreshViewer] 🔄 Reintento manual', index + 1);
    setLoadErrors(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
    setRetries(prev => {
      const newMap = new Map(prev);
      newMap.delete(index);
      return newMap;
    });
    setLoading(prev => new Set(prev).add(index));
  };

  const showUrlInfo = (url: string) => {
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
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{validUrls.length}</Text>
        </View>
      </View>

      {/* Gallery */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.galleryContent}
        style={styles.gallery}
      >
        {validUrls.map((url, index) => (
          <TouchableOpacity
            key={`thumb-${index}`}
            style={styles.thumbnailContainer}
            onPress={() => openModal(index)}
            onLongPress={() => showUrlInfo(url)}
            activeOpacity={0.8}
          >
            <View style={styles.imageNumber}>
              <Text style={styles.imageNumberText}>{index + 1}</Text>
            </View>

            {loadErrors.has(index) ? (
              <View style={[styles.thumbnail, styles.errorThumbnail]}>
                <IconSymbol
                  ios_icon_name="exclamationmark.triangle.fill"
                  android_material_icon_name="error"
                  size={32}
                  color="#EF4444"
                />
                <Text style={styles.errorText}>Error</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => retryImage(index)}
                >
                  <IconSymbol
                    ios_icon_name="arrow.clockwise"
                    android_material_icon_name="refresh"
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.retryText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Image
                  source={{ uri: url }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                  onLoadStart={() => handleLoadStart(index)}
                  onLoad={() => handleLoadEnd(index)}
                  onError={() => handleError(index, url)}
                />
                
                {loading.has(index) && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    {retries.get(index) ? (
                      <Text style={styles.retryCountText}>
                        {(retries.get(index) || 0) + 1}/3
                      </Text>
                    ) : null}
                  </View>
                )}

                {!loading.has(index) && (
                  <View style={styles.expandIcon}>
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

      {/* Help */}
      <View style={styles.helpSection}>
        <IconSymbol
          ios_icon_name="info.circle"
          android_material_icon_name="info"
          size={14}
          color={colors.textSecondary}
        />
        <Text style={styles.helpText}>
          Mantén presionada una imagen para ver su URL
        </Text>
      </View>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={closeModal}
            activeOpacity={0.8}
          >
            <View style={styles.closeCircle}>
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
            onScroll={(event) => {
              const newIndex = Math.round(
                event.nativeEvent.contentOffset.x / SCREEN_WIDTH
              );
              if (newIndex !== selectedIndex) {
                setSelectedIndex(newIndex);
              }
            }}
            scrollEventThrottle={16}
          >
            {validUrls.map((url, index) => (
              <View key={`full-${index}`} style={styles.fullscreenContainer}>
                {loadErrors.has(index) ? (
                  <View style={styles.fullscreenError}>
                    <IconSymbol
                      ios_icon_name="exclamationmark.triangle.fill"
                      android_material_icon_name="error"
                      size={64}
                      color="#EF4444"
                    />
                    <Text style={styles.fullscreenErrorText}>
                      No se pudo cargar
                    </Text>
                    <TouchableOpacity
                      style={styles.fullscreenRetryButton}
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
                      onLoadStart={() => handleLoadStart(index)}
                      onLoad={() => handleLoadEnd(index)}
                      onError={() => handleError(index, url)}
                    />
                    {loading.has(index) && (
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
                {selectedIndex + 1} / {validUrls.length}
              </Text>
            </View>

            {validUrls.length > 1 && (
              <View style={styles.indicators}>
                {validUrls.map((_, index) => (
                  <View
                    key={`indicator-${index}`}
                    style={[
                      styles.indicator,
                      index === selectedIndex && styles.indicatorActive,
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
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
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
  thumbnailContainer: {
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
    padding: 12,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
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
    gap: 8,
  },
  retryCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expandIcon: {
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
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  helpText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
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
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.textSecondary,
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
  closeCircle: {
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
  },
  fullscreenRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
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
  indicators: {
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
