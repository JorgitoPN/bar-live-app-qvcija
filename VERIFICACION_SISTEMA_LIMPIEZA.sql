
-- ========================================
-- VERIFICACIÓN DEL SISTEMA DE LIMPIEZA
-- ========================================

-- 1. Verificar que las funciones existen
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'detectar_locales_invalidos',
    'excluir_locales_invalidos',
    'ejecutar_limpieza_completa',
    'esta_local_excluido',
    'obtener_estadisticas_limpieza'
  )
ORDER BY routine_name;

-- 2. Verificar que los índices existen
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%locales_excluidos%'
ORDER BY indexname;

-- 3. Obtener estadísticas actuales
SELECT * FROM obtener_estadisticas_limpieza();

-- 4. Ver locales inválidos detectados (primeros 10)
SELECT 
  local_id,
  nombre,
  motivo_invalido,
  tipo,
  source_type
FROM detectar_locales_invalidos()
LIMIT 10;

-- 5. Ver duplicados por ubicación (primeros 10)
SELECT 
  nombre,
  duplicate_count,
  latitud,
  longitud
FROM detectar_duplicados_por_ubicacion()
LIMIT 10;

-- 6. Ver duplicados por Google Place ID (primeros 10)
SELECT 
  google_place_id,
  cantidad_duplicados,
  nombres
FROM detectar_duplicados_por_google_place_id()
LIMIT 10;

-- 7. Ver duplicados por OSM ID (primeros 10)
SELECT 
  osm_id,
  cantidad_duplicados,
  nombres
FROM detectar_duplicados_por_osm_id()
LIMIT 10;

-- 8. Ver locales excluidos (últimos 20)
SELECT 
  nombre,
  motivo_exclusion,
  descripcion_exclusion,
  fecha_exclusion
FROM locales_excluidos
ORDER BY fecha_exclusion DESC
LIMIT 20;

-- 9. Verificar que la tabla locales_excluidos tiene datos
SELECT 
  motivo_exclusion,
  COUNT(*) as cantidad
FROM locales_excluidos
GROUP BY motivo_exclusion
ORDER BY cantidad DESC;

-- 10. Probar verificación de exclusión (ejemplo)
SELECT esta_local_excluido(
  p_nombre := 'Bar Example',
  p_latitud := 40.4168,
  p_longitud := -3.7038,
  p_google_place_id := NULL,
  p_osm_id := NULL
);

-- 11. Ver locales activos vs inactivos
SELECT 
  activo,
  COUNT(*) as cantidad
FROM locales
GROUP BY activo;

-- 12. Ver locales por estado de enriquecimiento
SELECT 
  enriquecido,
  activo,
  COUNT(*) as cantidad
FROM locales
GROUP BY enriquecido, activo
ORDER BY enriquecido DESC, activo DESC;

-- 13. Ver locales cerrados permanentemente que aún están activos
SELECT 
  id,
  nombre,
  direccion,
  google_business_status
FROM locales
WHERE google_business_status = 'CLOSED_PERMANENTLY'
  AND activo = true
LIMIT 10;

-- 14. Ver locales sin ubicación que aún están activos
SELECT 
  id,
  nombre,
  direccion,
  latitud,
  longitud
FROM locales
WHERE (latitud IS NULL OR longitud IS NULL)
  AND activo = true
LIMIT 10;

-- 15. Ejecutar limpieza en modo simulación (DRY RUN)
-- IMPORTANTE: Esto NO hace cambios reales
SELECT * FROM ejecutar_limpieza_completa(
  p_admin_id := NULL,
  p_dry_run := true,  -- SIMULACIÓN
  p_incluir_duplicados := true,
  p_incluir_invalidos := true
);

-- ========================================
-- QUERIES DE MANTENIMIENTO
-- ========================================

-- 16. Ver locales excluidos por admin específico
SELECT 
  le.nombre,
  le.motivo_exclusion,
  le.fecha_exclusion,
  u.nombre as excluido_por_nombre,
  u.email as excluido_por_email
FROM locales_excluidos le
LEFT JOIN usuarios u ON le.excluido_por = u.id
WHERE le.excluido_por IS NOT NULL
ORDER BY le.fecha_exclusion DESC
LIMIT 20;

-- 17. Ver locales con múltiples problemas
SELECT 
  l.id,
  l.nombre,
  l.direccion,
  CASE 
    WHEN l.latitud IS NULL OR l.longitud IS NULL THEN 'Sin ubicación'
    WHEN l.google_business_status = 'CLOSED_PERMANENTLY' THEN 'Cerrado permanentemente'
    WHEN l.tipo IN ('gym', 'hotel', 'hospital') THEN 'Tipo prohibido'
    ELSE 'Otro'
  END as problema
FROM locales l
WHERE l.activo = true
  AND (
    l.latitud IS NULL 
    OR l.longitud IS NULL
    OR l.google_business_status = 'CLOSED_PERMANENTLY'
    OR l.tipo IN ('gym', 'hotel', 'hospital', 'school', 'bank')
  )
LIMIT 20;

-- 18. Ver resumen de locales por fuente
SELECT 
  source_type,
  activo,
  enriquecido,
  COUNT(*) as cantidad
FROM locales
GROUP BY source_type, activo, enriquecido
ORDER BY source_type, activo DESC, enriquecido DESC;

-- 19. Ver locales que fueron excluidos recientemente (últimas 24 horas)
SELECT 
  nombre,
  motivo_exclusion,
  descripcion_exclusion,
  fecha_exclusion
FROM locales_excluidos
WHERE fecha_exclusion > NOW() - INTERVAL '24 hours'
ORDER BY fecha_exclusion DESC;

-- 20. Ver locales que tienen el mismo Google Place ID (duplicados potenciales)
SELECT 
  google_place_id,
  COUNT(*) as cantidad,
  ARRAY_AGG(nombre) as nombres,
  ARRAY_AGG(id) as ids
FROM locales
WHERE google_place_id IS NOT NULL
  AND activo = true
GROUP BY google_place_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- ========================================
-- QUERIES DE LIMPIEZA MANUAL
-- ========================================

-- 21. Excluir un local específico manualmente
-- REEMPLAZA 'local-id-aqui' con el ID real del local
/*
INSERT INTO locales_excluidos (
  local_id,
  nombre,
  direccion,
  latitud,
  longitud,
  motivo_exclusion,
  descripcion_exclusion,
  excluido_por
)
SELECT 
  id,
  nombre,
  direccion,
  latitud,
  longitud,
  'invalido',
  'Excluido manualmente por admin',
  'admin-id-aqui'
FROM locales
WHERE id = 'local-id-aqui';

UPDATE locales
SET activo = false, updated_at = NOW()
WHERE id = 'local-id-aqui';
*/

-- 22. Restaurar un local excluido manualmente
-- REEMPLAZA 'exclusion-id-aqui' con el ID de la exclusión
/*
DELETE FROM locales_excluidos
WHERE id = 'exclusion-id-aqui';

UPDATE locales
SET activo = true, updated_at = NOW()
WHERE id = (SELECT local_id FROM locales_excluidos WHERE id = 'exclusion-id-aqui');
*/

-- 23. Ver locales que tienen nombres muy similares (posibles duplicados)
SELECT 
  l1.nombre as nombre1,
  l2.nombre as nombre2,
  l1.id as id1,
  l2.id as id2,
  l1.direccion as direccion1,
  l2.direccion as direccion2
FROM locales l1
JOIN locales l2 ON 
  LOWER(TRIM(l1.nombre)) = LOWER(TRIM(l2.nombre))
  AND l1.id < l2.id
  AND l1.activo = true
  AND l2.activo = true
LIMIT 20;

-- 24. Ver locales que están muy cerca (posibles duplicados)
SELECT 
  l1.nombre as nombre1,
  l2.nombre as nombre2,
  l1.id as id1,
  l2.id as id2,
  ABS(l1.latitud - l2.latitud) as diff_lat,
  ABS(l1.longitud - l2.longitud) as diff_lng
FROM locales l1
JOIN locales l2 ON 
  l1.id < l2.id
  AND l1.activo = true
  AND l2.activo = true
  AND ABS(l1.latitud - l2.latitud) < 0.0001
  AND ABS(l1.longitud - l2.longitud) < 0.0001
LIMIT 20;

-- 25. Ver locales con palabras prohibidas en el nombre
SELECT 
  id,
  nombre,
  tipo,
  direccion
FROM locales
WHERE activo = true
  AND LOWER(nombre) ~ '(gimnasio|gym|fitness|hotel|hostal|hospital|clinica|farmacia|supermercado|tienda|taller|garage|escuela|colegio|iglesia|aeropuerto|estacion|peluquer|salon|barberia|fotograf)'
LIMIT 20;

-- ========================================
-- QUERIES DE ANÁLISIS
-- ========================================

-- 26. Análisis de eficiencia del sistema
SELECT 
  'Total locales' as metrica,
  COUNT(*) as valor
FROM locales
UNION ALL
SELECT 
  'Locales activos',
  COUNT(*)
FROM locales
WHERE activo = true
UNION ALL
SELECT 
  'Locales excluidos',
  COUNT(*)
FROM locales_excluidos
UNION ALL
SELECT 
  'Tasa de exclusión (%)',
  ROUND((SELECT COUNT(*)::NUMERIC FROM locales_excluidos) / 
        (SELECT COUNT(*)::NUMERIC FROM locales) * 100, 2);

-- 27. Ver distribución de motivos de exclusión
SELECT 
  motivo_exclusion,
  COUNT(*) as cantidad,
  ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*)::NUMERIC FROM locales_excluidos) * 100, 2) as porcentaje
FROM locales_excluidos
GROUP BY motivo_exclusion
ORDER BY cantidad DESC;

-- 28. Ver tendencia de exclusiones por fecha
SELECT 
  DATE(fecha_exclusion) as fecha,
  motivo_exclusion,
  COUNT(*) as cantidad
FROM locales_excluidos
WHERE fecha_exclusion > NOW() - INTERVAL '30 days'
GROUP BY DATE(fecha_exclusion), motivo_exclusion
ORDER BY fecha DESC, cantidad DESC;

-- 29. Ver locales que fueron restaurados (no están en excluidos pero están inactivos)
SELECT 
  l.id,
  l.nombre,
  l.activo,
  l.updated_at
FROM locales l
WHERE l.activo = false
  AND NOT EXISTS (
    SELECT 1 FROM locales_excluidos le
    WHERE le.local_id = l.id
  )
LIMIT 20;

-- 30. Verificar integridad del sistema
SELECT 
  'Locales excluidos sin local_id' as verificacion,
  COUNT(*) as cantidad
FROM locales_excluidos
WHERE local_id IS NULL
UNION ALL
SELECT 
  'Locales excluidos con local activo',
  COUNT(*)
FROM locales_excluidos le
JOIN locales l ON le.local_id = l.id
WHERE l.activo = true
UNION ALL
SELECT 
  'Locales inactivos sin exclusión',
  COUNT(*)
FROM locales l
WHERE l.activo = false
  AND NOT EXISTS (
    SELECT 1 FROM locales_excluidos le
    WHERE le.local_id = l.id
  );
