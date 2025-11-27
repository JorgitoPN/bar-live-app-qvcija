
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

export default function RecuperarPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [email, setEmail] = useState((params.email as string) || '');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendCode = async () => {
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

      // Check if user exists
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id, email_verified')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error checking user:', userError);
        Alert.alert('Error', 'No se pudo verificar el usuario');
        setLoading(false);
        return;
      }

      if (!userData) {
        Alert.alert('Error', 'No existe una cuenta con este correo electrónico');
        setLoading(false);
        return;
      }

      if (!userData.email_verified) {
        Alert.alert('Error', 'Por favor, verifica tu correo electrónico primero');
        setLoading(false);
        return;
      }

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Update user with OTP
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          verification_code: otp,
          verification_code_expires_at: expiresAt.toISOString(),
        })
        .eq('email', normalizedEmail);

      if (updateError) {
        console.error('Error updating verification code:', updateError);
        Alert.alert('Error', 'No se pudo generar el código de recuperación');
        setLoading(false);
        return;
      }

      // Send recovery email via Edge Function
      try {
        const { data: emailData, error: emailError } = await supabase.functions.invoke(
          'send-verification-email',
          {
            body: {
              email: normalizedEmail,
              code: otp,
              type: 'password_reset',
            },
          }
        );

        if (emailError) {
          console.error('Error sending recovery email:', emailError);
          Alert.alert(
            'Advertencia',
            `Código generado pero hubo un problema al enviar el correo.\n\nTu código es: ${otp}\n\nPor favor, anótalo y continúa.`,
            [
              {
                text: 'Continuar',
                onPress: () => {
                  router.push({
                    pathname: '/auth/restablecer-password',
                    params: { email: normalizedEmail },
                  });
                },
              },
            ]
          );
        } else {
          Alert.alert(
            'Código enviado',
            'Hemos enviado un código de recuperación a tu correo electrónico.',
            [
              {
                text: 'Continuar',
                onPress: () => {
                  router.push({
                    pathname: '/auth/restablecer-password',
                    params: { email: normalizedEmail },
                  });
                },
              },
            ]
          );
        }
      } catch (emailError: any) {
        console.error('Error invoking email function:', emailError);
        Alert.alert(
          'Advertencia',
          `Código generado pero no se pudo enviar el correo.\n\nTu código es: ${otp}\n\nPor favor, anótalo y continúa.`,
          [
            {
              text: 'Continuar',
              onPress: () => {
                router.push({
                  pathname: '/auth/restablecer-password',
                  params: { email: normalizedEmail },
                });
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('[RecuperarPassword] Error:', error);
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
        <Text style={styles.headerTitle}>Recuperar contraseña</Text>
        <Text style={styles.headerSubtitle}>Te enviaremos un código</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <Text style={styles.description}>
            Ingresa tu correo electrónico y te enviaremos un código para restablecer tu contraseña.
          </Text>

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
            autoFocus
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSendCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Enviar código</Text>
            )}
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
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
