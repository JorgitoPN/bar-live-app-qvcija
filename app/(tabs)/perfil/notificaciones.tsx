
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
 * NOTIFICACIONES SCREEN v7.5 - INSTAGRAM-INSPIRED SYSTEM WITH USER AVATARS
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
 * ✅ User profile avatars with fallback to initials
 * ✅ Stacked avatars for aggregated notifications
 * ✅ Settings panel for notification preferences
 * ✅ FIX v7.4: Proper avatar loading from usuarios table
 * ✅ FIX v7.5: Show username initial immediately when no avatar (don't wait for error)
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

interface AvatarState {
  [key: string]: boolean;
}

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
  recent_senders?: {
    id: string;
    username: string;
    avatar_url?: string;
  }[];
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
  const [avatarErrors, setAvatarErrors] = useState<AvatarState>({});
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
   * ✅ FIX v7.4: Join with usuarios table to get avatar information
   */
  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      console.log('[Notificaciones v7.4] ⚠️ No user ID available');
      setLoading(false);
      return;
    }

    try {
      console.log('[Notificaciones v7.4] 🔍 Loading notifications for user:', user.id);
      
      const allNotifications: NotificationItem[] = [];

      // Query English table (notifications with user_id as TEXT)
      console.log('[Notificaciones v7.4] 📊 Querying "notifications" table');
      const { data: englishData, error: englishError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (englishError) {
        console.warn('[Notificaciones v7.4] ⚠️ English table error:', englishError.message);
      } else if (englishData && englishData.length > 0) {
        console.log('[Notificaciones v7.4] ✅ Found', englishData.length, 'notifications in English table');
        allNotifications.push(...englishData);
      }

      // Query Spanish table (notificaciones with usuario_id as UUID)
      // ✅ FIX v7.4: Join with usuarios table to get sender avatar
      console.log('[Notificaciones v7.4] 📊 Querying "notificaciones" table with usuarios join');
      const { data: spanishData, error: spanishError } = await supabase
        .from('notificaciones')
        .select(`
          *,
          sender:usuarios!notificaciones_usuario_origen_id_fkey(
            id,
            username,
            nombre,
            avatar
          )
        `)
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (spanishError) {
        console.warn('[Notificaciones v7.4] ⚠️ Spanish table error:', spanishError.message);
      } else if (spanishData && spanishData.length > 0) {
        console.log('[Notificaciones v7.4] ✅ Found', spanishData.length, 'notifications in Spanish table');
        
        // Map the data to include sender information
        const mappedSpanishData = spanishData.map((notif: any) => ({
          ...notif,
          sender_id: notif.sender?.id,
          sender_username: notif.sender?.username || notif.sender?.nombre || 'Usuario',
          sender_avatar_url: notif.sender?.avatar,
        }));
        
        console.log('[Notificaciones v7.4] 📊 Sample notification with avatar:', mappedSpanishData[0]);
        allNotifications.push(...mappedSpanishData);
      }

      // Sort by priority and date
      const sortedNotifications = sortNotificationsByPriority(allNotifications);
      
      // Aggregate similar notifications
      const aggregatedNotifications = aggregateSimilarNotifications(sortedNotifications);

      console.log('[Notificaciones v7.4] ✅ Total notifications:', aggregatedNotifications.length);
      setNotifications(aggregatedNotifications);
      setError(null);

      // Calculate unread count
      const unread = aggregatedNotifications.filter((n) => (n.read === false || n.leida === false)).length;
      setUnreadCount(unread);
      console.log('[Notificaciones v7.4] 📊 Unread count:', unread);

      // Clear badge count
      try {
        await Notifications.setBadgeCountAsync(0);
        console.log('[Notificaciones v7.4] ✅ Badge count cleared');
      } catch (badgeError) {
        console.error('[Notificaciones v7.4] ⚠️ Could not clear badge:', badgeError);
      }

    } catch (error: any) {
      console.error('[Notificaciones v7.4] ❌ Exception:', error);
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
  const aggregateSimilarNotifications = useCallback((notifications: NotificationItem[]): NotificationItem[] => {
    const aggregated: NotificationItem[] = [];
    const grouped = new Map<string, NotificationItem[]>();

    // Group notifications by type and related_id
    notifications.forEach((notif) => {
      const type = notif.type || notif.tipo || '';
      const relatedId = notif.related_id || notif.post_id || '';
      
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
  }, []);

  /**
   * Generate aggregated message (e.g., "Juan, María and 12 others liked your post")
   */
  const generateAggregatedMessage = (
    notif: NotificationItem,
    count: number,
    senders: { username: string }[]
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

    console.log('[Notificaciones v7.4] 📡 Setting up real-time subscription for both tables');

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
          console.log('[Notificaciones v7.4] 🔔 New notification (English table):', payload.new);
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
        async (payload) => {
          console.log('[Notificaciones v7.4] 🔔 New notification (Spanish table):', payload.new);
          
          // Fetch sender information for the new notification
          const notif = payload.new as any;
          if (notif.usuario_origen_id) {
            const { data: senderData } = await supabase
              .from('usuarios')
              .select('id, username, nombre, avatar')
              .eq('id', notif.usuario_origen_id)
              .single();
            
            if (senderData) {
              notif.sender_id = senderData.id;
              notif.sender_username = senderData.username || senderData.nombre || 'Usuario';
              notif.sender_avatar_url = senderData.avatar;
            }
          }
          
          const newNotification = notif as NotificationItem;
          setNotifications((prev) => [newNotification, ...prev]);
          
          // Haptic feedback
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      )
      .subscribe((status) => {
        console.log('[Notificaciones v7.4] 📡 Subscription status:', status);
      });

    return () => {
      console.log('[Notificaciones v7.4] 🧹 Cleaning up subscription');
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
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) {
      console.warn('[Notificaciones v7.4] ⚠️ No user ID, cannot mark as read');
      return;
    }

    try {
      console.log('[Notificaciones v7.4] 📖 Marcando como leída:', notificationId);
      
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
        console.warn('[Notificaciones v7.4] ⚠️ Error updating English table:', englishError.message);
      }

      // 4. Update database - Try Spanish table
      const { error: spanishError } = await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('id', notificationId)
        .eq('usuario_id', user.id);

      if (spanishError && spanishError.code !== 'PGRST116') {
        console.warn('[Notificaciones v7.4] ⚠️ Error updating Spanish table:', spanishError.message);
      }

      // 5. If both updates failed, revert optimistic update
      if (englishError && spanishError && 
          englishError.code !== 'PGRST116' && spanishError.code !== 'PGRST116') {
        console.error('[Notificaciones v7.4] ❌ Failed to update both tables');
        // Revert optimistic update
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: false, leida: false } : n))
        );
        if (wasUnread) {
          setUnreadCount((prev) => prev + 1);
        }
      } else {
        console.log('[Notificaciones v7.4] ✅ Notificación marcada como leída');
      }
    } catch (error: any) {
      console.error('[Notificaciones v7.4] ❌ Exception marking as read:', error.message);
      // Revert optimistic update on exception
      loadNotifications();
    }
  }, [user?.id, notifications, loadNotifications]);

  /**
   * Mark all as read (both tables)
   */
  const markAllAsRead = async () => {
    if (!user?.id) {
      console.warn('[Notificaciones v7.4] ⚠️ No user ID, cannot mark all as read');
      return;
    }

    try {
      console.log('[Notificaciones v7.4] 📖 Marcando todas como leídas');
      
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
        console.warn('[Notificaciones v7.4] ⚠️ Error updating English table:', englishError.message);
      }

      // 4. Update database - Spanish table
      const { error: spanishError } = await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('usuario_id', user.id)
        .eq('leida', false);

      if (spanishError) {
        console.warn('[Notificaciones v7.4] ⚠️ Error updating Spanish table:', spanishError.message);
      }

      // 5. If both updates failed, revert and show error
      if (englishError && spanishError) {
        console.error('[Notificaciones v7.4] ❌ Failed to update both tables');
        Alert.alert(
          'Error',
          'No se pudieron marcar todas las notificaciones como leídas. Por favor, intenta de nuevo.',
          [{ text: 'OK' }]
        );
        // Reload to get correct state
        loadNotifications();
      } else {
        console.log('[Notificaciones v7.4] ✅ Todas las notificaciones marcadas como leídas');
      }
    } catch (error: any) {
      console.error('[Notificaciones v7.4] ❌ Exception marking all as read:', error.message);
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
   */
  const deleteNotification = async (notificationId: string) => {
    if (!user?.id) {
      console.warn('[Notificaciones v7.4] ⚠️ No user ID, cannot delete');
      return;
    }

    try {
      console.log('[Notificaciones v7.4] 🗑️ Eliminando notificación:', notificationId);
      
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
        console.warn('[Notificaciones v7.4] ⚠️ Error deleting from English table:', englishError.message);
      }

      // 5. Delete from database - Try Spanish table
      const { error: spanishError } = await supabase
        .from('notificaciones')
        .delete()
        .eq('id', notificationId)
        .eq('usuario_id', user.id);

      if (spanishError && spanishError.code !== 'PGRST116') {
        console.warn('[Notificaciones v7.4] ⚠️ Error deleting from Spanish table:', spanishError.message);
      }

      // 6. If both deletes failed, revert optimistic update
      if (englishError && spanishError && 
          englishError.code !== 'PGRST116' && spanishError.code !== 'PGRST116') {
        console.error('[Notificaciones v7.4] ❌ Failed to delete from both tables');
        Alert.alert(
          'Error',
          'No se pudo eliminar la notificación. Por favor, intenta de nuevo.',
          [{ text: 'OK' }]
        );
        // Reload to get correct state
        loadNotifications();
      } else {
        console.log('[Notificaciones v7.4] ✅ Notificación eliminada');
      }
    } catch (error: any) {
      console.error('[Notificaciones v7.4] ❌ Exception deleting:', error.message);
      // Revert optimistic update
      loadNotifications();
    }
  };

  /**
   * Delete all notifications
   */
  const deleteAllNotifications = async () => {
    if (!user?.id) {
      console.warn('[Notificaciones v7.4] ⚠️ No user ID, cannot delete all');
      return;
    }

    try {
      console.log('[Notificaciones v7.4] 🗑️ Eliminando todas las notificaciones');
      
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
        console.warn('[Notificaciones v7.4] ⚠️ Error deleting from English table:', englishError.message);
      }

      // 5. Delete from database - Spanish table
      const { error: spanishError } = await supabase
        .from('notificaciones')
        .delete()
        .eq('usuario_id', user.id);

      if (spanishError) {
        console.warn('[Notificaciones v7.4] ⚠️ Error deleting from Spanish table:', spanishError.message);
      }

      // 6. If both deletes failed, show error and reload
      if (englishError && spanishError) {
        console.error('[Notificaciones v7.4] ❌ Failed to delete from both tables');
        Alert.alert(
          'Error',
          'No se pudieron eliminar todas las notificaciones. Por favor, intenta de nuevo.',
          [{ text: 'OK' }]
        );
        // Reload to get correct state
        loadNotifications();
      } else {
        console.log('[Notificaciones v7.4] ✅ Todas las notificaciones eliminadas');
      }
    } catch (error: any) {
      console.error('[Notificaciones v7.4] ❌ Exception deleting all:', error.message);
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
   */
  const handleNotificationPress = async (notification: NotificationItem) => {
    console.log('[Notificaciones v7.4] 👆 Usuario hizo clic en notificación');
    
    // 1. Mark as read immediately (optimistic update)
    const wasRead = notification.read || notification.leida;
    if (!wasRead) {
      await markAsRead(notification.id);
    }

    // 2. Haptic feedback for better UX
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // 3. Extract notification data (handle both English and Spanish fields)
    const type = (notification.type || notification.tipo || '').toLowerCase();
    const relatedId = notification.related_id || (notification as any).post_id;
    const relatedType = notification.related_type;
    const senderId = notification.sender_id || (notification as any).usuario_origen_id;
    const data = notification.data || {};

    console.log('[Notificaciones v7.4] 📊 Datos extraídos:', { type, relatedId, relatedType, senderId });

    // 4. Validate that we have a type
    if (!type) {
      console.error('[Notificaciones v7.4] ❌ CRÍTICO: Notificación sin tipo');
      Alert.alert(
        'Error',
        'Esta notificación está incompleta y no se puede procesar.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // 5. Navigate based on notification type
      switch (type) {
        case 'like': {
          const postId = relatedId || data.postId || data.post_id || data.entityId;
          if (postId) {
            console.log('[Notificaciones v7.4] ✅ Navegando a publicación:', postId);
            router.push(`/social/post?id=${postId}`);
          } else {
            Alert.alert(
              'Publicación no disponible',
              'La publicación asociada a este like no se pudo encontrar.',
              [{ text: 'OK' }]
            );
          }
          break;
        }

        case 'comment':
        case 'comentario': {
          const postId = relatedId || data.postId || data.post_id || data.entityId;
          const commentId = data.commentId || data.comment_id || (notification as any).comentario_id;
          if (postId) {
            if (commentId) {
              router.push(`/social/post?id=${postId}&scrollToComment=${commentId}`);
            } else {
              router.push(`/social/post?id=${postId}`);
            }
          } else {
            Alert.alert(
              'Publicación no disponible',
              'La publicación asociada a este comentario no se pudo encontrar.',
              [{ text: 'OK' }]
            );
          }
          break;
        }

        case 'follow':
        case 'seguidor': {
          const followerId = senderId || relatedId || data.userId || data.user_id || data.entityId;
          if (followerId) {
            router.push(`/perfil/usuario?userId=${followerId}`);
          } else {
            Alert.alert(
              'Perfil no disponible',
              'El perfil del usuario no se pudo encontrar.',
              [{ text: 'OK' }]
            );
          }
          break;
        }

        case 'mention':
        case 'mencion': {
          const postId = relatedId || data.postId || data.post_id || data.entityId;
          const commentId = data.commentId || data.comment_id;
          if (postId) {
            if (commentId) {
              router.push(`/social/post?id=${postId}&scrollToComment=${commentId}`);
            } else {
              router.push(`/social/post?id=${postId}`);
            }
          } else {
            Alert.alert(
              'Contenido no disponible',
              'El contenido donde fuiste mencionado no se pudo encontrar.',
              [{ text: 'OK' }]
            );
          }
          break;
        }

        case 'event':
        case 'evento': {
          const eventId = relatedId || data.eventId || data.event_id || data.entityId;
          if (eventId) {
            router.push(`/detalle/evento?id=${eventId}`);
          } else {
            Alert.alert(
              'Evento no disponible',
              'El evento asociado a esta notificación no se pudo encontrar.',
              [{ text: 'OK' }]
            );
          }
          break;
        }

        case 'message':
        case 'mensaje':
        case 'mensaje_privado': {
          const conversationId = relatedId || data.conversationId || data.conversation_id || data.entityId;
          const chatUserId = senderId || data.userId || data.user_id;
          if (conversationId) {
            router.push(`/chat/conversacion?conversationId=${conversationId}`);
          } else if (chatUserId) {
            router.push(`/chat/conversacion?userId=${chatUserId}`);
          } else {
            Alert.alert(
              'Conversación no disponible',
              'La conversación asociada a esta notificación no se pudo encontrar.',
              [{ text: 'OK' }]
            );
          }
          break;
        }

        case 'cheers':
        case 'saludos': {
          const localId = relatedId || data.localId || data.local_id || data.entityId || (notification as any).local_origen_id;
          if (localId) {
            router.push(`/detalle/sala-virtual-enhanced?localId=${localId}`);
          } else {
            Alert.alert(
              'Sala virtual no disponible',
              'La sala virtual asociada a esta notificación no se pudo encontrar.',
              [{ text: 'OK' }]
            );
          }
          break;
        }

        case 'plan_purchase':
        case 'plan_renewal':
        case 'compra_plan':
        case 'renovacion_plan': {
          router.push('/gestion/mi-suscripcion');
          break;
        }

        case 'featured_local_reminder':
        case 'recordatorio_local': {
          const featuredLocalId = relatedId || data.localId || data.local_id || data.entityId;
          if (featuredLocalId) {
            router.push(`/gestion/mis-locales?localId=${featuredLocalId}`);
          } else {
            router.push('/gestion/mis-locales');
          }
          break;
        }

        case 'urgent':
        case 'urgente':
        case 'sistema':
        case 'system': {
          const actionUrl = data.actionUrl || data.action_url || data.url;
          if (actionUrl) {
            router.push(actionUrl);
          } else {
            const title = notification.title || notification.titulo || 'Notificación del sistema';
            const body = notification.body || notification.mensaje || '';
            Alert.alert(title, body, [{ text: 'OK' }]);
          }
          break;
        }

        case 'promo':
        case 'promocion': {
          const promoUrl = data.promoUrl || data.promo_url || data.url;
          const promoLocalId = relatedId || data.localId || data.local_id || data.entityId;
          if (promoUrl) {
            router.push(promoUrl);
          } else if (promoLocalId) {
            router.push(`/detalle/local?id=${promoLocalId}`);
          } else {
            const title = notification.title || notification.titulo || 'Promoción especial';
            const body = notification.body || notification.mensaje || '';
            Alert.alert(
              title,
              body,
              [{ text: 'Ver más', onPress: () => router.push('/explorar') }, { text: 'Cerrar' }]
            );
          }
          break;
        }

        default: {
          console.warn('[Notificaciones v7.4] ⚠️ TIPO DESCONOCIDO:', type);
          const title = notification.title || notification.titulo || 'Notificación';
          const body = notification.body || notification.mensaje || '';
          Alert.alert(
            title,
            body || 'Esta notificación no tiene una acción específica asociada.',
            [{ text: 'OK' }]
          );
          break;
        }
      }
      
      console.log('[Notificaciones v7.4] ✅ Navegación completada');
    } catch (error: any) {
      console.error('[Notificaciones v7.4] ❌ ERROR DE NAVEGACIÓN:', error.message);
      Alert.alert(
        'Contenido no disponible',
        'Este contenido ya no está disponible. Es posible que haya sido eliminado o que no tengas acceso a él.',
        [{ text: 'OK' }]
      );
    }
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
   * Handle avatar error
   */
  const handleAvatarError = useCallback((notificationId: string) => {
    console.log('[Notificaciones v7.4] ⚠️ Avatar error for notification:', notificationId);
    setAvatarErrors((prev) => ({ ...prev, [notificationId]: true }));
  }, []);

  /**
   * Render notification item (handles both English and Spanish fields)
   * ✅ FIX v7.5: Show username initial when no avatar URL (don't wait for error)
   */
  const renderNotification = useCallback((notification: NotificationItem) => {
    const timeAgo = formatTimeAgo(notification.created_at);
    
    // Handle both English and Spanish field names
    const body = notification.body || notification.mensaje || '';
    const isRead = notification.read || notification.leida || false;
    const avatar = notification.sender_avatar_url;
    const senderUsername = notification.sender_username || 'Usuario';
    const isAggregated = (notification.count || 0) > 1;

    // Get first letter of username for fallback avatar
    const firstLetter = senderUsername.charAt(0).toUpperCase();
    
    // Check if avatar failed to load OR if there's no avatar URL
    const avatarError = avatarErrors[notification.id] || false;
    const shouldShowAvatar = avatar && !avatarError;

    console.log('[Notificaciones v7.5] 🎨 Rendering notification:', {
      id: notification.id,
      avatar,
      senderUsername,
      avatarError,
      shouldShowAvatar,
      firstLetter
    });

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
            {shouldShowAvatar ? (
              <Image 
                source={{ uri: avatar }} 
                style={styles.avatar}
                onError={() => {
                  console.log('[Notificaciones v7.5] ⚠️ Error loading avatar:', avatar);
                  handleAvatarError(notification.id);
                }}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>{firstLetter}</Text>
              </View>
            )}
            {isAggregated && notification.recent_senders && notification.recent_senders.length > 1 && (
              <View style={styles.avatarStack}>
                {notification.recent_senders.slice(1, 3).map((sender, index) => {
                  const senderFirstLetter = (sender.username || 'U').charAt(0).toUpperCase();
                  const stackedAvatarError = avatarErrors[`${notification.id}-${sender.id}`] || false;
                  const shouldShowStackedAvatar = sender.avatar_url && !stackedAvatarError;
                  
                  return shouldShowStackedAvatar ? (
                    <Image
                      key={sender.id}
                      source={{ uri: sender.avatar_url }}
                      style={[styles.stackedAvatar, { right: (index + 1) * 12 }]}
                      onError={() => {
                        console.log('[Notificaciones v7.5] ⚠️ Error loading stacked avatar:', sender.avatar_url);
                        handleAvatarError(`${notification.id}-${sender.id}`);
                      }}
                    />
                  ) : (
                    <View 
                      key={sender.id}
                      style={[styles.stackedAvatarPlaceholder, { right: (index + 1) * 12 }]}
                    >
                      <Text style={styles.stackedAvatarLetter}>{senderFirstLetter}</Text>
                    </View>
                  );
                })}
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
  }, [avatarErrors, handleAvatarError, handleNotificationPress]);

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
  avatarLetter: {
    fontSize: scaleFontSize(20),
    fontWeight: '700',
    color: colors.primary,
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
  stackedAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.background,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  stackedAvatarLetter: {
    fontSize: scaleFontSize(10),
    fontWeight: '700',
    color: colors.primary,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
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
