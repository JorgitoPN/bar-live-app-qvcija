
import React, { useState, useEffect, useCallback } from 'react';
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

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NOTIFICACIONES SCREEN v4.0 - COMPLETE REBUILD FROM SCRATCH
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 🔥 REBUILT FROM SCRATCH BY SENIOR EXPERT
 * 
 * CRITICAL FIXES:
 * ✅ Proper database query with error handling
 * ✅ Badge count synchronization
 * ✅ Real-time subscription with proper cleanup
 * ✅ Dual table support (notifications/notificaciones)
 * ✅ Proper loading states
 * ✅ Enhanced error logging
 * ✅ Clean architecture
 * 
 * ARCHITECTURE:
 * - Single source of truth for notifications
 * - Proper state management
 * - Comprehensive error handling
 * - Real-time updates via Supabase
 * - Badge count management
 */

interface Notification {
  id: string;
  user_id?: string;
  usuario_id?: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  data?: any;
}

export default function NotificacionesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load notifications from database
   * Tries both table names (notifications and notificaciones)
   */
  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      console.log('[Notificaciones v4.0] ⚠️ No user ID available');
      setLoading(false);
      return;
    }

    try {
      console.log('[Notificaciones v4.0] 🔍 Loading notifications for user:', user.id);
      
      // Try English table first (notifications with user_id)
      const { data: englishData, error: englishError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (englishError) {
        console.log('[Notificaciones v4.0] ⚠️ English table error:', englishError.message);
        console.log('[Notificaciones v4.0] 🔄 Trying Spanish table...');
        
        // Try Spanish table (notificaciones with usuario_id)
        const { data: spanishData, error: spanishError } = await supabase
          .from('notificaciones')
          .select('*')
          .eq('usuario_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (spanishError) {
          console.error('[Notificaciones v4.0] ❌ Both tables failed');
          console.error('[Notificaciones v4.0] English error:', englishError);
          console.error('[Notificaciones v4.0] Spanish error:', spanishError);
          setError('No se pudieron cargar las notificaciones');
          setNotifications([]);
          return;
        }

        console.log('[Notificaciones v4.0] ✅ Loaded from Spanish table:', spanishData?.length || 0);
        setNotifications(spanishData || []);
        setError(null);
      } else {
        console.log('[Notificaciones v4.0] ✅ Loaded from English table:', englishData?.length || 0);
        setNotifications(englishData || []);
        setError(null);
      }

      // Clear badge count when viewing notifications
      try {
        await Notifications.setBadgeCountAsync(0);
        console.log('[Notificaciones v4.0] ✅ Badge count cleared');
      } catch (badgeError) {
        console.error('[Notificaciones v4.0] ⚠️ Could not clear badge:', badgeError);
      }

    } catch (error: any) {
      console.error('[Notificaciones v4.0] ❌ Exception:', error);
      setError('Error al cargar notificaciones');
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  /**
   * Setup real-time subscription
   */
  useEffect(() => {
    if (!user?.id) return;

    console.log('[Notificaciones v4.0] 📡 Setting up real-time subscription');

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Notificaciones v4.0] 🔔 New notification (English table):', payload.new);
          const newNotification = payload.new as Notification;
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
          console.log('[Notificaciones v4.0] 🔔 New notification (Spanish table):', payload.new);
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          
          // Haptic feedback
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      )
      .subscribe((status) => {
        console.log('[Notificaciones v4.0] 📡 Subscription status:', status);
      });

    return () => {
      console.log('[Notificaciones v4.0] 🧹 Cleaning up subscription');
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
   * Mark notification as read
   */
  const markAsRead = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      // Try English table first
      const { error: englishError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (englishError) {
        // Try Spanish table
        await supabase
          .from('notificaciones')
          .update({ read: true })
          .eq('id', notificationId)
          .eq('usuario_id', user.id);
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('[Notificaciones v4.0] ❌ Error marking as read:', error);
    }
  };

  /**
   * Mark all as read
   */
  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      // Try English table
      const { error: englishError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (englishError) {
        // Try Spanish table
        await supabase
          .from('notificaciones')
          .update({ read: true })
          .eq('usuario_id', user.id)
          .eq('read', false);
      }

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error('[Notificaciones v4.0] ❌ Error marking all as read:', error);
    }
  };

  /**
   * Delete notification
   */
  const deleteNotification = async (notificationId: string) => {
    if (!user?.id) return;

    Alert.alert(
      'Eliminar notificación',
      '¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Try English table
              const { error: englishError } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId)
                .eq('user_id', user.id);

              if (englishError) {
                // Try Spanish table
                await supabase
                  .from('notificaciones')
                  .delete()
                  .eq('id', notificationId)
                  .eq('usuario_id', user.id);
              }

              // Update local state
              setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
            } catch (error) {
              console.error('[Notificaciones v4.0] ❌ Error deleting:', error);
            }
          },
        },
      ]
    );
  };

  /**
   * Get icon for notification type
   */
  const getNotificationIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      like: '❤️',
      comment: '💬',
      follow: '👥',
      mention: '@',
      event: '📅',
      message: '✉️',
      cheers: '🍻',
      plan_purchase: '💳',
      plan_renewal: '🔄',
      featured_local_reminder: '⭐',
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
   * Render notification item
   */
  const renderNotification = (notification: Notification) => {
    const icon = getNotificationIcon(notification.type);
    const timeAgo = formatTimeAgo(notification.created_at);

    return (
      <TouchableOpacity
        key={notification.id}
        onPress={() => markAsRead(notification.id)}
        onLongPress={() => deleteNotification(notification.id)}
        style={[
          styles.notificationCard,
          !notification.read && styles.notificationCardUnread,
        ]}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
        <View style={styles.contentContainer}>
          <Text style={[styles.title, !notification.read && styles.titleUnread]}>
            {notification.title}
          </Text>
          <Text style={styles.body}>{notification.body}</Text>
          <Text style={styles.time}>{timeAgo}</Text>
        </View>
        {!notification.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

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
        <View style={{ width: 40 }} />
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
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.markAllGradient}
            >
              <Text style={styles.markAllText}>
                Marcar todas como leídas ({unreadCount})
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {notifications.map(renderNotification)}
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
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
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
    padding: 16,
    paddingBottom: 100,
  },
  markAllButton: {
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
  },
  markAllGradient: {
    padding: 14,
    alignItems: 'center',
  },
  markAllText: {
    fontSize: scaleFontSize(15),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notificationCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  notificationCardUnread: {
    backgroundColor: colors.primary + '08',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderColor: colors.primary + '30',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconText: {
    fontSize: scaleFontSize(22),
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: scaleFontSize(15),
    fontWeight: '500',
    color: colors.text,
    marginBottom: 6,
    lineHeight: 20,
  },
  titleUnread: {
    fontWeight: '700',
  },
  body: {
    fontSize: scaleFontSize(14),
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 19,
  },
  time: {
    fontSize: scaleFontSize(12),
    color: colors.textTertiary,
    fontWeight: '500',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginLeft: 10,
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});
