
-- Migration: Add permisos column to planes_suscripcion table
-- Description: Adds the missing permisos JSONB column to store plan permissions

-- 1. Add permisos column if it doesn't exist
ALTER TABLE planes_suscripcion 
  ADD COLUMN IF NOT EXISTS permisos JSONB DEFAULT '{
    "publicar_posts": true,
    "publicar_momentos": true,
    "responder_mensajes": true,
    "ver_estadisticas": false,
    "destacar_publicaciones": false
  }'::jsonb;

-- 2. Update existing plans with default permissions if they don't have any
UPDATE planes_suscripcion
SET permisos = '{
  "publicar_posts": true,
  "publicar_momentos": true,
  "responder_mensajes": true,
  "ver_estadisticas": false,
  "destacar_publicaciones": false
}'::jsonb
WHERE permisos IS NULL;

-- 3. Create index for faster permission queries
CREATE INDEX IF NOT EXISTS idx_planes_suscripcion_permisos ON planes_suscripcion USING GIN (permisos);

COMMENT ON COLUMN planes_suscripcion.permisos IS 'JSON object containing plan permissions and access rights';
