
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

export default function CambiarEmailScreen() {
  const router = useRouter();
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  const loadCurrentUser = useCallback(async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('[CambiarEmail] Error al obtener usuario:', error);
        Alert.alert('Error', 'No se pudo obtener la información del usuario');
        router.back();
        return;
      }

      if (!user) {
        Alert.alert('Error', 'Debes iniciar sesión para cambiar tu email');
        router.replace('/auth/login');
        return;
      }

      setCurrentEmail(user.email || '');
    } catch (error) {
      console.error('[CambiarEmail] Error inesperado:', error);
    } finally {
      setLoadingUser(false);
    }
  }, [router]);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Error', 'Por favor, ingresa tu nuevo correo electrónico');
      return;
    }

    if (!validateEmail(newEmail.trim())) {
      Alert.alert('Error', 'Por favor, ingresa un correo electrónico válido');
      return;
    }

    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      Alert.alert('Error', 'El nuevo email debe ser diferente al actual');
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = newEmail.trim().toLowerCase();

      console.log('[CambiarEmail] 📧 Cambiando email a:', normalizedEmail);

      const { error } = await supabase.auth.updateUser({
        email: normalizedEmail,
      });

      if (error) {
        console.error('[CambiarEmail] ❌ Error:', error);
        Alert.alert('Error', error.message || 'No se pudo cambiar el email');
        return;
      }

      console.log('[CambiarEmail] ✅ Solicitud de cambio enviada');
      Alert.alert(
        '¡Correo enviado!',
        `Te hemos enviado un correo de verificación a ${normalizedEmail}. Por favor, verifica tu nuevo email para completar el cambio.`,
        [
          {
            text: 'Entendido',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('[CambiarEmail] ❌ Error inesperado:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  if (loadingUser) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Cambiar email</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cambiar email</Text>
        <Text style={styles.headerSubtitle}>Actualiza tu dirección de correo</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <View style={styles.infoBox}>
            <IconSymbol
              ios_icon_name="envelope.circle.fill"
              android_material_icon_name="email"
              size={64}
              color="#f59e0b"
            />
            <Text style={styles.infoTitle}>Cambio de email</Text>
            <Text style={styles.infoText}>
              Te enviaremos un correo de verificación a tu nueva dirección. Deberás
              confirmar el cambio haciendo clic en el enlace del correo.
            </Text>
          </View>

          <Text style={styles.label}>Email actual</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={currentEmail}
            editable={false}
          />

          <Text style={styles.label}>Nuevo email</Text>
          <TextInput
            style={styles.input}
            placeholder="nuevo@ejemplo.com"
            placeholderTextColor={colors.textSecondary}
            value={newEmail}
            onChangeText={setNewEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <View style={styles.warningBox}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={24}
              color="#f59e0b"
            />
            <Text style={styles.warningText}>
              Importante: Deberás verificar tu nuevo email antes de que el cambio sea
              efectivo. Hasta entonces, podrás seguir usando tu email actual.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleChangeEmail}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Cambiar email</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  formContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  infoBox: {
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
    padding: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#78350f',
    lineHeight: 18,
    marginLeft: 12,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 16,
  },
  cancelButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
