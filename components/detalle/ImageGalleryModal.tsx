
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

const { width, height } = Dimensions.get('window');

interface ImageGalleryModalProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

/**
 * ✅ IMAGE GALLERY MODAL v36.0 - ANDROID FULL SCREEN FIX COMPLETE
 * 
 * NEW CHANGES v36.0:
 * - ✅ FIXED LETTERBOXING COMPLETAMENTE: Ahora cubre toda la pantalla sin espacios
 * - ✅ Container usa height: Dimensions.get('window').height directamente
 * - ✅ ScrollView con flex: 1 para ocupar todo el espacio disponible
 * - ✅ Eliminados todos los márgenes que causaban espacios
 * - ✅ Header absolutamente posicionado sin afectar el layout
 * - ✅ Respeta los botones táctiles del teléfono Android
 * 
 * PREVIOUS CHANGES v35.0:
 * - ✅ FIXED LETTERBOXING: Usa Dimensions.get('window').height directamente
 * - ✅ Container sin márgenes: margin: 0, padding: 0
 * - ✅ Imagen ocupa toda la altura disponible sin espacios vacíos
 * - ✅ Header con posición absoluta para no restar altura
 * - ✅ Experiencia verdaderamente edge-to-edge en Android
 */
export default function ImageGalleryModal({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: ImageGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollViewRef = useRef<ScrollView>(null);

  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: initialIndex * width, animated: false });
      }, 100);
    }
  }, [visible, initialIndex]);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      scrollViewRef.current?.scrollTo({ x: newIndex * width, animated: true });
    }
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      scrollViewRef.current?.scrollTo({ x: newIndex * width, animated: true });
    }
  };

  console.log('[ImageGalleryModal v36.0] 📸 Displaying gallery:', {
    visible,
    totalImages: images.length,
    currentIndex,
    initialIndex,
  });

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      presentationStyle={Platform.OS === 'android' ? 'overFullScreen' : 'fullScreen'}
      onRequestClose={onClose}
    >
      {Platform.OS === 'android' && <StatusBar hidden={true} />}
      <View style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {images.map((imageUrl, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>

        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.counter}>
            {currentIndex + 1} / {images.length}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {currentIndex > 0 && (
          <TouchableOpacity style={styles.leftArrow} onPress={goToPrevious}>
            <View style={styles.arrowBackground}>
              <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="chevron_left" size={32} color={colors.headerText} />
            </View>
          </TouchableOpacity>
        )}

        {currentIndex < images.length - 1 && (
          <TouchableOpacity style={styles.rightArrow} onPress={goToNext}>
            <View style={styles.arrowBackground}>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={32} color={colors.headerText} />
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.dotsContainer}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: height,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.headerText,
  },
  placeholder: {
    width: 40,
  },
  imageContainer: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width,
    height: height,
  },
  leftArrow: {
    position: 'absolute',
    left: 20,
    top: '50%',
    marginTop: -30,
    zIndex: 20,
  },
  rightArrow: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -30,
    zIndex: 20,
  },
  arrowBackground: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dotActive: {
    backgroundColor: colors.headerText,
    width: 24,
  },
});
