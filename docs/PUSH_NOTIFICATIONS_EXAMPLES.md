
# 📱 Ejemplos de Uso - Sistema de Notificaciones Push

## 🎯 Casos de Uso Comunes

### 1. Notificación de Like en Post

```typescript
import { sendPushNotification } from '@/utils/notifications';

// Cuando un usuario da like a un post
async function handleLike(postId: string, postAuthorId: string, likerName: string) {
  await sendPushNotification(postAuthorId, {
    type: 'like',
    title: '❤️ Nuevo like',
    body: `A ${likerName} le gustó tu publicación`,
    postId: postId,
    deepLink: `barlive://social/post/${postId}`,
  });
}
```

### 2. Notificación de Nuevo Comentario

```typescript
// Cuando alguien comenta en un post
async function handleComment(
  postId: string, 
  postAuthorId: string, 
  commenterName: string,
  commentText: string
) {
  await sendPushNotification(postAuthorId, {
    type: 'comment',
    title: `💬 ${commenterName} comentó`,
    body: commentText.substring(0, 100), // Primeros 100 caracteres
    postId: postId,
    deepLink: `barlive://social/post/${postId}`,
  });
}
```

### 3. Notificación de Nuevo Seguidor

```typescript
// Cuando alguien te sigue
async function handleFollow(followedUserId: string, followerName: string, followerId: string) {
  await sendPushNotification(followedUserId, {
    type: 'follow',
    title: '👤 Nuevo seguidor',
    body: `${followerName} comenzó a seguirte`,
    userId: followerId,
    deepLink: `barlive://perfil/usuario?userId=${followerId}`,
  });
}
```

### 4. Notificación de Mención

```typescript
// Cuando te mencionan en un post o comentario
async function handleMention(
  mentionedUserId: string, 
  mentionerName: string,
  postId: string
) {
  await sendPushNotification(mentionedUserId, {
    type: 'mention',
    title: '📢 Te mencionaron',
    body: `${mentionerName} te mencionó en una publicación`,
    postId: postId,
    deepLink: `barlive://social/post/${postId}`,
  });
}
```

### 5. Notificación de Mensaje Privado

```typescript
// Cuando recibes un mensaje privado
async function handlePrivateMessage(
  recipientId: string,
  senderName: string,
  messageText: string,
  conversationId: string
) {
  await sendPushNotification(recipientId, {
    type: 'message',
    title: `💬 ${senderName}`,
    body: messageText.substring(0, 100),
    conversationId: conversationId,
    deepLink: `barlive://chat/${conversationId}`,
  });
}
```

### 6. Notificación de Evento Próximo

```typescript
// Recordatorio de evento
async function handleEventReminder(
  userId: string,
  eventTitle: string,
  eventId: string,
  hoursUntilEvent: number
) {
  await sendPushNotification(userId, {
    type: 'event',
    title: '⏰ Recordatorio de evento',
    body: `${eventTitle} comienza en ${hoursUntilEvent} horas`,
    eventId: eventId,
    deepLink: `barlive://detalle/evento?id=${eventId}`,
  });
}
```

### 7. Notificación de Brindis en Sala Virtual

```typescript
// Cuando alguien te envía un brindis
async function handleCheers(
  recipientId: string,
  senderName: string,
  localId: string,
  localName: string
) {
  await sendPushNotification(recipientId, {
    type: 'cheers',
    title: '🍻 ¡Salud!',
    body: `${senderName} te envió un brindis en ${localName}`,
    localId: localId,
    deepLink: `barlive://detalle/sala-virtual-enhanced?localId=${localId}`,
  });
}
```

### 8. Notificación Broadcast de Nuevo Evento

```typescript
import { sendBroadcastNotification } from '@/utils/notifications';

// Notificar a todos los seguidores de un local sobre un nuevo evento
async function notifyFollowersAboutEvent(
  followerIds: string[],
  localName: string,
  eventTitle: string,
  eventId: string
) {
  await sendBroadcastNotification(followerIds, {
    type: 'event',
    title: `🎉 Nuevo evento en ${localName}`,
    body: eventTitle,
    deepLink: `barlive://detalle/evento?id=${eventId}`,
  });
}
```

### 9. Notificación Programada

```typescript
import { scheduleNotification } from '@/utils/notifications';

// Programar recordatorio para 2 horas antes del evento
async function scheduleEventReminder(
  userId: string,
  eventTitle: string,
  eventId: string,
  eventStartTime: Date
) {
  const reminderTime = new Date(eventStartTime);
  reminderTime.setHours(reminderTime.getHours() - 2);

  await scheduleNotification(
    userId,
    {
      type: 'event',
      title: '⏰ Tu evento comienza pronto',
      body: `${eventTitle} comienza en 2 horas`,
      eventId: eventId,
      deepLink: `barlive://detalle/evento?id=${eventId}`,
    },
    reminderTime
  );
}
```

### 10. Notificación Silenciosa (Background Sync)

```typescript
// Notificación silenciosa para sincronizar datos en background
async function sendBackgroundSync(userId: string) {
  await sendPushNotification(userId, {
    type: 'urgent', // Tipo genérico
    title: '',
    body: '',
    silent: true, // No muestra notificación al usuario
  });
}
```

---

## 🔧 Integración en Componentes

### Ejemplo: Botón de Like con Notificación

```typescript
import { useState } from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { supabase } from '@/utils/supabase';
import { sendPushNotification } from '@/utils/notifications';

function LikeButton({ postId, postAuthorId, currentUserId, currentUserName }) {
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLike = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      // Guardar like en base de datos
      const { error } = await supabase
        .from('likes')
        .insert({
          post_id: postId,
          usuario_id: currentUserId,
        });

      if (error) throw error;

      setLiked(true);

      // Enviar notificación al autor del post (si no es el mismo usuario)
      if (postAuthorId !== currentUserId) {
        await sendPushNotification(postAuthorId, {
          type: 'like',
          title: '❤️ Nuevo like',
          body: `A ${currentUserName} le gustó tu publicación`,
          postId: postId,
          userId: currentUserId,
          deepLink: `barlive://social/post/${postId}`,
        });
      }
    } catch (error) {
      console.error('Error al dar like:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity onPress={handleLike} disabled={loading}>
      <Text>{liked ? '❤️' : '🤍'} Like</Text>
    </TouchableOpacity>
  );
}
```

### Ejemplo: Formulario de Comentario con Notificación

```typescript
import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { supabase } from '@/utils/supabase';
import { sendPushNotification } from '@/utils/notifications';

function CommentForm({ postId, postAuthorId, currentUserId, currentUserName }) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim() || loading) return;

    setLoading(true);
    try {
      // Guardar comentario
      const { error } = await supabase
        .from('comentarios')
        .insert({
          post_id: postId,
          autor_id: currentUserId,
          texto: comment,
        });

      if (error) throw error;

      // Enviar notificación al autor del post
      if (postAuthorId !== currentUserId) {
        await sendPushNotification(postAuthorId, {
          type: 'comment',
          title: `💬 ${currentUserName} comentó`,
          body: comment.substring(0, 100),
          postId: postId,
          userId: currentUserId,
          deepLink: `barlive://social/post/${postId}`,
        });
      }

      setComment('');
    } catch (error) {
      console.error('Error al comentar:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="Escribe un comentario..."
        multiline
      />
      <TouchableOpacity onPress={handleSubmit} disabled={loading}>
        <Text>Enviar</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Ejemplo: Botón de Seguir con Notificación

```typescript
import { useState } from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { supabase } from '@/utils/supabase';
import { sendPushNotification } from '@/utils/notifications';

function FollowButton({ targetUserId, currentUserId, currentUserName }) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    if (loading) return;

    setLoading(true);
    try {
      if (following) {
        // Dejar de seguir
        await supabase
          .from('seguidores')
          .delete()
          .eq('seguidor_id', currentUserId)
          .eq('seguido_id', targetUserId);

        setFollowing(false);
      } else {
        // Seguir
        const { error } = await supabase
          .from('seguidores')
          .insert({
            seguidor_id: currentUserId,
            seguido_id: targetUserId,
          });

        if (error) throw error;

        setFollowing(true);

        // Enviar notificación
        await sendPushNotification(targetUserId, {
          type: 'follow',
          title: '👤 Nuevo seguidor',
          body: `${currentUserName} comenzó a seguirte`,
          userId: currentUserId,
          deepLink: `barlive://perfil/usuario?userId=${currentUserId}`,
        });
      }
    } catch (error) {
      console.error('Error al seguir:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity onPress={handleFollow} disabled={loading}>
      <Text>{following ? 'Siguiendo' : 'Seguir'}</Text>
    </TouchableOpacity>
  );
}
```

---

## 🎨 Personalización de Notificaciones

### Notificación con Imagen

```typescript
await sendPushNotification(userId, {
  type: 'event',
  title: '🎉 Nuevo evento',
  body: 'Fiesta de Halloween en Bar Central',
  eventId: eventId,
  imageUrl: 'https://example.com/event-image.jpg', // Imagen del evento
  deepLink: `barlive://detalle/evento?id=${eventId}`,
});
```

### Notificación Urgente (Alta Prioridad)

```typescript
await sendPushNotification(userId, {
  type: 'urgent',
  title: '🚨 Alerta importante',
  body: 'Tu reserva está por expirar',
  deepLink: 'barlive://reservas',
});
```

### Notificación de Promoción

```typescript
await sendPushNotification(userId, {
  type: 'promo',
  title: '🎁 Oferta especial',
  body: '2x1 en todas las bebidas hasta medianoche',
  localId: localId,
  deepLink: `barlive://detalle/local?id=${localId}`,
});
```

---

## 🔔 Gestión de Permisos

### Solicitar Permisos al Usuario

```typescript
import { registerForPushNotifications } from '@/utils/notifications';

function NotificationPermissionScreen() {
  const handleRequestPermission = async () => {
    const token = await registerForPushNotifications();
    
    if (token) {
      console.log('Permisos concedidos, token:', token);
      // Navegar a la siguiente pantalla
    } else {
      console.log('Permisos denegados');
      // Mostrar mensaje explicativo
    }
  };

  return (
    <View>
      <Text>¿Quieres recibir notificaciones?</Text>
      <TouchableOpacity onPress={handleRequestPermission}>
        <Text>Activar notificaciones</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Verificar Estado de Permisos

```typescript
import { getNotificationStatus } from '@/utils/notifications';

async function checkNotificationStatus() {
  const status = await getNotificationStatus();
  
  console.log('Disponible:', status.available);
  console.log('Permisos:', status.permissionsGranted);
  console.log('Token registrado:', status.tokenRegistered);
  console.log('Plataforma:', status.platform);
  
  if (!status.permissionsGranted) {
    // Mostrar pantalla para solicitar permisos
  }
}
```

---

## 🧪 Testing y Debugging

### Enviar Notificación de Prueba

```typescript
import { scheduleTestNotification } from '@/utils/notifications';

// En cualquier pantalla de desarrollo
<TouchableOpacity onPress={scheduleTestNotification}>
  <Text>🧪 Enviar Notificación de Prueba</Text>
</TouchableOpacity>
```

### Ver Estado del Sistema

```typescript
import { getNotificationStatus, getBadgeCount } from '@/utils/notifications';

async function showNotificationDebugInfo() {
  const status = await getNotificationStatus();
  const badgeCount = await getBadgeCount();
  
  console.log('=== NOTIFICATION DEBUG INFO ===');
  console.log('Available:', status.available);
  console.log('Permissions:', status.permissionsGranted);
  console.log('Token registered:', status.tokenRegistered);
  console.log('Platform:', status.platform);
  console.log('Is Expo Go:', status.isExpoGo);
  console.log('Badge count:', badgeCount);
  console.log('==============================');
}
```

### Limpiar Notificaciones y Badge

```typescript
import { clearAllNotifications } from '@/utils/notifications';

// Limpiar todas las notificaciones cuando el usuario abre la app
useEffect(() => {
  clearAllNotifications();
}, []);
```

---

## 📊 Mejores Prácticas

### 1. No Enviar Notificaciones a Ti Mismo

```typescript
// ✅ CORRECTO
if (postAuthorId !== currentUserId) {
  await sendPushNotification(postAuthorId, { ... });
}

// ❌ INCORRECTO
await sendPushNotification(postAuthorId, { ... }); // Puede enviarte a ti mismo
```

### 2. Limitar Longitud del Texto

```typescript
// ✅ CORRECTO
body: commentText.substring(0, 100) + (commentText.length > 100 ? '...' : '')

// ❌ INCORRECTO
body: commentText // Puede ser muy largo
```

### 3. Siempre Incluir Deep Link

```typescript
// ✅ CORRECTO
deepLink: `barlive://social/post/${postId}`

// ❌ INCORRECTO
// Sin deep link - la notificación no lleva a ningún lado
```

### 4. Manejar Errores Gracefully

```typescript
try {
  await sendPushNotification(userId, notification);
} catch (error) {
  console.error('Error enviando notificación:', error);
  // No bloquear la operación principal si falla la notificación
}
```

### 5. Respetar Preferencias del Usuario

```typescript
// Verificar si el usuario tiene notificaciones habilitadas
const { data: settings } = await supabase
  .from('notification_settings')
  .select('likes, comments, messages')
  .eq('user_id', userId)
  .single();

if (settings?.likes) {
  await sendPushNotification(userId, { type: 'like', ... });
}
```

---

## 🎯 Conclusión

Este sistema de notificaciones está diseñado para ser:

- **Fácil de usar**: API simple y directa
- **Robusto**: Manejo automático de errores y tokens inválidos
- **Escalable**: Soporte para envío masivo con batching
- **Flexible**: Múltiples tipos de notificaciones y personalización
- **Seguro**: RLS policies y validación de permisos

¡Empieza a enviar notificaciones y mejora el engagement de tu app! 🚀
