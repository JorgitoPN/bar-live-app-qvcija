
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

export default function EmailConfirmedScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkEmailConfirmation();
  }, []);

  const checkEmailConfirmation = async () => {
    try {
      console.log('[EmailConfirmed v4.0] 🔍 Verificando confirmación de email...');

      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('[EmailConfirmed v4.0] ❌ Error getting session:', sessionError);
        setError('No se pudo verificar la sesión');
        setLoading(false);
        return;
      }

      if (!session) {
        console.log('[EmailConfirmed v4.0] ℹ️ No active session');
        setError('No hay sesión activa');
        setLoading(false);
        return;
      }

      // Check if email is verified
      if (session.user.email_confirmed_at) {
        console.log('[EmailConfirmed v4.0] ✅ Email confirmed successfully');
        
        // Update user in database
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({ email_verified: true })
          .eq('id', session.user.id);

        if (updateError) {
          console.error('[EmailConfirmed v4.0] ⚠️ Error updating user:', updateError);
        }

        setSuccess(true);
      } else {
        setError('El email aún no ha sido verificado');
      }
    } catch (err: any) {
      console.error('[EmailConfirmed v4.0] ❌ Error:', err);
      setError('Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    router.replace('/(tabs)/explorar');
  };

  const handleBackToLogin = () => {
    router.replace('/auth/login');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Verificación de email</Text>
      </LinearGradient>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Verificando tu email...</Text>
          </View>
        ) : success ? (
          <View style={styles.successContainer}>
            <View style={styles.iconContainer}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={80}
                color="#10B981"
              />
            </View>
            <Text style={styles.successTitle}>¡Email verificado!</Text>
            <Text style={styles.successText}>
              Tu correo electrónico ha sido verificado exitosamente. 
              Ahora puedes acceder a todas las funciones de BarLive.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={handleContinue}
            >
              <Text style={styles.buttonText}>Continuar a la app</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.errorContainer}>
            <View style={styles.iconContainer}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="cancel"
                size={80}
                color="#EF4444"
              />
            </View>
            <Text style={styles.errorTitle}>Error de verificación</Text>
            <Text style={styles.errorText}>
              {error || 'No se pudo verificar tu email. Por favor, intenta nuevamente.'}
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={handleBackToLogin}
            >
              <Text style={styles.buttonText}>Volver al inicio de sesión</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
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
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  successContainer: {
    alignItems: 'center',
  },
  errorContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
