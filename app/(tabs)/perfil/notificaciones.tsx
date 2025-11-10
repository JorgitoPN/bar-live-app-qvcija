
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
  Alert,
  Modal,
  Pressable,
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
  evento_id?: string;
  local_id?: string;
}

export default function NotificacionesScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

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

  // NEW: Handle notification click with navigation
  const handleNotificationClick = async (notif: Notificacion) => {
    // Mark as read
    await marcarComoLeida(notif.id);

    // Navigate based on notification type
    try {
      switch (notif.tipo) {
        case 'like':
        case 'comentario':
        case 'mencion':
          // Navigate to post detail
          if (notif.post_id) {
            router.push(`/social/post?id=${notif.post_id}`);
          }
          break;

        case 'seguidor':
          // Navigate to user profile
          if (notif.usuario_origen_id) {
            if (notif.usuario_origen_id === user?.id) {
              router.push('/(tabs)/perfil');
            } else {
              router.push(`/perfil/usuario?userId=${notif.usuario_origen_id}`);
            }
          }
          break;

        case 'evento':
          // Navigate to event detail
          if (notif.evento_id) {
            router.push(`/detalle/evento?id=${notif.evento_id}`);
          }
          break;

        case 'local':
          // Navigate to local detail
          if (notif.local_id) {
            router.push(`/detalle/local?id=${notif.local_id}`);
          }
          break;

        case 'mensaje_privado':
        case 'mensaje':
          // Navigate to chats
          router.push('/(tabs)/perfil/chats');
          break;

        case 'solicitud':
          // Navigate to admin solicitudes if user is admin
          if (user?.rol_app === 'admin') {
            router.push('/admin/solicitudes-propietario');
          }
          break;

        default:
          // For other types, just mark as read
          console.log('[Notificaciones] Unknown notification type:', notif.tipo);
          break;
      }
    } catch (error) {
      console.error('[Notificaciones] Error navigating from notification:', error);
    }
  };

  // NEW: Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedNotifications(new Set());
  };

  // NEW: Toggle notification selection
  const toggleNotificationSelection = (id: string) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedNotifications(newSelected);
  };

  // NEW: Select all notifications
  const selectAll = () => {
    const allIds = new Set(notificaciones.map(n => n.id));
    setSelectedNotifications(allIds);
  };

  // NEW: Deselect all notifications
  const deselectAll = () => {
    setSelectedNotifications(new Set());
  };

  // NEW: Delete selected notifications
  const deleteSelected = async () => {
    if (selectedNotifications.size === 0) return;

    Alert.alert(
      'Eliminar notificaciones',
      `¿Estás seguro de que quieres eliminar ${selectedNotifications.size} notificación${selectedNotifications.size > 1 ? 'es' : ''}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const idsToDelete = Array.from(selectedNotifications);
              
              const { error } = await supabase
                .from('notificaciones')
                .delete()
                .in('id', idsToDelete);

              if (error) {
                console.error('Error deleting notifications:', error);
                Alert.alert('Error', 'No se pudieron eliminar las notificaciones');
                return;
              }

              // Update local state
              setNotificaciones(prev => prev.filter(n => !selectedNotifications.has(n.id)));
              setSelectedNotifications(new Set());
              setSelectionMode(false);
              
              Alert.alert('Éxito', 'Notificaciones eliminadas correctamente');
            } catch (error) {
              console.error('Error deleting notifications:', error);
              Alert.alert('Error', 'Ocurrió un error al eliminar las notificaciones');
            }
          },
        },
      ]
    );
  };

  // NEW: Delete single notification
  const deleteSingleNotification = async (id: string) => {
    Alert.alert(
      'Eliminar notificación',
      '¿Estás seguro de que quieres eliminar esta notificación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('notificaciones')
                .delete()
                .eq('id', id);

              if (error) {
                console.error('Error deleting notification:', error);
                Alert.alert('Error', 'No se pudo eliminar la notificación');
                return;
              }

              // Update local state
              setNotificaciones(prev => prev.filter(n => n.id !== id));
              
              Alert.alert('Éxito', 'Notificación eliminada correctamente');
            } catch (error) {
              console.error('Error deleting notification:', error);
              Alert.alert('Error', 'Ocurrió un error al eliminar la notificación');
            }
          },
        },
      ]
    );
  };

  // NEW: Delete all notifications
  const deleteAllNotifications = async () => {
    if (!user) return;

    setShowDeleteModal(true);
  };

  const confirmDeleteAll = async () => {
    if (!user) return;

    try {
      setDeletingAll(true);
      
      const { error } = await supabase
        .from('notificaciones')
        .delete()
        .eq('usuario_id', user.id);

      if (error) {
        console.error('Error deleting all notifications:', error);
        Alert.alert('Error', 'No se pudieron eliminar todas las notificaciones');
        return;
      }

      // Update local state
      setNotificaciones([]);
      setShowDeleteModal(false);
      
      Alert.alert('Éxito', 'Todas las notificaciones han sido eliminadas');
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      Alert.alert('Error', 'Ocurrió un error al eliminar las notificaciones');
    } finally {
      setDeletingAll(false);
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
      case 'mensaje_privado':
      case 'mensaje':
        return 'message.fill';
      case 'local':
        return 'mappin.circle.fill';
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
      case 'mensaje_privado':
      case 'mensaje':
        return '#10B981';
      case 'local':
        return '#F59E0B';
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
          
          {/* NEW: Selection mode toggle or options button */}
          {notificaciones.length > 0 && (
            <TouchableOpacity 
              onPress={toggleSelectionMode} 
              style={styles.headerButton}
            >
              <IconSymbol 
                name={selectionMode ? 'xmark' : 'ellipsis.circle'} 
                size={24} 
                color={colors.headerText} 
              />
            </TouchableOpacity>
          )}
          {notificaciones.length === 0 && <View style={{ width: 40 }} />}
        </View>

        {/* NEW: Selection mode actions */}
        {selectionMode && (
          <View style={styles.selectionActions}>
            <TouchableOpacity 
              onPress={selectedNotifications.size === notificaciones.length ? deselectAll : selectAll}
              style={styles.selectionButton}
            >
              <Text style={styles.selectionButtonText}>
                {selectedNotifications.size === notificaciones.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </Text>
            </TouchableOpacity>
            
            {selectedNotifications.size > 0 && (
              <TouchableOpacity 
                onPress={deleteSelected}
                style={[styles.selectionButton, styles.deleteButton]}
              >
                <IconSymbol name="trash" size={16} color="#FFFFFF" />
                <Text style={[styles.selectionButtonText, { marginLeft: 6 }]}>
                  Eliminar ({selectedNotifications.size})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* NEW: Quick actions when not in selection mode */}
        {!selectionMode && notificaciones.length > 0 && (
          <View style={styles.quickActions}>
            {notificaciones.some(n => !n.leida) && (
              <TouchableOpacity onPress={marcarTodasLeidas} style={styles.quickActionButton}>
                <IconSymbol name="checkmark.circle" size={16} color={colors.headerText} />
                <Text style={styles.quickActionText}>Marcar todas leídas</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity onPress={deleteAllNotifications} style={styles.quickActionButton}>
              <IconSymbol name="trash" size={16} color={colors.headerText} />
              <Text style={styles.quickActionText}>Eliminar todas</Text>
            </TouchableOpacity>
          </View>
        )}
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
          <View key={notif.id} style={styles.notificationWrapper}>
            {/* NEW: Selection checkbox */}
            {selectionMode && (
              <TouchableOpacity
                onPress={() => toggleNotificationSelection(notif.id)}
                style={styles.checkbox}
              >
                <View style={[
                  styles.checkboxInner,
                  selectedNotifications.has(notif.id) && styles.checkboxSelected
                ]}>
                  {selectedNotifications.has(notif.id) && (
                    <IconSymbol name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.notificacionCard,
                !notif.leida && styles.notificacionNoLeida,
                selectionMode && styles.notificacionCardSelection
              ]}
              onPress={() => {
                if (selectionMode) {
                  toggleNotificationSelection(notif.id);
                } else {
                  handleNotificationClick(notif);
                }
              }}
              onLongPress={() => {
                if (!selectionMode) {
                  setSelectionMode(true);
                  toggleNotificationSelection(notif.id);
                }
              }}
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

              {/* NEW: Delete button for individual notification (only when not in selection mode) */}
              {!selectionMode && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    deleteSingleNotification(notif.id);
                  }}
                  style={styles.deleteIconButton}
                >
                  <IconSymbol name="trash" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>
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

      {/* NEW: Delete all confirmation modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowDeleteModal(false)}
        >
          <Pressable 
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <IconSymbol name="exclamationmark.triangle.fill" size={48} color="#EF4444" />
            </View>
            
            <Text style={styles.modalTitle}>Eliminar todas las notificaciones</Text>
            <Text style={styles.modalMessage}>
              ¿Estás seguro de que quieres eliminar todas tus notificaciones? Esta acción no se puede deshacer.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowDeleteModal(false)}
                style={[styles.modalButton, styles.modalButtonCancel]}
                disabled={deletingAll}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={confirmDeleteAll}
                style={[styles.modalButton, styles.modalButtonDelete]}
                disabled={deletingAll}
              >
                {deletingAll ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonTextDelete}>Eliminar todo</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  selectionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  selectionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.headerText,
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    gap: 6,
  },
  quickActionText: {
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
  notificationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  notificacionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    gap: 12,
  },
  notificacionCardSelection: {
    opacity: 0.8,
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
  deleteIconButton: {
    padding: 8,
    marginLeft: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalButtonDelete: {
    backgroundColor: '#EF4444',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalButtonTextDelete: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
