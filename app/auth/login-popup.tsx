
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { getContentBottomPadding, scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

/**
 * ✅ LOGIN POPUP SCREEN v144.0 - ANDROID SCROLL & SCALING FIX
 * 
 * CRITICAL FIXES v144.0 (ANDROID ONLY):
 * - ✅ Enabled proper keyboard-aware scrolling (INCLUDES HEADER)
 * - ✅ Added bottom padding for Android navigation buttons
 * - ✅ ALL text uses scaleFontSize() for consistency
 * - ✅ ALL icons use scaleIconSize() for consistency
 * - ✅ Content no longer hidden by keyboard or nav buttons
 * - ✅ iOS design remains unchanged
 */

export default function LoginPopupScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      console.log('[LoginPopup] ✅ Usuario ya autenticado, cerrando modal');
      router.back();
    }
  }, [user, router]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id, email_verified, provider, rol_app')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (userError && userError.code !== 'PGRST116') {
        console.error('[LoginPopup] Error checking user:', userError);
        Alert.alert('Error', 'No se pudo verificar el usuario');
        setLoading(false);
        return;
      }

      if (!userData) {
        Alert.alert('Error', 'Usuario no encontrado. Por favor, regístrate primero.');
        setLoading(false);
        return;
      }

      if (userData.provider === 'google') {
        Alert.alert(
          'Configuración requerida',
          'Tu cuenta fue creada con Google. Por favor, configura una contraseña para continuar con el nuevo sistema de autenticación.',
          [
            {
              text: 'Configurar contraseña',
              onPress: () => {
                router.push({
                  pathname: '/auth/crear-password-google',
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

      if (!userData.email_verified) {
        Alert.alert(
          'Email no verificado',
          'Por favor, verifica tu correo electrónico antes de iniciar sesión.',
          [
            {
              text: 'Reenviar código',
              onPress: () => {
                router.push({
                  pathname: '/auth/verificar-email',
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

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password,
      });

      if (authError) {
        console.error('[LoginPopup] Error signing in:', authError);
        
        if (authError.message.includes('Invalid login credentials')) {
          Alert.alert('Error', 'Email o contraseña incorrectos');
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

      console.log('[LoginPopup] ✅ Login successful:', authData.user.id);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      await refreshUser();
      
      router.back();
    } catch (error: any) {
      console.error('[LoginPopup] ❌ Error in handleLogin:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor, ingresa tu correo electrónico');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Error', 'Por favor, ingresa un correo electrónico válido');
      return;
    }

    router.push({
      pathname: '/auth/recuperar-password',
      params: { email: email.trim().toLowerCase() },
    });
  };

  const handleClose = () => {
    if (!loading) {
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: getContentBottomPadding(120) }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={handleClose}
          disabled={loading}
        >
          <IconSymbol 
            ios_icon_name="xmark" 
            android_material_icon_name="close"
            size={scaleIconSize(20)} 
            color={colors.text} 
          />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { fontSize: scaleFontSize(28) }]}>Iniciar Sesión</Text>
          <Text style={[styles.subtitle, { fontSize: scaleFontSize(16) }]}>Bienvenido de nuevo a BarLive</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
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
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Contraseña</Text>
            <TextInput
              style={[styles.input, { fontSize: scaleFontSize(16) }]}
              placeholder="••••••••"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <TouchableOpacity 
            onPress={handleForgotPassword} 
            disabled={loading}
            style={styles.forgotButton}
          >
            <Text style={[styles.link, { fontSize: scaleFontSize(14) }]}>
              ¿Olvidaste tu contraseña?
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[styles.buttonText, styles.buttonTextPrimary, { fontSize: scaleFontSize(16) }]}>
              Iniciar Sesión
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={[styles.dividerText, { fontSize: scaleFontSize(14) }]}>o</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { fontSize: scaleFontSize(14) }]}>¿No tienes cuenta?</Text>
          <TouchableOpacity 
            onPress={() => router.push('/auth/registro-email')} 
            disabled={loading}
          >
            <Text style={[styles.link, { fontSize: scaleFontSize(14) }]}>Crear cuenta</Text>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    // paddingBottom set dynamically via getContentBottomPadding()
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    // fontSize set dynamically via scaleFontSize()
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    // fontSize set dynamically via scaleFontSize()
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    // fontSize set dynamically via scaleFontSize()
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    // fontSize set dynamically via scaleFontSize()
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -8,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    // fontSize set dynamically via scaleFontSize()
    fontWeight: '600',
    color: colors.text,
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  dividerText: {
    marginHorizontal: 16,
    // fontSize set dynamically via scaleFontSize()
    color: colors.textSecondary,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    // fontSize set dynamically via scaleFontSize()
    color: colors.textSecondary,
    marginBottom: 8,
  },
  link: {
    // fontSize set dynamically via scaleFontSize()
    color: colors.primary,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
