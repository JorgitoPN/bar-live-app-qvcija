
-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: FIX ADVANCED FILTERS LOGIC v11.0.0
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- CRITICAL FIXES:
-- 1️⃣ SERVICIOS FILTER: Now properly checks servicios_disponibles JSONB
-- 2️⃣ AMBIENTE FILTER: Now properly checks ambiente_completo JSONB
-- 3️⃣ CLIENTELA FILTER: Now properly checks clientela JSONB
-- 4️⃣ LOGIC FIX: Uses AND logic (all selected filters must match)
-- 
-- BEFORE: Filters were ignored - all venues shown regardless of selection
-- AFTER: Only venues matching ALL selected filters are shown
-- 
-- EXAMPLE:
-- - User selects: Servicios = ["terraza_exterior", "wifi_gratis"]
-- - User selects: Ambiente = ["tranquilo"]
-- - User selects: Clientela = ["turistas"]
-- - RESULT: Only venues with terraza_exterior=true AND wifi_gratis=true AND tranquilo=true AND turistas=true
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_sorted_locales_by_proximity(
  double precision, double precision, integer, integer, 
  text[], text[], text[], text[], text, text, double precision, text
);

-- Create the updated function with proper advanced filter logic
CREATE OR REPLACE FUNCTION public.get_sorted_locales_by_proximity(
  p_user_lat double precision,
  p_user_lng double precision,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 20,
  p_category_filter text[] DEFAULT NULL,
  p_servicios_filter text[] DEFAULT NULL,
  p_ambiente_filter text[] DEFAULT NULL,
  p_clientela_filter text[] DEFAULT NULL,
  p_comunidad_filter text DEFAULT NULL,
  p_provincia_filter text DEFAULT NULL,
  p_max_distance_km double precision DEFAULT NULL,
  p_search_query text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  nombre text,
  direccion text,
  provincia text,
  tipo text,
  imagen_url text,
  latitud double precision,
  longitud double precision,
  galeria_urls text[],
  horarios_completos jsonb,
  has_schedule_info boolean,
  destacado boolean,
  is_destacado boolean,
  barlive_types text[],
  barlive_type text,
  google_rating double precision,
  rating double precision,
  distancia double precision,
  distance_km double precision,
  esta_abierto boolean,
  sorting_tier integer
)
LANGUAGE plpgsql
AS $$
DECLARE
  current_day_name text;
  current_time_minutes integer;
  previous_day_name text;
BEGIN
  -- Get current day and time in Spain timezone
  current_day_name := LOWER(TO_CHAR(NOW() AT TIME ZONE 'Europe/Madrid', 'Day'));
  current_day_name := TRIM(current_day_name);
  
  -- Calculate current time in minutes since midnight
  current_time_minutes := 
    EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'Europe/Madrid'))::integer * 60 + 
    EXTRACT(MINUTE FROM (NOW() AT TIME ZONE 'Europe/Madrid'))::integer;

  -- Map English day names to Spanish
  current_day_name := CASE current_day_name
    WHEN 'monday' THEN 'lunes'
    WHEN 'tuesday' THEN 'martes'
    WHEN 'wednesday' THEN 'miercoles'
    WHEN 'thursday' THEN 'jueves'
    WHEN 'friday' THEN 'viernes'
    WHEN 'saturday' THEN 'sabado'
    WHEN 'sunday' THEN 'domingo'
    ELSE current_day_name
  END;
  
  -- Get previous day name for overnight schedule check
  previous_day_name := CASE current_day_name
    WHEN 'lunes' THEN 'domingo'
    WHEN 'martes' THEN 'lunes'
    WHEN 'miercoles' THEN 'martes'
    WHEN 'jueves' THEN 'miercoles'
    WHEN 'viernes' THEN 'jueves'
    WHEN 'sabado' THEN 'viernes'
    WHEN 'domingo' THEN 'sabado'
    ELSE current_day_name
  END;

  RETURN QUERY
  WITH locale_data AS (
    SELECT 
      l.id,
      l.nombre,
      l.direccion,
      l.provincia,
      l.tipo,
      l.imagen_url,
      CAST(l.latitud AS double precision) as latitud,
      CAST(l.longitud AS double precision) as longitud,
      l.galeria_urls,
      l.horarios_completos,
      -- ✅ Check if horarios_completos is NOT empty {}
      CASE 
        WHEN l.horarios_completos IS NOT NULL 
          AND l.horarios_completos::text != '{}'::text 
          AND jsonb_typeof(l.horarios_completos) = 'object'
          AND (SELECT COUNT(*) FROM jsonb_object_keys(l.horarios_completos)) > 0
        THEN true 
        ELSE false 
      END as has_schedule_info,
      COALESCE(l.destacado, false) as destacado,
      COALESCE(l.destacado, false) as is_destacado,
      l.barlive_types,
      l.barlive_type,
      CAST(l.google_rating AS double precision) as google_rating,
      CAST(l.rating AS double precision) as rating,
      -- Calculate distance
      CASE 
        WHEN p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL 
        THEN CAST(
          6371 * acos(
            GREATEST(-1, LEAST(1,
              cos(radians(p_user_lat)) * 
              cos(radians(CAST(l.latitud AS double precision))) * 
              cos(radians(CAST(l.longitud AS double precision)) - radians(p_user_lng)) + 
              sin(radians(p_user_lat)) * 
              sin(radians(CAST(l.latitud AS double precision)))
            ))
          ) AS double precision
        )
        ELSE NULL
      END as distancia
    FROM locales l
    WHERE 
      l.activo = true
      -- Category filter
      AND (p_category_filter IS NULL OR l.tipo = ANY(p_category_filter) OR l.barlive_type = ANY(p_category_filter))
      -- Location filters
      AND (p_comunidad_filter IS NULL OR l.comunidad = p_comunidad_filter)
      AND (p_provincia_filter IS NULL OR l.provincia = p_provincia_filter)
      -- Search filter
      AND (p_search_query IS NULL OR l.nombre ILIKE '%' || p_search_query || '%' OR l.direccion ILIKE '%' || p_search_query || '%')
      -- Distance filter
      AND (p_max_distance_km IS NULL OR (p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL AND 6371 * acos(GREATEST(-1, LEAST(1, cos(radians(p_user_lat)) * cos(radians(CAST(l.latitud AS double precision))) * cos(radians(CAST(l.longitud AS double precision)) - radians(p_user_lng)) + sin(radians(p_user_lat)) * sin(radians(CAST(l.latitud AS double precision)))))) <= p_max_distance_km))
      -- ✅ NEW v11.0: SERVICIOS FILTER - Check ALL selected servicios are true
      AND (
        p_servicios_filter IS NULL 
        OR (
          l.servicios_disponibles IS NOT NULL
          AND (
            SELECT bool_and((l.servicios_disponibles->>servicio)::boolean = true)
            FROM unnest(p_servicios_filter) AS servicio
          )
        )
      )
      -- ✅ NEW v11.0: AMBIENTE FILTER - Check ALL selected ambientes are true
      AND (
        p_ambiente_filter IS NULL 
        OR (
          l.ambiente_completo IS NOT NULL
          AND (
            SELECT bool_and((l.ambiente_completo->>ambiente)::boolean = true)
            FROM unnest(p_ambiente_filter) AS ambiente
          )
        )
      )
      -- ✅ NEW v11.0: CLIENTELA FILTER - Check ALL selected clientela are true
      AND (
        p_clientela_filter IS NULL 
        OR (
          l.clientela IS NOT NULL
          AND (
            SELECT bool_and((l.clientela->>tipo)::boolean = true)
            FROM unnest(p_clientela_filter) AS tipo
          )
        )
      )
  ),
  locale_with_status AS (
    SELECT 
      ld.*,
      -- ✅ Calculate open/closed status - HANDLE "Cerrado" STRING
      CASE
        -- No schedule info OR empty {} = NULL (unknown)
        WHEN ld.has_schedule_info = false THEN NULL
        
        -- ✅ Check if today's schedule contains "Cerrado" (case-insensitive)
        WHEN (
          SELECT bool_or(
            LOWER(franja::text) LIKE '%cerrado%'
          )
          FROM jsonb_array_elements(ld.horarios_completos->current_day_name) AS franja
        ) THEN false
        
        -- ✅ Check if schedule is in STRING format ["16:00–04:00"]
        WHEN (
          SELECT bool_or(
            CASE 
              -- Handle string format with en-dash (–) or hyphen (-)
              WHEN jsonb_typeof(franja) = 'string' THEN
                CASE
                  -- Skip if it's "Cerrado" or similar
                  WHEN LOWER(franja::text) LIKE '%cerrado%' THEN false
                  -- Split by en-dash or hyphen
                  WHEN (franja::text) LIKE '%–%' OR (franja::text) LIKE '%-%' THEN
                    CASE
                      -- Extract hours and minutes from string format
                      WHEN SPLIT_PART(REPLACE(REPLACE(franja::text, '–', '-'), '"', ''), '-', 1) < SPLIT_PART(REPLACE(REPLACE(franja::text, '–', '-'), '"', ''), '-', 2) THEN
                        -- Normal hours (e.g., "09:00-18:00")
                        current_time_minutes >= 
                          (SPLIT_PART(SPLIT_PART(REPLACE(REPLACE(franja::text, '–', '-'), '"', ''), '-', 1), ':', 1)::integer * 60 + 
                           SPLIT_PART(SPLIT_PART(REPLACE(REPLACE(franja::text, '–', '-'), '"', ''), '-', 1), ':', 2)::integer)
                        AND current_time_minutes < 
                          (SPLIT_PART(SPLIT_PART(REPLACE(REPLACE(franja::text, '–', '-'), '"', ''), '-', 2), ':', 1)::integer * 60 + 
                           SPLIT_PART(SPLIT_PART(REPLACE(REPLACE(franja::text, '–', '-'), '"', ''), '-', 2), ':', 2)::integer)
                      WHEN SPLIT_PART(REPLACE(REPLACE(franja::text, '–', '-'), '"', ''), '-', 1) > SPLIT_PART(REPLACE(REPLACE(franja::text, '–', '-'), '"', ''), '-', 2) THEN
                        -- Overnight hours (e.g., "16:00-04:00")
                        current_time_minutes >= 
                          (SPLIT_PART(SPLIT_PART(REPLACE(REPLACE(franja::text, '–', '-'), '"', ''), '-', 1), ':', 1)::integer * 60 + 
                           SPLIT_PART(SPLIT_PART(REPLACE(REPLACE(franja::text, '–', '-'), '"', ''), '-', 1), ':', 2)::integer)
                      ELSE false
                    END
                  ELSE false
                END
              -- Handle object format {"apertura": "16:00", "cierre": "04:00"}
              WHEN jsonb_typeof(franja) = 'object' THEN
                CASE 
                  WHEN (franja->>'apertura')::text < (franja->>'cierre')::text THEN
                    current_time_minutes >= 
                      (SPLIT_PART((franja->>'apertura')::text, ':', 1)::integer * 60 + 
                       SPLIT_PART((franja->>'apertura')::text, ':', 2)::integer)
                    AND current_time_minutes < 
                      (SPLIT_PART((franja->>'cierre')::text, ':', 1)::integer * 60 + 
                       SPLIT_PART((franja->>'cierre')::text, ':', 2)::integer)
                  WHEN (franja->>'apertura')::text > (franja->>'cierre')::text THEN
                    current_time_minutes >= 
                      (SPLIT_PART((franja->>'apertura')::text, ':', 1)::integer * 60 + 
                       SPLIT_PART((franja->>'apertura')::text, ':', 2)::integer)
                  ELSE false
                END
              ELSE false
            END
          )
          FROM jsonb_array_elements(ld.horarios_completos->current_day_name) AS franja
        ) THEN true
        
        -- ✅ Check if in morning continuation of previous day's overnight schedule (STRING FORMAT)
        WHEN (
          SELECT bool_or(
            CASE 
              -- Handle string format with en-dash (–) or hyphen (-)
              WHEN jsonb_typeof(franja) = 'string' THEN
                CASE
                  -- Skip if it's "Cerrado" or similar
                  WHEN LOWER(franja::text) LIKE '%cerrado%' THEN false
                  WHEN (franja::text) LIKE '%–%' OR (franja::text) LIKE '%-%' THEN
                    CASE
                      WHEN SPLIT_PART(REPLACE(REPLACE(franja::text, '–', '-'), '"', ''), '-', 1) > SPLIT_PART(REPLACE(REPLACE(franja::text, '–', '-'), '"', ''), '-', 2) THEN
                        -- Overnight hours - check if we're in the morning continuation
                        current_time_minutes < 
                          (SPLIT_PART(SPLIT_PART(REPLACE(REPLACE(franja::text, '–', '-'), '"', ''), '-', 2), ':', 1)::integer * 60 + 
                           SPLIT_PART(SPLIT_PART(REPLACE(REPLACE(franja::text, '–', '-'), '"', ''), '-', 2), ':', 2)::integer)
                      ELSE false
                    END
                  ELSE false
                END
              -- Handle object format {"apertura": "16:00", "cierre": "04:00"}
              WHEN jsonb_typeof(franja) = 'object' THEN
                CASE 
                  WHEN (franja->>'apertura')::text > (franja->>'cierre')::text THEN
                    current_time_minutes < 
                      (SPLIT_PART((franja->>'cierre')::text, ':', 1)::integer * 60 + 
                       SPLIT_PART((franja->>'cierre')::text, ':', 2)::integer)
                  ELSE false
                END
              ELSE false
            END
          )
          FROM jsonb_array_elements(ld.horarios_completos->previous_day_name) AS franja
        ) THEN true
        
        ELSE false
      END as esta_abierto
    FROM locale_data ld
  ),
  locale_with_tier AS (
    SELECT 
      lws.*,
      -- ✅ SORTING TIER LOGIC
      CASE
        -- Tier 1: Featured Open (< 50km)
        WHEN lws.destacado = true AND lws.esta_abierto = true AND (lws.distancia IS NULL OR lws.distancia < 50) THEN 1
        -- Tier 2: Open (Standard)
        WHEN lws.esta_abierto = true THEN 2
        -- Tier 3: No Schedule Info
        WHEN lws.esta_abierto IS NULL THEN 3
        -- Tier 4: Featured Closed (< 50km)
        WHEN lws.destacado = true AND lws.esta_abierto = false AND (lws.distancia IS NULL OR lws.distancia < 50) THEN 4
        -- Tier 5: Closed (Standard)
        WHEN lws.esta_abierto = false THEN 5
        ELSE 5
      END as sorting_tier
    FROM locale_with_status lws
  )
  SELECT 
    lwt.id, lwt.nombre, lwt.direccion, lwt.provincia, lwt.tipo, lwt.imagen_url, lwt.latitud, lwt.longitud,
    lwt.galeria_urls, lwt.horarios_completos, lwt.has_schedule_info, lwt.destacado, lwt.is_destacado,
    lwt.barlive_types, lwt.barlive_type, lwt.google_rating, lwt.rating, lwt.distancia, lwt.distancia as distance_km,
    lwt.esta_abierto, lwt.sorting_tier
  FROM locale_with_tier lwt
  ORDER BY lwt.sorting_tier ASC, COALESCE(lwt.distancia, 999999) ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Add comment explaining the fix
COMMENT ON FUNCTION public.get_sorted_locales_by_proximity IS 
'v11.0.0 - FIXED ADVANCED FILTERS LOGIC
- Servicios filter now properly checks servicios_disponibles JSONB (AND logic)
- Ambiente filter now properly checks ambiente_completo JSONB (AND logic)
- Clientela filter now properly checks clientela JSONB (AND logic)
- All selected filters must match for a venue to be included';
