
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

export default function CrearPasswordGoogleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      console.log('[CrearPasswordGoogle] Session detected, moving to verify step');
      setHasSession(true);
      setStep('verify');
    }
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  const handleRequestPasswordReset = async () => {
    if (!email) {
      Alert.alert('Error', 'No se proporcionó un correo electrónico');
      return;
    }

    setLoading(true);

    try {
      console.log('[CrearPasswordGoogle] Solicitando restablecimiento de contraseña para:', email);

      // Send password reset email with proper redirect
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `https://natively.dev/auth/crear-password-google?email=${encodeURIComponent(email)}`,
      });

      if (resetError) {
        console.error('[CrearPasswordGoogle] Error enviando email de restablecimiento:', resetError);
        Alert.alert('Error', 'No se pudo enviar el correo de verificación. Por favor, intenta nuevamente.');
        setLoading(false);
        return;
      }

      console.log('[CrearPasswordGoogle] ✅ Email de restablecimiento enviado');

      Alert.alert(
        'Correo enviado',
        'Hemos enviado un enlace de confirmación a tu correo electrónico. Por favor, haz clic en el enlace para continuar con la configuración de tu contraseña.\n\nEl enlace es válido por 1 hora.',
        [
          {
            text: 'Entendido',
          },
        ]
      );
    } catch (error: any) {
      console.error('[CrearPasswordGoogle] ❌ Error en handleRequestPasswordReset:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (!password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Por favor, completa todos los campos');
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
      console.log('[CrearPasswordGoogle] Actualizando contraseña...');

      // Update password using Supabase Auth
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.error('[CrearPasswordGoogle] Error actualizando contraseña:', updateError);
        Alert.alert('Error', 'No se pudo actualizar la contraseña. Por favor, intenta nuevamente.');
        setLoading(false);
        return;
      }

      if (!updateData.user) {
        Alert.alert('Error', 'No se pudo actualizar la contraseña');
        setLoading(false);
        return;
      }

      console.log('[CrearPasswordGoogle] ✅ Contraseña actualizada en Auth');

      // Update provider to 'barlive' and mark email as verified in usuarios table
      const { error: dbUpdateError } = await supabase
        .from('usuarios')
        .update({
          provider: 'barlive',
          email_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', updateData.user.id);

      if (dbUpdateError) {
        console.error('[CrearPasswordGoogle] Error actualizando usuario en DB:', dbUpdateError);
        // Don't fail here, password is already set
      } else {
        console.log('[CrearPasswordGoogle] ✅ Usuario actualizado en DB');
      }

      // Sign out to force fresh login with new password
      await supabase.auth.signOut();

      Alert.alert(
        '¡Contraseña configurada!',
        'Tu contraseña ha sido configurada exitosamente. Ahora puedes iniciar sesión con tu correo y contraseña.\n\nTodos tus datos, roles y configuraciones se han mantenido intactos.',
        [
          {
            text: 'Iniciar sesión',
            onPress: () => router.replace('/auth/login'),
          },
        ]
      );
    } catch (error: any) {
      console.error('[CrearPasswordGoogle] ❌ Error en handleSetPassword:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'request') {
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
          <Text style={styles.headerTitle}>Configurar contraseña</Text>
          <Text style={styles.headerSubtitle}>Migración a BarLive Auth 3.0</Text>
        </LinearGradient>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <View style={styles.infoBox}>
              <IconSymbol
                ios_icon_name="info.circle.fill"
                android_material_icon_name="info"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.infoText}>
                Tu cuenta fue creada con Google. Para continuar usando BarLive con nuestro nuevo sistema de autenticación, 
                necesitas configurar una contraseña.
              </Text>
            </View>

            <Text style={styles.emailLabel}>Correo electrónico</Text>
            <View style={styles.emailBox}>
              <Text style={styles.emailText}>{email}</Text>
            </View>

            <View style={styles.stepBox}>
              <Text style={styles.stepTitle}>Paso 1: Confirmación por correo</Text>
              <Text style={styles.stepText}>
                Te enviaremos un enlace de confirmación a tu correo electrónico. 
                Haz clic en el enlace para verificar tu identidad y continuar con la configuración de tu contraseña.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRequestPasswordReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Enviar enlace de confirmación</Text>
              )}
            </TouchableOpacity>

            <View style={styles.noteBox}>
              <Text style={styles.noteText}>
                Nota: Una vez configurada tu contraseña, podrás iniciar sesión con tu correo y contraseña. 
                Todos tus datos, roles y configuraciones se mantendrán intactos.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
        <Text style={styles.headerTitle}>Configurar contraseña</Text>
        <Text style={styles.headerSubtitle}>Paso 2: Nueva contraseña</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <View style={styles.successBox}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check_circle"
              size={24}
              color="#10B981"
            />
            <Text style={styles.successText}>
              ¡Verificación exitosa! Ahora puedes configurar tu nueva contraseña.
            </Text>
          </View>

          <Text style={styles.emailLabel}>Correo electrónico</Text>
          <View style={styles.emailBox}>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          <Text style={styles.label}>Nueva contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <Text style={styles.label}>Confirmar contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="Repite tu contraseña"
            placeholderTextColor={colors.textSecondary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Configurar contraseña</Text>
            )}
          </TouchableOpacity>

          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              Una vez configurada tu contraseña, podrás iniciar sesión con tu correo y contraseña. 
              Todos tus datos, roles y configuraciones se mantendrán intactos.
            </Text>
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
    paddingTop: 60,
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
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  successBox: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  successText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  stepBox: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  stepText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  emailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emailBox: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  emailText: {
    fontSize: 16,
    color: colors.text,
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
  noteBox: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 16,
  },
  noteText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
