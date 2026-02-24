
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';
import type { NotificationType } from '@/app/integrations/supabase/types';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  data?: any;
}

/**
 * ✅ NOTIFICACIONES SCREEN v3.3 - WELCOME NOTIFICATION FILTER
 * 
 * NEW CHANGES v3.3:
 * - ✅ FIXED: Welcome notification no longer appears in notifications list
 * - ✅ ADDED: Filter to remove "Bienvenido a Barlive" system message
 * - ✅ IMPROVED: Cleaner notifications feed without test messages
 * 
 * PREVIOUS v3.2:
 * - ✅ ADDED: Real-time notifications using Supabase Realtime
 * - ✅ IMPROVED: Notifications appear instantly without refresh
 * - ✅ REMOVED: Info icon from header for cleaner UI
 * - ✅ IMPROVED: Haptic feedback when new notification arrives
 * 
 * PREVIOUS v3.1:
 * - ✅ ADDED: Support for new notification types:
 *   - plan_purchase: Compras de planes
 *   - plan_renewal: Renovaciones automáticas de planes
 *   - featured_local_reminder: Tiempo restante de locales destacados
 * - ✅ IMPROVED: Icon mapping for all notification types
 * - ✅ IMPROVED: Better visual distinction for business notifications
 */

export default function Notificaciones() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('[Notificaciones v3.3] Cargando notificaciones del usuario...');
      
      // Load from the notifications table
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[Notificaciones v3.3] Error cargando notificaciones:', error);
        setNotifications([]);
      } else {
        console.log('[Notificaciones v3.3] Notificaciones cargadas:', data?.length || 0);
        
        // ✅ v3.3: Filter out welcome notification
        const filteredNotifications = (data || []).filter(notification => {
          const isWelcomeNotification = 
            notification.title?.includes('Bienvenido') || 
            notification.title?.includes('bienvenido') ||
            notification.body?.includes('sistema de notificaciones está activo') ||
            notification.body?.includes('funcionando correctamente');
          
          if (isWelcomeNotification) {
            console.log('[Notificaciones v3.3] 🚫 Filtering out welcome notification:', notification.id);
          }
          
          return !isWelcomeNotification;
        });
        
        console.log('[Notificaciones v3.3] ✅ Filtered notifications:', filteredNotifications.length);
        setNotifications(filteredNotifications);
      }
    } catch (error) {
      console.error('[Notificaciones v3.3] Error en loadNotifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Clear badge count when viewing notifications
  const clearBadgeCount = useCallback(async () => {
    try {
      const { setBadgeCountAsync } = await import('expo-notifications');
      await setBadgeCountAsync(0);
      console.log('[Notificaciones v3.1] Badge count cleared');
    } catch (error) {
      console.error('[Notificaciones v3.1] Error clearing badge:', error);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    clearBadgeCount();
    
    // ✅ REAL-TIME NOTIFICATIONS: Subscribe to new notifications
    if (!user) return;
    
    console.log('[Notificaciones v3.2] 🔔 Subscribing to real-time notifications for user:', user.id);
    
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Notificaciones v3.2] 🔔 New notification received:', payload.new);
          
          // Add new notification to the top of the list
          setNotifications((prev) => [payload.new as Notification, ...prev]);
          
          // Show a subtle haptic feedback
          import('expo-haptics').then(Haptics => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          });
        }
      )
      .subscribe();
    
    console.log('[Notificaciones v3.2] ✅ Real-time subscription active');
    
    return () => {
      console.log('[Notificaciones v3.2] 🔕 Unsubscribing from real-time notifications');
      supabase.removeChannel(channel);
    };
  }, [loadNotifications, clearBadgeCount, user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (!error) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
      }
    } catch (error) {
      console.error('[Notificaciones v3.1] Error marcando como leída:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('read', false);

      if (!error) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('[Notificaciones v3.1] Error marcando todas como leídas:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (!error) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (error) {
      console.error('[Notificaciones v3.1] Error eliminando notificación:', error);
    }
  };

  const getNotificationIcon = (type: NotificationType): string => {
    const iconMap: Record<NotificationType, string> = {
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
      urgent: '🚨',
      promo: '🎁',
    };
    return iconMap[type] || '🔔';
  };

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

  const backIconSize = Platform.OS === 'android' ? scaleIconSize(24) : 24;
  const infoIconSize = Platform.OS === 'android' ? scaleIconSize(24) : 24;

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderNotificationItem = (notification: Notification) => {
    const notificationIcon = getNotificationIcon(notification.type);
    const timeAgo = formatTimeAgo(notification.created_at);

    return (
      <TouchableOpacity
        key={notification.id}
        onPress={() => markAsRead(notification.id)}
        onLongPress={() => {
          Alert.alert(
            'Eliminar notificación',
            '¿Estás seguro de que quieres eliminar esta notificación?',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Eliminar', style: 'destructive', onPress: () => deleteNotification(notification.id) },
            ]
          );
        }}
        style={{
          backgroundColor: notification.read ? colors.cardBackground : colors.primary + '08',
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          flexDirection: 'row',
          alignItems: 'flex-start',
          borderLeftWidth: 4,
          borderLeftColor: notification.read ? 'transparent' : colors.primary,
          borderWidth: 1,
          borderColor: notification.read ? colors.cardBorder : colors.primary + '30',
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 3,
            },
            android: {
              elevation: notification.read ? 0 : 1,
            },
          }),
        }}
      >
        <View style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: notification.read ? colors.cardBorder : colors.primary + '20',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
        }}>
          <Text style={{ fontSize: scaleFontSize(22) }}>{notificationIcon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: scaleFontSize(15),
            fontWeight: notification.read ? '500' : '700',
            color: colors.text,
            marginBottom: 6,
            lineHeight: 20,
          }}>
            {notification.title}
          </Text>
          <Text style={{
            fontSize: scaleFontSize(14),
            color: colors.textSecondary,
            marginBottom: 8,
            lineHeight: 19,
          }}>
            {notification.body}
          </Text>
          <Text style={{
            fontSize: scaleFontSize(12),
            color: colors.textTertiary,
            fontWeight: '500',
          }}>
            {timeAgo}
          </Text>
        </View>
        {!notification.read && (
          <View style={{
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
          }} />
        )}
      </TouchableOpacity>
    );
  };

  const renderNotificationsTab = () => {
    if (loading) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ fontSize: scaleFontSize(14), color: colors.textSecondary, marginTop: 16 }}>
            Cargando notificaciones...
          </Text>
        </View>
      );
    }

    if (!user) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: colors.primary + '15',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}>
            <Text style={{ fontSize: scaleFontSize(48) }}>🔔</Text>
          </View>
          <Text style={{ fontSize: scaleFontSize(20), fontWeight: '700', color: colors.text, marginBottom: 12, textAlign: 'center' }}>
            Inicia sesión para ver tus notificaciones
          </Text>
          <Text style={{ fontSize: scaleFontSize(15), color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }}>
            Recibe actualizaciones sobre likes, comentarios, seguidores y más
          </Text>
        </View>
      );
    }

    if (notifications.length === 0) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: colors.cardBorder,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}>
            <Text style={{ fontSize: scaleFontSize(48) }}>🔕</Text>
          </View>
          <Text style={{ fontSize: scaleFontSize(20), fontWeight: '700', color: colors.text, marginBottom: 12, textAlign: 'center' }}>
            No tienes notificaciones
          </Text>
          <Text style={{ fontSize: scaleFontSize(15), color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }}>
            Cuando recibas likes, comentarios o seguidores, aparecerán aquí
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
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
          <TouchableOpacity
            onPress={markAllAsRead}
            style={{
              borderRadius: 14,
              padding: 14,
              alignItems: 'center',
              marginBottom: 20,
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
            <Text style={{ fontSize: scaleFontSize(15), fontWeight: '700', color: '#FFFFFF' }}>
              Marcar todas como leídas ({unreadCount})
            </Text>
          </TouchableOpacity>
        )}

        {notifications.map(renderNotificationItem)}
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingTop: Platform.OS === 'android' ? 48 : 60,
          paddingBottom: 16,
        }}
      >
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 16 }}
          >
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow_back"
              size={backIconSize}
              color={colors.headerText}
            />
          </TouchableOpacity>
          <Text style={{ fontSize: scaleFontSize(24), fontWeight: '700', color: colors.headerText, flex: 1 }}>
            Notificaciones {unreadCount > 0 && `(${unreadCount})`}
          </Text>
        </View>
      </LinearGradient>

      {renderNotificationsTab()}
    </View>
  );
}
