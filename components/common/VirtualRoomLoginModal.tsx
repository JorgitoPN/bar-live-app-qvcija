
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { scaleFontSize } from '@/utils/androidScaling';
import { supabase } from '@/utils/supabase';

interface VirtualRoomLoginModalProps {
  visible: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  localName: string;
}

/**
 * ✅ VIRTUAL ROOM LOGIN MODAL v1.0 - IN-ROOM AUTHENTICATION
 * 
 * Features:
 * - Login/Register without leaving virtual room context
 * - Email + Password authentication
 * - Seamless flow that returns to same virtual room after auth
 * - No interruption to user experience
 */

export default function VirtualRoomLoginModal({
  visible,
  onClose,
  onLoginSuccess,
  localName,
}: VirtualRoomLoginModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    try {
      setLoading(true);
      console.log('[VirtualRoomLogin v1.0] 🔐 Attempting login...');

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        console.error('[VirtualRoomLogin v1.0] ❌ Login error:', error);
        Alert.alert('Error', error.message || 'No se pudo iniciar sesión');
        return;
      }

      console.log('[VirtualRoomLogin v1.0] ✅ Login successful');
      
      setEmail('');
      setPassword('');
      setNombre('');
      
      onLoginSuccess();
    } catch (error: any) {
      console.error('[VirtualRoomLogin v1.0] ❌ Login error:', error);
      Alert.alert('Error', 'Ocurrió un error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !nombre.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setLoading(true);
      console.log('[VirtualRoomLogin v1.0] 📝 Attempting registration...');

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            nombre: nombre.trim(),
          },
        },
      });

      if (authError) {
        console.error('[VirtualRoomLogin v1.0] ❌ Registration error:', authError);
        Alert.alert('Error', authError.message || 'No se pudo crear la cuenta');
        return;
      }

      if (!authData.user) {
        Alert.alert('Error', 'No se pudo crear la cuenta');
        return;
      }

      console.log('[VirtualRoomLogin v1.0] ✅ User created in auth system');

      const { error: profileError } = await supabase
        .from('usuarios')
        .insert({
          id: authData.user.id,
          email: email.trim(),
          nombre: nombre.trim(),
          rol_app: 'cliente',
        });

      if (profileError) {
        console.error('[VirtualRoomLogin v1.0] ❌ Profile creation error:', profileError);
      } else {
        console.log('[VirtualRoomLogin v1.0] ✅ User profile created');
      }

      console.log('[VirtualRoomLogin v1.0] ✅ Registration successful');
      
      setEmail('');
      setPassword('');
      setNombre('');
      
      Alert.alert(
        '¡Cuenta creada!',
        'Tu cuenta ha sido creada exitosamente. Ya puedes acceder a la Sala Virtual.',
        [{ text: 'OK', onPress: onLoginSuccess }]
      );
    } catch (error: any) {
      console.error('[VirtualRoomLogin v1.0] ❌ Registration error:', error);
      Alert.alert('Error', 'Ocurrió un error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (mode === 'login') {
      handleLogin();
    } else {
      handleRegister();
    }
  };

  const isLoginMode = mode === 'login';
  const titleText = isLoginMode ? 'Inicia Sesión' : 'Crear Cuenta';
  const subtitleText = isLoginMode 
    ? `Inicia sesión para acceder a la Sala Virtual de ${localName}`
    : `Crea tu cuenta para acceder a la Sala Virtual de ${localName}`;
  const buttonText = isLoginMode ? 'Iniciar Sesión' : 'Crear Cuenta';
  const switchText = isLoginMode ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?';
  const switchButtonText = isLoginMode ? 'Regístrate' : 'Inicia Sesión';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity 
          style={styles.overlayTouchable} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <View style={styles.container}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <LinearGradient
                colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                style={styles.iconContainer}
              >
                <IconSymbol 
                  ios_icon_name="cube.fill" 
                  android_material_icon_name="view_in_ar" 
                  size={48} 
                  color={colors.headerText} 
                />
              </LinearGradient>

              <Text style={[styles.title, { fontSize: scaleFontSize(24) }]}>{titleText}</Text>
              <Text style={[styles.subtitle, { fontSize: scaleFontSize(15) }]}>{subtitleText}</Text>
            </View>

            <View style={styles.form}>
              {!isLoginMode && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { fontSize: scaleFontSize(14) }]}>Nombre</Text>
                  <TextInput
                    style={[styles.input, { fontSize: scaleFontSize(16) }]}
                    placeholder="Tu nombre"
                    placeholderTextColor={colors.textSecondary}
                    value={nombre}
                    onChangeText={setNombre}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { fontSize: scaleFontSize(14) }]}>Email</Text>
                <TextInput
                  style={[styles.input, { fontSize: scaleFontSize(16) }]}
                  placeholder="tu@email.com"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { fontSize: scaleFontSize(14) }]}>Contraseña</Text>
                <TextInput
                  style={[styles.input, { fontSize: scaleFontSize(16) }]}
                  placeholder={isLoginMode ? 'Tu contraseña' : 'Mínimo 6 caracteres'}
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={loading}
              >
                <LinearGradient
                  colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                  style={styles.submitButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.headerText} />
                  ) : (
                    <Text style={[styles.submitButtonText, { fontSize: scaleFontSize(16) }]}>
                      {buttonText}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.switchModeContainer}>
                <Text style={[styles.switchModeText, { fontSize: scaleFontSize(14) }]}>
                  {switchText}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setMode(isLoginMode ? 'register' : 'login');
                    setEmail('');
                    setPassword('');
                    setNombre('');
                  }}
                  disabled={loading}
                >
                  <Text style={[styles.switchModeButton, { fontSize: scaleFontSize(14) }]}>
                    {switchButtonText}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={loading}>
              <Text style={[styles.cancelButtonText, { fontSize: scaleFontSize(14) }]}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  container: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  form: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontWeight: 'bold',
    color: colors.headerText,
  },
  switchModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 6,
  },
  switchModeText: {
    color: colors.textSecondary,
  },
  switchModeButton: {
    fontWeight: '600',
    color: colors.primary,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textSecondary,
  },
});
