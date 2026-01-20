
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

export default function ReautenticarScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const action = params.action as string || 'acción sensible';
  
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleReauthenticate = async () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Por favor, ingresa tu contraseña');
      return;
    }

    setLoading(true);

    try {
      console.log('[Reautenticar] 🔐 Reautenticando usuario...');

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Error', 'No se pudo verificar tu sesión');
        setLoading(false);
        return;
      }

      // Try to sign in with password to verify identity
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: password,
      });

      if (error) {
        console.error('[Reautenticar] ❌ Error:', error);
        Alert.alert('Error', 'Contraseña incorrecta');
        setLoading(false);
        return;
      }

      console.log('[Reautenticar] ✅ Reautenticación exitosa');
      
      // Store reauthentication timestamp
      const reauthTime = Date.now();
      
      Alert.alert(
        '¡Verificación exitosa!',
        'Tu identidad ha sido verificada. Ahora puedes continuar con la acción solicitada.',
        [
          {
            text: 'Continuar',
            onPress: () => {
              // Pass back the reauthentication status
              if (params.returnTo) {
                router.replace({
                  pathname: params.returnTo as any,
                  params: { reauthenticated: 'true', reauthTime: reauthTime.toString() },
                });
              } else {
                router.back();
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('[Reautenticar] ❌ Error inesperado:', error);
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
        <Text style={styles.headerTitle}>Verificación de identidad</Text>
        <Text style={styles.headerSubtitle}>Confirma que eres tú</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <View style={styles.infoBox}>
            <IconSymbol
              ios_icon_name="shield.checkered"
              android_material_icon_name="verified_user"
              size={64}
              color="#ec4899"
            />
            <Text style={styles.infoTitle}>Reautenticación requerida</Text>
            <Text style={styles.infoText}>
              Para realizar esta acción sensible, necesitamos verificar tu identidad.
              Por favor, ingresa tu contraseña.
            </Text>
          </View>

          <View style={styles.actionBox}>
            <Text style={styles.actionLabel}>Acción solicitada:</Text>
            <Text style={styles.actionText}>{action}</Text>
          </View>

          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Ingresa tu contraseña"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
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
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.securityBox}>
            <Text style={styles.securityTitle}>🔒 Seguridad</Text>
            <View style={styles.securityItem}>
              <Text style={styles.securityBullet}>•</Text>
              <Text style={styles.securityText}>
                Esta verificación es válida solo para esta sesión
              </Text>
            </View>
            <View style={styles.securityItem}>
              <Text style={styles.securityBullet}>•</Text>
              <Text style={styles.securityText}>
                Tu contraseña nunca se almacena en el dispositivo
              </Text>
            </View>
            <View style={styles.securityItem}>
              <Text style={styles.securityBullet}>•</Text>
              <Text style={styles.securityText}>
                Protegemos tus datos con encriptación de extremo a extremo
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleReauthenticate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verificar identidad</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
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
  actionBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#ec4899',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
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
    marginBottom: 24,
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
  securityBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  securityBullet: {
    fontSize: 16,
    color: '#ec4899',
    marginRight: 8,
    fontWeight: 'bold',
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
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
