
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

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
      console.log('[MisLocales] 🔄 Loading locales for user:', user.id);

      // ✅ FIXED: Query from propietarios_locales junction table
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
        console.error('[MisLocales] ❌ Error loading assignments:', assignmentsError);
        throw assignmentsError;
      }

      // Extract locales from assignments
      const localesData = assignmentsData
        ?.map(assignment => assignment.locales)
        .filter(Boolean) || [];

      console.log('[MisLocales] ✅ Loaded', localesData.length, 'locales from assignments');

      // Also load locales where user is directly the propietario_id (legacy support)
      const { data: directLocalesData, error: directLocalesError } = await supabase
        .from('locales')
        .select('*')
        .eq('propietario_id', user.id)
        .order('fecha_solicitud', { ascending: false });

      if (!directLocalesError && directLocalesData) {
        console.log('[MisLocales] ✅ Loaded', directLocalesData.length, 'locales from direct ownership');
        
        // Merge both sources, avoiding duplicates
        const allLocalesMap = new Map<string, MiLocal>();
        
        // Add from assignments first (priority)
        localesData.forEach(local => {
          if (local) {
            allLocalesMap.set(local.id, local);
          }
        });
        
        // Add from direct ownership (if not already in map)
        directLocalesData.forEach(local => {
          if (!allLocalesMap.has(local.id)) {
            allLocalesMap.set(local.id, local);
          }
        });
        
        const mergedLocales = Array.from(allLocalesMap.values());
        console.log('[MisLocales] ✅ Total unique locales:', mergedLocales.length);
        setLocales(mergedLocales);
      } else {
        setLocales(localesData);
      }

      // Load notifications
      const { data: notificacionesData, error: notificacionesError } = await supabase
        .from('notificaciones_locales')
        .select('*')
        .eq('propietario_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (notificacionesError) {
        console.error('[MisLocales] ⚠️ Error loading notifications:', notificacionesError);
      } else {
        setNotificaciones(notificacionesData || []);
        console.log('[MisLocales] ✅ Loaded', notificacionesData?.length || 0, 'notifications');
      }
    } catch (error) {
      console.error('[MisLocales] ❌ Error:', error);
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
      console.error('[MisLocales] Error marking notification as read:', error);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { color: string; text: string; icon: string }> = {
      pendiente: { color: '#F59E0B', text: 'Pendiente', icon: 'clock.fill' },
      en_revision: { color: '#3B82F6', text: 'En Revisión', icon: 'eye.fill' },
      aprobado: { color: '#10B981', text: 'Aprobado', icon: 'checkmark.circle.fill' },
      denegado: { color: '#EF4444', text: 'Denegado', icon: 'xmark.circle.fill' },
    };

    const badge = badges[estado] || badges.pendiente;

    return (
      <View style={[styles.badge, { backgroundColor: badge.color + '20' }]}>
        <IconSymbol ios_icon_name={badge.icon} android_material_icon_name="info" size={16} color={badge.color} />
        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
      </View>
    );
  };

  const renderLocalCard = (local: MiLocal) => (
    <TouchableOpacity
      key={local.id}
      style={styles.card}
      onPress={() => {
        if (local.estado_solicitud === 'aprobado') {
          router.push(`/detalle/local?id=${local.id}`);
        }
      }}
    >
      <View style={styles.cardHeader}>
        {local.imagen_url && (
          <Image source={{ uri: local.imagen_url }} style={styles.cardImage} />
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{local.nombre}</Text>
          <Text style={styles.cardSubtitle}>{local.tipo} • {local.provincia}</Text>
          <Text style={styles.cardDate}>
            Solicitado: {new Date(local.fecha_solicitud).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        {getEstadoBadge(local.estado_solicitud)}

        {local.estado_solicitud === 'pendiente' && (
          <View style={styles.statusInfo}>
            <Text style={styles.statusText}>
              Tu solicitud está pendiente de revisión por el administrador.
            </Text>
          </View>
        )}

        {local.estado_solicitud === 'en_revision' && (
          <View style={styles.statusInfo}>
            <Text style={styles.statusText}>
              Tu solicitud está siendo revisada por el administrador.
            </Text>
            {local.comentarios_admin && (
              <View style={styles.adminComments}>
                <Text style={styles.adminCommentsLabel}>Comentarios del administrador:</Text>
                <Text style={styles.adminCommentsText}>{local.comentarios_admin}</Text>
              </View>
            )}
          </View>
        )}

        {local.estado_solicitud === 'aprobado' && (
          <View style={styles.statusInfo}>
            <Text style={[styles.statusText, { color: '#10B981' }]}>
              ¡Tu local ha sido aprobado y está publicado!
            </Text>
            {local.comentarios_admin && (
              <View style={styles.adminComments}>
                <Text style={styles.adminCommentsLabel}>Comentarios del administrador:</Text>
                <Text style={styles.adminCommentsText}>{local.comentarios_admin}</Text>
              </View>
            )}
          </View>
        )}

        {local.estado_solicitud === 'denegado' && (
          <View style={styles.statusInfo}>
            <Text style={[styles.statusText, { color: '#EF4444' }]}>
              Tu solicitud ha sido denegada.
            </Text>
            {local.motivo_denegacion && (
              <View style={[styles.adminComments, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.adminCommentsLabel, { color: '#DC2626' }]}>Motivo:</Text>
                <Text style={[styles.adminCommentsText, { color: '#DC2626' }]}>{local.motivo_denegacion}</Text>
              </View>
            )}
            {local.comentarios_admin && (
              <View style={styles.adminComments}>
                <Text style={styles.adminCommentsLabel}>Comentarios adicionales:</Text>
                <Text style={styles.adminCommentsText}>{local.comentarios_admin}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {local.estado_solicitud === 'aprobado' && (
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/editar/local?id=${local.id}`)}
          >
            <IconSymbol ios_icon_name="pencil" android_material_icon_name="edit" size={18} color={colors.primary} />
            <Text style={styles.actionButtonText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/detalle/local?id=${local.id}`)}
          >
            <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={18} color={colors.primary} />
            <Text style={styles.actionButtonText}>Ver</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderNotificacion = (notificacion: Notificacion) => (
    <TouchableOpacity
      key={notificacion.id}
      style={[styles.notificationCard, !notificacion.leida && styles.notificationCardUnread]}
      onPress={() => marcarNotificacionLeida(notificacion.id)}
    >
      <View style={styles.notificationHeader}>
        <Text style={styles.notificationTitle}>{notificacion.titulo}</Text>
        {!notificacion.leida && <View style={styles.unreadDot} />}
      </View>
      <Text style={styles.notificationMessage}>{notificacion.mensaje}</Text>
      <Text style={styles.notificationDate}>
        {new Date(notificacion.created_at).toLocaleString()}
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
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Locales</Text>
        <TouchableOpacity onPress={() => router.push('/crear/local')}>
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
            <Text style={styles.sectionTitle}>Notificaciones Recientes</Text>
            {notificaciones.slice(0, 3).map(renderNotificacion)}
          </View>
        )}

        {/* Locales Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tus Locales</Text>
          {locales.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No tienes locales asignados</Text>
              <Text style={styles.emptySubtext}>
                Solicita ser propietario de un local o crea uno nuevo
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push('/crear/local')}
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...commonStyles.shadow,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: colors.border,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardBody: {
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusInfo: {
    marginTop: 8,
  },
  statusText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  adminComments: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
  },
  adminCommentsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  adminCommentsText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: colors.primary + '15',
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  notificationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...commonStyles.shadow,
  },
  notificationCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
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
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
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
