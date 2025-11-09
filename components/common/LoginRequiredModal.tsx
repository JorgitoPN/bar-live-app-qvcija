
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

export default function LoginRequiredModal({
  visible,
  onClose,
  message = 'Para acceder a esta función necesitas registrarte en BarLive',
}: LoginRequiredModalProps) {
  const router = useRouter();

  const handleLogin = () => {
    onClose();
    router.push('/auth/login-popup');
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
            <IconSymbol name="lock.fill" size={48} color={colors.headerText} />
          </LinearGradient>

          <Text style={styles.title}>Registro Requerido</Text>
          
          <Text style={styles.message}>{message}</Text>

          <Text style={styles.subtitle}>
            Regístrate ahora para disfrutar de toda la app al completo:
          </Text>

          <View style={styles.features}>
            <View style={styles.featureItem}>
              <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
              <Text style={styles.featureText}>Crea y comparte publicaciones</Text>
            </View>
            <View style={styles.featureItem}>
              <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
              <Text style={styles.featureText}>Guarda tus locales favoritos</Text>
            </View>
            <View style={styles.featureItem}>
              <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
              <Text style={styles.featureText}>Accede a tu perfil personalizado</Text>
            </View>
            <View style={styles.featureItem}>
              <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
              <Text style={styles.featureText}>Recibe notificaciones de eventos</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              style={styles.loginButtonGradient}
            >
              <Text style={styles.loginButtonText}>Registrarse / Iniciar Sesión</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Continuar sin registrarse</Text>
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
