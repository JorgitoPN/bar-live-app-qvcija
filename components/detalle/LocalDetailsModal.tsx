
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Dimensions,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { BlurView } from 'expo-blur';
import { WebView } from 'react-native-webview';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.9;
const SWIPE_THRESHOLD = 150;

interface LocalDetailsModalProps {
  visible: boolean;
  localId: string;
  onClose: () => void;
}

/**
 * ✅ LOCAL DETAILS MODAL v3.0 - COMPLETELY REBUILT FROM SCRATCH
 * 
 * Features:
 * - ✅ Swipe down to close (mobile-style gesture)
 * - ✅ Click close button to close
 * - ✅ Smooth animations with react-native-reanimated
 * - ✅ Background page visible and dimmed behind modal
 * - ✅ 90% screen coverage
 * - ✅ Rounded top corners
 * - ✅ Visual drag indicator
 * - ✅ Touch and mouse compatible
 * - ✅ WebView cleared on close to release resources
 * - ✅ Close button positioned at top-right (not overlapping badges)
 * - ✅ Close button badge-sized (40x40)
 * - ✅ Background visible when swiping down
 */

export default function LocalDetailsModal({
  visible,
  localId,
  onClose,
}: LocalDetailsModalProps) {
  const translateY = useSharedValue(MODAL_HEIGHT);
  const [webViewKey, setWebViewKey] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (visible) {
      console.log('[LocalDetailsModal] 🚀 Opening modal for local:', localId);
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 90,
      });
    } else {
      translateY.value = MODAL_HEIGHT;
    }
  }, [visible, translateY, localId]);

  const closeModal = () => {
    if (isClosing) return;
    
    console.log('[LocalDetailsModal] 🔽 Closing modal...');
    setIsClosing(true);
    
    translateY.value = withTiming(MODAL_HEIGHT, {
      duration: 300,
    }, () => {
      runOnJS(handleModalClosed)();
    });
  };

  const handleModalClosed = () => {
    console.log('[LocalDetailsModal] ✅ Modal closed, clearing WebView');
    setWebViewKey(prev => prev + 1);
    setIsClosing(false);
    onClose();
  };

  const onGestureEvent = (event: any) => {
    'worklet';
    const translationY = event.translationY;
    
    // Only allow downward swipes
    if (translationY > 0) {
      translateY.value = translationY;
    }
  };

  const onGestureEnd = (event: any) => {
    'worklet';
    const translationY = event.translationY;
    const velocityY = event.velocityY;
    
    // Close if swiped down enough or fast enough
    if (translationY > SWIPE_THRESHOLD || velocityY > 500) {
      translateY.value = withTiming(MODAL_HEIGHT, {
        duration: 300,
      }, () => {
        runOnJS(handleModalClosed)();
      });
    } else {
      // Snap back to open position
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 90,
      });
    }
  };

  const animatedModalStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const animatedBackdropStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [0, MODAL_HEIGHT],
      [0.5, 0],
      Extrapolate.CLAMP
    );
    
    return {
      opacity,
    };
  });

  if (!visible) return null;

  const webViewUrl = `https://barlive.app/detalle/local?id=${localId}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeModal}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
        {/* ✅ Animated backdrop - visible and dimmed */}
        <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1} 
            onPress={closeModal}
          />
        </Animated.View>

        {/* ✅ Animated modal container */}
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onEnded={onGestureEnd}
          activeOffsetY={10}
        >
          <Animated.View style={[styles.modalContainer, animatedModalStyle]}>
            {/* ✅ Drag indicator */}
            <View style={styles.dragIndicatorContainer}>
              <View style={styles.dragIndicator} />
            </View>

            {/* ✅ WebView content */}
            <View style={styles.webViewContainer}>
              <WebView
                key={webViewKey}
                source={{ uri: webViewUrl }}
                style={styles.webView}
                startInLoadingState
                javaScriptEnabled
                domStorageEnabled
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('[LocalDetailsModal] WebView error:', nativeEvent);
                }}
              />
            </View>

            {/* ✅ FIXED: Close button positioned at top-right, badge-sized (40x40) */}
            <TouchableOpacity style={styles.closeButton} onPress={closeModal} activeOpacity={0.8}>
              <BlurView intensity={80} tint="dark" style={styles.closeButtonBlur}>
                <IconSymbol 
                  ios_icon_name="xmark" 
                  android_material_icon_name="close" 
                  size={18} 
                  color="#fff" 
                />
              </BlurView>
            </TouchableOpacity>
          </Animated.View>
        </PanGestureHandler>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: MODAL_HEIGHT,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
  },
  dragIndicatorContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  dragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: colors.textSecondary,
    borderRadius: 3,
    opacity: 0.5,
  },
  // ✅ FIXED: Close button at top-right, badge-sized (40x40), not overlapping badges
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 70 : 60,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  closeButtonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  webView: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
