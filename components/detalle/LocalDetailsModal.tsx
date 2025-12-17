
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Dimensions,
  TouchableOpacity,
  Animated,
  PanResponder,
  StatusBar,
  Platform,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { BlurView } from 'expo-blur';
import { WebView } from 'react-native-webview';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.9;
const SWIPE_THRESHOLD = 100;

interface LocalDetailsModalProps {
  visible: boolean;
  localId: string;
  onClose: () => void;
}

/**
 * ✅ LOCAL DETAILS MODAL v2.0 - REBUILT FROM SCRATCH
 * 
 * Features:
 * - Swipe down to close (mobile-style)
 * - Click close button to close
 * - Smooth animations
 * - Background page visible and dimmed
 * - 80-90% screen coverage
 * - Rounded top corners
 * - Visual drag indicator
 * - Touch and mouse compatible
 * - Iframe cleared on close
 * - ✅ Close button positioned higher (not overlapping badges)
 * - ✅ Close button smaller (badge-sized)
 */

export default function LocalDetailsModal({
  visible,
  localId,
  onClose,
}: LocalDetailsModalProps) {
  const translateY = useRef(new Animated.Value(MODAL_HEIGHT)).current;
  const [webViewKey, setWebViewKey] = useState(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > SWIPE_THRESHOLD || gestureState.vy > 0.5) {
          handleClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      translateY.setValue(MODAL_HEIGHT);
    }
  }, [visible, translateY]);

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: MODAL_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setWebViewKey(prev => prev + 1);
      onClose();
    });
  };

  if (!visible) return null;

  const webViewUrl = `https://barlive.app/detalle/local?id=${localId}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0, 0, 0, 0.5)" />
      
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleClose}
        />

        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.dragIndicatorContainer}>
            <View style={styles.dragIndicator} />
          </View>

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
            />
          </View>

          {/* ✅ FIXED: Close button positioned higher and smaller (badge-sized) */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    height: MODAL_HEIGHT,
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  dragIndicatorContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: colors.textSecondary,
    borderRadius: 3,
    opacity: 0.5,
  },
  // ✅ FIXED: Close button positioned higher (not at bottom) and smaller
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 80 : 70,
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
    elevation: 8,
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
