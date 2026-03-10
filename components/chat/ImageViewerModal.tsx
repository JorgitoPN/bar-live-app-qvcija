
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageViewerModalProps {
  visible: boolean;
  imageUrl: string;
  shareMode: 'view_once' | 'allow_replay' | 'normal';
  onClose: () => void;
}

export default function ImageViewerModal({
  visible,
  imageUrl,
  shareMode,
  onClose,
}: ImageViewerModalProps) {
  const [countdown, setCountdown] = useState<number | null>(null);

  // ✅ Screenshot detection warning
  useEffect(() => {
    if (visible && (shareMode === 'view_once' || shareMode === 'allow_replay')) {
      Alert.alert(
        'Imagen efímera',
        'Esta imagen no se puede capturar ni descargar. Se eliminará automáticamente.',
        [{ text: 'Entendido' }]
      );
    }
  }, [visible, shareMode]);

  // ✅ Auto-close for view_once after 10 seconds
  useEffect(() => {
    if (visible && shareMode === 'view_once') {
      setCountdown(10);
      
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            onClose();
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [visible, shareMode, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Blurred Background */}
        {Platform.OS === 'ios' ? (
          <BlurView intensity={100} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.95)' }]} />
        )}

        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <IconSymbol
            ios_icon_name="xmark.circle.fill"
            android_material_icon_name="cancel"
            size={scaleIconSize(36)}
            color={colors.headerText}
          />
        </TouchableOpacity>

        {/* Countdown Badge (view_once only) */}
        {countdown !== null && shareMode === 'view_once' && (
          <View style={styles.countdownBadge}>
            <IconSymbol
              ios_icon_name="timer"
              android_material_icon_name="timer"
              size={scaleIconSize(16)}
              color={colors.headerText}
            />
            <Text style={[styles.countdownText, { fontSize: scaleFontSize(14) }]}>
              {countdown}s
            </Text>
          </View>
        )}

        {/* Mode Badge */}
        <View style={styles.modeBadge}>
          <IconSymbol
            ios_icon_name={shareMode === 'view_once' ? 'eye.slash' : shareMode === 'allow_replay' ? 'arrow.clockwise' : 'photo'}
            android_material_icon_name={shareMode === 'view_once' ? 'visibility_off' : shareMode === 'allow_replay' ? 'replay' : 'image'}
            size={scaleIconSize(16)}
            color={colors.headerText}
          />
          <Text style={[styles.modeText, { fontSize: scaleFontSize(12) }]}>
            {shareMode === 'view_once' ? 'Ver una vez' : shareMode === 'allow_replay' ? 'Volver a ver' : 'Normal'}
          </Text>
        </View>

        {/* Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Warning Text */}
        {(shareMode === 'view_once' || shareMode === 'allow_replay') && (
          <View style={styles.warningContainer}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={scaleIconSize(20)}
              color="#FFD700"
            />
            <Text style={[styles.warningText, { fontSize: scaleFontSize(13) }]}>
              {shareMode === 'view_once'
                ? 'Esta imagen se eliminará automáticamente después de cerrarla'
                : 'Esta imagen se eliminará cuando finalice el chat'}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
  },
  countdownBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    zIndex: 10,
  },
  countdownText: {
    fontWeight: '700',
    color: colors.headerText,
  },
  modeBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    zIndex: 10,
  },
  modeText: {
    fontWeight: '600',
    color: colors.headerText,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  warningContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  warningText: {
    flex: 1,
    color: colors.headerText,
    lineHeight: 18,
  },
});
