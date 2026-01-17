
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
 * 🆕 SISTEMA ULTRA SIMPLE v6.0 - REBUILD TOTAL
 * 
 * Visor reconstruido desde CERO:
 * - Código minimalista
 * - Sin complejidad innecesaria
 * - Validación simple
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

  console.log('[UltraSimpleViewer] 🎬 Iniciado');
  console.log('[UltraSimpleViewer] 📄 URLs:', imageUrls.length);

  // Validar URLs (simple)
  const validUrls = imageUrls.filter(url => {
    return url && typeof url === 'string' && url.startsWith('https://');
  });

  console.log('[UltraSimpleViewer] ✅ URLs válidas:', validUrls.length);

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
    console.log('[UltraSimpleViewer] 👁️ Abriendo imagen', index + 1);
    setSelectedIndex(index);
    setModalVisible(true);
  };

  const closeModal = () => {
    console.log('[UltraSimpleViewer] 🚪 Cerrando');
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
            />
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
