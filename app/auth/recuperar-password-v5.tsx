
import React, { useState, useRef } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

export default function RecuperarPasswordV5Screen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialEmail = params.email as string || '';
  
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  
  const emailShakeAnim = useRef(new Animated.Value(0)).current;
  const successScaleAnim = useRef(new Animated.Value(0)).current;

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
    if (emailError) setEmailError('');
  };

  const handleEmailBlur = () => {
    setEmailFocused(false);
    if (email && !validateEmail(email)) {
      setEmailError('Correo electrónico inválido');
      shakeAnimation(emailShakeAnim);
    }
  };

  const handleSendResetEmail = async () => {
    if (!email.trim()) {
      setEmailError('El correo es requerido');
      shakeAnimation(emailShakeAnim);
      return;
    }

    if (!validateEmail(email.trim())) {
      setEmailError('Correo electrónico inválido');
      shakeAnimation(emailShakeAnim);
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      console.log('[RecuperarPassword v5.0] 🔍 Sending reset email:', normalizedEmail);

      // Check if user exists and get provider info
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id, provider, email_verified')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (userData?.provider === 'google') {
        Alert.alert(
          'Cuenta de Google',
          'Esta cuenta fue creada con Google. Para poder iniciar sesión con contraseña, primero necesitas configurar una.',
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
        setLoading(false);
        return;
      }

      // Send reset email
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: 'https://barliveapp.es/auth/restablecer-password',
      });

      if (error) {
        console.error('[RecuperarPassword v5.0] ❌ Error sending email:', error);
        
        if (error.message.includes('rate limit')) {
          Alert.alert(
            'Demasiados intentos',
            'Has intentado restablecer tu contraseña demasiadas veces. Por favor, espera unos minutos.'
          );
        } else {
          Alert.alert(
            'Error',
            'No se pudo enviar el correo de restablecimiento. Por favor, intenta nuevamente.'
          );
        }
        setLoading(false);
        return;
      }

      console.log('[RecuperarPassword v5.0] ✅ Email sent successfully');
      
      setEmailSent(true);
      
      // Animate success
      Animated.spring(successScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } catch (error: any) {
      console.error('[RecuperarPassword v5.0] ❌ Exception:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <View style={styles.container}>
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
          <Text style={styles.headerTitle}>Correo enviado</Text>
        </LinearGradient>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.successContainer,
              { transform: [{ scale: successScaleAnim }] },
            ]}
          >
            <View style={styles.successIconContainer}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={80}
                color="#10b981"
              />
            </View>
            <Text style={styles.successTitle}>¡Correo enviado!</Text>
            <Text style={styles.successText}>
              Hemos enviado un correo a:
            </Text>
            <Text style={styles.emailText}>{email}</Text>
            
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>📋 Próximos pasos:</Text>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>1</Text>
                </View>
                <Text style={styles.instructionText}>Abre tu correo electrónico</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>2</Text>
                </View>
                <Text style={styles.instructionText}>Busca el correo de BarLive</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>3</Text>
                </View>
                <Text style={styles.instructionText}>Haz clic en "Restablecer contraseña"</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>4</Text>
                </View>
                <Text style={styles.instructionText}>Ingresa tu nueva contraseña</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleSendResetEmail}
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
                  />
                  <Text style={styles.resendButtonText}>Reenviar correo</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={() => router.replace('/auth/login-v5')}
            >
              <Text style={styles.backToLoginText}>Volver a iniciar sesión</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          <View style={styles.infoCard}>
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

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSendResetEmail}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Enviar correo de recuperación</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToLoginButton}
            onPress={() => router.replace('/auth/login-v5')}
          >
            <Text style={styles.backToLoginText}>Volver a iniciar sesión</Text>
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
  infoCard: {
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 32,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
  button: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
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
  backToLoginButton: {
    alignItems: 'center',
    padding: 16,
  },
  backToLoginText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 32,
  },
  instructionsCard: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  instructionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  instructionNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
});
