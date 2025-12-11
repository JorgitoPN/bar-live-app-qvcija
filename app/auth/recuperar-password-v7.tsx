
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

type FlowStep = 'email' | 'token' | 'password';

export default function RecuperarPasswordV7Screen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialEmail = params.email as string || '';
  
  const [currentStep, setCurrentStep] = useState<FlowStep>('email');
  
  const [email, setEmail] = useState(initialEmail);
  const [sendingCode, setSendingCode] = useState(false);
  
  const [token, setToken] = useState<string[]>(['', '', '', '', '', '']);
  const [validatingToken, setValidatingToken] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    console.log('[RecuperarPasswordV7] Current step changed to:', currentStep);
    if (currentStep === 'token' && inputRefs.current[0]) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
    }
  }, [currentStep]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor, ingresa tu correo electrónico');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Error', 'Por favor, ingresa un correo electrónico válido');
      return;
    }

    setSendingCode(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      console.log('═══════════════════════════════════════════════════════');
      console.log('[RecuperarPasswordV7] 🔍 SOLICITUD DE CÓDIGO');
      console.log('═══════════════════════════════════════════════════════');
      console.log('[RecuperarPasswordV7] 📧 Email:', normalizedEmail);

      const { data, error } = await supabase.functions.invoke('request-password-token', {
        body: { email: normalizedEmail },
      });

      if (error) {
        console.error('[RecuperarPasswordV7] ❌ Error:', error);
        
        if (error.message && error.message.includes('configuración')) {
          Alert.alert(
            'Error de configuración',
            'El servicio de correo electrónico no está configurado correctamente. Por favor, contacta con soporte.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        console.log('[RecuperarPasswordV7] ⚠️ Error al enviar código, pero continuando por seguridad');
      } else {
        console.log('[RecuperarPasswordV7] ✅ Código enviado');
      }
      
    } catch (error: any) {
      console.error('[RecuperarPasswordV7] ❌ Exception:', error);
      
      Alert.alert(
        'Aviso',
        'Hubo un problema al enviar el código. Si tu correo está registrado, recibirás el código en breve. Si no lo recibes, por favor contacta con soporte.',
        [{ text: 'Continuar', onPress: () => {} }]
      );
    } finally {
      setSendingCode(false);
      console.log('[RecuperarPasswordV7] 🔄 Cambiando a paso de token...');
      setCurrentStep('token');
      console.log('[RecuperarPasswordV7] ✅ Paso cambiado a token');
      console.log('[RecuperarPasswordV7] 🏁 Proceso finalizado');
      console.log('═══════════════════════════════════════════════════════');
    }
  };

  const handleTokenChange = (value: string, index: number) => {
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newToken = [...token];
    newToken[index] = value;
    setToken(newToken);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 5 && value) {
      const fullToken = [...newToken.slice(0, 5), value].join('');
      if (fullToken.length === 6) {
        setTimeout(() => handleValidateToken(fullToken), 100);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !token[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleValidateToken = async (fullToken?: string) => {
    const tokenToValidate = fullToken || token.join('');

    if (tokenToValidate.length !== 6) {
      Alert.alert('Error', 'Por favor, ingresa el código completo de 6 dígitos');
      return;
    }

    setValidatingToken(true);

    try {
      console.log('═══════════════════════════════════════════════════════');
      console.log('[RecuperarPasswordV7] 🔍 VALIDACIÓN DE TOKEN');
      console.log('═══════════════════════════════════════════════════════');

      const { data, error } = await supabase.functions.invoke('validate-password-token', {
        body: { 
          email: email.trim().toLowerCase(), 
          token: tokenToValidate 
        },
      });

      if (error || !data?.valid) {
        console.error('[RecuperarPasswordV7] ❌ Token inválido');
        Alert.alert(
          'Código inválido',
          'El código ingresado es inválido o ha expirado. Por favor, verifica e intenta nuevamente.',
          [
            {
              text: 'Solicitar nuevo código',
              onPress: () => {
                setCurrentStep('email');
                setToken(['', '', '', '', '', '']);
              },
            },
            {
              text: 'Reintentar',
              style: 'cancel',
            },
          ]
        );
        return;
      }

      console.log('[RecuperarPasswordV7] ✅ Token válido');
      console.log('[RecuperarPasswordV7] 🔄 Cambiando a paso de contraseña...');
      
      setCurrentStep('password');
      console.log('[RecuperarPasswordV7] ✅ Paso cambiado a password');
      
    } catch (error: any) {
      console.error('[RecuperarPasswordV7] ❌ Error:', error);
      Alert.alert('Error', 'Ocurrió un error al validar el código. Por favor, intenta nuevamente.');
    } finally {
      setValidatingToken(false);
      console.log('[RecuperarPasswordV7] 🏁 Validación finalizada');
      console.log('═══════════════════════════════════════════════════════');
    }
  };

  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 8) {
      return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres' };
    }
    
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'La contraseña debe contener al menos una mayúscula' };
    }
    
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'La contraseña debe contener al menos una minúscula' };
    }
    
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'La contraseña debe contener al menos un número' };
    }
    
    return { valid: true };
  };

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Por favor, ingresa tu nueva contraseña');
      return;
    }

    if (!confirmPassword.trim()) {
      Alert.alert('Error', 'Por favor, confirma tu nueva contraseña');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      Alert.alert('Contraseña débil', validation.message);
      return;
    }

    setUpdatingPassword(true);

    try {
      console.log('═══════════════════════════════════════════════════════');
      console.log('[RecuperarPasswordV7] 🔄 ACTUALIZACIÓN DE CONTRASEÑA');
      console.log('═══════════════════════════════════════════════════════');

      const { data, error } = await supabase.functions.invoke('update-password-with-token', {
        body: { 
          email: email.trim().toLowerCase(), 
          token: token.join(''),
          newPassword 
        },
      });

      if (error || !data?.success) {
        console.error('[RecuperarPasswordV7] ❌ Error:', error);
        Alert.alert('Error', 'No se pudo actualizar tu contraseña. Por favor, intenta nuevamente.');
        return;
      }

      console.log('[RecuperarPasswordV7] ✅ Contraseña actualizada');

      Alert.alert(
        '✅ Contraseña actualizada',
        'Tu contraseña ha sido actualizada correctamente. Iniciando sesión...',
        [
          {
            text: 'OK',
            onPress: async () => {
              try {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                  email: email.trim().toLowerCase(),
                  password: newPassword,
                });

                if (signInError) {
                  console.error('[RecuperarPasswordV7] ❌ Error al iniciar sesión:', signInError);
                  router.replace('/auth/login-v6');
                } else {
                  console.log('[RecuperarPasswordV7] ✅ Sesión iniciada');
                  router.replace('/(tabs)/explorar');
                }
              } catch (loginError) {
                console.error('[RecuperarPasswordV7] ❌ Exception al iniciar sesión:', loginError);
                router.replace('/auth/login-v6');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('[RecuperarPasswordV7] ❌ Error:', error);
      Alert.alert('Error inesperado', 'Ocurrió un error inesperado. Por favor, intenta nuevamente.');
    } finally {
      setUpdatingPassword(false);
      console.log('[RecuperarPasswordV7] 🏁 Proceso finalizado');
      console.log('═══════════════════════════════════════════════════════');
    }
  };

  const handleBack = () => {
    if (currentStep === 'password') {
      setCurrentStep('token');
      setNewPassword('');
      setConfirmPassword('');
    } else if (currentStep === 'token') {
      setCurrentStep('email');
      setToken(['', '', '', '', '', '']);
    } else {
      router.back();
    }
  };

  const getStepIndicator = () => {
    const steps = ['email', 'token', 'password'];
    const currentIndex = steps.indexOf(currentStep);
    
    return (
      <View style={styles.stepIndicatorContainer}>
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            <View
              style={[
                styles.stepDot,
                index <= currentIndex && styles.stepDotActive,
              ]}
            >
              {index < currentIndex ? (
                <IconSymbol
                  ios_icon_name="checkmark"
                  android_material_icon_name="check"
                  size={12}
                  color="#fff"
                />
              ) : (
                <Text style={styles.stepDotText}>{index + 1}</Text>
              )}
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  index < currentIndex && styles.stepLineActive,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  const getHeaderTitle = () => {
    switch (currentStep) {
      case 'email':
        return '¿Olvidaste tu contraseña?';
      case 'token':
        return 'Introduce el código';
      case 'password':
        return 'Nueva contraseña';
      default:
        return '';
    }
  };

  const getHeaderSubtitle = () => {
    switch (currentStep) {
      case 'email':
        return 'No te preocupes, te ayudaremos';
      case 'token':
        return 'Revisa tu correo electrónico';
      case 'password':
        return 'Crea una contraseña segura';
      default:
        return '';
    }
  };

  console.log('[RecuperarPasswordV7] Rendering with currentStep:', currentStep);

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
          onPress={handleBack}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
        
        {getStepIndicator()}
        
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        <Text style={styles.headerSubtitle}>{getHeaderSubtitle()}</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          {currentStep === 'email' && (
            <>
              <View style={styles.infoBox}>
                <IconSymbol
                  ios_icon_name="envelope.badge.shield.half.filled"
                  android_material_icon_name="mark_email_unread"
                  size={80}
                  color={colors.primary}
                />
                <Text style={styles.infoTitle}>Recupera tu cuenta</Text>
                <Text style={styles.infoText}>
                  Ingresa tu correo electrónico y te enviaremos un código de 6 dígitos para restablecer tu contraseña.
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Correo electrónico</Text>
                <View style={styles.inputWrapper}>
                  <IconSymbol
                    ios_icon_name="envelope.fill"
                    android_material_icon_name="email"
                    size={20}
                    color={colors.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="correo@ejemplo.com"
                    placeholderTextColor={colors.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!sendingCode}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, sendingCode && styles.buttonDisabled]}
                onPress={handleSendCode}
                disabled={sendingCode}
              >
                {sendingCode ? (
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
                    <Text style={styles.buttonText}>Enviar código de recuperación</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.stepsBox}>
                <Text style={styles.stepsTitle}>📋 Próximos pasos:</Text>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Revisa tu correo</Text>
                    <Text style={styles.stepDescription}>
                      Busca el correo de Barlive en tu bandeja de entrada
                    </Text>
                  </View>
                </View>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Introduce el código</Text>
                    <Text style={styles.stepDescription}>
                      Ingresa el código de 6 dígitos que recibiste
                    </Text>
                  </View>
                </View>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Crea tu nueva contraseña</Text>
                    <Text style={styles.stepDescription}>
                      Ingresa una contraseña segura y confírmala
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.securityNote}>
                <IconSymbol
                  ios_icon_name="lock.shield.fill"
                  android_material_icon_name="security"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.securityText}>
                  Por seguridad, no revelaremos si este correo está registrado en nuestro sistema.
                </Text>
              </View>
            </>
          )}

          {currentStep === 'token' && (
            <>
              <View style={styles.infoBox}>
                <IconSymbol
                  ios_icon_name="envelope.badge.fill"
                  android_material_icon_name="mark_email_read"
                  size={80}
                  color={colors.primary}
                />
                <Text style={styles.infoTitle}>¡Código enviado!</Text>
                <Text style={styles.infoText}>
                  Si existe una cuenta asociada a:
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
                <Text style={[styles.infoText, { marginTop: 16 }]}>
                  Recibirás un correo con un código de 6 dígitos.
                </Text>
              </View>

              <View style={styles.highlightBox}>
                <View style={styles.highlightHeader}>
                  <IconSymbol
                    ios_icon_name="arrow.down.circle.fill"
                    android_material_icon_name="arrow_downward"
                    size={32}
                    color={colors.primary}
                  />
                  <Text style={styles.highlightTitle}>INTRODUCE EL CÓDIGO AQUÍ</Text>
                  <IconSymbol
                    ios_icon_name="arrow.down.circle.fill"
                    android_material_icon_name="arrow_downward"
                    size={32}
                    color={colors.primary}
                  />
                </View>

                <Text style={styles.tokenLabel}>Código de 6 dígitos</Text>
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

                {validatingToken && (
                  <View style={styles.validatingContainer}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.validatingText}>Validando código...</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.button, validatingToken && styles.buttonDisabled]}
                  onPress={() => handleValidateToken()}
                  disabled={validatingToken}
                >
                  {validatingToken ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check_circle"
                        size={20}
                        color="#fff"
                        style={styles.buttonIcon}
                      />
                      <Text style={styles.buttonText}>Validar código</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.helpBox}>
                <Text style={styles.helpTitle}>💡 Consejos:</Text>
                <Text style={styles.helpText}>
                  • Revisa tu carpeta de spam si no ves el correo
                </Text>
                <Text style={styles.helpText}>
                  • El código expira en 1 hora por seguridad
                </Text>
                <Text style={styles.helpText}>
                  • Si no recibes el correo, puedes solicitar uno nuevo
                </Text>
              </View>

              <View style={styles.warningBox}>
                <IconSymbol
                  ios_icon_name="exclamationmark.triangle.fill"
                  android_material_icon_name="warning"
                  size={24}
                  color="#f59e0b"
                />
                <Text style={styles.warningText}>
                  Si no recibes el correo en unos minutos, puede haber un problema de configuración. Por favor, contacta con soporte en soporte@barliveapp.es
                </Text>
              </View>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={() => {
                  setCurrentStep('email');
                  setToken(['', '', '', '', '', '']);
                }}
              >
                <IconSymbol
                  ios_icon_name="arrow.clockwise"
                  android_material_icon_name="refresh"
                  size={20}
                  color={colors.primary}
                  style={styles.buttonIcon}
                />
                <Text style={styles.resendButtonText}>Solicitar nuevo código</Text>
              </TouchableOpacity>
            </>
          )}

          {currentStep === 'password' && (
            <>
              <View style={styles.infoBox}>
                <IconSymbol
                  ios_icon_name="lock.shield.fill"
                  android_material_icon_name="lock"
                  size={64}
                  color={colors.primary}
                />
                <Text style={styles.infoTitle}>Casi listo</Text>
                <Text style={styles.infoText}>
                  Por favor, ingresa tu nueva contraseña. Asegúrate de que sea segura y fácil de recordar.
                </Text>
              </View>

              <Text style={styles.label}>Nueva contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Ingresa tu nueva contraseña"
                  placeholderTextColor={colors.textSecondary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!updatingPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <IconSymbol
                    ios_icon_name={showPassword ? 'eye.slash.fill' : 'eye.fill'}
                    android_material_icon_name={showPassword ? 'visibility_off' : 'visibility'}
                    size={24}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Confirmar contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirma tu nueva contraseña"
                  placeholderTextColor={colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!updatingPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <IconSymbol
                    ios_icon_name={showConfirmPassword ? 'eye.slash.fill' : 'eye.fill'}
                    android_material_icon_name={showConfirmPassword ? 'visibility_off' : 'visibility'}
                    size={24}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.requirementsBox}>
                <Text style={styles.requirementsTitle}>Requisitos de la contraseña:</Text>
                <View style={styles.requirementItem}>
                  <IconSymbol
                    ios_icon_name={newPassword.length >= 8 ? 'checkmark.circle.fill' : 'circle'}
                    android_material_icon_name={newPassword.length >= 8 ? 'check_circle' : 'radio_button_unchecked'}
                    size={20}
                    color={newPassword.length >= 8 ? '#10b981' : colors.textSecondary}
                  />
                  <Text style={[styles.requirementText, newPassword.length >= 8 && styles.requirementTextValid]}>
                    Mínimo 8 caracteres
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <IconSymbol
                    ios_icon_name={/[A-Z]/.test(newPassword) ? 'checkmark.circle.fill' : 'circle'}
                    android_material_icon_name={/[A-Z]/.test(newPassword) ? 'check_circle' : 'radio_button_unchecked'}
                    size={20}
                    color={/[A-Z]/.test(newPassword) ? '#10b981' : colors.textSecondary}
                  />
                  <Text style={[styles.requirementText, /[A-Z]/.test(newPassword) && styles.requirementTextValid]}>
                    Al menos una letra mayúscula
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <IconSymbol
                    ios_icon_name={/[a-z]/.test(newPassword) ? 'checkmark.circle.fill' : 'circle'}
                    android_material_icon_name={/[a-z]/.test(newPassword) ? 'check_circle' : 'radio_button_unchecked'}
                    size={20}
                    color={/[a-z]/.test(newPassword) ? '#10b981' : colors.textSecondary}
                  />
                  <Text style={[styles.requirementText, /[a-z]/.test(newPassword) && styles.requirementTextValid]}>
                    Al menos una letra minúscula
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <IconSymbol
                    ios_icon_name={/[0-9]/.test(newPassword) ? 'checkmark.circle.fill' : 'circle'}
                    android_material_icon_name={/[0-9]/.test(newPassword) ? 'check_circle' : 'radio_button_unchecked'}
                    size={20}
                    color={/[0-9]/.test(newPassword) ? '#10b981' : colors.textSecondary}
                  />
                  <Text style={[styles.requirementText, /[0-9]/.test(newPassword) && styles.requirementTextValid]}>
                    Al menos un número
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, updatingPassword && styles.buttonDisabled]}
                onPress={handleUpdatePassword}
                disabled={updatingPassword}
              >
                {updatingPassword ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check_circle"
                      size={20}
                      color="#fff"
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.buttonText}>Actualizar contraseña</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

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
    paddingTop: Platform.OS === 'android' ? 60 : 80,
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
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: '#fff',
  },
  stepDotText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#fff',
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
  infoBox: {
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 32,
    marginBottom: 32,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  infoTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  highlightBox: {
    backgroundColor: `${colors.primary}15`,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 3,
    borderColor: colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  highlightTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginHorizontal: 12,
    textAlign: 'center',
  },
  tokenLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  stepsBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  stepsTitle: {
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  tokenContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  tokenInput: {
    width: 48,
    height: 64,
    backgroundColor: colors.background,
    borderWidth: 3,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.text,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  tokenInputFilled: {
    borderColor: colors.primary,
    backgroundColor: '#fff',
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
  validatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  validatingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 12,
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
    fontSize: 16,
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  requirementText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 12,
  },
  requirementTextValid: {
    color: '#10b981',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
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
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 12,
    lineHeight: 18,
  },
  helpBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  helpText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#78350f',
    marginLeft: 12,
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
