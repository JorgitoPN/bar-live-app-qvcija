
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
import * as Linking from 'expo-linking';
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
  buttonSecondary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

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
      console.log('[LoginPopup] Usuario ya autenticado, redirigiendo...');
      router.replace('/(tabs)/explorar');
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
        console.log('[LoginPopup] Iniciando sesión con BarLive...');
        const { user: userData, error } = await signInWithBarLive(email, password);
        
        if (error) {
          console.log('[LoginPopup] Error en login:', error);
          Alert.alert('Error', error || 'Error al iniciar sesión');
          return;
        }

        if (userData) {
          console.log('[LoginPopup] Login exitoso');
          
          // Refresh user in context
          await refreshUser();

          // Check if user needs to see propietario message
          if (!userData.ha_visto_mensaje_propietario) {
            router.replace({
              pathname: '/auth/bienvenida-propietario',
              params: {
                userId: userData.id,
                userName: userData.nombre,
              }
            });
          } else {
            Alert.alert('¡Bienvenido!', 'Has iniciado sesión correctamente', [
              {
                text: 'OK',
                onPress: () => router.replace('/(tabs)/explorar'),
              },
            ]);
          }
        }
      } else {
        // Signup
        console.log('[LoginPopup] Creando cuenta con BarLive...');
        const { user: userData, error } = await signUpWithBarLive(email, password, nombre);
        
        if (error) {
          console.log('[LoginPopup] Error en signup:', error);
          Alert.alert('Error', error || 'Error al crear la cuenta');
          return;
        }

        if (userData) {
          console.log('[LoginPopup] Cuenta creada exitosamente');
          
          // Send welcome email
          try {
            await sendWelcomeEmail(email, nombre);
          } catch (emailError) {
            console.log('[LoginPopup] Error enviando email de bienvenida:', emailError);
          }

          Alert.alert(
            '¡Cuenta creada!',
            'Por favor, verifica tu correo electrónico para confirmar tu cuenta. Revisa también tu carpeta de spam.',
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
      console.error('[LoginPopup] Error en autenticación:', error);
      Alert.alert('Error', error.message || 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);

    try {
      console.log('[LoginPopup] Iniciando Google Sign-In...');
      const result = await signInWithGoogle();

      // On web, signInWithGoogle will redirect to Google, so we won't reach this code
      // On native, we'll get the result here
      if (Platform.OS !== 'web') {
        const { user: userData, error, isNewUser } = result;

        if (error) {
          console.log('[LoginPopup] Error en Google sign-in:', error);
          
          // Check for specific error types
          if (error.includes('not configured') || error.includes('credentials')) {
            Alert.alert(
              'Configuración requerida',
              'Para usar Google Sign-In, necesitas configurar Supabase con tus credenciales de Google Auth. Visita la documentación de Supabase para más información.',
              [{ text: 'OK' }]
            );
          } else if (error.includes('cancelled') || error.includes('canceled')) {
            // User cancelled, no need to show error
            console.log('[LoginPopup] Usuario canceló Google sign-in');
          } else if (error.includes('network') || error.includes('connection')) {
            Alert.alert(
              'Error de conexión',
              'No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet e intenta nuevamente.',
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert('Error', error || 'Error al iniciar sesión con Google');
          }
          return;
        }

        if (userData) {
          console.log('[LoginPopup] Google Sign-In exitoso');
          
          // Refresh user in context
          await refreshUser();

          // If new user or hasn't seen propietario message, redirect to welcome screen
          if (isNewUser || !userData.ha_visto_mensaje_propietario) {
            router.replace({
              pathname: '/auth/bienvenida-propietario',
              params: {
                userId: userData.id,
                userName: userData.nombre,
              }
            });
          } else {
            Alert.alert('¡Bienvenido!', 'Has iniciado sesión con Google correctamente', [
              {
                text: 'OK',
                onPress: () => router.replace('/(tabs)/explorar'),
              },
            ]);
          }
        }
      }
    } catch (error: any) {
      console.error('[LoginPopup] Error en Google sign-in:', error);
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
        Alert.alert('Error', error || 'Error al enviar el correo de recuperación');
        return;
      }

      Alert.alert(
        'Correo enviado',
        'Revisa tu correo electrónico para restablecer tu contraseña',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('[LoginPopup] Error en password reset:', error);
      Alert.alert('Error', error.message || 'Error al enviar el correo de recuperación');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Cargando...</Text>
      </View>
    );
  }

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
            <IconSymbol name="globe" size={24} color={colors.text} />
            <Text style={styles.socialButtonText}>Continuar con Google</Text>
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
            />
          </View>

          {isLogin && (
            <TouchableOpacity onPress={handleForgotPassword}>
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
          <Text style={[styles.buttonText, styles.buttonTextPrimary]}>
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
          </Text>
          <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
            <Text style={styles.link}>
              {isLogin ? 'Crear cuenta' : 'Iniciar sesión'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
