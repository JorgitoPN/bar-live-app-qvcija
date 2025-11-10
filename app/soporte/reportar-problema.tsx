
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';

const PROBLEM_TYPES = [
  { id: 'bug', label: 'Error técnico', icon: 'exclamationmark.triangle' },
  { id: 'account', label: 'Problema con mi cuenta', icon: 'person.crop.circle.badge.exclamationmark' },
  { id: 'payment', label: 'Problema de pago', icon: 'creditcard' },
  { id: 'content', label: 'Contenido inapropiado', icon: 'flag' },
  { id: 'feature', label: 'Sugerencia de mejora', icon: 'lightbulb' },
  { id: 'other', label: 'Otro', icon: 'ellipsis.circle' },
];

export default function ReportarProblemaScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
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
      // In production, send this to support system or email
      console.log('Support ticket:', {
        userId: user?.id,
        userEmail: user?.email,
        type: selectedType,
        subject,
        description,
        timestamp: new Date().toISOString(),
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      Alert.alert(
        'Ticket Enviado',
        'Hemos recibido tu reporte. Nuestro equipo de soporte te contactará pronto.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error sending support ticket:', error);
      Alert.alert('Error', 'No se pudo enviar el reporte. Por favor, intenta de nuevo.');
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
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reportar Problema</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
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
                name={type.icon as any}
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
          <IconSymbol name="info.circle.fill" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Nuestro equipo revisará tu reporte y te contactará en un plazo de 24-48 horas.
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
              <IconSymbol name="paperplane.fill" size={20} color={colors.headerText} />
              <Text style={styles.submitButtonText}>Enviar Reporte</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
