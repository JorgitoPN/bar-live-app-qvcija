
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

interface MiLocal {
  id: string;
  nombre: string;
  tipo: string;
  direccion: string;
  provincia: string;
  imagen_url: string | null;
  estado_solicitud: 'pendiente' | 'en_revision' | 'aprobado' | 'denegado';
  fecha_solicitud: string;
  fecha_revision: string | null;
  motivo_denegacion: string | null;
  comentarios_admin: string | null;
  activo: boolean;
  propietario_id: string | null;
}

interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
}

/**
 * ✅ MIS LOCALES SCREEN v2.0 - IMPROVED CARD DESIGN
 * 
 * NEW FEATURES:
 * - ✅ Better visual hierarchy with cover images
 * - ✅ Clear status indicators with icons
 * - ✅ Improved action buttons layout
 * - ✅ Better spacing and typography
 * - ✅ More intuitive information organization
 */

export default function MisLocalesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locales, setLocales] = useState<MiLocal[]>([]);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

  const cargarDatos = useCallback(async () => {
    if (!user) return;

    try {
      console.log('[MisLocales v2.0] 🔄 Loading locales for user:', user.id);

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('propietarios_locales')
        .select(`
          id,
          local_id,
          rol,
          activo,
          fecha_asignacion,
          locales!propietarios_locales_local_id_fkey(
            id,
            nombre,
            tipo,
            direccion,
            provincia,
            imagen_url,
            estado_solicitud,
            fecha_solicitud,
            fecha_revision,
            motivo_denegacion,
            comentarios_admin,
            activo,
            propietario_id
          )
        `)
        .eq('propietario_id', user.id)
        .eq('activo', true)
        .order('fecha_asignacion', { ascending: false });

      if (assignmentsError) {
        console.error('[MisLocales v2.0] ❌ Error loading assignments:', assignmentsError);
        throw assignmentsError;
      }

      const localesData = assignmentsData
        ?.map(assignment => assignment.locales)
        .filter(Boolean) || [];

      console.log('[MisLocales v2.0] ✅ Loaded', localesData.length, 'locales from assignments');

      const { data: directLocalesData, error: directLocalesError } = await supabase
        .from('locales')
        .select('*')
        .eq('propietario_id', user.id)
        .order('fecha_solicitud', { ascending: false });

      if (!directLocalesError && directLocalesData) {
        console.log('[MisLocales v2.0] ✅ Loaded', directLocalesData.length, 'locales from direct ownership');
        
        const allLocalesMap = new Map<string, MiLocal>();
        
        localesData.forEach(local => {
          if (local) {
            allLocalesMap.set(local.id, local);
          }
        });
        
        directLocalesData.forEach(local => {
          if (!allLocalesMap.has(local.id)) {
            allLocalesMap.set(local.id, local);
          }
        });
        
        const mergedLocales = Array.from(allLocalesMap.values());
        console.log('[MisLocales v2.0] ✅ Total unique locales:', mergedLocales.length);
        setLocales(mergedLocales);
      } else {
        setLocales(localesData);
      }

      const { data: notificacionesData, error: notificacionesError } = await supabase
        .from('notificaciones_locales')
        .select('*')
        .eq('propietario_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (notificacionesError) {
        console.error('[MisLocales v2.0] ⚠️ Error loading notifications:', notificacionesError);
      } else {
        setNotificaciones(notificacionesData || []);
        console.log('[MisLocales v2.0] ✅ Loaded', notificacionesData?.length || 0, 'notifications');
      }
    } catch (error) {
      console.error('[MisLocales v2.0] ❌ Error:', error);
      Alert.alert('Error', 'No se pudieron cargar tus locales');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  const marcarNotificacionLeida = async (notificacionId: string) => {
    try {
      await supabase
        .from('notificaciones_locales')
        .update({ leida: true })
        .eq('id', notificacionId);

      setNotificaciones(prev =>
        prev.map(n => n.id === notificacionId ? { ...n, leida: true } : n)
      );
    } catch (error) {
      console.error('[MisLocales v2.0] Error marking notification as read:', error);
    }
  };

  const getEstadoConfig = (estado: string) => {
    const configs: Record<string, { color: string; bgColor: string; text: string; icon: string; androidIcon: string }> = {
      pendiente: { 
        color: '#F59E0B', 
        bgColor: '#FEF3C7',
        text: 'Pendiente de Revisión', 
        icon: 'clock.fill',
        androidIcon: 'schedule'
      },
      en_revision: { 
        color: '#3B82F6', 
        bgColor: '#DBEAFE',
        text: 'En Revisión', 
        icon: 'eye.fill',
        androidIcon: 'visibility'
      },
      aprobado: { 
        color: '#10B981', 
        bgColor: '#D1FAE5',
        text: 'Aprobado y Publicado', 
        icon: 'checkmark.circle.fill',
        androidIcon: 'check_circle'
      },
      denegado: { 
        color: '#EF4444', 
        bgColor: '#FEE2E2',
        text: 'Solicitud Denegada', 
        icon: 'xmark.circle.fill',
        androidIcon: 'cancel'
      },
    };

    return configs[estado] || configs.pendiente;
  };

  const renderLocalCard = (local: MiLocal) => {
    const estadoConfig = getEstadoConfig(local.estado_solicitud);

    return (
      <TouchableOpacity
        key={local.id}
        style={styles.card}
        onPress={() => {
          if (local.estado_solicitud === 'aprobado') {
            router.push(`/detalle/local?id=${local.id}`);
          }
        }}
        activeOpacity={local.estado_solicitud === 'aprobado' ? 0.8 : 1}
      >
        {/* ✅ NEW: Cover Image with Gradient */}
        <View style={styles.cardCoverContainer}>
          {local.imagen_url ? (
            <React.Fragment>
              <Image source={{ uri: local.imagen_url }} style={styles.cardCover} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0, 0, 0, 0.7)']}
                style={styles.cardCoverGradient}
              />
            </React.Fragment>
          ) : (
            <View style={[styles.cardCover, styles.cardCoverPlaceholder]}>
              <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={48} color="rgba(255, 255, 255, 0.4)" />
            </View>
          )}

          {/* ✅ NEW: Status Badge on Image */}
          <View style={[styles.statusBadgeOnImage, { backgroundColor: estadoConfig.color }]}>
            <IconSymbol 
              ios_icon_name={estadoConfig.icon as any}
              android_material_icon_name={estadoConfig.androidIcon}
              size={14} 
              color="#FFFFFF" 
            />
            <Text style={styles.statusBadgeOnImageText}>{estadoConfig.text}</Text>
          </View>

          {/* ✅ NEW: Local Name Overlay */}
          <View style={styles.cardCoverOverlay}>
            <Text style={styles.cardCoverLocalName} numberOfLines={1}>{local.nombre}</Text>
            <View style={styles.cardCoverMeta}>
              <IconSymbol ios_icon_name="mappin" android_material_icon_name="location_on" size={12} color="rgba(255, 255, 255, 0.9)" />
              <Text style={styles.cardCoverMetaText}>{local.tipo} • {local.provincia}</Text>
            </View>
          </View>
        </View>

        {/* ✅ NEW: Card Body with Better Hierarchy */}
        <View style={styles.cardBody}>
          {/* Status Message */}
          <View style={[styles.statusMessageContainer, { backgroundColor: estadoConfig.bgColor }]}>
            <IconSymbol 
              ios_icon_name={estadoConfig.icon as any}
              android_material_icon_name={estadoConfig.androidIcon}
              size={20} 
              color={estadoConfig.color} 
            />
            <View style={styles.statusMessageText}>
              {local.estado_solicitud === 'pendiente' && (
                <Text style={[styles.statusMessage, { color: estadoConfig.color }]}>
                  Tu solicitud está pendiente de revisión por el administrador.
                </Text>
              )}

              {local.estado_solicitud === 'en_revision' && (
                <Text style={[styles.statusMessage, { color: estadoConfig.color }]}>
                  Tu solicitud está siendo revisada por el administrador.
                </Text>
              )}

              {local.estado_solicitud === 'aprobado' && (
                <Text style={[styles.statusMessage, { color: estadoConfig.color }]}>
                  ¡Tu local ha sido aprobado y está publicado!
                </Text>
              )}

              {local.estado_solicitud === 'denegado' && (
                <Text style={[styles.statusMessage, { color: estadoConfig.color }]}>
                  Tu solicitud ha sido denegada.
                </Text>
              )}
            </View>
          </View>

          {/* Admin Comments */}
          {local.comentarios_admin && (
            <View style={styles.adminCommentsContainer}>
              <View style={styles.adminCommentsHeader}>
                <IconSymbol ios_icon_name="person.badge.shield.checkmark.fill" android_material_icon_name="admin_panel_settings" size={16} color="#3B82F6" />
                <Text style={styles.adminCommentsLabel}>Comentarios del administrador:</Text>
              </View>
              <Text style={styles.adminCommentsText}>{local.comentarios_admin}</Text>
            </View>
          )}

          {/* Denial Reason */}
          {local.motivo_denegacion && (
            <View style={[styles.adminCommentsContainer, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
              <View style={styles.adminCommentsHeader}>
                <IconSymbol ios_icon_name="exclamationmark.triangle.fill" android_material_icon_name="warning" size={16} color="#DC2626" />
                <Text style={[styles.adminCommentsLabel, { color: '#DC2626' }]}>Motivo de denegación:</Text>
              </View>
              <Text style={[styles.adminCommentsText, { color: '#DC2626' }]}>{local.motivo_denegacion}</Text>
            </View>
          )}

          {/* Metadata */}
          <View style={styles.metadataContainer}>
            <View style={styles.metadataItem}>
              <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={14} color={colors.textSecondary} />
              <Text style={styles.metadataText}>
                Solicitado: {new Date(local.fecha_solicitud).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </Text>
            </View>
            {local.fecha_revision && (
              <View style={styles.metadataItem}>
                <IconSymbol ios_icon_name="checkmark.circle" android_material_icon_name="check_circle" size={14} color={colors.textSecondary} />
                <Text style={styles.metadataText}>
                  Revisado: {new Date(local.fecha_revision).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ✅ NEW: Action Buttons with Better Design */}
        {local.estado_solicitud === 'aprobado' && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/editar/local?id=${local.id}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionButtonIcon, { backgroundColor: '#DBEAFE' }]}>
                <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={18} color="#3B82F6" />
              </View>
              <Text style={styles.actionButtonText}>Editar Local</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/detalle/local?id=${local.id}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionButtonIcon, { backgroundColor: '#D1FAE5' }]}>
                <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={18} color="#10B981" />
              </View>
              <Text style={styles.actionButtonText}>Ver Perfil</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/gestion/planes-suscripcion?localId=${local.id}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionButtonIcon, { backgroundColor: '#FEF3C7' }]}>
                <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={18} color="#F59E0B" />
              </View>
              <Text style={styles.actionButtonText}>Planes</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderNotificacion = (notificacion: Notificacion) => (
    <TouchableOpacity
      key={notificacion.id}
      style={[styles.notificationCard, !notificacion.leida && styles.notificationCardUnread]}
      onPress={() => marcarNotificacionLeida(notificacion.id)}
      activeOpacity={0.8}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.notificationTitleContainer}>
          <IconSymbol ios_icon_name="bell.fill" android_material_icon_name="notifications" size={16} color={colors.primary} />
          <Text style={styles.notificationTitle}>{notificacion.titulo}</Text>
        </View>
        {!notificacion.leida && <View style={styles.unreadDot} />}
      </View>
      <Text style={styles.notificationMessage}>{notificacion.mensaje}</Text>
      <Text style={styles.notificationDate}>
        {new Date(notificacion.created_at).toLocaleString('es-ES', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Cargando tus locales...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Locales</Text>
        <TouchableOpacity onPress={() => router.push('/crear/local')} style={styles.addButton}>
          <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add_circle" size={28} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Notifications Section */}
        {notificaciones.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol ios_icon_name="bell.badge.fill" android_material_icon_name="notifications_active" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Notificaciones Recientes</Text>
            </View>
            {notificaciones.slice(0, 3).map(renderNotificacion)}
          </View>
        )}

        {/* Locales Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Tus Locales</Text>
          </View>
          {locales.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol ios_icon_name="building.2" android_material_icon_name="store" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No tienes locales asignados</Text>
              <Text style={styles.emptySubtext}>
                Solicita ser propietario de un local o crea uno nuevo
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push('/crear/local')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                  style={styles.createButtonGradient}
                >
                  <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={20} color="white" />
                  <Text style={styles.createButtonText}>Crear Mi Primer Local</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            locales.map(renderLocalCard)
          )}
        </View>

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  addButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  cardCoverContainer: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  cardCover: {
    width: '100%',
    height: '100%',
  },
  cardCoverPlaceholder: {
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCoverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  statusBadgeOnImage: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  statusBadgeOnImageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardCoverOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  cardCoverLocalName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardCoverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardCoverMetaText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardBody: {
    padding: 16,
  },
  statusMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusMessageText: {
    flex: 1,
  },
  statusMessage: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  adminCommentsContainer: {
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  adminCommentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  adminCommentsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
  },
  adminCommentsText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  metadataContainer: {
    gap: 8,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metadataText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  actionButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  notificationCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  notificationCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    backgroundColor: colors.primary + '05',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  notificationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  notificationMessage: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationDate: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '700',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  createButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
