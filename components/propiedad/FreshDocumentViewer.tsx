
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
 * 🆕 NUEVO VISOR DE IMÁGENES v7.0
 * 
 * Sistema completamente reconstruido:
 * - Código minimalista
 * - Validación robusta
 * - Manejo de errores mejorado
 * - Interfaz limpia
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
  const [loadingImages, setLoadingImages] = useState<Record<number, boolean>>({});

  console.log('[NewViewer] 🎬 Iniciado');
  console.log('[NewViewer] 📄 URLs recibidas:', imageUrls.length);

  // Validar URLs
  const validUrls = imageUrls.filter(url => {
    const isValid = url && typeof url === 'string' && url.startsWith('https://');
    if (!isValid && url) {
      console.warn('[NewViewer] ⚠️ URL inválida:', url);
    }
    return isValid;
  });

  console.log('[NewViewer] ✅ URLs válidas:', validUrls.length);

  if (validUrls.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <IconSymbol
          ios_icon_name="photo"
          android_material_icon_name="image"
          size={48}
          color={colors.textSecondary}
        />
        <Text style={styles.emptyText}>No hay documentos</Text>
      </View>
    );
  }

  const openModal = (index: number) => {
    console.log('[NewViewer] 👁️ Abriendo imagen', index + 1);
    setSelectedIndex(index);
    setModalVisible(true);
  };

  const closeModal = () => {
    console.log('[NewViewer] 🚪 Cerrando modal');
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{validUrls.length}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.galleryContent}
      >
        {validUrls.map((url, index) => (
          <TouchableOpacity
            key={index}
            style={styles.thumbnailContainer}
            onPress={() => openModal(index)}
          >
            <View style={styles.imageNumber}>
              <Text style={styles.imageNumberText}>{index + 1}</Text>
            </View>
            <Image
              source={{ uri: url }}
              style={styles.thumbnail}
              resizeMode="cover"
              onLoadStart={() => {
                console.log('[NewViewer] 🔄 Cargando thumbnail', index + 1);
                setLoadingImages(prev => ({ ...prev, [index]: true }));
              }}
              onLoad={() => {
                console.log('[NewViewer] ✅ Thumbnail cargado', index + 1);
                setLoadingImages(prev => ({ ...prev, [index]: false }));
              }}
              onError={(error) => {
                console.error('[NewViewer] ❌ Error thumbnail', index + 1, error.nativeEvent);
                setLoadingImages(prev => ({ ...prev, [index]: false }));
              }}
            />
            {loadingImages[index] && (
              <View style={styles.thumbnailLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
            <View style={styles.expandIcon}>
              <IconSymbol
                ios_icon_name="arrow.up.left.and.arrow.down.right"
                android_material_icon_name="fullscreen"
                size={16}
                color="#fff"
              />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
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
              setSelectedIndex(newIndex);
            }}
            scrollEventThrottle={16}
          >
            {validUrls.map((url, index) => (
              <View key={index} style={styles.fullscreenContainer}>
                <Image
                  source={{ uri: url }}
                  style={styles.fullscreenImage}
                  resizeMode="contain"
                  onLoadStart={() => {
                    console.log('[NewViewer] 🔄 Cargando fullscreen', index + 1);
                  }}
                  onLoad={() => {
                    console.log('[NewViewer] ✅ Fullscreen cargado', index + 1);
                  }}
                  onError={(error) => {
                    console.error('[NewViewer] ❌ Error fullscreen', index + 1, error.nativeEvent);
                  }}
                />
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>
                {selectedIndex + 1} / {validUrls.length}
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
    marginBottom: 20,
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
  galleryContent: {
    gap: 12,
  },
  thumbnailContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  thumbnail: {
    width: 150,
    height: 150,
    backgroundColor: colors.cardBorder,
  },
  thumbnailLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
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
