
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
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

/**
 * ✅ NUEVO SISTEMA SIMPLE DE VISUALIZACIÓN DE IMÁGENES v1.0
 * 
 * Sistema completamente nuevo y funcional:
 * - Galería horizontal con thumbnails
 * - Modal de pantalla completa para ver imágenes
 * - Navegación entre imágenes con scroll
 * - Indicadores visuales claros
 * - Sin dependencias del código anterior
 */

interface SimpleImageViewerProps {
  images: string[];
  title?: string;
  subtitle?: string;
}

const { width, height } = Dimensions.get('window');

export default function SimpleImageViewer({
  images,
  title = 'Imágenes',
  subtitle,
}: SimpleImageViewerProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  console.log('[SimpleImageViewer] 🎬 Componente inicializado');
  console.log('[SimpleImageViewer] 📸 Total de imágenes:', images.length);

  if (!images || images.length === 0) {
    console.log('[SimpleImageViewer] ⚠️ No hay imágenes para mostrar');
    return null;
  }

  const handleOpenImage = (index: number) => {
    console.log('[SimpleImageViewer] 👁️ Abriendo imagen', index + 1, 'de', images.length);
    setSelectedIndex(index);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    console.log('[SimpleImageViewer] 🚪 Cerrando modal');
    setShowModal(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        <Text style={styles.count}>({images.length})</Text>
      </View>

      {/* Galería horizontal de thumbnails */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.gallery}
        contentContainerStyle={styles.galleryContent}
      >
        {images.map((imageUrl, index) => (
          <TouchableOpacity
            key={`thumb-${index}`}
            style={styles.thumbnailContainer}
            onPress={() => handleOpenImage(index)}
            activeOpacity={0.7}
          >
            <Image
              source={{ uri: imageUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
              onLoadStart={() => {
                console.log('[SimpleImageViewer] 🔄 Cargando thumbnail', index + 1);
              }}
              onLoad={() => {
                console.log('[SimpleImageViewer] ✅ Thumbnail', index + 1, 'cargado');
              }}
              onError={(error) => {
                console.error('[SimpleImageViewer] ❌ Error cargando thumbnail', index + 1);
                console.error('[SimpleImageViewer] ❌ URL:', imageUrl);
                console.error('[SimpleImageViewer] ❌ Error:', error.nativeEvent.error);
              }}
            />
            {/* Número de imagen */}
            <View style={styles.thumbnailNumber}>
              <Text style={styles.thumbnailNumberText}>{index + 1}</Text>
            </View>
            {/* Icono de expandir */}
            <View style={styles.expandIcon}>
              <IconSymbol 
                ios_icon_name="arrow.up.left.and.arrow.down.right" 
                android_material_icon_name="fullscreen" 
                size={18} 
                color="#fff" 
              />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Modal de pantalla completa */}
      <Modal
        visible={showModal}
        transparent={false}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalContainer}>
          {/* Botón de cerrar */}
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={handleCloseModal}
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

          {/* Scroll horizontal de imágenes */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.imageScroll}
            contentOffset={{ x: selectedIndex * width, y: 0 }}
            onScroll={(event) => {
              const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
              if (newIndex !== selectedIndex) {
                console.log('[SimpleImageViewer] 📸 Navegando a imagen', newIndex + 1);
                setSelectedIndex(newIndex);
              }
            }}
            scrollEventThrottle={16}
          >
            {images.map((imageUrl, index) => (
              <View key={`full-${index}`} style={styles.fullImageContainer}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.fullImage}
                  resizeMode="contain"
                  onLoadStart={() => {
                    console.log('[SimpleImageViewer] 🔄 Cargando imagen completa', index + 1);
                  }}
                  onLoad={() => {
                    console.log('[SimpleImageViewer] ✅ Imagen completa', index + 1, 'cargada');
                  }}
                  onError={(error) => {
                    console.error('[SimpleImageViewer] ❌ Error cargando imagen completa', index + 1);
                    console.error('[SimpleImageViewer] ❌ URL:', imageUrl);
                    console.error('[SimpleImageViewer] ❌ Error:', error.nativeEvent.error);
                  }}
                />
              </View>
            ))}
          </ScrollView>

          {/* Contador e indicadores */}
          <View style={styles.modalFooter}>
            <View style={styles.counterContainer}>
              <Text style={styles.counterText}>
                {selectedIndex + 1} / {images.length}
              </Text>
            </View>
            {images.length > 1 && (
              <View style={styles.indicators}>
                {images.map((_, index) => (
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
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  count: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  gallery: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  galleryContent: {
    gap: 12,
  },
  thumbnailContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary + '40',
  },
  thumbnail: {
    width: 140,
    height: 140,
    backgroundColor: colors.cardBorder,
  },
  thumbnailNumber: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.headerText,
  },
  expandIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    right: 20,
    zIndex: 10,
  },
  closeButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageScroll: {
    width: width,
    flex: 1,
  },
  fullImageContainer: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: width,
    height: height,
  },
  modalFooter: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 16,
  },
  counterContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  counterText: {
    fontSize: 15,
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
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorActive: {
    backgroundColor: '#fff',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
