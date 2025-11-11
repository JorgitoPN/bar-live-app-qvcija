
import {
  signUpWithBarLive,
  signInWithBarLive,
  signInWithGoogle,
  resetPassword,
} from '@/utils/auth';
import { sendWelcomeEmail } from '@/utils/email';
import React, { useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
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
  Modal,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

WebBrowser.maybeCompleteAuthSession();

export default function LoginPopupScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If user is already logged in, redirect
    if (user) {
      console.log('[LoginPopup] ✅ Usuario ya autenticado, cerrando modal');
      router.back();
    }
  }, [user, router]);

  const handleBarLiveAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor, completa todos los campos');
      return;
    }

    if (!isLogin && !nombre) {
      Alert.alert('Error', 'Por favor, ingresa tu nombre');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Login
        console.log('[LoginPopup] 🔐 Iniciando sesión...');
        const { user: userData, error } = await signInWithBarLive(email, password);
        
        if (error) {
          console.log('[LoginPopup] ❌ Error en login:', error);
          Alert.alert('Error', error);
          return;
        }

        if (userData) {
          console.log('[LoginPopup] ✅ Login exitoso');
          await refreshUser();
          
          // Close modal and let AuthContext handle navigation
          router.back();
        }
      } else {
        // Signup
        console.log('[LoginPopup] 📝 Creando cuenta...');
        const { user: userData, error } = await signUpWithBarLive(email, password, nombre);
        
        if (error) {
          console.log('[LoginPopup] ❌ Error en signup:', error);
          Alert.alert('Error', error);
          return;
        }

        if (userData) {
          console.log('[LoginPopup] ✅ Cuenta creada');
          
          // Send welcome email (non-blocking)
          sendWelcomeEmail(email, nombre).catch(() => {});

          Alert.alert(
            '¡Cuenta creada!',
            'Por favor, verifica tu correo electrónico para confirmar tu cuenta.',
            [
              {
                text: 'OK',
                onPress: () => {
                  setIsLogin(true);
                  setPassword('');
                },
              },
            ]
          );
        }
      }
    } catch (error: any) {
      console.error('[LoginPopup] ❌ Error:', error);
      Alert.alert('Error', error.message || 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);

    try {
      console.log('[LoginPopup] 🔐 Iniciando Google Sign-In...');
      const result = await signInWithGoogle();

      // On web, signInWithGoogle will redirect, so we won't reach this code
      if (Platform.OS !== 'web') {
        const { user: userData, error } = result;

        if (error) {
          console.log('[LoginPopup] ❌ Error en Google sign-in:', error);
          
          if (error.includes('cancelled') || error.includes('canceled')) {
            // User cancelled, no need to show error
            console.log('[LoginPopup] ℹ️ Usuario canceló');
          } else {
            Alert.alert('Error', error);
          }
          return;
        }

        if (userData) {
          console.log('[LoginPopup] ✅ Google Sign-In exitoso');
          await refreshUser();
          
          // Close modal and let AuthContext handle navigation
          router.back();
        }
      }
    } catch (error: any) {
      console.error('[LoginPopup] ❌ Error:', error);
      Alert.alert('Error', error.message || 'Error al iniciar sesión con Google');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Por favor, ingresa tu correo electrónico');
      return;
    }

    setLoading(true);

    try {
      const { error } = await resetPassword(email);

      if (error) {
        Alert.alert('Error', error);
        return;
      }

      Alert.alert(
        'Correo enviado',
        'Revisa tu correo electrónico para restablecer tu contraseña',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('[LoginPopup] ❌ Error:', error);
      Alert.alert('Error', error.message || 'Error al enviar el correo');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
        <IconSymbol name="xmark" size={20} color={colors.text} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin
              ? 'Bienvenido de nuevo a BarLive'
              : 'Únete a la comunidad de BarLive'}
          </Text>
        </View>

        <View style={styles.socialButtons}>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <>
                <IconSymbol name="globe" size={24} color={colors.text} />
                <Text style={styles.socialButtonText}>Continuar con Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.form}>
          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                placeholder="Tu nombre"
                placeholderTextColor={colors.textSecondary}
                value={nombre}
                onChangeText={setNombre}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              placeholder="tu@email.com"
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
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {isLogin && (
            <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
              <Text style={[styles.link, { textAlign: 'right', marginTop: -8 }]}>
                ¿Olvidaste tu contraseña?
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={handleBarLiveAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[styles.buttonText, styles.buttonTextPrimary]}>
              {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
          </Text>
          <TouchableOpacity onPress={() => setIsLogin(!isLogin)} disabled={loading}>
            <Text style={styles.link}>
              {isLogin ? 'Crear cuenta' : 'Iniciar sesión'}
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
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
  buttonText: {
    fontSize: 16,
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
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: colors.textSecondary,
  },
  socialButtons: {
    marginBottom: 24,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  link: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
    backgroundColor: colors.card,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
