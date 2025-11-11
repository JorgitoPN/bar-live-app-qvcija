
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';

export default function SolicitarRolPropietarioScreen() {
  const router = useRouter();
  const { tipo } = useLocalSearchParams<{ tipo?: string }>();
  const [nombreLocal, setNombreLocal] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [provincia, setProvincia] = useState('');
  const [telefono, setTelefono] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!nombreLocal || !direccion || !ciudad || !provincia) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement actual API call to submit owner request
      console.log('Solicitud de propietario:', {
        tipo,
        nombreLocal,
        direccion,
        ciudad,
        provincia,
        telefono,
        descripcion,
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      Alert.alert(
        'Solicitud enviada',
        'Tu solicitud ha sido enviada correctamente. El equipo de BarLive la revisará y te contactará pronto.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/explorar'),
          },
        ]
      );
    } catch (error) {
      console.error('Error al enviar solicitud:', error);
      Alert.alert('Error', 'No se pudo enviar la solicitud. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
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
          <Text style={styles.headerTitle}>
            {tipo === 'reclamar' ? 'Reclamar Local' : 'Crear Nuevo Local'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.infoCard}>
          <IconSymbol name="info.circle.fill" size={24} color={colors.primary} />
          <Text style={styles.infoText}>
            {tipo === 'reclamar'
              ? 'Reclama tu local existente en BarLive. Verificaremos que eres el propietario antes de aprobar tu solicitud.'
              : 'Crea un nuevo local en BarLive. Tu solicitud será revisada por nuestro equipo antes de ser aprobada.'}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nombre del Local *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Bar El Rincón"
              placeholderTextColor={colors.textSecondary}
              value={nombreLocal}
              onChangeText={setNombreLocal}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Dirección *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Calle Mayor, 123"
              placeholderTextColor={colors.textSecondary}
              value={direccion}
              onChangeText={setDireccion}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Ciudad *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Madrid"
              placeholderTextColor={colors.textSecondary}
              value={ciudad}
              onChangeText={setCiudad}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Provincia *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Madrid"
              placeholderTextColor={colors.textSecondary}
              value={provincia}
              onChangeText={setProvincia}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: +34 912 345 678"
              placeholderTextColor={colors.textSecondary}
              value={telefono}
              onChangeText={setTelefono}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Cuéntanos más sobre tu local..."
              placeholderTextColor={colors.textSecondary}
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              <Text style={styles.submitText}>
                {loading ? 'Enviando...' : 'Enviar Solicitud'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
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
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  submitButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitText: {
    color: colors.headerText,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
