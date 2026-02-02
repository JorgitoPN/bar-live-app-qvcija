
import React, { useState, useRef, useEffect } from 'react';
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
import { getContentBottomPadding, getHeaderTitleSize, getHeaderIconSize, scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

/**
 * ✅ RECUPERAR PASSWORD TOKEN SCREEN v145.0 - AUTH FIX
 * 
 * CRITICAL FIXES v145.0:
 * - ✅ Fixed "Invalid JWT" error by using anon key instead of access_token
 * - ✅ Removed authentication requirement for password reset flow
 * - ✅ Edge Functions now work without user session
 */

export default function RecuperarPasswordTokenScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // ✅ FIX v325.0: Get email from params if provided
  const [email, setEmail] = useState((params.email as string) || '');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [token, setToken] = useState(['', '', '', '', '', '']);
  const [validatingToken, setValidatingToken] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (emailSent && inputRefs.current[0]) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
    }
  }, [emailSent]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendToken = async () => {
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
      console.log('[RecuperarPasswordToken] 🔍 SOLICITUD DE TOKEN');
      console.log('═══════════════════════════════════════════════════════');
      console.log('[RecuperarPasswordToken] 📧 Email:', normalizedEmail);
      console.log('[RecuperarPasswordToken] ⏰ Timestamp:', new Date().toISOString());

      // ✅ FIX: Use supabase.functions.invoke instead of manual fetch
      // This automatically handles authentication with anon key
      const { data, error } = await supabase.functions.invoke('request-password-token', {
        body: { email: normalizedEmail },
      });

      if (error) {
        console.error('[RecuperarPasswordToken] ❌ Error:', error);
        throw new Error(error.message || 'Error al enviar el código');
      }

      console.log('[RecuperarPasswordToken] ✅ Token enviado exitosamente');
      console.log('[RecuperarPasswordToken] 📧 Respuesta:', data);
      setEmailSent(true);
    } catch (error: any) {
      console.error('[RecuperarPasswordToken] ❌ Error:', error);
      Alert.alert(
        'Error',
        'No se pudo enviar el código de recuperación. Por favor, intenta nuevamente.'
      );
    } finally {
      setLoading(false);
      console.log('[RecuperarPasswordToken] 🏁 Proceso finalizado');
      console.log('═══════════════════════════════════════════════════════');
    }
  };

  const handleTokenChange = (value: string, index: number) => {
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newToken = [...token];
    newToken[index] = value;
    setToken(newToken);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !token[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleValidateToken = async () => {
    const fullToken = token.join('');

    if (fullToken.length !== 6) {
      Alert.alert('Error', 'Por favor, ingresa el código completo de 6 dígitos');
      return;
    }

    setValidatingToken(true);

    try {
      console.log('═══════════════════════════════════════════════════════');
      console.log('[RecuperarPasswordToken] 🔍 VALIDACIÓN DE TOKEN');
      console.log('═══════════════════════════════════════════════════════');
      console.log('[RecuperarPasswordToken] 📧 Email:', email);
      console.log('[RecuperarPasswordToken] 🔢 Token:', fullToken);

      // ✅ FIX: Use supabase.functions.invoke instead of manual fetch
      const { data, error } = await supabase.functions.invoke('validate-password-token', {
        body: { 
          email: email.trim().toLowerCase(), 
          token: fullToken 
        },
      });

      if (error) {
        console.error('[RecuperarPasswordToken] ❌ Error:', error);
        throw new Error(error.message || 'Error al validar el código');
      }

      if (!data?.valid) {
        console.error('[RecuperarPasswordToken] ❌ Token inválido:', data?.error);
        Alert.alert(
          'Código inválido',
          data?.error || 'El código ingresado es inválido o ha expirado. Por favor, verifica e intenta nuevamente.',
          [
            {
              text: 'Solicitar nuevo código',
              onPress: () => {
                setEmailSent(false);
                setToken(['', '', '', '', '', '']);
              },
            },
            {
              text: 'Reintentar',
              style: 'cancel',
            },
          ]
        );
        return;
      }

      console.log('[RecuperarPasswordToken] ✅ Token válido');

      router.push({
        pathname: '/auth/nueva-password-token',
        params: { email, token: fullToken },
      });
    } catch (error: any) {
      console.error('[RecuperarPasswordToken] ❌ Error:', error);
      Alert.alert(
        'Error',
        'Ocurrió un error al validar el código. Por favor, intenta nuevamente.'
      );
    } finally {
      setValidatingToken(false);
      console.log('[RecuperarPasswordToken] 🏁 Proceso finalizado');
      console.log('═══════════════════════════════════════════════════════');
    }
  };

  const headerIconSize = getHeaderIconSize();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingBottom: getContentBottomPadding(120) }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
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
              size={headerIconSize}
              color="#fff"
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: getHeaderTitleSize() }]}>¿Olvidaste tu contraseña?</Text>
          <Text style={[styles.headerSubtitle, { fontSize: scaleFontSize(16) }]}>
            {!emailSent ? 'No te preocupes, te ayudaremos' : 'Introduce el código recibido'}
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.formContainer}>
            {!emailSent ? (
              <React.Fragment>
                <View style={styles.infoBox}>
                  <IconSymbol
                    ios_icon_name="envelope.badge.shield.half.filled"
                    android_material_icon_name="mark_email_unread"
                    size={scaleIconSize(80)}
                    color={colors.primary}
                  />
                  <Text style={[styles.infoTitle, { fontSize: scaleFontSize(26) }]}>Recupera tu cuenta</Text>
                  <Text style={[styles.infoText, { fontSize: scaleFontSize(15) }]}>
                    Ingresa tu correo electrónico y te enviaremos un código de 6 dígitos para restablecer tu contraseña.
                  </Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { fontSize: scaleFontSize(15) }]}>Correo electrónico</Text>
                  <View style={styles.inputWrapper}>
                    <IconSymbol
                      ios_icon_name="envelope.fill"
                      android_material_icon_name="email"
                      size={scaleIconSize(20)}
                      color={colors.textSecondary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { fontSize: scaleFontSize(16) }]}
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
                  onPress={handleSendToken}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <React.Fragment>
                      <IconSymbol
                        ios_icon_name="paperplane.fill"
                        android_material_icon_name="send"
                        size={scaleIconSize(20)}
                        color="#fff"
                        style={styles.buttonIcon}
                      />
                      <Text style={[styles.buttonText, { fontSize: scaleFontSize(16) }]}>Enviar código de recuperación</Text>
                    </React.Fragment>
                  )}
                </TouchableOpacity>

                <View style={styles.securityNote}>
                  <IconSymbol
                    ios_icon_name="lock.shield.fill"
                    android_material_icon_name="security"
                    size={scaleIconSize(24)}
                    color={colors.primary}
                  />
                  <Text style={[styles.securityText, { fontSize: scaleFontSize(13) }]}>
                    Por seguridad, no revelaremos si este correo está registrado en nuestro sistema.
                  </Text>
                </View>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <View style={styles.successBox}>
                  <IconSymbol
                    ios_icon_name="checkmark.seal.fill"
                    android_material_icon_name="verified"
                    size={scaleIconSize(80)}
                    color="#10b981"
                  />
                  <Text style={[styles.successTitle, { fontSize: scaleFontSize(26) }]}>¡Correo enviado!</Text>
                  <Text style={[styles.successText, { fontSize: scaleFontSize(15) }]}>
                    Si existe una cuenta asociada a:
                  </Text>
                  <View style={styles.emailBadge}>
                    <IconSymbol
                      ios_icon_name="envelope.fill"
                      android_material_icon_name="email"
                      size={scaleIconSize(16)}
                      color={colors.primary}
                    />
                    <Text style={[styles.emailText, { fontSize: scaleFontSize(16) }]}>{email}</Text>
                  </View>
                  <Text style={[styles.successSubtext, { fontSize: scaleFontSize(14) }]}>
                    Recibirás un correo con un código de 6 dígitos para restablecer tu contraseña.
                  </Text>
                </View>

                <View style={styles.instructionsBox}>
                  <Text style={[styles.instructionsTitle, { fontSize: scaleFontSize(18) }]}>📋 Próximos pasos:</Text>
                  
                  <View style={styles.stepItem}>
                    <View style={styles.stepNumber}>
                      <Text style={[styles.stepNumberText, { fontSize: scaleFontSize(16) }]}>1</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={[styles.stepTitle, { fontSize: scaleFontSize(15) }]}>Revisa tu correo</Text>
                      <Text style={[styles.stepText, { fontSize: scaleFontSize(13) }]}>Busca el correo de Barlive en tu bandeja de entrada</Text>
                    </View>
                  </View>

                  <View style={styles.stepItem}>
                    <View style={styles.stepNumber}>
                      <Text style={[styles.stepNumberText, { fontSize: scaleFontSize(16) }]}>2</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={[styles.stepTitle, { fontSize: scaleFontSize(15) }]}>Copia el código</Text>
                      <Text style={[styles.stepText, { fontSize: scaleFontSize(13) }]}>Copia el código de 6 dígitos del correo</Text>
                    </View>
                  </View>

                  <View style={styles.stepItem}>
                    <View style={styles.stepNumber}>
                      <Text style={[styles.stepNumberText, { fontSize: scaleFontSize(16) }]}>3</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={[styles.stepTitle, { fontSize: scaleFontSize(15) }]}>Introduce el código aquí abajo</Text>
                      <Text style={[styles.stepText, { fontSize: scaleFontSize(13) }]}>Pega o escribe el código en los campos de abajo</Text>
                    </View>
                  </View>

                  <View style={styles.stepItem}>
                    <View style={styles.stepNumber}>
                      <Text style={[styles.stepNumberText, { fontSize: scaleFontSize(16) }]}>4</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={[styles.stepTitle, { fontSize: scaleFontSize(15) }]}>Crea tu nueva contraseña</Text>
                      <Text style={[styles.stepText, { fontSize: scaleFontSize(13) }]}>Ingresa una contraseña segura y confírmala</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.tokenSection}>
                  <Text style={[styles.tokenSectionTitle, { fontSize: scaleFontSize(20) }]}>Introduce el código aquí:</Text>
                  <Text style={[styles.tokenLabel, { fontSize: scaleFontSize(15) }]}>Código de verificación (6 dígitos)</Text>
                  <View style={styles.tokenContainer}>
                    {token.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(ref) => (inputRefs.current[index] = ref)}
                        style={[
                          styles.tokenInput,
                          digit && styles.tokenInputFilled,
                        ]}
                        value={digit}
                        onChangeText={(value) => handleTokenChange(value, index)}
                        onKeyPress={(e) => handleKeyPress(e, index)}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                        editable={!validatingToken}
                      />
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.button, validatingToken && styles.buttonDisabled]}
                    onPress={handleValidateToken}
                    disabled={validatingToken}
                  >
                    {validatingToken ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <React.Fragment>
                        <IconSymbol
                          ios_icon_name="checkmark.circle.fill"
                          android_material_icon_name="check_circle"
                          size={scaleIconSize(20)}
                          color="#fff"
                          style={styles.buttonIcon}
                        />
                        <Text style={[styles.buttonText, { fontSize: scaleFontSize(16) }]}>Validar código y continuar</Text>
                      </React.Fragment>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.tipsBox}>
                  <Text style={[styles.tipsTitle, { fontSize: scaleFontSize(15) }]}>💡 Consejos:</Text>
                  <Text style={[styles.tipText, { fontSize: scaleFontSize(13) }]}>• Revisa tu carpeta de spam si no ves el correo</Text>
                  <Text style={[styles.tipText, { fontSize: scaleFontSize(13) }]}>• El código expira en 1 hora</Text>
                  <Text style={[styles.tipText, { fontSize: scaleFontSize(13) }]}>• Puedes solicitar un nuevo código si es necesario</Text>
                </View>

                <TouchableOpacity
                  style={[styles.resendButton, loading && styles.resendButtonDisabled]}
                  onPress={() => {
                    setToken(['', '', '', '', '', '']);
                    handleSendToken();
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <React.Fragment>
                      <IconSymbol
                        ios_icon_name="arrow.clockwise"
                        android_material_icon_name="refresh"
                        size={scaleIconSize(20)}
                        color={colors.primary}
                        style={styles.buttonIcon}
                      />
                      <Text style={[styles.resendButtonText, { fontSize: scaleFontSize(16) }]}>Reenviar código</Text>
                    </React.Fragment>
                  )}
                </TouchableOpacity>
              </React.Fragment>
            )}

            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={() => router.replace('/auth/login')}
            >
              <IconSymbol
                ios_icon_name="arrow.left"
                android_material_icon_name="arrow_back"
                size={scaleIconSize(16)}
                color={colors.primary}
                style={styles.backToLoginIcon}
              />
              <Text style={[styles.backToLoginText, { fontSize: scaleFontSize(15) }]}>
                Volver a <Text style={styles.backToLoginTextBold}>Iniciar sesión</Text>
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
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 60 : 60,
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
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 8,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
    padding: 24,
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
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 12,
  },
  infoText: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
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
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 12,
  },
  successText: {
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
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  successSubtext: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  instructionsBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  instructionsTitle: {
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
    fontWeight: 'bold',
    color: '#fff',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  stepText: {
    color: colors.textSecondary,
    lineHeight: 18,
  },
  tokenSection: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  tokenSectionTitle: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  tokenLabel: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  tokenContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  tokenInput: {
    width: 50,
    height: 60,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.text,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tokenInputFilled: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  tipsBox: {
    backgroundColor: `${colors.primary}10`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  tipsTitle: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  tipText: {
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
    color: colors.textSecondary,
  },
  backToLoginTextBold: {
    fontWeight: '600',
    color: colors.primary,
  },
});
