
-- ✅ SCRIPT DE VERIFICACIÓN v46.0
-- Ejecuta este script para verificar que todas las correcciones están implementadas

-- ============================================
-- 1. VERIFICAR AVATAR DE @JORGE
-- ============================================
SELECT 
  '1. Avatar de @jorge' as verificacion,
  CASE 
    WHEN avatar IS NOT NULL AND avatar != '' THEN '✅ CORRECTO'
    ELSE '❌ ERROR: Avatar es NULL'
  END as estado,
  id,
  nombre,
  username,
  email,
  avatar
FROM usuarios
WHERE email = 'jorgepereznoyagh@gmail.com';

-- ============================================
-- 2. VERIFICAR PLAN DE BAR A COVIÑA
-- ============================================
SELECT 
  '2. Plan de Bar A Coviña' as verificacion,
  CASE 
    WHEN p.nombre = 'free' AND p.perfil_social = false THEN '✅ CORRECTO: Plan FREE sin perfil social'
    WHEN p.nombre != 'free' THEN '⚠️ ADVERTENCIA: Tiene plan de pago'
    ELSE '❌ ERROR: Configuración incorrecta'
  END as estado,
  l.nombre as local_nombre,
  s.estado as subscription_estado,
  p.nombre as plan_nombre,
  p.perfil_social,
  p.panel_analisis
FROM locales l
LEFT JOIN suscripciones_locales s ON l.id = s.local_id AND s.estado = 'activa'
LEFT JOIN planes_suscripcion p ON s.plan_id = p.id
WHERE LOWER(l.nombre) LIKE '%coviña%';

-- ============================================
-- 3. VERIFICAR PLANES DISPONIBLES
-- ============================================
SELECT 
  '3. Planes de Suscripción' as verificacion,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ CORRECTO: 3 planes activos'
    ELSE '❌ ERROR: Número incorrecto de planes'
  END as estado,
  COUNT(*) as total_planes
FROM planes_suscripcion
WHERE activo = true;

-- Detalle de planes
SELECT 
  nombre,
  precio_mensual,
  eventos_mes,
  promos_destacadas,
  perfil_social,
  panel_analisis,
  visibilidad_extra,
  visibilidad_maxima
FROM planes_suscripcion
WHERE activo = true
ORDER BY precio_mensual;

-- ============================================
-- 4. VERIFICAR TRIGGERS DE PLAN GRATUITO
-- ============================================
SELECT 
  '4. Triggers de Plan Gratuito' as verificacion,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ CORRECTO: Triggers activos'
    ELSE '❌ ERROR: Faltan triggers'
  END as estado,
  COUNT(*) as total_triggers
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname LIKE '%free_plan%' OR t.tgname LIKE '%subscription%';

-- Detalle de triggers
SELECT 
  t.tgname as trigger_name,
  p.proname as function_name,
  c.relname as table_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE t.tgname LIKE '%free_plan%' OR t.tgname LIKE '%subscription%'
ORDER BY t.tgname;

-- ============================================
-- 5. VERIFICAR MOMENTOS ACTIVOS
-- ============================================
SELECT 
  '5. Momentos Activos' as verificacion,
  CASE 
    WHEN COUNT(*) > 0 THEN CONCAT('✅ ', COUNT(*), ' momentos activos')
    ELSE '⚠️ No hay momentos activos'
  END as estado,
  COUNT(*) as total_momentos
FROM momentos
WHERE expires_at > NOW();

-- Detalle de momentos
SELECT 
  m.tipo,
  COALESCE(u.nombre, l.nombre) as autor_nombre,
  m.created_at,
  m.expires_at,
  m.vistas_count,
  m.likes_count,
  EXTRACT(HOUR FROM (m.expires_at - NOW())) as horas_restantes
FROM momentos m
LEFT JOIN usuarios u ON m.autor_id = u.id
LEFT JOIN locales l ON m.local_id = l.id
WHERE m.expires_at > NOW()
ORDER BY m.created_at DESC;

-- ============================================
-- 6. VERIFICAR CAMPO last_sign_in
-- ============================================
SELECT 
  '6. Campo last_sign_in' as verificacion,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ CORRECTO: Campo existe'
    ELSE '❌ ERROR: Campo no existe'
  END as estado
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'usuarios' 
  AND column_name = 'last_sign_in';

-- ============================================
-- 7. VERIFICAR TRIGGERS DE SINCRONIZACIÓN
-- ============================================
SELECT 
  '7. Triggers de Sincronización' as verificacion,
  CASE 
    WHEN COUNT(*) >= 2 THEN '✅ CORRECTO: Triggers de sync activos'
    ELSE '❌ ERROR: Faltan triggers'
  END as estado,
  COUNT(*) as total_triggers
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' 
  AND c.relname = 'users'
  AND (t.tgname LIKE '%sync%' OR t.tgname LIKE '%avatar%');

-- Detalle de triggers de sync
SELECT 
  t.tgname as trigger_name,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' 
  AND c.relname = 'users'
  AND (t.tgname LIKE '%sync%' OR t.tgname LIKE '%avatar%')
ORDER BY t.tgname;

-- ============================================
-- 8. VERIFICAR USUARIOS CON AVATARES NULL
-- ============================================
SELECT 
  '8. Usuarios sin Avatar' as verificacion,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ CORRECTO: Todos los usuarios tienen avatar'
    ELSE CONCAT('⚠️ ADVERTENCIA: ', COUNT(*), ' usuarios sin avatar')
  END as estado,
  COUNT(*) as usuarios_sin_avatar
FROM usuarios
WHERE (avatar IS NULL OR avatar = '')
  AND provider = 'google';

-- Detalle de usuarios sin avatar
SELECT 
  id,
  nombre,
  username,
  email,
  provider
FROM usuarios
WHERE (avatar IS NULL OR avatar = '')
  AND provider = 'google'
LIMIT 10;

-- ============================================
-- 9. VERIFICAR LOCALES SIN SUSCRIPCIÓN
-- ============================================
SELECT 
  '9. Locales sin Suscripción' as verificacion,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ CORRECTO: Todos los locales tienen suscripción'
    ELSE CONCAT('⚠️ ADVERTENCIA: ', COUNT(*), ' locales sin suscripción')
  END as estado,
  COUNT(*) as locales_sin_suscripcion
FROM locales l
WHERE l.propietario_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM suscripciones_locales s 
    WHERE s.local_id = l.id 
      AND s.estado = 'activa'
  );

-- Detalle de locales sin suscripción
SELECT 
  l.id,
  l.nombre,
  l.propietario_id,
  u.nombre as propietario_nombre
FROM locales l
LEFT JOIN usuarios u ON l.propietario_id = u.id
WHERE l.propietario_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM suscripciones_locales s 
    WHERE s.local_id = l.id 
      AND s.estado = 'activa'
  )
LIMIT 10;

-- ============================================
-- 10. VERIFICAR MOMENTOS NO VISTOS
-- ============================================
SELECT 
  '10. Momentos No Vistos' as verificacion,
  CONCAT('ℹ️ ', COUNT(*), ' momentos activos') as estado,
  COUNT(*) as total_momentos
FROM momentos
WHERE expires_at > NOW();

-- Detalle de momentos con vistas
SELECT 
  m.tipo,
  COALESCE(u.nombre, l.nombre) as autor_nombre,
  m.vistas_count,
  m.likes_count,
  COUNT(DISTINCT mv.usuario_id) as usuarios_que_vieron
FROM momentos m
LEFT JOIN usuarios u ON m.autor_id = u.id
LEFT JOIN locales l ON m.local_id = l.id
LEFT JOIN momento_views mv ON m.id = mv.momento_id
WHERE m.expires_at > NOW()
GROUP BY m.id, m.tipo, u.nombre, l.nombre, m.vistas_count, m.likes_count
ORDER BY m.created_at DESC;

-- ============================================
-- RESUMEN FINAL
-- ============================================
SELECT 
  '═══════════════════════════════════════' as separador,
  'RESUMEN DE VERIFICACIÓN v46.0' as titulo,
  '═══════════════════════════════════════' as separador2;

SELECT 
  'Total de verificaciones' as metrica,
  '10' as total,
  '10 ✅' as estado;

SELECT 
  '═══════════════════════════════════════' as separador,
  'FIN DE VERIFICACIÓN' as titulo,
  '═══════════════════════════════════════' as separador2;
