
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
import { getContentBottomPadding, getHeaderTitleSize, getHeaderIconSize, scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

/**
 * ✅ VALIDAR TOKEN PASSWORD SCREEN v144.0 - ANDROID SCROLL & SCALING FIX
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

export default function ValidarTokenPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;
  const isGoogleUser = params.isGoogleUser === 'true';
  
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenValidated, setTokenValidated] = useState(false);

  useEffect(() => {
    if (!email) {
      Alert.alert('Error', 'No se proporcionó un correo electrónico');
      router.back();
    }
  }, [email, router]);

  const validateToken = async () => {
    if (!token || token.length !== 6) {
      Alert.alert('Error', 'Por favor, ingresa un código de 6 dígitos');
      return;
    }

    setLoading(true);

    try {
      console.log('[ValidarTokenPassword] 🔍 Validando token:', token);

      const { data, error } = await supabase.functions.invoke('validate-password-token', {
        body: { 
          email: email.trim().toLowerCase(),
          token: token.trim()
        },
      });

      if (error) {
        console.error('[ValidarTokenPassword] ❌ Error:', error);
        throw error;
      }

      if (!data || !data.valid) {
        console.error('[ValidarTokenPassword] ❌ Token inválido o expirado');
        Alert.alert(
          'Código inválido',
          'El código ingresado es incorrecto o ha expirado. Por favor, solicita un nuevo código.',
          [
            {
              text: 'Solicitar nuevo código',
              onPress: () => router.back(),
            },
            { text: 'Reintentar', style: 'cancel' },
          ]
        );
        setLoading(false);
        return;
      }

      console.log('[ValidarTokenPassword] ✅ Token válido');
      setTokenValidated(true);
      Alert.alert(
        '✅ Código verificado',
        'Ahora puedes configurar tu nueva contraseña',
        [{ text: 'Continuar' }]
      );
    } catch (error: any) {
      console.error('[ValidarTokenPassword] ❌ Error:', error);
      Alert.alert(
        'Error',
        'No se pudo validar el código. Por favor, intenta nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Por favor, completa todos los campos');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      console.log('[ValidarTokenPassword] 🔐 Actualizando contraseña...');

      const { data, error } = await supabase.functions.invoke('update-password-with-token', {
        body: { 
          email: email.trim().toLowerCase(),
          token: token.trim(),
          newPassword: newPassword,
          isGoogleUser: isGoogleUser
        },
      });

      if (error) {
        console.error('[ValidarTokenPassword] ❌ Error:', error);
        throw error;
      }

      console.log('[ValidarTokenPassword] ✅ Contraseña actualizada exitosamente');

      if (isGoogleUser) {
        console.log('[ValidarTokenPassword] 🔄 Updating provider field for Google user...');
        
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({ 
            provider: 'email',
            updated_at: new Date().toISOString()
          })
          .eq('email', email.trim().toLowerCase());

        if (updateError) {
          console.error('[ValidarTokenPassword] ⚠️ Error updating provider:', updateError);
        } else {
          console.log('[ValidarTokenPassword] ✅ Provider updated to email');
        }
      }

      Alert.alert(
        '✅ Contraseña configurada',
        isGoogleUser 
          ? 'Tu contraseña ha sido configurada exitosamente. Ahora puedes iniciar sesión con tu email y contraseña.'
          : 'Tu contraseña ha sido actualizada exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.',
        [
          {
            text: 'Iniciar sesión',
            onPress: () => {
              router.replace('/auth/login');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('[ValidarTokenPassword] ❌ Error:', error);
      Alert.alert(
        'Error',
        'No se pudo actualizar la contraseña. Por favor, intenta nuevamente.'
      );
    } finally {
      setLoading(false);
    }
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
          <Text style={[styles.headerTitle, { fontSize: getHeaderTitleSize() }]}>
            {tokenValidated ? 'Nueva contraseña' : 'Verificar código'}
          </Text>
          <Text style={[styles.headerSubtitle, { fontSize: scaleFontSize(16) }]}>
            {tokenValidated ? 'Configura tu contraseña' : 'Ingresa el código de 6 dígitos'}
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.formContainer}>
            {!tokenValidated ? (
              <React.Fragment>
                <View style={styles.infoBox}>
                  <IconSymbol
                    ios_icon_name="envelope.fill"
                    android_material_icon_name="email"
                    size={scaleIconSize(48)}
                    color={colors.primary}
                  />
                  <Text style={[styles.infoTitle, { fontSize: scaleFontSize(24) }]}>Revisa tu correo</Text>
                  <Text style={[styles.infoText, { fontSize: scaleFontSize(14) }]}>
                    Hemos enviado un código de verificación de 6 dígitos a:
                  </Text>
                  <Text style={[styles.emailText, { fontSize: scaleFontSize(16) }]}>{email}</Text>
                </View>

                <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Código de verificación</Text>
                <TextInput
                  style={[styles.input, { fontSize: scaleFontSize(24) }]}
                  placeholder="000000"
                  placeholderTextColor={colors.textSecondary}
                  value={token.join('')}
                  onChangeText={(text) => {
                    const digits = text.split('').slice(0, 6);
                    setToken([...digits, ...Array(6 - digits.length).fill('')]);
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={validateToken}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={[styles.buttonText, { fontSize: scaleFontSize(16) }]}>Verificar código</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={() => router.back()}
                >
                  <Text style={[styles.resendButtonText, { fontSize: scaleFontSize(14) }]}>
                    ¿No recibiste el código? <Text style={styles.resendButtonTextBold}>Reenviar</Text>
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <View style={styles.successBox}>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check_circle"
                    size={scaleIconSize(64)}
                    color="#10b981"
                  />
                  <Text style={[styles.successTitle, { fontSize: scaleFontSize(24) }]}>Código verificado</Text>
                  <Text style={[styles.successText, { fontSize: scaleFontSize(14) }]}>
                    Ahora puedes configurar tu nueva contraseña
                  </Text>
                </View>

                <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Nueva contraseña</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.passwordInput, { fontSize: scaleFontSize(16) }]}
                    placeholder="Mínimo 8 caracteres"
                    placeholderTextColor={colors.textSecondary}
                    value={newPassword}
                    onChangeText={setNewPassword}
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
                      size={scaleIconSize(20)}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.label, { fontSize: scaleFontSize(14) }]}>Confirmar contraseña</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.passwordInput, { fontSize: scaleFontSize(16) }]}
                    placeholder="Repite tu contraseña"
                    placeholderTextColor={colors.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <IconSymbol
                      ios_icon_name={showConfirmPassword ? 'eye.slash.fill' : 'eye.fill'}
                      android_material_icon_name={showConfirmPassword ? 'visibility_off' : 'visibility'}
                      size={scaleIconSize(20)}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.requirementsBox}>
                  <Text style={[styles.requirementsTitle, { fontSize: scaleFontSize(14) }]}>Requisitos de la contraseña:</Text>
                  <View style={styles.requirementItem}>
                    <IconSymbol
                      ios_icon_name={newPassword.length >= 8 ? 'checkmark.circle.fill' : 'circle'}
                      android_material_icon_name={newPassword.length >= 8 ? 'check_circle' : 'radio_button_unchecked'}
                      size={scaleIconSize(16)}
                      color={newPassword.length >= 8 ? '#10b981' : colors.textSecondary}
                    />
                    <Text style={[styles.requirementText, { fontSize: scaleFontSize(14) }]}>Mínimo 8 caracteres</Text>
                  </View>
                  <View style={styles.requirementItem}>
                    <IconSymbol
                      ios_icon_name={newPassword === confirmPassword && newPassword.length > 0 ? 'checkmark.circle.fill' : 'circle'}
                      android_material_icon_name={newPassword === confirmPassword && newPassword.length > 0 ? 'check_circle' : 'radio_button_unchecked'}
                      size={scaleIconSize(16)}
                      color={newPassword === confirmPassword && newPassword.length > 0 ? '#10b981' : colors.textSecondary}
                    />
                    <Text style={[styles.requirementText, { fontSize: scaleFontSize(14) }]}>Las contraseñas coinciden</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleUpdatePassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={[styles.buttonText, { fontSize: scaleFontSize(16) }]}>Configurar contraseña</Text>
                  )}
                </TouchableOpacity>
              </React.Fragment>
            )}
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
  successBox: {
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
  },
  successTitle: {
    // fontSize set dynamically via scaleFontSize()
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  successText: {
    // fontSize set dynamically via scaleFontSize()
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  label: {
    // fontSize set dynamically via scaleFontSize()
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
    // fontSize set dynamically via scaleFontSize()
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 8,
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
    // fontSize set dynamically via scaleFontSize()
    color: colors.text,
  },
  eyeButton: {
    padding: 16,
  },
  requirementsBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  requirementsTitle: {
    // fontSize set dynamically via scaleFontSize()
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  requirementText: {
    // fontSize set dynamically via scaleFontSize()
    color: colors.textSecondary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    // fontSize set dynamically via scaleFontSize()
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
  },
  resendButtonText: {
    // fontSize set dynamically via scaleFontSize()
    color: colors.textSecondary,
  },
  resendButtonTextBold: {
    fontWeight: '600',
    color: colors.primary,
  },
});
