
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { scaleFontSize } from '@/utils/androidScaling';
import { useRouter } from 'expo-router';

interface VirtualRoomLoginModalProps {
  visible: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  localName: string;
  redirectPath: string;
}

/**
 * ✅ VIRTUAL ROOM LOGIN MODAL v4.0 - COMPLETE REDIRECT FIX
 * 
 * CRITICAL FIXES v4.0:
 * - ✅ FIXED: Redirect path now ALWAYS passed correctly to auth screens
 * - ✅ FIXED: Uses router.replace instead of router.push to avoid stack issues
 * - ✅ FIXED: Properly encodes redirect path with encodeURIComponent
 * - ✅ IMPROVED: Comprehensive logging for debugging
 * - ✅ ENHANCED: Better error handling
 * 
 * Features:
 * - Clear message: "Debes iniciar sesión para acceder a la Sala Virtual"
 * - Two action buttons with proper styling
 * - Redirect parameter properly encoded and passed
 * - Returns user to virtual room after successful auth
 */

export default function VirtualRoomLoginModal({
  visible,
  onClose,
  onLoginSuccess,
  localName,
  redirectPath,
}: VirtualRoomLoginModalProps) {
  const router = useRouter();

  const messageText = 'Debes iniciar sesión para acceder a la Sala Virtual';
  const loginButtonText = 'Iniciar Sesión';
  const registerButtonText = 'Registrarse';

  const handleLogin = () => {
    console.log('[VirtualRoomLoginModal v4.0] 🔐 LOGIN BUTTON PRESSED');
    console.log('[VirtualRoomLoginModal v4.0] 🎯 Raw redirect path:', redirectPath);
    
    const encodedRedirect = encodeURIComponent(redirectPath);
    console.log('[VirtualRoomLoginModal v4.0] 🎯 Encoded redirect:', encodedRedirect);
    
    console.log('[VirtualRoomLoginModal v4.0] 🚀 Navigating to login with redirect parameter');
    
    // ✅ CRITICAL FIX v4.0: Use router.replace to avoid stack issues
    router.replace({
      pathname: '/auth/login-secure',
      params: {
        redirect: encodedRedirect,
      },
    });
    
    console.log('[VirtualRoomLoginModal v4.0] ✅ Navigation executed');
  };

  const handleRegister = () => {
    console.log('[VirtualRoomLoginModal v4.0] 📝 REGISTER BUTTON PRESSED');
    console.log('[VirtualRoomLoginModal v4.0] 🎯 Raw redirect path:', redirectPath);
    
    const encodedRedirect = encodeURIComponent(redirectPath);
    console.log('[VirtualRoomLoginModal v4.0] 🎯 Encoded redirect:', encodedRedirect);
    
    console.log('[VirtualRoomLoginModal v4.0] 🚀 Navigating to register with redirect parameter');
    
    // ✅ CRITICAL FIX v4.0: Use router.replace to avoid stack issues
    router.replace({
      pathname: '/auth/registro-seguro',
      params: {
        redirect: encodedRedirect,
      },
    });
    
    console.log('[VirtualRoomLoginModal v4.0] ✅ Navigation executed');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          <View style={styles.content}>
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              style={styles.iconContainer}
            >
              <IconSymbol 
                ios_icon_name="cube.fill" 
                android_material_icon_name="view_in_ar" 
                size={56} 
                color={colors.headerText} 
              />
            </LinearGradient>

            <Text style={[styles.title, { fontSize: scaleFontSize(22) }]}>
              Sala Virtual
            </Text>
            
            <Text style={[styles.message, { fontSize: scaleFontSize(16) }]}>
              {messageText}
            </Text>

            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                  style={styles.loginButtonGradient}
                >
                  <IconSymbol 
                    ios_icon_name="person.fill" 
                    android_material_icon_name="person" 
                    size={20} 
                    color={colors.headerText} 
                  />
                  <Text style={[styles.loginButtonText, { fontSize: scaleFontSize(16) }]}>
                    {loginButtonText}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.registerButton}
                onPress={handleRegister}
                activeOpacity={0.8}
              >
                <View style={styles.registerButtonContent}>
                  <IconSymbol 
                    ios_icon_name="person.badge.plus" 
                    android_material_icon_name="person_add" 
                    size={20} 
                    color={colors.primary} 
                  />
                  <Text style={[styles.registerButtonText, { fontSize: scaleFontSize(16) }]}>
                    {registerButtonText}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { fontSize: scaleFontSize(14) }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  content: {
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  loginButtonText: {
    fontWeight: 'bold',
    color: colors.headerText,
  },
  registerButton: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  registerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  registerButtonText: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
