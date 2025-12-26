
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
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

export default function LoginV6Screen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  
  const emailShakeAnim = useRef(new Animated.Value(0)).current;
  const passwordShakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const shakeAnimation = (animValue: Animated.Value) => {
    Animated.sequence([
      Animated.timing(animValue, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(animValue, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(animValue, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(animValue, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailError) {
      setEmailError('');
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordError) {
      setPasswordError('');
    }
  };

  const handleEmailBlur = () => {
    setEmailFocused(false);
    if (email && !validateEmail(email)) {
      setEmailError('Correo electrónico inválido');
      shakeAnimation(emailShakeAnim);
    }
  };

  const handleLogin = async () => {
    let hasError = false;

    if (!email.trim()) {
      setEmailError('El correo es requerido');
      shakeAnimation(emailShakeAnim);
      hasError = true;
    } else if (!validateEmail(email.trim())) {
      setEmailError('Correo electrónico inválido');
      shakeAnimation(emailShakeAnim);
      hasError = true;
    }

    if (!password.trim()) {
      setPasswordError('La contraseña es requerida');
      shakeAnimation(passwordShakeAnim);
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      console.log('[Login v6.3 - Token] 🔐 Attempting login:', normalizedEmail);

      // Check if user is a Google user first
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('provider, email_verified')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (userData?.provider === 'google') {
        console.log('[Login v6.3 - Token] 🔍 Google user detected');
        setLoading(false);
        
        Alert.alert(
          'Cuenta de Google',
          'Esta cuenta fue creada con Google. ¿Deseas configurar una contraseña para poder iniciar sesión con email?',
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
              text: 'Cancelar',
              style: 'cancel',
            },
          ]
        );
        return;
      }

      // Attempt to sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password,
      });

      if (authError) {
        console.error('[Login v6.3 - Token] ❌ Error signing in:', authError);
        
        if (authError.message.includes('Email not confirmed')) {
          console.log('[Login v6.3 - Token] ⚠️ Email no verificado, redirigiendo a verificación con token');
          
          Alert.alert(
            'Email no verificado',
            'Tu cuenta aún no ha sido verificada. Te enviaremos un código de verificación de 6 dígitos para que puedas completar el proceso.',
            [
              {
                text: 'Verificar ahora',
                onPress: async () => {
                  try {
                    // Send verification token
                    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://embntaqwlwmgazvrglaf.supabase.co';
                    
                    const response = await fetch(`${supabaseUrl}/functions/v1/request-verification-token`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ email: normalizedEmail }),
                    });

                    const result = await response.json();

                    if (!response.ok || result.error) {
                      Alert.alert('Error', 'No se pudo enviar el código de verificación. Por favor, intenta nuevamente.');
                    } else {
                      Alert.alert(
                        'Código enviado',
                        'Se ha enviado un código de verificación a tu correo electrónico. Por favor, revisa tu bandeja de entrada.',
                        [
                          {
                            text: 'Continuar',
                            onPress: () => {
                              router.push({
                                pathname: '/auth/verificar-cuenta-token',
                                params: { email: normalizedEmail },
                              });
                            },
                          },
                        ]
                      );
                    }
                  } catch (err) {
                    console.error('[Login v6.3 - Token] Error sending verification token:', err);
                    Alert.alert('Error', 'Ocurrió un error al enviar el código');
                  }
                },
              },
              { text: 'Cancelar', style: 'cancel' },
            ]
          );
        } else if (authError.message.includes('Invalid login credentials')) {
          setPasswordError('Email o contraseña incorrectos');
          shakeAnimation(passwordShakeAnim);
        } else {
          Alert.alert('Error', authError.message || 'No se pudo iniciar sesión');
        }
        
        setLoading(false);
        return;
      }

      if (!authData.user) {
        Alert.alert('Error', 'No se pudo iniciar sesión');
        setLoading(false);
        return;
      }

      console.log('[Login v6.3 - Token] ✅ Login successful:', authData.user.id);
      
      console.log('[Login v6.3 - Token] 🚀 Redirigiendo a lista de locales...');
      router.replace('/(tabs)/explorar');
    } catch (error: any) {
      console.error('[Login v6.3 - Token] ❌ Error in handleLogin:', error);
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
        
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <IconSymbol
                ios_icon_name="person.fill"
                android_material_icon_name="person"
                size={48}
                color="#fff"
              />
            </View>
          </View>
          <Text style={styles.headerTitle}>Bienvenido</Text>
          <Text style={styles.headerSubtitle}>Inicia sesión para continuar</Text>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo electrónico</Text>
            <Animated.View
              style={[
                styles.inputContainer,
                emailFocused && styles.inputContainerFocused,
                emailError && styles.inputContainerError,
                { transform: [{ translateX: emailShakeAnim }] },
              ]}
            >
              <IconSymbol
                ios_icon_name="envelope.fill"
                android_material_icon_name="email"
                size={20}
                color={emailError ? '#ef4444' : emailFocused ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="correo@ejemplo.com"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={handleEmailChange}
                onFocus={() => setEmailFocused(true)}
                onBlur={handleEmailBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              {email && !emailError ? (
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check_circle"
                  size={20}
                  color="#10b981"
                />
              ) : null}
            </Animated.View>
            {emailError ? (
              <View style={styles.errorContainer}>
                <IconSymbol
                  ios_icon_name="exclamationmark.circle.fill"
                  android_material_icon_name="error"
                  size={14}
                  color="#ef4444"
                />
                <Text style={styles.errorText}>{emailError}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <Animated.View
              style={[
                styles.inputContainer,
                passwordFocused && styles.inputContainerFocused,
                passwordError && styles.inputContainerError,
                { transform: [{ translateX: passwordShakeAnim }] },
              ]}
            >
              <IconSymbol
                ios_icon_name="lock.fill"
                android_material_icon_name="lock"
                size={20}
                color={passwordError ? '#ef4444' : passwordFocused ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={handlePasswordChange}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <IconSymbol
                  ios_icon_name={showPassword ? 'eye.slash.fill' : 'eye.fill'}
                  android_material_icon_name={showPassword ? 'visibility_off' : 'visibility'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </Animated.View>
            {passwordError ? (
              <View style={styles.errorContainer}>
                <IconSymbol
                  ios_icon_name="exclamationmark.circle.fill"
                  android_material_icon_name="error"
                  size={14}
                  color="#ef4444"
                />
                <Text style={styles.errorText}>{passwordError}</Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() => router.push('/auth/recuperar-password-token')}
            disabled={loading}
          >
            <Text style={styles.forgotButtonText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <React.Fragment>
                  <IconSymbol
                    ios_icon_name="arrow.right.circle.fill"
                    android_material_icon_name="login"
                    size={20}
                    color="#fff"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.buttonText}>Iniciar sesión</Text>
                </React.Fragment>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>¿No tienes cuenta? </Text>
            <TouchableOpacity
              onPress={() => router.replace('/auth/registro-v6')}
              disabled={loading}
            >
              <Text style={styles.registerLink}>Regístrate gratis</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.securityNote}>
            <IconSymbol
              ios_icon_name="lock.shield.fill"
              android_material_icon_name="security"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.securityText}>
              Tu información está protegida con encriptación de extremo a extremo
            </Text>
          </View>
        </Animated.View>
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
    paddingTop: Platform.OS === 'android' ? 60 : 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  backButton: {
    marginBottom: 32,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
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
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
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
  inputContainerFocused: {
    borderColor: colors.primary,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  inputContainerError: {
    borderColor: '#ef4444',
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginLeft: 4,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 32,
    paddingVertical: 8,
  },
  forgotButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
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
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  registerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  securityText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 6,
    textAlign: 'center',
    flex: 1,
  },
});
