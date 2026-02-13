
/**
 * 🔐 SECURE LOGIN SCREEN v4.0 - INTELLIGENT REDIRECT FLOW COMPLETELY FIXED
 * 
 * CRITICAL FIXES v4.0:
 * - ✅ FIXED: Redirect now uses router.replace with proper pathname/params parsing
 * - ✅ FIXED: Handles complex URLs with query parameters correctly
 * - ✅ FIXED: Decodes redirect path properly with decodeURIComponent
 * - ✅ IMPROVED: Better error handling for malformed redirect paths
 * - ✅ ENHANCED: More robust navigation after successful login
 * - ✅ LOGGING: Comprehensive logging for debugging redirect flow
 * 
 * SECURITY FEATURES:
 * - ✅ Rate limiting (3 attempts before CAPTCHA)
 * - ✅ Account lockout (5 attempts = 15 min lockout)
 * - ✅ CAPTCHA verification after failed attempts
 * - ✅ Password strength validation
 * - ✅ Secure session management
 * - ✅ Security event logging
 * 
 * FLOW:
 * 1. User enters credentials
 * 2. Check if account is locked
 * 3. Verify credentials with Supabase (bcrypt hashing)
 * 4. If failed: increment attempts, show CAPTCHA if needed
 * 5. If success: reset attempts, create secure session
 * 6. ✅ NEW v4.0: Properly decode and redirect to intended destination
 */

import React, { useState, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getContentBottomPadding, getHeaderTitleSize, getHeaderIconSize, scaleFontSize } from '@/utils/androidScaling';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CaptchaModal from '@/components/auth/CaptchaModal';
import {
  getLoginAttempts,
  recordFailedAttempt,
  resetLoginAttempts,
  isAccountLocked,
  validateEmail,
  logSecurityEvent,
  requiresCaptcha,
  verifyCaptchaToken,
} from '@/utils/securityService';

export default function SecureLoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setSessionManually } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [showCookieConsent, setShowCookieConsent] = useState(false);

  // ✅ v4.0: CRITICAL FIX - Properly decode redirect parameter
  const redirectPath = params.redirect as string | undefined;
  const decodedRedirectPath = redirectPath ? decodeURIComponent(redirectPath) : undefined;
  
  console.log('[SecureLogin v4.0] 🔄 Raw redirect param:', redirectPath);
  console.log('[SecureLogin v4.0] 🔄 Decoded redirect path:', decodedRedirectPath);

  useEffect(() => {
    checkCookieConsent();
  }, []);

  // ✅ LINT FIX: Wrap checkLoginAttempts in useCallback to stabilize dependency
  const checkLoginAttempts = useCallback(async () => {
    try {
      const attempts = await getLoginAttempts(email.trim().toLowerCase());
      setLoginAttempts(attempts.attempts);
      
      console.log('[SecureLogin] Login attempts for', email, ':', attempts.attempts);
    } catch (error) {
      console.error('[SecureLogin] Error checking login attempts:', error);
    }
  }, [email]);

  useEffect(() => {
    // Check login attempts when email changes
    if (email) {
      checkLoginAttempts();
    }
  }, [email, checkLoginAttempts]);

  const checkCookieConsent = async () => {
    try {
      const consent = await AsyncStorage.getItem('cookieConsent');
      if (!consent) {
        setTimeout(() => {
          setShowCookieConsent(true);
        }, 1000);
      }
    } catch (error) {
      console.error('[SecureLogin] Error checking cookie consent:', error);
    }
  };

  const handleAcceptCookies = async () => {
    try {
      await AsyncStorage.setItem('cookieConsent', 'accepted');
      setShowCookieConsent(false);
    } catch (error) {
      console.error('[SecureLogin] Error saving cookie consent:', error);
    }
  };

  const handleRejectCookies = async () => {
    try {
      await AsyncStorage.setItem('cookieConsent', 'rejected');
      setShowCookieConsent(false);
      Alert.alert(
        'Cookies rechazadas',
        'Has rechazado las cookies. Esto puede afectar la funcionalidad de la aplicación, especialmente el inicio de sesión automático.'
      );
    } catch (error) {
      console.error('[SecureLogin] Error saving cookie consent:', error);
    }
  };



  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor, completa todos los campos');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Error', 'Por favor, ingresa un correo electrónico válido');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if account is locked
    const lockStatus = await isAccountLocked(normalizedEmail);
    if (lockStatus.isLocked) {
      const minutes = Math.ceil((lockStatus.remainingTime || 0) / 60000);
      Alert.alert(
        '🔒 Cuenta bloqueada temporalmente',
        `Tu cuenta ha sido bloqueada por seguridad debido a múltiples intentos fallidos de inicio de sesión.\n\nPodrás intentar nuevamente en ${minutes} minutos.\n\nSi olvidaste tu contraseña, usa la opción "¿Olvidaste tu contraseña?".`,
        [{ text: 'Entendido' }]
      );
      
      await logSecurityEvent('account_locked', normalizedEmail, {
        remainingTime: lockStatus.remainingTime,
      });
      
      return;
    }

    // Check if CAPTCHA is required
    const needsCaptcha = await requiresCaptcha(normalizedEmail);
    if (needsCaptcha && !captchaToken) {
      console.log('[SecureLogin] CAPTCHA required, showing modal...');
      setShowCaptcha(true);
      return;
    }

    // Verify CAPTCHA if provided
    if (captchaToken) {
      const isValidCaptcha = await verifyCaptchaToken(captchaToken);
      if (!isValidCaptcha) {
        Alert.alert('Error', 'Verificación CAPTCHA fallida. Por favor, intenta nuevamente.');
        setCaptchaToken(null);
        setShowCaptcha(true);
        return;
      }
    }

    setLoading(true);

    try {
      console.log('[SecureLogin v4.0] 🔐 Attempting secure login:', normalizedEmail);

      // Sign in with Supabase Auth (bcrypt hashing handled automatically)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password,
      });

      if (authError) {
        console.error('[SecureLogin v4.0] ❌ Login failed:', authError.message);
        
        // Record failed attempt
        const attemptResult = await recordFailedAttempt(normalizedEmail);
        setLoginAttempts(attemptResult.attempts);
        
        await logSecurityEvent('login_failed', normalizedEmail, {
          attempts: attemptResult.attempts,
          requiresCaptcha: attemptResult.requiresCaptcha,
          isLocked: attemptResult.isLocked,
        });
        
        // Handle "Email not confirmed" error
        if (authError.message.includes('Email not confirmed')) {
          Alert.alert(
            '📧 Email no verificado',
            'Tu cuenta aún no ha sido verificada. Por favor, revisa tu correo electrónico y haz clic en el enlace de verificación.',
            [{ text: 'Entendido' }]
          );
          setLoading(false);
          return;
        }
        
        // Show appropriate error message
        if (attemptResult.isLocked) {
          Alert.alert(
            '🔒 Cuenta bloqueada',
            'Tu cuenta ha sido bloqueada temporalmente por seguridad debido a múltiples intentos fallidos.\n\nPodrás intentar nuevamente en 15 minutos.',
            [{ text: 'Entendido' }]
          );
        } else if (attemptResult.requiresCaptcha) {
          Alert.alert(
            '⚠️ Verificación requerida',
            `Credenciales incorrectas. Intento ${attemptResult.attempts} de 5.\n\nPor seguridad, necesitamos verificar que no eres un robot.`,
            [
              {
                text: 'Verificar',
                onPress: () => setShowCaptcha(true),
              },
            ]
          );
        } else {
          Alert.alert(
            'Error',
            `Credenciales incorrectas. Intento ${attemptResult.attempts} de 5.\n\nDespués de 3 intentos fallidos, se requerirá verificación CAPTCHA.`
          );
        }
        
        setLoading(false);
        return;
      }

      if (!authData.user || !authData.session) {
        console.error('[SecureLogin v4.0] ❌ No user or session returned');
        Alert.alert('Error', 'No se pudo iniciar sesión. Por favor, intenta de nuevo.');
        setLoading(false);
        return;
      }

      console.log('[SecureLogin v4.0] ✅ Login successful:', authData.user.id);

      // Reset login attempts on successful login
      await resetLoginAttempts(normalizedEmail);
      await logSecurityEvent('login_success', normalizedEmail, {
        userId: authData.user.id,
      });

      // Update the session in AuthContext
      setSessionManually(authData.session);

      // Wait for session to persist
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        console.error('[SecureLogin v4.0] ❌ Session verification failed');
        Alert.alert('Error', 'Error al establecer la sesión. Por favor, intenta de nuevo.');
        setLoading(false);
        return;
      }

      console.log('[SecureLogin v4.0] ✅ Session verified, redirecting...');
      
      // ✅ v4.0: CRITICAL FIX - Properly handle decoded redirect path
      if (decodedRedirectPath) {
        console.log('[SecureLogin v4.0] 🎯 Redirecting to saved path:', decodedRedirectPath);
        
        try {
          // Parse the redirect path to extract pathname and params
          const [pathname, queryString] = decodedRedirectPath.split('?');
          
          console.log('[SecureLogin v4.0] 🎯 Pathname:', pathname);
          console.log('[SecureLogin v4.0] 🎯 Query string:', queryString);
          
          if (queryString) {
            // Parse query parameters
            const params: Record<string, string> = {};
            queryString.split('&').forEach(param => {
              const [key, value] = param.split('=');
              if (key && value) {
                params[key] = decodeURIComponent(value);
              }
            });
            
            console.log('[SecureLogin v4.0] 🎯 Parsed params:', params);
            
            // ✅ CRITICAL FIX v4.0: Use replace to avoid back button issues
            router.replace({
              pathname: pathname as any,
              params: params,
            });
          } else {
            console.log('[SecureLogin v4.0] 🎯 Navigating to simple path:', pathname);
            router.replace(pathname as any);
          }
          
          console.log('[SecureLogin v4.0] ✅ Redirect navigation executed successfully');
        } catch (error) {
          console.error('[SecureLogin v4.0] ❌ Error parsing redirect path:', error);
          console.log('[SecureLogin v4.0] 🏠 Falling back to explorar');
          router.replace('/(tabs)/explorar');
        }
      } else {
        console.log('[SecureLogin v4.0] 🏠 No redirect path, going to explorar');
        router.replace('/(tabs)/explorar');
      }
      
    } catch (error: any) {
      console.error('[SecureLogin v4.0] ❌ Unexpected error:', error);
      
      await logSecurityEvent('login_failed', normalizedEmail, {
        error: error.message,
        type: 'unexpected_error',
      });
      
      Alert.alert('Error', 'Ocurrió un error inesperado. Por favor, intenta de nuevo.');
      setLoading(false);
    }
  };

  const handleCaptchaVerify = async (token: string) => {
    console.log('[SecureLogin] ✅ CAPTCHA verified, token received');
    setCaptchaToken(token);
    setShowCaptcha(false);
    
    // Automatically retry login after CAPTCHA verification
    setTimeout(() => {
      handleLogin();
    }, 500);
  };

  const handleForgotPassword = () => {
    // ✅ FIX v325.0: Always redirect to token-based password recovery
    if (email.trim() && validateEmail(email.trim())) {
      router.push({
        pathname: '/auth/recuperar-password-token',
        params: { email: email.trim().toLowerCase() },
      });
    } else {
      router.push('/auth/recuperar-password-v7');
    }
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
                  Inicio de sesión seguro
                </Text>
              </View>
              <Text style={styles.headerSubtitle}>
                Protegido con cifrado de última generación
              </Text>
            </LinearGradient>

            <View style={styles.formContainer}>
              {/* Security Info Banner */}
              {loginAttempts > 0 && (
                <View style={styles.securityBanner}>
                  <IconSymbol
                    ios_icon_name="exclamationmark.triangle.fill"
                    android_material_icon_name="warning"
                    size={20}
                    color="#f59e0b"
                  />
                  <Text style={[styles.securityBannerText, { fontSize: scaleFontSize(12) }]}>
                    {loginAttempts >= 3
                      ? `⚠️ Intento ${loginAttempts} de 5. Verificación CAPTCHA requerida.`
                      : `Intento ${loginAttempts} de 5. Después de 3 intentos se requerirá verificación.`}
                  </Text>
                </View>
              )}

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
                  placeholder="••••••••"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
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

              <TouchableOpacity
                style={styles.forgotButton}
                onPress={handleForgotPassword}
                disabled={loading}
              >
                <Text style={styles.forgotButtonText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
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
                    <Text style={styles.buttonText}>Iniciar sesión seguro</Text>
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
                    Contraseñas cifradas con bcrypt + salt
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
                    Protección contra ataques de fuerza bruta
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
                    Sesiones seguras con tokens JWT
                  </Text>
                </View>
              </View>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>o</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.registerButton}
                onPress={() => {
                  // ✅ v4.0: Pass properly encoded redirect parameter to register screen
                  if (redirectPath) {
                    console.log('[SecureLogin v4.0] 🎯 Passing redirect to register:', redirectPath);
                    router.replace({
                      pathname: '/auth/registro-seguro',
                      params: { redirect: redirectPath },
                    });
                  } else {
                    router.replace('/auth/registro-seguro');
                  }
                }}
              >
                <Text style={styles.registerButtonText}>
                  ¿No tienes cuenta? <Text style={styles.registerButtonTextBold}>Regístrate</Text>
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

      {/* Cookie Consent Modal */}
      <Modal
        visible={showCookieConsent}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.cookieModalOverlay}>
          <View style={styles.cookieModalContent}>
            <View style={styles.cookieIconContainer}>
              <IconSymbol
                ios_icon_name="info.circle.fill"
                android_material_icon_name="info"
                size={48}
                color={colors.primary}
              />
            </View>
            
            <Text style={[styles.cookieModalTitle, { fontSize: scaleFontSize(20) }]}>
              Gestión de Cookies
            </Text>
            
            <Text style={[styles.cookieModalText, { fontSize: scaleFontSize(14) }]}>
              Utilizamos cookies para mejorar tu experiencia en BarLive:
            </Text>
            
            <View style={styles.cookieList}>
              <View style={styles.cookieListItem}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check_circle"
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.cookieListText, { fontSize: scaleFontSize(13) }]}>
                  Recordar tu inicio de sesión
                </Text>
              </View>
              <View style={styles.cookieListItem}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check_circle"
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.cookieListText, { fontSize: scaleFontSize(13) }]}>
                  Guardar tus preferencias
                </Text>
              </View>
              <View style={styles.cookieListItem}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check_circle"
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.cookieListText, { fontSize: scaleFontSize(13) }]}>
                  Mejorar tu experiencia de usuario
                </Text>
              </View>
            </View>
            
            <Text style={[styles.cookieModalWarning, { fontSize: scaleFontSize(12) }]}>
              ⚠️ El rechazo de cookies puede impedir el acceso o provocar problemas de autenticación.
            </Text>
            
            <View style={styles.cookieModalButtons}>
              <TouchableOpacity
                style={styles.cookieRejectButton}
                onPress={handleRejectCookies}
              >
                <Text style={[styles.cookieRejectButtonText, { fontSize: scaleFontSize(14) }]}>
                  Rechazar
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cookieAcceptButton}
                onPress={handleAcceptCookies}
              >
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.cookieAcceptGradient}
                >
                  <Text style={[styles.cookieAcceptButtonText, { fontSize: scaleFontSize(14) }]}>
                    Aceptar
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.cookieLearnMore}
              onPress={() => {
                setShowCookieConsent(false);
                router.push('/legal/privacidad');
              }}
            >
              <Text style={[styles.cookieLearnMoreText, { fontSize: scaleFontSize(12) }]}>
                Más información sobre cookies
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  securityBannerText: {
    flex: 1,
    marginLeft: 12,
    color: '#92400e',
    lineHeight: 18,
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
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotButtonText: {
    fontSize: 14,
    color: colors.primary,
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
  registerButton: {
    alignItems: 'center',
  },
  registerButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  registerButtonTextBold: {
    fontWeight: '600',
    color: colors.primary,
  },
  // Cookie Modal Styles
  cookieModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cookieModalContent: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cookieIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cookieModalTitle: {
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  cookieModalText: {
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  cookieList: {
    marginBottom: 16,
  },
  cookieListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cookieListText: {
    color: colors.text,
    marginLeft: 12,
    flex: 1,
  },
  cookieModalWarning: {
    color: '#f59e0b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  cookieModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  cookieRejectButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cookieRejectButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  cookieAcceptButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cookieAcceptGradient: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cookieAcceptButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  cookieLearnMore: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cookieLearnMoreText: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
