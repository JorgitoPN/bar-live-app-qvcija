
import React, { useState, useRef, useEffect } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT_PHYSICAL = Dimensions.get('screen').height;

interface ImageGalleryModalProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

/**
 * ✅ IMAGE GALLERY MODAL v38.0 - ANDROID FULL SCREEN EDGE-TO-EDGE FIXED
 * 
 * NEW CHANGES v38.0:
 * - ✅ ANDROID: Usa Dimensions.get('screen').height para altura física completa
 * - ✅ ANDROID: Control imperativo de StatusBar con useEffect
 * - ✅ ANDROID: StatusBar.setHidden(true) + setTranslucent(true) + setBackgroundColor('transparent')
 * - ✅ ANDROID: Container con position: 'absolute', top: 0, bottom: 0, left: 0, right: 0
 * - ✅ ANDROID: useSafeAreaInsets para padding interno sin afectar fondo
 * - ✅ ELIMINADO LETTERBOXING: Pantalla completa sin espacios vacíos
 * - ✅ Respeta botones táctiles del teléfono Android
 */
export default function ImageGalleryModal({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: ImageGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  // Imperative StatusBar control for full-screen immersion on Android
  useEffect(() => {
    if (visible) {
      console.log('[ImageGalleryModal v38.0] 🎬 Modal opened - setting full-screen mode');
      StatusBar.setHidden(true, 'fade');
      if (Platform.OS === 'android') {
        StatusBar.setTranslucent(true);
        StatusBar.setBackgroundColor('transparent');
      }
    } else {
      console.log('[ImageGalleryModal v38.0] 🎬 Modal closed - restoring StatusBar');
      StatusBar.setHidden(false, 'fade');
      if (Platform.OS === 'android') {
        StatusBar.setTranslucent(false);
        StatusBar.setBackgroundColor('black');
      }
    }

    // Cleanup function to ensure StatusBar is reset if component unmounts while visible
    return () => {
      StatusBar.setHidden(false, 'fade');
      if (Platform.OS === 'android') {
        StatusBar.setTranslucent(false);
        StatusBar.setBackgroundColor('black');
      }
    };
  }, [visible]);

  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: initialIndex * SCREEN_WIDTH, animated: false });
      }, 100);
    }
  }, [visible, initialIndex]);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      scrollViewRef.current?.scrollTo({ x: newIndex * SCREEN_WIDTH, animated: true });
    }
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      scrollViewRef.current?.scrollTo({ x: newIndex * SCREEN_WIDTH, animated: true });
    }
  };

  console.log('[ImageGalleryModal v38.0] 📸 Displaying gallery:', {
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
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
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

        <View style={[
          styles.header,
          {
            paddingTop: Platform.OS === 'android' ? insets.top + 10 : 50,
          }
        ]}>
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

        <View style={[
          styles.dotsContainer,
          {
            bottom: Platform.OS === 'android' ? insets.bottom + 20 : 20,
          }
        ]}>
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
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'android' ? SCREEN_HEIGHT_PHYSICAL : '100%',
    width: SCREEN_WIDTH,
    margin: 0,
    padding: 0,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    width: SCREEN_WIDTH,
    height: Platform.OS === 'android' ? SCREEN_HEIGHT_PHYSICAL : '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: Platform.OS === 'android' ? SCREEN_HEIGHT_PHYSICAL : '100%',
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
