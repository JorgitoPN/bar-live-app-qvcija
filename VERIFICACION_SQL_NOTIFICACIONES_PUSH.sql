
-- ═══════════════════════════════════════════════════════════════════════════
-- SCRIPT DE VERIFICACIÓN: SISTEMA DE NOTIFICACIONES PUSH
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Este script verifica que todos los componentes del sistema de notificaciones
-- push están correctamente implementados en la base de datos de Supabase.
--
-- REQUISITOS VERIFICADOS:
-- 1. ✅ Columnas push_token en tabla usuarios
-- 2. ✅ Función send_push_notification existe y es correcta
-- 3. ✅ Triggers de notificaciones están activos
-- 4. ✅ Funciones de triggers existen
-- 5. ✅ Manejo de errores no bloqueante
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. VERIFICAR COLUMNAS DE PUSH TOKEN EN TABLA USUARIOS
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
  '✅ PASO 1: Verificar columnas push_token' as verificacion,
  column_name,
  data_type,
  is_nullable,
  CASE 
    WHEN column_name = 'push_token' AND data_type = 'text' THEN '✅ Correcto'
    WHEN column_name = 'push_token_updated_at' AND data_type = 'timestamp with time zone' THEN '✅ Correcto'
    ELSE '❌ Incorrecto'
  END as estado
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'usuarios'
  AND column_name IN ('push_token', 'push_token_updated_at')
ORDER BY column_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. VERIFICAR FUNCIÓN send_push_notification
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
  '✅ PASO 2: Verificar función send_push_notification' as verificacion,
  routine_name,
  routine_type,
  data_type as return_type,
  security_type,
  CASE 
    WHEN routine_name = 'send_push_notification' 
      AND routine_type = 'FUNCTION' 
      AND security_type = 'DEFINER' 
    THEN '✅ Función existe y es SECURITY DEFINER'
    ELSE '❌ Configuración incorrecta'
  END as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'send_push_notification';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. VERIFICAR PARÁMETROS DE LA FUNCIÓN send_push_notification
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
  '✅ PASO 3: Verificar parámetros de send_push_notification' as verificacion,
  parameter_name,
  data_type,
  parameter_mode,
  CASE 
    WHEN parameter_name IN ('p_user_id', 'p_title', 'p_body', 'p_data') 
    THEN '✅ Parámetro correcto'
    ELSE '⚠️ Parámetro adicional'
  END as estado
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND specific_name = (
    SELECT specific_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
      AND routine_name = 'send_push_notification'
    LIMIT 1
  )
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. VERIFICAR TRIGGERS DE NOTIFICACIONES
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
  '✅ PASO 4: Verificar triggers de notificaciones' as verificacion,
  trigger_name,
  event_object_table as tabla,
  action_timing as timing,
  event_manipulation as evento,
  CASE 
    WHEN action_timing = 'AFTER' AND event_manipulation = 'INSERT' 
    THEN '✅ Configuración correcta'
    ELSE '❌ Configuración incorrecta'
  END as estado
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trigger_notify_new_message',
    'trigger_notify_new_like',
    'trigger_notify_new_comment',
    'trigger_notify_new_follower',
    'trigger_notify_sala_virtual_interaction'
  )
ORDER BY event_object_table, trigger_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. VERIFICAR FUNCIONES DE TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
  '✅ PASO 5: Verificar funciones de triggers' as verificacion,
  routine_name,
  routine_type,
  data_type as return_type,
  CASE 
    WHEN routine_type = 'FUNCTION' AND data_type = 'trigger' 
    THEN '✅ Función de trigger correcta'
    ELSE '❌ Tipo incorrecto'
  END as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'notify_new_message',
    'notify_new_like',
    'notify_new_comment',
    'notify_new_follower',
    'notify_sala_virtual_interaction'
  )
ORDER BY routine_name;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. VERIFICAR MANEJO DE ERRORES EN send_push_notification
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
  '✅ PASO 6: Verificar manejo de errores' as verificacion,
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%EXCEPTION%WHEN OTHERS%' 
      AND pg_get_functiondef(oid) LIKE '%RAISE WARNING%'
      AND pg_get_functiondef(oid) NOT LIKE '%RAISE EXCEPTION%'
    THEN '✅ Manejo de errores correcto (no bloqueante)'
    ELSE '❌ Manejo de errores incorrecto'
  END as estado,
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%IF v_push_token IS NULL%RETURN%' 
    THEN '✅ Verifica token antes de enviar'
    ELSE '❌ No verifica token'
  END as verificacion_token
FROM pg_proc
WHERE proname = 'send_push_notification'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. VERIFICAR TABLA DE NOTIFICACIONES
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
  '✅ PASO 7: Verificar tabla notifications' as verificacion,
  column_name,
  data_type,
  is_nullable,
  CASE 
    WHEN column_name IN ('id', 'user_id', 'type', 'title', 'body', 'data', 'read', 'created_at') 
    THEN '✅ Columna requerida presente'
    ELSE '⚠️ Columna adicional'
  END as estado
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'notifications'
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. CONTAR USUARIOS CON PUSH TOKEN REGISTRADO
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
  '✅ PASO 8: Estadísticas de push tokens' as verificacion,
  COUNT(*) as total_usuarios,
  COUNT(push_token) as usuarios_con_token,
  COUNT(*) - COUNT(push_token) as usuarios_sin_token,
  ROUND(COUNT(push_token)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as porcentaje_con_token
FROM usuarios;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. VERIFICAR NOTIFICACIONES RECIENTES
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
  '✅ PASO 9: Notificaciones recientes (últimas 24h)' as verificacion,
  type as tipo,
  COUNT(*) as cantidad,
  COUNT(CASE WHEN read = false THEN 1 END) as no_leidas,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Sistema activo'
    ELSE '⚠️ Sin notificaciones recientes'
  END as estado
FROM notifications
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY type
ORDER BY cantidad DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. RESUMEN FINAL
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
  '✅ RESUMEN FINAL' as verificacion,
  '═══════════════════════════════════════════════════════════════════════════' as separador;

SELECT 
  'Columnas push_token' as componente,
  CASE 
    WHEN COUNT(*) = 2 THEN '✅ Correcto'
    ELSE '❌ Falta configuración'
  END as estado
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'usuarios'
  AND column_name IN ('push_token', 'push_token_updated_at')

UNION ALL

SELECT 
  'Función send_push_notification' as componente,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ Correcto'
    ELSE '❌ No existe'
  END as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'send_push_notification'

UNION ALL

SELECT 
  'Triggers de notificaciones' as componente,
  CASE 
    WHEN COUNT(*) = 5 THEN '✅ Todos activos (5/5)'
    ELSE '❌ Faltan triggers (' || COUNT(*) || '/5)'
  END as estado
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trigger_notify_new_message',
    'trigger_notify_new_like',
    'trigger_notify_new_comment',
    'trigger_notify_new_follower',
    'trigger_notify_sala_virtual_interaction'
  )

UNION ALL

SELECT 
  'Funciones de triggers' as componente,
  CASE 
    WHEN COUNT(*) = 5 THEN '✅ Todas presentes (5/5)'
    ELSE '❌ Faltan funciones (' || COUNT(*) || '/5)'
  END as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'notify_new_message',
    'notify_new_like',
    'notify_new_comment',
    'notify_new_follower',
    'notify_sala_virtual_interaction'
  )

UNION ALL

SELECT 
  'Tabla notifications' as componente,
  CASE 
    WHEN COUNT(*) >= 8 THEN '✅ Estructura correcta'
    ELSE '❌ Faltan columnas'
  END as estado
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'notifications';

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN DEL SCRIPT DE VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
  '═══════════════════════════════════════════════════════════════════════════' as fin,
  '✅ VERIFICACIÓN COMPLETA' as mensaje,
  'Si todos los componentes muestran ✅, el sistema está correctamente configurado' as nota;
