
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

export default function RestablecerPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = (params.email as string) || '';
  
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!code.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Por favor, completa todos los campos');
      return;
    }

    if (code.trim().length !== 6) {
      Alert.alert('Error', 'El código debe tener 6 dígitos');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      // Verify code
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id, verification_code, verification_code_expires_at')
        .eq('email', email)
        .maybeSingle();

      if (userError || !userData) {
        console.error('Error verifying code:', userError);
        Alert.alert('Error', 'No se pudo verificar el código');
        setLoading(false);
        return;
      }

      if (userData.verification_code !== code.trim()) {
        Alert.alert('Error', 'Código incorrecto');
        setLoading(false);
        return;
      }

      const expiresAt = new Date(userData.verification_code_expires_at);
      if (expiresAt < new Date()) {
        Alert.alert('Error', 'El código ha expirado. Por favor, solicita uno nuevo.');
        setLoading(false);
        return;
      }

      // Update password in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error('Error updating password:', updateError);
        Alert.alert('Error', 'No se pudo actualizar la contraseña');
        setLoading(false);
        return;
      }

      // Clear verification code
      await supabase
        .from('usuarios')
        .update({
          verification_code: null,
          verification_code_expires_at: null,
        })
        .eq('email', email);

      Alert.alert(
        'Contraseña actualizada',
        'Tu contraseña ha sido actualizada exitosamente.',
        [
          {
            text: 'Iniciar sesión',
            onPress: () => router.replace('/auth/login'),
          },
        ]
      );
    } catch (error: any) {
      console.error('[RestablecerPassword] Error:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);

    try {
      // Generate new OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Update user with new OTP
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          verification_code: otp,
          verification_code_expires_at: expiresAt.toISOString(),
        })
        .eq('email', email);

      if (updateError) {
        console.error('Error updating verification code:', updateError);
        Alert.alert('Error', 'No se pudo generar un nuevo código');
        setLoading(false);
        return;
      }

      // Send recovery email via Edge Function
      const { error: emailError } = await supabase.functions.invoke(
        'send-verification-email',
        {
          body: {
            email,
            code: otp,
            type: 'password_reset',
          },
        }
      );

      if (emailError) {
        console.error('Error sending recovery email:', emailError);
        Alert.alert('Advertencia', `Código generado pero hubo un problema al enviar el correo.\n\nTu código es: ${otp}`);
      } else {
        Alert.alert('Código enviado', 'Se ha enviado un nuevo código a tu correo electrónico.');
      }
    } catch (error: any) {
      console.error('[RestablecerPassword] Error resending code:', error);
      Alert.alert('Error', 'No se pudo reenviar el código');
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
        <Text style={styles.headerTitle}>Nueva contraseña</Text>
        <Text style={styles.headerSubtitle}>Ingresa el código y tu nueva contraseña</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <Text style={styles.description}>
            Hemos enviado un código de 6 dígitos a {email}
          </Text>

          <Text style={styles.label}>Código de verificación</Text>
          <TextInput
            style={styles.input}
            placeholder="123456"
            placeholderTextColor={colors.textSecondary}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            editable={!loading}
          />

          <Text style={styles.label}>Nueva contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor={colors.textSecondary}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <Text style={styles.label}>Confirmar contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="Repite tu contraseña"
            placeholderTextColor={colors.textSecondary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Restablecer contraseña</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendCode}
            disabled={loading}
          >
            <Text style={styles.resendButtonText}>¿No recibiste el código? Reenviar</Text>
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
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
    lineHeight: 24,
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
    marginTop: 8,
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
  resendButton: {
    alignItems: 'center',
    padding: 12,
  },
  resendButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});
