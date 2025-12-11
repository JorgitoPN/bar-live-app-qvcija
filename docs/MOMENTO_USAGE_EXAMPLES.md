
# Sistema de Momentos - Ejemplos de Uso

## 🎯 Guía Rápida de Implementación

### 1. Integrar Carousel en Cualquier Pantalla

```typescript
import React, { useState } from 'react';
import { View } from 'react-native';
import MomentoCarousel from '@/components/momento/MomentoCarousel';
import MomentoViewer from '@/components/momento/MomentoViewer';
import MomentoUpload from '@/components/momento/MomentoUpload';

export default function MyScreen() {
  const [showViewer, setShowViewer] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState({ id: '', tipo: 'usuario' });

  return (
    <View>
      {/* Carousel de Momentos */}
      <MomentoCarousel
        onOpenViewer={(id, tipo) => {
          setSelectedAuthor({ id, tipo });
          setShowViewer(true);
        }}
        onUploadMomento={() => setShowUpload(true)}
      />

      {/* Visor Fullscreen */}
      <MomentoViewer
        visible={showViewer}
        authorId={selectedAuthor.id}
        authorType={selectedAuthor.tipo}
        onClose={() => setShowViewer(false)}
      />

      {/* Modal de Subida */}
      <MomentoUpload
        visible={showUpload}
        onClose={() => setShowUpload(false)}
        onSuccess={() => {
          console.log('Momento subido exitosamente');
          // Refresh data if needed
        }}
      />
    </View>
  );
}
```

### 2. Mini-Avatar en Posts

```typescript
import MiniAvatarWithMomento from '@/components/momento/MiniAvatarWithMomento';

// En tu componente de Post
<View style={styles.postHeader}>
  <MiniAvatarWithMomento
    userId={post.autor_id}
    imageUrl={post.autor_avatar}
    size={40}
    onPress={() => router.push(`/perfil/usuario?id=${post.autor_id}`)}
    showMomentoBorder={true}
  />
  <View style={styles.postInfo}>
    <Text style={styles.authorName}>{post.autor_nombre}</Text>
    <Text style={styles.postTime}>{formatTime(post.created_at)}</Text>
  </View>
</View>
```

### 3. Mini-Avatar en Comentarios

```typescript
import MiniAvatarWithMomento from '@/components/momento/MiniAvatarWithMomento';

// En tu componente de Comentario
<View style={styles.commentContainer}>
  <MiniAvatarWithMomento
    userId={comment.autor_id}
    imageUrl={comment.autor_avatar}
    size={32}
    showMomentoBorder={true}
  />
  <View style={styles.commentBubble}>
    <Text style={styles.commentAuthor}>{comment.autor_nombre}</Text>
    <Text style={styles.commentText}>{comment.texto}</Text>
  </View>
</View>
```

### 4. Mini-Avatar en Lista de Mensajes

```typescript
import MiniAvatarWithMomento from '@/components/momento/MiniAvatarWithMomento';

// En tu componente de Chat List
<TouchableOpacity 
  style={styles.chatItem}
  onPress={() => openChat(chat.id)}
>
  <MiniAvatarWithMomento
    userId={chat.otro_usuario_id}
    imageUrl={chat.otro_usuario_avatar}
    size={56}
    showMomentoBorder={true}
  />
  <View style={styles.chatInfo}>
    <Text style={styles.chatName}>{chat.otro_usuario_nombre}</Text>
    <Text style={styles.lastMessage}>{chat.ultimo_mensaje}</Text>
  </View>
  {chat.unread_count > 0 && (
    <View style={styles.unreadBadge}>
      <Text style={styles.unreadText}>{chat.unread_count}</Text>
    </View>
  )}
</TouchableOpacity>
```

### 5. Mini-Avatar para Locales

```typescript
import MiniAvatarWithMomento from '@/components/momento/MiniAvatarWithMomento';

// Para mostrar avatar de un local
<MiniAvatarWithMomento
  localId={local.id}
  imageUrl={local.imagen_url}
  size={48}
  onPress={() => router.push(`/detalle/local?id=${local.id}`)}
  showMomentoBorder={true}
/>
```

## 🔧 Casos de Uso Avanzados

### 6. Abrir Visor Directamente desde Notificación

```typescript
import { useRouter } from 'expo-router';

function handleNotificationPress(notification: any) {
  if (notification.tipo === 'momento_like' || notification.tipo === 'momento_view') {
    // Abrir visor de Momentos del autor
    setSelectedAuthor({
      id: notification.autor_id,
      tipo: notification.autor_tipo,
    });
    setShowViewer(true);
  }
}
```

### 7. Verificar si Usuario Tiene Momentos Activos

```typescript
import { supabase } from '@/app/integrations/supabase/client';

async function checkUserHasMomentos(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('momentos')
    .select('id')
    .eq('autor_id', userId)
    .eq('tipo', 'usuario')
    .gt('expires_at', new Date().toISOString())
    .limit(1);

  return !error && data && data.length > 0;
}

// Uso
const hasMomentos = await checkUserHasMomentos(user.id);
if (hasMomentos) {
  // Mostrar indicador especial
}
```

### 8. Obtener Estadísticas de Momentos

```typescript
async function getMomentoStats(momentoId: string) {
  const [viewsResult, likesResult] = await Promise.all([
    supabase
      .from('momento_views')
      .select('usuario_id, viewed_at, usuarios(nombre, avatar)')
      .eq('momento_id', momentoId)
      .order('viewed_at', { ascending: false }),
    supabase
      .from('momento_likes')
      .select('usuario_id, created_at, usuarios(nombre, avatar)')
      .eq('momento_id', momentoId)
      .order('created_at', { ascending: false }),
  ]);

  return {
    views: viewsResult.data || [],
    likes: likesResult.data || [],
    viewCount: viewsResult.data?.length || 0,
    likeCount: likesResult.data?.length || 0,
  };
}
```

### 9. Crear Mensaje Directo desde Momento

```typescript
async function sendMomentoMessage(
  momentoId: string,
  authorId: string,
  currentUserId: string,
  message: string
) {
  // 1. Crear o obtener chat
  const { data: existingChat } = await supabase
    .from('chats')
    .select('id')
    .or(`and(usuario1_id.eq.${currentUserId},usuario2_id.eq.${authorId}),and(usuario1_id.eq.${authorId},usuario2_id.eq.${currentUserId})`)
    .single();

  let chatId = existingChat?.id;

  if (!chatId) {
    const { data: newChat } = await supabase
      .from('chats')
      .insert({
        usuario1_id: currentUserId,
        usuario2_id: authorId,
      })
      .select('id')
      .single();

    chatId = newChat?.id;
  }

  // 2. Enviar mensaje con referencia al Momento
  if (chatId) {
    await supabase.from('momento_messages').insert({
      momento_id: momentoId,
      chat_id: chatId,
      remitente_id: currentUserId,
      mensaje: message,
    });

    // 3. Actualizar último mensaje del chat
    await supabase
      .from('chats')
      .update({
        ultimo_mensaje: message,
        ultimo_mensaje_fecha: new Date().toISOString(),
        ultimo_mensaje_autor_id: currentUserId,
      })
      .eq('id', chatId);
  }

  return chatId;
}
```

### 10. Eliminar Momentos Expirados (Cron Job)

```typescript
// Función para ejecutar periódicamente
async function cleanupExpiredMomentos() {
  try {
    // Ejecutar función SQL
    const { error } = await supabase.rpc('delete_expired_momentos');
    
    if (error) {
      console.error('Error cleaning up momentos:', error);
    } else {
      console.log('Expired momentos cleaned up successfully');
    }
  } catch (error) {
    console.error('Error in cleanup:', error);
  }
}

// Ejecutar cada hora
setInterval(cleanupExpiredMomentos, 60 * 60 * 1000);
```

## 🎨 Personalización de Estilos

### 11. Cambiar Color del Borde Neón

```typescript
// En MomentoCarousel.tsx o MiniAvatarWithMomento.tsx
<LinearGradient
  colors={['#FF00FF', '#00FFFF', '#FF00FF']} // Cambiar a tus colores
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.avatarBorder}
>
  {/* Avatar content */}
</LinearGradient>
```

### 12. Ajustar Duración del Autoplay

```typescript
// En MomentoViewer.tsx
const MOMENTO_DURATION = 8000; // Cambiar a 8 segundos (default: 6000)
```

### 13. Personalizar Tamaño del Avatar en Carousel

```typescript
// En MomentoCarousel.tsx
const AVATAR_SIZE = 80; // Cambiar tamaño (default: 72)
const BORDER_WIDTH = 4; // Cambiar grosor del borde (default: 3)
```

## 📊 Analytics y Tracking

### 14. Trackear Visualizaciones

```typescript
import * as Analytics from 'expo-firebase-analytics';

// Al marcar como visto
async function trackMomentoView(momentoId: string, authorId: string) {
  await Analytics.logEvent('momento_viewed', {
    momento_id: momentoId,
    author_id: authorId,
    timestamp: new Date().toISOString(),
  });
}
```

### 15. Trackear Interacciones

```typescript
// Al dar like
async function trackMomentoLike(momentoId: string) {
  await Analytics.logEvent('momento_liked', {
    momento_id: momentoId,
  });
}

// Al enviar mensaje
async function trackMomentoMessage(momentoId: string) {
  await Analytics.logEvent('momento_message_sent', {
    momento_id: momentoId,
  });
}
```

## 🔔 Notificaciones

### 16. Notificar al Autor de Nuevas Vistas

```typescript
async function notifyAuthorOfView(momentoId: string, viewerId: string) {
  // Obtener info del Momento
  const { data: momento } = await supabase
    .from('momentos')
    .select('autor_id')
    .eq('id', momentoId)
    .single();

  if (momento) {
    // Crear notificación
    await supabase.from('notificaciones').insert({
      usuario_id: momento.autor_id,
      tipo: 'momento_view',
      titulo: 'Nuevo visor',
      mensaje: 'Alguien vio tu Momento',
      usuario_origen_id: viewerId,
    });
  }
}
```

### 17. Notificar al Autor de Nuevos Likes

```typescript
async function notifyAuthorOfLike(momentoId: string, likerId: string) {
  const { data: momento } = await supabase
    .from('momentos')
    .select('autor_id')
    .eq('id', momentoId)
    .single();

  if (momento && momento.autor_id !== likerId) {
    await supabase.from('notificaciones').insert({
      usuario_id: momento.autor_id,
      tipo: 'momento_like',
      titulo: 'Nuevo me gusta',
      mensaje: 'Le gustó tu Momento',
      usuario_origen_id: likerId,
    });
  }
}
```

## 🧪 Testing

### 18. Test de Carga de Momentos

```typescript
import { supabase } from '@/app/integrations/supabase/client';

async function testLoadMomentos() {
  console.time('Load Momentos');
  
  const { data, error } = await supabase
    .from('momentos')
    .select('*')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(50);

  console.timeEnd('Load Momentos');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Loaded', data.length, 'momentos');
  }
}
```

### 19. Test de Sincronización Real-time

```typescript
async function testRealtimeSync() {
  const subscription = supabase
    .channel('test-momentos')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'momentos',
      },
      (payload) => {
        console.log('Real-time update:', payload);
      }
    )
    .subscribe();

  // Cleanup después de 30 segundos
  setTimeout(() => {
    subscription.unsubscribe();
    console.log('Test completed');
  }, 30000);
}
```

## 🚨 Error Handling

### 20. Manejo de Errores en Upload

```typescript
async function uploadMomentoWithErrorHandling(imageUri: string) {
  try {
    // Validar tamaño de imagen
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    if (blob.size > 5 * 1024 * 1024) { // 5MB
      Alert.alert('Error', 'La imagen es demasiado grande (máx 5MB)');
      return;
    }

    // Intentar subir
    const result = await uploadMomento(imageUri);
    
    if (result.success) {
      Alert.alert('¡Éxito!', 'Tu Momento se ha publicado');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Upload error:', error);
    Alert.alert(
      'Error al subir',
      'No se pudo publicar tu Momento. Intenta de nuevo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Reintentar', onPress: () => uploadMomentoWithErrorHandling(imageUri) },
      ]
    );
  }
}
```

---

## 💡 Tips y Mejores Prácticas

1. **Performance**: Usa `memo` en componentes que renderizan listas de avatares
2. **Caché**: Implementa caché local para Momentos ya vistos
3. **Preloading**: Precarga el siguiente Momento mientras se visualiza el actual
4. **Optimización de imágenes**: Comprime imágenes antes de subir
5. **Feedback visual**: Siempre muestra loading states y confirmaciones
6. **Error recovery**: Implementa retry logic para uploads fallidos
7. **Analytics**: Trackea todas las interacciones para mejorar la experiencia
8. **Accesibilidad**: Asegúrate de que todos los botones tengan labels descriptivos

---

**Documentación completa**: Ver `MOMENTO_SYSTEM_COMPLETE.md`  
**Resumen técnico**: Ver `MOMENTO_IMPLEMENTATION_SUMMARY.md`
