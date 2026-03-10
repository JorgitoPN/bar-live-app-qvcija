
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

type ShareMode = 'view_once' | 'allow_replay' | 'normal';

interface ImageShareModalProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onSend: (mode: ShareMode) => Promise<void>;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ImageShareModal({ visible, imageUri, onClose, onSend }: ImageShareModalProps) {
  const [selectedMode, setSelectedMode] = useState<ShareMode>('normal');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      await onSend(selectedMode);
      onClose();
    } catch (error) {
      console.error('[ImageShareModal] Error sending image:', error);
    } finally {
      setSending(false);
    }
  };

  const modes = [
    {
      id: 'view_once' as ShareMode,
      title: 'Ver una vez',
      description: 'La imagen desaparece después de abrirla',
      icon: 'visibility_off',
      color: '#FF6B6B',
    },
    {
      id: 'allow_replay' as ShareMode,
      title: 'Permitir volver a ver',
      description: 'Se puede abrir varias veces durante el chat',
      icon: 'replay',
      color: '#4ECDC4',
    },
    {
      id: 'normal' as ShareMode,
      title: 'Envío normal',
      description: 'La imagen queda guardada en el chat',
      icon: 'image',
      color: '#95E1D3',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.header}
          >
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol
                ios_icon_name="xmark"
                android_material_icon_name="close"
                size={scaleIconSize(24)}
                color={colors.headerText}
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { fontSize: scaleFontSize(18) }]}>
              Compartir imagen
            </Text>
            <View style={{ width: 40 }} />
          </LinearGradient>

          {/* Image Preview */}
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="contain" />
          </View>

          {/* Share Mode Options */}
          <View style={styles.optionsContainer}>
            <Text style={[styles.optionsTitle, { fontSize: scaleFontSize(16) }]}>
              ¿Cómo quieres compartir esta imagen?
            </Text>
            
            {modes.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                style={[
                  styles.modeOption,
                  selectedMode === mode.id && styles.modeOptionSelected,
                ]}
                onPress={() => setSelectedMode(mode.id)}
              >
                <View style={[styles.modeIconContainer, { backgroundColor: mode.color + '20' }]}>
                  <IconSymbol
                    ios_icon_name={mode.icon}
                    android_material_icon_name={mode.icon}
                    size={scaleIconSize(24)}
                    color={mode.color}
                  />
                </View>
                <View style={styles.modeTextContainer}>
                  <Text style={[styles.modeTitle, { fontSize: scaleFontSize(16) }]}>
                    {mode.title}
                  </Text>
                  <Text style={[styles.modeDescription, { fontSize: scaleFontSize(13) }]}>
                    {mode.description}
                  </Text>
                </View>
                {selectedMode === mode.id && (
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check_circle"
                    size={scaleIconSize(24)}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            ))}

            {/* Info for ephemeral modes */}
            {(selectedMode === 'view_once' || selectedMode === 'allow_replay') && (
              <View style={styles.infoBox}>
                <IconSymbol
                  ios_icon_name="info.circle"
                  android_material_icon_name="info"
                  size={scaleIconSize(16)}
                  color={colors.primary}
                />
                <Text style={[styles.infoText, { fontSize: scaleFontSize(13) }]}>
                  {selectedMode === 'view_once'
                    ? 'La imagen no se puede descargar ni capturar. Se eliminará automáticamente después de ser vista.'
                    : 'La imagen no se puede descargar ni capturar. Se eliminará cuando finalice el chat.'}
                </Text>
              </View>
            )}
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.headerText} />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="paperplane.fill"
                  android_material_icon_name="send"
                  size={scaleIconSize(20)}
                  color={colors.headerText}
                />
                <Text style={[styles.sendButtonText, { fontSize: scaleFontSize(16) }]}>
                  Enviar imagen
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontWeight: '600',
    color: colors.headerText,
  },
  imagePreviewContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  optionsContainer: {
    padding: 20,
  },
  optionsTitle: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  modeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modeTextContainer: {
    flex: 1,
  },
  modeTitle: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  modeDescription: {
    color: colors.textSecondary,
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    color: colors.text,
    lineHeight: 18,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginHorizontal: 20,
    marginBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontWeight: '600',
    color: colors.headerText,
  },
});
