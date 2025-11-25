
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

export default function RegistroEmailScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleContinue = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor, ingresa tu correo electrónico');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Por favor, ingresa un correo electrónico válido');
      return;
    }

    setLoading(true);

    try {
      // Check if email already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('usuarios')
        .select('id, email, provider, email_verified')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking email:', checkError);
        Alert.alert('Error', 'Ocurrió un error al verificar el correo');
        setLoading(false);
        return;
      }

      if (existingUser) {
        if (existingUser.provider === 'google') {
          Alert.alert(
            'Cuenta existente',
            'Esta cuenta fue creada con Google. Para continuar, crea una contraseña para tu cuenta de BarLive.',
            [
              {
                text: 'Crear contraseña',
                onPress: () => {
                  router.push({
                    pathname: '/auth/crear-password-google',
                    params: { email: email.toLowerCase(), userId: existingUser.id },
                  });
                },
              },
              { text: 'Cancelar', style: 'cancel' },
            ]
          );
          setLoading(false);
          return;
        } else {
          Alert.alert('Error', 'Este correo ya está registrado. Por favor, inicia sesión.');
          setLoading(false);
          return;
        }
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Create temporary user record with OTP
      const { error: insertError } = await supabase
        .from('usuarios')
        .insert({
          email: email.toLowerCase(),
          verification_code: otp,
          verification_code_expires_at: expiresAt.toISOString(),
          email_verified: false,
          provider: 'barlive',
          nombre: email.split('@')[0], // Temporary name
          rol_app: 'cliente',
          activo: false, // Not active until email is verified
        });

      if (insertError) {
        console.error('Error creating user:', insertError);
        Alert.alert('Error', 'No se pudo crear la cuenta. Por favor, intenta nuevamente.');
        setLoading(false);
        return;
      }

      // TODO: Send OTP via email using Edge Function
      // For now, we'll show it in an alert (development only)
      console.log('OTP Code:', otp);
      
      // In production, you would call an Edge Function to send the email
      // await supabase.functions.invoke('send-verification-email', {
      //   body: { email: email.toLowerCase(), code: otp }
      // });

      Alert.alert(
        'Código enviado',
        `Hemos enviado un código de verificación a ${email}. (Desarrollo: ${otp})`,
        [
          {
            text: 'OK',
            onPress: () => {
              router.push({
                pathname: '/auth/verificar-email',
                params: { email: email.toLowerCase() },
              });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error in handleContinue:', error);
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
        <Text style={styles.headerTitle}>Crear cuenta</Text>
        <Text style={styles.headerSubtitle}>Paso 1 de 4</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>¿Cuál es tu correo electrónico?</Text>
          <Text style={styles.stepSubtitle}>
            Te enviaremos un código de verificación
          </Text>

          <TextInput
            style={styles.input}
            placeholder="tu@email.com"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            editable={!loading}
          />

          <Text style={styles.helperText}>
            Usaremos este correo para enviarte actualizaciones importantes
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={handleContinue}
          disabled={loading}
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
  input: {
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    color: colors.text,
    marginBottom: 12,
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
