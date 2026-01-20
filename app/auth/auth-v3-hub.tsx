
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

export default function AuthV3HubScreen() {
  const router = useRouter();

  const authFlows = [
    {
      id: 'confirm-signup',
      title: 'Confirmar registro',
      description: 'Verificar dirección de email después del registro',
      icon: 'checkmark.circle.fill' as const,
      androidIcon: 'check_circle' as const,
      route: '/auth/verificar-email',
      color: '#10b981',
    },
    {
      id: 'invite-user',
      title: 'Invitar usuario',
      description: 'Invitar usuarios que aún no tienen cuenta',
      icon: 'person.badge.plus.fill' as const,
      androidIcon: 'person_add' as const,
      route: '/auth/invitar-usuario',
      color: '#3b82f6',
    },
    {
      id: 'magic-link',
      title: 'Magic Link',
      description: 'Iniciar sesión con enlace de un solo uso',
      icon: 'link.circle.fill' as const,
      androidIcon: 'link' as const,
      route: '/auth/magic-link',
      color: '#8b5cf6',
    },
    {
      id: 'change-email',
      title: 'Cambiar email',
      description: 'Verificar nueva dirección de email',
      icon: 'envelope.circle.fill' as const,
      androidIcon: 'email' as const,
      route: '/auth/cambiar-email',
      color: '#f59e0b',
    },
    {
      id: 'reset-password',
      title: 'Restablecer contraseña',
      description: 'Recuperar contraseña olvidada',
      icon: 'lock.rotation' as const,
      androidIcon: 'lock_reset' as const,
      route: '/auth/recuperar-password',
      color: '#ef4444',
    },
    {
      id: 'reauthentication',
      title: 'Reautenticación',
      description: 'Verificar identidad para acciones sensibles',
      icon: 'shield.checkered' as const,
      androidIcon: 'verified_user' as const,
      route: '/auth/reautenticar',
      color: '#ec4899',
    },
  ];

  return (
    <View style={styles.container}>
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
        <Text style={styles.headerTitle}>Sistema de Autenticación v3.0</Text>
        <Text style={styles.headerSubtitle}>
          Gestión completa de autenticación y verificación
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.infoBox}>
          <IconSymbol
            ios_icon_name="info.circle.fill"
            android_material_icon_name="info"
            size={48}
            color={colors.primary}
          />
          <Text style={styles.infoTitle}>Sistema Completo</Text>
          <Text style={styles.infoText}>
            Este sistema implementa todos los flujos de autenticación recomendados
            por Supabase para una aplicación segura y completa.
          </Text>
        </View>

        <View style={styles.flowsContainer}>
          {authFlows.map((flow, index) => (
            <TouchableOpacity
              key={flow.id}
              style={[styles.flowCard, { borderLeftColor: flow.color }]}
              onPress={() => router.push(flow.route as any)}
            >
              <View style={styles.flowIconContainer}>
                <IconSymbol
                  ios_icon_name={flow.icon}
                  android_material_icon_name={flow.androidIcon}
                  size={32}
                  color={flow.color}
                />
              </View>
              <View style={styles.flowContent}>
                <Text style={styles.flowTitle}>{flow.title}</Text>
                <Text style={styles.flowDescription}>{flow.description}</Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.featuresBox}>
          <Text style={styles.featuresTitle}>✨ Características</Text>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>•</Text>
            <Text style={styles.featureText}>
              Verificación de email después del registro
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>•</Text>
            <Text style={styles.featureText}>
              Sistema de invitaciones para nuevos usuarios
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>•</Text>
            <Text style={styles.featureText}>
              Inicio de sesión sin contraseña (Magic Link)
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>•</Text>
            <Text style={styles.featureText}>
              Cambio seguro de dirección de email
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>•</Text>
            <Text style={styles.featureText}>
              Recuperación de contraseña mejorada
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureBullet}>•</Text>
            <Text style={styles.featureText}>
              Reautenticación para acciones sensibles
            </Text>
          </View>
        </View>
      </ScrollView>
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
  infoBox: {
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  flowsContainer: {
    marginBottom: 24,
  },
  flowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  flowIconContainer: {
    marginRight: 16,
  },
  flowContent: {
    flex: 1,
  },
  flowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  flowDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  featuresBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featureBullet: {
    fontSize: 16,
    color: colors.primary,
    marginRight: 8,
    fontWeight: 'bold',
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
