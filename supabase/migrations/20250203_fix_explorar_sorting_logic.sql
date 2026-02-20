
-- ✅ MIGRATION: Fix Explorar Sorting Logic - 5-Tier Priority System
-- This migration updates the get_sorted_locales_by_proximity function to support
-- the complete 5-tier sorting logic as specified:
-- 
-- Tier 1: Destacados Abiertos (< 50km) - Sorted by distance
-- Tier 2: Locales Abiertos (Standard) - Sorted by distance  
-- Tier 3: Sin Información de Horario - Sorted by distance
-- Tier 4: Destacados Cerrados (< 50km) - Sorted by distance
-- Tier 5: Locales Cerrados (Standard) - Sorted by distance

-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_sorted_locales_by_proximity(double precision, double precision, text[], integer, integer);

-- Create the improved function with opening status calculation
CREATE OR REPLACE FUNCTION public.get_sorted_locales_by_proximity(
  p_user_lat double precision DEFAULT NULL,
  p_user_lng double precision DEFAULT NULL,
  p_category_filter text[] DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
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
  esta_abierto boolean,
  sorting_tier integer
)
LANGUAGE plpgsql
AS $$
DECLARE
  current_day_name text;
  current_time_str text;
  current_hour integer;
  current_minute integer;
BEGIN
  -- Get current day and time in Spain timezone
  current_day_name := LOWER(TO_CHAR(NOW() AT TIME ZONE 'Europe/Madrid', 'Day'));
  current_day_name := TRIM(current_day_name);
  current_time_str := TO_CHAR(NOW() AT TIME ZONE 'Europe/Madrid', 'HH24:MI');
  current_hour := EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'Europe/Madrid'))::integer;
  current_minute := EXTRACT(MINUTE FROM (NOW() AT TIME ZONE 'Europe/Madrid'))::integer;

  -- Map English day names to Spanish
  current_day_name := CASE current_day_name
    WHEN 'monday' THEN 'lunes'
    WHEN 'tuesday' THEN 'martes'
    WHEN 'wednesday' THEN 'miércoles'
    WHEN 'thursday' THEN 'jueves'
    WHEN 'friday' THEN 'viernes'
    WHEN 'saturday' THEN 'sábado'
    WHEN 'sunday' THEN 'domingo'
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
      CASE 
        WHEN l.horarios_completos IS NOT NULL AND l.horarios_completos::text != '{}'::text 
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
      END as distancia,
      -- Calculate if open (esta_abierto)
      CASE
        -- If no schedule info, return NULL (unknown)
        WHEN l.horarios_completos IS NULL OR l.horarios_completos::text = '{}'::text THEN NULL
        -- Check if today's schedule exists
        WHEN l.horarios_completos->current_day_name IS NULL THEN false
        -- Check if closed today
        WHEN jsonb_array_length(l.horarios_completos->current_day_name) = 0 THEN false
        -- Check opening hours
        ELSE (
          SELECT bool_or(
            current_time_str >= (schedule_item->>'apertura')::text
            AND current_time_str <= (schedule_item->>'cierre')::text
          )
          FROM jsonb_array_elements(l.horarios_completos->current_day_name) AS schedule_item
        )
      END as esta_abierto
    FROM locales l
    WHERE 
      l.activo = true
      AND (p_category_filter IS NULL OR l.tipo = ANY(p_category_filter) OR l.barlive_type = ANY(p_category_filter))
  ),
  locale_with_tier AS (
    SELECT 
      *,
      -- Calculate sorting tier based on the 5-tier priority system
      CASE
        -- Tier 1: Destacados Abiertos (< 50km)
        WHEN destacado = true 
          AND esta_abierto = true 
          AND (distancia IS NULL OR distancia < 50) 
        THEN 1
        
        -- Tier 2: Locales Abiertos (Standard)
        WHEN esta_abierto = true 
        THEN 2
        
        -- Tier 3: Sin Información de Horario
        WHEN esta_abierto IS NULL 
        THEN 3
        
        -- Tier 4: Destacados Cerrados (< 50km)
        WHEN destacado = true 
          AND esta_abierto = false 
          AND (distancia IS NULL OR distancia < 50) 
        THEN 4
        
        -- Tier 5: Locales Cerrados (Standard)
        WHEN esta_abierto = false 
        THEN 5
        
        -- Default: Tier 5
        ELSE 5
      END as sorting_tier
    FROM locale_data
  )
  SELECT 
    locale_with_tier.id,
    locale_with_tier.nombre,
    locale_with_tier.direccion,
    locale_with_tier.provincia,
    locale_with_tier.tipo,
    locale_with_tier.imagen_url,
    locale_with_tier.latitud,
    locale_with_tier.longitud,
    locale_with_tier.galeria_urls,
    locale_with_tier.horarios_completos,
    locale_with_tier.has_schedule_info,
    locale_with_tier.destacado,
    locale_with_tier.is_destacado,
    locale_with_tier.barlive_types,
    locale_with_tier.barlive_type,
    locale_with_tier.google_rating,
    locale_with_tier.rating,
    locale_with_tier.distancia,
    locale_with_tier.esta_abierto,
    locale_with_tier.sorting_tier
  FROM locale_with_tier
  ORDER BY 
    -- First by tier (1-5)
    locale_with_tier.sorting_tier ASC,
    -- Then by distance within each tier
    COALESCE(locale_with_tier.distancia, 999999) ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_sorted_locales_by_proximity(double precision, double precision, text[], integer, integer) TO anon, authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_sorted_locales_by_proximity IS 
'Returns locales sorted by 5-tier priority system:
Tier 1: Destacados Abiertos (< 50km) - Sorted by distance
Tier 2: Locales Abiertos (Standard) - Sorted by distance
Tier 3: Sin Información de Horario - Sorted by distance
Tier 4: Destacados Cerrados (< 50km) - Sorted by distance
Tier 5: Locales Cerrados (Standard) - Sorted by distance';
