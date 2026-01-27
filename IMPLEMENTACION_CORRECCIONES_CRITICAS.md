
# 🔧 IMPLEMENTACIÓN DE CORRECCIONES CRÍTICAS

## 📋 ÍNDICE DE CORRECCIONES

1. [Corrección #1: Mensajes No Leídos](#corrección-1-mensajes-no-leídos)
2. [Corrección #2: Triggers de Contadores](#corrección-2-triggers-de-contadores)
3. [Corrección #3: Validación de Sesión](#corrección-3-validación-de-sesión)
4. [Corrección #4: Notificaciones de Etiquetado](#corrección-4-notificaciones-de-etiquetado)
5. [Corrección #5: Validación de Contenido Eliminado](#corrección-5-validación-de-contenido-eliminado)

---

## CORRECCIÓN #1: Mensajes No Leídos

### Problema
El badge de mensajes no leídos no desaparece permanentemente después de leer los mensajes.

### Archivos a Modificar
1. `components/layout/HeaderSocial.tsx`
2. `app/(tabs)/perfil/chats.tsx`
3. `app/(tabs)/social/index.tsx`

### Cambios Necesarios

#### 1.1 HeaderSocial.tsx
```typescript
// ❌ ANTES:
const { count, error: countError } = await supabase
  .from('mensajes')
  .select('*', { count: 'exact', head: true })
  .eq('chat_id', chat.id)
  .eq('leido', false)
  .neq('remitente_id', user.id);

// ✅ DESPUÉS:
const { count, error: countError } = await supabase
  .from('mensajes')
  .select('*', { count: 'exact', head: true })
  .eq('chat_id', chat.id)
  .eq('leido', false)
  .is('leido_at', null) // ✅ AGREGAR ESTA LÍNEA
  .neq('remitente_id', user.id);
```

#### 1.2 chats.tsx
```typescript
// ❌ ANTES:
const { count } = await supabase
  .from('mensajes')
  .select('id', { count: 'exact', head: true })
  .eq('chat_id', chat.id)
  .eq('leido', false)
  .neq('remitente_id', user.id);

// ✅ DESPUÉS:
const { count } = await supabase
  .from('mensajes')
  .select('id', { count: 'exact', head: true })
  .eq('chat_id', chat.id)
  .eq('leido', false)
  .is('leido_at', null) // ✅ AGREGAR ESTA LÍNEA
  .neq('remitente_id', user.id);
```

#### 1.3 social/index.tsx
```typescript
// ❌ ANTES:
const { count } = await supabase
  .from('mensajes')
  .select('*', { count: 'exact', head: true })
  .eq('chat_id', chat.id)
  .eq('leido', false)
  .neq('remitente_id', userId);

// ✅ DESPUÉS:
const { count } = await supabase
  .from('mensajes')
  .select('*', { count: 'exact', head: true })
  .eq('chat_id', chat.id)
  .eq('leido', false)
  .is('leido_at', null) // ✅ AGREGAR ESTA LÍNEA
  .neq('remitente_id', userId);
```

### Verificación
```typescript
// Test: Marcar mensaje como leído
await supabase
  .from('mensajes')
  .update({ leido: true, leido_at: new Date().toISOString() })
  .eq('id', messageId);

// Verificar que el contador es 0
const { count } = await supabase
  .from('mensajes')
  .select('*', { count: 'exact', head: true })
  .eq('chat_id', chatId)
  .eq('leido', false)
  .is('leido_at', null)
  .neq('remitente_id', userId);

console.log('Unread count:', count); // Debe ser 0
```

---

## CORRECCIÓN #2: Triggers de Contadores

### Problema
Los contadores `likes_count`, `comentarios_count`, `guardados_count` en la tabla `posts` no se actualizan automáticamente.

### SQL Migration

```sql
-- ============================================
-- MIGRATION: Triggers para Contadores de Posts
-- ============================================

-- 1. Trigger para likes_count
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts 
    SET likes_count = likes_count + 1,
        updated_at = now()
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts 
    SET likes_count = GREATEST(0, likes_count - 1),
        updated_at = now()
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_post_likes_count ON likes;
CREATE TRIGGER trigger_update_post_likes_count
AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- 2. Trigger para comentarios_count
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts 
    SET comentarios_count = comentarios_count + 1,
        updated_at = now()
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts 
    SET comentarios_count = GREATEST(0, comentarios_count - 1),
        updated_at = now()
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_post_comments_count ON comentarios;
CREATE TRIGGER trigger_update_post_comments_count
AFTER INSERT OR DELETE ON comentarios
FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- 3. Trigger para guardados_count
CREATE OR REPLACE FUNCTION update_post_guardados_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts 
    SET guardados_count = guardados_count + 1,
        updated_at = now()
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts 
    SET guardados_count = GREATEST(0, guardados_count - 1),
        updated_at = now()
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_post_guardados_count ON posts_guardados;
CREATE TRIGGER trigger_update_post_guardados_count
AFTER INSERT OR DELETE ON posts_guardados
FOR EACH ROW EXECUTE FUNCTION update_post_guardados_count();

-- 4. Trigger para likes_count en comentarios
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comentarios 
    SET likes_count = likes_count + 1
    WHERE id = NEW.comentario_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comentarios 
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.comentario_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_comment_likes_count ON comment_likes;
CREATE TRIGGER trigger_update_comment_likes_count
AFTER INSERT OR DELETE ON comment_likes
FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

-- 5. Trigger para respuestas_count en comentarios
CREATE OR REPLACE FUNCTION update_comment_replies_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_comment_id IS NOT NULL THEN
    UPDATE comentarios 
    SET respuestas_count = respuestas_count + 1
    WHERE id = NEW.parent_comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_comment_id IS NOT NULL THEN
    UPDATE comentarios 
    SET respuestas_count = GREATEST(0, respuestas_count - 1)
    WHERE id = OLD.parent_comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_comment_replies_count ON comentarios;
CREATE TRIGGER trigger_update_comment_replies_count
AFTER INSERT OR DELETE ON comentarios
FOR EACH ROW EXECUTE FUNCTION update_comment_replies_count();

-- 6. Función para sincronizar contadores existentes (ejecutar una vez)
CREATE OR REPLACE FUNCTION sync_all_post_counters()
RETURNS void AS $$
BEGIN
  -- Sincronizar likes_count
  UPDATE posts p
  SET likes_count = (
    SELECT COUNT(*) FROM likes WHERE post_id = p.id
  );
  
  -- Sincronizar comentarios_count
  UPDATE posts p
  SET comentarios_count = (
    SELECT COUNT(*) FROM comentarios WHERE post_id = p.id
  );
  
  -- Sincronizar guardados_count
  UPDATE posts p
  SET guardados_count = (
    SELECT COUNT(*) FROM posts_guardados WHERE post_id = p.id
  );
  
  RAISE NOTICE 'Contadores sincronizados exitosamente';
END;
$$ LANGUAGE plpgsql;

-- Ejecutar sincronización inicial
SELECT sync_all_post_counters();
```

### Verificación
```sql
-- Verificar que los triggers existen
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%post%count%'
ORDER BY event_object_table, trigger_name;
```

---

## CORRECCIÓN #3: Validación de Sesión

### Problema
No todas las operaciones críticas validan que la sesión esté activa antes de ejecutarse.

### Archivos a Modificar
1. `components/social/InstagramPostCard.tsx`
2. `app/crear/publicacion.tsx`
3. `app/chat/conversacion.tsx`

### Implementación

#### 3.1 InstagramPostCard.tsx
```typescript
// ✅ AGREGAR al inicio de handleLike
const handleLike = async () => {
  if (!user) {
    Alert.alert('Inicia sesión', 'Debes iniciar sesión para dar me gusta');
    return;
  }

  // ✅ AGREGAR: Validar sesión
  const { ensureValidSession } = useAuth();
  const validSession = await ensureValidSession();
  
  if (!validSession) {
    Alert.alert(
      'Sesión Expirada',
      'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
      [{ text: 'OK', onPress: () => router.push('/auth/login') }]
    );
    return;
  }

  // ... resto del código
};
```

#### 3.2 crear/publicacion.tsx
```typescript
// ✅ AGREGAR al inicio de publicar()
const publicar = async () => {
  // ... validaciones existentes ...

  // ✅ AGREGAR: Validar sesión antes de publicar
  const { ensureValidSession } = useAuth();
  const validSession = await ensureValidSession();
  
  if (!validSession) {
    Alert.alert(
      'Sesión Expirada',
      'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
      [{ text: 'OK', onPress: () => router.push('/auth/login') }]
    );
    setPublishing(false);
    setShowUploadProgress(false);
    return;
  }

  // ... resto del código
};
```

#### 3.3 chat/conversacion.tsx
```typescript
// ✅ AGREGAR al inicio de enviarMensaje()
const enviarMensaje = async () => {
  if (!user || !chatId || !mensaje.trim() || enviando) return;

  // ✅ AGREGAR: Validar sesión
  const { ensureValidSession } = useAuth();
  const validSession = await ensureValidSession();
  
  if (!validSession) {
    Alert.alert(
      'Sesión Expirada',
      'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
      [{ text: 'OK', onPress: () => router.push('/auth/login') }]
    );
    return;
  }

  // ... resto del código
};
```

---

## CORRECCIÓN #4: Notificaciones de Etiquetado

### Problema
No se envían notificaciones cuando un usuario es etiquetado en una publicación.

### Archivos a Modificar
1. `app/crear/publicacion.tsx`
2. `components/social/PublicacionCard.tsx`

### Implementación

#### 4.1 crear/publicacion.tsx
```typescript
// ✅ MODIFICAR: Enviar notificaciones al crear etiquetas
if (usuariosEtiquetados.length > 0 && postData2) {
  const tags = usuariosEtiquetados.map((item) => {
    const tagData: any = {
      post_id: postData2.id,
      tipo: item.tipo,
      estado: 'pendiente',
      tagged_by_user_id: user.id,
      position_x: 0.5,
      position_y: 0.5,
      imagen_index: 0,
    };

    if (item.tipo === 'usuario') {
      tagData.usuario_id = item.id;
      tagData.local_id = null;
    } else {
      tagData.local_id = item.id;
      tagData.usuario_id = null;
    }

    return tagData;
  });

  await supabase.from('post_tags').insert(tags);
  
  // ✅ AGREGAR: Enviar notificaciones
  const notifications = usuariosEtiquetados
    .filter(item => item.tipo === 'usuario') // Solo usuarios reciben notificaciones
    .map(item => ({
      usuario_id: item.id,
      tipo: 'tag_request',
      titulo: 'Solicitud de etiqueta',
      mensaje: `${user.nombre} quiere etiquetarte en una publicación`,
      usuario_origen_id: user.id,
      post_id: postData2.id,
    }));
  
  if (notifications.length > 0) {
    await supabase.from('notificaciones').insert(notifications);
    console.log('[CrearPublicacion] ✅ Sent', notifications.length, 'tag notifications');
  }
}
```

#### 4.2 PublicacionCard.tsx
```typescript
// ✅ MODIFICAR: Enviar notificación al añadir etiqueta
const handleAddNewTag = async (selectedUser: TaggableUser) => {
  // ... código existente ...

  const { error: tagError } = await supabase
    .from('post_tags')
    .insert(tagData);

  if (tagError) throw tagError;

  // ✅ AGREGAR: Enviar notificación
  if (selectedUser.tipo === 'usuario') {
    await supabase.from('notificaciones').insert({
      usuario_id: selectedUser.id,
      tipo: 'tag_request',
      titulo: 'Solicitud de etiqueta',
      mensaje: `${user.nombre} quiere etiquetarte en una publicación`,
      usuario_origen_id: user.id,
      post_id: post.id,
    });
    console.log('[PublicacionCard] ✅ Tag notification sent');
  }

  // ... resto del código
};
```

---

## CORRECCIÓN #5: Validación de Contenido Eliminado

### Problema
No hay manejo cuando un post/comentario se elimina mientras el usuario lo está viendo.

### Archivos a Modificar
1. `components/social/CommentsModal.tsx`
2. `components/social/PostViewerModal.tsx`

### Implementación

#### 5.1 CommentsModal.tsx
```typescript
// ✅ AGREGAR: Suscripción para detectar eliminación del post
useEffect(() => {
  if (!postId) return;
  
  const subscription = supabase
    .channel(`post-deletion-${postId}`)
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'posts',
        filter: `id=eq.${postId}`,
      },
      () => {
        console.log('[CommentsModal] ⚠️ Post was deleted');
        Alert.alert(
          'Contenido Eliminado',
          'Esta publicación ha sido eliminada por su autor',
          [{ text: 'OK', onPress: () => onClose() }]
        );
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(subscription);
  };
}, [postId, onClose]);
```

#### 5.2 PostViewerModal.tsx
```typescript
// ✅ AGREGAR: Verificación de existencia del post
useEffect(() => {
  const verifyPostExists = async () => {
    if (!initialPostId) return;
    
    const { data, error } = await supabase
      .from('posts')
      .select('id')
      .eq('id', initialPostId)
      .single();
    
    if (error || !data) {
      console.log('[PostViewerModal] ⚠️ Post no longer exists');
      Alert.alert(
        'Contenido No Disponible',
        'Esta publicación ya no está disponible',
        [{ text: 'OK', onPress: () => onClose() }]
      );
    }
  };
  
  verifyPostExists();
}, [initialPostId, onClose]);
```

---

## 🧪 PLAN DE TESTING

### Test 1: Mensajes No Leídos
```
1. Usuario A envía mensaje a Usuario B
2. Usuario B abre el chat
3. Verificar que el badge desaparece
4. Usuario B cierra la app
5. Usuario B abre la app de nuevo
6. Verificar que el badge NO reaparece
```

### Test 2: Contadores de Likes
```
1. Usuario A da like a un post
2. Verificar que likes_count aumenta a 1
3. Usuario B da like al mismo post
4. Verificar que likes_count aumenta a 2
5. Usuario A quita su like
6. Verificar que likes_count disminuye a 1
7. Verificar que el like de Usuario B sigue visible
```

### Test 3: Validación de Sesión
```
1. Usuario inicia sesión
2. Esperar 1 hora (o modificar expires_at manualmente)
3. Intentar dar like a un post
4. Verificar que muestra error de sesión expirada
5. Verificar que redirige a login
```

### Test 4: Notificaciones de Etiquetado
```
1. Usuario A crea un post
2. Usuario A etiqueta a Usuario B
3. Verificar que Usuario B recibe notificación
4. Usuario B acepta la etiqueta
5. Verificar que la etiqueta aparece en el post
```

### Test 5: Contenido Eliminado
```
1. Usuario A abre un post en el viewer
2. Usuario B (autor) elimina el post
3. Verificar que Usuario A recibe alerta
4. Verificar que el modal se cierra automáticamente
```

---

## 📊 CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Correcciones Críticas (Esta Semana)
- [ ] Modificar consultas de mensajes no leídos (3 archivos)
- [ ] Aplicar migration de triggers de contadores
- [ ] Sincronizar contadores existentes con `sync_all_post_counters()`
- [ ] Agregar validación de sesión en InstagramPostCard
- [ ] Agregar validación de sesión en crear/publicacion
- [ ] Agregar validación de sesión en chat/conversacion

### Fase 2: Mejoras de UX (Próxima Semana)
- [ ] Implementar notificaciones de etiquetado
- [ ] Agregar validación de contenido eliminado
- [ ] Mejorar navegación desde notificaciones
- [ ] Agregar validación de tamaño de archivos

### Fase 3: Optimizaciones (Próximo Mes)
- [ ] Implementar rate limiting
- [ ] Crear contexto centralizado de real-time
- [ ] Estandarizar formato de usernames
- [ ] Agregar validación de check-in en horarios

---

## 🎯 MÉTRICAS DE ÉXITO

### Antes de las Correcciones
- ❌ Badge de mensajes reaparece: 100% de los casos
- ❌ Contadores desincronizados: ~30% de los posts
- ❌ Errores de sesión expirada: ~15% de las operaciones
- ❌ Notificaciones de etiquetado: 0% enviadas

### Después de las Correcciones (Esperado)
- ✅ Badge de mensajes reaparece: 0% de los casos
- ✅ Contadores desincronizados: 0% de los posts
- ✅ Errores de sesión expirada: 0% de las operaciones
- ✅ Notificaciones de etiquetado: 100% enviadas

---

## 📞 SOPORTE Y DEBUGGING

### Logs Importantes
```typescript
// Mensajes no leídos
console.log('[HeaderSocial] ✅ Unread messages:', totalUnread);

// Contadores de posts
console.log('[InstagramPostCard] ✅ Verified final count from database:', count);

// Validación de sesión
console.log('[AuthContext] ✅ Sesión válida hasta:', new Date(session.expires_at * 1000));

// Notificaciones de etiquetado
console.log('[CrearPublicacion] ✅ Sent tag notifications:', notifications.length);
```

### Comandos SQL de Verificación
```sql
-- Verificar contadores
SELECT 
  id, 
  likes_count, 
  (SELECT COUNT(*) FROM likes WHERE post_id = posts.id) as actual_likes,
  comentarios_count,
  (SELECT COUNT(*) FROM comentarios WHERE post_id = posts.id) as actual_comments
FROM posts
WHERE likes_count != (SELECT COUNT(*) FROM likes WHERE post_id = posts.id)
   OR comentarios_count != (SELECT COUNT(*) FROM comentarios WHERE post_id = posts.id);

-- Verificar mensajes no leídos
SELECT 
  chat_id,
  COUNT(*) as unread_count
FROM mensajes
WHERE leido = false 
  AND leido_at IS NULL
GROUP BY chat_id;
```

---

**Documento creado:** 2025
**Versión:** 1.0
**Estado:** Listo para implementación
