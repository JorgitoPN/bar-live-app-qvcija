
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

interface ReportModalProps {
  visible: boolean;
  contentType: 'post' | 'comment';
  contentId: string;
  onClose: () => void;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam', icon: 'exclamationmark.triangle', androidIcon: 'warning' },
  { value: 'harassment', label: 'Acoso', icon: 'person.crop.circle.badge.exclamationmark', androidIcon: 'report' },
  { value: 'inappropriate', label: 'Contenido inapropiado', icon: 'eye.slash', androidIcon: 'visibility_off' },
  { value: 'violence', label: 'Violencia', icon: 'hand.raised', androidIcon: 'block' },
  { value: 'hate_speech', label: 'Discurso de odio', icon: 'bubble.left.and.exclamationmark.bubble.right', androidIcon: 'chat_bubble' },
  { value: 'false_information', label: 'Información falsa', icon: 'info.circle', androidIcon: 'info' },
  { value: 'other', label: 'Otro', icon: 'ellipsis.circle', androidIcon: 'more_horiz' },
];

/**
 * ✅ REPORT MODAL v1.0 - GLOBAL MODERATION SYSTEM
 * 
 * Features:
 * - ✅ Report posts and comments
 * - ✅ Multiple report reasons
 * - ✅ Optional description
 * - ✅ Stores in content_reports table
 * - ✅ Beautiful UI with icons
 */

export default function ReportModal({
  visible,
  contentType,
  contentId,
  onClose,
}: ReportModalProps) {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para reportar contenido');
      return;
    }

    if (!selectedReason) {
      Alert.alert('Selecciona un motivo', 'Por favor selecciona un motivo para el reporte');
      return;
    }

    setSubmitting(true);
    try {
      const reportData: any = {
        reporter_id: user.id,
        content_type: contentType,
        content_id: contentId,
        reason: selectedReason,
        description: description.trim() || null,
      };

      // Add specific ID based on content type
      if (contentType === 'post') {
        reportData.post_id = contentId;
      } else if (contentType === 'comment') {
        reportData.comentario_id = contentId;
      }

      const { error } = await supabase
        .from('content_reports')
        .insert(reportData);

      if (error) throw error;

      Alert.alert(
        '✅ Reporte enviado',
        'Gracias por ayudarnos a mantener la comunidad segura. Revisaremos tu reporte lo antes posible.',
        [{ text: 'OK', onPress: () => {
          setSelectedReason(null);
          setDescription('');
          onClose();
        }}]
      );
    } catch (error) {
      console.error('[ReportModal] Error submitting report:', error);
      Alert.alert('Error', 'No se pudo enviar el reporte. Por favor, intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDescription('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={Platform.OS === 'android' ? false : true}
      animationType="slide"
      presentationStyle={Platform.OS === 'android' ? 'fullScreen' : 'pageSheet'}
      onRequestClose={handleClose}
    >
      <View style={[styles.overlay, Platform.OS === 'android' && styles.overlayAndroid]}>
        <TouchableOpacity 
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={[styles.container, Platform.OS === 'android' && styles.containerAndroid]}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.header}
          >
            <Text style={styles.title}>Reportar {contentType === 'post' ? 'publicación' : 'comentario'}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color={colors.headerText} />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.subtitle}>¿Por qué reportas este contenido?</Text>
            
            <View style={styles.reasonsContainer}>
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.value}
                  style={[
                    styles.reasonCard,
                    selectedReason === reason.value && styles.reasonCardActive,
                  ]}
                  onPress={() => setSelectedReason(reason.value)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.reasonIconContainer,
                    selectedReason === reason.value && styles.reasonIconContainerActive,
                  ]}>
                    <IconSymbol
                      ios_icon_name={reason.icon}
                      android_material_icon_name={reason.androidIcon}
                      size={24}
                      color={selectedReason === reason.value ? colors.white : colors.primary}
                    />
                  </View>
                  <Text style={[
                    styles.reasonLabel,
                    selectedReason === reason.value && styles.reasonLabelActive,
                  ]}>
                    {reason.label}
                  </Text>
                  {selectedReason === reason.value && (
                    <View style={styles.checkmark}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check_circle"
                        size={20}
                        color={colors.primary}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>
                Descripción adicional (opcional)
              </Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="Proporciona más detalles sobre el reporte..."
                placeholderTextColor={colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.characterCount}>
                {description.length}/500
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitButton, (!selectedReason || submitting) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!selectedReason || submitting}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={!selectedReason || submitting ? [colors.textSecondary, colors.textSecondary] : ['#EF4444', '#DC2626']}
                style={styles.submitButtonGradient}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="flag.fill"
                      android_material_icon_name="flag"
                      size={20}
                      color={colors.white}
                    />
                    <Text style={styles.submitButtonText}>Enviar Reporte</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayAndroid: {
    backgroundColor: colors.background,
    justifyContent: 'flex-start',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  containerAndroid: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.headerText,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  reasonsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  reasonCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  reasonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reasonIconContainerActive: {
    backgroundColor: colors.primary,
  },
  reasonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  reasonLabelActive: {
    color: colors.primary,
  },
  checkmark: {
    marginLeft: 8,
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  descriptionInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    minHeight: 100,
    maxHeight: 150,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  characterCount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
