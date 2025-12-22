
-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN SQL - CORRECCIONES IMPLEMENTADAS
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. VERIFICAR SISTEMA DE LIKES
-- ═══════════════════════════════════════════════════════════════════════════

-- 1.1 Verificar likes de un post específico
SELECT 
  l.id,
  l.post_id,
  l.usuario_id,
  u.nombre,
  u.username,
  l.created_at
FROM likes l
JOIN usuarios u ON l.usuario_id = u.id
WHERE l.post_id = 'POST_ID_AQUI'
ORDER BY l.created_at DESC;

-- 1.2 Verificar contador de likes
SELECT 
  p.id,
  p.contenido,
  p.likes_count as contador_en_post,
  (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as contador_real
FROM posts p
WHERE p.id = 'POST_ID_AQUI';

-- 1.3 Verificar si usuario específico ha dado like
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM likes 
      WHERE post_id = 'POST_ID_AQUI' 
      AND usuario_id = 'USER_ID_AQUI'
    ) THEN 'SÍ - Usuario ha dado like'
    ELSE 'NO - Usuario NO ha dado like'
  END as resultado;

-- 1.4 Verificar posts con discrepancia en contador
SELECT 
  p.id,
  p.contenido,
  p.likes_count as contador_guardado,
  (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as contador_real,
  ABS(p.likes_count - (SELECT COUNT(*) FROM likes WHERE post_id = p.id)) as diferencia
FROM posts p
WHERE p.likes_count != (SELECT COUNT(*) FROM likes WHERE post_id = p.id)
ORDER BY diferencia DESC;

-- 1.5 Actualizar contadores si hay discrepancias
UPDATE posts
SET likes_count = (
  SELECT COUNT(*) 
  FROM likes 
  WHERE post_id = posts.id
)
WHERE likes_count != (
  SELECT COUNT(*) 
  FROM likes 
  WHERE post_id = posts.id
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. VERIFICAR SALA VIRTUAL
-- ═══════════════════════════════════════════════════════════════════════════

-- 2.1 Verificar constraint de tipo en sala_virtual_interacciones
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'sala_virtual_interacciones'::regclass
  AND contype = 'c';

-- Resultado esperado: tipo IN ('publico', 'privado', 'sistema', 'mensaje', 'emoticon')

-- 2.2 Verificar usuarios activos en sala virtual
SELECT 
  c.id,
  c.usuario_id,
  u.nombre,
  u.username,
  c.local_id,
  l.nombre as local_nombre,
  c.activo,
  c.checked_in_at,
  c.checked_out_at
FROM sala_virtual_checkins c
JOIN usuarios u ON c.usuario_id = u.id
JOIN locales l ON c.local_id = l.id
WHERE c.activo = true
ORDER BY c.checked_in_at DESC;

-- 2.3 Verificar mensajes en sala virtual
SELECT 
  i.id,
  i.usuario_id,
  u.nombre,
  u.username,
  i.local_id,
  l.nombre as local_nombre,
  i.tipo,
  i.contenido,
  i.created_at
FROM sala_virtual_interacciones i
JOIN usuarios u ON i.usuario_id = u.id
JOIN locales l ON i.local_id = l.id
WHERE i.tipo = 'mensaje'
  AND i.recipient_id IS NULL
ORDER BY i.created_at DESC
LIMIT 50;

-- 2.4 Verificar check-ins duplicados (no debería haber)
SELECT 
  usuario_id,
  COUNT(*) as check_ins_activos
FROM sala_virtual_checkins
WHERE activo = true
GROUP BY usuario_id
HAVING COUNT(*) > 1;

-- Resultado esperado: 0 filas (no duplicados)

-- 2.5 Cerrar check-ins huérfanos (si los hay)
UPDATE sala_virtual_checkins
SET activo = false,
    checked_out_at = NOW()
WHERE activo = true
  AND checked_in_at < NOW() - INTERVAL '24 hours';

-- 2.6 Verificar mensajes con tipo incorrecto
SELECT 
  id,
  tipo,
  contenido,
  created_at
FROM sala_virtual_interacciones
WHERE tipo NOT IN ('publico', 'privado', 'sistema', 'mensaje', 'emoticon');

-- Resultado esperado: 0 filas

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. VERIFICAR AUTENTICACIÓN GOOGLE
-- ═══════════════════════════════════════════════════════════════════════════

-- 3.1 Verificar función RPC check_user_has_password
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'check_user_has_password';

-- Resultado esperado: Función existe

-- 3.2 Probar función RPC
SELECT check_user_has_password('EMAIL_DE_GOOGLE@gmail.com');

-- Resultado esperado: 
-- true = tiene contraseña
-- false = NO tiene contraseña

-- 3.3 Verificar usuarios de Google
SELECT 
  u.id,
  u.email,
  u.nombre,
  u.provider,
  CASE 
    WHEN au.encrypted_password IS NOT NULL AND au.encrypted_password != '' 
    THEN 'SÍ - Tiene contraseña'
    ELSE 'NO - Sin contraseña'
  END as tiene_password
FROM usuarios u
JOIN auth.users au ON u.id = au.id
WHERE u.provider = 'google'
ORDER BY u.created_at DESC;

-- 3.4 Verificar usuarios migrados (Google → BarLive)
SELECT 
  u.id,
  u.email,
  u.nombre,
  u.provider,
  au.raw_app_meta_data->>'provider' as auth_provider_original,
  CASE 
    WHEN au.encrypted_password IS NOT NULL AND au.encrypted_password != '' 
    THEN 'SÍ - Tiene contraseña'
    ELSE 'NO - Sin contraseña'
  END as tiene_password
FROM usuarios u
JOIN auth.users au ON u.id = au.id
WHERE u.provider = 'barlive'
  AND au.raw_app_meta_data->>'provider' = 'google'
ORDER BY u.updated_at DESC;

-- 3.5 Verificar usuarios de Google SIN contraseña (necesitan configuración)
SELECT 
  u.id,
  u.email,
  u.nombre,
  u.provider,
  u.created_at
FROM usuarios u
JOIN auth.users au ON u.id = au.id
WHERE u.provider = 'google'
  AND (au.encrypted_password IS NULL OR au.encrypted_password = '')
ORDER BY u.created_at DESC;

-- 3.6 Actualizar provider manualmente (si es necesario)
-- ⚠️ SOLO usar si un usuario ya configuró contraseña pero el provider no se actualizó
UPDATE usuarios
SET provider = 'barlive'
WHERE email = 'EMAIL_DE_GOOGLE@gmail.com'
  AND provider = 'google'
  AND id IN (
    SELECT id FROM auth.users 
    WHERE email = 'EMAIL_DE_GOOGLE@gmail.com'
      AND encrypted_password IS NOT NULL 
      AND encrypted_password != ''
  );

-- 3.7 Verificar tokens de password activos
SELECT 
  id,
  email,
  token,
  expires_at,
  used,
  created_at
FROM password_tokens
WHERE used = false
  AND expires_at > NOW()
ORDER BY created_at DESC;

-- 3.8 Limpiar tokens expirados
DELETE FROM password_tokens
WHERE expires_at < NOW()
  OR used = true;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. VERIFICACIÓN GENERAL DE SALUD
-- ═══════════════════════════════════════════════════════════════════════════

-- 4.1 Verificar posts con likes
SELECT 
  p.id,
  p.contenido,
  p.likes_count,
  (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_reales,
  p.created_at
FROM posts p
WHERE p.likes_count > 0
ORDER BY p.created_at DESC
LIMIT 10;

-- 4.2 Verificar usuarios activos en salas virtuales
SELECT 
  l.nombre as local,
  COUNT(DISTINCT c.usuario_id) as usuarios_activos,
  l.estado_actual
FROM sala_virtual_checkins c
JOIN locales l ON c.local_id = l.id
WHERE c.activo = true
GROUP BY l.id, l.nombre, l.estado_actual
ORDER BY usuarios_activos DESC;

-- 4.3 Verificar mensajes recientes en salas virtuales
SELECT 
  l.nombre as local,
  COUNT(*) as mensajes_ultimas_24h
FROM sala_virtual_interacciones i
JOIN locales l ON i.local_id = l.id
WHERE i.tipo = 'mensaje'
  AND i.created_at > NOW() - INTERVAL '24 hours'
GROUP BY l.id, l.nombre
ORDER BY mensajes_ultimas_24h DESC;

-- 4.4 Verificar usuarios con múltiples métodos de autenticación
SELECT 
  u.id,
  u.email,
  u.nombre,
  u.provider,
  au.raw_app_meta_data->>'provider' as auth_provider_original,
  CASE 
    WHEN au.encrypted_password IS NOT NULL AND au.encrypted_password != '' 
    THEN 'Email/Password'
    ELSE 'Solo OAuth'
  END as metodos_disponibles
FROM usuarios u
JOIN auth.users au ON u.id = au.id
ORDER BY u.created_at DESC
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. LIMPIEZA Y MANTENIMIENTO
-- ═══════════════════════════════════════════════════════════════════════════

-- 5.1 Cerrar check-ins antiguos (más de 24 horas)
UPDATE sala_virtual_checkins
SET activo = false,
    checked_out_at = NOW()
WHERE activo = true
  AND checked_in_at < NOW() - INTERVAL '24 hours';

-- 5.2 Limpiar tokens de password expirados
DELETE FROM password_tokens
WHERE expires_at < NOW() - INTERVAL '7 days';

-- 5.3 Sincronizar contadores de likes
UPDATE posts
SET likes_count = (
  SELECT COUNT(*) 
  FROM likes 
  WHERE post_id = posts.id
)
WHERE EXISTS (
  SELECT 1 
  FROM likes 
  WHERE post_id = posts.id
);

-- 5.4 Verificar integridad de datos
SELECT 
  'Posts sin autor' as problema,
  COUNT(*) as cantidad
FROM posts
WHERE autor_id NOT IN (SELECT id FROM usuarios)
UNION ALL
SELECT 
  'Likes de usuarios inexistentes' as problema,
  COUNT(*) as cantidad
FROM likes
WHERE usuario_id NOT IN (SELECT id FROM usuarios)
UNION ALL
SELECT 
  'Check-ins de usuarios inexistentes' as problema,
  COUNT(*) as cantidad
FROM sala_virtual_checkins
WHERE usuario_id NOT IN (SELECT id FROM usuarios);

-- ═══════════════════════════════════════════════════════════════════════════
-- FIN DE VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════════════════════
