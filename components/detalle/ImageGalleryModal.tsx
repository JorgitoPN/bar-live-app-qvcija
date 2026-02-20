
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
 * ✅ IMAGE GALLERY MODAL v30.0 - ANDROID FULLSCREEN FIX COMPLETE
 * 
 * NEW CHANGES v30.0:
 * - ✅ FIXED ANDROID MODAL: presentationStyle='fullScreen' + StatusBar hidden
 * - ✅ El visor de imágenes se abre en pantalla completa en Android
 * - ✅ No hay espacios vacíos en la parte superior e inferior
 * - ✅ Experiencia idéntica a iOS
 * 
 * PREVIOUS FIXES v29.0:
 * - ✅ Properly displays all images from galeria_urls
 * - ✅ Fixed icon mappings for Android
 * - ✅ Smooth navigation between images
 * - ✅ Works identically on iOS and Android
 */
export default function ImageGalleryModal({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: ImageGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollViewRef = useRef<ScrollView>(null);

  // Reset to initial index when modal opens
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

  console.log('[ImageGalleryModal] 📸 Displaying gallery:', {
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
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar hidden={true} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.counter}>
            {currentIndex + 1} / {images.length}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Image Carousel */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
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

        {/* Navigation Arrows */}
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

        {/* Dots Indicator */}
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
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
    height: height - 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width,
    height: height - 150,
  },
  leftArrow: {
    position: 'absolute',
    left: 20,
    top: '50%',
    marginTop: -30,
  },
  rightArrow: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -30,
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
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
