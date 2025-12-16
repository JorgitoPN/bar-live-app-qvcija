
-- Add permisos column to planes_suscripcion table
ALTER TABLE planes_suscripcion 
ADD COLUMN IF NOT EXISTS permisos JSONB DEFAULT '{
  "publicar_posts": true,
  "publicar_momentos": true,
  "responder_mensajes": true,
  "ver_estadisticas": false,
  "destacar_publicaciones": false
}'::jsonb;

-- Update existing rows to have default permissions
UPDATE planes_suscripcion 
SET permisos = '{
  "publicar_posts": true,
  "publicar_momentos": true,
  "responder_mensajes": true,
  "ver_estadisticas": false,
  "destacar_publicaciones": false
}'::jsonb
WHERE permisos IS NULL;

-- Add comment to column
COMMENT ON COLUMN planes_suscripcion.permisos IS 'JSON object containing permissions for the subscription plan';
