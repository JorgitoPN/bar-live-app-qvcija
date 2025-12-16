
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
    // PAGOS Y SUSCRIPCIONES
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
      id: 'finanzas',
      title: 'Visión Financiera',
      description: 'Análisis de ingresos y métricas',
      icon: 'chart.bar.fill',
      androidIcon: 'bar_chart',
      route: '/admin/vision-finanzas',
      color: '#00BCD4',
    },
    
    // GESTIÓN DE CONTENIDO
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
    
    // IMPORTACIÓN Y ENRIQUECIMIENTO
    {
      id: 'importacion_masiva',
      title: 'Importación Masiva',
      description: 'Importar locales desde múltiples fuentes',
      icon: 'arrow.down.doc.fill',
      androidIcon: 'download',
      route: '/admin/importacion-masiva',
      color: '#00BCD4',
    },
    {
      id: 'importacion_osm',
      title: 'Importación OSM',
      description: 'Importar desde OpenStreetMap',
      icon: 'map.fill',
      androidIcon: 'map',
      route: '/admin/importacion-osm',
      color: '#4CAF50',
    },
    {
      id: 'enriquecimiento',
      title: 'Enriquecimiento Google',
      description: 'Enriquecer con datos de Google Places',
      icon: 'sparkles',
      androidIcon: 'auto_awesome',
      route: '/admin/enriquecimiento-google',
      color: '#FF9800',
    },
    {
      id: 'recategorizar',
      title: 'Recategorizar Locales',
      description: 'Actualizar categorías de locales',
      icon: 'tag.fill',
      androidIcon: 'label',
      route: '/admin/recategorizar-locales',
      color: '#9C27B0',
    },
    {
      id: 'sincronizacion',
      title: 'Sincronización',
      description: 'Sincronizar datos con fuentes externas',
      icon: 'arrow.triangle.2.circlepath',
      androidIcon: 'sync',
      route: '/admin/sincronizacion',
      color: '#2196F3',
    },
    {
      id: 'migrar_fotos',
      title: 'Migrar Fotos a Supabase',
      description: 'Migrar fotos a Supabase Storage',
      icon: 'photo.fill',
      androidIcon: 'photo_library',
      route: '/admin/migrar-fotos-supabase',
      color: '#E91E63',
    },
    
    // CONFIGURACIÓN Y HERRAMIENTAS
    {
      id: 'configuracion',
      title: 'Configuración General',
      description: 'Ajustes generales de la aplicación',
      icon: 'gearshape.fill',
      androidIcon: 'settings',
      route: '/admin/configuracion-general',
      color: '#607D8B',
    },
    {
      id: 'configuracion_supabase',
      title: 'Configuración Supabase',
      description: 'Configurar conexión con Supabase',
      icon: 'server.rack',
      androidIcon: 'dns',
      route: '/admin/configuracion-supabase',
      color: '#3ECF8E',
    },
    {
      id: 'datos_maestros',
      title: 'Datos Maestros',
      description: 'Gestionar categorías y datos base',
      icon: 'list.bullet.rectangle',
      androidIcon: 'list',
      route: '/admin/datos-maestros',
      color: '#795548',
    },
    {
      id: 'backups',
      title: 'Backups',
      description: 'Gestionar copias de seguridad',
      icon: 'externaldrive.fill',
      androidIcon: 'backup',
      route: '/admin/backups',
      color: '#607D8B',
    },
    {
      id: 'control_costes',
      title: 'Control de Costes API',
      description: 'Monitorear uso y costes de APIs',
      icon: 'dollarsign.circle.fill',
      androidIcon: 'attach_money',
      route: '/admin/control-costes-api',
      color: '#4CAF50',
    },
    
    // EMAILS Y COMUNICACIÓN
    {
      id: 'gestion_emails',
      title: 'Gestión de Emails',
      description: 'Configurar plantillas de email',
      icon: 'envelope.badge.fill',
      androidIcon: 'email',
      route: '/admin/gestion-emails',
      color: '#2196F3',
    },
    {
      id: 'diagnostico_emails',
      title: 'Diagnóstico de Emails',
      description: 'Diagnosticar problemas de envío',
      icon: 'stethoscope',
      androidIcon: 'bug_report',
      route: '/admin/diagnostico-emails',
      color: '#F44336',
    },
    {
      id: 'probar_emails',
      title: 'Probar Emails',
      description: 'Enviar emails de prueba',
      icon: 'paperplane.fill',
      androidIcon: 'send',
      route: '/admin/probar-emails',
      color: '#00BCD4',
    },
    
    // CONTENIDO LEGAL
    {
      id: 'contenido_legal',
      title: 'Contenido Legal',
      description: 'Gestionar términos y privacidad',
      icon: 'doc.text.fill',
      androidIcon: 'description',
      route: '/admin/contenido-legal',
      color: '#9E9E9E',
    },
    
    // NAVEGACIÓN Y PÁGINAS
    {
      id: 'navegacion',
      title: 'Navegación de Páginas',
      description: 'Ver todas las páginas de la app',
      icon: 'map',
      androidIcon: 'explore',
      route: '/admin/navegacion-paginas',
      color: '#673AB7',
    },
    {
      id: 'ver_ficha',
      title: 'Ver Ficha Local',
      description: 'Vista previa de fichas de locales',
      icon: 'eye.fill',
      androidIcon: 'visibility',
      route: '/admin/ver-ficha',
      color: '#FF5722',
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
