
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

export default function RecuperarPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialEmail = params.email as string || '';
  
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkIfGoogleUser = async (email: string): Promise<boolean> => {
    try {
      // Check if user exists in usuarios table with Google provider
      const { data, error } = await supabase
        .from('usuarios')
        .select('provider')
        .eq('email', email)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[RecuperarPassword] Error checking user provider:', error);
        return false;
      }

      return data?.provider === 'google';
    } catch (error) {
      console.error('[RecuperarPassword] Error in checkIfGoogleUser:', error);
      return false;
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor, ingresa tu correo electrónico');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Error', 'Por favor, ingresa un correo electrónico válido');
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      console.log('[RecuperarPassword v4.0] 🔑 Solicitando recuperación de contraseña:', normalizedEmail);

      // Check if user exists
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id, provider')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (userError && userError.code !== 'PGRST116') {
        console.error('[RecuperarPassword v4.0] Error checking user:', userError);
        Alert.alert('Error', 'No se pudo verificar el usuario');
        setLoading(false);
        return;
      }

      if (!userData) {
        Alert.alert('Error', 'No existe una cuenta con este correo electrónico');
        setLoading(false);
        return;
      }

      // Check if this is a Google user
      if (userData.provider === 'google') {
        console.log('[RecuperarPassword v4.0] 🔍 Usuario de Google detectado');
        setLoading(false);
        
        Alert.alert(
          'Usuario de Google',
          'Tu cuenta fue creada con Google. Para poder iniciar sesión con contraseña, primero necesitas configurar una.',
          [
            {
              text: 'Configurar contraseña',
              onPress: () => {
                router.replace({
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

      // Use Supabase's built-in password reset - it will send an email automatically
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: 'https://natively.dev/email-confirmed',
      });

      if (resetError) {
        console.error('[RecuperarPassword v4.0] ❌ Error sending reset email:', resetError);
        Alert.alert('Error', 'No se pudo enviar el correo de recuperación. Por favor, intenta nuevamente.');
        setLoading(false);
        return;
      }

      console.log('[RecuperarPassword v4.0] ✅ Password reset email sent successfully');
      
      Alert.alert(
        '✅ Correo enviado',
        'Hemos enviado un enlace de recuperación a tu correo electrónico. Por favor, revisa tu bandeja de entrada (y la carpeta de spam) y sigue las instrucciones para restablecer tu contraseña.',
        [
          {
            text: 'Entendido',
            onPress: () => {
              router.back();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('[RecuperarPassword v4.0] ❌ Error in handleResetPassword:', error);
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
        <Text style={styles.headerTitle}>Recuperar contraseña</Text>
        <Text style={styles.headerSubtitle}>Restablece tu contraseña</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <View style={styles.infoBox}>
            <IconSymbol
              ios_icon_name="lock.fill"
              android_material_icon_name="lock"
              size={48}
              color={colors.primary}
            />
            <Text style={styles.infoTitle}>¿Olvidaste tu contraseña?</Text>
            <Text style={styles.infoText}>
              No te preocupes. Ingresa tu correo electrónico y te enviaremos 
              un enlace para restablecer tu contraseña.
            </Text>
          </View>

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
            autoFocus={!initialEmail}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Enviar enlace</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToLoginButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backToLoginText}>
              Volver a <Text style={styles.backToLoginTextBold}>Iniciar sesión</Text>
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
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 24,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
    marginBottom: 24,
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
  backToLoginButton: {
    alignItems: 'center',
  },
  backToLoginText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  backToLoginTextBold: {
    fontWeight: '600',
    color: colors.primary,
  },
});
