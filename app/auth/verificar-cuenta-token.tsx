
import React, { useState, useRef, useEffect } from 'react';
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

export default function VerificarCuentaTokenScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string || '';
  const nombre = params.nombre as string || '';
  
  const [token, setToken] = useState(['', '', '', '', '', '']);
  const [validatingToken, setValidatingToken] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    // Focus first token input when component mounts
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 300);
  }, []);

  const handleTokenChange = (value: string, index: number) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newToken = [...token];
    newToken[index] = value;
    setToken(newToken);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !token[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleValidateToken = async () => {
    const fullToken = token.join('');

    if (fullToken.length !== 6) {
      Alert.alert('Error', 'Por favor, ingresa el código completo de 6 dígitos');
      return;
    }

    setValidatingToken(true);

    try {
      console.log('═══════════════════════════════════════════════════════');
      console.log('[VerificarCuentaToken] 🔍 VALIDACIÓN DE TOKEN');
      console.log('═══════════════════════════════════════════════════════');
      console.log('[VerificarCuentaToken] 📧 Email:', email);
      console.log('[VerificarCuentaToken] 🔢 Token:', fullToken);

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://embntaqwlwmgazvrglaf.supabase.co';

      // Call the Edge Function to validate token
      const validateResponse = await fetch(`${supabaseUrl}/functions/v1/validate-verification-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          token: fullToken 
        }),
      });

      const validateResult = await validateResponse.json();

      if (!validateResult.valid) {
        console.error('[VerificarCuentaToken] ❌ Token inválido:', validateResult.error);
        Alert.alert(
          'Código inválido',
          validateResult.error || 'El código ingresado es inválido o ha expirado. Por favor, verifica e intenta nuevamente.',
          [
            {
              text: 'Solicitar nuevo código',
              onPress: handleResendToken,
            },
            {
              text: 'Reintentar',
              style: 'cancel',
            },
          ]
        );
        return;
      }

      console.log('[VerificarCuentaToken] ✅ Token válido, verificando cuenta...');

      // Call the Edge Function to verify account
      const verifyResponse = await fetch(`${supabaseUrl}/functions/v1/verify-account-with-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          token: fullToken 
        }),
      });

      const verifyResult = await verifyResponse.json();

      if (!verifyResult.success) {
        console.error('[VerificarCuentaToken] ❌ Error al verificar cuenta:', verifyResult.error);
        Alert.alert(
          'Error',
          verifyResult.error || 'No se pudo verificar tu cuenta. Por favor, intenta nuevamente.'
        );
        return;
      }

      console.log('[VerificarCuentaToken] ✅ Cuenta verificada exitosamente');

      Alert.alert(
        '✅ ¡Cuenta verificada!',
        'Tu cuenta ha sido verificada exitosamente. Ahora puedes iniciar sesión y disfrutar de todas las funciones de BarLive.',
        [
          {
            text: 'Ir a iniciar sesión',
            onPress: () => {
              router.replace('/auth/login-v6');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('[VerificarCuentaToken] ❌ Error:', error);
      Alert.alert(
        'Error',
        'Ocurrió un error al validar el código. Por favor, intenta nuevamente.'
      );
    } finally {
      setValidatingToken(false);
      console.log('[VerificarCuentaToken] 🏁 Proceso finalizado');
      console.log('═══════════════════════════════════════════════════════');
    }
  };

  const handleResendToken = async () => {
    setResending(true);

    try {
      console.log('[VerificarCuentaToken] 🔄 Reenviando token...');

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://embntaqwlwmgazvrglaf.supabase.co';

      const response = await fetch(`${supabaseUrl}/functions/v1/request-verification-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        console.error('[VerificarCuentaToken] ❌ Error al reenviar:', result);
        Alert.alert('Error', 'No se pudo reenviar el código. Por favor, intenta nuevamente.');
        return;
      }

      console.log('[VerificarCuentaToken] ✅ Token reenviado');
      Alert.alert(
        'Código reenviado',
        'Se ha enviado un nuevo código de verificación a tu correo electrónico.'
      );
      
      // Clear current token
      setToken(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      console.error('[VerificarCuentaToken] ❌ Error:', error);
      Alert.alert('Error', 'Ocurrió un error al reenviar el código.');
    } finally {
      setResending(false);
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
        <Text style={styles.headerTitle}>Verifica tu cuenta</Text>
        <Text style={styles.headerSubtitle}>Introduce el código recibido</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <View style={styles.successBox}>
            <IconSymbol
              ios_icon_name="checkmark.seal.fill"
              android_material_icon_name="verified"
              size={80}
              color="#10b981"
            />
            <Text style={styles.successTitle}>¡Correo enviado!</Text>
            {nombre && (
              <Text style={styles.greetingText}>Hola {nombre},</Text>
            )}
            <Text style={styles.successText}>
              Hemos enviado un código de verificación a:
            </Text>
            <View style={styles.emailBadge}>
              <IconSymbol
                ios_icon_name="envelope.fill"
                android_material_icon_name="email"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.emailText}>{email}</Text>
            </View>
          </View>

          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsTitle}>📋 Próximos pasos:</Text>
            
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Revisa tu correo</Text>
                <Text style={styles.stepText}>Busca el correo de Barlive en tu bandeja de entrada</Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Copia el código</Text>
                <Text style={styles.stepText}>Copia el código de 6 dígitos del correo</Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Introduce el código aquí abajo</Text>
                <Text style={styles.stepText}>Pega o escribe el código en los campos de abajo</Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>¡Cuenta verificada!</Text>
                <Text style={styles.stepText}>Podrás iniciar sesión y disfrutar de BarLive</Text>
              </View>
            </View>
          </View>

          <View style={styles.tokenSection}>
            <Text style={styles.tokenSectionTitle}>Introduce el código aquí:</Text>
            <Text style={styles.tokenLabel}>Código de verificación (6 dígitos)</Text>
            <View style={styles.tokenContainer}>
              {token.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[
                    styles.tokenInput,
                    digit && styles.tokenInputFilled,
                  ]}
                  value={digit}
                  onChangeText={(value) => handleTokenChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  editable={!validatingToken}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.button, validatingToken && styles.buttonDisabled]}
              onPress={handleValidateToken}
              disabled={validatingToken}
            >
              {validatingToken ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <React.Fragment>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check_circle"
                    size={20}
                    color="#fff"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.buttonText}>Verificar cuenta</Text>
                </React.Fragment>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>💡 Consejos:</Text>
            <Text style={styles.tipText}>• Revisa tu carpeta de spam si no ves el correo</Text>
            <Text style={styles.tipText}>• El código expira en 1 hora</Text>
            <Text style={styles.tipText}>• Puedes solicitar un nuevo código si es necesario</Text>
          </View>

          <TouchableOpacity
            style={[styles.resendButton, resending && styles.resendButtonDisabled]}
            onPress={handleResendToken}
            disabled={resending}
          >
            {resending ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <React.Fragment>
                <IconSymbol
                  ios_icon_name="arrow.clockwise"
                  android_material_icon_name="refresh"
                  size={20}
                  color={colors.primary}
                  style={styles.buttonIcon}
                />
                <Text style={styles.resendButtonText}>Reenviar código</Text>
              </React.Fragment>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToLoginButton}
            onPress={() => router.replace('/auth/login-v6')}
          >
            <IconSymbol
              ios_icon_name="arrow.left"
              android_material_icon_name="arrow_back"
              size={16}
              color={colors.primary}
              style={styles.backToLoginIcon}
            />
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
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  backButton: {
    marginBottom: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
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
  successBox: {
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 32,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  successTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 12,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  successText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  instructionsBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  stepText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  tokenSection: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  tokenSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  tokenLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  tokenContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  tokenInput: {
    width: 50,
    height: 60,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.text,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tokenInputFilled: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
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
  tipsBox: {
    backgroundColor: `${colors.primary}10`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 18,
  },
  resendButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  backToLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  backToLoginIcon: {
    marginRight: 8,
  },
  backToLoginText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  backToLoginTextBold: {
    fontWeight: '600',
    color: colors.primary,
  },
});
