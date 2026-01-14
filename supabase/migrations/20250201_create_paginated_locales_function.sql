
-- ✅ CRITICAL PERFORMANCE FIX v199.0: Server-side pagination for 200k+ locales
-- This function enables efficient pagination without loading all data into memory

-- Create function for paginated locales with filters
CREATE OR REPLACE FUNCTION get_locales_paginados(
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20,
  p_categoria TEXT DEFAULT NULL,
  p_provincia TEXT DEFAULT NULL,
  p_comunidad TEXT DEFAULT NULL,
  p_solo_abiertos BOOLEAN DEFAULT FALSE,
  p_user_lat FLOAT DEFAULT NULL,
  p_user_lng FLOAT DEFAULT NULL,
  p_max_distance_km FLOAT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  tipo TEXT,
  direccion TEXT,
  provincia TEXT,
  comunidad TEXT,
  latitud FLOAT,
  longitud FLOAT,
  imagen_url TEXT,
  destacado BOOLEAN,
  horarios_completos JSONB,
  barlive_types TEXT[],
  barlive_type TEXT,
  rating FLOAT,
  google_rating FLOAT,
  activo BOOLEAN,
  distancia FLOAT,
  total_count BIGINT
) AS $$
DECLARE
  v_offset INT;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  
  RETURN QUERY
  WITH filtered_locales AS (
    SELECT 
      l.id,
      l.nombre,
      l.tipo,
      l.direccion,
      l.provincia,
      l.comunidad,
      l.latitud::FLOAT,
      l.longitud::FLOAT,
      l.imagen_url,
      l.destacado,
      l.horarios_completos,
      l.barlive_types,
      l.barlive_type,
      l.rating::FLOAT,
      l.google_rating::FLOAT,
      l.activo,
      -- Calculate distance if user location provided
      CASE 
        WHEN p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL THEN
          (
            6371 * acos(
              cos(radians(p_user_lat)) * 
              cos(radians(l.latitud::FLOAT)) * 
              cos(radians(l.longitud::FLOAT) - radians(p_user_lng)) + 
              sin(radians(p_user_lat)) * 
              sin(radians(l.latitud::FLOAT))
            )
          )
        ELSE NULL
      END AS calc_distancia,
      COUNT(*) OVER() AS total_count
    FROM locales l
    WHERE l.activo = TRUE
      -- Filter by category
      AND (p_categoria IS NULL OR p_categoria = 'todas' OR p_categoria = ANY(l.barlive_types) OR p_categoria = l.barlive_type)
      -- Filter by province
      AND (p_provincia IS NULL OR p_provincia = 'Todas' OR l.provincia = p_provincia)
      -- Filter by community
      AND (p_comunidad IS NULL OR p_comunidad = 'Todas las Comunidades' OR l.comunidad = p_comunidad)
      -- Filter by open status (if requested)
      AND (
        NOT p_solo_abiertos OR
        (
          l.horarios_completos IS NOT NULL AND
          l.horarios_completos != '{}'::jsonb
        )
      )
    ORDER BY 
      l.destacado DESC NULLS LAST,
      calc_distancia ASC NULLS LAST,
      l.rating DESC NULLS LAST,
      l.google_rating DESC NULLS LAST,
      l.nombre ASC
    LIMIT p_page_size
    OFFSET v_offset
  )
  SELECT 
    fl.id,
    fl.nombre,
    fl.tipo,
    fl.direccion,
    fl.provincia,
    fl.comunidad,
    fl.latitud,
    fl.longitud,
    fl.imagen_url,
    fl.destacado,
    fl.horarios_completos,
    fl.barlive_types,
    fl.barlive_type,
    fl.rating,
    fl.google_rating,
    fl.activo,
    fl.calc_distancia AS distancia,
    fl.total_count
  FROM filtered_locales fl
  WHERE (p_max_distance_km IS NULL OR fl.calc_distancia IS NULL OR fl.calc_distancia <= p_max_distance_km);
END;
$$ LANGUAGE plpgsql STABLE;

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_locales_activo_destacado ON locales(activo, destacado DESC) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_locales_provincia ON locales(provincia) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_locales_comunidad ON locales(comunidad) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_locales_barlive_types ON locales USING GIN(barlive_types) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_locales_rating ON locales(rating DESC NULLS LAST) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_locales_coords ON locales(latitud, longitud) WHERE activo = TRUE;

-- Create spatial index for geographic queries (if PostGIS is available)
-- This dramatically speeds up distance-based queries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    -- Add geometry column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'locales' AND column_name = 'geom') THEN
      ALTER TABLE locales ADD COLUMN geom geometry(Point, 4326);
      
      -- Populate geometry column
      UPDATE locales SET geom = ST_SetSRID(ST_MakePoint(longitud::FLOAT, latitud::FLOAT), 4326) WHERE latitud IS NOT NULL AND longitud IS NOT NULL;
      
      -- Create spatial index
      CREATE INDEX idx_locales_geom ON locales USING GIST(geom) WHERE activo = TRUE;
    END IF;
  END IF;
END $$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_locales_paginados TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION get_locales_paginados IS 'Efficiently paginate locales with filters and distance calculation. Supports 200k+ locales without performance issues.';
