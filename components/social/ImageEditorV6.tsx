
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚨 ANDROID-ONLY FIXES v155.0 - IMAGE EDITOR COMPLETELY DISABLED FOR ANDROID
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * CAMBIOS IMPLEMENTADOS v155.0 (ANDROID EXCLUSIVO):
 * - ❌ ELIMINADO: Editor de imágenes completamente deshabilitado para Android
 * - ✅ Las imágenes se guardan directamente sin edición en Android
 * - ✅ El componente retorna null inmediatamente en Android (sin pantalla de edición)
 * - ✅ iOS mantiene el editor de imágenes completo (diseño de referencia)
 * - ✅ Flujo simplificado para Android - sin pantalla de edición
 * - ✅ Todos los hooks declarados al inicio (cumple reglas de React)
 * - ✅ CONFIRMADO: No se muestra el editor al crear publicaciones o momentos en Android
 * - ✅ Usa setTimeout para asegurar que el callback se ejecuta correctamente
 * 
 * ARCHIVOS MODIFICADOS:
 * - components/social/ImageEditorV6.tsx (este archivo)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

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
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ImageEditorV6Props {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onSave: (editedUri: string) => void;
}

/**
 * ✅ IMAGE EDITOR v155.0 - ANDROID EDITOR COMPLETELY DISABLED
 * 
 * CRITICAL CHANGES v155.0 (ANDROID ONLY):
 * - ❌ DISABLED: Image editor completely disabled for Android
 * - ✅ Images are saved directly without editing on Android
 * - ✅ No editor screen shown on Android - component returns null
 * - ✅ Applies to ALL flows: creating posts, creating momentos, uploading images
 * - ✅ iOS keeps the full editor functionality (reference design)
 * - ✅ All hooks declared at the top (React rules compliant)
 * - ✅ Uses setTimeout to ensure callbacks execute properly
 * 
 * iOS Features (unchanged):
 * - ✅ Pinch to zoom (0.5x to 5x)
 * - ✅ Pan to move image
 * - ✅ Rotate 90° left/right
 * - ✅ Flip horizontal/vertical
 * - ✅ Crop to square
 * - ✅ Reset all transformations
 * - ✅ Smooth animations
 * - ✅ Works with both local and remote images
 * - ✅ Proper image loading and error handling
 */

export default function ImageEditorV6({
  visible,
  imageUri,
  onClose,
  onSave,
}: ImageEditorV6Props) {
  // ✅ CRITICAL FIX v154.0: ALL HOOKS DECLARED AT THE TOP (React rules compliant)
  const [processing, setProcessing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [rotation, setRotation] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  
  // Gesture values - MUST be declared unconditionally
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // ✅ CRITICAL FIX v155.0: ANDROID ONLY - Skip editor completely, save image directly
  useEffect(() => {
    if (visible && imageUri && Platform.OS === 'android') {
      console.log('[ImageEditorV6 v155.0] 🤖 Android detected - skipping editor, saving directly');
      // Save image immediately without showing editor
      setTimeout(() => {
        onSave(imageUri);
        onClose();
      }, 0);
    }
  }, [visible, imageUri, onSave, onClose]);

  // iOS-only image loading effect
  useEffect(() => {
    if (Platform.OS === 'android') return; // Skip for Android
    
    if (visible && imageUri) {
      console.log('[ImageEditorV6 v154.0] 🖼️ Loading image (iOS only):', imageUri);
      setImageLoaded(false);
      
      Image.getSize(
        imageUri,
        (width, height) => {
          console.log('[ImageEditorV6 v154.0] ✅ Image loaded:', { width, height });
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
          console.error('[ImageEditorV6 v154.0] ❌ Error loading image:', error);
          Alert.alert('Error', 'No se pudo cargar la imagen');
          setImageLoaded(false);
        }
      );
    }
  }, [visible, imageUri, savedScale, scale]);

  // ✅ CRITICAL FIX v154.0: Animated style MUST be declared unconditionally
  const animatedStyle = useAnimatedStyle(() => {
    if (Platform.OS === 'android') {
      // Return default style for Android (won't be used but must be declared)
      return {};
    }
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
  }, [rotation, flipHorizontal, flipVertical]);

  const resetTransform = () => {
    console.log('[ImageEditorV6 v154.0] 🔄 Resetting all transformations');
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
    console.log('[ImageEditorV6 v154.0] ↶ Rotating left');
    setRotation((rotation - 90) % 360);
  };

  const handleRotateRight = () => {
    console.log('[ImageEditorV6 v154.0] ↷ Rotating right');
    setRotation((rotation + 90) % 360);
  };

  const handleFlipHorizontal = () => {
    console.log('[ImageEditorV6 v154.0] ↔️ Flipping horizontal');
    setFlipHorizontal(!flipHorizontal);
  };

  const handleFlipVertical = () => {
    console.log('[ImageEditorV6 v154.0] ↕️ Flipping vertical');
    setFlipVertical(!flipVertical);
  };

  const applyEdits = async () => {
    if (!imageUri || !imageLoaded) {
      Alert.alert('Error', 'La imagen no está lista');
      return;
    }

    setProcessing(true);
    try {
      console.log('[ImageEditorV6 v154.0] 🎨 Applying edits...');
      
      const actions: any[] = [];

      // Apply rotation
      if (rotation !== 0) {
        console.log('[ImageEditorV6 v154.0] ↻ Applying rotation:', rotation);
        actions.push({ rotate: rotation });
      }

      // Apply flips
      if (flipHorizontal) {
        console.log('[ImageEditorV6 v154.0] ↔️ Applying horizontal flip');
        actions.push({ flip: ImageManipulator.FlipType.Horizontal });
      }
      if (flipVertical) {
        console.log('[ImageEditorV6 v154.0] ↕️ Applying vertical flip');
        actions.push({ flip: ImageManipulator.FlipType.Vertical });
      }

      // Crop to square (center crop)
      if (imageDimensions.width !== imageDimensions.height) {
        const size = Math.min(imageDimensions.width, imageDimensions.height);
        const originX = (imageDimensions.width - size) / 2;
        const originY = (imageDimensions.height - size) / 2;
        
        console.log('[ImageEditorV6 v154.0] ✂️ Cropping to square:', { size, originX, originY });
        
        actions.push({
          crop: {
            originX,
            originY,
            width: size,
            height: size,
          },
        });
      }

      console.log('[ImageEditorV6 v154.0] 🔧 Total actions to apply:', actions.length);

      // Apply all transformations
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        actions,
        { 
          compress: 0.8, 
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );

      console.log('[ImageEditorV6 v154.0] ✅ Edits applied successfully:', result.uri);
      
      onSave(result.uri);
      resetTransform();
    } catch (error) {
      console.error('[ImageEditorV6 v154.0] ❌ Error applying edits:', error);
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

  // ✅ CRITICAL FIX v155.0: ANDROID ONLY - Return null to prevent editor from showing
  // This check MUST come AFTER all hooks are declared
  if (Platform.OS === 'android') {
    console.log('[ImageEditorV6 v155.0] 🤖 Android detected - returning null (no editor)');
    return null;
  }

  // iOS-only rendering below this point
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

        {/* Controls at TOP (below header) */}
        <View style={styles.controlsContainerTop}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.controlsScrollTop}
          >
            <TouchableOpacity 
              style={styles.controlButtonTop}
              onPress={handleRotateLeft}
              disabled={processing || !imageLoaded}
            >
              <View style={styles.controlIconContainerTop}>
                <IconSymbol 
                  ios_icon_name="rotate.left" 
                  android_material_icon_name="rotate_left" 
                  size={24} 
                  color={colors.primary} 
                />
              </View>
              <Text style={styles.controlTextTop}>Rotar ↶</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.controlButtonTop}
              onPress={handleRotateRight}
              disabled={processing || !imageLoaded}
            >
              <View style={styles.controlIconContainerTop}>
                <IconSymbol 
                  ios_icon_name="rotate.right" 
                  android_material_icon_name="rotate_right" 
                  size={24} 
                  color={colors.primary} 
                />
              </View>
              <Text style={styles.controlTextTop}>Rotar ↷</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.controlButtonTop}
              onPress={handleFlipHorizontal}
              disabled={processing || !imageLoaded}
            >
              <View style={styles.controlIconContainerTop}>
                <IconSymbol 
                  ios_icon_name="arrow.left.and.right" 
                  android_material_icon_name="swap_horiz" 
                  size={24} 
                  color={colors.primary} 
                />
              </View>
              <Text style={styles.controlTextTop}>Voltear ↔</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.controlButtonTop}
              onPress={handleFlipVertical}
              disabled={processing || !imageLoaded}
            >
              <View style={styles.controlIconContainerTop}>
                <IconSymbol 
                  ios_icon_name="arrow.up.and.down" 
                  android_material_icon_name="swap_vert" 
                  size={24} 
                  color={colors.primary} 
                />
              </View>
              <Text style={styles.controlTextTop}>Voltear ↕</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.controlButtonTop}
              onPress={resetTransform}
              disabled={processing || !imageLoaded}
            >
              <View style={styles.controlIconContainerTop}>
                <IconSymbol 
                  ios_icon_name="arrow.counterclockwise" 
                  android_material_icon_name="refresh" 
                  size={24} 
                  color={colors.secondary} 
                />
              </View>
              <Text style={styles.controlTextTop}>Restablecer</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Image preview centered in middle of screen */}
        <View style={styles.previewContainerCentered}>
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
                            width: SCREEN_WIDTH - 40,
                            height: SCREEN_WIDTH - 40,
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

        {/* Help text at bottom */}
        <View style={styles.helpContainerBottom}>
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
  controlsContainerTop: {
    backgroundColor: colors.cardBackground,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  controlsScrollTop: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
  },
  controlButtonTop: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minWidth: 85,
  },
  controlIconContainerTop: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlTextTop: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
  },
  previewContainerCentered: {
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
  helpContainerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 20,
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
