
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { Swipeable } from 'react-native-gesture-handler';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NOTIFICACIONES SCREEN v7.1 - INSTAGRAM-INSPIRED SYSTEM WITH EXHAUSTIVE NAVIGATION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 🎯 INSTAGRAM-INSPIRED FEATURES:
 * ✅ Smart grouping by date (New, Today, This Week, Earlier)
 * ✅ Aggregation of similar events (e.g., "Juan, María and 12 others liked your post")
 * ✅ Clickable notifications with deep linking
 * ✅ Swipe to delete individual notifications
 * ✅ Delete all notifications option
 * ✅ Mark as read automatically on click
 * ✅ Mark all as read option
 * ✅ Priority system (direct interactions first, then social)
 * ✅ Real-time updates without refresh
 * ✅ Clean, minimalist UI
 * ✅ User avatars and timestamps
 * ✅ Settings panel for notification preferences
 * 
 * 🔔 NOTIFICATION CLICK BEHAVIOR (v7.1 - EXHAUSTIVO):
 * ✅ Like → Opens specific post
 * ✅ Comment/Comentario → Opens post and scrolls to comment (with highlight)
 * ✅ Follow/Seguidor → Opens follower's profile
 * ✅ Mention/Mencion → Opens content where mention occurred
 * ✅ Message/Mensaje/Mensaje_privado → Opens specific conversation
 * ✅ Event/Evento → Opens event details
 * ✅ Cheers → Opens virtual room
 * ✅ Plan Purchase/Renewal → Opens subscription management
 * ✅ Featured Local Reminder → Opens local management
 * ✅ Urgent/Sistema → Shows alert or navigates to action URL
 * ✅ Promo → Opens promo URL or local details
 * ✅ Unknown types → Attempts generic navigation or shows content
 * ✅ Automatic read status update on click
 * ✅ Visual style change for read notifications
 * ✅ Error handling for deleted/unavailable content
 * ✅ Smooth navigation without app reload
 * ✅ Fallback navigation for incomplete data
 * 
 * 🚨 CRITICAL: TODAS LAS NOTIFICACIONES TIENEN ACCIÓN ASOCIADA
 * - Cada tipo de notificación tiene un case específico en handleNotificationPress
 * - Si falta información, se intenta navegación genérica basada en related_type
 * - Como último recurso, se muestra el contenido de la notificación en un Alert
 * - NUNCA se muestra "Esta notificación no tiene una acción asociada" sin intentar alternativas
 * 
 * DATABASE STRUCTURE:
 * - notifications table: user_id (text), type, title, body, read, created_at, related_id, related_type, data
 * - notificaciones table: usuario_id (uuid), tipo, titulo, mensaje, leida, created_at, related_id, related_type, data
 * 
 * NAVIGATION MAPPING (EXHAUSTIVO):
 * - like → /social/post?id={postId}
 * - comment/comentario → /social/post?id={postId}&scrollToComment={commentId}
 * - follow/seguidor → /perfil/usuario?userId={userId}
 * - mention/mencion → /social/post?id={postId} or /social/post?id={postId}&scrollToComment={commentId}
 * - message/mensaje/mensaje_privado → /chat/conversacion?conversationId={conversationId}
 * - event/evento → /detalle/evento?id={eventId}
 * - cheers → /detalle/sala-virtual-enhanced?localId={localId}
 * - plan_purchase/plan_renewal → /gestion/mi-suscripcion
 * - featured_local_reminder → /gestion/mis-locales?localId={localId}
 * - urgent/sistema → data.actionUrl or Alert with content
 * - promo → data.promoUrl or /detalle/local?id={localId} or Alert with content
 * - unknown → Attempts generic navigation based on related_type or shows Alert
 */

type NotificationType = 
  // Interacciones
  | 'like' 
  | 'comment' 
  | 'comentario'
  | 'follow' 
  | 'seguidor'
  | 'mention' 
  | 'mencion'
  // Comunicación
  | 'message' 
  | 'mensaje'
  | 'mensaje_privado'
  | 'cheers'
  | 'saludos'
  // Transacciones
  | 'plan_purchase'
  | 'compra_plan'
  | 'plan_renewal'
  | 'renovacion_plan'
  // Sistema y Alertas
  | 'event'
  | 'evento'
  | 'featured_local_reminder'
  | 'recordatorio_local'
  | 'urgent'
  | 'urgente'
  | 'sistema'
  | 'promo'
  | 'promocion'
  | 'reminder';

interface NotificationItem {
  id: string;
  user_id?: string;
  usuario_id?: string;
  sender_id?: string;
  sender_username?: string;
  sender_avatar_url?: string;
  type?: NotificationType;
  tipo?: string;
  title?: string;
  titulo?: string;
  body?: string;
  mensaje?: string;
  read?: boolean;
  leida?: boolean;
  created_at: string;
  related_id?: string;
  related_type?: 'post' | 'comment' | 'user' | 'event' | 'local' | 'plan';
  data?: any;
  // For aggregation
  count?: number;
  recent_senders?: Array<{
    id: string;
    username: string;
    avatar_url?: string;
  }>;
}

interface GroupedNotifications {
  new: NotificationItem[];
  today: NotificationItem[];
  thisWeek: NotificationItem[];
  earlier: NotificationItem[];
}

interface NotificationSettings {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  mentions: boolean;
  events: boolean;
  messages: boolean;
  pauseAll: boolean;
  pushEnabled: boolean;
}

export default function NotificacionesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  // State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [deleteAllModalVisible, setDeleteAllModalVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState<NotificationSettings>({
    likes: true,
    comments: true,
    follows: true,
    mentions: true,
    events: true,
    messages: true,
    pauseAll: false,
    pushEnabled: true,
  });

  /**
   * Load notifications from BOTH tables and merge them
   * Includes smart aggregation for similar events
   */
  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      console.log('[Notificaciones v6.0] ⚠️ No user ID available');
      setLoading(false);
      return;
    }

    try {
      console.log('[Notificaciones v6.0] 🔍 Loading notifications for user:', user.id);
      
      const allNotifications: NotificationItem[] = [];

      // Query English table (notifications with user_id as TEXT)
      console.log('[Notificaciones v6.0] 📊 Querying "notifications" table');
      const { data: englishData, error: englishError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (englishError) {
        console.warn('[Notificaciones v6.0] ⚠️ English table error:', englishError.message);
      } else if (englishData && englishData.length > 0) {
        console.log('[Notificaciones v6.0] ✅ Found', englishData.length, 'notifications in English table');
        allNotifications.push(...englishData);
      }

      // Query Spanish table (notificaciones with usuario_id as UUID)
      console.log('[Notificaciones v6.0] 📊 Querying "notificaciones" table');
      const { data: spanishData, error: spanishError } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (spanishError) {
        console.warn('[Notificaciones v6.0] ⚠️ Spanish table error:', spanishError.message);
      } else if (spanishData && spanishData.length > 0) {
        console.log('[Notificaciones v6.0] ✅ Found', spanishData.length, 'notifications in Spanish table');
        allNotifications.push(...spanishData);
      }

      // Sort by priority and date
      const sortedNotifications = sortNotificationsByPriority(allNotifications);
      
      // Aggregate similar notifications
      const aggregatedNotifications = aggregateSimilarNotifications(sortedNotifications);

      console.log('[Notificaciones v6.0] ✅ Total notifications:', aggregatedNotifications.length);
      setNotifications(aggregatedNotifications);
      setError(null);

      // Calculate unread count
      const unread = aggregatedNotifications.filter((n) => (n.read === false || n.leida === false)).length;
      setUnreadCount(unread);
      console.log('[Notificaciones v6.0] 📊 Unread count:', unread);

      // Clear badge count
      try {
        await Notifications.setBadgeCountAsync(0);
        console.log('[Notificaciones v6.0] ✅ Badge count cleared');
      } catch (badgeError) {
        console.error('[Notificaciones v6.0] ⚠️ Could not clear badge:', badgeError);
      }

    } catch (error: any) {
      console.error('[Notificaciones v6.0] ❌ Exception:', error);
      setError('Error al cargar notificaciones');
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  /**
   * Sort notifications by priority (direct interactions first, then social)
   */
  const sortNotificationsByPriority = (notifications: NotificationItem[]): NotificationItem[] => {
    const priorityMap: Record<string, number> = {
      'message': 1,
      'comment': 2,
      'comentario': 2,
      'mention': 3,
      'mencion': 3,
      'like': 4,
      'follow': 5,
      'seguidor': 5,
      'event': 6,
      'evento': 6,
      'cheers': 7,
      'plan_purchase': 8,
      'plan_renewal': 9,
      'featured_local_reminder': 10,
    };

    return notifications.sort((a, b) => {
      const typeA = a.type || a.tipo || '';
      const typeB = b.type || b.tipo || '';
      const priorityA = priorityMap[typeA] || 99;
      const priorityB = priorityMap[typeB] || 99;

      // First sort by priority
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Then by date (most recent first)
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });
  };

  /**
   * Aggregate similar notifications (e.g., multiple likes on same post)
   */
  const aggregateSimilarNotifications = (notifications: NotificationItem[]): NotificationItem[] => {
    const aggregated: NotificationItem[] = [];
    const grouped = new Map<string, NotificationItem[]>();

    // Group notifications by type and related_id
    notifications.forEach((notif) => {
      const type = notif.type || notif.tipo || '';
      const relatedId = notif.related_id || '';
      
      // Only aggregate likes and follows
      if ((type === 'like' || type === 'follow' || type === 'seguidor') && relatedId) {
        const key = `${type}-${relatedId}`;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(notif);
      } else {
        // Don't aggregate other types
        aggregated.push(notif);
      }
    });

    // Create aggregated notifications
    grouped.forEach((group, key) => {
      if (group.length === 1) {
        aggregated.push(group[0]);
      } else {
        // Create aggregated notification
        const first = group[0];
        const count = group.length;
        const recentSenders = group.slice(0, 3).map((n) => ({
          id: n.sender_id || '',
          username: n.sender_username || 'Usuario',
          avatar_url: n.sender_avatar_url,
        }));

        const aggregatedNotif: NotificationItem = {
          ...first,
          count,
          recent_senders: recentSenders,
          body: generateAggregatedMessage(first, count, recentSenders),
          mensaje: generateAggregatedMessage(first, count, recentSenders),
        };

        aggregated.push(aggregatedNotif);
      }
    });

    // Sort again after aggregation
    return sortNotificationsByPriority(aggregated);
  };

  /**
   * Generate aggregated message (e.g., "Juan, María and 12 others liked your post")
   */
  const generateAggregatedMessage = (
    notif: NotificationItem,
    count: number,
    senders: Array<{ username: string }>
  ): string => {
    const type = notif.type || notif.tipo || '';
    const names = senders.map((s) => s.username).slice(0, 2);
    const remaining = count - names.length;

    let action = '';
    if (type === 'like') action = 'dieron like a tu publicación';
    else if (type === 'follow' || type === 'seguidor') action = 'te siguieron';
    else action = 'interactuaron con tu contenido';

    if (remaining > 0) {
      return `${names.join(', ')} y ${remaining} ${remaining === 1 ? 'persona más' : 'personas más'} ${action}`;
    } else {
      return `${names.join(' y ')} ${action}`;
    }
  };

  /**
   * Setup real-time subscription for BOTH tables
   */
  useEffect(() => {
    if (!user?.id) return;

    console.log('[Notificaciones v5.0] 📡 Setting up real-time subscription for both tables');

    const channel = supabase
      .channel(`notifications-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Notificaciones v5.0] 🔔 New notification (English table):', payload.new);
          const newNotification = payload.new as NotificationItem;
          setNotifications((prev) => [newNotification, ...prev]);
          
          // Haptic feedback
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Notificaciones v5.0] 🔔 New notification (Spanish table):', payload.new);
          const newNotification = payload.new as NotificationItem;
          setNotifications((prev) => [newNotification, ...prev]);
          
          // Haptic feedback
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      )
      .subscribe((status) => {
        console.log('[Notificaciones v5.0] 📡 Subscription status:', status);
      });

    return () => {
      console.log('[Notificaciones v5.0] 🧹 Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  /**
   * Initial load
   */
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  /**
   * Pull to refresh
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  /**
   * Group notifications by date (New, Today, This Week, Earlier)
   */
  const groupedNotifications = useMemo((): GroupedNotifications => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const groups: GroupedNotifications = {
      new: [],
      today: [],
      thisWeek: [],
      earlier: [],
    };

    notifications.forEach((notif) => {
      const notifDate = new Date(notif.created_at);
      
      if (notifDate >= fiveMinutesAgo) {
        groups.new.push(notif);
      } else if (notifDate >= todayStart) {
        groups.today.push(notif);
      } else if (notifDate >= weekStart) {
        groups.thisWeek.push(notif);
      } else {
        groups.earlier.push(notif);
      }
    });

    return groups;
  }, [notifications]);

  /**
   * Mark notification as read (try both tables)
   * 🔔 COMPORTAMIENTO:
   * 1. Actualiza el estado local inmediatamente (optimistic update)
   * 2. Actualiza la base de datos en ambas tablas
   * 3. Cambia el estilo visual de la notificación
   * 4. Decrementa el contador de no leídas
   */
  const markAsRead = async (notificationId: string) => {
    if (!user?.id) {
      console.warn('[Notificaciones v6.0] ⚠️ No user ID, cannot mark as read');
      return;
    }

    try {
      console.log('[Notificaciones v6.0] 📖 Marcando como leída:', notificationId);
      
      // Find the notification to check if it's already read
      const notification = notifications.find((n) => n.id === notificationId);
      const wasUnread = notification && (notification.read === false || notification.leida === false);

      // 1. Optimistic update - Update UI immediately
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true, leida: true } : n))
      );

      // 2. Decrement unread count if notification was unread
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      // 3. Update database - Try English table
      const { error: englishError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (englishError && englishError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is OK (means it's in the other table)
        console.warn('[Notificaciones v6.0] ⚠️ Error updating English table:', englishError.message);
      }

      // 4. Update database - Try Spanish table
      const { error: spanishError } = await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('id', notificationId)
        .eq('usuario_id', user.id);

      if (spanishError && spanishError.code !== 'PGRST116') {
        console.warn('[Notificaciones v6.0] ⚠️ Error updating Spanish table:', spanishError.message);
      }

      // 5. If both updates failed, revert optimistic update
      if (englishError && spanishError && 
          englishError.code !== 'PGRST116' && spanishError.code !== 'PGRST116') {
        console.error('[Notificaciones v6.0] ❌ Failed to update both tables');
        // Revert optimistic update
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: false, leida: false } : n))
        );
        if (wasUnread) {
          setUnreadCount((prev) => prev + 1);
        }
      } else {
        console.log('[Notificaciones v6.0] ✅ Notificación marcada como leída');
      }
    } catch (error: any) {
      console.error('[Notificaciones v6.0] ❌ Exception marking as read:', error.message);
      // Revert optimistic update on exception
      loadNotifications();
    }
  };

  /**
   * Mark all as read (both tables)
   * 🔔 COMPORTAMIENTO:
   * 1. Actualiza todas las notificaciones como leídas
   * 2. Actualiza el contador de no leídas a 0
   * 3. Proporciona feedback visual
   */
  const markAllAsRead = async () => {
    if (!user?.id) {
      console.warn('[Notificaciones v6.0] ⚠️ No user ID, cannot mark all as read');
      return;
    }

    try {
      console.log('[Notificaciones v6.0] 📖 Marcando todas como leídas');
      
      // 1. Optimistic update - Update UI immediately
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, leida: true })));
      setUnreadCount(0);

      // 2. Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // 3. Update database - English table
      const { error: englishError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (englishError) {
        console.warn('[Notificaciones v6.0] ⚠️ Error updating English table:', englishError.message);
      }

      // 4. Update database - Spanish table
      const { error: spanishError } = await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('usuario_id', user.id)
        .eq('leida', false);

      if (spanishError) {
        console.warn('[Notificaciones v6.0] ⚠️ Error updating Spanish table:', spanishError.message);
      }

      // 5. If both updates failed, revert and show error
      if (englishError && spanishError) {
        console.error('[Notificaciones v6.0] ❌ Failed to update both tables');
        Alert.alert(
          'Error',
          'No se pudieron marcar todas las notificaciones como leídas. Por favor, intenta de nuevo.',
          [{ text: 'OK' }]
        );
        // Reload to get correct state
        loadNotifications();
      } else {
        console.log('[Notificaciones v6.0] ✅ Todas las notificaciones marcadas como leídas');
      }
    } catch (error: any) {
      console.error('[Notificaciones v6.0] ❌ Exception marking all as read:', error.message);
      Alert.alert(
        'Error',
        'Ocurrió un error al marcar las notificaciones como leídas.',
        [{ text: 'OK' }]
      );
      loadNotifications();
    }
  };

  /**
   * Delete notification (try both tables)
   * 🔔 COMPORTAMIENTO:
   * 1. Elimina la notificación de la UI inmediatamente
   * 2. Actualiza el contador de no leídas si era no leída
   * 3. Elimina de la base de datos
   * 4. Proporciona feedback háptico
   */
  const deleteNotification = async (notificationId: string) => {
    if (!user?.id) {
      console.warn('[Notificaciones v6.0] ⚠️ No user ID, cannot delete');
      return;
    }

    try {
      console.log('[Notificaciones v6.0] 🗑️ Eliminando notificación:', notificationId);
      
      // Find the notification to check if it's unread
      const notification = notifications.find((n) => n.id === notificationId);
      const wasUnread = notification && (notification.read === false || notification.leida === false);

      // 1. Optimistic update - Remove from UI immediately
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

      // 2. Update unread count if notification was unread
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      // 3. Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // 4. Delete from database - Try English table
      const { error: englishError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (englishError && englishError.code !== 'PGRST116') {
        console.warn('[Notificaciones v6.0] ⚠️ Error deleting from English table:', englishError.message);
      }

      // 5. Delete from database - Try Spanish table
      const { error: spanishError } = await supabase
        .from('notificaciones')
        .delete()
        .eq('id', notificationId)
        .eq('usuario_id', user.id);

      if (spanishError && spanishError.code !== 'PGRST116') {
        console.warn('[Notificaciones v6.0] ⚠️ Error deleting from Spanish table:', spanishError.message);
      }

      // 6. If both deletes failed, revert optimistic update
      if (englishError && spanishError && 
          englishError.code !== 'PGRST116' && spanishError.code !== 'PGRST116') {
        console.error('[Notificaciones v6.0] ❌ Failed to delete from both tables');
        Alert.alert(
          'Error',
          'No se pudo eliminar la notificación. Por favor, intenta de nuevo.',
          [{ text: 'OK' }]
        );
        // Reload to get correct state
        loadNotifications();
      } else {
        console.log('[Notificaciones v6.0] ✅ Notificación eliminada');
      }
    } catch (error: any) {
      console.error('[Notificaciones v6.0] ❌ Exception deleting:', error.message);
      // Revert optimistic update
      loadNotifications();
    }
  };

  /**
   * Delete all notifications
   * 🔔 COMPORTAMIENTO:
   * 1. Elimina todas las notificaciones de la UI
   * 2. Resetea el contador de no leídas a 0
   * 3. Elimina de ambas tablas de la base de datos
   * 4. Proporciona feedback visual y háptico
   */
  const deleteAllNotifications = async () => {
    if (!user?.id) {
      console.warn('[Notificaciones v6.0] ⚠️ No user ID, cannot delete all');
      return;
    }

    try {
      console.log('[Notificaciones v6.0] 🗑️ Eliminando todas las notificaciones');
      
      // 1. Close modal
      setDeleteAllModalVisible(false);
      
      // 2. Optimistic update - Clear UI immediately
      setNotifications([]);
      setUnreadCount(0);

      // 3. Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // 4. Delete from database - English table
      const { error: englishError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (englishError) {
        console.warn('[Notificaciones v6.0] ⚠️ Error deleting from English table:', englishError.message);
      }

      // 5. Delete from database - Spanish table
      const { error: spanishError } = await supabase
        .from('notificaciones')
        .delete()
        .eq('usuario_id', user.id);

      if (spanishError) {
        console.warn('[Notificaciones v6.0] ⚠️ Error deleting from Spanish table:', spanishError.message);
      }

      // 6. If both deletes failed, show error and reload
      if (englishError && spanishError) {
        console.error('[Notificaciones v6.0] ❌ Failed to delete from both tables');
        Alert.alert(
          'Error',
          'No se pudieron eliminar todas las notificaciones. Por favor, intenta de nuevo.',
          [{ text: 'OK' }]
        );
        // Reload to get correct state
        loadNotifications();
      } else {
        console.log('[Notificaciones v6.0] ✅ Todas las notificaciones eliminadas');
      }
    } catch (error: any) {
      console.error('[Notificaciones v6.0] ❌ Exception deleting all:', error.message);
      Alert.alert(
        'Error',
        'Ocurrió un error al eliminar las notificaciones.',
        [{ text: 'OK' }]
      );
      // Revert optimistic update
      loadNotifications();
    }
  };

  /**
   * Navigate to related content based on notification type
   * 🔔 COMPORTAMIENTO OBLIGATORIO AL HACER CLIC (v7.2 - EXHAUSTIVO CON MEJOR LOGGING):
   * 1. Marca la notificación como leída automáticamente
   * 2. Navega al contenido exacto que originó la notificación
   * 3. Maneja errores si el contenido fue eliminado
   * 4. Proporciona feedback visual y háptico
   * 5. TODOS los tipos de notificación tienen una acción asociada
   * 6. Logging mejorado para debugging
   */
  const handleNotificationPress = async (notification: NotificationItem) => {
    console.log('[Notificaciones v7.2] ═══════════════════════════════════════════════════════');
    console.log('[Notificaciones v7.2] 👆 Usuario hizo clic en notificación');
    console.log('[Notificaciones v7.2] 📊 NOTIFICACIÓN COMPLETA:', JSON.stringify(notification, null, 2));
    
    // 1. Mark as read immediately (optimistic update)
    const wasRead = notification.read || notification.leida;
    if (!wasRead) {
      await markAsRead(notification.id, wasRead || false);
    }

    // 2. Haptic feedback for better UX
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // 3. Extract notification data (handle both English and Spanish fields)
    const type = (notification.type || notification.tipo || '').toLowerCase();
    const relatedId = notification.related_id;
    const relatedType = notification.related_type;
    const senderId = notification.sender_id;
    const data = notification.data || {};

    console.log('[Notificaciones v7.2] 📊 Datos extraídos:');
    console.log('[Notificaciones v7.2]    - type:', type);
    console.log('[Notificaciones v7.2]    - relatedId:', relatedId);
    console.log('[Notificaciones v7.2]    - relatedType:', relatedType);
    console.log('[Notificaciones v7.2]    - senderId:', senderId);
    console.log('[Notificaciones v7.2]    - data:', JSON.stringify(data, null, 2));

    // 4. Validate that we have a type
    if (!type) {
      console.error('[Notificaciones v7.2] ❌ CRÍTICO: Notificación sin tipo');
      console.error('[Notificaciones v7.2] 📊 Notificación completa:', notification);
      Alert.alert(
        'Error',
        'Esta notificación está incompleta y no se puede procesar.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // 5. Navigate based on notification type
      console.log('[Notificaciones v7.2] 🔀 Evaluando tipo de notificación:', type);
      
      switch (type) {
        // ═══════════════════════════════════════════════════════════════
        // LIKES - Abrir publicación específica
        // ═══════════════════════════════════════════════════════════════
        case 'like': {
          console.log('[Notificaciones v7.2] ❤️ Procesando LIKE');
          const postId = relatedId || data.postId || data.post_id || data.entityId;
          console.log('[Notificaciones v7.2]    - postId encontrado:', postId);
          
          if (postId) {
            console.log('[Notificaciones v7.2] ✅ Navegando a publicación:', postId);
            router.push(`/social/post?id=${postId}`);
          } else {
            console.warn('[Notificaciones v7.2] ⚠️ Like sin ID de publicación');
            console.warn('[Notificaciones v7.2] 📊 Datos disponibles:', { relatedId, data });
            Alert.alert(
              'Publicación no disponible',
              'La publicación asociada a este like no se pudo encontrar.',
              [{ text: 'OK' }]
            );
          }
          break;
        }

        // ═══════════════════════════════════════════════════════════════
        // COMENTARIOS - Abrir publicación y hacer scroll al comentario
        // ═══════════════════════════════════════════════════════════════
        case 'comment':
        case 'comentario': {
          console.log('[Notificaciones v7.2] 💬 Procesando COMENTARIO');
          const postId = relatedId || data.postId || data.post_id || data.entityId;
          const commentId = data.commentId || data.comment_id;
          console.log('[Notificaciones v7.2]    - postId:', postId);
          console.log('[Notificaciones v7.2]    - commentId:', commentId);
          
          if (postId) {
            if (commentId) {
              console.log('[Notificaciones v7.2] ✅ Navegando a publicación con comentario');
              router.push(`/social/post?id=${postId}&scrollToComment=${commentId}`);
            } else {
              console.log('[Notificaciones v7.2] ✅ Navegando a publicación (sin ID de comentario)');
              router.push(`/social/post?id=${postId}`);
            }
          } else if (relatedType === 'comment' && relatedId) {
            console.log('[Notificaciones v7.2] ✅ Navegando a comentarios (solo ID de comentario)');
            router.push(`/social/comentarios?commentId=${relatedId}`);
          } else {
            console.warn('[Notificaciones v7.2] ⚠️ Comentario sin ID de publicación');
            console.warn('[Notificaciones v7.2] 📊 Datos disponibles:', { relatedId, relatedType, data });
            Alert.alert(
              'Publicación no disponible',
              'La publicación asociada a este comentario no se pudo encontrar.',
              [{ text: 'OK' }]
            );
          }
          break;
        }

        // ═══════════════════════════════════════════════════════════════
        // NUEVOS SEGUIDORES - Abrir perfil del usuario
        // ═══════════════════════════════════════════════════════════════
        case 'follow':
        case 'seguidor': {
          console.log('[Notificaciones v7.2] 👥 Procesando SEGUIDOR');
          const followerId = senderId || relatedId || data.userId || data.user_id || data.entityId;
          console.log('[Notificaciones v7.2]    - followerId encontrado:', followerId);
          
          if (followerId) {
            console.log('[Notificaciones v7.2] ✅ Navegando a perfil de seguidor');
            router.push(`/perfil/usuario?userId=${followerId}`);
          } else {
            console.warn('[Notificaciones v7.2] ⚠️ Seguidor sin ID de usuario');
            console.warn('[Notificaciones v7.2] 📊 Datos disponibles:', { senderId, relatedId, data });
            Alert.alert(
              'Perfil no disponible',
              'El perfil del usuario no se pudo encontrar.',
              [{ text: 'OK' }]
            );
          }
          break;
        }

        // ═══════════════════════════════════════════════════════════════
        // MENCIONES - Abrir contenido donde se realizó la mención
        // ═══════════════════════════════════════════════════════════════
        case 'mention':
        case 'mencion': {
          console.log('[Notificaciones v7.2] @ Procesando MENCIÓN');
          const postId = relatedId || data.postId || data.post_id || data.entityId;
          const commentId = data.commentId || data.comment_id;
          console.log('[Notificaciones v7.2]    - postId:', postId);
          console.log('[Notificaciones v7.2]    - commentId:', commentId);
          
          if (postId && (relatedType === 'post' || !relatedType)) {
            console.log('[Notificaciones v7.2] ✅ Navegando a publicación con mención');
            router.push(`/social/post?id=${postId}`);
          } else if (postId && commentId) {
            console.log('[Notificaciones v7.2] ✅ Navegando a comentario con mención');
            router.push(`/social/post?id=${postId}&scrollToComment=${commentId}`);
          } else if (relatedType === 'comment' && relatedId) {
            console.log('[Notificaciones v7.2] ✅ Navegando a comentarios (mención en comentario)');
            router.push(`/social/comentarios?commentId=${relatedId}`);
          } else {
            console.warn('[Notificaciones v7.2] ⚠️ Mención sin contenido asociado');
            console.warn('[Notificaciones v7.2] 📊 Datos disponibles:', { relatedId, relatedType, data });
            Alert.alert(
              'Contenido no disponible',
              'El contenido donde fuiste mencionado no se pudo encontrar.',
              [{ text: 'OK' }]
            );
          }
          break;
        }

        // ═══════════════════════════════════════════════════════════════
        // EVENTOS - Abrir detalle del evento
        // ═══════════════════════════════════════════════════════════════
        case 'event':
        case 'evento': {
          console.log('[Notificaciones v7.2] 📅 Procesando EVENTO');
          const eventId = relatedId || data.eventId || data.event_id || data.entityId;
          console.log('[Notificaciones v7.2]    - eventId encontrado:', eventId);
          
          if (eventId) {
            console.log('[Notificaciones v7.2] ✅ Navegando a evento');
            router.push(`/detalle/evento?id=${eventId}`);
          } else {
            console.warn('[Notificaciones v7.2] ⚠️ Evento sin ID');
            console.warn('[Notificaciones v7.2] 📊 Datos disponibles:', { relatedId, data });
            Alert.alert(
              'Evento no disponible',
              'El evento asociado a esta notificación no se pudo encontrar.',
              [{ text: 'OK' }]
            );
          }
          break;
        }

        // ═══════════════════════════════════════════════════════════════
        // MENSAJES DIRECTOS - Abrir conversación específica
        // ═══════════════════════════════════════════════════════════════
        case 'message':
        case 'mensaje':
        case 'mensaje_privado': {
          console.log('[Notificaciones v7.2] ✉️ Procesando MENSAJE');
          const conversationId = relatedId || data.conversationId || data.conversation_id || data.entityId;
          const chatUserId = senderId || data.userId || data.user_id;
          console.log('[Notificaciones v7.2]    - conversationId:', conversationId);
          console.log('[Notificaciones v7.2]    - chatUserId:', chatUserId);
          
          if (conversationId) {
            console.log('[Notificaciones v7.2] ✅ Navegando a conversación');
            router.push(`/chat/conversacion?conversationId=${conversationId}`);
          } else if (chatUserId) {
            console.log('[Notificaciones v7.2] ✅ Navegando a chat con usuario');
            router.push(`/chat/conversacion?userId=${chatUserId}`);
          } else {
            console.warn('[Notificaciones v7.2] ⚠️ Mensaje sin información de conversación');
            console.warn('[Notificaciones v7.2] 📊 Datos disponibles:', { relatedId, senderId, data });
            Alert.alert(
              'Conversación no disponible',
              'La conversación asociada a esta notificación no se pudo encontrar.',
              [{ text: 'OK' }]
            );
          }
          break;
        }

        // ═══════════════════════════════════════════════════════════════
        // BRINDIS - Abrir sala virtual del local
        // ═══════════════════════════════════════════════════════════════
        case 'cheers':
        case 'saludos': {
          console.log('[Notificaciones v7.2] 🍻 Procesando BRINDIS');
          const localId = relatedId || data.localId || data.local_id || data.entityId;
          console.log('[Notificaciones v7.2]    - localId encontrado:', localId);
          
          if (localId) {
            console.log('[Notificaciones v7.2] ✅ Navegando a sala virtual');
            router.push(`/detalle/sala-virtual-enhanced?localId=${localId}`);
          } else {
            console.warn('[Notificaciones v7.2] ⚠️ Brindis sin ID de local');
            console.warn('[Notificaciones v7.2] 📊 Datos disponibles:', { relatedId, data });
            Alert.alert(
              'Sala virtual no disponible',
              'La sala virtual asociada a esta notificación no se pudo encontrar.',
              [{ text: 'OK' }]
            );
          }
          break;
        }

        // ═══════════════════════════════════════════════════════════════
        // PLANES Y SUSCRIPCIONES - Abrir gestión de suscripción
        // ═══════════════════════════════════════════════════════════════
        case 'plan_purchase':
        case 'plan_renewal':
        case 'compra_plan':
        case 'renovacion_plan': {
          console.log('[Notificaciones v7.2] 💳 Procesando PLAN/SUSCRIPCIÓN');
          console.log('[Notificaciones v7.2] ✅ Navegando a gestión de suscripción');
          router.push('/gestion/mi-suscripcion');
          break;
        }

        // ═══════════════════════════════════════════════════════════════
        // RECORDATORIO DE LOCAL DESTACADO - Abrir gestión de locales
        // ═══════════════════════════════════════════════════════════════
        case 'featured_local_reminder':
        case 'recordatorio_local': {
          console.log('[Notificaciones v7.2] ⭐ Procesando RECORDATORIO LOCAL');
          const featuredLocalId = relatedId || data.localId || data.local_id || data.entityId;
          console.log('[Notificaciones v7.2]    - featuredLocalId:', featuredLocalId);
          
          if (featuredLocalId) {
            console.log('[Notificaciones v7.2] ✅ Navegando a gestión de locales (con ID)');
            router.push(`/gestion/mis-locales?localId=${featuredLocalId}`);
          } else {
            console.log('[Notificaciones v7.2] ✅ Navegando a gestión de locales (sin ID específico)');
            router.push('/gestion/mis-locales');
          }
          break;
        }

        // ═══════════════════════════════════════════════════════════════
        // NOTIFICACIONES URGENTES DEL SISTEMA
        // ═══════════════════════════════════════════════════════════════
        case 'urgent':
        case 'urgente':
        case 'sistema':
        case 'system': {
          console.log('[Notificaciones v7.2] 🚨 Procesando URGENTE/SISTEMA');
          const actionUrl = data.actionUrl || data.action_url || data.url;
          console.log('[Notificaciones v7.2]    - actionUrl:', actionUrl);
          
          if (actionUrl) {
            console.log('[Notificaciones v7.2] ✅ Navegando a URL de acción');
            router.push(actionUrl);
          } else {
            const title = notification.title || notification.titulo || 'Notificación del sistema';
            const body = notification.body || notification.mensaje || '';
            console.log('[Notificaciones v7.2] 📢 Mostrando notificación urgente en Alert');
            Alert.alert(title, body, [{ text: 'OK' }]);
          }
          break;
        }

        // ═══════════════════════════════════════════════════════════════
        // PROMOCIONES Y OFERTAS ESPECIALES
        // ═══════════════════════════════════════════════════════════════
        case 'promo':
        case 'promocion': {
          console.log('[Notificaciones v7.2] 🎁 Procesando PROMOCIÓN');
          const promoUrl = data.promoUrl || data.promo_url || data.url;
          const promoLocalId = relatedId || data.localId || data.local_id || data.entityId;
          console.log('[Notificaciones v7.2]    - promoUrl:', promoUrl);
          console.log('[Notificaciones v7.2]    - promoLocalId:', promoLocalId);
          
          if (promoUrl) {
            console.log('[Notificaciones v7.2] ✅ Navegando a URL de promoción');
            router.push(promoUrl);
          } else if (promoLocalId) {
            console.log('[Notificaciones v7.2] ✅ Navegando a local con promoción');
            router.push(`/detalle/local?id=${promoLocalId}`);
          } else {
            const title = notification.title || notification.titulo || 'Promoción especial';
            const body = notification.body || notification.mensaje || '';
            console.log('[Notificaciones v7.2] 🎁 Mostrando promoción en Alert');
            Alert.alert(
              title,
              body,
              [{ text: 'Ver más', onPress: () => router.push('/explorar') }, { text: 'Cerrar' }]
            );
          }
          break;
        }

        // ═══════════════════════════════════════════════════════════════
        // TIPO DESCONOCIDO - Intentar navegación genérica
        // ═══════════════════════════════════════════════════════════════
        default: {
          console.warn('[Notificaciones v7.2] ⚠️ TIPO DESCONOCIDO:', type);
          console.warn('[Notificaciones v7.2] 📊 Intentando navegación genérica...');
          console.warn('[Notificaciones v7.2] 📊 Notificación completa:', notification);
          
          // Try to extract any possible navigation data
          const genericUrl = data.url || data.actionUrl || data.action_url;
          const genericId = relatedId || data.id || data.entityId;
          
          console.log('[Notificaciones v7.2]    - genericUrl:', genericUrl);
          console.log('[Notificaciones v7.2]    - genericId:', genericId);
          console.log('[Notificaciones v7.2]    - relatedType:', relatedType);
          
          if (genericUrl) {
            console.log('[Notificaciones v7.2] ✅ Navegando a URL genérica');
            router.push(genericUrl);
          } else if (genericId && relatedType) {
            // Try to construct a URL based on related_type
            let constructedUrl = '';
            switch (relatedType) {
              case 'post':
                constructedUrl = `/social/post?id=${genericId}`;
                break;
              case 'user':
                constructedUrl = `/perfil/usuario?userId=${genericId}`;
                break;
              case 'event':
                constructedUrl = `/detalle/evento?id=${genericId}`;
                break;
              case 'local':
                constructedUrl = `/detalle/local?id=${genericId}`;
                break;
              default:
                console.warn('[Notificaciones v7.2] ⚠️ related_type no reconocido:', relatedType);
                break;
            }
            
            if (constructedUrl) {
              console.log('[Notificaciones v7.2] ✅ Navegando a URL construida:', constructedUrl);
              router.push(constructedUrl);
            } else {
              const title = notification.title || notification.titulo || 'Notificación';
              const body = notification.body || notification.mensaje || '';
              console.log('[Notificaciones v7.2] 📢 Mostrando contenido en Alert (no se pudo construir URL)');
              Alert.alert(
                title,
                body || 'Esta notificación no tiene una acción específica asociada.',
                [{ text: 'OK' }]
              );
            }
          } else {
            // Last resort: show notification content
            const title = notification.title || notification.titulo || 'Notificación';
            const body = notification.body || notification.mensaje || '';
            console.log('[Notificaciones v7.2] 📢 Mostrando contenido en Alert (sin datos de navegación)');
            Alert.alert(
              title,
              body || 'Esta notificación no tiene una acción específica asociada.',
              [{ text: 'OK' }]
            );
          }
          break;
        }
      }
      
      console.log('[Notificaciones v7.2] ✅ Navegación completada');
      console.log('[Notificaciones v7.2] ═══════════════════════════════════════════════════════');
    } catch (error: any) {
      // ═══════════════════════════════════════════════════════════════
      // MANEJO DE ERRORES - Contenido no disponible
      // ═══════════════════════════════════════════════════════════════
      console.error('[Notificaciones v7.2] ❌ ERROR DE NAVEGACIÓN');
      console.error('[Notificaciones v7.2] 📊 Error:', error.message);
      console.error('[Notificaciones v7.2] 📊 Stack:', error.stack);
      console.error('[Notificaciones v7.2] 📊 Notificación que causó el error:', notification);
      console.error('[Notificaciones v7.2] ═══════════════════════════════════════════════════════');
      
      // Show user-friendly error message
      Alert.alert(
        'Contenido no disponible',
        'Este contenido ya no está disponible. Es posible que haya sido eliminado o que no tengas acceso a él.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Get icon for notification type (handles both English and Spanish types)
   * v7.2 - EXHAUSTIVO: Todos los tipos tienen un icono específico (14 categorías)
   */
  const getNotificationIcon = (notification: NotificationItem): string => {
    const type = (notification.type || notification.tipo || '').toLowerCase();
    const iconMap: Record<string, string> = {
      // Interacciones (4)
      like: '❤️',
      comment: '💬',
      comentario: '💬',
      follow: '👥',
      seguidor: '👥',
      mention: '@',
      mencion: '@',
      
      // Comunicación (2)
      message: '✉️',
      mensaje: '✉️',
      mensaje_privado: '✉️',
      cheers: '🍻',
      saludos: '🍻',
      
      // Transacciones (2)
      plan_purchase: '💳',
      compra_plan: '💳',
      plan_renewal: '🔄',
      renovacion_plan: '🔄',
      
      // Sistema y Alertas (6)
      event: '📅',
      evento: '📅',
      featured_local_reminder: '⭐',
      recordatorio_local: '⭐',
      urgent: '🚨',
      urgente: '🚨',
      sistema: '🔔',
      promo: '🎁',
      promocion: '🎁',
      reminder: '⏰',
    };
    return iconMap[type] || '🔔';
  };

  /**
   * Format time ago
   */
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  /**
   * Render swipeable notification item with delete action
   */
  const renderRightActions = (notificationId: string) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => deleteNotification(notificationId)}
      >
        <IconSymbol
          ios_icon_name="trash"
          android_material_icon_name="delete"
          size={scaleIconSize(24)}
          color="#FFFFFF"
        />
        <Text style={styles.deleteActionText}>Eliminar</Text>
      </TouchableOpacity>
    );
  };

  /**
   * Render notification item (handles both English and Spanish fields)
   */
  const renderNotification = (notification: NotificationItem) => {
    const icon = getNotificationIcon(notification);
    const timeAgo = formatTimeAgo(notification.created_at);
    
    // Handle both English and Spanish field names
    const title = notification.title || notification.titulo || 'Notificación';
    const body = notification.body || notification.mensaje || '';
    const isRead = notification.read || notification.leida || false;
    const avatar = notification.sender_avatar_url;
    const isAggregated = (notification.count || 0) > 1;

    return (
      <Swipeable
        key={notification.id}
        renderRightActions={() => renderRightActions(notification.id)}
        overshootRight={false}
      >
        <TouchableOpacity
          onPress={() => handleNotificationPress(notification)}
          style={[
            styles.notificationCard,
            !isRead && styles.notificationCardUnread,
          ]}
          activeOpacity={0.7}
        >
          <View style={styles.avatarSection}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.iconText}>{icon}</Text>
              </View>
            )}
            {isAggregated && notification.recent_senders && notification.recent_senders.length > 1 && (
              <View style={styles.avatarStack}>
                {notification.recent_senders.slice(1, 3).map((sender, index) => (
                  sender.avatar_url ? (
                    <Image
                      key={sender.id}
                      source={{ uri: sender.avatar_url }}
                      style={[styles.stackedAvatar, { right: (index + 1) * 12 }]}
                    />
                  ) : null
                ))}
              </View>
            )}
          </View>
          
          <View style={styles.contentContainer}>
            <Text style={[styles.body, !isRead && styles.bodyUnread]}>
              {body}
            </Text>
            <Text style={styles.time}>{timeAgo}</Text>
          </View>
          
          {!isRead && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      </Swipeable>
    );
  };

  /**
   * Render section header
   */
  const renderSectionHeader = (title: string, count: number) => {
    if (count === 0) return null;
    
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{count}</Text>
      </View>
    );
  };

  /**
   * Render content
   */
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow_back"
              size={scaleIconSize(24)}
              color={colors.headerText}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notificaciones</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando notificaciones...</Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow_back"
              size={scaleIconSize(24)}
              color={colors.headerText}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notificaciones</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>Inicia sesión</Text>
          <Text style={styles.emptyText}>
            Inicia sesión para ver tus notificaciones
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow_back"
              size={scaleIconSize(24)}
              color={colors.headerText}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notificaciones</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>Error</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadNotifications}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow_back"
              size={scaleIconSize(24)}
              color={colors.headerText}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notificaciones</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <Text style={styles.emptyIcon}>🔕</Text>
          <Text style={styles.emptyTitle}>No tienes notificaciones</Text>
          <Text style={styles.emptyText}>
            Cuando recibas likes, comentarios o seguidores, aparecerán aquí
          </Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={scaleIconSize(24)}
            color={colors.headerText}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Notificaciones {unreadCount > 0 && `(${unreadCount})`}
        </Text>
        <TouchableOpacity onPress={() => setSettingsVisible(true)} style={styles.settingsButton}>
          <IconSymbol
            ios_icon_name="gear"
            android_material_icon_name="settings"
            size={scaleIconSize(24)}
            color={colors.headerText}
          />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Action buttons */}
        <View style={styles.actionButtons}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.actionButton}>
              <IconSymbol
                ios_icon_name="checkmark.circle"
                android_material_icon_name="check_circle"
                size={scaleIconSize(18)}
                color={colors.primary}
              />
              <Text style={styles.actionButtonText}>Marcar todas como leídas</Text>
            </TouchableOpacity>
          )}
          
          {notifications.length > 0 && (
            <TouchableOpacity 
              onPress={() => setDeleteAllModalVisible(true)} 
              style={styles.actionButton}
            >
              <IconSymbol
                ios_icon_name="trash"
                android_material_icon_name="delete"
                size={scaleIconSize(18)}
                color="#EF4444"
              />
              <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>
                Eliminar todas
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Grouped notifications */}
        {renderSectionHeader('Nuevas', groupedNotifications.new.length)}
        {groupedNotifications.new.map(renderNotification)}

        {renderSectionHeader('Hoy', groupedNotifications.today.length)}
        {groupedNotifications.today.map(renderNotification)}

        {renderSectionHeader('Esta semana', groupedNotifications.thisWeek.length)}
        {groupedNotifications.thisWeek.map(renderNotification)}

        {renderSectionHeader('Anteriores', groupedNotifications.earlier.length)}
        {groupedNotifications.earlier.map(renderNotification)}
      </ScrollView>

      {/* Settings Modal */}
      {/* ✅ FIX v7.4: Settings Modal - Navigate to full screen on Android */}
      <Modal
        visible={settingsVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSettingsVisible(false)}
        presentationStyle="fullScreen"
      >
        <View style={styles.settingsModalFullScreen}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.settingsModalHeader}
          >
            <TouchableOpacity onPress={() => setSettingsVisible(false)} style={styles.settingsModalBackButton}>
              <IconSymbol
                ios_icon_name="chevron.left"
                android_material_icon_name="arrow_back"
                size={scaleIconSize(24)}
                color={colors.headerText}
              />
            </TouchableOpacity>
            <Text style={styles.settingsModalHeaderTitle}>Configuración de Notificaciones</Text>
            <View style={{ width: 40 }} />
          </LinearGradient>

          <ScrollView style={styles.settingsContentFullScreen}>
            <View style={styles.settingItem}>
              <View>
                <Text style={styles.settingLabel}>Pausar todas las notificaciones</Text>
                <Text style={styles.settingDescription}>
                  No recibirás notificaciones temporalmente
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.switch, settings.pauseAll && styles.switchActive]}
                onPress={() => setSettings({ ...settings, pauseAll: !settings.pauseAll })}
              >
                <View style={[styles.switchThumb, settings.pauseAll && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsDivider} />

            <Text style={styles.settingsSection}>Tipos de notificación</Text>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Likes</Text>
              <TouchableOpacity
                style={[styles.switch, settings.likes && styles.switchActive]}
                onPress={() => setSettings({ ...settings, likes: !settings.likes })}
              >
                <View style={[styles.switchThumb, settings.likes && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Comentarios</Text>
              <TouchableOpacity
                style={[styles.switch, settings.comments && styles.switchActive]}
                onPress={() => setSettings({ ...settings, comments: !settings.comments })}
              >
                <View style={[styles.switchThumb, settings.comments && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Nuevos seguidores</Text>
              <TouchableOpacity
                style={[styles.switch, settings.follows && styles.switchActive]}
                onPress={() => setSettings({ ...settings, follows: !settings.follows })}
              >
                <View style={[styles.switchThumb, settings.follows && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Menciones</Text>
              <TouchableOpacity
                style={[styles.switch, settings.mentions && styles.switchActive]}
                onPress={() => setSettings({ ...settings, mentions: !settings.mentions })}
              >
                <View style={[styles.switchThumb, settings.mentions && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Eventos</Text>
              <TouchableOpacity
                style={[styles.switch, settings.events && styles.switchActive]}
                onPress={() => setSettings({ ...settings, events: !settings.events })}
              >
                <View style={[styles.switchThumb, settings.events && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Mensajes</Text>
              <TouchableOpacity
                style={[styles.switch, settings.messages && styles.switchActive]}
                onPress={() => setSettings({ ...settings, messages: !settings.messages })}
              >
                <View style={[styles.switchThumb, settings.messages && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsDivider} />

            <View style={styles.settingItem}>
              <View>
                <Text style={styles.settingLabel}>Notificaciones push</Text>
                <Text style={styles.settingDescription}>
                  Recibir notificaciones incluso cuando la app está cerrada
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.switch, settings.pushEnabled && styles.switchActive]}
                onPress={() => setSettings({ ...settings, pushEnabled: !settings.pushEnabled })}
              >
                <View style={[styles.switchThumb, settings.pushEnabled && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Delete All Confirmation Modal */}
      <Modal
        visible={deleteAllModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeleteAllModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setDeleteAllModalVisible(false)}
        >
          <Pressable style={styles.confirmModal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.confirmTitle}>Eliminar todas las notificaciones</Text>
            <Text style={styles.confirmMessage}>
              ¿Estás seguro de que quieres eliminar todas tus notificaciones? Esta acción no se puede deshacer.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmButtonCancel}
                onPress={() => setDeleteAllModalVisible(false)}
              >
                <Text style={styles.confirmButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButtonDelete}
                onPress={deleteAllNotifications}
              >
                <Text style={styles.confirmButtonDeleteText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  settingsButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: '700',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: scaleFontSize(14),
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyIcon: {
    fontSize: scaleFontSize(64),
  },
  emptyTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: '700',
    color: colors.text,
  },
  emptyText: {
    fontSize: scaleFontSize(15),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: scaleFontSize(15),
    fontWeight: '600',
    color: colors.headerText,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionButtonText: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: colors.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '700',
    color: colors.text,
  },
  sectionCount: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  notificationCard: {
    backgroundColor: colors.cardBackground,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  notificationCardUnread: {
    backgroundColor: colors.primary + '05',
  },
  avatarSection: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.cardBorder,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarStack: {
    position: 'absolute',
    top: 0,
    right: -24,
    flexDirection: 'row',
  },
  stackedAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.background,
    position: 'absolute',
  },
  iconText: {
    fontSize: scaleFontSize(22),
  },
  contentContainer: {
    flex: 1,
  },
  body: {
    fontSize: scaleFontSize(14),
    color: colors.text,
    marginBottom: 6,
    lineHeight: 20,
  },
  bodyUnread: {
    fontWeight: '600',
  },
  time: {
    fontSize: scaleFontSize(12),
    color: colors.textTertiary,
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 12,
    marginTop: 8,
  },
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  deleteActionText: {
    color: '#FFFFFF',
    fontSize: scaleFontSize(12),
    fontWeight: '600',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  settingsModal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  // ✅ FIX v7.3: Android full screen modal styles
  settingsModalFullScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  settingsModalHeader: {
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsModalBackButton: {
    padding: 8,
  },
  settingsModalHeaderTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '700',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  settingsContentFullScreen: {
    flex: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '700',
    color: colors.text,
  },
  settingsContent: {
    padding: 20,
  },
  settingsSection: {
    fontSize: scaleFontSize(14),
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: scaleFontSize(15),
    fontWeight: '500',
    color: colors.text,
  },
  settingDescription: {
    fontSize: scaleFontSize(13),
    color: colors.textSecondary,
    marginTop: 4,
    maxWidth: '80%',
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.cardBorder,
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: colors.primary,
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  settingsDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 16,
  },
  confirmModal: {
    backgroundColor: colors.background,
    margin: 20,
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  confirmTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  confirmMessage: {
    fontSize: scaleFontSize(15),
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButtonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  confirmButtonCancelText: {
    fontSize: scaleFontSize(15),
    fontWeight: '600',
    color: colors.text,
  },
  confirmButtonDelete: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  confirmButtonDeleteText: {
    fontSize: scaleFontSize(15),
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
