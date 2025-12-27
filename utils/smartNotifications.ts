
import { supabase } from './supabase';
import * as Notifications from 'expo-notifications';

/**
 * ✅ SMART NOTIFICATIONS SYSTEM v1.0
 * 
 * FEATURES:
 * - ✅ Push notification after 48h of registration for free plan owners
 * - ✅ Push notification after credit depletion
 * - ✅ Uses scarcity and urgency tactics
 * - ✅ Encourages plan upgrades
 */

interface NotificationSchedule {
  userId: string;
  localId: string;
  type: '48h_reminder' | 'credits_depleted';
  scheduledFor: Date;
}

/**
 * Schedule a notification for 48 hours after local claim
 */
export async function schedule48HourReminder(userId: string, localId: string) {
  try {
    console.log('[smartNotifications] Scheduling 48h reminder for user:', userId, 'local:', localId);

    // Check if user has free plan
    const { data: subscription } = await supabase
      .from('suscripciones_locales')
      .select('plan_id, planes_suscripcion!inner(nombre)')
      .eq('local_id', localId)
      .eq('propietario_id', userId)
      .eq('estado', 'activa')
      .single();

    if (!subscription) {
      console.log('[smartNotifications] No active subscription found');
      return;
    }

    const planNombre = (subscription as any).planes_suscripcion?.nombre?.toLowerCase();

    if (planNombre !== 'free' && planNombre !== 'basico') {
      console.log('[smartNotifications] User has paid plan, skipping reminder');
      return;
    }

    // Schedule notification for 48 hours from now
    const scheduledDate = new Date();
    scheduledDate.setHours(scheduledDate.getHours() + 48);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ Tu local está perdiendo visibilidad',
        body: 'Tu local está perdiendo visibilidad frente a otros. Usa tu crédito de Destacado gratuito hoy.',
        data: {
          type: '48h_reminder',
          localId: localId,
          action: 'activate_highlight',
        },
      },
      trigger: {
        date: scheduledDate,
      },
    });

    console.log('[smartNotifications] ✅ 48h reminder scheduled for:', scheduledDate);
  } catch (error) {
    console.error('[smartNotifications] Error scheduling 48h reminder:', error);
  }
}

/**
 * Send notification when credits are depleted
 */
export async function sendCreditsDepletedNotification(userId: string, localId: string, localNombre: string) {
  try {
    console.log('[smartNotifications] Sending credits depleted notification for local:', localId);

    // Check if user still has free plan
    const { data: subscription } = await supabase
      .from('suscripciones_locales')
      .select('plan_id, planes_suscripcion!inner(nombre)')
      .eq('local_id', localId)
      .eq('propietario_id', userId)
      .eq('estado', 'activa')
      .single();

    if (!subscription) {
      console.log('[smartNotifications] No active subscription found');
      return;
    }

    const planNombre = (subscription as any).planes_suscripcion?.nombre?.toLowerCase();

    if (planNombre !== 'free' && planNombre !== 'basico') {
      console.log('[smartNotifications] User has paid plan, skipping notification');
      return;
    }

    // Send immediate notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎁 Tus regalos se han agotado',
        body: `Tus regalos se han agotado, pero tus nuevos clientes no. Suscríbete al Plan Estándar por menos de lo que cuesta un café al día.`,
        data: {
          type: 'credits_depleted',
          localId: localId,
          action: 'view_plans',
        },
      },
      trigger: null, // Send immediately
    });

    console.log('[smartNotifications] ✅ Credits depleted notification sent');
  } catch (error) {
    console.error('[smartNotifications] Error sending credits depleted notification:', error);
  }
}

/**
 * Send post-credit usage report
 */
export async function sendHighlightUsageReport(userId: string, localId: string, localNombre: string, clicksIncrease: number) {
  try {
    console.log('[smartNotifications] Sending highlight usage report for local:', localId);

    // Send notification with stats
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `📊 Informe de ${localNombre}`,
        body: `Ayer tuviste un ${clicksIncrease}% más de clics gracias al destacado. Mantén este ritmo con el Plan Estándar.`,
        data: {
          type: 'highlight_report',
          localId: localId,
          action: 'view_plans',
        },
      },
      trigger: null, // Send immediately
    });

    console.log('[smartNotifications] ✅ Highlight usage report sent');
  } catch (error) {
    console.error('[smartNotifications] Error sending highlight usage report:', error);
  }
}

/**
 * Handle notification response (when user taps notification)
 */
export function handleNotificationResponse(response: Notifications.NotificationResponse, router: any) {
  const data = response.notification.request.content.data;

  if (!data) return;

  switch (data.action) {
    case 'activate_highlight':
      router.push({
        pathname: '/(tabs)/gestion',
        params: {
          autoActivateHighlight: 'true',
          localId: data.localId,
        },
      });
      break;

    case 'view_plans':
      router.push({
        pathname: '/gestion/planes-suscripcion',
        params: {
          localId: data.localId,
        },
      });
      break;

    default:
      console.log('[smartNotifications] Unknown action:', data.action);
  }
}
