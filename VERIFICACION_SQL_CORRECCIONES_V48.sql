
-- ✅ VERIFICACIÓN SQL v48.0 - Estado de Correcciones

-- ==========================================
-- 1. VERIFICAR COLUMNAS avatar_updated_at
-- ==========================================
SELECT 
  'Columnas avatar_updated_at' as verificacion,
  COUNT(*) as total
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('usuarios', 'locales')
  AND column_name = 'avatar_updated_at';
-- Esperado: 2 (una en usuarios, una en locales)

-- ==========================================
-- 2. VERIFICAR TRIGGERS DE AVATAR
-- ==========================================
SELECT 
  'Triggers de avatar' as verificacion,
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('usuarios', 'locales')
  AND trigger_name LIKE '%avatar%';
-- Esperado: 2 triggers (uno para usuarios, uno para locales)

-- ==========================================
-- 3. VERIFICAR PLAN GRATUITO
-- ==========================================
SELECT 
  'Plan Gratuito' as verificacion,
  id,
  nombre,
  perfil_social,
  panel_analisis,
  eventos_mes,
  promos_destacadas,
  precio_mensual
FROM planes_suscripcion
WHERE nombre = 'Gratuito';
-- Esperado: 1 plan con perfil_social=false, panel_analisis=false

-- ==========================================
-- 4. VERIFICAR LOCALES CON PLAN GRATUITO
-- ==========================================
SELECT 
  'Locales con plan gratuito' as verificacion,
  l.id,
  l.nombre,
  sl.plan_nombre,
  sl.estado,
  ps.perfil_social,
  ps.panel_analisis
FROM locales l
LEFT JOIN suscripciones_locales sl ON l.id = sl.local_id AND sl.estado = 'activa'
LEFT JOIN planes_suscripcion ps ON sl.plan_id = ps.id
WHERE sl.plan_nombre = 'Gratuito' OR ps.nombre = 'Gratuito'
ORDER BY l.nombre;
-- Verificar: Estos locales NO deben tener perfil_social ni panel_analisis

-- ==========================================
-- 5. VERIFICAR LOCALES SIN SUSCRIPCIÓN
-- ==========================================
SELECT 
  'Locales sin suscripción activa' as verificacion,
  l.id,
  l.nombre,
  l.propietario_id,
  COUNT(sl.id) as suscripciones_activas
FROM locales l
LEFT JOIN suscripciones_locales sl ON l.id = sl.local_id AND sl.estado = 'activa'
WHERE l.propietario_id IS NOT NULL
GROUP BY l.id, l.nombre, l.propietario_id
HAVING COUNT(sl.id) = 0
ORDER BY l.nombre;
-- Verificar: Estos locales deberían tener plan gratuito asignado automáticamente

-- ==========================================
-- 6. VERIFICAR USUARIOS CON AVATARES
-- ==========================================
SELECT 
  'Usuarios con avatares' as verificacion,
  COUNT(*) as total_usuarios,
  COUNT(avatar) as usuarios_con_avatar,
  COUNT(avatar_updated_at) as usuarios_con_timestamp
FROM usuarios
WHERE activo = true;
-- Verificar: Todos los usuarios con avatar deben tener avatar_updated_at

-- ==========================================
-- 7. VERIFICAR AVATARES CON file://
-- ==========================================
SELECT 
  'Avatares con file://' as verificacion,
  'usuarios' as tabla,
  id,
  nombre,
  avatar
FROM usuarios
WHERE avatar LIKE 'file://%'
UNION ALL
SELECT 
  'Avatares con file://' as verificacion,
  'locales' as tabla,
  id,
  nombre,
  imagen_url as avatar
FROM locales
WHERE imagen_url LIKE 'file://%';
-- Esperado: 0 resultados (todos los file:// deben ser filtrados)

-- ==========================================
-- 8. VERIFICAR BUCKET DE AVATARS
-- ==========================================
SELECT 
  'Bucket de avatars' as verificacion,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'avatars';
-- Esperado: 1 bucket público con límite 5MB y tipos image/jpeg, image/png, image/webp

-- ==========================================
-- 9. VERIFICAR TRIGGER DE PLAN GRATUITO
-- ==========================================
SELECT 
  'Trigger de plan gratuito' as verificacion,
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'propietarios_locales'
  AND trigger_name LIKE '%free_plan%';
-- Esperado: 1 trigger para INSERT y UPDATE

-- ==========================================
-- 10. VERIFICAR FUNCIÓN DE PLAN GRATUITO
-- ==========================================
SELECT 
  'Función de plan gratuito' as verificacion,
  proname as function_name,
  CASE 
    WHEN prosrc LIKE '%Gratuito%' THEN 'Usa nombre correcto'
    WHEN prosrc LIKE '%free%' THEN 'Usa nombre incorrecto'
    ELSE 'Desconocido'
  END as estado
FROM pg_proc
WHERE proname = 'ensure_local_has_free_plan'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
-- Esperado: Debe usar 'Gratuito' no 'free'

-- ==========================================
-- RESUMEN DE VERIFICACIÓN
-- ==========================================
SELECT 
  '=== RESUMEN DE VERIFICACIÓN ===' as titulo,
  '' as detalle
UNION ALL
SELECT 
  '✅ Columnas avatar_updated_at' as titulo,
  CASE WHEN COUNT(*) = 2 THEN 'OK' ELSE 'ERROR' END as detalle
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('usuarios', 'locales')
  AND column_name = 'avatar_updated_at'
UNION ALL
SELECT 
  '✅ Triggers de avatar' as titulo,
  CASE WHEN COUNT(*) = 2 THEN 'OK' ELSE 'ERROR' END as detalle
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('usuarios', 'locales')
  AND trigger_name LIKE '%avatar%'
UNION ALL
SELECT 
  '✅ Plan Gratuito existe' as titulo,
  CASE WHEN COUNT(*) = 1 THEN 'OK' ELSE 'ERROR' END as detalle
FROM planes_suscripcion
WHERE nombre = 'Gratuito'
UNION ALL
SELECT 
  '✅ Bucket avatars existe' as titulo,
  CASE WHEN COUNT(*) = 1 THEN 'OK' ELSE 'ERROR' END as detalle
FROM storage.buckets
WHERE id = 'avatars';
