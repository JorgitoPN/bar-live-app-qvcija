
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

      console.log('═══════════════════════════════════════════════════════');
      console.log('[RecuperarPassword] 🔍 INICIO DE PROCESO DE RECUPERACIÓN');
      console.log('═══════════════════════════════════════════════════════');
      console.log('[RecuperarPassword] 📧 Email normalizado:', normalizedEmail);
      console.log('[RecuperarPassword] ⏰ Timestamp:', new Date().toISOString());

      // Check if user exists and get provider info
      console.log('[RecuperarPassword] 🔎 Verificando si el usuario existe...');
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id, provider, email_verified')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (userError && userError.code !== 'PGRST116') {
        console.error('[RecuperarPassword] ❌ Error al verificar usuario:', userError);
      }

      if (userData) {
        console.log('[RecuperarPassword] ✅ Usuario encontrado:');
        console.log('[RecuperarPassword]    - ID:', userData.id);
        console.log('[RecuperarPassword]    - Provider:', userData.provider);
        console.log('[RecuperarPassword]    - Email verificado:', userData.email_verified);
      } else {
        console.log('[RecuperarPassword] ⚠️ Usuario no encontrado en la tabla usuarios');
      }

      // Send reset email with correct redirect URL
      console.log('[RecuperarPassword] 📤 Enviando correo de recuperación...');
      
      const startTime = Date.now();
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: 'https://natively.dev/auth/restablecer-password',
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log('[RecuperarPassword] ⏱️ Duración de la llamada:', duration, 'ms');

      if (error) {
        console.log('═══════════════════════════════════════════════════════');
        console.log('[RecuperarPassword] ❌ ERROR AL ENVIAR CORREO');
        console.log('═══════════════════════════════════════════════════════');
        console.error('[RecuperarPassword] Error completo:', JSON.stringify(error, null, 2));
        
        const errorMessage = error.message?.toLowerCase() || '';
        const errorCode = (error as any).code?.toLowerCase() || '';
        
        // Check for domain verification error
        const isDomainError = 
          errorMessage.includes('domain is not verified') ||
          errorMessage.includes('domain not verified') ||
          errorMessage.includes('barlive.app') ||
          errorMessage.includes('450') ||
          errorMessage.includes('unexpected_failure') ||
          errorCode.includes('unexpected_failure') ||
          error.status === 500;

        if (isDomainError) {
          console.log('[RecuperarPassword] 🚨 ERROR DE VERIFICACIÓN DE DOMINIO DETECTADO');
          
          Alert.alert(
            '🚨 Problema de Configuración de Emails',
            '═══════════════════════════════════\n\n' +
            '🔍 PROBLEMA DETECTADO:\n' +
            'El sistema de emails está mal configurado. Hay una discrepancia entre el dominio configurado en Supabase y el dominio verificado en el servicio de emails.\n\n' +
            '📋 DETALLES TÉCNICOS:\n' +
            '• Supabase intenta usar: barlive.app\n' +
            '• DNS configurado para: noreply.barliveapp.es\n' +
            '• Resultado: Los dominios NO coinciden\n\n' +
            '✅ SOLUCIÓN PARA EL ADMINISTRADOR:\n' +
            '1. Ve a Admin → Diagnóstico de Emails\n' +
            '2. Sigue las instrucciones detalladas\n' +
            '3. Elige usar el mismo dominio en ambos lugares\n' +
            '4. Verifica el dominio en Resend\n\n' +
            '⏱️ TIEMPO ESTIMADO: 30-45 minutos\n\n' +
            '💡 MIENTRAS TANTO:\n' +
            'Contacta con soporte para ayuda inmediata:\n' +
            '📧 soporte@barliveapp.es\n\n' +
            '═══════════════════════════════════',
            [
              {
                text: 'Ir a Diagnóstico',
                onPress: () => {
                  router.push('/admin/diagnostico-emails' as any);
                },
              },
              { text: 'Entendido', style: 'cancel' },
            ]
          );
        } else if (errorMessage.includes('email not confirmed')) {
          Alert.alert(
            'Email no verificado',
            'Tu cuenta existe pero el email no ha sido verificado. Por favor, verifica tu email primero.',
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
                    console.error('[RecuperarPassword] ❌ Error al reenviar verificación:', err);
                  }
                },
              },
              { text: 'Cancelar', style: 'cancel' },
            ]
          );
        } else if (errorMessage.includes('rate limit')) {
          Alert.alert(
            'Demasiados intentos',
            'Has intentado restablecer tu contraseña demasiadas veces. Por favor, espera unos minutos.'
          );
        } else {
          Alert.alert(
            'Error al enviar correo',
            `No se pudo enviar el correo de restablecimiento.\n\nError: ${error.message}\n\nContacta con soporte: soporte@barliveapp.es`
          );
        }
      } else {
        console.log('═══════════════════════════════════════════════════════');
        console.log('[RecuperarPassword] ✅ CORREO ENVIADO EXITOSAMENTE');
        console.log('═══════════════════════════════════════════════════════');
        
        setEmailSent(true);
        
        if (userData?.provider === 'google') {
          Alert.alert(
            'Correo enviado',
            'Te hemos enviado un correo para configurar tu contraseña. Como tu cuenta fue creada con Google, este correo te permitirá establecer una contraseña para iniciar sesión.\n\nRevisa tu bandeja de entrada (y spam).'
          );
        } else {
          Alert.alert(
            'Correo enviado',
            'Te hemos enviado un correo con instrucciones para restablecer tu contraseña. Revisa tu bandeja de entrada (y spam).'
          );
        }
      }
    } catch (error: any) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('[RecuperarPassword] ❌ EXCEPCIÓN NO CONTROLADA');
      console.log('═══════════════════════════════════════════════════════');
      console.error('[RecuperarPassword] Exception:', JSON.stringify(error, null, 2));
      
      Alert.alert(
        'Error inesperado',
        `Ocurrió un error inesperado.\n\nContacta con soporte: soporte@barliveapp.es`
      );
    } finally {
      setLoading(false);
      console.log('[RecuperarPassword] 🏁 Proceso finalizado');
      console.log('═══════════════════════════════════════════════════════');
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

              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>⚠️ Problema Conocido</Text>
                <Text style={styles.warningText}>
                  Si ves un error de "dominio no verificado", significa que el sistema de emails está siendo configurado.
                  {'\n\n'}
                  Los administradores pueden ir a:
                  {'\n'}
                  <Text style={styles.warningBold}>Admin → Diagnóstico de Emails</Text>
                  {'\n\n'}
                  Para obtener instrucciones detalladas de cómo resolver el problema.
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
                <Text style={styles.instructionItem}>1. Abre tu correo electrónico</Text>
                <Text style={styles.instructionItem}>2. Busca el correo de BarLive</Text>
                <Text style={styles.instructionItem}>3. Haz clic en el botón "Restablecer contraseña"</Text>
                <Text style={styles.instructionItem}>4. Ingresa tu nueva contraseña</Text>
                <Text style={styles.instructionItem}>5. ¡Listo! Ya puedes iniciar sesión</Text>
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
  warningBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 12,
  },
  warningText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 20,
  },
  warningBold: {
    fontWeight: 'bold',
    color: '#92400e',
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
