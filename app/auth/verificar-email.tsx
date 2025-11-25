
import React, { useState, useEffect, useRef } from 'react';
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

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleCodeChange = (text: string, index: number) => {
    // Only allow numbers
    if (text && !/^\d+$/.test(text)) return;

    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Auto-focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits are entered
    if (newCode.every(digit => digit !== '') && !loading) {
      verifyCode(newCode.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyCode = async (fullCode: string) => {
    setLoading(true);

    try {
      // Verify the code
      const { data: user, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .eq('verification_code', fullCode)
        .maybeSingle();

      if (error || !user) {
        Alert.alert('Error', 'Código incorrecto. Por favor, intenta nuevamente.');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        setLoading(false);
        return;
      }

      // Check if code is expired
      const expiresAt = new Date(user.verification_code_expires_at);
      if (expiresAt < new Date()) {
        Alert.alert('Error', 'El código ha expirado. Por favor, solicita uno nuevo.');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        setLoading(false);
        return;
      }

      // Mark email as verified
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          email_verified: true,
          verification_code: null,
          verification_code_expires_at: null,
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating user:', updateError);
        Alert.alert('Error', 'No se pudo verificar el correo. Por favor, intenta nuevamente.');
        setLoading(false);
        return;
      }

      // Navigate to next step (basic user data)
      router.replace({
        pathname: '/auth/datos-basicos',
        params: { email, userId: user.id },
      });
    } catch (error: any) {
      console.error('Error verifying code:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;

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
        console.error('Error resending code:', updateError);
        Alert.alert('Error', 'No se pudo reenviar el código. Por favor, intenta nuevamente.');
        setResending(false);
        return;
      }

      // Send verification email via Edge Function
      try {
        const { error: emailError } = await supabase.functions.invoke(
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
          console.error('Error sending verification email:', emailError);
          Alert.alert(
            'Código reenviado',
            `Nuevo código generado pero no se pudo enviar por correo. Tu código es: ${otp}`
          );
        } else {
          Alert.alert('Código reenviado', `Hemos enviado un nuevo código a ${email}`);
        }
      } catch (emailError) {
        console.error('Error invoking email function:', emailError);
        Alert.alert(
          'Código reenviado',
          `Nuevo código generado pero no se pudo enviar por correo. Tu código es: ${otp}`
        );
      }

      setCountdown(60);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      console.error('Error in handleResendCode:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
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
        <Text style={styles.headerTitle}>Verificar correo</Text>
        <Text style={styles.headerSubtitle}>Paso 2 de 4</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Ingresa el código</Text>
          <Text style={styles.stepSubtitle}>
            Enviamos un código de 6 dígitos a{'\n'}
            <Text style={styles.emailText}>{email}</Text>
          </Text>

          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => (inputRefs.current[index] = ref)}
                style={[
                  styles.codeInput,
                  digit && styles.codeInputFilled,
                ]}
                value={digit}
                onChangeText={text => handleCodeChange(text, index)}
                onKeyPress={e => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                editable={!loading}
              />
            ))}
          </View>

          <View style={styles.resendContainer}>
            {countdown > 0 ? (
              <Text style={styles.helperText}>
                Reenviar código en {countdown}s
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResendCode}
                disabled={resending}
              >
                {resending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.resendText}>Reenviar código</Text>
                )}
              </TouchableOpacity>
            )}
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
  stepContainer: {
    flex: 1,
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 48,
    textAlign: 'center',
  },
  emailText: {
    fontWeight: '600',
    color: colors.text,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  codeInput: {
    width: 50,
    height: 60,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  codeInputFilled: {
    borderColor: colors.primary,
  },
  resendContainer: {
    alignItems: 'center',
  },
  helperText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  resendText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
});
