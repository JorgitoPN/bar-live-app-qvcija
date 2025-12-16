
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../integrations/supabase/client';
import { colors } from '../../../styles/commonStyles';
import { IconSymbol } from '../../../components/IconSymbol';

interface AdminOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  androidIcon: string;
  route: string;
  color: string;
  badge?: string;
}

export default function AdminPanel() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stripeConfigured, setStripeConfigured] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    checkStripeConfiguration();
  }, []);

  const checkAdminAccess = async () => {
    try {
      console.log('[AdminPanel] 🔍 Verificando acceso de administrador...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[AdminPanel] ❌ No hay usuario autenticado');
        Alert.alert('Error', 'Debes iniciar sesión');
        router.replace('/auth/login');
        return;
      }

      console.log('[AdminPanel] 👤 Usuario autenticado:', user.email);

      // ✅ FIX: Check rol_app instead of rol
      const { data: profile, error } = await supabase
        .from('usuarios')
        .select('rol_app')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('[AdminPanel] ❌ Error obteniendo perfil:', error);
        Alert.alert('Error', 'No se pudo verificar el acceso');
        router.back();
        return;
      }

      console.log('[AdminPanel] 📊 Perfil obtenido:', profile);
      console.log('[AdminPanel] 🔑 Rol del usuario:', profile?.rol_app);

      if (profile?.rol_app !== 'admin') {
        console.log('[AdminPanel] ❌ Usuario no es administrador');
        Alert.alert('Acceso Denegado', 'No tienes permisos de administrador');
        router.back();
        return;
      }

      console.log('[AdminPanel] ✅ Usuario es administrador, acceso concedido');
      setIsAdmin(true);
    } catch (error) {
      console.error('[AdminPanel] ❌ Error inesperado verificando acceso:', error);
      Alert.alert('Error', 'No se pudo verificar el acceso');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const checkStripeConfiguration = async () => {
    try {
      const { data } = await supabase
        .from('stripe_configuration')
        .select('*')
        .single();

      setStripeConfigured(!!data?.publishable_key && !!data?.secret_key);
    } catch (error) {
      console.log('Stripe not configured yet');
      setStripeConfigured(false);
    }
  };

  const adminOptions: AdminOption[] = [
    {
      id: 'stripe_wizard',
      title: 'Asistente de Stripe',
      description: 'Configuración guiada paso a paso',
      icon: 'wand.and.stars',
      androidIcon: 'auto_fix_high',
      route: '/admin/asistente-stripe',
      color: colors.primary,
      badge: stripeConfigured ? undefined : '¡Nuevo!',
    },
    {
      id: 'stripe',
      title: 'Gestionar Pagos Stripe',
      description: 'Configuración avanzada de Stripe',
      icon: 'creditcard.fill',
      androidIcon: 'credit_card',
      route: '/admin/gestionar-pagos-stripe',
      color: '#635BFF',
    },
    {
      id: 'planes',
      title: 'Gestionar Planes',
      description: 'Crear y editar planes de suscripción',
      icon: 'star.fill',
      androidIcon: 'star',
      route: '/admin/gestionar-planes',
      color: '#FFD700',
    },
    {
      id: 'usuarios',
      title: 'Gestionar Usuarios',
      description: 'Administrar usuarios y permisos',
      icon: 'person.2.fill',
      androidIcon: 'people',
      route: '/admin/gestionar-usuarios',
      color: '#4CAF50',
    },
    {
      id: 'locales',
      title: 'Gestionar Locales',
      description: 'Administrar locales y establecimientos',
      icon: 'building.2.fill',
      androidIcon: 'store',
      route: '/admin/gestionar-locales',
      color: '#FF9800',
    },
    {
      id: 'eventos',
      title: 'Gestionar Eventos',
      description: 'Crear y administrar eventos',
      icon: 'calendar',
      androidIcon: 'event',
      route: '/admin/gestionar-eventos',
      color: '#9C27B0',
    },
    {
      id: 'solicitudes',
      title: 'Solicitudes de Propietario',
      description: 'Revisar solicitudes pendientes',
      icon: 'envelope.fill',
      androidIcon: 'mail',
      route: '/admin/gestionar-solicitudes',
      color: '#2196F3',
    },
    {
      id: 'finanzas',
      title: 'Visión Financiera',
      description: 'Análisis de ingresos y métricas',
      icon: 'chart.bar.fill',
      androidIcon: 'bar_chart',
      route: '/admin/vision-finanzas',
      color: '#00BCD4',
    },
    {
      id: 'configuracion',
      title: 'Configuración General',
      description: 'Ajustes generales de la aplicación',
      icon: 'gearshape.fill',
      androidIcon: 'settings',
      route: '/admin/configuracion-general',
      color: '#607D8B',
    },
  ];

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </View>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Panel de Administración</Text>
        <Text style={styles.headerSubtitle}>Gestiona tu aplicación</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!stripeConfigured && (
          <View style={styles.alertCard}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={32}
              color={colors.warning}
            />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Stripe no configurado</Text>
              <Text style={styles.alertText}>
                Usa el Asistente de Stripe para configurar los pagos en minutos
              </Text>
            </View>
          </View>
        )}

        <View style={styles.grid}>
          {adminOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.card}
              onPress={() => router.push(option.route as any)}
              activeOpacity={0.7}
            >
              {option.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{option.badge}</Text>
                </View>
              )}
              <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
                <IconSymbol
                  ios_icon_name={option.icon}
                  android_material_icon_name={option.androidIcon}
                  size={32}
                  color={option.color}
                />
              </View>
              <Text style={styles.cardTitle}>{option.title}</Text>
              <Text style={styles.cardDescription}>{option.description}</Text>
            </TouchableOpacity>
          ))}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.warning,
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
