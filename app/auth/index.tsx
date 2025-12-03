
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import * as LocalAuthentication from 'expo-local-authentication';

export default function AuthIndexScreen() {
  const router = useRouter();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');

  useEffect(() => {
    checkBiometricAvailability();
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (compatible && enrolled) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        setBiometricAvailable(true);
        
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('Face ID');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('Touch ID');
        } else {
          setBiometricType('Biometric');
        }
      }
    } catch (error) {
      console.log('[Auth] Error checking biometric:', error);
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Iniciar sesión en BarLive',
        fallbackLabel: 'Usar contraseña',
        cancelLabel: 'Cancelar',
      });

      if (result.success) {
        // Check if user has saved credentials
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          router.replace('/(tabs)/explorar');
        } else {
          router.push('/auth/login-v5');
        }
      }
    } catch (error) {
      console.log('[Auth] Biometric auth error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Logo and Welcome */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <IconSymbol
                  ios_icon_name="sparkles"
                  android_material_icon_name="auto_awesome"
                  size={64}
                  color="#fff"
                />
              </View>
              <Text style={styles.title}>BarLive</Text>
              <Text style={styles.subtitle}>
                Descubre la mejor vida nocturna
              </Text>
            </View>

            {/* Auth Options */}
            <View style={styles.optionsContainer}>
              {biometricAvailable && (
                <TouchableOpacity
                  style={styles.biometricButton}
                  onPress={handleBiometricAuth}
                  activeOpacity={0.8}
                >
                  <IconSymbol
                    ios_icon_name="faceid"
                    android_material_icon_name="fingerprint"
                    size={32}
                    color="#fff"
                  />
                  <Text style={styles.biometricText}>
                    Continuar con {biometricType}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push('/auth/login-v5')}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push('/auth/registro-v5')}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>Crear cuenta</Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>o continúa con</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => router.push('/auth/google-oauth-v5')}
                activeOpacity={0.8}
              >
                <IconSymbol
                  ios_icon_name="g.circle.fill"
                  android_material_icon_name="g_translate"
                  size={24}
                  color="#fff"
                />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Al continuar, aceptas nuestros{' '}
                <Text style={styles.footerLink}>Términos de Servicio</Text>
                {' '}y{' '}
                <Text style={styles.footerLink}>Política de Privacidad</Text>
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'android' ? 60 : 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  biometricText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 12,
  },
  primaryButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 12,
  },
  footer: {
    marginTop: 40,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    fontWeight: '600',
    color: '#fff',
    textDecorationLine: 'underline',
  },
});
