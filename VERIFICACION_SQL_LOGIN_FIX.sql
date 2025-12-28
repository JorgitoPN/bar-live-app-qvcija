
-- ============================================
-- SCRIPT DE VERIFICACIÓN - FIX DE LOGIN v45
-- ============================================
-- Este script ayuda a verificar que el fix del login está funcionando correctamente

-- ============================================
-- 1. VERIFICAR ESTRUCTURA DE LA TABLA
-- ============================================

-- Verificar que la columna last_sign_in existe
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'usuarios'
AND column_name = 'last_sign_in';

-- Resultado esperado:
-- column_name: last_sign_in
-- data_type: timestamp with time zone
-- is_nullable: YES

-- ============================================
-- 2. VERIFICAR ÍNDICE
-- ============================================

-- Verificar que el índice existe y está activo
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'usuarios'
AND indexname = 'idx_usuarios_last_sign_in';

-- Resultado esperado:
-- indexname: idx_usuarios_last_sign_in
-- indexdef: CREATE INDEX idx_usuarios_last_sign_in ON public.usuarios USING btree (last_sign_in)

-- ============================================
-- 3. ESTADÍSTICAS DE USUARIOS
-- ============================================

-- Ver usuarios con last_sign_in registrado
SELECT 
  COUNT(*) as total_usuarios,
  COUNT(last_sign_in) as usuarios_con_last_sign_in,
  COUNT(*) - COUNT(last_sign_in) as usuarios_sin_last_sign_in
FROM usuarios;

-- ============================================
-- 4. ÚLTIMOS LOGINS
-- ============================================

-- Ver los 10 últimos logins
SELECT 
  nombre,
  email,
  last_sign_in,
  NOW() - last_sign_in as tiempo_desde_login,
  CASE 
    WHEN last_sign_in > NOW() - INTERVAL '1 hour' THEN '🟢 Muy reciente'
    WHEN last_sign_in > NOW() - INTERVAL '1 day' THEN '🟡 Hoy'
    WHEN last_sign_in > NOW() - INTERVAL '7 days' THEN '🟠 Esta semana'
    ELSE '🔴 Hace más de una semana'
  END as estado
FROM usuarios
WHERE last_sign_in IS NOT NULL
ORDER BY last_sign_in DESC
LIMIT 10;

-- ============================================
-- 5. USUARIOS ACTIVOS POR PERÍODO
-- ============================================

-- Usuarios activos en la última hora
SELECT 
  'Última hora' as periodo,
  COUNT(*) as usuarios_activos
FROM usuarios
WHERE last_sign_in > NOW() - INTERVAL '1 hour'

UNION ALL

-- Usuarios activos hoy
SELECT 
  'Hoy' as periodo,
  COUNT(*) as usuarios_activos
FROM usuarios
WHERE last_sign_in > NOW() - INTERVAL '1 day'

UNION ALL

-- Usuarios activos esta semana
SELECT 
  'Esta semana' as periodo,
  COUNT(*) as usuarios_activos
FROM usuarios
WHERE last_sign_in > NOW() - INTERVAL '7 days'

UNION ALL

-- Usuarios activos este mes
SELECT 
  'Este mes' as periodo,
  COUNT(*) as usuarios_activos
FROM usuarios
WHERE last_sign_in > NOW() - INTERVAL '30 days';

-- ============================================
-- 6. VERIFICAR USUARIO ESPECÍFICO (JORGE)
-- ============================================

-- Ver información de login del usuario Jorge
SELECT 
  id,
  nombre,
  email,
  provider,
  last_sign_in,
  fecha_registro,
  CASE 
    WHEN last_sign_in IS NULL THEN 'Nunca ha iniciado sesión desde el fix'
    WHEN last_sign_in > NOW() - INTERVAL '5 minutes' THEN '✅ Login muy reciente (últimos 5 min)'
    WHEN last_sign_in > NOW() - INTERVAL '1 hour' THEN '✅ Login reciente (última hora)'
    ELSE '⚠️ Login antiguo'
  END as estado_login
FROM usuarios
WHERE email = 'jorgepereznoyagh@gmail.com';

-- ============================================
-- 7. ANÁLISIS DE PATRONES DE LOGIN
-- ============================================

-- Distribución de logins por hora del día
SELECT 
  EXTRACT(HOUR FROM last_sign_in) as hora_del_dia,
  COUNT(*) as cantidad_logins
FROM usuarios
WHERE last_sign_in IS NOT NULL
AND last_sign_in > NOW() - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM last_sign_in)
ORDER BY hora_del_dia;

-- ============================================
-- 8. USUARIOS INACTIVOS
-- ============================================

-- Usuarios que no han iniciado sesión en más de 30 días
SELECT 
  nombre,
  email,
  last_sign_in,
  NOW() - last_sign_in as tiempo_inactivo
FROM usuarios
WHERE last_sign_in < NOW() - INTERVAL '30 days'
OR last_sign_in IS NULL
ORDER BY last_sign_in DESC NULLS LAST
LIMIT 20;

-- ============================================
-- 9. VERIFICAR MIGRACIÓN
-- ============================================

-- Verificar que la migración se aplicó correctamente
SELECT 
  name,
  executed_at
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%last_sign_in%'
ORDER BY executed_at DESC;

-- ============================================
-- 10. HEALTH CHECK COMPLETO
-- ============================================

-- Resumen completo del estado del sistema
SELECT 
  'Total Usuarios' as metrica,
  COUNT(*)::text as valor
FROM usuarios

UNION ALL

SELECT 
  'Usuarios con last_sign_in',
  COUNT(*)::text
FROM usuarios
WHERE last_sign_in IS NOT NULL

UNION ALL

SELECT 
  'Usuarios activos hoy',
  COUNT(*)::text
FROM usuarios
WHERE last_sign_in > NOW() - INTERVAL '1 day'

UNION ALL

SELECT 
  'Usuarios activos esta semana',
  COUNT(*)::text
FROM usuarios
WHERE last_sign_in > NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
  'Índice last_sign_in existe',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_usuarios_last_sign_in'
  ) THEN '✅ Sí' ELSE '❌ No' END
FROM (SELECT 1) as dummy

UNION ALL

SELECT 
  'Columna last_sign_in existe',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'usuarios' 
    AND column_name = 'last_sign_in'
  ) THEN '✅ Sí' ELSE '❌ No' END
FROM (SELECT 1) as dummy;

-- ============================================
-- 11. MONITOREO EN TIEMPO REAL
-- ============================================

-- Query para ejecutar cada 30 segundos y ver logins en tiempo real
-- (Ejecutar manualmente cuando se esté probando el login)
SELECT 
  nombre,
  email,
  last_sign_in,
  NOW() - last_sign_in as hace,
  '🔄 Actualizando...' as estado
FROM usuarios
WHERE last_sign_in > NOW() - INTERVAL '5 minutes'
ORDER BY last_sign_in DESC;

-- ============================================
-- 12. CLEANUP (OPCIONAL)
-- ============================================

-- Si necesitas resetear last_sign_in para pruebas
-- ⚠️ USAR CON PRECAUCIÓN - Solo en desarrollo
-- UPDATE usuarios SET last_sign_in = NULL WHERE email = 'test@example.com';

-- ============================================
-- FIN DEL SCRIPT
-- ============================================

-- NOTAS:
-- - Ejecutar este script después de aplicar el fix
-- - Verificar que todos los resultados son los esperados
-- - Monitorear durante las primeras 24 horas después del despliegue
-- - Si alguna query no devuelve resultados esperados, investigar inmediatamente

-- CONTACTO:
-- Si encuentras algún problema, reportar inmediatamente con:
-- 1. Resultado de la query que falló
-- 2. Logs de Supabase Auth
-- 3. Logs de Postgres
-- 4. Pasos para reproducir el problema
