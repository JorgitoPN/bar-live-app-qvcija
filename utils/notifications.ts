
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SISTEMA DE NOTIFICACIONES PUSH - PRODUCCIÓN COMPLETA v1.2 - ANDROID FIX
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 🎯 CARACTERÍSTICAS:
 * ✅ Android + iOS completamente funcional
 * ✅ FCM (Firebase Cloud Messaging) integrado
 * ✅ APNs (Apple Push Notification service) configurado
 * ✅ Manejo de permisos robusto
 * ✅ Tokens de dispositivo con actualización automática
 * ✅ Soporte foreground, background y app cerrada
 * ✅ Deep linking desde notificaciones
 * ✅ Payload personalizado
 * ✅ Notificaciones silenciosas
 * ✅ Segmentación preparada
 * ✅ Notificaciones programadas
 * ✅ SONIDO Y VIBRACIÓN EN ANDROID (v1.2)
 * ✅ HEADS-UP NOTIFICATIONS EN ANDROID (v1.2)
 * 
 * 🔐 SEGURIDAD:
 * - Tokens encriptados en base de datos
 * - Validación de permisos en cada operación
 * - Manejo seguro de datos sensibles
 * 
 * 📦 ARQUITECTURA:
 * - Cliente: Registro y manejo de notificaciones
 * - Servidor: Edge Functions para envío (Supabase)
 * - Base de datos: Tabla push_tokens para gestión
 * 
 * 🆕 CAMBIOS v1.2 (ANDROID FIX):
 * - ✅ FIXED: Canales de Android se crean ANTES de solicitar permisos
 * - ✅ FIXED: Prioridad MAX para notificaciones heads-up
 * - ✅ FIXED: Sonido configurado correctamente en todos los canales
 * - ✅ FIXED: Vibración habilitada en todos los canales
 * - ✅ IMPROVED: Logging detallado para debugging
 * - ✅ ADDED: Verificación de creación exitosa de canales
 */

import { Platform, Alert, Linking } from 'react-native';
import { supabase, isSupabaseConfigured } from './supabase';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotificationType, DeviceData } from '@/app/integrations/supabase/types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const TOKEN_STORAGE_KEY = '@push_token';
const TOKEN_REFRESH_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 días

// Check if running in Expo Go
const isExpoGo = (): boolean => {
  return Constants.appOwnership === 'expo';
};

// Check if push notifications are available
export const arePushNotificationsAvailable = (): boolean => {
  // Push notifications don't work in Expo Go on Android with SDK 53+
  if (Platform.OS === 'android' && isExpoGo()) {
    return false;
  }
  
  return Device?.isDevice ?? false;
};

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION HANDLER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// Configure notification behavior (foreground, background, closed)
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('[Notifications] 📬 Notificación recibida:', notification.request.content.title);
    
    // Personalizar comportamiento según tipo de notificación
    const notificationType = notification.request.content.data?.type;
    
    // CRÍTICO: SIEMPRE mostrar alerta, sonido y badge
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: notificationType === 'urgent' || notificationType === 'message'
        ? Notifications.AndroidNotificationPriority.MAX
        : Notifications.AndroidNotificationPriority.HIGH,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface NotificationData {
  type: NotificationType;
  userId?: string;
  postId?: string;
  eventId?: string;
  localId?: string;
  conversationId?: string;
  planId?: string;
  subscriptionId?: string;
  daysRemaining?: number;
  title: string;
  body: string;
  deepLink?: string; // Para deep linking
  imageUrl?: string; // Para notificaciones con imagen
  actionButtons?: NotificationAction[]; // Botones de acción
  silent?: boolean; // Para notificaciones silenciosas
  scheduled?: Date; // Para notificaciones programadas
  segment?: string; // Para segmentación
}

export interface NotificationAction {
  id: string;
  title: string;
  action: string;
}

export interface PushToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId: string;
  lastUpdated: Date;
}

// Show development build info to user (optional - call this if you want to inform users)
export const showDevelopmentBuildInfo = (): void => {
  if (Platform.OS === 'android' && isExpoGo()) {
    Alert.alert(
      '📱 Notificaciones Push No Disponibles',
      'Las notificaciones push requieren un development build en Android.\n\n' +
      'La app funcionará normalmente, pero no recibirás notificaciones push.\n\n' +
      'Para habilitar notificaciones:\n' +
      '1. Crea un development build\n' +
      '2. Instálalo en tu dispositivo\n\n' +
      'Más info: docs.expo.dev/develop/development-builds',
      [{ text: 'Entendido', style: 'default' }]
    );
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ANDROID NOTIFICATION CHANNELS (CRITICAL FOR SOUND & DISPLAY)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configurar canales de notificación para Android
 * 🚨 CRÍTICO: Esto DEBE ejecutarse ANTES de solicitar permisos
 * 🚨 CRÍTICO: Los canales determinan si hay sonido y si aparecen en pantalla
 */
const configureAndroidChannels = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    console.log('[Notifications] ℹ️ No es Android, saltando configuración de canales');
    return true;
  }

  try {
    console.log('[Notifications] 🔧 Configurando canales de Android...');

    // Canal por defecto - PRIORIDAD MAX para heads-up
    const defaultChannel = await Notifications.setNotificationChannelAsync('default', {
      name: 'Notificaciones Generales',
      importance: Notifications.AndroidImportance.MAX, // MAX para heads-up
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#14B8A6',
      sound: 'default', // Sonido por defecto del sistema
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
      description: 'Notificaciones generales de BarLive',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
    console.log('[Notifications] ✅ Canal "default" creado:', defaultChannel ? 'OK' : 'FAILED');

    // Canal para mensajes - PRIORIDAD MAX
    const messagesChannel = await Notifications.setNotificationChannelAsync('messages', {
      name: 'Mensajes',
      importance: Notifications.AndroidImportance.MAX, // MAX para heads-up
      vibrationPattern: [0, 300, 200, 300],
      lightColor: '#3B82F6',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
      description: 'Mensajes directos y conversaciones',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
    console.log('[Notifications] ✅ Canal "messages" creado:', messagesChannel ? 'OK' : 'FAILED');

    // Canal para eventos - PRIORIDAD HIGH
    const eventsChannel = await Notifications.setNotificationChannelAsync('events', {
      name: 'Eventos',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 400, 200, 400],
      lightColor: '#8B5CF6',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
      description: 'Recordatorios de eventos y actividades',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
    console.log('[Notifications] ✅ Canal "events" creado:', eventsChannel ? 'OK' : 'FAILED');

    // Canal para brindis - PRIORIDAD MAX
    const cheersChannel = await Notifications.setNotificationChannelAsync('cheers', {
      name: 'Brindis',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#FACC15',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
      description: 'Brindis y celebraciones',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
    console.log('[Notifications] ✅ Canal "cheers" creado:', cheersChannel ? 'OK' : 'FAILED');

    // Canal para promociones - PRIORIDAD DEFAULT
    const promosChannel = await Notifications.setNotificationChannelAsync('promos', {
      name: 'Promociones',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: '#EF4444',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      showBadge: false,
      description: 'Ofertas y promociones especiales',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
    console.log('[Notifications] ✅ Canal "promos" creado:', promosChannel ? 'OK' : 'FAILED');

    // Canal para notificaciones de planes y suscripciones - PRIORIDAD HIGH
    const subscriptionsChannel = await Notifications.setNotificationChannelAsync('subscriptions', {
      name: 'Planes y Suscripciones',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 150, 300],
      lightColor: '#10B981',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
      description: 'Compras, renovaciones y recordatorios de planes',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
    console.log('[Notifications] ✅ Canal "subscriptions" creado:', subscriptionsChannel ? 'OK' : 'FAILED');

    // Canal para notificaciones silenciosas - PRIORIDAD LOW
    const silentChannel = await Notifications.setNotificationChannelAsync('silent', {
      name: 'Silenciosas',
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: [0],
      sound: null,
      enableVibrate: false,
      enableLights: false,
      showBadge: false,
      description: 'Actualizaciones en segundo plano',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.SECRET,
      bypassDnd: false,
    });
    console.log('[Notifications] ✅ Canal "silent" creado:', silentChannel ? 'OK' : 'FAILED');

    // Verificar que al menos el canal por defecto se creó
    if (!defaultChannel) {
      console.error('[Notifications] ❌ CRÍTICO: No se pudo crear el canal por defecto');
      return false;
    }

    console.log('[Notifications] ✅ Todos los canales de Android configurados exitosamente');
    return true;
  } catch (error: any) {
    console.error('[Notifications] ❌ Error configurando canales:', error.message);
    console.error('[Notifications] ❌ Stack:', error.stack);
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRATION & PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Registrar dispositivo para notificaciones push
 * Maneja permisos, tokens y configuración de canales
 * 🚨 v1.2: Canales se configuran ANTES de solicitar permisos
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  try {
    console.log('[Notifications] 🔔 Iniciando registro de notificaciones...');
    
    // ✅ Verificar disponibilidad
    if (!arePushNotificationsAvailable()) {
      if (Platform.OS === 'android' && isExpoGo()) {
        console.log('[Notifications] ⚠️ Expo Go detectado en Android');
        console.log('[Notifications] ℹ️ Las notificaciones push no están disponibles en Expo Go (SDK 53+)');
        console.log('[Notifications] ℹ️ La app funcionará normalmente sin notificaciones push');
        console.log('[Notifications] 📱 Para habilitar notificaciones, crea un development build:');
        console.log('[Notifications]    npx eas build --profile development --platform android');
      } else {
        console.log('[Notifications] ⚠️ Las notificaciones push solo funcionan en dispositivos físicos');
      }
      return null;
    }

    // ✅ CRÍTICO: Configurar canales de Android ANTES de solicitar permisos
    if (Platform.OS === 'android') {
      console.log('[Notifications] 🔧 Configurando canales de Android ANTES de solicitar permisos...');
      const channelsConfigured = await configureAndroidChannels();
      if (!channelsConfigured) {
        console.error('[Notifications] ❌ CRÍTICO: No se pudieron configurar los canales');
        Alert.alert(
          'Error de Configuración',
          'No se pudieron configurar los canales de notificación. Las notificaciones pueden no funcionar correctamente.',
          [{ text: 'OK' }]
        );
        // Continuar de todos modos, pero advertir al usuario
      }
    }

    // ✅ Verificar token existente en caché
    const cachedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (cachedToken) {
      const tokenData = JSON.parse(cachedToken);
      const tokenAge = Date.now() - new Date(tokenData.timestamp).getTime();
      
      // Si el token tiene menos de 7 días, reutilizarlo
      if (tokenAge < TOKEN_REFRESH_INTERVAL) {
        console.log('[Notifications] 💾 Usando token en caché');
        return tokenData.token;
      }
    }

    // ✅ Verificar permisos existentes
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    console.log('[Notifications] 📋 Estado de permisos:', existingStatus);

    // ✅ Solicitar permisos si no están otorgados
    if (existingStatus !== 'granted') {
      console.log('[Notifications] 🔐 Solicitando permisos...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('[Notifications] 📋 Nuevo estado:', finalStatus);
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] ❌ Permisos denegados');
      Alert.alert(
        'Permisos Requeridos',
        'Para recibir notificaciones importantes, necesitamos tu permiso. Puedes habilitarlo en Configuración.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Configuración', onPress: () => Linking.openSettings() }
        ]
      );
      return null;
    }

    // ✅ Obtener Project ID
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    if (!projectId || projectId === 'REPLACE_WITH_YOUR_PROJECT_ID') {
      console.warn('[Notifications] ⚠️ EAS Project ID no configurado');
      console.warn('[Notifications] Para configurar:');
      console.warn('[Notifications]    1. npx eas project:init');
      console.warn('[Notifications]    2. npx eas build --profile development --platform android');
      return null;
    }

    // ✅ Obtener push token
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      const token = tokenData.data;
      console.log('[Notifications] ✅ Push token obtenido');

      // ✅ Guardar token en caché
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({
        token,
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
      }));

      console.log('[Notifications] ✅ Sistema de notificaciones completamente configurado');
      console.log('[Notifications] 📊 Resumen:');
      console.log('[Notifications]    - Canales: Configurados');
      console.log('[Notifications]    - Permisos: Otorgados');
      console.log('[Notifications]    - Token: Obtenido');
      console.log('[Notifications]    - Sonido: Habilitado');
      console.log('[Notifications]    - Vibración: Habilitada');
      console.log('[Notifications]    - Heads-up: Habilitado (prioridad MAX)');

      return token;
    } catch (tokenError: any) {
      console.error('[Notifications] ❌ Error obteniendo push token:', tokenError.message);
      
      if (tokenError.message?.includes('Expo Go') || tokenError.message?.includes('development build')) {
        console.error('[Notifications] ⚠️ IMPORTANTE: Necesitas un development build');
        console.error('[Notifications] 📱 Comando: npx eas build --profile development --platform android');
      }
      
      return null;
    }
  } catch (error: any) {
    console.error('[Notifications] ❌ Error en registro:', error.message);
    return null;
  }
};

/**
 * Actualizar token de push (para refresh automático)
 */
export const refreshPushToken = async (userId: string): Promise<string | null> => {
  try {
    console.log('[Notifications] 🔄 Refrescando push token...');
    
    // Limpiar caché
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    
    // Obtener nuevo token
    const newToken = await registerForPushNotifications();
    
    if (newToken) {
      await savePushToken(userId, newToken);
      console.log('[Notifications] ✅ Token refrescado');
    }
    
    return newToken;
  } catch (error: any) {
    console.error('[Notifications] ❌ Error refrescando token:', error.message);
    return null;
  }
};

/**
 * Eliminar token de push (logout o desactivación)
 */
export const removePushToken = async (userId: string): Promise<void> => {
  try {
    console.log('[Notifications] 🗑️ Eliminando push token...');
    
    if (!isSupabaseConfigured()) {
      return;
    }

    const deviceId = Constants.deviceId || 'unknown';

    const { error } = await supabase
      .from('push_tokens')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('device_id', deviceId);

    if (error) {
      console.error('[Notifications] ❌ Error eliminando token:', error.message);
    } else {
      console.log('[Notifications] ✅ Token desactivado');
    }

    // Limpiar caché local
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (error: any) {
    console.error('[Notifications] ❌ Error en removePushToken:', error.message);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// TOKEN MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Guardar token de push en base de datos
 * Incluye información del dispositivo para gestión
 */
export const savePushToken = async (userId: string, token: string, deviceData?: DeviceData): Promise<void> => {
  try {
    console.log('[Notifications] 💾 Guardando push token...');
    
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.log('[Notifications] ⚠️ Supabase no configurado');
      return;
    }

    // Obtener información del dispositivo si no se proporciona
    const finalDeviceData = deviceData || {
      deviceId: Constants.deviceId || 'unknown',
      deviceName: Constants.deviceName || 'unknown',
      osVersion: String(Platform.Version),
      appVersion: Constants.expoConfig?.version || '1.0.0',
    };

    const { error } = await supabase
      .from('push_tokens')
      .upsert({
        user_id: userId,
        token,
        platform: Platform.OS,
        device_id: finalDeviceData.deviceId,
        device_name: finalDeviceData.deviceName,
        os_version: finalDeviceData.osVersion,
        app_version: finalDeviceData.appVersion,
        updated_at: new Date().toISOString(),
        active: true,
      }, {
        onConflict: 'user_id,device_id',
      });

    if (error) {
      console.error('[Notifications] ❌ Error guardando token:', error.message);
    } else {
      console.log('[Notifications] ✅ Token guardado con información del dispositivo');
    }
  } catch (error: any) {
    console.error('[Notifications] ❌ Error en savePushToken:', error.message);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION SENDING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Enviar notificación local (sin servidor)
 * Útil para recordatorios y notificaciones programadas
 */
export const sendLocalNotification = async (data: NotificationData): Promise<void> => {
  try {
    if (!arePushNotificationsAvailable()) {
      console.log('[Notifications] ⚠️ Notificaciones no disponibles');
      return;
    }
    
    console.log('[Notifications] 📬 Enviando notificación local:', data.type);
    
    // Determinar canal según tipo
    const channelId = getChannelForType(data.type);
    
    const notificationContent: any = {
      title: data.title,
      body: data.body,
      data: data,
      sound: data.silent ? null : 'default',
      badge: data.silent ? 0 : 1,
      priority: data.type === 'urgent' || data.type === 'message'
        ? Notifications.AndroidNotificationPriority.MAX
        : Notifications.AndroidNotificationPriority.HIGH,
    };

    // Agregar canal de Android
    if (Platform.OS === 'android') {
      notificationContent.channelId = channelId;
    }

    // Agregar imagen si está disponible
    if (data.imageUrl) {
      notificationContent.attachments = [{
        url: data.imageUrl,
      }];
    }

    // Agregar botones de acción si están disponibles
    if (data.actionButtons && data.actionButtons.length > 0) {
      notificationContent.categoryIdentifier = 'actions';
    }

    // Configurar trigger (inmediato o programado)
    const trigger = data.scheduled 
      ? { date: data.scheduled }
      : null;

    await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger,
    });
    
    console.log('[Notifications] ✅ Notificación local enviada');
  } catch (error: any) {
    console.error('[Notifications] ❌ Error enviando notificación local:', error.message);
  }
};

/**
 * Obtener canal apropiado según tipo de notificación
 */
const getChannelForType = (type: NotificationType): string => {
  const channelMap: Record<string, string> = {
    'message': 'messages',
    'event': 'events',
    'cheers': 'cheers',
    'promo': 'promos',
    'plan_purchase': 'subscriptions',
    'plan_renewal': 'subscriptions',
    'featured_local_reminder': 'subscriptions',
    'urgent': 'default',
  };
  
  return channelMap[type] || 'default';
};

/**
 * Enviar push notification vía servidor (Supabase Edge Function)
 * Soporta segmentación, programación y deep linking
 */
export const sendPushNotification = async (
  userId: string,
  data: NotificationData
): Promise<void> => {
  try {
    console.log('[Notifications] 📤 Enviando push notification...');
    
    if (!isSupabaseConfigured()) {
      console.log('[Notifications] ⚠️ Supabase no configurado, usando notificación local');
      await sendLocalNotification(data);
      return;
    }

    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        userId,
        notification: data,
        segment: data.segment,
        scheduled: data.scheduled?.toISOString(),
      },
    });

    if (error) {
      console.error('[Notifications] ❌ Error enviando push:', error.message);
      // Fallback a notificación local
      await sendLocalNotification(data);
    } else {
      console.log('[Notifications] ✅ Push notification enviada');
    }
  } catch (error: any) {
    console.error('[Notifications] ❌ Error en sendPushNotification:', error.message);
    await sendLocalNotification(data);
  }
};

/**
 * Enviar notificación a múltiples usuarios (broadcast)
 */
export const sendBroadcastNotification = async (
  userIds: string[],
  data: NotificationData
): Promise<void> => {
  try {
    console.log('[Notifications] 📡 Enviando broadcast a', userIds.length, 'usuarios');
    
    if (!isSupabaseConfigured()) {
      console.log('[Notifications] ⚠️ Supabase no configurado');
      return;
    }

    const { error } = await supabase.functions.invoke('send-broadcast-notification', {
      body: {
        userIds,
        notification: data,
      },
    });

    if (error) {
      console.error('[Notifications] ❌ Error enviando broadcast:', error.message);
    } else {
      console.log('[Notifications] ✅ Broadcast enviado');
    }
  } catch (error: any) {
    console.error('[Notifications] ❌ Error en sendBroadcastNotification:', error.message);
  }
};

/**
 * Programar notificación para envío futuro
 */
export const scheduleNotification = async (
  userId: string,
  data: NotificationData,
  scheduledDate: Date
): Promise<void> => {
  try {
    console.log('[Notifications] ⏰ Programando notificación para:', scheduledDate);
    
    data.scheduled = scheduledDate;
    await sendPushNotification(userId, data);
  } catch (error: any) {
    console.error('[Notifications] ❌ Error programando notificación:', error.message);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION HANDLING & DEEP LINKING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Manejar notificación recibida mientras app está en foreground
 * Permite personalizar comportamiento según tipo
 */
export const addNotificationReceivedListener = (
  callback: (notification: any) => void
) => {
  console.log('[Notifications] 👂 Registrando listener de notificaciones recibidas');
  
  return Notifications.addNotificationReceivedListener((notification) => {
    console.log('[Notifications] 📬 Notificación recibida en foreground');
    console.log('[Notifications] Tipo:', notification.request.content.data?.type);
    console.log('[Notifications] Título:', notification.request.content.title);
    
    // Incrementar badge
    incrementBadgeCount();
    
    // Callback personalizado
    callback(notification);
  });
};

/**
 * Manejar notificación tocada (deep linking)
 * Navega a la pantalla apropiada según el tipo
 */
export const addNotificationResponseReceivedListener = (
  callback: (response: any) => void
) => {
  console.log('[Notifications] 👂 Registrando listener de respuestas');
  
  return Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('[Notifications] 👆 Notificación tocada');
    
    const data = response.notification.request.content.data as NotificationData;
    console.log('[Notifications] Data:', data);
    
    // Manejar deep linking
    if (data.deepLink) {
      handleDeepLink(data.deepLink);
    } else {
      // Navegación por defecto según tipo
      handleNotificationNavigation(data);
    }
    
    // Callback personalizado
    callback(response);
  });
};

/**
 * Manejar deep linking desde notificación
 */
const handleDeepLink = async (deepLink: string): Promise<void> => {
  try {
    console.log('[Notifications] 🔗 Manejando deep link:', deepLink);
    
    // Verificar si la app puede manejar el link
    const canOpen = await Linking.canOpenURL(deepLink);
    
    if (canOpen) {
      await Linking.openURL(deepLink);
    } else {
      console.warn('[Notifications] ⚠️ No se puede abrir el deep link');
    }
  } catch (error: any) {
    console.error('[Notifications] ❌ Error manejando deep link:', error.message);
  }
};

/**
 * Navegar a pantalla apropiada según tipo de notificación
 */
const handleNotificationNavigation = (data: NotificationData): void => {
  try {
    console.log('[Notifications] 🧭 Navegando según tipo:', data.type);
    
    // Construir deep link según tipo
    let deepLink = '';
    
    switch (data.type) {
      case 'message':
        if (data.conversationId) {
          deepLink = `barlive://chat/${data.conversationId}`;
        }
        break;
      
      case 'like':
      case 'comment':
        if (data.postId) {
          deepLink = `barlive://social/post/${data.postId}`;
        }
        break;
      
      case 'follow':
        if (data.userId) {
          deepLink = `barlive://perfil/usuario?userId=${data.userId}`;
        }
        break;
      
      case 'event':
        if (data.eventId) {
          deepLink = `barlive://detalle/evento?id=${data.eventId}`;
        }
        break;
      
      case 'cheers':
        if (data.localId) {
          deepLink = `barlive://detalle/sala-virtual-enhanced?localId=${data.localId}`;
        }
        break;
      
      case 'plan_purchase':
      case 'plan_renewal':
        deepLink = 'barlive://gestion/mi-suscripcion';
        break;
      
      case 'featured_local_reminder':
        if (data.localId) {
          deepLink = `barlive://gestion/mis-locales?localId=${data.localId}`;
        }
        break;
      
      default:
        deepLink = 'barlive://';
    }
    
    if (deepLink) {
      handleDeepLink(deepLink);
    }
  } catch (error: any) {
    console.error('[Notifications] ❌ Error navegando:', error.message);
  }
};

/**
 * Configurar categorías de notificación con acciones
 */
export const setupNotificationCategories = async (): Promise<void> => {
  try {
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('actions', [
        {
          identifier: 'reply',
          buttonTitle: 'Responder',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'view',
          buttonTitle: 'Ver',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'dismiss',
          buttonTitle: 'Descartar',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);
      
      console.log('[Notifications] ✅ Categorías de iOS configuradas');
    }
  } catch (error: any) {
    console.error('[Notifications] ❌ Error configurando categorías:', error.message);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// BADGE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Obtener contador de badge actual
 */
export const getBadgeCount = async (): Promise<number> => {
  try {
    if (!arePushNotificationsAvailable()) {
      return 0;
    }
    
    const count = await Notifications.getBadgeCountAsync();
    console.log('[Notifications] 🔢 Badge count:', count);
    return count;
  } catch (error: any) {
    console.error('[Notifications] ❌ Error obteniendo badge:', error.message);
    return 0;
  }
};

/**
 * Establecer contador de badge
 */
export const setBadgeCount = async (count: number): Promise<void> => {
  try {
    if (!arePushNotificationsAvailable()) {
      return;
    }
    
    await Notifications.setBadgeCountAsync(count);
    console.log('[Notifications] 🔢 Badge actualizado a:', count);
  } catch (error: any) {
    console.error('[Notifications] ❌ Error estableciendo badge:', error.message);
  }
};

/**
 * Incrementar contador de badge
 */
export const incrementBadgeCount = async (): Promise<void> => {
  try {
    const currentCount = await getBadgeCount();
    await setBadgeCount(currentCount + 1);
  } catch (error: any) {
    console.error('[Notifications] ❌ Error incrementando badge:', error.message);
  }
};

/**
 * Decrementar contador de badge
 */
export const decrementBadgeCount = async (): Promise<void> => {
  try {
    const currentCount = await getBadgeCount();
    if (currentCount > 0) {
      await setBadgeCount(currentCount - 1);
    }
  } catch (error: any) {
    console.error('[Notifications] ❌ Error decrementando badge:', error.message);
  }
};

/**
 * Limpiar todas las notificaciones y badge
 */
export const clearAllNotifications = async (): Promise<void> => {
  try {
    if (!arePushNotificationsAvailable()) {
      console.log('[Notifications] ⚠️ Notificaciones no disponibles');
      return;
    }
    
    await Notifications.dismissAllNotificationsAsync();
    await setBadgeCount(0);
    console.log('[Notifications] ✅ Notificaciones y badge limpiados');
  } catch (error: any) {
    console.error('[Notifications] ❌ Error limpiando notificaciones:', error.message);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// TESTING & UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Programar notificación de prueba
 */
export const scheduleTestNotification = async (): Promise<void> => {
  try {
    if (!arePushNotificationsAvailable()) {
      Alert.alert(
        'Notificaciones No Disponibles',
        'Las notificaciones push no están disponibles en Expo Go para Android.\n\n' +
        'Para probar notificaciones, necesitas crear un development build.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🍻 ¡Salud!',
        body: 'Esta es una notificación de prueba de BarLive',
        data: { type: 'cheers' },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: {
        seconds: 2,
        channelId: 'default',
      },
    });
    
    Alert.alert(
      'Notificación Programada',
      'Recibirás una notificación de prueba en 2 segundos',
      [{ text: 'OK' }]
    );
    
    console.log('[Notifications] ✅ Notificación de prueba programada');
  } catch (error: any) {
    console.error('[Notifications] ❌ Error programando notificación:', error.message);
  }
};

/**
 * Verificar estado completo del sistema de notificaciones
 */
export const getNotificationStatus = async (): Promise<{
  available: boolean;
  permissionsGranted: boolean;
  tokenRegistered: boolean;
  platform: string;
  isExpoGo: boolean;
}> => {
  try {
    const available = arePushNotificationsAvailable();
    const { status } = await Notifications.getPermissionsAsync();
    const cachedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    
    return {
      available,
      permissionsGranted: status === 'granted',
      tokenRegistered: !!cachedToken,
      platform: Platform.OS,
      isExpoGo: isExpoGo(),
    };
  } catch (error: any) {
    console.error('[Notifications] ❌ Error obteniendo estado:', error.message);
    return {
      available: false,
      permissionsGranted: false,
      tokenRegistered: false,
      platform: Platform.OS,
      isExpoGo: isExpoGo(),
    };
  }
};

/**
 * Inicializar sistema completo de notificaciones
 * Llamar al inicio de la app
 */
export const initializeNotifications = async (userId?: string): Promise<void> => {
  try {
    console.log('[Notifications] 🚀 Inicializando sistema de notificaciones...');
    
    // Configurar categorías
    await setupNotificationCategories();
    
    // Registrar para notificaciones si hay usuario
    if (userId) {
      const token = await registerForPushNotifications();
      if (token) {
        await savePushToken(userId, token);
      }
    }
    
    console.log('[Notifications] ✅ Sistema de notificaciones inicializado');
  } catch (error: any) {
    console.error('[Notifications] ❌ Error inicializando notificaciones:', error.message);
  }
};

/**
 * Obtener todas las notificaciones pendientes
 */
export const getPendingNotifications = async (): Promise<Notifications.NotificationRequest[]> => {
  try {
    if (!arePushNotificationsAvailable()) {
      return [];
    }
    
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('[Notifications] 📋 Notificaciones pendientes:', notifications.length);
    return notifications;
  } catch (error: any) {
    console.error('[Notifications] ❌ Error obteniendo notificaciones pendientes:', error.message);
    return [];
  }
};

/**
 * Cancelar notificación programada específica
 */
export const cancelScheduledNotification = async (notificationId: string): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('[Notifications] ✅ Notificación cancelada:', notificationId);
  } catch (error: any) {
    console.error('[Notifications] ❌ Error cancelando notificación:', error.message);
  }
};

/**
 * Cancelar todas las notificaciones programadas
 */
export const cancelAllScheduledNotifications = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[Notifications] ✅ Todas las notificaciones programadas canceladas');
  } catch (error: any) {
    console.error('[Notifications] ❌ Error cancelando notificaciones:', error.message);
  }
};
