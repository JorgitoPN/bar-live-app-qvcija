
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { supabase } from '@/utils/supabase';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

interface AdminStats {
  totalUsuarios: number;
  totalLocales: number;
  totalEventos: number;
  totalPosts: number;
  usuariosActivos: number;
  localesActivos: number;
  suscripcionesActivas: number;
}

// ✅ CRITICAL: Only this email can access admin panel
const ADMIN_EMAIL = 'jorgepereznoyagh@gmail.com';

/**
 * Verifies if the current user has admin access
 * Returns true only if user has admin role AND is the authorized email
 */
function hasAdminAccess(user: any): boolean {
  if (!user) return false;
  const isAdmin = user.rol_app === 'admin';
  const isAuthorizedEmail = user.email === ADMIN_EMAIL;
  return isAdmin && isAuthorizedEmail;
}

/**
 * ✅ ADMIN INDEX SCREEN v141.0 - ANDROID SCALING COMPLETE
 * 
 * CRITICAL FIXES v141.0 (ANDROID ONLY):
 * - ✅ All font sizes use scaleFontSize() for consistency
 * - ✅ All icon sizes use scaleIconSize() for proper proportions
 * - ✅ Header title size standardized (28px on Android)
 * - ✅ All text elements properly scaled
 * - ✅ iOS design remains unchanged
 */

export default function AdminIndexScreen() {
  const router = useRouter();
  const { user, loading: authLoading, ensureValidSession } = useAuth();
  const { isImpersonating, impersonationSession, endImpersonation } = useImpersonation();
  const [stats, setStats] = useState<AdminStats>({
    totalUsuarios: 0,
    totalLocales: 0,
    totalEventos: 0,
    totalPosts: 0,
    usuariosActivos: 0,
    localesActivos: 0,
    suscripcionesActivas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [permissionChecked, setPermissionChecked] = useState(false);

  // ✅ FIXED: Strict admin permission check with email verification
  useEffect(() => {
    const checkPermissions = async () => {
      console.log('[AdminIndex v141.0] 🔍 Checking admin permissions...');
      
      // Wait for auth to finish loading
      if (authLoading) {
        console.log('[AdminIndex v141.0] ⏳ Waiting for auth to load...');
        return;
      }

      // If no user, silently redirect
      if (!user) {
        console.log('[AdminIndex v141.0] ❌ No user found, redirecting silently');
        router.replace('/(tabs)/explorar' as any);
        return;
      }

      // ✅ CRITICAL FIX: Check BOTH role AND email address
      const isAdmin = user.rol_app === 'admin';
      const isAuthorizedEmail = user.email === ADMIN_EMAIL;

      console.log('[AdminIndex v141.0] 📋 Permission check:', {
        email: user.email,
        role: user.rol_app,
        isAdmin,
        isAuthorizedEmail,
        hasAccess: isAdmin && isAuthorizedEmail,
      });

      // User must have admin role AND be the authorized email
      if (!isAdmin || !isAuthorizedEmail) {
        console.log('[AdminIndex v141.0] ❌ Access denied - redirecting silently');
        router.replace('/(tabs)/explorar' as any);
        return;
      }

      console.log('[AdminIndex v141.0] ✅ Admin permissions verified for:', user.email);
      setPermissionChecked(true);
      cargarEstadisticas();
    };

    checkPermissions();
  }, [user, authLoading, router, ensureValidSession]);

  const cargarEstadisticas = async () => {
    try {
      setLoading(true);

      const [
        { count: totalUsuarios },
        { count: totalLocales },
        { count: totalEventos },
        { count: totalPosts },
        { count: usuariosActivos },
        { count: localesActivos },
        { count: suscripcionesActivas },
      ] = await Promise.all([
        supabase.from('usuarios').select('*', { count: 'exact', head: true }),
        supabase.from('locales').select('*', { count: 'exact', head: true }),
        supabase.from('eventos').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('locales').select('*', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('suscripciones_locales').select('*', { count: 'exact', head: true }).eq('estado', 'activa'),
      ]);

      setStats({
        totalUsuarios: totalUsuarios || 0,
        totalLocales: totalLocales || 0,
        totalEventos: totalEventos || 0,
        totalPosts: totalPosts || 0,
        usuariosActivos: usuariosActivos || 0,
        localesActivos: localesActivos || 0,
        suscripcionesActivas: suscripcionesActivas || 0,
      });
    } catch (error) {
      console.error('[AdminIndex v141.0] Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEndImpersonation = async () => {
    Alert.alert(
      'Finalizar Impersonación',
      '¿Estás seguro de que quieres finalizar la impersonación y volver a tu cuenta de administrador?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          style: 'destructive',
          onPress: async () => {
            try {
              await endImpersonation();
              Alert.alert('✅ Éxito', 'Impersonación finalizada. Has vuelto a tu cuenta de administrador.');
              router.replace('/(tabs)/admin' as any);
            } catch (error) {
              console.error('[AdminIndex v141.0] Error finalizando impersonación:', error);
              Alert.alert('Error', 'No se pudo finalizar la impersonación');
            }
          },
        },
      ]
    );
  };

  const adminSections = [
    {
      title: 'Gestión de Usuarios',
      icon: 'person.3.fill' as const,
      androidIcon: 'people' as const,
      color: '#3B82F6',
      route: '/admin/gestionar-usuarios',
      description: 'Administra usuarios, roles y permisos',
    },
    {
      title: 'Gestión de Locales',
      icon: 'building.2.fill' as const,
      androidIcon: 'store' as const,
      color: '#10B981',
      route: '/admin/gestionar-locales-v7',
      description: 'Gestiona locales, propietarios y estados',
    },
    {
      title: 'Asignar Local a Usuario',
      icon: 'person.badge.key.fill' as const,
      androidIcon: 'admin_panel_settings' as const,
      color: '#8B5CF6',
      route: '/admin/asignar-local-usuario',
      description: 'Asigna locales a usuarios con roles específicos',
    },
    {
      title: 'Solicitudes de Propietario',
      icon: 'person.badge.plus.fill' as const,
      androidIcon: 'person_add' as const,
      color: '#EC4899',
      route: '/admin/solicitudes-propietario',
      description: 'Gestiona solicitudes de usuarios para ser propietarios',
    },
    {
      title: 'Gestión de Planes',
      icon: 'star.fill' as const,
      androidIcon: 'star' as const,
      color: '#F59E0B',
      route: '/admin/gestionar-planes-v7',
      description: 'Administra planes y suscripciones',
    },
    {
      title: 'Configurar Stripe',
      icon: 'creditcard.and.123' as const,
      androidIcon: 'credit_card' as const,
      color: '#6366F1',
      route: '/admin/gestionar-pagos-stripe',
      description: 'Configura Stripe para pagos',
    },
    {
      title: 'Gestión de Eventos',
      icon: 'calendar.badge.plus' as const,
      androidIcon: 'event' as const,
      color: '#8B5CF6',
      route: '/admin/gestionar-eventos',
      description: 'Administra eventos y promociones',
    },
    {
      title: 'Locales Destacados',
      icon: 'star.circle.fill' as const,
      androidIcon: 'stars' as const,
      color: '#F59E0B',
      route: '/admin/gestionar-locales-destacados',
      description: 'Gestiona locales destacados manualmente',
    },
    {
      title: 'Términos Legales',
      icon: 'doc.text.fill' as const,
      androidIcon: 'description' as const,
      color: '#3B82F6',
      route: '/admin/gestion-terminos-legales',
      description: 'Gestiona términos y políticas legales',
    },
    {
      title: 'Soporte y Ayuda',
      icon: 'lifepreserver.fill' as const,
      androidIcon: 'support_agent' as const,
      color: '#10B981',
      route: '/admin/soporte-ayuda',
      description: 'Gestiona solicitudes y reportes de usuarios',
    },
    {
      title: 'Gestionar Reportes',
      icon: 'flag.fill' as const,
      androidIcon: 'flag' as const,
      color: '#EF4444',
      route: '/admin/gestionar-reportes',
      description: 'Revisa y gestiona reportes de contenido',
    },
    {
      title: 'Análisis de Ingresos',
      icon: 'chart.line.uptrend.xyaxis' as const,
      androidIcon: 'trending_up' as const,
      color: '#8B5CF6',
      route: '/admin/analisis-ingresos',
      description: 'Análisis de ingresos en tiempo real',
    },
    {
      title: 'Importar Locales',
      icon: 'square.and.arrow.down.fill' as const,
      androidIcon: 'download' as const,
      color: '#06B6D4',
      route: '/admin/importacion-masiva',
      description: 'Importación masiva de locales',
    },
    {
      title: 'Enriquecer con Google',
      icon: 'sparkles' as const,
      androidIcon: 'auto_awesome' as const,
      color: '#EC4899',
      route: '/admin/enriquecimiento-google',
      description: 'Enriquece datos con Google Places',
    },
    {
      title: 'Limpieza OSM Enriquecidos',
      icon: 'trash.circle.fill' as const,
      androidIcon: 'delete_sweep' as const,
      color: '#DC2626',
      route: '/admin/limpieza-osm-enriquecidos',
      description: 'Elimina locales OSM ya enriquecidos para liberar espacio',
    },
    {
      title: 'Sistema de Limpieza',
      icon: 'trash.circle.fill' as const,
      androidIcon: 'cleaning_services' as const,
      color: '#EF4444',
      route: '/admin/sistema-limpieza-automatica',
      description: 'Sistema automático de limpieza de duplicados e inválidos',
    },
    {
      title: 'Gestionar Duplicados',
      icon: 'doc.on.doc.fill' as const,
      androidIcon: 'content_copy' as const,
      color: '#F59E0B',
      route: '/admin/gestionar-duplicados',
      description: 'Encuentra y elimina locales duplicados',
    },
    {
      title: 'Locales Inválidos',
      icon: 'exclamationmark.triangle.fill' as const,
      androidIcon: 'warning' as const,
      color: '#EF4444',
      route: '/admin/revisar-locales-invalidos',
      description: 'Revisar y excluir locales inválidos',
    },
    {
      title: 'Locales Excluidos',
      icon: 'xmark.shield.fill' as const,
      androidIcon: 'block' as const,
      color: '#6B7280',
      route: '/admin/locales-excluidos',
      description: 'Ver y gestionar locales excluidos del sistema',
    },
    {
      title: 'Locales Rechazados',
      icon: 'trash.slash.fill' as const,
      androidIcon: 'delete_sweep' as const,
      color: '#DC2626',
      route: '/admin/locales-rechazados',
      description: 'Gestionar locales rechazados en enriquecimiento',
    },
    {
      title: 'Facturación',
      icon: 'eurosign.circle.fill' as const,
      androidIcon: 'euro' as const,
      color: '#EF4444',
      route: '/admin/facturacion',
      description: 'Gestiona pagos y facturas',
    },
    {
      title: 'Backups',
      icon: 'externaldrive.fill' as const,
      androidIcon: 'backup' as const,
      color: '#6366F1',
      route: '/admin/backups',
      description: 'Copias de seguridad y restauración',
    },
    {
      title: 'Corregir Avatares',
      icon: 'person.crop.circle.badge.xmark' as const,
      androidIcon: 'account_circle' as const,
      color: '#EF4444',
      route: '/admin/fix-avatar-urls',
      description: 'Corrige avatares con URLs locales inválidas',
    },
  ];

  // Show loading while checking permissions
  if (authLoading || !permissionChecked) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { fontSize: scaleFontSize(16) }]}>Verificando permisos...</Text>
      </View>
    );
  }

  // Show loading while fetching stats
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { fontSize: scaleFontSize(16) }]}>Cargando panel de administración...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { fontSize: scaleFontSize(Platform.OS === 'android' ? 24 : 28) }]}>Panel de Administración</Text>
          <Text style={[styles.headerSubtitle, { fontSize: scaleFontSize(15) }]}>Bienvenido, {user?.nombre}</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={cargarEstadisticas}>
          <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={scaleIconSize(24)} color={colors.headerText} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Active Impersonation Banner */}
        {isImpersonating && impersonationSession && (
          <View style={styles.impersonationBannerV7}>
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              style={styles.impersonationBannerGradient}
            >
              <View style={styles.impersonationBannerContent}>
                <View style={styles.impersonationBannerIcon}>
                  <IconSymbol ios_icon_name="person.crop.circle.badge.checkmark" android_material_icon_name="supervised_user_circle" size={scaleIconSize(32)} color={colors.white} />
                </View>
                <View style={styles.impersonationBannerText}>
                  <Text style={[styles.impersonationBannerTitle, { fontSize: scaleFontSize(18) }]}>
                    Impersonando a {impersonationSession.impersonated_user_name}
                  </Text>
                  <Text style={[styles.impersonationBannerSubtitle, { fontSize: scaleFontSize(14) }]}>
                    Toda la app (BarLive + Red Social) se muestra como este usuario
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.impersonationBannerButton}
                onPress={handleEndImpersonation}
              >
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={scaleIconSize(20)} color="#8B5CF6" />
                <Text style={[styles.impersonationBannerButtonText, { fontSize: scaleFontSize(15) }]}>Finalizar</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.statCardGradient}>
              <IconSymbol ios_icon_name="person.3.fill" android_material_icon_name="people" size={scaleIconSize(32)} color={colors.white} />
              <Text style={[styles.statNumber, { fontSize: scaleFontSize(36) }]}>{stats.totalUsuarios}</Text>
              <Text style={[styles.statLabel, { fontSize: scaleFontSize(14) }]}>Usuarios</Text>
              <Text style={[styles.statSubLabel, { fontSize: scaleFontSize(12) }]}>{stats.usuariosActivos} activos</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCard}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.statCardGradient}>
              <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={scaleIconSize(32)} color={colors.white} />
              <Text style={[styles.statNumber, { fontSize: scaleFontSize(36) }]}>{stats.totalLocales}</Text>
              <Text style={[styles.statLabel, { fontSize: scaleFontSize(14) }]}>Locales</Text>
              <Text style={[styles.statSubLabel, { fontSize: scaleFontSize(12) }]}>{stats.localesActivos} activos</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCard}>
            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.statCardGradient}>
              <IconSymbol ios_icon_name="calendar.badge.plus" android_material_icon_name="event" size={scaleIconSize(32)} color={colors.white} />
              <Text style={[styles.statNumber, { fontSize: scaleFontSize(36) }]}>{stats.totalEventos}</Text>
              <Text style={[styles.statLabel, { fontSize: scaleFontSize(14) }]}>Eventos</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCard}>
            <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.statCardGradient}>
              <IconSymbol ios_icon_name="photo.stack.fill" android_material_icon_name="collections" size={scaleIconSize(32)} color={colors.white} />
              <Text style={[styles.statNumber, { fontSize: scaleFontSize(36) }]}>{stats.totalPosts}</Text>
              <Text style={[styles.statLabel, { fontSize: scaleFontSize(14) }]}>Posts</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCard}>
            <LinearGradient colors={['#EC4899', '#DB2777']} style={styles.statCardGradient}>
              <IconSymbol ios_icon_name="creditcard.fill" android_material_icon_name="payment" size={scaleIconSize(32)} color={colors.white} />
              <Text style={[styles.statNumber, { fontSize: scaleFontSize(36) }]}>{stats.suscripcionesActivas}</Text>
              <Text style={[styles.statLabel, { fontSize: scaleFontSize(14) }]}>Suscripciones</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Admin Sections */}
        <View style={styles.sectionsContainer}>
          {adminSections.map((section, index) => (
            <TouchableOpacity
              key={index}
              style={styles.sectionCard}
              onPress={() => router.push(section.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.sectionIconContainer, { backgroundColor: section.color + '15' }]}>
                <IconSymbol ios_icon_name={section.icon} android_material_icon_name={section.androidIcon} size={scaleIconSize(32)} color={section.color} />
              </View>
              <View style={styles.sectionContent}>
                <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(17) }]}>{section.title}</Text>
                <Text style={[styles.sectionDescription, { fontSize: scaleFontSize(14) }]}>{section.description}</Text>
              </View>
              <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={scaleIconSize(24)} color={colors.textSecondary} />
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    marginTop: 16,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 44 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 4,
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  impersonationBannerV7: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    ...commonStyles.shadow,
  },
  impersonationBannerGradient: {
    padding: 20,
  },
  impersonationBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  impersonationBannerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  impersonationBannerText: {
    flex: 1,
  },
  impersonationBannerTitle: {
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  impersonationBannerSubtitle: {
    color: colors.white,
    opacity: 0.9,
    lineHeight: 20,
  },
  impersonationBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  impersonationBannerButtonText: {
    fontWeight: '700',
    color: '#8B5CF6',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 16,
    overflow: 'hidden',
    ...commonStyles.shadow,
  },
  statCardGradient: {
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: 'bold',
    color: colors.white,
    marginTop: 12,
  },
  statLabel: {
    color: colors.white,
    opacity: 0.9,
    marginTop: 6,
  },
  statSubLabel: {
    color: colors.white,
    opacity: 0.8,
    marginTop: 2,
  },
  sectionsContainer: {
    gap: 12,
  },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...commonStyles.shadow,
  },
  sectionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  sectionDescription: {
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
