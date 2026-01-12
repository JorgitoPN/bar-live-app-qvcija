
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
import { getContentBottomPadding, getHeaderTitleSize, getHeaderIconSize, scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

/**
 * ✅ CONFIGURAR PASSWORD GOOGLE SCREEN v144.0 - ANDROID SCROLL & SCALING FIX
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

      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('request-password-token', {
        body: { 
          email: email.trim().toLowerCase(),
          isGoogleUser: true
        },
      });

      if (error) {
        console.error('[ConfigurarPasswordGoogle] ❌ Error:', error);
        throw error;
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
                  isGoogleUser: 'true'
                },
              });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('[ConfigurarPasswordGoogle] ❌ Error:', error);
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

  const headerIconSize = getHeaderIconSize();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
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
          <Text style={[styles.headerTitle, { fontSize: getHeaderTitleSize() }]}>Configurar contraseña</Text>
          <Text style={[styles.headerSubtitle, { fontSize: scaleFontSize(16) }]}>Usuario de Google</Text>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.formContainer}>
            <View style={styles.infoBox}>
              <IconSymbol
                ios_icon_name="person.circle.fill"
                android_material_icon_name="account_circle"
                size={scaleIconSize(64)}
                color={colors.primary}
              />
              <Text style={[styles.infoTitle, { fontSize: scaleFontSize(24) }]}>¡Hola de nuevo!</Text>
              <Text style={[styles.infoText, { fontSize: scaleFontSize(14) }]}>
                Tu cuenta fue creada con Google. Para poder iniciar sesión con email y contraseña, necesitas configurar una contraseña.
              </Text>
              <Text style={[styles.emailText, { fontSize: scaleFontSize(16) }]}>{email}</Text>
            </View>

            <View style={styles.instructionsBox}>
              <Text style={[styles.instructionsTitle, { fontSize: scaleFontSize(16) }]}>📋 ¿Cómo funciona?</Text>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={[styles.stepNumberText, { fontSize: scaleFontSize(16) }]}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { fontSize: scaleFontSize(14) }]}>Solicitar código</Text>
                  <Text style={[styles.stepText, { fontSize: scaleFontSize(13) }]}>Haz clic en "Enviar código de verificación"</Text>
                </View>
              </View>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={[styles.stepNumberText, { fontSize: scaleFontSize(16) }]}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { fontSize: scaleFontSize(14) }]}>Revisar correo</Text>
                  <Text style={[styles.stepText, { fontSize: scaleFontSize(13) }]}>Recibirás un código de 6 dígitos en tu email</Text>
                </View>
              </View>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={[styles.stepNumberText, { fontSize: scaleFontSize(16) }]}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { fontSize: scaleFontSize(14) }]}>Introducir código</Text>
                  <Text style={[styles.stepText, { fontSize: scaleFontSize(13) }]}>Ingresa el código en la siguiente pantalla</Text>
                </View>
              </View>
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={[styles.stepNumberText, { fontSize: scaleFontSize(16) }]}>4</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { fontSize: scaleFontSize(14) }]}>Crear contraseña</Text>
                  <Text style={[styles.stepText, { fontSize: scaleFontSize(13) }]}>Configura tu nueva contraseña segura</Text>
                </View>
              </View>
            </View>

            {tokenSent && (
              <View style={styles.successBox}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check_circle"
                  size={scaleIconSize(32)}
                  color="#10b981"
                />
                <Text style={[styles.successText, { fontSize: scaleFontSize(14) }]}>
                  Código enviado exitosamente. Por favor, revisa tu bandeja de entrada.
                </Text>
              </View>
            )}

            <View style={styles.tipsBox}>
              <Text style={[styles.tipsTitle, { fontSize: scaleFontSize(16) }]}>💡 Importante:</Text>
              <Text style={[styles.tipItem, { fontSize: scaleFontSize(14) }]}>
                • El código expira en 1 hora
              </Text>
              <Text style={[styles.tipItem, { fontSize: scaleFontSize(14) }]}>
                • Revisa tu carpeta de spam si no lo ves
              </Text>
              <Text style={[styles.tipItem, { fontSize: scaleFontSize(14) }]}>
                • Puedes solicitar un nuevo código si es necesario
              </Text>
              <Text style={[styles.tipItem, { fontSize: scaleFontSize(14) }]}>
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
                <React.Fragment>
                  <IconSymbol
                    ios_icon_name="paperplane.fill"
                    android_material_icon_name="send"
                    size={scaleIconSize(20)}
                    color="#fff"
                    style={styles.buttonIcon}
                  />
                  <Text style={[styles.buttonText, { fontSize: scaleFontSize(16) }]}>
                    {tokenSent ? 'Reenviar código' : 'Enviar código de verificación'}
                  </Text>
                </React.Fragment>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={handleBackToLogin}
            >
              <Text style={[styles.backToLoginText, { fontSize: scaleFontSize(14) }]}>
                Volver a <Text style={styles.backToLoginTextBold}>Iniciar sesión</Text>
              </Text>
            </TouchableOpacity>
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
  scrollContainer: {
    flexGrow: 1,
    // paddingBottom set dynamically via getContentBottomPadding()
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
    padding: 24,
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
    // fontSize set dynamically via scaleFontSize()
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  infoText: {
    // fontSize set dynamically via scaleFontSize()
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  emailText: {
    // fontSize set dynamically via scaleFontSize()
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
    // fontSize set dynamically via scaleFontSize()
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
    // fontSize set dynamically via scaleFontSize()
    fontWeight: 'bold',
    color: '#fff',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    // fontSize set dynamically via scaleFontSize()
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  stepText: {
    // fontSize set dynamically via scaleFontSize()
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
    // fontSize set dynamically via scaleFontSize()
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
    // fontSize set dynamically via scaleFontSize()
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  tipItem: {
    // fontSize set dynamically via scaleFontSize()
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
    // fontSize set dynamically via scaleFontSize()
    fontWeight: '600',
  },
  backToLoginButton: {
    alignItems: 'center',
  },
  backToLoginText: {
    // fontSize set dynamically via scaleFontSize()
    color: colors.textSecondary,
  },
  backToLoginTextBold: {
    fontWeight: '600',
    color: colors.primary,
  },
});
