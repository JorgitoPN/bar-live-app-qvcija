
import React, { useState } from 'react';
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

export default function MagicLinkScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendMagicLink = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor, ingresa tu correo electrónico');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Error', 'Por favor, ingresa un correo electrónico válido');
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      console.log('[MagicLink] 📧 Enviando Magic Link a:', normalizedEmail);

      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: 'https://barliveapp.es/auth/callback',
        },
      });

      if (error) {
        console.error('[MagicLink] ❌ Error:', error);
        Alert.alert('Error', error.message || 'No se pudo enviar el Magic Link');
        return;
      }

      console.log('[MagicLink] ✅ Magic Link enviado exitosamente');
      setEmailSent(true);
      Alert.alert(
        '¡Correo enviado!',
        'Te hemos enviado un enlace mágico. Revisa tu bandeja de entrada (y spam).'
      );
    } catch (error: any) {
      console.error('[MagicLink] ❌ Error inesperado:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={styles.headerTitle}>Magic Link</Text>
        <Text style={styles.headerSubtitle}>Inicia sesión sin contraseña</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          {!emailSent ? (
            <>
              <View style={styles.infoBox}>
                <IconSymbol
                  ios_icon_name="link.circle.fill"
                  android_material_icon_name="link"
                  size={64}
                  color="#8b5cf6"
                />
                <Text style={styles.infoTitle}>Inicio de sesión sin contraseña</Text>
                <Text style={styles.infoText}>
                  Te enviaremos un enlace mágico a tu correo. Haz clic en él para
                  iniciar sesión automáticamente sin necesidad de contraseña.
                </Text>
              </View>

              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput
                style={styles.input}
                placeholder="correo@ejemplo.com"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSendMagicLink}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Enviar Magic Link</Text>
                )}
              </TouchableOpacity>

              <View style={styles.benefitsBox}>
                <Text style={styles.benefitsTitle}>✨ Ventajas del Magic Link</Text>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitBullet}>•</Text>
                  <Text style={styles.benefitText}>
                    No necesitas recordar contraseñas
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitBullet}>•</Text>
                  <Text style={styles.benefitText}>
                    Más seguro que las contraseñas tradicionales
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitBullet}>•</Text>
                  <Text style={styles.benefitText}>
                    Inicio de sesión con un solo clic
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitBullet}>•</Text>
                  <Text style={styles.benefitText}>
                    El enlace expira después de usarlo
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.successBox}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check_circle"
                  size={64}
                  color="#10b981"
                />
                <Text style={styles.successTitle}>¡Correo enviado!</Text>
                <Text style={styles.successText}>
                  Hemos enviado un Magic Link a:
                </Text>
                <Text style={styles.emailText}>{email}</Text>
              </View>

              <View style={styles.instructionsBox}>
                <Text style={styles.instructionsTitle}>📋 Próximos pasos:</Text>
                <Text style={styles.instructionItem}>
                  1. Abre tu correo electrónico
                </Text>
                <Text style={styles.instructionItem}>
                  2. Busca el correo de BarLive
                </Text>
                <Text style={styles.instructionItem}>
                  3. Haz clic en el enlace mágico
                </Text>
                <Text style={styles.instructionItem}>
                  4. ¡Serás redirigido automáticamente!
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.resendButton, loading && styles.resendButtonDisabled]}
                onPress={handleSendMagicLink}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={styles.resendButtonText}>Reenviar enlace</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.backToLoginButton}
            onPress={() => router.replace('/auth/login')}
          >
            <Text style={styles.backToLoginText}>
              Volver a <Text style={styles.backToLoginTextBold}>Iniciar sesión</Text>
            </Text>
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
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  benefitsBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  benefitBullet: {
    fontSize: 16,
    color: '#8b5cf6',
    marginRight: 8,
    fontWeight: 'bold',
  },
  benefitText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  successBox: {
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  successText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    marginTop: 8,
  },
  instructionsBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  instructionItem: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  resendButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  backToLoginButton: {
    alignItems: 'center',
  },
  backToLoginText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  backToLoginTextBold: {
    fontWeight: '600',
    color: colors.primary,
  },
});
