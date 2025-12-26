
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import * as ImageManipulator from 'expo-image-manipulator';
import { GestureHandlerRootView, PinchGestureHandler, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDecay,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageEditorV6Props {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onSave: (editedUri: string) => void;
}

/**
 * ✅ IMAGE EDITOR v6.2 - FIXED ANDROID BUTTON VISIBILITY
 * 
 * Features:
 * - ✅ FIXED: Buttons now visible above image editor on Android
 * - ✅ FIXED: Proper z-index and elevation for controls
 * - ✅ FIXED: Controls container positioned correctly
 * - ✅ Pinch to zoom (0.5x to 5x)
 * - ✅ Pan to move image
 * - ✅ Rotate 90° left/right
 * - ✅ Flip horizontal/vertical
 * - ✅ Crop to square
 * - ✅ Reset all transformations
 * - ✅ Smooth animations
 * - ✅ No black screen issues
 * - ✅ Works with both local and remote images
 * - ✅ Proper image loading and error handling
 */

export default function ImageEditorV6({
  visible,
  imageUri,
  onClose,
  onSave,
}: ImageEditorV6Props) {
  const [processing, setProcessing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [rotation, setRotation] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  
  // Gesture values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    if (visible && imageUri) {
      console.log('[ImageEditorV6] 🖼️ Loading image:', imageUri);
      setImageLoaded(false);
      
      // ✅ Use Image.getSize instead of Animated.Image.getSize
      Image.getSize(
        imageUri,
        (width, height) => {
          console.log('[ImageEditorV6] ✅ Image loaded:', { width, height });
          setImageDimensions({ width, height });
          setImageLoaded(true);
          
          // Calculate initial scale to fit screen
          const imageRatio = width / height;
          const screenRatio = 1; // Square frame
          
          if (imageRatio > screenRatio) {
            // Image is wider - fit to width
            scale.value = SCREEN_WIDTH / width;
          } else {
            // Image is taller - fit to height
            scale.value = SCREEN_WIDTH / height;
          }
          savedScale.value = scale.value;
        },
        (error) => {
          console.error('[ImageEditorV6] ❌ Error loading image:', error);
          Alert.alert('Error', 'No se pudo cargar la imagen');
          setImageLoaded(false);
        }
      );
    }
  }, [visible, imageUri, savedScale, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
        { rotate: `${rotation}deg` },
        { scaleX: flipHorizontal ? -1 : 1 },
        { scaleY: flipVertical ? -1 : 1 },
      ],
    };
  });

  const resetTransform = () => {
    console.log('[ImageEditorV6] 🔄 Resetting all transformations');
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    setRotation(0);
    setFlipHorizontal(false);
    setFlipVertical(false);
  };

  const handleRotateLeft = () => {
    console.log('[ImageEditorV6] ↶ Rotating left');
    setRotation((rotation - 90) % 360);
  };

  const handleRotateRight = () => {
    console.log('[ImageEditorV6] ↷ Rotating right');
    setRotation((rotation + 90) % 360);
  };

  const handleFlipHorizontal = () => {
    console.log('[ImageEditorV6] ↔️ Flipping horizontal');
    setFlipHorizontal(!flipHorizontal);
  };

  const handleFlipVertical = () => {
    console.log('[ImageEditorV6] ↕️ Flipping vertical');
    setFlipVertical(!flipVertical);
  };

  const applyEdits = async () => {
    if (!imageUri || !imageLoaded) {
      Alert.alert('Error', 'La imagen no está lista');
      return;
    }

    setProcessing(true);
    try {
      console.log('[ImageEditorV6] 🎨 Applying edits...');
      
      const actions: any[] = [];

      // Apply rotation
      if (rotation !== 0) {
        console.log('[ImageEditorV6] ↻ Applying rotation:', rotation);
        actions.push({ rotate: rotation });
      }

      // Apply flips
      if (flipHorizontal) {
        console.log('[ImageEditorV6] ↔️ Applying horizontal flip');
        actions.push({ flip: ImageManipulator.FlipType.Horizontal });
      }
      if (flipVertical) {
        console.log('[ImageEditorV6] ↕️ Applying vertical flip');
        actions.push({ flip: ImageManipulator.FlipType.Vertical });
      }

      // Crop to square (center crop)
      if (imageDimensions.width !== imageDimensions.height) {
        const size = Math.min(imageDimensions.width, imageDimensions.height);
        const originX = (imageDimensions.width - size) / 2;
        const originY = (imageDimensions.height - size) / 2;
        
        console.log('[ImageEditorV6] ✂️ Cropping to square:', { size, originX, originY });
        
        actions.push({
          crop: {
            originX,
            originY,
            width: size,
            height: size,
          },
        });
      }

      console.log('[ImageEditorV6] 🔧 Total actions to apply:', actions.length);

      // Apply all transformations
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        actions,
        { 
          compress: 0.8, 
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );

      console.log('[ImageEditorV6] ✅ Edits applied successfully:', result.uri);
      
      onSave(result.uri);
      resetTransform();
    } catch (error) {
      console.error('[ImageEditorV6] ❌ Error applying edits:', error);
      Alert.alert('Error', 'No se pudieron aplicar los cambios a la imagen');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!processing) {
      resetTransform();
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <GestureHandlerRootView style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity 
            onPress={handleClose} 
            style={styles.headerButton}
            disabled={processing}
          >
            <IconSymbol 
              ios_icon_name="xmark" 
              android_material_icon_name="close" 
              size={24} 
              color={colors.headerText} 
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Imagen</Text>
          <TouchableOpacity 
            onPress={applyEdits} 
            style={styles.headerButton}
            disabled={processing || !imageLoaded}
          >
            {processing ? (
              <ActivityIndicator size="small" color={colors.headerText} />
            ) : (
              <Text style={[styles.headerSaveText, !imageLoaded && styles.headerSaveTextDisabled]}>
                Listo
              </Text>
            )}
          </TouchableOpacity>
        </LinearGradient>

        {/* Image preview area */}
        <View style={styles.previewContainer}>
          <View style={styles.imageFrame}>
            {imageLoaded ? (
              <PanGestureHandler
                onGestureEvent={(event) => {
                  'worklet';
                  translateX.value = savedTranslateX.value + event.translationX;
                  translateY.value = savedTranslateY.value + event.translationY;
                }}
                onEnded={() => {
                  'worklet';
                  savedTranslateX.value = translateX.value;
                  savedTranslateY.value = translateY.value;
                }}
              >
                <Animated.View style={styles.gestureContainer}>
                  <PinchGestureHandler
                    onGestureEvent={(event) => {
                      'worklet';
                      const newScale = savedScale.value * event.scale;
                      scale.value = Math.max(0.5, Math.min(newScale, 5));
                    }}
                    onEnded={() => {
                      'worklet';
                      savedScale.value = scale.value;
                    }}
                  >
                    <Animated.View style={styles.imageContainer}>
                      <Animated.Image 
                        source={{ uri: imageUri }} 
                        style={[
                          {
                            width: SCREEN_WIDTH,
                            height: SCREEN_WIDTH,
                          },
                          animatedStyle
                        ]}
                        resizeMode="contain"
                      />
                    </Animated.View>
                  </PinchGestureHandler>
                </Animated.View>
              </PanGestureHandler>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Cargando imagen...</Text>
              </View>
            )}
          </View>
        </View>

        {/* ✅ CRITICAL FIX v6.2: Controls with proper z-index and elevation for Android */}
        <View style={styles.controlsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.controlsScroll}
          >
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={handleRotateLeft}
              disabled={processing || !imageLoaded}
            >
              <View style={styles.controlIconContainer}>
                <IconSymbol 
                  ios_icon_name="rotate.left" 
                  android_material_icon_name="rotate_left" 
                  size={24} 
                  color={colors.primary} 
                />
              </View>
              <Text style={styles.controlText}>Rotar ↶</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.controlButton}
              onPress={handleRotateRight}
              disabled={processing || !imageLoaded}
            >
              <View style={styles.controlIconContainer}>
                <IconSymbol 
                  ios_icon_name="rotate.right" 
                  android_material_icon_name="rotate_right" 
                  size={24} 
                  color={colors.primary} 
                />
              </View>
              <Text style={styles.controlText}>Rotar ↷</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.controlButton}
              onPress={handleFlipHorizontal}
              disabled={processing || !imageLoaded}
            >
              <View style={styles.controlIconContainer}>
                <IconSymbol 
                  ios_icon_name="arrow.left.and.right" 
                  android_material_icon_name="swap_horiz" 
                  size={24} 
                  color={colors.primary} 
                />
              </View>
              <Text style={styles.controlText}>Voltear ↔</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.controlButton}
              onPress={handleFlipVertical}
              disabled={processing || !imageLoaded}
            >
              <View style={styles.controlIconContainer}>
                <IconSymbol 
                  ios_icon_name="arrow.up.and.down" 
                  android_material_icon_name="swap_vert" 
                  size={24} 
                  color={colors.primary} 
                />
              </View>
              <Text style={styles.controlText}>Voltear ↕</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.controlButton}
              onPress={resetTransform}
              disabled={processing || !imageLoaded}
            >
              <View style={styles.controlIconContainer}>
                <IconSymbol 
                  ios_icon_name="arrow.counterclockwise" 
                  android_material_icon_name="refresh" 
                  size={24} 
                  color={colors.secondary} 
                />
              </View>
              <Text style={styles.controlText}>Restablecer</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.helpContainer}>
            <IconSymbol 
              ios_icon_name="info.circle.fill" 
              android_material_icon_name="info" 
              size={16} 
              color={colors.primary} 
            />
            <Text style={styles.helpText}>
              Pellizca para acercar/alejar • Arrastra para mover
            </Text>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1000,
    elevation: 10,
  },
  headerButton: {
    width: 60,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  headerSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.headerText,
  },
  headerSaveTextDisabled: {
    opacity: 0.5,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  imageFrame: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_WIDTH - 40,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gestureContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  // ✅ CRITICAL FIX v6.2: Controls container with proper z-index and elevation
  controlsContainer: {
    backgroundColor: colors.cardBackground,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    zIndex: 1000,
    elevation: 20,
    position: 'relative',
  },
  controlsScroll: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  controlButton: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minWidth: 90,
  },
  controlIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  helpText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
  },
});
