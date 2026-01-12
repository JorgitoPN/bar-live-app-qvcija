
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
import { supabase } from '@/utils/supabase';
import { getContentBottomPadding, getHeaderTitleSize, getHeaderIconSize, scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

/**
 * ✅ REGISTRO EMAIL SCREEN v144.0 - ANDROID SCROLL & SCALING FIX
 * 
 * CRITICAL FIXES v144.0 (ANDROID ONLY):
 * - ✅ Enabled proper keyboard-aware scrolling (INCLUDES HEADER)
 * - ✅ Added bottom padding for Android navigation buttons
 * - ✅ Consistent header title and icon sizes
 * - ✅ ALL text uses scaleFontSize() for consistency
 * - ✅ ALL icons use scaleIconSize() for consistency
 * - ✅ Content no longer hidden by keyboard or nav buttons
 * - ✅ iOS design remains unchanged
 */

export default function RegistroEmailScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim() || !nombre.trim()) {
      Alert.alert('Error', 'Por favor, completa todos los campos');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Error', 'Por favor, ingresa un correo electrónico válido');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      console.log('[Registro v4.0] 📝 Registrando nuevo usuario:', normalizedEmail);

      const { data: existingUser, error: checkError } = await supabase
        .from('usuarios')
        .select('id, email_verified')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('[Registro v4.0] Error checking email:', checkError);
        Alert.alert('Error', 'No se pudo verificar el correo. Por favor, intenta nuevamente.');
        setLoading(false);
        return;
      }

      if (existingUser) {
        if (existingUser.email_verified) {
          Alert.alert(
            'Correo ya registrado',
            'Este correo ya está registrado. Por favor, inicia sesión.',
            [
              {
                text: 'Iniciar sesión',
                onPress: () => router.replace('/auth/login'),
              },
              { text: 'Cancelar', style: 'cancel' },
            ]
          );
        } else {
          Alert.alert(
            'Verificación pendiente',
            'Este correo ya está registrado pero no verificado. ¿Deseas reenviar el correo de verificación?',
            [
              {
                text: 'Reenviar',
                onPress: async () => {
                  try {
                    const { error } = await supabase.auth.resend({
                      type: 'signup',
                      email: normalizedEmail,
                      options: {
                        emailRedirectTo: 'https://natively.dev/email-confirmed',
                      },
                    });
                    
                    if (error) {
                      console.error('[Registro v4.0] Error resending email:', error);
                      if (error.message.includes('domain is not verified') || error.message.includes('450')) {
                        Alert.alert(
                          '⚠️ Servicio de correo en configuración',
                          'El servicio de correo está siendo configurado. Por favor, contacta con soporte para verificar tu cuenta.\n\n' +
                          '📞 Soporte: soporte@barliveapp.es'
                        );
                      } else {
                        Alert.alert('Error', 'No se pudo reenviar el correo de verificación');
                      }
                    } else {
                      Alert.alert(
                        'Correo enviado',
                        'Se ha reenviado el correo de verificación. Por favor, revisa tu bandeja de entrada.'
                      );
                      router.push({
                        pathname: '/auth/verificar-email',
                        params: { email: normalizedEmail },
                      });
                    }
                  } catch (err) {
                    console.error('[Registro v4.0] Error resending email:', err);
                    Alert.alert('Error', 'Ocurrió un error al reenviar el correo');
                  }
                },
              },
              { text: 'Cancelar', style: 'cancel' },
            ]
          );
        }
        setLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: password,
        options: {
          emailRedirectTo: 'https://natively.dev/email-confirmed',
          data: {
            nombre: nombre.trim(),
            provider: 'barlive',
            email_verified: false,
          },
        },
      });

      if (authError) {
        console.error('[Registro v4.0] ❌ Error creating auth user:', authError);
        console.error('[Registro v4.0] Error details:', JSON.stringify(authError, null, 2));
        
        if (authError.message.includes('already registered')) {
          Alert.alert('Error', 'Este correo ya está registrado. Por favor, inicia sesión.');
        } else if (authError.message.includes('domain is not verified') || authError.message.includes('450')) {
          Alert.alert(
            '⚠️ Servicio de correo en configuración',
            'Tu cuenta ha sido creada pero el servicio de correo está siendo configurado.\n\n' +
            '📧 Problema técnico:\n' +
            'El dominio de correo no está verificado en el servidor de emails.\n\n' +
            '✅ Solución:\n' +
            'Por favor, contacta con soporte para que activen tu cuenta manualmente.\n\n' +
            '📞 Soporte: soporte@barliveapp.es\n\n' +
            'Disculpa las molestias. Estamos trabajando para resolver esto lo antes posible.',
            [
              {
                text: 'Contactar soporte',
                onPress: () => {
                  console.log('Opening support contact');
                },
              },
              { text: 'Entendido', style: 'cancel' },
            ]
          );
        } else {
          Alert.alert('Error', authError.message || 'No se pudo crear la cuenta');
        }
        
        setLoading(false);
        return;
      }

      if (!authData.user) {
        Alert.alert('Error', 'No se pudo crear la cuenta. Por favor, intenta nuevamente.');
        setLoading(false);
        return;
      }

      console.log('[Registro v4.0] ✅ User created successfully:', authData.user.id);

      router.push({
        pathname: '/auth/verificar-email',
        params: { email: normalizedEmail },
      });

      Alert.alert(
        '¡Cuenta creada!',
        'Tu cuenta ha sido creada exitosamente. Hemos enviado un correo de verificación a tu email. Por favor, verifica tu correo electrónico para activar tu cuenta.\n\n' +
        '⚠️ Si no recibes el correo en unos minutos, revisa tu carpeta de spam o contacta con soporte.',
        [
          {
            text: 'Entendido',
          },
        ]
      );
    } catch (error: any) {
      console.error('[Registro v4.0] ❌ Error in handleRegister:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado. Por favor, contacta con soporte.\n\n📞 Soporte: soporte@barliveapp.es');
    } finally {
      setLoading(false);
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
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
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
          <Text style={[styles.headerTitle, { fontSize: getHeaderTitleSize() }]}>Crear cuenta</Text>
          <Text style={[styles.headerSubtitle, { fontSize: scaleFontSize(16) }]}>Únete a BarLive</Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Nombre</Text>
          <TextInput
            style={[styles.input, { fontSize: scaleFontSize(16) }]}
            placeholder="Tu nombre"
            placeholderTextColor={colors.textSecondary}
            value={nombre}
            onChangeText={setNombre}
            autoCapitalize="words"
            editable={!loading}
          />

          <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Correo electrónico</Text>
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

          <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Contraseña</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.passwordInput, { fontSize: scaleFontSize(16) }]}
              placeholder="Mínimo 8 caracteres"
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
                size={scaleIconSize(20)}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Confirmar contraseña</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.passwordInput, { fontSize: scaleFontSize(16) }]}
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
                size={scaleIconSize(20)}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.buttonText, { fontSize: scaleFontSize(16) }]}>Crear cuenta</Text>
            )}
          </TouchableOpacity>

          <View style={styles.termsContainer}>
            <Text style={[styles.termsText, { fontSize: scaleFontSize(12) }]}>
              Al registrarte, aceptas nuestros{' '}
              <Text style={styles.termsLink}>Términos de Servicio</Text>
              {' '}y{' '}
              <Text style={styles.termsLink}>Política de Privacidad</Text>
            </Text>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={[styles.dividerText, { fontSize: scaleFontSize(14) }]}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.replace('/auth/login')}
          >
            <Text style={[styles.loginButtonText, { fontSize: scaleFontSize(14) }]}>
              ¿Ya tienes cuenta? <Text style={styles.loginButtonTextBold}>Inicia sesión</Text>
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
    paddingTop: Platform.OS === 'android' ? 60 : 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  headerTitle: {
    // fontSize set dynamically via getHeaderTitleSize()
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 8,
  },
  headerSubtitle: {
    // fontSize set dynamically via scaleFontSize()
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    // paddingBottom set dynamically via getContentBottomPadding()
  },
  formContainer: {
    flex: 1,
    padding: 24,
  },
  label: {
    // fontSize set dynamically via scaleFontSize()
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
    // fontSize set dynamically via scaleFontSize()
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
    // fontSize set dynamically via scaleFontSize()
    color: colors.text,
  },
  eyeButton: {
    padding: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    // fontSize set dynamically via scaleFontSize()
    fontWeight: '600',
  },
  termsContainer: {
    marginBottom: 24,
  },
  termsText: {
    // fontSize set dynamically via scaleFontSize()
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
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
    // fontSize set dynamically via scaleFontSize()
  },
  loginButton: {
    alignItems: 'center',
  },
  loginButtonText: {
    // fontSize set dynamically via scaleFontSize()
    color: colors.textSecondary,
  },
  loginButtonTextBold: {
    fontWeight: '600',
    color: colors.primary,
  },
});
