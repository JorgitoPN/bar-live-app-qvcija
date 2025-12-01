
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
        console.error('[RecuperarPassword] Error code:', userError.code);
        console.error('[RecuperarPassword] Error message:', userError.message);
        console.error('[RecuperarPassword] Error details:', JSON.stringify(userError, null, 2));
      }

      if (userData) {
        console.log('[RecuperarPassword] ✅ Usuario encontrado:');
        console.log('[RecuperarPassword]    - ID:', userData.id);
        console.log('[RecuperarPassword]    - Provider:', userData.provider);
        console.log('[RecuperarPassword]    - Email verificado:', userData.email_verified);
      } else {
        console.log('[RecuperarPassword] ⚠️ Usuario no encontrado en la tabla usuarios');
      }

      // Send reset email regardless of whether user exists (security best practice)
      console.log('[RecuperarPassword] 📤 Enviando correo de recuperación...');
      console.log('[RecuperarPassword] Parámetros:');
      console.log('[RecuperarPassword]    - Email:', normalizedEmail);
      console.log('[RecuperarPassword]    - RedirectTo:', 'https://natively.dev/email-confirmed');
      
      const startTime = Date.now();
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: 'https://natively.dev/email-confirmed',
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log('[RecuperarPassword] ⏱️ Duración de la llamada:', duration, 'ms');

      if (error) {
        console.log('═══════════════════════════════════════════════════════');
        console.log('[RecuperarPassword] ❌ ERROR AL ENVIAR CORREO');
        console.log('═══════════════════════════════════════════════════════');
        console.error('[RecuperarPassword] Error completo:', error);
        console.error('[RecuperarPassword] Error name:', error.name);
        console.error('[RecuperarPassword] Error message:', error.message);
        console.error('[RecuperarPassword] Error status:', error.status);
        
        // Log all error properties
        const errorObj = error as any;
        console.error('[RecuperarPassword] Error code:', errorObj.code);
        console.error('[RecuperarPassword] Error __isAuthError:', errorObj.__isAuthError);
        
        // Stringify the entire error object
        console.error('[RecuperarPassword] Error JSON:', JSON.stringify(error, null, 2));
        
        // Log error keys
        console.error('[RecuperarPassword] Error keys:', Object.keys(error));
        
        // Log error prototype
        console.error('[RecuperarPassword] Error prototype:', Object.getPrototypeOf(error));
        
        console.log('═══════════════════════════════════════════════════════');
        
        // Check for domain verification error (450 error or domain not verified message)
        const errorMessage = error.message?.toLowerCase() || '';
        const errorCode = (error as any).code?.toLowerCase() || '';
        const isDomainError = 
          errorMessage.includes('domain is not verified') ||
          errorMessage.includes('domain not verified') ||
          errorMessage.includes('barlive.app') ||
          errorMessage.includes('450') ||
          errorMessage.includes('unexpected_failure') ||
          errorCode.includes('unexpected_failure') ||
          error.status === 500;

        console.log('[RecuperarPassword] 🔍 Análisis del error:');
        console.log('[RecuperarPassword]    - Es error de dominio:', isDomainError);
        console.log('[RecuperarPassword]    - Mensaje contiene "domain":', errorMessage.includes('domain'));
        console.log('[RecuperarPassword]    - Mensaje contiene "450":', errorMessage.includes('450'));
        console.log('[RecuperarPassword]    - Mensaje contiene "unexpected_failure":', errorMessage.includes('unexpected_failure'));
        console.log('[RecuperarPassword]    - Status es 500:', error.status === 500);

        if (isDomainError) {
          console.log('[RecuperarPassword] 🚨 ERROR DE VERIFICACIÓN DE DOMINIO DETECTADO');
          console.log('[RecuperarPassword] 📋 CAUSA RAÍZ:');
          console.log('[RecuperarPassword]    El dominio barlive.app NO está verificado en Resend');
          console.log('[RecuperarPassword]    Faltan registros DNS (DKIM, SPF, DMARC)');
          console.log('[RecuperarPassword] 🔧 SOLUCIÓN:');
          console.log('[RecuperarPassword]    1. Ir a https://resend.com/domains');
          console.log('[RecuperarPassword]    2. Verificar el dominio barlive.app');
          console.log('[RecuperarPassword]    3. Añadir registros DNS en IONOS');
          console.log('[RecuperarPassword]    4. Esperar propagación DNS (15-30 min)');
          
          // Domain verification error - provide detailed guidance
          Alert.alert(
            '🚨 PROBLEMA CRÍTICO: Dominio No Verificado',
            '═══════════════════════════════════\n\n' +
            '🔍 DIAGNÓSTICO:\n' +
            'El dominio "barlive.app" NO está verificado en Resend (servicio de emails).\n\n' +
            '📋 CAUSA RAÍZ:\n' +
            'Faltan registros DNS (DKIM, SPF, DMARC) en el proveedor de dominio (IONOS).\n\n' +
            '❌ IMPACTO:\n' +
            'NO se pueden enviar correos de recuperación de contraseña.\n\n' +
            '✅ SOLUCIÓN PARA EL ADMINISTRADOR:\n' +
            '1. Ir a https://resend.com/domains\n' +
            '2. Seleccionar el dominio barlive.app\n' +
            '3. Copiar los registros DNS mostrados\n' +
            '4. Ir a IONOS (proveedor de dominio)\n' +
            '5. Añadir los registros DNS\n' +
            '6. Esperar propagación (15-30 min)\n' +
            '7. Verificar en Resend\n\n' +
            '💡 ALTERNATIVA TEMPORAL:\n' +
            'Usar emails nativos de Supabase (sin dominio personalizado) hasta que se verifique el dominio.\n\n' +
            '📞 SOPORTE:\n' +
            'soporte@barliveapp.es\n\n' +
            '═══════════════════════════════════',
            [
              {
                text: 'Ver logs completos',
                onPress: () => {
                  console.log('[RecuperarPassword] 📊 LOGS COMPLETOS DISPONIBLES EN CONSOLA');
                },
              },
              { text: 'Entendido', style: 'cancel' },
            ]
          );
        } else if (errorMessage.includes('email not confirmed')) {
          console.log('[RecuperarPassword] ⚠️ Email no verificado');
          Alert.alert(
            'Email no verificado',
            'Tu cuenta existe pero el email no ha sido verificado. Por favor, verifica tu email primero antes de restablecer la contraseña.',
            [
              {
                text: 'Reenviar verificación',
                onPress: async () => {
                  try {
                    console.log('[RecuperarPassword] 📤 Reenviando correo de verificación...');
                    await supabase.auth.resend({
                      type: 'signup',
                      email: normalizedEmail,
                      options: {
                        emailRedirectTo: 'https://natively.dev/email-confirmed',
                      },
                    });
                    console.log('[RecuperarPassword] ✅ Correo de verificación reenviado');
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
          console.log('[RecuperarPassword] ⚠️ Rate limit excedido');
          Alert.alert(
            'Demasiados intentos',
            'Has intentado restablecer tu contraseña demasiadas veces. Por favor, espera unos minutos antes de intentar nuevamente.'
          );
        } else {
          console.log('[RecuperarPassword] ❌ Error genérico');
          Alert.alert(
            'Error al enviar correo',
            'No se pudo enviar el correo de restablecimiento.\n\n' +
            'Detalles técnicos:\n' +
            `- Status: ${error.status}\n` +
            `- Code: ${(error as any).code}\n` +
            `- Message: ${error.message}\n\n` +
            'Por favor, revisa los logs de la consola para más información.\n\n' +
            '📞 Soporte: soporte@barliveapp.es'
          );
        }
      } else {
        console.log('═══════════════════════════════════════════════════════');
        console.log('[RecuperarPassword] ✅ CORREO ENVIADO EXITOSAMENTE');
        console.log('═══════════════════════════════════════════════════════');
        console.log('[RecuperarPassword] 📧 Email destino:', normalizedEmail);
        console.log('[RecuperarPassword] ⏰ Timestamp:', new Date().toISOString());
        console.log('[RecuperarPassword] ⏱️ Duración:', duration, 'ms');
        console.log('═══════════════════════════════════════════════════════');
        
        setEmailSent(true);
        
        // Show different message for Google users
        if (userData?.provider === 'google') {
          console.log('[RecuperarPassword] ℹ️ Usuario de Google detectado');
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
      console.log('═══════════════════════════════════════════════════════');
      console.log('[RecuperarPassword] ❌ EXCEPCIÓN NO CONTROLADA');
      console.log('═══════════════════════════════════════════════════════');
      console.error('[RecuperarPassword] Exception:', error);
      console.error('[RecuperarPassword] Exception name:', error?.name);
      console.error('[RecuperarPassword] Exception message:', error?.message);
      console.error('[RecuperarPassword] Exception stack:', error?.stack);
      console.error('[RecuperarPassword] Exception JSON:', JSON.stringify(error, null, 2));
      console.log('═══════════════════════════════════════════════════════');
      
      Alert.alert(
        'Error inesperado',
        'Ocurrió un error inesperado al enviar el correo.\n\n' +
        'Detalles técnicos:\n' +
        `${error?.message || 'Error desconocido'}\n\n` +
        'Por favor, revisa los logs de la consola para más información.\n\n' +
        '📞 Soporte: soporte@barliveapp.es'
      );
    } finally {
      setLoading(false);
      console.log('[RecuperarPassword] 🏁 Proceso finalizado');
      console.log('═══════════════════════════════════════════════════════');
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

              <View style={styles.criticalWarningBox}>
                <Text style={styles.criticalWarningTitle}>🚨 PROBLEMA CONOCIDO</Text>
                <Text style={styles.criticalWarningText}>
                  Actualmente hay un problema con el envío de correos de recuperación debido a que el dominio "barlive.app" no está verificado en el servicio de emails (Resend).
                  {'\n\n'}
                  <Text style={styles.criticalWarningBold}>Síntomas:</Text>
                  {'\n'}• Error 500: "unexpected_failure"
                  {'\n'}• Error 450: "domain is not verified"
                  {'\n'}• Los correos no llegan
                  {'\n\n'}
                  <Text style={styles.criticalWarningBold}>Causa:</Text>
                  {'\n'}Faltan registros DNS (DKIM, SPF, DMARC) en IONOS
                  {'\n\n'}
                  <Text style={styles.criticalWarningBold}>Solución:</Text>
                  {'\n'}El administrador debe verificar el dominio en Resend y añadir los registros DNS en IONOS.
                  {'\n\n'}
                  <Text style={styles.criticalWarningBold}>Mientras tanto:</Text>
                  {'\n'}Contacta con soporte para ayuda inmediata.
                </Text>
              </View>

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
                  • Si ves un error de "dominio no verificado", contacta con soporte
                </Text>
                <Text style={styles.troubleshootingItem}>
                  • 📞 Soporte: soporte@barliveapp.es
                </Text>
              </View>

              <View style={styles.technicalInfoBox}>
                <Text style={styles.technicalInfoTitle}>🔧 Información técnica</Text>
                <Text style={styles.technicalInfoText}>
                  Si ves un error de "unexpected_failure" o "domain is not verified", 
                  significa que el servicio de correo está siendo configurado por el administrador.
                  {'\n\n'}
                  Este es un problema temporal que se resolverá pronto. Mientras tanto, 
                  contacta con soporte para ayuda inmediata.
                  {'\n\n'}
                  <Text style={styles.technicalInfoBold}>Logs detallados:</Text>
                  {'\n'}Todos los intentos de envío se registran en la consola del navegador/app con información detallada para debugging.
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
  criticalWarningBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  criticalWarningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 12,
  },
  criticalWarningText: {
    fontSize: 13,
    color: '#7f1d1d',
    lineHeight: 20,
  },
  criticalWarningBold: {
    fontWeight: 'bold',
    color: '#991b1b',
  },
  troubleshootingBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
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
  technicalInfoBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  technicalInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  technicalInfoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  technicalInfoBold: {
    fontWeight: 'bold',
    color: colors.text,
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
