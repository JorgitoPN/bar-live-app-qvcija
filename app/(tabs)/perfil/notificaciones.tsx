
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Platform, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import {
  registerForPushNotifications,
  savePushToken,
  arePushNotificationsAvailable,
  scheduleTestNotification,
} from '@/utils/notifications';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

interface NotificationSettings {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  mentions: boolean;
  events: boolean;
  messages: boolean;
  cheers: boolean;
}

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'event' | 'message' | 'cheers';
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  data?: any;
}

export default function Notificaciones() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    likes: true,
    comments: true,
    follows: true,
    mentions: true,
    events: true,
    messages: true,
    cheers: true,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const pushAvailable = arePushNotificationsAvailable();

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('[Notificaciones] Cargando notificaciones del usuario...');
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[Notificaciones] Error cargando notificaciones:', error);
      } else {
        console.log('[Notificaciones] Notificaciones cargadas:', data?.length || 0);
        setNotifications(data || []);
      }
    } catch (error) {
      console.error('[Notificaciones] Error en loadNotifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const loadSettings = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data && !error) {
        setSettings({
          likes: data.likes ?? true,
          comments: data.comments ?? true,
          follows: data.follows ?? true,
          mentions: data.mentions ?? true,
          events: data.events ?? true,
          messages: data.messages ?? true,
          cheers: data.cheers ?? true,
        });
      }
    } catch (error) {
      console.error('[Notificaciones] Error cargando configuración:', error);
    }
  }, [user]);

  const setupPushNotifications = useCallback(async () => {
    if (!user || !pushAvailable) {
      console.log('[Notificaciones] Push notifications no disponibles');
      return;
    }

    try {
      const token = await registerForPushNotifications();
      if (token) {
        setPushToken(token);
        await savePushToken(user.id, token);
      }
    } catch (error) {
      console.error('Error configurando push notifications:', error);
    }
  }, [user, pushAvailable]);

  useEffect(() => {
    loadNotifications();
    loadSettings();
    setupPushNotifications();
  }, [loadNotifications, loadSettings, setupPushNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (!error) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
      }
    } catch (error) {
      console.error('[Notificaciones] Error marcando como leída:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (!error) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('[Notificaciones] Error marcando todas como leídas:', error);
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
      console.error('[Notificaciones] Error eliminando notificación:', error);
    }
  };

  const getNotificationIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      like: '❤️',
      comment: '💬',
      follow: '👥',
      mention: '@',
      event: '📅',
      message: '✉️',
      cheers: '🍻',
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

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    if (!user) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          ...newSettings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error guardando configuración:', error);
        Alert.alert('Error', 'No se pudo guardar la configuración');
        setSettings(settings);
      }
    } catch (error) {
      console.error('Error en updateSetting:', error);
      Alert.alert('Error', 'No se pudo guardar la configuración');
      setSettings(settings);
    }
  };

  const testNotification = async () => {
    try {
      await scheduleTestNotification();
      Alert.alert(
        '✅ Notificación Programada',
        'Recibirás una notificación de prueba en 2 segundos',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error enviando notificación de prueba:', error);
      Alert.alert('Error', 'No se pudo enviar la notificación de prueba');
    }
  };

  // ✅ ANDROID SCALING: Icon sizes
  const backIconSize = Platform.OS === 'android' ? scaleIconSize(24) : 24;
  const infoIconSize = Platform.OS === 'android' ? scaleIconSize(24) : 24;
  const warningIconSize = Platform.OS === 'android' ? scaleIconSize(20) : 20;
  const chevronIconSize = Platform.OS === 'android' ? scaleIconSize(20) : 20;
  const checkIconSize = Platform.OS === 'android' ? scaleIconSize(20) : 20;

  const NotificationToggle = ({
    icon,
    title,
    description,
    value,
    onValueChange,
  }: {
    icon: string;
    title: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
  }) => (
    <View style={{
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      <View style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
      }}>
        <Text style={{ fontSize: scaleFontSize(20) }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: scaleFontSize(16), fontWeight: '600', color: colors.text, marginBottom: 4 }}>
          {title}
        </Text>
        <Text style={{ fontSize: scaleFontSize(13), color: colors.textSecondary }}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary + '80' }}
        thumbColor={value ? colors.primary : colors.textSecondary}
      />
    </View>
  );

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
          backgroundColor: notification.read ? colors.card : colors.primary + '10',
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          flexDirection: 'row',
          alignItems: 'flex-start',
          borderLeftWidth: 3,
          borderLeftColor: notification.read ? 'transparent' : colors.primary,
        }}
      >
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.primary + '20',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}>
          <Text style={{ fontSize: scaleFontSize(20) }}>{notificationIcon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: scaleFontSize(15),
            fontWeight: notification.read ? '400' : '600',
            color: colors.text,
            marginBottom: 4,
          }}>
            {notification.title}
          </Text>
          <Text style={{
            fontSize: scaleFontSize(14),
            color: colors.textSecondary,
            marginBottom: 6,
          }}>
            {notification.body}
          </Text>
          <Text style={{
            fontSize: scaleFontSize(12),
            color: colors.textSecondary,
          }}>
            {timeAgo}
          </Text>
        </View>
        {!notification.read && (
          <View style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.primary,
            marginLeft: 8,
            marginTop: 6,
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
          <Text style={{ fontSize: scaleFontSize(48), marginBottom: 16 }}>🔔</Text>
          <Text style={{ fontSize: scaleFontSize(18), fontWeight: '600', color: colors.text, marginBottom: 8, textAlign: 'center' }}>
            Inicia sesión para ver tus notificaciones
          </Text>
          <Text style={{ fontSize: scaleFontSize(14), color: colors.textSecondary, textAlign: 'center' }}>
            Recibe actualizaciones sobre likes, comentarios, seguidores y más
          </Text>
        </View>
      );
    }

    if (notifications.length === 0) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: scaleFontSize(48), marginBottom: 16 }}>🔕</Text>
          <Text style={{ fontSize: scaleFontSize(18), fontWeight: '600', color: colors.text, marginBottom: 8, textAlign: 'center' }}>
            No tienes notificaciones
          </Text>
          <Text style={{ fontSize: scaleFontSize(14), color: colors.textSecondary, textAlign: 'center' }}>
            Cuando recibas likes, comentarios o seguidores, aparecerán aquí
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
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
              backgroundColor: colors.primary,
              borderRadius: 12,
              padding: 12,
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: scaleFontSize(14), fontWeight: '600', color: '#FFFFFF' }}>
              Marcar todas como leídas ({unreadCount})
            </Text>
          </TouchableOpacity>
        )}

        {notifications.map(renderNotificationItem)}
      </ScrollView>
    );
  };

  const renderSettingsTab = () => {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {!pushAvailable && Platform.OS === 'android' && (
          <TouchableOpacity
            onPress={() => router.push('/perfil/notificaciones-info')}
            style={{
              backgroundColor: colors.warning + '20',
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: colors.warning,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <IconSymbol
                ios_icon_name="exclamationmark.triangle.fill"
                android_material_icon_name="warning"
                size={warningIconSize}
                color={colors.warning}
              />
              <Text style={{
                fontSize: scaleFontSize(14),
                fontWeight: '600',
                color: colors.text,
                marginLeft: 8,
                flex: 1,
              }}>
                Notificaciones Push No Disponibles
              </Text>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={chevronIconSize}
                color={colors.textSecondary}
              />
            </View>
            <Text style={{ fontSize: scaleFontSize(13), color: colors.textSecondary, lineHeight: 18 }}>
              Las notificaciones push requieren un development build en Android. 
              Toca para más información.
            </Text>
          </TouchableOpacity>
        )}

        {pushAvailable && (
          <TouchableOpacity
            onPress={testNotification}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <Text style={{ fontSize: scaleFontSize(16), fontWeight: '600', color: '#FFFFFF' }}>
              🔔 Probar Notificación
            </Text>
          </TouchableOpacity>
        )}

        <Text style={{
          fontSize: scaleFontSize(18),
          fontWeight: '600',
          color: colors.text,
          marginBottom: 16,
        }}>
          Preferencias de Notificaciones
        </Text>

        <NotificationToggle
          icon="❤️"
          title="Me gusta"
          description="Cuando alguien le da me gusta a tu publicación"
          value={settings.likes}
          onValueChange={(value) => updateSetting('likes', value)}
        />

        <NotificationToggle
          icon="💬"
          title="Comentarios"
          description="Cuando alguien comenta en tu publicación"
          value={settings.comments}
          onValueChange={(value) => updateSetting('comments', value)}
        />

        <NotificationToggle
          icon="👥"
          title="Nuevos seguidores"
          description="Cuando alguien empieza a seguirte"
          value={settings.follows}
          onValueChange={(value) => updateSetting('follows', value)}
        />

        <NotificationToggle
          icon="@"
          title="Menciones"
          description="Cuando alguien te menciona en una publicación"
          value={settings.mentions}
          onValueChange={(value) => updateSetting('mentions', value)}
        />

        <NotificationToggle
          icon="📅"
          title="Eventos"
          description="Recordatorios de eventos y actualizaciones"
          value={settings.events}
          onValueChange={(value) => updateSetting('events', value)}
        />

        <NotificationToggle
          icon="✉️"
          title="Mensajes"
          description="Cuando recibes un nuevo mensaje"
          value={settings.messages}
          onValueChange={(value) => updateSetting('messages', value)}
        />

        <NotificationToggle
          icon="🍻"
          title="Brindis"
          description="Cuando alguien te envía un brindis"
          value={settings.cheers}
          onValueChange={(value) => updateSetting('cheers', value)}
        />

        {pushToken && (
          <View style={{
            backgroundColor: colors.success + '20',
            borderRadius: 12,
            padding: 16,
            marginTop: 24,
            borderWidth: 1,
            borderColor: colors.success,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={checkIconSize}
                color={colors.success}
              />
              <Text style={{
                fontSize: scaleFontSize(14),
                fontWeight: '600',
                color: colors.text,
                marginLeft: 8,
              }}>
                Notificaciones Push Activas
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{
        paddingTop: Platform.OS === 'android' ? 48 : 60,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingBottom: 16,
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 16 }}
          >
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow_back"
              size={backIconSize}
              color={colors.text}
            />
          </TouchableOpacity>
          <Text style={{ fontSize: scaleFontSize(20), fontWeight: '600', color: colors.text, flex: 1 }}>
            Notificaciones
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/perfil/notificaciones-info')}
          >
            <IconSymbol
              ios_icon_name="info.circle"
              android_material_icon_name="info"
              size={infoIconSize}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        <View style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          paddingBottom: 8,
        }}>
          <TouchableOpacity
            onPress={() => setActiveTab('notifications')}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderBottomWidth: 2,
              borderBottomColor: activeTab === 'notifications' ? colors.primary : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text style={{
              fontSize: scaleFontSize(15),
              fontWeight: activeTab === 'notifications' ? '600' : '400',
              color: activeTab === 'notifications' ? colors.primary : colors.textSecondary,
            }}>
              Notificaciones {unreadCount > 0 && `(${unreadCount})`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('settings')}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderBottomWidth: 2,
              borderBottomColor: activeTab === 'settings' ? colors.primary : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text style={{
              fontSize: scaleFontSize(15),
              fontWeight: activeTab === 'settings' ? '600' : '400',
              color: activeTab === 'settings' ? colors.primary : colors.textSecondary,
            }}>
              Configuración
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'notifications' ? renderNotificationsTab() : renderSettingsTab()}
    </View>
  );
}
