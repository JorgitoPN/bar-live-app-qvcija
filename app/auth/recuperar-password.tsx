
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
  const initialEmail = params.email as string || '';
  
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendResetEmail = async () => {
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

      console.log('[RecuperarPassword] 📧 Enviando correo de restablecimiento:', normalizedEmail);

      // Check if user exists and get provider info
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id, provider, email_verified')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (userError && userError.code !== 'PGRST116') {
        console.error('[RecuperarPassword] Error checking user:', userError);
      }

      // Send reset email regardless of whether user exists (security best practice)
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: 'https://natively.dev/email-confirmed',
      });

      if (error) {
        console.error('[RecuperarPassword] ❌ Error sending reset email:', error);
        console.error('[RecuperarPassword] Error details:', JSON.stringify(error, null, 2));
        
        // Provide more specific error messages
        if (error.message.includes('Email not confirmed')) {
          Alert.alert(
            'Email no verificado',
            'Tu cuenta existe pero el email no ha sido verificado. Por favor, verifica tu email primero antes de restablecer la contraseña.',
            [
              {
                text: 'Reenviar verificación',
                onPress: async () => {
                  try {
                    await supabase.auth.resend({
                      type: 'signup',
                      email: normalizedEmail,
                      options: {
                        emailRedirectTo: 'https://natively.dev/email-confirmed',
                      },
                    });
                    Alert.alert('Correo enviado', 'Se ha enviado un nuevo correo de verificación.');
                  } catch (err) {
                    console.error('Error resending verification:', err);
                  }
                },
              },
              { text: 'Cancelar', style: 'cancel' },
            ]
          );
        } else if (error.message.includes('rate limit')) {
          Alert.alert(
            'Demasiados intentos',
            'Has intentado restablecer tu contraseña demasiadas veces. Por favor, espera unos minutos antes de intentar nuevamente.'
          );
        } else if (error.message.includes('domain is not verified') || error.message.includes('450')) {
          // Domain verification error - provide detailed guidance
          Alert.alert(
            '⚠️ Servicio de correo en configuración',
            'El servicio de correo está siendo configurado por el administrador.\n\n' +
            '📧 Problema técnico:\n' +
            'El dominio de correo no está verificado en el servidor de emails.\n\n' +
            '✅ Solución temporal:\n' +
            'Por favor, contacta con soporte para que te ayuden a restablecer tu contraseña manualmente.\n\n' +
            '📞 Soporte: soporte@barliveapp.es\n\n' +
            'Disculpa las molestias. Estamos trabajando para resolver esto lo antes posible.',
            [
              {
                text: 'Contactar soporte',
                onPress: () => {
                  // TODO: Open email client or support chat
                  console.log('Opening support contact');
                },
              },
              { text: 'Entendido', style: 'cancel' },
            ]
          );
        } else {
          Alert.alert(
            'Error al enviar correo',
            'No se pudo enviar el correo de restablecimiento. Esto puede deberse a un problema temporal con el servicio de correo.\n\n' +
            'Por favor, intenta nuevamente en unos minutos o contacta con soporte si el problema persiste.\n\n' +
            '📞 Soporte: soporte@barliveapp.es'
          );
        }
      } else {
        console.log('[RecuperarPassword] ✅ Reset email sent successfully');
        setEmailSent(true);
        
        // Show different message for Google users
        if (userData?.provider === 'google') {
          Alert.alert(
            'Correo enviado',
            'Te hemos enviado un correo para configurar tu contraseña. Como tu cuenta fue creada con Google, este correo te permitirá establecer una contraseña para iniciar sesión.\n\nPor favor, revisa tu bandeja de entrada (y la carpeta de spam).',
            [{ text: 'Entendido' }]
          );
        } else {
          Alert.alert(
            'Correo enviado',
            'Te hemos enviado un correo con instrucciones para restablecer tu contraseña. Por favor, revisa tu bandeja de entrada (y la carpeta de spam).',
            [{ text: 'Entendido' }]
          );
        }
      }
    } catch (error: any) {
      console.error('[RecuperarPassword] ❌ Error in handleSendResetEmail:', error);
      Alert.alert(
        'Error inesperado',
        'Ocurrió un error inesperado al enviar el correo. Por favor, intenta nuevamente o contacta con soporte.\n\n' +
        '📞 Soporte: soporte@barliveapp.es'
      );
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
        <Text style={styles.headerTitle}>Recuperar contraseña</Text>
        <Text style={styles.headerSubtitle}>Te ayudaremos a recuperar tu cuenta</Text>
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
                  ios_icon_name="lock.shield.fill"
                  android_material_icon_name="lock"
                  size={64}
                  color={colors.primary}
                />
                <Text style={styles.infoTitle}>¿Olvidaste tu contraseña?</Text>
                <Text style={styles.infoText}>
                  No te preocupes, te enviaremos un correo con instrucciones para restablecer tu contraseña.
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
                onPress={handleSendResetEmail}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Enviar correo de recuperación</Text>
                )}
              </TouchableOpacity>

              <View style={styles.troubleshootingBox}>
                <Text style={styles.troubleshootingTitle}>⚠️ ¿No recibes el correo?</Text>
                <Text style={styles.troubleshootingItem}>
                  • Revisa tu carpeta de spam o correo no deseado
                </Text>
                <Text style={styles.troubleshootingItem}>
                  • Verifica que el correo esté escrito correctamente
                </Text>
                <Text style={styles.troubleshootingItem}>
                  • Espera unos minutos, a veces puede tardar
                </Text>
                <Text style={styles.troubleshootingItem}>
                  • Si el problema persiste, contacta con soporte
                </Text>
                <Text style={styles.troubleshootingItem}>
                  • 📞 Soporte: soporte@barliveapp.es
                </Text>
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
                  Hemos enviado un correo a:
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
                  3. Haz clic en el enlace de restablecimiento
                </Text>
                <Text style={styles.instructionItem}>
                  4. Configura tu nueva contraseña
                </Text>
                <Text style={styles.instructionItem}>
                  5. ¡Listo! Ya puedes iniciar sesión
                </Text>
              </View>

              <View style={styles.tipsBox}>
                <Text style={styles.tipsTitle}>💡 Consejos:</Text>
                <Text style={styles.tipItem}>
                  • Revisa tu carpeta de spam
                </Text>
                <Text style={styles.tipItem}>
                  • El enlace expira en 24 horas
                </Text>
                <Text style={styles.tipItem}>
                  • Puedes solicitar un nuevo correo si no lo recibes
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.resendButton, loading && styles.resendButtonDisabled]}
                onPress={handleSendResetEmail}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={styles.resendButtonText}>Reenviar correo</Text>
                )}
              </TouchableOpacity>
            </>
          )}

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
  troubleshootingBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  troubleshootingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  troubleshootingItem: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
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
