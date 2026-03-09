
-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: FIX NOTIFICATION DUPLICITY AND ADD STACKING (Instagram-style)
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- OBJETIVO: Refactorizar el sistema de notificaciones push para:
-- 1. Eliminar duplicidad (solo una notificación por evento)
-- 2. Implementar agrupación/stacking (collapse_id)
-- 3. Formato consistente: [Nombre del Autor]: [Contenido del mensaje]
-- 
-- ═══════════════════════════════════════════════════════════════════════════

-- PASO 1: ELIMINAR TRIGGER REDUNDANTE
-- ═══════════════════════════════════════════════════════════════════════════
-- Eliminamos notify_new_private_message que causa duplicidad
-- Mantenemos solo notify_new_message que será mejorado

DROP TRIGGER IF EXISTS trigger_notify_new_private_message ON mensajes;
DROP FUNCTION IF EXISTS notify_new_private_message();

-- PASO 2: MEJORAR LA FUNCIÓN notify_new_message
-- ═══════════════════════════════════════════════════════════════════════════
-- Nueva versión con:
-- - Formato: [Nombre]: [Contenido]
-- - collapse_id para agrupación
-- - Información completa del remitente

CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_nombre text;
  v_sender_username text;
  v_sender_avatar text;
  v_recipient_id uuid;
  v_chat_usuario1_id uuid;
  v_chat_usuario2_id uuid;
  v_collapse_id text;
  v_message_preview text;
BEGIN
  -- Solo procesar mensajes de chat privado (no mensajes públicos de sala virtual)
  IF NEW.chat_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Obtener información del chat
  SELECT usuario1_id, usuario2_id
  INTO v_chat_usuario1_id, v_chat_usuario2_id
  FROM chats
  WHERE id = NEW.chat_id;

  -- Determinar el destinatario (el que NO es el remitente)
  IF v_chat_usuario1_id = NEW.remitente_id THEN
    v_recipient_id := v_chat_usuario2_id;
  ELSE
    v_recipient_id := v_chat_usuario1_id;
  END IF;

  -- Obtener información completa del remitente
  SELECT nombre, username, avatar
  INTO v_sender_nombre, v_sender_username, v_sender_avatar
  FROM usuarios
  WHERE id = NEW.remitente_id;

  -- ✅ PASO 3: FORMATO CONSISTENTE - [Nombre]: [Contenido]
  -- Generar preview del mensaje según tipo
  CASE NEW.tipo_mensaje
    WHEN 'texto' THEN
      v_message_preview := LEFT(NEW.contenido, 100);
    WHEN 'imagen' THEN
      v_message_preview := '📷 Imagen';
    WHEN 'video' THEN
      v_message_preview := '🎥 Video';
    WHEN 'audio' THEN
      v_message_preview := '🎵 Audio';
    ELSE
      v_message_preview := 'Nuevo mensaje';
  END CASE;

  -- ✅ PASO 2: COLLAPSE ID para agrupación (stacking)
  -- Usar sender_id como collapse_id para agrupar mensajes del mismo remitente
  v_collapse_id := 'message-from-' || NEW.remitente_id::text;

  -- ✅ PASO 1: UNA SOLA NOTIFICACIÓN (eliminamos duplicidad)
  -- Insertar notificación con formato Instagram-style
  INSERT INTO notifications (
    user_id, 
    type, 
    title, 
    body, 
    data, 
    read, 
    created_at
  )
  VALUES (
    v_recipient_id::text,
    'message',
    v_sender_nombre || ':', -- ✅ Formato: "Nombre:"
    v_message_preview,       -- ✅ Contenido del mensaje
    jsonb_build_object(
      'type', 'message',
      'chatId', NEW.chat_id,
      'messageId', NEW.id,
      'data_id', NEW.chat_id,
      'sender_id', NEW.remitente_id,
      'sender_username', v_sender_username,
      'sender_avatar', v_sender_avatar,
      'sender_name', v_sender_nombre,
      'message_content', v_message_preview,
      'collapse_id', v_collapse_id,  -- ✅ Para agrupación
      'event_type', 'message'
    ),
    false,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger (ahora es el único para mensajes)
DROP TRIGGER IF EXISTS trigger_notify_new_message ON mensajes;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON mensajes
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- ═══════════════════════════════════════════════════════════════════════════
-- PASO 3: ACTUALIZAR EDGE FUNCTION PARA SOPORTAR STACKING
-- ═══════════════════════════════════════════════════════════════════════════
-- La Edge Function auto-send-push-notification necesita ser actualizada
-- para incluir collapseKey (Android) y apns-collapse-id (iOS)
-- Esto se hará en el siguiente paso con deploy_edge_function

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════════════════════

-- Verificar que solo existe un trigger para mensajes
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'mensajes'
  AND trigger_name LIKE '%message%'
ORDER BY trigger_name;

-- Verificar la función actualizada
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name = 'notify_new_message';

-- ═══════════════════════════════════════════════════════════════════════════
-- NOTAS IMPORTANTES
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- ✅ ELIMINADA DUPLICIDAD:
--    - Solo notify_new_message se ejecuta ahora
--    - notify_new_private_message ha sido eliminado
-- 
-- ✅ FORMATO CONSISTENTE:
--    - title: "Nombre del Autor:"
--    - body: "Contenido del mensaje"
--    - Ejemplo: "Juan Pérez: Hola, ¿cómo estás?"
-- 
-- ✅ COLLAPSE_ID AÑADIDO:
--    - collapse_id: "message-from-{sender_id}"
--    - Permite agrupar múltiples mensajes del mismo remitente
--    - La Edge Function usará esto para collapseKey (Android) y apns-collapse-id (iOS)
-- 
-- ═══════════════════════════════════════════════════════════════════════════
