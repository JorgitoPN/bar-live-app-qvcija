
-- ✅ VERIFICACIÓN DE CORRECCIONES v42.0
-- 
-- Ejecuta estas queries para verificar que todas las correcciones se aplicaron correctamente

-- 1. Verificar que no hay URLs file:// en avatares de usuarios
SELECT 
  id, 
  nombre, 
  username, 
  avatar,
  CASE 
    WHEN avatar LIKE 'file://%' THEN '❌ TIENE FILE://'
    WHEN avatar IS NULL THEN '⚠️ SIN AVATAR'
    ELSE '✅ AVATAR OK'
  END as estado_avatar
FROM usuarios
WHERE avatar IS NOT NULL OR username = 'jorge'
ORDER BY nombre;

-- 2. Verificar que no hay URLs file:// en imágenes de locales
SELECT 
  id, 
  nombre, 
  imagen_url,
  CASE 
    WHEN imagen_url LIKE 'file://%' THEN '❌ TIENE FILE://'
    WHEN imagen_url IS NULL THEN '⚠️ SIN IMAGEN'
    ELSE '✅ IMAGEN OK'
  END as estado_imagen
FROM locales
WHERE imagen_url IS NOT NULL
ORDER BY nombre
LIMIT 20;

-- 3. Verificar plan de Bar A Coviña
SELECT 
  l.id,
  l.nombre,
  s.estado as estado_suscripcion,
  p.nombre as plan_nombre,
  p.perfil_social,
  p.panel_analisis,
  CASE 
    WHEN p.perfil_social = true THEN '✅ PERFIL SOCIAL ACTIVO'
    ELSE '❌ PERFIL SOCIAL INACTIVO'
  END as estado_perfil_social
FROM locales l
LEFT JOIN suscripciones_locales s ON l.id = s.local_id AND s.estado = 'activa'
LEFT JOIN planes_suscripcion p ON s.plan_id = p.id
WHERE l.nombre ILIKE '%coviña%';

-- 4. Verificar que todos los locales con propietario tienen plan
SELECT 
  l.id,
  l.nombre,
  l.propietario_id,
  s.id as subscription_id,
  s.estado,
  p.nombre as plan_nombre,
  CASE 
    WHEN s.id IS NULL THEN '❌ SIN PLAN'
    WHEN s.estado = 'activa' THEN '✅ PLAN ACTIVO'
    ELSE '⚠️ PLAN INACTIVO'
  END as estado_plan
FROM locales l
LEFT JOIN suscripciones_locales s ON l.id = s.local_id AND s.estado = 'activa'
LEFT JOIN planes_suscripcion p ON s.plan_id = p.id
WHERE l.propietario_id IS NOT NULL
ORDER BY l.nombre
LIMIT 20;

-- 5. Verificar créditos de bienvenida en planes gratuitos
SELECT 
  l.nombre as local_nombre,
  p.nombre as plan_nombre,
  s.creditos_destacados_restantes,
  s.creditos_eventos_restantes,
  CASE 
    WHEN p.nombre = 'free' AND s.creditos_destacados_restantes >= 1 THEN '✅ TIENE CRÉDITOS'
    WHEN p.nombre = 'free' AND s.creditos_destacados_restantes = 0 THEN '⚠️ SIN CRÉDITOS'
    ELSE '✅ PLAN DE PAGO'
  END as estado_creditos
FROM suscripciones_locales s
JOIN locales l ON s.local_id = l.id
JOIN planes_suscripcion p ON s.plan_id = p.id
WHERE s.estado = 'activa'
ORDER BY p.nombre, l.nombre
LIMIT 20;

-- 6. Verificar duración de destacados (debe ser máximo 24 horas)
SELECT 
  l.nombre,
  l.destacado,
  l.destacado_inicio,
  l.destacado_fin,
  l.destacado_horas,
  EXTRACT(EPOCH FROM (l.destacado_fin - l.destacado_inicio)) / 3600 as horas_reales,
  CASE 
    WHEN l.destacado_horas > 24 THEN '❌ MÁS DE 24H'
    WHEN l.destacado_horas = 24 THEN '✅ EXACTAMENTE 24H'
    WHEN l.destacado_horas < 24 THEN '⚠️ MENOS DE 24H'
    ELSE '⚠️ SIN DATOS'
  END as estado_duracion
FROM locales l
WHERE l.destacado = true
ORDER BY l.destacado_inicio DESC
LIMIT 10;

-- 7. Verificar que los triggers existen
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  CASE 
    WHEN trigger_name LIKE '%file_urls%' THEN '✅ PREVENCIÓN FILE://'
    WHEN trigger_name LIKE '%free_plan%' THEN '✅ PLAN GRATUITO AUTO'
    WHEN trigger_name LIKE '%destacado_24h%' THEN '✅ DURACIÓN 24H'
    ELSE '✅ OTRO TRIGGER'
  END as tipo_trigger
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (
    trigger_name LIKE '%file_urls%' 
    OR trigger_name LIKE '%free_plan%'
    OR trigger_name LIKE '%destacado_24h%'
  )
ORDER BY trigger_name;

-- 8. Verificar momentos activos y sus visualizaciones
SELECT 
  m.id,
  CASE 
    WHEN m.tipo = 'usuario' THEN u.nombre
    WHEN m.tipo = 'local' THEN l.nombre
  END as autor_nombre,
  m.tipo,
  m.created_at,
  m.expires_at,
  COUNT(DISTINCT mv.usuario_id) as vistas_count,
  CASE 
    WHEN m.expires_at > NOW() THEN '✅ ACTIVO'
    ELSE '❌ EXPIRADO'
  END as estado
FROM momentos m
LEFT JOIN usuarios u ON m.autor_id = u.id AND m.tipo = 'usuario'
LEFT JOIN locales l ON m.local_id = l.id AND m.tipo = 'local'
LEFT JOIN momento_views mv ON m.id = mv.momento_id
GROUP BY m.id, u.nombre, l.nombre, m.tipo, m.created_at, m.expires_at
ORDER BY m.created_at DESC
LIMIT 20;

-- 9. Verificar seguidores de Bar A Coviña (debería ser 0 si no tiene perfil social)
SELECT 
  l.nombre as local_nombre,
  p.nombre as plan_nombre,
  p.perfil_social,
  COUNT(DISTINCT s.seguidor_id) as seguidores_count,
  CASE 
    WHEN p.perfil_social = false AND COUNT(DISTINCT s.seguidor_id) > 0 THEN '⚠️ TIENE SEGUIDORES SIN PERFIL SOCIAL'
    WHEN p.perfil_social = false AND COUNT(DISTINCT s.seguidor_id) = 0 THEN '✅ SIN SEGUIDORES (CORRECTO)'
    WHEN p.perfil_social = true THEN '✅ PERFIL SOCIAL ACTIVO'
    ELSE '⚠️ VERIFICAR'
  END as estado
FROM locales l
LEFT JOIN suscripciones_locales sub ON l.id = sub.local_id AND sub.estado = 'activa'
LEFT JOIN planes_suscripcion p ON sub.plan_id = p.id
LEFT JOIN seguidores s ON s.seguido_id = l.propietario_id
WHERE l.nombre ILIKE '%coviña%'
GROUP BY l.id, l.nombre, p.nombre, p.perfil_social;

-- 10. Resumen general del estado del sistema
SELECT 
  'Usuarios con file:// en avatar' as metrica,
  COUNT(*) as cantidad
FROM usuarios
WHERE avatar LIKE 'file://%'
UNION ALL
SELECT 
  'Locales con file:// en imagen' as metrica,
  COUNT(*) as cantidad
FROM locales
WHERE imagen_url LIKE 'file://%'
UNION ALL
SELECT 
  'Locales sin plan activo' as metrica,
  COUNT(*) as cantidad
FROM locales l
WHERE l.propietario_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM suscripciones_locales s 
    WHERE s.local_id = l.id AND s.estado = 'activa'
  )
UNION ALL
SELECT 
  'Destacados con más de 24h' as metrica,
  COUNT(*) as cantidad
FROM locales
WHERE destacado = true AND destacado_horas > 24
UNION ALL
SELECT 
  'Momentos activos' as metrica,
  COUNT(*) as cantidad
FROM momentos
WHERE expires_at > NOW()
UNION ALL
SELECT 
  'Planes activos' as metrica,
  COUNT(*) as cantidad
FROM suscripciones_locales
WHERE estado = 'activa';

-- ✅ RESULTADO ESPERADO:
-- - Usuarios con file:// en avatar: 0
-- - Locales con file:// en imagen: 0
-- - Locales sin plan activo: 0
-- - Destacados con más de 24h: 0
-- - Momentos activos: (número variable)
-- - Planes activos: (número variable)
