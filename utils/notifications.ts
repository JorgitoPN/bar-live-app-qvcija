
import { Platform, Alert } from 'react-native';
import { supabase, isSupabaseConfigured } from './supabase';
import Constants from 'expo-constants';

// Lazy import notifications to avoid errors in Expo Go
let Notifications: any = null;
let Device: any = null;

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
  
  // Try to load Device module
  if (!Device) {
    try {
      Device = await import('expo-device');
    } catch (error) {
      console.log('[Notifications] ⚠️ expo-device no disponible');
      return false;
    }
  }
  
  return Device?.isDevice ?? false;
};

// Initialize notifications module (lazy loading)
const initializeNotifications = async (): Promise<boolean> => {
  if (Notifications) {
    return true;
  }
  
  // Don't even try to load in Expo Go on Android
  if (Platform.OS === 'android' && isExpoGo()) {
    console.log('[Notifications] ℹ️ Expo Go detectado en Android - notificaciones push no disponibles');
    console.log('[Notifications] ℹ️ La app funcionará normalmente sin notificaciones push');
    console.log('[Notifications] 📱 Para habilitar notificaciones, crea un development build');
    return false;
  }
  
  try {
    Notifications = await import('expo-notifications');
    
    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority?.HIGH ?? 4,
      }),
    });
    
    return true;
  } catch (error: any) {
    console.log('[Notifications] ⚠️ No se pudo cargar expo-notifications:', error.message);
    return false;
  }
};

export interface NotificationData {
  type: 'like' | 'comment' | 'follow' | 'mention' | 'event' | 'message' | 'cheers';
  userId?: string;
  postId?: string;
  eventId?: string;
  localId?: string;
  title: string;
  body: string;
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

// Register for push notifications
export const registerForPushNotifications = async (): Promise<string | null> => {
  try {
    console.log('[Notifications] 🔔 Iniciando registro de notificaciones...');
    
    // Check if push notifications are available
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
    
    // Initialize notifications module
    const initialized = await initializeNotifications();
    if (!initialized) {
      console.log('[Notifications] ⚠️ No se pudo inicializar el módulo de notificaciones');
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    console.log('[Notifications] 📋 Estado de permisos:', existingStatus);

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      console.log('[Notifications] 🔐 Solicitando permisos...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('[Notifications] 📋 Nuevo estado:', finalStatus);
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] ❌ Permisos denegados');
      return null;
    }

    // Get the Expo project ID
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    if (!projectId || projectId === 'REPLACE_WITH_YOUR_PROJECT_ID') {
      console.warn('[Notifications] ⚠️ EAS Project ID no configurado');
      console.warn('[Notifications] Para configurar:');
      console.warn('[Notifications]    1. npx eas project:init');
      console.warn('[Notifications]    2. npx eas build --profile development --platform android');
      return null;
    }

    // Get push token
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      const token = tokenData.data;
      console.log('[Notifications] ✅ Push token obtenido');

      // Configure Android notification channels
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'BarLive Notificaciones',
          importance: Notifications.AndroidImportance?.MAX ?? 4,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#14B8A6',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
        });

        await Notifications.setNotificationChannelAsync('cheers', {
          name: 'BarLive Brindis',
          importance: Notifications.AndroidImportance?.MAX ?? 4,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#FACC15',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
        });

        console.log('[Notifications] ✅ Canales de Android configurados');
      }

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

// Save push token to database
export const savePushToken = async (userId: string, token: string): Promise<void> => {
  try {
    console.log('[Notifications] 💾 Guardando push token...');
    
    if (!isSupabaseConfigured()) {
      console.log('[Notifications] ⚠️ Supabase no configurado');
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
      console.error('[Notifications] ❌ Error guardando token:', error.message);
    } else {
      console.log('[Notifications] ✅ Token guardado');
    }
  } catch (error: any) {
    console.error('[Notifications] ❌ Error en savePushToken:', error.message);
  }
};

// Send local notification
export const sendLocalNotification = async (data: NotificationData): Promise<void> => {
  try {
    const initialized = await initializeNotifications();
    if (!initialized) {
      console.log('[Notifications] ⚠️ Notificaciones no disponibles');
      return;
    }
    
    console.log('[Notifications] 📬 Enviando notificación local:', data.type);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: data.title,
        body: data.body,
        data: data,
        sound: 'default',
        badge: 1,
        priority: Notifications.AndroidNotificationPriority?.HIGH ?? 4,
      },
      trigger: null,
    });
    
    console.log('[Notifications] ✅ Notificación local enviada');
  } catch (error: any) {
    console.error('[Notifications] ❌ Error enviando notificación local:', error.message);
  }
};

// Send push notification via Supabase Edge Function
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
      },
    });

    if (error) {
      console.error('[Notifications] ❌ Error enviando push:', error.message);
      await sendLocalNotification(data);
    } else {
      console.log('[Notifications] ✅ Push notification enviada');
    }
  } catch (error: any) {
    console.error('[Notifications] ❌ Error en sendPushNotification:', error.message);
    await sendLocalNotification(data);
  }
};

// Handle notification received while app is in foreground
export const addNotificationReceivedListener = (
  callback: (notification: any) => void
) => {
  if (!Notifications) {
    console.log('[Notifications] ⚠️ Notificaciones no disponibles para listeners');
    return { remove: () => {} };
  }
  
  console.log('[Notifications] 👂 Registrando listener de notificaciones recibidas');
  return Notifications.addNotificationReceivedListener(callback);
};

// Handle notification tapped
export const addNotificationResponseReceivedListener = (
  callback: (response: any) => void
) => {
  if (!Notifications) {
    console.log('[Notifications] ⚠️ Notificaciones no disponibles para listeners');
    return { remove: () => {} };
  }
  
  console.log('[Notifications] 👂 Registrando listener de respuestas');
  return Notifications.addNotificationResponseReceivedListener(callback);
};

// Get badge count
export const getBadgeCount = async (): Promise<number> => {
  try {
    const initialized = await initializeNotifications();
    if (!initialized) {
      return 0;
    }
    
    return await Notifications.getBadgeCountAsync();
  } catch (error: any) {
    console.error('[Notifications] ❌ Error obteniendo badge:', error.message);
    return 0;
  }
};

// Set badge count
export const setBadgeCount = async (count: number): Promise<void> => {
  try {
    const initialized = await initializeNotifications();
    if (!initialized) {
      return;
    }
    
    await Notifications.setBadgeCountAsync(count);
  } catch (error: any) {
    console.error('[Notifications] ❌ Error estableciendo badge:', error.message);
  }
};

// Clear all notifications
export const clearAllNotifications = async (): Promise<void> => {
  try {
    const initialized = await initializeNotifications();
    if (!initialized) {
      console.log('[Notifications] ⚠️ Notificaciones no disponibles');
      return;
    }
    
    await Notifications.dismissAllNotificationsAsync();
    await setBadgeCount(0);
    console.log('[Notifications] ✅ Notificaciones limpiadas');
  } catch (error: any) {
    console.error('[Notifications] ❌ Error limpiando notificaciones:', error.message);
  }
};

// Schedule a test notification
export const scheduleTestNotification = async (): Promise<void> => {
  try {
    const initialized = await initializeNotifications();
    if (!initialized) {
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
      },
      trigger: {
        seconds: 2,
      },
    });
    console.log('[Notifications] ✅ Notificación de prueba programada');
  } catch (error: any) {
    console.error('[Notifications] ❌ Error programando notificación:', error.message);
  }
};
