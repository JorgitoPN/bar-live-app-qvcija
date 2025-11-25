
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

export default function RegistroEmailScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleContinue = async () => {
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

      // Check if email already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('usuarios')
        .select('id, email_verified')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking email:', checkError);
        Alert.alert('Error', 'No se pudo verificar el correo. Por favor, intenta nuevamente.');
        setLoading(false);
        return;
      }

      if (existingUser) {
        if (existingUser.email_verified) {
          Alert.alert(
            'Correo ya registrado',
            'Este correo ya está registrado. Por favor, inicia sesión.',
            [
              {
                text: 'Iniciar sesión',
                onPress: () => router.replace('/auth/login-popup'),
              },
              { text: 'Cancelar', style: 'cancel' },
            ]
          );
        } else {
          Alert.alert(
            'Verificación pendiente',
            'Este correo ya está registrado pero no verificado. ¿Deseas reenviar el código de verificación?',
            [
              {
                text: 'Reenviar código',
                onPress: async () => {
                  await resendVerificationCode(normalizedEmail);
                  router.push({
                    pathname: '/auth/verificar-email',
                    params: { email: normalizedEmail },
                  });
                },
              },
              { text: 'Cancelar', style: 'cancel' },
            ]
          );
        }
        setLoading(false);
        return;
      }

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Create user in auth.users first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: `temp_${Math.random().toString(36).substring(7)}`, // Temporary password
        options: {
          data: {
            email: normalizedEmail,
          },
        },
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        Alert.alert('Error', 'No se pudo crear la cuenta. Por favor, intenta nuevamente.');
        setLoading(false);
        return;
      }

      if (!authData.user) {
        Alert.alert('Error', 'No se pudo crear la cuenta. Por favor, intenta nuevamente.');
        setLoading(false);
        return;
      }

      // Create user in usuarios table
      const { error: insertError } = await supabase
        .from('usuarios')
        .insert({
          id: authData.user.id,
          email: normalizedEmail,
          nombre: normalizedEmail.split('@')[0],
          provider: 'barlive',
          email_verified: false,
          verification_code: otp,
          verification_code_expires_at: expiresAt.toISOString(),
          rol_app: 'cliente',
          activo: true,
        });

      if (insertError) {
        console.error('Error creating user:', insertError);
        Alert.alert('Error', 'No se pudo crear la cuenta. Por favor, intenta nuevamente.');
        setLoading(false);
        return;
      }

      // Send verification email via Edge Function
      try {
        const { data: emailData, error: emailError } = await supabase.functions.invoke(
          'send-verification-email',
          {
            body: {
              email: normalizedEmail,
              code: otp,
              type: 'verification',
            },
          }
        );

        if (emailError) {
          console.error('Error sending verification email:', emailError);
          // Don't block the flow if email fails
          Alert.alert(
            'Advertencia',
            `Cuenta creada pero no se pudo enviar el correo de verificación. Tu código es: ${otp}`
          );
        } else {
          console.log('Verification email sent successfully:', emailData);
        }
      } catch (emailError) {
        console.error('Error invoking email function:', emailError);
        // Don't block the flow if email fails
        Alert.alert(
          'Advertencia',
          `Cuenta creada pero no se pudo enviar el correo de verificación. Tu código es: ${otp}`
        );
      }

      // Navigate to verification screen
      router.push({
        pathname: '/auth/verificar-email',
        params: { email: normalizedEmail },
      });
    } catch (error: any) {
      console.error('Error in handleContinue:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationCode = async (email: string) => {
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
        throw updateError;
      }

      // Send verification email via Edge Function
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
          'Advertencia',
          `Código actualizado pero no se pudo enviar el correo. Tu código es: ${otp}`
        );
      }
    } catch (error) {
      console.error('Error resending verification code:', error);
      Alert.alert('Error', 'No se pudo reenviar el código de verificación');
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
        <Text style={styles.headerTitle}>Crear cuenta</Text>
        <Text style={styles.headerSubtitle}>Paso 1 de 4</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>¿Cuál es tu correo?</Text>
          <Text style={styles.stepSubtitle}>
            Te enviaremos un código de verificación
          </Text>

          <TextInput
            style={styles.input}
            placeholder="correo@ejemplo.com"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Continuar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.replace('/auth/login-popup')}
          >
            <Text style={styles.loginButtonText}>
              ¿Ya tienes cuenta? <Text style={styles.loginButtonTextBold}>Inicia sesión</Text>
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
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  dividerText: {
    marginHorizontal: 16,
    color: colors.textSecondary,
    fontSize: 14,
  },
  loginButton: {
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loginButtonTextBold: {
    fontWeight: '600',
    color: colors.primary,
  },
});
