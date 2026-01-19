
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';

export default function ProbarEmailsScreen() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [emailDestino, setEmailDestino] = useState('');
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState('bienvenida');

  const plantillas = [
    { id: 'bienvenida', nombre: 'Email de Bienvenida', icon: 'hand.wave' },
    { id: 'verificacion', nombre: 'Verificación de Email', icon: 'checkmark.shield' },
    { id: 'recuperacion', nombre: 'Recuperación de Contraseña', icon: 'lock.rotation' },
    { id: 'evento', nombre: 'Notificación de Evento', icon: 'calendar' },
  ];

  const enviarEmailPrueba = async () => {
    if (!emailDestino) {
      Alert.alert('Error', 'Ingresa un email de destino');
      return;
    }

    setEnviando(true);
    // Simular envío
    await new Promise(resolve => setTimeout(resolve, 2000));
    setEnviando(false);
    
    Alert.alert(
      'Email Enviado',
      `Email de prueba enviado a ${emailDestino}`
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Probar Emails</Text>
        <Text style={styles.headerSubtitle}>
          Enviar emails de prueba para verificar plantillas
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.label}>Email de Destino</Text>
          <TextInput
            style={styles.input}
            value={emailDestino}
            onChangeText={setEmailDestino}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.sectionTitle}>Seleccionar Plantilla</Text>

        {plantillas.map(plantilla => (
          <TouchableOpacity
            key={plantilla.id}
            style={[
              styles.plantillaCard,
              plantillaSeleccionada === plantilla.id && styles.plantillaCardActive,
            ]}
            onPress={() => setPlantillaSeleccionada(plantilla.id)}
          >
            <View
              style={[
                styles.plantillaIcon,
                plantillaSeleccionada === plantilla.id && styles.plantillaIconActive,
              ]}
            >
              <IconSymbol
                name={plantilla.icon as any}
                size={24}
                color={plantillaSeleccionada === plantilla.id ? 'white' : colors.primary}
              />
            </View>
            <Text
              style={[
                styles.plantillaNombre,
                plantillaSeleccionada === plantilla.id && styles.plantillaNombreActive,
              ]}
            >
              {plantilla.nombre}
            </Text>
            {plantillaSeleccionada === plantilla.id && (
              <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.sendButton, enviando && styles.sendButtonDisabled]}
          onPress={enviarEmailPrueba}
          disabled={enviando}
        >
          {enviando ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <IconSymbol name="paperplane.fill" size={20} color="white" />
              <Text style={styles.sendButtonText}>Enviar Email de Prueba</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <IconSymbol name="info.circle" size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Nota</Text>
            <Text style={styles.infoText}>
              El email de prueba se enviará con datos de ejemplo. Verifica que
              la plantilla se visualice correctamente antes de usarla en producción.
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    marginBottom: 20,
    ...commonStyles.shadow,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  plantillaCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...commonStyles.shadow,
  },
  plantillaCardActive: {
    borderColor: colors.primary,
  },
  plantillaIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  plantillaIconActive: {
    backgroundColor: colors.primary,
  },
  plantillaNombre: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  plantillaNombreActive: {
    color: colors.primary,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    ...commonStyles.shadow,
  },
  sendButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
    lineHeight: 18,
  },
});
