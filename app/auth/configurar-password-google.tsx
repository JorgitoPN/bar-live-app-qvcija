
import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

export default function ConfigurarPasswordGoogleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  useEffect(() => {
    if (!email) {
      Alert.alert('Error', 'No se proporcionó un correo electrónico');
      router.back();
    }
  }, [email]);

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  const handleSendResetEmail = async () => {
    if (!email) {
      Alert.alert('Error', 'No se proporcionó un correo electrónico');
      return;
    }

    setLoading(true);

    try {
      console.log('[ConfigurarPasswordGoogle] 📧 Enviando correo de restablecimiento:', email);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://natively.dev/email-confirmed',
      });

      if (error) {
        console.error('[ConfigurarPasswordGoogle] ❌ Error sending reset email:', error);
        Alert.alert('Error', 'No se pudo enviar el correo de restablecimiento. Por favor, intenta nuevamente.');
      } else {
        console.log('[ConfigurarPasswordGoogle] ✅ Reset email sent successfully');
        setResetEmailSent(true);
        Alert.alert(
          'Correo enviado',
          'Te hemos enviado un correo con un enlace para configurar tu contraseña. Por favor, revisa tu bandeja de entrada (y la carpeta de spam).',
          [
            {
              text: 'Entendido',
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('[ConfigurarPasswordGoogle] ❌ Error in handleSendResetEmail:', error);
      Alert.alert('Error', 'Ocurrió un error al enviar el correo');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/auth/login');
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
        <Text style={styles.headerTitle}>Configurar contraseña</Text>
        <Text style={styles.headerSubtitle}>Usuario de Google</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <View style={styles.infoBox}>
            <IconSymbol
              ios_icon_name="person.circle.fill"
              android_material_icon_name="account_circle"
              size={64}
              color={colors.primary}
            />
            <Text style={styles.infoTitle}>¡Hola de nuevo!</Text>
            <Text style={styles.infoText}>
              Tu cuenta fue creada con Google. Para poder iniciar sesión con email y contraseña, necesitas configurar una contraseña.
            </Text>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsTitle}>📋 ¿Cómo funciona?</Text>
            <Text style={styles.instructionItem}>
              1. Haz clic en "Enviar correo de configuración"
            </Text>
            <Text style={styles.instructionItem}>
              2. Recibirás un correo con un enlace seguro
            </Text>
            <Text style={styles.instructionItem}>
              3. Haz clic en el enlace del correo
            </Text>
            <Text style={styles.instructionItem}>
              4. Configura tu nueva contraseña
            </Text>
            <Text style={styles.instructionItem}>
              5. ¡Listo! Ya puedes iniciar sesión con tu contraseña
            </Text>
          </View>

          {resetEmailSent && (
            <View style={styles.successBox}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={32}
                color="#10b981"
              />
              <Text style={styles.successText}>
                Correo enviado exitosamente. Por favor, revisa tu bandeja de entrada.
              </Text>
            </View>
          )}

          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>💡 Importante:</Text>
            <Text style={styles.tipItem}>
              • El enlace expira en 24 horas
            </Text>
            <Text style={styles.tipItem}>
              • Revisa tu carpeta de spam si no lo ves
            </Text>
            <Text style={styles.tipItem}>
              • Puedes solicitar un nuevo correo si es necesario
            </Text>
            <Text style={styles.tipItem}>
              • Una vez configurada, podrás usar tu contraseña para iniciar sesión
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSendResetEmail}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {resetEmailSent ? 'Reenviar correo' : 'Enviar correo de configuración'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToLoginButton}
            onPress={handleBackToLogin}
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
    marginBottom: 12,
    lineHeight: 20,
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
    marginBottom: 16,
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
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    color: '#065f46',
    marginLeft: 12,
    lineHeight: 20,
  },
  tipsBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  tipItem: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 20,
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
