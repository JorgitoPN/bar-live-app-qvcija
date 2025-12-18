
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

const PROBLEM_TYPES = [
  { id: 'bug', label: 'Error técnico', icon: 'exclamationmark.triangle', androidIcon: 'bug_report' },
  { id: 'account', label: 'Problema con mi cuenta', icon: 'person.crop.circle.badge.exclamationmark', androidIcon: 'account_circle' },
  { id: 'payment', label: 'Problema de pago', icon: 'creditcard', androidIcon: 'payment' },
  { id: 'content', label: 'Contenido inapropiado', icon: 'flag', androidIcon: 'flag' },
  { id: 'feature', label: 'Sugerencia de mejora', icon: 'lightbulb', androidIcon: 'lightbulb' },
  { id: 'other', label: 'Otro', icon: 'ellipsis.circle', androidIcon: 'more_horiz' },
];

const PRIORITY_LEVELS = [
  { id: 'low', label: 'Baja', color: '#10B981' },
  { id: 'normal', label: 'Normal', color: '#3B82F6' },
  { id: 'high', label: 'Alta', color: '#F59E0B' },
  { id: 'urgent', label: 'Urgente', color: '#EF4444' },
];

export default function ReportarProblemaScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string>('normal');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para enviar un ticket de soporte');
      return;
    }

    if (!selectedType) {
      Alert.alert('Error', 'Por favor selecciona el tipo de problema');
      return;
    }

    if (!subject.trim()) {
      Alert.alert('Error', 'Por favor escribe un asunto');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Por favor describe el problema');
      return;
    }

    setSending(true);

    try {
      console.log('[ReportarProblema] 📝 Creating support ticket...');
      
      // Create support ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: subject.trim(),
          description: description.trim(),
          category: selectedType,
          priority: selectedPriority,
          status: 'open',
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      console.log('[ReportarProblema] ✅ Ticket created:', ticket.ticket_number);

      // Send email notification to admin
      try {
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-support-ticket-email', {
          body: {
            ticketId: ticket.id,
            isNewTicket: true,
          },
        });

        if (emailError) {
          console.error('[ReportarProblema] ⚠️ Email notification failed:', emailError);
        } else {
          console.log('[ReportarProblema] ✅ Email notification sent');
        }
      } catch (emailError) {
        console.error('[ReportarProblema] ⚠️ Email notification error:', emailError);
      }

      Alert.alert(
        '✅ Ticket Enviado',
        `Tu ticket #${ticket.ticket_number} ha sido creado correctamente.\n\nNuestro equipo de soporte te contactará pronto por email.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('[ReportarProblema] Error sending support ticket:', error);
      Alert.alert('Error', error.message || 'No se pudo enviar el ticket. Por favor, intenta de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={commonStyles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reportar Problema</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Tipo de Problema</Text>
          <View style={styles.typesGrid}>
            {PROBLEM_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  selectedType === type.id && styles.typeCardActive,
                ]}
                onPress={() => setSelectedType(type.id)}
              >
                <IconSymbol
                  ios_icon_name={type.icon as any}
                  android_material_icon_name={type.androidIcon}
                  size={28}
                  color={selectedType === type.id ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.typeLabel,
                    selectedType === type.id && styles.typeLabelActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Prioridad</Text>
          <View style={styles.priorityRow}>
            {PRIORITY_LEVELS.map((priority) => (
              <TouchableOpacity
                key={priority.id}
                style={[
                  styles.priorityButton,
                  selectedPriority === priority.id && { 
                    backgroundColor: priority.color + '20',
                    borderColor: priority.color,
                  },
                ]}
                onPress={() => setSelectedPriority(priority.id)}
              >
                <Text
                  style={[
                    styles.priorityLabel,
                    selectedPriority === priority.id && { color: priority.color },
                  ]}
                >
                  {priority.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Asunto</Text>
          <TextInput
            style={styles.input}
            placeholder="Resumen breve del problema"
            placeholderTextColor={colors.textSecondary}
            value={subject}
            onChangeText={setSubject}
            maxLength={100}
          />

          <Text style={styles.sectionTitle}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe el problema con el mayor detalle posible..."
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={8}
            maxLength={1000}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{description.length}/1000 caracteres</Text>

          <View style={styles.infoBox}>
            <IconSymbol ios_icon_name="info.circle.fill" android_material_icon_name="info" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Nuestro equipo revisará tu ticket y te contactará por email en un plazo de 24-48 horas.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, sending && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color={colors.headerText} />
            ) : (
              <>
                <IconSymbol ios_icon_name="paperplane.fill" android_material_icon_name="send" size={20} color={colors.headerText} />
                <Text style={styles.submitButtonText}>Enviar Ticket</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Extra bottom padding to ensure content is visible above keyboard */}
          <View style={{ height: 200 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  typeCard: {
    width: '48%',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  typeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  typeLabelActive: {
    color: colors.primary,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
  },
  priorityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: -12,
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.primary + '15',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.headerText,
  },
});
