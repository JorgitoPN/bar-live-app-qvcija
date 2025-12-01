
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

export default function ConfigurarPasswordGoogleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string || '';
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  const handleSetPassword = async () => {
    if (!password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Por favor, completa todos los campos');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      console.log('[ConfigurarPasswordGoogle] 🔑 Configurando contraseña para usuario Google:', email);

      // Send password reset email - this will allow the user to set a password
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://natively.dev/email-confirmed',
      });

      if (resetError) {
        console.error('[ConfigurarPasswordGoogle] ❌ Error sending reset email:', resetError);
        Alert.alert('Error', 'No se pudo enviar el correo. Por favor, intenta nuevamente.');
        setLoading(false);
        return;
      }

      console.log('[ConfigurarPasswordGoogle] ✅ Password reset email sent successfully');
      
      Alert.alert(
        '✅ Correo enviado',
        `Hemos enviado un enlace a ${email} para que puedas configurar tu contraseña. Por favor, revisa tu bandeja de entrada (y la carpeta de spam) y sigue las instrucciones.\n\nUna vez que hayas configurado tu contraseña, podrás iniciar sesión con tu correo y contraseña.`,
        [
          {
            text: 'Entendido',
            onPress: () => {
              router.replace('/auth/login');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('[ConfigurarPasswordGoogle] ❌ Error in handleSetPassword:', error);
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
              ios_icon_name="key.fill"
              android_material_icon_name="vpn_key"
              size={48}
              color={colors.primary}
            />
            <Text style={styles.infoTitle}>Configura tu contraseña</Text>
            <Text style={styles.infoText}>
              Anteriormente iniciaste sesión con Google. Para continuar usando BarLive, 
              necesitas configurar una contraseña para tu cuenta.
            </Text>
            <View style={styles.emailBox}>
              <Text style={styles.emailLabel}>Tu correo:</Text>
              <Text style={styles.emailText}>{email}</Text>
            </View>
          </View>

          <Text style={styles.instructionText}>
            Te enviaremos un correo electrónico con un enlace para configurar tu contraseña. 
            Una vez configurada, podrás iniciar sesión con tu correo y contraseña.
          </Text>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Enviar correo de configuración</Text>
            )}
          </TouchableOpacity>

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
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  emailBox: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    width: '100%',
  },
  emailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  instructionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
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
