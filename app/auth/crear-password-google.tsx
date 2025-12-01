
import React, { useState } from 'react';
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

export default function CrearPasswordGoogleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;
  
  const [loading, setLoading] = useState(false);

  const handleRequestVerificationCode = async () => {
    if (!email) {
      Alert.alert('Error', 'No se proporcionó un correo electrónico');
      return;
    }

    setLoading(true);

    try {
      console.log('[CrearPasswordGoogle] Solicitando código de verificación para:', email);

      // Get user data
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        console.error('[CrearPasswordGoogle] Error getting user:', userError);
        Alert.alert('Error', 'No se pudo encontrar el usuario');
        setLoading(false);
        return;
      }

      // Generate verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      console.log('[CrearPasswordGoogle] Código generado:', code);

      // Store verification code in database
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          verification_code: code,
          verification_code_expires_at: expiresAt.toISOString(),
        })
        .eq('id', userData.id);

      if (updateError) {
        console.error('[CrearPasswordGoogle] Error storing verification code:', updateError);
        Alert.alert('Error', 'No se pudo generar el código de verificación');
        setLoading(false);
        return;
      }

      console.log('[CrearPasswordGoogle] Código almacenado en la base de datos');

      // Send verification code via email
      console.log('[CrearPasswordGoogle] Enviando correo electrónico...');
      
      const { data: emailData, error: emailError } = await supabase.functions.invoke(
        'send-verification-email',
        {
          body: {
            email,
            code: code,
            type: 'password_reset',
          },
        }
      );

      console.log('[CrearPasswordGoogle] Respuesta del Edge Function:', { emailData, emailError });

      if (emailError) {
        console.error('[CrearPasswordGoogle] Error sending email:', emailError);
        
        // Check if it's a FunctionsHttpError with details
        let errorMessage = 'Hubo un problema al enviar el correo electrónico.';
        let showCode = true;
        
        if (emailError.message) {
          console.error('[CrearPasswordGoogle] Error message:', emailError.message);
          
          // Parse error details if available
          if (emailError.message.includes('Domain')) {
            errorMessage = 'El servicio de correo está en configuración. Por favor, usa el código que aparece a continuación.';
          } else if (emailError.message.includes('API key')) {
            errorMessage = 'El servicio de correo no está configurado correctamente. Por favor, usa el código que aparece a continuación.';
          }
        }
        
        Alert.alert(
          'Código generado',
          `${errorMessage}\n\nTu código de verificación es:\n\n${code}\n\nEste código expirará en 10 minutos.`,
          [
            {
              text: 'Copiar código',
              onPress: () => {
                // Note: Clipboard API would be used here in production
                console.log('[CrearPasswordGoogle] Código para copiar:', code);
              },
            },
            {
              text: 'Continuar',
              onPress: () => {
                router.push({
                  pathname: '/auth/verificar-codigo-google',
                  params: { email },
                });
              },
              style: 'default',
            },
          ]
        );
        setLoading(false);
        return;
      }

      console.log('[CrearPasswordGoogle] ✅ Código de verificación enviado exitosamente');

      Alert.alert(
        'Código enviado',
        'Hemos enviado un código de verificación a tu correo electrónico. Por favor, revisa tu bandeja de entrada (y la carpeta de spam).',
        [
          {
            text: 'Continuar',
            onPress: () => {
              router.push({
                pathname: '/auth/verificar-codigo-google',
                params: { email },
              });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('[CrearPasswordGoogle] ❌ Error en handleRequestVerificationCode:', error);
      Alert.alert(
        'Error',
        'Ocurrió un error inesperado. Por favor, intenta nuevamente o contacta con soporte.'
      );
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
        <Text style={styles.headerTitle}>Configurar contraseña</Text>
        <Text style={styles.headerSubtitle}>Migración a BarLive Auth 3.0</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <View style={styles.infoBox}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.infoText}>
              Tu cuenta fue creada con Google. Para continuar usando BarLive con nuestro nuevo sistema de autenticación, 
              necesitas configurar una contraseña.
            </Text>
          </View>

          <Text style={styles.emailLabel}>Correo electrónico</Text>
          <View style={styles.emailBox}>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>Paso 1: Verificación por código</Text>
            <Text style={styles.stepText}>
              Te enviaremos un código de verificación de 6 dígitos a tu correo electrónico. 
              Ingresa el código para verificar tu identidad y continuar con la configuración de tu contraseña.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRequestVerificationCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Enviar código de verificación</Text>
            )}
          </TouchableOpacity>

          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              Nota: Una vez configurada tu contraseña, podrás iniciar sesión con tu correo y contraseña. 
              Todos tus datos, roles y configuraciones se mantendrán intactos.
            </Text>
          </View>

          <View style={styles.troubleshootingBox}>
            <Text style={styles.troubleshootingTitle}>¿No recibes el correo?</Text>
            <Text style={styles.troubleshootingText}>
              - Revisa tu carpeta de spam{'\n'}
              - Verifica que el correo sea correcto{'\n'}
              - El código se mostrará en pantalla si hay problemas con el envío
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
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  stepBox: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  stepText: {
    fontSize: 14,
    color: colors.textSecondary,
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
    marginBottom: 16,
  },
  noteText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  troubleshootingBox: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: '#FFA500',
    borderRadius: 12,
    padding: 16,
  },
  troubleshootingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  troubleshootingText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
