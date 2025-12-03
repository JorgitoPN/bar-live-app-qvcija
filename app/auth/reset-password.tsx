
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
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Password strength indicators
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
  });

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    // Update password strength indicators
    setPasswordStrength({
      hasMinLength: newPassword.length >= 8,
      hasUpperCase: /[A-Z]/.test(newPassword),
      hasLowerCase: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
    });
  }, [newPassword]);

  const checkSession = async () => {
    try {
      console.log('[ResetPassword] 🔍 Verificando sesión de recuperación...');
      console.log('[ResetPassword] Platform:', Platform.OS);
      console.log('[ResetPassword] Timestamp:', new Date().toISOString());
      
      // For web, check URL hash parameters
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const hash = window.location.hash;
        console.log('[ResetPassword] 📋 URL completa:', window.location.href);
        console.log('[ResetPassword] 📋 URL hash:', hash);
        
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');
          const error = hashParams.get('error');
          const errorCode = hashParams.get('error_code');
          const errorDescription = hashParams.get('error_description');

          console.log('[ResetPassword] 📋 Hash params:', {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            type,
            error,
            errorCode,
            errorDescription,
          });

          // Check for errors in URL
          if (error) {
            console.error('[ResetPassword] ❌ Error en URL:', error, errorDescription);
            
            // Set user-friendly error message
            if (errorCode === 'otp_expired') {
              setErrorMessage('El enlace de recuperación ha expirado. Los enlaces expiran después de 1 hora por seguridad.');
            } else if (error === 'access_denied') {
              setErrorMessage('El enlace de recuperación es inválido o ya fue utilizado.');
            } else {
              setErrorMessage(errorDescription || 'El enlace de recuperación no es válido.');
            }
            
            setHasValidSession(false);
            setCheckingSession(false);
            return;
          }

          // If we have a recovery token, set the session
          if (type === 'recovery' && accessToken) {
            console.log('[ResetPassword] 🔐 Estableciendo sesión de recuperación...');
            
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            if (sessionError) {
              console.error('[ResetPassword] ❌ Error estableciendo sesión:', sessionError);
              setErrorMessage('No se pudo establecer la sesión de recuperación. Por favor, solicita un nuevo enlace.');
              setHasValidSession(false);
              setCheckingSession(false);
              return;
            }

            if (data.session) {
              console.log('[ResetPassword] ✅ Sesión establecida para:', data.session.user.email);
              setUserEmail(data.session.user.email || '');
              setHasValidSession(true);
              setCheckingSession(false);
              
              // Clean the URL hash to prevent reuse
              if (window.history && window.history.replaceState) {
                window.history.replaceState(null, '', window.location.pathname);
              }
              return;
            }
          }
        }
      }
      
      // Check for existing session (for mobile or if already authenticated)
      console.log('[ResetPassword] 🔍 Verificando sesión existente...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.log('[ResetPassword] ⚠️ No hay sesión válida');
        setErrorMessage('No se encontró una sesión de recuperación válida. Por favor, solicita un nuevo enlace.');
        setHasValidSession(false);
        setCheckingSession(false);
        return;
      }

      console.log('[ResetPassword] ✅ Sesión válida para:', session.user.email);
      setUserEmail(session.user.email || '');
      setHasValidSession(true);
      setCheckingSession(false);
    } catch (error: any) {
      console.error('[ResetPassword] ❌ Error inesperado:', error);
      setErrorMessage('Ocurrió un error al verificar tu sesión. Por favor, intenta nuevamente.');
      setHasValidSession(false);
      setCheckingSession(false);
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
      Alert.alert('Contraseña débil', validation.message || 'La contraseña no cumple los requisitos');
      return;
    }

    setLoading(true);

    try {
      console.log('═══════════════════════════════════════════════════════');
      console.log('[ResetPassword] 🔄 ACTUALIZANDO CONTRASEÑA');
      console.log('═══════════════════════════════════════════════════════');
      console.log('[ResetPassword] ⏰ Timestamp:', new Date().toISOString());

      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('[ResetPassword] ❌ Error:', error);
        Alert.alert('Error', `No se pudo actualizar tu contraseña: ${error.message}`);
        return;
      }

      console.log('[ResetPassword] ✅ Contraseña actualizada para:', data.user?.email);

      setPasswordUpdated(true);
      
      Alert.alert(
        '¡Contraseña actualizada!',
        'Tu contraseña ha sido cambiada correctamente. Ahora puedes iniciar sesión con tu nueva contraseña.',
        [
          {
            text: 'Ir a iniciar sesión',
            onPress: () => {
              supabase.auth.signOut().then(() => {
                router.replace('/auth/login');
              });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('[ResetPassword] ❌ Excepción:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
      console.log('[ResetPassword] 🏁 Proceso finalizado');
      console.log('═══════════════════════════════════════════════════════');
    }
  };

  // Loading state
  if (checkingSession) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.headerSmall}
        >
          <Text style={styles.headerTitle}>Barlive</Text>
        </LinearGradient>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Verificando enlace...</Text>
          <Text style={styles.loadingSubtext}>Por favor espera un momento</Text>
        </View>
      </View>
    );
  }

  // Invalid session state
  if (!hasValidSession) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.headerSmall}
        >
          <Text style={styles.headerTitle}>Barlive</Text>
        </LinearGradient>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.centerContainer}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={80}
              color="#f59e0b"
            />
            <Text style={styles.errorTitle}>Enlace inválido o expirado</Text>
            <Text style={styles.errorText}>
              {errorMessage || 'El enlace de recuperación ha expirado o es inválido.'}
            </Text>
            
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>💡 ¿Por qué sucede esto?</Text>
              <Text style={styles.infoBoxText}>
                • Los enlaces expiran después de 1 hora por seguridad{'\n'}
                • El enlace solo puede usarse una vez{'\n'}
                • Puede que hayas abierto un enlace antiguo
              </Text>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={() => router.replace('/auth/recuperar-password')}
            >
              <IconSymbol
                ios_icon_name="arrow.clockwise"
                android_material_icon_name="refresh"
                size={20}
                color="#fff"
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>Solicitar nuevo enlace</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.replace('/auth/login')}
            >
              <Text style={styles.secondaryButtonText}>Volver a iniciar sesión</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Success state
  if (passwordUpdated) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.headerSmall}
        >
          <Text style={styles.headerTitle}>Barlive</Text>
        </LinearGradient>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.successContainer}>
            <IconSymbol
              ios_icon_name="checkmark.seal.fill"
              android_material_icon_name="verified"
              size={100}
              color="#10b981"
            />
            <Text style={styles.successTitle}>¡Contraseña actualizada!</Text>
            <Text style={styles.successText}>
              Tu contraseña ha sido cambiada correctamente.
            </Text>
            
            {userEmail && (
              <View style={styles.infoCard}>
                <IconSymbol
                  ios_icon_name="envelope.fill"
                  android_material_icon_name="email"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.infoCardText}>
                  Cuenta: {userEmail}
                </Text>
              </View>
            )}

            <View style={styles.nextStepsBox}>
              <Text style={styles.nextStepsTitle}>📱 Próximos pasos:</Text>
              <Text style={styles.nextStepText}>1. Cierra esta página</Text>
              <Text style={styles.nextStepText}>2. Abre la app Barlive</Text>
              <Text style={styles.nextStepText}>3. Inicia sesión con tu nueva contraseña</Text>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                supabase.auth.signOut().then(() => {
                  router.replace('/auth/login');
                });
              }}
            >
              <Text style={styles.buttonText}>Ir a iniciar sesión</Text>
            </TouchableOpacity>

            <View style={styles.securityNote}>
              <IconSymbol
                ios_icon_name="lock.shield.fill"
                android_material_icon_name="security"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={styles.securityNoteText}>
                Si no realizaste este cambio, contacta inmediatamente con soporte
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Main form
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Restablecer contraseña</Text>
        <Text style={styles.headerSubtitle}>Crea una nueva contraseña segura</Text>
        {userEmail && (
          <View style={styles.emailBadge}>
            <IconSymbol
              ios_icon_name="person.fill"
              android_material_icon_name="person"
              size={14}
              color="#fff"
            />
            <Text style={styles.emailBadgeText}>{userEmail}</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
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
                editable={!loading}
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
          </View>

          <View style={styles.inputGroup}>
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
                editable={!loading}
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
          </View>

          {newPassword.length > 0 && (
            <View style={styles.strengthBox}>
              <Text style={styles.strengthTitle}>Requisitos de seguridad:</Text>
              
              <View style={styles.requirementRow}>
                <IconSymbol
                  ios_icon_name={passwordStrength.hasMinLength ? 'checkmark.circle.fill' : 'circle'}
                  android_material_icon_name={passwordStrength.hasMinLength ? 'check_circle' : 'radio_button_unchecked'}
                  size={20}
                  color={passwordStrength.hasMinLength ? '#10b981' : colors.textSecondary}
                />
                <Text style={[
                  styles.requirementText,
                  passwordStrength.hasMinLength && styles.requirementTextMet
                ]}>
                  Mínimo 8 caracteres
                </Text>
              </View>

              <View style={styles.requirementRow}>
                <IconSymbol
                  ios_icon_name={passwordStrength.hasUpperCase ? 'checkmark.circle.fill' : 'circle'}
                  android_material_icon_name={passwordStrength.hasUpperCase ? 'check_circle' : 'radio_button_unchecked'}
                  size={20}
                  color={passwordStrength.hasUpperCase ? '#10b981' : colors.textSecondary}
                />
                <Text style={[
                  styles.requirementText,
                  passwordStrength.hasUpperCase && styles.requirementTextMet
                ]}>
                  Al menos una letra mayúscula
                </Text>
              </View>

              <View style={styles.requirementRow}>
                <IconSymbol
                  ios_icon_name={passwordStrength.hasLowerCase ? 'checkmark.circle.fill' : 'circle'}
                  android_material_icon_name={passwordStrength.hasLowerCase ? 'check_circle' : 'radio_button_unchecked'}
                  size={20}
                  color={passwordStrength.hasLowerCase ? '#10b981' : colors.textSecondary}
                />
                <Text style={[
                  styles.requirementText,
                  passwordStrength.hasLowerCase && styles.requirementTextMet
                ]}>
                  Al menos una letra minúscula
                </Text>
              </View>

              <View style={styles.requirementRow}>
                <IconSymbol
                  ios_icon_name={passwordStrength.hasNumber ? 'checkmark.circle.fill' : 'circle'}
                  android_material_icon_name={passwordStrength.hasNumber ? 'check_circle' : 'radio_button_unchecked'}
                  size={20}
                  color={passwordStrength.hasNumber ? '#10b981' : colors.textSecondary}
                />
                <Text style={[
                  styles.requirementText,
                  passwordStrength.hasNumber && styles.requirementTextMet
                ]}>
                  Al menos un número
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleUpdatePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="lock.rotation"
                  android_material_icon_name="lock_reset"
                  size={20}
                  color="#fff"
                  style={styles.buttonIcon}
                />
                <Text style={styles.buttonText}>Guardar nueva contraseña</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.securityInfo}>
            <IconSymbol
              ios_icon_name="shield.checkered"
              android_material_icon_name="verified_user"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.securityInfoText}>
              Tu contraseña se encripta de forma segura y nunca se almacena en texto plano.
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
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  headerSmall: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
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
    marginBottom: 16,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  emailBadgeText: {
    fontSize: 13,
    color: '#fff',
    marginLeft: 6,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  infoBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoBoxTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  infoBoxText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  formContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
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
  strengthBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  strengthTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  requirementText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 12,
  },
  requirementTextMet: {
    color: '#10b981',
    fontWeight: '500',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  securityInfoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 12,
    lineHeight: 18,
  },
  successContainer: {
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  infoCardText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginLeft: 12,
    lineHeight: 20,
  },
  nextStepsBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    width: '100%',
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  nextStepText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    width: '100%',
  },
  securityNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#78350f',
    marginLeft: 12,
    lineHeight: 18,
  },
});
