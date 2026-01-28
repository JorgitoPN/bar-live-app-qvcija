
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
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getContentBottomPadding, getHeaderTitleSize, getHeaderIconSize, scaleFontSize } from '@/utils/androidScaling';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const router = useRouter();
  const { setSessionManually } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCookieConsent, setShowCookieConsent] = useState(false);

  useEffect(() => {
    // Check if user has already seen cookie consent
    checkCookieConsent();
  }, []);

  const checkCookieConsent = async () => {
    try {
      const consent = await AsyncStorage.getItem('cookieConsent');
      if (!consent) {
        // Show cookie consent modal after a short delay
        setTimeout(() => {
          setShowCookieConsent(true);
        }, 1000);
      }
    } catch (error) {
      console.error('Error checking cookie consent:', error);
    }
  };

  const handleAcceptCookies = async () => {
    try {
      await AsyncStorage.setItem('cookieConsent', 'accepted');
      setShowCookieConsent(false);
    } catch (error) {
      console.error('Error saving cookie consent:', error);
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
      console.error('Error saving cookie consent:', error);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkIfGoogleUserWithoutPassword = async (email: string): Promise<boolean> => {
    try {
      console.log('[Login] 🔍 Checking if user has password set...');
      
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          id,
          provider,
          email
        `)
        .eq('email', email)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[Login] ❌ Error checking user:', error);
        return false;
      }

      if (!data) {
        console.log('[Login] ℹ️ User not found in usuarios table');
        return false;
      }

      // Check if user has a password in auth.users
      const { data: authData, error: authError } = await supabase.rpc('check_user_has_password', {
        user_email: email
      });

      if (authError) {
        console.error('[Login] ❌ Error checking auth password:', authError);
        return data.provider === 'google';
      }

      const hasPassword = authData as boolean;
      console.log('[Login] 📊 User password status:', {
        email,
        provider: data.provider,
        hasPassword,
        needsPasswordSetup: !hasPassword && data.provider === 'google'
      });

      return !hasPassword && data.provider === 'google';
    } catch (error) {
      console.error('[Login] ❌ Error in checkIfGoogleUserWithoutPassword:', error);
      return false;
    }
  };

  const handleResendVerificationEmail = async (email: string) => {
    try {
      console.log('[Login v27.0] 📧 Reenviando correo de verificación...');
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: 'https://natively.dev/email-confirmed',
        },
      });
      
      if (error) {
        console.error('[Login v27.0] ❌ Error resending email:', error);
        Alert.alert(
          'Error',
          'No se pudo reenviar el correo de verificación. Por favor, intenta nuevamente más tarde.',
          [{ text: 'OK' }]
        );
      } else {
        console.log('[Login v27.0] ✅ Correo reenviado exitosamente');
        Alert.alert(
          '✅ Correo enviado',
          'Se ha reenviado el correo de verificación. Por favor, revisa tu bandeja de entrada y la carpeta de spam.',
          [{ text: 'Entendido' }]
        );
      }
    } catch (err) {
      console.error('[Login v27.0] ❌ Error resending email:', err);
      Alert.alert(
        'Error',
        'Ocurrió un error al reenviar el correo. Por favor, intenta nuevamente.',
        [{ text: 'OK' }]
      );
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

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      console.log('[Login v27.0] 🔐 Intentando iniciar sesión:', normalizedEmail);
      console.log('[Login v27.0] 📱 Platform:', Platform.OS);

      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password,
      });

      if (authError) {
        console.error('[Login v27.0] ❌ Error signing in:', {
          message: authError.message,
          status: authError.status,
          name: authError.name,
          platform: Platform.OS,
        });
        
        // Handle "Email not confirmed" error
        if (authError.message.includes('Email not confirmed')) {
          console.log('[Login v27.0] ⚠️ Email no confirmado detectado');
          
          Alert.alert(
            '📧 Email no verificado',
            'Tu cuenta aún no ha sido verificada. Por favor, revisa tu correo electrónico y haz clic en el enlace de verificación.\n\n¿No recibiste el correo?',
            [
              {
                text: 'Cancelar',
                style: 'cancel',
              },
              {
                text: 'Reenviar correo',
                onPress: () => handleResendVerificationEmail(normalizedEmail),
              },
            ]
          );
          
          setLoading(false);
          return;
        }
        
        // Handle invalid credentials
        if (authError.message.includes('Invalid login credentials')) {
          const needsPasswordSetup = await checkIfGoogleUserWithoutPassword(normalizedEmail);
          
          if (needsPasswordSetup) {
            Alert.alert(
              'Configuración de contraseña requerida',
              'Tu cuenta fue creada con Google y aún no has configurado una contraseña. ¿Deseas configurar una contraseña ahora para poder iniciar sesión con email?',
              [
                {
                  text: 'Configurar contraseña',
                  onPress: () => {
                    router.push({
                      pathname: '/auth/configurar-password-google',
                      params: { email: normalizedEmail },
                    });
                  },
                },
                { 
                  text: 'Usar Google', 
                  onPress: () => {
                    Alert.alert(
                      'Iniciar sesión con Google',
                      'Por favor, usa el botón "Continuar con Google" en la pantalla de inicio de sesión.'
                    );
                  }
                },
                { text: 'Cancelar', style: 'cancel' },
              ]
            );
          } else {
            Alert.alert('Error', 'Email o contraseña incorrectos');
          }
        } else {
          // Generic error handling with platform-specific message
          const errorMessage = Platform.OS === 'android' 
            ? `Error de autenticación: ${authError.message}\n\nSi el problema persiste, intenta:\n1. Verificar tu conexión a internet\n2. Reiniciar la aplicación\n3. Contactar soporte`
            : authError.message || 'No se pudo iniciar sesión';
          
          Alert.alert('Error', errorMessage);
        }
        
        setLoading(false);
        return;
      }

      if (!authData.user || !authData.session) {
        console.error('[Login v27.0] ❌ No user or session returned');
        Alert.alert('Error', 'No se pudo iniciar sesión. Por favor, intenta de nuevo.');
        setLoading(false);
        return;
      }

      console.log('[Login v27.0] ✅ Login successful:', {
        userId: authData.user.id,
        email: authData.user.email,
        platform: Platform.OS,
      });
      console.log('[Login v27.0] 📅 Session expires at:', new Date(authData.session.expires_at! * 1000).toLocaleString());

      // Update the session in AuthContext
      console.log('[Login v27.0] 📝 Actualizando sesión en AuthContext inmediatamente...');
      setSessionManually(authData.session);

      // Wait for the session to be fully persisted
      console.log('[Login v27.0] ⏳ Esperando a que la sesión se persista...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify session multiple times
      console.log('[Login v27.0] 🔍 Verificando que la sesión esté disponible...');
      let verificationAttempts = 0;
      let verifiedSession = null;
      
      while (verificationAttempts < 10 && !verifiedSession) {
        const { data: { session: currentSession }, error: verifyError } = await supabase.auth.getSession();
        
        if (verifyError) {
          console.error('[Login v27.0] ❌ Error verificando sesión (intento', verificationAttempts + 1, '):', verifyError);
        } else if (currentSession) {
          console.log('[Login v27.0] ✅ Sesión verificada exitosamente (intento', verificationAttempts + 1, ')');
          verifiedSession = currentSession;
          break;
        } else {
          console.log('[Login v27.0] ⚠️ Sesión no disponible aún (intento', verificationAttempts + 1, '), esperando...');
        }
        
        verificationAttempts++;
        if (verificationAttempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      if (!verifiedSession) {
        console.error('[Login v27.0] ❌ No se pudo verificar la sesión después de varios intentos');
        Alert.alert('Error', 'Error al establecer la sesión. Por favor, intenta de nuevo.');
        setLoading(false);
        return;
      }

      console.log('[Login v27.0] ✅ Sesión completamente verificada y lista');
      
      // Wait for AuthContext to process
      console.log('[Login v27.0] ⏳ Esperando a que AuthContext procese la sesión...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('[Login v27.0] 🚀 Navegando a la lista de locales...');
      
      // Redirect to explorar (lista de locales)
      router.replace('/(tabs)/explorar');
      
    } catch (error: any) {
      console.error('[Login v27.0] ❌ Error in handleLogin:', {
        error,
        message: error?.message,
        platform: Platform.OS,
      });
      
      const errorMessage = Platform.OS === 'android'
        ? 'Ocurrió un error inesperado. Por favor, verifica tu conexión a internet e intenta de nuevo.'
        : 'Ocurrió un error inesperado. Por favor, intenta de nuevo.';
      
      Alert.alert('Error', errorMessage);
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      router.push('/auth/recuperar-password-v7');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Error', 'Por favor, ingresa un correo electrónico válido');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if this is a Google user without password
    const needsPasswordSetup = await checkIfGoogleUserWithoutPassword(normalizedEmail);

    if (needsPasswordSetup) {
      Alert.alert(
        'Cuenta de Google',
        'Tu cuenta fue creada con Google. Para poder iniciar sesión con contraseña, primero necesitas configurar una.',
        [
          {
            text: 'Configurar contraseña',
            onPress: () => {
              router.push({
                pathname: '/auth/configurar-password-google',
                params: { email: normalizedEmail },
              });
            },
          },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
      return;
    }

    router.push({
      pathname: '/auth/recuperar-password-v7',
      params: { email: normalizedEmail },
    });
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/auth');
    }
  };

  /**
   * ✅ LOGIN SCREEN v143.0 - ANDROID SCROLL & NAV BUTTONS FIX
   * 
   * CRITICAL FIXES v143.0 (ANDROID ONLY):
   * - ✅ Enabled proper keyboard-aware scrolling
   * - ✅ Added bottom padding for Android navigation buttons
   * - ✅ Consistent header title and icon sizes
   * - ✅ Content no longer hidden by keyboard or nav buttons
   * - ✅ iOS design remains unchanged
   */

  const headerIconSize = getHeaderIconSize(); // 28 on iOS, 24 on Android

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
            <Text style={[styles.headerTitle, { fontSize: getHeaderTitleSize() }]}>Iniciar sesión</Text>
            <Text style={styles.headerSubtitle}>Bienvenido de vuelta a BarLive</Text>
          </LinearGradient>
          <View style={styles.formContainer}>
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
              <Text style={styles.buttonText}>Iniciar sesión</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => router.replace('/auth/registro-email')}
            >
              <Text style={styles.registerButtonText}>
                ¿No tienes cuenta? <Text style={styles.registerButtonTextBold}>Regístrate</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>

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
    // paddingBottom set dynamically via getContentBottomPadding()
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
  headerTitle: {
    // fontSize set dynamically via getHeaderTitleSize()
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 4,
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
    paddingVertical: 16,
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
