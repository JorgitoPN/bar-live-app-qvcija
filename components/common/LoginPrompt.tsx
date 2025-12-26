
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';

interface LoginPromptProps {
  title?: string;
  message?: string;
  icon?: string;
  androidIcon?: string;
}

/**
 * ✅ REUSABLE LOGIN PROMPT COMPONENT v1.0
 * 
 * Features:
 * - Consistent design across all pages
 * - Gradient background
 * - Customizable title and message
 * - Login and register buttons
 */

export default function LoginPrompt({
  title = 'Inicia sesión para ver el contenido',
  message = 'Para acceder a esta sección y ver todo el contenido, necesitas iniciar sesión en BarLive.',
  icon = 'lock.fill',
  androidIcon = 'lock',
}: LoginPromptProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.iconContainer}
      >
        <IconSymbol 
          ios_icon_name={icon} 
          android_material_icon_name={androidIcon} 
          size={64} 
          color={colors.white} 
        />
      </LinearGradient>
      
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      
      <TouchableOpacity
        style={styles.loginButton}
        onPress={() => router.push('/auth/login')}
      >
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.loginButtonGradient}
        >
          <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
        </LinearGradient>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.registerButton}
        onPress={() => router.push('/auth/registro-email')}
      >
        <Text style={styles.registerButtonText}>
          ¿No tienes cuenta? <Text style={styles.registerButtonTextBold}>Regístrate</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.background,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  loginButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  loginButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  registerButton: {
    paddingVertical: 12,
  },
  registerButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  registerButtonTextBold: {
    fontWeight: '600',
    color: colors.primary,
  },
});
