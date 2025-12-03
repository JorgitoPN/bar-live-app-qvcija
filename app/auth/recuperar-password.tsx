
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
      console.log('[RecuperarPassword] 🌐 Platform:', Platform.OS);

      // Use a single redirect URL for all platforms
      const redirectUrl = 'https://barliveapp.es/auth/reset-password';

      console.log('[RecuperarPassword] 🔗 Redirect URL:', redirectUrl);

      // Send reset email
      console.log('[RecuperarPassword] 📤 Enviando correo de recuperación...');
      
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.log('═══════════════════════════════════════════════════════');
        console.log('[RecuperarPassword] ❌ ERROR AL ENVIAR CORREO');
        console.log('═══════════════════════════════════════════════════════');
        console.error('[RecuperarPassword] Error completo:', JSON.stringify(error, null, 2));
        console.error('[RecuperarPassword] Error code:', error.code);
        console.error('[RecuperarPassword] Error message:', error.message);
        
        // Always show generic message to avoid revealing email existence
        setEmailSent(true);
      } else {
        console.log('═══════════════════════════════════════════════════════');
        console.log('[RecuperarPassword] ✅ CORREO ENVIADO EXITOSAMENTE');
        console.log('═══════════════════════════════════════════════════════');
        console.log('[RecuperarPassword] ✉️ Correo enviado a:', normalizedEmail);
        console.log('[RecuperarPassword] 🔗 Con redirect a:', redirectUrl);
        
        setEmailSent(true);
      }
    } catch (error: any) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('[RecuperarPassword] ❌ EXCEPCIÓN NO CONTROLADA');
      console.log('═══════════════════════════════════════════════════════');
      console.error('[RecuperarPassword] Exception:', JSON.stringify(error, null, 2));
      console.error('[RecuperarPassword] Exception name:', error.name);
      console.error('[RecuperarPassword] Exception message:', error.message);
      console.error('[RecuperarPassword] Exception stack:', error.stack);
      
      // Always show generic message
      setEmailSent(true);
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
        <Text style={styles.headerTitle}>¿Olvidaste tu contraseña?</Text>
        <Text style={styles.headerSubtitle}>No te preocupes, te ayudaremos</Text>
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
                  ios_icon_name="envelope.badge.shield.half.filled"
                  android_material_icon_name="mark_email_unread"
                  size={80}
                  color={colors.primary}
                />
                <Text style={styles.infoTitle}>Recupera tu cuenta</Text>
                <Text style={styles.infoText}>
                  Ingresa tu correo electrónico y te enviaremos un enlace seguro para restablecer tu contraseña.
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Correo electrónico</Text>
                <View style={styles.inputWrapper}>
                  <IconSymbol
                    ios_icon_name="envelope.fill"
                    android_material_icon_name="email"
                    size={20}
                    color={colors.textSecondary}
                    style={styles.inputIcon}
                  />
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
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSendResetEmail}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="paperplane.fill"
                      android_material_icon_name="send"
                      size={20}
                      color="#fff"
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.buttonText}>Enviar enlace de recuperación</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.securityNote}>
                <IconSymbol
                  ios_icon_name="lock.shield.fill"
                  android_material_icon_name="security"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.securityText}>
                  Por seguridad, no revelaremos si este correo está registrado en nuestro sistema.
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.successBox}>
                <IconSymbol
                  ios_icon_name="checkmark.seal.fill"
                  android_material_icon_name="verified"
                  size={80}
                  color="#10b981"
                />
                <Text style={styles.successTitle}>¡Correo enviado!</Text>
                <Text style={styles.successText}>
                  Si existe una cuenta asociada a:
                </Text>
                <View style={styles.emailBadge}>
                  <IconSymbol
                    ios_icon_name="envelope.fill"
                    android_material_icon_name="email"
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.emailText}>{email}</Text>
                </View>
                <Text style={styles.successSubtext}>
                  Recibirás un correo con instrucciones para restablecer tu contraseña.
                </Text>
              </View>

              <View style={styles.instructionsBox}>
                <Text style={styles.instructionsTitle}>📋 Próximos pasos:</Text>
                
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Revisa tu correo</Text>
                    <Text style={styles.stepText}>Busca el correo de Barlive en tu bandeja de entrada</Text>
                  </View>
                </View>

                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Haz clic en el enlace</Text>
                    <Text style={styles.stepText}>Presiona el botón en el correo</Text>
                  </View>
                </View>

                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Crea tu nueva contraseña</Text>
                    <Text style={styles.stepText}>Ingresa una contraseña segura y confírmala</Text>
                  </View>
                </View>

                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>4</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>¡Listo!</Text>
                    <Text style={styles.stepText}>Vuelve a Barlive e inicia sesión</Text>
                  </View>
                </View>
              </View>

              <View style={styles.tipsBox}>
                <Text style={styles.tipsTitle}>💡 Consejos:</Text>
                <Text style={styles.tipText}>• Revisa tu carpeta de spam si no ves el correo</Text>
                <Text style={styles.tipText}>• El enlace expira en 1 hora por seguridad</Text>
                <Text style={styles.tipText}>• Si no recibes el correo, puedes reenviarlo</Text>
              </View>

              <TouchableOpacity
                style={[styles.resendButton, loading && styles.resendButtonDisabled]}
                onPress={() => {
                  setEmailSent(false);
                  handleSendResetEmail();
                }}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="arrow.clockwise"
                      android_material_icon_name="refresh"
                      size={20}
                      color={colors.primary}
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.resendButtonText}>Reenviar correo</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.backToLoginButton}
            onPress={() => router.replace('/auth/login')}
          >
            <IconSymbol
              ios_icon_name="arrow.left"
              android_material_icon_name="arrow_back"
              size={16}
              color={colors.primary}
              style={styles.backToLoginIcon}
            />
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
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  backButton: {
    marginBottom: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
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
    borderRadius: 16,
    padding: 32,
    marginBottom: 32,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  infoTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 12,
    lineHeight: 18,
  },
  successBox: {
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 32,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  successTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 12,
  },
  successText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  successSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  instructionsBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  stepText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  tipsBox: {
    backgroundColor: `${colors.primary}10`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 18,
  },
  resendButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  backToLoginIcon: {
    marginRight: 8,
  },
  backToLoginText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  backToLoginTextBold: {
    fontWeight: '600',
    color: colors.primary,
  },
});
