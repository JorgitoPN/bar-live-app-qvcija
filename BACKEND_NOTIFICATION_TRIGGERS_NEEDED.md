
# 🔔 BACKEND NOTIFICATION TRIGGERS - IMPLEMENTATION GUIDE

## 📋 RESUMEN EJECUTIVO

El sistema de notificaciones frontend está **100% completo y funcional**. Sin embargo, las notificaciones **NO SE ESTÁN CREANDO** en la base de datos cuando ocurren los eventos correspondientes.

**PROBLEMA ACTUAL:** El usuario reporta que no recibe notificaciones para:
- ❤️ Me gusta (likes)
- 💬 Comentarios
- 👥 Seguir (follows)
- @ Menciones
- 📅 Eventos
- ✉️ Mensajes
- 🍻 Saludos (cheers)
- 💳 Compra de planes
- 🔄 Renovación de planes
- ⭐ Recordatorios de locales destacados
- 🚨 Notificaciones urgentes
- 🔔 Notificaciones del sistema
- 🎁 Promociones

**SOLUCIÓN:** Necesitamos crear triggers/funciones en la base de datos o lógica en el backend que **INSERTE** registros en la tabla `notifications` o `notificaciones` cuando ocurran estos eventos.

---

## 🗄️ ESTRUCTURA DE LA TABLA DE NOTIFICACIONES

### Tabla: `notifications` (inglés) o `notificaciones` (español)

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,  -- Usuario que RECIBE la notificación
  sender_id TEXT,          -- Usuario que GENERA la notificación
  sender_username TEXT,
  sender_avatar_url TEXT,
  type TEXT NOT NULL,      -- Tipo de notificación (ver lista abajo)
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  related_id TEXT,         -- ID del contenido relacionado (post, event, etc.)
  related_type TEXT,       -- Tipo de contenido (post, user, event, local, etc.)
  data JSONB,              -- Datos adicionales para navegación
  FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Índices para rendimiento
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_read ON notifications(read);
```

---

## 📝 TIPOS DE NOTIFICACIONES Y CUÁNDO CREARLAS

### 1. ❤️ LIKES (Me gusta)

**Cuándo:** Cuando un usuario da like a una publicación

**Trigger SQL:**
```sql
CREATE OR REPLACE FUNCTION notify_post_like()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo notificar si el like NO es del autor del post
  IF NEW.usuario_id != (SELECT autor_id FROM publicaciones WHERE id = NEW.publicacion_id) THEN
    INSERT INTO notifications (
      user_id,
      sender_id,
      sender_username,
      sender_avatar_url,
      type,
      title,
      body,
      related_id,
      related_type,
      data
    )
    SELECT
      p.autor_id,                                    -- Usuario que recibe la notificación
      NEW.usuario_id,                                -- Usuario que dio like
      u.username,
      u.avatar,
      'like',
      u.nombre || ' le gustó tu publicación',
      'Toca para ver la publicación',
      NEW.publicacion_id,                            -- ID de la publicación
      'post',
      jsonb_build_object(
        'postId', NEW.publicacion_id,
        'entityId', NEW.publicacion_id
      )
    FROM publicaciones p
    JOIN usuarios u ON u.id = NEW.usuario_id
    WHERE p.id = NEW.publicacion_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_post_like
AFTER INSERT ON likes
FOR EACH ROW
EXECUTE FUNCTION notify_post_like();
```

---

### 2. 💬 COMENTARIOS

**Cuándo:** Cuando un usuario comenta en una publicación

**Trigger SQL:**
```sql
CREATE OR REPLACE FUNCTION notify_post_comment()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo notificar si el comentario NO es del autor del post
  IF NEW.usuario_id != (SELECT autor_id FROM publicaciones WHERE id = NEW.publicacion_id) THEN
    INSERT INTO notifications (
      user_id,
      sender_id,
      sender_username,
      sender_avatar_url,
      type,
      title,
      body,
      related_id,
      related_type,
      data
    )
    SELECT
      p.autor_id,
      NEW.usuario_id,
      u.username,
      u.avatar,
      'comment',
      u.nombre || ' comentó tu publicación',
      LEFT(NEW.contenido, 100),                      -- Primeros 100 caracteres del comentario
      NEW.publicacion_id,
      'post',
      jsonb_build_object(
        'postId', NEW.publicacion_id,
        'commentId', NEW.id,
        'entityId', NEW.publicacion_id
      )
    FROM publicaciones p
    JOIN usuarios u ON u.id = NEW.usuario_id
    WHERE p.id = NEW.publicacion_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_post_comment
AFTER INSERT ON comentarios
FOR EACH ROW
EXECUTE FUNCTION notify_post_comment();
```

---

### 3. 👥 SEGUIR (Follows)

**Cuándo:** Cuando un usuario sigue a otro

**Trigger SQL:**
```sql
CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    sender_id,
    sender_username,
    sender_avatar_url,
    type,
    title,
    body,
    related_id,
    related_type,
    data
  )
  SELECT
    NEW.seguido_id,                                  -- Usuario que recibe la notificación
    NEW.seguidor_id,                                 -- Usuario que siguió
    u.username,
    u.avatar,
    'follow',
    u.nombre || ' comenzó a seguirte',
    'Toca para ver su perfil',
    NEW.seguidor_id,                                 -- ID del seguidor
    'user',
    jsonb_build_object(
      'userId', NEW.seguidor_id,
      'entityId', NEW.seguidor_id
    )
  FROM usuarios u
  WHERE u.id = NEW.seguidor_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_new_follower
AFTER INSERT ON seguidores
FOR EACH ROW
EXECUTE FUNCTION notify_new_follower();
```

---

### 4. @ MENCIONES

**Cuándo:** Cuando un usuario menciona a otro en una publicación o comentario

**Función auxiliar para extraer menciones:**
```sql
CREATE OR REPLACE FUNCTION extract_mentions(text_content TEXT)
RETURNS TEXT[] AS $$
DECLARE
  mentions TEXT[];
BEGIN
  -- Extraer todos los @username del texto
  SELECT ARRAY_AGG(DISTINCT SUBSTRING(match FROM 2))
  INTO mentions
  FROM regexp_matches(text_content, '@(\w+)', 'g') AS match;
  
  RETURN COALESCE(mentions, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql;
```

**Trigger para menciones en publicaciones:**
```sql
CREATE OR REPLACE FUNCTION notify_post_mentions()
RETURNS TRIGGER AS $$
DECLARE
  mentioned_username TEXT;
  mentioned_user_id TEXT;
BEGIN
  -- Extraer menciones del contenido
  FOR mentioned_username IN
    SELECT UNNEST(extract_mentions(NEW.contenido))
  LOOP
    -- Buscar el ID del usuario mencionado
    SELECT id INTO mentioned_user_id
    FROM usuarios
    WHERE username = mentioned_username;
    
    -- Si el usuario existe y no es el autor, crear notificación
    IF mentioned_user_id IS NOT NULL AND mentioned_user_id != NEW.autor_id THEN
      INSERT INTO notifications (
        user_id,
        sender_id,
        sender_username,
        sender_avatar_url,
        type,
        title,
        body,
        related_id,
        related_type,
        data
      )
      SELECT
        mentioned_user_id,
        NEW.autor_id,
        u.username,
        u.avatar,
        'mention',
        u.nombre || ' te mencionó en una publicación',
        LEFT(NEW.contenido, 100),
        NEW.id,
        'post',
        jsonb_build_object(
          'postId', NEW.id,
          'entityId', NEW.id
        )
      FROM usuarios u
      WHERE u.id = NEW.autor_id;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_post_mentions
AFTER INSERT ON publicaciones
FOR EACH ROW
EXECUTE FUNCTION notify_post_mentions();
```

**Trigger para menciones en comentarios:**
```sql
CREATE OR REPLACE FUNCTION notify_comment_mentions()
RETURNS TRIGGER AS $$
DECLARE
  mentioned_username TEXT;
  mentioned_user_id TEXT;
BEGIN
  FOR mentioned_username IN
    SELECT UNNEST(extract_mentions(NEW.contenido))
  LOOP
    SELECT id INTO mentioned_user_id
    FROM usuarios
    WHERE username = mentioned_username;
    
    IF mentioned_user_id IS NOT NULL AND mentioned_user_id != NEW.usuario_id THEN
      INSERT INTO notifications (
        user_id,
        sender_id,
        sender_username,
        sender_avatar_url,
        type,
        title,
        body,
        related_id,
        related_type,
        data
      )
      SELECT
        mentioned_user_id,
        NEW.usuario_id,
        u.username,
        u.avatar,
        'mention',
        u.nombre || ' te mencionó en un comentario',
        LEFT(NEW.contenido, 100),
        NEW.publicacion_id,
        'post',
        jsonb_build_object(
          'postId', NEW.publicacion_id,
          'commentId', NEW.id,
          'entityId', NEW.publicacion_id
        )
      FROM usuarios u
      WHERE u.id = NEW.usuario_id;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_comment_mentions
AFTER INSERT ON comentarios
FOR EACH ROW
EXECUTE FUNCTION notify_comment_mentions();
```

---

### 5. 📅 EVENTOS

**Cuándo:** 
- Cuando se crea un evento en un local que el usuario sigue
- 24 horas antes del evento (recordatorio)

**Trigger para nuevo evento:**
```sql
CREATE OR REPLACE FUNCTION notify_new_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Notificar a todos los seguidores del local
  INSERT INTO notifications (
    user_id,
    sender_id,
    type,
    title,
    body,
    related_id,
    related_type,
    data
  )
  SELECT
    s.seguidor_id,
    NEW.local_id,
    'event',
    'Nuevo evento en ' || l.nombre,
    NEW.titulo || ' - ' || TO_CHAR(NEW.fecha::DATE, 'DD/MM/YYYY'),
    NEW.id,
    'event',
    jsonb_build_object(
      'eventId', NEW.id,
      'localId', NEW.local_id,
      'entityId', NEW.id
    )
  FROM seguidores_locales s
  JOIN locales l ON l.id = NEW.local_id
  WHERE s.local_id = NEW.local_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_new_event
AFTER INSERT ON eventos
FOR EACH ROW
EXECUTE FUNCTION notify_new_event();
```

**Función para recordatorios de eventos (ejecutar con cron job):**
```sql
CREATE OR REPLACE FUNCTION send_event_reminders()
RETURNS VOID AS $$
BEGIN
  -- Enviar recordatorios para eventos que ocurren en 24 horas
  INSERT INTO notifications (
    user_id,
    type,
    title,
    body,
    related_id,
    related_type,
    data
  )
  SELECT DISTINCT
    a.usuario_id,
    'event',
    'Recordatorio: ' || e.titulo,
    'El evento es mañana a las ' || TO_CHAR(e.fecha::TIME, 'HH24:MI'),
    e.id,
    'event',
    jsonb_build_object(
      'eventId', e.id,
      'localId', e.local_id,
      'entityId', e.id
    )
  FROM eventos e
  JOIN asistentes_eventos a ON a.evento_id = e.id
  WHERE e.fecha::DATE = (CURRENT_DATE + INTERVAL '1 day')
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = a.usuario_id
        AND n.related_id = e.id
        AND n.type = 'event'
        AND n.created_at > CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql;

-- Ejecutar esta función diariamente con un cron job o pg_cron
```

---

### 6. ✉️ MENSAJES

**Cuándo:** Cuando un usuario recibe un mensaje directo

**Trigger SQL:**
```sql
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo notificar si el mensaje NO es del receptor
  IF NEW.remitente_id != NEW.destinatario_id THEN
    INSERT INTO notifications (
      user_id,
      sender_id,
      sender_username,
      sender_avatar_url,
      type,
      title,
      body,
      related_id,
      related_type,
      data
    )
    SELECT
      NEW.destinatario_id,
      NEW.remitente_id,
      u.username,
      u.avatar,
      'message',
      'Nuevo mensaje de ' || u.nombre,
      LEFT(NEW.contenido, 100),
      NEW.conversacion_id,
      'conversation',
      jsonb_build_object(
        'conversationId', NEW.conversacion_id,
        'userId', NEW.remitente_id,
        'entityId', NEW.conversacion_id
      )
    FROM usuarios u
    WHERE u.id = NEW.remitente_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_new_message
AFTER INSERT ON mensajes
FOR EACH ROW
EXECUTE FUNCTION notify_new_message();
```

---

### 7. 🍻 SALUDOS (Cheers)

**Cuándo:** Cuando un usuario envía un brindis en la sala virtual

**Trigger SQL:**
```sql
CREATE OR REPLACE FUNCTION notify_cheers()
RETURNS TRIGGER AS $$
BEGIN
  -- Notificar al destinatario del brindis
  IF NEW.tipo = 'brindis' AND NEW.destinatario_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      sender_id,
      sender_username,
      sender_avatar_url,
      type,
      title,
      body,
      related_id,
      related_type,
      data
    )
    SELECT
      NEW.destinatario_id,
      NEW.usuario_id,
      u.username,
      u.avatar,
      'cheers',
      u.nombre || ' te envió un brindis 🍻',
      'Toca para ver la sala virtual',
      NEW.local_id,
      'local',
      jsonb_build_object(
        'localId', NEW.local_id,
        'entityId', NEW.local_id
      )
    FROM usuarios u
    WHERE u.id = NEW.usuario_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_cheers
AFTER INSERT ON sala_virtual_mensajes
FOR EACH ROW
EXECUTE FUNCTION notify_cheers();
```

---

### 8. 💳 COMPRA DE PLANES

**Cuándo:** Cuando un usuario compra un plan de suscripción

**Función a llamar desde el backend después de procesar el pago:**
```sql
CREATE OR REPLACE FUNCTION notify_plan_purchase(
  p_user_id TEXT,
  p_plan_name TEXT,
  p_subscription_id TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    body,
    related_id,
    related_type,
    data
  )
  VALUES (
    p_user_id,
    'plan_purchase',
    '¡Compra exitosa! 🎉',
    'Tu plan ' || p_plan_name || ' está activo',
    p_subscription_id,
    'plan',
    jsonb_build_object(
      'planId', p_subscription_id,
      'entityId', p_subscription_id
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Llamar desde el backend:
-- SELECT notify_plan_purchase('user_id', 'Plan Premium', 'subscription_id');
```

---

### 9. 🔄 RENOVACIÓN DE PLANES

**Cuándo:** 
- 7 días antes de que expire el plan (recordatorio)
- Cuando se renueva automáticamente el plan

**Función para recordatorios de renovación (ejecutar con cron job):**
```sql
CREATE OR REPLACE FUNCTION send_renewal_reminders()
RETURNS VOID AS $$
BEGIN
  -- Recordatorios 7 días antes de expiración
  INSERT INTO notifications (
    user_id,
    type,
    title,
    body,
    related_id,
    related_type,
    data
  )
  SELECT
    s.usuario_id,
    'plan_renewal',
    'Tu plan expira pronto',
    'Tu plan ' || p.nombre || ' expira en 7 días',
    s.id,
    'plan',
    jsonb_build_object(
      'planId', s.id,
      'daysRemaining', 7,
      'entityId', s.id
    )
  FROM suscripciones s
  JOIN planes p ON p.id = s.plan_id
  WHERE s.fecha_fin::DATE = (CURRENT_DATE + INTERVAL '7 days')
    AND s.estado = 'activa'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = s.usuario_id
        AND n.related_id = s.id
        AND n.type = 'plan_renewal'
        AND n.created_at > CURRENT_DATE - INTERVAL '1 day'
    );
END;
$$ LANGUAGE plpgsql;
```

**Función para notificar renovación exitosa:**
```sql
CREATE OR REPLACE FUNCTION notify_plan_renewed(
  p_user_id TEXT,
  p_plan_name TEXT,
  p_subscription_id TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    body,
    related_id,
    related_type,
    data
  )
  VALUES (
    p_user_id,
    'plan_renewal',
    'Plan renovado exitosamente ✅',
    'Tu plan ' || p_plan_name || ' se ha renovado',
    p_subscription_id,
    'plan',
    jsonb_build_object(
      'planId', p_subscription_id,
      'entityId', p_subscription_id
    )
  );
END;
$$ LANGUAGE plpgsql;
```

---

### 10. ⭐ RECORDATORIO LOCAL DESTACADO

**Cuándo:** 3 días antes de que expire el destacado de un local

**Función para recordatorios (ejecutar con cron job):**
```sql
CREATE OR REPLACE FUNCTION send_featured_local_reminders()
RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    body,
    related_id,
    related_type,
    data
  )
  SELECT
    l.propietario_id,
    'featured_local_reminder',
    'Tu local destacado expira pronto',
    'El destacado de ' || l.nombre || ' expira en 3 días',
    l.id,
    'local',
    jsonb_build_object(
      'localId', l.id,
      'daysRemaining', 3,
      'entityId', l.id
    )
  FROM locales l
  WHERE l.destacado = TRUE
    AND l.fecha_fin_destacado::DATE = (CURRENT_DATE + INTERVAL '3 days')
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = l.propietario_id
        AND n.related_id = l.id
        AND n.type = 'featured_local_reminder'
        AND n.created_at > CURRENT_DATE - INTERVAL '1 day'
    );
END;
$$ LANGUAGE plpgsql;
```

---

### 11. 🚨 NOTIFICACIONES URGENTES

**Cuándo:** Manualmente desde el panel de administración

**Función para enviar notificación urgente:**
```sql
CREATE OR REPLACE FUNCTION send_urgent_notification(
  p_user_id TEXT,
  p_title TEXT,
  p_body TEXT,
  p_action_url TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    body,
    data
  )
  VALUES (
    p_user_id,
    'urgent',
    p_title,
    p_body,
    jsonb_build_object(
      'actionUrl', p_action_url
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Llamar desde el backend:
-- SELECT send_urgent_notification('user_id', 'Título', 'Mensaje', '/ruta/accion');
```

---

### 12. 🔔 NOTIFICACIONES DEL SISTEMA

**Cuándo:** Actualizaciones importantes, mantenimiento, etc.

**Función para enviar notificación del sistema:**
```sql
CREATE OR REPLACE FUNCTION send_system_notification(
  p_user_id TEXT,
  p_title TEXT,
  p_body TEXT,
  p_action_url TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    body,
    data
  )
  VALUES (
    p_user_id,
    'sistema',
    p_title,
    p_body,
    jsonb_build_object(
      'actionUrl', p_action_url
    )
  );
END;
$$ LANGUAGE plpgsql;
```

---

### 13. 🎁 PROMOCIONES

**Cuándo:** Cuando hay una promoción especial

**Función para enviar promoción:**
```sql
CREATE OR REPLACE FUNCTION send_promo_notification(
  p_user_id TEXT,
  p_title TEXT,
  p_body TEXT,
  p_local_id TEXT DEFAULT NULL,
  p_promo_url TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    body,
    related_id,
    related_type,
    data
  )
  VALUES (
    p_user_id,
    'promo',
    p_title,
    p_body,
    p_local_id,
    'local',
    jsonb_build_object(
      'localId', p_local_id,
      'promoUrl', p_promo_url,
      'entityId', p_local_id
    )
  );
END;
$$ LANGUAGE plpgsql;
```

---

## 🔧 CONFIGURACIÓN DE CRON JOBS

Para las notificaciones programadas (recordatorios de eventos, renovaciones, etc.), necesitas configurar cron jobs:

### Opción 1: pg_cron (PostgreSQL Extension)

```sql
-- Habilitar extensión
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Recordatorios de eventos (diariamente a las 9:00 AM)
SELECT cron.schedule(
  'event-reminders',
  '0 9 * * *',
  'SELECT send_event_reminders();'
);

-- Recordatorios de renovación de planes (diariamente a las 10:00 AM)
SELECT cron.schedule(
  'renewal-reminders',
  '0 10 * * *',
  'SELECT send_renewal_reminders();'
);

-- Recordatorios de locales destacados (diariamente a las 11:00 AM)
SELECT cron.schedule(
  'featured-local-reminders',
  '0 11 * * *',
  'SELECT send_featured_local_reminders();'
);
```

### Opción 2: Supabase Edge Functions (Scheduled)

Crear Edge Functions que se ejecuten periódicamente:

```typescript
// supabase/functions/send-scheduled-notifications/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Enviar recordatorios de eventos
  await supabase.rpc('send_event_reminders');
  
  // Enviar recordatorios de renovación
  await supabase.rpc('send_renewal_reminders');
  
  // Enviar recordatorios de locales destacados
  await supabase.rpc('send_featured_local_reminders');

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Paso 1: Crear la tabla de notificaciones
- [ ] Ejecutar el SQL de creación de tabla
- [ ] Crear índices para rendimiento
- [ ] Verificar que la tabla existe: `SELECT * FROM notifications LIMIT 1;`

### Paso 2: Implementar triggers básicos
- [ ] Trigger para likes
- [ ] Trigger para comentarios
- [ ] Trigger para follows
- [ ] Trigger para menciones (publicaciones)
- [ ] Trigger para menciones (comentarios)
- [ ] Trigger para mensajes
- [ ] Trigger para cheers

### Paso 3: Implementar funciones para eventos especiales
- [ ] Función para nuevo evento
- [ ] Función para recordatorios de eventos
- [ ] Función para compra de planes
- [ ] Función para renovación de planes
- [ ] Función para recordatorios de locales destacados

### Paso 4: Implementar funciones administrativas
- [ ] Función para notificaciones urgentes
- [ ] Función para notificaciones del sistema
- [ ] Función para promociones

### Paso 5: Configurar cron jobs
- [ ] Configurar pg_cron o Edge Functions programadas
- [ ] Programar recordatorios de eventos (diario)
- [ ] Programar recordatorios de renovación (diario)
- [ ] Programar recordatorios de locales destacados (diario)

### Paso 6: Pruebas
- [ ] Probar cada tipo de notificación manualmente
- [ ] Verificar que las notificaciones aparecen en la app
- [ ] Verificar que la navegación funciona correctamente
- [ ] Verificar que los cron jobs se ejecutan

---

## 🧪 PRUEBAS MANUALES

### Probar Likes
```sql
-- Insertar un like de prueba
INSERT INTO likes (usuario_id, publicacion_id)
VALUES ('user_id_1', 'post_id_1');

-- Verificar que se creó la notificación
SELECT * FROM notifications WHERE type = 'like' ORDER BY created_at DESC LIMIT 1;
```

### Probar Comentarios
```sql
-- Insertar un comentario de prueba
INSERT INTO comentarios (usuario_id, publicacion_id, contenido)
VALUES ('user_id_1', 'post_id_1', 'Este es un comentario de prueba');

-- Verificar notificación
SELECT * FROM notifications WHERE type = 'comment' ORDER BY created_at DESC LIMIT 1;
```

### Probar Follows
```sql
-- Insertar un follow de prueba
INSERT INTO seguidores (seguidor_id, seguido_id)
VALUES ('user_id_1', 'user_id_2');

-- Verificar notificación
SELECT * FROM notifications WHERE type = 'follow' ORDER BY created_at DESC LIMIT 1;
```

---

## 📊 MONITOREO Y DEBUGGING

### Ver todas las notificaciones de un usuario
```sql
SELECT 
  type,
  title,
  body,
  read,
  created_at,
  related_id,
  related_type,
  data
FROM notifications
WHERE user_id = 'USER_ID_AQUI'
ORDER BY created_at DESC
LIMIT 50;
```

### Ver estadísticas de notificaciones
```sql
SELECT 
  type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE read = FALSE) as unread,
  MAX(created_at) as last_sent
FROM notifications
WHERE user_id = 'USER_ID_AQUI'
GROUP BY type
ORDER BY total DESC;
```

### Ver notificaciones recientes (últimas 24 horas)
```sql
SELECT 
  type,
  title,
  body,
  created_at
FROM notifications
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## 🚀 PRÓXIMOS PASOS

1. **Implementar los triggers SQL** en la base de datos de producción
2. **Configurar los cron jobs** para notificaciones programadas
3. **Probar cada tipo de notificación** manualmente
4. **Monitorear los logs** para verificar que todo funciona correctamente
5. **Ajustar los mensajes** de las notificaciones según sea necesario

---

## 📝 NOTAS IMPORTANTES

- **NO MODIFICAR EL FRONTEND**: El sistema de notificaciones frontend está completo y funcional
- **TODAS LAS NOTIFICACIONES DEBEN INCLUIR `data.entityId`**: Esto es crítico para la navegación
- **EVITAR NOTIFICACIONES DUPLICADAS**: Usar `NOT EXISTS` en las queries para evitar spam
- **RESPETAR LA PRIVACIDAD**: Solo notificar a usuarios que tienen permiso para ver el contenido
- **OPTIMIZAR RENDIMIENTO**: Usar índices y limitar el número de notificaciones por usuario

---

## 🆘 SOPORTE

Si tienes problemas implementando algún trigger o función, revisa:
1. Los logs de PostgreSQL para errores de sintaxis
2. Los permisos de las tablas y funciones
3. Que los nombres de las tablas y columnas coincidan con tu esquema
4. Que los tipos de datos sean correctos (TEXT, UUID, JSONB, etc.)

**El frontend está listo. Solo falta crear las notificaciones en el backend.** 🚀
