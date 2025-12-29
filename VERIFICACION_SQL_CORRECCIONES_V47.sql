
-- ✅ VERIFICACIÓN SQL DE CORRECCIONES v47.0
-- 
-- Este script verifica que todas las correcciones se han aplicado correctamente

-- ========================================
-- 1. VERIFICAR SINCRONIZACIÓN DE AVATARES
-- ========================================

-- Verificar usuario @jorge tiene avatar sincronizado
SELECT 
  u.id,
  u.nombre,
  u.username,
  u.email,
  u.avatar as avatar_usuarios,
  au.raw_user_meta_data->>'picture' as avatar_google,
  CASE 
    WHEN u.avatar IS NOT NULL THEN '✅ Avatar sincronizado'
    WHEN au.raw_user_meta_data->>'picture' IS NOT NULL THEN '⚠️ Avatar en Google pero no sincronizado'
    ELSE '❌ Sin avatar'
  END as estado_avatar
FROM usuarios u
LEFT JOIN auth.users au ON au.id = u.id
WHERE u.username = 'jorge' OR u.email = 'jorgepereznoyagh@gmail.com';

-- Verificar todos los usuarios de Google tienen avatares sincronizados
SELECT 
  COUNT(*) as total_google_users,
  COUNT(CASE WHEN u.avatar IS NOT NULL THEN 1 END) as users_with_avatar,
  COUNT(CASE WHEN u.avatar IS NULL AND au.raw_user_meta_data->>'picture' IS NOT NULL THEN 1 END) as pending_sync
FROM usuarios u
LEFT JOIN auth.users au ON au.id = u.id
WHERE u.provider = 'google';

-- ========================================
-- 2. VERIFICAR TRIGGERS DE AVATAR
-- ========================================

-- Verificar que los triggers existen
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%sync_avatar%'
ORDER BY trigger_name;

-- ========================================
-- 3. VERIFICAR PLANES DE SUSCRIPCIÓN
-- ========================================

-- Verificar planes disponibles
SELECT 
  id,
  nombre,
  precio_mensual,
  perfil_social,
  panel_analisis,
  eventos_mes,
  promos_destacadas,
  activo
FROM planes_suscripcion
ORDER BY precio_mensual;

-- Verificar locales con suscripciones activas
SELECT 
  l.id,
  l.nombre as local_nombre,
  l.propietario_id,
  u.nombre as propietario_nombre,
  ps.nombre as plan_nombre,
  ps.perfil_social,
  ps.panel_analisis,
  sl.estado,
  sl.creditos_destacados_restantes,
  sl.creditos_eventos_restantes,
  sl.fecha_proximo_pago
FROM locales l
LEFT JOIN suscripciones_locales sl ON sl.local_id = l.id AND sl.estado = 'activa'
LEFT JOIN planes_suscripcion ps ON ps.id = sl.plan_id
LEFT JOIN usuarios u ON u.id = l.propietario_id
WHERE l.propietario_id IS NOT NULL
ORDER BY l.nombre;

-- ========================================
-- 4. VERIFICAR MOMENTOS ACTIVOS
-- ========================================

-- Verificar momentos activos por tipo
SELECT 
  m.tipo,
  COUNT(*) as total_momentos,
  COUNT(DISTINCT m.autor_id) as usuarios_con_momentos,
  COUNT(DISTINCT m.local_id) as locales_con_momentos,
  AVG(EXTRACT(EPOCH FROM (m.expires_at - m.created_at)) / 3600) as horas_promedio_vida
FROM momentos m
WHERE m.expires_at > NOW()
GROUP BY m.tipo;

-- Verificar momentos del usuario @jorge
SELECT 
  m.id,
  m.tipo,
  m.imagen_url,
  m.created_at,
  m.expires_at,
  (SELECT COUNT(*) FROM momento_views WHERE momento_id = m.id) as total_vistas,
  CASE 
    WHEN m.expires_at > NOW() THEN '✅ Activo'
    ELSE '❌ Expirado'
  END as estado
FROM momentos m
WHERE m.autor_id = (SELECT id FROM usuarios WHERE username = 'jorge')
ORDER BY m.created_at DESC
LIMIT 5;

-- ========================================
-- 5. VERIFICAR VISTAS DE MOMENTOS
-- ========================================

-- Verificar vistas de momentos por usuario
SELECT 
  u.nombre as usuario_nombre,
  u.username,
  COUNT(DISTINCT mv.momento_id) as momentos_vistos,
  MAX(mv.viewed_at) as ultima_vista
FROM momento_views mv
JOIN usuarios u ON u.id = mv.usuario_id
GROUP BY u.id, u.nombre, u.username
ORDER BY momentos_vistos DESC
LIMIT 10;

-- ========================================
-- 6. VERIFICAR TRIGGER DE PLAN GRATUITO
-- ========================================

-- Verificar que el trigger existe
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_local_claimed_assign_free_plan';

-- Verificar locales reclamados tienen plan gratuito
SELECT 
  l.id,
  l.nombre,
  l.propietario_id,
  u.nombre as propietario_nombre,
  CASE 
    WHEN sl.id IS NOT NULL THEN '✅ Tiene suscripción'
    ELSE '⚠️ Sin suscripción'
  END as estado_suscripcion,
  ps.nombre as plan_nombre
FROM locales l
JOIN usuarios u ON u.id = l.propietario_id
LEFT JOIN suscripciones_locales sl ON sl.local_id = l.id AND sl.estado = 'activa'
LEFT JOIN planes_suscripcion ps ON ps.id = sl.plan_id
WHERE l.propietario_id IS NOT NULL
ORDER BY l.fecha_actualizacion DESC
LIMIT 10;

-- ========================================
-- 7. VERIFICAR ACCESO A PERFILES SOCIALES
-- ========================================

-- Verificar locales sin perfil social activo
SELECT 
  l.id,
  l.nombre,
  l.propietario_id,
  CASE 
    WHEN sl.id IS NULL THEN '❌ Sin suscripción'
    WHEN ps.perfil_social = false THEN '❌ Plan sin perfil social'
    WHEN ps.perfil_social = true THEN '✅ Perfil social activo'
  END as estado_perfil_social,
  ps.nombre as plan_nombre
FROM locales l
LEFT JOIN suscripciones_locales sl ON sl.local_id = l.id AND sl.estado = 'activa'
LEFT JOIN planes_suscripcion ps ON ps.id = sl.plan_id
WHERE l.propietario_id IS NOT NULL
ORDER BY l.nombre;

-- ========================================
-- 8. RESUMEN GENERAL
-- ========================================

-- Resumen de estado del sistema
SELECT 
  'Total Usuarios' as metrica,
  COUNT(*) as valor
FROM usuarios
UNION ALL
SELECT 
  'Usuarios con Avatar',
  COUNT(*)
FROM usuarios
WHERE avatar IS NOT NULL
UNION ALL
SELECT 
  'Usuarios Google OAuth',
  COUNT(*)
FROM usuarios
WHERE provider = 'google'
UNION ALL
SELECT 
  'Locales con Propietario',
  COUNT(*)
FROM locales
WHERE propietario_id IS NOT NULL
UNION ALL
SELECT 
  'Locales con Suscripción Activa',
  COUNT(DISTINCT sl.local_id)
FROM suscripciones_locales sl
WHERE sl.estado = 'activa'
UNION ALL
SELECT 
  'Momentos Activos',
  COUNT(*)
FROM momentos
WHERE expires_at > NOW()
UNION ALL
SELECT 
  'Vistas de Momentos (últimas 24h)',
  COUNT(*)
FROM momento_views
WHERE viewed_at > NOW() - INTERVAL '24 hours';

-- ========================================
-- 9. VERIFICAR LOGS DE MIGRACIÓN
-- ========================================

-- Verificar que la migración v47 se aplicó correctamente
SELECT 
  version,
  name,
  executed_at
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%v47%'
ORDER BY executed_at DESC;
