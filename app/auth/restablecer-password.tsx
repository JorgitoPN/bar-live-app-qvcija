
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

export default function RestablecerPasswordScreen() {
  const router = useRouter();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      console.log('[RestablecerPassword] 🔍 Verificando sesión de recuperación...');
      console.log('[RestablecerPassword] Platform:', Platform.OS);
      console.log('[RestablecerPassword] URL:', Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.href : 'N/A');
      
      // First, check if we have hash parameters in the URL (web only)
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const hash = window.location.hash;
        console.log('[RestablecerPassword] 📋 URL hash:', hash);
        
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');

          console.log('[RestablecerPassword] 📋 Hash params encontrados:', {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            type,
            accessTokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : null,
          });

          // If we have a recovery token, set the session
          if (type === 'recovery' && accessToken) {
            console.log('[RestablecerPassword] 🔐 Estableciendo sesión de recuperación...');
            
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            if (sessionError) {
              console.error('[RestablecerPassword] ❌ Error estableciendo sesión:', sessionError);
              Alert.alert(
                'Error',
                'No se pudo establecer la sesión de recuperación. Por favor, solicita un nuevo enlace.',
                [
                  {
                    text: 'Solicitar nuevo enlace',
                    onPress: () => router.replace('/auth/recuperar-password'),
                  },
                ]
              );
              setHasValidSession(false);
              setCheckingSession(false);
              return;
            }

            if (data.session) {
              console.log('[RestablecerPassword] ✅ Sesión de recuperación establecida para:', data.session.user.email);
              setHasValidSession(true);
              setCheckingSession(false);
              
              // Clean the URL hash to avoid confusion
              if (window.history && window.history.replaceState) {
                window.history.replaceState(null, '', window.location.pathname);
              }
              return;
            }
          }
        }
      }
      
      // If no hash params or not web, check for existing session
      console.log('[RestablecerPassword] 🔍 Verificando sesión existente...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[RestablecerPassword] ❌ Error al verificar sesión:', error);
        Alert.alert(
          'Sesión inválida',
          'El enlace de recuperación ha expirado o es inválido. Por favor, solicita un nuevo enlace.',
          [
            {
              text: 'Solicitar nuevo enlace',
              onPress: () => router.replace('/auth/recuperar-password'),
            },
          ]
        );
        setHasValidSession(false);
        setCheckingSession(false);
        return;
      }

      if (!session) {
        console.log('[RestablecerPassword] ⚠️ No hay sesión activa');
        Alert.alert(
          'Sesión inválida',
          'El enlace de recuperación ha expirado o es inválido. Por favor, solicita un nuevo enlace.',
          [
            {
              text: 'Solicitar nuevo enlace',
              onPress: () => router.replace('/auth/recuperar-password'),
            },
          ]
        );
        setHasValidSession(false);
        setCheckingSession(false);
        return;
      }

      console.log('[RestablecerPassword] ✅ Sesión válida para:', session.user.email);
      setHasValidSession(true);
      setCheckingSession(false);
    } catch (error: any) {
      console.error('[RestablecerPassword] ❌ Error inesperado:', error);
      Alert.alert(
        'Error',
        'Ocurrió un error al verificar tu sesión. Por favor, intenta nuevamente.',
        [
          {
            text: 'Volver',
            onPress: () => router.replace('/auth/recuperar-password'),
          },
        ]
      );
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
      Alert.alert('Contraseña débil', validation.message);
      return;
    }

    setLoading(true);

    try {
      console.log('═══════════════════════════════════════════════════════');
      console.log('[RestablecerPassword] 🔄 INICIO DE ACTUALIZACIÓN DE CONTRASEÑA');
      console.log('═══════════════════════════════════════════════════════');
      console.log('[RestablecerPassword] ⏰ Timestamp:', new Date().toISOString());

      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.log('═══════════════════════════════════════════════════════');
        console.log('[RestablecerPassword] ❌ ERROR AL ACTUALIZAR CONTRASEÑA');
        console.log('═══════════════════════════════════════════════════════');
        console.error('[RestablecerPassword] Error completo:', JSON.stringify(error, null, 2));
        
        Alert.alert(
          'Error',
          `No se pudo actualizar tu contraseña.\n\nError: ${error.message}\n\nPor favor, intenta nuevamente o contacta con soporte.`
        );
        return;
      }

      console.log('═══════════════════════════════════════════════════════');
      console.log('[RestablecerPassword] ✅ CONTRASEÑA ACTUALIZADA EXITOSAMENTE');
      console.log('═══════════════════════════════════════════════════════');
      console.log('[RestablecerPassword] Usuario:', data.user?.email);

      Alert.alert(
        '¡Contraseña actualizada!',
        'Tu contraseña ha sido actualizada exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.',
        [
          {
            text: 'Ir a iniciar sesión',
            onPress: () => {
              // Sign out to force fresh login
              supabase.auth.signOut().then(() => {
                router.replace('/auth/login');
              });
            },
          },
        ]
      );
    } catch (error: any) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('[RestablecerPassword] ❌ EXCEPCIÓN NO CONTROLADA');
      console.log('═══════════════════════════════════════════════════════');
      console.error('[RestablecerPassword] Exception:', JSON.stringify(error, null, 2));
      
      Alert.alert(
        'Error inesperado',
        'Ocurrió un error inesperado. Por favor, intenta nuevamente o contacta con soporte.'
      );
    } finally {
      setLoading(false);
      console.log('[RestablecerPassword] 🏁 Proceso finalizado');
      console.log('═══════════════════════════════════════════════════════');
    }
  };

  if (checkingSession) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Restablecer contraseña</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Verificando enlace...</Text>
        </View>
      </View>
    );
  }

  if (!hasValidSession) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Restablecer contraseña</Text>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <IconSymbol
            ios_icon_name="exclamationmark.triangle.fill"
            android_material_icon_name="warning"
            size={64}
            color="#f59e0b"
          />
          <Text style={styles.errorTitle}>Enlace inválido o expirado</Text>
          <Text style={styles.errorText}>
            El enlace de recuperación ha expirado o es inválido. Por favor, solicita un nuevo enlace.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace('/auth/recuperar-password')}
          >
            <Text style={styles.buttonText}>Solicitar nuevo enlace</Text>
          </TouchableOpacity>
        </View>
      </View>
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
        <Text style={styles.headerTitle}>Restablecer contraseña</Text>
        <Text style={styles.headerSubtitle}>Crea una nueva contraseña segura</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <View style={styles.infoBox}>
            <IconSymbol
              ios_icon_name="lock.shield.fill"
              android_material_icon_name="lock"
              size={64}
              color={colors.primary}
            />
            <Text style={styles.infoTitle}>Nueva contraseña</Text>
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

          <View style={styles.requirementsBox}>
            <Text style={styles.requirementsTitle}>Requisitos de la contraseña:</Text>
            <View style={styles.requirementItem}>
              <Text style={styles.requirementBullet}>•</Text>
              <Text style={styles.requirementText}>Mínimo 8 caracteres</Text>
            </View>
            <View style={styles.requirementItem}>
              <Text style={styles.requirementBullet}>•</Text>
              <Text style={styles.requirementText}>Al menos una letra mayúscula</Text>
            </View>
            <View style={styles.requirementItem}>
              <Text style={styles.requirementBullet}>•</Text>
              <Text style={styles.requirementText}>Al menos una letra minúscula</Text>
            </View>
            <View style={styles.requirementItem}>
              <Text style={styles.requirementBullet}>•</Text>
              <Text style={styles.requirementText}>Al menos un número</Text>
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
              <Text style={styles.buttonText}>Actualizar contraseña</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.replace('/auth/login')}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
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
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
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
    marginBottom: 8,
  },
  requirementBullet: {
    fontSize: 16,
    color: colors.primary,
    marginRight: 8,
    fontWeight: 'bold',
  },
  requirementText: {
    fontSize: 13,
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
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 16,
  },
  cancelButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
