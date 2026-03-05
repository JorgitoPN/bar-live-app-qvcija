
# 🔔 TRIGGERS DE NOTIFICACIONES NECESARIOS EN EL BACKEND

## 📋 RESUMEN

Para que las notificaciones push funcionen completamente, necesitas configurar triggers en el backend que envíen notificaciones cuando ocurran ciertos eventos.

## 🎯 EVENTOS QUE DEBEN ENVIAR NOTIFICACIONES

### 1. MENSAJES DIRECTOS
**Cuándo**: Un usuario recibe un mensaje directo
**Tipo**: `message`
**Prioridad**: MAX (heads-up notification)

```typescript
// Cuando se crea un nuevo mensaje:
await sendPushNotification(recipientUserId, {
  type: 'message',
  title: `${senderName} te envió un mensaje`,
  body: messageContent,
  conversationId: conversationId,
  deepLink: `barlive://chat/${conversationId}`,
  silent: false,
});
```

### 2. LIKES EN PUBLICACIONES
**Cuándo**: Alguien da like a tu publicación
**Tipo**: `like`
**Prioridad**: HIGH

```typescript
// Cuando alguien da like:
await sendPushNotification(postAuthorId, {
  type: 'like',
  title: `${likerName} le gustó tu publicación`,
  body: postContent.substring(0, 50) + '...',
  postId: postId,
  userId: likerId,
  deepLink: `barlive://social/post/${postId}`,
  silent: false,
});
```

### 3. COMENTARIOS EN PUBLICACIONES
**Cuándo**: Alguien comenta en tu publicación
**Tipo**: `comment`
**Prioridad**: HIGH

```typescript
// Cuando alguien comenta:
await sendPushNotification(postAuthorId, {
  type: 'comment',
  title: `${commenterName} comentó tu publicación`,
  body: commentContent,
  postId: postId,
  userId: commenterId,
  deepLink: `barlive://social/post/${postId}`,
  silent: false,
});
```

### 4. NUEVOS SEGUIDORES
**Cuándo**: Alguien te sigue
**Tipo**: `follow`
**Prioridad**: DEFAULT

```typescript
// Cuando alguien te sigue:
await sendPushNotification(followedUserId, {
  type: 'follow',
  title: `${followerName} comenzó a seguirte`,
  body: `Ahora tienes ${followerCount} seguidores`,
  userId: followerId,
  deepLink: `barlive://perfil/usuario?userId=${followerId}`,
  silent: false,
});
```

### 5. RECORDATORIOS DE EVENTOS
**Cuándo**: 1 hora antes de un evento
**Tipo**: `event`
**Prioridad**: HIGH

```typescript
// 1 hora antes del evento:
await sendPushNotification(userId, {
  type: 'event',
  title: `Recordatorio: ${eventTitle}`,
  body: `El evento comienza en 1 hora en ${localName}`,
  eventId: eventId,
  localId: localId,
  deepLink: `barlive://detalle/evento?id=${eventId}`,
  scheduled: new Date(eventDate.getTime() - 60 * 60 * 1000), // 1 hora antes
  silent: false,
});
```

### 6. BRINDIS EN SALA VIRTUAL
**Cuándo**: Alguien te envía un brindis
**Tipo**: `cheers`
**Prioridad**: MAX (heads-up notification)

```typescript
// Cuando alguien te envía un brindis:
await sendPushNotification(recipientUserId, {
  type: 'cheers',
  title: `🍻 ${senderName} te envió un brindis`,
  body: `¡Salud! ${senderName} quiere brindar contigo`,
  localId: localId,
  userId: senderId,
  deepLink: `barlive://detalle/sala-virtual-enhanced?localId=${localId}`,
  silent: false,
});
```

### 7. COMPRA DE PLAN
**Cuándo**: Un usuario compra un plan
**Tipo**: `plan_purchase`
**Prioridad**: HIGH

```typescript
// Cuando se completa la compra:
await sendPushNotification(userId, {
  type: 'plan_purchase',
  title: `✅ Compra confirmada`,
  body: `Tu plan ${planName} está activo`,
  planId: planId,
  deepLink: `barlive://gestion/mi-suscripcion`,
  silent: false,
});
```

### 8. RENOVACIÓN DE PLAN
**Cuándo**: 3 días antes de que expire el plan
**Tipo**: `plan_renewal`
**Prioridad**: HIGH

```typescript
// 3 días antes de expirar:
await sendPushNotification(userId, {
  type: 'plan_renewal',
  title: `⏰ Tu plan expira pronto`,
  body: `Tu plan ${planName} expira en ${daysRemaining} días`,
  planId: planId,
  daysRemaining: daysRemaining,
  deepLink: `barlive://gestion/mi-suscripcion`,
  scheduled: new Date(expirationDate.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 días antes
  silent: false,
});
```

### 9. RECORDATORIO DE LOCAL DESTACADO
**Cuándo**: 1 día antes de que expire el destacado
**Tipo**: `featured_local_reminder`
**Prioridad**: HIGH

```typescript
// 1 día antes de expirar:
await sendPushNotification(ownerId, {
  type: 'featured_local_reminder',
  title: `⏰ Tu local destacado expira pronto`,
  body: `${localName} dejará de estar destacado en ${daysRemaining} día`,
  localId: localId,
  daysRemaining: daysRemaining,
  deepLink: `barlive://gestion/mis-locales?localId=${localId}`,
  scheduled: new Date(expirationDate.getTime() - 24 * 60 * 60 * 1000), // 1 día antes
  silent: false,
});
```

### 10. PROMOCIONES
**Cuándo**: Se publica una nueva promoción
**Tipo**: `promo`
**Prioridad**: DEFAULT

```typescript
// Cuando se publica una promo:
await sendBroadcastNotification(targetUserIds, {
  type: 'promo',
  title: `🎉 Nueva promoción en ${localName}`,
  body: promoDescription,
  localId: localId,
  deepLink: `barlive://detalle/local?id=${localId}`,
  segment: 'nearby_users', // Solo usuarios cercanos
  silent: false,
});
```

## 🔧 IMPLEMENTACIÓN EN EL BACKEND

### Opción 1: Supabase Edge Functions

Crea Edge Functions para cada tipo de notificación:

```typescript
// supabase/functions/send-notification-on-message/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { recipientUserId, senderName, messageContent, conversationId } = await req.json();

  // Obtener el push token del usuario
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', recipientUserId)
    .eq('active', true);

  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ error: 'No push tokens found' }), {
      status: 404,
    });
  }

  // Enviar notificación a cada token
  const messages = tokens.map(({ token }) => ({
    to: token,
    sound: 'brindis',
    title: `${senderName} te envió un mensaje`,
    body: messageContent,
    data: {
      type: 'message',
      conversationId,
    },
    priority: 'high',
    channelId: 'messages',
  }));

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
  });
});
```

### Opción 2: Database Triggers

Crea triggers en PostgreSQL que llamen a las Edge Functions:

```sql
-- Trigger para enviar notificación cuando se crea un mensaje
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Llamar a la Edge Function
  PERFORM net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-notification-on-message',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := json_build_object(
      'recipientUserId', NEW.recipient_id,
      'senderName', (SELECT nombre FROM usuarios WHERE id = NEW.sender_id),
      'messageContent', NEW.content,
      'conversationId', NEW.conversation_id
    )::jsonb
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_on_new_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_message();
```

## 📊 TABLA DE PUSH TOKENS

Asegúrate de tener esta tabla en tu base de datos:

```sql
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_id TEXT NOT NULL,
  device_name TEXT,
  os_version TEXT,
  app_version TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_active ON push_tokens(active);
```

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Tabla `push_tokens` creada en la base de datos
- [ ] Edge Functions creadas para cada tipo de notificación
- [ ] Database triggers configurados para eventos automáticos
- [ ] Notificaciones de mensajes directos funcionando
- [ ] Notificaciones de likes funcionando
- [ ] Notificaciones de comentarios funcionando
- [ ] Notificaciones de seguidores funcionando
- [ ] Recordatorios de eventos funcionando
- [ ] Notificaciones de brindis funcionando
- [ ] Notificaciones de compra de plan funcionando
- [ ] Recordatorios de renovación de plan funcionando
- [ ] Recordatorios de local destacado funcionando
- [ ] Notificaciones de promociones funcionando

## 🧪 PROBAR NOTIFICACIONES

Usa el componente `NotificationTester` para probar que las notificaciones se reciban correctamente:

1. Navega a `/perfil/test-notifications`
2. Presiona "Registrar para Notificaciones"
3. Presiona "Enviar Notificación de Prueba"
4. Verifica que la notificación se reciba con sonido y vibración

## 📞 SOPORTE

Si necesitas ayuda implementando los triggers:
- Supabase Docs: https://supabase.com/docs/guides/functions
- Expo Push Notifications: https://docs.expo.dev/push-notifications/sending-notifications/
