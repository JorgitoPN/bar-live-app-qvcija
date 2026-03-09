
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NOTIFICATION HANDLER v3.0 - SISTEMA ROBUSTO DE NOTIFICACIONES PUSH
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 🎯 CARACTERÍSTICAS v3.0:
 * ✅ Paso 1: Definición de tipos de notificación (14 categorías completas)
 * ✅ Paso 2: Deep linking dinámico (navegación específica por tipo)
 * ✅ Paso 3: Manejo de estados (foreground, background, cerrada)
 * ✅ Banner interno personalizado cuando app está abierta
 * ✅ Navegación inmediata cuando app está cerrada/background
 * ✅ Procesamiento de payload completo con fallbacks
 * ✅ Logging detallado para debugging
 * ✅ Soporte para notificaciones programadas
 * ✅ Manejo de errores robusto
 * ✅ NUEVO v3.0: Configuración de canales de notificación para Android
 * ✅ NUEVO v3.0: Registro automático de push tokens
 * ✅ NUEVO v3.0: Sonidos personalizados con fallback
 * ✅ NUEVO v3.0: Sistema de prueba de notificaciones
 * ✅ NUEVO v4.0: Volumen alto con NOTIFICATION_RINGTONE
 * ✅ NUEVO v4.0: enforceAudibility y requestAudioFocus
 * 
 * TIPOS DE NOTIFICACIÓN SOPORTADOS (14 CATEGORÍAS):
 * 
 * 📱 INTERACCIONES (4):
 * - like: Me gusta en publicación
 * - comment/comentario: Comentario en publicación
 * - follow/seguidor: Nuevo seguidor
 * - mention/mencion: Mención en contenido
 * 
 * 💬 COMUNICACIÓN (2):
 * - message/mensaje/mensaje_privado: Mensaje directo
 * - cheers/saludos: Brindis en sala virtual
 * 
 * 💳 TRANSACCIONES (2):
 * - plan_purchase/compra_plan: Compra de plan
 * - plan_renewal/renovacion_plan: Renovación de plan
 * 
 * 🔔 SISTEMA Y ALERTAS (6):
 * - event/evento: Evento nuevo o recordatorio
 * - featured_local_reminder/recordatorio_local: Recordatorio de local destacado
 * - urgent/urgente: Alerta urgente del sistema
 * - sistema: Mensaje del sistema
 * - promo/promocion: Promoción especial
 * - reminder: Recordatorio genérico
 */

import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Alert, Platform, ToastAndroid } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Device from 'expo-device';
import { supabase } from '@/utils/supabase';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export type NotificationCategory = 
  // Interacciones (4)
  | 'like' 
  | 'comment' 
  | 'comentario'
  | 'follow' 
  | 'seguidor'
  | 'mention' 
  | 'mencion'
  // Comunicación (2)
  | 'message' 
  | 'mensaje'
  | 'mensaje_privado'
  | 'cheers'
  | 'saludos'
  // Transacciones (2)
  | 'plan_purchase'
  | 'compra_plan'
  | 'plan_renewal'
  | 'renovacion_plan'
  // Sistema y Alertas (6)
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

export interface NotificationPayload {
  // Identificadores
  type: NotificationCategory;
  category?: NotificationCategory; // Alias para type
  
  // IDs de entidades relacionadas
  data_id?: string; // ID genérico
  route?: string; // Ruta específica
  related_id?: string;
  related_type?: string;
  
  // IDs específicos por tipo
  postId?: string;
  post_id?: string;
  commentId?: string;
  comment_id?: string;
  userId?: string;
  user_id?: string;
  sender_id?: string;
  eventId?: string;
  event_id?: string;
  localId?: string;
  local_id?: string;
  conversationId?: string;
  conversation_id?: string;
  planId?: string;
  plan_id?: string;
  
  // Contenido
  title?: string;
  body?: string;
  message?: string;
  
  // Navegación
  deepLink?: string;
  actionUrl?: string;
  action_url?: string;
  url?: string;
  
  // Metadata
  imageUrl?: string;
  timestamp?: string;
  priority?: 'high' | 'normal' | 'low';
}

export interface NotificationResponse {
  notification: Notifications.Notification;
  actionIdentifier: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION HANDLER CLASS
// ═══════════════════════════════════════════════════════════════════════════

class NotificationHandler {
  private foregroundListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private isAppInForeground: boolean = true;
  private pushToken: string | null = null;

  /**
   * Inicializar el sistema de notificaciones
   * Configura listeners para foreground y background
   */
  async initialize() {
    console.log('[NotificationHandler v3.0] 🚀 Inicializando sistema de notificaciones...');
    
    try {
      // PASO 1: Configurar canales de notificación para Android
      await this.setupNotificationChannels();
      
      // PASO 2: Solicitar permisos
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        console.warn('[NotificationHandler v3.0] ⚠️ Permisos de notificación denegados');
        return;
      }
      
      // PASO 3: Registrar para push notifications
      await this.registerForPushNotifications();
      
      // PASO 4: Configurar comportamiento de notificaciones
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          const payload = notification.request.content.data as NotificationPayload;
          const type = payload.type || payload.category;
          
          console.log('[NotificationHandler v3.0] 📬 Notificación recibida:', type);
          console.log('[NotificationHandler v3.0] 📊 Payload completo:', JSON.stringify(payload, null, 2));
          
          // Determinar si mostrar alerta según estado de la app
          const shouldShowAlert = this.isAppInForeground;
          
          return {
            shouldShowAlert,
            shouldPlaySound: true,
            shouldSetBadge: true,
            priority: this.getPriority(type),
          };
        },
      });

      // PASO 5: Configurar listeners
      this.foregroundListener = Notifications.addNotificationReceivedListener(
        this.handleForegroundNotification.bind(this)
      );

      this.responseListener = Notifications.addNotificationResponseReceivedListener(
        this.handleNotificationResponse.bind(this)
      );

      console.log('[NotificationHandler v3.0] ✅ Sistema de notificaciones inicializado completamente');
      console.log('[NotificationHandler v3.0] 📱 Push Token:', this.pushToken ? 'Registrado' : 'No disponible');
    } catch (error: any) {
      console.error('[NotificationHandler v3.0] ❌ Error inicializando notificaciones:', error.message);
    }
  }

  /**
   * NUEVO v3.0: Configurar canales de notificación para Android
   * Android 8+ requiere canales de notificación explícitos
   * 
   * v4.0: Añadido audioAttributes con NOTIFICATION_RINGTONE para volumen alto
   */
  private async setupNotificationChannels() {
    if (Platform.OS !== 'android') {
      console.log('[NotificationHandler v3.0] ℹ️ Canales de notificación solo necesarios en Android');
      return;
    }

    console.log('[NotificationHandler v3.0] 📢 Configurando canales de notificación para Android...');

    try {
      // Canal por defecto (prioridad normal)
      // ✅ FIX: Use audioAttributes with USAGE_NOTIFICATION_RINGTONE for maximum volume
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notificaciones Generales',
        description: 'Notificaciones generales de BarLive',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#14B8A6',
        sound: 'brindis.wav', // Sonido personalizado
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        // ✅ CRITICAL FIX: Use USAGE_NOTIFICATION_RINGTONE for louder sound
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.NOTIFICATION_RINGTONE,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
          flags: {
            enforceAudibility: true,
            requestAudioFocus: true,
          },
        },
      });

      // Canal para mensajes (prioridad alta)
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Mensajes',
        description: 'Mensajes directos y conversaciones',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#14B8A6',
        sound: 'brindis.wav',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        // ✅ CRITICAL FIX: Use USAGE_NOTIFICATION_RINGTONE for louder sound
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.NOTIFICATION_RINGTONE,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
          flags: {
            enforceAudibility: true,
            requestAudioFocus: true,
          },
        },
      });

      // Canal para alertas urgentes (prioridad máxima)
      await Notifications.setNotificationChannelAsync('urgent', {
        name: 'Alertas Urgentes',
        description: 'Alertas importantes del sistema',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#FF0000',
        sound: 'brindis.wav',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        // ✅ CRITICAL FIX: Use USAGE_NOTIFICATION_RINGTONE for louder sound
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.NOTIFICATION_RINGTONE,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
          flags: {
            enforceAudibility: true,
            requestAudioFocus: true,
          },
        },
      });

      // Canal para interacciones sociales (prioridad normal)
      await Notifications.setNotificationChannelAsync('social', {
        name: 'Interacciones Sociales',
        description: 'Me gusta, comentarios, seguidores',
        importance: Notifications.AndroidImportance.HIGH, // ✅ Changed from DEFAULT to HIGH for better audibility
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#14B8A6',
        sound: 'brindis.wav',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        // ✅ CRITICAL FIX: Use USAGE_NOTIFICATION_RINGTONE for louder sound
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.NOTIFICATION_RINGTONE,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
          flags: {
            enforceAudibility: true,
            requestAudioFocus: true,
          },
        },
      });

      console.log('[NotificationHandler v3.0] ✅ Canales de notificación configurados');
    } catch (error: any) {
      console.error('[NotificationHandler v3.0] ❌ Error configurando canales:', error.message);
    }
  }

  /**
   * NUEVO v3.0: Solicitar permisos de notificación
   */
  private async requestPermissions(): Promise<boolean> {
    console.log('[NotificationHandler v3.0] 🔐 Solicitando permisos de notificación...');

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[NotificationHandler v3.0] ⚠️ Permisos de notificación denegados');
        
        if (Platform.OS === 'android') {
          Alert.alert(
            'Permisos Requeridos',
            'Para recibir notificaciones, necesitas habilitar los permisos en la configuración de la app.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { 
                text: 'Abrir Configuración', 
                onPress: () => Notifications.openSettingsAsync() 
              }
            ]
          );
        }
        
        return false;
      }

      console.log('[NotificationHandler v3.0] ✅ Permisos de notificación otorgados');
      return true;
    } catch (error: any) {
      console.error('[NotificationHandler v3.0] ❌ Error solicitando permisos:', error.message);
      return false;
    }
  }

  /**
   * NUEVO v3.0: Registrar dispositivo para push notifications
   */
  private async registerForPushNotifications() {
    console.log('[NotificationHandler v3.0] 📱 Registrando dispositivo para push notifications...');

    try {
      // Verificar que estamos en un dispositivo físico
      if (!Device.isDevice) {
        console.warn('[NotificationHandler v3.0] ⚠️ Push notifications no funcionan en emulador');
        return;
      }

      // Obtener el push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '919b5976-08f5-4b6b-b35b-88d1cc737687', // Tu project ID de app.json
      });

      this.pushToken = tokenData.data;
      console.log('[NotificationHandler v3.0] ✅ Push Token obtenido:', this.pushToken);

      // ✅ Guardar el token en el backend
      await this.savePushTokenToBackend(this.pushToken);
      
    } catch (error: any) {
      console.error('[NotificationHandler v3.0] ❌ Error obteniendo push token:', error.message);
      console.error('[NotificationHandler v3.0] 📊 Error details:', error);
    }
  }

  /**
   * NUEVO v3.0: Guardar push token en el backend
   */
  private async savePushTokenToBackend(token: string) {
    try {
      console.log('[NotificationHandler v3.0] 💾 Guardando push token en backend...');
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('[NotificationHandler v3.0] ⚠️ Usuario no autenticado - no se puede guardar token');
        return;
      }
      
      // Guardar token en la tabla de usuarios
      const { error } = await supabase
        .from('usuarios')
        .update({ 
          push_token: token,
          push_token_updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      
      if (error) {
        console.error('[NotificationHandler v3.0] ❌ Error guardando token:', error.message);
      } else {
        console.log('[NotificationHandler v3.0] ✅ Push token guardado en backend');
      }
    } catch (error: any) {
      console.error('[NotificationHandler v3.0] ❌ Error guardando token:', error.message);
    }
  }

  /**
   * NUEVO v3.0: Obtener el push token actual
   */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * NUEVO v3.0: Enviar notificación de prueba local
   */
  async sendTestNotification() {
    console.log('[NotificationHandler v3.0] 🧪 Enviando notificación de prueba...');

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🍻 ¡Notificación de Prueba!',
          body: 'Si ves esto, las notificaciones están funcionando correctamente con sonido.',
          data: {
            type: 'cheers',
            title: '🍻 ¡Notificación de Prueba!',
            body: 'Si ves esto, las notificaciones están funcionando correctamente.',
          },
          sound: 'brindis.wav',
          vibrate: [0, 250, 250, 250],
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          seconds: 2,
          channelId: 'default',
        },
      });

      console.log('[NotificationHandler v3.0] ✅ Notificación de prueba programada para 2 segundos');
      
      if (Platform.OS === 'android') {
        ToastAndroid.show('Notificación de prueba enviada. Espera 2 segundos...', ToastAndroid.LONG);
      } else {
        Alert.alert('Notificación Enviada', 'Recibirás una notificación de prueba en 2 segundos');
      }
    } catch (error: any) {
      console.error('[NotificationHandler v3.0] ❌ Error enviando notificación de prueba:', error.message);
      Alert.alert('Error', 'No se pudo enviar la notificación de prueba');
    }
  }

  /**
   * Limpiar listeners al desmontar
   */
  cleanup() {
    console.log('[NotificationHandler] 🧹 Limpiando listeners...');
    
    if (this.foregroundListener) {
      this.foregroundListener.remove();
      this.foregroundListener = null;
    }
    
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }

  /**
   * Actualizar estado de la app (foreground/background)
   */
  setAppState(isInForeground: boolean) {
    this.isAppInForeground = isInForeground;
    console.log('[NotificationHandler] 📱 Estado de app:', isInForeground ? 'Foreground' : 'Background');
  }

  /**
   * PASO 3: Manejar notificación recibida en foreground
   * Muestra un banner interno en lugar de la notificación del sistema
   */
  private handleForegroundNotification(notification: Notifications.Notification) {
    console.log('[NotificationHandler] 🔔 Notificación en FOREGROUND');
    
    const payload = notification.request.content.data as NotificationPayload;
    const title = notification.request.content.title || payload.title || 'Nueva notificación';
    const body = notification.request.content.body || payload.body || '';
    const type = payload.type || payload.category;
    
    console.log('[NotificationHandler] 📊 Tipo:', type);
    console.log('[NotificationHandler] 📊 Título:', title);
    console.log('[NotificationHandler] 📊 Cuerpo:', body);
    
    // Feedback háptico según prioridad
    const isUrgent = type === 'urgent' || type === 'urgente' || type === 'message' || type === 'mensaje';
    if (isUrgent) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    // Mostrar banner según plataforma
    if (Platform.OS === 'android') {
      // En Android, usar Toast para notificaciones no urgentes
      if (!isUrgent) {
        ToastAndroid.showWithGravityAndOffset(
          `${title}: ${body}`,
          ToastAndroid.LONG,
          ToastAndroid.TOP,
          0,
          100
        );
        return;
      }
    }
    
    // Para notificaciones urgentes o iOS, mostrar Alert con opciones
    Alert.alert(
      title,
      body,
      [
        { text: 'Cerrar', style: 'cancel' },
        { 
          text: 'Ver', 
          onPress: () => {
            console.log('[NotificationHandler] 👆 Usuario tocó "Ver" en banner');
            this.navigateFromPayload(payload);
          }
        }
      ],
      { cancelable: true }
    );
  }

  /**
   * PASO 2 & 3: Manejar respuesta a notificación (usuario tocó la notificación)
   * Navega directamente al contenido relevante
   */
  private handleNotificationResponse(response: NotificationResponse) {
    console.log('[NotificationHandler] ═══════════════════════════════════════════════════════');
    console.log('[NotificationHandler] 👆 Usuario tocó notificación');
    console.log('[NotificationHandler] 📊 Action:', response.actionIdentifier);
    
    const payload = response.notification.request.content.data as NotificationPayload;
    
    console.log('[NotificationHandler] 📊 Payload completo:', JSON.stringify(payload, null, 2));
    
    // Feedback háptico
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // PASO 2: Navegación dinámica basada en el payload
    this.navigateFromPayload(payload);
    
    console.log('[NotificationHandler] ═══════════════════════════════════════════════════════');
  }

  /**
   * PASO 2: Navegación dinámica basada en el tipo de notificación
   * Elimina el comportamiento de 'mensaje genérico'
   */
  private navigateFromPayload(payload: NotificationPayload) {
    try {
      // Extraer tipo de notificación
      const type = (payload.type || payload.category || '').toLowerCase();
      
      console.log('[NotificationHandler] 🧭 Navegando según tipo:', type);
      console.log('[NotificationHandler] 📊 Datos disponibles:', {
        data_id: payload.data_id,
        route: payload.route,
        related_id: payload.related_id,
        deepLink: payload.deepLink,
      });
      
      // Si hay una ruta específica en el payload, usarla directamente
      if (payload.route) {
        console.log('[NotificationHandler] ✅ Usando ruta específica:', payload.route);
        router.push(payload.route as any);
        return;
      }
      
      // Si hay un deep link, usarlo
      if (payload.deepLink) {
        console.log('[NotificationHandler] ✅ Usando deep link:', payload.deepLink);
        router.push(payload.deepLink as any);
        return;
      }
      
      // PASO 1: Navegación específica por categoría
      switch (type) {
        // ═══════════════════════════════════════════════════════════════
        // INTERACCIONES
        // ═══════════════════════════════════════════════════════════════
        
        case 'like': {
          const postId = payload.postId || payload.post_id || payload.data_id || payload.related_id;
          if (postId) {
            console.log('[NotificationHandler] ❤️ Navegando a publicación (like):', postId);
            router.push(`/social/post?id=${postId}` as any);
          } else {
            console.warn('[NotificationHandler] ⚠️ Like sin ID de publicación');
            this.showGenericAlert(payload);
          }
          break;
        }
        
        case 'comment':
        case 'comentario': {
          const postId = payload.postId || payload.post_id || payload.data_id || payload.related_id;
          const commentId = payload.commentId || payload.comment_id;
          
          if (postId) {
            if (commentId) {
              console.log('[NotificationHandler] 💬 Navegando a publicación con comentario:', postId, commentId);
              router.push(`/social/post?id=${postId}&scrollToComment=${commentId}` as any);
            } else {
              console.log('[NotificationHandler] 💬 Navegando a publicación (comentario):', postId);
              router.push(`/social/post?id=${postId}` as any);
            }
          } else {
            console.warn('[NotificationHandler] ⚠️ Comentario sin ID de publicación');
            this.showGenericAlert(payload);
          }
          break;
        }
        
        case 'follow':
        case 'seguidor': {
          const userId = payload.userId || payload.user_id || payload.sender_id || payload.data_id || payload.related_id;
          if (userId) {
            console.log('[NotificationHandler] 👥 Navegando a perfil de seguidor:', userId);
            router.push(`/perfil/usuario?userId=${userId}` as any);
          } else {
            console.warn('[NotificationHandler] ⚠️ Seguidor sin ID de usuario');
            this.showGenericAlert(payload);
          }
          break;
        }
        
        case 'mention':
        case 'mencion': {
          const postId = payload.postId || payload.post_id || payload.data_id || payload.related_id;
          const commentId = payload.commentId || payload.comment_id;
          
          if (postId) {
            if (commentId) {
              console.log('[NotificationHandler] @ Navegando a comentario con mención:', postId, commentId);
              router.push(`/social/post?id=${postId}&scrollToComment=${commentId}` as any);
            } else {
              console.log('[NotificationHandler] @ Navegando a publicación con mención:', postId);
              router.push(`/social/post?id=${postId}` as any);
            }
          } else {
            console.warn('[NotificationHandler] ⚠️ Mención sin ID de contenido');
            this.showGenericAlert(payload);
          }
          break;
        }
        
        // ═══════════════════════════════════════════════════════════════
        // COMUNICACIÓN
        // ═══════════════════════════════════════════════════════════════
        
        case 'message':
        case 'mensaje':
        case 'mensaje_privado': {
          const conversationId = payload.conversationId || payload.conversation_id || payload.data_id || payload.related_id;
          const senderId = payload.sender_id || payload.userId || payload.user_id;
          
          if (conversationId) {
            console.log('[NotificationHandler] ✉️ Navegando a conversación:', conversationId);
            router.push(`/chat/conversacion?conversationId=${conversationId}` as any);
          } else if (senderId) {
            console.log('[NotificationHandler] ✉️ Navegando a chat con usuario:', senderId);
            router.push(`/chat/conversacion?userId=${senderId}` as any);
          } else {
            console.warn('[NotificationHandler] ⚠️ Mensaje sin información de conversación');
            this.showGenericAlert(payload);
          }
          break;
        }
        
        case 'cheers':
        case 'saludos': {
          const localId = payload.localId || payload.local_id || payload.data_id || payload.related_id;
          if (localId) {
            console.log('[NotificationHandler] 🍻 Navegando a sala virtual:', localId);
            router.push(`/detalle/sala-virtual-enhanced?localId=${localId}` as any);
          } else {
            console.warn('[NotificationHandler] ⚠️ Brindis sin ID de local');
            this.showGenericAlert(payload);
          }
          break;
        }
        
        // ═══════════════════════════════════════════════════════════════
        // TRANSACCIONES
        // ═══════════════════════════════════════════════════════════════
        
        case 'plan_purchase':
        case 'compra_plan':
        case 'plan_renewal':
        case 'renovacion_plan': {
          console.log('[NotificationHandler] 💳 Navegando a gestión de suscripción');
          router.push('/gestion/mi-suscripcion' as any);
          break;
        }
        
        // ═══════════════════════════════════════════════════════════════
        // SISTEMA Y ALERTAS
        // ═══════════════════════════════════════════════════════════════
        
        case 'event':
        case 'evento': {
          const eventId = payload.eventId || payload.event_id || payload.data_id || payload.related_id;
          if (eventId) {
            console.log('[NotificationHandler] 📅 Navegando a evento:', eventId);
            router.push(`/detalle/evento?id=${eventId}` as any);
          } else {
            console.warn('[NotificationHandler] ⚠️ Evento sin ID');
            this.showGenericAlert(payload);
          }
          break;
        }
        
        case 'featured_local_reminder':
        case 'recordatorio_local': {
          const localId = payload.localId || payload.local_id || payload.data_id || payload.related_id;
          if (localId) {
            console.log('[NotificationHandler] ⭐ Navegando a gestión de locales (con ID):', localId);
            router.push(`/gestion/mis-locales?localId=${localId}` as any);
          } else {
            console.log('[NotificationHandler] ⭐ Navegando a gestión de locales (sin ID específico)');
            router.push('/gestion/mis-locales' as any);
          }
          break;
        }
        
        case 'urgent':
        case 'urgente':
        case 'sistema': {
          const actionUrl = payload.actionUrl || payload.action_url || payload.url;
          if (actionUrl) {
            console.log('[NotificationHandler] 🚨 Navegando a URL de acción:', actionUrl);
            router.push(actionUrl as any);
          } else {
            console.log('[NotificationHandler] 🚨 Mostrando alerta urgente');
            this.showGenericAlert(payload);
          }
          break;
        }
        
        case 'promo':
        case 'promocion': {
          const promoUrl = payload.url || payload.actionUrl || payload.action_url;
          const localId = payload.localId || payload.local_id || payload.data_id || payload.related_id;
          
          if (promoUrl) {
            console.log('[NotificationHandler] 🎁 Navegando a URL de promoción:', promoUrl);
            router.push(promoUrl as any);
          } else if (localId) {
            console.log('[NotificationHandler] 🎁 Navegando a local con promoción:', localId);
            router.push(`/detalle/local?id=${localId}` as any);
          } else {
            console.log('[NotificationHandler] 🎁 Mostrando promoción');
            this.showGenericAlert(payload);
          }
          break;
        }
        
        case 'reminder': {
          const reminderUrl = payload.url || payload.actionUrl || payload.action_url;
          const entityId = payload.data_id || payload.related_id;
          const entityType = payload.related_type;
          
          if (reminderUrl) {
            console.log('[NotificationHandler] ⏰ Navegando a URL de recordatorio:', reminderUrl);
            router.push(reminderUrl as any);
          } else if (entityId && entityType) {
            // Construir ruta según tipo de entidad
            let route = '';
            switch (entityType.toLowerCase()) {
              case 'event':
                route = `/detalle/evento?id=${entityId}`;
                break;
              case 'local':
                route = `/detalle/local?id=${entityId}`;
                break;
              case 'post':
                route = `/social/post?id=${entityId}`;
                break;
              default:
                console.warn('[NotificationHandler] ⚠️ Tipo de entidad desconocido:', entityType);
                this.showGenericAlert(payload);
                return;
            }
            console.log('[NotificationHandler] ⏰ Navegando a recordatorio:', route);
            router.push(route as any);
          } else {
            console.log('[NotificationHandler] ⏰ Mostrando recordatorio');
            this.showGenericAlert(payload);
          }
          break;
        }
        
        // ═══════════════════════════════════════════════════════════════
        // TIPO DESCONOCIDO - Intentar navegación genérica
        // ═══════════════════════════════════════════════════════════════
        
        default: {
          console.warn('[NotificationHandler] ⚠️ Tipo de notificación desconocido:', type);
          console.warn('[NotificationHandler] 📊 Intentando navegación genérica...');
          
          // Intentar usar related_type para construir ruta
          const relatedType = payload.related_type;
          const relatedId = payload.related_id || payload.data_id;
          
          if (relatedType && relatedId) {
            let route = '';
            
            switch (relatedType.toLowerCase()) {
              case 'post':
                route = `/social/post?id=${relatedId}`;
                break;
              case 'user':
                route = `/perfil/usuario?userId=${relatedId}`;
                break;
              case 'event':
                route = `/detalle/evento?id=${relatedId}`;
                break;
              case 'local':
                route = `/detalle/local?id=${relatedId}`;
                break;
              case 'conversation':
                route = `/chat/conversacion?conversationId=${relatedId}`;
                break;
            }
            
            if (route) {
              console.log('[NotificationHandler] ✅ Navegando usando related_type:', route);
              router.push(route as any);
            } else {
              console.warn('[NotificationHandler] ⚠️ No se pudo construir ruta');
              this.showGenericAlert(payload);
            }
          } else {
            console.warn('[NotificationHandler] ⚠️ Sin información suficiente para navegar');
            this.showGenericAlert(payload);
          }
          break;
        }
      }
    } catch (error: any) {
      console.error('[NotificationHandler] ❌ Error navegando:', error.message);
      Alert.alert(
        'Error',
        'No se pudo abrir el contenido de la notificación.',
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Mostrar alerta genérica cuando no hay navegación específica
   */
  private showGenericAlert(payload: NotificationPayload) {
    const title = payload.title || 'Notificación';
    const body = payload.body || payload.message || 'Tienes una nueva notificación';
    
    Alert.alert(
      title,
      body,
      [{ text: 'OK' }]
    );
  }

  /**
   * Obtener prioridad según tipo de notificación
   */
  private getPriority(type?: string): Notifications.AndroidNotificationPriority {
    if (!type) return Notifications.AndroidNotificationPriority.DEFAULT;
    
    const highPriority = ['message', 'mensaje', 'urgent', 'urgente', 'cheers'];
    const maxPriority = ['urgent', 'urgente', 'sistema'];
    
    if (maxPriority.includes(type.toLowerCase())) {
      return Notifications.AndroidNotificationPriority.MAX;
    }
    
    if (highPriority.includes(type.toLowerCase())) {
      return Notifications.AndroidNotificationPriority.HIGH;
    }
    
    return Notifications.AndroidNotificationPriority.DEFAULT;
  }

  /**
   * NUEVO v3.0: Obtener canal de notificación según tipo
   */
  private getNotificationChannel(type?: string): string {
    if (!type) return 'default';
    
    const typeLower = type.toLowerCase();
    
    if (['message', 'mensaje', 'mensaje_privado'].includes(typeLower)) {
      return 'messages';
    }
    
    if (['urgent', 'urgente', 'sistema'].includes(typeLower)) {
      return 'urgent';
    }
    
    if (['like', 'comment', 'comentario', 'follow', 'seguidor', 'mention', 'mencion'].includes(typeLower)) {
      return 'social';
    }
    
    return 'default';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

export const notificationHandler = new NotificationHandler();

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * NUEVO v3.0: Enviar notificación de prueba
 * Útil para verificar que las notificaciones funcionan
 */
export async function sendTestNotification() {
  return notificationHandler.sendTestNotification();
}

/**
 * NUEVO v3.0: Obtener el push token actual
 */
export function getPushToken(): string | null {
  return notificationHandler.getPushToken();
}

/**
 * NUEVO v3.0: Verificar estado de las notificaciones
 */
export async function getNotificationStatus() {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    const pushToken = notificationHandler.getPushToken();
    const isDevice = Device.isDevice;
    
    return {
      permissionsGranted: status === 'granted',
      pushTokenRegistered: !!pushToken,
      pushToken: pushToken,
      isPhysicalDevice: isDevice,
      platform: Platform.OS,
    };
  } catch (error: any) {
    console.error('[NotificationHandler v3.0] ❌ Error obteniendo estado:', error.message);
    return {
      permissionsGranted: false,
      pushTokenRegistered: false,
      pushToken: null,
      isPhysicalDevice: false,
      platform: Platform.OS,
      error: error.message,
    };
  }
}
