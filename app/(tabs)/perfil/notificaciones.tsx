
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';

interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
  usuario_origen_id?: string;
  post_id?: string;
}

export default function NotificacionesScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotificaciones = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingNotifications(true);
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      setNotificaciones(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      setShowLoginModal(true);
    } else if (user) {
      loadNotificaciones();
    }
  }, [user, loading, loadNotificaciones]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotificaciones();
    setRefreshing(false);
  };

  const marcarComoLeida = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('id', id);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotificaciones(prev =>
        prev.map(n => n.id === id ? { ...n, leida: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const marcarTodasLeidas = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('usuario_id', user.id)
        .eq('leida', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getIconoNotificacion = (tipo: string) => {
    switch (tipo) {
      case 'like':
        return 'heart.fill';
      case 'comentario':
        return 'bubble.left.fill';
      case 'seguidor':
        return 'person.badge.plus';
      case 'evento':
        return 'calendar';
      case 'sistema':
        return 'bell.fill';
      case 'solicitud':
        return 'doc.text.fill';
      case 'mencion':
        return 'at';
      default:
        return 'bell';
    }
  };

  const getColorIcono = (tipo: string) => {
    switch (tipo) {
      case 'like':
        return colors.badgeNuevo;
      case 'comentario':
        return colors.primary;
      case 'seguidor':
        return colors.secondary;
      case 'evento':
        return colors.badgeDestacado;
      default:
        return colors.textSecondary;
    }
  };

  const formatearFecha = (fecha: string) => {
    const ahora = new Date();
    const fechaNotif = new Date(fecha);
    const diffMs = ahora.getTime() - fechaNotif.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHoras < 24) return `Hace ${diffHoras} hora${diffHoras > 1 ? 's' : ''}`;
    if (diffDias < 7) return `Hace ${diffDias} día${diffDias > 1 ? 's' : ''}`;
    return fechaNotif.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  if (loading || loadingNotifications) {
    return (
      <View style={[commonStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Cargando notificaciones...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={commonStyles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Notificaciones</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <LoginRequiredModal
          visible={showLoginModal}
          onClose={() => {
            setShowLoginModal(false);
            router.back();
          }}
          message="Para ver tus notificaciones necesitas registrarte en BarLive"
        />
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      {/* Header con gradiente */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notificaciones</Text>
          {notificaciones.some(n => !n.leida) && (
            <TouchableOpacity onPress={marcarTodasLeidas} style={styles.markAllButton}>
              <Text style={styles.markAllText}>Marcar todas</Text>
            </TouchableOpacity>
          )}
          {!notificaciones.some(n => !n.leida) && <View style={{ width: 40 }} />}
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notificaciones.map((notif) => (
          <TouchableOpacity
            key={notif.id}
            style={[
              styles.notificacionCard,
              !notif.leida && styles.notificacionNoLeida
            ]}
            onPress={() => marcarComoLeida(notif.id)}
          >
            <View style={[
              styles.iconoContainer,
              { backgroundColor: getColorIcono(notif.tipo) + '20' }
            ]}>
              <IconSymbol
                name={getIconoNotificacion(notif.tipo)}
                size={24}
                color={getColorIcono(notif.tipo)}
              />
            </View>

            <View style={styles.notificacionContent}>
              <Text style={styles.notificacionTitulo}>{notif.titulo}</Text>
              <Text style={styles.notificacionMensaje}>{notif.mensaje}</Text>
              <Text style={styles.notificacionFecha}>{formatearFecha(notif.created_at)}</Text>
            </View>

            {!notif.leida && <View style={styles.puntito} />}
          </TouchableOpacity>
        ))}

        {notificaciones.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol name="bell.slash" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No tienes notificaciones</Text>
            <Text style={styles.emptySubtext}>
              Aquí aparecerán tus notificaciones cuando alguien interactúe con tu contenido
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.headerText,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  notificacionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  notificacionNoLeida: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary + '30',
  },
  iconoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificacionContent: {
    flex: 1,
    gap: 4,
  },
  notificacionTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  notificacionMensaje: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  notificacionFecha: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  puntito: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.badgeNuevo,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
