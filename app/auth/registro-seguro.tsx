
/**
 * 🔐 SECURE REGISTRATION SCREEN v1.0 - ANTI-HACKING PROTECTION
 * 
 * SECURITY FEATURES:
 * - ✅ Password strength validation (8+ chars, uppercase, lowercase, numbers, special chars)
 * - ✅ CAPTCHA verification on registration
 * - ✅ Email verification required
 * - ✅ Password confirmation matching
 * - ✅ Common password detection
 * - ✅ Real-time password strength indicator
 * 
 * FLOW:
 * 1. User enters registration details
 * 2. Validate password strength
 * 3. Show CAPTCHA verification
 * 4. Create account with bcrypt hashing (Supabase)
 * 5. Send email verification
 * 6. Redirect to verification screen
 */

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
import { supabase } from '@/app/integrations/supabase/client';
import { getContentBottomPadding, getHeaderTitleSize, getHeaderIconSize, scaleFontSize } from '@/utils/androidScaling';
import CaptchaModal from '@/components/auth/CaptchaModal';
import {
  validatePasswordStrength,
  validateEmail,
  isCommonPassword,
  logSecurityEvent,
  verifyCaptchaToken,
} from '@/utils/securityService';

export default function SecureRegistrationScreen() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    const validation = validatePasswordStrength(text);
    setPasswordStrength(validation.strength);
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 'strong':
        return '#10b981';
      case 'medium':
        return '#f59e0b';
      case 'weak':
        return '#ef4444';
      default:
        return colors.cardBorder;
    }
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 'strong':
        return '✅ Contraseña fuerte';
      case 'medium':
        return '⚠️ Contraseña media';
      case 'weak':
        return '❌ Contraseña débil';
      default:
        return '';
    }
  };

  const handleRegister = async () => {
    // Validate all fields
    if (!nombre.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Por favor, completa todos los campos');
      return;
    }

    // Validate email format
    if (!validateEmail(email.trim())) {
      Alert.alert('Error', 'Por favor, ingresa un correo electrónico válido');
      return;
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      Alert.alert(
        'Contraseña débil',
        'Tu contraseña debe cumplir los siguientes requisitos:\n\n' + passwordValidation.errors.join('\n'),
        [{ text: 'Entendido' }]
      );
      return;
    }

    // Check for common passwords
    if (isCommonPassword(password)) {
      Alert.alert(
        'Contraseña insegura',
        'Estás usando una contraseña muy común. Por favor, elige una contraseña más segura y única.',
        [{ text: 'Entendido' }]
      );
      return;
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    // Require CAPTCHA verification
    if (!captchaToken) {
      console.log('[SecureRegistration] CAPTCHA required, showing modal...');
      setShowCaptcha(true);
      return;
    }

    // Verify CAPTCHA
    const isValidCaptcha = await verifyCaptchaToken(captchaToken);
    if (!isValidCaptcha) {
      Alert.alert('Error', 'Verificación CAPTCHA fallida. Por favor, intenta nuevamente.');
      setCaptchaToken(null);
      setShowCaptcha(true);
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      
      console.log('[SecureRegistration] 🔐 Creating secure account:', normalizedEmail);

      // Sign up with Supabase Auth (bcrypt hashing handled automatically)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: password,
        options: {
          data: {
            nombre: nombre.trim(),
            rol_app: 'cliente',
            provider: 'barlive',
          },
          emailRedirectTo: 'https://natively.dev/email-confirmed',
        },
      });

      if (authError) {
        console.error('[SecureRegistration] ❌ Registration error:', authError);
        
        await logSecurityEvent('suspicious_activity', normalizedEmail, {
          type: 'registration_failed',
          error: authError.message,
        });
        
        if (authError.message.includes('already registered')) {
          Alert.alert(
            'Cuenta existente',
            'Ya existe una cuenta con este correo electrónico. ¿Deseas iniciar sesión?',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Iniciar sesión',
                onPress: () => router.replace('/auth/login-secure'),
              },
            ]
          );
        } else {
          Alert.alert('Error', authError.message || 'No se pudo crear la cuenta');
        }
        
        setLoading(false);
        return;
      }

      if (!authData.user) {
        Alert.alert('Error', 'No se pudo crear la cuenta. Por favor, intenta de nuevo.');
        setLoading(false);
        return;
      }

      console.log('[SecureRegistration] ✅ Account created successfully:', authData.user.id);

      await logSecurityEvent('login_success', normalizedEmail, {
        userId: authData.user.id,
        type: 'registration',
      });

      // Show success message
      Alert.alert(
        '✅ Cuenta creada exitosamente',
        'Se ha enviado un correo de verificación a tu email. Por favor, verifica tu cuenta antes de iniciar sesión.\n\nRevisa también tu carpeta de spam.',
        [
          {
            text: 'Entendido',
            onPress: () => {
              router.replace({
                pathname: '/auth/verificar-email',
                params: { email: normalizedEmail },
              });
            },
          },
        ]
      );
      
    } catch (error: any) {
      console.error('[SecureRegistration] ❌ Unexpected error:', error);
      
      await logSecurityEvent('suspicious_activity', email.trim().toLowerCase(), {
        type: 'registration_error',
        error: error.message,
      });
      
      Alert.alert('Error', 'Ocurrió un error inesperado. Por favor, intenta de nuevo.');
      setLoading(false);
    }
  };

  const handleCaptchaVerify = async (token: string) => {
    console.log('[SecureRegistration] ✅ CAPTCHA verified, token received');
    setCaptchaToken(token);
    setShowCaptcha(false);
    
    // Automatically retry registration after CAPTCHA verification
    setTimeout(() => {
      handleRegister();
    }, 500);
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/auth');
    }
  };

  const headerIconSize = getHeaderIconSize();

  return (
    <React.Fragment>
      <View style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: getContentBottomPadding(40) }
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              style={styles.header}
            >
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleGoBack}
              >
                <IconSymbol
                  ios_icon_name="chevron.left"
                  android_material_icon_name="arrow_back"
                  size={headerIconSize}
                  color="#fff"
                />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <IconSymbol
                  ios_icon_name="shield.checkered"
                  android_material_icon_name="security"
                  size={32}
                  color="#fff"
                />
                <Text style={[styles.headerTitle, { fontSize: getHeaderTitleSize() }]}>
                  Registro seguro
                </Text>
              </View>
              <Text style={styles.headerSubtitle}>
                Crea tu cuenta con máxima seguridad
              </Text>
            </LinearGradient>

            <View style={styles.formContainer}>
              <Text style={styles.label}>Nombre completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Tu nombre"
                placeholderTextColor={colors.textSecondary}
                value={nombre}
                onChangeText={setNombre}
                editable={!loading}
              />

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

              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Mínimo 8 caracteres"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <IconSymbol
                    ios_icon_name={showPassword ? 'eye.slash.fill' : 'eye.fill'}
                    android_material_icon_name={showPassword ? 'visibility_off' : 'visibility'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBar}>
                    <View
                      style={[
                        styles.strengthFill,
                        {
                          width: passwordStrength === 'strong' ? '100%' : passwordStrength === 'medium' ? '66%' : '33%',
                          backgroundColor: getPasswordStrengthColor(),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthText, { color: getPasswordStrengthColor(), fontSize: scaleFontSize(12) }]}>
                    {getPasswordStrengthText()}
                  </Text>
                </View>
              )}

              {/* Password Requirements */}
              <View style={styles.requirementsContainer}>
                <Text style={[styles.requirementsTitle, { fontSize: scaleFontSize(12) }]}>
                  La contraseña debe contener:
                </Text>
                <View style={styles.requirementRow}>
                  <IconSymbol
                    ios_icon_name={password.length >= 8 ? 'checkmark.circle.fill' : 'circle'}
                    android_material_icon_name={password.length >= 8 ? 'check_circle' : 'radio_button_unchecked'}
                    size={16}
                    color={password.length >= 8 ? '#10b981' : colors.textSecondary}
                  />
                  <Text style={[styles.requirementText, { fontSize: scaleFontSize(11) }]}>
                    Al menos 8 caracteres
                  </Text>
                </View>
                <View style={styles.requirementRow}>
                  <IconSymbol
                    ios_icon_name={/[A-Z]/.test(password) ? 'checkmark.circle.fill' : 'circle'}
                    android_material_icon_name={/[A-Z]/.test(password) ? 'check_circle' : 'radio_button_unchecked'}
                    size={16}
                    color={/[A-Z]/.test(password) ? '#10b981' : colors.textSecondary}
                  />
                  <Text style={[styles.requirementText, { fontSize: scaleFontSize(11) }]}>
                    Una letra mayúscula
                  </Text>
                </View>
                <View style={styles.requirementRow}>
                  <IconSymbol
                    ios_icon_name={/[a-z]/.test(password) ? 'checkmark.circle.fill' : 'circle'}
                    android_material_icon_name={/[a-z]/.test(password) ? 'check_circle' : 'radio_button_unchecked'}
                    size={16}
                    color={/[a-z]/.test(password) ? '#10b981' : colors.textSecondary}
                  />
                  <Text style={[styles.requirementText, { fontSize: scaleFontSize(11) }]}>
                    Una letra minúscula
                  </Text>
                </View>
                <View style={styles.requirementRow}>
                  <IconSymbol
                    ios_icon_name={/[0-9]/.test(password) ? 'checkmark.circle.fill' : 'circle'}
                    android_material_icon_name={/[0-9]/.test(password) ? 'check_circle' : 'radio_button_unchecked'}
                    size={16}
                    color={/[0-9]/.test(password) ? '#10b981' : colors.textSecondary}
                  />
                  <Text style={[styles.requirementText, { fontSize: scaleFontSize(11) }]}>
                    Un número
                  </Text>
                </View>
                <View style={styles.requirementRow}>
                  <IconSymbol
                    ios_icon_name={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'checkmark.circle.fill' : 'circle'}
                    android_material_icon_name={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'check_circle' : 'radio_button_unchecked'}
                    size={16}
                    color={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? '#10b981' : colors.textSecondary}
                  />
                  <Text style={[styles.requirementText, { fontSize: scaleFontSize(11) }]}>
                    Un carácter especial (!@#$%...)
                  </Text>
                </View>
              </View>

              <Text style={styles.label}>Confirmar contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Repite tu contraseña"
                  placeholderTextColor={colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <IconSymbol
                    ios_icon_name={showConfirmPassword ? 'eye.slash.fill' : 'eye.fill'}
                    android_material_icon_name={showConfirmPassword ? 'visibility_off' : 'visibility'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Password Match Indicator */}
              {confirmPassword.length > 0 && (
                <View style={styles.matchContainer}>
                  {password === confirmPassword ? (
                    <View style={styles.matchRow}>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check_circle"
                        size={16}
                        color="#10b981"
                      />
                      <Text style={[styles.matchText, { color: '#10b981', fontSize: scaleFontSize(12) }]}>
                        ✅ Las contraseñas coinciden
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.matchRow}>
                      <IconSymbol
                        ios_icon_name="xmark.circle.fill"
                        android_material_icon_name="cancel"
                        size={16}
                        color="#ef4444"
                      />
                      <Text style={[styles.matchText, { color: '#ef4444', fontSize: scaleFontSize(12) }]}>
                        ❌ Las contraseñas no coinciden
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.buttonContent}>
                    <IconSymbol
                      ios_icon_name="lock.shield.fill"
                      android_material_icon_name="lock"
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.buttonText}>Crear cuenta segura</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Security Features */}
              <View style={styles.securityFeatures}>
                <Text style={[styles.securityFeaturesTitle, { fontSize: scaleFontSize(14) }]}>
                  🔐 Tu seguridad es nuestra prioridad
                </Text>
                <View style={styles.featureRow}>
                  <IconSymbol
                    ios_icon_name="checkmark.shield.fill"
                    android_material_icon_name="verified_user"
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={[styles.featureText, { fontSize: scaleFontSize(12) }]}>
                    Contraseñas cifradas con bcrypt + salt único
                  </Text>
                </View>
                <View style={styles.featureRow}>
                  <IconSymbol
                    ios_icon_name="checkmark.shield.fill"
                    android_material_icon_name="verified_user"
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={[styles.featureText, { fontSize: scaleFontSize(12) }]}>
                    Verificación CAPTCHA anti-bots
                  </Text>
                </View>
                <View style={styles.featureRow}>
                  <IconSymbol
                    ios_icon_name="checkmark.shield.fill"
                    android_material_icon_name="verified_user"
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={[styles.featureText, { fontSize: scaleFontSize(12) }]}>
                    Verificación de email obligatoria
                  </Text>
                </View>
                <View style={styles.featureRow}>
                  <IconSymbol
                    ios_icon_name="checkmark.shield.fill"
                    android_material_icon_name="verified_user"
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={[styles.featureText, { fontSize: scaleFontSize(12) }]}>
                    Datos protegidos con cifrado de última generación
                  </Text>
                </View>
              </View>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>o</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => router.replace('/auth/login-secure')}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>
                  ¿Ya tienes cuenta? <Text style={styles.loginButtonTextBold}>Inicia sesión</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* CAPTCHA Modal */}
      <CaptchaModal
        visible={showCaptcha}
        onVerify={handleCaptchaVerify}
        onCancel={() => setShowCaptcha(false)}
      />
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  backButton: {
    marginBottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: colors.headerText,
    marginLeft: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  formContainer: {
    padding: 24,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    marginBottom: 12,
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
  strengthContainer: {
    marginBottom: 16,
  },
  strengthBar: {
    height: 4,
    backgroundColor: colors.cardBorder,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontWeight: '600',
  },
  requirementsContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  requirementsTitle: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  requirementText: {
    marginLeft: 8,
    color: colors.textSecondary,
  },
  matchContainer: {
    marginBottom: 16,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchText: {
    marginLeft: 8,
    fontWeight: '600',
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
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  securityFeatures: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  securityFeaturesTitle: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    flex: 1,
    marginLeft: 12,
    color: colors.textSecondary,
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
