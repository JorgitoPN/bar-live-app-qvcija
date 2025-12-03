
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

export default function RecuperarPasswordV6Screen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialEmail = params.email as string || '';
  
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [token, setToken] = useState(['', '', '', '', '', '']);
  const [validatingToken, setValidatingToken] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [tokenValidated, setTokenValidated] = useState(false);
  
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    // Focus first token input when code is sent
    if (codeSent && inputRefs.current[0]) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
    }
  }, [codeSent]);

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

      console.log('═══════════════════════════════════════════════════════');
      console.log('[RecuperarPasswordV6] 🔍 SOLICITUD DE CÓDIGO');
      console.log('═══════════════════════════════════════════════════════');
      console.log('[RecuperarPasswordV6] 📧 Email:', normalizedEmail);

      // Call Edge Function to generate and send token
      const { data, error } = await supabase.functions.invoke('request-password-token', {
        body: { email: normalizedEmail },
      });

      if (error) {
        console.error('[RecuperarPasswordV6] ❌ Error:', error);
        // Always show success message for security
        setCodeSent(true);
      } else {
        console.log('[RecuperarPasswordV6] ✅ Código enviado');
        setCodeSent(true);
      }
    } catch (error: any) {
      console.error('[RecuperarPasswordV6] ❌ Exception:', error);
      // Always show success message for security
      setCodeSent(true);
    } finally {
      setLoading(false);
      console.log('[RecuperarPasswordV6] 🏁 Proceso finalizado');
      console.log('═══════════════════════════════════════════════════════');
    }
  };

  const handleTokenChange = (value: string, index: number) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newToken = [...token];
    newToken[index] = value;
    setToken(newToken);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-validate when all 6 digits are entered
    if (index === 5 && value) {
      const fullToken = [...newToken.slice(0, 5), value].join('');
      if (fullToken.length === 6) {
        setTimeout(() => handleValidateToken(fullToken), 100);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !token[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleValidateToken = async (fullToken?: string) => {
    const tokenToValidate = fullToken || token.join('');

    if (tokenToValidate.length !== 6) {
      Alert.alert('Error', 'Por favor, ingresa el código completo de 6 dígitos');
      return;
    }

    setValidatingToken(true);

    try {
      console.log('═══════════════════════════════════════════════════════');
      console.log('[RecuperarPasswordV6] 🔍 VALIDACIÓN DE TOKEN');
      console.log('═══════════════════════════════════════════════════════');

      const { data, error } = await supabase.functions.invoke('validate-password-token', {
        body: { 
          email: email.trim().toLowerCase(), 
          token: tokenToValidate 
        },
      });

      if (error || !data?.valid) {
        console.error('[RecuperarPasswordV6] ❌ Token inválido');
        Alert.alert(
          'Código inválido',
          'El código ingresado es inválido o ha expirado. Por favor, verifica e intenta nuevamente.',
          [
            {
              text: 'Solicitar nuevo código',
              onPress: () => {
                setCodeSent(false);
                setToken(['', '', '', '', '', '']);
                setTokenValidated(false);
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

      console.log('[RecuperarPasswordV6] ✅ Token válido');
      setTokenValidated(true);
    } catch (error: any) {
      console.error('[RecuperarPasswordV6] ❌ Error:', error);
      Alert.alert('Error', 'Ocurrió un error al validar el código. Por favor, intenta nuevamente.');
    } finally {
      setValidatingToken(false);
      console.log('[RecuperarPasswordV6] 🏁 Validación finalizada');
      console.log('═══════════════════════════════════════════════════════');
    }
  };

  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 8) {
      return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres' };
    }
    
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'La contraseña debe contener al menos una mayúscula' };
    }
    
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'La contraseña debe contener al menos una minúscula' };
    }
    
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'La contraseña debe contener al menos un número' };
    }
    
    return { valid: true };
  };

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Por favor, ingresa tu nueva contraseña');
      return;
    }

    if (!confirmPassword.trim()) {
      Alert.alert('Error', 'Por favor, confirma tu nueva contraseña');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      Alert.alert('Contraseña débil', validation.message);
      return;
    }

    setUpdatingPassword(true);

    try {
      console.log('═══════════════════════════════════════════════════════');
      console.log('[RecuperarPasswordV6] 🔄 ACTUALIZACIÓN DE CONTRASEÑA');
      console.log('═══════════════════════════════════════════════════════');

      const { data, error } = await supabase.functions.invoke('update-password-with-token', {
        body: { 
          email: email.trim().toLowerCase(), 
          token: token.join(''),
          newPassword 
        },
      });

      if (error || !data?.success) {
        console.error('[RecuperarPasswordV6] ❌ Error:', error);
        Alert.alert('Error', 'No se pudo actualizar tu contraseña. Por favor, intenta nuevamente.');
        return;
      }

      console.log('[RecuperarPasswordV6] ✅ Contraseña actualizada');

      // Show success message
      Alert.alert(
        '✔️ Tu contraseña ha sido actualizada correctamente',
        'Iniciando sesión...',
        [
          {
            text: 'OK',
            onPress: async () => {
              // Auto-login
              try {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                  email: email.trim().toLowerCase(),
                  password: newPassword,
                });

                if (signInError) {
                  console.error('[RecuperarPasswordV6] ❌ Error al iniciar sesión:', signInError);
                  // Redirect to login if auto-login fails
                  router.replace('/auth/login');
                } else {
                  console.log('[RecuperarPasswordV6] ✅ Sesión iniciada');
                  // Redirect to Explorar
                  router.replace('/(tabs)/explorar');
                }
              } catch (loginError) {
                console.error('[RecuperarPasswordV6] ❌ Exception al iniciar sesión:', loginError);
                router.replace('/auth/login');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('[RecuperarPasswordV6] ❌ Error:', error);
      Alert.alert('Error inesperado', 'Ocurrió un error inesperado. Por favor, intenta nuevamente.');
    } finally {
      setUpdatingPassword(false);
      console.log('[RecuperarPasswordV6] 🏁 Proceso finalizado');
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
          onPress={() => {
            if (tokenValidated) {
              setTokenValidated(false);
              setNewPassword('');
              setConfirmPassword('');
            } else if (codeSent) {
              setCodeSent(false);
              setToken(['', '', '', '', '', '']);
            } else {
              router.back();
            }
          }}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {tokenValidated ? 'Nueva contraseña' : codeSent ? 'Introduce el código' : '¿Olvidaste tu contraseña?'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {tokenValidated ? 'Crea una contraseña segura' : codeSent ? 'Revisa tu correo electrónico' : 'No te preocupes, te ayudaremos'}
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          {!codeSent ? (
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
                  Ingresa tu correo electrónico y te enviaremos un código de 6 dígitos para restablecer tu contraseña.
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
                onPress={handleSendCode}
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
                    <Text style={styles.buttonText}>Enviar código de recuperación</Text>
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
          ) : !tokenValidated ? (
            <>
              <View style={styles.infoBox}>
                <IconSymbol
                  ios_icon_name="envelope.badge.fill"
                  android_material_icon_name="mark_email_read"
                  size={80}
                  color={colors.primary}
                />
                <Text style={styles.infoTitle}>Código enviado</Text>
                <Text style={styles.infoText}>
                  Hemos enviado un código de 6 dígitos a:
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
              </View>

              <Text style={styles.label}>Código de verificación</Text>
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

              {validatingToken && (
                <View style={styles.validatingContainer}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.validatingText}>Validando código...</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.button, validatingToken && styles.buttonDisabled]}
                onPress={() => handleValidateToken()}
                disabled={validatingToken}
              >
                {validatingToken ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check_circle"
                      size={20}
                      color="#fff"
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.buttonText}>Validar código</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.helpBox}>
                <Text style={styles.helpTitle}>¿No recibiste el código?</Text>
                <Text style={styles.helpText}>
                  • Revisa tu carpeta de spam o correo no deseado
                </Text>
                <Text style={styles.helpText}>
                  • Asegúrate de haber ingresado el correo correcto
                </Text>
                <Text style={styles.helpText}>
                  • El código expira en 15 minutos
                </Text>
              </View>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={() => {
                  setCodeSent(false);
                  setToken(['', '', '', '', '', '']);
                  handleSendCode();
                }}
              >
                <IconSymbol
                  ios_icon_name="arrow.clockwise"
                  android_material_icon_name="refresh"
                  size={20}
                  color={colors.primary}
                  style={styles.buttonIcon}
                />
                <Text style={styles.resendButtonText}>Solicitar nuevo código</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.infoBox}>
                <IconSymbol
                  ios_icon_name="lock.shield.fill"
                  android_material_icon_name="lock"
                  size={64}
                  color={colors.primary}
                />
                <Text style={styles.infoTitle}>Casi listo</Text>
                <Text style={styles.infoText}>
                  Por favor, ingresa tu nueva contraseña. Asegúrate de que sea segura y fácil de recordar.
                </Text>
              </View>

              <Text style={styles.label}>Nueva contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Ingresa tu nueva contraseña"
                  placeholderTextColor={colors.textSecondary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!updatingPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <IconSymbol
                    ios_icon_name={showPassword ? 'eye.slash.fill' : 'eye.fill'}
                    android_material_icon_name={showPassword ? 'visibility_off' : 'visibility'}
                    size={24}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Confirmar contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirma tu nueva contraseña"
                  placeholderTextColor={colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!updatingPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <IconSymbol
                    ios_icon_name={showConfirmPassword ? 'eye.slash.fill' : 'eye.fill'}
                    android_material_icon_name={showConfirmPassword ? 'visibility_off' : 'visibility'}
                    size={24}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.requirementsBox}>
                <Text style={styles.requirementsTitle}>Requisitos de la contraseña:</Text>
                <View style={styles.requirementItem}>
                  <IconSymbol
                    ios_icon_name={newPassword.length >= 8 ? 'checkmark.circle.fill' : 'circle'}
                    android_material_icon_name={newPassword.length >= 8 ? 'check_circle' : 'radio_button_unchecked'}
                    size={20}
                    color={newPassword.length >= 8 ? '#10b981' : colors.textSecondary}
                  />
                  <Text style={[styles.requirementText, newPassword.length >= 8 && styles.requirementTextValid]}>
                    Mínimo 8 caracteres
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <IconSymbol
                    ios_icon_name={/[A-Z]/.test(newPassword) ? 'checkmark.circle.fill' : 'circle'}
                    android_material_icon_name={/[A-Z]/.test(newPassword) ? 'check_circle' : 'radio_button_unchecked'}
                    size={20}
                    color={/[A-Z]/.test(newPassword) ? '#10b981' : colors.textSecondary}
                  />
                  <Text style={[styles.requirementText, /[A-Z]/.test(newPassword) && styles.requirementTextValid]}>
                    Al menos una letra mayúscula
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <IconSymbol
                    ios_icon_name={/[a-z]/.test(newPassword) ? 'checkmark.circle.fill' : 'circle'}
                    android_material_icon_name={/[a-z]/.test(newPassword) ? 'check_circle' : 'radio_button_unchecked'}
                    size={20}
                    color={/[a-z]/.test(newPassword) ? '#10b981' : colors.textSecondary}
                  />
                  <Text style={[styles.requirementText, /[a-z]/.test(newPassword) && styles.requirementTextValid]}>
                    Al menos una letra minúscula
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <IconSymbol
                    ios_icon_name={/[0-9]/.test(newPassword) ? 'checkmark.circle.fill' : 'circle'}
                    android_material_icon_name={/[0-9]/.test(newPassword) ? 'check_circle' : 'radio_button_unchecked'}
                    size={20}
                    color={/[0-9]/.test(newPassword) ? '#10b981' : colors.textSecondary}
                  />
                  <Text style={[styles.requirementText, /[0-9]/.test(newPassword) && styles.requirementTextValid]}>
                    Al menos un número
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, updatingPassword && styles.buttonDisabled]}
                onPress={handleUpdatePassword}
                disabled={updatingPassword}
              >
                {updatingPassword ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check_circle"
                      size={20}
                      color="#fff"
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.buttonText}>Actualizar contraseña</Text>
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
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
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
  tokenContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  tokenInput: {
    width: 50,
    height: 60,
    backgroundColor: colors.cardBackground,
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
  validatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  validatingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 12,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  eyeButton: {
    padding: 16,
  },
  requirementsBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  requirementText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 12,
  },
  requirementTextValid: {
    color: '#10b981',
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
  helpBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  helpText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
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
