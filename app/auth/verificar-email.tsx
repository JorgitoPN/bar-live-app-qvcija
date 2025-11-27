
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

export default function VerificarEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;
  
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Por favor, ingresa el código de verificación');
      return;
    }

    if (code.trim().length !== 6) {
      Alert.alert('Error', 'El código debe tener 6 dígitos');
      return;
    }

    setLoading(true);

    try {
      // Verify the code
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id, verification_code, verification_code_expires_at')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        console.error('[VerificarEmail] Error getting user:', userError);
        Alert.alert('Error', 'No se pudo verificar el código');
        setLoading(false);
        return;
      }

      // Check if code matches
      if (userData.verification_code !== code.trim()) {
        Alert.alert('Error', 'Código incorrecto. Por favor, verifica e intenta nuevamente.');
        setLoading(false);
        return;
      }

      // Check if code is expired
      const expiresAt = new Date(userData.verification_code_expires_at);
      if (expiresAt < new Date()) {
        Alert.alert(
          'Código expirado',
          'El código de verificación ha expirado. Por favor, solicita uno nuevo.',
          [
            {
              text: 'Reenviar código',
              onPress: handleResendCode,
            },
            { text: 'Cancelar', style: 'cancel' },
          ]
        );
        setLoading(false);
        return;
      }

      // Update user as verified
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          email_verified: true,
          verification_code: null,
          verification_code_expires_at: null,
        })
        .eq('id', userData.id);

      if (updateError) {
        console.error('[VerificarEmail] Error updating user:', updateError);
        Alert.alert('Error', 'No se pudo verificar el correo');
        setLoading(false);
        return;
      }

      // Update auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { email_verified: true },
      });

      if (authError) {
        console.error('[VerificarEmail] Error updating auth user:', authError);
      }

      console.log('[VerificarEmail] ✅ Email verified successfully');
      
      Alert.alert(
        'Email verificado',
        'Tu correo electrónico ha sido verificado exitosamente. Ahora puedes iniciar sesión.',
        [
          {
            text: 'Iniciar sesión',
            onPress: () => {
              router.replace('/auth/login');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('[VerificarEmail] ❌ Error in handleVerify:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) {
      Alert.alert('Espera', `Por favor, espera ${countdown} segundos antes de reenviar el código.`);
      return;
    }

    setResending(true);

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
        console.error('[VerificarEmail] Error updating verification code:', updateError);
        Alert.alert('Error', 'No se pudo reenviar el código');
        setResending(false);
        return;
      }

      // Send verification email via Edge Function
      const { data: emailData, error: emailError } = await supabase.functions.invoke(
        'send-verification-email',
        {
          body: {
            email,
            code: otp,
            type: 'verification',
          },
        }
      );

      if (emailError) {
        console.error('[VerificarEmail] Error sending verification email:', emailError);
        const errorMessage = emailError.message || 'Error desconocido';
        const errorDetails = emailData?.details || emailData?.error || '';
        
        Alert.alert(
          'Advertencia',
          `Código actualizado pero hubo un problema al enviar el correo:\n\n${errorMessage}\n\n${errorDetails}\n\nTu nuevo código es: ${otp}`
        );
      } else {
        Alert.alert('Código enviado', 'Se ha enviado un nuevo código de verificación a tu correo.');
        setCountdown(60); // 60 seconds cooldown
      }
    } catch (error: any) {
      console.error('[VerificarEmail] ❌ Error resending code:', error);
      Alert.alert('Error', 'No se pudo reenviar el código de verificación');
    } finally {
      setResending(false);
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
        <Text style={styles.headerTitle}>Verificar email</Text>
        <Text style={styles.headerSubtitle}>Confirma tu correo electrónico</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <View style={styles.infoBox}>
            <IconSymbol
              ios_icon_name="envelope.fill"
              android_material_icon_name="email"
              size={48}
              color={colors.primary}
            />
            <Text style={styles.infoTitle}>Revisa tu correo</Text>
            <Text style={styles.infoText}>
              Hemos enviado un código de verificación de 6 dígitos a:
            </Text>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          <Text style={styles.label}>Código de verificación</Text>
          <TextInput
            style={styles.input}
            placeholder="000000"
            placeholderTextColor={colors.textSecondary}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verificar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>¿No recibiste el código?</Text>
            <TouchableOpacity
              onPress={handleResendCode}
              disabled={resending || countdown > 0}
            >
              <Text style={[
                styles.resendButton,
                (resending || countdown > 0) && styles.resendButtonDisabled
              ]}>
                {countdown > 0 
                  ? `Reenviar en ${countdown}s` 
                  : resending 
                    ? 'Reenviando...' 
                    : 'Reenviar código'}
              </Text>
            </TouchableOpacity>
          </View>
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
    marginBottom: 32,
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
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
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
    fontSize: 24,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 24,
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
  resendContainer: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  resendButton: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  resendButtonDisabled: {
    color: colors.textSecondary,
  },
});
