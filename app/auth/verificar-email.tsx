
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
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

export default function VerificarEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;
  
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    if (countdown > 0) {
      Alert.alert('Espera', `Por favor, espera ${countdown} segundos antes de reenviar el correo.`);
      return;
    }

    setResending(true);

    try {
      console.log('[VerificarEmail v4.0] 📧 Reenviando correo de verificación:', email);

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: 'https://natively.dev/email-confirmed',
        },
      });

      if (error) {
        console.error('[VerificarEmail v4.0] ❌ Error resending email:', error);
        Alert.alert('Error', 'No se pudo reenviar el correo de verificación. Por favor, intenta nuevamente.');
      } else {
        console.log('[VerificarEmail v4.0] ✅ Email resent successfully');
        Alert.alert(
          'Correo enviado',
          'Se ha reenviado el correo de verificación. Por favor, revisa tu bandeja de entrada (y la carpeta de spam).'
        );
        setCountdown(60); // 60 seconds cooldown
      }
    } catch (error: any) {
      console.error('[VerificarEmail v4.0] ❌ Error resending email:', error);
      Alert.alert('Error', 'Ocurrió un error al reenviar el correo');
    } finally {
      setResending(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/auth/login');
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
        <Text style={styles.headerTitle}>Verifica tu email</Text>
        <Text style={styles.headerSubtitle}>Revisa tu correo electrónico</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <View style={styles.infoBox}>
            <IconSymbol
              ios_icon_name="envelope.fill"
              android_material_icon_name="email"
              size={64}
              color={colors.primary}
            />
            <Text style={styles.infoTitle}>Revisa tu correo</Text>
            <Text style={styles.infoText}>
              Hemos enviado un correo de verificación a:
            </Text>
            <Text style={styles.emailText}>{email}</Text>
            <Text style={styles.infoText}>
              Por favor, haz clic en el enlace del correo para verificar tu cuenta.
            </Text>
          </View>

          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsTitle}>📋 Instrucciones:</Text>
            <Text style={styles.instructionItem}>1. Abre tu correo electrónico</Text>
            <Text style={styles.instructionItem}>2. Busca el correo de BarLive</Text>
            <Text style={styles.instructionItem}>3. Haz clic en el enlace de verificación</Text>
            <Text style={styles.instructionItem}>4. Serás redirigido automáticamente</Text>
            <Text style={styles.instructionItem}>5. ¡Listo! Ya puedes iniciar sesión</Text>
          </View>

          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>💡 Consejos:</Text>
            <Text style={styles.tipItem}>• Revisa tu carpeta de spam</Text>
            <Text style={styles.tipItem}>• El enlace expira en 24 horas</Text>
            <Text style={styles.tipItem}>• Puedes solicitar un nuevo correo si no lo recibes</Text>
          </View>

          <TouchableOpacity
            style={[styles.resendButton, (resending || countdown > 0) && styles.resendButtonDisabled]}
            onPress={handleResendEmail}
            disabled={resending || countdown > 0}
          >
            {resending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.resendButtonText}>
                {countdown > 0 
                  ? `Reenviar correo en ${countdown}s` 
                  : 'Reenviar correo de verificación'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToLoginButton}
            onPress={handleBackToLogin}
          >
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
    marginBottom: 8,
    lineHeight: 20,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  instructionsBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
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
  tipsBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  tipItem: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 20,
  },
  resendButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backToLoginButton: {
    alignItems: 'center',
  },
  backToLoginText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  backToLoginTextBold: {
    fontWeight: '600',
    color: colors.primary,
  },
});
