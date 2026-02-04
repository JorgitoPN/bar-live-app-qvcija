
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
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

/**
 * ✅ NUEVA PASSWORD TOKEN SCREEN v146.0 - SCROLLABLE HEADER FIX
 * 
 * CRITICAL FIXES v146.0:
 * - ✅ Header now scrolls with content (moved inside ScrollView)
 * - ✅ Fixed "Invalid JWT" error by using supabase.functions.invoke
 * - ✅ Removed manual fetch with access_token
 * - ✅ Edge Functions now work without user session
 */

export default function NuevaPasswordTokenScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string || '';
  const token = params.token as string || '';
  const isGoogleUser = params.isGoogleUser === 'true';
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      console.log('[NuevaPasswordToken] 🔄 ACTUALIZACIÓN DE CONTRASEÑA');
      console.log('═══════════════════════════════════════════════════════');
      console.log('[NuevaPasswordToken] 📧 Email:', email);
      console.log('[NuevaPasswordToken] 🔐 Google User:', isGoogleUser);

      const { data, error } = await supabase.functions.invoke('update-password-with-token', {
        body: { 
          email: email.trim().toLowerCase(), 
          token: token.trim(),
          newPassword,
          isGoogleUser
        },
      });

      if (error) {
        console.error('[NuevaPasswordToken] ❌ Error:', error);
        throw new Error(error.message || 'Error al actualizar contraseña');
      }

      if (!data?.success) {
        const errorMessage = data?.error || 'No se pudo actualizar tu contraseña. Por favor, intenta nuevamente.';
        console.error('[NuevaPasswordToken] ❌ Error:', errorMessage);
        Alert.alert('Error', errorMessage);
        setLoading(false);
        return;
      }

      console.log('[NuevaPasswordToken] ✅ Contraseña actualizada exitosamente');

      if (isGoogleUser) {
        console.log('[NuevaPasswordToken] 🔄 Actualizando provider a "barlive"...');
        
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({ provider: 'barlive' })
          .eq('email', email.trim().toLowerCase());

        if (updateError) {
          console.error('[NuevaPasswordToken] ⚠️ Error actualizando provider:', updateError);
        } else {
          console.log('[NuevaPasswordToken] ✅ Provider actualizado a "barlive"');
        }
      }

      const successMessage = isGoogleUser
        ? '¡Contraseña configurada! Tu contraseña ha sido configurada exitosamente. Ahora puedes iniciar sesión con tu email y contraseña, además de seguir usando Google.'
        : '¡Contraseña actualizada! Tu contraseña ha sido actualizada exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.';

      Alert.alert(
        isGoogleUser ? '✅ ¡Configuración completa!' : '✅ ¡Contraseña actualizada!',
        successMessage,
        [
          {
            text: 'Ir a iniciar sesión',
            onPress: () => {
              router.replace('/auth/login');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('[NuevaPasswordToken] ❌ Unexpected Error:', error);
      console.error('[NuevaPasswordToken] ❌ Error name:', error?.name);
      console.error('[NuevaPasswordToken] ❌ Error message:', error?.message);
      console.error('[NuevaPasswordToken] ❌ Error stack:', error?.stack);
      
      const errorMessage = error?.message || 'Ocurrió un error inesperado';
      Alert.alert(
        'Error inesperado',
        `${errorMessage}. Por favor, intenta nuevamente o contacta con soporte.`
      );
    } finally {
      setLoading(false);
      console.log('[NuevaPasswordToken] 🏁 Proceso finalizado');
      console.log('═══════════════════════════════════════════════════════');
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
            <Text style={styles.headerTitle}>
              {isGoogleUser ? 'Configurar contraseña' : 'Nueva contraseña'}
            </Text>
            <Text style={styles.headerSubtitle}>Crea una contraseña segura</Text>
          </LinearGradient>

          <View style={styles.formContainer}>
            <View style={styles.infoBox}>
              <IconSymbol
                ios_icon_name="lock.shield.fill"
                android_material_icon_name="lock"
                size={64}
                color={colors.primary}
              />
              <Text style={styles.infoTitle}>Casi listo</Text>
              <Text style={styles.infoText}>
                {isGoogleUser
                  ? 'Por favor, configura tu contraseña. Podrás usar tanto Google como email/contraseña para iniciar sesión.'
                  : 'Por favor, ingresa tu nueva contraseña. Asegúrate de que sea segura y fácil de recordar.'}
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

            {isGoogleUser && (
              <View style={styles.googleInfoBox}>
                <IconSymbol
                  ios_icon_name="info.circle.fill"
                  android_material_icon_name="info"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.googleInfoText}>
                  Una vez configurada tu contraseña, podrás iniciar sesión usando Google o tu email y contraseña.
                </Text>
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
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check_circle"
                    size={20}
                    color="#fff"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.buttonText}>
                    {isGoogleUser ? 'Configurar contraseña' : 'Actualizar contraseña'}
                  </Text>
                </>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
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
  formContainer: {
    flex: 1,
    padding: 24,
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
    marginBottom: 16,
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
  googleInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  googleInfoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    marginLeft: 12,
    lineHeight: 18,
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
  cancelButton: {
    alignItems: 'center',
    padding: 16,
  },
  cancelButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
