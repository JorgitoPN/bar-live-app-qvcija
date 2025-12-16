
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const adminSections = [
    {
      title: 'Gestión de Contenido',
      items: [
        {
          icon: 'building.2.fill',
          androidIcon: 'store',
          label: 'Gestionar Locales',
          route: '/admin/gestionar-locales',
          color: '#14B8A6',
        },
        {
          icon: 'doc.text.fill',
          androidIcon: 'description',
          label: 'Solicitudes de Locales',
          route: '/admin/gestionar-solicitudes',
          color: '#F59E0B',
        },
        {
          icon: 'calendar',
          androidIcon: 'event',
          label: 'Gestionar Eventos',
          route: '/admin/gestionar-eventos',
          color: '#8B5CF6',
        },
        {
          icon: 'person.2.fill',
          androidIcon: 'people',
          label: 'Gestionar Usuarios',
          route: '/admin/gestionar-usuarios',
          color: '#F59E0B',
        },
        {
          icon: 'creditcard.fill',
          androidIcon: 'payment',
          label: 'Gestionar Planes de Pago',
          route: '/admin/gestionar-planes',
          color: '#10B981',
          badge: 'NUEVO',
        },
      ],
    },
    {
      title: 'Configuración del Sistema',
      items: [
        {
          icon: 'envelope.fill',
          androidIcon: 'email',
          label: 'Gestión de Emails',
          route: '/admin/gestion-emails',
          color: '#EF4444',
        },
        {
          icon: 'gear',
          androidIcon: 'settings',
          label: 'Configuración General',
          route: '/admin/configuracion-general',
          color: '#6B7280',
        },
      ],
    },
    {
      title: 'Herramientas',
      items: [
        {
          icon: 'arrow.down.doc.fill',
          androidIcon: 'download',
          label: 'Importación Masiva',
          route: '/admin/importacion-masiva',
          color: '#3B82F6',
        },
        {
          icon: 'map.fill',
          androidIcon: 'map',
          label: 'Importación OSM',
          route: '/admin/importacion-osm',
          color: '#06B6D4',
        },
        {
          icon: 'photo.fill',
          androidIcon: 'photo_library',
          label: 'Migrar Fotos a Supabase',
          route: '/admin/migrar-fotos-supabase',
          color: '#EC4899',
        },
        {
          icon: 'arrow.triangle.2.circlepath',
          androidIcon: 'sync',
          label: 'Sincronización',
          route: '/admin/sincronizacion',
          color: '#8B5CF6',
        },
      ],
    },
    {
      title: 'Análisis y Reportes',
      items: [
        {
          icon: 'chart.bar.fill',
          androidIcon: 'bar_chart',
          label: 'Visión Finanzas',
          route: '/admin/vision-finanzas',
          color: '#10B981',
        },
        {
          icon: 'dollarsign.circle.fill',
          androidIcon: 'attach_money',
          label: 'Control de Costes API',
          route: '/admin/control-costes-api',
          color: '#F59E0B',
        },
      ],
    },
    {
      title: 'Otros',
      items: [
        {
          icon: 'doc.text.fill',
          androidIcon: 'description',
          label: 'Contenido Legal',
          route: '/admin/contenido-legal',
          color: '#6B7280',
        },
        {
          icon: 'tray.full.fill',
          androidIcon: 'inventory',
          label: 'Datos Maestros',
          route: '/admin/datos-maestros',
          color: '#8B5CF6',
        },
        {
          icon: 'archivebox.fill',
          androidIcon: 'archive',
          label: 'Backups',
          route: '/admin/backups',
          color: '#EF4444',
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Panel de Administración</Text>
        <Text style={styles.headerSubtitle}>Gestiona tu aplicación</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {adminSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={styles.adminCard}
                  onPress={() => router.push(item.route as any)}
                >
                  <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                    <IconSymbol
                      ios_icon_name={item.icon}
                      android_material_icon_name={item.androidIcon}
                      size={24}
                      color={item.color}
                    />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardLabel}>{item.label}</Text>
                    {item.badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    )}
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
  header: {
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  sectionContent: {
    gap: 12,
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
});
