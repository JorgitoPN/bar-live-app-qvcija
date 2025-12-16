
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
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

export default function ConfigurarPasswordGoogleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;
  
  const [loading, setLoading] = useState(false);
  const [tokenSent, setTokenSent] = useState(false);

  useEffect(() => {
    if (!email) {
      Alert.alert('Error', 'No se proporcionó un correo electrónico');
      router.back();
    }
  }, [email, router]);

  const handleSendToken = async () => {
    if (!email) {
      Alert.alert('Error', 'No se proporcionó un correo electrónico');
      return;
    }

    setLoading(true);

    try {
      console.log('[ConfigurarPasswordGoogle] 📧 Enviando token de configuración:', email);

      // Get the project URL
      const { data: { project_url } } = await supabase.functions.getProjectUrl();
      const functionsUrl = project_url || 'https://embntaqwlwmgazvrglaf.supabase.co';

      // Call the Edge Function to request password token
      const response = await fetch(`${functionsUrl}/functions/v1/request-password-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
        },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(),
          isGoogleUser: true // Flag to indicate this is a Google user setting up password
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[ConfigurarPasswordGoogle] ❌ Error:', result);
        throw new Error(result.error || 'Error al enviar el código');
      }

      console.log('[ConfigurarPasswordGoogle] ✅ Token enviado exitosamente');
      setTokenSent(true);

      Alert.alert(
        '✅ Código enviado',
        'Te hemos enviado un código de verificación de 6 dígitos a tu correo electrónico. Por favor, revisa tu bandeja de entrada (y la carpeta de spam).',
        [
          {
            text: 'Continuar',
            onPress: () => {
              router.push({
                pathname: '/auth/validar-token-password',
                params: { 
                  email: email.trim().toLowerCase(),
                  isGoogleUser: 'true' // Pass flag to next screen
                },
              });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('[ConfigurarPasswordGoogle] ❌ Error:', error);
      // Always show success to avoid revealing email existence
      setTokenSent(true);
      Alert.alert(
        '✅ Código enviado',
        'Si existe una cuenta asociada a este correo, recibirás un código de verificación. Por favor, revisa tu bandeja de entrada.',
        [
          {
            text: 'Continuar',
            onPress: () => {
              router.push({
                pathname: '/auth/validar-token-password',
                params: { 
                  email: email.trim().toLowerCase(),
                  isGoogleUser: 'true'
                },
              });
            },
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/auth/login');
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
        <Text style={styles.headerSubtitle}>Usuario de Google</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <View style={styles.infoBox}>
            <IconSymbol
              ios_icon_name="person.circle.fill"
              android_material_icon_name="account_circle"
              size={64}
              color={colors.primary}
            />
            <Text style={styles.infoTitle}>¡Hola de nuevo!</Text>
            <Text style={styles.infoText}>
              Tu cuenta fue creada con Google. Para poder iniciar sesión con email y contraseña, necesitas configurar una contraseña.
            </Text>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsTitle}>📋 ¿Cómo funciona?</Text>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Solicitar código</Text>
                <Text style={styles.stepText}>Haz clic en "Enviar código de verificación"</Text>
              </View>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Revisar correo</Text>
                <Text style={styles.stepText}>Recibirás un código de 6 dígitos en tu email</Text>
              </View>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Introducir código</Text>
                <Text style={styles.stepText}>Ingresa el código en la siguiente pantalla</Text>
              </View>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Crear contraseña</Text>
                <Text style={styles.stepText}>Configura tu nueva contraseña segura</Text>
              </View>
            </View>
          </View>

          {tokenSent && (
            <View style={styles.successBox}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={32}
                color="#10b981"
              />
              <Text style={styles.successText}>
                Código enviado exitosamente. Por favor, revisa tu bandeja de entrada.
              </Text>
            </View>
          )}

          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>💡 Importante:</Text>
            <Text style={styles.tipItem}>
              • El código expira en 1 hora
            </Text>
            <Text style={styles.tipItem}>
              • Revisa tu carpeta de spam si no lo ves
            </Text>
            <Text style={styles.tipItem}>
              • Puedes solicitar un nuevo código si es necesario
            </Text>
            <Text style={styles.tipItem}>
              • Una vez configurada, podrás usar tu contraseña para iniciar sesión
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSendToken}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="paperplane.fill"
                  android_material_icon_name="send"
                  size={20}
                  color="#fff"
                  style={styles.buttonIcon}
                />
                <Text style={styles.buttonText}>
                  {tokenSent ? 'Reenviar código' : 'Enviar código de verificación'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToLoginButton}
            onPress={handleBackToLogin}
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
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    marginTop: 8,
  },
  instructionsBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  stepText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    color: '#065f46',
    marginLeft: 12,
    lineHeight: 20,
  },
  tipsBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  tipItem: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
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
