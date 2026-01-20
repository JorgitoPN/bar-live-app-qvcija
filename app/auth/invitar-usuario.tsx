
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
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

export default function InvitarUsuarioScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInviteUser = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor, ingresa el correo electrónico');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Error', 'Por favor, ingresa un correo electrónico válido');
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      console.log('[InvitarUsuario] 📧 Enviando invitación a:', normalizedEmail);

      // Note: inviteUserByEmail requires admin privileges
      // For regular users, we can use signUp with metadata
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: Math.random().toString(36).slice(-12) + 'A1!', // Temporary password
        options: {
          data: {
            invited: true,
            invited_at: new Date().toISOString(),
          },
          emailRedirectTo: 'https://barliveapp.es/auth/completar-perfil',
        },
      });

      if (error) {
        console.error('[InvitarUsuario] ❌ Error:', error);
        
        if (error.message.includes('already registered')) {
          Alert.alert(
            'Usuario existente',
            'Este usuario ya tiene una cuenta en BarLive.'
          );
        } else {
          Alert.alert('Error', error.message || 'No se pudo enviar la invitación');
        }
        setLoading(false);
        return;
      }

      console.log('[InvitarUsuario] ✅ Invitación enviada exitosamente');
      setInviteSent(true);
      Alert.alert(
        '¡Invitación enviada!',
        `Se ha enviado una invitación a ${normalizedEmail}. El usuario recibirá un correo con instrucciones para crear su cuenta.`
      );
    } catch (error: any) {
      console.error('[InvitarUsuario] ❌ Error inesperado:', error);
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
        <Text style={styles.headerTitle}>Invitar usuario</Text>
        <Text style={styles.headerSubtitle}>Invita a alguien a unirse a BarLive</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          {!inviteSent ? (
            <>
              <View style={styles.infoBox}>
                <IconSymbol
                  ios_icon_name="person.badge.plus.fill"
                  android_material_icon_name="person_add"
                  size={64}
                  color="#3b82f6"
                />
                <Text style={styles.infoTitle}>Invitar nuevo usuario</Text>
                <Text style={styles.infoText}>
                  Envía una invitación por correo electrónico a alguien que aún no
                  tiene cuenta en BarLive. Recibirán un enlace para crear su cuenta.
                </Text>
              </View>

              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput
                style={styles.input}
                placeholder="correo@ejemplo.com"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleInviteUser}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Enviar invitación</Text>
                )}
              </TouchableOpacity>

              <View style={styles.benefitsBox}>
                <Text style={styles.benefitsTitle}>✨ Qué incluye la invitación</Text>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitBullet}>•</Text>
                  <Text style={styles.benefitText}>
                    Enlace directo para crear cuenta
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitBullet}>•</Text>
                  <Text style={styles.benefitText}>
                    Proceso de registro simplificado
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitBullet}>•</Text>
                  <Text style={styles.benefitText}>
                    Acceso inmediato a todas las funciones
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitBullet}>•</Text>
                  <Text style={styles.benefitText}>
                    Bienvenida personalizada a BarLive
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.successBox}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check_circle"
                  size={64}
                  color="#10b981"
                />
                <Text style={styles.successTitle}>¡Invitación enviada!</Text>
                <Text style={styles.successText}>
                  Se ha enviado una invitación a:
                </Text>
                <Text style={styles.emailText}>{email}</Text>
              </View>

              <View style={styles.instructionsBox}>
                <Text style={styles.instructionsTitle}>📋 Próximos pasos:</Text>
                <Text style={styles.instructionItem}>
                  1. El usuario recibirá un correo de invitación
                </Text>
                <Text style={styles.instructionItem}>
                  2. Hará clic en el enlace de invitación
                </Text>
                <Text style={styles.instructionItem}>
                  3. Completará su perfil y creará su contraseña
                </Text>
                <Text style={styles.instructionItem}>
                  4. ¡Podrá empezar a usar BarLive inmediatamente!
                </Text>
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  setEmail('');
                  setInviteSent(false);
                }}
              >
                <Text style={styles.buttonText}>Invitar a otro usuario</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.backButton2}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Volver</Text>
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
  benefitsBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  benefitBullet: {
    fontSize: 16,
    color: '#3b82f6',
    marginRight: 8,
    fontWeight: 'bold',
  },
  benefitText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  successBox: {
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  successText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    marginTop: 8,
  },
  instructionsBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  instructionItem: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  backButton2: {
    alignItems: 'center',
    padding: 16,
  },
  backButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
