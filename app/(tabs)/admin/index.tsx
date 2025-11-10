
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { isSupabaseConfigured } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface MenuItem {
  icon: string;
  title: string;
  description: string;
  route: string;
  badge?: string;
  badgeColor?: string;
  requiresSupabase?: boolean;
}

export default function AdminScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const supabaseConfigured = isSupabaseConfigured();

  // Check if user has admin access
  useEffect(() => {
    if (user && user.rol_app !== 'admin') {
      console.log('[AdminScreen] Non-admin user detected, redirecting...');
      Alert.alert(
        'Acceso Denegado',
        'Solo los administradores pueden acceder a esta sección.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/explorar') }]
      );
    }
  }, [user, router]);

  // If not admin, don't render anything (will redirect)
  if (!user || user.rol_app !== 'admin') {
    return null;
  }

  const handleMenuPress = (item: MenuItem) => {
    if (item.requiresSupabase && !supabaseConfigured) {
      Alert.alert(
        'Configuración Requerida',
        'Esta funcionalidad requiere que Supabase esté configurado. ¿Deseas ver las instrucciones de configuración?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Ver Instrucciones',
            onPress: () => router.push('/admin/configuracion-supabase' as any),
          },
        ]
      );
      return;
    }
    router.push(item.route as any);
  };

  const navegacionSection: MenuItem[] = [
    {
      icon: 'map.fill',
      title: 'Navegación de Páginas',
      description: 'Ver todas las páginas de BarLive',
      route: '/admin/navegacion-paginas',
    },
  ];

  const datosSection: MenuItem[] = [
    {
      icon: 'square.grid.2x2',
      title: 'Gestión de Datos Maestros',
      description: 'Configurar categorías, provincias y tipos',
      route: '/admin/datos-maestros',
      requiresSupabase: true,
    },
    {
      icon: 'arrow.down.doc',
      title: 'Importación Masiva',
      description: 'Importar desde múltiples fuentes',
      route: '/admin/importacion-masiva',
      requiresSupabase: true,
    },
    {
      icon: 'map',
      title: 'Importación OSM',
      description: 'Importar locales desde OpenStreetMap',
      route: '/admin/importacion-osm',
      requiresSupabase: true,
    },
    {
      icon: 'arrow.triangle.2.circlepath',
      title: 'Sincronización Continua',
      description: 'Actualizar datos automáticamente',
      route: '/admin/sincronizacion',
      requiresSupabase: true,
    },
    {
      icon: 'star.fill',
      title: 'Enriquecimiento de Datos',
      description: 'Enriquecer locales con Google Places',
      route: '/admin/enriquecimiento-google',
      requiresSupabase: true,
    },
  ];

  const gestionSection: MenuItem[] = [
    {
      icon: 'person.2.fill',
      title: 'Gestionar Usuarios',
      description: 'Ver y administrar usuarios del sistema',
      route: '/admin/gestionar-usuarios',
      requiresSupabase: true,
    },
    {
      icon: 'building.2',
      title: 'Gestionar Locales',
      description: 'Ver y administrar locales registrados',
      route: '/admin/gestionar-locales',
      requiresSupabase: true,
    },
  ];

  const finanzasSection: MenuItem[] = [
    {
      icon: 'chart.bar.fill',
      title: 'Visión General de Finanzas',
      description: 'Ingresos, gastos y beneficios',
      route: '/admin/vision-finanzas',
      requiresSupabase: true,
    },
    {
      icon: 'dollarsign.circle',
      title: 'Control de APIs y Costes',
      description: 'Monitorear y gestionar uso de APIs',
      route: '/admin/control-costes-api',
      requiresSupabase: true,
    },
  ];

  const configuracionSection: MenuItem[] = [
    {
      icon: 'server.rack',
      title: 'Configuración Supabase',
      description: supabaseConfigured ? 'Supabase configurado ✓' : 'Configurar backend',
      route: '/admin/configuracion-supabase',
      badge: supabaseConfigured ? '✓' : '!',
      badgeColor: supabaseConfigured ? '#10B981' : '#F59E0B',
    },
    {
      icon: 'gearshape.fill',
      title: 'Configuración General',
      description: 'Ajustes del sistema y aplicación',
      route: '/admin/configuracion-general',
    },
    {
      icon: 'externaldrive.fill',
      title: 'Gestión de Backups',
      description: 'Crear y restaurar copias de seguridad',
      route: '/admin/backups',
      requiresSupabase: true,
    },
  ];

  const contenidoSection: MenuItem[] = [
    {
      icon: 'doc.text',
      title: 'Contenido Legal',
      description: 'Términos, privacidad y políticas',
      route: '/admin/contenido-legal',
    },
    {
      icon: 'envelope.fill',
      title: 'Gestión de Emails',
      description: 'Plantillas y configuración de correos',
      route: '/admin/gestion-emails',
    },
    {
      icon: 'paperplane.fill',
      title: 'Probar Emails',
      description: 'Enviar emails de prueba',
      route: '/admin/probar-emails',
    },
  ];

  const renderSection = (title: string, items: MenuItem[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.menuCard}
          onPress={() => handleMenuPress(item)}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.primary }]}>
            <IconSymbol name={item.icon as any} size={24} color="white" />
          </View>
          <View style={styles.menuContent}>
            <View style={styles.menuTitleRow}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              {item.requiresSupabase && !supabaseConfigured && (
                <View style={styles.requiresBadge}>
                  <Text style={styles.requiresText}>Requiere Config</Text>
                </View>
              )}
            </View>
            <Text style={styles.menuDescription}>{item.description}</Text>
          </View>
          {item.badge && (
            <View style={[styles.badge, { backgroundColor: item.badgeColor }]}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          )}
          <IconSymbol
            name="chevron.right"
            size={20}
            color={colors.textSecondary}
            style={styles.menuChevron}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <Text style={styles.headerTitle}>Panel Admin</Text>
        <Text style={styles.headerSubtitle}>
          Gestión completa y administración de BarLive
        </Text>
      </LinearGradient>

      {!supabaseConfigured && (
        <TouchableOpacity
          style={styles.warningBanner}
          onPress={() => router.push('/admin/configuracion-supabase' as any)}
        >
          <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#F59E0B" />
          <Text style={styles.warningText}>
            Supabase no configurado. Toca para configurar.
          </Text>
          <IconSymbol name="chevron.right" size={16} color="#F59E0B" />
        </TouchableOpacity>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderSection('🗺️ Navegación', navegacionSection)}
        {renderSection('📊 Gestión de Datos', datosSection)}
        {renderSection('👥 Usuarios y Locales', gestionSection)}
        {renderSection('💰 Finanzas y Monetización', finanzasSection)}
        {renderSection('⚙️ Configuración y Mantenimiento', configuracionSection)}
        {renderSection('📄 Contenido y Comunicación', contenidoSection)}
        
        <View style={{ height: 40 }} />
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
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  menuCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    ...commonStyles.shadow,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuContent: {
    flex: 1,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  requiresBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiresText: {
    fontSize: 9,
    color: '#92400E',
    fontWeight: '600',
  },
  menuDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  menuChevron: {
    marginLeft: 10,
  },
});
