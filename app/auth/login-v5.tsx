
import React, { useState, useEffect, useRef } from 'react';
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

export default function LoginV5Screen() {
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
    // Validate fields
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

      console.log('[Login v5.0] 🔐 Attempting login:', normalizedEmail);

      // Check if this is a Google user
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('provider')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (userData?.provider === 'google') {
        console.log('[Login v5.0] 🔍 Google user detected');
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
              text: 'Usar Google',
              onPress: () => router.push('/auth/google-oauth-v5'),
            },
            { text: 'Cancelar', style: 'cancel' },
          ]
        );
        return;
      }

      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password,
      });

      if (authError) {
        console.error('[Login v5.0] ❌ Error signing in:', authError);
        
        if (authError.message.includes('Email not confirmed')) {
          Alert.alert(
            'Email no verificado',
            'Por favor, verifica tu correo electrónico antes de iniciar sesión.',
            [
              {
                text: 'Reenviar correo',
                onPress: async () => {
                  try {
                    const { error } = await supabase.auth.resend({
                      type: 'signup',
                      email: normalizedEmail,
                      options: {
                        emailRedirectTo: 'https://barliveapp.es/auth/email-confirmed',
                      },
                    });
                    
                    if (error) {
                      Alert.alert('Error', 'No se pudo reenviar el correo de verificación');
                    } else {
                      Alert.alert(
                        'Correo enviado',
                        'Se ha reenviado el correo de verificación. Por favor, revisa tu bandeja de entrada.'
                      );
                    }
                  } catch (err) {
                    console.error('[Login v5.0] Error resending email:', err);
                    Alert.alert('Error', 'Ocurrió un error al reenviar el correo');
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

      console.log('[Login v5.0] ✅ Login successful:', authData.user.id);
      
      // Navigate to main app
      router.replace('/(tabs)/explorar');
    } catch (error: any) {
      console.error('[Login v5.0] ❌ Error in handleLogin:', error);
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
        <Text style={styles.headerTitle}>Iniciar sesión</Text>
        <Text style={styles.headerSubtitle}>Bienvenido de vuelta</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          {/* Email Input */}
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
            </Animated.View>
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}
          </View>

          {/* Password Input */}
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
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() => router.push('/auth/recuperar-password-v5')}
            disabled={loading}
          >
            <Text style={styles.forgotButtonText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Iniciar sesión</Text>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>¿No tienes cuenta? </Text>
            <TouchableOpacity
              onPress={() => router.replace('/auth/registro-v5')}
              disabled={loading}
            >
              <Text style={styles.registerLink}>Regístrate</Text>
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
  header: {
    paddingTop: Platform.OS === 'android' ? 60 : 80,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  backButton: {
    marginBottom: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  inputContainerFocused: {
    borderColor: colors.primary,
    backgroundColor: '#fff',
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
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    marginLeft: 4,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 32,
  },
  forgotButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
});
