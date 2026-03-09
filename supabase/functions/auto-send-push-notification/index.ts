
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// ═══════════════════════════════════════════════════════════════════════════
// AUTO-SEND PUSH NOTIFICATION EDGE FUNCTION v3.0 - INSTAGRAM-STYLE STACKING
// ═══════════════════════════════════════════════════════════════════════════
// 
// ✅ v3.0 FEATURES:
// - Eliminación de duplicidad (una sola notificación por evento)
// - Agrupación/Stacking con collapseKey (Android) y apns-collapse-id (iOS)
// - Formato consistente: [Nombre del Autor]: [Contenido del mensaje]
// - Soporte para _displayInForeground: false (sin modal intrusivo)
// 
// CAMBIOS PRINCIPALES:
// 1. Extrae collapse_id del payload data
// 2. Aplica collapseKey para Android
// 3. Aplica apns-collapse-id para iOS
// 4. Formato de título y cuerpo mejorado para mensajes
// 
// ═══════════════════════════════════════════════════════════════════════════

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data?: any;
  read: boolean;
  created_at: string;
}

serve(async (req) => {
  try {
    console.log('[auto-send-push v3.0] 🚀 Iniciando envío automático de notificación push');

    // Verificar método
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener el registro de notificación
    const { record } = await req.json() as { record: NotificationRecord };
    
    if (!record || !record.user_id) {
      console.error('[auto-send-push v3.0] ❌ No se proporcionó un registro válido');
      return new Response(
        JSON.stringify({ error: 'Invalid notification record' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[auto-send-push v3.0] 📋 Notificación:', {
      id: record.id,
      user_id: record.user_id,
      type: record.type,
      title: record.title,
    });

    // Inicializar cliente de Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener push token desde usuarios.push_token
    const { data: user, error: userError } = await supabase
      .from('usuarios')
      .select('push_token')
      .eq('id', record.user_id)
      .single();

    if (userError) {
      console.error('[auto-send-push v3.0] ❌ Error obteniendo usuario:', userError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user', details: userError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!user || !user.push_token) {
      console.log('[auto-send-push v3.0] ⚠️ No se encontró push token para el usuario:', record.user_id);
      return new Response(
        JSON.stringify({ message: 'No push token found for user', sent: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[auto-send-push v3.0] 📱 Push token encontrado para usuario:', record.user_id);

    // ═══════════════════════════════════════════════════════════════════════
    // PASO 2: IMPLEMENTAR AGRUPACIÓN (STACKING)
    // ═══════════════════════════════════════════════════════════════════════
    
    // Extraer collapse_id del payload data (si existe)
    const collapseId = record.data?.collapse_id || null;
    const eventType = record.data?.event_type || record.type;
    
    console.log('[auto-send-push v3.0] 🔗 Collapse ID:', collapseId || 'none');

    // ═══════════════════════════════════════════════════════════════════════
    // PASO 3: FORMATO DE DISPLAY
    // ═══════════════════════════════════════════════════════════════════════
    
    let finalTitle = record.title;
    let finalBody = record.body;
    
    // Para mensajes, asegurar formato: [Nombre del Autor]: [Contenido]
    if (eventType === 'message' && record.data?.sender_name && record.data?.message_content) {
      finalTitle = `${record.data.sender_name}:`;
      finalBody = record.data.message_content;
      console.log('[auto-send-push v3.0] 💬 Formato de mensaje aplicado:', finalTitle, finalBody);
    }

    // Mapear canales según el frontend
    const channelMap: Record<string, string> = {
      // Mensajes → canal 'messages'
      'message': 'messages',
      'mensaje': 'messages',
      'mensaje_privado': 'messages',
      
      // Saludos/Brindis → canal 'default'
      'cheers': 'default',
      'saludos': 'default',
      
      // Alertas urgentes → canal 'urgent'
      'urgent': 'urgent',
      'urgente': 'urgent',
      'sistema': 'urgent',
      
      // Interacciones sociales → canal 'social'
      'like': 'social',
      'comment': 'social',
      'comentario': 'social',
      'follow': 'social',
      'seguidor': 'social',
      'mention': 'social',
      'mencion': 'social',
      
      // Eventos → canal 'default'
      'event': 'default',
      'evento': 'default',
      
      // Otros → canal 'default'
      'plan_purchase': 'default',
      'compra_plan': 'default',
      'plan_renewal': 'default',
      'renovacion_plan': 'default',
      'featured_local_reminder': 'default',
      'recordatorio_local': 'default',
      'promo': 'default',
      'promocion': 'default',
      'reminder': 'default',
    };
    const channelId = channelMap[record.type] || 'default';

    // Determinar prioridad según tipo
    const highPriorityTypes = ['message', 'mensaje', 'mensaje_privado', 'cheers', 'saludos', 'urgent', 'urgente'];
    const priority = highPriorityTypes.includes(record.type) ? 'high' : 'default';

    // ═══════════════════════════════════════════════════════════════════════
    // CONSTRUIR MENSAJE CON STACKING
    // ═══════════════════════════════════════════════════════════════════════
    
    const message: any = {
      to: user.push_token,
      sound: 'brindis.wav',
      title: finalTitle,
      body: finalBody,
      data: {
        ...record.data,
        event_type: eventType,
      },
      priority: priority,
      channelId: channelId,
      badge: 1,
      _displayInForeground: false, // ✅ No mostrar modal intrusivo
    };

    // ✅ PASO 2: AÑADIR COLLAPSE KEY PARA AGRUPACIÓN
    if (collapseId) {
      // Android: collapseKey
      message.collapseKey = collapseId;
      
      // iOS: apns-collapse-id
      message.apns = {
        headers: {
          'apns-collapse-id': collapseId,
        },
      };
      
      console.log('[auto-send-push v3.0] 📦 Stacking habilitado con collapse ID:', collapseId);
    }

    console.log('[auto-send-push v3.0] 📤 Enviando notificación push...');
    console.log('[auto-send-push v3.0] 📊 Canal:', channelId, '| Prioridad:', priority);
    console.log('[auto-send-push v3.0] 📊 Stacking:', collapseId ? 'Sí' : 'No');

    // Enviar notificación a Expo Push Service
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify([message]), // Expo espera un array
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[auto-send-push v3.0] ❌ Error de Expo Push Service:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send push notification', details: errorText }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    console.log('[auto-send-push v3.0] ✅ Notificación enviada:', result);

    // Verificar si el token es inválido
    if (result.data && result.data[0]) {
      const pushResult = result.data[0];
      if (pushResult.status === 'error') {
        const errorType = pushResult.details?.error;
        if (errorType === 'DeviceNotRegistered' || errorType === 'InvalidCredentials') {
          console.log('[auto-send-push v3.0] 🗑️ Token inválido, limpiando...');
          // Limpiar token inválido
          await supabase
            .from('usuarios')
            .update({ push_token: null, push_token_updated_at: null })
            .eq('id', record.user_id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: 1,
        channel: channelId,
        priority: priority,
        stacking: collapseId ? true : false,
        collapse_id: collapseId,
        result: result,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[auto-send-push v3.0] ❌ Error inesperado:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
