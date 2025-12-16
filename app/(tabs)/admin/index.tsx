
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
import { LinearGradient } from 'expo-linear-gradient';

interface AdminSection {
  id: string;
  title: string;
  icon: string;
  androidIcon: string;
  color: string;
  options: AdminOption[];
}

interface AdminOption {
  id: string;
  title: string;
  description: string;
  route: string;
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

  const adminSections: AdminSection[] = [
    {
      id: 'payments',
      title: 'Pagos y Suscripciones',
      icon: 'creditcard.fill',
      androidIcon: 'credit_card',
      color: '#635BFF',
      options: [
        {
          id: 'stripe_wizard',
          title: 'Asistente de Stripe',
          description: 'Configuración guiada paso a paso',
          route: '/admin/asistente-stripe',
          badge: stripeConfigured ? undefined : '¡Nuevo!',
        },
        {
          id: 'stripe',
          title: 'Gestionar Pagos Stripe',
          description: 'Configuración avanzada de Stripe',
          route: '/admin/gestionar-pagos-stripe',
        },
        {
          id: 'planes',
          title: 'Gestionar Planes',
          description: 'Crear y editar planes de suscripción',
          route: '/admin/gestionar-planes',
        },
        {
          id: 'facturacion',
          title: 'Facturación',
          description: 'Sistema de facturación automática',
          route: '/admin/facturacion',
        },
        {
          id: 'finanzas',
          title: 'Visión Financiera',
          description: 'Análisis de ingresos y métricas',
          route: '/admin/vision-finanzas',
        },
      ],
    },
    {
      id: 'content',
      title: 'Gestión de Contenido',
      icon: 'folder.fill',
      androidIcon: 'folder',
      color: '#4CAF50',
      options: [
        {
          id: 'usuarios',
          title: 'Gestionar Usuarios',
          description: 'Administrar usuarios y permisos',
          route: '/admin/gestionar-usuarios',
        },
        {
          id: 'locales',
          title: 'Gestionar Locales',
          description: 'Administrar locales y establecimientos',
          route: '/admin/gestionar-locales',
        },
        {
          id: 'eventos',
          title: 'Gestionar Eventos',
          description: 'Crear y administrar eventos',
          route: '/admin/gestionar-eventos',
        },
        {
          id: 'solicitudes',
          title: 'Solicitudes de Propietario',
          description: 'Revisar solicitudes pendientes',
          route: '/admin/gestionar-solicitudes',
        },
      ],
    },
    {
      id: 'import',
      title: 'Importación y Enriquecimiento',
      icon: 'arrow.down.doc.fill',
      androidIcon: 'download',
      color: '#00BCD4',
      options: [
        {
          id: 'importacion_masiva',
          title: 'Importación Masiva',
          description: 'Importar locales desde múltiples fuentes',
          route: '/admin/importacion-masiva',
        },
        {
          id: 'importacion_osm',
          title: 'Importación OSM',
          description: 'Importar desde OpenStreetMap',
          route: '/admin/importacion-osm',
        },
        {
          id: 'enriquecimiento',
          title: 'Enriquecimiento Google',
          description: 'Enriquecer con datos de Google Places',
          route: '/admin/enriquecimiento-google',
        },
        {
          id: 'recategorizar',
          title: 'Recategorizar Locales',
          description: 'Actualizar categorías de locales',
          route: '/admin/recategorizar-locales',
        },
        {
          id: 'sincronizacion',
          title: 'Sincronización',
          description: 'Sincronizar datos con fuentes externas',
          route: '/admin/sincronizacion',
        },
        {
          id: 'migrar_fotos',
          title: 'Migrar Fotos a Supabase',
          description: 'Migrar fotos a Supabase Storage',
          route: '/admin/migrar-fotos-supabase',
        },
      ],
    },
    {
      id: 'config',
      title: 'Configuración y Herramientas',
      icon: 'gearshape.fill',
      androidIcon: 'settings',
      color: '#607D8B',
      options: [
        {
          id: 'configuracion',
          title: 'Configuración General',
          description: 'Ajustes generales de la aplicación',
          route: '/admin/configuracion-general',
        },
        {
          id: 'configuracion_supabase',
          title: 'Configuración Supabase',
          description: 'Configurar conexión con Supabase',
          route: '/admin/configuracion-supabase',
        },
        {
          id: 'datos_maestros',
          title: 'Datos Maestros',
          description: 'Gestionar categorías y datos base',
          route: '/admin/datos-maestros',
        },
        {
          id: 'backups',
          title: 'Backups',
          description: 'Gestionar copias de seguridad',
          route: '/admin/backups',
        },
        {
          id: 'control_costes',
          title: 'Control de Costes API',
          description: 'Monitorear uso y costes de APIs',
          route: '/admin/control-costes-api',
        },
      ],
    },
    {
      id: 'communication',
      title: 'Emails y Comunicación',
      icon: 'envelope.fill',
      androidIcon: 'email',
      color: '#2196F3',
      options: [
        {
          id: 'gestion_emails',
          title: 'Gestión de Emails',
          description: 'Configurar plantillas de email',
          route: '/admin/gestion-emails',
        },
        {
          id: 'probar_emails',
          title: 'Probar Emails',
          description: 'Enviar emails de prueba',
          route: '/admin/probar-emails',
        },
      ],
    },
    {
      id: 'legal',
      title: 'Contenido Legal y Navegación',
      icon: 'doc.text.fill',
      androidIcon: 'description',
      color: '#9E9E9E',
      options: [
        {
          id: 'contenido_legal',
          title: 'Contenido Legal',
          description: 'Gestionar términos y privacidad',
          route: '/admin/contenido-legal',
        },
        {
          id: 'navegacion',
          title: 'Navegación de Páginas',
          description: 'Ver todas las páginas de la app',
          route: '/admin/navegacion-paginas',
        },
      ],
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
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Panel de Administración</Text>
        <Text style={styles.headerSubtitle}>Gestiona tu aplicación de forma organizada</Text>
      </LinearGradient>

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
              color="#F59E0B"
            />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Stripe no configurado</Text>
              <Text style={styles.alertText}>
                Usa el Asistente de Stripe para configurar los pagos en minutos
              </Text>
            </View>
          </View>
        )}

        {adminSections.map((section) => (
          <View key={section.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: section.color + '20' }]}>
                <IconSymbol
                  ios_icon_name={section.icon}
                  android_material_icon_name={section.androidIcon}
                  size={24}
                  color={section.color}
                />
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>

            <View style={styles.optionsGrid}>
              {section.options.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={styles.optionCard}
                  onPress={() => router.push(option.route as any)}
                  activeOpacity={0.7}
                >
                  {option.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{option.badge}</Text>
                    </View>
                  )}
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                  <View style={styles.optionArrow}>
                    <IconSymbol
                      ios_icon_name="chevron.right"
                      android_material_icon_name="chevron_right"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
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
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.headerText,
    opacity: 0.9,
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
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#F59E0B',
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
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  optionsGrid: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    paddingRight: 80,
  },
  optionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  optionArrow: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -8,
  },
});
