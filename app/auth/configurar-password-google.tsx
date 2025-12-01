
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

export default function ConfigurarPasswordGoogleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;
  const userId = params.userId as string;
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  const handleSetPassword = async () => {
    if (!password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Por favor, completa todos los campos');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      console.log('[ConfigurarPasswordGoogle] Configurando contraseña...');

      // Update password using Edge Function
      const { error: updateError } = await supabase.functions.invoke(
        'update-user-password',
        {
          body: {
            userId: userId,
            newPassword: password,
          },
        }
      );

      if (updateError) {
        console.error('[ConfigurarPasswordGoogle] Error actualizando contraseña:', updateError);
        Alert.alert('Error', 'No se pudo configurar la contraseña. Por favor, intenta nuevamente.');
        setLoading(false);
        return;
      }

      console.log('[ConfigurarPasswordGoogle] ✅ Contraseña configurada en Auth');

      // Update provider to 'barlive' and mark email as verified, clear verification code
      const { error: dbUpdateError } = await supabase
        .from('usuarios')
        .update({
          provider: 'barlive',
          email_verified: true,
          verification_code: null,
          verification_code_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (dbUpdateError) {
        console.error('[ConfigurarPasswordGoogle] Error actualizando usuario en DB:', dbUpdateError);
        // Don't fail here, password is already set
      } else {
        console.log('[ConfigurarPasswordGoogle] ✅ Usuario actualizado en DB');
      }

      Alert.alert(
        '¡Contraseña configurada!',
        'Tu contraseña ha sido configurada exitosamente. Ahora puedes iniciar sesión con tu correo y contraseña.\n\nTodos tus datos, roles y configuraciones se han mantenido intactos.',
        [
          {
            text: 'Iniciar sesión',
            onPress: () => router.replace('/auth/login'),
          },
        ]
      );
    } catch (error: any) {
      console.error('[ConfigurarPasswordGoogle] ❌ Error en handleSetPassword:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
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
        <Text style={styles.headerTitle}>Configurar contraseña</Text>
        <Text style={styles.headerSubtitle}>Paso 2 de 2</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <View style={styles.successBox}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check_circle"
              size={24}
              color="#10B981"
            />
            <Text style={styles.successText}>
              ¡Verificación exitosa! Ahora puedes configurar tu nueva contraseña.
            </Text>
          </View>

          <Text style={styles.emailLabel}>Correo electrónico</Text>
          <View style={styles.emailBox}>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          <Text style={styles.label}>Nueva contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <Text style={styles.label}>Confirmar contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="Repite tu contraseña"
            placeholderTextColor={colors.textSecondary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Configurar contraseña</Text>
            )}
          </TouchableOpacity>

          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              Una vez configurada tu contraseña, podrás iniciar sesión con tu correo y contraseña. 
              Todos tus datos, roles y configuraciones se mantendrán intactos.
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
  successBox: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  successText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  emailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emailBox: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  emailText: {
    fontSize: 16,
    color: colors.text,
  },
  label: {
    fontSize: 14,
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
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noteBox: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 16,
  },
  noteText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
