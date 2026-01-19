
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

export default function CrearUsuarioPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;
  const userId = params.userId as string;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameValidating, setUsernameValidating] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // Real-time username validation
  useEffect(() => {
    const validateUsername = async () => {
      if (!username || username.length < 3) {
        setUsernameAvailable(null);
        return;
      }

      if (!validarUsername(username)) {
        setUsernameAvailable(false);
        return;
      }

      setUsernameValidating(true);

      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('id')
          .eq('username', username)
          .maybeSingle();

        if (error && error.code === 'PGRST116') {
          setUsernameAvailable(true);
        } else if (data) {
          setUsernameAvailable(false);
        }
      } catch (error) {
        console.error('Error validating username:', error);
        setUsernameAvailable(null);
      } finally {
        setUsernameValidating(false);
      }
    };

    const timeoutId = setTimeout(validateUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [username]);

  const validarUsername = (text: string) => {
    const regex = /^[a-zA-Z0-9._]+$/;
    return regex.test(text);
  };

  const handleUsernameChange = (text: string) => {
    const cleaned = text.toLowerCase().replace(/[^a-z0-9._]/g, '');
    setUsername(cleaned);
  };

  const calculatePasswordStrength = (pass: string): { strength: number; label: string; color: string } => {
    let strength = 0;
    
    if (pass.length >= 8) strength++;
    if (pass.length >= 12) strength++;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) strength++;
    if (/\d/.test(pass)) strength++;
    if (/[^a-zA-Z0-9]/.test(pass)) strength++;

    if (strength <= 1) return { strength: 1, label: 'Débil', color: '#EF4444' };
    if (strength <= 3) return { strength: 2, label: 'Media', color: '#F59E0B' };
    return { strength: 3, label: 'Fuerte', color: '#10B981' };
  };

  const passwordStrength = password ? calculatePasswordStrength(password) : null;

  const handleContinue = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'El nombre de usuario es obligatorio');
      return;
    }

    if (username.length < 3) {
      Alert.alert('Error', 'El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }

    if (!validarUsername(username)) {
      Alert.alert('Error', 'El nombre de usuario solo puede contener letras, números, puntos y guiones bajos');
      return;
    }

    if (usernameAvailable === false) {
      Alert.alert('Error', 'Este nombre de usuario ya está en uso. Por favor, elige otro.');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'La contraseña es obligatoria');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      // Double-check username availability
      const { data: existingUser } = await supabase
        .from('usuarios')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (existingUser) {
        Alert.alert('Error', 'Este nombre de usuario ya está en uso. Por favor, elige otro.');
        setLoading(false);
        return;
      }

      // Create auth user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        Alert.alert('Error', 'No se pudo crear la cuenta. Por favor, intenta nuevamente.');
        setLoading(false);
        return;
      }

      // Update user record with username and mark as active
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          username,
          activo: true,
          perfil_completado: false, // Will be completed in next step
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user:', updateError);
        Alert.alert('Error', 'No se pudo completar el registro. Por favor, intenta nuevamente.');
        setLoading(false);
        return;
      }

      // Navigate to profile completion (optional step)
      router.replace({
        pathname: '/auth/completar-perfil-opcional',
        params: { email, userId },
      });
    } catch (error: any) {
      console.error('Error in handleContinue:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
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
        <Text style={styles.headerTitle}>Crear usuario</Text>
        <Text style={styles.headerSubtitle}>Paso 4 de 4</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Elige tu nombre de usuario</Text>
          <Text style={styles.stepSubtitle}>
            Este será tu identificador único en BarLive
          </Text>

          <View style={styles.usernameInputContainer}>
            <Text style={styles.usernamePrefix}>@</Text>
            <TextInput
              style={styles.usernameInput}
              placeholder="tunombre"
              placeholderTextColor={colors.textSecondary}
              value={username}
              onChangeText={handleUsernameChange}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {usernameValidating && (
              <ActivityIndicator size="small" color={colors.primary} style={styles.usernameIndicator} />
            )}
            {!usernameValidating && usernameAvailable === true && username.length >= 3 && (
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={24}
                color="#10B981"
                style={styles.usernameIndicator}
              />
            )}
            {!usernameValidating && usernameAvailable === false && username.length >= 3 && (
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="cancel"
                size={24}
                color="#EF4444"
                style={styles.usernameIndicator}
              />
            )}
          </View>

          {username.length >= 3 && usernameAvailable === true && (
            <Text style={[styles.helperText, { color: '#10B981' }]}>
              ✓ Nombre de usuario disponible
            </Text>
          )}
          {username.length >= 3 && usernameAvailable === false && (
            <Text style={[styles.helperText, { color: '#EF4444' }]}>
              ✗ Este nombre de usuario ya está en uso
            </Text>
          )}
          {username.length < 3 && (
            <Text style={styles.helperText}>
              Mínimo 3 caracteres. Solo letras, números, puntos y guiones bajos
            </Text>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <IconSymbol
                  ios_icon_name={showPassword ? 'eye.slash.fill' : 'eye.fill'}
                  android_material_icon_name={showPassword ? 'visibility_off' : 'visibility'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {passwordStrength && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBar}>
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        width: `${(passwordStrength.strength / 3) * 100}%`,
                        backgroundColor: passwordStrength.color,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                  {passwordStrength.label}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirmar contraseña</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Repite tu contraseña"
                placeholderTextColor={colors.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
              >
                <IconSymbol
                  ios_icon_name={showConfirmPassword ? 'eye.slash.fill' : 'eye.fill'}
                  android_material_icon_name={showConfirmPassword ? 'visibility_off' : 'visibility'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {confirmPassword && password !== confirmPassword && (
              <Text style={[styles.helperText, { color: '#EF4444' }]}>
                ✗ Las contraseñas no coinciden
              </Text>
            )}
            {confirmPassword && password === confirmPassword && (
              <Text style={[styles.helperText, { color: '#10B981' }]}>
                ✓ Las contraseñas coinciden
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={handleContinue}
          disabled={loading || usernameValidating}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonTextPrimary}>Continuar</Text>
          )}
        </TouchableOpacity>
      </View>
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
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  usernameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    paddingLeft: 20,
    paddingRight: 16,
    marginBottom: 12,
  },
  usernamePrefix: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginRight: 4,
  },
  usernameInput: {
    flex: 1,
    fontSize: 18,
    color: colors.text,
    paddingVertical: 16,
  },
  usernameIndicator: {
    marginLeft: 8,
  },
  inputContainer: {
    marginTop: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    paddingHorizontal: 20,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 16,
  },
  eyeButton: {
    padding: 8,
  },
  strengthContainer: {
    marginTop: 12,
  },
  strengthBar: {
    height: 4,
    backgroundColor: colors.cardBorder,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  strengthFill: {
    height: '100%',
  },
  strengthLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
