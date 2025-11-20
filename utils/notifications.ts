
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from './supabase';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export interface NotificationData {
  type: 'like' | 'comment' | 'follow' | 'mention' | 'event' | 'message' | 'cheers';
  userId?: string;
  postId?: string;
  eventId?: string;
  localId?: string;
  title: string;
  body: string;
}

// Register for push notifications
export const registerForPushNotifications = async (): Promise<string | null> => {
  try {
    console.log('[Notifications] Iniciando registro...');
    
    // IMPORTANT: Push notifications require a development build in Expo SDK 53+
    // They are not available in Expo Go
    if (!Device.isDevice) {
      console.log('[Notifications] ⚠️ Las notificaciones push solo funcionan en dispositivos físicos');
      console.log('[Notifications] ℹ️ En Expo SDK 53+, necesitas un development build');
      console.log('[Notifications] ℹ️ Ejecuta: eas build -p android --profile development');
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    console.log('[Notifications] Estado de permisos existente:', existingStatus);

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      console.log('[Notifications] Solicitando permisos...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('[Notifications] Nuevo estado de permisos:', finalStatus);
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] No se obtuvieron permisos para notificaciones');
      return null;
    }

    // Get the Expo project ID from app.json/app.config.js
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    console.log('[Notifications] Project ID:', projectId);

    // If no project ID is configured, skip push token registration
    // This allows the app to work without EAS configuration
    if (!projectId || projectId === 'REPLACE_WITH_YOUR_PROJECT_ID') {
      console.warn('[Notifications] ⚠️ EAS Project ID no configurado');
      console.warn('[Notifications] Las notificaciones push no estarán disponibles');
      console.warn('[Notifications] Para habilitar notificaciones push:');
      console.warn('[Notifications] 1. Ejecuta: eas project:init');
      console.warn('[Notifications] 2. Crea un development build: eas build -p android --profile development');
      console.warn('[Notifications] 3. Instala el build en tu dispositivo');
      console.warn('[Notifications] 4. Las notificaciones push funcionarán en el development build');
      return null;
    }

    // Get push token
    // NOTE: This will fail in Expo Go with SDK 53+
    // You need a development build for push notifications
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      const token = tokenData.data;
      console.log('[Notifications] ✅ Push token obtenido:', token);

      // Configure Android channel with custom sound
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'BarLive Notificaciones',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#14B8A6',
          sound: 'cheers.wav', // Custom sound file
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
        });

        // Create a special channel for cheers notifications
        await Notifications.setNotificationChannelAsync('cheers', {
          name: 'BarLive Brindis',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#FACC15',
          sound: 'cheers.wav',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
        });

        console.log('[Notifications] Canales de Android configurados');
      }

      return token;
    } catch (tokenError: any) {
      console.error('[Notifications] ❌ Error obteniendo push token:', tokenError);
      
      if (tokenError.message?.includes('Expo Go')) {
        console.error('[Notifications] ⚠️ IMPORTANTE: Las notificaciones push no funcionan en Expo Go con SDK 53+');
        console.error('[Notifications] 📱 Necesitas crear un development build:');
        console.error('[Notifications]    1. Ejecuta: eas build -p android --profile development');
        console.error('[Notifications]    2. Instala el .apk en tu dispositivo Android');
        console.error('[Notifications]    3. Las notificaciones push funcionarán en el build');
      }
      
      return null;
    }
  } catch (error: any) {
    console.error('[Notifications] Error registrando notificaciones:', error);
    
    // Provide more specific error messages
    if (error.message?.includes('projectId')) {
      console.error('[Notifications] ❌ Error: Project ID inválido o no configurado');
      console.error('[Notifications] Para configurar el Project ID:');
      console.error('[Notifications] 1. Ejecuta: eas project:init');
      console.error('[Notifications] 2. Crea un development build: eas build -p android --profile development');
    }
    
    return null;
  }
};

// Save push token to database
export const savePushToken = async (userId: string, token: string): Promise<void> => {
  try {
    console.log('[Notifications] Guardando push token para usuario:', userId);
    
    if (!isSupabaseConfigured()) {
      console.log('[Notifications] Supabase no configurado, no se puede guardar token');
      return;
    }

    const { error } = await supabase
      .from('push_tokens')
      .upsert({
        user_id: userId,
        token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('[Notifications] Error guardando push token:', error);
    } else {
      console.log('[Notifications] Push token guardado correctamente');
    }
  } catch (error) {
    console.error('[Notifications] Error en savePushToken:', error);
  }
};

// Send local notification with custom sound
export const sendLocalNotification = async (data: NotificationData): Promise<void> => {
  try {
    console.log('[Notifications] Enviando notificación local:', data.type);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: data.title,
        body: data.body,
        data: data,
        sound: Platform.OS === 'android' ? 'cheers.wav' : 'default',
        badge: 1,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Show immediately
    });
    
    console.log('[Notifications] Notificación local enviada');
  } catch (error) {
    console.error('[Notifications] Error enviando notificación local:', error);
  }
};

// Send push notification via Supabase Edge Function
export const sendPushNotification = async (
  userId: string,
  data: NotificationData
): Promise<void> => {
  try {
    console.log('[Notifications] Enviando push notification a usuario:', userId);
    
    if (!isSupabaseConfigured()) {
      console.log('[Notifications] Supabase no configurado, enviando notificación local');
      await sendLocalNotification(data);
      return;
    }

    // Call Supabase Edge Function to send push notification
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        userId,
        notification: data,
      },
    });

    if (error) {
      console.error('[Notifications] Error enviando push notification:', error);
      // Fallback to local notification
      await sendLocalNotification(data);
    } else {
      console.log('[Notifications] Push notification enviada correctamente');
    }
  } catch (error) {
    console.error('[Notifications] Error en sendPushNotification:', error);
    // Fallback to local notification
    await sendLocalNotification(data);
  }
};

// Handle notification received while app is in foreground
export const addNotificationReceivedListener = (
  callback: (notification: Notifications.Notification) => void
) => {
  console.log('[Notifications] Registrando listener para notificaciones recibidas');
  return Notifications.addNotificationReceivedListener(callback);
};

// Handle notification tapped
export const addNotificationResponseReceivedListener = (
  callback: (response: Notifications.NotificationResponse) => void
) => {
  console.log('[Notifications] Registrando listener para respuestas de notificaciones');
  return Notifications.addNotificationResponseReceivedListener(callback);
};

// Get badge count
export const getBadgeCount = async (): Promise<number> => {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    console.error('[Notifications] Error obteniendo badge count:', error);
    return 0;
  }
};

// Set badge count
export const setBadgeCount = async (count: number): Promise<void> => {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('[Notifications] Error estableciendo badge count:', error);
  }
};

// Clear all notifications
export const clearAllNotifications = async (): Promise<void> => {
  try {
    await Notifications.dismissAllNotificationsAsync();
    await setBadgeCount(0);
    console.log('[Notifications] Todas las notificaciones limpiadas');
  } catch (error) {
    console.error('[Notifications] Error limpiando notificaciones:', error);
  }
};

// Schedule a test notification (for debugging)
export const scheduleTestNotification = async (): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🍻 ¡Salud!',
        body: 'Esta es una notificación de prueba de BarLive',
        data: { type: 'cheers' },
        sound: Platform.OS === 'android' ? 'cheers.wav' : 'default',
      },
      trigger: {
        seconds: 2,
      },
    });
    console.log('[Notifications] Notificación de prueba programada');
  } catch (error) {
    console.error('[Notifications] Error programando notificación de prueba:', error);
  }
};
