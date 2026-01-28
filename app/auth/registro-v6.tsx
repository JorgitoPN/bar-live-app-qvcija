
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
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { generateUsername } from '@/utils/usernameGenerator';
import { getContentBottomPadding, getHeaderTitleSize, getHeaderIconSize } from '@/utils/androidScaling';

export default function RegistroV6Screen() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  const [nombreError, setNombreError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  const [nombreFocused, setNombreFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  
  const nombreShakeAnim = useRef(new Animated.Value(0)).current;
  const emailShakeAnim = useRef(new Animated.Value(0)).current;
  const passwordShakeAnim = useRef(new Animated.Value(0)).current;
  const confirmPasswordShakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 8) {
      return { valid: false, message: 'Mínimo 8 caracteres' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Debe contener una mayúscula' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Debe contener una minúscula' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Debe contener un número' };
    }
    return { valid: true };
  };

  const shakeAnimation = (animValue: Animated.Value) => {
    Animated.sequence([
      Animated.timing(animValue, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(animValue, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(animValue, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(animValue, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleNombreChange = (text: string) => {
    setNombre(text);
    if (nombreError) setNombreError('');
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailError) setEmailError('');
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordError) setPasswordError('');
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (confirmPasswordError) setConfirmPasswordError('');
  };

  const handleEmailBlur = () => {
    setEmailFocused(false);
    if (email && !validateEmail(email)) {
      setEmailError('Correo electrónico inválido');
      shakeAnimation(emailShakeAnim);
    }
  };

  const handlePasswordBlur = () => {
    setPasswordFocused(false);
    if (password) {
      const validation = validatePassword(password);
      if (!validation.valid) {
        setPasswordError(validation.message || '');
        shakeAnimation(passwordShakeAnim);
      }
    }
  };

  const handleConfirmPasswordBlur = () => {
    setConfirmPasswordFocused(false);
    if (confirmPassword && password !== confirmPassword) {
      setConfirmPasswordError('Las contraseñas no coinciden');
      shakeAnimation(confirmPasswordShakeAnim);
    }
  };

  const handleRegister = async () => {
    let hasError = false;

    if (!nombre.trim()) {
      setNombreError('El nombre es requerido');
      shakeAnimation(nombreShakeAnim);
      hasError = true;
    }

    if (!email.trim()) {
      setEmailError('El correo es requerido');
      shakeAnimation(emailShakeAnim);
      hasError = true;
    } else if (!validateEmail(email.trim())) {
      setEmailError('Correo electrónico inválido');
      shakeAnimation(emailShakeAnim);
      hasError = true;
    }

    if (!password.trim()) {
      setPasswordError('La contraseña es requerida');
      shakeAnimation(passwordShakeAnim);
      hasError = true;
    } else {
      const validation = validatePassword(password);
      if (!validation.valid) {
        setPasswordError(validation.message || '');
        shakeAnimation(passwordShakeAnim);
        hasError = true;
      }
    }

    if (!confirmPassword.trim()) {
      setConfirmPasswordError('Confirma tu contraseña');
      shakeAnimation(confirmPasswordShakeAnim);
      hasError = true;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Las contraseñas no coinciden');
      shakeAnimation(confirmPasswordShakeAnim);
      hasError = true;
    }

    if (!acceptedTerms) {
      Alert.alert('Términos y condiciones', 'Debes aceptar los términos y condiciones para continuar');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      console.log('[Registro v6.5 - Token Only] 📝 Registrando nuevo usuario:', normalizedEmail);

      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('usuarios')
        .select('id, email_verified')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('[Registro v6.5 - Token Only] Error checking email:', checkError);
        Alert.alert('Error', 'No se pudo verificar el correo. Por favor, intenta nuevamente.');
        setLoading(false);
        return;
      }

      if (existingUser) {
        if (existingUser.email_verified) {
          Alert.alert(
            'Correo ya registrado',
            'Este correo ya está registrado y verificado. Por favor, inicia sesión.',
            [
              {
                text: 'Iniciar sesión',
                onPress: () => router.replace('/auth/login-v6'),
              },
              { text: 'Cancelar', style: 'cancel' },
            ]
          );
        } else {
          Alert.alert(
            'Verificación pendiente',
            'Este correo ya está registrado pero no verificado. ¿Deseas reenviar el código de verificación?',
            [
              {
                text: 'Reenviar código',
                onPress: async () => {
                  try {
                    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://embntaqwlwmgazvrglaf.supabase.co';
                    
                    const response = await fetch(`${supabaseUrl}/functions/v1/request-verification-token`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ email: normalizedEmail }),
                    });

                    const result = await response.json();

                    if (!response.ok || result.error) {
                      Alert.alert('Error', 'No se pudo reenviar el código de verificación');
                    } else {
                      Alert.alert(
                        'Código enviado',
                        'Se ha reenviado el código de verificación. Por favor, revisa tu bandeja de entrada.'
                      );
                      router.push({
                        pathname: '/auth/verificar-cuenta-token',
                        params: { email: normalizedEmail },
                      });
                    }
                  } catch (err) {
                    console.error('[Registro v6.5 - Token Only] Error resending token:', err);
                    Alert.alert('Error', 'Ocurrió un error al reenviar el código');
                  }
                },
              },
              { text: 'Cancelar', style: 'cancel' },
            ]
          );
        }
        setLoading(false);
        return;
      }

      // Generate unique username
      console.log('[Registro v6.5 - Token Only] 🔤 Generando nombre de usuario...');
      const generatedUsername = await generateUsername(nombre.trim());
      console.log('[Registro v6.5 - Token Only] ✅ Nombre de usuario generado:', generatedUsername);

      // Create auth user WITHOUT triggering email confirmation
      // We use emailRedirectTo with a dummy value to prevent Supabase from sending the default email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: password,
        options: {
          data: {
            nombre: nombre.trim(),
            username: generatedUsername,
            provider: 'barlive',
            email_verified: false,
          },
          // IMPORTANT: Don't include emailRedirectTo to prevent default Supabase email
          // The email confirmation will be handled by our custom token system
        },
      });

      if (authError) {
        console.error('[Registro v6.5 - Token Only] ❌ Error creating auth user:', authError);
        
        if (authError.message.includes('already registered')) {
          Alert.alert('Error', 'Este correo ya está registrado. Por favor, inicia sesión.');
        } else {
          Alert.alert('Error', authError.message || 'No se pudo crear la cuenta');
        }
        
        setLoading(false);
        return;
      }

      if (!authData.user) {
        Alert.alert('Error', 'No se pudo crear la cuenta. Por favor, intenta nuevamente.');
        setLoading(false);
        return;
      }

      console.log('[Registro v6.5 - Token Only] ✅ Usuario creado exitosamente:', authData.user.id);

      // Update user profile with username
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ username: generatedUsername })
        .eq('id', authData.user.id);

      if (updateError) {
        console.error('[Registro v6.5 - Token Only] ⚠️ Error updating username:', updateError);
        // Don't fail registration if username update fails
      } else {
        console.log('[Registro v6.5 - Token Only] ✅ Username actualizado en la base de datos');
      }

      // Send verification token (our custom email)
      console.log('[Registro v6.5 - Token Only] 📧 Enviando token de verificación...');
      
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://embntaqwlwmgazvrglaf.supabase.co';
      
      const tokenResponse = await fetch(`${supabaseUrl}/functions/v1/request-verification-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const tokenResult = await tokenResponse.json();

      if (!tokenResponse.ok || tokenResult.error) {
        console.error('[Registro v6.5 - Token Only] ⚠️ Error enviando token:', tokenResult);
        // Don't fail registration if email fails - user can request resend
        Alert.alert(
          'Cuenta creada',
          'Tu cuenta ha sido creada, pero hubo un problema al enviar el código de verificación. Por favor, solicita un nuevo código en la siguiente pantalla.',
          [
            {
              text: 'Continuar',
              onPress: () => {
                router.push({
                  pathname: '/auth/verificar-cuenta-token',
                  params: { email: normalizedEmail, nombre: nombre.trim() },
                });
              },
            },
          ]
        );
      } else {
        console.log('[Registro v6.5 - Token Only] ✅ Token enviado exitosamente');
        
        // Show success message and navigate to token verification screen
        Alert.alert(
          '¡Cuenta creada!',
          `Tu cuenta ha sido creada exitosamente con el nombre de usuario @${generatedUsername}.\n\nHemos enviado un código de verificación de 6 dígitos a tu correo electrónico. Por favor, revisa tu bandeja de entrada y la carpeta de spam.`,
          [
            {
              text: 'Verificar ahora',
              onPress: () => {
                router.push({
                  pathname: '/auth/verificar-cuenta-token',
                  params: { email: normalizedEmail, nombre: nombre.trim() },
                });
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('[Registro v6.5 - Token Only] ❌ Error in handleRegister:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (): { strength: number; color: string; text: string } => {
    if (!password) return { strength: 0, color: '#e5e7eb', text: '' };
    
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    
    if (strength <= 25) return { strength, color: '#ef4444', text: 'Débil' };
    if (strength <= 50) return { strength, color: '#f59e0b', text: 'Media' };
    if (strength <= 75) return { strength, color: '#10b981', text: 'Buena' };
    return { strength, color: '#059669', text: 'Excelente' };
  };

  const passwordStrength = getPasswordStrength();

  /**
   * ✅ REGISTRO SCREEN v284.0 - ANDROID FULL PAGE SCROLL + SCALING
   * 
   * CRITICAL FIXES v284.0 (ANDROID ONLY):
   * - ✅ FULL PAGE SCROLLING: Header now scrolls with content (not fixed)
   * - ✅ ANDROID SCALING: All text sizes scaled using scaleFontSize()
   * - ✅ Proper keyboard handling with KeyboardAvoidingView
   * - ✅ Bottom padding for Android navigation buttons
   * - ✅ iOS design remains unchanged
   */

  const headerIconSize = getHeaderIconSize(); // 28 on iOS, 20 on Android
  const headerTitleSize = getHeaderTitleSize(); // 32 on iOS, 20 on Android
  const headerSubtitleSize = scaleFontSize(16); // Scaled for Android
  const labelSize = scaleFontSize(14); // Scaled for Android
  const inputSize = scaleFontSize(16); // Scaled for Android
  const helperTextSize = scaleFontSize(12); // Scaled for Android
  const errorTextSize = scaleFontSize(12); // Scaled for Android
  const buttonTextSize = scaleFontSize(16); // Scaled for Android
  const termsTextSize = scaleFontSize(13); // Scaled for Android
  const dividerTextSize = scaleFontSize(14); // Scaled for Android
  const loginTextSize = scaleFontSize(14); // Scaled for Android

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: getContentBottomPadding(40) }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
      >
        {/* ✅ HEADER NOW SCROLLS WITH CONTENT */}
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
          
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <IconSymbol
                  ios_icon_name="person.badge.plus.fill"
                  android_material_icon_name="person_add"
                  size={48}
                  color="#fff"
                />
              </View>
            </View>
            <Text style={[styles.headerTitle, { fontSize: headerTitleSize }]}>Crear cuenta</Text>
            <Text style={[styles.headerSubtitle, { fontSize: headerSubtitleSize }]}>Únete a la comunidad BarLive</Text>
          </Animated.View>
        </LinearGradient>

        {/* ✅ FORM CONTENT WITH ANDROID SCALING */}
        <View style={styles.formWrapper}>
          <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { fontSize: labelSize }]}>Nombre completo</Text>
            <Animated.View
              style={[
                styles.inputContainer,
                nombreFocused && styles.inputContainerFocused,
                nombreError && styles.inputContainerError,
                { transform: [{ translateX: nombreShakeAnim }] },
              ]}
            >
              <IconSymbol
                ios_icon_name="person.fill"
                android_material_icon_name="person"
                size={20}
                color={nombreError ? '#ef4444' : nombreFocused ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={[styles.input, { fontSize: inputSize }]}
                placeholder="Tu nombre"
                placeholderTextColor={colors.textSecondary}
                value={nombre}
                onChangeText={handleNombreChange}
                onFocus={() => setNombreFocused(true)}
                onBlur={() => setNombreFocused(false)}
                autoCapitalize="words"
                editable={!loading}
              />
              {nombre && !nombreError ? (
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check_circle"
                  size={20}
                  color="#10b981"
                />
              ) : null}
            </Animated.View>
            {nombreError ? (
              <View style={styles.errorContainer}>
                <IconSymbol
                  ios_icon_name="exclamationmark.circle.fill"
                  android_material_icon_name="error"
                  size={14}
                  color="#ef4444"
                />
                <Text style={[styles.errorText, { fontSize: errorTextSize }]}>{nombreError}</Text>
              </View>
            ) : null}
            <Text style={[styles.helperText, { fontSize: helperTextSize }]}>
              Se te asignará un nombre de usuario automáticamente que podrás editar después
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { fontSize: labelSize }]}>Correo electrónico</Text>
            <Animated.View
              style={[
                styles.inputContainer,
                emailFocused && styles.inputContainerFocused,
                emailError && styles.inputContainerError,
                { transform: [{ translateX: emailShakeAnim }] },
              ]}
            >
              <IconSymbol
                ios_icon_name="envelope.fill"
                android_material_icon_name="email"
                size={20}
                color={emailError ? '#ef4444' : emailFocused ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={[styles.input, { fontSize: inputSize }]}
                placeholder="correo@ejemplo.com"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={handleEmailChange}
                onFocus={() => setEmailFocused(true)}
                onBlur={handleEmailBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              {email && !emailError && validateEmail(email) ? (
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check_circle"
                  size={20}
                  color="#10b981"
                />
              ) : null}
            </Animated.View>
            {emailError ? (
              <View style={styles.errorContainer}>
                <IconSymbol
                  ios_icon_name="exclamationmark.circle.fill"
                  android_material_icon_name="error"
                  size={14}
                  color="#ef4444"
                />
                <Text style={[styles.errorText, { fontSize: errorTextSize }]}>{emailError}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { fontSize: labelSize }]}>Contraseña</Text>
            <Animated.View
              style={[
                styles.inputContainer,
                passwordFocused && styles.inputContainerFocused,
                passwordError && styles.inputContainerError,
                { transform: [{ translateX: passwordShakeAnim }] },
              ]}
            >
              <IconSymbol
                ios_icon_name="lock.fill"
                android_material_icon_name="lock"
                size={20}
                color={passwordError ? '#ef4444' : passwordFocused ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={[styles.input, { fontSize: inputSize }]}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={handlePasswordChange}
                onFocus={() => setPasswordFocused(true)}
                onBlur={handlePasswordBlur}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <IconSymbol
                  ios_icon_name={showPassword ? 'eye.slash.fill' : 'eye.fill'}
                  android_material_icon_name={showPassword ? 'visibility_off' : 'visibility'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </Animated.View>
            {passwordError ? (
              <View style={styles.errorContainer}>
                <IconSymbol
                  ios_icon_name="exclamationmark.circle.fill"
                  android_material_icon_name="error"
                  size={14}
                  color="#ef4444"
                />
                <Text style={[styles.errorText, { fontSize: errorTextSize }]}>{passwordError}</Text>
              </View>
            ) : password ? (
              <View style={styles.passwordStrengthContainer}>
                <View style={styles.passwordStrengthBar}>
                  <View
                    style={[
                      styles.passwordStrengthFill,
                      {
                        width: `${passwordStrength.strength}%`,
                        backgroundColor: passwordStrength.color,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.passwordStrengthText, { color: passwordStrength.color, fontSize: helperTextSize }]}>
                  {passwordStrength.text}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { fontSize: labelSize }]}>Confirmar contraseña</Text>
            <Animated.View
              style={[
                styles.inputContainer,
                confirmPasswordFocused && styles.inputContainerFocused,
                confirmPasswordError && styles.inputContainerError,
                { transform: [{ translateX: confirmPasswordShakeAnim }] },
              ]}
            >
              <IconSymbol
                ios_icon_name="lock.fill"
                android_material_icon_name="lock"
                size={20}
                color={confirmPasswordError ? '#ef4444' : confirmPasswordFocused ? colors.primary : colors.textSecondary}
              />
              <TextInput
                style={[styles.input, { fontSize: inputSize }]}
                placeholder="Repite tu contraseña"
                placeholderTextColor={colors.textSecondary}
                value={confirmPassword}
                onChangeText={handleConfirmPasswordChange}
                onFocus={() => setConfirmPasswordFocused(true)}
                onBlur={handleConfirmPasswordBlur}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <IconSymbol
                  ios_icon_name={showConfirmPassword ? 'eye.slash.fill' : 'eye.fill'}
                  android_material_icon_name={showConfirmPassword ? 'visibility_off' : 'visibility'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </Animated.View>
            {confirmPasswordError ? (
              <View style={styles.errorContainer}>
                <IconSymbol
                  ios_icon_name="exclamationmark.circle.fill"
                  android_material_icon_name="error"
                  size={14}
                  color="#ef4444"
                />
                <Text style={[styles.errorText, { fontSize: errorTextSize }]}>{confirmPasswordError}</Text>
              </View>
            ) : confirmPassword && password === confirmPassword ? (
              <View style={styles.successContainer}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check_circle"
                  size={14}
                  color="#10b981"
                />
                <Text style={[styles.successText, { fontSize: helperTextSize }]}>Las contraseñas coinciden</Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.termsContainer}
            onPress={() => setAcceptedTerms(!acceptedTerms)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
              {acceptedTerms && (
                <IconSymbol
                  ios_icon_name="checkmark"
                  android_material_icon_name="check"
                  size={16}
                  color="#fff"
                />
              )}
            </View>
            <Text style={[styles.termsText, { fontSize: termsTextSize }]}>
              Acepto los{' '}
              <Text style={styles.termsLink}>Términos de Servicio</Text>
              {' '}y{' '}
              <Text style={styles.termsLink}>Política de Privacidad</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              {loading ? (
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
                  <Text style={[styles.buttonText, { fontSize: buttonTextSize }]}>Crear cuenta</Text>
                </React.Fragment>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={[styles.dividerText, { fontSize: dividerTextSize }]}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, { fontSize: loginTextSize }]}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity
              onPress={() => router.replace('/auth/login-v6')}
              disabled={loading}
            >
              <Text style={[styles.loginLink, { fontSize: loginTextSize }]}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>
          </Animated.View>
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
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    // paddingBottom set dynamically via getContentBottomPadding()
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 48 : 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  backButton: {
    marginBottom: 32,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    // fontSize set dynamically via getHeaderTitleSize()
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    // fontSize set dynamically via scaleFontSize(16)
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  formWrapper: {
    flex: 1,
    padding: 24,
  },
  formContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
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
  inputContainerFocused: {
    borderColor: colors.primary,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  inputContainerError: {
    borderColor: '#ef4444',
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginLeft: 4,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 4,
  },
  successText: {
    fontSize: 12,
    color: '#10b981',
    marginLeft: 4,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    marginLeft: 4,
  },
  passwordStrengthContainer: {
    marginTop: 8,
  },
  passwordStrengthBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  termsLink: {
    fontWeight: '600',
    color: colors.primary,
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
