
-- ✅ MIGRATION: Fix schedule parsing to handle both hyphen (-) and en dash (–)
-- This migration fixes the issue where locales with hyphen-separated schedules
-- were not being detected as open/closed correctly

CREATE OR REPLACE FUNCTION get_sorted_locales_by_proximity(
  p_user_lat DOUBLE PRECISION DEFAULT NULL,
  p_user_lng DOUBLE PRECISION DEFAULT NULL,
  p_category_filter TEXT[] DEFAULT NULL,
  p_servicios_filter TEXT[] DEFAULT NULL,
  p_ambiente_filter TEXT[] DEFAULT NULL,
  p_clientela_filter TEXT[] DEFAULT NULL,
  p_comunidad_filter TEXT DEFAULT NULL,
  p_provincia_filter TEXT DEFAULT NULL,
  p_max_distance_km DOUBLE PRECISION DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  direccion TEXT,
  latitud DOUBLE PRECISION,
  longitud DOUBLE PRECISION,
  imagen_url TEXT,
  galeria_urls TEXT[],
  rating DOUBLE PRECISION,
  horarios_completos JSONB,
  servicios_disponibles JSONB,
  ambiente_completo JSONB,
  clientela JSONB,
  destacado BOOLEAN,
  tipo TEXT,
  barlive_type TEXT,
  barlive_types TEXT[],
  provincia TEXT,
  ciudad TEXT,
  comunidad TEXT,
  google_rating DOUBLE PRECISION,
  google_user_ratings_total INTEGER,
  esta_abierto BOOLEAN,
  has_schedule_info BOOLEAN,
  sorting_tier INTEGER,
  distance_km DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_current_day TEXT;
  v_current_time TIME;
  v_current_datetime TIMESTAMP;
BEGIN
  -- Get current day and time in Spain timezone
  v_current_datetime := NOW() AT TIME ZONE 'Europe/Madrid';
  v_current_day := LOWER(TRIM(TO_CHAR(v_current_datetime, 'Day')));
  v_current_time := v_current_datetime::TIME;

  -- Map English day names to Spanish
  v_current_day := CASE v_current_day
    WHEN 'monday' THEN 'lunes'
    WHEN 'tuesday' THEN 'martes'
    WHEN 'wednesday' THEN 'miércoles'
    WHEN 'thursday' THEN 'jueves'
    WHEN 'friday' THEN 'viernes'
    WHEN 'saturday' THEN 'sábado'
    WHEN 'sunday' THEN 'domingo'
    ELSE v_current_day
  END;

  RETURN QUERY
  WITH locales_with_distance AS (
    SELECT
      l.id,
      l.nombre,
      l.direccion,
      l.latitud,
      l.longitud,
      l.imagen_url,
      l.galeria_urls,
      l.rating,
      l.horarios_completos,
      l.servicios_disponibles,
      l.ambiente_completo,
      l.clientela,
      l.destacado,
      l.tipo,
      l.barlive_type,
      l.barlive_types,
      l.provincia,
      l.ciudad,
      l.comunidad,
      l.google_rating,
      l.google_user_ratings_total,
      -- Calculate distance if user location is provided
      CASE
        WHEN p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL THEN
          ROUND(
            (6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians(p_user_lat)) *
                cos(radians(l.latitud)) *
                cos(radians(l.longitud) - radians(p_user_lng)) +
                sin(radians(p_user_lat)) *
                sin(radians(l.latitud))
              ))
            ))::NUMERIC,
            2
          )
        ELSE NULL
      END AS distance_km
    FROM locales l
    WHERE l.activo = TRUE
      -- Category filter
      AND (
        p_category_filter IS NULL
        OR l.barlive_type = ANY(p_category_filter)
        OR l.barlive_types && p_category_filter
      )
      -- Servicios filter (AND logic - local must have ALL selected services)
      AND (
        p_servicios_filter IS NULL
        OR (
          l.servicios_disponibles IS NOT NULL
          AND (
            SELECT bool_and((l.servicios_disponibles->>servicio)::BOOLEAN = TRUE)
            FROM unnest(p_servicios_filter) AS servicio
          )
        )
      )
      -- Ambiente filter (OR logic - local must have AT LEAST ONE selected ambiente)
      AND (
        p_ambiente_filter IS NULL
        OR (
          l.ambiente_completo IS NOT NULL
          AND (
            SELECT bool_or((l.ambiente_completo->>ambiente)::BOOLEAN = TRUE)
            FROM unnest(p_ambiente_filter) AS ambiente
          )
        )
      )
      -- Clientela filter (OR logic - local must have AT LEAST ONE selected clientela)
      AND (
        p_clientela_filter IS NULL
        OR (
          l.clientela IS NOT NULL
          AND (
            SELECT bool_or((l.clientela->>tipo)::BOOLEAN = TRUE)
            FROM unnest(p_clientela_filter) AS tipo
          )
        )
      )
      -- Comunidad filter
      AND (
        p_comunidad_filter IS NULL
        OR l.comunidad = p_comunidad_filter
      )
      -- Provincia filter
      AND (
        p_provincia_filter IS NULL
        OR l.provincia = p_provincia_filter
      )
  ),
  locales_with_status AS (
    SELECT
      lwd.*,
      -- Check if local has schedule info
      (lwd.horarios_completos IS NOT NULL AND jsonb_typeof(lwd.horarios_completos) = 'object') AS has_schedule_info,
      -- Calculate if local is open
      CASE
        WHEN lwd.horarios_completos IS NULL OR jsonb_typeof(lwd.horarios_completos) != 'object' THEN NULL
        WHEN lwd.horarios_completos->v_current_day IS NULL THEN FALSE
        WHEN jsonb_array_length(lwd.horarios_completos->v_current_day) = 0 THEN FALSE
        ELSE (
          SELECT bool_or(
            CASE
              -- ✅ FIX: Handle both hyphen (-) and en dash (–)
              WHEN horario::TEXT ~ '^\d{2}:\d{2}[-–]\d{2}:\d{2}$' THEN
                v_current_time >= SPLIT_PART(REPLACE(horario::TEXT, '–', '-'), '-', 1)::TIME
                AND v_current_time <= SPLIT_PART(REPLACE(horario::TEXT, '–', '-'), '-', 2)::TIME
              ELSE FALSE
            END
          )
          FROM jsonb_array_elements_text(lwd.horarios_completos->v_current_day) AS horario
        )
      END AS esta_abierto
    FROM locales_with_distance lwd
    -- Distance filter (only if user location is provided)
    WHERE (
      p_max_distance_km IS NULL
      OR p_user_lat IS NULL
      OR p_user_lng IS NULL
      OR lwd.distance_km IS NULL
      OR lwd.distance_km <= p_max_distance_km
    )
  ),
  locales_with_tier AS (
    SELECT
      lws.*,
      -- Assign sorting tier based on 5-tier system
      CASE
        -- TIER 1: Featured & Open (< 50km)
        WHEN lws.destacado = TRUE
          AND lws.esta_abierto = TRUE
          AND (lws.distance_km IS NULL OR lws.distance_km < 50)
        THEN 1
        -- TIER 2: Standard Open (or Featured > 50km)
        WHEN lws.esta_abierto = TRUE
        THEN 2
        -- TIER 3: No Schedule Info
        WHEN lws.esta_abierto IS NULL
        THEN 3
        -- TIER 4: Featured & Closed (< 50km)
        WHEN lws.destacado = TRUE
          AND lws.esta_abierto = FALSE
          AND (lws.distance_km IS NULL OR lws.distance_km < 50)
        THEN 4
        -- TIER 5: Standard Closed (or Featured > 50km)
        WHEN lws.esta_abierto = FALSE
        THEN 5
        -- Default: Tier 5
        ELSE 5
      END AS sorting_tier
    FROM locales_with_status lws
  )
  SELECT
    lwt.id,
    lwt.nombre,
    lwt.direccion,
    lwt.latitud,
    lwt.longitud,
    lwt.imagen_url,
    lwt.galeria_urls,
    lwt.rating,
    lwt.horarios_completos,
    lwt.servicios_disponibles,
    lwt.ambiente_completo,
    lwt.clientela,
    lwt.destacado,
    lwt.tipo,
    lwt.barlive_type,
    lwt.barlive_types,
    lwt.provincia,
    lwt.ciudad,
    lwt.comunidad,
    lwt.google_rating,
    lwt.google_user_ratings_total,
    lwt.esta_abierto,
    lwt.has_schedule_info,
    lwt.sorting_tier,
    lwt.distance_km
  FROM locales_with_tier lwt
  ORDER BY
    lwt.sorting_tier ASC,
    COALESCE(lwt.distance_km, 999999) ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_sorted_locales_by_proximity TO anon, authenticated;

-- Add comment
COMMENT ON FUNCTION get_sorted_locales_by_proximity IS 
'Returns locales sorted by 5-tier system with advanced filters support.
Tier 1: Featured & Open (< 50km)
Tier 2: Standard Open
Tier 3: No Schedule Info
Tier 4: Featured & Closed (< 50km)
Tier 5: Standard Closed
Handles both hyphen (-) and en dash (–) in schedule strings.';
