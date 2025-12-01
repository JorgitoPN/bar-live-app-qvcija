
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

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
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
      // Get user data
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (userError || !userData) {
        console.error('[CrearPasswordGoogle] Error getting user:', userError);
        Alert.alert('Error', 'No se pudo encontrar el usuario');
        setLoading(false);
        return;
      }

      // Update provider to barlive and mark email as verified
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          provider: 'barlive',
          email_verified: true,
        })
        .eq('id', userData.id);

      if (updateError) {
        console.error('[CrearPasswordGoogle] Error updating user:', updateError);
        Alert.alert('Error', 'No se pudo actualizar el usuario');
        setLoading(false);
        return;
      }

      // Update password in Supabase Auth
      // First, we need to sign up the user with the new password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            provider: 'barlive',
          },
        },
      });

      if (authError) {
        // If user already exists in auth, try to update password
        console.log('[CrearPasswordGoogle] User exists in auth, attempting password update');
        
        // We need to send a password reset email
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'https://natively.dev/auth/reset-password',
        });

        if (resetError) {
          console.error('[CrearPasswordGoogle] Error sending reset email:', resetError);
          Alert.alert('Error', 'No se pudo configurar la contraseña. Por favor, intenta recuperar tu contraseña desde la pantalla de inicio de sesión.');
          setLoading(false);
          return;
        }

        Alert.alert(
          'Verificación requerida',
          'Hemos enviado un enlace de verificación a tu correo electrónico. Por favor, sigue las instrucciones para completar la configuración de tu contraseña.',
          [
            {
              text: 'Entendido',
              onPress: () => router.replace('/auth/login'),
            },
          ]
        );
        setLoading(false);
        return;
      }

      console.log('[CrearPasswordGoogle] ✅ Password set successfully');

      Alert.alert(
        'Contraseña configurada',
        'Tu contraseña ha sido configurada exitosamente. Ahora puedes iniciar sesión con tu correo y contraseña.',
        [
          {
            text: 'Iniciar sesión',
            onPress: () => router.replace('/auth/login'),
          },
        ]
      );
    } catch (error: any) {
      console.error('[CrearPasswordGoogle] ❌ Error in handleSetPassword:', error);
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
              Nota: Una vez configurada tu contraseña, podrás iniciar sesión con tu correo y contraseña. 
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
