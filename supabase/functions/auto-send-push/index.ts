
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (req) => {
  try {
    const { record } = await req.json();
    
    console.log('[AutoSendPush] 📬 Nueva notificación detectada:', record.id);
    
    // Crear cliente de Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Obtener tokens del usuario
    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', record.user_id)
      .eq('active', true);
    
    if (tokensError) {
      console.error('[AutoSendPush] ❌ Error obteniendo tokens:', tokensError);
      return new Response(JSON.stringify({ error: tokensError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (!tokens || tokens.length === 0) {
      console.log('[AutoSendPush] ⚠️ Usuario sin tokens registrados');
      return new Response(JSON.stringify({ message: 'No tokens found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    console.log('[AutoSendPush] 📤 Enviando push a', tokens.length, 'dispositivos');
    
    // Preparar mensajes para Expo
    const messages = tokens.map((tokenData) => ({
      to: tokenData.token,
      sound: 'brindis',
      title: record.title || record.titulo || 'Nueva notificación',
      body: record.body || record.mensaje || '',
      data: record.data || {},
      priority: 'high',
      channelId: getChannelForType(record.type || record.tipo),
    }));
    
    // Enviar a Expo Push API
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    
    const result = await response.json();
    console.log('[AutoSendPush] ✅ Push enviado:', result);
    
    // Manejar tokens inválidos
    if (result.data) {
      for (let i = 0; i < result.data.length; i++) {
        const pushResult = result.data[i];
        if (pushResult.status === 'error' && pushResult.details?.error === 'DeviceNotRegistered') {
          const invalidToken = tokens[i].token;
          console.log('[AutoSendPush] 🗑️ Desactivando token inválido:', invalidToken);
          
          await supabase
            .from('push_tokens')
            .update({ active: false })
            .eq('token', invalidToken);
        }
      }
    }
    
    return new Response(JSON.stringify({ success: true, sent: messages.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[AutoSendPush] ❌ Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

function getChannelForType(type: string): string {
  const channelMap: Record<string, string> = {
    'message': 'messages',
    'mensaje': 'messages',
    'event': 'events',
    'evento': 'events',
    'cheers': 'cheers',
    'saludos': 'cheers',
    'promo': 'promos',
    'promocion': 'promos',
    'plan_purchase': 'subscriptions',
    'plan_renewal': 'subscriptions',
    'featured_local_reminder': 'subscriptions',
    'urgent': 'default',
    'urgente': 'default',
  };
  
  return channelMap[type] || 'default';
}
