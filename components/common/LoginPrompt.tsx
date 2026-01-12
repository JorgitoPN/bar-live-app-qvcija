
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

interface LoginPromptProps {
  title?: string;
  message?: string;
  icon?: string;
  androidIcon?: string;
}

/**
 * ✅ REUSABLE LOGIN PROMPT COMPONENT v2.0 - ANDROID SCALING FIX
 * 
 * CRITICAL FIXES v2.0 (ANDROID ONLY):
 * - ✅ All font sizes now use scaleFontSize() for proper Android scaling
 * - ✅ Icon sizes use scaleIconSize() for consistent proportions
 * - ✅ Title, message, and button text properly scaled
 * - ✅ iOS design remains unchanged (reference design)
 * 
 * Features:
 * - Consistent design across all pages
 * - Gradient background
 * - Customizable title and message
 * - Login and register buttons
 * - Platform-specific responsive scaling
 */

export default function LoginPrompt({
  title = 'Inicia sesión para ver el contenido',
  message = 'Para acceder a esta sección y ver todo el contenido, necesitas iniciar sesión en BarLive.',
  icon = 'lock.fill',
  androidIcon = 'lock',
}: LoginPromptProps) {
  const router = useRouter();

  const iconSize = Platform.OS === 'android' ? scaleIconSize(64) : 64;
  const iconContainerSize = Platform.OS === 'android' ? scaleIconSize(120) : 120;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={[
          styles.iconContainer,
          {
            width: iconContainerSize,
            height: iconContainerSize,
            borderRadius: iconContainerSize / 2,
          },
        ]}
      >
        <IconSymbol 
          ios_icon_name={icon} 
          android_material_icon_name={androidIcon} 
          size={iconSize} 
          color={colors.white} 
        />
      </LinearGradient>
      
      <Text style={[styles.title, { fontSize: scaleFontSize(24) }]}>{title}</Text>
      <Text style={[styles.message, { fontSize: scaleFontSize(16) }]}>{message}</Text>
      
      <TouchableOpacity
        style={styles.loginButton}
        onPress={() => router.push('/auth/login-v6')}
      >
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.loginButtonGradient}
        >
          <Text style={[styles.loginButtonText, { fontSize: scaleFontSize(16) }]}>Iniciar Sesión</Text>
        </LinearGradient>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.registerButton}
        onPress={() => router.push('/auth/registro-v6')}
      >
        <Text style={[styles.registerButtonText, { fontSize: scaleFontSize(14) }]}>
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
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
    fontWeight: 'bold',
    color: colors.white,
  },
  registerButton: {
    paddingVertical: 12,
  },
  registerButtonText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  registerButtonTextBold: {
    fontWeight: '600',
    color: colors.primary,
  },
});
