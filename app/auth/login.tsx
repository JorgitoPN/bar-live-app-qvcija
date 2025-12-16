
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

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkIfGoogleUserWithoutPassword = async (email: string): Promise<boolean> => {
    try {
      // Check if user exists in usuarios table with Google provider
      const { data, error } = await supabase
        .from('usuarios')
        .select('provider')
        .eq('email', email)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[Login] Error checking user provider:', error);
        return false;
      }

      // Only return true if provider is still 'google' (hasn't been updated to 'email')
      return data?.provider === 'google';
    } catch (error) {
      console.error('[Login] Error in checkIfGoogleUserWithoutPassword:', error);
      return false;
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

      console.log('[Login v6.0] 🔐 Intentando iniciar sesión:', normalizedEmail);

      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password,
      });

      if (authError) {
        console.error('[Login v6.0] ❌ Error signing in:', authError);
        
        if (authError.message.includes('Email not confirmed')) {
          Alert.alert(
            'Email no verificado',
            'Por favor, verifica tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.',
            [
              {
                text: 'Reenviar correo',
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
                      Alert.alert('Error', 'No se pudo reenviar el correo de verificación');
                    } else {
                      Alert.alert(
                        'Correo enviado',
                        'Se ha reenviado el correo de verificación. Por favor, revisa tu bandeja de entrada.'
                      );
                    }
                  } catch (err) {
                    console.error('[Login v6.0] Error resending email:', err);
                    Alert.alert('Error', 'Ocurrió un error al reenviar el correo');
                  }
                },
              },
              { text: 'Cancelar', style: 'cancel' },
            ]
          );
        } else if (authError.message.includes('Invalid login credentials')) {
          // Check if this is a Google user who hasn't set a password yet
          const isGoogleUserWithoutPassword = await checkIfGoogleUserWithoutPassword(normalizedEmail);
          
          if (isGoogleUserWithoutPassword) {
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
                { text: 'Cancelar', style: 'cancel' },
              ]
            );
          } else {
            Alert.alert('Error', 'Email o contraseña incorrectos');
          }
        } else {
          Alert.alert('Error', authError.message || 'No se pudo iniciar sesión');
        }
        
        setLoading(false);
        return;
      }

      if (!authData.user || !authData.session) {
        console.error('[Login v6.0] ❌ No user or session returned');
        Alert.alert('Error', 'No se pudo iniciar sesión. Por favor, intenta de nuevo.');
        setLoading(false);
        return;
      }

      console.log('[Login v6.0] ✅ Login successful:', authData.user.id);
      console.log('[Login v6.0] 📅 Session expires at:', new Date(authData.session.expires_at! * 1000).toLocaleString());

      // ✅ CRITICAL FIX: Wait a moment for the session to be fully persisted
      // This ensures the AuthContext has time to process the SIGNED_IN event
      await new Promise(resolve => setTimeout(resolve, 500));

      // ✅ CRITICAL FIX: Verify session is actually persisted before navigating
      const { data: { session: verifiedSession }, error: verifyError } = await supabase.auth.getSession();
      
      if (verifyError || !verifiedSession) {
        console.error('[Login v6.0] ❌ Session verification failed:', verifyError);
        Alert.alert('Error', 'Error al establecer la sesión. Por favor, intenta de nuevo.');
        setLoading(false);
        return;
      }

      console.log('[Login v6.0] ✅ Session verified successfully');
      console.log('[Login v6.0] 🚀 Navigating to main app...');
      
      // Navigate to main app
      router.replace('/(tabs)/explorar');
    } catch (error: any) {
      console.error('[Login v6.0] ❌ Error in handleLogin:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      // Navigate directly to v7 without email
      router.push('/auth/recuperar-password-v7');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Error', 'Por favor, ingresa un correo electrónico válido');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if this is a Google user without password
    const isGoogleUserWithoutPassword = await checkIfGoogleUserWithoutPassword(normalizedEmail);

    if (isGoogleUserWithoutPassword) {
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
    // Check if we can go back in the navigation stack
    if (router.canGoBack()) {
      router.back();
    } else {
      // If there's no previous screen, navigate to the auth index
      router.replace('/auth');
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
          onPress={handleGoBack}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Iniciar sesión</Text>
        <Text style={styles.headerSubtitle}>Bienvenido de vuelta a BarLive</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 60 : 80,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
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
});
