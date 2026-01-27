
# 🔒 Guía de Corrección: 45 Funciones de Riesgo MEDIO

## 📊 Estado Actual

Se han identificado **25 funciones de riesgo MEDIO** que necesitan corrección inmediata. Estas funciones están categorizadas en 5 grupos:

### Categorías de Funciones a Corregir

1. **Funciones de Búsqueda y Recomendaciones** (10 funciones)
2. **Funciones de Limpieza OSM** (5 funciones)
3. **Funciones de Gestión de Duplicados** (3 funciones)
4. **Funciones de Mantenimiento** (4 funciones)
5. **Funciones Misceláneas** (3 funciones)

## 🎯 Estrategia de Corrección

Para cada función, aplicaremos una de estas dos estrategias:

### Opción A: SECURITY INVOKER (Preferida)
- **Cuándo usar**: Funciones que NO necesitan privilegios elevados
- **Ventaja**: Respeta automáticamente las políticas RLS
- **Ejemplo**: Funciones de búsqueda, contadores, consultas

### Opción B: SECURITY DEFINER con search_path seguro
- **Cuándo usar**: Funciones que SÍ necesitan privilegios elevados
- **Requisito**: SIEMPRE incluir `SET search_path = pg_catalog, public, pg_temp`
- **Ejemplo**: Funciones que acceden a tablas del sistema, verifican permisos

## 📋 Funciones Identificadas

### 1. Búsqueda y Recomendaciones (10 funciones)

| Función | Riesgo Actual | Solución Recomendada |
|---------|---------------|----------------------|
| `get_user_feed` | MEDIO | SECURITY INVOKER |
| `get_suggested_users` | MEDIO | SECURITY INVOKER |
| `get_trending_hashtags` | MEDIO | SECURITY INVOKER |
| `search_posts_by_hashtag` | MEDIO | SECURITY INVOKER |
| `get_nearby_local_posts` | MEDIO | SECURITY INVOKER |
| `get_recommended_ads` | MEDIO | SECURITY INVOKER |
| `get_post_details` | MEDIO | SECURITY INVOKER |
| `get_post_comments` | MEDIO | SECURITY INVOKER |
| `get_friends_at_local` | MEDIO | SECURITY INVOKER |
| `get_visible_check_ins_for_local` | MEDIO | SECURITY INVOKER |

**Razón**: Estas funciones solo consultan datos y deben respetar las políticas RLS del usuario que las ejecuta.

### 2. Limpieza OSM (5 funciones)

| Función | Riesgo Actual | Solución Recomendada |
|---------|---------------|----------------------|
| `cleanup_enriched_osm_locales` | MEDIO | SECURITY DEFINER + search_path |
| `detectar_locales_invalidos` | MEDIO | SECURITY INVOKER |
| `excluir_locales_invalidos` | MEDIO | SECURITY DEFINER + search_path |
| `esta_local_excluido` | MEDIO | SECURITY INVOKER |
| `ejecutar_limpieza_completa` | MEDIO | SECURITY DEFINER + search_path |
| `obtener_estadisticas_limpieza` | MEDIO | SECURITY INVOKER |

**Razón**: Las funciones de limpieza que modifican datos necesitan SECURITY DEFINER, las de consulta pueden ser SECURITY INVOKER.

### 3. Gestión de Duplicados (3 funciones)

| Función | Riesgo Actual | Solución Recomendada |
|---------|---------------|----------------------|
| `check_duplicate_local` | MEDIO | SECURITY INVOKER |
| `find_all_duplicate_locals` | MEDIO | SECURITY INVOKER |
| `remove_duplicate_locals` | MEDIO | SECURITY DEFINER + search_path |

**Razón**: Solo la función que elimina duplicados necesita privilegios elevados.

### 4. Mantenimiento (4 funciones)

| Función | Riesgo Actual | Solución Recomendada |
|---------|---------------|----------------------|
| `optimize_database` | MEDIO | SECURITY DEFINER + search_path |
| `run_database_maintenance` | MEDIO | SECURITY DEFINER + search_path |
| `cleanup_old_backups` | MEDIO | SECURITY DEFINER + search_path |
| `expire_user_penalties` | MEDIO | SECURITY INVOKER |

**Razón**: Las funciones de mantenimiento de base de datos necesitan privilegios elevados.

### 5. Misceláneas (3 funciones)

| Función | Riesgo Actual | Solución Recomendada |
|---------|---------------|----------------------|
| `award_activity_badges` | MEDIO | SECURITY INVOKER |
| `get_room_ranking` | MEDIO | SECURITY INVOKER |

**Razón**: Estas funciones solo consultan o actualizan datos de usuario y deben respetar RLS.

## 🚀 Cómo Aplicar las Correcciones

### Método 1: Usar el Panel de Administración (Recomendado)

1. Abre la app BarLive
2. Ve a **Admin → Seguridad de Funciones**
3. Filtra por **Nivel de Riesgo: MEDIO**
4. Revisa cada función y su recomendación
5. Ejecuta las migraciones SQL proporcionadas

### Método 2: Ejecutar SQL Directamente

Ejecuta los siguientes scripts SQL en el SQL Editor de Supabase:

#### Script 1: Funciones de Búsqueda (SECURITY INVOKER)

```sql
-- Este script convierte las funciones de búsqueda a SECURITY INVOKER
-- para que respeten las políticas RLS del usuario

-- Nota: Debido a limitaciones de PostgreSQL, necesitamos DROP y CREATE
-- No podemos simplemente cambiar SECURITY DEFINER a SECURITY INVOKER

-- 1. get_user_feed
ALTER FUNCTION get_user_feed(uuid, integer, integer) SECURITY INVOKER;
ALTER FUNCTION get_user_feed(uuid, integer, integer) SET search_path = pg_catalog, public, pg_temp;

-- 2. get_suggested_users
ALTER FUNCTION get_suggested_users(uuid, integer) SECURITY INVOKER;
ALTER FUNCTION get_suggested_users(uuid, integer) SET search_path = pg_catalog, public, pg_temp;

-- 3. get_trending_hashtags
ALTER FUNCTION get_trending_hashtags(integer, integer) SECURITY INVOKER;
ALTER FUNCTION get_trending_hashtags(integer, integer) SET search_path = pg_catalog, public, pg_temp;

-- 4. search_posts_by_hashtag
ALTER FUNCTION search_posts_by_hashtag(text, integer, integer) SECURITY INVOKER;
ALTER FUNCTION search_posts_by_hashtag(text, integer, integer) SET search_path = pg_catalog, public, pg_temp;

-- 5. get_nearby_local_posts
ALTER FUNCTION get_nearby_local_posts(double precision, double precision, double precision, integer) SECURITY INVOKER;
ALTER FUNCTION get_nearby_local_posts(double precision, double precision, double precision, integer) SET search_path = pg_catalog, public, pg_temp;

-- 6. get_recommended_ads
ALTER FUNCTION get_recommended_ads(uuid, integer) SECURITY INVOKER;
ALTER FUNCTION get_recommended_ads(uuid, integer) SET search_path = pg_catalog, public, pg_temp;

-- 7. get_post_details
ALTER FUNCTION get_post_details(uuid, uuid) SECURITY INVOKER;
ALTER FUNCTION get_post_details(uuid, uuid) SET search_path = pg_catalog, public, pg_temp;

-- 8. get_post_comments
ALTER FUNCTION get_post_comments(uuid, integer, integer) SECURITY INVOKER;
ALTER FUNCTION get_post_comments(uuid, integer, integer) SET search_path = pg_catalog, public, pg_temp;

-- 9. get_friends_at_local
ALTER FUNCTION get_friends_at_local(uuid, uuid) SECURITY INVOKER;
ALTER FUNCTION get_friends_at_local(uuid, uuid) SET search_path = pg_catalog, public, pg_temp;

-- 10. get_visible_check_ins_for_local
ALTER FUNCTION get_visible_check_ins_for_local(uuid, uuid) SECURITY INVOKER;
ALTER FUNCTION get_visible_check_ins_for_local(uuid, uuid) SET search_path = pg_catalog, public, pg_temp;

-- Agregar comentarios
COMMENT ON FUNCTION get_user_feed IS 'Corregido: SECURITY INVOKER para respetar RLS';
COMMENT ON FUNCTION get_suggested_users IS 'Corregido: SECURITY INVOKER para respetar RLS';
COMMENT ON FUNCTION get_trending_hashtags IS 'Corregido: SECURITY INVOKER para respetar RLS';
COMMENT ON FUNCTION search_posts_by_hashtag IS 'Corregido: SECURITY INVOKER para respetar RLS';
COMMENT ON FUNCTION get_nearby_local_posts IS 'Corregido: SECURITY INVOKER para respetar RLS';
COMMENT ON FUNCTION get_recommended_ads IS 'Corregido: SECURITY INVOKER para respetar RLS';
COMMENT ON FUNCTION get_post_details IS 'Corregido: SECURITY INVOKER para respetar RLS';
COMMENT ON FUNCTION get_post_comments IS 'Corregido: SECURITY INVOKER para respetar RLS';
COMMENT ON FUNCTION get_friends_at_local IS 'Corregido: SECURITY INVOKER para respetar RLS';
COMMENT ON FUNCTION get_visible_check_ins_for_local IS 'Corregido: SECURITY INVOKER para respetar RLS';
```

#### Script 2: Funciones de Limpieza OSM

```sql
-- Funciones de limpieza OSM
-- Algunas necesitan SECURITY DEFINER para modificar datos, otras pueden ser SECURITY INVOKER

-- 1. detectar_locales_invalidos (solo consulta)
ALTER FUNCTION detectar_locales_invalidos() SECURITY INVOKER;
ALTER FUNCTION detectar_locales_invalidos() SET search_path = pg_catalog, public, pg_temp;

-- 2. esta_local_excluido (solo consulta)
ALTER FUNCTION esta_local_excluido(uuid) SECURITY INVOKER;
ALTER FUNCTION esta_local_excluido(uuid) SET search_path = pg_catalog, public, pg_temp;

-- 3. obtener_estadisticas_limpieza (solo consulta)
ALTER FUNCTION obtener_estadisticas_limpieza() SECURITY INVOKER;
ALTER FUNCTION obtener_estadisticas_limpieza() SET search_path = pg_catalog, public, pg_temp;

-- 4. cleanup_enriched_osm_locales (modifica datos - necesita SECURITY DEFINER)
ALTER FUNCTION cleanup_enriched_osm_locales() SET search_path = pg_catalog, public, pg_temp;

-- 5. excluir_locales_invalidos (modifica datos - necesita SECURITY DEFINER)
ALTER FUNCTION excluir_locales_invalidos(uuid[], text) SET search_path = pg_catalog, public, pg_temp;

-- 6. ejecutar_limpieza_completa (modifica datos - necesita SECURITY DEFINER)
ALTER FUNCTION ejecutar_limpieza_completa() SET search_path = pg_catalog, public, pg_temp;

-- Agregar comentarios
COMMENT ON FUNCTION detectar_locales_invalidos IS 'Corregido: SECURITY INVOKER para respetar RLS';
COMMENT ON FUNCTION esta_local_excluido IS 'Corregido: SECURITY INVOKER para respetar RLS';
COMMENT ON FUNCTION obtener_estadisticas_limpieza IS 'Corregido: SECURITY INVOKER para respetar RLS';
COMMENT ON FUNCTION cleanup_enriched_osm_locales IS 'Corregido: SECURITY DEFINER con search_path seguro';
COMMENT ON FUNCTION excluir_locales_invalidos IS 'Corregido: SECURITY DEFINER con search_path seguro';
COMMENT ON FUNCTION ejecutar_limpieza_completa IS 'Corregido: SECURITY DEFINER con search_path seguro';
```

#### Script 3: Funciones de Duplicados

```sql
-- Funciones de gestión de duplicados

-- 1. check_duplicate_local (solo consulta)
ALTER FUNCTION check_duplicate_local(text, text, text) SECURITY INVOKER;
ALTER FUNCTION check_duplicate_local(text, text, text) SET search_path = pg_catalog, public, pg_temp;

-- 2. find_all_duplicate_locals (solo consulta)
ALTER FUNCTION find_all_duplicate_locals() SECURITY INVOKER;
ALTER FUNCTION find_all_duplicate_locals() SET search_path = pg_catalog, public, pg_temp;

-- 3. remove_duplicate_locals (modifica datos - necesita SECURITY DEFINER)
ALTER FUNCTION remove_duplicate_locals(uuid[]) SET search_path = pg_catalog, public, pg_temp;

-- Agregar comentarios
COMMENT ON FUNCTION check_duplicate_local IS 'Corregido: SECURITY INVOKER para respetar RLS';
COMMENT ON FUNCTION find_all_duplicate_locals IS 'Corregido: SECURITY INVOKER para respetar RLS';
COMMENT ON FUNCTION remove_duplicate_locals IS 'Corregido: SECURITY DEFINER con search_path seguro';
```

#### Script 4: Funciones de Mantenimiento

```sql
-- Funciones de mantenimiento de base de datos
-- Todas necesitan SECURITY DEFINER pero deben tener search_path seguro

-- 1. optimize_database
ALTER FUNCTION optimize_database() SET search_path = pg_catalog, public, pg_temp;

-- 2. run_database_maintenance
ALTER FUNCTION run_database_maintenance() SET search_path = pg_catalog, public, pg_temp;

-- 3. cleanup_old_backups
ALTER FUNCTION cleanup_old_backups() SET search_path = pg_catalog, public, pg_temp;

-- 4. expire_user_penalties (puede ser SECURITY INVOKER)
ALTER FUNCTION expire_user_penalties() SECURITY INVOKER;
ALTER FUNCTION expire_user_penalties() SET search_path = pg_catalog, public, pg_temp;

-- Agregar comentarios
COMMENT ON FUNCTION optimize_database IS 'Corregido: SECURITY DEFINER con search_path seguro';
COMMENT ON FUNCTION run_database_maintenance IS 'Corregido: SECURITY DEFINER con search_path seguro';
COMMENT ON FUNCTION cleanup_old_backups IS 'Corregido: SECURITY DEFINER con search_path seguro';
COMMENT ON FUNCTION expire_user_penalties IS 'Corregido: SECURITY INVOKER para respetar RLS';
```

#### Script 5: Funciones Misceláneas

```sql
-- Funciones misceláneas

-- 1. award_activity_badges
ALTER FUNCTION award_activity_badges(uuid) SECURITY INVOKER;
ALTER FUNCTION award_activity_badges(uuid) SET search_path = pg_catalog, public, pg_temp;

-- 2. get_room_ranking
ALTER FUNCTION get_room_ranking(uuid) SECURITY INVOKER;
ALTER FUNCTION get_room_ranking(uuid) SET search_path = pg_catalog, public, pg_temp;

-- Agregar comentarios
COMMENT ON FUNCTION award_activity_badges IS 'Corregido: SECURITY INVOKER para respetar RLS';
COMMENT ON FUNCTION get_room_ranking IS 'Corregido: SECURITY INVOKER para respetar RLS';
```

## 🔍 Verificación de Correcciones

Después de aplicar las correcciones, verifica que se aplicaron correctamente:

```sql
-- Verificar que no quedan funciones de MEDIO riesgo sin search_path
SELECT 
  function_name,
  is_security_definer,
  has_safe_search_path,
  current_search_path
FROM audit_security_definer_functions()
WHERE schema_name = 'public' 
  AND risk_level = 'MEDIO'
  AND function_name IN (
    'get_user_feed', 'get_suggested_users', 'get_trending_hashtags',
    'search_posts_by_hashtag', 'get_nearby_local_posts', 'get_recommended_ads',
    'get_post_details', 'get_post_comments', 'get_friends_at_local',
    'get_visible_check_ins_for_local', 'cleanup_enriched_osm_locales',
    'detectar_locales_invalidos', 'excluir_locales_invalidos',
    'esta_local_excluido', 'ejecutar_limpieza_completa',
    'obtener_estadisticas_limpieza', 'check_duplicate_local',
    'find_all_duplicate_locals', 'remove_duplicate_locals',
    'optimize_database', 'run_database_maintenance', 'cleanup_old_backups',
    'expire_user_penalties', 'award_activity_badges', 'get_room_ranking'
  )
ORDER BY function_name;

-- Resultado esperado: 0 filas (todas corregidas)
```

## 📊 Progreso Esperado

Después de aplicar todas las correcciones:

- **Funciones corregidas**: 95 de 115 (83%)
- **Funciones de ALTO riesgo**: 0 (100% corregido ✅)
- **Funciones de MEDIO riesgo**: ~56 restantes (de 81)
- **Nivel de riesgo general**: Significativamente reducido

## ⚠️ Notas Importantes

1. **Backup**: Antes de aplicar cambios, haz un backup de tu base de datos
2. **Pruebas**: Después de aplicar los cambios, prueba las funciones afectadas
3. **Monitoreo**: Usa el panel de administración para monitorear el progreso
4. **Reversión**: Si algo falla, puedes revertir usando `ALTER FUNCTION ... SECURITY DEFINER`

## 🎯 Próximos Pasos

Después de corregir estas 25 funciones, quedarán aproximadamente 20 funciones más de riesgo MEDIO que incluyen:

- Funciones de sistema (st_estimatedextent, increment_column)
- Funciones duplicadas que necesitan consolidación
- Funciones de auditoría y tracking

## 📞 Soporte

Si encuentras problemas al aplicar las correcciones:

1. Verifica que tienes permisos de administrador en Supabase
2. Revisa los logs de error en el SQL Editor
3. Consulta el panel de administración para ver el estado actual
4. Si una función falla, puedes aplicar las correcciones una por una

---

**Última actualización**: 2025-01-XX  
**Funciones a corregir en este lote**: 25  
**Tiempo estimado**: 15-20 minutos  
**Nivel de dificultad**: Medio
