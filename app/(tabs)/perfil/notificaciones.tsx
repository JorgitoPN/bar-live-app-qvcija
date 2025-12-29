
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Platform, Alert } from 'react-native';
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

interface NotificationSettings {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  mentions: boolean;
  events: boolean;
  messages: boolean;
  cheers: boolean;
}

export default function Notificaciones() {
  const router = useRouter();
  const { user } = useAuth();
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
  const [pushToken, setPushToken] = useState<string | null>(null);
  const pushAvailable = arePushNotificationsAvailable();

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
      console.error('Error cargando configuración:', error);
    } finally {
      setLoading(false);
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
    loadSettings();
    setupPushNotifications();
  }, [loadSettings, setupPushNotifications]);

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
        <Text style={{ fontSize: 20 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
          {title}
        </Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary }}>
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? 48 : 60,
        paddingBottom: 16,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 16 }}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text, flex: 1 }}>
          Notificaciones
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/perfil/notificaciones-info')}
        >
          <IconSymbol
            ios_icon_name="info.circle"
            android_material_icon_name="info"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Push Notifications Status */}
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
                size={20}
                color={colors.warning}
              />
              <Text style={{
                fontSize: 14,
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
                size={20}
                color={colors.textSecondary}
              />
            </View>
            <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
              Las notificaciones push requieren un development build en Android. 
              Toca para más información.
            </Text>
          </TouchableOpacity>
        )}

        {/* Test Notification Button */}
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
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
            🔔 Probar Notificación
          </Text>
        </TouchableOpacity>

        {/* Notification Settings */}
        <Text style={{
          fontSize: 18,
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

        {/* Status Info */}
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
                size={20}
                color={colors.success}
              />
              <Text style={{
                fontSize: 14,
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
    </View>
  );
}
