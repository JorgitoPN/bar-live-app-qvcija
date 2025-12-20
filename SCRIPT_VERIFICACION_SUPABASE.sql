
-- ✅ SCRIPT DE VERIFICACIÓN RÁPIDA - SUPABASE
-- Ejecuta este script en el SQL Editor de Supabase para verificar la configuración

-- ========================================
-- 1. VERIFICAR POLÍTICAS RLS DE MENSAJES
-- ========================================
SELECT 
  '1. POLÍTICAS RLS - MENSAJES' as seccion,
  policyname as politica,
  cmd as comando,
  CASE 
    WHEN policyname = 'Users can mark messages as read in their chats' THEN '✅ NUEVA POLÍTICA'
    ELSE '✓ Existente'
  END as estado
FROM pg_policies 
WHERE tablename = 'mensajes'
ORDER BY cmd, policyname;

-- ========================================
-- 2. VERIFICAR POLÍTICAS RLS DE LIKES
-- ========================================
SELECT 
  '2. POLÍTICAS RLS - LIKES' as seccion,
  policyname as politica,
  cmd as comando,
  CASE 
    WHEN policyname = 'Users can delete their own likes' THEN '✅ CORRECTA'
    ELSE '✓ Existente'
  END as estado
FROM pg_policies 
WHERE tablename = 'likes'
ORDER BY cmd, policyname;

-- ========================================
-- 3. VERIFICAR ÍNDICES DE RENDIMIENTO
-- ========================================
SELECT 
  '3. ÍNDICES - MENSAJES' as seccion,
  indexname as indice,
  CASE 
    WHEN indexname IN ('idx_mensajes_chat_leido', 'idx_mensajes_leido_at') THEN '✅ NUEVO'
    ELSE '✓ Existente'
  END as estado
FROM pg_indexes 
WHERE tablename = 'mensajes'
ORDER BY indexname;

-- ========================================
-- 4. VERIFICAR ESTRUCTURA DE MENSAJES
-- ========================================
SELECT 
  '4. ESTRUCTURA - MENSAJES' as seccion,
  column_name as columna,
  data_type as tipo,
  CASE 
    WHEN column_name = 'leido_at' THEN '✅ TIMESTAMP PARA PERSISTENCIA'
    WHEN column_name = 'leido' THEN '✅ BOOLEAN PARA ESTADO'
    ELSE '✓ Existente'
  END as estado
FROM information_schema.columns
WHERE table_name = 'mensajes'
AND column_name IN ('leido', 'leido_at', 'remitente_id', 'chat_id')
ORDER BY column_name;

-- ========================================
-- 5. VERIFICAR RLS HABILITADO
-- ========================================
SELECT 
  '5. RLS HABILITADO' as seccion,
  tablename as tabla,
  CASE 
    WHEN rowsecurity = true THEN '✅ HABILITADO'
    ELSE '❌ DESHABILITADO'
  END as estado
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('mensajes', 'likes')
ORDER BY tablename;

-- ========================================
-- 6. ESTADÍSTICAS DE MENSAJES
-- ========================================
SELECT 
  '6. ESTADÍSTICAS - MENSAJES' as seccion,
  COUNT(*) as total_mensajes,
  COUNT(*) FILTER (WHERE leido = true) as mensajes_leidos,
  COUNT(*) FILTER (WHERE leido = false) as mensajes_no_leidos,
  COUNT(*) FILTER (WHERE leido_at IS NOT NULL) as con_timestamp_lectura
FROM mensajes;

-- ========================================
-- 7. ESTADÍSTICAS DE LIKES
-- ========================================
SELECT 
  '7. ESTADÍSTICAS - LIKES' as seccion,
  COUNT(*) as total_likes,
  COUNT(DISTINCT post_id) as posts_con_likes,
  COUNT(DISTINCT usuario_id) as usuarios_que_dieron_like
FROM likes;

-- ========================================
-- 8. VERIFICAR FOREIGN KEYS
-- ========================================
SELECT 
  '8. FOREIGN KEYS' as seccion,
  tc.table_name as tabla,
  kcu.column_name as columna,
  ccu.table_name as tabla_referenciada,
  ccu.column_name as columna_referenciada,
  '✓ Configurada' as estado
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('mensajes', 'likes')
ORDER BY tc.table_name, kcu.column_name;

-- ========================================
-- 9. VERIFICAR TRIGGERS (si existen)
-- ========================================
SELECT 
  '9. TRIGGERS' as seccion,
  trigger_name as trigger,
  event_manipulation as evento,
  event_object_table as tabla,
  '✓ Activo' as estado
FROM information_schema.triggers
WHERE event_object_table IN ('mensajes', 'likes')
ORDER BY event_object_table, trigger_name;

-- ========================================
-- 10. RESUMEN FINAL
-- ========================================
SELECT 
  '10. RESUMEN FINAL' as seccion,
  'Políticas RLS' as componente,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'mensajes') as mensajes_count,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'likes') as likes_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'mensajes' AND policyname = 'Users can mark messages as read in their chats') > 0 
    THEN '✅ CONFIGURACIÓN CORRECTA'
    ELSE '❌ FALTA POLÍTICA CRÍTICA'
  END as estado;

-- ========================================
-- NOTAS IMPORTANTES
-- ========================================
-- Si ves "❌ FALTA POLÍTICA CRÍTICA" en el resumen final,
-- significa que la migración no se aplicó correctamente.
-- 
-- Ejecuta manualmente:
-- 
-- DROP POLICY IF EXISTS "Users can update their own messages" ON mensajes;
-- 
-- CREATE POLICY "Users can update their own sent messages"
-- ON mensajes FOR UPDATE
-- USING (remitente_id = auth.uid())
-- WITH CHECK (remitente_id = auth.uid());
-- 
-- CREATE POLICY "Users can mark messages as read in their chats"
-- ON mensajes FOR UPDATE
-- USING (
--   EXISTS (
--     SELECT 1 FROM chats
--     WHERE chats.id = mensajes.chat_id
--     AND (chats.usuario1_id = auth.uid() OR chats.usuario2_id = auth.uid())
--     AND mensajes.remitente_id != auth.uid()
--   )
-- );
