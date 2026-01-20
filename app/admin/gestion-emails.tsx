
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';

export default function GestionEmailsScreen() {
  const router = useRouter();
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [templateContent, setTemplateContent] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const plantillas = [
    {
      id: 'confirm_signup',
      nombre: 'Confirmación de Registro',
      descripcion: 'Enviado al registrarse para verificar el email',
      asunto: 'Confirma tu cuenta en BarLive',
      tipo: 'Supabase Auth',
      contenido: 'Email de confirmación de registro con enlace de verificación',
      editable: true,
    },
    {
      id: 'reset_password',
      nombre: 'Recuperación de Contraseña',
      descripcion: 'Enviado al solicitar restablecer contraseña',
      asunto: 'Restablece tu contraseña en BarLive',
      tipo: 'Supabase Auth',
      contenido: 'Email con enlace para restablecer contraseña',
      editable: true,
    },
    {
      id: 'magic_link',
      nombre: 'Magic Link',
      descripcion: 'Enviado para login sin contraseña',
      asunto: 'Tu enlace de acceso a BarLive',
      tipo: 'Supabase Auth',
      contenido: 'Email con enlace mágico para acceso directo',
      editable: true,
    },
    {
      id: 'email_change',
      nombre: 'Cambio de Email',
      descripcion: 'Enviado al cambiar dirección de correo',
      asunto: 'Confirma tu nuevo email en BarLive',
      tipo: 'Supabase Auth',
      contenido: 'Email de confirmación de cambio de dirección',
      editable: true,
    },
    {
      id: 'local_approval',
      nombre: 'Aprobación de Local',
      descripcion: 'Enviado cuando se aprueba/deniega un local',
      asunto: 'Estado de tu solicitud de local',
      tipo: 'Edge Function',
      contenido: 'Notificación sobre el estado de la solicitud de local',
      editable: false,
    },
    {
      id: 'password_change_confirmation',
      nombre: 'Confirmación de Cambio de Contraseña',
      descripcion: 'Enviado tras cambiar la contraseña exitosamente',
      asunto: 'Tu contraseña ha sido cambiada',
      tipo: 'Edge Function',
      contenido: 'Confirmación de cambio de contraseña',
      editable: false,
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestión de Emails</Text>
        <Text style={styles.headerSubtitle}>
          Plantillas y configuración de correos
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {plantillas.map((plantilla) => (
          <View key={plantilla.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <IconSymbol ios_icon_name="envelope.fill" android_material_icon_name="email" size={24} color={colors.primary} />
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{plantilla.nombre}</Text>
                <Text style={styles.cardDescription}>{plantilla.descripcion}</Text>
              </View>
              <View style={[styles.typeBadge, { backgroundColor: plantilla.tipo === 'Supabase Auth' ? '#3B82F6' : '#8B5CF6' }]}>
                <Text style={styles.typeBadgeText}>{plantilla.tipo}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Asunto:</Text>
              <Text style={styles.detailValue}>{plantilla.asunto}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Contenido:</Text>
              <Text style={styles.detailValue}>{plantilla.contenido}</Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.previewButton]}
                onPress={() => {
                  setTemplateContent(plantilla.contenido);
                  setShowPreview(true);
                }}
              >
                <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={16} color="#3B82F6" />
                <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>Vista Previa</Text>
              </TouchableOpacity>

              {plantilla.editable && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => {
                    Alert.alert(
                      'Editar Plantilla',
                      `Para editar esta plantilla, ve a:\n\nSupabase Dashboard → Authentication → Email Templates\n\nhttps://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/auth/templates`,
                      [
                        { text: 'Entendido', style: 'default' }
                      ]
                    );
                  }}
                >
                  <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={16} color={colors.primary} />
                  <Text style={[styles.actionButtonText, { color: colors.primary }]}>Editar en Supabase</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        <View style={styles.infoCard}>
          <IconSymbol ios_icon_name="info.circle" android_material_icon_name="info" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Información Importante</Text>
            <Text style={styles.infoText}>
              • Los emails de Supabase Auth se editan desde el Dashboard de Supabase{'\n'}
              • Los emails de Edge Functions se gestionan en el código{'\n'}
              • Todos los emails se envían a través de Resend{'\n'}
              • Dominio configurado: noreply@barliveapp.es
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <IconSymbol ios_icon_name="link" android_material_icon_name="link" size={24} color={colors.secondary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Enlaces Rápidos</Text>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => Alert.alert('Supabase Email Templates', 'Abre: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/auth/templates')}
            >
              <Text style={styles.linkText}>→ Editar plantillas en Supabase</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => Alert.alert('Resend Dashboard', 'Abre: https://resend.com/emails')}
            >
              <Text style={styles.linkText}>→ Ver emails enviados en Resend</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Preview Modal */}
      <Modal
        visible={showPreview}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vista Previa del Email</Text>
              <TouchableOpacity onPress={() => setShowPreview(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.previewText}>{templateContent}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 18,
    marginBottom: 15,
    ...commonStyles.shadow,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 3,
  },
  cardDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  previewButton: {
    backgroundColor: '#DBEAFE',
  },
  editButton: {
    backgroundColor: colors.primary + '20',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    marginTop: 20,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 20,
  },
  linkButton: {
    paddingVertical: 6,
  },
  linkText: {
    fontSize: 13,
    color: '#1E40AF',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBody: {
    padding: 20,
  },
  previewText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
});
