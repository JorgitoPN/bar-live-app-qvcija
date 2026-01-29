
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface ActiveUser {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
}

interface ReportUserModalProps {
  visible: boolean;
  onClose: () => void;
  reportedUser: ActiveUser | null;
  localId: string;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'acoso', label: 'Acoso' },
  { value: 'contenido_ofensivo', label: 'Contenido Ofensivo' },
  { value: 'comportamiento_inapropiado', label: 'Comportamiento Inapropiado' },
  { value: 'otro', label: 'Otro' },
];

export function ReportUserModal({
  visible,
  onClose,
  reportedUser,
  localId,
}: ReportUserModalProps) {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reportedUser) return;

    if (!selectedReason) {
      Alert.alert('Error', 'Por favor selecciona un motivo');
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('sala_virtual_reportes')
        .insert({
          local_id: localId,
          reportador_id: user.id,
          reportado_id: reportedUser.id,
          motivo: selectedReason,
          descripcion: description.trim() || null,
        });

      if (error) {
        console.error('[Report] Error submitting report:', error);
        Alert.alert('Error', 'No se pudo enviar el reporte');
        return;
      }

      Alert.alert(
        'Reporte Enviado',
        'Gracias por tu reporte. Lo revisaremos pronto.',
        [{ text: 'OK', onPress: () => {
          setSelectedReason('');
          setDescription('');
          onClose();
        }}]
      );
    } catch (error) {
      console.error('[Report] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al enviar el reporte');
    } finally {
      setSubmitting(false);
    }
  };

  if (!reportedUser) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Reportar Usuario</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="close"
                size={28}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.reportContent}>
            <Text style={styles.reportingText}>
              Reportando a: <Text style={styles.reportingName}>{reportedUser.nombre}</Text>
            </Text>

            <Text style={styles.sectionTitle}>Motivo del reporte</Text>
            <View style={styles.reasonsContainer}>
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.value}
                  style={[
                    styles.reasonButton,
                    selectedReason === reason.value && styles.reasonButtonSelected,
                  ]}
                  onPress={() => setSelectedReason(reason.value)}
                >
                  <Text
                    style={[
                      styles.reasonButtonText,
                      selectedReason === reason.value && styles.reasonButtonTextSelected,
                    ]}
                  >
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Descripción (opcional)</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Describe el problema..."
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={500}
            />

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!selectedReason || submitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!selectedReason || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Enviar Reporte</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  reportContent: {
    padding: 20,
  },
  reportingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  reportingName: {
    fontWeight: '600',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  reasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  reasonButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reasonButtonSelected: {
    backgroundColor: colors.error + '20',
    borderColor: colors.error,
  },
  reasonButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  reasonButtonTextSelected: {
    color: colors.error,
  },
  descriptionInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: colors.error,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
