
-- ✅ MIGRATION: Add advanced filters support to get_sorted_locales_by_proximity
-- This migration updates the RPC function to accept and apply advanced filters server-side
-- ROOT CAUSE FIX: Filters now search the entire database, not just 20 items

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
    ciudad TEXT,
    provincia TEXT,
    comunidad TEXT,
    codigo_postal TEXT,
    telefono TEXT,
    email TEXT,
    website TEXT,
    latitud DOUBLE PRECISION,
    longitud DOUBLE PRECISION,
    imagen_url TEXT,
    galeria_urls TEXT[],
    descripcion TEXT,
    categoria TEXT,
    subcategoria TEXT,
    precio_medio NUMERIC,
    valoracion NUMERIC,
    horario TEXT,
    horarios_completos JSONB,
    servicios TEXT[],
    servicios_disponibles JSONB,
    ambiente TEXT,
    ambiente_completo JSONB,
    clientela JSONB,
    musica TEXT,
    dress_code TEXT,
    edad_minima INTEGER,
    accesibilidad BOOLEAN,
    parking BOOLEAN,
    terraza BOOLEAN,
    wifi BOOLEAN,
    reservas BOOLEAN,
    delivery BOOLEAN,
    takeaway BOOLEAN,
    capacidad INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    activo BOOLEAN,
    destacado BOOLEAN,
    plan_activo TEXT,
    barlive_type TEXT,
    barlive_types TEXT[],
    google_rating NUMERIC,
    google_user_ratings_total INTEGER,
    google_business_status TEXT,
    estado_actual TEXT,
    analisis_reviews JSONB,
    reviews_google JSONB[],
    metodos_pago_completos JSONB,
    tipos_cocina TEXT[],
    descripcion_google TEXT,
    rango_precios TEXT,
    nivel_precio_google INTEGER,
    propietario_id TEXT,
    local_profile_id UUID,
    distancia DOUBLE PRECISION,
    has_schedule_info BOOLEAN,
    priority_tier INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH filtered_locales AS (
        SELECT 
            l.*,
            -- Calculate distance if user location is provided
            CASE 
                WHEN p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL AND l.latitud IS NOT NULL AND l.longitud IS NOT NULL THEN
                    (6371 * acos(
                        LEAST(1.0, GREATEST(-1.0,
                            cos(radians(p_user_lat)) * 
                            cos(radians(l.latitud)) * 
                            cos(radians(l.longitud) - radians(p_user_lng)) + 
                            sin(radians(p_user_lat)) * 
                            sin(radians(l.latitud))
                        ))
                    ))
                ELSE NULL
            END AS calculated_distance,
            -- Check if local has schedule info
            (l.horarios_completos IS NOT NULL AND jsonb_typeof(l.horarios_completos) = 'object' AND l.horarios_completos != '{}'::jsonb) AS schedule_available
        FROM locales l
        WHERE l.activo = true
        
        -- ✅ FILTER 1: Category filter (OR logic - match ANY category)
        AND (
            p_category_filter IS NULL 
            OR l.barlive_type = ANY(p_category_filter)
            OR EXISTS (
                SELECT 1 FROM unnest(l.barlive_types) AS bt
                WHERE bt = ANY(p_category_filter)
            )
        )
        
        -- ✅ FILTER 2: Servicios filter (AND logic - must have ALL selected services)
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
        
        -- ✅ FILTER 3: Ambiente filter (OR logic - must have AT LEAST ONE selected ambiente)
        AND (
            p_ambiente_filter IS NULL
            OR (
                l.ambiente_completo IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM unnest(p_ambiente_filter) AS ambiente
                    WHERE (l.ambiente_completo->>ambiente)::boolean = true
                )
            )
        )
        
        -- ✅ FILTER 4: Clientela filter (OR logic - must have AT LEAST ONE selected clientela type)
        AND (
            p_clientela_filter IS NULL
            OR (
                l.clientela IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM unnest(p_clientela_filter) AS clientela_type
                    WHERE (l.clientela->>clientela_type)::boolean = true
                )
            )
        )
        
        -- ✅ FILTER 5: Comunidad filter
        AND (
            p_comunidad_filter IS NULL
            OR l.comunidad = p_comunidad_filter
        )
        
        -- ✅ FILTER 6: Provincia filter
        AND (
            p_provincia_filter IS NULL
            OR l.provincia = p_provincia_filter
        )
    ),
    distance_filtered AS (
        SELECT 
            fl.*,
            fl.calculated_distance AS distancia,
            fl.schedule_available AS has_schedule_info,
            -- Calculate priority tier for sorting
            CASE
                -- Tier 1: Open now + Featured + Within 50km
                WHEN l.estado_actual = 'abierto_ahora' 
                     AND fl.destacado = true 
                     AND (fl.calculated_distance IS NULL OR fl.calculated_distance < 50) THEN 1
                -- Tier 2: Open now (not featured or far away)
                WHEN l.estado_actual = 'abierto_ahora' THEN 2
                -- Tier 3: No schedule info
                WHEN NOT fl.schedule_available THEN 3
                -- Tier 4: Closed now + Featured + Within 50km
                WHEN l.estado_actual = 'cerrado_ahora' 
                     AND fl.destacado = true 
                     AND (fl.calculated_distance IS NULL OR fl.calculated_distance < 50) THEN 4
                -- Tier 5: Closed now (everything else)
                ELSE 5
            END AS priority_tier
        FROM filtered_locales fl
        LEFT JOIN locales l ON fl.id = l.id
        
        -- ✅ FILTER 7: Distance filter (only if user location and max distance are provided)
        WHERE (
            p_max_distance_km IS NULL
            OR p_user_lat IS NULL
            OR p_user_lng IS NULL
            OR fl.calculated_distance IS NULL
            OR fl.calculated_distance <= p_max_distance_km
        )
    )
    SELECT 
        df.id,
        df.nombre,
        df.direccion,
        df.ciudad,
        df.provincia,
        df.comunidad,
        df.codigo_postal,
        df.telefono,
        df.email,
        df.website,
        df.latitud,
        df.longitud,
        df.imagen_url,
        df.galeria_urls,
        df.descripcion,
        df.categoria,
        df.subcategoria,
        df.precio_medio,
        df.valoracion,
        df.horario,
        df.horarios_completos,
        df.servicios,
        df.servicios_disponibles,
        df.ambiente,
        df.ambiente_completo,
        df.clientela,
        df.musica,
        df.dress_code,
        df.edad_minima,
        df.accesibilidad,
        df.parking,
        df.terraza,
        df.wifi,
        df.reservas,
        df.delivery,
        df.takeaway,
        df.capacidad,
        df.created_at,
        df.updated_at,
        df.activo,
        df.destacado,
        df.plan_activo,
        df.barlive_type,
        df.barlive_types,
        df.google_rating,
        df.google_user_ratings_total,
        df.google_business_status,
        df.estado_actual,
        df.analisis_reviews,
        df.reviews_google,
        df.metodos_pago_completos,
        df.tipos_cocina,
        df.descripcion_google,
        df.rango_precios,
        df.nivel_precio_google,
        df.propietario_id,
        df.local_profile_id,
        df.distancia,
        df.has_schedule_info,
        df.priority_tier
    FROM distance_filtered df
    ORDER BY 
        df.priority_tier ASC,
        COALESCE(df.distancia, 999999) ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_sorted_locales_by_proximity TO authenticated;
GRANT EXECUTE ON FUNCTION get_sorted_locales_by_proximity TO anon;

-- Add comment explaining the function
COMMENT ON FUNCTION get_sorted_locales_by_proximity IS 
'Returns locales sorted by proximity with advanced filtering support.
Filters:
- p_category_filter: Array of category names (OR logic)
- p_servicios_filter: Array of service names (AND logic - must have ALL)
- p_ambiente_filter: Array of ambiente types (OR logic - must have AT LEAST ONE)
- p_clientela_filter: Array of clientela types (OR logic - must have AT LEAST ONE)
- p_comunidad_filter: Single comunidad name
- p_provincia_filter: Single provincia name
- p_max_distance_km: Maximum distance in kilometers from user location

Sorting:
1. Priority tier (open+featured, open, no-schedule, closed+featured, closed)
2. Distance from user (if location provided)

This function searches the ENTIRE database, not just a limited subset.';
