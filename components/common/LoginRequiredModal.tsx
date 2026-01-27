
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';

interface LoginRequiredModalProps {
  visible: boolean;
  onClose: () => void;
  message?: string;
}

/**
 * ✅ LOGIN REQUIRED MODAL v4.0 - DIRECT NAVIGATION TO AUTH
 * 
 * v4.0 Changes:
 * - ✅ NEW: Navigate directly to auth page without showing modal options
 * - ✅ NEW: Full page navigation instead of modal window
 * - ✅ PREVIOUS: Custom message support for different contexts
 * - ✅ PREVIOUS: Specific features list for claiming/creating locals
 */

export default function LoginRequiredModal({
  visible,
  onClose,
  message = 'Para reclamar o crear un local necesitas iniciar sesión o crear una cuenta en BarLive',
}: LoginRequiredModalProps) {
  const router = useRouter();

  const handleLogin = () => {
    console.log('[LoginRequiredModal v4.0] User tapped Login button - navigating to full page auth');
    onClose();
    // ✅ NAVEGACIÓN DIRECTA: Ir a la página de autenticación completa
    router.push('/auth/login-v6');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.iconContainer}
          >
            <IconSymbol ios_icon_name="lock.fill" android_material_icon_name="lock" size={48} color={colors.headerText} />
          </LinearGradient>

          <Text style={styles.title}>Inicio de Sesión Requerido</Text>
          
          <Text style={styles.message}>{message}</Text>

          <Text style={styles.subtitle}>
            Inicia sesión o regístrate para:
          </Text>

          <View style={styles.features}>
            <View style={styles.featureItem}>
              <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color={colors.primary} />
              <Text style={styles.featureText}>Reclamar tu local existente</Text>
            </View>
            <View style={styles.featureItem}>
              <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color={colors.primary} />
              <Text style={styles.featureText}>Crear un nuevo local</Text>
            </View>
            <View style={styles.featureItem}>
              <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color={colors.primary} />
              <Text style={styles.featureText}>Gestionar tu perfil de propietario</Text>
            </View>
            <View style={styles.featureItem}>
              <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color={colors.primary} />
              <Text style={styles.featureText}>Acceder a todas las funciones</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              style={styles.loginButtonGradient}
            >
              <Text style={styles.loginButtonText}>Iniciar Sesión / Registrarse</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
    marginBottom: 20,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  features: {
    width: '100%',
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  featureText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 12,
    flex: 1,
  },
  loginButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  loginButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
